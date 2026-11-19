import { PROF, profOk } from "@/lib/nick";
import { divVisible } from "@/lib/divisions";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays, Home, BookOpenCheck, FileText, Users, TrendingUp, Radio, Siren, Video, Car, ClipboardList, MessagesSquare, Vote, ShieldAlert, MessageSquareWarning,
  Gavel, Package, KeyRound, BarChart3, History, Dog, Shield, GraduationCap, Building2, Gauge, Search, Crosshair, UserCheck, Palette, Database, Scale, Medal, ClipboardCheck, MessageCircle, Trophy, Settings, Briefcase, ScrollText, Clock, Star, Landmark, Heart, Fingerprint, UserRound, Presentation, UserMinus, RadioTower, UsersRound, Images } from "lucide-react";
import { GUEST, LS, ME_ROLES } from "./lib/store";
import { DEPT, onDept } from "./lib/dept";
import { Helicopter } from "./components/icons";
import { lvl } from "./lib/domain";

export type Sec = { k: string; l: string; sl?: string; d: string; icon: LucideIcon; ready?: boolean; min?: number; hide?: boolean }; /* hide: no aparece en la barra de secciones (se entra por otro lado) */
export type Area = { k: string; l: string; icon?: LucideIcon; min: number; req?: string; admin?: boolean; hidden?: boolean; beta?: boolean; sec: Sec[] };

