/* Entrevistas de seguimiento a los agentes por debajo de Sargento II.
   Arriba el avance general; abajo una lista ordenada por rango. Cada agente tiene una ficha donde se carga la entrevista
   (estado, fecha, rama, divisiones, respuestas y notas) y se GUARDA; recién guardada se puede copiar (Discord o web).
   Todo va a la base: las entrevistas en lspdt.entrev y las preguntas en lspdt.entrevQ (las edita Sargento I o superior). */
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Building2, Check, ChevronDown, ChevronRight, CircleDashed, Clock, Compass, HelpCircle, MessagesSquare, Pencil, Plus, RotateCcw, Save, Search, Shield, StickyNote, Target, Trash2, UserRoundCheck, X } from "lucide-react";
import { Button, Card, Empty, Input, Textarea, SearchInput } from "@/components/ui";
import { Modal } from "@/components/modal";
import { Revisar } from "@/components/revisar";
import { rosterDivs } from "@/lib/units";
import { Avatar, RankBadge } from "@/components/agents";
import { CopyMenu } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { ALL_DIVS, RANK_COLOR, findAgent, insigniaUrl, divAb, dmyToISO, fmtDate, genderOf, getRoster, hoyISO, isoToDMY, lvl, maskDMY, norm, rankES, uid, type Agent } from "@/lib/domain";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { AgentMenu } from "@/components/sgtpick";
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

/* nd = no quiere entrar a ninguna (ok: está cómodo donde está · no: no quiere más divisiones) · div = a las que quiere entrar · act = a las que ya pertenece (además de las del roster de cada división) · res = respuestas por pregunta */
type Ent = { st?: string; rama?: string; f?: string; div?: string[]; nd?: string; act?: string[]; res?: Record<string, string>; nota?: string; ent?: string; por?: string; t?: number };
const ST = { si: { l: "Realizada", c: "#10b981", I: Check }, pen: { l: "Pendiente", c: "#f59e0b", I: Clock }, no: { l: "No realizada", c: "#ef4444", I: X } } as const;
const RAMA = { sgt: { l: "Sargentos", c: "#ec4899", I: Shield, d: "Supervisión y mando de patrulla" }, det: { l: "Detectives", c: "#a855f7", I: Compass, d: "Investigación criminal" }, ind: { l: "Indeciso", c: "#06b6d4", I: HelpCircle, d: "Todavía no lo tiene claro" } } as const;
type StK = keyof typeof ST; type RaK = keyof typeof RAMA;
const stOf = (e: Ent) => (e.st && e.st in ST ? ST[e.st as StK] : null), raOf = (e: Ent) => (e.rama && e.rama in RAMA ? RAMA[e.rama as RaK] : null);
const raL = (k: string | undefined, n: string) => (k === "ind" && genderOf(n) === "f" ? "Indecisa" : k && k in RAMA ? RAMA[k as RaK].l : "");
const ND = { ok: { l: "Está cómodo donde está", c: "#10b981", t: "Está cómodo donde está, no quiere cambiar de división" }, no: { l: "No quiere más divisiones", c: "#64748b", t: "No quiere pertenecer a más divisiones" } } as const;
const ndOf = (e: Ent) => (e.nd && e.nd in ND ? ND[e.nd as keyof typeof ND] : null);
const ordDiv = (s: Iterable<string>) => { const x = new Set(s); return ALL_DIVS.filter(d => x.has(d)); };
const actOf = (n: string, e: Ent) => ordDiv([...rosterDivs(n), ...(e.act || [])]);
const empty = (e: Ent) => !e.st && !e.rama && !e.f && !e.nd && !(e.div || []).length && !(e.act || []).length && !(e.nota || "").trim() && !Object.values(e.res || {}).some(v => v.trim());
const clean = (e: Ent): Ent => ({ st: e.st || "", rama: e.rama || "", f: e.f || "", nd: e.div?.length ? "" : e.nd || "", div: e.div || [], act: e.act || [], res: Object.fromEntries(Object.entries(resOf(e)).filter(([, v]) => v.trim())), nota: (e.nota || "").trim(), ent: e.ent || "" });

