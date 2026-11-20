/* Historial de 10-80: cada citación guardada, con su justificación posterior.
   La justificación genera un mensaje formal (estilo feedback) en formato Discord o web, para publicarlo en la página.
   Supervisores usan lspdt.t1080; la PSB, lspdt.psbCit (solo la ven sus miembros). */
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, MapPin, Pencil, Plus, Radio, Search, SpellCheck, Tag as TagIcon, Trash2, Users, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput, Textarea } from "@/components/ui";
import { Predict } from "@/components/predict";
import { Modal } from "@/components/modal";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { CopyMenu, DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { dmyToISO, findAgent, fullDT, genderOf, hoyISO, isoToDMY, lvl, maskDMY, norm, RANK_COLOR, rankES } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

/* j = justificación (se carga después de la citación). asisA = asistencia por agente cuando se citó a varios; pres = quiénes estuvieron en el 10-80 */
type Just = { mot: string; motx?: string; asis: string; asisA?: Record<string, string>; f: string; hechos: string; med: string; obs?: string; pres?: string[]; por: string; t: number };
type Ag = { n: string; r: string; p?: string; r0?: string }; /* r0: rango con el que se lo citó, si cambió antes de cerrar */
/* ag/r/p = primer citado (compatibilidad); ags = todos los citados; cit = quiénes citaron; tags = etiquetas para filtrar */
export type Cit1080 = { id: string; no: number; t: number; ag: string; r: string; r0?: string; p?: string; ags?: Ag[]; esc: string; lugar: string; por: string; pr?: string; cit?: string[]; tags?: string[]; j?: Just };
export const keyOf = (psb?: boolean) => (psb ? "lspdt.psbCit" : "lspdt.t1080");
const agsRaw = (c: Cit1080): Ag[] => (c.ags?.length ? c.ags : [{ n: c.ag, r: c.r, p: c.p }]);
/* mientras está abierto se usa el rango actual del roster (si lo ascendieron o descendieron, sale el nuevo);
   al cerrarlo (justificación guardada) el rango queda fijo y ya no cambia: los cerrados no se tocan para atrás */
const curAg = (a: Ag): Ag => { const r = findAgent(a.n)?.r; return r && r !== a.r ? { ...a, r, r0: a.r0 || a.r } : a; };
const agsOf = (c: Cit1080): Ag[] => (c.j ? agsRaw(c) : agsRaw(c).map(curAg));
const citOf = (c: Cit1080) => (c.cit?.length ? c.cit : [c.por]);
export const joinY = (a: string[]) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} y ${a[a.length - 1]}`);
const plate = (p?: string) => String(p || "").replace(/\D/g, "");
const who = (a: Ag) => `${rankES(a.r)} ${a.n}${plate(a.p) ? ` (#${plate(a.p)})` : ""}`;
const supTxt = (n: string, r?: string) => `${rankES(r || findAgent(n)?.r || "")} ${n}`.trim();

/* etiquetas: las de siempre con color fijo; las personalizadas toman uno de la paleta */
const TAGS: [string, string][] = [["Bronca", "#ef4444"], ["Ascenso", "#10b981"], ["Felicitación", "#22c55e"], ["Disciplinario", "#f97316"], ["Seguimiento", "#3b82f6"],
  ["Entrevista", "#8b5cf6"], ["Condecoración", "#eab308"], ["Conducta", "#ec4899"], ["Normativa", "#06b6d4"], ["Administrativo", "#64748b"]];
const PAL = ["#0ea5e9", "#a855f7", "#14b8a6", "#f43f5e", "#84cc16", "#d946ef"];
const tagCol = (t: string) => TAGS.find(x => norm(x[0]) === norm(t))?.[1] || PAL[[...norm(t)].reduce((h, c) => h + c.charCodeAt(0), 0) % PAL.length];
function TagPill({ t, on = true, onClick, sm, n }: { t: string; on?: boolean; onClick?: () => void; sm?: boolean; n?: number }) {
  const c = tagCol(t), C = onClick ? "button" : "span";
  return <C type={onClick ? "button" : undefined} onClick={onClick} className={cn("inline-flex items-center gap-1 rounded-full border font-semibold transition", sm ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]", !on && "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}
    style={on ? { borderColor: c + "66", background: c + "1c", color: c } : undefined}><span className="size-1.5 rounded-full" style={{ background: on ? c : "currentColor", opacity: on ? 1 : .5 }} />{t}{n != null && <span className="tabular-nums opacity-60">{n}</span>}</C>;
}
/* elegir etiquetas: las sugeridas con un toque y cualquier otra escribiéndola (Enter) */
export function TagEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [x, setX] = useState(""), has = (t: string) => value.some(v => norm(v) === norm(t));
  const tog = (t: string) => onChange(has(t) ? value.filter(v => norm(v) !== norm(t)) : [...value, t]);
  const all = [...TAGS.map(t => t[0]), ...value.filter(v => !TAGS.some(t => norm(t[0]) === norm(v)))];
  const add = () => { const t = x.trim().replace(/\s+/g, " "); if (t && !has(t)) onChange([...value, t.charAt(0).toUpperCase() + t.slice(1)]); setX(""); };
  return <div className="flex flex-wrap items-center gap-1.5">{all.map(t => <TagPill key={t} t={t} on={has(t)} onClick={() => tog(t)} />)}
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 py-0.5 pl-2 pr-1 dark:border-slate-600"><TagIcon className="size-3 text-slate-400" />
      <input value={x} onChange={e => setX(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Otra…" className="w-20 bg-transparent text-[11px] outline-none placeholder:text-slate-400" />
      {x.trim() && <button type="button" onClick={add} className="rounded-full p-0.5 text-brand-600 hover:bg-brand-500/10"><Plus className="size-3" /></button>}</span></div>;
}
/* lista de agentes elegidos (citados, citantes o presentes) con botón para quitar */
export function AgChips({ list, onRemove, lock, onArt, art }: { list: string[]; onRemove: (n: string) => void; lock?: string; art?: Record<string, string>; onArt?: (n: string) => void }) {
  return <div className="flex min-h-9 flex-wrap gap-1.5">{list.map(n => { const a = findAgent(n), c = RANK_COLOR[a?.r || ""] || "#94a3b8"; return (
    <span key={n} className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1 text-[12px] font-semibold" style={{ background: c + "1a", boxShadow: `inset 0 0 0 1px ${c}55` }}>
      <Avatar n={n} size={22} />{art && onArt && <button type="button" title="Cambiar artículo" onClick={() => onArt(n)} className="rounded-full bg-white/70 px-1.5 text-[10px] font-bold text-slate-500 hover:text-brand-600 dark:bg-slate-900/60 dark:text-slate-300">{art[n]}</button>}
      <span>{n}{a && <span className="ml-1 text-[10px] font-bold" style={{ color: c }}>{rankES(a.r)}</span>}</span>
      {lock === n ? <span className="rounded bg-brand-500/15 px-1 text-[9.5px] font-bold uppercase text-brand-600 dark:text-brand-300">Vos</span>
        : <button type="button" aria-label={`Quitar a ${n}`} onClick={() => onRemove(n)} className="rounded-full p-0.5 text-slate-400 hover:text-red-500"><X className="size-3.5" /></button>}
    </span>); })}</div>;
}

/* motivos sugeridos (texto predictivo: se puede escribir cualquier otro) */
const MOT = ["Llamado de atención", "Ascenso", "Felicitación por ascenso", "Notificación de ascenso denegado", "Descenso de rango", "Seguimiento del servicio", "Feedback de desempeño",
  "Entrevista personal", "Entrevista de seguimiento", "Medida disciplinaria", "Apercibimiento", "Suspensión", "Reconocimiento", "Entrega de condecoración", "Investigación interna",
  "Ingreso a una división", "Baja de una división", "Cambio de turno", "Incumplimiento de la normativa", "Conducta impropia", "Uso indebido del equipamiento", "Uso indebido del vehículo policial",
  "Falta de respeto a un superior", "Inasistencia reiterada", "Uniformidad incorrecta", "Mala praxis en un procedimiento", "Revisión de un informe", "Pérdida de armamento", "Solicitud del agente", "Asunto administrativo"];
/* medidas genéricas para sumar con un toque */
const MED = ["Se le recordó la normativa vigente y se le solicitó su cumplimiento.", "Se le realizó un llamado de atención verbal.", "Se le aplicó un apercibimiento por escrito.",
  "Queda en seguimiento por la supervisión durante las próximas dos semanas.", "Se le comunicó su ascenso y las responsabilidades del nuevo rango.", "Se le felicitó por su desempeño.",
  "Se elevó el caso a la PSB para su evaluación.", "Se elevó el caso a Capitanía.", "No se adoptaron medidas: la situación quedó aclarada.", "Se le notificó la medida disciplinaria correspondiente.",
  "Se acordó una nueva entrevista de seguimiento.", "El agente tomó conocimiento y se comprometió a corregir la conducta."];
/* las medidas en plural cuando se citó a varios */
const plur = (m: string) => m.replace(/^Se le /, "Se les ").replace(/^Queda /, "Quedan ").replace("su ascenso y las responsabilidades del nuevo rango", "sus ascensos y las responsabilidades del nuevo rango")
  .replace("El agente tomó conocimiento y se comprometió", "Los agentes tomaron conocimiento y se comprometieron");
const ASIS = [["si", "Se presentó en tiempo y forma", "#10b981"], ["tarde", "Se presentó con demora", "#f59e0b"], ["no", "No se presentó", "#ef4444"]] as const;
const dts = (t: number, f = "f") => `<t:${Math.floor(t / 1000)}:${f}>`;
const q = (s: string) => s.trim().split("\n").map(l => "> " + l).join("\n");

/* deja un texto prolijo: espacios, mayúscula al empezar cada oración, signos bien pegados y punto final */
function tidy(t: string) {
  return t.split("\n").map(l => { let x = l.replace(/\s+/g, " ").trim(); if (!x) return "";
    x = x.replace(/\s+([,.;:!?)])/g, "$1").replace(/([,;:])(?=[^\s\d])/g, "$1 ").replace(/([.!?])(?=[A-Za-zÁÉÍÓÚÑáéíóúñ¿¡])/g, "$1 ").replace(/\(\s+/g, "(").replace(/\.{4,}/g, "...");
    x = x.replace(/(^|[.!?]\s+|^[-•]\s*)([a-záéíóúñ¿¡])/g, (_m, a: string, c: string) => a + c.toUpperCase());
    if (!/[.!?:…)»"]$/.test(x)) x += "."; return x; }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
/* mensaje formal: encabezado, datos, desarrollo y constancia final (uno o varios citados) */
const ASL = (k: string) => ASIS.find(x => x[0] === k)?.[1] || "";
function justText(c: Cit1080, j: Just) {
  const A = agsOf(c), many = A.length > 1, fem = A.every(a => genderOf(a.n) === "f"), o = fem ? "a" : "o";
  const cit = citOf(c), citers = joinY(cit.map(n => (n === c.por ? supTxt(n, c.pr) : supTxt(n))));
  const pres = (j.pres || []).filter(Boolean), extra = pres.filter(n => !cit.includes(n)), con = extra.length ? `, con la presencia de ${joinY(extra.map(n => supTxt(n)))}` : "";
  const mot = (j.mot === "Otro" && j.motx?.trim() ? j.motx.trim() : j.mot.trim()) || "Sin especificar", motl = mot.charAt(0).toLowerCase() + mot.slice(1);
  const fecha = j.f ? dts(new Date(`${j.f}T12:00:00-03:00`).getTime(), "D") : dts(c.t, "D");
  const asOf = (a: Ag) => (many && j.asisA?.[a.n]) || j.asis;
  let cuerpo: string;
  if (!many) {
    const a = A[0], art = genderOf(a.n) === "f" ? "la" : "el", oo = art === "la" ? "a" : "o";
    const cierre = j.asis === "no" ? "quien no se presentó a la citación en el horario indicado. La inasistencia queda registrada a los efectos que correspondan."
      : `quien se presentó${j.asis === "tarde" ? " con demora" : " en tiempo y forma"}, además de ser atendid${oo} por la supervisión.`;
    cuerpo = `Por medio de la presente se deja constancia de que ${art} ${who(a)} fue citad${oo} mediante radio interna para realizarle un 10-80 ejecutado por ${citers}${con}, ${cierre} El motivo de la citación fue: ${motl}.`;
  } else {
    const ks = [...new Set(A.map(asOf))];
    let cierre: string;
    if (ks.length === 1) cierre = ks[0] === "no" ? "quienes no se presentaron a la citación en el horario indicado. La inasistencia queda registrada a los efectos que correspondan."
      : `quienes se presentaron${ks[0] === "tarde" ? " con demora" : " en tiempo y forma"}, además de ser atendid${o}s por la supervisión.`;
    else {
      const g = (k: string) => A.filter(a => asOf(a) === k).map(a => a.n), v = (n: string[]) => (n.length > 1 ? "se presentaron" : "se presentó");
      const parts = [g("si").length && `${joinY(g("si"))} ${v(g("si"))} en tiempo y forma`, g("tarde").length && `${joinY(g("tarde"))} ${v(g("tarde"))} con demora`,
        g("no").length && `${joinY(g("no"))} no ${v(g("no"))}`].filter(Boolean) as string[];
      cierre = `siendo atendid${o}s por la supervisión quienes se presentaron. En cuanto a la asistencia, ${joinY(parts)}.${g("no").length ? " La inasistencia queda registrada a los efectos que correspondan." : ""}`;
    }
    cuerpo = `Por medio de la presente se deja constancia de que ${fem ? "las" : "los"} agentes ${joinY(A.map(who))} fueron citad${o}s mediante radio interna para realizarles un 10-80 ejecutado por ${citers}${con}, ${cierre} El motivo de la citación fue: ${motl}.`;
  }
  return [
    `## 📻 JUSTIFICACIÓN DE 10-80 · Nº ${String(c.no).padStart(4, "0")}`,
    `**Los Santos Police Department — Supervisión**`, "",
    ...(many ? [`**Agentes citados:**`, ...A.map(a => `- ${who(a)} · ${ASL(asOf(a))}`)] : [`**Agente citado:** ${who(A[0])}`]),
    `**Citado por:** ${citers}`, ...(pres.length ? [`**Presentes en el 10-80:** ${joinY(pres.map(n => supTxt(n)))}`] : []),
    `**Fecha de la citación:** ${dts(c.t)}`, `**Fecha de la reunión:** ${fecha}`, `**Lugar:** ${c.esc}`, `**Motivo:** ${mot}`, ...(many ? [] : [`**Asistencia:** ${ASL(j.asis)}`]), "",
    cuerpo, "",
    "### 📝 Exposición de los hechos", q(j.hechos), "",
    "### ⚖️ Medidas adoptadas y resolución", q(j.med),
    ...(j.obs?.trim() ? ["", "### 🗒️ Observaciones", q(j.obs)] : []), "",
    "Sin otro particular, se eleva la presente a los efectos administrativos que correspondan, quedando a disposición de la superioridad.", "",
    `-# Redactado por ${j.por} · ${dts(j.t)} · Los Santos Police Department`,
  ].join("\n");
}

