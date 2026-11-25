/* Supervisores › Robos › Tablet: lo que está activo en la tablet del servidor, separado en dos cosas que no son lo mismo:
   - Robos activos: tiendas, cajas y contenedores tipo badulaque, que también hacen los civiles (solo el Growshop pide banda).
   - Misiones: las de las bandas, con nivel, jugadores, policías en servicio para arrancar, dinero, experiencia y tipo de banda. */
import { useMemo, useState } from "react";
import { Clock, Crosshair, Store, Swords, Users } from "lucide-react";
import { Card, SearchInput, Segmented } from "@/components/ui";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { ARM, ARM_KEYS, BANDAS, BANDA_KEYS, type Arm, type Banda, type TabData } from "../six/tabletData";

export function BandaChips({ L, sm }: { L: Banda[]; sm?: boolean }) {
  return <>{L.map(b => <span key={b} title={BANDAS[b].d} className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 font-bold", sm ? "py-0 text-[10px]" : "py-0.5 text-[11px]")}
    style={{ borderColor: BANDAS[b].c + "66", background: BANDAS[b].c + "1a", color: BANDAS[b].c }}>{BANDAS[b].l}</span>)}</>;
}
const GRUPOS: [string, string][] = [["badulaque", "Badulaques y licorerías"], ["tab:pelu", "Peluquerías"], ["tab:ropa", "Tiendas de ropa"], ["tab:tatto", "Tiendas de tatuajes"], ["tab:antig", "Antigüedades"], ["tab:cajas", "Cajas y contenedores"], ["grow", "Growshop"]];
export function ArmChip({ a, sm }: { a: Arm; sm?: boolean }) {
  const A = ARM[a]; if (!A) return null;
  return <span title={A.l} className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 font-bold", sm ? "py-0 text-[10px]" : "py-0.5 text-[11px]")} style={{ borderColor: A.c + "66", background: A.c + "1a", color: A.c }}>{sm ? A.s : A.l}</span>;
}
const TIPO_C: Record<string, string> = { Asesinato: "#ef4444", Entrega: "#22c55e", Destrucción: "#94a3b8", "Destrucción de vehículo": "#64748b", "Asalto a convoy": "#e11d48", Escolta: "#38bdf8", Infiltración: "#06b6d4", "Robo de vehículo": "#f59e0b", Encargo: "#a78bfa", Persecución: "#f97316" };

