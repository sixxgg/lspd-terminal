/* LSSD › Supervisores › Entrevistas › Resultados: las respuestas del Google Form, leídas de su hoja de cálculo (Google Sheets) desde el servidor.
   Solo para Supervisores del LSSD para arriba (y six): el control es acá, no solo en los botones. La hoja sigue siendo la fuente; desde la terminal no se edita.
   Para leerla, la hoja tiene que estar compartida como «Cualquier persona con el enlace · Lector» (o publicada); si no, se avisa y queda el botón para abrirla.
   GET  → { cols, rows, at, form, sheet }   ·   POST {a:"links", form, sheet} → cambia los enlaces (Jefatura o six) */
import { q } from "../lib/db.js";
import { send, body, wrap, requireUser, isSix } from "../lib/core.js";

const DEF = { form: "https://forms.gle/ArTE5HkqK5b1b1Px8", sheet: "https://docs.google.com/spreadsheets/d/1h90UgFnT42e5Yo1S0RLFkKKZNQ06eglb4hurwCEnM_8/edit?usp=sharing" };
const K = "lspdt.lssd.entForm";
const sheetId = u => /\/spreadsheets\/d\/([\w-]{20,})/.exec(String(u || ""))?.[1] || "";
const canSee = u => isSix(u) || (u.dept === "lssd" && ((u.l || 0) >= 7 || !!u.dadm));
const canSet = u => isSix(u) || (u.dept === "lssd" && ((u.l || 0) >= 10 || !!u.dadm));
async function links() { try { const o = JSON.parse((await q("select v from kv where k=$1", [K])).rows[0]?.v || "null"); if (o && typeof o === "object") return { ...DEF, ...o }; } catch { /* */ } return DEF; }

/* CSV con comillas y saltos de línea dentro de las respuestas */
function csv(t) {
  const out = []; let row = [], cell = "", q2 = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q2) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q2 = false; } else cell += c; continue; }
    if (c === '"') q2 = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell); out.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c; }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}
const CACHE = new Map();

export default wrap(async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "POST") {
    const b = await body(req);
    if (b.a !== "links") return send(res, 400, { msg: "Acción desconocida" });
    if (!canSet(u)) return send(res, 403, { msg: "Solo Jefatura cambia los enlaces del formulario" });
    const form = String(b.form || "").trim().slice(0, 300), sheet = String(b.sheet || "").trim().slice(0, 300);
    if (!/^https:\/\/(forms\.gle|docs\.google\.com)\//.test(form) || !sheetId(sheet)) return send(res, 400, { msg: "Revisá los enlaces: el del formulario y el de la hoja de Google Sheets" });
    const v = JSON.stringify({ form, sheet }), now = Date.now();
    await q("insert into kv(k,v,t,by,at) values($1,$2,nextval('kv_seq'),$3,$4) on conflict(k) do update set v=excluded.v, t=excluded.t, by=excluded.by, at=excluded.at", [K, v, u.n, now]);
    CACHE.clear(); return send(res, 200, { ok: true });
  }
  if (!canSee(u)) return send(res, 403, { msg: "Los resultados son de Supervisores para arriba" });
  const L = await links(), id = sheetId(L.sheet), base = { form: L.form, sheet: L.sheet, canSet: canSet(u) };
  if (!id) return send(res, 200, { ...base, err: "No hay una hoja de cálculo configurada" });
  const c = CACHE.get(id); if (c && Date.now() - c.at < 60000) return send(res, 200, { ...base, ...c });
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`, { redirect: "follow" }).catch(() => null);
  const ct = r?.headers.get("content-type") || "";
  if (!r || !r.ok || !/text\/csv|text\/plain/.test(ct)) return send(res, 200, { ...base, err: r && (r.status === 401 || r.status === 403 || /text\/html/.test(ct)) ? "priv" : "Google no respondió, probá en un rato" });
  const rows = csv(await r.text()).filter(x => x.some(v => v.trim()));
  const out = { cols: rows[0] || [], rows: rows.slice(1).slice(-1000), at: Date.now() };
  CACHE.set(id, out); return send(res, 200, { ...base, ...out });
});
