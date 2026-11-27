/* Condecoraciones › Entrega e Historial (los tres departamentos; cada uno guarda su historial en su propia clave).
   Entrega: se elige la condecoración y a quién (uno o varios agentes del roster); al costado sale el rol de la ceremonia (/me y /do, cada
   línea de hasta 290 caracteres) para copiar línea por línea. Al registrarla se otorga en el perfil de cada agente y queda en el Historial. */
import { useMemo, useState } from "react";
import { Award as AwardI, Check, ClipboardCopy, Copy, History, Medal, RotateCcw, Search, Sparkles, Target, Trash2, Users, ArrowLeftRight } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Empty, Field, Input, SearchInput, Segmented } from "@/components/ui";
import { Modal } from "@/components/modal";
import { AgentPicker } from "@/components/agents";
import { Ribbon } from "@/components/ribbon";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { AgChips } from "./T1080Hist";
import { CHAT_MAX, entregaLines, lineTxt, type EntAg, type Ln } from "@/content/condEntrega";
import { allDecor, decorOf, type Award, type Decor } from "@/lib/decor";
import { dmy, findAgent, genderOf, hoyISO, norm, rankES, uid } from "@/lib/domain";
import { DEPT, DEPTS } from "@/lib/dept";
import { ME_ROLES, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { myLevel } from "@/nav";
import { allProfiles, updateProf } from "@/lib/profiles";
import { cn } from "@/lib/cn";

/* entrega registrada: qué, a quiénes (con el id de la condecoración en su perfil, para poder anularla) y quién la entregó */
type Ent = { id: string; k: string; t: string; ags: { n: string; r: string; aid: string }[]; f: string; m?: string; by: string; byR?: string; at: number };
const ENT_KEY = "lspdt.condEnt";
const TABL: Record<Decor["tab"], string> = { cond: "Condecoraciones", med: "Medallas", fra: "Franjas de servicio" };
const agsOf = (names: string[]): EntAg[] => names.map(n => { const a = findAgent(n); return { n, rk: a ? rankES(a.r) : "", f: genderOf(n) === "f" }; });

/* las líneas del rol, cada una con su contador y su botón de copiar */
function RolLines({ L, onReset }: { L: Ln[]; onReset?: () => void }) {
  const copy = useCopy(), [done, setDone] = useState(-1);
  const cp = (i: number, t: string) => { copy(t); setDone(i); window.setTimeout(() => setDone(-1), 1200); };
  if (!L.length) return <Empty icon={<Medal />} title="Elegí la condecoración y a quién" desc="Acá aparece el rol de la entrega, listo para copiar línea por línea." />;
  return (
    <div className="space-y-1.5">
      {L.map((l, i) => { const t = lineTxt(l); return (
        <div key={i} className="group flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <span className={cn("mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold", l.c === "/me" ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>{l.c}</span>
          <span className="min-w-0 flex-1 break-words font-mono text-[12.5px] leading-relaxed">{l.t}</span>
          <span className={cn("shrink-0 pt-0.5 text-[10.5px] tabular-nums", t.length > CHAT_MAX ? "font-bold text-red-500" : "text-slate-400")} title="Caracteres (máximo 290)">{t.length}</span>
          <button aria-label="Copiar línea" title="Copiar" onClick={() => cp(i, t)} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-500/10 hover:text-brand-600">{done === i ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}</button>
        </div>); })}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <p className="mr-auto text-[11.5px] text-slate-500">{L.length} líneas · todas de {CHAT_MAX} caracteres o menos. Mandalas en orden.</p>
        {onReset && <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={onReset}>Otros mensajes</Button>}
        <Button size="sm" variant="outline" icon={<ClipboardCopy />} onClick={() => copy(L.map(lineTxt).join("\n"))}>Copiar todo</Button>
      </div>
    </div>);
}

/* ---- selector de condecoración: catálogo en tarjetas (cinta, nombre y qué reconoce), con pestañas por tipo y filtro por grupo ---- */
type TabF = Decor["tab"] | "all";
const TABS: { v: TabF; l: string }[] = [{ v: "all", l: "Todas" }, { v: "cond", l: "Condecoraciones" }, { v: "med", l: "Medallas" }, { v: "fra", l: "Franjas" }];
const grpOrd = (g: string) => (g === "Compartidas" ? 0 : g === DEPTS[DEPT.id].short ? 1 : 2);
function DecorPicker({ open, onClose, value, onPick }: { open: boolean; onClose: () => void; value: string; onPick: (k: string) => void }) {
  const [q, setQ] = useState(""), [tb, setTb] = useState<TabF>("all"), [g, setG] = useState("");
  const ALL = allDecor(), qn = norm(q.trim());
  const inTab = ALL.filter(x => tb === "all" || x.tab === tb);
  const grps = [...new Set(inTab.map(x => x.g).filter(Boolean))].sort((a, b) => grpOrd(a) - grpOrd(b) || a.localeCompare(b));
  const L = inTab.filter(x => (!g || x.g === g) && (!qn || norm(`${x.t} ${x.c} ${x.g} ${x.d || ""}`).includes(qn)))
    .sort((a, b) => grpOrd(a.g) - grpOrd(b.g) || a.g.localeCompare(b.g) || a.t.localeCompare(b.t));
  const pick = (k: string) => { onPick(k); onClose(); };
  return (
    <Modal open={open} onClose={onClose} size="xl" icon={<Medal />} title="Elegir condecoración" desc="Tocá una para elegirla. La descripción dice qué reconoce.">
      <div className="space-y-3">
        <SearchInput autoFocus value={q} onChange={setQ} placeholder="Buscar por nombre, tipo o lo que reconoce…" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" value={tb} onChange={v => { setTb(v); setG(""); }} options={TABS.map(t => ({ value: t.v, label: `${t.l} (${ALL.filter(x => t.v === "all" || x.tab === t.v).length})` }))} />
        </div>
        {grps.length > 1 && <div className="flex flex-wrap gap-1.5"><Chip active={!g} onClick={() => setG("")}>Todos los grupos</Chip>{grps.map(x => <Chip key={x} active={g === x} onClick={() => setG(g === x ? "" : x)}>{x}</Chip>)}</div>}
        {!L.length ? <Empty icon={<Search />} title="Nada coincide" desc="Probá con otra palabra o sacá el filtro." />
          : <div className="grid max-h-[58dvh] gap-2.5 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2 lg:grid-cols-3">{L.map(x => { const on = x.k === value; return (
            <button key={x.k} type="button" onClick={() => pick(x.k)} className={cn("group flex flex-col overflow-hidden rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              on ? "border-brand-500 ring-2 ring-brand-500/40" : "border-slate-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md dark:border-slate-800")}>
              <span className="relative grid h-16 place-items-center bg-[radial-gradient(ellipse_at_center,#1e293b,#0b1120)]">
                <Ribbon d={x} className="!h-[30px] !w-[104px] transition group-hover:scale-105" />
                {on && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-brand-600 text-white"><Check className="size-3.5" /></span>}
              </span>
              <span className="flex flex-1 flex-col gap-1 p-3">
                <b className="text-[13.5px] leading-snug">{x.t}</b>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{TABL[x.tab]} · {x.c}{x.g ? ` · ${x.g}` : ""}</span>
                <span className="line-clamp-2 text-[12px] text-slate-600 dark:text-slate-400">{x.d || "Sin descripción cargada en el catálogo."}</span>
              </span>
            </button>); })}</div>}
        <p className="text-[11.5px] text-slate-500">{L.length} de {ALL.length}</p>
      </div>
    </Modal>);
}
/* la elegida: cinta grande, tipo y su descripción completa */
function DecorCard({ d, onChange }: { d: Decor | null; onChange: () => void }) {
  if (!d) return (
    <button type="button" onClick={onChange} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-7 text-center transition hover:border-brand-500 hover:bg-brand-500/5 dark:border-slate-700">
      <span className="grid size-11 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300"><Medal className="size-5" /></span>
      <b className="text-sm">Elegir condecoración, medalla o franja</b><span className="text-xs text-slate-500">Abre el catálogo con todas y su descripción</span>
    </button>);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-4 bg-[radial-gradient(ellipse_at_left,#1e293b,#0b1120)] px-4 py-3.5 text-white">
        <Ribbon d={d} className="!h-[38px] !w-[132px] shrink-0" />
        <div className="min-w-0 flex-1"><b className="block text-[15px] leading-snug">{d.t}</b>
          <div className="mt-1 flex flex-wrap gap-1">{[TABL[d.tab], d.c, d.g].filter(Boolean).map(x => <span key={x} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-200">{x}</span>)}</div></div>
        <Button size="sm" variant="outline" icon={<ArrowLeftRight />} onClick={onChange} className="shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10">Cambiar</Button>
      </div>
      <div className="grid gap-3 p-4 text-[13px] sm:grid-cols-2">
        <div><p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Sparkles className="size-3.5" />Qué reconoce</p><p className="leading-relaxed">{d.d || "Sin descripción cargada en el catálogo."}</p></div>
        <div><p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Target className="size-3.5" />Cómo se gana</p><p className="leading-relaxed">{d.h || "Sin requisito cargado en el catálogo."}</p></div>
      </div>
    </div>);
}

export function EntregaTab({ onDone }: { onDone: () => void }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), [H, setH] = useJSON<Ent[]>(ENT_KEY, []);
  const [k, setK] = useState(""), [pk, setPk] = useState(false), [ags, setAgs] = useState<string[]>([]), [f, setF] = useState(hoyISO()), [m, setM] = useState(""), [seed, setSeed] = useState(() => uid());
  const d = k ? decorOf(k) || null : null;
  const L = useMemo(() => (d ? entregaLines(d, agsOf(ags), { dep: DEPTS[DEPT.id].short, motivo: m, seed }) : []), [d, ags, m, seed]);
  const save = async () => {
    if (!d) { toast("Elegí la condecoración", "err"); return; }
    if (!ags.length) { toast("Elegí al menos un agente", "err"); return; }
    const P = allProfiles(), ya = ags.filter(n => ((P[n]?.cond || []) as unknown as Award[]).some(a => a && a.k === d.k));
    if (ya.length && d.c !== "Acumulativa" && !(await confirm(`${ya.join(", ")} ya ${ya.length === 1 ? "tiene" : "tienen"} «${d.t}». ¿Entregarla igual?`))) return;
    const rows = ags.map(n => ({ n, r: findAgent(n)?.r || "", aid: uid() }));
    for (const x of rows) updateProf(x.n, p => { p.cond = [...((p.cond || []) as unknown as Award[]), { id: x.aid, t: d.t, k: d.k, f, m: m.trim(), by: me.n }] as unknown as string[]; });
    setH([{ id: uid(), k: d.k, t: d.t, ags: rows, f, m: m.trim() || undefined, by: me.n, byR: me.r, at: Date.now() }, ...H].slice(0, 500));
    toast(`«${d.t}» entregada a ${rows.length === 1 ? rows[0].n : `${rows.length} agentes`}`); setAgs([]); setM(""); setSeed(uid()); onDone();
  };
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader icon={<AwardI />} title="Condecoración" desc="La misma para todos los agentes de esta entrega." />
          <CardBody>
            <DecorCard d={d} onChange={() => setPk(true)} />
            <DecorPicker open={pk} onClose={() => setPk(false)} value={k} onPick={setK} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Users />} title="A quién" desc="Uno o varios agentes del roster. El rol se arma para cada uno." />
          <CardBody>
            <AgentPicker value={ags} multiple onChange={n => !ags.includes(n) && setAgs([...ags, n])} empty="No hay más agentes" />
            {!!ags.length && <AgChips list={ags} onRemove={n => setAgs(ags.filter(x => x !== n))} />}
            <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Field label="Fecha"><Input type="date" value={f} onChange={e => setF(e.target.value)} /></Field>
              <Field label="Motivo" hint="(opcional, va en el mensaje)"><Input value={m} onChange={e => setM(e.target.value)} maxLength={140} placeholder="Ej: el rescate de rehenes en el Pacific Bank" /></Field>
            </div>
            <div className="flex justify-end"><Button icon={<AwardI />} onClick={() => void save()}>Registrar entrega</Button></div>
          </CardBody>
        </Card>
      </div>
      <Card className="xl:sticky xl:top-4">
        <CardHeader icon={<Medal />} title="Rol de la entrega" desc="/me y /do para la ceremonia, en orden. Cada línea, de 290 caracteres o menos." />
        <CardBody><RolLines L={L} onReset={L.length ? () => setSeed(uid()) : undefined} /></CardBody>
      </Card>
    </div>);
}

export function HistorialTab() {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), [H, setH] = useJSON<Ent[]>(ENT_KEY, []), [q, setQ] = useState(""), [open, setOpen] = useState("");
  const canDel = (e: Ent) => e.by === me.n || !!ME_ROLES.six || !!ME_ROLES.admin || !!ME_ROLES.dadm || myLevel(me.r) >= 8;
  const qn = norm(q.trim()), L = H.filter(e => !qn || norm(`${e.t} ${e.by} ${e.m || ""} ${e.ags.map(a => a.n).join(" ")}`).includes(qn));
  const anular = async (e: Ent) => {
    if (!(await confirm(`¿Anular la entrega de «${e.t}»? Se le quita a ${e.ags.length === 1 ? e.ags[0].n : `los ${e.ags.length} agentes`} y sale del historial.`, { danger: true }))) return;
    for (const a of e.ags) updateProf(a.n, p => { p.cond = ((p.cond || []) as unknown as Award[]).filter(x => x.id !== a.aid) as unknown as string[]; });
    setH(H.filter(x => x.id !== e.id)); toast("Entrega anulada");
  };
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="h-9 pl-9 text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por condecoración, agente o quién la entregó…" /></div>
        <span className="text-xs text-slate-500">{H.length} {H.length === 1 ? "entrega" : "entregas"} en el {DEPTS[DEPT.id].short}</span>
      </Card>
      {!L.length ? <Card><Empty icon={<History />} title={H.length ? "Nada coincide" : "Todavía no hay entregas"} desc={H.length ? "Probá con otra palabra." : "Las entregas que se registren desde «Entrega» quedan acá."} /></Card>
        : <div className="space-y-2.5">{L.map(e => { const d = decorOf(e.k), on = open === e.id; return (
          <Card key={e.id} className="p-3.5">
            <div className="flex flex-wrap items-center gap-3">
              {d ? <Ribbon d={d} className="shrink-0" /> : <AwardI className="size-6 text-slate-400" />}
              <div className="min-w-0 flex-1"><b className="block truncate text-[14px]">{e.t}</b>
                <p className="truncate text-xs text-slate-500">{dmy(e.f)} · entregada por {e.byR ? `${rankES(e.byR)} ` : ""}{e.by}{e.m ? ` · ${e.m}` : ""}</p></div>
              {d && <Button size="sm" variant="ghost" onClick={() => setOpen(on ? "" : e.id)}>{on ? "Ocultar rol" : "Ver /me y /do"}</Button>}
              {canDel(e) && <button aria-label="Anular entrega" title="Anular (se la quita a los agentes)" onClick={() => void anular(e)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">{e.ags.map(a => <span key={a.aid} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold dark:bg-slate-800">{a.r ? <span className="mr-1 text-[10.5px] font-bold text-brand-600 dark:text-brand-300">{rankES(a.r)}</span> : null}{a.n}</span>)}</div>
            {on && d && <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800"><RolLines L={entregaLines(d, agsOf(e.ags.map(a => a.n)), { dep: DEPTS[DEPT.id].short, motivo: e.m, seed: e.id })} /></div>}
          </Card>); })}</div>}
    </div>);
}
