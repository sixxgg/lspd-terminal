/* Expedientes personales (LSSD, y cualquier departamento que los use): un expediente por agente con su historial de feedbacks,
   anotaciones positivas y negativas, observaciones e historial de servicio. Se guarda en lspdt[.depto].exp.<agente>; el feedback de los
   Master FTO va aparte (…exp.<agente>.fto) y los feedbacks de incidentes (Supervisores/Capitanía) se suman solos, de solo lectura.
   Quién abre cada expediente (lo controla también el servidor, lib/core.js › expOk):
   · Deputies: Sargento para arriba · Sargentos y Tenientes: Capitanes y Jefatura · Capitanes: Jefatura · Jefatura: Jefatura.
   · Nadie abre el suyo, salvo Jefatura (Comandante para arriba), que ve y edita todos. */
import { useMemo, useState } from "react";
import { ClipboardList, FolderLock, FolderOpen, GraduationCap, Lock, MessageSquareWarning, Pencil, Plus, Search, ShieldCheck, ThumbsDown, ThumbsUp, Trash2, X, Eye } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Avatar, RankBadge, AgentCombo } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { LS, ME_ROLES, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { getRoster, lvl, rankES, uid } from "@/lib/domain";
import { myLevel } from "@/nav";
import { FB_TIPOS } from "@/legacy/feedback";
import { cn } from "@/lib/cn";

type Tipo = "fb" | "pos" | "neg" | "obs" | "serv" | "fto";
type Ent = { id: string; t: number; f: string; by: string; tipo: Tipo; tit?: string; txt: string; ed?: { by: string; t: number } };
type Exp = { e: Ent[] };
const TIPOS: Record<Tipo, [string, typeof ThumbsUp, string]> = {
  fb: ["Feedback", MessageSquareWarning, "#6366f1"], pos: ["Anotación positiva", ThumbsUp, "#22c55e"], neg: ["Anotación negativa", ThumbsDown, "#ef4444"],
  obs: ["Observación", Eye, "#f59e0b"], serv: ["Historial de servicio", ClipboardList, "#0ea5e9"], fto: ["Feedback FTO", GraduationCap, "#14b8a6"],
};
const ALTA: Tipo[] = ["fb", "pos", "neg", "obs", "serv"];
const slugOf = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const kExp = (n: string) => `lspdt.exp.${slugOf(n)}`, kFto = (n: string) => `lspdt.exp.${slugOf(n)}.fto`;
const hoy = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
/* misma regla que el servidor */
const need = (t: number) => (t <= 6 ? 7 : t < 9 ? 9 : 10);
export const canExp = (me: { n: string; r: string }, a: { n: string; r: string }) => !!ME_ROLES.six || myLevel(me.r) >= 10 || (me.n !== a.n && myLevel(me.r) >= need(lvl(a.r)));
const BAND = (l: number) => (l >= 10 ? "Executive Staff · Jefatura" : l >= 8 ? "Command Staff · Capitanía" : l >= 7 ? "Supervisor Staff" : "Deputies");

export function Expedientes() {
  useStoreVersion();
  const me = useMe(), [q, setQ] = useState(""), [sel, setSel] = useState("");
  const all = getRoster().filter(a => a.n);
  const ok = all.filter(a => canExp(me, a)), locked = all.length - ok.length - (all.some(a => a.n === me.n) && !ok.some(a => a.n === me.n) ? 1 : 0);
  const vis = ok.filter(a => !q.trim() || `${a.n} ${a.r} ${a.p || ""}`.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n, "es"));
  const groups = [...new Set(vis.map(a => BAND(lvl(a.r))))].map(g => [g, vis.filter(a => BAND(lvl(a.r)) === g)] as const);
  const cur = ok.find(a => a.n === sel);
  const cnt = (n: string) => (LS.json<Exp>(kExp(n), { e: [] }).e || []).length + (LS.json<Ent[]>(kFto(n), []) || []).length;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <Card className="flex max-h-[calc(100vh-14rem)] min-h-[24rem] flex-col p-0">
        <div className="border-b border-slate-100 p-3 dark:border-slate-800"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar agente, rango o placa" className="pl-9" /></label></div>
        <div className="flex-1 overflow-y-auto">{groups.map(([g, L]) => <div key={g}>
          <p className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-900">{g} <span className="font-mono text-slate-400">{L.length}</span></p>
          {L.map(a => { const n = cnt(a.n); return (
            <button key={a.n} onClick={() => setSel(a.n)} className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left transition", sel === a.n ? "bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
              <Avatar n={a.n} size={30} /><span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{a.n}</b><span className="block truncate text-[11px] text-slate-500">{rankES(a.r)}{a.p ? ` · #${a.p}` : ""}</span></span>
              {n > 0 && <span className="rounded-md bg-slate-100 px-1.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800">{n}</span>}</button>); })}</div>)}
          {!vis.length && <p className="px-4 py-10 text-center text-sm text-slate-400">{ok.length ? "Nadie coincide." : "Tu rango no abre ningún expediente."}</p>}</div>
        {locked > 0 && <p className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-800"><FolderLock className="size-3.5" />{locked} expediente{locked === 1 ? "" : "s"} reservado{locked === 1 ? "" : "s"} a rangos superiores</p>}
      </Card>
      {cur ? <Expediente key={cur.n} a={cur} /> : <Card className="grid min-h-[24rem] place-items-center p-8 text-center text-sm text-slate-400"><div><FolderOpen className="mx-auto mb-2 size-8 opacity-60" />Elegí un agente para abrir su expediente.
        <p className="mx-auto mt-3 max-w-md text-xs">Deputies: Sargento para arriba · Sargentos y Tenientes: Capitanes y Jefatura · Capitanes: Jefatura · Jefatura: Jefatura. Nadie abre su propio expediente, salvo Jefatura.</p></div></Card>}
    </div>);
}

