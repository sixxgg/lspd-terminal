import { q } from "../lib/db.js";
import { audit } from "../lib/audit.js";
import { send, body, wrap, roster, findIn, lvl, CAP, norm, emailOf, hashPw, checkPw, needsRehash, randomPw, safeEq, clientIp, loginBlocked, loginFail, loginOk, sessionToken, tokenHash, newSession, endSession, current, PUBLIC_KEYS, query, canEnter, invalidate, isSix, SIX_OWNER, ID_PIN, OWNERS, dbAdmins, parseList, parseRoster as parseRosterRaw } from "../lib/core.js";
import { fullData } from "../lib/store.js";
import { randomBytes } from "node:crypto";
import { maintCached, postFb, maintNewPw, maintPwOk, maintSet, maintState, ownerIp, sdGenerate, sdHas, sdUnlock, sdUnlocked, setOwnerIp } from "../lib/owner.js";
import { XDEPTS, deptAcc, deptFind, deptList, deptOfAcc, deptUser, isDeptAcc, rosterKey } from "../lib/lssd.js";
const xRoster = async d => deptList((await q("select v from kv where k=$1", [rosterKey(d)])).rows[0]?.v, d, (await q("select v from kv where k=$1", [`lspdt.${d}.agx`])).rows[0]?.v);
const XN = { lssd: "LSSD", sahp: "SAHP" };
const digits = s => (/^#?(\d{1,5})$/.exec(String(s || "").trim()) || [])[1] || "";

const slim = list => list.map(a => ({ n: a.n, r: a.r, p: a.p }));
/* invitaciones: códigos aleatorios de un solo uso (vencen a las 72 h); solo las generan los dueños desde su panel (six o Anita) */
const INV_TTL = 72 * 3600e3, INV_MAX = 20;
const canInvite = u => isSix(u) || !!u.anita || !!u.dadm;
/* el prefijo dice para qué departamento sirve: LSPD-, LSSD- o SAHP- */
const DEPT_INV = { lspd: "LSPD", lssd: "LSSD", sahp: "SAHP" };
const invCode = (d = "lspd") => { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = randomBytes(10); let c = ""; for (let i = 0; i < 10; i++) c += A[b[i] % A.length]; return `${DEPT_INV[d] || "LSPD"}-${c.slice(0, 5)}-${c.slice(5)}`; };
const invList = async () => (await metaObjs("invites")).filter(x => x && x.exp > Date.now() && !x.u);
/* códigos de recuperación: 8 por cuenta, de un solo uso; se guardan con hash */
const recCode = () => randomBytes(6).toString("hex").toUpperCase().replace(/(.{4})(.{4})(.{4})/, "$1-$2-$3");
const normRec = c => String(c || "").toUpperCase().replace(/[^0-9A-F]/g, "");
async function newRec(n) { const L = Array.from({ length: 8 }, recCode); await setMeta("rec:" + n, L.map(c => tokenHash(normRec(c)))); return L; }
async function userOf(n, ag) { const owner = OWNERS.includes(n), anita = (await q("select v from meta where k='anita'")).rows[0]?.v === n;
  return { n, r: ag.r, l: lvl(ag.r), owner, anita, admin: owner || (await dbAdmins()).includes(n) }; }
const tooShort = pw => typeof pw !== "string" || pw.length < 8 || pw.length > 200;

const uiRaw = async () => ((await q("select v from kv where k='lspdt.ui'")).rows[0] || {}).v;
const metaList = async k => parseList((await q("select v from meta where k=$1", [k])).rows[0]?.v);
const metaObjs = async k => { try { const a = JSON.parse((await q("select v from meta where k=$1", [k])).rows[0]?.v || "[]"); return Array.isArray(a) ? a.filter(x => x && typeof x === "object") : []; } catch { return []; } };
const setMeta = (k, l) => q("insert into meta(k,v) values($1,$2) on conflict(k) do update set v=excluded.v", [k, JSON.stringify(l)]);
async function gate(ag) { // ¿puede entrar? (mando, RTD, ASD o aprobado por un administrador)
  const r = (await q(`select (select v from kv where k='lspdt.ui') ui, (select v from meta where k='approved') ap, (select v from kv where k='lspdt.asdRoster') asd, (select v from kv where k='lspdt.k9Roster') k9, (select v from kv where k='lspdt.mdRoster') md`)).rows[0];
  return canEnter(ag, r.ui, r.ap, r.asd, r.k9, r.md);
}
const pin = n => { const i = ID_PIN.indexOf(n); return i < 0 ? 99 : i; };
const byId = (a, b) => pin(a.k) - pin(b.k) || +a.t - +b.t;
const PEND_MSG = "Tus credenciales están siendo revisadas por la administración. Intentá más tarde.";
export default wrap(async (req, res) => {
  if (req.method === "GET") {
    // todo lo público en una sola consulta: cuentas, roster e imagen de la terminal
    const me = await current(req);
    /* lo público (cuentas, rosters, marca) se arma una vez y se reusa mientras no cambie: se comprueba con una consulta mínima.
       Antes cada apertura de la página volvía a bajar los tres rosters de la base. */
    const sig = (await q(`select (select coalesce(max(t),0) from kv where k = any($1))::text || ':' || (select count(*)::text || ':' || coalesce(max(created)::text, '') from accounts) as s`, [PUB_SIG_KEYS])).rows[0].s;
    if (!(PUB && PUB.s === sig && Date.now() - PUB.at < 600000)) PUB = { s: sig, at: Date.now(), out: await publicOut() };
    const out = { ...PUB.out, me: me ? me.n : null }, M = await maintCached();
    if (M && !isSix(me)) { out.maint = { at: M.at, msg: M.msg || "" }; return send(res, 200, out); } /* mantenimiento: la página muestra solo la pantalla de mantenimiento */
    if (me && query(req).full) { delete out.roster; out.data = await fullData(me); } // ahorra una vuelta al iniciar
    return send(res, 200, out);
  }
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  return post(req, res);
});
let PUB = null;
const PUB_SIG_KEYS = ["lspdt.roster", "lspdt.lssd.roster", "lspdt.sahp.roster", ...PUBLIC_KEYS];
async function publicOut() {
  {
    const rows = (await q(`select 'n' as g, name as k, null as v, created as t from accounts
      union all select 'r', null, v, 0 from kv where k='lspdt.roster'
      union all select 'b', k, case when v like 'data:%' then '#img' else v end, t from kv where k = any($1) and v is not null`, [PUBLIC_KEYS])).rows;
    const acc = [], brand = {}; let raw = null;
    for (const r of rows) {
      if (r.g === "n") acc.push(r);
      else if (r.g === "r") raw = r.v;
      else brand[r.k] = r.v === "#img" ? `/api/img?k=${encodeURIComponent(r.k)}&t=${r.t}` : r.v;
    }
    /* orden de registro = ID de la cuenta en los perfiles (six, el fundador, siempre es el #1) */
    acc.sort(byId);
    /* las cuentas del LSSD se publican por placa (el usuario OOC no sale de acá) */
    const out = { names: acc.filter(r => !isDeptAcc(r.k)).map(r => r.k), brand };
    /* directorio de perfiles: todas las cuentas de los tres departamentos en orden de registro (el ID del perfil), con su rango.
       Así se puede seguir y ver el perfil de alguien de otro departamento. */
    const RL = parseRosterRaw(raw).list, XL = {}; for (const d of XDEPTS) XL[d] = await xRoster(d);
    out.dir = acc.map(r => { const d = XDEPTS.find(x => r.k.startsWith(x + ":"));
      if (!d) return { n: r.k, d: "lspd", r: RL.find(a => a.n === r.k)?.r || "" };
      const a = deptOfAcc(XL[d], r.k); return a ? { n: a.n, d, r: a.r } : null; }).filter(Boolean);
    for (const d of XDEPTS) { const L = XL[d];
      out[d + "Names"] = acc.filter(r => r.k.startsWith(d + ":")).map(r => deptOfAcc(L, r.k)).filter(Boolean).map(a => "#" + a.p);
      out[d] = L.filter(a => a.r !== "K-9" && a.u).map(a => ({ n: a.n, r: a.r, p: a.p })); }
    out.roster = slim(parseRosterRaw(raw).list);
    return out;
  }
}
async function post(req, res) {
  const b = await body(req), a = b.a;

  if (a === "login") {
    const u = norm(String(b.u || "").trim());
    if (!u || !b.pw) return send(res, 400, { msg: "Completá el correo y la contraseña." });
    const ip = clientIp(req), wait = await loginBlocked(u, ip);
    if (wait) return send(res, 429, { msg: `Demasiados intentos fallidos. Probá de nuevo en ${wait} min.` });
    const rows = (await q("select name,email,hash from accounts")).rows, dept = XDEPTS.includes(b.dept) ? b.dept : "lspd", X = dept !== "lspd";
    let acc = null, lag = null;
    if (X) { /* LSSD y SAHP: usuario OOC, placa o nombre (si no se repite) */
      const L0 = await xRoster(dept); lag = deptFind(L0, u);
      if (lag && /^(expulsado|trasladado)/i.test(String(lag.e || ""))) return send(res, 403, { msg: /^expuls/i.test(lag.e) ? "Fuiste expulsado del departamento." : `${lag.e}: entrá por ese departamento.` });
      /* placa vieja de otro departamento (se trasladó): se busca a quién era y se lo encuentra por el nombre; la placa se actualiza sola */
      if (!lag && digits(u)) { const old = (await roster()).list.find(a => String(a.p) === digits(u)); if (old) lag = deptFind(L0, old.n); if (lag && lag.amb) lag = null; }
      if (lag && lag.amb) return send(res, 400, { msg: `Con ese usuario hay ${lag.amb.length} personajes (${lag.amb.map(a => a.n).join(" y ")}). Entrá con la placa o el nombre del que quieras usar.` });
      if (lag) acc = rows.find(x => x.name === deptAcc(lag, dept)) || rows.find(x => x.name.startsWith(dept + ":") && deptOfAcc(L0, x.name) === lag) || null;
      /* traslado: no tiene cuenta en este departamento pero sí la del LSPD con el mismo nombre → con su misma contraseña, la cuenta pasa a este
         departamento (deja de cargar en el LSPD) y conserva su perfil, que es común a los tres */
      if (lag && !acc && lag.src) { const old = rows.find(x => !isDeptAcc(x.name) && norm(x.name) === norm(lag.n));
        if (old && checkPw(b.pw, old.hash)) { const nn = deptAcc(lag, dept); await q("update accounts set name=$2 where name=$1", [old.name, nn]); await q("delete from sessions where name=$1", [old.name]);
          await audit(lag.n, `pasó su cuenta al ${XN[dept]} por traslado`, "cuenta", `${old.name} → ${nn}`, ip); acc = { ...old, name: nn }; invalidate(); } }
    } else {
      acc = rows.find(x => !isDeptAcc(x.name) && (norm(x.email) === u || norm(x.name) === u || norm(x.email.split("@")[0]) === u)) || null;
      /* también con el número de placa (para nombres dobles o difíciles de escribir) */
      if (!acc && digits(u)) { const ag0 = (await roster()).list.find(a => String(a.p) === digits(u)); if (ag0) acc = rows.find(x => x.name === ag0.n) || null; }
    }
    if (!acc) { await loginFail("", ip); return send(res, 404, { msg: X ? `No hay una cuenta del ${XN[dept]} con ese usuario o placa. Registrate primero.` : "No hay una cuenta con ese correo, nombre o placa. Registrate primero." }); }
    if (!checkPw(b.pw, acc.hash)) { await loginFail(u, ip); await audit(acc.name, "contraseña incorrecta", "login", "", ip); await new Promise(r => setTimeout(r, 600)); return send(res, 403, { msg: "Contraseña incorrecta." }); }
    await loginOk(u);
    if (needsRehash(acc.hash)) await q("update accounts set hash=$2 where name=$1", [acc.name, hashPw(b.pw)]);
    { const M = await maintCached(); if (M && !(dept === "lspd" && acc.name === SIX_OWNER)) return send(res, 503, { maint: { at: M.at, msg: M.msg || "" }, msg: "La terminal está en mantenimiento" }); }
    if (X) {
      await q("update accounts set last=$2 where name=$1", [acc.name, Date.now()]);
      await newSession(res, acc.name, !!b.keep); await audit(lag.n, `inició sesión (${XN[dept]})`, "login", b.keep ? "Mantener sesión" : "", ip);
      return send(res, 200, { n: lag.n, e: acc.email, dept, data: await fullData(deptUser(lag, acc.name, dept)) });
    }
    const ag = findIn((await roster()).list, acc.name);
    /* se trasladó a otro departamento (figura incorporado allá por un traslado): esta cuenta ya no entra al LSPD */
    for (const d of XDEPTS) { const t = (await xRoster(d)).find(x => x.src && x.tr && norm(x.n) === norm(acc.name) && !/retir|baja|inactiv/i.test(x.e || ""));
      if (t) return send(res, 403, { msg: `Te trasladaste al ${XN[d]}: entrá por el ${XN[d]} con tu placa #${t.p} y tu misma contraseña. Tu perfil se mantiene.` }); }
    if (!ag) return send(res, 403, { msg: "Tu agente ya no figura en el roster." });
    if (!(await gate(ag))) {
      if ((await metaList("rejected")).includes(ag.n)) return send(res, 403, { msg: "Tu solicitud de acceso fue rechazada. Consultá con la administración." });
      return send(res, 403, { pending: true, msg: PEND_MSG });
    }
    await q("update accounts set last=$2 where name=$1", [acc.name, Date.now()]);
    await newSession(res, acc.name, !!b.keep); await audit(acc.name, "inició sesión", "login", b.keep ? "Mantener sesión" : "", ip);
    return send(res, 200, { n: acc.name, e: acc.email, data: await fullData(await userOf(acc.name, ag)) });
  }

  if (a === "register" && XDEPTS.includes(b.dept)) {
    const D = b.dept, lag = deptFind(await xRoster(D), b.n);
    if (lag && lag.amb) return send(res, 400, { msg: "Ese usuario tiene varios personajes: elegilo por nombre o placa." });
    if (!lag) return send(res, 400, { msg: `Elegí tu personaje del roster del ${XN[D]} (por nombre o placa).` });
    if (tooShort(b.pw)) return send(res, 400, { msg: "La contraseña tiene que tener al menos 8 caracteres." });
    const ip = clientIp(req), wait = await loginBlocked("inv", ip);
    if (wait) return send(res, 429, { msg: `Demasiados intentos. Probá de nuevo en ${wait} min.` });
    const all = await metaObjs("invites"), ic = String(b.code || "").trim().toUpperCase(), inv = all.find(x => x && !x.u && x.exp > Date.now() && safeEq(x.c, ic));
    if (!inv) { await loginFail("", ip); return send(res, 403, { msg: "El código de invitación no es válido o ya se usó. Pedíselo a la administración de la terminal." }); }
    if ((inv.d || "lspd") !== D) return send(res, 403, { msg: `Ese código es de otro departamento. Pedí uno del ${XN[D]} (empieza con «${XN[D]}-»).` });
    const now = Date.now(), an = deptAcc(lag, D), email = norm(lag.u).replace(/[^a-z0-9]/g, "") + `@${D}.sanandreas.eu`;
    const r = await q("insert into accounts(name,email,hash,created,last) values($1,$2,$3,$4,$4) on conflict do nothing returning name", [an, email, hashPw(b.pw), now]);
    if (!r.rows[0]) return send(res, 409, { msg: "Ese agente ya tiene cuenta. Iniciá sesión." });
    inv.u = an; inv.ut = now; await setMeta("invites", all.filter(x => x && (x.exp > now || x.u)).slice(-300));
    const rec = await newRec(an);
    await newSession(res, an, b.keep !== false); await audit(lag.n, `creó su cuenta (${XN[D]})`, "cuenta", "Con invitación de " + (inv.by || "—"), ip);
    return send(res, 200, { n: lag.n, e: email, dept: D, rec, data: await fullData(deptUser(lag, an, D)) });
  }
  if (a === "register") {
    const R0 = (await roster()).list, ag = findIn(R0, b.n) || (digits(b.n) ? R0.find(x => String(x.p) === digits(b.n)) : null);
    if (!ag) return send(res, 400, { msg: "Escribí el nombre de tu personaje y elegilo de la lista." });
    if (tooShort(b.pw)) return send(res, 400, { msg: "La contraseña tiene que tener al menos 8 caracteres." });
    const ip = clientIp(req), wait = await loginBlocked("inv", ip);
    if (wait) return send(res, 429, { msg: `Demasiados intentos. Probá de nuevo en ${wait} min.` });
    const all = await metaObjs("invites"), ic = String(b.code || "").trim().toUpperCase(), inv = all.find(x => x && !x.u && x.exp > Date.now() && safeEq(x.c, ic));
    if (!inv) { await loginFail("", ip); return send(res, 403, { msg: "El código de invitación no es válido o ya se usó. Pedíselo a la administración de la terminal." }); }
    if ((inv.d || "lspd") !== "lspd") return send(res, 403, { msg: "Ese código es de otro departamento. Pedí uno del LSPD (empieza con «LSPD-»)." });
    const now = Date.now();
    const r = await q("insert into accounts(name,email,hash,created,last) values($1,$2,$3,$4,$4) on conflict do nothing returning name", [ag.n, emailOf(ag.n), hashPw(b.pw), now]);
    if (!r.rows[0]) return send(res, 409, { msg: "Ese agente ya tiene cuenta. Iniciá sesión." });
    inv.u = ag.n; inv.ut = now; await setMeta("invites", all.filter(x => x && (x.exp > now || x.u)).slice(-300));
    const rec = await newRec(ag.n);
    if (!(await gate(ag))) { // queda pendiente de aprobación
      const pend = (await metaList("pending")).filter(x => x !== ag.n); pend.push(ag.n); await setMeta("pending", pend);
      await setMeta("rejected", (await metaList("rejected")).filter(x => x !== ag.n));
      await audit(ag.n, "creó su cuenta (pendiente)", "cuenta", "", ip);
      return send(res, 202, { pending: true, n: ag.n, e: emailOf(ag.n), rec, msg: "Cuenta creada. " + PEND_MSG });
    }
    await newSession(res, ag.n, b.keep !== false); await audit(ag.n, "creó su cuenta", "cuenta", "Con invitación de " + (inv.by || "—"), ip);
    return send(res, 200, { n: ag.n, e: emailOf(ag.n), rec, data: await fullData(await userOf(ag.n, ag)) });
  }

  /* restablecer la contraseña con un código de recuperación (sin sesión) */
  if (a === "recover") {
    const u = norm(String(b.u || "").trim()), ip = clientIp(req), wait = await loginBlocked(u, ip);
    if (wait) return send(res, 429, { msg: `Demasiados intentos fallidos. Probá de nuevo en ${wait} min.` });
    if (tooShort(b.pw)) return send(res, 400, { msg: "La nueva contraseña tiene que tener al menos 8 caracteres." });
    const AR = (await q("select name,email from accounts")).rows, lg = XDEPTS.includes(b.dept) ? deptFind(await xRoster(b.dept), u) : null;
    const acc = lg && !lg.amb ? AR.find(x => x.name === deptAcc(lg, b.dept)) : AR.find(x => norm(x.email) === u || norm(x.name) === u || norm(x.email.split("@")[0]) === u);
    const L = acc ? await metaList("rec:" + acc.name) : [], h = tokenHash(normRec(b.code)), i = L.indexOf(h);
    if (!acc || i < 0) { await loginFail(u, ip); await new Promise(r => setTimeout(r, 600)); return send(res, 403, { msg: "La cuenta o el código de recuperación no son correctos." }); }
    L.splice(i, 1); await setMeta("rec:" + acc.name, L);
    await q("update accounts set hash=$2 where name=$1", [acc.name, hashPw(b.pw)]);
    await q("delete from sessions where name=$1", [acc.name]); invalidate(); await loginOk(u);
    return send(res, 200, { ok: 1, left: L.length, e: acc.email });
  }

  if (a === "logout") { const w = await current(req).catch(() => null); if (w) await audit(w.n, "cerró sesión", "login", "", clientIp(req)); await endSession(req, res); return send(res, 200, { ok: 1 }); }

  /* mantenimiento: el chat de la pantalla de mantenimiento (sin sesión). Si lo que se escribe es la contraseña, se apaga; si no, el mensaje le llega a six por Discord */
  if (a === "maintmsg") {
    const M = await maintState(); if (!M) return send(res, 200, { off: true });
    const t = String(b.t || "").trim().slice(0, 800); if (!t) return send(res, 400, { msg: "Escribí un mensaje" });
    if (await maintPwOk(t)) { await maintSet(false, "six (chat)"); await audit("six", "apagó el mantenimiento", "mantenimiento", "", clientIp(req)); return send(res, 200, { off: true }); }
    const w = await current(req).catch(() => null), lim = "maintmsg:" + clientIp(req), n = +((await q("select v from meta where k=$1", [lim])).rows[0]?.v || 0);
    if (n >= 5) return send(res, 429, { msg: "Ya mandaste varios mensajes. Gracias, ya le llegaron." });
    await q("insert into meta(k,v) values($1,$2) on conflict(k) do update set v=excluded.v", [lim, String(n + 1)]);
    const err = await postFb(`🛠️ **Mensaje desde la pantalla de mantenimiento**${w ? ` · ${w.n}` : " · sin sesión"}\n>>> ${t.replace(/@/g, "@\u200b")}`);
    return send(res, err ? 502 : 200, err ? { msg: "No se pudo mandar el mensaje: " + err } : { ok: 1 });
  }

  // Lo que sigue requiere sesión
  const me = await current(req);
  if (!me) return send(res, 401, { error: "auth", msg: "Tu sesión expiró. Volvé a iniciar sesión." });

  const an = me.acc || me.n; /* nombre de la cuenta (en el LSSD es «lssd:usuario») */
  if (a === "info") {
    const r = (await q("select email,created,last from accounts where name=$1", [an])).rows[0];
    const all = (await q("select name as k, created as t from accounts")).rows.sort(byId);
    return send(res, 200, { e: r.email, c: +r.created, last: +r.last, no: all.findIndex(x => x.k === an) + 1, rec: (await metaList("rec:" + an)).length });
  }
  if (a === "recgen") return send(res, 200, { rec: await newRec(an) });
  /* códigos de autodestrucción: cualquiera que tenga uno desbloquea su sesión 10 minutos para borrar (solo six los recibe por Discord) */
  const sh = tokenHash(sessionToken(req));
  if (a === "sdunlock") { const r = await sdUnlock(b.code, sh, clientIp(req)); await audit(me.n, r.ok ? "desbloqueó borrados con un código" : "falló un código de autodestrucción", "seguridad", "", clientIp(req)); return send(res, r.ok ? 200 : 403, r); }
  if (a === "sdstate") return send(res, 200, { has: isSix(me) ? await sdHas() : undefined, unlocked: await sdUnlocked(sh) });
  if (a === "sdgen") {
    if (!isSix(me)) return send(res, 403, { msg: "Solo six" });
    if ((await sdHas()) && !(await sdUnlocked(sh))) return send(res, 428, { msg: "Para generar códigos nuevos primero ingresá uno de los actuales", need: "sd" });
    const L = await sdGenerate(); await audit(me.n, "generó códigos de autodestrucción nuevos", "seguridad", "", clientIp(req));
    return send(res, 200, { codes: L });
  }
  /* mantenimiento (beta): solo la cuenta de six, desde la IP con la que lo configuró por primera vez */
  if (a === "maint") {
    if (!isSix(me)) return send(res, 403, { msg: "Solo six" });
    const ip = clientIp(req), own = await ownerIp();
    if (own && own !== ip && !(await sdUnlocked(sh))) return send(res, 403, { msg: "El mantenimiento solo se maneja desde tu IP de siempre (o ingresá un código de autodestrucción para cambiarla)", need: "sd" });
    if (b.op === "state") return send(res, 200, { m: await maintState(), ip, own });
    if (b.op === "pw") { const pw = await maintNewPw(); if (!own) await setOwnerIp(ip); await audit(me.n, "generó una contraseña de mantenimiento", "mantenimiento", "", ip); return send(res, 200, { pw }); }
    if (b.op === "on" || b.op === "off") {
      if (!(await maintPwOk(b.pw))) return send(res, 403, { msg: "La contraseña no es la que te llegó por Discord" });
      await setOwnerIp(ip); await maintSet(b.op === "on", me.n, b.msg); await audit(me.n, b.op === "on" ? "activó el mantenimiento" : "apagó el mantenimiento", "mantenimiento", "", ip);
      return send(res, 200, { m: await maintState() });
    }
    return send(res, 400, { msg: "Acción inválida" });
  }
  /* administración del departamento: ve las cuentas de su departamento (registro y último ingreso), sin restablecer ni borrar */
  if (a === "deptaccs") {
    if (!me.dadm && !isSix(me)) return send(res, 403, { msg: "Solo la administración del departamento." });
    const d = me.dept || (["lssd", "sahp"].includes(b.d) ? b.d : "lssd");
    const rows = (await q("select name,created,last from accounts where name like $1 order by last desc nulls last", [d + ":%"])).rows;
    return send(res, 200, { list: rows.map(r => ({ n: r.name, c: +r.created, last: r.last ? +r.last : null })) });
  }
  if (me.dept && a !== "passwd" && !(me.dadm && ["invites", "invite", "uninvite"].includes(a))) return send(res, 403, { msg: "No disponible para tu departamento todavía" });
  if (["invites", "invite", "uninvite"].includes(a) && !canInvite(me)) return send(res, 403, { msg: "Las invitaciones las generan solo los dueños de la terminal." });
  if (a === "invites") return send(res, 200, { list: (await invList()).filter(x => x.by === me.n), used: (await metaObjs("invites")).filter(x => x.by === me.n && x.u).slice(-20), max: INV_MAX });
  if (a === "invite") {
    const all = await metaObjs("invites"), mine = (await invList()).filter(x => x.by === me.n);
    if (mine.length >= INV_MAX) return send(res, 429, { msg: `Ya tenés ${INV_MAX} invitaciones activas. Revocá alguna o esperá a que se usen.` });
    const d = me.dadm && me.dept ? me.dept : DEPT_INV[b.d] ? b.d : "lspd", x = { c: invCode(d), d, by: me.n, t: Date.now(), exp: Date.now() + INV_TTL };
    await setMeta("invites", [...all.filter(i => i && (i.exp > Date.now() || i.u)), x].slice(-300)); return send(res, 200, x);
  }
  if (a === "uninvite") {
    const all = await metaObjs("invites"), i = all.find(x => x && x.c === b.c);
    if (!i || i.by !== me.n) return send(res, 403, { msg: "No podés revocar esa invitación." });
    await setMeta("invites", all.filter(x => x !== i)); return send(res, 200, { ok: 1 });
  }
  if (a === "passwd") {
    /* si six la restableció, cambiarla es obligatorio y no pide la actual (ya entró con la temporal) */
    const must = (await metaList("mustpw")).includes(an);
    const r = (await q("select hash from accounts where name=$1", [an])).rows[0];
    if (!r || (!must && !checkPw(b.old, r.hash))) return send(res, 403, { msg: "La contraseña actual no es correcta" });
    if (must && checkPw(b.nw || "", r.hash)) return send(res, 400, { msg: "Elegí una contraseña distinta a la temporal" });
    if (tooShort(b.nw)) return send(res, 400, { msg: "La nueva contraseña tiene que tener al menos 8 caracteres" });
    await q("update accounts set hash=$2 where name=$1", [an, hashPw(b.nw)]);
    await q("delete from sessions where name=$1 and token<>$2", [an, tokenHash(sessionToken(req))]); invalidate(); // cierra las otras sesiones
    if (must) await setMeta("mustpw", (await metaList("mustpw")).filter(x => x !== an));
    await audit(me.n, "cambió su contraseña", "cuenta", "", clientIp(req));
    return send(res, 200, { ok: 1 });
  }

  /* six: cuentas registradas y restablecer contraseñas (al entrar, la persona tiene que cambiarla sí o sí) */
  if (a === "sixaccs" || a === "sixreset") {
    if (!isSix(me)) return send(res, 403, { msg: "Solo six" });
    if (a === "sixaccs") { const must = await metaList("mustpw");
      const rows = (await q("select name,created,last from accounts")).rows.sort((x, y) => x.name.localeCompare(y.name, "es"));
      return send(res, 200, { list: rows.map(r => ({ n: r.name, c: +r.created, last: r.last ? +r.last : null, must: must.includes(r.name) })) }); }
    if (b.n === me.n) return send(res, 400, { msg: "Tu propia contraseña la cambiás desde Mi cuenta" });
    const tmp = randomPw(), r = await q("update accounts set hash=$2 where name=$1 returning name", [b.n, hashPw(tmp)]);
    if (!r.rows[0]) return send(res, 404, { msg: "No existe esa cuenta" });
    await setMeta("mustpw", [...new Set([...(await metaList("mustpw")), b.n])]);
    await q("delete from sessions where name=$1", [b.n]); invalidate(); await audit(me.n, "restableció la contraseña", "cuenta", b.n, clientIp(req));
    return send(res, 200, { tmp });
  }

  /* six elige qué cuenta es la de Anita (su espacio privado) */
  if (a === "anita") {
    if (!isSix(me)) return send(res, 403, { msg: "No permitido." });
    if (b.set !== undefined) { const n = String(b.set || ""); if (n && !(await q("select 1 from accounts where name=$1", [n])).rows[0]) return send(res, 404, { msg: "Esa cuenta no existe." });
      await q("insert into meta(k,v) values('anita',$1) on conflict(k) do update set v=excluded.v", [n]); invalidate(); }
    const cur = (await q("select v from meta where k='anita'")).rows[0]?.v || "";
    return send(res, 200, { n: cur, accounts: (await q("select name from accounts order by name")).rows.map(r => r.name) });
  }

  // Solicitudes de acceso (administradores)
  if (a === "pending") {
    if (!me.admin) return send(res, 403, { msg: "Solo administradores." });
    const accs = new Map((await q("select name,created from accounts")).rows.map(r => [r.name, +r.created]));
    const pend = (await metaList("pending")).filter(n => accs.has(n));
    return send(res, 200, { pending: pend.map(n => ({ n, c: accs.get(n) })), approved: await metaList("approved"), rejected: await metaList("rejected") });
  }
  if (a === "approve") {
    if (!me.admin) return send(res, 403, { msg: "Solo administradores." });
    const n = String(b.n || ""), ok = b.ok !== false;
    await setMeta("pending", (await metaList("pending")).filter(x => x !== n));
    const ap = (await metaList("approved")).filter(x => x !== n), rj = (await metaList("rejected")).filter(x => x !== n);
    if (ok) ap.push(n); else { rj.push(n); await q("delete from sessions where name=$1", [n]); }
    await setMeta("approved", ap); await setMeta("rejected", rj); invalidate(); await audit(me.n, ok ? "aprobó el acceso" : "rechazó el acceso", "cuenta", n, clientIp(req));
    return send(res, 200, { ok: 1 });
  }

  // Administradores
  if (a === "admins") {
    if (!me.admin) return send(res, 403, { msg: "Solo administradores." });
    const accs = (await q("select name from accounts order by name")).rows.map(r => r.name);
    return send(res, 200, { owners: OWNERS, admins: (await dbAdmins()).filter(n => !OWNERS.includes(n)), accounts: accs, canGrant: me.owner });
  }
  if (a === "setadmin") {
    if (!me.owner) return send(res, 403, { msg: "Solo el dueño de la terminal puede dar o quitar administrador." });
    const n = String(b.n || "");
    if (OWNERS.includes(n)) return send(res, 400, { msg: "Ese administrador es dueño y no se puede quitar desde acá." });
    if (b.on && !(await q("select 1 from accounts where name=$1", [n])).rows[0]) return send(res, 404, { msg: "Esa persona todavía no tiene cuenta en la terminal." });
    let list = (await dbAdmins()).filter(x => x !== n);
    if (b.on) list.push(n);
    await q("insert into meta(k,v) values('admins',$1) on conflict(k) do update set v=excluded.v", [JSON.stringify(list)]); await audit(me.n, b.on ? "dio administrador" : "quitó administrador", "cuenta", n, clientIp(req));
    invalidate();
    return send(res, 200, { admins: list });
  }

  // Administración de cuentas: Capitanía (Teniente o superior)
  if (me.l < CAP) return send(res, 403, { msg: "Solo Capitanía puede administrar cuentas." });
  if (a === "list") {
    const rows = (await q("select name,email,created,last from accounts order by last desc nulls last")).rows;
    return send(res, 200, { list: rows.map(r => ({ n: r.name, e: r.email, c: +r.created, last: r.last ? +r.last : null })) });
  }
  if (a === "reset") {
    const tmp = randomPw();
    const r = await q("update accounts set hash=$2 where name=$1 returning name", [b.n, hashPw(tmp)]);
    if (!r.rows[0]) return send(res, 404, { msg: "No existe esa cuenta" });
    await setMeta("mustpw", [...new Set([...(await metaList("mustpw")), b.n])]);
    await q("delete from sessions where name=$1", [b.n]); invalidate(); await audit(me.n, "restableció la contraseña", "cuenta", b.n, clientIp(req));
    return send(res, 200, { tmp });
  }
  if (a === "delete") {
    if (b.n === me.n) return send(res, 400, { msg: "No podés eliminar tu propia cuenta" });
    if (!(await sdUnlocked(tokenHash(sessionToken(req))))) return send(res, 428, { msg: "Para eliminar una cuenta hace falta un código de autodestrucción", need: "sd" });
    await q("delete from sessions where name=$1", [b.n]);
    await q("delete from accounts where name=$1", [b.n]); invalidate(); await audit(me.n, "eliminó la cuenta", "cuenta", b.n, clientIp(req));
    return send(res, 200, { ok: 1 });
  }
  return send(res, 400, { msg: "Acción desconocida" });
}
