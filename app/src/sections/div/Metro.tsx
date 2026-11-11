/* METRO · exámenes para aspirantes a instructor de la academia: entrevista con hoja de puntuación (1–5, pesos por bloque, máx. 60),
   examen escrito (banco editable, nota /10, corte 70 %) y lista de elegibles (examen ×4 + entrevista = /100). */
import { useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, MessageCircle, Minus, Pencil, Plus, Save, Star, Trash2, Trophy, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { AgentCombo } from "@/components/agents";
import { findAgent, getRoster, hoyISO, lvl, rankES, uid } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { uMap } from "@/lib/units";
import { cn } from "@/lib/cn";

type Grade = "" | "ok" | "mid" | "no";
type Ev = { id: string; tipo: "exa" | "ent"; cand: string; rango: string; fecha: string; notas: Record<string, Grade | number>; obs: Record<string, string>;
  pts: number; apto: string; by: string; ts: number; fil?: Record<string, boolean>; fort?: string; mej?: string; dec?: string };
type Q = { id: string; a: string; q: string; r: string };
const K_EV = "lspdt.mdx.eval", K_BANK = "lspdt.mdx.bank";
const dmy = (s: string) => (s ? s.split("-").reverse().join("/") : "—");
const f1 = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/* ---------- entrevista ---------- */
const BLOQ: [string, number, string[]][] = [
  ["Motivación y trayectoria", 1, ["¿Por qué quieres ser instructor de la academia Metro?", "¿Cuánto tiempo llevas en la Metropolitan Division y qué cargos has ocupado?", "¿Qué crees que puedes aportar a los nuevos aspirantes?"]],
  ["Conocimiento y experiencia", 2, ["¿Qué diferencia a Metro de otras divisiones y qué debe saber un aspirante desde el primer día?", "¿En qué áreas te sientes más fuerte (tácticas, tiro, conducción, liderazgo, procedimientos)?", "¿En cuál crees que necesitas mejorar?", "Explícame cómo harías una entrada táctica o un procedimiento de tu elección."]],
  ["Capacidad de enseñar", 3, ["¿Has instruido o guiado a alguien antes? ¿Cómo fue?", "¿Cómo estructurarías una clase de 30 minutos?", "¿Cómo explicarías un mismo procedimiento a alguien que aprende rápido y a alguien que va lento?", "¿Cómo evaluarías si un aspirante está listo para pasar?"]],
  ["Situaciones prácticas", 3, ["Un aspirante falla el mismo ejercicio tres veces. ¿Qué haces?", "Un aspirante te discute o cuestiona tu corrección delante del grupo. ¿Cómo reaccionas?", "Ves a otro instructor enseñando algo incorrecto o saltándose el reglamento. ¿Qué haces?", "Un aspirante es muy bueno pero tiene mala actitud. ¿Lo apruebas?"]],
  ["Actitud y disciplina", 2, ["¿Cómo manejas la presión y las críticas?", "¿Has tenido sanciones o llamadas de atención? ¿Qué aprendiste?", "¿Cuál es tu disponibilidad semanal y cómo la compaginarías con tus patrullas?"]],
  ["Cierre", 1, ["¿Qué cambiarías de la academia actual?", "¿Hay algo más que quieras que tengamos en cuenta?"]],
];
/* peso de cada bloque: cuanto más pesa, más resalta */
const W_ST: Record<number, { c: string; l: string }> = { 1: { c: "#64748b", l: "vale x1" }, 2: { c: "#f59e0b", l: "vale el doble · x2" }, 3: { c: "#ef4444", l: "vale el triple · x3" } };
function WBadge({ w, big }: { w: number; big?: boolean }) { const S = W_ST[w];
  return <span className={cn("inline-flex items-center gap-1 rounded-md border font-bold tracking-normal", big ? "px-2 py-0.5 text-xs" : "px-1.5 text-[10px]")} style={{ color: S.c, borderColor: S.c + "66", background: S.c + "1a" }}>{"★".repeat(w)}<span>{big ? S.l : "x" + w}</span></span>; }
const QS = BLOQ.flatMap(([b, w, l]) => l.map(q => ({ b, w, q }))).map((x, i) => ({ ...x, n: i + 1 }));
const FIL: [string, string][] = [["san", "Sanciones graves recientes sin aprendizaje demostrado"], ["disp", "Disponibilidad insuficiente para dar clase"]];
const RES = (p: number) => (p >= 48 ? "Apto" : p >= 36 ? "Apto con seguimiento" : "No apto");
const RES_C: Record<string, string> = { "Apto": "text-emerald-500", "Apto con seguimiento": "text-amber-500", "No apto": "text-red-500" };
function entScore(e: Ev) {
  const v = (n: number) => Number(e.notas["q" + n]) || 0;
  const bl = BLOQ.map(([b, w, l]) => { const ns = QS.filter(q => q.b === b).map(q => v(q.n)), m = ns.reduce((a, x) => a + x, 0) / l.length; return { b, w, m, s: m * w }; });
  const pts = bl.reduce((a, x) => a + x.s, 0), done = QS.every(q => v(q.n) > 0);
  const elim = [v(14) > 0 && v(14) < 3 && "Pregunta 14 con menos de 3", v(15) > 0 && v(15) < 3 && "Pregunta 15 con menos de 3", ...FIL.filter(([k]) => e.fil?.[k]).map(([, l]) => l)].filter(Boolean) as string[];
  return { bl, pts, done, elim, res: elim.length ? "No apto" : RES(pts) };
}

/* ---------- examen escrito ---------- */
const AREAS = ["Táctica y procedimientos", "Armamento y tiro", "Conducción y persecución", "Instrucción y liderazgo"];
const BANK0: Q[] = [
  ["Táctica y procedimientos", "¿Cuáles son los pasos de una entrada táctica a un inmueble?", "Planificación y reparto de roles, aproximación cubierta, aviso/identificación, entrada por el punto elegido, despeje por sectores (esquinas y puntos muertos), control de sujetos y comunicación constante."],
  ["Táctica y procedimientos", "¿Qué es un perímetro interior y uno exterior y para qué sirve cada uno?", "El interior contiene la amenaza y lo cubren unidades tácticas; el exterior controla accesos y aleja civiles y prensa."],
  ["Táctica y procedimientos", "¿Qué se informa por radio al llegar a una escena de alto riesgo?", "Unidad, ubicación exacta, situación observada, número de sospechosos y armas, heridos, y qué apoyo se necesita."],
  ["Armamento y tiro", "¿Qué reglas básicas de seguridad con armas debe repetir un instructor?", "Tratar toda arma como cargada, no apuntar a nada que no se quiera disparar, dedo fuera del gatillo hasta decidir disparar, conocer el blanco y lo que hay detrás."],
  ["Armamento y tiro", "¿Cuándo está justificado el uso del arma de fuego?", "Solo ante un peligro inminente para la vida o la integridad propia o de terceros, sin alternativa menos lesiva."],
  ["Armamento y tiro", "¿Qué hace un tirador cuando se le traba el arma en un enfrentamiento?", "Avisa al equipo, busca cobertura, resuelve la interrupción (o pasa al arma secundaria) y vuelve a la línea cuando está operativo."],
  ["Conducción y persecución", "¿Qué factores evalúa el mando para mantener o cancelar una persecución?", "Riesgo para civiles y agentes, tráfico y zona, gravedad del delito, velocidad y estado de la vía, y si hay apoyo aéreo para seguirlo sin riesgo."],
  ["Conducción y persecución", "¿Cuál es el orden de las unidades en una persecución y qué hace cada una?", "Unidad principal (persigue y cuenta por radio), secundaria (apoya y releva) y el resto se posiciona para cortar o hacer PIT si se autoriza."],
  ["Instrucción y liderazgo", "¿Cómo se estructura una clase práctica de 30 minutos?", "Objetivo y explicación breve, demostración, práctica guiada, práctica individual con corrección y cierre con repaso y dudas."],
  ["Instrucción y liderazgo", "¿Cómo se corrige a un aspirante delante del grupo sin perder autoridad ni humillarlo?", "Corrección breve y concreta sobre la acción, sin juicios personales; lo demás en privado al terminar."],
  ["Instrucción y liderazgo", "¿Qué hace un instructor si ve a otro enseñando algo contrario al reglamento?", "No lo desautoriza delante del grupo: se lo comenta en privado y, si persiste, lo eleva a la coordinación."],
].map(([a, q, r], i) => ({ id: "m" + i, a, q, r }));
const gv = (g: Grade | number) => (g === "ok" ? 1 : g === "mid" ? 0.5 : 0);

export function MetroExam({ tab }: { tab: "exa" | "ent" | "list" }) {
  useStoreVersion();
  const [evs, setEvs] = useJSON<Ev[]>(K_EV, []);
  const save = (e: Ev) => setEvs([...evs.filter(x => x.id !== e.id), e]), del = (id: string) => setEvs(evs.filter(x => x.id !== id));
  return tab === "ent" ? <Ent evs={evs} onSave={save} onDel={del} /> : tab === "exa" ? <Exa evs={evs} onSave={save} onDel={del} /> : <List evs={evs} />;
}

const cands = () => { const m = uMap("md"); const L = getRoster().filter(a => lvl(a.r) > 0).map(a => a.n); return [...Object.keys(m).filter(n => L.includes(n)), ...L.filter(n => !m[n])]; };
function Head({ e, set }: { e: Ev; set: (p: Partial<Ev>) => void }) {
  const names = useMemo(cands, []), m = uMap("md");
  return (
    <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_12rem_10rem]">
      <Field label="Candidato"><AgentCombo value={e.cand} onChange={c => set({ cand: c, rango: findAgent(c) ? rankES(findAgent(c)!.r) : "" })} names={names} sub={n => (m[n] ? "METRO" : "Fuera de la METRO")} placeholder="Buscar candidato…" /></Field>
      <Field label="Rango"><Input value={e.rango} readOnly placeholder="Se completa solo" /></Field>
      <Field label="Fecha"><Input type="date" value={e.fecha} onChange={x => set({ fecha: x.target.value })} /></Field>
    </Card>);
}
function Hist({ evs, tipo, onOpen, onDel }: { evs: Ev[]; tipo: Ev["tipo"]; onOpen: (e: Ev) => void; onDel: (id: string) => void }) {
  const { confirm } = useFeedback(), L = evs.filter(e => e.tipo === tipo).sort((a, b) => b.ts - a.ts); if (!L.length) return null;
  return <Card className="overflow-hidden"><p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold dark:border-slate-800">Registradas ({L.length})</p>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(e => (
      <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", e.apto.startsWith("Apto") ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-300")}>{e.apto.toUpperCase()}</span>
        <button onClick={() => onOpen(e)} className="min-w-0 flex-1 truncate text-left text-sm"><b>{e.cand}</b> <span className="text-slate-500">· {dmy(e.fecha)} · {tipo === "ent" ? `${f1(e.pts)}/60` : `nota ${f1(e.pts, 2)}/10`} · {e.by}</span></button>
        <button aria-label="Eliminar" onClick={async () => { if (await confirm(`¿Eliminar la evaluación de ${e.cand}?`, { danger: true })) onDel(e.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
      </div>))}</div></Card>;
}

