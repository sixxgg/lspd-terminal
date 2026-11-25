/* Traslados a la LSSD (Capitanía y Jefatura): solicitud → entrevista de 13 preguntas → evaluación de 4 criterios → votación por mayoría simple
   → incorporación a la plantilla. Todo es confidencial: el servidor solo lo da a Lieutenant para arriba (o acceso a Capitanía/Jefatura) y six
   (lib/core.js › traslOk). Claves (cada departamento la suya; hoy solo la LSSD):
   - lspdt.trasl.<id>                    la solicitud (datos, entrevista, copia original, aclaraciones, rondas, cierres, rechazo, incorporación, registro)
   - lspdt.trasl.<id>.v.<ronda>.<slug>   el voto de cada revisor en esa ronda (con su historial de cambios): nadie pisa el voto de otro
   - lspdt.trasl.<id>.e.<slug>           la evaluación de cada evaluador (4 criterios + observaciones)
   Nada se borra desde la interfaz: rechazados e incorporados quedan archivados con todo. */
import { LS, ME_ROLES } from "./store";
import { getRoster, norm } from "./domain";
import { DEPT } from "./dept";
import { PROF } from "./nick";

export type TTipo = "lspd" | "sahp" | "ext";
export type TEst = "borr" | "entp" | "entc" | "prev" | "enrev" | "apr" | "rech" | "inc";
export type TLog = { t: number; by: string; x: string };
export type TAdic = { id: string; t: number; by: string; k: "info" | "preg" | "resp" | "doc"; x: string; url?: string };
export type TCierre = { ronda: number; t: number; by: string; res: "apr" | "rech" | "emp" | "sin"; si: number; no: number; rev: number };
export type Sol = {
  id: string; tipo: TTipo; n: string; placa?: string; dep: string; com?: string; rango?: string; ing?: string; du?: string; di?: string; mot?: string; fsol: string;
  entv?: string; entvI?: string; entvR?: string; entvP?: string; docs: { n: string; url: string; t: number; by: string }[]; obs?: string; est: TEst; by: string; at: number; upd: number; ub: string;
  ent: { q: string[]; r: string[]; by?: string; t?: number; fin?: number };
  orig?: { q: string[]; r: string[]; t: number; by: string };
  adic: TAdic[]; ronda: number; cierres: TCierre[];
  rech?: { mot: string; t: number; by: string };
  inc?: { r: string; p: string; f: string; e: string; fto?: string; o?: string; t: number; by: string };
  log: TLog[];
};
export type Opt = "si" | "no" | "rev";
export type Voto = { n: string; o: Opt; j?: string; t: number; h: { o: Opt; j?: string; t: number }[]; ok?: { by: string; t: number } };
export type CritV = "apto" | "rev" | "no";
export type Eval = { n: string; c: Record<string, { v?: CritV; o?: string }>; g?: string; t: number };

const T_KEY = "lspdt.trasl.";
export const vKey = (id: string, ronda: number, n: string) => `${T_KEY}${id}.v.${ronda}.${slug(n)}`;
export const eKey = (id: string, n: string) => `${T_KEY}${id}.e.${slug(n)}`;
export const slug = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");

export const TIPOS: Record<TTipo, { l: string; d: string; dep: string }> = {
  lspd: { l: "Interdepartamental · LSPD", d: "Agente del Los Santos Police Department", dep: "LSPD" },
  sahp: { l: "Interdepartamental · SAHP", d: "Agente de la San Andreas Highway Patrol", dep: "SAHP" },
  ext: { l: "Ordinario o externo", d: "Agente de otra comisaría, con formulario OOC de traslado", dep: "" },
};
export const ESTS: Record<TEst, { l: string; c: string }> = {
  borr: { l: "Borrador", c: "#94a3b8" }, entp: { l: "Entrevista pendiente", c: "#38bdf8" }, entc: { l: "Entrevista en curso", c: "#0ea5e9" },
  prev: { l: "Pendiente de revisión", c: "#f59e0b" }, enrev: { l: "En revisión", c: "#a855f7" }, apr: { l: "Aprobado", c: "#22c55e" },
  rech: { l: "Rechazado", c: "#ef4444" }, inc: { l: "Incorporado a la LSSD", c: "#10b981" },
};
export const OPTS: Record<Opt, { l: string; d: string; c: string }> = {
  si: { l: "A favor", d: "El candidato es apto para incorporarse", c: "#22c55e" },
  no: { l: "En contra", d: "El candidato no debe ser aceptado", c: "#ef4444" },
  rev: { l: "Solicitar revisión", d: "Hace falta más información o una nueva valoración", c: "#f59e0b" },
};
export const RES: Record<TCierre["res"], string> = { apr: "Aprobado por mayoría", rech: "Rechazado por mayoría", emp: "Pendiente por empate", sin: "Pendiente por falta de votos" };

