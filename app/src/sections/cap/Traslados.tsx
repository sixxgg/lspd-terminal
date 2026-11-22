/* LSSD › Capitanía / Jefatura › Traslados: de la solicitud a la incorporación. Solo Capitanía y Jefatura (Captain para arriba) y six;
   el servidor controla lo mismo (lib/core.js › traslOk). Datos y reglas en lib/trasl.ts. La aprobación es por MAYORÍA SIMPLE de los
   votos válidos (a favor vs. en contra); las revisiones pedidas no suman y no dejan cerrar hasta resolverse. Nada se borra. */
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, FolderArchive, Gavel, History, Link2, MessageSquarePlus, Pencil, Plus, Save, Send, ShieldCheck, UserPlus, Vote, XCircle } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { fullDT, getRoster, isoToDMY, norm, uid } from "@/lib/domain";
import { AGX_KEY, ESTADOS_X, RANKS_X, type AgxE } from "@/lib/agx";
import { cn } from "@/lib/cn";
import { CRIT, CRITV, ESTS, OPTS, RES, TIPOS, eKey, evals, mayoria, preguntas, revPend, revisores, slug, solList, vKey, votos, type CritV, type Eval, type Opt, type Sol, type TEst, type TTipo, type Voto } from "@/lib/trasl";

type Tab = "ent" | "prev" | "enrev" | "apr" | "rech" | "his";
const TABS: [Tab, string, TEst[] | null][] = [["ent", "Entrevistas", ["borr", "entp", "entc"]], ["prev", "Pendientes de revisión", ["prev"]], ["enrev", "En revisión", ["enrev"]], ["apr", "Aprobados", ["apr"]], ["rech", "Rechazados", ["rech"]], ["his", "Historial", null]];
const SK = "lspdt.next.traslSel";
const hoy = () => new Date().toISOString().slice(0, 10);
const put = (s: Sol) => LS.setJSON(`lspdt.trasl.${s.id}`, s);
const Chip = ({ e }: { e: TEst }) => <span className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ background: ESTS[e].c + "22", color: ESTS[e].c }}>{ESTS[e].l}</span>;

export function Traslados() {
  const ver = useStoreVersion(), me = useMe();
  const L = useMemo(() => solList(), [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<Tab>("ent"), [q, setQ] = useState(""), [ft, setFt] = useState<TTipo | "">(""), [fe, setFe] = useState<TEst | "">(""), [nuevo, setNuevo] = useState(false);
  const [sel, setSel0] = useState<string>(() => { try { return sessionStorage.getItem(SK) || ""; } catch { return ""; } });
  const setSel = (id: string) => { setSel0(id); try { if (id) sessionStorage.setItem(SK, id); else sessionStorage.removeItem(SK); } catch { /* */ } };
  const cur = L.find(x => x.id === sel);
  if (cur) return <Detalle s={cur} onBack={() => setSel("")} />;
  const s = norm(q.trim()), T = TABS.find(t => t[0] === tab)!;
  const vis = L.filter(x => (!T[2] || T[2].includes(x.est)) && (!s || norm(`${x.n} ${x.dep} ${x.com || ""}`).includes(s)) && (!ft || x.tipo === ft) && (!fe || x.est === fe));
  const cnt = (t: Tab) => { const E = TABS.find(x => x[0] === t)![2]; return E ? L.filter(x => E.includes(x.est)).length : L.length; };
  const abiertas = L.filter(x => x.est === "prev" || x.est === "enrev"), sinVoto = abiertas.filter(x => !votos(x.id, x.ronda).some(v => slug(v.n) === slug(me.n)));
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300"><FolderArchive className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold">Traslados a la LSSD</p>
          <p className="text-xs text-slate-500">Solicitud, entrevista, evaluación y votación por mayoría simple de Capitanía y Jefatura. Confidencial: solo Captain para arriba.</p></div>
        {sinVoto.length > 0 && <button onClick={() => setTab(sinVoto[0].est === "prev" ? "prev" : "enrev")} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Vote className="size-4" />{sinVoto.length} votación{sinVoto.length > 1 ? "es" : ""} sin tu voto</button>}
        <Button icon={<Plus className="size-4" />} onClick={() => setNuevo(true)}>Nuevo traslado</Button>
      </Card>
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/60 p-1 dark:border-slate-800 dark:bg-slate-900/50">{TABS.map(([k, l]) => { const n = cnt(k); return (
        <button key={k} onClick={() => setTab(k)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition", tab === k ? "bg-brand-500/15 text-brand-700 ring-1 ring-inset ring-brand-500/40 dark:text-brand-200" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}>
          {l}<span className="rounded-md bg-slate-500/10 px-1.5 text-[11px] tabular-nums">{n}</span>{(k === "prev" || k === "enrev") && n > 0 && <span className="size-1.5 rounded-full bg-amber-500" />}</button>); })}</div>
      <Card className="flex flex-wrap items-end gap-3 p-3">
        <SearchInput className="min-w-[14rem] flex-1" value={q} onChange={setQ} placeholder="Buscar candidato o procedencia…" />
        <label className="text-xs text-slate-500">Procedencia<Select className="mt-1 h-9" value={ft} onChange={e => setFt(e.target.value as TTipo | "")}><option value="">Todas</option>{(Object.keys(TIPOS) as TTipo[]).map(t => <option key={t} value={t}>{TIPOS[t].l}</option>)}</Select></label>
        {tab === "his" && <label className="text-xs text-slate-500">Estado<Select className="mt-1 h-9" value={fe} onChange={e => setFe(e.target.value as TEst | "")}><option value="">Todos</option>{(Object.keys(ESTS) as TEst[]).map(t => <option key={t} value={t}>{ESTS[t].l}</option>)}</Select></label>}
      </Card>
      {!vis.length ? <Card><Empty icon={<FolderArchive />} title={L.length ? "Nada en esta lista" : "Todavía no hay traslados"} desc={L.length ? undefined : "Tocá «Nuevo traslado» para abrir la primera solicitud."} /></Card>
        : <Card className="divide-y divide-slate-100 dark:divide-slate-800">{vis.map(x => { const V = x.est === "prev" || x.est === "enrev" ? mayoria(votos(x.id, x.ronda)) : null; return (
          <button key={x.id} onClick={() => setSel(x.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <span className="min-w-0 flex-1"><b className="block truncate">{x.n}</b><span className="text-xs text-slate-500">{TIPOS[x.tipo].l}{x.dep && x.tipo === "ext" ? ` · ${x.dep}` : ""}{x.com ? ` · ${x.com}` : ""} · solicitud {isoToDMY(x.fsol)} · {x.entv || x.by}</span></span>
            {V && <span className="text-xs tabular-nums text-slate-500"><b className="text-emerald-600">{V.si}</b> · <b className="text-red-500">{V.no}</b> · <b className="text-amber-500">{V.rev}</b> {x.ronda > 1 && `· ronda ${x.ronda}`}</span>}
            <Chip e={x.est} /><span className="w-28 text-right text-[11px] text-slate-400">{fullDT(x.upd).slice(0, 10)}</span></button>); })}</Card>}
      {nuevo && <SolForm onClose={() => setNuevo(false)} onDone={id => { setNuevo(false); setSel(id); }} all={L} />}
    </div>);
}

