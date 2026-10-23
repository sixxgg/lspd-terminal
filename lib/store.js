import { q } from "./db.js";
import { defRoster } from "./core.js";

export const imgUrl = (k, t) => `/api/img?k=${encodeURIComponent(k)}&t=${t}`;
export const SEL = "select k, t, v like 'data:%' as img, case when v like 'data:%' then null else v end as v from kv";

/* Todo lo que necesita la terminal al iniciar sesión, en una sola consulta. */
export async function fullData(u) {
  const rows = (await q(`${SEL} where v is not null
    union all select '~max', coalesce(max(t),0), false, null from kv
    union all select '~acc:' || name, coalesce(last,0), false, null from accounts`)).rows;
  const store = {}, kt = {}, acc = {}; let t = 0;
  for (const r of rows) {
    if (r.k === "~max") t = +r.t;
    else if (r.k.startsWith("~acc:")) acc[r.k.slice(5)] = +r.t;
    else { store[r.k] = r.img ? imgUrl(r.k, r.t) : r.v; kt[r.k] = +r.t; }
  }
  return { me: { n: u.n, r: u.r, admin: u.admin, owner: u.owner }, store, kt, t, defRoster: defRoster(), acc };
}
