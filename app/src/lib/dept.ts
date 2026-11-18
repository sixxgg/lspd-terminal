/* Departamentos de la terminal: LSPD (el de siempre), LSSD (Sheriff, en construcción) y SAHP (próximamente).
   Las cuentas del LSSD siempre ven el LSSD; six cambia entre departamentos tocando el escudo. */
import { LS } from "./store";

export type DeptId = "lspd" | "lssd" | "sahp";
export const DEPTS: Record<DeptId, { short: string; name: string; logo: string; soon?: boolean }> = {
  lspd: { short: "LSPD", name: "Los Santos Police Department", logo: "/next/logo.svg" },
  lssd: { short: "LSSD", name: "Los Santos Sheriff's Department", logo: "/next/lssd.svg" },
  sahp: { short: "SAHP", name: "San Andreas Highway Patrol", logo: "/next/sahp.svg", soon: true },
};
/* rangos del Sheriff (número de insignia de la planilla) */
const LSSD_LVL: Record<string, number> = { "Sheriff": 14, "Undersheriff": 13, "Assistant Sheriff": 12, "Division Chief": 11, "Area Commander": 10, "Captain": 9, "Lieutenant": 8, "Sergeant": 7,
  "Deputy Sheriff Master FTO": 6, "Deputy Sheriff Bonus II": 5, "Deputy Sheriff Bonus I": 4, "Deputy Sheriff": 3, "Deputy Sheriff Trainee": 2 };
export const LSSD_ES: Record<string, string> = { "Sheriff": "Sheriff", "Undersheriff": "Undersheriff", "Assistant Sheriff": "Sheriff Adjunto", "Division Chief": "Jefe de División", "Area Commander": "Comandante de Área",
  "Captain": "Capitán", "Lieutenant": "Teniente", "Sergeant": "Sargento", "Deputy Sheriff Master FTO": "Ayudante Master FTO", "Deputy Sheriff Bonus II": "Ayudante Bonus II", "Deputy Sheriff Bonus I": "Ayudante Bonus I",
  "Deputy Sheriff": "Ayudante del Sheriff", "Deputy Sheriff Trainee": "Ayudante en prácticas" };
export const lssdLvl = (r?: string) => LSSD_LVL[r || ""] || 0;
export type LssdAg = { n: string; r: string; p: string; e?: string; i?: string; u?: string };

/* departamento activo: el de la cuenta (LSSD) o el que eligió six (se recuerda en este navegador) */
export const DEPT: { id: DeptId; forced: boolean } = { id: "lspd", forced: false };
const listeners = new Set<() => void>();
export const onDept = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export function setDept(d: DeptId, forced = false) {
  DEPT.id = d; DEPT.forced = forced;
  if (!forced) try { localStorage.setItem("lspdt.next.dept", d); } catch { /* */ }
  document.documentElement.dataset.dept = d;
  listeners.forEach(f => f());
}
export const savedDept = (): DeptId => { try { const d = localStorage.getItem("lspdt.next.dept"); return d === "lssd" ? "lssd" : "lspd"; } catch { return "lspd"; } };
/* roster del LSSD: el cargado por six (lspdt.lssd.roster) o el que mandó el servidor al iniciar */
export const lssdRoster = (): LssdAg[] => LS.json<LssdAg[]>("lspdt.lssd.roster", []);
/* escudo de cada departamento: el que se cargó en Administración › Marca o el de fábrica */
export const deptLogo = (d: DeptId, brand?: Record<string, string>) => (d === "lspd" ? "" : brand?.[`lspdt.logo.${d}`] || LS.get(`lspdt.logo.${d}`)) || DEPTS[d].logo;
