import { useMemo, useRef, useState } from "react";
import { MessagesSquare, Search, ChevronDown, Copy, StickyNote, Building2, Target } from "lucide-react";
import { Button, Card, Empty, Input, Segmented, Select, Textarea, SearchInput } from "@/components/ui";
import { Revisar } from "@/components/revisar";
import { rosterDivs } from "@/lib/units";
import { Avatar, RankBadge } from "@/components/agents";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { ALL_DIVS, divAb, dmyToISO, fmtDate, genderOf, getRoster, hoyISO, isoToDMY, lvl, maskDMY, norm, rankES, type Agent } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const ENT_Q: [string, string?][] = [["¿Cómo se siente dentro del Departamento?"],
  ["¿Tiene algún problema o conflicto con algún miembro del Departamento? De ser así, ¿podría indicarnos con quién y por qué motivo?"],
  ["Una vez superada la etapa de oficial, la carrera se divide en dos ramas: Sargentos y Detectives. ¿En cuál de ellas le gustaría desarrollarse y por qué?"],
  ["¿Pertenece actualmente a alguna división? En caso contrario, ¿a cuál o cuáles le gustaría incorporarse?"],
  ["¿Mantiene alguna relación sentimental, ya sea dentro o fuera del Departamento?", "Recordarle que toda relación sentimental entre miembros del Departamento debe comunicarse a la PSB."],
  ["¿Hay algo más que quiera comentarnos o aportar a esta entrevista?"], ["¿Cuáles son sus aspiraciones dentro del Departamento?"]];
/* div = a las que quiere entrar · act = a las que ya pertenece (además de las que salen del roster de cada división) · res = respuesta corta a cada pregunta */
type Ent = { st?: string; rama?: string; f?: string; div?: string[]; act?: string[]; res?: Record<string, string>; nota?: string; por?: string; t?: number };
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

const ordDiv = (s: Set<string>) => ALL_DIVS.filter(x => s.has(x));
const actOf = (n: string, e: Ent) => ordDiv(new Set([...rosterDivs(n), ...(e.act || [])]));
/* texto para Discord: prolijo, con las divisiones a las que pertenece y a las que quiere entrar */
function entText(a: Agent, e: Ent) {
  const st = ST.find(x => x[0] === e.st)?.[1], rama = RAMA.find(x => x[0] === e.rama)?.[1], act = actOf(a.n, e), dv = (e.div || []).filter(d => !act.includes(d));
  const ico = { si: "✅", no: "❌", pen: "⏳" }[e.st || ""] || "▫️";
  const res = ENT_Q.map(([q], i) => [q, (e.res?.[i] || "").trim()] as const).filter(([, r]) => r);
  const nota = (e.nota || "").trim();
  return [
    `## 🗣️ ENTREVISTA — ${rankES(a.r)} ${a.n}${a.p ? ` (#${a.p})` : ""}`,
    `**Estado:** ${ico} ${st || "Sin marcar"}${e.f ? `  ·  **Fecha:** \`${isoToDMY(e.f)}\`` : ""}`,
    `**Rama de interés:** ${rama ? (e.rama === "ind" && genderOf(a.n) === "f" ? "Indecisa" : rama) : ""}`, "",
    "### 🏢 Divisiones a las que pertenece", act.length ? act.map(d => `> • ${d}`).join("\n") : "> Ninguna", "",
    "### 🎯 Divisiones a las que quiere pertenecer", dv.length ? dv.map(d => `> • ${d}`).join("\n") : "> Ninguna por ahora",
    ...(res.length ? ["", "### 📝 Respuestas", ...res.flatMap(([q, r]) => [`**${q}**`, `> ${r.replace(/\n/g, "\n> ")}`])] : []),
    ...(nota ? ["", "### 🗒️ Notas", nota.split("\n").map(l => "> " + l).join("\n")] : []),
    "", `-# Entrevista registrada por ${e.por || "—"}${e.t ? ` · ${fmtDate(e.t)}` : ""}`,
  ].join("\n");
}
function DivChips({ list, on, lock, onToggle, tone }: { list: string[]; on: string[]; lock?: string[]; onToggle: (d: string) => void; tone: string }) {
  return (
    <div className="flex flex-wrap gap-1">{list.map(d => { const [ab, col] = divAb(d), sel = on.includes(d), lk = lock?.includes(d); return (
      <button key={d} type="button" disabled={lk} onClick={() => onToggle(d)} title={lk ? `${d} · sale del roster de la división` : d}
        className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition", sel ? tone : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:hover:text-slate-200", lk && "cursor-default opacity-90")}>
        <span className="rounded px-1 text-[9.5px] font-bold text-white" style={{ background: col }}>{ab}</span><span className="max-w-[11rem] truncate">{d}</span>{lk && <span className="text-[9px] opacity-70">roster</span>}
      </button>); })}</div>);
}

