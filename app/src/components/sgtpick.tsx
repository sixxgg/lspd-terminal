/* Selector de agente en un menú flotante que se dibuja fuera de la ventana (portal): nunca queda cortado por un modal
   o una tarjeta con scroll. Se ubica debajo del botón y, si no entra, arriba. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Avatar } from "@/components/agents";
import { norm, rankES, RANK_COLOR, type Agent } from "@/lib/domain";
import { cn } from "@/lib/cn";

export function AgentMenu({ value, list, onChange, placeholder = "Elegir…", className }: { value: string; list: Agent[]; onChange: (n: string) => void; placeholder?: string; className?: string }) {
  const [o, setO] = useState(false), [q, setQ] = useState(""), [pos, setPos] = useState<{ l: number; t?: number; b?: number; w: number; h: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null), box = useRef<HTMLDivElement>(null);
  const place = () => { const r = btn.current?.getBoundingClientRect(); if (!r) return; const w = Math.max(r.width, 260), below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 260 && above > below;
    setPos({ l: Math.min(Math.max(8, r.left), innerWidth - w - 8), w, h: Math.min(320, up ? above : below), ...(up ? { b: innerHeight - r.top + 6 } : { t: r.bottom + 6 }) }); };
  useLayoutEffect(() => { if (o) place(); }, [o]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!o) return; const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setO(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setO(false); } };
    document.addEventListener("mousedown", out); document.addEventListener("keydown", key, true); addEventListener("resize", place); addEventListener("scroll", place, true);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", key, true); removeEventListener("resize", place); removeEventListener("scroll", place, true); }; }, [o]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = list.find(a => a.n === value), s = norm(q.trim()), L = list.filter(a => !s || norm(a.n).includes(s) || String(a.p || "").includes(s));
  const ranks = [...new Set(L.map(a => a.r))];
  return (
    <>
      <button ref={btn} type="button" onClick={() => { setO(!o); setQ(""); }} aria-haspopup="listbox" aria-expanded={o}
        className={cn("inline-flex h-8 min-w-[12rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-left text-[12.5px] transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900", className)}>
        {cur ? <><Avatar n={cur.n} size={20} /><span className="min-w-0 flex-1 truncate font-semibold">{cur.n}</span><span className="shrink-0 text-[10.5px] font-bold" style={{ color: RANK_COLOR[cur.r] }}>{rankES(cur.r)}</span></>
          : <span className="flex-1 text-slate-400">{value || placeholder}</span>}
        <ChevronDown className={cn("size-3.5 shrink-0 text-slate-400 transition", o && "rotate-180")} />
      </button>
      {o && pos && createPortal(
        <div ref={box} role="listbox" style={{ position: "fixed", left: pos.l, top: pos.t, bottom: pos.b, width: pos.w, zIndex: 9999 }}
          className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[rgb(var(--card))]">
          <label className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800"><Search className="size-3.5 text-slate-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none" />
            {value && <button type="button" onClick={() => { onChange(""); setO(false); }} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400 hover:text-red-500"><X className="size-3" />Quitar</button>}</label>
          <div className="scrollbar-thin overflow-y-auto py-1" style={{ maxHeight: pos.h - 44 }}>
            {ranks.map(r => <div key={r}><p className="px-3 pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-[.12em]" style={{ color: RANK_COLOR[r] }}>{rankES(r)}</p>
              {L.filter(a => a.r === r).map(a => (
                <button key={a.n} type="button" role="option" aria-selected={a.n === value} onClick={() => { onChange(a.n); setO(false); }}
                  className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition hover:bg-brand-500/10", a.n === value && "bg-brand-500/10")}>
                  <Avatar n={a.n} size={22} /><span className="min-w-0 flex-1 truncate font-medium">{a.n}</span>{a.p && <span className="font-mono text-[10.5px] text-slate-400">#{a.p}</span>}{a.n === value && <Check className="size-3.5 text-brand-500" />}</button>))}</div>)}
            {!L.length && <p className="px-3 py-4 text-center text-[12px] text-slate-400">Nadie coincide</p>}
          </div>
        </div>, document.body)}
    </>);
}
