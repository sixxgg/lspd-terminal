/* Oficiales › Procedimientos (LSPD, desde Oficial III): estupefacientes y dinero no justificado.
   Arriba, una guía rápida por cantidad para saber qué artículo va; abajo, cada artículo con cuándo se aplica y qué hacer, en pasos cortos.
   Tocar el artículo lo copia («29.12 Tenencia…»). Lo marcado con **…** va en negrita. */
import { Fragment, useState } from "react";
import { Banknote, Check, Copy, Pill, Zap } from "lucide-react";
import { Card, CardHeader, SearchInput } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Art = { a: string; t: string; c: string; h: string[] };
const DROGAS: Art[] = [
  { a: "29.12", t: "Tenencia de estupefacientes para autoconsumo", c: "Lleva **entre 6 y 19 unidades** de cualquier droga.",
    h: ["Sancionar y **retirar la sustancia**. El tipo de droga no cambia la sanción.", "Solo si **no hay venta en flagrancia ni indicios de venta** (por ejemplo, mucho efectivo sin justificar).", "Con **menos de 6 unidades** no hay sanción, pero la droga se retira igual."] },
  { a: "29.13", t: "Consumo de estupefacientes en la vía pública", c: "Consume o tiene preparada droga en la calle, el transporte público o un espacio común, a la vista o molestando a terceros.",
    h: ["Sancionar y **retirar la sustancia**."] },
  { a: "138.52", t: "Distribución de drogas a pequeña escala", c: "Lleva **menos de 20 unidades** destinadas a la venta, el intercambio o el uso compartido.",
    h: ["Valorar los **indicios de una venta inmediata** (el dinero de la transacción y otros elementos), aunque ya no tenga la sustancia encima.", "Confirmar que la cantidad **no supera las 20 unidades**."] },
  { a: "138.21", t: "Tráfico de drogas que causan grave daño a la salud", c: "Lleva **más de 20 unidades** de cualquier droga que no sea popper, marihuana, hachís o sus derivados, o la cultiva, elabora, transporta o vende.",
    h: ["Revisar el **efectivo** que lleve.", "Si no justifica el dinero, sumar el **29.16**."] },
  { a: "138.22", t: "Tráfico de drogas que no causan grave daño a la salud", c: "Lleva **más de 20 unidades** de popper, porros de marihuana, hachís o sus derivados, o los cultiva, elabora, transporta o vende.",
    h: ["Solo estas sustancias cuentan como de **bajo daño**.", "Revisar el **efectivo** y, si no lo justifica, sumar el **29.16**."] },
];
const DINERO: Art[] = [
  { a: "29.16", t: "Tenencia de dinero en efectivo no justificado", c: "Lleva efectivo, en cualquier divisa, y no acredita su origen lícito cuando se le pide.",
    h: ["Se revisa el origen si lleva **$1.500 o más**, o menos si hay sospecha de **venta de drogas** u otro delito con beneficio en efectivo.", "Retirar **todo el efectivo** y poner **solo la sanción base**, sin porcentaje.", "También corresponde si el dinero **viene de la venta de droga**."] },
  { a: "132.97", t: "Comercio ilícito de divisas", c: "Lleva **más de $30.001 en efectivo** sin registro ni autorización.",
    h: ["Avisar a la **DB** y, si no está disponible, al **FIB**.", "Es un caso raro: este artículo suele imputarse por movimientos económicos irregulares, no por efectivo."] },
];
/* guía rápida: de un vistazo, qué artículo va según lo que lleva */
const GUIA: [string, string, string?][] = [
  ["Menos de 6 unidades", "Sin sanción · se retira"], ["6 a 19 unidades", "29.12"], ["Venta < 20 unidades", "138.52"],
  ["+20 popper / marihuana / hachís", "138.22"], ["+20 otras drogas", "138.21"], ["Efectivo sin justificar", "29.16", "din"], ["+$30.001 en efectivo", "132.97", "din"],
];
/* **negrita** → <b> */
const md = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? <b key={i} className="font-semibold text-slate-900 dark:text-white">{x}</b> : <Fragment key={i}>{x}</Fragment>));
const hit = (r: Art, q: string) => !q || norm(`${r.a} ${r.t} ${r.c} ${r.h.join(" ")}`.replace(/\*\*/g, "")).includes(q);

export function Procedimientos() {
  const { toast } = useFeedback(), [ok, setOk] = useState(""), [q, setQ] = useState(""), s = norm(q.trim());
  const copy = async (r: Art) => { try { await navigator.clipboard.writeText(`${r.a} ${r.t}`); setOk(r.a); toast(`Art. ${r.a} copiado`); window.setTimeout(() => setOk(""), 1300); } catch { /* */ } };
  const all = [...DROGAS, ...DINERO], go = (a: string) => document.getElementById("proc-" + a)?.scrollIntoView({ behavior: "smooth", block: "center" });
  const item = (r: Art, din: boolean) => (
    <li key={r.a} id={"proc-" + r.a} className="scroll-mt-24 py-3 first:pt-0 last:pb-0">
      <button onClick={() => copy(r)} title="Copiar artículo" className="group flex w-full items-start gap-2.5 text-left">
        <span className={cn("mt-px shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[12.5px] font-bold", din ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-brand-500/15 text-brand-700 dark:text-brand-300")}>{r.a}</span>
        <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">{r.t}</span>
        {ok === r.a ? <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> : <Copy className="mt-0.5 size-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-600" />}
      </button>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{md(r.c)}</p>
      <ul className="mt-1.5 space-y-1">{r.h.map(x => <li key={x} className="flex gap-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300"><span className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", din ? "bg-emerald-500" : "bg-brand-500")} /><span className="min-w-0 flex-1">{md(x)}</span></li>)}</ul>
    </li>);
  const col = (title: string, desc: string, icon: React.ReactNode, L: Art[], din: boolean) => { const F = L.filter(r => hit(r, s)); return F.length ? (
    <Card className="self-start"><CardHeader icon={icon} title={title} desc={desc} />
      <ul className="divide-y divide-slate-100 px-5 pb-4 dark:divide-slate-800">{F.map(r => item(r, din))}</ul></Card>) : null; };
  const none = !all.some(r => hit(r, s));
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2"><Zap className="size-4 text-amber-500" /><p className="text-sm font-semibold">Guía rápida</p>
          <span className="text-xs text-slate-500">qué artículo va según lo que lleva · tocá uno para ir</span>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar artículo o palabra…" className="ml-auto w-full sm:w-64" /></div>
        <div className="flex flex-wrap gap-1.5">{GUIA.map(([l, a, d]) => { const art = /^\d/.test(a); return (
          <button key={l} onClick={() => art && go(a)} disabled={!art} className={cn("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] transition", art ? "hover:border-brand-400" : "cursor-default",
            "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900")}>
            <span className="text-slate-600 dark:text-slate-300">{l}</span>
            <b className={cn("rounded px-1.5 font-mono text-[12px]", !art ? "text-slate-400" : d ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-brand-500/15 text-brand-700 dark:text-brand-300")}>{a}</b></button>); })}</div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {col("Estupefacientes", "Tenencia, consumo, distribución y tráfico", <Pill />, DROGAS, false)}
        {col("Dinero en efectivo", "Origen no justificado y divisas", <Banknote />, DINERO, true)}
      </div>
      {none && <p className="py-8 text-center text-sm text-slate-400">Nada coincide con «{q}».</p>}
    </div>);
}
