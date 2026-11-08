import { useMemo, useRef, useState } from "react";
import { MessagesSquare, Search, ChevronDown, Copy, StickyNote } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Input, Segmented, Select, Textarea } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { DIVS, divAb, dmyToISO, fmtDate, genderOf, getRoster, hoyISO, isoToDMY, lvl, maskDMY, norm, rankES } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const ENT_Q: [string, string?][] = [["¿Cómo se siente dentro del Departamento?"],
  ["¿Tiene algún problema o conflicto con algún miembro del Departamento? De ser así, ¿podría indicarnos con quién y por qué motivo?"],
  ["Una vez superada la etapa de oficial, la carrera se divide en dos ramas: Sargentos y Detectives. ¿En cuál de ellas le gustaría desarrollarse y por qué?"],
  ["¿Pertenece actualmente a alguna división? En caso contrario, ¿a cuál o cuáles le gustaría incorporarse?"],
  ["¿Mantiene alguna relación sentimental, ya sea dentro o fuera del Departamento?", "Recordarle que toda relación sentimental entre miembros del Departamento debe comunicarse a la PSB."],
  ["¿Hay algo más que quiera comentarnos o aportar a esta entrevista?"], ["¿Cuáles son sus aspiraciones dentro del Departamento?"]];
type Ent = { st?: string; rama?: string; f?: string; div?: string[]; nota?: string; por?: string; t?: number };
const ST = [["si", "Realizada", "bg-emerald-500 text-white"], ["no", "No realizada", "bg-red-500 text-white"], ["pen", "Pendiente", "bg-amber-400 text-amber-950"]] as const;
const RAMA = [["sgt", "Sargentos", "bg-pink-500 text-white"], ["det", "Detectives", "bg-purple-500 text-white"], ["ind", "Indeciso", "bg-cyan-500 text-white"]] as const;
const ROW: Record<string, string> = { si: "border-l-emerald-500 bg-emerald-500/[.06]", no: "border-l-red-500 bg-red-500/[.06]", pen: "border-l-amber-400 bg-amber-400/[.08]", "": "border-l-transparent" };

