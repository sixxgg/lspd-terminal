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
export function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
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
export const PSB_EDITORS = ["Vega Chambers", "Madison Wells"];

let DEF = null;
export function defRoster() {
  if (!DEF) DEF = JSON.parse(readFileSync(new URL("./roster.json", import.meta.url), "utf8"));
  return DEF;
}
export async function roster() {
  const r = await q("select v from kv where k='lspdt.roster'");
  if (r.rows[0] && r.rows[0].v) { try { const a = JSON.parse(r.rows[0].v); if (Array.isArray(a) && a.length) return { list: a, custom: true }; } catch {} }
  return { list: defRoster(), custom: false };
}
export const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const emailOf = n => norm(n).replace(/[^a-z0-9]/g, "") + "@sanandreas.eu";
export const lvl = r => LEVEL[r] ?? 0;
export function findIn(list, n) { const s = norm(String(n || "").trim()); return list.find(a => norm(a.n) === s) || null; }

/* ---------- Contraseñas ---------- */
export function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 32, { N: 16384, r: 8, p: 1 });
  return "s1$" + salt.toString("hex") + "$" + h.toString("hex");
}
export function checkPw(pw, stored) {
  const [v, s, h] = String(stored || "").split("$");
  if (v !== "s1" || !s || !h) return false;
  const got = crypto.scryptSync(String(pw), Buffer.from(s, "hex"), 32, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(h, "hex");
  return want.length === got.length && crypto.timingSafeEqual(got, want);
}

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
export async function endSession(req, res) {
  const t = cookies(req)[COOKIE];
  if (t) await q("delete from sessions where token=$1", [sha(t)]);
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
/* Devuelve {n, r, l} del usuario con sesión válida y rango suficiente, o null. */
export async function current(req) {
  const t = cookies(req)[COOKIE];
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  const s = await q("select s.name from sessions s join accounts a on a.name=s.name where s.token=$1 and s.exp>$2", [sha(t), Date.now()]);
  if (!s.rows[0]) return null;
  const n = s.rows[0].name, ag = findIn((await roster()).list, n);
  if (!ag || lvl(ag.r) < MIN_ACC) return null;
  return { n, r: ag.r, l: lvl(ag.r) };
}
export async function requireUser(req, res) {
  const u = await current(req);
  if (!u) { send(res, 401, { error: "auth", msg: "Tu sesión expiró. Volvé a iniciar sesión." }); return null; }
  return u;
}

/* ---------- Reglas por clave ---------- */
// Claves que viven solo en cada navegador (preferencias) o que maneja el servidor.
export const LOCAL_KEYS = /^lspdt\.(session|accounts|theme|frame|rankLang|seenVersion|area|sec\..*|agView|upd.*|iconpng|fix\..*|patrol|bg|recent)$/;
export const IMG_KEY = /^lspdt\.(foto|cover|pfoto|divlogo)\.|^lspdt\.logo$/;
export function canWrite(u, k) {
  if (typeof k !== "string" || !k.startsWith("lspdt.") || k.length > 200 || LOCAL_KEYS.test(k)) return "Clave no permitida";
  if (k === "lspdt.exc" && u.l < CAP) return "Solo Capitanía (Teniente o superior) puede cambiar las excepciones";
  if (k === "lspdt.faltas" && !PSB_EDITORS.includes(u.n)) return "Solo " + PSB_EDITORS.join(" y ") + " pueden editar el catálogo del PSB";
  return null;
}
