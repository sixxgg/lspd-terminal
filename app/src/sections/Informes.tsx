import { scrollTopApp } from "@/lib/appearance";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search, Plus, X, Users, UserRound, Shield, Package, ScrollText, ChevronDown, Pencil, Trash2, Copy, Save, FilePlus2, Upload, ClipboardPaste, BookOpen, Info } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { DiscordOutput, useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { Col, Split } from "@/components/layout";
import { LUGARES, fmtDate, getRoster, norm, rankES, uid } from "@/lib/domain";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { CIRC, EV_T, INF_EST, INF_FZ, INF_ROLES, INF_TIPOS, PENAL_BASE, PEN_CATS, agTag, artCmp, dcParts, fileText, getPenal, infErrs, infNew, infText, parsePenal, penalOf, penalSearch, savePenal, type Art, type Inf } from "@/lib/penal";
import { cn } from "@/lib/cn";

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
  const P = getPenal();
  const [tab, setTab] = useState<"new" | "list" | "pen">("new"), [edit, setEdit] = useState<Inf | null>(null), [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "new", label: "Nuevo informe", icon: <FilePlus2 /> }, { value: "list", label: `Registrados (${INFS.length})`, icon: <FileText /> }, { value: "pen", label: `Código penal (${P.length})`, icon: <BookOpen /> }]} />
      {tab === "new" ? <InfForm key={edit?.id || "new"} init={edit} onSaved={id => { setEdit(null); setOpen(id); setTab("list"); }} />
        : tab === "list" ? <InfList open={open} setOpen={setOpen} onEdit={r => { setEdit(r); setTab("new"); scrollTopApp(); }} />
        : <PenalView />}
    </div>
  );
}

