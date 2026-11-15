/* Campo con texto predictivo: mientras escribís sugiere el resto en gris (Tab o → para aceptarlo)
   y debajo muestra las opciones que coinciden para elegir con un toque. Se puede escribir cualquier otra cosa. */
import { useState } from "react";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

export function Predict({ value, onChange, list, placeholder, max = 6 }: { value: string; onChange: (v: string) => void; list: string[]; placeholder?: string; max?: number }) {
  const [focus, setFocus] = useState(false);
  const q = norm(value.trim()), starts = q ? list.filter(x => norm(x).startsWith(q) && norm(x) !== q) : [];
  const hit = starts[0], ghost = hit ? value + hit.slice(value.length) : "";
  const sug = (q ? [...starts, ...list.filter(x => !norm(x).startsWith(q) && norm(x).includes(q))] : list).filter(x => norm(x) !== q).slice(0, max);
  return (
    <div>
      <div className="relative">
        {focus && hit && <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-3 text-sm"><span className="invisible">{value}</span><span className="text-slate-400">{ghost.slice(value.length)}</span></span>}
        <input value={value} placeholder={placeholder} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (hit && (e.key === "Tab" || (e.key === "ArrowRight" && (e.target as HTMLInputElement).selectionStart === value.length))) { e.preventDefault(); onChange(hit); } }}
          className="fx-field h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700" />
      </div>
      {focus && sug.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{sug.map(x => (
        <button key={x} type="button" onMouseDown={e => { e.preventDefault(); onChange(x); }} className={cn("rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700", x === hit && "border-brand-500/60 text-brand-600 dark:text-brand-300")}>{x}</button>))}
        {hit && <span className="self-center text-[10.5px] text-slate-400">Tab para completar</span>}</div>}
    </div>);
}
