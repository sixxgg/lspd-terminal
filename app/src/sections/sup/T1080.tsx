/* 10-80: arma el mensaje de radio para citar a un agente y lo guarda en el historial.
   Después, desde el historial, se carga la justificación y se genera el mensaje formal (Discord o web). */
import { useState } from "react";
import { Radio, Lock, Save, History, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Field, Input, Select } from "@/components/ui";
import { AgentPicker } from "@/components/agents";
import { CopyLine } from "@/components/output";
import { Note } from "@/components/layout";
import { useFeedback } from "@/components/feedback";
import { excOf, findAgent, genderOf, lvl, rkTxt, uid } from "@/lib/domain";
import { isPSB } from "@/lib/units";
import { useMe } from "@/lib/me";
import { useJSON, useStoreVersion } from "@/lib/store";
import { DivNav } from "../div/DivTools";
import { AgChips, Cit1080, Historial1080, joinY, keyOf, TagEditor } from "./T1080Hist";

/* lugares a los que se cita: editables (sumar, guardar y borrar) y agrupados por edificio. t = cómo va en el mensaje («acuda …») */
type Lug = { k: string; l: string; t: string; g: string; h?: string; psb?: boolean };
const LUG_KEY = "lspdt.t1080Lug";
const GRUPOS = ["Mission Row", "Subsuelo Mission Row (Metro)", "Training Center"] as const;
const DEF_LUG: Lug[] = [
  { k: "wc", g: "Mission Row", l: "Watch Commander", t: "a la oficina del Watch Commander", h: "Oficina del mando del turno: llamados de atención y temas del servicio." },
  { k: "sgt", g: "Mission Row", l: "Despacho de sargentos", t: "al despacho de sargentos", h: "Reunión con la supervisión: seguimiento, feedback o entrevista personal." },
  { k: "cap", g: "Mission Row", l: "Despacho de la capitana", t: "al despacho de la capitana", h: "Asuntos que requieren a Capitanía." },
  { k: "jef", g: "Mission Row", l: "Despacho del jefe", t: "al despacho del jefe", h: "Asuntos que requieren a Jefatura." },
  { k: "db", g: "Mission Row", l: "Despacho de la Detective Bureau", t: "al despacho de la Detective Bureau" },
  { k: "com", g: "Mission Row", l: "Community Room", t: "a la Community Room" },
  { k: "ops", g: "Mission Row", l: "Operations Room", t: "a la Operations Room" },
  { k: "bri", g: "Mission Row", l: "Briefing & Instruction", t: "a la sala de Briefing & Instruction" },
  { k: "conf", g: "Mission Row", l: "Conference Room", t: "a la Conference Room", psb: true, h: "Sala de la PSB: entrevistas e investigaciones internas. Solo la usan los miembros de la PSB." },
  { k: "gym", g: "Subsuelo Mission Row (Metro)", l: "Gimnasio", t: "al gimnasio del subsuelo de Mission Row" },
  { k: "vest", g: "Subsuelo Mission Row (Metro)", l: "Vestuarios", t: "a los vestuarios del subsuelo de Mission Row" },
  { k: "arm", g: "Subsuelo Mission Row (Metro)", l: "Armería", t: "a la armería del subsuelo de Mission Row" },
  { k: "plan", g: "Subsuelo Mission Row (Metro)", l: "Planning Room", t: "a la Planning Room del subsuelo de Mission Row" },
  { k: "cqb", g: "Subsuelo Mission Row (Metro)", l: "Área de práctica (CQB)", t: "al área de práctica (CQB) del subsuelo de Mission Row" },
  { k: "tiro", g: "Subsuelo Mission Row (Metro)", l: "Galería de tiro", t: "a la galería de tiro del subsuelo de Mission Row" },
];
const OTRO: Lug = { k: "otro", g: "", l: "Otro…", t: "", h: "Escribí el lugar al que se lo cita." };
/* «Citan»: quién hace el 10-80, simple */
const CITG = ["Supervisores", "Capitanía", "Jefatura"] as const;

const AWC = "Evelyn Molina";
export function T1080({ psbOnly }: { psbOnly?: boolean }) {
  const [tab, setTab] = useState<"new" | "his">("new"), [L] = useJSON<Cit1080[]>(keyOf(psbOnly), []);
  const pend = L.filter(x => !x.j).length;
  return (
    <div className="space-y-4">
      <DivNav value={tab} onChange={v => setTab(v as "new" | "his")} options={[{ value: "new", label: "Nueva citación", icon: <Radio />, txt: "Nueva" },
        { value: "his", label: `Historial de 10-80${pend ? ` · ${pend} sin justificar` : ""}`, icon: <History />, txt: "Historial" }]} />
      {tab === "new" ? <Nueva psbOnly={psbOnly} onSaved={() => setTab("his")} /> : <Historial1080 psbOnly={psbOnly} />}
    </div>);
}