function Ent({ evs, onSave, onDel }: { evs: Ev[]; onSave: (e: Ev) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const blank = (): Ev => ({ id: "", tipo: "ent", cand: "", rango: "", fecha: hoyISO(), notas: {}, obs: {}, pts: 0, apto: "", by: me.n, ts: 0, fil: {}, fort: "", mej: "", dec: "" });
  const [cur, setCur] = useState<Ev | null>(null), e = cur || blank(), set = (p: Partial<Ev>) => setCur({ ...e, ...p });
  const S = entScore(e), dec = e.dec || S.res;
  const txt = [`## 🎓 Entrevista · Instructor Academia Metro`, `**Candidato:** ${e.cand || "—"} (${e.rango || "—"}) · **Entrevistador:** ${me.n} · **Fecha:** ${dmy(e.fecha)}`, "",
    ...S.bl.map(b => `**${b.b}** (x${b.w}): media ${f1(b.m, 2)} → ${f1(b.s, 2)} pts`), "",
    `**Puntuación:** ${f1(S.pts)}/60`, ...(S.elim.length ? [`⚠️ **Filtros eliminatorios:** ${S.elim.join(" · ")}`] : []),
    ...(e.fort ? [`**Fortalezas:** ${e.fort}`] : []), ...(e.mej ? [`**A mejorar:** ${e.mej}`] : []),
    `**Decisión final:** ${S.done ? (dec === "Apto" ? "✅" : dec === "No apto" ? "❌" : "🟡") + " " + dec : "⏳ Pendiente"}`].join("\n");
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3 text-sm text-slate-500"><MessageCircle className="size-4 text-brand-500" />
        Cada pregunta del 1 al 5 · media de cada bloque × su peso · máximo <b>60</b> · <b>48–60</b> apto · <b>36–47</b> apto con seguimiento · menos de 36 no apto
        <span className="ml-auto flex gap-1.5"><WBadge w={1} /><WBadge w={2} /><WBadge w={3} /></span></Card>
      <Head e={e} set={set} />
      {BLOQ.map(([b, w]) => { const bl = S.bl.find(x => x.b === b)!; return (
        <section key={b} className="space-y-2 rounded-2xl" style={w > 1 ? { boxShadow: `inset 3px 0 0 ${W_ST[w].c}`, paddingLeft: 10 } : undefined}>
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{b}<WBadge w={w} big /><span className="ml-auto normal-case tracking-normal">media {f1(bl.m, 2)} × {w} = <b className="text-slate-700 dark:text-slate-200">{f1(bl.s, 2)} pts</b> <span className="text-slate-400">(máx. {5 * w})</span></span></p>
          {QS.filter(q => q.b === b).map(q => { const v = Number(e.notas["q" + q.n]) || 0, crit = q.n === 14 || q.n === 15; return (
            <Card key={q.n} className={cn("grid gap-3 p-4 sm:grid-cols-[2.6rem_1fr_auto]", v && "border-l-4", v && (v >= 4 ? "border-l-emerald-500" : v === 3 ? "border-l-amber-400" : "border-l-red-500"))}>
              <span className="flex flex-col items-start gap-1"><b className="text-slate-400">{q.n}</b><WBadge w={q.w} /></span>
              <div className="space-y-2"><p className="text-sm leading-relaxed">{q.q}{crit && <span className="ml-2 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-300">eliminatoria si es menos de 3</span>}</p>
                <Input className="h-8 text-xs" value={e.obs["q" + q.n] || ""} onChange={x => set({ obs: { ...e.obs, ["q" + q.n]: x.target.value } })} placeholder="Observación (opcional)…" /></div>
              <div className="flex gap-0.5 self-start" role="radiogroup" aria-label={`Puntaje de la pregunta ${q.n}`}>{[1, 2, 3, 4, 5].map(s =>
                <button key={s} role="radio" aria-checked={v === s} title={`${s} de 5`} onClick={() => set({ notas: { ...e.notas, ["q" + q.n]: v === s ? 0 : s } })}>
                  <Star className={cn("size-6 transition", s <= v ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300 dark:text-slate-600")} /></button>)}</div>
            </Card>); })}
        </section>); })}
      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="size-4 text-red-500" />Filtros eliminatorios <span className="font-normal text-slate-500">(aunque la puntuación sea alta)</span></p>
        {FIL.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!e.fil?.[k]} onChange={x => set({ fil: { ...e.fil, [k]: x.target.checked } })} />{l}</label>)}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fortalezas"><Textarea rows={2} value={e.fort || ""} onChange={x => set({ fort: x.target.value })} /></Field>
          <Field label="A mejorar"><Textarea rows={2} value={e.mej || ""} onChange={x => set({ mej: x.target.value })} /></Field>
        </div>
        <Field label="Decisión final" hint={`(sugerida: ${S.res})`}><div className="flex flex-wrap gap-1.5">{["Apto", "Apto con seguimiento", "No apto"].map(d =>
          <button key={d} onClick={() => set({ dec: e.dec === d ? "" : d })} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", dec === d ? "border-brand-500 bg-brand-600 text-white" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}>{d}</button>)}</div></Field>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{([["Puntuación", `${f1(S.pts)} / 60`], ["Resultado", S.res, RES_C[S.res]], ["Filtros", S.elim.length ? `${S.elim.length} activo${S.elim.length > 1 ? "s" : ""}` : "Ninguno", S.elim.length ? "text-red-500" : ""], ["Decisión", S.done ? dec : "Pendiente", S.done ? RES_C[dec] : "text-amber-500"]] as [string, string, string?][]).map(([l, v, c]) => (
        <Card key={l} className="p-4 text-center"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className={cn("font-display mt-1 text-xl font-semibold", c)}>{v}</p></Card>))}</div>
      <div className="flex flex-wrap justify-end gap-2">
        {cur?.id && <Button variant="ghost" onClick={() => setCur(null)}>Nueva entrevista</Button>}
        <Button icon={<Save />} onClick={() => { if (!e.cand) { toast("Elegí el candidato", "err"); return; } if (!S.done) { toast("Faltan preguntas por puntuar", "err"); return; }
          const r = { ...e, id: e.id || uid(), pts: S.pts, apto: dec, ts: e.ts || Date.now(), by: e.by || me.n }; onSave(r); setCur(r); toast("Entrevista registrada · pasa a la lista de elegibles"); }}>Registrar entrevista</Button>
      </div>
      <DiscordOutput title="Hoja de puntuación" text={txt} sticky={false} />
      <Hist evs={evs} tipo="ent" onOpen={setCur} onDel={onDel} />
    </div>
  );
}

function Exa({ evs, onSave, onDel }: { evs: Ev[]; onSave: (e: Ev) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [bank, setBank] = useJSON<Q[]>(K_BANK, BANK0), [ed, setEd] = useState(false);
  const blank = (): Ev => ({ id: "", tipo: "exa", cand: "", rango: "", fecha: hoyISO(), notas: {}, obs: {}, pts: 0, apto: "", by: me.n, ts: 0 });
  const [cur, setCur] = useState<Ev | null>(null), e = cur || blank(), set = (p: Partial<Ev>) => setCur({ ...e, ...p });
  const got = bank.reduce((a, q) => a + gv(e.notas[q.id] || ""), 0), pct = bank.length ? got / bank.length : 0, nota = pct * 10, done = bank.every(q => e.notas[q.id]), apto = pct >= 0.7;
  const txt = [`## 📝 Examen escrito · Instructor Academia Metro`, `**Candidato:** ${e.cand || "—"} (${e.rango || "—"}) · **Fecha:** ${dmy(e.fecha)}`, "",
    ...AREAS.map(a => { const l = bank.filter(q => q.a === a); return l.length ? `**${a}:** ${l.reduce((s, q) => s + gv(e.notas[q.id] || ""), 0)}/${l.length}` : ""; }).filter(Boolean), "",
    `**Resultado:** ${Math.round(pct * 100)} % → **nota ${f1(nota, 2)}/10** · **${done ? (apto ? "✅ APTO" : "❌ NO APTO") : "⏳ PENDIENTE"}** (corte 70 %)`, `-# Evaluó: ${me.n}`].join("\n");
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3 text-sm text-slate-500"><ClipboardCheck className="size-4 text-brand-500" />Nota sobre 10 · corte <b>70 %</b> · {bank.length} preguntas
        <Button size="sm" variant="outline" className="ml-auto" icon={<Pencil />} onClick={() => setEd(true)}>Banco de preguntas</Button></Card>
      <Head e={e} set={set} />
      {[...new Set([...AREAS, ...bank.map(q => q.a)])].map(a => { const l = bank.filter(q => q.a === a); return l.length ? <section key={a} className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{a}</p>
        {l.map((q, i) => { const g = (e.notas[q.id] || "") as Grade; return (
          <Card key={q.id} className={cn("space-y-2 border-l-4 p-4", g === "ok" ? "border-l-emerald-500" : g === "mid" ? "border-l-amber-400" : g === "no" ? "border-l-red-500" : "border-l-transparent")}>
            <div className="flex flex-wrap items-start gap-3"><p className="min-w-[16rem] flex-1 text-sm"><b className="mr-2 text-slate-400">{i + 1}.</b>{q.q}</p>
              <div className="flex gap-1">{([["ok", "Correcta", Check], ["mid", "Parcial", Minus], ["no", "Incorrecta", X]] as const).map(([v, lb, I]) =>
                <button key={v} onClick={() => set({ notas: { ...e.notas, [q.id]: g === v ? "" : v } })} className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition", g === v ? (v === "ok" ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : v === "mid" ? "border-amber-400 bg-amber-400/15 text-amber-700 dark:text-amber-300" : "border-red-500 bg-red-500/15 text-red-600 dark:text-red-300") : "border-slate-200 text-slate-500 dark:border-slate-700")}><I className="size-3.5" />{lb}</button>)}</div></div>
            {q.r && <details className="text-xs text-slate-500"><summary className="cursor-pointer select-none">Respuesta esperada</summary><p className="mt-1 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">{q.r}</p></details>}
          </Card>); })}</section> : null; })}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className={cn("mr-auto text-lg font-semibold", done ? (apto ? "text-emerald-500" : "text-red-500") : "text-amber-500")}>{Math.round(pct * 100)} % · {f1(nota, 2)}/10 · {done ? (apto ? "APTO" : "NO APTO") : "Pendiente"}</span>
        {cur?.id && <Button variant="ghost" onClick={() => setCur(null)}>Nueva evaluación</Button>}
        <Button icon={<Save />} onClick={() => { if (!e.cand) { toast("Elegí el candidato", "err"); return; } if (!done) { toast("Faltan preguntas por corregir", "err"); return; }
          const r = { ...e, id: e.id || uid(), pts: nota, apto: apto ? "Apto" : "No apto", ts: e.ts || Date.now(), by: e.by || me.n }; onSave(r); setCur(r); toast("Examen registrado · pasa a la lista de elegibles"); }}>Registrar examen</Button>
      </div>
      <DiscordOutput title="Resultado del examen" text={txt} sticky={false} />
      <Hist evs={evs} tipo="exa" onOpen={setCur} onDel={onDel} />
      {ed && <BankEd bank={bank} onClose={() => setEd(false)} onSave={b => { setBank(b); setEd(false); toast("Banco actualizado"); }} />}
    </div>
  );
}
function BankEd({ bank, onSave, onClose }: { bank: Q[]; onSave: (b: Q[]) => void; onClose: () => void }) {
  const [b, setB] = useState(bank);
  return (
    <Modal open onClose={onClose} title="Banco de preguntas · Metro" icon={<Pencil />} size="lg" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Save />} onClick={() => onSave(b.filter(q => q.q.trim()))}>Guardar</Button></>}>
      <div className="space-y-2">{b.map((q, i) => (
        <div key={q.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-[12rem_1fr_auto]">
          <Select value={q.a} onChange={e => setB(b.map(x => (x.id === q.id ? { ...x, a: e.target.value } : x)))}>{[...new Set([...AREAS, q.a])].map(a => <option key={a}>{a}</option>)}</Select>
          <div className="space-y-2"><Input value={q.q} placeholder={`Pregunta ${i + 1}`} onChange={e => setB(b.map(x => (x.id === q.id ? { ...x, q: e.target.value } : x)))} />
            <Input className="text-xs" value={q.r} placeholder="Respuesta esperada" onChange={e => setB(b.map(x => (x.id === q.id ? { ...x, r: e.target.value } : x)))} /></div>
          <button aria-label="Quitar" onClick={() => setB(b.filter(x => x.id !== q.id))} className="self-start rounded-lg p-2 text-slate-400 hover:text-red-600"><Trash2 className="size-4" /></button>
        </div>))}
        <Button variant="outline" icon={<Plus />} onClick={() => setB([...b, { id: uid(), a: AREAS[0], q: "", r: "" }])}>Agregar pregunta</Button></div>
    </Modal>);
}

/* ---------- lista de elegibles: la última evaluación de cada candidato ---------- */
function List({ evs }: { evs: Ev[] }) {
  const last = (n: string, t: Ev["tipo"]) => evs.filter(e => e.cand === n && e.tipo === t).sort((a, b) => b.ts - a.ts)[0];
  const rows = [...new Set(evs.map(e => e.cand))].map(n => { const x = last(n, "exa"), y = last(n, "ent"), fin = (x ? x.pts * 4 : 0) + (y ? y.pts : 0);
    const ok = !!x && !!y, elim = y ? entScore(y).elim.length > 0 : false, st = !ok ? "Incompleto" : elim || (x && x.apto === "No apto") ? "No apto" : y!.apto;
    return { n, r: (y || x)!.rango, x, y, fin, st }; }).sort((a, b) => b.fin - a.fin);
  const txt = ["## 🏅 Academia Metro · Lista de elegibles para instructor", "-# Nota final /100 = examen escrito (/10) × 4 + entrevista (/60)", "",
    ...rows.map((r, i) => `**${i + 1}.** ${r.n} (${r.r}) — examen ${r.x ? f1(r.x.pts, 2) : "—"} · entrevista ${r.y ? f1(r.y.pts) : "—"}/60 · **${f1(r.fin)}/100** · ${r.st}`)].join("\n");
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3 text-sm text-slate-500"><Trophy className="size-4 text-brand-500" />Se arma sola con la última entrevista y el último examen de cada candidato · nota final = examen × 4 + entrevista (/100)</Card>
      <Card className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm">
        <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800"><th className="px-3 py-3">#</th><th>Candidato</th><th className="text-right">Examen /10</th><th className="text-right">Entrevista /60</th><th className="text-right">Final /100</th><th className="px-3">Estado</th></tr></thead>
        <tbody>{rows.length ? rows.map((r, i) => (
          <tr key={r.n} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
            <td className="px-3 py-2 font-bold text-slate-400">{i + 1}</td><td><b>{r.n}</b> <span className="text-xs text-slate-500">{r.r}</span></td>
            <td className="text-right tabular-nums">{r.x ? f1(r.x.pts, 2) : "—"}</td><td className="text-right tabular-nums">{r.y ? f1(r.y.pts) : "—"}</td>
            <td className="font-display text-right font-semibold tabular-nums">{f1(r.fin)}</td>
            <td className="px-3"><span className={cn("text-xs font-semibold", RES_C[r.st] || "text-slate-400")}>{r.st}</span></td>
          </tr>)) : <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Todavía no hay evaluaciones.</td></tr>}</tbody></table></Card>
      <DiscordOutput title="Lista de elegibles" text={txt} sticky={false} />
    </div>
  );
}
