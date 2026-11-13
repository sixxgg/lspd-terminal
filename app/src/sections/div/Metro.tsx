/* METRO · exámenes para aspirantes a instructor de la academia: entrevista con hoja de puntuación (1–5, pesos por bloque, máx. 60),
   examen escrito (banco editable, nota /10, corte 70 %) y lista de elegibles (examen ×4 + entrevista = /100). */
import { useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, Eye, MessageCircle, RotateCcw, Minus, Pencil, Plus, Save, Star, Trash2, Trophy, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { AgentCombo } from "@/components/agents";
import { findAgent, getRoster, hoyISO, lvl, rankES, uid , dmy } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { uMap } from "@/lib/units";
import { cn } from "@/lib/cn";

type Grade = "" | "ok" | "mid" | "no";
type Ev = { id: string; tipo: "exa" | "ent"; cand: string; rango: string; fecha: string; notas: Record<string, Grade | number>; obs: Record<string, string>;
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
function Hist({ evs, tipo, conv, onOpen, onDel }: { evs: Ev[]; tipo: Ev["tipo"]; conv?: string; onOpen: (e: Ev) => void; onDel: (id: string) => void }) {
  const { confirm } = useFeedback(), L = evs.filter(e => e.tipo === tipo && (!conv || convOf(e) === conv)).sort((a, b) => b.ts - a.ts); if (!L.length) return null;
  return <Card className="overflow-hidden"><p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold dark:border-slate-800">Registradas{conv ? ` · ${conv}` : ""} ({L.length}) <span className="font-normal text-slate-400">· tocá una para ver sus respuestas</span></p>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(e => (
      <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", e.apto.startsWith("Apto") ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-300")}>{e.apto.toUpperCase()}</span>
        <button onClick={() => onOpen(e)} className="min-w-0 flex-1 truncate text-left text-sm"><b>{e.cand}</b> <span className="text-slate-500">· {dmy(e.fecha)} · {tipo === "ent" ? `${f1(e.pts)}/60` : `nota ${f1(e.pts, 2)}/10`} · {e.by}</span></button>
        <button aria-label="Eliminar" onClick={async () => { if (await confirm(`¿Eliminar la evaluación de ${e.cand}?`, { danger: true })) onDel(e.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
      </div>))}</div></Card>;
}