export function Entrevistas() {
  const me = useMe(), { toast } = useFeedback(), copy = useCopy();
  const [ENT, setENT] = useJSON<Record<string, Ent>>("lspdt.entrev", {});
  const [f, setF] = useState("all"), [rf, setRf] = useState(""), [q, setQ] = useState(""), [open, setOpen] = useState<string | null>(null), [qOpen, setQOpen] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const tmr = useRef<Record<string, number>>({});
  const A = useMemo(() => getRoster().filter(a => lvl(a.r) > 0 && lvl(a.r) < 7).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n)), [ENT]); // eslint-disable-line
  const g = (n: string) => ENT[n] || {};
  const set = (n: string, x: Partial<Ent>) => {
    const e = { ...ENT[n], ...x, por: me.n, t: Date.now() }, all = { ...ENT, [n]: e };
    if (!e.st && !e.rama && !e.f && !(e.div || []).length && !(e.act || []).length && !(e.nota || "").trim() && !Object.values(e.res || {}).some(v => v.trim())) delete all[n];
    setENT(all);
  };
  const later = (k: string, fn: () => void) => { clearTimeout(tmr.current[k]); tmr.current[k] = window.setTimeout(fn, 600); };
  const cnt = (fn: (e: Ent) => boolean) => A.filter(a => fn(g(a.n))).length;
  const s = norm(q.trim());
  const L = A.filter(a => { const e = g(a.n); return (!s || norm(a.n).includes(s) || String(a.p || "").includes(s)) && (f === "all" || (f === "vac" ? !e.st : e.st === f)) && (!rf || (rf === "-" ? !e.rama : e.rama === rf)); });
  const ranks = [...new Set(L.map(a => a.r))];
  const stats = ([[A.length, "Agentes", ""], [cnt(e => e.st === "si"), "Realizadas", "text-emerald-500"], [cnt(e => e.st === "pen"), "Pendientes", "text-amber-500"], [cnt(e => e.st === "no"), "No realizadas", "text-red-500"],
    [cnt(e => !e.st), "Sin marcar", "text-slate-400"], [cnt(e => e.rama === "sgt"), "Sargentos", "text-pink-500"], [cnt(e => e.rama === "det"), "Detectives", "text-purple-500"], [cnt(e => e.rama === "ind"), "Indecisos", "text-cyan-500"]] as const);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap divide-x divide-slate-100 overflow-hidden dark:divide-slate-800">
        {stats.map(([n, k, c]) => <div key={k} className="min-w-[6rem] flex-1 px-3 py-2"><p className={cn("text-lg font-bold leading-tight tabular-nums", c)}>{n}</p><p className="text-[11px] text-slate-500">{k}</p></div>)}
      </Card>
      <Card>
        <button onClick={() => setQOpen(!qOpen)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left">
          <MessagesSquare className="size-4 text-brand-600 dark:text-brand-300" /><span className="flex-1 text-sm font-semibold">Preguntas de la entrevista <span className="font-normal text-slate-400">· {ENT_Q.length}</span></span>
          <span role="button" tabIndex={0} onClick={ev => { ev.stopPropagation(); void copy(ENT_Q.map(([x, n], i) => `${i + 1}. ${x}${n ? `\n   (${n})` : ""}`).join("\n")); }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Copy className="size-3.5" />Copiar</span>
          <ChevronDown className={cn("size-4 text-slate-400 transition-transform", qOpen && "rotate-180")} />
        </button>
        {qOpen && <ol className="grid gap-1.5 border-t border-slate-100 p-3 lg:grid-cols-2 dark:border-slate-800">{ENT_Q.map(([x, n], i) => (
          <li key={x} className="flex gap-2.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[13px] leading-snug dark:bg-slate-800/40">
            <span className="grid size-5 shrink-0 place-items-center rounded-md bg-brand-600 text-[11px] font-bold text-white dark:bg-brand-500">{i + 1}</span>
            <div className="min-w-0 text-slate-700 dark:text-slate-200">{x}{n && <p className="mt-1 text-[11.5px] text-amber-700 dark:text-amber-300">⚠ {n}</p>}</div>
          </li>))}</ol>}
      </Card>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
          <SearchInput className="min-w-[14rem] flex-1 sm:max-w-xs" value={q} onChange={setQ} placeholder="Buscar agente o placa…" />
          <Segmented size="sm" value={f} onChange={setF} options={[{ value: "all", label: "Todas" }, { value: "si", label: "Realizadas" }, { value: "pen", label: "Pendientes" }, { value: "no", label: "No realizadas" }, { value: "vac", label: "Sin marcar" }]} />
          <Select className="h-9 w-auto text-sm" value={rf} onChange={e => setRf(e.target.value)}><option value="">Todas las ramas</option><option value="sgt">Sargentos</option><option value="det">Detectives</option><option value="ind">Indecisos</option><option value="-">Sin rama</option></Select>
          <span className="ml-auto text-[11px] text-slate-400">{L.length} de {A.length} · se guarda solo</span>
        </div>
        {!L.length ? <Empty icon={<Search />} title="Nadie coincide con el filtro" /> : ranks.map(r => {
          const gl = L.filter(a => a.r === r), isOpen = !!s || !closed.has(r), gs = (k: string) => gl.filter(x => g(x.n).st === k).length;
          return (
            <div key={r} className="px-2 pb-2 pt-2.5 sm:px-3">
              <button onClick={() => setClosed(c => { const n = new Set(c); n.has(r) ? n.delete(r) : n.add(r); return n; })} className="mb-1.5 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <RankBadge r={r} /><span className="text-xs text-slate-400">{gl.length} {gl.length === 1 ? "agente" : "agentes"}</span>
                <span className="ml-auto flex gap-1 text-[11px] font-bold tabular-nums"><span className="text-emerald-500">{gs("si")}</span>·<span className="text-amber-500">{gs("pen")}</span>·<span className="text-red-500">{gs("no")}</span></span>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && <div className="space-y-1">{gl.map(a => {
                const e = g(a.n), isO = open === a.n, dv = e.div || [], act = actOf(a.n, e), auto = rosterDivs(a.n), txt = isO ? entText(a, e) : "";
                return (
                  <div key={a.n} className={cn("rounded-xl border border-l-4 border-slate-200 dark:border-slate-800", ROW[e.st || ""], isO && "ring-1 ring-brand-500/30")}>
                    <div className="grid items-center gap-2 px-2 py-1.5 sm:grid-cols-[minmax(0,1.2fr)_auto_8.5rem_auto_minmax(0,1fr)_auto]">
                      <button onClick={() => setOpen(isO ? null : a.n)} className="flex min-w-0 items-center gap-2.5 text-left"><Avatar n={a.n} size={28} /><div className="min-w-0"><p className="truncate text-[13px] font-semibold">{a.n}</p><p className="truncate text-[10.5px] text-slate-400">{a.p ? `#${a.p}` : "Sin placa"}{e.t ? ` · ${e.por}` : ""}</p></div></button>
                      <Tri opts={ST} value={e.st} onChange={v => set(a.n, { st: v, ...(v === "si" && !e.f ? { f: hoyISO() } : {}) })} />
                      <div className="flex items-center gap-1"><Input key={e.f || "-"} defaultValue={isoToDMY(e.f)} placeholder="dd/mm/aaaa" inputMode="numeric" className="h-8 px-2 text-xs"
                        onChange={ev => { ev.target.value = maskDMY(ev.target.value); }} onKeyDown={ev => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                        onBlur={ev => { const v = ev.target.value.trim(); if (!v) { if (e.f) set(a.n, { f: "" }); return; } const iso = dmyToISO(v); if (!iso) { toast("Fecha inválida · escribila como dd/mm/aaaa", "err"); return; } if (iso !== e.f) { set(a.n, { f: iso }); toast("Fecha guardada · " + isoToDMY(iso)); } }} />
                        <button className="rounded-md px-1.5 py-1 text-[10px] font-bold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10" onClick={() => set(a.n, { f: hoyISO() })}>Hoy</button></div>
                      <Tri opts={RAMA} value={e.rama} onChange={v => set(a.n, { rama: v })} labels={{ ind: genderOf(a.n) === "f" ? "Indecisa" : "Indeciso" }} />
                      <button onClick={() => setOpen(isO ? null : a.n)} className="flex min-w-0 flex-wrap items-center gap-1 text-left">
                        {act.slice(0, 3).map(d => { const [ab, col] = divAb(d); return <span key={d} title={`Pertenece: ${d}`} style={{ background: col }} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white">{ab}</span>; })}
                        {dv.filter(d => !act.includes(d)).slice(0, 3).map(d => { const [ab, col] = divAb(d); return <span key={d} title={`Quiere entrar: ${d}`} style={{ borderColor: col, color: col }} className="rounded-md border border-dashed px-1.5 py-0.5 text-[10px] font-bold">→{ab}</span>; })}
                        {!act.length && !dv.length && <span className="text-[11px] text-slate-400">Sin divisiones</span>}{(e.nota || "").trim() && <StickyNote className="size-3.5 text-amber-500" />}
                      </button>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => void copy(entText(a, e))} aria-label={`Copiar entrevista de ${a.n}`} title="Copiar para Discord" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Copy className="size-4" /></button>
                        <button onClick={() => setOpen(isO ? null : a.n)} aria-label="Abrir entrevista" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDown className={cn("size-4 transition-transform", isO && "rotate-180")} /></button>
                      </div>
                    </div>
                    {isO && (
                      <div className="grid gap-3 border-t border-slate-200 p-3 dark:border-slate-800 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <div><p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><Building2 className="size-3.5" />Divisiones a las que pertenece</p>
                            <DivChips list={ALL_DIVS} on={act} lock={auto} tone="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              onToggle={d => { const x = new Set(e.act || []); x.has(d) ? x.delete(d) : x.add(d); set(a.n, { act: ordDiv(x) }); }} /></div>
                          <div><p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300"><Target className="size-3.5" />Divisiones a las que quiere pertenecer</p>
                            <DivChips list={ALL_DIVS.filter(d => !act.includes(d))} on={dv} tone="border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                              onToggle={d => { const x = new Set(dv); x.has(d) ? x.delete(d) : x.add(d); set(a.n, { div: ordDiv(x) }); }} /></div>
                          <div><p className="mb-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">Respuestas <span className="font-normal text-slate-400">(cortas, opcional)</span></p>
                            <div className="space-y-1">{ENT_Q.map(([x], i) => (
                              <label key={i} className="flex items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800" title={x}>{i + 1}</span>
                                <Input defaultValue={e.res?.[i] || ""} title={x} placeholder={x.length > 64 ? x.slice(0, 62) + "…" : x} className="h-8 text-xs"
                                  onChange={ev => { const v = ev.target.value; later(a.n + i, () => set(a.n, { res: { ...(ENT[a.n]?.res || {}), [i]: v } })); }} /></label>))}</div></div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">Notas de la entrevista</p>
                          <Textarea rows={4} defaultValue={e.nota || ""} placeholder="Observaciones, compromisos, lo que haga falta…" onChange={ev => { const v = ev.target.value; later(a.n + "n", () => set(a.n, { nota: v })); }} />
                          <pre className="scrollbar-thin max-h-56 flex-1 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-mono text-[11.5px] leading-relaxed text-slate-200">{txt}</pre>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <Revisar text={txt} err={[!e.st && "estado de la entrevista", e.st === "si" && !e.f && "fecha"].filter(Boolean) as string[]}
                              pen={dv.length ? undefined : ["divisiones a las que quiere entrar"]} className="min-w-0 flex-1" />
                            <Button size="sm" icon={<Copy />} onClick={() => void copy(entText(a, e))}>Copiar para Discord</Button>
                          </div>
                          <p className="text-[11px] text-slate-400">{e.t ? `Última actualización: ${e.por} · ${fmtDate(e.t)}` : "Sin datos todavía"}</p>
                        </div>
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
