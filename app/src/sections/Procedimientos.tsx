/* Códigos › Procedimientos (LSPD, desde Police Officer III): actualización de sanciones por estupefacientes y dinero no justificado.
   Cada fila: artículo, cuándo se aplica e indicaciones para el agente. Lo marcado con **…** va en negrita. Clic en el artículo lo copia. */
import { Fragment, useState } from "react";
import { Banknote, Check, Copy } from "lucide-react";
import { Card } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { cn } from "@/lib/cn";

type Row = { a: string; t: string; c: string; i: string; din?: boolean };
const ROWS: Row[] = [
  { a: "29.12", t: "Tenencia de sustancias estupefacientes para autoconsumo (cantidad limitada)", c: "Lleva **entre 6 y 19 unidades** de cualquier droga.",
    i: "Se aplica **siempre que no se le vea en flagrante delito de venta de estupefacientes ni haya indicios de que estuviera vendiendo**, como llevar una considerable cantidad de efectivo sin justificar. Sancionar y retirar la sustancia. Aquí el tipo de droga no cambia la sanción. **Con menos de 6 unidades no se aplica sanción, pero se le retiran las drogas.**" },
  { a: "29.13", t: "Consumo de sustancias estupefacientes en vía pública o lugares de uso común", c: "Consume o tiene preparada droga en la calle, el transporte público o un espacio común, a la vista o molestando a terceros.",
    i: "**Sancionar y retirar la sustancia.**" },
  { a: "138.21", t: "Tráfico de drogas tóxicas o estupefacientes que causan grave daño a la salud", c: "Lleva **más de 20 unidades de cualquier droga que no sea popper, porros de marihuana y hachís, o derivados de los mismos**, o la cultiva, elabora, transporta o vende.",
    i: "También se comprobará el dinero en efectivo si lo llevara y **se sancionará con el artículo 29.16 en caso de portar dinero en efectivo sin justificar.**" },
  { a: "138.22", t: "Tráfico de drogas que no causan grave daño a la salud", c: "Lleva **más de 20 unidades de popper, porros de marihuana y hachís, o derivados de los mismos**, o los cultiva, elabora, transporta o vende.",
    i: "Solo estas sustancias se consideran drogas que no causan grave daño. También se comprobará el dinero en efectivo si lo llevara y **se sancionará con el artículo 29.16 en caso de portar dinero en efectivo sin justificar.**" },
  { a: "138.52", t: "Distribución ilegal de drogas a pequeña escala", c: "Lleva **menos de 20 unidades de drogas ilícitas destinadas al intercambio, venta o uso compartido**.",
    i: "Valorar **indicios suficientes de una transacción inmediata de venta**, como la posesión del dinero procedente de la misma y otros elementos acreditativos, aunque no se encuentre sustancia en su poder. Comprobar que **la cantidad objeto de la transacción no supere el umbral indicado**." },
  { a: "29.16", t: "Tenencia de dinero en efectivo no justificado", din: true, c: "Lleva efectivo, en cualquier divisa, y no acredita su origen lícito cuando se le requiere.",
    i: "Se puede comprobar la procedencia del dinero si porta **$1500 o más** en efectivo o si, llevando menos, **es sospechoso de haberlo obtenido con la venta de estupefacientes o con delitos que impliquen un beneficio económico en efectivo.** Retirar **todo el efectivo** y poner **solo la sanción base. No se aplica ningún porcentaje.** La sanción se pone también **si el dinero viene de la venta de droga.**" },
  { a: "132.97", t: "Comercio ilícito de divisas", din: true, c: "Lleva **más de $30.001 en efectivo** sin registro ni autorización.",
    i: "**Avisar a la DB** y, si no está disponible, **al FIB.** Será muy raro encontrarse con este caso, porque este artículo suele imputarse por movimientos económicos irregulares y no por efectivo." },
];
/* **negrita** → <b> */
const md = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? <b key={i} className="font-semibold text-slate-900 dark:text-white">{x}</b> : <Fragment key={i}>{x}</Fragment>));

export function Procedimientos() {
  const { toast } = useFeedback(), [ok, setOk] = useState("");
  const copy = async (r: Row) => { try { await navigator.clipboard.writeText(`${r.a} ${r.t}`); setOk(r.a); toast(`Art. ${r.a} copiado`); window.setTimeout(() => setOk(""), 1300); } catch { /* */ } };
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">💊 Estupefacientes y dinero sin declarar 💵</h2>
      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-6 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500 lg:grid dark:border-slate-800 dark:bg-slate-900/60">
          <span>Artículo</span><span>Cuándo se aplica</span><span>Indicaciones para el agente</span></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{ROWS.map(r => (
          <div key={r.a} className="grid gap-3 border-l-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-6" style={{ borderLeftColor: r.din ? "#22c55e" : "rgb(var(--b-500))" }}>
            <button onClick={() => copy(r)} title="Copiar artículo" className="group flex items-start gap-2.5 text-left">
              <span className={cn("mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[13px] font-bold", r.din ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-brand-500/15 text-brand-700 dark:text-brand-300")}>{r.a}</span>
              <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">{r.t}</span>
              {ok === r.a ? <Check className="mt-1 size-3.5 shrink-0 text-emerald-500" /> : <Copy className="mt-1 size-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />}
            </button>
            <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300"><span className="mb-0.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Cuándo se aplica</span>{md(r.c)}</p>
            <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300"><span className="mb-0.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Indicaciones</span>{md(r.i)}</p>
          </div>))}</div>
      </Card>
      <p className="flex items-center gap-1.5 text-xs text-slate-400"><Banknote className="size-3.5 text-emerald-500" />En verde, los artículos de dinero. Tocá un artículo para copiarlo.</p>
    </div>);
}
