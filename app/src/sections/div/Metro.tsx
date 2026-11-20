/* METRO · exámenes para aspirantes a instructor de la academia: entrevista con hoja de puntuación (1–5, pesos por bloque, máx. 60),
   examen escrito (banco editable, nota /10, corte 70 %) y lista de elegibles (examen ×4 + entrevista = /100).
   Entrevista para Líder de Pelotón C (R30C, R40C…): 10 preguntas con el mismo sistema, centradas en el mando de un 487 o un 207. */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, Eye, Megaphone, MessageCircle, RotateCcw, Minus, Pencil, Plus, Save, Star, Trash2, Trophy, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { AgentCombo } from "@/components/agents";
import { dmy, findAgent, getRoster, hoyISO, lvl, rankES, uid } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { uMap } from "@/lib/units";
import { CS_CFG0, K_CFG, VERIF_EM, metroComm, type CsCfg } from "@/lib/mdcalls";
import { cn } from "@/lib/cn";

type Grade = "" | "ok" | "mid" | "no";
type Ev = { id: string; tipo: "exa" | "ent" | "lp"; cand: string; rango: string; fecha: string; notas: Record<string, Grade | number>; obs: Record<string, string>;
  pts: number; apto: string; by: string; ts: number; fil?: Record<string, boolean>; fort?: string; mej?: string; dec?: string; conv?: string };
/* convocatorias de la academia: cada una con sus postulantes (las evaluaciones viejas quedan en la C1) */
type Conv = { id: string; n: string; t: number; post: string[] };
const K_CONV = "lspdt.mdx.conv", CONV0: Conv[] = [{ id: "C1", n: "Convocatoria 1", t: 0, post: [] }];
const convOf = (e: Ev) => e.conv || "C1";
type Q = { id: string; a: string; q: string; r: string };
const K_EV = "lspdt.mdx.eval", K_BANK = "lspdt.mdx.bank";
const f1 = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/* ---------- entrevista ---------- */
const BLOQ: [string, number, string[]][] = [
  ["Motivación y trayectoria", 1, ["¿Qué te motiva a formar parte del equipo de instructores de la Metropolitan Division?",
    "¿Cuánto tiempo llevas en la Metropolitan Division? ¿A qué subdivisiones perteneces actualmente y en qué otras divisiones has estado?",
    "¿Qué crees que puedes aportar al equipo de instructores y a la formación de los nuevos aspirantes?"]],
  ["Conocimiento y experiencia", 2, ["¿Qué diferencia a la Metropolitan Division del resto de divisiones? ¿Qué conocimientos básicos debería tener un aspirante desde su ingreso?",
    "¿En qué áreas consideras que tienes más conocimientos o habilidades? (Táctica, armamento y tiro, conducción, liderazgo, procedimientos, etc.)",
    "¿En qué aspectos de tu formación o desempeño crees que aún necesitas mejorar?",
    "Explícanos cómo llevarías a cabo una entrada táctica en un inmueble (u otro procedimiento de tu elección), detallando los pasos y lo que tendrías en cuenta en cada uno."]],
  ["Capacidad de enseñar", 3, ["¿Tienes experiencia instruyendo, formando o guiando a otros agentes? Si es así, ¿cómo fue?",
    "¿Cómo organizarías una clase de 30 minutos, desde la introducción hasta la evaluación final?",
    "¿Cómo adaptarías tu forma de enseñar para explicar un mismo procedimiento a dos aspirantes con ritmos de aprendizaje distintos?",
    "¿Qué criterios usarías para decidir si un aspirante está preparado para superar una evaluación y avanzar en su formación?"]],
  ["Situaciones prácticas", 3, ["Un aspirante comete el mismo error en tres intentos seguidos de un ejercicio. ¿Cómo abordarías la situación y qué harías para ayudarlo a corregirlo?",
    "Durante una instrucción, un aspirante cuestiona una de tus correcciones delante del grupo. ¿Cómo gestionarías la situación?",
    "Observas que otro instructor enseña un procedimiento de forma incorrecta o incumple la normativa interna. ¿Cómo actuarías?",
    "Un aspirante tiene un excelente nivel técnico y operativo, pero mantiene una actitud inadecuada o poco profesional. ¿Debería aprobar? Justifica tu respuesta."]],
  ["Actitud y disciplina", 2, ["¿Cómo gestionas la presión y las críticas, sobre todo cuando vienen de superiores o compañeros?",
    "¿Has recibido sanciones disciplinarias o llamadas de atención durante tu trayectoria en la división? Si es así, ¿qué aprendiste de ellas?",
    "¿Cuál es tu disponibilidad semanal y cómo compaginarías tus responsabilidades como instructor con tus patrullas y obligaciones operativas?"]],
  ["Cierre", 1, ["¿Qué mejorarías o cambiarías de la academia actual para optimizar la formación de los nuevos aspirantes?",
    "¿Hay algo más de tu experiencia, trayectoria o motivación que consideres importante que tengamos en cuenta en esta selección?"]],
];
/* peso de cada bloque: cuanto más pesa, más resalta */
const W_ST: Record<number, { c: string; l: string }> = { 1: { c: "#64748b", l: "vale x1" }, 2: { c: "#f59e0b", l: "vale el doble · x2" }, 3: { c: "#ef4444", l: "vale el triple · x3" } };
function WBadge({ w, big }: { w: number; big?: boolean }) { const S = W_ST[w];
  return <span className={cn("inline-flex items-center gap-1 rounded-md border font-bold tracking-normal", big ? "px-2 py-0.5 text-xs" : "px-1.5 text-[10px]")} style={{ color: S.c, borderColor: S.c + "66", background: S.c + "1a" }}>{"★".repeat(w)}<span>{big ? S.l : "x" + w}</span></span>; }
