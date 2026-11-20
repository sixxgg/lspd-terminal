/* Oficiales › Procedimientos (LSPD, desde Oficial III): estupefacientes y dinero no justificado, y el mando del táctico en un 487.
   Arriba, una guía rápida por cantidad para saber qué artículo va; abajo, cada artículo con cuándo se aplica y qué hacer, en pasos cortos.
   Tocar el artículo lo copia («29.12 Tenencia…»). Lo marcado con **…** va en negrita. */
import { Fragment, useState } from "react";
import { AlertTriangle, Banknote, Car, ChevronRight, Check, Copy, Crosshair, MapPin, Pill, Users, Zap } from "lucide-react";
import { DivNav } from "@/sections/div/DivTools";
import { LS } from "@/lib/store";
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

function Drogas() {
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

/* ---------- mando del táctico en un 487 (lo que se hace en el servidor, contado por six) ----------
   Ordenado por fases: jurisdicción y mando → roles en el 487 → huida (254-V) → cod.77. Lo que cambia según el 487 sea en el sur o en el norte
   se elige arriba (Sur: LSPD · Norte: LSSD). */
type Jur = "sur" | "norte";
type Row = [string, string | ((j: Jur) => string)];
type Fase = { n: string; t: string; d: string; icon: React.ReactNode; rows: Row[]; tone?: "warn"; chain?: string[] };
const FASES: Fase[] = [
  { n: "1", t: "Jurisdicción y mando", d: "Lo primero: quién manda según dónde sea el 487.", icon: <MapPin />, rows: [
    ["Mando", j => j === "sur" ? "Lo lleva el **sur (LSPD)**. Prioridad: **SWAT** por sobre **METRO**, y METRO por sobre un **Oficial III**." : "Prioridad del **Sheriff (LSSD)**: manda su METRO, el **SEB**."],
    ["Si faltan unidades", j => j === "sur" ? "Se pide **6-ADAM** por radio interna al **LSSD** y a la **SAHP** para que acudan al 487." : "El LSSD nos puede pedir **6-ADAM** y acudimos al 487 como apoyo."],
  ] },
  { n: "2", t: "Roles en el 487", d: "Se reparten durante el 487, en este orden.", icon: <Users />, chain: ["MANDO", "1.er negociador", "2.º negociador", "METRO", "SWAT", "SEB", "SOU", "SAHP"], rows: [
    ["Negociadores", j => `Un **primer negociador** y un **segundo negociador**, por si el primero no rinde. Por lo general, de la unidad de negociación de la ${j === "sur" ? "**METRO**" : "**SEB**"} (según la jurisdicción).`],
    ["Perímetro", "**METRO, SWAT, SEB, SOU y SAHP** hacen el perímetro y **cierran calles** para evitar inconvenientes. No lo hacen el MANDO ni los dos negociadores."],
    ["Cod.8", "Para gestionar a los **heridos** y el **estado de salud de los rehenes**."],
    ["Aire", "Según lo que se negocie, el helicóptero **se retira unos minutos** (no hay un tiempo fijo) durante el 487 o durante el 254-V."],
  ] },
  { n: "3", t: "Huida · 254-V", d: "Lo organiza la unidad de MANDO.", icon: <Car />, rows: [
    ["Asignación", "El **MANDO** designa la **unidad de cabeza**, la **unidad de cola** y las **unidades de cod.100**."],
    ["Cabeza y cola", "**En cabeza**, un interceptor con licencia de **HSIU**; **en cola**, el segundo vehículo más rápido, que **no sea de la HSIU**."],
    ["Vehículo de huida", "Que sea rápido ya se contempla en la **negociación**: no se negocia por interceptores. Rara vez se retira la unidad de interceptores."],
    ["Cod.100", "Las unidades del **perímetro se suman al 254-V como cod.100**: van por **calles paralelas o aledañas**, **nunca a la par** del 254-V."],
  ] },
  { n: "4", t: "Cod.77 · bloqueo", d: "Cuando se informa por radio, o antes de llegar al vehículo donde se va a hacer.", icon: <AlertTriangle />, tone: "warn", rows: [
    ["Prioridad del MANDO", "Ordenar que **el aire despegue** y se sume al **254-V**."],
    ["Clave Robert", "Art. 22: **prohibido activarla para pinchar ruedas en zonas urbanas o pobladas**; solo en **vías secundarias, autopistas o zonas despobladas**. Disparar para abatir a quien huye de espaldas sin peligro inminente es motivo de causa judicial."],
  ] },
];
function Tactico() {
  const [j, setJ] = useState<Jur>(() => (LS.get("lspdt.next.procjur") === "norte" ? "norte" : "sur"));
  const pick = (v: Jur) => { setJ(v); LS.set("lspdt.next.procjur", v); };
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300"><Crosshair className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold">Mando del táctico en un 487</p><p className="text-xs text-slate-500">Quién manda, quién negocia y cómo sale cada unidad, en orden.</p></div>
        <div className="inline-flex rounded-xl border border-slate-200 p-1 dark:border-slate-700" role="radiogroup" aria-label="Jurisdicción">
          {([["sur", "Sur · LSPD"], ["norte", "Norte · LSSD"]] as const).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={j === v} onClick={() => pick(v)} className={cn("rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", j === v ? "bg-brand-600 text-white dark:bg-brand-500" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}>{l}</button>))}
        </div>
      </Card>
      <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[21px] before:top-6 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
        {FASES.map(f => (
          <li key={f.n} className="relative flex gap-3">
            <span className={cn("relative z-10 grid size-11 shrink-0 place-items-center rounded-2xl ring-4 ring-slate-50 dark:ring-slate-950 [&>svg]:size-5",
              f.tone === "warn" ? "bg-amber-500 text-black" : "bg-brand-600 text-white dark:bg-brand-500")}>{f.icon}</span>
            <Card className={cn("min-w-0 flex-1 overflow-hidden p-0", f.tone === "warn" && "border-amber-500/40")}>
              <div className={cn("flex flex-wrap items-baseline gap-x-2 border-b px-4 py-2.5", f.tone === "warn" ? "border-amber-500/30 bg-amber-500/[.07]" : "border-slate-100 dark:border-slate-800")}>
                <span className="font-mono text-xs font-bold text-slate-400">FASE {f.n}</span><p className="font-semibold">{f.t}</p><p className="text-xs text-slate-500">{f.d}</p></div>
              {f.chain && <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-3 dark:border-slate-800">{f.chain.map((c, i) => (
                <Fragment key={c}>{i > 0 && <ChevronRight className="size-3.5 text-slate-400" />}<span className={cn("rounded-lg px-2 py-1 text-xs font-semibold", i === 0 ? "bg-brand-600 text-white dark:bg-brand-500" : i < 3 ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>{c}</span></Fragment>))}</div>}
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">{f.rows.map(([k, v]) => (
                <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="text-[13px] font-semibold text-slate-900 dark:text-white">{k}</dt>
                  <dd className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{md(typeof v === "function" ? v(j) : v)}</dd>
                </div>))}</dl>
            </Card>
          </li>))}
      </ol>
    </div>);
}

const SUBS = [{ value: "dro", label: "Estupefacientes y dinero", txt: "Estupefacientes y dinero", icon: <Pill /> }, { value: "tac", label: "Mando del táctico (487)", txt: "Mando del táctico (487)", icon: <Crosshair /> }];
export function Procedimientos() {
  const [t, setT] = useState(() => (LS.get("lspdt.next.proc") === "tac" ? "tac" : "dro"));
  return (
    <div className="space-y-4">
      <DivNav sub value={t} onChange={v => { setT(v); LS.set("lspdt.next.proc", v); }} options={SUBS} />
      {t === "tac" ? <Tactico /> : <Drogas />}
    </div>);
}
