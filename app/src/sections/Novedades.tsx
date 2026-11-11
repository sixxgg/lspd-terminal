/* Novedades: registro de cambios por versión y la primera versión web (v0.3) en solo lectura, dentro de la terminal */
import { useEffect, useState } from "react";
import { History, ScrollText, Sparkles } from "lucide-react";
import { Card, Segmented } from "@/components/ui";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

export const APP_VERSION = "1.9.14";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

type Rel = { v: string; f: string; t: string; items: string[] };
const LOG: Rel[] = [
  { v: "1.9.14", f: "11/11/2026", t: "Links con el emblema real y ventanas con luz", items: [
    "Los links temporales muestran el emblema actual de la división, el logo del departamento y el nombre completo de la división.",
    "Ventanas y campos de texto con borde de luz, halo de neón y foco más visible.",
  ] },
  { v: "1.9.13", f: "11/11/2026", t: "Uniformes por rango", items: [
    "Uniformidad agrupada por rango de la división: cada uno accede a los atuendos de su rango y de los de abajo; los de arriba aparecen bloqueados.",
    "Alta y edición de atuendos en una ventana chica, y tarjetas más compactas.",
    "Aviso de versión nueva rediseñado: aparece arriba, con el número de versión y el botón Actualizar.",
  ] },
  { v: "1.9.12", f: "11/11/2026", t: "Links temporales y uniformidad por género", items: [
    "Uniformidad: cada atuendo lleva nombre, género (Hombre / Mujer) y código para copiar y pegar; se puede filtrar por género.",
    "Links temporales: la coordinación crea un link de solo lectura de la uniformidad que vence solo (de 1 hora a 7 días), ve cuántas veces se abrió y lo puede revocar.",
    "Perfiles (BETA): notificaciones cuando te siguen, cuando ven tu perfil y cuando desbloqueás un logro; logros nuevos con confeti.",
    "La foto del perfil puede ser un GIF animado de hasta 1 MB.",
  ] },
  { v: "1.9.11", f: "11/11/2026", t: "Perfiles conectados", items: [
    "Logros míticos con lámina holográfica iridiscente.",
    "Seguidores y seguidos se abren en una ventana, y al final del perfil aparecen «Sugerencias para ti» para seguir a otros.",
    "Cada perfil puede tener su propia foto, sin tocar la foto del agente.",
  ] },
  { v: "1.9.10", f: "11/11/2026", t: "Uniformidad y administración por división", items: [
    "Todas las divisiones tienen la pestaña Uniformidad: atuendos con nombre y código que se copian con un clic.",
    "Coordinación y subcoordinación tienen la pestaña Administración (en rojo) para elegir qué pestañas ven los miembros de la división.",
    "Logros únicos nuevos en algunos perfiles.",
    "La marca del marco ya no aparece un instante al abrir la página si la administración la apagó.",
    "Menos trabajo en segundo plano: el panel privado ya no se redibuja entero cada segundo y los efectos de color usan la GPU.",
  ] },
  { v: "1.9.9", f: "11/11/2026", t: "Catálogo de robos vigente", items: [
    "El catálogo de robos de six toma el Excel de misiones como lo vigente: corrige los límites de la normativa vieja y suma los robos nuevos en su categoría.",
    "Catálogo: policías en binomios y uniones, dinero separado de lo que también da (ítems, piezas), filtros rápidos (actualizados, nuevos, pendientes) y FOTO 4K por sección.",
  ] },
  { v: "1.9.8", f: "11/11/2026", t: "Nickname y marca por defecto", items: [
    "Perfil: cada uno puede ponerse un nickname OOC (lápiz al lado del nombre); el personaje queda aparte y se ve en la pestaña Personaje.",
    "La administración elige la marca «Bananita» del marco por defecto (RGB, magenta o desactivada) y la velocidad, como el tema del departamento.",
  ] },
  { v: "1.9.7", f: "11/11/2026", t: "Perfiles OOC, logros y tablet táctica", items: [
    "Perfil: ID de cuenta según el orden de registro, contadores en un solo renglón, «Acerca de mí» con formato (títulos, negrita, cursiva, citas, listas) y pestaña Personaje con rango, placa, divisiones, condecoraciones y carrera.",
    "Logros por rareza: Registrado y Oficial (común), Sargento (raro), Miembro de la PSB (épico), Sargento II (legendario) y Fundador (mítico).",
    "Actividad policial en el perfil (expedientes PSB, entrevistas RTD y de supervisión, instrucciones): cada bloque lo ven solo los miembros de esa división.",
    "Pestaña del navegador: punto ONLINE que parpadea en el ícono y sesión cifrada en el título; en el ingreso, calavera y caracteres aleatorios.",
    "Nuevo marco de tablet táctica con esquinas de goma, grips y luces, y la marca «Bananita» con efecto RGB (velocidad regulable) o magenta neón desde Apariencia.",
  ] },
  { v: "1.9.6", f: "11/11/2026", t: "Perfiles, pizarra más en vivo", items: [
    "Perfiles nuevos (BETA): portada, avatar, «Acerca de», seguidores, visitantes recientes, actividad, logros y comentarios. Si te comentan el perfil te llega una notificación.",
    "Pizarra: las imágenes se colocan fijas para escribir y dibujar encima (botón Fijar/Desbloquear). Cursores y movimientos ajenos mucho más rápidos.",
    "Barra superior con más datos de enlace que cambian a distintos ritmos.",
  ] },
  { v: "1.9.5", f: "11/11/2026", t: "Invitaciones", items: [
    "Las invitaciones para registrarse las generan solo los dueños de la terminal desde su panel privado, con el registro de quién usó cada una.",
  ] },
  { v: "1.9.4", f: "11/11/2026", t: "Invitaciones, recuperación y pizarra en vivo", items: [
    "Registro solo con código de invitación (un solo uso, vence a las 72 h).",
    "Códigos de recuperación: se entregan al crear la cuenta (y se regeneran en Mi cuenta) para restablecer la contraseña desde «¿Olvidaste la contraseña?».",
    "Pizarra en vivo: se ven los cursores de los demás con su nombre y lo que mueven o dibujan, al instante (también en el enlace compartido).",
    "Pizarra: grosor de trazo, goma, botón Limpiar y herramientas con nombre.",
    "METRO: en la entrevista de instructor se ve claro cuánto vale cada bloque (x1, x2, x3).",
    "Agentes: las divisiones y el indicativo salen solos de los rosters (METRO, SWAT, A.S.D, K-9, PSB, RTD).",
    "Revisión y limpieza de código.",
  ] },
  { v: "1.9.3", f: "11/11/2026", t: "Supervisores", items: [
    "Supervisión pasa a llamarse Supervisores.",
    "Las tareas que tu rango no habilita quedan con candado rojo, también para los administradores.",
    "La pizarra entra justa en la pantalla, sin barra de desplazamiento.",
    "Condecoraciones más compactas: entran muchas más por pantalla.",
  ] },
  { v: "1.9.2", f: "11/11/2026", t: "Ajustes de Capitanía y Códigos", items: [
    "Capitanía: los Sargentos II ven las tareas de Teniente bloqueadas con candado; las del ascenso a Sargento I quedan con su nombre completo en una sola línea.",
    "Códigos: Lectura de derechos actualizada y nueva sección Rotura de negociaciones. Menos texto de relleno.",
    "METRO: la «H» ahora es el Pelotón H (manifestaciones y operativos de gran magnitud).",
  ] },
  { v: "1.9.1", f: "11/11/2026", t: "Pizarra, códigos y Capitanía para Sargentos", items: [
    "La Pizarra pasa al menú principal (sale de las divisiones): fondo gris oscuro, texto con negrita, cursiva, subrayado y títulos H1–H3, y moverse es más fácil: arrastrar el fondo, la rueda o dos dedos; zoom con Ctrl + rueda, pellizco o los botones.",
    "Compartir en vivo: enlace temporal para ver la pizarra en tiempo real sin iniciar sesión (vence solo y se puede revocar).",
    "Nueva pestaña Códigos: códigos radiales básicos, comunes, 10-X, otra terminología, derechos y alfabeto NATO, con buscador y clic para copiar.",
    "Capitanía: los Sargentos II entran solo a la categoría Sargentos (examen escrito, entrevista y lista de elegibles para Sargento I).",
    "PSB: el paso de Justicia ahora es «Aprobación SAJD» (San Andreas Justice Department).",
    "METRO y SWAT con su roster real: rol, subdivisiones (SIERRA, BQ, H, UDU, CNT) e indicativo de radio.",
    "Limpieza de código que ya no se usaba.",
  ] },
  { v: "1.9", f: "11/11/2026", t: "Pizarras, instrucciones y METRO", items: [
    "Pizarra en todas las divisiones (estilo Miro): lienzo infinito con notas, texto, formas, marcos, flechas, lápiz e imágenes o mapas. Plantillas de operativo, Kanban, mapa mental y diagrama de flujo, y exportación a PNG.",
    "Instrucciones en todas las divisiones: fecha, tipo (queda guardado), quién la dio (coordinador, instructor o instructor en pruebas según el roster) y lista de implicados con asistencia.",
    "Metropolitan Division abierta: roster con instructores y pelotones, examen escrito, entrevista de instructor con hoja de puntuación y lista de elegibles.",
    "PSB de punta a punta: notificación → N° de caso → elevación → Justicia o derivación a SAJD (con el resumen del caso) → resolución. Cada expediente queda abierto, en investigación o cerrado, y se ven los otros casos del agente.",
    "K-9: nombre y especialidad del perro de cada handler (armas, drogas, explosivos, búsqueda o dinero).",
    "Comunicados por estructura: firma con rango y placa, confirmar asistencia y una plantilla por bloques para armarlos a medida.",
    "Notificaciones con tiempo relativo («hace 10 minutos»); pasado el mes, la fecha en tu hora. Los feedback eliminados ya no avisan ni quedan en tu historial.",
  ] },
  { v: "1.8", f: "11/11/2026", t: "Más liviana", items: [
    "Los nombres largos de los patrullas ya no se cortan (selector y registro). Vapid Tavros con su marca.",
    "La terminal carga menos en cada dispositivo: los estilos y efectos de partes privadas solo se bajan cuando se usan, y las rutas quedaron ordenadas en un solo lugar.",
    "Buscador unificado en todas las listas.",
  ] },
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
