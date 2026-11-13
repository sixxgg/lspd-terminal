/* METRO · examen escrito en línea.
   - ExamTab (miembros y anotados): estado Listo / No disponible, vista previa borrosa y botón para iniciar.
   - ExamAdmin (coordinación): activar o desactivar, duración, hora programada, convocatoria, anotados a mano, resultados,
     banco de preguntas (con la opción correcta, que queda solo en el servidor) y borrar intentos de prueba. */
import { useEffect, useState } from "react";
import { ClipboardCheck, Eye, FlaskConical, Lock, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { ExamStatus } from "@/components/mdexam";
import { AgentCombo } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { exApi, exRefresh, fmtAt, openExam, srvNow, useExam, type ExAtt, type ExBank } from "@/lib/mdexam";
import { getRoster, lvl } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";

type Conv = { id: string; n: string; post: string[] };
const dt = (t?: number) => (t ? new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—");

export function ExamTab() {
  const S = useExam();
  useEffect(() => { void exRefresh(); }, []);
  if (!S) return <Card className="p-8 text-center text-sm text-slate-500">Cargando…</Card>;
  const a = S.me.att, done = a?.st === "done", can = S.me.can, open = S.ready || S.me.co;
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 bg-[linear-gradient(135deg,#0b1a33,#08101d)] px-5 py-5 text-white">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ClipboardCheck className="size-6 text-sky-300" /></span>
          <div className="min-w-0 flex-1"><p className="font-mono text-[10px] font-bold uppercase tracking-[.24em] text-sky-300/80">Metropolitan Division</p>
            <p className="text-xl font-bold">Examen escrito de instructores</p>
            <p className="text-xs text-white/60">{S.n} preguntas de opción múltiple · {S.cfg.dur} minutos{S.cfg.at ? ` · ${fmtAt(S.cfg.at)}` : ""}</p></div>
          <ExamStatus big />
        </div>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <p className="mr-auto text-sm text-slate-500">{done ? (a!.fin === "strikes" ? "Tu examen quedó desaprobado por strikes." : "Ya entregaste el examen. La coordinación te va a comunicar el resultado.")
            : !can ? "No figurás entre los postulantes de esta convocatoria." : a?.st === "run" ? "Tenés el examen en curso." : !open ? (S.cfg.on && S.cfg.at ? `Se habilita el ${fmtAt(S.cfg.at)}. Te avisamos arriba de la pantalla.` : "La coordinación todavía no activó el examen.")
            : S.me.co && !S.ready ? "No está activo: si entrás, queda como prueba de la coordinación." : "Cuando lo inicies arranca el reloj y no se detiene."}</p>
          <Button icon={open && can && !done ? <ClipboardCheck /> : <Lock />} disabled={!can || done || !open} onClick={openExam}
            className={cn(!(can && !done && open) && "!bg-red-500/15 !text-red-500")}>{a?.st === "run" ? "Volver al examen" : "Iniciar examen"}</Button>
        </div>
      </Card>
      {/* vista previa borrosa: no son las preguntas reales */}
      <Card className="relative overflow-hidden p-5">
        <div aria-hidden className="pointer-events-none select-none space-y-4 blur-[6px]">{Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2"><div className="h-3 w-40 rounded bg-sky-500/30" /><div className="h-4 w-11/12 rounded bg-slate-300 dark:bg-slate-700" />
            {[0, 1, 2].map(j => <div key={j} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><span className="size-6 rounded-md bg-slate-200 dark:bg-slate-700" /><span className="h-3 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${55 + ((i + j) * 13) % 35}%` }} /></div>)}</div>))}</div>
        <div className="absolute inset-0 grid place-items-center bg-white/30 dark:bg-slate-950/40"><span className="inline-flex items-center gap-2 rounded-xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-xl"><Lock className="size-4" />Las preguntas se ven al iniciar el examen</span></div>
      </Card>
    </div>);
}

export function ExamAdmin() {
  const S = useExam(), { toast, confirm } = useFeedback();
  const [convs] = useJSON<Conv[]>("lspdt.mdx.conv", [{ id: "C1", n: "Convocatoria 1", post: [] }]);
  const [dur, setDur] = useState(""), [at, setAt] = useState<string | null>(null), [add, setAdd] = useState(""), [view, setView] = useState<ExAtt | null>(null), [bank, setBank] = useState<ExBank | null>(null), [busy, setBusy] = useState(false);
  useEffect(() => { void exRefresh(true); const i = setInterval(() => { if (document.visibilityState === "visible") void exRefresh(true); }, 20e3); return () => clearInterval(i); }, []);
  if (!S || !S.bank) return <Card className="p-8 text-center text-sm text-slate-500">Cargando…</Card>;
  const cfg = S.cfg, min = cfg.min ?? 7;
  const put = async (p: Record<string, unknown>, msg = "Guardado") => { setBusy(true); const r = await exApi({ a: "cfg", cfg: p }); setBusy(false); if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return false; } await exRefresh(true); toast(msg); return true; };
  const reset = async (n?: string) => {
    if (!(await confirm(n ? `¿Borrar el intento de ${n}? Va a poder rendir de nuevo.` : "¿Borrar todas las pruebas de la coordinación?", { danger: true, ok: "Borrar" }))) return;
    const r = await exApi({ a: "reset", ...(n ? { n } : { tests: 1 }) }); if (r.__s !== 200) { toast(r.msg || "No se pudo borrar", "err"); return; } await exRefresh(true); toast("Intento borrado");
  };
  const atts = [...(S.att || [])].sort((a, b) => (b.t1 || b.t0) - (a.t1 || a.t0)), auto = S.auto || [], extra = cfg.extra || [];
  const names = getRoster().filter(a => lvl(a.r) > 0).map(a => a.n);
  const atV = at ?? cfg.at;
  const rowSt = (a: ExAtt) => a.st === "run" ? ["En curso", "#38bdf8"] : a.fin === "strikes" ? ["Anulado (3 strikes)", "#ef4444"] : (a.nota ?? 0) >= min ? ["Aprobado", "#22c55e"] : ["Desaprobado", "#ef4444"];
  return (
    <div className="space-y-4">
      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        <div className="flex items-center gap-3 p-5"><p className="flex-1 text-base font-bold">Configuración</p><ExamStatus big /></div>
        <Row t="Examen activado" d={cfg.on ? (S.ready ? "Listo: los anotados ya pueden iniciarlo." : `Activado, se habilita el ${fmtAt(cfg.at)}.`) : "No disponible: nadie puede abrirlo (la coordinación puede hacer pruebas)."}>
          <button role="switch" aria-checked={cfg.on} disabled={busy} onClick={() => void put({ on: !cfg.on }, cfg.on ? "Examen desactivado" : "Examen activado")}
            className={cn("relative h-6 w-11 rounded-full transition", cfg.on ? "bg-emerald-500 shadow-[0_0_14px_-2px_#22c55e]" : "bg-slate-300 dark:bg-slate-700")}><span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", cfg.on ? "left-[22px]" : "left-0.5")} /></button></Row>
        <Row t="Duración (minutos)" d="Tiempo máximo desde que cada uno lo inicia.">
          <div className="flex gap-2"><Input className="w-24" inputMode="numeric" value={dur || String(cfg.dur)} onChange={e => setDur(e.target.value.replace(/\D/g, ""))} />
            <Button size="sm" disabled={!dur || +dur === cfg.dur} onClick={async () => { if (await put({ dur: +dur })) setDur(""); }}>Guardar</Button></div></Row>
        <Row t="Programado para" d="Opcional. A la hora, a los anotados les aparece el aviso arriba de la pantalla (y 15 min antes).">
          <div className="flex flex-wrap gap-2"><Input type="datetime-local" className="w-56" value={atV} onChange={e => setAt(e.target.value)} />
            <Button size="sm" disabled={atV === cfg.at} onClick={async () => { if (await put({ at: atV })) setAt(null); }}>Guardar</Button>
            {cfg.at && <Button size="sm" variant="ghost" onClick={async () => { if (await put({ at: "" }, "Sin hora programada")) setAt(null); }}>Quitar</Button>}</div></Row>
        <Row t="Convocatoria" d="Sus postulantes entran solos al examen.">
          <Select className="w-56" value={cfg.conv} onChange={e => void put({ conv: e.target.value })}>{convs.map(c => <option key={c.id} value={c.id}>{c.id} · {c.n}</option>)}</Select></Row>
        <Row t="Nota mínima para aprobar" d="Sobre 10.">
          <Select className="w-24" value={String(min)} onChange={e => void put({ min: +e.target.value })}>{[5, 6, 7, 8, 9, 10].map(n => <option key={n}>{n}</option>)}</Select></Row>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2"><p className="flex-1 text-base font-bold">Anotados · {S.en.length}</p>
          <div className="w-72 max-w-full"><AgentCombo value={add} onChange={v => { setAdd(""); if (v && !S.en.includes(v)) void put({ extra: [...extra, v] }, `${v} anotado`); }} names={names} placeholder="Anotar a mano…" /></div></div>
        {S.en.length ? <div className="flex flex-wrap gap-1.5">{S.en.map(n => { const a = atts.find(x => x.n === n), man = extra.includes(n) && !auto.includes(n); return (
          <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-3 pr-1.5 text-xs font-semibold dark:border-slate-700">{n}
            <span className={cn("rounded px-1 text-[10px] font-bold", man ? "bg-violet-500/15 text-violet-500" : "bg-sky-500/15 text-sky-500")}>{man ? "manual" : cfg.conv}</span>
            {a && <span className="text-[10px]" style={{ color: rowSt(a)[1] }}>●</span>}
            {man ? <button aria-label={`Quitar a ${n}`} onClick={() => void put({ extra: extra.filter(x => x !== n) }, `${n} quitado`)} className="rounded-full p-0.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500"><X className="size-3" /></button> : <span className="w-1" />}</span>); })}</div>
          : <p className="text-sm text-slate-500">Nadie todavía. Sumá postulantes a la convocatoria {cfg.conv} (Entrevista de instructor) o anotalos a mano.</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-5 pb-3"><p className="flex-1 text-base font-bold">Resultados · {atts.filter(a => !a.test).length}</p>
          <Button size="sm" variant="outline" icon={<RefreshCw />} onClick={() => void exRefresh(true)}>Actualizar</Button>
          <Button size="sm" variant="outline" icon={<Pencil />} onClick={() => setBank(S.bank!.map(q => ({ ...q, o: [...q.o] })))}>Banco de preguntas ({S.bank.length})</Button>
          <Button size="sm" variant="outline" icon={<FlaskConical />} onClick={openExam} disabled={S.me.att?.st === "done"}>Probar examen</Button>
          {atts.some(a => a.test) && <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => void reset()}>Borrar pruebas</Button>}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[46rem] text-sm">
          <thead><tr className="border-y border-slate-100 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
            {["Agente", "Estado", "Aciertos", "Nota", "Strikes", "Inicio", "Entrega", ""].map(h => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{atts.length ? atts.map(a => { const [t, c] = rowSt(a); return (
            <tr key={a.n} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-3 py-2 font-semibold">{a.n}{a.test && <span className="ml-1.5 rounded bg-amber-400/20 px-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">PRUEBA</span>}</td>
              <td className="px-3 py-2"><span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ color: c, background: c + "1f" }}>{t}</span></td>
              <td className="px-3 py-2 tabular-nums">{a.st === "done" ? `${a.ok}/${a.tot}` : "—"}</td>
              <td className="px-3 py-2 font-bold tabular-nums">{a.st === "done" ? a.nota : "—"}</td>
              <td className="px-3 py-2"><span className={cn("tabular-nums", a.strikes.length && "font-bold text-red-500")}>{a.strikes.length}/3</span></td>
              <td className="px-3 py-2 text-xs text-slate-500">{dt(a.t0)}</td><td className="px-3 py-2 text-xs text-slate-500">{a.st === "run" ? `queda ${Math.max(0, Math.ceil((a.end - srvNow()) / 60e3))} min` : dt(a.t1)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right"><button onClick={() => setView(a)} aria-label="Ver detalle" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Eye className="size-4" /></button>
                <button onClick={() => void reset(a.n)} aria-label="Borrar intento" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button></td>
            </tr>); }) : <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">Nadie rindió todavía.</td></tr>}</tbody></table></div>
      </Card>

      {view && <Modal open onClose={() => setView(null)} size="lg" icon={<ClipboardCheck />} title={view.n} desc={`${rowSt(view)[0]}${view.st === "done" ? ` · ${view.ok}/${view.tot} · nota ${view.nota}` : ""}${view.test ? " · prueba" : ""}`}>
        {view.strikes.length > 0 && <div className="space-y-1 rounded-xl border border-red-500/30 bg-red-500/5 p-3"><p className="text-xs font-bold uppercase tracking-wider text-red-500">Strikes</p>
          {view.strikes.map((s, i) => <p key={i} className="text-sm"><b>{i + 1}.</b> {s.why} <span className="text-xs text-slate-500">· {new Date(s.t).toLocaleTimeString("es-AR", { hourCycle: "h23" })}</span></p>)}</div>}
        {view.det ? <div className="space-y-2">{view.det.map((d, i) => (
          <div key={d.id + i} className={cn("rounded-xl border p-3", d.good ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")}>
            <p className="text-sm font-semibold">{i + 1}. {d.q}</p>
            <p className={cn("mt-1 text-sm", d.good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{d.good ? "✓ " : "✗ "}{d.ch ?? "Sin responder"}</p>
            {!d.good && <p className="mt-0.5 text-xs text-slate-500">Correcta: {d.okT}</p>}</div>))}</div>
          : <p className="text-sm text-slate-500">Todavía lo está rindiendo.</p>}
      </Modal>}
      {bank && <BankModal bank={bank} setBank={setBank} onClose={() => setBank(null)} />}
    </div>);
}

const Row = ({ t, d, children }: { t: string; d: string; children: React.ReactNode }) =>
  <div className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="min-w-[14rem] flex-1"><p className="text-sm font-semibold">{t}</p><p className="text-xs text-slate-500">{d}</p></div>{children}</div>;

function BankModal({ bank, setBank, onClose }: { bank: ExBank; setBank: (b: ExBank) => void; onClose: () => void }) {
  const { toast } = useFeedback(), [busy, setBusy] = useState(false);
  const up = (i: number, p: Partial<ExBank[number]>) => setBank(bank.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const save = async () => { setBusy(true); const r = await exApi({ a: "bank", bank }); setBusy(false); if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return; } await exRefresh(true); toast("Banco guardado"); onClose(); };
  return <Modal open onClose={onClose} size="xl" icon={<Pencil />} title="Banco de preguntas" desc="La opción marcada es la correcta. Se guarda solo en el servidor: al que rinde le llegan mezcladas y sin marcar."
    footer={<><Button variant="ghost" icon={<Plus />} className="mr-auto" onClick={() => setBank([...bank, { id: "", c: "", q: "", o: ["", "", ""], ok: 0 }])}>Agregar pregunta</Button><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Save />} loading={busy} onClick={save}>Guardar</Button></>}>
    <div className="space-y-4">{bank.map((q, i) => (
      <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">{i + 1}</span>
          <Input className="w-48" value={q.c} onChange={e => up(i, { c: e.target.value })} placeholder="Bloque" />
          <button aria-label="Quitar pregunta" onClick={() => setBank(bank.filter((_, j) => j !== i))} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button></div>
        <Field label="Pregunta"><Textarea rows={2} value={q.q} onChange={e => up(i, { q: e.target.value })} /></Field>
        {q.o.map((o, j) => <div key={j} className="flex items-start gap-2">
          <button onClick={() => up(i, { ok: j })} aria-pressed={q.ok === j} title="Marcar como correcta" className={cn("mt-1.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold transition", q.ok === j ? "bg-emerald-500 text-white shadow-[0_0_10px_-2px_#22c55e]" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800")}>{"ABC"[j]}</button>
          <Textarea rows={2} value={o} onChange={e => up(i, { o: q.o.map((x, k) => (k === j ? e.target.value : x)) })} className={cn(q.ok === j && "border-emerald-500/60")} /></div>)}
      </div>))}</div>
  </Modal>;
}
