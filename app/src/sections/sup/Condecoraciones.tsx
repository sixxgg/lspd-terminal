/* Condecoraciones: catálogo de medallas, franjas de servicio y condecoraciones; otorgar y quitar a los agentes */
import { useState } from "react";
import { Award as AwardI, Medal, Plus, Ribbon as RibbonI, Search, Trash2, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, Segmented, Select } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { Ribbon } from "@/components/ribbon";
import { AgentCombo } from "@/components/agents";
import { DECOR, type Award, type Decor, type Tab } from "@/lib/decor";
import { findAgent, norm, rankES, uid , dmy } from "@/lib/domain";
import { useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { allProfiles, updateProf } from "@/lib/profiles";

const TABS: [Tab, string, typeof Medal][] = [["cond", "Condecoraciones", AwardI], ["med", "Medallas", Medal], ["fra", "Franjas de servicio", RibbonI]];
const today = () => new Date().toISOString().slice(0, 10);

/* quién tiene cada condecoración (sale de los perfiles) */
export function holders() {
  const m = new Map<string, { n: string; a: Award }[]>();
  Object.entries(allProfiles()).forEach(([n, p]) => ((p.cond || []) as unknown as Award[]).forEach(a => { if (a && a.k) { const l = m.get(a.k) || []; l.push({ n, a }); m.set(a.k, l); } }));
  return m;
}

export function Condecoraciones() {
  useStoreVersion();
  const [tab, setTab] = useState<Tab>("cond"), [q, setQ] = useState(""), [cat, setCat] = useState(""), [open, setOpen] = useState<Decor | null>(null);
  const H = holders();
  const inTab = DECOR.filter(d => d.tab === tab), cats = [...new Set(inTab.map(d => d.c))].sort();
  const qn = norm(q.trim());
  const list = inTab.filter(d => (!cat || d.c === cat) && (!qn || norm(`${d.t} ${d.c} ${d.g} ${d.k}`).includes(qn)));
  const secs = ["Departamentos", "Divisiones"].map(s => ({ s, groups: [...new Set(list.filter(d => d.sec === s).map(d => d.g))].map(g => ({ g, l: list.filter(d => d.sec === s && d.g === g) })) })).filter(x => x.groups.length);
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Segmented size="sm" value={tab} onChange={v => { setTab(v); setCat(""); }} options={TABS.map(([v, l, I]) => ({ value: v, label: `${l} (${DECOR.filter(d => d.tab === v).length})`, icon: <I /> }))} />
        <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="h-9 pl-9 text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, categoría o división…" /></div>
        {cats.length > 1 && <Select className="h-9 w-auto text-sm" value={cat} onChange={e => setCat(e.target.value)}><option value="">Todas las categorías</option>{cats.map(c => <option key={c}>{c}</option>)}</Select>}
      </Card>
      {!secs.length && <Card><Empty icon={<AwardI />} title="Nada coincide" desc="Probá con otra palabra." /></Card>}
      {secs.map(({ s, groups }) => <section key={s} className="space-y-4">
        {tab === "cond" && <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{s}</h3>}
        {groups.map(({ g, l }) => <div key={g} className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{g} ({l.length})<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {l.map(d => { const n = H.get(d.k)?.length || 0; return (
              <button key={d.k} onClick={() => setOpen(d)} title={`${d.t} · ${d.c}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-brand-400/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
                <span className="shrink-0"><Ribbon d={d} /></span>
                <span className="min-w-0 flex-1"><b className="font-display block truncate text-[13px] font-semibold leading-tight">{d.t}</b>
                  <small className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{d.c}{n > 0 && <span className="font-semibold text-brand-600 dark:text-brand-300"> · {n} {n === 1 ? "condecorado" : "condecorados"}</span>}</small></span>
              </button>); })}
          </div>
        </div>)}
      </section>)}
      {open && <DecorModal d={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DecorModal({ d, onClose }: { d: Decor; onClose: () => void }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback();
  const list = (holders().get(d.k) || []).sort((a, b) => (b.a.f || "").localeCompare(a.a.f || ""));
  const [ag, setAg] = useState(""), [f, setF] = useState(today()), [m, setM] = useState("");
  const give = async () => {
    const a = findAgent(ag.trim()); if (!a) { toast("Elegí un agente del roster", "err"); return; }
    if (list.some(x => x.n === a.n) && d.c !== "Acumulativa" && !(await confirm(`${a.n} ya tiene «${d.t}». ¿Otorgarla otra vez?`))) return;
    updateProf(a.n, p => { p.cond = [...((p.cond || []) as unknown as Award[]), { id: uid(), t: d.t, k: d.k, f, m: m.trim(), by: me.n }] as unknown as string[]; });
    toast(`${d.t} otorgada a ${a.n}`); setAg(""); setM("");
  };
  return (
    <Modal open onClose={onClose} title={d.t} desc={`${d.c} · ${d.g}`} icon={<AwardI />} size="lg">
      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40"><Ribbon d={d} className="h-[34px] w-[120px]" /><p className="text-sm text-slate-500 dark:text-slate-400">{list.length ? `${list.length} ${list.length === 1 ? "agente la tiene" : "agentes la tienen"}.` : "Nadie la tiene todavía."}</p></div>
      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Otorgar</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field label="Agente"><AgentCombo value={ag} onChange={setAg} /></Field>
          <Field label="Fecha"><Input type="date" value={f} onChange={e => setF(e.target.value)} /></Field>
        </div>
        <Field label="Motivo" hint="(opcional)" className="mt-3"><Input value={m} onChange={e => setM(e.target.value)} placeholder="Ej: rescate de rehenes en el Pacific Bank" /></Field>
        <div className="mt-3 flex justify-end"><Button icon={<Plus />} onClick={give}>Otorgar</Button></div>
      </div>
      <div className="space-y-2">
        {list.map(({ n, a }) => { const ag2 = findAgent(n); return (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{ag2 ? `${rankES(ag2.r)} ${n}` : n}</p>
              <p className="truncate text-xs text-slate-500">{a.f ? dmy(a.f) : "Sin fecha"}{a.m ? ` · ${a.m}` : ""}{a.by ? ` · otorgada por ${a.by}` : ""}</p></div>
            <button aria-label={`Quitar a ${n}`} title="Quitar" onClick={async () => { if (!(await confirm(`¿Quitarle «${d.t}» a ${n}?`, { danger: true }))) return;
              updateProf(n, p => { p.cond = ((p.cond || []) as unknown as Award[]).filter(x => x.id !== a.id) as unknown as string[]; }); }}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
          </div>); })}
        {!list.length && <p className="py-4 text-center text-sm text-slate-400">Sin condecorados.</p>}
      </div>
      <div className="flex justify-end"><Button variant="ghost" icon={<X />} onClick={onClose}>Cerrar</Button></div>
    </Modal>
  );
}