/* ---------- nueva solicitud (o editar los datos) ---------- */
function SolForm({ s0, all, onClose, onDone }: { s0?: Sol; all: Sol[]; onClose: () => void; onDone: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [f, setF] = useState(() => ({ tipo: s0?.tipo || "lspd" as TTipo, n: s0?.n || "", placa: s0?.placa || "", dep: s0?.dep || "", com: s0?.com || "", rango: s0?.rango || "", ing: s0?.ing || "", du: s0?.du || "", di: s0?.di || "", mot: s0?.mot || "",
    fsol: s0?.fsol || hoy(), entv: s0?.entv || me.n, obs: s0?.obs || "", dn: "", du2: "" }));
  const up = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const save = (draft: boolean) => {
    const n = f.n.trim().replace(/\s+/g, " "); if (!n) { toast("Falta el nombre del candidato", "err"); return; }
    if (f.di.trim() && !/^\d{17,20}$/.test(f.di.trim())) { toast("El ID de Discord son 17 a 20 números", "err"); return; }
    if (f.tipo === "ext" && !f.dep.trim()) { toast("Indicá el departamento o comisaría de procedencia", "err"); return; }
    /* una sola solicitud abierta por candidato */
    const dup = all.find(x => x.id !== s0?.id && slug(x.n) === slug(n) && !["rech", "inc"].includes(x.est)); if (dup) { toast(`${n} ya tiene una solicitud abierta (${ESTS[dup.est].l})`, "err"); return; }
    const now = Date.now(), dep = f.tipo === "ext" ? f.dep.trim() : TIPOS[f.tipo].dep;
    const docs = [...(s0?.docs || []), ...(f.du2.trim() ? [{ n: f.dn.trim() || "Documento", url: f.du2.trim(), t: now, by: me.n }] : [])];
    const base = { tipo: f.tipo, n, placa: f.placa.trim(), dep, com: f.com.trim(), rango: f.rango.trim(), ing: f.ing, du: f.du.trim(), di: f.di.trim(), mot: f.mot.trim(), fsol: f.fsol, entv: f.entv.trim(), obs: f.obs.trim(), docs };
    if (s0) { const s: Sol = { ...s0, ...base, est: s0.est === "borr" && !draft ? "entp" : s0.est, upd: now, ub: me.n, log: [...s0.log, { t: now, by: me.n, x: s0.est === "borr" && !draft ? "Datos completos: pasa a Entrevista pendiente" : "Editó los datos de la solicitud" }] };
      if (!s0.ent.r.some(Boolean) && !s0.orig) s.ent = { ...s.ent, q: preguntas(s) };
      put(s); toast("Solicitud guardada"); onDone(s.id); return; }
    const id = uid().replace(/[^a-z0-9]/g, ""), s: Sol = { id, ...base, est: draft ? "borr" : "entp", by: me.n, at: now, upd: now, ub: me.n, ent: { q: [], r: [] }, adic: [], ronda: 1, cierres: [], log: [{ t: now, by: me.n, x: draft ? "Creó la solicitud (borrador)" : "Creó la solicitud" }] };
    s.ent = { q: preguntas(s), r: [] }; put(s); toast(draft ? "Guardada como borrador" : "Solicitud creada"); onDone(id);
  };
  return (
    <Modal open onClose={onClose} size="lg" icon={<FolderArchive />} title={s0 ? "Datos de la solicitud" : "Nuevo traslado"} desc="Confidencial: solo Capitanía y Jefatura."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button>{(!s0 || s0.est === "borr") && <Button variant="outline" icon={<Save className="size-4" />} onClick={() => save(true)}>Guardar borrador</Button>}<Button onClick={() => save(false)}>{s0 ? "Guardar" : "Crear solicitud"}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">{(Object.keys(TIPOS) as TTipo[]).map(t => (
          <button key={t} type="button" onClick={() => up({ tipo: t })} className={cn("rounded-xl border-2 p-2.5 text-left transition", f.tipo === t ? "border-brand-500 bg-brand-500/10" : "border-slate-200 dark:border-slate-800")}>
            <p className="text-[13px] font-bold">{TIPOS[t].l}</p><p className="text-[11px] text-slate-500">{TIPOS[t].d}</p></button>))}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre y apellidos del candidato"><Input autoFocus value={f.n} onChange={e => up({ n: e.target.value })} maxLength={80} /></Field>
          <Field label="Placa anterior (si corresponde)"><Input value={f.placa} onChange={e => up({ placa: e.target.value })} maxLength={12} /></Field>
          {f.tipo === "ext" && <Field label="Departamento de procedencia"><Input value={f.dep} onChange={e => up({ dep: e.target.value })} maxLength={80} placeholder="Ej.: Blaine County Sheriff" /></Field>}
          <Field label="Comisaría de procedencia (si corresponde)"><Input value={f.com} onChange={e => up({ com: e.target.value })} maxLength={80} /></Field>
          <Field label="Rango actual"><Input value={f.rango} onChange={e => up({ rango: e.target.value })} maxLength={60} placeholder={f.tipo === "lspd" ? "Ej.: Police Officer III" : f.tipo === "sahp" ? "Ej.: Officer" : ""} /></Field>
          <Field label="Ingreso al departamento anterior"><Input type="date" value={f.ing} onChange={e => up({ ing: e.target.value })} /></Field>
          <Field label="Usuario de Discord"><Input value={f.du} onChange={e => up({ du: e.target.value })} maxLength={40} /></Field>
          <Field label="ID de Discord"><Input value={f.di} onChange={e => up({ di: e.target.value })} inputMode="numeric" placeholder="17 a 20 números" /></Field>
          <Field label="Fecha de solicitud"><Input type="date" value={f.fsol} onChange={e => up({ fsol: e.target.value })} /></Field>
          <Field label="Entrevistador responsable"><Input value={f.entv} onChange={e => up({ entv: e.target.value })} maxLength={60} /></Field>
        </div>
        <Field label="Motivo del traslado"><Textarea rows={2} value={f.mot} onChange={e => up({ mot: e.target.value })} maxLength={1500} /></Field>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]"><Field label="Documento (nombre)"><Input value={f.dn} onChange={e => up({ dn: e.target.value })} placeholder="Formulario OOC" /></Field>
          <Field label="Documento o formulario OOC (link)"><Input value={f.du2} onChange={e => up({ du2: e.target.value })} placeholder="https://…" /></Field></div>
        {s0?.docs.length ? <p className="text-xs text-slate-500">Ya adjuntos: {s0.docs.map(d => d.n).join(", ")}</p> : null}
        <Field label="Observaciones"><Textarea rows={2} value={f.obs} onChange={e => up({ obs: e.target.value })} maxLength={2000} /></Field>
      </div>
    </Modal>);
}

