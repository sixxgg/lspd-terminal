/* Feedback de los usuarios: cualquier cuenta envía un ticket (texto con formato + fotos). Se guarda en lspdt.six.fb.* (solo lo ve six)
   y avisa por Discord al canal configurado (sin adjuntos, con botón a la terminal). El token del bot va en la variable DISCORD_BOT_TOKEN de Vercel (nunca en el código). */
import crypto from "node:crypto";
import { q } from "../lib/db.js";
import { send, body, wrap, requireUser, isSix } from "../lib/core.js";

const CHANNEL = process.env.DISCORD_FB_CHANNEL || "1551455529035898970";
const PING = process.env.DISCORD_FB_PING || "335538916662968320";
const IMG_RE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;

/* texto plano a partir del HTML del editor (para la notificación) */
const plain = h => String(h).replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p|li)>/gi, "\n").replace(/<span[^>]*data-sp[^>]*>(.*?)<\/span>/gi, "||$1||")
  .replace(/<img[^>]*>/gi, "[foto]").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/\n{3,}/g, "\n\n").trim();
/* resumen corto: «[📷 2 fotos] texto…» */
const excerpt = h => { const n = (String(h).match(/<img[^>]*>/gi) || []).length, t = plain(String(h).replace(/<img[^>]*>/gi, "")).replace(/\s+/g, " ").trim();
  return `${n ? `[📷 ${n} ${n === 1 ? "foto" : "fotos"}]${t ? " " : ""}` : ""}${t}`.slice(0, 160); };
/* quién lo manda, en OOC: six o «Usuario N° X» (orden en que se creó la cuenta) */
async function whoOf(u) {
  if (isSix(u)) return { who: "six", no: 0 };
  const no = +((await q("select count(*) as n from accounts where created <= (select created from accounts where name=$1)", [u.n])).rows[0]?.n || 0);
  return { who: no ? `Usuario N° ${no}` : "Usuario", no };
}
/* limpieza básica en el servidor (al mostrarlo, la terminal vuelve a filtrar todo con una lista blanca) */
const clean = h => String(h).replace(/<(script|style|iframe|object|embed|link|meta)[\s\S]*?(<\/\1>|$)/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "");

