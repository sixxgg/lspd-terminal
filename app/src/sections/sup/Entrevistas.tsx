/* Entrevistas de seguimiento a los agentes por debajo de Sargento II.
   Panel con el avance general, tarjetas por agente agrupadas por rango y una ficha (ventana) para cargar la entrevista:
   estado, fecha, rama, divisiones (a las que pertenece y a las que quiere entrar), respuestas, notas y el texto para Discord o web. */
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Building2, Check, CircleDashed, ChevronDown, Clock, Compass, HelpCircle, MessagesSquare, Search, Shield, StickyNote, Target, UserRoundCheck, X } from "lucide-react";
import { Button, Card, Empty, Input, Textarea, SearchInput } from "@/components/ui";
import { Modal } from "@/components/modal";
import { Revisar } from "@/components/revisar";
import { rosterDivs } from "@/lib/units";
import { Avatar, RankBadge } from "@/components/agents";
import { CopyMenu, useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { ALL_DIVS, divAb, dmyToISO, fmtDate, genderOf, getRoster, hoyISO, isoToDMY, lvl, maskDMY, norm, rankES, type Agent } from "@/lib/domain";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const ENT_Q: [string, string?][] = [["¿Cómo se siente dentro del Departamento?"],
  ["¿Tiene algún problema o conflicto con algún miembro del Departamento? De ser así, ¿podría indicarnos con quién y por qué motivo?"],
  ["Una vez superada la etapa de oficial, la carrera se divide en dos ramas: Sargentos y Detectives. ¿En cuál de ellas le gustaría desarrollarse y por qué?"],
  ["¿Pertenece actualmente a alguna división? En caso contrario, ¿a cuál o cuáles le gustaría incorporarse?"],
  ["¿Mantiene alguna relación sentimental, ya sea dentro o fuera del Departamento?", "Recordarle que toda relación sentimental entre miembros del Departamento debe comunicarse a la PSB."],
  ["¿Hay algo más que quiera comentarnos o aportar a esta entrevista?"], ["¿Cuáles son sus aspiraciones dentro del Departamento?"]];
/* div = a las que quiere entrar · act = a las que ya pertenece (además de las que salen del roster de cada división) · res = respuesta corta a cada pregunta */
type Ent = { st?: string; rama?: string; f?: string; div?: string[]; act?: string[]; res?: Record<string, string>; nota?: string; por?: string; t?: number };
const ST = { si: { l: "Realizada", c: "#10b981", I: Check }, pen: { l: "Pendiente", c: "#f59e0b", I: Clock }, no: { l: "No realizada", c: "#ef4444", I: X } } as const;
const RAMA = { sgt: { l: "Sargentos", c: "#ec4899", I: Shield, d: "Supervisión y mando de patrulla" }, det: { l: "Detectives", c: "#a855f7", I: Compass, d: "Investigación criminal" }, ind: { l: "Indeciso", c: "#06b6d4", I: HelpCircle, d: "Todavía no lo tiene claro" } } as const;
type StK = keyof typeof ST; type RaK = keyof typeof RAMA;
const stOf = (e: Ent) => (e.st && e.st in ST ? ST[e.st as StK] : null), raOf = (e: Ent) => (e.rama && e.rama in RAMA ? RAMA[e.rama as RaK] : null);
const raL = (k: string | undefined, n: string) => (k === "ind" && genderOf(n) === "f" ? "Indecisa" : k && k in RAMA ? RAMA[k as RaK].l : "");
const ordDiv = (s: Set<string>) => ALL_DIVS.filter(x => s.has(x));
const actOf = (n: string, e: Ent) => ordDiv(new Set([...rosterDivs(n), ...(e.act || [])]));

/* texto para Discord: prolijo, con las divisiones a las que pertenece y a las que quiere entrar */
function entText(a: Agent, e: Ent) {
  const st = stOf(e)?.l, act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d));
  const ico = { si: "✅", no: "❌", pen: "⏳" }[e.st || ""] || "▫️";
  const res = ENT_Q.map(([q], i) => [q, (e.res?.[i] || "").trim()] as const).filter(([, r]) => r);
  const nota = (e.nota || "").trim();
  return [
    `## 🗣️ ENTREVISTA — ${rankES(a.r)} ${a.n}${a.p ? ` (#${a.p})` : ""}`,
    `**Estado:** ${ico} ${st || "Sin marcar"}${e.f ? `  ·  **Fecha:** \`${isoToDMY(e.f)}\`` : ""}`,
    `**Rama de interés:** ${raL(e.rama, a.n)}`, "",
    "### 🏢 Divisiones a las que pertenece", act.length ? act.map(d => `> • ${d}`).join("\n") : "> Ninguna", "",
    "### 🎯 Divisiones a las que quiere pertenecer", dv.length ? dv.map(d => `> • ${d}`).join("\n") : "> Ninguna por ahora",
    ...(res.length ? ["", "### 📝 Respuestas", ...res.flatMap(([q, r]) => [`**${q}**`, `> ${r.replace(/\n/g, "\n> ")}`])] : []),
    ...(nota ? ["", "### 🗒️ Notas", nota.split("\n").map(l => "> " + l).join("\n")] : []),
    "", `-# Entrevista registrada por ${e.por || "—"}${e.t ? ` · ${fmtDate(e.t)}` : ""}`,
  ].join("\n");
}

