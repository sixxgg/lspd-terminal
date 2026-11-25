import crypto from "node:crypto";
import { q, tx } from "../lib/db.js";
import { audit, auditList, auditRoster, diffSum, keepVersion, versions, HIST_SKIP, ROSTER_OUT } from "../lib/audit.js";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mergeText } from "../lib/merge.js";
import { isDestructive, maintCached, sdUnlocked } from "../lib/owner.js";
import { fullData, imgUrl, shapeVal } from "../lib/store.js";
import { agxCheck, send, body, query, wrap, requireUser, canWrite, invalidate, IMG_KEY, ADMIN_KEY, PSB_DENY, canRead, isSix, clientIp, baseKey, keyDept, isXList, xCheck, loadBoards, isBoardKey, sessionToken, tokenHash, traslOk, parseRoster } from "../lib/core.js";
import { deptList } from "../lib/lssd.js";
import { purgeAll, purgeDivs, settleXfers } from "../lib/xfer.js";

/* IP privada, local o reservada (v4 y v6): el servidor nunca descarga de ahí */
const privIp = ip => { const a = String(ip).toLowerCase().replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(a)) { const [b, c] = a.split(".").map(Number);
    return b === 0 || b === 10 || b === 127 || b >= 224 || (b === 100 && c >= 64 && c <= 127) || (b === 169 && c === 254) || (b === 172 && c >= 16 && c <= 31) || (b === 192 && c === 168) || (b === 198 && (c === 18 || c === 19)); }
  return a === "::" || a === "::1" || /^(f[cd]|fe[89ab]|ff|2001:db8|64:ff9b)/.test(a); };
async function downloadImg(url) {
  const fail = m => Object.assign(new Error(m), { status: 400 });
  /* solo https públicas; el nombre se resuelve antes de conectar y cada redirección se vuelve a validar (nada de red interna, ni por DNS) */
  const check = async s => { let u; try { u = new URL(s); } catch { throw fail("La URL no es válida"); }
    const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (u.protocol !== "https:" || u.username || u.password || /^(localhost|.*\.local|.*\.internal)$/.test(h) || isIP(h) && privIp(h)) throw fail("Solo se aceptan URLs públicas con https");
    const L = isIP(h) ? [{ address: h }] : await lookup(h, { all: true }).catch(() => { throw fail("No se encontró ese sitio"); });
    if (!L.length || L.some(x => privIp(x.address))) throw fail("Solo se aceptan URLs públicas con https"); return u; };
  const ctl = AbortSignal.timeout(10000);
  let u = await check(url), r;
  for (let i = 0; ; i++) {
    r = await fetch(u, { signal: ctl, redirect: "manual", headers: { "User-Agent": "LSPD-Terminal" } }).catch(() => { throw fail("No se pudo descargar la imagen"); });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { if (i >= 3) throw fail("Demasiadas redirecciones"); u = await check(new URL(r.headers.get("location"), u).href); continue; }
    break;
  }
  if (!r.ok) throw fail(`El sitio respondió ${r.status}. Si es un enlace de Discord, puede haber vencido: subí la imagen desde tu PC.`);
  const type = (r.headers.get("content-type") || "").split(";")[0].trim();
  /* SVG se acepta para logos: /api/img las sirve con CSP sandbox y nosniff, así que no ejecutan nada */
  if (!/^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/.test(type)) throw fail("El enlace no es una imagen");
  const len = Number(r.headers.get("content-length") || 0); if (len > 3.2e6) throw fail("La imagen pesa más de 3 MB");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 3.2e6) throw fail("La imagen pesa más de 3 MB");
  return `data:${type};base64,${buf.toString("base64")}`;
}

/* guardado con historial, firmado por quien lo dispara */
const putAs = (by, ts) => async (c, K, val) => { const prev = (await c.query("select v, by, at from kv where k=$1", [K])).rows[0];
  await c.query("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by, at=excluded.at", [K, val, by, ts]);
  await keepVersion(c, K, val, by, prev ? { v: prev.v, by: prev.by, at: prev.at } : null); };