export function Historial1080({ psbOnly }: { psbOnly?: boolean }) {
  const me = useMe(), { confirm, toast } = useFeedback(), [L, setL] = useJSON<Cit1080[]>(keyOf(psbOnly), []);
  const [f, setF] = useState<"" | "pen" | "ok">(""), [q2, setQ] = useState(""), [tg, setTg] = useState(""), [sel, setSel] = useState<Cit1080 | null>(null);
  const s = norm(q2.trim()), sgt2 = me.l >= 7 || me.admin;
  const F = useMemo(() => L.filter(x => (!f || (f === "ok") === !!x.j) && (!tg || (x.tags || []).some(t => norm(t) === norm(tg)))
    && (!s || norm(`${agsOf(x).map(a => a.n).join(" ")} ${citOf(x).join(" ")} ${(x.j?.pres || []).join(" ")} ${(x.tags || []).join(" ")} ${x.esc} ${x.no}`).includes(s))).sort((a, b) => b.t - a.t), [L, f, s, tg]);
  const pend = L.filter(x => !x.j).length;
  const used = useMemo(() => { const m = new Map<string, number>(); L.forEach(x => (x.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]); }, [L]);
  const del = async (c: Cit1080) => { if (await confirm(`¿Borrar el 10-80 Nº ${c.no} de ${joinY(agsOf(c).map(a => a.n))}?`, { danger: true, ok: "Borrar" })) { setL(L.filter(x => x.id !== c.id)); toast("10-80 borrado"); } };
  return (
    <div className="space-y-3">
      <Card className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput className="min-w-[14rem] flex-1 sm:max-w-xs" value={q2} onChange={setQ} placeholder="Buscar agente, sargento, etiqueta o Nº…" />
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">{([["", "Todos", L.length], ["pen", "Sin justificar", pend], ["ok", "Justificados", L.length - pend]] as const).map(([k, l, n]) => (
            <button key={k || "all"} onClick={() => setF(k)} className={cn("rounded-lg px-3 py-1.5 text-[12px] font-semibold transition", f === k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
              {l} <span className="tabular-nums opacity-60">{n}</span></button>))}</div>
        </div>
        {!!used.length && <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800"><TagIcon className="size-3.5 text-slate-400" />
          <button onClick={() => setTg("")} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold transition", !tg ? "bg-brand-600 text-white dark:bg-brand-500" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>Todas</button>
          {used.map(([t, n]) => <span key={t} className="inline-flex items-center"><TagPill t={t} n={n} on={norm(tg) === norm(t)} onClick={() => setTg(norm(tg) === norm(t) ? "" : t)} /></span>)}</div>}
      </Card>
      {!F.length ? <Card><Empty icon={L.length ? <Search /> : <Radio />} title={L.length ? "Nada coincide" : "Todavía no hay 10-80 guardados"} desc={L.length ? undefined : "Armá una citación en «Nueva citación» y tocá «Guardar en el historial»."} /></Card> : (
        <Card className="overflow-hidden"><ul className="divide-y divide-slate-100 dark:divide-slate-800">{F.map(c => { const ok = !!c.j, A = agsOf(c), cit = citOf(c), pres = c.j?.pres || [], mine = cit.includes(me.n); return (
          <li key={c.id} className="grid items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[4.5rem_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
            <span className="font-mono text-[12px] font-bold text-slate-400">Nº {String(c.no).padStart(4, "0")}</span>
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex shrink-0 -space-x-2">{A.slice(0, 3).map(a => <span key={a.n} className="rounded-full ring-2 ring-white dark:ring-[rgb(var(--card))]"><Avatar n={a.n} size={34} /></span>)}</span>
              <span className="min-w-0">
                {A.length === 1 ? <><b className="block text-[13.5px] leading-tight">{A[0].n}</b><span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500"><RankBadge r={A[0].r} />{A[0].r0 && <span title="Rango con el que se lo citó">(citado como {rankES(A[0].r0)})</span>}{plate(A[0].p) && `#${plate(A[0].p)}`}</span></>
                  : <><b className="block text-[13.5px] leading-tight">{A.length} agentes citados</b><span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">{joinY(A.map(a => a.n))}</span></>}
                {!!c.tags?.length && <span className="mt-1 flex flex-wrap gap-1">{c.tags.map(t => <TagPill key={t} t={t} sm onClick={() => setTg(t)} />)}</span>}
              </span></span>
            <span className="min-w-0 space-y-0.5 text-[12px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-slate-400" />{c.esc}</span>
              <span className="flex items-start gap-1.5 text-[11.5px] text-slate-500"><Clock className="mt-px size-3.5 shrink-0" /><span>{fullDT(c.t)} · {cit.length > 1 ? "citaron" : "citó"} <b className="font-semibold text-slate-700 dark:text-slate-300">{joinY(cit)}</b></span></span>
              {!!pres.length && <span className="flex items-start gap-1.5 text-[11.5px] text-slate-500"><Users className="mt-px size-3.5 shrink-0" /><span>Presentes: <b className="font-semibold text-slate-700 dark:text-slate-300">{joinY(pres)}</b></span></span>}</span>
            <span className="flex items-center justify-end gap-2">
              {ok ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" />Justificado</span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400"><Clock className="size-3.5" />Sin justificar</span>}
              {ok && <CopyMenu text={justText(c, c.j!)} variant="ghost" label="" />}
              <Button size="sm" variant={ok ? "outline" : "primary"} icon={ok ? <Pencil /> : <FileText />} onClick={() => setSel(c)}>{ok ? "Ver" : "Justificar"}</Button>
              {(mine || sgt2) && <button aria-label={`Borrar 10-80 Nº ${c.no}`} onClick={() => void del(c)} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button>}
            </span>
          </li>); })}</ul></Card>)}
      {sel && <JustModal key={sel.id} c={sel} onClose={() => setSel(null)} onSave={(j, tags) => { setL(L.map(x => { if (x.id !== sel.id) return x; if (x.j) return { ...x, j, tags };
        const A = agsRaw(x).map(curAg); return { ...x, j, tags, ags: A, r: A[0].r, ...(A[0].r0 ? { r0: A[0].r0 } : {}) }; })); toast("Justificación guardada · ya la podés copiar"); setSel(null); }} />}
    </div>);
}

