/* METRO · callsigns: los de los miembros (lspdt.mdCalls, el mismo que usa el roster), las reservas para aspirantes o futuros
   integrantes (lspdt.mdx.csRes), el historial de movimientos (lspdt.mdx.csLog) y la configuración del comunicado (lspdt.mdx.csCfg). */
import { LS } from "./store";
import { MD_CALLS, rosterCall, uMap, uSaveMap } from "./units";
import { uid } from "./domain";

const K_CALLS = "lspdt.mdCalls";
export const K_RES = "lspdt.mdx.csRes", K_LOG = "lspdt.mdx.csLog", K_CFG = "lspdt.mdx.csCfg";
export type CsTipo = "miembro" | "reserva";
export type CsLog = { id: string; t: number; by: string; n: string; de: string; a: string; tipo: CsTipo; pub?: boolean; mot?: string };
export type CsCfg = { em: string; rol: string };
export const CS_CFG0: CsCfg = { em: "", rol: "" };

export const resOf = () => LS.json<Record<string, string>>(K_RES, {});
export const logOf = () => { const L = LS.json<CsLog[]>(K_LOG, []); return Array.isArray(L) ? L : []; };
/* callsign vigente de alguien: el del roster si es miembro, si no su reserva */
export const callOfAny = (n: string) => rosterCall(n) || resOf()[n] || "";
/* números de cada serie dentro de un texto («R20D · R30C» → D20, C30). La serie D también acepta el formato viejo «D-01» (= R01D) */
const RX = { C: /R(\d+)C/gi, D: /R(\d+)D|\bD-(\d+)/gi };
export const csNums = (s: string, serie: "C" | "D") => [...(s || "").matchAll(RX[serie])].map(m => +(m[1] || m[2]));
export const csTok = (n: number, serie: "C" | "D") => `R${String(n).padStart(2, "0")}${serie}`;
/* cambia (o saca, con 0) el indicativo de una serie dentro del texto completo, sin tocar el de la otra */
export function withTok(cur: string, serie: "C" | "D", n: number): string {
  const parts = (cur || "").split(/\s*·\s*/).map(x => x.trim()).filter(Boolean), re = new RegExp(RX[serie].source, "i");
  const i = parts.findIndex(x => re.test(x)), tok = n ? csTok(n, serie) : "";
  if (i >= 0) { if (tok) parts[i] = tok; else parts.splice(i, 1); } else if (tok) parts.push(tok);
  return parts.join(" · ");
}
const csClean = (s: string) => s.toUpperCase().replace(/\s*[·,/|]\s*/g, " · ").replace(/\s+/g, " ").trim();

/* cambia el callsign (miembro o reserva) y lo anota en el historial; devuelve false si no cambió nada */
export function setCall(n: string, v: string, by: string, tipo: CsTipo): boolean {
  const a = csClean(v), de = tipo === "miembro" ? rosterCall(n) : resOf()[n] || "";
  if (a === de) return false;
  if (tipo === "miembro") LS.setJSON(K_CALLS, { ...MD_CALLS, ...LS.json<Record<string, string>>(K_CALLS, {}), [n]: a });
  else { const R = resOf(); if (a) R[n] = a; else delete R[n]; LS.setJSON(K_RES, R); }
  pushLog({ by, n, de, a, tipo });
  return true;
}
const pushLog = (e: Omit<CsLog, "id" | "t">) => LS.setJSON(K_LOG, [{ id: uid(), t: Date.now(), ...e }, ...logOf()].slice(0, 400));
const setCalls = (n: string, v: string) => LS.setJSON(K_CALLS, { ...MD_CALLS, ...LS.json<Record<string, string>>(K_CALLS, {}), [n]: v });

/* «Reserva»: aspirante aprobado o futuro integrante que queda a la espera de lugar (otra etiqueta, aparte de Aspirante) */
const K_TAG = "lspdt.mdx.csTag";
const tagOf = () => LS.json<Record<string, string>>(K_TAG, {});
export const isReserva = (n: string) => tagOf()[n] === "reserva";
export function setReserva(n: string, on: boolean, by: string) {
  const T = tagOf(); if (on) T[n] = "reserva"; else delete T[n]; LS.setJSON(K_TAG, T);
  const c = callOfAny(n); pushLog({ by, n, de: c, a: c, tipo: rosterCall(n) ? "miembro" : "reserva", mot: on ? "Queda en reserva" : "Sale de la reserva" });
}

/* movimientos de personal (cambian el roster de METRO y quedan en el historial):
   op = el aspirante pasa a Operador METRO (su reserva de callsign pasa a ser suya) · swat = asciende al Pelotón D (deja la serie C)
   out = retirado de la METRO (sale del roster y libera sus callsigns) */
export type Move = "op" | "swat" | "out";
export const MOVE_L: Record<Move, string> = { op: "Pasa a Operador METRO", swat: "Asciende al Pelotón D (SWAT)", out: "Retirado de la METRO" };
export function moveMember(n: string, mv: Move, by: string) {
  const M = { ...uMap("md") } as Record<string, string[]>, r = Array.isArray(M[n]) ? M[n] : [], before = callOfAny(n);
  let after = before;
  if (mv === "op") { M[n] = ["op", ...r.filter(x => x !== "asp" && x !== "op")]; const R = resOf(); if (R[n] !== undefined) { setCalls(n, R[n]); delete R[n]; LS.setJSON(K_RES, R); } const T = tagOf(); if (T[n]) { delete T[n]; LS.setJSON(K_TAG, T); } }
  if (mv === "swat") { M[n] = r.includes("swat") ? r : [...(r.filter(x => x !== "asp").length ? r.filter(x => x !== "asp") : ["op"]), "swat"]; after = withTok(before, "C", 0); setCalls(n, after); }
  if (mv === "out") { delete M[n]; after = ""; setCalls(n, ""); const R = resOf(); if (n in R) { delete R[n]; LS.setJSON(K_RES, R); } const T = tagOf(); if (T[n]) { delete T[n]; LS.setJSON(K_TAG, T); } }
  uSaveMap("md", M); pushLog({ by, n, de: before, a: after, tipo: "miembro", mot: MOVE_L[mv] });
}
