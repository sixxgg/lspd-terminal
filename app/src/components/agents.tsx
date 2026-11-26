import { useEffect, useMemo, useRef, useState } from "react";
import { FloatBox } from "./float";
import { Search, Users, Check, X, UserPlus } from "lucide-react";
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
   Con ↑ ↓ y Enter se elige sin mouse. Si hay uno elegido se muestra como ficha, con ✕ para cambiarlo.
   free: también acepta un nombre que no está en el roster (otro departamento, alguien que ya se fue) · sm: más bajo, para tablas y formularios densos */
export function AgentCombo({ value, onChange, names, agents, filter, placeholder = "Buscar agente por nombre, placa o rango…", sub, chosen = [], empty = "Sin resultados", clearable = true, className, free, sm }: {
  value: string; onChange: (n: string) => void; names?: string[]; agents?: Agent[]; filter?: (a: Agent) => boolean; placeholder?: string;
  sub?: (n: string) => string; chosen?: string[]; empty?: string; clearable?: boolean; className?: string; free?: boolean; sm?: boolean;
}) {
  useStoreVersion();
  const [q, setQ] = useState(""), [open, setOpen] = useState(false), [hi, setHi] = useState(0), [edit, setEdit] = useState(false);
  const box = useRef<HTMLDivElement>(null), inp = useRef<HTMLInputElement>(null), listRef = useRef<HTMLDivElement>(null);
  /* agents: otra lista de agentes (por ejemplo, los tres departamentos para la PSB) en lugar del roster del departamento */
  const R0 = getRoster(), R = agents || R0, byN = useMemo(() => new Map(R.map(a => [a.n, a])), [R]);
  const pool = useMemo(() => (names ? names.map(n => byN.get(n) || ({ n, r: "", p: "" } as Agent)) : R.filter(a => (!!agents || lvl(a.r) > 0) && (!filter || filter(a))))
    .slice().sort((a, b) => a.n.localeCompare(b.n, "es")), [names, R, byN, filter]);
  const list = useMemo(() => { const s = norm(q.trim()); if (!s) return pool;
    const hit = pool.filter(a => norm(`${a.n} ${a.p || ""} ${rankES(a.r)} ${sub ? sub(a.n) : ""}`).includes(s));
    return hit.sort((a, b) => +!norm(a.n).startsWith(s) - +!norm(b.n).startsWith(s) || a.n.localeCompare(b.n, "es")); }, [q, pool, sub]);
  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => { const h = (e: MouseEvent) => { const t = e.target as Node; if (box.current && !box.current.contains(t) && !listRef.current?.contains(t)) { setOpen(false); setEdit(false); } }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" }); }, [hi]);
  const pick = (n: string) => { onChange(n); setQ(""); setOpen(false); setEdit(false); inp.current?.blur(); };
  const cur = value ? byN.get(value) : undefined, showChip = !!value && !edit;
  return (
    <div ref={box} className={cn("relative", className)}>
      {showChip ? (
        <div className={cn("flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900/70", sm ? "h-9" : "h-11")}>
          <button type="button" onClick={() => { setEdit(true); setOpen(true); setTimeout(() => inp.current?.focus(), 0); }} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" title="Cambiar">
            <Avatar n={value} size={sm ? 22 : 28} /><span className="max-w-[70%] shrink-0 truncate text-sm font-semibold">{value}</span>
            {/* el rango y la placa ceden lugar al nombre cuando el campo es angosto */}
            {cur?.r && <span className="flex min-w-0 overflow-hidden"><RankBadge r={cur.r} /></span>}{cur?.p && <span className="shrink-0 font-mono text-xs text-slate-400">#{cur.p}</span>}
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
              else if (e.key === "Enter") { e.preventDefault(); if (list[hi]) pick(list[hi].n); else if (free && q.trim()) pick(q.trim()); }
              else if (e.key === "Escape") { setOpen(false); setEdit(false); } }}
            className={cn(sm ? "h-9" : "h-11", "w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none ring-brand-500/20 placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 dark:border-slate-700 dark:bg-slate-900/70")} />
        </div>
      )}
      {open && !showChip && (
        <FloatBox ref={listRef} anchor={box} role="listbox" className="p-1">
          {free && q.trim() && !list.some(a => norm(a.n) === norm(q.trim())) && <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => pick(q.trim())}
            className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm", !list.length && "bg-brand-50 dark:bg-brand-500/15")}><UserPlus className="size-4 shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate">Usar «<b>{q.trim()}</b>» <span className="text-xs text-slate-400">· no está en el roster</span></span></button>}
          {!list.length && !free && <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400"><Users className="size-4" />{empty}</div>}
          {list.slice(0, 80).map((a, i) => { const on = a.n === value || chosen.includes(a.n); return (
            <button key={`${a.n}|${a.p}|${i}`} type="button" role="option" aria-selected={i === hi} data-i={i} onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(a.n)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm", i === hi ? "bg-brand-50 dark:bg-brand-500/15" : "", on && "text-brand-700 dark:text-brand-200")}>
              <Avatar n={a.n} size={24} /><span className="min-w-0 flex-1 truncate font-medium">{a.n}{sub && sub(a.n) ? <span className="ml-1.5 text-xs font-normal text-slate-400">{sub(a.n)}</span> : null}</span>
              {a.e && a.e !== "Activo" && <Badge>{a.e}</Badge>}{a.r && <RankBadge r={a.r} />}
              <span className="w-12 text-right font-mono text-xs text-slate-400">{a.p ? "#" + a.p : ""}</span>{on && <Check className="size-4 text-brand-500" />}
            </button>); })}
          {list.length > 80 && <p className="px-2.5 py-1.5 text-[11px] text-slate-400">Seguí escribiendo para acotar ({list.length} coinciden)</p>}
        </FloatBox>
      )}
    </div>
  );
}

/* Compatibilidad: el selector anterior ahora es el buscador (en modo múltiple marca los ya elegidos y no muestra ficha) */
export function AgentPicker({ value, onChange, filter, multiple, empty = "Sin resultados", agents, sub }: {
  value: string | string[]; onChange: (n: string) => void; filter?: (a: Agent) => boolean; multiple?: boolean; max?: number; empty?: string; agents?: Agent[]; sub?: (n: string) => string;
}) {
  const sel = Array.isArray(value) ? value : value ? [value] : [];
  return <AgentCombo value={multiple ? "" : sel[0] || ""} chosen={multiple ? sel : []} onChange={onChange} filter={filter} empty={empty} clearable={!multiple} agents={agents} sub={sub} />;
}
