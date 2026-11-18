/* Campo con texto predictivo: mientras escribís sugiere el resto en gris (Tab o → para aceptarlo)
   y muestra las opciones que coinciden para elegir con un toque (debajo, o flotando con «float»). Se puede escribir cualquier otra cosa. */
import { useRef, useState } from "react";
import { FloatBox } from "./float";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

export function Predict({ value, onChange, list, placeholder, max = 6, float, upper, className, label }: {
  value: string; onChange: (v: string) => void; list: string[]; placeholder?: string; max?: number; float?: boolean; upper?: boolean; className?: string; label?: string;
}) {
  const [focus, setFocus] = useState(false), [hi, setHi] = useState(0), anc = useRef<HTMLDivElement>(null);
  const q = norm(value.trim()), starts = q ? list.filter(x => norm(x).startsWith(q) && norm(x) !== q) : [];
  const hit = starts[0], ghost = hit ? value + hit.slice(value.length) : "";
  const sug = (q ? [...starts, ...list.filter(x => !norm(x).startsWith(q) && norm(x).includes(q))] : list).filter(x => norm(x) !== q).slice(0, float ? Math.max(max, 8) : max);
  const set = (v: string) => onChange(upper ? v.toUpperCase() : v);
  return (
    <div className={cn(float && "relative", className)}>
      <div ref={anc} className="relative">
        {focus && hit && <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-3 text-sm"><span className="invisible">{value}</span><span className="text-slate-400">{ghost.slice(value.length)}</span></span>}
        <input value={value} placeholder={placeholder} aria-label={label} onFocus={() => { setFocus(true); setHi(-1); }} onBlur={() => setTimeout(() => setFocus(false), 150)} onChange={e => { set(e.target.value); setHi(-1); }}
          onKeyDown={e => {
            if (float && sug.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); setHi(i => (e.key === "ArrowDown" ? Math.min(sug.length - 1, i + 1) : Math.max(-1, i - 1))); return; }
            if (float && e.key === "Enter" && hi >= 0 && sug[hi]) { e.preventDefault(); set(sug[hi]); setHi(-1); return; }
            if (hit && (e.key === "Tab" || (e.key === "ArrowRight" && (e.target as HTMLInputElement).selectionStart === value.length))) { e.preventDefault(); set(hit); } }}
          className="fx-field h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700" />
      </div>
      {focus && sug.length > 0 && (float ? (
        <FloatBox anchor={anc} maxH={256} className="p-1 dark:bg-[rgb(var(--card))]">
          {sug.map((x, i) => (
            <button key={x} type="button" onMouseDown={e => { e.preventDefault(); set(x); }} onMouseEnter={() => setHi(i)}
              className={cn("block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-slate-600 dark:text-slate-300", i === hi && "bg-slate-100 dark:bg-slate-800", x === hit && "font-semibold text-brand-600 dark:text-brand-300")}>{x}</button>))}
          {hit && <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] text-slate-400">Tab completa · ↑↓ y Enter eligen</p>}
        </FloatBox>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1">{sug.map(x => (
          <button key={x} type="button" onMouseDown={e => { e.preventDefault(); set(x); }} className={cn("rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700", x === hit && "border-brand-500/60 text-brand-600 dark:text-brand-300")}>{x}</button>))}
          {hit && <span className="self-center text-[10.5px] text-slate-400">Tab para completar</span>}</div>))}
    </div>);
}
