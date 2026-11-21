/* Panel de six y de Anita › Utilidades › Vehículos: los modelos de vehículos de GTA V con su imagen (lista de la documentación de FiveM,
   imágenes alojadas en la terminal). Buscás por nombre o modelo, filtrás por categoría, marcás favoritos y copiás el modelo o el hash. */
import { useMemo, useState } from "react";
import { CarFront, Check, Copy, Search, Star, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";
import { VEHS, VEH_CATS, VEH_DLC } from "./vehData";
import { joaat, signed } from "./Peds";
import { K } from "./fx";

const img = (n: string) => `${import.meta.env.BASE_URL}vehicles/${n}.webp`;
type V = (typeof VEHS)[number];

export function VehTab() {
  const { toast } = useFeedback(), [q, setQ] = useState(""), [cat, setCat] = useState<number | "all" | "fav">("all"), [open, setOpen] = useState<V | null>(null), [done, setDone] = useState("");
  const [fav, setFav] = useJSON<string[]>(K("vehFav"), []);
  const vis = useMemo(() => { const s = q.trim().toLowerCase();
    return VEHS.filter(v => (cat === "all" || (cat === "fav" ? fav.includes(v[0]) : v[2] === cat)) && (!s || v[0].includes(s.replace(/\s+/g, "")) || v[1].toLowerCase().includes(s))); }, [q, cat, fav]);
  const copy = async (t: string, id: string) => { try { await navigator.clipboard.writeText(t); toast(`Copiado: ${t}`); setDone(id); window.setTimeout(() => setDone(""), 1400); } catch { toast("No se pudo copiar", "err"); } };
  const toggleFav = (n: string) => setFav(fav.includes(n) ? fav.filter(x => x !== n) : [...fav, n]);
  const chips: [number | "all" | "fav", string, number][] = [["all", "Todos", VEHS.length], ["fav", "★ Favoritos", fav.length], ...VEH_CATS.map((c, i) => [i, c, VEHS.filter(v => v[2] === i).length] as [number, string, number])];
  const h = open ? joaat(open[0]) : 0;
  return (
    <div className="space-y-3 font-sans">
      <div className="six-panel relative flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <span className="grid size-11 place-items-center rounded-xl border border-six/40 bg-six/10 text-six six-ico"><CarFront className="size-5" /></span>
        <div className="min-w-0 flex-1"><h2 className="six-h text-base font-bold">Vehículos</h2><p className="text-xs text-slate-500">{VEHS.length} modelos de GTA V con su imagen. Tocá uno para copiar el modelo o el hash.</p></div>
        <label className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar (ej.: police, buzzard, adder)…" autoFocus
            className="w-full rounded-xl border border-six/15 bg-black/40 py-2 pl-9 pr-8 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-six" />
          {q && <button aria-label="Borrar búsqueda" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-six"><X className="size-3.5" /></button>}</label>
      </div>
      <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">{chips.map(([k, l, n]) => (
        <button key={String(k)} onClick={() => setCat(k)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition",
          cat === k ? "border-six/60 bg-six/15 text-white" : "border-white/[.08] bg-black/30 text-slate-400 hover:text-white")}>{l}<span className="rounded-md bg-white/5 px-1.5 text-[11px] tabular-nums text-slate-400">{n}</span></button>))}</div>
      {!vis.length ? <p className="py-16 text-center text-sm text-slate-500">{cat === "fav" && !fav.length ? "Todavía no marcaste favoritos: tocá la estrella de un vehículo." : "Ningún vehículo coincide."}</p>
        : <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{vis.map(v => { const f = fav.includes(v[0]); return (
          <div key={v[0]} className="group relative overflow-hidden rounded-xl border border-white/[.07] bg-gradient-to-b from-white/[.04] to-black/40 transition hover:-translate-y-0.5 hover:border-six/50">
            <button onClick={() => setOpen(v)} className="block w-full text-left">
              <span className="flex h-28 items-center justify-center overflow-hidden p-2"><img src={img(v[0])} alt="" loading="lazy" decoding="async" className="max-h-full w-auto max-w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.6)] transition group-hover:scale-105" /></span>
              <span className="block border-t border-white/[.06] px-2 py-1.5"><b className="block truncate text-[12.5px] text-slate-200 group-hover:text-six">{v[1]}</b>
                <span className="block truncate font-mono text-[10.5px] text-slate-500">{v[0]}</span></span></button>
            <button aria-label={f ? "Quitar de favoritos" : "Agregar a favoritos"} onClick={() => toggleFav(v[0])}
              className={cn("absolute right-1.5 top-1.5 rounded-lg p-1 transition", f ? "text-amber-400" : "text-slate-600 opacity-0 hover:text-amber-300 group-hover:opacity-100")}><Star className={cn("size-4", f && "fill-current")} /></button>
          </div>); })}</div>}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.[1] || ""} desc={open ? [VEH_CATS[open[2]], open[3] >= 0 ? VEH_DLC[open[3]] : ""].filter(Boolean).join(" · ") : ""} icon={<CarFront />} size="sm">
        {open && <div className="space-y-4">
          <div className="flex h-48 items-center justify-center rounded-2xl bg-[radial-gradient(ellipse_at_50%_85%,rgba(148,163,184,.18),transparent_70%)] p-3"><img src={img(open[0])} alt={open[1]} className="max-h-full w-auto object-contain drop-shadow-xl" /></div>
          {([["Modelo", open[0], "n"], ["Hash", "0x" + h.toString(16).toUpperCase().padStart(8, "0"), "hx"], ["Hash (número)", String(signed(h)), "hd"]] as const).map(([l, val, id]) => (
            <div key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
              <span className="w-28 shrink-0 text-xs text-slate-500">{l}</span><code className="min-w-0 flex-1 truncate font-mono text-sm">{val}</code>
              <button onClick={() => void copy(val, id)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">{done === id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{done === id ? "Copiado" : "Copiar"}</button>
            </div>))}
          <button onClick={() => toggleFav(open[0])} className="inline-flex items-center gap-2 text-sm font-semibold text-amber-500 hover:text-amber-400"><Star className={cn("size-4", fav.includes(open[0]) && "fill-current")} />{fav.includes(open[0]) ? "En favoritos" : "Agregar a favoritos"}</button>
        </div>}
      </Modal>
    </div>);
}
