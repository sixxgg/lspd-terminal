import { useMemo, useRef, useState } from "react";
import { Car, Package, CheckCheck, Trash2, Save, X, Camera, ClipboardList, ListChecks, ImagePlus, FileText, Copy, ArrowRight, UserPlus, Check, Minus, Plus, StickyNote } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { RevButton, RevPanel, revOf } from "@/components/revisar";
import { DivNav } from "../div/DivTools";
import { RegistroPatrullas } from "./RegistroPatrullas";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { Lightbox, Modal } from "@/components/modal";
import { useCopy } from "@/components/output";
import { CarPicker } from "@/components/carpick";
import { useFeedback } from "@/components/feedback";
import { dmy, findAgent as getAgent, lvl, rankES, uid } from "@/lib/domain";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { PATROL_CARS, VST, delPhotos, eqAll, eqFor, extraOf, missOf, vName, vehOf, patReport, pfoto, readImg, vcount, type Cell, type PHist, type Patrol, type PRow } from "@/lib/patrol";
import { cn } from "@/lib/cn";

const newPat = (): Patrol => ({ fecha: new Date().toISOString().slice(0, 10), rows: [] });
export const ST_CLS: Record<string, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  no: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  na: "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  "": "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
};
export function StatusPill({ s }: { s: string }) {
  return <span className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-semibold", ST_CLS[s] || ST_CLS[""])}>{VST[s] ?? "Sin revisar"}</span>;
}
export function Thumbs({ ids, cap }: { ids?: string[]; cap: string }) {
  useStoreVersion();
  const [lb, setLb] = useState<number | null>(null);
  const list = (ids || []).map(pfoto).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {list.slice(0, 4).map((d, i) => <button key={i} onClick={() => setLb(i)} className="overflow-hidden rounded-md ring-1 ring-slate-200 transition hover:ring-brand-400 dark:ring-slate-700"><img loading="lazy" decoding="async" src={d} alt="" className="size-9 object-cover" /></button>)}
      {list.length > 4 && <button onClick={() => setLb(4)} className="grid size-9 place-items-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-slate-800">+{list.length - 4}</button>}
      {lb !== null && <Lightbox list={list} i={lb} cap={cap} onClose={() => setLb(null)} onNav={setLb} />}
    </div>
  );
}

/* Supervisores › Patrullas: Revisión (control en curso) y Registro (revisiones guardadas) en una sola sección */
export function PatrullasHub() {
  const [tab, setTab] = useState<"rev" | "reg">("rev");
  const [H] = useJSON<PHist[]>("lspdt.patHist", []);
  return (
    <div className="space-y-4">
      <DivNav value={tab} onChange={v => setTab(v as "rev" | "reg")} options={[
        { value: "rev", label: "Revisión de patrullas", icon: <ListChecks />, txt: "Revisión" },
        { value: "reg", label: `Registro de patrullas${H.length ? ` (${H.length})` : ""}`, icon: <ClipboardList />, txt: "Registro" }]} />
      {tab === "rev" ? <Patrullas onReg={() => setTab("reg")} /> : <RegistroPatrullas />}
    </div>);
}

