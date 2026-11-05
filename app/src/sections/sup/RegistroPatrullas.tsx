import { useState } from "react";
import { ClipboardList, Search, ChevronDown, Copy, Trash2, StickyNote } from "lucide-react";
import { Button, Card, Empty, Input, Select } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { fmtDate, norm, rankES } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { VEH, delPhotos, dmy, missOf, patReport, vcount, type PHist } from "@/lib/patrol";
import { cn } from "@/lib/cn";
import { StatusPill, Thumbs } from "./Patrullas";
import { SheetPanel } from "./SheetPanel";

export function RegistroPatrullas() {
  const me = useMe(), { confirm } = useFeedback(), copy = useCopy();
  const [H, setH] = useJSON<PHist[]>("lspdt.patHist", []);
  const [q, setQ] = useState(""), [by, setBy] = useState(""), [d1, setD1] = useState(""), [d2, setD2] = useState(""), [e, setE] = useState(""), [open, setOpen] = useState<string | null>(null);
  const s = norm(q.trim()), who = [...new Set(H.map(h => h.por.n))].sort();
  const list = H.filter(h => (!s || h.rows.some(r => norm(r.n).includes(s) || String(r.p).includes(s))) && (!by || h.por.n === by) && (!d1 || h.fecha >= d1) && (!d2 || h.fecha <= d2)
    && (e !== "no" || vcount(h.rows, "no") > 0) && (e !== "ok" || (!vcount(h.rows, "no") && !vcount(h.rows, ""))));
  const ags = new Set(list.flatMap(h => h.rows.map(r => r.n))), ok = list.reduce((n, h) => n + vcount(h.rows, "ok"), 0), no = list.reduce((n, h) => n + vcount(h.rows, "no"), 0);
  return (
    <div className="space-y-5">
      <SheetPanel />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([[list.length, "Revisiones", ""], [ags.size, "Agentes revisados", ""], [ok + no, "Vehículos revisados", ""], [no, "No preparados", "text-red-600 dark:text-red-400"], [ok + no ? Math.round((ok * 100) / (ok + no)) + "%" : "—", "Preparados", "text-emerald-600 dark:text-emerald-400"]] as const).map(([n, k, c]) => (
          <Card key={k} className="p-4"><p className={cn("text-2xl font-bold tabular-nums", c)}>{n}</p><p className="text-xs text-slate-500">{k}</p></Card>))}
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative min-w-[13rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={x => setQ(x.target.value)} placeholder="Buscar agente o placa…" /></div>
          <Select className="w-auto text-sm" value={by} onChange={x => setBy(x.target.value)}><option value="">Revisado por: todos</option>{who.map(n => <option key={n}>{n}</option>)}</Select>
          <Input type="date" className="w-auto" value={d1} onChange={x => setD1(x.target.value)} aria-label="Desde" title="Desde" />
          <Input type="date" className="w-auto" value={d2} onChange={x => setD2(x.target.value)} aria-label="Hasta" title="Hasta" />
          <Select className="w-auto text-sm" value={e} onChange={x => setE(x.target.value)}><option value="">Todos los estados</option><option value="no">Con no preparados</option><option value="ok">Todo preparado</option></Select>
        </div>
        {!list.length ? <Empty icon={<ClipboardList />} title={H.length ? "Ninguna revisión coincide con los filtros" : "Todavía no hay revisiones guardadas"} desc={H.length ? undefined : "Se guardan desde «Revisión de patrullas»."} />
          : <div className="divide-y divide-slate-100 dark:divide-slate-800">{list.map(h => { const ok = vcount(h.rows, "ok"), no = vcount(h.rows, "no"), isO = open === h.id; return (
            <div key={h.id}>
              <button onClick={() => setOpen(isO ? null : h.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{dmy(h.fecha)} · {h.rows.length} {h.rows.length === 1 ? "agente" : "agentes"}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">Por {rankES(h.por.r)} {h.por.n} · guardada {fmtDate(h.t)} · <span className="text-emerald-600 dark:text-emerald-400">{ok} preparados</span> · <span className="text-red-600 dark:text-red-400">{no} no preparados</span>{h.nota && <StickyNote className="size-3.5 text-amber-500" />}</p>
                </div>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isO && "rotate-180")} />
              </button>
              {isO && (
                <div className="border-t border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[56rem] text-sm">
                    <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="px-4 py-2.5 font-semibold">Agente</th>{VEH.map(([k, n]) => <th key={k} className="px-3 py-2.5 font-semibold">{n}</th>)}</tr></thead>
                    <tbody>{h.rows.map(r => (
                      <tr key={r.n} className="border-t border-slate-100 align-top dark:border-slate-800/70">
                        <td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar n={r.n} size={26} /><div><p className="font-semibold">{r.n}</p><div className="flex items-center gap-1.5"><RankBadge r={r.r} />{r.p && <span className="font-mono text-[11px] text-slate-400">#{r.p}</span>}</div></div></div></td>
                        {VEH.map(([k, vn]) => { const c = r.v[k] || { s: "" }, ms = missOf(c); return (
                          <td key={k} className="px-3 py-2.5"><StatusPill s={c.s} />{ms.length > 0 && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{ms.join(", ")}</p>}<Thumbs ids={c.f} cap={`${r.n} · ${vn} · ${dmy(h.fecha)}`} /></td>); })}
                      </tr>))}</tbody>
                  </table></div>
                  {h.nota && <p className="mx-4 mt-3 rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"><b>Notas internas:</b> {h.nota}</p>}
                  <div className="flex justify-end gap-2 p-4">
                    <Button variant="ghost" size="sm" icon={<Trash2 />} disabled={!(h.por.n === me.n || me.l >= 8)} onClick={async () => { if (!(await confirm("¿Eliminar esta revisión del registro? Se borran también sus fotos.", { danger: true, ok: "Eliminar" }))) return; delPhotos(h.rows); setH(H.filter(x => x.id !== h.id)); }}>Eliminar</Button>
                    <Button size="sm" icon={<Copy />} onClick={() => copy(patReport(h, rankES(h.por.r) + " " + h.por.n))}>Copiar informe</Button>
                  </div>
                </div>
              )}
            </div>); })}</div>}
      </Card>
    </div>
  );
}
