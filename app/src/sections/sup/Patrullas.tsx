import { useMemo, useRef, useState } from "react";
import { Car, Package, CheckCheck, Trash2, Save, X, Camera, ClipboardList, ListChecks, ImagePlus, FileText, Copy, ArrowRight, UserPlus } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { Lightbox, Modal } from "@/components/modal";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { findAgent as getAgent, lvl, rankES, uid } from "@/lib/domain";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { goTo } from "@/lib/profiles";
import { PATROL_CARS, VST, delPhotos, dmy, eqAll, eqFor, missOf, vName, vehOf, patReport, pfoto, readImg, vcount, type Cell, type PHist, type Patrol, type PRow } from "@/lib/patrol";
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

export function Patrullas() {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [PAT, setPAT] = useJSON<Patrol>("lspdt.patrol", newPat());
  const [HIST, setHIST] = useJSON<PHist[]>("lspdt.patHist", []);
  const [nota, setNota] = useState(""), [eqOpen, setEqOpen] = useState(false), [miss, setMiss] = useState<{ i: number; k: string } | null>(null);
  const save = (fn: (p: Patrol) => void) => { const x = structuredClone(PAT); fn(x); setPAT(x); };
  const cnt = (s: string) => vcount(PAT.rows, s);
  const by = `${rankES(me.r)} ${me.n}`;
  const report = useMemo(() => (PAT.rows.length ? patReport({ ...PAT, nota: nota.trim() }, `${me.r} ${me.n}`) : ""), [PAT, nota, me.r, me.n]);
  const setCell = (i: number, k: string, s: Cell["s"]) => { save(p => { p.rows[i].v[k] = { ...(p.rows[i].v[k] || {}), s, by: me.n }; }); if (s === "no") setMiss({ i, k }); };
  const addVeh = (i: number, k: string) => { if (k) save(p => { p.rows[i].v[k] = { s: "" }; }); };
  const delVeh = (i: number, k: string) => { (PAT.rows[i].v[k]?.f || []).forEach(id => LS.del("lspdt.pfoto." + id)); save(p => { delete p.rows[i].v[k]; }); };
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
              <Button variant="outline" size="sm" icon={<CheckCheck />} disabled={!cnt("")} onClick={() => { save(p => p.rows.forEach(r => vehOf(r).forEach(k => { if ((r.v[k]?.s || "") === "") r.v[k] = { ...r.v[k], s: "ok", by: me.n }; }))); toast("Los patrullas sin revisar quedaron como preparados"); }}>Marcar todo como preparado</Button>
              <Button variant="ghost" size="sm" icon={<Trash2 />} disabled={!PAT.rows.length} onClick={discard}>Descartar</Button>
            </div>
            <Field label="Notas internas" hint="(opcional)"><Textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Observaciones generales del control…" /></Field>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {!PAT.rows.length ? <p className="px-6 py-12 text-center text-sm text-slate-400">Todavía no agregaste agentes. Elegilos de la lista de arriba.</p> : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="w-56 px-4 py-3 font-semibold">Agente</th><th className="px-3 py-3 font-semibold">Patrullas revisados</th><th className="w-10" /></tr></thead>
              <tbody>{PAT.rows.map((r, i) => (
                <tr key={r.n} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800/70">
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar n={r.n} size={30} /><div><p className="font-semibold">{r.n}</p><div className="mt-0.5 flex items-center gap-1.5"><RankBadge r={r.r} />{r.p && <span className="font-mono text-[11px] text-slate-400">#{r.p}</span>}</div></div></div></td>
                  <td className="px-3 py-3"><div className="flex flex-wrap items-start gap-2">
                    {vehOf(r).map(k => { const c = r.v[k] || { s: "" }, ms = missOf(c), vn = vName(k); return (
                      <div key={k} className="w-[15.5rem] rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                        <div className="mb-1.5 flex items-start gap-1"><p className="flex-1 text-xs font-semibold leading-tight" title={k}>{vn}</p>
                          <button aria-label={`Quitar ${vn}`} onClick={() => delVeh(i, k)} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X className="size-3.5" /></button></div>
                        <select value={c.s} onChange={e => setCell(i, k, e.target.value as Cell["s"])} aria-label={`${vn} de ${r.n}`}
                          className={cn("h-8 w-full rounded-lg border px-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500", ST_CLS[c.s])}>
                          {Object.entries(VST).map(([v, l]) => <option key={v} value={v} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">{v ? l : "— Sin revisar"}</option>)}
                        </select>
                        {c.s !== "na" && <button onClick={() => setMiss({ i, k })} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-300"><ListChecks className="size-3" />{c.ck ? "Checklist" : "Hacer checklist"}{ms.length ? ` · ${ms.length} ${ms.length === 1 ? "ítem incompleto" : "ítems incompletos"}` : c.ck ? " ✓" : ""}{c.f?.length ? <><Camera className="ml-1 size-3" />{c.f.length}</> : null}</button>}
                        {ms.length > 0 && <p title={ms.join("\n")} className="mt-1 line-clamp-3 text-[11px] leading-snug text-red-600 dark:text-red-400">Falta: {ms.join(" · ")}</p>}
                        {c.by && c.s && <p className="mt-1 text-[10.5px] text-slate-400">Inspeccionó: {c.by}</p>}
                        <Thumbs ids={c.f} cap={`${r.n} · ${vn}`} />
                      </div>); })}
                    <select value="" onChange={e => addVeh(i, e.target.value)} aria-label={`Agregar patrulla a ${r.n}`}
                      className="h-9 w-[15.5rem] rounded-xl border border-dashed border-slate-300 bg-transparent px-2 text-xs font-semibold text-slate-500 outline-none hover:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700">
                      <option value="">+ Agregar patrulla…</option>{PATROL_CARS.filter(([k]) => !r.v[k]).map(([k, n]) => <option key={k} value={k} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">{n}</option>)}
                    </select>
                  </div></td>
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
          <CardHeader icon={<FileText />} title="Resumen para enviar" />
          <CardBody><textarea readOnly value={report} placeholder="Se completa a medida que revisás." className="scrollbar-thin min-h-[12rem] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[12.5px] leading-relaxed outline-none dark:border-slate-800 dark:bg-slate-950/60" />
            <div className="flex justify-end"><Button size="sm" icon={<Copy />} disabled={!report} onClick={() => copy(report)}>Copiar</Button></div></CardBody>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <div className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><ClipboardList className="size-5" /></div>
          <p className="mt-3 font-semibold">Registro de patrullas</p>
          <p className="mt-1 text-xs text-slate-500">{HIST.length ? <><b>{HIST.length}</b> {HIST.length === 1 ? "revisión guardada" : "revisiones guardadas"} · última {dmy(last.fecha)} por {rankES(last.por.r)} {last.por.n}</> : "Todavía no hay revisiones guardadas."}</p>
          <Button className="mt-4" variant="secondary" size="sm" icon={<ArrowRight />} onClick={() => goTo("sup", "preg")}>Ver registro completo</Button>
        </Card>
      </div>

      <Modal open={eqOpen} onClose={() => setEqOpen(false)} title="Equipamiento requerido" icon={<Package />} size="lg" desc="Lo define Capitanía en «Equipamiento de patrullas».">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="mb-2 font-semibold">Todos los patrullas</p>
          {eqAll().length ? eqAll().map(x => <div key={x.n} className="flex justify-between border-t border-slate-100 py-1.5 text-sm first:border-0 dark:border-slate-800"><span>{x.n}</span><span className="font-mono text-slate-400">×{x.q}</span></div>) : <p className="text-xs text-slate-400">Sin ítems</p>}</div>
      </Modal>
      {miss && <MissModal key={`${miss.i}${miss.k}`} row={PAT.rows[miss.i]} k={miss.k} items={eqFor(miss.k)} onClose={() => setMiss(null)}
        onSave={c => { const was = PAT.rows[miss.i].v[miss.k]?.s; save(p => { p.rows[miss.i].v[miss.k] = { ...c, by: me.n }; }); setMiss(null);
          if (c.s === "ok") toast(was === "ok" ? (c.f?.length ? "Fotos guardadas" : "Cambios guardados") : "No falta nada: el vehículo quedó como preparado"); }} />}
    </div>
  );
}

function MissModal({ row, k, items, onClose, onSave }: { row: PRow; k: string; items: { n: string; q: number }[]; onClose: () => void; onSave: (c: Cell) => void }) {
  const c = row.v[k] || { s: "" }, vn = vName(k);
  /* cantidad inicial: lo que se cargó antes; si nunca se hizo el checklist, 0 (o completo si ya estaba marcado como preparado) */
  const start = (it: { n: string; q: number }) => { const m = (c.m || []).find(x => typeof x !== "string" && x.n === it.n) as { h: number } | undefined;
    return m ? m.h : c.ck || c.s === "ok" ? it.q : 0; };
  const [h, setH] = useState<Record<string, number>>(() => Object.fromEntries(items.map(it => [it.n, start(it)])));
  const [io, setIo] = useState<Record<string, string>>(() => ({ ...(c.io || {}) }));
  const [otro, setOtro] = useState(c.o || ""), [ph, setPh] = useState<{ id?: string; d: string }[]>(() => (c.f || []).filter(pfoto).map(id => ({ id, d: pfoto(id) })));
  const [lb, setLb] = useState<number | null>(null), [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = async (fs: FileList | File[]) => { const l = await Promise.all([...fs].filter(f => f.type.startsWith("image/")).map(f => readImg(f, 1600))); setPh(p => [...p, ...l.map(d => ({ d }))]); };
  const okN = items.filter(it => (h[it.n] ?? 0) >= it.q).length, falt = items.reduce((a, it) => a + Math.max(0, it.q - (h[it.n] ?? 0)), 0);
  const ok = () => {
    const m = items.map(it => ({ n: it.n, q: it.q, h: Math.max(0, h[it.n] ?? 0), ...(io[it.n]?.trim() ? { o: io[it.n].trim() } : {}) })).filter(x => x.h < x.q), o = otro.trim();
    const keep = new Set(ph.filter(p => p.id).map(p => p.id)); (c.f || []).forEach(id => { if (!keep.has(id)) LS.del("lspdt.pfoto." + id); });
    const f = ph.map(p => { if (p.id) return p.id; const id = uid(); LS.set("lspdt.pfoto." + id, p.d); return id; });
    const notes = Object.fromEntries(Object.entries(io).map(([a, b]) => [a, b.trim()]).filter(([, b]) => b));
    onSave(!m.length && !o ? { s: "ok", f, io: notes, ck: true, by: c.by } : { s: "no", m, o, f, io: notes, ck: true, by: c.by });
  };
  return (
    <Modal open onClose={onClose} title={`Checklist de equipamiento · ${vn}`} desc={`${row.n} · marcá lo que está completo o cargá la cantidad que hay`} icon={<ListChecks />} size="xl"
      footer={<><span className="mr-auto text-xs text-slate-500"><b className="text-emerald-600 dark:text-emerald-400">{okN}</b>/{items.length} completos{falt ? <> · faltan <b className="text-red-600 dark:text-red-400">{falt}</b> unidades</> : ""}</span>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Save />} onClick={ok}>Guardar</Button></>}>
      <div className="space-y-4" onPaste={e => { const fs = [...e.clipboardData.items].filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()!).filter(Boolean); if (fs.length) { e.preventDefault(); void add(fs); } }}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={<CheckCheck />} onClick={() => setH(Object.fromEntries(items.map(it => [it.n, it.q])))}>Todo completo</Button>
          <Button size="sm" variant="ghost" icon={<X />} onClick={() => setH(Object.fromEntries(items.map(it => [it.n, 0])))}>Poner todo en 0</Button>
        </div>
        {items.length ? <div className="scrollbar-thin overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[40rem] text-sm">
          <thead><tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <th className="w-12 px-3 py-2.5 text-center">OK</th><th className="px-3 text-left">Elemento</th><th className="w-20 text-center">Requerido</th><th className="w-24 text-center">Actual</th><th className="w-20 text-center">Faltante</th><th className="px-3 text-left">Observaciones</th></tr></thead>
          <tbody>{items.map(it => { const v = h[it.n] ?? 0, miss = Math.max(0, it.q - v), full = miss === 0; return (
            <tr key={it.n} className={cn("border-t border-slate-100 dark:border-slate-800", full ? "bg-emerald-500/[.05]" : v > 0 && "bg-amber-500/[.05]")}>
              <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={full} aria-label={`${it.n} completo`} onChange={e => setH({ ...h, [it.n]: e.target.checked ? it.q : 0 })} className="size-4 cursor-pointer accent-emerald-600" /></td>
              <td className={cn("px-3", full ? "text-slate-500 dark:text-slate-400" : "font-medium")}>{it.n}</td>
              <td className="text-center font-semibold tabular-nums text-brand-600 dark:text-brand-300">{it.q}</td>
              <td className="text-center"><Input type="number" min={0} value={v} onFocus={e => e.target.select()} onChange={e => setH({ ...h, [it.n]: Math.max(0, +e.target.value || 0) })} className="mx-auto h-8 w-16 text-center" /></td>
              <td className={cn("text-center font-bold tabular-nums", full ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{full ? "✓" : miss}</td>
              <td className="px-3 py-1.5"><Input value={io[it.n] || ""} onChange={e => setIo({ ...io, [it.n]: e.target.value })} placeholder="Observaciones…" className="h-8 text-xs" /></td>
            </tr>); })}</tbody></table></div>
          : <p className="rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-800">No hay equipamiento cargado para este vehículo (lo define Capitanía).</p>}
        <Field label="Otro faltante o problema" hint="(opcional)"><Input value={otro} onChange={e => setOtro(e.target.value)} placeholder="Ej: rueda de auxilio pinchada" /></Field>
        <Field label="Fotos del maletero" hint="(arrastrá, pegá con Ctrl+V o elegí)">
          <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); void add(e.dataTransfer.files); }}
            className={cn("rounded-xl border-2 border-dashed p-3 transition", over ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 dark:border-slate-700")}>
            <div className="flex flex-wrap gap-2">
              {ph.map((p, i) => (
                <div key={i} className="group relative"><button onClick={() => setLb(i)}><img loading="lazy" decoding="async" src={p.d} alt="" className="size-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" /></button>
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
