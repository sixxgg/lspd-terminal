/* Divisiones con roster propio (A.S.D, K-9, PSB): mismas claves y reglas que la versión clásica */
import { LS, ME_ROLES } from "./store";

type Role = [k: string, label: string, color: string, short: string];
type Unit = {
  d: string; ab: string; rk: string; lk: string; def: Record<string, string[]>; acc: string; seedV?: number; R: Role[]; SUB?: Role[];
  reg?: string; regs?: string; one?: string; ones?: string; crew?: string; save?: string;
  veh?: { l: string; o: [string, string, string][] }; mat?: boolean; dog?: boolean; zona?: boolean; mo?: string[];
};
const ASD_DEF: Record<string, string[]> = { "Ryan Westbrook": ["coord"], "Kai Jeon-Soo": ["coord", "piloto"], "Evelyn Molina": ["sup", "tfo", "piloto"], "Lewis Clarkson": ["sup", "piloto"], "Liam Campbell": ["sup", "piloto"], "Miles Campbell": ["sup", "piloto"],
  "Yooa Baek-Harrington": ["tfo", "piloto"], "Khalan Smith": ["piloto"], "Lara Calloway": ["piloto"], "Leonardo Nascimento": ["piloto"], "Madison Lopez": ["piloto"], "Madison Pierce": ["piloto"], "Tariq Okafor": ["piloto"],
  "Tyler Walker": ["piloto"], "William Weston": ["piloto"], "Antonio Santos": ["asp"], "Darwin Ford": ["asp"] };
const K9_DEF: Record<string, string[]> = { "Kai Jeon-Soo": ["coord"], "Yooa Baek-Harrington": ["subcoord"], "Charles Jhonson Smith": ["inst"], "Liam Campbell": ["inst"], "Evelyn Molina": ["handler"],
  "Olivia Molina": ["prac"], "Logan Barrett": ["prac"], "Morvanna Montenegro": ["prac"], "Leonardo Nascimento": ["prac"], "Violet Faith": ["prac"], "Ethan Roggers": ["prac"],
  "Darwin Ford": ["prac"], "Naia Bishop": ["prac"], "Noah Smith": ["prac"], "Ryan Sullivan": ["prac"] };
export const K9_PL: Record<string, string> = { "Logan Barrett": "884", "Ethan Roggers": "850", "Noah Smith": "871", "Ryan Sullivan": "800" };
const PSB_DEF: Record<string, string[]> = { "Madison Wells": ["co", "iad", "fid", "sod"], "Vega Chambers": ["co", "iad", "fid", "sod"], "Derek McGarrett": ["inv", "iad", "fid"],
  "Ryan Westbrook": ["jinv", "iad", "fid", "sod"], "Liam Campbell": ["jinv", "iad", "fid", "sod"], "Evelyn Molina": ["jinv", "iad", "fid", "sod"] };

/* METRO y SWAT (roster que pasó six): rol principal + subdivisiones activas; el indicativo va aparte (lspdt.mdCalls) */
const MD_DEF: Record<string, string[]> = {
  "Derek McGarrett": ["co", "swat", "sierra", "bq", "h", "udu", "cnt"], "Evelyn Molina": ["aco", "swat", "sierra", "bq", "h", "udu", "cnt"],
  "Ryan Westbrook": ["oic", "swat", "sierra", "udu", "cnt"], "Liam Campbell": ["tl", "swat", "sierra", "udu", "cnt"],
  "Tariq Okafor": ["op", "swat"], "Lloyd Burnett": ["op", "swat"], "Charles Jhonson Smith": ["op", "swat"], "Antonio Santos": ["op", "swat"],
  "Kane Anderson": ["op"], "Elioth Smith": ["op"], "Hailey Deacon": ["op"], "James West": ["op"], "Logan Barrett": ["op"], "Matthew Coleman": ["op"], "Rodney Deacon": ["op"],
  "Clancy Skinner": ["op"], "Kai Jeon-Soo": ["op"], "Khalan Smith": ["op"], "Lara Calloway": ["op"], "William Weston": ["op"], "Yooa Baek-Harrington": ["op"] };
