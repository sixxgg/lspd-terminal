/* Novedades: registro de cambios por versión y la primera versión web (v0.3) en solo lectura, dentro de la terminal */
import { useEffect, useState } from "react";
import { History, ScrollText, Sparkles } from "lucide-react";
import { Card, Segmented } from "@/components/ui";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

export const APP_VERSION = "3.0";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

type Rel = { v: string; f: string; t: string; items: string[]; g?: [string, string[]][] };
const LOG: Rel[] = [
  { v: "3.0", f: "11/11/2026 – 13/11/2026", t: "Terminal de Mando 3.0", items: [], g: [
    ["Divisiones", [
      "Cada división la ve solo quien está en su roster y lo controla el servidor; la coordinación elige qué pestañas ven los miembros y es la única que edita su roster.",
      "Rosters rediseñados en todas las divisiones y subdivisiones (SWAT, Bomb Squad, CNT, UDU, Detective Bureau, HSIU, RTD, ASB…): roles con color y orden, indicativos y especialidades.",
      "Todas con Instrucciones, Uniformidad por rango y género, Calendario y Administración.",
      "ASB: Administrativos, Entrevistas, Ideas de eventos y publicaciones, Documentación, Tareas, Convenios y Subdivisiones. MDSO con licencias de drone. HSIU con Registro TOM.",
      "PSB de punta a punta: notificación, elevación, aprobación SAJD, resolución, votaciones y expedientes.",
    ]],
    ["Metropolitan Division", [
      "Armas (coordinación): las armas reglamentarias por tipo, con munición, accesorios por ranura, autorización y «Copiar kit» con comandos, lista de ítems o texto.",
      "Entrevista de instructor por convocatorias (C1…) con postulantes, respuestas en solo lectura y preguntas revisadas.",
      "Examen escrito en línea: estado Listo / No disponible, pantalla exclusiva con una pregunta por vez, reloj, corrección automática en el servidor y strikes por salir de la pestaña, capturas o herramientas del navegador (3 desaprueban).",
      "Gestión de exámenes: activar, duración, hora programada con aviso a los anotados, convocatoria, anotados a mano, nota mínima, resultados con el detalle de cada respuesta, banco de preguntas y pruebas que se pueden borrar.",
    ]],
    ["Informes y procedimientos", [
      "Procedimiento OIS con fallecido en 6 pasos: armas con cálculo de cargadores y balas disparadas, varias armas, test con colores, revisión de lo que falta, historial y números sin duplicar.",
      "El OIS se remite a la Force Investigation Division: al guardarlo se abre el caso en la PSB y a sus miembros les llega el aviso.",
      "Formato web y PDF con el sello del LSPD.",
    ]],
    ["Calendario", [
      "Sección Calendario con el mes, próximos eventos con banner y filtros por división; cada división carga los suyos y la ASB publica para todo el departamento.",
      "Detalles con formato, comunicado listo para copiar, aviso el mismo día y contador de lo nuevo; quien crea un evento lo puede borrar.",
    ]],
    ["Agentes y perfiles", [
      "Perfil del agente como expediente: foto, placa, State ID, callsign, pasador de condecoraciones y legajo por pestañas.",
      "Condecoraciones con selector visual por catálogo. Perfiles (BETA) con portada, seguidores, comentarios y logros.",
    ]],
    ["Terminal", [
      "Menú nuevo que nunca se corta (lo que no entra va a «Más»), barra de estado más chica y versión debajo del escudo.",
      "Idioma según quien visita: voseo desde Argentina y tú desde España y el resto (se puede fijar en Apariencia).",
      "Avisos y confirmaciones como notificaciones push de un renglón que bajan desde arriba.",
      "Feedback renovado: tipo, sección, editor con formato y fotos, y «Mis feedback» con estados.",
      "Pizarra (BETA), códigos radiales, enlaces temporales de solo lectura, registro con invitación, códigos de recuperación y restablecimiento de contraseñas.",
      "Ingreso con credencial escaneada, aviso de actualización dentro de la tablet y «Ver como» para la administración.",
      "Registro de actividad para el dueño: quién crea, edita o borra cada cosa.",
      "Código más liviano: sin duplicados ni partes sin uso y carga por partes.",
    ]],
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
                {[...(r.items.length ? [["", r.items] as [string, string[]]] : []), ...(r.g || [])].map(([h, L]) => (
                  <div key={h || "_"} className={cn(h && "mt-4")}>
                    {h && <p className="text-[11px] font-bold uppercase tracking-[.16em] text-brand-600 dark:text-brand-300">{h}</p>}
                    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {L.map(x => <li key={x} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{x}</li>)}
                    </ul></div>))}
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
