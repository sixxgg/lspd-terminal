/* Historial de informes: lista a la izquierda y el informe como expediente a la derecha (cabecera con número y estado,
   resumen en tarjetas y pestañas: informe, involucrados, pruebas y vehículos, historial).
   Cada informe tiene número, estado de trabajo (abierto, en investigación, pendiente de revisar, cerrado, archivado), etiquetas
   y un historial de quién lo creó, lo abrió, lo editó y le cambió el estado. Todo se guarda en la base (y con versiones).
   Los informes de pérdida de arma (src = "parm") se editan desde Supervisores › Pérdida de arma. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Archive, Car, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, Clock, Eye, FilePlus2, FileText, Gavel, History, MapPin, Package, Pencil, Plus, Search, ShieldAlert, Stamp, Tag, Trash2, UserRound, Users, X } from "lucide-react";
import { Button, Empty } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { CopyMenu, useCopy } from "@/components/output";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { goTo } from "@/lib/profiles";
import { findAgent, norm, rankES } from "@/lib/domain";
import { agTag, dcParts, getPenal, penalOf, type Inf } from "@/lib/penal";
import { cn } from "@/lib/cn";

type InfSt = "abierto" | "inv" | "rev" | "cer" | "arc";
type Hist = { t: number; by: string; a: string };
export type InfX = Inf & { no?: number; st?: InfSt; tags?: string[]; hist?: Hist[]; src?: string; sid?: string };
const KEY = "lspdt.informes";
const ST: Record<InfSt, { l: string; s?: string; d: string; c: string; I: typeof CircleDashed; sgt?: boolean }> = {
  abierto: { l: "Abierto", d: "Recién abierto, pendiente de trabajar.", c: "#94a3b8", I: CircleDashed },
  inv: { l: "En investigación", s: "Investigación", d: "Con diligencias en curso.", c: "#38bdf8", I: Search },
  rev: { l: "Pendiente de revisar", s: "Por revisar", d: "Redactado y a la espera del visto bueno de un sargento.", c: "#f59e0b", I: Stamp },
  cer: { l: "Cerrado", d: "Trabajo terminado, sin diligencias pendientes.", c: "#22c55e", I: CheckCircle2, sgt: true },
  arc: { l: "Archivado", d: "Guardado como antecedente; no se toca más.", c: "#64748b", I: Archive, sgt: true },
};
const stOf = (r: InfX): InfSt => r.st || (r.est === "Incidente finalizado" ? "cer" : "abierto");
/* número de incidente: el guardado o, si es viejo, su orden de registro */
const numOf = (r: InfX, L: InfX[]) => r.no || L.slice().sort((a, b) => (a.t || 0) - (b.t || 0)).findIndex(x => x.id === r.id) + 1;
const when = (t?: number) => (t ? new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—");
const hm = (t: number) => new Date(t).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayOf = (t: number) => { const d = new Date(t), h = new Date(); const k = (x: Date) => x.toDateString();
  if (k(d) === k(h)) return "Hoy"; h.setDate(h.getDate() - 1); if (k(d) === k(h)) return "Ayer"; return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }); };
/* cambia un informe sobre lo último guardado (no sobre una copia vieja) y deja la línea en el historial */
function patchInf(id: string, by: string, a: string, fn: (r: InfX) => void) {
  const L = LS.json<InfX[]>(KEY, []);
  LS.setJSON(KEY, L.map(r => { if (r.id !== id) return r; const x = structuredClone(r); fn(x); if (a) x.hist = [...(x.hist || []), { t: Date.now(), by, a }]; return x; }));
}

