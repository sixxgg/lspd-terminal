/* Procedimientos de Uso de Fuerza (LSSD): dos categorías, «Uso de Fuerza» y «Uso de Fuerza con Fallecimiento», con su historial.
   Se guarda en lspdt[.depto].uof y el servidor solo manda lo que cada uno puede ver (lib/core.js › xVis):
   · Deputy involucrado: Sargento para arriba · Sargento: Teniente, Capitán y Jefatura · Teniente, Capitán o Jefatura: solo Jefatura.
   · Con varios involucrados manda el más restrictivo. Jefatura ve también los suyos; el resto no ve los propios. Quien lo registró lo ve siempre. */
import { useMemo, useState } from "react";
import { ChevronDown, History, Lock, Plus, Save, ShieldAlert, Skull, Trash2, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, SearchInput, Segmented, Select, Textarea } from "@/components/ui";
import { AgentCombo, Avatar, RankBadge } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { findAgent, lvl, norm, rankES, uid } from "@/lib/domain";
import { myLevel } from "@/nav";
import { cn } from "@/lib/cn";

type Cat = "uf" | "uff";
type St = "abierto" | "rev" | "cerrado";
type Ag = { n: string; r: string };
type Uof = { id: string; t: number; por: string; cat: Cat; ags: Ag[]; f: string; h: string; lugar: string; tipo: string; desc: string; mot: string; med: string[]; medx: string;
  res: string; afe: string; pr: string; obs: string; rev: string; st: St; hist: { t: number; by: string; tx: string }[] };
const KEY = "lspdt.uof";
const CAT: Record<Cat, [string, string, string, typeof ShieldAlert]> = { uf: ["Uso de Fuerza", "Se usó la fuerza sin que muriera nadie.", "#f59e0b", ShieldAlert], uff: ["Uso de Fuerza con Fallecimiento", "Murió una persona durante la actuación.", "#ef4444", Skull] };
const ST: Record<St, [string, string]> = { abierto: ["Abierto", "#f59e0b"], rev: ["En revisión", "#3b82f6"], cerrado: ["Cerrado", "#64748b"] };
const TIPOS = ["Reducción física", "Arma menos letal (taser, porra, spray)", "Arma de fuego", "Maniobra con vehículo (PIT, embestida)", "Intervención K-9", "Otro"];
const MEDIOS = ["Manos / técnicas de control", "Esposas", "Taser", "Porra", "Spray OC", "Pistola", "Escopeta", "Fusil", "Vehículo", "K-9"];
const hoy = () => new Date().toISOString().slice(0, 10), dmy = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
const slug = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");
/* mismo nivel de acceso que el servidor */
const need = (t: number) => (t < 7 ? 7 : t < 8 ? 8 : 10);
const needOf = (r: Uof) => Math.max(7, ...r.ags.map(a => need(Math.max(lvl(findAgent(a.n)?.r), lvl(a.r)))));
/* registros viejos o a medio cargar: nunca rompen la lista */
const nz = (r: Partial<Uof>): Uof => ({ id: "", t: 0, por: "", cat: "uf", f: "", h: "", lugar: "", tipo: "", desc: "", mot: "", medx: "", res: "", afe: "", pr: "", obs: "", rev: "", st: "abierto", ...r,
  ags: Array.isArray(r.ags) ? r.ags.filter(a => a && a.n) : [], med: Array.isArray(r.med) ? r.med : [], hist: Array.isArray(r.hist) ? r.hist : [] } as Uof);
const ACC_L = (n: number) => (n >= 10 ? "Solo Jefatura" : n >= 8 ? "Teniente para arriba" : "Sargento para arriba");

