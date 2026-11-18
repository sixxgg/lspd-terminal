/* Logos personalizados guardados también en este navegador: así la pantalla de actualización y el ícono de la pestaña
   ya salen con el logo de la terminal antes de que carguen los datos (y no el logo por defecto). */
import { LS } from "./store";
import { DEPT, deptLogo } from "./dept";

const K = "lspdt.next.brandCache";
type C = { upd?: string; fav?: string };
const read = (): C => { try { return JSON.parse(localStorage.getItem(K) || "{}") as C; } catch { return {}; } };
export function brandSave() {
  const c: C = { upd: LS.get("lspdt.logo.upd") || LS.get("lspdt.logo") || undefined, fav: LS.get("lspdt.fav") || LS.get("lspdt.logo") || undefined };
  try { if (JSON.stringify(c) !== JSON.stringify(read())) localStorage.setItem(K, JSON.stringify(c)); } catch { /* sin espacio: queda el de por defecto */ }
}
export const updLogo = () => DEPT.id !== "lspd" ? deptLogo(DEPT.id) : LS.get("lspdt.logo.upd") || LS.get("lspdt.logo") || read().upd || "/next/logo.svg";
