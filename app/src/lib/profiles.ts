/* Perfiles de agentes (lspdt.profiles) y roster: mismas estructuras que la versión clásica */
import { DEPT } from "./dept";
import { LS } from "./store";
import { DET, LEVEL, genderOf, getRoster, type Agent } from "./domain";
import { AGX_F, AGX_KEY, type AgxE } from "./agx";
import { PROF } from "./nick";
import { GEN, gMap, gSave, rosterCall, rosterDivs } from "./units";

export type Mov = { tipo: string; de?: string; a?: string; via?: string; t: number; por: { n: string; r: string } };
export type Nota = { m: string; t: number; a?: string; r?: string; [k: string]: unknown };
export type Profile = { g: string; cs: string; fr: number; main: string; ph: { x: number; y: number; z: number } | null; cv: unknown; cond: string[]; lic: Record<string, unknown>;
  div: string[]; foto: string; notas: Nota[]; movs: Mov[]; [k: string]: unknown };
const PROF_SEED: Record<string, { cs?: string; fr?: number; div?: string[] }> = {
  "Ryan Westbrook": { cs: "DAVID-20", fr: 3, div: ["Metropolitan Division", "Special Weapons And Tactics", "Professional Standards Bureau", "Air Support Division"] },
  "Evelyn Molina": { div: ["Metropolitan Division", "Special Weapons And Tactics", "Administration Services Bureau", "Air Support Division"] },
  "James Hopper": { div: ["Recruitment and Training Division"] }, "James Villanueva": { div: ["Detective Bureau"] }, "Derek McGarrett": { div: ["High Tech Crime Unit"] },
  "Madison Wells": { div: ["Professional Standards Bureau"] }, "Vega Chambers": { div: ["Detective Bureau"] }, "Kane Anderson": { div: ["Administration Services Bureau"] },
};
export const allProfiles = () => LS.ro<Record<string, Profile>>("lspdt.profiles", {});
/* el perfil se completa con los rosters: divisiones (METRO, SWAT, A.S.D, K-9, PSB, RTD…) e indicativo de radio */
const withRoster = (n: string, p: Profile): Profile => { const rd = rosterDivs(n);
  if (DEPT.id !== "lspd") p.div = p.div.filter(d => !GEN[d] || !!gMap(GEN[d].id)[n]); /* LSSD/SAHP: el roster de cada división manda */ if (rd.some(d => !p.div.includes(d))) p.div = [...p.div, ...rd.filter(d => !p.div.includes(d))]; if (!p.cs) p.cs = rosterCall(n); return p; };
export function profFull(n: string, all = allProfiles()): Profile {
  const p = all[n]; if (p) return withRoster(n, Object.assign({ cond: [], lic: {}, div: [], notas: [], movs: [] }, p, { div: [...((p.div as string[]) || [])] }) as Profile);
  const s = (DEPT.id === "lspd" && PROF_SEED[n]) || {}, a = getRoster().find(x => x.n === n); /* lo cargado de fábrica es del LSPD */
  return withRoster(n, { g: genderOf(n), cs: s.cs || "", fr: s.fr || 0, main: "", ph: null, cv: null, cond: [], lic: {}, div: s.div ? [...s.div] : a && DET.includes(a.r) ? ["Detective Bureau"] : [], foto: "", notas: [], movs: [] });
}
export function updateProf(n: string, fn: (p: Profile) => void) {
  const all = { ...LS.json<Record<string, Profile>>("lspdt.profiles", {}) }, p = profFull(n, all); fn(p); all[n] = p;
  LS.setJSON("lspdt.profiles", all);
}
export const addMov = (n: string, m: Omit<Mov, "t" | "por">, me: { n: string; r: string }) => updateProf(n, p => { p.movs = [...(p.movs || []), { ...m, t: Date.now(), por: { n: me.n, r: me.r } }]; });
export function updateAgent(n: string, fn: (a: Agent) => void) {
  if (DEPT.id !== "lspd") return agxEdit(n, fn);
  const R = getRoster().map(a => ({ ...a })), a = R.find(x => x.n === n); if (!a) return false;
  fn(a); LS.setJSON("lspdt.roster", R); return true;
}
/* LSSD/SAHP: el cambio va a lspdt.agx (la planilla no se toca). Registra quién y cuándo, guarda el historial de rangos (sin duplicar el de Ascensos)
   y, si cambia el nombre, mueve el perfil y el lugar en el roster de cada división al nombre nuevo. */