const QS_I = BLOQ.flatMap(([b, w, l]) => l.map(q => ({ b, w, q }))).map((x, i) => ({ ...x, n: i + 1 }));
const FIL: [string, string][] = [["san", "Sanciones graves recientes sin aprendizaje demostrado"], ["disp", "Disponibilidad insuficiente para dar clase"]];

/* ---------- entrevista para Líder de Pelotón C: 10 preguntas, máx. 60. Pesa más el mando de un 487 (robo mayor) y de un 207 (secuestro / rehenes) ---------- */
const BLOQ_LP: [string, number, string[]][] = [
  ["Liderazgo y responsabilidad", 2, ["¿Qué significa para ti liderar un pelotón de 10 operadores de la Metropolitan Division? ¿Qué responsabilidades asumes ante tu equipo y ante la coordinación?",
    "Un operador de tu pelotón no cumple una orden directa en plena intervención. ¿Cómo actúas en ese momento y cómo lo gestionas después del servicio?"]],
  ["Mando de un 487 (robo mayor)", 3, ["Asumes el mando de un 487 con tu pelotón. Explica cómo lo organizas: reparto de unidades, perímetro, colocación de los vehículos, comunicaciones por radio y coordinación con el apoyo aéreo.",
    "Los sospechosos del 487 huyen y empieza una persecución. ¿Cómo repartes las funciones entre tus unidades y con qué criterios decides si se continúa o se cancela?"]],
  ["Mando de un 207 (secuestro / rehenes)", 3, ["Asumes el mando inicial de un 207 hasta que llegan el SWAT o el negociador. ¿Cuáles son tus prioridades, qué órdenes das al pelotón y qué información transmites al mando?",
    "Durante la negociación de un 207, un operador te propone entrar ya porque «lo tiene claro». ¿Qué decides y por qué? ¿En qué casos autorizarías una entrada?"]],
  ["Toma de decisiones", 2, ["Recibes por radio una orden de un superior que no está en la escena y que contradice lo que estás viendo sobre el terreno. ¿Cómo decides y cómo lo comunicas?",
    "Un operativo sale mal (un agente herido o la fuga de los sospechosos). ¿Cómo haces el debriefing con tu pelotón y qué haces con los errores detectados?"]],
  ["Gestión del pelotón", 1, ["¿Cómo mantienes la disciplina, la moral y el nivel de entrenamiento de 10 operadores con experiencia y personalidades distintas?"]],
  ["Cierre", 1, ["¿Por qué deberíamos confiarte una plaza de Líder de Pelotón (R30C o R40C) y qué aportarías al Pelotón C?"]],
];
const FIL_LP: [string, string][] = [["san", "Sanciones graves recientes sin aprendizaje demostrado"], ["disp", "Disponibilidad insuficiente para liderar el pelotón"], ["mando", "No asume el mando ni toma decisiones bajo presión"]];
type IvT = "ent" | "lp";
type IvCfg = { title: string; em: string; bloq: [string, number, string[]][]; crit: number[]; fil: [string, string][]; ck: string; conv0: Conv[]; ls: string };
const IV: Record<IvT, IvCfg> = {
  ent: { title: "Entrevista · Instructor Academia Metro", em: "🎓", bloq: BLOQ, crit: [14, 15], fil: FIL, ck: K_CONV, conv0: CONV0, ls: "lspdt.next.mdconv" },
  lp: { title: "Entrevista · Líder de Pelotón C", em: "🎖️", bloq: BLOQ_LP, crit: [3, 5], fil: FIL_LP, ck: "lspdt.mdx.lpconv", conv0: [{ id: "C1", n: "Plazas R30C y R40C", t: 0, post: [] }], ls: "lspdt.next.mdlpconv" },
};
const ivOf = (e: Ev): IvT => (e.tipo === "lp" ? "lp" : "ent");
const QS_OF: Record<IvT, { b: string; w: number; q: string; n: number }[]> = {
  ent: QS_I, lp: BLOQ_LP.flatMap(([b, w, l]) => l.map(q => ({ b, w, q }))).map((x, i) => ({ ...x, n: i + 1 })) };
