/* Instrucciones de cada división: quién la dio (coordinador / instructor / instructor en pruebas, según el roster),
   fecha, tipo de instrucción y lista de implicados con su asistencia. Se guarda en lspdt.instr.<división>. */
import { useMemo, useState } from "react";
import { CalendarDays, CheckCheck, ClipboardList, Copy, GraduationCap, Pencil, RotateCcw, Save, Trash2, Users, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Segmented, Textarea, SearchInput } from "@/components/ui";
import { AgentCombo, Avatar } from "@/components/agents";
import { DiscordOutput, useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { Col, Split } from "@/components/layout";
import { findAgent, hoyISO, lvl, norm, rankES, uid } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

type InsRole = "coord" | "inst" | "instp";
const ROL: [InsRole, string, string][] = [["coord", "Coordinador", "#e6c65a"], ["inst", "Instructor", "#2fbf68"], ["instp", "Instructor en pruebas", "#8fd9a8"]];
type Asis = "asi" | "no" | "pen";
const AS: [Asis, string, string, string][] = [["asi", "Asistió", "✅", "#22c55e"], ["no", "No asistió", "❌", "#ef4444"], ["pen", "Pendiente", "⏳", "#f59e0b"]];
type Ins = { id: string; t: number; fecha: string; hora: string; tipo: string; ins: { n: string; r: InsRole }[]; imp: { n: string; st: Asis }[]; notas: string; by: string };

const unix = (d: string, h: string) => (d ? Math.floor(new Date(`${d}T${h || "00:00"}`).getTime() / 1000) : 0);
const dmy = (d: string) => (d ? d.split("-").reverse().join("/") : "—");
const tag = (n: string) => { const a = findAgent(n); return `${n}${a && a.p ? ` | ${a.p}` : ""}`; };
function insText(ab: string, x: Ins) {
  const t = unix(x.fecha, x.hora), c = (s: Asis) => x.imp.filter(i => i.st === s).length;
  return [`## 📋 Instrucción · ${x.tipo || "[tipo]"} — ${ab}`,
    `**Fecha:** ${t ? `<t:${t}:D> a las <t:${t}:t>` : dmy(x.fecha)}`, "",
    "**Impartida por:**", ...(x.ins.length ? x.ins.map(i => `- ${ROL.find(r => r[0] === i.r)![1]}: ${tag(i.n)}`) : ["- —"]), "",
    `**Implicados (${x.imp.length}):**`, ...(x.imp.length ? x.imp.map(i => `${AS.find(a => a[0] === i.st)![2]} ${tag(i.n)}`) : ["—"]), "",
    `**Asistencia:** ${c("asi")} asistieron · ${c("no")} no asistieron · ${c("pen")} pendientes`,
    ...(x.notas.trim() ? ["", `**Notas:** ${x.notas.trim()}`] : []), `-# Registró: ${x.by}`].join("\n");
}

/* div: clave de la división · ab: abreviatura · names: integrantes · roleOf: rol de instrucción según el roster · tipos: sugeridos */
export function Instrucciones({ div, ab, names, roleOf, tipos, canEdit, isCoord }: { div: string; ab: string; names: string[]; roleOf: (n: string) => InsRole | ""; tipos: string[]; canEdit: boolean; isCoord: boolean }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [L, setL] = useJSON<Ins[]>(`lspdt.instr.${div}`, []);
  const blank = (): Ins => ({ id: "", t: 0, fecha: hoyISO(), hora: "", tipo: "", ins: roleOf(me.n) ? [{ n: me.n, r: roleOf(me.n) as InsRole }] : [], imp: [], notas: "", by: me.n });
  const [x, setX] = useState<Ins>(blank), [all, setAll] = useState(false), [q, setQ] = useState(""), [open, setOpen] = useState("");
  const up = (p: Partial<Ins>) => setX({ ...x, ...p });
  const T = useMemo(() => [...new Set([...tipos, ...L.map(i => i.tipo).filter(Boolean)])], [tipos, L]);
  const instr = names.filter(n => roleOf(n)), pool = all ? undefined : names;
  const save = () => {
    if (!x.tipo.trim()) { toast("Elegí o escribí el tipo de instrucción", "err"); return; }
    if (!x.ins.length) { toast("Agregá quién dio la instrucción", "err"); return; }
    const r = { ...x, tipo: x.tipo.trim(), id: x.id || uid(), t: x.t || Date.now(), by: x.by || me.n };
    setL([...L.filter(i => i.id !== r.id), r]); setX(r); toast(x.id ? "Instrucción actualizada" : "Instrucción guardada");
  };
  const s = norm(q), H = L.slice().sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora) || b.t - a.t)
    .filter(i => !s || norm(`${i.tipo} ${i.ins.map(z => z.n).join(" ")} ${i.imp.map(z => z.n).join(" ")} ${i.notas}`).includes(s));
  const pill = "rounded-full border px-3 py-1 text-xs font-medium transition";
  return (
    <div className="space-y-5">
      <Split>
        <Col>
          <Card>
            <CardHeader icon={<GraduationCap />} title={x.id ? "Editar instrucción" : "Nueva instrucción"} desc="Fecha, tipo, quién la da y quiénes participan."
              action={x.id ? <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setX(blank())}>Nueva</Button> : undefined} />
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha"><Input type="date" value={x.fecha} onChange={e => up({ fecha: e.target.value })} /></Field>
                <Field label="Hora" hint="(opcional)"><Input type="time" value={x.hora} onChange={e => up({ hora: e.target.value })} /></Field>
              </div>
              <Field label="Tipo de instrucción" hint="(los que escribas quedan guardados)">
                <div className="flex flex-wrap gap-1.5">{T.map(t => <button key={t} onClick={() => up({ tipo: t })} className={cn(pill, x.tipo === t ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300")}>{t}</button>)}</div>
                <Input className="mt-2" value={x.tipo} onChange={e => up({ tipo: e.target.value })} placeholder="Ej: Persecución marítima, entrada táctica, uso de dron…" />
              </Field>
            </CardBody>
          </Card>
          <Card>
            <CardHeader icon={<GraduationCap />} title="Impartida por" desc="El rol sale del roster; podés cambiarlo." />
            <CardBody>
              {x.ins.map((i, k) => (
                <div key={i.n} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                  <Avatar n={i.n} size={28} /><b className="min-w-[9rem] flex-1 text-sm">{i.n}</b>
                  <Segmented size="sm" value={i.r} onChange={v => up({ ins: x.ins.map((z, j) => (j === k ? { ...z, r: v } : z)) })} options={ROL.map(([v, l]) => ({ value: v, label: l }))} />
                  <button aria-label={`Quitar a ${i.n}`} onClick={() => up({ ins: x.ins.filter((_, j) => j !== k) })} className="rounded p-1 text-slate-400 hover:text-red-600"><X className="size-4" /></button>
                </div>))}
              <AgentCombo value="" onChange={n => n && up({ ins: [...x.ins, { n, r: (roleOf(n) || "inst") as InsRole }] })} names={(instr.length ? instr : names).filter(n => !x.ins.some(i => i.n === n))}
                sub={n => ROL.find(r => r[0] === roleOf(n))?.[1] || "Sin rol de instrucción"} placeholder="Agregar coordinador o instructor…" empty="No quedan instructores" />
            </CardBody>
          </Card>
          <Card>
            <CardHeader icon={<Users />} title={`Implicados (${x.imp.length})`} desc="Marcá la asistencia de cada uno."
              action={x.imp.length > 0 && <Button size="sm" variant="ghost" icon={<CheckCheck />} onClick={() => up({ imp: x.imp.map(i => ({ ...i, st: "asi" })) })}>Todos asistieron</Button>} />
            <CardBody>
              {x.imp.map((i, k) => { const a = findAgent(i.n); return (
                <div key={i.n} className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                  <Avatar n={i.n} size={28} /><span className="min-w-[9rem] flex-1 leading-tight"><b className="block text-sm">{i.n}</b><small className="text-[11px] text-slate-500">{a ? `${a.p ? "#" + a.p + " · " : ""}${rankES(a.r)}` : ""}</small></span>
                  <div className="flex gap-1">{AS.map(([v, l, , c]) => <button key={v} onClick={() => up({ imp: x.imp.map((z, j) => (j === k ? { ...z, st: v } : z)) })}
                    className="rounded-lg border px-2 py-1 text-[11px] font-semibold transition" style={i.st === v ? { color: c, borderColor: c, background: c + "22" } : undefined}>{l}</button>)}</div>
                  <button aria-label={`Quitar a ${i.n}`} onClick={() => up({ imp: x.imp.filter((_, j) => j !== k) })} className="rounded p-1 text-slate-400 hover:text-red-600"><X className="size-4" /></button>
                </div>); })}
              <AgentCombo value="" onChange={n => n && up({ imp: [...x.imp, { n, st: "pen" }] })} names={pool} filter={all ? a => lvl(a.r) > 0 && !x.imp.some(i => i.n === a.n) : undefined}
                chosen={x.imp.map(i => i.n)} placeholder="Agregar implicado…" empty="No quedan agentes" />
              <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} />Mostrar todo el departamento (no solo la {ab})</label>
            </CardBody>
          </Card>
          <Card><CardBody><Field label="Notas" hint="(opcional)"><Textarea rows={2} value={x.notas} onChange={e => up({ notas: e.target.value })} placeholder="Material entregado, observaciones, próxima fecha…" /></Field></CardBody></Card>
        </Col>
        <DiscordOutput title="Registro de instrucción" text={insText(ab, x)} footer={canEdit ? <><Button variant="ghost" icon={<RotateCcw />} onClick={() => setX(blank())}>Limpiar</Button><Button icon={<Save />} onClick={save}>{x.id ? "Guardar cambios" : "Guardar instrucción"}</Button></> : undefined} />
      </Split>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <ClipboardList className="size-4 text-brand-500" /><b className="text-sm">Historial de instrucciones ({L.length})</b>
          <SearchInput className="ml-auto min-w-[14rem] sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar tipo, instructor o implicado…" />
        </div>
        {!H.length ? <Empty icon={<CalendarDays />} title="Sin instrucciones registradas" /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{H.map(i => { const on = open === i.id, n = (s: Asis) => i.imp.filter(z => z.st === s).length; return (
          <div key={i.id}>
            <button onClick={() => setOpen(on ? "" : i.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{dmy(i.fecha)}</span>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm">{i.tipo}</b><small className="block truncate text-xs text-slate-500">{i.ins.map(z => `${z.n} (${ROL.find(r => r[0] === z.r)![1].toLowerCase()})`).join(" · ")}</small></span>
              <span className="flex gap-1.5 text-[11px] font-semibold">{AS.map(([v, l, e, c]) => <span key={v} title={l} className="rounded-md px-1.5 py-0.5" style={{ color: c, background: c + "1a" }}>{e} {n(v)}</span>)}</span>
            </button>
            {on && <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex flex-wrap gap-1.5">{i.imp.map(z => { const a = AS.find(w => w[0] === z.st)!; return <span key={z.n} className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: a[3] + "66" }}>{a[2]} {z.n}</span>; })}</div>
              {i.notas && <p className="text-sm text-slate-600 dark:text-slate-300">{i.notas}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(insText(ab, i))}>Copiar</Button>
                {canEdit && (i.by === me.n || isCoord) && <Button size="sm" variant="outline" icon={<Pencil />} onClick={() => { setX(structuredClone(i)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar / asistencia</Button>}
                {(i.by === me.n || isCoord) && <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 />} onClick={async () => { if (await confirm(`¿Eliminar la instrucción «${i.tipo}» del ${dmy(i.fecha)}?`, { danger: true })) setL(L.filter(z => z.id !== i.id)); }}>Eliminar</Button>}
              </div>
            </div>}
          </div>); })}</div>}
      </Card>
    </div>
  );
}
