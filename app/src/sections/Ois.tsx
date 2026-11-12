/* Procedimiento del Sargento con el oficial implicado en un OIS con fallecido (Supervisión · Sargento II Evelyn Molina).
   Se completa paso a paso, se copia para Discord y se exporta en PDF con el formato de los documentos oficiales (sello LSPD).
   Se guarda en lspdt.ois. */
import { useState } from "react";
import { AlertTriangle, Ambulance, Check, ClipboardCheck, Copy, Crosshair, FileDown, FilePlus2, FileText, FlaskConical, HeartPulse, MapPinOff, MessageSquareWarning, Pencil, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { Button, Card, Checkbox, Empty, Field, Input, Segmented, Textarea } from "@/components/ui";
import { AgentCombo } from "@/components/agents";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { findAgent, hoyISO, rankES, uid , dmy } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const PSS = ["¿Has disparado? ¿Cuántas veces y en qué dirección?", "¿Hay alguien más herido? ¿Dónde?", "¿Hay sospechosos huidos? Descripción, dirección y armamento.",
  "¿Hay pruebas o armas que haya que proteger? ¿Dónde están?", "¿Hay testigos? ¿Dónde están?", "¿Sabes si ha disparado alguien más?"];
const EMO = ["Tranquilo", "Nervioso", "En shock", "Alterado", "Desorientado"];
const ARMA_EST = ["Funciona correctamente", "Con daños", "Se encasquilló"];
const TEST = ["Negativo", "Positivo", "Pendiente de resultado"];
const PSB_AV = ["Este uso de la fuerza se remitirá al Professional Standards Bureau (PSB).", "El caso se revisará internamente.", "Si necesitan algo de él, PSB se pondrá en contacto directamente."];
const OIS_AUTOR = "Sargento II Evelyn Molina";

type Ois = {
  id: string; no: string; t: number; by: string; fecha: string; hora: string; lugar: string; sgt: string; of: string;
  her: "" | "si" | "no"; ems: boolean; emo: string; emoN: string;
  pss: string[]; ret: boolean; zona: string;
  mod: string; ser: string; est: string; estN: string; car: string; rest: string; disp: string; dot: string; camb: "" | "si" | "no"; otra: string;
  alc: string; drog: string; testN: string; psb: boolean[]; notas: string;
};
const blank = (me: string, n: number): Ois => { const d = new Date(); return { id: "", no: `OIS-${String(d.getFullYear()).slice(2)}-${String(n).padStart(4, "0")}`, t: 0, by: me,
  fecha: hoyISO(), hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, lugar: "", sgt: me, of: "", her: "", ems: false, emo: "", emoN: "",
  pss: PSS.map(() => ""), ret: false, zona: "", mod: "", ser: "", est: "", estN: "", car: "", rest: "", disp: "", dot: "", camb: "", otra: "", alc: "", drog: "", testN: "", psb: PSB_AV.map(() => false), notas: "" }; };

const who = (n: string) => { const a = findAgent(n); return a ? `${rankES(a.r)} ${n}` : n || "—"; };
const placa = (n: string) => findAgent(n)?.p || "";
/* balas: lo que queda en los cargadores y lo que falta según la dotación */
const sumRest = (s: string) => (s.match(/\d+/g) || []).reduce((a, b) => a + +b, 0);
const faltan = (x: Ois) => (x.dot && x.rest ? +x.dot - sumRest(x.rest) : null);
const steps = (x: Ois) => [x.her !== "" && !!x.emo && (x.her !== "si" || x.ems), x.pss.every(p => p.trim()), x.ret, !!(x.mod && x.ser && x.est && x.car && x.disp && x.camb), !!(x.alc && x.drog), x.psb.every(Boolean)];

export function OisPanel() {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [L, setL] = useJSON<Ois[]>("lspdt.ois", []);
  const [tab, setTab] = useState<"new" | "list">("new"), [x, setX] = useState<Ois>(() => blank(me.n, L.length + 1)), [open, setOpen] = useState("");
  const up = (p: Partial<Ois>) => setX({ ...x, ...p }), ok = steps(x), done = ok.filter(Boolean).length;
  const save = () => {
    if (!x.of) { toast("Elegí al oficial implicado", "err"); return; }
    const r = { ...x, id: x.id || uid(), t: x.t || Date.now() };
    setL([...L.filter(i => i.id !== r.id), r]); setX(r); toast(x.id ? "Procedimiento actualizado" : "Procedimiento guardado");
  };
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
              <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold", k === 6 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>{k}/6</span></button>
            {o && <div className="flex flex-wrap gap-2 bg-slate-50/60 px-4 py-3 dark:bg-slate-900/40">
              <Button size="sm" icon={<FileDown />} onClick={() => oisPdf(r)}>Exportar PDF</Button>
              <Button size="sm" variant="outline" icon={<Copy />} onClick={() => void copy(oisText(r))}>Copiar para Discord</Button>
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
            <Input value={x.emoN} onChange={e => up({ emoN: e.target.value })} placeholder="Observaciones (opcional)" />
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Modelo"><Input value={x.mod} onChange={e => up({ mod: e.target.value })} placeholder="Ej: Glock 17" /></Field>
              <Field label="N° de serie"><Input className="font-mono uppercase" value={x.ser} onChange={e => up({ ser: e.target.value })} /></Field>
            </div>
            <Field label="Estado del arma"><div className="flex flex-wrap gap-1.5">{ARMA_EST.map(e => <Pill key={e} on={x.est === e} onClick={() => up({ est: e })}>{e}</Pill>)}</div></Field>
            {x.est && x.est !== ARMA_EST[0] && <Input value={x.estN} onChange={e => up({ estN: e.target.value })} placeholder="Describí el daño o el fallo" />}
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Cargadores"><Input inputMode="numeric" value={x.car} onChange={e => up({ car: e.target.value.replace(/\D/g, "") })} /></Field>
              <Field label="Balas que quedan" className="sm:col-span-3" hint="(en cada cargador)"><Input value={x.rest} onChange={e => up({ rest: e.target.value })} placeholder="Ej: 12 / 17 / 17" /></Field>
              <Field label="Balas disparadas"><Input inputMode="numeric" value={x.disp} onChange={e => up({ disp: e.target.value.replace(/\D/g, "") })} /></Field>
              <Field label="Dotación reglamentaria" hint="(balas)"><Input inputMode="numeric" value={x.dot} onChange={e => up({ dot: e.target.value.replace(/\D/g, "") })} placeholder="Ej: 51" /></Field>
              <div className="flex items-end sm:col-span-2">{faltan(x) !== null && <p className={cn("w-full rounded-xl px-3 py-2 text-xs font-semibold", x.disp && faltan(x) !== +x.disp ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>
                Según la dotación faltan {faltan(x)} {faltan(x) === 1 ? "bala" : "balas"}{x.disp ? (faltan(x) === +x.disp ? " · coincide con lo disparado" : ` · declaró ${x.disp}: no coincide`) : ""}</p>}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium">¿Cambió de cargador durante el incidente?</span><YesNo v={x.camb} on={v => up({ camb: v })} /></div>
            <Field label="Otra arma además de la reglamentaria" hint="(vacío si no usó)"><Input value={x.otra} onChange={e => up({ otra: e.target.value })} placeholder="Ej: escopeta, fusil…" /></Field>
          </Step>

          <Step n={5} ok={ok[4]} I={FlaskConical} t="Test de alcohol y drogas" d="Obligatorio en todo uso de fuerza letal: no supone ninguna acusación. El resultado se anota y se adjunta al informe.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Alcohol"><div className="flex flex-wrap gap-1.5">{TEST.map(e => <Pill key={e} on={x.alc === e} bad={e === "Positivo"} onClick={() => up({ alc: e })}>{e}</Pill>)}</div></Field>
              <Field label="Drogas"><div className="flex flex-wrap gap-1.5">{TEST.map(e => <Pill key={e} on={x.drog === e} bad={e === "Positivo"} onClick={() => up({ drog: e })}>{e}</Pill>)}</div></Field>
            </div>
            <Input value={x.testN} onChange={e => up({ testN: e.target.value })} placeholder="Observaciones del test (opcional)" />
          </Step>

          <Step n={6} ok={ok[5]} I={Send} t="Notificación a PSB" d="Se informa al oficial de que:">
            {PSB_AV.map((p, i) => <Checkbox key={i} checked={x.psb[i]} onChange={v => up({ psb: x.psb.map((b, j) => (j === i ? v : b)) })} label={p} />)}
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
            <Button variant="outline" icon={<Copy />} disabled={!x.of} onClick={() => void copy(oisText(x))}>Copiar para Discord</Button>
            {(x.id || x.of) && <Button variant="ghost" icon={<RotateCcw />} onClick={() => setX(blank(me.n, L.length + 1))}>Empezar otro</Button>}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">El PDF sale con el sello del LSPD: en la ventana de impresión elegí «Guardar como PDF».</p>
          <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">Procedimiento: {OIS_AUTOR}</p>
        </Card>
      </div>}
    </div>);
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
const YesNo = ({ v, on }: { v: "" | "si" | "no"; on: (v: "si" | "no") => void }) => <div className="flex gap-1.5"><Pill on={v === "si"} onClick={() => on("si")}>Sí</Pill><Pill on={v === "no"} onClick={() => on("no")}>No</Pill></div>;

/* ---------- salida: Discord y PDF ---------- */
const sn = (v: string) => (v === "si" ? "Sí" : v === "no" ? "No" : "—");
const vals = (x: Ois) => {
  const f = faltan(x);
  return {
    p1: [["Herido", sn(x.her) + (x.her === "si" ? (x.ems ? " · EMS solicitado" : " · EMS SIN solicitar") : "")], ["Estado emocional", [x.emo, x.emoN].filter(Boolean).join(" · ") || "—"]],
    p3: [["Retirado de la escena", x.ret ? "Sí" : "No"], ["Zona", x.zona || "—"]],
    p4: [["Modelo", x.mod || "—"], ["N° de serie", x.ser.toUpperCase() || "—"], ["Estado", [x.est, x.estN].filter(Boolean).join(" · ") || "—"], ["Cargadores", x.car || "—"], ["Balas que quedan", x.rest || "—"],
      ["Balas disparadas", x.disp || "—"], ["Dotación reglamentaria", x.dot ? `${x.dot}${f !== null ? ` (faltan ${f}${x.disp ? (f === +x.disp ? ", coincide" : ", NO coincide") : ""})` : ""}` : "—"],
      ["Cambio de cargador", sn(x.camb)], ["Otra arma", x.otra || "No"]],
    p5: [["Alcohol", x.alc || "—"], ["Drogas", x.drog || "—"], ...(x.testN ? [["Observaciones", x.testN]] : [])],
  };
};
function oisText(x: Ois) {
  const V = vals(x), kv = (L: string[][]) => L.map(([k, v]) => `**${k}:** ${v}`);
  return [`## 🚨 Procedimiento OIS con fallecido · ${x.no}`, `**Oficial implicado:** ${who(x.of)}${placa(x.of) ? ` | ${placa(x.of)}` : ""}`, `**Sargento a cargo:** ${who(x.sgt)}`,
    `**Fecha:** ${dmy(x.fecha)} ${x.hora}${x.lugar ? ` · ${x.lugar}` : ""}`, "",
    "### 1. Estado del oficial", ...kv(V.p1), "", "### 2. Declaración de Seguridad Pública (PSS)", ...PSS.map((q, i) => `> ${i + 1}. ${q}\n${x.pss[i] || "—"}`), "",
    "### 3. Retirada de la escena", ...kv(V.p3), "", "### 4. Revisión del arma", ...kv(V.p4), "", "### 5. Test de alcohol y drogas", ...kv(V.p5), "",
    "### 6. Notificación a PSB", ...PSB_AV.map((p, i) => `${x.psb[i] ? "✅" : "⬜"} ${p}`), ...(x.notas.trim() ? ["", `**Notas:** ${x.notas.trim()}`] : []), "", `-# Procedimiento: ${OIS_AUTOR} · LSPD`].join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function oisPdf(x: Ois) {
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
  ${bar("Paso 4 · Revisión del arma")}<p>El arma no se retira: se devuelve al oficial en cuanto termina la revisión.</p>${grid(V.p4)}
  ${bar("Paso 5 · Test de alcohol y drogas")}<p>Procedimiento obligatorio en todo uso de fuerza letal; no supone ninguna acusación.</p>${grid(V.p5)}
  ${bar("Paso 6 · Notificación a PSB")}<p>Se informa al oficial de que:</p>${PSB_AV.map((p, i) => `<div class="chk">${x.psb[i] ? "☑" : "☐"} ${esc(p)}</div>`).join("")}
  ${x.notas.trim() ? bar("Notas del Sargento") + `<p>${esc(x.notas.trim()).replace(/\n/g, "<br>")}</p>` : ""}
  <div class="sig"><div><div class="ln">${esc(who(x.sgt))}<br>Sargento a cargo · Los Santos Police Department</div></div><div><div class="ln">${esc(who(x.of))}<br>Oficial implicado</div></div></div>
  <div class="ft">Procedimiento redactado por ${OIS_AUTOR} · Los Santos Police Department</div>
  </body></html>`;
  const f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"; document.body.appendChild(f);
  const d = f.contentDocument!; d.open(); d.write(html); d.close();
  const go = () => { const w = f.contentWindow!; w.focus(); w.print(); setTimeout(() => f.remove(), 60000); };
  const img = d.querySelector("img"); if (img && !img.complete) { img.onload = go; img.onerror = go; } else setTimeout(go, 50);
}
