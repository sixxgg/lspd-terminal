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
  { k: "falta_art", l: "Faltó un artículo por imputar", tipo: "disc",
    f: [["inf", "N.º de informe", "1152"], ["suj", "Detenido", "Paco Torres"], ["mot", "Motivo de la detención", "conducción temeraria y huida de los agentes"], ["imp", "Artículos que sí se imputaron (opcional)", "Art. 63.3"],
      ["art", "Artículo que faltó imputar", "138.37", "art"], ["cita", "Lo que dice el informe (textual, opcional)", "el sujeto se dio a la fuga a pie tras la persecución", "ta"]],
    h: (F, c) => `Tras revisar el informe${finf(F) ? " #" + finf(F) : ""} redactado por ${c.agArt} y los cargos imputados${fq(F.suj) ? " al detenido " + fq(F.suj) : ""}${fq(F.mot) ? " por " + fdot(F.mot) : ""}, se comprueba que faltó imputar el **${c.art(F.art)}**${fq(F.cita) ? `, pese a que el propio informe indica: «${fdot(F.cita).replace(/^[«"]|[»"]$/g, "")}»` : ""}.${fq(F.imp) ? `\n\nSolo se imputó: ${fdot(F.imp)}.` : ""}`,
    m: F => `Revisar el Código Penal antes de cerrar el informe e imputar todos los artículos que correspondan a los hechos descritos.${finf(F) ? ` Corregir el informe #${finf(F)} agregando el artículo que faltó.` : ""}` },
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
  /* plantillas naturales (como los feedbacks reales de la supervisión): se completan con pocas palabras y el texto se arma solo */
  { k: "patrulla", l: "Patrullé con el agente (todo bien)", tipo: "pos",
    f: [["turno", "Turno", "noche / madrugada"], ["rol", "Qué hizo en la unidad (opcional)", "llevó el mando de la unidad"],
      ["fuertes", "Qué se le notó", "muy suelto y seguro, buen manejo de la radio y un trato excelente con los civiles"], ["proc", "Procedimientos (opcional)", "ejecuta casi todos a la perfección para su etapa"]],
    h: (F, c) => `Hoy patrullé con ${c.agArt}${fq(F.turno) ? ` en el turno de ${fdot(F.turno)}` : ""}${fq(F.rol) ? ` y ${fdot(F.rol)}` : ""}.${fq(F.fuertes) ? ` Se ${c.lo} notó ${fdot(F.fuertes)}.` : ""}${fq(F.proc) ? ` En procedimientos, ${fdot(F.proc)}.` : ""}\n\nFue un gusto compartir el turno y no tengo nada negativo para marcar.${c.prev ? ` Ya van ${c.prev} reconocimientos registrados en la terminal: se nota la constancia.` : ""}`,
    m: (F, c) => `Seguir así. ${fcap(c.agArt)} va por muy buen camino y está ${c.o === "a" ? "lista" : "listo"} para dar el siguiente paso.` },
  { k: "tactico", l: "Llevó muy bien un táctico", tipo: "pos",
    f: [["sit", "Situación", "el táctico del robo a la Fleeca de Great Ocean"],
      ["fuertes", "Qué hizo bien", "repartió bien las unidades, negoció con calma y tomó buenas decisiones sin esperar a que se las pidan"]],
    h: (F, c) => `${fcap(c.agArt)} se hizo cargo${fq(F.sit) ? ` de ${fdot(F.sit)}` : " del táctico"} y lo resolvió de forma muy completa${fq(F.fuertes) ? `: ${fdot(F.fuertes)}` : ""}.\n\nMantuvo la calma en todo momento y eso se le transmitió al resto del equipo. Es exactamente lo que se espera de quien lleva el mando de una escena.${c.prev ? ` Suma ${c.prev} reconocimientos registrados.` : ""}`,
    m: () => "Excelente trabajo. Seguir tomando la iniciativa con este mismo criterio." },
  { k: "blandas", l: "Muy bien en lo operativo, flojo en el trato", tipo: "constr",
    f: [["fuerte", "Lo que hace muy bien", "la organización de la malla radial y las decisiones tácticas"], ["mejora", "Lo que tiene que trabajar", "le cuesta relacionarse con el resto fuera de las emergencias"]],
    h: (F, c) => `En lo operativo, ${c.agArt} está a muy buen nivel${fq(F.fuerte) ? `: ${fdot(F.fuerte)}` : ""}. No hay nada que corregirle ahí.\n\nDonde todavía tiene margen es en el trato con el equipo${fq(F.mejora) ? `: ${fdot(F.mejora)}` : ""}. Para alguien que lleva o va a llevar mando, generar confianza con los compañeros es tan importante como decidir bien.`,
    m: () => "Trabajar la comunicación con el equipo: acercarse, hablar fuera de los avisos y generar un buen ambiente. Con eso, va a ser un líder muy completo." },
  { k: "temple", l: "Buen agente, pero pierde la calma", tipo: "constr",
    f: [["fuerte", "En qué está muy bien", "el procesamiento de detenidos, la lectura de derechos y la parte legal"], ["sit", "Cuándo pierde la calma", "cuando algo no sale como esperaba durante el turno"]],
    h: (F, c) => `El patrullaje con ${c.agArt} fue muy bueno: está muy bien ${c.o === "a" ? "preparada" : "preparado"}${fq(F.fuerte) ? `, sobre todo en ${fdot(F.fuerte)}` : ""}, y se mueve con mucha seguridad.\n\nLo único a marcar es el manejo de la frustración${fq(F.sit) ? `: ${fdot(F.sit)}` : ""}. Se lo hablamos en el momento y lo tomó bien.`,
    m: () => "Mantener la compostura en las situaciones tensas. Si logra controlar eso, tiene todo para ser un agente de referencia." },
  { k: "mandoNo", l: "Todavía no está para el mando", tipo: "neg",
    f: [["conducta", "Qué hizo", "se puso a patrullar solo en el Norte mientras coordinaba las unidades"], ["riesgo", "Por qué es un problema (opcional)", "se expuso a emboscadas y secuestros por ir solo y distraído"],
      ["criticas", "Cómo recibió las correcciones (opcional)", "se puso a la defensiva cuando se le marcaron los errores"]],
    h: (F, c) => `Llevando el mando, ${c.agArt}${fq(F.conducta) ? ` ${fdot(F.conducta)}` : " asumió funciones que no le correspondían"}.${fq(F.riesgo) ? ` Eso es un problema: ${fdot(F.riesgo)}.` : ""}${fq(F.criticas) ? `\n\nAdemás, ${fdot(F.criticas)}, y eso hace muy difícil corregir el rumbo.` : ""}\n\nPor ahora no está para ejercer el mando.`,
    m: () => "Quien lleva el mando coordina y no se expone: se queda en una posición segura y delega. Y las correcciones se escuchan, no se discuten en el momento. Se va a volver a evaluar más adelante." },
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
export { FB_TIPOS, FB_TPL, fbNew, fbText, fbErrs };
