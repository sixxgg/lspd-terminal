/* «Revisar»: antes de copiar o guardar, muestra qué falta (rojo), qué quedó pendiente (amarillo) y qué está bien (verde).
   - Rojo: lo obligatorio que no se completó (lo pasa cada formulario).
   - Amarillo: campos del texto que quedaron vacíos o con el ejemplo (DD/MM/AAAA, 00:00, «Nombre»…) y avisos del formulario.
   - Verde: todo completo. */
import { useMemo, useState } from "react";
import { CircleAlert, CircleCheck, CircleDashed, ListChecks, SpellCheck, Wand2, X } from "lucide-react";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Rev = { err: string[]; pen: string[]; ok: string[]; sp: [string, string][] };

/* Ortografía: palabras que casi siempre se escriben mal (sin tilde o con letras de más). Solo las que no tienen otro
   significado sin tilde, para no «corregir» algo que estaba bien. Se respetan mayúsculas. */
const SP: Record<string, string> = Object.fromEntries(("vehiculo:vehículo vehiculos:vehículos matricula:matrícula matriculas:matrículas mascara:máscara mascaras:máscaras policia:policía policias:policías " +
  "huída:huida tambien:también ademas:además despues:después aqui:aquí alli:allí asi:así ahi:ahí deberia:debería deberian:deberían habia:había habian:habían tenia:tenía tenian:tenían " +
  "podria:podría podrian:podrían seria:sería serian:serían dia:día dias:días numero:número numeros:números telefono:teléfono codigo:código codigos:códigos articulo:artículo articulos:artículos " +
  "camion:camión informacion:información situacion:situación direccion:dirección ubicacion:ubicación intervencion:intervención detencion:detención persecucion:persecución " +
  "investigacion:investigación comunicacion:comunicación operacion:operación reunion:reunión citacion:citación justificacion:justificación sancion:sanción accion:acción atencion:atención " +
  "decision:decisión version:versión razon:razón ocasion:ocasión sesion:sesión ultimo:último ultima:última ultimos:últimos ultimas:últimas proximo:próximo proxima:próxima proximos:próximos " +
  "proximas:próximas rapido:rápido rapida:rápida rapidamente:rápidamente facil:fácil dificil:difícil tactico:táctico tactica:táctica tacticos:tácticos agresion:agresión prision:prisión " +
  "calcetin:calcetín pantalon:pantalón cinturon:cinturón caucasico:caucásico caucasica:caucásica asiatico:asiático asiatica:asiática cadaver:cadáver exito:éxito trafico:tráfico " +
  "todavia:todavía ningun:ningún algun:algún segun:según porfavor:por_favor accelerar:acelerar sereis:seréis correcion:corrección correción:corrección capitan:capitán capitania:capitanía " +
  "helicoptero:helicóptero metodo:método pagina:página paginas:páginas unico:único unica:única rehen:rehén ladron:ladrón camara:cámara camaras:cámaras " +
  "proteccion:protección declaracion:declaración resolucion:resolución evaluacion:evaluación proyeccion:proyección actuacion:actuación instruccion:instrucción " +
  "jovenes:jóvenes balistico:balístico balistica:balística electronico:electrónico arbol:árbol garage:garaje ocurrio:ocurrió").split(" ")
  .map(x => x.split(":").map(w => w?.replace(/_/g, " ")) as [string, string]).filter(([a, b]) => !!a && !!b && a !== b));
const SP_RE = new RegExp(`(?<![\\p{L}\\d_/:@#<])(${Object.keys(SP).join("|")})(?![\\p{L}\\d_])`, "giu");
const keepCase = (src: string, dst?: string) => (!dst ? src : src === src.toUpperCase() ? dst.toUpperCase() : src[0] === src[0].toUpperCase() ? dst[0].toUpperCase() + dst.slice(1) : dst);
/* sin tocar links, menciones ni marcas de tiempo de Discord */
const SKIP = /(https?:\/\/\S+|<[@#:t][^>]*>|`[^`]*`)/g;
const eachText = (t: string, f: (x: string) => string) => t.split(SKIP).map((x, i) => (i % 2 ? x : f(x))).join("");
function spellOf(t: string): [string, string][] {
  const out = new Map<string, string>();
  eachText(t, x => { for (const m of x.matchAll(SP_RE)) out.set(m[1], keepCase(m[1], SP[m[1].toLowerCase()])); return x; });
  return [...out];
}
export const fixSpell = (t: string) => eachText(t, x => x.replace(SP_RE, m => keepCase(m, SP[m.toLowerCase()])).replace(/[ \t]{2,}/g, " ").replace(/ +([,.;:!?])(?=\s|$)/g, "$1"));
const PH = /^(?:`?DD\/MM\/AAAA`?|`?dd\/mm\/aaaa`?|`?00:00`?|`?HH:MM`?|Nombre|Placa|Rol|\.{2,}|…|_+|\[[^\]]*\]|\((?:describir|completar|indicar|escribir)[^)]*\)?.*)$/i;
const blank = (v: string) => { const x = v.replace(/^[>\s]+/, "").trim(); return !x || PH.test(x); };

