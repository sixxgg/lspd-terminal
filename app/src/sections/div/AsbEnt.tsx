/* ASB · Entrevistas a aspirantes a administrativo: preguntas fijas (más las que agregue el entrevistador), nota del 1 al 5 por respuesta,
   resultado y texto para Discord. Se guarda en lspdt.drec.asb.ent (solo la ASB lo ve). */
import { useState } from "react";
import { ChevronDown, ClipboardList, Copy, MessageCircle, Pencil, Plus, RotateCcw, Save, Trash2, UserRoundPlus, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Textarea, SearchInput } from "@/components/ui";
import { AgentCombo } from "@/components/agents";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { hoyISO, norm, uid } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const ASB_PREG = [
  "Preséntate: nombre, edad y a qué te dedicas actualmente.",
  "¿Por qué quieres trabajar como administrativo en el LSPD?",
  "¿Tienes experiencia previa en tareas administrativas, de oficina o de atención al público?",
  "¿Qué disponibilidad horaria tienes durante la semana?",
  "Si llegan muchas solicitudes a la vez, ¿cómo organizarías la documentación y los registros?",
  "Un agente te pide un documento que no le corresponde ver. ¿Qué haces?",
  "¿Cómo atenderías a un ciudadano molesto que exige ser atendido de inmediato?",
  "¿Qué entiendes por confidencialidad y por qué es importante en un departamento de policía?",
  "¿Manejas Discord, Google Docs / Sheets u otras herramientas parecidas?",
  "Si te equivocas al cargar un dato importante, ¿cómo lo resuelves?",
  "¿Cómo trabajas en equipo y cómo recibes las correcciones de un superior?",
  "¿Qué aportarías al Administration Services Bureau?",
];
const RES = [["Apto", "#22c55e"], ["En evaluación", "#f59e0b"], ["No apto", "#ef4444"]] as const;
type QA = { q: string; a: string; s: number };
type Ent = { id: string; t: number; by: string; n: string; tel: string; dc: string; fecha: string; ent: string; qa: QA[]; res: string; obs: string };
const blank = (me: string): Ent => ({ id: "", t: 0, by: me, n: "", tel: "", dc: "", fecha: hoyISO(), ent: me, qa: ASB_PREG.map(q => ({ q, a: "", s: 0 })), res: "En evaluación", obs: "" });
const score = (x: Ent) => { const r = x.qa.filter(q => q.s); return { sum: r.reduce((a, q) => a + q.s, 0), max: x.qa.length * 5, n: r.length }; };
const resC = (r: string) => RES.find(x => x[0] === r)?.[1] || "#94a3b8";
function entText(x: Ent) {
  const s = score(x);
  return [`## 🗂️ Entrevista · Aspirante a administrativo (ASB)`, `**Aspirante:** ${x.n || "—"}${x.tel ? ` · 📞 ${x.tel}` : ""}${x.dc ? ` · ${x.dc}` : ""}`, `**Entrevistador:** ${x.ent}`,
    `**Fecha:** ${x.fecha.split("-").reverse().join("/")}`, "", ...x.qa.flatMap((q, i) => [`**${i + 1}. ${q.q}**`, `${q.a.trim() || "—"}${q.s ? `  ·  ${q.s}/5` : ""}`]), "",
    `**Puntuación:** ${s.sum}/${s.max}`, `**Resultado:** ${x.res}`, ...(x.obs.trim() ? [`**Observaciones:** ${x.obs.trim()}`] : [])].join("\n");
}

