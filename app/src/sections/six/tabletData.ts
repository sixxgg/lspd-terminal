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
/* armamento (tablet 24/11): arm = con qué se juega la misión · ae = armas de los enemigos · npc = NPC armados */
export type Arm = "sin" | "cac" | "pist" | "grandes" | "exp";
export const ARM: Record<Arm, { l: string; s: string; c: string }> = {
  sin: { l: "Sin armas", s: "Sin armas", c: "#94a3b8" }, cac: { l: "Cuerpo a cuerpo", s: "C. a c.", c: "#a78bfa" },
  pist: { l: "Pistolas", s: "Pistolas", c: "#38bdf8" }, grandes: { l: "Armas grandes", s: "Grandes", c: "#f97316" }, exp: { l: "Explosivos", s: "Explosivos", c: "#ef4444" },
};
export const ARM_KEYS = Object.keys(ARM) as Arm[];
export type TMis = { n: string; tipo: string; nv: number; min: number; max: number; pt: number; $: number; xp: number; b?: Banda; cat?: string; robo?: string;
  id?: number; arm?: Arm; ae?: Arm[]; npc?: number; off?: boolean }; /* arm = armas obligatorias de la misión · off = inactiva en la tablet */
/* rec: recompensas de la planilla vieja (por nombre de misión) */
export type TabData = { v: number; at: number; robos: TRobo[]; mis: TMis[]; rec?: Record<string, string> };
export const TAB_KEY = "lspdt.ilg.tablet", ILG_ACC = "lspdt.ilgAcc";
const tabOk = (x: unknown): x is TabData => !!x && typeof x === "object" && Array.isArray((x as TabData).robos) && Array.isArray((x as TabData).mis);
/* para cruzar nombres de la tablet con los de la planilla (sin tildes, signos ni mayúsculas; «Atraco/Asalto/Robo a…» da igual) */
export const nk = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\((ii|encargo)\)/g, "").replace(/[^a-z0-9& ]/g, " ")
  .replace(/\b(atraco|asalto|asalta|robo|roba)\s+(a|al|el|en)?\s*/g, "").replace(/\b(la|el|los|las|de|del|a|al|un|una)\b/g, " ").replace(/\s+/g, " ").trim();
/* los datos de la tablet si esta cuenta los puede leer (six y Gestión de ilícitos); si no, null */
export function useTablet(): TabData | null { const [x] = useJSON<unknown>(TAB_KEY, null); return tabOk(x) ? x : null; }
export const TAB_BAK = "lspdt.ilg.tablet.bak";
type TabFile = TabData & { merge?: boolean; full?: boolean }; /* full: el archivo trae TODAS las misiones de la tablet */
export const parseTab = (txt: string): TabFile | null => { try { const x = JSON.parse(txt); return tabOk(x) ? x : null; } catch { return null; } };
/* «merge»: suma lo nuevo sin borrar lo que ya estaba. Cada misión nueva se cruza con la vieja por id; si no, por nombre (nk), y entre
   las que se llaman igual, la del mismo nivel y tipo (después jugadores y dinero). Lo que trae el archivo pisa el valor viejo; lo que
   no trae (banda, catálogo, robo) se conserva. Lo que no se cruza se agrega. Los robos se cruzan por nombre. */
export function mergeTab(old: TabData, add: TabFile): { d: TabData; upd: number; nue: number } {
  let upd = 0, nue = 0; const mis = old.mis.map(m => ({ ...m })), used = new Set<number>();
  for (const m of add.mis) {
    let i = m.id != null ? mis.findIndex((x, j) => !used.has(j) && x.id === m.id) : -1;
    if (i < 0) { const C = mis.map((x, j) => [x, j] as const).filter(([x, j]) => !used.has(j) && x.id == null && nk(x.n) === nk(m.n));
      const sc = (x: TMis) => (x.nv === m.nv ? 8 : 0) + (x.tipo === m.tipo ? 4 : 0) + (x.min === m.min && x.max === m.max ? 2 : 0) + (x.$ === m.$ ? 1 : 0);
      i = C.sort((a, b) => sc(b[0]) - sc(a[0]))[0]?.[1] ?? -1; }
    if (i >= 0) { used.add(i); mis[i] = { ...mis[i], ...m }; upd++; } else { used.add(mis.push({ ...m }) - 1); nue++; }
  }
  /* «full»: lo que quedó sin cruzar ya no está en la tablet → no se borra, queda como inactiva (fuera del catálogo) */
  if (add.full) mis.forEach((m, j) => { if (!used.has(j) && !m.off) { mis[j] = { ...m, off: true }; upd++; } });
  const robos = old.robos.map(r => ({ ...r }));
  for (const r of add.robos) { const i = robos.findIndex(x => nk(x.n) === nk(r.n)); if (i >= 0) robos[i] = { ...robos[i], ...r }; else robos.push({ ...r }); }
  return { d: { v: Math.max(old.v || 1, add.v || 1), at: Date.now(), robos, mis, rec: { ...(old.rec || {}), ...(add.rec || {}) } }, upd, nue };
}