const STS = [["ok", "Preparado", "bg-emerald-500 text-white"], ["no", "No preparado", "bg-red-500 text-white"], ["na", "N/A", "bg-slate-500 text-white"]] as const;
function Patrullas({ onReg }: { onReg?: () => void }) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [PAT, setPAT] = useJSON<Patrol>("lspdt.patrol", newPat());
  const [HIST, setHIST] = useJSON<PHist[]>("lspdt.patHist", []);
  const [rv, setRv] = useState(false), [pick, setPick] = useState<number | null>(null), [nota, setNota] = useState(""), [eqOpen, setEqOpen] = useState(false), [miss, setMiss] = useState<{ i: number; k: string } | null>(null);
  const save = (fn: (p: Patrol) => void) => { const x = structuredClone(PAT); fn(x); setPAT(x); };
  const cnt = (s: string) => vcount(PAT.rows, s);
  const by = `${rankES(me.r)} ${me.n}`;
  const report = useMemo(() => (PAT.rows.length ? patReport({ ...PAT, nota: nota.trim() }, `${me.r} ${me.n}`) : ""), [PAT, nota, me.r, me.n]);
  const setCell = (i: number, k: string, s: Cell["s"]) => { const cur = PAT.rows[i].v[k]?.s || ""; const v = cur === s ? "" : s;
    save(p => { p.rows[i].v[k] = { ...(p.rows[i].v[k] || {}), s: v, by: me.n }; }); if (v === "no") setMiss({ i, k }); };
  const addVeh = (i: number, ks: string[]) => save(p => { ks.forEach(k => { if (!p.rows[i].v[k]) p.rows[i].v[k] = { s: "" }; }); });
  const delVeh = (i: number, k: string) => { (PAT.rows[i].v[k]?.f || []).forEach(id => LS.del("lspdt.pfoto." + id)); save(p => { delete p.rows[i].v[k]; }); };
  const discard = async () => { if (PAT.rows.length && !(await confirm("¿Descartar la revisión en curso sin guardarla?", { danger: true, ok: "Descartar" }))) return; delPhotos(PAT.rows); setPAT(newPat()); setNota(""); };
  const store = async () => {
    if (!PAT.rows.length) { toast("Agregá al menos un agente a la revisión", "err"); return; }
    const pend = cnt(""); if (pend && !(await confirm(`Quedan ${pend} vehículos sin revisar. ¿Guardar igual?`))) return;
    setHIST([{ id: uid(), fecha: PAT.fecha, t: Date.now(), por: { n: me.n, r: me.r }, nota: nota.trim(), rows: structuredClone(PAT.rows) }, ...HIST]);
    setPAT(newPat()); setNota(""); toast("Revisión guardada en el registro y en el perfil de cada agente.");
  };
  const last = HIST[0];
  /* los patrullas que más se revisaron (para tenerlos a mano en el selector) */
  const topCars = useMemo(() => { const c: Record<string, number> = {}; HIST.slice(0, 40).forEach(h => h.rows.forEach(r => vehOf(r).forEach(k => { if (PATROL_CARS.some(x => x[0] === k)) c[k] = (c[k] || 0) + 1; })));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]); }, [HIST]);
  /* revisar: sin agentes o sin patrullas = falta; sin revisar o sin checklist = pendiente */
  const need = [!PAT.rows.length && "agregar al menos un agente", ...PAT.rows.filter(r => !vehOf(r).length).map(r => `patrullas de ${r.n}`)].filter(Boolean) as string[];
  const pen = PAT.rows.flatMap(r => vehOf(r).flatMap(k => { const c = r.v[k] || { s: "" }; return !c.s ? [`${vName(k)} de ${r.n} sin revisar`] : c.s !== "na" && !c.ck ? [`checklist de ${vName(k)} (${r.n})`] : []; }));
  const stat = ([[PAT.rows.length, "Agentes", "text-slate-700 dark:text-slate-200"], [cnt("ok"), "Preparados", "text-emerald-600 dark:text-emerald-400"], [cnt("no"), "No preparados", "text-red-600 dark:text-red-400"], [cnt(""), "Sin revisar", "text-amber-600 dark:text-amber-400"]] as const);
  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[15rem] flex-[2]"><p className="mb-1 text-[11px] font-semibold text-slate-500">Agregar agente <span className="font-normal text-slate-400">· por debajo de Sargento II</span></p>
            <AgentPicker value="" onChange={n => { const a = getAgent(n); if (!a) return; save(p => { p.rows.push({ n: a.n, r: a.r, p: a.p, v: {} }); }); toast(a.n + " agregado"); }}
              filter={a => lvl(a.r) > 0 && lvl(a.r) < 7 && !PAT.rows.some(r => r.n === a.n)} empty="Sin resultados o ya agregado a la revisión" /></div>
          <div className="w-40"><p className="mb-1 text-[11px] font-semibold text-slate-500">Fecha</p><Input type="date" value={PAT.fecha} onChange={e => save(p => { p.fecha = e.target.value; })} /></div>
          <div className="flex flex-wrap gap-1.5">{stat.map(([n, k, c]) => <div key={k} className="rounded-lg border border-slate-200 px-2.5 py-1 text-center dark:border-slate-800"><p className={cn("text-[15px] font-bold leading-tight tabular-nums", c)}>{n}</p><p className="text-[10px] text-slate-500">{k}</p></div>)}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="mr-auto text-[11.5px] text-slate-500">Revisa: <b className="text-slate-700 dark:text-slate-200">{by}</b>{last && <> · última guardada {dmy(last.fecha)} por {last.por.n}</>}</span>
          <Button variant="outline" size="sm" icon={<Package />} onClick={() => setEqOpen(true)}>Equipamiento</Button>
          <Button variant="outline" size="sm" icon={<CheckCheck />} disabled={!cnt("")} onClick={() => { save(p => p.rows.forEach(r => vehOf(r).forEach(k => { if ((r.v[k]?.s || "") === "") r.v[k] = { ...r.v[k], s: "ok", by: me.n }; }))); toast("Los patrullas sin revisar quedaron como preparados"); }}>Todo preparado</Button>
          {onReg && <Button variant="ghost" size="sm" icon={<ArrowRight />} onClick={onReg}>Registro ({HIST.length})</Button>}
        </div>
      </Card>

      {!PAT.rows.length ? <Card className="px-6 py-10 text-center text-sm text-slate-400"><UserPlus className="mx-auto mb-2 size-6 opacity-60" />Todavía no agregaste agentes. Buscalos arriba en «Agregar agente».</Card> : (
        <div className="space-y-2">{PAT.rows.map((r, i) => (
          <Card key={r.n} className="flex flex-col gap-3 p-3 md:flex-row md:items-start">
            <div className="flex w-full items-center gap-2.5 md:w-52 md:shrink-0">
              <Avatar n={r.n} size={30} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.n}</p><div className="mt-0.5 flex items-center gap-1.5"><RankBadge r={r.r} />{r.p && <span className="font-mono text-[11px] text-slate-400">#{r.p}</span>}</div></div>
              <button aria-label="Quitar de la revisión" onClick={() => { delPhotos([r]); save(p => { p.rows.splice(i, 1); }); }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 md:hidden dark:hover:bg-red-500/10"><X className="size-4" /></button>
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {vehOf(r).map(k => <VehTile key={k} k={k} c={r.v[k] || { s: "" }} who={r.n} onSet={s => setCell(i, k, s)} onCk={() => setMiss({ i, k })} onDel={() => delVeh(i, k)} />)}
              <button onClick={() => setPick(i)} className="flex min-h-[3.25rem] items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600 dark:border-slate-700 dark:hover:bg-brand-500/5">
                <Car className="size-4" />{vehOf(r).length ? "Agregar patrulla" : "Elegir patrullas"}</button>
            </div>
            <button aria-label="Quitar de la revisión" onClick={() => { delPhotos([r]); save(p => { p.rows.splice(i, 1); }); }} className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 md:block dark:hover:bg-red-500/10"><X className="size-4" /></button>
          </Card>))}
        </div>)}

      {PAT.rows.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <FileText className="size-4 text-brand-600 dark:text-brand-300" /><p className="mr-auto text-sm font-semibold">Resumen para enviar</p>
            <RevButton r={revOf("", need, pen)} open={rv} onClick={() => setRv(!rv)} />
          </div>
          {rv && <RevPanel r={revOf("", need, pen)} onClose={() => setRv(false)} className="mx-4 mt-3" />}
          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <textarea readOnly value={report} className="scrollbar-thin h-40 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[12px] leading-relaxed outline-none dark:border-slate-800 dark:bg-slate-950/60" />
            <div className="flex flex-col gap-2"><Textarea rows={3} value={nota} onChange={e => setNota(e.target.value)} placeholder="Notas internas (opcional)…" className="flex-1" />
              <p className="text-[11px] text-slate-500">{cnt("") ? <span className="text-amber-600 dark:text-amber-400">{cnt("")} sin revisar</span> : "Todo revisado"} · {PAT.rows.length} {PAT.rows.length === 1 ? "agente" : "agentes"}</p></div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={discard}>Descartar</Button>
            <Button variant="outline" size="sm" icon={<Copy />} onClick={() => copy(report)}>Copiar</Button>
            <Button size="sm" icon={<Save />} onClick={store}>Guardar revisión</Button>
          </div>
        </Card>)}

      <Modal open={eqOpen} onClose={() => setEqOpen(false)} title="Equipamiento requerido" icon={<Package />} size="md" desc="Lo define Capitanía en «Equipamiento de patrullas». Es el mismo para todos los patrullas.">
        {eqAll().length ? <div className="grid gap-x-4 sm:grid-cols-2">{eqAll().map(x => <div key={x.n} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-[13px] dark:border-slate-800"><span>{x.n}</span><span className="rounded-md bg-brand-500/10 px-1.5 font-mono text-xs font-bold text-brand-600 dark:text-brand-300">×{x.q}</span></div>)}</div> : <p className="text-xs text-slate-400">Sin ítems</p>}
      </Modal>
      {pick !== null && PAT.rows[pick] && <CarPicker open onClose={() => setPick(null)} who={PAT.rows[pick].n} have={vehOf(PAT.rows[pick])} top={topCars} onAdd={ks => addVeh(pick, ks)} />}
      {miss && <MissModal key={`${miss.i}${miss.k}`} row={PAT.rows[miss.i]} k={miss.k} items={eqFor(miss.k)} onClose={() => setMiss(null)}
        onSave={c => { save(p => { p.rows[miss.i].v[miss.k] = { ...c, by: me.n }; }); setMiss(null);
          toast(c.s === "ok" ? (c.x?.length ? `Todo correcto · con excedente: ${extraOf(c).join(", ")}` : "Todo correcto: el vehículo quedó como preparado") : `No preparado · falta: ${missOf(c).join(", ")}`, c.s === "ok" ? undefined : "err"); }} />}
    </div>
  );
}

/* tarjeta de un patrulla en la revisión: estado en 3 botones, checklist y lo que falta o sobra */
function VehTile({ k, c, who, onSet, onCk, onDel }: { k: string; c: Cell; who: string; onSet: (s: Cell["s"]) => void; onCk: () => void; onDel: () => void }) {
  const ms = missOf(c), ex = extraOf(c), vn = vName(k);
  return (
    <div className={cn("rounded-xl border p-2", c.s === "ok" ? "border-emerald-500/35 bg-emerald-500/[.04]" : c.s === "no" ? "border-red-500/35 bg-red-500/[.04]" : "border-slate-200 dark:border-slate-800")}>
      <div className="flex items-center gap-1.5"><Car className="size-3.5 shrink-0 text-slate-400" /><p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold" title={k}>{vn}</p>
        <button aria-label={`Quitar ${vn}`} onClick={onDel} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X className="size-3.5" /></button></div>
      <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label={`${vn} de ${who}`}>
        {STS.map(([s, l, on]) => <button key={s} role="radio" aria-checked={c.s === s} onClick={() => onSet(s)} className={cn("h-7 flex-1 rounded-md border text-[11px] font-semibold transition", c.s === s ? cn(on, "border-transparent") : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800")}>{l}</button>)}
      </div>
      {c.s !== "na" && <button onClick={onCk} className={cn("mt-1.5 flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-[11px] font-semibold transition hover:bg-slate-100 dark:hover:bg-slate-800", ms.length ? "text-red-600 dark:text-red-400" : c.ck ? "text-emerald-600 dark:text-emerald-400" : "text-brand-600 dark:text-brand-300")}>
        <ListChecks className="size-3 shrink-0" /><span className="flex-1">{!c.ck ? "Hacer checklist" : ms.length ? `Falta ${ms.length} ${ms.length === 1 ? "ítem" : "ítems"}` : "Checklist: todo correcto"}</span>{c.f?.length ? <span className="inline-flex items-center gap-0.5 text-slate-400"><Camera className="size-3" />{c.f.length}</span> : null}</button>}
      {ms.length > 0 && <p title={ms.join("\n")} className="mt-0.5 line-clamp-2 px-1 text-[10.5px] leading-snug text-red-600 dark:text-red-400">Falta: {ms.join(" · ")}</p>}
      {ex.length > 0 && <p title={ex.join("\n")} className="mt-0.5 line-clamp-2 px-1 text-[10.5px] leading-snug text-amber-700 dark:text-amber-300">De más: {ex.join(" · ")}</p>}
      <Thumbs ids={c.f} cap={`${who} · ${vn}`} />
    </div>);
}

function MissModal({ row, k, items, onClose, onSave }: { row: PRow; k: string; items: { n: string; q: number }[]; onClose: () => void; onSave: (c: Cell) => void }) {
  const c = row.v[k] || { s: "" }, vn = vName(k);
  /* cantidad inicial: lo que se cargó antes (faltante o excedente); si nunca se hizo el checklist, vacío (o completo si ya estaba como preparado) */
  const start = (it: { n: string; q: number }): number | null => { const m = (c.m || []).find(x => typeof x !== "string" && x.n === it.n) as { h: number } | undefined, e = (c.x || []).find(x => x.n === it.n);
    return m ? m.h : e ? e.h : c.ck || c.s === "ok" ? it.q : null; };
  const [h, setH] = useState<Record<string, number | null>>(() => Object.fromEntries(items.map(it => [it.n, start(it)])));
  const [io, setIo] = useState<Record<string, string>>(() => ({ ...(c.io || {}) })), [noteOn, setNoteOn] = useState<string | null>(null);
  const [otro, setOtro] = useState(c.o || ""), [ph, setPh] = useState<{ id?: string; d: string }[]>(() => (c.f || []).filter(pfoto).map(id => ({ id, d: pfoto(id) })));
  const [lb, setLb] = useState<number | null>(null), [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = async (fs: FileList | File[]) => { const l = await Promise.all([...fs].filter(f => f.type.startsWith("image/")).map(f => readImg(f, 1600))); setPh(p => [...p, ...l.map(d => ({ d }))]); };
  const st = (it: { n: string; q: number }) => { const v = h[it.n]; return v == null ? "pen" : v < it.q ? "no" : v > it.q ? "ex" : "ok"; };
  const N = { ok: 0, no: 0, ex: 0, pen: 0 } as Record<string, number>; items.forEach(it => N[st(it)]++);
  const falt = items.reduce((a, it) => a + Math.max(0, it.q - (h[it.n] ?? it.q)), 0), sob = items.reduce((a, it) => a + Math.max(0, (h[it.n] ?? 0) - it.q), 0);
  const setQ = (n: string, v: number | null) => setH(x => ({ ...x, [n]: v == null ? null : Math.max(0, v) }));
  const ok = () => {
    /* lo que no se tocó se toma como completo */
    const val = (it: { n: string; q: number }) => h[it.n] ?? it.q, note = (n: string) => (io[n]?.trim() ? { o: io[n].trim() } : {});
    const m = items.filter(it => val(it) < it.q).map(it => ({ n: it.n, q: it.q, h: val(it), ...note(it.n) })), x = items.filter(it => val(it) > it.q).map(it => ({ n: it.n, q: it.q, h: val(it) })), o = otro.trim();
    const keep = new Set(ph.filter(p => p.id).map(p => p.id)); (c.f || []).forEach(id => { if (!keep.has(id)) LS.del("lspdt.pfoto." + id); });
    const f = ph.map(p => { if (p.id) return p.id; const id = uid(); LS.set("lspdt.pfoto." + id, p.d); return id; });
    const notes = Object.fromEntries(Object.entries(io).map(([a, b]) => [a, b.trim()]).filter(([, b]) => b));
    onSave(!m.length && !o ? { s: "ok", x, f, io: notes, ck: true, by: c.by } : { s: "no", m, x, o, f, io: notes, ck: true, by: c.by });
  };
  const pct = items.length ? Math.round(((N.ok + N.ex) * 100) / items.length) : 0;
  const BADGE = { ok: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", no: "bg-red-500/12 text-red-700 dark:text-red-300", ex: "bg-amber-500/15 text-amber-800 dark:text-amber-300", pen: "bg-slate-500/10 text-slate-500" } as const;
  return (
    <Modal open onClose={onClose} title={`Checklist · ${vn}`} desc={<span className="inline-flex items-center gap-1.5"><Avatar n={row.n} size={18} />{row.n} · contá lo que hay en el maletero</span>} icon={<ListChecks />} size="xl"
      footer={<><span className="mr-auto flex flex-wrap gap-x-3 text-xs text-slate-500">
        <span><b className="text-emerald-600 dark:text-emerald-400">{N.ok + N.ex}</b>/{items.length} correctos</span>
        {falt > 0 && <span>faltan <b className="text-red-600 dark:text-red-400">{falt}</b></span>}{sob > 0 && <span>sobran <b className="text-amber-600 dark:text-amber-400">{sob}</b></span>}{N.pen > 0 && <span>{N.pen} sin contar (se toman completos)</span>}</span>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Save />} onClick={ok}>Guardar</Button></>}>
      <div className="space-y-3" onPaste={e => { const fs = [...e.clipboardData.items].filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()!).filter(Boolean); if (fs.length) { e.preventDefault(); void add(fs); } }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={cn("h-full rounded-full transition-all", N.no ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} /></div>
          <Button size="sm" variant="outline" icon={<CheckCheck />} onClick={() => setH(Object.fromEntries(items.map(it => [it.n, it.q])))}>Todo correcto</Button>
          <Button size="sm" variant="ghost" icon={<X />} onClick={() => setH(Object.fromEntries(items.map(it => [it.n, 0])))}>Todo en 0</Button>
        </div>
        {items.length ? <div className="grid gap-1.5 md:grid-cols-2">{items.map(it => { const v = h[it.n], s = st(it), d = (v ?? it.q) - it.q; return (
          <div key={it.n} className={cn("rounded-xl border px-2.5 py-1.5 transition", s === "no" ? "border-red-500/40" : s === "ex" ? "border-amber-500/45" : s === "ok" ? "border-emerald-500/35" : "border-slate-200 dark:border-slate-800")}>
            <div className="flex items-center gap-2">
              <button aria-label={`${it.n} correcto`} onClick={() => setQ(it.n, s === "ok" ? null : it.q)} className={cn("grid size-6 shrink-0 place-items-center rounded-md border transition", s === "ok" || s === "ex" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 dark:border-slate-600")}><Check className="size-3.5" /></button>
              <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-tight" title={it.n}>{it.n}</p>
              <div className="flex shrink-0 items-center rounded-lg border border-slate-200 dark:border-slate-700">
                <button aria-label="Menos" onClick={() => setQ(it.n, (v ?? it.q) - 1)} className="grid size-7 place-items-center text-slate-500 hover:text-slate-900 dark:hover:text-white"><Minus className="size-3" /></button>
                <input type="number" min={0} value={v ?? ""} placeholder={String(it.q)} aria-label={`Cantidad de ${it.n}`} onFocus={e => e.target.select()} onChange={e => setQ(it.n, e.target.value === "" ? null : +e.target.value || 0)}
                  className="h-7 w-9 bg-transparent text-center text-[13px] font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-slate-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                <button aria-label="Más" onClick={() => setQ(it.n, (v ?? it.q) + 1)} className="grid size-7 place-items-center text-slate-500 hover:text-slate-900 dark:hover:text-white"><Plus className="size-3" /></button>
              </div>
              <span className="w-9 shrink-0 text-center font-mono text-[11px] text-slate-400" title="Requerido">/{it.q}</span>
              <span className={cn("w-[5.2rem] shrink-0 rounded-md px-1.5 py-0.5 text-center text-[10.5px] font-bold", BADGE[s])}>{s === "ok" ? "OK" : s === "no" ? `Falta ${-d}` : s === "ex" ? `${d} de más` : "Sin contar"}</span>
              <button aria-label="Observación" onClick={() => setNoteOn(noteOn === it.n ? null : it.n)} className={cn("grid size-6 shrink-0 place-items-center rounded-md transition hover:bg-slate-100 dark:hover:bg-slate-800", io[it.n] ? "text-amber-500" : "text-slate-400")}><StickyNote className="size-3.5" /></button>
            </div>
            {(noteOn === it.n || io[it.n]) && <Input autoFocus={noteOn === it.n} value={io[it.n] || ""} onChange={e => setIo({ ...io, [it.n]: e.target.value })} placeholder="Observación…" className="mt-1.5 h-7 text-xs" />}
          </div>); })}</div>
          : <p className="rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-800">No hay equipamiento cargado para este vehículo (lo define Capitanía).</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Otro faltante o problema" hint="(opcional)"><Input value={otro} onChange={e => setOtro(e.target.value)} placeholder="Ej: rueda de auxilio pinchada" /></Field>
          <Field label="Fotos del maletero" hint="(arrastrá, pegá o elegí)">
            <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); void add(e.dataTransfer.files); }}
              className={cn("flex flex-wrap gap-1.5 rounded-xl border border-dashed p-1.5 transition", over ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 dark:border-slate-700")}>
              {ph.map((p, i) => (
                <div key={i} className="group relative"><button onClick={() => setLb(i)}><img loading="lazy" decoding="async" src={p.d} alt="" className="size-12 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" /></button>
                  <button aria-label="Quitar foto" onClick={() => setPh(ph.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-red-600 text-white opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100"><X className="size-3" /></button></div>))}
              <button onClick={() => fileRef.current?.click()} className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs text-slate-400 transition hover:text-brand-600"><ImagePlus className="size-4" />{ph.length ? "" : "Agregar fotos"}</button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) void add(e.target.files); e.target.value = ""; }} />
            </div>
          </Field>
        </div>
      </div>
      {lb !== null && <Lightbox list={ph.map(p => p.d)} i={lb} cap="Fotos del maletero" onClose={() => setLb(null)} onNav={setLb} />}
    </Modal>
  );
}
