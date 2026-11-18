/* Consulta del Manual del Novato: parte el manual en secciones y responde preguntas buscando las partes que mejor coinciden.
   No inventa nada: la respuesta es siempre texto literal del manual (las oraciones más relevantes de la sección que mejor encaja). */
import { norm } from "@/lib/domain";

export type Chunk = { id: number; sec: string; text: string; toks: string[]; head: string[] };
export type Hit = { c: Chunk; score: number; best: string[] };

const STOP = new Set(("a al algo algun alguna alguno algunos ante antes aqui asi aun cada como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era es esa ese eso esta estan este esto estos fue ha hace hacer hay la las le les lo los mas me mi mientras muy nada ni no nos o otra otro para pero poco por porque puede pueden que quien se segun ser si sin sobre son su sus tambien tan te tener tiene tienen todo todos tu un una uno unos usted y ya yo " +
  "debo debe deben debemos hago hacemos tengo tenemos puedo podemos cual cuanto cuantos cuantas pasa sucede significa quiere decir como se hace necesito saber explicame dime decime").split(" "));
/* palabras que en el manual aparecen de otra forma */
const SYN: Record<string, string[]> = {
  arresto: ["detencion", "detenido", "arrestar"], detencion: ["arresto", "detenido"], multa: ["sancion", "infraccion"], radio: ["frecuencia", "codigo", "10"],
  uniforme: ["vestimenta", "uniformidad"], patrulla: ["patrullaje", "unidad", "vehiculo"], persecucion: ["seguimiento", "huida"], arma: ["armamento", "tiro", "fuego"],
  ascenso: ["rango", "promocion"], rango: ["jerarquia", "ascenso"], cacheo: ["registro", "cachear"], esposar: ["esposas", "grilletes"], derechos: ["miranda"],
  novato: ["cadete", "oficial", "recluta"], cadete: ["novato", "academia"], servicio: ["turno", "guardia"], codigo: ["clave", "10"],
};
/* raíz sencilla: saca plurales y terminaciones comunes para que «detenidos» y «detención» se encuentren */
const stem = (w: string) => w.length <= 4 ? w : w.replace(/(aciones|iciones|amientos|imientos|aciones)$/, "").replace(/(acion|icion|amiento|imiento|mente)$/, "")
  .replace(/(ados|idos|adas|idas|ando|iendo)$/, "").replace(/(ado|ido|ada|ida|ar|er|ir)$/, "").replace(/(es|s)$/, "") || w;
export const toks = (t: string) => norm(t).replace(/[^a-z0-9ñ\s-]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w)).map(stem).filter(w => w.length > 1);

/* títulos: líneas cortas en mayúsculas, numeradas («1.», «2.3», «Artículo 4») o con # */
const isHead = (l: string) => { const s = l.trim(); if (!s || s.length > 90) return false;
  return /^#{1,4}\s/.test(s) || /^(cap[ií]tulo|art[ií]culo|secci[oó]n|anexo|parte)\b/i.test(s) || /^\d+(\.\d+)*[.)]?\s+\S/.test(s) && s.length < 70 && !/[.;:]$/.test(s)
    || (s === s.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(s) && s.split(/\s+/).length <= 10); };

export function chunk(manual: string): Chunk[] {
  const L = manual.replace(/\r/g, "").split("\n"), out: Chunk[] = []; let sec = "Introducción", buf: string[] = [];
  const flush = () => { const text = buf.join("\n").replace(/\n{3,}/g, "\n\n").trim(); buf = [];
    if (text.length < 25) return;
    /* secciones muy largas: se cortan en bloques de párrafos de ~900 caracteres */
    const P = text.split(/\n\s*\n/); let cur = "";
    const push = (t: string) => out.push({ id: out.length, sec, text: t.trim(), toks: toks(t), head: toks(sec) });
    for (const p of P) { if (cur && cur.length + p.length > 900) { push(cur); cur = ""; } cur += (cur ? "\n\n" : "") + p; }
    if (cur.trim()) push(cur); };
  for (const l of L) { if (isHead(l)) { flush(); sec = l.trim().replace(/^#+\s*/, ""); } else buf.push(l); }
  flush(); return out;
}

const sentences = (t: string) => t.split(/(?<=[.!?;:])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 3);
/* búsqueda BM25 con los títulos de sección pesando el doble y sinónimos a medio peso */
export function ask(q: string, C: Chunk[], k = 3): Hit[] {
  const base = toks(q); if (!base.length || !C.length) return [];
  const extra = base.flatMap(w => Object.entries(SYN).filter(([a]) => stem(a) === w).flatMap(([, v]) => v.map(stem))).filter(w => !base.includes(w));
  const N = C.length, avg = C.reduce((a, c) => a + c.toks.length, 0) / N || 1, df = new Map<string, number>();
  for (const w of new Set([...base, ...extra])) df.set(w, C.filter(c => c.toks.includes(w) || c.head.includes(w)).length);
  const idf = (w: string) => Math.log(1 + (N - (df.get(w) || 0) + 0.5) / ((df.get(w) || 0) + 0.5));
  const sc = (c: Chunk) => { let s = 0; const tf = new Map<string, number>(); c.toks.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
    for (const [w, wt] of [...base.map(w => [w, 1] as const), ...extra.map(w => [w, 0.5] as const)]) { const f = tf.get(w) || 0, h = c.head.includes(w) ? 2 : 0;
      if (f || h) s += wt * idf(w) * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * c.toks.length / avg)) + h); }
    /* frase exacta de dos palabras seguidas: bonus */
    const nt = norm(c.text); for (let i = 0; i + 1 < base.length; i++) if (nt.includes(norm(q).split(/\s+/).slice(i, i + 2).join(" "))) s += 0.5;
    return s; };
  return C.map(c => ({ c, score: sc(c), best: [] as string[] })).filter(h => h.score > 0.6).sort((a, b) => b.score - a.score).slice(0, k)
    .map(h => { const S = sentences(h.c.text), qs = new Set([...base, ...extra]);
      const r = S.map((s, i) => ({ s, i, n: toks(s).filter(w => qs.has(w)).length })).filter(x => x.n).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 3).sort((a, b) => a.i - b.i);
      return { ...h, best: r.length ? r.map(x => x.s) : S.slice(0, 2) }; });
}
/* para resaltar: las raíces de la pregunta */
export const qStems = (q: string) => new Set(toks(q));
