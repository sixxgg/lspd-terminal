/* Procedimiento OIS con fallecido: guía de /me y /do para revisar a los agentes que dispararon.
   Se eligen los agentes (el texto se adapta a hombre o mujer), las armas que lleva cada uno y el nivel:
   «Sencillo» (lo esencial) o «Extenso» (revisión a fondo, paso por paso). Cada línea se copia con un toque. */
import { useState } from "react";
import { Check, ClipboardCopy, Copy, Crosshair, ListChecks, RotateCcw, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Field, Segmented } from "@/components/ui";
import { AgentPicker } from "@/components/agents";
import { Col, Note, Split } from "@/components/layout";
import { useCopy } from "@/components/output";
import { AgChips } from "./T1080Hist";
import { genderOf, lvl } from "@/lib/domain";
import { cn } from "@/lib/cn";

type G = { n: string; al: string; del: string; el: string; o: string };
type L = [kind: "me" | "do", text: string, ext?: 1];
const g = (n: string, f: boolean): G => ({ n, al: f ? "a la" : "al", del: f ? "de la" : "del", el: f ? "la" : "el", o: f ? "a" : "o" });

const WPN: Record<string, { l: string; f: (a: G) => L[] }> = {
  pis: { l: "Pistola", f: a => [
    ["me", `le solicita ${a.al} agente ${a.n} que desenfunde su pistola reglamentaria despacio, con dos dedos y el cañón hacia el suelo.`],
    ["me", "recibe la pistola, la apunta a una zona segura y pulsa el retén para retirar el cargador."],
    ["me", "tira de la corredera hacia atrás, expulsa el cartucho de la recámara y deja la corredera bloqueada.", 1],
    ["me", "mira por la ventana de expulsión y dentro del cañón para comprobar que el arma quedó descargada.", 1],
    ["do", "¿Cuántos cartuchos quedarían en el cargador y habría uno en la recámara?"],
    ["me", "acerca la boca del cañón y comprueba si hay olor a pólvora y residuos de disparo recientes.", 1],
    ["do", "¿El cañón tendría olor a pólvora y restos de disparo recientes?", 1],
    ["me", "revisa los cargadores de repuesto del cinturón y cuenta la munición de cada uno.", 1],
    ["me", "anota el número de serie y guarda la pistola, el cargador y los cartuchos en bolsas de evidencias separadas."]] },
  car: { l: "Carabina", f: a => [
    ["me", `le pide ${a.al} agente ${a.n} que le entregue la carabina con el seguro puesto y el cañón hacia arriba.`],
    ["me", "comprueba el selector de tiro, lo deja en seguro y retira el cargador."],
    ["me", "tira de la palanca de carga, expulsa el cartucho de la recámara y deja el cerrojo abierto.", 1],
    ["me", "revisa la recámara y el cañón para comprobar que quedó descargada.", 1],
    ["do", "¿Cuántos cartuchos quedarían en el cargador y habría uno en la recámara?"],
    ["do", "¿La carabina tendría olor a pólvora o restos de disparo recientes?", 1],
    ["me", "revisa la óptica, la linterna táctica y la correa por si hay daños o restos.", 1],
    ["me", "anota el número de serie y guarda la carabina y el cargador como evidencia."]] },
  smg: { l: "Subfusil (SMG)", f: a => [
    ["me", `le pide ${a.al} agente ${a.n} el subfusil, comprueba el selector de tiro y lo deja en seguro.`],
    ["me", "retira el cargador, tira del cerrojo hacia atrás y expulsa el cartucho de la recámara."],
    ["me", "revisa la recámara y el cañón para comprobar que quedó descargado.", 1],
    ["do", "¿Cuántos cartuchos quedarían en el cargador y habría uno en la recámara?"],
    ["do", "¿El subfusil tendría olor a pólvora o restos de disparo recientes?", 1],
    ["me", "cuenta la munición de los cargadores de repuesto.", 1],
    ["me", "anota el número de serie y guarda el subfusil y los cargadores como evidencia."]] },
  esc: { l: "Escopeta", f: a => [
    ["me", `le pide la escopeta ${a.al} agente ${a.n}, comprueba que tenga el seguro puesto y la apunta a una zona segura.`],
    ["me", "acciona el corredero varias veces hasta vaciar el tubo de cartuchos y la recámara."],
    ["me", "recoge cada cartucho expulsado y los cuenta uno por uno.", 1],
    ["do", "¿Cuántos cartuchos tendría la escopeta y cuántos faltarían de la dotación?"],
    ["me", "revisa el cañón y la recámara para comprobar que quedó descargada y si huele a pólvora.", 1],
    ["me", "anota el número de serie y guarda la escopeta y los cartuchos como evidencia."]] },
  gom: { l: "Escopeta con cartuchos de goma", f: a => [
    ["me", `toma la escopeta de munición menos letal ${a.del} agente ${a.n} y comprueba el seguro.`],
    ["me", "vacía el tubo de cartuchos y la recámara, separando los cartuchos de goma."],
    ["me", "revisa que todos sean cartuchos de impacto (goma) y que ninguno sea de munición letal.", 1],
    ["do", "¿Cuántos cartuchos de goma quedarían y cuántos se habrían disparado?"],
    ["do", "¿Habría algún cartucho que no fuera de goma mezclado en el tubo?", 1],
    ["me", "guarda la escopeta y los cartuchos como evidencia."]] },
  tas: { l: "Táser", f: a => [
    ["me", `retira el táser de la funda ${a.del} agente ${a.n} y le pone el seguro.`],
    ["me", "quita el cartucho y comprueba si fue disparado."],
    ["do", "¿El cartucho del táser estaría disparado, con los dardos y los cables fuera?"],
    ["me", "revisa la pantalla del táser y consulta el registro de descargas: cantidad, hora y duración.", 1],
    ["do", "¿Cuántas descargas figurarían en el registro y a qué hora?", 1],
    ["me", "recoge con guantes los dardos y los cables del suelo y los guarda en un tubo de evidencias.", 1],
    ["me", "guarda el táser y el cartucho como evidencia."]] },
  por: { l: "Porra / defensa extensible", f: a => [
    ["me", `toma la defensa extensible ${a.del} agente ${a.n} y comprueba si está extendida o plegada.`],
    ["me", "la revisa con guantes de punta a punta, incluido el mango y el extremo.", 1],
    ["do", "¿La defensa tendría restos de sangre, abolladuras o señales de haber sido usada?"],
    ["me", "la guarda como evidencia."]] },
  lin: { l: "Linterna", f: a => [
    ["me", `revisa la linterna ${a.del} agente ${a.n}, comprueba que funcione y que no tenga golpes.`],
    ["do", "¿La linterna tendría restos de sangre o golpes que indiquen que se usó para golpear?"],
    ["me", "la guarda junto al resto del equipo revisado.", 1]] },
  oc: { l: "Spray de pimienta", f: a => [
    ["me", `revisa el spray de pimienta ${a.del} agente ${a.n} y comprueba el precinto y el nivel.`],
    ["do", "¿El spray estaría usado o con el precinto roto?"]] },
};
const DEF_W = ["pis", "tas", "por", "lin"];

