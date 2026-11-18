/* Inicio: las fotos mandan.
   - Portada a todo el ancho con las fotos de la Galería (fundido + acercamiento lento, pasa sola, contador 1/N) y el saludo encima.
   - Tarjeta de identidad que se monta sobre la portada: foto, rango con insignia, divisiones, cintas y el camino al próximo rango.
   - Debajo, dos columnas limpias: próximos eventos (con su fecha como un calendario de mesa) y la última versión, sin textos cortados.
   - Para ir a cualquier sección: el buscador (Ctrl + K). */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Eye, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/agents";
import { RibbonRack } from "@/components/ribbon";
import { GROUPS, LEVEL, RANK_COLOR, divAb, emailOf, insigniaUrl, rankES } from "@/lib/domain";
import { decorOf, type Award, type Decor } from "@/lib/decor";
import { profFull } from "@/lib/profiles";
import { calAll, calMine, fmtWhen, hasTime, isToday } from "@/lib/calendar";
import { GUEST, LS, useJSON, useStoreVersion } from "@/lib/store";
import { AREAS, secsOf } from "@/nav";
import { APP_VERSION, latest } from "./Novedades";
import { DEPT } from "@/lib/dept";
import { cn } from "@/lib/cn";
import { fotoStyle, GAL_KEY, type Foto } from "@/lib/gal";

