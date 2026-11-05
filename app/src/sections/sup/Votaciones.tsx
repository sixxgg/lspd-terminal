import { useEffect, useRef, useState } from "react";
import { Vote, Plus, ThumbsUp, ThumbsDown, MinusCircle, Send, Trash2, Check, X, ArrowRight, FileSignature, Download, Upload, MessagesSquare } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { fmtDate, findAgent, rankES, uid } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { addMov, goTo } from "@/lib/profiles";
import { cn } from "@/lib/cn";
import { eligibleFor, rankOptionsFor } from "./Ascensos";

type V = "favor" | "contra" | "abst";
type Msg = { a?: string; r?: string; m: string; t: number; sys?: 1 };
export type Prop = { id: string; tipo: "asc" | "desc"; ag: { n: string; r: string; p?: string }; nr: string; motivo: string; autor: { n: string; r: string }; t: number;
  estado: "abierta" | "aprobada" | "rechazada"; votos: Record<string, { v: V; r: string; t: number }>; chat: Msg[]; cierre?: { n: string; r: string; t: number } };
export const tally = (p: Prop) => { const c = { favor: 0, contra: 0, abst: 0 }; Object.values(p.votos || {}).forEach(v => c[v.v]++); return c; };
const VOPT: [V, string, typeof ThumbsUp, string, string][] = [
  ["favor", "A favor", ThumbsUp, "text-emerald-600 dark:text-emerald-400", "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500"],
  ["contra", "En contra", ThumbsDown, "text-red-600 dark:text-red-400", "bg-red-600 text-white border-red-600 dark:bg-red-500 dark:border-red-500"],
  ["abst", "Abstención", MinusCircle, "text-slate-500", "bg-slate-600 text-white border-slate-600"]];
export const TipoBadge = ({ t }: { t: string }) => <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", t === "asc" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300")}>{t === "asc" ? "Ascenso" : "Descenso"}</span>;
export const EstadoBadge = ({ e }: { e: string }) => <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", e === "abierta" ? "bg-amber-400/15 text-amber-700 dark:text-amber-300" : e === "aprobada" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300")}>{e}</span>;

