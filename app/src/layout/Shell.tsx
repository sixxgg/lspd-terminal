import { profOk } from "@/lib/nick";
import { cipher, onlineIcons, useTabFx } from "@/lib/tabfx";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Lock, LogOut, Menu, Palette, X, CloudOff, ChevronRight, UserRound, KeyRound, BellRing, CalendarClock, MoreHorizontal } from "lucide-react";
import { AREAS, canArea, lockedOf, menuAreas, secsOf, type Area, type Sec } from "@/nav";
import { Avatar } from "@/components/agents";
import { cn } from "@/lib/cn";
import { rankES } from "@/lib/domain";
import { LS, ME_ROLES, getNet, useStoreVersion } from "@/lib/store";
import { AccountModal } from "@/components/account";
import { AppearanceModal } from "@/components/appearance";
import { usePref } from "@/lib/appearance";
import { focusRing } from "@/components/ui";
import { APP_VERSION, hasNews } from "@/sections/Novedades";
import { NotifBell } from "@/components/notifs";
import { calAll, calNew } from "@/lib/calendar";

/* versión actual: con fuego y NEW mientras haya novedades sin ver; abre el registro de cambios */
/* nombre del encabezado: «Mi perfil (BETA)» y «Mi cuenta» */
function UserMenu({ children, onAcc, go, up, wide }: { children: ReactNode; onAcc: () => void; go: (a: string, s: string) => void; up?: boolean; wide?: boolean }) {
  const [o, setO] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!o) return; const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setO(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, [o]);
  const btn = cn("flex items-center gap-2 rounded-xl p-1 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/70 sm:pr-2.5", wide && "min-w-0 flex-1 gap-3 p-2", focusRing);
  const it = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 [&>svg]:size-4 [&>svg]:text-slate-400";
  return (
    <div ref={box} className={cn("relative", wide && "min-w-0 flex-1")}>
      <button onClick={() => setO(!o)} title="Mi cuenta" aria-expanded={o} className={cn(btn, "w-full")}>{children}</button>
      {o && <div className={cn("absolute z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900", up ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2")}>
        {profOk() && <button className={it} onClick={() => { setO(false); go("me", "perfil"); }}><UserRound />Mi perfil<span className="ml-auto rounded bg-pink-500/15 px-1.5 text-[10px] font-bold text-pink-600 dark:text-pink-300">BETA</span></button>}
        <button className={it} onClick={() => { setO(false); onAcc(); }}><KeyRound />Mi cuenta</button>
        {ME_ROLES.six && <button className={it} onClick={() => { setO(false); window.dispatchEvent(new Event("lspdt:testupd")); }}><BellRing />Probar actualización</button>}
        {(ME_ROLES.six || ME_ROLES.anita) && <button className={it} onClick={() => { setO(false); window.dispatchEvent(new Event("lspdt:testcal")); }}><CalendarClock />Probar calendario</button>}
      </div>}
    </div>);
}
/* contador del Calendario: eventos nuevos que me tocan desde la última vez que lo abrí */
function CalBadge({ n }: { n: string }) {
  useStoreVersion(); const [, f] = useState(0);
  useEffect(() => { const h = () => f(x => x + 1); window.addEventListener("lspdt:cal", h); return () => window.removeEventListener("lspdt:cal", h); }, []);
  const c = calNew(calAll(), n).length;
  return c ? <span className="grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[18px] text-white shadow-sm shadow-red-500/40" aria-label={`${c} nuevos`}>{c > 9 ? "9+" : c}</span> : null;
}
/* logo con la versión debajo (con un punto rosa mientras haya novedades sin ver) */
const VersionChip = ({ go }: { go: (a: string, s: string) => void }) => (
  <button onClick={() => go("ini", "nov")} title={`Versión ${APP_VERSION} · ver novedades`} className={cn("ver-chip", hasNews() && "is-new", focusRing)}>v{APP_VERSION}</button>);

/* barra de áreas: ícono arriba y nombre abajo; lo que no entra pasa a «Más» (el área abierta siempre queda a la vista) */
function NavDock({ areas, cur, onGo, me }: { areas: Area[]; cur: string; onGo: (a: Area) => void; me: string }) {
  const box = useRef<HTMLDivElement>(null), meas = useRef<HTMLDivElement>(null), [n, setN] = useState(areas.length), [more, setMore] = useState(false), mb = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const calc = () => { const W = box.current?.clientWidth || 0, ws = [...(meas.current?.children || [])].map(c => (c as HTMLElement).offsetWidth + 2), tot = ws.reduce((a, b) => a + b, 0);
      if (tot <= W) { setN(ws.length); return; } let k = 0, sum = 0; while (k < ws.length && sum + ws[k] + 76 <= W) sum += ws[k++]; setN(Math.max(1, k)); };
    calc(); const ro = new ResizeObserver(calc); if (box.current) ro.observe(box.current); return () => ro.disconnect();
  }, [areas.length]);
  useEffect(() => { if (!more) return; const f = (e: MouseEvent) => { if (!mb.current?.contains(e.target as Node)) setMore(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, [more]);
  let vis = areas.slice(0, n); const ai = areas.findIndex(a => a.k === cur);
  if (ai >= n && n > 0) vis = [...areas.slice(0, n - 1), areas[ai]];
  const rest = areas.filter(a => !vis.includes(a));
  const item = (a: Area, measure = false) => { const on = a.k === cur, AI = a.icon, tone = a.k === "adm" ? "red" : a.k === "fb" ? "pink" : "brand"; return (
    <button key={a.k} tabIndex={measure ? -1 : undefined} onClick={measure ? undefined : () => onGo(a)} aria-current={on ? "page" : undefined} data-tone={tone} className={cn("nav-dk", on && "on", focusRing)}>
      <span className="nav-dk-i">{AI && <AI />}{a.k === "cal" && !measure && <span className="absolute -right-2 -top-1.5"><CalBadge n={me} /></span>}</span>
      <span className="nav-dk-l">{a.l}{a.beta && <i className="nav-dk-b">BETA</i>}</span></button>); };
  return (
    <div ref={box} className="relative flex min-w-0 flex-1 justify-center">
      <div ref={meas} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex gap-0.5">{areas.map(a => item(a, true))}</div>
      <nav aria-label="Áreas" className="flex items-stretch gap-0.5">
        {vis.map(a => item(a))}
        {rest.length > 0 && <div ref={mb} className="relative">
          <button onClick={() => setMore(!more)} aria-expanded={more} className={cn("nav-dk", more && "on", focusRing)}><span className="nav-dk-i"><MoreHorizontal /></span><span className="nav-dk-l">Más</span></button>
          {more && <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {rest.map(a => { const AI = a.icon; return <button key={a.k} onClick={() => { setMore(false); onGo(a); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100 dark:hover:bg-slate-800 [&>svg]:size-4 [&>svg]:text-slate-400">
              {AI && <AI />}{a.l}{a.beta && <span className="beta-tag">BETA</span>}{a.k === "cal" && <span className="ml-auto"><CalBadge n={me} /></span>}</button>; })}</div>}
        </div>}
      </nav>
    </div>);
}
/* nombre corto de la división para que la barra entre en una línea */
const divShort = (l: string) => ({ "Administration Services Bureau": "Administration Services", "Air Support Division": "Air Support", "Detective Bureau": "Detective Bureau",
  "High Speed Interception Unit": "HSIU", "K-9 Division": "K-9", "Metropolitan Division": "Metropolitan", "Professional Standards Bureau": "PSB", "Recruitment and Training Division": "RTD" } as Record<string, string>)[l] || l;

export function Shell({ me, area, sec, go, onLogout, children }: {
  me: { n: string; r: string; p?: string }; area: Area; sec: Sec; go: (a: string, s: string) => void; onLogout: () => void; children: ReactNode;
}) {
  const [ap, setAp] = useState(false);
  /* acceso oculto: 3 clics seguidos en el escudo (o Ctrl+Alt+6 / Ctrl+Alt+A): abre el panel de six o el de Anita, solo para su dueño */
  const taps = useRef<number[]>([]);
  const logoClick = () => { const now = Date.now(); taps.current = [...taps.current.filter(t => now - t < 1600), now];
    if ((ME_ROLES.six || ME_ROLES.anita) && taps.current.length >= 3) { taps.current = []; go(ME_ROLES.six ? "six" : "anita", "staff"); } else go("ini", "home"); };
  useEffect(() => { if (!ME_ROLES.six && !ME_ROLES.anita) return; const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.altKey && (e.key === "6" || e.key.toLowerCase() === "a")) { e.preventDefault(); go(ME_ROLES.six ? "six" : "anita", "staff"); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [go]);
  const [open, setOpen] = useState(false), [acc, setAcc] = useState(false);
  useStoreVersion();
  const ui = LS.json<Record<string, string>>("lspdt.ui", {}), title = (ui.title || "").trim() || "Terminal de Mando", kicker = ((ui.kicker || "").trim() || "Los Santos Police Department").replace(/\bDept\.?$/i, "Department");
  /* pestaña: favicon de la marca con punto ONLINE que parpadea y una sesión cifrada que va rotando */
  const fav = LS.get("lspdt.fav") || LS.get("lspdt.logo") || "/next/logo.svg", ico = useRef<[string, string] | null>(null), ses = useRef(cipher(2, 4));
  useEffect(() => { ico.current = null; void onlineIcons(fav).then(x => { ico.current = x; }); }, [fav]);
  useTabFx(k => { if (k % 12 === 0) ses.current = cipher(2, 4); const on = k % 2 === 0;
    return { title: `${on ? "●" : "○"} ONLINE · ${title} · ${ses.current}`, icon: ico.current?.[on ? 0 : 1] }; }, 800, [title]);
  const net = getNet();
  useEffect(() => setOpen(false), [area.k, sec.k]);
  useEffect(() => { LS.set("lspdt.sec." + area.k, sec.k); }, [area.k, sec.k]);
  const { nav: mode } = usePref();
  const logo = <img decoding="async" src={LS.get("lspdt.logo.header") || LS.get("lspdt.logo") || "/next/logo.svg"} alt="" className="h-9 w-9 object-contain" onError={e => { e.currentTarget.src = "/next/logo.svg"; }} />;
  /* estado de sincronización: barra que recorre el indicador cada pocos segundos (guardando: barra continua; sin conexión: rojo) */
  const sync = (
    <span role="status" title={net === "off" ? "Sin conexión: los cambios se guardan al volver" : net === "saving" ? "Guardando cambios…" : "Todo sincronizado con el servidor"}
      className={cn("sync-pill hidden sm:inline-flex", net === "off" ? "is-off" : net === "saving" ? "is-saving" : "is-ok")}>
      {net === "off" ? <CloudOff className="size-3.5" /> : <span className="sync-dot" />}
      <span className="sr-only">{net === "off" ? "Sin conexión" : net === "saving" ? "Guardando" : "Sincronizado"}</span>
      <i className="sync-bar" />
    </span>);
  const tools = <>
    <button onClick={() => setAp(true)} className={cn("rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white", focusRing)}
      aria-label="Apariencia: temas y efectos" title="Temas, colores y efectos"><Palette className="size-[18px]" /></button></>;
  /* el encabezado solo aparece en áreas con varias secciones (en las de una sola ya lo dice el menú) */
  const pageHead = area.k !== "div" && area.k !== "ini" && area.sec.length > 1 && (
    <div className="mb-6 flex items-start gap-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25 dark:bg-brand-500">{<sec.icon className="size-5" />}</div>
      <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">{area.l}</p><h1 className="text-2xl font-bold tracking-tight">{sec.l}</h1><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{sec.d}</p></div>
    </div>);
  const modals = <><AccountModal me={me} open={acc} onClose={() => setAcc(false)} /><AppearanceModal open={ap} onClose={() => setAp(false)} /></>;
  const areas = menuAreas(me.r);
  const goArea = (a: Area) => { const l = LS.get("lspdt.sec." + a.k); const S = secsOf(a, me.r); go(a.k, S.some(s => s.k === l) ? l! : S[0].k); };

  /* menú arriba, por áreas (como la versión clásica) */
  if (mode === "top") return (
    <div className="flex min-h-[var(--app-h,100dvh)] flex-col bg-slate-50 dark:bg-slate-950">
      {modals}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-[4.5rem] max-w-[2100px] items-center gap-3 px-3 sm:px-5">
          <div className="flex shrink-0 flex-col items-center gap-0.5"><button onClick={logoClick} title="Inicio" className={cn("flex shrink-0 items-center gap-2.5 rounded-xl p-0.5 text-left", focusRing)}>
            {logo}
            <span className="hidden min-w-0 min-[2300px]:block"><span className="block truncate text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{kicker}</span>
              <span className="block truncate text-sm font-bold">{title}</span></span>
          </button><VersionChip go={go} /></div>
          <NavDock areas={areas} cur={area.k} onGo={goArea} me={me.n} />
          <div className="flex shrink-0 items-center gap-1">
            {sync}<NotifBell me={me} go={go} />{tools}
            <UserMenu onAcc={() => setAcc(true)} go={go} up={false}>
              <Avatar n={me.n} size={32} />
              <span className="hidden text-left leading-tight min-[1850px]:block"><span className="block max-w-[10rem] truncate text-xs font-semibold">{me.n}</span><span className="block text-[11px] text-slate-500 dark:text-slate-400">{rankES(me.r)}</span></span>
            </UserMenu>
            <button onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className={cn("rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400", focusRing)}><LogOut className="size-4" /></button>
          </div>
        </div>
        {secsOf(area, me.r).length + lockedOf(area, me.r).length > 1 && (
          <div className="border-t border-slate-200/70 dark:border-slate-800/70">
            <nav aria-label="Secciones" className="scrollbar-none mx-auto flex max-w-[1760px] gap-0.5 overflow-x-auto px-3 py-2 sm:px-5 [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto">
              {secsOf(area, me.r).map(s => { const on = s.k === sec.k, I = s.icon; return (
                <button key={s.k} onClick={() => go(area.k, s.k)} title={s.d} aria-current={on ? "page" : undefined}
                  className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition min-[1800px]:px-2.5 min-[1800px]:text-[11.5px]", focusRing,
                    on ? "bg-brand-500/15 text-brand-700 ring-1 ring-inset ring-brand-500/40 dark:text-brand-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white")}>
                  <I className="size-3.5 shrink-0" />{area.k === "div" ? <><span className="hidden min-[1700px]:inline">{s.l}</span><span className="min-[1700px]:hidden">{divShort(s.l)}</span></> : s.sl || s.l}</button>); })}
              {lockedOf(area, me.r).map(s => <span key={s.k} title="Bloqueada para tu rango" className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-500/70 dark:text-red-400/70 min-[1800px]:px-2.5 min-[1800px]:text-[11.5px]"><Lock className="size-3.5 shrink-0" />{s.sl || s.l}</span>)}
            </nav>
          </div>)}
      </header>
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
        {pageHead}
        <div key={area.k + sec.k} className="animate-fade-in">{children}</div>
      </main>
    </div>
  );

  const nav = (
    <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Secciones">
      {AREAS.filter(a => !a.hidden && (!a.admin || canArea(a, me.r))).map(a => {
        const ok = canArea(a, me.r);
        return (
          <div key={a.k}>
            <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {a.l}{a.beta && <span className="beta-tag">BETA</span>}{!ok && <Lock className="size-3" />}
            </p>
            {ok ? (
              <ul className="space-y-0.5">
                {secsOf(a, me.r).map(s => {
                  const on = a.k === area.k && s.k === sec.k, I = s.icon;
                  return (
                    <li key={s.k}>
                      <button onClick={() => go(a.k, s.k)} aria-current={on ? "page" : undefined}
                        className={cn("group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-all", focusRing,
                          on ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white")}>
                        <I className={cn("size-4 shrink-0", on ? "text-current" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300")} />
                        <span className="flex-1 truncate">{s.l}</span>{a.k === "cal" && <CalBadge n={me.n} />}
                        
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="px-2 text-xs text-slate-400 dark:text-slate-500">Requiere {a.req} o superior</p>}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-[var(--app-h,100dvh)] bg-slate-50 dark:bg-slate-950">
      {/* barra lateral */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:h-[var(--app-h,100dvh)] lg:translate-x-0",
        open ? "translate-x-0 shadow-2xl" : "-translate-x-full")}>
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <img decoding="async" src={LS.get("lspdt.logo.header") || LS.get("lspdt.logo") || "/next/logo.svg"} alt="" className="h-9 w-9 object-contain" onError={e => { e.currentTarget.src = "/next/logo.svg"; }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{kicker}</p>
            <p className="truncate text-sm font-bold">{title} <span className="ml-1"><VersionChip go={go} /></span></p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Cerrar menú"><X className="size-5" /></button>
        </div>
        {nav}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center gap-1 rounded-xl">
            <UserMenu onAcc={() => setAcc(true)} go={go} up wide>
              <Avatar n={me.n} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{me.n}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{rankES(me.r)}{me.p ? ` · #${me.p}` : ""}</p></div>
            </UserMenu>
            <button onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className={cn("rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400", focusRing)}><LogOut className="size-4" /></button>
          </div>
        </div>
      </aside>
      {modals}
      {open && <div className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      {/* contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70 sm:px-6">
          <button onClick={() => setOpen(true)} className={cn("rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800", focusRing)} aria-label="Abrir menú"><Menu className="size-5" /></button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            <span className="hidden text-slate-400 sm:inline">{area.l}</span>
            <ChevronRight className="hidden size-4 text-slate-300 sm:inline dark:text-slate-600" />
            <span className="truncate font-semibold">{sec.l}</span>
          </div>
          {sync}<NotifBell me={me} go={go} />{tools}
        </header>
        <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {pageHead}
          <div key={area.k + sec.k} className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
