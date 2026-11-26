/* Condecoraciones: catálogo de medallas, franjas de servicio y condecoraciones; otorgar y quitar a los agentes */
import { useState } from "react";
import { Award as AwardI, History, ImagePlus, Medal, Pencil, Plus, RotateCcw, Ribbon as RibbonI, Save, Search, Trash2, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { Ribbon } from "@/components/ribbon";
import { AgentCombo } from "@/components/agents";
import { DECOR, DECORX_KEY, allDecor, decorDup, decorImgKey, decorSlug, type Award, type Decor, type DecorX, type Dev, type Tab } from "@/lib/decor";
import { ImagePicker } from "@/components/imagepick";
import { myLevel } from "@/nav";
import { dmy, findAgent, hoyISO, norm, rankES, uid } from "@/lib/domain";
import { LS, ME_ROLES, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { allProfiles, updateProf } from "@/lib/profiles";
import { EntregaTab, HistorialTab } from "./CondEntrega";

const TABS: [Tab, string, typeof Medal][] = [["cond", "Condecoraciones", AwardI], ["med", "Medallas", Medal], ["fra", "Franjas de servicio", RibbonI]];

/* quién tiene cada condecoración (sale de los perfiles) */
export function holders() {
  const m = new Map<string, { n: string; a: Award }[]>();
  Object.entries(allProfiles()).forEach(([n, p]) => ((p.cond || []) as unknown as Award[]).forEach(a => { if (a && a.k) { const l = m.get(a.k) || []; l.push({ n, a }); m.set(a.k, l); } }));
  return m;
}

/* tres apartados: el catálogo, la entrega (con el rol de la ceremonia) y el historial de entregas del departamento */
type View = "cat" | "ent" | "his";
export function Condecoraciones() {
  const [v, setV] = useState<View>("cat");
  return (
    <div className="space-y-5">
      <Segmented value={v} onChange={setV} options={[{ value: "cat" as View, label: "Catálogo", icon: <AwardI /> }, { value: "ent" as View, label: "Entrega de condecoración", icon: <Medal /> }, { value: "his" as View, label: "Historial", icon: <History /> }]} />
      {v === "cat" ? <Catalogo /> : v === "ent" ? <EntregaTab onDone={() => setV("his")} /> : <HistorialTab />}
    </div>);
}

function Catalogo() {
  useStoreVersion();
  const me = useMe(), [tab, setTab] = useState<Tab>("cond"), [q, setQ] = useState(""), [cat, setCat] = useState(""), [openK, setOpen] = useState(""), [ed, setEd] = useState<Decor | "new" | null>(null);
  const H = holders(), ALL = allDecor(), open = openK ? ALL.find(d => d.k === openK) || null : null, canCat = canCatalog(me.r);
  const inTab = ALL.filter(d => d.tab === tab), cats = [...new Set(inTab.map(d => d.c))].sort();
  const qn = norm(q.trim());
  const list = inTab.filter(d => (!cat || d.c === cat) && (!qn || norm(`${d.t} ${d.c} ${d.g} ${d.k}`).includes(qn)));
  const secs = ["Departamentos", "Divisiones"].map(s => ({ s, groups: [...new Set(list.filter(d => d.sec === s).map(d => d.g))].map(g => ({ g, l: list.filter(d => d.sec === s && d.g === g) })) })).filter(x => x.groups.length);
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Segmented size="sm" value={tab} onChange={v => { setTab(v); setCat(""); }} options={TABS.map(([v, l, I]) => ({ value: v, label: `${l} (${ALL.filter(d => d.tab === v).length})`, icon: <I /> }))} />
        <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="h-9 pl-9 text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, categoría o división…" /></div>
        {cats.length > 1 && <Select className="h-9 w-auto text-sm" value={cat} onChange={e => setCat(e.target.value)}><option value="">Todas las categorías</option>{cats.map(c => <option key={c}>{c}</option>)}</Select>}
        {canCat && tab !== "fra" && <Button size="sm" icon={<Plus />} onClick={() => setEd("new")} title="Se agrega en el LSPD, el LSSD y la SAHP a la vez">Nueva condecoración</Button>}
      </Card>
      {!secs.length && <Card><Empty icon={<AwardI />} title="Nada coincide" desc="Probá con otra palabra." /></Card>}
      {secs.map(({ s, groups }) => <section key={s} className="space-y-4">
        {tab === "cond" && <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{s}</h3>}
        {groups.map(({ g, l }) => <div key={g} className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{g} ({l.length})<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {l.map(d => { const n = H.get(d.k)?.length || 0; return (
              <button key={d.k} onClick={() => setOpen(d.k)} title={`${d.t} · ${d.c}${d.d ? `\n${d.d}` : ""}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-brand-400/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
                <span className="shrink-0"><Ribbon d={d} /></span>
                <span className="min-w-0 flex-1"><b className="font-display block truncate text-[13px] font-semibold leading-tight">{d.t}</b>
                  <small className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{d.c}{n > 0 && <span className="font-semibold text-brand-600 dark:text-brand-300"> · {n} {n === 1 ? "condecorado" : "condecorados"}</span>}</small></span>
              </button>); })}
          </div>
        </div>)}
      </section>)}
      {open && <DecorModal d={open} onClose={() => setOpen("")} onEdit={canCat && open.tab !== "fra" ? () => setEd(open) : undefined} />}
      {ed && <DecorEditor d={ed === "new" ? null : ed} tab={tab === "med" ? "med" : "cond"} onClose={() => setEd(null)} onSaved={k => { setEd(null); setOpen(k); }} />}
    </div>
  );
}

function DecorModal({ d, onClose, onEdit }: { d: Decor; onClose: () => void; onEdit?: () => void }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback();
  const list = (holders().get(d.k) || []).sort((a, b) => (b.a.f || "").localeCompare(a.a.f || ""));
  const [ag, setAg] = useState(""), [f, setF] = useState(hoyISO()), [m, setM] = useState("");
  const give = async () => {
    const a = findAgent(ag.trim()); if (!a) { toast("Elegí un agente del roster", "err"); return; }
    if (list.some(x => x.n === a.n) && d.c !== "Acumulativa" && !(await confirm(`${a.n} ya tiene «${d.t}». ¿Otorgarla otra vez?`))) return;
    updateProf(a.n, p => { p.cond = [...((p.cond || []) as unknown as Award[]), { id: uid(), t: d.t, k: d.k, f, m: m.trim(), by: me.n }] as unknown as string[]; });
    toast(`${d.t} otorgada a ${a.n}`); setAg(""); setM("");
  };
  const ini = (n: string) => n.split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <Modal open onClose={onClose} title={d.t} desc={<span className="flex flex-wrap items-center gap-1.5"><span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">{d.g}</span><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{d.c}</span><span>{d.sec}</span></span>} icon={<AwardI />} size="lg"
      footer={<>{onEdit && <Button variant="outline" className="mr-auto" icon={<Pencil />} onClick={onEdit}>Editar</Button>}<Button variant="ghost" icon={<X />} onClick={onClose}>Cerrar</Button></>}>
      {/* cinta y qué reconoce */}
      <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/30">
          {d.img && LS.get(decorImgKey(d.k)) ? <img src={LS.get(decorImgKey(d.k)) || ""} alt="" className="max-h-28 max-w-full rounded-lg object-contain" /> : null}
          <Ribbon d={d} className="h-[38px] w-[132px] shadow-lg" />
          <p className="text-center text-xs text-slate-500 dark:text-slate-400"><b className="block text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{list.length}</b>{list.length === 1 ? "agente la tiene" : "agentes la tienen"}</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Qué reconoce</p>
            <p className="mt-1 text-[14px] leading-relaxed">{d.d || <span className="text-slate-400">Sin descripción cargada.</span>}</p></div>
          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/[.05] p-4"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand-600 dark:text-brand-300">Cómo se gana</p>
            <p className="mt-1 text-[14px] leading-relaxed">{d.h || <span className="text-slate-400">Sin criterio cargado.</span>}</p></div>
        </div>
      </div>
      {/* otorgar */}
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Plus className="size-4 text-brand-500" />Otorgar</p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field label="Agente"><AgentCombo value={ag} onChange={setAg} /></Field>
          <Field label="Fecha"><Input type="date" value={f} onChange={e => setF(e.target.value)} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3"><Field label="Motivo" hint="(opcional)" className="min-w-[14rem] flex-1"><Input value={m} onChange={e => setM(e.target.value)} placeholder="Ej: rescate de rehenes en el Pacific Bank" /></Field>
          <Button icon={<Plus />} onClick={give}>Otorgar</Button></div>
      </div>
      {/* condecorados */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Condecorados · {list.length}</p>
        {list.length ? <div className="grid gap-2 sm:grid-cols-2">{list.map(({ n, a }) => { const ag2 = findAgent(n); return (
          <div key={a.id} className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500/10 text-[11px] font-bold text-brand-700 dark:text-brand-300">{ini(n)}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{ag2 ? `${rankES(ag2.r)} ${n}` : n}</p>
              <p className="truncate text-xs text-slate-500">{a.f ? dmy(a.f) : "Sin fecha"}{a.m ? ` · ${a.m}` : ""}{a.by ? ` · por ${a.by}` : ""}</p></div>
            <button aria-label={`Quitar a ${n}`} title="Quitar" onClick={async () => { if (!(await confirm(`¿Quitarle «${d.t}» a ${n}?`, { danger: true }))) return;
              updateProf(n, p => { p.cond = ((p.cond || []) as unknown as Award[]).filter(x => x.id !== a.id) as unknown as string[]; }); }}
              className="rounded-lg p-1.5 text-slate-400 opacity-60 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
          </div>); })}</div>
          : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-800">Nadie la tiene todavía.</p>}
      </div>
    </Modal>
  );
}

/* catálogo compartido: Capitanía y Jefatura de cualquier departamento (el servidor controla lo mismo) */
const canCatalog = (r?: string) => !!ME_ROLES.six || !!ME_ROLES.admin || myLevel(r) >= 8;
const DEVS: [Dev | "", string][] = [["", "Ninguno"], ["star", "Estrella dorada"], ["starw", "Estrella blanca"], ["oo", "Anillos"], ["heart", "Corazón"]];
const GROUPS = ["Compartidas", "LSPD", "LSSD", "SAHP"];

function DecorEditor({ d, tab, onClose, onSaved }: { d: Decor | null; tab: Tab; onClose: () => void; onSaved: (k: string) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [t, setT] = useState(d?.t || ""), [tb, setTb] = useState<Tab>(d?.tab || tab), [c, setC] = useState(d?.c || ""), [g, setG] = useState(d?.g || "Compartidas");
  const [sec, setSec] = useState<Decor["sec"]>(d?.sec || "Departamentos"), [dev, setDev] = useState<Dev | "">(d?.dev || ""), [desc, setDesc] = useState(d?.d || ""), [h, setH] = useState(d?.h || "");
  const [S, setS] = useState<[string, number][]>(() => (d?.s?.length ? d.s.map(([x, w]) => [x, w] as [string, number]) : [["#1d4ed8", 1], ["#f1f5f9", 0.4], ["#1d4ed8", 1]]));
  const [pick, setPick] = useState(false), k = d?.k || decorSlug(t), [img, setImg] = useState(!!d?.img);
  const ALL = allDecor(), cats = [...new Set(ALL.map(x => x.c))].sort(), groups = [...new Set([...GROUPS, ...ALL.map(x => x.g)])];
  const builtIn = !!d && DECOR.some(x => x.k === d.k), custom = !!d?.x;
  const prev: Decor = { k: "prev", t: t || "Vista previa", c, tab: tb, g, sec, s: S, dev: dev || undefined };
  const list = () => LS.json<DecorX[]>(DECORX_KEY, []);
  const save = () => {
    const tt = t.trim(); if (!tt) { toast("Poné el nombre", "err"); return; } if (!c.trim()) { toast("Poné la categoría", "err"); return; }
    const dup = decorDup(tt, d?.k); if (dup) { toast(`Ya existe «${dup.t}» (${dup.g}): no se duplica`, "err"); return; }
    if (!k) { toast("El nombre necesita letras o números", "err"); return; }
    const x: DecorX = { k, t: tt, c: c.trim(), tab: tb, g: g.trim() || "Compartidas", sec, s: S.filter(([, w]) => w > 0), dev: dev || undefined, d: desc.trim() || undefined, h: h.trim() || undefined, img: img || undefined, by: me.n, at: Date.now() };
    LS.setJSON(DECORX_KEY, [...list().filter(y => y.k !== k), x]); toast(d ? "Condecoración actualizada en los tres departamentos" : "Condecoración agregada en el LSPD, el LSSD y la SAHP"); onSaved(k);
  };
  const drop = async () => {
    if (!d) return; const n = holders().get(d.k)?.length || 0;
    if (!(await confirm(builtIn ? `¿Volver «${d.t}» a como venía de fábrica?` : `¿Borrar «${d.t}» del catálogo de los tres departamentos?${n ? ` La tienen ${n} agentes: la conservan en su ficha.` : ""}`, { danger: !builtIn }))) return;
    LS.setJSON(DECORX_KEY, list().filter(y => y.k !== d.k)); if (!builtIn && LS.get(decorImgKey(d.k))) LS.del(decorImgKey(d.k));
    toast(builtIn ? "Restaurada" : "Borrada del catálogo"); onClose();
  };
  return (
    <Modal open onClose={onClose} title={d ? `Editar · ${d.t}` : "Nueva condecoración"} desc="Se guarda en el catálogo compartido: aparece igual en el LSPD, el LSSD y la SAHP." icon={<AwardI />} size="lg"
      footer={<>{d && (custom || !builtIn) && <Button variant="ghost" className="mr-auto text-red-600 dark:text-red-400" icon={builtIn ? <RotateCcw /> : <Trash2 />} onClick={drop}>{builtIn ? "Restaurar original" : "Borrar"}</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Save />} onClick={save}>Guardar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2"><Input value={t} onChange={e => setT(e.target.value)} placeholder="Ej: Medalla al Mérito Aéreo" /></Field>
        <Field label="Tipo"><Segmented size="sm" value={tb} onChange={v => setTb(v)} options={[{ value: "cond" as Tab, label: "Condecoración" }, { value: "med" as Tab, label: "Medalla" }]} /></Field>
        <Field label="Sección"><Segmented size="sm" value={sec} onChange={v => setSec(v)} options={[{ value: "Departamentos" as Decor["sec"], label: "Departamentos" }, { value: "Divisiones" as Decor["sec"], label: "Divisiones" }]} /></Field>
        <Field label="Categoría"><Input list="dx-cats" value={c} onChange={e => setC(e.target.value)} placeholder="Ej: Bravura, Servicio, Mérito" /><datalist id="dx-cats">{cats.map(x => <option key={x} value={x} />)}</datalist></Field>
        <Field label="Grupo" hint="Compartidas, un departamento o una división"><Input list="dx-grp" value={g} onChange={e => setG(e.target.value)} /><datalist id="dx-grp">{groups.map(x => <option key={x} value={x} />)}</datalist></Field>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex flex-wrap items-center gap-3"><p className="text-sm font-bold">Cinta</p><Ribbon d={prev} className="h-[30px] w-[108px]" />
          <Select className="ml-auto h-9 w-auto text-sm" value={dev} onChange={e => setDev(e.target.value as Dev | "")} aria-label="Distintivo">{DEVS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
        <div className="flex flex-wrap gap-2">{S.map(([col, w], i) => (
          <div key={i} className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-700">
            <input type="color" aria-label={`Color de la franja ${i + 1}`} value={/^#[0-9a-f]{6}$/i.test(col) ? col : "#64748b"} onChange={e => setS(L => L.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0" />
            <Input type="number" min={0.05} max={3} step={0.05} aria-label={`Ancho de la franja ${i + 1}`} value={w} onChange={e => setS(L => L.map((x, j) => (j === i ? [x[0], Math.max(0, Number(e.target.value) || 0)] : x)))} className="h-7 w-16 px-1.5 text-xs" />
            {S.length > 1 && <button aria-label={`Quitar franja ${i + 1}`} onClick={() => setS(L => L.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-500"><X className="size-3.5" /></button>}
          </div>))}
          {S.length < 12 && <Button size="sm" variant="outline" icon={<Plus />} onClick={() => setS(L => [...L, ["#f5c518", 0.5]])}>Franja</Button>}</div>
      </div>
      <Field label="Qué reconoce"><Textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></Field>
      <Field label="Cómo se gana (requisitos)"><Textarea rows={2} value={h} onChange={e => setH(e.target.value)} /></Field>
      <div className="flex flex-wrap items-center gap-3">
        {img && LS.get(decorImgKey(k)) ? <img src={LS.get(decorImgKey(k)) || ""} alt="" className="h-16 rounded-lg object-contain" /> : null}
        <Button size="sm" variant="outline" icon={<ImagePlus />} disabled={!k} onClick={() => setPick(true)}>{img ? "Cambiar imagen" : "Imagen (opcional)"}</Button>
        {img && <Button size="sm" variant="ghost" onClick={() => { setImg(false); if (LS.get(decorImgKey(k))) LS.del(decorImgKey(k)); }}>Quitar imagen</Button>}
      </div>
      <ImagePicker open={pick} title={"Imagen · " + (t || "condecoración")} k={decorImgKey(k)} max={600} alpha onClose={() => setPick(false)}
        onFile={u => { LS.set(decorImgKey(k), u); setImg(true); }} onUrl={() => setImg(true)} />
    </Modal>
  );
}