export function Votaciones() {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [VOTES, setVotes] = useJSON<Prop[]>("lspdt.votes", []);
  const [fil, setFil] = useState("open"), [cur, setCur] = useState<string | null>(() => (window as unknown as { __vcur?: string }).__vcur || null), [nuevo, setNuevo] = useState(false);
  useEffect(() => { (window as unknown as { __vcur?: string }).__vcur = undefined; }, []);
  const save = (fn: (l: Prop[]) => Prop[]) => setVotes(fn(VOTES.map(p => ({ ...p }))));
  const upd = (id: string, fn: (p: Prop) => void) => save(l => l.map(p => { if (p.id !== id) return p; const x = structuredClone(p); fn(x); return x; }));
  const list = VOTES.slice().sort((a, b) => b.t - a.t).filter(p => fil === "all" || (fil === "open" ? p.estado === "abierta" : p.estado !== "abierta"));
  const p = VOTES.find(x => x.id === cur);
  const fileRef = useRef<HTMLInputElement>(null);

  const exp = () => { const b = new Blob([JSON.stringify(VOTES, null, 1)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `votaciones-lspd-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast("Archivo exportado"); };
  const imp = (f: File) => { const r = new FileReader(); r.onload = () => { try {
    const inc = JSON.parse(String(r.result)) as Prop[]; if (!Array.isArray(inc)) throw 0; let nuevos = 0; const V2 = structuredClone(VOTES);
    for (const q of inc) { const x = V2.find(v => v.id === q.id); if (!x) { V2.push(q); nuevos++; continue; }
      for (const [n, v] of Object.entries(q.votos || {})) if (!x.votos[n] || x.votos[n].t < v.t) x.votos[n] = v;
      const key = (m: Msg) => m.t + "|" + (m.a || "") + "|" + m.m, have = new Set((x.chat || []).map(key));
      (q.chat || []).forEach(m => { if (!have.has(key(m))) x.chat.push(m); }); x.chat.sort((a, b) => a.t - b.t);
      if (x.estado === "abierta" && q.estado !== "abierta") { x.estado = q.estado; x.cierre = q.cierre; } }
    setVotes(V2); toast(`Importado · ${nuevos} propuestas nuevas`); } catch { toast("El archivo no es válido", "err"); } }; r.readAsText(f); };

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)]">
        <div className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Button className="flex-1" icon={<Plus />} onClick={() => { setNuevo(true); setCur(null); }}>Nueva propuesta</Button>
            <Button variant="outline" size="icon" aria-label="Exportar" title="Exportar" onClick={exp}><Download /></Button>
            <Button variant="outline" size="icon" aria-label="Importar" title="Importar" onClick={() => fileRef.current?.click()}><Upload /></Button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) imp(f); e.target.value = ""; }} />
          </div>
          <Segmented size="sm" className="w-full [&>button]:flex-1" value={fil} onChange={setFil} options={[{ value: "open", label: "Abiertas" }, { value: "closed", label: "Cerradas" }, { value: "all", label: "Todas" }]} />
        </div>
        <div className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto p-2">
          {list.length ? list.map(x => { const c = tally(x); return (
            <button key={x.id} onClick={() => { setCur(x.id); setNuevo(false); }}
              className={cn("w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", x.id === cur ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
              <div className="flex items-center gap-1.5"><TipoBadge t={x.tipo} /><EstadoBadge e={x.estado} /></div>
              <p className="mt-1.5 truncate text-sm font-semibold">{x.ag.n}</p>
              <p className="flex items-center gap-1 text-xs text-slate-500">{rankES(x.ag.r)}<ArrowRight className="size-3" />{rankES(x.nr)}</p>
              <p className="mt-1 text-[11px] text-slate-400"><span className="text-emerald-600 dark:text-emerald-400">{c.favor} a favor</span> · <span className="text-red-600 dark:text-red-400">{c.contra} en contra</span> · {(x.chat || []).filter(m => !m.sys).length} mensajes</p>
            </button>); })
            : <p className="px-4 py-10 text-center text-sm text-slate-400">No hay propuestas {fil === "open" ? "abiertas" : fil === "closed" ? "cerradas" : ""}.</p>}
        </div>
      </Card>
      {nuevo ? <NewProp onCancel={() => setNuevo(false)} onCreate={x => { setVotes([...VOTES, x]); setNuevo(false); setCur(x.id); setFil("open"); toast("Votación abierta"); }} />
        : !p ? <Card><Empty icon={<Vote />} title="Elegí una propuesta" desc="Seleccioná una de la lista o creá una nueva." /></Card>
        : <Detail key={p.id} p={p} upd={fn => upd(p.id, fn)} del={async () => { if (!(await confirm("¿Eliminar la propuesta y su debate?", { danger: true, ok: "Eliminar" }))) return; save(l => l.filter(x => x.id !== p.id)); setCur(null); }}
            resolve={async (e: "aprobada" | "rechazada") => {
              if (!(await confirm(`¿Marcar la propuesta como ${e}?`, { danger: e === "rechazada", ok: e === "aprobada" ? "Aprobar" : "Rechazar" }))) return;
              upd(p.id, x => { x.estado = e; x.cierre = { n: me.n, r: me.r, t: Date.now() }; (x.chat = x.chat || []).push({ sys: 1, m: `Propuesta ${e} por ${me.r} ${me.n}`, t: Date.now() }); });
              if (e === "aprobada") addMov(p.ag.n, { tipo: p.tipo, de: p.ag.r, a: p.nr, via: "Votación aprobada" }, me);
            }} />}
    </div>
  );
}

function Detail({ p, upd, del, resolve }: { p: Prop; upd: (fn: (p: Prop) => void) => void; del: () => void; resolve: (e: "aprobada" | "rechazada") => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [msg, setMsg] = useState(""); const box = useRef<HTMLDivElement>(null);
  const c = tally(p), tot = c.favor + c.contra + c.abst || 1, mine = p.votos?.[me.n]?.v, open = p.estado === "abierta", pct = (n: number) => Math.round((n * 100) / tot);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [p.chat?.length]);
  const send = () => { const v = msg.trim(); if (!v) return; upd(x => { (x.chat = x.chat || []).push({ a: me.n, r: me.r, m: v, t: Date.now() }); }); setMsg(""); };
  const gen = () => { const a = findAgent(p.ag.n); if (!a || !eligibleFor(a, p.tipo, me.l)) { toast("El agente no está dentro de lo que tu rango puede gestionar", "err"); return; } goTo("sup", "asc", { tipo: p.tipo, n: p.ag.n, nr: p.nr }); };
  return (
    <div className="space-y-5">
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start gap-4">
            <Avatar n={p.ag.n} size={56} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><TipoBadge t={p.tipo} /><EstadoBadge e={p.estado} /></div>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{p.ag.n}{p.ag.p && <span className="ml-2 font-mono text-sm font-normal text-slate-400">#{p.ag.p}</span>}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><RankBadge r={p.ag.r} /><ArrowRight className="size-4 text-slate-400" /><RankBadge r={p.nr} /></div>
              <p className="mt-2 text-xs text-slate-500">Propuesta por {rankES(p.autor.r)} {p.autor.n} · {fmtDate(p.t)}{p.cierre && <> · Cerrada por {rankES(p.cierre.r)} {p.cierre.n} · {fmtDate(p.cierre.t)}</>}</p>
            </div>
          </div>
          {p.motivo && <blockquote className="mt-4 rounded-xl border-l-4 border-brand-400 bg-slate-50 px-4 py-3 text-sm italic text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">“{p.motivo}”</blockquote>}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {VOPT.map(([k, l, I, col]) => <div key={k} className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-800"><p className={cn("text-2xl font-bold tabular-nums", col)}>{c[k]}</p><p className="flex items-center justify-center gap-1 text-[11px] text-slate-500"><I className="size-3" />{l}</p></div>)}
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <i className="bg-emerald-500 transition-all" style={{ width: pct(c.favor) + "%" }} /><i className="bg-red-500 transition-all" style={{ width: pct(c.contra) + "%" }} /><i className="bg-slate-400 transition-all" style={{ width: pct(c.abst) + "%" }} />
          </div>
          <p className="mb-2 mt-5 text-center text-xs font-semibold text-slate-500">{open ? "Tu voto" : "Votación cerrada"}</p>
          <div className="grid grid-cols-3 gap-2">
            {VOPT.map(([k, l, I, , on]) => (
              <button key={k} disabled={!open} onClick={() => upd(x => { x.votos = x.votos || {}; if (x.votos[me.n]?.v === k) delete x.votos[me.n]; else x.votos[me.n] = { v: k, r: me.r, t: Date.now() }; })}
                className={cn("flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50",
                  mine === k ? on : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")}><I className="size-4" />{l}</button>
            ))}
          </div>
          {Object.keys(p.votos || {}).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">{Object.entries(p.votos).map(([n, v]) => (
              <span key={n} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", v.v === "favor" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : v.v === "contra" ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                {n} · {v.v === "favor" ? "a favor" : v.v === "contra" ? "en contra" : "abstención"}</span>))}</div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {open && me.l < 8 && <span className="mr-auto text-xs text-slate-400">La resolución la toma Capitanía (Teniente o superior).</span>}
            {(p.autor.n === me.n || me.l >= 8) && <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={del}>Eliminar</Button>}
            {p.estado === "aprobada" && <Button variant="outline" size="sm" icon={<FileSignature />} onClick={gen}>Generar /me y /do</Button>}
            {open && me.l >= 8 && <><Button variant="danger" size="sm" icon={<X />} onClick={() => resolve("rechazada")}>Rechazar</Button><Button size="sm" icon={<Check />} onClick={() => resolve("aprobada")}>Aprobar propuesta</Button></>}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<MessagesSquare />} title="Debate" desc={(n => `${n} ${n === 1 ? "mensaje" : "mensajes"}`)((p.chat || []).filter(m => !m.sys).length)} />
        <div ref={box} className="scrollbar-thin max-h-[26rem] space-y-3 overflow-y-auto px-5 py-4">
          {(p.chat || []).length ? p.chat.map((m, i) => m.sys
            ? <p key={i} className="text-center text-[11px] text-slate-400">{m.m} · {fmtDate(m.t)}</p>
            : <div key={i} className={cn("flex gap-2.5", m.a === me.n && "flex-row-reverse")}>
                <Avatar n={m.a || ""} size={28} />
                <div className={cn("max-w-[80%]", m.a === me.n && "text-right")}>
                  <p className="text-[11px] text-slate-400"><b className="font-semibold text-slate-600 dark:text-slate-300">{m.a}</b> · {rankES(m.r)} · {fmtDate(m.t)}</p>
                  <p className={cn("mt-0.5 inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-left text-sm", m.a === me.n ? "rounded-tr-sm bg-brand-600 text-white dark:bg-brand-500" : "rounded-tl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100")}>{m.m}</p>
                </div>
              </div>)
            : <p className="py-6 text-center text-sm text-slate-400">Sin mensajes todavía. Abrí el debate.</p>}
        </div>
        <div className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <Input value={msg} disabled={!open} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={open ? "Escribí tu opinión y apretá Enter…" : "La votación está cerrada"} />
          <Button disabled={!open || !msg.trim()} icon={<Send />} onClick={send}>Enviar</Button>
        </div>
      </Card>
    </div>
  );
}

function NewProp({ onCancel, onCreate }: { onCancel: () => void; onCreate: (p: Prop) => void }) {
  const me = useMe(), { toast } = useFeedback();
  const [tipo, setTipo] = useState<"asc" | "desc">("asc"), [ag, setAg] = useState(""), [nr, setNr] = useState(""), [mot, setMot] = useState("");
  const a = ag ? findAgent(ag) : null, opts = a ? rankOptionsFor(a, tipo, me.l) : [], r = opts.includes(nr) ? nr : opts[0] || "";
  return (
    <Card>
      <CardHeader icon={<Plus />} title="Nueva propuesta" desc="Se abre una votación con debate para todos los supervisores." />
      <CardBody>
        <Segmented value={tipo} onChange={v => { setTipo(v); setAg(""); }} options={[{ value: "asc", label: "Ascenso" }, { value: "desc", label: "Descenso" }]} />
        <Field label="Agente">
          {a ? <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><Avatar n={a.n} size={36} /><div className="flex-1"><p className="font-semibold">{a.n}</p><RankBadge r={a.r} /></div><button className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => setAg("")}>Cambiar</button></div>
            : <AgentPicker value={ag} onChange={setAg} filter={x => eligibleFor(x, tipo, me.l)} empty="No hay agentes que puedas proponer con tu rango" />}
        </Field>
        <Field label="Rango propuesto"><Select value={r} disabled={!a} onChange={e => setNr(e.target.value)}>{a ? opts.map(o => <option key={o} value={o}>{rankES(o)}</option>) : <option>Elegí un agente</option>}</Select></Field>
        <Field label="Motivo"><Textarea rows={4} value={mot} onChange={e => setMot(e.target.value)} placeholder="Por qué proponés este movimiento…" /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button icon={<Vote />} onClick={() => { if (!a) { toast("Elegí un agente", "err"); return; }
            onCreate({ id: uid(), tipo, ag: { n: a.n, r: a.r, p: a.p }, nr: r, motivo: mot.trim(), autor: { n: me.n, r: me.r }, t: Date.now(), estado: "abierta", votos: {}, chat: [] }); }}>Abrir votación</Button>
        </div>
      </CardBody>
    </Card>
  );
}
