/* Placas pendientes: agentes del departamento sin placa de servicio (sobre todo los que llegaron por traslado). Se avisa todos los días a
   Sargentos, Capitanía y Jefatura de ese departamento hasta que alguien se la asigna (Agentes › «Placas pendientes»). En el LSPD solo cuentan
   los que entraron por traslado; en el LSSD y la SAHP, cualquiera que figure sin placa. */
import { DEPT } from "./dept";
import { getRoster, lvl } from "./domain";
import { ME_ROLES, type Agent } from "./store";

type Pend = Agent & { src?: string; tr?: string };
const OUT = /retir|baja|inactiv|expuls|traslad/i;
export const placaPend = (): Pend[] => (getRoster() as Pend[]).filter(a => !String(a.p ?? "").trim() && !OUT.test(String(a.e || "")) && (DEPT.id !== "lspd" || /^xfer-/.test(String(a.tr || ""))));
/* quién la asigna: Sargento para arriba (en el LSPD Sargento I), la administración del departamento y six */
export const placaCan = (r: string) => !!ME_ROLES.six || !!ME_ROLES.dadm || (!!ME_ROLES.admin && DEPT.id === "lspd") || lvl(r) >= (DEPT.id === "lspd" ? 6 : 7);
/* llegó por traslado: de dónde y cuándo (si el alta lo dice) */
export const arrivedOf = (a: Pend) => { const m = /^xfer-(\d+)$/.exec(String(a.tr || "")); return { src: a.src || "", t: m ? +m[1] : 0 }; };
/* placa libre: que no la tenga otro agente activo del departamento */
export const placaUsedBy = (p: string, n: string) => (getRoster() as Pend[]).find(a => a.n !== n && String(a.p ?? "").trim() === p && !OUT.test(String(a.e || "")))?.n || "";
