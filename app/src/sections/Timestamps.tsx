/* Hora para Discord: elegís día y hora y te da la marca de tiempo <t:…> en cada formato. Cada lector la ve en su propia hora. */
import { useState } from "react";
import { Check, Clock, Copy, RotateCcw } from "lucide-react";
import { Button, Card, Field, Input } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { TS_FMT, ts, unixOf } from "@/lib/discord";
import { cn } from "@/lib/cn";

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function Timestamps() {
  const { toast } = useFeedback(), now = new Date();
  const [fecha, setFecha] = useState(toDate(now)), [hora, setHora] = useState(toTime(now)), [hit, setHit] = useState("");
  const u = unixOf(fecha, hora);
  const set = (d: Date) => { setFecha(toDate(d)); setHora(toTime(d)); };
  const plus = (min: number) => set(new Date((u || Date.now() / 1000) * 1000 + min * 60000));
  const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); set(d); };
  const copy = (t: string, k: string) => { void navigator.clipboard?.writeText(t); setHit(k); toast("Copiado: pegalo en Discord"); setTimeout(() => setHit(""), 1500); };
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2"><Clock className="size-5 text-brand-500" /><h2 className="font-display text-lg font-semibold">Elegí el momento</h2></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Día"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
          <Field label="Hora"><Input type="time" value={hora} onChange={e => setHora(e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([["Ahora", () => set(new Date())], ["+15 min", () => plus(15)], ["+1 h", () => plus(60)], ["Hoy 20:00", () => at(0, 20)], ["Hoy 22:00", () => at(0, 22)], ["Mañana 20:00", () => at(1, 20)]] as [string, () => void][]).map(([l, f]) =>
            <button key={l} onClick={f} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300">{l}</button>)}
        </div>
        <p className="text-xs leading-relaxed text-slate-500">Se toma tu hora local ({tz || "este dispositivo"}). En Discord cada uno la ve convertida a su propia zona horaria, así no hay confusiones entre países.</p>
        <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => set(new Date())}>Volver a ahora</Button>
      </Card>
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {TS_FMT.map(([f, l]) => { const code = u ? `<t:${u}:${f}>` : "", k = f; return (
          <div key={f} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-[9rem]"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className="font-medium">{u ? ts(u, f) : "—"}</p></div>
            <code className="ml-auto rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{code || "—"}</code>
            <button disabled={!u} onClick={() => copy(code, k)} aria-label={`Copiar ${l}`} className={cn("rounded-lg p-2 transition", hit === k ? "text-emerald-500" : "text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800")}>
              {hit === k ? <Check className="size-4" /> : <Copy className="size-4" />}</button>
          </div>); })}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 dark:bg-slate-900/40">
          Combinado para comunicados: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">{u ? `<t:${u}:F> (<t:${u}:R>)` : "—"}</code>
          <Button size="sm" variant="outline" className="ml-auto" icon={<Copy />} disabled={!u} onClick={() => copy(`<t:${u}:F> (<t:${u}:R>)`, "combo")}>Copiar</Button>
        </div>
      </Card>
    </div>
  );
}
