/* six: apartado privado (solo su dueño), con interfaz y temas propios, sin nada de la MDT.
   Pestañas (A-Z): Administración · Comunicados · Equipo de ilícitos · Gestión de staff. Los datos van en lspdt.six.* (el servidor no se los muestra a nadie más). */
import { forwardRef, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { AtSign, Check, Copy, FileText, Lock, Megaphone, Plus, Power, RotateCcw, Save, Settings2, Skull, Trash2, Users, X } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { useJSON } from "@/lib/store";
import { discordHtml } from "@/lib/discord";
import { uid } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { FIRMAS, ILIC_VARS, consultaInteres, ilicText, type IlicForm } from "./ilicito";
import { Boot, CFG0, CFG_KEY, Rain, THEMES, colorOf, hex, type SixCfg } from "./fx";

type Staff = { id: string; n: string; rol: string; dc: string; notas: string };
type Com = { id: string; t: string; body: string; ts: number };
type Sent = { id: string; ts: number; banda: string; res: IlicForm["res"]; txt: string };
const ROLES = ["Owner", "Administración", "Moderación", "Soporte", "Ilícitos", "Desarrollo", "Otro"];
const TABS = [["adm", "ADMINISTRACIÓN", Settings2], ["com", "COMUNICADOS", Megaphone], ["ilic", "EQUIPO DE ILÍCITOS", Skull], ["staff", "GESTIÓN DE STAFF", Users]] as const;
type Tab = (typeof TABS)[number][0];
const LOCKED: Tab[] = ["com", "staff"]; // próximamente
const isId = (s: string) => /^\d{17,20}$/.test(s.trim());

/* ---------- controles propios: sólidos, borde fino y degradado ---------- */
const fld = "w-full rounded-xl border border-white/10 bg-gradient-to-b from-[#10151c] to-[#090c11] px-3 py-2 font-sans text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-[var(--c)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c)_18%,transparent)]";
const NIn = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, r) => <input ref={r} {...p} className={cn(fld, className)} />);
const NTa = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, r) => <textarea ref={r} {...p} className={cn(fld, "resize-y leading-relaxed", className)} />);
function NSel<T extends string | number>({ v, set, opts, className }: { v: T; set: (v: T) => void; opts: readonly (readonly [T, string])[]; className?: string }) {
  return <select value={String(v)} onChange={e => set(opts.find(o => String(o[0]) === e.target.value)![0])} className={cn(fld, "cursor-pointer", className)}>{opts.map(([k, l]) => <option key={String(k)} value={String(k)} className="bg-[#0a0d12]">{l}</option>)}</select>;
}
const Lbl = ({ t, h, children }: { t: string; h?: string; children: ReactNode }) => (
  <label className="block space-y-1.5"><span className="font-sans text-xs font-semibold text-slate-300">{t}{h && <span className="ml-1.5 font-normal text-slate-500">{h}</span>}</span>{children}</label>);
function NBtn({ children, icon, ghost, className, ...p }: { icon?: ReactNode; ghost?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-35 [&>svg]:size-3.5",
    ghost ? "text-slate-400 hover:bg-white/5 hover:text-[var(--c)]" : "six-btn border border-[var(--c)]/60 bg-[var(--c)]/10 text-[var(--c)] hover:bg-[var(--c)]/20", className)}>{icon}{children}</button>;
}
const Panel = ({ children, className, t, icon, d }: { children: ReactNode; className?: string; t?: string; icon?: ReactNode; d?: string }) => (
  <section className={cn("six-panel relative rounded-2xl p-5", className)}>
    <i className="six-corner tl" /><i className="six-corner br" />
    {t && <header className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg border border-[var(--c)]/40 bg-[var(--c)]/10 text-[var(--c)] six-ico [&>svg]:size-4">{icon}</span>
      <div><h2 className="six-h font-sans text-base font-bold">{t}</h2>{d && <p className="font-sans text-xs text-slate-500">{d}</p>}</div></header>}
    {children}
  </section>);
