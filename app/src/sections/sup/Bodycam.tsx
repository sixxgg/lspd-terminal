import { useState } from "react";
import { Video, X, AtSign } from "lucide-react";
import { Card, CardBody, CardHeader, Chip, Field, Input, Segmented } from "@/components/ui";
import { AgentPicker } from "@/components/agents";
import { DiscordOutput } from "@/components/output";
import { Col, Split } from "@/components/layout";
import { findAgent, genderOf, lvl, rkTxt } from "@/lib/domain";
import { useStoreVersion } from "@/lib/store";

const DEF_IDS: Record<string, string> = { "Madison Wells": "352216772847337473", "Vega Chambers": "810990071398137856" };
const targets = () => ["Madison Wells", "Vega Chambers"].map(n => { const a = findAgent(n); return { n, id: String(a?.i || DEF_IDS[n] || "").replace(/\D/g, "") }; }).filter(x => x.id);
const horaSal = (h: number) => (h >= 6 && h < 12 ? "Buenos días" : h >= 12 && h < 20 ? "Buenas tardes" : "Buenas noches");
const horaFr = (h: number) => (h >= 6 && h < 12 ? "mañana" : h >= 12 && h < 20 ? "tarde" : h >= 20 ? "noche" : "madrugada");

export function Bodycam() {
  useStoreVersion();
  const h = new Date().getHours(), T = targets();
  const [sal, setSal] = useState(horaSal(h)), [fr, setFr] = useState(horaFr(h));
  const [ags, setAgs] = useState<{ n: string; art: "el" | "la" }[]>([]);
  const [men, setMen] = useState<string[]>(() => T.map(x => x.id)), [det, setDet] = useState("");
  const list = ags.map(x => { const a = findAgent(x.n); return `${x.art === "la" ? "de la" : "del"} ${a ? rkTxt(a.r) : "[Rango]"} ${x.n}`; });
  const quien = list.length ? list.join(", ").replace(/, ([^,]*)$/, " y $1") : "del [Rango] [Nombre del oficial]";
  const d = det.trim().replace(/[.\s]+$/, "");
  const text = `${sal}${men.length ? " " + men.map(id => `<@${id}>`).join(" ") : ""}

Quería solicitar si podíamos pedir ${ags.length > 1 ? "las bodycams" : "la bodycam"} ${quien} para poder corroborar ciertas acciones que pasaron en un patrullaje durante esta ${fr}${d ? ` (${d})` : ""}.

Estamos a la espera de su respuesta.`;
  const errs = [!ags.length && "al menos un oficial", !men.length && "a quién mencionar"].filter(Boolean) as string[];
  return (
    <Split>
      <Col>
        <Card>
          <CardHeader icon={<Video />} title="Oficiales" desc="Clic en un agente para agregarlo · tocá «del / de la» para cambiar el trato." />
          <CardBody>
            <div className="flex min-h-9 flex-wrap gap-1.5">
              {ags.length ? ags.map((x, i) => (
                <span key={x.n} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-1 pr-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-700 dark:text-slate-300">{x.art === "la" ? "de la" : "del"}</span>
                  {x.n}<button aria-label="Quitar" onClick={() => setAgs(ags.filter((_, j) => j !== i))} className="rounded-full p-0.5 text-slate-400 hover:text-red-500"><X className="size-3.5" /></button>
                </span>
              )) : <span className="text-sm text-slate-400">Todavía no elegiste oficiales.</span>}
            </div>
            <AgentPicker value={ags.map(x => x.n)} multiple onChange={n => !ags.some(x => x.n === n) && setAgs([...ags, { n, art: genderOf(n) === "f" ? "la" : "el" }])} filter={a => lvl(a.r) > 0 && !ags.some(x => x.n === a.n)} max={200} />
            <Field label="Detalle" hint="(opcional · va entre paréntesis)"><Input value={det} onChange={e => setDet(e.target.value)} placeholder="Ej: persecución en Vinewood alrededor de las 22:00" /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<AtSign />} title="Mensaje" />
          <CardBody>
            <Field label="Saludo"><Segmented size="sm" value={sal} onChange={setSal} options={["Buenos días", "Buenas tardes", "Buenas noches"].map(v => ({ value: v, label: v }))} /></Field>
            <Field label="Momento del patrullaje"><Segmented size="sm" value={fr} onChange={setFr} options={["mañana", "tarde", "noche", "madrugada"].map(v => ({ value: v, label: v }))} /></Field>
            <Field label="Mencionar a">
              <div className="flex flex-wrap gap-1.5">{T.length ? T.map(x => <Chip key={x.id} active={men.includes(x.id)} onClick={() => setMen(men.includes(x.id) ? men.filter(y => y !== x.id) : [...men, x.id])}>@{x.n}</Chip>) : <span className="text-sm text-slate-400">No hay IDs de Discord cargados.</span>}</div>
            </Field>
          </CardBody>
        </Card>
      </Col>
      <DiscordOutput title="Solicitud de bodycam" text={text} errors={errs} ctx={{ users: Object.fromEntries(T.map(x => [x.id, x.n])) }} />
    </Split>
  );
}
