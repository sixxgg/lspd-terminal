/* Pantallas de la terminal: cada sección se carga recién cuando se abre (código separado por pantalla). Clave: "área/sección" (ver nav.tsx). */
import { lazy, type ComponentType, type ReactNode } from "react";
import { DEPT } from "./lib/dept";
export const lz = <T extends Record<string, unknown>>(f: () => Promise<T>, n: keyof T) => lazy(() => f().then(m => ({ default: m[n] as ComponentType<any> }))); // eslint-disable-line @typescript-eslint/no-explicit-any
const Perfil = lz(() => import("./sections/Perfil"), "Perfil");
export const PerdidaArmamento = lz(() => import("./sections/PerdidaArmamento"), "PerdidaArmamento");
const Ascensos = lz(() => import("./sections/sup/Ascensos"), "Ascensos");
const AdmGaleria = lz(() => import("./sections/adm/Galeria"), "AdmGaleria");
const Galeria = lz(() => import("./sections/Galeria"), "Galeria");
const Manuales = lz(() => import("./sections/six/Manuales"), "Manuales");
const Consulta = lz(() => import("./sections/Consulta"), "Consulta");
export const LssdSoon = lz(() => import("./sections/Lssd"), "LssdSoon");
const Radio = lz(() => import("./sections/Radio"), "Radio");
const Reuniones = lz(() => import("./sections/sup/Reuniones"), "Reuniones");
const T1080 = lz(() => import("./sections/sup/T1080"), "T1080");
const Alerta = lz(() => import("./sections/sup/Alerta"), "Alerta");
const Bodycam = lz(() => import("./sections/sup/Bodycam"), "Bodycam");
const Sargentos = lz(() => import("./sections/sgt/Sargentos"), "Sargentos");
const Timestamps = lz(() => import("./sections/Timestamps"), "Timestamps");
const Novedades = lz(() => import("./sections/Novedades"), "Novedades");
const Condecoraciones = lz(() => import("./sections/sup/Condecoraciones"), "Condecoraciones");
const Entrevistas = lz(() => import("./sections/sup/Entrevistas"), "Entrevistas");
const Votaciones = lz(() => import("./sections/sup/Votaciones"), "Votaciones");
const Feedback = lz(() => import("./sections/sup/Feedback"), "Feedback");
const Agentes = lz(() => import("./sections/sup/Agentes"), "Agentes");
const Informes = lz(() => import("./sections/Informes"), "Informes");
const Legal = lz(() => import("./sections/Legal"), "Legal");
export const Division = lz(() => import("./sections/div/Division"), "Division");
const Permisos = lz(() => import("./sections/cap/Permisos"), "Permisos");
const EstadoRoster = lz(() => import("./sections/jef/Jefatura"), "EstadoRoster");
const HistorialVotaciones = lz(() => import("./sections/jef/Jefatura"), "HistorialVotaciones");
const AdmAccesos = lz(() => import("./sections/adm/Admin"), "AdmAccesos");
const AdmLogs = lz(() => import("./sections/adm/Logs"), "AdmLogs");
const AdmDatos = lz(() => import("./sections/adm/Admin"), "AdmDatos");
const AdmAccesosX = lz(() => import("./sections/adm/Admin"), "AdmAccesosX");
const AdmDatosX = lz(() => import("./sections/adm/Admin"), "AdmDatosX");
const AdmMarca = lz(() => import("./sections/adm/Admin"), "AdmMarca");
const RobosSup = lz(() => import("./sections/sup/RobosSup"), "RobosSup");
const PatrullasHub = lz(() => import("./sections/sup/Patrullas"), "PatrullasHub");
const FeedbackApp = lz(() => import("./sections/FeedbackApp"), "FeedbackApp");
const Huellas = lz(() => import("./sections/sup/Huellas"), "Huellas");
const Pizarra = lz(() => import("./sections/Pizarra"), "PizarraArea");
const Calendario = lz(() => import("./sections/Calendario"), "Calendario");
const Codigos = lz(() => import("./sections/Codigos"), "Codigos");
const Procedimientos = lz(() => import("./sections/Procedimientos"), "Procedimientos");
const Equipamiento = lz(() => import("./sections/cap/Equipamiento"), "Equipamiento");


const Expedientes = lz(() => import("./sections/Expedientes"), "Expedientes");
const FtoFeedback = lz(() => import("./sections/Expedientes"), "FtoFeedback");
const FbLssd = lz(() => import("./sections/FbLssd"), "FbLssd");
const UsoFuerza = lz(() => import("./sections/UsoFuerza"), "UsoFuerza");
const DeptTickets = lz(() => import("./sections/adm/Tickets"), "DeptTickets");
/* LSSD: el feedback de agentes es el propio (Positivo, Negativo y Seguimiento, lo revisa la administración del departamento) */
const FbDept = () => (DEPT.id === "lssd" ? <FbLssd /> : <Feedback />);

export const VIEWS: Record<string, () => ReactNode> = {
  /* LSSD: expedientes, feedback FTO y las herramientas que Capitanía y Jefatura comparten con Supervisores */
  "sup/exp": () => <Expedientes />, "cap/exp": () => <Expedientes />, "jef/exp": () => <Expedientes />, "sup/fto": () => <FtoFeedback />,
  "cap/asc": () => <Ascensos />, "jef/asc": () => <Ascensos />, "cap/fbk": () => <FbDept />, "jef/fbk": () => <FbDept />, "cap/cond": () => <Condecoraciones />, "jef/cond": () => <Condecoraciones />,
  "sup/asc": () => <Ascensos />, "sup/t1080": () => <T1080 />, "ofi/rad": () => <Radio />, "ofi/pro": () => <Procedimientos />, "gal/gal": () => <Galeria />, "man/man": () => <Manuales />, "con/con": () => <Consulta />, "sup/reu": () => <Reuniones />, "sup/alt": () => <Alerta />, "sup/bod": () => <Bodycam />, "sup/cond": () => <Condecoraciones />, "cap/exa": () => <Sargentos tab="exa" />, "cap/ent": () => <Sargentos tab="ent" />, "cap/list": () => <Sargentos tab="list" />, "piz/piz": () => <Pizarra />, "ofi/cod": () => <Codigos />, "sup/ent": () => <Entrevistas />, "sup/vot": () => <Votaciones />, "sup/fbk": () => <FbDept />, "cap/vot": () => <Votaciones />, "sup/pat": () => <PatrullasHub />, "sup/rob": () => <RobosSup />, "rob/rob": () => <RobosSup />, "sup/uof": () => <UsoFuerza />, "cap/uof": () => <UsoFuerza />, "jef/uof": () => <UsoFuerza />, "sup/prof": () => <Agentes />, "age/prof": () => <Agentes />, "ini/nov": () => <Novedades />, "adm/ts": () => <Timestamps />, "ofi/inf": () => <Informes />, "leg/ley": () => <Legal />, "fb/env": () => <FeedbackApp />, "sup/hue": () => <Huellas />, "cap/equ": () => <Equipamiento />, "cap/perm": () => <Permisos />, "jef/ros": () => <EstadoRoster />, "jef/his": () => <HistorialVotaciones />,
  "cal/cal": () => <Calendario />, "me/perfil": () => <Perfil />, "adm/acc": () => (DEPT.id === "lspd" ? <AdmAccesos /> : <AdmAccesosX />), "adm/brand": () => <AdmMarca />, "adm/data": () => (DEPT.id === "lspd" ? <AdmDatos /> : <AdmDatosX />), "adm/logs": () => <AdmLogs />, "adm/fbt": () => <DeptTickets />, "adm/gal": () => <AdmGaleria />,
};
