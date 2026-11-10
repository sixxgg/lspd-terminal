/* Feedback de los usuarios: cualquier cuenta envía un ticket (texto con formato + fotos). Se guarda en lspdt.six.fb.* (solo lo ve six)
   y avisa por Discord al canal configurado. El token del bot va en la variable DISCORD_BOT_TOKEN de Vercel (nunca en el código). */
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
/* limpieza básica en el servidor (al mostrarlo, la terminal vuelve a filtrar todo con una lista blanca) */
const clean = h => String(h).replace(/<(script|style|iframe|object|embed|link|meta)[\s\S]*?(<\/\1>|$)/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "");

async function notify(t) {
  const tok = process.env.DISCORD_BOT_TOKEN; if (!tok) return "sin token";
  const txt = plain(t.html), head = `<@${PING}> 📬 **Nuevo feedback** de **${t.by}**${t.r ? ` (${t.r})` : ""}`;
  const content = `${head}\n>>> ${txt.length > 1700 ? txt.slice(0, 1700) + "…" : txt || "(sin texto)"}`;
  const fd = new FormData();
  fd.append("payload_json", JSON.stringify({ content, allowed_mentions: { users: [PING] } }));
  let size = 0;
  t.raw.forEach((d, i) => { const m = /^data:image\/(\w+);base64,(.*)$/.exec(d); if (!m) return; const b = Buffer.from(m[2], "base64"); if (size + b.length > 7.5e6) return; size += b.length;
    fd.append(`files[${i}]`, new Blob([b], { type: "image/" + m[1] }), `foto${i + 1}.${m[1] === "jpeg" ? "jpg" : m[1]}`); });
  try {
    const r = await fetch(`https://discord.com/api/v10/channels/${CHANNEL}/messages`, { method: "POST", headers: { Authorization: "Bot " + tok }, body: fd, signal: AbortSignal.timeout(8000) });
    return r.ok ? "" : `Discord respondió ${r.status}`;
  } catch { return "no se pudo contactar a Discord"; }
}

export default wrap(async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req);
  if (b.test) { // prueba del aviso (solo six)
    if (!isSix(u)) return send(res, 403, { msg: "Solo six" });
    if (!process.env.DISCORD_BOT_TOKEN) return send(res, 200, { ok: false, msg: "Falta la variable DISCORD_BOT_TOKEN en Vercel" });
    const dc = await notify({ by: u.n, r: u.r || "", html: "✅ Prueba del aviso de feedback de la terminal.", raw: [] });
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
  const t = { id, by: u.n, r: u.r || "", t: now, html, imgs: keys, st: "pend" };
  await q("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do nothing", [`lspdt.six.fb.${id}`, JSON.stringify(t), u.n, now]);
  const dc = await notify({ ...t, raw: imgs });
  if (dc) console.warn("feedback: aviso a Discord no enviado:", dc);
  return send(res, 200, { ok: true, id });
});