type Step = { k: string; l: string; once?: boolean; f: (a: G) => L[] };
const STEPS: Step[] = [
  { k: "esc", l: "Escena", once: true, f: () => [
    ["me", "observa el lugar de los hechos y verifica que la escena esté asegurada y acordonada."],
    ["do", "¿La escena estaría acordonada y el perímetro controlado por unidades?"],
    ["me", "comprueba que el cuerpo del fallecido no haya sido movido y que nadie haya contaminado la escena.", 1],
    ["do", "¿El cuerpo estaría en su posición original o habría sido movido?"],
    ["me", "señala los casquillos del suelo y coloca un marcador de evidencia numerado junto a cada uno.", 1],
    ["do", "¿Cuántos casquillos habría en el suelo y dónde?", 1],
    ["me", "fotografía la escena desde varios ángulos: el cuerpo, los casquillos, los impactos y la posición de los vehículos.", 1],
    ["me", "confirma por radio que se avisó al forense, a EMS y a la PSB."]] },
  { k: "sep", l: "Apartar al agente", f: a => [
    ["me", `se acerca ${a.al} agente ${a.n} y le indica que se aparte de la escena y que no hable del hecho con nadie.`],
    ["me", `le pregunta cómo se encuentra y si está herid${a.o}.`, 1]] },
  { k: "fis", l: "Estado físico", f: a => [
    ["me", `observa ${a.al} agente ${a.n} de pies a cabeza en busca de heridas, golpes o sangre.`],
    ["do", `¿${a.el.charAt(0).toUpperCase() + a.el.slice(1)} agente tendría alguna herida, golpe o sangre propia?`],
    ["me", "le revisa las manos y los antebrazos buscando cortes, raspones o restos de pólvora.", 1],
    ["do", "¿Se apreciarían restos de pólvora en las manos?", 1]] },
  { k: "rop", l: "Ropa y equipo", f: a => [
    ["me", `revisa el uniforme ${a.del} agente ${a.n}: camisa, pantalón y chaleco antibalas, buscando manchas de sangre, roturas o impactos.`],
    ["do", "¿El uniforme tendría manchas de sangre, roturas o impactos de bala?"],
    ["me", "palpa el chaleco antibalas y revisa las placas delantera y trasera en busca de impactos.", 1],
    ["me", "revisa el cinturón de servicio: fundas, portacargadores, esposas y radio, comprobando que no falte nada.", 1],
    ["do", "¿Faltaría algún elemento del cinturón de servicio?", 1],
    ["me", "revisa el calzado y los bajos del pantalón buscando restos de sangre o de la escena.", 1]] },
  { k: "arm", l: "Armas", f: () => [] },
  { k: "cus", l: "Evidencias y custodia", once: true, f: () => [
    ["me", "cierra cada bolsa de evidencias y la etiqueta con la fecha, la hora, el número de caso y su firma."],
    ["me", "completa el registro de cadena de custodia con cada arma y su número de serie.", 1],
    ["do", "¿En el registro figuraría cada arma, quién la entregó, quién la recibió y a qué hora?", 1],
    ["me", "entrega las bolsas para su traslado a balística."]] },
  { k: "cam", l: "Cámara corporal", f: a => [
    ["me", `le pide ${a.al} agente ${a.n} su cámara corporal, la apaga y la guarda para extraer la grabación.`],
    ["do", "¿La cámara habría estado grabando durante el incidente?", 1]] },
  { k: "not", l: "Notificación", f: a => [
    ["me", `le informa ${a.al} agente ${a.n} que queda apartad${a.o} del patrullaje hasta que resuelva la PSB, sin arma reglamentaria, y que solo podrá hacer trabajo administrativo.`],
    ["me", "le indica que debe redactar su informe del incidente y que el feedback se enviará directamente a la PSB.", 1]] },
];

