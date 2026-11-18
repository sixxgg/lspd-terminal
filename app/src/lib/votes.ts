/* Votaciones de ascenso y descenso (Supervisores › Votaciones): tipos, conteo y cierre automático al vencer.
   Aparte de la sección para que la campanita (que la tienen todos) pueda cerrar las vencidas sin cargar Supervisores. */
export type V = "favor" | "contra" | "abst";
export type Msg = { a?: string; r?: string; m: string; t: number; sys?: 1 };
export type Prop = { id: string; tipo: "asc" | "desc"; ag: { n: string; r: string; p?: string }; nr: string; motivo: string; autor: { n: string; r: string }; t: number;
  estado: "abierta" | "aprobada" | "rechazada"; votos: Record<string, { v: V; r: string; t: number }>; chat: Msg[]; cierre?: { n: string; r: string; t: number; auto?: 1 };
  exp?: number /* vence: a esa hora se cierra sola por mayoría (más a favor que en contra = aprobada) */ };
/* votaciones vencidas que siguen abiertas: se cierran solas por mayoría (lo hace la primera sesión de Supervisores que las ve) */
export function closeExpired(L: Prop[]): Prop[] | null {
  const now = Date.now(); let ch = false;
  const out = L.map(p => { if (p.estado !== "abierta" || !p.exp || p.exp > now) return p; ch = true; const c = tally(p), e = c.favor > c.contra ? "aprobada" : "rechazada";
    return { ...p, estado: e, cierre: { n: "Sistema", r: "", t: p.exp, auto: 1 }, chat: [...(p.chat || []), { sys: 1, m: `Votación vencida: ${e} por mayoría (${c.favor} a favor, ${c.contra} en contra, ${c.abst} abstenciones)`, t: p.exp }] } as Prop; });
  return ch ? out : null;
}
export const expLeft = (t: number) => { const m = Math.max(0, Math.round((t - Date.now()) / 60e3)); return m >= 120 ? `${Math.round(m / 60)} h` : m >= 60 ? `1 h ${m - 60} min` : `${m} min`; };
export const tally = (p: Prop) => { const c = { favor: 0, contra: 0, abst: 0 }; Object.values(p.votos || {}).forEach(v => c[v.v]++); return c; };
