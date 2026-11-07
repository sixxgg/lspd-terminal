/* Comunicados de división (ASD y UDU): registro de los avisos publicados en Discord, con plantillas y editor */
import { useMemo, useRef, useState } from "react";
import { CalendarClock, Copy, FilePlus2, Megaphone, Pencil, Save, Trash2, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

export type CommDiv = "asd" | "udu";
type Comm = { id: string; t: string; body: string; ts: number; by: string };

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

/* plantillas: {E} = emoji de la división · [CORCHETES] = a completar */
const TPLS: [string, (d: CommDiv) => string][] = [
  ["Instrucción o práctica", () => `# {E} [Título de la instrucción] {E}

Se informa que el día [DD/MM/AA] a las [HORA] se llevará a cabo [descripción de la actividad].

Durante la práctica [qué se hará: entrega de equipamiento, evaluación, etc.].

Se solicita puntualidad a todos los participantes. [Requisitos o material necesario.]

Los esperamos.

{ROL}`],
  ["Habilitación o licencia", d => `# {E} [Nombre de la licencia] {E}

Desde la **Coordinación de la ${INFO[d].ab}** abrimos el periodo de habilitación de [licencia]. Se deberán cumplir los siguientes requisitos:

* [Requisito 1]
* [Requisito 2]

Cumplir los requisitos no garantiza la aceptación de la candidatura; la coordinación se reserva el derecho de aceptar a los candidatos que considere más aptos.

Todos aquellos que quieran postularse deben reaccionar con un <:Si:1316169901450199051>

*Att. [Rango y nombre] — [Cargo]*

{ROL}`],
  ["Convocatoria / instancias", d => `# **{E} __INSTANCIAS - (${INFO[d].ab}) ${INFO[d].n.toUpperCase()} (PROMOCIÓN [000])__ {E}**

Buenas noches:
Me complace informar la apertura de oposiciones para acceder a la división **${INFO[d].n}** (__${INFO[d].ab}__) de la LSPD.

A todos los formularios **APTOS** se les informará en la fecha indicada para poder realizar las siguientes partes del proceso.
📅 El plazo máximo para realizar el cuestionario es el [DD/MM/AA] a las [HH:MM] h.

📄 [**__Formulario de Acceso__**]([enlace])

### __[Requisito mínimo de acceso]__
Atentamente,
${INFO[d].firma}
*Departamento de Policía de Los Santos*

||{ROL}||`],
  ["Documentación y recordatorio", d => `## {E} **DOCUMENTACIÓN – ${INFO[d].n.toUpperCase()} (${INFO[d].ab})**

Desde la coordinación de la **${INFO[d].n}** se recuerda a todo el personal activo la importancia de conocer correctamente la documentación esencial de la división.

### 📘 **[Documento]**
[Por qué es obligatorio conocerlo.]

### 🔗 **Enlaces a la documentación:**
> *([Documento]([enlace]))*

## ⚠️ El incumplimiento de estos lineamientos podrá derivar en advertencias o sanciones según corresponda.

Atentamente,
${INFO[d].firma}

||{ROL}||`],
  ["Aviso libre", () => `# {E} [Título] {E}

[Texto del comunicado]

Atentamente,
{FIRMA}

{ROL}`],
];

const fmt = (ts: number) => new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const firstLine = (b: string) => (b.split("\n").find(l => l.trim()) || "").replace(/<a?:\w+:\d+>/g, "").replace(/<t:\d+(:\w)?>/g, "").replace(/<@&?\d+>/g, "").replace(/[#*_|`>]/g, "").trim();

export function Comunicados({ div, canEdit }: { div: CommDiv; canEdit: boolean }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), I = INFO[div];
  const [saved, setSaved] = useJSON<Comm[] | null>(`lspdt.comms.${div}`, null);
  const list = useMemo(() => (saved || SEED[div]).slice().sort((a, b) => b.ts - a.ts), [saved, div]);
  const [sel, setSel] = useState<string>(""), [ed, setEd] = useState<Comm | null>(null);
  const cur = list.find(x => x.id === sel) || list[0];
  const save = (l: Comm[]) => setSaved(l);

  const startNew = () => setEd({ id: "", t: "", body: fill(TPLS[0][1](div), div, ROLE_LSPD), ts: Date.now(), by: me.n });
  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
      <Card className="flex flex-col overflow-hidden">
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

function fill(t: string, d: CommDiv, role: string) {
  return t.replace(/\{E\}/g, INFO[d].em).replace(/\{FIRMA\}/g, INFO[d].firma).replace(/\{ROL\}/g, role ? `<@&${role}>` : "");
}

function Editor({ div, init, onSave, onCancel }: { div: CommDiv; init: Comm; onSave: (c: Comm) => void; onCancel: () => void }) {
  const I = INFO[div], { toast } = useFeedback();
  const [c, setC] = useState(init), [role, setRole] = useState(I.roles[0][0]), [when, setWhen] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const insert = (s: string) => { const el = ta.current; if (!el) { setC({ ...c, body: c.body + s }); return; }
    const a = el.selectionStart, b = el.selectionEnd; setC({ ...c, body: c.body.slice(0, a) + s + c.body.slice(b) });
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = a + s.length; }); };
  return (
    <div className="grid gap-5 min-[1800px]:grid-cols-2">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2"><Pencil className="size-4 text-brand-500" /><h3 className="font-semibold">{init.id ? "Editar comunicado" : "Nuevo comunicado"}</h3>
          <button onClick={onCancel} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar"><X className="size-4" /></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Plantilla"><Select defaultValue="" onChange={e => { const t = TPLS[+e.target.value]; if (t) setC({ ...c, body: fill(t[1](div), div, role) }); e.target.value = ""; }}>
            <option value="" disabled>Elegir para reemplazar el texto…</option>{TPLS.map(([l], i) => <option key={l} value={i}>{l}</option>)}</Select></Field>
          <Field label="Mención"><Select value={role} onChange={e => { const r = e.target.value; setC({ ...c, body: c.body.replace(/<@&\d+>/g, r ? `<@&${r}>` : "") }); setRole(r); }}>
            {I.roles.map(([id, l]) => <option key={id} value={id}>{l}</option>)}<option value="">Sin mención</option></Select></Field>
        </div>
        <Field label="Título" hint="(para el registro)"><Input value={c.t} onChange={e => setC({ ...c, t: e.target.value })} placeholder="Ej: Instrucción de buceo" /></Field>
        <Field label="Texto en formato Discord" hint="Completá lo que está [entre corchetes]">
          <Textarea ref={ta} rows={16} className="font-mono text-[13px]" value={c.body} onChange={e => setC({ ...c, body: e.target.value })} /></Field>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Insertar fecha y hora de Discord" className="min-w-[14rem] flex-1"><Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} /></Field>
          <Button variant="outline" size="sm" disabled={!when} onClick={() => insert(`<t:${Math.floor(new Date(when).getTime() / 1000)}:F>`)}>Fecha y hora</Button>
          <Button variant="outline" size="sm" disabled={!when} onClick={() => insert(`<t:${Math.floor(new Date(when).getTime() / 1000)}:t>`)}>Solo hora</Button>
          <Button variant="outline" size="sm" disabled={!when} onClick={() => insert(`<t:${Math.floor(new Date(when).getTime() / 1000)}:R>`)}>Relativa</Button>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button icon={<Save />} onClick={() => { const pend = (c.body.match(/\[[^\]\n]{2,60}\](?!\()/g) || []).filter(x => !/^\[\*\*/.test(x));
            if (!c.body.trim()) { toast("El comunicado está vacío", "err"); return; }
            if (pend.length) toast(`Quedan ${pend.length} campos [entre corchetes] sin completar`, "err");
            onSave({ ...c, t: c.t.trim() || firstLine(c.body), ts: init.id ? c.ts : Date.now() }); }}>Guardar</Button>
        </div>
      </Card>
      <DiscordOutput title="Vista previa" text={c.body} sticky={false} />
    </div>
  );
}
