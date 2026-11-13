import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, ChevronRight, FolderOpen, Bell, ThumbsDown, ThumbsUp, Send, ArrowUpRight, Gavel, FileCheck2, BookMarked, Search, Plus, X, Pencil, Trash2, Save, RotateCcw, Lock, Info, Mail, Vote, History, Copy, FolderInput, ChevronDown } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Field, Input, Segmented, Select, Textarea, SearchInput } from "@/components/ui";
import { AgentCombo, AgentPicker } from "@/components/agents";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { Col, Split } from "@/components/layout";
import { RK_EN, apellido, emailOf, excOf, findAgent, genderOf, getRoster, joinY, lvl, norm, rankES, rkFem, uid , myKey } from "@/lib/domain";
import { LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { UNITS, isPSB, uMap, uTop } from "@/lib/units";
import FALTAS_RAW from "@/lib/faltas.json";
import { cn } from "@/lib/cn";

/* ---------- datos ---------- */
type Falta = { id: string; g: string; n: string; d: string };
const FALTAS_DEF: Falta[] = (FALTAS_RAW as [string, string, string][]).map((f, i) => ({ id: "d" + i, g: f[0], n: f[1], d: f[2] }));
const GORD: Record<string, number> = { leve: 0, grave: 1, "muy grave": 2 };
const getFaltas = () => (LS.json<Falta[] | null>("lspdt.faltas", null) || FALTAS_DEF.map(f => ({ ...f }))).slice().sort((a, b) => GORD[a.g] - GORD[b.g] || a.n.localeCompare(b.n, "es"));
const G_CLS: Record<string, string> = { leve: "bg-sky-500/10 text-sky-700 dark:text-sky-300", grave: "bg-amber-500/15 text-amber-700 dark:text-amber-300", "muy grave": "bg-red-500/10 text-red-700 dark:text-red-300" };
const GL: Record<string, string> = { leve: "leves", grave: "graves", "muy grave": "muy graves" };
const PSB_DIVS: Record<string, string> = { IAD: "División de Asuntos Internos (IAD)", FID: "División de Investigación del Uso de la Fuerza (FID)", SOD: "División de Operaciones Especiales (SOD)" };
const PSB_DIVS_EN: Record<string, string> = { IAD: "Internal Affairs Division (IAD)", FID: "Force Investigation Division (FID)", SOD: "Special Operations Division (SOD)" };
const PSB_ROLE_DIV: Record<string, string> = { iad: "IAD", fid: "FID", sod: "SOD" };
const CARGOS = ["Junior Investigator", "Investigator", "Senior Investigator", "Lead Investigator", "Section Supervisor", "Division Commander", "Assistant Commanding Officer", "Commanding Officer"];
const PSB_IDS_DEF: Record<string, string> = { "Madison Wells": "352216772847337473" };
export const dcIdOf = (n: string) => { const o = { ...PSB_IDS_DEF, ...LS.json<Record<string, string>>("lspdt.psbIds", {}) }[n]; if (o) return o; const a = findAgent(n), d = String((a && (a.i || a.d)) || "").trim(); return /^\d{15,21}$/.test(d) ? d : ""; };
const psbRank = (n: string) => { const r = uMap("psb")[n]; return Array.isArray(r) ? uTop("psb", r)[1] : ""; };
const psbDivs = (n: string) => (uMap("psb")[n] || []).filter(x => PSB_ROLE_DIV[x]).map(x => PSB_ROLE_DIV[x]);
const PSB_CONCL: [string, string][] = [["Sustained", "Ocurrió y violó las normas del SAPD"], ["Not Sustained", "Sin evidencia suficiente para confirmar ni desmentir"], ["Exonerated", "Ocurrió pero dentro del protocolo"], ["Unfounded", "La conducta no ocurrió"]];
const PSB_NIV: [string, string][] = [["0", "Notice to Correct Deficiencies"], ["1", "Nivel 1, amonestación escrita"], ["2", "Nivel 2, formación obligatoria"], ["3", "Nivel 3, suspensión temporal sin sueldo"], ["4", "Nivel 4, degradación de rango"], ["5", "Nivel 5, expulsión del SAPD"], ["6", "Nivel 6, derivación a Fiscalía"]];
const psbEfecto = (n: string, g: string) => ({ "0": "no es una sanción disciplinaria: sin pérdida de sueldo ni rango y no bloquea ascensos; queda constancia en el expediente",
  "1": ({ leve: "sin pérdida de sueldo ni rango, vigencia de 30 meses, no bloquea ascensos", grave: "sin pérdida de sueldo ni rango, vigencia de 60 meses, bloquea ascensos", "muy grave": "sin pérdida de sueldo ni rango, vigencia de 120 meses, bloquea ascensos y traslados a unidades especiales" } as Record<string, string>)[g],
  "2": "programa de formación específica del PSB con evaluación final; funciones habituales posiblemente restringidas; vigencia de 30 meses",
  "3": "apartado del servicio activo sin salario, con arma y credenciales retenidas (entre 3 y 30 días); vigencia de 60 meses; admite Board of Rights",
  "4": "descenso de uno o más rangos con reducción salarial y salida de cargos de supervisión; requiere aprobación del Chief of Police; vigencia permanente; admite Board of Rights",
  "5": "baja definitiva del SAPD; requiere aprobación del Chief of Police y notificación a la Police Commission; irreversible; admite Board of Rights",
  "6": "el caso pasa a la Fiscalía de San Andreas con toda la documentación; habitualmente con expulsión inmediata" } as Record<string, string | undefined>)[n];
/* descripción de cada medida (sale en la elevación y en las opciones de la votación) */
const NIV_D: Record<string, string> = {
  "0": "Medida correctiva **no disciplinaria**. Es el criterio aplicado hasta ahora en casos similares de primera vez. Queda constancia en el expediente.",
  "1": "Sanción **disciplinaria** leve, encuadrada como falta grave con consideración de leve por las atenuantes. Sin pérdida de sueldo ni rango, vigencia de 30 meses y no bloquea ascensos.",
  "2": "Programa de formación específica del PSB con evaluación final. Funciones habituales posiblemente restringidas; vigencia de 30 meses.",
  "3": "Apartado del servicio activo sin salario, con arma y credenciales retenidas (entre 3 y 30 días). Vigencia de 60 meses; admite Board of Rights.",
  "4": "Descenso de uno o más rangos con reducción salarial. Requiere aprobación del Chief of Police; vigencia permanente; admite Board of Rights.",
  "5": "Baja definitiva del SAPD. Requiere aprobación del Chief of Police; irreversible; admite Board of Rights.",
  "6": "El caso pasa a la Fiscalía de San Andreas con toda la documentación.",
};
const NIV_T: Record<string, string> = { "0": "Notice to Correct Deficiencies", "1": "Amonestación escrita (Nivel 1)", "2": "Formación obligatoria (Nivel 2)", "3": "Suspensión temporal sin sueldo (Nivel 3)", "4": "Degradación de rango (Nivel 4)", "5": "Expulsión del SAPD (Nivel 5)", "6": "Derivación a Fiscalía (Nivel 6)" };
const NUM = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const NTCD = "Notice to Correct Deficiencies: medida correctiva no disciplinaria. Queda constancia en el expediente.";
const PSB_CONS = [NTCD, "Amonestación escrita", "Formación obligatoria", "Suspensión temporal sin sueldo", "Degradación de rango", "Expulsión del SAPD", "Derivación a Fiscalía"];
const JUS_ROLE = "1565491805166895224";

/* estado compartido entre las pestañas (como en la versión clásica, vive mientras la terminal esté abierta) */
type PXT = { cA: string; cB: string; ag: string; para: string; dv: string; hecho: string; fl: string[]; firma: boolean; _dv?: boolean;
  ele: { cf?: string; para: string; hechos: string; const: string; concl: string; grav: string; enc: string; niv: string; det: string; efe: string; arch: boolean; pend: string };
  jus: { s: { t: string; p: string }[]; falta: string; fq: string; cons: string[]; consx: string; mode?: string; sum?: boolean }; res: { modo: string; extra: string; bloque?: boolean };
  vot: { intro: string; res: string; cons: string; concl: string; ops: { t: string; d: string }[]; nota: string; conf: boolean } };
let PX: PXT = { cA: "", cB: "", ag: "", para: "", dv: "IAD", hecho: "", fl: [], firma: true,
  ele: { para: "", hechos: "", const: "", concl: "Sustained", grav: "leve", enc: "", niv: "0", det: "", efe: "", arch: true, pend: "" },
  jus: { s: [{ t: "", p: "" }], falta: "", fq: "", cons: [], consx: "" }, res: { modo: "ambas", extra: "" },
  vot: { intro: "", res: "", cons: "", concl: "Sustained", ops: [{ t: NIV_T["0"], d: NIV_D["0"] }, { t: NIV_T["1"], d: NIV_D["1"] }], nota: "", conf: true } };
const blankPX = () => structuredClone(PX0);
const PX0: PXT = structuredClone(PX);
const subs = new Set<() => void>();
const usePX = (): [PXT, (fn: (x: PXT) => void) => void] => {
  const px = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => PX);
  return [px, fn => { const x = structuredClone(PX); fn(x); PX = x; subs.forEach(f => f()); }];
};
const casoTxt = (p: PXT) => `CF-${p.cA || "XX"}-${p.cB || "XXXXXX"}`;
const psbDeOf = (n: string) => { const a = findAgent(n); return a ? `${RK_EN[a.r] || rankES(a.r)} ${a.n}${a.p ? " #" + a.p : ""}` : n; };

