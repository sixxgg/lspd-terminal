/* Idioma según quien visita: desde Argentina (o Uruguay) la terminal queda con voseo; desde España, Europa o el resto, con tuteo.
   En vez de duplicar cada texto, se pasa el voseo a tú sobre la pantalla ya dibujada (textos, placeholders, títulos).
   No toca lo que escribe el usuario (inputs, editores) ni el código. Se puede fijar a mano en Apariencia. */
type Lang = "auto" | "ar" | "es";
const K = "lspdt.next.lang";
export const langPref = (): Lang => { try { const v = localStorage.getItem(K); return v === "ar" || v === "es" ? v : "auto"; } catch { return "auto"; } };
export const setLangPref = (v: Lang) => { try { if (v === "auto") localStorage.removeItem(K); else localStorage.setItem(K, v); } catch { /* */ } location.reload(); };
export function langOf(): "ar" | "es" {
  const p = langPref(); if (p !== "auto") return p;
  let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* */ }
  if (/^America\/(Argentina|Buenos_Aires|Cordoba|Mendoza|Montevideo)/.test(tz)) return "ar";
  if (/^Europe\//.test(tz)) return "es";
  return (navigator.languages || [navigator.language]).some(l => /^es-(AR|UY)/i.test(l)) ? "ar" : "es";
}

const MAP: Record<string, string> = {
  abrí: "abre", agregá: "agrega", arrastrá: "arrastra", cambiá: "cambia", cargá: "carga", completá: "completa", confiás: "confías", contá: "cuenta", creá: "crea", dejá: "deja",
  describí: "describe", elegí: "elige", escribí: "escribe", exportá: "exporta", guardá: "guarda", ingresá: "ingresa", iniciá: "inicia", marcá: "marca", mirá: "mira", nombrá: "nombra",
  pegá: "pega", podés: "puedes", poné: "pon", probá: "prueba", reiniciá: "reinicia", restablecé: "restablece", revisá: "revisa", seleccioná: "selecciona", tenés: "tienes", tocá: "toca",
  usá: "usa", volvé: "vuelve", actuás: "actúas", apretá: "pulsa", ajustá: "ajusta", asumís: "asumes", avisá: "avisa", avisás: "avisas", basás: "basas", buscá: "busca", controlás: "controlas",
  copiá: "copia", cortás: "cortas", creés: "crees", cuestionás: "cuestionas", decidís: "decides", decís: "dices", dejás: "dejas", descubrís: "descubres", ejecutás: "ejecutas", elegís: "eliges",
  evitás: "evitas", garantizás: "garantizas", gestionás: "gestionas", hacé: "haz", hacés: "haces", llamás: "llamas", llegás: "llegas", llevás: "llevas", necesitás: "necesitas", olvidás: "olvidas",
  pedís: "pides", perdés: "pierdes", ponés: "pones", proponés: "propones", querés: "quieres", reconocés: "reconoces", restablecés: "restableces", revisás: "revisas", seguí: "sigue", seguís: "sigues",
  subí: "sube", sumá: "suma", traé: "trae", sabés: "sabes", mandá: "envía", mandás: "envías", esperá: "espera", empezá: "empieza", anotá: "anota", editá: "edita", borrá: "borra", sacá: "quita",
  vos: "tú", sos: "eres", acá: "aquí", celular: "móvil",
  abrila: "ábrela", armalo: "ármalo", armalos: "ármalos", arrastralos: "arrástralos", arrastrala: "arrástrala", acomodala: "acomódala", ayudanos: "ayúdanos", contanos: "cuéntanos",
  repetila: "repítela", buscalos: "búscalos", completala: "complétala", completalo: "complétalo", copialos: "cópialos", copialo: "cópialo", corregilo: "corrígelo", elegila: "elígela", elegilo: "elígelo",
  escribila: "escríbela", escribilo: "escríbelo", pegalas: "pégalas", pegalo: "pégalo", rellenala: "rellénala", fijate: "fíjate", asegurate: "asegúrate", acordate: "acuérdate", avisanos: "avísanos",
  decinos: "dinos", escribinos: "escríbenos", guardalo: "guárdalo", probalo: "pruébalo", cambiala: "cámbiala", subila: "súbela",
};
const RX = new RegExp(`(?<![\\p{L}])(${Object.keys(MAP).sort((a, b) => b.length - a.length).join("|")})(?![\\p{L}])`, "giu");
const toEs = (s: string) => s.replace(RX, m => { const r = MAP[m.toLowerCase()] || m; return m[0] !== m[0].toLowerCase() ? (m === m.toUpperCase() && m.length > 1 ? r.toUpperCase() : r[0].toUpperCase() + r.slice(1)) : r; });

const SKIP = "textarea,input,select,[contenteditable],code,pre,script,style,.no-tr", NOATTR = "[contenteditable] *,code,pre,.no-tr";
const ATTR = ["placeholder", "title", "aria-label", "data-ph"];
const txt = (n: Node) => { const v = n.nodeValue || "", t = toEs(v); if (t !== v) n.nodeValue = t; };
const attrs = (e: Element) => { if (e.matches(NOATTR)) return; for (const a of ATTR) { const v = e.getAttribute(a); if (v) { const t = toEs(v); if (t !== v) e.setAttribute(a, t); } } };
function fix(root: Node) {
  if (root.nodeType === 3) { if (root.parentElement && !root.parentElement.closest(SKIP)) txt(root); return; }
  if (root.nodeType !== 1) return;
  const el = root as Element; attrs(el); if (el.closest(SKIP)) return;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => {
    if (n.nodeType === 1) { attrs(n as Element); return (n as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP; }
    return NodeFilter.FILTER_ACCEPT; } });
  for (let n = w.nextNode(); n; n = w.nextNode()) txt(n);
}
export function startLang() {
  const l = langOf(); document.documentElement.lang = l === "ar" ? "es-AR" : "es-ES";
  if (l !== "es" || typeof MutationObserver === "undefined") return;
  fix(document.body);
  new MutationObserver(ms => { for (const m of ms) {
    if (m.type === "characterData") fix(m.target);
    else if (m.type === "attributes") fix(m.target);
    else m.addedNodes.forEach(fix);
  } }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
}