function Expediente({ a }: { a: { n: string; r: string; p?: string; i?: string } }) {
  const me = useMe(), { toast, confirm } = useFeedback(), jef = !!ME_ROLES.six || myLevel(me.r) >= 10;
  const [EX, setEX] = useJSON<Exp>(kExp(a.n), { e: [] }), [F, setF] = useJSON<Ent[]>(kFto(a.n), []), [FB] = useJSON<{ ag: string; tipo: string; tpl: string; texto?: string; fecha: string; por?: string; t?: number; id: string }[]>("lspdt.feedback", []);
  const [tipo, setTipo] = useState<Tipo>("fb"), [tit, setTit] = useState(""), [txt, setTxt] = useState(""), [f, setFecha] = useState(hoy()), [flt, setFlt] = useState<Tipo | "">(""), [ed, setEd] = useState<{ id: string; txt: string } | null>(null);
  const own = EX.e || [];
  /* feedbacks de incidentes (Supervisores / Capitanía) de este agente: se suman de solo lectura */
  const inc: Ent[] = useMemo(() => (Array.isArray(FB) ? FB : []).filter(x => x.ag === a.n).map(x => ({ id: "fb:" + x.id, t: x.t || 0, f: (x.fecha || "").split("/").reverse().join("-"), by: x.por || "—", tipo: "fb" as Tipo,
    tit: `Feedback (incidentes) · ${FB_TIPOS.find(t => t[0] === x.tipo)?.[1] || x.tipo}`, txt: (x.texto || "").replace(/^## .*\n+/, "").slice(0, 1500) })), [FB, a.n]);
  const fto = (Array.isArray(F) ? F : []).map(x => ({ ...x, tipo: "fto" as Tipo }));
  const L = [...own, ...fto, ...inc].sort((x, y) => (y.f || "").localeCompare(x.f || "") || y.t - x.t);
  const vis = L.filter(x => !flt || x.tipo === flt);
  const add = () => { if (!txt.trim()) return; setEX({ e: [{ id: uid(), t: Date.now(), f, by: me.n, tipo, tit: tit.trim() || undefined, txt: txt.trim() }, ...own] }); setTxt(""); setTit(""); toast(`${TIPOS[tipo][0]} agregada al expediente`); };
  const save = (e: Ent) => { if (!ed) return; if (e.tipo === "fto") setF(fto.map(x => (x.id === e.id ? { ...x, txt: ed.txt, ed: { by: me.n, t: Date.now() } } : x))); else setEX({ e: own.map(x => (x.id === e.id ? { ...x, txt: ed.txt, ed: { by: me.n, t: Date.now() } } : x)) }); setEd(null); toast("Entrada editada"); };
  const del = async (e: Ent) => { if (!(await confirm("¿Borrar esta entrada del expediente?", { danger: true }))) return; if (e.tipo === "fto") setF(fto.filter(x => x.id !== e.id)); else setEX({ e: own.filter(x => x.id !== e.id) }); toast("Entrada borrada"); };
  const n = (k: Tipo) => L.filter(x => x.tipo === k).length;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <Avatar n={a.n} size={56} />
        <div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">{a.n}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><RankBadge r={a.r} />{a.p && <span className="font-mono">#{a.p}</span>}{a.i && <span>Ingreso {a.i}</span>}<span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5 text-emerald-500" />Expediente confidencial</span></div></div>
        <div className="flex flex-wrap gap-1.5">{(Object.keys(TIPOS) as Tipo[]).map(k => { const [l, I, c] = TIPOS[k], v = n(k); return (
          <button key={k} onClick={() => setFlt(flt === k ? "" : k)} title={`Filtrar: ${l}`} className={cn("inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition", flt === k ? "shadow-sm" : "border-slate-200 dark:border-slate-700")}
            style={flt === k ? { borderColor: c, background: c + "1a", color: c } : undefined}><I className="size-3.5" style={{ color: c }} />{v}</button>); })}</div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">{ALTA.map(k => { const [l, I, c] = TIPOS[k], on = tipo === k; return (
          <button key={k} onClick={() => setTipo(k)} className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition", on ? "" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}
            style={on ? { borderColor: c, background: c + "1a", color: c } : undefined}><I className="size-4" />{l}</button>); })}</div>
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem]"><Input value={tit} onChange={e => setTit(e.target.value)} placeholder="Título (opcional): ascenso, curso, incidente…" /><Input type="date" value={f} onChange={e => setFecha(e.target.value)} /></div>
        <Textarea value={txt} onChange={e => setTxt(e.target.value)} rows={3} placeholder={tipo === "serv" ? "Ej.: asciende a Deputy Sheriff Bonus I; completa el curso de conducción; entra a la Aero Bureau…" : "Qué pasó, cuándo y qué se espera del agente."} />
        <div className="flex items-center gap-2"><span className="text-[11px] text-slate-400">Queda firmada por {me.n}</span><Button className="ml-auto" icon={<Plus />} onClick={add} disabled={!txt.trim()}>Agregar al expediente</Button></div>
      </Card>

      <div className="space-y-2">
        {flt && <button onClick={() => setFlt("")} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="size-3.5" />Quitar filtro: {TIPOS[flt][0]}</button>}
        {!vis.length && <Card className="p-8 text-center text-sm text-slate-400">Sin entradas{flt ? " de este tipo" : ""} todavía.</Card>}
        {vis.map(e => { const [l, I, c] = TIPOS[e.tipo], ro = e.id.startsWith("fb:"), mine = e.by === me.n; return (
          <Card key={e.id} className="relative overflow-hidden p-4 pl-5">
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: c }} />
            <div className="flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold" style={{ background: c + "1a", color: c }}><I className="size-3.5" />{l}</span>
              {e.tit && <b className="text-[13.5px] text-slate-800 dark:text-white">{e.tit}</b>}
              <span className="ml-auto text-slate-400">{dmy(e.f)} · {e.by}{e.ed ? ` · editada por ${e.ed.by}` : ""}</span>
              {!ro && <span className="flex gap-1">
                <button aria-label="Editar" onClick={() => setEd({ id: e.id, txt: e.txt })} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"><Pencil className="size-3.5" /></button>
                {(mine || jef) && <button aria-label="Borrar" onClick={() => void del(e)} className="rounded p-1 text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button>}</span>}
              {ro && <span title="Viene de Feedback (incidentes)" className="text-slate-300"><Lock className="size-3.5" /></span>}
            </div>
            {ed?.id === e.id ? <div className="mt-2 space-y-2"><Textarea value={ed.txt} onChange={x => setEd({ ...ed, txt: x.target.value })} rows={4} />
              <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEd(null)}>Cancelar</Button><Button size="sm" onClick={() => save(e)}>Guardar</Button></div></div>
              : <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-200">{e.txt}</p>}
          </Card>); })}
      </div>
    </div>);
}

