/* Examen escrito de la METRO en línea (opción múltiple). Las respuestas correctas viven solo en el servidor:
   el navegador recibe cada pregunta con sus 3 opciones mezcladas y nunca sabe cuál es la buena. */
export const MDQ = [
  { c: "Táctica y procedimientos", q: "¿Cuáles son las fases y los pasos fundamentales de una entrada táctica en un inmueble?", o: [
    "Planificación y reparto de roles, aproximación en silencio, entrada con despeje sala por sala y comunicación constante, y aseguramiento final del inmueble.",
    "Aproximación rápida para no perder la sorpresa, entrada simultánea de todo el equipo por el acceso principal y despeje de las salas en el orden en que aparezcan.",
    "Reconocimiento del perímetro, entrada encabezada por el agente de mayor rango y aseguramiento de cada sala antes de comunicar por radio la siguiente maniobra."] },
  { c: "Táctica y procedimientos", q: "¿Qué diferencia hay entre un perímetro interior y uno exterior? ¿Qué función cumple cada uno?", o: [
    "El interior contiene la amenaza y lo ocupan las unidades tácticas; el exterior controla los accesos, aleja a los civiles y organiza los apoyos.",
    "El interior aleja a los civiles y a la prensa; el exterior lo ocupan las unidades tácticas para impedir que el sospechoso huya de la zona.",
    "Los dos contienen la amenaza y solo cambia la distancia: el exterior se monta cuando el interior no alcanza para cubrir todas las salidas."] },
  { c: "Táctica y procedimientos", q: "Al llegar a una escena de alto riesgo, ¿qué información debe transmitirse por radio y en qué orden?", o: [
    "Ubicación exacta, naturaleza de la amenaza, número de sospechosos y armas, si hay heridos y qué recursos se necesitan.",
    "Indicativo, hora de llegada y número de agentes en escena; la descripción de los sospechosos, una vez resuelta la situación.",
    "Número de sospechosos y heridos primero; la ubicación exacta, solo cuando llegue el supervisor, para no saturar el canal."] },
  { c: "Armamento y tiro", q: "¿Cuáles son las normas fundamentales de seguridad en el manejo de armas de fuego que todo instructor debe conocer y transmitir?", o: [
    "Tratar toda arma como cargada, no apuntar a nada que no se quiera destruir, dedo fuera del gatillo hasta decidir disparar y conocer el blanco y lo que hay detrás.",
    "Tratar como cargada el arma que no se revisó, mantener el dedo fuera del gatillo salvo en situaciones de tensión y conocer el blanco antes de disparar.",
    "No apuntar nunca a un compañero, llevar el seguro puesto en todo momento y disparar siempre a zonas no letales para reducir el daño."] },
  { c: "Armamento y tiro", q: "¿En qué circunstancias está justificado que un agente use su arma de fuego?", o: [
    "Ante una amenaza inminente de muerte o de lesión grave para el agente o para terceros, cuando no hay un medio menos lesivo que sea eficaz.",
    "Cuando el sospechoso huye tras cometer un delito grave y desobedece la orden de alto, aunque en ese momento no represente un peligro inmediato.",
    "Ante cualquier sospechoso armado, desde el momento en que se confirma que porta un arma, aunque todavía no la esté empuñando."] },
  { c: "Armamento y tiro", q: "¿Cómo debe actuar un agente ante una interrupción o un fallo de su arma durante un enfrentamiento?", o: [
    "Buscar cobertura, intentar resolver la interrupción o pasar al arma secundaria y avisar al equipo de inmediato.",
    "Mantener la posición y resolver la interrupción en el lugar para no perder la línea de tiro; avisar al equipo al terminar.",
    "Retirarse en silencio para no delatar su posición y esperar a que un compañero cubra su sector antes de avisar."] },
  { c: "Conducción y persecución", q: "¿Qué factores debe evaluar el responsable de una persecución para decidir si la continúa o la cancela?", o: [
    "El riesgo para civiles y agentes, la gravedad del delito, el tráfico, el clima, la zona y si el sospechoso ya está identificado.",
    "La velocidad del vehículo perseguido, el tiempo que lleva la persecución y la cantidad de unidades disponibles para sumarse.",
    "Únicamente la gravedad del delito: si es grave, la persecución continúa siempre hasta detener al sospechoso."] },
  { c: "Conducción y persecución", q: "¿Cómo se reparten las funciones entre las unidades que participan en una persecución y qué responsabilidad tiene cada una?", o: [
    "La principal persigue e informa por radio, la secundaria apoya y releva, y el resto se posiciona para cortar el paso o hacer el PIT si se autoriza.",
    "La principal persigue y hace el PIT por iniciativa propia, la secundaria informa por radio y el resto se suma detrás en caravana.",
    "Todas las unidades persiguen en paralelo y la que en cada momento esté más cerca del sospechoso es la que informa por radio."] },
  { c: "Instrucción y liderazgo", q: "¿Qué estructura debería seguir una clase práctica de 30 minutos para que los conocimientos se transmitan correctamente?", o: [
    "Introducción breve con los objetivos, demostración, práctica guiada, corrección y evaluación final con un repaso.",
    "Teoría completa durante la mayor parte del tiempo y práctica libre al final, sin evaluación para no presionar a los aspirantes.",
    "Práctica directa desde el primer minuto para aprovechar el tiempo y explicación de los objetivos al cierre de la clase."] },
  { c: "Instrucción y liderazgo", q: "¿Cómo debe corregir un instructor a un aspirante delante del grupo, manteniendo su autoridad sin exponerlo ni humillarlo?", o: [
    "Con una corrección breve y concreta sobre la acción, sin juicios personales, y el resto en privado al terminar.",
    "Deteniendo la clase para explicar el error en detalle delante de todos, para que el grupo entero aprenda del caso.",
    "Sin corregir nada delante del grupo: todas las correcciones se dejan para una conversación privada al final."] },
  { c: "Instrucción y liderazgo", q: "¿Cómo debe proceder un instructor cuando detecta que otro miembro del equipo enseña contenidos contrarios al reglamento interno?", o: [
    "Sin desautorizarlo delante del grupo: lo habla con él en privado y, si persiste, lo eleva a la coordinación.",
    "Lo corrige en el momento, delante de los aspirantes, para que nadie aprenda un procedimiento incorrecto.",
    "Lo informa directamente a la coordinación, sin hablar antes con el instructor, para no generar un conflicto."] },
]; // la primera opción de cada pregunta es la correcta (se mezclan al armar cada intento)