/* las 13 preguntas (plantilla desde el LSPD). {AG} = agencia de procedencia · {RG} = rango en esa agencia */
const PREG: [string, string][] = [
  ["Presentación y trayectoria", "Oficial, háblenos brevemente sobre su carrera en {AG} hasta alcanzar el rango de {RG} y qué asignaciones o divisiones han marcado más su desarrollo."],
  ["Motivo del cambio", "{AGEL} ofrece una estructura muy definida y usted ya cuenta con un rango consolidado allí. ¿Qué le motiva específicamente a dejar {AG} para unirse al Sheriff’s Department?"],
  ["Conocimiento de la agencia", "¿Qué diferencias clave identifica entre la filosofía operativa de {AG} y la del LSSD (jurisdicción, trato con comunidades rurales/suburbanas, estructura de mando)?"],
  ["Toma de decisiones bajo presión", "Cuéntenos sobre un incidente crítico reciente en el que haya tenido que asumir el control de la escena antes de la llegada de un supervisor. ¿Cuál fue su prioridad y qué resultado obtuvo?"],
  ["Adaptabilidad jurisdiccional", "En el condado, los tiempos de respuesta de unidades de apoyo (backup) suelen ser mayores que en la ciudad y las zonas están más aisladas. ¿Cómo modifica esto su enfoque al realizar una parada de tránsito de alto riesgo o al responder a una llamada doméstica?"],
  ["Uso de la fuerza y desescalada", "Como oficial veterano, se espera que lidere con el ejemplo en la contención verbal. Describa una situación en la que el uso de la fuerza estaba justificado, pero logró resolver el incidente mediante técnicas de desescalada."],
  ["Rol de mentoría", "En {AG}, un agente veterano suele guiar a compañeros más jóvenes o actuar como FTO. Si se incorpora al LSSD como Deputy, tendrá que empezar desde la base operativa de nuestra agencia sin tener inmediatamente un rol de mando formal. ¿Cómo manejará esa transición y qué puede aportar a sus compañeros?"],
  ["Resolución de conflictos internos", "Si observa que un compañero con más antigüedad dentro del LSSD utiliza un procedimiento que difiere de lo que usted aprendió en {AG} —o que roza la irregularidad—, ¿cómo procedería?"],
  ["Historial disciplinario (pregunta directa)", "Para garantizar total transparencia en este proceso: ¿tiene alguna investigación abierta en Asuntos Internos de {AG}, quejas ciudadanas pendientes o sanciones en su expediente que debamos conocer antes de revisar su legajo?"],
  ["Autocrítica", "Mencione un error operativo o administrativo que haya cometido en los últimos años, cómo lo manejó con su cadena de mando y qué aprendió de ello."],
  ["Escenario", "Usted está patrullando en solitario en Sandy Shores. Detiene un vehículo por una infracción menor y descubre que el conductor es un sargento fuera de servicio de su antigua división en {AG}, quien presenta un ligero aliento alcohólico pero no está causando disturbios. ¿Cuál es su proceder paso a paso?"],
  ["Disponibilidad y expectativas", "¿Cuál es su disponibilidad de horarios y en qué estación o división del condado le gustaría proyectarse a mediano plazo?"],
  ["Espacio para el candidato", "¿Tiene alguna pregunta para el panel sobre el proceso de homologación, el período de prueba (FTO lateral) o el funcionamiento interno del departamento?"],
];
/* la plantilla adaptada a la procedencia (LSPD, SAHP u otra comisaría) */
export function preguntas(s: Pick<Sol, "tipo" | "dep" | "rango">): string[] {
  const ag = s.tipo === "lspd" ? "LSPD" : s.tipo === "sahp" ? "SAHP" : s.dep.trim() || "su departamento anterior";
  const el = s.tipo === "lspd" ? "El LSPD" : s.tipo === "sahp" ? "La SAHP" : `${s.dep.trim() || "Su departamento anterior"}`;
  const rg = s.rango?.trim() || (s.tipo === "lspd" ? "Police Officer [N°]" : s.tipo === "sahp" ? "Officer" : "su rango actual");
  return PREG.map(([t, q]) => `${t}\n${q.replace(/\{AGEL\}/g, el).replace(/\{AG\}/g, ag).replace(/\{RG\}/g, rg)}`);
}
export const CRIT: { k: string; l: string; pos: string; red: string }[] = [
  { k: "act", l: "Actitud hacia la agencia anterior", pos: "Habla con respeto de su antigua agencia y busca nuevos retos.", red: "Critica duramente a sus antiguos mandos o compañeros y muestra una actitud resentida." },
  { k: "hum", l: "Humildad / Ego", pos: "Acepta iniciar un proceso de adaptación y aprender las políticas de la LSSD.", red: "Muestra arrogancia por su rango anterior o considera que los procedimientos de su antigua agencia son necesariamente superiores." },
  { k: "eti", l: "Criterio ético", pos: "Responde honestamente sobre errores pasados y prioriza el cumplimiento de los procedimientos.", red: "Evade preguntas sobre su historial o intenta justificar el encubrimiento de un compañero." },
  { k: "ada", l: "Adaptabilidad", pos: "Comprende las diferencias geográficas, operativas y logísticas del condado.", red: "Mantiene una visión rígida centrada únicamente en el patrullaje urbano." },
];
export const CRITV: Record<CritV, { l: string; c: string }> = { apto: { l: "Apto", c: "#22c55e" }, rev: { l: "Requiere revisión", c: "#f59e0b" }, no: { l: "No apto", c: "#ef4444" } };

