/* Ascenso a Sargento (solo Sargento II o superior): examen escrito, entrevista (Oral Board) y lista de elegibles.
   Proceso: Fase I elegibilidad · Fase II examen (corte 70 %, +0,25 por año de antigüedad hasta +2) · Fase III entrevista (apto ≥ 70 %). */
import { useMemo, useState } from "react";
import { Check, ClipboardCheck, ClipboardPaste, Copy, MessageCircle, Minus, Pencil, Plus, Save, Star, Trash2, Trophy, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { findAgent, getRoster, rankES, uid } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

/* ---------- datos ---------- */
type Q = { id: string; a: string; q: string; r: string };            // pregunta del examen: área, pregunta, respuesta esperada
type Grade = "" | "ok" | "mid" | "no";
type Eval = { id: string; tipo: "exa" | "ent"; cand: string; rango: string; fecha: string; anios?: number;
  notas: Record<string, Grade | number>; obs: Record<string, string>; pct: number; nota: number; apto: boolean; by: string; ts: number; qs?: { id: string; t: string }[] };
const K_EVAL = "lspdt.sgt.eval", K_BANK = "lspdt.sgt.bank";
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (s: string) => (s ? s.split("-").reverse().join("/") : "—");
const CANDS = () => getRoster().filter(a => ["Police Officer III+", "Police Officer III", "Police Officer II", "Detective I", "Detective II", "Detective III"].includes(a.r)).map(a => a.n).sort((a, b) => a.localeCompare(b));

export const AREAS_EXA = ["Manual del Departamento", "Procedimientos de patrulla", "Uso de la fuerza", "Marco legal", "Liderazgo y supervisión"];
const BANK0: Q[] = [
  ["Manual del Departamento", "¿Qué diferencia hay entre las funciones de un Sargento I y un Sargento II?", "Sgto. I: supervisor de campo, manda el turno y responde por sus oficiales. Sgto. II: supervisor administrativo/especializado, dirige oficiales y sargentos, asiste al Watch Commander y coordina unidades."],
  ["Manual del Departamento", "¿Qué lugar ocupa el Sargento en la cadena de mando?", "Es el primer escalón de mando: por encima del Oficial y por debajo del Teniente."],
  ["Manual del Departamento", "¿Qué debe hacer un Sargento con una queja ciudadana?", "Es el primer receptor: la documenta y la resuelve si está a su alcance o la eleva."],
  ["Procedimientos de patrulla", "¿Qué se trata en el roll call al inicio del turno?", "Asignación de unidades y zonas, novedades, avisos y órdenes vigentes, y recordatorios de procedimiento."],
  ["Procedimientos de patrulla", "Al llegar como mando a una escena activa, ¿cuáles son las primeras prioridades?", "Seguridad de oficiales y civiles, asumir y comunicar el mando, evaluar, pedir apoyo y organizar perímetro y roles."],
  ["Procedimientos de patrulla", "¿Qué controla un Sargento al revisar un informe?", "Que esté completo y veraz, cargos y artículos correctos (con atenuantes o agravantes), evidencia y fotos, y redacción clara."],
  ["Uso de la fuerza", "¿Qué principios rigen el uso de la fuerza?", "Necesidad, proporcionalidad y racionalidad: la mínima fuerza necesaria según la resistencia y la amenaza."],
  ["Uso de la fuerza", "Tras un uso de fuerza de un oficial, ¿qué hace el Sargento?", "Verifica el estado de todos, preserva evidencia y bodycam, revisa que se documente en el informe y eleva si corresponde."],
  ["Uso de la fuerza", "¿Cuándo está justificado el uso de arma de fuego?", "Solo ante un peligro inminente para la vida o la integridad física propia o de terceros, sin alternativa menos lesiva."],
  ["Marco legal", "Diferencia entre falta administrativa y delito.", "La falta es una infracción administrativa con multa (leve, grave, muy grave); el delito está en el Código Penal y puede llevar condena en prisión."],
  ["Marco legal", "¿Qué derechos se le leen a un detenido y cuándo?", "Al momento de la detención: derecho a guardar silencio, a un abogado y a saber de qué se lo acusa."],
  ["Marco legal", "¿Cuándo se aplica la negativa a identificarse como delito (143.51) en vez de la falta (29.3)?", "Cuando la negativa es reiterada o se dan datos manifiestamente falsos que obstruyen la actuación policial."],
  ["Liderazgo y supervisión", "Describí la escala correctiva que aplica un Sargento.", "Corrección informal (advertencia verbal), documentación en el expediente y escalada formal a un mando superior o a Asuntos Internos."],
  ["Liderazgo y supervisión", "¿Puede un Sargento imponer sanciones graves por sí solo?", "No: detecta, corrige lo corregible y eleva lo demás."],
  ["Liderazgo y supervisión", "¿Cómo se da feedback a los oficiales?", "Evaluación formal periódica por escrito (queda en el expediente) y feedback diario al revisar informes, en escena y en el roll call."],
].map(([a, q, r], i) => ({ id: "b" + i, a, q, r }));

/* entrevista (Oral Board) */
const ENT: [string, string][] = [
  ["¿Qué te hace mejor candidato que el resto de aspirantes? Sé específico, no nos digas virtudes genéricas.", "¿Eso lo has demostrado o solo lo crees? / ¿Por qué crees que los otros candidatos no lo tienen?"],
  ["¿Qué diferencia a un Sargento de un agente raso en responsabilidad? No en teoría: en el día a día real.", "¿Y si ese peso extra te supera un día? / ¿Qué pasa cuando tu equipo falla y vos firmaste el turno?"],
  ["Un agente actúa imprudentemente en una persecución. ¿Qué hacés en el momento y qué hacés después, cuando ya no hay adrenalina?", "¿Y si ese agente es el más antiguo del turno? / ¿Qué hacés si te dice que vos también lo harías?"],
  ["Dame un ejemplo concreto de una situación en patrullaje donde tomaste una decisión difícil. No nos cuentes qué harías: contanos qué hiciste.", "¿Cambiarías algo de esa decisión hoy? / ¿Cómo reaccionó el resto del equipo?"],
  ["Un agente discrepa con tus órdenes en público durante un operativo. ¿Cómo lo gestionás en ese momento y qué pasa después?", "¿Y si tenía razón él? / ¿Le das la oportunidad de explicarse o lo cortás directamente?"],
  ["Un superior te da una orden técnicamente correcta, pero creés que va a salir mal. ¿La ejecutás o la cuestionás, y hasta dónde llegás?", "¿Y si el superior insiste después de escucharte? / ¿Dónde está tu límite para desobedecer?"],
  ["Tenés que sancionar a un agente que es amigo tuyo fuera del servicio. ¿Cómo lo gestionás? ¿Le avisás antes?", "¿Le decís que es tu decisión o que «te obligaron»? / ¿Qué pasa si esa amistad no sobrevive a la sanción?"],
  ["Tenés un agente que te cae mal personalmente. Esta semana actuó mejor que el resto. ¿Qué hacés?", "¿Se lo reconocés en público o solo en privado? / ¿Cómo evitás que tu opinión personal afecte su evaluación?"],
  ["Hay un tiroteo grave y sos el mando de mayor rango presente. No hay tiempo de consultar a nadie. ¿Cómo actuás?", "¿Cuándo pedís refuerzos, antes o después de entrar? / ¿Qué hacés si uno de tus agentes entra sin orden?"],
  ["Tenés dos frentes activos y solo podés atender uno. En el primero hay un agente en peligro y en el segundo, civiles en riesgo. ¿Qué decidís y por qué?", "¿Qué le decís al agente que dejás atrás? / ¿Esa decisión te quitaría el sueño o la asumís?"],
  ["Un agente lleva varios turnos con bajo rendimiento. Cuando lo llamás a hablar, te dice que tiene problemas personales. ¿Qué hacés?", "¿Cuánto tiempo le das antes de que sea un problema oficial? / ¿Dónde está el límite entre comprensión y permisividad?"],
  ["Nombrá un mando que hayas visto actuar en patrullaje. ¿Qué harías diferente a él y por qué?", "¿Se lo dijiste alguna vez directamente? / ¿Qué tiene él que vos todavía no?"],
  ["¿Cuántas horas de patrullaje llevás esta semana? Sé honesto.", "¿Eso es suficiente para conocer a tu equipo? / ¿Cantidad de horas o calidad de presencia: en qué te basás?"],
  ["¿Cómo garantizás que los procedimientos se cumplan cuando vos no estás mirando?", "¿Confiás en tu equipo o lo controlás? / ¿Qué hacés cuando descubrís que no se cumplieron?"],
  ["¿Qué aportarías que hoy no existe en la sección? Algo concreto, no «más compromiso».", "¿Por qué no lo hiciste ya sin necesitar el rango? / ¿Qué necesitás del rango para implementarlo?"],
  ["Si hoy te negamos el ascenso, ¿qué harías? ¿Qué cambiarías de vos mismo?", "¿Lo aceptarías o lo cuestionarías? / ¿Seguirías igual de implicado o bajarías el rendimiento?"],
];

const bonus = (anios = 0) => Math.min(2, Math.max(0, Math.floor(anios)) * 0.25);
const gradeVal = (g: Grade | number) => (g === "ok" ? 1 : g === "mid" ? 0.5 : 0);

/* ---------- vista principal ---------- */
export function Sargentos({ tab: t0 }: { tab: "exa" | "ent" | "list" }) {
  useStoreVersion();
  const [evals, setEvals] = useJSON<Eval[]>(K_EVAL, []);
  const save = (e: Eval) => setEvals([...evals.filter(x => x.id !== e.id), e]);
  const del = (id: string) => setEvals(evals.filter(x => x.id !== id));
  if (t0 === "exa") return <Examen evals={evals} onSave={save} onDel={del} />;
  if (t0 === "ent") return <Entrevista evals={evals} onSave={save} onDel={del} />;
  return <Elegibles evals={evals} />;
}

function Head({ cand, setCand, rango, fecha, setFecha, extra }: { cand: string; setCand: (s: string) => void; rango: string; fecha: string; setFecha: (s: string) => void; extra?: React.ReactNode }) {
  const names = useMemo(CANDS, []);
  return (
    <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_12rem_10rem_auto]">
      <Field label="Candidato"><Input list="sg-c" value={cand} onChange={e => setCand(e.target.value)} placeholder="Nombre del agente" /><datalist id="sg-c">{names.map(n => <option key={n} value={n} />)}</datalist></Field>
      <Field label="Rango actual"><Input value={rango} readOnly placeholder="Se completa solo" /></Field>
      <Field label="Fecha"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
      {extra}
    </Card>
  );
}

