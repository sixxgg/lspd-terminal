/* Novedades: el registro de cambios en cinco etapas (del .bat a hoy) y la primera versión web (v0.3) en grande, en solo lectura */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileCode2, Globe, History, Maximize2, MonitorSmartphone, Rocket, Sparkles, X, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { LS, ME_ROLES } from "@/lib/store";
import { useMe } from "@/lib/me";
import { DEPT } from "@/lib/dept";
import { DET, lvl } from "@/lib/domain";
import { rosterDivs } from "@/lib/units";
import { cn } from "@/lib/cn";

export const APP_VERSION = "5.6.2";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

/* cada entrada es una etapa (de la .1 a la siguiente versión redonda): v = hasta, from = desde, d = resumen, sub = las versiones que tuvo; hero = la primera, en grande */
type Rel = { v: string; from: string; f: string; t: string; d?: string; hero?: boolean; items: string[]; g?: [string, string[]][]; sub?: [string, string][] };
/* a quién le toca cada novedad: «[tag] texto» en un ítem o en el título de un grupo. Sin tag, la ven todos.
   lspd / lssd / sahp: ese departamento · sup: Sargento para arriba · mandos: Detectives y Sargento II para arriba · six: solo six ·
   div:Nombre: los de esa división. Varios separados por coma (alcanza con uno); «a+b» pide los dos. six ve todo. */
