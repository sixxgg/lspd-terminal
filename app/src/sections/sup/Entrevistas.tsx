/* Entrevistas de seguimiento a los agentes por debajo de Sargento II.
   Arriba el avance general; abajo una lista ordenada por rango. Cada agente tiene una ficha donde se carga la entrevista
   (estado, fecha, rama, divisiones, respuestas y notas) y se GUARDA; recién guardada se puede copiar (Discord o web).
   Todo va a la base: las entrevistas en lspdt.entrev y las preguntas en lspdt.entrevQ (las edita Sargento I o superior). */
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Building2, Check, ChevronDown, CircleDashed, Clock, Compass, HelpCircle, MessagesSquare, Pencil, Plus, RotateCcw, Save, Search, Shield, StickyNote, Target, Trash2, UserRoundCheck, X } from "lucide-react";
import { Button, Card, Empty, Input, Textarea, SearchInput } from "@/components/ui";
import { Modal } from "@/components/modal";
import { Revisar } from "@/components/revisar";
import { rosterDivs } from "@/lib/units";
import { Avatar, RankBadge } from "@/components/agents";
import { CopyMenu } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { ALL_DIVS, divAb, dmyToISO, fmtDate, genderOf, getRoster, hoyISO, isoToDMY, lvl, maskDMY, norm, rankES, uid, type Agent } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

/* preguntas: de lo general a lo particular y el cierre siempre al final. n = recordatorio para el sargento */
type Q = { id: string; q: string; n?: string };
const Q_DEF: Q[] = [
  { id: "siente", q: "¿Cómo se siente dentro del Departamento?" },
  { id: "asp", q: "¿Cuáles son sus aspiraciones dentro del Departamento?" },
  { id: "conf", q: "¿Tiene algún problema o conflicto con algún miembro del Departamento? Si es así, ¿con quién y por qué motivo?" },
  { id: "rama", q: "Al terminar la etapa de oficial, la carrera se divide en dos ramas: Sargentos y Detectives. ¿En cuál le gustaría desarrollarse y por qué?" },
  { id: "div", q: "¿Pertenece actualmente a alguna división? ¿A cuál o cuáles le gustaría incorporarse?" },
  { id: "rel", q: "¿Mantiene alguna relación sentimental, dentro o fuera del Departamento?", n: "Recordarle que toda relación sentimental entre miembros del Departamento debe comunicarse a la PSB." },
  { id: "mas", q: "Por último, ¿hay algo más que quiera comentarnos o aportar a esta entrevista?" },
];
/* las respuestas viejas se guardaban por número de pregunta (en el orden anterior) */
const OLD = ["siente", "conf", "rama", "div", "rel", "mas", "asp"];
const resOf = (e: Ent): Record<string, string> => Object.fromEntries(Object.entries(e.res || {}).map(([k, v]) => [/^\d+$/.test(k) ? OLD[+k] || k : k, v]));

/* div = a las que quiere entrar · act = a las que ya pertenece (además de las del roster de cada división) · res = respuestas por pregunta */
type Ent = { st?: string; rama?: string; f?: string; div?: string[]; act?: string[]; res?: Record<string, string>; nota?: string; por?: string; t?: number };
const ST = { si: { l: "Realizada", c: "#10b981", I: Check }, pen: { l: "Pendiente", c: "#f59e0b", I: Clock }, no: { l: "No realizada", c: "#ef4444", I: X } } as const;
const RAMA = { sgt: { l: "Sargentos", c: "#ec4899", I: Shield, d: "Supervisión y mando de patrulla" }, det: { l: "Detectives", c: "#a855f7", I: Compass, d: "Investigación criminal" }, ind: { l: "Indeciso", c: "#06b6d4", I: HelpCircle, d: "Todavía no lo tiene claro" } } as const;
type StK = keyof typeof ST; type RaK = keyof typeof RAMA;
const stOf = (e: Ent) => (e.st && e.st in ST ? ST[e.st as StK] : null), raOf = (e: Ent) => (e.rama && e.rama in RAMA ? RAMA[e.rama as RaK] : null);
const raL = (k: string | undefined, n: string) => (k === "ind" && genderOf(n) === "f" ? "Indecisa" : k && k in RAMA ? RAMA[k as RaK].l : "");
const ordDiv = (s: Iterable<string>) => { const x = new Set(s); return ALL_DIVS.filter(d => x.has(d)); };
const actOf = (n: string, e: Ent) => ordDiv([...rosterDivs(n), ...(e.act || [])]);
const empty = (e: Ent) => !e.st && !e.rama && !e.f && !(e.div || []).length && !(e.act || []).length && !(e.nota || "").trim() && !Object.values(e.res || {}).some(v => v.trim());
const clean = (e: Ent): Ent => ({ st: e.st || "", rama: e.rama || "", f: e.f || "", div: e.div || [], act: e.act || [], res: Object.fromEntries(Object.entries(resOf(e)).filter(([, v]) => v.trim())), nota: (e.nota || "").trim() });

