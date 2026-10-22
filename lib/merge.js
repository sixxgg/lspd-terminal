/* Fusión de 3 vías para valores JSON.
   base = lo que el cliente vio la última vez, mine = lo que quiere guardar, cur = lo que hay hoy en la base de datos.
   Conserva los cambios de las dos partes: si dos personas editan cosas distintas a la vez, no se pisan. */

const isObj = x => x !== null && typeof x === "object" && !Array.isArray(x);

export function stable(x) {
  if (Array.isArray(x)) return "[" + x.map(stable).join(",") + "]";
  if (isObj(x)) return "{" + Object.keys(x).sort().map(k => JSON.stringify(k) + ":" + stable(x[k])).join(",") + "}";
  return JSON.stringify(x === undefined ? null : x);
}
const eq = (a, b) => a === b || (a !== undefined && b !== undefined && stable(a) === stable(b));
const keyOf = x => (isObj(x) && (typeof x.id === "string" || typeof x.id === "number")) ? "#" + x.id : "=" + stable(x);

function mergeArr(base, mine, cur) {
  const B = new Map((base || []).map(x => [keyOf(x), x]));
  const M = new Map(mine.map(x => [keyOf(x), x]));
  const C = new Map(cur.map(x => [keyOf(x), x]));
  const out = [];
  const keep = k => {
    const inB = B.has(k), inM = M.has(k), inC = C.has(k);
    if (inM && inC) return merge3(B.get(k), M.get(k), C.get(k));
    if (inM && !inB) return M.get(k);       // lo agregué yo
    if (inC && !inB) return C.get(k);       // lo agregó otro
    return undefined;                       // alguien lo quitó
  };
  // nuevos de otros que en su lista estaban antes del primer elemento compartido van al principio
  const shared = cur.findIndex(x => M.has(keyOf(x)) || B.has(keyOf(x)));
  const front = [], back = [];
  cur.forEach((x, i) => { const k = keyOf(x); if (!M.has(k) && !B.has(k)) (shared >= 0 && i < shared ? front : back).push(x); });
  const seen = new Set();
  for (const x of front) { seen.add(keyOf(x)); out.push(x); }
  for (const x of mine) { const k = keyOf(x); if (seen.has(k)) continue; seen.add(k); const v = keep(k); if (v !== undefined) out.push(v); }
  for (const x of back) { const k = keyOf(x); if (seen.has(k)) continue; seen.add(k); out.push(x); }
  return out;
}

export function merge3(base, mine, cur) {
  if (eq(mine, base)) return cur;
  if (eq(cur, base) || eq(cur, mine)) return mine;
  if (isObj(mine) && isObj(cur)) {
    const b = isObj(base) ? base : {}, out = {};
    for (const k of new Set([...Object.keys(mine), ...Object.keys(cur), ...Object.keys(b)])) {
      const v = merge3(b[k], mine[k], cur[k]);
      if (v !== undefined) out[k] = v;
    }
    // respeta el orden de claves de "mine"
    return out;
  }
  if (Array.isArray(mine) && Array.isArray(cur)) return mergeArr(Array.isArray(base) ? base : [], mine, cur);
  return mine; // valores simples: gana el último en guardar
}

/* Fusiona dos textos JSON. Si alguno no es JSON, gana "mine". */
export function mergeText(baseT, mineT, curT) {
  if (curT == null || mineT == null || baseT === curT) return mineT;
  let b, m, c;
  try { m = JSON.parse(mineT); c = JSON.parse(curT); } catch { return mineT; }
  try { b = baseT == null ? undefined : JSON.parse(baseT); } catch { b = undefined; }
  if (typeof m !== "object" || m === null || typeof c !== "object" || c === null) return mineT;
  const r = merge3(b, m, c);
  return eq(r, m) ? mineT : JSON.stringify(r);
}
