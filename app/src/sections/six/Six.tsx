/* six: apartado privado (solo su dueño), con interfaz propia de neón, sin nada de la MDT.
   pestañas: gestión de staff · comunicados · equipo de ilícitos. los datos van en lspdt.six.* (el servidor no se los muestra a nadie más). */
import { forwardRef, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { AtSign, Check, Copy, FileText, Megaphone, Plus, Power, Save, Skull, Trash2, Users, X } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { useJSON } from "@/lib/store";
import { discordHtml } from "@/lib/discord";
import { uid } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { ILIC_VARS, consultaInteres, ilicText, type IlicForm } from "./ilicito";
import { Loader, Rain, hex } from "./fx";

type Staff = { id: string; n: string; rol: string; dc: string; notas: string };
type Com = { id: string; t: string; body: string; ts: number };
type Sent = { id: string; ts: number; banda: string; res: IlicForm["res"]; txt: string };
const ROLES = ["Owner", "Administración", "Moderación", "Soporte", "Ilícitos", "Desarrollo", "Otro"];
const TABS = [["staff", "gestión de staff", Users, "#00f0ff"], ["com", "comunicados", Megaphone, "#ff2bd6"], ["ilic", "equipo de ilícitos", Skull, "#39ff88"]] as const;
type Tab = (typeof TABS)[number][0];
const isId = (s: string) => /^\d{17,20}$/.test(s.trim());

/* ---------- controles propios ---------- */
const fld = "w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-[var(--c)] focus:shadow-[0_0_0_1px_var(--c),0_0_18px_-4px_var(--c)]";
const NIn = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, r) => <input ref={r} {...p} className={cn(fld, className)} />);
const NTa = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, r) => <textarea ref={r} {...p} className={cn(fld, "resize-y", className)} />);
function NSel<T extends string>({ v, set, opts, className }: { v: T; set: (v: T) => void; opts: readonly (readonly [T, string])[]; className?: string }) {
  return <select value={v} onChange={e => set(e.target.value as T)} className={cn(fld, "cursor-pointer", className)}>{opts.map(([k, l]) => <option key={k} value={k} className="bg-[#07090d]">{l}</option>)}</select>;
}
const Lbl = ({ t, h, children }: { t: string; h?: string; children: ReactNode }) => (
  <label className="block space-y-1.5"><span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--c)]/80">{t}{h && <span className="ml-1.5 tracking-normal text-slate-500">{h}</span>}</span>{children}</label>);
function NBtn({ children, icon, ghost, className, ...p }: { icon?: ReactNode; ghost?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-35 [&>svg]:size-3.5",
    ghost ? "text-slate-400 hover:bg-white/5 hover:text-[var(--c)]" : "six-btn border border-[var(--c)]/60 bg-[var(--c)]/10 text-[var(--c)] hover:bg-[var(--c)]/20", className)}>{icon}{children}</button>;
}
const Panel = ({ children, className, t, icon, d }: { children: ReactNode; className?: string; t?: string; icon?: ReactNode; d?: string }) => (
  <section className={cn("six-panel relative rounded-2xl p-5", className)}>
    <i className="six-corner tl" /><i className="six-corner br" />
    {t && <header className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg border border-[var(--c)]/40 bg-[var(--c)]/10 text-[var(--c)] shadow-[0_0_14px_-4px_var(--c)] [&>svg]:size-4">{icon}</span>
      <div><h2 className="six-h text-base font-bold tracking-[0.2em]">{t}</h2>{d && <p className="text-xs text-slate-500">{d}</p>}</div></header>}
    {children}
  </section>);

/* vista previa estilo Discord con copiar */
function Preview({ title, text, users }: { title: string; text: string; users: Record<string, string> }) {
  const { toast } = useFeedback(), [ok, setOk] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(text); setOk(true); toast("copiado"); setTimeout(() => setOk(false), 1400); };
  return (
    <Panel className="lg:sticky lg:top-20">
      <div className="mb-3 flex items-center gap-2"><span className="six-dot" /><span className="text-[11px] font-bold tracking-[0.22em] text-[var(--c)]">{title}</span>
        <NBtn className="ml-auto" icon={ok ? <Check /> : <Copy />} onClick={copy} disabled={!text.trim()}>{ok ? "copiado" : "copiar"}</NBtn></div>
      <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-white/5 bg-[#313338] p-4 font-sans text-[15px] leading-relaxed text-[#dbdee1]"
        dangerouslySetInnerHTML={{ __html: discordHtml(text, { users }, "six", "/next/logo.svg") }} />
    </Panel>);
}

