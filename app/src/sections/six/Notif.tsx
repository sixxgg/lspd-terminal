/* six · notificaciones: los feedback que mandan los usuarios (lspdt.six.fb.*), con estado pendiente / en curso / añadido-arreglado */
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Hammer, Trash2, Inbox } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { Avatar } from "@/components/agents";
import { LS, useStoreVersion } from "@/lib/store";
import { safeHtml } from "@/lib/richtext";
import { fmtDate, rankES } from "@/lib/domain";
import { cn } from "@/lib/cn";

export type FbTicket = { id: string; by: string; r: string; t: number; html: string; imgs: string[]; st: "pend" | "curso" | "hecho" };
export const FB_PREFIX = "lspdt.six.fb.", FB_SEEN = "lspdt.six.fbSeen";
export const fbList = (): FbTicket[] => LS.keys(FB_PREFIX).map(k => LS.ro<FbTicket | null>(k, null)).filter((x): x is FbTicket => !!x && !!x.id).sort((a, b) => b.t - a.t);
export const ST = [["pend", "Pendiente", Clock, "#f59e0b"], ["curso", "En curso", Hammer, "#38bdf8"], ["hecho", "Añadido / arreglado", CheckCircle2, "#22c55e"]] as const;

export function NotifTab() {
  useStoreVersion();
  const { confirm, toast } = useFeedback(), [f, setF] = useState<"" | FbTicket["st"]>("");
  const L = fbList(), seen = Number(LS.get(FB_SEEN) || 0);
  const shown = useMemo(() => L.filter(x => !f || x.st === f), [L, f]);
  const setSt = (x: FbTicket, st: FbTicket["st"]) => { LS.setJSON(FB_PREFIX + x.id, { ...x, st }); toast(`Marcado como «${ST.find(s => s[0] === st)![1]}»`); };
  const del = async (x: FbTicket) => { if (!(await confirm(`¿Borrar el feedback de ${x.by}? No se puede deshacer.`, { danger: true, ok: "Borrar" }))) return; x.imgs.forEach(k => LS.del(k)); LS.del(FB_PREFIX + x.id); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([["", "Todos", Inbox, ""], ...ST] as const).map(([k, l, I, c]) => { const n = k ? L.filter(x => x.st === k).length : L.length; return (
          <button key={k} onClick={() => setF(k)} style={c ? { ["--k" as string]: c } : undefined}
            className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-sans text-xs font-semibold transition", f === k ? "border-six bg-six/10 text-six" : "border-six/15 text-slate-400 hover:text-slate-200")}>
            <I className="size-4" style={c ? { color: c } : undefined} />{l}<span className="rounded-md bg-black/40 px-1.5 tabular-nums">{n}</span></button>); })}
        {L.some(x => x.t > seen) && <button onClick={() => LS.set(FB_SEEN, String(Date.now()))} className="ml-auto font-sans text-xs text-six/80 hover:text-six">Marcar todo como leído</button>}
      </div>
      {!shown.length && <section className="six-panel relative rounded-2xl p-10 text-center font-sans text-sm text-slate-500"><Inbox className="mx-auto mb-2 size-6" />{L.length ? "Nada en este estado." : "Todavía no llegó ningún feedback."}</section>}
      {shown.map(x => { const nuevo = x.t > seen, html = safeHtml(x.html, el => { const m = /^img:(\d+)$/.exec(el.getAttribute("src") || ""); return m ? LS.get(x.imgs[+m[1]]) || "" : ""; }); return (
        <section key={x.id} className={cn("six-panel relative rounded-2xl p-4", nuevo && "ring-1 ring-six/60")}>
          <i className="six-corner tl" /><i className="six-corner br" />
          <header className="mb-3 flex flex-wrap items-center gap-3">
            <Avatar n={x.by} size={34} />
            <div className="min-w-0 font-sans"><p className="font-semibold text-white">{x.by}{nuevo && <span className="ml-2 rounded bg-six px-1.5 text-[10px] font-bold text-black">NUEVO</span>}</p>
              <p className="text-xs text-slate-500">{x.r ? rankES(x.r) + " · " : ""}{fmtDate(x.t)}</p></div>
            <div className="ml-auto flex flex-wrap gap-1">{ST.map(([k, l, I, c]) => (
              <button key={k} onClick={() => setSt(x, k)} title={l} style={{ ["--k" as string]: c }}
                className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-sans text-[11px] font-semibold transition", x.st === k ? "border-[var(--k)] bg-[color-mix(in_srgb,var(--k)_15%,transparent)] text-[var(--k)]" : "border-six/15 text-slate-500 hover:text-slate-200")}>
                <I className="size-3.5" />{l}</button>))}
              <button onClick={() => del(x)} title="Borrar" className="rounded-lg p-1.5 text-slate-600 hover:text-[#ff2b4a]"><Trash2 className="size-4" /></button></div>
          </header>
          <div className="fb-rich font-sans text-sm leading-relaxed text-slate-200" dangerouslySetInnerHTML={{ __html: html }} />
        </section>); })}
    </div>
  );
}
