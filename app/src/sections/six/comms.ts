/* Comunicados del staff (panel de six): roles y canales de Discord, separar comunicados pegados de a muchos, plantillas
   con el estilo de siempre y el generador de estadísticas del mes. Los textos en sí se guardan en lspdt.six.com (privado). */

/* roles y canales que aparecen en los comunicados: nombres deducidos, se corrigen desde el panel */
export const DC_ROLES: Record<string, string> = {
  "1255269423678230568": "STAFF", "1255268805811245167": "Soporte", "1392909066640166932": "Soporte Ingame", "1255268831601885368": "Moderador",
  "1347700905184854128": "Encargado de Moderación", "1419939528382218292": "Encargado de Administración", "1255268866980839545": "Owner",
  "1255269232493727916": "Desarrollador", "1482877709930729482": "Referente", "1255278894819315835": "Gestión Ilícito", "1255278787818557531": "Gestión Comercio",
  "1255278826485846097": "Gestión SAED", "1255278855539785808": "Gestión SAPD",
};
export const DC_CHANS: Record<string, string> = { "1515034278465896658": "bugs-v2", "1481369327033782272": "logs-spect" };
export const STAFF_ROLE = "1255269423678230568";

/* separa un pegado con muchos comunicados: cada uno arranca con un «# título» después de una línea en blanco doble */
export function splitComs(txt: string) {
  return txt.replace(/\r/g, "").split(/\n[ \t]*\n[ \t]*\n+(?=#\s)/).map(s => s.trim()).filter(s => /^#\s/.test(s) && s.length > 40);
}
/* título legible: la primera línea sin #, emojis propios, negritas ni símbolos */
export const comTitle = (body: string) => (body.split("\n").find(l => l.trim()) || "").replace(/<a?:\w+:\d+>/g, "").replace(/^#+\s*/, "").replace(/[*_~`|]/g, "")
  .replace(/^[^\p{L}\p{N}]+/u, "").replace(/^(comunicado( general)?\s*[:\-–|]\s*)/i, m => m).trim().slice(0, 70) || "Comunicado";

/* plantillas armadas a partir de cómo se escriben los comunicados del staff */
export const PLANTILLAS: [string, string][] = [
  ["Comunicado general", `# 📢 Comunicado: [Título]

Buenas a todos,

[Qué pasó o qué notamos últimamente, en dos o tres líneas.]

## 📌 [Punto principal]
[Explicación clara de lo que se espera de cada uno.]

> **[Regla]**: [cómo se aplica].
> **[Excepción]**: [a quién no le corre].

Si esta situación sigue, nos veremos obligados a [medida].

*Agradecemos su comprensión y colaboración.*

||<@&${STAFF_ROLE}>||`],
  ["Recordatorio de normativa", `# 📢 **Recordatorio sobre [tema]**

Buenas a todos los <@&${STAFF_ROLE}>

Queremos recordarles la importancia de **[qué tienen que hacer]**. Últimamente [qué viene pasando], lo que genera [consecuencia].

# 🔎 **Puntos clave a tener en cuenta:**

* [Punto 1]
* [Punto 2]
* [Punto 3]

# ⚠️ [Advertencia final en una línea.]

🔗 [Normativa (Eleven Project)](https://docs.google.com/document/d/1U-T1urdoK8zvjCK6aN3cUAoJlw3KwxlRj5cHYQHnChk/edit)

Gracias por su colaboración.

Atte: <@&1347700905184854128>`],
  ["Conducta y ambiente", `# 🚫 Importante: [tema]

Buenos días, chicos/as.

Hacemos este anuncio para aclarar [qué]. Últimamente hemos notado [situación] que no suma al compañerismo que buscamos.

**[Lo que no se va a permitir].**

Queremos un equipo unido. Quienes elijan [conducta], serán apartados del **STAFF** para preservar la tranquilidad del resto del grupo.

Contamos con ustedes para mejorar la energía del equipo y seguir creciendo juntos.

||<@&${STAFF_ROLE}>||`],
  ["Apertura / versión nueva", `# <:Eleven:1511721187120779425>  | [Vuelta del servidor / Versión]

¡Buenos días a todo el equipo!

[Qué abre y cuándo: <t:1784919600:F>.]

Desde <@&1347700905184854128> / <@&1419939528382218292>, les pedimos que mantengan una actitud proactiva y estén revisando la página web y el resto de plataformas.

## Recuerden que si tienen dudas, pueden consultar en estos canales:

<#1454692948137480373>
<#1454693001610920089>

Queremos aprovechar este momento para darles las gracias. [Agradecimiento.]

||<@&${STAFF_ROLE}>||`],
  ["Prohibido filtrar", `# 📢 **Comunicado – [Tema]**

Buenas a todos,

Queremos dejar en claro la postura frente a [tema]. No se tendrá **ningún tipo de tolerancia** ante este tipo de conductas.

Bajo ningún motivo está permitido:

> ❌ [Prohibido 1]
> ❌ [Prohibido 2]
> ❌ [Prohibido 3]

[Sanción: expulsión inmediata / blacklist.]

Agradecemos su comprensión y colaboración.

||<@&${STAFF_ROLE}>||`],
];

/* ---------- estadísticas del mes ---------- */
export type Stat = { k: string; l: string; now: string; prev: string; extra?: string };
export const STATS0: Stat[] = [
  { k: "inc", l: "incidencias atendidas", now: "", prev: "" }, { k: "tic", l: "tickets cerrados", now: "", prev: "" }, { k: "his", l: "historias aprobadas", now: "", prev: "" },
  { k: "rep", l: "reportes gestionados", now: "", prev: "" }, { k: "bug", l: "bugs arreglados", now: "", prev: "", extra: "(Esto por parte de <@&1255269232493727916> ) <a:battery_charging:1107789260934885396>" },
  { k: "sug", l: "sugerencias implementadas", now: "", prev: "" }, { k: "san", l: "sanciones puestas", now: "", prev: "" },
];
export type StatsF = { mes: string; anio: string; prevMes: string; S: Stat[]; resp: string; cierre: string; abiertos: string; sinAsig: string; sinResp: string };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const cmp = (a: number, b: number) => { const r = a / b; if (r >= 1.9 && r < 2.1) return "**el doble**"; if (r >= 2.85 && r < 3.15) return "**el triple**"; if (r >= 3.85 && r < 4.15) return "**el cuádruple**";
  const p = Math.round((a - b) / b * 100); return `**${p >= 0 ? "+" : ""}${p}%**`; };
export function statsText(f: StatsF) {
  const S = f.S.filter(s => +s.now > 0), C = f.S.filter(s => +s.now > 0 && +s.prev > 0); /* solo las que tienen el mes anterior cargado */
  const L = [`# 📊 Estadísticas - Mes de ${f.mes.toLowerCase()}`, "Buenas a todos,", "Queríamos compartir las estadísticas del mes para que puedan ver el trabajo que se viene realizando día a día por parte de todo el staff.", "",
    `## 📌 ${cap(f.mes)} ${f.anio}:`, "", ...S.map(s => `+${s.now} ${s.l}${s.extra ? " " + s.extra : ""}`), "",
    "*Estos números reflejan el compromiso y el esfuerzo que le ponen ustedes día a día, y se los agradecemos.*"];
  if (C.length && f.prevMes.trim()) L.push("", `## 📈 Comparado con ${f.prevMes.toLowerCase()}:`, ...C.map(s => `- ${cap(s.l.split(" ")[0])} ${s.l.split(" ").slice(1).join(" ")}: ${s.prev} → ${s.now} (${cmp(+s.now, +s.prev)})`));
  if (f.resp || f.cierre || f.abiertos) {
    L.push("", "## ⚠️ Punto a mejorar:");
    const t = [f.resp && `La primera respuesta en los tickets está bien (**${f.resp} minutos**)`, f.cierre && `${f.resp ? ", pero el cierre sigue siendo lento" : "El cierre sigue siendo lento"}: un ticket tarda unas **${f.cierre} horas** en resolverse.`].filter(Boolean).join("");
    const ab = f.abiertos ? ` Además, ahora mismo hay **${f.abiertos} tickets abiertos**${f.sinAsig ? `, **${f.sinAsig} sin asignar**` : ""}${f.sinResp ? ` y **${f.sinResp} sin respuesta**` : ""}. Les pedimos que, una vez que toman un ticket, lo sigan hasta cerrarlo, y que nadie deje tickets colgados sin asignar.` : "";
    L.push((t + ab).trim());
  }
  L.push("", "De verdad queremos agradecerles por el tiempo, la dedicación y las ganas que le ponen diariamente. Cada ticket cerrado, cada incidencia resuelta, cada historia evaluada y cada bug solucionado ayuda a que el servidor siga creciendo y mejorando constantemente.",
    "", "*Gracias por hacer que todo esto valga la pena y por seguir aportando para que la comunidad continúe avanzando. ❤️*", "", `||<@&${STAFF_ROLE}> ||`);
  return L.join("\n");
}