function Tri({ opts, value, onChange, labels }: { opts: readonly (readonly [string, string, string])[]; value?: string; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      {opts.map(([k, l, on]) => (
        <button key={k} type="button" onClick={() => onChange(value === k ? "" : k)}
          className={cn("px-2.5 py-1.5 text-[11.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 [&+&]:border-l [&+&]:border-slate-200 dark:[&+&]:border-slate-700",
            value === k ? on : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800")}>{labels?.[k] || l}</button>
      ))}
    </div>
  );
}

export function Entrevistas() {
  const me = useMe(), { toast } = useFeedback(), copy = useCopy();
  const [ENT, setENT] = useJSON<Record<string, Ent>>("lspdt.entrev", {});
  const [f, setF] = useState("all"), [rf, setRf] = useState(""), [q, setQ] = useState(""), [open, setOpen] = useState<string | null>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const notaT = useRef<number>();
  const A = useMemo(() => getRoster().filter(a => lvl(a.r) > 0 && lvl(a.r) < 7).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n)), [ENT]); // eslint-disable-line
  const g = (n: string) => ENT[n] || {};
  const set = (n: string, x: Partial<Ent>) => {
    const e = { ...ENT[n], ...x, por: me.n, t: Date.now() }, all = { ...ENT, [n]: e };
    if (!e.st && !e.rama && !e.f && !(e.div || []).length && !(e.nota || "").trim()) delete all[n];
    setENT(all);
  };
  const cnt = (fn: (e: Ent) => boolean) => A.filter(a => fn(g(a.n))).length;
  const s = norm(q.trim());
  const L = A.filter(a => { const e = g(a.n); return (!s || norm(a.n).includes(s) || String(a.p || "").includes(s)) && (f === "all" || (f === "vac" ? !e.st : e.st === f)) && (!rf || (rf === "-" ? !e.rama : e.rama === rf)); });
  const ranks = [...new Set(L.map(a => a.r))];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {([[A.length, "Agentes", ""], [cnt(e => e.st === "si"), "Realizadas", "text-emerald-500"], [cnt(e => e.st === "no"), "No realizadas", "text-red-500"], [cnt(e => e.st === "pen"), "Pendientes", "text-amber-500"],
          [cnt(e => !e.st), "Sin marcar", ""], [cnt(e => e.rama === "sgt"), "Sargentos", "text-pink-500"], [cnt(e => e.rama === "det"), "Detectives", "text-purple-500"], [cnt(e => e.rama === "ind"), "Indecisos", "text-cyan-500"]] as const).map(([n, k, c]) => (
          <Card key={k} className="p-3"><p className={cn("text-xl font-bold tabular-nums", c)}>{n}</p><p className="text-[11px] text-slate-500">{k}</p></Card>
        ))}
      </div>
      <Card>
        <CardHeader icon={<MessagesSquare />} title="Preguntas de la entrevista" />
        <CardBody><ol className="grid gap-2 lg:grid-cols-2">{ENT_Q.map(([x, n], i) => (
          <li key={x} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white dark:bg-brand-500">{i + 1}</span>
            <div className="min-w-0 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{x}
              {n && <p className="mt-1.5 flex gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"><span aria-hidden>⚠</span>{n}</p>}</div>
          </li>))}</ol>
          <div className="flex justify-end"><Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(ENT_Q.map(([x, n], i) => `${i + 1}. ${x}${n ? `\n   (${n})` : ""}`).join("\n"))}>Copiar</Button></div></CardBody>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative min-w-[14rem] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar agente o placa…" /></div>
          <Segmented size="sm" value={f} onChange={setF} options={[{ value: "all", label: "Todas" }, { value: "si", label: "Realizadas" }, { value: "no", label: "No realizadas" }, { value: "pen", label: "Pendientes" }, { value: "vac", label: "Sin marcar" }]} />
          <Select className="h-10 w-auto text-sm" value={rf} onChange={e => setRf(e.target.value)}><option value="">Todas las ramas</option><option value="sgt">Sargentos</option><option value="det">Detectives</option><option value="ind">Indecisos</option><option value="-">Sin rama</option></Select>
        </div>
        <p className="px-4 pt-3 text-xs text-slate-400">{L.length} de {A.length} agentes por debajo de Sargento II · se guarda solo y lo ven todos los supervisores</p>
        {!L.length ? <Empty icon={<Search />} title="Nadie coincide con el filtro" /> : ranks.map(r => {
          const gl = L.filter(a => a.r === r), isOpen = !!s || !closed.has(r), gs = (k: string) => gl.filter(x => g(x.n).st === k).length;
          return (
            <div key={r} className="px-2 pb-2 pt-3 sm:px-4">
              <button onClick={() => setClosed(c => { const n = new Set(c); n.has(r) ? n.delete(r) : n.add(r); return n; })} className="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <RankBadge r={r} /><span className="text-xs text-slate-400">{gl.length} {gl.length === 1 ? "agente" : "agentes"}</span>
                <span className="ml-auto flex gap-1 text-[11px] font-bold tabular-nums"><span className="text-emerald-500">{gs("si")}</span>·<span className="text-amber-500">{gs("pen")}</span>·<span className="text-red-500">{gs("no")}</span></span>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && <div className="space-y-1.5">{gl.map(a => {
                const e = g(a.n), isO = open === a.n, dv = e.div || [];
                return (
                  <div key={a.n} className={cn("rounded-xl border border-l-4 border-slate-200 dark:border-slate-800", ROW[e.st || ""])}>
                    <div className="grid items-center gap-2 p-2 sm:grid-cols-[minmax(0,1.3fr)_auto_8.5rem_auto_minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 items-center gap-2.5"><Avatar n={a.n} size={30} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{a.n}</p><p className="truncate text-[11px] text-slate-400">{a.p ? `Placa #${a.p}` : "Sin placa"}{e.t ? ` · ${e.por}` : ""}</p></div></div>
                      <Tri opts={ST} value={e.st} onChange={v => set(a.n, { st: v, ...(v === "si" && !e.f ? { f: hoyISO() } : {}) })} />
                      <div className="flex items-center gap-1"><Input key={e.f || "-"} defaultValue={isoToDMY(e.f)} placeholder="dd/mm/aaaa" inputMode="numeric" className="h-8 px-2 text-xs"
                        onChange={ev => { ev.target.value = maskDMY(ev.target.value); }} onKeyDown={ev => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                        onBlur={ev => { const v = ev.target.value.trim(); if (!v) { if (e.f) set(a.n, { f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · escribila como dd/mm/aaaa", "err"); return; } if (iso !== e.f) { set(a.n, { f: iso }); toast("Fecha guardada · " + isoToDMY(iso)); } }} />
                        <button className="rounded-md px-1.5 py-1 text-[10px] font-bold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10" onClick={() => set(a.n, { f: hoyISO() })}>Hoy</button></div>
                      <Tri opts={RAMA} value={e.rama} onChange={v => set(a.n, { rama: v })} labels={{ ind: genderOf(a.n) === "f" ? "Indecisa" : "Indeciso" }} />
                      <button onClick={() => setOpen(isO ? null : a.n)} className="flex min-w-0 flex-wrap items-center gap-1 text-left">
                        {dv.length ? dv.slice(0, 3).map(d => { const [ab, col] = divAb(d); return <span key={d} title={d} style={{ background: col }} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white">{ab}</span>; }) : <span className="text-xs text-slate-400">Sin divisiones</span>}
                        {dv.length > 3 && <span className="text-[10px] text-slate-400">+{dv.length - 3}</span>}{(e.nota || "").trim() && <StickyNote className="size-3.5 text-amber-500" />}
                      </button>
                      <button onClick={() => setOpen(isO ? null : a.n)} aria-label="Divisiones y notas" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDown className={cn("size-4 transition-transform", isO && "rotate-180")} /></button>
                    </div>
                    {isO && (
                      <div className="grid gap-4 border-t border-slate-200 p-3 dark:border-slate-800 md:grid-cols-2">
                        <div><p className="mb-2 text-xs font-semibold text-slate-500">Divisiones a las que va o le interesan</p>
                          <div className="grid gap-1 text-sm">{DIVS.flatMap(([d, subs]) => [[d, false] as const, ...(subs || []).map(x => [x, true] as const)]).map(([d, sub]) => (
                            <label key={d} className={cn("flex cursor-pointer items-center gap-2", sub && "pl-5 text-xs text-slate-500")}><input type="checkbox" className="accent-brand-600" checked={dv.includes(d)}
                              onChange={ev => { const s2 = new Set(dv); ev.target.checked ? s2.add(d) : s2.delete(d); set(a.n, { div: DIVS.flatMap(x => [x[0], ...(x[1] || [])]).filter(x => s2.has(x)) }); }} />{d}</label>
                          ))}</div></div>
                        <div><p className="mb-2 text-xs font-semibold text-slate-500">Notas de la entrevista</p>
                          <Textarea rows={8} defaultValue={e.nota || ""} placeholder="Respuestas, observaciones, compromisos…" onChange={ev => { const v = ev.target.value; clearTimeout(notaT.current); notaT.current = window.setTimeout(() => set(a.n, { nota: v }), 600); }} />
                          <p className="mt-1.5 text-xs text-slate-400">{e.t ? `Última actualización: ${e.por} · ${fmtDate(e.t)}` : "Sin datos todavía"}</p></div>
                      </div>
                    )}
                  </div>
                );
              })}</div>}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
void rankES;
