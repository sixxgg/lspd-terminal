/* Registro de patrullas: todo sale de las revisiones guardadas en «Revisión de patrullas» (lspdt.patHist).
   Tres vistas: por revisión (con su detalle), por agente (último estado de cada patrulla) y por patrulla (cómo viene cada modelo). */
import { useMemo, useState } from "react";
import { Car, ChevronDown, ClipboardList, Copy, Search, Trash2, Users, CalendarDays } from "lucide-react";
import { Button, Card, Empty, Input, Segmented, Select } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { fmtDate, norm, rankES } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { carType } from "@/lib/onx";
import { delPhotos, dmy, missOf, patReport, vName, vcount, vehOf, type Cell, type PHist, type PRow } from "@/lib/patrol";
import { cn } from "@/lib/cn";
import { StatusPill, Thumbs } from "./Patrullas";

/* tarjeta de un patrulla revisado */
function CarCard({ k, c, cap }: { k: string; c: Cell; cap: string }) {
  const ms = missOf(c), n = vName(k);
  return (
    <div className={cn("w-[16rem] rounded-xl border p-2.5", c.s === "no" ? "border-red-300/60 bg-red-500/[.04] dark:border-red-500/30" : c.s === "ok" ? "border-emerald-300/60 bg-emerald-500/[.04] dark:border-emerald-500/25" : "border-slate-200 dark:border-slate-800")}>
      <div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><Car className="size-4" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold" title={k}>{n.replace(/^Police /, "")}</p><p className="text-[10.5px] text-slate-400">{carType(k, n)}</p></div><StatusPill s={c.s} /></div>
      {ms.length > 0 && <p className="mt-2 text-[11.5px] leading-snug text-red-600 dark:text-red-400"><b>Falta:</b> {ms.join(" · ")}</p>}
      {c.by && <p className="mt-1.5 text-[10.5px] text-slate-400">Inspeccionó: {c.by}</p>}
      <Thumbs ids={c.f} cap={cap} />
    </div>);
}