/* altas por traslado (Traslados › Incorporar): el agente sale de su departamento de origen y de sus divisiones; queda en Administración › Logs */
async function settle(by, ip) {
  const L = await tx(async c => { await c.query("select pg_advisory_xact_lock(hashtext('xfer:divs'))"); return settleXfers(c, putAs(by, Date.now()), by); });
  for (const o of L) await audit(by, ROSTER_OUT, o.de === "LSPD" ? "lspdt.roster" : `lspdt.${o.de.toLowerCase()}.agx`, [o.n, o.r || "—", o.p ? "#" + String(o.p).replace(/\D/g, "") : "sin placa", `Traslado ${o.de} → ${o.a}`].join(" · "), ip);
  if (L.length) invalidate(); return L;
}
/* una sola vez (marca en meta): ordena los traslados hechos antes de que esto fuera automático (salen del origen y de sus divisiones) */
let PURGED = false;
async function purgeOnce() {
  if (PURGED) return; PURGED = true;
  if ((await q("select v from meta where k='xfer:purge'")).rows[0]?.v === "2") return;
  await settle("sistema", "");
  const done = await tx(async c => {
    await c.query("select pg_advisory_xact_lock(hashtext('xfer:divs'))");
    if ((await c.query("select v from meta where k='xfer:purge'")).rows[0]?.v === "2") return [];
    const L = await purgeAll(c, putAs("sistema", Date.now()));
    await c.query("insert into meta(k,v) values('xfer:purge','2') on conflict(k) do update set v='2'");
    return L;
  });
  if (done.length) { invalidate(); await audit("sistema", "limpieza de divisiones por traslados", "divisiones", done.slice(0, 40).join(" · "), ""); }
}

