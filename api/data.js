import { q, tx } from "../lib/db.js";
import { send, body, query, wrap, requireUser, canWrite, invalidate } from "../lib/core.js";
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
    return send(res, 200, await fullData(u));
  }

  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req), k = b.k;
  const why = canWrite(u, k);
  if (why) return send(res, 403, { error: "perm", msg: why });
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
    const t = (await c.query("insert into kv(k,v,t,by) values($1,$2,nextval('kv_seq'),$3) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by returning t", [k, v, u.n])).rows[0].t;
    return { v, t: +t };
  });
  if (k === "lspdt.roster") invalidate(); // el rango de alguien pudo cambiar
  const r = { t: out.t };
  if (out.v !== mine) r.v = out.v && out.v.startsWith("data:") ? imgUrl(k, out.t) : out.v; // devuelve el resultado solo si cambió por la fusión
  return send(res, 200, r);
});
