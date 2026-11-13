/* Registro de actividad (Logs de six): quién hizo qué y cuándo. Las ediciones seguidas de la misma persona sobre lo mismo
   (menos de 2 min) se juntan en una sola línea para no llenar el registro con cada tecla. */
import { q } from "./db.js";

let ready = null;
const init = () => (ready ||= q("create table if not exists logs(id bigserial primary key, t bigint not null, n text, a text, k text, d text, ip text)")
  .then(() => q("create index if not exists logs_t on logs(t)")).catch(e => { ready = null; throw e; }));

export async function audit(n, a, k = "", d = "", ip = "") {
  try {
    await init();
    const t = Date.now(); d = String(d || "").slice(0, 600);
    if (a === "editó") {
      const r = await q("update logs set t=$1, d=$2 where id=(select id from logs where n=$3 and k=$4 and a='editó' and t>$5 order by id desc limit 1) returning id", [t, d, n, k, t - 120000]);
      if (r.rowCount) return;
    }
    await q("insert into logs(t,n,a,k,d,ip) values($1,$2,$3,$4,$5,$6)", [t, n || "", a, k, d, String(ip || "").slice(0, 64)]);
    if (Math.random() < 0.01) await q("delete from logs where t < $1", [t - 120 * 864e5]); // se guardan 4 meses
  } catch { /* el registro nunca frena lo que se estaba haciendo */ }
}

export async function auditList({ before, who, text, limit = 200 }) {
  await init();
  const P = [], W = [];
  if (before) { P.push(+before); W.push(`t < $${P.length}`); }
  if (who) { P.push(who); W.push(`n = $${P.length}`); }
  if (text) { P.push("%" + text + "%"); W.push(`(k ilike $${P.length} or d ilike $${P.length} or a ilike $${P.length} or n ilike $${P.length})`); }
  P.push(Math.min(500, limit));
  const rows = (await q(`select id, t, n, a, k, d, ip from logs ${W.length ? "where " + W.join(" and ") : ""} order by t desc limit $${P.length}`, P)).rows;
  const who2 = (await q("select n, count(*)::int as c from logs group by n order by c desc limit 80")).rows;
  return { list: rows.map(r => ({ ...r, id: +r.id, t: +r.t })), who: who2 };
}

/* resumen de qué cambió entre el valor viejo y el nuevo */
const lab = x => (x && typeof x === "object" ? String(x.n || x.nombre || x.cand || x.titulo || x.tit || x.t2 || x.of || x.no || x.id || "").slice(0, 40) : String(x).slice(0, 40));
export function diffSum(a, b) {
  if (b == null) return a && a.startsWith("data:") ? "Imagen" : "";
  if (b.startsWith("data:")) return a ? "Reemplazó la imagen" : "Subió una imagen";
  let A, B; try { A = a == null ? null : JSON.parse(a); B = JSON.parse(b); } catch { return a == null ? `Texto (${b.length} caracteres)` : `Texto: ${a.length} → ${b.length} caracteres`; }
  if (Array.isArray(B)) {
    const L = Array.isArray(A) ? A : [], id = x => (x && typeof x === "object" && x.id != null ? "i" + x.id : "j" + JSON.stringify(x));
    const old = new Map(L.map(x => [id(x), x])), nw = new Map(B.map(x => [id(x), x]));
    const add = B.filter(x => !old.has(id(x))), del = L.filter(x => !nw.has(id(x))), ch = B.filter(x => old.has(id(x)) && JSON.stringify(old.get(id(x))) !== JSON.stringify(x));
    const f = (t, l) => (l.length ? `${t} ${l.length}${l.some(lab) ? ": " + l.slice(0, 4).map(lab).filter(Boolean).join(", ") + (l.length > 4 ? "…" : "") : ""}` : "");
    return [f("Agregó", add), f("Quitó", del), f("Modificó", ch)].filter(Boolean).join(" · ") || "Reordenó";
  }
  if (B && typeof B === "object") {
    const O = A && typeof A === "object" && !Array.isArray(A) ? A : {}, ks = new Set([...Object.keys(O), ...Object.keys(B)]);
    const add = [], del = [], ch = [];
    for (const k of ks) { if (!(k in O)) add.push(k); else if (!(k in B)) del.push(k); else if (JSON.stringify(O[k]) !== JSON.stringify(B[k])) ch.push(k); }
    const f = (t, l) => (l.length ? `${t}: ${l.slice(0, 5).join(", ")}${l.length > 5 ? ` (+${l.length - 5})` : ""}` : "");
    return [f("Agregó", add), f("Quitó", del), f("Cambió", ch)].filter(Boolean).join(" · ");
  }
  return `${JSON.stringify(A)} → ${JSON.stringify(B)}`.slice(0, 200);
}