/* texto del informe (formato Discord) a algo legible: secciones, negritas, citas y viñetas */
function Rich({ text }: { text: string }) {
  const inl = (s: string, k: number) => s.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g).map((p, i) => p.startsWith("**") ? <b key={`${k}-${i}`} className="font-semibold text-slate-900 dark:text-white">{p.slice(2, -2)}</b>
    : p.startsWith("__") ? <u key={`${k}-${i}`}>{p.slice(2, -2)}</u> : p.startsWith("`") ? <code key={`${k}-${i}`} className="rounded bg-slate-100 px-1 font-mono text-[12.5px] dark:bg-slate-800">{p.slice(1, -1)}</code> : p);
  const out: ReactNode[] = [];
  const head = (t: string, i: number) => out.push(<h4 key={i} className="mb-1.5 mt-5 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[.14em] text-brand-700 first:mt-0 dark:text-brand-300"><span className="h-3 w-1 rounded-full bg-brand-500" />{t.replace(/\*\*/g, "")}</h4>);
  text.split("\n").forEach((l, i) => {
    const t = l.trim();
    if (/^━+$/.test(t)) return;
    const h = /^\*\*([^*]+)\*\*$/.exec(t), md = /^#{1,3}\s+(.+)$/.exec(t);
    if (md) head(md[1], i);
    else if (h && h[1] === h[1].toUpperCase()) head(h[1], i);
    else if (/^-#\s/.test(t)) out.push(<p key={i} className="text-[11.5px] text-slate-500">{inl(t.slice(3), i)}</p>);
    else if (/^>\s?/.test(t)) out.push(<p key={i} className="border-l-2 border-brand-500/40 pl-3 text-slate-600 dark:text-slate-300">{inl(t.replace(/^>\s?/, ""), i)}</p>);
    else if (/^\s*[-•] /.test(l)) out.push(<p key={i} className="flex gap-2 pl-1"><span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-brand-500/70" /><span>{inl(l.replace(/^\s*[-•] /, ""), i)}</span></p>);
    else if (l.startsWith("| ")) out.push(<p key={i} className="text-xs text-slate-500">{inl(l.slice(2), i)}</p>);
    else if (!t) out.push(<div key={i} className="h-1.5" />);
    else out.push(<p key={i}>{inl(l, i)}</p>);
  });
  return <div className="space-y-1 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{out}</div>;
}

function StatusPick({ r, can, canSgt, onSet }: { r: InfX; can: boolean; canSgt: boolean; onSet: (s: InfSt) => void }) {
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null), s = stOf(r), S = ST[s];
  useEffect(() => { const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  return (
    <div ref={ref} className="relative">
      <button disabled={!can} onClick={() => setOpen(!open)} className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition disabled:cursor-default" style={{ borderColor: S.c + "70", color: S.c, background: S.c + "18" }}>
        <S.I className="size-3.5" />{S.l}{can && <ChevronDown className="size-3.5 opacity-70" />}</button>
      {open && <div className="absolute left-0 top-full z-30 mt-1.5 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xl sm:left-auto sm:right-0 dark:border-slate-700 dark:bg-[rgb(var(--card))]">
        {(Object.keys(ST) as InfSt[]).map(k => { const x = ST[k], off = x.sgt && !canSgt; return (
          <button key={k} disabled={off} onClick={() => { setOpen(false); if (k !== s) onSet(k); }} title={off ? "Solo un sargento o superior" : undefined}
            className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">
            <x.I className="mt-0.5 size-4 shrink-0" style={{ color: x.c }} />
            <span className="min-w-0 flex-1"><b className="block text-[13px]">{x.l}{x.sgt && <span className="ml-1.5 text-[10px] font-semibold text-slate-400">Sargento+</span>}</b><span className="block text-[11.5px] leading-snug text-slate-500">{x.d}</span></span>
            {k === s && <Check className="mt-0.5 size-4 shrink-0 text-brand-500" />}</button>); })}
      </div>}
    </div>);
}

const ini = (n: string) => n.split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase();
const Person = ({ n, sub, tone }: { n: string; sub?: string; tone?: string }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-2.5 py-2 dark:border-slate-800">
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", tone || "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300")}>{ini(n)}</span>
    <span className="min-w-0"><b className="block truncate text-[13px]">{n}</b>{sub && <span className="block truncate text-[11.5px] text-slate-500">{sub}</span>}</span></div>);
const Meta = ({ I, children }: { I: typeof Clock; children: ReactNode }) => <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] text-slate-600 dark:text-slate-300"><I className="size-3.5 shrink-0 text-slate-400" /><span className="truncate">{children}</span></span>;
const histIco = (a: string) => /^Abrió/.test(a) ? [Eye, "#94a3b8"] as const : /estado/.test(a) ? [Stamp, "#f59e0b"] as const : /Edit|Guard/.test(a) ? [Pencil, "#38bdf8"] as const : /etiqueta/.test(a) ? [Tag, "#a78bfa"] as const : /Registr/.test(a) ? [FilePlus2, "#22c55e"] as const : [History, "#94a3b8"] as const;

type Tab = "inf" | "inv" | "prb" | "his";
export function InfViewer({ open, setOpen, onEdit, onBase }: { open: string | null; setOpen: (id: string | null) => void; onEdit: (r: Inf) => void; onBase: (r: Inf) => void }) {
  const me = useMe(), { confirm, toast } = useFeedback(), copy = useCopy();
  const [L0] = useJSON<InfX[]>(KEY, []);
  const [q, setQ] = useState(""), [fst, setFst] = useState<InfSt | "">(""), [mine, setMine] = useState(false), [tag, setTag] = useState(""), [tab, setTab] = useState<Tab>("inf"), [vis, setVis] = useState(false);
  const all = useMemo(() => L0.slice().sort((a, b) => (b.t || 0) - (a.t || 0)), [L0]), s = norm(q);
  const L = all.filter(r => (!s || norm(`${r.texto} ${(r.tags || []).join(" ")} #${numOf(r, L0)}`).includes(s)) && (!fst || stOf(r) === fst) && (!mine || r.por === me.n || (r.unid || []).some(u => u.n === me.n)));
  const r = all.find(x => x.id === open) || L[0] || null, i = r ? L.findIndex(x => x.id === r.id) : -1;
  const sgt = me.l >= 6 || me.admin, can = !!r && (r.por === me.n || (r.unid || []).some(u => u.n === me.n) || sgt) && (stOf(r) !== "arc" || sgt);
  /* quién lo abre: una línea por persona cada 30 minutos */
  useEffect(() => { if (!r) return; const h = (r.hist || []).filter(x => x.by === me.n && /^Abrió/.test(x.a)).pop();
    if (!h || Date.now() - h.t > 30 * 60e3) patchInf(r.id, me.n, "Abrió el informe", () => {}); }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!all.length) return <Empty icon={<FileText />} title="Todavía no hay informes registrados" />;
  const P = getPenal(), S = (r?.suj || []).filter(x => x.n), cg = S.flatMap(x => (x.cg || []).map(c => ({ s: x.n, c, a: penalOf(c.a, P) })));
  const ev = (r?.ev || []).filter(e => e.d || e.mo || e.mat), veh = (r?.veh || []).filter(v => v.mo || v.mat || v.u), ag = [...new Set((r?.unid || []).map(u => u.n).filter(Boolean))];
  const title = r ? (r.tipos || []).join(" · ") || "Informe" : "", parm = r?.src === "parm";
  const hist: Hist[] = r ? [...((r.hist || []).some(h => !/^Abrió/.test(h.a)) ? [] : [{ t: r.t || 0, by: r.por || "", a: "Registró el informe" }, ...(r.edit ? [{ t: r.et || r.t || 0, by: r.edit, a: "Editó el informe" }] : [])]), ...(r.hist || [])].sort((a, b) => b.t - a.t) : [];
  const shown = vis ? hist : hist.filter(h => !/^Abrió/.test(h.a)), views = hist.length - hist.filter(h => !/^Abrió/.test(h.a)).length;
  const setSt = (k: InfSt) => { if (!r) return; patchInf(r.id, me.n, `Cambió el estado: ${ST[stOf(r)].l} → ${ST[k].l}`, x => { x.st = k; }); toast(`Informe #${numOf(r, L0)}: ${ST[k].l}`); };
  const addTag = () => { const v = tag.trim(); if (!r || !v || (r.tags || []).includes(v)) { setTag(""); return; } patchInf(r.id, me.n, `Agregó la etiqueta «${v}»`, x => { x.tags = [...(x.tags || []), v]; }); setTag(""); };
  const counts = (k: InfSt | "") => (k ? all.filter(x => stOf(x) === k).length : all.length);
  const SC = r ? ST[stOf(r)] : ST.abierto;
  const TABS: [Tab, string, number | undefined, typeof Clock][] = [["inf", "Informe", undefined, FileText], ["inv", "Involucrados", S.length + ag.length, Users], ["prb", "Pruebas y vehículos", ev.length + veh.length, Package], ["his", "Historial", hist.length - views, History]];
  return (
    <div className="space-y-3">
      {/* filtros por estado */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número, nombre, ID, artículo…" className="fx-field h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-900/70" /></label>
        <div className="flex flex-wrap gap-1">
          {(["", ...Object.keys(ST)] as (InfSt | "")[]).map(k => { const on = fst === k, c = k ? ST[k].c : undefined; return (
            <button key={k || "all"} onClick={() => setFst(k)} title={k ? ST[k].d : "Todos"} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition", on ? "text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
              style={on ? { background: c || "rgb(var(--b-600))", borderColor: "transparent" } : undefined}>
              {k && !on && <span className="size-2 rounded-full" style={{ background: c }} />}{k ? ST[k].s || ST[k].l : "Todos"}<span className="tabular-nums opacity-70">{counts(k)}</span></button>); })}
          <button onClick={() => setMine(!mine)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition", mine ? "border-transparent bg-brand-600 text-white" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}><UserRound className="size-3.5" />Míos</button>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* lista */}
        <aside className="scrollbar-thin space-y-1.5 overflow-y-auto lg:sticky lg:top-32 lg:max-h-[calc(100dvh-10rem)] lg:pr-1">
          {L.map(x => { const st = ST[stOf(x)], on = x.id === r?.id, sj = (x.suj || []).filter(z => z.n); return (
            <button key={x.id} onClick={() => { setOpen(x.id); setTab("inf"); }} className={cn("group relative block w-full overflow-hidden rounded-xl border bg-white py-2 pl-4 pr-3 text-left transition dark:bg-[rgb(var(--card))]", on ? "border-brand-500/70 shadow-md shadow-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}>
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: st.c }} />
              <span className="flex items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-400">#{numOf(x, L0)}</span>{x.src === "parm" && <ShieldAlert className="size-3 text-red-500" />}
                <span className="ml-auto text-[10.5px] font-semibold" style={{ color: st.c }}>{st.s || st.l}</span></span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold">{(x.tipos || []).join(" · ") || "Informe"}</span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">{x.fecha}{x.hora ? ` ${x.hora}` : ""} · {sj.length ? sj.map(z => z.n).join(", ") : x.por || "sin sujetos"}</span>
              {(x.tags || []).length > 0 && <span className="mt-1 flex flex-wrap gap-1">{(x.tags || []).slice(0, 3).map(t => <span key={t} className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t}</span>)}</span>}
            </button>); })}
          {!L.length && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">Nada coincide.</p>}
        </aside>

        {/* expediente */}
        {r ? <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[rgb(var(--card))]">
          <header className="relative border-b border-slate-200 px-5 pb-4 pt-4 dark:border-slate-800" style={{ background: `linear-gradient(135deg, ${SC.c}1f, transparent 60%)` }}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border bg-white/70 text-center dark:bg-black/20" style={{ borderColor: SC.c + "60" }}>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nº</span><span className="-mt-1 font-mono text-lg font-black tabular-nums" style={{ color: SC.c }}>{numOf(r, L0)}</span></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><StatusPick r={r} can={can} canSgt={sgt} onSet={setSt} />{parm && <span className="inline-flex h-6 items-center gap-1 rounded-full bg-red-500/10 px-2 text-[11px] font-bold text-red-600 dark:text-red-400"><ShieldAlert className="size-3" />Pérdida de arma</span>}</div>
                <h2 className="mt-1.5 text-[19px] font-bold leading-tight">{title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  <Meta I={Clock}>{r.fecha} {r.hora}</Meta>{(r.ux || r.ui) && <Meta I={MapPin}>{r.ux || r.ui}{r.uf && !parm ? ` → ${r.uf}` : ""}</Meta>}<Meta I={UserRound}>{r.por ? agTag(r.por) : "—"}</Meta>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <CopyMenu text={r.texto || ""} />
                {!parm && <Button size="sm" variant="outline" icon={<FilePlus2 />} onClick={() => onBase(r)} title="Empezar un informe nuevo con las unidades, vehículos policiales, lugares y tipos de este">Usar como base</Button>}
                {can && <Button size="sm" icon={<Pencil />} onClick={() => (parm ? goTo("sup", "parm") : onEdit(r))} title={parm ? "Se edita desde Supervisores › Pérdida de arma" : undefined}>Editar</Button>}
              </div>
            </div>
            {dcParts(r.texto || "").length > 1 && <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500">Copiar por partes:{dcParts(r.texto || "").map((p, j, a) => <button key={j} onClick={() => copy(p)} className="rounded-md border border-slate-200 px-2 py-0.5 font-semibold hover:border-brand-500 hover:text-brand-600 dark:border-slate-700">{j + 1}/{a.length}</button>)}</div>}
            {/* etiquetas */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {(r.tags || []).map(t => <span key={t} className="inline-flex h-6 items-center gap-1 rounded-full border border-slate-200 bg-white/60 px-2 text-[11.5px] font-semibold dark:border-slate-700 dark:bg-black/10"><Tag className="size-3 text-slate-400" />{t}
                {can && <button aria-label={`Quitar ${t}`} onClick={() => patchInf(r.id, me.n, `Quitó la etiqueta «${t}»`, x => { x.tags = (x.tags || []).filter(y => y !== t); })} className="text-slate-400 hover:text-red-500"><X className="size-3" /></button>}</span>)}
              {can ? <span className="inline-flex h-6 items-center rounded-full border border-dashed border-slate-300 pl-2 dark:border-slate-600"><Tag className="size-3 text-slate-400" />
                <input value={tag} onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Agregar etiqueta" list="infTagDL" className="h-full w-32 bg-transparent px-1.5 text-[11.5px] outline-none" />
                <button onClick={addTag} aria-label="Agregar etiqueta" className="grid h-full w-6 place-items-center text-slate-400 hover:text-brand-600"><Plus className="size-3.5" /></button>
                <datalist id="infTagDL">{[...new Set(all.flatMap(x => x.tags || []))].map(t => <option key={t} value={t} />)}</datalist></span>
                : !(r.tags || []).length && <span className="text-[11.5px] text-slate-400">Sin etiquetas</span>}
            </div>
          </header>

          {/* resumen */}
          <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 sm:grid-cols-5 dark:divide-slate-800 dark:border-slate-800">
            {([["Sujetos", S.length, UserRound], ["Cargos", cg.length, Gavel], ["Pruebas", ev.length, Package], ["Vehículos", veh.length, Car], ["Agentes", ag.length, Users]] as const).map(([k, n, I], j) => (
              <div key={k} className={cn("flex items-center gap-2 px-4 py-2.5", j > 2 && "hidden sm:flex")}><I className="size-4 text-slate-400" /><div><p className="text-[15px] font-bold leading-tight tabular-nums">{n}</p><p className="text-[10.5px] text-slate-500">{k}</p></div></div>))}
          </div>

          {/* pestañas */}
          <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 dark:border-slate-800" role="tablist">
            {TABS.map(([k, l, n, I]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold transition", tab === k ? "text-brand-700 dark:text-brand-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
              <I className="size-3.5" />{l}{n ? <span className="rounded-full bg-slate-100 px-1.5 text-[10px] tabular-nums dark:bg-slate-800">{n}</span> : null}{tab === k && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-500" />}</button>)}
          </nav>

          <div className="px-5 py-4">
            {tab === "inf" && <>
              <Rich text={r.texto || ""} />
              {cg.length > 0 && <div className="mt-6"><h4 className="mb-2 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[.14em] text-brand-700 dark:text-brand-300"><span className="h-3 w-1 rounded-full bg-brand-500" />Cargos</h4>
                <div className="grid gap-1.5 md:grid-cols-2">{cg.map(({ s, c, a }, j) => (
                  <div key={j} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"><span className="shrink-0 rounded-md bg-brand-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-700 dark:text-brand-300">{c.a}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{a?.t || "sin catálogo"}{c.m ? ` (${c.m === "at" ? "atenuado" : "agravado"})` : ""}</p><p className="truncate text-[11.5px] text-slate-500">{s}{a?.m ? ` · $${a.m.toLocaleString("es-AR")}` : ""}{a?.p ? ` · ${a.p} meses` : ""}</p></div></div>))}</div></div>}
            </>}
            {tab === "inv" && <div className="grid gap-5 md:grid-cols-2">
              <div><p className="mb-2 text-[12px] font-bold text-slate-500">Civiles involucrados · {S.length}</p><div className="space-y-1.5">{S.length ? S.map(x => <Person key={x.n} n={x.n} sub={[x.id && `ID ${x.id}`, x.cg?.length && `${x.cg.length} ${x.cg.length === 1 ? "cargo" : "cargos"}`].filter(Boolean).join(" · ") || undefined} tone="bg-amber-500/15 text-amber-700 dark:text-amber-300" />) : <p className="text-xs text-slate-500">Ninguno.</p>}</div></div>
              <div><p className="mb-2 text-[12px] font-bold text-slate-500">Agentes involucrados · {ag.length}</p><div className="space-y-1.5">{ag.length ? ag.map(n => { const a = findAgent(n); return <Person key={n} n={a ? `${rankES(a.r)} ${a.n}` : n} sub={(r.unid || []).filter(u => u.n === n).map(u => [u.u, u.r].filter(Boolean).join(" · ")).join(" / ") || undefined} tone="bg-brand-500/15 text-brand-700 dark:text-brand-300" />; }) : <p className="text-xs text-slate-500">Ninguno.</p>}</div></div>
            </div>}
            {tab === "prb" && <div className="grid gap-5 md:grid-cols-2">
              <div><p className="mb-2 text-[12px] font-bold text-slate-500">Pruebas incautadas · {ev.length}</p><div className="space-y-1.5">{ev.length ? ev.map((e, j) => <div key={j} className="rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] dark:border-slate-800"><b>{e.t}</b><p className="text-slate-600 dark:text-slate-300">{e.t === "Vehículo" ? [e.mo, e.co, e.mat].filter(Boolean).join(" · ") : e.d}</p>{e.s && <p className="text-[11px] text-slate-500">{e.s}</p>}</div>) : <p className="text-xs text-slate-500">Ninguna.</p>}</div></div>
              <div><p className="mb-2 text-[12px] font-bold text-slate-500">Vehículos enlazados · {veh.length}</p><div className="space-y-1.5">{veh.length ? veh.map((v, j) => <div key={j} className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] dark:border-slate-800"><Car className="mt-0.5 size-4 shrink-0 text-slate-400" /><div className="min-w-0"><b>{v.mo || "—"}</b>{v.mat && <span className="ml-1.5 rounded bg-slate-100 px-1 font-mono text-[11px] dark:bg-slate-800">{v.mat}</span>}<p className="text-[11.5px] text-slate-500">{[v.t, v.co, v.est, v.u].filter(Boolean).join(" · ")}</p></div></div>) : <p className="text-xs text-slate-500">Ninguno.</p>}</div></div>
            </div>}
            {tab === "his" && <div>
              {views > 0 && <button onClick={() => setVis(!vis)} className="mb-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-brand-600"><Eye className="size-3.5" />{vis ? "Ocultar aperturas" : `Mostrar aperturas (${views})`}</button>}
              <ol className="relative space-y-0">{shown.map((h, j) => { const [I, c] = histIco(h.a), d = dayOf(h.t), nd = j === 0 || dayOf(shown[j - 1].t) !== d; return (
                <li key={j}>
                  {nd && <p className={cn("mb-2 text-[10.5px] font-bold uppercase tracking-[.12em] text-slate-400", j > 0 && "mt-4")}>{d}</p>}
                  <div className="relative flex gap-3 pb-3 pl-1">
                    {j < shown.length - 1 && dayOf(shown[j + 1].t) === d && <span className="absolute left-[15px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />}
                    <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 bg-white dark:bg-[rgb(var(--card))]" style={{ borderColor: c + "80" }}><I className="size-3.5" style={{ color: c }} /></span>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/40"><p className="text-[12.5px]"><b>{h.by || "—"}</b> <span className="text-slate-600 dark:text-slate-300">{h.a.charAt(0).toLowerCase() + h.a.slice(1)}</span></p><p className="text-[10.5px] text-slate-500" title={when(h.t)}>{hm(h.t)}</p></div>
                  </div>
                </li>); })}</ol>
              {!shown.length && <p className="text-xs text-slate-500">Sin movimientos.</p>}
            </div>}
          </div>

          <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-2.5 text-[11.5px] text-slate-500 dark:border-slate-800">
            <span>Creado {when(r.t)}{r.edit ? ` · última edición ${r.edit}` : ""}</span>
            <span className="ml-auto flex items-center gap-1">
              {(r.por === me.n || sgt) && stOf(r) !== "arc" && <button onClick={async () => { if (await confirm(`¿Eliminar el informe #${numOf(r, L0)}? Queda en el historial de versiones por si hay que recuperarlo.`, { danger: true, ok: "Eliminar" })) { LS.setJSON(KEY, LS.json<InfX[]>(KEY, []).filter(x => x.id !== r.id)); setOpen(null); } }}
                className="mr-2 inline-flex items-center gap-1 font-semibold text-red-500 hover:underline"><Trash2 className="size-3.5" />Eliminar</button>}
              <button aria-label="Anterior" disabled={i <= 0} onClick={() => setOpen(L[i - 1].id)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronLeft className="size-4" /></button>
              <span className="tabular-nums">{i + 1}/{L.length}</span>
              <button aria-label="Siguiente" disabled={i < 0 || i >= L.length - 1} onClick={() => setOpen(L[i + 1].id)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronRight className="size-4" /></button></span>
          </footer>
        </article> : <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 p-10 text-sm text-slate-500 dark:border-slate-700">Elegí un informe.</div>}
      </div>
    </div>);
}
