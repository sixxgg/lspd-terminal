// Servidor local para probar (imita a Vercel): sirve public/ y las funciones de api/.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const port = +process.env.PORT || 3000;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname.startsWith("/api/")) {
      const name = u.pathname.slice(5).replace(/[^a-z]/g, "");
      const mod = await import(path.join(root, "api", name + ".js"));
      return await mod.default(req, res);
    }
    const f = path.join(root, "public", u.pathname === "/" ? "index.html" : path.normalize(u.pathname));
    if (!f.startsWith(path.join(root, "public"))) { res.statusCode = 403; return res.end(); }
    const b = await readFile(f);
    res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream");
    res.end(b);
  } catch (e) { if (!res.headersSent) { res.statusCode = e.code === "ENOENT" ? 404 : 500; } res.end(String(e.code === "ENOENT" ? "" : e.stack)); }
}).listen(port, () => console.log("http://localhost:" + port));
