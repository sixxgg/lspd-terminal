/* Examen escrito en línea de la METRO: estado compartido (lo consulta cada tanto el aviso global, la pestaña Examen y la gestión). */
import { useSyncExternalStore } from "react";
import { api } from "./api";

type ExQ = { c: string; q: string; o: string[] };
type ExMe = { can: boolean; co: boolean; att: { st: "run" | "done"; t0: number; end: number; strikes: number; fin: string; test: boolean } | null; qs?: ExQ[]; ans?: (number | null)[] };
type ExCfg = { on: boolean; dur: number; at: string; conv: string; extra?: string[]; min?: number };
export type ExAtt = { n: string; t0: number; end: number; t1?: number; st: "run" | "done"; strikes: { t: number; why: string }[]; test: boolean; fin?: string; ok?: number; tot?: number; nota?: number;
  det?: { id: string; q: string; ch: string | null; okT: string; good: boolean }[]; ip?: string };
export type ExBank = { id: string; c: string; q: string; o: string[]; ok: number }[];
type ExState = { cfg: ExCfg; ready: boolean; n: number; en: string[]; now: number; me: ExMe; auto?: string[]; att?: ExAtt[]; bank?: ExBank; skew: number };

let S: ExState | null = null, full = false, busy: Promise<void> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export async function exRefresh(withFull = full) {
  full = full || withFull;
  if (busy) return busy;
  busy = (async () => {
    const r = await api("/api/exam" + (full ? "?full=1" : ""));
    if (r.__s === 200) { S = { ...(r as unknown as ExState), skew: Date.now() - r.now }; emit(); }
  })().finally(() => { busy = null; });
  return busy;
}
export const exApi = async (b: Record<string, unknown>) => { const r = await api("/api/exam", b); return r; };
export function useExam(): ExState | null { return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => S); }
/* hora del servidor (los relojes de las PC no siempre están en hora) */
export const srvNow = () => Date.now() - (S?.skew || 0);
export const atMs = (at: string) => (at ? +new Date(at) : 0);
export const fmtAt = (at: string) => (at ? new Date(at).toLocaleString("es-AR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "");
export const EX_OPEN = "lspdt:exam:open";
export const openExam = () => window.dispatchEvent(new Event(EX_OPEN));
