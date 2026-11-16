/* Buscador global (Ctrl + K o ⌘ + K): una consola para saltar a cualquier lado.
   Busca secciones y divisiones (según el rango), informes, agentes, eventos del calendario, robos y artículos de la ley.
   ↑ ↓ para moverse, Enter para abrir, Tab para cambiar de categoría y Esc para cerrar. Recuerda lo último que abriste. */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronRight, CornerDownLeft, FileText, Gavel, Scale, Search, Terminal, UserRound, type LucideIcon } from "lucide-react";
import { AREAS, canArea, secsOf } from "@/nav";
import { getRoster, norm, rankES, RANK_COLOR, fullDT } from "@/lib/domain";
import { LS } from "@/lib/store";
import { getPenal, type Inf } from "@/lib/penal";
import { calAll } from "@/lib/calendar";
import { JUMP, jumpNow } from "@/lib/jump";
import { Avatar } from "@/components/agents";
import { cn } from "@/lib/cn";

type Kind = "sec" | "inf" | "ag" | "cal" | "rob" | "ley";
type Hit = { id: string; k: Kind; t: string; s?: string; icon?: LucideIcon; ag?: string; col?: string; txt: string; go: () => void };
const KL: Record<Kind, string> = { sec: "Secciones", inf: "Informes", ag: "Agentes", cal: "Calendario", rob: "Robos", ley: "Leyes" };
const SCOPES: ("" | Kind)[] = ["", "sec", "inf", "ag", "cal", "rob", "ley"];
const RK = "lspdt.next.cmdk";

