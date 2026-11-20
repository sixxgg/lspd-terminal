/* Feedback del LSSD: Positivo, Negativo y Seguimiento. Lo escriben Supervisores, Capitanía y Jefatura (y los Master FTO);
   lo revisa la administración del departamento (CristianGV367 · Grant Knox), a quien le llega cada feedback nuevo.
   Se guarda en lspdt[.depto].fbl. El servidor solo le manda a cada uno lo que le corresponde ver, con las mismas reglas que los expedientes
   (quien lo escribió, quien lo revisa, Jefatura y la administración siempre lo ven). Cada cambio de estado o anotación queda en el historial. */
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardList, Eye, FolderInput, History, ListChecks, MessageSquarePlus, Paperclip, Plus, Save, ThumbsDown, ThumbsUp, Trash2, UserRound, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Empty, Field, Input, SearchInput, Segmented, Select, Textarea } from "@/components/ui";
import { AgentCombo, Avatar, RankBadge } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { LS, ME_ROLES, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { DEPT } from "@/lib/dept";
import { findAgent, lvl, norm, uid } from "@/lib/domain";
import { myLevel } from "@/nav";
import { canExp } from "./Expedientes";
import { cn } from "@/lib/cn";

type FTipo = "pos" | "neg" | "seg";
type FSt = "pend" | "rev" | "ok" | "cer";
type Nota = { id: string; t: number; by: string; tx: string; k?: "nota" | "st" | "rev" | "exp" | "fin" };
export type Fbl = { id: string; t: number; ag: string; lv: number; por: string; f: string; tipo: FTipo; mot: string; hechos: string; obs: string; pr: string;
  st: FSt; rev: string; exp?: number; fin?: number; notas: Nota[] };
const KEY = "lspdt.fbl";
/* quien revisa los feedbacks de cada departamento (su administración): LSSD → CristianGV367 (Grant Knox) */
export const FBL_REV: Record<string, string> = { lssd: "Grant Knox" };
const TIPO: Record<FTipo, [string, string, string, typeof ThumbsUp]> = {
  pos: ["Positivo", "Reconocer buenas actuaciones, rendimiento o comportamiento.", "#22c55e", ThumbsUp],
  neg: ["Negativo", "Actuaciones incorrectas, errores o situaciones que requieren corrección.", "#ef4444", ThumbsDown],
  seg: ["Seguimiento", "Situaciones para revisar de nuevo o mantener bajo observación.", "#3b82f6", Eye],
};
const ST: Record<FSt, [string, string]> = { pend: ["Pendiente", "#f59e0b"], rev: ["En revisión", "#3b82f6"], ok: ["Revisado", "#22c55e"], cer: ["Cerrado", "#64748b"] };
const hoy = () => new Date().toISOString().slice(0, 10), dmy = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
const fdt = (t: number) => new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const slugOf = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const fblRev = () => FBL_REV[DEPT.id] || "";
/* revisor: la administración del departamento, quien figura como responsable, Jefatura y six */
const isRev = (r: Fbl, me: string) => !!ME_ROLES.dadm || !!ME_ROLES.six || !!ME_ROLES.jef || r.rev === me;
/* feedbacks que esperan revisión de esta persona (para el aviso del menú) */
export const fblPend = (me: string) => LS.json<Fbl[]>(KEY, []).filter(r => r && (r.st === "pend" || r.st === "rev") && (r.rev === me || !!ME_ROLES.dadm)).length;

export function FbLssd() {
  useStoreVersion();
  const me = useMe(), [L] = useJSON<Fbl[]>(KEY, []), rev = !!ME_ROLES.dadm || !!ME_ROLES.six || L.some(r => r.rev === me.n);
  const pend = L.filter(r => (r.st === "pend" || r.st === "rev") && (r.rev === me.n || !!ME_ROLES.dadm)).length;
  const [tab, setTab] = useState<"new" | "list" | "rev">(rev && pend ? "rev" : "new"), [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "new", label: "Nuevo feedback", icon: <MessageSquarePlus /> }, { value: "list", label: `Registrados (${L.length})`, icon: <ListChecks /> },
        ...(rev ? [{ value: "rev" as const, label: `Revisión${pend ? ` (${pend})` : ""}`, icon: <ClipboardList /> }] : [])]} />
      {tab === "new" ? <FbForm onSaved={id => { setOpen(id); setTab("list"); }} /> : <FbList open={open} setOpen={setOpen} only={tab === "rev"} />}
    </div>);
}

