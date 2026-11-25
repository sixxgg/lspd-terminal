/* Manuales (solo six): manuales escritos por bloques, al estilo de la terminal. Texto, títulos, listas, tareas, desplegables, citas,
   avisos, código, tablas, separadores, imágenes, videos de YouTube y enlaces a otros manuales. Cada manual tiene su color, su logo
   de fondo y su portada; se edita, se exporta a PDF (imprimir › Guardar como PDF) y se borra.
   Datos: lspdt.six.man.<id> (privado de six: el servidor no se lo da a nadie más) e imágenes aparte en lspdt.six.manimg.<id>.
   Al abrir por primera vez se crea el «Manual de gestión de tácticos», nuestra versión, para editarlo desde ahí. */
import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent as KEv, type ReactNode } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, BookMarked, Check, ChevronRight, CircleCheck, Code2, Copy, Eye, FileDown, FileText, GripVertical, Heading1, Heading2, Heading3,
  ImagePlus, Info, Lightbulb, List, ListChecks, ListOrdered, Minus, OctagonAlert, Palette, Pencil, Plus, Quote, Repeat2, Save, SquarePlay, Table, Trash2, TriangleAlert, Type, X,
  type LucideIcon } from "lucide-react";
import { Button, Card, Empty, Input, SearchInput } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { LS, useStoreVersion } from "@/lib/store";
import { PROF } from "@/lib/nick";
import { logoOf } from "@/lib/dept";
import { SATD_LOGO, norm, srcOf } from "@/lib/domain";
import { readImg } from "@/lib/patrol";
import { safeHtml } from "@/lib/richtext";
import { cn } from "@/lib/cn";

/* ---------- modelo ---------- */
type BT = "p" | "h1" | "h2" | "h3" | "ul" | "ol" | "todo" | "toggle" | "quote" | "callout" | "code" | "table" | "hr" | "img" | "yt" | "doc";
type Tone = "info" | "warn" | "ok" | "err";
type It = { id: string; h: string; ok?: boolean };
type Blk = { id: string; t: BT; h?: string; items?: It[]; rows?: string[][]; tone?: Tone; title?: string; img?: string; url?: string; ref?: string };
type LogoK = "dept" | "lspd" | "lssd" | "sahp" | "satd" | "none";
type Man = { id: string; title: string; sub?: string; tag?: string; color: string; logo: LogoK; mark?: boolean; cover?: string; blocks: Blk[]; upd: number; by?: string };

const KP = "lspdt.six.man.", KI = "lspdt.six.manimg.", SEED = "lspdt.six.manSeed";
const uid = () => Math.random().toString(36).slice(2, 10);
const TEXT: BT[] = ["p", "h1", "h2", "h3", "quote", "callout"], LISTS: BT[] = ["ul", "ol", "todo"];
const COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#7c3aed", "#475569"];

/* lo inline que se guarda: negrita, cursiva, subrayado, tachado, color y saltos de línea */
const inl = (h = "") => safeHtml(h).replace(/<\/(div|li|h3|blockquote)>/g, "<br>").replace(/<\/?(div|ul|ol|li|h3|blockquote)>/g, "").replace(/(<br>)+$/, "");
const plain = (h = "") => new DOMParser().parseFromString(`<div>${h}</div>`, "text/html").body.textContent || "";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mdIn = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const ytId = (u = "") => /(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/.exec(u)?.[1] || "";
const imgOf = (k = "") => (k ? srcOf(LS.get(KI + k) || "") : "");

const mk = (t: BT, h = ""): Blk => {
  const id = uid();
  if (LISTS.includes(t)) return { id, t, items: [{ id: uid(), h }] };
  if (t === "table") return { id, t, rows: [["", "", ""], ["", "", ""], ["", "", ""]] };
  if (t === "callout") return { id, t, h, tone: "info" };
  if (t === "toggle") return { id, t, title: h, h: "" };
  return { id, t, h };
};
const P = (h = "") => mk("p", mdIn(h)), H = (t: "h1" | "h2" | "h3", h: string) => mk(t, mdIn(h));
const L = (t: "ul" | "ol" | "todo", ...xs: string[]): Blk => ({ id: uid(), t, items: xs.map(h => ({ id: uid(), h: mdIn(h) })) });
const C = (tone: Tone, h: string): Blk => ({ id: uid(), t: "callout", tone, h: mdIn(h) });
const T = (title: string, h: string): Blk => ({ id: uid(), t: "toggle", title: mdIn(title), h: mdIn(h) });
const TB = (rows: string[][]): Blk => ({ id: uid(), t: "table", rows: rows.map(r => r.map(mdIn)) });
const HR = (): Blk => ({ id: uid(), t: "hr" });

/* texto pegado o con atajos tipo markdown → bloques */
function mdBlocks(text: string): Blk[] {
  const out: Blk[] = []; let list: Blk | null = null;
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const s = raw.trim(); if (!s) { list = null; continue; }
    let m: RegExpExecArray | null, lt: BT | null = null, body = s;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(s))) { out.push(H(("h" + m[1].length) as "h1", m[2])); list = null; continue; }
    if (/^(-{3,}|_{3,})$/.test(s)) { out.push(HR()); list = null; continue; }
    if ((m = /^>\s?(.*)$/.exec(s))) { out.push({ id: uid(), t: "quote", h: mdIn(m[1]) }); list = null; continue; }
    if ((m = /^\[( |x)?\]\s+(.*)$/i.exec(s))) { lt = "todo"; body = m[2]; }
    else if ((m = /^[-*•·]\s+(.*)$/.exec(s))) { lt = "ul"; body = m[1]; }
    else if ((m = /^\d+[.)]\s+(.*)$/.exec(s))) { lt = "ol"; body = m[1]; }
    if (lt) { if (!list || list.t !== lt) { list = { id: uid(), t: lt, items: [] }; out.push(list); } list.items!.push({ id: uid(), h: mdIn(body) }); continue; }
    list = null; out.push(P(s));
  }
  return out;
}

