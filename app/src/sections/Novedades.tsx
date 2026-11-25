/* Novedades · v1.0.0 Official: todo lo que tuvo la terminal (del .bat a la 5.7.9) comprimido en un solo registro, el progreso de la página
   y, aparte, lo administrativo que solo ven los tres dueños (six, Anita y la administración del LSSD). */
import { useEffect } from "react";
import { BadgeCheck, Building2, ClipboardList, Crown, FileCode2, Gavel, Globe, Layers, MonitorSmartphone, Rocket, Shield, Sparkles, Star, Users, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { LS, ME_ROLES } from "@/lib/store";
import { useMe } from "@/lib/me";
import { DEPT } from "@/lib/dept";
import { DET, lvl } from "@/lib/domain";
import { rosterDivs } from "@/lib/units";
import { cn } from "@/lib/cn";

export const APP_VERSION = "1.0.0";
export const APP_TAG = "⟡ 𝕆𝕗𝕗𝕚𝕔𝕚𝕒𝕝";
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => (LS.get("lspdt.seenVersion") || "") !== APP_VERSION;
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

/* cada entrada es una etapa (de la .1 a la siguiente versión redonda): v = hasta, from = desde, d = resumen, sub = las versiones que tuvo; hero = la primera, en grande */
type Rel = { v: string; from: string; f: string; t: string; d?: string; sub?: [string, string][] };
/* a quién le toca cada novedad: «[tag] texto» en un ítem o en el título de un grupo. Sin tag, la ven todos.
   lspd / lssd / sahp: ese departamento · sup: Sargento para arriba · mandos: Detectives y Sargento II para arriba · six: solo six ·
   div:Nombre: los de esa división. Varios separados por coma (alcanza con uno); «a+b» pide los dos. six ve todo. */
type Who = { n: string; r: string; dept?: string };
const TAG = /^\[([^\]]+)\]\s*/;
function seeTag(tag: string, me: Who): boolean {
  if (ME_ROLES.six) return true;
  return tag.split(",").some(t => t.trim().split("+").every(x => { x = x.trim();
    if (x === "six") return false;
    /* los tres dueños: six, Anita y la administración del LSSD (CristianGV367) */
    if (x === "dueños") return !!ME_ROLES.anita || (!!ME_ROLES.dadm && (me.dept || "lspd") === "lssd");
    if (x === "lspd" || x === "lssd" || x === "sahp") return (me.dept || "lspd") === x;
    if (x === "sup") return lvl(me.r) >= 6;
    if (x === "ofi") return lvl(me.r) >= 2;
    if (x === "cap") return lvl(me.r) >= 8;
    if (x === "ilg") return LS.json<string[]>("lspdt.ilgAcc", []).includes(me.n);
    if (x === "mandos") return lvl(me.r) >= 7 || DET.includes(me.r);
    if (x.startsWith("div:")) return !!ME_ROLES.admin || rosterDivs(me.n).includes(x.slice(4));
    return true; }));
}
const clean = (L: string[], me: Who) => L.filter(x => { const m = TAG.exec(x); return !m || seeTag(m[1], me); }).map(x => x.replace(TAG, ""));
/* el registro tal como lo ve esta persona: cada versión es «parte|parte», y cada parte puede llevar su tag (lo que no le toca, fuera; versiones vacías, fuera) */
export function logFor(me: Who): Rel[] {
  return LOG.map(r => ({ ...r, sub: (r.sub || []).map(([v, t]) => [v, clean(t.split("|"), me).join(" · ")] as [string, string]).filter(([, t]) => t) })).filter(r => r.sub.length);
}
/* v1.0.0 Official: un solo registro. Cada «sub» es [área, lo que trae] y puede llevar tags por parte («[tag] texto|texto») */
const LOG: Rel[] = [
  { v: "1.0.0", from: "0.0", f: "25/11/2026", t: "La terminal, completa", d: "Del .bat que armaba el contrato de ascenso a la terminal de los tres departamentos. Todo lo que se fue sumando hasta la 5.7.9, en un solo registro.",
  sub: [
    ["Inicio", "Portada, buscador (Ctrl + K), notificaciones, calendario y tu perfil con logros y condecoraciones|Funciona igual en PC, celular y iPad"],
    ["Oficiales", "Informes completos con borradores, Códigos, Radio (los mensajes largos se mandan en partes de 290) y Robos con su articulado"],
    ["Supervisores", "[sup] 10-80 con lugares editables, Alerta táctica, Ascensos, Bodycam, Briefing con puntos por agente, Entrevistas, Feedback, Huellas, Patrullas (con lo de METRO y S.W.A.T.), Reuniones y Votaciones"],
    ["Capitanía y Jefatura", "[cap] Exámenes y entrevistas de sargentos, equipamiento de patrullas, expedientes y uso de la fuerza|[lssd+mandos] Traslados con entrevista, evaluación y votación por mayoría"],
    ["Divisiones", "Cada división con su espacio, roster, roles y herramientas: METRO, SWAT, ASD, K-9, PSB, RTD y las del LSSD"],
    ["Legal y Manuales", "Código penal con buscador, procedimientos y manuales para leer e imprimir"],
    ["Pizarra y Galería", "Pizarras en vivo para planificar y la galería de la terminal"],
    ["Tres departamentos", "LSPD, LSSD y SAHP con sus propios datos; perfiles, Legal, Códigos y Pizarra compartidos"],
    ["Robos", "[ilg] Tablet con armamento de cada misión, bandas y recompensas|Catálogo prolijo en cualquier pantalla"],
    ["Administración", "[dueños] Mantenimiento (beta) con contraseña por Discord, códigos de autodestrucción para borrar algo importante, cuentas, invitaciones, accesos y registros|[dueños] Auditoría de seguridad: imágenes solo de sitios confiables, sesiones vencidas fuera y permisos controlados en el servidor"],
  ] },
];
/* progreso de la página (lo estima six; se actualiza con cada versión) */
const PROG: [string, number, string][] = [["LSPD", 100, "Completa"], ["LSSD", 92, "Falta el Training Center y ajustes de divisiones"], ["SAHP", 40, "Roster y secciones base; el resto en construcción"], ["Pizarra", 80, "Estilos de línea y rendimiento en camino"], ["Manuales", 85, "Editor más simple e impresión"]];
const AREA_I: Record<string, LucideIcon> = { Inicio: Star, Oficiales: Shield, Supervisores: ClipboardList, "Capitanía y Jefatura": Crown, Divisiones: Layers, "Legal y Manuales": Gavel, "Pizarra y Galería": Sparkles, "Tres departamentos": Building2, Robos: Users, Administración: BadgeCheck };

