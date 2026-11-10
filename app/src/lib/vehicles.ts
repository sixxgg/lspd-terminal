/* Modelos de vehículos: los del juego (marca + modelo, sacados de los datos de GTA V / FiveM) y el pack policial ONX del servidor */
import GAME from "@/data/veh.json";
import { ONX } from "./onx";
export { PATROL_CARS } from "./onx";

export type VehModel = { b: string; m: string; n: string; s: string; c: string };  // marca, modelo, nombre completo, spawn, categoría

export const POLICE_MODELS: VehModel[] = ONX.map(([s, m]) => ({ b: "LSPD (pack ONX)", m, n: m, s, c: "Policial" }));
export const GAME_MODELS: VehModel[] = (GAME as [string, string, string, string][]).map(([b, m, s, c]) => ({ b, m, n: b ? `${b} ${m}` : m, s, c }));
export const ALL_MODELS = [...POLICE_MODELS, ...GAME_MODELS];
export const VEH_CATS = [...new Set(ALL_MODELS.map(x => x.c))].sort((a, b) => (a === "Policial" ? -1 : b === "Policial" ? 1 : a.localeCompare(b, "es")));
const low = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
/* busca un modelo por nombre completo, por modelo solo o por código de spawn */
export function findModel(q: string, b?: string) { const k = low(q); if (!k) return undefined;
  return ALL_MODELS.find(x => low(x.n) === k || low(x.s) === k) || ALL_MODELS.find(x => low(x.m) === k && (!b || low(x.b) === low(b))); }
export const modelsOf = (c: string, b: string) => ALL_MODELS.filter(x => (!c || x.c === c) && (!b || low(x.b) === low(b)));
export const brandsOf = (c: string) => [...new Set(ALL_MODELS.filter(x => !c || x.c === c).map(x => x.b).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
