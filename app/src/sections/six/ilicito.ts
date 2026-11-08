/* Respuesta del equipo de ilícitos a una postulación de banda (formato Discord), con variantes y saludo según la hora */
export type IlicForm = { ids: string; banda: string; res: "aceptada" | "rechazada"; motivos: string; v: "std" | "formal" | "breve"; saludo: "auto" | "dias" | "tardes" | "noches" | "hola"; firma: string; seguir?: boolean };
export const ILIC_VARS: [IlicForm["v"], string][] = [["std", "Estándar"], ["formal", "Formal"], ["breve", "Breve"]];

const saludoDe = (s: IlicForm["saludo"]) => {
  if (s === "hola") return "¡Hola";
  const h = new Date().getHours(), k = s === "auto" ? (h >= 6 && h < 13 ? "dias" : h >= 13 && h < 20 ? "tardes" : "noches") : s;
  return k === "dias" ? "¡Buenos días" : k === "tardes" ? "¡Buenas tardes" : "¡Buenas noches";
};
export const mentions = (ids: string) => [...new Set(ids.split(/[\s,;]+/).map(x => x.replace(/[<@!>]/g, "").trim()).filter(x => /^\d{17,20}$/.test(x)))].map(x => `<@${x}>`);

/* consulta de interés: si todavía quieren seguir con el proyecto de banda y entrar al Discord */
const seguirTxt = (v: IlicForm["v"], ok: boolean) => ok
  ? (v === "formal" ? "Antes de continuar, les solicitamos que nos confirmen si mantienen el interés en seguir participando del proceso del proyecto de banda y en acceder al Discord de bandas. Pueden hacerlo respondiendo a este mensaje."
    : v === "breve" ? "¿Siguen con ganas de avanzar con el proyecto y entrar al Discord de bandas? Confírmennos por acá."
    : "Antes de avanzar, necesitamos que nos confirmen si todavía tienen ganas de seguir participando del proceso del proyecto de banda y de acceder al Discord de bandas. Respondan a este mensaje y seguimos con los pasos.")
  : (v === "formal" ? "Si mantienen el interés en continuar con el proceso del proyecto de banda, les pedimos que nos lo hagan saber respondiendo a este mensaje, y les indicaremos los pasos para una nueva postulación."
    : v === "breve" ? "Si siguen con ganas de continuar con el proyecto, avísennos por acá y les pasamos los pasos."
    : "Si todavía tienen ganas de seguir participando del proceso del proyecto de banda, avísennos respondiendo a este mensaje y les explicamos cómo volver a postularse.");

export function ilicText(f: IlicForm) {
  const M = mentions(f.ids), who = M.length ? M.join(" ") : "<@ID>", ok = f.res === "aceptada";
  const banda = f.banda.trim() ? `**${f.banda.trim()}**` : "**[nombre de la banda]**";
  const mot = f.motivos.split("\n").map(x => x.trim().replace(/^[-•*]\s*/, "").replace(/\.$/, "")).filter(Boolean).map(x => `- ${x.charAt(0).toUpperCase() + x.slice(1)}.`);
  const est = ok ? "**aceptada** ✅" : "**rechazada** ❌";
  const L: string[] = [`${saludoDe(f.saludo)}, ${who}!`, ""];
  if (f.v === "breve") {
    L.push(`La postulación de ${banda} ha sido ${est}.`);
    if (mot.length) L.push("", "**Motivos:**", ...mot);
    L.push("", ok ? "En breve les habilitamos los canales y el acceso al Discord de bandas. ¡Felicidades!" : "Pueden volver a postularse cuando quieran. ¡Ánimo!");
  } else if (f.v === "formal") {
    L.push(`Por medio del presente, el equipo de ilícitos les comunica que la postulación de ${banda} ha sido ${est}.`);
    if (mot.length) L.push("", ok ? "**La decisión se fundamenta en lo siguiente:**" : "**La decisión se fundamenta en los siguientes motivos:**", ...mot);
    L.push("", ok ? "En los próximos días se gestionarán los canales correspondientes y el acceso al Discord de bandas. Les solicitamos un poco de paciencia durante el proceso."
      : "Esta resolución no impide una nueva postulación: los invitamos a trabajar los puntos señalados y a presentarse nuevamente.", "", ok ? "¡Enhorabuena y bienvenidos!" : "Quedamos a disposición para cualquier consulta.");
  } else {
    L.push(`Desde el equipo encargado de ilícitos queremos comunicarte que la postulación de ${banda} ha sido ${est}.`);
    if (mot.length) L.push("", "**Por los siguientes motivos:**", ...mot);
    L.push("", ok ? "Vamos a ir gestionando los canales y el acceso al Discord de bandas; les pedimos un poco de paciencia. ¡Gracias!"
      : "Esto no quiere decir que se desanimen; al contrario, pueden volver con más motivación y postularse de nuevo. ¡Los esperamos nuevamente!");
    if (ok) L.push("", "¡Felicidades, los esperamos! 🎉");
  }
  if (f.seguir && ok) for (let j = 0; j < L.length; j++) L[j] = L[j]
    .replace(/^Vamos a ir gestionando/, "Una vez que nos confirmen, vamos a ir gestionando")
    .replace(/^En los próximos días se gestionarán/, "Recibida la confirmación, en los próximos días se gestionarán")
    .replace(/^En breve les habilitamos/, "Con su confirmación, les habilitamos");
  if (f.seguir) { const i = L.length - (ok ? (f.v === "breve" ? 2 : 4) : f.v === "formal" ? 2 : 0); L.splice(i, 0, "", seguirTxt(f.v, ok)); }
  L.push("", f.firma.trim() || "Atte.: Equipo de Ilícitos :knife:");
  return L.join("\n");
}

/* comunicado suelto para preguntar a una banda si sigue interesada */
export const consultaInteres = (who = "<@ID>", banda = "[nombre de la banda]") => [
  `¡Buenas, ${who}!`, "",
  `Desde el equipo de ilícitos queremos consultarles por el proyecto de **${banda}**.`, "",
  "¿Todavía tienen ganas de seguir participando del proceso del proyecto de banda y de acceder al Discord de bandas?", "",
  "- Si la respuesta es **sí**, respondan a este mensaje y seguimos con los próximos pasos.",
  "- Si ya **no** les interesa, avísennos igual así damos de baja la postulación.", "",
  "-# Si no tenemos respuesta en las próximas 72 horas, vamos a dar la postulación por cerrada.", "",
  "Atte.: Equipo de Ilícitos :knife:",
].join("\n");
