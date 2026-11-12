/* Estados del feedback y «mis feedback» de cada usuario (los trae del servidor; la campanita está en components/notifs.tsx). */
import { useCallback, useEffect, useState } from "react";
import { Ban, Clock, Hammer, PackagePlus, Trash2, Wrench, XCircle, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { ago } from "@/lib/domain";
import { cn } from "@/lib/cn";

export type FbSt = "pend" | "curso" | "add" | "fix" | "rej" | "desc" | "elim";
export const FB_ST: Record<FbSt, { l: string; I: LucideIcon; c: string }> = {
  pend: { l: "Pendiente", I: Clock, c: "#f59e0b" }, curso: { l: "En curso", I: Hammer, c: "#38bdf8" }, add: { l: "Añadido", I: PackagePlus, c: "#22c55e" },
  fix: { l: "Arreglado", I: Wrench, c: "#10b981" }, rej: { l: "Rechazado", I: XCircle, c: "#ef4444" }, desc: { l: "Descartado", I: Ban, c: "#94a3b8" }, elim: { l: "Eliminado", I: Trash2, c: "#64748b" },
};
/* los tickets viejos usaban «hecho» */
export const fbSt = (s?: string): FbSt => (s === "hecho" ? "fix" : s && s in FB_ST ? (s as FbSt) : "pend");
function FbBadge({ s, className }: { s?: string; className?: string }) {
  const x = FB_ST[fbSt(s)];
  return <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold", className)} style={{ color: x.c, borderColor: x.c + "66", background: x.c + "1a" }}><x.I className="size-3" />{x.l}</span>;
}

/* los resúmenes viejos traían «[foto]» por cada imagen */
export const fbX = (x?: string) => { const s = x || "", n = (s.match(/\[foto\]/g) || []).length; if (!n) return s || "(solo fotos)";
  const t = s.replace(/\[foto\]/g, " ").replace(/\s+/g, " ").trim(); return `[📷 ${n} ${n === 1 ? "foto" : "fotos"}]${t ? " " + t : ""}`; };
type MyFb = { id: string; t: number; u: number; st: string; x: string; nota?: string; cat?: string; area?: string };
const CAT: Record<string, [string, string]> = { error: ["🐞 Error", "#ef4444"], idea: ["💡 Idea", "#f59e0b"], mejora: ["✨ Mejora", "#a855f7"], otro: ["💬 Otro", "#64748b"] };
const SEEN = "lspdt.next.fbSeen";
const getSeen = () => { try { return Number(localStorage.getItem(SEEN) || 0); } catch { return 0; } };
/* mis feedback (del servidor), se actualiza cada 2 minutos y al volver a la pestaña */
export function useMyFeedback() {
  const [list0, setList] = useState<MyFb[]>([]), [seen, setSeenS] = useState(getSeen);
  const load = useCallback(async () => { const r = await api("/api/feedback"); if (r.__s === 200 && Array.isArray(r.list)) setList(r.list as MyFb[]); }, []);
  useEffect(() => { void load(); const i = setInterval(() => { if (!document.hidden) void load(); }, 120000); const v = () => { if (!document.hidden) void load(); };
    window.addEventListener("lspd:fb", load); document.addEventListener("visibilitychange", v);
    return () => { clearInterval(i); window.removeEventListener("lspd:fb", load); document.removeEventListener("visibilitychange", v); }; }, [load]);
  const list = list0.filter(x => fbSt(x.st) !== "elim"); /* lo eliminado no se avisa ni queda en el historial */
  const markSeen = () => { const n = Date.now(); try { localStorage.setItem(SEEN, String(n)); } catch { /* */ } setSeenS(n); };
  /* novedades: cambios de estado que el usuario todavía no vio (lo que él mismo mandó no cuenta) */
  const news = list.filter(x => x.u > seen && x.u !== x.t).length;
  return { list, news, markSeen, reload: load };
}

/* vuelve a dibujar cada minuto para que «hace X minutos» quede al día */
export function useTick(ms = 60000) { const [, f] = useState(0); useEffect(() => { const i = setInterval(() => f(x => x + 1), ms); return () => clearInterval(i); }, [ms]); }
export function FbList({ list }: { list: MyFb[] }) {
  useTick();
  if (!list.length) return <p className="py-10 text-center text-sm text-slate-400">Nada por acá todavía.</p>;
  return <div className="space-y-2">{list.map(x => (
    <div key={x.id} className="rounded-xl border border-l-4 border-slate-200 p-3 dark:border-slate-800" style={{ borderLeftColor: FB_ST[fbSt(x.st)].c }}>
      <div className="mb-1 flex flex-wrap items-center gap-2"><FbBadge s={x.st} />{x.cat && CAT[x.cat] && <span className="text-[11px] font-semibold" style={{ color: CAT[x.cat][1] }}>{CAT[x.cat][0]}</span>}{x.area && <span className="rounded bg-slate-100 px-1.5 text-[10.5px] font-semibold text-slate-500 dark:bg-slate-800">{x.area}</span>}<span className="ml-auto text-[11px] text-slate-400">{x.u !== x.t ? `Actualizado ${ago(x.u)}` : ago(x.t)}</span></div>
      <p className="line-clamp-3 text-sm">{fbX(x.x)}</p>
      {x.nota && <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><b>Respuesta:</b> {x.nota}</p>}
    </div>))}</div>;
}