type View = "rev" | "ag" | "car";
export function RegistroPatrullas() {
  const me = useMe(), { confirm } = useFeedback(), copy = useCopy();
  const [H, setH] = useJSON<PHist[]>("lspdt.patHist", []);
  const [view, setView] = useState<View>("rev"), [q, setQ] = useState(""), [by, setBy] = useState(""), [d1, setD1] = useState(""), [d2, setD2] = useState(""), [e, setE] = useState(""), [open, setOpen] = useState<string | null>(null);
  const s = norm(q.trim()), who = [...new Set(H.map(h => h.por.n))].sort();
  const list = useMemo(() => H.filter(h => (!s || h.rows.some(r => norm(r.n).includes(s) || String(r.p).includes(s) || vehOf(r).some(k => norm(vName(k)).includes(s)))) && (!by || h.por.n === by)
    && (!d1 || h.fecha >= d1) && (!d2 || h.fecha <= d2) && (e !== "no" || vcount(h.rows, "no") > 0) && (e !== "ok" || (!vcount(h.rows, "no") && !vcount(h.rows, "")))).sort((a, b) => b.t - a.t), [H, s, by, d1, d2, e]);
  const ok = list.reduce((n, h) => n + vcount(h.rows, "ok"), 0), no = list.reduce((n, h) => n + vcount(h.rows, "no"), 0);

  /* por agente: la última revisión de cada uno, con el último estado de cada patrulla */
  const byAg = useMemo(() => { const m = new Map<string, { r: PRow; h: PHist; n: number }>();
    for (const h of list) for (const r of h.rows) { const x = m.get(r.n); if (!x) m.set(r.n, { r, h, n: 1 }); else x.n++; }
    return [...m.values()].filter(x => !s || norm(x.r.n).includes(s)).sort((a, b) => a.r.n.localeCompare(b.r.n, "es")); }, [list, s]);
  /* por patrulla: cuántas veces se revisó cada modelo y cuántas vino incompleto */
  const byCar = useMemo(() => { const m: Record<string, { ok: number; no: number; last: string; miss: Record<string, number> }> = {};
    for (const h of list) for (const r of h.rows) for (const k of vehOf(r)) { const c = r.v[k]; if (!c || !c.s || c.s === "na") continue;
      const o = (m[k] ||= { ok: 0, no: 0, last: "", miss: {} }); if (c.s === "ok") o.ok++; else o.no++; if (h.fecha > o.last) o.last = h.fecha;
      (c.m || []).forEach(x => { const n = typeof x === "string" ? x : x.n; o.miss[n] = (o.miss[n] || 0) + 1; }); }
    return Object.entries(m).sort((a, b) => b[1].ok + b[1].no - (a[1].ok + a[1].no)); }, [list]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([[list.length, "Revisiones", ""], [new Set(list.flatMap(h => h.rows.map(r => r.n))).size, "Agentes revisados", ""], [ok + no, "Patrullas revisados", ""], [no, "No preparados", "text-red-600 dark:text-red-400"], [ok + no ? Math.round((ok * 100) / (ok + no)) + "%" : "—", "Preparados", "text-emerald-600 dark:text-emerald-400"]] as const).map(([n, k, c]) => (
          <Card key={k} className="p-4"><p className={cn("text-2xl font-bold tabular-nums", c)}>{n}</p><p className="text-xs text-slate-500">{k}</p></Card>))}
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <Segmented size="sm" value={view} onChange={setView} options={[{ value: "rev", label: "Revisiones", icon: <CalendarDays /> }, { value: "ag", label: "Agentes", icon: <Users /> }, { value: "car", label: "Patrullas", icon: <Car /> }]} />
          <div className="relative min-w-[13rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={x => setQ(x.target.value)} placeholder="Buscar agente, placa o patrulla…" /></div>
          <Select className="w-auto text-sm" value={by} onChange={x => setBy(x.target.value)}><option value="">Revisado por: todos</option>{who.map(n => <option key={n}>{n}</option>)}</Select>
          <Input type="date" className="w-auto" value={d1} onChange={x => setD1(x.target.value)} aria-label="Desde" title="Desde" />
          <Input type="date" className="w-auto" value={d2} onChange={x => setD2(x.target.value)} aria-label="Hasta" title="Hasta" />
          {view === "rev" && <Select className="w-auto text-sm" value={e} onChange={x => setE(x.target.value)}><option value="">Todos los estados</option><option value="no">Con no preparados</option><option value="ok">Todo preparado</option></Select>}
        </div>

        {!list.length ? <Empty icon={<ClipboardList />} title={H.length ? "Ninguna revisión coincide con los filtros" : "Todavía no hay revisiones guardadas"} desc={H.length ? undefined : "Se guardan desde «Revisión de patrullas»."} />
          : view === "rev" ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{list.map(h => { const okN = vcount(h.rows, "ok"), noN = vcount(h.rows, "no"), isO = open === h.id; return (
            <div key={h.id}>
              <button onClick={() => setOpen(isO ? null : h.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <Avatar n={h.por.n} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{dmy(h.fecha)} · {h.rows.length} {h.rows.length === 1 ? "agente" : "agentes"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Por {rankES(h.por.r)} {h.por.n} · guardada {fmtDate(h.t)} · <span className="text-emerald-600 dark:text-emerald-400">{okN} preparados</span>{noN > 0 && <> · <span className="text-red-600 dark:text-red-400">{noN} no preparados</span></>}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">{[...new Set(h.rows.flatMap(vehOf))].slice(0, 8).map(k => <span key={k} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{vName(k).replace(/^Police /, "")}</span>)}</div>
                </div>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isO && "rotate-180")} />
              </button>
              {isO && (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  {h.rows.map(r => (
                    <div key={r.n} className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <div className="flex w-52 items-center gap-2"><Avatar n={r.n} size={30} /><div><p className="font-semibold">{r.n}</p><div className="flex items-center gap-1.5"><RankBadge r={r.r} />{r.p && <span className="font-mono text-[11px] text-slate-400">#{r.p}</span>}</div></div></div>
                      <div className="flex flex-1 flex-wrap gap-2">{vehOf(r).length ? vehOf(r).map(k => <CarCard key={k} k={k} c={r.v[k] || { s: "" }} cap={`${r.n} · ${vName(k)} · ${dmy(h.fecha)}`} />) : <span className="text-xs text-slate-400">Sin patrullas</span>}</div>
                    </div>))}
                  {h.nota && <p className="rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"><b>Notas internas:</b> {h.nota}</p>}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" icon={<Trash2 />} disabled={!(h.por.n === me.n || me.l >= 8)} onClick={async () => { if (!(await confirm("¿Eliminar esta revisión del registro? Se borran también sus fotos.", { danger: true, ok: "Eliminar" }))) return; delPhotos(h.rows); setH(H.filter(x => x.id !== h.id)); }}>Eliminar</Button>
                    <Button size="sm" icon={<Copy />} onClick={() => copy(patReport(h, rankES(h.por.r) + " " + h.por.n))}>Copiar informe</Button>
                  </div>
                </div>)}
            </div>); })}</div>
          : view === "ag" ? <div className="grid gap-3 p-4 xl:grid-cols-2">{byAg.map(({ r, h, n }) => (
            <div key={r.n} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2.5"><Avatar n={r.n} size={32} /><div className="flex-1"><p className="font-semibold">{r.n}</p><div className="flex items-center gap-1.5"><RankBadge r={r.r} /><span className="text-[11px] text-slate-400">{n} {n === 1 ? "revisión" : "revisiones"} · última {dmy(h.fecha)}</span></div></div></div>
              <div className="flex flex-wrap gap-2">{vehOf(r).length ? vehOf(r).map(k => <CarCard key={k} k={k} c={r.v[k] || { s: "" }} cap={`${r.n} · ${vName(k)} · ${dmy(h.fecha)}`} />) : <span className="text-xs text-slate-400">Sin patrullas en la última revisión</span>}</div>
            </div>))}</div>
          : <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{byCar.map(([k, v]) => { const tot = v.ok + v.no, top = Object.entries(v.miss).sort((a, b) => b[1] - a[1]).slice(0, 3); return (
            <div key={k} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><Car className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{vName(k).replace(/^Police /, "")}</p><p className="text-[11px] text-slate-400">{carType(k, vName(k))} · última {dmy(v.last)}</p></div></div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-red-500/20"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(v.ok * 100) / tot}%` }} /></div>
              <p className="mt-1.5 text-xs text-slate-500">{tot} {tot === 1 ? "revisión" : "revisiones"} · <span className="text-emerald-600 dark:text-emerald-400">{v.ok} preparados</span> · <span className="text-red-600 dark:text-red-400">{v.no} no</span></p>
              {top.length > 0 && <p className="mt-1 text-[11px] text-slate-400">Suele faltar: {top.map(([n, c]) => `${n} (${c})`).join(", ")}</p>}
            </div>); })}</div>}
      </Card>
    </div>
  );
}
