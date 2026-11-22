/* Edición de agentes del LSSD y la SAHP. Su roster sale de la planilla (lo importa six) y no se pisa: las ediciones van aparte en lspdt.agx
   (cada departamento la suya), por el nombre original de la planilla. Cada campo guarda [valor de la planilla al editarlo, valor nuevo] y solo se aplica
   mientras la planilla siga igual en ese campo: si six vuelve a importar con otro dato, manda la planilla. El servidor aplica lo mismo (rango y
   permisos) y controla quién puede tocar qué (lib/core.js › agxCheck). Además: historial de rangos (h) y registro de cada cambio (log, con quién y cuándo). */
import { LS } from "./store";

export type AgxHist = { t: number; de: string; a: string; f: string; por: string };
export type AgxLog = { t: number; por: string; pr: string; c: string[] };
/* add: alta de un agente por la terminal (Traslados › Incorporar); los mismos campos que una fila de la planilla */
export type AgxAdd = { n: string; p?: string; r: string; e?: string; i?: string; u?: string; d?: string; di?: string; o?: string; src?: string; tr?: string };
export type AgxE = { f?: Record<string, [string, string]>; h?: AgxHist[]; log?: AgxLog[]; add?: AgxAdd };
type Row = { n: string; n0?: string; [k: string]: unknown };

export const AGX_F = ["n", "p", "r", "e", "i", "a", "d", "di", "o"] as const;
export const AGX_KEY = "lspdt.agx";
export const agxOf = (n0: string): AgxE => (LS.ro<Record<string, AgxE>>(AGX_KEY, {}) || {})[n0] || {};

const sl = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ADD_F = ["p", "r", "e", "i", "u", "a", "d", "di", "o", "src", "tr"];
export function applyAgx<T extends Row>(list: T[], O: Record<string, AgxE> | null): T[] {
  if (!O || typeof O !== "object") return list;
  /* altas por traslado que todavía no están en la planilla (si six la reimporta con ellos, manda la planilla) */
  const has = new Set(list.map(a => sl(a.n))), adds: T[] = [];
  for (const [n, x] of Object.entries(O)) if (x?.add && typeof x.add === "object" && !has.has(sl(n))) {
    const a: Row = { n }; for (const f of ADD_F) { const v = (x.add as Record<string, unknown>)[f]; if (typeof v === "string") a[f] = v; } has.add(sl(n)); adds.push(a as T); }
  return [...list, ...adds].map(a => {
    const x = O[a.n]; if (!x || !x.f) return a; const b: Row = { ...a, n0: a.n };
    for (const f of AGX_F) { const e = x.f[f]; if (Array.isArray(e) && String(a[f] ?? "") === String(e[0] ?? "") && typeof e[1] === "string" && (f !== "n" || e[1].trim())) b[f] = e[1]; }
    return b as T;
  });
}

/* estados de un agente del LSSD y la SAHP */
export const ESTADOS_X = ["Activo", "Inactivo", "En excedencia", "De baja temporal", "Suspendido", "Retirado"];
/* rangos de cada departamento, de mayor a menor */
export const RANKS_X: Record<string, string[]> = {
  lssd: ["Sheriff", "Undersheriff", "Assistant Sheriff", "Division Chief", "Area Commander", "Captain", "Lieutenant", "Sergeant", "Deputy Sheriff Master FTO", "Deputy Sheriff Bonus II", "Deputy Sheriff Bonus I", "Deputy Sheriff", "Deputy Sheriff Trainee"],
  sahp: ["Commissioner", "Deputy Commissioner", "Assistant Commissioner", "Chief", "Captain", "Lieutenant", "Sergeant", "Officer", "Cadet"],
};
/* qué campos edita cada nivel (lo mismo que controla el servidor) */
const AGX_SUP = ["e", "d", "di", "o"];
export const agxFields = (myL: number, full: boolean): string[] => (full || myL >= 8 ? [...AGX_F] : myL >= 7 ? AGX_SUP : []);
