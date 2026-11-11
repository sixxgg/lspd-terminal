/* pestaña del navegador "cifrada": título con caracteres aleatorios y favicon animado; restaura todo al desmontar */
import { useEffect, useRef } from "react";

const GL = "0123456789ABCDEF#$%&@*<>/\\|=+?";
export const glyphs = (n: number, set = GL) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("");
/* bloques tipo "4F#A·Q9%K·Z2@X" */
export const cipher = (blocks = 3, len = 4) => Array.from({ length: blocks }, () => glyphs(len)).join("·");

const svg = (body: string) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`);
const BG = (glow: string) => `<rect width="64" height="64" rx="12" fill="#05070a"/><rect x="2" y="2" width="60" height="60" rx="11" fill="none" stroke="${glow}" stroke-opacity=".45" stroke-width="2"/>`;
/* íconos para la pestaña de los paneles privados */
export const TAB_ICONS: Record<string, [string, string]> = {
  calavera: ["Calavera", "M32 8C19 8 10 17 10 29c0 7 3 12 8 15v8c0 2 2 4 4 4h4v-6h4v6h4v-6h4v6h4c2 0 4-2 4-4v-8c5-3 8-8 8-15C54 17 45 8 32 8zm-10 30a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm20 0a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm-10 6-3-6h6z"],
  corazon: ["Corazón", "M32 54 12 34C6 28 6 18 13 13c6-4 13-2 19 5 6-7 13-9 19-5 7 5 7 15 1 21z"],
  banana: ["Banana", "M48 9c3 0 5 2 4 5-2 18-14 34-36 39-5 1-8-1-8-3 0-2 2-3 5-4 15-4 26-15 29-33 0-3 3-4 6-4zm2-3 4-2 1 3-3 2z"],
  estrella: ["Estrella", "m32 6 7.6 16.4L57 24.6 44 37l3.2 18L32 46.6 16.8 55 20 37 7 24.6l17.4-2.2z"],
  rayo: ["Rayo", "M36 4 12 36h16l-4 24 28-34H34z"],
  ojo: ["Ojo", "M32 16C18 16 8 32 8 32s10 16 24 16 24-16 24-16-10-16-24-16zm0 26a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-15a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"],
};
export const tabIcon = (k: string, fill: string, on = true) => svg(`${BG(fill)}<path fill="${fill}" fill-opacity="${on ? 1 : 0.45}" d="${(TAB_ICONS[k] || TAB_ICONS.calavera)[1]}"/>`);

function links() { return [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"],link[rel="apple-touch-icon"]')]; }
const setIco = (src: string) => links().forEach(l => { if (l.href !== src) l.href = src; });

/* frame(tick) → { title, icon } se llama cada `ms` */
export function useTabFx(frame: (k: number) => { title: string; icon?: string }, ms: number, deps: unknown[] = []) {
  const f = useRef(frame); f.current = frame;
  useEffect(() => {
    const t0 = document.title, old = links().map(l => l.href);
    let k = 0; const tick = () => { const r = f.current(k++); document.title = r.title; if (r.icon) setIco(r.icon); };
    tick(); const i = setInterval(tick, ms);
    return () => { clearInterval(i); document.title = t0; links().forEach((l, j) => { if (old[j]) l.href = old[j]; }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}

/* MDT: el favicon de la marca con un punto verde que parpadea ("en línea") */
export function onlineIcons(src: string): Promise<[string, string]> {
  const dot = (on: boolean) => `<circle cx="50" cy="50" r="11" fill="#05070a"/><circle cx="50" cy="50" r="8" fill="${on ? "#22ff88" : "#0d3b22"}"/>`;
  const fallback: [string, string] = [svg(`${BG("#22ff88")}<text x="32" y="30" font-family="monospace" font-weight="900" font-size="15" fill="#22ff88" text-anchor="middle">MDT</text>${dot(true)}`), svg(`${BG("#22ff88")}<text x="32" y="30" font-family="monospace" font-weight="900" font-size="15" fill="#22ff88" text-anchor="middle">MDT</text>${dot(false)}`)];
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const out = [true, false].map(on => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d")!;
          x.drawImage(img, 0, 0, 64, 64); x.beginPath(); x.arc(50, 50, 12, 0, 7); x.fillStyle = "#05070a"; x.fill();
          x.beginPath(); x.arc(50, 50, 8.5, 0, 7); x.fillStyle = on ? "#22ff88" : "#0d3b22"; x.shadowColor = "#22ff88"; x.shadowBlur = on ? 8 : 0; x.fill(); return c.toDataURL("image/png"); });
        res(out as [string, string]);
      } catch { res(fallback); }
    };
    img.onerror = () => res(fallback); img.src = src;
  });
}
