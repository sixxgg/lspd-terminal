/* six · ROBOS: el catálogo de robos, el articulado de cada robo (qué artículos del Código Penal corresponden) y la exportación a Excel.
   Las tres vistas comparten el filtro por tipo de robo. */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Copy, Download, FileSpreadsheet, Gavel, Layers, Link2, Scale, Search, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Catalogo } from "./Robos";
import { CATS, catalogo, type Cat, type Item } from "./robosData";
import { art, leyOf, pena, type Ref } from "./robosLegal";

type View = "cat" | "art" | "xls";
const VK = "lspdt.six.robView", KEYS = Object.keys(CATS) as Cat[];

/* filtro por tipo: tarjetas con el nombre, el código policial aparte y la cantidad */
function CatBar({ cat, set, all }: { cat: Cat | "all"; set: (c: Cat | "all") => void; all: Item[] }) {
  const opts: [Cat | "all", string, string, string | undefined, number][] = [["all", "Todos", "#94a3b8", undefined, all.length], ...KEYS.map(k => [k, CATS[k].l, CATS[k].c, CATS[k].code, all.filter(x => x.cat === k).length] as [Cat, string, string, string | undefined, number])];
  return (
    <div className="grid grid-cols-2 gap-2 font-sans sm:grid-cols-4 xl:grid-cols-7">{opts.map(([k, l, c, code, n]) => { const on = cat === k; return (
      <button key={k} onClick={() => set(k)} aria-pressed={on} className={cn("group relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition", on ? "text-white" : "border-white/[.07] bg-black/30 text-slate-400 hover:border-white/15 hover:text-slate-200")}
        style={on ? { borderColor: c + "99", background: `linear-gradient(135deg, ${c}33, ${c}0d)`, boxShadow: `0 0 18px -8px ${c}` } : undefined}>
        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c }} />
        <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold leading-tight">{l}</span>
          <span className="mt-0.5 block text-[10.5px] text-slate-500">{code ? <span className="font-mono">Código {code}</span> : k === "all" ? "Todas las categorías" : k === "mis" ? "No son robos" : "Sin código"}</span></span>
        <span className="text-xl font-black tabular-nums" style={{ color: on ? "#fff" : c }}>{n}</span>
      </button>); })}</div>);
}

/* share: vista de un invitado (link de six): sin Excel, sin foto y sin invitar */
export function RobosTab({ share }: { share?: boolean }) {
  const all = useMemo(catalogo, []), [inv, setInv] = useState(false);
  const [view, setView] = useState<View>(() => { const v = LS.get(VK) as View; return v && !(share && v === "xls") ? v : "cat"; }), [cat, setCat] = useState<Cat | "all">("all");
  const go = (v: View) => { setView(v); LS.set(VK, v); };
  const T: [View, string, typeof BookOpen][] = [["cat", "CATÁLOGO DE ROBOS", BookOpen], ["art", "ARTÍCULOS PARA LOS ROBOS", Gavel], ...(share ? [] : [["xls", "EXPORTAR A EXCEL", FileSpreadsheet] as [View, string, typeof BookOpen]])];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-2xl border border-six/15 bg-black/40 p-1">{T.map(([k, l, I]) => (
        <button key={k} onClick={() => go(k)} className={cn("six-btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold tracking-[0.12em] transition", view === k ? "border border-six/60 bg-six/15 text-six" : "border border-transparent text-slate-500 hover:text-slate-300")}>
          <I className="size-4" />{l}</button>))}
        {!share && <button onClick={() => setInv(true)} className="six-btn inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-xs font-bold tracking-[0.12em] text-slate-400 transition hover:text-six"><UserPlus className="size-4" />INVITAR A VER</button>}</div>
      {view !== "xls" && <CatBar cat={cat} set={setCat} all={all} />}
      {view === "cat" ? <Catalogo cat={cat} share={share} /> : view === "art" ? <Articulos all={all} cat={cat} /> : !share && <Exportar all={all} />}
      {inv && <Invite onClose={() => setInv(false)} />}
    </div>);
}

