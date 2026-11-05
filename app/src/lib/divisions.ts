/* Divisiones: descripción, colores tomados del logo y paleta de roles (igual que la versión clásica) */
import { useEffect, useState } from "react";
import { DIVS, divAb, divEmblem } from "./domain";
import { LS } from "./store";
import { UNITS, isRTD, isUMem, type UnitKey } from "./units";

export const DIV_DESC: Record<string, string> = {
  "Detective Bureau": "Investigaciones criminales del departamento: delitos graves, crimen organizado, narcotráfico y delitos tecnológicos.",
  "Metropolitan Division": "Unidad de élite de apoyo táctico: operaciones de alto riesgo, despliegues especiales y respuesta a incidentes críticos.",
  "Air Support Division": "Apoyo aéreo del departamento: patrullaje, seguimiento de persecuciones y coordinación desde el aire.",
  "Administration Services Bureau": "Gestión administrativa del departamento: personal, documentación, registros y soporte interno.",
  "High Speed Interception Unit": "Interceptación de vehículos a alta velocidad y control de persecuciones en vía pública.",
  "Recruitment and Training Division": "Reclutamiento, selección y formación de nuevos aspirantes y agentes del LSPD.",
  "Professional Standards Bureau": "Asuntos internos: vela por la integridad, la conducta y la ética de todo el personal del departamento.",
  "K-9 Division": "Unidad canina: detección de sustancias y explosivos, búsqueda de personas y apoyo en operativos.",
};
export const DIV_DONE: Record<string, "rtd" | UnitKey> = { "Recruitment and Training Division": "rtd", "Air Support Division": "asd", "K-9 Division": "k9", "Professional Standards Bureau": "psb" };
export const divOpen = (d: string, me: string) => { const k = DIV_DONE[d]; return k === "rtd" ? isRTD(me) : k ? isUMem(k, me) : false; };
export const subsOf = (d: string) => DIVS.find(x => x[0] === d)?.[1] || [];

/* colores: [acento, claro, oscuro] — por defecto los medidos del logo oficial; con un logo propio se calculan */
const DVC_DEF: Record<string, [string, string, string]> = { "Recruitment and Training Division": ["#b3262a", "#d8c282", "#0a1446"], "Metropolitan Division": ["#1f6fb0", "#eef3f5", "#0b3f66"],
  "Underwater Dive Unit": ["#b7985d", "#f0ecde", "#0d0d0c"], "Major Crimes Division": ["#d4a937", "#dbd5c0", "#141216"], "High Tech Crime Unit": ["#c9a24a", "#e3cf9f", "#0e0e12"],
  "Gang and Narcotics Division": ["#3f8f3a", "#d4bd7a", "#121412"], "Air Support Division": ["#1b8cb9", "#e2c66a", "#0b0e15"], "K-9 Division": ["#1f8f4a", "#e6c65a", "#0b1a12"], "Professional Standards Bureau": ["#2f5bd3", "#e6c65a", "#0b1f3a"] };
const DVC: Record<string, [string, string, string]> = (() => { try { return JSON.parse(localStorage.getItem("lspdt.dvc") || "{}"); } catch { return {}; } })();
export const hexRgb = (h: string) => { const x = h.replace("#", ""); const n = parseInt(x.length === 3 ? x.split("").map(c => c + c).join("") : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const busy = new Set<string>(), subs = new Set<() => void>();
function loadColors(src: string) {
  if (!src || DVC[src] || busy.has(src)) return; busy.add(src);
  const img = new Image(); img.crossOrigin = "anonymous";
  img.onload = () => { try {
    const S = 48, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d", { willReadFrequently: true })!; x.drawImage(img, 0, 0, S, S);
    const px = x.getImageData(0, 0, S, S).data, B: Record<string, { n: number; r: number; g: number; b: number; s: number }> = {};
    for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 200) continue; const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
      if (mx < 35 || mn > 225) continue; const k = (r >> 5) + "," + (g >> 5) + "," + (b >> 5); const o = B[k] || (B[k] = { n: 0, r: 0, g: 0, b: 0, s: 0 }); o.n++; o.r += r; o.g += g; o.b += b; o.s += sat; }
    const L = Object.values(B).map(o => ({ c: [o.r / o.n, o.g / o.n, o.b / o.n], sc: o.n * (0.25 + o.s / o.n) })).sort((a, b) => b.sc - a.sc);
    const hue = ([r, g, b]: number[]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return -1; const h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn); return (h * 60 + 360) % 360; };
    const pick: number[][] = []; for (const o of L) { if (pick.length >= 3) break; if (pick.every(p => Math.abs(hue(p) - hue(o.c)) > 28 || Math.hypot(...p.map((v, i) => v - o.c[i])) > 90)) pick.push(o.c); }
    while (pick.length < 3) pick.push(pick[0] || [124, 156, 255]);
    const hex = pick.map(c => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join(""));
    const lum = (h: string) => { const [r, g, b] = hexRgb(h); return 0.3 * r + 0.59 * g + 0.11 * b; };
    const sorted = [...hex].sort((a, b) => lum(a) - lum(b)); DVC[src] = [hex[0], sorted[2], sorted[0]];
    try { localStorage.setItem("lspdt.dvc", JSON.stringify(DVC)); } catch { /* */ }
    subs.forEach(f => f());
  } catch { /* imagen sin CORS */ } };
  img.src = src;
}
export function divColors(d: string): [string, string, string] {
  const def = !LS.get("lspdt.divlogo." + d) && DVC_DEF[d]; if (def) return def;
  const src = divEmblem(d); if (src && DVC[src]) return DVC[src];
  if (src) loadColors(src);
  const c = divAb(d)[1]; return [c, "#e6c65a", "#0b1220"];
}
export function useDivColors(d: string) {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set(x => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return divColors(d);
}
/* roles de la unidad: de mayor a menor, tono claro del logo, acento, tono oscuro, versiones más suaves y gris para el último */
const mix = (a: number[], b: number[], f: number) => a.map((v, i) => v + (b[i] - v) * f), lumA = (a: number[]) => 0.3 * a[0] + 0.59 * a[1] + 0.11 * a[2];
const lift = (a: number[]) => { let c = a; for (let i = 0; i < 8 && lumA(c) < 125; i++) c = mix(c, [255, 255, 255], 0.18); return c; };
const toHex = (a: number[]) => "#" + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export function unitPalette(k: UnitKey): { roles: Record<string, string>; acc: string } {
  const u = UNITS[k], p = divColors(u.d);
  const L = lift(hexRgb(p[1])), A = lift(hexRgb(p[0])), D = lift(mix(hexRgb(p[2]), hexRgb(p[0]), 0.55)), W = [255, 255, 255], G = [138, 143, 151], n = u.R.length;
  const P = [L, A, D, mix(A, W, 0.42), mix(D, W, 0.4), mix(L, G, 0.45), mix(A, G, 0.5)];
  const roles: Record<string, string> = {}; u.R.forEach((r, i) => { roles[r[0]] = toHex(i === n - 1 && n > 2 ? G : P[Math.min(i, P.length - 1)]); });
  u.SUB?.forEach(r => { roles[r[0]] = r[2]; });
  return { roles, acc: toHex(L) };
}