/* ---------- lectura ---------- */
export const solList = (): Sol[] => LS.keys(T_KEY).filter(k => /^lspdt\.trasl\.[a-z0-9]+$/.test(k)).map(k => LS.ro<Sol | null>(k, null)).filter((x): x is Sol => !!x && !!x.id).sort((a, b) => b.upd - a.upd);
export const votos = (id: string, ronda: number): Voto[] => LS.keys(`${T_KEY}${id}.v.${ronda}.`).map(k => LS.ro<Voto | null>(k, null)).filter((x): x is Voto => !!x && !!x.n && !!x.o);
export const evals = (id: string): Eval[] => LS.keys(`${T_KEY}${id}.e.`).map(k => LS.ro<Eval | null>(k, null)).filter((x): x is Eval => !!x && !!x.n);
/* revisiones pedidas en esta ronda que todavía nadie marcó como resueltas: no dejan cerrar */
export const revPend = (V: Voto[]) => V.filter(v => v.o === "rev" && !v.ok);
/* mayoría simple de los votos válidos (a favor contra en contra); las revisiones no cuentan */
export function mayoria(V: Voto[]): { si: number; no: number; rev: number; res: TCierre["res"] } {
  const si = V.filter(v => v.o === "si").length, no = V.filter(v => v.o === "no").length, rev = V.filter(v => v.o === "rev").length;
  return { si, no, rev, res: !si && !no ? "sin" : si > no ? "apr" : no > si ? "rech" : "emp" };
}
/* quiénes revisan: la Capitanía y la Jefatura de la LSSD (Lieutenant para arriba) y quienes tienen acceso dado a Capitanía o Jefatura */
const CAP_R = ["Sheriff", "Undersheriff", "Assistant Sheriff", "Division Chief", "Area Commander", "Captain", "Lieutenant"];
export function revisores(): string[] {
  const A = LS.json<Record<string, string[]>>("lspdt.areaAcc", {}), extra = [...(A.cap || []), ...(A.jef || [])];
  const L = getRoster().filter(a => CAP_R.includes(a.r) && !/retir|baja|inactiv/i.test(String((a as { e?: string }).e || ""))).map(a => a.n);
  return [...new Set([...L, ...extra])];
}
/* acceso del lado del cliente (el servidor controla lo mismo): six, Lieutenant para arriba o acceso dado a Capitanía/Jefatura en la LSSD */
export function traslOk(r?: string): boolean {
  if (ME_ROLES.six) return true; if (DEPT.id !== "lssd") return false;
  const A = LS.json<Record<string, string[]>>("lspdt.areaAcc", {});
  return CAP_R.includes(r || "") || !!A.cap?.includes(PROF.me) || !!A.jef?.includes(PROF.me);
}