const Toggle = ({ on, set, t, d }: { on: boolean; set: (v: boolean) => void; t: string; d?: string }) => (
  <button type="button" onClick={() => set(!on)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left font-sans text-sm transition", on ? "border-[var(--c)]/70 bg-[var(--c)]/10" : "border-white/10 hover:bg-white/5")}>
    <span className={cn("relative h-5 w-9 shrink-0 rounded-full border transition", on ? "border-[var(--c)] bg-[var(--c)]/30" : "border-white/15 bg-black/40")}><span className={cn("absolute top-0.5 size-3.5 rounded-full transition-all", on ? "left-[18px] bg-[var(--c)] six-ico" : "left-0.5 bg-slate-500")} /></span>
    <span><b className={on ? "text-[var(--c)]" : "text-slate-300"}>{t}</b>{d && <span className="block text-xs text-slate-500">{d}</span>}</span></button>);
function Seg<T extends string | number>({ v, set, opts }: { v: T; set: (v: T) => void; opts: readonly (readonly [T, string])[] }) {
  return <div className="flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1">{opts.map(([k, l]) => (
    <button key={String(k)} type="button" onClick={() => set(k)} className={cn("flex-1 rounded-lg px-2 py-1.5 font-sans text-xs font-semibold transition", v === k ? "bg-[var(--c)]/15 text-[var(--c)] shadow-[inset_0_0_0_1px_var(--c)]" : "text-slate-500 hover:text-slate-300")}>{l}</button>))}</div>;
}

/* vista previa estilo Discord con copiar */
function Preview({ title, text, users }: { title: string; text: string; users: Record<string, string> }) {
  const { toast } = useFeedback(), [ok, setOk] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(text); setOk(true); toast("Copiado"); setTimeout(() => setOk(false), 1400); };
  return (
    <Panel className="lg:sticky lg:top-20">
      <div className="mb-3 flex items-center gap-2"><span className="six-dot" /><span className="text-[11px] font-bold tracking-[0.2em] text-[var(--c)]">{title}</span>
        <NBtn className="ml-auto" icon={ok ? <Check /> : <Copy />} onClick={copy} disabled={!text.trim()}>{ok ? "COPIADO" : "COPIAR"}</NBtn></div>
      <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-white/5 bg-[#313338] p-4 font-sans text-[15px] leading-relaxed text-[#dbdee1]"
        dangerouslySetInnerHTML={{ __html: discordHtml(text, { users }, "six", "/next/logo.svg") }} />
    </Panel>);
}

/* ---------- panel ---------- */
export function Six({ onExit }: { onExit: () => void }) {
  const [cfg, setCfg] = useJSON<SixCfg>(CFG_KEY, CFG0), c = { ...CFG0, ...cfg };
  const [booted, setBooted] = useState(c.intro === "no"), [replay, setReplay] = useState(0), [tab, setTab] = useState<Tab>("ilic"), [out, setOut] = useState(false);
  const [staff, setStaff] = useJSON<Staff[]>("lspdt.six.staff", []);
  const users = useMemo(() => Object.fromEntries(staff.filter(s => isId(s.dc)).map(s => [s.dc.trim(), s.n])), [staff]);
  const [clock, setClock] = useState(""), [sig, setSig] = useState(hex(8));
  useEffect(() => { const f = () => { setClock(new Date().toLocaleTimeString("es-AR", { hour12: false })); setSig(hex(8)); }; f(); const i = setInterval(f, 1000); return () => clearInterval(i); }, []);
  useEffect(() => { const t = document.title; document.title = "six"; return () => { document.title = t; }; }, []);
  const color = colorOf(c.tema), exit = () => { setOut(true); setTimeout(onExit, 650); };
  const set = (p: Partial<SixCfg>) => setCfg({ ...c, ...p });
  return (
    <div className={cn("six-root relative min-h-[100dvh] overflow-hidden bg-[#030407] font-mono text-slate-300", out && "six-out", c.flicker && "six-flk")}
      style={{ ["--c" as string]: color, ["--gl" as string]: [0.35, 1, 1.8][c.glow] }}>
      {!booted && <Boot key={replay} short={c.intro === "corta"} onDone={() => setBooted(true)} />}
      {c.grid && <div className="six-grid pointer-events-none fixed inset-0" aria-hidden />}
      {c.lluvia > 0 && <div className="pointer-events-none fixed inset-0" aria-hidden><Rain color={color} opacity={[0, 0.06, 0.11, 0.18][c.lluvia]} /></div>}
      <div className="six-vignette pointer-events-none fixed inset-0" aria-hidden />
      {c.scan && <div className="six-scan pointer-events-none fixed inset-0 z-40" aria-hidden />}

      <header className="sticky top-0 z-30 border-b border-[var(--c)]/25 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4">
          <span className="six-logo text-3xl font-black" data-t="six">six</span>
          <div className="hidden text-[10px] leading-tight text-slate-500 md:block"><p>SESIÓN PRIVADA · <span className="text-[var(--c)]">CIFRADA</span></p><p>FIRMA {sig.toUpperCase()}</p></div>
          <nav className="mx-auto flex gap-1 rounded-xl border border-white/5 bg-black/40 p-1">{TABS.map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} title={l} className={cn("six-tab inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold tracking-[0.14em] transition",
              tab === k ? "on text-[var(--c)]" : "text-slate-500 hover:text-[var(--c)]")}><I className="size-4" /><span className="hidden lg:inline">{l}</span>{LOCKED.includes(k) && <Lock className="size-3 opacity-60" />}</button>))}</nav>
          <span className="hidden tabular-nums text-sm text-[var(--c)] six-txt xl:inline">{clock}</span>
          <NBtn ghost icon={<Power />} onClick={exit} title="Volver a la MDT"><span className="hidden sm:inline">SALIR</span></NBtn>
        </div>
        <div className="six-line h-px" />
      </header>

      <main key={tab} className="six-in relative mx-auto max-w-[1600px] px-4 py-6">
        {LOCKED.includes(tab) ? <Soon t={TABS.find(x => x[0] === tab)![1]} />
          : tab === "adm" ? <AdmTab c={c} set={set} replay={() => { setReplay(x => x + 1); setBooted(false); }} />
          : tab === "staff" ? <StaffTab staff={staff} setStaff={setStaff} />
          : tab === "com" ? <ComTab staff={staff} users={users} />
          : <IlicTab users={users} />}
      </main>
      <footer className="relative pb-6 text-center text-[10px] tracking-[0.3em] text-slate-600">six · SOLO VOS VES ESTO</footer>
    </div>
  );
}

