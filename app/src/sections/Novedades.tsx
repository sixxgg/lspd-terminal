/* Novedades: registro de cambios por versión y la primera versión web (v0.3) en solo lectura, dentro de la terminal */
import { useEffect, useState } from "react";
import { History, ScrollText, Sparkles } from "lucide-react";
import { Card, Segmented } from "@/components/ui";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

export const APP_VERSION = "3.9.4";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

type Rel = { v: string; f: string; t: string; items: string[]; g?: [string, string[]][] };
const LOG: Rel[] = [
  { v: "3.9.4", f: "16/11/2026", t: "Inicio sin subpestañas", items: [
    "Inicio quedó solo, sin la barra de subpestañas: más espacio para las fotos. Las Novedades se abren desde la versión que está debajo del logo y «Hora para Discord» pasó a Administración.",
    "La portada es un poco más baja y sus costados y el borde de abajo se funden con el fondo. Las tarjetas entran con una animación suave.",
  ] },
  { v: "3.9.3", f: "16/11/2026", t: "Encuadre de las fotos", items: [
    "Galería › «Encuadre»: cada foto se ajusta arrastrándola y con zoom, en una vista previa con las medidas de la portada del Inicio (dónde va el saludo, el contador y la tarjeta del perfil). Se ve igual en el Inicio y en el carrusel.",
  ] },
  { v: "3.9.2", f: "16/11/2026", t: "Inicio nuevo", items: [
    "Las fotos de la Galería van arriba de todo, a todo el ancho, con fundido y un acercamiento lento; el saludo va encima de la foto.",
    "Nueva tarjeta de identidad sobre la portada: foto con la insignia del rango, rango, placa, divisiones, el camino al próximo rango y las condecoraciones.",
    "Próximos eventos con la fecha como un calendario de mesa y Novedades completas, sin textos cortados.",
  ] },
  { v: "3.9.1", f: "16/11/2026", t: "Galería en el Inicio y conectada a Fivemanager", items: [
    "El Inicio quedó más simple: la ficha del agente, un carrusel con las fotos de la Galería, el escalafón, los próximos eventos y las novedades. Para ir a cualquier sección está el buscador (Ctrl + K).",
    "Galería: se eligen las fotos directo de la cuenta de Fivemanager (sin copiar links). El carrusel ya no muestra miniaturas ni barra de tiempo; queda el contador.",
    "Administración › Galería: quién más puede editar la galería y la clave de Fivemanager (se guarda solo en el servidor).",
  ] },
  { v: "3.9", f: "16/11/2026", t: "Encabezan y presentes, nuevo ingreso y terminal más liviana", items: [
    "Reuniones: «Encabezan» (la Capitanía, obligatoria, y la Assistant Watch Commander Evelyn Molina, más quien se sume) y «Presentes» (sargentos y citados), como tags con foto y cargo. También salen en el documento para copiar.",
    "Al iniciar sesión, la terminal arranca con la misma pantalla de operativo que las actualizaciones, ahora como «Inicio de servicio» (Esc, Enter o un toque para entrar ya).",
    "La terminal carga casi la mitad de código al abrir: el Código Penal se descarga recién cuando se usa el buscador.",
  ] },
  { v: "3.8.1", f: "16/11/2026", t: "Reuniones en el calendario y con aviso", items: [
    "Al abrir una reunión (ahora con fecha y hora) les llega la notificación a los supervisores (y a los PO III / III+ si es de PO III) y se agrega sola al calendario. Si se borra la reunión, desaparece del calendario.",
    "Tocar la notificación abre esa reunión directamente.",
    "Temas: ahora son títulos cortos (hasta 60 letras) y se ven recortados con prolijidad; el texto largo va como parte. Quien abrió la reunión puede «Editar temas» y quitarlos (sus partes pasan a General).",
  ] },
  { v: "3.8", f: "15/11/2026", t: "Reuniones: documento abierto para todos", items: [
    "Cada reunión ahora es como un incidente de la tablet donde todos meten mano: se escribe o se pega lo que sea (una lista de requisitos de ascenso, un caso, un tema) y se publica firmado con tu nombre y la hora. Ya no hace falta dar una opinión por cada tema ni hay nada oculto.",
    "Pegar mantiene el formato: desde Discord, Notion, Docs o un bloc de notas se conservan títulos, listas, negritas, cursivas, tachados y citas. También hay barra de formato y Ctrl + Enter para publicar.",
    "Cada parte se puede asignar a un tema (o dejar en General), filtrar por tema, y editar o borrar la propia. Los temas nuevos se agregan al vuelo.",
    "El acta queda fijada arriba y el documento completo se copia en formato Discord o web, ordenado por tema y con el autor de cada parte. Lo que escribís sin publicar queda guardado como borrador.",
  ] },
  { v: "3.7.5", f: "15/11/2026", t: "Reuniones: temas más claros", items: [
    "Al abrir una reunión, los temas de la plantilla se ven como lista numerada (se pueden reordenar o quitar) y abajo se suman los que hayan quedado afuera, uno por vez. Ya no se escribe un tema por línea.",
  ] },
  { v: "3.7.4", f: "15/11/2026", t: "Buscador más preciso y logo en la actualización", items: [
    "Ctrl + K: si ya estás en la sección, igual te lleva a la pestaña que elegiste (por ejemplo, de «Procedimiento OIS» a «Guía /me y /do»), y lo mismo con informes, agentes y leyes.",
    "La pantalla de actualización y el ícono de la pestaña usan el logo de la terminal en vez del de por defecto, incluso antes de que carguen los datos.",
    "Administración › Marca e imágenes: nuevo casillero «Logo de la pantalla de actualización» (si está vacío, se usa el logo general).",
  ] },
  { v: "3.7.3", f: "15/11/2026", t: "Radio sin frecuencia", items: [
    "Radio: se quitó la frecuencia, porque la radio ya la pone sola. El mensaje queda «/rlspd 10.03 | 211 - Robo - Calle: | Sujetos: …».",
    "Radio: canal, código y corrección rediseñados con tarjetas más claras.",
  ] },
  { v: "3.7.2", f: "15/11/2026", t: "Buscador global (Ctrl + K) y guía OIS dentro del informe", items: [
    "Ctrl + K (o ⌘ + K) abre un buscador tipo consola, con el fondo desenfocado: secciones y divisiones, informes, agentes, eventos del calendario, robos y artículos de la ley. Se mueve con ↑ ↓, Enter abre, Tab cambia de categoría y recuerda lo último que abriste. También está el botón «Buscar» arriba.",
    "La guía de /me y /do del OIS con fallecido pasó a Informes › Procedimiento OIS con fallecido, como pestaña «Guía /me y /do». Toma al oficial implicado y sus armas (modelo y número de serie) del procedimiento que estás cargando.",
  ] },
  { v: "3.7.1", f: "15/11/2026", t: "Borradores automáticos, OIS con fallecido y Radio mejorada", items: [
    "Borradores: lo que escribís en Informes, Feedback, Radio, Supervisores y Capitanía se guarda solo en este navegador. Si recargás, cerrás la pestaña o cambiás de sección sin querer, al volver se completa de nuevo (con opción de descartar). Al guardar o enviar, el borrador se borra.",
    "Supervisores › OIS con fallecido: guía de /me y /do por agente (en masculino o femenino) para la escena, su estado físico, la ropa y el equipo, cada arma (pistola, carabina, SMG, escopeta, cartuchos de goma, táser, porra, linterna, spray), la custodia, la cámara y la notificación. Nivel sencillo o extenso; cada línea se copia con un toque.",
    "Radio: la frecuencia ya no viene puesta; se pueden guardar las frecuencias (★) y aparecen las usadas para elegirlas con un toque.",
    "Radio: nuevo vehículo de huida, con buscador de modelos, muestras de color y matrícula con forma de patente de San Andreas.",
    "Reuniones: cada uno tiene «Otros temas que traigo» para lo que quiera plantear y puede proponer temas nuevos para todos.",
  ] },
  { v: "3.7", f: "15/11/2026", t: "Radio, reuniones colaborativas y revisión de ortografía", items: [
    "Nueva pestaña «Radio»: comunicado 10.03 por /rlspd (interna) o /rsapd (todos los departamentos) con frecuencia, código (211, 487, 207), robo, calle, sujetos y vehículo de huida.",
    "Sujetos con sexo, piel, máscara, chaqueta, camiseta, pantalones, calzado y otros rasgos, todo autocompletable. Se pueden sumar y duplicar sujetos.",
    "Vehículo de huida desde la base de vehículos, con color y matrícula (o sin matrícula, tapada o no visible). Las sugerencias aprenden de los comunicados guardados y se puede cargar el último como corrección.",
    "Supervisores › Reuniones: Briefing, Reunión de sargentos, Reunión PO III y III+ o libre. Cada uno carga su opinión y lo de los demás se ve recién al enviarla. Quien la abre escribe el acta y la cierra. Ya está cargada el acta de la reunión de sargentos del 15/11.",
    "«Revisar» ahora también marca faltas de ortografía (tildes y errores comunes) y las corrige con un toque.",
    "Inicio: la foto de la ficha ahora encuadra en su marco.",
  ] },
  { v: "3.6.2", f: "15/11/2026", t: "10-80: etiquetas, varios citados y presentes", items: [
    "Etiquetas (Bronca, Ascenso, Felicitación, Disciplinario, Seguimiento…) o cualquier otra que escribas. Se ven en el historial y se puede filtrar por ellas.",
    "Se puede citar a varios agentes en un mismo 10-80: el mensaje de radio queda en plural («acudan… confirmen lectura»).",
    "Se carga quiénes citan y, en la justificación, quiénes estuvieron presentes en el 10-80. Las dos cosas se ven en el historial.",
    "Con varios citados, la asistencia se marca por agente y el texto formal queda redactado en plural.",
  ] },
  { v: "3.6.1", f: "15/11/2026", t: "10-80: justificación mejorada", items: [
    "«Escenario» pasa a llamarse «Lugar», en la citación y en el mensaje.",
    "Motivo con texto predictivo: sugiere mientras escribís (Tab para completar) y trae muchos más motivos, como ascensos, condecoraciones, cambios de división o de turno. Se puede escribir cualquier otro.",
    "Medidas adoptadas: frases genéricas para sumar o quitar con un toque.",
    "«Revisar redacción»: ordena espacios, mayúsculas, signos y puntos finales de lo que escribiste, y avisa qué corrigió. Al guardar se aplica sola.",
    "Mensaje más formal: «…fue citado mediante radio interna para realizarle un 10-80 ejecutado por…, quien se presentó en tiempo y forma, además de ser atendido por la supervisión».",
  ] },
  { v: "3.6", f: "15/11/2026", t: "10-80 con historial y justificación", items: [
    "10-80: dos pestañas, «Nueva citación» e «Historial de 10-80». Después de armar la citación, «Guardar en el historial» la deja registrada con número, agente, escenario, fecha y quién citó.",
    "Historial: buscador y filtro (todos, sin justificar, justificados). Cada 10-80 se puede justificar después, sin apuro: motivo, fecha de la reunión, asistencia, exposición de los hechos, medidas adoptadas y observaciones.",
    "La justificación arma un mensaje formal, como un feedback, para publicar en la página: formato Discord o web, con fechas en la zona horaria de cada uno y «Revisar».",
    "En la PSB, las citaciones van a un historial aparte que solo ven sus miembros.",
  ] },
  { v: "3.5.3", f: "15/11/2026", t: "Entrevistas: textos completos y nuevo selector", items: [
    "Lista de entrevistas: el nombre y quién entrevistó ya no se cortan (van en su propio renglón).",
    "Nuevo selector de «Entrevistó»: panel flotante con buscador, filtro por rango, foto, insignia, placa y cuántas entrevistas hizo cada uno; marca «Vos» y se maneja con el teclado (↑ ↓ Enter Esc).",
  ] },
  { v: "3.5.2", f: "15/11/2026", t: "Entrevistas: quién entrevistó", items: [
    "Ficha de la entrevista: nuevo campo «Entrevistó» con un menú desplegable de los Sargentos I y II (con buscador). El menú se abre por encima de todo, así que nunca queda cortado.",
    "Si el que abre la ficha es sargento, queda puesto solo. Sale en la lista, en el texto para Discord o web y «Revisar» avisa si falta.",
    "Divisiones con etiquetas redondeadas en lugar de cuadraditos, con el punto de color de cada una (las muy oscuras, como SWAT, se aclaran para que se vean).",
  ] },
  { v: "3.5.1", f: "15/11/2026", t: "Calendario y entrevistas rediseñados", items: [
    "Calendario: cabecera con el mes grande y los números (este mes, hoy, anotados), filtros por vista y división más claros, días con los eventos como píldoras con hora y el fin de semana marcado.",
    "Calendario: agenda al costado agrupada por día (Hoy, Mañana…) con el próximo evento destacado.",
    "Entrevistas: cada rango con su banda de color, insignia y avance; cada agente con el estado en el avatar, las divisiones separadas en «Pertenece» y «Quiere», y estado, rama y copiar a la derecha.",
  ] },
  { v: "3.5", f: "15/11/2026", t: "Inicio nuevo · una sola carga al actualizar · registro de bajas del roster", items: [
    "Inicio rehecho con aire de foro: ficha del agente (portada, avatar, rango con barras, cintas y divisiones), escalafón con tu rango marcado y el que sigue, y las áreas como categorías con sus secciones en filas.",
    "Columna lateral en el inicio: próximos eventos, la última versión y los números del departamento.",
    "Actualización de la terminal: una sola pantalla de carga, estilo briefing de operativo (objetivos, consejo y barra de progreso), que sigue hasta que la terminal vuelve a estar lista. Ya no aparece un segundo «cargando».",
    "Administración › Logs: queda anotado cada agente que sale del roster (quitado a mano o que no vino en el CSV nuevo), con rango, placa, quién lo quitó y cuándo. Se puede buscar y copiar.",
    "Limpieza: estilos de la pantalla de actualización vieja eliminados y revisión general de código y textos.",
  ] },
  { v: "3.4.2", f: "14/11/2026", t: "Entrevistas más compactas y con respuestas automáticas", items: [
    "La pregunta de la rama cambia según el rango (oficial, detective o sargento) y la respuesta se completa sola con la rama que marques.",
    "La pregunta de divisiones cambia si ya pertenece a alguna, y la respuesta se arma sola con las del roster y las que marques que quiere (o «cómodo» / «no quiere más»). Si escribís algo, queda lo tuyo; con ↺ volvés a la automática.",
    "Ficha de la entrevista más chica: estado, fecha y rama en una sola fila, divisiones en etiquetas cortas y respuestas en una lista compacta.",
    "Al copiar para Discord, la fecha y la hora van con la marca de tiempo de Discord: cada uno la ve en su zona horaria.",
    "Metropolitan Division: se agregan las subdivisiones SIERRA y Pelotón H (también salen solas del roster de la METRO).",
  ] },
  { v: "3.4.1", f: "14/11/2026", t: "Entrevistas: no quiere más divisiones", items: [
    "En «Divisiones a las que quiere pertenecer» se puede marcar «Está cómodo donde está» o «No quiere más divisiones». Sale en la lista, en el texto para Discord o web y cuenta como completo en «Revisar».",
  ] },
  { v: "3.4", f: "14/11/2026", t: "Robos oficiales en Supervisores · articulado corregido · entrevistas con Guardar", items: [
    "Articulado de robos corregido: si el artículo del robo ya trae un agravante (armas, rostro cubierto, huida, hackeo, grupo, vehículos robados, disparar a los agentes), no se imputa aparte. Cada robo muestra qué agravantes ya incluye.",
    "Robos actualizados: armerías de Morningwood, industrias y Paleto (132.144), casas de lujo (132.125), comisaría sin cargos dobles, máquinas sin daños dobles, vehículo robado como agravante aparte cuando corresponde y robos sin artículo propio con arma de fuego al 132.12.",
    "Nueva sección Supervisores › Robos: catálogo oficial y articulado de cada robo, con detalle y copiar en formato Discord o web. La versión oficial se guarda en la base.",
    "Entrevistas: la ficha ahora tiene «Guardar»; una vez guardada se puede copiar en formato Discord o web. Si cerrás con cambios sin guardar, avisa.",
    "Entrevistas: lista ordenada por rango en filas prolijas (agente, estado, fecha, rama y divisiones) en vez de tarjetas sueltas.",
    "Preguntas de la entrevista corregidas y reordenadas (el cierre «¿algo más?» va al final). Se guardan en la base y Sargento I o superior las puede editar, ordenar o volver a las de siempre. Las respuestas que ya estaban se acomodan solas al orden nuevo.",
    "Limpieza: fecha y hora con una sola función compartida, un solo código para cerrar menús al tocar afuera y funciones de robos sin duplicar.",
  ] },
  { v: "3.0.6", f: "14/11/2026", t: "Copiar en Discord o web · Supervisores A-Z · Entrevistas nuevas", items: [
    "Informes, OIS, pérdida de arma y feedback: botón «Copiar» con dos opciones, formato Discord o formato web (texto limpio).",
    "OIS: nuevo texto en formato Discord con los 6 pasos, para copiar desde la lista, la revisión o la vista web.",
    "Supervisores: las secciones quedan ordenadas de la A a la Z según el nombre que se ve.",
    "Entrevistas rediseñadas: panel con avance, contadores que filtran y reparto por rama; tarjetas por agente con estado rápido y divisiones; ficha completa en una ventana con estado, rama, divisiones, respuestas, notas, vista previa y «Revisar».",
  ] },
  { v: "3.0.5", f: "14/11/2026", t: "Patrullas en una sola sección · botón Revisar · entrevistas para Discord", items: [
    "Supervisores › Patrullas: «Revisión de patrullas» y «Registro de patrullas» ahora son dos pestañas de la misma sección.",
    "Checklist del maletero rediseñado: cada elemento con contador (− / +), y marca OK, «Falta N» o «N de más» (ej: 1 cargador de más). El excedente queda anotado en el resumen y en el registro.",
    "Botón «Revisar» en todos los textos para copiar: rojo si falta algo (y dice qué), amarillo si quedó algo pendiente o con el ejemplo sin cambiar, verde si está todo bien.",
    "Entrevistas: interfaz nueva, divisiones a las que pertenece (salen solas del roster y se pueden sumar) y a las que quiere entrar, respuestas cortas a cada pregunta y «Copiar para Discord» con todo prolijo.",
    "Pérdida de arma: cada informe también queda en Informes (con número, estado e historial). Los que ya estaban se pasan solos.",
    "Historial de informes con diseño nuevo: expediente con número y estado, resumen, pestañas (informe, involucrados, pruebas y vehículos, historial por día).",
    "Supervisores más compacto: tarjetas y cuadros de texto sin tanto espacio vacío.",
  ] },
  { v: "3.0.4", f: "14/11/2026", t: "Informes como expediente · ventanas nuevas · condecoraciones con descripción", items: [
    "Informes · Historial con estilo MDT: lista a la izquierda, el informe en el centro y los detalles a la derecha (número, fechas, creador, ubicación, civiles, agentes, vehículos, pruebas y cargos).",
    "Estado de cada informe: Abierto, En investigación, Pendiente de revisar, Cerrado o Archivado (cerrar y archivar, de sargento para arriba). Etiquetas editables.",
    "Historial de cada informe: quién lo registró, lo abrió, lo editó (y qué cambió), le cambió el estado o las etiquetas.",
    "Autocompletado con informes anteriores: ID del sujeto, modelo y color por matrícula, unidad de cada agente, lugares y evidencias más usados, y «Usar como base» para empezar uno nuevo desde otro.",
    "Ventanas rediseñadas: toman el fondo y los bordes del tema que uses (claro u oscuro) y el color de acento.",
    "Condecoraciones: cada una muestra qué reconoce y cómo se gana; la ventana para otorgar quedó más prolija.",
  ] },
  { v: "3.0.3", f: "14/11/2026", t: "Robos: CK y vista compartida", items: [
    "Artículos de robos: el homicidio doloso (119.1) va solo cuando hay CK de un jugador (y 119.17 si es a un agente), nunca por un NPC. «Con disparos» suma el atentado agravado contra agentes.",
    "Robos · Invitar a ver: six crea links de solo lectura (1 a 30 días) para que otra persona vea el Catálogo y los Artículos con su tema, sin iniciar sesión y sin el Excel. Se ven las vistas y se revocan al instante.",
  ] },
  { v: "3.0.2", f: "14/11/2026", t: "Robos: catálogo, articulado y Excel", items: [
    "Página de six: nueva pestaña Robos con el catálogo, los artículos de cada robo y la exportación a Excel.",
    "Artículos para los robos: tentativa, consumado y con disparos, más lo que se suma según lo que pase (rehenes, armas, hackeo, explosivos, grupo, huida).",
    "Filtro por tipo de robo con el código policial aparte de la cantidad.",
    "Exportar a Excel: hojas Robos, Articulado y Artículos, con colores por tipo, filtros y encabezado fijo.",
  ] },
  { v: "3.0.1", f: "13/11/2026", t: "Versiones de los informes OIS", items: [
    "Cada vez que se guarda algo en la terminal queda una versión en el servidor. En el OIS: Revisar → Versiones muestra qué cambió en cada una, la deja ver completa y permite restaurarla.",
    "«Recuperar borrados» (Teniente o superior) lista los expedientes OIS que se borraron y permite traerlos de vuelta.",
    "Al editar un OIS solo se guardan los campos que tocaste: si otra persona lo cambió mientras lo tenías abierto, no se pisan sus datos.",
    "Los OIS cargados con el formato anterior muestran otra vez cargadores, balas, dotación y otra arma, que habían dejado de verse.",
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
