/* Novedades: registro de cambios por versión y la primera versión web (v0.3) en solo lectura, dentro de la terminal */
import { useEffect, useState } from "react";
import { History, ScrollText, Sparkles } from "lucide-react";
import { Card, Segmented } from "@/components/ui";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

export const APP_VERSION = "2.3.1";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

type Rel = { v: string; f: string; t: string; items: string[] };
const LOG: Rel[] = [
  { v: "2.3.1", f: "12/11/2026", t: "Rosters solo para la coordinación", items: [
    "El roster de cada división lo modifica únicamente su coordinación (también lo controla el servidor). La administración solo puede cargarlo mientras la división no tenga coordinación.",
    "RTD con roster propio: Coordinación, Subcoordinador, Master Field Training Officer, Field Training Officer y Miembro de la RTD, con los 17 FTO cargados.",
    "CNT con sus rangos: Coordinador, Negociador (5) y Aspirante C.N.T.",
    "Ventana de alta y edición del roster más compacta.",
  ] },
  { v: "2.3", f: "12/11/2026", t: "Rosters nuevos y divisiones protegidas", items: [
    "Rosters rediseñados en todas las divisiones y subdivisiones: tarjetas por rol con su color, indicativo y especialidades; alta y edición en una ventana chica como la de uniformidad.",
    "Rosters cargados: ASB (coordinación Lara Calloway y Evelyn Molina, agentes y administrativos), HSIU y Detective Bureau (WHISKEY-01, 02, 03…). Indicativos también en las subdivisiones de la METRO.",
    "Registro de vuelo y de patrullaje: el permiso se elige de una lista (volar una aeronave que no sea el Polmav lo exige) y siempre pide quién lo autorizó.",
    "Los datos de cada división solo los recibe quien está en su roster, y las pestañas «Solo coordinación» tampoco llegan al resto: lo controla el servidor.",
    "Aviso de actualización como notificación del sistema de la tablet: baja desde arriba, se reinicia con un toque o se desliza para después.",
    "Limpieza de código duplicado y sin uso.",
  ] },
  { v: "2.1", f: "12/11/2026", t: "Rosters para todos y nuevas divisiones", items: [
    "Todas las divisiones y subdivisiones tienen roster. La coordinación define los roles (nombre, color, orden y si coordinan) desde Administración, y suma o quita gente en un paso.",
    "Subdivisiones abiertas (SWAT, Bomb Squad, CNT, UDU y las de la Detective Bureau) con Roster, Uniformidad y Administración.",
    "Metropolitan Drone Support Operations: solo Licencias (agente, licencia activa, desde cuándo, N° de serie y modelo del drone).",
    "Administration Services Bureau: Administrativos, Ideas de eventos, Ideas de publicaciones, Documentación, Tareas, Convenios (plantilla en Canva y teléfonos de negocios para copiar) y Subdivisiones.",
    "High Speed Interception Unit abierta: Roster, Uniformidad, Administración y Registro TOM con la plantilla nueva (vehículo utilizado, vehículo seguido y motivo).",
    "Legal: solo la ve quien recibe acceso del dueño de la terminal.",
    "Las plantillas se completan con quien las está escribiendo: firma, agente y borradores son de cada uno.",
    "Nueva pantalla de ingreso: tu credencial se escanea y valida sola (placa, rango, ID y divisiones).",
    "El ID de las cuentas respeta el orden de registro.",
  ] },
  { v: "2.0", f: "11/11/2026", t: "Terminal de Mando 2.0", items: [
    "Divisiones privadas: cada división la ve solo quien está cargado en su roster. Todas tienen Instrucciones, Uniformidad por rango y género con código para copiar, y Administración (coordinación) para elegir qué pestañas ven los miembros. Encabezado y pestañas rediseñados.",
    "METRO, SWAT, K-9, A.S.D, RTD y PSB con su roster real: roles, subdivisiones, indicativos, examen escrito, entrevista de instructor y lista de elegibles. La PSB de punta a punta: notificación, elevación, Aprobación SAJD, resolución y expedientes.",
    "Pizarra (BETA) estilo Miro en el menú principal: lienzo infinito con notas, formas, flechas, lápiz e imágenes, plantillas, cursores en vivo, exportación a PNG y enlace temporal para verla sin sesión.",
    "Perfiles (BETA): portada, foto o GIF, nickname OOC, «Acerca de mí» con formato, seguidores y sugerencias, comentarios, pestaña Personaje y logros por rareza (los míticos holográficos).",
    "Agentes como área propia ordenada por rango, con condecoraciones; Capitanía con el ascenso a Sargento I (examen, Oral Board y lista de elegibles).",
    "Supervisores: informes completos, revisión y registro de patrullas ONX con su marca, registro de huellas y entrevistas.",
    "Feedback con formato y fotos, y campanita de notificaciones (feedback, rangos, PSB, perfiles y versiones nuevas).",
    "Códigos radiales, 10-X, derechos y alfabeto NATO con buscador y clic para copiar.",
    "Links temporales de solo lectura (uniformidad y pizarra) que vencen solos, con contador de visitas y botón para revocar.",
    "Registro solo con invitación y códigos de recuperación de contraseña.",
    "Nuevo marco de tablet táctica negro con luces, marca «Bananita» configurable por la administración y pestaña del navegador con punto ONLINE.",
    "Administración › «Ver como»: mirar la terminal con otro rango y sin divisiones, en solo lectura.",
    "Más liviana y rápida: menos trabajo en segundo plano, carga por partes, aviso de versión nueva arriba y limpieza de código.",
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