/* ---------- invitar: links de solo lectura a Catálogo y Artículos (con el tema de six), con vencimiento y revocables ---------- */
type Lnk = { t: string; exp: number; views: number; title: string; last: number; at: number };
const DUR: [number, string][] = [[24, "1 día"], [72, "3 días"], [168, "7 días"], [720, "30 días"]];
function Invite({ onClose }: { onClose: () => void }) {
  const { toast, confirm } = useFeedback(), [L, setL] = useState<Lnk[] | null>(null), [n, setN] = useState(""), [h, setH] = useState(168), [busy, setBusy] = useState(false), [last, setLast] = useState("");
  const url = (t: string) => `${location.origin}/next/?robos=${t}`;
  const load = () => void api("/api/share", { list: "lspdt.six.cfg" }).then(r => setL(r.__s === 200 ? r.list : []));
  useEffect(load, []);
  const make = async () => {
    setBusy(true); const r = await api("/api/share", { k: "lspdt.six.cfg", h, title: n.trim() || "Invitado" }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo crear el link", "err"); return; }
    const u = url(r.t); setLast(u); void navigator.clipboard?.writeText(u).catch(() => {}); toast("Link copiado"); setN(""); load();
  };
  const del = async (x: Lnk) => { if (!(await confirm(`¿Revocar el link de ${x.title}? Deja de funcionar al instante.`, { danger: true, ok: "Revocar" }))) return; await api("/api/share", { del: x.t }); load(); };
  const left = (e: number) => { const d = e - Date.now(); return d > 864e5 ? `${Math.round(d / 864e5)} d` : `${Math.max(1, Math.round(d / 36e5))} h`; };
  return (
    <Modal open onClose={onClose} size="md" icon={<UserPlus />} title="Invitar a ver Robos" desc="Quien tenga el link ve el Catálogo y los Artículos tal cual los ves vos, sin iniciar sesión. El Excel no aparece.">
      <div className="space-y-3 font-sans">
        <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Para quién</span>
          <input value={n} onChange={e => setN(e.target.value)} maxLength={60} placeholder="Ej: Bernal, staff de ilícitos…" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-six dark:border-slate-700" /></label>
        <div><span className="text-xs font-semibold text-slate-500">Vence en</span>
          <div className="mt-1 grid grid-cols-4 gap-1.5">{DUR.map(([v, l]) => <button key={v} onClick={() => setH(v)} className={cn("rounded-lg border py-1.5 text-xs font-semibold transition", h === v ? "border-six bg-six/15 text-six" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{l}</button>)}</div></div>
        <button disabled={busy} onClick={make} className="six-btn inline-flex w-full items-center justify-center gap-2 rounded-xl border border-six/60 bg-six/15 px-4 py-2.5 text-xs font-bold tracking-[0.12em] text-six disabled:opacity-40"><Link2 className="size-4" />{busy ? "CREANDO…" : "CREAR Y COPIAR LINK"}</button>
        {last && <p className="break-all rounded-lg bg-black/30 px-3 py-2 font-mono text-[11.5px] text-six">{last}</p>}
        <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Links activos</p>
          {!L ? <p className="text-sm text-slate-500">Cargando…</p> : !L.length ? <p className="text-sm text-slate-500">No hay links activos.</p> :
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{L.map(x => (
            <div key={x.t} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{x.title}</p>
                <p className="text-[11.5px] text-slate-500">Vence en {left(x.exp)} · {x.views} {x.views === 1 ? "vista" : "vistas"}{x.last ? ` · última ${new Date(x.last).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}` : ""}</p></div>
              <button onClick={() => { void navigator.clipboard?.writeText(url(x.t)).catch(() => {}); toast("Link copiado"); }} aria-label="Copiar link" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-six dark:hover:bg-slate-800"><Copy className="size-4" /></button>
              <button onClick={() => void del(x)} aria-label="Revocar" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button></div>))}</div>}</div>
      </div>
    </Modal>);
}

/* ---------- artículos ---------- */
const COLS = [["tent", "Tentativa", "#eab308", "Lo intentaron pero no lo consiguieron"], ["cons", "Consumado", "#f97316", "Lo consiguieron"], ["hom", "Con disparos", "#ef4444", "Consumado y además dispararon a agentes"]] as const;
const Chip = ({ r, c }: { r: Ref; c: string }) => { const x = art(r.a); return (
  <span title={`${r.a} · ${x?.t || ""}${r.why ? `\n${r.why}` : ""}`} className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px]" style={{ borderColor: c + "55", background: c + "14" }}>
    <b className="font-mono" style={{ color: c }}>{r.a}</b><span className="truncate text-slate-300">{x?.t}</span></span>); };

function Articulos({ all, cat }: { all: Item[]; cat: Cat | "all" }) {
  const [q, setQ] = useState(""), [sel, setSel] = useState<Item | null>(null);
  const qq = q.trim().toLowerCase();
  const list = all.filter(x => (cat === "all" || x.cat === cat) && (!qq || (x.n + " " + JSON.stringify(leyOf(x)) + " " + leyOf(x).cons.map(r => art(r.a)?.t).join(" ")).toLowerCase().includes(qq)));
  return (
    <div className="space-y-3 font-sans">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar robo o artículo (ej: 132.110, rehenes)…" className="w-full rounded-xl border border-six/15 bg-black/40 py-2 pl-8 pr-3 text-sm text-slate-100 outline-none focus:border-six" /></label>
        <p className="text-xs text-slate-500">{list.length} {list.length === 1 ? "robo" : "robos"} · tocá uno para ver el detalle</p>
      </div>
      <p className="rounded-xl border border-white/[.07] bg-black/30 px-3 py-2 text-[12px] leading-relaxed text-slate-400"><Scale className="mr-1.5 inline size-3.5 text-six" />Artículos del Código Penal de la terminal interpretados a partir de la normativa de cada robo. <b className="text-slate-300">Tentativa</b>: no lo consiguieron · <b className="text-slate-300">Consumado</b>: lo consiguieron · <b className="text-slate-300">Con disparos</b>: además dispararon a agentes. El homicidio doloso (119.1) va solo si hay CK de un jugador. Lo de <b className="text-slate-300">según lo que pase</b> se suma solo si ocurre.</p>
      {KEYS.filter(k => list.some(x => x.cat === k)).map(k => (
        <section key={k} className="space-y-2">
          <h3 className="flex items-center gap-2 pt-1"><span className="size-2.5 rounded-full" style={{ background: CATS[k].c }} /><b className="text-white">{CATS[k].l}</b>{CATS[k].code && <span className="rounded border border-white/15 px-1 font-mono text-[10px] text-slate-400">Cód. {CATS[k].code}</span>}<span className="text-xs text-slate-500">{list.filter(x => x.cat === k).length}</span></h3>
          <div className="grid gap-2 xl:grid-cols-2">{list.filter(x => x.cat === k).map(it => { const L = leyOf(it); return (
            <button key={it.id} onClick={() => setSel(it)} className="group relative overflow-hidden rounded-2xl border border-white/[.07] bg-gradient-to-b from-[#0e131a] to-[#07090d] p-3.5 text-left transition hover:border-white/20">
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: CATS[k].c }} />
              <div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-white">{it.n}</p>
                {L.cond.length > 0 && <span className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">+{L.cond.length} según lo que pase</span>}</div>
              <div className="mt-2 space-y-1.5">{COLS.map(([ck, cl, cc]) => (
                <div key={ck} className="flex items-start gap-2"><span className="w-[5.5rem] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: cc }}>{cl}</span>
                  <div className="flex min-w-0 flex-wrap items-center gap-1">{ck === "hom" && <span className="text-[11px] text-slate-500">Consumado +</span>}{(ck === "hom" ? L.hom.filter(r => !L.cons.some(c => c.a === r.a)) : L[ck]).map(r => <Chip key={r.a} r={r} c={cc} />)}</div></div>))}</div>
              {L.nota && <p className="mt-2 text-[11px] italic text-amber-300/80">{L.nota}</p>}
            </button>); })}</div>
        </section>))}
      {!list.length && <p className="py-10 text-center text-sm text-slate-500">Nada coincide con la búsqueda.</p>}
      {sel && <LeyModal it={sel} onClose={() => setSel(null)} />}
    </div>);
}

function ArtRow({ r, c }: { r: Ref; c: string }) {
  const x = art(r.a); if (!x) return null;
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: c + "40", background: c + "0d" }}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><b className="font-mono text-sm" style={{ color: c }}>Art. {x.a}</b><b className="text-sm text-white">{x.t}</b><span className="ml-auto text-xs font-semibold text-slate-400">{pena(x)}</span></div>
      {r.why && <p className="mt-1 text-[12px] font-semibold text-slate-300">→ {r.why}</p>}
      {x.d && <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{x.d}</p>}
    </div>);
}
function LeyModal({ it, onClose }: { it: Item; onClose: () => void }) {
  const L = leyOf(it), C = CATS[it.cat], [tab, setTab] = useState<"tent" | "cons" | "hom">("cons");
  const tot = (rs: Ref[]) => rs.reduce((t, r) => { const x = art(r.a); return { m: t.m + (x?.m || 0), p: t.p + (x?.p || 0) }; }, { m: 0, p: 0 });
  const T = tot(L[tab]), cc = COLS.find(c => c[0] === tab)!;
  return (
    <Modal open onClose={onClose} size="lg" icon={<Gavel />} title={it.n} desc={<span><span style={{ color: C.c }}>{C.l}</span>{C.code ? ` · código ${C.code}` : ""}{it.max ? ` · hasta ${it.max} atracadores` : ""}{it.reh && it.reh !== "No" ? ` · rehenes: ${it.reh}` : ""}</span>}>
      <div className="grid grid-cols-3 gap-1.5 font-sans">{COLS.map(([k, l, c, d]) => (
        <button key={k} onClick={() => setTab(k)} className={cn("rounded-xl border p-2.5 text-left transition", tab === k ? "text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40")}
          style={tab === k ? { borderColor: c, background: c + "22" } : undefined}><p className="text-sm font-bold" style={tab === k ? { color: c } : undefined}>{l}</p><p className="text-[11px] leading-snug opacity-80">{d}</p></button>))}</div>
      <div className="space-y-2 font-sans">{L[tab].map(r => <ArtRow key={r.a} r={r} c={cc[2]} />)}
        <p className="text-right text-xs text-slate-500">Suma orientativa: <b className="text-slate-300">${T.m.toLocaleString("es-AR")}</b> · <b className="text-slate-300">{T.p} meses</b>{tab === "tent" && " (en tentativa se aplica la rebaja que corresponda)"}</p></div>
      {L.cond.length > 0 && <div className="space-y-2 font-sans"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Según lo que pase · se suma solo si ocurre</p>
        {L.cond.map(c => <div key={c.k} className="space-y-1.5 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="flex items-center gap-2 text-sm font-semibold"><Layers className="size-4 text-six" />{c.l}<span className="font-normal text-slate-500">· {c.when}</span></p>
          {c.arts.map(r => <ArtRow key={r.a} r={r} c="#38bdf8" />)}</div>)}</div>}
      {L.nota && <p className="font-sans text-xs italic text-amber-500">{L.nota}</p>}
    </Modal>);
}

