/* Apariencia: temas (los mismos de la versión clásica), color de acento, efecto de pantalla, marco de tablet, brillo neón,
   tipografía y puntero. Las claves son las mismas que en la clásica, así la elección se comparte entre las dos versiones. */
import { useSyncExternalStore } from "react";

type Skin = { l: string; dark: boolean; sw: [string, string, string]; bg: string; card: string; soft: string; line: string; ink: string; mut: string; acc: string };
export const SKINS: Record<string, Skin> = {
  nuevo: { l: "Nuevo · oscuro", dark: true, sw: ["#020617", "#0f172a", "#6366f1"], bg: "#020617", card: "#0f172a", soft: "#1e293b", line: "#334155", ink: "#f1f5f9", mut: "#94a3b8", acc: "#6366f1" },
  nuevoc: { l: "Nuevo · claro", dark: false, sw: ["#f8fafc", "#0f172a", "#6366f1"], bg: "#f8fafc", card: "#ffffff", soft: "#f1f5f9", line: "#e2e8f0", ink: "#0f172a", mut: "#64748b", acc: "#6366f1" },
  eleven: { l: "Eleven", dark: true, sw: ["#151348", "#0b122f", "#7c9cff"], bg: "#151348", card: "#1b1a55", soft: "#242366", line: "#2c2b6e", ink: "#eceef2", mut: "#a1a6b3", acc: "#7c9cff" },
  light: { l: "Claro", dark: false, sw: ["#eef1f5", "#0b1f3a", "#c9a227"], bg: "#eef1f5", card: "#ffffff", soft: "#f4f6f9", line: "#d9dfe8", ink: "#0b1f3a", mut: "#5b6b82", acc: "#c9a227" },
  sand: { l: "Arena", dark: false, sw: ["#f4efe6", "#5a3e1b", "#c08a2e"], bg: "#f4efe6", card: "#fffdf8", soft: "#f8f3ea", line: "#e4dac8", ink: "#3d2a12", mut: "#7a6a55", acc: "#c08a2e" },
  sky: { l: "Celeste", dark: false, sw: ["#eef6fb", "#0c4a6e", "#0ea5e9"], bg: "#eef6fb", card: "#ffffff", soft: "#f3f9fd", line: "#cfe3f0", ink: "#0c4a6e", mut: "#4b6b80", acc: "#0ea5e9" },
  dark: { l: "Oscuro", dark: true, sw: ["#060d1a", "#0e1a2d", "#e6c65a"], bg: "#060d1a", card: "#0e1a2d", soft: "#14233b", line: "#24385a", ink: "#e9eef7", mut: "#8fa1bd", acc: "#e6c65a" },
  moon: { l: "Moonlight", dark: true, sw: ["#1a1b26", "#2f334d", "#c099ff"], bg: "#1a1b26", card: "#222436", soft: "#2a2d45", line: "#2f334d", ink: "#c8d3f5", mut: "#828bb8", acc: "#c099ff" },
  midnight: { l: "Medianoche", dark: true, sw: ["#020617", "#0f172a", "#38bdf8"], bg: "#020617", card: "#0b1224", soft: "#111b33", line: "#1c2742", ink: "#e2e8f0", mut: "#8193b2", acc: "#38bdf8" },
  red: { l: "Rojo", dark: true, sw: ["#120708", "#5c141b", "#ef4444"], bg: "#120708", card: "#1d0c0e", soft: "#2a1215", line: "#3a1a1e", ink: "#f3e8e8", mut: "#b39a9c", acc: "#ef4444" },
  wine: { l: "Vino", dark: true, sw: ["#14080d", "#6b1838", "#e8b4c8"], bg: "#14080d", card: "#200d16", soft: "#2c1220", line: "#3d1a2b", ink: "#f4e9ee", mut: "#b39aa6", acc: "#e8b4c8" },
  emerald: { l: "Esmeralda", dark: true, sw: ["#04120c", "#065f46", "#34d399"], bg: "#04120c", card: "#0a1d15", soft: "#0f2a1f", line: "#183a2b", ink: "#e6f4ee", mut: "#93b3a5", acc: "#34d399" },
  amethyst: { l: "Amatista", dark: true, sw: ["#0f0a1a", "#4c1d95", "#a78bfa"], bg: "#0f0a1a", card: "#191128", soft: "#221838", line: "#2f2148", ink: "#ede8f7", mut: "#a59bbd", acc: "#a78bfa" },
  ocean: { l: "Océano", dark: true, sw: ["#04141a", "#115e59", "#2dd4bf"], bg: "#04141a", card: "#0a1f27", soft: "#0f2a34", line: "#173a45", ink: "#e3f2f2", mut: "#8fb0b3", acc: "#2dd4bf" },
  graphite: { l: "Grafito", dark: true, sw: ["#111111", "#262626", "#e6c65a"], bg: "#0f0f10", card: "#1a1a1c", soft: "#222225", line: "#2c2c30", ink: "#ededed", mut: "#a3a3a3", acc: "#e6c65a" },
  dracula: { l: "Drácula", dark: true, sw: ["#282a36", "#44475a", "#ff79c6"], bg: "#21222c", card: "#282a36", soft: "#343746", line: "#44475a", ink: "#f8f8f2", mut: "#a4a8c4", acc: "#ff79c6" },
  nord: { l: "Nord", dark: true, sw: ["#2e3440", "#3b4252", "#88c0d0"], bg: "#2a2f3a", card: "#2e3440", soft: "#3b4252", line: "#434c5e", ink: "#eceff4", mut: "#a3adbf", acc: "#88c0d0" },
};
export const ACCENTS = ["#7c9cff", "#60a5fa", "#22d3ee", "#22c55e", "#facc15", "#f97316", "#ef4444", "#e879f9", "#e5e7eb", "#c9a227"];
export const CRT_V: Record<string, [string, string]> = {
  suave: ["Suave", "Líneas finas y viñeta leve"], clasico: ["Clásico", "Televisor de tubo: líneas marcadas y bordes oscuros"], retro: ["Monitor retro", "Pantalla curva con máscara de fósforo"],
  fosforo: ["Fósforo verde", "Monitor policial verde"], ambar: ["Ámbar", "Monitor de terminal ámbar"], vhs: ["VHS", "Ruido, desfase de color y franjas"],
  vhsplay: ["VHS · cinta gastada", "Ruido fuerte, franja de tracking y temblor"], interf: ["Interferencia", "Estática y líneas que suben"], glitch: ["Glitch", "Cortes de señal con desfase de color"], "0": ["Desactivado", ""],
};
export const CURS: Record<string, { l: string; h?: [number, number] }> = {
  sys: { l: "Del sistema" }, arrow: { l: "Flecha sólida", h: [3, 2] }, outline: { l: "Flecha clara", h: [3, 2] }, dark: { l: "Flecha oscura", h: [3, 2] },
  cross: { l: "Mira táctica", h: [16, 16] }, dot: { l: "Punto", h: [16, 16] }, ring: { l: "Anillo", h: [16, 16] },
};

