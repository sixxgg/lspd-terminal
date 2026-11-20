import { q } from "./db.js";
import { defRoster, canRead, isSix, mdMap } from "./core.js";
import { GEN, ROLES_SEED, CALL_SEED, REC_SEED, seedFor } from "./divs.js";
import { LSSD_DEF, LSSD_KEY } from "./lssd.js";

export const imgUrl = (k, t) => `/api/img?k=${encodeURIComponent(k)}&t=${t}`;
export const SEL = "select k, t, v like 'data:%' as img, case when v like 'data:%' then null else v end as v from kv";

/* cómo recibe cada persona algunas claves: el roster del LSSD suma los perros del K-9 y a las cuentas del LSSD y la SAHP
   no les llega el usuario OOC de nadie. Se usa al iniciar y en cada sincronización. */
export function shapeVal(k, v, u) {
  if (v == null || (k !== LSSD_KEY && k !== "lspdt.sahp.roster")) return v;
  try { let L = JSON.parse(v); if (!Array.isArray(L)) return v;
    if (k === LSSD_KEY && !L.some(a => a && a.r === "K-9")) L = [...L, ...LSSD_DEF.filter(a => a.r === "K-9")];
    if ((k === LSSD_KEY && u.dept === "lssd") || (k === "lspdt.sahp.roster" && u.dept === "sahp")) L = L.map(({ u: _u, ...a }) => a);
    return JSON.stringify(L); } catch { return v; }
}
/* Todo lo que necesita la terminal al iniciar sesión.
   have = {clave: t} de lo que el navegador ya tiene guardado: entonces la base solo manda los valores que cambiaron
   (más la lista de claves vigentes) y no toda la base en cada carga. Eso es lo que gastaba la transferencia del mes. */
export async function fullData(u, have) {
  const delta = have && typeof have === "object";
  const rows = delta
    ? (await q(`select k, t, v like 'data:%' as img, null as v from kv where v is not null
      union all select '~max', coalesce(max(t),0), false, null from kv
      union all select '~acc:' || name, coalesce(last,0), false, null from accounts`)).rows
    : (await q(`${SEL} where v is not null
      union all select '~max', coalesce(max(t),0), false, null from kv
      union all select '~acc:' || name, coalesce(last,0), false, null from accounts`)).rows;
  const store = {}, kt = {}, acc = {}, keys = [], need = []; let t = 0;
  for (const r of rows) {
    if (r.k === "~max") t = +r.t;
    else if (r.k.startsWith("~acc:")) acc[r.k.slice(5)] = +r.t;
    else if (!canRead(r.k, u)) continue;
    else { kt[r.k] = +r.t; keys.push(r.k);
      if (r.img) { if (!delta || have[r.k] !== +r.t) store[r.k] = imgUrl(r.k, r.t); }
      else if (!delta) store[r.k] = r.v;
      else if (have[r.k] !== +r.t) need.push(r.k); }
  }
  if (need.length) for (const r of (await q("select k, v from kv where k = any($1)", [need])).rows) store[r.k] = r.v;
  for (const k of [LSSD_KEY, "lspdt.sahp.roster"]) if (store[k] != null) store[k] = shapeVal(k, store[k], u);
  const mdRaw = async () => store["lspdt.mdRoster"] ?? (await q("select v from kv where k='lspdt.mdRoster'")).rows[0]?.v;
  /* rosters iniciales de las divisiones nuevas: se guardan una sola vez */
  const all = new Set(rows.map(r => r.k)), seed = [];
  for (const id of Object.keys(GEN)) {
    if (!all.has("lspdt.groster." + id)) seed.push(["lspdt.groster." + id, JSON.stringify(seedFor(id, mdMap(await mdRaw())))]);
    if (ROLES_SEED[id] && !all.has("lspdt.groles." + id)) seed.push(["lspdt.groles." + id, JSON.stringify(ROLES_SEED[id])]);
    if (CALL_SEED[id] && !all.has("lspdt.gcall." + id)) seed.push(["lspdt.gcall." + id, JSON.stringify(CALL_SEED[id])]);
  }
  for (const [k, v] of Object.entries(REC_SEED)) if (!all.has(k)) seed.push([k, JSON.stringify(v)]);
  /* una sola vez (v2.1.1): si ya existían rosters o roles cargados a mano, se les suman los integrantes y roles de la plantilla que falten */
  if (!(await q("select 1 from meta where k='gseed3'")).rows.length) {
    const js = v => { try { return JSON.parse(v); } catch { return null; } }, upd = [];
    for (const id of Object.keys(GEN)) {
      const rk = "lspdt.groster." + id, cur = all.has(rk) ? js(store[rk] ?? (await q("select v from kv where k=$1", [rk])).rows[0]?.v) : null;
      if (cur && typeof cur === "object") { const add = Object.fromEntries(Object.entries(seedFor(id, mdMap(await mdRaw()))).filter(([n]) => !cur[n])); if (Object.keys(add).length) upd.push([rk, JSON.stringify({ ...cur, ...add })]); }
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
  let must = false; try { must = JSON.parse((await q("select v from meta where k='mustpw'")).rows[0]?.v || "[]").includes(u.acc || u.n); } catch { /* */ }
  /* roster del LSSD: si six todavía no lo cargó, va el de la planilla (sin el usuario OOC) */
  if (!all.has(LSSD_KEY) && canRead(LSSD_KEY, u)) { store[LSSD_KEY] = JSON.stringify(LSSD_DEF.map(({ u: _u, ...a }) => a)); keys.push(LSSD_KEY); kt[LSSD_KEY] = 0; }
  { const ks = new Set(keys); for (const k of Object.keys(store)) if (!ks.has(k)) keys.push(k); } /* lo sembrado recién también va en la lista */
  /* LSSD y SAHP: no reciben el roster del LSPD ni la lista de cuentas */
  if (u.dept) return { me: { n: u.n, r: u.r, p: u.p, dept: u.dept, admin: false, owner: false, six: false, anita: false, dadm: !!u.dadm, must }, store, kt, t, defRoster: [], acc: {}, ...(delta ? { delta: 1, keys } : {}) };
  return { me: { n: u.n, r: u.r, admin: u.admin, owner: u.owner, six: isSix(u), anita: !!u.anita, must }, store, kt, t, defRoster: defRoster(), acc, ...(delta ? { delta: 1, keys } : {}) };
}
