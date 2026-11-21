/* LSSD › Supervisores › Entrevistas › Resultados: las respuestas del Google Form de la entrevista presencial, leídas de su hoja (api/entres.js).
   La hoja sigue siendo la fuente y desde acá no se edita. El servidor solo se las da a Supervisores para arriba; Jefatura cambia los enlaces. */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, ExternalLink, FileSpreadsheet, Link2, Lock, RefreshCw, UserRound } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { api } from "@/lib/api";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Res = { cols?: string[]; rows?: string[][]; at?: number; form: string; sheet: string; canSet?: boolean; err?: string };
/* «20/11/2026 23:15:02» (formato de Google en español) o «11/20/2026 23:15:02» si el día no puede ser mes */
function ts(s: string): number {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s.trim()); if (!m) { const t = Date.parse(s); return isNaN(t) ? 0 : t; }
  let d = +m[1], mo = +m[2]; if (mo > 12 && d <= 12) [d, mo] = [mo, d];
  return new Date(+m[3], mo - 1, d, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
}
const fmt = (t: number) => (t ? new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export function EntRes() {
  const { toast } = useFeedback(), [d, setD] = useState<Res | null>(null), [busy, setBusy] = useState(false), [q, setQ] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [open, setOpen] = useState<number | null>(null), [ln, setLn] = useState<{ form: string; sheet: string } | null>(null);
  const load = async () => { setBusy(true); const r = await api("/api/entres"); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudieron leer los resultados", "err"); setD({ form: "", sheet: "", err: r.msg || "error" }); return; } setD(r as unknown as Res); };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cols = d?.cols || [], tc = Math.max(0, cols.findIndex(c => /marca temporal|timestamp/i.test(c))), nc = cols.findIndex(c => /nombre|participante|agente|name/i.test(c));
  const qc = cols.map((_, i) => i).filter(i => i !== tc && i !== nc && !/correo|e-?mail|puntuaci/i.test(cols[i]));
  const rows = useMemo(() => (d?.rows || []).map((r, i) => ({ i, t: ts(r[tc] || ""), n: nc >= 0 ? r[nc] || "" : "", r })).sort((a, b) => b.t - a.t), [d, tc, nc]);
  const s = norm(q.trim()), f0 = from ? new Date(from + "T00:00").getTime() : 0, f1 = to ? new Date(to + "T23:59:59").getTime() : Infinity;
  const vis = rows.filter(x => (!s || norm(x.n).includes(s) || x.r.some(v => norm(v).includes(s))) && x.t >= f0 && x.t <= f1);
  const month = rows.filter(x => { const a = new Date(x.t), n = new Date(); return a.getMonth() === n.getMonth() && a.getFullYear() === n.getFullYear(); }).length;
  const cur = open !== null ? rows.find(x => x.i === open) : null;
  const saveLinks = async () => { if (!ln) return; const r = await api("/api/entres", { a: "links", ...ln }); if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return; } toast("Enlaces guardados"); setLn(null); void load(); };
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300"><FileSpreadsheet className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold">Resultados de entrevistas</p><p className="text-xs text-slate-500">Respuestas del formulario de Google. La hoja de cálculo es la fuente: desde acá solo se consultan.</p></div>
        <div className="flex flex-wrap gap-2">
          {d?.form && <a href={d.form} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" icon={<ClipboardList className="size-4" />}>Abrir formulario</Button></a>}
          {d?.sheet && <a href={d.sheet} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" icon={<ExternalLink className="size-4" />}>Ver resultados</Button></a>}
          <Button variant="ghost" size="sm" icon={<RefreshCw className={cn("size-4", busy && "animate-spin")} />} onClick={() => void load()} disabled={busy}>Actualizar</Button>
          {d?.canSet && <Button variant="ghost" size="sm" icon={<Link2 className="size-4" />} onClick={() => setLn({ form: d.form, sheet: d.sheet })}>Enlaces</Button>}
        </div>
      </Card>
      {d?.err === "priv" ? <Card className="flex gap-3 border-amber-500/40 bg-amber-500/[.06] p-4 text-sm">
          <Lock className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div><p className="font-semibold">La hoja no está compartida para leerla desde la terminal</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">En Google Sheets: <b>Compartir › Acceso general › Cualquier persona con el enlace · Lector</b>. Apenas esté, las respuestas aparecen acá solas (tocá Actualizar). Mientras tanto, abrila con <b>Ver resultados</b>.</p></div></Card>
        : d?.err ? <Card className="p-4 text-sm text-slate-500">{d.err}</Card>
        : !d ? <Card className="p-8 text-center text-sm text-slate-500">Cargando respuestas…</Card>
        : <>
          <div className="grid gap-3 sm:grid-cols-3">{([["Respuestas", rows.length], ["Este mes", month], ["Última", rows[0] ? fmt(rows[0].t) : "—"]] as const).map(([l, v]) => (
            <Card key={l} className="p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{l}</p><p className="mt-1 text-xl font-bold tabular-nums">{v}</p></Card>))}</div>
          <Card className="flex flex-wrap items-end gap-3 p-3">
            <SearchInput className="min-w-[14rem] flex-1" value={q} onChange={setQ} placeholder={nc >= 0 ? "Buscar por participante o respuesta…" : "Buscar en las respuestas…"} />
            <label className="text-xs text-slate-500">Desde<Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 h-9" /></label>
            <label className="text-xs text-slate-500">Hasta<Input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 h-9" /></label>
          </Card>
          {!vis.length ? <Card><Empty icon={<FileSpreadsheet />} title={rows.length ? "Ninguna respuesta con esos filtros" : "Todavía no hay respuestas"} /></Card>
            : <Card className="overflow-hidden"><div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[40rem] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800"><th className="px-4 py-3">Fecha y hora</th>{nc >= 0 && <th className="px-4 py-3">Participante</th>}<th className="px-4 py-3">{cols[qc[0]] ? "Primera respuesta" : "Respuestas"}</th></tr></thead>
              <tbody>{vis.map(x => (
                <tr key={x.i} onClick={() => setOpen(x.i)} className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{fmt(x.t)}</td>{nc >= 0 && <td className="px-4 font-semibold">{x.n || "—"}</td>}
                  <td className="max-w-[32rem] truncate px-4 text-slate-500">{qc.map(i => x.r[i]).find(Boolean) || "—"}</td></tr>))}</tbody></table></div></Card>}
          {d.at && <p className="text-center text-[11px] text-slate-400">Leído de la hoja el {fmt(d.at)} · se actualiza cada minuto</p>}
        </>}
      <Modal open={!!cur} onClose={() => setOpen(null)} title={cur?.n || "Entrevista"} desc={cur ? fmt(cur.t) : ""} icon={<UserRound />} size="lg">
        {cur && <ol className="space-y-3">{qc.map((i, k) => (
          <li key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs font-semibold text-slate-500">{k + 1}. {cols[i]}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{cur.r[i]?.trim() || <span className="text-slate-400">Sin respuesta</span>}</p></li>))}</ol>}
      </Modal>
      <Modal open={!!ln} onClose={() => setLn(null)} title="Enlaces del formulario" icon={<CalendarDays />} footer={<><Button variant="ghost" onClick={() => setLn(null)}>Cancelar</Button><Button onClick={() => void saveLinks()}>Guardar</Button></>}>
        {ln && <div className="space-y-3"><Field label="Google Forms"><Input value={ln.form} onChange={e => setLn({ ...ln, form: e.target.value })} /></Field>
          <Field label="Google Sheets (respuestas)"><Input value={ln.sheet} onChange={e => setLn({ ...ln, sheet: e.target.value })} /></Field></div>}
      </Modal>
    </div>);
}