const isSup = (a: { r: string }) => lvl(a.r) >= 6;
function JustModal({ c, onClose, onSave }: { c: Cit1080; onClose: () => void; onSave: (j: Just, tags: string[]) => void }) {
  const me = useMe(), { toast } = useFeedback(), A = agsOf(c), many = A.length > 1;
  const [j, setJ] = useState<Just>(() => c.j || { mot: MOT[0], asis: "si", f: hoyISO(), hechos: "", med: "", obs: "", pres: citOf(c), por: me.n, t: Date.now() });
  const [tags, setTags] = useState<string[]>(c.tags || []);
  const [fd, setFd] = useState(isoToDMY(j.f)), set = (x: Partial<Just>) => setJ(o => ({ ...o, ...x }));
  const pres = j.pres || [];
  const need = [!j.mot.trim() && "motivo", !j.hechos.trim() && "exposición de los hechos", !j.med.trim() && "medidas adoptadas", !j.f && "fecha de la reunión"].filter(Boolean) as string[];
  /* «Revisar»: ordena la redacción de los textos y avisa qué cambió */
  const [fixed, setFixed] = useState<string[] | null>(null);
  const revisar = () => { const ch: string[] = [], n: Partial<Just> = {};
    (["hechos", "med", "obs"] as const).forEach(k => { const v = j[k] || "", t = tidy(v); if (v && t !== v) { n[k] = t; ch.push(k === "hechos" ? "Exposición de los hechos" : k === "med" ? "Medidas adoptadas" : "Observaciones"); } });
    const m = j.mot.trim(); if (m && m !== m.charAt(0).toUpperCase() + m.slice(1)) { n.mot = m.charAt(0).toUpperCase() + m.slice(1); ch.push("Motivo"); }
    set(n); setFixed(ch); };
  const txt = justText(c, { ...j, por: me.n, t: c.j?.t || Date.now() });
  const asisBtns = (cur: string, pick: (k: string) => void, sm?: boolean) => <div className="flex flex-wrap gap-1.5">{ASIS.map(([k, l, col]) => (
    <button key={k} type="button" onClick={() => pick(k)} className={cn("rounded-lg border font-semibold transition", sm ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-[12px]", cur !== k && "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}
      style={cur === k ? { borderColor: col, background: col + "1c", color: col } : undefined}>{sm ? l.replace("Se presentó ", "").replace("No se presentó", "No vino") : l}</button>))}</div>;
  return (
    <Modal open onClose={onClose} size="xl" icon={<FileText />} title={`Justificación del 10-80 Nº ${String(c.no).padStart(4, "0")}`}
      desc={<span className="flex flex-wrap items-center gap-1.5">{many ? <b>{joinY(A.map(a => a.n))}</b> : <><b>{A[0].n}</b><RankBadge r={A[0].r} /></>}<span className="text-xs">· {c.esc} · {fullDT(c.t)} · {citOf(c).length > 1 ? "citaron" : "citó"} {joinY(citOf(c))}</span></span>}
      footer={<><Button variant="ghost" className="mr-auto" onClick={onClose}>Cerrar</Button>
        <Button icon={<CheckCircle2 />} onClick={() => { if (need.length) { toast("Falta: " + need.join(", "), "err"); return; } onSave({ ...j, mot: j.mot.trim(), hechos: tidy(j.hechos), med: tidy(j.med), obs: j.obs ? tidy(j.obs) : "", por: me.n, t: Date.now() }, tags); }}>Guardar justificación</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Motivo"><Predict value={j.mot} onChange={v => set({ mot: v })} list={MOT} placeholder="Ej: Ascenso, llamado de atención…" /></Field>
            <Field label="Fecha de la reunión"><Input value={fd} placeholder="dd/mm/aaaa" inputMode="numeric" onChange={e => setFd(maskDMY(e.target.value))}
              onBlur={() => { const v = fd.trim(); if (!v) { set({ f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · dd/mm/aaaa", "err"); return; } set({ f: iso }); }} /></Field>
          </div>
          <Field label="Etiquetas" hint="(para filtrar en el historial)"><TagEditor value={tags} onChange={setTags} /></Field>
          <Field label="Presentes en el 10-80" hint="(supervisión que estuvo en la reunión)">
            <AgChips list={pres} onRemove={n => set({ pres: pres.filter(x => x !== n) })} />
            <AgentPicker value={pres} multiple onChange={n => !pres.includes(n) && set({ pres: [...pres, n] })} filter={a => isSup(a) && !pres.includes(a.n)} empty="No hay más supervisores" />
          </Field>
          <Field label="Asistencia">{!many ? asisBtns(j.asis, k => set({ asis: k })) : (
            <div className="space-y-1.5">{A.map(a => (
              <div key={a.n} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-1.5 pl-2 dark:border-slate-800">
                <Avatar n={a.n} size={24} /><b className="min-w-0 flex-1 truncate text-[12.5px]">{a.n}</b>
                {asisBtns(j.asisA?.[a.n] || j.asis, k => set({ asisA: { ...(j.asisA || {}), [a.n]: k } }), true)}</div>))}</div>)}</Field>
          <Field label="Exposición de los hechos"><Textarea rows={4} value={j.hechos} onChange={e => set({ hechos: e.target.value })} placeholder="Qué motivó la citación y qué se habló en la reunión…" /></Field>
          <Field label="Medidas adoptadas y resolución"><Textarea rows={3} value={j.med} onChange={e => set({ med: e.target.value })} placeholder="Escribí o sumá una de las de abajo…" />
            <div className="mt-1.5 flex flex-wrap gap-1">{MED.map(m0 => { const m = many ? plur(m0) : m0, on = j.med.includes(m); return (
              <button key={m} type="button" title={on ? "Quitar" : "Agregar"} onClick={() => set({ med: on ? j.med.replace(m, "").replace(/\s{2,}/g, " ").trim() : (j.med.trim() ? j.med.trim() + " " : "") + m })}
                className={cn("rounded-full border px-2 py-0.5 text-[11px] transition", on ? "border-brand-500/60 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700")}>
                {on ? "✓ " : "+ "}{m.replace(/\.$/, "")}</button>); })}</div></Field>
          <Field label="Observaciones" hint="(opcional)"><Textarea rows={2} value={j.obs || ""} onChange={e => set({ obs: e.target.value })} /></Field>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
            <Button size="sm" variant="outline" icon={<SpellCheck />} onClick={revisar}>Revisar redacción</Button>
            <span className="min-w-0 flex-1 text-[11.5px] text-slate-500">{fixed == null ? "Ordena espacios, mayúsculas, signos y puntos finales de lo que escribiste." : fixed.length ? <span className="text-emerald-600 dark:text-emerald-400">✓ Corregido: {fixed.join(", ")}</span> : <span className="text-emerald-600 dark:text-emerald-400">✓ Está prolijo, no hubo nada que corregir.</span>}</span>
          </div>
        </div>
        <DiscordOutput title="Justificación del 10-80" text={txt} need={need} sticky={false} />
      </div>
    </Modal>);
}
