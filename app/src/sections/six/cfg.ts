/* six · ajustes (tema y efectos) y utilidades chicas: se cargan con la MDT solo para saber si mostrar el pantallazo al entrar */
import { LS } from "@/lib/store";

/* ---------- ajustes (independientes de la MDT; viajan con la cuenta) ---------- */
export type SixCfg = { tema: string; lluvia: 0 | 1 | 2 | 3; scan: boolean; grid: boolean; glow: 0 | 1 | 2; flicker: boolean; intro: "completa" | "corta" | "no"; error: boolean; bd: "tema" | "neutro" | "no" };
/* espacio activo: el de six o el de Anita (mismo panel, datos y colores separados: lspdt.six.* / lspdt.anita.*) */
export type Who = "six" | "anita";
export const NS: { id: Who } = { id: "six" };
export const K = (k: string) => `lspdt.${NS.id}.${k}`;
export const cfgKey = (w: Who = NS.id) => `lspdt.${w}.cfg`;
const BASE: SixCfg = { tema: "verde", lluvia: 1, scan: true, grid: true, glow: 1, flicker: true, intro: "completa", error: true, bd: "tema" };
export const cfg0 = (w: Who = NS.id): SixCfg => (w === "anita" ? { ...BASE, tema: "rosa", lluvia: 2, error: false } : BASE);
export const THEMES: [string, string, string][] = [["verde", "Verde", "#39ff88"], ["cian", "Cian", "#00e5ff"], ["rojo", "Rojo", "#ff2b4a"], ["ambar", "Ámbar", "#ffb000"], ["violeta", "Violeta", "#b46cff"], ["blanco", "Blanco", "#e8eef7"],
  ["rosa", "Rosa", "#ff4fd8"], ["magenta", "Magenta", "#ff1f8f"], ["lila", "Lila", "#d58cff"], ["arcoiris", "Arcoíris", "#ff4fd8"]];
export const colorOf = (t: string) => (THEMES.find(x => x[0] === t) || THEMES[0])[2];
/* variables CSS de un color: --c (hex, para sombras) y --six (canales RGB, para las clases bg-six/NN, border-six/NN…) */
export const vars = (col: string) => ({ ["--c" as string]: col, ["--six" as string]: [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)).join(" ") });
export const readCfg = (w: Who = "six"): SixCfg => ({ ...cfg0(w), ...LS.json<Partial<SixCfg>>(cfgKey(w), {}) });

const rnd = (n: number) => Math.floor(Math.random() * n);
export const hex = (n = 4) => Array.from({ length: n }, () => "0123456789abcdef"[rnd(16)]).join("");
