import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Megaphone, UserRound } from "lucide-react";
import { Card, CardBody, CardHeader, Field, Input, Segmented, Select } from "@/components/ui";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { CopyLine, DiscordOutput } from "@/components/output";
import { Col, Note, Split } from "@/components/layout";
import { DET, DET_MIN, LADDER, dcIdOfAgent, findAgent, genderOf, lvl, rankES, rkTxt, type Agent } from "@/lib/domain";
import { dcfg, fillTpl, tplOf, type TplKey } from "@/lib/templates";
import { useMe } from "@/lib/me";
import { useStoreVersion } from "@/lib/store";

type Mode = "asc" | "desc";
/* el ascenso es al escalón siguiente de la misma carrera; PO III y III+ pueden pasar a Detective I.
   El descenso, a cualquier rango inferior de la misma carrera. Solo por debajo del rango propio; detectives requieren Teniente o más. */
function rankOptions(a: Agent, mode: Mode, my: number) {
  const cur = a.r; let o: string[] = [];
  if (mode === "asc") {
    if (LADDER.includes(cur)) { const n = LADDER[LADDER.indexOf(cur) + 1]; if (n) o.push(n); if (["Police Officer III", "Police Officer III+"].includes(cur)) o.push("Detective I"); }
    else if (DET.includes(cur)) { const n = DET[DET.indexOf(cur) + 1]; if (n) o.push(n); }
  } else {
    if (LADDER.includes(cur)) o = LADDER.slice(0, LADDER.indexOf(cur)).reverse();
    else if (DET.includes(cur)) o = [...DET.slice(0, DET.indexOf(cur)).reverse(), "Police Officer III"];
  }
  return o.filter(r => lvl(r) < my && (!DET.includes(r) || my >= DET_MIN));
}