/* ---------- panel ---------- */
export function Six({ onExit }: { onExit: () => void }) {
  const [booted, setBooted] = useState(false), [tab, setTab] = useState<Tab>("staff"), [out, setOut] = useState(false);
  const [staff, setStaff] = useJSON<Staff[]>("lspdt.six.staff", []);
  const users = useMemo(() => Object.fromEntries(staff.filter(s => isId(s.dc)).map(s => [s.dc.trim(), s.n])), [staff]);
  const [clock, setClock] = useState(""), [sig, setSig] = useState(hex(8));
  useEffect(() => { const f = () => { setClock(new Date().toLocaleTimeString("es-AR", { hour12: false })); setSig(hex(8)); }; f(); const i = setInterval(f, 1000); return () => clearInterval(i); }, []);
  useEffect(() => { document.title = "six"; return () => { document.title = "LSPD Terminal"; }; }, []);
  const color = TABS.find(t => t[0] === tab)![3];
  const exit = () => { setOut(true); setTimeout(onExit, 650); };
  return (
    <div className={cn("six-root relative min-h-[100dvh] overflow-hidden bg-[#030407] font-mono text-slate-300", out && "six-out")} style={{ ["--c" as string]: color }}>
      {!booted && <Loader onDone={() => setBooted(true)} />}
      <div className="six-grid pointer-events-none fixed inset-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0" aria-hidden><Rain color={color} opacity={0.07} /></div>
      <div className="six-vignette pointer-events-none fixed inset-0" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-[var(--c)]/20 bg-black/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4">
          <span className="six-logo text-3xl font-black" data-t="six">six</span>
          <div className="hidden text-[10px] leading-tight text-slate-500 md:block"><p>sesión privada · <span className="text-[var(--c)]">cifrada</span></p><p>firma {sig}</p></div>
          <nav className="mx-auto flex gap-1 rounded-xl border border-white/5 bg-black/40 p-1">{TABS.map(([k, l, I, c]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ["--c" as string]: c }} className={cn("six-tab inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold tracking-[0.16em] transition",
              tab === k ? "on text-[var(--c)]" : "text-slate-500 hover:text-[var(--c)]")}><I className="size-4" /><span className="hidden sm:inline">{l}</span></button>))}</nav>
          <span className="hidden tabular-nums text-sm text-[var(--c)] drop-shadow-[0_0_6px_var(--c)] lg:inline">{clock}</span>
          <NBtn ghost icon={<Power />} onClick={exit} title="volver a la mdt"><span className="hidden sm:inline">salir</span></NBtn>
        </div>
        <div className="six-line h-px" />
      </header>

      <main key={tab} className="six-in relative mx-auto max-w-[1600px] px-4 py-6">
        {tab === "staff" && <StaffTab staff={staff} setStaff={setStaff} />}
        {tab === "com" && <ComTab staff={staff} users={users} />}
        {tab === "ilic" && <IlicTab users={users} />}
      </main>
      <footer className="relative pb-6 text-center text-[10px] tracking-[0.3em] text-slate-600">six · solo vos ves esto</footer>
    </div>
  );
}

