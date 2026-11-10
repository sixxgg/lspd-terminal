/* six · notificaciones: los feedback que mandan los usuarios (lspdt.six.fb.*). Cada estado le llega a quien lo mandó (campanita). */
import { useMemo, useState } from "react";
import { ChevronDown, Inbox, Layers, MessageSquareReply, Trash2 } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { Avatar } from "@/components/agents";
import { FB_ST, fbSt, fbX, type FbSt } from "@/components/fbnotif";
import { LS, useStoreVersion } from "@/lib/store";
import { plainOf, safeHtml } from "@/lib/richtext";
import { fmtDate } from "@/lib/domain";
import { cn } from "@/lib/cn";

export type FbTicket = { id: string; by: string; who?: string; no?: number; t: number; u?: number; html: string; x?: string; imgs: string[]; st: string; nota?: string };
export const FB_PREFIX = "lspdt.six.fb.", FB_SEEN = "lspdt.six.fbSeen";
export const fbList = (): FbTicket[] => LS.keys(FB_PREFIX).map(k => LS.ro<FbTicket | null>(k, null)).filter((x): x is FbTicket => !!x && !!x.id && x.st !== "elim")
  .map(x => (x.x != null ? x : { ...x, x: (x.imgs.length ? `[📷 ${x.imgs.length} ${x.imgs.length === 1 ? "foto" : "fotos"}] ` : "") + plainOf(x.html.replace(/<img[^>]*>/gi, "")).replace(/\s+/g, " ").slice(0, 160) })).sort((a, b) => b.t - a.t);
const ORDER: FbSt[] = ["pend", "curso", "add", "fix", "rej", "desc"];
const OPEN = (s: string) => ["pend", "curso"].includes(fbSt(s)); // los que todavía hay que mirar
type Filt = "rec" | "all" | FbSt;

