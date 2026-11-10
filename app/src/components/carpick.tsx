/* Selector de patrullas ONX: buscador, filtro por tipo, las más revisadas arriba y selección múltiple */
import { useMemo, useState } from "react";
import { Car, Check, Plus, Search, Star } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button, Input } from "@/components/ui";
import { CAR_TYPES, PATROL_CARS, carType } from "@/lib/onx";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

export function CarPicker({ open, onClose, have, top, who, onAdd }: { open: boolean; onClose: () => void; have: string[]; top: string[]; who: string; onAdd: (ks: string[]) => void }) {
  const [q, setQ] = useState(""), [t, setT] = useState(""), [sel, setSel] = useState<string[]>([]);
  const s = norm(q.trim());
  const L = useMemo(() => PATROL_CARS.filter(([k, n]) => (!s || norm(n + " " + k).includes(s)) && (!t || carType(k, n) === t)), [s, t]);
  const tog = (k: string) => setSel(x => (x.includes(k) ? x.filter(y => y !== k) : [...x, k]));
  const close = () => { setSel([]); setQ(""); setT(""); onClose(); };
  const card = (k: string, n: string) => { const ya = have.includes(k), on = sel.includes(k); return (
    <button key={k} disabled={ya} onClick={() => tog(k)} title={k}
      className={cn("group relative flex items-center gap-3 rounded-xl border p-3 text-left transition", ya ? "cursor-default border-slate-200 opacity-50 dark:border-slate-800"
        : on ? "border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-500 dark:bg-brand-500/10" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>{on || ya ? <Check className="size-5" /> : <Car className="size-5" />}</span>
      <span className="min-w-0"><b className="block truncate text-sm">{n}</b><span className="block truncate text-[11px] text-slate-400">{carType(k, n)} · <span className="font-mono">{k}</span>{ya ? " · ya agregado" : ""}</span></span>
    </button>); };
  return (
    <Modal open={open} onClose={close} title="Agregar patrullas" desc={`Elegí uno o varios patrullas revisados a ${who}.`} icon={<Car />} size="xl"
      footer={<><span className="mr-auto text-xs text-slate-500">{sel.length ? `${sel.length} seleccionado${sel.length > 1 ? "s" : ""}` : "Tocá los patrullas para elegirlos"}</span>
        <Button variant="ghost" onClick={close}>Cancelar</Button><Button icon={<Plus />} disabled={!sel.length} onClick={() => { onAdd(sel); close(); }}>Agregar{sel.length ? ` (${sel.length})` : ""}</Button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input autoFocus className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar modelo o código (ej: scout, buffalo, polbuff)…" /></div>
          <div className="flex flex-wrap gap-1">{["", ...CAR_TYPES].map(x => (
            <button key={x} onClick={() => setT(x)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", t === x ? "border-brand-500 bg-brand-600 text-white" : "border-slate-200 text-slate-500 hover:border-brand-300 dark:border-slate-700")}>{x || "Todos"}</button>))}</div>
        </div>
        {!s && !t && top.length > 0 && <div><p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Star className="size-3" />Los más revisados</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{top.map(k => { const c = PATROL_CARS.find(x => x[0] === k); return c ? card(c[0], c[1]) : null; })}</div></div>}
        {(s || t ? [t || "Resultados"] : CAR_TYPES).map(g => { const G = s || t ? L : L.filter(([k, n]) => carType(k, n) === g); return G.length ? (
          <div key={g}><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g} · {G.length}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{G.map(([k, n]) => card(k, n))}</div></div>) : null; })}
        {!L.length && <p className="py-8 text-center text-sm text-slate-400">Ningún patrulla coincide.</p>}
      </div>
    </Modal>
  );
}
