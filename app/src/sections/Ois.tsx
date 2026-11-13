/* Procedimiento del Sargento con el oficial implicado en un OIS con fallecido (Supervisión · Sargento II Evelyn Molina).
   Se completa paso a paso, se ve en formato web y se exporta en PDF con el formato de los documentos oficiales (sello LSPD).
   Se guarda en lspdt.ois. */
import { useEffect, useState } from "react";
import { AlertTriangle, Ambulance, Check, ClipboardCheck, Plus, Crosshair, FileDown, FilePlus2, FileText, FlaskConical, HeartPulse, MapPinOff, MessageSquareWarning, Pencil, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { Button, Card, Checkbox, Empty, Field, Input, Segmented, Textarea } from "@/components/ui";
import { AgentCombo } from "@/components/agents";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { dmy, escHtml, findAgent, hoyISO, rankES, uid } from "@/lib/domain";
import { syncNow, useJSON } from "@/lib/store";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const PSS = ["¿Has disparado? ¿Cuántas veces y en qué dirección?", "¿Hay alguien más herido? ¿Dónde?", "¿Hay sospechosos huidos? Descripción, dirección y armamento.",
  "¿Hay pruebas o armas que haya que proteger? ¿Dónde están?", "¿Hay testigos? ¿Dónde están?", "¿Sabes si ha disparado alguien más?"];
const EMO = ["Tranquilo", "Nervioso", "En shock", "Alterado", "Desorientado"];
const ARMA_EST = ["Funciona correctamente", "Con daños", "Se encasquilló"];
const TEST = ["Negativo", "Positivo", "Pendiente de resultado"];
const PSB_AV = ["Este uso de la fuerza se remitirá a la Force Investigation Division (FID) del Professional Standards Bureau.", "El caso se revisará internamente.", "Si necesitan algo de él, la FID se pondrá en contacto directamente."];
const OIS_AUTOR = "Sargento II Evelyn Molina";

type Ois = {
  id: string; no: string; t: number; by: string; fecha: string; hora: string; lugar: string; sgt: string; of: string;
  her: "" | "si" | "no"; ems: boolean; emo: string; emoN: string;
  pss: string[]; ret: boolean; zona: string;
  mod: string; ser: string; est: string; estN: string; car: string; rest: string; disp: string; dot: string; camb: "" | "si" | "no"; otra: string;
  alc: string; drog: string; testN: string; psb: boolean[]; notas: string; hist?: { t: number; by: string; a: string }[]; armas?: Gun[];
};
/* armas revisadas en el paso 4 (puede haber más de una si disparó con varias) */
type Gun = { id: string; mod: string; ser: string; est: string; estN: string; cap: number; mags: string[]; disp: string; camb: "" | "si" | "no" };
/* modelos con su capacidad de cargador (como en el servidor): elegir uno completa el resto */
const MODELOS: [string, number][] = [["Combat Pistol", 12], ["Pistol MK2", 12], ["Heavy Pistol", 18], ["Pistol", 12], ["SMG", 30], ["Carbine Rifle", 30], ["Carbine Rifle MK2", 30], ["Pump Shotgun", 8], ["Heavy Sniper", 6], ["Heavy Sniper MK2", 6]];
const capOf = (m: string) => MODELOS.find(([n]) => n.toLowerCase() === m.trim().toLowerCase())?.[1] || 0;
const newGun = (): Gun => ({ id: uid(), mod: "", ser: "", est: "", estN: "", cap: 0, mags: ["", "", ""], disp: "", camb: "" });
/* expedientes viejos (un arma con texto libre) → formato nuevo */
const gunsOf = (x: Ois): Gun[] => x.armas?.length ? x.armas : [{ id: "g0", mod: x.mod, ser: x.ser, est: x.est, estN: x.estN, cap: capOf(x.mod), mags: (x.rest.match(/\d+/g) || []).length ? x.rest.match(/\d+/g)! : Array.from({ length: +x.car || 3 }, () => ""), disp: x.disp, camb: x.camb }];
/* cuentas: dotación = cargadores × capacidad; disparadas = dotación − lo que queda */
const gCalc = (g: Gun) => { const left = g.mags.reduce((a, m) => a + (+m || 0), 0), dot = g.cap ? g.cap * g.mags.length : 0, filled = g.mags.every(m => m !== "");
  return { left, dot, est: dot && filled ? Math.max(0, dot - left) : null }; };
/* número de expediente: el siguiente libre del año (nunca se repite aunque se borren registros) */
const yy = () => String(new Date().getFullYear()).slice(2);
const nextNo = (L: Ois[]) => { const p = `OIS-${yy()}-`, max = Math.max(0, ...L.filter(r => r.no?.startsWith(p)).map(r => +r.no.slice(p.length) || 0)); return p + String(max + 1).padStart(4, "0"); };
const blank = (me: string, L: Ois[]): Ois => { const d = new Date(); return { id: "", no: nextNo(L), t: 0, by: me,
  fecha: hoyISO(), hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, lugar: "", sgt: me, of: "", her: "", ems: false, emo: "", emoN: "",
  pss: PSS.map(() => ""), ret: false, zona: "", mod: "", ser: "", est: "", estN: "", car: "", rest: "", disp: "", dot: "", camb: "", otra: "", alc: "", drog: "", testN: "", psb: PSB_AV.map(() => false), notas: "", armas: [newGun()] }; };

const who = (n: string) => { const a = findAgent(n); return a ? `${rankES(a.r)} ${n}` : n || "—"; };
const placa = (n: string) => findAgent(n)?.p || "";
/* balas: lo que queda en los cargadores y lo que falta según la dotación */
/* lo que falta en cada paso (vacío = paso completo) */
const STEP_T = ["Estado del oficial", "Declaración de Seguridad Pública (PSS)", "Retirada de la escena", "Revisión del arma", "Test de alcohol y drogas", "Remisión a la FID"];
const faltas = (x: Ois): string[][] => [
  [x.her === "" && "Si está herido", x.her === "si" && !x.ems && "EMS solicitado (está herido)", !x.emo && !x.emoN.trim() && "Estado emocional"].filter(Boolean) as string[],
  x.pss.map((p, i) => (!p.trim() ? `Respuesta a la pregunta ${i + 1}` : "")).filter(Boolean),
  [!x.ret && "Confirmar que se lo retiró de la escena"].filter(Boolean) as string[],
  gunsOf(x).flatMap((g, i, L) => { const p = L.length > 1 ? `Arma ${i + 1} · ` : "", c = gCalc(g);
    return [!g.mod && "Modelo", !g.ser && "N° de serie", !g.est && "Estado del arma", !g.mags.length && "Cargadores", g.mags.some(m => m === "") && "Balas que quedan en cada cargador",
      !g.disp && c.est === null && "Balas disparadas", g.camb === "" && "Si cambió de cargador"].filter(Boolean).map(t => p + t); }),
  [!x.alc && "Resultado de alcohol", !x.drog && "Resultado de drogas"].filter(Boolean) as string[],
  PSB_AV.map((p, i) => (!x.psb[i] ? p : "")).filter(Boolean),
];
const steps = (x: Ois) => faltas(x).map(f => !f.length);
const base = (x: Ois) => [!x.of && "Oficial implicado", !x.sgt && "Sargento a cargo", !x.lugar.trim() && "Lugar"].filter(Boolean) as string[];

export function OisPanel() {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [L, setL] = useJSON<Ois[]>("lspdt.ois", []);
  const [tab, setTab] = useState<"new" | "list">("new"), [x, setX] = useState<Ois>(() => blank(me.n, L)), [open, setOpen] = useState(""), [miss, setMiss] = useState(false), [rev, setRev] = useState<Ois | null>(null), [web, setWeb] = useState<Ois | null>(null);
  const up = (p: Partial<Ois>) => setX({ ...x, ...p }), ok = steps(x), done = ok.filter(Boolean).length;
  const guns = gunsOf(x), setGuns = (L: Gun[]) => up({ armas: L });
  /* expedientes con el mismo número (de antes del arreglo): el más nuevo pasa al siguiente libre */
  useEffect(() => {
    const seen = new Set<string>(), fix: Ois[] = [], out = L.slice().sort((a, b) => a.t - b.t);
    for (const r of out) { if (seen.has(r.no)) { const n = nextNo([...out, ...fix]); fix.push({ ...r, no: n, hist: [...(r.hist || []), { t: Date.now(), by: "sistema", a: `Número duplicado (${r.no}) corregido a ${n}` }] }); seen.add(n); } else seen.add(r.no); }
    if (fix.length) { setL(out.map(r => fix.find(f => f.id === r.id) || r)); toast(`Numeración corregida: ${fix.map(f => f.no).join(", ")}`); }
  }, [L.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const doSave = () => {
    const prev = L.find(i => i.id === x.id), k = steps(x).filter(Boolean).length;
    const r: Ois = { ...x, id: x.id || uid(), t: x.t || Date.now(), no: prev ? x.no : L.some(i => i.no === x.no) ? nextNo(L) : x.no,
      hist: [...(x.hist || []), { t: Date.now(), by: me.n, a: `${prev ? "Editó" : "Creó"} el expediente · ${k}/6 pasos completos` }] };
    setL([...L.filter(i => i.id !== r.id), r]); setX(r); setMiss(false);
    /* se remite a la FID: el servidor abre (o actualiza) el caso en la PSB y a sus miembros les llega el aviso */
    void api("/api/data", { oisFid: { no: r.no, of: r.of, sgt: r.sgt || r.by, lugar: r.lugar, fecha: r.fecha, hora: r.hora, txt: oisSum(r) } }).then(res => {
      toast(res.__s === 200 ? `${prev ? "Procedimiento actualizado" : `Procedimiento guardado: ${r.no}`} · ${res.cf} ${res.nuevo ? "abierto" : "actualizado"} en la FID` : `${r.no} guardado, pero no se pudo remitir a la FID: ${res.msg || "probá de nuevo"}`, res.__s === 200 ? "ok" : "err");
      if (res.__s === 200) syncNow(); });
  };
  const save = () => { if (!x.of) { toast("Elegí al oficial implicado", "err"); return; } if (base(x).length || faltas(x).some(f => f.length)) setMiss(true); else doSave(); };
  const H = L.slice().sort((a, b) => b.t - a.t);
  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "new", label: x.id ? "Editando" : "Nuevo procedimiento", icon: <FilePlus2 /> }, { value: "list", label: `Registrados (${L.length})`, icon: <FileText /> }]} />
      {tab === "list" ? (!H.length ? <Card><Empty icon={<ClipboardCheck />} title="Sin procedimientos registrados" /></Card> : <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        {H.map(r => { const o = open === r.id, k = steps(r).filter(Boolean).length; return (
          <div key={r.id}>
            <button onClick={() => setOpen(o ? "" : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className="font-mono text-xs font-bold text-slate-400">{r.no}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{who(r.of)}</span>
              <span className="hidden text-xs text-slate-500 sm:block">{dmy(r.fecha)} · {r.sgt}</span>
              {k < 6 && <span className="hidden items-center gap-1 text-[11px] font-semibold text-red-500 md:inline-flex"><AlertTriangle className="size-3.5" />Faltan datos</span>}
              <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold", k === 6 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>{k}/6</span></button>
            {o && <div className="flex flex-wrap gap-2 bg-slate-50/60 px-4 py-3 dark:bg-slate-900/40">
              <Button size="sm" icon={<ClipboardCheck />} onClick={() => setRev(r)}>Revisar</Button>
              <Button size="sm" variant="outline" icon={<FileDown />} onClick={() => oisPdf(r)}>Exportar PDF</Button>
              <Button size="sm" variant="outline" icon={<FileText />} onClick={() => setWeb(r)}>Ver en web</Button>
              <Button size="sm" variant="outline" icon={<Pencil />} onClick={() => { setX(r); setTab("new"); }}>Editar</Button>
              {(r.by === me.n || me.l >= 8 || me.admin) && <Button size="sm" variant="ghost" className="ml-auto text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (await confirm(`¿Borrar ${r.no}?`, { danger: true })) setL(L.filter(i => i.id !== r.id)); }}>Borrar</Button>}
            </div>}
          </div>); })}</Card>)
      : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-[linear-gradient(135deg,#0b1a33,#08101d)] px-5 py-4 text-white">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.24em] text-amber-300/90">Los Santos Police Department · Supervisión</p>
              <h2 className="mt-1 text-lg font-bold leading-snug">Procedimiento del Sargento con el oficial implicado en un OIS con fallecido</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/70">Se aplica una vez la escena está asegurada y bajo control. El Sargento <b className="text-white">no investiga ni valora</b> la actuación del oficial: su función es proteger la investigación y garantizar el bienestar del oficial.</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Sargento a cargo" className="sm:col-span-2"><AgentCombo value={x.sgt} onChange={n => up({ sgt: n })} /></Field>
              <Field label="Oficial implicado" className="sm:col-span-2"><AgentCombo value={x.of} onChange={n => up({ of: n })} /></Field>
              <Field label="Fecha"><Input type="date" value={x.fecha} onChange={e => up({ fecha: e.target.value })} /></Field>
              <Field label="Hora"><Input type="time" value={x.hora} onChange={e => up({ hora: e.target.value })} /></Field>
              <Field label="Lugar" className="sm:col-span-2"><Input value={x.lugar} onChange={e => up({ lugar: e.target.value })} placeholder="Calle, zona o referencia" /></Field>
            </div>
          </Card>

          <Step n={1} ok={ok[0]} I={HeartPulse} t="Comprobar el estado del oficial" d="Si está herido se pide EMS de inmediato: la asistencia médica tiene prioridad sobre todo lo demás. Hablarle con calma y con un tono de apoyo.">
            <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium">¿Está herido?</span><YesNo v={x.her} on={v => up({ her: v, ems: v === "si" ? x.ems : false })} />
              {x.her === "si" && <span className={cn("inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm", x.ems ? "bg-emerald-500/10" : "bg-red-500/10")}><Ambulance className="size-4 text-red-500" /><Checkbox checked={x.ems} onChange={v => up({ ems: v })} label="EMS solicitado" /></span>}</div>
            <Field label="Estado emocional"><div className="flex flex-wrap gap-1.5">{EMO.map(e => <Pill key={e} on={x.emo === e} onClick={() => up({ emo: x.emo === e ? "" : e })}>{e}</Pill>)}</div></Field>
            <Input value={x.emoN} onChange={e => up({ emoN: e.target.value })} placeholder="Otro estado u observaciones (ej: impotente)" />
          </Step>

          <Step n={2} ok={ok[1]} I={MessageSquareWarning} t="Declaración de Seguridad Pública (PSS)" d="A solas y por separado del resto, solo estas preguntas.">
            <p className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/[.07] px-3 py-2 text-[13px] font-medium text-red-700 dark:text-red-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Está PROHIBIDO preguntar por qué disparó o pedir una versión de los hechos. Eso lo hace la investigación.</p>
            {PSS.map((q, i) => <Field key={i} label={`${i + 1}. ${q}`}><Textarea rows={1} value={x.pss[i]} onChange={e => up({ pss: x.pss.map((p, j) => (j === i ? e.target.value : p)) })} placeholder="Respuesta del oficial" /></Field>)}
          </Step>

          <Step n={3} ok={ok[2]} I={MapPinOff} t="Retirarlo de la escena inmediata" d="Apartar al oficial del lugar de los hechos y del cuerpo, a una zona tranquila dentro del perímetro, lejos del público y de la prensa.">
            <Checkbox checked={x.ret} onChange={v => up({ ret: v })} label="Oficial retirado de la escena inmediata" />
            <Input value={x.zona} onChange={e => up({ zona: e.target.value })} placeholder="Zona a la que se lo llevó (opcional)" />
          </Step>

          <Step n={4} ok={ok[3]} I={Crosshair} t="Revisión del arma" d="Se revisa en el momento. El arma NO se retira: se devuelve al oficial en cuanto termina la revisión.">
            {guns.map((g, gi) => <GunForm key={g.id} g={g} n={gi + 1} many={guns.length > 1} set={p => setGuns(guns.map(y => (y.id === g.id ? { ...y, ...p } : y)))} onDel={() => setGuns(guns.filter(y => y.id !== g.id))} />)}
            <Button variant="outline" icon={<Plus />} onClick={() => setGuns([...guns, { ...newGun(), mags: ["", ""] }])}>Añadir otra arma con la que disparó</Button>
          </Step>

          <Step n={5} ok={ok[4]} I={FlaskConical} t="Test de alcohol y drogas" d="Obligatorio en todo uso de fuerza letal: no supone ninguna acusación. El resultado se anota y se adjunta al informe.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Alcohol"><div className="flex flex-wrap gap-1.5">{TEST.map(e => <TestPill key={e} v={e} on={x.alc === e} onClick={() => up({ alc: e })} />)}</div></Field>
              <Field label="Drogas"><div className="flex flex-wrap gap-1.5">{TEST.map(e => <TestPill key={e} v={e} on={x.drog === e} onClick={() => up({ drog: e })} />)}</div></Field>
            </div>
            <Input value={x.testN} onChange={e => up({ testN: e.target.value })} placeholder="Observaciones del test (opcional)" />
          </Step>

          <Step n={6} ok={ok[5]} I={Send} t="Remisión a la FID" d="Se informa al oficial de que (al guardar, la PSB recibe el aviso y se abre el caso en la FID):">
            <div className="flex flex-col gap-2">{PSB_AV.map((p, i) => <Checkbox key={i} checked={x.psb[i]} onChange={v => up({ psb: x.psb.map((b, j) => (j === i ? v : b)) })} label={p} />)}</div>
          </Step>
          <Card className="p-5"><Field label="Notas del Sargento" hint="(opcional)"><Textarea rows={3} value={x.notas} onChange={e => up({ notas: e.target.value })} /></Field></Card>
        </div>

        <Card className="space-y-4 p-5 xl:sticky xl:top-4">
          <div><p className="font-mono text-xs font-bold text-slate-400">{x.no}</p><p className="mt-1 text-sm font-semibold">{x.of ? who(x.of) : "Oficial sin elegir"}</p></div>
          <div><div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-500"><span>Pasos completos</span><span>{done}/6</span></div>
            <div className="flex gap-1">{ok.map((b, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", b ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")} />)}</div></div>
          <div className="grid gap-2">
            <Button icon={<Save />} onClick={save}>{x.id ? "Guardar cambios" : "Guardar"}</Button>
            <Button variant="outline" icon={<FileDown />} disabled={!x.of} onClick={() => oisPdf(x)}>Exportar PDF</Button>
            <Button variant="outline" icon={<FileText />} disabled={!x.of} onClick={() => setWeb(x)}>Ver en formato web</Button>
            {(x.id || x.of) && <Button variant="ghost" icon={<RotateCcw />} onClick={() => setX(blank(me.n, L))}>Empezar otro</Button>}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">El PDF sale con el sello del LSPD: en la ventana de impresión elegí «Guardar como PDF».</p>
          <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">Procedimiento: {OIS_AUTOR}</p>
        </Card>
      </div>}
      {miss && <Missing x={x} onClose={() => setMiss(false)} onSave={doSave} />}
      {rev && <Review r={rev} onClose={() => setRev(null)} onEdit={() => { setX(rev); setRev(null); setTab("new"); }} onWeb={() => { setWeb(rev); setRev(null); }} />}
      {web && <WebView r={web} onClose={() => setWeb(null)} />}
    </div>);
}

/* aviso rojo: qué falta antes de guardar (se puede guardar igual y completarlo después) */
function Missing({ x, onClose, onSave }: { x: Ois; onClose: () => void; onSave: () => void }) {
  const F = faltas(x), b = base(x);
  return (
    <Modal open onClose={onClose} size="md" icon={<AlertTriangle className="text-red-500" />} title={<span className="text-red-500">Faltan datos en el procedimiento</span>} desc={`${x.no} · ${who(x.of)}`}
      footer={<><Button variant="ghost" onClick={onSave}>Guardar igual</Button><Button icon={<Pencil />} onClick={onClose}>Volver a completar</Button></>}>
      <div className="space-y-2 rounded-2xl border border-red-500/40 bg-red-500/[.07] p-4">
        {b.length > 0 && <MissRow t="Datos generales" l={b} />}
        {F.map((l, i) => (l.length ? <MissRow key={i} t={`Paso ${i + 1} · ${STEP_T[i]}`} l={l} /> : null))}
      </div>
      <p className="text-xs text-slate-500">Si lo guardás así queda marcado con «Faltan datos» en Registrados hasta que se complete.</p>
    </Modal>);
}
const MissRow = ({ t, l }: { t: string; l: string[] }) => (
  <div><p className="text-sm font-bold text-red-600 dark:text-red-400">{t}</p><ul className="ml-4 list-disc text-[13px] text-red-700/90 dark:text-red-300/90">{l.map(x => <li key={x}>{x}</li>)}</ul></div>);

/* revisión de un expediente ya hecho: cada paso en verde o en rojo con lo que falta, y el historial de cambios */
function Review({ r, onClose, onEdit, onWeb }: { r: Ois; onClose: () => void; onEdit: () => void; onWeb: () => void }) {
  const F = faltas(r), b = base(r), k = F.filter(f => !f.length).length, okAll = k === 6 && !b.length;
  return (
    <Modal open onClose={onClose} size="lg" icon={<ClipboardCheck />} title={`Revisión · ${r.no}`} desc={`${who(r.of)} · ${dmy(r.fecha)} ${r.hora} · Sargento: ${who(r.sgt)}`}
      footer={<><Button variant="ghost" icon={<FileText />} className="mr-auto" onClick={onWeb}>Ver en web</Button><Button variant="outline" icon={<FileDown />} onClick={() => oisPdf(r)}>PDF</Button><Button icon={<Pencil />} onClick={onEdit}>{okAll ? "Editar" : "Completar lo que falta"}</Button></>}>
      <div className={cn("flex items-center gap-3 rounded-2xl border p-3.5", okAll ? "border-emerald-500/40 bg-emerald-500/[.08]" : "border-red-500/40 bg-red-500/[.08]")}>
        {okAll ? <Check className="size-5 text-emerald-500" /> : <AlertTriangle className="size-5 text-red-500" />}
        <p className={cn("text-sm font-semibold", okAll ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>{okAll ? "Expediente completo: los 6 pasos están cargados." : `Faltan datos: ${k}/6 pasos completos${b.length ? ` · sin ${b.join(", ").toLowerCase()}` : ""}.`}</p>
      </div>
      <ol className="space-y-2">{STEP_T.map((t, i) => { const l = F[i]; return (
        <li key={t} className={cn("rounded-xl border p-3", l.length ? "border-red-500/40 bg-red-500/[.05]" : "border-slate-200 dark:border-slate-800")}>
          <p className="flex items-center gap-2 text-sm font-semibold"><span className={cn("grid size-6 place-items-center rounded-lg text-xs text-white", l.length ? "bg-red-500" : "bg-emerald-500")}>{l.length ? i + 1 : <Check className="size-3.5" />}</span>Paso {i + 1} · {t}</p>
          {l.length > 0 && <ul className="ml-10 mt-1 list-disc text-[13px] text-red-600 dark:text-red-400">{l.map(x => <li key={x}>Falta: {x}</li>)}</ul>}
        </li>); })}</ol>
      <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Historial</p>
        {(r.hist || []).length ? <ul className="space-y-1 border-l-2 border-slate-200 pl-3 text-xs dark:border-slate-800">{r.hist!.slice().reverse().map((h, i) => (
          <li key={i}><b>{new Date(h.t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</b> · {h.by} · <span className="text-slate-500">{h.a}</span></li>))}</ul>
          : <p className="text-xs text-slate-500">Creado el {new Date(r.t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} por {r.by}. Los cambios desde ahora quedan registrados acá.</p>}
      </div>
    </Modal>);
}

/* una arma: modelo (con su capacidad), serie, estado y balas por cargador; las disparadas se calculan solas */
function GunForm({ g, n, many, set, onDel }: { g: Gun; n: number; many: boolean; set: (p: Partial<Gun>) => void; onDel: () => void }) {
  const c = gCalc(g), mag = (i: number, v: string) => set({ mags: g.mags.map((m, j) => (j === i ? v.replace(/\D/g, "").slice(0, 3) : m)) });
  const count = (k: number) => set({ mags: Array.from({ length: k }, (_, i) => g.mags[i] ?? "") });
  const disp = g.disp || (c.est !== null ? String(c.est) : ""), off = !!g.disp && c.est !== null && +g.disp !== c.est;
  return (
    <div className={cn("space-y-3", many && "rounded-2xl border border-slate-200 p-4 dark:border-slate-800")}>
      {many && <div className="flex items-center gap-2"><span className="rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-bold text-white dark:bg-white dark:text-slate-900">Arma {n}</span>{n === 1 && <span className="text-xs text-slate-500">Reglamentaria</span>}
        {n > 1 && <button onClick={onDel} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"><Trash2 className="size-3.5" />Quitar</button>}</div>}
      <Field label="Modelo"><div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">{MODELOS.map(([m, cap]) => <Pill key={m} on={g.mod === m} onClick={() => set({ mod: m, cap })}>{m}</Pill>)}</div>
        <Input value={g.mod} onChange={e => set({ mod: e.target.value, cap: capOf(e.target.value) || g.cap })} placeholder="U otro modelo…" /></div></Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field label="N° de serie"><Input className="font-mono uppercase" value={g.ser} onChange={e => set({ ser: e.target.value })} /></Field>
        <Field label="Balas por cargador"><Input inputMode="numeric" value={g.cap || ""} onChange={e => set({ cap: +e.target.value.replace(/\D/g, "") || 0 })} placeholder="—" /></Field>
      </div>
      <Field label="Estado del arma"><div className="flex flex-wrap gap-1.5">{ARMA_EST.map(e => <Pill key={e} on={g.est === e} onClick={() => set({ est: e })}>{e}</Pill>)}</div></Field>
      {g.est && g.est !== ARMA_EST[0] && <Input value={g.estN} onChange={e => set({ estN: e.target.value })} placeholder="Describí el daño o el fallo" />}
      <Field label="Cargadores que lleva" hint="(incluido el que está puesto en el arma)"><div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5, 6].map(k => <Pill key={k} on={g.mags.length === k} onClick={() => count(k)}>{k}</Pill>)}</div></Field>
      <Field label="Balas que quedan en cada cargador"><div className="flex flex-wrap gap-2">{g.mags.map((m, i) => (
        <div key={i} className="w-[6.5rem] rounded-xl border border-slate-200 p-2 dark:border-slate-700">
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{i === 0 ? "En el arma" : `Cargador ${i + 1}`}</p>
          <Input inputMode="numeric" className="h-8 text-center font-mono" value={m} onChange={e => mag(i, e.target.value)} placeholder={g.cap ? String(g.cap) : "0"} />
          <div className="mt-1 flex gap-1">{g.cap > 0 && <button onClick={() => mag(i, String(g.cap))} className="flex-1 rounded-md bg-emerald-500/10 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">Lleno</button>}
            <button onClick={() => mag(i, "0")} className="flex-1 rounded-md bg-red-500/10 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-300">Vacío</button></div>
        </div>))}</div></Field>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Balas disparadas"><Input inputMode="numeric" value={g.disp} onChange={e => set({ disp: e.target.value.replace(/\D/g, "") })} placeholder={c.est !== null ? `${c.est} (calculado)` : "—"} /></Field>
        <div className="flex items-end">{c.dot > 0 && <p className={cn("w-full rounded-xl px-3 py-2 text-xs font-semibold", off ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-sky-500/10 text-sky-700 dark:text-sky-300")}>
          Dotación: {g.mags.length} × {g.cap} = {c.dot} · quedan {c.left}{c.est !== null ? ` → disparó ${c.est}` : " (completá todos los cargadores)"}{off ? ` · declaró ${g.disp}: no coincide` : g.disp && c.est !== null ? " · coincide" : ""}
          {!g.disp && c.est !== null && <button onClick={() => set({ disp: String(c.est) })} className="ml-2 font-bold underline">Usar {c.est}</button>}</p>}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium">¿Cambió de cargador durante el incidente?</span><YesNo v={g.camb} on={v => set({ camb: v })} />
        {disp && g.cap > 0 && +disp > g.cap && g.camb === "" && <span className="text-xs text-amber-500">Disparó más balas que las de un cargador: seguramente sí.</span>}</div>
    </div>);
}

/* formato web: el mismo documento que el PDF, en pantalla */
function WebView({ r, onClose }: { r: Ois; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="xl" icon={<FileText />} title={`Informe · ${r.no}`} desc={`${who(r.of)} · ${dmy(r.fecha)}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cerrar</Button><Button icon={<FileDown />} onClick={() => oisPdf(r)}>Exportar PDF</Button></>}>
      <div className="rounded-xl bg-slate-200 p-3 dark:bg-slate-800"><iframe title={`Informe ${r.no}`} srcDoc={oisHtml(r).replace("<body>", '<body style="background:#fff;padding:28px 34px;max-width:820px;margin:0 auto">')} className="h-[68vh] w-full rounded-lg bg-white shadow-lg" /></div>
    </Modal>);
}

function Step({ n, ok, I, t, d, children }: { n: number; ok: boolean; I: typeof Check; t: string; d: string; children: React.ReactNode }) {
  return (
    <Card className={cn("overflow-hidden transition", ok && "ring-1 ring-emerald-500/40")}>
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold", ok ? "bg-emerald-500 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900")}>{ok ? <Check className="size-4" /> : n}</span>
        <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-semibold"><I className="size-4 text-slate-400" />Paso {n}. {t}</p><p className="mt-0.5 text-[13px] text-slate-500">{d}</p></div>
      </div>
      <div className="space-y-3 p-5">{children}</div>
    </Card>);
}
const Pill = ({ on, bad, onClick, children }: { on: boolean; bad?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-pressed={on} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition",
    on ? (bad ? "border-red-500 bg-red-500 text-white" : "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900") : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-200")}>{children}</button>);
/* resultado del test: positivo verde, negativo rojo, pendiente amarillo, con un brillo leve */
const TEST_C: Record<string, string> = { "Positivo": "#22c55e", "Negativo": "#ef4444", "Pendiente de resultado": "#f59e0b" };
const TestPill = ({ v, on, onClick }: { v: string; on: boolean; onClick: () => void }) => { const c = TEST_C[v];
  return <button type="button" onClick={onClick} aria-pressed={on} className="rounded-full border px-3 py-1 text-xs font-semibold transition"
    style={on ? { color: "#fff", background: c, borderColor: c, boxShadow: `0 0 10px ${c}aa, 0 0 2px ${c}` } : { color: c, borderColor: c + "66", background: c + "12" }}>{v}</button>; };
const YesNo = ({ v, on }: { v: "" | "si" | "no"; on: (v: "si" | "no") => void }) => <div className="flex gap-1.5"><Pill on={v === "si"} onClick={() => on("si")}>Sí</Pill><Pill on={v === "no"} onClick={() => on("no")}>No</Pill></div>;

/* ---------- salida: Discord y PDF ---------- */
const sn = (v: string) => (v === "si" ? "Sí" : v === "no" ? "No" : "—");
const vals = (x: Ois) => ({
  p1: [["Herido", sn(x.her) + (x.her === "si" ? (x.ems ? " · EMS solicitado" : " · EMS SIN solicitar") : "")], ["Estado emocional", [x.emo, x.emoN].filter(Boolean).join(" · ") || "—"]],
  p3: [["Retirado de la escena", x.ret ? "Sí" : "No"], ["Zona", x.zona || "—"]],
  p4: gunsOf(x).map(g => { const c = gCalc(g), d = g.disp || (c.est !== null ? String(c.est) : "");
    return [["Modelo", g.mod || "—"], ["N° de serie", g.ser.toUpperCase() || "—"], ["Estado", [g.est, g.estN].filter(Boolean).join(" · ") || "—"], ["Cargadores", g.mags.length ? `${g.mags.length}${g.cap ? ` de ${g.cap} balas` : ""}` : "—"],
      ["Balas que quedan", g.mags.length ? g.mags.map(m => m || "?").join(" / ") + ` (total ${c.left})` : "—"], ["Balas disparadas", d ? d + (c.est !== null && g.disp && +g.disp !== c.est ? ` (según la dotación: ${c.est}, NO coincide)` : c.est !== null ? " (coincide con la dotación)" : "") : "—"],
      ["Dotación reglamentaria", c.dot ? `${g.mags.length} × ${g.cap} = ${c.dot}` : "—"], ["Cambio de cargador", sn(g.camb)]]; }),
  p5: [["Alcohol", x.alc || "—"], ["Drogas", x.drog || "—"], ...(x.testN ? [["Observaciones", x.testN]] : [])],
});
/* resumen en texto para el caso de la FID */
function oisSum(x: Ois) {
  const V = vals(x), L = (rows: string[][]) => rows.map(([k, v]) => `- ${k}: ${v}`).join("\n");
  return [`Procedimiento OIS ${x.no} · ${[x.fecha && dmy(x.fecha), x.hora].filter(Boolean).join(" ")}${x.lugar ? ` · ${x.lugar}` : ""}`, `Sargento a cargo: ${x.sgt || x.by} · Oficial implicado: ${x.of}`, "",
    "1. Estado del oficial", L(V.p1), "", "2. Declaración de Seguridad Pública", ...PSS.map((q, i) => `- ${q}: ${x.pss[i] || "—"}`), "", "3. Retirada de la escena", L(V.p3), "",
    ...V.p4.flatMap((g, i) => [`4. Revisión del arma${V.p4.length > 1 ? ` (${i + 1})` : ""}`, L(g), ""]), "5. Test de alcohol y drogas", L(V.p5),
    ...(x.notas.trim() ? ["", "Notas", x.notas.trim()] : [])].join("\n");
}
const esc = escHtml;
function oisHtml(x: Ois) {
  const V = vals(x), seal = location.origin + "/next/lspd-seal.webp", hoy = new Date().toLocaleDateString("es-AR");
  const grid = (L: string[][]) => { const r: string[] = []; for (let i = 0; i < L.length; i += 2) r.push("<tr>" + [L[i], L[i + 1]].map(c => (c ? `<td><b>${esc(c[0])}:</b><br>${esc(c[1])}</td>` : "<td></td>")).join("") + "</tr>"); return `<table class="g">${r.join("")}</table>`; };
  const bar = (t: string) => `<div class="bar">${esc(t)}</div>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(x.no)} - ${esc(x.of || "OIS")}</title><style>
    @page{size:A4;margin:16mm 16mm 18mm}*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;color:#111;font-size:11pt;line-height:1.5;margin:0}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;font-size:9.5pt;line-height:1.55}.hd img{width:78px;height:78px;object-fit:contain}
    .tt{border:1px solid #111;margin:18px 0 12px;padding:9px 14px;text-align:center;font-weight:bold;letter-spacing:.14em;font-size:9.5pt;text-transform:uppercase}
    .bar{background:#111;color:#fff;text-align:center;font-weight:bold;letter-spacing:.24em;font-size:9pt;padding:5px;margin:14px 0 8px;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    table.g{width:100%;border-collapse:collapse;font-size:10pt}table.g td{border:1px solid #111;padding:6px 9px;vertical-align:top;width:50%}
    p{margin:6px 0;text-align:justify}ol{margin:4px 0 0 18px;padding:0}li{margin:0 0 6px}.q{font-weight:bold}.warn{border-left:3px solid #111;padding:4px 10px;font-style:italic;margin:8px 0}
    .chk{margin:3px 0}.sig{margin-top:30px;display:flex;justify-content:space-between;gap:24px;font-size:10pt}.sig div{flex:1}.ln{border-top:1px solid #111;margin-top:34px;padding-top:4px}
    .ft{margin-top:22px;font-size:8.5pt;color:#555;text-align:center}
  </style></head><body>
  <div class="hd"><div>San Andreas Statement · City of Los Santos<br>Emisión: Mission Row Police Department, ${hoy}<br>Supervisión · Officer Involved Shooting — ${esc(x.no)}</div><img src="${seal}" alt=""></div>
  <div class="tt">Procedimiento del Sargento con el oficial implicado en un OIS con fallecido</div>
  ${bar("Información")}
  ${grid([["Oficial implicado", who(x.of)], ["N° de placa", placa(x.of) || "—"], ["Sargento a cargo", who(x.sgt)], ["Fecha y hora", `${dmy(x.fecha)} · ${x.hora || "—"}`], ["Lugar", x.lugar || "—"], ["Expediente", x.no]])}
  <p>Este procedimiento se aplica una vez la escena está asegurada y bajo control. El Sargento no investiga ni valora la actuación del oficial; su función es proteger la investigación y garantizar el bienestar del oficial.</p>
  ${bar("Paso 1 · Estado del oficial")}${grid(V.p1)}
  ${bar("Paso 2 · Declaración de Seguridad Pública (PSS)")}
  <ol>${PSS.map((q, i) => `<li><span class="q">${esc(q)}</span><br>${esc(x.pss[i] || "—")}</li>`).join("")}</ol>
  <div class="warn">Está prohibido preguntar por qué disparó o pedir una versión de los hechos. Eso lo hace la investigación.</div>
  ${bar("Paso 3 · Retirada de la escena inmediata")}${grid(V.p3)}
  ${bar("Paso 4 · Revisión del arma")}<p>El arma no se retira: se devuelve al oficial en cuanto termina la revisión.</p>${V.p4.map((g, i) => (V.p4.length > 1 ? `<p class="q">Arma ${i + 1}${i === 0 ? " (reglamentaria)" : ""}</p>` : "") + grid(g)).join("")}
  ${bar("Paso 5 · Test de alcohol y drogas")}<p>Procedimiento obligatorio en todo uso de fuerza letal; no supone ninguna acusación.</p>${grid(V.p5)}
  ${bar("Paso 6 · Remisión a la FID")}<p>Se informa al oficial de que:</p>${PSB_AV.map((p, i) => `<div class="chk">${x.psb[i] ? "☑" : "☐"} ${esc(p)}</div>`).join("")}
  ${x.notas.trim() ? bar("Notas del Sargento") + `<p>${esc(x.notas.trim()).replace(/\n/g, "<br>")}</p>` : ""}
  <div class="sig"><div><div class="ln">${esc(who(x.sgt))}<br>Sargento a cargo · Los Santos Police Department</div></div><div><div class="ln">${esc(who(x.of))}<br>Oficial implicado</div></div></div>
  <div class="ft">Procedimiento redactado por ${OIS_AUTOR} · Los Santos Police Department</div>
  </body></html>`;
  return html;
}
function oisPdf(x: Ois) {
  const html = oisHtml(x), f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"; document.body.appendChild(f);
  const d = f.contentDocument!; d.open(); d.write(html); d.close();
  const go = () => { const w = f.contentWindow!; w.focus(); w.print(); setTimeout(() => f.remove(), 60000); };
  const img = d.querySelector("img"); if (img && !img.complete) { img.onload = go; img.onerror = go; } else setTimeout(go, 50);
}
