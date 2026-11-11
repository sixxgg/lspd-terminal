/* Cinta de condecoración dibujada con CSS (sin imágenes) */
import { memo } from "react";
import { ribbonBg, type Decor } from "@/lib/decor";
import { cn } from "@/lib/cn";

const DEV: Record<string, JSX.Element> = {
  star: <path d="M12 3.5l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L12 16.3 6.9 19.1 8 13.4 3.8 9.5l5.7-.7z" fill="#f5c518" stroke="#7a5a00" strokeWidth=".8" />,
  starw: <path d="M12 3.5l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L12 16.3 6.9 19.1 8 13.4 3.8 9.5l5.7-.7z" fill="#fff" stroke="#555" strokeWidth=".6" />,
  oo: <g fill="none" stroke="#e8c45a" strokeWidth="1.8"><circle cx="8.5" cy="12" r="3.3" /><circle cx="15.5" cy="12" r="3.3" /></g>,
  heart: <path d="M12 18.5s-6.5-3.9-6.5-8.3A3.5 3.5 0 0 1 12 8.3a3.5 3.5 0 0 1 6.5 1.9c0 4.4-6.5 8.3-6.5 8.3z" fill="#e8c45a" />,
};

/* franjas de servicio: galones diagonales blancos */
function ServiceBars({ n, className }: { n: number; className?: string }) {
  const w = 18 / Math.max(1, n);
  return <svg viewBox="0 0 24 24" className={cn("h-7 w-7", className)} aria-hidden>{Array.from({ length: n }, (_, i) => { const x = 3 + i * w + w / 2;
    return <path key={i} d={`M${(x - 2.4).toFixed(1)} 19 L${(x + 2.4).toFixed(1)} 5`} stroke="#eef2f7" strokeWidth={Math.min(2.6, w * 0.7)} strokeLinecap="round" />; })}</svg>;
}

export const Ribbon = memo(function Ribbon({ d, size = "md", className }: { d: Decor; size?: "sm" | "md"; className?: string }) {
  if (d.tab === "fra") return <span title={d.t} className={cn("inline-grid place-items-center rounded bg-slate-900", size === "sm" ? "h-[18px] w-[46px]" : "h-[26px] w-[92px]", className)}><ServiceBars n={d.n || 1} className={size === "sm" ? "h-4 w-4" : ""} /></span>;
  return (
    <span title={d.t} className={cn("relative inline-block shrink-0 overflow-hidden rounded-[3px] shadow-[inset_0_0_0_1px_rgba(201,162,39,.85),0_1px_2px_rgba(0,0,0,.35)]", size === "sm" ? "h-[18px] w-[46px]" : "h-[26px] w-[92px]", className)}
      style={{ background: ribbonBg(d) }}>
      {d.dev && d.dev !== "check" && <svg viewBox="0 0 24 24" className="absolute left-1/2 top-1/2 h-[78%] -translate-x-1/2 -translate-y-1/2" aria-hidden>{DEV[d.dev]}</svg>}
    </span>
  );
});
