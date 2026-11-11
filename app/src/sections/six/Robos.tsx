import { useMemo, useRef, useState } from "react";
import { Camera, Car, Gift, X, CarFront, Copy, Info, Plus, RefreshCw, Search, Shield, Ship, Users } from "lucide-react";
import { toPng } from "html-to-image";
import { useFeedback } from "@/components/feedback";
import { cn } from "@/lib/cn";
import { CATS, INACTIVAS, MISIONES, WPN, catalogo, perfilDe, type Cat, type Item } from "./robosData";

const NT = {
  act: { l: "Actualizado", c: "#f59e0b", I: RefreshCw }, nuevo: { l: "Nuevo", c: "#a855f7", I: Plus },
  rev: { l: "Recompensa pendiente", c: "#eab308", I: Info }, dup: { l: "Fila repetida", c: "#f97316", I: Copy }, sin: { l: "Sin misión", c: "#64748b", I: Info },
} as const;
const yn = (v: boolean | null | undefined) => (v == null ? "—" : v ? "Sí" : "No");
/* siluetas propias (24x12) para las armas y el helicóptero */
const G = ({ d, className }: { d: string; className?: string }) => <svg viewBox="0 0 24 12" className={cn("h-3 w-6", className)} fill="currentColor" aria-hidden><path d={d} /></svg>;
const WD = [
  ["Arma blanca", "M1 6.6 13 5l1.3-.6h1.4v3.2h-1.4L13 7 1 6.6Zm14.9-2.4h1.4v3.6h-1.4zm1.8.6H23v2.4h-5.3z"],
  ["Pistola", "M4 3h15v3h-8.5l-.6 1.3H8.6L7.2 11H3.6l1.5-5H4z"],
  ["Escopeta", "M1 4.5h17.5V6H9.8l-.7 1.2H7L4.4 9.6H1.6L3.4 6H1zm18 0h4v1.4h-4z"],
  ["SMG", "M3 3.5h13l1.2 1h3.8V6h-6.3l-.7 1.6h-2.2L11 10.5H9l.7-2.9H7.4L6 11H3.2l1.3-3.4L3 7z"],
  ["Fusil", "M.8 4.6h4l1-.8h12.4v.8H23v1.2h-4.8l-.8 1.4h-2.2l-.6 3H13l.3-3H9.4L6.6 9.6H3.4L5 6.4H.8z"],
] as const;
const HELI = "M2 2.5h20v.9h-9.4v1.2h1.8c3 0 5 1.6 5 3.6v.6h-4.3l-.6 1.5H8.6V8.8H4.3L1.8 6.3h2.6l1.3 1.2h2.7V6.1c0-.9.8-1.5 1.8-1.5h1.3V3.4H2z";
const PV = [["Patrulla", Car], ["Interceptor", CarFront], ["Helicóptero", (p: { className?: string }) => <G d={HELI} className={cn("h-3.5 w-6", p.className)} />], ["Barco", Ship]] as const;
const LV = ["Prohibida", "Permitida", "Obligatoria"];

function Armas({ arm }: { arm?: string }) {
  const w = arm ? WPN[arm] : undefined; if (!w) return null;
  return <div className="flex flex-wrap gap-1">{WD.map(([l, d], i) => (
    <span key={l} title={`${l}: ${LV[w[i]].toLowerCase()}`} className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
      w[i] === 2 ? "border-red-400/50 bg-red-500/15 text-red-200" : w[i] === 1 ? "border-white/15 bg-white/5 text-slate-300" : "border-white/5 text-slate-600 line-through decoration-slate-600")}>
      <G d={d} className={w[i] ? "" : "opacity-40"} />{l}{w[i] === 2 && <b className="text-[9px] text-red-300">OBLIG.</b>}</span>))}</div>;
}

/* policías en unidades: binomios (2) y, si sobra uno, una unión */
const unidades = (n?: number | null) => { if (!n) return ""; const b = Math.floor(n / 2), u = n % 2; return [b ? `${b} binomio${b > 1 ? "s" : ""}` : "", u ? "1 unión" : ""].filter(Boolean).join(" + "); };
/* recompensa: el dinero por un lado y lo extra (ítems para droga, piezas de armas, objetos) por otro */
const MONEY = /(\d[\d.,]*)\s*\$/;
const num = (s: string) => Number(s.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".")) || 0;
function recOf(mis: Item["mis"]) {
  const amts = new Set<number>(), extra = new Set<string>(); let pend = false;
  for (const m of mis) {
    const r = m.rec, mm = r.match(MONEY); if (mm) amts.add(num(mm[1]));
    if (/revisar|falta/i.test(r)) pend = true;
    const ex = r.replace(MONEY, "").replace(/revisar|falta hacerla|no activo/gi, "").replace(/^[\s+\-–·]+|[\s+\-–·]+$/g, "").trim();
    if (ex) extra.add(ex[0].toUpperCase() + ex.slice(1));
  }
  const L = [...amts].sort((a, b) => a - b), f = (n: number) => `$${n.toLocaleString("es-AR")}`;
  return { money: !L.length ? "" : L.length === 1 ? f(L[0]) : `${f(L[0])} – ${f(L[L.length - 1])}`, extra: [...extra], pend };
}