export const MD_CALLS: Record<string, string> = { "Derek McGarrett": "D-01", "Evelyn Molina": "D-02 · R10D", "Ryan Westbrook": "R20D · R30C", "Liam Campbell": "R25D", "Tariq Okafor": "R21D",
  "Lloyd Burnett": "R22D", "Charles Jhonson Smith": "R26D", "Antonio Santos": "R27D", "Kane Anderson": "R32C", "Elioth Smith": "R48C", "Hailey Deacon": "R35C", "James West": "R47C",
  "Logan Barrett": "R43C", "Matthew Coleman": "R44C", "Rodney Deacon": "R36C", "Clancy Skinner": "R46C", "Kai Jeon-Soo": "R38C", "Khalan Smith": "R42C", "Lara Calloway": "R39C",
  "William Weston": "R45C", "Yooa Baek-Harrington": "R37C" };
/* roles de instrucción que se suman a cualquier unidad (además de los propios) */
const INS_SUB: Role[] = [["inst", "Instructor", "#2fbf68", "Instr."], ["instp", "Instructor en pruebas", "#8fd9a8", "Instr. pruebas"]];
export const UNITS: Record<"asd" | "k9" | "psb" | "md", Unit> = {
  asd: { d: "Air Support Division", ab: "A.S.D", rk: "lspdt.asdRoster", lk: "lspdt.asdVuelos", def: ASD_DEF, acc: "#e2c66a",
    R: [["coord", "Coordinación A.S.D", "#e2c66a", "Coord."], ["sup", "Supervisor Aéreo", "#2fa4d6", "Sup."], ["tfo", "Tactical Flight Officer", "#e05a52", "TFO"], ["pexp", "Piloto experimentado", "#9fd3ea", "P. exp."], ["piloto", "Piloto", "#5b93b8", "Piloto"], ["asp", "Aspirante A.S.D", "#8a8f97", "Asp."]],
    reg: "Registro de vuelo", regs: "Vuelos registrados", one: "vuelo", ones: "vuelos", crew: "Tripulación", save: "Guardar vuelo",
    veh: { l: "Aeronave", o: [["polmav", "Polmav", "Normal · patrullaje"], ["as332", "AS332 Super Puma", "Rescate"], ["mh60s", "MH-60S Blackhawk", "Blackhawk"]] }, mat: true,
    SUB: INS_SUB,
    mo: ["Patrullaje Ordinario", "Prácticas METRO", "Ammunation", "Rescate SAR", "Apoyo a persecución", "Traslado", "Formación / examen", "Operativo táctico", "Otro"] },
  k9: { d: "K-9 Division", ab: "K-9", rk: "lspdt.k9Roster", lk: "lspdt.k9Reg", def: K9_DEF, acc: "#e6c65a", seedV: 2,
    R: [["coord", "Coordinación K-9", "#e6c65a", "Coord."], ["subcoord", "Sub Coordinación K-9", "#f3dc95", "Sub coord."], ["inst", "Instructor", "#2fbf68", "Instr."], ["senior", "Senior handler", "#a3d94e", "Senior"], ["handler", "Handler K9", "#3fae8c", "Handler"], ["prac", "Handler en prácticas", "#8fd9a8", "Prác."], ["asp", "Aspirante", "#8a8f97", "Asp."]],
    SUB: [INS_SUB[1]],
    reg: "Registro de patrullaje", regs: "Patrullajes registrados", one: "patrullaje", ones: "patrullajes", crew: "Handlers", save: "Guardar patrullaje", dog: true, zona: true,
    mo: ["Patrullaje ordinario", "Detección de sustancias", "Detección de explosivos", "Búsqueda y rastreo de personas", "Apoyo a operativo", "Control de vehículos", "Entrenamiento", "Formación / examen", "Otro"] },
  psb: { d: "Professional Standards Bureau", ab: "PSB", rk: "lspdt.psbRoster", lk: "", def: PSB_DEF, acc: "#d9b45a", seedV: 1,
    R: [["co", "Commanding Officer", "#d9b45a", "CO"], ["aco", "Assistant Commanding Officer", "#ecd08a", "ACO"], ["dc", "Division Commander", "#c7ced9", "Div. Cmdr."], ["ss", "Section Supervisor", "#9fb4d6", "Sect. Sup."],
      ["lead", "Lead Investigator", "#7c9fe0", "Lead"], ["senior", "Senior Investigator", "#6b8fd6", "Senior"], ["inv", "Investigator", "#5b82c9", "Inv."], ["jinv", "Junior Investigator", "#8ea3c2", "Junior"]],
    SUB: [["iad", "IAD", "#8fb3ff", "IAD"], ["fid", "FID", "#e0a3a3", "FID"], ["sod", "SOD", "#b7a6e8", "SOD"], ...INS_SUB] },
  md: { d: "Metropolitan Division", ab: "METRO", rk: "lspdt.mdRoster", lk: "", def: MD_DEF, acc: "#1f6fb0", seedV: 2,
    R: [["co", "Commanding Officer", "#1f6fb0", "CO"], ["aco", "Assistant Commanding Officer", "#5aa0d8", "ACO"], ["oic", "Officer in Charge", "#7c9fe0", "OIC"], ["tl", "Team Leader", "#9fb4d6", "TL"],
      ["inst", "Instructor", "#2fbf68", "Instr."], ["instp", "Instructor en pruebas", "#8fd9a8", "Instr. pruebas"], ["op", "Operador", "#8ea3c2", "Op."], ["asp", "Aspirante", "#8a8f97", "Asp."]],
    /* Pelotón H: manifestaciones y operativos de gran magnitud (Platoon H del LAPD) */
    SUB: [["swat", "SWAT", "#e05a52", "SWAT"], ["sierra", "SIERRA", "#d4a937", "SIERRA"], ["bq", "Bomb Squad", "#d4a937", "BQ"], ["h", "Pelotón H", "#d4a937", "Pel. H"], ["udu", "UDU", "#d4a937", "UDU"], ["cnt", "Crisis Negotiation Team", "#d4a937", "CNT"]] },
};
export type UnitKey = keyof typeof UNITS;

