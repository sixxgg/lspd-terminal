/* Comunicados de división (ASD y UDU): registro de los avisos publicados en Discord.
   Las plantillas son los comunicados reales de la división: misma estructura y redacción, con sus partes variables como campos. */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, Copy, FilePlus2, Megaphone, Pencil, Plus, RefreshCw, Save, Trash2, Wand2, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { findAgent, getRoster } from "@/lib/domain";
import { cn } from "@/lib/cn";

export type CommDiv = "asd" | "udu";
type Form = { tpl: string; v: Record<string, string> };
type Comm = { id: string; t: string; body: string; ts: number; by: string; f?: Form };

const ROLE_LSPD = "887963542437888004", ROLE_ASD = "1493377759680925919";
const INFO: Record<CommDiv, { n: string; ab: string; em: string; roles: [string, string][] }> = {
  asd: { n: "Air Support Division", ab: "ASD", em: "<:ASD:1316164563506434078>", roles: [[ROLE_LSPD, "LSPD (todo el departamento)"], [ROLE_ASD, "ASD (miembros de la división)"]] },
  udu: { n: "Underwater Dive Unit", ab: "UDU", em: "<:UDU:1511307840986550352>", roles: [[ROLE_LSPD, "LSPD (todo el departamento)"]] },
};

/* ---------- campos ---------- */
type FT = "text" | "area" | "lines" | "date" | "time" | "role" | "check" | "agent" | "blocks";
type Fd = { k: string; l: string; t: FT; ph?: string; hint?: string; w?: "half" | "full" };
type Tpl = { k: string; l: string; d: string; fields: Fd[]; def: (d: CommDiv, me: string) => Record<string, string>; render: (d: CommDiv, v: Record<string, string>) => string };