function Nueva({ psbOnly, onSaved }: { psbOnly?: boolean; onSaved: () => void }) {
  useStoreVersion();
  const { toast } = useFeedback(), [L, setL] = useJSON<Cit1080[]>(keyOf(psbOnly), []);
  const me = useMe(), psb = isPSB(me.n) || me.admin;
  /* un Sargento II no cita a Sargentos I, salvo la Assistant Watch Commander */
  const myL = me.r === "Sergeant II" && me.n !== AWC ? lvl("Sergeant I") : me.l;
  const [ags, setAgs] = useState<string[]>([]), [art, setArt] = useState<Record<string, string>>({}), [cit, setCit] = useState<string[]>([me.n]), [tags, setTags] = useState<string[]>([]);
  const [esc, setEsc] = useState(psbOnly ? "conf" : "wc"), [otro, setOtro] = useState(""), [citG, setCitG] = useState<string>(me.l >= 10 ? "Jefatura" : me.l >= 8 ? "Capitanía" : "Supervisores"), [div, setDiv] = useState(false), [edL, setEdL] = useState(false);
  const [LG, setLG] = useJSON<Lug[]>(LUG_KEY, DEF_LUG), LUG = Array.isArray(LG) && LG.length ? LG : DEF_LUG;
  const s = LUG.find(x => x.k === esc) || (esc === "otro" ? OTRO : LUG[0]), A = ags.map(n => findAgent(n)).filter(Boolean) as NonNullable<ReturnType<typeof findAgent>>[], many = A.length > 1;
  /* la PSB y las tareas de división citan a cualquier rango */
  const canCite = (x: { n: string; r: string }) => x.n !== me.n && !ags.includes(x.n) && (psbOnly || div || lvl(x.r) < myL || !!excOf()[me.n]?.t1080);
  const lugar = esc === "otro" ? otro.trim() || "[lugar]" : s.t;
  const quien = A.length ? joinY(A.map(a => `${art[a.n] || "el"} ${rkTxt(a.r)} ${a.n}`)) : "el [Rango] [Nombre del agente]";
  const txt = `/rlspd Para ${quien}: ${many ? "acudan" : "acuda"} ${lugar} con la vestimenta Clase A al finalizar sus actividades. Por favor, ${many ? "confirmen" : "confirme"} lectura.`;
  const errs = [!A.length && "agente a citar", esc === "otro" && !otro.trim() && "lugar"].filter(Boolean) as string[];
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader icon={<Radio />} title="Datos de la citación" />
        <CardBody>
          <Field label={`Agentes a citar${A.length ? ` · ${A.length}` : ""}`}>
            {!!ags.length && <AgChips list={ags} art={art} onArt={n => setArt(o => ({ ...o, [n]: o[n] === "la" ? "el" : "la" }))} onRemove={n => setAgs(ags.filter(x => x !== n))} />}
            <AgentPicker value={ags} multiple onChange={n => { if (ags.includes(n)) return; setAgs([...ags, n]); setArt(o => ({ ...o, [n]: genderOf(n) === "f" ? "la" : "el" })); }} filter={canCite} empty={psbOnly ? "No hay más agentes para citar" : "No hay agentes que puedas citar con tu rango"} />
          </Field>
          {!psbOnly && <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={div} onChange={e => setDiv(e.target.checked)} className="size-4 accent-brand-600" />
            <span><b>Tarea de división</b> <span className="text-slate-500">· se puede citar a cualquier rango</span></span></label>}
          <Note>{psbOnly || div ? "Podés citar a varios a la vez y a cualquier rango; tocá «el/la» para cambiar el artículo." : "Podés citar a varios a la vez. Solo a agentes de rango inferior al tuyo (los Sargentos I solo los cita la Assistant Watch Commander); tocá «el/la» para cambiar el artículo."}</Note>
          {psbOnly ? <Field label="Citan" hint="(miembros de la PSB que hacen el 10-80)">
            <AgChips list={cit} lock={me.n} onRemove={n => setCit(cit.filter(x => x !== n))} />
            <AgentPicker value={cit} multiple onChange={n => !cit.includes(n) && setCit([...cit, n])} filter={a => isPSB(a.n) && !cit.includes(a.n)} empty="No hay más miembros de la PSB" />
          </Field> : <Field label="Citan"><Select value={citG} onChange={e => setCitG(e.target.value)}>{CITG.map(g => <option key={g} value={g}>{g}</option>)}</Select></Field>}
          <Field label="Lugar" hint={!psbOnly ? undefined : "(PSB)"}>
            {!psbOnly && <button type="button" onClick={() => setEdL(!edL)} className="float-right -mt-6 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:underline dark:text-brand-300"><Pencil className="size-3" />{edL ? "Listo" : "Editar lugares"}</button>}
            {edL ? <LugEditor L={LUG} onChange={setLG} /> : <div className="space-y-2">
              {[...GRUPOS, ""].map(g => { const L = g ? LUG.filter(x => x.g === g && (!psbOnly || x.k === "conf")) : [...LUG.filter(x => !GRUPOS.includes(x.g as typeof GRUPOS[number])), OTRO];
                if (!L.length && (psbOnly || g !== "Training Center")) return null; return (
                <div key={g || "x"}>{g && <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{g}</p>}
                  <div className="flex flex-wrap gap-1.5">{!L.length ? <span className="text-xs italic text-slate-400">Pendiente: sumalos con «Editar lugares».</span> : L.map(x => {
                    const lk = x.psb && !psb;
                    return <Chip key={x.k} active={esc === x.k} onClick={() => !lk && setEsc(x.k)} className={lk ? "cursor-not-allowed opacity-50" : ""}>{lk && <Lock />}{x.l}{x.psb && <span className="rounded bg-red-600 px-1 text-[9px] font-bold text-white">PSB</span>}</Chip>;
                  })}</div></div>); })}
            </div>}
            {!edL && s.h && <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">{s.h}</p>}
          </Field>
          {esc === "otro" && <Input value={otro} onChange={e => setOtro(e.target.value)} placeholder="a la sala de reuniones…" autoFocus />}
          <Field label="Etiquetas" hint="(opcional · para filtrar en el historial)"><TagEditor value={tags} onChange={setTags} /></Field>
        </CardBody>
      </Card>
      <div className="space-y-3">
        <CopyLine tag="/rlspd" label="Mensaje de radio" text={txt} errors={errs} />
        <Card className="flex flex-wrap items-center gap-3 p-3">
          <p className="min-w-0 flex-1 text-[12.5px] text-slate-500">Guardala en el historial para cargar la justificación después.</p>
          <Button icon={<Save />} disabled={!!errs.length} onClick={() => {
            const no = Math.max(0, ...L.map(x => x.no || 0)) + 1, f = A[0];
            setL([{ id: uid(), no, t: Date.now(), ag: f.n, r: f.r, p: f.p || "", ags: A.map(a => ({ n: a.n, r: a.r, p: a.p || "" })), esc: esc === "otro" ? otro.trim() : s.l, lugar,
              por: me.n, pr: me.r, cit: psbOnly ? cit : [me.n], ...(psbOnly ? {} : { citG }), tags }, ...L]);
            toast(`10-80 Nº ${no} guardado en el historial`); setAgs([]); setTags([]); onSaved();
          }}>Guardar en el historial</Button>
        </Card>
      </div>
    </div>
  );
}