const Soon = ({ t }: { t: string }) => (
  <Panel className="mx-auto grid max-w-xl place-items-center gap-3 py-16 text-center">
    <span className="grid size-14 place-items-center rounded-2xl border border-[var(--c)]/50 bg-[var(--c)]/10 text-[var(--c)] six-ico"><Lock className="size-6" /></span>
    <p className="six-h text-2xl font-black tracking-[0.3em]">PRÓXIMAMENTE</p>
    <p className="font-sans text-sm text-slate-500">{t} está bloqueado por ahora. Se habilita en una próxima versión.</p>
  </Panel>);

/* ---------- administración: temas y efectos de six ---------- */
function AdmTab({ c, set, replay }: { c: SixCfg; set: (p: Partial<SixCfg>) => void; replay: () => void }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel t="Tema" icon={<Settings2 />} d="Color de toda la interfaz de six. No toca nada de la MDT." className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{THEMES.map(([k, l, col]) => (
          <button key={k} onClick={() => set({ tema: k })} style={{ ["--c" as string]: col }} className={cn("group grid place-items-center gap-2 rounded-xl border p-3 font-sans text-xs font-semibold transition", c.tema === k ? "border-[var(--c)] bg-[var(--c)]/10 text-[var(--c)]" : "border-white/10 text-slate-400 hover:border-white/25")}>
            <span className="size-7 rounded-full bg-[var(--c)] six-ico" />{l}</button>))}</div>
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
      <Panel t="Intro" icon={<Power />} d="La consola que aparece al entrar." className="space-y-3 lg:col-span-2">
        <Seg v={c.intro} set={v => set({ intro: v })} opts={[["completa", "Completa (~10 s)"], ["corta", "Corta (~4 s)"], ["no", "Sin intro"]] as const} />
        <div className="flex flex-wrap gap-2"><NBtn icon={<Power />} onClick={replay}>VER LA INTRO</NBtn>
          <NBtn ghost icon={<RotateCcw />} onClick={() => set({ ...CFG0 })}>RESTABLECER TODO</NBtn></div>
      </Panel>
    </div>
  );
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
        <thead><tr className="text-left text-[10px] tracking-[0.2em] text-[var(--c)]/70"><th className="pb-2">NOMBRE</th><th>ROL</th><th>DISCORD ID</th><th>NOTAS</th><th /></tr></thead>
        <tbody>{[...L].sort((a, b) => ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol) || a.n.localeCompare(b.n, "es")).map(s => (
          <tr key={s.id} className="border-t border-white/5">
            <td className="py-1.5 pr-2"><NIn className="py-1.5 font-semibold" value={s.n} onChange={e => upd(s.id, { n: e.target.value })} placeholder="Nombre" /></td>
            <td className="pr-2"><NSel className="w-40 py-1.5" v={s.rol} set={v => upd(s.id, { rol: v })} opts={ROLES.map(r => [r, r] as const)} /></td>
            <td className="pr-2"><div className="flex gap-1"><NIn className={cn("w-48 py-1.5 font-mono text-xs", s.dc && !isId(s.dc) && "!border-red-500")} value={s.dc} onChange={e => upd(s.id, { dc: e.target.value.replace(/\D/g, "") })} placeholder="ID de Discord" />
              <button title="Copiar mención" disabled={!isId(s.dc)} onClick={() => { void navigator.clipboard?.writeText(`<@${s.dc}>`); toast("Mención copiada"); }} className="rounded-lg p-1.5 text-slate-500 hover:text-[var(--c)] disabled:opacity-25"><AtSign className="size-4" /></button></div></td>
            <td className="pr-2"><NIn className="py-1.5 text-xs" value={s.notas} onChange={e => upd(s.id, { notas: e.target.value })} placeholder="—" /></td>
            <td><button aria-label="Quitar" onClick={async () => { if (await confirm(`¿Quitar a ${s.n || "esta fila"}?`, { danger: true })) setStaff(staff.filter(x => x.id !== s.id)); }} className="rounded-lg p-1.5 text-slate-600 hover:text-[#ff2b4a]"><Trash2 className="size-4" /></button></td>
          </tr>))}</tbody></table></div>
    </Panel>
  );
}