function Result({ items }: { items: [string, string, string?][] }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map(([l, v, c]) => (
    <Card key={l} className="p-4 text-center"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className={cn("font-display mt-1 text-2xl font-semibold", c)}>{v}</p></Card>))}</div>;
}

function History({ evals, tipo, onOpen, onDel }: { evals: Eval[]; tipo: Eval["tipo"]; onOpen: (e: Eval) => void; onDel: (id: string) => void }) {
  const { confirm } = useFeedback(), L = evals.filter(e => e.tipo === tipo).sort((a, b) => b.ts - a.ts);
  if (!L.length) return null;
  return <Card className="overflow-hidden"><p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold dark:border-slate-800">Registradas ({L.length})</p>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(e => (
      <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", e.apto ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-300")}>{e.apto ? "APTO" : "NO APTO"}</span>
        <button onClick={() => onOpen(e)} className="min-w-0 flex-1 truncate text-left text-sm"><b>{e.cand}</b> <span className="text-slate-500">· {dmy(e.fecha)} · {Math.round(e.pct * 100)} %{e.tipo === "exa" ? ` · nota ${e.nota.toFixed(2)}` : ""} · evaluó {e.by}</span></button>
        <button aria-label="Eliminar" onClick={async () => { if (await confirm(`¿Eliminar la evaluación de ${e.cand}?`, { danger: true })) onDel(e.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
      </div>))}</div></Card>;
}