type Go = (t: string) => void;
export function Psb({ tab, go = () => {} }: { tab: string; go?: Go }) {
  useStoreVersion();
  const me = useMe(), [p, up] = usePX();
  if (!p._dv) { const d = psbDivs(me.n); setTimeout(() => up(x => { x._dv = true; if (d.length) x.dv = d[0]; }), 0); }
  if (tab === "cat") return <Catalog />;
  if (tab === "his") return <Historial go={go} />;
  const flow = ["not", "ele", "jus", "res"].includes(tab);
  return <div className="space-y-5">{flow && <CaseFlow tab={tab} go={go} />}{tab === "not" ? <Notif go={go} /> : <Forms tab={tab} go={go} />}</div>;
}

/* ---------- recorrido del expediente: Notificación → Elevación → Justicia / SAJD → Resolución ---------- */
const ST: [string, string, string][] = [["abierto", "Abierto", "#38bdf8"], ["inv", "En investigación", "#f59e0b"], ["cerrado", "Cerrado", "#22c55e"]];
const stOf = (c: PsbCase) => c.st || (c.docs.some(d => d.t === "res") ? "cerrado" : c.docs.some(d => d.t === "ele" || d.t === "jus" || d.t === "vot") ? "inv" : "abierto");
function StChip({ c }: { c: PsbCase }) { const s = ST.find(x => x[0] === stOf(c)) || ST[0];
  return <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: s[2], borderColor: s[2] + "66", background: s[2] + "1a" }}><span className="size-1.5 rounded-full" style={{ background: s[2] }} />{s[1]}</span>; }
const curCase = () => (PX.cA || PX.cB ? getCases().find(c => c.cf === casoTxt(PX)) : undefined);
function patchCase(fn: (c: PsbCase) => void) { const cf = casoTxt(PX); LS.setJSON(K_CASES, getCases().map(c => { if (c.cf !== cf) return c; const x = structuredClone(c); fn(x); x.upd = Date.now(); return x; })); }
const jusLabel = (m?: string) => (m === "sajd" ? "Derivación a SAJD" : "Sanción a Justicia");
function CaseFlow({ tab, go }: { tab: string; go: Go }) {
  useStoreVersion();
  const [p, up] = usePX(), c = curCase(), { toast } = useFeedback();
  const has = (t: string) => !!c?.docs.some(d => d.t === t);
  const steps: [string, string, boolean, string?][] = [["not", "Notificación", has("not")], ["ele", "Elevación", has("ele")],
    ["jus", "Aprobación SAJD", c?.jusOk?.st === "ok", c?.jusOk?.st === "pend" ? "pendiente" : c?.jusOk?.st === "rej" ? "rechazada" : undefined], ["res", "Resolución", has("res")]];
  const mine = p.ag ? getCases().filter(x => x.ag === p.ag && x.cf !== c?.cf).sort((a, b) => b.upd - a.upd) : [];
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen className="size-4 text-brand-500" />
        <b className="font-mono text-sm">{p.cA || p.cB ? casoTxt(p) : "Sin expediente"}</b>
        {p.ag && <span className="text-sm text-slate-500">· {p.ag}</span>}
        {c ? <><StChip c={c} /><Select value={stOf(c)} onChange={e => { patchCase(x => { x.st = e.target.value; }); toast("Estado del expediente actualizado"); }} className="h-7 w-auto py-0 text-xs" aria-label="Estado">{ST.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></>
          : (p.cA || p.cB) && <span className="text-xs text-slate-400">· todavía no se guardó</span>}
        <button onClick={() => { up(x => { Object.assign(x, { ...blankPX(), _dv: x._dv, dv: x.dv }); }); go("not"); }} className="ml-auto text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">+ Expediente nuevo</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        {steps.map(([k, l, ok, sub], i) => (
          <span key={k} className="contents">
            {i > 0 && <ChevronRight className="size-4 text-slate-300 dark:text-slate-600" />}
            <button onClick={() => go(k)} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition", tab === k ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50")}>
              <span className={cn("grid size-4 place-items-center rounded-full text-[10px]", ok ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300")}>{ok ? <Check className="size-3" /> : i + 1}</span>{l}{sub && <span className="font-normal text-amber-600 dark:text-amber-300">· {sub}</span>}</button>
          </span>))}
      </div>
      {mine.length > 0 && <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Otros expedientes de {p.ag} ({mine.length})</p>
        <div className="flex flex-wrap gap-1.5">{mine.map(x => (
          <button key={x.id} onClick={() => { up(y => { Object.assign(y, structuredClone({ ...blankPX(), ...x.px })); }); toast(`Expediente ${x.cf} cargado`); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
            <b className="font-mono">{x.cf}</b><StChip c={x} /></button>))}</div></div>}
    </Card>);
}

function CaseCard() {
  const [p, up] = usePX();
  const R = getRoster().filter(a => lvl(a.r) > 0).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n));
  return (
    <Card>
      <CardHeader icon={<FolderOpen />} title="Expediente" desc="Se comparte entre Notificación, Elevación, Aprobación SAJD y Resolución." />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <Field label="N° de caso"><CaseInput /></Field>
          <Field label="Agente investigado"><AgentCombo value={p.ag} onChange={n => up(x => { x.ag = n; })} names={R.map(a => a.n)} placeholder="Buscar al agente investigado…" /></Field>
        </div>
        <Field label="División"><Segmented size="sm" value={p.dv} onChange={v => up(x => { x.dv = v; })} options={["IAD", "FID", "SOD"].map(v => ({ value: v, label: v }))} /></Field>
      </CardBody>
    </Card>
  );
}
function CaseInput() {
  const [p, up] = usePX(), cl = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (
    <div className="flex items-center gap-1.5 font-mono">
      <span className="text-sm text-slate-400">CF-</span>
      <Input value={p.cA} maxLength={2} onChange={e => { const v = cl(e.target.value).slice(0, 2); up(x => { x.cA = v; }); if (v.length === 2) (e.target.nextElementSibling?.nextElementSibling as HTMLInputElement)?.focus(); }} placeholder="26" className="w-14 text-center font-mono" />
      <span className="text-sm text-slate-400">-</span>
      <Input value={p.cB} maxLength={6} onChange={e => up(x => { x.cB = cl(e.target.value).slice(0, 6); })} placeholder="001474" className="w-28 text-center font-mono" />
    </div>
  );
}

