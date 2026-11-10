/* Novedades: registro de cambios por versión y la primera versión web (v0.3) en solo lectura, dentro de la terminal */
import { useEffect, useState } from "react";
import { History, ScrollText, Sparkles } from "lucide-react";
import { Card, Segmented } from "@/components/ui";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

export const APP_VERSION = "1.7";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

type Rel = { v: string; f: string; t: string; items: string[] };
const LOG: Rel[] = [
  { v: "1.7", f: "09/11/2026", t: "Notificaciones y patrullas con su marca", items: [
    "Campanita de notificaciones (desplegable): el estado de tus feedback y su respuesta, cambios de rango, expedientes nuevos o resueltos de la PSB (para sus miembros) y versiones nuevas.",
    "Patrullas ONX con su marca: Bravado Buffalo, Vapid Scout, Vapid Monarch, Declasse Granger, etc.",
    "Feedback: las fotos se resumen como [📷 N fotos].",
  ] },
  { v: "1.6", f: "09/11/2026", t: "Feedback, huellas y patrullas ONX", items: [
    "Nueva área Feedback: cualquiera puede mandar errores o ideas con negrita, subrayado, tachado, texto oculto, colores y fotos (se pueden pegar con Ctrl+V). En la campanita de arriba ves en qué quedó cada uno: pendiente, en curso, añadido, arreglado, rechazado o descartado.",
    "Supervisión · Registro de huellas: nuevos registros y coincidencias por agente; se cargan pegando las filas del laboratorio o a mano, con filtros y conteo por agente.",
    "Revisión de patrullas: cada agente lleva los patrullas ONX que se le revisaron (selector con buscador y tipos, sin helicópteros), con quién lo inspeccionó y qué faltaba. El equipamiento es una sola lista para todos.",
    "Registro de patrullas armado solo con las revisiones de la terminal (sin la planilla de Google): por revisión, por agente y por patrulla, con lo que suele faltar en cada modelo.",
    "PSB · Resolución: si se comunica por este medio o en persona, se agrega el bloque resolutivo tomado de la elevación del mismo expediente.",
    "Informes: vehículo robado o no (obligatorio), relación del sujeto con el vehículo, Incident Commander como marca aparte e historial por agente y fechas.",
  ] },
  { v: "1.5", f: "08/11/2026", t: "Agentes, informes completos y una terminal más viva", items: [
    "Agentes pasa a ser un área propia, ordenada por rango (Jefatura, Capitanía, Supervisores, Detectives y Patrulleros), con las condecoraciones visibles en cada tarjeta.",
    "Condecoraciones: catálogo de medallas, franjas de servicio y condecoraciones por departamento y división; se otorgan desde el catálogo o desde el perfil.",
    "Área Sargentos (Sargento II o más): examen escrito, entrevista (Oral Board) y lista de elegibles con convocatorias, nota /22 y sobre 100.",
    "Informes: unidad o indicativo por agente, arrastrar para ordenar, vehículos con categoría, marca y modelo (juego + pack ONX), agente que procesa e incautaciones por sujeto, secciones que se pueden quitar y rangos como en la radio.",
    "Revisión de patrullas: checklist del maletero con requerido, actual, faltante y observaciones.",
    "PSB: Notice to Correct Deficiencies como propuesta, votaciones editables e historial de expedientes con sus comunicados.",
    "Comunicados de las divisiones armados desde las plantillas oficiales.",
    "Buscador de agentes con autocompletado en toda la terminal, tratamiento el/la automático y divisiones de la A a la Z.",
    "Air Support: helicópteros Polmav, AS332 Super Puma y MH-60S Blackhawk.",
    "Barra de la tablet con ubicación, fecha, red y batería; indicador de sincronización animado.",
    "Se retira la versión clásica: todo funciona en esta terminal. Más rápida (lecturas en caché e imágenes optimizadas) y sesión más segura.",
  ] },
  { v: "1.0", f: "07/11/2026", t: "La terminal nueva pasa a ser la principal", items: [
    "Apartado Legal con el catálogo oficial completo (Código Penal y leyes), favoritos, búsqueda por artículo y mención especial a su autor.",
    "Pantalla de ingreso policial con huella, 37 temas, punteros y efecto de pantalla liviano.",
    "Menú en una sola línea, con íconos y orden alfabético.",
  ] },
  { v: "0.9", f: "04/11/2026 – 06/11/2026", t: "Versión nueva en React", items: [
    "Toda la terminal migrada a la versión nueva: supervisión, divisiones, informes, capitanía, jefatura y administración.",
    "Feedback de incidentes, pérdida de armamento y división PSB con plantillas.",
    "Examen EVAL-CRIT-EMG-05 del A.S.D.",
  ] },
  { v: "0.8", f: "30/10/2026 – 03/11/2026", t: "Divisiones e informes", items: [
    "Informes policiales con código penal, Air Support Division y K-9 Division.",
    "Notificaciones de la PSB según el procedimiento.",
    "Recuerdo de la primera versión web (v0.3) en solo lectura.",
  ] },
  { v: "0.3", f: "Octubre 2026", t: "Primera versión web", items: ["Primera versión publicada de la Terminal de Mando. Se puede ver tal cual en la pestaña «Primera versión»."] },
];

export function Novedades() {
  const [tab, setTab] = useState<"log" | "v03">("log");
  useEffect(() => { markSeen(); }, []);
  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "log", label: "Registro de cambios", icon: <ScrollText /> }, { value: "v03", label: "Primera versión (v0.3)", icon: <History /> }]} />
      {tab === "log" ? (
        <ol className="relative space-y-4 border-l border-slate-200 pl-6 dark:border-slate-800">
          {LOG.map((r, i) => (
            <li key={r.v} className="relative">
              <span className={cn("absolute -left-[33px] top-4 grid size-4 place-items-center rounded-full ring-4 ring-slate-50 dark:ring-slate-950", i === 0 ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700")} />
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("font-mono text-sm font-bold", i === 0 && "ver-fire")}>v{r.v}</span>
                  {i === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-300"><Sparkles className="size-3" />Actual</span>}
                  <span className="text-xs text-slate-400">{r.f}</span>
                </div>
                <h3 className="font-display mt-1 text-lg font-semibold">{r.t}</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {r.items.map(x => <li key={x} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{x}</li>)}
                </ul>
              </Card>
            </li>))}
        </ol>
      ) : (
        <Card className="overflow-hidden">
          <p className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800">Modo recuerdo: la versión 0.3 tal como se publicó, en solo lectura. Nada de lo que hagas ahí se guarda.</p>
          <iframe title="Terminal v0.3" src="/legacy/v0.3.html" className="h-[calc(var(--app-h,100dvh)-220px)] min-h-[520px] w-full bg-white" sandbox="allow-scripts allow-same-origin allow-forms" />
        </Card>
      )}
    </div>
  );
}