/* Supervisores › Feedback FTO: los Deputy Sheriff Master FTO (y de Sargento para arriba) dejan feedback a quienes están formando.
   Va al expediente del agente como «Feedback FTO». */
export function FtoFeedback() {
  useStoreVersion();
  const me = useMe(), { toast } = useFeedback(), myL = myLevel(me.r);
  /* el FTO ve a quienes están por debajo de Master FTO; de Sargento para arriba, a quienes puede abrir el expediente */
  const L = getRoster().filter(a => a.n && a.n !== me.n && (myL >= 7 ? canExp(me, a) : lvl(a.r) < 4)).sort((a, b) => lvl(a.r) - lvl(b.r) || a.n.localeCompare(b.n, "es"));
  const [ag, setAg] = useState(""), [tipo, setTipo] = useState<"pos" | "neg" | "obs">("obs"), [txt, setTxt] = useState(""), [f, setFecha] = useState(hoy());
  const add = () => { if (!ag || !txt.trim()) return; const k = kFto(ag), cur = LS.json<Ent[]>(k, []);
    LS.setJSON(k, [{ id: uid(), t: Date.now(), f, by: me.n, tipo: "fto", tit: ({ pos: "Positivo", neg: "A mejorar", obs: "Seguimiento" } as const)[tipo], txt: txt.trim() }, ...(Array.isArray(cur) ? cur : [])]);
    setTxt(""); toast(`Feedback FTO guardado en el expediente de ${ag}`); };
  const mine = L.flatMap(a => (LS.json<Ent[]>(kFto(a.n), []) || []).filter(x => x.by === me.n).map(x => ({ ...x, a: a.n }))).sort((x, y) => y.t - x.t).slice(0, 30);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2"><GraduationCap className="size-5 text-teal-500" /><h3 className="text-[15px] font-semibold">Feedback FTO</h3><span className="text-xs text-slate-500">Va al expediente del agente</span></div>
        <AgentCombo names={L.map(a => a.n)} value={ag} onChange={setAg} placeholder="Buscar al agente que estás formando" />
        <div className="flex flex-wrap gap-1.5">{([["obs", "Seguimiento", "#14b8a6"], ["pos", "Positivo", "#22c55e"], ["neg", "A mejorar", "#ef4444"]] as const).map(([k, l, c]) => (
          <button key={k} onClick={() => setTipo(k)} className={cn("rounded-xl border px-3 py-1.5 text-[13px] font-semibold", tipo !== k && "border-slate-200 text-slate-500 dark:border-slate-700")} style={tipo === k ? { borderColor: c, background: c + "1a", color: c } : undefined}>{l}</button>))}
          <Input type="date" value={f} onChange={e => setFecha(e.target.value)} className="ml-auto w-40" /></div>
        <Textarea value={txt} onChange={e => setTxt(e.target.value)} rows={5} placeholder="Cómo se desempeñó en la patrulla: procedimiento, radio, conducción, trato con civiles, qué tiene que mejorar…" />
        <Button className="w-full" icon={<Plus />} onClick={add} disabled={!ag || !txt.trim()}>Guardar feedback</Button>
      </Card>
      <Card className="space-y-2 p-4"><h3 className="text-[15px] font-semibold">Mis últimos feedbacks</h3>
        {!mine.length ? <p className="py-8 text-center text-sm text-slate-400">Todavía no dejaste feedbacks.</p>
          : mine.map(x => <div key={x.id} className="rounded-xl border border-slate-200 p-3 text-[13px] dark:border-slate-700"><p className="flex items-center gap-2 text-xs text-slate-500"><b className="text-slate-800 dark:text-white">{x.a}</b>{x.tit}<span className="ml-auto">{dmy(x.f)}</span></p><p className="mt-1 whitespace-pre-wrap">{x.txt}</p></div>)}
      </Card>
    </div>);
}
