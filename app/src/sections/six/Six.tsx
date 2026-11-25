/* six: apartado privado (solo su dueño), con interfaz y temas propios, sin nada de la MDT.
   Pestañas: Inicio y, de la A a la Z, Administración · Comunicados · Equipo de ilícitos · Gestión de staff · Notificaciones. Los datos van en lspdt.six.* (el servidor no se los muestra a nadie más). */
import "./six.css";
import { forwardRef, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { AtSign, Bell, Check, KeyRound, Link2, ChevronRight, Copy, Home, Lock, Megaphone, Plus, Power, RefreshCw, RotateCcw, Save, Settings2, Skull, Ticket, Trash2, Users, X, ScrollText, Search, Banknote, Pin, Upload, Globe, Crosshair, Drama, Wrench, Bomb } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { api, authApi } from "@/lib/api";
import { discordHtml } from "@/lib/discord";
import { uid } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { TAB_ICONS, cipher, glyphs, tabIcon, useTabFx } from "@/lib/tabfx";
import { FIRMAS, ILIC_VARS, consultaInteres, firmaDe, ilicText, mentions, type IlicForm } from "./ilicito";
import { DC_CHANS, DC_ROLES, PLANTILLAS, STAFF_ROLE, STATS0, comTitle, splitComs, statsText, type StatsF } from "./comms";
import { RobosTab } from "./RobosTab";
import { SitioTab } from "./Sitio";
import { ArmasTab } from "./Armas";
import { UtilTab } from "./Utilidades";
import { PlaymakersTab } from "./Playmakers";
import { NotifTab, fbList, whoOf, FB_SEEN } from "./Notif";
import { LS, reloadAll, useJSON } from "@/lib/store";
import { GUEST_OPTS } from "@/lib/guest";
import { FB_ST, fbSt, fbX } from "@/components/fbnotif";
import { Boot, NS, K, cfg0, cfgKey, Rain, THEMES, colorOf, hex, vars, type SixCfg, type Who } from "./fx";

type Staff = { id: string; n: string; rol: string; dc: string; notas: string };
type Com = { id: string; t: string; body: string; ts: number; pin?: boolean };
type Sent = { id: string; ts: number; banda: string; res: IlicForm["res"]; txt: string };
const ROLES = ["Owner", "Administración", "Moderación", "Soporte", "Ilícitos", "Desarrollo", "Otro"];
const TABS = [["ini", "INICIO", Home], ["rob", "ROBOS", Banknote], ["web", "SITIO WEB", Globe], ["arm", "ARMAS", Crosshair], ["util", "UTILIDADES", Wrench], ["pm", "PLAYMAKERS", Drama], ["adm", "ADMINISTRACIÓN", Settings2], ["com", "COMUNICADOS", Megaphone], ["ilic", "EQUIPO DE ILÍCITOS", Skull], ["staff", "GESTIÓN DE STAFF", Users], ["not", "NOTIFICACIONES", Bell], ["logs", "LOGS", ScrollText]] as const;
type Tab = (typeof TABS)[number][0];
const LOCKED = (): Tab[] => (NS.id === "six" ? ["staff"] : []); // en six: próximamente
const NAME = () => (NS.id === "six" ? "six" : "anita");
const isId = (s: string) => /^\d{17,20}$/.test(s.trim());

/* ---------- controles propios: sólidos, borde fino y degradado ---------- */
const fld = "w-full rounded-xl border border-six/15 bg-gradient-to-b from-[#10151c] to-[#090c11] px-3 py-2 font-sans text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] outline-none transition placeholder:text-slate-600 hover:border-six/40 focus:border-six focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c)_18%,transparent)]";
const NIn = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, r) => <input ref={r} {...p} className={cn(fld, className)} />);
const NTa = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, r) => <textarea ref={r} {...p} className={cn(fld, "resize-y leading-relaxed", className)} />);
function NSel<T extends string | number>({ v, set, opts, className }: { v: T; set: (v: T) => void; opts: readonly (readonly [T, string])[]; className?: string }) {
  return <select value={String(v)} onChange={e => set(opts.find(o => String(o[0]) === e.target.value)![0])} className={cn(fld, "cursor-pointer", className)}>{opts.map(([k, l]) => <option key={String(k)} value={String(k)} className="bg-[#0a0d12]">{l}</option>)}</select>;
}
const Lbl = ({ t, h, children }: { t: string; h?: string; children: ReactNode }) => (
  <label className="block space-y-1.5"><span className="font-sans text-xs font-semibold text-slate-300">{t}{h && <span className="ml-1.5 font-normal text-slate-500">{h}</span>}</span>{children}</label>);
function NBtn({ children, icon, ghost, className, ...p }: { icon?: ReactNode; ghost?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-35 [&>svg]:size-3.5",
    ghost ? "text-slate-400 hover:bg-white/5 hover:text-six" : "six-btn border border-six/60 bg-six/10 text-six hover:bg-six/20", className)}>{icon}{children}</button>;
}
const Panel = ({ children, className, t, icon, d }: { children: ReactNode; className?: string; t?: string; icon?: ReactNode; d?: string }) => (
  <section className={cn("six-panel relative rounded-2xl p-5", className)}>
    <i className="six-corner tl" /><i className="six-corner br" />
    {t && <header className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg border border-six/40 bg-six/10 text-six six-ico [&>svg]:size-4">{icon}</span>
      <div><h2 className="six-h font-sans text-base font-bold">{t}</h2>{d && <p className="font-sans text-xs text-slate-500">{d}</p>}</div></header>}
    {children}
  </section>);
const Toggle = ({ on, set, t, d }: { on: boolean; set: (v: boolean) => void; t: string; d?: string }) => (
  <button type="button" onClick={() => set(!on)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left font-sans text-sm transition", on ? "border-six/70 bg-six/10" : "border-six/15 hover:bg-white/5")}>
    <span className={cn("relative h-5 w-9 shrink-0 rounded-full border transition", on ? "border-six bg-six/30" : "border-six/25 bg-black/40")}><span className={cn("absolute top-0.5 size-3.5 rounded-full transition-all", on ? "left-[18px] bg-six six-ico" : "left-0.5 bg-slate-500")} /></span>
    <span><b className={on ? "text-six" : "text-slate-300"}>{t}</b>{d && <span className="block text-xs text-slate-500">{d}</span>}</span></button>);
function Seg<T extends string | number>({ v, set, opts }: { v: T; set: (v: T) => void; opts: readonly (readonly [T, string])[] }) {
  return <div className="flex gap-1 rounded-xl border border-six/15 bg-black/40 p-1">{opts.map(([k, l]) => (
    <button key={String(k)} type="button" onClick={() => set(k)} className={cn("flex-1 rounded-lg px-2 py-1.5 font-sans text-xs font-semibold transition", v === k ? "bg-six/15 text-six shadow-[inset_0_0_0_1px_var(--c)]" : "text-slate-500 hover:text-slate-300")}>{l}</button>))}</div>;
}

/* vista previa estilo Discord con copiar */
function Preview({ title, text, users, roles, chans }: { title: string; text: string; users: Record<string, string>; roles?: Record<string, string>; chans?: Record<string, string> }) {
  const { toast } = useFeedback(), [ok, setOk] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(text); setOk(true); toast("Copiado"); setTimeout(() => setOk(false), 1400); };
  return (
    <Panel className="lg:sticky lg:top-20">
      <div className="mb-3 flex items-center gap-2"><span className="six-dot" /><span className="text-[11px] font-bold tracking-[0.2em] text-six">{title}</span>
        <NBtn className="ml-auto" icon={ok ? <Check /> : <Copy />} onClick={copy} disabled={!text.trim()}>{ok ? "COPIADO" : "COPIAR"}</NBtn></div>
      <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-six/10 bg-[#313338] p-4 font-sans text-[15px] leading-relaxed text-[#dbdee1]"
        dangerouslySetInnerHTML={{ __html: discordHtml(text, { users, roles, chans }, "six", "/next/logo.svg") }} />
    </Panel>);
}

/* ---------- panel ---------- */
/* texto que se actualiza solo cada segundo sin re-renderizar todo el panel */
function Ticker({ f }: { f: () => string }) {
  const [v, setV] = useState(f), r = useRef(f); r.current = f;
  useEffect(() => { const i = setInterval(() => { if (!document.hidden) setV(r.current()); }, 1000); return () => clearInterval(i); }, []);
  return <>{v}</>;
}

export function Six({ onExit, start = "ini", who = "six", resume }: { onExit: () => void; start?: "ini" | "not"; who?: Who; resume?: boolean }) {
  NS.id = who; /* todo lo que sigue usa el espacio de este panel */
  const C0 = cfg0(who), [cfg, setCfg] = useJSON<SixCfg>(cfgKey(who), C0), c = { ...C0, ...cfg }, tabs = TABS.filter(t => (who === "six" ? t[0] !== "pm" : !["not", "logs", "web"].includes(t[0])));
  /* al recargar (resume) vuelve a la misma pestaña y sin repetir la intro */
  const [tab, setTab0] = useState<Tab>(() => { let t: string | null = null; try { t = resume ? sessionStorage.getItem("lspdt.panelTab") : null; } catch { /* */ } return t && TABS.some(x => x[0] === t) ? (t as Tab) : start; });
  const setTab = (t: Tab) => { setTab0(t); try { sessionStorage.setItem("lspdt.panelTab", t); } catch { /* */ } };
  const [out, setOut] = useState(false), [booted, setBooted] = useState(c.intro === "no" || !!resume), [replay, setReplay] = useState(0);
  const [staff, setStaff] = useJSON<Staff[]>(K("staff"), []);
  const unread = who !== "six" ? 0 : fbList().filter(x => x.t > Number(LS.get(FB_SEEN) || 0)).length;
  const users = useMemo(() => Object.fromEntries(staff.filter(s => isId(s.dc)).map(s => [s.dc.trim(), s.n])), [staff]);
  /* pestaña cifrada: ícono y color elegidos en Administración (six: calavera roja) */
  useTabFx(k => { const col = c.tabCol === "tema" ? colorOf(c.tema) : c.tabCol === "arcoiris" ? `hsl(${(k * 24) % 360} 100% 62%)` : c.tabCol;
    return { title: `${k % 10 < 2 ? NAME().toUpperCase() : glyphs(NAME().length)} ▸ ${cipher(3, 4)}`, icon: tabIcon(c.tabIco, col, k % 7 !== 0) }; }, 280, [c.tabIco, c.tabCol, c.tema]);
  const color = colorOf(c.tema), exit = () => { setOut(true); setTimeout(onExit, 650); };
  const set = (p: Partial<SixCfg>) => setCfg({ ...c, ...p });
  return (
    <div className={cn("six-root relative min-h-[100dvh] overflow-hidden bg-[#030407] font-mono text-slate-300", out && "six-out", c.flicker && "six-flk", c.tema === "arcoiris" && "six-rainbow")}
      data-bd={c.bd} style={{ ...vars(color), ["--gl" as string]: [0.35, 1, 1.8][c.glow] }}>
      {!booted && <Boot key={replay} name={NAME()} short={c.intro === "corta"} onDone={() => setBooted(true)} />}
      {c.grid && <div className="six-grid pointer-events-none fixed inset-0" aria-hidden />}
      {c.lluvia > 0 && <div className="pointer-events-none fixed inset-0" aria-hidden><Rain color={color} opacity={[0, 0.06, 0.11, 0.18][c.lluvia]} /></div>}
      <div className="six-vignette pointer-events-none fixed inset-0" aria-hidden />
      {c.scan && <div className="six-scan pointer-events-none fixed inset-0 z-40" aria-hidden />}

      <header className="sticky top-0 z-30 border-b border-six/25 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4">
          <span className="six-logo shrink-0 text-3xl font-black" data-t={NAME()}>{NAME()}</span>
          <div className="hidden shrink-0 whitespace-nowrap text-[10px] leading-tight text-slate-500 md:block min-[2050px]:hidden min-[2450px]:block"><p>SESIÓN PRIVADA · <span className="text-six">CIFRADA</span></p><p>FIRMA <Ticker f={() => hex(8).toUpperCase()} /></p></div>
          <nav className="scrollbar-none mx-auto flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-six/10 bg-black/40 p-1">{tabs.map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} title={l} className={cn("six-tab inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold tracking-[0.14em] transition",
              tab === k ? "on text-six" : "text-slate-500 hover:text-six")}><I className="size-4 shrink-0" /><span className={tab === k ? "hidden sm:inline" : "hidden min-[2050px]:inline"}>{l}</span>{LOCKED().includes(k) && <Lock className="size-3 opacity-60" />}{k === "not" && unread > 0 && <span className="rounded-full bg-six px-1.5 text-[10px] font-black text-black">{unread}</span>}</button>))}</nav>
          <span className="hidden shrink-0 tabular-nums text-sm text-six six-txt xl:inline"><Ticker f={() => new Date().toLocaleTimeString("es-AR", { hour12: false })} /></span>
          <NBtn ghost icon={<Power />} onClick={exit} title="Volver a la MDT"><span className="hidden sm:inline">SALIR</span></NBtn>
        </div>
        <div className="six-line h-px" />
      </header>

      <main key={tab} className="six-in relative mx-auto max-w-[1600px] px-4 py-6">
        {LOCKED().includes(tab) ? <Soon t={TABS.find(x => x[0] === tab)![1]} />
          : tab === "ini" ? <HomeTab go={setTab} unread={unread} staff={staff.length} />
          : tab === "rob" ? <RobosTab />
          : tab === "web" && who === "six" ? <SitioTab />
          : tab === "arm" ? <ArmasTab />
          : tab === "util" ? <UtilTab />
          : tab === "pm" && who !== "six" ? <PlaymakersTab />
          : tab === "not" ? <NotifTab />
          : tab === "logs" && who === "six" ? <LogsTab />
          : tab === "adm" ? <AdmTab c={c} set={set} replay={() => { setReplay(x => x + 1); setBooted(false); }} />
          : tab === "staff" ? <StaffTab staff={staff} setStaff={setStaff} />
          : tab === "com" ? <ComTab staff={staff} users={users} />
          : <IlicTab users={users} />}
      </main>
      <footer className="relative pb-6 text-center text-[10px] tracking-[0.3em] text-slate-600">{NAME()} · SOLO VOS VES ESTO</footer>
    </div>
  );
}

