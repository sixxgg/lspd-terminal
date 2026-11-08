import { scrollTopApp } from "@/lib/appearance";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search, Plus, X, Users, UserRound, Shield, Package, ScrollText, ChevronDown, Pencil, Trash2, Copy, Save, FilePlus2, Info, Star, Car, ListChecks, Radio, Check, GripVertical, ArrowDownUp } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { DiscordOutput, useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { Col, Split } from "@/components/layout";
import { LUGARES, fmtDate, getRoster, norm, rankES, uid } from "@/lib/domain";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { legalFavKey } from "./Legal";
import { EV_T, INF_EST, INF_FZ, INF_ROLES, INF_SECS, INF_TIPOS, UNITS, VEH_EST, VEH_REL, VEH_T, agTag, dcParts, getPenal, infErrs, infNew, infText, penalOf, penalSearch, artCmp, type Art, type Inf, type Veh } from "@/lib/penal";
import { cn } from "@/lib/cn";
import { VehPick } from "@/components/vehpick";

const fmtMoney = (n: number) => Number(n).toLocaleString("es-AR") + " $";
export function PenMeta({ x }: { x: Art }) {
  const pk = "rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold";
  return <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
    {x.k === "adm" ? <span className={cn(pk, "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>Falta{x.g ? " " + x.g.toLowerCase() : ""}</span> : <span className={cn(pk, "bg-red-500/10 text-red-700 dark:text-red-300")}>Delito</span>}
    {x.m != null && <span className={cn(pk, "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{fmtMoney(x.m)}</span>}
    {x.p != null && <span className={cn(pk, "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{x.p} meses</span>}
    {!!x.pt && <span className={cn(pk, "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{x.pt} pts</span>}
  </span>;
}

export function Informes() {
  useStoreVersion();
  const [INFS] = useJSON<Inf[]>("lspdt.informes", []);
  const [tab, setTab] = useState<"new" | "list">("new"), [edit, setEdit] = useState<Inf | null>(null), [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "new", label: "Nuevo informe", icon: <FilePlus2 /> }, { value: "list", label: `Registrados (${INFS.length})`, icon: <FileText /> }]} />
      {tab === "new" ? <InfForm key={edit?.id || "new"} init={edit} onSaved={id => { setEdit(null); setOpen(id); setTab("list"); }} />
        
        : <InfList open={open} setOpen={setOpen} onEdit={r => { setEdit(r); setTab("new"); scrollTopApp(); }} />}
    </div>
  );
}

function InfForm({ init, onSaved }: { init: Inf | null; onSaved: (id: string) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [A, setA] = useState<Inf>(() => init ? structuredClone(init) : Object.assign(infNew(me.n), LS.json<Partial<Inf>>("lspdt.infDraft", {})));
  const [showErr, setShowErr] = useState(false), [otro, setOtro] = useState(""), [drag, setDrag] = useState<number | null>(null), [over, setOver] = useState<number | null>(null);
  const moveU = (from: number, to: number) => { if (from === to) return; up(x => { const [m] = x.unid.splice(from, 1); x.unid.splice(to, 0, m); }); };
  useEffect(() => { LS.setJSON("lspdt.infDraft", A); }, [A]);
  const up = (fn: (x: Inf) => void) => setA(a => { const x = structuredClone(a); fn(x); return x; });
  const set = <K extends keyof Inf>(k: K) => (e: { target: { value: string } }) => up(x => { (x[k] as unknown as string) = e.target.value; });
  const P = getPenal(), text = useMemo(() => infText(A, me.n, P), [A, me.n, P]), errs = infErrs(A), parts = dcParts(text);
  const R = getRoster(), copy = useCopy();
  const [favIds] = useJSON<string[]>(legalFavKey(me.n), []);
  const favArts = useMemo(() => favIds.map(a => penalOf(a, P)).filter((x): x is Art => !!x).sort((a, b) => artCmp(a, b)), [favIds, P]);
  const tot = useMemo(() => { const t = { n: 0, m: 0, p: 0 }; A.suj.forEach(s => s.cg.forEach(c => { const x = penalOf(c.a, P); t.n++; t.m += x?.m || 0; t.p += x?.p || 0; })); return t; }, [A.suj, P]);
  const save = async () => {
    if (errs.length) { setShowErr(true); toast("Falta completar: " + errs.join(", "), "err"); return; }
    const INFS = LS.json<Inf[]>("lspdt.informes", []);
    const r: Inf = { ...structuredClone(A), por: A.por || me.n, t: Date.now() }; r.texto = infText(r, me.n, P);
    let L: Inf[];
    if (A.id) { const i = INFS.findIndex(x => x.id === A.id); L = i >= 0 ? INFS.map((x, j) => (j === i ? { ...x, ...r, edit: me.n } : x)) : [...INFS, r]; }
    else { r.id = uid(); L = [...INFS, r]; }
    LS.setJSON("lspdt.informes", L); LS.del("lspdt.infDraft"); toast(A.id ? "Cambios guardados" : "Informe registrado"); onSaved(r.id);
  };
  const evRow = (e: Inf["ev"][number], i: number, subj: boolean) => (
    <div key={i} className={cn("grid gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800", subj ? "sm:grid-cols-[10rem_9rem_1fr_auto]" : "sm:grid-cols-[9rem_1fr_auto]")}>
      {subj && <Select value={e.s} onChange={v => up(x => { x.ev[i].s = v.target.value; })} className="text-sm"><option value="">Sin sujeto</option>{A.suj.filter(s => s.n).map(s => <option key={s.n}>{s.n}</option>)}</Select>}
      <Select value={e.t} onChange={v => up(x => { x.ev[i].t = v.target.value; })} className="text-sm">{(EV_T as string[]).map(x => <option key={x}>{x}</option>)}</Select>
      {e.t === "Vehículo" ? <div className="space-y-2">
        <VehPick v={e} onChange={p => up(x => { Object.assign(x.ev[i], p); })} />
        <div className="grid grid-cols-2 gap-2">
          <Input value={e.co || ""} onChange={v => up(x => { x.ev[i].co = v.target.value; })} placeholder="Color" />
          <Input value={e.mat || ""} onChange={v => up(x => { x.ev[i].mat = v.target.value.toUpperCase(); })} placeholder="Matrícula" className="font-mono uppercase" />
        </div>
      </div> : <Input value={e.d || ""} onChange={v => up(x => { x.ev[i].d = v.target.value; })} placeholder="Descripción (ej: 2 bolsas de marihuana, Pistola SNS)" />}
      <Button variant="ghost" size="icon" aria-label="Quitar evidencia" onClick={() => up(x => { x.ev.splice(i, 1); })}><X /></Button>
      {e.t === "Vehículo" && <Input className={subj ? "sm:col-span-4" : "sm:col-span-3"} value={e.d || ""} onChange={v => up(x => { x.ev[i].d = v.target.value; })} placeholder="Nota (opcional, ej: queda identificada como el vehículo sustraído)" />}
    </div>);
  const linked = (n: string) => !!n && A.suj.some(s => s.n === n);
  const renameSuj = (si: number, v: string) => up(x => { const old = x.suj[si].n; x.suj[si].n = v; if (old) { x.ev.forEach(e => { if (e.s === old) e.s = v; }); (x.veh || []).forEach(z => { if (z.s === old) z.s = v; }); } });
  const tipos = [...INF_TIPOS as string[], ...A.tipos.filter(x => !(INF_TIPOS as string[]).includes(x))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  return (
    <Split>
      <datalist id="rosterDL">{R.map(a => <option key={a.n} value={a.n}>{rankES(a.r)}{a.p ? " · #" + a.p : ""}</option>)}</datalist>
      <datalist id="unitDL">{UNITS.map(u => <option key={u} value={u} />)}</datalist>
      <datalist id="lugDL">{LUGARES.slice(0, 600).map(x => <option key={x} value={x} />)}</datalist>
      <Col>
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><ListChecks className="size-4 text-brand-500" />Secciones del informe</span>
          {INF_SECS.map(([k, l]) => { const onS = !(A.off || []).includes(k); return (
            <button key={k} type="button" aria-pressed={onS} title={onS ? "Sale en el informe · clic para quitarla" : "No sale en el informe · clic para incluirla"} onClick={() => up(x => { const o = x.off || []; x.off = onS ? [...o, k] : o.filter(y => y !== k); })}
              className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition", onS ? "border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-200" : "border-slate-200 text-slate-400 line-through dark:border-slate-700")}>
              {onS && <Check className="size-3" />}{l}</button>); })}
        </Card>
        <Card>
          <CardHeader icon={<Info />} title="Información del incidente" desc={A.id ? "Editando un informe registrado" : undefined} />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fecha"><Input value={A.fecha} onChange={e => { const v = e.target.value.replace(/[^\d/]/g, ""); up(x => { x.fecha = v.length === 8 && !v.includes("/") ? `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}` : v.slice(0, 10); }); }} placeholder="dd/mm/aaaa" inputMode="numeric" className={cn(showErr && errs.includes("fecha (dd/mm/aaaa)") && "border-red-400")} /></Field>
              <Field label="Hora"><Input value={A.hora} onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); up(x => { x.hora = d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d; }); }} placeholder="hh:mm" inputMode="numeric" /></Field>
              <Field label="Estado"><Select value={A.est} onChange={set("est")}>{(INF_EST as string[]).map(x => <option key={x}>{x}</option>)}</Select></Field>
              <Field label="Ubicación inicial"><Input list="lugDL" value={A.ui} onChange={set("ui")} placeholder="Ej: Life Invader" className={cn(showErr && !A.ui.trim() && "border-red-400")} /></Field>
              <Field label="Interceptación" hint="(opcional)"><Input list="lugDL" value={A.ux} onChange={set("ux")} /></Field>
              <Field label="Ubicación final"><Input list="lugDL" value={A.uf} onChange={set("uf")} placeholder="Comisaría de Mission Row" /></Field>
            </div>
            <Field label="Tipo de incidente">
              <div className="flex flex-wrap gap-1.5">
                {tipos.map(t => { const on = A.tipos.includes(t); return (
                  <button key={t} type="button" onClick={() => up(x => { x.tipos = on ? x.tipos.filter(y => y !== t) : [...x.tipos, t]; })}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", on ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>{t}</button>); })}
                <Input value={otro} onChange={e => setOtro(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const v = otro.trim(); if (v && !A.tipos.includes(v)) up(x => { x.tipos.push(v); }); setOtro(""); } }} placeholder="+ otro (Enter)" className="h-7 w-36 rounded-full text-xs" />
              </div>
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<UserRound />} title="Sujetos implicados y cargos" desc="Los cargos salen del apartado Legal: buscalos por artículo o palabra, o tocá un favorito." />
          <CardBody>
            {A.suj.map((s, si) => (
              <div key={si} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex gap-2">
                  <Input value={s.n} onChange={e => renameSuj(si, e.target.value)} placeholder="Nombre y apellido" />
                  <Input value={s.id} onChange={e => up(x => { x.suj[si].id = e.target.value.toUpperCase(); })} placeholder="ID (CitizenID)" className="max-w-[11rem] font-mono uppercase" />
                  <Button variant="ghost" size="icon" aria-label="Quitar sujeto" onClick={() => up(x => { x.suj.splice(si, 1); })}><X /></Button>
                </div>
                {s.cg.map((c, ci) => { const x = penalOf(c.a, P); return (
                  <div key={c.a} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
                    <b className="font-mono text-xs">{c.a}</b><span className="min-w-0 flex-1 text-sm">{x ? <>{x.t}<PenMeta x={x} /></> : "Artículo sin cargar en el catálogo"}</span>
                    <Segmented size="sm" value={c.m || ""} onChange={v => up(y => { y.suj[si].cg[ci].m = v as "" | "at" | "ag"; })} options={[{ value: "", label: "Normal" }, { value: "at", label: "Atenuado" }, { value: "ag", label: "Agravado" }]} />
                    <button aria-label="Quitar cargo" onClick={() => up(y => { y.suj[si].cg.splice(ci, 1); })} className="rounded p-1 text-slate-400 hover:text-red-600"><X className="size-4" /></button>
                  </div>); })}
                {favArts.filter(f => !s.cg.some(c => c.a === f.a)).length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Star className="size-3 fill-amber-400 text-amber-400" />Favoritos</span>
                  {favArts.filter(f => !s.cg.some(c => c.a === f.a)).map(f => <button key={f.a} type="button" title={f.t} onClick={() => up(x => { x.suj[si].cg.push({ a: f.a, m: "" }); })}
                    className="max-w-[16rem] truncate rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-400/20 dark:text-amber-200"><b className="font-mono">{f.a}</b> {f.t}</button>)}</div>}
                <ChargeSearch P={P} onPick={a => up(x => { if (!x.suj[si].cg.some(c => c.a === a)) x.suj[si].cg.push({ a, m: "" }); })} />
                <div className="grid gap-2 border-t border-dashed border-slate-200 pt-2 dark:border-slate-800 sm:grid-cols-[auto_1fr]">
                  <span className="self-center text-xs font-semibold text-slate-500">Agente que lo procesa</span>
                  <Input list="rosterDL" value={s.p || ""} onChange={e => up(x => { x.suj[si].p = e.target.value; })} placeholder={me.n} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Package className="size-3.5" />Artículos incautados{s.n ? ` a ${s.n}` : ""}</p>
                  {A.ev.map((e, i) => (s.n && e.s === s.n ? evRow(e, i, false) : null))}
                  <Button variant="ghost" size="sm" icon={<Plus />} disabled={!s.n.trim()} title={s.n.trim() ? undefined : "Poné primero el nombre del sujeto"} onClick={() => up(x => { x.ev.push({ s: s.n, t: "Objeto", d: "" }); })}>Añadir incautación</Button>
                </div>
              </div>))}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" size="sm" icon={<Plus />} onClick={() => up(x => { x.suj.push({ n: "", id: "", cg: [] }); })}>Añadir sujeto</Button>
              {tot.n > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">{tot.n} {tot.n === 1 ? "cargo" : "cargos"} · multas <b className="text-slate-800 dark:text-slate-100">{fmtMoney(tot.m)}</b> · prisión <b className="text-slate-800 dark:text-slate-100">{tot.p} meses</b> <span className="opacity-70">(suma de los artículos, sin atenuantes ni agravantes)</span></span>}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ScrollText />} title="Relato" />
          <CardBody>
            <Field label="Motivo de la intervención"><Textarea rows={3} value={A.motivo} onChange={set("motivo")} placeholder="Por qué se inicia la intervención, quién acude primero, cómo termina." /></Field>
            <Field label="Descripción de los hechos"><Textarea rows={5} value={A.hechos} onChange={set("hechos")} placeholder="Relato cronológico de los hechos." /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Users />} title="Unidades intervinientes" desc="Agente, indicativo o los dos (la unidad se puede escribir a mano). Arrastralos desde ⋮⋮ para ordenarlos: el informe sale en ese orden." />
          <CardBody>
            {A.unid.map((u, i) => (
              <div key={i} onDragOver={e => { if (drag === null) return; e.preventDefault(); setOver(i); }} onDrop={e => { e.preventDefault(); if (drag !== null) moveU(drag, i); setDrag(null); setOver(null); }}
                className={cn("flex gap-2 rounded-xl transition", drag === i && "opacity-40", over === i && drag !== null && drag !== i && (drag > i ? "shadow-[0_-2px_0_0_rgb(var(--b-500))]" : "shadow-[0_2px_0_0_rgb(var(--b-500))]"))}>
                <button type="button" draggable aria-label={`Mover ${u.n || u.u || "fila"} (arrastrá, o usá las flechas)`} title="Arrastrá para reordenar"
                  onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); const row = e.currentTarget.parentElement; if (row) e.dataTransfer.setDragImage(row, 16, 20); }}
                  onDragEnd={() => { setDrag(null); setOver(null); }}
                  onKeyDown={e => { if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); moveU(i, i - 1); } if (e.key === "ArrowDown" && i < A.unid.length - 1) { e.preventDefault(); moveU(i, i + 1); } }}
                  className="grid w-6 shrink-0 cursor-grab place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800"><GripVertical className="size-4" /></button>
                <Input list="rosterDL" value={u.n} onChange={e => up(x => { x.unid[i].n = e.target.value; })} placeholder="Agente (opcional si ponés la unidad)" />
                <div className="relative w-44 shrink-0"><Radio className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <Input list="unitDL" value={u.u || ""} onChange={e => up(x => { x.unid[i].u = e.target.value.toUpperCase(); })} placeholder="Unidad" className="pl-8 font-mono text-sm uppercase" /></div>
                <Select value={u.r} onChange={e => up(x => { x.unid[i].r = e.target.value; })} className="max-w-[16rem] text-sm">{[...(INF_ROLES as string[]), ...((INF_ROLES as string[]).includes(u.r) ? [] : [u.r])].map(r => <option key={r}>{r}</option>)}</Select>
                <Button variant="ghost" size="icon" aria-label="Quitar unidad" onClick={() => up(x => { x.unid.splice(i, 1); })}><X /></Button>
              </div>))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={<Plus />} onClick={() => up(x => { const last = x.unid[x.unid.length - 1]; x.unid.push({ n: "", r: "Unidad de apoyo", u: last?.u || "" }); })}>Añadir agente</Button>
              {A.unid.length > 1 && <Button variant="ghost" size="sm" icon={<ArrowDownUp />} onClick={() => up(x => { const ord = (u: string) => { const i = UNITS.indexOf(u); return u ? (i < 0 ? 999 : i) : 1e4; };
                x.unid = x.unid.map((u, i) => ({ u, i })).sort((a, b) => ord(a.u.u || "") - ord(b.u.u || "") || (a.u.u || "").localeCompare(b.u.u || "") || a.i - b.i).map(y => y.u); })}>Ordenar por unidad</Button>}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Car />} title="Vehículos implicados" desc="Patrullas, vehículos de los sospechosos o de civiles: modelo, matrícula y en qué estado quedaron." />
          <CardBody>
            {(A.veh || []).map((v, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800 sm:grid-cols-[8.5rem_1fr_auto]">
                <Select value={v.t} onChange={e => up(x => { x.veh![i].t = e.target.value; if (e.target.value === "Policial" && !x.veh![i].mo) x.veh![i].cat = "Policial"; })} className="text-sm">{VEH_T.map(t => <option key={t}>{t}</option>)}</Select>
                <VehPick v={v} police={v.t === "Policial"} onChange={p => up(x => { Object.assign(x.veh![i], p); })} />
                <Button variant="ghost" size="icon" aria-label="Quitar vehículo" onClick={() => up(x => { x.veh!.splice(i, 1); })}><X /></Button>
                <div className={cn("grid grid-cols-2 gap-2 sm:col-span-3", v.t !== "Policial" && "sm:grid-cols-[1fr_1fr_11rem]")}>
                  <Input value={v.co} onChange={e => up(x => { x.veh![i].co = e.target.value; })} placeholder="Color" />
                  <Input value={v.mat} onChange={e => up(x => { x.veh![i].mat = e.target.value.toUpperCase(); })} placeholder="Matrícula" className="font-mono uppercase" />
                  {v.t !== "Policial" && <Select value={v.rob || ""} onChange={e => up(x => { x.veh![i].rob = e.target.value as Veh["rob"]; })} title="Obligatorio: indicar si el vehículo es robado"
                    className={cn("col-span-2 text-sm sm:col-span-1", !v.rob && (v.mo || v.mat) && "border-amber-400 dark:border-amber-500", v.rob === "si" && "text-red-600 dark:text-red-400")}>
                    <option value="">¿Robado?</option><option value="no">No robado</option><option value="si">Robado</option></Select>}
                </div>
                {v.t !== "Policial" && <div className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
                  <Select value={v.s || ""} onChange={e => up(x => { x.veh![i].s = e.target.value; })} className="text-sm" title="Sujeto relacionado con el vehículo (no hace falta que sea el dueño)"><option value="">Sin sujeto relacionado</option>{A.suj.filter(z => z.n).map(z => <option key={z.n}>{z.n}</option>)}</Select>
                  <Select value={v.rel || ""} disabled={!v.s} onChange={e => up(x => { x.veh![i].rel = e.target.value; })} className="text-sm" title="Qué relación tiene el sujeto con el vehículo"><option value="">Relación con el vehículo…</option>{VEH_REL.map(r => <option key={r}>{r}</option>)}</Select>
                </div>}
                <div className={cn("grid gap-2 sm:col-span-3", v.t === "Policial" ? "sm:grid-cols-[8.5rem_12rem_1fr]" : "sm:grid-cols-[12rem_1fr]")}>
                  {v.t === "Policial" && <Input list="unitDL" value={v.u} onChange={e => up(x => { x.veh![i].u = e.target.value.toUpperCase(); })} placeholder="Unidad" className="font-mono text-sm uppercase" />}
                  <Select value={v.est} onChange={e => up(x => { x.veh![i].est = e.target.value; })} className="text-sm"><option value="">Estado…</option>{VEH_EST.map(t => <option key={t}>{t}</option>)}</Select>
                  <Input value={v.d} onChange={e => up(x => { x.veh![i].d = e.target.value; })} placeholder="Nota (opcional, ej: impacto en el lateral durante la persecución)" />
                </div>
              </div>))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={<Plus />} onClick={() => up(x => { x.veh = [...(x.veh || []), { t: "Sospechoso", mo: "", co: "", mat: "", u: "", est: "", d: "" }]; })}>Añadir vehículo</Button>
              <Button variant="ghost" size="sm" icon={<Car />} onClick={() => up(x => { const mine = x.unid.find(u => u.u); x.veh = [...(x.veh || []), { t: "Policial", cat: "Policial", mo: "", co: "", mat: "", u: mine?.u || "", est: "Sin daños", d: "" }]; })}>Añadir patrulla</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Shield />} title="Uso de la fuerza y evidencia" />
          <CardBody>
            <Segmented size="sm" value={A.fz} onChange={v => up(x => { x.fz = v; })} options={(INF_FZ as string[]).map(v => ({ value: v, label: v }))} />
            <Textarea rows={2} value={A.fzd} onChange={set("fzd")} placeholder={A.fz === "N/A" ? "Opcional: se pone «No ha sido necesario el uso de la fuerza…»" : "Detalle del uso de la fuerza"} />
            <Field label="Evidencia sin sujeto" hint="(lo de cada sujeto se carga en su ficha, arriba)">
              <div className="space-y-2">
                {A.ev.map((e, i) => (linked(e.s) ? null : evRow(e, i, true)))}
                {false && A.ev.map((e, i) => (
                  <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[10rem_9rem_1fr_auto] dark:border-slate-800">
                    <Select value={e.s} onChange={v => up(x => { x.ev[i].s = v.target.value; })} className="text-sm"><option value="">Sin sujeto</option>{A.suj.filter(s => s.n).map(s => <option key={s.n}>{s.n}</option>)}</Select>
                    <Select value={e.t} onChange={v => up(x => { x.ev[i].t = v.target.value; })} className="text-sm">{(EV_T as string[]).map(x => <option key={x}>{x}</option>)}</Select>
                    {e.t === "Vehículo" ? <div className="grid grid-cols-3 gap-2">
                      <Input value={e.mo || ""} onChange={v => up(x => { x.ev[i].mo = v.target.value; })} placeholder="Modelo" />
                      <Input value={e.co || ""} onChange={v => up(x => { x.ev[i].co = v.target.value; })} placeholder="Color" />
                      <Input value={e.mat || ""} onChange={v => up(x => { x.ev[i].mat = v.target.value.toUpperCase(); })} placeholder="Matrícula" className="font-mono uppercase" />
                    </div> : <Input value={e.d || ""} onChange={v => up(x => { x.ev[i].d = v.target.value; })} placeholder="Descripción" />}
                    <Button variant="ghost" size="icon" aria-label="Quitar evidencia" onClick={() => up(x => { x.ev.splice(i, 1); })}><X /></Button>
                    {e.t === "Vehículo" && <Input className="sm:col-span-4" value={e.d || ""} onChange={v => up(x => { x.ev[i].d = v.target.value; })} placeholder="Nota (opcional, ej: queda identificada como el vehículo sustraído)" />}
                  </div>))}
                <Button variant="outline" size="sm" icon={<Package />} onClick={() => up(x => { x.ev.push({ s: "", t: "Objeto", mo: "", co: "", mat: "", d: "" }); })}>Añadir evidencia</Button>
              </div>
            </Field>
            <Field label="Agregado a «Detención y procesamiento»" hint="(opcional)"><Textarea rows={2} value={A.extra} onChange={set("extra")} placeholder="Se arma solo con los datos; acá podés sumar algo." /></Field>
          </CardBody>
        </Card>
      </Col>
      <DiscordOutput title="Informe policial" tag="Discord" text={text} errors={showErr ? errs : undefined}
        extra={parts.length > 1 && <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">{parts.length} partes:{parts.map((p, i) => <Button key={i} size="sm" variant="outline" onClick={() => { if (errs.length) { setShowErr(true); return; } void copy(p); }}>{i + 1}/{parts.length}</Button>)}</span>}
        footer={<><Button variant="ghost" onClick={async () => { if (!(await confirm("¿Empezar un informe nuevo? Se borran los datos cargados."))) return; LS.del("lspdt.infDraft"); setA(infNew(me.n)); setShowErr(false); }}>Nuevo informe</Button>
          <Button icon={<Save />} onClick={save}>{A.id ? "Guardar cambios" : "Registrar informe"}</Button></>} />
    </Split>
  );
}

function ChargeSearch({ P, onPick }: { P: Art[]; onPick: (a: string) => void }) {
  const [q, setQ] = useState(""), [open, setOpen] = useState(false), [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const L = useMemo(() => penalSearch(q, 14, P), [q, P]);
  useEffect(() => { const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  return (
    <div ref={ref} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input className="pl-9" value={q} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true); setI(0); }} placeholder="Buscar delito por artículo, nombre o palabra (ej: robo, 143, evasión)…"
        onKeyDown={e => { if (e.key === "Escape") setOpen(false); else if (e.key === "ArrowDown") { e.preventDefault(); setI(Math.min(i + 1, L.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setI(Math.max(0, i - 1)); } else if (e.key === "Enter" && L[i]) { e.preventDefault(); onPick(L[i].a); setQ(""); } }} />
      {open && (
        <div className="scrollbar-thin absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {L.length ? L.map((x, j) => (
            <button key={x.a} onMouseDown={e => { e.preventDefault(); onPick(x.a); setQ(""); }} onMouseEnter={() => setI(j)} className={cn("flex w-full gap-3 px-3 py-2 text-left", j === i ? "bg-brand-50 dark:bg-brand-500/10" : "")}>
              <b className="w-14 shrink-0 font-mono text-xs leading-5">{x.a}</b>
              <span className="min-w-0"><span className="text-sm">{x.t}<PenMeta x={x} /></span>{x.d && <small className="block truncate text-xs text-slate-500">{x.d}</small>}</span>
            </button>)) : <p className="p-3 text-xs text-slate-400">Sin resultados. Revisá el número o buscá en Legal → Leyes.</p>}
        </div>
      )}
    </div>
  );
}

function InfList({ open, setOpen, onEdit }: { open: string | null; setOpen: (id: string | null) => void; onEdit: (r: Inf) => void }) {
  const me = useMe(), { confirm } = useFeedback(), copy = useCopy();
  const [INFS, setINFS] = useJSON<Inf[]>("lspdt.informes", []);
  const [q, setQ] = useState(""); const s = norm(q);
  const L = INFS.slice().sort((a, b) => (b.t || 0) - (a.t || 0)).filter(r => !s || norm(r.texto).includes(s));
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="relative min-w-[16rem] flex-1 sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por sujeto, ID, artículo, agente o lugar…" /></div>
        <span className="text-xs text-slate-400">{L.length} de {INFS.length} informes</span>
      </div>
      {!L.length ? <Empty icon={<FileText />} title={INFS.length ? "Ningún informe coincide" : "Todavía no hay informes registrados"} />
        : <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(r => { const S = (r.suj || []).filter(x => x.n), isO = open === r.id, can = r.por === me.n || me.l >= 8 || me.admin, parts = dcParts(r.texto || ""); return (
          <div key={r.id}>
            <button onClick={() => setOpen(isO ? null : r.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><FileText className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{(r.tipos || []).join(" · ") || "Informe"}</p>
                <p className="truncate text-xs text-slate-500">{r.fecha} {r.hora} · {r.ui}{r.uf && ` → ${r.uf}`}</p>
                <p className="truncate text-xs text-slate-400">{S.length > 0 && S.map(x => x.n + (x.id ? ` (${x.id})` : "")).join(", ") + " · "}redactado por {agTag(r.por || "")}{r.t ? ` · ${fmtDate(r.t)}` : ""}</p>
              </div>
              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase", r.est === "Incidente finalizado" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-400/15 text-amber-700 dark:text-amber-300")}>{r.est}</span>
              <ChevronDown className={cn("mt-1 size-4 shrink-0 text-slate-400 transition-transform", isO && "rotate-180")} />
            </button>
            {isO && (
              <div className="space-y-3 bg-slate-50/60 p-4 dark:bg-slate-950/30">
                <pre className="scrollbar-thin max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-slate-200">{r.texto}</pre>
                <div className="flex flex-wrap items-center gap-2">
                  {can && <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (await confirm("¿Eliminar el informe del registro?", { danger: true, ok: "Eliminar" })) setINFS(INFS.filter(x => x.id !== r.id)); }}>Eliminar</Button>}
                  <span className="flex-1" />
                  {parts.length > 1 && parts.map((p, i) => <Button key={i} size="sm" variant="outline" onClick={() => copy(p)}>Parte {i + 1}/{parts.length}</Button>)}
                  {can && <Button variant="outline" size="sm" icon={<Pencil />} onClick={() => onEdit(r)}>Editar</Button>}
                  <Button size="sm" icon={<Copy />} onClick={() => copy(r.texto || "")}>Copiar</Button>
                </div>
              </div>
            )}
          </div>); })}</div>}
    </Card>
  );
}

