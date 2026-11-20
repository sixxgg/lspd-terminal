/* Eventos del departamento (Calendario): los cargan Jefatura y quienes ella habilite (lspdt[.depto].calevAcc).
   Viven en lspdt.xcal, una lista compartida por los tres departamentos: cada registro es de su departamento (dp) y puede invitar a otros (deps).
   El servidor solo le manda a cada sesión los eventos de su departamento y aquellos a los que la invitaron. */
import { LS, ME_ROLES } from "./store";
import { DEPT, type DeptId } from "./dept";
import { PROF } from "./nick";
import { findAgent, lvl } from "./domain";

export type EvTipo = "ent" | "reu" | "ope" | "conv" | "cer" | "otro";
export type EvSt = "prog" | "canc" | "fin";
export type Ev = {
  id: string; dp: DeptId; deps: DeptId[]; by: string; t: number; upd?: number; upBy?: string;
  n: string; desc: string; f: string; hi: string; hf: string; lugar: string; tipo: EvTipo; div: string; resp: string;
  conv: string[]; img: string; obs: string; st: EvSt; rep: "" | "sem" | "men"; hasta: string; canc?: string[]; /* canc: fechas sueltas canceladas de un evento que se repite */
};
export const XCAL = "lspdt.xcal", ACC_KEY = "lspdt.calevAcc";
export const EV_TIPOS: [EvTipo, string, string][] = [["ent", "Entrenamiento", "#22c55e"], ["reu", "Reunión", "#a78bfa"], ["ope", "Operativo", "#f97316"],
  ["conv", "Convocatoria", "#38bdf8"], ["cer", "Ceremonia", "#eab308"], ["otro", "Otros", "#94a3b8"]];
export const EV_ST: Record<EvSt, [string, string]> = { prog: ["Programado", "#22c55e"], canc: ["Cancelado", "#ef4444"], fin: ["Finalizado", "#94a3b8"] };
export const tipoOf = (k: string) => EV_TIPOS.find(x => x[0] === k) || EV_TIPOS[5];
const pad = (n: number) => String(n).padStart(2, "0");
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const atOf = (f: string, h: string) => new Date(`${f}T${h || "00:00"}`).getTime();

/* fechas en las que ocurre (un evento que se repite, hasta su fecha final o 12 meses) */
export function occurrences(e: Ev, from: number, to: number): string[] {
  if (!e.f) return [];
  if (!e.rep) return [e.f];
  const out: string[] = [], d0 = new Date(`${e.f}T12:00`), end = Math.min(to, e.hasta ? atOf(e.hasta, "23:59") : d0.getTime() + 366 * 864e5);
  for (let i = 0; i < 120; i++) {
    const d = new Date(d0); if (e.rep === "sem") d.setDate(d0.getDate() + 7 * i); else { d.setMonth(d0.getMonth() + i); if (d.getDate() !== d0.getDate()) continue; }
    const t = d.getTime(); if (t > end) break; if (t >= from - 864e5) out.push(isoOf(d));
  }
  return out;
}
export const evList = () => LS.json<Ev[]>(XCAL, []).filter(e => e && e.id && e.f);

/* quién gestiona eventos: Jefatura, los habilitados por Jefatura y six (en el LSPD, también la administración) */
const evAcc = () => LS.json<string[]>(ACC_KEY, []);
export const evCan = () => !!ME_ROLES.six || !!ME_ROLES.jef || (DEPT.id === "lspd" && !!ME_ROLES.admin) || lvl(findAgent(PROF.me)?.r) >= 10 || evAcc().includes(PROF.me);
export const evEdit = (e: Ev) => !!ME_ROLES.six || (e.dp === DEPT.id && (evCan() || e.by === PROF.me));

/* ¿me convocan? sin nada marcado, a todo el departamento; si no, por rango o por nombre */
export function evForMe(e: Ev, n: string) {
  if (!e.conv?.length) return true;
  const a = findAgent(n); return e.conv.includes(n) || (!!a && e.conv.includes(a.r));
}
