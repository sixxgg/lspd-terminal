/* Inicio, con aire de foro (índice de Invision / postbit de vBulletin):
   - Ficha del agente: portada, avatar, rango con barras, cintas (condecoraciones), divisiones y datos.
   - Escalafón: la carrera completa con el rango propio marcado y el que sigue.
   - Índice: cada área es una categoría y cada sección una fila (ícono, nombre, descripción y dato a la derecha).
   - Columna lateral: próximos eventos, la última versión y números del departamento. */
import { useMemo } from "react";
import { ArrowRight, CalendarDays, ChevronRight, FileText, ScrollText, ShieldCheck, Sparkles, UserCheck, Users, Vote } from "lucide-react";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/agents";
import { RibbonRack } from "@/components/ribbon";
import { AREAS, canArea, secsOf } from "@/nav";
import { LEVEL, RANK_COLOR, divAb, emailOf, getRoster, insigniaUrl, lvl, rankES } from "@/lib/domain";
import { decorOf, type Award, type Decor } from "@/lib/decor";
import { profFull } from "@/lib/profiles";
import { calAll, calMine, fmtWhen, isToday } from "@/lib/calendar";
import { LS, useStoreVersion } from "@/lib/store";
import { APP_VERSION, latest } from "./Novedades";
import { cn } from "@/lib/cn";

