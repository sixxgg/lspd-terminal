/* Perfiles sociales: uno solo por persona para los tres departamentos (lspdt.uprof.* y compañía son claves compartidas).
   Nickname OOC, directorio de cuentas (ACC.dir, del servidor), departamento de cada uno y verificación estilo X. */
import { ACC, LS } from "./store";
import { DEPT, type DeptId } from "./dept";
import { emailOf } from "./domain";

/* nicks por defecto mientras no se pongan uno propio */
const NICK0: Record<string, string> = { "Ryan Westbrook": "six", "Evelyn Molina": "Aniita", "Liam Campbell": "TURKO", "Grant Knox": "CristianGV367" };
export const nickOf = (n: string) => (LS.json<{ nick?: string }>(`lspdt.uprof.${emailOf(n).split("@")[0]}`, {}).nick || "").trim() || NICK0[n] || n;

/* perfiles en BETA: por ahora solo estas cuentas los ven y los usan */
const PROF_BETA = ["Ryan Westbrook", "Evelyn Molina", "Liam Campbell", "Kai Jeon-Soo", "Grant Knox"];
export const PROF = { me: "" };
export const profOk = (n = PROF.me) => PROF_BETA.includes(n);

/* directorio: todas las cuentas de los tres departamentos en orden de registro; el ID del perfil es su lugar en esa lista */
export const dirOf = (n: string) => ACC.dir.find(x => x.n === n) || ACC.xr.find(x => x.n === n);
export const deptOfN = (n: string): DeptId => dirOf(n)?.d || DEPT.id;
export const accId = (n: string) => ACC.dir.findIndex(x => x.n === n) + 1;

/* verificación (como en X): azul = verificado, dorado = staff / organización, gris = jefatura o cargo oficial. La da six (lspdt.uverif). */
export type VTier = "azul" | "dorado" | "gris";
export const VERIF: Record<VTier, { c: string; l: string }> = { azul: { c: "#1d9bf0", l: "Verificado" }, dorado: { c: "#e2b719", l: "Staff de la terminal" }, gris: { c: "#829aab", l: "Cargo oficial" } };
const VERIF0: Record<string, VTier> = { "Ryan Westbrook": "dorado" };
export const verifOf = (n: string): VTier | null => { const v = LS.json<Record<string, VTier | "">>("lspdt.uverif", {})[n]; return v === "" ? null : v || VERIF0[n] || null; };
export const setVerif = (n: string, v: VTier | "") => LS.setJSON("lspdt.uverif", { ...LS.json<Record<string, string>>("lspdt.uverif", {}), [n]: v });