const Soon = ({ t }: { t: string }) => (
  <Panel className="mx-auto grid max-w-xl place-items-center gap-3 py-16 text-center">
    <span className="grid size-14 place-items-center rounded-2xl border border-six/50 bg-six/10 text-six six-ico"><Lock className="size-6" /></span>
    <p className="six-h text-2xl font-black tracking-[0.3em]">PRÓXIMAMENTE</p>
    <p className="font-sans text-sm text-slate-500">{t} está bloqueado por ahora. Se habilita en una próxima versión.</p>
  </Panel>);

/* ---------- administración: temas y efectos de six ---------- */
/* ---------- inicio: resumen de todo lo de six ---------- */
function HomeTab({ go, unread, staff }: { go: (t: Tab) => void; unread: number; staff: number }) {
  const [rf, setRf] = useState(false), refresh = async () => { setRf(true); await reloadAll(); setRf(false); };
  const six = NS.id === "six", fb = six ? fbList() : [], sent = LS.ro<Sent[]>(K("ilic"), []), com = LS.ro<Com[]>(K("com"), []);
  const abiertos = fb.filter(x => ["pend", "curso"].includes(fbSt(x.st))).length, h = new Date().getHours();
  const saludo = h >= 6 && h < 13 ? "Buenos días" : h >= 13 && h < 20 ? "Buenas tardes" : "Buenas noches";
  const cards: [Tab, string, typeof Bell, string, string][] = [
    ...(six ? [["not", "Notificaciones", Bell, unread ? `${unread} sin leer` : "Todo leído", `${abiertos} abiertos · ${fb.length} en total`] as [Tab, string, typeof Bell, string, string]] : []),
    ["ilic", "Equipo de ilícitos", Skull, `${sent.length} respuestas`, sent.length ? `Última: ${sent[sent.length - 1].banda}` : "Sin respuestas todavía"],
    ["staff", "Gestión de staff", Users, `${staff} en el equipo`, six ? "Próximamente" : "Tu equipo"],
    ["com", "Comunicados", Megaphone, `${com.length} guardados`, "Plantillas, estadísticas y vista de Discord"],
    ...(six ? [] : [["pm", "Playmakers", Drama, "🎭 Mensajes de tickets", "Para copiar y pegar en Discord"] as [Tab, string, typeof Bell, string, string]]),
    ["util", "Utilidades", Wrench, "PEDs y vehículos", "Con imagen, modelo y hash"],
    ["adm", "Administración", Settings2, "Tema, efectos e intro", six ? "Avisos de Discord" : "Colores y efectos"],
  ];
  return (
    <div className="space-y-5">
      <Panel><p className="font-sans text-sm text-slate-500">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="six-h mt-1 font-sans text-2xl font-bold">{saludo}, {NAME()}.</h1>
        {six && <p className="mt-1 font-sans text-sm text-slate-400">{abiertos ? `Tenés ${abiertos} feedback ${abiertos === 1 ? "abierto" : "abiertos"} por revisar.` : "No hay feedback pendiente."}</p>}</Panel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([k, l, I, a, b]) => (
        <button key={k} onClick={() => go(k)} className="six-panel group relative flex items-center gap-4 rounded-2xl p-4 text-left transition hover:-translate-y-0.5">
          <span className="grid size-11 place-items-center rounded-xl border border-six/40 bg-six/10 text-six six-ico"><I className="size-5" /></span>
          <span className="min-w-0 flex-1 font-sans"><b className="block text-white">{l}{LOCKED().includes(k) && <Lock className="ml-1.5 inline size-3 opacity-50" />}</b><span className="block text-sm text-six">{a}</span><span className="block truncate text-xs text-slate-500">{b}</span></span>
          <ChevronRight className="size-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-six" /></button>))}</div>
      {six && <Panel t="Últimos feedback" icon={<Bell />}>
        <div className="mb-2 flex justify-end"><button onClick={refresh} disabled={rf} className="inline-flex items-center gap-1.5 rounded-lg border border-six/30 px-2.5 py-1 font-sans text-xs font-semibold text-six transition hover:bg-six/10 disabled:opacity-50"><RefreshCw className={cn("size-3.5", rf && "animate-spin")} />{rf ? "Refrescando…" : "Refrescar"}</button></div>
        {!fb.length ? <p className="py-4 text-center font-sans text-sm text-slate-500">No hay feedback por ahora.</p>
        : <div className="space-y-1.5">{fb.slice(0, 5).map(x => { const S = FB_ST[fbSt(x.st)]; return (
          <button key={x.id} onClick={() => go("not")} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left font-sans text-sm transition hover:bg-six/5">
            <S.I className="size-4 shrink-0" style={{ color: S.c }} /><span className="w-28 shrink-0 truncate font-semibold text-white">{whoOf(x)}</span>
            <span className="min-w-0 flex-1 truncate text-slate-400">{fbX(x.x)}</span></button>); })}</div>}</Panel>}

    </div>
  );
}