/* escalera de rangos del departamento activo (de menor a mayor) */
const ladder = () => Object.values(GROUPS).flatMap(g => g.r).reverse();
const isDet = (r: string) => /^Detective/.test(r);
/* colores de división muy oscuros (ej. SWAT negro) se aclaran para que se lean sobre el fondo */
const lum = (c: string) => { const n = parseInt(c.replace("#", "").slice(0, 6), 16); return Number.isNaN(n) ? 255 : ((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11; };

export function Home({ me, go }: { me: { n: string; r: string; p?: string }; go: (a: string, s: string) => void }) {
  useStoreVersion();
  const h = new Date().getHours(), sal = h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
  const prof = profFull(me.n), up = LS.json<{ since?: number }>(`lspdt.uprof.${emailOf(me.n).split("@")[0]}`, {});
  const ribbons = ((prof.cond || []) as unknown as Award[]).map(a => decorOf(a.k)).filter(Boolean) as Decor[];
  const col = RANK_COLOR[me.r] || "rgb(var(--b-500))", ins = insigniaUrl(me.r);
  const track = ladder().filter(r => (isDet(me.r) ? isDet(r) || LEVEL[r] < 4.5 : !isDet(r))), at = track.indexOf(me.r), next = at >= 0 ? track[at + 1] : undefined;
  const evs = useMemo(() => calAll().filter(e => e.at >= Date.now() - 36e5 && calMine(e, me.n)).sort((a, b) => a.at - b.at).slice(0, 5), [me.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const rel = latest({ n: me.n, r: me.r, dept: DEPT.id }), [G] = useJSON<Foto[]>(GAL_KEY, []), fotos = G.filter(f => f.on);
  const fecha = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="space-y-6">
      {/* portada */}
      <Hero fotos={fotos}>
        <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-white/75">{fecha}</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl">{sal}, {GUEST.on ? GUEST.title : me.n.split(" ")[0]}</h1>
      </Hero>

      {GUEST.on ? <GuestCard go={go} /> : <>
      {/* identidad: se monta sobre la portada */}
      <div className="rise relative z-10 -mt-20 px-3 sm:-mt-24 sm:px-8" style={{ "--d": "80ms" } as React.CSSProperties}>
        <Card className="overflow-hidden border-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl dark:bg-slate-900/80">
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${col}, transparent)` }} />
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
            <button onClick={() => go("me", "perfil")} title="Ver mi perfil" className="group relative w-fit shrink-0 rounded-2xl p-[3px] transition hover:scale-[1.03]" style={{ background: `linear-gradient(140deg, ${col}, ${col}33)` }}>
              <Avatar n={me.n} size={96} className="rounded-[14px] ring-0" />
              {ins && <span className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-xl border-2 border-white bg-slate-900 shadow-lg dark:border-slate-900"><img src={ins} alt="" className="h-5 w-auto" /></span>}
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-[28px]">{me.n}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-bold" style={{ background: col + "22", color: col }}>{rankES(me.r)}</span>
                {me.p && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[12px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">#{me.p.replace(/\D/g, "")}</span>}
                {prof.div.map(d => { const [ab, c0] = divAb(d), c = lum(c0) < 60 ? "#94a3b8" : c0; return <span key={d} title={d} className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: c + "24", color: c, boxShadow: `inset 0 0 0 1px ${c}44` }}>{ab}</span>; })}
              </div>
              {/* camino al próximo rango */}
              {at >= 0 && <div className="mt-4 max-w-xl">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px]"><span className="font-semibold text-slate-500">Carrera · {at + 1} de {track.length}</span>
                  <span className="text-slate-500">{next ? <>Siguiente: <b className="text-slate-700 dark:text-slate-200">{rankES(next)}</b></> : "Rango máximo"}</span></div>
                <div className="flex gap-1">{track.map((r, i) => <span key={r} title={rankES(r)} className={cn("h-1.5 flex-1 rounded-full", i > at && "bg-slate-200 dark:bg-slate-800")} style={i <= at ? { background: i === at ? col : col + "88" } : undefined} />)}</div>
              </div>}
            </div>
            <dl className="grid shrink-0 grid-cols-3 gap-2 lg:w-[22rem]">
              {([["Condecoraciones", String(ribbons.length)], ["Divisiones", String(prof.div.length)], ["En la terminal", up.since ? new Date(up.since).toLocaleDateString("es-AR", { month: "short", year: "numeric" }) : "—"]] as const).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center dark:bg-slate-800/60"><dd className="font-display text-lg font-bold capitalize leading-tight tabular-nums">{v}</dd><dt className="mt-0.5 text-[10.5px] text-slate-500">{k}</dt></div>))}
            </dl>
          </div>
          {ribbons.length > 0 && <button onClick={() => go("me", "perfil")} className="flex w-full items-center gap-3 border-t border-slate-100 px-5 py-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Condecoraciones</span><RibbonRack list={ribbons.slice(0, 16)} per={8} size="sm" /></button>}
        </Card>
      </div></>}

      {/* buscador */}
      <button type="button" onClick={() => dispatchEvent(new Event("lspdt:cmdk"))} style={{ "--d": "160ms" } as React.CSSProperties} className="rise group mx-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
        <Search className="size-5 text-slate-400 group-hover:text-brand-500" /><span className="flex-1 text-[14px] text-slate-500">Buscá informes, agentes, secciones, divisiones o leyes…</span>
        <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:border-slate-700">Ctrl K</kbd></button>

      <div className="rise grid items-start gap-5 lg:grid-cols-2" style={{ "--d": "240ms" } as React.CSSProperties}>
        {/* próximos eventos */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 pb-2 pt-4"><CalendarDays className="size-[18px] text-brand-500" /><h3 className="flex-1 font-display text-lg font-bold">Próximos eventos</h3>
            <button onClick={() => go("cal", "cal")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline dark:text-brand-300">Calendario<ArrowRight className="size-3.5" /></button></div>
          {evs.length ? <ul className="space-y-1 p-3 pt-1">{evs.map(e => { const d = new Date(e.at); return (
            <li key={e.id}><button onClick={() => go("cal", "cal")} className="flex w-full items-center gap-3.5 rounded-xl p-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span className="w-12 shrink-0 overflow-hidden rounded-xl text-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <span className="block py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white" style={{ background: e.col }}>{d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</span>
                <span className="block bg-white py-1 font-display text-xl font-bold leading-none text-slate-800 dark:bg-slate-800 dark:text-white">{d.getDate()}</span></span>
              <span className="min-w-0 flex-1"><b className="block text-[14px] leading-snug">{e.n}</b>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-slate-500"><span className="rounded px-1.5 text-[10px] font-bold text-white" style={{ background: e.col }}>{e.ab}</span>
                  {isToday(e.at) ? <b className="text-amber-600 dark:text-amber-400">Hoy{hasTime(e) ? ` · ${fmtWhen(e, { day: false })}` : ""}</b> : fmtWhen(e)}</span></span>
              <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" /></button></li>); })}</ul>
            : <p className="px-5 pb-6 pt-2 text-[13px] text-slate-500">No tenés eventos próximos.</p>}
        </Card>
        {/* novedades */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 pb-2 pt-4"><Sparkles className="size-[18px] text-pink-500" /><h3 className="flex-1 font-display text-lg font-bold">Novedades</h3>
            <span className="rounded-full bg-pink-500/12 px-2 py-0.5 font-mono text-[11px] font-bold text-pink-600 dark:text-pink-300">v{APP_VERSION}</span>
            <button onClick={() => go("ini", "nov")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline dark:text-brand-300">Todas<ArrowRight className="size-3.5" /></button></div>
          <div className="px-5 pb-5">
            <p className="text-[15px] font-semibold leading-snug">{rel.t}</p><p className="text-[11.5px] text-slate-500">{rel.f}</p>
            <ul className="mt-3 space-y-2.5">{[...rel.items, ...(rel.g || []).flatMap(g => g[1])].slice(0, 4).map(x => <li key={x} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-pink-500" /><span>{x}</span></li>)}</ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* invitado: en lugar de la tarjeta de identidad, qué puede ver y hasta cuándo */
function GuestCard({ go }: { go: (a: string, s: string) => void }) {
  const S = AREAS.flatMap(a => secsOf(a, "").filter(s => !s.hide && s.k !== "home").map(s => ({ a: a.k, s })));
  return (
    <div className="rise relative z-10 -mt-20 px-3 sm:-mt-24 sm:px-8" style={{ "--d": "80ms" } as React.CSSProperties}>
      <Card className="overflow-hidden border-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-transparent" />
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-amber-500/12 text-amber-500 ring-1 ring-inset ring-amber-500/30"><Eye className="size-8" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold leading-tight">Estás como invitado</h2>
            <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">Podés mirar las secciones que te abrieron, sin cambiar nada.{GUEST.exp ? ` El link vence el ${new Date(GUEST.exp).toLocaleString("es-AR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.` : ""}</p>
          </div>
          {S.length > 0 && <div className="flex flex-wrap gap-2 lg:max-w-[28rem] lg:justify-end">{S.map(({ a, s }) => { const I = s.icon; return (
            <button key={a + s.k} onClick={() => go(a, s.k)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:hover:text-brand-300"><I className="size-4" />{s.sl || s.l}</button>); })}</div>}
        </div>
      </Card>
    </div>);
}

/* portada: fotos de la Galería en fundido con acercamiento lento; sin fotos, un degradé del color del tema */
function Hero({ fotos, children }: { fotos: Foto[]; children: React.ReactNode }) {
  const [i, setI] = useState(0), [hover, setHover] = useState(false), n = fotos.length;
  const go = (k: number) => setI(((k % n) + n) % n);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  useEffect(() => { if (hover || n < 2) return; const t = setTimeout(() => go(i + 1), 6000); return () => clearTimeout(t); }, [i, hover, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="hero-mask group relative -mx-4 -mt-6 overflow-hidden sm:-mx-6 lg:-mt-8" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="relative h-[38vh] min-h-[260px] max-h-[440px] w-full">
        {n ? fotos.map((f, k) => (
          <div key={f.id} className={cn("absolute inset-0 select-none transition-opacity duration-[1400ms]", k === i ? "opacity-100" : "pointer-events-none opacity-0")}>
            <img src={f.url} alt="" decoding="async" loading={k === i || k === (i + 1) % n ? "eager" : "lazy"} className="size-full object-cover transition-transform duration-[7000ms] ease-out" style={fotoStyle(f, k === i ? 1.08 : 1)} draggable={false} />
          </div>))
          : <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 20% 10%, rgb(var(--b-500) / .55), transparent 60%), linear-gradient(135deg, rgb(var(--b-800)), #05070c)" }} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-[9%] pb-24 sm:pb-28">{children}
          {fotos[i]?.cap && <p className="mt-2 max-w-2xl text-[14px] text-white/80 drop-shadow">{fotos[i].cap}</p>}</div>
        {n > 1 && <>
          <span className="absolute right-[10%] top-5 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/85 backdrop-blur">{i + 1} / {n}</span>
          <button type="button" aria-label="Foto anterior" onClick={() => go(i - 1)} className="absolute left-[4.5%] top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100"><ChevronLeft className="size-5" /></button>
          <button type="button" aria-label="Foto siguiente" onClick={() => go(i + 1)} className="absolute right-[4.5%] top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100"><ChevronRight className="size-5" /></button>
        </>}
      </div>
    </div>);
}
