/* Logos personalizados guardados también en este navegador: así la pantalla de actualización y el ícono de la pestaña
   ya salen con el logo de la terminal antes de que carguen los datos (y no el logo por defecto). */
import { LS } from "./store";
import { logoOf } from "./dept";

const K = "lspdt.next.brandCache";
type C = { upd?: string; fav?: string };
const read = (): C => { try { return JSON.parse(localStorage.getItem(K) || "{}") as C; } catch { return {}; } };
export function brandSave() {
  const c: C = { upd: logoOf("lspdt.logo.upd"), fav: LS.get("lspdt.fav") || logoOf() };
  try { if (JSON.stringify(c) !== JSON.stringify(read())) localStorage.setItem(K, JSON.stringify(c)); } catch { /* sin espacio: queda el de por defecto */ }
}
export const updLogo = () => (LS.get("lspdt.logo.upd") || LS.get("lspdt.logo") ? logoOf("lspdt.logo.upd") : read().upd || logoOf());
