/* Herramientas del dueño (six): códigos de autodestrucción y modo mantenimiento.
   - Los códigos y la contraseña de mantenimiento se generan en el servidor y se mandan SOLO por mensaje directo del bot a la cuenta de Discord
     vinculada de six (DISCORD_FB_PING). Nunca vuelven en la respuesta ni quedan guardados en claro: en la base solo queda un HMAC.
   - Sin un código de autodestrucción no se borra nada importante (cuentas, roster, catálogos, informes, expedientes…): quien tenga uno
     desbloquea su sesión por 10 minutos. Se controla acá, en el servidor, no en los botones. */
import crypto from "node:crypto";
import { q } from "./db.js";

const SIX_DC = () => (process.env.DISCORD_FB_PING || "335538916662968320").trim();
const pepper = () => process.env.OWNER_SECRET || process.env.SESSION_SECRET || process.env.DATABASE_URL || "lspd-terminal";
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const hmac = c => crypto.createHmac("sha256", pepper()).update(normCode(c)).digest("hex");
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; /* sin 0/O ni 1/I */
const code = (g = 3, n = 4) => Array.from({ length: g }, () => Array.from(crypto.randomBytes(n), b => ALPH[b % ALPH.length]).join("")).join("-");
const getM = async k => (await q("select v from meta where k=$1", [k])).rows[0]?.v ?? null;
const setM = (k, v) => q("insert into meta(k, v) values($1, $2) on conflict (k) do update set v=excluded.v", [k, String(v)]);
const delM = k => q("delete from meta where k=$1", [k]);
const eqHex = (a, b) => { try { return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex")); } catch { return false; } };

/* mensaje directo del bot a six; devuelve "" si salió o el motivo del error */
export async function dmSix(content) {
  const tok = (process.env.DISCORD_BOT_TOKEN || "").trim().replace(/^Bot\s+/i, "");
  if (!tok) return "falta la variable DISCORD_BOT_TOKEN en Vercel";
  const H = { Authorization: "Bot " + tok, "Content-Type": "application/json" };
  try {
    const ch = await fetch("https://discord.com/api/v10/users/@me/channels", { method: "POST", headers: H, body: JSON.stringify({ recipient_id: SIX_DC() }), signal: AbortSignal.timeout(8000) });
    if (!ch.ok) return `Discord no abrió el mensaje directo (${ch.status})`;
    const id = (await ch.json()).id;
    const r = await fetch(`https://discord.com/api/v10/channels/${id}/messages`, { method: "POST", headers: H, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(8000) });
    return r.ok ? "" : r.status === 403 ? "Discord no deja mandarte mensajes directos (activá los MD del servidor donde está el bot)" : `Discord respondió ${r.status}`;
  } catch { return "no se pudo contactar a Discord"; }
}

/* aviso al canal de feedback (el mismo de la integración de feedback): para los mensajes de la pantalla de mantenimiento */
export async function postFb(content) {
  const tok = (process.env.DISCORD_BOT_TOKEN || "").trim().replace(/^Bot\s+/i, ""); if (!tok) return "falta la variable DISCORD_BOT_TOKEN en Vercel";
  const ch = process.env.DISCORD_FB_CHANNEL || "1551455529035898970";
  try {
    const r = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, { method: "POST", headers: { Authorization: "Bot " + tok, "Content-Type": "application/json" },
      body: JSON.stringify({ content: `<@${SIX_DC()}> ${content}`, allowed_mentions: { users: [SIX_DC()] } }), signal: AbortSignal.timeout(8000) });
    return r.ok ? "" : `Discord respondió ${r.status}`;
  } catch { return "no se pudo contactar a Discord"; }
}

/* ---------- códigos de autodestrucción ---------- */
const SD_CODES = "sd:codes", SD_OK = h => "sd:ok:" + h, SD_FAIL = ip => "sd:fail:" + ip, SD_MIN = 10;
export async function sdHas() { try { const L = JSON.parse((await getM(SD_CODES)) || "[]"); return Array.isArray(L) && L.length > 0; } catch { return false; } }
/* genera 10 códigos nuevos y los manda por MD; si el MD falla no se guarda nada (los viejos siguen valiendo) */
export async function sdGenerate(by) {
  const L = Array.from({ length: 10 }, () => code());
  const err = await dmSix(["🧨 **Códigos de autodestrucción · LSPD Terminal**", "Sin uno de estos códigos no se puede borrar nada importante en la terminal. No se los pases a nadie: los anteriores quedaron anulados.", "",
    ...L.map((c, i) => `\`${String(i + 1).padStart(2, "0")}\` ||${c}||`), "", `-# Generados por ${by} · ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`].join("\n"));
  if (err) return err;
  await setM(SD_CODES, JSON.stringify(L.map(hmac)));
  return "";
}
async function sdMatch(c) { if (normCode(c).length < 8) return false; let L = []; try { L = JSON.parse((await getM(SD_CODES)) || "[]"); } catch { /* */ } const h = hmac(c); return L.some(x => eqHex(x, h)); }
/* desbloquea la sesión por 10 minutos; 5 intentos fallidos por IP cada 15 minutos */
export async function sdUnlock(c, sessHash, ip) {
  const fk = SD_FAIL(ip || "?"), f = JSON.parse((await getM(fk)) || '{"n":0,"t":0}');
  if (f.n >= 5 && Date.now() - f.t < 15 * 6e4) return { ok: false, msg: "Demasiados intentos. Esperá 15 minutos." };
  if (!(await sdMatch(c))) { await setM(fk, JSON.stringify({ n: Date.now() - f.t < 15 * 6e4 ? f.n + 1 : 1, t: Date.now() })); return { ok: false, msg: "Ese código no es válido" }; }
  await delM(fk); const until = Date.now() + SD_MIN * 6e4; await setM(SD_OK(sessHash), until);
  return { ok: true, until };
}
export async function sdUnlocked(sessHash) { const v = +(await getM(SD_OK(sessHash))) || 0; return v > Date.now(); }

/* qué se considera «borrar algo importante» en /api/data */
const CRIT = /^lspdt\.(roster|agx|robos|ilg\.tablet|ilgAcc|six\.robEdit|six\.robLog|feedback|informes|alertas|t1080|psbCit|fbl|uof|entrev|brief|exp\.[a-z0-9]+(\.fto)?|trasl\.[a-z0-9_-]+|(asd|k9|psb|md)Roster|groster\.[a-z0-9_-]+|areaAcc|decorx)$/;
const size = v => { if (v == null || v === "") return 0; try { const x = JSON.parse(v); return Array.isArray(x) ? x.length : x && typeof x === "object" ? Object.keys(x).length : 1; } catch { return v.length ? 1 : 0; } };
/* borrar la clave entera, vaciarla o sacarle la mitad o más de golpe (10+ registros) */
export function isDestructive(bk, del, curV, newV) {
  if (!CRIT.test(bk) || curV == null) return false;
  const a = size(curV); if (!a) return false;
  if (del) return true;
  const b = size(newV); return (b === 0 && a >= 3) || (a - b >= 10 && b <= a / 2);
}

/* ---------- modo mantenimiento ---------- */
/* meta «maint» = {on, at, by, msg} · «maint:pw» = HMAC de la contraseña vigente (se genera y se manda por MD, nunca se muestra) */
/* lo consulta cada pedido: se guarda 8 s por instancia */
let MC = { at: 0, m: null };
export async function maintCached() { if (Date.now() - MC.at > 8000) MC = { at: Date.now(), m: await maintState().catch(() => null) }; return MC.m; }
export async function maintState() { try { const m = JSON.parse((await getM("maint")) || "null"); return m && m.on ? m : null; } catch { return null; } }
export async function maintNewPw(by) {
  const pw = code(4, 4);
  const err = await dmSix(["🛠️ **Contraseña de mantenimiento · LSPD Terminal**", "Copiala y pegala en tu panel › Administración › Mantenimiento para activarlo. Para apagarlo, escribila en el chat de la pantalla de mantenimiento.", "",
    `||${pw}||`, "", `-# Pedida por ${by} · vale hasta que pidas otra.`].join("\n"));
  if (err) return err;
  await setM("maint:pw", hmac(pw));
  return "";
}
export async function maintPwOk(pw) { const h = await getM("maint:pw"); return !!h && normCode(pw).length >= 8 && eqHex(h, hmac(pw)); }
export async function maintSet(on, by, msg = "") { MC = { at: 0, m: null }; await setM("maint", JSON.stringify(on ? { on: true, at: Date.now(), by, msg: String(msg).slice(0, 300) } : { on: false, at: Date.now(), by })); }
/* la IP con la que six activó el mantenimiento: solo desde esa IP y su cuenta se toca la configuración (beta) */
export const ownerIpKey = "maint:ip";
export async function ownerIp() { return getM(ownerIpKey); }
export async function setOwnerIp(ip) { await setM(ownerIpKey, ip); }
