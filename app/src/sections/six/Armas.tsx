/* Panel de six y de Anita › ARMAS: el weapons.lua del servidor (ox_inventory). Buscás, tocás un ítem y ves su ficha: qué accesorios
   le entran (agrupados por tipo), qué munición usa y qué otras armas la comparten; en un accesorio, en qué armas entra. Todo se toca
   para saltar a esa ficha. El bloque Lua sigue a mano para copiar (o editar antes de copiar), y se pueden marcar varios o copiar el archivo entero. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Box, Check, ChevronDown, Code2, Copy, Crosshair, FileCode2, Flashlight, Focus, Hand, Layers, Palette, Puzzle, Ruler, Search, Weight, Wind, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { cn } from "@/lib/cn";
import type { Arma } from "./armasData";

type Cat = "all" | Arma["c"];
type Cx = { COMPAT: Record<string, string[]>; GRUPO: Record<string, string>; TIPO: Record<string, string> };
const CAT: [Cat, string, string][] = [["all", "Todo", "Weapons, Components y Ammo"], ["arma", "Armas", "Weapons"], ["accesorio", "Accesorios", "Components"], ["municion", "Munición", "Ammo"]];
const SEC: Record<Arma["c"], string> = { arma: "Weapons", accesorio: "Components", municion: "Ammo" };
/* tipos de accesorio de ox_inventory, en el orden en que se muestran */
const TIP: [string, string, typeof X][] = [["sight", "Miras", Focus], ["magazine", "Cargadores", Layers], ["muzzle", "Boca y silenciadores", Wind], ["flashlight", "Linternas y láser", Flashlight],
  ["grip", "Empuñaduras", Hand], ["barrel", "Cañones", Ruler], ["skin", "Kits de pintura", Palette]];
