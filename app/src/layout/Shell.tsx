import { useEffect, useState, type ReactNode } from "react";
import { Lock, LogOut, Menu, Palette, X, Cloud, CloudOff, Loader2, ExternalLink, ChevronRight } from "lucide-react";
import { AREAS, canArea, type Area, type Sec } from "@/nav";
import { Avatar } from "@/components/agents";
import { cn } from "@/lib/cn";
import { rankES } from "@/lib/domain";
import { LS, getNet, useStoreVersion } from "@/lib/store";
import { AccountModal } from "@/components/account";
import { AppearanceModal } from "@/components/appearance";
import { usePref } from "@/lib/appearance";
import { focusRing } from "@/components/ui";

export const APP_VERSION = "1.0";
/* distintivo rojo intermitente de la versión nueva */
export const VersionBadge = () => <span className="ver-new" title={`Versión ${APP_VERSION} · ya está disponible`}><i />v{APP_VERSION} NEW</span>;
export const BUILD_ID = __BUILD__;
/* nombre corto de la división para que la barra entre en una línea */
const divShort = (l: string) => ({ "Administration Services Bureau": "Administration Services", "Air Support Division": "Air Support", "Detective Bureau": "Detective Bureau",
  "High Speed Interception Unit": "HSIU", "K-9 Division": "K-9", "Metropolitan Division": "Metropolitan", "Professional Standards Bureau": "PSB", "Recruitment and Training Division": "RTD" } as Record<string, string>)[l] || l;

