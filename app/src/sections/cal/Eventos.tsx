/* Calendario › eventos del departamento: alta y edición (Jefatura y habilitados), detalle de cada fecha y quién puede cargarlos.
   Datos en lspdt.xcal (lib/events.ts): el servidor filtra por departamento y valida quién crea, cambia o borra. */
import { useState } from "react";
import { Ban, CalendarClock, CalendarDays, CheckCircle2, Clock, Copy, MapPin, Pencil, Repeat, Save, ShieldCheck, Trash2, UserRound, Users, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { AgentCombo, Avatar, RankBadge } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { useCopy } from "@/components/output";
import { LS, useJSON } from "@/lib/store";
import { DEPT, DEPTS, type DeptId } from "@/lib/dept";
import { ALL_DIVS, GROUPS, findAgent, rankES, uid } from "@/lib/domain";
import { useMe } from "@/lib/me";
import { ACC_KEY, EV_ST, EV_TIPOS, XCAL, evEdit, tipoOf, type Ev, type EvSt } from "@/lib/events";
import type { CalItem } from "@/lib/calendar";
import { cn } from "@/lib/cn";

const DPS: DeptId[] = ["lspd", "lssd", "sahp"];
const blank = (f: string, me: string): Ev => ({ id: "", dp: DEPT.id, deps: [DEPT.id], by: me, t: 0, n: "", desc: "", f, hi: "20:00", hf: "21:00", lugar: "", tipo: "ent", div: "", resp: me,
  conv: [], img: "", obs: "", st: "prog", rep: "", hasta: "" });
const saveEv = (e: Ev) => { const L = LS.json<Ev[]>(XCAL, []), i = L.findIndex(x => x.id === e.id); LS.setJSON(XCAL, i >= 0 ? L.map(x => (x.id === e.id ? e : x)) : [...L, e]); };
const isImg = (u: string) => /^https:\/\/\S+$/i.test(u.trim());

/* alta / edición */
export function EvForm({ init, date, onClose }: { init?: Ev | null; date?: string; onClose: () => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [E, setE] = useState<Ev>(() => (init ? structuredClone(init) : blank(date || new Date().toISOString().slice(0, 10), me.n)));
  const set = (p: Partial<Ev>) => setE(o => ({ ...o, ...p }));
  const ranks = Object.values(GROUPS).flatMap(g => g.r);
  const [who, setWho] = useState("");
  const need = [!E.n.trim() && "nombre", !E.f && "fecha", !E.hi && "hora de inicio", !E.lugar.trim() && "lugar", !E.resp.trim() && "responsable"].filter(Boolean) as string[];
  const save = () => {
    if (need.length) { toast("Falta: " + need.join(", "), "err"); return; }
    if (E.hf && E.hf <= E.hi) { toast("La hora de finalización tiene que ser después del inicio", "err"); return; }
    if (E.img && !isImg(E.img)) { toast("La imagen tiene que ser un link https (por ejemplo, de Fivemanager)", "err"); return; }
    const now = Date.now(), deps = [...new Set([E.dp, ...E.deps])] as DeptId[];
    const e: Ev = { ...E, n: E.n.trim(), lugar: E.lugar.trim(), deps, id: E.id || uid(), t: E.t || now, by: E.by || me.n, ...(E.id ? { upd: now, upBy: me.n } : {}) };
    saveEv(e); toast(E.id ? "Evento actualizado" : "Evento publicado en el calendario"); onClose();
  };
  return (
    <Modal open onClose={onClose} size="xl" icon={<CalendarClock />} title={E.id ? "Editar evento" : "Nuevo evento"} desc={`${DEPTS[E.dp].name} · aparece solo en el día que elijas`}
      footer={<><Button variant="ghost" className="mr-auto" onClick={onClose}>Cancelar</Button><Button icon={<Save />} onClick={save}>{E.id ? "Guardar cambios" : "Publicar evento"}</Button></>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="Nombre del evento"><Input value={E.n} onChange={e => set({ n: e.target.value })} placeholder="Ej: Entrenamiento de tiro en la academia" maxLength={90} /></Field>
          <Field label="Tipo de evento"><div className="flex flex-wrap gap-1.5">{EV_TIPOS.map(([k, l, c]) => (
            <button key={k} type="button" onClick={() => set({ tipo: k })} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition", E.tipo !== k && "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}
              style={E.tipo === k ? { borderColor: c, background: c + "22", color: c } : undefined}><i className="size-2 rounded-full" style={{ background: c }} />{l}</button>))}</div></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha"><Input type="date" value={E.f} onChange={e => set({ f: e.target.value })} /></Field>
            <Field label="Inicio"><Input type="time" value={E.hi} onChange={e => set({ hi: e.target.value })} /></Field>
            <Field label="Fin"><Input type="time" value={E.hf} onChange={e => set({ hf: e.target.value })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Se repite"><Select value={E.rep} onChange={e => set({ rep: e.target.value as Ev["rep"] })}><option value="">No se repite</option><option value="sem">Todas las semanas</option><option value="men">Todos los meses</option></Select></Field>
            {E.rep ? <Field label="Hasta" hint="(si lo dejás vacío, un año)"><Input type="date" value={E.hasta} min={E.f} onChange={e => set({ hasta: e.target.value })} /></Field>
              : <Field label="Estado"><Select value={E.st} onChange={e => set({ st: e.target.value as EvSt })}>{(Object.keys(EV_ST) as EvSt[]).map(k => <option key={k} value={k}>{EV_ST[k][0]}</option>)}</Select></Field>}
          </div>
          {E.rep && <Field label="Estado"><Select value={E.st} onChange={e => set({ st: e.target.value as EvSt })}>{(Object.keys(EV_ST) as EvSt[]).map(k => <option key={k} value={k}>{EV_ST[k][0]}{k === "canc" ? " (todas las fechas)" : ""}</option>)}</Select></Field>}
          <Field label="Lugar de celebración"><Input value={E.lugar} onChange={e => set({ lugar: e.target.value })} placeholder="Ej: Comisaría de Sandy Shores, galería de tiro" /></Field>
          <Field label="Descripción"><Textarea rows={4} value={E.desc} onChange={e => set({ desc: e.target.value })} placeholder="De qué se trata, qué hay que llevar, uniformidad…" /></Field>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Responsable del evento"><AgentCombo free value={E.resp} onChange={v => set({ resp: v })} placeholder="Buscar agente" /></Field>
            <Field label="División organizadora" hint="(si corresponde)"><Select value={E.div} onChange={e => set({ div: e.target.value })}><option value="">Ninguna · todo el departamento</option>{ALL_DIVS.map(d => <option key={d}>{d}</option>)}</Select></Field>
          </div>
          <Field label="Convocados" hint="(sin nada marcado, todo el departamento)">
            <div className="flex flex-wrap gap-1">{ranks.map(r => { const on = E.conv.includes(r); return (
              <button key={r} type="button" onClick={() => set({ conv: on ? E.conv.filter(x => x !== r) : [...E.conv, r] })} className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold transition", on ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 text-slate-500 hover:border-brand-300 dark:border-slate-700")}>{rankES(r)}</button>); })}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">{E.conv.filter(x => !ranks.includes(x)).map(n => <span key={n} className="inline-flex items-center gap-1 rounded-full border border-slate-200 py-0.5 pl-0.5 pr-1 text-[12px] font-semibold dark:border-slate-700"><Avatar n={n} size={18} />{n}
              <button type="button" aria-label={`Quitar a ${n}`} onClick={() => set({ conv: E.conv.filter(x => x !== n) })} className="rounded-full p-0.5 text-slate-400 hover:text-red-500"><X className="size-3" /></button></span>)}</div>
            <AgentCombo sm className="mt-2" clearable={false} value={who} chosen={E.conv} onChange={n => { if (n && !E.conv.includes(n)) set({ conv: [...E.conv, n] }); setWho(""); }} placeholder="Sumar a alguien por nombre" />
          </Field>
          <Field label="Departamentos participantes" hint={`(el ${DEPTS[E.dp].short} siempre)`}>
            <div className="flex flex-wrap gap-1.5">{DPS.map(d => { const on = d === E.dp || E.deps.includes(d); return (
              <button key={d} type="button" disabled={d === E.dp} onClick={() => set({ deps: on ? E.deps.filter(x => x !== d) : [...E.deps, d] })} className={cn("rounded-lg border px-3 py-1.5 text-[12px] font-bold transition", on ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{DEPTS[d].short}{d === E.dp ? " · organiza" : on ? " · invitado" : ""}</button>); })}</div>
            <p className="mt-1 text-[11px] text-slate-500">{E.deps.some(d => d !== E.dp) ? "Compartido: lo ven también los departamentos invitados (no lo pueden editar)." : `Exclusivo del ${DEPTS[E.dp].short}.`}</p>
          </Field>
          <Field label="Imagen o cartel" hint="(opcional · link de Fivemanager u otro https)"><Input value={E.img} onChange={e => set({ img: e.target.value })} placeholder="https://r2.fivemanager.com/…/cartel.png" />
            {isImg(E.img) && <img src={E.img} alt="" className="mt-2 max-h-40 w-full rounded-xl object-cover" />}</Field>
          <Field label="Observaciones" hint="(opcional)"><Textarea rows={2} value={E.obs} onChange={e => set({ obs: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>);
}

/* detalle de una fecha del evento */
export function EvDetail({ it, onClose, onEdit }: { it: CalItem; onClose: () => void; onEdit: (e: Ev) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy(), e = it.ev!, [, tl, tc] = tipoOf(e.tipo), can = evEdit(e), st = (it.st || e.st) as EvSt;
  const r = findAgent(e.resp), u = Math.floor(it.at / 1000), uf = e.hf ? Math.floor(new Date(`${it.of}T${e.hf}`).getTime() / 1000) : 0;
  const upd = (p: Partial<Ev>, msg: string) => { saveEv({ ...e, ...p, upd: Date.now(), upBy: me.n }); toast(msg); onClose(); };
  const dc = [`# 📅 ${e.n}`, "", `**Tipo:** ${tl}${e.div ? ` · **División:** ${e.div}` : ""}`, `**Cuándo:** <t:${u}:F>${uf ? ` a <t:${uf}:t>` : ""} (<t:${u}:R>)`, `**Lugar:** ${e.lugar}`, `**Responsable:** ${r ? `${rankES(r.r)} ${r.n}` : e.resp}`,
    ...(e.conv.length ? [`**Convocados:** ${e.conv.map(x => rankES(x) || x).join(", ")}`] : []), "", e.desc, ...(e.obs ? ["", `-# ${e.obs}`] : [])].join("\n").replace(/\n{3,}/g, "\n\n");
  return (
    <Modal open onClose={onClose} size="lg" icon={<CalendarDays />} title={<span className={cn(st === "canc" && "line-through decoration-red-500/70")}>{e.n}</span>}
      desc={<span className="flex flex-wrap items-center gap-1.5"><span className="rounded px-1.5 py-px text-[11px] font-bold text-white" style={{ background: tc }}>{tl}</span>
        <span className="rounded px-1.5 py-px text-[11px] font-bold" style={{ background: EV_ST[st][1] + "22", color: EV_ST[st][1] }}>{EV_ST[st][0]}</span>
        <span className="text-xs">{DEPTS[e.dp].short}{e.deps.filter(d => d !== e.dp).length ? ` · con ${e.deps.filter(d => d !== e.dp).map(d => DEPTS[d].short).join(" y ")}` : " · exclusivo"}</span></span>}
      footer={<>
        <Button variant="ghost" className="mr-auto" icon={<Copy />} onClick={() => void copy(dc)}>Comunicado para Discord</Button>
        {can && <Button variant="ghost" className="text-red-600 dark:text-red-400" icon={<Trash2 />} aria-label="Eliminar evento" onClick={async () => {
          if (!(await confirm(`¿Eliminar «${e.n}»${e.rep ? " y todas sus fechas" : ""}?`, { danger: true, ok: "Eliminar" }))) return;
          LS.setJSON(XCAL, LS.json<Ev[]>(XCAL, []).filter(x => x.id !== e.id)); toast("Evento eliminado"); onClose(); }} />}
        {can && e.rep && st !== "canc" && <Button variant="outline" icon={<Ban />} onClick={() => upd({ canc: [...(e.canc || []), it.of!] }, "Esa fecha quedó cancelada")}>Cancelar esta fecha</Button>}
        {can && e.rep && e.canc?.includes(it.of!) && e.st !== "canc" && <Button variant="outline" onClick={() => upd({ canc: (e.canc || []).filter(x => x !== it.of) }, "Fecha restablecida")}>Restablecer fecha</Button>}
        {can && !e.rep && st === "prog" && <Button variant="outline" icon={<Ban />} onClick={async () => { if (await confirm(`¿Cancelar «${e.n}»?`, { danger: true, ok: "Cancelar evento" })) upd({ st: "canc" }, "Evento cancelado"); }}>Cancelar</Button>}
        {can && !e.rep && st === "prog" && it.at < Date.now() && <Button variant="outline" icon={<CheckCircle2 />} onClick={() => upd({ st: "fin" }, "Evento finalizado")}>Finalizar</Button>}
        {can && <Button icon={<Pencil />} onClick={() => onEdit(e)}>Editar</Button>}</>}>
      {isImg(e.img) && <div className="-mx-5 -mt-5"><img src={e.img} alt="" className="max-h-72 w-full object-cover" /></div>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Info i={<CalendarDays />} k="Fecha">{new Date(it.at).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{e.rep && <span className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500"><Repeat className="size-3" />{e.rep === "sem" ? "semanal" : "mensual"}</span>}</Info>
        <Info i={<Clock />} k="Horario (tu hora)">{e.hi}{e.hf ? ` a ${e.hf}` : ""} h</Info>
        <Info i={<MapPin />} k="Lugar">{e.lugar}</Info>
        <Info i={<UserRound />} k="Responsable"><span className="inline-flex items-center gap-1.5">{e.resp}{r && <RankBadge r={r.r} />}</span></Info>
        <Info i={<ShieldCheck />} k="División organizadora">{e.div || "Todo el departamento"}</Info>
        <Info i={<Users />} k="Convocados">{e.conv.length ? e.conv.map(x => rankES(x) || x).join(", ") : "Todo el departamento"}</Info>
      </div>
      {e.desc.trim() && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-800/50">{e.desc}</p>}
      {e.obs.trim() && <p className="whitespace-pre-wrap rounded-xl border border-dashed border-slate-200 p-3 text-[13px] text-slate-500 dark:border-slate-700"><b className="mr-1 text-slate-600 dark:text-slate-300">Observaciones:</b>{e.obs}</p>}
      <p className="text-[11px] text-slate-400">Publicado por {e.by}{e.upBy ? ` · última edición de ${e.upBy}` : ""}</p>
    </Modal>);
}
function Info({ i, k, children }: { i: React.ReactNode; k: string; children: React.ReactNode }) {
  return <div className="flex gap-2.5 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"><span className="mt-0.5 text-slate-400 [&_svg]:size-4">{i}</span><div className="min-w-0"><p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{k}</p><div className="text-[13.5px] font-medium">{children}</div></div></div>;
}

/* Jefatura: quién más puede cargar eventos */
export function EvAccess({ onClose }: { onClose: () => void }) {
  const [L, setL] = useJSON<string[]>(ACC_KEY, []), [x, setX] = useState(""), { toast } = useFeedback();
  return (
    <Modal open onClose={onClose} size="sm" icon={<ShieldCheck />} title="Quién carga eventos" desc="Jefatura siempre puede. Sumá a quien también tenga que crear, editar y cancelar eventos."
      footer={<Button variant="ghost" onClick={onClose}>Listo</Button>}>
      <AgentCombo clearable={false} value={x} chosen={L} onChange={n => { if (n && !L.includes(n)) { setL([...L, n]); toast(`${n} ya puede cargar eventos`); } setX(""); }} placeholder="Buscar agente" />
      {L.length ? <div className="space-y-1.5">{L.map(n => { const a = findAgent(n); return (
        <div key={n} className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-2.5 py-2 dark:border-slate-800"><Avatar n={n} size={28} /><b className="min-w-0 flex-1 truncate text-sm">{n}</b>{a && <RankBadge r={a.r} />}
          <button aria-label={`Quitar a ${n}`} onClick={() => setL(L.filter(y => y !== n))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button></div>); })}</div>
        : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-700">Por ahora, solo Jefatura.</p>}
    </Modal>);
}
