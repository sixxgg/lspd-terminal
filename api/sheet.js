import { send, query, wrap, requireUser } from "../lib/core.js";
import { readFile } from "node:fs/promises";

/* Lee una planilla de Google Sheets compartida como "Cualquier persona con el enlace puede ver"
   y la devuelve como CSV. Se cachea 30 s en Vercel para no pedirla en cada sincronización. */
export default wrap(async (req, res) => {
  const u = await requireUser(req, res);
  if (!u) return;
  const url = String(query(req).url || "");
  const m = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(url);
  if (!m) return send(res, 400, { msg: "El enlace no es de una planilla de Google Sheets" });
  const gid = (/[#&?]gid=(\d+)/.exec(url) || [])[1] || "0";
  let csv;
  if (process.env.SHEET_MOCK) csv = await readFile(process.env.SHEET_MOCK, "utf8"); // solo para pruebas locales
  else {
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`, {
      redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "User-Agent": "LSPD-Terminal" }
    }).catch(() => null);
    if (!r) return send(res, 502, { msg: "No se pudo conectar con Google Sheets" });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || type.includes("text/html")) return send(res, 403, { msg: "La planilla no es pública. En Google Sheets: Compartir → Acceso general → «Cualquier persona con el enlace» (Lector)." });
    csv = await r.text();
  }
  if (csv.length > 2e6) return send(res, 413, { msg: "La planilla es demasiado grande" });
  res.setHeader("Cache-Control", "private, max-age=20");
  return send(res, 200, { csv, at: Date.now(), id: m[1], gid }, { "Cache-Control": "private, max-age=20" });
});