const RES = (p: number) => (p >= 48 ? "Apto" : p >= 36 ? "Apto con seguimiento" : "No apto");
const RES_C: Record<string, string> = { "Apto": "text-emerald-500", "Apto con seguimiento": "text-amber-500", "No apto": "text-red-500" };
function entScore(e: Ev) {
  const t = ivOf(e), C = IV[t], Q = QS_OF[t], v = (n: number) => Number(e.notas["q" + n]) || 0;
  const bl = C.bloq.map(([b, w, l]) => { const ns = Q.filter(q => q.b === b).map(q => v(q.n)), m = ns.reduce((a, x) => a + x, 0) / l.length; return { b, w, m, s: m * w }; });
  const pts = bl.reduce((a, x) => a + x.s, 0), done = Q.every(q => v(q.n) > 0);
  const elim = [...C.crit.map(n => v(n) > 0 && v(n) < 3 && `Pregunta ${n} con menos de 3`), ...C.fil.filter(([k]) => e.fil?.[k]).map(([, l]) => l)].filter(Boolean) as string[];
  return { bl, pts, done, elim, res: elim.length ? "No apto" : RES(pts) };
}

/* ---------- examen escrito ---------- */
const AREAS = ["Táctica y procedimientos", "Armamento y tiro", "Conducción y persecución", "Instrucción y liderazgo"];
const BANK0: Q[] = [
  ["Táctica y procedimientos", "¿Cuáles son las fases y los pasos fundamentales de una entrada táctica en un inmueble?", "Planificación y reparto de roles, aproximación cubierta, aviso/identificación, entrada por el punto elegido, despeje por sectores (esquinas y puntos muertos), control de sujetos y comunicación constante."],
  ["Táctica y procedimientos", "¿Qué diferencia hay entre un perímetro interior y uno exterior? ¿Qué función cumple cada uno?", "El interior contiene la amenaza y lo cubren unidades tácticas; el exterior controla accesos y aleja civiles y prensa."],
  ["Táctica y procedimientos", "Al llegar a una escena de alto riesgo, ¿qué información debe transmitirse por radio y en qué orden?", "Unidad, ubicación exacta, situación observada, número de sospechosos y armas, heridos, y qué apoyo se necesita."],
  ["Armamento y tiro", "¿Cuáles son las normas fundamentales de seguridad en el manejo de armas de fuego que todo instructor debe conocer y transmitir?", "Tratar toda arma como cargada, no apuntar a nada que no se quiera disparar, dedo fuera del gatillo hasta decidir disparar, conocer el blanco y lo que hay detrás."],
  ["Armamento y tiro", "¿En qué circunstancias está justificado que un agente use su arma de fuego?", "Solo ante un peligro inminente para la vida o la integridad propia o de terceros, sin alternativa menos lesiva."],
  ["Armamento y tiro", "¿Cómo debe actuar un agente ante una interrupción o un fallo de su arma durante un enfrentamiento?", "Avisa al equipo, busca cobertura, resuelve la interrupción (o pasa al arma secundaria) y vuelve a la línea cuando está operativo."],
  ["Conducción y persecución", "¿Qué factores debe evaluar el responsable de una persecución para decidir si la continúa o la cancela?", "Riesgo para civiles y agentes, tráfico y zona, gravedad del delito, velocidad y estado de la vía, y si hay apoyo aéreo para seguirlo sin riesgo."],
  ["Conducción y persecución", "¿Cómo se reparten las funciones entre las unidades que participan en una persecución y qué responsabilidad tiene cada una?", "Unidad principal (persigue y cuenta por radio), secundaria (apoya y releva) y el resto se posiciona para cortar o hacer PIT si se autoriza."],
  ["Instrucción y liderazgo", "¿Qué estructura debería seguir una clase práctica de 30 minutos para que los conocimientos se transmitan correctamente?", "Objetivo y explicación breve, demostración, práctica guiada, práctica individual con corrección y cierre con repaso y dudas."],
  ["Instrucción y liderazgo", "¿Cómo debe corregir un instructor a un aspirante delante del grupo, manteniendo su autoridad sin exponerlo ni humillarlo?", "Corrección breve y concreta sobre la acción, sin juicios personales; lo demás en privado al terminar."],
  ["Instrucción y liderazgo", "¿Cómo debe proceder un instructor cuando detecta que otro miembro del equipo enseña contenidos contrarios al reglamento interno?", "No lo desautoriza delante del grupo: se lo comenta en privado y, si persiste, lo eleva a la coordinación."],
].map(([a, q, r], i) => ({ id: "m" + i, a, q, r }));
/* banco guardado con la redacción anterior: se actualiza la pregunta (la respuesta esperada y lo editado a mano no se tocan) */
const BANK_OLD: Record<string, string> = { m0: "¿Cuáles son los pasos de una entrada táctica a un inmueble?", m1: "¿Qué es un perímetro interior y uno exterior y para qué sirve cada uno?", m2: "¿Qué se informa por radio al llegar a una escena de alto riesgo?", m3: "¿Qué reglas básicas de seguridad con armas debe repetir un instructor?", m4: "¿Cuándo está justificado el uso del arma de fuego?", m5: "¿Qué hace un tirador cuando se le traba el arma en un enfrentamiento?", m6: "¿Qué factores evalúa el mando para mantener o cancelar una persecución?", m7: "¿Cuál es el orden de las unidades en una persecución y qué hace cada una?", m8: "¿Cómo se estructura una clase práctica de 30 minutos?", m9: "¿Cómo se corrige a un aspirante delante del grupo sin perder autoridad ni humillarlo?", m10: "¿Qué hace un instructor si ve a otro enseñando algo contrario al reglamento?" };
const gv = (g: Grade | number) => (g === "ok" ? 1 : g === "mid" ? 0.5 : 0);

