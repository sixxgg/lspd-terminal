/* Selector de agente en un panel flotante (portal): nunca queda cortado por un modal o una tarjeta con scroll.
   Cabecera con título, buscador y filtro por rango; cada agente como fila con foto, rango con insignia, placa y un dato extra
   (ej: cuántas entrevistas hizo). Se maneja con el teclado (↑ ↓ Enter Esc). Se abre abajo o, si no entra, arriba. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Search, UserRoundX, X } from "lucide-react";
import { Avatar } from "@/components/agents";
import { insigniaUrl, norm, rankES, RANK_COLOR, type Agent } from "@/lib/domain";
import { cn } from "@/lib/cn";

type P = { value: string; list: Agent[]; onChange: (n: string) => void; title?: string; placeholder?: string; me?: string; extra?: (a: Agent) => string; className?: string };
export function AgentMenu({ value, list, onChange, title = "Elegir agente", placeholder = "Elegir…", me, extra, className }: P) {
  const [o, setO] = useState(false), [q, setQ] = useState(""), [rk, setRk] = useState(""), [hi, setHi] = useState(0);
  const [pos, setPos] = useState<{ l: number; t?: number; b?: number; w: number; h: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null), box = useRef<HTMLDivElement>(null), lst = useRef<HTMLDivElement>(null);
  const place = () => { const r = btn.current?.getBoundingClientRect(); if (!r) return; const w = Math.min(340, innerWidth - 16), below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 300 && above > below;
    setPos({ l: Math.min(Math.max(8, r.left), innerWidth - w - 8), w, h: Math.min(420, up ? above : below), ...(up ? { b: innerHeight - r.top + 6 } : { t: r.bottom + 6 }) }); };
  useLayoutEffect(() => { if (o) place(); }, [o]); // eslint-disable-line react-hooks/exhaustive-deps
  const ranks = [...new Set(list.map(a => a.r))], s = norm(q.trim());
  const L = list.filter(a => (!rk || a.r === rk) && (!s || norm(a.n).includes(s) || String(a.p || "").includes(s)));
  const pick = (n: string) => { onChange(n); setO(false); btn.current?.focus(); };
  useEffect(() => { if (!o) return; const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setO(false); };
    document.addEventListener("mousedown", out); addEventListener("resize", place); addEventListener("scroll", place, true);
    return () => { document.removeEventListener("mousedown", out); removeEventListener("resize", place); removeEventListener("scroll", place, true); }; }, [o]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setHi(Math.max(0, L.findIndex(a => a.n === value))); }, [q, rk, o]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { lst.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" }); }, [hi]);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); setO(false); btn.current?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setHi(i => Math.min(L.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && L[hi]) { e.preventDefault(); pick(L[hi].n); } };
  const cur = list.find(a => a.n === value), cc = cur ? RANK_COLOR[cur.r] || "#94a3b8" : "";
  return (
    <>
      <button ref={btn} type="button" onClick={() => { setO(!o); setQ(""); setRk(""); }} aria-haspopup="listbox" aria-expanded={o}
        className={cn("group inline-flex h-9 min-w-[13rem] items-center gap-2 rounded-xl border pl-1 pr-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          cur ? "border-transparent" : "border-dashed border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-600", o && "ring-2 ring-brand-500/50", className)}
        style={cur ? { background: cc + "1a", boxShadow: `inset 0 0 0 1px ${cc}55` } : undefined}>
        {cur ? <><span className="rounded-full p-[1.5px]" style={{ background: cc }}><Avatar n={cur.n} size={26} /></span>
          <span className="min-w-0 flex-1 leading-tight"><b className="block truncate text-[12.5px]">{cur.n}</b><span className="block text-[10px] font-bold" style={{ color: cc }}>{rankES(cur.r)}</span></span></>
          : <><span className="grid size-7 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><UserRoundX className="size-3.5" /></span><span className="flex-1 text-[12.5px] font-semibold">{placeholder}</span></>}
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
      </button>
      {o && pos && createPortal(
        <div ref={box} onKeyDown={key} style={{ position: "fixed", left: pos.l, top: pos.t, bottom: pos.b, width: pos.w, maxHeight: pos.h, zIndex: 9999 }}
          className="agm flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,.45)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-[rgb(var(--card)/.97)]">
          <div className="border-b border-slate-100 p-3 pb-2.5 dark:border-slate-800">
            <div className="mb-2 flex items-center gap-2"><p className="flex-1 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">{title}</p>
              {value && <button type="button" onClick={() => pick("")} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"><X className="size-3" />Quitar</button>}</div>
            <label className="flex h-9 items-center gap-2 rounded-xl bg-slate-100 px-3 focus-within:ring-2 focus-within:ring-brand-500/60 dark:bg-slate-800/80"><Search className="size-4 text-slate-400" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre o placa…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400" /></label>
            {ranks.length > 1 && <div className="mt-2 flex gap-1">{["", ...ranks].map(r => { const on = rk === r, c = r ? RANK_COLOR[r] : undefined; return (
              <button key={r || "all"} type="button" onClick={() => setRk(r)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold transition", !on && "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
                style={on ? { background: c || "rgb(var(--b-600))", color: "#fff" } : undefined}>{r ? rankES(r) : "Todos"} <span className="opacity-70">{r ? list.filter(a => a.r === r).length : list.length}</span></button>); })}</div>}
          </div>
          <div ref={lst} role="listbox" className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5">
            {L.map((a, i) => { const sel = a.n === value, c = RANK_COLOR[a.r] || "#94a3b8", ins = insigniaUrl(a.r), x = extra?.(a); return (
              <button key={a.n} data-i={i} type="button" role="option" aria-selected={sel} onMouseEnter={() => setHi(i)} onClick={() => pick(a.n)}
                className={cn("relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition", i === hi && "bg-slate-100 dark:bg-slate-800/80", sel && "bg-brand-500/10 dark:bg-brand-500/15")}>
                {sel && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-500" />}
                <span className="rounded-full p-[2px]" style={{ background: sel ? "rgb(var(--b-500))" : c + "66" }}><Avatar n={a.n} size={32} /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><b className="truncate text-[13px]">{a.n}</b>{me === a.n && <span className="rounded bg-brand-500/15 px-1 text-[9.5px] font-bold uppercase text-brand-600 dark:text-brand-300">Vos</span>}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px]"><span className="inline-flex items-center gap-1 font-bold" style={{ color: c }}>{ins && <img src={ins} alt="" className="h-3 w-auto" />}{rankES(a.r)}</span>{a.p && <span className="font-mono text-slate-400">#{a.p}</span>}</span></span>
                {x && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{x}</span>}
                {sel && <Check className="size-4 shrink-0 text-brand-500" />}
              </button>); })}
            {!L.length && <p className="px-3 py-6 text-center text-[12.5px] text-slate-400">Nadie coincide con «{q}»</p>}
          </div>
          <p className="border-t border-slate-100 px-3 py-1.5 text-[10.5px] text-slate-400 dark:border-slate-800"><kbd className="font-mono">↑↓</kbd> moverse · <kbd className="font-mono">Enter</kbd> elegir · <kbd className="font-mono">Esc</kbd> cerrar</p>
        </div>, document.body)}
    </>);
}
