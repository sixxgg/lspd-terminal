/* Historial de 10-80: cada citación guardada, con su justificación posterior.
   La justificación genera un mensaje formal (estilo feedback) en formato Discord o web, para publicarlo en la página.
   Supervisores usan lspdt.t1080; la PSB, lspdt.psbCit (solo la ven sus miembros). */
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, MapPin, Pencil, Radio, Search, SpellCheck, Trash2 } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput, Textarea } from "@/components/ui";
import { Predict } from "@/components/predict";
import { Modal } from "@/components/modal";
import { Avatar, RankBadge } from "@/components/agents";
import { CopyMenu, DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { dmyToISO, fullDT, genderOf, hoyISO, isoToDMY, maskDMY, norm, rankES } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

/* j = justificación (se carga después de la citación) */
type Just = { mot: string; motx?: string; asis: string; f: string; hechos: string; med: string; obs?: string; por: string; t: number };
export type Cit1080 = { id: string; no: number; t: number; ag: string; r: string; p?: string; esc: string; lugar: string; por: string; pr?: string; j?: Just };
export const keyOf = (psb?: boolean) => (psb ? "lspdt.psbCit" : "lspdt.t1080");

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
/* mensaje formal: encabezado, datos, desarrollo y constancia final */
function justText(c: Cit1080, j: Just) {
  const art = genderOf(c.ag) === "f" ? "la" : "el", ag = `${rankES(c.r)} ${c.ag}${c.p ? ` (#${String(c.p).replace(/\D/g, "")})` : ""}`, sup = `${rankES(c.pr || "")} ${c.por}`.trim();
  const mot = (j.mot === "Otro" && j.motx?.trim() ? j.motx.trim() : j.mot.trim()) || "Sin especificar", asis = ASIS.find(x => x[0] === j.asis)?.[1] || "";
  const fecha = j.f ? dts(new Date(`${j.f}T12:00:00-03:00`).getTime(), "D") : dts(c.t, "D");
  const o = art === "la" ? "a" : "o";
  const cierre = j.asis === "no" ? `quien no se presentó a la citación en el horario indicado. La inasistencia queda registrada a los efectos que correspondan.`
    : `quien se presentó${j.asis === "tarde" ? " con demora" : " en tiempo y forma"}, además de ser atendid${o} por la supervisión.`;
  return [
    `## 📻 JUSTIFICACIÓN DE 10-80 · Nº ${String(c.no).padStart(4, "0")}`,
    `**Los Santos Police Department — Supervisión**`, "",
    `**Agente citado:** ${ag}`, `**Citado por:** ${sup}`, `**Fecha de la citación:** ${dts(c.t)}`, `**Fecha de la reunión:** ${fecha}`,
    `**Lugar:** ${c.esc}`, `**Motivo:** ${mot}`, `**Asistencia:** ${asis}`, "",
    `Por medio de la presente se deja constancia de que ${art} ${ag} fue citad${o} mediante radio interna para realizarle un 10-80 ejecutado por ${sup}, ${cierre} El motivo de la citación fue: ${mot.charAt(0).toLowerCase() + mot.slice(1)}.`, "",
    "### 📝 Exposición de los hechos", q(j.hechos), "",
    "### ⚖️ Medidas adoptadas y resolución", q(j.med),
    ...(j.obs?.trim() ? ["", "### 🗒️ Observaciones", q(j.obs)] : []), "",
    "Sin otro particular, se eleva la presente a los efectos administrativos que correspondan, quedando a disposición de la superioridad.", "",
    `-# Redactado por ${j.por} · ${dts(j.t)} · Los Santos Police Department`,
  ].join("\n");
}

export function Historial1080({ psbOnly }: { psbOnly?: boolean }) {
  const me = useMe(), { confirm, toast } = useFeedback(), [L, setL] = useJSON<Cit1080[]>(keyOf(psbOnly), []);
  const [f, setF] = useState<"" | "pen" | "ok">(""), [q2, setQ] = useState(""), [sel, setSel] = useState<Cit1080 | null>(null);
  const s = norm(q2.trim()), sgt2 = me.l >= 7 || me.admin;
  const F = useMemo(() => L.filter(x => (!f || (f === "ok") === !!x.j) && (!s || norm(`${x.ag} ${x.por} ${x.esc} ${x.no}`).includes(s))).sort((a, b) => b.t - a.t), [L, f, s]);
  const pend = L.filter(x => !x.j).length;
  const del = async (c: Cit1080) => { if (await confirm(`¿Borrar el 10-80 Nº ${c.no} de ${c.ag}?`, { danger: true, ok: "Borrar" })) { setL(L.filter(x => x.id !== c.id)); toast("10-80 borrado"); } };
  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <SearchInput className="min-w-[14rem] flex-1 sm:max-w-xs" value={q2} onChange={setQ} placeholder="Buscar agente, sargento o Nº…" />
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">{([["", "Todos", L.length], ["pen", "Sin justificar", pend], ["ok", "Justificados", L.length - pend]] as const).map(([k, l, n]) => (
          <button key={k || "all"} onClick={() => setF(k)} className={cn("rounded-lg px-3 py-1.5 text-[12px] font-semibold transition", f === k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
            {l} <span className="tabular-nums opacity-60">{n}</span></button>))}</div>
      </Card>
      {!F.length ? <Card><Empty icon={L.length ? <Search /> : <Radio />} title={L.length ? "Nada coincide" : "Todavía no hay 10-80 guardados"} desc={L.length ? undefined : "Armá una citación en «Nueva citación» y tocá «Guardar en el historial»."} /></Card> : (
        <Card className="overflow-hidden"><ul className="divide-y divide-slate-100 dark:divide-slate-800">{F.map(c => { const ok = !!c.j, mine = c.por === me.n; return (
          <li key={c.id} className="grid items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[4.5rem_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
            <span className="font-mono text-[12px] font-bold text-slate-400">Nº {String(c.no).padStart(4, "0")}</span>
            <span className="flex min-w-0 items-center gap-3"><Avatar n={c.ag} size={34} />
              <span className="min-w-0"><b className="block text-[13.5px] leading-tight">{c.ag}</b><span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500"><RankBadge r={c.r} />{c.p && `#${String(c.p).replace(/\D/g, "")}`}</span></span></span>
            <span className="min-w-0 text-[12px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-slate-400" />{c.esc}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-500"><Clock className="size-3.5 shrink-0" />{fullDT(c.t)} · citó <b className="font-semibold text-slate-700 dark:text-slate-300">{c.por}</b></span></span>
            <span className="flex items-center justify-end gap-2">
              {ok ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" />Justificado</span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400"><Clock className="size-3.5" />Sin justificar</span>}
              {ok && <CopyMenu text={justText(c, c.j!)} variant="ghost" label="" />}
              <Button size="sm" variant={ok ? "outline" : "primary"} icon={ok ? <Pencil /> : <FileText />} onClick={() => setSel(c)}>{ok ? "Ver" : "Justificar"}</Button>
              {(mine || sgt2) && <button aria-label={`Borrar 10-80 Nº ${c.no}`} onClick={() => void del(c)} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button>}
            </span>
          </li>); })}</ul></Card>)}
      {sel && <JustModal key={sel.id} c={sel} onClose={() => setSel(null)} onSave={j => { setL(L.map(x => (x.id === sel.id ? { ...x, j } : x))); toast("Justificación guardada · ya la podés copiar"); setSel(null); }} />}
    </div>);
}