export function MetroExam({ tab }: { tab: "exa" | "ent" | "lp" | "list" }) {
  useStoreVersion();
  const [evs, setEvs] = useJSON<Ev[]>(K_EV, []);
  const save = (e: Ev) => setEvs([...evs.filter(x => x.id !== e.id), e]), del = (id: string) => setEvs(evs.filter(x => x.id !== id));
  return tab === "ent" || tab === "lp" ? <Ent key={tab} t={tab} evs={evs} onSave={save} onDel={del} /> : tab === "exa" ? <Exa evs={evs} onSave={save} onDel={del} /> : <List evs={evs} />;
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
function Hist({ evs, tipo, conv, onOpen, onDel }: { evs: Ev[]; tipo: Ev["tipo"]; conv?: string; onOpen: (e: Ev) => void; onDel: (id: string) => void }) {
  const { confirm } = useFeedback(), L = evs.filter(e => e.tipo === tipo && (!conv || convOf(e) === conv)).sort((a, b) => b.ts - a.ts); if (!L.length) return null;
  return <Card className="overflow-hidden"><p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold dark:border-slate-800">Registradas{conv ? ` · ${conv}` : ""} ({L.length}) <span className="font-normal text-slate-400">· tocá una para ver sus respuestas</span></p>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(e => (
      <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", e.apto.startsWith("Apto") ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-300")}>{e.apto.toUpperCase()}</span>
        <button onClick={() => onOpen(e)} className="min-w-0 flex-1 truncate text-left text-sm"><b>{e.cand}</b> <span className="text-slate-500">· {dmy(e.fecha)} · {tipo !== "exa" ? `${f1(e.pts)}/60` : `nota ${f1(e.pts, 2)}/10`} · {e.by}</span></button>
        <button aria-label="Eliminar" onClick={async () => { if (await confirm(`¿Eliminar la evaluación de ${e.cand}?`, { danger: true })) onDel(e.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
      </div>))}</div></Card>;
}