function Card({ it, obs }: { it: Item; obs: boolean }) {
  const C = CATS[it.cat], perf = [...new Set(it.mis.map(perfilDe).filter(Boolean))] as string[];
  const R = recOf(it.mis);
  return (
    <article className={cn("relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-gradient-to-b from-[#0e131a] to-[#07090d] p-4 font-sans", it.chg ? "border-amber-500/40" : it.nuevo && it.cat !== "mis" ? "border-purple-500/40" : "border-white/[.07]")}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: C.c }} />
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><h3 className="text-[15px] font-bold leading-tight text-white">{it.n}</h3>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.c }}>{C.l}</p></div>
        {perf.map(p => <span key={p} className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase", p === "drogas" ? "border-lime-400/40 bg-lime-500/10 text-lime-300" : "border-orange-400/40 bg-orange-500/10 text-orange-300")}>Banda de {p}</span>)}
        {it.nuevo && it.cat !== "mis" && <span className="rounded-md border border-purple-400/40 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">NUEVO</span>}
        {it.chg && <span title={`Antes ${it.chg.de}`} className="rounded-md border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">{it.chg.de} → {it.chg.a}</span>}
      </header>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/40 p-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">Atracadores</p>
          <p className="text-lg font-black tabular-nums text-white"><Users className="mr-1 inline size-3.5 text-slate-500" />{it.min != null && it.max != null && it.min < it.max ? `${it.min}–${it.max}` : it.max ?? "—"}</p></div>
        <div className="rounded-xl bg-black/40 p-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">Policías máx.</p>
          <p className="text-lg font-black tabular-nums text-sky-300"><Shield className="mr-1 inline size-3.5 text-slate-500" />{it.pol ?? "—"}</p>
          {it.pol ? <p className="min-h-[26px] text-[10px] leading-tight text-sky-200/70">{unidades(it.pol)}</p> : null}</div>
        <div className="rounded-xl bg-black/40 p-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">Dinero</p>
          {R.money ? <p className="text-sm font-black leading-7 tabular-nums text-emerald-300">{R.money}</p> : <p className={cn("text-xs font-bold leading-7", R.pend ? "text-amber-300" : "text-slate-500")}>{R.pend ? "A definir" : "—"}</p>}
          {R.money && R.pend && <p className="text-[10px] leading-tight text-amber-300/80">+ alguna a definir</p>}</div>
      </div>
      {R.extra.length > 0 && <div className="flex flex-wrap items-center gap-1 text-[11px]"><span className="font-semibold uppercase tracking-wider text-slate-500">También da</span>
        {R.extra.map(x => <span key={x} className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-200"><Gift className="size-3" />{x}</span>)}</div>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">Rehenes</dt><dd className="text-slate-200">{it.reh ?? "—"}</dd>
        <dt className="text-slate-500">Bloqueo</dt><dd className="text-slate-200">{yn(it.blq)}</dd>
        {it.ilg && <><dt className="text-slate-500">Vehículo</dt><dd className="text-slate-200">{it.ilg}</dd></>}
        {it.mis.length > 0 && <><dt className="text-slate-500">Planilla</dt><dd className="text-slate-300">{it.mis.map(m => `${m.n} · fila ${m.f.join(", ")} (${m.min}–${m.max})`).join(" · ")}</dd></>}
      </dl>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Policía puede llevar</p>
        <div className="flex flex-wrap gap-1">{PV.map(([l, I], i) => { const on = !!it.pv?.[i]; if (i === 3 && !on) return null; return (
          <span key={l} className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", on ? "border-sky-400/40 bg-sky-500/10 text-sky-200" : "border-white/5 text-slate-600 line-through")}><I className="size-3" />{l}</span>); })}
          {it.mando && <span className="rounded-md border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">Con mando</span>}</div>
        <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Armas de los atracadores</p>
        <Armas arm={it.arm} />
      </div>
      {obs && it.notas.length > 0 && <ul className="mt-auto space-y-1">{it.notas.map((n, i) => { const N = NT[n.t]; return (
        <li key={i} className="flex gap-2 rounded-lg px-2 py-1.5 text-[11.5px] leading-snug" style={{ background: N.c + "14", color: "#cbd5e1" }}>
          <N.I className="mt-px size-3.5 shrink-0" style={{ color: N.c }} /><span><b style={{ color: N.c }}>{N.l}:</b> {n.x}</span></li>); })}</ul>}
    </article>);
}

export function Catalogo() {
  const { toast } = useFeedback(), all = useMemo(catalogo, []), box = useRef<HTMLDivElement>(null), secs = useRef<Record<string, HTMLElement | null>>({});
  const [cat, setCat] = useState<Cat | "all">("all"), [flt, setFlt] = useState<"" | "act" | "nuevo" | "pend">(""), [q, setQ] = useState(""), [obs, setObs] = useState(true), [busy, setBusy] = useState(false), [shot, setShot] = useState(false);
  const isPend = (x: Item) => x.notas.some(n => n.t === "rev" || n.t === "dup");
  const FLT = { act: (x: Item) => !!x.chg, nuevo: (x: Item) => !!x.nuevo && x.cat !== "mis", pend: isPend } as const;
  const list = all.filter(x => (cat === "all" || x.cat === cat) && (!flt || FLT[flt](x)) && (!q.trim() || (x.n + " " + x.mis.map(m => m.n).join(" ")).toLowerCase().includes(q.trim().toLowerCase())));
  const dup = MISIONES.filter(m => !m.off && m.f.length > 1), rev = MISIONES.filter(m => !m.off && /revisar|falta/i.test(m.rec)), chg = all.filter(x => x.chg), nuevos = all.filter(x => x.nuevo && x.cat !== "mis");
  /* FOTO 4K: una imagen por bloque (resumen y cada tipo de robo), a 1920 px x2 = 3840 px de ancho */
  const foto = async () => {
    setBusy(true); setShot(true);
    try {
      await new Promise(r => setTimeout(r, 150));
      const day = new Date().toISOString().slice(0, 10), L = Object.entries(secs.current).filter(([, el]) => el) as [string, HTMLDivElement][];
      for (const [k, el] of L) {
        const h = el.scrollHeight, url = await toPng(el, { pixelRatio: Math.min(2, 32000 / h), width: 1920, height: h, skipAutoScale: true, backgroundColor: "#05070a", cacheBust: true });
        const a = document.createElement("a"); a.href = url; a.download = `robos-${k}-4k-${day}.png`; a.click();
        await new Promise(r => setTimeout(r, 350));
      }
      toast(`${L.length} fotos 4K descargadas`);
    } catch { toast("No se pudo generar la foto"); } finally { setBusy(false); setShot(false); }
  };
  const chips = [["act", chg.length, "actualizados", RefreshCw, "#f59e0b"], ["nuevo", nuevos.length, "robos nuevos", Plus, "#a855f7"], ["pend", all.filter(isPend).length, "con pendientes", Info, "#ef4444"]] as const;
  const Head = ({ sub }: { sub?: string }) => (
    <header className="flex flex-wrap items-end gap-4 border-b border-white/10 pb-3 font-sans">
      <div className="flex-1"><h2 className="text-2xl font-black tracking-tight text-white">Catálogo de robos{sub && <span className="text-slate-500"> · {sub}</span>}</h2>
        <p className="text-xs text-slate-500">Vigente: el Excel de misiones manda sobre la normativa vieja · policías máx. = atracadores máx. + 2 (binomios de 2 y una unión si sobra uno)</p></div>
    </header>);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-six/15 bg-black/40 p-1">
          {([["all", "Todos", "#94a3b8"], ...Object.entries(CATS).map(([k, v]) => [k, v.l, v.c])] as [Cat | "all", string, string][]).map(([k, l, c]) => (
            <button key={k} onClick={() => setCat(k)} className={cn("rounded-lg px-2.5 py-1.5 font-sans text-xs font-semibold transition", cat === k ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}>
              <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: c }} />{l} <span className="text-slate-500">{k === "all" ? all.length : all.filter(x => x.cat === k).length}</span></button>))}
        </div>
        <label className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar robo o misión…" className="w-full rounded-xl border border-six/15 bg-black/40 py-2 pl-8 pr-3 font-sans text-sm text-slate-100 outline-none focus:border-six" /></label>
        <button onClick={() => setObs(!obs)} className={cn("rounded-xl border px-3 py-2 font-sans text-xs font-semibold", obs ? "border-six/60 bg-six/10 text-six" : "border-six/15 text-slate-500")}>Observaciones {obs ? "ON" : "OFF"}</button>
        <button onClick={foto} disabled={busy} className="six-btn inline-flex items-center gap-1.5 rounded-xl border border-six/60 bg-six/10 px-3.5 py-2 text-xs font-bold tracking-[0.12em] text-six disabled:opacity-40"><Camera className="size-3.5" />{busy ? "GENERANDO…" : "FOTO 4K"}</button>
      </div>

      <div ref={box} style={shot ? { width: 1920 } : undefined} className={cn("space-y-5 rounded-2xl bg-[#05070a] p-4", shot && "p-0")}>
        <div ref={el => { secs.current["0-resumen"] = flt || q || cat !== "all" ? null : el; }} className={cn("space-y-4", shot && "bg-[#05070a] p-8")}>
        <Head />
        <div className="flex flex-wrap items-center gap-2 font-sans text-xs">{chips.map(([k, n, l, I, c]) => (
          <button key={k} onClick={() => setFlt(flt === k ? "" : k)} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold transition", flt === k ? "text-white" : "hover:brightness-125")}
            style={{ borderColor: c + (flt === k ? "" : "40"), background: c + (flt === k ? "40" : "14"), color: flt === k ? "#fff" : c }}><I className="size-3.5" />{n} {l}</button>))}
          {flt && <button onClick={() => setFlt("")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-400 hover:text-white"><X className="size-3.5" />Ver todo</button>}
          {!flt && <span className="text-slate-500">Tocá uno para filtrar</span>}</div>
        {cat === "all" && !q && !flt && <section className="grid gap-3 font-sans text-xs md:grid-cols-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><b className="text-amber-300">Actualizado desde el Excel</b><p className="text-slate-500">La normativa vieja decía otra cantidad; quedó lo del Excel.</p>
            <ul className="mt-1 space-y-0.5 text-slate-300">{chg.map(x => <li key={x.id}>· {x.n}: {x.chg!.de} → <b className="text-white">{x.chg!.a}</b> atracadores · {x.pol} policías <span className="text-slate-500">(fila {x.chg!.f.join(", ")})</span></li>)}</ul></div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3"><b className="text-purple-300">Robos nuevos del Excel ({nuevos.length})</b><p className="text-slate-500">No estaban en la normativa vieja; ya están cargados en su categoría (atracadores / policías).</p>
            <ul className="mt-1 space-y-0.5 text-slate-300">{nuevos.map(x => <li key={x.id}>· {x.n} → {CATS[x.cat].l} · {x.max} / {x.pol} <span className="text-slate-500">(fila {x.mis[0].f.join(", ")})</span></li>)}</ul></div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3"><b className="text-red-300">Pendiente en el Excel</b><p className="text-slate-500">Lo que conviene completar o limpiar en la planilla.</p>
            <p className="mt-1.5 font-semibold text-slate-400">NO ACTIVO (fuera del catálogo)</p>
            <ul className="space-y-0.5 text-slate-300">{INACTIVAS.map(m => <li key={m.n}>· {m.n} <span className="text-slate-500">(fila {m.f[0]})</span></li>)}</ul>
            <p className="mt-1.5 font-semibold text-slate-400">Filas repetidas sin decir para qué banda</p>
            <ul className="space-y-0.5 text-slate-300">{dup.map(m => <li key={m.n}>· {m.n} <span className="text-slate-500">(filas {m.f.join(" y ")})</span></li>)}</ul>
            <p className="mt-1.5 font-semibold text-slate-400">Recompensa sin definir</p>
            <ul className="space-y-0.5 text-slate-300">{rev.map(m => <li key={m.n}>· {m.n} <span className="text-slate-500">(fila {m.f.join(", ")})</span></li>)}</ul></div>
        </section>}
        </div>
        {(Object.keys(CATS) as Cat[]).filter(k => list.some(x => x.cat === k)).map(k => (
          <section key={k} ref={el => { secs.current[`${Object.keys(CATS).indexOf(k) + 1}-${k}`] = el; }} className={cn(shot && "space-y-4 bg-[#05070a] p-8")}>
            {shot && <Head sub={CATS[k].l} />}
            <h3 className="mb-2 flex items-baseline gap-2 font-sans"><span className="size-2.5 rounded-full" style={{ background: CATS[k].c }} /><b className="text-white">{CATS[k].l}</b><span className="text-xs text-slate-500">{CATS[k].d}</span></h3>
            <div className={cn("grid gap-3", shot ? "grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")}>{list.filter(x => x.cat === k).map(x => <Card key={x.id} it={x} obs={obs} />)}</div>
          </section>))}
        {!list.length && <p className="py-10 text-center font-sans text-sm text-slate-500">Nada coincide con la búsqueda.</p>}
      </div>
    </div>);
}