/* ---------- Fase II: examen escrito ---------- */
function Examen({ evals, onSave, onDel }: { evals: Eval[]; onSave: (e: Eval) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [bank, setBank] = useJSON<Q[]>(K_BANK, BANK0);
  const [cur, setCur] = useState<Eval | null>(null), [edit, setEdit] = useState(false);
  const blank = (): Eval => ({ id: "", tipo: "exa", cand: "", rango: "", fecha: today(), anios: 0, notas: {}, obs: {}, pct: 0, nota: 0, apto: false, by: me.n, ts: 0, qs: bank.map(q => ({ id: q.id, t: q.q })) });
  const e = cur || blank(), qs = bank;
  const set = (p: Partial<Eval>) => setCur({ ...e, ...p });
  const graded = qs.filter(q => e.notas[q.id]), pts = qs.reduce((a, q) => a + gradeVal(e.notas[q.id] || ""), 0);
  const pct = qs.length ? pts / qs.length : 0, nota = pct * 10 + bonus(e.anios), done = graded.length === qs.length && qs.length > 0, apto = pct >= 0.7;
  const txt = [`## 📝 Examen escrito · Ascenso a Sargento I`, `**Candidato:** ${e.cand || "—"} (${e.rango || "—"}) · **Fecha:** ${dmy(e.fecha)}`, "",
    ...AREAS_EXA.map(a => { const l = qs.filter(q => q.a === a); if (!l.length) return ""; const p = l.reduce((s, q) => s + gradeVal(e.notas[q.id] || ""), 0); return `**${a}:** ${p}/${l.length}`; }).filter(Boolean), "",
    `**Resultado:** ${Math.round(pct * 100)} % · ${pts}/${qs.length} · antigüedad +${bonus(e.anios).toFixed(2)} → **nota ${nota.toFixed(2)}**`,
    `**${done ? (apto ? "✅ APTO" : "❌ NO APTO") : "⏳ PENDIENTE"}** (corte 70 %)`, `-# Evaluó: ${me.n}`].join("\n");
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3 text-sm text-slate-500"><ClipboardCheck className="size-4 text-brand-500" />
        Fase II · corte <b>70 %</b> · +0,25 por año de antigüedad (máx. +2,00) · {qs.length} preguntas en {AREAS_EXA.length} áreas
        <Button size="sm" variant="outline" className="ml-auto" icon={<Pencil />} onClick={() => setEdit(true)}>Banco de preguntas</Button></Card>
      <Head cand={e.cand} setCand={c => set({ cand: c, rango: findAgent(c) ? rankES(findAgent(c)!.r) : "" })} rango={e.rango} fecha={e.fecha} setFecha={f => set({ fecha: f })}
        extra={<Field label="Años de servicio"><Input type="number" min={0} max={30} className="w-28" value={e.anios || 0} onChange={x => set({ anios: +x.target.value })} /></Field>} />
      {AREAS_EXA.map(a => { const l = qs.filter(q => q.a === a); return l.length ? <section key={a} className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{a}</p>
        {l.map((q, i) => { const g = (e.notas[q.id] || "") as Grade; return (
          <Card key={q.id} className={cn("space-y-2 border-l-4 p-4", g === "ok" ? "border-l-emerald-500" : g === "mid" ? "border-l-amber-400" : g === "no" ? "border-l-red-500" : "border-l-transparent")}>
            <div className="flex flex-wrap items-start gap-3"><p className="min-w-[16rem] flex-1 text-sm"><b className="mr-2 text-slate-400">{i + 1}.</b>{q.q}</p>
              <div className="flex gap-1">{([["ok", "Correcta", Check, "emerald"], ["mid", "Parcial", Minus, "amber"], ["no", "Incorrecta", X, "red"]] as const).map(([v, l, I]) =>
                <button key={v} title={l} onClick={() => set({ notas: { ...e.notas, [q.id]: g === v ? "" : v } })}
                  className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition", g === v ? (v === "ok" ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : v === "mid" ? "border-amber-400 bg-amber-400/15 text-amber-700 dark:text-amber-300" : "border-red-500 bg-red-500/15 text-red-600 dark:text-red-300") : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800")}><I className="size-3.5" />{l}</button>)}</div></div>
            {q.r && <details className="text-xs text-slate-500"><summary className="cursor-pointer select-none">Respuesta esperada</summary><p className="mt-1 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">{q.r}</p></details>}
            <Input className="h-8 text-xs" value={e.obs[q.id] || ""} onChange={x => set({ obs: { ...e.obs, [q.id]: x.target.value } })} placeholder="Observación (opcional)…" />
          </Card>); })}</section> : null; })}
      <Result items={[["Puntaje", `${pts}/${qs.length}`], ["Porcentaje", `${Math.round(pct * 100)} %`], ["Nota (con antigüedad)", nota.toFixed(2)], ["Resultado", done ? (apto ? "APTO" : "NO APTO") : "Pendiente", done ? (apto ? "text-emerald-500" : "text-red-500") : "text-amber-500"]]} />
      <div className="flex flex-wrap justify-end gap-2">
        {cur?.id && <Button variant="ghost" onClick={() => setCur(null)}>Nueva evaluación</Button>}
        <Button icon={<Save />} onClick={() => { if (!e.cand.trim()) { toast("Elegí el candidato", "err"); return; } if (!done) { toast("Faltan preguntas por corregir", "err"); return; }
          const r = { ...e, id: e.id || uid(), pct, nota, apto, ts: e.ts || Date.now(), by: me.n, qs: qs.map(q => ({ id: q.id, t: q.q })) }; onSave(r); setCur(r); toast("Examen registrado"); }}>Registrar examen</Button>
      </div>
      <DiscordOutput title="Resultado del examen" text={txt} sticky={false} />
      <History evals={evals} tipo="exa" onOpen={setCur} onDel={onDel} />
      {edit && <BankEditor bank={bank} onClose={() => setEdit(false)} onSave={b => { setBank(b); setEdit(false); toast("Banco de preguntas actualizado"); }} />}
    </div>
  );
}

