/* METRO · callsigns: los de los miembros (lspdt.mdCalls, el mismo que usa el roster), las reservas para aspirantes o futuros
   integrantes (lspdt.mdx.csRes), el historial de movimientos (lspdt.mdx.csLog) y la configuración del comunicado (lspdt.mdx.csCfg). */
import { LS } from "./store";
import { MD_CALLS, rosterCall } from "./units";
import { uid } from "./domain";

const K_CALLS = "lspdt.mdCalls";
export const K_RES = "lspdt.mdx.csRes", K_LOG = "lspdt.mdx.csLog", K_CFG = "lspdt.mdx.csCfg";
export type CsTipo = "miembro" | "reserva";
export type CsLog = { id: string; t: number; by: string; n: string; de: string; a: string; tipo: CsTipo; pub?: boolean };
export type CsCfg = { em: string; rol: string };
export const CS_CFG0: CsCfg = { em: "", rol: "" };

export const resOf = () => LS.json<Record<string, string>>(K_RES, {});
export const logOf = () => { const L = LS.json<CsLog[]>(K_LOG, []); return Array.isArray(L) ? L : []; };
/* callsign vigente de alguien: el del roster si es miembro, si no su reserva */
export const callOfAny = (n: string) => rosterCall(n) || resOf()[n] || "";
/* números de cada serie dentro de un texto («R20D · R30C» → D20, C30) */
export const csNums = (s: string, serie: "C" | "D") => [...(s || "").toUpperCase().matchAll(/R(\d+)([CD])/g)].filter(m => m[2] === serie).map(m => +m[1]);
const csClean = (s: string) => s.toUpperCase().replace(/\s*[·,/|]\s*/g, " · ").replace(/\s+/g, " ").trim();

/* cambia el callsign (miembro o reserva) y lo anota en el historial; devuelve false si no cambió nada */
export function setCall(n: string, v: string, by: string, tipo: CsTipo): boolean {
  const a = csClean(v), de = tipo === "miembro" ? rosterCall(n) : resOf()[n] || "";
  if (a === de) return false;
  if (tipo === "miembro") LS.setJSON(K_CALLS, { ...MD_CALLS, ...LS.json<Record<string, string>>(K_CALLS, {}), [n]: a });
  else { const R = resOf(); if (a) R[n] = a; else delete R[n]; LS.setJSON(K_RES, R); }
  LS.setJSON(K_LOG, [{ id: uid(), t: Date.now(), by, n, de, a, tipo }, ...logOf()].slice(0, 400));
  return true;
}
