/* Panel de six y de Anita › PEDS: los modelos de PED de GTA V con su imagen. Buscás por nombre, filtrás por tipo, marcás favoritos
   y al tocar uno ves la imagen grande y copiás el modelo o su hash (joaat), listo para el servidor. Favoritos en K("pedFav"). */
import { useMemo, useState } from "react";
import { Check, Copy, PersonStanding, Search, Star, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";
import { PED_CATS } from "./pedsData";
import { K } from "./fx";

type Ped = { n: string; c: string };
const ALL: Ped[] = PED_CATS.flatMap(([c, ns]) => ns.map(n => ({ n, c })));
const img = (n: string) => `${import.meta.env.BASE_URL}peds/${n}.webp`;
/* hash del modelo (Jenkins one-at-a-time, como GetHashKey) */
const joaat = (s: string) => { let h = 0; for (const ch of s.toLowerCase()) { h = (h + ch.charCodeAt(0)) >>> 0; h = (h + (h << 10)) >>> 0; h = (h ^ (h >>> 6)) >>> 0; }
  h = (h + (h << 3)) >>> 0; h = (h ^ (h >>> 11)) >>> 0; h = (h + (h << 15)) >>> 0; return h; };
const signed = (h: number) => (h > 0x7fffffff ? h - 0x100000000 : h);

export function PedsTab() {
  const { toast } = useFeedback(), [q, setQ] = useState(""), [cat, setCat] = useState("all"), [open, setOpen] = useState<Ped | null>(null), [done, setDone] = useState("");
  const [fav, setFav] = useJSON<string[]>(K("pedFav"), []);
  const vis = useMemo(() => { const s = q.trim().toLowerCase().replace(/\s+/g, "_");
    return ALL.filter(p => (cat === "all" || (cat === "fav" ? fav.includes(p.n) : p.c === cat)) && (!s || p.n.includes(s))); }, [q, cat, fav]);
  const copy = async (t: string, id: string) => { try { await navigator.clipboard.writeText(t); toast(`Copiado: ${t}`); setDone(id); window.setTimeout(() => setDone(""), 1400); } catch { toast("No se pudo copiar", "err"); } };
  const toggleFav = (n: string) => setFav(fav.includes(n) ? fav.filter(x => x !== n) : [...fav, n]);
  const chips: [string, string, number][] = [["all", "Todos", ALL.length], ["fav", "★ Favoritos", fav.length], ...PED_CATS.map(([c, ns]) => [c, c, ns.length] as [string, string, number])];
  const h = open ? joaat(open.n) : 0;
  return (
    <div className="space-y-3 font-sans">
      <div className="six-panel relative flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <span className="grid size-11 place-items-center rounded-xl border border-six/40 bg-six/10 text-six six-ico"><PersonStanding className="size-5" /></span>
        <div className="min-w-0 flex-1"><h2 className="six-h text-base font-bold">PEDs</h2><p className="text-xs text-slate-500">{ALL.length} modelos de GTA V con su imagen. Tocá uno para copiar el modelo o el hash.</p></div>
        <label className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar (ej.: cop, beach, freemode)…" autoFocus
            className="w-full rounded-xl border border-six/15 bg-black/40 py-2 pl-9 pr-8 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-six" />
          {q && <button aria-label="Borrar búsqueda" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-six"><X className="size-3.5" /></button>}</label>
      </div>
      <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">{chips.map(([k, l, n]) => (
        <button key={k} onClick={() => setCat(k)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition",
          cat === k ? "border-six/60 bg-six/15 text-white" : "border-white/[.08] bg-black/30 text-slate-400 hover:text-white")}>{l}<span className="rounded-md bg-white/5 px-1.5 text-[11px] tabular-nums text-slate-400">{n}</span></button>))}</div>
      {!vis.length ? <p className="py-16 text-center text-sm text-slate-500">{cat === "fav" && !fav.length ? "Todavía no marcaste favoritos: tocá la estrella de un PED." : "Ningún PED coincide."}</p>
        : <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">{vis.map(p => { const f = fav.includes(p.n); return (
          <div key={p.n} className="group relative overflow-hidden rounded-xl border border-white/[.07] bg-gradient-to-b from-white/[.04] to-black/40 transition hover:-translate-y-0.5 hover:border-six/50">
            <button onClick={() => setOpen(p)} className="block w-full text-left">
              <span className="flex h-40 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_80%,color-mix(in_srgb,var(--c)_14%,transparent),transparent_70%)] p-2">
                <img src={img(p.n)} alt="" loading="lazy" decoding="async" className="h-full w-auto max-w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.6)] transition group-hover:scale-105" /></span>
              <span className="block border-t border-white/[.06] px-2 py-1.5"><b className="block truncate font-mono text-[11.5px] text-slate-200 group-hover:text-six">{p.n}</b>
                <span className="block truncate text-[10.5px] text-slate-500">{p.c}</span></span></button>
            <button aria-label={f ? "Quitar de favoritos" : "Agregar a favoritos"} onClick={() => toggleFav(p.n)}
              className={cn("absolute right-1.5 top-1.5 rounded-lg p-1 transition", f ? "text-amber-400" : "text-slate-600 opacity-0 hover:text-amber-300 group-hover:opacity-100")}><Star className={cn("size-4", f && "fill-current")} /></button>
          </div>); })}</div>}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.n || ""} desc={open?.c} icon={<PersonStanding />} size="sm">
        {open && <div className="space-y-4">
          <div className="flex h-72 items-center justify-center rounded-2xl bg-[radial-gradient(ellipse_at_50%_85%,rgba(148,163,184,.18),transparent_70%)] p-3"><img src={img(open.n)} alt={open.n} className="h-full w-auto object-contain drop-shadow-xl" /></div>
          {([["Modelo", open.n, "n"], ["Hash", "0x" + h.toString(16).toUpperCase().padStart(8, "0"), "hx"], ["Hash (número)", String(signed(h)), "hd"]] as const).map(([l, v, id]) => (
            <div key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
              <span className="w-28 shrink-0 text-xs text-slate-500">{l}</span><code className="min-w-0 flex-1 truncate font-mono text-sm">{v}</code>
              <button onClick={() => void copy(v, id)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">{done === id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{done === id ? "Copiado" : "Copiar"}</button>
            </div>))}
          <button onClick={() => toggleFav(open.n)} className="inline-flex items-center gap-2 text-sm font-semibold text-amber-500 hover:text-amber-400"><Star className={cn("size-4", fav.includes(open.n) && "fill-current")} />{fav.includes(open.n) ? "En favoritos" : "Agregar a favoritos"}</button>
        </div>}
      </Modal>
    </div>);
}
