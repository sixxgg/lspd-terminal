/* METRO › Callsign: quién tiene cada indicativo (miembros del roster y reservas para aspirantes/futuros), mapa de libres y ocupados
   de las series D (R10D–R29D) y C (R30C en adelante), historial de movimientos y comunicado para Discord con el emblema de la METRO,
   firmado por Coordinación e Instructores. Gestionan la coordinación y los instructores; el resto de la división lo ve. */
import { useMemo, useState } from "react";
import { ArrowRight, Check, History, Megaphone, Radio, Search, Settings2, Target, X } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Avatar } from "@/components/agents";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { UNITS, insRole, rosterCall, uMap, uTop } from "@/lib/units";
import { CS_CFG0, K_CFG, K_LOG, K_RES, csNums, logOf, resOf, setCall, type CsCfg, type CsLog, type CsTipo } from "@/lib/mdcalls";
import { cn } from "@/lib/cn";

type P = { n: string; role: string; c: string; tipo: CsTipo; asp: boolean };
const SERIES: { s: "D" | "C"; l: string; from: number; to: number }[] = [{ s: "D", l: "Serie D · R10D a R29D", from: 10, to: 29 }, { s: "C", l: "Serie C · desde R30C (Team Pelotón Leader)", from: 30, to: 48 }];
const fecha = (t: number) => { const d = new Date(t), p = (x: number) => String(x).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
/* poner un número de serie en el texto del callsign: reemplaza el de esa serie o lo suma */
const withSlot = (cur: string, s: "C" | "D", x: number) => { const tok = `R${x}${s}`, re = new RegExp(`R\\d+${s}`, "i"); return re.test(cur) ? cur.replace(re, tok) : cur ? `${cur} · ${tok}` : tok; };

export function MetroCalls({ can }: { can: boolean }) {
  useStoreVersion();
  const me = useMe(), { toast } = useFeedback(), M = uMap("md"), R = UNITS.md.R;
  const [q, setQ] = useState(""), [sel, setSel] = useState(""), [hq, setHq] = useState(""), [hn, setHn] = useState(40), [nuevo, setNuevo] = useState("");
  const [cfg, setCfg] = useJSON<CsCfg>(K_CFG, CS_CFG0), [cfgOpen, setCfgOpen] = useState(false);
  const log = logOf(), res = resOf();

  /* personas: miembros del roster (aspirantes aparte), aspirantes de las convocatorias del examen práctico y reservas sueltas */
  const people = useMemo<P[]>(() => {
    const out: P[] = [], seen = new Set<string>();
    for (const [n, r] of Object.entries(M)) { if (!Array.isArray(r)) continue; const t = uTop("md", r); out.push({ n, role: t[1], c: t[2], tipo: "miembro", asp: t[0] === "asp" }); seen.add(n); }
    const prac = LS.json<{ rows: { n: string }[] }[]>("lspdt.mdx.prac", []);
    for (const n of [...(Array.isArray(prac) ? prac.flatMap(c => (c.rows || []).map(r => r.n)) : []), ...Object.keys(res)]) if (n && !seen.has(n)) { seen.add(n); out.push({ n, role: "Aspirante (examen práctico)", c: "#8a8f97", tipo: "reserva", asp: true }); }
    const ord = (p: P) => { const i = R.findIndex(x => x[1] === p.role); return i < 0 ? 99 : i; };
    return out.sort((a, b) => ord(a) - ord(b) || a.n.localeCompare(b.n, "es"));
  }, [M, res]); // eslint-disable-line react-hooks/exhaustive-deps
  const callOf = (p: P) => (p.tipo === "miembro" ? rosterCall(p.n) : res[p.n] || "");
  const put = (p: P, v: string) => { if (setCall(p.n, v, me.n, p.tipo)) toast(v.trim() ? `${p.n} · ${v.trim().toUpperCase()}` : `Callsign de ${p.n} liberado`); };

  /* ocupación de cada número por serie */
  const occ = useMemo(() => { const m: Record<"C" | "D", Map<number, string[]>> = { C: new Map(), D: new Map() };
    for (const p of people) for (const s of ["C", "D"] as const) for (const x of csNums(callOf(p), s)) m[s].set(x, [...(m[s].get(x) || []), p.n]);
    return m; }, [people, log.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const dupOf = (p: P) => (["C", "D"] as const).some(s => csNums(callOf(p), s).some(x => (occ[s].get(x) || []).length > 1));
  const selP = people.find(p => p.n === sel);
  const vis = people.filter(p => !q.trim() || `${p.n} ${callOf(p)} ${p.role}`.toLowerCase().includes(q.trim().toLowerCase()));
  const groups: [string, P[]][] = [["Miembros", vis.filter(p => !p.asp)], ["Aspirantes y reservas", vis.filter(p => p.asp)]];
  const sinC = people.filter(p => p.asp && !csNums(callOf(p), "C").length).length;
  const addRes = () => { const n = nuevo.trim(); if (!n) return; if (people.some(p => p.n.toLowerCase() === n.toLowerCase())) { setSel(people.find(p => p.n.toLowerCase() === n.toLowerCase())!.n); setNuevo(""); return; }
    setSel(n); LS.setJSON(K_RES, { ...res, [n]: "" }); setNuevo(""); toast(`${n} agregado: elegí su callsign en el mapa`); };

  /* ---------- comunicado ---------- */
  const pend = log.filter(l => !l.pub);
  const [pick, setPick] = useState<string[] | null>(null), chosen = pick ?? pend.map(l => l.id);
  const [intro, setIntro] = useState("Se informan los movimientos de callsigns de la Metropolitan Division. A partir de este momento, cada integrante debe usar en radio y en servicio el indicativo que tiene asignado.");
  const [cierre, setCierre] = useState("Ante cualquier duda, consultar con Coordinación o con los Instructores."), [names, setNames] = useState(true);
  const net = useMemo(() => { const by = new Map<string, CsLog[]>(); for (const l of [...log].filter(l => chosen.includes(l.id)).sort((a, b) => a.t - b.t)) by.set(l.n, [...(by.get(l.n) || []), l]);
    return [...by].map(([n, L]) => ({ n, de: L[0].de, a: L[L.length - 1].a })).filter(x => x.de !== x.a); }, [log, chosen]);
  const EM = cfg.em.trim() || "🔷";
  const firmantes = Object.entries(M).filter(([n, r]) => Array.isArray(r) && !!insRole("md", n)).map(([n]) => n)
    .sort((a, b) => R.findIndex(x => x[0] === uTop("md", M[a])[0]) - R.findIndex(x => x[0] === uTop("md", M[b])[0]));
  const blk = (t: string, L: string[]) => (L.length ? [`**${t}**`, ...L, ""] : []);
  const txt = [`## ${EM} Metropolitan Division · Callsigns ${EM}`, cfg.rol.trim() ? `<@&${cfg.rol.trim()}>` : "", "", intro.trim(), "",
    ...blk("🆕 Asignaciones", net.filter(x => !x.de && x.a).map(x => `> ${EM} **${x.n}** ➜ \`${x.a}\``)),
    ...blk("🔄 Cambios", net.filter(x => x.de && x.a).map(x => `> ${EM} **${x.n}** · \`${x.de}\` ➜ \`${x.a}\``)),
    ...blk("📤 Liberados", net.filter(x => x.de && !x.a).map(x => `> ${EM} **${x.n}** · ~~\`${x.de}\`~~`)),
    cierre.trim(), "", `${EM} **Coordinación e Instructores · Metropolitan Division**`, names && firmantes.length ? `-# ${firmantes.join(" · ")}` : "", "*Departamento de Policía de Los Santos*"]
    .filter((x, i, A) => !(x === "" && A[i - 1] === "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const markPub = () => { const ids = new Set(chosen); LS.setJSON(K_LOG, logOf().map(l => (ids.has(l.id) ? { ...l, pub: true } : l))); setPick(null); toast("Movimientos marcados como comunicados"); };

  const hist = log.filter(l => !hq.trim() || `${l.n} ${l.de} ${l.a} ${l.by}`.toLowerCase().includes(hq.trim().toLowerCase()));

  return (
    <div className="space-y-5">
      {/* resumen */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar agente o callsign" className="pl-9" /></label>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span><b className="text-slate-800 dark:text-white">{people.filter(p => callOf(p)).length}</b>/{people.length} con callsign</span>
          {sinC > 0 && <span className="text-amber-600 dark:text-amber-300"><b>{sinC}</b> aspirantes sin serie C</span>}
          {pend.length > 0 && <span className="text-brand-600 dark:text-brand-300"><b>{pend.length}</b> movimientos sin comunicar</span>}
          {!can && <span>Solo lectura · gestionan Coordinación e Instructores</span>}</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* asignaciones */}
        <Card className="overflow-hidden p-0">
          {groups.map(([gl, L]) => L.length > 0 && <div key={gl}>
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">{gl} <span className="font-mono text-slate-400">{L.length}</span></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(p => { const v = callOf(p), on = sel === p.n, d = dupOf(p); return (
              <div key={p.n} onClick={() => can && setSel(on ? "" : p.n)} className={cn("flex items-center gap-3 px-4 py-2 transition", can && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40", on && "bg-brand-500/10 hover:bg-brand-500/10")}>
                <Avatar n={p.n} size={30} />
                <div className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{p.n}</b><span className="text-[11px] font-semibold" style={{ color: p.c }}>{p.role}</span></div>
                {can ? <input key={v} defaultValue={v} placeholder="Sin callsign" onClick={e => { e.stopPropagation(); setSel(p.n); }} onBlur={e => put(p, e.target.value)} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className={cn("h-8 w-36 rounded-lg border bg-transparent px-2 text-right font-mono text-[12.5px] font-semibold uppercase outline-none transition focus:border-brand-500", d ? "border-red-400 text-red-600" : v ? "border-slate-200 dark:border-slate-700" : "border-dashed border-slate-300 text-slate-400 dark:border-slate-700")} />
                  : <span className={cn("font-mono text-[12.5px] font-semibold", d ? "text-red-600" : v ? "" : "text-slate-400")}>{v || "—"}</span>}
                {can && v && <button aria-label={`Liberar el callsign de ${p.n}`} title="Liberar" onClick={e => { e.stopPropagation(); put(p, ""); }} className="text-slate-300 hover:text-red-500"><X className="size-4" /></button>}
              </div>); })}</div></div>)}
          {can && <div className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <Input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === "Enter" && addRes()} placeholder="Reservar para alguien fuera del roster" />
            <Button variant="outline" onClick={addRes} disabled={!nuevo.trim()}>Reservar</Button></div>}
        </Card>

        <div className="space-y-5">
          {/* mapa */}
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2"><Radio className="size-4 text-brand-500" /><h3 className="text-[15px] font-semibold">Mapa de callsigns</h3>
              <span className="ml-auto text-xs text-slate-500">{selP ? <>Tocá uno libre para <b className="text-slate-800 dark:text-white">{selP.n}</b></> : can ? "Elegí un agente de la lista" : ""}</span></div>
            {SERIES.map(({ s, l, from, to: to0 }) => { const to = Math.max(to0, ...occ[s].keys()) + (s === "C" ? 3 : 0); return (
              <div key={s} className="space-y-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
                <div className="flex flex-wrap gap-1.5">{Array.from({ length: to - from + 1 }, (_, i) => from + i).map(x => { const who = occ[s].get(x), d = (who || []).length > 1;
                  return who ? <span key={x} title={who.join(" · ")} className={cn("rounded-lg border px-2 py-1 font-mono text-[11.5px]", d ? "border-red-400 bg-red-500/10 font-bold text-red-600" : who.includes(sel) ? "border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 dark:border-slate-700")}>R{x}{s}<span className="ml-1 font-sans text-[10px] opacity-75">{who.map(n => n.split(" ")[0]).join("/")}</span></span>
                    : <button key={x} disabled={!can || !selP} onClick={() => selP && put(selP, withSlot(callOf(selP), s, x))} title={selP ? `Asignar R${x}${s} a ${selP.n}` : "Libre"}
                      className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 font-mono text-[11.5px] font-semibold text-emerald-700 transition enabled:hover:bg-emerald-500/25 disabled:cursor-default dark:text-emerald-300">R{x}{s}</button>; })}</div></div>); })}
            <p className="text-[11px] text-slate-400">Verde: libre · gris: ocupado · rojo: repetido.</p>
          </Card>

          {/* historial */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2"><History className="size-4 text-brand-500" /><h3 className="text-[15px] font-semibold">Historial de movimientos</h3>
              <Input value={hq} onChange={e => setHq(e.target.value)} placeholder="Filtrar" className="ml-auto h-8 max-w-[11rem] text-xs" /></div>
            {!hist.length ? <p className="py-6 text-center text-sm text-slate-400">Todavía no hay movimientos.</p>
              : <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto pr-1 text-[13px] dark:divide-slate-800">{hist.slice(0, hn).map(l => (
                <li key={l.id} className="flex items-center gap-2 py-1.5">
                  <span className="w-[5.6rem] shrink-0 font-mono text-[11px] text-slate-400">{fecha(l.t)}</span>
                  <b className="min-w-0 truncate">{l.n}</b>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[11.5px]"><span className={l.de ? "text-slate-500 line-through decoration-slate-400/60" : "text-slate-300"}>{l.de || "—"}</span><ArrowRight className="size-3 text-slate-400" /><span className={l.a ? "font-semibold text-brand-700 dark:text-brand-300" : "text-red-500"}>{l.a || "libre"}</span></span>
                  <span title={`Por ${l.by}${l.pub ? " · comunicado" : ""}`} className="hidden w-20 shrink-0 truncate text-right text-[11px] text-slate-400 sm:block">{l.pub && <Check className="mr-0.5 inline size-3 text-emerald-500" />}{l.by.split(" ")[0]}</span>
                </li>))}</ul>}
            {hist.length > hn && <button onClick={() => setHn(hn + 60)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Ver más ({hist.length - hn})</button>}
          </Card>
        </div>
      </div>

      {/* comunicado */}
      {can && <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2"><Megaphone className="size-4 text-brand-500" /><h3 className="text-[15px] font-semibold">Comunicado de callsigns</h3>
          <span className="text-xs text-slate-500">Firmado por Coordinación e Instructores</span>
          <button onClick={() => setCfgOpen(!cfgOpen)} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"><Settings2 className="size-3.5" />Emote y mención</button></div>
        {cfgOpen && <div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
          <label className="space-y-1 text-xs text-slate-500">Emote de la METRO (se guarda para todos)<Input key={cfg.em} defaultValue={cfg.em} placeholder="<:METRO:123456789012345678>" onBlur={e => e.target.value.trim() !== cfg.em && setCfg({ ...cfg, em: e.target.value.trim() })} className="font-mono text-xs" /></label>
          <label className="space-y-1 text-xs text-slate-500">ID del rol a mencionar (opcional)<Input key={cfg.rol} defaultValue={cfg.rol} placeholder="123456789012345678" onBlur={e => e.target.value.trim() !== cfg.rol && setCfg({ ...cfg, rol: e.target.value.replace(/\D/g, "") })} className="font-mono text-xs" /></label>
          <p className="text-[11px] text-slate-400 sm:col-span-2">En Discord escribí <span className="font-mono">\:METRO:</span> en cualquier canal y pegá acá lo que aparece. Sin emote se usa 🔷.</p></div>}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="flex items-center text-xs font-semibold text-slate-500"><Target className="mr-1 size-3.5" />Movimientos a incluir
              <button onClick={() => setPick(pend.map(l => l.id))} className="ml-auto font-normal hover:text-slate-800 dark:hover:text-white">Sin comunicar</button><span className="mx-1 text-slate-300">·</span><button onClick={() => setPick([])} className="font-normal hover:text-slate-800 dark:hover:text-white">Ninguno</button></div>
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5 text-[12.5px] dark:border-slate-700">{log.slice(0, 80).map(l => { const on = chosen.includes(l.id); return (
              <li key={l.id}><label className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1", on ? "bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                <input type="checkbox" checked={on} onChange={() => setPick(on ? chosen.filter(x => x !== l.id) : [...chosen, l.id])} className="accent-[rgb(var(--b-500))]" />
                <span className="min-w-0 flex-1 truncate">{l.n}</span><span className="shrink-0 font-mono text-[11px] text-slate-500">{l.a || "libre"}</span>{l.pub && <Check className="size-3 text-emerald-500" />}</label></li>); })}
              {!log.length && <li className="px-2 py-4 text-center text-slate-400">Sin movimientos</li>}</ul>
            <Textarea value={intro} onChange={e => setIntro(e.target.value)} rows={4} className="text-[13px]" />
            <Input value={cierre} onChange={e => setCierre(e.target.value)} className="text-[13px]" />
            <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={names} onChange={e => setNames(e.target.checked)} className="accent-[rgb(var(--b-500))]" />Nombres de quienes firman ({firmantes.length})</label>
            <Button variant="outline" icon={<Check />} onClick={markPub} disabled={!chosen.length} className="w-full">Marcar como comunicado</Button>
          </div>
          <DiscordOutput title="Comunicado de callsigns" text={net.length ? txt : "Elegí al menos un movimiento."} sticky={false} />
        </div>
      </Card>}
    </div>);
}
