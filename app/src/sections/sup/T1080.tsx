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
import { Cit1080, Historial1080, keyOf } from "./T1080Hist";

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
  const [ag, setAg] = useState(""), [esc, setEsc] = useState(psbOnly ? "conf" : "wc"), [otro, setOtro] = useState(""), [art, setArt] = useState<"el" | "la">("el");
  const a = ag ? findAgent(ag) : null, s = ESCENARIOS.find(x => x.k === esc)!;
  const canCite = (x: { n: string; r: string }) => x.n !== me.n && (lvl(x.r) < me.l || !!excOf()[me.n]?.t1080);
  const lugar = esc === "otro" ? otro.trim() || "[lugar]" : s.t;
  const txt = `/rlspd Para ${art} ${a ? rkTxt(a.r) : "[Rango]"} ${a?.n || "[Nombre del agente]"}: acuda ${lugar} con la vestimenta Clase A al finalizar sus actividades. Por favor, confirme lectura.`;
  const errs = [!a && "agente a citar", esc === "otro" && !otro.trim() && "lugar"].filter(Boolean) as string[];
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader icon={<Radio />} title="Datos de la citación" />
        <CardBody>
          <Field label="Agente"><AgentPicker value={ag} onChange={n => { setAg(n); setArt(genderOf(n) === "f" ? "la" : "el"); }} filter={canCite} empty="No hay agentes que puedas citar con tu rango" /></Field>
          <Note>Solo podés citar a agentes de rango inferior al tuyo.</Note>
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
        </CardBody>
      </Card>
      <div className="space-y-3">
        <CopyLine tag="/rlspd" label="Mensaje de radio" text={txt} errors={errs} />
        <Card className="flex flex-wrap items-center gap-3 p-3">
          <p className="min-w-0 flex-1 text-[12.5px] text-slate-500">Guardala en el historial para cargar la justificación después.</p>
          <Button icon={<Save />} disabled={!!errs.length} onClick={() => {
            const no = Math.max(0, ...L.map(x => x.no || 0)) + 1;
            setL([{ id: uid(), no, t: Date.now(), ag: a!.n, r: a!.r, p: a!.p || "", esc: esc === "otro" ? otro.trim() : s.l, lugar, por: me.n, pr: me.r }, ...L]);
            toast(`10-80 Nº ${no} guardado en el historial`); setAg(""); onSaved();
          }}>Guardar en el historial</Button>
        </Card>
      </div>
    </div>
  );
}