function BankEditor({ bank, onSave, onClose }: { bank: Q[]; onSave: (b: Q[]) => void; onClose: () => void }) {
  const [b, setB] = useState(bank), [paste, setPaste] = useState("");
  const imp = () => { const rows = paste.split(/\r?\n/).map(l => l.split(/\t|\s\|\s/).map(x => x.trim())).filter(r => r[0] && r[1]);
    const add = rows.map(([a, q, r]) => ({ id: uid(), a: AREAS_EXA.find(x => x.toLowerCase() === a.toLowerCase()) || a, q, r: r || "" }));
    setB([...b, ...add]); setPaste(""); };
  return (
    <Modal open onClose={onClose} title="Banco de preguntas del examen" desc="Se usa en todos los exámenes nuevos. Los ya registrados no cambian." icon={<Pencil />} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Save />} onClick={() => onSave(b.filter(q => q.q.trim()))}>Guardar banco</Button></>}>
      <div className="space-y-2">{b.map((q, i) => (
        <div key={q.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-[12rem_1fr_auto]">
          <Select value={q.a} onChange={e => setB(b.map(x => x.id === q.id ? { ...x, a: e.target.value } : x))}>{[...new Set([...AREAS_EXA, q.a])].map(a => <option key={a}>{a}</option>)}</Select>
          <div className="space-y-2"><Input value={q.q} placeholder={`Pregunta ${i + 1}`} onChange={e => setB(b.map(x => x.id === q.id ? { ...x, q: e.target.value } : x))} />
            <Input className="text-xs" value={q.r} placeholder="Respuesta esperada (guía para corregir)" onChange={e => setB(b.map(x => x.id === q.id ? { ...x, r: e.target.value } : x))} /></div>
          <button aria-label="Quitar" onClick={() => setB(b.filter(x => x.id !== q.id))} className="self-start rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
        </div>))}
        <Button variant="outline" icon={<Plus />} onClick={() => setB([...b, { id: uid(), a: AREAS_EXA[0], q: "", r: "" }])}>Agregar pregunta</Button>
      </div>
      <Field label="Importar desde Google Sheets" hint="(copiá las columnas Área · Pregunta · Respuesta y pegalas acá)">
        <Textarea rows={4} className="font-mono text-xs" value={paste} onChange={e => setPaste(e.target.value)} placeholder={"Marco legal\t¿Qué derechos…?\tGuardar silencio, abogado…"} /></Field>
      <div className="flex justify-end"><Button variant="outline" icon={<ClipboardPaste />} disabled={!paste.trim()} onClick={imp}>Agregar las filas pegadas</Button></div>
    </Modal>
  );
}

