/* Publica el catálogo de robos (lspdt.robos) para Supervisores y Oficiales apenas alguien lo edita: six, Anita o la administración
   (CristianGV367). Con los datos de la tablet se arma completo; sin ellos (quien no es de Gestión de ilícitos) se parchea lo publicado
   solo en los robos editados, para no perder lo que sale de la tablet. */
import { LS, ME_ROLES } from "@/lib/store";
import { ROBOS_V, catalogo, type RobEdit, type RobLog } from "./robosData";
import { leyOf, pubItems, type PubItem, type RobosPub } from "./robosLegal";
import type { TabData } from "./tabletData";

const LBL = { n: "Nombre", min: "Atracadores mín.", max: "Atracadores máx.", pol: "Policías máx.", reh: "Rehenes", blq: "Bloqueo", pv: "Vehículos policiales", mando: "Mando", ilg: "Vehículo", arm: "Armas" } as const;
type K = keyof typeof LBL;
const KS = Object.keys(LBL) as K[], BY_L = Object.fromEntries(KS.map(k => [LBL[k], k])) as Record<string, K>;
/* quién puede editar el catálogo (el servidor lo controla igual) */
export const robEditor = () => !!(ME_ROLES.six || ME_ROLES.anita || ME_ROLES.dadm);

export function publishRobos(ED: Record<string, RobEdit>, LOG: RobLog[], TD: TabData | null, by: string) {
  const cur = LS.json<RobosPub | null>("lspdt.robos", null), log = LOG.slice(0, 100);
  let items: PubItem[];
  /* sin la tablet nunca se rearma todo (se perderían las misiones que salen de ella): se parchea lo publicado */
  if (TD || !cur?.items?.length) items = pubItems(catalogo(ED, TD));
  else {
    const base = catalogo({}, null);
    items = cur.items.map(it => {
      const e = ED[it.id], was = it.ed; if (!e && !was?.c.length) return it;
      const b = base.find(x => x.id === it.id) as Record<string, unknown> | undefined, o = { ...it } as Record<string, unknown>;
      /* deshace lo editado antes y aplica lo de ahora */
      if (was && b) for (const c of was.c) { const k = BY_L[c.split(":")[0].trim()]; if (k) o[k] = b[k]; }
      const c: string[] = [];
      if (e) for (const k of KS) { if (!(k in e) || e[k] === undefined || JSON.stringify(o[k] ?? null) === JSON.stringify(e[k] ?? null)) continue; c.push(LBL[k]); o[k] = e[k] ?? undefined; }
      const nx = { ...o, ed: c.length ? { at: e?.at || Date.now(), c } : undefined } as PubItem; nx.ley = leyOf(nx); return nx;
    });
  }
  if (cur && cur.v === ROBOS_V && JSON.stringify(cur.items) === JSON.stringify(items) && JSON.stringify(cur.log || []) === JSON.stringify(log)) return;
  LS.setJSON("lspdt.robos", { at: Date.now(), by, items, v: ROBOS_V, log });
}