function InfForm({ init, onSaved }: { init: Inf | null; onSaved: (id: string) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [A, setA] = useState<Inf>(() => init ? structuredClone(init) : Object.assign(infNew(me.n), LS.json<Partial<Inf>>("lspdt.infDraft", {})));
  const [showErr, setShowErr] = useState(false), [otro, setOtro] = useState("");
  useEffect(() => { LS.setJSON("lspdt.infDraft", A); }, [A]);
  const up = (fn: (x: Inf) => void) => setA(a => { const x = structuredClone(a); fn(x); return x; });
  const set = <K extends keyof Inf>(k: K) => (e: { target: { value: string } }) => up(x => { (x[k] as unknown as string) = e.target.value; });
  const P = getPenal(), text = useMemo(() => infText(A, me.n, P), [A, me.n, P]), errs = infErrs(A), parts = dcParts(text);
  const R = getRoster(), copy = useCopy();
  const save = async () => {
    if (errs.length) { setShowErr(true); toast("Falta completar: " + errs.join(", "), "err"); return; }
    const INFS = LS.json<Inf[]>("lspdt.informes", []);
    const r: Inf = { ...structuredClone(A), por: A.por || me.n, t: Date.now() }; r.texto = infText(r, me.n, P);
    let L: Inf[];
    if (A.id) { const i = INFS.findIndex(x => x.id === A.id); L = i >= 0 ? INFS.map((x, j) => (j === i ? { ...x, ...r, edit: me.n } : x)) : [...INFS, r]; }
    else { r.id = uid(); L = [...INFS, r]; }
    LS.setJSON("lspdt.informes", L); LS.del("lspdt.infDraft"); toast(A.id ? "Cambios guardados" : "Informe registrado"); onSaved(r.id);
  };
  const tipos = [...INF_TIPOS as string[], ...A.tipos.filter(x => !(INF_TIPOS as string[]).includes(x))];
  return (
    <Split>
      <datalist id="rosterDL">{R.map(a => <option key={a.n} value={a.n}>{rankES(a.r)}{a.p ? " · #" + a.p : ""}</option>)}</datalist>
      <datalist id="lugDL">{LUGARES.slice(0, 600).map(x => <option key={x} value={x} />)}</datalist>
      <Col>
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
          <CardHeader icon={<ScrollText />} title="Relato" />
          <CardBody>
            <Field label="Motivo de la intervención"><Textarea rows={3} value={A.motivo} onChange={set("motivo")} placeholder="Por qué se inicia la intervención, quién acude primero, cómo termina." /></Field>
            <Field label="Descripción de los hechos"><Textarea rows={5} value={A.hechos} onChange={set("hechos")} placeholder="Relato cronológico de los hechos." /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Users />} title="Unidades intervinientes" />
          <CardBody>
            {A.unid.map((u, i) => (
              <div key={i} className="flex gap-2">
                <Input list="rosterDL" value={u.n} onChange={e => up(x => { x.unid[i].n = e.target.value; })} placeholder="Agente" />
                <Select value={u.r} onChange={e => up(x => { x.unid[i].r = e.target.value; })} className="max-w-[16rem] text-sm">{[...(INF_ROLES as string[]), ...((INF_ROLES as string[]).includes(u.r) ? [] : [u.r])].map(r => <option key={r}>{r}</option>)}</Select>
                <Button variant="ghost" size="icon" aria-label="Quitar unidad" onClick={() => up(x => { x.unid.splice(i, 1); })}><X /></Button>
              </div>))}
            <Button variant="outline" size="sm" icon={<Plus />} onClick={() => up(x => { x.unid.push({ n: "", r: "Unidad de apoyo" }); })}>Añadir unidad</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<UserRound />} title="Sujetos implicados y cargos" />
          <CardBody>
            {A.suj.map((s, si) => (
              <div key={si} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex gap-2">
                  <Input value={s.n} onChange={e => up(x => { x.suj[si].n = e.target.value; })} placeholder="Nombre y apellido" />
                  <Input value={s.id} onChange={e => up(x => { x.suj[si].id = e.target.value.toUpperCase(); })} placeholder="ID (CitizenID)" className="max-w-[11rem] font-mono uppercase" />
                  <Button variant="ghost" size="icon" aria-label="Quitar sujeto" onClick={() => up(x => { x.suj.splice(si, 1); })}><X /></Button>
                </div>
                {s.cg.map((c, ci) => { const x = penalOf(c.a, P); return (
                  <div key={c.a} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
                    <b className="font-mono text-xs">{c.a}</b><span className="min-w-0 flex-1 truncate text-sm">{x ? x.t : "Artículo sin cargar en el catálogo"}</span>
                    <Segmented size="sm" value={c.m || ""} onChange={v => up(y => { y.suj[si].cg[ci].m = v as "" | "at" | "ag"; })} options={[{ value: "", label: "Normal" }, { value: "at", label: "Atenuado" }, { value: "ag", label: "Agravado" }]} />
                    <button aria-label="Quitar cargo" onClick={() => up(y => { y.suj[si].cg.splice(ci, 1); })} className="rounded p-1 text-slate-400 hover:text-red-600"><X className="size-4" /></button>
                  </div>); })}
                <ChargeSearch P={P} onPick={a => up(x => { if (!x.suj[si].cg.some(c => c.a === a)) x.suj[si].cg.push({ a, m: "" }); })} />
              </div>))}
            <Button variant="outline" size="sm" icon={<Plus />} onClick={() => up(x => { x.suj.push({ n: "", id: "", cg: [] }); })}>Añadir sujeto</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Shield />} title="Uso de la fuerza y evidencia" />
          <CardBody>
            <Segmented size="sm" value={A.fz} onChange={v => up(x => { x.fz = v; })} options={(INF_FZ as string[]).map(v => ({ value: v, label: v }))} />
            <Textarea rows={2} value={A.fzd} onChange={set("fzd")} placeholder={A.fz === "N/A" ? "Opcional: se pone «No ha sido necesario el uso de la fuerza…»" : "Detalle del uso de la fuerza"} />
            <Field label="Evidencia incautada">
              <div className="space-y-2">
                {A.ev.map((e, i) => (
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
                <Button variant="outline" size="sm" icon={<Package />} onClick={() => up(x => { x.ev.push({ s: x.suj.find(s => s.n)?.n || "", t: "Vehículo", mo: "", co: "", mat: "", d: "" }); })}>Añadir evidencia</Button>
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
            </button>)) : <p className="p-3 text-xs text-slate-400">Sin resultados. Podés cargar el artículo en la pestaña «Código penal».</p>}
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