function Ent({ evs, onSave, onDel }: { evs: Ev[]; onSave: (e: Ev) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [convs, setConvs] = useJSON<Conv[]>(K_CONV, CONV0), [cv, setCv] = useState(() => { try { return localStorage.getItem("lspdt.next.mdconv") || "C1"; } catch { return "C1"; } });
  const conv = convs.find(c => c.id === cv) || convs[0] || CONV0[0];
  const blank = (cand = ""): Ev => ({ id: "", tipo: "ent", cand, rango: findAgent(cand) ? rankES(findAgent(cand)!.r) : "", fecha: hoyISO(), notas: {}, obs: {}, pts: 0, apto: "", by: me.n, ts: 0, fil: {}, fort: "", mej: "", dec: "", conv: conv.id });
  const [cur, setCur] = useState<Ev | null>(null), [view, setView] = useState<Ev | null>(null), e = cur || blank(), set = (p: Partial<Ev>) => setCur({ ...e, ...p });
  const reset = async () => { if (cur && (Object.keys(e.notas).length || e.cand) && !(await confirm("¿Reiniciar la entrevista? Se borra lo cargado en el formulario (lo ya registrado no se toca)."))) return; setCur(null); window.scrollTo?.({ top: 0 }); };
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
      <Convocatorias evs={evs} convs={convs} setConvs={setConvs} conv={conv} pick={id => { setCv(id); try { localStorage.setItem("lspdt.next.mdconv", id); } catch { /* */ } }}
        onStart={n => setCur(blank(n))} onView={setView} />
      <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{e.id ? `Editando la entrevista de ${e.cand}` : "Nueva entrevista"} <span className="font-normal text-slate-500">· {conv.id} · {conv.n}</span></p>
        <Button size="sm" variant="outline" className="ml-auto" icon={<RotateCcw />} onClick={() => void reset()}>Reiniciar</Button></div>
      <Head e={e} set={set} />
      {BLOQ.map(([b, w]) => { const bl = S.bl.find(x => x.b === b)!; return (
        <section key={b} className="space-y-2 rounded-2xl" style={w > 1 ? { boxShadow: `inset 3px 0 0 ${W_ST[w].c}`, paddingLeft: 10 } : undefined}>
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{b}<WBadge w={w} big /><span className="ml-auto normal-case tracking-normal">media {f1(bl.m, 2)} × {w} = <b className="text-slate-700 dark:text-slate-200">{f1(bl.s, 2)} pts</b> <span className="text-slate-400">(máx. {5 * w})</span></span></p>
          {QS.filter(q => q.b === b).map(q => { const v = Number(e.notas["q" + q.n]) || 0, crit = q.n === 14 || q.n === 15; return (
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
        <Button variant="ghost" icon={<RotateCcw />} onClick={() => void reset()}>Reiniciar</Button>
        <Button icon={<Save />} onClick={() => { if (!e.cand) { toast("Elegí el candidato", "err"); return; } if (!S.done) { toast("Faltan preguntas por puntuar", "err"); return; }
          const r = { ...e, id: e.id || uid(), pts: S.pts, apto: dec, ts: e.ts || Date.now(), by: e.by || me.n, conv: e.conv || conv.id };
          onSave(r); if (!conv.post.includes(r.cand)) setConvs(convs.map(c => (c.id === conv.id ? { ...c, post: [...c.post, r.cand] } : c)));
          setCur(null); toast(`Entrevista de ${r.cand} registrada en ${conv.id}`); }}>Registrar entrevista</Button>
      </div>
      <DiscordOutput title="Hoja de puntuación" text={txt} sticky={false} />
      <Hist evs={evs} tipo="ent" conv={conv.id} onOpen={setView} onDel={onDel} />
      {view && <EvView e={view} onClose={() => setView(null)} onEdit={() => { setCur(view); setView(null); window.scrollTo?.({ top: 0 }); }} />}
    </div>
  );
}

function Exa({ evs, onSave, onDel }: { evs: Ev[]; onSave: (e: Ev) => void; onDel: (id: string) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [bank, setBank] = useJSON<Q[]>(K_BANK, BANK0), [ed, setEd] = useState(false);
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
function Convocatorias({ evs, convs, setConvs, conv, pick, onStart, onView }: { evs: Ev[]; convs: Conv[]; setConvs: (c: Conv[]) => void; conv: Conv; pick: (id: string) => void; onStart: (n: string) => void; onView: (e: Ev) => void }) {
  const { confirm } = useFeedback(), [add, setAdd] = useState("");
  const ents = evs.filter(e => e.tipo === "ent" && convOf(e) === conv.id), names = [...new Set([...conv.post, ...ents.map(e => e.cand)])];
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
  const ent = e.tipo === "ent", S = ent ? entScore(e) : null;
  return (
    <Modal open onClose={onClose} size="lg" icon={ent ? <MessageCircle /> : <ClipboardCheck />} title={`${ent ? "Entrevista" : "Examen escrito"} · ${e.cand}`}
      desc={`${e.rango || "—"} · ${dmy(e.fecha)} · ${ent ? `${convOf(e)} · ` : ""}evaluó ${e.by}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cerrar</Button><Button variant="outline" icon={<Pencil />} onClick={onEdit}>Editar</Button></>}>
      <div className="grid grid-cols-3 gap-2">{(ent ? [["Puntuación", `${f1(e.pts)}/60`], ["Sugerido", S!.res], ["Decisión", e.apto]] : [["Nota", `${f1(e.pts, 2)}/10`], ["Resultado", e.apto], ["Fecha", dmy(e.fecha)]]).map(([l, v]) => (
        <div key={l} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className={cn("font-semibold", RES_C[v] || "")}>{v}</p></div>))}</div>
      {ent ? <>{BLOQ.map(([b, w]) => <div key={b} className="space-y-1.5"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{b}<WBadge w={w} /></p>
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
