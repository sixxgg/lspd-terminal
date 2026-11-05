import { useMemo, useState } from "react";
import { ChevronDown, Search, Users, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { fotoOf, getRoster, imgOpt, initials, insigniaUrl, lvl, norm, rankES, RANK_COLOR, GROUPS, profOf } from "@/lib/domain";
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
      {ins && <img src={ins} alt="" className="h-3 w-auto" />}{rankES(r)}
    </Badge>
  );
}

/* Selector de agentes agrupado por rango, con búsqueda por nombre o placa */
export function AgentPicker({ value, onChange, filter, multiple, max = 220, empty = "Sin resultados" }: {
  value: string | string[]; onChange: (n: string) => void; filter?: (a: Agent) => boolean; multiple?: boolean; max?: number; empty?: string;
}) {
  useStoreVersion();
  const [q, setQ] = useState(""), [grp, setGrp] = useState(""), [open, setOpen] = useState<Set<string>>(new Set());
  const sel = Array.isArray(value) ? value : value ? [value] : [];
  const list = useMemo(() => {
    const s = norm(q.trim());
    return getRoster().filter(a => lvl(a.r) > 0 && (!filter || filter(a)))
      .filter(a => !grp || GROUPS[grp].r.includes(a.r))
      .filter(a => !s || norm(a.n).includes(s) || String(a.p || "").includes(s))
      .sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n));
  }, [q, grp, filter]);
  const ranks = [...new Set(list.map(a => a.r))];
  const showAll = !!q.trim() || list.length <= 8 || ranks.length < 2;
  const toggle = (r: string) => setOpen(o => { const n = new Set(o); n.has(r) ? n.delete(r) : n.add(r); return n; });
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex gap-2 border-b border-slate-100 p-2 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o placa…"
            className="h-9 w-full rounded-lg bg-slate-50 pl-9 pr-3 text-sm outline-none ring-brand-500/20 placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800/60" />
        </div>
        <select value={grp} onChange={e => setGrp(e.target.value)} className="h-9 rounded-lg bg-slate-50 px-2 text-xs font-medium text-slate-600 outline-none focus:ring-4 focus:ring-brand-500/20 dark:bg-slate-800/60 dark:text-slate-300">
          <option value="">Todos</option>{Object.entries(GROUPS).map(([k, g]) => <option key={k} value={k}>{g.l}</option>)}
        </select>
      </div>
      <div className="scrollbar-thin overflow-y-auto" style={{ maxHeight: max }}>
        {!list.length && <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Users className="size-4" />{empty}</div>}
        {ranks.map(r => {
          const l = list.filter(a => a.r === r), isOpen = showAll || open.has(r) || l.some(a => sel.includes(a.n));
          return (
            <div key={r}>
              <button type="button" onClick={() => toggle(r)} className="flex w-full items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-1.5 text-left hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/60">
                <RankBadge r={r} /><span className="text-[11px] text-slate-400">{l.length} {l.length === 1 ? "agente" : "agentes"}</span>
                <ChevronDown className={cn("ml-auto size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && l.map(a => {
                const on = sel.includes(a.n);
                return (
                  <button key={a.n} type="button" onClick={() => onChange(a.n)}
                    className={cn("flex w-full items-center gap-2.5 border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-0 focus-visible:bg-brand-50 focus-visible:outline-none dark:border-slate-800/70 dark:focus-visible:bg-brand-500/10",
                      on ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                    <Avatar n={a.n} size={24} />
                    <span className="flex-1 truncate font-medium">{a.n}</span>
                    {a.e && a.e !== "Activo" && <Badge>{a.e}</Badge>}
                    <span className="font-mono text-xs text-slate-400">{a.p ? "#" + a.p : "—"}</span>
                    {multiple && on && <Check className="size-4 text-brand-500" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400 dark:border-slate-800">{list.length} agentes{sel.length ? ` · ${multiple ? "Elegidos" : "Elegido"}: ${sel.join(", ")}` : ""}</div>
    </div>
  );
}