/* texto para Discord (el formato web lo saca CopyMenu limpiando el markdown) */
function entText(a: Agent, e: Ent, QS: Q[]) {
  const act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d)), R = resOf(e);
  const ico = { si: "✅", no: "❌", pen: "⏳" }[e.st || ""] || "▫️";
  const res = QS.map(x => [x.q, (R[x.id] || "").trim()] as const).filter(([, r]) => r), nota = (e.nota || "").trim();
  return [
    `## 🗣️ ENTREVISTA — ${rankES(a.r)} ${a.n}${a.p ? ` (#${a.p})` : ""}`,
    `**Estado:** ${ico} ${stOf(e)?.l || "Sin marcar"}${e.f ? `  ·  **Fecha:** \`${isoToDMY(e.f)}\`` : ""}`,
    `**Rama de interés:** ${raL(e.rama, a.n)}`, "",
    "### 🏢 Divisiones a las que pertenece", act.length ? act.map(d => `> • ${d}`).join("\n") : "> Ninguna", "",
    "### 🎯 Divisiones a las que quiere pertenecer", dv.length ? dv.map(d => `> • ${d}`).join("\n") : "> Ninguna por ahora",
    ...(res.length ? ["", "### 📝 Respuestas", ...res.flatMap(([q, r]) => [`**${q}**`, `> ${r.replace(/\n/g, "\n> ")}`])] : []),
    ...(nota ? ["", "### 🗒️ Notas", nota.split("\n").map(l => "> " + l).join("\n")] : []),
    "", `-# Entrevista registrada por ${e.por || "—"}${e.t ? ` · ${fmtDate(e.t)}` : ""}`,
  ].join("\n");
}

const DivTag = ({ d, want }: { d: string; want?: boolean }) => { const [ab, col] = divAb(d); return (
  <span title={(want ? "Quiere entrar: " : "Pertenece: ") + d} className={cn("inline-flex items-center rounded px-1.5 py-px text-[10px] font-bold", want ? "border border-dashed" : "text-white")}
    style={want ? { borderColor: col + "aa", color: col } : { background: col }}>{want && "→"}{ab}</span>); };
function DivChips({ list, on, lock, onToggle, col }: { list: string[]; on: string[]; lock?: string[]; onToggle: (d: string) => void; col: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">{list.map(d => { const [ab, c] = divAb(d), sel = on.includes(d), lk = lock?.includes(d); return (
      <button key={d} type="button" disabled={lk} onClick={() => onToggle(d)} title={lk ? `${d} · sale del roster de la división` : d}
        className={cn("inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[11.5px] font-semibold transition", !sel && "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100", lk && "cursor-default")}
        style={sel ? { borderColor: col + "80", background: col + "18", color: col } : undefined}>
        <span className="rounded-full px-1.5 py-px text-[9.5px] font-black text-white" style={{ background: c }}>{ab}</span><span className="max-w-[12rem] truncate">{d}</span>
        {lk ? <span className="rounded-full bg-black/10 px-1.5 text-[9px] font-bold uppercase tracking-wide dark:bg-white/10">roster</span> : sel && <Check className="size-3" />}
      </button>); })}</div>);
}
function Ring({ v, c, size = 84, w = 8, children }: { v: number; c: string; size?: number; w?: number; children?: ReactNode }) {
  const r = (size - w) / 2, L = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} className="stroke-slate-200 dark:stroke-slate-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} stroke={c} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - Math.min(1, v))} style={{ transition: "stroke-dashoffset .6s" }} /></svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>);
}
const Lbl = ({ I, children }: { I: typeof Check; children: ReactNode }) => <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500"><I className="size-3.5" />{children}</p>;
const Pill = ({ c, I, children }: { c: string; I: typeof Check; children: ReactNode }) => <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: c + "1c", color: c }}><I className="size-3" />{children}</span>;

