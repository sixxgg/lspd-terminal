/* Condecoraciones del departamento: catálogo (medallas, franjas de servicio y condecoraciones por departamento y división)
   y cintas dibujadas con CSS (barato: un solo fondo con gradientes, sin imágenes). */

export type Tab = "cond" | "med" | "fra";
export type Dev = "star" | "starw" | "oo" | "heart" | "check";
export type Decor = { k: string; t: string; c: string; tab: Tab; g: string; sec: "Departamentos" | "Divisiones"; s: [string, number][]; dev?: Dev; n?: number; d?: string; h?: string };

const C: Record<string, string> = {
  B: "#1d4ed8", W: "#f1f5f9", Y: "#f5c518", R: "#dc2626", G: "#1f7a3e", P: "#6b2fb3", K: "#18181b", O: "#566b2b", N: "#1e3a8a", Gr: "#a8adb5",
  Br: "#7a4a2a", T: "#d9b88a", LB: "#7cc4ea", M: "#7a2230", Or: "#f26b1d", DG: "#4b5058", St: "#4a5f84", LN: "#1d4f9e", Sa: "#a3876a",
};
const S = (spec: string): [string, number][] => spec.split(" ").map(x => { const [c, w] = x.split(":"); return [C[c] || c, w ? +w : 1]; });