const DivTag = ({ d, want }: { d: string; want?: boolean }) => { const [ab, col] = divAb(d); return (
  <span title={(want ? "Quiere entrar: " : "Pertenece: ") + d} className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold", want ? "border border-dashed" : "text-white")}
    style={want ? { borderColor: col + "aa", color: col } : { background: col }}>{want && "→"}{ab}</span>); };
function DivChips({ list, on, lock, onToggle, col }: { list: string[]; on: string[]; lock?: string[]; onToggle: (d: string) => void; col: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">{list.map(d => { const [ab, c] = divAb(d), sel = on.includes(d), lk = lock?.includes(d); return (
      <button key={d} type="button" disabled={lk} onClick={() => onToggle(d)} title={lk ? `${d} · sale del roster de la división` : d}
        className={cn("group inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[11.5px] font-semibold transition", sel ? "shadow-sm" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100", lk && "cursor-default")}
        style={sel ? { borderColor: col + "80", background: col + "18", color: col } : undefined}>
        <span className="rounded-full px-1.5 py-px text-[9.5px] font-black text-white" style={{ background: c }}>{ab}</span><span className="max-w-[12rem] truncate">{d}</span>
        {lk ? <span className="rounded-full bg-black/10 px-1.5 text-[9px] font-bold uppercase tracking-wide dark:bg-white/10">roster</span> : sel && <Check className="size-3" />}
      </button>); })}</div>);
}
/* anillo de progreso */
function Ring({ v, c, size = 92, w = 9, children }: { v: number; c: string; size?: number; w?: number; children?: ReactNode }) {
  const r = (size - w) / 2, L = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} className="stroke-slate-200 dark:stroke-slate-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} stroke={c} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - Math.min(1, v))} style={{ transition: "stroke-dashoffset .6s" }} /></svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>);
}
const Lbl = ({ I, children }: { I: typeof Check; children: ReactNode }) => <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500"><I className="size-3.5" />{children}</p>;

