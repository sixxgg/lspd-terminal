/* Briefing y debriefing: un muro de notas que publican los Supervisores (Supervisores › Briefing) y lee todo el departamento
   (Inicio › Briefing, solo lectura). Briefing = antes del servicio u operativo; debriefing = lo que salió y qué mejorar.
   Cada nota: título, contenido, prioridad (normal, alta, urgente) y fijada. Orden: fijadas arriba, después por prioridad y fecha.
   Datos en lspdt.brief (cada departamento el suyo). El servidor solo deja escribir a Supervisores para arriba (lib/core.js). */
import { useMemo, useState } from "react";
import { ClipboardCheck, ClipboardList, Eye, Megaphone, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput, Segmented, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { CopyMenu } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { fullDT, norm, rankES, uid } from "@/lib/domain";
import { ME_ROLES, useJSON } from "@/lib/store";
import { DEPT } from "@/lib/dept";
import { useMe } from "@/lib/me";
import { myLevel } from "@/nav";
import { cn } from "@/lib/cn";

type Tipo = "b" | "d";
type Prio = "n" | "a" | "u";
type Nota = { id: string; k: Tipo; t: string; x: string; p: Prio; pin?: boolean; by: string; r: string; at: number; ed?: number; eb?: string };
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
const txtOf = (n: Nota) => [`## 📋 ${TIPO[n.k].l}: ${n.t}`, `**Prioridad:** ${PRIO[n.p].l}`, "", n.x, "", `-# ${n.by} · ${n.r} · ${fullDT(n.at)}`].join("\n");

/* ro: la versión de solo lectura (Inicio) */
export function Briefing({ ro }: { ro?: boolean }) {
  const me = useMe(), { toast, confirm } = useFeedback(), [L, setL] = useJSON<Nota[]>(KEY, []);
  const can = !ro && (!!ME_ROLES.six || me.admin || myLevel(me.r) >= (DEPT.id === "lspd" ? 6 : 7));
  const [tab, setTab] = useState<Tipo>("b"), [q, setQ] = useState(""), [ed, setEd] = useState<Nota | null>(null), [ver, setVer] = useState<Nota | null>(null);
  const s = norm(q.trim());
  const vis = useMemo(() => (Array.isArray(L) ? L : []).filter(n => n.k === tab && (!s || norm(`${n.t} ${n.x} ${n.by}`).includes(s))).sort(ord), [L, tab, s]);
  const cnt = (k: Tipo) => (Array.isArray(L) ? L : []).filter(n => n.k === k).length;
  const nueva = () => setEd({ id: "", k: tab, t: "", x: "", p: "n", by: me.n, r: rankES(me.r), at: 0 });
  const save = (n: Nota) => {
    if (!n.t.trim() || !n.x.trim()) { toast("Completá el título y el contenido", "err"); return; }
    const now = Date.now(), cur = Array.isArray(L) ? L : [];
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
        <div className="min-w-0 flex-1"><p className="font-semibold">{TIPO[tab].l}</p><p className="text-xs text-slate-500">{TIPO[tab].d}.{ro ? " Lo publican los Supervisores." : " Lo que publiques acá lo ve todo el departamento en Inicio › Briefing."}</p></div>
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
        {ver && <div className="space-y-3"><div className="flex flex-wrap gap-1.5"><Tags n={ver} /></div><p className="whitespace-pre-wrap text-[14px] leading-relaxed">{ver.x}</p></div>}
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
      <span className="truncate text-[11px] text-slate-400">{n.by} · {n.r} · {fullDT(n.at).slice(0, 10)}</span>
    </button>);
}
function Editor({ n: n0, onClose, onSave }: { n: Nota; onClose: () => void; onSave: (n: Nota) => void }) {
  const [n, setN] = useState(n0), up = (p: Partial<Nota>) => setN({ ...n, ...p });
  return (
    <Modal open onClose={onClose} size="md" icon={<Megaphone />} title={n0.id ? "Editar nota" : `Nuevo ${TIPO[n.k].l.toLowerCase()}`} desc="Lo que publiques acá lo ve todo el departamento en Inicio › Briefing."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave(n)}>{n0.id ? "Guardar" : "Publicar"}</Button></>}>
      <div className="space-y-4">
        <Segmented value={n.k} onChange={k => up({ k })} options={[{ value: "b", label: "Briefing", icon: <ClipboardList className="size-4" /> }, { value: "d", label: "Debriefing", icon: <ClipboardCheck className="size-4" /> }]} />
        <Field label="Título"><Input autoFocus value={n.t} maxLength={140} onChange={e => up({ t: e.target.value })} placeholder="Asunto de la nota" /></Field>
        <Field label="Contenido"><Textarea rows={8} value={n.x} maxLength={6000} onChange={e => up({ x: e.target.value })} placeholder={TIPO[n.k].ph} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prioridad"><Select value={n.p} onChange={e => up({ p: e.target.value as Prio })}><option value="n">Normal</option><option value="a">Alta</option><option value="u">Urgente</option></Select></Field>
          <Field label="Fijada"><button type="button" role="switch" aria-checked={!!n.pin} onClick={() => up({ pin: !n.pin })} className="flex items-center gap-3 py-2 text-left text-sm text-slate-500">
            <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", n.pin ? "bg-brand-600 dark:bg-brand-500" : "bg-slate-300 dark:bg-slate-700")}><span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", n.pin ? "left-[22px]" : "left-0.5")} /></span>
            Arriba de todo en el muro</button></Field>
        </div>
      </div>
    </Modal>);
}