export function CommandK({ go, me }: { go: (a: string, s: string) => void; me: { n: string; r: string } }) {
  const [o, setO] = useState(false), [q, setQ] = useState(""), [hi, setHi] = useState(0), [sc, setSc] = useState<"" | Kind>("");
  const inp = useRef<HTMLInputElement>(null), lst = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); setO(v => !v); } };
    const ev = () => setO(true); addEventListener("keydown", h); addEventListener("lspdt:cmdk", ev); return () => { removeEventListener("keydown", h); removeEventListener("lspdt:cmdk", ev); }; }, []);
  useEffect(() => { if (o) { setQ(""); setSc(""); setHi(0); setTimeout(() => inp.current?.focus(), 30); } }, [o]);
  /* todo lo que se puede buscar (se arma al abrir) */
  const all = useMemo<Hit[]>(() => { if (!o) return [];
    const H: Hit[] = [], close = () => setO(false);
    for (const a of AREAS) { if (a.hidden || !canArea(a, me.r)) continue;
      for (const s of secsOf(a, me.r)) H.push({ id: `sec:${a.k}/${s.k}`, k: "sec", t: s.l, s: a.l + (s.d ? ` · ${s.d}` : ""), icon: s.icon, txt: `${s.l} ${s.sl || ""} ${a.l} ${s.d}`, go: () => { go(a.k, s.k); close(); } }); }
    /* subpestañas que no son secciones */
    if (AREAS.some(a => a.k === "inf" && canArea(a, me.r))) ([["Procedimiento OIS con fallecido", "Informes · nuevo procedimiento y registrados", "new"], ["Guía /me y /do · OIS con fallecido", "Informes · revisar al agente, su ropa, el lugar y cada arma", "guia"]] as const)
      .forEach(([t, d, tb]) => H.push({ id: `sub:ois-${tb}`, k: "sec", t, s: d, icon: FileText, txt: `${t} ${d} ois fallecido me do`, go: () => { JUMP.infSub = "ois"; JUMP.oisTab = tb; go("inf", "inf"); close(); } }));
    const leyOk = AREAS.some(a => a.k === "leg" && canArea(a, me.r)), agOk = AREAS.some(a => a.k === "age" && canArea(a, me.r)), robOk = AREAS.some(a => a.k === "sup" && canArea(a, me.r));
    LS.json<(Inf & { no?: number })[]>("lspdt.informes", []).slice().sort((a, b) => (b.t || 0) - (a.t || 0)).forEach((r, i, L) => {
      const no = r.no || L.length - i, suj = (r.suj || []).map(x => x.n).filter(Boolean).join(", ");
      H.push({ id: `inf:${r.id}`, k: "inf", t: `Informe Nº ${no}${r.motivo ? ` · ${r.motivo}` : ""}`, s: [r.fecha, r.por, suj].filter(Boolean).join(" · "), icon: FileText,
        txt: `${no} ${r.motivo} ${(r.tipos || []).join(" ")} ${suj} ${r.por} ${r.fecha} ${r.ui || ""} ${(r.hechos || "").slice(0, 300)}`, go: () => { JUMP.inf = r.id; go("inf", "inf"); close(); } }); });
    getRoster().forEach(a => H.push({ id: `ag:${a.n}`, k: "ag", t: a.n, s: `${rankES(a.r)}${a.p ? ` · #${String(a.p).replace(/\D/g, "")}` : ""}${a.d ? ` · ${a.d}` : ""}`, ag: a.n, col: RANK_COLOR[a.r],
      txt: `${a.n} ${a.p || ""} ${rankES(a.r)} ${a.d || ""}`, go: () => { if (agOk) { JUMP.ag = a.n; go("age", "prof"); } else void navigator.clipboard?.writeText(a.n); close(); } }));
    try { calAll().filter(e => e.at > Date.now() - 864e5 * 30).forEach(e => H.push({ id: `cal:${e.id}`, k: "cal", t: e.n, s: `${e.ab || e.dn} · ${fullDT(e.at)}`, icon: CalendarDays, col: e.col,
      txt: `${e.n} ${e.tipo} ${e.dn} ${e.desc || ""}`, go: () => { go("cal", "cal"); close(); } })); } catch { /* */ }
    if (robOk) (LS.json<{ items?: { id: string; n: string; cat: string }[] } | null>("lspdt.robos", null)?.items || []).forEach(r => H.push({ id: `rob:${r.id}`, k: "rob", t: r.n, s: "Catálogo de robos", icon: Gavel, txt: r.n, go: () => { go("sup", "rob"); close(); } }));
    if (leyOk) getPenal().forEach(x => H.push({ id: `ley:${x.a}`, k: "ley", t: `Art. ${x.a} · ${x.t}`, s: [x.c, x.p ? `${x.p} meses` : "", x.m ? `$${x.m.toLocaleString("es-AR")}` : ""].filter(Boolean).join(" · "), icon: Scale,
      txt: `${x.a} ${x.t} ${x.d} ${x.c}`, go: () => { JUMP.ley = x.a; go("leg", "ley"); close(); } }));
    return H; }, [o, me.r, go]);
  const recent = (() => { try { return JSON.parse(localStorage.getItem(RK) || "[]") as string[]; } catch { return []; } })();
  const R = useMemo(() => { const toks = norm(q.trim()).split(/\s+/).filter(Boolean), base = sc ? all.filter(h => h.k === sc) : all;
    if (!toks.length) { const rec = recent.map(id => base.find(h => h.id === id)).filter(Boolean) as Hit[]; return [...rec.map(h => ({ ...h, rec: true })), ...base.filter(h => h.k === "sec" && !recent.includes(h.id)).slice(0, sc ? 60 : 8)]; }
    const sc2 = (h: Hit) => { const t = norm(h.t); return (t.startsWith(toks[0]) ? 0 : t.includes(toks[0]) ? 1 : 2) + (h.k === "sec" ? 0 : h.k === "ag" ? .3 : .6); };
    return base.filter(h => { const x = norm(h.txt + " " + h.t); return toks.every(t => x.includes(t)); }).sort((a, b) => sc2(a) - sc2(b)).slice(0, 60); }, [q, sc, all]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setHi(0), [q, sc]);
  useEffect(() => { lst.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" }); }, [hi]);
  const run = (h: Hit) => { jumpNow(); try { localStorage.setItem(RK, JSON.stringify([h.id, ...recent.filter(x => x !== h.id)].slice(0, 6))); } catch { /* */ } h.go(); };
  if (!o) return null;
  const counts = Object.fromEntries(SCOPES.map(k => [k, k ? all.filter(h => h.k === k).length : all.length]));
  let last = "";
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/55 px-3 pt-[11vh] backdrop-blur-md animate-fade-in" onMouseDown={e => { if (e.target === e.currentTarget) setO(false); }}>
      <div role="dialog" aria-label="Buscador" className="cmdk w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[rgb(10_14_24/.96)] text-slate-200 shadow-[0_40px_120px_-20px_rgba(0,0,0,.8),0_0_0_1px_rgb(var(--b-500)/.25)]"
        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); setO(false); } else if (e.key === "ArrowDown") { e.preventDefault(); setHi(i => Math.min(R.length - 1, i + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi(i => Math.max(0, i - 1)); }
          else if (e.key === "Enter" && R[hi]) { e.preventDefault(); run(R[hi]); } else if (e.key === "Tab") { e.preventDefault(); const i = SCOPES.indexOf(sc); setSc(SCOPES[(i + (e.shiftKey ? SCOPES.length - 1 : 1)) % SCOPES.length]); } }}>
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/30 px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[.18em] text-slate-500">
          <Terminal className="size-3.5 text-brand-400" /><span>lspd-net · búsqueda</span><span className="ml-auto">{me.n.toLowerCase().replace(/\s+/g, ".")}@mdt</span></div>
        <label className="flex items-center gap-3 px-4 py-3.5">
          <span className="font-mono text-[15px] font-bold text-brand-400">{sc ? `${KL[sc].toLowerCase()} ›` : "›"}</span>
          <input ref={inp} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscá un informe, agente, sección, división, artículo…" spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-white caret-brand-400 outline-none placeholder:text-slate-500" />
          <Search className="size-4 text-slate-500" />
        </label>
        <div className="flex flex-wrap gap-1 border-y border-white/10 px-3 py-2">{SCOPES.filter(k => !k || counts[k]).map(k => (
          <button key={k || "all"} type="button" onClick={() => { setSc(k); inp.current?.focus(); }} className={cn("rounded-md px-2 py-0.5 font-mono text-[11px] transition", sc === k ? "bg-brand-500 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200")}>
            {k ? KL[k] : "Todo"} <span className="opacity-60">{counts[k]}</span></button>))}</div>
        <div ref={lst} className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
          {!R.length && <p className="px-3 py-10 text-center font-mono text-[13px] text-slate-500">sin resultados para «{q}»</p>}
          {R.map((h, i) => { const g = (h as Hit & { rec?: boolean }).rec ? "Recientes" : KL[h.k], head = g !== last ? g : ""; last = g; const I = h.icon || UserRound; return (
            <div key={h.id + i}>
              {head && <p className="px-2.5 pb-1 pt-2.5 font-mono text-[10.5px] uppercase tracking-[.16em] text-slate-500">{head}</p>}
              <button data-i={i} type="button" onMouseMove={() => setHi(i)} onClick={() => run(h)}
                className={cn("relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition", i === hi ? "bg-brand-500/15" : "hover:bg-white/5")}>
                {i === hi && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-400" />}
                {h.ag ? <span className="rounded-full p-[1.5px]" style={{ background: (h.col || "#64748b") + "88" }}><Avatar n={h.ag} size={30} /></span>
                  : <span className="grid size-[33px] shrink-0 place-items-center rounded-lg bg-white/5 text-slate-300" style={h.col ? { color: h.col } : undefined}><I className="size-4" /></span>}
                <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] font-semibold text-slate-100">{h.t}</b>{h.s && <span className="block truncate text-[11.5px] text-slate-400">{h.s}</span>}</span>
                {i === hi ? <CornerDownLeft className="size-4 shrink-0 text-brand-400" /> : <ChevronRight className="size-4 shrink-0 text-slate-600" />}
              </button>
            </div>); })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-black/30 px-4 py-2 font-mono text-[10.5px] text-slate-500">
          <span><kbd className="kbd">↑↓</kbd> moverse</span><span><kbd className="kbd">Enter</kbd> abrir</span><span><kbd className="kbd">Tab</kbd> categoría</span><span><kbd className="kbd">Esc</kbd> cerrar</span>
          <span className="ml-auto">{R.length} resultado{R.length === 1 ? "" : "s"}</span></div>
      </div>
    </div>, document.body);
}