/* ---------- Fase III: entrevista (Oral Board) ---------- */
function Entrevista({ evals, onSave, onDel }: { evals: Eval[]; onSave: (e: Eval) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const blank = (): Eval => ({ id: "", tipo: "ent", cand: "", rango: "", fecha: today(), notas: {}, obs: {}, pct: 0, nota: 0, apto: false, by: me.n, ts: 0 });
  const [cur, setCur] = useState<Eval | null>(null), [rep, setRep] = useState<Record<number, boolean>>({});
  const e = cur || blank(), set = (p: Partial<Eval>) => setCur({ ...e, ...p });
  const MAX = ENT.length * 5, vals = ENT.map((_, i) => Number(e.notas["q" + i]) || 0), n = vals.filter(Boolean).length, tot = vals.reduce((a, b) => a + b, 0);
  const pct = tot / MAX, done = n === ENT.length, apto = done && pct >= 0.7;
  const txt = [`## 🎙️ Entrevista de ascenso · Sargento (Oral Board)`, `**Candidato:** ${e.cand || "—"} (${e.rango || "—"}) · **Fecha:** ${dmy(e.fecha)}`, "",
    ...ENT.map(([q], i) => `**P${i + 1}** ${"★".repeat(vals[i])}${"☆".repeat(5 - vals[i])}${e.obs["q" + i] ? ` — ${e.obs["q" + i]}` : ""}\n-# ${q}`), "",
    `**Total:** ${tot}/${MAX} · **Media:** ${n ? (tot / n).toFixed(1) : "—"}/5 · **${done ? (apto ? "✅ APTO" : "❌ NO APTO") : "⏳ PENDIENTE"}** (umbral 70 %)`, `-# Tribunal: ${me.n}`].join("\n");
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3 text-sm text-slate-500"><MessageCircle className="size-4 text-brand-500" />Fase III · Oral Board · cada pregunta del 1 al 5 · apto con <b>70 %</b> (eliminatorio aunque el examen sea bueno)</Card>
      <Head cand={e.cand} setCand={c => set({ cand: c, rango: findAgent(c) ? rankES(findAgent(c)!.r) : "" })} rango={e.rango} fecha={e.fecha} setFecha={f => set({ fecha: f })} />
      <div className="space-y-2">{ENT.map(([q, r], i) => (
        <Card key={i} className={cn("grid gap-3 p-4 sm:grid-cols-[2rem_1fr_auto]", vals[i] && "border-l-4 border-l-amber-400")}>
          <b className="text-slate-400">{i + 1}</b>
          <div className="space-y-2"><p className="text-sm leading-relaxed">{q}</p>
            {rep[i] && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">Repreguntas: {r}</p>}
            <div className="flex gap-2"><button title="Ver repreguntas" onClick={() => setRep({ ...rep, [i]: !rep[i] })} className={cn("rounded-lg border px-2 text-sm transition", rep[i] ? "border-amber-400 text-amber-500" : "border-slate-200 text-slate-400 dark:border-slate-700")}>💬</button>
              <Input className="h-8 text-xs" value={e.obs["q" + i] || ""} onChange={x => set({ obs: { ...e.obs, ["q" + i]: x.target.value } })} placeholder="Observación (opcional)…" /></div></div>
          <div className="flex gap-0.5 self-start" role="radiogroup" aria-label={`Puntaje de la pregunta ${i + 1}`}>{[1, 2, 3, 4, 5].map(v =>
            <button key={v} role="radio" aria-checked={vals[i] === v} title={`${v} de 5`} onClick={() => set({ notas: { ...e.notas, ["q" + i]: vals[i] === v ? 0 : v } })}>
              <Star className={cn("size-6 transition", v <= vals[i] ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300 dark:text-slate-600")} /></button>)}</div>
        </Card>))}</div>
      <Result items={[["Total", n ? String(tot) : "—"], ["Máximo", String(MAX)], ["Media", n ? (tot / n).toFixed(1) : "—"], ["Resultado", done ? (apto ? "APTA" : "NO APTA") : n ? "Pendiente" : "—", done ? (apto ? "text-emerald-500" : "text-red-500") : "text-amber-500"]]} />
      <div className="flex flex-wrap justify-end gap-2">
        {cur?.id && <Button variant="ghost" onClick={() => { setCur(null); setRep({}); }}>Nueva entrevista</Button>}
        <Button icon={<Save />} onClick={() => { if (!e.cand.trim()) { toast("Elegí el candidato", "err"); return; } if (!done) { toast("Faltan preguntas por puntuar", "err"); return; }
          const r = { ...e, id: e.id || uid(), pct, nota: pct * 10, apto, ts: e.ts || Date.now(), by: me.n }; onSave(r); setCur(r); toast("Entrevista registrada"); }}>Registrar entrevista</Button>
      </div>
      <DiscordOutput title="Resumen de la entrevista" text={txt} sticky={false} />
      <History evals={evals} tipo="ent" onOpen={x => { setCur(x); setRep({}); }} onDel={onDel} />
    </div>
  );
}

/* ---------- lista de elegibles ---------- */
function Elegibles({ evals }: { evals: Eval[] }) {
  const last = (n: string, t: Eval["tipo"]) => evals.filter(e => e.cand === n && e.tipo === t).sort((a, b) => b.ts - a.ts)[0];
  const rows = [...new Set(evals.map(e => e.cand))].map(n => { const x = last(n, "exa"), y = last(n, "ent");
    const elig = !!(x?.apto && y?.apto), total = (x?.nota || 0) + (y ? y.pct * 10 : 0); return { n, x, y, elig, total }; })
    .sort((a, b) => +b.elig - +a.elig || b.total - a.total);
  const copy = (s: string) => navigator.clipboard?.writeText(s);
  const txt = [`## 🏅 Lista de elegibles · Ascenso a Sargento I`, ...rows.filter(r => r.elig).map((r, i) => `**${i + 1}.** ${r.n} — examen ${r.x!.nota.toFixed(2)} · entrevista ${(r.y!.pct * 10).toFixed(2)} · **total ${r.total.toFixed(2)}**`),
    "", "-# Las vacantes se cubren de mayor a menor puntuación. Aprobar no implica ascenso automático."].join("\n");
  if (!rows.length) return <Card><Empty icon={<Trophy />} title="Sin evaluaciones" desc="Registrá exámenes y entrevistas para armar la lista de elegibles." /></Card>;
  return (
    <div className="space-y-5">
      <Card className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800"><th className="px-4 py-3">#</th><th>Candidato</th><th>Examen</th><th>Entrevista</th><th>Total</th><th className="pr-4">Estado</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.n} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
            <td className="px-4 py-2.5 font-semibold text-slate-400">{r.elig ? i + 1 : "—"}</td><td className="font-semibold">{r.n}</td>
            <td>{r.x ? <span className={r.x.apto ? "" : "text-red-500"}>{r.x.nota.toFixed(2)} ({Math.round(r.x.pct * 100)} %)</span> : <span className="text-slate-400">Falta</span>}</td>
            <td>{r.y ? <span className={r.y.apto ? "" : "text-red-500"}>{(r.y.pct * 10).toFixed(2)} ({Math.round(r.y.pct * 100)} %)</span> : <span className="text-slate-400">Falta</span>}</td>
            <td className="font-display font-semibold">{r.total.toFixed(2)}</td>
            <td className="pr-4"><span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", r.elig ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : r.x && r.y ? "bg-red-500/10 text-red-600 dark:text-red-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{r.elig ? "ELEGIBLE" : r.x && r.y ? "NO APTO" : "EN PROCESO"}</span></td>
          </tr>))}</tbody></table></Card>
      <DiscordOutput title="Lista de elegibles" text={txt} sticky={false} extra={<Button size="sm" variant="ghost" icon={<Copy />} onClick={() => copy(rows.map(r => `${r.n}\t${r.x?.nota.toFixed(2) || ""}\t${r.y ? (r.y.pct * 10).toFixed(2) : ""}\t${r.total.toFixed(2)}`).join("\n"))}>Copiar para Sheets</Button>} />
    </div>
  );
}