const TIP1: Record<string, string> = { sight: "Mira", magazine: "Cargador", muzzle: "Boca / silenciador", flashlight: "Linterna / láser", grip: "Empuñadura", barrel: "Cañón", skin: "Kit de pintura" };
const tipL = (t: string) => TIP.find(x => x[0] === t)?.[1] || "Otros";
const tipI = (t: string) => TIP.find(x => x[0] === t)?.[2] || Puzzle;
const ORD_G = ["Pistola", "Subfusil", "Rifle", "Escopeta", "Ametralladora", "Francotirador", "Pesada", "Arrojable", "Cuerpo a cuerpo", "Aturdidora", "Utilidad"];
const kg = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg` : `${g} g`);
/* el archivo completo, con las tres tablas en el formato de ox_inventory */
const fullLua = (L: Arma[]) => "return {\n" + (["arma", "accesorio", "municion"] as const).map(c => `\t${SEC[c]} = {\n` + L.filter(a => a.c === c).map(a => a.lua.split("\n").map(l => "\t\t" + l).join("\n")).join("\n\n") + "\n\t},").join("\n\n") + "\n}\n";

export function ArmasTab() {
  const { toast } = useFeedback(), [L, setL] = useState<Arma[] | null>(null), [cx, setCx] = useState<Cx | null>(null), [q, setQ] = useState(""), [cat, setCat] = useState<Cat>("all");
  const [stack, setStack] = useState<string[]>([]), [pick, setPick] = useState<string[]>([]), [done, setDone] = useState("");
  useEffect(() => { void import("./armasData").then(m => setL(m.ARMAS)); void import("./armasCompat").then(m => setCx({ COMPAT: m.COMPAT, GRUPO: m.GRUPO, TIPO: m.TIPO })); }, []);
  const byK = useMemo(() => new Map((L || []).map(a => [a.k, a])), [L]);
  /* accesorio → armas en las que entra */
  const accIn = useMemo(() => { const m = new Map<string, string[]>(); for (const [w, xs] of Object.entries(cx?.COMPAT || {})) for (const x of xs) m.set(x, [...(m.get(x) || []), w]); return m; }, [cx]);
  const sub = (a: Arma) => a.c === "arma" ? cx?.GRUPO[a.k] || "Arma" : a.c === "accesorio" ? TIP1[cx?.TIPO[a.k] || ""] || "Accesorio" : "Munición";
  const nAcc = (a: Arma) => a.c === "arma" ? cx?.COMPAT[a.k]?.length || 0 : a.c === "accesorio" ? accIn.get(a.k)?.length || 0 : (L || []).filter(w => w.c === "arma" && w.x === a.k).length;
  const vis = useMemo(() => { const s = q.trim().toLowerCase(); return (L || []).filter(a => (cat === "all" || a.c === cat) && (!s || `${a.k} ${a.l} ${a.x} ${cx?.GRUPO[a.k] || ""} ${tipL(cx?.TIPO[a.k] || "")}`.toLowerCase().includes(s))); }, [L, q, cat, cx]);
  const copy = async (t: string, msg: string, id = "") => { try { await navigator.clipboard.writeText(t); toast(msg); setDone(id); window.setTimeout(() => setDone(""), 1400); } catch { toast("No se pudo copiar", "err"); } };
  const open = stack.length ? byK.get(stack[stack.length - 1]) || null : null;
  if (!L) return <p className="py-16 text-center text-sm text-six/60">Cargando weapons.lua…</p>;
  return (
    <div className="space-y-3 font-sans">
      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {CAT.map(([k, l, d]) => { const n = k === "all" ? L.length : L.filter(a => a.c === k).length, on = cat === k; return (
          <button key={k} title={d} onClick={() => setCat(k)} className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-bold transition", on ? "border-six/60 bg-six/15 text-white" : "border-white/[.08] bg-black/30 text-slate-400 hover:text-white")}>
            {l}<span className={cn("font-mono text-xs", on ? "text-six" : "text-slate-500")}>{n}</span></button>); })}
        <label className="relative ml-auto min-w-[16rem] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar: nombre, WEAPON_…, munición, tipo" className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-six/60" /></label>
        <button onClick={() => copy(fullLua(L), "weapons.lua copiado entero")} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-six/50 hover:text-white"><FileCode2 className="size-4" />Copiar todo</button>
      </div>
      {/* marcados: se copian juntos */}
      {pick.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-six/40 bg-six/10 px-3 py-2 text-sm">
        <b className="text-white">{pick.length} marcados</b>
        <button onClick={() => copy(pick.map(k => byK.get(k)!.lua).join("\n\n"), `${pick.length} ítems copiados`)} className="six-btn ml-auto inline-flex items-center gap-1.5 rounded-lg bg-six/90 px-3 py-1.5 text-xs font-bold text-black"><Copy className="size-3.5" />Copiar juntos</button>
        <button onClick={() => setPick([])} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-white">Desmarcar</button></div>}
      {/* lista */}
      <div className="six-panel overflow-hidden rounded-2xl">
        {!vis.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Nada coincide con «{q}».</p>
          : <div className="max-h-[calc(100vh-17rem)] divide-y divide-white/[.05] overflow-y-auto">{vis.map(a => { const on = pick.includes(a.k), n = cx ? nAcc(a) : 0; return (
            <div key={a.k} className={cn("group flex items-center gap-3 px-3 py-2 transition hover:bg-white/[.03]", on && "bg-six/[.07]")}>
              <button aria-label={on ? "Desmarcar" : "Marcar"} onClick={() => setPick(on ? pick.filter(x => x !== a.k) : [...pick, a.k])}
                className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition", on ? "border-six bg-six text-black" : "border-white/20 text-transparent hover:border-six/60")}><Check className="size-3.5" /></button>
              <button onClick={() => setStack([a.k])} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] text-white">{a.l}</b><span className="block truncate font-mono text-[11.5px] text-six/70">{a.k}</span></span>
                {cx && <span className="hidden shrink-0 rounded-md bg-white/[.06] px-2 py-0.5 text-[11px] text-slate-300 md:inline">{sub(a)}</span>}
                {n > 0 && <span title={a.c === "arma" ? "Accesorios compatibles" : a.c === "accesorio" ? "Armas en las que entra" : "Armas que la usan"} className="hidden shrink-0 items-center gap-1 rounded-md border border-six/25 px-1.5 py-0.5 font-mono text-[11px] text-six/80 sm:inline-flex">{a.c === "arma" ? <Puzzle className="size-3" /> : <Crosshair className="size-3" />}{n}</span>}
                {a.x && <span className="hidden shrink-0 rounded-md bg-white/[.06] px-2 py-0.5 font-mono text-[11px] text-slate-400 lg:inline">{a.x}</span>}
                <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-500">{kg(a.w)}</span></button>
              <button aria-label={`Copiar ${a.k}`} title="Copiar el bloque" onClick={() => copy(a.lua, `${a.k} copiado`, a.k)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-six/15 hover:text-six">{done === a.k ? <Check className="size-4 text-six" /> : <Copy className="size-4" />}</button>
            </div>); })}</div>}
      </div>
      {open && <Ficha a={open} cx={cx} byK={byK} accIn={accIn} L={L} sub={sub} copy={copy} back={stack.length > 1 ? byK.get(stack[stack.length - 2])?.l || "" : ""}
        go={k => setStack([...stack, k])} onBack={() => setStack(stack.slice(0, -1))} onClose={() => setStack([])} />}
    </div>);
}

/* ficha de un ítem: resumen, compatibilidades navegables y bloque Lua */
function Ficha({ a, cx, byK, accIn, L, sub, copy, back, go, onBack, onClose }: {
  a: Arma; cx: Cx | null; byK: Map<string, Arma>; accIn: Map<string, string[]>; L: Arma[]; sub: (a: Arma) => string;
  copy: (t: string, msg: string) => void; back: string; go: (k: string) => void; onBack: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"info" | "lua">("info"), [txt, setTxt] = useState(a.lua), [skins, setSkins] = useState(false);
  useEffect(() => { setTxt(a.lua); setTab("info"); setSkins(false); }, [a.k]); // eslint-disable-line react-hooks/exhaustive-deps
  const ammo = a.c === "arma" && a.x ? byK.get(a.x) : undefined;
  const acc = a.c === "arma" ? (cx?.COMPAT[a.k] || []).map(k => byK.get(k)).filter((x): x is Arma => !!x) : [];
  const accG = TIP.map(([t]) => [t, acc.filter(x => (cx?.TIPO[x.k] || "") === t)] as const).filter(([, xs]) => xs.length);
  const accOther = acc.filter(x => !TIP.some(([t]) => t === cx?.TIPO[x.k]));
  /* armas para un accesorio o una munición, agrupadas por clase */
  const weapons = a.c === "accesorio" ? (accIn.get(a.k) || []) : a.c === "municion" ? L.filter(w => w.c === "arma" && w.x === a.k).map(w => w.k)
    : ammo ? L.filter(w => w.c === "arma" && w.x === a.x && w.k !== a.k).map(w => w.k) : [];
  const wG = ORD_G.map(g => [g, weapons.filter(k => (cx?.GRUPO[k] || "Utilidad") === g)] as const).filter(([, xs]) => xs.length);
  const stat = (I: typeof X, l: string, v: ReactNode, onClick?: () => void) => { const C = onClick ? "button" : "div"; return (
    <C onClick={onClick} className={cn("min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-left dark:border-slate-800", onClick && "transition hover:border-brand-500/60 hover:bg-brand-500/5")}>
      <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500"><I className="size-3.5" />{l}</span>
      <b className="mt-0.5 block truncate text-[13.5px]">{v}</b></C>); };
  const item = (x: Arma, hint?: string) => (
    <button key={x.k} onClick={() => go(x.k)} className="group flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-left transition hover:border-brand-500/60 hover:bg-brand-500/5 dark:border-slate-800">
      <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold">{x.l}</b><span className="block truncate font-mono text-[10.5px] text-slate-500">{hint ?? x.k}</span></span>
      <ChevronDown className="size-3.5 shrink-0 -rotate-90 text-slate-400 opacity-0 transition group-hover:opacity-100" /></button>);
  const group = (I: typeof X, t: string, n: number, body: ReactNode, extra?: ReactNode) => (
    <section key={t} className="space-y-1.5">
      <h4 className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500"><I className="size-3.5" />{t}<span className="font-mono font-semibold text-slate-400">{n}</span><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />{extra}</h4>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{body}</div></section>);

  return (
    <Modal open onClose={onClose} size="lg" icon={a.c === "arma" ? <Crosshair /> : a.c === "accesorio" ? (() => { const I = tipI(cx?.TIPO[a.k] || ""); return <I />; })() : <Box />} title={a.l}
      desc={<span className="flex flex-wrap items-center gap-1.5"><span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">{sub(a)}</span><span className="font-mono">{a.k}</span></span>}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        {back && <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white"><ArrowLeft className="size-4" /><span className="max-w-[10rem] truncate">{back}</span></button>}
        <button onClick={() => copy(`'${a.k}'`, "Nombre copiado")} className="ml-auto rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Copiar nombre</button>
        <button onClick={() => copy(txt, "Bloque copiado")} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500"><Copy className="size-4" />Copiar Lua</button></div>}>
      {/* pestañas */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
        {([["info", "Ficha", Puzzle], ["lua", "Código Lua", Code2]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold transition", tab === k ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-white")}>
            <I className="size-4" />{l}{k === "lua" && txt !== a.lua && <span className="size-1.5 rounded-full bg-amber-500" title="Editado" />}</button>))}
      </div>
      {tab === "lua" ? <div className="space-y-2">
        <textarea value={txt} onChange={e => setTxt(e.target.value)} spellCheck={false} rows={Math.min(22, Math.max(6, txt.split("\n").length + 1))}
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-emerald-200 outline-none focus:border-brand-500 dark:border-slate-700" />
        {txt !== a.lua && <button onClick={() => setTxt(a.lua)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="size-3.5" />Deshacer cambios</button>}
      </div> : <>
        {/* resumen */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stat(Weight, "Peso", kg(a.w))}
          {a.c === "arma" && stat(Box, "Munición", ammo ? ammo.l : a.x || "—", ammo ? () => go(ammo.k) : undefined)}
          {a.c === "arma" && stat(Puzzle, "Accesorios", acc.length || "Ninguno")}
          {a.c !== "arma" && stat(Crosshair, a.c === "accesorio" ? "Entra en" : "La usan", `${weapons.length} arma${weapons.length === 1 ? "" : "s"}`)}
          {a.c === "arma" && stat(Crosshair, "Clase", cx?.GRUPO[a.k] || "—")}
          {a.c === "accesorio" && stat(tipI(cx?.TIPO[a.k] || ""), "Tipo", sub(a))}
        </div>
        {!cx ? <p className="py-6 text-center text-sm text-slate-500">Cargando compatibilidades…</p> : <>
          {/* arma: accesorios por tipo */}
          {a.c === "arma" && (acc.length ? <div className="space-y-4">
            {accG.map(([t, xs]) => { const I = tipI(t), many = t === "skin" && xs.length > 6 && !skins;
              return group(I, tipL(t), xs.length, (many ? xs.slice(0, 6) : xs).map(x => item(x)),
                t === "skin" && xs.length > 6 ? <button onClick={() => setSkins(!skins)} className="text-[11px] font-semibold normal-case tracking-normal text-brand-600 hover:underline dark:text-brand-300">{skins ? "Ver menos" : `Ver los ${xs.length}`}</button> : undefined); })}
            {accOther.length > 0 && group(Puzzle, "Otros", accOther.length, accOther.map(x => item(x)))}
          </div> : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">Esta arma no tiene accesorios en el weapons.lua.</p>)}
          {/* accesorio / munición / misma munición: armas por clase */}
          {wG.length > 0 && <div className="space-y-4">
            {a.c === "arma" && <p className="text-[12.5px] text-slate-500">Otras armas que usan <b className="font-mono">{a.x}</b>:</p>}
            {wG.map(([g, xs]) => group(Crosshair, g, xs.length, xs.map(k => byK.get(k)).filter((x): x is Arma => !!x).map(x => item(x, x.c === "arma" && cx.COMPAT[x.k]?.length ? `${cx.COMPAT[x.k].length} accesorios` : x.k))))}
          </div>}
          {a.c !== "arma" && !weapons.length && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">No encontré armas del weapons.lua que lo usen.</p>}
        </>}
      </>}
    </Modal>);
}