export function Ascensos() {
  useStoreVersion();
  const me = useMe();
  const [mode, setMode] = useState<Mode>("asc");
  const [ag, setAg] = useState(""), [nuevo, setNuevo] = useState(""), [art, setArt] = useState<"el" | "la">("el");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [dcId, setDcId] = useState(""), [variant, setVariant] = useState("1");
  const c = dcfg();
  const [desde, setDesde] = useState(c.desde), [firma, setFirma] = useState(c.firma);
  const a = ag ? findAgent(ag) : null;
  const eligible = (x: Agent) => { const l = lvl(x.r); if (l <= 0 || l >= me.l) return false; if (DET.includes(x.r) && me.l < DET_MIN) return false; return rankOptions(x, mode, me.l).length > 0; };
  const opts = a ? rankOptions(a, mode, me.l) : [];
  const nr = a && opts.includes(nuevo) ? nuevo : opts[0] || "";
  const pick = (n: string) => { const x = findAgent(n); setAg(n); setArt(genderOf(n) === "f" ? "la" : "el"); setDcId(dcIdOfAgent(x)); setNuevo(""); };
  const top = LADDER.filter(r => lvl(r) < me.l).pop();

  const R = a ? rkTxt(a.r) : "[Rango]", N = a?.n || "[Nombre del agente]", P = a?.p || "[N° de placa]", NR = a && nr ? rkTxt(nr) : "[Rango nuevo]", de = art === "la" ? "de la" : "del";
  const meTxt = mode === "asc" ? "/me Abre el cajón, toma un contrato que estaba guardado y lo saca, dejándolo sobre el escritorio junto a un bolígrafo."
    : "/me Abre el cajón, toma una resolución que estaba guardada y la saca, dejándola sobre el escritorio junto a un bolígrafo.";
  const doTxt = `/do Se trataría de ${mode === "asc" ? "un contrato de ascenso" : "una resolución de descenso"} ${de} ${R} ${N}, con número de placa ${P}, al rango de ${NR}. El documento estaría firmado por el jefe de Policía James Hopper, quedando el espacio derecho reservado para una firma pendiente.`;
  const fem = !!a && genderOf(a.n) === "f";
  const key = (mode === "asc" ? (variant !== "1" ? "asc" + variant : "asc") : "desc") as TplKey;
  const dc = useMemo(() => fillTpl(tplOf(key), {
    emoji: c.emoji, fecha: fecha.split("-").reverse().join("/"), mencion: dcId ? `<@${dcId}>` : `**${a?.n || "[agente]"}**`, nombre: a?.n || "[agente]", rango: a && nr ? rkTxt(nr) : "[rango]",
    rango_anterior: a ? rkTxt(a.r) : "[rango]", motivo: mode === "asc" ? "en reconocimiento a su compromiso, desempeño y dedicación al servicio del Departamento" : "",
    desde, firma, el_agente: fem ? "la agente" : "el agente", ascendido: fem ? "ascendida" : "ascendido", descendido: fem ? "descendida" : "descendido",
  }), [key, c.emoji, fecha, dcId, a, nr, mode, desde, firma, fem]);
  const errs = [!a && "agente", a && !nr && "nuevo rango"].filter(Boolean) as string[];
  const dcErrs = [...errs, !fecha && "fecha", dcId && !/^\d{15,21}$/.test(dcId) && "ID de Discord válido"].filter(Boolean) as string[];

  return (
    <Split>
      <Col>
        <Card>
          <CardHeader icon={<UserRound />} title="Movimiento" desc={!top ? "Tu rango no permite gestionar movimientos." : mode === "asc" ? `Podés ascender un escalón a agentes por debajo de tu rango, como máximo a ${rankES(top)}.` : "Podés descender a agentes por debajo de tu rango."} />
          <CardBody>
            <Segmented value={mode} onChange={v => { setMode(v); setNuevo(""); if (a && !eligible(a)) setAg(""); }} options={[{ value: "asc", label: "Ascenso", icon: <TrendingUp /> }, { value: "desc", label: "Descenso", icon: <TrendingDown /> }]} />
            {a ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <Avatar n={a.n} size={40} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.n}</p><div className="mt-0.5 flex gap-1.5"><RankBadge r={a.r} />{a.p && <span className="font-mono text-xs text-slate-400">#{a.p}</span>}</div></div>
                <button onClick={() => setAg("")} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Cambiar</button>
              </div>
            ) : <AgentPicker value={ag} onChange={pick} filter={eligible} empty="No hay agentes que puedas gestionar con tu rango" />}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={mode === "asc" ? "Nuevo rango" : "Rango tras el descenso"}>
                <Select value={nr} disabled={!a} onChange={e => setNuevo(e.target.value)}>{a ? opts.map(r => <option key={r} value={r}>{rankES(r)}</option>) : <option>Elegí un agente</option>}</Select>
              </Field>
              <Field label="Tratamiento"><Segmented value={art} onChange={setArt} options={[{ value: "el", label: "del" }, { value: "la", label: "de la" }]} /></Field>
            </div>
            <Note>{me.l >= DET_MIN ? "Incluye la carrera de detectives." : "Los detectives los gestiona Capitanía (Teniente I o superior)."}</Note>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Megaphone />} title="Anuncio de Discord" desc="Plantilla editable por Capitanía y administradores en la versión clásica." />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
              <Field label="ID de Discord" hint="(para la mención)"><Input inputMode="numeric" value={dcId} onChange={e => setDcId(e.target.value.replace(/\D/g, ""))} placeholder="Se completa del roster" /></Field>
              <Field label="Desde"><Input value={desde} onChange={e => setDesde(e.target.value)} /></Field>
              <Field label="Firma"><Input value={firma} onChange={e => setFirma(e.target.value)} /></Field>
            </div>
            {mode === "asc" && <Field label="Variante del texto"><Segmented size="sm" value={variant} onChange={setVariant} options={[{ value: "1", label: "Variante 1" }, { value: "2", label: "Variante 2" }, { value: "3", label: "Variante 3" }]} /></Field>}
          </CardBody>
        </Card>
      </Col>
      <Col>
        <CopyLine tag="/me" label="Rol: tomar el documento" text={meTxt} errors={errs} />
        <CopyLine tag="/do" label={mode === "asc" ? "Contrato de ascenso" : "Resolución de descenso"} text={doTxt} errors={errs} />
        <DiscordOutput sticky={false} title={mode === "asc" ? "Anuncio de ascenso" : "Anuncio de descenso"} text={dc} errors={dcErrs} ctx={{ users: a && dcId ? { [dcId]: a.n } : {} }} web={false} />
      </Col>
    </Split>
  );
}
