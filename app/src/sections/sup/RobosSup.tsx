/* Supervisores › Robos: la versión oficial del catálogo de robos y su articulado.
   Sale de la base (lspdt.robos, la publica six); si todavía no está publicada, se arma con el mismo catálogo. */
import { useMemo, useState } from "react";
import { BookOpen, Check, Dices, Gavel, History, Layers, Search, Tablet } from "lucide-react";
import { Card, Empty, SearchInput } from "@/components/ui";
import { Modal } from "@/components/modal";
import { CopyMenu } from "@/components/output";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";
import { fullDT } from "@/lib/domain";
import { DivNav } from "../div/DivTools";
import { CATS, ROBOS_V, WPN, bandasDe, catalogo, edOfPub, recOf, sedesDe, tabOf, unidades, type Cat } from "../six/robosData";
import { BANDAS, BANDA_KEYS, useTablet, type Banda, type TabData } from "../six/tabletData";
import { BandaChips, TabletView } from "./RobosTablet";
import { art, fullItems, pena, pubItems, type PubItem, type Ref, type RobosPub } from "../six/robosLegal";

const KEYS = Object.keys(CATS) as Cat[];
const WL = ["Arma blanca", "Pistola", "Escopeta", "SMG", "Fusil"];
const PVL = ["Patrulla", "Interceptor", "Helicóptero", "Barco"];
const COLS = [["tent", "Tentativa", "#eab308", "Lo intentaron y no lo consiguieron"], ["cons", "Consumado", "#f97316", "Lo consiguieron"], ["hom", "Con disparos", "#ef4444", "Consumado y dispararon a agentes"]] as const;
const yn = (v: boolean | null | undefined) => (v == null ? "—" : v ? "Sí" : "No");
const atr = (it: PubItem) => (it.min != null && it.max != null && it.min < it.max ? `${it.min} a ${it.max}` : it.max ?? "—");