/* roles editables desde Administración (lspdt.groles.<clave>): nombre, color y orden; las claves de coordinación no cambian */
export type GRole = { k: string; l: string; c: string; co?: boolean };
const rolesKey = (id: string) => `lspdt.groles.${id}`;
export const roleOv = (id: string) => { const o = LS.json<GRole[] | null>(rolesKey(id), null); return Array.isArray(o) && o.length ? o : null; };
for (const [k, u] of Object.entries(UNITS)) {
  const R0 = u.R;
  Object.defineProperty(u, "R", { get: () => { const o = roleOv(k); return o ? o.map(r => [r.k, r.l, r.c, R0.find(x => x[0] === r.k)?.[3] || r.l.split(" ")[0]] as Role) : R0; } });
}
export const unitRoles = (k: UnitKey): GRole[] => UNITS[k].R.map(r => ({ k: r[0], l: r[1], c: r[2], co: COORD_R.includes(r[0]) }));
export const saveRoles = (id: string, R: GRole[] | null) => { if (R) LS.setJSON(rolesKey(id), R); else LS.del(rolesKey(id)); };

/* ---- divisiones y subdivisiones con roster genérico (lspdt.groster.<id>): roles a elección de la coordinación ---- */
const GEN_ROLES: GRole[] = [{ k: "coord", l: "Coordinación", c: "#e2c66a", co: true }, { k: "subcoord", l: "Subcoordinación", c: "#f3dc95", co: true },
  { k: "inst", l: "Instructor", c: "#2fbf68" }, { k: "ofi", l: "Oficial", c: "#5b93b8" }, { k: "asp", l: "Aspirante", c: "#8a8f97" }];
