/* METRO › Examen práctico de los aspirantes (solo six, Liam Campbell y Evelyn Molina). Por convocatoria: asistencia a las dos clases
   y notas del examen (Mando de Táctico y 246 en comunicación/decisión/organización; Negociación y Circuito de Agilidad, nota global).
   Global = promedio de los cuatro ejercicios; se aprueba con 6 o más. */
import { useState } from "react";
import { Check, Plus, Trash2, Trophy } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { uid } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";

type As = "" | "si" | "jus" | "no";
type S = { tc?: number; td?: number; to?: number; ac?: number; ad?: number; ao?: number; neg?: number; cir?: number };
type Row = { id: string; n: string; c1: As; c2: As; s: S };
type Conv = { id: string; n: string; rows: Row[] };
const K = "lspdt.mdx.prac", APR = 6;
const r0 = (n: string, c1: As, c2: As): Row => ({ id: uid(), n, c1, c2, s: {} });
const SEED: Conv[] = [{ id: "C1", n: "Convocatoria 1", rows: [r0("Thomas Cooper", "si", "no"), r0("Violeth Faith", "si", "si"), r0("Madison Lopez", "si", "si"), r0("Naia Bishop", "si", "si"),
  r0("Ethan Roggers", "si", "no"), r0("Ryan Sullivan", "si", "si"), r0("Daniel Santos Prieto", "si", "si"), r0("Mia Jhonson", "no", "no")] }];
const AS: Record<Exclude<As, "">, [string, string]> = { si: ["Asiste", "bg-emerald-500/80 text-white"], jus: ["Justificado", "bg-sky-500/80 text-white"], no: ["No asiste", "bg-red-400/80 text-white"] };
const NEXT: Record<As, As> = { "": "si", si: "jus", jus: "no", no: "" };
const EJ: [string, string, (keyof S)[]][] = [["Mando de Táctico", "MT", ["tc", "td", "to"]], ["246", "246", ["ac", "ad", "ao"]], ["Negociación", "NEG", ["neg"]], ["Circuito de Agilidad", "CA", ["cir"]]];
const SUB = ["Comunicación", "Decisión", "Organización"];
const f1 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 });
const avg = (L: number[]) => L.reduce((a, b) => a + b, 0) / L.length;
/* nota de cada ejercicio y global (null mientras falte alguna nota) */
function calc(s: S) {
  const ej = EJ.map(([, , ks]) => { const v = ks.map(k => s[k]); return v.every(x => typeof x === "number") ? avg(v as number[]) : null; });
  const g = ej.every(x => x !== null) ? avg(ej as number[]) : null;
  return { ej, g, st: g === null ? "pen" : g >= APR ? "apr" : "rep" } as const;
}
const ST: Record<string, [string, string]> = { pen: ["Pendiente", "text-slate-400"], apr: ["Aprobado", "text-emerald-600 dark:text-emerald-400"], rep: ["No aprobado", "text-red-600 dark:text-red-400"] };

