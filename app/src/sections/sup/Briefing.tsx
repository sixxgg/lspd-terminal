/* Briefing y debriefing: un muro de notas de los Supervisores (Supervisores › Briefing). Los oficiales NO lo ven, salvo que un
   Supervisor o six lo active para Inicio (lspdt.briefOn): ahí aparece Inicio › Briefing, en solo lectura. El servidor controla lo mismo al leer. Briefing = antes del servicio u operativo; debriefing = lo que salió y qué mejorar.
   Cada nota: título, contenido, prioridad (normal, alta, urgente) y fijada. Orden: fijadas arriba, después por prioridad y fecha.
   Datos en lspdt.brief (cada departamento el suyo). El servidor solo deja escribir a Supervisores para arriba (lib/core.js). */
import { useMemo, useState } from "react";
import { ClipboardCheck, ClipboardList, Eye, Megaphone, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput, Segmented, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { CopyMenu } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { fullDT, getRoster, norm, rankES, uid } from "@/lib/domain";
import { AgentMenu } from "@/components/sgtpick";
import { ME_ROLES, useJSON } from "@/lib/store";
import { DEPT } from "@/lib/dept";
import { useMe } from "@/lib/me";
import { myLevel } from "@/nav";
import { cn } from "@/lib/cn";

type Tipo = "b" | "d";
type Prio = "n" | "a" | "u";
/* puntos del briefing/debriefing: qué tipo, el texto, sobre quién es (opcional) y quién lo dice */
type PtK = "pos" | "con" | "neg" | "mej";
type Pt = { k: PtK; x: string; sobre?: string; dice?: string };
type Nota = { id: string; k: Tipo; t: string; x: string; p: Prio; pin?: boolean; by: string; r: string; at: number; ed?: number; eb?: string; pts?: Pt[] };
const PT: Record<PtK, { l: string; e: string; c: string }> = {
  pos: { l: "Positivo", e: "✅", c: "#22c55e" }, con: { l: "Constructivo", e: "🛠️", c: "#38bdf8" }, neg: { l: "Negativo", e: "❌", c: "#ef4444" }, mej: { l: "A mejorar", e: "📈", c: "#f59e0b" },
};
const PT_K = Object.keys(PT) as PtK[];
const ptLine = (p: Pt) => `${p.x}${p.sobre ? ` (sobre ${p.sobre})` : ""}${p.dice ? ` — lo dice ${p.dice}` : ""}`;
const KEY = "lspdt.brief";
const TIPO: Record<Tipo, { l: string; d: string; ph: string }> = {
  b: { l: "Briefing", d: "Antes del servicio u operativo: situación, objetivos, asignaciones y recordatorios", ph: "Situación, objetivos del servicio, asignación de unidades, recordatorios…" },
  d: { l: "Debriefing", d: "Después del servicio u operativo: qué pasó, qué salió bien y qué hay que mejorar", ph: "Qué pasó, qué salió bien, qué hay que mejorar y las conclusiones…" },
};
const PRIO: Record<Prio, { l: string; cls: string; o: number }> = {
  u: { l: "Urgente", o: 0, cls: "border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-300" },
  a: { l: "Alta", o: 1, cls: "border-orange-500/50 bg-orange-500/15 text-orange-600 dark:text-orange-300" },
  n: { l: "Normal", o: 2, cls: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};
const ord = (a: Nota, b: Nota) => PRIO[a.p].o - PRIO[b.p].o || b.at - a.at;
const txtOf = (n: Nota) => [`## 📋 ${TIPO[n.k].l}: ${n.t}`, `**Prioridad:** ${PRIO[n.p].l}`, "", n.x,
  ...PT_K.flatMap(k => { const L = (n.pts || []).filter(p => p.k === k && p.x.trim()); return L.length ? ["", `**${PT[k].e} ${PT[k].l}**`, ...L.map(p => `- ${ptLine(p)}`)] : []; }),
  "", `-# ${n.by} · ${n.r} · ${fullDT(n.at)}`].join("\n");

/* ro: la versión de solo lectura (Inicio) */
export function Briefing({ ro }: { ro?: boolean }) {
  const me = useMe(), { toast, confirm } = useFeedback(), [L, setL] = useJSON<Nota[]>(KEY, []);
  const can = !ro && (!!ME_ROLES.six || me.admin || myLevel(me.r) >= (DEPT.id === "lspd" ? 6 : 7));
  const [on, setOn] = useJSON<boolean>("lspdt.briefOn", false);
  const [tab, setTab] = useState<Tipo>("b"), [q, setQ] = useState(""), [ed, setEd] = useState<Nota | null>(null), [ver, setVer] = useState<Nota | null>(null);
  const s = norm(q.trim());
  const vis = useMemo(() => (Array.isArray(L) ? L : []).filter(n => n.k === tab && (!s || norm(`${n.t} ${n.x} ${n.by}`).includes(s))).sort(ord), [L, tab, s]);
  const cnt = (k: Tipo) => (Array.isArray(L) ? L : []).filter(n => n.k === k).length;
  const nueva = () => setEd({ id: "", k: tab, t: "", x: "", p: "n", by: me.n, r: rankES(me.r), at: 0 });
  const save = (n: Nota) => {
    const pts = (n.pts || []).filter(p => p.x.trim()).map(p => ({ ...p, x: p.x.trim() }));
    if (!n.t.trim() || (!n.x.trim() && !pts.length)) { toast("Completá el título y el contenido (o algún punto)", "err"); return; }
    const now = Date.now(), cur = Array.isArray(L) ? L : []; n = { ...n, pts: pts.length ? pts : undefined };
    if (!n.id) setL([{ ...n, id: uid(), t: n.t.trim(), x: n.x.trim(), at: now }, ...cur].slice(0, 300));
    else setL(cur.map(o => (o.id === n.id ? { ...n, t: n.t.trim(), x: n.x.trim(), ed: now, eb: me.n } : o)));
    toast(n.id ? "Nota actualizada" : `${TIPO[n.k].l} publicado`); setEd(null); if (n.k !== tab) setTab(n.k);
  };
  const del = async (n: Nota) => { if (!(await confirm(`¿Borrar «${n.t}»? Se borra para todo el departamento.`, { ok: "Borrar", danger: true }))) return;
    setL((Array.isArray(L) ? L : []).filter(o => o.id !== n.id)); setVer(null); toast("Nota borrada"); };
  const pin = (n: Nota) => { setL((Array.isArray(L) ? L : []).map(o => (o.id === n.id ? { ...o, pin: !o.pin } : o))); setVer(v => (v && v.id === n.id ? { ...v, pin: !v.pin } : v)); };
  const pins = vis.filter(n => n.pin), rest = vis.filter(n => !n.pin);
  const grid = (G: Nota[]) => <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{G.map(n => <NotaCard key={n.id} n={n} onOpen={() => setVer(n)} />)}</div>;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300"><Megaphone className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold">{TIPO[tab].l}</p><p className="text-xs text-slate-500">{TIPO[tab].d}.{ro ? " Lo publican los Supervisores." : on === true ? " Activado para los oficiales: lo ven en Inicio › Briefing." : " Solo lo ven los Supervisores."}</p></div>
        {can && <button type="button" role="switch" aria-checked={on === true} onClick={() => { setOn(on !== true); toast(on === true ? "Los oficiales ya no lo ven" : "Activado: los oficiales lo ven en Inicio › Briefing"); }}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2 text-left text-[12.5px] font-semibold dark:border-slate-700">
          <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on === true ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", on === true ? "left-[18px]" : "left-0.5")} /></span>
          Visible para los oficiales</button>}
        {can && <Button icon={<Plus className="size-4" />} onClick={nueva}>Nuevo {TIPO[tab].l.toLowerCase()}</Button>}
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={tab} onChange={setTab} options={[{ value: "b", label: `Briefing (${cnt("b")})`, icon: <ClipboardList className="size-4" /> }, { value: "d", label: `Debriefing (${cnt("d")})`, icon: <ClipboardCheck className="size-4" /> }]} />
        <SearchInput className="min-w-[14rem] flex-1 sm:max-w-xs" value={q} onChange={setQ} placeholder="Buscar por título, texto o autor…" />
      </div>
      {!vis.length ? <Card><Empty icon={<Megaphone />} title={s ? "Nada coincide" : `Todavía no hay ${TIPO[tab].l.toLowerCase()}s`} desc={can && !s ? `Tocá «Nuevo ${TIPO[tab].l.toLowerCase()}» para publicar el primero.` : undefined} /></Card> : <>
        {pins.length > 0 && <section className="space-y-2"><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-slate-500"><Pin className="size-3.5" />Fijadas</p>{grid(pins)}</section>}
        {rest.length > 0 && <section className="space-y-2">{pins.length > 0 && <p className="text-[11px] font-bold uppercase tracking-[.18em] text-slate-500">Todas</p>}{grid(rest)}</section>}
      </>}
      <Modal open={!!ver} onClose={() => setVer(null)} size="lg" icon={<Eye />} title={ver?.t || ""} desc={ver ? `${TIPO[ver.k].l} · ${ver.by} · ${ver.r} · ${fullDT(ver.at)}${ver.ed ? ` · editado ${fullDT(ver.ed)}${ver.eb && ver.eb !== ver.by ? ` por ${ver.eb}` : ""}` : ""}` : ""}
        footer={ver && <>{can && <><Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => void del(ver)}>Borrar</Button>
          <Button variant="ghost" icon={ver.pin ? <PinOff className="size-4" /> : <Pin className="size-4" />} onClick={() => pin(ver)}>{ver.pin ? "Desfijar" : "Fijar"}</Button>
          <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => { setEd(ver); setVer(null); }}>Editar</Button></>}
          <span className="ml-auto" /><CopyMenu size="md" text={txtOf(ver)} up /></>}>
        {ver && <div className="space-y-3"><div className="flex flex-wrap gap-1.5"><Tags n={ver} /></div><p className="whitespace-pre-wrap text-[14px] leading-relaxed">{ver.x}</p><PtsView pts={ver.pts} /></div>}
      </Modal>
      {ed && <Editor n={ed} onClose={() => setEd(null)} onSave={save} />}
    </div>);
}

