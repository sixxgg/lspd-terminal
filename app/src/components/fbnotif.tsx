/* Estados del feedback y las notificaciones de cada usuario (campanita): ve sus feedback y en qué quedaron, desde cualquier dispositivo. */
import { useCallback, useEffect, useState } from "react";
import { Ban, Bell, Clock, Hammer, Heart, PackagePlus, Trash2, Wrench, XCircle, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/modal";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/domain";
import { cn } from "@/lib/cn";

export type FbSt = "pend" | "curso" | "add" | "fix" | "rej" | "desc" | "elim";
export const FB_ST: Record<FbSt, { l: string; I: LucideIcon; c: string }> = {
  pend: { l: "Pendiente", I: Clock, c: "#f59e0b" }, curso: { l: "En curso", I: Hammer, c: "#38bdf8" }, add: { l: "Añadido", I: PackagePlus, c: "#22c55e" },
  fix: { l: "Arreglado", I: Wrench, c: "#10b981" }, rej: { l: "Rechazado", I: XCircle, c: "#ef4444" }, desc: { l: "Descartado", I: Ban, c: "#94a3b8" }, elim: { l: "Eliminado", I: Trash2, c: "#64748b" },
};
/* los tickets viejos usaban «hecho» */
export const fbSt = (s?: string): FbSt => (s === "hecho" ? "fix" : s && s in FB_ST ? (s as FbSt) : "pend");
export function FbBadge({ s, className }: { s?: string; className?: string }) {
  const x = FB_ST[fbSt(s)];
  return <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold", className)} style={{ color: x.c, borderColor: x.c + "66", background: x.c + "1a" }}><x.I className="size-3" />{x.l}</span>;
}

export type MyFb = { id: string; t: number; u: number; st: string; x: string; nota?: string };
const SEEN = "lspdt.next.fbSeen";
const getSeen = () => { try { return Number(localStorage.getItem(SEEN) || 0); } catch { return 0; } };
/* mis feedback (del servidor), se actualiza cada 2 minutos y al volver a la pestaña */
export function useMyFeedback() {
  const [list, setList] = useState<MyFb[]>([]), [seen, setSeenS] = useState(getSeen);
  const load = useCallback(async () => { const r = await api("/api/feedback"); if (r.__s === 200 && Array.isArray(r.list)) setList(r.list as MyFb[]); }, []);
  useEffect(() => { void load(); const i = setInterval(() => { if (!document.hidden) void load(); }, 120000); const v = () => { if (!document.hidden) void load(); };
    window.addEventListener("lspd:fb", load); document.addEventListener("visibilitychange", v);
    return () => { clearInterval(i); window.removeEventListener("lspd:fb", load); document.removeEventListener("visibilitychange", v); }; }, [load]);
  const markSeen = () => { const n = Date.now(); try { localStorage.setItem(SEEN, String(n)); } catch { /* */ } setSeenS(n); };
  /* novedades: cambios de estado que el usuario todavía no vio (lo que él mismo mandó no cuenta) */
  const news = list.filter(x => x.u > seen && x.u !== x.t).length;
  return { list, news, markSeen, reload: load };
}

export function FbList({ list }: { list: MyFb[] }) {
  if (!list.length) return <p className="py-6 text-center text-sm text-slate-400">Todavía no mandaste feedback.</p>;
  return <div className="space-y-2">{list.map(x => (
    <div key={x.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-1 flex items-center gap-2"><FbBadge s={x.st} /><span className="ml-auto text-[11px] text-slate-400">{x.u !== x.t ? `Actualizado ${fmtDate(x.u)}` : fmtDate(x.t)}</span></div>
      <p className={cn("line-clamp-3 text-sm", fbSt(x.st) === "elim" && "text-slate-400 line-through")}>{x.x || "(solo fotos)"}</p>
      {x.nota && <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><b>Respuesta:</b> {x.nota}</p>}
    </div>))}</div>;
}

/* campanita del encabezado: solo aparece si la persona mandó algún feedback */
export function FbBell() {
  const { list, news, markSeen } = useMyFeedback(), [open, setOpen] = useState(false);
  if (!list.length) return null;
  return <>
    <button onClick={() => { setOpen(true); markSeen(); }} title="Mis feedback" aria-label={`Mis feedback${news ? ` (${news} novedades)` : ""}`}
      className="relative rounded-lg p-2 text-slate-400 transition hover:bg-pink-500/10 hover:text-pink-500">
      <Bell className="size-4" />{news > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">{news}</span>}</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Mis feedback" desc="En qué quedó cada cosa que mandaste." icon={<Heart />}><FbList list={list} /></Modal>
  </>;
}