/* ---- lectura de preferencias (locales de cada navegador; las del departamento llegan por lspdt.ui) ---- */
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* */ } };
let deptUi: Record<string, string> = {};
export const setDeptUi = (u: Record<string, string>) => { const t = JSON.stringify(u); if (t !== JSON.stringify(deptUi)) { deptUi = u; applyAppearance(); } };
export const deptUiNow = () => deptUi;
export type Pref = { skin: string; skinOwn: boolean; acc: string; crt: string; crtI: number; frame: boolean; neon: boolean; font: string; cur: string; curOwn: boolean };
export function pref(): Pref {
  const s = lsGet("lspdt.theme"), old = lsGet("lspdt.next.theme");
  const skin = s && SKINS[s] ? s : SKINS[deptUi.theme] ? deptUi.theme : old === "light" ? "nuevoc" : "nuevo";
  const c = lsGet("lspdt.crt"), i = parseInt(lsGet("lspdt.crtI") || "");
  const cu = lsGet("lspdt.cursor");
  return { skin, skinOwn: !!(s && SKINS[s]), acc: lsGet("lspdt.accent") || "", crt: c === "0" ? "0" : c && CRT_V[c] ? c : "suave", crtI: isNaN(i) ? 70 : Math.max(0, Math.min(100, i)),
    frame: lsGet("lspdt.frame") !== "0", neon: lsGet("lspdt.next.neon") !== "0", font: lsGet("lspdt.next.font") || "inter",
    cur: cu && CURS[cu] ? cu : CURS[deptUi.cursor] ? deptUi.cursor : "sys", curOwn: !!(cu && CURS[cu]) };
}
const subs = new Set<() => void>(); let ver = 0;
export const usePref = () => { useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => ver); return pref(); };
export function setPref(k: "skin" | "acc" | "crt" | "crtI" | "frame" | "neon" | "font" | "cur", v: string | number | boolean | null) {
  const key = { skin: "lspdt.theme", acc: "lspdt.accent", crt: "lspdt.crt", crtI: "lspdt.crtI", frame: "lspdt.frame", neon: "lspdt.next.neon", font: "lspdt.next.font", cur: "lspdt.cursor" }[k];
  lsSet(key, v === null || v === "" ? null : typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  applyAppearance();
}

/* ---- colores ---- */
const rgb = (h: string) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: number[], b: number[], f: number) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const trip = (a: number[]) => a.join(" ");
const lum = (a: number[]) => (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) / 255;
const W = [255, 255, 255], K = [0, 0, 0];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
function neutral(s: Skin): number[][] {
  const bg = rgb(s.bg), card = rgb(s.card), soft = rgb(s.soft), line = rgb(s.line), ink = rgb(s.ink), mut = rgb(s.mut);
  if (s.dark) return [mix(ink, W, 0.5), ink, mix(mut, ink, 0.75), mix(mut, ink, 0.45), mut, mix(mut, line, 0.35), mix(line, mut, 0.3), line, soft, card, bg];
  return [bg, soft, line, mix(line, mut, 0.45), mix(line, mut, 0.78), mut, mix(mut, ink, 0.45), mix(mut, ink, 0.7), mix(mut, ink, 0.86), ink, mix(ink, K, 0.35)];
}
function brand(acc: string): number[][] {
  const a = rgb(acc);
  return [mix(a, W, 0.92), mix(a, W, 0.84), mix(a, W, 0.68), mix(a, W, 0.48), mix(a, W, 0.24), a, mix(a, K, 0.14), mix(a, K, 0.3), mix(a, K, 0.45), mix(a, K, 0.58), mix(a, K, 0.72)];
}
export function applyAppearance() {
  const p = pref(), s = SKINS[p.skin], root = document.documentElement, st = root.style;
  root.classList.toggle("dark", s.dark);
  const N = neutral(s), acc = /^#[0-9a-f]{6}$/i.test(p.acc) ? p.acc : s.acc, B = brand(acc);
  STEPS.forEach((k, i) => { st.setProperty(`--n-${k}`, trip(N[i])); st.setProperty(`--b-${k}`, trip(B[i])); });
  st.setProperty("--card", trip(rgb(s.card)));
  /* texto sobre el acento: blanco o casi negro según lo claro que sea */
  const on = (c: number[]) => trip(lum(c) > 0.6 ? [11, 12, 16] : W);
  st.setProperty("--b-ink5", on(B[5])); st.setProperty("--b-ink6", on(B[6]));
  root.dataset.skin = p.skin; root.classList.toggle("neon", p.neon); root.classList.toggle("font-classic", p.font === "public");
  const b = document.body; if (b) {
    b.classList.toggle("nocrt", p.crt === "0" || p.crtI === 0); b.style.setProperty("--ci", (p.crtI / 100).toFixed(2));
    Object.keys(CRT_V).forEach(k => b.classList.toggle("crt-" + k, k === p.crt && k !== "0"));
  }
  applyCursor(p.cur, acc);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", s.bg);
  ver++; subs.forEach(f => f());
}
export function curSvg(k: string, c: string, pnt: boolean) {
  const A = "M3 2 L3 24 L9 18.3 L13.4 28 L17.2 26.4 L12.9 16.9 L21 16.9 Z";
  const s: Record<string, string> = {
    arrow: `<path d="${A}" fill="${c}" stroke="#0b0f17" stroke-width="1.6" stroke-linejoin="round"/>${pnt ? `<circle cx="24" cy="24" r="4.2" fill="#fff" stroke="${c}" stroke-width="2"/>` : ""}`,
    outline: `<path d="${A}" fill="#fff" stroke="#0b0f17" stroke-width="1.6" stroke-linejoin="round"/>${pnt ? `<circle cx="24" cy="24" r="4.2" fill="${c}" stroke="#0b0f17" stroke-width="1.4"/>` : ""}`,
    dark: `<path d="${A}" fill="#0b0f17" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>${pnt ? `<circle cx="24" cy="24" r="4.2" fill="${c}"/>` : ""}`,
    cross: `<g fill="none" stroke="#0b0f17" stroke-width="4" opacity=".55"><circle cx="16" cy="16" r="${pnt ? 8 : 9}"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8"/></g><g fill="none" stroke="${c}" stroke-width="2"><circle cx="16" cy="16" r="${pnt ? 8 : 9}"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8"/></g><circle cx="16" cy="16" r="${pnt ? 2.6 : 1.8}" fill="${c}"/>`,
    dot: `<circle cx="16" cy="16" r="${pnt ? 7 : 5}" fill="${c}" stroke="#fff" stroke-width="2"/>`,
    ring: `<circle cx="16" cy="16" r="${pnt ? 10 : 8}" fill="none" stroke="#0b0f17" stroke-width="4" opacity=".5"/><circle cx="16" cy="16" r="${pnt ? 10 : 8}" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="16" cy="16" r="2" fill="${c}"/>`,
  };
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${s[k]}</svg>`)}") ${(CURS[k].h || [0, 0]).join(" ")}`;
}
function applyCursor(k: string, c: string) {
  let st = document.getElementById("curCss") as HTMLStyleElement | null;
  if (!st) { st = document.createElement("style"); st.id = "curCss"; document.head.appendChild(st); }
  if (k === "sys" || !CURS[k]) { st.textContent = ""; return; }
  st.textContent = `html,html *{cursor:${curSvg(k, c, false)},default!important}
html :is(a,button,label,select,summary,[role=tab],[role=radio],input[type=checkbox],input[type=radio],input[type=range],input[type=file]),html :is(a,button,label,select,summary) *{cursor:${curSvg(k, c, true)},pointer!important}
html :is(input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]),textarea,[contenteditable]){cursor:text!important}
html [disabled]{cursor:${curSvg(k, c, false)},not-allowed!important}`;
}
/* desplazar al principio (con el marco de tablet el que scrollea es la pantalla, no la ventana) */
export const scrollTopApp = () => { const s = document.getElementById("app-scroll"); if (s) s.scrollTo({ top: 0 }); else window.scrollTo({ top: 0 }); };