function Tags({ n }: { n: Nota }) {
  return <><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold", PRIO[n.p].cls)}>{PRIO[n.p].l}</span>
    {n.pin && <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-600"><Pin className="size-3" />Fijada</span>}</>;
}
function NotaCard({ n, onOpen }: { n: Nota; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={cn("group flex min-h-[11rem] flex-col gap-2 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md",
      n.pin ? "border-brand-500/30 bg-brand-500/[.06]" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60", n.p === "u" && "border-red-500/40")}>
      <span className="flex flex-wrap gap-1.5"><Tags n={n} /></span>
      <b className="font-display text-[16px] leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-300">{n.t}</b>
      <span className="line-clamp-5 flex-1 whitespace-pre-line text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400">{n.x}</span>
      {!!n.pts?.length && <span className="flex flex-wrap gap-1">{PT_K.map(k => { const c = n.pts!.filter(p => p.k === k).length; return c ? <span key={k} className="rounded-md px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: PT[k].c + "1f", color: PT[k].c }}>{PT[k].l} · {c}</span> : null; })}</span>}
      <span className="truncate text-[11px] text-slate-400">{n.by} · {n.r} · {fullDT(n.at).slice(0, 10)}</span>
    </button>);
}
function Editor({ n: n0, onClose, onSave }: { n: Nota; onClose: () => void; onSave: (n: Nota) => void }) {
  const [n, setN] = useState(n0), up = (p: Partial<Nota>) => setN({ ...n, ...p });
  return (
    <Modal open onClose={onClose} size="lg" icon={<Megaphone />} title={n0.id ? "Editar nota" : `Nuevo ${TIPO[n.k].l.toLowerCase()}`} desc="Lo ven los Supervisores; los oficiales solo si está activado «Visible para los oficiales»."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave(n)}>{n0.id ? "Guardar" : "Publicar"}</Button></>}>
      <div className="space-y-4">
        <Segmented value={n.k} onChange={k => up({ k })} options={[{ value: "b", label: "Briefing", icon: <ClipboardList className="size-4" /> }, { value: "d", label: "Debriefing", icon: <ClipboardCheck className="size-4" /> }]} />
        <Field label="Título"><Input autoFocus value={n.t} maxLength={140} onChange={e => up({ t: e.target.value })} placeholder="Asunto de la nota" /></Field>
        <Field label="Contenido"><Textarea rows={6} value={n.x} maxLength={6000} onChange={e => up({ x: e.target.value })} placeholder={TIPO[n.k].ph} /></Field>
        <PtsEditor pts={n.pts || []} onChange={pts => up({ pts })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prioridad"><Select value={n.p} onChange={e => up({ p: e.target.value as Prio })}><option value="n">Normal</option><option value="a">Alta</option><option value="u">Urgente</option></Select></Field>
          <Field label="Fijada"><button type="button" role="switch" aria-checked={!!n.pin} onClick={() => up({ pin: !n.pin })} className="flex items-center gap-3 py-2 text-left text-sm text-slate-500">
            <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", n.pin ? "bg-brand-600 dark:bg-brand-500" : "bg-slate-300 dark:bg-slate-700")}><span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", n.pin ? "left-[22px]" : "left-0.5")} /></span>
            Arriba de todo en el muro</button></Field>
        </div>
      </div>
    </Modal>);
}

function PtsView({ pts }: { pts?: Pt[] }) {
  if (!pts?.length) return null;
  return <div className="grid gap-2 sm:grid-cols-2">{PT_K.map(k => { const L = pts.filter(p => p.k === k); if (!L.length) return null; return (
    <div key={k} className="rounded-xl border p-3" style={{ borderColor: PT[k].c + "55", background: PT[k].c + "0d" }}>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: PT[k].c }}>{PT[k].e} {PT[k].l}</p>
      <ul className="space-y-1 text-[13px]">{L.map((p, i) => <li key={i}>{p.x}{(p.sobre || p.dice) && <span className="block text-[11px] text-slate-500">{p.sobre && <>Sobre <b>{p.sobre}</b></>}{p.sobre && p.dice && " · "}{p.dice && <>Lo dice <b>{p.dice}</b></>}</span>}</li>)}</ul></div>); })}</div>;
}
/* puntos con selector de agente: sobre quién es y quién lo dice (por defecto, quien escribe) */
function PtsEditor({ pts, onChange }: { pts: Pt[]; onChange: (p: Pt[]) => void }) {
  const me = useMe(), R = useMemo(() => getRoster().slice().sort((a, b) => a.n.localeCompare(b.n)), []);
  const set = (i: number, p: Partial<Pt>) => onChange(pts.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Puntos</span>
        {PT_K.map(k => <button key={k} type="button" onClick={() => onChange([...pts, { k, x: "", dice: me.n }])} className="inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-semibold transition hover:brightness-110"
          style={{ borderColor: PT[k].c + "66", color: PT[k].c, background: PT[k].c + "12" }}><Plus className="size-3" />{PT[k].l}</button>)}</div>
      {pts.map((p, i) => <div key={i} className="space-y-1.5 rounded-xl border p-2.5" style={{ borderColor: PT[p.k].c + "55" }}>
        <div className="flex items-center gap-2"><Select value={p.k} onChange={e => set(i, { k: e.target.value as PtK })} className="h-8 w-36 text-[12.5px]">{PT_K.map(k => <option key={k} value={k}>{PT[k].l}</option>)}</Select>
          <Input value={p.x} onChange={e => set(i, { x: e.target.value })} maxLength={400} placeholder="Qué se dice…" className="h-8 min-w-0 flex-1 text-[13px]" />
          <button type="button" aria-label="Quitar punto" onClick={() => onChange(pts.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-3.5" /></button></div>
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500">
          <span>Sobre</span><AgentMenu value={p.sobre || ""} list={R} onChange={n => set(i, { sobre: n || undefined })} title="¿Sobre quién es?" placeholder="Nadie en particular" me={me.n} className="h-8 min-w-[11rem]" />
          <span>Lo dice</span><AgentMenu value={p.dice || ""} list={R} onChange={n => set(i, { dice: n || undefined })} title="¿Quién lo dice?" placeholder="Elegir agente" me={me.n} className="h-8 min-w-[11rem]" />
        </div></div>)}
    </div>);
}