function Armas({ arm, sm }: { arm?: string; sm?: boolean }) {
  const w = arm ? WPN[arm] : undefined; if (!w) return <span className="text-slate-400">—</span>;
  return <div className="flex flex-wrap gap-1">{WL.map((l, i) => w[i] ? (
    <span key={l} className={cn("rounded-md border px-1.5 py-0.5 font-semibold", sm ? "text-[10px]" : "text-[11px]", w[i] === 2 ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300")}>
      {l}{w[i] === 2 && " · oblig."}</span>) : null)}</div>;
}
const Chip = ({ r, c }: { r: Ref; c: string }) => { const x = art(r.a); return (
  <span title={`${r.a} · ${x?.t || ""}${r.why ? `\n${r.why}` : ""}`} className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px]" style={{ borderColor: c + "55", background: c + "12" }}>
    <b className="font-mono" style={{ color: c }}>{r.a}</b><span className="truncate text-slate-600 dark:text-slate-300">{x?.t}</span></span>); };

/* texto para Discord con el articulado del robo */
function leyText(it: PubItem) {
  const L = it.ley, C = CATS[it.cat], ln = (rs: Ref[]) => rs.map(r => `> \`${r.a}\` ${art(r.a)?.t || ""}${r.why ? ` — ${r.why}` : ""}`).join("\n") || "> —";
  return [`## 🚨 ${it.n}`, `**Tipo:** ${C.l}${C.code ? ` (código ${C.code})` : ""}  ·  **Atracadores:** ${atr(it)}  ·  **Policías:** ${it.pol ?? "—"}`, "",
    "### ⚖️ Tentativa", ln(L.tent), "### ⚖️ Consumado", ln(L.cons), "### 🔫 Con disparos a agentes", ln(L.hom),
    ...(L.inc.length ? ["### ✅ Ya incluye (no se imputa aparte)", L.inc.map(x => `> • ${x.l} (${x.a})`).join("\n")] : []),
    ...(L.cond.length ? ["### ➕ Según lo que pase", ...L.cond.map(c => `**${c.l}** — ${c.when}${c.alt ? " *(en lugar del principal)*" : ""}${c.inc ? `\n> ✓ ${c.inc}` : ""}${c.arts.length ? "\n" + ln(c.arts) : ""}`)] : []),
    ...(L.nota ? ["", `-# ${L.nota}`] : []), "-# Guía orientativa: el agente ajusta a lo que pasó."].join("\n");
}

export function RobosSup() {
  const [P] = useJSON<RobosPub | null>("lspdt.robos", null);
  /* Gestión de ilícitos (six y quienes él suma) ve todo: recompensas, tablet y bandas. El resto, la versión publicada sin eso */
  const T = useTablet();
  const all = useMemo(() => (T ? fullItems(catalogo(edOfPub(P?.items), T)) : P?.items?.length && P.v === ROBOS_V ? P.items : pubItems(catalogo(edOfPub(P?.items)))), [P, T]);
  const [tab, setTab] = useState<"cat" | "art" | "tab" | "his">("cat"), [cat, setCat] = useState<Cat | "">(""), [q, setQ] = useState(""), [sel, setSel] = useState<PubItem | null>(null), [bd, setBd] = useState<Banda | "">("");
  const s = q.trim().toLowerCase();
  const L = all.filter(x => (!cat || x.cat === cat) && (!bd || bandasDe(x.mis).includes(bd)) && (!s || `${x.n} ${[...x.ley.cons, ...x.ley.cond.flatMap(c => c.arts)].map(r => `${r.a} ${art(r.a)?.t}`).join(" ")}`.toLowerCase().includes(s)));
  return (
    <div className="space-y-4">
      <DivNav value={tab} onChange={v => setTab(v as "cat" | "art" | "tab" | "his")} options={[{ value: "cat", label: "Catálogo de robos", icon: <BookOpen />, txt: "Catálogo" }, { value: "art", label: "Articulado de robos", icon: <Gavel />, txt: "Articulado" },
        ...(T ? [{ value: "tab", label: "En la tablet (robos activos y misiones)", icon: <Tablet />, txt: "Tablet" }] : []), { value: "his", label: `Historial de cambios (${P?.log?.length || 0})`, icon: <History />, txt: "Historial" }]} />
      {tab === "tab" && T ? <TabletView T={T} /> : tab === "his" ? <Card className="divide-y divide-slate-100 dark:divide-slate-800">{!P?.log?.length ? <Empty icon={<History />} title="Sin cambios todavía" desc="Cuando six actualice un robo, queda registrado acá." />
        : P.log.map((x, i) => <div key={i} className="px-4 py-3"><div className="flex flex-wrap items-baseline gap-x-2"><b>{x.n}</b>{x.r && <span className="rounded bg-slate-500/15 px-1.5 text-[10px] font-bold text-slate-500">RESTAURADO</span>}<span className="ml-auto text-xs text-slate-500">{fullDT(x.t)}</span></div>
          <ul className="mt-1 text-sm text-slate-600 dark:text-slate-300">{x.c.map(c => <li key={c}>· {c}</li>)}</ul></div>)}</Card> : <>
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-[12.5px] text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400"><Check className="size-4" />Versión oficial</span>
        <span>{P?.at ? `Publicada ${fullDT(P.at)}` : "Catálogo vigente"} · {all.filter(x => x.cat !== "mis").length} robos y {all.filter(x => x.cat === "mis").length} misiones</span>
        <span className="basis-full text-[12px] text-slate-500">Si el artículo del robo ya trae un agravante (armas, rostro cubierto, huida, hackeo…) <b>no se imputa aparte</b>: la pena del artículo ya lo cubre. El homicidio doloso (119.1) va solo si hay CK de un jugador.</span>
        <span className="basis-full inline-flex items-start gap-1.5 text-[12px] text-slate-500"><Dices className="mt-0.5 size-3.5 shrink-0 text-brand-500" /><span>Rehenes: los NPC salen con el comando IC <b>/dados</b> (del 1 al 6) y <b>no se imputan</b>. La detención ilegal (124.1) va solo si el rehén es un jugador (persona física).</span></span>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput className="min-w-[14rem] flex-1 sm:max-w-xs" value={q} onChange={setQ} placeholder={tab === "art" ? "Buscar robo o artículo (ej: 132.110)…" : "Buscar robo…"} />
        <div className="flex flex-wrap gap-1">{(["", ...KEYS] as (Cat | "")[]).map(k => { const on = cat === k, c = k ? CATS[k].c : undefined, n = k ? all.filter(x => x.cat === k).length : all.length; return (
          <button key={k || "all"} onClick={() => setCat(k)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition", on ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
            style={on ? { background: c || "rgb(var(--b-600))" } : undefined}>{k && !on && <span className="size-2 rounded-full" style={{ background: c }} />}{k ? CATS[k].l : "Todos"}<span className="tabular-nums opacity-70">{n}</span></button>); })}</div>
      </div>
      {T && <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tipo de banda</span>
        {(["", ...BANDA_KEYS] as (Banda | "")[]).map(b => { const on = bd === b, n = b ? all.filter(x => bandasDe(x.mis).includes(b)).length : 0; return (
          <button key={b || "all"} onClick={() => setBd(b)} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition", on ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300")}
            style={on ? { background: b ? BANDAS[b].c : "rgb(var(--b-600))" } : undefined}>{b ? BANDAS[b].l : "Todas"}{b && <span className="tabular-nums opacity-70">{n}</span>}</button>); })}</div>}
      {!L.length ? <Card><Empty icon={<Search />} title="Nada coincide" /></Card> : KEYS.filter(k => L.some(x => x.cat === k)).map(k => { const C = CATS[k], G = L.filter(x => x.cat === k); return (
        <Card key={k} className="cv-auto overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800" style={{ background: `linear-gradient(90deg, ${C.c}18, transparent 60%)` }}>
            <span className="size-2.5 rounded-full" style={{ background: C.c }} /><b className="text-sm">{C.l}</b>{C.code && <span className="rounded border border-slate-300 px-1 font-mono text-[10px] text-slate-500 dark:border-slate-600">Cód. {C.code}</span>}
            <span className="text-xs text-slate-500">· {C.d}</span><span className="ml-auto text-xs font-semibold text-slate-500">{G.length}</span></div>
          {tab === "cat" ? <>
            <div className={cn("hidden gap-3", T ? "grid-cols-[minmax(0,1.5fr)_5rem_6.5rem_minmax(0,1fr)_4rem_minmax(0,1.6fr)_minmax(0,1fr)]" : "grid-cols-[minmax(0,1.5fr)_5rem_6.5rem_minmax(0,1fr)_4rem_minmax(0,1.6fr)]", " border-b border-slate-100 px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 xl:grid dark:border-slate-800")}>
              <span>Robo</span><span>Atracad.</span><span>Policías</span><span>Rehenes</span><span>Bloqueo</span><span>Armas</span>{T && <span>Recompensa</span>}</div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{G.map(it => { const R = recOf(it.mis); return (
              <button key={it.id} onClick={() => setSel(it)} className={cn("grid w-full gap-x-3 gap-y-1 px-4 py-2.5 text-left text-[12.5px] transition hover:bg-slate-50 xl:items-center dark:hover:bg-slate-800/40", T ? "xl:grid-cols-[minmax(0,1.5fr)_5rem_6.5rem_minmax(0,1fr)_4rem_minmax(0,1.6fr)_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1.5fr)_5rem_6.5rem_minmax(0,1fr)_4rem_minmax(0,1.6fr)]")}>
                <span className="min-w-0"><b className="block truncate text-[13.5px]">{it.n}</b><span className="text-[11px] text-slate-500">{it.ilg || "—"}{(() => { const X = tabOf(it.mis), S = sedesDe(it.id, T).length; return [X && ` · Nv. ${X.nv}+ · ${X.pt} pol. para arrancar`, S > 0 && ` · ${S} sede${S > 1 ? "s" : ""} en la tablet`].filter(Boolean).join(""); })()}</span>
                  {bandasDe(it.mis).length > 0 && <span className="mt-0.5 flex flex-wrap gap-1"><BandaChips L={bandasDe(it.mis)} sm /></span>}</span>
                <span><span className="text-slate-400 xl:hidden">Atracadores: </span><b className="tabular-nums">{atr(it)}</b></span>
                <span><span className="text-slate-400 xl:hidden">Policías: </span><b className="tabular-nums text-sky-600 dark:text-sky-400">{it.pol ?? "—"}</b>{it.pol ? <span className="block text-[10.5px] text-slate-500">{unidades(it.pol)}</span> : null}</span>
                <span className="truncate"><span className="text-slate-400 xl:hidden">Rehenes: </span>{it.reh || "—"}</span>
                <span><span className="text-slate-400 xl:hidden">Bloqueo: </span>{yn(it.blq)}</span>
                <Armas arm={it.arm} sm />
                {T && <span><span className="text-slate-400 xl:hidden">Recompensa: </span><b className="text-emerald-600 dark:text-emerald-400">{R.money || (R.pend ? "A definir" : "—")}</b>{R.extra.length > 0 && <span className="block truncate text-[10.5px] text-slate-500">+ {R.extra.join(", ")}</span>}</span>}
              </button>); })}</div>
          </> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{G.map(it => { const Y = it.ley; return (
            <button key={it.id} onClick={() => setSel(it)} className="grid w-full gap-x-4 gap-y-1.5 px-4 py-2.5 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] dark:hover:bg-slate-800/40">
              <span className="min-w-0"><b className="block text-[13.5px]">{it.n}</b>{Y.cond.length > 0 && <span className="text-[11px] text-slate-500">+{Y.cond.filter(c => c.arts.length).length} según lo que pase</span>}</span>
              <span className="space-y-1">
                <span className="flex flex-wrap items-center gap-1"><span className="w-20 shrink-0 text-[10.5px] font-bold uppercase tracking-wider text-orange-500">Consumado</span>{Y.cons.map(r => <Chip key={r.a} r={r} c="#f97316" />)}</span>
                <span className="flex flex-wrap items-center gap-1"><span className="w-20 shrink-0 text-[10.5px] font-bold uppercase tracking-wider text-red-500">Disparos</span>{Y.hom.length > Y.cons.length ? Y.hom.filter(r => !Y.cons.some(c => c.a === r.a)).map(r => <Chip key={r.a} r={r} c="#ef4444" />) : <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Ya incluido en el artículo</span>}</span>
                {Y.inc.length > 0 && <span className="block text-[11px] text-emerald-700 dark:text-emerald-400">✓ Ya incluye: {Y.inc.map(x => x.l.toLowerCase()).join(" · ")}</span>}
              </span>
            </button>); })}</div>}
        </Card>); })}
      </>}
      {sel && <RoboModal it={sel} T={T} onClose={() => setSel(null)} />}
    </div>);
}

