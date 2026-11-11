import type { LucideIcon } from "lucide-react";
import {
  Home, FileText, Users, TrendingUp, Radio, Siren, Video, Car, ClipboardList, MessagesSquare, Vote, ShieldAlert, MessageSquareWarning,
  Gavel, Package, KeyRound, BarChart3, History, Dog, Shield, GraduationCap, Building2, Gauge, Search, Crosshair, UserCheck, Palette, Database, Scale, Medal, ClipboardCheck, MessageCircle, Trophy, Settings, Briefcase, ScrollText, Clock, Star, Landmark, Heart, Fingerprint, UserRound, Presentation,
} from "lucide-react";
import { ME_ROLES } from "./lib/store";
import { Helicopter } from "./components/icons";
import { lvl } from "./lib/domain";

export type Sec = { k: string; l: string; sl?: string; d: string; icon: LucideIcon; ready?: boolean; min?: number };
export type Area = { k: string; l: string; icon?: LucideIcon; min: number; req?: string; admin?: boolean; hidden?: boolean; sec: Sec[] };

/* áreas y secciones de la terminal */
const RAW_AREAS: Area[] = [
  { k: "ini", l: "Inicio", icon: Home, min: 0, sec: [{ k: "home", l: "Inicio", d: "Resumen del departamento", icon: Home, ready: true },
    { k: "ts", l: "Hora para Discord", d: "Marcas de tiempo para comunicados: cada uno las ve en su propia hora", icon: Clock, ready: true },
    { k: "nov", l: "Novedades", d: "Registro de cambios por versión y la primera versión de la terminal", icon: ScrollText, ready: true }] },
  { k: "age", l: "Agentes", icon: Users, min: 6, req: "Sargento I", sec: [{ k: "prof", l: "Agentes", d: "Planilla del departamento por rango: Jefatura, Capitanía, Supervisores, Detectives y Patrulleros", icon: Users, ready: true }] },
  { k: "inf", l: "Informes", icon: FileText, min: 0, sec: [{ k: "inf", l: "Informes policiales", d: "Redactar, registrar y buscar informes", icon: FileText, ready: true }] },
  /* oculta del menú: se entra desde el nombre del encabezado (por ahora solo six, BETA) */
  { k: "me", l: "Mi perfil", icon: UserRound, min: 0, hidden: true, sec: [{ k: "perfil", l: "Mi perfil", d: "Tu perfil OOC en la terminal (BETA)", icon: UserRound, ready: true }] },
  { k: "fb", l: "Feedback", icon: Heart, min: 0, sec: [{ k: "env", l: "Feedback", d: "Errores, ideas o mejoras: escribilo como quieras y sumá fotos si ayudan", icon: Heart, ready: true }] },
  { k: "leg", l: "Legal", icon: Scale, min: 0, sec: [{ k: "ley", l: "Leyes", d: "Infracciones administrativas y delitos por capítulo, con favoritos", icon: Scale, ready: true }] },
  { k: "sup", l: "Supervisión", icon: ClipboardList, min: 6, req: "Sargento I", sec: [
    { k: "asc", l: "Ascensos / Descensos", sl: "Ascensos", d: "Contratos y resoluciones con /me y /do", icon: TrendingUp, ready: true },
    { k: "t1080", l: "10-80", d: "Citación por radio con vestimenta Clase A", icon: Radio, ready: true },
    { k: "alt", l: "Alerta Táctica", d: "Solicitud de elevación o ampliación de la alerta", icon: Siren, ready: true },
    { k: "cond", l: "Condecoraciones", sl: "Condecoraciones", d: "Medallas, franjas de servicio y condecoraciones de los agentes", icon: Medal, ready: true },
    { k: "bod", l: "Bodycam", d: "Pedido de la grabación de un oficial", icon: Video, ready: true },
    { k: "hue", l: "Registro de huellas", sl: "Huellas", d: "Huellas que toma cada agente en el laboratorio: nuevos registros y coincidencias", icon: Fingerprint, ready: true },
    { k: "pat", l: "Revisión de patrullas", d: "Control del equipamiento del maletero", icon: Car, ready: true },
    { k: "preg", l: "Registro de patrullas", d: "Revisiones guardadas y su detalle", icon: ClipboardList, ready: true },
    { k: "ent", l: "Entrevistas", d: "Preguntas y seguimiento de los agentes", icon: MessagesSquare, ready: true },
    { k: "vot", l: "Votaciones", d: "Propuestas de ascenso y descenso con debate", icon: Vote, ready: true },
    { k: "fbk", l: "Feedback (incidentes)", sl: "Feedback", d: "Feedback y acciones disciplinarias sobre la actuación de un agente", icon: MessageSquareWarning, ready: true },
    { k: "parm", l: "Pérdida de armamento", sl: "Pérdida de arma", d: "Informe de incidente por pérdida de arma de servicio", icon: ShieldAlert, ready: true },
  ] },
  /* Capitanía: los Sargentos II entran solo a la categoría Sargentos (ascenso a Sargento I); el resto pide Teniente */
  { k: "cap", l: "Capitanía", icon: Briefcase, min: 7, req: "Sargento II", sec: [
    { k: "exa", l: "Sargentos · Examen escrito", sl: "Sgto. · Examen", d: "Fase II del ascenso a Sargento I: corte 70 % y bonificación por antigüedad", icon: ClipboardCheck, ready: true, min: 7 },
    { k: "ent", l: "Sargentos · Entrevista (Oral Board)", sl: "Sgto. · Entrevista", d: "Fase III: tribunal de mandos, cada pregunta del 1 al 5", icon: MessageCircle, ready: true, min: 7 },
    { k: "list", l: "Sargentos · Lista de elegibles", sl: "Sgto. · Elegibles", d: "Convocatorias: nota final /22 y sobre 100, ranking y observaciones", icon: Trophy, ready: true, min: 7 },
    { k: "vot", l: "Resolución de votaciones", d: "Aprobar o rechazar propuestas abiertas", icon: Gavel, ready: true, min: 8 },
    { k: "equ", l: "Equipamiento de patrullas", d: "Lo que debe llevar cada vehículo", icon: Package, ready: true, min: 8 },
    { k: "perm", l: "Permisos y cuentas", d: "Excepciones de rango y cuentas de la terminal", icon: KeyRound, ready: true, min: 8 },
  ] },
  { k: "piz", l: "Pizarra", icon: Presentation, min: 0, sec: [{ k: "piz", l: "Pizarra", d: "Lienzo compartido para planear operativos, mapas mentales y flujos", icon: Presentation, ready: true }] },
  { k: "cod", l: "Códigos", icon: Radio, min: 0, sec: [{ k: "cod", l: "Códigos radiales", d: "Códigos de radio, 10-X, terminología, derechos y alfabeto NATO", icon: Radio, ready: true }] },
  { k: "jef", l: "Jefatura", icon: Star, min: 10, req: "Comandante", sec: [
    { k: "ros", l: "Estado del roster", d: "Composición del departamento", icon: BarChart3, ready: true },
    { k: "his", l: "Historial de votaciones", d: "Propuestas cerradas y su resultado", icon: History, ready: true },
  ] },
  { k: "div", l: "Divisiones", icon: Landmark, min: 0, sec: [
    { k: "dv_asb", l: "Administration Services Bureau", d: "Próximamente", icon: Building2, ready: true },
    { k: "dv_asd", l: "Air Support Division", d: "Roster, vuelos, exámenes e instrucciones", icon: Helicopter, ready: true },
    { k: "dv_db", l: "Detective Bureau", d: "Próximamente", icon: Search, ready: true },
    { k: "dv_hsiu", l: "High Speed Interception Unit", d: "Próximamente", icon: Gauge, ready: true },
    { k: "dv_kd", l: "K-9 Division", d: "Roster, perros, patrullajes e instrucciones", icon: Dog, ready: true },
    { k: "dv_md", l: "Metropolitan Division", d: "Roster, instrucciones, exámenes de instructor", icon: Crosshair, ready: true },
    { k: "dv_psb", l: "Professional Standards Bureau", d: "Expedientes de principio a fin: notificación, elevación, Justicia/SAJD y resolución", icon: Shield, ready: true },
    { k: "dv_rtd", l: "Recruitment and Training Division", d: "Entrevistas de aspirantes", icon: GraduationCap, ready: true },
  ] },
  { k: "adm", l: "Administración", icon: Settings, min: 0, admin: true, sec: [
    { k: "acc", l: "Accesos y administradores", d: "Solicitudes de acceso, administradores y accesos a RTD/PSB", icon: UserCheck, ready: true },
    { k: "brand", l: "Marca e imágenes", d: "Logos, fondos, fotos por defecto, textos y emblemas", icon: Palette, ready: true },
    { k: "data", l: "Roster y respaldo", d: "Cargar el roster en CSV y exportar o importar los datos", icon: Database, ready: true },
  ] },
];
/* orden A-Z: las áreas (con Inicio siempre primero) y las secciones de cada área; los números van antes que las letras */
const coll = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const byLabel = (a: { l: string }, b: { l: string }) => coll.compare(a.l, b.l);
export const AREAS: Area[] = RAW_AREAS
  .map(a => (a.k === "ini" ? a : { ...a, sec: a.sec.slice().sort(byLabel) }))
  .sort((a, b) => (a.k === "ini" ? -1 : b.k === "ini" ? 1 : byLabel(a, b)));

export const canArea = (a: Area, r?: string) => (a.k === "me" ? !!ME_ROLES.six : a.admin ? !!ME_ROLES.admin : lvl(r) >= a.min);
/* áreas del menú (sin las ocultas) */
export const menuAreas = (r?: string) => AREAS.filter(a => !a.hidden && canArea(a, r));
/* secciones que ve cada uno dentro de un área (algunas piden más rango que el área) */
export const secsOf = (a: Area, r?: string) => a.sec.filter(s => !s.min || lvl(r) >= s.min || !!ME_ROLES.admin);

