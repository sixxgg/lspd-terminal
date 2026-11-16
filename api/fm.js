/* Fivemanager (galería): lista las imágenes de la cuenta para elegirlas desde la terminal.
   La clave de la API vive solo en el servidor (meta «fm:key», o la variable FIVEMANAGE_API_KEY): nunca llega al navegador ni al repo.
   GET  ?page=N  → imágenes (six, administración y habilitados de la galería)
   POST {a:"key", k} → guarda/borra la clave (six o administración) · POST {a:"has"} → si hay clave cargada */
import { q } from "../lib/db.js";
import { send, body, query, wrap, requireUser, isSix } from "../lib/core.js";

const MK = "fm:key", API = "https://api.fivemanage.com/api/v3/file";
const key = async () => (await q("select v from meta where k=$1", [MK])).rows[0]?.v || process.env.FIVEMANAGE_API_KEY || "";
async function canGal(u) {
  if (isSix(u) || u.admin) return true;
  try { return JSON.parse((await q("select v from kv where k='lspdt.galEditors'")).rows[0]?.v || "[]").includes(u.n); } catch { return false; }
}

export default wrap(async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  if (req.method === "GET") {
    if (!(await canGal(u))) return send(res, 403, { msg: "No tenés acceso a la galería" });
    const k = await key(); if (!k) return send(res, 200, { nokey: true, data: [] });
    const page = Math.max(1, Math.min(500, Number(query(req).page) || 1));
    const r = await fetch(`${API}?type=image&limit=60&page=${page}`, { headers: { Authorization: k } }).catch(() => null);
    if (!r || !r.ok) return send(res, 502, { msg: r?.status === 401 ? "Fivemanager rechazó la clave: cargala de nuevo en Administración › Galería" : "Fivemanager no respondió, probá en un rato" });
    const j = await r.json().catch(() => ({}));
    const data = (j.data || []).filter(f => f && f.url).map(f => ({ id: String(f.id), url: String(f.url), name: String(f.filename || ""), size: Number(f.size) || 0 }));
    res.setHeader("Cache-Control", "no-store");
    return send(res, 200, { data, page, total: Number(j.pagination?.total) || data.length });
  }
  if (req.method !== "POST") return send(res, 405, { msg: "Método no permitido" });
  const b = await body(req);
  if (b.a === "has") return send(res, 200, { has: !!(await key()) });
  if (b.a === "key") {
    if (!isSix(u) && !u.admin) return send(res, 403, { msg: "Solo six o la administración cargan la clave" });
    const k = String(b.k || "").trim().slice(0, 300);
    if (!k) { await q("delete from meta where k=$1", [MK]); return send(res, 200, { has: !!process.env.FIVEMANAGE_API_KEY }); }
    const r = await fetch(`${API}?type=image&limit=1`, { headers: { Authorization: k } }).catch(() => null);
    if (!r || !r.ok) return send(res, 400, { msg: r?.status === 401 ? "Fivemanager rechazó esa clave" : "No se pudo verificar la clave con Fivemanager" });
    await q("insert into meta(k,v) values($1,$2) on conflict(k) do update set v=excluded.v", [MK, k]);
    return send(res, 200, { has: true });
  }
  return send(res, 400, { msg: "Acción inválida" });
});
