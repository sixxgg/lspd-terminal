/* Presencia en vivo de la pizarra: cada uno manda su cursor y lo que está moviendo (cada ~200 ms mientras hay actividad)
   y recibe lo de los demás, más la última versión guardada de la pizarra para traerla al instante. */
import { q } from "../lib/db.js";
import { send, body, wrap, requireUser } from "../lib/core.js";

export const BOARD = /^lspdt\.board\.[a-z0-9]+\.[a-z0-9]+$/;
export async function liveOf(b, not = "") {
  const r = await q("select n, v, t, (select t from kv where k=$1) as kt from live where b=$1 and n<>$2 and t>$3", [b, not, Date.now() - 10000]);
  const kt = r.rows[0]?.kt != null ? +r.rows[0].kt : +((await q("select t from kv where k=$1", [b])).rows[0]?.t || 0);
  return { o: r.rows.map(x => { let v = null; try { v = JSON.parse(x.v); } catch { /* */ } return { n: x.n, v, t: +x.t }; }), kt };
}
export default wrap(async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const u = await requireUser(req, res); if (!u) return;
  const b = await body(req);
  if (typeof b.b !== "string" || !BOARD.test(b.b)) return send(res, 400, { msg: "Pizarra inválida" });
  const now = Date.now();
  if (b.s === null) await q("delete from live where b=$1 and n=$2", [b.b, u.n]);
  else if (b.s && typeof b.s === "object") { const v = JSON.stringify(b.s); if (v.length < 80000) await q("insert into live(b,n,v,t) values($1,$2,$3,$4) on conflict(b,n) do update set v=excluded.v, t=excluded.t", [b.b, u.n, v, now]); }
  if (Math.random() < 0.03) await q("delete from live where t < $1", [now - 60000]);
  res.setHeader("Cache-Control", "no-store");
  return send(res, 200, { ...(await liveOf(b.b, u.n)), now });
});
