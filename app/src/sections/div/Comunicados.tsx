/* Comunicados de división (ASD y UDU): registro de los avisos publicados en Discord, con plantillas y editor */
import { useMemo, useState } from "react";
import { CalendarClock, Copy, FilePlus2, Megaphone, Pencil, RefreshCw, Save, Trash2, Wand2, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { RK_AB, findAgent, getRoster } from "@/lib/domain";
import { cn } from "@/lib/cn";

export type CommDiv = "asd" | "udu";
type Comm = { id: string; t: string; body: string; ts: number; by: string; f?: Form };

const ROLE_LSPD = "887963542437888004", ROLE_ASD = "1493377759680925919";
const INFO: Record<CommDiv, { n: string; ab: string; em: string; roles: [string, string][]; firma: string }> = {
  asd: { n: "Air Support Division", ab: "ASD", em: "<:ASD:1316164563506434078>", roles: [[ROLE_LSPD, "LSPD (todo el departamento)"], [ROLE_ASD, "ASD (miembros de la división)"]], firma: "**Coordinación – Air Support Division (ASD)**" },
  udu: { n: "Underwater Dive Unit", ab: "UDU", em: "<:UDU:1511307840986550352>", roles: [[ROLE_LSPD, "LSPD (todo el departamento)"]], firma: "**Coordinación – Underwater Dive Unit (UDU)**" },
};

/* comunicados ya publicados (corregidos de ortografía), para que la sección no arranque vacía */
const SEED: Record<CommDiv, Comm[]> = {
  udu: [{ id: "udu-1", t: "Instrucción de persecución marítima y buceo", by: "Coordinación UDU", ts: Date.UTC(2026, 5, 3, 12), body:
`# <:UDU:1511307840986550352> Instrucción de Persecución Marítima y Buceo <:UDU:1511307840986550352>

Se informa que el día 03/06/26 a las <t:1780430400:t> se llevará a cabo una instrucción de persecución marítima y uso del equipo de buceo, realizada en conjunto con la SAED y su unidad marítima.

Durante la práctica se efectuará la entrega de materiales y equipamiento a todos los oficiales interesados en formar parte de la división.

Se solicita puntualidad a todos los participantes. Asimismo, deberán disponer de embarcaciones aptas para la actividad, las cuales pueden adquirirse en la sede de **METRO**.

Los esperamos.

<@&${ROLE_LSPD}>` }],
  asd: [
    { id: "asd-1", t: "Documentación de la ASD", by: "Coordinación ASD", ts: Date.UTC(2026, 4, 20, 12), body:
`## <:ASD:1316164563506434078> **DOCUMENTACIÓN – AIR SUPPORT DIVISION (A.S.D)**

Desde la coordinación de la **Air Support Division** se recuerda a todo el personal activo la importancia de manejar y conocer correctamente la documentación esencial de la división.

### 📘 **Manual de la ASD**
Es **obligatorio** tener pleno conocimiento del manual, ya que en él se establecen los procedimientos operativos, protocolos de actuación y normativas internas de la unidad.

### 📘 **Manual de uso de drones**
Es **obligatorio** tener pleno conocimiento del manual, ya que en él se establecen los procedimientos operativos y protocolos de actuación.

### 📝 **Informe de Daños**
Se recalca que el informe de daños es un elemento **fundamental** en cada intervención. Debe completarse de forma precisa tras los operativos donde existan incidentes o daños materiales.

### 🔗 **Enlaces a la documentación:**
> *([Manual de la ASD](https://elevenproject.eu/documents/nreem6gfyynkxcjx))*
> *([Manual de drones](https://elevenproject.eu/documents/a8yk9zs92o36lgl1))*
> *([Informe de Daños](https://elevenproject.eu/forms/dmyz7phnpwiwnoyx))*

## ⚠️ El incumplimiento de estos lineamientos podrá derivar en advertencias o sanciones según corresponda.

Atentamente,
**Coordinación – Air Support Division (ASD)**

||<@&${ROLE_ASD}>||` },
    { id: "asd-2", t: "Licencia de dron policial", by: "Sgto. I Clarkson", ts: Date.UTC(2026, 4, 2, 12), body:
`# <:ASD:1316164563506434078> Licencia de Dron Policial <:ASD:1316164563506434078>

Desde la **Coordinación de la ASD** abrimos el periodo de habilitación de licencia para manejar el Dron Policial. Al ser material policial sensible, se deberán cumplir los siguientes requisitos:

* Pertenecer al Pelotón C o D, o a la DB.
* Tener al menos el rango de PO-III.

Cumplir los requisitos no garantiza la aceptación de la candidatura; la coordinación se reserva el derecho de aceptar a los candidatos que considere más aptos.

Todos aquellos que quieran postularse deben reaccionar con un <:Si:1316169901450199051>

*Att. Sgto. I Clarkson — Subcoordinador de la Air Support Division*

<@&${ROLE_LSPD}>` },
    { id: "asd-3", t: "Instancias · Promoción 004", by: "Coordinación ASD", ts: Date.UTC(2026, 3, 14, 12), body:
`# **<:ASD:1316164563506434078> __INSTANCIAS - (ASD) AIR SUPPORT DIVISION (PROMOCIÓN 004)__ <:ASD:1316164563506434078>**

Buenas noches:
Me complace informar la apertura de oposiciones para acceder a la división **Air Support Division** (__ASD__) de la LSPD.

A todos los formularios **APTOS** se les informará en la fecha indicada para poder realizar las siguientes partes del proceso.
📅 El plazo máximo para realizar el cuestionario es el 21/04/26 a las 19:00 h.

📄 [**__Formulario de Acceso__**](https://forms.gle/q7eB7XJgqLmTVfLN8)

### __Para formar parte de la ASD es necesario pertenecer, como mínimo, al **PELOTÓN B** de la **METRO**.__
\`The mission is the same, only the vehicle has changed.\`
Atentamente,
**Coordinador de la Air Support Division (ASD)**
*Departamento de Policía de Los Santos*

||<@&${ROLE_LSPD}>||` },
  ],
};

/* ===================== asistente: todo personalizable ===================== */
type Tipo = "evento" | "licencia" | "convocatoria" | "documentacion" | "resultados" | "cambio" | "recordatorio" | "libre";
type Estilo = "clasico" | "destacado" | "compacto" | "sobrio";
type Firma = "atentamente" | "att" | "oficial" | "ninguna";
export type Form = {
  tipo: Tipo; estilo: Estilo; titulo: string; saludo: string; intro: string; cuerpo: string;
  fecha: string; fechaFmt: "F" | "f" | "D"; relativa: boolean; lugar: string;
  lista: string; listaTit: string; enlaces: string; cita: string; reaccion: boolean; aviso: string;
  autor: string; cargo: string; firma: Firma; rol: string; spoiler: boolean; emoji: boolean;
};
const TIPOS: [Tipo, string][] = [["evento", "Instrucción, práctica o evento"], ["licencia", "Habilitación o licencia"], ["convocatoria", "Convocatoria / instancias"],
  ["documentacion", "Documentación"], ["resultados", "Resultados (aptos / no aptos)"], ["cambio", "Cambio o cancelación"], ["recordatorio", "Recordatorio de normas"], ["libre", "Aviso libre"]];
const ESTILOS: [Estilo, string][] = [["clasico", "Clásico · título grande con emblemas"], ["destacado", "Destacado · MAYÚSCULAS subrayadas"], ["compacto", "Compacto · título mediano"], ["sobrio", "Sobrio · sin emojis decorativos"]];
const FIRMAS: [Firma, string][] = [["atentamente", "«Atentamente,» + cargo"], ["att", "«Att.» en cursiva (una línea)"], ["oficial", "Cargo + Departamento de Policía"], ["ninguna", "Sin firma"]];

const coordOf = (d: CommDiv) => `Coordinación – ${INFO[d].n} (${INFO[d].ab})`;
function newForm(d: CommDiv, tipo: Tipo, me: string): Form {
  const ag = findAgent(me), b: Form = { tipo, estilo: "clasico", titulo: "", saludo: "", intro: "", cuerpo: "", fecha: "", fechaFmt: "F", relativa: false, lugar: "",
    lista: "", listaTit: "", enlaces: "", cita: "", reaccion: false, aviso: "", autor: ag ? me : "", cargo: coordOf(d), firma: "atentamente", rol: ROLE_LSPD, spoiler: false, emoji: true };
  const I = INFO[d];
  switch (tipo) {
    case "evento": return { ...b, titulo: "Instrucción de [actividad]", intro: "Se informa que se llevará a cabo una instrucción de [actividad], en conjunto con [unidad o división].",
      cuerpo: "Durante la práctica se efectuará la entrega de materiales y equipamiento a todos los oficiales interesados en formar parte de la división.\n\nSe solicita puntualidad a todos los participantes.", lugar: "Sede de METRO", cita: "", aviso: "", firma: "ninguna" };
    case "licencia": return { ...b, titulo: "Licencia de [nombre]", intro: `Desde la **Coordinación de la ${I.ab}** abrimos el periodo de habilitación de licencia para [uso]. Al ser material policial sensible, se deberán cumplir los siguientes requisitos:`,
      listaTit: "", lista: "Pertenecer al Pelotón C o D, o a la DB.\nTener al menos el rango de PO-III.", cuerpo: "Cumplir los requisitos no garantiza la aceptación de la candidatura; la coordinación se reserva el derecho de aceptar a los candidatos que considere más aptos.", reaccion: true, firma: "att", cargo: `Coordinación de la ${I.n}` };
    case "convocatoria": return { ...b, estilo: "destacado", titulo: `Instancias - (${I.ab}) ${I.n} (Promoción [000])`, saludo: "Buenas noches:",
      intro: `Me complace informar la apertura de oposiciones para acceder a la división **${I.n}** (__${I.ab}__) de la LSPD.`,
      cuerpo: "A todos los formularios **APTOS** se les informará en la fecha indicada para poder realizar las siguientes partes del proceso.", enlaces: "Formulario de Acceso | https://", listaTit: "Requisito de acceso",
      lista: "Pertenecer, como mínimo, al **PELOTÓN B** de la **METRO**.", cita: d === "asd" ? "The mission is the same, only the vehicle has changed." : "", firma: "oficial", spoiler: true, cargo: `Coordinador de la ${I.n} (${I.ab})` };
    case "documentacion": return { ...b, estilo: "compacto", titulo: `Documentación – ${I.n} (${I.ab})`, intro: `Desde la coordinación de la **${I.n}** se recuerda a todo el personal activo la importancia de manejar y conocer correctamente la documentación esencial de la división.`,
      listaTit: "Documentos obligatorios", lista: `Manual de la ${I.ab}: procedimientos operativos, protocolos de actuación y normativa interna.\nInforme de Daños: debe completarse tras cada intervención con incidentes o daños materiales.`,
      enlaces: `Manual de la ${I.ab} | https://\nInforme de Daños | https://`, aviso: "El incumplimiento de estos lineamientos podrá derivar en advertencias o sanciones según corresponda.", spoiler: true, rol: I.roles[I.roles.length - 1][0] };
    case "resultados": return { ...b, titulo: "Resultados de [proceso]", intro: "Se publican los resultados de [proceso]. Agradecemos a todos los participantes.", listaTit: "✅ Aptos", lista: "[Nombre Apellido]\n[Nombre Apellido]",
      cuerpo: "Los oficiales **APTOS** serán contactados para coordinar la siguiente etapa. Quienes no hayan sido seleccionados podrán volver a presentarse en la próxima convocatoria." };
    case "cambio": return { ...b, titulo: "Cambio en [actividad]", intro: "Se informa que la actividad prevista para el día [DD/MM] **queda [reprogramada / cancelada]** por [motivo].", cuerpo: "Disculpen las molestias. Ante cualquier duda, consulten con la coordinación.", firma: "att" };
    case "recordatorio": return { ...b, estilo: "compacto", titulo: "Recordatorio importante", intro: "Desde la coordinación se recuerda a todo el personal:", lista: "[Norma o procedimiento 1]\n[Norma o procedimiento 2]",
      aviso: "El incumplimiento podrá derivar en advertencias o sanciones según corresponda.", rol: I.roles[I.roles.length - 1][0] };
    default: return { ...b, titulo: "[Título]", cuerpo: "[Texto del comunicado]" };
  }
}
const ts = (s: string) => Math.floor(new Date(s).getTime() / 1000);
const firmaAgent = (n: string) => { const a = findAgent(n); return a ? `${(RK_AB[a.r] || a.r).replace(/\./g, ". ").replace(/\s+/g, " ").trim()} ${a.n}` : n; };
function build(d: CommDiv, f: Form) {
  const E = f.emoji && f.estilo !== "sobrio" ? INFO[d].em : "", T = f.titulo.trim() || "[Título]", o: string[] = [];
  const titulo = f.estilo === "destacado" ? `# **${E ? E + " " : ""}__${T.toUpperCase()}__${E ? " " + E : ""}**` : f.estilo === "compacto" ? `## ${E ? E + " " : ""}**${T.toUpperCase()}**`
    : `# ${E ? E + " " : ""}${T}${E && f.estilo === "clasico" ? " " + E : ""}`;
  o.push(titulo, "");
  if (f.saludo.trim()) o.push(f.saludo.trim());
  if (f.intro.trim()) o.push(f.intro.trim(), "");
  if (f.fecha) { const t = ts(f.fecha); o.push(`📅 **Fecha:** <t:${t}:${f.fechaFmt}>${f.relativa ? ` (<t:${t}:R>)` : ""}`); }
  if (f.lugar.trim()) o.push(`📍 **Lugar:** ${f.lugar.trim()}`);
  if (f.fecha || f.lugar.trim()) o.push("");
  const L = f.lista.split("\n").map(x => x.trim()).filter(Boolean);
  if (L.length) { if (f.listaTit.trim()) o.push(`### ${f.listaTit.trim()}`); o.push(...L.map(x => `* ${x}`), ""); }
  if (f.cuerpo.trim()) o.push(f.cuerpo.trim(), "");
  const LK = f.enlaces.split("\n").map(x => x.split("|").map(y => y.trim())).filter(x => x[0]);
  if (LK.length) { o.push(f.estilo === "sobrio" ? "**Enlaces:**" : "### 🔗 **Enlaces:**"); o.push(...LK.map(([n, u]) => (u ? `> 📄 [**__${n}__**](${u})` : `> ${n}`)), ""); }
  if (f.reaccion) o.push("Todos aquellos que quieran postularse deben reaccionar con un <:Si:1316169901450199051>", "");
  if (f.cita.trim()) o.push("`" + f.cita.trim().replace(/`/g, "") + "`");
  if (f.aviso.trim()) o.push(`## ⚠️ ${f.aviso.trim()}`, "");
  const autor = f.autor.trim() ? firmaAgent(f.autor.trim()) : "";
  if (f.firma === "atentamente") o.push("Atentamente,", autor ? `**${autor}**` : "", f.cargo.trim() ? (autor ? `*${f.cargo.trim()}*` : `**${f.cargo.trim()}**`) : "");
  else if (f.firma === "att") o.push(`*Att. ${[autor, f.cargo.trim()].filter(Boolean).join(" — ")}*`);
  else if (f.firma === "oficial") o.push("Atentamente,", autor ? `**${autor}**` : "", f.cargo.trim() ? `**${f.cargo.trim()}**` : "", "*Departamento de Policía de Los Santos*");
  const m = f.rol ? `<@&${f.rol}>` : "";
  if (m) o.push("", f.spoiler ? `||${m}||` : m);
  return o.filter((x, i, a) => !(x === "" && (i === 0 || a[i - 1] === ""))).join("\n").trim();
}

const fmt = (t: number) => new Date(t).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const firstLine = (b: string) => (b.split("\n").find(l => l.trim()) || "").replace(/<a?:\w+:\d+>/g, "").replace(/<t:\d+(:\w)?>/g, "").replace(/<@&?\d+>/g, "").replace(/[#*_|`>]/g, "").trim();

export function Comunicados({ div, canEdit }: { div: CommDiv; canEdit: boolean }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), I = INFO[div];
  const [saved, setSaved] = useJSON<Comm[] | null>(`lspdt.comms.${div}`, null);
  const list = useMemo(() => (saved || SEED[div]).slice().sort((a, b) => b.ts - a.ts), [saved, div]);
  const [sel, setSel] = useState<string>(""), [ed, setEd] = useState<Comm | null>(null);
  const cur = list.find(x => x.id === sel) || list[0];
  const save = (l: Comm[]) => setSaved(l);
  const startNew = () => { const f = newForm(div, "evento", me.n); setEd({ id: "", t: "", body: build(div, f), ts: Date.now(), by: me.n, f }); };
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
  /* con formulario → asistente; los comunicados viejos (sin formulario) abren en texto libre */
  const [f, setF] = useState<Form | null>(init.f || null), [manual, setManual] = useState(!init.f), [body, setBody] = useState(init.body);
  const [t, setT] = useState(init.t), [by, setBy] = useState(init.by);
  const text = f && !manual ? build(div, f) : body;
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF(x => (x ? { ...x, [k]: v } : x));
  const names = useMemo(() => getRoster().map(a => a.n).sort((a, b) => a.localeCompare(b)), []);
  const field = (k: keyof Form, label: string, ph = "", rows = 0, hint?: string) => <Field label={label} hint={hint}>
    {rows ? <Textarea rows={rows} value={String(f![k])} placeholder={ph} onChange={e => up(k, e.target.value as never)} />
      : <Input value={String(f![k])} placeholder={ph} onChange={e => up(k, e.target.value as never)} />}</Field>;
  return (
    <div className="grid gap-5 min-[1800px]:grid-cols-2">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2"><Pencil className="size-4 text-brand-500" /><h3 className="font-semibold">{init.id ? "Editar comunicado" : "Nuevo comunicado"}</h3>
          <div className="ml-auto flex items-center gap-1">
            {f && <Button size="sm" variant={manual ? "outline" : "ghost"} icon={manual ? <Wand2 /> : <Pencil />} onClick={() => { if (!manual) setBody(text); setManual(!manual); }}>{manual ? "Volver al asistente" : "Editar el texto a mano"}</Button>}
            {!f && <Button size="sm" variant="outline" icon={<Wand2 />} onClick={() => { const nf = newForm(div, "libre", me.n); setF(nf); setManual(false); }}>Armar con el asistente</Button>}
            <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar"><X className="size-4" /></button></div></div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título en el registro"><Input value={t} onChange={e => setT(e.target.value)} placeholder={f ? f.titulo : "Ej: Instrucción de buceo"} /></Field>
          <Field label="Registrado por"><Input list="cm-names" value={by} onChange={e => setBy(e.target.value)} /></Field>
        </div>

        {f && !manual ? <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo de comunicado" hint="(carga una base)"><Select value={f.tipo} onChange={e => { const nf = newForm(div, e.target.value as Tipo, me.n); setF({ ...nf, autor: f.autor, cargo: f.cargo === coordOf(div) ? nf.cargo : f.cargo }); }}>
              {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Variante de diseño"><Select value={f.estilo} onChange={e => up("estilo", e.target.value as Estilo)}>{ESTILOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          </div>
          {field("titulo", "Título del comunicado")}
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">{field("saludo", "Saludo", "Ej: Buenas noches:", 0, "(opcional)")}{field("intro", "Introducción", "Primer párrafo", 0)}</div>
          {field("cuerpo", "Cuerpo", "Detalle, instrucciones, aclaraciones…", 4)}
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
            <Field label="Fecha y hora" hint="(opcional)"><Input type="datetime-local" value={f.fecha} onChange={e => up("fecha", e.target.value)} /></Field>
            <Field label="Formato"><Select value={f.fechaFmt} onChange={e => up("fechaFmt", e.target.value as Form["fechaFmt"])}><option value="F">Día y hora completos</option><option value="f">Fecha y hora</option><option value="D">Solo la fecha</option></Select></Field>
            <label className="flex items-end gap-2 pb-2.5 text-sm"><input type="checkbox" checked={f.relativa} onChange={e => up("relativa", e.target.checked)} />Cuenta regresiva</label>
          </div>
          {field("lugar", "Lugar", "Ej: Sede de METRO, helipuerto de Mission Row…", 0, "(opcional)")}
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">{field("listaTit", "Título de la lista", "Ej: Requisitos", 0, "(opcional)")}{field("lista", "Lista con viñetas", "Un elemento por línea", 3)}</div>
          {field("enlaces", "Enlaces", "Nombre | https://… (uno por línea)", 2, "(opcional)")}
          <div className="grid gap-3 sm:grid-cols-2">{field("cita", "Lema o frase destacada", "Ej: The mission is the same…", 0, "(opcional)")}{field("aviso", "Aviso final ⚠️", "Ej: El incumplimiento podrá derivar en sanciones", 0, "(opcional)")}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.reaccion} onChange={e => up("reaccion", e.target.checked)} />Pedir que reaccionen con el emoji «Sí» para postularse</label>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Firma y mención</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quién firma" hint="(agente del roster o texto libre)"><Input list="cm-names" value={f.autor} placeholder="Ej: Kyle Clarkson" onChange={e => up("autor", e.target.value)} /></Field>
              {field("cargo", "Cargo", "Ej: Subcoordinador de la ASD")}
              <Field label="Formato de la firma"><Select value={f.firma} onChange={e => up("firma", e.target.value as Firma)}>{FIRMAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field label="Mención"><Select value={f.rol} onChange={e => up("rol", e.target.value)}>{I.roles.map(([id, l]) => <option key={id} value={id}>{l}</option>)}<option value="">Sin mención</option></Select></Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.spoiler} onChange={e => up("spoiler", e.target.checked)} />Mención oculta (spoiler)</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.emoji} onChange={e => up("emoji", e.target.checked)} />Emblema de la {I.ab} en el título</label>
            </div>
          </div>
        </> : <Field label="Texto en formato Discord" hint="Completá lo que está [entre corchetes]">
          <Textarea rows={18} className="font-mono text-[13px]" value={body} onChange={e => setBody(e.target.value)} /></Field>}
        <datalist id="cm-names">{names.map(n => <option key={n} value={n} />)}</datalist>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {f && manual && <Button variant="ghost" icon={<RefreshCw />} className="mr-auto" onClick={() => setBody(build(div, f))}>Regenerar desde el asistente</Button>}
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button icon={<Save />} onClick={() => {
            if (!text.trim()) { toast("El comunicado está vacío", "err"); return; }
            const pend = (text.match(/\[[^\]\n]{2,60}\](?!\()/g) || []).filter(x => !/^\[\*\*/.test(x));
            if (pend.length) toast(`Ojo: quedan ${pend.length} campos [entre corchetes] sin completar`, "err");
            onSave({ ...init, t: t.trim() || (f ? f.titulo.trim() : "") || firstLine(text), by: by.trim() || me.n, body: text, f: f || undefined, ts: init.id ? init.ts : Date.now() }); }}>Guardar</Button>
        </div>
      </Card>
      <DiscordOutput title="Vista previa" text={text} sticky={false} />
    </div>
  );
}
