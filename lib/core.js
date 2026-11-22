import { accDept, deptList, deptOfAcc, deptUser, XLEVEL } from "./lssd.js";
import { divRead, divWrite, genInfo } from "./divs.js";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { q } from "./db.js";

/* ---------- HTTP ---------- */
export function send(res, code, obj, headers = {}) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(obj));
}
export async function body(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body || "{}"); } catch { return {}; } }
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 6 << 20) throw Object.assign(new Error("too big"), { status: 413 }); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
}
export function query(req) {
  if (req.query) return req.query;
  const u = new URL(req.url, "http://x"); return Object.fromEntries(u.searchParams);
}
/* pedidos que cambian datos: solo desde la propia terminal (defensa extra contra CSRF, además de SameSite) */
function sameOrigin(req) {
  const o = req.headers.origin; if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}
export const clientIp = req => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim().slice(0, 64);
export function wrap(fn) {
  return async (req, res) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return send(res, 403, { error: "origin", msg: "Origen no permitido" });
      await fn(req, res); }
    catch (e) {
      if (e.code === "NO_DB") return send(res, 503, { error: "nodb", msg: "Falta conectar la base de datos en Vercel (Storage → Neon/Postgres)." });
      /* Neon sin cuota del mes (plan gratis): la base queda suspendida hasta el mes siguiente o hasta pasarla a un plan pago */
      if (/exceeded the (data transfer |compute time )?quota/i.test(String(e && e.message))) return send(res, 503, { error: "quota", msg: "La base de datos llegó al límite gratis del mes (Neon). Avisale a six: hay que pasarla a un plan pago o esperar al mes que viene." });
      console.error(e);
      send(res, e.status || 500, { error: "server", msg: e.status ? e.message : "Error del servidor" });
    }
  };
}

/* ---------- Rangos ---------- */
export const LEVEL = { "Chief of Police": 13, "Assistant Chief": 12, "Deputy Chief": 11, "Commander": 10, "Captain": 9, "Lieutenant": 8,
  "Sergeant II": 7, "Sergeant I": 6, "Detective III": 5.5, "Detective II": 5, "Detective I": 4.5,
  "Police Officer III+": 4, "Police Officer III": 3, "Police Officer II": 2, "Police Officer I": 1, "Administrativo": 0 };
export const MIN_ACC = 6, CAP = 8;
export const PSB_DEF = ["Ryan Westbrook", "Evelyn Molina", "Liam Campbell"];
export const RTD_DEF = ["Charles Jhonson Smith", "Daniel López", "Derek McGarrett", "Elioth Smith", "Evelyn Molina", "Kai Jeon-Soo", "Kane Anderson", "Khalan Smith", "Lara Calloway",
  "Liam Campbell", "Madison Pierce", "Madison Wells", "Matthew Coleman", "Miles Campbell", "Ryan Westbrook", "William Weston", "Yooa Baek-Harrington"];
export function rtdList(uiRaw) { try { const l = JSON.parse(uiRaw).rtd; if (Array.isArray(l)) return l; } catch {} return RTD_DEF; }
// entran los de mando y los miembros de la RTD (FTO)
export const ASD_DEF = { "Ryan Westbrook": ["coord"], "Kai Jeon-Soo": ["coord", "piloto"], "Evelyn Molina": ["sup", "tfo", "piloto"], "Lewis Clarkson": ["sup", "piloto"],
  "Liam Campbell": ["sup", "piloto"], "Miles Campbell": ["sup", "piloto"], "Yooa Baek-Harrington": ["tfo", "piloto"], "Khalan Smith": ["piloto"], "Lara Calloway": ["piloto"],
  "Leonardo Nascimento": ["piloto"], "Madison Lopez": ["piloto"], "Madison Pierce": ["piloto"], "Tariq Okafor": ["piloto"], "Tyler Walker": ["piloto"], "William Weston": ["piloto"],
  "Antonio Santos": ["asp"], "Darwin Ford": ["asp"] };
export const K9_DEF = { "Kai Jeon-Soo": ["coord"], "Yooa Baek-Harrington": ["subcoord"], "Charles Jhonson Smith": ["inst"], "Liam Campbell": ["inst"], "Evelyn Molina": ["handler"],
  "Olivia Molina": ["prac"], "Logan Barrett": ["prac"], "Morvanna Montenegro": ["prac"], "Leonardo Nascimento": ["prac"], "Violet Faith": ["prac"], "Ethan Roggers": ["prac"],
  "Darwin Ford": ["prac"], "Naia Bishop": ["prac"], "Noah Smith": ["prac"], "Ryan Sullivan": ["prac"] };
export function k9Map(raw) { try { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return (o._v || 0) < 2 ? { ...o, ...K9_DEF } : o; } catch {} return K9_DEF; }
export const PSB_ROSTER_DEF = { "Madison Wells": ["co", "iad", "fid", "sod"], "Vega Chambers": ["co", "iad", "fid", "sod"], "Derek McGarrett": ["inv", "iad", "fid"],
  "Ryan Westbrook": ["jinv", "iad", "fid", "sod"], "Liam Campbell": ["jinv", "iad", "fid", "sod"], "Evelyn Molina": ["jinv", "iad", "fid", "sod"] };
export function psbMap(raw) { try { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return (o._v || 0) < 1 ? { ...o, ...PSB_ROSTER_DEF } : o; } catch {} return PSB_ROSTER_DEF; }
const MD_NAMES = ["Derek McGarrett", "Evelyn Molina", "Ryan Westbrook", "Liam Campbell", "Tariq Okafor", "Lloyd Burnett", "Charles Jhonson Smith", "Antonio Santos", "Kane Anderson", "Elioth Smith", "Hailey Deacon",
  "James West", "Logan Barrett", "Matthew Coleman", "Rodney Deacon", "Clancy Skinner", "Kai Jeon-Soo", "Khalan Smith", "Lara Calloway", "William Weston", "Yooa Baek-Harrington"];
