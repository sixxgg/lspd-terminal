import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

/* cada build tiene su id; la app lo compara con /next/version.json para avisar que hay una versión nueva */
const BUILD = Date.now().toString(36);
/* número de versión (el de Novedades) para mostrarlo en el aviso de actualización */
const VER = (/APP_VERSION = "([^"]+)"/.exec(readFileSync(new URL("./src/sections/Novedades.tsx", import.meta.url), "utf8")) || [])[1] || "";

export default defineConfig({
  base: "/next/",
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [react(), { name: "version-json", generateBundle() { this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ b: BUILD, v: VER, t: Date.now() }) }); } }],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: process.env.OUT || "../public/next", emptyOutDir: true, target: "es2020", chunkSizeWarningLimit: 800,
    rollupOptions: { output: { manualChunks: { react: ["react", "react-dom"], icons: ["lucide-react"] } } } },
  server: { proxy: { "/api": "http://localhost:3100" } },
});