export default wrap(async (req, res) => {
  const u = await requireUser(req, res);
  if (u) await purgeOnce().catch(() => { PURGED = false; });
  if (!u) return;
  /* mantenimiento: nadie más que six lee ni guarda (la página muestra la pantalla de mantenimiento) */
  { const M = await maintCached(); if (M && !isSix(u)) return send(res, 503, { maint: { at: M.at, msg: M.msg || "" }, msg: "La terminal está en mantenimiento" }); }

  if (req.method === "GET") {
    const qs = query(req), since = Number(qs.since);
    if (qs.since !== undefined && qs.since !== "" && Number.isFinite(since) && since >= 0) {
      // cambios desde la última consulta (con margen, el cliente descarta lo que ya tiene)
      /* margen de 50 por si un guardado más viejo terminó después; pero el valor solo viaja si es nuevo (t > since) o si el navegador
         lo pide (need: claves del margen que no tenía). Antes cada consulta (cada 5 s, por persona) volvía a traer lo del margen entero. */
      const need = String(qs.need || "").split(",").filter(Boolean).slice(0, 60);
      const rows0 = (await q("select k, t, v like 'data:%' as img, case when v like 'data:%' or (t <= $2 and not (k = any($3))) then null else v end as v, (t <= $2 and not (k = any($3))) as hint from kv where t > $1 or k = any($3) order by t", [since - 50, since, need])).rows;
      if (rows0.some(r => isBoardKey(r.k))) await loadBoards();
      const rows = rows0.filter(r => canRead(r.k, u));
      const ch = rows.map(r => r.hint && !r.img ? [r.k, null, +r.t, 1] : [r.k, r.img ? imgUrl(r.k, r.t) : shapeVal(r.k, r.v, u), +r.t]);
      const t = rows.length ? Math.max(since, ...rows.map(r => +r.t)) : since;
      return send(res, 200, { ch, t, me: { admin: u.admin, owner: u.owner, six: isSix(u), anita: !!u.anita, dadm: !!u.dadm, jef: u.dept && (u.l || 0) >= 10 ? u.n : "" } });
    }
    /* traslado interdepartamental: el expediente que traía en su departamento de origen, para que no se pierda al incorporarlo (solo quien gestiona traslados) */
    if (qs.trasexp) {
      if (!traslOk(u) || (u.dept || "lspd") !== "lssd") return send(res, 403, { msg: "Sin acceso" });
      const sl = String(qs.trasexp).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""), from = qs.from === "sahp" ? "sahp" : "lspd";
      const v = (await q("select v from kv where k=$1", [from === "lspd" ? `lspdt.exp.${sl}` : `lspdt.sahp.exp.${sl}`])).rows[0]?.v;
      let e = []; try { e = (JSON.parse(v || "{}").e || []).filter(x => x && typeof x === "object"); } catch { /* */ }
      await audit(u.n, "trajo el expediente de origen por traslado", "traslado", `${qs.trasexp} (${from.toUpperCase()})`, clientIp(req));
      return send(res, 200, { e });
    }
    if (qs.hist) { // versiones guardadas de una clave (y de un registro dentro de ella, con id)
      const hk = String(qs.hist);
      if (!canRead(hk, u) || (isXList(hk) && !isSix(u))) return send(res, 403, { msg: "Sin acceso" });
      return send(res, 200, { list: await versions(hk, qs.id ? String(qs.id) : "") });
    }
    if (qs.logs === "roster") { // bajas del roster: administración
      if (!u.admin) return send(res, 403, { msg: "Solo administradores" });
      return send(res, 200, await auditList({ before: qs.before, act: ROSTER_OUT, limit: 500 }));
    }
    if (qs.logs) { // registro de actividad: solo six
      if (!isSix(u)) return send(res, 403, { msg: "Solo six" });
      return send(res, 200, await auditList({ before: qs.before, who: qs.who, text: qs.q }));
    }
    if (qs.images) { // galería: todas las imágenes guardadas (solo administradores)
      if (!u.admin) return send(res, 403, { msg: "Solo administradores" });
      const list = (await q("select k, t, by, at, length(v) as n from kv where v like 'data:%' order by coalesce(at,0) desc, t desc")).rows
        .map(r => ({ k: r.k, t: +r.t, by: r.by, at: r.at ? +r.at : null, n: +r.n }));
      const db = +(await q("select pg_database_size(current_database()) as s")).rows[0].s;
      return send(res, 200, { list, db });
    }
    return send(res, 200, await fullData(u));
  }

  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req), k = b.k, bk = typeof k === "string" ? baseKey(k) : k; /* bk: la clave «como del LSPD» (las reglas valen igual en los tres departamentos) */
  /* carga inicial por diferencias: el navegador manda {clave: t} de lo que ya tiene guardado y recibe solo lo que cambió */
  if (b.a === "sync") return send(res, 200, await fullData(u, b.have && typeof b.have === "object" ? b.have : {}));
  /* contraseña restablecida: hasta que la cambie no puede guardar nada */
  try { if (JSON.parse((await q("select v from meta where k='mustpw'")).rows[0]?.v || "[]").includes(u.n)) return send(res, 403, { error: "perm", msg: "Primero cambiá tu contraseña" }); } catch { /* */ }
  if (isBoardKey(bk)) await loadBoards();
  let why = canWrite(u, k);
  /* galería: six, administración y quienes estén habilitados en Administración › Galería */
  if (!why && bk === "lspdt.galeria" && !isSix(u) && !u.admin) { let E = []; try { E = JSON.parse((await q("select v from kv where k=$1", [k.replace(/galeria$/, "galEditors")])).rows[0]?.v || "[]"); } catch { /* */ }
    if (!E.includes(u.n) && !(u.dept && (u.l || 0) >= 10)) why = "Solo six, Jefatura y quienes estén habilitados pueden editar la galería"; }
  /* listas con visibilidad por registro: cada uno crea, cambia y borra solo lo que le corresponde */
  if (!why && isXList(k) && typeof b.v === "string") {
    const curV = (await q("select v from kv where k=$1", [k])).rows[0]?.v ?? null;
    let cal = false;
    if (bk === "lspdt.xcal") { const d = u.dept || "lspd", ak = d === "lspd" ? "lspdt.calevAcc" : `lspdt.${d}.calevAcc`;
      let A = []; try { A = JSON.parse((await q("select v from kv where k=$1", [ak])).rows[0]?.v || "[]"); } catch { /* */ }
      cal = (u.l || 0) >= 10 || (!u.dept && !!u.admin) || (Array.isArray(A) && A.includes(u.n)); }
    why = xCheck(k, u, curV, b.v, typeof b.base === "string" ? b.base : null, { cal });
  }
  /* divisiones del LSSD y la SAHP: solo Jefatura nombra o retira Coordinadores y Subcoordinadores, y decide qué puede hacer cada subcoordinador */
  if (!why && u.dept && (u.l || 0) < 10 && !isSix(u) && typeof b.v === "string" && /^lspdt\.(groster|divacc)\.[a-z0-9-]+$/.test(bk) && keyDept(k) === u.dept) {
    const js = v => { try { return JSON.parse(v || "null"); } catch { return null; } }, cur = js((await q("select v from kv where k=$1", [k])).rows[0]?.v) || {}, nv = js(b.v) || {};
    if (bk.startsWith("lspdt.groster.")) { const CO = ["coord", "subcoord"];
      for (const n of new Set([...Object.keys(cur), ...Object.keys(nv)])) if (cur[n] !== nv[n] && (CO.includes(cur[n]) || CO.includes(nv[n]))) { why = "Solo Jefatura nombra o retira Coordinadores y Subcoordinadores"; break; } }
    else if (JSON.stringify(cur.sub || []) !== JSON.stringify(nv.sub || [])) why = "Solo Jefatura decide qué puede hacer el subcoordinador";
  }
  /* edición de agentes del LSSD y la SAHP: permisos por rango y por campo (ver agxCheck) */
  if (!why && bk === "lspdt.agx") why = typeof b.v === "string" ? agxCheck(u, k, (await q("select v from kv where k=$1", [k])).rows[0]?.v ?? null, b.v) : "Valor inválido";
  /* traslado a otro departamento o expulsión: Capitanía, Jefatura, administración o six. No se borra nada del agente: sale del roster de su
     departamento (queda registrado en lspdt.bajas con quién, cuándo y por qué) y, si es traslado, entra al otro como alta por traslado */
  if (b.xfer && typeof b.xfer === "object") {
    /* origen: el departamento de la sesión; six y la administración general pueden operar sobre cualquiera (el que tengan abierto) */
    const x = b.xfer, D3 = ["lspd", "lssd", "sahp"], from = (isSix(u) || (u.admin && !u.dept)) && D3.includes(x.from) ? x.from : u.dept || "lspd", to = ["lspd", "lssd", "sahp"].includes(x.to) ? x.to : "", op = x.op === "xfer" ? "xfer" : "out";
    if (!isSix(u) && !u.admin && !u.dadm && (u.l || 0) < 8) return send(res, 403, { msg: "Solo Capitanía, Jefatura o la administración" });
    const n = String(x.n || "").trim(), motivo = String(x.motivo || "").trim().slice(0, 500), ts = Date.now();
    if (!n || (op === "xfer" && (!to || to === from)) || (op === "out" && motivo.length < 5)) return send(res, 400, { msg: op === "out" ? "Escribí el motivo de la expulsión" : "Elegí a qué departamento" });
    const DN = { lspd: "LSPD", lssd: "LSSD", sahp: "SAHP" }, nrm = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const put = async (c, K, val) => { const prev = (await c.query("select v, by, at from kv where k=$1", [K])).rows[0];
      await c.query("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by, at=excluded.at", [K, val, u.n, ts]);
      await keepVersion(c, K, val, u.n, prev ? { v: prev.v, by: prev.by, at: prev.at } : null); };
    const r = await tx(async c => {
      for (const K of ["lspdt.roster", "lspdt.lssd.agx", "lspdt.sahp.agx", "lspdt.bajas", "xfer:divs"]) await c.query("select pg_advisory_xact_lock(hashtext($1))", [K]);
      let ag = null;
      if (from === "lspd") {
        const raw = (await c.query("select v from kv where k='lspdt.roster'")).rows[0]?.v, L = parseRoster(raw).list, i = L.findIndex(a => nrm(a.n) === nrm(n));
        if (i < 0) return { err: "No está en el roster del LSPD" }; ag = L[i];
        await put(c, "lspdt.roster", JSON.stringify(L.filter((_, j) => j !== i)));
      } else {
        const K = `lspdt.${from}.agx`, raw = (await c.query("select v from kv where k=$1", [`lspdt.${from}.roster`])).rows[0]?.v;
        let O = {}; try { O = JSON.parse((await c.query("select v from kv where k=$1", [K])).rows[0]?.v || "{}") || {}; } catch { /* */ }
        const L = deptList(raw, from, JSON.stringify(O)); ag = L.find(a => nrm(a.n) === nrm(n)); if (!ag) return { err: `No está en el roster del ${DN[from]}` };
        const k0 = ag.n0 || ag.n, e = O[k0] || {};
        if (e.add) delete e.add; else { const row = deptList(raw, from, null).find(a => a.n === k0); e.f = { ...(e.f || {}), e: [String(row?.e ?? ""), op === "xfer" ? `Trasladado al ${DN[to]}` : "Expulsado"] }; }
        e.log = [...(e.log || []), { t: ts, por: u.n, pr: u.r || "", c: [op === "xfer" ? `Trasladado al ${DN[to]}` : `Expulsado: ${motivo}`] }].slice(-50);
        O[k0] = e; await put(c, K, JSON.stringify(O));
      }
      if (op === "xfer") {
        const rk = String(x.r || "").slice(0, 60), p = String(x.p || "").replace(/\D/g, "").slice(0, 6);
        if (to === "lspd") {
          const raw = (await c.query("select v from kv where k='lspdt.roster'")).rows[0]?.v, L = parseRoster(raw).list;
          if (!L.some(a => nrm(a.n) === nrm(ag.n))) await put(c, "lspdt.roster", JSON.stringify([...L, { n: ag.n, p, r: rk || "Police Officer I", e: "Activo", c: new Date(ts).toISOString().slice(0, 10), d: ag.d || "", di: ag.di || "", src: DN[from], tr: "xfer-" + ts }]));
        } else {
          const K = `lspdt.${to}.agx`; let O = {}; try { O = JSON.parse((await c.query("select v from kv where k=$1", [K])).rows[0]?.v || "{}") || {}; } catch { /* */ }
          O[ag.n] = { ...(O[ag.n] || {}), add: { n: ag.n, r: rk || (to === "lssd" ? "Deputy Sheriff" : "Officer"), p, e: "Activo", u: ag.u || ag.d || nrm(ag.n).replace(/[^a-z0-9]/g, ""), d: ag.d || "", di: ag.di || "", src: DN[from], tr: "xfer-" + ts } };
          await put(c, K, JSON.stringify(O));
        }
      }
      /* el expediente viaja con el agente: lo de su departamento anterior se suma al del nuevo, marcado de dónde viene */
      if (op === "xfer") { const sl = nrm(ag.n).replace(/[^a-z0-9]/g, ""), ek = d => (d === "lspd" ? `lspdt.exp.${sl}` : `lspdt.${d}.exp.${sl}`);
        let A = null, Z = { e: [] }; try { A = JSON.parse((await c.query("select v from kv where k=$1", [ek(from)])).rows[0]?.v || "null"); } catch { /* */ }
        try { Z = JSON.parse((await c.query("select v from kv where k=$1", [ek(to)])).rows[0]?.v || "null") || { e: [] }; } catch { /* */ }
        if (A && Array.isArray(A.e) && A.e.length) { const ids = new Set((Z.e || []).map(y => y.id)), add = A.e.filter(y => y && typeof y === "object").map(y => ({ ...y, id: `${from}-${y.id}`, prev: DN[from] })).filter(y => !ids.has(y.id));
          if (add.length) await put(c, ek(to), JSON.stringify({ ...Z, e: [...add, ...(Z.e || [])] })); } }
      let B = []; try { B = JSON.parse((await c.query("select v from kv where k='lspdt.bajas'")).rows[0]?.v || "[]"); } catch { /* */ }
      await put(c, "lspdt.bajas", JSON.stringify([{ t: ts, n: ag.n, r: ag.r || "", p: ag.p || "", de: DN[from], tipo: op, a: op === "xfer" ? DN[to] : "", motivo, por: u.n }, ...(Array.isArray(B) ? B : [])].slice(0, 500)));
      /* sale también de las divisiones, callsigns y reservas de su departamento anterior */
      const divs = await purgeDivs(c, put, [[from, ag.n]]);
      return { ok: 1, n: ag.n, r: ag.r || "", p: ag.p || "", divs: divs.length };
    });
    if (r.err) return send(res, 404, { msg: r.err });
    invalidate();
    await audit(u.n, op === "xfer" ? `trasladó al ${DN[to]}` : "expulsó", "agentes", `${r.n} (${DN[from]})${motivo ? " · " + motivo : ""}`, clientIp(req));
    /* Administración › Logs: «nombre · rango · placa · qué pasó» */
    await audit(u.n, ROSTER_OUT, from === "lspd" ? "lspdt.roster" : `lspdt.${from}.agx`, [r.n, r.r || "—", r.p ? "#" + String(r.p).replace(/\D/g, "") : "sin placa", op === "xfer" ? `Traslado ${DN[from]} → ${DN[to]}` : `Expulsado del ${DN[from]}${motivo ? ": " + motivo.slice(0, 120) : ""}`].join(" · "), clientIp(req));
    return send(res, 200, r);
  }
  /* OIS remitido a la FID: cualquiera que pueda cargar OIS abre (o actualiza) el caso en la PSB, sin tocar el resto de los expedientes */
  if (b.oisFid && typeof b.oisFid === "object") {
    if (canWrite(u, "lspdt.ois")) return send(res, 403, { msg: "No podés cargar procedimientos OIS" });
    const o = b.oisFid, s = x => String(x ?? "").slice(0, 200), no = s(o.no), m = /^OIS-(\d{2})-(\d+)$/.exec(no);
    if (!m || !s(o.of)) return send(res, 400, { msg: "Faltan datos del OIS" });
    const K = "lspdt.psbCases", now = Date.now(), txt = String(o.txt || "").slice(0, 20000);
    const r = await tx(async c => {
      await c.query("select pg_advisory_xact_lock(hashtext($1))", [K]);
      let L = []; try { L = JSON.parse((await c.query("select v from kv where k=$1", [K])).rows[0]?.v || "[]"); } catch { /* */ }
      const cf = `CF-${m[1]}-OIS${m[2]}`, i = L.findIndex(x => x.ois === no), doc = { t: "ois", txt, ts: now, by: u.n };
      if (o.check && i >= 0) return { cf: L[i].cf, nuevo: false, ya: true };
      const hecho = `Uso de la fuerza con arma de fuego (OIS ${no})${o.lugar ? " en " + s(o.lugar) : ""}${o.fecha ? ", el " + s(o.fecha).split("-").reverse().join("/") : ""}${o.hora ? " a las " + s(o.hora) : ""}. Sargento a cargo: ${s(o.sgt)}.`;
      const cs = i >= 0 ? { ...L[i], ag: s(o.of), upd: now, docs: [...(L[i].docs || []).filter(d => d.t !== "ois"), doc] }
        : { id: crypto.randomBytes(6).toString("hex"), cf, ag: s(o.of), dv: "FID", by: u.n, ts: now, upd: now, concl: "", st: "abierto", ois: no, docs: [doc], px: { cA: m[1], cB: "OIS" + m[2], ag: s(o.of), dv: "FID", hecho } };
      L = i >= 0 ? L.map((x, j) => (j === i ? cs : x)) : [...L, cs];
      await c.query("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by, at=excluded.at", [K, JSON.stringify(L), u.n, now]);
      return { cf, nuevo: i < 0 };
    });
    if (!r.ya) await audit(u.n, r.nuevo ? "remitió a la FID" : "actualizó en la FID", "lspdt.psbCases", `${no} · ${r.cf} · oficial ${s(o.of)}`, clientIp(req));
    return send(res, 200, r);
  }
  if (why === PSB_DENY) { // miembros de la PSB definidos en el panel de administración
    try { const r = await q("select v from kv where k='lspdt.ui'"); const l = JSON.parse(r.rows[0].v).psb; if (Array.isArray(l) && l.includes(u.n)) why = null; } catch {}
  }
  /* calendario: quien creó un evento (o figura como creador) lo puede borrar aunque no sea de la coordinación */
  if (why && /^lspdt\.(drec\.[a-z0-9]+\.cal|calpub)$/.test(bk) && keyDept(k) === (u.dept || "lspd") && typeof b.v === "string") {
    try {
      const cur = JSON.parse((await q("select v from kv where k=$1", [k])).rows[0]?.v || "[]"), nv = JSON.parse(b.v), ids = new Set(nv.map(x => x.id));
      const gone = cur.filter(x => !ids.has(x.id)), same = nv.every(x => { const c = cur.find(y => y.id === x.id); return c && JSON.stringify(c) === JSON.stringify(x); });
      if (same && gone.length && gone.every(x => x.by === u.n || x.cre === u.n)) why = null;
    } catch { /* valor raro: queda el permiso normal */ }
  }
  if (why) return send(res, 403, { error: "perm", msg: why });
  if (typeof b.url === "string") { // imagen por URL: el servidor la descarga y la guarda (los enlaces de Discord vencen)
    if (!IMG_KEY.test(bk)) return send(res, 400, { msg: "Esa clave no admite imágenes" });
    b.v = await downloadImg(b.url); b.base = null;
  }
  if (typeof b.from === "string") { // usar una imagen ya guardada (galería)
    if (!IMG_KEY.test(bk)) return send(res, 400, { msg: "Esa clave no admite imágenes" });
    const r = (await q("select v from kv where k=$1", [b.from])).rows[0];
    if (!r || !r.v || !r.v.startsWith("data:")) return send(res, 404, { msg: "No se encontró la imagen" });
    b.v = r.v; b.base = null;
  }
  const del = !!b.del;
  const mine = del ? null : (typeof b.v === "string" ? b.v : null);
  if (!del && mine === null) return send(res, 400, { msg: "Falta el valor" });
  /* borrar algo importante (la clave entera, vaciarla o sacarle la mitad de golpe) pide un código de autodestrucción */
  if (typeof bk === "string" && isDestructive(bk, true, "x", null)) {
    const cur0 = (await q("select v from kv where k=$1", [k])).rows[0]?.v ?? null;
    if (isDestructive(bk, del, cur0, mine) && !(await sdUnlocked(tokenHash(sessionToken(req))))) {
      await audit(u.n, "intentó borrar sin código", bk, "", clientIp(req));
      return send(res, 428, { need: "sd", msg: "Eso borra información importante: hace falta un código de autodestrucción" });
    }
  }
  if (mine && mine.length > 4.4e6) return send(res, 413, { msg: "El archivo es demasiado pesado" });

  const out = await tx(async c => {
    // primero el bloqueo y después la lectura: en la misma consulta se leería un valor viejo
    await c.query("select pg_advisory_xact_lock(hashtext($1))", [k]);
    /* si lo que el navegador tenía (base) es igual a lo guardado, no hace falta traer el valor de la base: se compara la huella */
    const cur = (await c.query("select t, by, at, md5(v) as h, v is null as nul from kv where k=$1", [k])).rows[0] || { v: null, t: null };
    if (cur.t != null) cur.v = cur.nul ? null : typeof b.base === "string" && crypto.createHash("md5").update(b.base).digest("hex") === cur.h ? b.base
      : (await c.query("select v from kv where k=$1", [k])).rows[0]?.v ?? null;
    const exists = cur.t != null, curV = cur.v;
    let v = mine;
    if (!del && curV != null && !mine.startsWith("data:")) v = mergeText(typeof b.base === "string" ? b.base : null, mine, curV);
    if (exists && v === curV) return { v, t: +cur.t, same: 1 };
    // historial: la imagen de la terminal que se reemplaza o quita queda guardada en la galería
    if (ADMIN_KEY.test(bk) && !bk.startsWith("lspdt.lib.") && curV && curV.startsWith("data:"))
      await c.query("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do nothing", ["lspdt.lib.h" + Date.now().toString(36), curV, u.n, Date.now()]);
    const t = (await c.query("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by, at=excluded.at returning t", [k, v, u.n, Date.now()])).rows[0].t;
    if (!del && !HIST_SKIP.test(k) && !v.startsWith("data:")) await keepVersion(c, k, v, u.n, exists ? { v: curV, by: cur.by, at: cur.at } : null);
    return { v, t: +t, old: curV, exists };
  });
  const sum = del ? diffSum(out.old, null) : diffSum(out.exists ? out.old : null, out.v);
  if (!out.same && !/^Cambió: (seen|t|ts|last)$/.test(sum)) await audit(u.n, del ? "borró" : out.exists ? "editó" : "creó", k, sum, clientIp(req));
  if (k === "lspdt.roster" && !del && !out.same && out.exists) await auditRoster(u.n, out.old, out.v, clientIp(req));
  if (bk === "lspdt.agx" && !del && !out.same) await settle(u.n, clientIp(req)).catch(() => {});
  if (bk === "lspdt.roster" || k === "lspdt.ui" || /^lspdt\.(asd|k9|psb|md)Roster$|^lspdt\.(groster|groles|divacc)\./.test(bk)) invalidate(); // cambió el rango o las divisiones de alguien
  const r = { t: out.t };
  if (out.v !== mine || b.url || b.from) r.v = out.v && out.v.startsWith("data:") ? imgUrl(k, out.t) : shapeVal(k, out.v, u); // devuelve el resultado solo si cambió por la fusión (sin lo que no le corresponde ver)
  return send(res, 200, r);
});