export function Shell({ me, area, sec, go, onLogout, children }: {
  me: { n: string; r: string; p?: string }; area: Area; sec: Sec; go: (a: string, s: string) => void; onLogout: () => void; children: ReactNode;
}) {
  const [ap, setAp] = useState(false);
  const [open, setOpen] = useState(false), [acc, setAcc] = useState(false);
  useStoreVersion();
  const ui = LS.json<Record<string, string>>("lspdt.ui", {}), title = (ui.title || "").trim() || "Terminal de Mando", kicker = (ui.kicker || "").trim() || "Los Santos Police Dept.";
  useEffect(() => { document.title = title + " · LSPD"; }, [title]);
  const net = getNet();
  useEffect(() => setOpen(false), [area.k, sec.k]);
  useEffect(() => { LS.set("lspdt.sec." + area.k, sec.k); }, [area.k, sec.k]);
  const { nav: mode } = usePref();
  const logo = <img decoding="async" src={LS.get("lspdt.logo.header") || LS.get("lspdt.logo") || "/next/logo.svg"} alt="" className="h-9 w-9 object-contain" onError={e => { e.currentTarget.src = "/next/logo.svg"; }} />;
  const sync = (
    <span className={cn("hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex",
      net === "off" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : net === "saving" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400")}>
      {net === "off" ? <CloudOff className="size-3.5" /> : net === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : <Cloud className="size-3.5" />}
      <span className="hidden lg:inline">{net === "off" ? "Sin conexión" : net === "saving" ? "Guardando…" : "Sincronizado"}</span>
    </span>);
  const tools = <>
    <a href="/clasica/" title="Versión clásica" className={cn("hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 xl:inline-flex dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white", focusRing)}>
      Versión clásica <ExternalLink className="size-3.5" /></a>
    <button onClick={() => setAp(true)} className={cn("rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white", focusRing)}
      aria-label="Apariencia: temas y efectos" title="Temas, colores y efectos"><Palette className="size-[18px]" /></button></>;
  const pageHead = area.k !== "div" && area.k !== "ini" && (
    <div className="mb-6 flex items-start gap-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25 dark:bg-brand-500">{<sec.icon className="size-5" />}</div>
      <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">{area.l}</p><h1 className="text-2xl font-bold tracking-tight">{sec.l}</h1><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{sec.d}</p></div>
    </div>);
  const modals = <><AccountModal me={me} open={acc} onClose={() => setAcc(false)} /><AppearanceModal open={ap} onClose={() => setAp(false)} /></>;
  const areas = AREAS.filter(a => canArea(a, me.r));
  const goArea = (a: Area) => { const l = LS.get("lspdt.sec." + a.k); go(a.k, a.sec.some(s => s.k === l) ? l! : a.sec[0].k); };

  /* menú arriba, por áreas (como la versión clásica) */
  if (mode === "top") return (
    <div className="flex min-h-[var(--app-h,100dvh)] flex-col bg-slate-50 dark:bg-slate-950">
      {modals}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-[1760px] items-center gap-3 px-3 sm:px-5">
          <button onClick={() => go("ini", "home")} title="Inicio" className={cn("flex shrink-0 items-center gap-2.5 rounded-xl p-1 pr-2 text-left", focusRing)}>
            {logo}
            <span className="hidden min-w-0 md:block"><span className="block truncate text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{kicker}</span>
              <span className="block truncate text-sm font-bold">{title}</span></span>
          </button>
          <VersionBadge />
          <nav aria-label="Áreas" className="scrollbar-none flex min-w-0 flex-1 justify-start gap-1 overflow-x-auto lg:justify-center">
            {areas.map(a => { const on = a.k === area.k; return (
              <button key={a.k} onClick={() => goArea(a)} aria-current={on ? "page" : undefined}
                className={cn("shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition", focusRing,
                  on ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white")}>{a.l}</button>); })}
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            {sync}{tools}
            <button onClick={() => setAcc(true)} title="Mi cuenta" className={cn("flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800/70 sm:pr-2.5", focusRing)}>
              <Avatar n={me.n} size={32} />
              <span className="hidden text-left leading-tight 2xl:block"><span className="block max-w-[10rem] truncate text-xs font-semibold">{me.n}</span><span className="block text-[11px] text-slate-500 dark:text-slate-400">{rankES(me.r)}</span></span>
            </button>
            <button onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className={cn("rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400", focusRing)}><LogOut className="size-4" /></button>
          </div>
        </div>
        {area.k !== "ini" && (
          <div className="border-t border-slate-200/70 dark:border-slate-800/70">
            <nav aria-label="Secciones" className="scrollbar-none mx-auto flex max-w-[1760px] gap-0.5 overflow-x-auto px-3 py-2 sm:px-5 [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto">
              {area.sec.map(s => { const on = s.k === sec.k, I = s.icon; return (
                <button key={s.k} onClick={() => go(area.k, s.k)} title={s.d} aria-current={on ? "page" : undefined}
                  className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition", focusRing,
                    on ? "bg-brand-500/15 text-brand-700 ring-1 ring-inset ring-brand-500/40 dark:text-brand-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white")}>
                  <I className="hidden size-4 min-[1360px]:block" />{area.k === "div" ? <><span className="hidden min-[1700px]:inline">{s.l}</span><span className="min-[1700px]:hidden">{divShort(s.l)}</span></> : s.sl || s.l}</button>); })}
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
      {AREAS.filter(a => !a.admin || canArea(a, me.r)).map(a => {
        const ok = canArea(a, me.r);
        return (
          <div key={a.k}>
            <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {a.l}{!ok && <Lock className="size-3" />}
            </p>
            {ok ? (
              <ul className="space-y-0.5">
                {a.sec.map(s => {
                  const on = a.k === area.k && s.k === sec.k, I = s.icon;
                  return (
                    <li key={s.k}>
                      <button onClick={() => go(a.k, s.k)} aria-current={on ? "page" : undefined}
                        className={cn("group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-all", focusRing,
                          on ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white")}>
                        <I className={cn("size-4 shrink-0", on ? "text-current" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300")} />
                        <span className="flex-1 truncate">{s.l}</span>
                        
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
            <p className="truncate text-sm font-bold">{title} <span className="ml-1"><VersionBadge /></span></p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Cerrar menú"><X className="size-5" /></button>
        </div>
        {nav}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center gap-1 rounded-xl">
            <button onClick={() => setAcc(true)} title="Mi cuenta" className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/70", focusRing)}>
              <Avatar n={me.n} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{me.n}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{rankES(me.r)}{me.p ? ` · #${me.p}` : ""}</p></div>
            </button>
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
          {sync}{tools}
        </header>
        <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {pageHead}
          <div key={area.k + sec.k} className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
