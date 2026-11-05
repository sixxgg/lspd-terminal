import { BarChart3, TrendingUp, UserX, History, ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader, Empty } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { GROUPS, LEVEL, RANK_COLOR, fmtDate, getRoster, rankES } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { EstadoBadge, TipoBadge, tally, type Prop } from "@/sections/sup/Votaciones";

const RANKS = [...Object.keys(LEVEL).filter(r => LEVEL[r] > 0), "Administrativo"];
export function EstadoRoster() {
  useStoreVersion();
  const R = getRoster(), act = R.filter(a => a.e === "Activo").length, non = R.filter(a => a.e && a.e !== "Activo");
  const g = (k: string) => R.filter(a => GROUPS[k]?.r.includes(a.r)).length;
  const counts = RANKS.map(r => [r, R.filter(a => a.r === r).length] as const).filter(x => x[1]), mx = Math.max(...counts.map(x => x[1]), 1);
  const asc = R.filter(a => a.a).sort((x, y) => (y.a || "").localeCompare(x.a || "")).slice(0, 8);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([[R.length, "Total"], [act, "Activos"], [g("jef") + g("cap"), "Mando"], [g("sup"), "Supervisores"], [g("ofi") + g("det"), "Oficiales y detectives"]] as const).map(([n, k]) => (
          <Card key={k} className="p-4"><p className="text-2xl font-bold tabular-nums">{n}</p><p className="text-xs text-slate-500">{k}</p></Card>))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={<BarChart3 />} title="Composición por rango" />
          <CardBody>
            <div className="space-y-2">{counts.map(([r, n]) => (
              <div key={r} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-600 dark:text-slate-300">{rankES(r)}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><i className="block h-full rounded-full" style={{ width: `${(n * 100) / mx}%`, background: RANK_COLOR[r] || "#94a3b8" }} /></span>
                <span className="text-right font-semibold tabular-nums">{n}</span>
              </div>))}</div>
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader icon={<TrendingUp />} title="Últimos ascensos" />
            {asc.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{asc.map(a => (
              <div key={a.n} className="flex items-center gap-2.5 px-5 py-2.5"><Avatar n={a.n} size={28} /><span className="flex-1 truncate text-sm font-semibold">{a.n}</span><RankBadge r={a.r} /><span className="w-20 text-right font-mono text-xs text-slate-500">{(a.a || "").split("-").reverse().join("/")}</span></div>))}</div>
              : <CardBody><p className="text-sm text-slate-400">Sin datos de ascensos.</p></CardBody>}
          </Card>
          <Card>
            <CardHeader icon={<UserX />} title="No activos" desc={`${non.length} agentes`} />
            {non.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{non.map(a => (
              <div key={a.n} className="flex items-center gap-2.5 px-5 py-2.5"><Avatar n={a.n} size={28} /><span className="flex-1 truncate text-sm font-semibold">{a.n}</span><RankBadge r={a.r} /><span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{a.e}</span></div>))}</div>
              : <CardBody><p className="text-sm text-slate-400">Todos los agentes están activos.</p></CardBody>}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function HistorialVotaciones() {
  const [V] = useJSON<Prop[]>("lspdt.votes", []);
  const l = V.filter(p => p.estado !== "abierta" && p.cierre).sort((a, b) => b.cierre!.t - a.cierre!.t);
  return (
    <Card className="overflow-hidden">
      {!l.length ? <Empty icon={<History />} title="Todavía no hay votaciones cerradas" /> : <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[56rem] text-sm">
        <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">{["Cierre", "Agente", "Movimiento", "Resultado", "Votos (F / C / A)", "Propuesta por", "Cerrada por"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{l.map(p => { const c = tally(p); return (
          <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/70">
            <td className="px-4 py-3 font-mono text-xs">{fmtDate(p.cierre!.t)}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar n={p.ag.n} size={26} /><span className="font-semibold">{p.ag.n}</span></div></td>
            <td className="px-4 py-3"><TipoBadge t={p.tipo} /><p className="mt-1 flex items-center gap-1 text-xs text-slate-500">{rankES(p.ag.r)}<ArrowRight className="size-3" />{rankES(p.nr)}</p></td>
            <td className="px-4 py-3"><EstadoBadge e={p.estado} /></td>
            <td className="px-4 py-3 font-mono text-xs"><span className="text-emerald-600 dark:text-emerald-400">{c.favor}</span> / <span className="text-red-600 dark:text-red-400">{c.contra}</span> / {c.abst}</td>
            <td className="px-4 py-3 text-xs">{p.autor.n}</td><td className="px-4 py-3 text-xs">{p.cierre!.n}</td>
          </tr>); })}</tbody></table></div>}
    </Card>
  );
}
