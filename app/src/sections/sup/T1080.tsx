/* 10-80: arma el mensaje de radio para citar a un agente y lo guarda en el historial.
   Después, desde el historial, se carga la justificación y se genera el mensaje formal (Discord o web). */
import { useState } from "react";
import { Radio, Lock, Save, History } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Field, Input } from "@/components/ui";
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

export const ESCENARIOS = [
  { k: "wc", l: "Watch Commander", t: "a la oficina del Watch Commander", h: "Oficina del mando del turno: llamados de atención y temas del servicio." },
  { k: "sgt", l: "Despacho de sargentos", t: "al despacho de sargentos", h: "Reunión con la supervisión: seguimiento, feedback o entrevista personal." },
  { k: "cap", l: "Despacho de la capitana", t: "al despacho de la capitana", h: "Asuntos que requieren a Capitanía." },
  { k: "conf", l: "Conference Room", t: "a la Conference Room", psb: true, h: "Sala de la PSB: entrevistas e investigaciones internas. Solo la usan los miembros de la PSB." },
  { k: "otro", l: "Otro…", t: "", h: "Escribí el lugar al que se lo cita." },
];

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
  const [ags, setAgs] = useState<string[]>([]), [art, setArt] = useState<Record<string, string>>({}), [cit, setCit] = useState<string[]>([me.n]), [tags, setTags] = useState<string[]>([]);
  const [esc, setEsc] = useState(psbOnly ? "conf" : "wc"), [otro, setOtro] = useState("");
  const s = ESCENARIOS.find(x => x.k === esc)!, A = ags.map(n => findAgent(n)).filter(Boolean) as NonNullable<ReturnType<typeof findAgent>>[], many = A.length > 1;
  const canCite = (x: { n: string; r: string }) => x.n !== me.n && !ags.includes(x.n) && (psbOnly || lvl(x.r) < me.l || !!excOf()[me.n]?.t1080); /* la PSB cita a cualquier rango */
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
          <Note>{psbOnly ? "Podés citar a varios a la vez y a cualquier rango (la PSB no tiene límite de rango); tocá «el/la» para cambiar el artículo." : "Podés citar a varios a la vez. Solo a agentes de rango inferior al tuyo; tocá «el/la» para cambiar el artículo."}</Note>
          <Field label="Citan" hint={psbOnly ? "(miembros de la PSB que hacen el 10-80)" : "(supervisión que hace el 10-80)"}>
            <AgChips list={cit} lock={me.n} onRemove={n => setCit(cit.filter(x => x !== n))} />
            <AgentPicker value={cit} multiple onChange={n => !cit.includes(n) && setCit([...cit, n])} filter={a => (psbOnly ? isPSB(a.n) : lvl(a.r) >= 6) && !cit.includes(a.n)} empty={psbOnly ? "No hay más miembros de la PSB" : "No hay más supervisores"} />
          </Field>
          <Field label="Lugar">
            <div className="flex flex-wrap gap-1.5">
              {ESCENARIOS.filter(x => !psbOnly || x.k === "conf" || x.k === "otro").map(x => {
                const lk = x.psb && !psb;
                return <Chip key={x.k} active={esc === x.k} onClick={() => !lk && setEsc(x.k)} className={lk ? "cursor-not-allowed opacity-50" : ""}>{lk && <Lock />}{x.l}{x.psb && <span className="rounded bg-red-600 px-1 text-[9px] font-bold text-white">PSB</span>}</Chip>;
              })}
            </div>
            <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">{s.h}</p>
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
              por: me.n, pr: me.r, cit, tags }, ...L]);
            toast(`10-80 Nº ${no} guardado en el historial`); setAgs([]); setTags([]); onSaved();
          }}>Guardar en el historial</Button>
        </Card>
      </div>
    </div>
  );
}