type GenCfg = { id: string; uni: string; parent?: string; tabs: string[] };
const slugD = (d: string) => d.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const G = (id: string, d: string, tabs: string[] = [], parent?: string, uni?: string): [string, GenCfg] => [d, { id, uni: uni || "x-" + slugD(d), parent, tabs }];
export const GEN: Record<string, GenCfg> = Object.fromEntries([
  G("asb", "Administration Services Bureau", ["adm2", "ent", "iev", "ipu", "doc", "tar", "conv", "subs"]),
  G("hsiu", "High Speed Interception Unit", ["tom"]),
  G("db", "Detective Bureau"),
  G("htcu", "High Tech Crime Unit", [], "Detective Bureau"), G("gnd", "Gang and Narcotics Division", [], "Detective Bureau"), G("mcd", "Major Crimes Division", [], "Detective Bureau"),
  G("swat", "Special Weapons And Tactics", [], "Metropolitan Division"), G("bs", "Bomb Squad", [], "Metropolitan Division"),
  G("mdso", "Metropolitan Drone Support Operations", ["lic"], "Metropolitan Division"), G("cnt", "Crisis Negotiation Team", [], "Metropolitan Division"),
  G("udu", "Underwater Dive Unit", ["com", "ins"], "Metropolitan Division", "udu"),
]);
export const gRoles = (id: string): GRole[] => roleOv(id) || GEN_ROLES;
export const gMap = (id: string): Record<string, string> => { const o = LS.json<Record<string, string> | null>(`lspdt.groster.${id}`, null); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; };
export const gSave = (id: string, m: Record<string, string>) => LS.setJSON(`lspdt.groster.${id}`, m);
/* indicativo de radio en el roster de la división; en las subdivisiones de la METRO, por defecto el de la METRO */
const gCalls = (id: string) => LS.json<Record<string, string>>(`lspdt.gcall.${id}`, {});
export const gCall = (id: string, n: string) => { const c = gCalls(id)[n]; if (c !== undefined) return c; const g = Object.values(GEN).find(x => x.id === id); return g?.parent === "Metropolitan Division" ? rosterCall(n) : ""; };
export const gSaveCall = (id: string, n: string, v: string) => LS.setJSON(`lspdt.gcall.${id}`, { ...gCalls(id), [n]: v });
export const gRoleOf = (id: string, x: string): GRole => gRoles(id).find(r => r.k === x) || gRoles(id)[gRoles(id).length - 1] || { k: x, l: x, c: "#94a3b8" };
export const isGMem = (id: string, n: string) => !!gMap(id)[n];
const parentCo = (c: GenCfg, n: string): boolean => !!c.parent && (c.parent === "Metropolitan Division" ? isUCoord("md", n) : GEN[c.parent] ? isGCo(GEN[c.parent].id, n) : false);
/* quién edita el roster: la coordinación de esa misma división y el dueño; el resto de la administración, solo si todavía no tiene coordinación */
export function rosterCo(id: string, n: string): boolean {
  const m = gMap(id), co = (r: string) => !!gRoles(id).find(x => x.k === r)?.co;
  return !!ME_ROLES.owner || co(m[n] || "") || (!!ME_ROLES.admin && !Object.values(m).some(co));
}
/* el dueño de la terminal (six) puede editar todo */
export const uRosterCo = (k: UnitKey, n: string) => !!ME_ROLES.owner || (uMap(k)[n] || []).some(x => COORD_R.includes(x));
export function isGCo(id: string, n: string): boolean {
  if (ME_ROLES.admin) return true;
  const r = gMap(id)[n]; if (r && gRoleOf(id, r).co) return true;
  const c = Object.values(GEN).find(x => x.id === id); return !!c && parentCo(c, n);
}
const COORD_R = ["coord", "subcoord", "co", "aco"];

