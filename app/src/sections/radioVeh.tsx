/* Vehículo de huida (Radio): buscador único de modelo (base de vehículos), muestras de color y matrícula con forma de patente de San Andreas. */
import { useMemo, useRef, useState } from "react";
import { Bike, Car, CarFront, Check, Search, Truck, X } from "lucide-react";
import { modelsOf } from "@/lib/vehicles";
import { norm } from "@/lib/domain";
import { useOutside } from "@/lib/outside";
import { cn } from "@/lib/cn";

export type Veh = { cat: string; mk: string; md: string; mo: string };
/* colores con su muestra; se puede escribir cualquier otro (bicolor, mate…) */
const SW: [string, string][] = [["negro", "#111827"], ["blanco", "#f8fafc"], ["gris", "#6b7280"], ["plateado", "#c0c6cf"], ["rojo", "#dc2626"], ["granate", "#7f1d1d"], ["azul", "#2563eb"],
  ["azul oscuro", "#1e3a8a"], ["azul claro", "#60a5fa"], ["verde", "#16a34a"], ["verde oscuro", "#14532d"], ["amarillo", "#facc15"], ["naranja", "#f97316"], ["morado", "#7c3aed"],
  ["rosa", "#ec4899"], ["marrón", "#78350f"], ["beige", "#d6c7a1"], ["dorado", "#ca8a04"]];
const colHex = (c: string) => SW.find(x => norm(x[0]) === norm(c.trim()))?.[1] || SW.find(x => norm(c).startsWith(norm(x[0])))?.[1];
const MAT = [["ok", "Con matrícula"], ["sin", "Sin matrícula"], ["tap", "Tapada"], ["nv", "No se vio"]] as const;
const catIcon = (c: string) => (/moto|bici/i.test(c) ? Bike : /camion|furgo|industrial|utilit|comercial|van/i.test(norm(c)) ? Truck : /suv|todo/i.test(norm(c)) ? CarFront : Car);