/* áreas y secciones de la terminal */
const RAW_AREAS: Area[] = [
  { k: "ini", l: "Inicio", icon: Home, min: 0, sec: [{ k: "home", l: "Inicio", d: "Resumen del departamento", icon: Home, ready: true },
    /* se entra desde la versión que está debajo del logo */
    { k: "nov", l: "Novedades", d: "Registro de cambios por versión y la primera versión de la terminal", icon: ScrollText, ready: true, hide: true }] },
  { k: "age", l: "Agentes", icon: Users, min: 6, req: "Sargento I", sec: [{ k: "prof", l: "Agentes", d: "Planilla del departamento por rango: Jefatura, Capitanía, Supervisores, Detectives y Patrulleros", icon: Users, ready: true }] },
  { k: "cal", l: "Calendario", icon: CalendarDays, min: 0, sec: [{ k: "cal", l: "Calendario", d: "Prácticas, instrucciones y eventos de las divisiones", icon: CalendarDays, ready: true }] },
  { k: "inf", l: "Informes", icon: FileText, min: 0, sec: [{ k: "inf", l: "Informes policiales", d: "Redactar, registrar y buscar informes", icon: FileText, ready: true }] },
  /* oculta del menú: se entra desde el nombre del encabezado (por ahora solo six, BETA) */
  { k: "me", l: "Mi perfil", icon: UserRound, min: 0, hidden: true, sec: [{ k: "perfil", l: "Mi perfil", d: "Perfiles de la terminal (BETA)", icon: UserRound, ready: true }] },
  { k: "fb", l: "Feedback", icon: Heart, min: 0, sec: [{ k: "env", l: "Feedback", d: "Errores, ideas o mejoras: escribilo como quieras y sumá fotos si ayudan", icon: Heart, ready: true }] },
  { k: "leg", l: "Legal", icon: Scale, min: 0, sec: [{ k: "ley", l: "Leyes", d: "Infracciones administrativas y delitos por capítulo, con favoritos", icon: Scale, ready: true }] },
  { k: "sup", l: "Supervisores", icon: ClipboardList, min: 6, req: "Sargento I", sec: [
    { k: "asc", l: "Ascensos / Descensos", sl: "Ascensos", d: "Contratos y resoluciones con /me y /do", icon: TrendingUp, ready: true },
    { k: "t1080", l: "10-80", d: "Citación por radio con vestimenta Clase A", icon: Radio, ready: true },
    { k: "alt", l: "Alerta Táctica", d: "Solicitud de elevación o ampliación de la alerta", icon: Siren, ready: true },
    { k: "cond", l: "Condecoraciones", sl: "Condecoraciones", d: "Medallas, franjas de servicio y condecoraciones de los agentes", icon: Medal, ready: true },
    { k: "bod", l: "Bodycam", d: "Pedido de la grabación de un oficial", icon: Video, ready: true },
    { k: "hue", l: "Registro de huellas", sl: "Huellas", d: "Huellas que toma cada agente en el laboratorio: nuevos registros y coincidencias", icon: Fingerprint, ready: true },
    { k: "pat", l: "Patrullas", d: "Revisión del equipamiento del maletero y registro de revisiones", icon: Car, ready: true },
    { k: "ent", l: "Entrevistas", d: "Preguntas y seguimiento de los agentes", icon: MessagesSquare, ready: true },
    { k: "vot", l: "Votaciones", d: "Propuestas de ascenso y descenso con debate", icon: Vote, ready: true },
    { k: "fbk", l: "Feedback (incidentes)", sl: "Feedback", d: "Feedback y acciones disciplinarias sobre la actuación de un agente", icon: MessageSquareWarning, ready: true },
    { k: "reu", l: "Reuniones", d: "Documento colaborativo: cada uno suma lo suyo (con formato) y queda firmado. Se agrega solo al calendario", icon: UsersRound, ready: true },
    { k: "rob", l: "Robos", d: "Catálogo oficial de robos y su articulado", icon: Gavel, ready: true },
    { k: "parm", l: "Pérdida de armamento", sl: "Pérdida de arma", d: "Informe de incidente por pérdida de arma de servicio", icon: ShieldAlert, ready: true },
  ] },
  /* Capitanía: los Sargentos II entran solo a la categoría Sargentos (ascenso a Sargento I); el resto pide Teniente */
  { k: "cap", l: "Capitanía", icon: Briefcase, min: 7, req: "Sargento II", sec: [
    { k: "exa", l: "Examen escrito (Sargento I)", d: "Fase II del ascenso a Sargento I: corte 70 % y bonificación por antigüedad", icon: ClipboardCheck, ready: true, min: 7 },
    { k: "ent", l: "Entrevista Oral Board (Sargento I)", d: "Fase III: tribunal de mandos, cada pregunta del 1 al 5", icon: MessageCircle, ready: true, min: 7 },
    { k: "list", l: "Lista de elegibles (Sargento I)", d: "Convocatorias: nota final /22 y sobre 100, ranking y observaciones", icon: Trophy, ready: true, min: 7 },
    { k: "vot", l: "Resolución de votaciones", d: "Aprobar o rechazar propuestas abiertas", icon: Gavel, ready: true, min: 8 },
    { k: "equ", l: "Equipamiento de patrullas", d: "Lo que debe llevar cada vehículo", icon: Package, ready: true, min: 8 },
    { k: "perm", l: "Permisos y cuentas", d: "Excepciones de rango y cuentas de la terminal", icon: KeyRound, ready: true, min: 8 },
  ] },
  { k: "piz", l: "Pizarra", icon: Presentation, min: 0, beta: true, sec: [{ k: "piz", l: "Pizarra", d: "Lienzo compartido para planear operativos, mapas mentales y flujos", icon: Presentation, ready: true }] },
  /* galería: la editan six, la administración y quienes habilite Administración › Galería (las fotos se ven en el Inicio) */
  { k: "gal", l: "Galería", icon: Images, min: 0, sec: [{ k: "gal", l: "Galería", d: "Fotos de Fivemanager para el carrusel del Inicio", icon: Images, ready: true }] },
  /* consulta del Manual del Novato: en prueba, solo six y quienes habilite en Administración › Accesos */
  { k: "con", l: "Consulta", icon: BookOpenCheck, min: 0, beta: true, sec: [{ k: "con", l: "Consulta", d: "Preguntas sobre el Manual del Novato, respondidas con el manual", icon: BookOpenCheck, ready: true }] },
  { k: "rad", l: "Radio", icon: RadioTower, min: 0, sec: [{ k: "rad", l: "Comunicados por radio", d: "10.03 con sujetos y vehículo de huida, por /rlspd o /rsapd", icon: RadioTower, ready: true }] },
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
    { k: "gal", l: "Galería", d: "Quién puede editar la galería y la clave de Fivemanager", icon: Images, ready: true },
    { k: "ts", l: "Hora para Discord", d: "Marcas de tiempo para comunicados: cada uno las ve en su propia hora", icon: Clock, ready: true },
    { k: "logs", l: "Logs", d: "Agentes que salieron del roster: quién, cuándo y quién lo quitó", icon: UserMinus, ready: true },
    { k: "data", l: "Roster y respaldo", d: "Cargar el roster en CSV y exportar o importar los datos", icon: Database, ready: true },
  ] },
];
/* orden A-Z: las áreas (con Inicio siempre primero) y las secciones de cada área; los números van antes que las letras */
const coll = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const lab = (x: { l: string; sl?: string }) => x.sl || x.l, byLabel = (a: { l: string; sl?: string }, b: { l: string; sl?: string }) => coll.compare(lab(a), lab(b));
const LSPD_AREAS: Area[] = RAW_AREAS
  .map(a => (a.k === "ini" ? a : { ...a, sec: a.sec.slice().sort(byLabel) }))
  .sort((a, b) => (a.k === "ini" ? -1 : b.k === "ini" ? 1 : byLabel(a, b)));