export function Entrevistas() {
  const me = useMe();
  const [ENT, setENT] = useJSON<Record<string, Ent>>("lspdt.entrev", {});
  const [QS0, setQS] = useJSON<Q[]>("lspdt.entrevQ", []), QS = QS0.length ? QS0 : Q_DEF;
  const [f, setF] = useState(""), [rf, setRf] = useState(""), [q, setQ] = useState(""), [open, setOpen] = useState<string | null>(null), [qOpen, setQOpen] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const A = useMemo(() => getRoster().filter(a => lvl(a.r) > 0 && lvl(a.r) < 7).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n)), [ENT]); // eslint-disable-line react-hooks/exhaustive-deps
  const g = (n: string) => ENT[n] || {};
  const save = (n: string, e: Ent) => { const all = { ...ENT }; if (empty(e)) delete all[n]; else all[n] = { ...clean(e), por: me.n, t: Date.now() }; setENT(all); };
  const cnt = (fn: (e: Ent) => boolean) => A.filter(a => fn(g(a.n))).length;
  const s = norm(q.trim());
  const L = A.filter(a => { const e = g(a.n); return (!s || norm(a.n).includes(s) || String(a.p || "").includes(s)) && (!f || (f === "vac" ? !e.st : e.st === f)) && (!rf || (rf === "-" ? !e.rama : e.rama === rf)); });
  const ranks = [...new Set(L.map(a => a.r))];
  const done = cnt(e => e.st === "si"), pct = A.length ? done / A.length : 0;
  const rk = (Object.keys(RAMA) as RaK[]).map(k => [k, cnt(e => e.rama === k)] as const), rTot = Math.max(1, A.length);
  const tile = (k: string, l: string, n: number, c: string, I: typeof Check) => (
    <button key={k} onClick={() => setF(f === k ? "" : k)} className={cn("flex items-center gap-3 rounded-xl border p-2.5 text-left transition", f !== k && "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}
      style={f === k ? { borderColor: c, background: c + "14" } : undefined}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: c + "1f", color: c }}><I className="size-[18px]" /></span>
      <span className="min-w-0"><b className="block text-xl font-black leading-none tabular-nums" style={{ color: c }}>{n}</b><span className="mt-1 block truncate text-[11px] font-medium text-slate-500">{l}</span></span></button>);
  const cur = open ? A.find(a => a.n === open) : null;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid items-center gap-5 xl:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex items-center gap-4">
            <Ring v={pct} c="#10b981"><span><b className="block text-lg font-black tabular-nums">{Math.round(pct * 100)}%</b><span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">hechas</span></span></Ring>
            <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand-600 dark:text-brand-300">Seguimiento</p><p className="text-base font-bold leading-tight">{done} de {A.length} entrevistados</p>
              <p className="mt-0.5 text-xs text-slate-500">Agentes por debajo de Sargento II</p>
              <Button size="sm" variant="outline" icon={<MessagesSquare />} className="mt-2" onClick={() => setQOpen(true)}>Preguntas ({QS.length})</Button></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tile("si", "Realizadas", done, ST.si.c, Check)}{tile("pen", "Pendientes", cnt(e => e.st === "pen"), ST.pen.c, Clock)}
            {tile("no", "No realizadas", cnt(e => e.st === "no"), ST.no.c, X)}{tile("vac", "Sin marcar", cnt(e => !e.st), "#94a3b8", CircleDashed)}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">Rama de interés</p>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">{rk.map(([k, n]) => n > 0 && <div key={k} style={{ width: `${(n * 100) / rTot}%`, background: RAMA[k].c }} title={`${RAMA[k].l}: ${n}`} />)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{rk.map(([k, n]) => { const R = RAMA[k], on = rf === k; return (
              <button key={k} onClick={() => setRf(on ? "" : k)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition", on ? "text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
                style={on ? { background: R.c, borderColor: R.c } : undefined}><R.I className="size-3.5" style={on ? undefined : { color: R.c }} />{R.l}<b className="tabular-nums">{n}</b></button>); })}
              <button onClick={() => setRf(rf === "-" ? "" : "-")} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold", rf === "-" ? "border-slate-500 bg-slate-500 text-white" : "border-slate-200 text-slate-500 dark:border-slate-700")}>Sin rama <b className="tabular-nums">{cnt(e => !e.rama)}</b></button></div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
          <SearchInput className="min-w-[14rem] flex-1 sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar agente o placa…" />
          {(f || rf) && <Button size="sm" variant="ghost" icon={<X />} onClick={() => { setF(""); setRf(""); }}>Quitar filtros</Button>}
          <span className="ml-auto text-xs text-slate-500">{L.length} de {A.length} agentes</span>
        </div>
        <div className="hidden grid-cols-[minmax(0,1.5fr)_8.5rem_6rem_7.5rem_minmax(0,1.4fr)_6.5rem] gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 lg:grid dark:border-slate-800 dark:bg-slate-900/40">
          <span>Agente</span><span>Estado</span><span>Fecha</span><span>Rama</span><span>Divisiones</span><span /></div>
        {!L.length ? <Empty icon={<Search />} title="Nadie coincide con el filtro" /> : ranks.map(r => {
          const gl = L.filter(a => a.r === r), isOpen = !!s || !closed.has(r), gd = gl.filter(x => g(x.n).st === "si").length;
          return (
            <section key={r} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
              <button onClick={() => setClosed(c => { const n = new Set(c); if (n.has(r)) n.delete(r); else n.add(r); return n; })} className="flex w-full items-center gap-3 bg-slate-50/40 px-4 py-2 text-left transition hover:bg-slate-50 dark:bg-slate-900/20 dark:hover:bg-slate-800/40">
                <RankBadge r={r} /><span className="text-xs text-slate-500">{gl.length} {gl.length === 1 ? "agente" : "agentes"}</span>
                <span className="h-1.5 max-w-[10rem] flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(gd * 100) / gl.length}%` }} /></span>
                <span className="text-[11px] font-semibold tabular-nums text-slate-500">{gd}/{gl.length}</span>
                <ChevronDown className={cn("ml-auto size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && <div className="divide-y divide-slate-100 dark:divide-slate-800">{gl.map(a => {
                const e = g(a.n), S = stOf(e), R = raOf(e), act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d));
                return (
                  <div key={a.n} role="button" tabIndex={0} onClick={() => setOpen(a.n)} onKeyDown={ev => ev.key === "Enter" && setOpen(a.n)}
                    className="relative grid cursor-pointer items-center gap-x-3 gap-y-1.5 px-4 py-2 transition hover:bg-brand-500/[.04] sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.5fr)_8.5rem_6rem_7.5rem_minmax(0,1.4fr)_6.5rem]">
                    <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: S?.c || "transparent" }} />
                    <span className="flex min-w-0 items-center gap-2.5"><Avatar n={a.n} size={30} /><span className="min-w-0"><b className="block truncate text-[13px]">{a.n}</b><span className="block truncate text-[11px] text-slate-500">{a.p ? `#${a.p}` : "Sin placa"}{e.t ? ` · ${e.por}` : ""}</span></span></span>
                    <span>{S ? <Pill c={S.c} I={S.I}>{S.l}</Pill> : <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><CircleDashed className="size-3" />Sin marcar</span>}</span>
                    <span className="text-[12px] tabular-nums text-slate-600 dark:text-slate-300">{e.f ? isoToDMY(e.f) : <span className="text-slate-400">—</span>}</span>
                    <span>{R ? <Pill c={R.c} I={R.I}>{raL(e.rama, a.n)}</Pill> : <span className="text-[11px] text-slate-400">—</span>}</span>
                    <span className="flex min-w-0 flex-wrap items-center gap-1">{act.map(d => <DivTag key={d} d={d} />)}{dv.map(d => <DivTag key={d} d={d} want />)}{!act.length && !dv.length && <span className="text-[11px] text-slate-400">—</span>}{(e.nota || "").trim() && <StickyNote className="size-3.5 text-amber-500" />}</span>
                    <span className="flex justify-end" onClick={ev => ev.stopPropagation()}>{e.t ? <CopyMenu text={entText(a, e, QS)} variant="ghost" /> : <span className="pr-2 text-[11px] text-slate-400">Sin guardar</span>}</span>
                  </div>);
              })}</div>}
            </section>);
        })}
      </Card>

      {cur && <EntModal key={cur.n} a={cur} e={g(cur.n)} QS={QS} onSave={x => save(cur.n, x)} onClose={() => setOpen(null)} />}
      {qOpen && <PregModal QS={QS} can={me.l >= 6 || !!me.admin} onSave={L => setQS(L)} onClose={() => setQOpen(false)} />}
    </div>
  );
}