/* la última versión, para el inicio */
export const latest = (me: Who) => logFor(me)[0] || LOG[0];
/* ---------- vista ---------- */
const STEPS: [LucideIcon, string, string][] = [[FileCode2, ".bat", "El contrato de ascenso"], [MonitorSmartphone, ".exe", "Programa con forma de tablet"], [Globe, "Web", "La primera página"], [Rocket, "1.0.0", "Official"]];

export function Novedades() {
  const me = useMe(), r = latest({ n: me.n, r: me.r, dept: DEPT.id }), own = !!ME_ROLES.six || seeTag("dueños", { n: me.n, r: me.r, dept: DEPT.id });
  useEffect(() => { markSeen(); }, []);
  const S = (r.sub || []).filter(([a]) => a !== "Administración"), A = (r.sub || []).find(([a]) => a === "Administración");
  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--b-500)/.22),transparent_55%)]" />
        <div className="relative space-y-6 p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 font-bold text-orange-600 dark:text-orange-300"><Sparkles className="size-3" />Versión actual</span>
            <span className="text-slate-400">{r.f}</span>
          </div>
          <div>
            <h2 className="font-display text-5xl font-bold leading-none tracking-tight sm:text-7xl"><span className="ver-fire">v{APP_VERSION}</span> <span className="text-brand-600 dark:text-brand-300">{APP_TAG}</span></h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{r.d}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">{STEPS.map(([I, t, d], i) => (
            <div key={t} className="rise flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60" style={{ ["--d" as string]: i * 90 + "ms" }}>
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-white [&>svg]:size-5", i === 3 ? "bg-orange-500" : "bg-brand-600 dark:bg-brand-500")}><I /></span>
              <span className="min-w-0"><b className="font-display block text-lg leading-none">{t}</b><small className="text-xs text-slate-500">{d}</small></span></div>))}</div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-3 sm:grid-cols-2">{S.map(([a, t], i) => { const I = AREA_I[a] || Star; return (
          <Card key={a} className="rise p-4" style={{ ["--d" as string]: Math.min(i, 10) * 40 + "ms" }}>
            <p className="flex items-center gap-2 font-display text-lg font-bold"><I className="size-4 text-brand-500" />{a}</p>
            <ul className="mt-1.5 space-y-1 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{t.split(" · ").map(x => <li key={x}>{x}</li>)}</ul>
          </Card>); })}</div>
        <div className="space-y-5">
          <Card className="p-4">
            <p className="font-display text-lg font-bold">Progreso de la página</p>
            <div className="mt-3 space-y-3">{PROG.map(([l, p, d]) => (
              <div key={l}><div className="flex items-baseline justify-between text-[13px]"><b>{l}</b><span className="font-mono text-xs font-bold tabular-nums">{p}%</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><span className={cn("block h-full rounded-full", p >= 100 ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${p}%` }} /></div>
                <p className="mt-0.5 text-[11px] text-slate-500">{d}</p></div>))}</div>
          </Card>
          {own && A && <Card className="border-amber-500/30 p-4">
            <p className="flex items-center gap-2 font-display text-lg font-bold"><Crown className="size-4 text-amber-500" />Solo dueños</p>
            <ul className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{A[1].split(" · ").map(x => <li key={x}>{x}</li>)}</ul>
          </Card>}
        </div>
      </div>
      <p className="text-center text-[11px] text-slate-400">De la 0.0 a la 5.7.9, todo en uno. Desde acá empieza la cuenta de nuevo.</p>
    </div>
  );
}
