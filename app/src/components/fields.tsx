import { useMemo, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

/* Etiquetas con sugerencias (lugares, agentes…): Enter o coma para agregar, Backspace para quitar la última */
export function TagInput({ value, onChange, suggestions, placeholder, normalize }: {
  value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder?: string; normalize?: (v: string) => string;
}) {
  const [q, setQ] = useState(""), [i, setI] = useState(0), [focus, setFocus] = useState(false);
  const list = useMemo(() => {
    const s = norm(q.trim()); if (s.length < 2) return [];
    return suggestions.filter(x => !value.includes(x)).map(x => { const n = norm(x); return { x, p: n.startsWith(s) ? 0 : n.split(/\s+/).some(w => w.startsWith(s)) ? 1 : n.includes(s) ? 2 : 9 }; })
      .filter(o => o.p < 9).sort((a, b) => a.p - b.p || a.x.length - b.x.length).slice(0, 8).map(o => o.x);
  }, [q, suggestions, value]);
  const add = (v: string) => {
    v = v.replace(/\s+/g, " ").trim().replace(/[,;]+$/, ""); if (!v) return;
    const known = suggestions.find(x => norm(x) === norm(v)); v = normalize ? normalize(known || v) : known || v;
    if (!value.some(x => norm(x) === norm(v))) onChange([...value, v]);
    setQ(""); setI(0);
  };
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    if (list.length && focus) {
      if (e.key === "ArrowDown") { setI(Math.min(i + 1, list.length - 1)); e.preventDefault(); return; }
      if (e.key === "ArrowUp") { setI(Math.max(i - 1, 0)); e.preventDefault(); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); add(list[i]); return; }
      if (e.key === "Escape") { setQ(""); return; }
    }
    if ((e.key === "Enter" || e.key === ",") && q.trim()) { e.preventDefault(); add(q); }
    else if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="relative">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-slate-800 dark:bg-slate-900/70 dark:focus-within:border-brand-400">
        {value.map((v, j) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
            {v}<button type="button" aria-label={`Quitar ${v}`} onClick={() => onChange(value.filter((_, k) => k !== j))} className="rounded p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/25"><X className="size-3" /></button>
          </span>
        ))}
        <input value={q} onChange={e => { setQ(e.target.value); setI(0); }} onKeyDown={key} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => { setFocus(false); if (q.trim()) add(q); }, 150)}
          placeholder={value.length ? "" : placeholder} className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400" />
      </div>
      {focus && list.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {list.map((x, j) => (
            <button key={x} type="button" onMouseDown={e => { e.preventDefault(); add(x); }}
              className={cn("block w-full px-3 py-2 text-left text-sm", j === i ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>{x}</button>
          ))}
          <div className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400 dark:border-slate-800">↑↓ para elegir · Enter o Tab para usar · Esc para cerrar</div>
        </div>
      )}
    </div>
  );
}
