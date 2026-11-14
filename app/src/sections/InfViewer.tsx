/* Historial de informes como expediente (estilo MDT): lista de informes a la izquierda, el informe en el centro y los detalles a la derecha.
   Cada informe tiene número, estado de trabajo (abierto, en investigación, pendiente de revisar, cerrado, archivado), etiquetas
   y un historial de quién lo creó, lo abrió, lo editó y le cambió el estado. Todo se guarda en la base (y con versiones). */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Archive, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, Copy, Eye, FilePlus2, FileText, History, Pencil, Plus, Search, Stamp, Tag, Trash2, X } from "lucide-react";
import { Button, Empty } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { useCopy } from "@/components/output";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { findAgent, norm, rankES } from "@/lib/domain";
import { agTag, dcParts, getPenal, penalOf, type Inf } from "@/lib/penal";
import { cn } from "@/lib/cn";

type InfSt = "abierto" | "inv" | "rev" | "cer" | "arc";
type Hist = { t: number; by: string; a: string };
export type InfX = Inf & { no?: number; st?: InfSt; tags?: string[]; hist?: Hist[] };
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
/* cambia un informe sobre lo último guardado (no sobre una copia vieja) y deja la línea en el historial */
function patchInf(id: string, by: string, a: string, fn: (r: InfX) => void) {
  const L = LS.json<InfX[]>(KEY, []);
  LS.setJSON(KEY, L.map(r => { if (r.id !== id) return r; const x = structuredClone(r); fn(x); if (a) x.hist = [...(x.hist || []), { t: Date.now(), by, a }]; return x; }));
}