/* ---------- gestión de staff ---------- */
function StaffTab({ staff, setStaff }: { staff: Staff[]; setStaff: (s: Staff[]) => void }) {
  const { toast, confirm } = useFeedback(), [q, setQ] = useState("");
  const upd = (id: string, p: Partial<Staff>) => setStaff(staff.map(s => (s.id === id ? { ...s, ...p } : s)));
  const L = staff.filter(s => !q || `${s.n} ${s.rol} ${s.dc} ${s.notas}`.toLowerCase().includes(q.toLowerCase()));
  const byRol = ROLES.map(r => [r, staff.filter(s => s.rol === r).length] as const).filter(x => x[1]);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="en el equipo" v={staff.length} />
        <Stat k="con discord" v={staff.filter(s => isId(s.dc)).length} />
        {byRol.slice(0, 2).map(([r, n]) => <Stat key={r} k={r.toLowerCase()} v={n} />)}
      </div>
      <Panel t="gestión de staff" icon={<Users />} d="equipo del servidor con su rol y discord id (se usa para arrobar en los comunicados).">
        <div className="mb-4 flex flex-wrap gap-2"><NIn className="max-w-xs" value={q} onChange={e => setQ(e.target.value)} placeholder="buscar…" />
          <NBtn icon={<Plus />} onClick={() => setStaff([...staff, { id: uid(), n: "", rol: "Moderación", dc: "", notas: "" }])}>agregar</NBtn></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[48rem] text-sm">
          <thead><tr className="text-left text-[10px] tracking-[0.2em] text-[var(--c)]/70"><th className="pb-2 font-semibold">nombre</th><th className="font-semibold">rol</th><th className="font-semibold">discord id</th><th className="font-semibold">notas</th><th /></tr></thead>
          <tbody>{[...L].sort((a, b) => ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol) || a.n.localeCompare(b.n, "es")).map(s => (
            <tr key={s.id} className="six-row border-t border-white/5">
              <td className="py-1.5 pr-2"><NIn className="py-1.5 font-semibold" value={s.n} onChange={e => upd(s.id, { n: e.target.value })} placeholder="nombre" /></td>
              <td className="pr-2"><NSel className="w-40 py-1.5" v={s.rol} set={v => upd(s.id, { rol: v })} opts={ROLES.map(r => [r, r] as const)} /></td>
              <td className="pr-2"><div className="flex gap-1"><NIn className={cn("w-48 py-1.5 text-xs", s.dc && !isId(s.dc) && "!border-red-500")} value={s.dc} onChange={e => upd(s.id, { dc: e.target.value.replace(/\D/g, "") })} placeholder="id de discord" />
                <button title="copiar mención" disabled={!isId(s.dc)} onClick={() => { void navigator.clipboard?.writeText(`<@${s.dc}>`); toast("mención copiada"); }} className="rounded-lg p-1.5 text-slate-500 hover:text-[var(--c)] disabled:opacity-25"><AtSign className="size-4" /></button></div></td>
              <td className="pr-2"><NIn className="py-1.5 text-xs" value={s.notas} onChange={e => upd(s.id, { notas: e.target.value })} placeholder="—" /></td>
              <td><button aria-label="quitar" onClick={async () => { if (await confirm(`¿Quitar a ${s.n || "esta fila"}?`, { danger: true })) setStaff(staff.filter(x => x.id !== s.id)); }} className="rounded-lg p-1.5 text-slate-600 hover:text-[#ff2b5e]"><Trash2 className="size-4" /></button></td>
            </tr>))}</tbody></table>
          {!staff.length && <p className="py-10 text-center text-sm text-slate-600">todavía no cargaste a nadie.</p>}</div>
      </Panel>
    </div>
  );
}
const Stat = ({ k, v }: { k: string; v: number }) => (
  <div className="six-panel relative rounded-xl px-4 py-3"><p className="text-[10px] tracking-[0.22em] text-slate-500">{k}</p><p className="six-num text-3xl font-black text-[var(--c)]">{String(v).padStart(2, "0")}</p></div>);

