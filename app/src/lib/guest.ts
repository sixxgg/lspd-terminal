/* secciones que six puede abrirle a un invitado (las mismas que acepta el servidor en lib/guest.js) */
export const GUEST_OPTS: [string, string, string][] = [
  ["ini/home", "Inicio", "Portada con la galería, eventos públicos y novedades (va siempre)"],
  ["cal/cal", "Calendario", "Eventos para todo el departamento"],
  ["ofi/inf", "Informes", "Informes policiales registrados (solo para leer)"],
  ["age/prof", "Agentes", "Planilla del departamento por rango"],
  ["leg/ley", "Legal", "Código penal e infracciones"],
  ["ofi/cod", "Códigos", "Códigos radiales, 10-X y alfabeto NATO"],
  ["ofi/rad", "Radio", "Armado del 10.03 (no se guarda nada)"],
];