/* texto del informe (formato Discord) a algo legible: secciones, negritas y viñetas */
function Rich({ text }: { text: string }) {
  const inl = (s: string, k: number) => s.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((p, i) => p.startsWith("**") ? <b key={`${k}-${i}`} className="font-semibold text-slate-900 dark:text-white">{p.slice(2, -2)}</b> : p.startsWith("__") ? <u key={`${k}-${i}`}>{p.slice(2, -2)}</u> : p);
  const out: ReactNode[] = [];
  text.split("\n").forEach((l, i) => {
    if (/^━+$/.test(l.trim())) return;
    const h = /^\*\*([^*]+)\*\*$/.exec(l.trim());
    if (h && h[1] === h[1].toUpperCase()) out.push(<h4 key={i} className="mt-5 border-b border-slate-200 pb-1 text-[12.5px] font-bold uppercase tracking-[.14em] text-brand-700 first:mt-0 dark:border-slate-800 dark:text-brand-300">{h[1]}</h4>);
    else if (/^\s*- /.test(l)) out.push(<p key={i} className="flex gap-2 pl-1"><span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-brand-500/70" /><span>{inl(l.replace(/^\s*- /, ""), i)}</span></p>);
    else if (l.startsWith("| ")) out.push(<p key={i} className="text-xs text-slate-500">{inl(l.slice(2), i)}</p>);
    else if (!l.trim()) out.push(<div key={i} className="h-2" />);
    else out.push(<p key={i}>{inl(l, i)}</p>);
  });
  return <div className="space-y-1 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{out}</div>;
}

function StatusPick({ r, can, canSgt, onSet }: { r: InfX; can: boolean; canSgt: boolean; onSet: (s: InfSt) => void }) {
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null), s = stOf(r), S = ST[s];
  useEffect(() => { const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  return (
    <div ref={ref} className="relative">
      <button disabled={!can} onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-default" style={{ borderColor: S.c + "66", color: S.c, background: S.c + "14" }}>
        <S.I className="size-3.5" />{S.l}{can && <ChevronDown className="size-3.5 opacity-70" />}</button>
      {open && <div className="absolute right-0 top-full z-30 mt-1.5 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-700 dark:bg-[rgb(var(--card))]">
        {(Object.keys(ST) as InfSt[]).map(k => { const x = ST[k], off = x.sgt && !canSgt; return (
          <button key={k} disabled={off} onClick={() => { setOpen(false); if (k !== s) onSet(k); }} title={off ? "Solo un sargento o superior" : undefined}
            className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">
            <x.I className="mt-0.5 size-4 shrink-0" style={{ color: x.c }} />
            <span className="min-w-0 flex-1"><b className="block text-[13px]">{x.l}</b><span className="block text-[11.5px] leading-snug text-slate-500">{x.d}</span></span>
            {k === s && <Check className="mt-0.5 size-4 shrink-0 text-brand-500" />}</button>); })}
      </div>}
    </div>);
}

const Box = ({ t, n, children, open: o0 = true }: { t: string; n?: number; children: ReactNode; open?: boolean }) => {
  const [o, setO] = useState(o0);
  return <section className="border-t border-slate-200 dark:border-slate-800">
    <button onClick={() => setO(!o)} className="flex w-full items-center gap-2 px-4 py-3 text-left"><b className="flex-1 text-[13.5px]">{t}{n != null && <span className="ml-1 font-normal text-slate-400">({n})</span>}</b><ChevronDown className={cn("size-4 text-slate-400 transition", o && "rotate-180")} /></button>
    {o && <div className="px-4 pb-4">{children}</div>}</section>;
};
const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]"><span className="shrink-0 whitespace-nowrap text-slate-500">{k}</span><span className="min-w-0 truncate text-right font-semibold">{v}</span></div>;
const ini = (n: string) => n.split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase();
const Person = ({ n, sub }: { n: string; sub?: string }) => <div className="flex items-center gap-2.5 py-1.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10.5px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{ini(n)}</span><span className="min-w-0"><b className="block truncate text-[13px]">{n}</b>{sub && <span className="block truncate text-[11.5px] text-slate-500">{sub}</span>}</span></div>;

export function InfViewer({ open, setOpen, onEdit, onBase }: { open: string | null; setOpen: (id: string | null) => void; onEdit: (r: Inf) => void; onBase: (r: Inf) => void }) {
  const me = useMe(), { confirm, toast } = useFeedback(), copy = useCopy();
  const [L0] = useJSON<InfX[]>(KEY, []);
  const [q, setQ] = useState(""), [fst, setFst] = useState<InfSt | "">(""), [mine, setMine] = useState(false), [tag, setTag] = useState("");
  const all = useMemo(() => L0.slice().sort((a, b) => (b.t || 0) - (a.t || 0)), [L0]), s = norm(q);
  const L = all.filter(r => (!s || norm(`${r.texto} ${(r.tags || []).join(" ")} #${numOf(r, L0)}`).includes(s)) && (!fst || stOf(r) === fst) && (!mine || r.por === me.n || (r.unid || []).some(u => u.n === me.n)));
  const r = all.find(x => x.id === open) || L[0] || null, i = r ? L.findIndex(x => x.id === r.id) : -1;
  const sgt = me.l >= 6 || me.admin, can = !!r && (r.por === me.n || (r.unid || []).some(u => u.n === me.n) || sgt) && (stOf(r) !== "arc" || sgt);
  /* quién lo abre: una línea por persona cada 30 minutos */
  useEffect(() => { if (!r) return; const h = (r.hist || []).filter(x => x.by === me.n && /^Abrió/.test(x.a)).pop();
    if (!h || Date.now() - h.t > 30 * 60e3) patchInf(r.id, me.n, "Abrió el informe", () => {}); }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!all.length) return <Empty icon={<FileText />} title="Todavía no hay informes registrados" />;
  const P = getPenal(), S = (r?.suj || []).filter(x => x.n), cg = S.flatMap(x => x.cg.map(c => ({ s: x.n, c, a: penalOf(c.a, P) })));
  const ev = (r?.ev || []).filter(e => e.d || e.mo || e.mat), veh = (r?.veh || []).filter(v => v.mo || v.mat || v.u), ag = [...new Set((r?.unid || []).map(u => u.n).filter(Boolean))];
  const title = r ? (r.tipos || []).join(" · ") || "Informe" : "";
  const hist: Hist[] = r ? [...(r.hist?.length ? [] : [{ t: r.t || 0, by: r.por || "", a: "Registró el informe" }, ...(r.edit ? [{ t: r.et || r.t || 0, by: r.edit, a: "Editó el informe" }] : [])]), ...(r.hist || [])].sort((a, b) => b.t - a.t) : [];
  const setSt = (k: InfSt) => { if (!r) return; patchInf(r.id, me.n, `Cambió el estado: ${ST[stOf(r)].l} → ${ST[k].l}`, x => { x.st = k; }); toast(`Informe #${numOf(r, L0)}: ${ST[k].l}`); };
  const addTag = () => { const v = tag.trim(); if (!r || !v || (r.tags || []).includes(v)) { setTag(""); return; } patchInf(r.id, me.n, `Agregó la etiqueta «${v}»`, x => { x.tags = [...(x.tags || []), v]; }); setTag(""); };
  const counts = (k: InfSt | "") => (k ? all.filter(x => stOf(x) === k).length : all.length);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[rgb(var(--card))]">
      {/* migas y navegación */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 text-[12.5px] text-slate-500 dark:border-slate-800">
        <span>Informes</span><ChevronRight className="size-3.5" /><span>Historial</span>{r && <><ChevronRight className="size-3.5" /><b className="min-w-0 truncate text-slate-800 dark:text-slate-100">#{numOf(r, L0)} · {title}</b></>}
        <span className="ml-auto flex items-center gap-1">
          <button aria-label="Anterior" disabled={i <= 0} onClick={() => setOpen(L[i - 1].id)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronLeft className="size-4" /></button>
          <button aria-label="Siguiente" disabled={i < 0 || i >= L.length - 1} onClick={() => setOpen(L[i + 1].id)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ChevronRight className="size-4" /></button></span>
      </div>
      <div className="grid min-h-[70vh] lg:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[17rem_minmax(0,1fr)_21rem]">
        {/* lista */}
        <aside className="flex max-h-[80vh] flex-col border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="space-y-2 p-3">
            <p className="text-sm font-bold">Últimos informes</p>
            <label className="relative block"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número, nombre, ID, artículo…" className="h-8 w-full rounded-lg border border-slate-200 bg-transparent pl-8 pr-2 text-[12.5px] outline-none focus:border-brand-500 dark:border-slate-700" /></label>
            <div className="grid grid-cols-2 gap-1">
              {(["", ...Object.keys(ST)] as (InfSt | "")[]).map(k => <button key={k || "all"} onClick={() => setFst(k)} title={k ? ST[k].d : "Todos"} className={cn("flex items-center gap-1.5 truncate rounded-md border px-2 py-1 text-left text-[11px] font-semibold transition", fst === k ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-slate-200 text-slate-500 dark:border-slate-700")}>
                {k && <span className="size-1.5 rounded-full" style={{ background: ST[k].c }} />}<span className="min-w-0 flex-1 truncate">{k ? ST[k].s || ST[k].l : "Todos"}</span><span className="tabular-nums opacity-60">{counts(k)}</span></button>)}
              <button onClick={() => setMine(!mine)} className={cn("rounded-md border px-2 py-1 text-left text-[11px] font-semibold", mine ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-slate-200 text-slate-500 dark:border-slate-700")}>Míos</button>
            </div>
          </div>
          <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 pb-3">{L.map(x => { const st = ST[stOf(x)], on = x.id === r?.id; return (
            <button key={x.id} onClick={() => setOpen(x.id)} className={cn("flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition", on ? "border-brand-500/60 bg-brand-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
              <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: st.c }} title={st.l} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-semibold">{(x.tipos || []).join(" · ") || "Informe"}</span>
                <span className="block truncate text-[11px] text-slate-500">#{numOf(x, L0)} · {x.fecha} · {(x.suj || []).filter(z => z.n).map(z => z.n).join(", ") || "sin sujetos"}</span></span></button>); })}
            {!L.length && <p className="p-4 text-center text-xs text-slate-500">Nada coincide.</p>}</div>
        </aside>
        {/* informe */}
        {r ? <article className="min-w-0 border-slate-200 dark:border-slate-800 2xl:border-r">
          <div className="flex flex-wrap items-start gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="min-w-0 flex-1"><h2 className="text-xl font-bold leading-tight">{title}</h2><p className="mt-0.5 text-[12.5px] text-slate-500">Informe #{numOf(r, L0)} · {r.fecha} {r.hora} · {r.ui}{r.uf ? ` → ${r.uf}` : ""}</p></div>
            <div className="flex flex-wrap gap-1.5">
              {dcParts(r.texto || "").length > 1 && dcParts(r.texto || "").map((p, j, a) => <Button key={j} size="sm" variant="outline" onClick={() => copy(p)}>Parte {j + 1}/{a.length}</Button>)}
              <Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(r.texto || "")}>Copiar</Button>
              <Button size="sm" variant="outline" icon={<FilePlus2 />} onClick={() => onBase(r)} title="Empezar un informe nuevo con las unidades, vehículos policiales, lugares y tipos de este">Usar como base</Button>
              {can && <Button size="sm" icon={<Pencil />} onClick={() => onEdit(r)}>Editar</Button>}
            </div>
          </div>
          <div className="scrollbar-thin max-h-[72vh] overflow-y-auto px-5 py-4">
            <Rich text={r.texto || ""} />
            {cg.length > 0 && <div className="mt-6"><h4 className="mb-2 text-[13.5px] font-bold">Cargos</h4><div className="space-y-1.5">{cg.map(({ s, c, a }, j) => (
              <div key={j} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{ini(s)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">Artículo {c.a} · {a?.t || "sin catálogo"}{c.m ? ` (${c.m === "at" ? "atenuado" : "agravado"})` : ""}</p><p className="text-[11.5px] text-slate-500">{s}{a?.m ? ` · $${a.m.toLocaleString("es-AR")}` : ""}{a?.p ? ` · ${a.p} meses` : ""}</p></div></div>))}</div></div>}
          </div>
        </article> : <div className="grid place-items-center p-10 text-sm text-slate-500">Elegí un informe.</div>}
        {/* detalles */}
        {r && <aside className="scrollbar-thin max-h-[80vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800 lg:col-span-2 2xl:col-span-1 2xl:border-t-0">
          <div className="px-4 py-3">
            <p className="mb-2 text-base font-bold">Detalles</p>
            <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]"><span className="text-slate-500">Estado</span><StatusPick r={r} can={can} canSgt={sgt} onSet={setSt} /></div>
            <Row k="Nº de incidente" v={<span className="rounded-md border border-slate-200 px-1.5 font-mono text-xs dark:border-slate-700"># {numOf(r, L0)}</span>} />
            <Row k="Fecha de creación" v={r.t ? new Date(r.t).toLocaleDateString("es-AR") : "—"} />
            <Row k="Hora del suceso" v={`${r.fecha} ${r.hora}`} />
            <Row k="Creado por" v={r.por ? agTag(r.por) : "—"} />
            <Row k="Ubicación del incidente" v={r.ux || r.ui || "—"} />
            <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
            <Row k="Sujetos" v={S.length} /><Row k="Cargos" v={cg.length} /><Row k="Pruebas incautadas" v={ev.length} /><Row k="Vehículos" v={veh.length} /><Row k="Agentes" v={ag.length} />
          </div>
          <Box t="Civiles involucrados" n={S.length}>{S.length ? S.map(x => <Person key={x.n} n={x.n} sub={x.id ? `ID ${x.id}` : undefined} />) : <p className="text-xs text-slate-500">Ninguno.</p>}</Box>
          <Box t="Agentes involucrados" n={ag.length}>{ag.map(n => { const a = findAgent(n); return <Person key={n} n={a ? `${rankES(a.r)} ${a.n}` : n} sub={(r.unid || []).filter(u => u.n === n).map(u => [u.u, u.r].filter(Boolean).join(" · ")).join(" / ")} />; })}</Box>
          <Box t="Etiquetas" n={(r.tags || []).length}>
            <div className="flex flex-wrap gap-1.5">{(r.tags || []).map(t => <span key={t} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11.5px] font-semibold dark:border-slate-700"><Tag className="size-3 text-slate-400" />{t}
              {can && <button aria-label={`Quitar ${t}`} onClick={() => patchInf(r.id, me.n, `Quitó la etiqueta «${t}»`, x => { x.tags = (x.tags || []).filter(y => y !== t); })} className="text-slate-400 hover:text-red-500"><X className="size-3" /></button>}</span>)}
              {!(r.tags || []).length && !can && <p className="text-xs text-slate-500">Sin etiquetas.</p>}</div>
            {can && <div className="mt-2 flex gap-1.5"><input value={tag} onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Ej: Robo, Evasión…" list="infTagDL" className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 text-[12.5px] outline-none focus:border-brand-500 dark:border-slate-700" />
              <button onClick={addTag} aria-label="Agregar etiqueta" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-brand-600 dark:border-slate-700"><Plus className="size-4" /></button>
              <datalist id="infTagDL">{[...new Set(all.flatMap(x => x.tags || []))].map(t => <option key={t} value={t} />)}</datalist></div>}
          </Box>
          <Box t="Vehículos enlazados" n={veh.length} open={veh.length > 0}>{veh.length ? veh.map((v, j) => <p key={j} className="py-1 text-[12.5px]"><b>{v.t}:</b> {v.mo || "—"}{v.mat ? ` · ${v.mat}` : ""}{v.co ? ` · ${v.co}` : ""}{v.est ? ` — ${v.est}` : ""}</p>) : <p className="text-xs text-slate-500">Ninguno.</p>}</Box>
          <Box t="Pruebas incautadas" n={ev.length} open={ev.length > 0}>{ev.length ? ev.map((e, j) => <p key={j} className="py-1 text-[12.5px]"><b>{e.t}:</b> {e.t === "Vehículo" ? [e.mo, e.co, e.mat].filter(Boolean).join(" · ") : e.d}{e.s ? <span className="text-slate-500"> · {e.s}</span> : ""}</p>) : <p className="text-xs text-slate-500">Ninguna.</p>}</Box>
          <Box t="Historial" n={hist.length}>
            <ol className="space-y-2">{hist.map((h, j) => <li key={j} className="flex gap-2.5 text-[12.5px]"><span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">{/^Abrió/.test(h.a) ? <Eye className="size-3 text-slate-400" /> : /estado/.test(h.a) ? <Stamp className="size-3 text-amber-500" /> : /Edit/.test(h.a) ? <Pencil className="size-3 text-sky-500" /> : <History className="size-3 text-slate-400" />}</span>
              <span className="min-w-0"><b>{h.by || "—"}</b> <span className="text-slate-600 dark:text-slate-300">{h.a.charAt(0).toLowerCase() + h.a.slice(1)}</span><span className="block text-[11px] text-slate-500">{when(h.t)}</span></span></li>)}</ol>
          </Box>
          {(r.por === me.n || sgt) && stOf(r) !== "arc" && <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <button onClick={async () => { if (await confirm(`¿Eliminar el informe #${numOf(r, L0)}? Queda en el historial de versiones por si hay que recuperarlo.`, { danger: true, ok: "Eliminar" })) { LS.setJSON(KEY, LS.json<InfX[]>(KEY, []).filter(x => x.id !== r.id)); setOpen(null); } }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline"><Trash2 className="size-3.5" />Eliminar informe</button></div>}
        </aside>}
      </div>
    </div>);
}
