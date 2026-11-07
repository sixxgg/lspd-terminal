/* Perfiles de agentes (lspdt.profiles) y roster: mismas estructuras que la versión clásica */
import { LS } from "./store";
import { DET, genderOf, getRoster, type Agent } from "./domain";

export type Mov = { tipo: string; de?: string; a?: string; via?: string; t: number; por: { n: string; r: string } };
export type Nota = { m: string; t: number; a?: string; r?: string; [k: string]: unknown };
export type Profile = { g: string; cs: string; fr: number; main: string; ph: { x: number; y: number; z: number } | null; cv: unknown; cond: string[]; lic: Record<string, unknown>;
  div: string[]; foto: string; notas: Nota[]; movs: Mov[]; [k: string]: unknown };
export const PROF_SEED: Record<string, { cs?: string; fr?: number; div?: string[] }> = {
  "Ryan Westbrook": { cs: "DAVID-20", fr: 3, div: ["Metropolitan Division", "Special Weapons And Tactics", "Professional Standards Bureau", "Air Support Division"] },
  "Evelyn Molina": { div: ["Metropolitan Division", "Special Weapons And Tactics", "Administration Services Bureau", "Air Support Division"] },
  "James Hopper": { div: ["Recruitment and Training Division"] }, "James Villanueva": { div: ["Detective Bureau"] }, "Derek McGarrett": { div: ["High Tech Crime Unit"] },
  "Madison Wells": { div: ["Professional Standards Bureau"] }, "Vega Chambers": { div: ["Detective Bureau"] }, "Kane Anderson": { div: ["Administration Services Bureau"] },
};
export const allProfiles = () => LS.ro<Record<string, Profile>>("lspdt.profiles", {});
export function profFull(n: string, all = allProfiles()): Profile {
  const p = all[n]; if (p) return Object.assign({ cond: [], lic: {}, div: [], notas: [], movs: [] }, p) as Profile;
  const s = PROF_SEED[n] || {}, a = getRoster().find(x => x.n === n);
  return { g: genderOf(n), cs: s.cs || "", fr: s.fr || 0, main: "", ph: null, cv: null, cond: [], lic: {}, div: s.div ? [...s.div] : a && DET.includes(a.r) ? ["Detective Bureau"] : [], foto: "", notas: [], movs: [] };
}
export function updateProf(n: string, fn: (p: Profile) => void) {
  const all = { ...LS.json<Record<string, Profile>>("lspdt.profiles", {}) }, p = profFull(n, all); fn(p); all[n] = p;
  LS.setJSON("lspdt.profiles", all);
}
export const addMov = (n: string, m: Omit<Mov, "t" | "por">, me: { n: string; r: string }) => updateProf(n, p => { p.movs = [...(p.movs || []), { ...m, t: Date.now(), por: { n: me.n, r: me.r } }]; });
export function updateAgent(n: string, fn: (a: Agent) => void) {
  const R = getRoster().map(a => ({ ...a })), a = R.find(x => x.n === n); if (!a) return false;
  fn(a); LS.setJSON("lspdt.roster", R); return true;
}
/* navegación entre secciones desde dentro de una sección */
export const goTo = (a: string, s: string, preset?: unknown) => { (window as unknown as { __preset?: unknown }).__preset = preset; window.dispatchEvent(new CustomEvent("lspd:go", { detail: { a, s } })); };
export const takePreset = <T,>(): T | undefined => { const w = window as unknown as { __preset?: T }; const p = w.__preset; w.__preset = undefined; return p; };