export function NotifTab() {
  useStoreVersion();
  const { confirm, toast } = useFeedback(), [f, setF] = useState<Filt>("rec"), [exp, setExp] = useState<Record<string, boolean>>({}), [nota, setNota] = useState<Record<string, string>>({});
  const L = fbList(), seen = Number(LS.get(FB_SEEN) || 0);
  const shown = useMemo(() => L.filter(x => (f === "all" ? true : f === "rec" ? OPEN(x.st) : fbSt(x.st) === f)), [L, f]);
  const save = (x: FbTicket, p: Partial<FbTicket>) => LS.setJSON(FB_PREFIX + x.id, { ...x, ...p, u: Date.now() });
  const setSt = (x: FbTicket, st: FbSt) => { save(x, { st }); setExp({ ...exp, [x.id]: false }); toast(`Marcado como «${FB_ST[st].l}». Se le avisa a quien lo mandó.`); };
  /* eliminar: se borran el texto y las fotos; queda solo el aviso «Eliminado» para quien lo mandó */
  const del = async (x: FbTicket) => { if (!(await confirm(`¿Eliminar el feedback de ${x.who || x.by}? Se borran el texto y las fotos.`, { danger: true, ok: "Eliminar" }))) return;
    x.imgs.forEach(k => LS.del(k)); save(x, { st: "elim", html: "", imgs: [] }); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([["rec", "Recibidos", Inbox, ""] as const, ...ORDER.map(k => [k, FB_ST[k].l, FB_ST[k].I, FB_ST[k].c] as const), ["all", "Todos", Layers, ""] as const]).map(([k, l, I, c]) => { const n = k === "all" ? L.length : k === "rec" ? L.filter(x => OPEN(x.st)).length : L.filter(x => fbSt(x.st) === k).length; return (
          <button key={k} onClick={() => setF(k)} style={c ? { ["--k" as string]: c } : undefined}
            className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-sans text-xs font-semibold transition", f === k ? (c ? "fb-neon border-[var(--k)] text-[var(--k)]" : "border-six bg-six/10 text-six") : "border-six/15 text-slate-400 hover:text-slate-200")}>
            <I className="size-4" style={c ? { color: c } : undefined} />{l}<span className="rounded-md bg-black/40 px-1.5 tabular-nums">{n}</span></button>); })}
        {L.some(x => x.t > seen) && <button onClick={() => LS.set(FB_SEEN, String(Date.now()))} className="ml-auto font-sans text-xs text-six/80 hover:text-six">Marcar todo como leído</button>}
      </div>
      {!shown.length && <section className="six-panel relative rounded-2xl p-10 text-center font-sans text-sm text-slate-500"><Inbox className="mx-auto mb-2 size-6" />{f === "rec" && L.length ? "No hay nada pendiente: todo está resuelto." : L.length ? "Nada en este estado." : "Todavía no llegó ningún feedback."}</section>}
      {shown.map(x => { const nuevo = x.t > seen, st = fbSt(x.st), S0 = FB_ST[st];
        /* resueltos (añadido, arreglado, rechazado, descartado): una fila chica que se abre con un clic */
        if (!OPEN(x.st) && !exp[x.id]) return (
          <button key={x.id} onClick={() => setExp({ ...exp, [x.id]: true })} style={{ ["--k" as string]: S0.c }} className="six-panel flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left font-sans text-sm transition hover:bg-six/5">
            <span className="fb-neon inline-flex items-center gap-1.5 rounded-md border border-[var(--k)] px-2 py-0.5 text-[11px] font-semibold text-[var(--k)]"><S0.I className="size-3.5" />{S0.l}</span>
            <b className="w-32 shrink-0 truncate text-white">{x.who || x.by}</b><span className="min-w-0 flex-1 truncate text-slate-400">{fbX(x.x)}</span>
            <span className="shrink-0 text-xs text-slate-500">{fmtDate(x.u || x.t)}</span><ChevronDown className="size-4 text-slate-500" /></button>);
        const html = safeHtml(x.html, el => { const m = /^img:(\d+)$/.exec(el.getAttribute("src") || ""); return m ? LS.get(x.imgs[+m[1]]) || "" : ""; }); return (
        <section key={x.id} className={cn("six-panel relative rounded-2xl p-4", nuevo && "ring-1 ring-six/60")}>
          <i className="six-corner tl" /><i className="six-corner br" />
          <header className="mb-3 flex flex-wrap items-center gap-3">
            <Avatar n={x.by} size={34} />
            <div className="min-w-0 font-sans"><p className="font-semibold text-white">{x.who || x.by}{nuevo && <span className="ml-2 rounded bg-six px-1.5 text-[10px] font-bold text-black">NUEVO</span>}</p>
              <p className="text-xs text-slate-500">{x.who && x.who !== x.by ? `${x.by} · ` : ""}{fmtDate(x.t)}</p></div>
            <div className="ml-auto flex flex-wrap gap-1">{ORDER.map(k => { const S = FB_ST[k]; return (
              <button key={k} onClick={() => setSt(x, k)} title={S.l} style={{ ["--k" as string]: S.c }}
                className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-sans text-[11px] font-semibold transition", st === k ? "fb-neon border-[var(--k)] text-[var(--k)]" : "border-six/15 text-slate-500 hover:text-slate-200")}>
                <S.I className="size-3.5" />{S.l}</button>); })}
              {!OPEN(x.st) && <button onClick={() => setExp({ ...exp, [x.id]: false })} title="Achicar" className="rounded-lg p-1.5 text-slate-500 hover:text-six"><ChevronDown className="size-4 rotate-180" /></button>}
              <button onClick={() => del(x)} title="Eliminar" className="rounded-lg p-1.5 text-slate-600 hover:text-[#ff2b4a]"><Trash2 className="size-4" /></button></div>
          </header>
          <div className="fb-rich font-sans text-sm leading-relaxed text-slate-200" dangerouslySetInnerHTML={{ __html: html }} />
          <div className="mt-3 flex gap-2">
            <input value={nota[x.id] ?? x.nota ?? ""} onChange={e => setNota({ ...nota, [x.id]: e.target.value })} maxLength={300} placeholder="Respuesta para quien lo mandó (opcional)…"
              className="min-w-0 flex-1 rounded-lg border border-six/15 bg-black/40 px-3 py-1.5 font-sans text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-six" />
            <button disabled={(nota[x.id] ?? x.nota ?? "") === (x.nota ?? "")} onClick={() => { save(x, { nota: (nota[x.id] || "").trim() }); toast("Respuesta guardada: la ve en su campanita."); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-six/40 px-2.5 font-sans text-[11px] font-semibold text-six disabled:opacity-30"><MessageSquareReply className="size-3.5" />Responder</button>
          </div>
        </section>); })}
    </div>
  );
}
