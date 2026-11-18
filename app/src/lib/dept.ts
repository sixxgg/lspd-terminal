/* Departamentos de la terminal: LSPD, LSSD (Sheriff) y SAHP (Highway Patrol). Los tres tienen las mismas secciones;
   los datos de cada uno van aparte (store.ts, dk). Las cuentas del LSSD y la SAHP ven solo su departamento; six cambia tocando el escudo. */
import { LS, setKeyDept } from "./store";
import { setSkinDept } from "./appearance";

export type DeptId = "lspd" | "lssd" | "sahp";
export const DEPTS: Record<DeptId, { short: string; name: string; logo: string }> = {
  lspd: { short: "LSPD", name: "Los Santos Police Department", logo: "/next/logo.svg" },
  lssd: { short: "LSSD", name: "Los Santos Sheriff's Department", logo: "/next/lssd.svg" },
  sahp: { short: "SAHP", name: "San Andreas Highway Patrol", logo: "/next/sahp.svg" },
};
/* «del LSPD», «del LSSD», «de la SAHP» */
export const DEL: Record<DeptId, string> = { lspd: "del LSPD", lssd: "del LSSD", sahp: "de la SAHP" };
/* en los perros del K-9: h = usuario del handler, hn = su nombre */
export type LssdAg = { n: string; r: string; p: string; e?: string; i?: string; u?: string; h?: string; hn?: string };
export const isK9 = (a: LssdAg) => a.r === "K-9";

/* departamento activo: el de la cuenta (LSSD) o el que eligió six (se recuerda en este navegador) */
export const DEPT: { id: DeptId; forced: boolean } = { id: "lspd", forced: false };
const listeners = new Set<() => void>();
export const onDept = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export function setDept(d: DeptId, forced = false) {
  DEPT.id = d; DEPT.forced = forced; setKeyDept(d); setSkinDept(d);
  if (!forced) try { localStorage.setItem("lspdt.next.dept", d); } catch { /* */ }
  document.documentElement.dataset.dept = d;
  listeners.forEach(f => f());
}
export const savedDept = (): DeptId => { try { const d = localStorage.getItem("lspdt.next.dept"); return d === "lssd" || d === "sahp" ? d : "lspd"; } catch { return "lspd"; } };
/* escudo de cada departamento: el que se cargó en Administración › Marca o el de fábrica */
export const deptLogo = (d: DeptId, brand?: Record<string, string>) => (d === "lspd" ? "" : brand?.[`lspdt.logo.${d}`] || LS.get(`lspdt.logo.${d}`)) || DEPTS[d].logo;