export function EscapeVeh({ veh, setVeh, col, setCol, matT, setMatT, mat, setMat, recent }: {
  veh: Veh; setVeh: (v: Veh) => void; col: string; setCol: (v: string) => void; matT: string; setMatT: (v: string) => void; mat: string; setMat: (v: string) => void; recent: string[];
}) {
  const ALL = useMemo(() => modelsOf("", "").filter(x => x.c !== "Policial"), []);
  const [q, setQ] = useState(""), [o, setO] = useState(false), [hi, setHi] = useState(0), box = useRef<HTMLDivElement>(null);
  useOutside(box, o, () => setO(false));
  const s = norm(q.trim()), L = !s ? [] : ALL.filter(x => norm(`${x.n} ${x.s}`).includes(s)).sort((a, b) => +!norm(a.m).startsWith(s) - +!norm(b.m).startsWith(s)).slice(0, 8);
  const pick = (x: { b: string; m: string; n: string; c: string }) => { setVeh({ cat: x.c, mk: x.b, md: x.m, mo: x.n }); setQ(""); setO(false); };
  const name = veh.mo || veh.md, hex = colHex(col), Ic = catIcon(veh.cat);
  return (
    <div className="space-y-4">
      {/* modelo */}
      {name ? (
        <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700"
          style={{ background: hex ? `linear-gradient(110deg, ${hex}33, transparent 65%)` : undefined }}>
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl shadow-inner" style={{ background: hex || "rgb(var(--b-500) / .15)" }}>
            <Ic className={cn("size-7", hex && ["#f8fafc", "#facc15", "#d6c7a1", "#c0c6cf"].includes(hex) ? "text-slate-800" : hex ? "text-white" : "text-brand-600")} /></span>
          <span className="min-w-0 flex-1"><b className="block truncate font-display text-xl leading-tight">{veh.md || name}</b>
            <span className="text-[12px] text-slate-500">{[veh.mk, veh.cat].filter(Boolean).join(" · ") || "Modelo escrito a mano"}</span></span>
          <button type="button" onClick={() => setVeh({ cat: "", mk: "", md: "", mo: "" })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-500 transition hover:bg-red-500/10 hover:text-red-500"><X className="size-3.5" />Cambiar</button>
        </div>
      ) : (
        <div ref={box} className="relative">
          <label className="flex h-12 items-center gap-2.5 rounded-2xl border border-slate-200 px-3.5 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700">
            <Search className="size-4 text-slate-400" />
            <input value={q} onChange={e => { setQ(e.target.value); setO(true); setHi(0); }} onFocus={() => setO(true)} placeholder="Buscá el modelo: Jugular, Sultan, Bati…"
              onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setHi(i => Math.min(L.length - 1, i + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi(i => Math.max(0, i - 1)); }
                else if (e.key === "Enter") { e.preventDefault(); if (L[hi]) pick(L[hi]); else if (q.trim()) { setVeh({ cat: "", mk: "", md: q.trim(), mo: q.trim() }); setQ(""); } } else if (e.key === "Escape") setO(false); }}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400" />
            {q && <kbd className="hidden rounded border border-slate-200 px-1.5 text-[10px] text-slate-400 sm:block dark:border-slate-700">Enter</kbd>}
          </label>
          {o && L.length > 0 && <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[rgb(var(--card))]">
            {L.map((x, i) => { const I = catIcon(x.c); return (
              <button key={x.s + x.n} type="button" onMouseEnter={() => setHi(i)} onMouseDown={e => { e.preventDefault(); pick(x); }}
                className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left", i === hi && "bg-slate-100 dark:bg-slate-800")}>
                <span className="grid size-9 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300"><I className="size-4" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{x.m}</b><span className="text-[11.5px] text-slate-500">{x.b || "Sin marca"}</span></span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 dark:bg-slate-800">{x.c}</span>
              </button>); })}
          </div>}
          {o && s && !L.length && <p className="absolute inset-x-0 top-full z-40 mt-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] text-slate-500 shadow-xl dark:border-slate-700 dark:bg-[rgb(var(--card))]">No está en la base · Enter para usar «{q.trim()}»</p>}
          {recent.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-slate-400">Recientes:</span>{recent.slice(0, 6).map(r => (
            <button key={r} type="button" onClick={() => { const x = ALL.find(a => a.n === r || a.m === r); x ? pick(x) : setVeh({ cat: "", mk: "", md: r, mo: r }); }}
              className="rounded-full border border-slate-200 px-2 py-0.5 text-[11.5px] text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300">{r}</button>))}</div>}
        </div>
      )}
      {/* color */}
      <div>
        <p className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">Color<span className="font-normal text-slate-400">{col ? `· ${col}` : "· tocá una muestra o escribilo"}</span></p>
        <div className="flex flex-wrap gap-1.5">{SW.map(([n, h]) => { const on = norm(col) === norm(n); return (
          <button key={n} type="button" title={n} aria-label={n} onClick={() => setCol(on ? "" : n)}
            className={cn("relative size-8 rounded-full ring-1 ring-black/10 transition hover:scale-110 dark:ring-white/15", on && "ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900")} style={{ background: h }}>
            {on && <Check className={cn("absolute inset-0 m-auto size-4", ["#f8fafc", "#facc15", "#d6c7a1", "#c0c6cf"].includes(h) ? "text-slate-800" : "text-white")} />}</button>); })}</div>
        <input value={col} onChange={e => setCol(e.target.value)} placeholder="Otro: rojo y negro, verde mate…" className="mt-2 h-9 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700" />
      </div>
      {/* matrícula */}
      <div>
        <p className="mb-1.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">Matrícula</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("relative w-56 rounded-xl border-[3px] bg-white px-3 pb-1.5 pt-4 shadow-md transition", matT === "ok" ? "border-[#1d3f8f]" : "border-slate-300 opacity-60")}>
            <span className="absolute inset-x-0 top-0.5 text-center font-serif text-[11px] italic text-[#1d3f8f]">San Andreas</span>
            {matT === "ok" ? <input value={mat} onChange={e => setMat(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="JJ7265EZ" aria-label="Matrícula"
              className="w-full bg-transparent text-center font-mono text-[26px] font-bold tracking-[.12em] text-[#1d3f8f] outline-none placeholder:text-[#1d3f8f]/25" />
              : <p className="text-center font-mono text-[18px] font-bold uppercase tracking-wider text-slate-400">{MAT.find(m => m[0] === matT)?.[1]}</p>}
          </div>
          <div className="flex flex-wrap gap-1.5">{MAT.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMatT(k)} className={cn("rounded-full border px-2.5 py-1 text-[12px] font-semibold transition", matT === k ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}>{l}</button>))}</div>
        </div>
      </div>
    </div>);
}
