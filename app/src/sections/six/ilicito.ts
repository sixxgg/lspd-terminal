/* Respuesta del equipo de ilícitos a una postulación de banda (formato Discord), con variantes y saludo según la hora */
export type IlicForm = { ids: string; banda: string; res: "aceptada" | "rechazada"; motivos: string; v: "std" | "formal" | "breve"; saludo: "auto" | "dias" | "tardes" | "noches" | "hola"; firma: string };
export const ILIC_VARS: [IlicForm["v"], string][] = [["std", "Estándar"], ["formal", "Formal"], ["breve", "Breve"]];

const saludoDe = (s: IlicForm["saludo"]) => {
  if (s === "hola") return "¡Hola";
  const h = new Date().getHours(), k = s === "auto" ? (h >= 6 && h < 13 ? "dias" : h >= 13 && h < 20 ? "tardes" : "noches") : s;
  return k === "dias" ? "¡Buenos días" : k === "tardes" ? "¡Buenas tardes" : "¡Buenas noches";
};
export const mentions = (ids: string) => [...new Set(ids.split(/[\s,;]+/).map(x => x.replace(/[<@!>]/g, "").trim()).filter(x => /^\d{17,20}$/.test(x)))].map(x => `<@${x}>`);

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
  L.push("", f.firma.trim() || "Atte.: Equipo de Ilícitos :knife:");
  return L.join("\n");
}
