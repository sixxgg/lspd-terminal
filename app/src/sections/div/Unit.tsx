import { DivAdmin, Uniformidad, divTabs, type DivTab, type URole } from "./DivTools";
import { Comunicados } from "./Comunicados";
import { lazy, Suspense, useMemo, useState } from "react";
import { Megaphone, Shirt, Users, Pencil, Check, Plus, X, ClipboardPen, ListChecks, GraduationCap, Search, Copy, Trash2, Save, RotateCcw, Bell, ArrowUpRight, Gavel, FileCheck2, BookMarked, Radio, Vote, History, Dog, ClipboardCheck, MessageCircle, Trophy, Loader2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Empty, Field, Input, Segmented, Select } from "@/components/ui";
import { AgentCombo, AgentPicker, Avatar } from "@/components/agents";
import { Helicopter } from "@/components/icons";
import { DiscordOutput, useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { Col, Split } from "@/components/layout";
import { LUGARES, fmtDate, findAgent, lvl, norm, rankES, uid } from "@/lib/domain";
import { LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { K9_PL, MD_CALLS, UNITS, insRole, isUCoord, isUMem, uMap, uRole, uSaveMap, uTop, type UnitKey } from "@/lib/units";
import { unitPalette } from "@/lib/divisions";
import { cn } from "@/lib/cn";
import { Psb, dcIdOf } from "./Psb";
import { T1080 } from "@/sections/sup/T1080";
import { Instrucciones } from "./Instrucciones";
const MetroExam = lazy(() => import("./Metro").then(m => ({ default: m.MetroExam })));
const Lazy = ({ children }: { children: React.ReactNode }) => <Suspense fallback={<div className="grid min-h-[30vh] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>}>{children}</Suspense>;

/* METRO: indicativo de radio de cada integrante */
const callOf = (n: string) => ({ ...MD_CALLS, ...LS.json<Record<string, string>>("lspdt.mdCalls", {}) })[n] || "";
/* K-9: perro de cada handler y su especialidad */
const K9_ESP = ["Armas", "Drogas", "Explosivos", "Búsqueda", "Dinero"];
type Dog = { dog: string; esp: string };
const k9Dogs = () => LS.json<Record<string, Dog>>("lspdt.k9Dogs", {});
function DogEd({ n, can }: { n: string; can: boolean }) {
  const d = k9Dogs()[n] || { dog: "", esp: "" }, { toast } = useFeedback();
  const save = (p: Partial<Dog>) => { const M = k9Dogs(), x = { ...d, ...p }; if (x.dog === d.dog && x.esp === d.esp) return; if (!x.dog && !x.esp) delete M[n]; else M[n] = x; LS.setJSON("lspdt.k9Dogs", M); toast("K-9 guardado"); };
  if (!can) return d.dog || d.esp ? <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"><Dog className="size-3" />{d.dog || "Sin nombre"}{d.esp && ` · ${d.esp}`}</span> : null;
  return <span className="inline-flex items-center gap-1"><Dog className="size-3.5 text-emerald-500" />
    <Input key={d.dog} defaultValue={d.dog} placeholder="Nombre del perro" className="h-7 w-32 text-xs" onBlur={e => save({ dog: e.target.value.trim() })} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
    <Select value={d.esp} onChange={e => save({ esp: e.target.value })} className="h-7 w-auto py-0 text-xs"><option value="">Especialidad…</option>{K9_ESP.map(x => <option key={x}>{x}</option>)}</Select></span>;
}
const INS_TIPOS: Record<UnitKey, string[]> = { asd: ["Vuelo táctico", "Búsqueda y rescate (SAR)", "Emergencias críticas", "Uso de dron", "Apoyo a persecución"],
  k9: ["Detección de drogas", "Detección de armas", "Detección de explosivos", "Detección de dinero", "Búsqueda y rastreo", "Obediencia"],
  psb: ["Procedimiento de investigación", "Entrevistas", "Redacción de expedientes"], md: ["Entrada táctica", "Tiro", "Conducción táctica", "Rescate de rehenes", "Persecución marítima y buceo"] };

type Log = { id: string; t: number; por2: string; ag: string[]; veh?: string; ae?: string; mat?: string; mo: string; mox?: string; perm?: string; por?: string; dog?: string; zona?: string };
type F = Omit<Log, "id" | "t" | "por2"> & { mox: string; perm: string; por: string; mat: string; dog: string; zona: string; veh: string };
const uAg = (n: string) => findAgent(n) || { n, p: K9_PL[n] || "", r: "", fuera: true as const };
const uLog = (k: UnitKey) => { const l = LS.json<Log[]>(UNITS[k].lk, []); return Array.isArray(l) ? l : []; };
const vehL = (k: UnitKey, v?: string) => { const u = UNITS[k]; if (!u.veh) return ""; const o = u.veh.o.find(x => x[0] === v) || u.veh.o[0]; return `${o[1]} (${o[2]})`; };
function uText(k: UnitKey, F: Partial<F> & { ag: string[]; mo: string }) {
  const u = UNITS[k], ag = F.ag.filter(Boolean);
  let s = ag.length ? ag.map(n => { const a = findAgent(n); return `**Nombre del Agente:** ${n}\n**N° de placa:** ${(a && a.p) || "—"}`; }).join("\n") : "**Nombre del Agente:** —\n**N° de placa:** —";
  if (u.veh) s += `\n**Aeronave que se usó:** ${vehL(k, F.veh)}${F.mat ? ` [${F.mat}]` : ""}`;
  if (u.dog) { const e = Object.values(k9Dogs()).find(d => d.dog && d.dog === F.dog)?.esp; s += `\n**K-9:** ${F.dog || "—"}${e ? ` (${e})` : ""}`; }
  if (u.zona) s += `\n**Zona:** ${F.zona || "—"}`;
  s += `\n**Motivo:** ${F.mo === "Otro" ? F.mox || "—" : F.mo}${F.mo !== "Otro" && F.mox ? ` — ${F.mox}` : ""}`;
  s += `\n**Permiso:** ${F.perm ? `${F.perm}${F.por ? ` (autorizado por ${F.por})` : ""}` : "—"}`; return s;
}
const newF = (k: UnitKey, me: string): F => { const u = UNITS[k]; return { ag: uMap(k)[me] ? [me] : [], veh: u.veh ? u.veh.o[0][0] : "", mat: "", mo: u.mo?.[0] || "", mox: "", perm: "", por: "", dog: "", zona: "" }; };

const EXAMS: [string, string, string][] = [["EVAL-INS-01", "Instructor de vuelo", "Habilita como instructor de vuelo policial. Si lo supera un Piloto, pasa automáticamente a Piloto experimentado. Permanencia mínima: 3 semanas."],
  ["EVAL-RESC-02", "Búsqueda y rescate (SAR)", "Habilita como operador aéreo de búsqueda y rescate SAR. Permanencia mínima: 2 semanas."],
  ["EVAL-TAC-03", "Táctico", "Solo por recomendación si no se es miembro de METRO/SWAT."],
  ["CERT-DET-04", "Licencia Detective Bureau", "Licencia de vuelo (no de patrullaje) para DET I+ en vuelos confidenciales de la Detective Bureau. Excluyente de la división."],
  ["EVAL-CRIT-EMG-05", "Emergencias críticas", "Práctica de formación obligatoria. Emergencias críticas simuladas en entorno controlado: fallos falsos de máximo riesgo (rotor central o trasero, humo en cabina, incendio…) para entrenar la respuesta y el manejo de crisis. Reprobarla suspende el patrullaje aéreo hasta aprobarla; se puede volver a intentar al día siguiente."]];
const EMG = "EVAL-CRIT-EMG-05";
/* EVAL-CRIT-EMG-05 reprobada: patrullaje aéreo suspendido hasta aprobarla; reintento desde el día siguiente */
function asdSusp(n: string) {
  const x = (LS.json<Record<string, XRec>>("lspdt.asdExam", {})[n] || {})[EMG] as { st: string; t: number } | undefined; if (!x || x.st !== "rep") return null;
  const d = new Date(x.t || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return { desde: d, puede: Date.now() >= +d };
}
const asdSuspTxt = (n: string) => { const s = asdSusp(n); return s ? `Patrullaje aéreo suspendido · ${s.puede ? "ya puede reintentar" : "reintento desde el " + s.desde.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}` : ""; };
const EX_ST: [string, string, string][] = [["apr", "Aprobado", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"], ["rep", "Reprobado", "bg-red-500/10 text-red-700 dark:text-red-300"], ["pen", "Pendiente", "bg-amber-400/15 text-amber-700 dark:text-amber-300"]];
type XRec = Record<string, { st: string; t: number; por: string } | string>;
function asdXText(n: string, X: XRec) {
  const a = findAgent(n), l = EXAMS.filter(([k]) => X[k]).map(([k]) => `**${k}** ${(EX_ST.find(s => s[0] === (X[k] as { st: string }).st) || [, "—"])[1]}${k === EMG && (X[k] as { st: string }).st === "rep" ? " (patrullaje aéreo suspendido hasta aprobar)" : ""}`);
  return `**Oficial:** ${n}${a && a.p ? ` | ${a.p}` : ""}\n**Estado:** ${l.join(" · ") || "—"}${X._n ? `\n**Nota:** ${X._n}` : ""}`;
}

const PSB_TABS: [string, string, typeof Bell][] = [["not", "Notificación", Bell], ["ele", "Elevación de caso", ArrowUpRight], ["jus", "Aprobación SAJD", Gavel], ["res", "Resolución", FileCheck2], ["vot", "Votaciones", Vote], ["his", "Expedientes", History], ["cat", "Catálogo de faltas", BookMarked], ["cit", "Citación 10-80", Radio]];

export function Unit({ k }: { k: UnitKey }) {
  useStoreVersion();
  const me = useMe(), u = UNITS[k], co = isUCoord(k, me.n), pal = unitPalette(k);
  type TB = [string, string, typeof Bell];
  const mdIns = k === "md" && (co || !!insRole("md", me.n));
  const tabs0: TB[] = [["ros", "Roster", Users], ...(k === "psb" ? PSB_TABS : u.reg ? [["reg", u.reg, ClipboardPen], ["log", `${u.regs} (${uLog(k).length})`, ListChecks]] as TB[] : []),
    ...(k === "asd" ? [["com", "Comunicados", Megaphone] as TB] : []), ...(k === "asd" && co ? [["exa", "Exámenes", GraduationCap] as TB] : []),
    ...(mdIns ? [["mde", "Examen escrito", ClipboardCheck], ["mdi", "Entrevista de instructor", MessageCircle], ["mdl", "Lista de elegibles", Trophy]] as TB[] : []),
    ["ins", "Instrucciones", GraduationCap], ["uni", "Uniformidad", Shirt]];
  const mem = isUMem(k, me.n), names = Object.keys(uMap(k)).filter(n => findAgent(n)).sort((a, b) => a.localeCompare(b, "es"));
  /* Roster siempre primero; el resto de la A a la Z */
  const tabs = [tabs0[0], ...tabs0.slice(1).sort((a, b) => a[1].localeCompare(b[1], "es", { numeric: true }))];
  const [tab, setTab] = useState(() => LS.get(`lspdt.next.utab.${k}`) || "ros");
  /* pestañas que la coordinación dejó visibles para los miembros (+ Administración para la coordinación) */
  const base: DivTab[] = tabs.map(([v, l, I]) => ({ value: v, label: l, icon: <I />, txt: l })), opts = divTabs(k, base, co);
  const t = opts.some(x => x.value === tab) ? tab : opts[0]?.value || "ros";
  const go = (v: string) => { setTab(v); LS.set(`lspdt.next.utab.${k}`, v); };
  return (
    <div className="space-y-5" style={{ ["--uacc" as string]: pal.acc }}>
      <Segmented value={t} onChange={go} options={opts} />
      {t === "adm" ? <DivAdmin id={k} ab={u.ab} tabs={base} /> : t === "uni" ? <Uniformidad id={k} ab={u.ab} canEdit={co} roles={u.R.map(r => [r[0], r[1], r[2]] as URole)} mine={uMap(k)[me.n] || []} /> : t === "ros" ? <Roster k={k} pal={pal.roles} />
        : t === "ins" ? <Instrucciones div={k} ab={u.ab} names={names} roleOf={n => insRole(k, n)} tipos={INS_TIPOS[k]} canEdit={mem} isCoord={co} />
        : t === "mde" || t === "mdi" || t === "mdl" ? <Lazy><MetroExam tab={t === "mde" ? "exa" : t === "mdi" ? "ent" : "list"} /></Lazy>
        : t === "reg" ? <RegForm k={k} onSaved={() => go("log")} /> : t === "log" ? <LogView k={k} /> : t === "exa" ? <Exams pal={pal.roles} /> : t === "com" ? <Comunicados div="asd" canEdit={co} />
        : t === "cit" ? <T1080 psbOnly /> : <Psb tab={t} go={go} />}
    </div>
  );
}

function Tag({ k, x, main, pal }: { k: UnitKey; x: string; main?: boolean; pal: Record<string, string> }) {
  const r = uRole(k, x), sub = UNITS[k].SUB?.some(s => s[0] === x), c = pal[x] || r[2];
  return <span style={{ ["--c" as string]: c }} className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold", main ? "border-[color:var(--c)] bg-[color:var(--c)]/15 text-slate-800 dark:text-white" : sub ? "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}>
    {main && <span className="mr-1.5 size-1.5 rounded-full" style={{ background: c }} />}{r[1]}</span>;
}

function Roster({ k, pal }: { k: UnitKey; pal: Record<string, string> }) {
  const me = useMe(), { toast, confirm } = useFeedback(), u = UNITS[k], co = isUCoord(k, me.n), m = uMap(k, me.n);
  const [edit, setEdit] = useState(false), [nw, setNw] = useState(""), [nwR, setNwR] = useState(u.R[u.R.length - 1][0]);
  const mem = Object.entries(m);
  const save = (fn: (x: Record<string, string[]>) => void) => { const x = structuredClone(m); fn(x); uSaveMap(k, x); };
  const ids = LS.json<Record<string, string>>("lspdt.psbIds", {});
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm"><b>{mem.length}</b> integrantes</span>
        {u.R.map(([kk, l]) => { const n = mem.filter(([, r]) => uTop(k, r)[0] === kk).length; return n ? <span key={kk} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs dark:border-slate-700"><span className="size-2 rounded-full" style={{ background: pal[kk] }} />{l} · {n}</span> : null; })}
        {co && <Button className="ml-auto" size="sm" variant={edit ? "primary" : "outline"} icon={edit ? <Check /> : <Pencil />} onClick={() => setEdit(!edit)}>{edit ? "Listo" : "Editar roster"}</Button>}
      </div>
      {edit && (
        <Card className="flex flex-wrap gap-2 p-3">
          <AgentCombo className="min-w-[14rem] flex-1" value={nw} onChange={setNw} filter={a => !m[a.n]} placeholder={`Agregar agente a la ${u.ab}…`} />
          <Select value={nwR} onChange={e => setNwR(e.target.value)} className="w-auto text-sm">{u.R.map(([kk, l]) => <option key={kk} value={kk}>{l}</option>)}</Select>
          <Button icon={<Plus />} onClick={() => { if (!nw) return; save(x => { x[nw] = [nwR]; }); toast(`${nw} agregado como ${uRole(k, nwR)[1]}`); setNw(""); }}>Agregar</Button>
        </Card>)}
      <Card className="overflow-hidden">
        {u.R.map(([kk, l]) => {
          const L = mem.filter(([, r]) => uTop(k, r)[0] === kk).sort((a, b) => a[0].localeCompare(b[0], "es"));
          if (!L.length && !edit) return null;
          return (
            <div key={kk}>
              <div className="flex items-center gap-2 border-y border-slate-100 bg-slate-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 first:border-t-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" style={{ boxShadow: `inset 3px 0 0 ${pal[kk]}` }}>
                {l}<span className="rounded-md bg-white px-1.5 text-slate-500 dark:bg-slate-800">{L.length}</span></div>
              {L.length ? L.map(([n, r]) => { const a = uAg(n); return (
                <div key={n} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-slate-800/70">
                  <div className="flex min-w-[14rem] flex-1 items-center gap-2.5"><Avatar n={n} size={32} />
                    <div><p className="text-sm font-semibold">{n}</p><p className="text-xs text-slate-500">{a.p && `#${a.p} · `}{"fuera" in a ? "No figura en el roster cargado" : rankES(a.r)}</p></div></div>
                  {edit ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {k === "md" && <Input defaultValue={callOf(n)} placeholder="Indicativo (R20D…)" className="h-8 w-32 font-mono text-xs"
                        onBlur={e => { const v = e.target.value.trim().toUpperCase(), M = { ...MD_CALLS, ...LS.json<Record<string, string>>("lspdt.mdCalls", {}) }; if ((M[n] || "") === v) return; M[n] = v; LS.setJSON("lspdt.mdCalls", M); toast("Indicativo guardado"); }} />}
                      {k === "psb" && <Input defaultValue={ids[n] || dcIdOf(n)} placeholder="Discord ID" inputMode="numeric" className="h-8 w-44 font-mono text-xs"
                        onBlur={e => { const v = e.target.value.replace(/\D/g, ""), M = LS.json<Record<string, string>>("lspdt.psbIds", {}); if ((M[n] || "") === v) return; if (v) M[n] = v; else delete M[n]; LS.setJSON("lspdt.psbIds", M); toast("Discord ID guardado"); }} />}
                      {[...u.R, ...(u.SUB || [])].map(([x, ll, , sh]) => { const on = r.includes(x); return (
                        <label key={x} title={ll} className={cn("cursor-pointer select-none rounded-md border px-2 py-1 text-[11px] font-semibold transition", on ? "text-slate-900 dark:text-white" : "border-slate-200 text-slate-400 hover:text-slate-600 dark:border-slate-700")}
                          style={on ? { borderColor: pal[x], background: `${pal[x]}26` } : undefined}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={e => save(y => { y[n] = (y[n] || []).filter(z => z !== x); if (e.target.checked) y[n].push(x); if (!y[n].length) y[n] = [u.R[u.R.length - 1][0]]; })} />{sh}</label>); })}
                      <button aria-label={`Quitar a ${n}`} onClick={async () => { if (await confirm(`¿Quitar a ${n} de la ${u.ab}?`, { danger: true })) save(y => { delete y[n]; }); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><X className="size-4" /></button>
                    </div>
                  ) : <div className="flex flex-wrap gap-1"><Tag k={k} x={kk} main pal={pal} />{r.filter(x => x !== kk).map(x => <Tag key={x} k={k} x={x} pal={pal} />)}
                    {k === "k9" && <DogEd n={n} can={co || n === me.n} />}
                    {k === "md" && callOf(n) && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-600 dark:text-red-400">{callOf(n)}</span>}
                    {k === "asd" && asdSusp(n) && <span title={asdSuspTxt(n)} className="inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">Patrullaje aéreo suspendido</span>}</div>}
                </div>); }) : <p className="px-4 py-3 text-xs text-slate-400">Sin integrantes.</p>}
            </div>);
        })}
      </Card>
    </div>
  );
}

function RegForm({ k, onSaved }: { k: UnitKey; onSaved: () => void }) {
  const me = useMe(), { toast } = useFeedback(), u = UNITS[k], m = uMap(k);
  const [F, setF] = useState<F>(() => { try { return { ...newF(k, me.n), ...JSON.parse(sessionStorage.getItem("u." + k) || "{}") }; } catch { return newF(k, me.n); } });
  const [all, setAll] = useState(false);
  const up = (p: Partial<F>) => { const x = { ...F, ...p }; setF(x); try { sessionStorage.setItem("u." + k, JSON.stringify(x)); } catch { /* */ } };
  const text = uText(k, F), dogs = useMemo(() => [...new Set(uLog(k).map(x => x.dog).filter(Boolean))] as string[], [k]);
  const auth = Object.entries(m).filter(([, r]) => r.some(x => ["coord", "subcoord", "sup", "inst"].includes(x))).map(([n]) => n);
  const save = () => {
    if (!F.ag.length) { toast("Agregá al menos un agente", "err"); return; } if (F.mo === "Otro" && !F.mox.trim()) { toast("Escribí el motivo", "err"); return; }
    if (u.dog && !F.dog.trim()) { toast("Escribí el nombre del K-9", "err"); return; }
    if (k === "asd" && F.mo !== "Formación / examen") { const su = F.ag.filter(x => asdSusp(x)); if (su.length) { toast(`${su.join(", ")} ${su.length > 1 ? "tienen" : "tiene"} el patrullaje aéreo suspendido (EVAL-CRIT-EMG-05 reprobada). Solo puede volar en «Formación / examen» hasta aprobarla.`, "err"); return; } }
    LS.setJSON(u.lk, [...uLog(k), { ...structuredClone(F), id: uid(), t: Date.now(), por2: me.n }]);
    up({ ...newF(k, me.n), ag: F.ag.slice(), veh: F.veh, dog: F.dog }); toast(u.one![0].toUpperCase() + u.one!.slice(1) + " registrado"); onSaved();
  };
  return (
    <Split>
      <Col>
        <Card>
          <CardHeader icon={<Users />} title={u.crew!} desc="Elegí quiénes participaron." />
          <CardBody>
            <div className="flex min-h-10 flex-wrap gap-2">{F.ag.length ? F.ag.map(n => { const a = findAgent(n); return (
              <span key={n} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-1.5 dark:border-slate-700 dark:bg-slate-800"><Avatar n={n} size={26} />
                <span className="leading-tight"><b className="block text-xs">{n}</b><small className="text-[10.5px] text-slate-500">{a ? (a.p ? "#" + a.p + " · " : "") + rankES(a.r) : ""}</small>{k === "asd" && asdSusp(n) && <small className="block text-[10.5px] font-semibold text-red-600 dark:text-red-400">Patrullaje aéreo suspendido</small>}</span>
                <button aria-label={`Quitar a ${n}`} onClick={() => up({ ag: F.ag.filter(x => x !== n) })} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X className="size-3.5" /></button></span>); })
              : <p className="text-sm text-slate-400">Elegí abajo quiénes participaron.</p>}</div>
            <AgentPicker value="" onChange={n => up({ ag: [...F.ag, n], ...(u.dog && !F.dog && k9Dogs()[n]?.dog ? { dog: k9Dogs()[n].dog } : {}) })} filter={a => lvl(a.r) > 0 && !F.ag.includes(a.n) && (all || !!m[a.n])} empty="No quedan agentes para agregar" />
            <Checkbox checked={all} onChange={setAll} label={`Mostrar todo el roster (no solo la ${u.ab})`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={u.veh ? <Helicopter /> : <ClipboardPen />} title={`Datos del ${u.one}`} />
          <CardBody>
            {u.veh && <Field label={u.veh.l}><div className="grid grid-cols-3 gap-2">{u.veh.o.map(([v, n, s]) => (
              <button key={v} onClick={() => up({ veh: v })} className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", F.veh === v ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50")}>
                <Helicopter className="size-5 text-slate-500" /><b className="text-sm">{n}</b><small className="text-[11px] text-slate-500">{s}</small></button>))}</div></Field>}
            <div className="grid gap-4 sm:grid-cols-2">
              {u.mat && <Field label="Matrícula" hint="(opcional)"><Input value={F.mat} onChange={e => up({ mat: e.target.value.toUpperCase() })} placeholder="N704NX" className="font-mono uppercase" /></Field>}
              {u.dog && <Field label="K-9 asignado"><Input list="uDogDL" value={F.dog} onChange={e => up({ dog: e.target.value })} placeholder="Nombre del perro" /><datalist id="uDogDL">{dogs.map(x => <option key={x} value={x} />)}</datalist></Field>}
              {u.zona && <Field label="Zona"><Input list="lugDL2" value={F.zona} onChange={e => up({ zona: e.target.value })} placeholder="Ej: Vespucci Beach" /><datalist id="lugDL2">{LUGARES.slice(0, 600).map(x => <option key={x} value={x} />)}</datalist></Field>}
            </div>
            <Field label="Motivo"><div className="flex flex-wrap gap-1.5">{u.mo!.map(x => (
              <button key={x} onClick={() => up({ mo: x })} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", F.mo === x ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>{x}</button>))}</div>
              <Input className="mt-2" value={F.mox} onChange={e => up({ mox: e.target.value })} placeholder={F.mo === "Otro" ? "Escribí el motivo" : "Detalle (opcional)"} /></Field>
            <Field label="Permiso" hint={`(opcional${u.veh ? ", si se autoriza una aeronave distinta" : ""})`}>
              <div className="flex gap-2"><Input value={F.perm} onChange={e => up({ perm: e.target.value })} placeholder={u.veh ? "Ej: Uso del MH-60S Blackhawk autorizado" : "Ej: Salida autorizada fuera de turno"} />
                <AgentCombo className="w-60" value={F.por} onChange={n => up({ por: n })} names={auth} placeholder="Autorizado por…" /></div></Field>
          </CardBody>
        </Card>
      </Col>
      <DiscordOutput title={u.reg!} tag="Discord" text={text} footer={<><Button variant="ghost" icon={<RotateCcw />} onClick={() => up(newF(k, me.n))}>Limpiar</Button><Button icon={<Save />} onClick={save}>{u.save}</Button></>} />
    </Split>
  );
}

function LogView({ k }: { k: UnitKey }) {
  const me = useMe(), { confirm } = useFeedback(), copy = useCopy(), u = UNITS[k], co = isUCoord(k, me.n);
  const [q, setQ] = useState(""), L0 = uLog(k), s = norm(q);
  const L = L0.slice().sort((a, b) => b.t - a.t).filter(v => !s || norm(v.ag.join(" ") + " " + v.mo + " " + (v.mox || "") + " " + (v.veh || "") + " " + (v.mat || "") + " " + (v.dog || "") + " " + (v.zona || "")).includes(s));
  const cnt: Record<string, number> = {}; L0.forEach(v => v.ag.forEach(n => { cnt[n] = (cnt[n] || 0) + 1; })); const wk = Date.now() - 7 * 864e5;
  const K: [number, string][] = [[L0.length, u.regs!], [L0.filter(v => v.t > wk).length, "Últimos 7 días"], [Object.keys(cnt).length, "Agentes con " + u.ones]];
  if (u.veh) u.veh.o.forEach(([v, n]) => K.push([L0.filter(x => x.veh === v || x.ae === v).length, n]));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{K.map(([n, l]) => <Card key={l} className="p-4"><p className="text-2xl font-bold tabular-nums">{n}</p><p className="text-xs text-slate-500">{l}</p></Card>)}</div>
      <Card>
        <CardHeader icon={<Users />} title={`${u.ones![0].toUpperCase() + u.ones!.slice(1)} por agente`} />
        <CardBody><div className="flex flex-wrap gap-2">{Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([n, c]) => <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-0.5 pl-0.5 pr-2.5 text-xs dark:border-slate-700"><span className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-slate-900" style={{ background: "var(--uacc)" }}>{c}</span>{n}</span>) || null}
          {!L0.length && <p className="text-sm text-slate-400">Todavía no hay {u.ones}.</p>}</div></CardBody>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative min-w-[14rem] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar agente, motivo, ${u.veh ? "matrícula" : "K-9 o zona"}…`} /></div>
          <span className="text-xs text-slate-400">{L.length} de {L0.length}</span>
        </div>
        {!L.length ? <Empty icon={<ListChecks />} title={`Sin ${u.ones} registrados`} /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(v => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{v.ag.join(" · ")}</p>
              <p className="truncate text-xs text-slate-500">{fmtDate(v.t)}{u.veh && ` · ${vehL(k, v.veh || v.ae)}${v.mat ? ` [${v.mat}]` : ""}`}{v.dog && ` · K-9 ${v.dog}`}{v.zona && ` · ${v.zona}`} · {v.mo === "Otro" ? v.mox : v.mo}{v.perm && ` · permiso: ${v.perm}`}</p></div>
            <Button variant="outline" size="sm" icon={<Copy />} onClick={() => copy(uText(k, { veh: v.ae, ...v } as F))}>Copiar</Button>
            {(v.por2 === me.n || co) && <Button variant="ghost" size="sm" className="text-red-600" icon={<Trash2 />} aria-label="Quitar" onClick={async () => { if (await confirm(`¿Quitar el ${u.one} del registro?`, { danger: true })) LS.setJSON(u.lk, uLog(k).filter(x => x.id !== v.id)); }} />}
          </div>))}</div>}
      </Card>
    </div>
  );
}

function Exams({ pal }: { pal: Record<string, string> }) {
  const me = useMe(), { toast } = useFeedback(), copy = useCopy(), k: UnitKey = "asd", m = uMap(k), RR = UNITS.asd.R;
  const ASDX = LS.json<Record<string, XRec>>("lspdt.asdExam", {});
  const [X, setX] = useState<{ n: string; st: Record<string, string>; nota: string }>({ n: "", st: {}, nota: "" });
  const load = (n: string) => { const R = ASDX[n] || {}; setX({ n, st: Object.fromEntries(EXAMS.filter(([x]) => R[x]).map(([x]) => [x, (R[x] as { st: string }).st])), nota: (R._n as string) || "" }); };
  const ri = (n: string) => RR.indexOf(uTop(k, m[n]));
  const mem = Object.keys(m).filter(n => findAgent(n)).sort((a, b) => ri(a) - ri(b) || a.localeCompare(b, "es"));
  const grp = RR.map(r => [r, mem.filter(n => uTop(k, m[n]) === r)] as const).filter(([, l]) => l.length);
  const save = () => {
    const n = X.n; if (!n) { toast("Elegí un oficial", "err"); return; }
    const P0 = ASDX[n] || {}, R: XRec = {}; EXAMS.forEach(([x]) => { const o = P0[x] as { st: string; t: number; por: string } | undefined; if (X.st[x]) R[x] = o && o.st === X.st[x] ? o : { st: X.st[x], t: Date.now(), por: me.n }; }); if (X.nota.trim()) R._n = X.nota.trim();
    LS.setJSON("lspdt.asdExam", { ...ASDX, [n]: R });
    const i1 = R["EVAL-INS-01"] as { st: string } | undefined;
    if (i1 && i1.st === "apr" && (m[n] || []).includes("piloto") && !(m[n] || []).includes("pexp")) { const mm = structuredClone(m); mm[n].push("pexp"); uSaveMap("asd", mm); toast(n + " pasa a Piloto experimentado (EVAL-INS-01 aprobado)"); }
    else toast("Resultado guardado");
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <Col>
        <Card>
          <CardHeader icon={<GraduationCap />} title="Registrar examen" />
          <CardBody>
            <Field label="Oficial"><AgentCombo value={X.n} onChange={load} names={grp.flatMap(([, l]) => l)} sub={n => grp.find(([, l]) => l.includes(n))?.[0][1] || ""} placeholder="Buscar integrante…" /></Field>
            {EXAMS.map(([c, , d]) => (
              <div key={c} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div><b className="font-mono text-xs">{c}</b><p className="text-xs text-slate-500">{d}</p></div>
                <Segmented size="sm" value={X.st[c] || ""} onChange={v => setX({ ...X, st: { ...X.st, [c]: X.st[c] === v ? "" : v } })} options={EX_ST.map(([v, l]) => ({ value: v, label: l }))} />
              </div>))}
            <Field label="Nota" hint="(opcional)"><Input value={X.nota} onChange={e => setX({ ...X, nota: e.target.value })} /></Field>
            <div className="flex justify-end"><Button icon={<Save />} onClick={save}>Guardar resultado</Button></div>
          </CardBody>
        </Card>
        {X.n && <Card><CardHeader icon={<Copy />} title="Resultado para Discord" />
          <CardBody><pre className="whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-mono text-[12.5px] text-slate-200">{asdXText(X.n, ASDX[X.n] || {})}</pre>
          <div className="flex justify-end"><Button size="sm" icon={<Copy />} onClick={() => copy(asdXText(X.n, ASDX[X.n] || {}))}>Copiar</Button></div></CardBody></Card>}
      </Col>
      <Card className="overflow-hidden">
        <CardHeader icon={<ListChecks />} title="Estado de exámenes" desc="Tocá una fila para cargar a ese oficial en el formulario." />
        <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[40rem] text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="px-4 py-2.5 font-semibold">Oficial</th>{EXAMS.map(([c]) => <th key={c} className="px-3 py-2.5 font-mono font-semibold">{c}</th>)}</tr></thead>
          <tbody>{grp.map(([r, l]) => [
            <tr key={r[0]}><td colSpan={EXAMS.length + 1} className="border-y border-slate-100 bg-slate-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" style={{ boxShadow: `inset 3px 0 0 ${pal[r[0]]}` }}>{r[1]} <span className="text-slate-400">{l.length}</span></td></tr>,
            ...l.map(n => { const R = ASDX[n] || {}, a = findAgent(n)!; return (
              <tr key={n} onClick={() => load(n)} className={cn("cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/40", n === X.n && "bg-brand-50 dark:bg-brand-500/10")}>
                <td className="px-4 py-2"><p className="font-semibold">{n}</p><p className="text-[11px] text-slate-500">{a.p && `#${a.p} · `}{rankES(a.r)}</p></td>
                {EXAMS.map(([c]) => { const s = R[c] && EX_ST.find(x => x[0] === (R[c] as { st: string }).st); return <td key={c} className="px-3 py-2">{s ? <><span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", s[2])}>{s[1]}</span>{c === EMG && s[0] === "rep" && <small className="mt-1 block text-[10.5px] leading-tight text-red-600 dark:text-red-400">{asdSuspTxt(n)}</small>}</> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>; })}
              </tr>); })])}</tbody>
        </table></div>
      </Card>
    </div>
  );
}
