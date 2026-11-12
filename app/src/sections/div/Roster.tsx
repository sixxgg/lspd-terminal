/* Roster de cualquier división o subdivisión: integrantes agrupados por rol en tarjetas con el color del rol,
   y alta / edición en el mismo modal chico que la uniformidad (rol, especialidades, indicativo…). */
import { useState, type ReactNode } from "react";
import { Check, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button, Empty, Field, Input } from "@/components/ui";
import { Modal } from "@/components/modal";
import { AgentCombo, Avatar } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { findAgent, rankES } from "@/lib/domain";
import { cn } from "@/lib/cn";

type RRole = { k: string; l: string; c: string };
/* texto oscuro sobre colores claros */
const ink = (c: string) => { const h = c.replace("#", ""); if (h.length < 6) return "#fff"; const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.3 * r + 0.59 * g + 0.11 * b > 170 ? "#0b1220" : "#fff"; };
type Ed = { n: string; nuevo: boolean; main: string; subs: string[]; call: string; disc: string };
type Opt = { get: (n: string) => string; set: (n: string, v: string) => void; l: string; ph: string };

export function RosterBoard({ ab, roles, subs = [], map, canEdit, onSave, call, disc, tags, editExtra, info }: {
  ab: string; roles: RRole[]; subs?: RRole[]; map: Record<string, string[]>; canEdit: boolean; onSave: (m: Record<string, string[]>) => void;
  call?: Opt; disc?: Opt; tags?: (n: string) => ReactNode; editExtra?: (n: string) => ReactNode; info?: (n: string) => string;
}) {
  const { toast, confirm } = useFeedback(), [ed, setEd] = useState<Ed | null>(null);
  const last = roles[roles.length - 1]?.k || "";
  const mainOf = (r: string[] = []) => roles.find(x => r.includes(x.k))?.k || last;
  const mem = Object.entries(map), roleOf = (k: string) => roles.find(x => x.k === k) || subs.find(x => x.k === k) || { k, l: k, c: "#94a3b8" };
  const open = (n: string) => { const r = map[n] || []; setEd({ n, nuevo: false, main: mainOf(r), subs: r.filter(x => subs.some(s => s.k === x)), call: call?.get(n) || "", disc: disc?.get(n) || "" }); };
  const save = () => {
    if (!ed) return; if (!ed.n) { toast("Elegí un agente", "err"); return; }
    if (ed.nuevo && map[ed.n]) { toast(`${ed.n} ya está en el roster`, "err"); return; }
    onSave({ ...map, [ed.n]: [ed.main, ...ed.subs] });
    if (call && ed.call.trim().toUpperCase() !== call.get(ed.n)) call.set(ed.n, ed.call.trim().toUpperCase());
    if (disc && ed.disc.replace(/\D/g, "") !== disc.get(ed.n)) disc.set(ed.n, ed.disc.replace(/\D/g, ""));
    toast(ed.nuevo ? `${ed.n} agregado como ${roleOf(ed.main).l}` : "Integrante actualizado"); setEd(null);
  };
  const remove = async () => { if (!ed || !(await confirm(`¿Quitar a ${ed.n} de la ${ab}?`, { danger: true }))) return; const m = { ...map }; delete m[ed.n]; onSave(m); toast(`${ed.n} ya no está en la ${ab}`); setEd(null); };
  const pill = (on: boolean) => cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", on ? "text-white" : "text-slate-600 hover:brightness-110 dark:text-slate-300", on && "shadow-[0_0_12px_-2px_var(--c)]");
  const pillS = (on: boolean, c: string) => ({ ["--c" as string]: c, ...(on ? { background: c, borderColor: c, color: ink(c) } : { borderColor: c + "66" }) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm text-slate-500"><b className="text-slate-900 dark:text-white">{mem.length}</b> integrante{mem.length === 1 ? "" : "s"}</p>
        {roles.map(r => { const n = mem.filter(([, x]) => mainOf(x) === r.k).length; return n ? <span key={r.k} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs dark:border-slate-700"><span className="size-2 rounded-full" style={{ background: r.c }} />{r.l} · {n}</span> : null; })}
        <span className="mr-auto" />
        {canEdit && <Button size="sm" icon={<Plus />} onClick={() => setEd({ n: "", nuevo: true, main: last, subs: [], call: "", disc: "" })}>Agregar integrante</Button>}
      </div>
      {!mem.length ? <Empty icon={<Users />} title="Todavía no hay integrantes" desc={canEdit ? "Tocá «Agregar integrante» para sumar al primero." : "La coordinación todavía no cargó el roster."} />
        : roles.map(r => {
          const L = mem.filter(([, x]) => mainOf(x) === r.k).sort((a, b) => a[0].localeCompare(b[0], "es"));
          if (!L.length) return null;
          return (
            <section key={r.k} className="space-y-2">
              <h4 className="fx-rank-h flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ ["--c" as string]: r.c }}><span className="size-2 rounded-full" />{r.l}<span className="font-semibold text-slate-400">· {L.length}</span><span className="h-px flex-1" /></h4>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{L.map(([n, x]) => { const a = findAgent(n), c = call?.get(n), ex = x.filter(s => subs.some(z => z.k === s)); return (
                <div key={n} className="fx-card group relative flex flex-col gap-2.5 rounded-2xl p-3.5" style={{ ["--c" as string]: r.c }}>
                  <div className="flex items-start gap-3">
                    <span className="rounded-full p-[2px]" style={{ background: `linear-gradient(135deg, ${r.c}, transparent)` }}><Avatar n={n} size={42} /></span>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[15px] leading-tight">{n}</b>
                      <span className="block truncate text-xs text-slate-500">{a ? `${rankES(a.r)}${a.p ? ` · #${a.p}` : ""}` : info?.(n) || "No figura en el roster cargado"}</span>
                    </div>
                    {canEdit && <button aria-label={`Editar a ${n}`} onClick={() => open(n)} className="rounded-lg p-1.5 text-slate-400 opacity-60 transition hover:bg-white/10 hover:text-brand-500 group-hover:opacity-100"><Pencil className="size-3.5" /></button>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: r.c, color: ink(r.c) }}>{r.l}</span>
                    {c && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-600 dark:text-red-400">{c}</span>}
                    {ex.map(s => { const z = roleOf(s); return <span key={s} className="rounded-md border px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300" style={{ borderColor: z.c + "77" }}>{z.l}</span>; })}
                    {tags?.(n)}
                  </div>
                </div>); })}</div>
            </section>);
        })}
      <Modal open={!!ed} onClose={() => setEd(null)} size="sm" icon={<Users />} title={ed?.nuevo ? "Nuevo integrante" : "Editar integrante"} desc={`Roster de la ${ab}`}
        footer={<>{ed && !ed.nuevo && <Button size="sm" variant="ghost" className="mr-auto text-red-500" icon={<Trash2 />} onClick={remove}>Quitar</Button>}
          <Button size="sm" variant="ghost" onClick={() => setEd(null)}>Cancelar</Button><Button size="sm" icon={<Check />} onClick={save}>Guardar</Button></>}>
        {ed && <div className="space-y-3">
          <Field label="Agente">{ed.nuevo ? <AgentCombo value={ed.n} onChange={n => setEd({ ...ed, n, call: call?.get(n) || "" })} filter={a => !map[a.n]} placeholder={`Buscar agente para la ${ab}…`} />
            : <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2 dark:border-slate-800"><Avatar n={ed.n} size={34} /><div><b className="block text-sm">{ed.n}</b><span className="text-xs text-slate-500">{(() => { const a = findAgent(ed.n); return a ? `${rankES(a.r)}${a.p ? ` · #${a.p}` : ""}` : ""; })()}</span></div></div>}</Field>
          <Field label="Rol"><div className="flex flex-wrap gap-1.5">{roles.map(r => <button key={r.k} type="button" onClick={() => setEd({ ...ed, main: r.k })} className={pill(ed.main === r.k)} style={pillS(ed.main === r.k, r.c)}>{r.l}</button>)}</div></Field>
          {subs.length > 0 && <Field label="Subdivisiones y especialidades"><div className="flex flex-wrap gap-1.5">{subs.map(r => { const on = ed.subs.includes(r.k); return (
            <button key={r.k} type="button" onClick={() => setEd({ ...ed, subs: on ? ed.subs.filter(x => x !== r.k) : [...ed.subs, r.k] })} className={pill(on)} style={pillS(on, r.c)}>{r.l}</button>); })}</div></Field>}
          {(call || disc) && <div className="grid gap-3 sm:grid-cols-2">
            {call && <Field label={call.l}><Input value={ed.call} onChange={e => setEd({ ...ed, call: e.target.value })} placeholder={call.ph} className="font-mono uppercase" /></Field>}
            {disc && <Field label={disc.l}><Input value={ed.disc} onChange={e => setEd({ ...ed, disc: e.target.value })} placeholder={disc.ph} inputMode="numeric" className="font-mono" /></Field>}
          </div>}
          {!ed.nuevo && editExtra?.(ed.n)}
        </div>}
      </Modal>
    </div>);
}
