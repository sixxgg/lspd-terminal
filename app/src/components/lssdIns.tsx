/* Insignias del LSSD por rango (dibujadas, sin imágenes externas):
   estrellas para el Executive Staff, hoja de roble para Comandante de Área, barras para Capitán y Teniente y galones para Sargento y Ayudantes. */
import { cn } from "@/lib/cn";

const G = "url(#lssdg)", S = "url(#lssds)";
const star = (cx: number, cy: number, r: number) => { const p: string[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); } return p.join(" "); };
const chev = (y: number) => `M6 ${y} L20 ${y - 7} L34 ${y} L34 ${y + 4.5} L20 ${y - 2.5} L6 ${y + 4.5}Z`;

function Art({ r }: { r: string }) {
  const stars = ({ "Sheriff": 4, "Undersheriff": 3, "Assistant Sheriff": 2, "Division Chief": 1 } as Record<string, number>)[r];
  if (stars) { const w = 8.4, x0 = 20 - ((stars - 1) * w) / 2; return <>{Array.from({ length: stars }, (_, i) => <polygon key={i} points={star(x0 + i * w, 20, stars > 2 ? 4.6 : 6.2)} fill={G} stroke="#7a5a12" strokeWidth=".6" />)}</>; }
  if (r === "Area Commander") return <path d="M20 8c5 3 7 7 6 12-1 3-3 5-6 6-3-1-5-3-6-6-1-5 1-9 6-12zm0 18v6" fill={S} stroke="#64748b" strokeWidth=".8" />;
  if (r === "Captain") return <><rect x="13" y="9" width="5" height="22" rx="1" fill={S} stroke="#64748b" strokeWidth=".6" /><rect x="22" y="9" width="5" height="22" rx="1" fill={S} stroke="#64748b" strokeWidth=".6" /></>;
  if (r === "Lieutenant") return <rect x="17.5" y="9" width="5" height="22" rx="1" fill={S} stroke="#64748b" strokeWidth=".6" />;
  const n = ({ "Sergeant": 3, "Deputy Sheriff Master FTO": 2, "Deputy Sheriff Bonus II": 2, "Deputy Sheriff Bonus I": 1 } as Record<string, number>)[r];
  if (n) { const y0 = 20 - (n - 1) * 3.5 + 2; return <>{Array.from({ length: n }, (_, i) => <path key={i} d={chev(y0 + i * 7)} fill={G} stroke="#7a5a12" strokeWidth=".5" />)}
    {r === "Deputy Sheriff Master FTO" && <path d="M8 29 Q20 36 32 29 L32 32.5 Q20 39.5 8 32.5Z" fill={G} stroke="#7a5a12" strokeWidth=".5" />}</>; }
  if (r === "Deputy Sheriff") return <polygon points={star(20, 20, 7)} fill={G} stroke="#7a5a12" strokeWidth=".6" />;
  return <polygon points={star(20, 20, 7)} fill="none" stroke="#e3b33c" strokeWidth="1.4" />;
}

export function LssdIns({ r, className, title }: { r: string; className?: string; title?: string }) {
  return (
    <span title={title || r} className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#1f3b2a] to-[#0f1f16] ring-1 ring-amber-500/30", className || "size-9")}>
      <svg viewBox="0 0 40 40" className="size-full">
        <defs><linearGradient id="lssdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe7a1" /><stop offset=".55" stopColor="#e3b33c" /><stop offset="1" stopColor="#a87a17" /></linearGradient>
          <linearGradient id="lssds" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset=".6" stopColor="#cbd5e1" /><stop offset="1" stopColor="#94a3b8" /></linearGradient></defs>
        <Art r={r} />
      </svg>
    </span>);
}
