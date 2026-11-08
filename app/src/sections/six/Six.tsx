/* SIX: apartado privado (solo su dueño). Al entrar: la tablet se apaga y arranca una consola de acceso; después, el panel.
   Pestañas: Gestión de staff · Comunicados · Equipo de ilícitos. Los datos van en lspdt.six.* (el servidor no se los muestra a nadie más). */
import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Check, Copy, FileText, LogOut, Megaphone, Plus, Save, Skull, Trash2, Users, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { useJSON } from "@/lib/store";
import { uid } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { ILIC_VARS, ilicText, type IlicForm } from "./ilicito";

type Staff = { id: string; n: string; rol: string; dc: string; notas: string };
type Com = { id: string; t: string; body: string; ts: number };
type Sent = { id: string; ts: number; banda: string; res: IlicForm["res"]; txt: string };
const ROLES = ["Owner", "Administración", "Moderación", "Soporte", "Ilícitos", "Desarrollo", "Otro"];
const TABS = [["staff", "Gestión de staff", Users], ["com", "Comunicados", Megaphone], ["ilic", "Equipo de ilícitos", Skull]] as const;
type Tab = (typeof TABS)[number][0];
const isId = (s: string) => /^\d{17,20}$/.test(s.trim());

/* ---------- arranque: apagado + consola ---------- */
const LINES = [
  "[ OK ] Cortando enlace con LSPD-NET…", "[ OK ] Sesión MDT suspendida", "[ .. ] Montando volumen cifrado /dev/six0",
  "[ OK ] Clave AES-256-GCM aceptada", "[ .. ] Saltando proxy 10.66.0.1 → 185.■■.■■.6", "[ OK ] Túnel establecido (latencia 18 ms)",
  "[ .. ] Verificando huella del operador", "[ OK ] Operador reconocido: SIX", "[ OK ] Cargando módulos: staff · comunicados · ilícitos",
];
function SixBoot({ onDone }: { onDone: () => void }) {
  const [ph, setPh] = useState<"off" | "con">("off"), [n, setN] = useState(0), [hex, setHex] = useState<string[]>([]);
  useEffect(() => { const t = setTimeout(() => setPh("con"), 900); return () => clearTimeout(t); }, []);
  useEffect(() => { if (ph !== "con") return;
    const i = setInterval(() => setN(x => x + 1), 260), h = setInterval(() => setHex(Array.from({ length: 14 }, () => Array.from({ length: 6 }, () => Math.floor(Math.random() * 65536).toString(16).padStart(4, "0")).join(" "))), 90);
    return () => { clearInterval(i); clearInterval(h); }; }, [ph]);
  useEffect(() => { if (n >= LINES.length + 5) onDone(); }, [n, onDone]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") onDone(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onDone]);
  const pct = Math.min(100, Math.round((n / (LINES.length + 4)) * 100));
  return (
    <div className="six-boot fixed inset-0 z-[90] cursor-pointer bg-black" onClick={onDone} title="Clic para saltar">
      {ph === "off" ? <div className="six-off" /> : (
        <div className="six-con grid h-full grid-rows-[auto_1fr_auto] gap-4 p-6 font-mono text-[13px] text-[#39ff88] sm:p-10">
          <pre className="text-[10px] leading-tight text-[#39ff88]/80 sm:text-xs">{` ███████╗██╗██╗  ██╗
 ██╔════╝██║╚██╗██╔╝
 ███████╗██║ ╚███╔╝
 ╚════██║██║ ██╔██╗
 ███████║██║██╔╝ ██╗
 ╚══════╝╚═╝╚═╝  ╚═╝   root@six:~# ./acceso --privado`}</pre>
          <div className="grid min-h-0 gap-6 md:grid-cols-[1fr_18rem]">
            <div className="space-y-1 overflow-hidden">{LINES.slice(0, n).map((l, i) => <p key={i} className={cn(l.includes("[ ..") && "text-amber-300")}>{l}</p>)}
              {n > LINES.length && <p className="six-granted mt-4 text-lg font-bold tracking-[0.3em] text-white">ACCESO CONCEDIDO</p>}
              <span className="six-cur">█</span></div>
            <div className="hidden overflow-hidden text-[10px] leading-relaxed text-[#39ff88]/35 md:block">{hex.map((h, i) => <p key={i}>{h}</p>)}</div>
          </div>
          <div><div className="h-1 overflow-hidden rounded bg-[#39ff88]/15"><div className="h-full bg-[#39ff88] shadow-[0_0_10px_#39ff88] transition-all" style={{ width: pct + "%" }} /></div>
            <p className="mt-2 flex justify-between text-[11px] text-[#39ff88]/60"><span>DESCIFRANDO… {pct}%</span><span>ESC para saltar</span></p></div>
        </div>
      )}
    </div>
  );
}

/* ---------- panel ---------- */
export function Six({ onExit }: { onExit: () => void }) {
  const [booted, setBooted] = useState(false), [tab, setTab] = useState<Tab>("staff");
  const [staff, setStaff] = useJSON<Staff[]>("lspdt.six.staff", []);
  const users = useMemo(() => Object.fromEntries(staff.filter(s => isId(s.dc)).map(s => [s.dc.trim(), s.n])), [staff]);
  return (
    <div className="dark six-root min-h-[var(--app-h,100dvh)] bg-[#05080a] text-slate-200">
      {!booted && <SixBoot onDone={() => setBooted(true)} />}
      <header className="sticky top-0 z-30 border-b border-[#39ff88]/15 bg-black/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          <span className="font-mono text-lg font-bold tracking-[0.35em] text-[#39ff88] drop-shadow-[0_0_8px_rgba(57,255,136,.6)]">SIX</span>
          <span className="hidden font-mono text-[11px] text-[#39ff88]/50 sm:inline">root@six · túnel cifrado</span>
          <nav className="mx-auto flex gap-1">{TABS.map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition",
              tab === k ? "bg-[#39ff88]/15 text-[#39ff88] shadow-[inset_0_0_0_1px_rgba(57,255,136,.4)]" : "text-slate-400 hover:text-[#39ff88]")}><I className="size-3.5" /><span className="hidden sm:inline">{l}</span></button>))}</nav>
          <Button size="sm" variant="ghost" icon={<LogOut />} onClick={onExit}>Volver al MDT</Button>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {tab === "staff" && <StaffTab staff={staff} setStaff={setStaff} />}
        {tab === "com" && <ComTab staff={staff} users={users} />}
        {tab === "ilic" && <IlicTab users={users} />}
      </main>
    </div>
  );
}

