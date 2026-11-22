/* Novedades: el registro de cambios en cinco etapas (del .bat a hoy) y la primera versión web (v0.3) en grande, en solo lectura */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileCode2, Globe, History, Maximize2, MonitorSmartphone, Rocket, Sparkles, X, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { LS, ME_ROLES } from "@/lib/store";
import { useMe } from "@/lib/me";
import { DEPT } from "@/lib/dept";
import { DET, lvl } from "@/lib/domain";
import { rosterDivs } from "@/lib/units";
import { cn } from "@/lib/cn";

export const APP_VERSION = "5.7.5";
const vnum = (v: string) => v.split(".").reduce((a, x, i) => a + (+x || 0) / 100 ** i, 0);
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => vnum(LS.get("lspdt.seenVersion") || "0") < vnum(APP_VERSION);
export const markSeen = () => LS.set("lspdt.seenVersion", APP_VERSION);

/* cada entrada es una etapa (de la .1 a la siguiente versión redonda): v = hasta, from = desde, d = resumen, sub = las versiones que tuvo; hero = la primera, en grande */
type Rel = { v: string; from: string; f: string; t: string; d?: string; hero?: boolean; items: string[]; sub?: [string, string][] };
/* a quién le toca cada novedad: «[tag] texto» en un ítem o en el título de un grupo. Sin tag, la ven todos.
   lspd / lssd / sahp: ese departamento · sup: Sargento para arriba · mandos: Detectives y Sargento II para arriba · six: solo six ·
   div:Nombre: los de esa división. Varios separados por coma (alcanza con uno); «a+b» pide los dos. six ve todo. */
