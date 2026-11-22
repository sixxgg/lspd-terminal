import { useJSON } from "@/lib/store";
/* Lo que está activo en la tablet del servidor (información sensible: solo Gestión de ilícitos) (GANGNET › admin). Es la fuente más nueva: manda sobre la planilla vieja.
   - Robos activos: los «robos» de la tablet. No son misiones: son robos tipo badulaque (tiendas, cajas y contenedores) y también los hacen
     civiles (acceso «all»). Solo el Growshop pide banda (acceso «gang_type»).
   - Misiones: las de la tablet, con nivel de la banda, jugadores, policías en servicio que pide para arrancar, dinero, experiencia y
     para qué tipo de banda es (armas o drogas, nivel bajo o alto, hackers o crew). Faltan misiones: six las va pasando. */

export type Banda = "armas_bajo" | "armas_alto" | "drogas_bajo" | "drogas_alto" | "hackers" | "crew";
export const BANDAS: Record<Banda, { l: string; c: string; d: string }> = {
  armas_bajo: { l: "Armas · bajo", c: "#fb923c", d: "Bandas de armas de nivel bajo" },
  armas_alto: { l: "Armas · alto", c: "#ea580c", d: "Bandas de armas de nivel alto" },
  drogas_bajo: { l: "Drogas · bajo", c: "#a3e635", d: "Bandas de drogas de nivel bajo" },
  drogas_alto: { l: "Drogas · alto", c: "#65a30d", d: "Bandas de drogas de nivel alto" },
  hackers: { l: "Hackers", c: "#22d3ee", d: "Grupos de hackers" },
  crew: { l: "Crew", c: "#c084fc", d: "Crews (vehículos y persecuciones)" },
};
export const BANDA_KEYS = Object.keys(BANDAS) as Banda[];

/* ---------- los datos NO están en el código (el repo es público): viven en la base, en lspdt.ilg.tablet, y el servidor solo se los da
   a six y a Gestión de ilícitos (lspdt.ilgAcc). six los carga desde su panel › Robos › Ilícitos con el archivo .json. ---------- */
export type TRobo = { n: string; t: "basic" | "complex"; g: string; acc: "all" | "gang_type"; cd: number; grp: string };
/* pt: policías en servicio que pide para arrancar (0 = no pide) · cat / robo: dónde va en el catálogo si no está en la planilla */
export type TMis = { n: string; tipo: string; nv: number; min: number; max: number; pt: number; $: number; xp: number; b?: Banda; cat?: string; robo?: string };
/* rec: recompensas de la planilla vieja (por nombre de misión) */
export type TabData = { v: number; at: number; robos: TRobo[]; mis: TMis[]; rec?: Record<string, string> };
export const TAB_KEY = "lspdt.ilg.tablet", ILG_ACC = "lspdt.ilgAcc";
const tabOk = (x: unknown): x is TabData => !!x && typeof x === "object" && Array.isArray((x as TabData).robos) && Array.isArray((x as TabData).mis);
/* para cruzar nombres de la tablet con los de la planilla (sin tildes, signos ni mayúsculas; «Atraco/Asalto/Robo a…» da igual) */
export const nk = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\((ii|encargo)\)/g, "").replace(/[^a-z0-9& ]/g, " ")
  .replace(/\b(atraco|asalto|asalta|robo|roba)\s+(a|al|el|en)?\s*/g, "").replace(/\b(la|el|los|las|de|del|a|al|un|una)\b/g, " ").replace(/\s+/g, " ").trim();
/* los datos de la tablet si esta cuenta los puede leer (six y Gestión de ilícitos); si no, null */
export function useTablet(): TabData | null { const [x] = useJSON<unknown>(TAB_KEY, null); return tabOk(x) ? x : null; }
export const parseTab = (txt: string): TabData | null => { try { const x = JSON.parse(txt); return tabOk(x) ? x : null; } catch { return null; } };