const AGX_L: Record<string, string> = { n: "Nombre", p: "Placa", r: "Rango", e: "Estado", i: "Ingreso", a: "Último ascenso", d: "Discord", di: "ID de Discord", o: "Observaciones" };
function agxEdit(n: string, fn: (a: Agent) => void) {
  const a = getRoster().find(x => x.n === n); if (!a) return false;
  const b: Agent = { ...a }; fn(b);
  /* base de cada campo: la fila de la planilla o, si entró por traslado y todavía no está en la planilla, su alta */
  const raw = ((LS.ro<Agent[]>("lspdt.roster", []) || []).find(x => x.n === (a.n0 || a.n)) || (LS.ro<Record<string, AgxE>>(AGX_KEY, {}) || {})[a.n0 || a.n]?.add) as (Agent & Record<string, unknown>) | undefined; if (!raw) return false;
  const iso2dmy = (v?: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : v || ""; };
  const val = (x: Agent, f: string) => String(f === "i" ? iso2dmy(x.c) : (x as Record<string, unknown>)[f] ?? "").trim();
  const key = a.n0 || a.n, O = { ...(LS.ro<Record<string, AgxE>>(AGX_KEY, {}) || {}) }, e: AgxE = { ...(O[key] || {}) }, f = { ...(e.f || {}) }, ch: string[] = [];
  for (const k of AGX_F) { const old = val(a, k), nv = val(b, k); if (old === nv) continue;
    ch.push(k === "o" ? "Observaciones actualizadas" : `${AGX_L[k]}: ${old || "—"} → ${nv || "—"}`);
    const base = String(raw[k] ?? "").trim(); if (nv === base) delete f[k]; else f[k] = [base, nv]; }
  if (!ch.length) return true;
  const me = getRoster().find(x => x.n === PROF.me), por = PROF.me || "—", pr = me?.r || "", now = Date.now();
  e.f = f; e.log = [...(e.log || []), { t: now, por, pr, c: ch }];
  if (a.r !== b.r) { e.h = [...(e.h || []), { t: now, de: a.r, a: b.r, f: b.a || new Date().toISOString().slice(0, 10), por }];
    const tipo = (LEVEL[b.r] ?? 0) >= (LEVEL[a.r] ?? 0) ? "asc" : "desc", last = (profFull(a.n).movs || []).slice(-1)[0];
    if (!last || last.de !== a.r || last.a !== b.r || now - last.t > 10 * 60000) addMov(a.n, { tipo, de: a.r, a: b.r, via: "Edición del agente" }, { n: por, r: pr }); }
  O[key] = e;
  if (a.n !== b.n && b.n.trim()) { /* nombre nuevo: el perfil y las divisiones siguen al agente */
    const all = { ...LS.json<Record<string, Profile>>("lspdt.profiles", {}) }; if (all[a.n]) { all[b.n] = all[a.n]; delete all[a.n]; LS.setJSON("lspdt.profiles", all); }
    for (const c of Object.values(GEN)) { const m = gMap(c.id); if (m[a.n]) { const nm = { ...m, [b.n]: m[a.n] }; delete nm[a.n]; gSave(c.id, nm); } } }
  LS.setJSON(AGX_KEY, O); return true;
}
/* navegación entre secciones desde dentro de una sección */
export const goTo = (a: string, s: string, preset?: unknown) => { (window as unknown as { __preset?: unknown }).__preset = preset; window.dispatchEvent(new CustomEvent("lspd:go", { detail: { a, s } })); };
export const takePreset = <T,>(): T | undefined => { const w = window as unknown as { __preset?: T }; const p = w.__preset; w.__preset = undefined; return p; };