export function AsbEnt({ co }: { co: boolean }) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [L, setL] = useJSON<Ent[]>("lspdt.drec.asb.ent", []);
  const [x, setX] = useState<Ent>(() => blank(me.n)), [open, setOpen] = useState(""), [q, setQ] = useState(""), [f, setF] = useState(""), [nq, setNq] = useState("");
  const up = (p: Partial<Ent>) => setX({ ...x, ...p }), qa = (i: number, p: Partial<QA>) => up({ qa: x.qa.map((y, j) => (j === i ? { ...y, ...p } : y)) });
  const s = score(x);
  const save = () => {
    if (!x.n.trim()) { toast("Poné el nombre del aspirante", "err"); return; }
    const r = { ...x, n: x.n.trim(), id: x.id || uid(), t: x.t || Date.now() };
    setL([...L.filter(i => i.id !== r.id), r]); setX(r); toast(x.id ? "Entrevista actualizada" : "Entrevista guardada");
  };
  const H = L.slice().sort((a, b) => b.t - a.t).filter(e => (!f || e.res === f) && (!q || norm(e.n + " " + e.ent).includes(norm(q))));
  return (
    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader icon={<UserRoundPlus />} title={x.id ? `Entrevista · ${x.n}` : "Nueva entrevista"} desc="Aspirantes a administrativo: una nota del 1 al 5 por respuesta."
          action={x.id ? <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setX(blank(me.n))}>Nueva</Button> : undefined} />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Aspirante"><Input value={x.n} onChange={e => up({ n: e.target.value })} placeholder="Nombre y apellido" /></Field>
            <Field label="Fecha"><Input type="date" value={x.fecha} onChange={e => up({ fecha: e.target.value })} /></Field>
            <Field label="Teléfono" hint="(opcional)"><Input value={x.tel} onChange={e => up({ tel: e.target.value })} /></Field>
            <Field label="Discord" hint="(opcional)"><Input value={x.dc} onChange={e => up({ dc: e.target.value })} /></Field>
          </div>
          <Field label="Entrevistador"><AgentCombo value={x.ent} onChange={n => up({ ent: n })} /></Field>
          <ol className="space-y-2.5">{x.qa.map((y, i) => (
            <li key={i} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-500 dark:bg-slate-800">{i + 1}</span>
                <p className="flex-1 text-sm font-semibold leading-snug">{y.q}</p>
                {i >= ASB_PREG.length && <button aria-label="Quitar pregunta" onClick={() => up({ qa: x.qa.filter((_, j) => j !== i) })} className="rounded p-0.5 text-slate-400 hover:text-red-500"><X className="size-4" /></button>}</div>
              <Textarea rows={2} className="mt-2" value={y.a} onChange={e => qa(i, { a: e.target.value })} placeholder="Respuesta del aspirante" />
              <div className="mt-2 flex items-center gap-1"><span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nota</span>
                {[1, 2, 3, 4, 5].map(v => <button key={v} onClick={() => qa(i, { s: y.s === v ? 0 : v })} aria-pressed={y.s === v}
                  className={cn("size-7 rounded-lg text-xs font-bold transition", y.s >= v && y.s ? (y.s >= 4 ? "bg-emerald-500 text-white" : y.s >= 3 ? "bg-amber-400 text-amber-950" : "bg-red-500 text-white") : "bg-slate-100 text-slate-400 hover:text-slate-700 dark:bg-slate-800")}>{v}</button>)}</div>
            </li>))}</ol>
          <div className="flex gap-2"><Input value={nq} onChange={e => setNq(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && nq.trim()) { up({ qa: [...x.qa, { q: nq.trim(), a: "", s: 0 }] }); setNq(""); } }} placeholder="Agregar una pregunta…" />
            <Button variant="outline" icon={<Plus />} disabled={!nq.trim()} onClick={() => { up({ qa: [...x.qa, { q: nq.trim(), a: "", s: 0 }] }); setNq(""); }}>Agregar</Button></div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
            <div className="flex items-center gap-3"><p className="flex-1 text-sm font-semibold">Puntuación</p><p className="font-mono text-lg font-bold">{s.sum}<span className="text-sm text-slate-400">/{s.max}</span></p></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${(s.sum / s.max) * 100}%` }} /></div>
            <div className="mt-3 flex flex-wrap gap-1.5">{RES.map(([r, c]) => <button key={r} onClick={() => up({ res: r })} aria-pressed={x.res === r} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", x.res === r ? "text-white" : "border-slate-200 text-slate-500 dark:border-slate-700")} style={x.res === r ? { background: c, borderColor: c } : undefined}>{r}</button>)}</div>
            <Textarea rows={2} className="mt-3" value={x.obs} onChange={e => up({ obs: e.target.value })} placeholder="Observaciones (opcional)" />
          </div>
          <div className="flex flex-wrap gap-2"><Button icon={<Save />} onClick={save}>{x.id ? "Guardar cambios" : "Guardar entrevista"}</Button><Button variant="outline" icon={<Copy />} onClick={() => void copy(entText(x))}>Copiar para Discord</Button></div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader icon={<ClipboardList />} title={`Entrevistas registradas (${L.length})`} />
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 pb-3 dark:border-slate-800"><SearchInput className="min-w-[10rem] flex-1" value={q} onChange={setQ} placeholder="Buscar aspirante…" />
          {RES.map(([r, c]) => <button key={r} onClick={() => setF(f === r ? "" : r)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition", f === r ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}><span className="size-2 rounded-full" style={{ background: c }} />{r} ({L.filter(e => e.res === r).length})</button>)}</div>
        {!H.length ? <Empty icon={<MessageCircle />} title="Sin entrevistas" /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{H.map(e => { const o = open === e.id, sc = score(e); return (
          <div key={e.id}>
            <button onClick={() => setOpen(o ? "" : e.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: resC(e.res) }} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{e.n}</b><span className="text-xs text-slate-500">{e.fecha.split("-").reverse().join("/")} · {e.ent}</span></span>
              <span className="font-mono text-xs font-bold text-slate-500">{sc.sum}/{sc.max}</span><ChevronDown className={cn("size-4 text-slate-400 transition", o && "rotate-180")} /></button>
            {o && <div className="space-y-2 bg-slate-50/60 px-5 pb-4 pt-1 text-sm dark:bg-slate-900/40">
              {e.qa.map((y, i) => <div key={i}><p className="text-xs font-semibold text-slate-500">{i + 1}. {y.q}{y.s ? ` · ${y.s}/5` : ""}</p><p className="whitespace-pre-wrap">{y.a || "—"}</p></div>)}
              {e.obs && <p className="rounded-lg bg-white p-2 text-xs dark:bg-slate-800"><b>Observaciones:</b> {e.obs}</p>}
              <div className="flex flex-wrap gap-2 pt-1"><Button size="sm" variant="outline" icon={<Copy />} onClick={() => void copy(entText(e))}>Discord</Button>
                <Button size="sm" variant="outline" icon={<Pencil />} onClick={() => setX(e)}>Editar</Button>
                {(co || e.by === me.n) && <Button size="sm" variant="ghost" className="ml-auto text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (await confirm(`¿Borrar la entrevista de ${e.n}?`, { danger: true })) setL(L.filter(i => i.id !== e.id)); }}>Borrar</Button>}</div>
            </div>}
          </div>); })}</div>}
      </Card>
    </div>);
}
