/* Entrega de condecoraciones: el rol (/me y /do) para entregarla en la ceremonia. Cada línea tiene como máximo 290 caracteres (lo que
   admite el chat del servidor); si algo la pasaría, se acorta el texto libre (el motivo) y, en último caso, se corta en una palabra.
   Ubicación en el uniforme, como en el LAPD: las condecoraciones (barras de cinta) y las medallas van del lado derecho del pecho, centradas
   sobre la placa con el nombre (la placa del departamento va del lado izquierdo); las franjas de servicio, en la parte baja de la manga izquierda. */
import type { Decor } from "@/lib/decor";

export type Ln = { c: "/me" | "/do"; t: string };
export type EntAg = { n: string; rk: string; f: boolean };
export const CHAT_MAX = 290;

const fit = (c: Ln["c"], t: string): Ln => {
  t = t.replace(/\s+/g, " ").trim(); const room = CHAT_MAX - c.length - 1;
  if (t.length <= room) return { c, t };
  const cut = t.slice(0, room - 1), sp = cut.lastIndexOf(" ");
  return { c, t: (sp > room * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, "") + "…" };
};
const hash = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const NOUN: Record<Decor["tab"], [string, string]> = { cond: ["condecoración", "condecoraciones"], med: ["medalla", "medallas"], fra: ["franja de servicio", "franjas de servicio"] };
const PLACE: Record<Decor["tab"], string> = {
  cond: "sobre el bolsillo derecho, centrada justo encima de la placa con su nombre",
  med: "del lado derecho del pecho, centrada por encima de la placa con su nombre",
  fra: "en la parte baja de la manga izquierda, alineada con el puño",
};
/* mensajes grabados (trato de usted, cortos). V: «Oficial II Pérez» (para hablarle); P: «para la Oficial II Pérez»; A: «a la…» / «al…» */
type Nm = { V: string; P: string; A: string };
const MSG: ((x: Nm, D: string) => string)[] = [
  x => `Para ${x.P}, en reconocimiento a su valor y a su compromiso con el servicio.`,
  x => `${x.V}: su esfuerzo no pasó desapercibido. Gracias por servir.`,
  x => `${cap(x.A)}, por estar a la altura cuando más se lo necesitó.`,
  (x, D) => `Con orgullo, para ${x.P}. El ${D} se lo agradece.`,
  x => `${x.V}, que este reconocimiento le recuerde por qué elegimos servir.`,
  x => `Para ${x.P}: servir y proteger, y hacerlo con honor.`,
  x => `${cap(x.A)}, ejemplo para sus compañeros. Gracias por su entrega.`,
  x => `${x.V}, su trabajo honra a este uniforme. Felicitaciones.`,
];
const MSG_FRA: ((x: Nm, D: string) => string)[] = [
  x => `Para ${x.P}, por sus años de servicio y su constancia.`,
  x => `${x.V}: cada franja cuenta una historia de servicio. Gracias.`,
  (x, D) => `${cap(x.A)}, por seguir eligiendo al ${D} día tras día.`,
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/* de las formas posibles, la más completa que entre en una línea */
const best = (c: Ln["c"], opts: string[]): Ln => { for (const t of opts) if (`${c} ${t}`.length <= CHAT_MAX) return { c, t }; return fit(c, opts[opts.length - 1]); };

export function entregaLines(d: Decor, ags: EntAg[], o: { dep: string; motivo?: string; seed?: string }): Ln[] {
  if (!ags.length) return [];
  const [n1, nP] = NOUN[d.tab] || NOUN.cond, n = ags.length, L: Ln[] = [];
  /* «la franja de servicio «Franja de servicio · 1 año»» queda repetido: si el nombre ya dice qué es, va solo el nombre */
  const said = norm0(d.t).startsWith(norm0(n1)), t = `«${d.t}»`, it1 = said ? t : `${n1} ${t}`, itP = said ? t : `${nP} ${t}`;
  const mot = String(o.motivo || "").trim().replace(/[.\s]+$/, ""), pool = d.tab === "fra" ? MSG_FRA : MSG, base = hash(`${d.k}|${o.seed || ""}`) % pool.length;
  L.push(fit("/me", `abre con cuidado una caja de terciopelo azul marino con el escudo del ${o.dep} grabado en la tapa.`));
  L.push(best("/do", n === 1 ? [`Dentro de la caja se aprecia ${said ? "la" : "una"} ${it1}, impecable sobre el forro de satén.`, `Dentro de la caja se aprecia ${said ? "la" : "una"} ${it1}.`]
    : [`Dentro de la caja se aprecian ${n} ${itP}, una para cada agente, impecables sobre el forro de satén.`, `Dentro de la caja se aprecian ${n} ${itP}, una para cada agente.`]));
  ags.forEach((a, i) => {
    const N = `${a.rk ? a.rk + " " : ""}${a.n}`, x: Nm = a.rk ? { V: N, P: `${a.f ? "la" : "el"} ${N}`, A: `${a.f ? "a la" : "al"} ${N}` } : { V: N, P: N, A: `a ${N}` };
    const pl = PLACE[d.tab] || PLACE.cond, pl1 = pl.split(",")[0];
    L.push(best("/me", [`saca de la caja la ${it1} y se la coloca ${x.A} ${pl}. Al terminar, sonríe y le tiende la mano para el saludo.`,
      `saca de la caja la ${it1} y se la coloca ${x.A} ${pl1}. Al terminar, sonríe y le tiende la mano para el saludo.`,
      `saca la ${n1} de la caja y se la coloca ${x.A} ${pl1}. Al terminar, sonríe y le tiende la mano.`]));
    /* mensaje: con motivo, si entra; si no, uno de la lista (distinto para cada agente) */
    const conMot = mot ? `Para ${x.P}, por ${mot.charAt(0).toLowerCase() + mot.slice(1)}. Gracias por todo.` : "", otro = pool[(base + i) % pool.length](x, o.dep);
    L.push(best("/do", [...(conMot ? [`En el reverso trae grabado un breve mensaje: «${conMot}»`] : []), `En el reverso trae grabado un breve mensaje: «${otro}»`]));
    L.push(fit("/do", `¿${cap(x.P)} le estrecharía la mano?`));
  });
  L.push(fit("/me", n === 1 ? "da un paso atrás, se cuadra y le dedica el saludo reglamentario." : "da un paso atrás, se cuadra y les dedica el saludo reglamentario a los condecorados."));
  return L;
}
const norm0 = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const lineTxt = (l: Ln) => `${l.c} ${l.t}`;