/* lee los campos «**Etiqueta:** valor» del texto generado; si el valor viene en la línea de abajo (relatos) mira esa */
function fieldsOf(text: string) {
  const L = text.split("\n"), out: { l: string; ok: boolean }[] = [];
  L.forEach((line, i) => {
    const re = /\*\*([^*\n]{2,56}?):\*\*:?[ \t]*([^*\n]*)/g; let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const l = m[1].replace(/^[^\p{L}\d]+/u, "").trim(); let v = m[2];
      if (!v.trim() && line.trim().endsWith(m[0].trim())) { const nx = L.slice(i + 1).find(x => x.trim()); v = nx && !/^\s*(#|\*\*[^*]+:\*\*)/.test(nx) ? nx : ""; }
      if (l && !out.some(o => o.l === l)) out.push({ l, ok: !blank(v) });
    }
  });
  return out;
}
export function revOf(text: string, err: string[] = [], pen: string[] = []): Rev {
  const F = fieldsOf(text), e = err.map(norm);
  const has = (l: string) => e.some(x => x && (norm(l).includes(x) || x.includes(norm(l))));
  /* «[Nombre]» sin reemplazar (no los links de Discord [texto](url)); si ya hay faltantes en rojo no se repiten */
  const br = err.length ? [] : [...new Set([...text.matchAll(/\[([^\]\n]{2,40})\](?!\()/g)].map(m => m[1]).filter(x => /\p{L}/u.test(x) && !/^[x ]$/i.test(x)))].map(x => `«${x}» sin reemplazar`);
  return { err, pen: [...pen, ...F.filter(f => !f.ok && !has(f.l)).map(f => f.l), ...br], ok: F.filter(f => f.ok).map(f => f.l), sp: spellOf(text) };
}
const revLevel = (r: Rev) => (r.err.length ? "err" : r.pen.length || r.sp.length ? "pen" : "ok");
const LV = {
  err: { l: "Falta algo", c: "border-red-500/45 bg-red-500/10 text-red-700 dark:text-red-300", d: "bg-red-500", I: CircleAlert },
  pen: { l: "Pendiente", c: "border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-300", d: "bg-amber-400", I: CircleDashed },
  ok: { l: "Está bien", c: "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", d: "bg-emerald-500", I: CircleCheck },
} as const;

/* botón «Revisar» con el semáforo; al tocarlo abre el detalle debajo (o donde se ponga <RevPanel/>) */
export function RevButton({ r, open, onClick, className }: { r: Rev; open?: boolean; onClick: () => void; className?: string }) {
  const k = revLevel(r), x = LV[k];
  return (
    <button type="button" onClick={onClick} aria-expanded={open} title={x.l}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", x.c, className)}>
      <ListChecks className="size-3.5" />Revisar
      <span className={cn("size-2 rounded-full", x.d, k !== "ok" && "animate-pulse")} />
      {k !== "ok" && <span className="tabular-nums">{k === "err" ? r.err.length : r.pen.length + r.sp.length}</span>}
    </button>);
}
export function RevPanel({ r, onClose, onFix, className }: { r: Rev; onClose?: () => void; onFix?: () => void; className?: string }) {
  const k = revLevel(r), x = LV[k];
  const row = (t: "err" | "pen" | "ok", s: string) => { const I = LV[t].I; return (
    <li key={t + s} className="flex items-start gap-2 py-1"><I className={cn("mt-0.5 size-3.5 shrink-0", t === "err" ? "text-red-500" : t === "pen" ? "text-amber-500" : "text-emerald-500")} />
      <span><b className="font-semibold">{t === "err" ? "Falta" : t === "pen" ? "Pendiente" : "Bien"}:</b> {s}</span></li>); };
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 text-xs", x.c, className)} role="status">
      <div className="flex items-center gap-2"><x.I className="size-4" /><p className="flex-1 text-[13px] font-bold">{x.l}
        <span className="ml-1.5 font-medium opacity-75">{k === "err" ? `· ${r.err.length} sin completar` : k === "pen" ? `· ${r.pen.length + r.sp.length} para mirar` : r.ok.length ? `· ${r.ok.length} campos completos` : "· listo para copiar"}</span></p>
        {onClose && <button aria-label="Cerrar revisión" onClick={onClose} className="rounded p-0.5 opacity-70 hover:opacity-100"><X className="size-3.5" /></button>}</div>
      {(r.err.length > 0 || r.pen.length > 0) && <ul className="mt-1.5 grid gap-x-4 border-t border-black/10 dark:border-white/10 pt-1.5 text-slate-700 sm:grid-cols-2 dark:text-slate-200">{r.err.map(s => row("err", s))}{r.pen.map(s => row("pen", s))}</ul>}
      {r.sp.length > 0 && <div className="mt-1.5 border-t border-black/10 pt-1.5 text-slate-700 dark:border-white/10 dark:text-slate-200">
        <p className="flex flex-wrap items-center gap-2"><SpellCheck className="size-3.5 text-amber-500" /><b className="font-semibold">Ortografía:</b>
          {r.sp.map(([a, b]) => <span key={a} className="rounded bg-black/5 px-1.5 py-px dark:bg-white/10"><s className="opacity-60">{a}</s> → <b>{b}</b></span>)}
          {onFix && <button type="button" onClick={onFix} className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white hover:brightness-110"><Wand2 className="size-3" />Corregir</button>}</p></div>}
      {k === "ok" && r.ok.length > 0 && <p className="mt-1 text-slate-600 dark:text-slate-300">{r.ok.slice(0, 14).join(" · ")}{r.ok.length > 14 ? " …" : ""}</p>}
    </div>);
}
/* versión completa: botón + panel debajo */
export function Revisar({ text = "", err, pen, className, onFix }: { text?: string; err?: string[]; pen?: string[]; className?: string; onFix?: (t: string) => void }) {
  const [o, setO] = useState(false);
  const r = useMemo(() => revOf(text, err, pen), [text, err, pen]);
  return <div className={cn("space-y-2", className)}><RevButton r={r} open={o} onClick={() => setO(!o)} />{o && <RevPanel r={r} onClose={() => setO(false)} onFix={onFix && (() => onFix(fixSpell(text)))} />}</div>;
}
