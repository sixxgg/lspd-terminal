/* Vista previa de Discord fiel: títulos, -# subtítulos, citas, listas, negrita/cursiva/subrayado/tachado,
   código, spoilers, menciones (<@id>, <@&rol>), marcas de tiempo <t:...> y emojis propios del servidor. */
import { getRoster } from "./domain";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export type DcCtx = { users?: Record<string, string>; roles?: Record<string, string> };

function ts(u: number, f: string) {
  const d = new Date(u * 1000); if (isNaN(+d)) return "";
  if (f === "R") {
    const s = Math.round((+d - Date.now()) / 1000), a = Math.abs(s), r = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
    return a < 60 ? r.format(s, "second") : a < 3600 ? r.format(Math.round(s / 60), "minute") : a < 86400 ? r.format(Math.round(s / 3600), "hour") : a < 2592000 ? r.format(Math.round(s / 86400), "day") : r.format(Math.round(s / 2592000), "month");
  }
  const o: Record<string, Intl.DateTimeFormatOptions> = { t: { hour: "2-digit", minute: "2-digit" }, T: { hour: "2-digit", minute: "2-digit", second: "2-digit" }, d: { day: "2-digit", month: "2-digit", year: "numeric" },
    D: { day: "numeric", month: "long", year: "numeric" }, f: { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }, F: { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" } };
  return d.toLocaleString("es-AR", o[f] || o.f);
}
const userName = (id: string) => getRoster().find(a => String(a.i || "").trim() === id || String(a.d || "").trim() === id)?.n || "";
const MEN = "rounded bg-[#5865f2]/30 px-0.5 font-medium text-[#c9cdfb]";
function inline(s: string, c: DcCtx) {
  return s
    .replace(/`([^`\n]+)`/g, '<code class="rounded bg-[#2b2d31] px-1 py-0.5 font-mono text-[0.85em]">$1</code>')
    .replace(/&lt;t:(\d+)(?::([tTdDfFR]))?&gt;/g, (_m, u, f) => `<span class="rounded bg-white/10 px-1">${esc(ts(+u, f || "f"))}</span>`)
    .replace(/&lt;@&amp;(\d+)&gt;/g, (_m, id) => `<span class="${MEN}">@${esc(c.roles?.[id] || "rol")}</span>`)
    .replace(/&lt;@!?(\d+)&gt;/g, (_m, id) => `<span class="${MEN}">@${esc(c.users?.[id] || userName(id) || "usuario")}</span>`)
    .replace(/&lt;#(\d+)&gt;/g, `<span class="${MEN}">#canal</span>`)
    .replace(/&lt;(a?):(\w+):(\d+)&gt;/g, (_m, a, n, id) => `<img class="inline-block h-[1.375em] w-auto align-[-0.3em]" src="https://cdn.discordapp.com/emojis/${id}.${a ? "gif" : "webp"}?size=48" alt=":${n}:" title=":${n}:">`)
    .replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>").replace(/\*\*(.+?)\*\*/g, "<b class=\"font-semibold text-white\">$1</b>")
    .replace(/__(.+?)__/g, "<u>$1</u>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, "$1<i>$2</i>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>").replace(/\|\|(.+?)\|\|/g, '<span class="rounded bg-[#1e1f22] px-0.5 text-[#1e1f22] transition hover:text-inherit">$1</span>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, '$1<a class="text-[#00a8fc] hover:underline" href="$2" target="_blank" rel="noreferrer">$2</a>');
}
export function discordHtml(src: string, c: DcCtx = {}, bot = "LSPD Terminal", avatar = "/next/logo.svg") {
  let out = "", q = false, ul = false;
  for (const L of esc(src || "").split("\n")) {
    const h = /^(#{1,3}) (.*)$/.exec(L), bq = /^&gt; ?(.*)$/.exec(L), li = /^\s*[-*] (.*)$/.exec(L), sub = /^-# (.*)$/.exec(L);
    if (!bq && q) { out += "</div>"; q = false; }
    if (!li && ul) { out += "</ul>"; ul = false; }
    if (sub) { out += `<div class="text-xs text-[#949ba4]">${inline(sub[1], c)}</div>`; continue; }
    if (h) { out += `<div class="${["", "text-2xl", "text-xl", "text-base"][h[1].length]} my-1 font-bold leading-tight text-white">${inline(h[2], c)}</div>`; continue; }
    if (bq) { if (!q) { out += '<div class="my-0.5 border-l-4 border-[#4e5058] pl-3">'; q = true; } out += `<div>${inline(bq[1], c) || "&nbsp;"}</div>`; continue; }
    if (li) { if (!ul) { out += '<ul class="ml-5 list-disc">'; ul = true; } out += `<li>${inline(li[1], c)}</li>`; continue; }
    out += L.trim() ? `<div>${inline(L, c)}</div>` : '<div class="h-[0.6em]"></div>';
  }
  if (q) out += "</div>"; if (ul) out += "</ul>";
  const time = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `<div class="flex gap-3"><img src="${esc(avatar)}" alt="" class="mt-0.5 size-10 shrink-0 rounded-full bg-black/20 object-contain p-1"><div class="min-w-0 flex-1">
    <div class="flex items-baseline gap-1.5"><b class="font-medium text-white">${esc(bot)}</b><span class="rounded bg-[#5865f2] px-1 text-[10px] font-semibold text-white">APP</span><span class="text-xs text-[#949ba4]">Hoy a las ${time}</span></div>
    <div class="break-words">${out}</div></div></div>`;
}

/* formato web: el mismo texto sin el formato de Discord, conservando los íconos */
export const discordPlain = (s: string) => s.split("\n").map(l => l
  .replace(/^#{1,3}\s+/, "").replace(/^-#\s+/, "").replace(/^>\s?/, "").replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$)/g, "$1$2").replace(/`([^`]*)`/g, "$1").replace(/\|\|(.+?)\|\|/g, "$1")).join("\n");
