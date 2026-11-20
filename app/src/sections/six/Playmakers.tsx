/* Panel de Anita › PLAYMAKERS 🎭: los mensajes de los tickets del equipo de Playmakers de Eleven, listos para copiar y pegar en Discord.
   Se editan, se agregan y se borran (K("pm")). «@usuario» se cambia solo por la mención de quien abrió el ticket si ponés su ID de Discord. */
import { useState } from "react";
import { Check, Copy, Drama, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { discordHtml } from "@/lib/discord";
import { uid } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";
import { K } from "./fx";

type Msg = { id: string; t: string; ico: string; body: string };
const PM0: Msg[] = [
  { id: "abrir", t: "Apertura de ticket", ico: "🎫", body: `Buenas @usuario.

Muchas gracias por ponerte en contacto con el equipo de **Playmakers** de Eleven 🎭. A continuación, por favor, detalla la idea del rol y lo que necesites en el ticket. Para hacer más fácil el proceso, indícanos lo siguiente a ser posible:

**Idea del rol:**
**PM necesarios y qué roles tendrían que desarrollar:**
**Día y hora de efectuación:**
**A quién va dirigido el rol:**` },
  { id: "fin", t: "Rol finalizado", ico: "✅", body: `## Rol finalizado

Nos ayudaría muchísimo si nos dejases tu feedback sobre el rol (bueno, malo, sin más) y unas observaciones de cosas que te han gustado, cosas a mejorar, etc.

**Gracias por confiar en el equipo de Playmakers de Eleven 💛**` },
  { id: "acepta", t: "Aceptado en Playmakers", ico: "🎭", body: `## ¡Bienvenido/a a Playmakers! 🎭

Buenas @usuario. Nos alegra comunicarte que has sido **aceptado/a en el equipo de Playmakers de Eleven**.

A partir de ahora formas parte del equipo: revisa los canales del equipo, lee la información y ante cualquier duda escríbenos.

**¡Gracias por sumarte y bienvenido/a al equipo de Playmakers de Eleven 💛!**` },
];
const fld = "w-full rounded-xl border border-six/15 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-six";

export function PlaymakersTab() {
  const { toast, confirm } = useFeedback(), [list, setList] = useJSON<Msg[]>(K("pm"), PM0);
  const [who, setWho] = useState(""), [ed, setEd] = useState<Msg | null>(null), [done, setDone] = useState("");
  const fill = (s: string) => { const w = who.trim(); return !w ? s : s.replace(/@usuario/g, /^\d{17,20}$/.test(w) ? `<@${w}>` : w.startsWith("@") ? w : `@${w}`); };
  const copy = async (m: Msg) => { try { await navigator.clipboard.writeText(fill(m.body)); setDone(m.id); toast(`«${m.t}» copiado`); window.setTimeout(() => setDone(""), 1400); } catch { toast("No se pudo copiar", "err"); } };
  const save = () => { if (!ed) return; const x = { ...ed, t: ed.t.trim() || "Mensaje", ico: ed.ico.trim() || "💬" };
    setList(list.some(y => y.id === x.id) ? list.map(y => (y.id === x.id ? x : y)) : [...list, x]); setEd(null); toast("Guardado"); };
  const del = async (m: Msg) => { if (await confirm(`¿Borrar «${m.t}»?`, { danger: true, ok: "Borrar" })) setList(list.filter(y => y.id !== m.id)); };
  const reset = async () => { if (await confirm("¿Volver a los mensajes originales? Se pierden los cambios.", { ok: "Restaurar", danger: true })) setList(PM0); };
  return (
    <div className="space-y-4 font-sans">
      <div className="six-panel relative flex flex-wrap items-center gap-4 rounded-2xl p-5">
        <span className="grid size-14 place-items-center rounded-2xl border border-six/40 bg-six/10 text-3xl six-ico" aria-hidden>🎭</span>
        <div className="min-w-0 flex-1"><h2 className="six-h text-xl font-bold">Playmakers</h2><p className="text-sm text-slate-400">Mensajes de los tickets, listos para copiar y pegar en Discord.</p></div>
        <label className="w-full space-y-1 sm:w-80"><span className="text-xs font-semibold text-slate-400">Usuario del ticket <span className="font-normal text-slate-500">(ID de Discord o nombre, opcional)</span></span>
          <input value={who} onChange={e => setWho(e.target.value)} placeholder="Reemplaza @usuario al copiar" className={fld} /></label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {list.map(m => (
          <section key={m.id} className="six-panel relative flex flex-col rounded-2xl p-4">
            <header className="mb-3 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-six/30 bg-six/10 text-xl" aria-hidden>{m.ico}</span>
              <h3 className="six-h min-w-0 flex-1 truncate text-base font-bold">{m.t}</h3>
              <button aria-label="Editar" title="Editar" onClick={() => setEd(m)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-six"><Pencil className="size-4" /></button>
              <button aria-label="Borrar" title="Borrar" onClick={() => void del(m)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-red-400"><Trash2 className="size-4" /></button></header>
            <div className="mb-3 max-h-80 flex-1 overflow-y-auto rounded-xl border border-six/10 bg-[#313338] p-4 text-[15px] leading-relaxed text-[#dbdee1]"
              dangerouslySetInnerHTML={{ __html: discordHtml(fill(m.body), {}, "Playmakers", "/next/logo.svg") }} />
            <button onClick={() => void copy(m)} className={cn("six-btn inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold tracking-[0.14em] transition",
              done === m.id ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300" : "border-six/60 bg-six/10 text-six hover:bg-six/20")}>{done === m.id ? <Check className="size-4" /> : <Copy className="size-4" />}{done === m.id ? "COPIADO" : "COPIAR MENSAJE"}</button>
          </section>))}
        <button onClick={() => setEd({ id: uid(), t: "", ico: "💬", body: "" })} className="grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-six/20 text-sm font-semibold text-slate-500 transition hover:border-six/50 hover:text-six">
          <span className="flex flex-col items-center gap-2"><Plus className="size-6" />Nuevo mensaje</span></button>
      </div>
      <p className="flex items-center justify-center gap-2 text-xs text-slate-600"><Drama className="size-3.5" />Escribí <code className="text-six/80">@usuario</code> donde va la mención.
        <button onClick={() => void reset()} className="inline-flex items-center gap-1 text-slate-500 hover:text-six"><RotateCcw className="size-3" />Restaurar los originales</button></p>

      {ed && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setEd(null)}>
        <section className="six-panel relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-5">
          <header className="mb-4 flex items-center gap-3"><h2 className="six-h flex-1 text-base font-bold">{list.some(y => y.id === ed.id) ? "Editar mensaje" : "Nuevo mensaje"}</h2>
            <button aria-label="Cerrar" onClick={() => setEd(null)} className="rounded-lg p-1.5 text-slate-500 hover:text-six"><X className="size-4" /></button></header>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex gap-2"><input value={ed.ico} onChange={e => setEd({ ...ed, ico: e.target.value })} aria-label="Emoji" maxLength={4} className={cn(fld, "w-16 text-center text-lg")} />
                <input value={ed.t} onChange={e => setEd({ ...ed, t: e.target.value })} placeholder="Título (ej.: Apertura de ticket)" autoFocus className={fld} /></div>
              <textarea value={ed.body} onChange={e => setEd({ ...ed, body: e.target.value })} rows={14} placeholder="Texto en formato Discord: **negrita**, ## título, @usuario…" className={cn(fld, "resize-y font-mono text-[13px] leading-relaxed")} />
              <div className="flex justify-end gap-2"><button onClick={() => setEd(null)} className="rounded-lg px-3.5 py-2 text-xs font-bold tracking-[0.12em] text-slate-400 hover:text-six">CANCELAR</button>
                <button onClick={save} disabled={!ed.body.trim()} className="six-btn inline-flex items-center gap-1.5 rounded-lg border border-six/60 bg-six/10 px-3.5 py-2 text-xs font-bold tracking-[0.12em] text-six transition hover:bg-six/20 disabled:opacity-35"><Save className="size-3.5" />GUARDAR</button></div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-six/10 bg-[#313338] p-4 text-[15px] leading-relaxed text-[#dbdee1]"
              dangerouslySetInnerHTML={{ __html: ed.body.trim() ? discordHtml(fill(ed.body), {}, "Playmakers", "/next/logo.svg") : '<p style="opacity:.5">Vista previa de Discord</p>' }} />
          </div>
        </section></div>}
    </div>);
}
