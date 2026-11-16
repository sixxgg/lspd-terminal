import { escHtml } from "./domain";
/* Texto con formato del feedback: se arma con un editor (contentEditable) y SIEMPRE se vuelve a construir con una lista blanca
   antes de guardarlo o mostrarlo (nada de scripts, eventos ni estilos raros: solo negrita, subrayado, tachado, oculto, color e imágenes). */
const TAGS: Record<string, string> = { B: "b", STRONG: "b", I: "i", EM: "i", U: "u", S: "s", STRIKE: "s", DEL: "s", DIV: "div", P: "div", BR: "br", UL: "ul", OL: "ol", LI: "li", SPAN: "span", FONT: "span", H1: "h3", H2: "h3", H3: "h3", H4: "h3", H5: "h3", H6: "h3", BLOCKQUOTE: "blockquote" };
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i;
const esc = escHtml;
export const FB_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

/* img(el): devuelve la URL a usar para una imagen (o "" para descartarla) */
export function safeHtml(html: string, img: (el: Element) => string = el => { const s = el.getAttribute("src") || ""; return /^data:image\/(png|jpe?g|gif|webp);base64,/.test(s) ? s : ""; }): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const walk = (n: Node): string => {
    if (n.nodeType === 3) return esc(n.textContent || "");
    if (n.nodeType !== 1) return "";
    const el = n as Element, tag = TAGS[el.tagName], inner = () => [...el.childNodes].map(walk).join("");
    if (el.tagName === "IMG") { const u = img(el); return u ? `<img src="${esc(u)}" alt="" loading="lazy">` : ""; }
    if (!tag) return inner(); // etiqueta no permitida: se queda solo el contenido
    if (tag === "br") return "<br>";
    if (tag === "span") {
      const sp = el.hasAttribute("data-sp"), c = (el.getAttribute("color") || (el as HTMLElement).style?.color || "").trim();
      const body = inner(); if (!body) return "";
      let out = body;
      if (c && COLOR_RE.test(c)) out = `<span style="color:${c}">${out}</span>`;
      if (sp) out = `<span data-sp>${out}</span>`;
      return out;
    }
    return `<${tag}>${inner()}</${tag}>`;
  };
  return [...doc.body.firstChild!.childNodes].map(walk).join("");
}
export const plainOf = (html: string) => new DOMParser().parseFromString(`<div>${html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/div>/gi, "\n")}</div>`, "text/html").body.textContent?.trim() || "";
/* texto con formato → markdown de Discord (el color no existe en Discord: se deja el texto) */
export function htmlToDc(html: string): string {
  if (!/[<&]/.test(html)) return html.trim();
  const doc = new DOMParser().parseFromString(`<div>${safeHtml(html)}</div>`, "text/html");
  const w = (n: Node): string => {
    if (n.nodeType === 3) return n.textContent || "";
    if (n.nodeType !== 1) return "";
    const el = n as Element, t = el.tagName, c = [...el.childNodes].map(w).join("");
    const wrap = (m: string) => (c.trim() ? m + c + m : c);
    if (t === "BR") return "\n";
    if (t === "B") return wrap("**"); if (t === "I") return wrap("*"); if (t === "U") return wrap("__"); if (t === "S") return wrap("~~");
    if (t === "SPAN" && el.hasAttribute("data-sp")) return wrap("||");
    if (t === "DIV") return "\n" + c;
    if (t === "H3") return "\n### " + c.trim() + "\n";
    if (t === "BLOCKQUOTE") return "\n" + c.trim().split("\n").map(l => "> " + l).join("\n") + "\n";
    if (t === "LI") return "\n- " + c;
    return c;
  };
  return w(doc.body.firstChild!).replace(/\n{3,}/g, "\n\n").trim();
}
/* para mostrar: el texto plano viejo mantiene sus saltos de línea */
export const richOf = (s?: string) => (!s ? "" : /<[a-z]/i.test(s) ? safeHtml(s) : safeHtml(s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")));

/* markdown simple (lo que se copia de Discord, Notion o un bloc de notas) → texto con formato:
   # títulos, - y 1. listas, > citas, **negrita**, *cursiva*, __subrayado__, ~~tachado~~ y ||oculto|| */
export function mdToHtml(md: string): string {
  const inl = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<u>$1</u>").replace(/~~(.+?)~~/g, "<s>$1</s>").replace(/\|\|(.+?)\|\|/g, "<span data-sp>$1</span>")
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, "$1<i>$2</i>");
  const out: string[] = []; let list: "ul" | "ol" | "" = "";
  const close = () => { if (list) { out.push(`</${list}>`); list = ""; } };
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const l = raw.replace(/\s+$/, ""), h = /^\s*#{1,6}\s+(.*)/.exec(l), ul = /^\s*[-*•·]\s+(.*)/.exec(l), ol = /^\s*\d+[.)]\s+(.*)/.exec(l), q = /^\s*>\s?(.*)/.exec(l);
    if (ul || ol) { const k = ul ? "ul" : "ol"; if (list !== k) { close(); out.push(`<${k}>`); list = k; } out.push(`<li>${inl((ul || ol)![1])}</li>`); continue; }
    close();
    if (h) out.push(`<h3>${inl(h[1])}</h3>`); else if (q) out.push(`<blockquote>${inl(q[1]) || "<br>"}</blockquote>`); else out.push(l.trim() ? `<div>${inl(l)}</div>` : "<div><br></div>");
  }
  close(); return safeHtml(out.join(""));
}