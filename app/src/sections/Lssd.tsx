/* LSSD (Los Santos Sheriff's Department): inicio, roster y secciones en construcción.
   El roster sale de lspdt.lssd.roster (lo carga six; si no hay, el servidor manda el de la planilla). */
import { useMemo, useState, type ReactNode } from "react";
import { Briefcase, ClipboardList, Construction, Scale, Search, Star, Users } from "lucide-react";
import { Card, Input } from "@/components/ui";
import { useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { DEPTS, LSSD_ES, LSSD_LVL, lssdLvl, lssdRoster, type LssdAg } from "@/lib/dept";
import { initials, norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

const rES = (r: string) => LSSD_ES[r] || r;
/* grupos como en la planilla del Sheriff */
const GROUPS: [string, (l: number) => boolean][] = [["Executive Staff", l => l >= 11], ["Command Staff", l => l >= 8 && l <= 10], ["Supervisor Staff", l => l === 7],
  ["Master FTO", l => l === 6], ["Deputy Sheriff Bonus II", l => l === 5], ["Deputy Sheriff Bonus I", l => l === 4], ["Deputy Sheriff", l => l === 3], ["En prácticas", l => l <= 2]];
const estCol = (e?: string) => (!e || e === "Activo" ? "bg-emerald-500" : /justif/i.test(e) ? "bg-sky-500" : /mediana/i.test(e) ? "bg-amber-500" : "bg-slate-400");

/* insignia: estrella de seis puntas con el nivel */
const Star6 = ({ l, className }: { l: number; className?: string }) => (
  <span className={cn("relative grid shrink-0 place-items-center", className)}>
    <svg viewBox="0 0 24 24" className="absolute inset-0 size-full text-amber-400 drop-shadow"><path fill="currentColor" d="M12 1.5l2.6 4.5h5.2l-2.6 4.5 2.6 4.5h-5.2L12 19.5 9.4 15H4.2l2.6-4.5L4.2 6h5.2z" /></svg>
    <b className="relative text-[9px] font-black text-amber-950">{l}</b></span>);

export function LssdHome() {
  useStoreVersion();
  const me = useMe(), R = lssdRoster(), mine = R.find(a => a.n === me.n), act = R.filter(a => !a.e || a.e === "Activo").length;
  const h = new Date().getHours(), sal = h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
  return (
    <div className="space-y-6">
      <div className="rise relative overflow-hidden rounded-3xl border border-emerald-900/30 bg-gradient-to-br from-[#1f3b2a] via-[#1a2e22] to-[#0f1a14] p-8 text-white shadow-xl">
        <img src={DEPTS.lssd.logo} alt="" className="pointer-events-none absolute -right-10 -top-10 size-72 opacity-10" />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/90">{DEPTS.lssd.name}</p>
        <h1 className="mt-2 font-display text-4xl font-bold">{sal}, {me.n.split(" ")[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-emerald-100/80">La terminal del Sheriff está en construcción. Por ahora podés ver el roster; el resto de las secciones se van habilitando de a poco.</p>
        {mine && <div className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/10">
          <Star6 l={lssdLvl(mine.r)} className="size-10" /><div><p className="font-semibold">{mine.n}</p><p className="text-xs text-emerald-100/70">{rES(mine.r)} · Placa #{mine.p}</p></div></div>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Personal", R.length], ["Activos", act], ["Supervisión y mando", R.filter(a => lssdLvl(a.r) >= 7).length]].map(([l, n], i) => (
          <Card key={i} className="rise p-5" style={{ ["--d" as string]: `${80 + i * 60}ms` }}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</p><p className="mt-1 font-display text-4xl font-bold">{n}</p></Card>))}
      </div>
    </div>);
}

export function LssdRoster() {
  useStoreVersion();
  const [q, setQ] = useState(""), R = lssdRoster();
  const L = useMemo(() => { const s = norm(q.trim()); return [...R].filter(a => !s || norm(`${a.n} ${a.p} ${a.r} ${rES(a.r)}`).includes(s)).sort((a, b) => lssdLvl(b.r) - lssdLvl(a.r) || +a.p - +b.p); }, [R, q]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><h2 className="font-display text-2xl font-bold">Roster del Sheriff</h2><p className="text-sm text-slate-500">{R.length} integrantes · ordenados por rango</p></div>
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, placa o rango…" /></div>
      </div>
      {GROUPS.map(([g, f]) => { const G = L.filter(a => f(lssdLvl(a.r))); if (!G.length) return null; return (
        <section key={g}><h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"><span className="h-px w-6 bg-slate-300 dark:bg-slate-700" />{g}<span className="text-slate-400">· {G.length}</span></h3>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{G.map(a => <Row key={a.p + a.n} a={a} />)}</div></section>); })}
      {!L.length && <p className="py-10 text-center text-sm text-slate-400">Nada coincide.</p>}
    </div>);
}
const Row = ({ a }: { a: LssdAg }) => (
  <Card className="flex items-center gap-3 p-3">
    <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 text-sm font-bold text-white">{initials(a.n)}
      <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white dark:ring-slate-900", estCol(a.e))} title={a.e || "Activo"} /></span>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.n}</p><p className="truncate text-[12px] text-slate-500">{rES(a.r)}{a.e && a.e !== "Activo" ? ` · ${a.e}` : ""}</p></div>
    <span className="font-mono text-xs text-slate-400">#{a.p}</span><Star6 l={LSSD_LVL[a.r] || 0} className="size-7" />
  </Card>);

/* secciones que todavía no están */
const ICO: Record<string, ReactNode> = { leg: <Scale />, sup: <ClipboardList />, cap: <Briefcase />, jef: <Star />, det: <Search />, ros: <Users /> };
export function LssdSoon({ k, t }: { k: string; t: string }) {
  return (
    <Card className="rise relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgb(245_158_11/.05)_22px_44px)]" />
      <div className="relative flex flex-col items-center px-6 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-inset ring-amber-500/30 [&>svg]:size-8">{ICO[k] || <Construction />}</span>
        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300"><Construction className="size-3.5" />En construcción</p>
        <h2 className="mt-3 font-display text-3xl font-bold">{t}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">Esta sección del {DEPTS.lssd.short} se está armando. Se habilita cuando esté lista.</p>
      </div>
    </Card>);
}