/* ---------- invitados: link para ver la terminal sin iniciar sesión, solo lectura y con las secciones elegidas ---------- */
type GLnk = { t: string; exp: number; views: number; title: string; last: number; secs?: string[] };
const GDUR: [number, string][] = [[24, "1 día"], [72, "3 días"], [168, "7 días"], [720, "30 días"]];
function Invitados() {
  const { toast, confirm } = useFeedback(), [L, setL] = useState<GLnk[] | null>(null), [n, setN] = useState(""), [h, setH] = useState(168), [busy, setBusy] = useState(false), [last, setLast] = useState("");
  const [sel, setSel] = useState<string[]>(["ini/home", "cal/cal", "ofi/cod", "leg/ley"]);
  const url = (t: string) => `${location.origin}/next/?inv=${t}`;
  const load = () => void api("/api/share", { list: "lspdt.guest" }).then(r => setL(r.__s === 200 ? r.list : []));
  useEffect(load, []);
  const make = async () => {
    setBusy(true); const r = await api("/api/share", { k: "lspdt.guest", h, title: n.trim() || "Invitado", secs: sel }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo crear el link", "err"); return; }
    const u = url(r.t); setLast(u); void navigator.clipboard?.writeText(u).catch(() => {}); toast("Link copiado"); setN(""); load();
  };
  const del = async (x: GLnk) => { if (!(await confirm(`¿Revocar el link de ${x.title}? Deja de funcionar al instante.`, { danger: true, ok: "Revocar" }))) return; await api("/api/share", { del: x.t }); load(); };
  const left = (e: number) => { const d = e - Date.now(); return d > 864e5 ? `${Math.round(d / 864e5)} d` : `${Math.max(1, Math.round(d / 36e5))} h`; };
  const lab = (k: string) => GUEST_OPTS.find(o => o[0] === k)?.[1] || k;
  return (
    <Panel t="Invitar a la terminal" icon={<Link2 />} d="Link para ver la terminal sin iniciar sesión. Solo ve las secciones que marques y no puede cambiar nada." className="lg:col-span-2">
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <Lbl t="Para quién" h="aparece en el saludo y en los logs"><NIn value={n} onChange={e => setN(e.target.value)} maxLength={60} placeholder="Ej: Bernal, staff, aspirantes…" /></Lbl>
          <div className="space-y-1.5"><span className="font-sans text-xs font-semibold text-slate-300">Qué puede ver</span>
            <div className="grid gap-2 sm:grid-cols-2">{GUEST_OPTS.map(([k, l, d]) => { const fixed = k === "ini/home"; return (
              <Toggle key={k} on={fixed || sel.includes(k)} t={l} d={d} set={v => { if (!fixed) setSel(S => (v ? [...S, k] : S.filter(x => x !== k))); }} />); })}</div></div>
          <Lbl t="Vence en"><Seg v={h} set={setH} opts={GDUR} /></Lbl>
          <NBtn className="w-full py-2.5" icon={<Link2 />} disabled={busy} onClick={() => void make()}>{busy ? "CREANDO…" : "CREAR Y COPIAR LINK"}</NBtn>
          {last && <p className="break-all rounded-lg border border-six/20 bg-black/40 px-3 py-2 font-mono text-[11.5px] text-six">{last}</p>}
        </div>
        <div className="space-y-1.5"><span className="font-sans text-xs font-semibold text-slate-300">Links activos</span>
          {!L ? <p className="font-sans text-sm text-slate-500">Cargando…</p> : !L.length ? <p className="rounded-xl border border-dashed border-six/15 p-4 text-center font-sans text-sm text-slate-500">No hay links activos.</p> :
          <div className="divide-y divide-six/10 rounded-xl border border-six/15">{L.map(x => (
            <div key={x.t} className="flex items-start gap-2 px-3 py-2.5 font-sans">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-100">{x.title}</p>
                <p className="text-[11.5px] text-slate-500">Vence en {left(x.exp)} · {x.views} {x.views === 1 ? "vista" : "vistas"}{x.last ? ` · última ${new Date(x.last).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}` : ""}</p>
                {x.secs && <div className="mt-1.5 flex flex-wrap gap-1">{x.secs.map(k => <span key={k} className="rounded-md border border-six/25 bg-six/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-six">{lab(k)}</span>)}</div>}</div>
              <button onClick={() => { void navigator.clipboard?.writeText(url(x.t)).catch(() => {}); toast("Link copiado"); }} aria-label="Copiar link" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-six"><Copy className="size-4" /></button>
              <button onClick={() => void del(x)} aria-label="Revocar" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button></div>))}</div>}
        </div>
      </div>
    </Panel>);
}

function AdmTab({ c, set, replay }: { c: SixCfg; set: (p: Partial<SixCfg>) => void; replay: () => void }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {NS.id === "six" && <Invitados />}
      <Panel t="Tema" icon={<Settings2 />} d={`Color de toda la interfaz de ${NAME()}. No toca nada de la MDT.`} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{THEMES.map(([k, l, col]) => (
          <button key={k} onClick={() => set({ tema: k })} style={vars(col)} className={cn("group grid place-items-center gap-2 rounded-xl border p-3 font-sans text-xs font-semibold transition", c.tema === k ? "border-six bg-six/10 text-six" : "border-six/15 text-slate-400 hover:border-six/40")}>
            <span className={cn("size-7 rounded-full bg-six six-ico", k === "arcoiris" && "six-rainbow-dot")} />{l}</button>))}</div>
        <Lbl t="Bordes"><Seg v={c.bd} set={v => set({ bd: v })} opts={[["tema", "Color del tema"], ["neutro", "Neutros"], ["no", "Sin bordes"]] as const} /></Lbl>
        <Lbl t="Brillo de neón"><Seg v={c.glow} set={v => set({ glow: v })} opts={[[0, "Suave"], [1, "Medio"], [2, "Intenso"]] as const} /></Lbl>
      </Panel>
      <Panel t="Efectos" icon={<Skull />} d="Todo se guarda en tu cuenta y se aplica al instante." className="space-y-3">
        <Lbl t="Lluvia de caracteres"><Seg v={c.lluvia} set={v => set({ lluvia: v })} opts={[[0, "Apagada"], [1, "Baja"], [2, "Media"], [3, "Alta"]] as const} /></Lbl>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={c.grid} set={v => set({ grid: v })} t="Cuadrícula" d="Grilla de fondo" />
          <Toggle on={c.scan} set={v => set({ scan: v })} t="Líneas de escaneo" d="Efecto de monitor CRT" />
          <Toggle on={c.flicker} set={v => set({ flicker: v })} t="Parpadeo" d="Titileo leve del neón" />
          <Toggle on={c.error} set={v => set({ error: v })} t="Error al entrar" d="Pantallazo rojo antes de la intro" />
        </div>
      </Panel>
      <Panel t="Pestaña del navegador" icon={<Skull />} d="Ícono y color de la pestaña mientras estás en este panel. El título va cifrado." className="space-y-3">
        <div className="space-y-1.5"><span className="font-sans text-xs font-semibold text-slate-300">Ícono</span><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{Object.entries(TAB_ICONS).map(([k, [l]]) => (
          <button key={k} onClick={() => set({ tabIco: k })} className={cn("grid place-items-center gap-1.5 rounded-xl border p-2 font-sans text-[11px] font-semibold transition", c.tabIco === k ? "border-six bg-six/10 text-six" : "border-six/15 text-slate-400 hover:border-six/40")}>
            <img src={tabIcon(k, c.tabCol === "tema" || c.tabCol === "arcoiris" ? colorOf(c.tema) : c.tabCol)} alt="" className="size-8" />{l}</button>))}</div></div>
        <div className="space-y-1.5"><span className="font-sans text-xs font-semibold text-slate-300">Color</span><div className="flex flex-wrap gap-2">{([["tema", "Del tema", colorOf(c.tema)], ...THEMES.filter(t => t[0] !== "arcoiris").map(t => [t[2], t[1], t[2]]), ["arcoiris", "Arcoíris", ""]] as [string, string, string][]).map(([v, l, col]) => (
          <button key={v} title={l} onClick={() => set({ tabCol: v })} className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1 font-sans text-[11px] font-semibold", c.tabCol === v ? "border-six bg-six/10 text-six" : "border-six/15 text-slate-400")}>
            <span className={cn("size-3.5 rounded-full", v === "arcoiris" && "six-rainbow-dot")} style={col ? { background: col } : undefined} />{l}</button>))}</div></div>
      </Panel>
      <Panel t="Intro" icon={<Power />} d={`La consola que aparece al abrir ${NAME()}.`} className="space-y-3">
        <Seg v={c.intro} set={v => set({ intro: v })} opts={[["completa", "Completa (~10 s)"], ["corta", "Corta (~4 s)"], ["no", "Sin intro"]] as const} />
        <div className="flex flex-wrap gap-2"><NBtn icon={<Power />} onClick={replay}>VER LA INTRO</NBtn><NBtn ghost icon={<RotateCcw />} onClick={() => set({ ...cfg0() })}>RESTABLECER TODO</NBtn></div>
      </Panel>
      <Panel t="Invitaciones" icon={<Ticket />} d="Para registrarse en la terminal hace falta un código. Un solo uso, vence a las 72 h." className="space-y-3"><Invites /></Panel>
      {NS.id === "six" && <Panel t="Mantenimiento · beta" icon={<Wrench />} d="Solo tu cuenta y tu IP. La contraseña se genera en el servidor y se muestra acá UNA sola vez: no queda guardada en ningún lado." className="space-y-3"><Mantenimiento /></Panel>}
      {NS.id === "six" && <Panel t="Códigos de autodestrucción" icon={<Bomb />} d="10 códigos que se muestran acá UNA sola vez (solo los ves vos). Sin uno, nadie borra información importante (cuentas, roster, catálogos, informes, expedientes…)." className="space-y-3"><Autodestruccion /></Panel>}
      {NS.id === "six" && <Panel t="Avisos de Discord" icon={<Bell />} d="Cada feedback nuevo llega a NOTIFICACIONES y al canal de Discord con mención." className="space-y-3"><DcTest /></Panel>}
      {NS.id === "six" && <Panel t="Contraseñas" icon={<KeyRound />} d="Restablecé la contraseña de quien la olvidó. Le das la temporal y al entrar la tiene que cambiar sí o sí." className="space-y-3 lg:col-span-2"><Accounts /></Panel>}
      {NS.id === "six" && <Panel t="Acceso de Anita" icon={<Users />} d="Qué cuenta abre el panel de Anita (sus datos son solo suyos; vos no los ves)." className="space-y-3"><AnitaAcc /></Panel>}
    </div>
  );
}