/* LSSD y SAHP: las mismas secciones del LSPD (Inicio, Agentes, Calendario, Informes, Feedback, Legal, Pizarra, Galería, Radio, Códigos y Administración),
   cada una con los datos de su departamento. Supervisores, Capitanía y Jefatura siguen en construcción. Mismas reglas de rango (escala equivalente, lib/domain.ts). */
const SHARE = ["ini", "me", "age", "cal", "inf", "fb", "leg", "piz", "gal", "rad", "cod"];
const ADM_X = ["brand", "acc", "data", "gal", "ts"];
const LSSD_DIV_SEC: Sec[] = [
  { k: "dv_sseb", l: "Special Enforcement Bureau", d: "SEB · Special Operations Division", icon: Crosshair, ready: true },
  { k: "dv_sab", l: "Aero Bureau", d: "AB · Special Operations Division", icon: Helicopter, ready: true },
  { k: "dv_sk9", l: "Canine Service Detail", d: "K-9 · Special Operations Division", icon: Dog, ready: true },
  { k: "dv_scnu", l: "Crisis Negotiation Unit", d: "CNU · Special Operations Division", icon: MessageCircle, ready: true },
  { k: "dv_sdd", l: "Detective Division", d: "DD · Special Operations Division", icon: Search, ready: true },
  { k: "dv_stb", l: "Training Bureau", d: "TB · Office of Sheriff Support Operations", icon: GraduationCap, ready: true },
  { k: "dv_ssib", l: "Sheriff Information Bureau", d: "SIB · Office of Sheriff Support Operations", icon: RadioTower, ready: true },
  { k: "dv_shsiu", l: "High Speed Interception Unit", d: "HSIU · Office of Sheriff Support Operations", icon: Gauge, ready: true },
];
const SOON = (k: string, l: string, icon: LucideIcon, min: number, req: string): Area => ({ k, l, icon, min, req, sec: [{ k: "soon", l, d: "En construcción", icon, ready: true }] });
/* g: áreas que se abren completas (iguales al LSPD, con los datos del departamento) para las cuentas con acceso dado desde Administración */
function xAreas(d: "lssd" | "sahp", g: { sup?: boolean; cap?: boolean; jef?: boolean } = {}): Area[] {
  const base = LSPD_AREAS.filter(a => SHARE.includes(a.k)).map(a => (a.k === "ini" ? { ...a, sec: a.sec.map(s => (s.k === "home" ? { ...s, d: d === "lssd" ? "Los Santos Sheriff's Department" : "San Andreas Highway Patrol" } : s)) }
    : a.k === "rad" ? { ...a, sec: a.sec.map(s => ({ ...s, d: `10.03 con sujetos y vehículo de huida, por /r${d} o /rsapd` })) } : a));
  const div: Area = d === "lssd" ? { k: "div", l: "Divisiones", icon: Landmark, min: 0, sec: LSSD_DIV_SEC } : SOON("div", "Divisiones", Landmark, 0, "");
  const adm = LSPD_AREAS.find(a => a.k === "adm")!;
  /* Supervisores: por ahora solo Condecoraciones (las mismas del LSPD: se ven en Agentes y en el Inicio) */
  const sup = LSPD_AREAS.find(x => x.k === "sup")!;
  const cap = LSPD_AREAS.find(x => x.k === "cap")!, jef = LSPD_AREAS.find(x => x.k === "jef")!;
  const L = [...base, div, g.sup ? { ...sup, req: "Sergeant" } : { ...sup, req: "Sergeant", sec: sup.sec.filter(x => x.k === "cond") },
    g.cap ? { ...cap, req: "Lieutenant" } : SOON("cap", "Capitanía", Briefcase, 8, "Lieutenant"),
    g.jef ? { ...jef, req: d === "lssd" ? "Area Commander" : "Chief" } : SOON("jef", "Jefatura", Star, 10, d === "lssd" ? "Area Commander" : "Chief"), { ...adm, sec: adm.sec.filter(s => ADM_X.includes(s.k)) }];
  return L.sort((a, b) => (a.k === "ini" ? -1 : b.k === "ini" ? 1 : byLabel(a, b)));
}
/* el menú cambia de departamento sin recargar: AREAS es la lista del departamento activo.
   En el LSSD y la SAHP, Supervisores, Capitanía y Jefatura se abren completas para six y para quien tenga acceso (Administración › Accesos). */