function Nota({ v, set }: { v?: number; set: (x?: number) => void }) {
  const [t, setT] = useState<string | null>(null);
  const shown = t ?? (typeof v === "number" ? String(v).replace(".", ",") : "");
  const commit = () => { if (t === null) return; const x = parseFloat(t.replace(",", ".")); set(t.trim() === "" || isNaN(x) ? undefined : Math.min(10, Math.max(0, x))); setT(null); };
  return <input inputMode="decimal" value={shown} placeholder="–" onChange={e => setT(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    className={cn("h-8 w-12 rounded-lg border bg-transparent text-center text-[13px] tabular-nums outline-none transition focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900",
      typeof v === "number" ? (v >= APR ? "border-slate-200 dark:border-slate-700" : "border-red-300 text-red-600 dark:border-red-500/40 dark:text-red-400") : "border-dashed border-slate-200 dark:border-slate-700")} />;
}

export function MetroPrac() {
  const { toast, confirm } = useFeedback(), [L, setL] = useJSON<Conv[]>(K, SEED), [cid, setCid] = useState(""), [nuevo, setNuevo] = useState("");
  const convs = Array.isArray(L) && L.length ? L : SEED, c = convs.find(x => x.id === cid) || convs[convs.length - 1];
  const put = (rows: Row[]) => setL(convs.map(x => (x.id === c.id ? { ...x, rows } : x)));
  const upd = (id: string, p: Partial<Row>) => put(c.rows.map(r => (r.id === id ? { ...r, ...p } : r)));
  const add = () => { const n = nuevo.trim(); if (!n) return; put([...c.rows, r0(n, "", "")]); setNuevo(""); };
  const addConv = () => { const id = "C" + (convs.length + 1); setL([...convs, { id, n: "Convocatoria " + (convs.length + 1), rows: [] }]); setCid(id); toast("Convocatoria creada"); };
  const res = c.rows.map(r => ({ r, ...calc(r.s) })), apr = res.filter(x => x.st === "apr").length, pen = res.filter(x => x.st === "pen").length;
  const txt = [`## 🎯 Metropolitan Division · Examen práctico · ${c.n}`, `-# Mando de Táctico, 246, Negociación y Circuito de Agilidad · se aprueba con promedio ${APR}`, "",
    ...[...res].sort((a, b) => (b.g ?? -1) - (a.g ?? -1)).map(x => `**${x.r.n}** — ${x.ej.map((e, i) => `${EJ[i][1]} ${e === null ? "—" : f1(e)}`).join(" · ")} · **Global ${x.g === null ? "—" : f1(x.g)}** · ${ST[x.st][0]}`)].join("\n");
  const th = "px-1.5 py-2 text-center font-semibold";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {convs.map(x => <button key={x.id} onClick={() => setCid(x.id)} className={cn("rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition", x.id === c.id ? "border-brand-500/60 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}>{x.n}</button>)}
        <button onClick={addConv} title="Nueva convocatoria" className="grid size-8 place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-brand-600 dark:border-slate-700"><Plus className="size-4" /></button>
        <span className="ml-auto flex items-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Trophy className="size-3.5 text-emerald-500" /><b className="text-slate-800 dark:text-white">{apr}</b>/{c.rows.length} aprobados</span>{pen > 0 && <span>{pen} pendientes</span>}<span>Aprueba con {APR}</span></span>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[60rem] border-collapse text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th rowSpan={2} className="px-3 py-2 text-left font-semibold">Aspirante</th><th rowSpan={2} className={th}>Clase 1</th><th rowSpan={2} className={th}>Clase 2</th>
              {EJ.map(([l, , ks]) => <th key={l} colSpan={ks.length} className="border-l border-slate-100 bg-slate-50 px-2 pt-2 text-center font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">{l}</th>)}
              <th rowSpan={2} className="border-l border-slate-100 bg-brand-500/10 px-3 text-center font-bold text-brand-700 dark:border-slate-800 dark:text-brand-300">Global</th><th rowSpan={2} className="px-3 text-left font-semibold">Estado</th>
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {EJ.flatMap(([, , ks]) => ks.map((k, i) => <th key={k} className={cn("bg-slate-50 px-1 pb-2 text-center text-[10px] font-medium normal-case tracking-normal text-slate-400 dark:bg-slate-900/60", i === 0 && "border-l border-slate-100 dark:border-slate-800")}>{ks.length > 1 ? SUB[i] : "Nota"}</th>))}</tr>
          </thead>
          <tbody>{res.length ? res.map(({ r, g, st }) => (
            <tr key={r.id} className="group border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-3 py-1.5"><div className="flex items-center gap-1.5"><b className="whitespace-nowrap italic">{r.n}</b>
                <button aria-label={`Quitar a ${r.n}`} onClick={async () => { if (await confirm(`¿Quitar a ${r.n}?`, { danger: true })) put(c.rows.filter(x => x.id !== r.id)); }} className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"><Trash2 className="size-3.5" /></button></div></td>
              {(["c1", "c2"] as const).map(k => <td key={k} className="px-1 py-1.5 text-center">
                <button onClick={() => upd(r.id, { [k]: NEXT[r[k]] })} title="Tocá para cambiar" className={cn("h-7 w-[5.5rem] rounded-lg text-[11.5px] font-semibold transition", r[k] ? AS[r[k] as Exclude<As, "">][1] : "border border-dashed border-slate-300 text-slate-400 dark:border-slate-700")}>{r[k] ? AS[r[k] as Exclude<As, "">][0] : "—"}</button></td>)}
              {EJ.flatMap(([, , ks]) => ks.map((k, i) => <td key={k} className={cn("px-1 py-1.5 text-center", i === 0 && "border-l border-slate-100 dark:border-slate-800")}><Nota v={r.s[k]} set={x => upd(r.id, { s: { ...r.s, [k]: x } })} /></td>))}
              <td className="border-l border-slate-100 bg-brand-500/[.04] px-3 text-center font-display text-base font-bold tabular-nums dark:border-slate-800">{g === null ? <span className="text-slate-300">—</span> : f1(g)}</td>
              <td className="px-3"><span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold", ST[st][1])}>{st === "apr" && <Check className="size-3.5" />}{ST[st][0]}</span></td>
            </tr>)) : <tr><td colSpan={14} className="px-3 py-8 text-center text-slate-400">Sin aspirantes en esta convocatoria.</td></tr>}</tbody>
        </table>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Nombre del aspirante" className="max-w-xs" />
        <Button variant="outline" icon={<Plus />} onClick={add} disabled={!nuevo.trim()}>Agregar aspirante</Button>
        <span className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">{Object.values(AS).map(([l, cl]) => <span key={l} className={cn("rounded-md px-1.5 py-0.5 font-semibold", cl)}>{l}</span>)}<span>· notas de 0 a 10</span></span>
      </div>
      <DiscordOutput title="Resultados" text={txt} sticky={false} />
    </div>);
}