const lines = (s = "") => s.split("\n").map(x => x.trim()).filter(Boolean);
const pairs = (s = "") => lines(s).map(x => { const i = x.indexOf("|"); return i < 0 ? [x, ""] : [x.slice(0, i).trim(), x.slice(i + 1).trim()]; });
const unix = (date: string, time = "00:00") => (date ? Math.floor(new Date(`${date}T${time || "00:00"}`).getTime() / 1000) : 0);
const dmyShort = (date: string) => (date ? date.slice(2).split("-").reverse().join("/") : "[DD/MM/AA]");
const mention = (v: Record<string, string>) => (v.rol ? (v.spoiler === "1" ? `||<@&${v.rol}>||` : `<@&${v.rol}>`) : "");
const E = (d: CommDiv, v: Record<string, string>) => (v.emoji === "0" ? "" : INFO[d].em);
const dots = (ab: string) => ab.split("").join(".");
const join = (o: (string | false | undefined)[]) => o.filter((x): x is string => x !== false && x !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();
/* firma «Sgto. I Clarkson» a partir de un agente del roster (o lo escrito tal cual) */

/* firma en bloque: «emoji de rango  Nombre | placa», cargo y departamento */
const RK_EMO: Record<string, string> = { "Sergeant II": "<:SrgtII:1316165711436976169>" };
const ASIST = "<a:verifiedwhite:1349401777522344018>";
const firmaBlock = (v: Record<string, string>) => {
  const n = (v.firma || "").trim(), a = n ? findAgent(n) : null, em = (v.rkem || (a && RK_EMO[a.r]) || "").trim();
  const L: string[] = [];
  if (n) L.push(`**${em ? em + " " : ""}${a ? a.n : n}${a && a.p ? ` | ${a.p}` : ""}**`);
  if (v.cargo) L.push(n ? `*${v.cargo}*` : `**${v.cargo}**`);
  if (L.length && v.depto !== "0") L.push("*Departamento de Policía de Los Santos*");
  return L.length ? L.join("\n") : false;
};
const SIGN: Fd[] = [{ k: "firma", l: "Firma", t: "agent", w: "half", hint: "(agente del roster: pone la placa sola)" }, { k: "cargo", l: "Cargo", t: "text", w: "half" },
  { k: "rkem", l: "Emoji de rango", t: "text", w: "half", hint: "(opcional; Sargento II sale solo)", ph: "<:SrgtII:1316165711436976169>" }, { k: "depto", l: "Línea «Departamento de Policía de Los Santos»", t: "check", w: "half" }];
const COMMON: Fd[] = [{ k: "rol", l: "Mención", t: "role", w: "half" }, { k: "spoiler", l: "Mención oculta (spoiler)", t: "check", w: "half" }, { k: "emoji", l: "Emblema de la división en el título", t: "check", w: "half" }];

const TPLS: Tpl[] = [
  { k: "instruccion", l: "Instrucción / práctica", d: "Como la instrucción de persecución marítima y buceo de la UDU",
    fields: [{ k: "titulo", l: "Título", t: "text" }, { k: "fecha", l: "Día", t: "date", w: "half" }, { k: "hora", l: "Hora", t: "time", w: "half" },
      { k: "actividad", l: "Qué se va a hacer", t: "area", ph: "una instrucción de…" }, { k: "conjunto", l: "En conjunto con", t: "text", hint: "(opcional)", ph: "el personal del A.S.D (Instructores y Coordinación)" },
      { k: "detalle", l: "Durante la práctica", t: "area" }, { k: "uniforme", l: "Uniformidad / equipamiento", t: "area", hint: "(opcional)" },
      { k: "requisito", l: "Qué deben traer o tener", t: "area", hint: "(opcional, sigue a «Asimismo,»)" }, { k: "sinexc", l: "Agregar «(Sin excepciones)»", t: "check", w: "half" },
      { k: "cierre", l: "Cierre", t: "text", w: "half" }, { k: "asist", l: "Pedir que confirmen asistencia con el emoji ✅", t: "check", w: "half" }, ...SIGN, ...COMMON],
    def: d => d === "udu"
      ? { titulo: "Instrucción de persecución marítima y buceo", actividad: "una instrucción de persecución marítima y uso del equipo de buceo", conjunto: "el personal del A.S.D (Instructores y Coordinación)",
        detalle: "Durante la práctica se efectuará la entrega de materiales y equipamiento a todos los oficiales interesados en formar parte de la división.",
        uniforme: "La uniformidad la pueden encontrar en sus taquillas aquellos que reaccionen, ya que enviaremos al personal administrativo para que se la deje.",
        requisito: "deberán disponer de embarcaciones aptas para la actividad, las cuales pueden adquirirse en la sede que se encuentra en el puerto deportivo.", sinexc: "1",
        cierre: "Los esperamos.", asist: "1", firma: "Ryan Westbrook", cargo: "Coordinador de Underwater Dive Unit (UDU)", depto: "1", rol: ROLE_LSPD, spoiler: "1", emoji: "1" }
      : { titulo: "Instrucción de vuelo táctico", actividad: "una instrucción de vuelo táctico y uso del dron policial", conjunto: "",
        detalle: "Durante la práctica se evaluarán las maniobras básicas y se entregará el equipamiento a todos los oficiales interesados en formar parte de la división.", uniforme: "",
        requisito: "deberán presentarse con el uniforme de vuelo reglamentario en el helipuerto de Mission Row.", sinexc: "0", cierre: "Los esperamos.", asist: "1",
        firma: "", cargo: "Coordinación de la Air Support Division (ASD)", depto: "1", rol: ROLE_LSPD, spoiler: "1", emoji: "1" },
    render: (d, v) => { const e = E(d, v), t = Number(v.ts) || unix(v.fecha, v.hora); return join([
      `# ${e ? e + " " : ""}${v.titulo || "[Título]"}${e ? " " + e : ""}`, "",
      `Se informa que el día ${t ? `<t:${t}:D>` : dmyShort(v.fecha)} a las ${t ? `<t:${t}:t>` : "[HORA]"} (${t ? `<t:${t}:R>` : "[cuándo]"}) se llevará a cabo ${v.actividad || "[actividad]"}${v.conjunto ? `, realizada en conjunto con ${v.conjunto}` : ""}.`, "",
      [v.detalle, v.uniforme].filter(Boolean).join(" "), "",
      `Se solicita **puntualidad a todos los participantes**.${v.requisito ? " Asimismo, " + v.requisito : ""}${v.sinexc === "1" ? " (Sin excepciones)" : ""}`, "",
      v.cierre, "", v.asist === "1" && `Confirmar asistencia con ${ASIST}`, v.asist === "1" && "", firmaBlock(v), "", mention(v)]); } },
  { k: "licencia", l: "Habilitación / licencia", d: "Como la licencia de dron policial de la ASD",
    fields: [{ k: "titulo", l: "Título", t: "text" }, { k: "habilita", l: "Licencia para", t: "text", ph: "manejar el Dron Policial" },
      { k: "motivo", l: "Motivo de los requisitos", t: "text", hint: "(opcional)", ph: "Al ser material policial sensible" },
      { k: "requisitos", l: "Requisitos", t: "lines", ph: "Uno por línea" }, { k: "aclaracion", l: "Aclaración", t: "area" },
      { k: "reaccion", l: "Pedir que reaccionen con el emoji «Sí» para postularse", t: "check" },
      ...SIGN, ...COMMON],
    def: d => ({ depto: "1", titulo: d === "asd" ? "Licencia de Dron Policial" : "Licencia de Buceo Policial", habilita: d === "asd" ? "manejar el Dron Policial" : "utilizar el equipo de buceo policial",
      motivo: "Al ser material policial sensible", requisitos: d === "asd" ? "Pertenecer al Pelotón C o D, o a la DB.\nTener al menos el rango de PO-III." : "Pertenecer a la Metropolitan Division.\nTener al menos el rango de PO-III.",
      aclaracion: "Cumplir los requisitos no garantiza la aceptación de la candidatura; la coordinación se reserva el derecho de aceptar a los candidatos que considere más aptos.",
      reaccion: "1", firma: d === "asd" ? "Sgto. I Clarkson" : "", cargo: `Subcoordinador de la ${INFO[d].n}`, rol: ROLE_LSPD, emoji: "1" }),
    render: (d, v) => { const e = E(d, v), R = lines(v.requisitos); return join([
      `# ${e ? e + " " : ""}${v.titulo || "[Título]"}${e ? " " + e : ""}`, "",
      `Desde la **Coordinación de la ${INFO[d].ab}** abrimos el periodo de habilitación de licencia para ${v.habilita || "[uso]"}.${R.length ? ` ${v.motivo ? v.motivo + ", se" : "Se"} deberán cumplir los siguientes requisitos:` : ""}`, "",
      ...R.map(x => `* ${x}`), R.length ? "" : false, v.aclaracion, "",
      v.reaccion === "1" && "Todos aquellos que quieran postularse deben reaccionar con un <:Si:1316169901450199051>", v.reaccion === "1" && "",
      (v.firma || v.cargo) && "Atentamente,", firmaBlock(v), "", mention(v)]); } },
  { k: "instancias", l: "Instancias / convocatoria", d: "Como las instancias de la promoción 004 de la ASD",
    fields: [{ k: "promo", l: "Promoción", t: "text", w: "half", ph: "004" }, { k: "saludo", l: "Saludo", t: "text", w: "half" },
      { k: "plazoF", l: "Plazo: día", t: "date", w: "half" }, { k: "plazoH", l: "Plazo: hora", t: "time", w: "half" },
      { k: "form", l: "Link del formulario", t: "text", ph: "https://forms.gle/…" }, { k: "requisito", l: "Requisito de acceso", t: "text" },
      { k: "lema", l: "Lema", t: "text", hint: "(opcional)" }, ...SIGN, ...COMMON],
    def: d => ({ depto: "1", promo: "005", saludo: "Buenas noches:", form: "https://", requisito: d === "asd" ? "Para formar parte de la ASD es necesario pertenecer, como mínimo, al **PELOTÓN B** de la **METRO**." : "Para formar parte de la UDU es necesario pertenecer a la **METRO**.",
      lema: d === "asd" ? "The mission is the same, only the vehicle has changed." : "", cargo: `Coordinador de la ${INFO[d].n} (${INFO[d].ab})`, rol: ROLE_LSPD, spoiler: "1", emoji: "1" }),
    render: (d, v) => { const e = E(d, v), I = INFO[d], pt = unix(v.plazoF, v.plazoH); return join([
      `# **${e ? e + " " : ""}__INSTANCIAS - (${I.ab}) ${I.n.toUpperCase()} (PROMOCIÓN ${v.promo || "000"})__${e ? " " + e : ""}**`, "",
      v.saludo, `Me complace informar la apertura de oposiciones para acceder a la división **${I.n}** (__${I.ab}__) de la LSPD.`, "",
      "A todos los formularios **APTOS** se les informará en la fecha indicada para poder realizar las siguientes partes del proceso.",
      `📅 El plazo máximo para realizar el cuestionario es el ${pt ? `<t:${pt}:D>` : "[DÍA]"} a las ${pt && v.plazoH ? `<t:${pt}:t>` : "[HH:MM]"}${pt && v.plazoH ? ` (<t:${pt}:R>)` : ""}.`, "",
      `📄 [**__Formulario de Acceso__**](${v.form || "https://"})`, "",
      v.requisito && `### __${v.requisito}__`, v.lema && "`" + v.lema.replace(/`/g, "") + "`",
      "Atentamente,", firmaBlock(v), "", mention(v)]); } },
  { k: "documentacion", l: "Documentación", d: "Como el recordatorio de documentación de la ASD",
    fields: [{ k: "docs", l: "Documentos", t: "lines", ph: "Título | por qué es obligatorio (uno por línea)" },
      { k: "links", l: "Enlaces", t: "lines", ph: "Nombre | https://… (uno por línea)" }, { k: "aviso", l: "Aviso final ⚠️", t: "text", hint: "(opcional)" },
      ...SIGN, ...COMMON],
    def: d => ({ depto: "0", docs: d === "asd"
        ? "Manual de la ASD | Es **obligatorio** tener pleno conocimiento del manual, ya que en él se establecen los procedimientos operativos, protocolos de actuación y normativas internas de la unidad.\nManual de uso de drones | Es **obligatorio** tener pleno conocimiento del manual, ya que en él se establecen los procedimientos operativos y protocolos de actuación.\nInforme de Daños | Se recalca que el informe de daños es un elemento **fundamental** en cada intervención. Debe completarse de forma precisa tras los operativos donde existan incidentes o daños materiales."
        : "Manual de la UDU | Es **obligatorio** tener pleno conocimiento del manual, ya que en él se establecen los procedimientos operativos, protocolos de actuación y normativas internas de la unidad.",
      links: d === "asd" ? "Manual de la ASD | https://elevenproject.eu/documents/nreem6gfyynkxcjx\nManual de drones | https://elevenproject.eu/documents/a8yk9zs92o36lgl1\nInforme de Daños | https://elevenproject.eu/forms/dmyz7phnpwiwnoyx" : "Manual de la UDU | https://",
      aviso: "El incumplimiento de estos lineamientos podrá derivar en advertencias o sanciones según corresponda.", cargo: `Coordinación – ${INFO[d].n} (${INFO[d].ab})`,
      rol: INFO[d].roles[INFO[d].roles.length - 1][0], spoiler: "1", emoji: "1" }),
    render: (d, v) => { const e = E(d, v), I = INFO[d], L = pairs(v.links); return join([
      `## ${e ? e + " " : ""}**DOCUMENTACIÓN – ${I.n.toUpperCase()} (${dots(I.ab)})**`, "",
      `Desde la coordinación de la **${I.n}** se recuerda a todo el personal activo la importancia de manejar y conocer correctamente la documentación esencial de la división.`, "",
      ...pairs(v.docs).flatMap(([t, x]) => [`### ${/informe|formulario/i.test(t) ? "📝" : "📘"} **${t}**`, x, ""]),
      L.length ? "### 🔗 **Enlaces a la documentación:**" : false, ...L.map(([n, u]) => `> *([${n}](${u || "https://"}))*`), L.length ? "" : false,
      v.aviso && `## ⚠️ ${v.aviso}`, v.aviso ? "" : false, "Atentamente,", firmaBlock(v), "", mention(v)]); } },
  { k: "libre", l: "Aviso libre", d: "Título, texto y firma a elección",
    fields: [{ k: "titulo", l: "Título", t: "text" }, { k: "cuerpo", l: "Texto", t: "area" }, ...SIGN, ...COMMON],
    def: d => ({ depto: "1", titulo: "[Título]", cuerpo: "[Texto del comunicado]", cargo: `Coordinación – ${INFO[d].n} (${INFO[d].ab})`, rol: ROLE_LSPD, emoji: "1" }),
    render: (d, v) => { const e = E(d, v); return join([`# ${e ? e + " " : ""}${v.titulo}${e ? " " + e : ""}`, "", v.cuerpo, "",
      (v.firma || v.cargo) && "Atentamente,", firmaBlock(v), "", mention(v)]); } },
  { k: "bloques", l: "Por bloques (estructura libre)", d: "Armalo pieza por pieza: títulos, párrafos, listas, fecha y hora, asistencia, firma",
    fields: [{ k: "blocks", l: "Estructura", t: "blocks" }, ...SIGN, ...COMMON],
    def: d => ({ depto: "1", cargo: `Coordinación – ${INFO[d].n} (${INFO[d].ab})`, rol: ROLE_LSPD, spoiler: "1", emoji: "1", blocks: JSON.stringify([
      { t: "h1", x: "[Título]" }, { t: "when", x: "Se informa que el día {fecha} a las {hora} ({falta}) se llevará a cabo…" }, { t: "p", x: "[Detalle]" }, { t: "asist", x: "" }, { t: "firma", x: "" }] as Blk[]) }),
    render: (d, v) => { const e = E(d, v); let B: Blk[] = []; try { B = JSON.parse(v.blocks || "[]"); } catch { /* */ }
      const out = B.flatMap(b => { const x = (b.x || "").trim();
        switch (b.t) {
          case "h1": case "h2": case "h3": return [`${"#".repeat(+b.t[1])} ${b.t === "h1" && e ? e + " " : ""}${x || "[Título]"}${b.t === "h1" && e ? " " + e : ""}`, ""];
          case "list": return [...lines(x).map(l => `* ${l}`), ""];
          case "quote": return [...lines(x).map(l => `> ${l}`), ""];
          case "when": { const t = unix(b.d || "", b.h || ""); return [(x || "{fecha} a las {hora} ({falta})").replace(/\{fecha\}/g, t ? `<t:${t}:D>` : "[DÍA]").replace(/\{hora\}/g, t ? `<t:${t}:t>` : "[HORA]").replace(/\{falta\}/g, t ? `<t:${t}:R>` : "[cuándo]"), ""]; }
          case "asist": return [`Confirmar asistencia con ${ASIST}`, ""];
          case "sep": return ["_ _", ""];
          case "firma": { const f = firmaBlock(v); return f ? [f, ""] : []; }
          default: return x ? [x, ""] : [];
        } });
      return join([...out, mention(v)]); } },
];
type Blk = { t: string; x: string; d?: string; h?: string };
const BLK: [string, string][] = [["h1", "Título grande"], ["h2", "Título"], ["h3", "Subtítulo"], ["p", "Párrafo"], ["list", "Lista"], ["quote", "Cita"], ["when", "Fecha y hora"], ["asist", "Confirmar asistencia"], ["sep", "Espacio"], ["firma", "Firma"]];
function BlocksEd({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let B: Blk[] = []; try { B = JSON.parse(value || "[]"); } catch { /* */ }
  const set = (b: Blk[]) => onChange(JSON.stringify(b)), upd = (i: number, p: Partial<Blk>) => set(B.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= B.length) return; const c = B.slice(); [c[i], c[j]] = [c[j], c[i]]; set(c); };
  return (
    <div className="space-y-2">
      {B.map((b, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <Select value={b.t} onChange={e => upd(i, { t: e.target.value })} className="h-8 w-auto text-xs">{BLK.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            <span className="ml-auto" />
            <button type="button" aria-label="Subir" onClick={() => mv(i, -1)} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"><ArrowUp className="size-3.5" /></button>
            <button type="button" aria-label="Bajar" onClick={() => mv(i, 1)} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"><ArrowDown className="size-3.5" /></button>
            <button type="button" aria-label="Quitar" onClick={() => set(B.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-600"><X className="size-3.5" /></button>
          </div>
          {b.t === "when" && <div className="mt-2 grid grid-cols-2 gap-2"><Input type="date" value={b.d || ""} onChange={e => upd(i, { d: e.target.value })} /><Input type="time" value={b.h || ""} onChange={e => upd(i, { h: e.target.value })} /></div>}
          {!["asist", "sep", "firma"].includes(b.t) && (b.t.startsWith("h")
            ? <Input className="mt-2" value={b.x} onChange={e => upd(i, { x: e.target.value })} placeholder="Texto del título" />
            : <Textarea className="mt-2" rows={b.t === "p" ? 3 : 2} value={b.x} onChange={e => upd(i, { x: e.target.value })}
                placeholder={b.t === "list" || b.t === "quote" ? "Una línea por punto" : b.t === "when" ? "Usá {fecha}, {hora} y {falta} (cuánto falta)" : "Texto (podés usar **negrita**)"} />)}
        </div>))}
      <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs text-slate-500">Agregar:</span>
        {BLK.map(([k, l]) => <button type="button" key={k} onClick={() => set([...B, { t: k, x: "" }])} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"><Plus className="size-3" />{l}</button>)}</div>
    </div>);
}
const tplOf = (k: string) => TPLS.find(t => t.k === k) || TPLS[TPLS.length - 1];
const newForm = (d: CommDiv, k: string, me: string): Form => ({ tpl: k, v: tplOf(k).def(d, me) });
/* los campos nuevos de una plantilla (firma en bloque, asistencia…) toman su valor por defecto en los comunicados viejos */
const build = (d: CommDiv, f: Form) => { const t = tplOf(f.tpl); return t.render(d, { ...t.def(d, ""), ...f.v }); };

/* comunicados ya publicados, armados con sus plantillas (se pueden editar campo por campo) */
const seed = (d: CommDiv, id: string, t: string, by: string, ts: number, tpl: string, v: Record<string, string>): Comm => { const f = { tpl, v: { ...tplOf(tpl).def(d, ""), ...v } }; return { id, t, by, ts, f, body: build(d, f) }; };
const SEED: Record<CommDiv, Comm[]> = {
  udu: [seed("udu", "udu-1", "Instrucción de persecución marítima y buceo", "Ryan Westbrook", Date.UTC(2026, 10, 11, 4), "instruccion", { fecha: "2026-11-11", hora: "21:00", ts: "1794430800" })],
  asd: [
    seed("asd", "asd-1", "Documentación de la ASD", "Coordinación ASD", Date.UTC(2026, 4, 20, 12), "documentacion", {}),
    seed("asd", "asd-2", "Licencia de dron policial", "Sgto. I Clarkson", Date.UTC(2026, 4, 2, 12), "licencia", { rol: ROLE_LSPD }),
    seed("asd", "asd-3", "Instancias · Promoción 004", "Coordinación ASD", Date.UTC(2026, 3, 14, 12), "instancias", { promo: "004", plazoF: "2026-04-21", plazoH: "19:00", form: "https://forms.gle/q7eB7XJgqLmTVfLN8" }),
  ],
};

const fmt = (t: number) => new Date(t).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const firstLine = (b: string) => (b.split("\n").find(l => l.trim()) || "").replace(/<a?:\w+:\d+>/g, "").replace(/<t:\d+(:\w)?>/g, "").replace(/<@&?\d+>/g, "").replace(/[#*_|`>]/g, "").trim();

export function Comunicados({ div, canEdit }: { div: CommDiv; canEdit: boolean }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), I = INFO[div];
  const [saved, setSaved] = useJSON<Comm[] | null>(`lspdt.comms.${div}`, null);
  const list = useMemo(() => (saved || SEED[div]).map(c => (c.id === "udu-1" && c.f && !("firma" in c.f.v) ? SEED.udu[0] : c.f?.tpl ? { ...c, body: build(div, c.f) } : c)).sort((a, b) => b.ts - a.ts), [saved, div]);
  const [sel, setSel] = useState<string>(""), [ed, setEd] = useState<Comm | null>(null);
  const cur = list.find(x => x.id === sel) || list[0];
  const save = (l: Comm[]) => setSaved(l);
  const startNew = () => { const f = newForm(div, TPLS[0].k, me.n); setEd({ id: "", t: "", body: build(div, f), ts: Date.now(), by: me.n, f }); };
  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
      <Card className="flex flex-col self-start overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Megaphone className="size-4 text-brand-500" /><h3 className="font-semibold">Comunicados · {I.ab}</h3>
          <span className="rounded-md bg-slate-900/5 px-1.5 text-[11px] tabular-nums text-slate-500 dark:bg-white/10">{list.length}</span>
          {canEdit && <Button size="sm" className="ml-auto" icon={<FilePlus2 />} onClick={startNew}>Nuevo</Button>}
        </div>
        <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {list.map(c => { const on = !ed && cur?.id === c.id; return (
            <button key={c.id} onClick={() => { setEd(null); setSel(c.id); }} className={cn("relative block w-full px-4 py-3 text-left transition", on ? "bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40")}>
              {on && <span className="absolute inset-y-0 left-0 w-[3px] bg-brand-500" />}
              <span className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"><CalendarClock className="size-3" />{fmt(c.ts)} · {c.by}</span>
              <span className="mt-0.5 block font-semibold leading-snug">{c.t || firstLine(c.body)}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{firstLine(c.body.split("\n").slice(1).join("\n"))}</span>
            </button>); })}
          {!list.length && <Empty icon={<Megaphone />} title="Sin comunicados" desc="Todavía no se registró ninguno." />}
        </div>
      </Card>

      {ed ? <Editor key={ed.id || "new"} div={div} init={ed} onCancel={() => setEd(null)} onSave={c => {
        const nc = { ...c, id: c.id || `${div}-${Date.now().toString(36)}` };
        save([...list.filter(x => x.id !== nc.id), nc]); setEd(null); setSel(nc.id); toast("Comunicado guardado · lo ve toda la división");
      }} />
        : cur ? <DiscordOutput title={cur.t || "Comunicado"} text={cur.body} sticky={false}
          extra={canEdit && <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={<Pencil />} onClick={() => setEd(cur)}>Editar</Button>
            <Button size="sm" variant="outline" icon={<Copy />} onClick={() => setEd({ ...cur, id: "", t: cur.t + " (copia)", ts: Date.now(), by: me.n })}>Usar como base</Button>
            <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 />} onClick={async () => { if (await confirm(`¿Eliminar «${cur.t}»?`, { danger: true })) { save(list.filter(x => x.id !== cur.id)); setSel(""); } }}>Eliminar</Button>
          </div>} />
          : <Card><Empty icon={<Megaphone />} title="Elegí un comunicado" /></Card>}
    </div>
  );
}

function Editor({ div, init, onSave, onCancel }: { div: CommDiv; init: Comm; onSave: (c: Comm) => void; onCancel: () => void }) {
  const I = INFO[div], me = useMe(), { toast } = useFeedback();
  const [f, setF] = useState<Form | null>(init.f && init.f.tpl ? init.f : null), [manual, setManual] = useState(!(init.f && init.f.tpl)), [body, setBody] = useState(init.body);
  const [t, setT] = useState(init.t), [by, setBy] = useState(init.by);
  const text = f && !manual ? build(div, f) : body;
  const tp = f ? tplOf(f.tpl) : null;
  const up = (k: string, v: string) => setF(x => (x ? { ...x, v: { ...x.v, [k]: v, ...(k === "fecha" || k === "hora" ? { ts: "" } : {}) } } : x));
  const names = useMemo(() => getRoster().map(a => a.n).sort((a, b) => a.localeCompare(b)), []);
  const input = (fd: Fd) => { const v = f!.v[fd.k] ?? "";
    switch (fd.t) {
      case "area": return <Textarea rows={3} value={v} placeholder={fd.ph} onChange={e => up(fd.k, e.target.value)} />;
      case "lines": return <Textarea rows={4} value={v} placeholder={fd.ph} onChange={e => up(fd.k, e.target.value)} />;
      case "date": return <Input type="date" value={v} onChange={e => up(fd.k, e.target.value)} />;
      case "time": return <Input type="time" value={v} onChange={e => up(fd.k, e.target.value)} />;
      case "blocks": return <BlocksEd value={v} onChange={x => up(fd.k, x)} />;
      case "agent": return <Input list="cm-names" value={v} placeholder={fd.ph || "Ej: Sgto. I Clarkson"} onChange={e => up(fd.k, e.target.value)} />;
      case "role": return <Select value={v} onChange={e => up(fd.k, e.target.value)}>{I.roles.map(([id, l]) => <option key={id} value={id}>{l}</option>)}<option value="">Sin mención</option></Select>;
      default: return <Input value={v} placeholder={fd.ph} onChange={e => up(fd.k, e.target.value)} />;
    } };
  return (
    <div className="grid gap-5 min-[1800px]:grid-cols-2">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2"><Pencil className="size-4 text-brand-500" /><h3 className="font-semibold">{init.id ? "Editar comunicado" : "Nuevo comunicado"}</h3>
          <div className="ml-auto flex items-center gap-1">
            {f && <Button size="sm" variant={manual ? "outline" : "ghost"} icon={manual ? <Wand2 /> : <Pencil />} onClick={() => { if (!manual) setBody(text); setManual(!manual); }}>{manual ? "Volver a la plantilla" : "Editar el texto a mano"}</Button>}
            {!f && <Button size="sm" variant="outline" icon={<Wand2 />} onClick={() => { setF(newForm(div, "libre", me.n)); setManual(false); }}>Usar una plantilla</Button>}
            <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar"><X className="size-4" /></button></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título en el registro"><Input value={t} onChange={e => setT(e.target.value)} placeholder={f?.v.titulo || "Ej: Instrucción de buceo"} /></Field>
          <Field label="Registrado por"><Input list="cm-names" value={by} onChange={e => setBy(e.target.value)} /></Field>
        </div>
        {f && tp && !manual ? <>
          <Field label="Plantilla"><Select value={f.tpl} onChange={e => setF(newForm(div, e.target.value, me.n))}>{TPLS.map(x => <option key={x.k} value={x.k}>{x.l} — {x.d}</option>)}</Select></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {tp.fields.map(fd => fd.t === "check"
              ? <label key={fd.k} className={cn("flex items-center gap-2 text-sm", fd.w !== "half" && "sm:col-span-2")}><input type="checkbox" checked={f.v[fd.k] === "1"} onChange={e => up(fd.k, e.target.checked ? "1" : "0")} />{fd.l}</label>
              : <Field key={fd.k} label={fd.l} hint={fd.hint} className={fd.w === "half" ? "" : "sm:col-span-2"}>{input(fd)}</Field>)}
          </div>
        </> : <Field label="Texto en formato Discord" hint="Completá lo que está [entre corchetes]">
          <Textarea rows={18} className="font-mono text-[13px]" value={body} onChange={e => setBody(e.target.value)} /></Field>}
        <datalist id="cm-names">{names.map(n => <option key={n} value={n} />)}</datalist>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {f && manual && <Button variant="ghost" icon={<RefreshCw />} className="mr-auto" onClick={() => setBody(build(div, f))}>Regenerar desde la plantilla</Button>}
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button icon={<Save />} onClick={() => {
            if (!text.trim()) { toast("El comunicado está vacío", "err"); return; }
            const pend = (text.match(/\[[^\]\n]{2,60}\](?!\()/g) || []).filter(x => !/^\[\*\*/.test(x));
            if (pend.length) toast(`Ojo: quedan ${pend.length} campos [entre corchetes] sin completar`, "err");
            onSave({ ...init, t: t.trim() || f?.v.titulo?.trim() || firstLine(text), by: by.trim() || me.n, body: text, f: f || undefined, ts: init.id ? init.ts : Date.now() }); }}>Guardar</Button>
        </div>
      </Card>
      <DiscordOutput title="Vista previa" text={text} sticky={false} />
    </div>
  );
}
