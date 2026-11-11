import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Car, CarFront, CheckCircle2, CircleSlash, Copy, Info, Plus, Search, Shield, Ship, Users } from "lucide-react";
import { toPng } from "html-to-image";
import { useFeedback } from "@/components/feedback";
import { cn } from "@/lib/cn";
import { CATS, MISIONES, WPN, catalogo, perfilDe, type Cat, type Item } from "./robosData";

const NT = {
  conf: { l: "Diferencia", c: "#f59e0b", I: AlertTriangle }, nuevo: { l: "Sin regla", c: "#a855f7", I: Plus }, off: { l: "Se puede sacar", c: "#ef4444", I: CircleSlash },
  rev: { l: "Recompensa pendiente", c: "#eab308", I: Info }, dup: { l: "Duplicado", c: "#f97316", I: Copy }, ok: { l: "Coincide", c: "#22c55e", I: CheckCircle2 }, sin: { l: "Sin misión", c: "#64748b", I: Info },
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

function Card({ it, obs }: { it: Item; obs: boolean }) {
  const C = CATS[it.cat], perf = [...new Set(it.mis.map(perfilDe).filter(Boolean))] as string[];
  const rec = it.mis.map(m => m.rec).filter((x, i, a) => a.indexOf(x) === i);
  const bad = it.notas.some(n => n.t === "conf" || n.t === "off");
  return (
    <article className={cn("relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-gradient-to-b from-[#0e131a] to-[#07090d] p-4 font-sans", bad ? "border-amber-500/40" : "border-white/[.07]")}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: C.c }} />
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><h3 className="text-[15px] font-bold leading-tight text-white">{it.n}</h3>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.c }}>{C.l}{!it.norm && " · propuesta"}</p></div>
        {perf.map(p => <span key={p} className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase", p === "drogas" ? "border-lime-400/40 bg-lime-500/10 text-lime-300" : "border-orange-400/40 bg-orange-500/10 text-orange-300")}>Banda de {p}</span>)}
        {it.prop && <span className="rounded-md border border-purple-400/40 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">NUEVO</span>}
      </header>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/40 p-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">Atracadores</p>
          <p className="text-lg font-black tabular-nums text-white"><Users className="mr-1 inline size-3.5 text-slate-500" />{it.min != null && it.max != null && it.min < it.max ? `${it.min}–${it.max}` : it.max ?? "—"}</p></div>
        <div className="rounded-xl bg-black/40 p-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">Policías máx.</p>
          <p className="text-lg font-black tabular-nums text-sky-300"><Shield className="mr-1 inline size-3.5 text-slate-500" />{it.pol ?? "—"}</p></div>
        <div className="rounded-xl bg-black/40 p-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">Dinero</p>
          <p className="truncate text-sm font-black leading-7 text-emerald-300" title={rec.join(" / ")}>{rec.length ? rec.join(" / ") : "—"}</p></div>
      </div>
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
        <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Armas de los atracadores{!it.norm && " (propuesta)"}</p>
        <Armas arm={it.arm} />
      </div>
      {obs && it.notas.length > 0 && <ul className="mt-auto space-y-1">{it.notas.map((n, i) => { const N = NT[n.t]; return (
        <li key={i} className="flex gap-2 rounded-lg px-2 py-1.5 text-[11.5px] leading-snug" style={{ background: N.c + "14", color: "#cbd5e1" }}>
          <N.I className="mt-px size-3.5 shrink-0" style={{ color: N.c }} /><span><b style={{ color: N.c }}>{N.l}:</b> {n.x}</span></li>); })}</ul>}
    </article>);
}