/* ---------- expediente de traslado ---------- */
type DT = "dat" | "ent" | "eva" | "vot" | "acl" | "reg";
function Detalle({ s, onBack }: { s: Sol; onBack: () => void }) {
  const ver = useStoreVersion(), me = useMe(), { toast, confirm } = useFeedback();
  const [t, setT] = useState<DT>(() => (["prev", "enrev"].includes(s.est) ? "vot" : ["borr", "entp", "entc"].includes(s.est) ? "ent" : "dat")), [edit, setEdit] = useState(false), [inc, setInc] = useState(false);
  const all = useMemo(() => solList(), [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const log = (x: string) => ({ t: Date.now(), by: me.n, x });
  const enviar = async () => {
    if (!s.ent.fin) { toast("Primero finalizá la entrevista", "err"); return; }
    if (!(await confirm("¿Enviar a revisión? Se guarda una copia de las preguntas y respuestas originales y se abre la votación de Capitanía y Jefatura.", { ok: "Enviar a revisión" }))) return;
    put({ ...s, est: "prev", orig: { q: s.ent.q, r: s.ent.r, t: Date.now(), by: me.n }, upd: Date.now(), ub: me.n, log: [...s.log, log("Envió la entrevista a revisión")] }); toast("Enviada a revisión"); setT("vot");
  };
  const tabs: [DT, string, typeof FileText][] = [["dat", "Datos", FileText], ["ent", "Entrevista de traslado", ClipboardList], ["eva", "Evaluación del candidato", ShieldCheck], ["vot", "Votación", Vote], ["acl", `Aclaraciones (${s.adic.length})`, MessageSquarePlus], ["reg", "Registro", History]];
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={onBack}>Traslados</Button>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold">{s.n}</h2><Chip e={s.est} />{s.ronda > 1 && <span className="text-xs text-slate-500">Ronda {s.ronda}</span>}</div>
          <p className="text-xs text-slate-500">{TIPOS[s.tipo].l}{s.tipo === "ext" ? ` · ${s.dep}` : ""}{s.com ? ` · ${s.com}` : ""}{s.rango ? ` · ${s.rango}` : ""} · solicitud {isoToDMY(s.fsol)} · abrió {s.by}</p></div>
        {["borr", "entp", "entc", "prev", "enrev"].includes(s.est) && <Button variant="outline" size="sm" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>Datos</Button>}
        {s.ent.fin && ["entp", "entc", "borr"].includes(s.est) && <Button icon={<Send className="size-4" />} onClick={() => void enviar()}>Enviar a revisión</Button>}
        {s.est === "apr" && <Button icon={<UserPlus className="size-4" />} onClick={() => setInc(true)}>Incorporar agente a la LSSD</Button>}
      </Card>
      <div className="scrollbar-none flex gap-1 overflow-x-auto">{tabs.map(([k, l, I]) => (
        <button key={k} onClick={() => setT(k)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition", t === k ? "bg-brand-500/15 text-brand-700 ring-1 ring-inset ring-brand-500/40 dark:text-brand-200" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}><I className="size-4" />{l}</button>))}</div>
      {t === "dat" ? <Datos s={s} /> : t === "ent" ? <Entrevista s={s} /> : t === "eva" ? <Evaluacion s={s} /> : t === "vot" ? <Votacion s={s} /> : t === "acl" ? <Aclaraciones s={s} /> : <Registro s={s} />}
      {edit && <SolForm s0={s} all={all} onClose={() => setEdit(false)} onDone={() => setEdit(false)} />}
      {inc && <Incorporar s={s} onClose={() => setInc(false)} />}
    </div>);
}

function Datos({ s }: { s: Sol }) {
  const R: [string, string | undefined][] = [["Tipo de traslado", TIPOS[s.tipo].l], ["Departamento de procedencia", s.dep], ["Comisaría", s.com], ["Placa anterior", s.placa], ["Rango actual", s.rango], ["Ingreso al departamento anterior", isoToDMY(s.ing)],
    ["Discord", [s.du, s.di && `ID ${s.di}`].filter(Boolean).join(" · ")], ["Fecha de solicitud", isoToDMY(s.fsol)], ["Entrevistador responsable", s.entv], ["Motivo", s.mot], ["Observaciones", s.obs]];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-0"><dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">{R.map(([k, v]) => <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[14rem_1fr]"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-wrap font-medium">{v || "—"}</dd></div>)}</dl></Card>
      <div className="space-y-4">
        <Card className="space-y-2 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documentación</p>
          {!s.docs.length ? <p className="text-sm text-slate-500">Sin documentos.</p> : s.docs.map((d, i) => <a key={i} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-600 hover:underline dark:text-brand-300"><Link2 className="size-4" />{d.n}<span className="ml-auto text-[11px] text-slate-400">{d.by}</span></a>)}</Card>
        {s.cierres.length > 0 && <Card className="space-y-2 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resultados</p>{s.cierres.map((c, i) => <p key={i} className="text-sm"><b>Ronda {c.ronda}:</b> {RES[c.res]} ({c.si} a favor, {c.no} en contra, {c.rev} revisión) · cerró {c.by}, {fullDT(c.t)}</p>)}
          {s.rech && <p className="text-sm text-red-600 dark:text-red-400"><b>Motivo del rechazo:</b> {s.rech.mot}</p>}</Card>}
        {s.inc && <Card className="space-y-1 p-4 text-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Incorporación</p>
          <p><b>{s.inc.r}</b> · placa <b>#{s.inc.p}</b> · desde {isoToDMY(s.inc.f)} · {s.inc.e}</p>{s.inc.fto && <p>FTO lateral: {s.inc.fto}</p>}{s.inc.o && <p className="text-slate-500">{s.inc.o}</p>}<p className="text-xs text-slate-400">Por {s.inc.by}, {fullDT(s.inc.t)}</p></Card>}
      </div>
    </div>);
}

function Entrevista({ s }: { s: Sol }) {
  const me = useMe(), { toast } = useFeedback(), lock = !!s.orig || !["borr", "entp", "entc"].includes(s.est);
  const [r, setR] = useState<string[]>(() => s.ent.q.map((_, i) => s.ent.r[i] || "")), [qq, setQ] = useState<string[]>(s.ent.q), [eq, setEq] = useState(false);
  const save = (fin?: boolean) => {
    const now = Date.now(), filled = r.filter(x => x.trim()).length;
    if (fin && filled < qq.length && !window.confirm(`Hay ${qq.length - filled} preguntas sin responder. ¿Finalizar igual?`)) return;
    put({ ...s, est: s.est === "borr" ? "borr" : "entc", ent: { q: qq, r, by: s.ent.by || me.n, t: now, fin: fin ? now : s.ent.fin }, upd: now, ub: me.n,
      log: [...s.log, { t: now, by: me.n, x: fin ? "Finalizó la entrevista" : s.est === "entp" ? "Empezó la entrevista" : "Guardó el progreso de la entrevista" }] });
    toast(fin ? "Entrevista finalizada: ya se puede enviar a revisión" : "Progreso guardado"); setEq(false);
  };
  const Q = s.orig ? s.orig.q : qq, A = s.orig ? s.orig.r : r;
  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3 p-3 text-xs text-slate-500">
        <span className="flex-1">{s.orig ? `Copia original guardada al enviar a revisión (${fullDT(s.orig.t)}, ${s.orig.by}). Lo que se sume después va en Aclaraciones.` : `Entrevistador: ${s.ent.by || s.entv || "—"}${s.ent.t ? ` · ${fullDT(s.ent.t)}` : ""}${s.ent.fin ? " · finalizada" : ""}`}</span>
        {!lock && <><Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} onClick={() => setEq(!eq)}>{eq ? "Listo" : "Editar preguntas"}</Button>
          <Button variant="outline" size="sm" icon={<Save className="size-4" />} onClick={() => save()}>Guardar progreso</Button>
          <Button size="sm" icon={<CheckCircle2 className="size-4" />} onClick={() => save(true)}>Finalizar entrevista</Button></>}
      </Card>
      {Q.map((q, i) => { const [h, ...b] = q.split("\n"); return (
        <Card key={i} className="space-y-2 p-4">
          {eq && !lock ? <Textarea rows={3} value={qq[i]} onChange={e => setQ(qq.map((x, j) => (j === i ? e.target.value : x)))} />
            : <><p className="text-[13px] font-bold"><span className="mr-1.5 font-mono text-brand-600 dark:text-brand-300">{i + 1}.</span>{h}</p>{b.length > 0 && <p className="text-[13px] text-slate-600 dark:text-slate-300">{b.join("\n")}</p>}</>}
          {lock ? <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">{A[i]?.trim() || <span className="text-slate-400">Sin respuesta</span>}</p>
            : <Textarea rows={3} value={r[i] || ""} onChange={e => setR(r.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Respuesta del candidato…" />}
        </Card>); })}
    </div>);
}

function Evaluacion({ s }: { s: Sol }) {
  const ver = useStoreVersion(), me = useMe(), { toast } = useFeedback();
  const E = useMemo(() => evals(s.id), [ver, s.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = E.find(e => slug(e.n) === slug(me.n)), [f, setF] = useState<Eval>(() => mine || { n: me.n, c: {}, g: "", t: 0 });
  const lock = ["rech", "inc"].includes(s.est), ag = s.tipo === "ext" ? s.dep || "su agencia anterior" : TIPOS[s.tipo].dep;
  const save = () => { LS.setJSON(eKey(s.id, me.n), { ...f, n: me.n, t: Date.now() }); toast("Evaluación guardada"); };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="space-y-3 p-4">
        <p className="font-semibold">Tu evaluación</p><p className="text-xs text-slate-500">Orientativa: no aprueba ni rechaza. La decisión es la votación por mayoría simple.</p>
        {CRIT.map(c => { const x = f.c[c.k] || {}; return (
          <div key={c.k} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-[13px] font-bold">{c.l}</p>
            <p className="text-[12px] text-emerald-700 dark:text-emerald-400">✓ {c.pos.replace("su antigua agencia", ag)}</p><p className="text-[12px] text-red-600 dark:text-red-400">⚑ {c.red}</p>
            <div className="flex flex-wrap gap-1.5">{(Object.keys(CRITV) as CritV[]).map(v => (
              <button key={v} disabled={lock} onClick={() => setF({ ...f, c: { ...f.c, [c.k]: { ...x, v } } })} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold transition", x.v === v ? "" : "border-slate-200 text-slate-500 dark:border-slate-700")}
                style={x.v === v ? { borderColor: CRITV[v].c, background: CRITV[v].c + "22", color: CRITV[v].c } : undefined}>{CRITV[v].l}</button>))}</div>
            <Input disabled={lock} value={x.o || ""} onChange={e => setF({ ...f, c: { ...f.c, [c.k]: { ...x, o: e.target.value } } })} placeholder="Observación (por qué)" maxLength={600} />
          </div>); })}
        <Field label="Observaciones generales"><Textarea disabled={lock} rows={2} value={f.g || ""} onChange={e => setF({ ...f, g: e.target.value })} maxLength={2000} /></Field>
        {!lock && <Button icon={<Save className="size-4" />} onClick={save}>Guardar evaluación</Button>}
      </Card>
      <Card className="space-y-3 p-4">
        <p className="font-semibold">Resumen de los cuatro criterios</p>
        {!E.length ? <p className="text-sm text-slate-500">Nadie evaluó todavía.</p> : <>
          <div className="grid grid-cols-2 gap-2">{CRIT.map(c => (<div key={c.k} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p className="text-[12px] font-semibold">{c.l}</p>
            <p className="mt-1 flex gap-2 text-xs">{(Object.keys(CRITV) as CritV[]).map(v => <span key={v} style={{ color: CRITV[v].c }}><b>{E.filter(e => e.c[c.k]?.v === v).length}</b> {CRITV[v].l.toLowerCase()}</span>)}</p></div>))}</div>
          {E.map(e => <div key={e.n} className="rounded-xl border border-slate-200 p-3 text-[12.5px] dark:border-slate-800"><p className="mb-1 font-semibold">{e.n} <span className="font-normal text-slate-400">· {fullDT(e.t)}</span></p>
            {CRIT.map(c => { const x = e.c[c.k]; return x?.v ? <p key={c.k}><span className="text-slate-500">{c.l}:</span> <b style={{ color: CRITV[x.v].c }}>{CRITV[x.v].l}</b>{x.o ? ` — ${x.o}` : ""}</p> : null; })}
            {e.g && <p className="mt-1 text-slate-500">{e.g}</p>}</div>)}</>}
      </Card>
    </div>);
}

function Votacion({ s }: { s: Sol }) {
  const ver = useStoreVersion(), me = useMe(), { toast, confirm } = useFeedback();
  const V = useMemo(() => votos(s.id, s.ronda), [ver, s.id, s.ronda]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (s.est === "prev" || s.est === "enrev") && !s.cierres.some(c => c.ronda === s.ronda && (c.res === "apr" || c.res === "rech"));
  const mine = V.find(v => slug(v.n) === slug(me.n)), [o, setO] = useState<Opt | "">(mine?.o || ""), [j, setJ] = useState(mine?.j || "");
  const M = mayoria(V), pend = revPend(V), R = revisores(), faltan = R.filter(n => !V.some(v => slug(v.n) === slug(n)));
  const lastC = s.cierres.filter(c => c.ronda === s.ronda).slice(-1)[0];
  const votar = () => {
    if (!o) return; if (o === "rev" && !j.trim()) { toast("Indicá el motivo de la revisión", "err"); return; }
    const now = Date.now(), v: Voto = { n: me.n, o, j: j.trim() || undefined, t: now, h: [...(mine?.h || []), ...(mine ? [{ o: mine.o, j: mine.j, t: mine.t }] : [])] };
    LS.setJSON(vKey(s.id, s.ronda, me.n), v);
    put({ ...s, est: "enrev", upd: now, ub: me.n, log: [...s.log, { t: now, by: me.n, x: `${mine ? "Cambió su voto a" : "Votó"} «${OPTS[o].l}» (ronda ${s.ronda})` }] });
    toast(mine ? "Voto actualizado" : "Voto registrado");
  };
  const resolver = (v: Voto) => { const now = Date.now(); LS.setJSON(vKey(s.id, s.ronda, v.n), { ...v, ok: { by: me.n, t: now } });
    put({ ...s, upd: now, ub: me.n, log: [...s.log, { t: now, by: me.n, x: `Dio por resuelta la revisión pedida por ${v.n}` }] }); toast("Revisión resuelta: se puede seguir votando y cerrar"); };
  const cerrar = async () => {
    if (pend.length) { toast("Hay revisiones pedidas sin resolver", "err"); return; }
    if (!(await confirm(`¿Cerrar la votación? Resultado provisional: ${RES[M.res]} (${M.si} a favor, ${M.no} en contra, ${M.rev} revisión). Los votos de esta ronda quedan bloqueados.`, { ok: "Cerrar votación" }))) return;
    let mot = ""; if (M.res === "rech") { mot = window.prompt("Motivo del rechazo (queda en el expediente):")?.trim() || ""; if (!mot) { toast("Hace falta el motivo del rechazo", "err"); return; } }
    const now = Date.now(), c = { ronda: s.ronda, t: now, by: me.n, res: M.res, si: M.si, no: M.no, rev: M.rev };
    put({ ...s, est: M.res === "apr" ? "apr" : M.res === "rech" ? "rech" : "enrev", cierres: [...s.cierres, c], ...(M.res === "rech" ? { rech: { mot, t: now, by: me.n } } : {}), upd: now, ub: me.n,
      log: [...s.log, { t: now, by: me.n, x: `Cerró la votación (ronda ${s.ronda}): ${RES[M.res]}` }] });
    toast(RES[M.res]);
  };
  const nuevaRonda = async () => { if (!(await confirm(`¿Abrir la ronda ${s.ronda + 1}? Los votos anteriores quedan en el historial.`, { ok: "Nueva ronda" }))) return;
    const now = Date.now(); put({ ...s, ronda: s.ronda + 1, est: "enrev", upd: now, ub: me.n, log: [...s.log, { t: now, by: me.n, x: `Abrió la ronda ${s.ronda + 1}` }] }); setO(""); setJ(""); };
  if (["borr", "entp", "entc"].includes(s.est)) return <Card><Empty icon={<Vote />} title="La votación se abre al enviar la entrevista a revisión" /></Card>;
  const prevR = Array.from({ length: s.ronda - 1 }, (_, i) => i + 1);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">{([["A favor", M.si, "#22c55e"], ["En contra", M.no, "#ef4444"], ["Revisión", M.rev, "#f59e0b"], ["Participaron", `${V.length}/${Math.max(R.length, V.length)}`, "#64748b"]] as const).map(([l, n, c]) => (
        <Card key={l} className="p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</p><p className="mt-1 text-2xl font-black tabular-nums" style={{ color: c }}>{n}</p></Card>))}</div>
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Gavel className="size-5 text-brand-500" /><div className="min-w-0 flex-1"><p className="font-semibold">{open ? `Resultado provisional: ${RES[M.res]}` : lastC ? `Resultado: ${RES[lastC.res]}` : "Votación cerrada"}</p>
          <p className="text-xs text-slate-500">Mayoría simple de los votos válidos: gana a favor o en contra; las revisiones no cuentan. Empate o sin votos: queda pendiente. Ronda {s.ronda}{lastC ? ` · cerró ${lastC.by}, ${fullDT(lastC.t)}` : ""}.</p></div>
        {open && <Button icon={<Gavel className="size-4" />} onClick={() => void cerrar()} disabled={pend.length > 0} title={pend.length ? "Hay revisiones sin resolver" : undefined}>Cerrar votación</Button>}
        {open && lastC && (lastC.res === "emp" || lastC.res === "sin") && <Button variant="outline" onClick={() => void nuevaRonda()}>Nueva ronda</Button>}
      </Card>
      {pend.length > 0 && <Card className="space-y-2 border-amber-500/40 bg-amber-500/[.06] p-4"><p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Revisiones pedidas sin resolver: no se puede cerrar</p>
        {pend.map(v => <div key={v.n} className="flex flex-wrap items-center gap-2 text-sm"><b>{v.n}:</b><span className="flex-1">{v.j}</span>{open && <Button size="sm" variant="outline" onClick={() => resolver(v)}>Marcar resuelta</Button>}</div>)}
        <p className="text-xs text-slate-500">Sumá la información o las preguntas complementarias en Aclaraciones y después marcala como resuelta.</p></Card>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="space-y-3 p-4">
          <p className="font-semibold">{mine ? "Tu voto" : "Votar"}</p>
          {!open ? <p className="text-sm text-slate-500">{mine ? `Votaste «${OPTS[mine.o].l}». ` : ""}La votación de esta ronda está cerrada.</p> : <>
            <div className="grid gap-2 sm:grid-cols-3">{(Object.keys(OPTS) as Opt[]).map(k => (
              <button key={k} onClick={() => setO(k)} className={cn("rounded-xl border-2 p-2.5 text-left transition", o === k ? "" : "border-slate-200 dark:border-slate-800")} style={o === k ? { borderColor: OPTS[k].c, background: OPTS[k].c + "16" } : undefined}>
                <p className="text-[13px] font-bold" style={o === k ? { color: OPTS[k].c } : undefined}>{OPTS[k].l}</p><p className="text-[11px] text-slate-500">{OPTS[k].d}</p></button>))}</div>
            <Textarea rows={2} value={j} onChange={e => setJ(e.target.value)} maxLength={1500} placeholder={o === "rev" ? "Motivo de la revisión (obligatorio)" : "Justificación u observación (opcional)"} />
            <Button icon={<Vote className="size-4" />} onClick={votar} disabled={!o || (mine?.o === o && (mine.j || "") === j.trim())}>{mine ? "Cambiar voto" : "Votar"}</Button>
            {mine && <p className="text-xs text-slate-500">Podés cambiarlo mientras la votación esté abierta; los cambios quedan en el historial.</p>}</>}
        </Card>
        <Card className="space-y-2 p-4">
          <p className="font-semibold">Revisores</p>
          {V.map(v => <div key={v.n} className="rounded-xl border border-slate-200 p-2.5 text-[12.5px] dark:border-slate-800">
            <p className="flex flex-wrap items-center gap-2"><b>{v.n}</b><span className="rounded px-1.5 text-[11px] font-bold" style={{ background: OPTS[v.o].c + "22", color: OPTS[v.o].c }}>{OPTS[v.o].l}</span>{v.ok && <span className="text-[11px] text-emerald-600">resuelta por {v.ok.by}</span>}<span className="ml-auto text-[11px] text-slate-400">{fullDT(v.t)}</span></p>
            {v.j && <p className="mt-1 text-slate-600 dark:text-slate-300">{v.j}</p>}
            {v.h.length > 0 && <p className="mt-1 text-[11px] text-slate-400">Antes: {v.h.map(x => `${OPTS[x.o].l} (${fullDT(x.t)})`).join(" → ")}</p>}</div>)}
          {faltan.length > 0 && <p className="text-xs text-slate-500"><b>Sin votar:</b> {faltan.join(", ")}</p>}
          {prevR.length > 0 && <details className="text-xs text-slate-500"><summary className="cursor-pointer">Rondas anteriores</summary>{prevR.map(r => { const P = votos(s.id, r); return <p key={r} className="mt-1"><b>Ronda {r}:</b> {P.map(v => `${v.n} (${OPTS[v.o].l})`).join(", ") || "sin votos"}</p>; })}</details>}
        </Card>
      </div>
    </div>);
}

function Aclaraciones({ s }: { s: Sol }) {
  const me = useMe(), { toast } = useFeedback(), [k, setK] = useState<"info" | "preg" | "resp" | "doc">("info"), [x, setX] = useState(""), [url, setUrl] = useState("");
  const L: Record<string, string> = { info: "Información adicional", preg: "Pregunta complementaria", resp: "Respuesta del candidato", doc: "Documento" };
  const lock = ["rech", "inc"].includes(s.est);
  const add = () => { if (!x.trim()) return; if (k === "doc" && !/^https?:\/\//.test(url.trim())) { toast("Pegá el link del documento", "err"); return; }
    const now = Date.now(), a = { id: uid(), t: now, by: me.n, k, x: x.trim(), ...(k === "doc" ? { url: url.trim() } : {}) };
    put({ ...s, adic: [...s.adic, a], ...(k === "doc" ? { docs: [...s.docs, { n: x.trim(), url: url.trim(), t: now, by: me.n }] } : {}), upd: now, ub: me.n, log: [...s.log, { t: now, by: me.n, x: `Sumó: ${L[k].toLowerCase()}` }] });
    setX(""); setUrl(""); toast("Agregado: los revisores lo ven en sus avisos"); };
  return (
    <div className="space-y-3">
      {!lock && <Card className="space-y-2 p-4"><div className="flex flex-wrap gap-1.5">{Object.entries(L).map(([kk, l]) => <button key={kk} onClick={() => setK(kk as typeof k)} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", k === kk ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{l}</button>)}</div>
        <Textarea rows={3} value={x} onChange={e => setX(e.target.value)} maxLength={3000} placeholder={k === "doc" ? "Nombre del documento" : "Escribilo acá: no pisa la entrevista original"} />
        {k === "doc" && <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />}
        <Button icon={<Plus className="size-4" />} onClick={add} disabled={!x.trim()}>Agregar</Button></Card>}
      {!s.adic.length ? <Card><Empty icon={<MessageSquarePlus />} title="Sin aclaraciones" /></Card> : s.adic.slice().reverse().map(a => (
        <Card key={a.id} className="p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">{L[a.k]} <span className="font-normal normal-case tracking-normal text-slate-400">· {a.by} · {fullDT(a.t)}</span></p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{a.x}</p>{a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">{a.url}</a>}</Card>))}
    </div>);
}

const Registro = ({ s }: { s: Sol }) => (
  <Card className="divide-y divide-slate-100 dark:divide-slate-800">{s.log.slice().reverse().map((l, i) => <div key={i} className="flex gap-3 px-4 py-2 text-sm"><span className="w-36 shrink-0 text-xs text-slate-400">{fullDT(l.t)}</span><b className="shrink-0">{l.by}</b><span className="text-slate-600 dark:text-slate-300">{l.x}</span></div>)}</Card>);

/* ---------- incorporación a la plantilla (alta en lspdt.lssd.agx con add) ---------- */
function Incorporar({ s, onClose }: { s: Sol; onClose: () => void }) {
  const me = useMe(), { toast, confirm } = useFeedback(), R = RANKS_X.lssd;
  const [f, setF] = useState({ r: "Deputy Sheriff", p: "", fch: hoy(), e: "Activo", fto: "", o: "" }), up = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const go = async () => {
    if (s.est !== "apr") { toast("El traslado no está aprobado", "err"); return; }
    if (!R.includes(f.r)) { toast("Rango inválido", "err"); return; }
    const p = f.p.trim().replace(/^#/, ""); if (!/^\d{1,5}$/.test(p)) { toast("La placa son números", "err"); return; }
    const L = getRoster() as { n: string; p?: string; e?: string }[];
    if (L.some(a => slug(a.n) === slug(s.n))) { toast(`${s.n} ya está en la plantilla de la LSSD`, "err"); return; }
    const occ = L.find(a => String(a.p) === p && !/retir|baja|inactiv/i.test(a.e || "")); if (occ) { toast(`La placa #${p} la tiene ${occ.n}`, "err"); return; }
    if (!(await confirm(`¿Incorporar a ${s.n} como ${f.r}, placa #${p}, desde el ${isoToDMY(f.fch)}?`, { ok: "Incorporar" }))) return;
    const now = Date.now(), O = { ...(LS.ro<Record<string, AgxE>>(AGX_KEY, {}) || {}) };
    O[s.n] = { add: { n: s.n, r: f.r, p, e: f.e, i: isoToDMY(f.fch), u: s.du || "", d: s.du || "", di: s.di || "", o: f.o.trim() || undefined, src: s.tipo === "ext" ? s.dep : TIPOS[s.tipo].dep, tr: s.id },
      log: [{ t: now, por: me.n, pr: me.r, c: [`Alta por traslado desde ${s.tipo === "ext" ? s.dep : TIPOS[s.tipo].dep}: ${f.r}, placa #${p}`] }] };
    LS.setJSON(AGX_KEY, O);
    /* expediente personal: una entrada de servicio sin nada confidencial (las valoraciones quedan en el expediente de traslado) */
    const kx = `lspdt.exp.${slug(s.n)}`, ex = LS.ro<{ e: unknown[] }>(kx, { e: [] });
    LS.setJSON(kx, { e: [{ id: uid(), t: now, f: f.fch, by: me.n, tipo: "serv", tit: "Ingreso por traslado", txt: `Se incorpora a la LSSD desde ${s.tipo === "ext" ? s.dep : TIPOS[s.tipo].dep} como ${f.r}, placa #${p}.${f.fto.trim() ? ` Período de adaptación / FTO lateral: ${f.fto.trim()}.` : ""}` }, ...(Array.isArray(ex.e) ? ex.e : [])] });
    put({ ...s, est: "inc", inc: { r: f.r, p, f: f.fch, e: f.e, fto: f.fto.trim() || undefined, o: f.o.trim() || undefined, t: now, by: me.n }, upd: now, ub: me.n, log: [...s.log, { t: now, by: me.n, x: `Incorporó al agente: ${f.r}, placa #${p}` }] });
    toast(`${s.n} ya está en la plantilla de la LSSD`); onClose();
  };
  return (
    <Modal open onClose={onClose} size="md" icon={<UserPlus />} title="Incorporar agente a la LSSD" desc={`${s.n} · ${TIPOS[s.tipo].l}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<UserPlus className="size-4" />} onClick={() => void go()}>Incorporar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rango en la LSSD"><Select value={f.r} onChange={e => up({ r: e.target.value })}>{R.map(r => <option key={r}>{r}</option>)}</Select></Field>
        <Field label="Nueva placa"><Input value={f.p} onChange={e => up({ p: e.target.value })} inputMode="numeric" placeholder="Ej.: 415" /></Field>
        <Field label="Fecha de incorporación"><Input type="date" value={f.fch} onChange={e => up({ fch: e.target.value })} /></Field>
        <Field label="Estado"><Select value={f.e} onChange={e => up({ e: e.target.value })}>{ESTADOS_X.map(x => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Período de adaptación / FTO lateral" className="sm:col-span-2"><Input value={f.fto} onChange={e => up({ fto: e.target.value })} placeholder="Ej.: 2 semanas con FTO" /></Field>
        <Field label="Observaciones administrativas" className="sm:col-span-2"><Textarea rows={2} value={f.o} onChange={e => up({ o: e.target.value })} maxLength={1000} /></Field>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><XCircle className="size-3.5" />No se puede deshacer desde acá: después se edita como cualquier agente.</p>
    </Modal>);
}
