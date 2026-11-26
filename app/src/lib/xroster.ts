/* La PSB abarca a todo el SAPD: rosters cargados del LSPD, el LSSD y la SAHP (nombre, rango y placa), para notificar, citar o abrir
   expedientes a cualquier agente. El servidor solo los da a la PSB, six y la administración. Si un departamento no tiene roster cargado, no aparece. */
import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { DEPT } from "./dept";
import { getRoster, findAgent } from "./domain";
import type { Agent } from "./store";

type XAgent = Agent & { dep: "LSPD" | "LSSD" | "SAHP" };
const DN = { lspd: "LSPD", lssd: "LSSD", sahp: "SAHP" } as const;
let L: XAgent[] | null = null, busy = false, at = 0;
const subs = new Set<() => void>(), emit = () => subs.forEach(f => f());
async function load() {
  if (busy || (L && Date.now() - at < 120000)) return; busy = true;
  try { const r = await api("/api/data?xroster=1"); if (r.__s === 200) {
    const d = r as unknown as Record<keyof typeof DN, { n: string; r: string; p: string }[]>;
    L = (Object.keys(DN) as (keyof typeof DN)[]).flatMap(k => (Array.isArray(d[k]) ? d[k] : []).map(a => ({ ...a, dep: DN[k] }) as XAgent)); at = Date.now(); emit(); } }
  finally { busy = false; }
}
/* los tres rosters; mientras no llegan (o si no hay acceso), el del departamento abierto */
export function useXRoster(on = true): XAgent[] {
  useEffect(() => { if (on) void load(); }, [on]);
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => L ?? local(), () => local());
}
let LC: XAgent[] = [], LK: unknown = null;
function local(): XAgent[] { const R = getRoster(); if (R !== LK) { LK = R; LC = R.map(a => ({ ...a, dep: DN[DEPT.id as keyof typeof DN] || "LSPD" })); } return LC; }
/* busca en los tres (primero el propio departamento) */
export const findAny = (n: string): XAgent | null => { const a = findAgent(n); if (a) return { ...a, dep: DN[DEPT.id as keyof typeof DN] || "LSPD" }; return (L || []).find(x => x.n === n) || null; };
