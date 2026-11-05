import { useMemo, useRef, useState } from "react";
import { Car, Package, CheckCheck, Trash2, Save, X, Camera, ClipboardList, Pencil, ImagePlus, FileText, Copy, ArrowRight, UserPlus } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { Lightbox, Modal } from "@/components/modal";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { findAgent as getAgent, lvl, rankES, uid } from "@/lib/domain";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { goTo } from "@/lib/profiles";
import { VEH, VST, delPhotos, dmy, getEq, missOf, patReport, pfoto, readImg, vcount, type Cell, type PHist, type Patrol, type PRow } from "@/lib/patrol";
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
      {list.slice(0, 4).map((d, i) => <button key={i} onClick={() => setLb(i)} className="overflow-hidden rounded-md ring-1 ring-slate-200 transition hover:ring-brand-400 dark:ring-slate-700"><img src={d} alt="" className="size-9 object-cover" /></button>)}
      {list.length > 4 && <button onClick={() => setLb(4)} className="grid size-9 place-items-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-slate-800">+{list.length - 4}</button>}
      {lb !== null && <Lightbox list={list} i={lb} cap={cap} onClose={() => setLb(null)} onNav={setLb} />}
    </div>
  );
}

export function Patrullas() {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [PAT, setPAT] = useJSON<Patrol>("lspdt.patrol", newPat());
  const [HIST, setHIST] = useJSON<PHist[]>("lspdt.patHist", []);
  const [nota, setNota] = useState(""), [eqOpen, setEqOpen] = useState(false), [miss, setMiss] = useState<{ i: number; k: string } | null>(null);
  const EQ = getEq();
  const save = (fn: (p: Patrol) => void) => { const x = structuredClone(PAT); fn(x); setPAT(x); };
  const cnt = (s: string) => vcount(PAT.rows, s);
  const by = `${rankES(me.r)} ${me.n}`;
  const report = useMemo(() => (PAT.rows.length ? patReport({ ...PAT, nota: nota.trim() }, `${me.r} ${me.n}`) : ""), [PAT, nota, me.r, me.n]);
  const setCell = (i: number, k: string, s: Cell["s"]) => { save(p => { p.rows[i].v[k] = { ...(p.rows[i].v[k] || {}), s }; }); if (s === "no") setMiss({ i, k }); };
  const discard = async () => { if (PAT.rows.length && !(await confirm("¿Descartar la revisión en curso sin guardarla?", { danger: true, ok: "Descartar" }))) return; delPhotos(PAT.rows); setPAT(newPat()); setNota(""); };
  const store = async () => {
    if (!PAT.rows.length) { toast("Agregá al menos un agente a la revisión", "err"); return; }
    const pend = cnt(""); if (pend && !(await confirm(`Quedan ${pend} vehículos sin revisar. ¿Guardar igual?`))) return;
    setHIST([{ id: uid(), fecha: PAT.fecha, t: Date.now(), por: { n: me.n, r: me.r }, nota: nota.trim(), rows: structuredClone(PAT.rows) }, ...HIST]);
    setPAT(newPat()); setNota(""); toast("Revisión guardada en el registro y en el perfil de cada agente.");
  };
  const last = HIST[0];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<UserPlus />} title="Agregar agentes" desc="Agentes por debajo de Sargento II · clic para sumarlo a la revisión." />
          <CardBody>
            <AgentPicker value="" onChange={n => { const a = getAgent(n); if (!a) return; save(p => { p.rows.push({ n: a.n, r: a.r, p: a.p, v: {} }); }); toast(a.n + " agregado"); }}
              filter={a => lvl(a.r) > 0 && lvl(a.r) < 7 && !PAT.rows.some(r => r.n === a.n)} empty="Sin resultados o ya agregado a la revisión" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Car />} title="Revisión en curso" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha"><Input type="date" value={PAT.fecha} onChange={e => save(p => { p.fecha = e.target.value; })} /></Field>
              <Field label="Revisado por"><Input value={by} readOnly className="text-slate-500" /></Field>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([[PAT.rows.length, "Agentes", ""], [cnt("ok"), "Preparados", "text-emerald-600 dark:text-emerald-400"], [cnt("no"), "No preparados", "text-red-600 dark:text-red-400"], [cnt(""), "Sin revisar", "text-amber-600 dark:text-amber-400"]] as const).map(([n, k, c]) => (
                <div key={k} className="rounded-xl bg-slate-50 py-2 dark:bg-slate-800/50"><p className={cn("text-lg font-bold tabular-nums", c)}>{n}</p><p className="text-[10.5px] text-slate-500">{k}</p></div>))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={<Package />} onClick={() => setEqOpen(true)}>Equipamiento requerido</Button>
              <Button variant="outline" size="sm" icon={<CheckCheck />} disabled={!cnt("")} onClick={() => { save(p => p.rows.forEach(r => VEH.forEach(([k]) => { if ((r.v[k]?.s || "") === "") r.v[k] = { s: "ok" }; }))); toast("Los vehículos sin revisar quedaron como preparados"); }}>Marcar todo como preparado</Button>
              <Button variant="ghost" size="sm" icon={<Trash2 />} disabled={!PAT.rows.length} onClick={discard}>Descartar</Button>
            </div>
            <Field label="Notas internas" hint="(opcional)"><Textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Observaciones generales del control…" /></Field>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {!PAT.rows.length ? <p className="px-6 py-12 text-center text-sm text-slate-400">Todavía no agregaste agentes. Elegilos de la lista de arriba.</p> : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 font-semibold">Agente</th>{VEH.map(([k, n]) => <th key={k} className="px-3 py-3 font-semibold">{n}</th>)}<th className="w-10" /></tr></thead>
              <tbody>{PAT.rows.map((r, i) => (
                <tr key={r.n} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800/70">
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar n={r.n} size={30} /><div><p className="font-semibold">{r.n}</p><div className="mt-0.5 flex items-center gap-1.5"><RankBadge r={r.r} />{r.p && <span className="font-mono text-[11px] text-slate-400">#{r.p}</span>}</div></div></div></td>
                  {VEH.map(([k, vn]) => { const c = r.v[k] || { s: "" }, ms = missOf(c); return (
                    <td key={k} className="px-3 py-3">
                      <select value={c.s} onChange={e => setCell(i, k, e.target.value as Cell["s"])} aria-label={`${vn} de ${r.n}`}
                        className={cn("h-8 w-full rounded-lg border px-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500", ST_CLS[c.s])}>
                        {Object.entries(VST).map(([v, l]) => <option key={v} value={v} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">{v ? l : "— Sin revisar"}</option>)}
                      </select>
                      {c.s === "no" && <button onClick={() => setMiss({ i, k })} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-300"><Pencil className="size-3" />Qué falta{ms.length ? ` (${ms.length})` : ""}</button>}
                      {c.s === "ok" && <button onClick={() => setMiss({ i, k })} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-300"><Camera className="size-3" />Fotos{c.f?.length ? ` (${c.f.length})` : ""}</button>}
                      {ms.length > 0 && <p className="mt-1 text-[11px] leading-snug text-red-600 dark:text-red-400">{ms.join(" · ")}</p>}
                      <Thumbs ids={c.f} cap={`${r.n} · ${vn}`} />
                    </td>); })}
                  <td className="py-3 pr-3"><button aria-label="Quitar de la revisión" onClick={() => { delPhotos([r]); save(p => { p.rows.splice(i, 1); }); }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><X className="size-4" /></button></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
        {PAT.rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="mr-auto text-xs text-slate-500"><b className="text-slate-700 dark:text-slate-200">{PAT.rows.length}</b> {PAT.rows.length === 1 ? "agente" : "agentes"} en revisión · {cnt("") ? <span className="text-amber-600 dark:text-amber-400">{cnt("")} sin revisar</span> : "todo revisado"}</p>
            <Button variant="ghost" onClick={discard}>Descartar</Button><Button icon={<Save />} onClick={store}>Guardar revisión</Button>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader icon={<FileText />} title="Resumen para enviar" action={<Button size="sm" icon={<Copy />} disabled={!report} onClick={() => copy(report)}>Copiar</Button>} />
          <CardBody><textarea readOnly value={report} placeholder="Se completa a medida que revisás." className="scrollbar-thin min-h-[12rem] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[12.5px] leading-relaxed outline-none dark:border-slate-800 dark:bg-slate-950/60" /></CardBody>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <div className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><ClipboardList className="size-5" /></div>
          <p className="mt-3 font-semibold">Registro de patrullas</p>
          <p className="mt-1 text-xs text-slate-500">{HIST.length ? <><b>{HIST.length}</b> {HIST.length === 1 ? "revisión guardada" : "revisiones guardadas"} · última {dmy(last.fecha)} por {rankES(last.por.r)} {last.por.n}</> : "Todavía no hay revisiones guardadas."}</p>
          <Button className="mt-4" variant="secondary" size="sm" icon={<ArrowRight />} onClick={() => goTo("sup", "preg")}>Ver registro completo</Button>
        </Card>
      </div>

      <Modal open={eqOpen} onClose={() => setEqOpen(false)} title="Equipamiento requerido" icon={<Package />} size="lg" desc="Lo define Capitanía en «Equipamiento de patrullas».">
        <div className="grid gap-3 sm:grid-cols-2">{VEH.map(([k, n]) => (
          <div key={k} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="mb-2 font-semibold">{n}</p>
            {EQ[k].length ? EQ[k].map(x => <div key={x.n} className="flex justify-between border-t border-slate-100 py-1.5 text-sm first:border-0 dark:border-slate-800"><span>{x.n}</span><span className="font-mono text-slate-400">×{x.q}</span></div>) : <p className="text-xs text-slate-400">Sin ítems</p>}</div>))}</div>
      </Modal>
      {miss && <MissModal key={`${miss.i}${miss.k}`} row={PAT.rows[miss.i]} k={miss.k} items={EQ[miss.k]} onClose={() => setMiss(null)}
        onSave={c => { const was = PAT.rows[miss.i].v[miss.k]?.s; save(p => { p.rows[miss.i].v[miss.k] = c; }); setMiss(null);
          if (c.s === "ok") toast(was === "ok" ? (c.f?.length ? "Fotos guardadas" : "Cambios guardados") : "No falta nada: el vehículo quedó como preparado"); }} />}
    </div>
  );
}

function MissModal({ row, k, items, onClose, onSave }: { row: PRow; k: string; items: { n: string; q: number }[]; onClose: () => void; onSave: (c: Cell) => void }) {
  const c = row.v[k] || { s: "" }, vn = VEH.find(v => v[0] === k)![1];
  const [h, setH] = useState<Record<string, number>>(() => Object.fromEntries(items.map(it => { const m = (c.m || []).find(x => typeof x !== "string" && x.n === it.n) as { h: number } | undefined; return [it.n, m ? m.h : it.q]; })));
  const [otro, setOtro] = useState(c.o || ""), [ph, setPh] = useState<{ id?: string; d: string }[]>(() => (c.f || []).filter(pfoto).map(id => ({ id, d: pfoto(id) })));
  const [lb, setLb] = useState<number | null>(null), [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = async (fs: FileList | File[]) => { const l = await Promise.all([...fs].filter(f => f.type.startsWith("image/")).map(f => readImg(f, 1600))); setPh(p => [...p, ...l.map(d => ({ d }))]); };
  const ok = () => {
    const m = items.map(it => ({ n: it.n, q: it.q, h: Math.max(0, h[it.n] ?? it.q) })).filter(x => x.h < x.q), o = otro.trim();
    const keep = new Set(ph.filter(p => p.id).map(p => p.id)); (c.f || []).forEach(id => { if (!keep.has(id)) LS.del("lspdt.pfoto." + id); });
    const f = ph.map(p => { if (p.id) return p.id; const id = uid(); LS.set("lspdt.pfoto." + id, p.d); return id; });
    onSave(!m.length && !o ? { s: "ok", f } : { s: "no", m, o, f });
  };
  return (
    <Modal open onClose={onClose} title={`Inventario · ${vn}`} desc={`${row.n} · indicá cuánto tiene de cada ítem`} icon={<Package />} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Save />} onClick={ok}>Guardar</Button></>}>
      <div className="space-y-4" onPaste={e => { const fs = [...e.clipboardData.items].filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()!).filter(Boolean); if (fs.length) { e.preventDefault(); void add(fs); } }}>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {items.length ? items.map(it => { const v = h[it.n] ?? it.q, bad = v < it.q; return (
            <div key={it.n} className={cn("flex items-center gap-3 px-3 py-2", bad && "bg-red-500/[.06]")}>
              <span className={cn("flex-1 text-sm", bad && "font-semibold text-red-700 dark:text-red-300")}>{it.n}</span>
              <span className="text-xs text-slate-400">Requerido <b className="text-slate-600 dark:text-slate-300">{it.q}</b></span>
              <Input type="number" min={0} value={v} onChange={e => setH({ ...h, [it.n]: Math.max(0, +e.target.value || 0) })} className={cn("h-8 w-20 text-center", bad && "border-red-400")} />
            </div>); }) : <p className="p-4 text-center text-sm text-slate-400">No hay equipamiento cargado para este vehículo.</p>}
        </div>
        <Field label="Otro faltante o problema" hint="(opcional)"><Input value={otro} onChange={e => setOtro(e.target.value)} placeholder="Ej: rueda de auxilio pinchada" /></Field>
        <Field label="Fotos del maletero" hint="(arrastrá, pegá con Ctrl+V o elegí)">
          <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); void add(e.dataTransfer.files); }}
            className={cn("rounded-xl border-2 border-dashed p-3 transition", over ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 dark:border-slate-700")}>
            <div className="flex flex-wrap gap-2">
              {ph.map((p, i) => (
                <div key={i} className="group relative"><button onClick={() => setLb(i)}><img src={p.d} alt="" className="size-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" /></button>
                  <button aria-label="Quitar foto" onClick={() => setPh(ph.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-red-600 text-white opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100"><X className="size-3" /></button></div>))}
              <button onClick={() => fileRef.current?.click()} className="grid size-20 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700"><ImagePlus className="size-5" /></button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) void add(e.target.files); e.target.value = ""; }} />
          </div>
        </Field>
      </div>
      {lb !== null && <Lightbox list={ph.map(p => p.d)} i={lb} cap="Fotos del maletero" onClose={() => setLb(null)} onNav={setLb} />}
    </Modal>
  );
}
