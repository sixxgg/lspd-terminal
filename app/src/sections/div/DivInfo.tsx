/* Pestaña «Información» de las divisiones del LSSD: el texto completo de «Bureaus / Divisions» de Eleven, adentro de la terminal (sin links afuera).
   Los mandos que figuran ahí se cruzan con el roster por nombre; en la Canine Service Detail también se listan los binomios. */
import { Dog } from "lucide-react";
import { Card } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { LssdIns } from "@/components/lssdIns";
import { LSSD_INFO } from "@/lib/lssdDiv";
import { LS, useStoreVersion } from "@/lib/store";
import { findLoose, rankES } from "@/lib/domain";
import type { LssdAg } from "@/lib/dept";

const k9Id = (p: string) => `K-${String(p).padStart(3, "0")}`;
export function DivInfo({ d }: { d: string }) {
  useStoreVersion();
  const I = LSSD_INFO[d];
  if (!I) return <Card className="p-6 text-sm text-slate-500">Esta división todavía no tiene información cargada.</Card>;
  const dogs = d === "Canine Service Detail" ? LS.json<LssdAg[]>("lspdt.roster", []).filter(a => a.r === "K-9") : [];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="space-y-5 p-6">
        {I.B.map((b, i) => (
          <section key={i}>
            {b.h && <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wide">{b.h}</h3>}
            {b.p?.map((t, j) => <p key={j} className="mb-2 text-[14.5px] leading-relaxed text-slate-600 dark:text-slate-300">{t}</p>)}
            {b.l && <ul className="mt-1 space-y-1.5 text-[14.5px]">{b.l.map(x => <li key={x} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[color:var(--ha,rgb(var(--b-500)))]" />{x}</li>)}</ul>}
          </section>))}
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{I.cmdT || (I.cmd.length > 1 ? "Unit Commanders" : "Unit Commander")}</h3>
          {I.cmd.length ? <div className="mt-3 space-y-2.5">{I.cmd.map(n => { const a = findLoose(n); return (
            <div key={n} className="flex items-center gap-3"><Avatar n={a?.n || n} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a?.n || n}</p>
                {a ? <div className="mt-0.5 flex items-center gap-1.5"><RankBadge r={a.r} /><span className="font-mono text-[11px] text-slate-400">#{a.p}</span></div> : <p className="text-[12px] text-slate-400">No figura en el roster</p>}</div></div>); })}</div>
            : <p className="mt-3 text-sm text-slate-400">Sin asignar.</p>}
        </Card>
        {dogs.length > 0 && <Card className="p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Binomios · {dogs.length}</h3>
          <div className="mt-3 space-y-2.5">{dogs.map(a => (
            <div key={a.p + a.n} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white"><Dog className="size-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.n} <span className="font-mono text-[11px] font-normal text-slate-400">{k9Id(a.p)}</span></p>
                <p className="truncate text-[12px] text-slate-500">{a.hn ? `Handler: ${a.hn}${findLoose(a.hn) ? " · " + rankES(findLoose(a.hn)!.r) : ""}` : a.h ? `Handler: ${a.h} (OOC)` : "Sin handler asignado"}</p></div>
              <LssdIns r="K-9" className="size-8" /></div>))}</div>
        </Card>}
      </div>
    </div>);
}