/* la pregunta de la rama y la de divisiones cambian según el rango y lo que ya tiene (si no se editaron) */
const famOf = (a: Agent) => { const r = rankES(a.r); return /sargento/i.test(r) ? "sgt" : /detective/i.test(r) ? "det" : "of"; };
const def = (id: string) => Q_DEF.find(x => x.id === id)?.q;
const qOf = (x: Q, a: Agent, e: Ent): string => {
  if (x.id === "rama" && x.q === def("rama")) { const f = famOf(a);
    return f === "sgt" ? "Ya está en la rama de Sargentos. ¿Quiere seguir creciendo en ella o le interesaría la rama de Detectives? ¿Por qué?"
      : f === "det" ? "Ya está en la rama de Detectives. ¿Quiere seguir en ella o le interesaría pasar a la rama de Sargentos? ¿Por qué?" : x.q; }
  if (x.id === "div" && x.q === def("div")) return actOf(a.n, e).length ? "¿Cómo se encuentra en sus divisiones actuales? ¿Le gustaría incorporarse a alguna otra?" : "No pertenece a ninguna división. ¿Le gustaría incorporarse a alguna? ¿A cuál o cuáles?";
  return x.q;
};
const lst = (L: string[]) => (L.length < 2 ? L.join("") : `${L.slice(0, -1).join(", ")} y ${L[L.length - 1]}`);
/* respuesta automática de la rama y de divisiones, armada con lo que se marcó en la ficha */
const autoOf = (id: string, a: Agent, e: Ent): string => {
  if (id === "rama") { const f = famOf(a), r = e.rama;
    if (r === "ind") return `Todavía no lo tiene claro; está ${genderOf(a.n) === "f" ? "indecisa" : "indeciso"}.`;
    if (r === "sgt") return f === "sgt" ? "Quiere seguir creciendo en la rama de Sargentos." : f === "det" ? "Le interesaría pasar a la rama de Sargentos." : "Le gustaría desarrollarse en la rama de Sargentos.";
    if (r === "det") return f === "det" ? "Quiere seguir en la rama de Detectives." : f === "sgt" ? "Le interesaría pasar a la rama de Detectives." : "Le gustaría desarrollarse en la rama de Detectives.";
    return ""; }
  if (id === "div") { const act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d));
    const p1 = act.length ? `Pertenece a ${lst(act)}.` : "No pertenece a ninguna división.";
    const p2 = dv.length ? `Le gustaría incorporarse a ${lst(dv)}.` : e.nd === "ok" ? "Está cómodo donde está y no busca cambiar de división." : e.nd === "no" ? "No quiere pertenecer a más divisiones." : "";
    return act.length || dv.length || e.nd ? [p1, p2].filter(Boolean).join(" ") : ""; }
  return "";
};
const AUTO = new Set(["rama", "div"]);
/* respuesta final: lo escrito o, en rama y divisiones, la automática */
const ansOf = (x: Q, a: Agent, e: Ent) => { const v = resOf(e)[x.id]; return v?.trim() ? v : AUTO.has(x.id) ? autoOf(x.id, a, e) : ""; };
/* marca de tiempo de Discord: cada uno la ve en su zona horaria (la fecha va a las 12:00 de Argentina para no correr de día) */
const dts = (t: number, f = "f") => `<t:${Math.floor(t / 1000)}:${f}>`;
const dayTs = (iso: string) => dts(new Date(`${iso}T12:00:00-03:00`).getTime(), "D");

/* texto para Discord (el formato web lo saca CopyMenu limpiando el markdown) */
function entText(a: Agent, e: Ent, QS: Q[]) {
  const act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d));
  const ico = { si: "✅", no: "❌", pen: "⏳" }[e.st || ""] || "▫️";
  const res = QS.map(x => [qOf(x, a, e), ansOf(x, a, e).trim()] as const).filter(([, r]) => r), nota = (e.nota || "").trim();
  return [
    `## 🗣️ ENTREVISTA — ${rankES(a.r)} ${a.n}${a.p ? ` (#${a.p})` : ""}`,
    `**Estado:** ${ico} ${stOf(e)?.l || "Sin marcar"}${e.f ? `  ·  **Fecha:** ${dayTs(e.f)}` : ""}`,
    `**Rama de interés:** ${raL(e.rama, a.n)}`,
    `**Entrevistó:** ${e.ent ? `${rankES(findAgent(e.ent)?.r || "")} ${e.ent}`.trim() : "—"}`, "",
    "### 🏢 Divisiones a las que pertenece", act.length ? act.map(d => `> • ${d}`).join("\n") : "> Ninguna", "",
    "### 🎯 Divisiones a las que quiere pertenecer", dv.length ? dv.map(d => `> • ${d}`).join("\n") : ndOf(e) ? `> ${ndOf(e)!.t}` : "> Ninguna por ahora",
    ...(res.length ? ["", "### 📝 Respuestas", ...res.flatMap(([q, r]) => [`**${q}**`, `> ${r.replace(/\n/g, "\n> ")}`])] : []),
    ...(nota ? ["", "### 🗒️ Notas", nota.split("\n").map(l => "> " + l).join("\n")] : []),
    "", `-# Entrevista registrada por ${e.por || "—"}${e.t ? ` · ${dts(e.t)}` : ""}`,
  ].join("\n");
}

