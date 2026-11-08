import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Users, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { fotoOf, getRoster, imgOpt, initials, insigniaUrl, lvl, norm, rankES, RANK_COLOR, profOf } from "@/lib/domain";
import { useStoreVersion, type Agent } from "@/lib/store";
import { Badge } from "./ui";

/* Foto del agente (o sus iniciales) */
export function Avatar({ n, size = 32, className }: { n: string; size?: number; className?: string }) {
  const f = fotoOf(n), ph = profOf(n).ph || { x: 50, y: 22, z: 1 };
  const [err, setErr] = useState(false);
  return (
    <span style={{ width: size, height: size }} className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-[11px] font-bold text-slate-700 ring-1 ring-black/5 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200 dark:ring-white/10", className)}>
      {f && !err ? (
        <img src={err ? f : imgOpt(f, size > 64 ? 256 : 64)} alt="" loading="lazy" decoding="async" onError={e => { const i = e.currentTarget; if (i.src !== f && !i.dataset.r) { i.dataset.r = "1"; i.src = f; } else setErr(true); }}
          style={{ objectFit: "cover", objectPosition: `${ph.x}% ${ph.y}%`, transform: `scale(${ph.z || 1})`, width: "100%", height: "100%" }} />
      ) : initials(n)}
    </span>
  );
}

/* Insignia y rango del agente */
export function RankBadge({ r }: { r: string }) {
  const ins = insigniaUrl(r);
  return (
    <Badge color={RANK_COLOR[r] || "#94a3b8"}>
      {ins && <img loading="lazy" decoding="async" src={ins} alt="" className="h-3 w-auto" />}{rankES(r)}
    </Badge>
  );
}

/* Buscador de agentes: escribís y aparecen los que coinciden (nombre, placa o rango), ordenados de la A a la Z.
   Con ↑ ↓ y Enter se elige sin mouse. Si hay uno elegido se muestra como ficha, con ✕ para cambiarlo. */
export function AgentCombo({ value, onChange, names, filter, placeholder = "Buscar agente por nombre, placa o rango…", sub, chosen = [], empty = "Sin resultados", clearable = true, className }: {
  value: string; onChange: (n: string) => void; names?: string[]; filter?: (a: Agent) => boolean; placeholder?: string;
  sub?: (n: string) => string; chosen?: string[]; empty?: string; clearable?: boolean; className?: string;
}) {
  useStoreVersion();
  const [q, setQ] = useState(""), [open, setOpen] = useState(false), [hi, setHi] = useState(0), [edit, setEdit] = useState(false);
  const box = useRef<HTMLDivElement>(null), inp = useRef<HTMLInputElement>(null), listRef = useRef<HTMLDivElement>(null);
  const R = getRoster(), byN = useMemo(() => new Map(R.map(a => [a.n, a])), [R]);
  const pool = useMemo(() => (names ? names.map(n => byN.get(n) || ({ n, r: "", p: "" } as Agent)) : R.filter(a => lvl(a.r) > 0 && (!filter || filter(a))))
    .slice().sort((a, b) => a.n.localeCompare(b.n, "es")), [names, R, byN, filter]);
  const list = useMemo(() => { const s = norm(q.trim()); if (!s) return pool;
    const hit = pool.filter(a => norm(`${a.n} ${a.p || ""} ${rankES(a.r)} ${sub ? sub(a.n) : ""}`).includes(s));
    return hit.sort((a, b) => +!norm(a.n).startsWith(s) - +!norm(b.n).startsWith(s) || a.n.localeCompare(b.n, "es")); }, [q, pool, sub]);
  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => { const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setOpen(false); setEdit(false); } }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" }); }, [hi]);
  const pick = (n: string) => { onChange(n); setQ(""); setOpen(false); setEdit(false); inp.current?.blur(); };
  const cur = value ? byN.get(value) : undefined, showChip = !!value && !edit;
  return (
    <div ref={box} className={cn("relative", className)}>
      {showChip ? (
        <div className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900/70">
          <button type="button" onClick={() => { setEdit(true); setOpen(true); setTimeout(() => inp.current?.focus(), 0); }} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" title="Cambiar">
            <Avatar n={value} size={28} /><span className="truncate text-sm font-semibold">{value}</span>
            {cur?.r && <RankBadge r={cur.r} />}{cur?.p && <span className="font-mono text-xs text-slate-400">#{cur.p}</span>}
            {sub && sub(value) && <span className="truncate text-xs text-slate-400">· {sub(value)}</span>}
          </button>
          {clearable && <button type="button" aria-label="Quitar" onClick={() => onChange("")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"><X className="size-4" /></button>}
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} role="combobox" aria-expanded={open} aria-autocomplete="list"
            onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi(h => Math.min(list.length - 1, h + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); if (list[hi]) pick(list[hi].n); }
              else if (e.key === "Escape") { setOpen(false); setEdit(false); } }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none ring-brand-500/20 placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 dark:border-slate-700 dark:bg-slate-900/70" />
        </div>
      )}
      {open && !showChip && (
        <div ref={listRef} role="listbox" className="scrollbar-thin absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {!list.length && <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400"><Users className="size-4" />{empty}</div>}
          {list.slice(0, 80).map((a, i) => { const on = a.n === value || chosen.includes(a.n); return (
            <button key={a.n} type="button" role="option" aria-selected={i === hi} data-i={i} onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(a.n)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm", i === hi ? "bg-brand-50 dark:bg-brand-500/15" : "", on && "text-brand-700 dark:text-brand-200")}>
              <Avatar n={a.n} size={24} /><span className="min-w-0 flex-1 truncate font-medium">{a.n}{sub && sub(a.n) ? <span className="ml-1.5 text-xs font-normal text-slate-400">{sub(a.n)}</span> : null}</span>
              {a.e && a.e !== "Activo" && <Badge>{a.e}</Badge>}{a.r && <RankBadge r={a.r} />}
              <span className="w-12 text-right font-mono text-xs text-slate-400">{a.p ? "#" + a.p : ""}</span>{on && <Check className="size-4 text-brand-500" />}
            </button>); })}
          {list.length > 80 && <p className="px-2.5 py-1.5 text-[11px] text-slate-400">Seguí escribiendo para acotar ({list.length} coinciden)</p>}
        </div>
      )}
    </div>
  );
}

/* Compatibilidad: el selector anterior ahora es el buscador (en modo múltiple marca los ya elegidos y no muestra ficha) */
export function AgentPicker({ value, onChange, filter, multiple, empty = "Sin resultados" }: {
  value: string | string[]; onChange: (n: string) => void; filter?: (a: Agent) => boolean; multiple?: boolean; max?: number; empty?: string;
}) {
  const sel = Array.isArray(value) ? value : value ? [value] : [];
  return <AgentCombo value={multiple ? "" : sel[0] || ""} chosen={multiple ? sel : []} onChange={onChange} filter={filter} empty={empty} clearable={!multiple} />;
}