const MD_DEF = { ...Object.fromEntries(MD_NAMES.map(n => [n, ["op"]])), "Derek McGarrett": ["co"], "Evelyn Molina": ["aco"] };
export function mdMap(raw) { try { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return (o._v || 0) < 2 ? { ...o, ...MD_DEF } : o; } catch {} return MD_DEF; }
export function asdMap(raw) { try { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return o; } catch {} return ASD_DEF; }
// entran: mando, miembros de la RTD y del ASD, y quienes un administrador aprobó
export const canEnter = (ag, uiRaw, approvedRaw, asdRaw, k9Raw, mdRaw) => !!ag && (lvl(ag.r) >= MIN_ACC || rtdList(uiRaw).includes(ag.n) || !!asdMap(asdRaw)[ag.n] || !!k9Map(k9Raw)[ag.n] || !!mdMap(mdRaw)[ag.n] || parseList(approvedRaw).includes(ag.n));
export const PSB_DENY = "Solo los miembros de la PSB pueden editar el catálogo de faltas";
// Dueños: siempre administradores y los únicos que dan o quitan administrador. Variable ADMINS en Vercel (nombres separados por coma).
export const OWNERS = (process.env.ADMINS || "Ryan Westbrook").split(",").map(s => s.trim()).filter(Boolean);
export const ADMINS = OWNERS; // compatibilidad

let DEF = null;
export function defRoster() {
  if (!DEF) DEF = JSON.parse(readFileSync(new URL("./roster.json", import.meta.url), "utf8"));
  return DEF;
}
let RAW = null, PARSED = null;
export function parseRoster(raw) {
  if (raw && raw === RAW) return PARSED;
  let out = { list: defRoster(), custom: false };
  if (raw) { try { const a = JSON.parse(raw); if (Array.isArray(a) && a.length) out = { list: a, custom: true }; } catch {} }
  RAW = raw; PARSED = out; return out;
}
export async function roster() {
  const r = await q("select v from kv where k='lspdt.roster'");
  return parseRoster(r.rows[0] && r.rows[0].v);
}
export function parseList(raw) { try { const a = JSON.parse(raw || "[]"); return Array.isArray(a) ? a.filter(x => typeof x === "string") : []; } catch { return []; } }
export async function dbAdmins() { return parseList((await q("select v from meta where k='admins'")).rows[0]?.v); }
export const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const emailOf = n => norm(n).replace(/[^a-z0-9]/g, "") + "@sanandreas.eu";
export const lvl = r => LEVEL[r] ?? XLEVEL[r] ?? 0;
export function findIn(list, n) { const s = norm(String(n || "").trim()); return list.find(a => norm(a.n) === s) || null; }

/* ---------- Contraseñas ----------
   scrypt con sal aleatoria. s2 (N=2^15) es el formato actual; las s1 (N=2^14) se vuelven a cifrar con s2 al iniciar sesión. */
const SCRYPT = { s1: { N: 16384, r: 8, p: 1 }, s2: { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } };
export function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 32, SCRYPT.s2);
  return "s2$" + salt.toString("hex") + "$" + h.toString("hex");
}
export function checkPw(pw, stored) {
  const [v, s, h] = String(stored || "").split("$");
  if (!SCRYPT[v] || !s || !h || String(pw).length > 200) return false;
  const got = crypto.scryptSync(String(pw), Buffer.from(s, "hex"), 32, SCRYPT[v]);
  const want = Buffer.from(h, "hex");
  return want.length === got.length && crypto.timingSafeEqual(got, want);
}
export const needsRehash = stored => !String(stored || "").startsWith("s2$");
export const randomPw = () => crypto.randomBytes(9).toString("base64url");
/* comparación de textos en tiempo constante (códigos de registro) */
export const safeEq = (a, b) => { const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };

/* ---------- Intentos de ingreso fallidos ----------
   Por cuenta: 5 errores en 15 min la bloquean 15 min. Por IP: 20 errores. Se guarda en meta (fail:<clave>) para que valga entre funciones. */
const FAIL_WIN = 15 * 60e3, FAIL_MAX = { u: 5, ip: 20 };
const failKeys = (u, ip) => [["u", "fail:u:" + norm(u)], ["ip", "fail:ip:" + ip]].filter(([, k]) => !k.endsWith(":"));
export async function loginBlocked(u, ip) {
  const K = failKeys(u, ip), rows = (await q("select k,v from meta where k = any($1)", [K.map(x => x[1])])).rows, now = Date.now();
  for (const r of rows) { let o; try { o = JSON.parse(r.v); } catch { continue; } const kind = r.k.startsWith("fail:u:") ? "u" : "ip";
    if (o.n >= FAIL_MAX[kind] && now - o.t < FAIL_WIN) return Math.ceil((FAIL_WIN - (now - o.t)) / 60e3); }
  return 0;
}
export async function loginFail(u, ip) {
  const now = Date.now();
  for (const [, k] of failKeys(u, ip)) {
    const r = (await q("select v from meta where k=$1", [k])).rows[0]; let o = { n: 0, t: now }; try { if (r) o = JSON.parse(r.v); } catch {}
    if (now - o.t >= FAIL_WIN) o = { n: 0, t: now };
    o.n++; o.t = now;
    await q("insert into meta(k,v) values($1,$2) on conflict(k) do update set v=excluded.v", [k, JSON.stringify(o)]);
  }
}
export const loginOk = u => q("delete from meta where k=$1", ["fail:u:" + norm(u)]).catch(() => {});

