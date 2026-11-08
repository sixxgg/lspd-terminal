import { Users, UserCheck, Vote, FileText, ArrowUpRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui";
import { AREAS, canArea, secsOf } from "@/nav";
import { getRoster, rankES } from "@/lib/domain";
import { LS, useStoreVersion } from "@/lib/store";
import { cn } from "@/lib/cn";

export function Home({ me, go }: { me: { n: string; r: string }; go: (a: string, s: string) => void }) {
  useStoreVersion();
  const h = new Date().getHours(), sal = h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
  const roster = getRoster(), act = roster.filter(a => a.e === "Activo").length;
  const votes = LS.json<{ estado?: string }[]>("lspdt.votes", []).filter(v => v.estado === "abierta").length;
  const infs = LS.json<unknown[]>("lspdt.informes", []).length;
  const kpis = [
    { icon: Users, n: roster.length, l: "Agentes en el roster" },
    { icon: UserCheck, n: act, l: "Agentes activos" },
    { icon: Vote, n: votes, l: votes === 1 ? "Votación abierta" : "Votaciones abiertas" },
    { icon: FileText, n: infs, l: "Informes registrados" },
  ];
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand-500/15 blur-3xl" />
        <CardBody className="relative">
          <p className="text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{sal}, {rankES(me.r)} {me.n}</h2>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(k => (
          <Card key={k.l} className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><k.icon className="size-5" /></div>
              <div><p className="text-2xl font-bold tabular-nums tracking-tight">{k.n}</p><p className="text-xs text-slate-500 dark:text-slate-400">{k.l}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {AREAS.filter(a => canArea(a, me.r) && secsOf(a, me.r).some(s => s.k !== "home")).map(a => (
        <section key={a.k}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{a.l}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {secsOf(a, me.r).filter(s => s.k !== "home").map(s => (
              <button key={s.k} onClick={() => go(a.k, s.k)}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-brand-500/50">
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition", s.ready ? "bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}><s.icon className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">{s.l}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{s.d}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-brand-500 dark:text-slate-600" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