function ArtRow({ r, c }: { r: Ref; c: string }) {
  const x = art(r.a); if (!x) return null;
  return (
    <div className="rounded-xl border p-2.5" style={{ borderColor: c + "45", background: c + "0c" }}>
      <div className="flex flex-wrap items-baseline gap-x-2"><b className="font-mono text-[13px]" style={{ color: c }}>Art. {x.a}</b><b className="text-[13px]">{x.t}</b><span className="ml-auto text-xs font-semibold text-slate-500">{pena(x)}</span></div>
      {r.why && <p className="mt-0.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">→ {r.why}</p>}
      {x.d && <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">{x.d}</p>}
    </div>);
}
function RoboModal({ it, T, onClose }: { it: PubItem; T: TabData | null; onClose: () => void }) {
  const sedes = sedesDe(it.id, T);
  const L = it.ley, C = CATS[it.cat], R = recOf(it.mis), [tab, setTab] = useState<"tent" | "cons" | "hom">("cons"), cc = COLS.find(c => c[0] === tab)!;
  const tot = L[tab].reduce((t, r) => { const x = art(r.a); return { m: t.m + (x?.m || 0), p: t.p + (x?.p || 0) }; }, { m: 0, p: 0 });
  const info: [string, string][] = [["Atracadores", String(atr(it))], ["Policías", `${it.pol ?? "—"}${it.pol ? ` (${unidades(it.pol)})` : ""}`], ["Rehenes", it.reh || "—"], ["Bloqueo", yn(it.blq)], ["Vehículo", it.ilg || "—"],
    ["Unidades policiales", [...PVL.filter((_, j) => it.pv?.[j]), ...(it.mando ? ["Con mando"] : [])].join(", ") || "—"], ...(T ? [["Recompensa", [R.money || (R.pend ? "A definir" : "—"), ...R.extra].join(" + ")] as [string, string]] : [])];
  return (
    <Modal open onClose={onClose} size="xl" icon={<Gavel />} title={it.n} desc={<span><span className="font-semibold" style={{ color: C.c }}>{C.l}</span>{C.code ? ` · código ${C.code}` : ""}</span>}
      footer={<><span className="mr-auto text-xs text-slate-500">Guía orientativa: el agente ajusta a lo que pasó.</span><CopyMenu size="md" variant="primary" text={leyText(it)} up /></>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-[12.5px] dark:divide-slate-800 dark:border-slate-800">{info.map(([k, v]) => <div key={k} className="flex gap-3 px-3 py-1.5"><dt className="w-28 shrink-0 text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
          <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Armas</p><Armas arm={it.arm} /><p className="mt-1 text-[11px] text-slate-500">{it.arm}</p></div>
          {it.mis.length > 0 && <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Misiones</p>
            <ul className="space-y-1 text-[12px]">{it.mis.map(m => <li key={m.n + m.f[0]} className="rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50"><b>{m.n}</b> <span className="text-slate-500">· {m.min}–{m.max}{m.rec ? ` · ${m.rec}` : ""}</span>
              {m.tab?.map((t, i) => <span key={i} className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500"><Tablet className="size-3" />Nv. {t.nv}+ · {t.min}–{t.max} jug. · {t.pt} pol. · ${t.$.toLocaleString("es-AR")} · +{t.xp} xp{t.b && <BandaChips L={[t.b]} sm />}</span>)}</li>)}</ul></div>}
          {sedes.length > 0 && <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Sedes en la tablet ({sedes.length})</p>
            <ul className="flex flex-wrap gap-1 text-[11px]">{sedes.map(t => <li key={t.n} className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{t.n} <span className="text-slate-400">· {t.cd} min</span></li>)}</ul></div>}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">{COLS.map(([k, l, c, d]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded-xl border-2 p-2 text-left transition", tab === k ? "" : "border-slate-200 text-slate-500 dark:border-slate-800")} style={tab === k ? { borderColor: c, background: c + "16" } : undefined}>
              <p className="text-[13px] font-bold" style={tab === k ? { color: c } : undefined}>{l}</p><p className="text-[10.5px] leading-snug opacity-80">{d}</p></button>))}</div>
          {L.inc.length > 0 && <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[.07] p-2.5 text-[12px]"><p className="font-bold text-emerald-700 dark:text-emerald-300">Ya incluye como agravante (no se imputa aparte)</p>
            <div className="mt-1 flex flex-wrap gap-1">{L.inc.map(x => <span key={x.k} className="rounded-md border border-emerald-500/30 px-1.5 py-0.5 text-[11px]"><b className="font-mono">{x.a}</b> · {x.l}</span>)}</div></div>}
          <div className="space-y-1.5">{L[tab].map(r => <ArtRow key={r.a} r={r} c={cc[2]} />)}
            <p className="text-right text-xs text-slate-500">Suma orientativa: <b>${tot.m.toLocaleString("es-AR")}</b> · <b>{tot.p} meses</b>{tab === "tent" && " (en tentativa se aplica la rebaja que corresponda)"}</p></div>
          {L.cond.length > 0 && <div className="space-y-2"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Según lo que pase · solo si ocurre</p>
            {L.cond.map(c => <div key={c.k} className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold"><Layers className="size-4 text-brand-500" />{c.l}<span className="font-normal text-slate-500">· {c.when}</span>{c.alt && <span className="ml-auto rounded bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">EN LUGAR DEL PRINCIPAL</span>}</p>
              {c.inc && <p className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[12px] text-emerald-700 dark:text-emerald-300">✓ {c.inc}</p>}
              {c.arts.map(r => <ArtRow key={r.a} r={r} c="#0ea5e9" />)}</div>)}</div>}
          {L.nota && <p className="text-xs italic text-amber-600 dark:text-amber-400">{L.nota}</p>}
        </div>
      </div>
    </Modal>);
}