function PenalView() {
  const me = useMe(), { toast, confirm } = useFeedback();
  const P = getPenal(), can = me.admin || me.l >= 6;
  const [q, setQ] = useState(""), [k, setK] = useState("all"), [ed, setEd] = useState<Art | null>(null), [old, setOld] = useState(""), [paste, setPaste] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const L = penalSearch(q, 600, P).filter(x => k === "all" || (x.k || "cp") === k);
  const grp: Record<string, Art[]> = {}; L.forEach(x => { const c = x.c || "Capítulo " + x.a.split(".")[0]; (grp[c] = grp[c] || []).push(x); });
  const ord = Object.keys(grp).sort((a, b) => { const ia = (PEN_CATS as string[]).indexOf(a), ib = (PEN_CATS as string[]).indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  const nc = P.filter(x => (x.k || "cp") === "cp").length;
  const imp = async (txt: string) => {
    const N = parsePenal(txt); if (!N.length) { toast("No encontré artículos con formato «132.104 — Título»", "err"); return; }
    if (!(await confirm(`¿Importar ${N.length} artículos al código penal? Los que ya existen se actualizan; el resto se mantiene.`, { ok: "Importar" }))) return;
    const m = new Map(P.map(x => [x.a, x])); N.forEach(x => m.set(x.a, { ...m.get(x.a), ...x, d: x.d || m.get(x.a)?.d || "" } as Art));
    savePenal([...m.values()].sort(artCmp)); setPaste(null); toast(`${N.length} artículos importados`);
  };
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="relative min-w-[15rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar: robo, joyería, alcohol, 143, evasión…" /></div>
        <Segmented size="sm" value={k} onChange={setK} options={[{ value: "all", label: `Todo (${P.length})` }, { value: "cp", label: `Delitos (${nc})` }, { value: "adm", label: `Faltas (${P.length - nc})` }]} />
        {can && <>
          <Button size="sm" variant="outline" icon={<Plus />} onClick={() => { setOld(""); setEd({ a: "", t: "", d: "", c: "" }); }}>Artículo</Button>
          <Button size="sm" variant="outline" icon={<Upload />} onClick={() => fileRef.current?.click()}>Importar PDF/TXT</Button>
          <Button size="sm" variant="outline" icon={<ClipboardPaste />} onClick={() => setPaste("")}>Pegar texto</Button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,text/plain,application/pdf" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { toast("Leyendo " + f.name + "…"); await imp(await fileText(f)); } catch (err) { toast((err as Error).message || "No se pudo leer", "err"); } }} />
        </>}
      </div>
      <div className="space-y-4 p-4">
        {paste !== null && <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/5">
          <Textarea rows={6} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Pegá el código penal. Cada artículo en una línea: «132.104 — Robo o uso no autorizado de vehículos motorizados», y debajo su descripción." />
          <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setPaste(null)}>Cancelar</Button><Button size="sm" onClick={() => imp(paste)}>Importar</Button></div></div>}
        {ed && <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/5">
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]"><Field label="Artículo"><Input className="font-mono" value={ed.a} onChange={e => setEd({ ...ed, a: e.target.value })} placeholder="132.104" /></Field><Field label="Título"><Input value={ed.t} onChange={e => setEd({ ...ed, t: e.target.value })} /></Field></div>
          <Field label="Capítulo" hint="(opcional)"><Input value={ed.c || ""} onChange={e => setEd({ ...ed, c: e.target.value })} placeholder="Ej: Delitos contra la propiedad" /></Field>
          <Field label="Descripción"><Textarea rows={3} value={ed.d || ""} onChange={e => setEd({ ...ed, d: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setEd(null)}>Cancelar</Button>
            <Button size="sm" icon={<Save />} onClick={() => { const a = ed.a.trim(), t = ed.t.trim(); if (!/^\d{1,3}(\.\d{1,3}){1,2}$/.test(a) || !t) { toast("Completá el artículo (ej: 132.104) y el título", "err"); return; }
              savePenal([...P.filter(x => x.a !== old && x.a !== a), { ...(PENAL_BASE.find(x => x.a === a) || {}), a, t, d: (ed.d || "").trim(), c: (ed.c || "").trim() } as Art].sort(artCmp)); setEd(null); toast("Artículo guardado"); }}>Guardar</Button></div></div>}
        <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold"><Info className="size-4 text-brand-500" />Circunstancias atenuantes, agravantes y de parentesco<ChevronDown className="ml-auto size-4 text-slate-400 transition-transform group-open:rotate-180" /></summary>
          <div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800">
            {(CIRC as [string, [string, string][]][]).map(([h, l]) => <div key={h}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</p><div className="grid gap-2 sm:grid-cols-2">{l.map(([n, d]) => <div key={n} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"><b className="text-sm">{n}</b><p className="text-xs text-slate-500">{d}</p></div>)}</div></div>)}
            <p className="text-xs text-slate-400">Se aplica siempre el artículo base y se anotan en el informe con los hechos que las acreditan.</p>
          </div>
        </details>
        {ord.length ? ord.map(g => (
          <section key={g}>
            <h4 className="sticky top-16 z-10 -mx-4 mb-1 flex items-center gap-2 bg-white/90 px-4 py-2 dark:bg-slate-900/95 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">{g}<span className="rounded-md bg-slate-100 px-1.5 text-slate-500 dark:bg-slate-800">{grp[g].length}</span></h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{grp[g].map(x => (
              <div key={x.a} className="group flex gap-3 py-2.5">
                <b className="w-16 shrink-0 font-mono text-xs leading-6">{x.a}</b>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{x.t}<PenMeta x={x} /></p>{x.d && <p className="mt-0.5 text-xs text-slate-500">{x.d}</p>}</div>
                {can && <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button variant="ghost" size="sm" icon={<Pencil />} aria-label="Editar" onClick={() => { setOld(x.a); setEd({ ...x }); scrollTopApp(); }} />
                  <Button variant="ghost" size="sm" className="text-red-600" icon={<Trash2 />} aria-label="Quitar" onClick={async () => { if (await confirm(`¿Quitar el artículo ${x.a}?`, { danger: true })) savePenal(P.filter(y => y.a !== x.a)); }} />
                </div>}
              </div>))}</div>
          </section>)) : <p className="py-8 text-center text-sm text-slate-400">Nada coincide con «{q}».</p>}
        <p className="pt-2 text-center text-xs text-slate-400">Fuente: Manual del sistema sancionador · Ley 19/2025 (Código Penal) y leyes 25, 26, 27 y 29/2024.</p>
      </div>
    </Card>
  );
}