/* mantenimiento (beta): pedir la contraseña (llega por MD), y con ella prenderlo o apagarlo. También se apaga escribiéndola en el chat de la pantalla de mantenimiento */
function Mantenimiento() {
  const [m, setM] = useState<{ on?: boolean; at?: number; msg?: string } | null>(null), [pw, setPw] = useState(""), [nuevo, setNuevo] = useState(""), [msg, setMsg] = useState(""), [st, setSt] = useState(""), [busy, setBusy] = useState(false);
  const load = () => void authApi({ a: "maint", op: "state" }).then(r => { if (r.__s === 200) setM(r.m || { on: false }); else setSt(r.msg || ""); });
  useEffect(load, []);
  const run = async (op: string) => { setBusy(true); const r = await authApi({ a: "maint", op, pw, msg }); setBusy(false);
    if (r.__s !== 200) { setSt(r.msg || "No se pudo"); return; }
    if (op === "pw") { setNuevo(String(r.pw || "")); setPw(String(r.pw || "")); setSt("✓ Contraseña nueva: copiala, no se vuelve a mostrar."); }
    else { setPw(""); setSt(op === "on" ? "✓ Mantenimiento activado: el resto ve la pantalla de mantenimiento." : "✓ Mantenimiento apagado."); setM(r.m || { on: false }); } };
  return <div className="space-y-3 font-sans">
    <p className="text-sm">{m?.on ? <span className="font-semibold text-[#ff2b4a]">● Activo desde {new Date(m.at || 0).toLocaleString("es-AR")}</span> : <span className="text-slate-400">○ Apagado</span>}</p>
    <NBtn icon={<KeyRound />} disabled={busy} onClick={() => void run("pw")}>GENERAR CONTRASEÑA</NBtn>
    {nuevo && <Secret v={nuevo} />}
    <input value={pw} onChange={e => setPw(e.target.value.toUpperCase())} placeholder="Contraseña de mantenimiento" autoComplete="off" className="w-full rounded-xl border border-six/20 bg-black/40 px-3 py-2 font-mono text-sm tracking-widest text-slate-100 outline-none focus:border-six" />
    {!m?.on && <input value={msg} onChange={e => setMsg(e.target.value)} maxLength={300} placeholder="Aviso para la pantalla (opcional)" className="w-full rounded-xl border border-six/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-six" />}
    <div className="flex flex-wrap gap-2">{m?.on ? <NBtn icon={<Power />} disabled={busy || pw.length < 8} onClick={() => void run("off")}>APAGAR MANTENIMIENTO</NBtn>
      : <NBtn icon={<Wrench />} disabled={busy || pw.length < 8} onClick={() => void run("on")}>ACTIVAR MANTENIMIENTO</NBtn>}</div>
    {st && <p className={cn("text-xs", st.startsWith("✓") ? "text-six" : "text-[#ff2b4a]")}>{st}</p>}
  </div>;
}
/* un secreto recién generado: tapado hasta que lo tocás, con botón para copiar */
function Secret({ v, n }: { v: string; n?: number }) {
  const [show, setShow] = useState(false), [ok, setOk] = useState(false);
  return <div className="flex items-center gap-2 rounded-lg border border-six/30 bg-black/50 px-2.5 py-1.5 font-mono text-[13px]">
    {n && <span className="text-[10px] text-slate-500">{String(n).padStart(2, "0")}</span>}
    <button type="button" onClick={() => setShow(!show)} className={cn("flex-1 text-left tracking-widest", show ? "text-six" : "blur-[5px] text-slate-300")}>{v}</button>
    <button type="button" aria-label="Copiar" onClick={() => { void navigator.clipboard.writeText(v); setOk(true); setTimeout(() => setOk(false), 1200); }} className="text-slate-400 hover:text-six">{ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button></div>;
}
/* códigos de autodestrucción: se generan en el servidor y se muestran una sola vez acá */
function Autodestruccion() {
  const [S, setS] = useState<{ has?: boolean; unlocked?: boolean } | null>(null), [st, setSt] = useState(""), [busy, setBusy] = useState(false), [codes, setCodes] = useState<string[]>([]);
  const load = () => void authApi({ a: "sdstate" }).then(r => r.__s === 200 && setS(r as { has?: boolean; unlocked?: boolean }));
  useEffect(load, []);
  const gen = async () => { setBusy(true); const r = await authApi({ a: "sdgen" }); setBusy(false); if (r.__s === 200) { setCodes((r.codes as string[]) || []); setSt("✓ 10 códigos nuevos: guardalos ya, no se vuelven a mostrar. Los anteriores no sirven más."); } else setSt(r.msg || "No se pudo"); load(); };
  return <div className="space-y-3 font-sans">
    <p className="text-sm">{S?.has ? <span className="text-six">● Hay 10 códigos vigentes</span> : <span className="text-amber-300">○ Todavía no generaste códigos: hasta entonces los borrados importantes quedan bloqueados para todos.</span>}{S?.unlocked && <span className="ml-2 text-xs text-slate-400">(esta sesión está desbloqueada)</span>}</p>
    <NBtn icon={<Bomb />} disabled={busy} onClick={() => void gen()}>{S?.has ? "GENERAR CÓDIGOS NUEVOS" : "GENERAR 10 CÓDIGOS"}</NBtn>
    {codes.length > 0 && <div className="space-y-2"><div className="grid grid-cols-2 gap-1.5">{codes.map((c, i) => <Secret key={c} v={c} n={i + 1} />)}</div>
      <NBtn ghost icon={<Copy />} onClick={() => void navigator.clipboard.writeText(codes.map((c, i) => `${i + 1}. ${c}`).join("\n"))}>COPIAR LOS 10</NBtn>
      <NBtn ghost icon={<X />} onClick={() => setCodes([])}>YA LOS GUARDÉ · OCULTAR</NBtn></div>}
    {S?.has && <p className="text-xs text-slate-500">Para generar nuevos te va a pedir uno de los actuales.</p>}
    {st && <p className={cn("text-xs", st.startsWith("✓") ? "text-six" : "text-[#ff2b4a]")}>{st}</p>}
  </div>;
}

type Inv = { c: string; t: number; exp: number; u?: string; ut?: number; d?: string };
function Invites() {
  const { toast } = useFeedback(), [L, setL] = useState<Inv[]>([]), [U, setU] = useState<Inv[]>([]), [busy, setBusy] = useState(false), [d, setD] = useState<"lspd" | "lssd" | "sahp">("lspd");
  const load = () => void authApi({ a: "invites" }).then(r => { if (r.__s === 200) { setL(r.list); setU(r.used || []); } });
  useEffect(load, []);
  const cp = (c: string) => { void navigator.clipboard?.writeText(c).catch(() => {}); toast(`Copiado: ${c}`); };
  const f = (t: number) => new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return <div className="space-y-2">
    <Seg v={d} set={setD} opts={[["lspd", "LSPD"], ["lssd", "LSSD"], ["sahp", "SAHP"]] as const} />
    <NBtn className="w-full" icon={<Plus />} disabled={busy} onClick={async () => { setBusy(true); const r = await authApi({ a: "invite", d }); setBusy(false); if (r.__s !== 200) { toast(r.msg || "No se pudo generar", "err"); return; } cp(r.c); load(); }}>GENERAR INVITACIÓN</NBtn>
    {L.map(x => <div key={x.c} className="flex items-center gap-2 rounded-lg border border-six/20 bg-black/40 px-3 py-2 text-xs">
      <b className="font-mono text-sm text-six">{x.c}</b><span className="font-sans text-slate-500">vence {f(x.exp)}</span>
      <button title="Copiar" onClick={() => cp(x.c)} className="ml-auto text-slate-500 hover:text-six"><Copy className="size-3.5" /></button>
      <button title="Revocar" onClick={async () => { const r = await authApi({ a: "uninvite", c: x.c }); if (r.__s !== 200) { toast(r.msg || "No se pudo revocar", "err"); return; } load(); }} className="text-slate-600 hover:text-[#ff2b4a]"><Trash2 className="size-3.5" /></button></div>)}
    {U.length > 0 && <div className="pt-1"><p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500">USADAS</p>
      {U.slice().reverse().map(x => <p key={x.c} className="font-sans text-xs text-slate-500"><span className="font-mono">{x.c}</span> → <b className="text-slate-300">{x.u?.startsWith("lssd:") ? `${x.u.slice(5).split("/")[0]} (LSSD)` : x.u}</b>{x.ut ? ` · ${f(x.ut)}` : ""}</p>)}</div>}
  </div>;
}
/* six: restablecer contraseñas de las cuentas registradas */
type Acc = { n: string; c: number; last: number | null; must: boolean };
function Accounts() {
  const { toast, confirm } = useFeedback(), [L, setL] = useState<Acc[] | null>(null), [q, setQ] = useState(""), [tmp, setTmp] = useState<{ n: string; p: string } | null>(null);
  const load = async () => { const r = await authApi({ a: "sixaccs" }); if (r.__s === 200) setL(r.list as Acc[]); else toast(r.msg || "No se pudieron cargar las cuentas", "err"); };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = async (n: string) => {
    if (!(await confirm(`¿Restablecer la contraseña de ${n}? Se le cierran las sesiones abiertas y al entrar con la temporal va a tener que elegir una nueva.`, { danger: true, ok: "Restablecer" }))) return;
    const r = await authApi({ a: "sixreset", n }); if (r.__s !== 200) { toast(r.msg || "No se pudo restablecer", "err"); return; }
    setTmp({ n, p: r.tmp as string }); void load();
  };
  const f = (t: number | null) => (t ? new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca");
  if (!L) return <p className="font-sans text-xs text-slate-500">Cargando…</p>;
  const V = L.filter(a => !q || a.n.toLowerCase().includes(q.toLowerCase()));
  return <div className="space-y-3">
    {tmp && <div className="rounded-xl border border-six/40 bg-six/10 p-3 font-sans">
      <p className="text-xs text-slate-300">Contraseña temporal de <b className="text-white">{tmp.n}</b> — pasásela por privado:</p>
      <div className="mt-2 flex items-center gap-2"><code className="flex-1 rounded-lg bg-black/50 px-3 py-2 font-mono text-base tracking-wider text-six">{tmp.p}</code>
        <NBtn icon={<Copy />} onClick={() => { void navigator.clipboard?.writeText(tmp.p).then(() => toast("Contraseña copiada")); }}>COPIAR</NBtn><NBtn ghost icon={<X />} onClick={() => setTmp(null)}>LISTO</NBtn></div>
      <p className="mt-1.5 text-[11px] text-slate-500">No se vuelve a mostrar. Al entrar con esta contraseña, la terminal le pide cambiarla antes de dejarla usar.</p></div>}
    <div className="flex flex-wrap items-center gap-2"><NIn value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cuenta…" className="max-w-xs" />
      <span className="font-sans text-xs text-slate-500">{L.length} cuentas · {L.filter(a => a.must).length} con cambio pendiente</span></div>
    <div className="six-scroll max-h-80 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10">{V.map(a => (
      <div key={a.n} className="flex items-center gap-3 px-3 py-2 font-sans">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{a.n}</p><p className="text-[11px] text-slate-500">Último ingreso: {f(a.last)}</p></div>
        {a.must && <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">DEBE CAMBIARLA</span>}
        <NBtn ghost icon={<KeyRound />} onClick={() => void reset(a.n)}>RESTABLECER</NBtn>
      </div>))}</div>
  </div>;
}
function AnitaAcc() {
  const { toast } = useFeedback(), [d, setD] = useState<{ n: string; accounts: string[] } | null>(null);
  useEffect(() => { void authApi({ a: "anita" }).then(r => { if (r.__s === 200) setD({ n: r.n, accounts: r.accounts }); }); }, []);
  if (!d) return <p className="font-sans text-xs text-slate-500">Cargando…</p>;
  return <div className="space-y-2"><NSel v={d.n} set={async n => { const r = await authApi({ a: "anita", set: n }); if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return; } setD({ ...d, n }); toast(n ? `Panel de Anita: ${n}` : "Panel de Anita desactivado"); }}
    opts={[["", "— Nadie —"], ...d.accounts.map(a => [a, a] as const)] as const} />
    <p className="font-sans text-xs text-slate-500">Ella entra con 3 clics seguidos en el escudo de arriba a la izquierda (o Ctrl+Alt+A).</p></div>;
}
function DcTest() {
  const [st, setSt] = useState(""), [busy, setBusy] = useState(false);
  return <div className="flex flex-wrap items-center gap-3"><NBtn icon={<Bell />} disabled={busy} onClick={async () => { setBusy(true); const r = await api("/api/feedback", { test: true }); setBusy(false); setSt(r.ok ? "✓ Mensaje de prueba enviado al canal." : r.msg || "No se pudo enviar"); }}>PROBAR AVISO</NBtn>
    {st && <span className={cn("font-sans text-xs", st.startsWith("✓") ? "text-six" : "text-[#ff2b4a]")}>{st}</span>}</div>;
}

/* ---------- gestión de staff (bloqueado por ahora) ---------- */
function StaffTab({ staff, setStaff }: { staff: Staff[]; setStaff: (s: Staff[]) => void }) {
  const { toast, confirm } = useFeedback(), [q, setQ] = useState("");
  const upd = (id: string, p: Partial<Staff>) => setStaff(staff.map(s => (s.id === id ? { ...s, ...p } : s)));
  const L = staff.filter(s => !q || `${s.n} ${s.rol} ${s.dc} ${s.notas}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel t="Gestión de staff" icon={<Users />} d="Equipo del servidor con su rol y Discord ID (se usa para arrobar en los comunicados).">
      <div className="mb-4 flex flex-wrap gap-2"><NIn className="max-w-xs" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" />
        <NBtn icon={<Plus />} onClick={() => setStaff([...staff, { id: uid(), n: "", rol: "Moderación", dc: "", notas: "" }])}>AGREGAR</NBtn></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[48rem] text-sm">
        <thead><tr className="text-left text-[10px] tracking-[0.2em] text-six/70"><th className="pb-2">NOMBRE</th><th>ROL</th><th>DISCORD ID</th><th>NOTAS</th><th /></tr></thead>
        <tbody>{[...L].sort((a, b) => ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol) || a.n.localeCompare(b.n, "es")).map(s => (
          <tr key={s.id} className="border-t border-six/10">
            <td className="py-1.5 pr-2"><NIn className="py-1.5 font-semibold" value={s.n} onChange={e => upd(s.id, { n: e.target.value })} placeholder="Nombre" /></td>
            <td className="pr-2"><NSel className="w-40 py-1.5" v={s.rol} set={v => upd(s.id, { rol: v })} opts={ROLES.map(r => [r, r] as const)} /></td>
            <td className="pr-2"><div className="flex gap-1"><NIn className={cn("w-48 py-1.5 font-mono text-xs", s.dc && !isId(s.dc) && "!border-red-500")} value={s.dc} onChange={e => upd(s.id, { dc: e.target.value.replace(/\D/g, "") })} placeholder="ID de Discord" />
              <button title="Copiar mención" disabled={!isId(s.dc)} onClick={() => { void navigator.clipboard?.writeText(`<@${s.dc}>`); toast("Mención copiada"); }} className="rounded-lg p-1.5 text-slate-500 hover:text-six disabled:opacity-25"><AtSign className="size-4" /></button></div></td>
            <td className="pr-2"><NIn className="py-1.5 text-xs" value={s.notas} onChange={e => upd(s.id, { notas: e.target.value })} placeholder="—" /></td>
            <td><button aria-label="Quitar" onClick={async () => { if (await confirm(`¿Quitar a ${s.n || "esta fila"}?`, { danger: true })) setStaff(staff.filter(x => x.id !== s.id)); }} className="rounded-lg p-1.5 text-slate-600 hover:text-[#ff2b4a]"><Trash2 className="size-4" /></button></td>
          </tr>))}</tbody></table></div>
    </Panel>
  );
}

/* ---------- comunicados del staff: biblioteca, editor con vista de Discord, plantillas con el estilo de siempre y estadísticas ---------- */
const ins0 = (el: HTMLTextAreaElement | null, body: string, a: string, b = "") => { const s = el?.selectionStart ?? body.length, e = el?.selectionEnd ?? s;
  return { body: body.slice(0, s) + a + body.slice(s, e) + b + body.slice(e), at: s + a.length + (e - s) + b.length }; };
function ComTab({ staff, users }: { staff: Staff[]; users: Record<string, string> }) {
  const { toast, confirm } = useFeedback(), [list, setList] = useJSON<Com[]>(K("com"), []);
  const [rolesC, setRoles] = useJSON<Record<string, string>>(K("dcRoles"), {}), [chansC, setChans] = useJSON<Record<string, string>>(K("dcChans"), {});
  const roles = { ...DC_ROLES, ...rolesC }, chans = { ...DC_CHANS, ...chansC };
  const empty: Com = { id: "", t: "", body: "", ts: 0 };
  const [cur, setCur] = useState<Com>(empty), [q, setQ] = useState(""), [modal, setModal] = useState<"" | "imp" | "stats" | "ids">(""), ta = useRef<HTMLTextAreaElement>(null);
  const saved = list.find(x => x.id === cur.id), dirty = !saved ? !!cur.body.trim() : saved.body !== cur.body || saved.t !== cur.t;
  const put = (a: string, b = "") => { const r = ins0(ta.current, cur.body, a, b); setCur({ ...cur, body: r.body }); setTimeout(() => { ta.current?.focus(); ta.current?.setSelectionRange(r.at, r.at); }, 0); };
  const line = (p: string) => { const el = ta.current, s = el?.selectionStart ?? cur.body.length, st = cur.body.lastIndexOf("\n", s - 1) + 1; setCur({ ...cur, body: cur.body.slice(0, st) + p + cur.body.slice(st) }); };
  const save = () => { const x = { ...cur, id: cur.id || uid(), ts: Date.now(), t: cur.t.trim() || comTitle(cur.body) };
    setList([...list.filter(y => y.id !== x.id), x]); setCur(x); toast("Guardado"); };
  const open = async (x: Com) => { if (dirty && !(await confirm("Hay cambios sin guardar en el comunicado abierto. ¿Descartarlos?", { ok: "Descartar" }))) return; setCur(x); };
  const L = [...list].filter(x => !q.trim() || `${x.t} ${x.body}`.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => +!!b.pin - +!!a.pin || b.ts - a.ts);
  const chip = "rounded-full border px-2.5 py-0.5 font-sans text-xs transition";
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_minmax(0,1fr)]">
      <Panel className="space-y-2 p-3">
        <div className="grid grid-cols-2 gap-1.5"><NBtn icon={<Plus />} onClick={() => void open(empty)}>NUEVO</NBtn><NBtn ghost icon={<Upload />} onClick={() => setModal("imp")}>IMPORTAR</NBtn></div>
        <NIn value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar en ${list.length} comunicados…`} className="text-xs" />
        <div className="scrollbar-thin max-h-[60vh] space-y-0.5 overflow-y-auto">
          {!L.length && <p className="px-2 py-4 text-center font-sans text-xs text-slate-500">{list.length ? "Nada coincide." : "Todavía no hay comunicados. Importalos o creá uno."}</p>}
          {L.map(x => (
            <div key={x.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5 font-sans text-sm", cur.id === x.id ? "bg-six/10 text-six" : "hover:bg-white/5")}>
              <button className="min-w-0 flex-1 text-left" onClick={() => void open(x)}><span className="block truncate">{x.pin && <Pin className="mr-1 inline size-3 text-six" />}{x.t || "Sin título"}</span>
                <span className="block text-[10.5px] text-slate-500">{new Date(x.ts).toLocaleDateString("es-AR")}</span></button>
              <button aria-label="Fijar" title={x.pin ? "Desfijar" : "Fijar arriba"} onClick={() => setList(list.map(y => (y.id === x.id ? { ...y, pin: !y.pin } : y)))} className="opacity-0 group-hover:opacity-100"><Pin className={cn("size-3.5", x.pin ? "text-six" : "text-slate-500 hover:text-six")} /></button>
              <button aria-label="Duplicar" title="Usar como base" onClick={() => setCur({ ...x, id: "", t: `${x.t} (copia)`, pin: false })} className="opacity-0 group-hover:opacity-100"><Copy className="size-3.5 text-slate-500 hover:text-six" /></button>
              <button aria-label="Borrar" onClick={async () => { if (await confirm(`¿Borrar «${x.t}»?`, { danger: true })) { setList(list.filter(y => y.id !== x.id)); if (cur.id === x.id) setCur(empty); } }} className="opacity-0 group-hover:opacity-100"><X className="size-3.5 text-slate-500 hover:text-[#ff2b4a]" /></button>
            </div>))}
        </div>
      </Panel>
      <Panel t={cur.id ? "Editar comunicado" : "Comunicado nuevo"} icon={<Megaphone />} className="space-y-3">
        <Lbl t="Título" h="(para encontrarlo; si lo dejás vacío sale del encabezado)"><NIn value={cur.t} onChange={e => setCur({ ...cur, t: e.target.value })} placeholder={cur.body ? comTitle(cur.body) : "Ej.: Uso del canal /rstaff"} /></Lbl>
        <div className="space-y-1.5">
          <p className="font-sans text-[11px] font-semibold text-slate-500">Plantillas con el estilo de siempre</p>
          <div className="flex flex-wrap gap-1.5">{PLANTILLAS.map(([l, t]) => <button key={l} onClick={async () => { if (cur.body.trim() && !(await confirm("¿Reemplazar el texto por la plantilla?", { ok: "Reemplazar" }))) return; setCur({ ...cur, body: t }); }} className={cn(chip, "border-six/40 text-six hover:bg-six/10")}>{l}</button>)}
            <button onClick={() => setModal("stats")} className={cn(chip, "border-six/60 bg-six/10 font-semibold text-six hover:bg-six/20")}>📊 Estadísticas del mes</button>
            <button onClick={() => setCur({ ...cur, t: cur.t || "Consulta de interés · banda", body: consultaInteres() })} className={cn(chip, "border-six/40 text-six hover:bg-six/10")}>¿Siguen interesados?</button></div>
        </div>
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 font-sans text-[11px] font-semibold text-slate-500">Arrobar <button onClick={() => setModal("ids")} className="font-normal text-six/80 hover:text-six">· editar nombres de roles y canales</button></p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(roles).map(([id, n]) => <button key={id} onClick={() => put(`<@&${id}>`)} className={cn(chip, id === STAFF_ROLE ? "border-six/60 text-six" : "border-six/25 text-six/80", "hover:bg-six/10")}>@{n}</button>)}
            <button onClick={() => put(`||<@&${STAFF_ROLE}>||`)} className={cn(chip, "border-six/25 text-slate-300 hover:bg-white/5")} title="Como cierran todos los comunicados">||@STAFF|| (oculto)</button>
            {staff.filter(s => isId(s.dc)).map(s => <button key={s.id} onClick={() => put(`<@${s.dc}>`)} className={cn(chip, "border-white/10 text-slate-300 hover:bg-white/5")}>@{s.n}</button>)}
            {Object.entries(chans).map(([id, n]) => <button key={id} onClick={() => put(`<#${id}>`)} className={cn(chip, "border-white/10 text-slate-400 hover:bg-white/5")}>#{n}</button>)}
            <button onClick={() => put("@everyone")} className={cn(chip, "border-white/10 text-slate-400 hover:bg-white/5")}>@everyone</button></div>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-six/10 bg-black/30 p-1 font-sans text-[11px] text-slate-400">
          {([["B", () => put("**", "**"), "Negrita"], ["I", () => put("*", "*"), "Cursiva"], ["H1", () => line("# "), "Título"], ["H2", () => line("## "), "Subtítulo"], ["❝", () => line("> "), "Cita"], ["•", () => line("- "), "Lista"], ["▒", () => put("||", "||"), "Spoiler (oculto)"],
            ["⏱", () => put(`<t:${Math.floor(Date.now() / 1000) + 3600}:F>`), "Fecha y hora (dentro de 1 h; cambiá el número)"]] as const).map(([l, f, t]) =>
            <button key={l} type="button" title={t} onClick={f} className="rounded px-2 py-1 font-bold hover:bg-six/10 hover:text-six">{l}</button>)}
        </div>
        <NTa ref={ta} rows={18} className="font-mono text-xs" value={cur.body} onChange={e => setCur({ ...cur, body: e.target.value })} placeholder="Formato Discord: **negrita**, # títulos, > citas, ||spoiler||, <@&rol>…" />
        <div className="flex items-center justify-between gap-2"><span className="font-sans text-[11px] text-slate-500">{cur.body.length.toLocaleString("es-AR")} caracteres{cur.body.length > 2000 ? " · más de 2000 (con Nitro entra en uno)" : ""}</span>
          <NBtn icon={<Save />} disabled={!cur.body.trim() || !dirty} onClick={save}>GUARDAR</NBtn></div>
      </Panel>
      <Preview title="VISTA PREVIA" text={cur.body} users={users} roles={roles} chans={chans} />
      {modal === "imp" && <ImportCom have={list} onClose={() => setModal("")} onAdd={L2 => { setList([...list, ...L2]); toast(`${L2.length} comunicado${L2.length === 1 ? "" : "s"} importado${L2.length === 1 ? "" : "s"}`); setModal(""); }} />}
      {modal === "stats" && <StatsCom onClose={() => setModal("")} onUse={(t, body) => { setCur({ ...empty, t, body }); setModal(""); }} />}
      {modal === "ids" && <IdsCom roles={roles} chans={chans} onClose={() => setModal("")} onSave={(r, c) => { setRoles(r); setChans(c); setModal(""); toast("Nombres guardados"); }} />}
    </div>
  );
}
/* ventana del panel (mismo estilo oscuro) */
const SixModal = ({ t, onClose, children, wide }: { t: string; onClose: () => void; children: ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className={cn("six-panel relative max-h-[92vh] w-full overflow-y-auto rounded-2xl p-5", wide ? "max-w-4xl" : "max-w-2xl")}>
      <header className="mb-4 flex items-center gap-3"><h2 className="six-h flex-1 font-sans text-base font-bold">{t}</h2><button aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-six"><X className="size-4" /></button></header>
      {children}</section></div>);
function ImportCom({ have, onClose, onAdd }: { have: Com[]; onClose: () => void; onAdd: (L: Com[]) => void }) {
  const [t, setT] = useState(""), P = useMemo(() => splitComs(t), [t]), [off, setOff] = useState<number[]>([]);
  const dup = (b: string) => have.some(x => x.body.trim() === b.trim());
  return (
    <SixModal t="Importar comunicados" onClose={onClose} wide>
      <p className="mb-2 font-sans text-xs text-slate-400">Pegá todos los comunicados juntos, como los copiás de Discord. Se separan solos: cada uno empieza con su «# título» después de una línea en blanco doble.</p>
      <NTa rows={10} className="font-mono text-xs" value={t} onChange={e => { setT(e.target.value); setOff([]); }} placeholder="# 📢 Comunicado…" />
      {P.length > 0 && <div className="mt-3 space-y-1"><p className="font-sans text-xs font-semibold text-six">{P.length} encontrados</p>
        <div className="scrollbar-thin max-h-60 space-y-1 overflow-y-auto">{P.map((b, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 font-sans text-sm hover:bg-white/5">
            <input type="checkbox" checked={!off.includes(i) && !dup(b)} disabled={dup(b)} onChange={e => setOff(e.target.checked ? off.filter(x => x !== i) : [...off, i])} className="accent-[var(--c)]" />
            <span className="min-w-0 flex-1 truncate">{comTitle(b)}</span><span className="text-[11px] text-slate-500">{dup(b) ? "ya está" : `${b.length} car.`}</span></label>))}</div></div>}
      <div className="mt-4 flex justify-end gap-2"><NBtn ghost onClick={onClose}>CANCELAR</NBtn>
        <NBtn icon={<Upload />} disabled={!P.some((b, i) => !off.includes(i) && !dup(b))} onClick={() => onAdd(P.filter((b, i) => !off.includes(i) && !dup(b)).map((body, i) => ({ id: uid(), t: comTitle(body), body, ts: Date.now() - i * 1000 })))}>IMPORTAR</NBtn></div>
    </SixModal>);
}
function StatsCom({ onClose, onUse }: { onClose: () => void; onUse: (t: string, body: string) => void }) {
  const mesN = (d: Date) => d.toLocaleDateString("es-AR", { month: "long" }), now = new Date(), last = new Date(now.getFullYear(), now.getMonth() - 1, 1), prev = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const [f, setF] = useState<StatsF>({ mes: mesN(last), anio: String(last.getFullYear()), prevMes: mesN(prev), S: STATS0, resp: "", cierre: "", abiertos: "", sinAsig: "", sinResp: "" });
  const set = (p: Partial<StatsF>) => setF({ ...f, ...p }), num = (v: string) => v.replace(/\D/g, "");
  return (
    <SixModal t="📊 Estadísticas del mes" onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2"><Lbl t="Mes"><NIn value={f.mes} onChange={e => set({ mes: e.target.value })} /></Lbl><Lbl t="Año"><NIn value={f.anio} onChange={e => set({ anio: num(e.target.value) })} /></Lbl><Lbl t="Comparar con"><NIn value={f.prevMes} onChange={e => set({ prevMes: e.target.value })} /></Lbl></div>
          <div className="space-y-1.5"><div className="grid grid-cols-[1fr_5rem_5rem] gap-2 font-sans text-[11px] font-semibold text-slate-500"><span>Dato</span><span>{f.mes || "Mes"}</span><span>{f.prevMes || "Anterior"}</span></div>
            {f.S.map((s, i) => <div key={s.k} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2"><span className="font-sans text-xs text-slate-300">{s.l}</span>
              <NIn inputMode="numeric" value={s.now} onChange={e => set({ S: f.S.map((x, j) => (j === i ? { ...x, now: num(e.target.value) } : x)) })} className="py-1.5 text-xs" />
              <NIn inputMode="numeric" value={s.prev} onChange={e => set({ S: f.S.map((x, j) => (j === i ? { ...x, prev: num(e.target.value) } : x)) })} className="py-1.5 text-xs" placeholder="—" /></div>)}</div>
          <p className="font-sans text-[11px] font-semibold text-slate-500">Punto a mejorar (opcional)</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{([["resp", "1.ª resp. (min)"], ["cierre", "Cierre (h)"], ["abiertos", "Abiertos"], ["sinAsig", "Sin asignar"], ["sinResp", "Sin respuesta"]] as const).map(([k, l]) =>
            <Lbl key={k} t={l}><NIn inputMode="numeric" value={f[k]} onChange={e => set({ [k]: num(e.target.value) } as Partial<StatsF>)} className="py-1.5 text-xs" /></Lbl>)}</div>
        </div>
        <div className="space-y-2"><div className="max-h-[60vh] overflow-y-auto rounded-xl border border-six/10 bg-[#313338] p-4 font-sans text-[14px] leading-relaxed text-[#dbdee1]" dangerouslySetInnerHTML={{ __html: discordHtml(statsText(f), { roles: { ...DC_ROLES } }, "six", "/next/logo.svg") }} />
          <div className="flex justify-end gap-2"><NBtn ghost onClick={onClose}>CANCELAR</NBtn><NBtn icon={<Check />} onClick={() => onUse(`Estadísticas · ${f.mes} ${f.anio}`, statsText(f))}>USAR EN EL EDITOR</NBtn></div></div>
      </div>
    </SixModal>);
}
function IdsCom({ roles, chans, onClose, onSave }: { roles: Record<string, string>; chans: Record<string, string>; onClose: () => void; onSave: (r: Record<string, string>, c: Record<string, string>) => void }) {
  const [R, setR] = useState(Object.entries(roles)), [C, setC] = useState(Object.entries(chans)), [nid, setNid] = useState(""), [nk, setNk] = useState<"r" | "c">("r");
  const rows = (L: [string, string][], set: (L: [string, string][]) => void, pre: string) => L.map(([id, n], i) => (
    <div key={id} className="grid grid-cols-[1fr_11rem_auto] items-center gap-2"><NIn value={n} onChange={e => set(L.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} className="py-1.5 text-xs" /><span className="truncate font-mono text-[10.5px] text-slate-500">{pre}{id}</span>
      <button aria-label="Quitar" onClick={() => set(L.filter((_, j) => j !== i))} className="text-slate-500 hover:text-[#ff2b4a]"><X className="size-3.5" /></button></div>));
  return (
    <SixModal t="Roles y canales de Discord" onClose={onClose}>
      <p className="mb-3 font-sans text-xs text-slate-400">Los nombres los deduje de los comunicados: corregilos si alguno no es así. Solo cambian cómo se ven en la vista previa y en los botones.</p>
      <p className="mb-1.5 font-sans text-xs font-semibold text-six">Roles</p><div className="space-y-1.5">{rows(R, setR, "@&")}</div>
      <p className="mb-1.5 mt-4 font-sans text-xs font-semibold text-six">Canales</p><div className="space-y-1.5">{rows(C, setC, "#")}</div>
      <div className="mt-4 flex gap-2"><NSel v={nk} set={setNk} opts={[["r", "Rol"], ["c", "Canal"]] as const} className="w-28" /><NIn value={nid} onChange={e => setNid(e.target.value.replace(/\D/g, ""))} placeholder="ID de Discord" className="font-mono text-xs" />
        <NBtn ghost icon={<Plus />} disabled={!isId(nid)} onClick={() => { (nk === "r" ? setR : setC)(L => [...L, [nid, nk === "r" ? "rol" : "canal"]]); setNid(""); }}>SUMAR</NBtn></div>
      <div className="mt-5 flex justify-end gap-2"><NBtn ghost onClick={onClose}>CANCELAR</NBtn><NBtn icon={<Save />} onClick={() => onSave(Object.fromEntries(R.filter(x => x[1].trim())), Object.fromEntries(C.filter(x => x[1].trim())))}>GUARDAR</NBtn></div>
    </SixModal>);
}

/* ---------- equipo de ilícitos: postulaciones y sanciones de banda ---------- */
function IlicTab({ users }: { users: Record<string, string> }) {
  const [v, setV] = useState<"post" | "sanc">(() => (LS.get("lspdt.next.sixIlic") as "post" | "sanc") || "post");
  return <div className="space-y-5"><div className="max-w-md"><Seg v={v} set={x => { setV(x); LS.set("lspdt.next.sixIlic", x); }} opts={[["post", "POSTULACIONES"], ["sanc", "AVISOS · STRIKES · DISBAND"]] as const} /></div>
    {v === "post" ? <PostTab users={users} /> : <SancTab users={users} />}</div>;
}

type SancT = "aviso" | "strike" | "disband";
type Sanc = { id: string; ts: number; t: SancT; banda: string; motivo: string; desc: string; cons: string; n: number; st: "act" | "cum" | "ret"; ids: string; txt: string };
const SANC: Record<SancT, { l: string; h: string; e: string; cons: string; st: string }> = {
  aviso: { l: "AVISO DE BANDA", h: "# AVISO DE BANDA ⚠️", e: "🟡", cons: "Si se vuelve a dar el mismo aviso, se generará 1 STRIKE.", st: "Aviso" },
  strike: { l: "STRIKE DE BANDA", h: "# ⚠️ ・STRIKE DE BANDA", e: "🔴", cons: "Si volvemos a ver situaciones parecidas, se os pondrá otro Strike.", st: "Strike" },
  disband: { l: "DISBAND", h: "# ☠️ ・DISBAND DE BANDA", e: "⚫", cons: "La banda queda disuelta y sus integrantes no podrán volver a postularse con el mismo proyecto.", st: "Disband" },
};
const ORD = ["PRIMER", "SEGUNDO", "TERCER", "CUARTO", "QUINTO"];
const ST_L: Record<Sanc["st"], string> = { act: "Activo", cum: "Cumplido", ret: "Retirado" };
function sancText(x: Omit<Sanc, "id" | "ts" | "txt">, prevAv: number, strikes: number) {
  const S = SANC[x.t], est = x.t === "disband" ? "⚫ Banda disuelta" : `${x.st === "act" ? S.e : x.st === "cum" ? "🟢" : "⚪"} ${S.st} ${ST_L[x.st]}`;
  return [S.h, "_ _", "", ...(x.banda.trim() ? [`🏴 Banda: **${x.banda.trim()}**`, ""] : []),
    ` 🔨 Sanción aplicada: ${x.t === "strike" ? `**${x.n} Strike${x.n > 1 ? "s" : ""} de Banda**` : x.t === "aviso" ? "**AVISO**" : "**DISBAND**"}`, "",
    ` 📌 Motivo: ${x.motivo.trim() || "[motivo]"}`, "", ...(x.desc.trim() ? [` 📝 Descripción: ${x.desc.trim()}`, ""] : []),
    ` 🚨 Consecuencia: ${x.cons.trim() || S.cons}`, "",
    ...(x.t === "aviso" && prevAv > 0 ? [`**ES EL ${ORD[prevAv] || prevAv + 1 + "º"} AVISO POR LO MISMO, AL TERCERO SE CONVIERTE EN STRIKE**`, ""] : []),
    ...(x.t === "strike" ? [`**Strikes acumulados: ${strikes}/3**${strikes >= 3 ? " — al tercero corresponde el disband" : ""}`, ""] : []),
    `**Estado: ${est}**`, "", firmaDe(FIRMAS[0]), ...(mentions(x.ids).length ? ["", mentions(x.ids).join(" ")] : [])].join("\n");
}
function SancTab({ users }: { users: Record<string, string> }) {
  const { toast } = useFeedback(), [L, setL] = useJSON<Sanc[]>(K("sanc"), []);
  const blank = { t: "aviso" as SancT, banda: "", motivo: "", desc: "", cons: "", n: 1, st: "act" as Sanc["st"], ids: "" };
  const [f, setF] = useState(blank), [eid, setEid] = useState(""), set = (p: Partial<typeof blank>) => setF({ ...f, ...p });
  const same = (x: Sanc) => x.id !== eid && x.banda.trim().toLowerCase() === f.banda.trim().toLowerCase() && !!f.banda.trim();
  const prevAv = L.filter(x => same(x) && x.t === "aviso" && x.st === "act" && x.motivo.trim().toLowerCase() === f.motivo.trim().toLowerCase()).length;
  const strikes = L.filter(x => same(x) && x.t === "strike" && x.st === "act").reduce((a, x) => a + x.n, 0) + (f.t === "strike" ? f.n : 0);
  const txt = sancText(f, prevAv, strikes), bandas = [...new Set(L.map(x => x.banda))];
  const resumen = (b: string) => { const A = L.filter(x => x.banda === b && x.st === "act"); return { av: A.filter(x => x.t === "aviso").length, sk: A.filter(x => x.t === "strike").reduce((a, x) => a + x.n, 0), db: L.some(x => x.banda === b && x.t === "disband" && x.st !== "ret") }; };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel t="Sanciones de banda" icon={<Skull />} d="Aviso, strike o disband en formato Discord. Lleva la cuenta por banda." className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">{(Object.keys(SANC) as SancT[]).map(t => (
          <button key={t} onClick={() => set({ t, cons: "" })} className={cn("rounded-xl border p-3 text-left text-xs font-bold tracking-[0.12em] transition", f.t === t ? "border-six bg-six/10 text-six six-ico" : "border-six/15 text-slate-500 hover:bg-white/5")}>
            {SANC[t].e} {SANC[t].l}</button>))}</div>
        <Lbl t="Banda"><NIn list="six-bandas" value={f.banda} onChange={e => set({ banda: e.target.value })} placeholder="Ej.: Los Vagos" /><datalist id="six-bandas">{bandas.map(b => <option key={b} value={b} />)}</datalist></Lbl>
        {f.banda.trim() && (() => { const r = resumen(L.find(x => x.banda.toLowerCase() === f.banda.trim().toLowerCase())?.banda || f.banda); return <p className="-mt-2 font-sans text-xs text-slate-400">Activos de esta banda: {r.av} aviso{r.av === 1 ? "" : "s"} · {r.sk} strike{r.sk === 1 ? "" : "s"}{r.db ? " · DISUELTA" : ""}{f.t === "aviso" && prevAv >= 2 ? " · ⚠️ este sería el tercer aviso por lo mismo: corresponde strike" : ""}</p>; })()}
        <Lbl t="Motivo"><NIn value={f.motivo} onChange={e => set({ motivo: e.target.value })} placeholder="No enviar entorno o enviar entorno mal redactado" /></Lbl>
        <Lbl t="Descripción" h="(opcional)"><NTa rows={3} value={f.desc} onChange={e => set({ desc: e.target.value })} placeholder="No enviar entorno estando enmascarados, portando armas y cargando a una persona PK." /></Lbl>
        <Lbl t="Consecuencia" h="(si lo dejás vacío va la de siempre)"><NIn value={f.cons} onChange={e => set({ cons: e.target.value })} placeholder={SANC[f.t].cons} /></Lbl>
        <div className="grid gap-3 sm:grid-cols-3">
          {f.t === "strike" && <Lbl t="Cantidad"><NSel v={f.n} set={n => set({ n })} opts={[[1, "1 strike"], [2, "2 strikes"], [3, "3 strikes"]] as const} /></Lbl>}
          {f.t !== "disband" && <Lbl t="Estado"><NSel v={f.st} set={st => set({ st })} opts={[["act", "Activo"], ["cum", "Cumplido"], ["ret", "Retirado"]] as const} /></Lbl>}
          <Lbl t="Mencionar" h="(IDs, opcional)"><NIn className="font-mono text-xs" value={f.ids} onChange={e => set({ ids: e.target.value })} placeholder="2318…" /></Lbl>
        </div>
        <div className="flex justify-end gap-2">
          {eid && <NBtn ghost onClick={() => { setEid(""); setF(blank); }}>CANCELAR</NBtn>}
          <NBtn icon={<Check />} disabled={!f.banda.trim() || !f.motivo.trim()} onClick={() => { const r: Sanc = { ...f, banda: f.banda.trim(), id: eid || uid(), ts: L.find(x => x.id === eid)?.ts || Date.now(), txt };
            setL([...L.filter(x => x.id !== r.id), r].slice(-300)); void navigator.clipboard?.writeText(txt); toast(eid ? "Actualizado y copiado" : "Copiado y registrado"); setEid(""); setF(blank); }}>{eid ? "GUARDAR Y COPIAR" : "COPIAR Y REGISTRAR"}</NBtn></div>
      </Panel>
      <div className="space-y-5">
        <Preview title={SANC[f.t].l} text={txt} users={users} />
        {L.length > 0 && <Panel className="p-4"><p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-six/80">REGISTRO · {L.length}</p>
          <div className="max-h-80 space-y-1 overflow-y-auto">{[...L].sort((a, b) => b.ts - a.ts).map(x => (
            <div key={x.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-sans text-sm hover:bg-white/5">
              <span className={cn("rounded px-1.5 text-[10px] font-bold", x.t === "aviso" ? "bg-amber-400/15 text-amber-300" : x.t === "strike" ? "bg-[#ff2b4a]/15 text-[#ff2b4a]" : "bg-slate-400/15 text-slate-300")}>{x.t === "strike" ? `${x.n} STRIKE` : x.t.toUpperCase()}</span>
              <button onClick={() => { setEid(x.id); setF({ t: x.t, banda: x.banda, motivo: x.motivo, desc: x.desc, cons: x.cons, n: x.n, st: x.st, ids: x.ids }); }} className="min-w-0 flex-1 truncate text-left" title="Editar">{x.banda} · <span className="text-slate-500">{x.motivo}</span></button>
              {x.t !== "disband" && <select value={x.st} onChange={e => setL(L.map(y => (y.id === x.id ? { ...y, st: e.target.value as Sanc["st"] } : y)))} className="rounded border border-six/20 bg-black/40 px-1 text-[11px] text-slate-300">{(["act", "cum", "ret"] as const).map(k => <option key={k} value={k} className="bg-[#0a0d12]">{ST_L[k]}</option>)}</select>}
              <span className="text-[11px] text-slate-600">{new Date(x.ts).toLocaleDateString()}</span>
              <button title="Copiar" onClick={() => { void navigator.clipboard?.writeText(x.txt); toast("Copiado"); }} className="text-slate-500 hover:text-six"><Copy className="size-3.5" /></button>
              <button title="Quitar" onClick={() => setL(L.filter(y => y.id !== x.id))} className="text-slate-600 hover:text-[#ff2b4a]"><Trash2 className="size-3.5" /></button>
            </div>))}</div></Panel>}
      </div>
    </div>
  );
}

function PostTab({ users }: { users: Record<string, string> }) {
  const { toast } = useFeedback(), [sent, setSent] = useJSON<Sent[]>(K("ilic"), []);
  const [f, setF] = useState<IlicForm>({ ids: "", banda: "", res: "aceptada", motivos: "", v: "std", saludo: "auto", firma: FIRMAS[0], seguir: false, norma: true });
  const set = (p: Partial<IlicForm>) => setF({ ...f, ...p });
  const txt = ilicText(f), bad = f.ids.split(/[\s,;]+/).filter(Boolean).filter(x => !isId(x.replace(/[<@!>]/g, ""))), ok = f.res === "aceptada";
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel t="Postulaciones de bandas" icon={<Skull />} d="Respuesta del equipo de ilícitos, lista para pegar en Discord." className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">{(["aceptada", "rechazada"] as const).map(r => (
          <button key={r} onClick={() => set({ res: r })} className={cn("rounded-xl border p-3 text-left text-sm font-bold tracking-[0.12em] transition", f.res === r ? "border-six bg-six/10 text-six six-ico" : "border-six/15 text-slate-500 hover:bg-white/5")}>
            {r === "aceptada" ? "✅ ACEPTADA" : "❌ RECHAZADA"}</button>))}</div>
        <Lbl t="A quién va" h="(Discord ID, uno o varios)"><NIn className={cn("font-mono text-xs", bad.length > 0 && "!border-red-500")} value={f.ids} onChange={e => set({ ids: e.target.value })} placeholder="231832931780395008, 4567…" /></Lbl>
        {bad.length > 0 && <p className="-mt-2 font-sans text-xs text-[#ff2b4a]">No parece un ID de Discord: {bad.join(", ")} (son de 17 a 20 números).</p>}
        <Lbl t="Nombre de la banda"><NIn value={f.banda} onChange={e => set({ banda: e.target.value })} placeholder="Ej.: Los Vagos" /></Lbl>
        <Lbl t="Motivos" h={ok ? "(opcional, uno por línea)" : "(uno por línea)"}>
          <NTa rows={4} value={f.motivos} onChange={e => set({ motivos: e.target.value })} placeholder={ok ? "Historia trabajada y coherente\nBuen rol en la entrevista" : "La historia no explica el origen de la banda\nFaltan integrantes activos"} /></Lbl>
        <div className="grid gap-3 sm:grid-cols-3">
          <Lbl t="Variante"><NSel v={f.v} set={v => set({ v })} opts={ILIC_VARS} /></Lbl>
          <Lbl t="Saludo"><NSel v={f.saludo} set={v => set({ saludo: v })} opts={[["auto", "Según la hora"], ["dias", "Buenos días"], ["tardes", "Buenas tardes"], ["noches", "Buenas noches"], ["hola", "¡Hola!"]] as const} /></Lbl>
          <Lbl t="Firma"><NSel v={f.firma} set={v => set({ firma: v })} opts={FIRMAS.map(x => [x, `Atte.: … ${x}`] as const)} /></Lbl>
        </div>
        <div className="grid gap-2">
          {ok && <Toggle on={!!f.norma} set={v => set({ norma: v })} t="Recordar la normativa de exposed" d="Si hay un exposed: grabar siempre y entregar los POV cuando se pidan; si no, baneo inmediato." />}
          <Toggle on={!!f.seguir} set={v => set({ seguir: v })} t="Preguntar si siguen interesados" d={ok ? "Piden confirmar que quieren seguir con el proyecto y entrar al Discord de bandas." : "Les ofrece avisar si quieren seguir con el proceso y volver a postularse."} />
        </div>
        <div className="flex justify-end"><NBtn icon={<Check />} disabled={!f.banda.trim()} onClick={() => { setSent([...sent, { id: uid(), ts: Date.now(), banda: f.banda.trim(), res: f.res, txt }].slice(-200)); void navigator.clipboard?.writeText(txt); toast("Copiado y guardado en el historial"); }}>COPIAR Y REGISTRAR</NBtn></div>
      </Panel>
      <div className="space-y-5">
        <Preview title={`POSTULACIÓN ${f.res.toUpperCase()}`} text={txt} users={users} />
        {sent.length > 0 && <Panel className="p-4"><p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-six/80">HISTORIAL · {sent.length}</p>
          <div className="max-h-72 space-y-1 overflow-y-auto">{[...sent].reverse().map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-sans text-sm hover:bg-white/5">
              <span className={cn("rounded px-1.5 text-[10px] font-bold", s.res === "aceptada" ? "bg-six/15 text-six" : "bg-[#ff2b4a]/15 text-[#ff2b4a]")}>{s.res.toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate">{s.banda}</span><span className="text-[11px] text-slate-600">{new Date(s.ts).toLocaleDateString("es-AR")}</span>
              <button title="Copiar" onClick={() => { void navigator.clipboard?.writeText(s.txt); toast("Copiado"); }} className="text-slate-500 hover:text-six"><Copy className="size-3.5" /></button>
            </div>))}</div></Panel>}
      </div>
    </div>
  );
}

