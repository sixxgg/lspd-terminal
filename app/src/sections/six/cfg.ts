/* six · ajustes (tema y efectos) y utilidades chicas: se cargan con la MDT solo para saber si mostrar el pantallazo al entrar */
import { LS } from "@/lib/store";

/* ---------- ajustes (independientes de la MDT; viajan con la cuenta de six) ---------- */
export type SixCfg = { tema: string; lluvia: 0 | 1 | 2 | 3; scan: boolean; grid: boolean; glow: 0 | 1 | 2; flicker: boolean; intro: "completa" | "corta" | "no"; error: boolean; bd: "tema" | "neutro" | "no" };
export const CFG_KEY = "lspdt.six.cfg";
export const CFG0: SixCfg = { tema: "verde", lluvia: 1, scan: true, grid: true, glow: 1, flicker: true, intro: "completa", error: true, bd: "tema" };
export const THEMES: [string, string, string][] = [["verde", "Verde", "#39ff88"], ["cian", "Cian", "#00e5ff"], ["rojo", "Rojo", "#ff2b4a"], ["ambar", "Ámbar", "#ffb000"], ["violeta", "Violeta", "#b46cff"], ["blanco", "Blanco", "#e8eef7"]];
export const colorOf = (t: string) => (THEMES.find(x => x[0] === t) || THEMES[0])[2];
/* variables CSS de un color: --c (hex, para sombras) y --six (canales RGB, para las clases bg-six/NN, border-six/NN…) */
export const vars = (col: string) => ({ ["--c" as string]: col, ["--six" as string]: [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)).join(" ") });
export const readCfg = (): SixCfg => ({ ...CFG0, ...LS.json<Partial<SixCfg>>(CFG_KEY, {}) });

const rnd = (n: number) => Math.floor(Math.random() * n);
export const hex = (n = 4) => Array.from({ length: n }, () => "0123456789abcdef"[rnd(16)]).join("");