export function UsoFuerza() {
  useStoreVersion();
  const me = useMe(), [L] = useJSON<Uof[]>(KEY, []), [tab, setTab] = useState<"list" | "new">("list"), [open, setOpen] = useState<string | null>(null);
  const can = myLevel(me.r) >= 7;
  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "list", label: `Registros (${L.length})`, icon: <History /> }, ...(can ? [{ value: "new" as const, label: "Registrar procedimiento", icon: <Plus /> }] : [])]} />
      <p className="flex items-center gap-2 text-xs text-slate-500"><Lock className="size-3.5" />Ves solo lo que te corresponde por el rango de los involucrados: Deputy → Sargento+, Sargento → Teniente+, Teniente, Capitán o Jefatura → Jefatura.</p>
      {tab === "new" ? <UofForm onSaved={id => { setOpen(id); setTab("list"); }} /> : <UofList open={open} setOpen={setOpen} />}
    </div>);
}

function UofForm({ onSaved }: { onSaved: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback(), [L, setL] = useJSON<Uof[]>(KEY, []);
  const blank = (): Uof => ({ id: "", t: 0, por: me.n, cat: "uf", ags: [], f: hoy(), h: "", lugar: "", tipo: TIPOS[0], desc: "", mot: "", med: [], medx: "", res: "", afe: "", pr: "", obs: "", rev: "", st: "abierto", hist: [] });
  const [A, setA] = useState<Uof>(blank), [x, setX] = useState(""), set = (p: Partial<Uof>) => setA(o => ({ ...o, ...p }));
  const lack = [!A.ags.length && "agentes involucrados", !A.f && "fecha", !A.lugar.trim() && "lugar", !A.desc.trim() && "descripción", !A.mot.trim() && "motivo", !A.res.trim() && "resultado"].filter(Boolean) as string[];
  const nd = needOf(A), self = nd > myLevel(me.r);
  const save = () => {
    if (lack.length) { toast("Falta: " + lack.join(", "), "err"); return; }
    const now = Date.now(), r: Uof = { ...A, id: uid(), t: now, hist: [{ t: now, by: me.n, tx: `Registrado como «${CAT[A.cat][0]}»` }] };
    setL([...L, r]); toast("Procedimiento registrado"); setA(blank()); onSaved(r.id);
  };
  return (
    <Card>
      <CardHeader icon={<ShieldAlert />} title="Registrar procedimiento" desc="Elegí la categoría, quiénes intervinieron y qué pasó." />
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Categoría">{(Object.keys(CAT) as Cat[]).map(k => { const [l, d, c, I] = CAT[k], on = A.cat === k; return (
          <button key={k} role="radio" aria-checked={on} onClick={() => set({ cat: k })} className={cn("rounded-xl border p-3 text-left transition", !on && "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}
            style={on ? { borderColor: c, background: c + "14" } : undefined}><span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: c }}><I className="size-4" />{l}</span><small className="block text-xs text-slate-500">{d}</small></button>); })}</div>
        <Field label="Agentes involucrados" hint="(con su rango)">
          <div className="flex flex-wrap gap-1.5">{A.ags.map(a => <span key={a.n} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-0.5 pl-0.5 pr-1 text-[12px] font-semibold dark:border-slate-700"><Avatar n={a.n} size={20} />{a.n}<RankBadge r={a.r} />
            <button type="button" aria-label={`Quitar a ${a.n}`} onClick={() => set({ ags: A.ags.filter(y => y.n !== a.n) })} className="rounded-full p-0.5 text-slate-400 hover:text-red-500"><X className="size-3" /></button></span>)}</div>
          <AgentCombo className="mt-2" clearable={false} value={x} chosen={A.ags.map(a => a.n)} onChange={n => { const a = findAgent(n); if (a && !A.ags.some(y => y.n === a.n)) set({ ags: [...A.ags, { n: a.n, r: a.r }] }); setX(""); }} placeholder="Sumar agente involucrado" />
          {A.ags.length > 0 && <p className={cn("mt-1 text-[11.5px]", self ? "text-amber-600 dark:text-amber-400" : "text-slate-500")}>Acceso: {ACC_L(nd)}.{self ? " Lo vas a seguir viendo porque lo registrás vos." : ""}</p>}
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Fecha"><Input type="date" value={A.f} onChange={e => set({ f: e.target.value })} /></Field>
          <Field label="Hora"><Input type="time" value={A.h} onChange={e => set({ h: e.target.value })} /></Field>
          <Field label="Tipo de procedimiento"><Select value={A.tipo} onChange={e => set({ tipo: e.target.value })}>{TIPOS.map(t => <option key={t}>{t}</option>)}</Select></Field>
        </div>
        <Field label="Lugar de los hechos"><Input value={A.lugar} onChange={e => set({ lugar: e.target.value })} placeholder="Ej: Route 68, a la altura de Harmony" /></Field>
        <Field label="Descripción de lo ocurrido"><Textarea rows={4} value={A.desc} onChange={e => set({ desc: e.target.value })} /></Field>
        <Field label="Motivo del uso de la fuerza"><Textarea rows={2} value={A.mot} onChange={e => set({ mot: e.target.value })} placeholder="Qué amenaza o resistencia lo justificó" /></Field>
        <Field label="Medios empleados"><div className="flex flex-wrap gap-1">{MEDIOS.map(m => { const on = A.med.includes(m); return (
          <button key={m} type="button" onClick={() => set({ med: on ? A.med.filter(y => y !== m) : [...A.med, m] })} className={cn("rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition", on ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{m}</button>); })}</div>
          <Input className="mt-2" value={A.medx} onChange={e => set({ medx: e.target.value })} placeholder="Otros medios (opcional)" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Resultado de la intervención"><Textarea rows={2} value={A.res} onChange={e => set({ res: e.target.value })} /></Field>
          <Field label="Personas afectadas"><Textarea rows={2} value={A.afe} onChange={e => set({ afe: e.target.value })} placeholder="Nombre y estado (herido, detenido, fallecido…)" /></Field>
        </div>
        <Field label="Pruebas y documentación" hint="(una por línea)"><Textarea rows={2} value={A.pr} onChange={e => set({ pr: e.target.value })} placeholder={"https://…\nBodycam de la unidad"} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Responsable de la revisión"><AgentCombo free value={A.rev} onChange={v => set({ rev: v })} placeholder="Quién lo revisa" /></Field>
          <Field label="Observaciones" hint="(opcional)"><Input value={A.obs} onChange={e => set({ obs: e.target.value })} /></Field>
        </div>
      </CardBody>
      <div className="flex justify-end border-t border-slate-100 px-5 py-3 dark:border-slate-800"><Button icon={<Save />} onClick={save}>Registrar</Button></div>
    </Card>);
}

