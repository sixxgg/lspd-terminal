import { q } from "./db.js";
import { defRoster, canRead, isSix, mdMap } from "./core.js";
import { GEN, ROLES_SEED, CALL_SEED, REC_SEED, seedFor } from "./divs.js";

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
    else if (!canRead(r.k, u)) continue;
    else { store[r.k] = r.img ? imgUrl(r.k, r.t) : r.v; kt[r.k] = +r.t; }
  }
  /* rosters iniciales de las divisiones nuevas: se guardan una sola vez */
  const all = new Set(rows.map(r => r.k)), seed = [];
  for (const id of Object.keys(GEN)) {
    if (!all.has("lspdt.groster." + id)) seed.push(["lspdt.groster." + id, JSON.stringify(seedFor(id, mdMap(store["lspdt.mdRoster"])))]);
    if (ROLES_SEED[id] && !all.has("lspdt.groles." + id)) seed.push(["lspdt.groles." + id, JSON.stringify(ROLES_SEED[id])]);
    if (CALL_SEED[id] && !all.has("lspdt.gcall." + id)) seed.push(["lspdt.gcall." + id, JSON.stringify(CALL_SEED[id])]);
  }
  for (const [k, v] of Object.entries(REC_SEED)) if (!all.has(k)) seed.push([k, JSON.stringify(v)]);
  /* una sola vez (v2.1.1): si ya existían rosters o roles cargados a mano, se les suman los integrantes y roles de la plantilla que falten */
  if (!(await q("select 1 from meta where k='gseed3'")).rows.length) {
    const js = v => { try { return JSON.parse(v); } catch { return null; } }, upd = [];
    for (const id of Object.keys(GEN)) {
      const rk = "lspdt.groster." + id, cur = all.has(rk) ? js(store[rk] ?? (await q("select v from kv where k=$1", [rk])).rows[0]?.v) : null;
      if (cur && typeof cur === "object") { const add = Object.fromEntries(Object.entries(seedFor(id, mdMap(store["lspdt.mdRoster"]))).filter(([n]) => !cur[n])); if (Object.keys(add).length) upd.push([rk, JSON.stringify({ ...cur, ...add })]); }
      const lk = "lspdt.groles." + id, cr = ROLES_SEED[id] && all.has(lk) ? js(store[lk] ?? (await q("select v from kv where k=$1", [lk])).rows[0]?.v) : null;
      if (Array.isArray(cr)) { const miss = ROLES_SEED[id].filter(r => !cr.some(x => x && x.k === r.k)); if (miss.length) upd.push([lk, JSON.stringify([...cr, ...miss])]); }
    }
    for (const [k, v] of upd) { const r = (await q("update kv set v=$2, t=nextval('kv_seq'), by='sistema', at=$3 where k=$1 returning t", [k, v, Date.now()])).rows[0]; if (r && canRead(k, u)) { store[k] = v; kt[k] = +r.t; t = Math.max(t, +r.t); } }
    await q("insert into meta(k,v) values('gseed3','1') on conflict(k) do nothing");
  }
  /* una sola vez (v2.3.1): la CNT pasa a Coordinador / Negociador / Aspirante con sus 5 negociadores */
  if (!(await q("select 1 from meta where k='gseed4'")).rows.length) {
    for (const [k, v] of [["lspdt.groles.cnt", ROLES_SEED.cnt], ["lspdt.groster.cnt", seedFor("cnt")]]) {
      const r = (await q("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),'sistema',$3) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by, at=excluded.at returning t", [k, JSON.stringify(v), Date.now()])).rows[0];
      if (canRead(k, u)) { store[k] = JSON.stringify(v); kt[k] = +r.t; } t = Math.max(t, +r.t);
    }
    await q("insert into meta(k,v) values('gseed4','1') on conflict(k) do nothing");
  }
  for (const [k, v] of seed) { const r = (await q("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),'sistema',$3) on conflict(k) do nothing returning t", [k, v, Date.now()])).rows[0]; if (r) { if (canRead(k, u)) { store[k] = v; kt[k] = +r.t; } t = Math.max(t, +r.t); } }
  /* contraseña restablecida por six: tiene que cambiarla antes de usar la terminal */
  let must = false; try { must = JSON.parse((await q("select v from meta where k='mustpw'")).rows[0]?.v || "[]").includes(u.n); } catch { /* */ }
  return { me: { n: u.n, r: u.r, admin: u.admin, owner: u.owner, six: isSix(u), anita: !!u.anita, must }, store, kt, t, defRoster: defRoster(), acc };
}