function JustModal({ c, onClose, onSave }: { c: Cit1080; onClose: () => void; onSave: (j: Just) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [j, setJ] = useState<Just>(() => c.j || { mot: MOT[0], asis: "si", f: hoyISO(), hechos: "", med: "", obs: "", por: me.n, t: Date.now() });
  const [fd, setFd] = useState(isoToDMY(j.f)), set = (x: Partial<Just>) => setJ(o => ({ ...o, ...x }));
  const need = [!j.mot.trim() && "motivo", !j.hechos.trim() && "exposición de los hechos", !j.med.trim() && "medidas adoptadas", !j.f && "fecha de la reunión"].filter(Boolean) as string[];
  /* «Revisar»: ordena la redacción de los textos y avisa qué cambió */
  const [fixed, setFixed] = useState<string[] | null>(null);
  const revisar = () => { const ch: string[] = [], n: Partial<Just> = {};
    (["hechos", "med", "obs"] as const).forEach(k => { const v = j[k] || "", t = tidy(v); if (v && t !== v) { n[k] = t; ch.push(k === "hechos" ? "Exposición de los hechos" : k === "med" ? "Medidas adoptadas" : "Observaciones"); } });
    const m = j.mot.trim(); if (m && m !== m.charAt(0).toUpperCase() + m.slice(1)) { n.mot = m.charAt(0).toUpperCase() + m.slice(1); ch.push("Motivo"); }
    set(n); setFixed(ch); };
  const txt = justText(c, { ...j, por: me.n, t: c.j?.t || Date.now() });
  return (
    <Modal open onClose={onClose} size="xl" icon={<FileText />} title={`Justificación del 10-80 Nº ${String(c.no).padStart(4, "0")}`}
      desc={<span className="flex flex-wrap items-center gap-1.5"><b>{c.ag}</b><RankBadge r={c.r} /><span className="text-xs">· {c.esc} · {fullDT(c.t)} · citó {c.por}</span></span>}
      footer={<><Button variant="ghost" className="mr-auto" onClick={onClose}>Cerrar</Button>
        <Button icon={<CheckCircle2 />} onClick={() => { if (need.length) { toast("Falta: " + need.join(", "), "err"); return; } onSave({ ...j, mot: j.mot.trim(), hechos: tidy(j.hechos), med: tidy(j.med), obs: j.obs ? tidy(j.obs) : "", por: me.n, t: Date.now() }); }}>Guardar justificación</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Motivo"><Predict value={j.mot} onChange={v => set({ mot: v })} list={MOT} placeholder="Ej: Ascenso, llamado de atención…" /></Field>
            <Field label="Fecha de la reunión"><Input value={fd} placeholder="dd/mm/aaaa" inputMode="numeric" onChange={e => setFd(maskDMY(e.target.value))}
              onBlur={() => { const v = fd.trim(); if (!v) { set({ f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · dd/mm/aaaa", "err"); return; } set({ f: iso }); }} /></Field>
          </div>
          <Field label="Asistencia"><div className="flex flex-wrap gap-1.5">{ASIS.map(([k, l, col]) => (
            <button key={k} type="button" onClick={() => set({ asis: k })} className={cn("rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition", j.asis !== k && "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}
              style={j.asis === k ? { borderColor: col, background: col + "1c", color: col } : undefined}>{l}</button>))}</div></Field>
          <Field label="Exposición de los hechos"><Textarea rows={4} value={j.hechos} onChange={e => set({ hechos: e.target.value })} placeholder="Qué motivó la citación y qué se habló en la reunión…" /></Field>
          <Field label="Medidas adoptadas y resolución"><Textarea rows={3} value={j.med} onChange={e => set({ med: e.target.value })} placeholder="Escribí o sumá una de las de abajo…" />
            <div className="mt-1.5 flex flex-wrap gap-1">{MED.map(m => { const on = j.med.includes(m); return (
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
