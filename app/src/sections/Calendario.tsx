/* Calendario del departamento: cabecera con el mes y sus números, filtros por vista y división, grilla del mes con los
   eventos como píldoras (hora + nombre) y, al costado, la agenda agrupada por día (o el día elegido) con el próximo destacado. */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, Eye, Globe2, Plus, ShieldCheck, Star, UserRound } from "lucide-react";
import { EvAccess, EvDetail, EvForm } from "./cal/Eventos";
import { evCan, isoOf, type Ev } from "@/lib/events";
import { Card, Empty } from "@/components/ui";
import { EvModal, banSrc, tipoC } from "@/components/calui";
import { calAck, calAll, calClash, calMarkSeen, calMine, dayKey, fmtWhen, hasTime, isToday, type CalItem } from "@/lib/calendar";
import { ME_ROLES, useStoreVersion } from "@/lib/store";
import { DEPT, DEPTS, type DeptId } from "@/lib/dept";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const WD = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hhmm = (e: CalItem) => (hasTime(e) ? new Date(e.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "");
const dayLbl = (t: number) => { const d = new Date(t), k = dayKey(t), h = new Date(); if (k === dayKey(+h)) return "Hoy"; h.setDate(h.getDate() + 1); if (k === dayKey(+h)) return "Mañana";
  const s = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }); return s.charAt(0).toUpperCase() + s.slice(1); };
const VIEWS = [["mine", "Para mí", UserRound], ["all", "Todo lo que veo", Eye], ["ano", "Anotados", Star]] as const;