/* ---------- comunicados (bloqueado por ahora) ---------- */
function ComTab({ staff, users }: { staff: Staff[]; users: Record<string, string> }) {
  const { toast, confirm } = useFeedback(), [list, setList] = useJSON<Com[]>("lspdt.six.com", []);
  const [cur, setCur] = useState<Com>({ id: "", t: "", body: "", ts: 0 }), ta = useRef<HTMLTextAreaElement>(null);
  const ins = (s: string) => { const el = ta.current, a = el?.selectionStart ?? cur.body.length, b = el?.selectionEnd ?? a; setCur({ ...cur, body: cur.body.slice(0, a) + s + cur.body.slice(b) }); };
  const save = () => { const x = { ...cur, id: cur.id || uid(), ts: Date.now(), t: cur.t.trim() || cur.body.split("\n")[0].replace(/[#*_<>@!:\d]/g, "").trim().slice(0, 60) || "Comunicado" };
    setList([...list.filter(y => y.id !== x.id), x]); setCur(x); toast("Guardado"); };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1fr)]">
      <Panel className="p-3">
        <NBtn className="mb-2 w-full" icon={<Plus />} onClick={() => setCur({ id: "", t: "", body: "", ts: 0 })}>NUEVO</NBtn>
        {[...list].sort((a, b) => b.ts - a.ts).map(x => (
          <div key={x.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5 font-sans text-sm", cur.id === x.id ? "bg-[var(--c)]/10 text-[var(--c)]" : "hover:bg-white/5")}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => setCur(x)}><FileText className="mr-1.5 inline size-3.5" />{x.t || "Sin título"}</button>
            <button aria-label="Borrar" onClick={async () => { if (await confirm(`¿Borrar «${x.t}»?`, { danger: true })) setList(list.filter(y => y.id !== x.id)); }} className="opacity-0 group-hover:opacity-100"><X className="size-3.5 text-slate-500 hover:text-[#ff2b4a]" /></button>
          </div>))}
      </Panel>
      <Panel t="Comunicado" icon={<Megaphone />} className="space-y-3">
        <Lbl t="Título"><NIn value={cur.t} onChange={e => setCur({ ...cur, t: e.target.value })} placeholder="Para encontrarlo después" /></Lbl>
        <div className="flex flex-wrap gap-1.5">{staff.filter(s => isId(s.dc)).map(s => <button key={s.id} onClick={() => ins(`<@${s.dc}>`)} className="rounded-full border border-[var(--c)]/30 px-2.5 py-0.5 font-sans text-xs text-[var(--c)]/90 hover:bg-[var(--c)]/10">@{s.n}</button>)}
          <button onClick={() => ins("@everyone")} className="rounded-full border border-white/10 px-2.5 py-0.5 font-sans text-xs text-slate-400 hover:bg-white/5">@everyone</button>
          <button onClick={() => setCur({ ...cur, t: cur.t || "Consulta de interés · banda", body: consultaInteres() })} className="rounded-full border border-[var(--c)]/40 px-2.5 py-0.5 font-sans text-xs text-[var(--c)] hover:bg-[var(--c)]/10">Plantilla: ¿siguen interesados?</button></div>
        <NTa ref={ta} rows={16} className="font-mono text-xs" value={cur.body} onChange={e => setCur({ ...cur, body: e.target.value })} placeholder="Formato Discord: **negrita**, # títulos, <@ID> para arrobar…" />
        <div className="flex justify-end"><NBtn icon={<Save />} onClick={save}>GUARDAR</NBtn></div>
      </Panel>
      <Preview title="VISTA PREVIA" text={cur.body} users={users} />
    </div>
  );
}

/* ---------- equipo de ilícitos: respuesta a postulaciones ---------- */
function IlicTab({ users }: { users: Record<string, string> }) {
  const { toast } = useFeedback(), [sent, setSent] = useJSON<Sent[]>("lspdt.six.ilic", []);
  const [f, setF] = useState<IlicForm>({ ids: "", banda: "", res: "aceptada", motivos: "", v: "std", saludo: "auto", firma: FIRMAS[0], seguir: false, norma: true });
  const set = (p: Partial<IlicForm>) => setF({ ...f, ...p });
  const txt = ilicText(f), bad = f.ids.split(/[\s,;]+/).filter(Boolean).filter(x => !isId(x.replace(/[<@!>]/g, ""))), ok = f.res === "aceptada";
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel t="Postulaciones de bandas" icon={<Skull />} d="Respuesta del equipo de ilícitos, lista para pegar en Discord." className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">{(["aceptada", "rechazada"] as const).map(r => (
          <button key={r} onClick={() => set({ res: r })} className={cn("rounded-xl border p-3 text-left text-sm font-bold tracking-[0.12em] transition", f.res === r ? "border-[var(--c)] bg-[var(--c)]/10 text-[var(--c)] six-ico" : "border-white/10 text-slate-500 hover:bg-white/5")}>
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
        {sent.length > 0 && <Panel className="p-4"><p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[var(--c)]/80">HISTORIAL · {sent.length}</p>
          <div className="max-h-72 space-y-1 overflow-y-auto">{[...sent].reverse().map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-sans text-sm hover:bg-white/5">
              <span className={cn("rounded px-1.5 text-[10px] font-bold", s.res === "aceptada" ? "bg-[var(--c)]/15 text-[var(--c)]" : "bg-[#ff2b4a]/15 text-[#ff2b4a]")}>{s.res.toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate">{s.banda}</span><span className="text-[11px] text-slate-600">{new Date(s.ts).toLocaleDateString("es-AR")}</span>
              <button title="Copiar" onClick={() => { void navigator.clipboard?.writeText(s.txt); toast("Copiado"); }} className="text-slate-500 hover:text-[var(--c)]"><Copy className="size-3.5" /></button>
            </div>))}</div></Panel>}
      </div>
    </div>
  );
}