/* color de la división, aclarado si es muy oscuro (ej: SWAT) para que se vea sobre el fondo */
const dcol = (d: string) => { const c = divAb(d)[1], n = parseInt(c.slice(1), 16), l = ((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11; return l < 60 ? "#94a3b8" : c; };
const DivTag = ({ d, want }: { d: string; want?: boolean }) => { const ab = divAb(d)[0], col = dcol(d); return (
  <span title={(want ? "Quiere entrar: " : "Pertenece: ") + d} className={cn("inline-flex h-[19px] items-center gap-1 rounded-full pl-1.5 pr-2 text-[10px] font-bold tracking-wide", want ? "border border-dashed" : "")}
    style={want ? { borderColor: col + "99", color: col } : { background: col + "24", color: "rgb(var(--n-700))", boxShadow: `inset 0 0 0 1px ${col}55` }}>
    {want ? <span aria-hidden>→</span> : <i className="size-1.5 rounded-full" style={{ background: col }} />}<span className="dark:text-slate-100">{ab}</span></span>); };
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
        {!L.length ? <Empty icon={<Search />} title="Nadie coincide con el filtro" /> : ranks.map(r => {
          const gl = L.filter(a => a.r === r), isOpen = !!s || !closed.has(r), gd = gl.filter(x => g(x.n).st === "si").length, rc = RANK_COLOR[r] || "#94a3b8", ins = insigniaUrl(r);
          return (
            <section key={r} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
              <button onClick={() => setClosed(c => { const n = new Set(c); if (n.has(r)) n.delete(r); else n.add(r); return n; })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:brightness-110"
                style={{ background: `linear-gradient(90deg, ${rc}26, ${rc}08 55%, transparent)` }}>
                <span className="grid w-7 place-items-center">{ins ? <img src={ins} alt="" className="h-5 w-auto drop-shadow" /> : <Shield className="size-5" style={{ color: rc }} />}</span>
                <span className="min-w-0"><b className="block text-[13.5px] font-bold" style={{ color: rc }}>{rankES(r)}</b><span className="block text-[11px] text-slate-500">{gl.length} {gl.length === 1 ? "agente" : "agentes"} · {gd} {gd === 1 ? "entrevistado" : "entrevistados"}</span></span>
                <span className="ml-auto hidden h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 sm:block dark:bg-slate-800"><span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(gd * 100) / gl.length}%` }} /></span>
                <span className="w-12 text-right text-[12px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{Math.round((gd * 100) / gl.length)}%</span>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && <ul className="divide-y divide-slate-100 dark:divide-slate-800/70">{gl.map(a => {
                const e = g(a.n), S = stOf(e), R = raOf(e), act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d)), nd = !dv.length ? ndOf(e) : null;
                return (
                  <li key={a.n} role="button" tabIndex={0} onClick={() => setOpen(a.n)} onKeyDown={ev => ev.key === "Enter" && setOpen(a.n)}
                    className="group grid cursor-pointer items-center gap-x-4 gap-y-2 px-4 py-2.5 transition hover:bg-brand-500/[.045] focus-visible:bg-brand-500/[.07] focus-visible:outline-none md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_auto]">
                    {/* agente */}
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="relative shrink-0 rounded-full p-[2px]" style={{ background: S?.c || "rgb(var(--n-300) / .5)" }}><span className="block rounded-full bg-white p-[1.5px] dark:bg-[rgb(var(--card))]"><Avatar n={a.n} size={34} /></span>
                        {S && <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-white text-white dark:border-[rgb(var(--card))]" style={{ background: S.c }}><S.I className="size-2.5" strokeWidth={3} /></span>}</span>
                      <span className="min-w-0"><b className="block text-[13.5px] leading-tight group-hover:text-brand-700 dark:group-hover:text-brand-300">{a.n}</b>
                        <span className="block text-[11px] text-slate-500">{a.p ? `#${a.p}` : "Sin placa"}{e.f ? ` · ${isoToDMY(e.f)}` : ""}</span>
                        {(e.ent || e.t) && <span className="block text-[11px] leading-tight text-slate-500">{e.ent ? "Entrevistó" : "Cargó"} <b className="font-semibold text-slate-700 dark:text-slate-300">{e.ent || e.por}</b></span>}</span>
                    </span>
                    {/* divisiones: las que tiene y a las que quiere entrar */}
                    <span className="grid min-w-0 gap-1">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="w-[3.6rem] shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Pertenece</span>
                        <span className="flex min-w-0 flex-wrap gap-1">{act.length ? <>{act.slice(0, 7).map(d => <DivTag key={d} d={d} />)}{act.length > 7 && <span title={act.slice(7).join(", ")} className="text-[10px] font-bold text-slate-400">+{act.length - 7}</span>}</> : <span className="text-[11px] text-slate-400">Ninguna</span>}</span></span>
                      <span className="flex min-w-0 items-center gap-1.5"><span className="w-[3.6rem] shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Quiere</span>
                        <span className="flex min-w-0 flex-wrap gap-1">{dv.length ? dv.map(d => <DivTag key={d} d={d} want />) : nd ? <span title={nd.t} className="rounded px-1.5 py-px text-[10px] font-bold" style={{ background: nd.c + "1f", color: nd.c }}>{nd.l}</span> : <span className="text-[11px] text-slate-400">—</span>}</span></span>
                    </span>
                    {/* estado, rama y acciones */}
                    <span className="flex items-center justify-end gap-2" onClick={ev => ev.stopPropagation()}>
                      <span className="flex flex-col items-end gap-1">{S ? <Pill c={S.c} I={S.I}>{S.l}</Pill> : <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><CircleDashed className="size-3" />Sin marcar</span>}
                        {R ? <Pill c={R.c} I={R.I}>{raL(e.rama, a.n)}</Pill> : <span className="text-[10.5px] text-slate-400">Sin rama</span>}</span>
                      {e.t ? <CopyMenu text={entText(a, e, QS)} variant="ghost" label="" /> : <span className="w-[3.25rem]" />}
                      <button onClick={() => setOpen(a.n)} aria-label={`Abrir la ficha de ${a.n}`} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-500/10 hover:text-brand-600"><ChevronRight className="size-4" /></button>
                    </span>
                  </li>);
              })}</ul>}
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

/* ficha de la entrevista: compacta. Se edita un borrador y se guarda con «Guardar»; guardada y sin cambios se puede copiar */
const Seg = ({ on, c, onClick, children, title }: { on: boolean; c: string; onClick: () => void; children: ReactNode; title?: string }) => (
  <button type="button" title={title} onClick={onClick} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition [&_svg]:size-3.5", !on && "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100")}
    style={on ? { borderColor: c, background: c + "1c", color: c } : undefined}>{children}</button>);
function Divs({ list, on, lock, col, onToggle }: { list: string[]; on: string[]; lock?: string[]; col: string; onToggle: (d: string) => void }) {
  return <div className="flex flex-wrap gap-1">{list.map(d => { const ab = divAb(d)[0], c = dcol(d), sel = on.includes(d), lk = lock?.includes(d); return (
    <button key={d} type="button" disabled={lk} onClick={() => onToggle(d)} title={lk ? `${d} · sale del roster` : d}
      className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10.5px] font-bold transition", !sel && "border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400", lk && "cursor-default")}
      style={sel ? { borderColor: col, background: col + "1c", color: col } : undefined}>
      <span className="size-1.5 rounded-full" style={{ background: c }} />{ab}{lk && <span className="text-[8.5px] opacity-70">R</span>}</button>); })}</div>;
}
function EntModal({ a, e, QS, onSave, onClose }: { a: Agent; e: Ent; QS: Q[]; onSave: (x: Ent) => void; onClose: () => void }) {
  const { toast, confirm } = useFeedback();
  const me = useMe(), SGTS = useMemo(() => getRoster().filter(x => x.r === "Sergeant I" || x.r === "Sergeant II").sort((x, y) => lvl(y.r) - lvl(x.r) || x.n.localeCompare(y.n)), []);
  const [d, setD] = useState<Ent>(() => { const c = clean(e); if (!c.ent && !e.t && SGTS.some(x => x.n === me.n)) c.ent = me.n; return c; }), [pv, setPv] = useState(false), [fd, setFd] = useState(isoToDMY(e.f));
  const set = (x: Partial<Ent>) => setD(o => ({ ...o, ...x }));
  const dirty = JSON.stringify(clean(d)) !== JSON.stringify(clean(e)), saved = !!e.t && !dirty;
  const act = actOf(a.n, d), auto = rosterDivs(a.n), dv = d.div || [], R = resOf(d), S = stOf(d);
  const txt = entText(a, saved ? e : { ...d, por: "(sin guardar)" }, QS), answered = QS.filter(x => ansOf(x, a, d).trim()).length;
  const close = async () => { if (dirty && !(await confirm("Hay cambios sin guardar. ¿Salir igual?", { danger: true, ok: "Salir sin guardar" }))) return; onClose(); };
  const doSave = () => { if (d.st === "si" && !d.f) { toast("Poné la fecha de la entrevista", "err"); return; } onSave(d); toast(empty(d) ? "Entrevista borrada" : "Entrevista guardada · ya la podés copiar"); };
  const togSet = (cur: string[], x: string) => { const s = new Set(cur); if (s.has(x)) s.delete(x); else s.add(x); return ordDiv(s); };
  return (
    <Modal open onClose={() => void close()} size="xl" icon={<UserRoundCheck />} title={<span className="flex items-center gap-2">{a.n}{S && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: S.c + "22", color: S.c }}>{S.l}</span>}{dirty && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-300">Sin guardar</span>}</span>}
      desc={<span className="flex flex-wrap items-center gap-1.5"><RankBadge r={a.r} />{a.p && <span className="font-mono text-xs">#{a.p}</span>}{e.t && <span className="text-xs">· guardada por {e.por}, {fmtDate(e.t)}</span>}</span>}
      footer={<><Revisar text={txt} err={[!d.st && "estado de la entrevista", d.st === "si" && !d.f && "fecha"].filter(Boolean) as string[]} pen={[...(d.ent ? [] : ["quién hizo la entrevista"]), ...(dv.length || d.nd ? [] : ["divisiones a las que quiere entrar (o «cómodo» / «no quiere más»)"])]} className="mr-auto min-w-0 max-w-full flex-1" />
        <Button variant="ghost" onClick={() => void close()}>Cerrar</Button>
        {saved ? <CopyMenu size="md" variant="primary" text={txt} up /> : <Button icon={<Save />} disabled={!dirty} onClick={doSave}>Guardar</Button>}</>}>
      {/* fila de datos: estado, fecha y rama */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-1">{(Object.keys(ST) as StK[]).map(k => { const X = ST[k], on = d.st === k; return (
          <Seg key={k} on={on} c={X.c} onClick={() => { if (on) { set({ st: "" }); return; } set(k === "si" && !d.f ? { st: k, f: hoyISO() } : { st: k }); if (k === "si" && !d.f) setFd(isoToDMY(hoyISO())); }}><X.I />{X.l}</Seg>); })}</div>
        <div className="flex items-center gap-1"><Input value={fd} placeholder="dd/mm/aaaa" inputMode="numeric" aria-label="Fecha" className="h-8 w-28 text-[12.5px]" onChange={ev => setFd(maskDMY(ev.target.value))}
          onBlur={() => { const v = fd.trim(); if (!v) { set({ f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · escribila como dd/mm/aaaa", "err"); return; } set({ f: iso }); }} />
          <button type="button" className="rounded-md px-1.5 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-500/10 dark:text-brand-300" onClick={() => { set({ f: hoyISO() }); setFd(isoToDMY(hoyISO())); }}>Hoy</button></div>
        <div className="flex items-center gap-1.5"><span className="text-[11px] font-semibold text-slate-500">Entrevistó</span>
          <AgentMenu value={d.ent || ""} list={SGTS} onChange={n => set({ ent: n })} title="¿Quién hizo la entrevista?" placeholder="Elegir sargento" me={me.n}
            extra={x => { const n = Object.values(LS.json<Record<string, Ent>>("lspdt.entrev", {})).filter(z => z.ent === x.n).length; return n ? `${n} ${n === 1 ? "entrevista" : "entrevistas"}` : ""; }} /></div>
        <div className="flex flex-wrap items-center gap-1"><span className="mr-1 text-[11px] font-semibold text-slate-500">Rama</span>{(Object.keys(RAMA) as RaK[]).map(k => { const Ra = RAMA[k]; return (
          <Seg key={k} on={d.rama === k} c={Ra.c} title={Ra.d} onClick={() => set({ rama: d.rama === k ? "" : k })}><Ra.I />{raL(k, a.n)}</Seg>); })}</div>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="space-y-3">
          <div><Lbl I={Building2}>Pertenece <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">· R = del roster</span></Lbl>
            <Divs list={ALL_DIVS} on={act} lock={auto} col="#10b981" onToggle={x => set({ act: togSet(d.act || [], x) })} /></div>
          <div><Lbl I={Target}>Quiere pertenecer</Lbl>
            <div className="mb-1.5 flex flex-wrap gap-1">{(Object.keys(ND) as (keyof typeof ND)[]).map(k => { const N = ND[k]; return (
              <Seg key={k} on={d.nd === k && !dv.length} c={N.c} title={N.t} onClick={() => set(d.nd === k && !dv.length ? { nd: "" } : { nd: k, div: [] })}>{k === "ok" ? <Check /> : <X />}{N.l}</Seg>); })}</div>
            <Divs list={ALL_DIVS.filter(x => !act.includes(x))} on={dv} col="rgb(var(--b-500))" onToggle={x => set({ div: togSet(dv, x), nd: "" })} /></div>
          <div><Lbl I={StickyNote}>Notas</Lbl>
            <Textarea rows={2} value={d.nota || ""} placeholder="Observaciones, compromisos…" onChange={ev => set({ nota: ev.target.value })} className="text-[13px]" /></div>
        </div>
        <div><Lbl I={MessagesSquare}>Respuestas <span className="ml-auto font-semibold normal-case tracking-normal text-slate-400">{answered}/{QS.length}</span></Lbl>
          <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{QS.map((x, i) => {
            const own = R[x.id] || "", au = AUTO.has(x.id) ? autoOf(x.id, a, d) : "", v = own || au, isAuto = !own && !!au;
            return (
              <li key={x.id} className="px-2.5 py-1.5 focus-within:bg-brand-500/[.04]">
                <p className="flex gap-1.5 text-[11.5px] font-semibold leading-snug text-slate-600 dark:text-slate-300"><span className={cn("mt-px grid size-4 shrink-0 place-items-center rounded text-[9px] font-black", v.trim() ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700")}>{v.trim() ? <Check className="size-2.5" /> : i + 1}</span>
                  <span className="flex-1">{qOf(x, a, d)}{x.n && <span className="ml-1 font-normal text-amber-600 dark:text-amber-400" title={x.n}>⚠</span>}</span>
                  {isAuto && <span className="h-fit rounded bg-sky-500/15 px-1 text-[9px] font-bold uppercase text-sky-600 dark:text-sky-300" title="Se completa solo con lo que marcaste; si escribís, queda tu respuesta">auto</span>}
                  {!!own && !!au && <button type="button" title="Volver a la respuesta automática" onClick={() => set({ res: { ...R, [x.id]: "" } })} className="text-slate-400 hover:text-brand-600"><RotateCcw className="size-3" /></button>}</p>
                <textarea rows={Math.min(5, Math.max(1, v.split("\n").length, Math.ceil(v.length / 80)))} value={v} placeholder="Respuesta…" onChange={ev => set({ res: { ...R, [x.id]: ev.target.value } })}
                  className={cn("ml-[22px] mt-0.5 block w-[calc(100%-22px)] resize-none bg-transparent text-[12.5px] leading-snug outline-none placeholder:text-slate-400", isAuto && "italic text-slate-500 dark:text-slate-400")} />
              </li>); })}</ol>
          <button type="button" onClick={() => setPv(!pv)} className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-brand-600"><MessagesSquare className="size-3.5 text-[#5865F2]" />Vista previa para Discord<ChevronDown className={cn("size-3.5 transition", pv && "rotate-180")} /></button>
          {pv && <pre className="scrollbar-thin mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">{txt}</pre>}
        </div>
      </div>
    </Modal>);
}