/* ---------- plantillas ---------- */
const TPL: { k: string; l: string; d: string; icon: LucideIcon; color: string; tag?: string; sub?: string; blocks: () => Blk[] }[] = [
  { k: "blank", l: "En blanco", d: "Empezás de cero", icon: FileText, color: "#2563eb", blocks: () => [P()] },
  { k: "manual", l: "Manual o normativa", d: "Secciones, avisos y preguntas frecuentes", icon: BookMarked, color: "#2563eb", blocks: () => [
    C("warn", "Resumen o aviso importante del manual."), H("h1", "1. Introducción"), P(), H("h1", "2. Normas"), L("ul", ""), T("Preguntas frecuentes", "")] },
  { k: "proc", l: "Procedimiento", d: "Objetivo, pasos en orden y notas", icon: ListOrdered, color: "#0ea5e9", blocks: () => [
    P("Para qué sirve y cuándo se aplica."), H("h1", "Pasos"), L("ol", ""), C("info", "Tené en cuenta…"), H("h1", "Notas"), P()] },
  { k: "acta", l: "Acta de reunión", d: "Asistentes, temas y acuerdos", icon: ListChecks, color: "#16a34a", blocks: () => [
    H("h2", "Asistentes"), L("ul", ""), H("h2", "Temas tratados"), L("ol", ""), H("h2", "Acuerdos"), L("todo", "")] },
  { k: "tac", l: "Gestión de tácticos (TAC)", d: "487, 254-V, cod.77 y el manual de gestión del TAC", icon: Lightbulb, color: "#dc2626", tag: "LSPD · Mando", sub: "Cómo se manda un táctico en el LSPD de Eleven Project", blocks: tacBlocks },
];
function tacBlocks(): Blk[] {
  return [
    C("info", "Manual propio del LSPD, adaptado a la base de Eleven Project. Ordena **quién manda, quién negocia y cómo sale cada unidad** en un táctico."),
    H("h1", "1. Qué es el TAC"),
    P("En este manual, **TAC** es la **frecuencia táctica de radio** donde se juntan varias unidades para coordinarse durante una intervención."),
    C("warn", "No confundir con la **Alerta Táctica** (TAC 0 a TAC 3): esa obliga a adaptar el rol de todo el servidor, no es la frecuencia."),
    H("h1", "2. Jurisdicción y mando"),
    P("Un 487 puede ser en el **sur** o en el **norte**. La primera unidad que llega designa quién manda el táctico."),
    TB([["Jurisdicción", "Mando", "Negociadores", "Si faltan unidades"],
      ["Sur · LSPD", "Del sur. Prioridad: **SWAT** › **METRO** › **Oficial III**", "Unidad de negociación de la **METRO**", "**6-ADAM** por radio interna al LSSD y a la SAHP"],
      ["Norte · LSSD", "Prioridad del Sheriff: su METRO, el **SEB**", "Unidad de negociación del **SEB**", "El LSSD nos pide **6-ADAM**"]]),
    H("h1", "3. Roles en un 487"),
    P("Se reparten **durante el 487**, en este orden:"),
    L("ol", "**MANDO** del 487.", "**Primer negociador.**", "**Segundo negociador**, por si el primero no rinde.", "**METRO, SWAT, SEB, SOU y SAHP:** perímetro y cierre de calles para evitar inconvenientes."),
    L("ul", "**Cod.8:** para gestionar a los heridos y el estado de salud de los rehenes.", "**Aire:** según lo que se negocie, el helicóptero se retira unos minutos (no hay un tiempo fijo) durante el 487 o durante el 254-V."),
    H("h1", "4. Huida (254-V)"),
    L("ul", "El **MANDO** designa la **unidad de cabeza**, la **unidad de cola** y las **unidades de cod.100**.",
      "**En cabeza:** un interceptor con licencia de **HSIU**. **En cola:** el segundo vehículo más rápido, que no sea de la HSIU.",
      "Que el vehículo de huida sea rápido ya se contempla en la **negociación**: no se negocia por interceptores. Rara vez se retira la unidad de interceptores.",
      "Las unidades del perímetro se suman al 254-V como **cod.100**: van por **calles paralelas o aledañas**, nunca a la par del 254-V."),
    H("h1", "5. Cod.77 (bloqueo)"),
    C("err", "Cuando se informa un cod.77 por radio, o antes de llegar al vehículo donde se va a hacer, la **prioridad del MANDO** es ordenar que **el aire despegue** y se sume al **254-V**."),
    H("h3", "Clave Robert · Art. 22"),
    P("Prohibido activarla para **pinchar ruedas en zonas urbanas o pobladas**: solo en **vías secundarias, autopistas o zonas despobladas**. Disparar para abatir a quien huye de espaldas sin peligro inminente es motivo de causa judicial."),
    /* lo que sigue resume el «Manual de gestión del TAC» (Sgt. I Custer): una guía, no un protocolo cerrado */
    H("h1", "6. Asignar el TAC"),
    L("ul", "**TAC conjunto:** se pide directo al otro mando en avisos prioritarios (secuestro masivo o de compañeros, tiroteo masivo, cod.99 prioritario, robo a sucursal bancaria o a entidad federal).",
      "**TAC propio:** cuando no hace falta ayuda de otro mando. Si las unidades no alcanzan, pasa a conjunto."),
    C("info", "Al pedir adicionales, el mando que los pide da siempre **tres datos**: **1)** la frecuencia táctica, **2)** un resumen breve del incidente y **3)** cuántas unidades o Adams necesita."),
    H("h1", "7. Entrar al TAC"),
    P("Al entrar se **designa un mando** (voluntario o, si no hay, el que elija el **rango más alto**). Desde ahí, todas las unidades quedan a sus órdenes sin importar el rango. Los superiores supervisan y, si hace falta, pueden intervenir, destituir o asumir el mando."),
    TB([["Rol", "Qué hace"], ["Supervisor", "Supervisa al mando y lo apoya; en un caso extremo designa otro mando"], ["Mando", "Organiza y lleva el TAC; responde por que se resuelva lo mejor y más rápido posible"], ["Unidades ordinarias", "Cumplen lo que el mando les encarga y le pasan información clara"]]),
    H("h1", "8. El mando"),
    P("El mando **no** atiende heridos, ni procesa detenidos, ni hace perímetro, ni negocia: **organiza, gestiona y controla**. Si sobran unidades, no hace otra tarea."),
    T("Deberes", "**Número de unidades** (pedir más o dar cod.4 a las que sobran) · **Recursos** (aire, unidades tácticas, interceptores) · **Gestión general** (decidir, no esperar) · **Delegar** funciones · **Conocer la situación general** de cada unidad."),
    T("Derechos", "Pedir ayuda · Dar **cod.4** (justificado) · **Prioridad en radio** junto con la supervisión · Pedir información a cualquier unidad · Ordenar y dividir unidades · **Finalizar el TAC** (10.98)."),
    T("Recursos", "**Piloto de ocupado** para distinguir a quién se puede usar · **Separar TACs** si hay varias situaciones · **Distintivo** delante del nombre · **Referencias de patrulla** de colores en el GPS · **Tomar distancia** para ver el conjunto · **Micro gestión** (ordenar, no esperar voluntarios) · **No ser el primero** en entrar · Sin miedo a ordenarle a un superior · **Mando operaciones** con radio interna para unidades tácticas y negociadores."),
    H("h1", "9. Unidades ordinarias"),
    L("ul", "**Deberes:** seguir las órdenes del mando, darle **información detallada** y mantener la **disciplina en radio** (llamar primero y esperar el visto bueno).",
      "**Derechos:** pedir ayuda (mejor por interna), dar comunicados **prioritarios** («ADAM-XX para mando, PRIORITARIO») y un **debriefing** con el mando al terminar.",
      "**Recursos:** el **teléfono** para no saturar la radio, el **10.20** y **callouts** con puntos fáciles de reconocer (ej.: «10.20 al lado de la gasolinera de Viñedos»)."),
    H("h1", "10. Tipos de TAC"),
    TB([["Tipo", "Qué pasa", "Prioridades del mando"],
      ["Incidente pasivo", "Se acude a socorrer a las víctimas; la policía no está en el tiroteo", "Recoger pruebas (detectives), atender PH con el SAED, prever persecuciones y acordonar"],
      ["Incidente activo", "Hay unidades implicadas en el tiroteo", "Neutralizar la amenaza sin aislar a nadie, rescatar PH, prever persecuciones y asegurar la zona (evitar más escalada)"],
      ["Secuestro activo", "Lo central es localizar y rescatar rehenes; suele ser móvil", "Repartir unidades (no todas a la zona), montar aire, zonas de búsqueda, negociar, prever persecución y atrincheramiento"]]),
    T("Disposición final", "Cada TAC es distinto: hay que ser **flexible** y adaptarse. Sin miedo a decidir ni a equivocarse; se aprende de los errores y de las críticas de quien quiere ayudar."),
  ];
}

/* ---------- menú de bloques ---------- */
type MI = { t: BT; l: string; d: string; i: LucideIcon; kw?: string };
const MENU: { g: string; items: MI[] }[] = [
  { g: "Básicos", items: [{ t: "p", l: "Texto", d: "Párrafo normal", i: Type }, { t: "h1", l: "Título 1", d: "Sección grande", i: Heading1, kw: "encabezado" },
    { t: "h2", l: "Título 2", d: "Sección mediana", i: Heading2, kw: "encabezado" }, { t: "h3", l: "Título 3", d: "Sección chica", i: Heading3, kw: "encabezado" }] },
  { g: "Listas", items: [{ t: "ul", l: "Viñetas", d: "Lista con puntos", i: List }, { t: "ol", l: "Numerada", d: "Lista en orden", i: ListOrdered },
    { t: "todo", l: "Tareas", d: "Checklist con casillas", i: ListChecks, kw: "checklist" }, { t: "toggle", l: "Desplegable", d: "Se abre y se cierra", i: ChevronRight, kw: "faq" }] },
  { g: "Bloques", items: [{ t: "quote", l: "Cita", d: "Texto destacado", i: Quote }, { t: "callout", l: "Aviso", d: "Recuadro con color", i: Lightbulb, kw: "callout nota" },
    { t: "code", l: "Código", d: "Texto fijo para copiar", i: Code2 }, { t: "table", l: "Tabla", d: "3 × 3 con cabecera", i: Table }, { t: "hr", l: "Separador", d: "Línea divisoria", i: Minus }] },
  { g: "Medios", items: [{ t: "img", l: "Imagen", d: "Archivo, pegar o arrastrar", i: ImagePlus, kw: "foto" }, { t: "yt", l: "Video de YouTube", d: "Con su link", i: SquarePlay, kw: "youtube" }] },
  { g: "Enlaces", items: [{ t: "doc", l: "Otro manual", d: "Enlace a otro de tus manuales", i: BookMarked, kw: "documento link" }] },
];
const ALL = MENU.flatMap(g => g.items);

