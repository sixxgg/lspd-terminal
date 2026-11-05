import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "/next/",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: process.env.OUT || "../public/next", emptyOutDir: true, chunkSizeWarningLimit: 800 },
  server: { proxy: { "/api": "http://localhost:3100" } },
});
