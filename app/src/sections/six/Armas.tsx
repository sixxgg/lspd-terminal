/* Panel de six y de Anita › ARMAS: el weapons.lua del servidor (ox_inventory). Buscás, tocás un ítem y copiás su bloque Lua
   tal cual (o lo editás antes de copiar). También se pueden marcar varios y copiarlos juntos, o copiar el archivo entero. */
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Crosshair, FileCode2, Search, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { cn } from "@/lib/cn";
import type { Arma } from "./armasData";

type Cat = "all" | Arma["c"];
const CAT: [Cat, string, string][] = [["all", "Todo", "Weapons, Components y Ammo"], ["arma", "Armas", "Weapons"], ["accesorio", "Accesorios", "Components"], ["municion", "Munición", "Ammo"]];
const SEC: Record<Arma["c"], string> = { arma: "Weapons", accesorio: "Components", municion: "Ammo" };
const kg = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg` : `${g} g`);
/* el archivo completo, con las tres tablas en el formato de ox_inventory */
const fullLua = (L: Arma[]) => "return {\n" + (["arma", "accesorio", "municion"] as const).map(c => `\t${SEC[c]} = {\n` + L.filter(a => a.c === c).map(a => a.lua.split("\n").map(l => "\t\t" + l).join("\n")).join("\n\n") + "\n\t},").join("\n\n") + "\n}\n";

export function ArmasTab() {
  const { toast } = useFeedback(), [L, setL] = useState<Arma[] | null>(null), [q, setQ] = useState(""), [cat, setCat] = useState<Cat>("all");
  const [open, setOpen] = useState<Arma | null>(null), [txt, setTxt] = useState(""), [pick, setPick] = useState<string[]>([]), [done, setDone] = useState("");
  useEffect(() => { void import("./armasData").then(m => setL(m.ARMAS)); }, []);
  const vis = useMemo(() => { const s = q.trim().toLowerCase(); return (L || []).filter(a => (cat === "all" || a.c === cat) && (!s || `${a.k} ${a.l} ${a.x}`.toLowerCase().includes(s))); }, [L, q, cat]);
  const copy = async (t: string, msg: string, id = "") => { try { await navigator.clipboard.writeText(t); toast(msg); setDone(id); window.setTimeout(() => setDone(""), 1400); } catch { toast("No se pudo copiar", "err"); } };
  const show = (a: Arma) => { setOpen(a); setTxt(a.lua); };
  if (!L) return <p className="py-16 text-center text-sm text-six/60">Cargando weapons.lua…</p>;
  return (
    <div className="space-y-3 font-sans">
      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {CAT.map(([k, l, d]) => { const n = k === "all" ? L.length : L.filter(a => a.c === k).length, on = cat === k; return (
          <button key={k} title={d} onClick={() => setCat(k)} className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-bold transition", on ? "border-six/60 bg-six/15 text-white" : "border-white/[.08] bg-black/30 text-slate-400 hover:text-white")}>
            {l}<span className={cn("font-mono text-xs", on ? "text-six" : "text-slate-500")}>{n}</span></button>); })}
        <label className="relative ml-auto min-w-[16rem] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar: nombre, WEAPON_…, munición" className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-six/60" /></label>
        <button onClick={() => copy(fullLua(L), "weapons.lua copiado entero")} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-six/50 hover:text-white"><FileCode2 className="size-4" />Copiar todo</button>
      </div>
      {/* marcados: se copian juntos */}
      {pick.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-six/40 bg-six/10 px-3 py-2 text-sm">
        <b className="text-white">{pick.length} marcados</b>
        <button onClick={() => copy(pick.map(k => L.find(a => a.k === k)!.lua).join("\n\n"), `${pick.length} ítems copiados`)} className="six-btn ml-auto inline-flex items-center gap-1.5 rounded-lg bg-six/90 px-3 py-1.5 text-xs font-bold text-black"><Copy className="size-3.5" />Copiar juntos</button>
        <button onClick={() => setPick([])} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-white">Desmarcar</button></div>}
      {/* lista */}
      <div className="six-panel overflow-hidden rounded-2xl">
        {!vis.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Nada coincide con «{q}».</p>
          : <div className="max-h-[calc(100vh-17rem)] divide-y divide-white/[.05] overflow-y-auto">{vis.map(a => { const on = pick.includes(a.k); return (
            <div key={a.k} className={cn("group flex items-center gap-3 px-3 py-2 transition hover:bg-white/[.03]", on && "bg-six/[.07]")}>
              <button aria-label={on ? "Desmarcar" : "Marcar"} onClick={() => setPick(on ? pick.filter(x => x !== a.k) : [...pick, a.k])}
                className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition", on ? "border-six bg-six text-black" : "border-white/20 text-transparent hover:border-six/60")}><Check className="size-3.5" /></button>
              <button onClick={() => show(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] text-white">{a.l}</b><span className="block truncate font-mono text-[11.5px] text-six/70">{a.k}</span></span>
                {a.x && <span className="hidden shrink-0 rounded-md bg-white/[.06] px-2 py-0.5 font-mono text-[11px] text-slate-400 sm:inline">{a.x}</span>}
                <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-500">{kg(a.w)}</span></button>
              <button aria-label={`Copiar ${a.k}`} title="Copiar el bloque" onClick={() => copy(a.lua, `${a.k} copiado`, a.k)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-six/15 hover:text-six">{done === a.k ? <Check className="size-4 text-six" /> : <Copy className="size-4" />}</button>
            </div>); })}</div>}
      </div>
      {/* el ítem: bloque Lua para copiar (editable) */}
      <Modal open={!!open} onClose={() => setOpen(null)} size="lg" icon={<Crosshair />} title={open?.l || ""} desc={open ? <span className="font-mono">{open.k} · {SEC[open.c]} · {kg(open.w)}{open.x ? ` · ${open.x}` : ""}</span> : undefined}
        footer={open && <div className="flex w-full flex-wrap items-center gap-2">
          <button onClick={() => copy(`'${open.k}'`, "Nombre copiado")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Copiar nombre</button>
          {txt !== open.lua && <button onClick={() => setTxt(open.lua)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="size-3.5" />Deshacer cambios</button>}
          <button onClick={() => copy(txt, "Bloque copiado")} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500"><Copy className="size-4" />Copiar</button></div>}>
        <textarea value={txt} onChange={e => setTxt(e.target.value)} spellCheck={false} rows={Math.min(22, Math.max(6, txt.split("\n").length + 1))}
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-emerald-200 outline-none focus:border-brand-500 dark:border-slate-700" />
      </Modal>
    </div>);
}
