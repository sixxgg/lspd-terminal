/* Novedades · v1.0.0 Official: todo lo que tuvo la terminal (del .bat a la 5.7.9) comprimido en un solo registro, el progreso de la página
   y, aparte, lo administrativo que solo ven los tres dueños (six, Anita y la administración del LSSD). */
import { useEffect } from "react";
import { Crown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { LS, ME_ROLES } from "@/lib/store";
import { useMe } from "@/lib/me";
import { DEPT } from "@/lib/dept";
import { DET, lvl } from "@/lib/domain";
import { rosterDivs } from "@/lib/units";
import { cn } from "@/lib/cn";

export const APP_VERSION = "1.0.0";
/* revisión de las novedades dentro de la misma versión: cambia con cada entrega, así se enciende el aviso */
export const NEWS_REV = "1.0.0·10";
export const APP_TAG = "⟡ 𝕆𝕗𝕗𝕚𝕔𝕚𝕒𝕝";
/* hay novedades que el usuario todavía no vio */
export const hasNews = () => (LS.get("lspdt.seenVersion") || "") !== NEWS_REV;
export const markSeen = () => LS.set("lspdt.seenVersion", NEWS_REV);

/* cada entrada es una etapa (de la .1 a la siguiente versión redonda): v = hasta, from = desde, d = resumen, sub = las versiones que tuvo; hero = la primera, en grande */
type Rel = { v: string; from: string; f: string; t: string; d?: string; sub?: [string, string][] }; /* sub: [número, texto] (en el inicio se ve el número de versión) */
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
/* el registro: una entrada por versión, de la más nueva a la más vieja. Cada ítem puede llevar tag («[tag] texto»); los de «dueños» van aparte */
/* six: todo queda en la v1.0.0 (Estable) hasta que él diga de cambiar de versión. Lo nuevo se suma arriba en esta misma entrada
   y se sube NEWS_REV para que se encienda el aviso de novedades. */
const V: { v: string; f: string; t: string; it: string[] }[] = [
  { v: "1.0.0", f: "26/11/2026", t: "Estable", it: [
    "Marco de tablet nuevo, rugerizado y policial: bumper de goma, teclas físicas (ir arriba, buscador, pantalla completa), barra de luces «código 3» y etiqueta de inventario",
    "[sup] Entrega de condecoración: la condecoración se elige desde un catálogo en tarjetas con su cinta y su descripción, y la elegida muestra qué reconoce y cómo se gana",
    "Medallas y franjas de servicio con su descripción en el catálogo",
    "[sup] Condecoraciones: «Entrega de condecoración» con el rol de la ceremonia (/me y /do de hasta 290 caracteres, para uno o varios agentes) e «Historial» de entregas de cada departamento",
    "[ilg] Robos: las misiones repetidas ya dicen para qué banda es cada versión y las que todavía no están activas salieron del catálogo",
    "[dueños] Base de datos más liviana: el historial de versiones guarda hasta 60 por dato",
    "SAHP: roster completo cargado, con Corporal, FCO, Officer II/I y ADM; ascensos del 26/11",
    "[div:Professional Standards Bureau] La PSB es interdepartamental: sus miembros del LSSD y la SAHP entran a la división con todas sus herramientas",
    "[sup] Feedbacks con más variantes, textos mejor calibrados y la unidad de patrullaje (HENRY, MARY, ADAM, LINCOLN, BIKE…)",
    "[div:Professional Standards Bureau] Notificación, expediente y Citación 10-80 con agentes del LSPD, el LSSD y la SAHP",
    "[cap] Cambiar el nombre de un agente desde su ficha: se actualiza en roster, divisiones, callsigns, perfil, expediente y su cuenta",
    "Quien sale del roster (también al subir el roster.csv) sale solo de la METRO, el S.W.A.T. y el resto de sus divisiones",
    "[cap] Trasladar o expulsar entre LSPD, LSSD y SAHP en cualquier sentido; su expediente y su cuenta pasan con él",
    "Placas pendientes: Sargentos, Capitanía y Jefatura reciben cada día el aviso de los agentes sin placa y la asignan desde Agentes",
    "[adm] Traslados, expulsiones y cambios de nombre quedan en Administración › Logs",
    "[div:Metropolitan Division] Callsigns: Líderes de Pelotón C del S.W.A.T., traspaso de casillas y comunicados con bienvenidas y reincorporaciones",
    "[six] Fichas de armas con accesorios compatibles, munición y armas que la comparten",
    "Murrieta Factory en cuatro robos (armas alto/bajo: 8 policías · drogas alto/bajo: 6 policías) y catálogo de robos sin nombres cortados",
    "[ilg] Las 172 misiones de la tablet con sus armas obligatorias",
    "Pizarra con estilo propio, tipos de línea y banners editables; Manuales con barra de títulos e impresión con marco",
    "[dueños] Contraseña de mantenimiento y códigos de autodestrucción en el panel de six (ya no por Discord)",
    "Todo lo que hubo del .bat a la 5.7.9, en una sola versión",
    "Inicio, Oficiales, Supervisores, Capitanía, Jefatura, Divisiones, Legal, Manuales, Pizarra y Galería en los tres departamentos",
    "Funciona igual en PC, celular y iPad",
    "[sup] 10-80 con lugares editables, briefing con puntos por agente y checklist de METRO y S.W.A.T.",
    "[dueños] Mantenimiento (beta), códigos de autodestrucción, auditoría de seguridad y limpieza de duplicados en la base"] },
];
/* progreso de la página (lo estima six) */
const PROG: [string, number][] = [["LSPD", 100], ["LSSD", 92], ["SAHP", 40]];
const LOG: Rel[] = V.map(x => ({ v: x.v, from: x.v, f: x.f, t: x.t, sub: x.it.map((t, i) => [`${x.v}.${i}`, t] as [string, string]) }));
/* la última versión, para el inicio */
export const latest = (me: Who) => { const r = logFor(me)[0] || LOG[0]; return { ...r, sub: (r.sub || []).map(([, t]) => [r.v, t] as [string, string]) }; };

export function Novedades() {
  const me = useMe(), W = { n: me.n, r: me.r, dept: DEPT.id }, own = !!ME_ROLES.six || seeTag("dueños", W);
  useEffect(() => { markSeen(); }, []);
  const vis = (t: string) => { const m = TAG.exec(t); return !m || seeTag(m[1], W); }, isOwn = (t: string) => /^\[dueños\]/.test(t);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1 px-1">
        <h2 className="font-display text-3xl font-bold leading-none">v{APP_VERSION}</h2>
        <span className="pb-0.5 text-sm font-semibold text-brand-600 dark:text-brand-300">{APP_TAG}</span>
        <span className="ml-auto flex items-center gap-3 pb-0.5 text-[11.5px] text-slate-500">{PROG.map(([l, p]) => <span key={l} className="inline-flex items-center gap-1.5"><b className="font-semibold text-slate-600 dark:text-slate-300">{l}</b>
          <span className="h-1 w-10 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><span className={cn("block h-full rounded-full", p >= 100 ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${p}%` }} /></span>{p}%</span>)}</span>
      </div>
      <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">{V.map((x, i) => { const L = x.it.filter(vis), pub = L.filter(t => !isOwn(t)), adm = own ? L.filter(isOwn) : []; if (!L.length) return null; return (
        <section key={x.v} className="grid gap-x-5 gap-y-1 px-5 py-4 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
          <div className="flex items-baseline gap-2 sm:block"><b className={cn("font-mono text-base", i === 0 ? "text-orange-600 dark:text-orange-300" : "text-slate-700 dark:text-slate-200")}>v{x.v}</b>
            <p className="text-[11px] text-slate-400">{x.f}</p></div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold">{x.t}{i === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-1.5 py-px text-[10px] font-bold text-orange-600 dark:text-orange-300"><Sparkles className="size-3" />Actual</span>}</p>
            <ul className="mt-1.5 space-y-1 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{pub.map(t => <li key={t} className="flex gap-2"><span className="mt-[9px] size-1 shrink-0 rounded-full bg-slate-400" />{t.replace(TAG, "")}</li>)}</ul>
            {adm.length > 0 && <ul className="mt-2 space-y-1 rounded-lg bg-amber-500/[.07] px-3 py-2 text-[12.5px] text-slate-600 dark:text-slate-300">{adm.map(t => <li key={t} className="flex gap-2"><Crown className="mt-[3px] size-3.5 shrink-0 text-amber-500" />{t.replace(TAG, "")}</li>)}</ul>}
          </div>
        </section>); })}</Card>
    </div>
  );
}