/* preguntas: verlas, copiarlas y (Sargento I o superior) editarlas, ordenarlas o volver a las de siempre */
function PregModal({ QS, can, onSave, onClose }: { QS: Q[]; can: boolean; onSave: (L: Q[]) => void; onClose: () => void }) {
  const { confirm } = useFeedback(), [ed, setEd] = useState<Q[] | null>(null);
  const L = ed || QS, mv = (i: number, d: number) => { const x = [...L], [it] = x.splice(i, 1); x.splice(i + d, 0, it); setEd(x); };
  const txt = QS.map((x, i) => `**${i + 1}.** ${x.q}${x.n ? `\n> ⚠️ ${x.n}` : ""}`).join("\n");
  return (
    <Modal open onClose={onClose} title="Preguntas de la entrevista" icon={<MessagesSquare />} size="lg" desc={ed ? "Editando: los cambios se ven en todas las entrevistas al guardar." : undefined}
      footer={ed ? <><Button variant="ghost" icon={<RotateCcw />} className="mr-auto" onClick={async () => { if (await confirm("¿Volver a las preguntas de siempre?")) setEd(Q_DEF); }}>Las de siempre</Button>
        <Button variant="ghost" onClick={() => setEd(null)}>Cancelar</Button><Button icon={<Save />} disabled={L.some(x => !x.q.trim())} onClick={() => { onSave(L.map(x => ({ ...x, q: x.q.trim(), n: x.n?.trim() || undefined }))); setEd(null); }}>Guardar</Button></>
        : <>{can && <Button variant="ghost" icon={<Pencil />} className="mr-auto" onClick={() => setEd(QS.map(x => ({ ...x })))}>Editar</Button>}<Button variant="ghost" onClick={onClose}>Cerrar</Button><CopyMenu size="md" variant="primary" text={txt} up /></>}>
      <ol className="space-y-2">{L.map((x, i) => (
        <li key={x.id} className="flex gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-black text-white dark:bg-brand-500">{i + 1}</span>
          {ed ? <div className="min-w-0 flex-1 space-y-1.5">
            <Textarea rows={2} value={x.q} onChange={ev => setEd(L.map(y => (y.id === x.id ? { ...y, q: ev.target.value } : y)))} placeholder="Pregunta…" />
            <Input value={x.n || ""} onChange={ev => setEd(L.map(y => (y.id === x.id ? { ...y, n: ev.target.value } : y)))} placeholder="Recordatorio para el sargento (opcional)" className="h-8 text-xs" /></div>
            : <div className="text-[13.5px] leading-snug">{x.q}{x.n && <p className="mt-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">⚠ {x.n}</p>}</div>}
          {ed && <div className="flex shrink-0 flex-col gap-0.5">
            <button aria-label="Subir" disabled={!i} onClick={() => mv(i, -1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-white"><ArrowUp className="size-4" /></button>
            <button aria-label="Bajar" disabled={i === L.length - 1} onClick={() => mv(i, 1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-white"><ArrowDown className="size-4" /></button>
            <button aria-label="Quitar" onClick={() => setEd(L.filter(y => y.id !== x.id))} className="rounded p-1 text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button></div>}
        </li>))}</ol>
      {ed && <Button variant="outline" icon={<Plus />} className="mt-2" onClick={() => setEd([...L, { id: uid(), q: "" }])}>Agregar pregunta</Button>}
    </Modal>);
}

/* ficha de la entrevista: se edita un borrador y se guarda con «Guardar»; guardada y sin cambios se puede copiar */
function EntModal({ a, e, QS, onSave, onClose }: { a: Agent; e: Ent; QS: Q[]; onSave: (x: Ent) => void; onClose: () => void }) {
  const { toast, confirm } = useFeedback();
  const [d, setD] = useState<Ent>(() => clean(e)), [pv, setPv] = useState(false), [fd, setFd] = useState(isoToDMY(e.f));
  const set = (x: Partial<Ent>) => setD(o => ({ ...o, ...x }));
  const dirty = JSON.stringify(clean(d)) !== JSON.stringify(clean(e)), saved = !!e.t && !dirty;
  const act = actOf(a.n, d), auto = rosterDivs(a.n), dv = d.div || [], R = resOf(d), S = stOf(d);
  const txt = entText(a, saved ? e : { ...d, por: "(sin guardar)" }, QS), answered = QS.filter(x => (R[x.id] || "").trim()).length;
  const close = async () => { if (dirty && !(await confirm("Hay cambios sin guardar. ¿Salir igual?", { danger: true, ok: "Salir sin guardar" }))) return; onClose(); };
  const doSave = () => { if (d.st === "si" && !d.f) { toast("Poné la fecha de la entrevista", "err"); return; } onSave(d); toast(empty(d) ? "Entrevista borrada" : "Entrevista guardada · ya la podés copiar"); };
  return (
    <Modal open onClose={() => void close()} size="xl" icon={<UserRoundCheck />} title={<span className="flex items-center gap-2">Entrevista · {a.n}{S && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: S.c + "22", color: S.c }}>{S.l}</span>}</span>}
      desc={<span className="flex flex-wrap items-center gap-1.5"><RankBadge r={a.r} />{a.p && <span className="font-mono text-xs">#{a.p}</span>}{e.t && <span className="text-xs">· guardada por {e.por}, {fmtDate(e.t)}</span>}</span>}
      footer={<><Revisar text={txt} err={[!d.st && "estado de la entrevista", d.st === "si" && !d.f && "fecha"].filter(Boolean) as string[]} pen={dv.length ? undefined : ["divisiones a las que quiere entrar"]} className="mr-auto min-w-0 max-w-full flex-1" />
        <Button variant="ghost" onClick={() => void close()}>Cerrar</Button>
        {saved ? <CopyMenu size="md" variant="primary" text={txt} up /> : <Button icon={<Save />} disabled={!dirty} onClick={doSave}>Guardar</Button>}</>}>
      {dirty && <p className="-mt-1 mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300"><Clock className="size-3.5" />Cambios sin guardar · guardá para poder copiarla</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <div><Lbl I={Check}>Estado</Lbl>
            <div className="grid grid-cols-3 gap-2">{(Object.keys(ST) as StK[]).map(k => { const X = ST[k], on = d.st === k; return (
              <button key={k} onClick={() => { set({ st: on ? "" : k }); if (k === "si" && !on && !d.f) { set({ st: k, f: hoyISO() }); setFd(isoToDMY(hoyISO())); } }} className={cn("flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-[12px] font-bold transition", !on && "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800")}
                style={on ? { borderColor: X.c, background: X.c + "18", color: X.c } : undefined}><X.I className="size-5" />{X.l}</button>); })}</div>
            <div className="mt-2 flex items-center gap-2"><span className="text-xs text-slate-500">Fecha</span>
              <Input value={fd} placeholder="dd/mm/aaaa" inputMode="numeric" className="h-9 w-36 text-sm" onChange={ev => setFd(maskDMY(ev.target.value))}
                onBlur={() => { const v = fd.trim(); if (!v) { set({ f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · escribila como dd/mm/aaaa", "err"); return; } set({ f: iso }); }} />
              <Button size="sm" variant="ghost" onClick={() => { set({ f: hoyISO() }); setFd(isoToDMY(hoyISO())); }}>Hoy</Button></div>
          </div>
          <div><Lbl I={Compass}>Rama de interés</Lbl>
            <div className="grid grid-cols-3 gap-2">{(Object.keys(RAMA) as RaK[]).map(k => { const Ra = RAMA[k], on = d.rama === k; return (
              <button key={k} onClick={() => set({ rama: on ? "" : k })} className={cn("rounded-xl border-2 p-2.5 text-left transition", on ? "text-white" : "border-slate-200 hover:border-slate-300 dark:border-slate-800")}
                style={on ? { borderColor: Ra.c, background: `linear-gradient(135deg, ${Ra.c}, ${Ra.c}bb)` } : undefined}>
                <Ra.I className="size-5" style={on ? undefined : { color: Ra.c }} /><b className="mt-1 block text-[13px]">{raL(k, a.n)}</b><span className={cn("block text-[10.5px] leading-tight", on ? "text-white/80" : "text-slate-500")}>{Ra.d}</span></button>); })}</div>
          </div>
          <div><Lbl I={Building2}>Divisiones a las que pertenece</Lbl>
            <DivChips list={ALL_DIVS} on={act} lock={auto} col="#10b981" onToggle={x => { const s = new Set(d.act || []); if (s.has(x)) s.delete(x); else s.add(x); set({ act: ordDiv(s) }); }} /></div>
          <div><Lbl I={Target}>Divisiones a las que quiere pertenecer</Lbl>
            <DivChips list={ALL_DIVS.filter(x => !act.includes(x))} on={dv} col="rgb(var(--b-500))" onToggle={x => { const s = new Set(dv); if (s.has(x)) s.delete(x); else s.add(x); set({ div: ordDiv(s) }); }} /></div>
        </div>
        <div className="space-y-5">
          <div><Lbl I={MessagesSquare}>Respuestas <span className="ml-auto font-semibold normal-case tracking-normal text-slate-400">{answered}/{QS.length}</span></Lbl>
            <div className="space-y-2">{QS.map((x, i) => { const v = R[x.id] || ""; return (
              <div key={x.id} className={cn("rounded-xl border p-2.5 transition focus-within:border-brand-500/60", v.trim() ? "border-emerald-500/30 bg-emerald-500/[.03]" : "border-slate-200 dark:border-slate-800")}>
                <p className="mb-1.5 flex gap-2 text-[12.5px] font-semibold leading-snug"><span className={cn("grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-black", v.trim() ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>{v.trim() ? <Check className="size-3" /> : i + 1}</span>{x.q}</p>
                {x.n && <p className="mb-1.5 ml-7 text-[11px] text-amber-600 dark:text-amber-300">⚠ {x.n}</p>}
                <textarea rows={Math.min(6, Math.max(1, v.split("\n").length, Math.ceil(v.length / 70)))} value={v} placeholder="Respuesta…" onChange={ev => set({ res: { ...R, [x.id]: ev.target.value } })}
                  className="ml-7 block w-[calc(100%-1.75rem)] resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-slate-400" />
              </div>); })}</div></div>
          <div><Lbl I={StickyNote}>Notas</Lbl>
            <Textarea rows={3} value={d.nota || ""} placeholder="Observaciones, compromisos, lo que haga falta…" onChange={ev => set({ nota: ev.target.value })} /></div>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => setPv(!pv)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-semibold"><MessagesSquare className="size-4 text-[#5865F2]" />Vista previa para Discord<ChevronDown className={cn("ml-auto size-4 text-slate-400 transition", pv && "rotate-180")} /></button>
            {pv && <pre className="scrollbar-thin max-h-64 overflow-auto whitespace-pre-wrap bg-slate-950 p-3 font-mono text-[11.5px] leading-relaxed text-slate-200">{txt}</pre>}
          </div>
        </div>
      </div>
    </Modal>);
}