function Ent({ t, evs, onSave, onDel }: { t: IvT; evs: Ev[]; onSave: (e: Ev) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback(), C = IV[t], QS = QS_OF[t];
  const [convs, setConvs] = useJSON<Conv[]>(C.ck, C.conv0), [cv, setCv] = useState(() => { try { return localStorage.getItem(C.ls) || "C1"; } catch { return "C1"; } });
  const conv = convs.find(c => c.id === cv) || convs[0] || C.conv0[0];
  const blank = (cand = ""): Ev => ({ id: "", tipo: t, cand, rango: findAgent(cand) ? rankES(findAgent(cand)!.r) : "", fecha: hoyISO(), notas: {}, obs: {}, pts: 0, apto: "", by: me.n, ts: 0, fil: {}, fort: "", mej: "", dec: "", conv: conv.id });
  const [cur, setCur] = useState<Ev | null>(null), [view, setView] = useState<Ev | null>(null), e = cur || blank(), set = (p: Partial<Ev>) => setCur({ ...e, ...p });
  const reset = async () => { if (cur && (Object.keys(e.notas).length || e.cand) && !(await confirm("¿Reiniciar la entrevista? Se borra lo cargado en el formulario (lo ya registrado no se toca)."))) return; setCur(null); window.scrollTo?.({ top: 0 }); };
  const S = entScore(e), dec = e.dec || S.res;
  const txt = [`## ${C.em} ${C.title}`, `**Candidato:** ${e.cand || "—"} (${e.rango || "—"}) · **Entrevistador:** ${me.n} · **Fecha:** ${dmy(e.fecha)}`, "",
    ...S.bl.map(b => `**${b.b}** (x${b.w}): media ${f1(b.m, 2)} → ${f1(b.s, 2)} pts`), "",
    `**Puntuación:** ${f1(S.pts)}/60`, ...(S.elim.length ? [`⚠️ **Filtros eliminatorios:** ${S.elim.join(" · ")}`] : []),
    ...(e.fort ? [`**Fortalezas:** ${e.fort}`] : []), ...(e.mej ? [`**A mejorar:** ${e.mej}`] : []),
    `**Decisión final:** ${S.done ? (dec === "Apto" ? "✅" : dec === "No apto" ? "❌" : "🟡") + " " + dec : "⏳ Pendiente"}`].join("\n");
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3 text-sm text-slate-500"><MessageCircle className="size-4 text-brand-500" />
        Cada pregunta del 1 al 5 · media de cada bloque × su peso · máximo <b>60</b> · <b>48–60</b> apto · <b>36–47</b> apto con seguimiento · menos de 36 no apto
        <span className="ml-auto flex gap-1.5"><WBadge w={1} /><WBadge w={2} /><WBadge w={3} /></span></Card>
      {t === "lp" && <PlazasComm />}
      <Convocatorias tipo={t} evs={evs} convs={convs} setConvs={setConvs} conv={conv} pick={id => { setCv(id); try { localStorage.setItem(C.ls, id); } catch { /* */ } }}
        onStart={n => setCur(blank(n))} onView={setView} />
      <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{e.id ? `Editando la entrevista de ${e.cand}` : "Nueva entrevista"} <span className="font-normal text-slate-500">· {conv.id} · {conv.n}</span></p>
        <Button size="sm" variant="outline" className="ml-auto" icon={<RotateCcw />} onClick={() => void reset()}>Reiniciar</Button></div>
      <Head e={e} set={set} />
      {C.bloq.map(([b, w]) => { const bl = S.bl.find(x => x.b === b)!; return (
        <section key={b} className="space-y-2 rounded-2xl" style={w > 1 ? { boxShadow: `inset 3px 0 0 ${W_ST[w].c}`, paddingLeft: 10 } : undefined}>
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{b}<WBadge w={w} big /><span className="ml-auto normal-case tracking-normal">media {f1(bl.m, 2)} × {w} = <b className="text-slate-700 dark:text-slate-200">{f1(bl.s, 2)} pts</b> <span className="text-slate-400">(máx. {5 * w})</span></span></p>
          {QS.filter(q => q.b === b).map(q => { const v = Number(e.notas["q" + q.n]) || 0, crit = C.crit.includes(q.n); return (
            <Card key={q.n} className={cn("space-y-3 p-4", v && "border-l-4", v && (v >= 4 ? "border-l-emerald-500" : v === 3 ? "border-l-amber-400" : "border-l-red-500"))}>
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <b className="w-[4.25rem] shrink-0 pt-0.5 font-mono text-slate-400">{q.n}</b>
                <p className="min-w-[14rem] flex-1 pt-0.5 text-sm font-medium leading-relaxed">{q.q}{crit && <span className="ml-2 whitespace-nowrap rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-300">eliminatoria si es menos de 3</span>}</p>
              <div className="ml-auto flex shrink-0 gap-0.5" role="radiogroup" aria-label={`Puntaje de la pregunta ${q.n}`}>{[1, 2, 3, 4, 5].map(s =>
                <button key={s} role="radio" aria-checked={v === s} title={`${s} de 5`} onClick={() => set({ notas: { ...e.notas, ["q" + q.n]: v === s ? 0 : s } })}>
                  <Star className={cn("size-6 transition", s <= v ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300 dark:text-slate-600")} /></button>)}</div>
              </div>
              <div className="flex items-center gap-3"><span className="flex w-[4.25rem] shrink-0"><WBadge w={q.w} /></span>
                <Input className="h-9 flex-1 text-[13px]" value={e.obs["q" + q.n] || ""} onChange={x => set({ obs: { ...e.obs, ["q" + q.n]: x.target.value } })} placeholder="Observación (opcional)…" /></div>
            </Card>); })}
        </section>); })}
      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="size-4 text-red-500" />Filtros eliminatorios <span className="font-normal text-slate-500">(aunque la puntuación sea alta)</span></p>
        {C.fil.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!e.fil?.[k]} onChange={x => set({ fil: { ...e.fil, [k]: x.target.checked } })} />{l}</label>)}
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
        <Button variant="ghost" icon={<RotateCcw />} onClick={() => void reset()}>Reiniciar</Button>
        <Button icon={<Save />} onClick={() => { if (!e.cand) { toast("Elegí el candidato", "err"); return; } if (!S.done) { toast("Faltan preguntas por puntuar", "err"); return; }
          const r = { ...e, id: e.id || uid(), pts: S.pts, apto: dec, ts: e.ts || Date.now(), by: e.by || me.n, conv: e.conv || conv.id };
          onSave(r); if (!conv.post.includes(r.cand)) setConvs(convs.map(c => (c.id === conv.id ? { ...c, post: [...c.post, r.cand] } : c)));
          setCur(null); toast(`Entrevista de ${r.cand} registrada en ${conv.id}`); }}>Registrar entrevista</Button>
      </div>
      <DiscordOutput title="Hoja de puntuación" text={txt} sticky={false} />
      <Hist evs={evs} tipo={t} conv={conv.id} onOpen={setView} onDel={onDel} />
      {view && <EvView e={view} onClose={() => setView(null)} onEdit={() => { setCur(view); setView(null); window.scrollTo?.({ top: 0 }); }} />}
    </div>
  );
}

function Exa({ evs, onSave, onDel }: { evs: Ev[]; onSave: (e: Ev) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [bank, setBank] = useJSON<Q[]>(K_BANK, BANK0), [ed, setEd] = useState(false);
  useEffect(() => { if (bank.some(q => BANK_OLD[q.id] === q.q)) setBank(bank.map(q => (BANK_OLD[q.id] === q.q ? { ...q, q: BANK0.find(b => b.id === q.id)!.q } : q))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const blank = (): Ev => ({ id: "", tipo: "exa", cand: "", rango: "", fecha: hoyISO(), notas: {}, obs: {}, pts: 0, apto: "", by: me.n, ts: 0 });
  const [cur, setCur] = useState<Ev | null>(null), [view, setView] = useState<Ev | null>(null), e = cur || blank(), set = (p: Partial<Ev>) => setCur({ ...e, ...p });
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
        <Button variant="ghost" icon={<RotateCcw />} onClick={() => setCur(null)}>Reiniciar</Button>
        <Button icon={<Save />} onClick={() => { if (!e.cand) { toast("Elegí el candidato", "err"); return; } if (!done) { toast("Faltan preguntas por corregir", "err"); return; }
          const r = { ...e, id: e.id || uid(), pts: nota, apto: apto ? "Apto" : "No apto", ts: e.ts || Date.now(), by: e.by || me.n }; onSave(r); setCur(null); toast("Examen registrado · pasa a la lista de elegibles"); }}>Registrar examen</Button>
      </div>
      <DiscordOutput title="Resultado del examen" text={txt} sticky={false} />
      <Hist evs={evs} tipo="exa" onOpen={setView} onDel={onDel} />
      {view && <EvView e={view} bank={bank} onClose={() => setView(null)} onEdit={() => { setCur(view); setView(null); window.scrollTo?.({ top: 0 }); }} />}
      {ed && <BankEd bank={bank} onClose={() => setEd(false)} onSave={b => { setBank(b); setEd(false); toast("Banco actualizado"); }} />}
    </div>
  );
}
/* convocatoria (C1, C2…): postulantes con su estado; desde acá se entrevista o se ven las respuestas */
function Convocatorias({ tipo, evs, convs, setConvs, conv, pick, onStart, onView }: { tipo: IvT; evs: Ev[]; convs: Conv[]; setConvs: (c: Conv[]) => void; conv: Conv; pick: (id: string) => void; onStart: (n: string) => void; onView: (e: Ev) => void }) {
  const { confirm } = useFeedback(), [add, setAdd] = useState("");
  const ents = evs.filter(e => e.tipo === tipo && convOf(e) === conv.id), names = [...new Set([...conv.post, ...ents.map(e => e.cand)])];
  const lastEnt = (n: string) => ents.filter(e => e.cand === n).sort((a, b) => b.ts - a.ts)[0];
  const rows = names.map(n => ({ n, e: lastEnt(n) })).sort((a, b) => (a.e ? 1 : 0) - (b.e ? 1 : 0) || (b.e?.pts || 0) - (a.e?.pts || 0) || a.n.localeCompare(b.n));
  const put = (post: string[]) => setConvs(convs.map(c => (c.id === conv.id ? { ...c, post } : c)));
  const nueva = () => { const k = Math.max(0, ...convs.map(c => +c.id.slice(1) || 0)) + 1; setConvs([...convs, { id: "C" + k, n: "Convocatoria " + k, t: Date.now(), post: [] }]); pick("C" + k); };
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        {convs.map(c => <button key={c.id} onClick={() => pick(c.id)} aria-pressed={c.id === conv.id} className={cn("rounded-full border px-3 py-1 text-xs font-bold transition", c.id === conv.id ? "border-brand-500 bg-brand-600 text-white" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-200")}>{c.id} <span className="font-semibold opacity-75">· {c.n}</span></button>)}
        <Button size="sm" variant="ghost" icon={<Plus />} onClick={nueva}>Nueva convocatoria</Button>
        <span className="ml-auto text-xs text-slate-500">{ents.length ? `${new Set(ents.map(e => e.cand)).size} entrevistados` : "Sin entrevistas"} · {rows.length - new Set(ents.map(e => e.cand)).size} pendientes</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.length ? rows.map(({ n, e }) => (
          <div key={n} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm"><b>{n}</b> <span className="text-xs text-slate-500">{findAgent(n) ? rankES(findAgent(n)!.r) : ""}</span></span>
            {e ? <><span className={cn("text-xs font-semibold", RES_C[e.apto] || "text-slate-500")}>{e.apto} · {f1(e.pts)}/60</span>
              <Button size="sm" variant="outline" icon={<Eye />} onClick={() => onView(e)}>Ver respuestas</Button></>
              : <><span className="text-xs font-semibold text-amber-500">Pendiente de entrevista</span>
                <Button size="sm" icon={<MessageCircle />} onClick={() => onStart(n)}>Entrevistar</Button>
                <button aria-label={`Quitar a ${n}`} onClick={async () => { if (await confirm(`¿Quitar a ${n} de ${conv.id}?`)) put(conv.post.filter(x => x !== n)); }} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600"><X className="size-4" /></button></>}
          </div>)) : <p className="px-4 py-6 text-center text-sm text-slate-400">Todavía no hay postulantes en {conv.id}.</p>}
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="min-w-[14rem] flex-1"><AgentCombo value={add} onChange={setAdd} names={cands()} placeholder="Agregar postulante…" /></div>
        <Button variant="outline" icon={<Plus />} disabled={!add || names.includes(add)} onClick={() => { put([...conv.post, add]); setAdd(""); }}>Agregar a {conv.id}</Button>
      </div>
    </Card>);
}

/* respuestas de una evaluación ya hecha (solo lectura): no pisa el formulario; «Editar» la carga si hace falta */
function EvView({ e, bank, onClose, onEdit }: { e: Ev; bank?: Q[]; onClose: () => void; onEdit: () => void }) {
  const ent = e.tipo !== "exa", S = ent ? entScore(e) : null, C = IV[ivOf(e)], QS = QS_OF[ivOf(e)];
  return (
    <Modal open onClose={onClose} size="lg" icon={ent ? <MessageCircle /> : <ClipboardCheck />} title={`${ent ? (e.tipo === "lp" ? "Entrevista para Líder de Pelotón" : "Entrevista de instructor") : "Examen escrito"} · ${e.cand}`}
      desc={`${e.rango || "—"} · ${dmy(e.fecha)} · ${ent ? `${convOf(e)} · ` : ""}evaluó ${e.by}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cerrar</Button><Button variant="outline" icon={<Pencil />} onClick={onEdit}>Editar</Button></>}>
      <div className="grid grid-cols-3 gap-2">{(ent ? [["Puntuación", `${f1(e.pts)}/60`], ["Sugerido", S!.res], ["Decisión", e.apto]] : [["Nota", `${f1(e.pts, 2)}/10`], ["Resultado", e.apto], ["Fecha", dmy(e.fecha)]]).map(([l, v]) => (
        <div key={l} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className={cn("font-semibold", RES_C[v] || "")}>{v}</p></div>))}</div>
      {ent ? <>{C.bloq.map(([b, w]) => <div key={b} className="space-y-1.5"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{b}<WBadge w={w} /></p>
        {QS.filter(q => q.b === b).map(q => { const v = Number(e.notas["q" + q.n]) || 0, o = e.obs["q" + q.n]; return (
          <div key={q.n} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"><div className="flex items-start gap-2"><b className="w-6 shrink-0 text-right text-slate-400">{q.n}</b><p className="flex-1 text-sm">{q.q}</p>
            <span className="flex shrink-0">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn("size-4", s <= v ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600")} />)}</span></div>
            {o && <p className="ml-8 mt-1 text-[13px] italic text-slate-600 dark:text-slate-300">“{o}”</p>}</div>); })}</div>)}
        {S!.elim.length > 0 && <p className="rounded-xl border border-red-500/40 bg-red-500/[.07] p-3 text-sm text-red-600 dark:text-red-300"><b>Filtros eliminatorios:</b> {S!.elim.join(" · ")}</p>}
        {(e.fort || e.mej) && <div className="grid gap-2 sm:grid-cols-2">{e.fort && <p className="rounded-xl bg-emerald-500/[.07] p-3 text-sm"><b>Fortalezas:</b> {e.fort}</p>}{e.mej && <p className="rounded-xl bg-amber-500/[.07] p-3 text-sm"><b>A mejorar:</b> {e.mej}</p>}</div>}</>
        : <div className="space-y-1.5">{(bank || []).map((q, i) => { const g = e.notas[q.id] as Grade; return (
          <div key={q.id} className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"><b className="w-6 shrink-0 text-right text-slate-400">{i + 1}</b><p className="flex-1">{q.q}</p>
            <span className={cn("shrink-0 text-xs font-bold", g === "ok" ? "text-emerald-500" : g === "mid" ? "text-amber-500" : g === "no" ? "text-red-500" : "text-slate-400")}>{g === "ok" ? "Correcta" : g === "mid" ? "Parcial" : g === "no" ? "Incorrecta" : "—"}</span></div>); })}</div>}
    </Modal>);
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

/* ---------- comunicado: apertura de plazas de Líder de Pelotón C (R30C y R40C) ---------- */
function PlazasComm() {
  const [open, setOpen] = useState(false), [lim, setLim] = useState(""), [cfg] = useJSON<CsCfg>(K_CFG, CS_CFG0);
  const txt = metroComm({ cfg, title: "Apertura de plazas · Líder de Pelotón C",
    intro: "La Coordinación de la Metropolitan Division abre el proceso de selección para cubrir dos plazas de **Líder de Pelotón C**: los indicativos **R30C** y **R40C**.",
    secs: [
      ["Relevo en R30C", ["Después de **10 años** al frente del indicativo **R30C**, el **Sargento II Ryan Westbrook** deja la plaza de Líder de Pelotón.",
        "La Coordinación le agradece una década de servicio, compromiso y liderazgo al frente del Pelotón C. Su legado sigue en cada operador que formó."]],
      ["Plazas disponibles", ["**R30C** · Líder de Pelotón C", "**R40C** · Líder de Pelotón C"]],
      ["Funciones", ["Dirigir un pelotón de hasta 10 operadores durante el servicio y en los operativos.",
        "Asumir el mando de los **487** (robo mayor) y de los **207** (secuestro / rehenes) hasta el relevo del mando o del SWAT.",
        "Organizar el perímetro, el reparto de unidades y las comunicaciones por radio.",
        "Velar por la disciplina, el entrenamiento y la moral del pelotón, e informar a la Coordinación."]],
      ["Requisitos", ["Ser operador en activo de la Metropolitan Division.", "No tener sanciones disciplinarias graves recientes.",
        "Tener disponibilidad para liderar el pelotón en los horarios de mayor actividad.", "Superar la **entrevista para Líder de Pelotón** ante la Coordinación y los Instructores."]],
      ["Cómo postularse", [`Para presentar la candidatura, reaccionar a este comunicado con ${VERIF_EM}`,
        ...(lim ? [`Las candidaturas se reciben hasta el **${dmy(lim)}**.`] : []), "La Coordinación contactará a cada postulante para fijar la fecha de su entrevista."]],
    ],
    cierre: "*Liderar un pelotón no es un rango: es una responsabilidad con quienes vienen detrás. Los primeros en entrar, los últimos en irse.*" });
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold">
        <Megaphone className="size-4 text-brand-500" />Comunicado · apertura de plazas R30C y R40C
        <span className="ml-auto text-xs font-normal text-slate-500">{open ? "Ocultar" : "Ver y copiar"}</span></button>
      {open && <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
        <Field label="Fecha límite (opcional)" className="max-w-[12rem]"><Input type="date" value={lim} onChange={e => setLim(e.target.value)} /></Field>
        <DiscordOutput title="Comunicado" text={txt} sticky={false} />
      </div>}
    </Card>);
}