export function uMap(k: UnitKey, me?: string): Record<string, string[]> {
  const u = UNITS[k], o = LS.json<Record<string, unknown> | null>(u.rk, null);
  if (!o || typeof o !== "object" || Array.isArray(o)) return u.def;
  if (u.seedV && (Number(o._v) || 0) < u.seedV) {
    const m = { ...o, ...u.def, _v: u.seedV } as Record<string, unknown>;
    if (me && ((m[me] as string[]) || []).some(x => COORD_R.includes(x)))
      setTimeout(() => { if ((Number(LS.json<Record<string, unknown>>(u.rk, {})._v) || 0) < (u.seedV || 0)) LS.setJSON(u.rk, m); }, 0);
    return clean(m);
  }
  return clean(o);
}
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([n, r]) => n !== "_v" && Array.isArray(r))) as Record<string, string[]>;
export const uSaveMap = (k: UnitKey, m: Record<string, string[]>) => { const u = UNITS[k]; LS.setJSON(u.rk, u.seedV ? { ...m, _v: u.seedV } : m); };
export const uTop = (k: UnitKey, r?: string[]) => UNITS[k].R.find(x => (r || []).includes(x[0])) || UNITS[k].R[UNITS[k].R.length - 1];
export const isUMem = (k: UnitKey, n: string) => !!ME_ROLES.admin || !!uMap(k)[n];
export const isUCoord = (k: UnitKey, n: string) => !!ME_ROLES.admin || (uMap(k)[n] || []).some(x => COORD_R.includes(x));
/* rol en las instrucciones según el roster: coordinador, instructor o instructor en pruebas */
export const insRole = (k: UnitKey, n: string): "coord" | "inst" | "instp" | "" => { const r = uMap(k)[n] || []; return r.some(x => COORD_R.includes(x) || x === "oic") ? "coord" : r.includes("inst") ? "inst" : r.includes("instp") ? "instp" : ""; };
export const isPSB = (n: string) => !!uMap("psb")[n];
/* RTD: su roster (lspdt.groster.rtd); si todavía no se cargó, la lista anterior */
export const rtdMem = (): string[] => { const g = Object.keys(gMap("rtd")); if (g.length) return g; const l = LS.json<Record<string, unknown>>("lspdt.ui", {}).rtd; return Array.isArray(l) ? (l as string[]) : RTD_DEF; };
const RTD_DEF = ["Charles Jhonson Smith", "Daniel López", "Derek McGarrett", "Elioth Smith", "Evelyn Molina", "Kai Jeon-Soo", "Kane Anderson", "Khalan Smith", "Lara Calloway",
  "Liam Campbell", "Madison Pierce", "Madison Wells", "Matthew Coleman", "Miles Campbell", "Ryan Westbrook", "William Weston", "Yooa Baek-Harrington"];
export const isRTD = (n: string) => !!ME_ROLES.admin || rtdMem().includes(n);

/* divisiones e indicativo que salen de los rosters cargados (se suman a lo que tenga el perfil del agente) */
const MD_SUB_DIV: Record<string, string> = { swat: "Special Weapons And Tactics", bq: "Bomb Squad", cnt: "Crisis Negotiation Team", udu: "Underwater Dive Unit" };
export function rosterDivs(n: string): string[] {
  const out: string[] = [], md = uMap("md")[n];
  if (md) { out.push("Metropolitan Division"); for (const r of md) if (MD_SUB_DIV[r]) out.push(MD_SUB_DIV[r]); }
  if (uMap("asd")[n]) out.push("Air Support Division");
  if (uMap("k9")[n]) out.push("K-9 Division");
  if (uMap("psb")[n]) out.push("Professional Standards Bureau");
  if (rtdMem().includes(n)) out.push("Recruitment and Training Division");
  for (const [d, c] of Object.entries(GEN)) if (!out.includes(d) && isGMem(c.id, n)) out.push(d);
  return out;
}
export const rosterCall = (n: string) => ({ ...MD_CALLS, ...LS.json<Record<string, string>>("lspdt.mdCalls", {}) })[n] || "";