/* ---------- logs: todo lo que se hace en la terminal (quién, qué, dónde y cuándo) ---------- */
type Log = { id: number; t: number; n: string; a: string; k: string; d: string; ip: string };
const KL: [RegExp, string][] = [[/^login$/, "Sesión"], [/^cuenta$/, "Cuentas"], [/^feedback$/, "Feedback"], [/^mdexam$/, "METRO · Examen en línea"], [/^robos$/, "Robos (vista compartida)"],
  [/^lspdt\.roster$/, "Roster general"], [/^lspdt\.ui$/, "Ajustes de la terminal"], [/^lspdt\.profiles$/, "Perfiles de agentes"], [/^lspdt\.(foto|pfoto)\./, "Foto de perfil"], [/^lspdt\.uprof\./, "Preferencias de su perfil"], [/^lspdt\.cover\./, "Portada de perfil"],
  [/^lspdt\.informes$/, "Informes policiales"], [/^lspdt\.ois$/, "Informes OIS"], [/^lspdt\.votes$/, "Votaciones"], [/^lspdt\.(entrev|sgt\.)/, "Entrevistas / exámenes de sargento"], [/^lspdt\.alertas$/, "Alertas"],
  [/^lspdt\.huellas/, "Huellas"], [/^lspdt\.perdArm$/, "Pérdida de armamento"], [/^lspdt\.patHist$/, "Registro de patrullas"], [/^lspdt\.penal$/, "Código penal"], [/^lspdt\.faltas$/, "Catálogo de faltas (PSB)"],
  [/^lspdt\.psb/, "PSB"], [/^lspdt\.asd/, "ASD"], [/^lspdt\.k9/, "K-9"], [/^lspdt\.rtd/, "RTD"], [/^lspdt\.md(Roster|Calls)$/, "METRO · Roster"], [/^lspdt\.mdx\.armas$/, "METRO · Armas"],
  [/^lspdt\.mdx\.conv$/, "METRO · Convocatorias"], [/^lspdt\.mdx\.eval$/, "METRO · Evaluaciones"], [/^lspdt\.mdx\.bank$/, "METRO · Banco del examen"], [/^lspdt\.calpub$/, "Calendario público"],
  [/^lspdt\.drec\.([a-z0-9]+)\.cal$/, "Calendario · $1"], [/^lspdt\.drec\.([a-z0-9]+)\.([a-z0-9]+)$/, "División $1 · $2"], [/^lspdt\.(unif)\.(.+)$/, "Uniformidad · $2"], [/^lspdt\.instr\.(.+)$/, "Instrucciones · $1"],
  [/^lspdt\.comms\.(.+)$/, "Comunicados · $1"], [/^lspdt\.boards?\./, "Pizarra"], [/^lspdt\.six\./, "six"], [/^lspdt\.(logo|fav|bg|img|divlogo|ico|lib)/, "Imágenes de la terminal"], [/^lspdt\.calban\./, "Banner de evento"]];