function Notif({ go }: { go: Go }) {
  const { toast: toastN } = useFeedback();
  const me = useMe(), [p, up] = usePX(), F = getFaltas();
  const [g, setG] = useState("all"), [q, setQ] = useState("");
  const [cargo, setCargo] = useState(() => LS.get(myKey("psbCargo", me.n)) || psbRank(me.n) || "Junior Investigator");
  const a = p.ag ? findAgent(p.ag) : null, caso = casoTxt(p), de = emailOf(me.n), para = p.para || (a ? emailOf(a.n) : "");
  const sel = p.fl.map(i => F.find(f => f.id === i)).filter(Boolean) as Falta[];
  const canPsb = (x: { n: string; r: string }) => x.n !== me.n && (lvl(x.r) < me.l || !!excOf()[me.n]?.psb);
  const text = useMemo(() => {
    const f = a && genderOf(a.n) === "f", o = a ? (f ? "a" : "o") : "o/a", hecho = p.hecho.trim();
    const faltasTxt = !sel.length ? "[faltas]" : sel.length === 1 ? `la presunta falta ${sel[0].g} «${sel[0].n}»` : "las presuntas faltas " + joinY(sel.map(x => `«${x.n}» (${x.g})`));
    let hh = hecho || (sel.length ? `Se investiga ${faltasTxt}.` : "[Describí el hecho investigado]");
    if (hecho && sel.length) hh += `\n\n**${sel.length === 1 ? "Falta relacionada" : "Faltas relacionadas"}:** ${sel.map(x => `${x.n} (${x.g})`).join(" · ")}`;
    let body = `## 📩 Notificación de investigación — ${caso}\n\n**De:** ${de || "—"}\n**Para:** ${para || "—"}\n\nHola,\n\nMe comunico con usted para informarle de que se ha abierto una investigación en la **${PSB_DIVS[p.dv]}**, con número de caso **${caso}**.\n\n### 🔎 Hecho investigado\n${hh}\n\nLa investigación se encuentra en etapa inicial y **no implica una conclusión sobre los hechos**. La calificación de la conducta, si correspondiera, se determinará al finalizar el procedimiento.\n\n### ⚖️ Sus derechos\n- Conocer los cargos que se le imputan, que se le detallarán por este medio si se formalizan.\n- Contar con tiempo razonable para preparar su defensa antes de ser entrevistad${o}.\n- Estar asistid${o} por un representante durante las entrevistas formales. Si desea contar con uno, indíquelo por este medio.\n\n### 📅 Próximos pasos\nPróximamente se le citará a una entrevista; se coordinará fecha y hora por este canal.\n\n> 🔒 Este procedimiento es **confidencial** y no debe comentarse fuera de los canales oficiales.\n\nSaludos.`;
    if (p.firma) body += `\n**${me.n}** · ${cargo} · ${PSB_DIVS_EN[p.dv]}`;
    return body;
  }, [p, a, sel, caso, de, para, me.n, cargo]);
  const miss = [!para && "destinatario", (p.cA.length < 2 || p.cB.length < 6) && "caso", !p.fl.length && !p.hecho.trim() && "hecho investigado"].filter(Boolean) as string[];
  const s = norm(q.trim()), items = F.filter(f => (g === "all" || f.g === g) && (!s || norm(f.n + " " + f.d).includes(s)));
  return (
    <Split>
      <Col>
        <Card>
          <CardHeader icon={<Bell />} title="Notificación de apertura de expediente" desc="Fase 2 del procedimiento: apertura y derechos del agente investigado." />
          <CardBody>
            <Field label="N° de caso"><CaseInput /></Field>
            <Field label="Agente investigado">
              <AgentPicker value={p.ag} onChange={n => up(x => { x.ag = n; x.para = ""; })} filter={canPsb} empty="No hay agentes que puedas notificar con tu rango" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="De"><Input value={de} readOnly className="font-mono text-xs text-slate-500" /></Field>
              <Field label="Para"><Input value={para} onChange={e => up(x => { x.para = e.target.value; })} placeholder="correo@sanandreas.eu" className="font-mono text-xs" /></Field>
            </div>
            <Field label="División"><Segmented size="sm" value={p.dv} onChange={v => up(x => { x.dv = v; })} options={["IAD", "FID", "SOD"].map(v => ({ value: v, label: PSB_DIVS[v].replace(/^División de /, "") }))} /></Field>
            <Field label="Hecho investigado" hint="(opcional si elegís faltas)"><Textarea rows={3} value={p.hecho} onChange={e => up(x => { x.hecho = e.target.value; })} placeholder="Describí brevemente el hecho que se investiga." /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<BookMarked />} title="Faltas relacionadas" desc={`${F.length} faltas en el catálogo · ${p.fl.length} elegidas`} />
          <CardBody>
            {sel.length > 0 && <div className="flex flex-wrap gap-1.5">{sel.map(f => <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{f.n} · {f.g}<button aria-label="Quitar" onClick={() => up(x => { x.fl = x.fl.filter(y => y !== f.id); })} className="rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/25"><X className="size-3" /></button></span>)}</div>}
            <div className="flex flex-wrap gap-2">
              <SearchInput className="min-w-[12rem] flex-1" value={q} onChange={setQ} placeholder="Buscar falta…" />
              <Segmented size="sm" value={g} onChange={setG} options={[["all", "Todas"], ["leve", "Leves"], ["grave", "Graves"], ["muy grave", "Muy graves"]].map(([v, l]) => ({ value: v, label: `${l} (${F.filter(f => v === "all" || f.g === v).length})` }))} />
            </div>
            <div className="scrollbar-thin max-h-80 space-y-1 overflow-y-auto pr-1">
              {items.length ? items.map((f, i) => { const on = p.fl.includes(f.id); return (
                <div key={f.id}>
                  {(i === 0 || items[i - 1].g !== f.g) && <p className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Faltas {GL[f.g]}</p>}
                  <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition", on ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                    <input type="checkbox" className="mt-0.5 accent-brand-600" checked={on} onChange={e => up(x => { x.fl = e.target.checked ? [...x.fl, f.id] : x.fl.filter(y => y !== f.id); })} />
                    <span className="min-w-0 flex-1"><b className="block text-sm font-medium">{f.n}</b><small className="text-xs text-slate-500">{f.d}</small></span>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", G_CLS[f.g])}>{f.g}</span>
                  </label>
                </div>); }) : <p className="py-6 text-center text-sm text-slate-400">Sin resultados</p>}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox checked={p.firma} onChange={v => up(x => { x.firma = v; })} label="Agregar firma" />
              <Select value={cargo} onChange={e => { setCargo(e.target.value); LS.set(myKey("psbCargo", me.n), e.target.value); }} disabled={!p.firma} className="w-auto text-sm">{CARGOS.map(c => <option key={c}>{c}</option>)}</Select>
            </div>
          </CardBody>
        </Card>
      </Col>
      <Col>
        <Card className="p-4">
          <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Mail className="size-4" /></span>
            <dl className="grid flex-1 grid-cols-[4rem_1fr] gap-y-1 text-xs"><dt className="text-slate-400">De</dt><dd className="truncate font-mono">{de}</dd><dt className="text-slate-400">Para</dt><dd className="truncate font-mono">{para || "—"}</dd>
              <dt className="text-slate-400">Asunto</dt><dd className="font-medium">PSB · Notificación de apertura de expediente — {caso}</dd></dl></div>
          <p className={cn("mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold", miss.length ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300")}>{miss.length ? "Falta: " + miss.join(", ") : "✓ Listo"}</p>
        </Card>
        <DiscordOutput sticky={false} title="Notificación de investigación" tag="Discord" text={text} errors={miss}
          extra={<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" icon={<History />} onClick={() => { const r = saveDoc("not", text, me.n); toastN(r.msg, r.ok ? undefined : "err"); }}>Guardar</Button>
            <Button size="sm" icon={<ChevronRight />} onClick={() => { const r = saveDoc("not", text, me.n); toastN(r.ok ? `Expediente ${casoTxt(PX)} abierto · seguí con la elevación` : r.msg, r.ok ? undefined : "err"); if (r.ok) go("ele"); }}>Abrir expediente y seguir</Button></div>} />
      </Col>
    </Split>
  );
}

/* conclusión, encuadre, sanción/medida y efecto de la elevación (se usa en la elevación y en el bloque resolutivo de la resolución) */
function medidaLines(E: PXT["ele"], firme: boolean) {
  const L = [`- **Conclusión:** ${E.concl}.`];
  if (E.enc.trim()) L.push(`- **Encuadre:** ${E.enc.trim().replace(/\.$/, "")}.`);
  if (E.concl === "Sustained") { const nv = (PSB_NIV.find(x => x[0] === E.niv) || PSB_NIV[0])[1];
    if (E.niv === "0") L.push(`- **Medida:** ${nv}${E.det.trim() ? " " + E.det.trim().replace(/\.$/, "") : ""}. ${NIV_D["0"]}`);
    else { L.push(`- **Sanción:** ${nv}${E.det.trim() ? " " + E.det.trim().replace(/\.$/, "") : ""}.`); const ef = E.efe.trim() || psbEfecto(E.niv, E.grav); if (ef) L.push(`- **Efecto:** ${ef.replace(/\.$/, "")}.`); } }
  if (E.arch) L.push(firme ? "- **Se archiva el expediente.**" : E.concl === "Sustained" ? "- Una vez firmada, **se archiva el expediente**." : "- Con esta conclusión, **se archiva el expediente**.");
  return L;
}
/* la elevación vale para la resolución solo si es del mismo número de expediente */
const eleLista = (E: PXT["ele"], cf: string) => !!(E.hechos.trim() || E.const.trim() || E.enc.trim() || E.det.trim()) && (!E.cf || E.cf === cf);

function Forms({ tab, go }: { tab: string; go: Go }) {
  const me = useMe(), { toast } = useFeedback(), [p, up] = usePX(), F = getFaltas(), E = p.ele, J = p.jus, Rs = p.res;
  const cf = p.cA || p.cB ? casoTxt(p) : "CF-XX-XXXXXX", firma = `**${me.n}** · ${psbRank(me.n) || "Investigator"} · ${PSB_DIVS_EN[p.dv]}`;
  const text = useMemo(() => {
    if (tab === "ele") {
      const pa = E.para ? findAgent(E.para) : null, id = E.para && dcIdOf(E.para);
      const L = [`**📁 Expediente ${cf} | Disciplinary Action — ${p.ag || "[agente]"}**`,
        `**Para:** ${pa ? `${rkFem(pa.r, pa.n)} ${pa.n}${pa.p ? " #" + pa.p : ""}` : "[destinatario]"}${id ? ` ||(<@${id}>)||` : ""} — ${p.dv}`, `**De:** ${psbDeOf(me.n)} — ${p.dv}`, "",
        `${pa ? `${rkFem(pa.r, pa.n)} ${apellido(pa.n)}` : "[Destinatario]"}, le elevo el caso de la referencia para su decisión.`, "",
        "**📌 Hechos**", E.hechos.trim() || "[Describí los hechos]", "", "**🔎 Constatado**",
        ...(E.const.trim() ? E.const.trim().split("\n").map(x => x.trim()).filter(Boolean).map(x => "- " + x.replace(/^[-•]\s*/, "")) : ["- [Lo constatado en la investigación]"]), "",
        "**⚖️ Propuesta**", ...medidaLines(E, false)];
      if (E.pend.trim()) L.push("", "**⚠️ Pendiente**", E.pend.trim());
      L.push("", "Quedo a la espera de su decisión para proceder."); return L.join("\n");
    }
    if (tab === "vot") {
      const V = p.vot, cl = V.cons.trim().split("\n").map(x => x.trim().replace(/^[-•]\s*/, "")).filter(Boolean), ops = V.ops.filter(o => o.t.trim());
      return [`## 🗳️ Votación ${p.dv} | Expediente ${cf}`, "", V.intro.trim() || `Compañeros de la ${p.dv}, se somete a votación la resolución del siguiente caso.`, "",
        "**📌 Resumen**", V.res.trim() || "[Resumen del caso]", "", "**🔎 Constatado**", ...(cl.length ? cl.map(x => "- " + x) : ["- [Lo constatado]"]), `- Conclusión del caso: **${V.concl}**.`, "",
        "**⚖️ Opciones**", "", ...(ops.length ? ops.flatMap((o, i) => [`${NUM[i] || i + 1 + "."} **${o.t.trim()}**`, ...(o.d.trim() ? [o.d.trim()] : []), ""]) : ["[Opciones]", ""]),
        ...(V.nota.trim() ? [V.nota.trim(), ""] : []), ...(V.conf ? [`🔒 *Recuerden que la información de este expediente es confidencial y no debe comentarse fuera de la ${p.dv}.*`] : [])].join("\n").trim();
    }
    if (tab === "jus") {
      const a = p.ag ? findAgent(p.ag) : null, f = F.find(x => x.id === J.falta), S = J.s.filter(x => x.t.trim() || x.p.trim()), aal = a && genderOf(a.n) === "f" ? "a la agente" : "al agente";
      const cl = E.const.trim().split("\n").map(x => x.trim().replace(/^[-•]\s*/, "")).filter(Boolean);
      const sum = J.sum !== false && eleLista(E, cf) ? ["> **Resumen del expediente " + cf + ":**", ...(E.hechos.trim() ? [`> - **Hechos:** ${E.hechos.trim().replace(/\n+/g, " ")}`] : []), ...(cl.length ? [`> - **Constatado:** ${cl.join("; ")}`] : []),
        `> - **Conclusión de la PSB:** ${E.concl}${E.concl === "Sustained" ? ` · propuesta: ${NIV_T[E.niv]}` : ""}`, ""] : [];
      return [J.mode === "sajd" ? `> **Se deriva al SAJD el expediente ${cf} ${a && genderOf(a.n) === "f" ? "de la agente" : "del agente"} ${p.ag || "X"}, con número de placa ${(a && a.p) || "X"}, por los siguientes motivos:**`
        : `> **Se sanciona ${aal} ${p.ag || "X"}, con número de placa ${(a && a.p) || "X"}, por los siguientes motivos:**`,
        ...(S.length ? S.map((x, i) => `> - ${x.t.trim() || "Sanción " + (i + 1)}${x.p.trim() ? `: ${x.p.trim()}` : ""}`) : ["> - Sanción 1: [Adjuntar pruebas: vídeo, imagen, etc.]"]), "",
        ...sum, "> **Publicación de la sanción:**", `> - Sanción: ${f ? `**${f.n}** (${f.g}) — ${f.d}` : "[Falta del catálogo de faltas, copiada literal, con su imagen.]"}`, "",
        "> **Consecuencias disciplinarias:**", ...(J.cons.length || J.consx.trim() ? [...J.cons, ...(J.consx.trim() ? [J.consx.trim()] : [])].map(x => "> - " + x) : ["> - [Indicar las medidas correspondientes: degradación, suspensión, expulsión, etc.]"]), "",
        `> <@&${JUS_ROLE}>`].join("\n");
    }
    const op = Rs.modo === "web" ? ["- **Por este medio:** se le enviará la resolución por escrito, como se le ha venido notificando."] : Rs.modo === "pres" ? ["- **De manera presencial:** se coordinará fecha y hora para comunicársela en persona."]
      : ["- **Por este medio:** se le enviará la resolución por escrito, como se le ha venido notificando.", "- **De manera presencial:** se coordinará fecha y hora para comunicársela en persona."];
    return [`## 📩 Resolución de investigación — ${cf}`, "", `**De:** ${emailOf(me.n)}`, `**Para:** ${p.ag ? emailOf(p.ag) : "—"}`, "", "Hola,", "",
      `Le informo de que la investigación con número de caso **${cf}**, a cargo de la **${PSB_DIVS[p.dv]}**, ya cuenta con una **resolución**.`, "",
      Rs.modo === "ambas" ? "### 📄 Cómo desea recibirla" : "### 📄 Cómo se le comunicará", ...op, "",
      ...(Rs.modo === "ambas" ? ["Responda a este mensaje indicando la opción que prefiera y se procederá en consecuencia.", ""] : []),
      ...(Rs.modo !== "ambas" && Rs.bloque !== false && eleLista(E, cf) ? ["### ⚖️ Bloque resolutivo", Rs.modo === "web" ? `Revisado el expediente **${cf}**, se resuelve lo siguiente:` : `En la reunión presencial se le comunicará la resolución del expediente **${cf}**:`, ...medidaLines(E, true), ""] : []),
      ...(Rs.extra.trim() ? [Rs.extra.trim(), ""] : []),
      "Recuerde que, si la sanción es de **Nivel 3 o superior**, puede solicitar un **Board of Rights** dentro de las **72 horas** siguientes a recibirla.", "",
      "> 🔒 Este procedimiento es **confidencial** y no debe comentarse fuera de los canales oficiales.", "", "Saludos.", firma].join("\n");
  }, [tab, p, E, J, Rs, F, cf, me.n, firma]);
  const co = Object.keys(uMap("psb")).filter(n => n !== me.n).sort((a, b) => UNITS.psb.R.indexOf(uTop("psb", uMap("psb")[a])) - UNITS.psb.R.indexOf(uTop("psb", uMap("psb")[b])));
  const fq = norm(J.fq), FL = F.filter(x => !fq || norm(x.n + " " + x.d + " " + x.g).includes(fq)).slice(0, 60);
  const ue = (fn: (e: PXT["ele"]) => void) => up(x => { fn(x.ele); x.ele.cf = x.cA || x.cB ? casoTxt(x) : ""; }), uj = (fn: (j: PXT["jus"]) => void) => up(x => fn(x.jus));
  const title = { ele: "Elevación de caso", jus: jusLabel(J.mode), res: "Notificación de resolución", vot: "Votación" }[tab] || "";
  const c = curCase(), jst = c?.jusOk?.st;
  /* pasa a Justicia con todo lo de la elevación: motivos, falta notificada y medida propuesta */
  const toJus = () => { up(x => { const El = x.ele, cs = El.const.split("\n").map(t => t.trim().replace(/^[-•]\s*/, "")).filter(Boolean);
    x.jus.s = (cs.length ? cs : [El.hechos.trim()]).filter(Boolean).map(t => ({ t, p: "" })); if (!x.jus.s.length) x.jus.s = [{ t: "", p: "" }];
    if (!x.jus.falta && x.fl[0]) x.jus.falta = x.fl[0];
    if (El.concl === "Sustained" && PSB_CONS[+El.niv]) x.jus.cons = [PSB_CONS[+El.niv]]; if (El.det.trim()) x.jus.consx = El.det.trim(); x.jus.sum = true; }); go("jus"); };
  const r0 = (r: { ok: boolean; msg: string }) => { toast(r.msg, r.ok ? undefined : "err"); return r.ok; };
  const uv = (fn: (v: PXT["vot"]) => void) => up(x => fn(x.vot)), V = p.vot;
  const saveCase = () => { const r = saveDoc(tab, text, me.n, tab === "vot" ? V.concl : tab === "ele" ? E.concl : ""); toast(r.msg, r.ok ? undefined : "err"); };
  const pill = (on: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium transition", on ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300");
  return (
    <Split>
      <Col>
        <CaseCard />
        {tab === "ele" && <Card>
          <CardHeader icon={<ArrowUpRight />} title="Elevación" />
          <CardBody>
            <Field label="Para" hint="(mando que decide)"><AgentCombo value={E.para} onChange={n => ue(x => { x.para = n; })} names={co} sub={n => psbRank(n) + (dcIdOf(n) ? "" : " · sin Discord ID")} placeholder="Buscar al mando que decide…" /></Field>
            <Field label="📌 Hechos"><Textarea rows={3} value={E.hechos} onChange={e => ue(x => { x.hechos = e.target.value; })} placeholder="Qué pasó y cómo llegó el caso a la PSB." /></Field>
            <Field label="🔎 Constatado" hint="(una línea por punto)"><Textarea rows={3} value={E.const} onChange={e => ue(x => { x.const = e.target.value; })} placeholder={"El error existió…\nEs su primera falta de este tipo…"} /></Field>
            <Field label="⚖️ Conclusión"><div className="grid gap-2 sm:grid-cols-2">{PSB_CONCL.map(([k, d]) => (
              <button key={k} onClick={() => ue(x => { x.concl = k; })} className={cn("rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", E.concl === k ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50")}>
                <b className="text-sm">{k}</b><small className="block text-xs text-slate-500">{d}</small></button>))}</div></Field>
            <Field label="Encuadre" hint="(opcional)"><Input value={E.enc} onChange={e => ue(x => { x.enc = e.target.value; })} placeholder="Ej: acción tipificada como grave con consideración de leve, por las atenuantes indicadas" /></Field>
            {E.concl === "Sustained" && <>
              <Field label="Propuesta (medida o sanción)"><div className="grid gap-2 sm:grid-cols-2">{PSB_NIV.map(([k]) => (
                <button key={k} onClick={() => ue(x => { x.niv = k; x.efe = ""; })} className={cn("rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", E.niv === k ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50", k === "0" && "sm:col-span-2")}>
                  <b className="text-sm">{NIV_T[k]}</b>{k === "0" && <span className="ml-2 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">no disciplinaria</span>}
                  <small className="mt-0.5 block text-xs leading-snug text-slate-500">{NIV_D[k].replace(/\*\*/g, "")}</small></button>))}</div></Field>
              {E.niv !== "0" && <Field label="Gravedad"><Select value={E.grav} onChange={e => ue(x => { x.grav = e.target.value; x.efe = ""; })} className="w-auto text-sm">{["leve", "grave", "muy grave"].map(g => <option key={g}>{g}</option>)}</Select></Field>}
              <Field label="Detalle de la sanción" hint="(opcional)"><Input value={E.det} onChange={e => ue(x => { x.det = e.target.value; })} placeholder="Ej: con acción correctiva (repaso de los artículos de tránsito)" /></Field>
              {E.niv !== "0" && <Field label="Efecto" hint="(se completa según el nivel; podés cambiarlo)"><Input value={E.efe} onChange={e => ue(x => { x.efe = e.target.value; })} placeholder={psbEfecto(E.niv, E.grav) || ""} /></Field>}
            </>}
            <Checkbox checked={E.arch} onChange={v => ue(x => { x.arch = v; })} label="Indicar que se archiva el expediente" />
            <Field label="⚠️ Pendiente" hint="(opcional)"><Input value={E.pend} onChange={e => ue(x => { x.pend = e.target.value; })} placeholder="Ej: verificar que la sanción al ciudadano se haya corregido" /></Field>
          </CardBody>
        </Card>}
        {tab === "vot" && <Card>
          <CardHeader icon={<Vote />} title="Votación" desc="Plantilla editable. Podés traer los datos de la elevación y armar las opciones a votar." />
          <CardBody>
            <div className="flex gap-2.5 rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-xs text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100"><Info className="mt-0.5 size-4 shrink-0" />
              <p><b>Cómo se arma:</b> en <b>Resumen</b> va qué pasó en pocas líneas · en <b>Constatado</b> lo que se comprobó en la investigación (un punto por línea) · en <b>Opciones</b> las medidas que se votan, cada una con su explicación (se numeran solas en Discord) · la <b>nota común</b> es lo que se aplica gane la opción que gane. Si ya armaste la elevación, traé los datos con un clic.</p></div>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" icon={<FolderInput />} onClick={() => uv(v => { v.res = E.hechos; v.cons = E.const; v.concl = E.concl; })}>Traer de la elevación</Button></div>
            <Field label="Introducción" hint="(opcional)"><Input value={V.intro} onChange={e => uv(v => { v.intro = e.target.value; })} placeholder={`Compañeros de la ${p.dv}, se somete a votación la resolución del siguiente caso.`} /></Field>
            <Field label="📌 Resumen"><Textarea rows={3} value={V.res} onChange={e => uv(v => { v.res = e.target.value; })} placeholder="Una oficial imputó el **Art. 63.3** (…) en lugar del **Art. 138.37** (…)" /></Field>
            <Field label="🔎 Constatado" hint="(una línea por punto)"><Textarea rows={3} value={V.cons} onChange={e => uv(v => { v.cons = e.target.value; })} placeholder={"Error administrativo al elegir el artículo, sin intención.\nEs su **primera falta**.\n**Reconoció el error y demostró entenderlo** en la entrevista."} /></Field>
            <Field label="Conclusión del caso"><Segmented size="sm" value={V.concl} onChange={v => uv(x => { x.concl = v; })} options={PSB_CONCL.map(([k]) => ({ value: k, label: k }))} /></Field>
            <Field label="⚖️ Opciones a votar"><div className="space-y-2">{V.ops.map((o, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2"><Input value={o.t} onChange={e => uv(v => { v.ops[i].t = e.target.value; })} placeholder="Título de la opción" className="font-semibold" />
                  <Textarea rows={2} value={o.d} onChange={e => uv(v => { v.ops[i].d = e.target.value; })} placeholder="Descripción" className="text-sm" /></div>
                <Button variant="ghost" size="icon" aria-label="Quitar opción" onClick={() => uv(v => { v.ops.splice(i, 1); })}><X /></Button>
              </div>))}
              <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs text-slate-500">Agregar:</span>
                {PSB_NIV.map(([k]) => <button key={k} onClick={() => uv(v => { v.ops.push({ t: NIV_T[k], d: NIV_D[k] }); })} className={pill(V.ops.some(o => o.t === NIV_T[k]))}>{NIV_T[k]}</button>)}
                <button onClick={() => uv(v => { v.ops.push({ t: "", d: "" }); })} className={pill(false)}>+ Libre</button></div></div></Field>
            <Field label="Nota común a todas las opciones" hint="(opcional)"><Input value={V.nota} onChange={e => uv(v => { v.nota = e.target.value; })} placeholder="En ambos casos, la oficial realizará una evaluación sobre los artículos de tránsito antes de archivar el expediente." /></Field>
            <Checkbox checked={V.conf} onChange={v => uv(x => { x.conf = v; })} label="Recordatorio de confidencialidad al final" />
          </CardBody>
        </Card>}
        {tab === "jus" && <Card>
          <CardHeader icon={<Gavel />} title="Aprobación SAJD" desc="San Andreas Justice Department: se envía el caso y, cuando lo aprueba, sigue la resolución." />
          <CardBody>
            <Field label="Tipo"><Segmented size="sm" value={J.mode || "san"} onChange={v => uj(j => { j.mode = v; })} options={[{ value: "san", label: "Sanción a Justicia" }, { value: "sajd", label: "Derivación a SAJD" }]} /></Field>
            {jst && <p className={cn("rounded-lg px-3 py-2 text-xs font-semibold", jst === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : jst === "rej" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-amber-400/15 text-amber-700 dark:text-amber-300")}>
              {jst === "ok" ? `✓ Aprobado por el SAJD · marcado por ${c!.jusOk!.by} el ${fdt(c!.jusOk!.ts)}` : jst === "rej" ? `✗ Rechazado por el SAJD (${fdt(c!.jusOk!.ts)}) · corregilo y volvé a enviarlo` : `⏳ Enviado el ${fdt(c!.jusOk!.ts)} · pendiente de aprobación`}</p>}
            <Checkbox checked={J.sum !== false} onChange={v => uj(j => { j.sum = v; })} label={eleLista(E, cf) ? "Adjuntar el resumen del expediente (hechos, constatado y conclusión de la elevación)" : "Adjuntar el resumen del expediente (completá la elevación de este CF)"} />
            <div className="flex gap-2.5 rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-xs text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100"><Info className="mt-0.5 size-4 shrink-0" />
              <p><b>Cómo se arma:</b> en <b>Motivos</b> va qué hizo el agente con sus pruebas · en <b>Publicación</b> va la <b>falta del catálogo</b> (lo que figura en el Notion), no la medida · en <b>Consecuencias</b> va la medida que se aplica (por ejemplo, el Notice to Correct Deficiencies).</p></div>
            <Field label="Motivos y pruebas"><div className="space-y-2">{J.s.map((x, i) => (
              <div key={i} className="flex gap-2"><Input value={x.t} onChange={e => uj(j => { j.s[i].t = e.target.value; })} placeholder={`Motivo ${i + 1}: qué hizo (ej: imputó el Art. 63.3 en lugar del 138.37 en el Informe #1152)`} />
                <Input value={x.p} onChange={e => uj(j => { j.s[i].p = e.target.value; })} placeholder="Pruebas: enlace a vídeo o imagen" className="max-w-[14rem]" />
                <Button variant="ghost" size="icon" aria-label="Quitar" onClick={() => uj(j => { j.s.splice(i, 1); if (!j.s.length) j.s = [{ t: "", p: "" }]; })}><X /></Button></div>))}
              <Button variant="outline" size="sm" icon={<Plus />} onClick={() => uj(j => { j.s.push({ t: "", p: "" }); })}>Añadir motivo</Button></div></Field>
            <Field label="Publicación de la sanción" hint="(la falta del catálogo, se copia literal)">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={J.fq} onChange={e => uj(j => { j.fq = e.target.value; })} placeholder="Buscar en el catálogo de faltas…" /></div>
              <div className="scrollbar-thin mt-2 max-h-72 space-y-1 overflow-y-auto">{FL.length ? FL.map(x => (
                <button key={x.id} onClick={() => uj(j => { j.falta = j.falta === x.id ? "" : x.id; })} className={cn("flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition", J.falta === x.id ? "border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                  <span className={cn("mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", G_CLS[x.g])}>{x.g}</span>
                  <span className="min-w-0"><b className="block text-sm font-medium">{x.n}</b><small className="text-xs text-slate-500">{x.d}</small></span></button>)) : <p className="p-2 text-xs text-slate-400">Nada coincide.</p>}</div>
            </Field>
            <Field label="Consecuencias disciplinarias" hint="(la medida que se aplica)">
              <div className="flex flex-wrap gap-1.5">{PSB_CONS.map(x => <button key={x} title={x} onClick={() => uj(j => { j.cons = j.cons.includes(x) ? j.cons.filter(y => y !== x) : [...j.cons, x]; })} className={pill(J.cons.includes(x))}>{x === NTCD ? "Notice to Correct Deficiencies" : x}</button>)}</div>
              <Input className="mt-2" value={J.consx} onChange={e => uj(j => { j.consx = e.target.value; })} placeholder="Otra medida o detalle (ej: suspensión de 5 días)" />
            </Field>
          </CardBody>
        </Card>}
        {tab === "res" && <Card>
          <CardHeader icon={<FileCheck2 />} title="Resolución" />
          <CardBody>
            <Field label="Cómo se comunica"><Segmented size="sm" value={Rs.modo} onChange={v => up(x => { x.res.modo = v; })} options={[{ value: "ambas", label: "Que elija el agente" }, { value: "web", label: "Por este medio" }, { value: "pres", label: "Presencial" }]} /></Field>
            {Rs.modo !== "ambas" && <div className={cn("rounded-xl border p-3 text-sm", eleLista(E, cf) ? "border-slate-200 dark:border-slate-800" : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200")}>
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={Rs.bloque !== false} onChange={e => up(x => { x.res.bloque = e.target.checked; })} />
                <span><b>Agregar el bloque resolutivo</b><span className="block text-xs text-slate-500">{eleLista(E, cf) ? `Se toma de la Elevación de este mismo expediente (${cf}): conclusión ${E.concl}${E.concl === "Sustained" ? ", sanción y efecto" : ""}.` : E.cf && E.cf !== cf ? `La Elevación cargada es del expediente ${E.cf}, no del ${cf}: revisá el número.` : `La Elevación del expediente ${cf} está vacía: completala para que salga el bloque.`}</span></span></label></div>}
            <Field label="Agregado" hint="(opcional)"><Textarea rows={2} value={Rs.extra} onChange={e => up(x => { x.res.extra = e.target.value; })} placeholder="Algo más que quieras decirle." /></Field>
          </CardBody>
        </Card>}
      </Col>
      <DiscordOutput title={title} tag="Discord" text={text} ctx={{ users: Object.fromEntries(co.map(n => [dcIdOf(n), n]).filter(([i]) => i)) }}
        errors={tab === "jus" && !J.falta ? ["la falta del catálogo para la publicación"] : undefined}
        extra={<div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={<History />} onClick={saveCase}>Guardar</Button>
          {tab === "ele" && (E.concl === "Sustained"
            ? <Button size="sm" icon={<Gavel />} onClick={() => { if (r0(saveDoc("ele", text, me.n, E.concl, "inv"))) toJus(); }}>Guardar y pasar al SAJD</Button>
            : <Button size="sm" icon={<ChevronRight />} onClick={() => { if (r0(saveDoc("ele", text, me.n, E.concl, "inv"))) go("res"); }}>Guardar y pasar a la resolución</Button>)}
          {tab === "jus" && (!jst || jst === "rej"
            ? <Button size="sm" icon={<Send />} onClick={() => { if (r0(saveDoc("jus", text, me.n, "", "inv"))) { patchCase(x => { x.jusOk = { st: "pend", by: me.n, ts: Date.now(), m: J.mode || "san" }; }); toast("Enviado: queda pendiente de aprobación del SAJD"); } }}>Guardar y enviar al SAJD</Button>
            : jst === "pend" ? <>
              <Button size="sm" icon={<ThumbsUp />} onClick={() => { patchCase(x => { x.jusOk = { ...x.jusOk!, st: "ok", by: me.n, ts: Date.now() }; }); toast("El SAJD aprobó el caso · seguí con la resolución"); go("res"); }}>SAJD aprobó</Button>
              <Button size="sm" variant="ghost" className="text-red-600" icon={<ThumbsDown />} onClick={() => { patchCase(x => { x.jusOk = { ...x.jusOk!, st: "rej", by: me.n, ts: Date.now() }; }); toast("Marcado como rechazado: corregilo y volvé a enviarlo"); }}>Rechazó</Button></>
            : <Button size="sm" icon={<ChevronRight />} onClick={() => go("res")}>Ir a la resolución</Button>)}
          {tab === "res" && <Button size="sm" icon={<Check />} onClick={() => { if (r0(saveDoc("res", text, me.n, "", "cerrado"))) toast(`Expediente ${cf} resuelto y cerrado`); }}>Guardar y cerrar expediente</Button>}
        </div>} />
    </Split>
  );
}

function Catalog() {
  const me = useMe(), { toast, confirm } = useFeedback(), F = getFaltas(), can = isPSB(me.n) || me.admin;
  const [ed, setEd] = useState<Falta | null>(null), [nw, setNw] = useState({ g: "leve", n: "", d: "" }), [q, setQ] = useState("");
  const save = (l: Falta[]) => LS.setJSON("lspdt.faltas", l);
  const s = norm(q), L = F.filter(f => !s || norm(f.n + " " + f.d).includes(s));
  return (
    <Card>
      <CardHeader icon={<BookMarked />} title={`Catálogo de faltas (${F.length})`} desc={can ? "Lo usan la Notificación y la Sanción a Justicia." : undefined}
        action={can && <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={async () => { if (await confirm("¿Restaurar el catálogo original? Se pierden los cambios.", { danger: true })) { save(FALTAS_DEF.map(f => ({ ...f }))); toast("Catálogo restaurado"); } }}>Restaurar original</Button>} />
      <CardBody>
        {!can && <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800/50"><Lock className="size-4" />Solo los miembros de la PSB pueden modificar el catálogo. Estás viendo la versión de solo lectura.</p>}
        {can && <div className="grid gap-2 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-[9rem_1fr_1.4fr_auto] dark:border-slate-700">
          <Select value={nw.g} onChange={e => setNw({ ...nw, g: e.target.value })} className="text-sm">{["leve", "grave", "muy grave"].map(g => <option key={g}>{g}</option>)}</Select>
          <Input value={nw.n} onChange={e => setNw({ ...nw, n: e.target.value })} placeholder="Nombre de la falta" />
          <Input value={nw.d} onChange={e => setNw({ ...nw, d: e.target.value })} placeholder="Descripción" />
          <Button icon={<Plus />} onClick={() => { if (!nw.n.trim()) { toast("Poné el nombre de la falta", "err"); return; } save([...F, { id: "c" + uid(), g: nw.g, n: nw.n.trim(), d: nw.d.trim() }]); setNw({ g: nw.g, n: "", d: "" }); toast("Falta agregada"); }}>Agregar</Button>
        </div>}
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" /></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map((f, i) => (
          <div key={f.id}>
            {(i === 0 || L[i - 1].g !== f.g) && <p className="pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Faltas {GL[f.g]}</p>}
            {ed?.id === f.id ? (
              <div className="grid gap-2 py-2 sm:grid-cols-[9rem_1fr_1.4fr_auto]">
                <Select value={ed.g} onChange={e => setEd({ ...ed, g: e.target.value })} className="text-sm">{["leve", "grave", "muy grave"].map(g => <option key={g}>{g}</option>)}</Select>
                <Input value={ed.n} onChange={e => setEd({ ...ed, n: e.target.value })} /><Input value={ed.d} onChange={e => setEd({ ...ed, d: e.target.value })} />
                <div className="flex gap-1"><Button size="sm" icon={<Save />} onClick={() => { save(F.map(x => (x.id === f.id ? { ...ed, n: ed.n.trim() || f.n, d: ed.d.trim() } : x))); setEd(null); toast("Falta actualizada"); }}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEd(null)}>Cancelar</Button></div>
              </div>
            ) : (
              <div className="group flex items-start gap-3 py-2.5">
                <span className={cn("mt-0.5 w-20 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[10.5px] font-semibold", G_CLS[f.g])}>{f.g}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{f.n}</p><p className="text-xs text-slate-500">{f.d}</p></div>
                {can && <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button variant="ghost" size="sm" icon={<Pencil />} aria-label="Editar" onClick={() => setEd({ ...f })} />
                  <Button variant="ghost" size="sm" className="text-red-600" icon={<Trash2 />} aria-label="Quitar" onClick={async () => { if (await confirm(`¿Quitar «${f.n}» del catálogo?`, { danger: true })) { save(F.filter(x => x.id !== f.id)); toast("Falta quitada"); } }} />
                </div>}
              </div>)}
          </div>))}</div>
      </CardBody>
    </Card>
  );
}

/* ---------- historial de expedientes y comunicados ---------- */
type PsbDoc = { t: string; txt: string; ts: number; by: string };
type PsbCase = { id: string; cf: string; ag: string; dv: string; by: string; ts: number; upd: number; concl: string; docs: PsbDoc[]; px: PXT; st?: string; ois?: string; jusOk?: { st: "pend" | "ok" | "rej"; by: string; ts: number; m?: string } };
const K_CASES = "lspdt.psbCases";
const getCases = () => LS.json<PsbCase[]>(K_CASES, []);
function saveDoc(t: string, txt: string, by: string, concl = "", st = "") {
  const p = PX; if (!p.cA && !p.cB) return { ok: false, msg: "Poné el número de expediente (CF) para guardarlo" };
  const cf = casoTxt(p), L = getCases(), i = L.findIndex(c => c.cf === cf), now = Date.now();
  const c: PsbCase = i >= 0 ? { ...L[i] } : { id: uid(), cf, ag: p.ag, dv: p.dv, by, ts: now, upd: now, concl: "", docs: [], px: p };
  c.ag = p.ag || c.ag; c.dv = p.dv; c.upd = now; c.px = structuredClone(p); if (concl) c.concl = concl;
  if (st && !(st === "inv" && c.st === "cerrado")) c.st = st; else if (!c.st) c.st = "abierto";
  c.docs = [...c.docs.filter(d => !(d.t === t && d.txt === txt)), { t, txt, ts: now, by }];
  LS.setJSON(K_CASES, i >= 0 ? L.map((x, j) => (j === i ? c : x)) : [...L, c]);
  return { ok: true, msg: `Guardado en el historial · ${cf} (${c.docs.length} ${c.docs.length === 1 ? "comunicado" : "comunicados"})` };
}
const DOC_T: Record<string, string> = { ois: "Informe OIS (remitido por el sargento)", not: "Notificación", ele: "Elevación de caso", jus: "Aprobación SAJD", res: "Resolución", vot: "Votación" };
const fdt = (t: number) => new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

function Historial({ go }: { go: Go }) {
  useStoreVersion();
  const { toast, confirm } = useFeedback(), [, up] = usePX();
  const [q, setQ] = useState(""), [dv, setDv] = useState("all"), [st, setSt] = useState("all"), [open, setOpen] = useState(""), [doc, setDoc] = useState<string>("");
  const qn = norm(q.trim()), all = getCases();
  const L = all.filter(c => (dv === "all" || c.dv === dv) && (st === "all" || stOf(c) === st) && (!qn || norm(`${c.cf} ${c.ag} ${c.by} ${c.concl} ${c.docs.map(d => d.txt).join(" ")}`).includes(qn))).sort((a, b) => b.upd - a.upd);
  const del = async (c: PsbCase) => { if (await confirm(`¿Eliminar el expediente ${c.cf} y sus ${c.docs.length} comunicados del historial?`, { danger: true })) { LS.setJSON(K_CASES, getCases().filter(x => x.id !== c.id)); toast("Eliminado"); } };
  const delDoc = (c: PsbCase, d: PsbDoc) => LS.setJSON(K_CASES, getCases().map(x => (x.id === c.id ? { ...x, docs: x.docs.filter(y => y !== d && !(y.ts === d.ts && y.t === d.t)) } : x)));
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="h-9 pl-9 text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por expediente (CF), agente o texto…" /></div>
        <Segmented size="sm" value={dv} onChange={setDv} options={[["all", "Todas"], ["IAD", "IAD"], ["FID", "FID"], ["SOD", "SOD"]].map(([v, l]) => ({ value: v, label: l }))} />
        <Segmented size="sm" value={st} onChange={setSt} options={[["all", "Todos"], ...ST.map(([k, l]) => [k, l])].map(([v, l]) => ({ value: v, label: `${l} (${v === "all" ? all.length : all.filter(c => stOf(c) === v).length})` }))} />
      </Card>
      {!L.length && <Card className="p-8 text-center text-sm text-slate-500"><History className="mx-auto mb-2 size-6 text-slate-400" />Todavía no hay expedientes guardados. En cada comunicado (notificación, elevación, votación…) usá <b>Guardar en historial</b>.</Card>}
      {L.map(c => { const on = open === c.id; return (
        <Card key={c.id} className="overflow-hidden">
          <button onClick={() => { setOpen(on ? "" : c.id); setDoc(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <FolderOpen className="size-5 shrink-0 text-brand-500" />
            <div className="min-w-0 flex-1"><p className="truncate font-mono text-sm font-semibold">{c.cf} <span className="font-sans font-normal text-slate-500">· {c.ag || "sin agente"} · {c.dv}</span></p>
              <p className="truncate text-xs text-slate-500">{c.docs.length} {c.docs.length === 1 ? "comunicado" : "comunicados"} · última modificación {fdt(c.upd)} · abrió {c.by}</p></div>
            <StChip c={c} />{c.jusOk && <span className="text-[11px] text-slate-500">SAJD: {c.jusOk.st === "ok" ? "aprobado" : c.jusOk.st === "rej" ? "rechazado" : "pendiente"}</span>}
            {c.concl && <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", c.concl === "Sustained" ? "bg-red-500/10 text-red-600 dark:text-red-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300")}>{c.concl}</span>}
            <ChevronDown className={cn("size-4 text-slate-400 transition", on && "rotate-180")} />
          </button>
          {on && <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<FolderInput />} onClick={() => { up(x => { Object.assign(x, structuredClone({ ...blankPX(), ...c.px })); }); toast(`Expediente ${c.cf} cargado en los formularios`); go(stOf(c) === "cerrado" ? "res" : c.jusOk ? c.jusOk.st === "ok" ? "res" : "jus" : c.docs.some(d => d.t === "ele") ? "jus" : "ele"); }}>Abrir y seguir</Button>
              <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => del(c)}>Eliminar expediente</Button>
            </div>
            {[...c.docs].sort((a, b) => b.ts - a.ts).map(d => { const k = c.id + d.ts + d.t, sh = doc === k; return (
              <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button onClick={() => setDoc(sh ? "" : k)} className="min-w-0 flex-1 text-left text-sm"><b>{DOC_T[d.t] || d.t}</b> <span className="text-xs text-slate-500">· {fdt(d.ts)} · {d.by}</span></button>
                  <Button size="sm" variant="ghost" icon={<Copy />} onClick={() => { navigator.clipboard?.writeText(d.txt); toast("Copiado"); }}>Copiar</Button>
                  <button aria-label="Quitar comunicado" onClick={() => delDoc(c, d)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><X className="size-4" /></button>
                </div>
                {sh && <pre className="scrollbar-thin max-h-80 overflow-auto whitespace-pre-wrap border-t border-slate-100 bg-slate-50 p-3 font-mono text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-900/60">{d.txt}</pre>}
              </div>); })}
          </div>}
        </Card>); })}
    </div>
  );
}
