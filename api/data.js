import { q, tx } from "../lib/db.js";
import { send, body, query, wrap, requireUser, canWrite, invalidate, IMG_KEY, ADMIN_KEY } from "../lib/core.js";

async function downloadImg(url) {
  const fail = m => Object.assign(new Error(m), { status: 400 });
  let u; try { u = new URL(url); } catch { throw fail("La URL no es válida"); }
  if (u.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname)) throw fail("Solo se aceptan URLs públicas con https");
  const ctl = AbortSignal.timeout(10000);
  const r = await fetch(u, { signal: ctl, redirect: "follow", headers: { "User-Agent": "LSPD-Terminal" } }).catch(() => { throw fail("No se pudo descargar la imagen"); });
  if (!r.ok) throw fail(`El sitio respondió ${r.status}. Si es un enlace de Discord, puede haber vencido: subí la imagen desde tu PC.`);
  const type = (r.headers.get("content-type") || "").split(";")[0].trim();
  if (!/^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/.test(type)) throw fail("El enlace no es una imagen");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 3.2e6) throw fail("La imagen pesa más de 3 MB");
  return `data:${type};base64,${buf.toString("base64")}`;
}
import { mergeText } from "../lib/merge.js";
import { fullData, imgUrl, SEL } from "../lib/store.js";

export default wrap(async (req, res) => {
  const u = await requireUser(req, res);
  if (!u) return;

  if (req.method === "GET") {
    const qs = query(req), since = Number(qs.since);
    if (qs.since !== undefined && qs.since !== "" && Number.isFinite(since) && since >= 0) {
      // cambios desde la última consulta (con margen, el cliente descarta lo que ya tiene)
      const rows = (await q(SEL + " where t > $1 order by t", [since - 50])).rows;
      const ch = rows.map(r => [r.k, r.img ? imgUrl(r.k, r.t) : r.v, +r.t]);
      const t = rows.length ? Math.max(since, ...rows.map(r => +r.t)) : since;
      return send(res, 200, { ch, t, me: { admin: u.admin, owner: u.owner } });
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
  const b = await body(req), k = b.k;
  const why = canWrite(u, k);
  if (why) return send(res, 403, { error: "perm", msg: why });
  if (typeof b.url === "string") { // imagen por URL: el servidor la descarga y la guarda (los enlaces de Discord vencen)
    if (!IMG_KEY.test(k)) return send(res, 400, { msg: "Esa clave no admite imágenes" });
    b.v = await downloadImg(b.url); b.base = null;
  }
  if (typeof b.from === "string") { // usar una imagen ya guardada (galería)
    if (!IMG_KEY.test(k)) return send(res, 400, { msg: "Esa clave no admite imágenes" });
    const r = (await q("select v from kv where k=$1", [b.from])).rows[0];
    if (!r || !r.v || !r.v.startsWith("data:")) return send(res, 404, { msg: "No se encontró la imagen" });
    b.v = r.v; b.base = null;
  }
  const del = !!b.del;
  const mine = del ? null : (typeof b.v === "string" ? b.v : null);
  if (!del && mine === null) return send(res, 400, { msg: "Falta el valor" });
  if (mine && mine.length > 4.4e6) return send(res, 413, { msg: "El archivo es demasiado pesado" });

  const out = await tx(async c => {
    // primero el bloqueo y después la lectura: en la misma consulta se leería un valor viejo
    await c.query("select pg_advisory_xact_lock(hashtext($1))", [k]);
    const cur = (await c.query("select v, t from kv where k=$1", [k])).rows[0] || { v: null, t: null };
    const exists = cur.t != null, curV = cur.v;
    let v = mine;
    if (!del && curV != null && !mine.startsWith("data:")) v = mergeText(typeof b.base === "string" ? b.base : null, mine, curV);
    if (exists && v === curV) return { v, t: +cur.t };
    // historial: la imagen de la terminal que se reemplaza o quita queda guardada en la galería
    if (ADMIN_KEY.test(k) && !k.startsWith("lspdt.lib.") && curV && curV.startsWith("data:"))
      await c.query("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do nothing", ["lspdt.lib.h" + Date.now().toString(36), curV, u.n, Date.now()]);
    const t = (await c.query("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by, at=excluded.at returning t", [k, v, u.n, Date.now()])).rows[0].t;
    return { v, t: +t };
  });
  if (k === "lspdt.roster") invalidate(); // el rango de alguien pudo cambiar
  const r = { t: out.t };
  if (out.v !== mine || b.url || b.from) r.v = out.v && out.v.startsWith("data:") ? imgUrl(k, out.t) : out.v; // devuelve el resultado solo si cambió por la fusión
  return send(res, 200, r);
});
