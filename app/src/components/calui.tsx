/* piezas del calendario que se usan en la sección y en cada división: tarjeta con banner y detalle del evento */
import { Bell, BellOff, CalendarDays, Check, Copy, Globe2, MapPin, Star, UserRound } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { useCopy } from "@/components/output";
import { LS } from "@/lib/store";
import { srcOf } from "@/lib/domain";
import { banKey, calAck, calSetAck, calText, fmtWhen, hasTime, isToday, type CalItem } from "@/lib/calendar";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

export const banSrc = (e: { id: string; ban?: boolean }) => (e.ban ? srcOf(LS.get(banKey(e.id)) || "") : "");
const TIPO_C: Record<string, string> = { "Práctica": "#22c55e", "Instrucción": "#38bdf8", "Evento": "#f472b6", "Reunión": "#a78bfa", "Operativo": "#f97316", "Otro": "#94a3b8" };
export const tipoC = (t: string) => TIPO_C[t] || "#94a3b8";

/* banner del evento (o un fondo con la fecha grande si no tiene) */
function EvBanner({ e, className }: { e: CalItem; className?: string }) {
  const src = banSrc(e), d = new Date(e.at);
  return (
    <div className={cn("relative aspect-[16/7] overflow-hidden bg-slate-900", className)} style={src ? undefined : { background: `radial-gradient(circle at 80% 0%, ${e.col}55, transparent 60%), linear-gradient(135deg, #0f172a, #020617)` }}>
      {src ? <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
        : <div className="absolute inset-0 flex items-end justify-between p-4 text-white"><span className="font-display text-5xl font-bold leading-none tabular-nums opacity-90">{d.getDate()}</span>
          <span className="text-right font-mono text-[11px] font-bold uppercase tracking-[.2em] opacity-60">{d.toLocaleDateString("es-AR", { month: "long" })}<br />{e.ab}</span></div>}
      <span className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow" style={{ background: tipoC(e.tipo) }}>{e.tipo}</span>
      {isToday(e.at) && <span className="absolute right-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow">Hoy</span>}
    </div>);
}

export function EvCard({ e, onClick, actions }: { e: CalItem; onClick?: () => void; actions?: React.ReactNode }) {
  const me = useMe(), ack = calAck(me.n)[e.id] || {}, past = e.at < Date.now() - 3 * 36e5;
  return (
    <div className={cn("group overflow-hidden rounded-2xl border border-slate-200 bg-white transition dark:border-slate-800 dark:bg-slate-900/60", onClick && "hover:-translate-y-0.5 hover:shadow-lg", past && "opacity-60")}>
      <button onClick={onClick} disabled={!onClick} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
        <EvBanner e={e} />
        <div className="space-y-1 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: e.col }}>{e.pub && <Globe2 className="size-3" />}{e.ab}{ack.a && <Star className="ml-auto size-3.5 fill-amber-400 text-amber-400" aria-label="Anotado" />}</p>
          <p className="line-clamp-2 font-semibold leading-snug">{e.n}</p>
          <p className="text-xs text-slate-500">{fmtWhen(e)}</p>
        </div>
      </button>
      {actions && <div className="flex flex-wrap gap-1 border-t border-slate-100 px-2.5 py-2 dark:border-slate-800">{actions}</div>}
    </div>);
}

/* detalle: banner grande, hora en la zona de quien lo mira y en formato Discord, y lo personal (anotarme / recordarme) */
export function EvModal({ e, onClose }: { e: CalItem | null; onClose: () => void }) {
  const me = useMe(), copy = useCopy();
  if (!e) return null;
  const ack = calAck(me.n)[e.id] || {}, u = Math.floor(e.at / 1000);
  const remindAt = Math.max(Date.now() + 6e4, e.at - 30 * 6e4);
  return (
    <Modal open onClose={onClose} size="md" icon={<CalendarDays />} title={e.n} desc={`${e.tipo} · ${e.dn}`}
      footer={<>
        <Button variant="ghost" icon={<Copy />} className="mr-auto" onClick={() => void copy(calText(e, e.ab))}>Copiar para Discord</Button>
        {e.at > Date.now() && <Button variant="outline" icon={ack.at ? <BellOff /> : <Bell />} onClick={() => calSetAck(me.n, e.id, { at: ack.at ? 0 : remindAt })}>{ack.at ? "Quitar recordatorio" : "Recordármelo"}</Button>}
        <Button icon={ack.a ? <Check /> : <Star />} variant={ack.a ? "outline" : "primary"} onClick={() => calSetAck(me.n, e.id, { a: ack.a ? 0 : Date.now() })}>{ack.a ? "Anotado" : "Anotarme"}</Button></>}>
      <div className="-mx-5 -mt-5"><EvBanner e={e} className="aspect-[16/6]" /></div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Info i={<CalendarDays />} k="Cuándo (tu hora)">{fmtWhen(e)}</Info>
        <Info i={<UserRound />} k="Creador del evento">{e.cre || "—"}</Info>
        <Info i={<MapPin />} k="División">{e.dn}</Info>
        <Info i={<Globe2 />} k="Para">{e.pub ? "Todo el departamento" : e.src === "ins" ? "Instructores e implicados" : `Integrantes de ${e.ab}`}</Info>
      </div>
      {hasTime(e) && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#313338] px-3 py-2 font-mono text-xs text-slate-200">
        <span className="text-slate-400">Discord</span><code className="rounded bg-black/30 px-1.5 py-0.5">{`<t:${u}:F>`}</code><code className="rounded bg-black/30 px-1.5 py-0.5">{`<t:${u}:R>`}</code>
        <button className="ml-auto inline-flex items-center gap-1 font-sans font-semibold text-sky-300 hover:underline" onClick={() => void copy(`<t:${u}:F> (<t:${u}:R>)`)}><Copy className="size-3.5" />Copiar hora</button></div>}
      {e.desc?.trim() && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">{e.desc}</p>}
      {ack.at ? <p className="text-xs text-slate-500">Te lo recuerdo el {new Date(ack.at).toLocaleString("es-AR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} h.</p> : null}
    </Modal>);
}
function Info({ i, k, children }: { i: React.ReactNode; k: string; children: React.ReactNode }) {
  return <div className="flex gap-2.5 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"><span className="mt-0.5 text-slate-400 [&_svg]:size-4">{i}</span><div className="min-w-0"><p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{k}</p><p className="text-sm font-semibold">{children}</p></div></div>;
}