export const AREAS: Area[] = [...LSPD_AREAS];
let AK = "lspd";
export function syncAreas() {
  const d = DEPT.id;
  if (d === "lspd") { if (AK !== "lspd") { AK = "lspd"; AREAS.splice(0, AREAS.length, ...LSPD_AREAS); } return; }
  const A = LS.json<Record<string, string[]>>("lspdt.areaAcc", {}), g = Object.fromEntries(["sup", "cap", "jef"].map(k => [k, !!ME_ROLES.six || !!A[k]?.includes(PROF.me)]));
  const key = d + JSON.stringify(g); if (key === AK) return; AK = key; AREAS.splice(0, AREAS.length, ...xAreas(d, g));
}
onDept(syncAreas);
/* áreas que en el LSSD y la SAHP todavía están en construcción */
export const isSoon = (a: Area) => a.sec.length === 1 && a.sec[0].k === "soon";

/* Legal: solo six y a quien six le da acceso desde Administración */
const legalOk = () => !!ME_ROLES.six || LS.json<string[]>("lspdt.legacc", []).includes(PROF.me);
const conOk = () => !!ME_ROLES.six || LS.json<string[]>("lspdt.consultaAcc", []).includes(PROF.me);
const galOk = () => !!ME_ROLES.six || !!ME_ROLES.admin || LS.json<string[]>("lspdt.galEditors", []).includes(PROF.me);
/* invitado: solo las secciones que abrió six (Novedades va siempre con el Inicio) */
const guestSec = (a: string, s: string) => GUEST.secs.includes(`${a}/${s}`) || (a === "ini" && s === "nov");
/* acceso dado desde Administración › Accesos: cuenta como Sargento I (Supervisores), Teniente (Capitanía) o Comandante (Jefatura) */
const AREA_L: Record<string, number> = { sup: 6, cap: 8, jef: 10 };
const effL = (r?: string) => { const A = LS.json<Record<string, string[]>>("lspdt.areaAcc", {}); return Math.max(lvl(r), ...Object.entries(AREA_L).map(([k, l]) => (A[k]?.includes(PROF.me) ? l : 0))); };
export const canArea = (a: Area, r?: string) => (isSoon(a) ? !!ME_ROLES.six || lvl(r) >= a.min : GUEST.on ? a.sec.some(s => guestSec(a.k, s.k)) : a.k === "gal" ? galOk() : a.k === "con" ? conOk() : a.k === "me" ? profOk() : a.k === "leg" ? legalOk() : a.admin ? !!ME_ROLES.admin : a.k === "div" ? lvl(r) >= a.min && secsOf(a, r).length > 0 : effL(r) >= a.min);
/* áreas del menú (sin las ocultas) */
export const menuAreas = (r?: string) => (syncAreas(), AREAS).filter(a => !a.hidden && canArea(a, r));
/* secciones bloqueadas para ese rango (se muestran con candado) */
export const lockedOf = (a: Area, r?: string) => (GUEST.on ? [] : a.sec.filter(s => s.min && effL(r) < s.min));
/* secciones que ve cada uno dentro de un área (algunas piden más rango que el área) */
export const secsOf = (a: Area, r?: string) => isSoon(a) ? a.sec : GUEST.on ? a.sec.filter(s => guestSec(a.k, s.k)) : a.sec.filter(s => (!s.min || effL(r) >= s.min) && (a.k !== "div" || divVisible(s.l, PROF.me))); /* el rango manda también para los administradores */

