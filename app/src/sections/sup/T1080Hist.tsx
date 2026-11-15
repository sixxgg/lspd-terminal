/* Historial de 10-80: cada citación guardada, con su justificación posterior.
   La justificación genera un mensaje formal (estilo feedback) en formato Discord o web, para publicarlo en la página.
   Supervisores usan lspdt.t1080; la PSB, lspdt.psbCit (solo la ven sus miembros). */
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, MapPin, Pencil, Radio, Search, Trash2 } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput, Select, Textarea } from "@/components/ui";
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

const MOT = ["Llamado de atención", "Seguimiento del servicio", "Feedback", "Entrevista personal", "Medida disciplinaria", "Reconocimiento", "Investigación interna", "Otro"];
const ASIS = [["si", "Se presentó en tiempo y forma", "#10b981"], ["tarde", "Se presentó con demora", "#f59e0b"], ["no", "No se presentó", "#ef4444"]] as const;
const dts = (t: number, f = "f") => `<t:${Math.floor(t / 1000)}:${f}>`;
const q = (s: string) => s.trim().split("\n").map(l => "> " + l).join("\n");

/* mensaje formal: encabezado, datos, desarrollo y constancia final */
function justText(c: Cit1080, j: Just) {
  const art = genderOf(c.ag) === "f" ? "la" : "el", ag = `${rankES(c.r)} ${c.ag}${c.p ? ` (#${String(c.p).replace(/\D/g, "")})` : ""}`, sup = `${rankES(c.pr || "")} ${c.por}`.trim();
  const mot = j.mot === "Otro" ? j.motx?.trim() || "Otro" : j.mot, asis = ASIS.find(x => x[0] === j.asis)?.[1] || "";
  const fecha = j.f ? dts(new Date(`${j.f}T12:00:00-03:00`).getTime(), "D") : dts(c.t, "D");
  const cierre = j.asis === "no" ? `quien no se presentó a la citación. La inasistencia queda registrada a los efectos que correspondan.`
    : `quien se presentó${j.asis === "tarde" ? " con demora" : " en tiempo y forma"} y fue atendid${art === "la" ? "a" : "o"} por la supervisión.`;
  return [
    `## 📻 JUSTIFICACIÓN DE 10-80 · Nº ${String(c.no).padStart(4, "0")}`,
    `**Los Santos Police Department — Supervisión**`, "",
    `**Agente citado:** ${ag}`, `**Citado por:** ${sup}`, `**Fecha de la citación:** ${dts(c.t)}`, `**Fecha de la reunión:** ${fecha}`,
    `**Escenario:** ${c.esc}`, `**Motivo:** ${mot}`, `**Asistencia:** ${asis}`, "",
    `Por medio de la presente se deja constancia de que ${art} ${ag} fue citad${art === "la" ? "a" : "o"} mediante el código 10-80 por ${sup}, ${cierre}`, "",
    "### 📝 Exposición de los hechos", q(j.hechos), "",
    "### ⚖️ Medidas adoptadas y resolución", q(j.med),
    ...(j.obs?.trim() ? ["", "### 🗒️ Observaciones", q(j.obs)] : []), "",
    "Sin otro particular, se eleva la presente a los efectos que correspondan.", "",
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
  const need = [!j.hechos.trim() && "exposición de los hechos", !j.med.trim() && "medidas adoptadas", j.mot === "Otro" && !j.motx?.trim() && "motivo", !j.f && "fecha de la reunión"].filter(Boolean) as string[];
  const txt = justText(c, { ...j, por: me.n, t: c.j?.t || Date.now() });
  return (
    <Modal open onClose={onClose} size="xl" icon={<FileText />} title={`Justificación del 10-80 Nº ${String(c.no).padStart(4, "0")}`}
      desc={<span className="flex flex-wrap items-center gap-1.5"><b>{c.ag}</b><RankBadge r={c.r} /><span className="text-xs">· {c.esc} · {fullDT(c.t)} · citó {c.por}</span></span>}
      footer={<><Button variant="ghost" className="mr-auto" onClick={onClose}>Cerrar</Button>
        <Button icon={<CheckCircle2 />} onClick={() => { if (need.length) { toast("Falta: " + need.join(", "), "err"); return; } onSave({ ...j, hechos: j.hechos.trim(), med: j.med.trim(), obs: j.obs?.trim(), por: me.n, t: Date.now() }); }}>Guardar justificación</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Motivo"><Select value={j.mot} onChange={e => set({ mot: e.target.value })}>{MOT.map(m => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Fecha de la reunión"><Input value={fd} placeholder="dd/mm/aaaa" inputMode="numeric" onChange={e => setFd(maskDMY(e.target.value))}
              onBlur={() => { const v = fd.trim(); if (!v) { set({ f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · dd/mm/aaaa", "err"); return; } set({ f: iso }); }} /></Field>
          </div>
          {j.mot === "Otro" && <Field label="¿Cuál?"><Input value={j.motx || ""} onChange={e => set({ motx: e.target.value })} placeholder="Motivo de la citación" /></Field>}
          <Field label="Asistencia"><div className="flex flex-wrap gap-1.5">{ASIS.map(([k, l, col]) => (
            <button key={k} type="button" onClick={() => set({ asis: k })} className={cn("rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition", j.asis !== k && "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}
              style={j.asis === k ? { borderColor: col, background: col + "1c", color: col } : undefined}>{l}</button>))}</div></Field>
          <Field label="Exposición de los hechos"><Textarea rows={4} value={j.hechos} onChange={e => set({ hechos: e.target.value })} placeholder="Qué motivó la citación y qué se habló en la reunión…" /></Field>
          <Field label="Medidas adoptadas y resolución"><Textarea rows={3} value={j.med} onChange={e => set({ med: e.target.value })} placeholder="Ej: se le recordó el artículo 7 de la normativa; queda en seguimiento por 2 semanas…" /></Field>
          <Field label="Observaciones" hint="(opcional)"><Textarea rows={2} value={j.obs || ""} onChange={e => set({ obs: e.target.value })} /></Field>
        </div>
        <DiscordOutput title="Justificación del 10-80" text={txt} need={need} sticky={false} />
      </div>
    </Modal>);
}