/* editor de lugares: nombre, cómo va en el mensaje y edificio; se guarda para toda la supervisión */
function LugEditor({ L, onChange }: { L: Lug[]; onChange: (l: Lug[]) => void }) {
  const { confirm } = useFeedback(), [n, setN] = useState({ l: "", t: "", g: GRUPOS[0] as string });
  const add = () => { const l = n.l.trim(); if (!l) return; const t = n.t.trim() || `a ${/^(sala|oficina|armería|galería|área)/i.test(l) ? "la" : "el"} ${l}`;
    onChange([...L, { k: uid(), l, t, g: n.g }]); setN({ ...n, l: "", t: "" }); };
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
      {GRUPOS.map(g => { const G = L.filter(x => x.g === g); return (
        <div key={g}><p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{g}</p>
          {!G.length && <p className="text-xs italic text-slate-400">Sin lugares todavía.</p>}
          {G.map(x => <div key={x.k} className="flex items-center gap-1.5 py-0.5">
            <Input value={x.l} onChange={e => onChange(L.map(y => (y.k === x.k ? { ...y, l: e.target.value } : y)))} className="h-8 w-40 text-[12.5px]" aria-label="Nombre" />
            <Input value={x.t} onChange={e => onChange(L.map(y => (y.k === x.k ? { ...y, t: e.target.value } : y)))} className="h-8 min-w-0 flex-1 text-[12.5px]" aria-label="En el mensaje" placeholder="a la …" />
            <button type="button" aria-label={`Borrar ${x.l}`} onClick={async () => { if (await confirm(`¿Borrar «${x.l}» de los lugares?`, { danger: true, ok: "Borrar" })) onChange(L.filter(y => y.k !== x.k)); }} className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-3.5" /></button></div>)}
        </div>); })}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
        <Select value={n.g} onChange={e => setN({ ...n, g: e.target.value })} className="h-8 w-auto text-[12.5px]">{GRUPOS.map(g => <option key={g}>{g}</option>)}</Select>
        <Input value={n.l} onChange={e => setN({ ...n, l: e.target.value })} placeholder="Nombre (ej: Sala de entrenamiento)" className="h-8 w-48 text-[12.5px]" onKeyDown={e => e.key === "Enter" && add()} />
        <Input value={n.t} onChange={e => setN({ ...n, t: e.target.value })} placeholder="En el mensaje (opcional)" className="h-8 min-w-0 flex-1 text-[12.5px]" onKeyDown={e => e.key === "Enter" && add()} />
        <Button size="sm" icon={<Plus />} onClick={add} disabled={!n.l.trim()}>Sumar</Button>
      </div>
    </div>);
}
