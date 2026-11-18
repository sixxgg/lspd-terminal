/* Insignias de los rangos del LSSD y la SAHP, dibujadas (sin imágenes externas). Salen como data: SVG, así se usan igual que las del LSPD
   (insigniaUrl en domain.ts): estrellas de Sheriff (5) a Area Commander (1), barras de Captain y Lieutenant, galones de Sergeant y Deputies, huella para los K-9. */
const G = "url(#g)", S = "url(#s)";
const star = (cx: number, cy: number, r: number) => { const p: string[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); } return p.join(" "); };
const chev = (y: number) => `M6 ${y} L20 ${y - 7} L34 ${y} L34 ${y + 4.5} L20 ${y - 2.5} L6 ${y + 4.5}Z`;
const gold = `stroke="#7a5a12" stroke-width=".6" fill="${G}"`, silver = `stroke="#64748b" stroke-width=".6" fill="${S}"`;
const STARS: Record<string, number> = { "Sheriff": 5, "Undersheriff": 4, "Assistant Sheriff": 3, "Division Chief": 2, "Area Commander": 1,
  "Commissioner": 5, "Deputy Commissioner": 4, "Assistant Commissioner": 3, "Chief": 2 };
const CHEV: Record<string, number> = { "Sergeant": 3, "Deputy Sheriff Master FTO": 2, "Deputy Sheriff Bonus II": 2, "Deputy Sheriff Bonus I": 1 };
const KNOWN = new Set([...Object.keys(STARS), ...Object.keys(CHEV), "Captain", "Lieutenant", "Deputy Sheriff", "Deputy Sheriff Trainee", "K-9", "Officer", "Cadet"]);

function art(r: string) {
  const n = STARS[r];
  if (n) { const [w, rad] = ([[0, 9], [13, 6.6], [10.4, 5.3], [10.6, 5.6], [10.6, 5.4]] as const)[n - 1], x0 = 20 - ((n - 1) * w) / 2;
    return Array.from({ length: n }, (_, i) => `<polygon points="${star(x0 + i * w, 20, rad)}" ${gold}/>`).join(""); }
  if (r === "K-9") return `<g ${gold}><ellipse cx="20" cy="25" rx="6.5" ry="5.2"/><ellipse cx="12.5" cy="17.5" rx="2.6" ry="3.3"/><ellipse cx="17.4" cy="12.6" rx="2.6" ry="3.4"/><ellipse cx="22.6" cy="12.6" rx="2.6" ry="3.4"/><ellipse cx="27.5" cy="17.5" rx="2.6" ry="3.3"/></g>`;
  if (r === "Captain") return `<rect x="13" y="9" width="5" height="22" rx="1" ${silver}/><rect x="22" y="9" width="5" height="22" rx="1" ${silver}/>`;
  if (r === "Lieutenant") return `<rect x="17.5" y="9" width="5" height="22" rx="1" ${silver}/>`;
  const c = CHEV[r];
  if (c) { const y0 = 20 - (c - 1) * 3.5 + 2; return Array.from({ length: c }, (_, i) => `<path d="${chev(y0 + i * 7)}" ${gold}/>`).join("")
    + (r === "Deputy Sheriff Master FTO" ? `<path d="M8 29 Q20 36 32 29 L32 32.5 Q20 39.5 8 32.5Z" ${gold}/>` : ""); }
  if (r === "Deputy Sheriff" || r === "Officer") return `<polygon points="${star(20, 20, 7)}" ${gold}/>`;
  return `<polygon points="${star(20, 20, 7)}" fill="none" stroke="#e3b33c" stroke-width="1.4"/>`;
}
/* Sheriff y Undersheriff: más ancha para que entren 5 y 4 estrellas grandes */
export const xWide = (r: string) => (STARS[r] || 0) >= 4;
export const isXRank = (r: string) => KNOWN.has(r);
const CACHE = new Map<string, string>();
export function xInsSvg(r: string) {
  const hit = CACHE.get(r); if (hit) return hit;
  const vb = xWide(r) ? "-12 4 64 32" : "0 0 40 40";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a1"/><stop offset=".55" stop-color="#e3b33c"/><stop offset="1" stop-color="#a87a17"/></linearGradient><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".6" stop-color="#cbd5e1"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs>${art(r)}</svg>`;
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); CACHE.set(r, url); return url;
}