type Who = { n: string; r: string; dept?: string };
const TAG = /^\[([^\]]+)\]\s*/;
function seeTag(tag: string, me: Who): boolean {
  if (ME_ROLES.six) return true;
  return tag.split(",").some(t => t.trim().split("+").every(x => { x = x.trim();
    if (x === "six") return false;
    if (x === "lspd" || x === "lssd" || x === "sahp") return (me.dept || "lspd") === x;
    if (x === "sup") return lvl(me.r) >= 6;
    if (x === "mandos") return lvl(me.r) >= 7 || DET.includes(me.r);
    if (x.startsWith("div:")) return !!ME_ROLES.admin || rosterDivs(me.n).includes(x.slice(4));
    return true; }));
}
const clean = (L: string[], me: Who) => L.filter(x => { const m = TAG.exec(x); return !m || seeTag(m[1], me); }).map(x => x.replace(TAG, ""));
/* el registro tal como lo ve esta persona (versiones sin nada para ella, fuera) */
export function logFor(me: Who): Rel[] {
  return LOG.map(r => ({ ...r, items: clean(r.items, me), g: (r.g || []).filter(([h]) => { const m = TAG.exec(h); return !m || seeTag(m[1], me); }).map(([h, L]) => [h.replace(TAG, ""), clean(L, me)] as [string, string[]]).filter(([, L]) => L.length) }))
    .filter(r => r.items.length || r.g.length);
}
const LOG: Rel[] = [
  { v: "5.0", from: "4.1", f: "18/11/2026", t: "Tres departamentos, una sola terminal", d: "El LSSD y la SAHP con su propia terminal y sus datos. Perfiles, Legal, Códigos y Pizarra, compartidos por los tres.", items: [], g: [
    ["Perfiles en los tres departamentos", [
      "Un solo perfil por persona para el LSPD, el LSSD y la SAHP: lo que cambies (foto, portada, nickname, «acerca de») se ve igual desde los tres.",
      "Seguir a alguien de otro departamento: si sos de la SAHP podés seguir a alguien del LSPD o del LSSD, y al revés. Seguidores, seguidos, comentarios, visitas y sugerencias juntan a los tres.",
      "Cada perfil muestra de qué departamento es, con su escudo. El ID de cuenta es uno solo para toda la terminal (orden de registro).",
      "Verificado como en X: tilde azul (verificado), dorada (staff de la terminal) y gris (cargo oficial). La da six desde el mismo perfil.",
      "Los logros se ven igual desde cualquier departamento; el legajo policial (divisiones, condecoraciones y carrera) queda en el departamento de cada uno.",
    ]],
    ["Para todos", [
      "[lspd] Códigos › Procedimientos (desde Oficial III): estupefacientes y dinero sin declarar, con cada artículo, cuándo se aplica y las indicaciones para el agente.",
      "Pizarra: contornos continuos, a trazos, de puntos o trazo y punto; la línea marca y el relleno queda suave. Nuevo «Banner» (B) para títulos, y la lista de pizarras más compacta.",
      "Las secciones que piden más rango ya no aparecen en rojo: quedan en un solo chip discreto que dice cuáles son y desde qué rango.",
      "[div:Professional Standards Bureau] PSB: el número de caso suma un sufijo opcional. CF-26-001600 es el acusado; CF-26-001600-1, -2… son los testigos o los demás acusados del mismo hecho.",
      "Notificaciones nuevas: bajan dentro de la tablet como tarjetas del sistema, cada una con su app (Perfil, Calendario, PSB, Logros…), la hora y su ícono.",
      "Pantallas más compactas: avisos de «vacío» más chicos y sin textos repetidos en Reuniones y Logs.",
      "Los banners de las divisiones toman el color del logo nuevo apenas se cambia (también con logos de Fivemanager).",
      "Novedades rediseñadas: una etapa por vez, con los cambios agrupados en tarjetas, y la v0.3 que se abre a pantalla completa dentro de la tablet.",
      "Divisiones: todas en un solo renglón con el nombre completo, en los tres departamentos (si la pantalla es angosta, la barra se desliza).",
      "Notificaciones: la campanita ahora abre un panel que baja desde arriba de la pantalla, igual en los tres departamentos.",
      "Novedades: cada uno ve solo lo que le toca (su departamento, sus divisiones y, si es supervisor, lo de Supervisores).",
      "Feedback: ya no hay que elegir dónde pasó (se cuenta en el texto).",
      "La terminal consulta menos al servidor cuando nadie la está usando: más liviana y sin gastar de más.",
    ]],
    ["[six] Panel de six e imágenes", [
      "LSSD y SAHP: con «Acceso a áreas» (Administración › Accesos) cualquier cuenta creada del departamento ve Supervisores, Capitanía y Jefatura completas, con los datos de su propio departamento.",
      "Administración › Accesos: «Acceso a áreas» para que una cuenta vea Supervisores, Capitanía o Jefatura sin tener el rango (se elige la cuenta y listo).",
      "Panel de six y de Anita › Armas: todo el weapons.lua (armas, accesorios y munición) para buscar y copiar cada ítem, varios juntos o el archivo entero.",
      "Panel de six › Sitio web: la página del LSPD (con la Metropolitan Division) adentro de la terminal, con el roster, las fotos y los logos de las divisiones de la terminal. Lo que edites se guarda solo.",
      "Administración › Marca: cada departamento tiene sus propios logos, fondos (detrás de la tablet y del ingreso), favicon, fotos por defecto y portada. Se cambia de departamento con los botones de arriba de Imágenes.",
      "El ingreso y la pantalla de carga usan el escudo y el fondo del departamento elegido. Si un departamento todavía no tiene fondo propio, usa el del LSPD.",
    ]],
["[lssd,sahp] Tu departamento", [
      "Tu terminal tiene las mismas secciones que el LSPD (Inicio, Agentes, Calendario, Informes, Legal, Pizarra, Radio, Códigos y más), con los datos de tu departamento.",
      "Legal, Códigos y la Pizarra son los mismos para los tres departamentos. Radio usa el canal interno de tu departamento (/rlssd o /rsahp) y /rsapd para todos.",
      "Temas propios con modo oscuro y claro: el LSSD sobre verdes con dorado y la SAHP en caqui, asfalto y azul estatal.",
      "Pantallas de carga y avisos con el nombre y el escudo de tu departamento.",
    ]],
    ["[lssd] Divisiones del LSSD", [
      "Special Enforcement Bureau, Aero Bureau, Canine Service Detail, Crisis Negotiation Unit, Detective Division, Training Bureau, Sheriff Information Bureau y High Speed Interception Unit, con sus subdivisiones.",
      "Cada una con Información (todo el texto de Eleven, adentro de la terminal), Roster, Calendario, Documentación, Instrucciones, Uniformidad y Administración, y su escudo.",
      "Logros nuevos: «Miembro de la LSSD» y «Jefatura LSSD».",
    ]],
    ["[lspd+sup] Supervisores", [
      "Votaciones: al abrir una propuesta se elige en cuántas horas vence. Al vencer se cierra sola por mayoría y a todos los Sargentos les llega «Ascenso aceptado: … ya se puede ascender».",
      "Robos: el «Asalto al Vanilla Unicorn» ahora es el «Asalto al Remolcador» (mismo robo, otra ubicación) y hay cuatro misiones nuevas: Kilómetro 0 (persecución para crew), Clásico y renovado, High Class y Null Operation.",
    ]],
    ["[six] Panel de six", [
      "Calendario con los tres departamentos juntos, la marca de cada uno y un aviso cuando dos eventos de distintos departamentos se superponen.",
      "Administración › Marca: textos y tema de cada departamento, y la lista de logos que faltan cambiar. Roster del LSSD y la SAHP desde la planilla o un CSV.",
      "Perfil (beta) para Grant Knox (CristianGV367) con sus logros, uno oculto («Legendario mítico») y el primer logro «Malicioso» en rojo.",
      "Si la base de datos se queda sin la cuota del mes, la terminal lo avisa con un mensaje claro en vez de «Error del servidor».",
    ]],
    ["Camino al LSSD (4.2 – 4.2.2)", [
      "Ingreso y registro con el número de placa: sirve si tu nombre es doble, se repite o es difícil de escribir. También se puede seguir entrando con el correo o el nombre.",
      "La pantalla de ingreso tiene selector de departamento: LSPD, LSSD (Los Santos Sheriff's Department) y SAHP (próximamente). El LSSD entra con su usuario OOC, nombre o placa.",
      "[lssd] Terminal del LSSD (en construcción): inicio, roster del Sheriff por rango y las secciones Legal, Supervisores, Capitanía, Jefatura y Detectives en preparación. Las cuentas del LSSD no ven nada del LSPD.",
      "[six] Consulta usa el Manual del Novato completo (132 páginas pasadas a texto).",
      "Divisiones: los nombres ya no se cortan en la barra de secciones (van abreviados; el nombre completo aparece al pasar el mouse).",
      "[lssd] LSSD: cada rango tiene su insignia (estrellas para el Executive Staff, hoja de roble, barras de Capitán y Teniente, galones de Sargento y Ayudantes) en el roster, el inicio y el registro.",
      "[six] El escudo del LSSD (y el de la SAHP) se cambia desde Administración › Marca.",
      "[six] Los códigos de invitación son por departamento: LSPD-, LSSD- o SAHP-. Cada uno solo sirve para registrarse en el suyo.",
      "[lssd] Si una persona tiene dos personajes en el Sheriff, cada uno tiene su cuenta: se entra con la placa o el nombre del personaje.",
      "[lssd] LSSD › Divisiones: SEB, Aero Bureau, Canine Service Detail, CNU y Detective Division, más Training Bureau, Sheriff Information Bureau y HSIU, con descripción, mandos y subunidades.",
      "[lssd] El roster del Sheriff suma a los Deputy Sheriff Trainees y a los perros del K-9 con su handler.",
      "[lssd] Los rangos del LSSD se leen en inglés, como en la planilla. Insignias: Sheriff 5 estrellas, Undersheriff 4, Assistant Sheriff 3, Division Chief 2 y Area Commander 1.",
      "Divisiones del LSPD: la barra muestra los nombres completos (Professional Standards Bureau, Recruitment and Training Division…) y pasa a dos renglones si no entran.",
    ]],
    ["Consulta y buscadores (4.1)", [
      "[six] Consulta (en prueba): preguntás algo del Manual del Novato y responde con el texto del manual, marcando la sección de donde sale. Incluye el manual completo con índice y buscador.",
      "[six] Consulta la ven six y quienes él habilite en Administración › Accesos y administradores.",
      "Buscadores de agentes, delitos y sugerencias: la lista ahora se abre por encima de todo (modales, tarjetas y menús) y, si no entra abajo, se abre hacia arriba.",
      "Al recargar la página quedás donde estabas, también dentro del panel de six (sin repetir la intro).",
    ]],
    ["Más liviana", [
      "La base de datos trabaja mucho menos: la sincronización solo trae lo nuevo, la carga inicial pide solo lo que cambió desde tu copia guardada y, sin actividad, se consulta cada vez menos.",
      "El examen de la METRO, los avisos de feedback y la pizarra en vivo consultan menos seguido y traen solo lo justo.",
      "Actualizada por dentro: React 19, Vite 8 y los íconos nuevos de Lucide.",
    ]],
  ], sub: [["4.1", "Consulta, comunicados y buscadores"], ["4.2", "LSSD, ingreso con placa y manual"], ["4.2.1", "Insignias, escudo y códigos del LSSD"], ["4.2.2", "Divisiones y roster completo del LSSD"], ["4.3", "Mismas secciones en los tres departamentos"], ["5.0.0", "Robos, logros y notificaciones desde arriba"], ["5.0.1", "Perfiles en los tres departamentos e imágenes por departamento"], ["5.0.2", "Notificaciones nuevas y Sitio web en el panel de six"], ["5.0.3", "Números de caso de la PSB con testigos"], ["5.0.4", "Acceso a áreas, Pizarra con contornos y banners, Armas"], ["5.0.5", "Supervisores, Capitanía y Jefatura en el LSSD y la SAHP"], ["5.0.6", "Procedimiento de estupefacientes y dinero sin declarar"], ["5.0.7", "Examen práctico de METRO"], ["5.0.8", "Escala de notas 0 a 10 con colores"], ["5.2.5", "Examen práctico de METRO en equipo: guardar, en vivo y callsigns"], ["5.2.6", "METRO › Callsign: gestión, historial y comunicado"], ["5.2.7", "Callsigns del SWAT (Pelotón D) y feedback por artículo sin imputar"], ["5.2.8", "Callsigns desde el examen práctico, ascensos, retiros y reservas"], ["5.2.9", "Pausa por ausencia en el examen y comunicados con el formato de la METRO"], ["5.3.0", "Examen de la METRO aparte de la academia, con la Convocatoria 0 de archivo"], ["5.3.1", "Distintivos de Team Leader, Instructor y Líder de Pelotón; METRO más fluida"], ["5.4.0", "LSSD: expedientes personales, Supervisores, Capitanía, Jefatura y administración del departamento"], ["5.4.1", "Jefatura ve también su propio expediente"], ["5.4.2", "Buscador de agentes en todos lados y terminal más liviana"], ["5.5.0", "LSSD: eventos en el Calendario, portada de Jefatura, divisiones con cargos, feedback con seguimiento, Uso de Fuerza, Robos para todos, Pizarra por departamento, condecoraciones compartidas y rango actual en el 10-80"], ["5.6.0", "Pestaña Oficiales (Informes, Códigos y Procedimientos), sección 3303 en la PSB, METRO con Exámenes y Entrevistas (líder de pelotón), temas nuevos y todo de la A a la Z"], ["5.6.1", "Estilo clasic (lo da la administración), Radio en Oficiales, pestañas nuevas, San Andreas Training Division y subdivisiones de la A a la Z"], ["5.6.2", "Pestañas en una sola fila, Procedimientos renovado, comunicado de plazas editable, convocatorias que se renombran y se borran, examen online más claro y logo de la SATD"]] },
  { v: "4.0", from: "3.1", f: "13/11/2026 – 18/11/2026", t: "Inicio nuevo, Radio, Reuniones y Galería", d: "Inicio con portada, buscador Ctrl + K, borradores automáticos, Radio, Reuniones colaborativas y Galería.", items: [], g: [
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
      "Ctrl + K abre un buscador tipo consola: secciones, divisiones, informes, agentes, eventos, robos y artículos de la ley, todo con el teclado.",
      "Borradores automáticos: lo que escribís en Informes, Feedback, Radio, Supervisores y Capitanía se guarda solo en el navegador; si recargás o cambiás de sección sin querer, al volver se completa de nuevo (con opción de descartar).",
      "Botón «Revisar» en todos los textos para copiar: rojo si falta algo, amarillo si quedó algo pendiente, verde si está bien. Ahora también marca faltas de ortografía comunes y las corrige con un toque.",
      "«Copiar» con dos opciones en informes, OIS, pérdida de arma, feedback, entrevistas y 10-80: formato Discord o formato web.",
    ]],
    ["[sup] Supervisores › Reuniones", [
      "Reuniones como documento abierto (como un incidente de la tablet): cada uno escribe o pega lo que quiera con formato (títulos, listas, negritas, citas) y queda firmado con su nombre y la hora.",
      "Plantillas: Briefing, Reunión de sargentos, Reunión PO III y III+ o libre, con fecha y hora. Temas como etiquetas para filtrar, temas nuevos al vuelo y edición de temas para quien la abre.",
      "Encabezan (la Capitanía, obligatoria, y la Assistant Watch Commander) y Presentes, como tags con foto y cargo. Acta fijada arriba, cerrar y reabrir, y el documento completo para copiar.",
      "Al abrirse llega la notificación (que abre esa reunión) y se agrega sola al calendario; si se borra la reunión, desaparece del calendario.",
    ]],
    ["[sup] Supervisores › 10-80", [
      "Pestañas «Nueva citación» e «Historial de 10-80»: se cita a uno o varios agentes (mensaje de radio en plural), se elige quién cita y se guarda en el historial.",
      "Justificación formal en formato Discord o web, con lugar, motivo predictivo, asistencia por agente, medidas genéricas y «Revisar redacción».",
      "Etiquetas (Bronca, Ascenso, Felicitación, Disciplinario…) visibles y para filtrar. El historial de la PSB queda aparte y solo lo ven sus miembros.",
    ]],
    ["[sup] Supervisores › Entrevistas, Patrullas y Robos", [
      "Entrevistas rediseñadas: lista por rango, ficha compacta con «Guardar», preguntas según el rango con respuestas automáticas y quién entrevistó.",
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
    ["Después de la 4.0 (4.0.1 – 4.0.8)", [
      "[six] Links de invitado: entran sin cuenta, solo a las secciones que elegís (Inicio, Calendario, Informes, Agentes, Legal, Códigos o Radio) y en solo lectura.",
      "[six] El invitado ve un aviso «Invitado · solo lectura» con el botón para iniciar sesión, una tarjeta con lo que puede mirar y hasta cuándo vence el link; en Informes solo el historial.",
      "[six] Cada link se puede copiar, ver cuántas veces se abrió y revocar al instante. El servidor solo le manda los datos de esas secciones.",
      "Inicio: tocar la foto de la portada ya no la abre en pantalla completa; es solo visual.",
      "Menú de arriba solo con íconos: la sección en la que estás muestra su nombre y el resto lo dice al pasar el mouse.",
      "Fuera del encabezado el botón «Buscar» (Ctrl + K sigue abriendo el buscador), el «Sincronizado» (solo aparece si se está guardando o no hay conexión) y el nombre y rango al lado de tu foto.",
      "[div:Professional Standards Bureau] Citaciones de la PSB: se puede citar a cualquier agente sin importar el rango (antes solo a rangos inferiores, como en Supervisores).",
      "[div:Professional Standards Bureau] En «Citan» de la PSB aparecen todos sus miembros, no solo supervisores.",
      "[div:Professional Standards Bureau] PSB › Notificación: cualquier miembro puede notificar a cualquier agente, sin importar el rango.",
      "[sup] Supervisores › 10-80: los Sargentos II ya no citan a Sargentos I; la única que puede es la Assistant Watch Commander, Evelyn Molina.",
      "[sup] Supervisores › Reuniones: botón «Copiar link» en cada reunión. Lo pegás en Discord o donde sea y al abrirlo te lleva directo a esa reunión (si no iniciaste sesión, primero te pide entrar).",
      "[mandos] Pizarra › Mandos: pizarras propias de la terminal, destacadas arriba de todo con borde dorado. Solo las ven y editan Detectives y de Sargento II para arriba (al resto ni siquiera le llegan).",
      "[mandos] Primera pizarra de Mandos: «Infraestructura San Andreas». Se crean más eligiendo «Mandos» al lado de «Nueva pizarra».",
      "Se quitó el tablero de Miro embebido.",
      "[div:K-9 Division] K-9 › Fichas «Oficial y canino»: guía desde el roster, certificación automática, fotos de los dos, salud, vacunas y temperamento.",
      "[div:K-9 Division] «Ver ficha» muestra el documento oficial de la división y lo descarga como imagen PNG.",
      "[mandos] Pizarra › Mandos › «Infraestructura San Andreas»: el mapa de Miro con sellos y leyenda (subestaciones, centrales, HVT y zonas calientes), editable.",
    ]],
  ], sub: [["3.0.1", "Versiones y recuperar borrados en OIS"], ["3.0.2", "Robos en el panel de six"], ["3.0.3", "CK en robos y links de solo lectura"], ["3.0.4", "Informes como expediente"], ["3.0.5", "Patrullas en una sección"], ["3.0.6", "Copiar Discord o web"], ["3.4", "Robos oficial en Supervisores"], ["3.4.2", "Entrevistas compactas"], ["3.5", "Inicio estilo foro y bajas del roster"], ["3.5.3", "Entrevistas sin cortes"], ["3.6", "10-80 con historial"], ["3.6.2", "10-80 con varios citados"], ["3.7", "Radio y reuniones"], ["3.7.5", "Temas de reuniones"], ["3.8", "Reuniones como documento"], ["3.8.1", "Reuniones en el calendario"], ["3.9", "Galería privada"], ["3.9.4", "Inicio sin subpestañas"], ["4.0", "Terminal de Mando 4.0"], ["4.0.1", "Links de invitado"], ["4.0.2", "Menú solo con íconos"], ["4.0.4", "PSB a cualquier rango"], ["4.0.5", "Link de reuniones"], ["4.0.7", "Pizarras de Mandos"], ["4.0.8", "Fichas K-9 e Infraestructura"]] },
  { v: "3.0", from: "2.1", f: "12/11/2026 – 13/11/2026", t: "Divisiones de punta a punta", d: "Cada división pasa a ser un espacio propio y protegido. Llegan el Calendario, el OIS y el examen en línea de la METRO.", items: [], g: [
    ["Divisiones", [
      "Cada división la ve solo quien está en su roster y lo controla el servidor; la coordinación elige qué pestañas ven los miembros y es la única que edita su roster.",
      "Rosters rediseñados en todas las divisiones y subdivisiones (SWAT, Bomb Squad, CNT, UDU, Detective Bureau, HSIU, RTD, ASB…): roles con color y orden, indicativos y especialidades.",
      "Todas con Instrucciones, Uniformidad por rango y género, Calendario y Administración.",
      "ASB: Administrativos, Entrevistas, Ideas de eventos y publicaciones, Documentación, Tareas, Convenios y Subdivisiones. MDSO con licencias de drone. HSIU con Registro TOM.",
      "PSB de punta a punta: notificación, elevación, aprobación SAJD, resolución, votaciones y expedientes.",
    ]],
    ["[div:Metropolitan Division] Metropolitan Division", [
      "Armas (coordinación): las armas reglamentarias por tipo, con munición, accesorios por ranura, autorización y «Copiar kit» con comandos, lista de ítems o texto.",
      "Entrevista de instructor por convocatorias (C1…) con postulantes, respuestas en solo lectura y preguntas revisadas.",
      "Examen escrito en línea: una pregunta por vez, reloj, corrección en el servidor y strikes por salir de la pestaña o hacer capturas (3 desaprueban).",
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
    ]]
  ], sub: [["2.1", "Rosters con roles en todas las divisiones"], ["2.1.1", "Datos de divisiones protegidos"], ["2.3", "Rosters unificados"], ["2.3.1", "Rosters solo para su coordinación"], ["2.3.3", "Pantalla de actualización"], ["2.3.4", "Restablecer contraseñas"], ["2.3.5", "Calendario, expediente, condecoraciones y OIS"], ["2.5", "Menú nuevo, idioma y Feedback renovado"], ["2.5.3", "Avisos desde arriba"], ["2.5.4", "Armas de la METRO"], ["2.5.5", "Convocatorias METRO"], ["2.5.6", "OIS con varias armas"], ["2.5.7", "Examen escrito de la METRO"], ["2.5.8", "Examen rediseñado"], ["3.0", "OIS remitido a la FID"]] },
  { v: "2.0", from: "1.1", f: "07/11/2026 – 11/11/2026", t: "Comunicados, perfiles y Pizarra", d: "Comunicados con asistente, Sargentos, informes completos, el panel de six, notificaciones, los primeros perfiles y la Pizarra en vivo.", items: [], g: [
    ["Comunicados, condecoraciones y Sargentos", [
      "Comunicados con asistente: tipo, variante de diseño, firma, autor, mención y fechas, con plantillas para el A.S.D y la UDU.",
      "Condecoraciones para los agentes y el área Sargentos: examen, entrevista y lista de elegibles con el formato de la planilla (convocatorias C1/C2, nota /22 y /100).",
      "Intro interactiva con huella, pantalla de carga policial al ingresar, 19 temas nuevos y favicon editable.",
      "Selector de imágenes con tamaños y pesos recomendados y compresión automática.",
    ]],
    ["Informes", [
      "Unidad e indicativo por interviniente, Incident Commander como marca aparte y agentes que se ordenan arrastrándolos.",
      "Sección de vehículos con categoría, marca y modelo encadenados (GTA V y pack ONX), robado o no robado y la relación del sujeto con el vehículo.",
      "Agente que procesa e incautaciones dentro de cada sujeto, rangos abreviados como en la radio (PO III., Det. II., Sgt. I.) y secciones activables.",
      "Historial con filtro por agente y fechas, agrupado por día; al editar se conserva la fecha de registro.",
    ]],
    ["[sup] Supervisión y PSB", [
      "Revisión de patrullas con checklist de equipamiento (OK, requerido, actual, faltante, observaciones), patrullas ONX con inspector y registro de patrullas desde cero.",
      "PSB: Notice to Correct Deficiencies como propuesta, votaciones editables, historial de expedientes y comunicados, bloque resolutivo y Aprobación SAJD.",
      "Registro de huellas con las capturas en el historial.",
      "Capitanía para Sargentos II con las tareas que no les tocan bloqueadas.",
    ]],
    ["Terminal (1.5 – 1.8)", [
      "Agentes como área propia con buscador y autocompletado, y Novedades con el registro de cambios y la v0.3.",
      "Insignia NEW con llama, barra de tablet estilo consola (ubicación, latencia, batería, señal, nodo y cifrado) y Hora para Discord con marcas de tiempo.",
      "Feedback con aviso a six y al canal de Discord, estados, respuesta y notificaciones para quien lo manda.",
      "Centro de notificaciones desplegable y Mi perfil (BETA).",
    ]],
    ["[six] Panel privado de six", [
      "Acceso oculto con consola, interfaz propia de neón y quiebre de la MDT; gestión de staff, comunicados y respuestas de ilícitos con los datos protegidos en el servidor.",
      "Sanciones de banda y catálogo de robos con foto 4K, filas del Excel, tags de policía e íconos de armas.",
    ]],
    ["Pizarra, divisiones y perfiles (1.9 – 2.0)", [
      "Pizarra estilo Miro: notas, formas, conectores, imágenes, goma y cursores de los demás en vivo, con enlace temporal para compartir.",
      "Instrucciones por división, METRO con roster y exámenes de instructor, perros de la K-9 y flujo completo de la PSB.",
      "Códigos radiales con Lectura de derechos y Rotura de negociaciones.",
      "Registro con invitación, códigos de recuperación y panel de Anita.",
      "Perfiles estilo comunidad: comentarios, ID de cuenta, logros (los míticos holográficos), seguidores y sugerencias, nickname OOC y foto o GIF propio.",
      "Uniformidad por rango y género, links temporales de solo lectura, «Ver como» para la administración y divisiones visibles solo para sus miembros.",
      "v2.0: pestañas de división en una sola fila, con Administración aparte.",
    ]],
  ], sub: [["1.0.x", "Comunicados, condecoraciones, Sargentos, informes con vehículos y PSB"], ["1.5", "Agentes, Novedades y barra de tablet"], ["1.6", "Feedback, huellas y patrullas ONX"], ["1.7", "Centro de notificaciones"], ["1.8", "Mi perfil (BETA)"], ["1.9", "Pizarra, METRO y flujo de la PSB"], ["1.9.4", "Invitaciones y pizarra en vivo"], ["1.9.7", "Perfiles con ID y logros"], ["1.9.12", "Uniformidad y links temporales"], ["1.9.15", "Divisiones solo para miembros"], ["2.0", "Pestañas de división en una fila"]] },
  { v: "1.0", from: "0.0", f: "Octubre 2026 – 07/11/2026", t: "Del .bat a la web", hero: true, d: "Empezó como un .bat que armaba el contrato de ascenso, pasó a ser un programa con forma de tablet y en octubre se convirtió en esta página.", items: [], g: [
    ["El .bat y el .exe", [
      "v0.0 · do_contrato.bat: generaba el /me y el /do del contrato de ascenso, firmado por el jefe James Hopper.",
      "Ingreso como Ryan Westbrook o Evelyn Molina, roster del LSPD desde un CSV, fondo estilo LSPD y logo editable.",
      "Pestañas Ascensos (agente filtrado por rango y placa automática), 10-80 (Watch Commander, Despacho de sargentos, Despacho de la capitana y Conference Room) y PSB (correo de notificación con caso CF y faltas por gravedad).",
      "Áreas Supervisión, Capitanía y Jefatura según el rango, modo oscuro, pantalla completa e ícono propio en la barra de tareas.",
      "Revisión de patrullas (Buffalo STX, Scout, Mary e Interceptor según el Manual del Novato) y votaciones de ascensos y descensos con debate tipo chat.",
      "LSPD-Terminal.exe: programa con forma de tablet y borde redondeado, planilla de agentes en tarjetas y perfiles grandes con foto ajustable.",
      "v1.4.2 del .exe: barra fija en la revisión con Guardar y Descartar, fotos del maletero y de los vehículos y actualización automática desde GitHub.",
      "Numeración reiniciada: v0.1 como versión base y v0.2 con pantalla de Inicio (saludo, hora, indicadores y secciones por área) y barra flotante de secciones.",
    ]],
    ["La página web (0.3 – 0.7)", [
      "v0.3: la terminal pasa a ser una página en Vercel con base de datos compartida: todos ven y cargan lo mismo.",
      "Administración con logo, favicon, fondos e íconos, y gestión de administradores.",
      "Alerta Táctica con anuncios de Discord, pedido de bodycam, robo de armamento estatal y validaciones en rojo.",
      "Temas (entre ellos el tema Eleven), punteros, galería de imágenes, efecto CRT y VHS, insignias de rango con color y en HD.",
      "Entrevista personal en tabla con colores por estado, registro de patrullas con la planilla de Google Sheets y trato automático en ascensos.",
      "Carga estilo terminal policial, consola de ingreso y actualización automática sin Ctrl + F5.",
    ]],
    ["Divisiones, PSB e informes (0.7.7 – 0.9.7)", [
      "Área Divisiones: Recruitment and Training Division (entrevista de aspirantes, CitizenID y casos), Detective Bureau con la HTCU y logos de cada división con sus colores.",
      "Notificación de la PSB según el procedimiento, en formato Discord; división PSB con roster, elevación, justicia, resolución y Notice to Correct Deficiencies.",
      "Informes policiales con código penal, Air Support Division (roster, vuelos y examen EVAL-CRIT-EMG-05) y K-9 Division.",
      "Pérdida de armamento y Feedback de incidentes en Supervisión.",
    ]],
    ["Versión nueva y la 1.0", [
      "Toda la terminal migrada a la versión nueva (React): supervisión, divisiones, informes, capitanía, jefatura y administración.",
      "Apariencia completa: temas, acento, efectos de pantalla, marco de tablet, neón, fuentes tácticas y punteros. Menú por áreas arriba y banners de división con el color del escudo.",
      "Legal con el catálogo oficial completo: Código Penal (Títulos I a XXIV) y leyes 25 a 29/2024 por capítulo y gravedad, favoritos y búsqueda por artículo. Mención especial a su autor.",
      "v1.0 (07/11): la versión nueva pasa a ser la principal, con ingreso policial con huella, 37 temas y menú en una sola línea con íconos.",
    ]],
  ], sub: [["0.0", ".bat do_contrato"], ["1.4.2", "LSPD-Terminal.exe"], ["0.1", "Versión base"], ["0.2", "Inicio y barra de secciones"], ["0.3", "Primera versión web"], ["0.4", "Panel de administración"], ["0.5", "Administradores"], ["0.6", "Alerta Táctica y temas"], ["0.6.9", "Entrevista personal y CRT"], ["0.7", "Carga estilo terminal"], ["0.7.7", "Área Divisiones y RTD"], ["0.7.12", "Colores de división"], ["0.8", "Notificación de la PSB"], ["0.8.3", "Informes y A.S.D"], ["0.8.6", "K-9 Division"], ["0.8.9", "División PSB"], ["0.9", "Versión nueva en React"], ["0.9.7", "Feedback de incidentes"], ["1.0", "La nueva pasa a ser la principal"]] },
];

