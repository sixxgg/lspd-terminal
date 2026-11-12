/* Calendario del departamento: mes con los eventos de las divisiones (los que cada uno puede ver), próximos con banner y filtros */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button, Card, Empty, Segmented } from "@/components/ui";
import { EvCard, EvModal, tipoC } from "@/components/calui";
import { calAck, calAll, calMarkSeen, calMine, dayKey, fmtWhen, type CalItem } from "@/lib/calendar";
import { useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const WD = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export function Calendario() {
  useStoreVersion();
  const me = useMe(), [, bump] = useState(0);
  useEffect(() => { calMarkSeen(me.n); const f = () => bump(x => x + 1); window.addEventListener("lspdt:cal", f); return () => window.removeEventListener("lspdt:cal", f); }, [me.n]);
  const [ver, setVer] = useState<"mine" | "all" | "ano">("mine"), [div, setDiv] = useState(""), [m, setM] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [cur, setCur] = useState<CalItem | null>(null), [day, setDay] = useState("");
  const ack = calAck(me.n);
  const ALL = calAll(), L = ALL.filter(e => (ver === "all" || (ver === "ano" ? !!ack[e.id]?.a : calMine(e, me.n))) && (!div || e.d === div));
  const divs = useMemo(() => [...new Map(ALL.map(e => [e.d, e])).values()].sort((a, b) => a.ab.localeCompare(b.ab)), [ALL.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const by = useMemo(() => { const o = new Map<string, CalItem[]>(); for (const e of L) { const k = dayKey(e.at); o.set(k, [...(o.get(k) || []), e]); } return o; }, [L]);
  /* grilla del mes empezando en lunes */
  const first = new Date(m), off = (first.getDay() + 6) % 7, cells = Array.from({ length: Math.ceil((off + new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()) / 7) * 7 }, (_, i) => new Date(m.getFullYear(), m.getMonth(), 1 - off + i));
  const today = dayKey(Date.now()), now = Date.now() - 3 * 36e5;
  const list = day ? L.filter(e => dayKey(e.at) === day) : L.filter(e => e.at >= now).slice(0, 24);
  const mv = (k: number) => { setM(new Date(m.getFullYear(), m.getMonth() + k, 1)); setDay(""); };
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Segmented size="sm" value={ver} onChange={v => setVer(v)} options={[{ value: "mine", label: "Para mí" }, { value: "all", label: "Todo lo que veo" }, { value: "ano", label: <span className="inline-flex items-center gap-1"><Star className="size-3.5" />Anotados</span> }]} />
        <div className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto">
          <button onClick={() => setDiv("")} className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition", !div ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>Todas</button>
          {divs.map(e => <button key={e.d} onClick={() => setDiv(div === e.d ? "" : e.d)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition", div === e.d ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
            <span className="size-2 rounded-full" style={{ background: e.col }} />{e.ab}</button>)}
        </div>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="flex-1 font-display text-lg font-semibold first-letter:uppercase">{m.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</h2>
            <Button size="sm" variant="outline" onClick={() => { const d = new Date(); setM(new Date(d.getFullYear(), d.getMonth(), 1)); setDay(today); }}>Hoy</Button>
            <Button size="sm" variant="ghost" icon={<ChevronLeft />} aria-label="Mes anterior" onClick={() => mv(-1)} /><Button size="sm" variant="ghost" icon={<ChevronRight />} aria-label="Mes siguiente" onClick={() => mv(1)} />
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">{WD.map(w => <div key={w} className="py-2">{w}</div>)}</div>
          <div className="grid grid-cols-7">
            {cells.map(d => { const k = dayKey(+d), ev = by.get(k) || [], out = d.getMonth() !== m.getMonth(), sel = day === k; return (
              <button key={k} onClick={() => setDay(sel ? "" : k)} aria-pressed={sel} aria-label={`${d.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}: ${ev.length} eventos`}
                className={cn("relative flex min-h-[5.2rem] flex-col items-stretch gap-0.5 border-b border-r border-slate-100 p-1.5 text-left transition last:border-r-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:border-slate-800/80 dark:hover:bg-slate-800/40 [&:nth-child(7n)]:border-r-0",
                  out && "opacity-40", sel && "bg-brand-50 dark:bg-brand-500/10")}>
                <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums", k === today ? "bg-red-500 text-white" : "text-slate-500")}>{d.getDate()}</span>
                {ev.slice(0, 3).map(e => <span key={e.id} className="truncate rounded px-1 py-px text-[10.5px] font-semibold text-white" style={{ background: e.col }} title={`${e.ab} · ${e.n}`}>{e.n}</span>)}
                {ev.length > 3 && <span className="px-1 text-[10px] font-semibold text-slate-400">+{ev.length - 3} más</span>}
              </button>); })}
          </div>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center gap-2"><h3 className="font-semibold first-letter:uppercase">{day ? new Date(cells.find(c => dayKey(+c) === day) || Date.now()).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : "Próximos"}</h3>
            <span className="rounded-md bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800">{list.length}</span>
            {day && <button className="ml-auto text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => setDay("")}>Ver próximos</button>}</div>
          {!list.length ? <Card><Empty icon={<CalendarDays />} title={day ? "Nada ese día" : "Sin eventos próximos"} desc={ver === "mine" ? "Probá con «Todo lo que veo»." : "Las divisiones los cargan desde su pestaña Calendario."} /></Card>
            : list.length > 4 || day ? <div className="space-y-2">{list.map(e => <Row key={e.id} e={e} onClick={() => setCur(e)} />)}</div>
            : <div className="grid gap-3 sm:grid-cols-2">{list.map(e => <EvCard key={e.id} e={e} onClick={() => setCur(e)} />)}</div>}
        </div>
      </div>
      <EvModal e={cur} onClose={() => setCur(null)} />
    </div>);
}
function Row({ e, onClick }: { e: CalItem; onClick: () => void }) {
  const d = new Date(e.at);
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/50">
      <span className="grid w-12 shrink-0 place-items-center rounded-xl py-1.5 text-white" style={{ background: e.col }}><b className="text-lg leading-none tabular-nums">{d.getDate()}</b><span className="text-[9.5px] font-bold uppercase">{d.toLocaleDateString("es-AR", { month: "short" })}</span></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{e.n}</span><span className="block truncate text-xs text-slate-500"><span className="font-semibold" style={{ color: tipoC(e.tipo) }}>{e.tipo}</span> · {e.ab} · {fmtWhen(e, { day: false })}</span></span>
    </button>);
}
