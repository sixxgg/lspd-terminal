/* Novedades: registro de cambios por versión y la primera versión web (v0.3) en solo lectura, dentro de la terminal */
import { useEffect, useState } from "react";
import { History, ScrollText, Sparkles } from "lucide-react";
import { Card, Segmented } from "@/components/ui";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

export const APP_VERSION = "4.1";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

type Rel = { v: string; f: string; t: string; items: string[]; g?: [string, string[]][] };
const LOG: Rel[] = [
  { v: "4.1", f: "18/11/2026", t: "Consulta, comunicados y buscadores", items: [
    "Nueva pestaña Consulta (en prueba): preguntás lo que quieras del Manual del Novato y responde con el texto del propio manual, resaltando las palabras y diciendo de qué sección sale. Tiene el manual completo con índice y buscador, y se puede marcar una respuesta como incorrecta para revisarla.",
    "Consulta la ven six y quienes él habilite en Administración › Accesos y administradores.",
    "Buscadores de agentes, delitos y sugerencias: la lista ahora se abre por encima de todo (modales, tarjetas y menús) y, si no entra abajo, se abre hacia arriba.",
    "Al recargar la página quedás donde estabas, también dentro del panel de six (sin repetir la intro).",
  ] },
  { v: "4.0.8", f: "18/11/2026", t: "Fichas K-9 e Infraestructura", items: [
    "K-9 › Fichas: registro «Oficial y canino» que queda guardado y se edita cuando haga falta. El guía se busca en el roster (placa y rango se completan solos), rango divisional según los cargos de la K-9, certificación automática desde K-9-2026-05, fotos del oficial y del canino (tocar o soltar la imagen) y salud, vacunas, temperamento y observaciones.",
    "«Ver ficha» muestra el documento oficial de la división y lo descarga como imagen PNG.",
    "Pizarra › Mandos › «Infraestructura San Andreas»: pasada del tablero de Miro con el mapa, los sellos y la leyenda (subestaciones, parque eólico, centrales, potabilizadora, áreas petrolíferas, HVT y zonas calientes). Se puede editar como cualquier pizarra.",
  ] },
  { v: "4.0.7", f: "16/11/2026", t: "Pizarras de Mandos", items: [
    "Pizarra › Mandos: pizarras propias de la terminal, destacadas arriba de todo con borde dorado. Solo las ven y editan Detectives y de Sargento II para arriba (al resto ni siquiera le llegan).",
    "Primera pizarra de Mandos: «Infraestructura San Andreas». Se crean más eligiendo «Mandos» al lado de «Nueva pizarra».",
    "Se quitó el tablero de Miro embebido.",
  ] },
  { v: "4.0.5", f: "16/11/2026", t: "Link de reuniones", items: [
    "Supervisores › Reuniones: botón «Copiar link» en cada reunión. Lo pegás en Discord o donde sea y al abrirlo te lleva directo a esa reunión (si no iniciaste sesión, primero te pide entrar).",
  ] },
  { v: "4.0.4", f: "16/11/2026", t: "Rangos en PSB y 10-80", items: [
    "PSB › Notificación: cualquier miembro puede notificar a cualquier agente, sin importar el rango.",
    "Supervisores › 10-80: los Sargentos II ya no citan a Sargentos I; la única que puede es la Assistant Watch Commander, Evelyn Molina.",
  ] },
  { v: "4.0.3", f: "16/11/2026", t: "PSB sin límite de rango", items: [
    "Citaciones de la PSB: se puede citar a cualquier agente sin importar el rango (antes solo a rangos inferiores, como en Supervisores).",
    "En «Citan» de la PSB aparecen todos sus miembros, no solo supervisores.",
  ] },
  { v: "4.0.2", f: "16/11/2026", t: "Menú más limpio", items: [
    "Menú de arriba solo con íconos: la sección en la que estás muestra su nombre y el resto lo dice al pasar el mouse.",
    "Fuera del encabezado el botón «Buscar» (Ctrl + K sigue abriendo el buscador), el «Sincronizado» (solo aparece si se está guardando o no hay conexión) y el nombre y rango al lado de tu foto.",
  ] },
  { v: "4.0.1", f: "16/11/2026", t: "Invitados y portada", items: [
    "Links de invitado (desde el panel de six › Administración): quien lo abre entra a la terminal sin iniciar sesión, solo con las secciones que six marcó (Inicio, Calendario, Informes, Agentes, Legal, Códigos o Radio) y en solo lectura: nada se guarda.",
    "El invitado ve un aviso «Invitado · solo lectura» con el botón para iniciar sesión, una tarjeta con lo que puede mirar y hasta cuándo vence el link; en Informes solo el historial.",
    "Cada link se puede copiar, ver cuántas veces se abrió y revocar al instante. El servidor solo le manda los datos de esas secciones.",
    "Inicio: tocar la foto de la portada ya no la abre en pantalla completa; es solo visual.",
  ] },
  { v: "4.0", f: "13/11/2026 – 16/11/2026", t: "Terminal de Mando 4.0", items: [], g: [
    ["Inicio", [
      "Inicio nuevo y sin subpestañas: arriba de todo, a todo el ancho, las fotos de la Galería con fundido y un acercamiento lento; los costados y el borde inferior se funden con el fondo y el saludo va escrito sobre la foto.",
      "Tarjeta de identidad que se monta sobre la portada: foto con la insignia del rango, rango, placa, todas las divisiones, el camino al próximo rango, condecoraciones, divisiones y desde cuándo estás en la terminal.",
      "Próximos eventos con la fecha como un calendario de mesa y Novedades completas, sin textos cortados. Las tarjetas entran con una animación suave.",
      "Las Novedades se abren desde la versión que está debajo del logo; «Hora para Discord» pasó a Administración.",
    ]],
    ["Galería", [
      "Nueva sección Galería: las fotos se eligen directo de la cuenta de Fivemanager (o pegando links) y aparecen en el carrusel del Inicio. La clave de Fivemanager se guarda solo en el servidor.",
      "Encuadre de cada foto arrastrándola y con zoom, en una vista previa con las medidas exactas de la portada del Inicio (saludo, contador y tarjeta del perfil).",
      "Mostrar u ocultar, ordenar, poner texto y ver en grande cada foto. La editan six, la administración y quienes se habiliten en Administración › Galería.",
    ]],
    ["Buscador, borradores y revisión", [
      "Ctrl + K abre un buscador tipo consola con el fondo desenfocado: secciones, divisiones, informes, agentes, eventos, robos, artículos de la ley y subpestañas (como la guía OIS). Se mueve con el teclado, recuerda lo último abierto y salta a la pestaña justa aunque ya estés en la sección.",
      "Borradores automáticos: lo que escribís en Informes, Feedback, Radio, Supervisores y Capitanía se guarda solo en el navegador; si recargás o cambiás de sección sin querer, al volver se completa de nuevo (con opción de descartar).",
      "Botón «Revisar» en todos los textos para copiar: rojo si falta algo, amarillo si quedó algo pendiente, verde si está bien. Ahora también marca faltas de ortografía comunes y las corrige con un toque.",
      "«Copiar» con dos opciones en informes, OIS, pérdida de arma, feedback, entrevistas y 10-80: formato Discord o formato web.",
    ]],
    ["Supervisores › Reuniones", [
      "Reuniones como documento abierto (como un incidente de la tablet): cada uno escribe o pega lo que quiera con formato (títulos, listas, negritas, citas) y queda firmado con su nombre y la hora.",
      "Plantillas: Briefing, Reunión de sargentos, Reunión PO III y III+ o libre, con fecha y hora. Temas como etiquetas para filtrar, temas nuevos al vuelo y edición de temas para quien la abre.",
      "Encabezan (la Capitanía, obligatoria, y la Assistant Watch Commander) y Presentes, como tags con foto y cargo. Acta fijada arriba, cerrar y reabrir, y el documento completo para copiar.",
      "Al abrirse llega la notificación (que abre esa reunión) y se agrega sola al calendario; si se borra la reunión, desaparece del calendario.",
    ]],
    ["Supervisores › 10-80", [
      "Pestañas «Nueva citación» e «Historial de 10-80»: se cita a uno o varios agentes (mensaje de radio en plural), se elige quién cita y se guarda en el historial.",
      "Justificación formal en formato Discord o web: lugar, motivo con texto predictivo (ascensos, condecoraciones, llamados de atención y más), asistencia por agente, presentes, medidas genéricas para sumar con un toque y «Revisar redacción».",
      "Etiquetas (Bronca, Ascenso, Felicitación, Disciplinario…) visibles y para filtrar. El historial de la PSB queda aparte y solo lo ven sus miembros.",
    ]],
    ["Supervisores › Entrevistas, Patrullas y Robos", [
      "Entrevistas rediseñadas: lista por rango sin textos cortados, ficha compacta con «Guardar» y después copiar, preguntas que cambian según el rango con respuestas automáticas, «Está cómodo» / «No quiere más divisiones» y quién entrevistó (con un selector nuevo).",
      "Preguntas guardadas en la base y editables por Sargento I o superior. Fechas con la marca de tiempo de Discord. SIERRA y Pelotón H en la METRO.",
      "Patrullas: revisión y registro en una sola sección, con contador por elemento (OK, falta N o N de más).",
      "Nueva sección Robos: catálogo oficial y articulado de cada robo. Articulado corregido para no cobrar dos veces un agravante que el artículo ya incluye y robos actualizados (armerías, casas de lujo, vehículo robado y más).",
      "Supervisores compacto y ordenado de la A a la Z.",
    ]],
    ["Radio", [
      "Nueva sección Radio: comunicado 10.03 por /rlspd (interna) o /rsapd (todos los departamentos) con código 211, 487 o 207, robo, calle y corrección.",
      "Sujetos con sexo, piel, máscara, chaqueta, camiseta, pantalones, calzado y otros rasgos, todo autocompletable; se pueden sumar y duplicar.",
      "Vehículo de huida con buscador de la base de vehículos, muestras de color y matrícula con forma de patente de San Andreas. Historial compartido para corregir el último y sugerencias que aprenden.",
    ]],
    ["Informes y OIS", [
      "Historial de informes como expediente MDT: estado, etiquetas, historial de cambios, autocompletado con informes anteriores y «Usar como base».",
      "Pérdida de arma también queda en Informes. OIS con versiones, recuperar borrados y guardado sin pisar cambios de otros.",
      "Guía de /me y /do del OIS con fallecido dentro del procedimiento: toma al oficial y sus armas, se adapta a hombre o mujer, nivel sencillo o extenso y cada línea se copia con un toque.",
    ]],
    ["Calendario y notificaciones", [
      "Calendario rediseñado: encabezado con números, filtros, agenda por día y el próximo evento destacado.",
      "Reuniones de Supervisores en el calendario, con aviso el mismo día y notificación al abrirse.",
    ]],
    ["Administración", [
      "Logs del roster: quién salió, cuándo y quién lo quitó.",
      "Galería: quién puede editarla y la clave de Fivemanager. Hora para Discord. Casillero para el logo de la pantalla de actualización.",
    ]],
    ["Terminal", [
      "Ingreso con la pantalla de operativo («Inicio de servicio») y actualización en una sola carga, con el logo de la terminal desde el primer momento.",
      "Página de six: Robos con catálogo, articulado, Excel y vista compartida por link.",
      "Terminal más liviana: el archivo principal bajó a la mitad (el Código Penal se carga solo cuando se busca) y se limpió código duplicado o sin uso.",
    ]],
  ] },
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

/* la última versión, para el inicio */
export const latest = () => LOG[0];
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