function BlockMenu({ x, y, title, onPick, onClose }: { x: number; y: number; title?: string; onPick: (t: BT) => void; onClose: () => void }) {
  const [q, setQ] = useState(""), [i, setI] = useState(0);
  const list = useMemo(() => { const n = norm(q); return n ? ALL.filter(m => norm(m.l + " " + m.d + " " + (m.kw || "")).includes(n)) : ALL; }, [q]);
  const top = Math.max(8, Math.min(y, window.innerHeight - 420)), left = Math.max(8, Math.min(x, window.innerWidth - 300));
  const key = (e: KEv) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((i + 1) % Math.max(1, list.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setI((i - 1 + list.length) % Math.max(1, list.length)); }
    else if (e.key === "Enter") { e.preventDefault(); if (list[i]) onPick(list[i].t); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };
  let n = -1;
  return (<>
    <div className="fixed inset-0 z-40" onMouseDown={onClose} />
    <div className="fixed z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ top, left }}>
      <div className="border-b border-slate-100 p-2 dark:border-slate-800">
        {title && <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>}
        <Input autoFocus value={q} onChange={e => { setQ(e.target.value); setI(0); }} onKeyDown={key} placeholder="Buscar bloque…" className="h-9" /></div>
      <div className="max-h-80 overflow-y-auto p-1.5">
        {MENU.map(g => { const its = g.items.filter(m => list.includes(m)); if (!its.length) return null;
          return (<div key={g.g}><p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.g}</p>
            {its.map(m => { n++; const on = n === i, k = n;
              return (<button key={m.t} type="button" onMouseEnter={() => setI(k)} onClick={() => onPick(m.t)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition", on ? "bg-slate-100 dark:bg-slate-800" : "")}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 [&>svg]:size-4"><m.i /></span>
                <span className="min-w-0"><span className="block text-sm font-medium text-slate-900 dark:text-white">{m.l}</span><span className="block truncate text-xs text-slate-500">{m.d}</span></span>
              </button>); })}</div>); })}
        {!list.length && <p className="px-2 py-6 text-center text-sm text-slate-500">Sin resultados</p>}
      </div>
    </div></>);
}

/* ---------- edición de texto (contentEditable sin control: React no le pisa el cursor) ---------- */
function Ed({ id, html, ph, className, onChange, onKey, onPaste }: { id: string; html: string; ph?: string; className?: string; onChange: (h: string, el: HTMLDivElement) => void; onKey?: (e: KEv<HTMLDivElement>, el: HTMLDivElement) => void; onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void }) {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => { if (r.current) r.current.innerHTML = html; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={r} data-bid={id} contentEditable suppressContentEditableWarning data-ph={ph} spellCheck
    className={cn("man-ed min-w-0 break-words outline-none", className)}
    onInput={e => { const el = e.currentTarget; if (!el.textContent && !el.querySelector("img")) el.innerHTML = ""; onChange(el.innerHTML, el); }}
    onKeyDown={e => onKey?.(e, e.currentTarget)}
    onPaste={e => { if (onPaste) { onPaste(e); if (e.defaultPrevented) return; } const t = e.clipboardData.getData("text/plain"); e.preventDefault(); document.execCommand("insertHTML", false, esc(t).replace(/\n/g, "<br>")); }} />;
}
const sel = () => window.getSelection();
const caretTo = (el: HTMLElement, end = true) => { const s = sel(); if (!s) return; const r = document.createRange(); r.selectNodeContents(el); r.collapse(!end); s.removeAllRanges(); s.addRange(r); };
const edge = (el: HTMLElement, start: boolean) => { const s = sel(); if (!s?.rangeCount || !s.isCollapsed) return false; const r = document.createRange(); r.selectNodeContents(el);
  if (start) r.setEnd(s.anchorNode!, s.anchorOffset); else r.setStart(s.anchorNode!, s.anchorOffset); return !r.toString().length; };
const splitRest = (el: HTMLElement) => { const s = sel(); if (!s?.rangeCount) return ""; const r = s.getRangeAt(0); r.deleteContents();
  const t = document.createRange(); t.setStart(r.endContainer, r.endOffset); t.setEnd(el, el.childNodes.length); const box = document.createElement("div"); box.appendChild(t.extractContents());
  return plain(box.innerHTML).trim() ? box.innerHTML : ""; };

/* ---------- estilos de los bloques (los comparten la vista y el editor) ---------- */
const TONE: Record<Tone, { i: LucideIcon; l: string; c: string }> = {
  info: { i: Info, l: "Información", c: "var(--mc)" }, warn: { i: TriangleAlert, l: "Atención", c: "#d97706" }, ok: { i: CircleCheck, l: "Correcto", c: "#16a34a" }, err: { i: OctagonAlert, l: "Importante", c: "#dc2626" } };
const TONES = Object.keys(TONE) as Tone[];
const tint = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
const BODY = "text-[15px] leading-7 text-slate-700 dark:text-slate-300";
const HCLS: Record<string, string> = {
  h1: "font-display text-[26px] font-semibold leading-tight text-slate-900 dark:text-white",
  h2: "font-display text-xl font-semibold leading-snug text-slate-900 dark:text-white",
  h3: "text-base font-semibold text-slate-900 dark:text-white" };
const PH: Partial<Record<BT, string>> = { p: "Escribí, o tocá / para insertar un bloque", h1: "Título 1", h2: "Título 2", h3: "Título 3", quote: "Cita", callout: "Escribí el aviso" };

function Html({ h, className }: { h?: string; className?: string }) { return <div className={cn("min-w-0 break-words", className)} dangerouslySetInnerHTML={{ __html: inl(h) }} />; }

function logoSrc(l: LogoK): string {
  if (l === "none") return "";
  if (l === "satd") return srcOf(LS.get(SATD_LOGO) || "") || logoOf();
  return l === "dept" ? logoOf() : logoOf("", l);
}

/* ---------- PDF: documento aparte, claro y listo para imprimir (Guardar como PDF) ---------- */
function exportPdf(m: Man, all: Man[]) {
  const abs = (u: string) => (u.startsWith("/") ? location.origin + u : u), lg = abs(logoSrc(m.logo)), c = m.color;
  const raw = (k = "") => LS.get(KI + k) || "";
  const blk = (b: Blk): string => {
    const items = (tag: string) => `<${tag}>${(b.items || []).map(x => `<li>${b.t === "todo" ? `<span class="bx">${x.ok ? "☑" : "☐"}</span> ` : ""}${inl(x.h)}</li>`).join("")}</${tag}>`;
    switch (b.t) {
      case "p": return `<p>${inl(b.h)}</p>`;
      case "h1": case "h2": case "h3": return `<${b.t}>${inl(b.h)}</${b.t}>`;
      case "ul": case "todo": return items("ul" + (b.t === "todo" ? ' class="todo"' : ""));
      case "ol": return items("ol");
      case "quote": return `<blockquote>${inl(b.h)}</blockquote>`;
      case "callout": { const t = TONE[b.tone || "info"], col = t.c === "var(--mc)" ? c : t.c; return `<div class="co" style="border-color:${col};background:${col}14"><span class="lb" style="color:${col}">${t.l}</span><div>${inl(b.h)}</div></div>`; }
      case "toggle": return `<div class="tg"><b>${inl(b.title)}</b><div>${inl(b.h)}</div></div>`;
      case "code": return `<pre>${esc(b.h || "")}</pre>`;
      case "table": return `<table>${(b.rows || []).map((r, i) => `<tr>${r.map(x => i ? `<td>${inl(x)}</td>` : `<th>${inl(x)}</th>`).join("")}</tr>`).join("")}</table>`;
      case "hr": return "<hr>";
      case "img": return raw(b.img) ? `<figure><img src="${raw(b.img)}">${b.h ? `<figcaption>${inl(b.h)}</figcaption>` : ""}</figure>` : "";
      case "yt": return ytId(b.url) ? `<p class="lk">▶ Video: https://youtu.be/${ytId(b.url)}</p>` : "";
      case "doc": { const o = all.find(x => x.id === b.ref); return o ? `<p class="lk">📘 Ver también: <b>${esc(o.title)}</b></p>` : ""; }
    }
    return "";
  };
  const date = new Date(m.upd || Date.now()).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(m.title || "Manual")}</title><style>
@page{size:A4;margin:14mm 14mm 16mm;@bottom-right{content:"Página " counter(page) " de " counter(pages);font:8pt "Segoe UI",Arial,sans-serif;color:#94a3b8}@bottom-left{content:"${esc(m.title || "Manual").replace(/"/g, "'")}";font:8pt "Segoe UI",Arial,sans-serif;color:#94a3b8}}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font:11pt/1.6 "Segoe UI",Inter,system-ui,Arial,sans-serif;color:#1e293b;margin:0;padding:5mm 6mm;orphans:3;widows:3}
.frame{position:fixed;inset:0;border:1.2pt solid ${c}59;border-radius:5pt;pointer-events:none}
.wm{position:fixed;top:50%;left:50%;width:62%;transform:translate(-50%,-50%);opacity:.06;z-index:-1}
header{display:flex;gap:16px;align-items:center;padding-bottom:14px;border-bottom:3px solid ${c};margin-bottom:22px}
header img{width:64px;height:64px;object-fit:contain}.tag{font-size:8.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${c}}
header h1{font-size:22pt;line-height:1.15;margin:2px 0 3px;border:0;padding:0}.sub{color:#64748b;font-size:10pt}.date{color:#94a3b8;font-size:8.5pt;margin-top:2px}
.cv{width:100%;height:150px;object-fit:cover;border-radius:10px;margin-bottom:18px}
h1,h2,h3{color:#0f172a;break-after:avoid;page-break-after:avoid;margin:20px 0 6px}h1+*,h2+*,h3+*{break-before:avoid}h1{font-size:16pt;border-left:4px solid ${c};padding-left:10px}h2{font-size:13pt}h3{font-size:11.5pt}
p{margin:6px 0}ul,ol{margin:6px 0;padding-left:22px}li{margin:3px 0}ul.todo{list-style:none;padding-left:4px}.bx{color:${c}}
blockquote{margin:10px 0;padding:6px 14px;border-left:3px solid ${c};color:#475569;font-style:italic}
.co{border:1px solid #e2e8f0;border-left:4px solid;border-radius:6pt;padding:9px 14px;margin:10px 0;break-inside:avoid}.co .lb{display:block;font-weight:700;font-size:8.5pt;text-transform:uppercase;letter-spacing:.08em}
.tg{border:1px solid #cbd5e1;border-radius:6pt;padding:9px 14px;margin:10px 0;break-inside:avoid}
pre{background:#f1f5f9;border-radius:8px;padding:10px 14px;font:9.5pt/1.5 Consolas,monospace;white-space:pre-wrap;break-inside:avoid}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10pt;border:1px solid #cbd5e1}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #cbd5e1;padding:6px 9px;text-align:left;vertical-align:top}th{background:${c}1a;font-weight:700}
hr{border:0;border-top:1px solid #e2e8f0;margin:16px 0}figure{margin:12px 0;break-inside:avoid}figure img{max-width:100%;max-height:200mm;border-radius:6pt;border:1px solid #e2e8f0}figcaption{font-size:9pt;color:#64748b}.lk{color:${c}}
</style></head><body><div class="frame"></div>${lg && m.mark !== false ? `<img class="wm" src="${lg}">` : ""}
${raw(m.cover) ? `<img class="cv" src="${raw(m.cover)}">` : ""}<header>${lg ? `<img src="${lg}">` : ""}<div>${m.tag ? `<div class="tag">${esc(m.tag)}</div>` : ""}<h1>${esc(m.title || "Sin título")}</h1>${m.sub ? `<div class="sub">${esc(m.sub)}</div>` : ""}<div class="date">Actualizado el ${date}</div></div></header>
${m.blocks.map(blk).join("\n")}</body></html>`;
  const f = document.createElement("iframe"); f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f); const w = f.contentWindow!; w.document.open(); w.document.write(html); w.document.close();
  const t0 = document.title, go = () => { document.title = m.title || "Manual"; w.focus(); w.print(); document.title = t0; setTimeout(() => f.remove(), 2000); };
  void Promise.all([...w.document.images].map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })))).then(() => setTimeout(go, 120));
}

/* ---------- vista de un bloque (lectura) ---------- */
function View({ b, all, onOpen, onTodo }: { b: Blk; all: Man[]; onOpen: (id: string) => void; onTodo: (b: Blk, i: number) => void }) {
  switch (b.t) {
    case "p": return <Html h={b.h} className={cn(BODY, !b.h && "h-4")} />;
    case "h1": return <h2 id={"m-" + b.id} className={cn(HCLS.h1, "flex scroll-mt-24 items-center gap-3 pt-5")}><span className="h-6 w-1 shrink-0 rounded-full" style={{ background: "var(--mc)" }} /><Html h={b.h} /></h2>;
    case "h2": return <h3 id={"m-" + b.id} className={cn(HCLS.h2, "scroll-mt-24 pt-3")}><Html h={b.h} /></h3>;
    case "h3": return <h4 id={"m-" + b.id} className={cn(HCLS.h3, "scroll-mt-24 pt-2")}><Html h={b.h} /></h4>;
    case "ul": case "ol": { const Tag = b.t === "ol" ? "ol" : "ul";
      return <Tag className={cn(BODY, "space-y-1.5")}>{(b.items || []).map((x, i) => (
        <li key={x.id} className="flex gap-3">{b.t === "ol" ? <span className="grid size-6 shrink-0 translate-y-0.5 place-items-center rounded-md text-xs font-bold" style={{ background: tint("var(--mc)", 14), color: "var(--mc)" }}>{i + 1}</span>
          : <span className="mt-[11px] size-1.5 shrink-0 rounded-full" style={{ background: "var(--mc)" }} />}<Html h={x.h} className="flex-1" /></li>))}</Tag>; }
    case "todo": return <ul className={cn(BODY, "space-y-1")}>{(b.items || []).map((x, i) => (
      <li key={x.id} className="flex gap-3"><button type="button" onClick={() => onTodo(b, i)} aria-label={x.ok ? "Desmarcar" : "Marcar"} className={cn("mt-1 grid size-5 shrink-0 place-items-center rounded-md border transition", x.ok ? "border-transparent text-white" : "border-slate-300 dark:border-slate-600")} style={x.ok ? { background: "var(--mc)" } : undefined}>{x.ok && <Check className="size-3.5" />}</button>
        <Html h={x.h} className={cn("flex-1", x.ok && "text-slate-400 line-through")} /></li>))}</ul>;
    case "toggle": return <details className="group rounded-xl border border-slate-200 open:bg-slate-50/60 dark:border-slate-800 dark:open:bg-slate-900/40"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-medium text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden"><ChevronRight className="size-4 shrink-0 text-slate-400 transition group-open:rotate-90" /><Html h={b.title} /></summary><Html h={b.h} className={cn(BODY, "px-4 pb-3 pl-10")} /></details>;
    case "quote": return <blockquote className="border-l-[3px] py-1 pl-4 text-[15px] italic leading-7 text-slate-600 dark:text-slate-300" style={{ borderColor: "var(--mc)" }}><Html h={b.h} /></blockquote>;
    case "callout": { const t = TONE[b.tone || "info"];
      return <div className="flex gap-3 rounded-xl border px-4 py-3" style={{ borderColor: tint(t.c, 35), background: tint(t.c, 9) }}><t.i className="mt-1 size-5 shrink-0" style={{ color: t.c }} /><Html h={b.h} className={cn(BODY, "flex-1")} /></div>; }
    case "code": return <CodeView s={b.h || ""} />;
    case "table": return <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full text-sm"><tbody>{(b.rows || []).map((r, i) => (
      <tr key={i} className={cn(i && "border-t border-slate-200 dark:border-slate-800")}>{r.map((x, j) => i ? <td key={j} className="px-3 py-2 align-top text-slate-700 dark:text-slate-300"><Html h={x} /></td>
        : <th key={j} className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-white" style={{ background: tint("var(--mc)", 10) }}><Html h={x} /></th>)}</tr>))}</tbody></table></div>;
    case "hr": return <hr className="my-2 border-slate-200 dark:border-slate-800" />;
    case "img": { const s = imgOf(b.img); return s ? <figure><img src={s} alt="" className="max-h-[32rem] w-full rounded-xl object-contain" />{b.h && <Html h={b.h} className="mt-1.5 text-center text-xs text-slate-500" />}</figure> : null; }
    case "yt": { const y = ytId(b.url); return y ? <div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${y}`} title="Video de YouTube" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div> : null; }
    case "doc": { const o = all.find(x => x.id === b.ref); return o ? <DocLink m={o} onOpen={onOpen} /> : null; }
  }
  return null;
}
function CodeView({ s }: { s: string }) {
  const { toast } = useFeedback();
  return <div className="group relative"><pre className="overflow-x-auto rounded-xl bg-slate-100 px-4 py-3 font-mono text-[13px] leading-6 text-slate-800 dark:bg-slate-900 dark:text-slate-200">{s}</pre>
    <button type="button" title="Copiar" onClick={() => void navigator.clipboard.writeText(s).then(() => toast("Copiado"))} className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-white/80 text-slate-500 opacity-0 shadow-sm transition hover:text-slate-900 group-hover:opacity-100 dark:bg-slate-800/80 dark:hover:text-white"><Copy className="size-4" /></button></div>;
}
function DocLink({ m, onOpen }: { m: Man; onOpen: (id: string) => void }) {
  return <button type="button" onClick={() => onOpen(m.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
    <span className="grid size-9 place-items-center rounded-lg text-white" style={{ background: m.color }}><BookMarked className="size-4" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{m.title || "Sin título"}</span>{m.sub && <span className="block truncate text-xs text-slate-500">{m.sub}</span>}</span>
    <ChevronRight className="size-4 text-slate-400" /></button>;
}

/* ---------- la hoja: portada, logo de fondo y bloques ---------- */
function Sheet({ m, children, edit, onTitle, onSub }: { m: Man; children: ReactNode; edit?: boolean; onTitle?: (s: string) => void; onSub?: (s: string) => void }) {
  const lg = logoSrc(m.logo), cv = imgOf(m.cover);
  return (
    <Card className="relative overflow-hidden p-0" style={{ "--mc": m.color } as React.CSSProperties}>
      {lg && m.mark !== false && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-56 opacity-[.045] dark:opacity-[.06]" style={{ backgroundImage: `url("${lg}")`, backgroundRepeat: "repeat-y", backgroundSize: "min(62%, 440px)", backgroundPosition: "center 40px" }} />}
      <div className="relative h-36 [mask-image:linear-gradient(to_bottom,black_35%,transparent)] sm:h-44" style={{ background: cv ? undefined : `linear-gradient(120deg, ${tint(m.color, 55)}, ${tint(m.color, 12)} 55%, transparent)` }}>
        {cv && <img src={cv} alt="" className="absolute inset-0 size-full object-cover" />}
      </div>
      <div className={cn("relative -mt-14 px-5 pb-8", edit ? "sm:px-16" : "sm:px-10 md:px-14")}>
        <div className="flex items-end gap-4">
          {lg && <img src={lg} alt="" className="size-20 shrink-0 object-contain drop-shadow-md sm:size-24" />}
          <div className="min-w-0 flex-1 pb-1">{m.tag && <p className="text-[11px] font-bold uppercase tracking-[.16em]" style={{ color: "var(--mc)" }}>{m.tag}</p>}</div>
        </div>
        {edit ? <>
          <textarea value={m.title} onChange={e => onTitle?.(e.target.value)} rows={1} placeholder="Sin título" aria-label="Título del manual"
            className="mt-3 w-full resize-none bg-transparent font-display text-[34px] font-semibold leading-tight text-slate-900 outline-none [field-sizing:content] placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-700" />
          <input value={m.sub || ""} onChange={e => onSub?.(e.target.value)} placeholder="Subtítulo (opcional)" aria-label="Subtítulo"
            className="w-full bg-transparent text-[15px] text-slate-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700" />
        </> : <>
          <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight text-slate-900 dark:text-white">{m.title || "Sin título"}</h1>
          {m.sub && <p className="text-[15px] text-slate-500">{m.sub}</p>}
        </>}
        <div className="mb-7 mt-4 h-[3px] w-16 rounded-full" style={{ background: "var(--mc)" }} />
        {children}
      </div>
    </Card>);
}

/* alto del encabezado fijo de la terminal, para que lo pegajoso quede debajo */
function useHdr() {
  const [h, setH] = useState(8);
  useEffect(() => { const f = () => { const m = document.querySelector("[data-man]"); let p = m?.parentElement || null; while (p && !/(auto|scroll)/.test(getComputedStyle(p).overflowY)) p = p.parentElement;
      const top = p ? p.getBoundingClientRect().top : 0, hs = [...(p || document).querySelectorAll("header")].filter(e => getComputedStyle(e).position === "sticky");
      setH(Math.max(0, ...hs.map(e => e.getBoundingClientRect().bottom - top)) + 8); };
    f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return h;
}
function Toc({ blocks }: { blocks: Blk[] }) {
  const top = useHdr() + 64;
  const hs = blocks.filter(b => b.t === "h1" || b.t === "h2" || b.t === "h3").filter(b => plain(b.h).trim());
  if (hs.length < 2) return null;
  return (
    <nav style={{ top }} className="sticky hidden max-h-[calc(100vh-14rem)] overflow-y-auto rounded-2xl border border-slate-200 p-3 xl:block dark:border-slate-800">
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">En este manual</p>
      {hs.map(b => <button key={b.id} type="button" onClick={() => document.getElementById("m-" + b.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className={cn("block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
          b.t === "h2" && "pl-5", b.t === "h3" && "pl-8 text-xs")}>{plain(b.h)}</button>)}
    </nav>);
}

/* ---------- editor ---------- */
type Pop = { kind: "add" | "slash" | "turn"; id: string; x: number; y: number } | { kind: "act"; id: string; x: number; y: number };

function Editor({ m0, all, onBack, onOpen, startEdit }: { m0: Man; all: Man[]; onBack: () => void; onOpen: (id: string) => void; startEdit?: boolean }) {
  const { toast, confirm } = useFeedback();
  const [d, setD] = useState<Man>(() => structuredClone(m0)), [base, setBase] = useState(() => JSON.stringify(m0));
  const [edit, setEdit] = useState(!!startEdit), [ep, setEp] = useState(0), [pop, setPop] = useState<Pop | null>(null), [look, setLook] = useState(false), [foc, setFoc] = useState("");
  const want = useRef<{ id: string; start?: boolean } | null>(null), root = useRef<HTMLDivElement>(null), fileFor = useRef<string>(""), file = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(d) !== base, hdr = useHdr();
  useEffect(() => { const w = want.current; if (!w) return; want.current = null; const el = root.current?.querySelector<HTMLElement>(`[data-bid="${w.id}"]`); if (el) { el.focus(); caretTo(el, !w.start); } });
  const blocks = d.blocks, setBlocks = (f: (bs: Blk[]) => Blk[]) => setD(x => ({ ...x, blocks: f(x.blocks) }));
  const up = (id: string, p: Partial<Blk>) => setBlocks(bs => bs.map(b => (b.id === id ? { ...b, ...p } : b)));
  const idx = (id: string) => blocks.findIndex(b => b.id === id);
  const first = (b: Blk) => (TEXT.includes(b.t) ? b.id : LISTS.includes(b.t) ? b.items?.[0]?.id : b.t === "toggle" ? b.id + ":t" : b.t === "table" ? b.id + ":0:0" : undefined);
  const lastEd = (b: Blk) => (LISTS.includes(b.t) ? b.items?.[b.items.length - 1]?.id : b.t === "toggle" ? b.id + ":b" : TEXT.includes(b.t) ? b.id : undefined);
  const insert = (after: number, ...nb: Blk[]) => { setBlocks(bs => [...bs.slice(0, after + 1), ...nb, ...bs.slice(after + 1)]); const f = first(nb[0]); if (f) want.current = { id: f }; };
  const remove = (id: string) => { const i = idx(id); setBlocks(bs => (bs.length > 1 ? bs.filter(b => b.id !== id) : [P()])); const pv = blocks[i - 1]; const l = pv && lastEd(pv); if (l) want.current = { id: l }; };

  const save = () => {
    const c: Man = { ...d, title: d.title.trim(), upd: Date.now(), by: PROF.me, blocks: d.blocks.map(b => ({ ...b, h: b.t === "code" || b.h === undefined ? b.h : inl(b.h), title: b.title === undefined ? undefined : inl(b.title),
      items: b.items?.map(x => ({ ...x, h: inl(x.h) })), rows: b.rows?.map(r => r.map(inl)) })) };
    LS.setJSON(KP + c.id, c); setD(c); setBase(JSON.stringify(c)); toast("Manual guardado");
  };
  const discard = async () => { if (dirty && !(await confirm("¿Descartar los cambios sin guardar?", { ok: "Descartar", danger: true }))) return; setD(structuredClone(m0)); setBase(JSON.stringify(m0)); setEp(ep + 1); setEdit(false); };
  const back = async () => { if (dirty && !(await confirm("Tenés cambios sin guardar. ¿Salir igual?", { ok: "Salir", danger: true }))) return; onBack(); };
  const del = async () => {
    if (!(await confirm(`¿Borrar «${d.title || "Sin título"}»? No se puede deshacer.`, { ok: "Borrar", danger: true }))) return;
    for (const b of m0.blocks) if (b.img) LS.del(KI + b.img); if (m0.cover) LS.del(KI + m0.cover); LS.del(KP + d.id); toast("Manual borrado"); onBack();
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && edit) { e.preventDefault(); save(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });

  /* convertir un bloque en otro (conserva el texto cuando se puede) */
  const turn = (b: Blk, t: BT): Blk => {
    const txt = b.h ?? b.title ?? b.items?.map(x => x.h).filter(Boolean).join("<br>") ?? "";
    if (TEXT.includes(t)) return { id: b.id, t, h: txt, tone: t === "callout" ? b.tone || "info" : undefined };
    if (LISTS.includes(t)) return { id: b.id, t, items: b.items?.length ? b.items : [{ id: uid(), h: txt }] };
    if (t === "toggle") return { id: b.id, t, title: txt, h: "" };
    return { ...mk(t), id: b.id };
  };
  const pick = (t: BT) => {
    const p = pop; setPop(null); if (!p) return; const i = idx(p.id), b = blocks[i]; if (!b) return;
    if (p.kind === "add") { const nb = mk(t); insert(i, ...(t === "hr" ? [nb, P()] : [nb])); if (t === "img") setTimeout(() => { fileFor.current = nb.id; file.current?.click(); }, 50); return; }
    const nb = turn(b, t); setBlocks(bs => bs.map(x => (x.id === b.id ? nb : x)));
    if (t === "hr" && i === blocks.length - 1) setBlocks(bs => [...bs, P()]);
    const f = first(nb); if (f) want.current = { id: f }; else if (t === "img") setTimeout(() => { fileFor.current = nb.id; file.current?.click(); }, 50);
  };
  const openAt = (kind: Pop["kind"], id: string, el: Element) => { const r = el.getBoundingClientRect(); setPop({ kind, id, x: r.left, y: r.bottom + 6 } as Pop); };

  /* teclado en bloques de texto */
  const textKey = (b: Blk) => (e: KEv<HTMLDivElement>, el: HTMLDivElement) => {
    const i = idx(b.id);
    if (e.key === "/" && !el.textContent) { e.preventDefault(); openAt("slash", b.id, el); return; }
    if (e.key === "Enter" && !e.shiftKey && b.t !== "callout") { e.preventDefault(); const rest = splitRest(el), np: Blk = { ...P(), h: rest }; up(b.id, { h: el.innerHTML }); insert(i, np); want.current = { id: np.id, start: true }; return; }
    if (e.key === "Backspace" && edge(el, true) && sel()?.isCollapsed) {
      if (b.t === "callout" && el.textContent) return;
      if (b.t !== "p") { e.preventDefault(); setBlocks(bs => bs.map(x => (x.id === b.id ? { id: b.id, t: "p", h: el.innerHTML } : x))); want.current = { id: b.id, start: true }; return; }
      const pv = blocks[i - 1]; if (!pv) return; e.preventDefault();
      if (!el.textContent) { remove(b.id); return; }
      if (TEXT.includes(pv.t)) { const pe = root.current?.querySelector<HTMLElement>(`[data-bid="${pv.id}"]`); if (!pe) return; const at = pe.childNodes.length;
        pe.insertAdjacentHTML("beforeend", el.innerHTML); up(pv.id, { h: pe.innerHTML }); setBlocks(bs => bs.filter(x => x.id !== b.id)); pe.focus();
        const r = document.createRange(); r.setStart(pe, at); r.collapse(true); sel()?.removeAllRanges(); sel()?.addRange(r); }
      return; }
    if (e.key === "ArrowUp" && edge(el, true)) { const pv = blocks[i - 1], l = pv && lastEd(pv); if (l) { e.preventDefault(); want.current = { id: l }; setD(x => ({ ...x })); } }
    if (e.key === "ArrowDown" && edge(el, false)) { const nx = blocks[i + 1], f = nx && first(nx); if (f) { e.preventDefault(); want.current = { id: f, start: true }; setD(x => ({ ...x })); } }
  };
  /* atajos markdown al empezar a escribir en un párrafo: «# », «- », «1. », «[] », «> », «---» */
  const textInput = (b: Blk) => (h: string, el: HTMLDivElement) => {
    if (b.t === "p") { const t = el.textContent || "", m = /^(#{1,3}|[-*]|1[.)]|\[\]|>)\s/.exec(t);
      const map: Record<string, BT> = { "#": "h1", "##": "h2", "###": "h3", "-": "ul", "*": "ul", "1.": "ol", "1)": "ol", "[]": "todo", ">": "quote" };
      if (m && map[m[1]]) { const rest = esc(t.slice(m[0].length)), nb = turn({ ...b, h: rest }, map[m[1]]); setBlocks(bs => bs.map(x => (x.id === b.id ? nb : x))); const f = first(nb); if (f) want.current = { id: f }; return; }
      if (t === "---") { const i = idx(b.id); setBlocks(bs => bs.map(x => (x.id === b.id ? { id: b.id, t: "hr" } : x))); if (i === blocks.length - 1) insert(i, P()); return; } }
    up(b.id, { h });
  };
  /* pegar varias líneas en un párrafo vacío: se arma en bloques */
  const textPaste = (b: Blk) => (e: React.ClipboardEvent<HTMLDivElement>) => {
    const t = e.clipboardData.getData("text/plain"); if (!t.includes("\n") || b.t !== "p" || e.currentTarget.textContent) return;
    const nb = mdBlocks(t); if (!nb.length) return; e.preventDefault(); const i = idx(b.id);
    setBlocks(bs => [...bs.slice(0, i), ...nb, ...bs.slice(i + 1)]); const l = lastEd(nb[nb.length - 1]); if (l) want.current = { id: l };
  };
  /* listas */
  const setItems = (b: Blk, f: (xs: It[]) => It[]) => setBlocks(bs => bs.map(x => (x.id === b.id ? { ...x, items: f(x.items || []) } : x)));
  const itemKey = (b: Blk, it: It) => (e: KEv<HTMLDivElement>, el: HTMLDivElement) => {
    const xs = b.items || [], k = xs.findIndex(x => x.id === it.id), i = idx(b.id);
    if (e.key === "/" && !el.textContent && xs.length === 1) { e.preventDefault(); openAt("slash", b.id, el); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault();
      if (!el.textContent) { /* ítem vacío: sale de la lista */
        const rest = xs.slice(k + 1), keep = xs.slice(0, k), np = P();
        setBlocks(bs => { const j = bs.findIndex(x => x.id === b.id), tail: Blk[] = rest.length ? [{ id: uid(), t: b.t, items: rest }] : [];
          return [...bs.slice(0, j), ...(keep.length ? [{ ...b, items: keep }] : []), np, ...tail, ...bs.slice(j + 1)]; });
        want.current = { id: np.id }; return; }
      const rest = splitRest(el), ni: It = { id: uid(), h: rest };
      setItems(b, ys => { const out = ys.map(y => (y.id === it.id ? { ...y, h: el.innerHTML } : y)); out.splice(k + 1, 0, ni); return out; }); want.current = { id: ni.id, start: true }; return; }
    if (e.key === "Backspace" && edge(el, true) && sel()?.isCollapsed) {
      if (k === 0) { e.preventDefault(); const t = el.innerHTML, rest = xs.slice(1), np: Blk = { id: uid(), t: "p", h: t };
        setBlocks(bs => { const j = bs.findIndex(x => x.id === b.id); return [...bs.slice(0, j), np, ...(rest.length ? [{ ...b, items: rest }] : []), ...bs.slice(j + 1)]; }); want.current = { id: np.id, start: true }; return; }
      if (!el.textContent) { e.preventDefault(); setItems(b, ys => ys.filter(y => y.id !== it.id)); want.current = { id: xs[k - 1].id }; return; } }
    if (e.key === "ArrowUp" && edge(el, true)) { const id = k > 0 ? xs[k - 1].id : (blocks[i - 1] && lastEd(blocks[i - 1])); if (id) { e.preventDefault(); want.current = { id }; setD(x => ({ ...x })); } }
    if (e.key === "ArrowDown" && edge(el, false)) { const id = k < xs.length - 1 ? xs[k + 1].id : (blocks[i + 1] && first(blocks[i + 1])); if (id) { e.preventDefault(); want.current = { id, start: true }; setD(x => ({ ...x })); } }
  };

  /* imágenes: archivo, pegar o arrastrar → clave propia */
  const putImg = async (f: File | null | undefined, apply: (k: string) => void) => {
    if (!f || !/^image\//.test(f.type)) { toast("Eso no es una imagen", "err"); return; }
    const s = await readImg(f, 1800), k = uid() + uid(); LS.set(KI + k, s); apply(k);
  };

  const editBlock = (b: Blk): ReactNode => {
    switch (b.t) {
      case "h1": return <div className="flex items-center gap-3 pt-4"><span className="h-6 w-1 shrink-0 rounded-full" style={{ background: "var(--mc)" }} />
        <Ed key={b.id + b.t} id={b.id} html={b.h || ""} ph={PH.h1} onChange={textInput(b)} onKey={textKey(b)} className={cn(HCLS.h1, "flex-1")} /></div>;
      case "p": case "h2": case "h3": case "quote":
        return <Ed key={b.id + b.t} id={b.id} html={b.h || ""} ph={PH[b.t]} onChange={textInput(b)} onKey={textKey(b)} onPaste={textPaste(b)}
          className={b.t === "p" ? BODY : b.t === "quote" ? "border-l-[3px] py-1 pl-4 text-[15px] italic leading-7 text-slate-600 dark:text-slate-300" : cn(HCLS[b.t], "pt-2")} />;
      case "callout": { const t = TONE[b.tone || "info"];
        return <div className="flex gap-3 rounded-xl border px-4 py-3" style={{ borderColor: tint(t.c, 35), background: tint(t.c, 9) }}>
          <button type="button" title={`${t.l} · tocá para cambiar`} onClick={() => up(b.id, { tone: TONES[(TONES.indexOf(b.tone || "info") + 1) % TONES.length] })} className="mt-1 shrink-0 transition hover:scale-110"><t.i className="size-5" style={{ color: t.c }} /></button>
          <Ed key={b.id + b.t} id={b.id} html={b.h || ""} ph={PH.callout} onChange={h => up(b.id, { h })} onKey={textKey(b)} className={cn(BODY, "flex-1")} /></div>; }
      case "ul": case "ol": case "todo":
        return <div className={cn(BODY, "space-y-1.5")}>{(b.items || []).map((x, k) => (
          <div key={x.id} className="flex gap-3">
            {b.t === "ol" ? <span className="grid size-6 shrink-0 translate-y-0.5 place-items-center rounded-md text-xs font-bold" style={{ background: tint("var(--mc)", 14), color: "var(--mc)" }}>{k + 1}</span>
              : b.t === "ul" ? <span className="mt-[11px] size-1.5 shrink-0 rounded-full" style={{ background: "var(--mc)" }} />
              : <button type="button" onClick={() => setItems(b, ys => ys.map(y => (y.id === x.id ? { ...y, ok: !y.ok } : y)))} className={cn("mt-1 grid size-5 shrink-0 place-items-center rounded-md border transition", x.ok ? "border-transparent text-white" : "border-slate-300 dark:border-slate-600")} style={x.ok ? { background: "var(--mc)" } : undefined}>{x.ok && <Check className="size-3.5" />}</button>}
            <Ed id={x.id} html={x.h} ph="Elemento" onChange={h => setItems(b, ys => ys.map(y => (y.id === x.id ? { ...y, h } : y)))} onKey={itemKey(b, x)} className={cn("flex-1", x.ok && "text-slate-400 line-through")} />
          </div>))}</div>;
      case "toggle":
        return <div className="rounded-xl border border-slate-200 dark:border-slate-800"><div className="flex items-center gap-2 px-4 pt-2.5"><ChevronRight className="size-4 shrink-0 rotate-90 text-slate-400" />
          <Ed id={b.id + ":t"} html={b.title || ""} ph="Título del desplegable" onChange={h => up(b.id, { title: h })} className="flex-1 font-medium text-slate-900 dark:text-white"
            onKey={(e, el) => { if (e.key === "Enter") { e.preventDefault(); want.current = { id: b.id + ":b" }; setD(x => ({ ...x })); } else if (e.key === "Backspace" && !el.textContent && !plain(b.h)) { e.preventDefault(); remove(b.id); } }} /></div>
          <Ed id={b.id + ":b"} html={b.h || ""} ph="Contenido (se ve al abrirlo)" onChange={h => up(b.id, { h })} className={cn(BODY, "px-4 pb-3 pl-10 pt-1")} /></div>;
      case "code":
        return <textarea value={b.h || ""} onChange={e => up(b.id, { h: e.target.value })} spellCheck={false} placeholder="Código o texto para copiar"
          className="w-full resize-none rounded-xl bg-slate-100 px-4 py-3 font-mono text-[13px] leading-6 text-slate-800 outline-none [field-sizing:content] focus:ring-2 focus:ring-brand-500/30 dark:bg-slate-900 dark:text-slate-200" style={{ minHeight: "3.5rem" }} />;
      case "table": { const rows = b.rows || [[""]], cols = rows[0].length, setR = (f: (r: string[][]) => string[][]) => up(b.id, { rows: f(rows) });
        return <div><div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full text-sm"><tbody>{rows.map((r, i) => (
          <tr key={i} className={cn(i && "border-t border-slate-200 dark:border-slate-800")}>{r.map((x, j) => (
            <td key={j} className={cn("min-w-[7rem] px-3 py-2 align-top", j && "border-l border-slate-200 dark:border-slate-800", i ? "text-slate-700 dark:text-slate-300" : "font-semibold text-slate-900 dark:text-white")} style={i ? undefined : { background: tint("var(--mc)", 10) }}>
              <Ed key={`${b.id}${i}-${j}-${rows.length}-${cols}`} id={`${b.id}:${i}:${j}`} html={x} ph={i ? "" : "Columna"} onChange={h => setR(rr => rr.map((y, a) => (a === i ? y.map((z, c) => (c === j ? h : z)) : y)))} /></td>))}</tr>))}</tbody></table></div>
          <div className="mt-1.5 flex flex-wrap gap-1 text-xs">
            {([["+ Fila", () => setR(rr => [...rr, Array(cols).fill("")])], ["+ Columna", () => setR(rr => rr.map(y => [...y, ""]))],
              ["− Fila", () => rows.length > 1 && setR(rr => rr.slice(0, -1))], ["− Columna", () => cols > 1 && setR(rr => rr.map(y => y.slice(0, -1)))]] as [string, () => void][]).map(([l, f]) => (
              <button key={l} type="button" onClick={f} className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">{l}</button>))}</div></div>; }
      case "hr": return <hr className="my-3 border-slate-200 dark:border-slate-800" />;
      case "img": { const s = imgOf(b.img);
        return s ? <figure><img src={s} alt="" className="max-h-[32rem] w-full rounded-xl object-contain" />
          <Ed id={b.id + ":c"} html={b.h || ""} ph="Epígrafe (opcional)" onChange={h => up(b.id, { h })} className="mt-1.5 text-center text-xs text-slate-500" /></figure>
          : <button type="button" onClick={() => { fileFor.current = b.id; file.current?.click(); }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void putImg(e.dataTransfer.files[0], k => up(b.id, { img: k })); }}
            onPaste={e => { const f = [...e.clipboardData.files][0]; if (f) { e.preventDefault(); void putImg(f, k => up(b.id, { img: k })); } }}
            className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:text-slate-300">
            <ImagePlus className="size-6" />Subir imagen <span className="text-xs text-slate-400">o arrastrala / pegala acá</span></button>; }
      case "yt": { const y = ytId(b.url);
        return <div className="space-y-2"><Input value={b.url || ""} onChange={e => up(b.id, { url: e.target.value })} placeholder="Link de YouTube (https://youtu.be/…)" />
          {y && <div className="aspect-video overflow-hidden rounded-xl bg-black"><iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${y}`} title="Video de YouTube" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>}</div>; }
      case "doc": { const others = all.filter(x => x.id !== d.id);
        return <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"><BookMarked className="size-4 text-slate-400" />
          <select value={b.ref || ""} onChange={e => up(b.id, { ref: e.target.value })} className="h-9 flex-1 rounded-lg bg-transparent text-sm text-slate-800 outline-none dark:text-slate-200">
            <option value="">Elegí un manual…</option>{others.map(o => <option key={o.id} value={o.id}>{o.title || "Sin título"}</option>)}</select></div>; }
    }
    return null;
  };

  const ib = "grid size-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 [&>svg]:size-4";
  const fmt = (c: string, v?: string) => { document.execCommand("styleWithCSS", false, "true"); document.execCommand(c, false, v); const a = document.activeElement as HTMLElement | null; a?.dispatchEvent(new Event("input", { bubbles: true })); };
  const actB = pop?.kind === "act" ? blocks.find(b => b.id === pop.id) : undefined;

  return (
    <div data-man className="mx-auto max-w-6xl space-y-4">
      {/* barra */}
      <Card className="sticky z-20 flex flex-wrap items-center gap-2 bg-white/90 px-3 py-2.5 backdrop-blur dark:bg-slate-950/85" style={{ top: hdr }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={() => void back()}>Manuales</Button>
        <span className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-800" />
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", dirty ? "border-amber-500/30 text-amber-600 dark:text-amber-400" : "border-slate-200 text-slate-500 dark:border-slate-800")}>
          <span className={cn("size-1.5 rounded-full", dirty ? "bg-amber-500" : "bg-emerald-500")} />{dirty ? "Sin guardar" : "Guardado"}</span>
        {edit && <div className="ml-1 hidden items-center gap-0.5 md:flex" onMouseDown={e => e.preventDefault()}>
          <button type="button" className={cn(ib, "font-bold")} title="Negrita (Ctrl+B)" onClick={() => fmt("bold")}>B</button>
          <button type="button" className={cn(ib, "italic")} title="Cursiva (Ctrl+I)" onClick={() => fmt("italic")}>I</button>
          <button type="button" className={cn(ib, "underline")} title="Subrayado (Ctrl+U)" onClick={() => fmt("underline")}>U</button>
          <button type="button" className={cn(ib, "line-through")} title="Tachado" onClick={() => fmt("strikeThrough")}>S</button>
          {[d.color, "#dc2626", "#d97706", "#16a34a"].map(c => <button key={c} type="button" title="Color del texto" onClick={() => fmt("foreColor", c)} className="mx-0.5 size-4 rounded-full ring-1 ring-black/10 transition hover:scale-110" style={{ background: c }} />)}
          <button type="button" className={ib} title="Quitar formato" onClick={() => fmt("removeFormat")}><X /></button></div>}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {edit ? <>
            <Button variant="ghost" size="sm" icon={<Palette className="size-4" />} onClick={() => setLook(true)}>Diseño</Button>
            <Button variant="ghost" size="sm" icon={<Eye className="size-4" />} onClick={() => setEdit(false)}>Vista</Button>
            {dirty && <Button variant="outline" size="sm" icon={<X className="size-4" />} onClick={() => void discard()}>Descartar</Button>}
            <Button size="sm" icon={<Save className="size-4" />} disabled={!dirty} onClick={save}>Guardar</Button>
          </> : <>
            <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => void del()} className="text-red-600 hover:text-red-600 dark:text-red-400">Borrar</Button>
            <Button variant="outline" size="sm" icon={<FileDown className="size-4" />} onClick={() => exportPdf(d, all)}>Exportar PDF</Button>
            {dirty && <Button variant="outline" size="sm" icon={<Save className="size-4" />} onClick={save}>Guardar</Button>}
            <Button size="sm" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>Editar</Button>
          </>}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_15rem]">
        <div ref={root} key={ep} className="min-w-0" onFocusCapture={e => { const el = (e.target as HTMLElement).closest("[data-bid]"), id = el?.getAttribute("data-bid") || "";
          const b = id ? blocks.find(x => x.id === id || x.items?.some(y => y.id === id) || id.startsWith(x.id + ":")) : undefined; if (b) setFoc(b.id); }}>
          {/* cuadro flotante: cambia el bloque donde está el cursor a texto, títulos, listas, cita o aviso (sin escribir «/») */}
          {edit && (() => { const b = blocks.find(x => x.id === foc); const FMT: [BT, string, LucideIcon][] = [["p", "Texto", Type], ["h1", "Título 1", Heading1], ["h2", "Título 2", Heading2], ["h3", "Título 3", Heading3], ["ul", "Lista", List], ["ol", "Lista numerada", ListOrdered], ["quote", "Cita", Quote], ["callout", "Aviso", Info]];
            return <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3"><div role="toolbar" aria-label="Formato del bloque" className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
              {FMT.map(([t, l, I]) => <button key={t} type="button" title={l} aria-label={l} disabled={!b} onMouseDown={e => e.preventDefault()} onClick={() => { if (!b || b.t === t) return; const nb = turn(b, t); setBlocks(bs => bs.map(x => (x.id === b.id ? nb : x))); const f = first(nb); if (f) want.current = { id: f }; }}
                className={cn("grid size-9 place-items-center rounded-xl transition disabled:opacity-30", b?.t === t ? "bg-brand-600 text-white dark:bg-brand-500" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}><I className="size-4" /></button>)}
              <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" title="Agregar bloque debajo" aria-label="Agregar bloque debajo" disabled={!b} onMouseDown={e => e.preventDefault()} onClick={() => { if (!b) return; insert(idx(b.id), P()); }} className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"><Plus className="size-4" /></button>
            </div></div>; })()}
          <Sheet m={d} edit={edit} onTitle={s => setD(x => ({ ...x, title: s }))} onSub={s => setD(x => ({ ...x, sub: s }))}>
            {edit ? <div className="space-y-2 sm:-ml-14">
              {blocks.map(b => (
                <div key={b.id} className="group/b relative flex gap-1">
                  <div className={cn("hidden w-14 shrink-0 justify-end gap-0.5 pt-1 opacity-0 transition group-focus-within/b:opacity-100 group-hover/b:opacity-100 sm:flex", b.t === "h1" && "pt-5", (b.t === "h2" || b.t === "h3") && "pt-3")}>
                    <button type="button" className={ib} title="Agregar bloque debajo" onClick={e => openAt("add", b.id, e.currentTarget)}><Plus /></button>
                    <button type="button" className={cn(ib, "cursor-grab")} title="Opciones del bloque" onClick={e => openAt("act", b.id, e.currentTarget)}><GripVertical /></button>
                  </div>
                  <div className="min-w-0 flex-1">{editBlock(b)}</div>
                </div>))}
              <button type="button" onClick={() => insert(blocks.length - 1, P())} className="ml-0 flex w-full items-center gap-2 rounded-xl px-2 py-3 text-sm text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 sm:ml-14 sm:w-[calc(100%-3.5rem)] dark:hover:bg-slate-900/60 dark:hover:text-slate-300">
                <Plus className="size-4" />Agregar bloque · o escribí <kbd className="rounded border border-slate-200 px-1 font-mono text-[11px] dark:border-slate-700">/</kbd> en una línea vacía</button>
            </div> : <div className="space-y-3">
              {blocks.map(b => <Fragment key={b.id}><View b={b} all={all} onOpen={onOpen} onTodo={(bb, i) => setBlocks(bs => bs.map(x => (x.id === bb.id ? { ...x, items: x.items!.map((y, k) => (k === i ? { ...y, ok: !y.ok } : y)) } : x)))} /></Fragment>)}
            </div>}
          </Sheet>
        </div>
        <aside className="hidden xl:block"><Toc blocks={blocks} /></aside>
      </div>

      <input ref={file} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0], id = fileFor.current; e.target.value = ""; if (f && id) void putImg(f, k => up(id, { img: k })); }} />
      {pop && pop.kind !== "act" && <BlockMenu x={pop.x} y={pop.y} title={pop.kind === "turn" ? "Convertir en" : pop.kind === "add" ? "Agregar bloque" : undefined} onPick={pick}
        onClose={() => { const id = pop.kind === "slash" ? pop.id : ""; setPop(null); if (id) { want.current = { id }; setD(x => ({ ...x })); } }} />}
      {pop?.kind === "act" && actB && <>
        <div className="fixed inset-0 z-40" onMouseDown={() => setPop(null)} />
        <div className="fixed z-50 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ top: Math.min(pop.y, window.innerHeight - 260), left: pop.x }}>
          {([[Repeat2, "Convertir en…", () => setPop({ kind: "turn", id: actB.id, x: pop.x, y: pop.y })],
            [ArrowUp, "Subir", () => { const i = idx(actB.id); if (i > 0) setBlocks(bs => { const c = [...bs]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; }); setPop(null); }],
            [ArrowDown, "Bajar", () => { const i = idx(actB.id); if (i < blocks.length - 1) setBlocks(bs => { const c = [...bs]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; }); setPop(null); }],
            [Copy, "Duplicar", () => { const c: Blk = { ...structuredClone(actB), id: uid(), items: actB.items?.map(x => ({ ...x, id: uid() })) }; insert(idx(actB.id), c); setPop(null); }],
            [Trash2, "Borrar", () => { remove(actB.id); setPop(null); }]] as [LucideIcon, string, () => void][]).map(([I, l, f]) => (
            <button key={l} type="button" onClick={f} className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800", l === "Borrar" ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200")}><I className="size-4" />{l}</button>))}
        </div></>}
      <Look open={look} m={d} onClose={() => setLook(false)} onChange={p => setD(x => ({ ...x, ...p }))} putImg={putImg} />
    </div>);
}

/* ---------- diseño: color, logo de fondo, portada y etiqueta ---------- */
function Look({ open, m, onClose, onChange, putImg }: { open: boolean; m: Man; onClose: () => void; onChange: (p: Partial<Man>) => void; putImg: (f: File | undefined, apply: (k: string) => void) => Promise<void> }) {
  const f = useRef<HTMLInputElement>(null);
  const LOGOS: [LogoK, string][] = [["dept", "Departamento"], ["lspd", "LSPD"], ["lssd", "LSSD"], ["sahp", "SAHP"], ["satd", "SATD"], ["none", "Sin logo"]];
  return (
    <Modal open={open} onClose={onClose} title="Diseño del manual" desc="Color, logo de fondo, portada y etiqueta" icon={<Palette />} footer={<Button onClick={onClose}>Listo</Button>}>
      <div className="space-y-5">
        <div><p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">Color</p>
          <div className="flex flex-wrap items-center gap-2">{COLORS.map(c => <button key={c} type="button" onClick={() => onChange({ color: c })} title={c} className={cn("size-8 rounded-full ring-offset-2 ring-offset-white transition hover:scale-110 dark:ring-offset-slate-900", m.color === c && "ring-2 ring-slate-900 dark:ring-white")} style={{ background: c }} />)}
            <label className="relative grid size-8 cursor-pointer place-items-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-slate-600" title="Otro color"><Plus className="size-4" /><input type="color" value={m.color} onChange={e => onChange({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" /></label></div></div>
        <div><p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">Logo</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{LOGOS.map(([k, l]) => { const s = logoSrc(k);
            return <button key={k} type="button" onClick={() => onChange({ logo: k })} className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs transition", m.logo === k ? "border-brand-500 bg-brand-500/10 text-slate-900 dark:text-white" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800")}>
              <span className="grid size-10 place-items-center">{s ? <img src={s} alt="" className="max-h-10 max-w-10 object-contain" /> : <X className="size-5" />}</span>{l}</button>; })}</div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={m.mark !== false} onChange={e => onChange({ mark: e.target.checked })} className="size-4 accent-brand-600" />Logo de fondo (marca de agua)</label></div>
        <div><p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">Portada</p>
          <div className="flex items-center gap-2">{m.cover && <img src={imgOf(m.cover)} alt="" className="h-12 w-24 rounded-lg object-cover" />}
            <Button variant="outline" size="sm" icon={<ImagePlus className="size-4" />} onClick={() => f.current?.click()}>{m.cover ? "Cambiar" : "Subir imagen"}</Button>
            {m.cover && <Button variant="ghost" size="sm" onClick={() => onChange({ cover: undefined })}>Quitar</Button>}</div>
          <p className="mt-1 text-xs text-slate-500">Sin portada se usa un degradé con el color del manual.</p>
          <input ref={f} type="file" accept="image/*" hidden onChange={e => { const x = e.target.files?.[0]; e.target.value = ""; void putImg(x, k => onChange({ cover: k })); }} /></div>
        <div><p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">Etiqueta</p>
          <Input value={m.tag || ""} onChange={e => onChange({ tag: e.target.value })} placeholder="Ej.: LSPD · Sargentos" /></div>
      </div>
    </Modal>);
}

/* ---------- pantalla ---------- */
export function Manuales() {
  useStoreVersion();
  const { toast } = useFeedback();
  const all = LS.keys(KP).map(k => LS.ro<Man | null>(k, null)).filter((m): m is Man => !!m && !!m.id).sort((a, b) => b.upd - a.upd);
  const [open, setOpen] = useState<{ id: string; edit?: boolean } | null>(null), [q, setQ] = useState(""), [nw, setNw] = useState(false);
  useEffect(() => { /* primera vez: el manual de tácticos, nuestra versión */
    if (LS.get(SEED) || LS.get(KP + "tac")) return; const t = TPL.find(x => x.k === "tac")!;
    LS.setJSON(KP + "tac", { id: "tac", title: "Manual de gestión de tácticos", sub: t.sub, tag: t.tag, color: t.color, logo: "lspd", mark: true, blocks: t.blocks(), upd: Date.now(), by: PROF.me } satisfies Man); LS.set(SEED, "1");
  }, []);
  const cur = open && all.find(m => m.id === open.id);
  if (cur) return <Editor key={cur.id} m0={cur} all={all} startEdit={open.edit} onBack={() => setOpen(null)} onOpen={id => setOpen({ id })} />;
  const create = (k: string, title: string) => {
    const t = TPL.find(x => x.k === k) || TPL[0], id = uid();
    const m: Man = { id, title: title.trim() || (k === "blank" ? "" : t.l), sub: t.sub, tag: t.tag, color: t.color, logo: "dept", mark: true, blocks: t.blocks(), upd: Date.now(), by: PROF.me };
    LS.setJSON(KP + id, m); setNw(false); setOpen({ id, edit: true }); toast("Manual creado");
  };
  const n = norm(q), list = n ? all.filter(m => norm(`${m.title} ${m.sub || ""} ${m.tag || ""}`).includes(n)) : all;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300"><BookMarked className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold">Manuales</p><p className="text-xs text-slate-500">Solo los ves vos. Escribilos por bloques, con tu color y logo, y exportalos a PDF.</p></div>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar manual…" className="w-full sm:w-64" />
        <Button icon={<Plus className="size-4" />} onClick={() => setNw(true)}>Nuevo manual</Button>
      </Card>
      {!list.length ? <Card><Empty icon={<BookMarked />} title={q ? "Sin resultados" : "Todavía no hay manuales"} desc={q ? "Probá con otra palabra." : "Creá el primero desde una plantilla."} /></Card>
        : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map(m => { const lg = logoSrc(m.logo), cv = imgOf(m.cover), secs = m.blocks.filter(b => b.t === "h1").length;
          return (
            <button key={m.id} type="button" onClick={() => setOpen({ id: m.id })} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="relative h-24" style={{ background: cv ? undefined : `linear-gradient(120deg, ${tint(m.color, 60)}, ${tint(m.color, 15)} 60%, transparent)` }}>
                {cv && <img src={cv} alt="" className="absolute inset-0 size-full object-cover" />}
                {lg && <img src={lg} alt="" className="absolute bottom-0 right-3 size-16 translate-y-1/3 object-contain drop-shadow" />}
              </div>
              <div className="space-y-1 p-4 pt-3">
                {m.tag && <p className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: m.color }}>{m.tag}</p>}
                <p className="truncate pr-16 font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">{m.title || "Sin título"}</p>
                {m.sub && <p className="line-clamp-2 text-xs text-slate-500">{m.sub}</p>}
                <p className="pt-1 text-[11px] text-slate-400">{secs ? `${secs} secciones · ` : ""}Actualizado el {new Date(m.upd).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            </button>); })}</div>}
      <NewManual open={nw} onClose={() => setNw(false)} onCreate={create} />
    </div>);
}

function NewManual({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (k: string, title: string) => void }) {
  const [t, setT] = useState(""), [k, setK] = useState("manual");
  useEffect(() => { if (open) { setT(""); setK("manual"); } }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Nuevo manual" desc="Elegí una plantilla: después se edita todo" icon={<BookMarked />}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Plus className="size-4" />} onClick={() => onCreate(k, t)}>Crear</Button></>}>
      <div className="space-y-4">
        <Input autoFocus value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === "Enter" && onCreate(k, t)} placeholder="Título (opcional)" />
        <div className="grid gap-2 sm:grid-cols-2">{TPL.map(x => (
          <button key={x.k} type="button" onClick={() => setK(x.k)} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition", k === x.k ? "border-brand-500 bg-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: x.color }}><x.icon className="size-4" /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900 dark:text-white">{x.l}</span><span className="block truncate text-xs text-slate-500">{x.d}</span></span>
          </button>))}</div>
      </div>
    </Modal>);
}
