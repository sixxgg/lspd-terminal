/* Vista previa de Discord: interpreta el markdown que usa Discord (títulos, negrita, cursiva, código, citas, listas, menciones, spoilers). */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s: string): string {
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, '<code class="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.85em]">$1</code>');
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|[\s(])\*(\S[^*]*?)\*(?=[\s).,:;]|$)/g, "$1<em>$2</em>");
  h = h.replace(/__(.+?)__/g, "<u>$1</u>");
  h = h.replace(/\|\|(.+?)\|\|/g, '<span class="rounded bg-slate-600/60 px-1">$1</span>');
  h = h.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="rounded bg-indigo-500/25 px-1 font-medium text-indigo-200">@rol</span>');
  h = h.replace(/&lt;@!?(\d+)&gt;/g, '<span class="rounded bg-indigo-500/25 px-1 font-medium text-indigo-200">@usuario</span>');
  h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a class="text-sky-400 hover:underline" href="$1" target="_blank" rel="noreferrer">$1</a>');
  return h;
}

export function discordHtml(text: string): string {
  const out: string[] = [];
  let quote: string[] = [];
  const flush = () => { if (quote.length) { out.push(`<div class="my-1 border-l-4 border-slate-500/70 pl-3">${quote.join("<br>")}</div>`); quote = []; } };
  for (const raw of text.split("\n")) {
    const q = /^>\s?(.*)$/.exec(raw);
    if (q) { quote.push(lineHtml(q[1])); continue; }
    flush();
    out.push(raw.trim() ? `<div>${lineHtml(raw)}</div>` : '<div class="h-2"></div>');
  }
  flush();
  return out.join("");
}
function lineHtml(l: string): string {
  const h = /^(#{1,3})\s+(.*)$/.exec(l);
  if (h) { const sz = h[1].length === 1 ? "text-xl" : h[1].length === 2 ? "text-lg" : "text-base"; return `<span class="${sz} font-bold">${inline(h[2])}</span>`; }
  const li = /^\s*[-*]\s+(.*)$/.exec(l);
  if (li) return `<span class="pl-1">•&nbsp; ${inline(li[1])}</span>`;
  return inline(l);
}

/* formato web: el mismo texto sin el formato de Discord, conservando los íconos */
export const discordPlain = (s: string) => s.split("\n").map(l => l
  .replace(/^#{1,3}\s+/, "").replace(/^>\s?/, "").replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$)/g, "$1$2").replace(/`([^`]*)`/g, "$1").replace(/\|\|(.+?)\|\|/g, "$1")).join("\n");