/* la última versión, para el inicio */
export const latest = (me: Who) => logFor(me)[0] || LOG[0];
/* ---------- vista ---------- */
const STEPS: [LucideIcon, string, string][] = [[FileCode2, ".bat", "El contrato de ascenso"], [MonitorSmartphone, ".exe", "Programa con forma de tablet"], [Globe, "Web", "Base compartida (v0.3)"], [Rocket, "1.0", "La versión nueva, principal"]];

/* la v0.3 abierta como una app más, a pantalla completa dentro de la tablet (Esc o la X la cierran) */
function V03({ onClose }: { onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const host = document.querySelector(".tab-screen") as HTMLElement | null;
  return createPortal(
    <div className={cn("z-[80] flex flex-col bg-slate-950 animate-fade-in", host ? "absolute inset-0" : "fixed inset-0")} role="dialog" aria-label="Terminal v0.3">
      <div className="flex items-center gap-3 border-b border-white/10 bg-slate-900/95 px-4 py-2 text-slate-200 backdrop-blur">
        <History className="size-4 text-brand-300" /><b className="font-display text-sm tracking-wide">TERMINAL DE MANDO · v0.3</b>
        <span className="hidden rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300 sm:inline">Modo recuerdo · solo lectura</span>
        <button onClick={onClose} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"><X className="size-3.5" />Volver a Novedades</button>
      </div>
      <iframe title="Terminal v0.3" src="/legacy/v0.3.html" className="w-full flex-1 bg-white" sandbox="allow-scripts allow-same-origin allow-forms" />
    </div>, host || document.body);
}

/* un grupo: los primeros tres puntos y el resto al tocar «ver más» */
function Group({ h, L, i }: { h: string; L: string[]; i: number }) {
  const [all, setAll] = useState(false), N = 3, vis = all ? L : L.slice(0, N);
  return (
    <div className="rise flex flex-col rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/50" style={{ ["--d" as string]: i * 50 + "ms" }}>
      <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-brand-600 dark:text-brand-300">{h || "Cambios"}<span className="rounded-md bg-brand-500/10 px-1.5 font-mono tracking-normal">{L.length}</span></p>
      <ul className="space-y-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">
        {vis.map(x => <li key={x} className="flex gap-2"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-brand-500" />{x}</li>)}
      </ul>
      {L.length > N && <button onClick={() => setAll(!all)} className="mt-auto pt-3 text-left text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">{all ? "Ver menos" : `Ver ${L.length - N} más`}</button>}
    </div>);
}

function Era({ r, cur }: { r: Rel; cur: boolean }) {
  const [v03, setV03] = useState(false);
  const groups = [...(r.items.length ? [["", r.items] as [string, string[]]] : []), ...(r.g || [])], n = groups.reduce((a, [, L]) => a + L.length, 0);
  return (
    <div key={r.v} className="animate-fade-in space-y-4">
      <Card className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--b-500)/.18),transparent_55%)]" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {cur && <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 font-bold text-orange-600 dark:text-orange-300"><Sparkles className="size-3" />Actual · v{APP_VERSION}</span>}
              {r.hero && <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 font-bold text-brand-700 dark:text-brand-300"><History className="size-3" />Los comienzos</span>}
              <span className="text-slate-400">{r.f}</span>
            </div>
            <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">{r.t}</h2>
            {r.d && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{r.d}</p>}
          </div>
          <div className="flex gap-6 lg:text-right">
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Versiones</p><p className="font-mono text-3xl font-black">{r.sub?.length || 1}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cambios</p><p className="font-mono text-3xl font-black">{n}</p></div>
          </div>
        </div>
        {r.hero && <div className="relative grid gap-3 px-6 pb-6 sm:grid-cols-4 sm:px-8">{STEPS.map(([I, t, d], i) => (
          <div key={t} className="rise flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60" style={{ ["--d" as string]: i * 90 + "ms" }}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white dark:bg-brand-500 [&>svg]:size-5"><I /></span>
            <span className="min-w-0"><b className="font-display block text-lg leading-none">{t}</b><small className="text-xs text-slate-500">{d}</small></span></div>))}</div>}
      </Card>

      {r.hero && <button onClick={() => setV03(true)} className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800">
        <div className="pointer-events-none relative h-[clamp(320px,52vh,560px)] overflow-hidden bg-slate-900">
          <iframe title="Vista previa v0.3" src="/legacy/v0.3.html" tabIndex={-1} loading="lazy" className="absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white" sandbox="allow-scripts allow-same-origin" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 p-6 text-white">
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">Modo recuerdo</p><p className="font-display text-3xl font-bold sm:text-4xl">La primera versión web · v0.3</p>
            <p className="text-sm text-white/70">Tal como se publicó en octubre. Se abre dentro de la tablet y no guarda nada.</p></div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition group-hover:scale-105"><Maximize2 className="size-4" />Abrir la v0.3</span>
        </div>
      </button>}
      {v03 && <V03 onClose={() => setV03(false)} />}

      <div className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">{groups.map(([h, L], i) => <Group key={r.v + h} h={h} L={L} i={i} />)}</div>

      {r.sub && r.sub.length > 1 && <Card className="p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Versiones de esta etapa</p>
        <ol className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">{r.sub.map(([v, t], i) => (
          <li key={v} title={t} className="relative flex w-44 shrink-0 flex-col rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/60">
            <b className="font-mono text-sm">v{v}</b><span className="line-clamp-2 text-[11.5px] leading-tight text-slate-500">{t}</span>
            {i === r.sub!.length - 1 && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-500" />}</li>))}</ol>
      </Card>}
    </div>);
}