/* aviso a Discord: texto corto, sin adjuntar las fotos (solo se cuentan) y un botón que abre la terminal en six → Notificaciones */
async function notify(t, site) {
  const tok = (process.env.DISCORD_BOT_TOKEN || "").trim().replace(/^Bot\s+/i, ""); if (!tok) return "falta la variable DISCORD_BOT_TOKEN en Vercel (y un Redeploy después de crearla)";
  const nI = (String(t.html).match(/<img[^>]*>/gi) || []).length, txt = plain(String(t.html).replace(/<img[^>]*>/gi, ""));
  const head = `<@${PING}> 💗 **Nuevo feedback** de **${t.who}**${t.who !== "six" && t.who !== t.by ? ` · ${t.by}` : ""}${nI ? ` · 📷 ${nI} ${nI === 1 ? "foto" : "fotos"}` : ""}`;
  const content = `${head}\n>>> ${txt.length > 1500 ? txt.slice(0, 1500) + "…" : txt || "(solo fotos)"}`;
  const url = `${site}/?ir=six-not`, go = (body) => fetch(`https://discord.com/api/v10/channels/${CHANNEL}/messages`, { method: "POST", headers: { Authorization: "Bot " + tok, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  try {
    let r = await go({ content, allowed_mentions: { users: [PING] }, components: [{ type: 1, components: [{ type: 2, style: 5, label: "Abrir en la terminal", url }] }] });
    if (r.status === 400) r = await go({ content: `${content}\n[Abrir en la terminal](<${url}>)`, allowed_mentions: { users: [PING] } }); // por si el botón no se acepta
    if (r.ok) return "";
    let m = ""; try { m = (await r.json()).message || ""; } catch {}
    const hint = r.status === 401 ? "el token no es válido (¿se reseteó? copiá el nuevo en DISCORD_BOT_TOKEN y hacé Redeploy)"
      : r.status === 403 ? "el bot no tiene permiso en ese canal (Ver canal y Enviar mensajes)"
      : r.status === 404 ? "no existe el canal o el bot no está en ese servidor" : m;
    return `Discord respondió ${r.status}: ${hint}`;
  } catch { return "no se pudo contactar a Discord"; }
}
/* dirección pública de la terminal (para el botón del aviso) */
const siteOf = req => process.env.SITE_URL || `https://${String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim()}`;
/* índice de feedback por usuario (meta «fbu:nombre» = ids), así «Mis feedback» no recorre todos */
const IX = n => "fbu:" + n;
async function myIds(n) {
  const r = (await q("select v from meta where k=$1", [IX(n)])).rows[0];
  if (r) return String(r.v || "").split(",").filter(Boolean);
  /* primera vez: se arma una sola vez con los feedback viejos */
  const ids = [];
  for (const x of (await q("select v from kv where k like 'lspdt.six.fb.%' and v is not null")).rows) { try { const t = JSON.parse(x.v); if (t && t.by === n) ids.push(t.id); } catch {} }
  await q("insert into meta(k,v) values($1,$2) on conflict(k) do nothing", [IX(n), ids.join(",")]);
  return ids;
}

export default wrap(async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  if (req.method === "GET") { // los feedback propios y su estado (para las notificaciones de cada usuario)
    const ids = (await myIds(u.n)).filter(x => /^[a-z0-9]{1,40}$/.test(x)), list = [];
    const rows = ids.length ? (await q("select v from kv where k = any($1) and v is not null", [ids.map(x => "lspdt.six.fb." + x)])).rows : [];
    for (const r of rows) { let t; try { t = JSON.parse(r.v); } catch { continue; }
      if (t && t.by === u.n && t.st !== "elim") list.push({ id: t.id, t: t.t, u: t.u || t.t, st: t.st, x: t.x || excerpt(t.html || ""), nota: String(t.nota || "").slice(0, 300) }); }
    list.sort((a, b) => b.u - a.u);
    return send(res, 200, { list });
  }
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req);
  if (b.test) { // prueba del aviso (solo six)
    if (!isSix(u)) return send(res, 403, { msg: "Solo six" });
    const dc = await notify({ by: u.n, who: "six", html: "✅ Prueba del aviso de feedback de la terminal." }, siteOf(req));
    return send(res, 200, dc ? { ok: false, msg: dc } : { ok: true });
  }
  const html = clean(typeof b.html === "string" ? b.html : "").slice(0, 30000), imgs = Array.isArray(b.imgs) ? b.imgs : [];
  if (!plain(html).trim() && !imgs.length) return send(res, 400, { msg: "Escribí algo antes de enviar" });
  if (imgs.length > 8 || imgs.some(d => typeof d !== "string" || !IMG_RE.test(d) || d.length > 4.2e6)) return send(res, 400, { msg: "Hasta 8 fotos de 3 MB cada una" });
  /* límite: 6 envíos por hora por persona */
  const now = Date.now(), rk = "fb:" + u.n, prev = (await q("select v from meta where k=$1", [rk])).rows[0]?.v;
  const hits = (prev ? String(prev).split(",").map(Number) : []).filter(x => now - x < 3600e3);
  if (hits.length >= 6) return send(res, 429, { msg: "Mandaste muchos feedback seguidos. Probá de nuevo en un rato." });
  await q("insert into meta(k,v) values($1,$2) on conflict(k) do update set v=excluded.v", [rk, [...hits, now].join(",")]);

  const id = now.toString(36) + crypto.randomBytes(3).toString("hex"), keys = [];
  for (let i = 0; i < imgs.length; i++) { const k = `lspdt.six.fbi.${id}.${i}`; keys.push(k);
    await q("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do nothing", [k, imgs[i], u.n, now]); }
  const t = { id, by: u.n, ...(await whoOf(u)), t: now, u: now, html, x: excerpt(html), imgs: keys, st: "pend" };
  await q("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do nothing", [`lspdt.six.fb.${id}`, JSON.stringify(t), u.n, now]);
  const prevIds = await myIds(u.n);
  await q("insert into meta(k,v) values($1,$2) on conflict(k) do update set v=excluded.v", [IX(u.n), [...new Set([...prevIds, id])].slice(-200).join(",")]);
  const dc = await notify(t, siteOf(req));
  if (dc) console.warn("feedback: aviso a Discord no enviado:", dc);
  return send(res, 200, { ok: true, id });
});
