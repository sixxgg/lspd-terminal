import type { LucideIcon } from "lucide-react";
import {
  Home, FileText, Users, TrendingUp, Radio, Siren, Video, Car, ClipboardList, MessagesSquare, Vote, ShieldAlert, MessageSquareWarning,
  Gavel, Package, KeyRound, BarChart3, History, Plane, Dog, Shield, GraduationCap, Building2, Gauge, Search, Crosshair, UserCheck, Palette, Database, Scale,
} from "lucide-react";
import { ME_ROLES } from "./lib/store";
import { lvl } from "./lib/domain";

export type Sec = { k: string; l: string; sl?: string; d: string; icon: LucideIcon; ready?: boolean };
export type Area = { k: string; l: string; min: number; req?: string; admin?: boolean; sec: Sec[] };

/* misma estructura que la versión clásica; ready = ya migrada a la versión nueva */
export const AREAS: Area[] = [
  { k: "ini", l: "Inicio", min: 0, sec: [{ k: "home", l: "Inicio", d: "Resumen del departamento", icon: Home, ready: true }] },
  { k: "inf", l: "Informes", min: 0, sec: [{ k: "inf", l: "Informes policiales", d: "Redactar, registrar y buscar informes · código penal", icon: FileText, ready: true }] },
  { k: "leg", l: "Legal", min: 0, sec: [{ k: "ley", l: "Leyes", d: "Infracciones administrativas y delitos por capítulo, con favoritos", icon: Scale, ready: true }] },
  { k: "sup", l: "Supervisión", min: 6, req: "Sargento I", sec: [
    { k: "prof", l: "Agentes", d: "Planilla del departamento", icon: Users, ready: true },
    { k: "asc", l: "Ascensos / Descensos", d: "Contratos y resoluciones con /me y /do", icon: TrendingUp, ready: true },
    { k: "t1080", l: "10-80", d: "Citación por radio con vestimenta Clase A", icon: Radio, ready: true },
    { k: "alt", l: "Alerta Táctica", d: "Solicitud de elevación o ampliación de la alerta", icon: Siren, ready: true },
    { k: "bod", l: "Bodycam", d: "Pedido de la grabación de un oficial", icon: Video, ready: true },
    { k: "pat", l: "Revisión de patrullas", d: "Control del equipamiento del maletero", icon: Car, ready: true },
    { k: "preg", l: "Registro de patrullas", d: "Revisiones guardadas y su detalle", icon: ClipboardList, ready: true },
    { k: "ent", l: "Entrevistas", d: "Preguntas y seguimiento de los agentes", icon: MessagesSquare, ready: true },
    { k: "vot", l: "Votaciones", d: "Propuestas de ascenso y descenso con debate", icon: Vote, ready: true },
    { k: "fbk", l: "Feedback (incidentes)", sl: "Feedback", d: "Feedback y acciones disciplinarias sobre la actuación de un agente", icon: MessageSquareWarning, ready: true },
    { k: "parm", l: "Pérdida de armamento", sl: "Pérdida de arma", d: "Informe de incidente por pérdida de arma de servicio", icon: ShieldAlert, ready: true },
  ] },
  { k: "cap", l: "Capitanía", min: 8, req: "Teniente", sec: [
    { k: "vot", l: "Resolución de votaciones", d: "Aprobar o rechazar propuestas abiertas", icon: Gavel, ready: true },
    { k: "equ", l: "Equipamiento de patrullas", d: "Lo que debe llevar cada vehículo", icon: Package, ready: true },
    { k: "perm", l: "Permisos y cuentas", d: "Excepciones de rango y cuentas de la terminal", icon: KeyRound, ready: true },
  ] },
  { k: "jef", l: "Jefatura", min: 10, req: "Comandante", sec: [
    { k: "ros", l: "Estado del roster", d: "Composición del departamento", icon: BarChart3, ready: true },
    { k: "his", l: "Historial de votaciones", d: "Propuestas cerradas y su resultado", icon: History, ready: true },
  ] },
  { k: "div", l: "Divisiones", min: 0, sec: [
    { k: "dv_asb", l: "Administration Services Bureau", d: "Próximamente", icon: Building2, ready: true },
    { k: "dv_asd", l: "Air Support Division", d: "Roster, vuelos y exámenes", icon: Plane, ready: true },
    { k: "dv_db", l: "Detective Bureau", d: "Próximamente", icon: Search, ready: true },
    { k: "dv_hsiu", l: "High Speed Interception Unit", d: "Próximamente", icon: Gauge, ready: true },
    { k: "dv_kd", l: "K-9 Division", d: "Roster y patrullajes", icon: Dog, ready: true },
    { k: "dv_md", l: "Metropolitan Division", d: "Próximamente", icon: Crosshair, ready: true },
    { k: "dv_psb", l: "Professional Standards Bureau", d: "Roster, notificaciones y expedientes", icon: Shield, ready: true },
    { k: "dv_rtd", l: "Recruitment and Training Division", d: "Entrevistas de aspirantes", icon: GraduationCap, ready: true },
  ] },
  { k: "adm", l: "Administración", min: 0, admin: true, sec: [
    { k: "acc", l: "Accesos y administradores", d: "Solicitudes de acceso, administradores y accesos a RTD/PSB", icon: UserCheck, ready: true },
    { k: "brand", l: "Marca e imágenes", d: "Logos, fondos, fotos por defecto, textos y emblemas", icon: Palette, ready: true },
    { k: "data", l: "Roster y respaldo", d: "Cargar el roster en CSV y exportar o importar los datos", icon: Database, ready: true },
  ] },
];
export const canArea = (a: Area, r?: string) => (a.admin ? !!ME_ROLES.admin : lvl(r) >= a.min);

/* abre la misma sección en la versión clásica */
export function openClassic(area: string, sec: string) {
  location.href = `/#go=${area}/${sec}`;
}
