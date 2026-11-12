/* Pantallas de la terminal: cada sección se carga recién cuando se abre (código separado por pantalla). Clave: "área/sección" (ver nav.tsx). */
import { lazy, type ComponentType, type ReactNode } from "react";
export const lz = <T extends Record<string, unknown>>(f: () => Promise<T>, n: keyof T) => lazy(() => f().then(m => ({ default: m[n] as ComponentType<any> }))); // eslint-disable-line @typescript-eslint/no-explicit-any
const Perfil = lz(() => import("./sections/Perfil"), "Perfil");
export const PerdidaArmamento = lz(() => import("./sections/PerdidaArmamento"), "PerdidaArmamento");
const Ascensos = lz(() => import("./sections/sup/Ascensos"), "Ascensos");
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
const AdmDatos = lz(() => import("./sections/adm/Admin"), "AdmDatos");
const AdmMarca = lz(() => import("./sections/adm/Admin"), "AdmMarca");
const Patrullas = lz(() => import("./sections/sup/Patrullas"), "Patrullas");
const FeedbackApp = lz(() => import("./sections/FeedbackApp"), "FeedbackApp");
const Huellas = lz(() => import("./sections/sup/Huellas"), "Huellas");
const RegistroPatrullas = lz(() => import("./sections/sup/RegistroPatrullas"), "RegistroPatrullas");
const Pizarra = lz(() => import("./sections/Pizarra"), "PizarraArea");
const Calendario = lz(() => import("./sections/Calendario"), "Calendario");
const Codigos = lz(() => import("./sections/Codigos"), "Codigos");
const Equipamiento = lz(() => import("./sections/cap/Equipamiento"), "Equipamiento");


export const VIEWS: Record<string, () => ReactNode> = {
  "sup/asc": () => <Ascensos />, "sup/t1080": () => <T1080 />, "sup/alt": () => <Alerta />, "sup/bod": () => <Bodycam />, "sup/cond": () => <Condecoraciones />, "cap/exa": () => <Sargentos tab="exa" />, "cap/ent": () => <Sargentos tab="ent" />, "cap/list": () => <Sargentos tab="list" />, "piz/piz": () => <Pizarra />, "cod/cod": () => <Codigos />, "sup/ent": () => <Entrevistas />, "sup/vot": () => <Votaciones />, "sup/fbk": () => <Feedback />, "cap/vot": () => <Votaciones />, "sup/pat": () => <Patrullas />, "sup/prof": () => <Agentes />, "age/prof": () => <Agentes />, "ini/nov": () => <Novedades />, "ini/ts": () => <Timestamps />, "inf/inf": () => <Informes />, "leg/ley": () => <Legal />, "sup/preg": () => <RegistroPatrullas />, "fb/env": () => <FeedbackApp />, "sup/hue": () => <Huellas />, "cap/equ": () => <Equipamiento />, "cap/perm": () => <Permisos />, "jef/ros": () => <EstadoRoster />, "jef/his": () => <HistorialVotaciones />,
  "cal/cal": () => <Calendario />, "me/perfil": () => <Perfil />, "adm/acc": () => <AdmAccesos />, "adm/brand": () => <AdmMarca />, "adm/data": () => <AdmDatos />,
};