function FbForm({ onSaved }: { onSaved: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback(), myL = myLevel(me.r);
  const blank = (): Fbl => ({ id: "", t: 0, ag: "", lv: 0, por: me.n, f: hoy(), tipo: "pos", mot: "", hechos: "", obs: "", pr: "", st: "pend", rev: fblRev(), notas: [] });
  const [A, setA] = useState<Fbl>(blank), [att, setAtt] = useState(false), [err, setErr] = useState(false);
  const set = (p: Partial<Fbl>) => setA(o => ({ ...o, ...p }));
  const a = A.ag ? findAgent(A.ag) : null, okExp = !!a && canExp(me, a);
  const need = [!A.ag && "agente", !A.mot.trim() && "motivo", !A.hechos.trim() && "descripción de los hechos"].filter(Boolean) as string[];
  const save = () => {
    if (need.length) { setErr(true); toast("Falta: " + need.join(", "), "err"); return; }
    const now = Date.now(), r: Fbl = { ...A, id: uid(), t: now, lv: lvl(a?.r), mot: A.mot.trim(), hechos: A.hechos.trim(), obs: A.obs.trim(), pr: A.pr.trim(),
      notas: [{ id: uid(), t: now, by: me.n, tx: `Feedback registrado · lo revisa ${A.rev || "la administración"}`, k: "st" }] };
    if (att && okExp) { attach(r, me.n); r.exp = now; r.notas.push({ id: uid(), t: now, by: me.n, tx: "Adjuntado al expediente personal", k: "exp" }); }
    LS.setJSON(KEY, [...LS.json<Fbl[]>(KEY, []), r]); toast(`Feedback registrado · le llega a ${r.rev || "la administración"}`); setA(blank()); setAtt(false); setErr(false); onSaved(r.id);
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader icon={<UserRound />} title="Agente y tipo" desc={`Lo escribís como ${me.n}. Le llega a ${A.rev || "la administración del departamento"} para revisarlo.`} />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <Field label="Agente que recibe el feedback" error={err && !A.ag ? "Elegí el agente" : undefined}>
              <AgentCombo value={A.ag} onChange={v => set({ ag: v })} filter={x => x.n !== me.n && (myL >= 10 || !!ME_ROLES.dadm || lvl(x.r) < myL)} empty="No hay agentes de rango inferior al tuyo" /></Field>
            <Field label="Fecha"><Input type="date" value={A.f} onChange={e => set({ f: e.target.value })} /></Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de feedback">{(Object.keys(TIPO) as FTipo[]).map(k => { const [l, d, c, I] = TIPO[k], on = A.tipo === k; return (
            <button key={k} role="radio" aria-checked={on} onClick={() => set({ tipo: k })} className={cn("rounded-xl border p-3 text-left transition", !on && "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}
              style={on ? { borderColor: c, background: c + "14" } : undefined}><span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: c }}><I className="size-4" />{l}</span><small className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">{d}</small></button>); })}</div>
          <Field label="Motivo" error={err && !A.mot.trim() ? "Falta el motivo" : undefined}><Input value={A.mot} onChange={e => set({ mot: e.target.value })} placeholder="Ej: Excelente manejo de una persecución" maxLength={140} /></Field>
          <Field label="Descripción de los hechos" error={err && !A.hechos.trim() ? "Contá qué pasó" : undefined}><Textarea rows={5} value={A.hechos} onChange={e => set({ hechos: e.target.value })} placeholder="Qué pasó, cuándo y dónde. Lo más concreto posible." /></Field>
          <Field label="Observaciones" hint="(opcional)"><Textarea rows={2} value={A.obs} onChange={e => set({ obs: e.target.value })} /></Field>
          <Field label="Pruebas o archivos adjuntos" hint="(uno por línea: links, capturas, vídeos)"><Textarea rows={2} value={A.pr} onChange={e => set({ pr: e.target.value })} placeholder={"https://…\nVídeo de la bodycam"} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Responsable de la revisión"><AgentCombo free value={A.rev} onChange={v => set({ rev: v })} placeholder="Quién lo revisa" /></Field>
            <div className="flex items-end pb-1">{a ? (okExp ? <Checkbox checked={att} onChange={setAtt} label="Adjuntar al expediente personal" />
              : <p className="text-[11.5px] text-slate-500">No tenés acceso al expediente de {a.n}: quien lo revise lo puede adjuntar.</p>) : null}</div>
          </div>
        </CardBody>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800"><Button variant="ghost" onClick={() => { setA(blank()); setErr(false); }}>Limpiar</Button><Button icon={<Save />} onClick={save}>Registrar feedback</Button></div>
      </Card>
      <Card className="h-fit">
        <CardHeader icon={<Eye />} title="Vista previa" />
        <CardBody><FbView r={{ ...A, id: "x", t: Date.now(), lv: lvl(a?.r) }} preview /></CardBody>
      </Card>
    </div>);
}

/* adjunta el feedback al expediente personal (si quien lo hace tiene acceso; el servidor lo vuelve a controlar) */
function attach(r: Fbl, by: string) {
  const k = `lspdt.exp.${slugOf(r.ag)}`, E = LS.json<{ e: { id: string }[] }>(k, { e: [] });
  const tit = `Feedback ${TIPO[r.tipo][0].toLowerCase()}: ${r.mot}`, txt = [r.hechos, r.obs && `Observaciones: ${r.obs}`, r.pr && `Pruebas:\n${r.pr}`, `Escrito por ${r.por}`].filter(Boolean).join("\n\n");
  LS.setJSON(k, { ...E, e: [...(E.e || []), { id: "fbl-" + r.id, t: Date.now(), f: r.f, by, tipo: r.tipo === "pos" ? "pos" : r.tipo === "neg" ? "neg" : "fb", tit, txt }] });
}

function FbView({ r, preview }: { r: Fbl; preview?: boolean }) {
  const [l, , c, I] = TIPO[r.tipo], a = r.ag ? findAgent(r.ag) : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">{r.ag ? <Avatar n={r.ag} size={40} /> : <span className="grid size-10 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><UserRound className="size-5 text-slate-400" /></span>}
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.ag || "Agente"}</p><div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500">{a && <RankBadge r={a.r} />}{dmy(r.f)} · por {r.por}</div></div>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" style={{ background: c + "1f", color: c }}><I className="size-3.5" />{l}</span></div>
      <p className="font-display text-[15px] font-semibold">{r.mot || <span className="text-slate-400">Motivo</span>}</p>
      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300">{r.hechos || <span className="text-slate-400">Descripción de los hechos…</span>}</p>
      {r.obs && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-2.5 text-[13px] dark:bg-slate-800/50"><b>Observaciones: </b>{r.obs}</p>}
      {r.pr && <div className="space-y-1">{r.pr.split("\n").filter(Boolean).map((x, i) => <p key={i} className="flex items-center gap-1.5 truncate text-[12.5px]"><Paperclip className="size-3.5 shrink-0 text-slate-400" />
        {/^https?:\/\//.test(x.trim()) ? <a href={x.trim()} target="_blank" rel="noreferrer noopener" className="truncate text-brand-600 hover:underline dark:text-brand-300">{x.trim()}</a> : x}</p>)}</div>}
      {!preview && <p className="text-[11.5px] text-slate-500">Revisa: <b>{r.rev || "la administración"}</b>{r.exp ? " · adjuntado al expediente" : ""}{r.fin ? ` · seguimiento finalizado el ${fdt(r.fin)}` : ""}</p>}
    </div>);
}

function FbList({ open, setOpen, only }: { open: string | null; setOpen: (v: string | null) => void; only: boolean }) {
  const me = useMe(), { toast, confirm } = useFeedback(), [L, setL] = useJSON<Fbl[]>(KEY, []);
  const [q, setQ] = useState(""), [t, setT] = useState<"" | FTipo>(""), [s, setS] = useState<"" | FSt>(only ? "pend" : ""), [nota, setNota] = useState("");
  const qn = norm(q);
  const F = useMemo(() => L.slice().sort((a, b) => b.t - a.t).filter(r => (!only || r.rev === me.n || !!ME_ROLES.dadm || !!ME_ROLES.six) && (!t || r.tipo === t)
    && (!s || (s === "pend" ? r.st === "pend" || r.st === "rev" : r.st === s)) && (!qn || norm(`${r.ag} ${r.por} ${r.mot} ${r.hechos}`).includes(qn))), [L, only, t, s, qn, me.n]);
  const up = (r: Fbl, p: Partial<Fbl>, n?: Omit<Nota, "id" | "t" | "by">) => setL(L.map(x => (x.id === r.id ? { ...x, ...p, notas: n ? [...(x.notas || []), { id: uid(), t: Date.now(), by: me.n, ...n }] : x.notas } : x)));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">{(Object.keys(TIPO) as FTipo[]).map(k => { const [l, , c, I] = TIPO[k], on = t === k; return (
        <button key={k} onClick={() => setT(on ? "" : k)} className={cn("rounded-2xl border p-3 text-left transition", !on && "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60")} style={on ? { borderColor: c, background: c + "14" } : undefined}>
          <p className="text-xl font-bold tabular-nums">{L.filter(r => r.tipo === k).length}</p><p className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: c }}><I className="size-3.5" />{l}</p></button>); })}</div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <SearchInput className="min-w-[14rem] flex-1 sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar agente, autor o motivo…" />
          <Select className="h-9 w-auto text-sm" value={s} onChange={e => setS(e.target.value as FSt | "")}><option value="">Todos los estados</option><option value="pend">Por revisar</option>{(Object.keys(ST) as FSt[]).map(k => <option key={k} value={k}>{ST[k][0]}</option>)}</Select>
          <span className="text-xs text-slate-400">{F.length} de {L.length}</span>
        </div>
        {!F.length ? <Empty icon={<ClipboardList />} title={L.length ? "Nada coincide" : "Todavía no hay feedbacks"} desc={only ? "Cuando alguien registre un feedback, te aparece acá." : undefined} />
          : <div className="divide-y divide-slate-100 dark:divide-slate-800">{F.map(r => { const isO = open === r.id, [tl, , tc, TI] = TIPO[r.tipo], [sl, sc] = ST[r.st], rv = isRev(r, me.n), a = findAgent(r.ag), okE = !!a && canExp(me, a);
            const del = r.por === me.n || !!ME_ROLES.dadm || !!ME_ROLES.six || myLevel(me.r) >= 10;
            return (
              <div key={r.id} style={{ boxShadow: `inset 3px 0 0 ${tc}` }}>
                <button onClick={() => { setOpen(isO ? null : r.id); setNota(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <Avatar n={r.ag} size={34} />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.ag} <span className="font-normal text-slate-500">· {r.mot}</span></p><p className="truncate text-xs text-slate-500">{dmy(r.f)} · por {r.por} · revisa {r.rev || "administración"}</p></div>
                  <span className="hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold sm:inline-flex" style={{ background: tc + "1f", color: tc }}><TI className="size-3" />{tl}</span>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: sc + "1f", color: sc }}>{r.tipo === "seg" && r.fin ? "Finalizado" : sl}</span>
                  <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isO && "rotate-180")} />
                </button>
                {isO && <div className="grid gap-4 bg-slate-50/60 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] dark:bg-slate-950/30">
                  <div className="space-y-3"><FbView r={r} />
                    {rv && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</span>
                      {(Object.keys(ST) as FSt[]).map(k => <button key={k} onClick={() => k !== r.st && up(r, { st: k }, { tx: `Estado: ${ST[r.st][0]} → ${ST[k][0]}`, k: "st" })}
                        className={cn("rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition", r.st !== k && "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}
                        style={r.st === k ? { borderColor: ST[k][1], background: ST[k][1] + "1c", color: ST[k][1] } : undefined}>{ST[k][0]}</button>)}
                    </div>}
                    <div className="flex flex-wrap gap-2">
                      {okE && !r.exp && <Button size="sm" variant="outline" icon={<FolderInput />} onClick={() => { attach(r, me.n); up(r, { exp: Date.now() }, { tx: "Adjuntado al expediente personal", k: "exp" }); toast("Adjuntado al expediente"); }}>Adjuntar al expediente</Button>}
                      {r.tipo === "seg" && !r.fin && rv && <Button size="sm" variant="outline" icon={<CheckCircle2 />} onClick={() => up(r, { fin: Date.now(), st: "cer" }, { tx: "Seguimiento finalizado", k: "fin" })}>Finalizar seguimiento</Button>}
                      {r.tipo === "seg" && r.fin && rv && <Button size="sm" variant="ghost" onClick={() => up(r, { fin: 0, st: "rev" }, { tx: "Seguimiento reabierto", k: "fin" })}>Reabrir seguimiento</Button>}
                      {rv && <RevPick r={r} onPick={v => up(r, { rev: v }, { tx: `Responsable de la revisión: ${v}`, k: "rev" })} />}
                      <span className="flex-1" />
                      {del && <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (await confirm(`¿Eliminar el feedback de ${r.ag}?`, { danger: true, ok: "Eliminar" })) { setL(L.filter(x => x.id !== r.id)); toast("Feedback eliminado"); } }}>Eliminar</Button>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><History className="size-3.5" />{r.tipo === "seg" ? "Evolución y revisiones" : "Historial de revisiones"}</p>
                    <ol className="space-y-1.5">{(r.notas || []).map(n => <li key={n.id} className={cn("rounded-xl border px-3 py-2 text-[13px]", n.k === "nota" ? "border-brand-500/25 bg-brand-500/[.05]" : "border-slate-200 dark:border-slate-800")}>
                      <p className="whitespace-pre-wrap">{n.tx}</p><p className="mt-0.5 text-[11px] text-slate-400">{n.by} · {fdt(n.t)}</p></li>)}</ol>
                    {!r.fin && <div className="flex gap-2"><Textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder={r.tipo === "seg" ? "Anotá cómo evoluciona el agente…" : "Agregar una anotación…"} className="text-sm" />
                      <Button size="sm" icon={<Plus />} disabled={!nota.trim()} onClick={() => { up(r, {}, { tx: nota.trim(), k: "nota" }); setNota(""); }} aria-label="Agregar anotación" /></div>}
                  </div>
                </div>}
              </div>); })}</div>}
      </Card>
    </div>);
}
function RevPick({ r, onPick }: { r: Fbl; onPick: (v: string) => void }) {
  const [o, setO] = useState(false), [v, setV] = useState("");
  if (!o) return <Button size="sm" variant="ghost" icon={<UserRound />} onClick={() => setO(true)}>Cambiar quién revisa</Button>;
  return <span className="inline-flex items-center gap-1.5"><AgentCombo sm free clearable={false} value={v} onChange={x => { if (x && x !== r.rev) onPick(x); setO(false); setV(""); }} placeholder="Nuevo responsable" className="w-56" />
    <button aria-label="Cerrar" onClick={() => setO(false)} className="rounded p-1 text-slate-400 hover:text-slate-700"><X className="size-4" /></button></span>;
}