type Who = { n: string; r: string; dept?: string };
const TAG = /^\[([^\]]+)\]\s*/;
function seeTag(tag: string, me: Who): boolean {
  if (ME_ROLES.six) return true;
  return tag.split(",").some(t => t.trim().split("+").every(x => { x = x.trim();
    if (x === "six") return false;
    if (x === "lspd" || x === "lssd" || x === "sahp") return (me.dept || "lspd") === x;
    if (x === "sup") return lvl(me.r) >= 6;
    if (x === "ofi") return lvl(me.r) >= 2;
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
const LOG: Rel[] = [
  { v: "5.0", from: "4.1", f: "18/11/2026", t: "Tres departamentos, una sola terminal", d: "El LSSD y la SAHP con su propia terminal y sus datos. Perfiles, Legal, Códigos y Pizarra, compartidos por los tres.", items: [],
  sub: [["4.1", "[six] Consulta|Comunicados y buscadores"], ["4.2", "[lssd] LSSD, ingreso con placa y manual"], ["4.2.1", "[lssd] Insignias, escudo y códigos del LSSD"], ["4.2.2", "[lssd] Divisiones y roster completo del LSSD"], ["4.3", "Mismas secciones en los tres departamentos"], ["5.0.0", "[sup] Robos|Logros y notificaciones desde arriba"], ["5.0.1", "Perfiles en los tres departamentos e imágenes por departamento"], ["5.0.2", "Notificaciones nuevas|[six] Sitio web en el panel de six"], ["5.0.3", "[div:Professional Standards Bureau] Números de caso de la PSB con testigos"], ["5.0.4", "[six] Acceso a áreas|Pizarra con contornos y banners|[six] Armas"], ["5.0.5", "[lssd,sahp] Supervisores, Capitanía y Jefatura en el LSSD y la SAHP"], ["5.0.6", "[lspd+ofi] Procedimiento de estupefacientes y dinero sin declarar"], ["5.0.7", "[div:Metropolitan Division] Examen práctico de METRO"], ["5.0.8", "Escala de notas 0 a 10 con colores"], ["5.2.5", "[div:Metropolitan Division] Examen práctico de METRO en equipo: guardar, en vivo y callsigns"], ["5.2.6", "[div:Metropolitan Division] METRO › Callsign: gestión, historial y comunicado"], ["5.2.7", "[div:Metropolitan Division] Callsigns del SWAT (Pelotón D) y feedback por artículo sin imputar"], ["5.2.8", "[div:Metropolitan Division] Callsigns desde el examen práctico, ascensos, retiros y reservas"], ["5.2.9", "[div:Metropolitan Division] Pausa por ausencia en el examen y comunicados con el formato de la METRO"], ["5.3.0", "[div:Metropolitan Division] Examen de la METRO aparte de la academia, con la Convocatoria 0 de archivo"], ["5.3.1", "[div:Metropolitan Division] Distintivos de Team Leader, Instructor y Líder de Pelotón; METRO más fluida"], ["5.4.0", "[lssd] LSSD: expedientes personales, Supervisores, Capitanía, Jefatura y administración del departamento"], ["5.4.1", "[lssd] Jefatura ve también su propio expediente"], ["5.4.2", "Buscador de agentes en todos lados y terminal más liviana"], ["5.5.0", "[lssd] LSSD: eventos en el Calendario, portada de Jefatura, divisiones con cargos, feedback con seguimiento, Uso de Fuerza, Robos para todos, Pizarra por departamento, condecoraciones compartidas y rango actual en el 10-80"], ["5.6.0", "[ofi] Pestaña Oficiales (Informes, Códigos y Procedimientos)|[div:Professional Standards Bureau] Sección 3303 en la PSB|[div:Metropolitan Division] METRO con Exámenes y Entrevistas|Temas nuevos y todo de la A a la Z"], ["5.6.1", "[six] Estilo clasic|[ofi] Radio en Oficiales|Pestañas nuevas, San Andreas Training Division y subdivisiones de la A a la Z"], ["5.6.2", "Pestañas en una sola fila|[ofi] Procedimientos renovado|[div:Metropolitan Division] Comunicado de plazas, convocatorias y examen online|Logo de la SATD"], ["5.6.3", "[ofi] Procedimiento del mando del táctico en un 487|[div:Metropolitan Division] Preguntas de líder de pelotón con cod.77 y Clave Robert"], ["5.6.4", "[ofi] Cod.8 corregido en el procedimiento del táctico"], ["5.6.5", "[ofi] Mando del táctico (487) por fases y según jurisdicción: sur o norte"], ["5.6.6", "[six] Manuales: editor por bloques con PDF|[ofi] Roles y 254-V del 487 corregidos"], ["5.6.7", "Oficiales desde Oficial II"], ["5.6.8", "Bloc de notas privado en tu perfil"], ["5.6.9", "[lssd] LSSD: editar agentes y entrevistas con resultados del formulario"], ["5.7.0", "[div:Air Support Division] Licencias de vuelo en el A.S.D|Tema GitHub oscuro y barra de la Pizarra"], ["5.7.1", "[six] Robos editables por six|[sup] Galería de Arte con 4 binomios"], ["5.7.2", "[sup] Historial de cambios de los robos"], ["5.7.3", "[ofi] Robos también en Oficiales"], ["5.7.4", "[sup] Briefing y debriefing, menú de Supervisores en un renglón y el 124.1 solo con rehén jugador|[ilg] Robos activos y misiones de la tablet"], ["5.7.5", "Novedades en una lista por versión|[sup] Briefing solo para Supervisores|[ilg] Datos de la tablet solo para Gestión de ilícitos"]] },
  { v: "4.0", from: "3.1", f: "13/11/2026 – 18/11/2026", t: "Inicio nuevo, Radio, Reuniones y Galería", d: "Inicio con portada, buscador Ctrl + K, borradores automáticos, Radio, Reuniones colaborativas y Galería.", items: [],
  sub: [["3.0.1", "Versiones y recuperar borrados en OIS"], ["3.0.2", "[six] Robos en el panel de six"], ["3.0.3", "[six] CK en robos y links de solo lectura"], ["3.0.4", "Informes como expediente"], ["3.0.5", "Patrullas en una sección"], ["3.0.6", "Copiar Discord o web"], ["3.4", "[sup] Robos oficial en Supervisores"], ["3.4.2", "Entrevistas compactas"], ["3.5", "Inicio estilo foro y bajas del roster"], ["3.5.3", "Entrevistas sin cortes"], ["3.6", "10-80 con historial"], ["3.6.2", "10-80 con varios citados"], ["3.7", "Radio y reuniones"], ["3.7.5", "Temas de reuniones"], ["3.8", "Reuniones como documento"], ["3.8.1", "Reuniones en el calendario"], ["3.9", "Galería privada"], ["3.9.4", "Inicio sin subpestañas"], ["4.0", "Terminal de Mando 4.0"], ["4.0.1", "[six] Links de invitado"], ["4.0.2", "Menú solo con íconos"], ["4.0.4", "PSB a cualquier rango"], ["4.0.5", "Link de reuniones"], ["4.0.7", "[mandos] Pizarras de Mandos"], ["4.0.8", "[div:K-9 Division] Fichas K-9|Infraestructura"]] },
  { v: "3.0", from: "2.1", f: "12/11/2026 – 13/11/2026", t: "Divisiones de punta a punta", d: "Cada división pasa a ser un espacio propio y protegido. Llegan el Calendario, el OIS y el examen en línea de la METRO.", items: [],
  sub: [["2.1", "Rosters con roles en todas las divisiones"], ["2.1.1", "Datos de divisiones protegidos"], ["2.3", "Rosters unificados"], ["2.3.1", "Rosters solo para su coordinación"], ["2.3.3", "Pantalla de actualización"], ["2.3.4", "Restablecer contraseñas"], ["2.3.5", "Calendario, expediente, condecoraciones y OIS"], ["2.5", "Menú nuevo, idioma y Feedback renovado"], ["2.5.3", "Avisos desde arriba"], ["2.5.4", "Armas de la METRO"], ["2.5.5", "Convocatorias METRO"], ["2.5.6", "OIS con varias armas"], ["2.5.7", "Examen escrito de la METRO"], ["2.5.8", "Examen rediseñado"], ["3.0", "OIS remitido a la FID"]] },
  { v: "2.0", from: "1.1", f: "07/11/2026 – 11/11/2026", t: "Comunicados, perfiles y Pizarra", d: "Comunicados con asistente, Sargentos, informes completos, notificaciones, los primeros perfiles y la Pizarra en vivo.", items: [],
  sub: [["1.0.x", "Comunicados, condecoraciones, Sargentos, informes con vehículos y PSB"], ["1.5", "Agentes, Novedades y barra de tablet"], ["1.6", "Feedback, huellas y patrullas ONX"], ["1.7", "Centro de notificaciones"], ["1.8", "Mi perfil (BETA)"], ["1.9", "Pizarra, METRO y flujo de la PSB"], ["1.9.4", "Invitaciones y pizarra en vivo"], ["1.9.7", "Perfiles con ID y logros"], ["1.9.12", "Uniformidad y links temporales"], ["1.9.15", "Divisiones solo para miembros"], ["2.0", "Pestañas de división en una fila"]] },
  { v: "1.0", from: "0.0", f: "Octubre 2026 – 07/11/2026", t: "Del .bat a la web", hero: true, d: "Empezó como un .bat que armaba el contrato de ascenso, pasó a ser un programa con forma de tablet y en octubre se convirtió en esta página.", items: [],
  sub: [["0.0", ".bat do_contrato"], ["1.4.2", "LSPD-Terminal.exe"], ["0.1", "Versión base"], ["0.2", "Inicio y barra de secciones"], ["0.3", "Primera versión web"], ["0.4", "Panel de administración"], ["0.5", "Administradores"], ["0.6", "Alerta Táctica y temas"], ["0.6.9", "Entrevista personal y CRT"], ["0.7", "Carga estilo terminal"], ["0.7.7", "Área Divisiones y RTD"], ["0.7.12", "Colores de división"], ["0.8", "Notificación de la PSB"], ["0.8.3", "Informes y A.S.D"], ["0.8.6", "K-9 Division"], ["0.8.9", "División PSB"], ["0.9", "Versión nueva en React"], ["0.9.7", "Feedback de incidentes"], ["1.0", "La nueva pasa a ser la principal"]] },
];

/* la última versión, para el inicio */
export const latest = (me: Who) => logFor(me)[0] || LOG[0];
/* ---------- vista ---------- */
const STEPS: [LucideIcon, string, string][] = [[FileCode2, ".bat", "El contrato de ascenso"], [MonitorSmartphone, ".exe", "Programa con forma de tablet"], [Globe, "Web", "Base compartida (v0.3)"], [Rocket, "1.0", "La versión nueva, principal"]];

/* la v0.3 abierta como una app más, a pantalla completa dentro de la tablet (Esc o la X la cierran) */
function V03({ onClose }: { onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const host = document.querySelector(".tab-screen") as HTMLElement | null;
  return createPortal(
    <div className={cn("z-[80] flex flex-col bg-slate-950 animate-fade-in", host ? "absolute inset-0" : "fixed inset-0")} role="dialog" aria-label="Terminal v0.3">
      <div className="flex items-center gap-3 border-b border-white/10 bg-slate-900/95 px-4 py-2 text-slate-200 backdrop-blur">
        <History className="size-4 text-brand-300" /><b className="font-display text-sm tracking-wide">TERMINAL DE MANDO · v0.3</b>
        <span className="hidden rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300 sm:inline">Modo recuerdo · solo lectura</span>
        <button onClick={onClose} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"><X className="size-3.5" />Volver a Novedades</button>
      </div>
      <iframe title="Terminal v0.3" src="/legacy/v0.3.html" className="w-full flex-1 bg-white" sandbox="allow-scripts allow-same-origin allow-forms" />
    </div>, host || document.body);
}

function Era({ r, cur }: { r: Rel; cur: boolean }) {
  const [v03, setV03] = useState(false);
  const V = (r.sub || []).slice().reverse(); /* de la más nueva a la más vieja */
  return (
    <div key={r.v} className="animate-fade-in space-y-4">
      <Card className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--b-500)/.18),transparent_55%)]" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {cur && <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 font-bold text-orange-600 dark:text-orange-300"><Sparkles className="size-3" />Actual · v{APP_VERSION}</span>}
              {r.hero && <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 font-bold text-brand-700 dark:text-brand-300"><History className="size-3" />Los comienzos</span>}
              <span className="text-slate-400">{r.f}</span>
            </div>
            <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">{r.t}</h2>
            {r.d && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{r.d}</p>}
          </div>
          <div className="flex gap-6 lg:text-right">
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Versiones</p><p className="font-mono text-3xl font-black">{V.length}</p></div>
          </div>
        </div>
        {r.hero && <div className="relative grid gap-3 px-6 pb-6 sm:grid-cols-4 sm:px-8">{STEPS.map(([I, t, d], i) => (
          <div key={t} className="rise flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60" style={{ ["--d" as string]: i * 90 + "ms" }}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white dark:bg-brand-500 [&>svg]:size-5"><I /></span>
            <span className="min-w-0"><b className="font-display block text-lg leading-none">{t}</b><small className="text-xs text-slate-500">{d}</small></span></div>))}</div>}
      </Card>

      {r.hero && <button onClick={() => setV03(true)} className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800">
        <div className="pointer-events-none relative h-[clamp(320px,52vh,560px)] overflow-hidden bg-slate-900">
          <iframe title="Vista previa v0.3" src="/legacy/v0.3.html" tabIndex={-1} loading="lazy" className="absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white" sandbox="allow-scripts allow-same-origin" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 p-6 text-white">
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">Modo recuerdo</p><p className="font-display text-3xl font-bold sm:text-4xl">La primera versión web · v0.3</p>
            <p className="text-sm text-white/70">Tal como se publicó en octubre. Se abre dentro de la tablet y no guarda nada.</p></div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition group-hover:scale-105"><Maximize2 className="size-4" />Abrir la v0.3</span>
        </div>
      </button>}
      {v03 && <V03 onClose={() => setV03(false)} />}

      <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">{V.map(([v, t], i) => (
        <div key={v} className="rise flex items-baseline gap-4 px-5 py-3" style={{ ["--d" as string]: Math.min(i, 12) * 30 + "ms" }}>
          <b className={cn("w-20 shrink-0 font-mono text-sm", i === 0 && cur ? "text-orange-600 dark:text-orange-300" : "text-brand-700 dark:text-brand-300")}>v{v}</b>
          <span className="min-w-0 flex-1 text-[14px] leading-snug text-slate-700 dark:text-slate-200">{t}</span>
          {i === 0 && cur && <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10.5px] font-bold text-orange-600 dark:text-orange-300">Actual</span>}</div>))}
      </Card>
    </div>);
}

export function Novedades() {
  const me = useMe(), L = logFor({ n: me.n, r: me.r, dept: DEPT.id }), [sel, setSel] = useState(0), r = L[sel] || L[0];
  useEffect(() => { markSeen(); }, []);
  return (
    <div className="space-y-5">
      {/* línea de tiempo: una etapa a la vez */}
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <ol className="relative flex min-w-max items-stretch gap-2">
          {L.map((x, i) => { const on = i === sel; return (
            <li key={x.v} className="flex-1">
              <button onClick={() => setSel(i)} aria-current={on ? "step" : undefined}
                className={cn("group relative w-full min-w-[9.5rem] rounded-2xl border px-4 py-3 text-left transition", on ? "border-brand-500/60 bg-brand-500/10 shadow-sm" : "border-slate-200 hover:border-brand-400/60 hover:bg-slate-100/60 dark:border-slate-800 dark:hover:bg-slate-800/40")}>
                <span className={cn("block font-mono text-lg font-black leading-none", on ? "text-brand-700 dark:text-brand-200" : "text-slate-700 dark:text-slate-200", i === 0 && "ver-fire")}>v{x.from} → v{x.v}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{x.t}</span>
                {i === 0 && <span className="absolute right-3 top-3 size-2 rounded-full bg-orange-500 shadow-[0_0_8px] shadow-orange-500" />}
              </button></li>); })}
        </ol>
      </div>
      {r && <Era key={r.v} r={r} cur={sel === 0} />}
    </div>
  );
}