export function Novedades() {
  const me = useMe(), L = logFor({ n: me.n, r: me.r, dept: DEPT.id }), [sel, setSel] = useState(0), r = L[sel] || L[0];
  useEffect(() => { markSeen(); }, []);
  return (
    <div className="space-y-5">
      {/* línea de tiempo: una etapa a la vez */}
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <ol className="relative flex min-w-max items-stretch gap-2">
          {L.map((x, i) => { const on = i === sel; return (
            <li key={x.v} className="flex-1">
              <button onClick={() => setSel(i)} aria-current={on ? "step" : undefined}
                className={cn("group relative w-full min-w-[9.5rem] rounded-2xl border px-4 py-3 text-left transition", on ? "border-brand-500/60 bg-brand-500/10 shadow-sm" : "border-slate-200 hover:border-brand-400/60 hover:bg-slate-100/60 dark:border-slate-800 dark:hover:bg-slate-800/40")}>
                <span className={cn("block font-mono text-lg font-black leading-none", on ? "text-brand-700 dark:text-brand-200" : "text-slate-700 dark:text-slate-200", i === 0 && "ver-fire")}>v{x.from} → v{x.v}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{x.t}</span>
                {i === 0 && <span className="absolute right-3 top-3 size-2 rounded-full bg-orange-500 shadow-[0_0_8px] shadow-orange-500" />}
              </button></li>); })}
        </ol>
      </div>
      {r && <Era key={r.v} r={r} cur={sel === 0} />}
    </div>
  );
}
