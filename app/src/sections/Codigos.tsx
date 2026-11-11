/* Códigos radiales del SAPD, lectura de derechos, rotura de negociaciones y alfabeto NATO. Clic en una fila para copiarla. */
import { useState } from "react";
import { BookOpen, Hash, Radio, Scale, Signal, Siren, Type } from "lucide-react";
import { Card, SearchInput } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

type G = { k: string; t: string; I: typeof Radio; c: string; rows: [string, string][] };
const GRUPOS: G[] = [
  { k: "bas", t: "Códigos radiales básicos", I: Radio, c: "#f59e0b", rows: [
    ["Código 1", "Confirmación de llamada / respuesta a través de radio"], ["Código 2", "Llamada de rutina (sin sonoras)"], ["Código 3", "Llamada de emergencia (sirenas y luces)"],
    ["Código 4", "No se precisa más ayuda"], ["Código 6", "En investigación"], ["Código 6-ADAM", "Se requiere asistencia de una unidad"], ["Código 7", "Pausa en el patrullaje"],
    ["Código 8", "Se requiere ambulancia"], ["Código 9", "Búsqueda y captura"], ["Código 11", "Situación actual"], ["Código 12", "Falsa alarma"], ["Código 37", "Vehículo reportado robado"],
    ["Código 77", "Precaución, posible emboscada"], ["Código 99", "Oficial en peligro"], ["Código 100", "En posición para interceptar"]] },
  { k: "com", t: "Códigos comunes", I: Hash, c: "#ef4444", rows: [
    ["187", "Homicidio"], ["207", "Secuestro"], ["211", "Robo a establecimiento"], ["212", "Robo al banco"], ["215", "Robo a casa"], ["240", "Asalto a civil"], ["242", "Agresión"],
    ["246", "Tiroteo en curso"], ["254 VICTOR", "Persecución vehicular"], ["254 PAUL", "Persecución a pie"], ["320", "Venta de droga"], ["415", "Disturbios / peleas"], ["417", "Persona armada"],
    ["484", "Robo a civil"], ["487", "Robo mayor"]] },
  { k: "10x", t: "Códigos 10-X", I: Signal, c: "#38bdf8", rows: [
    ["10-00", "Precaución"], ["10-04", "Afirmativo"], ["10-05", "Negativo"], ["10-06", "Parada de tráfico"], ["10-09", "Repetir comunicado"], ["10-10", "Fuera de servicio"],
    ["10-11", "Habla poco a poco"], ["10-15", "Sujeto bajo custodia"], ["10-16", "Recoge prisionero"], ["10-20", "Ubicación"], ["10-23", "Mantenerse a la espera"], ["10-24", "Problemas en la radio"],
    ["10-37", "Grúa"], ["10-38", "Bomberos"], ["10-80", "Nos reunimos en…"], ["10-86", "Control de tráfico"], ["10-95", "Procesando sujeto"], ["10-97", "Llegada a la escena"], ["10-98", "Aviso finalizado"]] },
  { k: "ter", t: "Otra terminología", I: BookOpen, c: "#a855f7", rows: [
    ["Adam Charles", "Accidente de tráfico"], ["Boy Tom", "Aviso de bomba"], ["Tom Charles", "Colisión de tráfico"], ["Paul Henry", "Persona herida"], ["Clave Robert", "Fuerza letal activada"],
    ["Shots fired", "Disparos efectuados"], ["PIT", "Desestabilización del coche en movimiento"]] },
  { k: "der", t: "Lectura de derechos", I: Scale, c: "#22c55e", rows: [
    "Tiene derecho a ser informado de los hechos que se le atribuyen.", "Tiene derecho a no declarar contra sí mismo y a no mostrarse culpable.",
    "Tiene derecho a un abogado privado en caso de que no haya sido encontrado en flagrante delito.",
    "Tiene derecho a guardar silencio, a no prestar declaración si no desea hacerlo y a no contestar ninguna de las preguntas que se le realicen.",
    "Tiene derecho a asistencia sanitaria si fuese necesario.", "Tiene derecho a una llamada en presencia de la autoridad con el altavoz puesto de máximo 1 min."].map((x, i) => [String(i + 1), x] as [string, string]) },
  { k: "neg", t: "Rotura de negociaciones", I: Siren, c: "#f43f5e", rows: [
    "Si usted circula más de 5 segundos en dirección contraria.", "Si usted destruye bastante mobiliario urbano.", "Si usted pone la vida en peligro de ciudadanos, de mis compañeros o la suya propia.",
    "Si usted abre fuego contra la patrulla.", "Si durante la persecución usted se introduce por callejones por los que no podamos circular.", "Si durante la persecución un tercero se introduce.",
    "Si durante la persecución usted no se baja con las manos levantadas.", "Si durante la persecución usted tiene tentativa de tirarse al agua.",
    "Si usted tiene intención de cambiar de vehículo, sea tierra, mar o aire.", "Si usted apaga las luces cuando es de noche o en un túnel.", "Si usted circula a una velocidad inferior a la permitida."].map((x, i) => [String(i + 1), x] as [string, string]) },
  { k: "nato", t: "Alfabeto NATO", I: Type, c: "#94a3b8", rows: "Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliet Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whisky X-ray Yankee Zulu".split(" ").map(w => [w[0], w] as [string, string]) },
];

export function Codigos() {
  const { toast } = useFeedback(), [q, setQ] = useState(""), [g, setG] = useState("all"), s = norm(q.trim());
  const L = GRUPOS.filter(x => g === "all" || x.k === g).map(x => ({ ...x, rows: x.rows.filter(([a, b]) => !s || norm(a + " " + b).includes(s)) })).filter(x => x.rows.length);
  const copy = (t: string) => { void navigator.clipboard?.writeText(t); toast(`Copiado: ${t}`); };
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <SearchInput className="min-w-[14rem] flex-1 sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar…" />
        <div className="flex flex-wrap gap-1">{[{ k: "all", t: "Todos", c: "#64748b" }, ...GRUPOS].map(x => (
          <button key={x.k} onClick={() => setG(x.k)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", g === x.k ? "text-white" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}
            style={g === x.k ? { background: x.c, borderColor: x.c } : undefined}>{x.k === "all" ? x.t : x.t.replace(/^Códigos (radiales )?/, "")}</button>))}</div>
      </Card>
      {!L.length ? <p className="py-10 text-center text-sm text-slate-400">Nada coincide con «{q}».</p>
        : <div className="columns-1 gap-5 lg:columns-2 2xl:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">{L.map(x => (
          <Card key={x.k} className="overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-slate-800" style={{ boxShadow: `inset 3px 0 0 ${x.c}` }}>
              <span className="grid size-7 place-items-center rounded-lg" style={{ color: x.c, background: x.c + "1f" }}><x.I className="size-4" /></span>
              <b className="text-sm">{x.t}</b><span className="ml-auto text-xs tabular-nums text-slate-400">{x.rows.length}</span></div>
            <table className="w-full text-sm">
              <tbody>{x.rows.map(([a, b]) => (
                <tr key={a} onClick={() => copy(x.k === "der" || x.k === "neg" ? b : `${a} — ${b}`)} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/40">
                  <td className={cn("px-4 py-2 align-top font-mono text-[13px] font-semibold", x.k === "der" || x.k === "neg" ? "w-10 text-slate-400" : "w-36 whitespace-nowrap")} style={x.k === "der" || x.k === "neg" ? undefined : { color: x.c }}>{a}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{b}</td></tr>))}</tbody>
            </table>
          </Card>))}</div>}
    </div>
  );
}