export function Entrevistas() {
  const me = useMe(), copy = useCopy();
  const [ENT, setENT] = useJSON<Record<string, Ent>>("lspdt.entrev", {});
  const [f, setF] = useState(""), [rf, setRf] = useState(""), [q, setQ] = useState(""), [open, setOpen] = useState<string | null>(null), [qOpen, setQOpen] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const A = useMemo(() => getRoster().filter(a => lvl(a.r) > 0 && lvl(a.r) < 7).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n)), [ENT]); // eslint-disable-line
  const g = (n: string) => ENT[n] || {};
  const set = (n: string, x: Partial<Ent>) => {
    /* siempre sobre lo último guardado (las respuestas se guardan con demora y no deben pisar otros cambios) */
    const cur = LS.json<Record<string, Ent>>("lspdt.entrev", {}), e = { ...cur[n], ...x, por: me.n, t: Date.now() }, all = { ...cur, [n]: e };
    if (!e.st && !e.rama && !e.f && !(e.div || []).length && !(e.act || []).length && !(e.nota || "").trim() && !Object.values(e.res || {}).some(v => v.trim())) delete all[n];
    setENT(all);
  };
  const cnt = (fn: (e: Ent) => boolean) => A.filter(a => fn(g(a.n))).length;
  const s = norm(q.trim());
  const L = A.filter(a => { const e = g(a.n); return (!s || norm(a.n).includes(s) || String(a.p || "").includes(s)) && (!f || (f === "vac" ? !e.st : e.st === f)) && (!rf || (rf === "-" ? !e.rama : e.rama === rf)); });
  const ranks = [...new Set(L.map(a => a.r))];
  const done = cnt(e => e.st === "si"), pct = A.length ? done / A.length : 0;
  const rk = (["sgt", "det", "ind"] as RaK[]).map(k => [k, cnt(e => e.rama === k)] as const), sinR = cnt(e => !e.rama), rTot = Math.max(1, A.length);
  const tile = (k: string, l: string, n: number, c: string, I: typeof Check) => (
    <button key={k} onClick={() => setF(f === k ? "" : k)} className={cn("group flex items-center gap-3 rounded-2xl border p-3 text-left transition", f === k ? "shadow-lg" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}
      style={f === k ? { borderColor: c, background: c + "14", boxShadow: `0 10px 30px -14px ${c}` } : undefined}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: c + "1f", color: c }}><I className="size-5" /></span>
      <span className="min-w-0"><b className="block text-2xl font-black leading-none tabular-nums" style={{ color: c }}>{n}</b><span className="mt-1 block truncate text-[11.5px] font-medium text-slate-500">{l}</span></span></button>);
  const cur = open ? A.find(a => a.n === open) : null;
  return (
    <div className="space-y-4">
      {/* panel general */}
      <Card className="relative overflow-hidden p-4">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand-500/10 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-5 xl:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex items-center gap-4">
            <Ring v={pct} c="#10b981"><span><b className="block text-xl font-black tabular-nums">{Math.round(pct * 100)}%</b><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">hechas</span></span></Ring>
            <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand-600 dark:text-brand-300">Seguimiento</p><p className="text-lg font-bold leading-tight">{done} de {A.length} entrevistados</p>
              <p className="mt-0.5 text-xs text-slate-500">Agentes por debajo de Sargento II · se guarda solo</p>
              <Button size="sm" variant="outline" icon={<MessagesSquare />} className="mt-2" onClick={() => setQOpen(true)}>Preguntas ({ENT_Q.length})</Button></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tile("si", "Realizadas", done, ST.si.c, Check)}{tile("pen", "Pendientes", cnt(e => e.st === "pen"), ST.pen.c, Clock)}
            {tile("no", "No realizadas", cnt(e => e.st === "no"), ST.no.c, X)}{tile("vac", "Sin marcar", cnt(e => !e.st), "#94a3b8", CircleDashed)}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">Rama de interés</p>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">{rk.map(([k, n]) => n > 0 && <div key={k} style={{ width: `${(n * 100) / rTot}%`, background: RAMA[k].c }} title={`${RAMA[k].l}: ${n}`} />)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{rk.map(([k, n]) => { const R = RAMA[k], on = rf === k; return (
              <button key={k} onClick={() => setRf(on ? "" : k)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition", on ? "text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
                style={on ? { background: R.c, borderColor: R.c } : undefined}><R.I className="size-3.5" style={on ? undefined : { color: R.c }} />{R.l}<b className="tabular-nums">{n}</b></button>); })}
              <button onClick={() => setRf(rf === "-" ? "" : "-")} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold", rf === "-" ? "border-slate-500 bg-slate-500 text-white" : "border-slate-200 text-slate-500 dark:border-slate-700")}>Sin rama <b className="tabular-nums">{sinR}</b></button></div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput className="min-w-[14rem] flex-1 sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar agente o placa…" />
        {(f || rf) && <Button size="sm" variant="ghost" icon={<X />} onClick={() => { setF(""); setRf(""); }}>Quitar filtros</Button>}
        <span className="ml-auto text-xs text-slate-500">{L.length} de {A.length} agentes</span>
      </div>

      {!L.length ? <Card><Empty icon={<Search />} title="Nadie coincide con el filtro" /></Card> : ranks.map(r => {
        const gl = L.filter(a => a.r === r), isOpen = !!s || !closed.has(r), gd = gl.filter(x => g(x.n).st === "si").length;
        return (
          <section key={r}>
            <button onClick={() => setClosed(c => { const n = new Set(c); n.has(r) ? n.delete(r) : n.add(r); return n; })} className="mb-2 flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left">
              <RankBadge r={r} /><span className="text-xs text-slate-500">{gl.length} {gl.length === 1 ? "agente" : "agentes"}</span>
              <span className="h-1.5 max-w-[14rem] flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(gd * 100) / gl.length}%` }} /></span>
              <span className="text-[11px] font-semibold tabular-nums text-slate-500">{gd}/{gl.length}</span>
              <ChevronDown className={cn("ml-auto size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{gl.map(a => {
              const e = g(a.n), S = stOf(e), R = raOf(e), act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d)), c = S?.c || "#94a3b8";
              return (
                <div key={a.n} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-[rgb(var(--card))]"
                  style={{ boxShadow: S ? `inset 0 1px 0 ${c}55` : undefined }}>
                  <div className="absolute inset-x-0 top-0 h-16 opacity-80" style={{ background: `linear-gradient(180deg, ${c}22, transparent)` }} aria-hidden />
                  <button onClick={() => setOpen(a.n)} className="relative flex items-center gap-3 p-3 pb-2 text-left">
                    <span className="rounded-full p-[2px]" style={{ background: c }}><span className="block rounded-full bg-white p-[2px] dark:bg-[rgb(var(--card))]"><Avatar n={a.n} size={40} /></span></span>
                    <span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{a.n}</b><span className="block truncate text-[11px] text-slate-500">{a.p ? `#${a.p}` : "Sin placa"}{e.f ? ` · ${isoToDMY(e.f)}` : ""}</span></span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: c + "1f", color: c }}>{S ? <S.I className="size-3" /> : <CircleDashed className="size-3" />}{S?.l || "Sin marcar"}</span>
                  </button>
                  <div className="relative flex min-h-[1.75rem] flex-wrap items-center gap-1 px-3">
                    {R && <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold text-white" style={{ background: R.c }}><R.I className="size-3" />{raL(e.rama, a.n)}</span>}
                    {act.map(d => <DivTag key={d} d={d} />)}{dv.map(d => <DivTag key={d} d={d} want />)}
                    {!R && !act.length && !dv.length && <span className="text-[11px] text-slate-400">Sin rama ni divisiones</span>}
                    {(e.nota || "").trim() && <StickyNote className="size-3.5 text-amber-500" />}
                  </div>
                  <div className="relative mt-auto flex items-center gap-1 border-t border-slate-100 px-2 py-1.5 dark:border-slate-800">
                    {(Object.keys(ST) as StK[]).map(k => { const X = ST[k], on = e.st === k; return (
                      <button key={k} aria-label={X.l} title={X.l} onClick={() => set(a.n, { st: on ? "" : k, ...(k === "si" && !on && !e.f ? { f: hoyISO() } : {}) })}
                        className={cn("grid size-7 place-items-center rounded-lg transition", on ? "text-white" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")} style={on ? { background: X.c } : undefined}><X.I className="size-3.5" /></button>); })}
                    <span className="flex-1" />
                    <button onClick={() => void copy(entText(a, e))} title="Copiar para Discord" className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800">Copiar</button>
                    <button onClick={() => setOpen(a.n)} className="rounded-lg bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-700 transition hover:bg-brand-500/20 dark:text-brand-300">Abrir ficha</button>
                  </div>
                </div>); })}</div>}
          </section>);
      })}

      {cur && <EntModal a={cur} e={g(cur.n)} set={x => set(cur.n, x)} onClose={() => setOpen(null)} />}
      <Modal open={qOpen} onClose={() => setQOpen(false)} title="Preguntas de la entrevista" icon={<MessagesSquare />} size="lg"
        footer={<><Button variant="ghost" onClick={() => setQOpen(false)}>Cerrar</Button><CopyMenu size="md" variant="primary" text={ENT_Q.map(([x, n], i) => `**${i + 1}.** ${x}${n ? `\n> ⚠️ ${n}` : ""}`).join("\n")} web={ENT_Q.map(([x, n], i) => `${i + 1}. ${x}${n ? `\n   (${n})` : ""}`).join("\n")} up /></>}>
        <ol className="space-y-2">{ENT_Q.map(([x, n], i) => (
          <li key={x} className="flex gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-black text-white">{i + 1}</span>
            <div className="text-[13.5px] leading-snug">{x}{n && <p className="mt-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">⚠ {n}</p>}</div>
          </li>))}</ol>
      </Modal>
    </div>
  );
}

/* ficha de la entrevista de un agente */
function EntModal({ a, e, set, onClose }: { a: Agent; e: Ent; set: (x: Partial<Ent>) => void; onClose: () => void }) {
  const { toast } = useFeedback(), tmr = useRef<Record<string, number>>({});
  const later = (k: string, fn: () => void) => { clearTimeout(tmr.current[k]); tmr.current[k] = window.setTimeout(fn, 500); };
  const [pv, setPv] = useState(false);
  const act = actOf(a.n, e), auto = rosterDivs(a.n), dv = e.div || [], txt = entText(a, e), S = stOf(e);
  const answered = ENT_Q.filter((_, i) => (e.res?.[i] || "").trim()).length;
  return (
    <Modal open onClose={onClose} size="xl" icon={<UserRoundCheck />} title={<span className="flex items-center gap-2">Entrevista · {a.n}{S && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: S.c + "22", color: S.c }}>{S.l}</span>}</span>}
      desc={<span className="flex flex-wrap items-center gap-1.5"><RankBadge r={a.r} />{a.p && <span className="font-mono text-xs">#{a.p}</span>}{e.t && <span className="text-xs">· última actualización {e.por}, {fmtDate(e.t)}</span>}</span>}
      footer={<><Revisar text={txt} err={[!e.st && "estado de la entrevista", e.st === "si" && !e.f && "fecha"].filter(Boolean) as string[]} pen={dv.length ? undefined : ["divisiones a las que quiere entrar"]} className="mr-auto min-w-0 max-w-full flex-1" />
        <Button variant="ghost" onClick={onClose}>Cerrar</Button><CopyMenu size="md" variant="primary" text={txt} up /></>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <div><Lbl I={Check}>Estado</Lbl>
            <div className="grid grid-cols-3 gap-2">{(Object.keys(ST) as StK[]).map(k => { const X = ST[k], on = e.st === k; return (
              <button key={k} onClick={() => set({ st: on ? "" : k, ...(k === "si" && !on && !e.f ? { f: hoyISO() } : {}) })} className={cn("flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-[12px] font-bold transition", on ? "" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800")}
                style={on ? { borderColor: X.c, background: X.c + "18", color: X.c } : undefined}><X.I className="size-5" />{X.l}</button>); })}</div>
            <div className="mt-2 flex items-center gap-2"><span className="text-xs text-slate-500">Fecha</span>
              <Input key={e.f || "-"} defaultValue={isoToDMY(e.f)} placeholder="dd/mm/aaaa" inputMode="numeric" className="h-9 w-36 text-sm"
                onChange={ev => { ev.target.value = maskDMY(ev.target.value); }} onKeyDown={ev => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                onBlur={ev => { const v = ev.target.value.trim(); if (!v) { if (e.f) set({ f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · escribila como dd/mm/aaaa", "err"); return; } if (iso !== e.f) set({ f: iso }); }} />
              <Button size="sm" variant="ghost" onClick={() => set({ f: hoyISO() })}>Hoy</Button></div>
          </div>
          <div><Lbl I={Compass}>Rama de interés</Lbl>
            <div className="grid grid-cols-3 gap-2">{(Object.keys(RAMA) as RaK[]).map(k => { const R = RAMA[k], on = e.rama === k; return (
              <button key={k} onClick={() => set({ rama: on ? "" : k })} className={cn("relative overflow-hidden rounded-xl border-2 p-2.5 text-left transition", on ? "text-white" : "border-slate-200 hover:border-slate-300 dark:border-slate-800")}
                style={on ? { borderColor: R.c, background: `linear-gradient(135deg, ${R.c}, ${R.c}bb)` } : undefined}>
                <R.I className="size-5" style={on ? undefined : { color: R.c }} /><b className="mt-1 block text-[13px]">{raL(k, a.n)}</b><span className={cn("block text-[10.5px] leading-tight", on ? "text-white/80" : "text-slate-500")}>{R.d}</span></button>); })}</div>
          </div>
          <div><Lbl I={Building2}>Divisiones a las que pertenece</Lbl>
            <DivChips list={ALL_DIVS} on={act} lock={auto} col="#10b981" onToggle={d => { const x = new Set(e.act || []); x.has(d) ? x.delete(d) : x.add(d); set({ act: ordDiv(x) }); }} /></div>
          <div><Lbl I={Target}>Divisiones a las que quiere pertenecer</Lbl>
            <DivChips list={ALL_DIVS.filter(d => !act.includes(d))} on={dv} col="rgb(var(--b-500))" onToggle={d => { const x = new Set(dv); x.has(d) ? x.delete(d) : x.add(d); set({ div: ordDiv(x) }); }} /></div>
        </div>
        <div className="space-y-5">
          <div><Lbl I={MessagesSquare}>Respuestas <span className="ml-auto font-semibold normal-case tracking-normal text-slate-400">{answered}/{ENT_Q.length}</span></Lbl>
            <div className="space-y-2">{ENT_Q.map(([x, n], i) => { const v = e.res?.[i] || ""; return (
              <div key={i} className={cn("rounded-xl border p-2.5 transition focus-within:border-brand-500/60", v.trim() ? "border-emerald-500/30 bg-emerald-500/[.03]" : "border-slate-200 dark:border-slate-800")}>
                <p className="mb-1.5 flex gap-2 text-[12.5px] font-semibold leading-snug"><span className={cn("grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-black", v.trim() ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>{v.trim() ? <Check className="size-3" /> : i + 1}</span>{x}</p>
                {n && <p className="mb-1.5 ml-7 text-[11px] text-amber-600 dark:text-amber-300">⚠ {n}</p>}
                <textarea rows={1} defaultValue={v} placeholder="Respuesta…" onChange={ev => { const t = ev.target.value; ev.target.style.height = "auto"; ev.target.style.height = ev.target.scrollHeight + "px"; later("r" + i, () => set({ res: { ...(LS.json<Record<string, Ent>>("lspdt.entrev", {})[a.n]?.res || {}), [i]: t } })); }}
                  ref={el => { if (el && !el.dataset.h) { el.dataset.h = "1"; el.style.height = el.scrollHeight + "px"; } }}
                  className="ml-7 block w-[calc(100%-1.75rem)] resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-slate-400" />
              </div>); })}</div></div>
          <div><Lbl I={StickyNote}>Notas</Lbl>
            <Textarea rows={3} defaultValue={e.nota || ""} placeholder="Observaciones, compromisos, lo que haga falta…" onChange={ev => { const v = ev.target.value; later("n", () => set({ nota: v })); }} /></div>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => setPv(!pv)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-semibold"><MessagesSquare className="size-4 text-[#5865F2]" />Vista previa para Discord<ChevronDown className={cn("ml-auto size-4 text-slate-400 transition", pv && "rotate-180")} /></button>
            {pv && <pre className="scrollbar-thin max-h-64 overflow-auto whitespace-pre-wrap bg-slate-950 p-3 font-mono text-[11.5px] leading-relaxed text-slate-200">{txt}</pre>}
          </div>
        </div>
      </div>
    </Modal>);
}