export function Calendario() {
  useStoreVersion();
  const me = useMe(), [, bump] = useState(0);
  useEffect(() => { calMarkSeen(me.n); const f = () => bump(x => x + 1); window.addEventListener("lspdt:cal", f); return () => window.removeEventListener("lspdt:cal", f); }, [me.n]);
  const [ver, setVer] = useState<"mine" | "all" | "ano">("mine"), [div, setDiv] = useState(""), [m, setM] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [cur0, setCur] = useState<CalItem | null>(null), [day, setDay] = useState("");
  const [form, setForm] = useState<{ e?: Ev; f?: string } | null>(null), [acc, setAcc] = useState(false), canEv = evCan();
  const cur = cur0 && cur0.src !== "ev" ? cur0 : null, evIt = cur0 && cur0.src === "ev" ? cur0 : null;
  const dayIso = day ? (([y, mo, d]) => isoOf(new Date(y, mo, d)))(day.split("-").map(Number)) : ""; /* dayKey: año-mes(0..11)-día */
  const ack = calAck(me.n);
  /* six ve los tres departamentos juntos (con su marca) para notar lo que se superpone */
  const [dp, setDp] = useState(""), multi = !!ME_ROLES.six;
  const ALL = calAll(), L = ALL.filter(e => (ver === "all" || (ver === "ano" ? !!ack[e.id]?.a : calMine(e, me.n) || (multi && e.dp !== DEPT.id))) && (!div || e.d === div) && (!dp || e.dp === dp));
  const divs = useMemo(() => [...new Map(ALL.map(e => [e.d, e])).values()].sort((a, b) => a.ab.localeCompare(b.ab)), [ALL.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const by = useMemo(() => { const o = new Map<string, CalItem[]>(); for (const e of L) { const k = dayKey(e.at); o.set(k, [...(o.get(k) || []), e]); } o.forEach(v => v.sort((a, b) => a.at - b.at)); return o; }, [L]);
  /* grilla del mes empezando en lunes */
  const off = (m.getDay() + 6) % 7, cells = Array.from({ length: Math.ceil((off + new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()) / 7) * 7 }, (_, i) => new Date(m.getFullYear(), m.getMonth(), 1 - off + i));
  const today = dayKey(Date.now()), now = Date.now() - 3 * 36e5;
  const inMonth = L.filter(e => { const d = new Date(e.at); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); });
  const list = day ? (by.get(day) || []) : L.filter(e => e.at >= now).slice(0, 20);
  const groups = useMemo(() => { const g: [string, CalItem[]][] = []; for (const e of list) { const k = dayLbl(e.at), last = g[g.length - 1]; if (last && last[0] === k) last[1].push(e); else g.push([k, [e]]); } return g; }, [list]);
  const next = !day ? list[0] : undefined;
  const mv = (k: number) => { setM(new Date(m.getFullYear(), m.getMonth() + k, 1)); setDay(""); };
  const stat = (n: number, l: string, c?: string) => <div className="rounded-xl bg-white/10 px-3 py-1.5 text-center backdrop-blur-sm"><b className="block text-lg font-black leading-tight tabular-nums" style={c ? { color: c } : undefined}>{n}</b><span className="text-[10.5px] text-white/75">{l}</span></div>;
  return (
    <div className="space-y-4">
      {/* cabecera: mes, navegación y números */}
      <Card className="overflow-hidden">
        <div className="relative px-5 py-4 text-white" style={{ background: "linear-gradient(120deg, rgb(var(--b-700)), rgb(var(--b-500)) 60%, rgb(var(--b-400)))" }}>
          <div className="pointer-events-none absolute inset-0 opacity-25 [background:repeating-linear-gradient(135deg,transparent_0_14px,rgba(255,255,255,.08)_14px_15px)]" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1">
              <button aria-label="Mes anterior" onClick={() => mv(-1)} className="grid size-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"><ChevronLeft className="size-5" /></button>
              <button aria-label="Mes siguiente" onClick={() => mv(1)} className="grid size-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"><ChevronRight className="size-5" /></button>
            </div>
            <div className="mr-auto"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-white/70">{m.getFullYear()}</p>
              <h2 className="font-display text-3xl font-bold capitalize leading-none">{m.toLocaleDateString("es-AR", { month: "long" })}</h2></div>
            <div className="flex gap-2">{stat(inMonth.length, "este mes")}{stat(by.get(today)?.length || 0, "hoy")}{stat(L.filter(e => ack[e.id]?.a).length, "anotados")}</div>
            <button onClick={() => { const d = new Date(); setM(new Date(d.getFullYear(), d.getMonth(), 1)); setDay(today); }} className="rounded-xl bg-white px-3.5 py-2 text-[12.5px] font-bold text-brand-700 shadow transition hover:bg-white/90">Hoy</button>
            {canEv && <button onClick={() => setForm({ f: dayIso || undefined })} className="inline-flex items-center gap-1.5 rounded-xl bg-black/25 px-3.5 py-2 text-[12.5px] font-bold text-white ring-1 ring-white/30 transition hover:bg-black/35"><Plus className="size-4" />Nuevo evento</button>}
            {(!!ME_ROLES.jef || !!ME_ROLES.six) && <button onClick={() => setAcc(true)} aria-label="Quién carga eventos" title="Quién carga eventos" className="grid size-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"><ShieldCheck className="size-4" /></button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">{VIEWS.map(([k, l, I]) => (
            <button key={k} onClick={() => setVer(k)} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition", ver === k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}><I className="size-3.5" />{l}</button>))}</div>
          {multi && <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">{([["", "Los 3"], ["lspd", "LSPD"], ["lssd", "LSSD"], ["sahp", "SAHP"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setDp(k)} className={cn("rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition", dp === k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>{l}</button>))}</div>}
          <div className="scrollbar-none flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            <button onClick={() => setDiv("")} className={cn("shrink-0 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition", !div ? "border-transparent bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}>Todas</button>
            {divs.map(e => { const on = div === e.d; return (
              <button key={e.d} onClick={() => setDiv(on ? "" : e.d)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition", !on && "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
                style={on ? { background: e.col, borderColor: e.col, color: "#fff" } : undefined}><span className="size-2 rounded-full" style={{ background: on ? "#fff" : e.col }} />{e.ab}</button>); })}
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* mes */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-[10.5px] font-bold uppercase tracking-[.14em] text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">{WD.map((w, i) => <div key={w} className={cn("py-2", i > 4 && "text-brand-500/80")}>{w}</div>)}</div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => { const k = dayKey(+d), ev = by.get(k) || [], out = d.getMonth() !== m.getMonth(), sel = day === k, isT = k === today, wk = i % 7 > 4; return (
              <button key={k} onClick={() => setDay(sel ? "" : k)} aria-pressed={sel} aria-label={`${d.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}: ${ev.length} eventos`}
                className={cn("group relative flex min-h-[5.6rem] flex-col gap-1 border-b border-r border-slate-100 p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:border-slate-800/70 [&:nth-child(7n)]:border-r-0",
                  wk && !out && "bg-slate-500/[.025] dark:bg-white/[.012]", out ? "opacity-35" : "hover:bg-brand-500/[.05]", sel && "!bg-brand-500/10 ring-2 ring-inset ring-brand-500/60", isT && !sel && "bg-brand-500/[.06]")}>
                <span className="flex items-center justify-between">
                  <span className={cn("grid size-7 place-items-center rounded-lg text-[12.5px] font-bold tabular-nums", isT ? "bg-brand-600 text-white shadow-md shadow-brand-500/30 dark:bg-brand-500" : "text-slate-600 dark:text-slate-300")}>{d.getDate()}</span>
                  {ev.length > 0 && <span className="flex gap-0.5">{ev.slice(0, 4).map(e => <i key={e.id} className="size-1.5 rounded-full" style={{ background: e.col }} />)}</span>}
                </span>
                {ev.slice(0, 2).map(e => <span key={e.id} title={`${multi && e.dp ? DEPTS[e.dp].short + " · " : ""}${e.ab} · ${e.n}`} className="flex min-w-0 items-center gap-1 overflow-hidden rounded-r-md py-[3px] pl-1.5 pr-1 text-[10.5px] font-semibold leading-none" style={{ background: e.col + "22", color: e.col, borderLeft: `2.5px solid ${e.col}` }}>
                  {hhmm(e) && <span className="shrink-0 tabular-nums opacity-80">{hhmm(e)}</span>}<span className={cn("truncate text-slate-700 dark:text-slate-200", e.st === "canc" && "line-through opacity-60")}>{e.n}</span></span>)}
                {ev.length > 2 && <span className="px-1 text-[10px] font-bold text-slate-400">+{ev.length - 2} más</span>}
              </button>); })}
          </div>
        </Card>

        {/* agenda */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <CalendarDays className="size-4 text-brand-600 dark:text-brand-300" />
            <h3 className="font-display text-[15px] font-bold">{day ? dayLbl(+(cells.find(c => dayKey(+c) === day) || Date.now())) : "Agenda"}</h3>
            <span className="rounded-full bg-slate-100 px-2 text-[11px] font-bold tabular-nums text-slate-500 dark:bg-slate-800">{list.length}</span>
            {day && canEv && <button className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => setForm({ f: dayIso })}><Plus className="size-3.5" />Evento este día</button>}
            {day && <button className={cn("text-[11.5px] font-semibold text-brand-600 hover:underline dark:text-brand-300", !canEv && "ml-auto")} onClick={() => setDay("")}>Ver lo próximo</button>}
          </div>
          {!list.length ? <Empty icon={<CalendarDays />} title={day ? "Nada ese día" : "Sin eventos próximos"} desc={ver === "mine" ? "Probá con «Todo lo que veo»." : "Las divisiones los cargan desde su pestaña Calendario."} />
            : <div className="space-y-4 p-3">
              {next && <Next e={next} onClick={() => setCur(next)} />}
              {groups.map(([g, es]) => { const rest = es.filter(e => e !== next); if (!rest.length) return null; return (
                <div key={g}><p className="mb-1.5 flex items-center gap-2 px-1 text-[10.5px] font-bold uppercase tracking-[.14em] text-slate-400">{g}<span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" /></p>
                  <div className="space-y-1.5">{rest.map(e => <Row key={e.id} e={e} star={!!ack[e.id]?.a} dept={multi} clash={multi ? calClash(e, ALL) : []} onClick={() => setCur(e)} />)}</div></div>); })}
            </div>}
        </Card>
      </div>
      <EvModal e={cur} onClose={() => setCur(null)} />
      {evIt && <EvDetail it={evIt} onClose={() => setCur(null)} onEdit={e => { setCur(null); setForm({ e }); }} />}
      {form && <EvForm init={form.e} date={form.f} onClose={() => setForm(null)} />}
      {acc && <EvAccess onClose={() => setAcc(false)} />}
    </div>);
}
const DPC: Record<string, string> = { lspd: "#3b82f6", lssd: "#16a34a", sahp: "#d4a64a" };
/* marca del departamento (cuando se ven los tres juntos) */
const DpTag = ({ d }: { d?: string }) => (d ? <span className="rounded px-1.5 py-px text-[10px] font-black tracking-wider text-white" style={{ background: DPC[d] }}>{DEPTS[d as DeptId].short}</span> : null);
function Row({ e, star, onClick, dept, clash }: { e: CalItem; star: boolean; onClick: () => void; dept?: boolean; clash?: string[] }) {
  return (
    <button onClick={onClick} className="group flex w-full items-stretch gap-3 rounded-xl border border-slate-200 bg-white text-left transition hover:border-brand-400/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <span className="w-1 shrink-0 rounded-l-xl" style={{ background: e.col }} />
      <span className="flex w-12 shrink-0 flex-col items-center justify-center py-2 text-center"><Clock className="mb-0.5 size-3 text-slate-400" /><b className="text-[12.5px] tabular-nums">{hhmm(e) || "Día"}</b></span>
      <span className="min-w-0 flex-1 py-2 pr-3">
        <span className="flex items-center gap-1.5"><b className={cn("truncate text-[13.5px] group-hover:text-brand-700 dark:group-hover:text-brand-300", e.st === "canc" && "line-through opacity-60")}>{e.n}</b>
          {e.st === "canc" && <span className="shrink-0 rounded bg-red-500/15 px-1.5 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Cancelado</span>}{e.st === "fin" && <span className="shrink-0 rounded bg-slate-500/15 px-1.5 text-[10px] font-bold uppercase text-slate-500">Finalizado</span>}{star && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}{e.pub && <Globe2 className="size-3 shrink-0 text-slate-400" />}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">{dept && <DpTag d={e.dp} />}<span className="rounded px-1.5 py-px font-bold text-white" style={{ background: e.col }}>{e.ab}</span><span className="font-semibold" style={{ color: tipoC(e.tipo) }}>{e.tipo}</span>{e.cre && <span className="truncate text-slate-500">· {e.cre}</span>}</span>
        {clash && clash.length > 0 && <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400"><AlertTriangle className="size-3" />Se superpone con {clash.map(d => DEPTS[d as DeptId].short).join(" y ")}</span>}
      </span>
    </button>);
}
/* el próximo evento, destacado: banner (si tiene) de fondo, fecha grande y datos */
function Next({ e, onClick }: { e: CalItem; onClick: () => void }) {
  const d = new Date(e.at), src = banSrc(e), h = Math.max(0, Math.round((e.at - Date.now()) / 36e5));
  return (
    <button onClick={onClick} className="group relative block w-full overflow-hidden rounded-2xl text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
      style={{ background: `linear-gradient(120deg, ${e.col}, ${e.col}99 55%, #0b1120)` }}>
      {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover opacity-35 transition group-hover:opacity-45" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-transparent" aria-hidden />
      <div className="relative flex items-center gap-4 p-4">
        <span className="grid w-16 shrink-0 place-items-center rounded-xl bg-white/15 py-2 backdrop-blur-sm"><b className="font-display text-3xl font-bold leading-none tabular-nums">{d.getDate()}</b><span className="text-[10px] font-bold uppercase tracking-wider">{d.toLocaleDateString("es-AR", { month: "short" })}</span></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/80">Lo próximo{isToday(e.at) && <span className="rounded bg-red-500 px-1.5 py-px tracking-wider text-white">Hoy</span>}{!isToday(e.at) && h < 48 && <span className="rounded bg-white/20 px-1.5 py-px tracking-wider">en {h} h</span>}</span>
          <b className="mt-0.5 block truncate text-[17px] leading-tight">{e.n}</b>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/85"><span className="rounded bg-black/25 px-1.5 py-px font-bold">{e.ab}</span><span className="rounded px-1.5 py-px font-bold" style={{ background: tipoC(e.tipo) }}>{e.tipo}</span><span>{fmtWhen(e, { day: false })}</span></span>
        </span>
      </div>
    </button>);
}