const panel = "rounded-2xl border border-[#39ff88]/12 bg-[#0a1014]/90 shadow-[0_0_0_1px_rgba(0,0,0,.4)]";
const H = ({ icon, t, d }: { icon: React.ReactNode; t: string; d?: string }) => (
  <div className="mb-4 flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#39ff88]/10 text-[#39ff88] [&>svg]:size-4">{icon}</span>
    <div><h2 className="font-display text-lg font-semibold text-white">{t}</h2>{d && <p className="text-xs text-slate-400">{d}</p>}</div></div>);

/* ---------- gestión de staff ---------- */
function StaffTab({ staff, setStaff }: { staff: Staff[]; setStaff: (s: Staff[]) => void }) {
  const { toast, confirm } = useFeedback(), [q, setQ] = useState("");
  const upd = (id: string, p: Partial<Staff>) => setStaff(staff.map(s => (s.id === id ? { ...s, ...p } : s)));
  const L = staff.filter(s => !q || `${s.n} ${s.rol} ${s.dc} ${s.notas}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section className={cn(panel, "p-5")}>
      <H icon={<Users />} t="Gestión de staff" d="Equipo del servidor con su rol y Discord ID (se usa para arrobar en los comunicados)." />
      <div className="mb-3 flex flex-wrap gap-2"><Input className="h-9 max-w-xs text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" />
        <Button size="sm" icon={<Plus />} onClick={() => setStaff([...staff, { id: uid(), n: "", rol: "Moderación", dc: "", notas: "" }])}>Agregar</Button>
        <span className="ml-auto self-center text-xs text-slate-500">{staff.length} en el equipo</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[48rem] text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="py-2">Nombre</th><th>Rol</th><th>Discord ID</th><th>Notas</th><th /></tr></thead>
        <tbody>{[...L].sort((a, b) => ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol) || a.n.localeCompare(b.n, "es")).map(s => (
          <tr key={s.id} className="border-t border-white/5">
            <td className="py-1.5 pr-2"><Input className="h-8 text-sm font-semibold" value={s.n} onChange={e => upd(s.id, { n: e.target.value })} placeholder="Nombre" /></td>
            <td className="pr-2"><Select className="h-8 w-40 text-sm" value={s.rol} onChange={e => upd(s.id, { rol: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</Select></td>
            <td className="pr-2"><div className="flex gap-1"><Input className={cn("h-8 w-48 font-mono text-xs", s.dc && !isId(s.dc) && "border-red-500")} value={s.dc} onChange={e => upd(s.id, { dc: e.target.value.replace(/\D/g, "") })} placeholder="ID de Discord" />
              <button title="Copiar mención" disabled={!isId(s.dc)} onClick={() => { void navigator.clipboard?.writeText(`<@${s.dc}>`); toast("Mención copiada"); }} className="rounded-lg p-1.5 text-slate-400 hover:text-[#39ff88] disabled:opacity-30"><AtSign className="size-4" /></button></div></td>
            <td className="pr-2"><Input className="h-8 text-xs" value={s.notas} onChange={e => upd(s.id, { notas: e.target.value })} placeholder="—" /></td>
            <td><button aria-label="Quitar" onClick={async () => { if (await confirm(`¿Quitar a ${s.n || "esta fila"}?`, { danger: true })) setStaff(staff.filter(x => x.id !== s.id)); }} className="rounded-lg p-1.5 text-slate-500 hover:text-red-400"><Trash2 className="size-4" /></button></td>
          </tr>))}</tbody></table>
        {!staff.length && <p className="py-8 text-center text-sm text-slate-500">Todavía no cargaste a nadie.</p>}</div>
    </section>
  );
}

/* ---------- comunicados libres ---------- */
function ComTab({ staff, users }: { staff: Staff[]; users: Record<string, string> }) {
  const { toast, confirm } = useFeedback(), [list, setList] = useJSON<Com[]>("lspdt.six.com", []);
  const [cur, setCur] = useState<Com>({ id: "", t: "", body: "", ts: 0 }), ta = useRef<HTMLTextAreaElement>(null);
  const ins = (s: string) => { const el = ta.current, a = el?.selectionStart ?? cur.body.length, b = el?.selectionEnd ?? a; setCur({ ...cur, body: cur.body.slice(0, a) + s + cur.body.slice(b) }); };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_minmax(0,1fr)]">
      <section className={cn(panel, "p-3")}>
        <Button size="sm" className="mb-2 w-full" icon={<Plus />} onClick={() => setCur({ id: "", t: "", body: "", ts: 0 })}>Nuevo</Button>
        {[...list].sort((a, b) => b.ts - a.ts).map(c => (
          <div key={c.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm", cur.id === c.id ? "bg-[#39ff88]/10 text-[#39ff88]" : "hover:bg-white/5")}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => setCur(c)}><FileText className="mr-1.5 inline size-3.5" />{c.t || "Sin título"}</button>
            <button aria-label="Borrar" onClick={async () => { if (await confirm(`¿Borrar «${c.t}»?`, { danger: true })) setList(list.filter(x => x.id !== c.id)); }} className="opacity-0 group-hover:opacity-100"><X className="size-3.5 text-slate-500 hover:text-red-400" /></button>
          </div>))}
        {!list.length && <p className="px-2 py-4 text-xs text-slate-500">Sin comunicados guardados.</p>}
      </section>
      <section className={cn(panel, "space-y-3 p-5")}>
        <H icon={<Megaphone />} t="Comunicado" />
        <Field label="Título"><Input value={cur.t} onChange={e => setCur({ ...cur, t: e.target.value })} placeholder="Para encontrarlo después" /></Field>
        <div className="flex flex-wrap gap-1.5">{staff.filter(s => isId(s.dc)).map(s => <button key={s.id} onClick={() => ins(`<@${s.dc}>`)} className="rounded-full border border-[#39ff88]/25 px-2 py-0.5 text-xs text-[#39ff88]/80 hover:bg-[#39ff88]/10">@{s.n}</button>)}
          <button onClick={() => ins("@everyone")} className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-slate-400 hover:bg-white/5">@everyone</button></div>
        <Textarea ref={ta} rows={14} className="font-mono text-xs" value={cur.body} onChange={e => setCur({ ...cur, body: e.target.value })} placeholder="Escribí en formato Discord: **negrita**, # títulos, <@ID> para arrobar…" />
        <div className="flex justify-end"><Button icon={<Save />} onClick={() => { const c = { ...cur, id: cur.id || uid(), ts: Date.now(), t: cur.t.trim() || cur.body.split("\n")[0].replace(/[#*_<>@!:\d]/g, "").trim().slice(0, 60) || "Comunicado" };
          setList([...list.filter(x => x.id !== c.id), c]); setCur(c); toast("Guardado"); }}>Guardar</Button></div>
      </section>
      <DiscordOutput title="Vista previa" text={cur.body} ctx={{ users }} sticky={false} web={false} />
    </div>
  );
}

/* ---------- equipo de ilícitos: respuesta a postulaciones ---------- */
function IlicTab({ users }: { users: Record<string, string> }) {
  const { toast } = useFeedback(), [sent, setSent] = useJSON<Sent[]>("lspdt.six.ilic", []);
  const [f, setF] = useState<IlicForm>({ ids: "", banda: "", res: "aceptada", motivos: "", v: "std", saludo: "auto", firma: "Atte.: Equipo de Ilícitos :knife:" });
  const set = (p: Partial<IlicForm>) => setF({ ...f, ...p });
  const txt = ilicText(f), bad = f.ids.split(/[\s,;]+/).filter(Boolean).filter(x => !isId(x.replace(/[<@>]/g, "")));
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={cn(panel, "space-y-4 p-5")}>
        <H icon={<Skull />} t="Postulaciones de bandas" d="Respuesta del equipo de ilícitos, lista para Discord. Corrige saludo y ortografía sola." />
        <div className="grid gap-2 sm:grid-cols-2">{(["aceptada", "rechazada"] as const).map(r => (
          <button key={r} onClick={() => set({ res: r })} className={cn("rounded-xl border p-3 text-left text-sm font-semibold transition", f.res === r ? (r === "aceptada" ? "border-emerald-400 bg-emerald-500/10 text-emerald-300" : "border-red-400 bg-red-500/10 text-red-300") : "border-white/10 text-slate-400 hover:bg-white/5")}>
            {r === "aceptada" ? "✅ Aceptada" : "❌ Rechazada"}</button>))}</div>
        <Field label="A quién va (Discord ID)" hint="(uno o varios, separados por coma o espacio)"><Input className={cn("font-mono text-xs", bad.length && "border-red-500")} value={f.ids} onChange={e => set({ ids: e.target.value })} placeholder="231832931780395008, 4567…" /></Field>
        {bad.length > 0 && <p className="-mt-2 text-xs text-red-400">No parece un ID de Discord: {bad.join(", ")} (son 17 a 20 números).</p>}
        <Field label="Nombre de la banda"><Input value={f.banda} onChange={e => set({ banda: e.target.value })} placeholder="Ej: Los Vagos" /></Field>
        <Field label={f.res === "aceptada" ? "Motivos (opcional)" : "Motivos"} hint="(uno por línea)"><Textarea rows={4} value={f.motivos} onChange={e => set({ motivos: e.target.value })} placeholder={f.res === "aceptada" ? "Historia trabajada y coherente\nBuen rol en la entrevista" : "La historia no explica el origen de la banda\nFaltan integrantes activos"} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Variante"><Select value={f.v} onChange={e => set({ v: e.target.value as IlicForm["v"] })}>{ILIC_VARS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Saludo"><Select value={f.saludo} onChange={e => set({ saludo: e.target.value as IlicForm["saludo"] })}><option value="auto">Según la hora</option><option value="dias">Buenos días</option><option value="tardes">Buenas tardes</option><option value="noches">Buenas noches</option><option value="hola">¡Hola!</option></Select></Field>
        </div>
        <Field label="Firma"><Input value={f.firma} onChange={e => set({ firma: e.target.value })} /></Field>
        <div className="flex justify-end"><Button icon={<Check />} disabled={!f.banda.trim()} onClick={() => { setSent([...sent, { id: uid(), ts: Date.now(), banda: f.banda.trim(), res: f.res, txt }].slice(-200)); void navigator.clipboard?.writeText(txt); toast("Copiado y guardado en el historial"); }}>Copiar y registrar</Button></div>
      </section>
      <div className="space-y-5">
        <DiscordOutput title={`Postulación ${f.res}`} text={txt} ctx={{ users }} sticky={false} web={false} />
        {sent.length > 0 && <section className={cn(panel, "p-4")}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historial ({sent.length})</p>
          <div className="max-h-72 space-y-1 overflow-y-auto">{[...sent].reverse().map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
              <span className={cn("rounded px-1.5 text-[10px] font-bold", s.res === "aceptada" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300")}>{s.res.toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate">{s.banda}</span><span className="text-[11px] text-slate-500">{new Date(s.ts).toLocaleDateString("es-AR")}</span>
              <button title="Copiar" onClick={() => { void navigator.clipboard?.writeText(s.txt); toast("Copiado"); }} className="text-slate-500 hover:text-[#39ff88]"><Copy className="size-3.5" /></button>
            </div>))}</div></section>}
      </div>
    </div>
  );
}