/* ---------- exportar ---------- */
function Exportar({ all }: { all: Item[] }) {
  const { toast } = useFeedback();
  const [cats, setCats] = useState<Cat[]>(KEYS), [obs, setObs] = useState(true), [desc, setDesc] = useState(true), [busy, setBusy] = useState(false);
  const pick = all.filter(x => cats.includes(x.cat));
  const tog = (k: Cat) => setCats(cats.includes(k) ? cats.filter(c => c !== k) : KEYS.filter(c => c === k || cats.includes(c)));
  const run = async () => {
    setBusy(true);
    try { const { robosXlsx } = await import("./robosExcel"); await robosXlsx(pick, { obs, desc }); toast("Excel descargado"); }
    catch { toast("No se pudo generar el Excel", "err"); } finally { setBusy(false); }
  };
  const Opt = ({ on, set, t, d }: { on: boolean; set: (v: boolean) => void; t: string; d: string }) => (
    <button onClick={() => set(!on)} className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition", on ? "border-six/50 bg-six/10" : "border-white/[.07] bg-black/30 hover:border-white/15")}>
      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-six bg-six text-black" : "border-white/20")}>{on && <Check className="size-3.5" />}</span>
      <span><b className="block text-sm text-white">{t}</b><span className="text-xs text-slate-500">{d}</span></span></button>);
  return (
    <div className="grid gap-4 font-sans lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">1 · Qué robos exportar</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{KEYS.map(k => { const on = cats.includes(k), n = all.filter(x => x.cat === k).length; return (
            <button key={k} onClick={() => tog(k)} className={cn("relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 text-left transition", on ? "text-white" : "border-white/[.07] bg-black/30 text-slate-500")}
              style={on ? { borderColor: CATS[k].c + "99", background: CATS[k].c + "1a" } : undefined}>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-transparent text-black" : "border-white/20")} style={on ? { background: CATS[k].c } : undefined}>{on && <Check className="size-3.5" />}</span>
              <span className="min-w-0 flex-1"><b className="block text-sm">{CATS[k].l}</b><span className="text-[11px] text-slate-500">{CATS[k].code ? `Código ${CATS[k].code} · ` : ""}{CATS[k].d}</span></span>
              <span className="text-lg font-black tabular-nums" style={{ color: on ? CATS[k].c : undefined }}>{n}</span></button>); })}</div>
          <div className="mt-2 flex gap-3 text-xs"><button onClick={() => setCats(KEYS)} className="text-six hover:underline">Todos</button><button onClick={() => setCats(KEYS.filter(k => k !== "mis"))} className="text-slate-400 hover:underline">Solo robos (sin misiones)</button><button onClick={() => setCats([])} className="text-slate-500 hover:underline">Ninguno</button></div></div>
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">2 · Opciones</p>
          <div className="grid gap-2 sm:grid-cols-2"><Opt on={obs} set={setObs} t="Observaciones" d="Cambios respecto de la normativa vieja, robos nuevos y pendientes de la planilla." />
            <Opt on={desc} set={setDesc} t="Texto de cada artículo" d="Agrega una hoja con la descripción completa y la pena de cada artículo usado." /></div></div>
      </div>
      <div className="six-panel h-fit space-y-3 rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-white"><FileSpreadsheet className="size-5 text-emerald-400" />Robos · Eleven Project.xlsx</p>
        <ul className="space-y-2 text-[12.5px] text-slate-400">
          <li><b className="text-slate-200">Hoja «Robos»</b>: {pick.length} robos explicados, agrupados por tipo (atracadores, policías y unidades, rehenes, bloqueo, vehículo, armas, recompensa, misiones{obs ? ", observaciones" : ""}).</li>
          <li><b className="text-slate-200">Hoja «Articulado»</b>: cada robo con sus artículos en tentativa, consumado y con disparos, y lo que se suma según lo que pase.</li>
          {desc && <li><b className="text-slate-200">Hoja «Artículos»</b>: el texto y la pena de cada artículo, y en qué robos se usa.</li>}
        </ul>
        <button disabled={busy || !pick.length} onClick={run} className="six-btn inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold tracking-[0.12em] text-emerald-300 disabled:opacity-40">
          <Download className="size-4" />{busy ? "GENERANDO…" : "DESCARGAR EXCEL"}</button>
      </div>
    </div>);
}
