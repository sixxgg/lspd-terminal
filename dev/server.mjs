// Servidor local para probar (imita a Vercel): sirve public/ y las funciones de api/.
// Antes hay que compilar la app: cd app && npm ci && npm run build (genera public/next).
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const port = +process.env.PORT || 3100; /* el mismo puerto al que apunta el proxy de app/vite.config.ts */
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".woff": "font/woff", ".woff2": "font/woff2", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".txt": "text/plain; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname.startsWith("/api/")) {
      const name = u.pathname.slice(5).replace(/[^a-z]/g, "");
      const mod = await import(path.join(root, "api", name + ".js"));
      return await mod.default(req, res);
    }
    /* igual que vercel.json: «/» muestra la app y /next/ también */
    const p = u.pathname === "/" ? "/next/index.html" : u.pathname.endsWith("/") ? u.pathname + "index.html" : u.pathname;
    const f = path.join(root, "public", path.normalize(decodeURIComponent(p)));
    if (!f.startsWith(path.join(root, "public") + path.sep)) { res.statusCode = 403; return res.end(); }
    const b = await readFile(f);
    res.setHeader("Content-Type", types[path.extname(f).toLowerCase()] || "application/octet-stream");
    res.end(b);
  } catch (e) { if (!res.headersSent) { res.statusCode = e.code === "ENOENT" ? 404 : 500; } res.end(String(e.code === "ENOENT" ? "" : e.stack)); }
}).listen(port, () => console.log("http://localhost:" + port));