const kLab = (k: string) => { for (const [r, l] of KL) { const m = k.match(r); if (m) return l.replace(/\$(\d)/g, (_, i) => m[+i] || ""); } return k.replace(/^lspdt\./, ""); };
const A_C = (a: string) => (/borr|elimin|quit|rechaz|strike|incorrecta/.test(a) ? "#ef4444" : /cre|envi|subi|aprob|inici|dio|empez|entreg/.test(a) ? "#22c55e" : /sesi/.test(a) ? "#64748b" : "#38bdf8");
function LogsTab() {
  const [L, setL] = useState<Log[]>([]), [who, setWho] = useState<{ n: string; c: number }[]>([]), [f, setF] = useState(""), [qq, setQ] = useState(""), [busy, setBusy] = useState(false), [more, setMore] = useState(true);
  const load = async (before?: number) => {
    setBusy(true); const p = new URLSearchParams({ logs: "1", ...(before ? { before: String(before) } : {}), ...(f ? { who: f } : {}), ...(qq.trim() ? { q: qq.trim() } : {}) });
    const r = await api("/api/data?" + p); setBusy(false); if (r.__s !== 200) return;
    setL(x => (before ? [...x, ...r.list] : r.list)); setWho(r.who || []); setMore(r.list.length >= 200);
  };
  useEffect(() => { const i = setTimeout(() => void load(), qq ? 350 : 0); return () => clearTimeout(i); }, [f, qq]); // eslint-disable-line react-hooks/exhaustive-deps
  const day = (t: number) => new Date(t).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Panel t="Personas" icon={<Users />} className="lg:sticky lg:top-20 lg:self-start">
        <div className="max-h-[60vh] space-y-0.5 overflow-y-auto font-sans text-sm">
          {[{ n: "", c: who.reduce((t, x) => t + x.c, 0) }, ...who].map(x => <button key={x.n || "_"} onClick={() => setF(x.n)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition", f === x.n ? "bg-six/15 text-six" : "text-slate-300 hover:bg-white/5")}>
            <span className="min-w-0 flex-1 truncate">{x.n || "Todos"}</span><span className="text-xs tabular-nums text-slate-500">{x.c}</span></button>)}</div></Panel>
      <Panel t="Registro de actividad" icon={<ScrollText />} d="Todo lo que se crea, edita o borra en la terminal, quién lo hizo y desde qué IP. Las ediciones seguidas de lo mismo se juntan en una línea. Se guardan 4 meses.">
        <div className="mb-3 flex gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><NIn className="pl-9" value={qq} onChange={e => setQ(e.target.value)} placeholder="Buscar por sección, acción o detalle…" /></div>
          <NBtn icon={<RefreshCw className={cn(busy && "animate-spin")} />} onClick={() => void load()}>ACTUALIZAR</NBtn></div>
        {!L.length ? <p className="py-10 text-center font-sans text-sm text-slate-500">{busy ? "Cargando…" : "No hay registros."}</p>
        : <div className="font-sans text-sm">{L.map((x, i) => <div key={x.id}>
            {(i === 0 || day(L[i - 1].t) !== day(x.t)) && <p className="sticky top-0 z-[1] mb-1 mt-3 bg-[#07090d]/90 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-six backdrop-blur first:mt-0">{day(x.t)}</p>}
            <div className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[.03]">
              <span className="w-14 shrink-0 pt-px font-mono text-xs tabular-nums text-slate-500">{new Date(x.t).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: A_C(x.a), boxShadow: `0 0 8px ${A_C(x.a)}` }} />
              <div className="min-w-0 flex-1"><p><b className="text-white">{x.n || "—"}</b> <span style={{ color: A_C(x.a) }}>{x.a}</span> <span className="text-slate-300">{kLab(x.k)}</span></p>
                {x.d && <p className="break-words text-xs text-slate-500">{x.d}</p>}</div>
              <span className="hidden shrink-0 font-mono text-[10.5px] text-slate-600 md:block" title={x.k}>{x.ip}</span></div></div>)}
          {more && <div className="mt-3 flex justify-center"><NBtn ghost disabled={busy} onClick={() => void load(L[L.length - 1].t)}>CARGAR MÁS</NBtn></div>}</div>}
      </Panel>
    </div>);
}