/* ---------- comunicados libres ---------- */
function ComTab({ staff, users }: { staff: Staff[]; users: Record<string, string> }) {
  const { toast, confirm } = useFeedback(), [list, setList] = useJSON<Com[]>("lspdt.six.com", []);
  const [cur, setCur] = useState<Com>({ id: "", t: "", body: "", ts: 0 }), ta = useRef<HTMLTextAreaElement>(null);
  const ins = (s: string) => { const el = ta.current, a = el?.selectionStart ?? cur.body.length, b = el?.selectionEnd ?? a; setCur({ ...cur, body: cur.body.slice(0, a) + s + cur.body.slice(b) }); };
  const save = () => { const c = { ...cur, id: cur.id || uid(), ts: Date.now(), t: cur.t.trim() || cur.body.split("\n")[0].replace(/[#*_<>@!:\d]/g, "").trim().slice(0, 60) || "Comunicado" };
    setList([...list.filter(x => x.id !== c.id), c]); setCur(c); toast("guardado"); };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1fr)]">
      <Panel className="p-3">
        <NBtn className="mb-2 w-full" icon={<Plus />} onClick={() => setCur({ id: "", t: "", body: "", ts: 0 })}>nuevo</NBtn>
        {[...list].sort((a, b) => b.ts - a.ts).map(c => (
          <div key={c.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition", cur.id === c.id ? "bg-[var(--c)]/10 text-[var(--c)] shadow-[inset_2px_0_0_var(--c)]" : "hover:bg-white/5")}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => setCur(c)}><FileText className="mr-1.5 inline size-3.5" />{c.t || "sin título"}</button>
            <button aria-label="borrar" onClick={async () => { if (await confirm(`¿Borrar «${c.t}»?`, { danger: true })) setList(list.filter(x => x.id !== c.id)); }} className="opacity-0 group-hover:opacity-100"><X className="size-3.5 text-slate-500 hover:text-[#ff2b5e]" /></button>
          </div>))}
        {!list.length && <p className="px-2 py-4 text-xs text-slate-600">sin comunicados guardados.</p>}
      </Panel>
      <Panel t="comunicado" icon={<Megaphone />} className="space-y-3">
        <Lbl t="título"><NIn value={cur.t} onChange={e => setCur({ ...cur, t: e.target.value })} placeholder="para encontrarlo después" /></Lbl>
        <div className="flex flex-wrap gap-1.5">{staff.filter(s => isId(s.dc)).map(s => <button key={s.id} onClick={() => ins(`<@${s.dc}>`)} className="rounded-full border border-[var(--c)]/30 px-2.5 py-0.5 text-xs text-[var(--c)]/90 transition hover:bg-[var(--c)]/10 hover:shadow-[0_0_10px_-2px_var(--c)]">@{s.n}</button>)}
          <button onClick={() => ins("@everyone")} className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-slate-400 hover:bg-white/5">@everyone</button></div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] tracking-[0.2em] text-slate-500">plantillas</span>
          <button onClick={() => setCur({ ...cur, t: cur.t || "Consulta de interés · banda", body: consultaInteres() })} className="rounded-lg border border-[var(--c)]/40 bg-[var(--c)]/5 px-2.5 py-1 text-xs text-[var(--c)] transition hover:bg-[var(--c)]/15 hover:shadow-[0_0_12px_-3px_var(--c)]">¿siguen interesados? (bandas)</button></div>
        <NTa ref={ta} rows={16} className="text-xs" value={cur.body} onChange={e => setCur({ ...cur, body: e.target.value })} placeholder="formato discord: **negrita**, # títulos, <@ID> para arrobar…" />
        <div className="flex justify-end"><NBtn icon={<Save />} onClick={save}>guardar</NBtn></div>
      </Panel>
      <Preview title="vista previa" text={cur.body} users={users} />
    </div>
  );
}

/* ---------- equipo de ilícitos: respuesta a postulaciones ---------- */
function IlicTab({ users }: { users: Record<string, string> }) {
  const { toast } = useFeedback(), [sent, setSent] = useJSON<Sent[]>("lspdt.six.ilic", []);
  const [f, setF] = useState<IlicForm>({ ids: "", banda: "", res: "aceptada", motivos: "", v: "std", saludo: "auto", firma: "Atte.: Equipo de Ilícitos :knife:", seguir: false });
  const set = (p: Partial<IlicForm>) => setF({ ...f, ...p });
  const txt = ilicText(f), bad = f.ids.split(/[\s,;]+/).filter(Boolean).filter(x => !isId(x.replace(/[<@!>]/g, "")));
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel t="postulaciones de bandas" icon={<Skull />} d="respuesta del equipo de ilícitos, lista para discord." className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">{(["aceptada", "rechazada"] as const).map(r => (
          <button key={r} onClick={() => set({ res: r })} style={{ ["--c" as string]: r === "aceptada" ? "#39ff88" : "#ff2b5e" }}
            className={cn("rounded-xl border p-3 text-left text-sm font-bold tracking-[0.12em] transition", f.res === r ? "border-[var(--c)] bg-[var(--c)]/10 text-[var(--c)] shadow-[0_0_22px_-6px_var(--c)]" : "border-white/10 text-slate-500 hover:bg-white/5")}>
            {r === "aceptada" ? "✅ aceptada" : "❌ rechazada"}</button>))}</div>
        <Lbl t="a quién va" h="(discord id, uno o varios)"><NIn className={cn("text-xs", bad.length > 0 && "!border-red-500")} value={f.ids} onChange={e => set({ ids: e.target.value })} placeholder="231832931780395008, 4567…" /></Lbl>
        {bad.length > 0 && <p className="-mt-2 text-xs text-[#ff2b5e]">no parece un id de discord: {bad.join(", ")} (son 17 a 20 números).</p>}
        <Lbl t="nombre de la banda"><NIn value={f.banda} onChange={e => set({ banda: e.target.value })} placeholder="ej: los vagos" /></Lbl>
        <Lbl t="motivos" h={f.res === "aceptada" ? "(opcional, uno por línea)" : "(uno por línea)"}>
          <NTa rows={4} value={f.motivos} onChange={e => set({ motivos: e.target.value })} placeholder={f.res === "aceptada" ? "historia trabajada y coherente\nbuen rol en la entrevista" : "la historia no explica el origen de la banda\nfaltan integrantes activos"} /></Lbl>
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl t="variante"><NSel v={f.v} set={v => set({ v })} opts={ILIC_VARS} /></Lbl>
          <Lbl t="saludo"><NSel v={f.saludo} set={v => set({ saludo: v })} opts={[["auto", "según la hora"], ["dias", "buenos días"], ["tardes", "buenas tardes"], ["noches", "buenas noches"], ["hola", "¡hola!"]] as const} /></Lbl>
        </div>
        <button type="button" onClick={() => set({ seguir: !f.seguir })} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left text-xs transition", f.seguir ? "border-[var(--c)] bg-[var(--c)]/10 text-[var(--c)] shadow-[0_0_18px_-6px_var(--c)]" : "border-white/10 text-slate-400 hover:bg-white/5")}>
          <span className={cn("grid size-4 shrink-0 place-items-center rounded border", f.seguir ? "border-[var(--c)] bg-[var(--c)] text-black" : "border-white/20")}>{f.seguir && <Check className="size-3" />}</span>
          <span><b className="tracking-[0.12em]">preguntar si siguen interesados</b><br /><span className="text-slate-500">{f.res === "aceptada" ? "piden confirmar que quieren seguir con el proyecto y entrar al discord de bandas" : "les ofrece avisar si quieren seguir con el proceso y volver a postularse"}</span></span></button>
        <Lbl t="firma"><NIn value={f.firma} onChange={e => set({ firma: e.target.value })} /></Lbl>
        <div className="flex justify-end"><NBtn icon={<Check />} disabled={!f.banda.trim()} onClick={() => { setSent([...sent, { id: uid(), ts: Date.now(), banda: f.banda.trim(), res: f.res, txt }].slice(-200)); void navigator.clipboard?.writeText(txt); toast("copiado y guardado en el historial"); }}>copiar y registrar</NBtn></div>
      </Panel>
      <div className="space-y-5">
        <Preview title={`postulación ${f.res}`} text={txt} users={users} />
        {sent.length > 0 && <Panel className="p-4"><p className="mb-2 text-[10px] font-bold tracking-[0.22em] text-[var(--c)]/80">historial · {sent.length}</p>
          <div className="max-h-72 space-y-1 overflow-y-auto">{[...sent].reverse().map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
              <span className={cn("rounded px-1.5 text-[10px] font-bold", s.res === "aceptada" ? "bg-[#39ff88]/15 text-[#39ff88]" : "bg-[#ff2b5e]/15 text-[#ff2b5e]")}>{s.res}</span>
              <span className="min-w-0 flex-1 truncate">{s.banda}</span><span className="text-[11px] text-slate-600">{new Date(s.ts).toLocaleDateString("es-AR")}</span>
              <button title="copiar" onClick={() => { void navigator.clipboard?.writeText(s.txt); toast("copiado"); }} className="text-slate-500 hover:text-[var(--c)]"><Copy className="size-3.5" /></button>
            </div>))}</div></Panel>}
      </div>
    </div>
  );
}
