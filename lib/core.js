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
export const lvl = r => LEVEL[r] ?? 0;
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
const SESS = new Map(); const SESS_MS = 20000;
export function invalidate() { SESS.clear(); }
/* Devuelve {n, r, l, admin, owner} del usuario con sesión válida y rango suficiente, o null. Una sola consulta. */
export async function current(req) {
  const t = cookies(req)[COOKIE];
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  const c = SESS.get(t);
  if (c && c.until > Date.now()) return c.u;
  const s = await q(`select s.name, (select v from kv where k='lspdt.roster') as roster, (select v from meta where k='admins') as admins, (select v from kv where k='lspdt.ui') as ui, (select v from meta where k='approved') as approved, (select v from meta where k='anita') as anita, (select v from kv where k='lspdt.asdRoster') as asd, (select v from kv where k='lspdt.k9Roster') as k9, (select v from kv where k='lspdt.psbRoster') as psb, (select v from kv where k='lspdt.mdRoster') as md, (select json_agg(json_build_object('k', k, 'v', v)) from kv where k like 'lspdt.groster.%' or k like 'lspdt.groles.%' or k like 'lspdt.divacc.%') as gen
    from sessions s join accounts a on a.name=s.name where s.token=$1 and s.exp>$2`, [sha(t), Date.now()]);
  let u = null;
  if (s.rows[0]) {
    const n = s.rows[0].name, ag = findIn(parseRoster(s.rows[0].roster).list, n);
    const R = s.rows[0];
    if (canEnter(ag, R.ui, R.approved, R.asd, R.k9, R.md)) {
      const owner = OWNERS.includes(n), rtd = rtdList(R.ui).includes(n), asdR = asdMap(R.asd)[n] || [], k9R = k9Map(R.k9)[n] || [], psbR = psbMap(R.psb)[n] || [], mdR = mdMap(R.md)[n] || [];
      u = { n, r: ag.r, l: lvl(ag.r), owner, anita: !!R.anita && R.anita === n, rtd, asd: asdR.length > 0, asdCoord: asdR.includes("coord"), k9: Array.isArray(k9R) && k9R.length > 0, k9Coord: Array.isArray(k9R) && (k9R.includes("coord") || k9R.includes("subcoord")), psb: Array.isArray(psbR) && psbR.length > 0, psbCo: Array.isArray(psbR) && (psbR.includes("co") || psbR.includes("aco")), md: Array.isArray(mdR) && mdR.length > 0, mdCoord: Array.isArray(mdR) && (mdR.includes("co") || mdR.includes("aco")), lim: lvl(ag.r) < MIN_ACC, admin: owner || parseList(s.rows[0].admins).includes(n) };
      { let L = []; try { L = JSON.parse(R.ui || "{}").psb; } catch { /* */ } if (Array.isArray(L) && L.includes(n)) u.psb = true; }
      Object.assign(u, genInfo(n, R.gen, mdMap(R.md))); u.rtd = !!u.gm.rtd;
    }
  }
  if (SESS.size > 500) SESS.clear();
  SESS.set(t, { u, until: Date.now() + SESS_MS });
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
export const ADMIN_KEY = /^lspdt\.(logo(\.(login|boot|header|hero|wm))?|fav|ui|img\.(hero|dcav|avatar|avatar_m|avatar_f|cover)|lib\.[a-z0-9]+|divlogo\..+|bg\.(tablet|login|app)|ico\.[a-z0-9-]+)$/;
export const PUBLIC_KEYS = ["lspdt.logo", "lspdt.logo.login", "lspdt.logo.boot", "lspdt.logo.wm", "lspdt.fav", "lspdt.bg.tablet", "lspdt.bg.login", "lspdt.ui"];
export const IMG_KEY = /^lspdt\.(foto|cover|pfoto|divlogo|ico|lib)\.|^lspdt\.(logo|fav|bg|img)(\.\w+)?$/;
/* apartado privado: solo lo ve y lo escribe su dueño (también se filtra al leer) */
/* orden fijo de las primeras cuentas (ID del perfil): six #1, Anita #2; el resto por fecha de registro */
export const ID_PIN = ["Ryan Westbrook", "Evelyn Molina"];
export const SIX_OWNER = "Ryan Westbrook", SIX_KEY = /^lspdt\.six\./, ANITA_KEY = /^lspdt\.anita\./;
export const isSix = u => !!u && u.n === SIX_OWNER;
/* espacios privados: lo de six solo lo ve six; lo de Anita solo la cuenta que six marcó como de Anita */
export const privOk = (k, u) => (!SIX_KEY.test(k) || isSix(u)) && (!ANITA_KEY.test(k) || (!!u && !!u.anita));
/* lo que se le manda a cada sesión: lo privado de six y Anita, y los datos de las divisiones a las que pertenece */
export const canRead = (k, u) => privOk(k, u) && divRead(k, u);
export function canWrite(u, k) {
  if (typeof k === "string" && !privOk(k, u)) return "Clave no permitida";
  /* perfil: solo su dueño lo edita (comentarios, visitas y seguidores los escribe cualquiera) */
  { const m = typeof k === "string" && /^lspdt\.uprof\.([a-z0-9]+)(\.ban|\.pic)?$/.exec(k); if (m && m[1] !== norm(u.n).replace(/[^a-z0-9]/g, "") && !u.admin) return "Solo el dueño puede editar su perfil"; }
  if (typeof k !== "string" || !k.startsWith("lspdt.") || k.length > 200 || LOCAL_KEYS.test(k)) return "Clave no permitida";
  if (k === "lspdt.asdRoster" && !u.owner && !u.asdCoord) return "Solo la Coordinación del A.S.D puede editar su roster";
  if (k === "lspdt.asdExam" && !u.admin && !u.asdCoord) return "Solo la Coordinación del A.S.D puede editar los exámenes";
  if (k === "lspdt.psbRoster" && !u.owner && !u.psbCo) return "Solo el Commanding Officer de la PSB puede editar el roster";
  if (k === "lspdt.psbIds" && !u.admin && !u.psb) return PSB_DENY;
  if ((k === "lspdt.mdRoster" || k === "lspdt.mdCalls") && !u.owner && !u.mdCoord) return "Solo la comandancia de la METRO (CO y ACO) puede editar el roster";
  if (k === "lspdt.k9Roster" && !u.owner && !u.k9Coord) return "Solo la Coordinación de la K-9 puede editar el roster";
  if (k === "lspdt.k9Reg" && !u.admin && !u.k9 && u.l < CAP) return "Solo los miembros de la K-9 pueden registrar patrullajes";
  if (k === "lspdt.asdVuelos" && !u.admin && !u.asd && u.l < CAP) return "Solo los miembros del A.S.D pueden registrar vuelos";
  if (u.lim && !u.admin && !["lspdt.rtdEnt", "lspdt.informes", "lspdt.asdVuelos", "lspdt.asdRoster", "lspdt.asdExam", "lspdt.k9Roster", "lspdt.k9Reg", "lspdt.k9Dogs", "lspdt.mdRoster", "lspdt.mdCalls"].includes(k) && !/^lspdt\.(instr|boards?|mdx|anita|uprof|ucom|uvis|ufolt?|unif|divacc|groster|groles|gcall|drec|comms)\./.test(k)) return "Tu cuenta solo puede usar Informes y tus divisiones";
  { const w = divWrite(k, u); if (w) return w; }
  if (k === "lspdt.legacc" && !isSix(u)) return "Solo el dueño de la terminal da acceso a Legal";
  if (k === "lspdt.huellas" && !u.admin && u.l < 6) return "Solo Sargento I o superior puede cargar el registro de huellas";
  if (k === "lspdt.penal" && !u.admin && u.l < 6) return "Solo Sargento I o superior puede editar el código penal";
  if (k === "lspdt.rtdEnt" && !u.admin && !u.rtd && u.l < CAP) return "Solo los miembros de la RTD pueden registrar entrevistas de aspirantes";
  if (ADMIN_KEY.test(k) && !u.admin) return "Solo un administrador puede cambiar la imagen de la terminal";
  if ((k === "lspdt.dcfg" || k.startsWith("lspdt.tpl.")) && !u.admin && u.l < CAP) return "Solo Capitanía y los administradores editan las plantillas de Discord";
  if (k === "lspdt.exc" && u.l < CAP) return "Solo Capitanía (Teniente o superior) puede cambiar las excepciones";
  if (k === "lspdt.faltas" && !u.admin && !u.psb && !PSB_DEF.includes(u.n)) return PSB_DENY; // la lista editable se revisa en api/data.js
  return null;
}