/* escalafón de menor a mayor; los detectives van en su propia rama */
const LADDER = Object.entries(LEVEL).filter(([r]) => r !== "Administrativo").sort((a, b) => a[1] - b[1]).map(([r]) => r);
const isDet = (r: string) => /^Detective/.test(r);
const Widget = ({ icon: I, title, action, children }: { icon: typeof Users; title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <Card className="overflow-hidden">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/50"><I className="size-4 text-brand-600 dark:text-brand-300" /><h3 className="flex-1 text-[13px] font-bold uppercase tracking-[.1em]">{title}</h3>{action}</div>
    {children}
  </Card>);

export function Home({ me, go }: { me: { n: string; r: string; p?: string }; go: (a: string, s: string) => void }) {
  useStoreVersion();
  const h = new Date().getHours(), sal = h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
  const roster = getRoster(), act = roster.filter(a => a.e === "Activo").length;
  const votes = LS.json<{ estado?: string }[]>("lspdt.votes", []).filter(v => v.estado === "abierta").length;
  const infs = LS.json<unknown[]>("lspdt.informes", []).length;
  const prof = profFull(me.n), up = LS.json<{ since?: number }>(`lspdt.uprof.${emailOf(me.n).split("@")[0]}`, {});
  const ribbons = ((prof.cond || []) as unknown as Award[]).map(a => decorOf(a.k)).filter(Boolean) as Decor[];
  const col = RANK_COLOR[me.r] || "rgb(var(--b-500))", L = lvl(me.r), ins = insigniaUrl(me.r);
  /* la rama propia: los detectives ven la suya; el resto, la de mando */
  const track = LADDER.filter(r => (isDet(me.r) ? isDet(r) || LEVEL[r] < 4.5 : !isDet(r))), at = track.indexOf(me.r), next = at >= 0 ? track[at + 1] : undefined;
  const evs = useMemo(() => calAll().filter(e => e.at >= Date.now() - 36e5 && calMine(e, me.n)).sort((a, b) => a.at - b.at).slice(0, 4), [me.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const rel = latest();
  const count: Record<string, string> = { "inf/inf": infs ? `${infs} ${infs === 1 ? "informe" : "informes"}` : "", "sup/vot": votes ? `${votes} ${votes === 1 ? "abierta" : "abiertas"}` : "", "ini/nov": `v${APP_VERSION}` };
  const cats = AREAS.filter(a => !a.hidden && canArea(a, me.r) && secsOf(a, me.r).some(s => s.k !== "home"));
  const stat = (I: typeof Users, n: number, l: string) => (
    <div key={l} className="flex items-center gap-3 px-4 py-2.5"><I className="size-4 shrink-0 text-slate-400" /><span className="flex-1 text-[13px] text-slate-600 dark:text-slate-300">{l}</span><b className="text-[15px] tabular-nums">{n}</b></div>);
  return (
    <div className="space-y-5">
      {/* ficha del agente */}
      <Card className="relative overflow-hidden">
        <div className="relative h-24 sm:h-28" style={{ background: `linear-gradient(120deg, rgb(var(--b-700)) 0%, rgb(var(--b-500) / .55) 45%, ${col}66 100%)` }}>
          <div className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(135deg,transparent_0_14px,rgba(255,255,255,.07)_14px_15px)]" aria-hidden />
          <p className="absolute right-4 top-3 text-right text-[11px] font-semibold uppercase tracking-[.16em] text-white/80">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
          {ins && <img src={ins} alt="" className="absolute bottom-2 right-5 h-14 w-auto opacity-25 sm:h-16" aria-hidden />}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-4 sm:flex-row sm:items-end">
          <button onClick={() => go("me", "perfil")} title="Ver mi perfil" className="relative z-10 -mt-10 w-fit shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-[rgb(var(--card))] dark:bg-[rgb(var(--card))]"><Avatar n={me.n} size={88} className="rounded-xl ring-0" /></button>
          <div className="min-w-0 flex-1 sm:pb-1">
            <p className="text-xs text-slate-500">{sal},</p>
            <h2 className="truncate text-2xl font-bold leading-tight tracking-tight">{me.n}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-bold" style={{ background: col + "22", color: col }}>{ins && <img src={ins} alt="" className="h-3.5 w-auto" />}{rankES(me.r)}</span>
              {/* barras de rango, como en los foros: una por escalón */}
              <span className="flex items-center gap-[3px]" title={`Escalón ${Math.ceil(L)} de 13`} aria-label={`Escalón ${Math.ceil(L)} de 13`}>{Array.from({ length: 13 }, (_, i) => <i key={i} className={cn("h-3 w-[5px] rounded-[1.5px]", i >= Math.ceil(L) && "bg-slate-200 dark:bg-slate-700")} style={i < Math.ceil(L) ? { background: col } : undefined} />)}</span>
              {prof.div.slice(0, 6).map(d => { const [ab, c] = divAb(d); return <span key={d} title={d} className="rounded px-1.5 py-px text-[10px] font-bold text-white" style={{ background: c }}>{ab}</span>; })}
            </div>
          </div>
          {ribbons.length > 0 && <button onClick={() => go("me", "perfil")} title="Mis condecoraciones" className="self-start rounded-lg p-1 transition hover:bg-slate-100 sm:self-end dark:hover:bg-slate-800"><RibbonRack list={ribbons.slice(0, 12)} per={4} size="sm" /></button>}
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100 text-center sm:grid-cols-4 sm:divide-y-0 dark:divide-slate-800 dark:border-slate-800">
          {([["Placa", me.p ? "#" + me.p.replace(/\D/g, "") : "—"], ["Condecoraciones", String(ribbons.length)], ["Divisiones", String(prof.div.length)], ["En la terminal desde", up.since ? new Date(up.since).toLocaleDateString("es-AR") : "—"]] as const).map(([k, v]) => (
            <div key={k} className="px-3 py-2.5"><dd className="text-[15px] font-bold tabular-nums">{v}</dd><dt className="text-[11px] text-slate-500">{k}</dt></div>))}
        </dl>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {/* escalafón */}
          {at >= 0 && <Card className="px-4 py-3">
            <div className="mb-2.5 flex flex-wrap items-center gap-2"><ShieldCheck className="size-4 text-brand-600 dark:text-brand-300" /><h3 className="text-[13px] font-bold uppercase tracking-[.1em]">Escalafón</h3>
              <span className="ml-auto text-xs text-slate-500">{next ? <>Siguiente: <b className="text-slate-700 dark:text-slate-200">{rankES(next)}</b></> : "Rango máximo de la carrera"}</span></div>
            <ol className="scrollbar-thin flex items-start overflow-x-auto pb-1">{track.map((r, i) => { const done = i < at, cur = i === at, c = RANK_COLOR[r] || "#94a3b8"; return (
              <li key={r} className="flex min-w-[4.6rem] flex-1 flex-col items-center text-center" aria-current={cur ? "step" : undefined}>
                <div className="flex w-full items-center"><span className={cn("h-[3px] flex-1 rounded-full", i === 0 ? "opacity-0" : done || cur ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-800")} />
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 text-[10px] font-black transition", cur ? "scale-110 text-white shadow-lg" : done ? "border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-400 dark:border-slate-700")}
                    style={cur ? { background: c, borderColor: c, boxShadow: `0 6px 18px -6px ${c}` } : undefined}>{i + 1}</span>
                  <span className={cn("h-[3px] flex-1 rounded-full", i === track.length - 1 ? "opacity-0" : done ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-800")} /></div>
                <span className={cn("mt-1.5 px-1 text-[10.5px] leading-tight", cur ? "font-bold text-slate-900 dark:text-white" : done ? "text-slate-600 dark:text-slate-300" : "text-slate-400")}>{rankES(r)}</span>
              </li>); })}</ol>
          </Card>}

          {/* índice: cada área es una categoría */}
          {cats.map(a => { const S = secsOf(a, me.r).filter(s => s.k !== "home"); return (
            <Card key={a.k} className="overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-slate-200 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-white dark:border-slate-800 dark:from-brand-600/90 dark:to-brand-500/60">
                {a.icon && <a.icon className="size-4" />}<h3 className="flex-1 text-[14px] font-bold uppercase tracking-[.1em]">{a.l}</h3><span className="text-[11px] font-semibold opacity-80">{S.length} {S.length === 1 ? "sección" : "secciones"}</span></div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">{S.map(s => { const k = `${a.k}/${s.k}`; return (
                <li key={s.k}><button onClick={() => go(a.k, s.k)} className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-brand-500/[.05] focus-visible:bg-brand-500/[.08] focus-visible:outline-none">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl transition", s.ready ? "bg-brand-500/10 text-brand-600 group-hover:bg-brand-600 group-hover:text-white dark:text-brand-300" : "bg-slate-100 text-slate-400 dark:bg-slate-800")}><s.icon className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-300">{s.l}</b><span className="block truncate text-[12px] text-slate-500">{s.d}</span></span>
                  {count[k] && <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline dark:bg-slate-800 dark:text-slate-300">{count[k]}</span>}
                  <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
                </button></li>); })}</ul>
            </Card>); })}
        </div>

        {/* columna lateral */}
        <aside className="space-y-5">
          <Widget icon={CalendarDays} title="Próximos eventos" action={<button onClick={() => go("cal", "cal")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-300">Calendario<ArrowRight className="size-3" /></button>}>
            {evs.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">{evs.map(e => (
              <li key={e.id}><button onClick={() => go("cal", "cal")} className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <span className="mt-0.5 rounded px-1.5 py-px text-[10px] font-bold text-white" style={{ background: e.col }}>{e.ab}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{e.n}</b><span className="block text-[11.5px] text-slate-500">{isToday(e.at) ? `Hoy · ${fmtWhen(e, { day: false })}` : fmtWhen(e)}</span></span></button></li>))}</ul>
              : <p className="px-4 py-5 text-center text-[12.5px] text-slate-500">No tenés eventos próximos.</p>}
          </Widget>
          <Widget icon={Sparkles} title={`Novedades · v${rel.v}`} action={<button onClick={() => go("ini", "nov")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-300">Ver todo<ArrowRight className="size-3" /></button>}>
            <div className="px-4 py-3"><p className="text-[13px] font-semibold leading-snug">{rel.t}</p><p className="text-[11px] text-slate-500">{rel.f}</p>
              <ul className="mt-2 space-y-1.5">{rel.items.slice(0, 3).map(x => <li key={x} className="flex gap-2 text-[12px] leading-snug text-slate-600 dark:text-slate-300"><ScrollText className="mt-0.5 size-3 shrink-0 text-brand-500" /><span className="line-clamp-2">{x}</span></li>)}</ul></div>
          </Widget>
          <Widget icon={Users} title="El departamento">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{stat(Users, roster.length, "Agentes en el roster")}{stat(UserCheck, act, "Agentes activos")}{stat(Vote, votes, votes === 1 ? "Votación abierta" : "Votaciones abiertas")}{stat(FileText, infs, "Informes registrados")}</div>
          </Widget>
        </aside>
      </div>
    </div>
  );
}