/* ---------- Sesiones ---------- */
const COOKIE = "lspd_s";
const sha = t => crypto.createHash("sha256").update(t).digest("hex");
export function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
}
export async function newSession(res, name, keep) {
  const tok = crypto.randomBytes(32).toString("hex");
  const days = keep ? 30 : 1;
  await q("insert into sessions(token,name,exp) values($1,$2,$3)", [sha(tok), name, Date.now() + days * 864e5]);
  q("delete from sessions where exp<$1", [Date.now()]).catch(() => {});
  res.setHeader("Set-Cookie", `${COOKIE}=${tok}; Path=/; HttpOnly; Secure; SameSite=Lax${keep ? "; Max-Age=" + days * 86400 : ""}`);
}
export const sessionToken = req => cookies(req)[COOKIE] || "";
export const tokenHash = t => sha(t);
export async function endSession(req, res) {
  const t = cookies(req)[COOKIE];
  if (t) { SESS.delete(t); await q("delete from sessions where token=$1", [sha(t)]); }
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
/* Caché corta de sesiones: evita consultar la base en cada sincronización (cada pocos segundos por usuario). */
/* Sesiones y «mundo» (rosters, configuración, divisiones) cacheados en la instancia: antes se releían de la base en cada pedido
   cada 20 s por usuario y eso gastaba la transferencia del mes de Neon. Ahora la sesión se valida cada 2 min y el mundo
   solo se vuelve a leer cuando cambió alguna de sus claves (una consulta chiquita de fechas) o cada 5 min (lo de meta). */
const SESS = new Map(); const SESS_MS = 120000;
const WORLD_KEYS = ["lspdt.briefOn", "lspdt.lssd.briefOn", "lspdt.sahp.briefOn", "lspdt.ilgAcc", "lspdt.lssd.agx", "lspdt.sahp.agx", "lspdt.roster", "lspdt.ui", "lspdt.areaAcc", "lspdt.lssd.areaAcc", "lspdt.sahp.areaAcc", "lspdt.asdRoster", "lspdt.k9Roster", "lspdt.psbRoster", "lspdt.mdRoster", "lspdt.lssd.roster", "lspdt.sahp.roster"];
const WORLD_RE = "^lspdt\\.((lssd|sahp)\\.)?(groster|groles|divacc)\\.";
let WORLD = null; /* { R, m, full, chk, ver } */
export function invalidate() { SESS.clear(); if (WORLD) WORLD.chk = 0; }
async function world() {
  const now = Date.now();
  if (WORLD && now - WORLD.chk < 10000) return WORLD;
  const x = (await q("select coalesce(max(t),0) as m, count(*) as c from kv where k = any($1) or k ~ $2", [WORLD_KEYS, WORLD_RE])).rows[0];
  const sig = `${x.m}:${x.c}`; /* cambia si se tocó o se borró alguna de esas claves */
  if (WORLD && WORLD.sig === sig && now - WORLD.full < 300000) { WORLD.chk = now; return WORLD; }
  const r = (await q(`select (select v from kv where k='lspdt.roster') as roster, (select v from meta where k='admins') as admins, (select v from kv where k='lspdt.ui') as ui,
    (select v from meta where k='approved') as approved, (select v from meta where k='anita') as anita, (select v from kv where k='lspdt.asdRoster') as asd,
    (select v from kv where k='lspdt.k9Roster') as k9, (select v from kv where k='lspdt.psbRoster') as psb, (select v from kv where k='lspdt.mdRoster') as md,
    (select v from kv where k='lspdt.lssd.roster') as lssd, (select v from kv where k='lspdt.areaAcc') as areaacc, (select v from kv where k='lspdt.lssd.areaAcc') as areaacc_lssd, (select v from kv where k='lspdt.sahp.areaAcc') as areaacc_sahp, (select v from kv where k='lspdt.sahp.roster') as sahp, (select v from kv where k='lspdt.lssd.agx') as agx_lssd, (select v from kv where k='lspdt.briefOn') as brief_lspd, (select v from kv where k='lspdt.lssd.briefOn') as brief_lssd, (select v from kv where k='lspdt.sahp.briefOn') as brief_sahp, (select v from kv where k='lspdt.ilgAcc') as ilgacc, (select v from kv where k='lspdt.sahp.agx') as agx_sahp,
    (select json_agg(json_build_object('k', k, 'v', v)) from kv where k ~ $1) as gen`, [WORLD_RE])).rows[0];
  WORLD = { R: r, sig, full: now, chk: now, ver: (WORLD?.ver || 0) + 1 };
  return WORLD;
}
/* Devuelve {n, r, l, admin, owner} del usuario con sesión válida y rango suficiente, o null. */
/* acceso dado desde Administración a Supervisores, Capitanía o Jefatura: cuenta como ese rango para lo que piden esas áreas */
function boostArea(u, raw) { let A = {}; try { A = JSON.parse(raw || "{}") || {}; } catch { /* */ }
  for (const [a, l] of [["sup", 6], ["cap", 8], ["jef", 10]]) if (Array.isArray(A[a]) && A[a].includes(u.n)) u.l = Math.max(u.l || 0, l); }
export async function current(req) {
  const t = cookies(req)[COOKIE];
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  let c = SESS.get(t);
  if (!c || c.until <= Date.now()) {
    const s = await q("select s.name from sessions s join accounts a on a.name=s.name where s.token=$1 and s.exp>$2", [sha(t), Date.now()]);
    if (SESS.size > 2000) SESS.clear();
    c = { name: s.rows[0]?.name || null, until: Date.now() + SESS_MS, ver: -1, u: null }; SESS.set(t, c);
  }
  if (!c.name) return null;
  const W = await world();
  if (c.ver === W.ver) return c.u;
  const R0 = { name: c.name, ...W.R };
  let u = null;
  /* cuenta del LSSD: «lssd:usuario» → su fila del roster del Sheriff (solo ve lo del LSSD) */
  /* cuentas del LSSD y la SAHP: «depto:usuario/personaje» → su fila del roster de ese departamento; sus divisiones salen de lspdt.<depto>.groster.* */
  const D = R0 && accDept(R0.name);
  if (D) { const L = deptList(R0[D], D, R0["agx_" + D]), a = deptOfAcc(L, R0.name);
    if (a) { u = deptUser(a, R0.name, D); boostArea(u, R0["areaacc_" + D]); Object.assign(u, genInfo(a.n, (R0.gen || []).filter(r => r.k.startsWith(`lspdt.${D}.`)).map(r => ({ k: "lspdt." + r.k.slice(7 + D.length), v: r.v })), {})); } }
  else if (R0) {
    const n = R0.name, ag = findIn(parseRoster(R0.roster).list, n);
    const R = R0;
    if (canEnter(ag, R.ui, R.approved, R.asd, R.k9, R.md)) {
      const owner = OWNERS.includes(n), rtd = rtdList(R.ui).includes(n), asdR = asdMap(R.asd)[n] || [], k9R = k9Map(R.k9)[n] || [], psbR = psbMap(R.psb)[n] || [], mdR = mdMap(R.md)[n] || [];
      u = { n, r: ag.r, l: lvl(ag.r), owner, anita: !!R.anita && R.anita === n, rtd, asd: asdR.length > 0, asdCoord: asdR.includes("coord"), k9: Array.isArray(k9R) && k9R.length > 0, k9Coord: Array.isArray(k9R) && (k9R.includes("coord") || k9R.includes("subcoord")), psb: Array.isArray(psbR) && psbR.length > 0, psbCo: Array.isArray(psbR) && (psbR.includes("co") || psbR.includes("aco")), md: Array.isArray(mdR) && mdR.length > 0, mdCoord: Array.isArray(mdR) && (mdR.includes("co") || mdR.includes("aco")), mdMan: Array.isArray(mdR) && mdR.some(x => ["co", "aco", "oic", "tl", "inst", "instp"].includes(x)), lim: lvl(ag.r) < MIN_ACC, admin: owner || parseList(R0.admins).includes(n) };
      { let L = []; try { L = JSON.parse(R.ui || "{}").psb; } catch { /* */ } if (Array.isArray(L) && L.includes(n)) u.psb = true; }
      Object.assign(u, genInfo(n, (R.gen || []).filter(r => !/^lspdt\.(lssd|sahp)\./.test(r.k)), mdMap(R.md))); u.rtd = !!u.gm.rtd;
      /* acceso dado desde Administración a Supervisores, Capitanía o Jefatura: cuenta como ese rango para lo que piden esas áreas */
      boostArea(u, R.areaacc);
    }
  }
  /* Briefing: los oficiales solo lo ven si un Supervisor (o six) lo activó para Inicio · Gestión de ilícitos: six y quienes él suma */
  if (u) { u.briefOn = R0["brief_" + (u.dept || "lspd")] === "true"; u.ilg = isSix(u) || parseList(R0.ilgacc).some(x => x === u.n || (!!u.ooc && norm(x) === norm(u.ooc))); }
  c.u = u; c.ver = W.ver;
  return u;
}
export async function requireUser(req, res) {
  const u = await current(req);
  if (!u) { send(res, 401, { error: "auth", msg: "Tu sesión expiró. Volvé a iniciar sesión." }); return null; }
  return u;
}

/* ---------- Reglas por clave ---------- */
// Claves que viven solo en cada navegador (preferencias) o que maneja el servidor.
export const LOCAL_KEYS = /^lspdt\.(session|accounts|theme|frame|rankLang|seenVersion|area|sec\..*|agView|upd.*|iconpng|fix\..*|patrol|bg|recent|altFirma|altDraft|cursor|accent|crt|crtI|rtdDraft|dvc|psbCargo|infDraft)$/;
// Imagen de la terminal: solo administradores. Las públicas se ven también en la pantalla de ingreso.
export const ADMIN_KEY = /^lspdt\.(logo(\.(login|boot|header|hero|wm|lssd|sahp))?|fav|ui|img\.(hero|dcav|avatar|avatar_m|avatar_f|cover)|lib\.[a-z0-9]+|divlogo\..+|satd\.logo|bg\.(tablet|login|app)|ico\.[a-z0-9-]+)$/;
/* lo que se ve antes de iniciar sesión (ingreso y carga de cada departamento) */
const PUB_IMG = ["logo", "logo.login", "logo.boot", "logo.wm", "fav", "bg.tablet", "bg.login"];
export const PUBLIC_KEYS = [...PUB_IMG.map(x => "lspdt." + x), ...["lssd", "sahp"].flatMap(d => PUB_IMG.map(x => `lspdt.${d}.${x}`)), "lspdt.logo.lssd", "lspdt.logo.sahp", "lspdt.ui"];
export const IMG_KEY = /^lspdt\.(foto|cover|pfoto|divlogo|ico|lib|calban|portada|decorx)\.|^lspdt\.satd\.logo$|^lspdt\.(logo|fav|bg|img)(\.\w+)?$/;
/* apartado privado: solo lo ve y lo escribe su dueño (también se filtra al leer) */
/* orden fijo de las primeras cuentas (ID del perfil): six #1, Anita #2; el resto por fecha de registro */
export const ID_PIN = ["Ryan Westbrook", "Evelyn Molina"];
export const SIX_OWNER = "Ryan Westbrook", SIX_KEY = /^lspdt\.six\./, ANITA_KEY = /^lspdt\.anita\./;
export const isSix = u => !!u && u.n === SIX_OWNER;
/* espacios privados: lo de six solo lo ve six; lo de Anita solo la cuenta que six marcó como de Anita */
/* pizarras de mando (Pizarra, ámbito «alto»): solo Detectives y de Sargento II para arriba las ven y las editan */
const ALTO_KEY = /^lspdt\.(miro|boards\.alto|board\.alto\..+)$/;
const altoOk = u => !!u && (/^Detective/.test(u.r || "") || lvl(u.r) >= 7);
/* bloc de notas del perfil (lspdt.unote.<slug>): solo su dueño, ni six lo ve */
const NOTE_KEY = /^lspdt\.unote\.([a-z0-9]+)$/;
/* Gestión de ilícitos (lspdt.ilg.*: datos de la tablet, recompensas y bandas): solo six y quienes él suma en lspdt.ilgAcc */
const ILG_KEY = /^lspdt\.ilg\./;
/* briefing: Supervisores siempre; el resto solo si lo activaron para Inicio */
const briefOk = (k, u) => !/^lspdt\.((lssd|sahp)\.)?brief$/.test(k) || (!!u && (isSix(u) || !!u.admin || !!u.briefOn || (u.l || 0) >= (u.dept ? 7 : 6)));
const noteOk = (k, u) => { const m = NOTE_KEY.exec(k); return !m || (!!u && m[1] === norm(u.n || "").replace(/[^a-z0-9]/g, "")); };
export const privOk = (k, u) => noteOk(k, u) && (!ILG_KEY.test(k) || (!!u && !!u.ilg)) && (!SIX_KEY.test(k) || isSix(u)) && (!ANITA_KEY.test(k) || (!!u && !!u.anita)) && (!ALTO_KEY.test(k) || altoOk(u));
/* lo que se le manda a cada sesión: lo privado de six y Anita, y los datos de las divisiones a las que pertenece */
/* departamentos: cada uno tiene sus datos (LSPD: lspdt.*, LSSD: lspdt.lssd.*, SAHP: lspdt.sahp.*) con las mismas secciones y reglas.
   Lo compartido es igual para los tres: marca e imágenes, Legal, Pizarra, catálogo de robos y lo privado de six. six ve todo. */
/* perfiles (uprof, comentarios, visitas, seguidores y verificados): uno solo por persona para los tres departamentos */
export const SHARED_KEY = /^lspdt\.(ui|lib|six|anita|ilg|ilgAcc|penal|legacc|boards?|miro|robos|uprof|unote|ucom|uvis|ufolt?|uverif|xcal|decorx|clasic|satd)(\.|$)/;
const DEPT_RE = /^lspdt\.(lssd|sahp)\./;
export const keyDept = k => { const m = DEPT_RE.exec(k); return m ? m[1] : SHARED_KEY.test(k) ? "*" : "lspd"; };
/* la clave «como si fuera del LSPD»: con ella se aplican las mismas reglas en los tres departamentos */
export const baseKey = k => k.replace(DEPT_RE, "lspdt.");
export const deptOk = (k, u) => { if (!u) return false; const kd = keyDept(k); return kd === "*" || kd === (u.dept || "lspd") || isSix(u); };
/* expedientes personales (lspdt[.depto].exp.<agente>, y .fto para el feedback de los Master FTO): según el rango de quien mira y del agente.
   Deputies: Sargento para arriba · Sargentos y Tenientes: Capitanes y Jefatura · Capitanes: Jefatura · Jefatura: Jefatura (completo).
   Nadie abre su propio expediente, salvo Jefatura (y six). Los Master FTO solo escriben/leen el feedback FTO de quienes están por debajo de ellos. */
const EXP_KEY = /^lspdt\.exp\.([a-z0-9]+)(\.fto)?$/;
const slugN = s => norm(s).replace(/[^a-z0-9]/g, "");
const expNeed = t => (t <= 6 ? 7 : t < 9 ? 9 : 10);
/* Oficiales (Informes y procedimientos OIS): desde Oficial II (nivel 2; en la SAHP, Officer). six, la administración y los invitados con esa sección, siempre */
const OFI_K = /^lspdt\.(informes|ois)$/;
export const ofiOk = (k, u) => typeof k !== "string" || !OFI_K.test(baseKey(k)) || (!!u && (isSix(u) || !!u.admin || u.n === "Invitado" || (u.l || 0) >= ((u.dept || "lspd") === "sahp" ? 1 : 2)));
export function expOk(k, u) {
  const m = typeof k === "string" && EXP_KEY.exec(baseKey(k)); if (!m) return true;
  if (!u) return false; if (isSix(u)) return true;
  if ((u.l || 0) >= 10) return true; /* Jefatura: todos, también el propio */
  if (slugN(u.n) === m[1]) return false;
  const d = keyDept(k), W = (WORLD && WORLD.R) || {};
  const list = d === "lspd" ? parseRoster(W.roster).list : deptList(W[d], d, W["agx_" + d]), a = list.find(x => slugN(x.n) === m[1]);
  if (!a) return false;
  const t = d === "lspd" ? lvl(a.r) : XLEVEL[a.r] ?? 1;
  return (u.l || 0) >= expNeed(t) || (!!m[2] && (u.l || 0) >= 4 && t < 4);
}
/* ---------- listas con visibilidad por registro ----------
   Una sola clave con varios registros, pero cada sesión recibe solo los que le corresponden (se filtran al leer y se validan al escribir):
   · lspdt.boards.<ámbito> (Pizarra) y lspdt.xcal (eventos): del departamento que los creó (dp) y de los que invitó (deps).
   · lspdt[.depto].fbl (feedback del LSSD): como los expedientes, según el rango del agente; además quien lo escribió, Jefatura y la administración del departamento.
   · lspdt[.depto].uof (uso de la fuerza): Deputy → Sargento+, Sargento → Teniente+, Teniente/Capitán/Jefatura → Jefatura; con varios, manda el más alto. */
const XL_RE = /^lspdt\.(boards\.[a-z0-9]+|xcal|fbl|uof)$/;
export const isXList = k => typeof k === "string" && XL_RE.test(baseKey(k));
const udep = u => (u && u.dept) || "lspd";
const supMin = d => (d === "lspd" ? 6 : 7);
/* rango (nivel) de un agente en su departamento, con el roster vigente */
function agLvl(d, n) { const W = (WORLD && WORLD.R) || {}, s = slugN(n); if (!s) return 0;
  if (d === "lspd") { const a = parseRoster(W.roster).list.find(x => slugN(x.n) === s); return a ? lvl(a.r) : 0; }
  const a = deptList(W[d], d, W["agx_" + d]).find(x => slugN(x.n) === s); return a ? XLEVEL[a.r] ?? 1 : 0; }
/* departamento de una pizarra vieja (sin dp): el de quien la creó */
/* edición de agentes del LSSD y la SAHP (lspdt.<depto>.agx): Jefatura todo; Capitanía datos y rango de quien está por debajo (y solo hasta un rango menor al suyo);
   Supervisores solo estado, Discord y observaciones de quien está por debajo. Se controla acá, no solo en los botones. */
const AGX_SUP = ["e", "d", "di", "o"], AGX_CAP = ["n", "p", "r", "e", "i", "a", "d", "di", "o"];
export function agxCheck(u, k, curRaw, nvRaw) {
  const d = keyDept(k); if (d === "lspd") return "Clave no permitida";
  if (isSix(u) || (u.admin && !u.dept)) return null;
  if (u.dept !== d) return "Solo el propio departamento edita sus agentes";
  const L = u.l || 0; if (L >= 10 || u.dadm) return null;
  if (L < 7) return "Solo Supervisores, Capitanía y Jefatura editan agentes";
  const js = v => { try { const o = JSON.parse(v || "null"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch { return {}; } };
  const cur = js(curRaw), nv = js(nvRaw), ok = L >= 8 ? AGX_CAP : AGX_SUP, W = (WORLD && WORLD.R) || {}, list = deptList(W[d], d, W["agx_" + d]);
  for (const n of new Set([...Object.keys(cur), ...Object.keys(nv)])) {
    const a = cur[n] || {}, b = nv[n] || {}; if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (!nv[n]) return "No podés borrar el registro de un agente";
    const ag = list.find(x => (x.n0 || x.n) === n); if (!ag) return "Agente desconocido";
    if ((XLEVEL[ag.r] ?? 1) >= L) return "Solo podés editar agentes de un rango inferior al tuyo";
    const fa = a.f || {}, fb = b.f || {};
    for (const f of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
      if (JSON.stringify(fa[f]) === JSON.stringify(fb[f])) continue;
      if (!ok.includes(f)) return L >= 8 ? "Campo no permitido" : "Los Supervisores solo editan estado, Discord y observaciones";
      if (f === "r" && Array.isArray(fb.r) && (XLEVEL[fb.r[1]] ?? 99) >= L) return "Solo podés asignar rangos inferiores al tuyo";
    }
    if (L < 8 && JSON.stringify(a.h || []) !== JSON.stringify(b.h || [])) return "El historial de rangos lo cargan Capitanía y Jefatura";
    const la = a.log || [], lb = b.log || []; if (lb.length < la.length || la.some((x, i) => JSON.stringify(x) !== JSON.stringify(lb[i]))) return "El registro de cambios no se puede modificar";
  }
  return null;
}
function inferDp(by) { const W = (WORLD && WORLD.R) || {}, s = slugN(by); if (!s) return "lspd";
  if (parseRoster(W.roster).list.some(x => slugN(x.n) === s)) return "lspd";
  for (const d of ["lssd", "sahp"]) if (deptList(W[d], d, W["agx_" + d]).some(x => slugN(x.n) === s)) return d; return "lspd"; }
export const itemDp = x => (x && typeof x.dp === "string" && x.dp) || inferDp(x && x.by);
const uofNeed = t => (t < 7 ? 7 : t < 8 ? 8 : 10);
export function xVis(k, x, u) {
  if (!x || typeof x !== "object" || !u) return false; if (isSix(u)) return true;
  const b = baseKey(k), d = keyDept(k) === "*" ? null : keyDept(k);
  if (b.startsWith("lspdt.boards.") || b === "lspdt.xcal") { const dp = itemDp(x); return dp === udep(u) || (Array.isArray(x.deps) && x.deps.includes(udep(u))); }
  const me = slugN(u.n), l = u.l || 0;
  if (b === "lspdt.fbl") { if (u.dadm || l >= 10 || slugN(x.por) === me || slugN(x.rev) === me) return true; if (slugN(x.ag) === me) return false; return l >= expNeed(Math.max(agLvl(d, x.ag), Number(x.lv) || 0)); }
  if (b === "lspdt.uof") { if (l >= 10 || slugN(x.por) === me) return true; const A = Array.isArray(x.ags) ? x.ags : [];
    if (A.some(a => slugN(a && a.n) === me)) return false;
    const need = Math.max(7, ...A.map(a => uofNeed(Math.max(agLvl(d, a && a.n), XLEVEL[a && a.r] ?? LEVEL[a && a.r] ?? 0)))); return l >= need; }
  return true;
}
export function xShape(k, v, u) {
  if (v == null || !isXList(k) || isSix(u)) return v;
  try { const L = JSON.parse(v); return Array.isArray(L) ? JSON.stringify(L.filter(x => xVis(k, x, u))) : v; } catch { return v; }
}
/* qué puede hacer con cada registro al guardar (ctx: datos que se leen antes, como la lista de quienes cargan eventos) */
export function xCheck(k, u, curT, mineT, baseT, ctx = {}) {
  const P = t => { try { const a = JSON.parse(t || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
  const C = new Map(P(curT).filter(x => x && x.id).map(x => [x.id, x])), M = P(mineT), B = new Map(P(baseT).filter(x => x && x.id).map(x => [x.id, x]));
  const b = baseKey(k), six = isSix(u), l = u.l || 0, me = slugN(u.n), dep = udep(u), st = x => JSON.stringify(x);
  const own = x => itemDp(x) === dep, sup = x => own(x) && l >= supMin(dep);
  const R = b.startsWith("lspdt.boards.") ? { add: x => x.dp === dep || six, mod: x => own(x) || (!!u.admin && itemDp(x) === "lspd"), del: x => slugN(x.by) === me || sup(x) || (!!u.admin && itemDp(x) === "lspd"), msg: "pizarra" }
    : b === "lspdt.xcal" ? { add: x => (x.dp === dep || six) && !!ctx.cal, mod: x => own(x) && (!!ctx.cal || slugN(x.by) === me), del: x => own(x) && (!!ctx.cal || slugN(x.by) === me), msg: "evento" }
    : b === "lspdt.fbl" ? { add: x => slugN(x.por) === me && l >= 4, mod: x => xVis(k, x, u), del: x => slugN(x.por) === me || !!u.dadm || l >= 10, msg: "feedback" }
    : { add: x => slugN(x.por) === me && l >= 7, mod: x => xVis(k, x, u), del: x => slugN(x.por) === me || l >= 10, msg: "registro" };
  if (six) return null;
  const ids = new Set();
  for (const x of M) { if (!x || !x.id) continue; ids.add(x.id); const c = C.get(x.id);
    if (!c) { if (!B.has(x.id) && !R.add(x)) return `No podés crear ese ${R.msg}`; continue; }
    if (!xVis(k, c, u)) return `No podés modificar ese ${R.msg}`;
    if (st(c) !== st(x) && st(B.get(x.id)) !== st(x) && !R.mod(c)) return `No podés modificar ese ${R.msg}`;
    if (c.dp && x.dp !== c.dp) return "No se puede cambiar el departamento dueño"; }
  for (const [id, x] of B) if (!ids.has(id) && C.has(id) && !R.del(C.get(id))) return `No podés borrar ese ${R.msg}`;
  return null;
}
/* contenido de cada pizarra (lspdt.board.<ámbito>.<id>): se ve y se edita según su fila en el índice */
const BOARD_RE = /^lspdt\.board\.([a-z0-9]+)\.([^.]+)$/;
export const isBoardKey = k => typeof k === "string" && BOARD_RE.test(k);
let BACL = { sig: "", at: 0, m: new Map() };
export async function loadBoards() {
  if (Date.now() - BACL.at < 4000) return;
  const s = (await q("select coalesce(max(t),0) as m, count(*) as c from kv where k like 'lspdt.boards.%'")).rows[0], sig = `${s.m}:${s.c}`;
  if (sig !== BACL.sig) { const m = new Map();
    for (const r of (await q("select k, v from kv where k like 'lspdt.boards.%'")).rows) { let L = []; try { L = JSON.parse(r.v || "[]"); } catch { /* */ }
      if (Array.isArray(L)) for (const x of L) if (x && x.id) m.set(r.k.slice(13) + "." + x.id, x); }
    BACL = { sig, at: Date.now(), m }; } else BACL.at = Date.now();
}
function boardAcl(k, u, write) {
  const x = BOARD_RE.exec(k); if (!x) return true; if (isSix(u)) return true;
  const it = BACL.m.get(x[1] + "." + x[2]); if (!it) return !!write; /* recién creada: el índice llega enseguida */
  return write ? itemDp(it) === udep(u) || (!!u.admin && itemDp(it) === "lspd") : xVis("lspdt.boards." + x[1], it, u);
}
export const canRead = (k, u) => { if (!deptOk(k, u)) return false; const b = baseKey(k); return privOk(b, u) && briefOk(k, u) && expOk(k, u) && ofiOk(k, u) && boardAcl(b, u, false) && (keyDept(k) === (u.dept || "lspd") || keyDept(k) === "*" ? divRead(b, u) : true); };
export function canWrite(u, k) {
  if (typeof k === "string" && !expOk(k, u)) return "No tenés acceso a ese expediente";
  if (typeof k === "string" && !ofiOk(k, u)) return "Informes es de Oficial II para arriba";
  if (typeof k === "string" && !privOk(baseKey(k), u)) return "Clave no permitida";
  /* cada departamento escribe en lo suyo (y en lo compartido, con las reglas de siempre); six, en todos */
  if (typeof k === "string" && !deptOk(k, u)) return "Eso es de otro departamento";
  /* fuera de su propio departamento, six escribe con permisos de dueño (no es miembro de sus divisiones) */
  if (typeof k === "string" && DEPT_RE.test(k) && u.dept !== keyDept(k)) return isSix(u) ? null : "Eso es de otro departamento";
  /* lo compartido (Legal, catálogo de robos…) lo editan desde el LSPD; las cuentas del LSSD y la SAHP solo editan las pizarras */
  if (typeof k === "string" && u.dept && keyDept(k) === "*" && !/^lspdt\.(boards?|uprof|unote|ucom|uvis|ufolt?)\./.test(k) && !/^lspdt\.(xcal|decorx)$|^lspdt\.decorx\./.test(k)) return "Eso lo edita six para todos los departamentos";
  /* pizarras: el contenido lo edita el departamento dueño (los invitados solo la ven) */
  if (typeof k === "string" && isBoardKey(k) && !boardAcl(k, u, true)) return "Esa pizarra es de otro departamento: solo la podés ver";
  /* catálogo de condecoraciones compartido por los tres departamentos: Capitanía y Jefatura de cualquiera */
  if (typeof k === "string" && /^lspdt\.decorx(\.|$)/.test(k) && !isSix(u) && !u.admin && (u.l || 0) < 8) return "Solo Capitanía y Jefatura editan el catálogo de condecoraciones";
  if (k === "lspdt.uverif" && !isSix(u)) return "Solo six verifica perfiles";
  /* el roster de cada departamento (con los usuarios OOC de las cuentas) solo lo carga six */
  if (typeof k === "string" && /^lspdt\.(lssd|sahp)\.roster$/.test(k)) return "Solo six carga el roster del departamento";
  if (typeof k === "string" && /^lspdt\.(lssd\.)?entForm$/.test(k)) return "Los enlaces del formulario se cambian desde Resultados de entrevistas";
  if (typeof k === "string" && DEPT_RE.test(k)) k = baseKey(k);
  /* Jefatura del departamento: quién carga eventos, divisiones archivadas y la portada (fotos subidas) */
  if ((k === "lspdt.calevAcc" || k === "lspdt.divoff") && !isSix(u) && !(u.admin && !u.dept) && (u.l || 0) < 10) return "Solo Jefatura";
  if (/^lspdt\.portada\./.test(k) && !isSix(u) && !u.admin && (u.l || 0) < 10) return "Solo Jefatura cambia la portada";
  if (/^lspdt\.(fbl|uof)$/.test(k) && (u.l || 0) < 4 && !u.dadm && !isSix(u)) return "Sin acceso";
  /* perfil: solo su dueño lo edita (comentarios, visitas y seguidores los escribe cualquiera) */
  { const m = typeof k === "string" && /^lspdt\.uprof\.([a-z0-9]+)(\.ban|\.pic)?$/.exec(k); if (m && m[1] !== norm(u.n).replace(/[^a-z0-9]/g, "") && !u.admin) return "Solo el dueño puede editar su perfil"; }
  if (typeof k !== "string" || !k.startsWith("lspdt.") || k.length > 200 || LOCAL_KEYS.test(k)) return "Clave no permitida";
  if (k === "lspdt.asdRoster" && !u.owner && !u.asdCoord) return "Solo la Coordinación del A.S.D puede editar su roster";
  if (k === "lspdt.asdExam" && !u.admin && !u.asdCoord) return "Solo la Coordinación del A.S.D puede editar los exámenes";
  if (k === "lspdt.asdLic" && !u.admin && !u.asdCoord) return "Solo la Coordinación del A.S.D otorga y edita licencias";
  if (k === "lspdt.psbRoster" && !u.owner && !u.psbCo) return "Solo el Commanding Officer de la PSB puede editar el roster";
  if (k === "lspdt.psbIds" && !u.admin && !u.psb) return PSB_DENY;
  /* callsigns y movimientos de personal de METRO: comandancia, OIC, Team Leaders e instructores (y six, Liam y Molina por el examen práctico) */
  if ((k === "lspdt.mdRoster" || k === "lspdt.mdCalls") && !u.owner && !u.mdMan && !["Liam Campbell", "Evelyn Molina"].includes(u.n)) return "Solo la comandancia e instrucción de la METRO pueden editar el roster";
  if (k === "lspdt.k9Roster" && !u.owner && !u.k9Coord) return "Solo la Coordinación de la K-9 puede editar el roster";
  if (k === "lspdt.k9Reg" && !u.admin && !u.k9 && u.l < CAP) return "Solo los miembros de la K-9 pueden registrar patrullajes";
  if (k === "lspdt.asdVuelos" && !u.admin && !u.asd && u.l < CAP) return "Solo los miembros del A.S.D pueden registrar vuelos";
  if (u.lim && !u.admin && !["lspdt.rtdEnt", "lspdt.informes", "lspdt.asdVuelos", "lspdt.asdRoster", "lspdt.asdExam", "lspdt.asdLic", "lspdt.k9Roster", "lspdt.k9Reg", "lspdt.k9Dogs", "lspdt.mdRoster", "lspdt.mdCalls"].includes(k) && !/^lspdt\.(instr|boards?|mdx|anita|uprof|unote|ucom|uvis|ufolt?|unif|divacc|groster|groles|gcall|drec|comms)\./.test(k)) return "Tu cuenta solo puede usar Informes y tus divisiones";
  { const w = divWrite(k, u); if (w) return w; }
  if (k === "lspdt.legacc" && !isSix(u)) return "Solo el dueño de la terminal da acceso a Legal";
  if ((k === "lspdt.consultaAcc" || k === "lspdt.consulta.manual") && !isSix(u)) return "Solo el dueño de la terminal maneja Consulta";
  if (k === "lspdt.galEditors" && !isSix(u) && !u.admin) return "Solo six o la administración dan acceso a la galería";
  if (k === "lspdt.clasic" && !isSix(u) && !u.admin) return "Solo six o la administración dan el estilo clasic";
  if (k === "lspdt.robos" && !isSix(u)) return "Solo six publica la versión oficial de robos";
  if (typeof k === "string" && /^lspdt\.((lssd|sahp)\.)?entrevQ2?$/.test(k) && !u.admin && !isSix(u) && (u.l || 0) < (u.dept ? 7 : 6)) return "Solo Sargento I o superior puede editar las preguntas de la entrevista";
  if ((k === "lspdt.ilgAcc" || /^lspdt\.ilg\./.test(k)) && !isSix(u)) return "Solo six maneja lo de Gestión de ilícitos";
  if ((k === "lspdt.brief" || k === "lspdt.briefOn") && !u.admin && !isSix(u) && (u.l || 0) < (u.dept ? 7 : 6)) return "Solo los Supervisores publican el briefing";
  if (k === "lspdt.huellas" && !u.admin && u.l < 6) return "Solo Sargento I o superior puede cargar el registro de huellas";
  if (k === "lspdt.penal" && !u.admin && u.l < 6) return "Solo Sargento I o superior puede editar el código penal";
  if (k === "lspdt.rtdEnt" && !u.admin && !u.rtd && u.l < CAP) return "Solo los miembros de la RTD pueden registrar entrevistas de aspirantes";
  if (ADMIN_KEY.test(k) && !u.admin) return "Solo un administrador puede cambiar la imagen de la terminal";
  if ((k === "lspdt.dcfg" || k.startsWith("lspdt.tpl.")) && !u.admin && u.l < CAP) return "Solo Capitanía y los administradores editan las plantillas de Discord";
  if (typeof k === "string" && baseKey(k) === "lspdt.areaAcc" && !u.admin && !(u.dadm && keyDept(k) === u.dept)) return "Solo la administración da acceso a las áreas";
  if (k === "lspdt.exc" && u.l < CAP) return "Solo Capitanía (Teniente o superior) puede cambiar las excepciones";
  if (k === "lspdt.faltas" && !u.admin && !u.psb && !PSB_DEF.includes(u.n)) return PSB_DENY; // la lista editable se revisa en api/data.js
  return null;
}