type Raw = [string, string, string, string?, Dev?];
const mk = (tab: Tab, sec: Decor["sec"], g: string, L: Raw[]): Decor[] => L.map(([t, c, s, k, dev]) => ({ k: k || slug(t), t, c, tab, g, sec, s: S(s), dev }));
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const DECOR: Decor[] = [
  /* ---------- Medallas ---------- */
  ...mk("med", "Departamentos", "Compartidas", [
    ["Medalla al Valor", "Bravura", "B W"],
    ["Medalla por Preservación de la Vida", "Bravura", "B Y"],
    ["Medalla por Servicio Distinguido", "Servicio", "R Y G"],
    ["Medalla Policial", "Bravura", "R W"],
    ["Corazón Púrpura", "Bravura", "W:.07 P:1 W:.07"],
    ["Medalla al Servicio Meritorio", "Servicio", "Y:.35 R:.5 W:1.3 R:.5 Y:.35"],
    ["Estrella Policial", "Bravura", "B:.35 W:2 B:.35"],
    ["Medalla de Salvamento", "Bravura", "G:1 B:.35 W:.45 R:.35 G:1"],
    ["Medalla de la Comisión por Servicio Distinguido", "Servicio", "W:.5 B:.7 R:.5 B:.7 R:.5 B:.7 R:.5"],
    ["Medalla de Integridad", "Mérito", "K:1 W:.45 K:1"],
    ["Medalla de Policía Comunitaria", "Mérito", "Y:.06 P:1 Y:.06", undefined, "oo"],
    ["Medalla de Relaciones Humanas", "Mérito", "Y:.06 P:1 Y:.06", undefined, "heart"],
    ["Premio Liberty (K-9)", "Especiales", "Y:1 N:.15 Y:1"],
    ["Medalla Nacional Al Valor", "Bravura", "Or:.12 N:1 W:.06 N:1 Or:.12"],
  ]),
  /* ---------- Franjas de servicio (se dibujan como galones) ---------- */
  ...["3 meses", "6 meses", "9 meses", "1 año", "1 año 3 meses", "1 año 6 meses", "1 año 9 meses"].map((x, i): Decor =>
    ({ k: "franja-" + (i + 1), t: `Cinta de servicio (${x})`, c: "Acumulativa", tab: "fra", sec: "Departamentos", g: "Compartidas", s: [], n: i + 1 })),
  /* ---------- Condecoraciones · departamentos ---------- */
  ...mk("cond", "Departamentos", "Compartidas", [
    ["Citación de Unidad de la Comisión", "Citaciones", "Y:.12 O:1 Y:.12"],
    ["Citación de Unidad Meritoria", "Citaciones", "O:1 W:.12 O:1"],
    ["Cinta de Servicio de Patrulla", "Asignación", "N"],
    ["Cinta de Servicio de Detective", "Asignación", "K:1 W:.12 K:1"],
    ["Cinta de Oficial de Reserva", "Asignación", "B:.14 Gr:1 B:.14"],
    ["Calificación en Rifle Urbano", "Calificación", "O:1 K:.04 O:1 K:.04 O:1"],
    ["Calificación en Munición Slug", "Calificación", "Br:1 B:.45 Br:1"],
    ["Cinta de Búsqueda y Captura", "Mérito", "K:.55 R:.4 K:.35 R:.4 K:.55", undefined, "star"],
    ["Agente del Mes", "Desempeño", "R B R B R"],
    ["Cinta de Mando en Operativos", "Mando", "M:1 Y:.9 M:1", undefined, "starw"],
    ["Servicio Destacable como Mando", "Mando", "M:.5 Y:.5 W:.6 Y:.5 M:.5"],
    ["Desempeño en Programa de Academia", "Academia", "Y:.12 G:1 W:.18 G:1 Y:.12"],
    ["Cinta de Comendación", "Comendación", "R B R B R", "comendacion"],
  ]),
  ...mk("cond", "Departamentos", "LSPD", [["Desempeño Destacable - LSPD", "Desempeño", "LN Y LN"]]),
  ...mk("cond", "Departamentos", "LSSD", [["Desempeño Destacable - LSSD", "Desempeño", "O Y O"]]),
  ...mk("cond", "Departamentos", "SAHP", [["Desempeño Destacable - SAHP", "Desempeño", "Sa Y Sa"]]),
  /* ---------- Condecoraciones · divisiones ---------- */
  ...mk("cond", "Divisiones", "RTD", [
    ["Cinta de Instructor", "Certificación", "Br:1 T:.6 Br:1", undefined, "star"],
    ["Cinta de Mentor", "Hito", "G:1 T:.3 G:.12 T:.3 G:1"],
    ["Instructor del Año", "Hito", "Y:.06 P:1 Y:.06", undefined, "star"],
    ["Especialista en Tiro (FTU)", "Especialidad", "DG:1 R:.1 DG:.5 R:.1 DG:1"],
    ["Especialista en Conducción (EVOC)", "Especialidad", "Y K Y K Y"],
    ["6 Meses en Instrucción", "Asignación", "Br"],
    ["Desempeño Destacable en RTD", "Hito", "Br:.8 Y:.4 W:.4 Y:.4 Br:.8"],
    ["Cinta de Cadetes Formados", "Acumulativa", "G:1 T:.9 G:1", undefined, "star"],
  ]),
  ...mk("cond", "Divisiones", "Detective Bureau", [
    ["Cinta de Detective Certificado", "Certificación", "K:1 Gr:.4 K:1"],
    ["Cinta de Casos Resueltos", "Acumulativa", "K:1 Gr:.55 K:1", undefined, "star"],
    ["Cinta de Especialista Forense", "Especialidad", "B:1 W:.8 B:1"],
    ["Cinta de Operación Encubierta", "Hito", "K:1 M:.14 K:1"],
    ["6 Meses en Detective Bureau", "Asignación", "M:.05 K:1 M:.05"],
    ["Desempeño Destacable en DB", "Hito", "K:.4 M:.4 Y:.4 M:.4 K:.4"],
  ]),
  ...mk("cond", "Divisiones", "ASB", [
    ["Cinta de Servicio Administrativo", "Asignación", "St:1 Gr:.6 St:1"],
    ["Cinta de Servicio Prolongado", "Acumulativa", "St:1 Gr:.5 St:1", undefined, "star"],
    ["Cinta de Especialista en Armería", "Especialidad", "DG:1 R:.14 DG:1"],
    ["Cinta de Logística Destacada", "Hito", "St:.8 Gr:.35 St:.3 Gr:.35 St:.8"],
    ["Desempeño Destacable en ASB", "Hito", "St:1 Y:.9 St:1"],
  ]),
  ...mk("cond", "Divisiones", "Metro", [
    ["Cinta de Operador Metro", "Certificación", "K:.5 Gr:.5 R:.5 Gr:.5 K:.5"],
    ["Cinta de Operativos Tácticos", "Acumulativa", "K:.5 Gr:.5 R:.5 Gr:.5 K:.5", undefined, "star"],
    ["Cinta de Tirador Designado", "Especialidad", "K:1 R:.1 K:1"],
    ["Cinta de Rescate de Rehenes", "Hito", "G:1 W:.8 G:1"],
    ["6 Meses en Metro", "Asignación", "R:.08 K:1 R:.08"],
    ["Desempeño Destacable en Metro", "Hito", "K:.5 R:.5 Y:.4 R:.5 K:.5"],
    ["Cinta de Redadas Tácticas", "Acumulativa", "K:.4 R:.08 K:.3 R:.08 K:.5 R:.08 K:.3 R:.08 K:.4", undefined, "star"],
  ]),
  ...mk("cond", "Divisiones", "HSIU", [
    ["Cinta de Interceptor Certificado", "Certificación", "R W K"],
    ["Cinta de Interceptaciones", "Acumulativa", "R W K", undefined, "star"],
    ["Cinta PIT Certificada", "Especialidad", "W", undefined, "check"],
    ["Cinta del Piloto del Año", "Hito", "Y:.06 P:1 Y:.06", "piloto-del-ano-hsiu", "star"],
    ["6 Meses en HSIU", "Asignación", "W:.06 R:1 W:.06"],
    ["Desempeño Destacable en HSIU", "Hito", "R:.4 W:.4 Y:.4 W:.4 R:.4"],
    ["Servicio Destacable Motorizada", "Especialidad", "K:.3 Gr:.3 K:.2 R:.2 K:.2 Gr:.3 K:.3"],
  ]),
  ...mk("cond", "Divisiones", "Air Support", [
    ["Cinta de Tripulante Aéreo", "Asignación", "LB:1 W:.55 LB:1"],
    ["Cinta de Horas de Vuelo", "Acumulativa", "LB:1 W:.5 LB:1", undefined, "star"],
    ["Cinta de Piloto Certificado", "Especialidad", "LB:.12 Gr:.04 LB:2 Gr:.04 LB:.12"],
    ["Cinta de Operador TFO", "Especialidad", "LB:1 Or:.4 LB:1"],
    ["6 Meses en Air Support", "Asignación", "W:.05 LB:1 W:.05"],
    ["Desempeño Destacable en ASD", "Hito", "LB:1 Y:.9 LB:1"],
  ]),
  ...mk("cond", "Divisiones", "Asuntos Internos", [
    ["Cinta de IA Certificado", "Certificación", "P:1 W:.5 P:1"],
    ["6 Meses en Asuntos Internos", "Asignación", "W:.07 P:2"],
    ["Desempeño Destacable en IA", "Hito", "P:1 Y:.6 P:1"],
  ]),
];
/* qué reconoce cada una y cómo se gana (texto de six) */
const TXT: Record<string, [string, string]> = {
  "Citación de Unidad de la Comisión": ["Equivalente colectivo a la Medalla al Valor.", "Operativo donde una unidad completa actuó con valor excepcional. La gana toda la unidad participante."],
  "Citación de Unidad Meritoria": ["Trabajo en equipo destacado.", "Unidad cierra un caso complejo o lleva a cabo un operativo prolongado con éxito."],
  "Cinta de Servicio de Patrulla": ["Tiempo dedicado a patrulla activa.", "Acumulación de horas en patrulla."],
  "Cinta de Servicio de Detective": ["Tiempo asignado al Detective Bureau.", "Acumulación de horas o casos en el DB."],
  "Cinta de Oficial de Reserva": ["Reservistas con compromiso a largo plazo.", "4.000 horas como oficial de reserva."],
  "Calificación en Rifle Urbano": ["Certificación oficial para portar carabina.", "Pasar el test de tiro de armería."],
  "Calificación en Munición Slug": ["Certificación para portar escopeta con slugs.", "Pasar test específico de manejo de slug."],
  "Cinta de Búsqueda y Captura": ["Capturar fugitivos con orden activa.", "Acumulativa: arrestar a sospechosos con BOLO/orden activa."],
  "Agente del Mes": ["Nombramiento mensual de la jefatura del departamento.", "Designación de la jefatura desde el panel de control de la tablet. Un nombramiento cada 30 días por departamento."],
  "Cinta de Mando en Operativos": ["Reconocimiento al oficial que asume el rol de mando en operativos.", "Acumulativa anual: liderar como mando in-scene 50+ veces durante un año fiscal."],
  "Servicio Destacable como Mando": ["Liderazgo y juicio sobresalientes en posición de mando.", "Nominación por mandos superiores tras periodo de liderazgo destacado: gestión de crisis, formación de subordinados."],
  "Desempeño en Programa de Academia": ["Reconocimiento al cadete que destaca durante la academia. Se queda en el expediente toda la carrera.", "Graduarse en el top 3 de la academia o recibir reconocimiento del comité instructor por desempeño excepcional."],
  "Cinta de Comendación": ["Reconocido formalmente muchas veces a lo largo de la carrera.", "Acumulación de comendaciones formales (notas positivas en expediente)."],
  "Desempeño Destacable - LSPD": ["Reconocimiento general por trabajo sobresaliente como oficial del LSPD.", "Nominación del mando del LSPD tras un periodo de trabajo destacado: alta productividad, fiabilidad táctica, calidad de informes."],
  "Desempeño Destacable - LSSD": ["Reconocimiento general por trabajo sobresaliente como deputy del LSSD.", "Nominación del mando del LSSD tras un periodo de trabajo destacado."],
  "Desempeño Destacable - SAHP": ["Reconocimiento general por trabajo sobresaliente como trooper del SAHP.", "Nominación del mando del SAHP tras un periodo de trabajo destacado en patrullaje de carreteras."],
  "Cinta de Instructor": ["Reconocimiento al instructor activo de RTD con escalones por academias completadas.", "Base: certificación de instructor. Devices por academias completadas como instructor principal."],
  "Desempeño Destacable en IA": ["Investigación interna sobresaliente.", "Nominación del jefe de IA: investigaciones complejas resueltas, integridad bajo presión."],
  "6 Meses en Asuntos Internos": ["Compromiso continuado con investigación interna.", "6 meses como investigador activo de IA."],
  "Cinta de IA Certificado": ["Acceso a la División de Asuntos Internos.", "Pasar la certificación interna de IA: discreción, ética, procedimiento de investigación interna."],
  "Desempeño Destacable en ASD": ["Trabajo aéreo sobresaliente.", "Nominación del jefe de ASD: pericia en pilotaje, soporte crítico a otras divisiones."],
  "6 Meses en Air Support": ["Compromiso continuado con Air Support.", "6 meses como tripulante activo de ASD."],
  "Cinta de Operador TFO": ["Tactical Flight Officer: operador del helicóptero.", "Certificación específica como TFO: cámara térmica, foco nocturno, comunicaciones aire-tierra."],
  "Cinta de Piloto Certificado": ["Licencia de piloto del departamento.", "Test teórico + práctica de aterrizaje + horas mínimas como copiloto."],
  "Cinta de Horas de Vuelo": ["Volumen de horas operativas en helicóptero.", "Acumulación de horas dentro del helicóptero en servicio."],
  "Cinta de Tripulante Aéreo": ["Asignación operativa a Air Support.", "Asignación oficial mínimo 30 días."],
  "Servicio Destacable Motorizada": ["Trabajo destacado con motocicletas o vehículos de alta velocidad.", "100+ horas en unidad motorizada con desempeño destacado y sin accidentes graves atribuibles."],
  "Desempeño Destacable en HSIU": ["Trabajo sobresaliente en interceptación a alta velocidad.", "Nominación del jefe de HSIU: ejecución técnica impecable, mínimo de daños colaterales."],
  "6 Meses en HSIU": ["Compromiso continuado con HSIU.", "6 meses como interceptor activo."],
  "Cinta del Piloto del Año": ["Reconocimiento anual interno de HSIU.", "Votación anual interna."],
  "Cinta PIT Certificada": ["Maniobra de inmovilización táctica.", "Curso teórico + práctica supervisada + ejecución exitosa en al menos 3 persecuciones reales."],
  "Cinta de Interceptaciones": ["Volumen de persecuciones culminadas con éxito.", "Solo cuenta detenciones efectivas del vehículo."],
  "Cinta de Interceptor Certificado": ["EVOC avanzado de la unidad de interceptación.", "EVOC avanzado: test de pista + persecución controlada + maniobras evasivas."],
  "Cinta de Redadas Tácticas": ["Participación y éxito en redadas.", "Combina dos métricas: éxito como líder y volumen de participación."],
  "Desempeño Destacable en Metro": ["Trabajo táctico sobresaliente como operador Metro.", "Nominación del jefe de Metro tras periodo destacado: liderazgo táctico, ejecución impecable."],
  "6 Meses en Metro": ["Compromiso continuado con Metro.", "6 meses como operador activo de Metro."],
  "Cinta de Rescate de Rehenes": ["Rescate de rehenes con éxito.", "Activación oficial con rehén recuperado vivo. Otorgada al equipo entero."],
  "Cinta de Tirador Designado": ["Certificación de francotirador interna.", "Test de precisión + curso interno de tirador. Solo Metro."],
  "Cinta de Operativos Tácticos": ["Volumen de operativos Metro completados.", "Operativos Metro registrados en CAD/MDT con activación oficial."],
  "Cinta de Operador Metro": ["Certificación Metro/SWAT.", "Curso intensivo de tácticas + selección física + selección psicológica RP."],
  "Desempeño Destacable en ASB": ["Trabajo administrativo y de soporte sobresaliente.", "Nominación del jefe del ASB tras periodo destacado: mejora de procedimientos, eficiencia en gestión de recursos."],
  "Cinta de Logística Destacada": ["Coordinación logística de un operativo mayor.", "Coordinar la logística de un operativo multi-división: armamento, vehículos, equipos y abastecimiento."],
  "Cinta de Especialista en Armería": ["Certificación como armero del departamento.", "Formación interna de armero + gestión de mínimo 30 transacciones de armamento documentadas."],
  "Cinta de Servicio Prolongado": ["Tiempo continuado en el ASB.", "Acumulación de tiempo en ASB. El nivel oro cubre el requisito universal de '6 meses en división'."],
  "Cinta de Servicio Administrativo": ["Asignación operativa al ASB.", "Asignación oficial al ASB durante mínimo 30 días."],
  "Desempeño Destacable en DB": ["Trabajo de investigación sobresaliente.", "Nominación del jefe del DB tras periodo destacado: resolución de casos complejos, calidad de informes."],
  "6 Meses en Detective Bureau": ["Compromiso continuado con la investigación criminal.", "6 meses como miembro activo del Detective Bureau."],
  "Cinta de Operación Encubierta": ["Operación encubierta exitosa de larga duración.", "Operación UC mínimo 7 días reales: alta como UC, mantener cobertura, generar inteligencia que lleve a arrestos."],
  "Cinta de Especialista Forense": ["Especialista en escenas del crimen.", "Curso forense + procesar mínimo 5 escenas del crimen documentadas."],
  "Cinta de Casos Resueltos": ["Volumen de casos cerrados con éxito.", "Cuenta solo casos cerrados con sospechoso identificado y arrestado."],
  "Cinta de Detective Certificado": ["Aprobar la certificación interna del Detective Bureau.", "Superar curso interno: investigación, procedimiento legal, manejo de evidencias y entrevistas."],
  "Cinta de Cadetes Formados": ["Volumen de cadetes instruidos a lo largo de la carrera.", "Acumulativa por cadetes formados (no requiere retención)."],
  "Desempeño Destacable en RTD": ["Trabajo sobresaliente como instructor.", "Nominación del jefe de RTD tras periodo de trabajo excepcional: pedagogía destacada, mejora de programas."],
  "6 Meses en Instrucción": ["Compromiso continuado con la formación.", "6 meses como miembro activo de la División de Instrucción."],
  "Especialista en Conducción (EVOC)": ["Instructor especializado en conducción de emergencia.", "Curso avanzado de EVOC + impartir mínimo 2 sesiones como instructor principal."],
  "Especialista en Tiro (FTU)": ["Instructor especializado en formación de armamento avanzado.", "Curso avanzado de armería + impartir mínimo 2 entrenamientos de tiro como instructor principal."],
  "Instructor del Año": ["Reconocimiento anual elegido por la división.", "Votación anual interna de RTD (jefe de división + instructores)."],
  "Cinta de Mentor": ["Premia formar oficiales que se quedan, no solo cantidad.", "10+ cadetes graduados por ti que siguen activos (mínimo 30 días post-graduación)."],
};
DECOR.forEach(d => { const x = TXT[d.t]; if (x) { d.d = x[0]; d.h = x[1]; } });
const DECOR_BY = new Map(DECOR.map(d => [d.k, d]));
export const decorOf = (k?: string) => (k ? DECOR_BY.get(k) : undefined);

/* fondo de la cinta: franjas + textura de hilo + brillo, todo en un solo background */
const cache = new Map<string, string>();
export function ribbonBg(d: Decor) {
  const hit = cache.get(d.k); if (hit) return hit;
  let stripes: string;
  if (d.dev === "check") stripes = "repeating-conic-gradient(#111 0 25%,#f5f5f5 0 50%) 0 0/12px 12px";
  else { const tot = d.s.reduce((a, [, w]) => a + w, 0); let x = 0;
    stripes = "linear-gradient(90deg," + d.s.map(([c, w]) => { const a = (x / tot) * 100; x += w; return `${c} ${a.toFixed(2)}% ${((x / tot) * 100).toFixed(2)}%`; }).join(",") + ")"; }
  const v = `linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 45%,rgba(0,0,0,.22)),repeating-linear-gradient(90deg,rgba(0,0,0,.1) 0 1px,transparent 1px 3px),${stripes}`;
  cache.set(d.k, v); return v;
}

export type Award = { id: string; t: string; f?: string; k?: string; m?: string; by?: string };