function UofList({ open, setOpen }: { open: string | null; setOpen: (v: string | null) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback(), [L0, setL] = useJSON<Uof[]>(KEY, []), L = useMemo(() => (Array.isArray(L0) ? L0 : []).filter(x => x && x.id).map(nz), [L0]), [c, setC] = useState<"" | Cat>(""), [q, setQ] = useState("");
  const qn = norm(q), F = useMemo(() => L.slice().sort((a, b) => (b.f + b.h).localeCompare(a.f + a.h) || b.t - a.t).filter(r => (!c || r.cat === c) && (!qn || norm(`${r.ags.map(a => a.n).join(" ")} ${r.lugar} ${r.desc} ${r.por}`).includes(qn))), [L, c, qn]);
  const up = (r: Uof, p: Partial<Uof>, tx: string) => setL(L.map(x => (x.id === r.id ? { ...x, ...p, hist: [...(x.hist || []), { t: Date.now(), by: me.n, tx }] } : x)));
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">{([["", "Todos"], ["uf", "Uso de Fuerza"], ["uff", "Con fallecimiento"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setC(k)} className={cn("rounded-lg px-3 py-1.5 text-[12px] font-semibold transition", c === k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500")}>{l} ({k ? L.filter(r => r.cat === k).length : L.length})</button>))}</div>
        <SearchInput className="min-w-[14rem] flex-1 sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar agente, lugar o descripción…" />
      </div>
      {!F.length ? <Empty icon={<ShieldAlert />} title={L.length ? "Nada coincide" : "No hay procedimientos que puedas ver"} />
        : <div className="divide-y divide-slate-100 dark:divide-slate-800">{F.map(r => { const isO = open === r.id, [cl, , cc, CI] = CAT[r.cat], [sl, sc] = ST[r.st], ed = r.por === me.n || myLevel(me.r) >= 8 || slug(r.rev) === slug(me.n); return (
          <div key={r.id} style={{ boxShadow: `inset 3px 0 0 ${cc}` }}>
            <button onClick={() => setOpen(isO ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <CI className="size-5 shrink-0" style={{ color: cc }} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.ags.map(a => a.n).join(", ")}</p><p className="truncate text-xs text-slate-500">{dmy(r.f)}{r.h ? ` · ${r.h}` : ""} · {r.lugar} · {r.tipo}</p></div>
              <span className="hidden rounded-full px-2 py-0.5 text-[11px] font-bold sm:inline" style={{ background: cc + "1f", color: cc }}>{cl}</span>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: sc + "1f", color: sc }}>{sl}</span>
              <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isO && "rotate-180")} />
            </button>
            {isO && <div className="grid gap-4 bg-slate-50/60 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] dark:bg-slate-950/30">
              <div className="space-y-2 text-[13.5px]">
                <div className="flex flex-wrap gap-1.5">{r.ags.map(a => { const cur = findAgent(a.n); return <span key={a.n} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-0.5 pl-0.5 pr-2 text-[12px] font-semibold dark:border-slate-700"><Avatar n={a.n} size={20} />{a.n}<RankBadge r={a.r} />{cur && cur.r !== a.r && <span className="text-[10.5px] text-slate-400">(hoy {rankES(cur.r)})</span>}</span>; })}</div>
                {([["Descripción", r.desc], ["Motivo", r.mot], ["Medios empleados", [...r.med, r.medx].filter(Boolean).join(", ")], ["Resultado", r.res], ["Personas afectadas", r.afe], ["Pruebas y documentación", r.pr], ["Observaciones", r.obs]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}><p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{k}</p><p className="whitespace-pre-wrap leading-relaxed">{v}</p></div>))}
                <p className="text-[11.5px] text-slate-500">Registrado por {r.por} · revisa {r.rev || "sin asignar"} · acceso: {ACC_L(needOf(r))}</p>
              </div>
              <div className="space-y-2">
                {ed && <div className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</span>{(Object.keys(ST) as St[]).map(k => (
                  <button key={k} onClick={() => k !== r.st && up(r, { st: k }, `Estado: ${ST[r.st][0]} → ${ST[k][0]}`)} className={cn("rounded-lg border px-2.5 py-1 text-[12px] font-semibold", r.st !== k && "border-slate-200 text-slate-500 dark:border-slate-700")}
                    style={r.st === k ? { borderColor: ST[k][1], background: ST[k][1] + "1c", color: ST[k][1] } : undefined}>{ST[k][0]}</button>))}</div>}
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><History className="size-3.5" />Historial</p>
                <ol className="space-y-1">{(r.hist || []).map((h, i) => <li key={i} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] dark:border-slate-800">{h.tx}<span className="block text-[11px] text-slate-400">{h.by} · {new Date(h.t).toLocaleString("es-AR")}</span></li>)}</ol>
                {(r.por === me.n || myLevel(me.r) >= 10) && <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (await confirm("¿Eliminar este procedimiento del registro?", { danger: true, ok: "Eliminar" })) { setL(L.filter(x => x.id !== r.id)); toast("Procedimiento eliminado"); } }}>Eliminar</Button>}
              </div>
            </div>}
          </div>); })}</div>}
    </Card>);
}