type Ag = { n: string; f: boolean; w: string[] };
export function OisProc() {
  const copy = useCopy();
  const [ags, setAgs] = useState<Ag[]>([]), [modo, setModo] = useState<"s" | "e">("s"), [on, setOn] = useState<string[]>(STEPS.map(s => s.k)), [done, setDone] = useState<Set<string>>(new Set());
  const ext = modo === "e", keep = (l: L) => ext || !l[2], cmd = (l: L) => `/${l[0]} ${l[1]}`;
  const blocks = STEPS.filter(s => on.includes(s.k)).flatMap(s => {
    if (s.once) return [{ id: s.k, t: s.l, sub: "", L: s.f(g("", false)).filter(keep) }];
    return ags.map(a => { const G = g(a.n, a.f); return { id: s.k + a.n, t: s.l, sub: a.n, L: (s.k === "arm" ? a.w.flatMap(w => WPN[w].f(G)) : s.f(G)).filter(keep) }; });
  }).filter(b => b.L.length);
  const all = blocks.flatMap(b => b.L.map(cmd)), total = all.length;
  const hit = (id: string, t: string) => { void copy(t); setDone(d => new Set(d).add(id)); };
  return (
    <Split>
      <Col>
        <Card>
          <CardHeader icon={<Users />} title="Agentes involucrados" desc="A quiénes se les hace el procedimiento. El texto se adapta a hombre o mujer." />
          <CardBody>
            {ags.length > 0 && <AgChips list={ags.map(a => a.n)} art={Object.fromEntries(ags.map(a => [a.n, a.f ? "la" : "el"]))} onArt={n => setAgs(ags.map(a => (a.n === n ? { ...a, f: !a.f } : a)))} onRemove={n => setAgs(ags.filter(a => a.n !== n))} />}
            <AgentPicker value={ags.map(a => a.n)} multiple onChange={n => !ags.some(a => a.n === n) && setAgs([...ags, { n, f: genderOf(n) === "f", w: DEF_W }])} filter={a => lvl(a.r) > 0 && !ags.some(x => x.n === a.n)} />
            {ags.map(a => (
              <div key={a.n} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold"><Crosshair className="size-3.5 text-slate-400" />Armas y equipo de {a.n}</p>
                <div className="flex flex-wrap gap-1.5">{Object.entries(WPN).map(([k, w]) => { const sel = a.w.includes(k); return (
                  <button key={k} type="button" onClick={() => setAgs(ags.map(x => (x.n === a.n ? { ...x, w: sel ? x.w.filter(y => y !== k) : [...x.w, k] } : x)))}
                    className={cn("rounded-full border px-2.5 py-1 text-[12px] font-semibold transition", sel ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}>{sel && "✓ "}{w.l}</button>); })}</div>
              </div>))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ListChecks />} title="Qué incluir" />
          <CardBody>
            <Field label="Nivel"><Segmented value={modo} onChange={setModo} options={[{ value: "s", label: "Sencillo · lo esencial" }, { value: "e", label: "Extenso · revisión a fondo" }]} /></Field>
            <Field label="Pasos"><div className="flex flex-wrap gap-1.5">{STEPS.map((s, i) => { const sel = on.includes(s.k); return (
              <button key={s.k} type="button" onClick={() => setOn(sel ? on.filter(x => x !== s.k) : STEPS.filter(x => x.k === s.k || on.includes(x.k)).map(x => x.k))}
                className={cn("rounded-full border px-2.5 py-1 text-[12px] font-semibold transition", sel ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-400 line-through dark:border-slate-700")}>{i + 1}. {s.l}</button>); })}</div></Field>
            <Note>Es una guía: los /do con «¿…?» son preguntas para que el otro rol responda. Adaptá lo que haga falta según la escena.</Note>
          </CardBody>
        </Card>
      </Col>
      <Col className="lg:sticky lg:top-32 lg:self-start">
        <Card data-nodraft className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Procedimiento OIS con fallecido</p><p className="text-[11.5px] text-slate-500">{ags.length ? `${total} líneas · ${done.size} copiadas · tocá una para copiarla` : "Elegí al menos un agente"}</p></div>
            {done.size > 0 && <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setDone(new Set())}>Reiniciar</Button>}
            <Button size="sm" variant="outline" icon={<ClipboardCopy />} disabled={!total} onClick={() => void copy(all.join("\n"))}>Copiar todo</Button>
          </div>
          <div className="scrollbar-thin max-h-[72vh] space-y-4 overflow-y-auto p-4">
            {!ags.length && <p className="py-8 text-center text-[13px] text-slate-400">Sumá a los agentes que dispararon para armar la guía.</p>}
            {ags.length > 0 && blocks.map(b => (
              <section key={b.id}>
                <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{b.t}{b.sub && <span className="rounded bg-slate-100 px-1.5 py-px normal-case tracking-normal text-slate-600 dark:bg-slate-800 dark:text-slate-300">{b.sub}</span>}</p>
                <ul className="space-y-1">{b.L.map((l, i) => { const id = `${b.id}:${i}`, ok = done.has(id), t = cmd(l); return (
                  <li key={id}><button type="button" onClick={() => hit(id, t)} title="Copiar"
                    className={cn("group flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left font-mono text-[12.5px] leading-relaxed transition hover:bg-slate-100 dark:hover:bg-slate-800/70", ok && "opacity-45")}>
                    <span className={cn("mt-0.5 shrink-0 rounded px-1.5 text-[10.5px] font-bold", l[0] === "me" ? "bg-sky-500/15 text-sky-600 dark:text-sky-300" : "bg-amber-500/15 text-amber-600 dark:text-amber-300")}>/{l[0]}</span>
                    <span className={cn("flex-1 text-slate-700 dark:text-slate-200", ok && "line-through")}>{l[1]}</span>
                    {ok ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <Copy className="mt-0.5 size-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />}
                  </button></li>); })}</ul>
              </section>))}
          </div>
        </Card>
      </Col>
    </Split>);
}
