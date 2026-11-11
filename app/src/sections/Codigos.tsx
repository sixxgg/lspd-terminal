/* Códigos radiales del SAPD: básicos, comunes, 10-X, otra terminología, derechos del detenido y alfabeto NATO. Clic en una fila para copiarla. */
import { useState } from "react";
import { BookOpen, Hash, Radio, Scale, Signal, Type } from "lucide-react";
import { Card, SearchInput } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

type G = { k: string; t: string; I: typeof Radio; c: string; h: [string, string]; rows: [string, string][] };
const GRUPOS: G[] = [
  { k: "bas", t: "Códigos radiales básicos", I: Radio, c: "#f59e0b", h: ["Código", "Descripción"], rows: [
    ["Código 1", "Confirmación de llamada / respuesta a través de radio"], ["Código 2", "Llamada de rutina (sin sonoras)"], ["Código 3", "Llamada de emergencia (sirenas y luces)"],
    ["Código 4", "No se precisa más ayuda"], ["Código 6", "En investigación"], ["Código 6-ADAM", "Se requiere asistencia de una unidad"], ["Código 7", "Pausa en el patrullaje"],
    ["Código 8", "Se requiere ambulancia"], ["Código 9", "Búsqueda y captura"], ["Código 11", "Situación actual"], ["Código 12", "Falsa alarma"], ["Código 37", "Vehículo reportado robado"],
    ["Código 77", "Precaución, posible emboscada"], ["Código 99", "Oficial en peligro"], ["Código 100", "En posición para interceptar"]] },
  { k: "com", t: "Códigos comunes", I: Hash, c: "#ef4444", h: ["Código", "Descripción"], rows: [
    ["187", "Homicidio"], ["207", "Secuestro"], ["211", "Robo a establecimiento"], ["212", "Robo al banco"], ["215", "Robo a casa"], ["240", "Asalto a civil"], ["242", "Agresión"],
    ["246", "Tiroteo en curso"], ["254 VICTOR", "Persecución vehicular"], ["254 PAUL", "Persecución a pie"], ["320", "Venta de droga"], ["415", "Disturbios / peleas"], ["417", "Persona armada"],
    ["484", "Robo a civil"], ["487", "Robo mayor"]] },
  { k: "10x", t: "Códigos 10-X", I: Signal, c: "#38bdf8", h: ["Código", "Descripción"], rows: [
    ["10-00", "Precaución"], ["10-04", "Afirmativo"], ["10-05", "Negativo"], ["10-06", "Parada de tráfico"], ["10-09", "Repetir comunicado"], ["10-10", "Fuera de servicio"],
    ["10-11", "Habla poco a poco"], ["10-15", "Sujeto bajo custodia"], ["10-16", "Recoge prisionero"], ["10-20", "Ubicación"], ["10-23", "Mantenerse a la espera"], ["10-24", "Problemas en la radio"],
    ["10-37", "Grúa"], ["10-38", "Bomberos"], ["10-80", "Nos reunimos en…"], ["10-86", "Control de tráfico"], ["10-95", "Procesando sujeto"], ["10-97", "Llegada a la escena"], ["10-98", "Aviso finalizado"]] },
  { k: "ter", t: "Otra terminología", I: BookOpen, c: "#a855f7", h: ["Clave", "Significado"], rows: [
    ["Adam Charles", "Accidente de tráfico"], ["Boy Tom", "Aviso de bomba"], ["Tom Charles", "Colisión de tráfico"], ["Paul Henry", "Persona herida"], ["Clave Robert", "Fuerza letal activada"],
    ["Shots fired", "Disparos efectuados"], ["PIT", "Desestabilización del coche en movimiento"]] },
  { k: "der", t: "Derechos", I: Scale, c: "#22c55e", h: ["", "Derecho"], rows: [
    ["1", "Derecho a permanecer en silencio"], ["2", "Derecho a no declarar contra sí mismo ni confesarse culpable"],
    ["3", "Derecho a asistencia letrada, designada a voluntad propia o de oficio, en el caso de que no sea flagrante delito"],
    ["4", "Derecho a informar a un familiar o persona de confianza"], ["5", "Derecho a ser asistido por un médico"]] },
  { k: "nato", t: "Alfabeto NATO", I: Type, c: "#94a3b8", h: ["Letra", "Código"], rows: "Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliet Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whisky X-ray Yankee Zulu".split(" ").map(w => [w[0], w] as [string, string]) },
];

export function Codigos() {
  const { toast } = useFeedback(), [q, setQ] = useState(""), [g, setG] = useState("all"), s = norm(q.trim());
  const L = GRUPOS.filter(x => g === "all" || x.k === g).map(x => ({ ...x, rows: x.rows.filter(([a, b]) => !s || norm(a + " " + b).includes(s)) })).filter(x => x.rows.length);
  const copy = (t: string) => { void navigator.clipboard?.writeText(t); toast(`Copiado: ${t}`); };
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <SearchInput className="min-w-[14rem] flex-1 sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar código o significado… (ej: 10-20, robo, Robert)" />
        <div className="flex flex-wrap gap-1">{[{ k: "all", t: "Todos", c: "#64748b" }, ...GRUPOS].map(x => (
          <button key={x.k} onClick={() => setG(x.k)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", g === x.k ? "text-white" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}
            style={g === x.k ? { background: x.c, borderColor: x.c } : undefined}>{x.k === "all" ? x.t : x.t.replace(/^Códigos /, "").replace(/^radiales /, "")}</button>))}</div>
      </Card>
      {!L.length ? <p className="py-10 text-center text-sm text-slate-400">Nada coincide con «{q}».</p>
        : <div className="columns-1 gap-5 lg:columns-2 2xl:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">{L.map(x => (
          <Card key={x.k} className="overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-slate-800" style={{ boxShadow: `inset 3px 0 0 ${x.c}` }}>
              <span className="grid size-7 place-items-center rounded-lg" style={{ color: x.c, background: x.c + "1f" }}><x.I className="size-4" /></span>
              <b className="text-sm">{x.t}</b><span className="ml-auto text-xs tabular-nums text-slate-400">{x.rows.length}</span></div>
            <table className="w-full text-sm">
              {x.h[0] && <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="w-36 px-4 py-2 font-semibold">{x.h[0]}</th><th className="px-4 py-2 font-semibold">{x.h[1]}</th></tr></thead>}
              <tbody>{x.rows.map(([a, b]) => (
                <tr key={a} onClick={() => copy(x.k === "der" ? b : `${a} — ${b}`)} title="Clic para copiar" className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/40">
                  <td className={cn("px-4 py-2 align-top font-mono text-[13px] font-semibold", x.k === "der" && "w-10 text-slate-400")} style={x.k === "der" ? undefined : { color: x.c }}>{a}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{b}</td></tr>))}</tbody>
            </table>
          </Card>))}</div>}
    </div>
  );
}