export function TabletView({ T }: { T: TabData }) {
  const TAB_ROBOS = T.robos, TAB_MIS = T.mis;
  const [v, setV] = useState<"rob" | "mis">("rob"), [q, setQ] = useState(""), [bd, setBd] = useState<Banda | "" | "none">(""), [ar, setAr] = useState<Arm | "">("");
  const s = norm(q.trim());
  const mis = useMemo(() => TAB_MIS.filter(m => (!s || norm(`${m.n} ${m.tipo}`).includes(s)) && (!bd || (bd === "none" ? !m.b : m.b === bd)) && (!ar || m.arm === ar)).sort((a, b) => a.nv - b.nv || a.n.localeCompare(b.n)), [s, bd, ar, TAB_MIS]);
  const arms = ARM_KEYS.filter(a => TAB_MIS.some(m => m.arm === a)), sinDato = TAB_MIS.filter(m => !m.arm).length;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 px-4 py-3 text-[12.5px] text-slate-600 dark:text-slate-300">
        <Segmented value={v} onChange={setV} options={[{ value: "rob", label: `Robos activos (${TAB_ROBOS.length})`, icon: <Store className="size-4" /> }, { value: "mis", label: `Misiones (${TAB_MIS.length})`, icon: <Swords className="size-4" /> }]} />
        <span className="min-w-[16rem] flex-1 text-[12px] text-slate-500">{v === "rob"
          ? <>Los robos activos <b>no son misiones</b>: son robos tipo badulaque y también los hacen <b>civiles</b> (acceso libre). Solo el Growshop pide banda.</>
          : <>Las misiones de las bandas. <b>Pol.</b> = policías en servicio que pide la tablet para arrancarla. El tipo de banda dice para quién es cada una.</>}</span>
        <SearchInput className="w-full sm:w-64" value={q} onChange={setQ} placeholder={v === "rob" ? "Buscar robo o zona…" : "Buscar misión…"} />
      </Card>
      {v === "rob" ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{GRUPOS.map(([g, l]) => { const L = TAB_ROBOS.filter(t => t.grp === g && (!s || norm(t.n).includes(s))); if (!L.length) return null; return (
        <Card key={g} className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800"><Store className="size-4 text-brand-500" /><b className="text-sm">{l}</b><span className="ml-auto text-xs font-semibold text-slate-500">{L.length}</span></div>
          <ul className="divide-y divide-slate-100 text-[12.5px] dark:divide-slate-800">{L.map(t => (
            <li key={t.n} className="flex items-center gap-2 px-4 py-1.5"><span className="min-w-0 flex-1 truncate font-medium">{t.n}</span>
              <span className={cn("rounded px-1.5 text-[10px] font-bold uppercase", t.t === "complex" ? "bg-red-500/15 text-red-600 dark:text-red-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>{t.t}</span>
              <span title={t.acc === "all" ? "Cualquiera, también civiles" : "Solo bandas"} className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Users className="size-3" />{t.acc === "all" ? "Todos" : "Bandas"}</span>
              <span className="inline-flex w-14 items-center justify-end gap-1 text-[11px] tabular-nums text-slate-500"><Clock className="size-3" />{t.cd} min</span></li>))}</ul>
        </Card>); })}</div>
      : <>
        <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tipo de banda</span>
          {(["", ...BANDA_KEYS, "none"] as (Banda | "" | "none")[]).map(b => { const on = bd === b, n = !b ? TAB_MIS.length : TAB_MIS.filter(m => (b === "none" ? !m.b : m.b === b)).length; return (
            <button key={b || "all"} onClick={() => setBd(b)} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition", on ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
              style={on ? { background: b && b !== "none" ? BANDAS[b].c : "rgb(var(--b-600))" } : undefined}>{!b ? "Todas" : b === "none" ? "Cualquier banda" : BANDAS[b].l}<span className="tabular-nums opacity-70">{n}</span></button>); })}</div>
        {arms.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Crosshair className="size-3.5" />Armamento</span>
          {(["", ...arms] as (Arm | "")[]).map(a => { const on = ar === a, n = !a ? TAB_MIS.length : TAB_MIS.filter(m => m.arm === a).length; return (
            <button key={a || "all"} onClick={() => setAr(a)} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition", on ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
              style={on ? { background: a ? ARM[a].c : "rgb(var(--b-600))" } : undefined}>{a ? ARM[a].l : "Todo"}<span className="tabular-nums opacity-70">{n}</span></button>); })}
          {sinDato > 0 && <span className="text-[11px] text-slate-400">· {sinDato} sin dato de armamento</span>}</div>}
        <Card className="overflow-hidden"><div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[56rem] text-[12.5px]">
          <thead><tr className="border-b border-slate-100 text-left text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
            <th className="px-4 py-2">Misión</th><th className="px-2">Tipo</th><th className="px-2 text-right">Nivel</th><th className="px-2 text-right">Jugadores</th><th className="px-2 text-right">Pol.</th><th className="px-2 text-right">Dinero</th><th className="px-2 text-right">XP</th><th className="px-2">Armas</th><th className="px-2" title="Armas de los enemigos y NPC armados">Enemigos</th><th className="px-4">Banda</th></tr></thead>
          <tbody>{mis.map((m, i) => (
            <tr key={`${m.id ?? "x"}-${i}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800/70">
              <td className="px-4 py-2 font-semibold">{m.n}</td>
              <td className="px-2"><span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: (TIPO_C[m.tipo] || "#94a3b8") + "22", color: TIPO_C[m.tipo] || "#94a3b8" }}>{m.tipo}</span></td>
              <td className="px-2 text-right tabular-nums">{m.nv}+</td><td className="px-2 text-right tabular-nums">{m.min}–{m.max}</td>
              <td className="px-2 text-right font-bold tabular-nums text-sky-600 dark:text-sky-400">{m.pt || "—"}</td>
              <td className="px-2 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">${m.$.toLocaleString("es-AR")}</td><td className="px-2 text-right tabular-nums text-slate-500">+{m.xp}</td>
              <td className="px-2">{m.arm ? <ArmChip a={m.arm} sm /> : <span className="text-[11px] text-slate-400">—</span>}</td>
              <td className="px-2"><span className="flex flex-wrap items-center gap-1">{(m.ae || []).map(a => <ArmChip key={a} a={a} sm />)}{m.npc != null && <span title="NPC armados" className="text-[11px] font-semibold tabular-nums text-slate-500">{m.npc ? `${m.npc} NPC` : "Sin NPC"}</span>}{m.ae == null && m.npc == null && <span className="text-[11px] text-slate-400">—</span>}</span></td>
              <td className="px-4">{m.b ? <BandaChips L={[m.b]} sm /> : <span className="text-[11px] text-slate-400">Cualquiera</span>}</td></tr>))}</tbody></table></div></Card>
        <p className="text-center text-[11px] text-slate-400">Datos de la tablet cargados por six el {new Date(T.at).toLocaleDateString("es-AR")}. Información de Gestión de ilícitos: no se comparte.</p>
      </>}
    </div>);
}
