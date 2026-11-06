/* Feedback (incidentes): tipos, plantillas y texto. El mismo código va en la versión clásica (v54_template.html). */
const FB_TIPOS = [
  ["pos", "Positive Feedback", "Actuación especialmente buena.", "#22c55e", "🟢", "👏 Reconocimiento"],
  ["good", "Good / Satisfactory Feedback", "Actuación correcta, cumple las expectativas.", "#3b82f6", "🔵", "👍 Valoración"],
  ["constr", "Constructive Feedback", "Hay aspectos para mejorar, aunque no necesariamente existe una falta.", "#eab308", "🟡", "🛠️ Aspectos a mejorar"],
  ["neg", "Negative Feedback", "Rendimiento o actuación por debajo de lo esperado.", "#f97316", "🟠", "📉 Aspectos a mejorar"],
  ["formal", "Formal Warning / Corrective Action", "Problema más serio que requiere una corrección formal.", "#ef4444", "🔴", "⚠️ Acción correctiva"],
  ["disc", "Disciplinary Action", "Entra en el ámbito disciplinario o de investigación. Se eleva a Asuntos Internos.", "#b91c1c", "⛔", "⚖️ Acción disciplinaria"],
];
const FB_MED = {
  pos: "Se deja constancia de la buena actuación. ¡Excelente trabajo!",
  good: "Actuación correcta y acorde a lo esperado. Seguir en esta línea.",
  constr: "Se recomienda tener en cuenta los puntos señalados en las próximas intervenciones.",
  neg: "Se espera una mejora en las próximas intervenciones. De repetirse, podrá derivar en una acción correctiva.",
  formal: "Se indica formalmente corregir lo señalado. Una reincidencia podrá derivar en una acción disciplinaria.",
  disc: "Se registra como acción disciplinaria.",
};
const fq = s => String(s == null ? "" : s).trim();
const fdot = s => fq(s).replace(/[.\s]+$/, "");
const finf = F => fq(F.inf).replace(/^#/, "");
const fcap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
/* plantillas: campos [clave, etiqueta, ejemplo, tipo ("art" = artículo del código penal, "ta" = texto largo)] */
const FB_TPL = [
  { k: "cargo", l: "Cargo incorrecto en el informe", tipo: "disc",
    f: [["inf", "N.º de informe", "1152"], ["suj", "Detenido", "Paco Torres"], ["mot", "Motivo de la detención", "exceso de velocidad"], ["art1", "Artículo imputado", "63.3", "art"], ["art2", "Artículo que correspondía", "138.37", "art"],
      ["cita", "Lo que dice el informe (textual)", "se procedió a la detención del sujeto por exceso de velocidad y conducción sin carnet de conducir", "ta"],
      ["exp", "En resumen (opcional)", "se sancionó una falta de documentación del vehículo y no la falta de permiso de conducir del conductor"]],
    h: (F, c) => `Tras revisar el informe${finf(F) ? " #" + finf(F) : ""} redactado por ${c.agArt} y los cargos imputados${fq(F.suj) ? " al detenido " + fq(F.suj) : ""}${fq(F.mot) ? " por " + fdot(F.mot) : ""}, se comprueba que se le imputó el **${c.art(F.art1)}** en lugar del **${c.art(F.art2)}**${fq(F.cita) ? `, pese a que el propio informe indica: «${fdot(F.cita).replace(/^[«"]|[»"]$/g, "")}»` : ""}.${fq(F.exp) ? `\n\nEs decir, ${fdot(F.exp).replace(/^es decir,?\s*/i, "")}.` : ""}`,
    m: F => `Revisar el Código Penal antes de imputar cargos y comprobar que cada artículo se corresponda con los hechos descritos.${finf(F) ? ` Corregir el informe #${finf(F)} con el artículo correcto.` : ""}` },
  { k: "aten", l: "Faltaron las atenuaciones de las multas", tipo: "constr",
    f: [["inf", "N.º de informe", "1152"], ["suj", "Sujeto", "Paco Torres"], ["arts", "Multas implicadas", "Art. 63.3 y 138.37"], ["aten", "Atenuante que correspondía", "colaboración con los agentes"]],
    h: (F, c) => `Tras revisar el informe${finf(F) ? " #" + finf(F) : ""} redactado por ${c.agArt}, se observa que no se aplicaron las atenuaciones correspondientes a las multas implicadas${fq(F.arts) ? ` (${fdot(F.arts)})` : ""}${fq(F.suj) ? " al sujeto " + fq(F.suj) : ""}${fq(F.aten) ? `, pese a que concurría la circunstancia atenuante de ${fdot(F.aten)}` : ""}.`,
    m: () => "Revisar las circunstancias atenuantes y agravantes antes de cerrar el informe, y reflejarlas en las multas que correspondan." },
  { k: "info", l: "Faltó información en el informe", tipo: "constr",
    f: [["inf", "N.º de informe", "1152"], ["falta", "Qué información faltó", "las unidades intervinientes y la hora de la detención"]],
    h: (F, c) => `Tras revisar el informe${finf(F) ? " #" + finf(F) : ""} redactado por ${c.agArt}, se observa que le falta información necesaria para entender lo sucedido${fq(F.falta) ? ": " + fdot(F.falta) : ""}.`,
    m: () => "Completar el informe con todos los datos relevantes: qué pasó, quién intervino, dónde, cuándo y cómo terminó la intervención. Un informe debe poder entenderse sin haber estado en la escena." },
  { k: "fotos", l: "Faltaron fotos de la evidencia", tipo: "constr",
    f: [["inf", "N.º de informe", "1152"], ["falta", "Qué fotos faltaron", "los objetos incautados y la documentación del detenido"]],
    h: (F, c) => `Tras revisar el informe${finf(F) ? " #" + finf(F) : ""} redactado por ${c.agArt}, se observa que no se adjuntaron fotografías${fq(F.falta) ? " de " + fdot(F.falta) : ""} que respalden lo descrito.`,
    m: () => "Adjuntar siempre en el informe las fotografías de la evidencia (objetos incautados, vehículos y documentación). Sin ellas, los cargos pierden respaldo." },
  { k: "inc", l: "Incidente incompleto", tipo: "constr",
    f: [["inf", "N.º de informe", "1152"], ["falta", "Qué quedó sin completar", "no figuran los cargos ni el traslado a comisaría"]],
    h: (F, c) => `Tras revisar el informe${finf(F) ? " #" + finf(F) : ""} redactado por ${c.agArt}, se observa que el incidente quedó incompleto${fq(F.falta) ? ": " + fdot(F.falta) : ""}.`,
    m: () => "Antes de registrar un incidente, comprobar que esté completo: hechos, sujetos, cargos, evidencia y cierre de la intervención." },
  { k: "bien", l: "Buena actuación", tipo: "pos",
    f: [["sit", "Situación", "la persecución en Vinewood Blvd"], ["inf", "N.º de informe (opcional)", "1152"], ["det", "Qué hizo bien", "mantuvo la cadena de mando y calmó a los implicados"]],
    h: (F, c) => `${fcap(c.agArt)} tuvo una muy buena actuación${fq(F.sit) ? " en " + fdot(F.sit) : ""}${finf(F) ? ` (informe #${finf(F)})` : ""}${fq(F.det) ? ": " + fdot(F.det) : ""}.` },
  { k: "libre", l: "Otro (texto libre)", tipo: "", f: [], h: () => "" },
];
const fbNew = () => { const d = new Date(), p = n => String(n).padStart(2, "0");
  return { ag: "", tipo: "disc", tpl: "cargo", f: {}, obs: "", mejora: "", evid: "", hablado: false, fecha: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`, id: "" }; };
/* c = { agArt: "la agente Madison López", ag: "Oficial II Madison López · #814", sup: "Sargento II Ryan Westbrook", art: n => "Artículo 63.3 — Título" } */
function fbText(A, c) {
  const T = FB_TIPOS.find(t => t[0] === A.tipo) || FB_TIPOS[2], P = FB_TPL.find(t => t.k === A.tpl) || FB_TPL[FB_TPL.length - 1], F = A.f || {};
  const hech = [P.h(F, c), fq(A.obs)].filter(Boolean).join("\n\n") || "[Describí lo que se observó]";
  const med = fq(A.mejora) || (P.m ? P.m(F, c) : "") || FB_MED[T[0]];
  const ev = [...(finf(F) ? [`Informe #${finf(F)}`] : []), ...fq(A.evid).split("\n").map(fq).filter(Boolean)];
  const L = [`## ${T[4]} ${T[1]} — ${fq(A.ag) || "[Agente]"}`, "", `**Agente:** ${c.ag}`, `**Tipo:** ${T[1]}`, ...(P.k !== "libre" ? [`**Motivo:** ${P.l}`] : []),
    `**Registrado por:** ${c.sup}`, `**Fecha:** ${A.fecha || "—"}`, "", "### 📋 Hechos", hech, ""];
  if (ev.length) L.push("### 📎 Evidencia", ...ev.map(x => "- " + x), "");
  L.push(`### ${T[5]}`, med, "");
  if (T[0] === "disc") L.push("> ⚖️ Por tratarse de una acción disciplinaria, el caso se eleva a **Asuntos Internos (PSB)** para su evaluación.", "");
  L.push(`-# ${A.hablado ? "✅ Conversado con el agente." : "🕓 Pendiente de conversarlo con el agente."}`);
  return L.join("\n");
}
const fbErrs = A => [!fq(A.ag) && "agente", !A.tipo && "tipo"].filter(Boolean);
export { FB_TIPOS, FB_TPL, FB_MED, fbNew, fbText, fbErrs };
