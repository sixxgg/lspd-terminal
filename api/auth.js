import { q } from "../lib/db.js";
import { send, body, wrap, roster, findIn, lvl, CAP, norm, emailOf, hashPw, checkPw, needsRehash, randomPw, safeEq, clientIp, loginBlocked, loginFail, loginOk, sessionToken, tokenHash, newSession, endSession, current, PUBLIC_KEYS, query, canEnter, invalidate, isSix, SIX_OWNER, OWNERS, dbAdmins, parseList, parseRoster as parseRosterRaw } from "../lib/core.js";
import { fullData } from "../lib/store.js";
import { randomBytes } from "node:crypto";

const slim = list => list.map(a => ({ n: a.n, r: a.r, p: a.p }));
/* invitaciones: códigos aleatorios de un solo uso (vencen a las 72 h); solo las generan los dueños desde su panel (six o Anita) */
const INV_TTL = 72 * 3600e3, INV_MAX = 20;
const canInvite = u => isSix(u) || !!u.anita;
const invCode = () => { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = randomBytes(10); let c = ""; for (let i = 0; i < 10; i++) c += A[b[i] % A.length]; return `LSPD-${c.slice(0, 5)}-${c.slice(5)}`; };
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
const PEND_MSG = "Tus credenciales están siendo revisadas por la administración. Intentá más tarde.";
export default wrap(async (req, res) => {
  if (req.method === "GET") {
    // todo lo público en una sola consulta: cuentas, roster e imagen de la terminal
    const me = await current(req);
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
    acc.sort((a, b) => (b.k === SIX_OWNER) - (a.k === SIX_OWNER) || +a.t - +b.t);
    const out = { me: me ? me.n : null, names: acc.map(r => r.k), brand };
    if (me && query(req).full) out.data = await fullData(me); // ahorra una vuelta al iniciar
    else out.roster = slim(parseRosterRaw(raw).list);
    return send(res, 200, out);
  }
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req), a = b.a;

  if (a === "login") {
    const u = norm(String(b.u || "").trim());
    if (!u || !b.pw) return send(res, 400, { msg: "Completá el correo y la contraseña." });
    const ip = clientIp(req), wait = await loginBlocked(u, ip);
    if (wait) return send(res, 429, { msg: `Demasiados intentos fallidos. Probá de nuevo en ${wait} min.` });
    const rows = (await q("select name,email,hash from accounts")).rows;
    const acc = rows.find(x => norm(x.email) === u || norm(x.name) === u || norm(x.email.split("@")[0]) === u);
    if (!acc) { await loginFail("", ip); return send(res, 404, { msg: "No hay una cuenta con ese correo. Registrate primero." }); }
    if (!checkPw(b.pw, acc.hash)) { await loginFail(u, ip); await new Promise(r => setTimeout(r, 600)); return send(res, 403, { msg: "Contraseña incorrecta." }); }
    await loginOk(u);
    if (needsRehash(acc.hash)) await q("update accounts set hash=$2 where name=$1", [acc.name, hashPw(b.pw)]);
    const ag = findIn((await roster()).list, acc.name);
    if (!ag) return send(res, 403, { msg: "Tu agente ya no figura en el roster." });
    if (!(await gate(ag))) {
      if ((await metaList("rejected")).includes(ag.n)) return send(res, 403, { msg: "Tu solicitud de acceso fue rechazada. Consultá con la administración." });
      return send(res, 403, { pending: true, msg: PEND_MSG });
    }
    await q("update accounts set last=$2 where name=$1", [acc.name, Date.now()]);
    await newSession(res, acc.name, !!b.keep);
    return send(res, 200, { n: acc.name, e: acc.email, data: await fullData(await userOf(acc.name, ag)) });
  }

  if (a === "register") {
    const ag = findIn((await roster()).list, b.n);
    if (!ag) return send(res, 400, { msg: "Escribí el nombre de tu personaje y elegilo de la lista." });
    if (tooShort(b.pw)) return send(res, 400, { msg: "La contraseña tiene que tener al menos 8 caracteres." });
    const ip = clientIp(req), wait = await loginBlocked("inv", ip);
    if (wait) return send(res, 429, { msg: `Demasiados intentos. Probá de nuevo en ${wait} min.` });
    const all = await metaObjs("invites"), ic = String(b.code || "").trim().toUpperCase(), inv = all.find(x => x && !x.u && x.exp > Date.now() && safeEq(x.c, ic));
    if (!inv) { await loginFail("", ip); return send(res, 403, { msg: "El código de invitación no es válido o ya se usó. Pedíselo a la administración de la terminal." }); }
    const now = Date.now();
    const r = await q("insert into accounts(name,email,hash,created,last) values($1,$2,$3,$4,$4) on conflict do nothing returning name", [ag.n, emailOf(ag.n), hashPw(b.pw), now]);
    if (!r.rows[0]) return send(res, 409, { msg: "Ese agente ya tiene cuenta. Iniciá sesión." });
    inv.u = ag.n; inv.ut = now; await setMeta("invites", all.filter(x => x && (x.exp > now || x.u)).slice(-300));
    const rec = await newRec(ag.n);
    if (!(await gate(ag))) { // queda pendiente de aprobación
      const pend = (await metaList("pending")).filter(x => x !== ag.n); pend.push(ag.n); await setMeta("pending", pend);
      await setMeta("rejected", (await metaList("rejected")).filter(x => x !== ag.n));
      return send(res, 202, { pending: true, n: ag.n, e: emailOf(ag.n), rec, msg: "Cuenta creada. " + PEND_MSG });
    }
    await newSession(res, ag.n, b.keep !== false);
    return send(res, 200, { n: ag.n, e: emailOf(ag.n), rec, data: await fullData(await userOf(ag.n, ag)) });
  }

  /* restablecer la contraseña con un código de recuperación (sin sesión) */
  if (a === "recover") {
    const u = norm(String(b.u || "").trim()), ip = clientIp(req), wait = await loginBlocked(u, ip);
    if (wait) return send(res, 429, { msg: `Demasiados intentos fallidos. Probá de nuevo en ${wait} min.` });
    if (tooShort(b.pw)) return send(res, 400, { msg: "La nueva contraseña tiene que tener al menos 8 caracteres." });
    const acc = (await q("select name,email from accounts")).rows.find(x => norm(x.email) === u || norm(x.name) === u || norm(x.email.split("@")[0]) === u);
    const L = acc ? await metaList("rec:" + acc.name) : [], h = tokenHash(normRec(b.code)), i = L.indexOf(h);
    if (!acc || i < 0) { await loginFail(u, ip); await new Promise(r => setTimeout(r, 600)); return send(res, 403, { msg: "La cuenta o el código de recuperación no son correctos." }); }
    L.splice(i, 1); await setMeta("rec:" + acc.name, L);
    await q("update accounts set hash=$2 where name=$1", [acc.name, hashPw(b.pw)]);
    await q("delete from sessions where name=$1", [acc.name]); invalidate(); await loginOk(u);
    return send(res, 200, { ok: 1, left: L.length, e: acc.email });
  }

  if (a === "logout") { await endSession(req, res); return send(res, 200, { ok: 1 }); }

  // Lo que sigue requiere sesión
  const me = await current(req);
  if (!me) return send(res, 401, { error: "auth", msg: "Tu sesión expiró. Volvé a iniciar sesión." });

  if (a === "info") {
    const r = (await q("select email,created,last,(select count(*) from accounts b where b.created <= a.created) as no from accounts a where name=$1", [me.n])).rows[0];
    return send(res, 200, { e: r.email, c: +r.created, last: +r.last, no: +r.no, rec: (await metaList("rec:" + me.n)).length });
  }
  if (a === "recgen") return send(res, 200, { rec: await newRec(me.n) });
  if (["invites", "invite", "uninvite"].includes(a) && !canInvite(me)) return send(res, 403, { msg: "Las invitaciones las generan solo los dueños de la terminal." });
  if (a === "invites") return send(res, 200, { list: (await invList()).filter(x => x.by === me.n), used: (await metaObjs("invites")).filter(x => x.by === me.n && x.u).slice(-20), max: INV_MAX });
  if (a === "invite") {
    const all = await metaObjs("invites"), mine = (await invList()).filter(x => x.by === me.n);
    if (mine.length >= INV_MAX) return send(res, 429, { msg: `Ya tenés ${INV_MAX} invitaciones activas. Revocá alguna o esperá a que se usen.` });
    const x = { c: invCode(), by: me.n, t: Date.now(), exp: Date.now() + INV_TTL };
    await setMeta("invites", [...all.filter(i => i && (i.exp > Date.now() || i.u)), x].slice(-300)); return send(res, 200, x);
  }
  if (a === "uninvite") {
    const all = await metaObjs("invites"), i = all.find(x => x && x.c === b.c);
    if (!i || i.by !== me.n) return send(res, 403, { msg: "No podés revocar esa invitación." });
    await setMeta("invites", all.filter(x => x !== i)); return send(res, 200, { ok: 1 });
  }
  if (a === "passwd") {
    const r = (await q("select hash from accounts where name=$1", [me.n])).rows[0];
    if (!r || !checkPw(b.old, r.hash)) return send(res, 403, { msg: "La contraseña actual no es correcta" });
    if (tooShort(b.nw)) return send(res, 400, { msg: "La nueva contraseña tiene que tener al menos 8 caracteres" });
    await q("update accounts set hash=$2 where name=$1", [me.n, hashPw(b.nw)]);
    await q("delete from sessions where name=$1 and token<>$2", [me.n, tokenHash(sessionToken(req))]); invalidate(); // cierra las otras sesiones
    return send(res, 200, { ok: 1 });
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
    await setMeta("approved", ap); await setMeta("rejected", rj); invalidate();
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
    await q("insert into meta(k,v) values('admins',$1) on conflict(k) do update set v=excluded.v", [JSON.stringify(list)]);
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
    await q("delete from sessions where name=$1", [b.n]); invalidate();
    return send(res, 200, { tmp });
  }
  if (a === "delete") {
    if (b.n === me.n) return send(res, 400, { msg: "No podés eliminar tu propia cuenta" });
    await q("delete from sessions where name=$1", [b.n]);
    await q("delete from accounts where name=$1", [b.n]); invalidate();
    return send(res, 200, { ok: 1 });
  }
  return send(res, 400, { msg: "Acción desconocida" });
});