export function Catalogo() {
  const { toast } = useFeedback(), all = useMemo(catalogo, []), box = useRef<HTMLDivElement>(null);
  const [cat, setCat] = useState<Cat | "all">("all"), [q, setQ] = useState(""), [obs, setObs] = useState(true), [busy, setBusy] = useState(false), [shot, setShot] = useState(false);
  const list = all.filter(x => (cat === "all" || x.cat === cat) && (!q.trim() || (x.n + " " + x.mis.map(m => m.n).join(" ")).toLowerCase().includes(q.trim().toLowerCase())));
  const cnt = (t: keyof typeof NT) => all.reduce((s, x) => s + (t === "nuevo" && x.cat === "mis" ? 0 : x.notas.filter(n => n.t === t).length), 0);
  const off = MISIONES.filter(m => m.off), dup = MISIONES.filter(m => m.f.length > 1);
  const foto = async () => {
    const el = box.current; if (!el) return; setBusy(true);
    try {
      /* se saca a 1920 px de ancho con 5 columnas y x2 = 3840 px (4K); el navegador aguanta hasta ~32000 px de alto */
      setShot(true); await new Promise(r => setTimeout(r, 120));
      const h = el.scrollHeight, pr = Math.min(2, 32000 / h);
      const url = await toPng(el, { pixelRatio: pr, width: 1920, height: h, skipAutoScale: true, backgroundColor: "#05070a", cacheBust: true });
      const a = document.createElement("a"); a.href = url; a.download = `catalogo-robos-4k-${new Date().toISOString().slice(0, 10)}.png`; a.click();
      toast("Foto 4K descargada");
    } catch { toast("No se pudo generar la foto"); } finally { setBusy(false); setShot(false); }
  };
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

      <div ref={box} style={shot ? { width: 1920 } : undefined} className={cn("space-y-4 rounded-2xl bg-[#05070a] p-4", shot && "p-8")}>
        <header className="flex flex-wrap items-end gap-4 border-b border-white/10 pb-3 font-sans">
          <div className="flex-1"><h2 className="text-2xl font-black tracking-tight text-white">Catálogo de robos</h2>
            <p className="text-xs text-slate-500">Normativa de Robos cruzada con la planilla de misiones · policías máx. = atracadores máx. + 2 en las propuestas</p></div>
          <div className="flex flex-wrap gap-2 text-xs">{(["conf", "nuevo", "off", "dup", "rev"] as const).map(t => (
            <span key={t} className="rounded-lg px-2 py-1 font-semibold" style={{ background: NT[t].c + "1a", color: NT[t].c }}>{cnt(t)} {NT[t].l.toLowerCase()}</span>))}</div>
        </header>
        {cat === "all" && !q && <section className="grid gap-3 font-sans text-xs md:grid-cols-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><b className="text-amber-300">Para corregir</b><p className="text-slate-500">El Excel deja ir más atracadores que la normativa: hay que igualar uno de los dos.</p>
            <ul className="mt-1 space-y-0.5 text-slate-300">{all.filter(x => x.notas.some(n => n.t === "conf")).map(x => { const m = x.mis.find(y => x.max != null && y.max > x.max)!; return <li key={x.id}>· {x.n}: Excel {m.max} (fila {m.f.join(", ")}) · normativa {x.max}</li>; })}</ul></div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3"><b className="text-red-300">Se puede sacar</b><p className="text-slate-500">Misiones marcadas NO ACTIVO y filas repetidas del Excel.</p>
            <ul className="mt-1 space-y-0.5 text-slate-300">{off.map(m => <li key={m.n}>· {m.n} (fila {m.f[0]}, no activa)</li>)}{dup.map(m => <li key={m.n}>· {m.n} (filas {m.f.join(" y ")}, sin decir para qué banda)</li>)}</ul></div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3"><b className="text-purple-300">Robos del Excel que no están en la normativa</b>
            <p className="text-slate-500">Existen como misión, pero la Normativa de Robos no dice cuántos atracadores ni cuántos policías pueden ir. Propuesta: la categoría más parecida, el máximo del Excel y policías = atracadores + 2.</p>
            <ul className="mt-1 space-y-0.5 text-slate-300">{all.filter(x => x.prop && x.cat !== "mis" && !x.mis.some(m => m.off)).map(x => <li key={x.id}>· {x.n} <span className="text-slate-500">(fila {x.mis[0].f.join(", ")})</span> → {CATS[x.cat].l} · {x.max} atracadores · {x.pol} policías</li>)}</ul></div>
        </section>}
        {(Object.keys(CATS) as Cat[]).filter(k => list.some(x => x.cat === k)).map(k => (
          <section key={k}>
            <h3 className="mb-2 flex items-baseline gap-2 font-sans"><span className="size-2.5 rounded-full" style={{ background: CATS[k].c }} /><b className="text-white">{CATS[k].l}</b><span className="text-xs text-slate-500">{CATS[k].d}</span></h3>
            <div className={cn("grid gap-3", shot ? "grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")}>{list.filter(x => x.cat === k).map(x => <Card key={x.id} it={x} obs={obs} />)}</div>
          </section>))}
        {!list.length && <p className="py-10 text-center font-sans text-sm text-slate-500">Nada coincide con la búsqueda.</p>}
      </div>
    </div>);
}
