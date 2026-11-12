import { profOk } from "@/lib/nick";
import { useEffect, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { Users, LayoutGrid, Rows3, UserPlus, BadgeCheck, Trophy, Shield, Clock, TrendingUp, IdCard, Activity,
  Pencil, Star, Plus, X, Camera, Move, Trash2, Award, Check, UserMinus, ImagePlus } from "lucide-react";
import { Button, Card, Empty, Field, Input, Select, Segmented, Textarea, SearchInput } from "@/components/ui";
import { RankBadge } from "@/components/agents";
import { Ribbon, RibbonRack } from "@/components/ribbon";
import { createPortal } from "react-dom";
import { DECOR, decorOf, type Award as AwardT, type Decor } from "@/lib/decor";
import { Modal } from "@/components/modal";
import { ImagePicker } from "@/components/imagepick";
import { useFeedback } from "@/components/feedback";
import { dmy, ALL_DIVS, DIVS, GROUPS, LEVEL, divAb, divEmblem, emailOf, findAgent, fotoOf, genderOf, getRoster, imgOpt, initials, insigniaUrl, lvl, norm, rankES, srcOf, uid, type Agent } from "@/lib/domain";
import { ACC_LAST, LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { allProfiles, profFull, updateAgent, updateProf, type Profile } from "@/lib/profiles";
import { missOf, vName, vehOf, type PHist } from "@/lib/patrol";
import { cn } from "@/lib/cn";
import { StatusPill, Thumbs } from "./Patrullas";
import { EstadoBadge, TipoBadge, tally, type Prop } from "./Votaciones";
import { goTo } from "@/lib/profiles";

const SUBDIVS = new Set(DIVS.flatMap(d => d[1] || []));
const LICS = ["Licencia de coche", "Licencia de moto", "Licencia de camión", "Licencia de barco", "Licencia de aviación", "Licencia de caza", "Licencia de pesca", "Licencia de armas"];
const ESTADOS = ["Activo", "Vacaciones", "Desaparecido", "Suspendido"];
const RANKS = Object.keys(LEVEL).filter(r => LEVEL[r] > 0);
type Ph = { x: number; y: number; z: number };
const phOf = (p: Profile): Ph => p.ph || { x: 50, y: 22, z: 1 };
const phStyle = (f: Ph) => ({ objectPosition: `${f.x}% ${f.y}%`, transform: `scale(${f.z})`, transformOrigin: `${f.x}% ${f.y}%` });
const logoSrc = () => srcOf(LS.get("lspdt.logo") || "") || "/next/logo.svg";
export function mainDiv(p: Profile) {
  if (p.main && p.div.includes(p.main)) return p.main;
  const order = DIVS.map(d => d[0]);
  return p.div.filter(d => !SUBDIVS.has(d)).sort((x, y) => order.indexOf(x) - order.indexOf(y))[0] || p.div[0] || "";
}
const pdate = (s?: string) => { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return y ? new Date(y, m - 1, d) : null; };
const dstr = (d: Date | null) => (d ? d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
function antig(s?: string) {
  const d = pdate(s); if (!d) return "—"; const now = new Date(); let m = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth(); if (now.getDate() < d.getDate()) m--;
  if (m < 1) { const dd = Math.max(0, Math.floor((+now - +d) / 864e5)); return dd + (dd === 1 ? " día" : " días"); }
  const y = Math.floor(m / 12), r = m % 12; return [y ? y + (y === 1 ? " año" : " años") : "", r ? r + (r === 1 ? " mes" : " meses") : ""].filter(Boolean).join(" y ");
}
function rel(t: number) {
  if (!t) return "—"; const s = (Date.now() - t) / 1000; if (s < 90) return "ahora mismo"; const m = s / 60; if (m < 60) return `hace ${Math.round(m)} min`;
  const h = m / 60; if (h < 24) return `hace ${Math.round(h)} h`; const d = h / 24; if (d < 30) return `hace ${Math.round(d)} ${Math.round(d) === 1 ? "día" : "días"}`; return dstr(new Date(t));
}
const Sil = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={cn("size-full text-slate-300 dark:text-slate-700", className)}><circle cx="60" cy="44" r="22" fill="currentColor" /><path d="M14 122c4-30 22-46 46-46s42 16 46 46z" fill="currentColor" /></svg>
);
function Stripes({ n }: { n: number }) {
  if (!n) return null; n = Math.min(6, n); const w = 16 / n;
  return <svg viewBox="0 0 24 24" className="size-full">{Array.from({ length: n }, (_, i) => { const x = 4 + i * w + w / 2; return <path key={i} d={`M${(x - 2.6).toFixed(1)} 18 L${(x + 2.6).toFixed(1)} 6`} stroke="#dfe5ee" strokeWidth="2" strokeLinecap="round" />; })}</svg>;
}
function Img({ src, w, className, style }: { src: string; w: number; className?: string; style?: React.CSSProperties }) {
  const [bad, setBad] = useState(""), opt = imgOpt(src, w), s = bad === src ? src : opt;
  return <img src={s} alt="" draggable={false} decoding="async" loading="lazy" className={className} style={style} onError={() => s !== src && setBad(src)} />;
}
function PhotoBox({ a, p, ph, className, onClear }: { a: Agent; p: Profile; ph?: Ph; className?: string; onClear?: () => void }) {
  const f = fotoOf(a.n), ins = insigniaUrl(a.r);
  return (
    <div className={cn("relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900", className)}>
      {f ? <Img src={f} w={640} className="size-full object-cover" style={phStyle(ph || phOf(p))} /> : <Sil className="absolute inset-x-0 bottom-0 h-[85%]" />}
      <img loading="lazy" decoding="async" src={logoSrc()} alt="" className="absolute left-2 top-2 h-7 w-auto max-w-[40%] object-contain drop-shadow" />
      <div className="absolute right-2 top-2 flex gap-1">
        {!!p.fr && <span title={`${p.fr} ${p.fr === 1 ? "franja" : "franjas"} de servicio`} className="grid size-7 place-items-center rounded-lg bg-slate-950/70 p-0.5 backdrop-blur"><Stripes n={p.fr} /></span>}
        {ins && <span title={rankES(a.r)} className="grid h-7 min-w-7 place-items-center rounded-lg bg-slate-950/70 px-1 backdrop-blur"><img loading="lazy" decoding="async" src={ins} alt="" className="max-h-5 w-auto" /></span>}
      </div>
      {a.e && a.e !== "Activo" && <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-amber-500/90 py-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-amber-950">{a.e}
        {onClear && <span role="button" tabIndex={0} title={`Quitar «${a.e}» (vuelve a Activo)`} aria-label={`Quitar etiqueta ${a.e}`}
          onClick={e => { e.stopPropagation(); onClear(); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onClear(); } }}
          className="absolute right-1 grid size-5 place-items-center rounded bg-amber-950/20 text-amber-950 transition hover:bg-amber-950/40"><X className="size-3" /></span>}</span>}
    </div>
  );
}
function MiniPhoto({ a, p, size }: { a: Agent; p: Profile; size: number }) {
  const f = fotoOf(a.n);
  return <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 ring-1 ring-black/5 dark:bg-slate-800 dark:text-slate-300 dark:ring-white/10">
    {f ? <Img src={f} w={size > 64 ? 256 : 64} className="size-full object-cover" style={phStyle(phOf(p))} /> : initials(a.n)}</span>;
}

export function Agentes() {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback();
  const R = getRoster(), P = allProfiles(), nVac = R.filter(x => x.e === "Vacaciones").length;
  const [q, setQ] = useState(""), [g, setG] = useState(""), [d, setD] = useState("");
  const [view, setView] = useState<"grid" | "list">(() => (LS.get("lspdt.agView") === "list" ? "list" : "grid"));
  const [cur, setCur] = useState<string | null>(null), [reg, setReg] = useState<string | null | false>(false);
  const s = norm(q.trim());
  const list = R.filter(a => { if (g && !GROUPS[g].r.includes(a.r)) return false; if (d) { const dv = profFull(a.n, P).div; if (d === "-" ? dv.length : !dv.includes(d)) return false; }
    return !s || norm(a.n).includes(s) || String(a.p).includes(s) || norm(a.s || "").includes(s); }).sort((x, y) => lvl(y.r) - lvl(x.r) || x.n.localeCompare(y.n, "es"));
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <SearchInput className="min-w-[14rem] flex-1" value={q} onChange={setQ} placeholder="Buscar por nombre, placa o State ID…" />
        <Select className="w-auto text-sm" value={g} onChange={e => setG(e.target.value)}><option value="">LSPD · Todos</option>{Object.entries(GROUPS).filter(([, x]) => R.some(a => x.r.includes(a.r))).map(([k, x]) => <option key={k} value={k}>{x.l}</option>)}</Select>
        <Select className="w-auto max-w-[16rem] text-sm" value={d} onChange={e => setD(e.target.value)}><option value="">Todas las divisiones</option><option value="-">Sin división</option>{ALL_DIVS.map(x => <option key={x} value={x}>{SUBDIVS.has(x) ? "— " : ""}{x}</option>)}</Select>
        <Segmented size="sm" value={view} onChange={v => { setView(v); LS.set("lspdt.agView", v); }} options={[{ value: "grid", label: <LayoutGrid className="size-4" aria-label="Tarjetas" /> }, { value: "list", label: <Rows3 className="size-4" aria-label="Lista" /> }]} />
        {nVac > 0 && <Button variant="outline" icon={<X />} title="Pasa a Activo a todos los agentes de vacaciones" onClick={async () => {
          if (!(await confirm(`¿Quitar la etiqueta «Vacaciones» a ${nVac} ${nVac === 1 ? "agente" : "agentes"}? Pasan a Activo.`))) return;
          const RR = getRoster().map(x => (x.e === "Vacaciones" ? { ...x, e: "Activo" } : x)); LS.setJSON("lspdt.roster", RR); toast("Etiquetas de vacaciones quitadas"); }}>Quitar vacaciones ({nVac})</Button>}
        <Button icon={<UserPlus />} onClick={() => setReg(null)}>Registrar agente</Button>
      </Card>
      <p className="text-xs text-slate-400">Planilla del departamento · {list.length} de {R.length} agentes</p>
      {!list.length ? <Card><Empty icon={<Users />} title="Sin agentes para ese filtro" /></Card>
        : view === "grid" ? Object.entries(GROUPS).map(([k, gr]) => { const l = list.filter(a => gr.r.includes(a.r)); return l.length ? (
          <section key={k}>
            <h3 className="mb-3 mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{gr.l}<span className="rounded-md bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800">{l.length}</span></h3>
            <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {l.map(a => { const p = profFull(a.n, P), md = mainDiv(p); return (
                <button key={a.n} onClick={() => setCur(a.n)} title={p.div.join(" · ") || "Sin división"}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-800 dark:bg-slate-900/60">
                  <PhotoBox a={a} p={p} className="transition group-hover:brightness-105" onClear={() => { updateAgent(a.n, x => { x.e = "Activo"; }); toast(`${a.n}: vuelve a Activo`); }} />
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{a.n}</p>
                    <p className="truncate font-mono text-[11px] text-slate-400">{a.s || "—"}{p.cs && ` · ${p.cs}`}</p>
                    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11.5px] text-slate-500 dark:border-slate-800">
                      <p className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 shrink-0" />Placa {a.p ? "#" + a.p : "—"}</p>
                      <p className="flex items-center gap-1.5"><Trophy className="size-3.5 shrink-0" />{rankES(a.r)}</p>
                      <p className="flex items-center gap-1.5 truncate"><Shield className="size-3.5 shrink-0" /><span className="truncate">{md || "Sin división"}</span></p>
                    </div>
                    {(() => { const cd = ((p.cond || []) as unknown as AwardT[]).map(x => decorOf(x.k)).filter(Boolean) as NonNullable<ReturnType<typeof decorOf>>[]; return cd.length ? (
                      <div className="mt-2 flex justify-center border-t border-slate-100 pt-2 dark:border-slate-800"><RibbonRack list={cd.slice(0, 12)} per={4} size="xs" /></div>) : null; })()}
                  </div>
                </button>); })}
            </div>
          </section>) : null; })
        : <Card className="overflow-hidden"><div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[56rem] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">{["Agente", "State ID", "Placa", "Rango", "Callsign", "División", "Estado", "Ingreso"].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{list.map(a => { const p = profFull(a.n, P); return (
              <tr key={a.n} onClick={() => setCur(a.n)} className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/40">
                <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><MiniPhoto a={a} p={p} size={30} /><span className="font-semibold">{a.n}</span></div></td>
                <td className="px-4 font-mono text-xs">{a.s || "—"}</td><td className="px-4 font-mono text-xs">{a.p ? "#" + a.p : "—"}</td><td className="px-4"><RankBadge r={a.r} /></td>
                <td className="px-4 font-mono text-xs">{p.cs || "—"}</td><td className="max-w-[14rem] truncate px-4 text-xs">{mainDiv(p) || "—"}</td>
                <td className="px-4">{a.e === "Activo" ? <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Activo</span> : <span className="text-xs text-slate-500">{a.e || "—"}</span>}</td>
                <td className="px-4 font-mono text-xs">{dstr(pdate(a.c))}</td>
              </tr>); })}</tbody></table></div></Card>}
      {cur && findAgent(cur) && <ProfileModal n={cur} onClose={() => setCur(null)} onEdit={() => setReg(cur)} />}
      {reg !== false && <RegModal n={reg} myL={me.l} onClose={() => setReg(false)} onCreated={n => setCur(n)} />}
    </div>
  );
}

type Tab = "res" | "his" | "not" | "pat" | "con";
/* expediente del agente: ficha oscura a la izquierda (foto, identificación y pasador) y legajo a la derecha */
function ProfileModal({ n, onClose, onEdit }: { n: string; onClose: () => void; onEdit: () => void }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback();
  const a = findAgent(n)!, p = profFull(n), md = mainDiv(p), foto = fotoOf(n), ins = insigniaUrl(a.r);
  const cover = LS.get("lspdt.cover." + n) || LS.get("lspdt.img.cover") || "";
  const PH = LS.json<PHist[]>("lspdt.patHist", []), VOTES = LS.json<Prop[]>("lspdt.votes", []);
  const [tab, setTab] = useState<Tab>("res"), [editDiv, setEditDiv] = useState(false), [divSel, setDivSel] = useState<string[]>([]);
  const [ph, setPh] = useState<Ph | null>(null), [cv, setCv] = useState<{ x: number; y: number } | null>(null);
  const [pick, setPick] = useState<"" | "foto" | "cover" | "divlogo">(""), [logoFor, setLogoFor] = useState(""), [nota, setNota] = useState("");
  const coverRef = useRef<HTMLDivElement>(null), phRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !pick && onClose(); document.addEventListener("keydown", k);
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose, pick]);
  const done = (fn: (p: Profile) => void, msg?: string) => { updateProf(n, fn); if (msg) toast(msg); };
  const divs = p.div.slice().sort((x, y) => ALL_DIVS.indexOf(x) - ALL_DIVS.indexOf(y));
  const tl = useMemo(() => {
    const t: { d: Date | null; c: string; b: string; s: string }[] = [], same = (x: Date | null, y: Date | null) => !!x && !!y && x.toDateString() === y.toDateString();
    if (a.c) t.push({ d: pdate(a.c), c: "ing", b: "Ingreso al LSPD", s: "Fecha de contrato registrada en el roster" });
    if (a.a && a.a !== a.c && !p.movs.some(m => m.tipo === "asc" && same(new Date(m.t), pdate(a.a)))) t.push({ d: pdate(a.a), c: "", b: `Último ascenso registrado · ${rankES(a.r)}`, s: "Según el roster" });
    p.movs.forEach(m => t.push({ d: new Date(m.t), c: m.tipo === "desc" ? "desc" : "", b: `${m.tipo === "asc" ? "Ascenso" : "Descenso"}: ${rankES(m.de)} → ${rankES(m.a)}`, s: `${m.via || ""} · registrado por ${rankES(m.por.r)} ${m.por.n}` }));
    return t.sort((x, y) => +(y.d || 0) - +(x.d || 0));
  }, [a, p.movs]);
  const pats = PH.filter(h => h.rows.some(r => r.n === n)).map(h => ({ h, r: h.rows.find(r => r.n === n)! }));
  const votes = VOTES.filter(v => v.ag.n === n).sort((x, y) => y.t - x.t), cond = (p.cond || []) as unknown as AwardT[], lic = (p.lic || {}) as Record<string, boolean>;
  const rack = cond.map(c => decorOf(c.k)).filter(Boolean) as Decor[];
  const notas = p.notas as unknown as { id: string; a: string; r: string; m: string; t: number }[];
  const last = Math.max(0, ...p.movs.map(m => m.t), ...notas.map(x => x.t), ...pats.map(x => x.h.t), ...votes.map(v => v.t), ACC_LAST[n] || 0);
  const tabs: [Tab, string, number | undefined][] = [["res", "Legajo", undefined], ["con", "Condecoraciones", cond.length], ["his", "Carrera", tl.length + votes.length], ["not", "Notas", notas.length], ["pat", "Patrullas", pats.length]];
  const cl = (v: number) => Math.max(0, Math.min(100, v)), cvp = cv || (p.cv as { x: number; y: number }) || { x: 50, y: 50 };
  const drag = (el: HTMLElement | null, e: PE, start: { x: number; y: number }, apply: (x: number, y: number) => void, fx = 1, fy = 1) => {
    if (!el) return; e.preventDefault(); el.setPointerCapture(e.pointerId); const r = el.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    el.onpointermove = m => apply(cl(start.x - ((m.clientX - x0) / r.width) * 100 * fx), cl(start.y - ((m.clientY - y0) / r.height) * 100 * fy));
    el.onpointerup = () => { el.onpointermove = null; };
  };
  const H = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
    <div className="mb-3 flex items-center gap-3"><h4 className="font-mono text-[10.5px] font-bold uppercase tracking-[.22em] text-slate-400">{children}</h4><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />{right}</div>);
  const F = ({ k, children, wide }: { k: string; children: React.ReactNode; wide?: boolean }) => (
    <div className={cn("min-w-0 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900", wide && "sm:col-span-2")}><dt className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt><dd className="mt-0.5 truncate text-sm font-semibold">{children}</dd></div>);
  const act = "inline-flex items-center gap-1.5 rounded-lg bg-white/[.06] px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/[.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 [&_svg]:size-3.5";
  const plate = (k: string, v: string) => <div className="min-w-0 rounded-lg bg-white/[.04] px-2 py-1.5 text-center ring-1 ring-white/10"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">{k}</p><p className="truncate font-mono text-[13px] font-bold text-white">{v}</p></div>;
  return createPortal(
    <div className="fx-modal-bg fixed inset-0 z-[65] grid place-items-center bg-slate-950/75 backdrop-blur-md animate-fade-in sm:p-5" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`Expediente de ${a.n}`} className="fx-modal scrollbar-thin relative flex h-[100dvh] w-full max-w-6xl flex-col bg-white shadow-2xl ring-1 ring-black/5 sm:h-[min(52rem,calc(100dvh-2.5rem))] overflow-y-auto sm:rounded-3xl lg:flex-row lg:overflow-hidden dark:bg-slate-950 dark:ring-white/10">
        <button aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:bg-slate-100 lg:text-slate-500 lg:hover:bg-slate-200 lg:hover:text-slate-800 dark:lg:bg-slate-800 dark:lg:text-slate-300"><X className="size-4" /></button>

        {/* ficha */}
        <aside className="scrollbar-thin relative shrink-0 bg-[#08101d] lg:overflow-y-auto text-white lg:w-[21rem]">
          <div ref={coverRef} className={cn("relative h-36 overflow-hidden", cv && "cursor-grab touch-none active:cursor-grabbing")}
            onPointerDown={e => { if (!cv || (e.target as HTMLElement).closest("button")) return; drag(coverRef.current, e, { ...cv }, (x, y) => setCv({ x, y }), 1, 0.6); }}>
            {cover ? <Img src={cover} w={720} className="size-full object-cover" style={{ objectPosition: `${cvp.x}% ${cvp.y}%` }} /> : <div className="size-full bg-[radial-gradient(circle_at_30%_20%,#1d3a66,transparent_60%),linear-gradient(135deg,#0f1f38,#08101d)]" />}
            {!cv && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#08101d]/30 to-[#08101d]" />}
            <div className="absolute left-3 top-3 flex gap-1">
              {cv ? <><button className={act} onClick={() => { done(x => { x.cv = cv; }, "Portada guardada"); setCv(null); }}><Check />Guardar</button><button className={act} onClick={() => setCv(null)}>Cancelar</button></>
                : <><button className={act} title={cover ? "Cambiar portada" : "Subir portada"} onClick={() => setPick("cover")}><ImagePlus />Portada</button>
                  {LS.get("lspdt.cover." + n) && <><button className={act} aria-label="Ajustar portada" title="Ajustar portada" onClick={() => setCv({ ...cvp })}><Move /></button>
                    <button className={act} aria-label="Quitar portada" title="Quitar portada" onClick={() => { LS.del("lspdt.cover." + n); done(x => { x.cv = null; }, "Portada quitada"); }}><Trash2 /></button></>}</>}
            </div>
            {cv && <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-[11px]">Arrastrá para acomodarla</p>}
          </div>
          <div className="relative -mt-20 flex flex-col items-center px-5 pb-6 text-center">
            <button onClick={() => setPick("foto")} title="Cambiar foto" className="group relative aspect-[4/5] w-40 overflow-hidden rounded-2xl bg-slate-800 shadow-[0_18px_40px_-12px_rgba(0,0,0,.8)] ring-4 ring-[#08101d] focus-visible:outline-none focus-visible:ring-amber-300">
              {foto ? <Img src={foto} w={400} className="size-full object-cover" style={phStyle(phOf(p))} /> : <Sil className="absolute inset-x-0 bottom-0 h-[85%] !text-slate-700" />}
              <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition group-hover:opacity-100"><Camera className="size-6" /></span>
              {a.e && a.e !== "Activo" && <span className="absolute inset-x-0 bottom-0 bg-amber-500/95 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">{a.e}</span>}
            </button>
            <div title={md || "LSPD"} className="absolute left-[calc(50%-6.4rem)] top-[8.6rem] size-12 overflow-hidden rounded-full bg-[#08101d] p-1 ring-2 ring-white/15"><DivLogo d={md} /></div>
            {ins && <div title={rankES(a.r)} className="absolute right-[calc(50%-6.4rem)] top-[8.6rem] grid h-12 min-w-12 place-items-center rounded-xl bg-[#08101d] px-1.5 ring-2 ring-white/15"><img src={ins} alt="" className="max-h-8 w-auto" /></div>}
            <h2 className="mt-4 text-[1.4rem] font-bold leading-tight tracking-tight">{a.n}</h2>
            <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-amber-300">{rankES(a.r)}</p>
            <p className="mt-1 text-xs text-slate-400">{md || "Sin división"}</p>
            <div className="mt-4 grid w-full grid-cols-3 gap-1.5">{plate("Placa", a.p ? "#" + a.p : "—")}{plate("State ID", a.s || "—")}{plate("Callsign", p.cs || "—")}</div>
            <div className="mt-5 w-full rounded-2xl bg-[radial-gradient(circle_at_50%_0%,#1b2a44,#0b1424)] px-3 py-4 ring-1 ring-white/10">
              <p className="mb-3 font-mono text-[9.5px] font-bold uppercase tracking-[.24em] text-slate-500">Pasador · {rack.length}</p>
              {rack.length ? <RibbonRack list={rack} per={3} size="md" /> : <p className="text-xs text-slate-500">Sin condecoraciones</p>}
              {!!p.fr && <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-400"><span className="h-4 w-4"><Stripes n={p.fr} /></span>{p.fr} {p.fr === 1 ? "franja" : "franjas"} de servicio</p>}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {foto && <button className={act} onClick={() => { setPh({ ...phOf(p) }); setTab("res"); }}><Move />Encuadre</button>}
              <button className={act} onClick={onEdit}><Pencil />Editar datos</button>
              {profOk() && profOk(a.n) && <button className={act} onClick={() => goTo("me", "perfil", { n: a.n })}><IdCard />Perfil social</button>}
              {a.e && a.e !== "Activo" && <button className={act} onClick={() => { updateAgent(a.n, x => { x.e = "Activo"; }); toast(`${a.n}: vuelve a Activo`); }}><Check />Pasar a Activo</button>}
              {me.l >= 8 && <button className={cn(act, "text-red-300 hover:bg-red-500/20")} onClick={async () => {
                if (!(await confirm(`¿Dar de baja a ${a.n}? Se quita del roster (su perfil y notas se conservan).`, { danger: true, ok: "Dar de baja" }))) return;
                LS.setJSON("lspdt.roster", getRoster().filter(x => x.n !== n)); onClose(); toast("Agente dado de baja"); }}><UserMinus />Dar de baja</button>}
            </div>
          </div>
        </aside>

        {/* legajo */}
        <section className="flex min-w-0 flex-1 flex-col lg:min-h-0">
          <header className="border-b border-slate-100 px-5 pb-3 pt-5 dark:border-slate-800/80 sm:px-7">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.26em] text-slate-400">Expediente personal · Los Santos Police Department</p>
            <nav className="scrollbar-thin mt-3 flex gap-1 overflow-x-auto pr-10" role="tablist">
              {tabs.map(([k, l, c]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  tab === k ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100")}>
                  {l}{!!c && <span className={cn("rounded-full px-1.5 text-[10.5px] tabular-nums", tab === k ? "bg-white/20 dark:bg-slate-900/15" : "bg-slate-100 dark:bg-slate-800")}>{c}</span>}</button>))}
            </nav>
          </header>
          <div className="scrollbar-thin px-5 py-6 sm:px-7 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {tab === "res" && <div className="space-y-7">
              {ph && <div className="flex flex-wrap items-start gap-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
                <div className="w-36"><div ref={phRef} className="cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing" onWheel={e => setPh({ ...ph, z: Math.max(1, Math.min(3, +(ph.z - e.deltaY * 0.0015).toFixed(2))) })}
                  onPointerDown={e => { const s = { ...ph }; drag(phRef.current, e, s, (x, y) => setPh(v => ({ ...v!, x, y })), 1.6 / s.z, 1.6 / s.z); }}><PhotoBox a={a} p={p} ph={ph} /></div><p className="mt-1.5 text-center text-[11px] text-slate-500">Tarjeta · arrastrá</p></div>
                <div><div className="size-24 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-800"><img src={foto} alt="" className="size-full object-cover" style={phStyle(ph)} /></div><p className="mt-1.5 text-center text-[11px] text-slate-500">Avatar</p></div>
                <div className="min-w-[12rem] flex-1 space-y-3">
                  <label className="flex items-center gap-3 text-xs font-semibold text-slate-500">Zoom<input type="range" min={1} max={3} step={0.02} value={ph.z} onChange={e => setPh({ ...ph, z: +e.target.value })} className="flex-1 accent-brand-600" /></label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<Check />} onClick={() => { done(x => { x.ph = ph; }, "Encuadre guardado"); setPh(null); }}>Guardar encuadre</Button>
                    <Button size="sm" variant="outline" onClick={() => setPh({ x: 50, y: 22, z: 1 })}>Centrar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPh(null)}>Cancelar</Button>
                    <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (!(await confirm("¿Quitar la foto?", { danger: true }))) return; LS.del("lspdt.foto." + n); done(x => { x.foto = ""; x.ph = null; }, "Foto quitada"); setPh(null); }}>Quitar foto</Button>
                  </div></div></div>}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 md:grid-cols-4 dark:bg-slate-800 dark:ring-slate-800">
                {([["Antigüedad", antig(a.c), Clock], ["En el rango", antig(a.a || a.c), TrendingUp], ["Última actividad", rel(last), Activity], ["Condecoraciones", String(cond.length), Award]] as const).map(([k, v, I]) => (
                  <div key={k} className="bg-white px-4 py-3.5 dark:bg-slate-950"><p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400"><I className="size-3.5" />{k}</p><p className="mt-1 truncate text-lg font-bold tracking-tight">{v}</p></div>))}
              </div>
              <div><H>Ficha</H>
                <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <F k="Rango">{rankES(a.r)}</F><F k="Estado">{a.e || "—"}</F><F k="Fecha de ingreso">{dstr(pdate(a.c))}</F>
                  <F k="Último ascenso">{dstr(pdate(a.a))}</F><F k="Discord">{a.d || "—"}</F><F k="Correo">{emailOf(a.n)}</F>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900"><dt className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Callsign</dt>
                    <Input key={p.cs} defaultValue={p.cs} placeholder="Sin callsign" className="mt-0.5 h-7 border-0 bg-transparent px-0 font-mono text-sm font-semibold uppercase shadow-none focus:ring-0" onBlur={e => { const v = e.target.value.trim().toUpperCase(); if (v !== p.cs) done(x => { x.cs = v; }, "Callsign guardado"); }} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} /></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900"><dt className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Franjas de servicio</dt>
                    <Select value={p.fr || 0} onChange={e => done(x => { x.fr = +e.target.value; }, "Franjas actualizadas")} className="mt-0.5 h-7 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus:ring-0">{[0, 1, 2, 3, 4, 5, 6].map(k => <option key={k} value={k}>{k ? k + (k === 1 ? " franja" : " franjas") : "Sin franjas"}</option>)}</Select></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900"><dt className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Trato</dt>
                    <Segmented size="sm" value={p.g === "f" ? "f" : "m"} onChange={v => done(x => { x.g = v; }, "Trato actualizado")} options={[{ value: "m", label: "Masculino" }, { value: "f", label: "Femenino" }]} /></div>
                </dl>
                {(a as Agent & { o?: string }).o && <p className="mt-2 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/5"><b>Observaciones:</b> {(a as Agent & { o?: string }).o}</p>}
              </div>
              <div><H right={<button className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => { setDivSel(p.div); setEditDiv(!editDiv); }}>{editDiv ? <><X className="size-3.5" />Cerrar</> : <><Pencil className="size-3.5" />Editar</>}</button>}>Divisiones · {divs.length}</H>
                {editDiv ? <>
                  <div className="grid gap-x-4 gap-y-1 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-2 dark:border-slate-800">
                    {DIVS.flatMap(([dd, subs]) => [[dd, false] as const, ...(subs || []).map(x => [x, true] as const)]).map(([dd, sub]) => (
                      <label key={dd} className={cn("flex cursor-pointer items-center gap-2 py-0.5", sub && "pl-5 text-xs text-slate-500")}><input type="checkbox" className="accent-brand-600" checked={divSel.includes(dd)} onChange={e => setDivSel(e.target.checked ? [...divSel, dd] : divSel.filter(x => x !== dd))} />{dd}</label>))}
                  </div>
                  <div className="mt-3 flex justify-end"><Button size="sm" icon={<Check />} onClick={() => { done(x => { x.div = ALL_DIVS.filter(dd => divSel.includes(dd)); if (x.main && !x.div.includes(x.main)) x.main = ""; }, "Divisiones guardadas"); setEditDiv(false); }}>Guardar divisiones</Button></div>
                </> : divs.length ? <div className="grid gap-2 sm:grid-cols-2">
                  {divs.map(dd => (
                    <div key={dd} className={cn("group flex items-center gap-3 rounded-xl border px-3 py-2", dd === md ? "border-amber-300/70 bg-gradient-to-r from-amber-50 to-transparent dark:border-amber-500/30 dark:from-amber-500/10" : "border-slate-200 dark:border-slate-800")}>
                      <div className="size-10 shrink-0"><DivLogo d={dd} /></div>
                      <div className="min-w-0 flex-1"><p className={cn("truncate text-sm font-semibold", SUBDIVS.has(dd) && "text-slate-600 dark:text-slate-300")}>{dd}</p><p className="text-[11px] text-slate-400">{dd === md ? "División principal" : SUBDIVS.has(dd) ? "Subdivisión" : "División"}</p></div>
                      <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        {!SUBDIVS.has(dd) && dd !== md && <button title="Marcar como principal" onClick={() => done(x => { x.main = dd; }, "División principal actualizada")} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"><Star className="size-3.5" /></button>}
                        {me.admin && <button title="Cambiar emblema de la división" onClick={() => { setLogoFor(dd); setPick("divlogo"); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Pencil className="size-3.5" /></button>}
                      </div>
                      {dd === md && <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" aria-label="División principal" />}
                    </div>))}
                </div> : <button onClick={() => { setDivSel(p.div); setEditDiv(true); }} className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 py-5 text-xs font-semibold text-slate-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700"><Plus className="size-4" />Sin divisiones · agregar</button>}
              </div>
              <div><H right={<span className="text-[11px] text-slate-400">Clic para marcar</span>}>Licencias · {LICS.filter(l => lic[l]).length}/{LICS.length}</H>
                <div className="flex flex-wrap gap-1.5">{LICS.map(l => (
                  <button key={l} onClick={() => done(x => { x.lic = { ...(x.lic || {}), [l]: !lic[l] }; })} aria-pressed={!!lic[l]} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    lic[l] ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 dark:border-slate-700 dark:hover:text-slate-200")}>
                    {lic[l] ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}{l.replace("Licencia de ", "")}</button>))}</div>
              </div>
            </div>}
            {tab === "con" && <Awards n={n} cond={cond} rack={rack} done={done} />}
            {tab === "his" && <div className="grid gap-8 lg:grid-cols-2">
              <div><H>Rangos</H>
                {tl.length ? <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5 dark:border-slate-800">{tl.map((x, i) => (
                  <li key={i} className="relative"><span className={cn("absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-white dark:ring-slate-950", x.c === "desc" ? "bg-red-500" : x.c === "ing" ? "bg-brand-500" : "bg-emerald-500")} />
                    <p className="text-sm font-semibold">{x.b}</p><p className="text-xs text-slate-500">{dstr(x.d)}{x.s && ` · ${x.s}`}</p></li>))}</ol>
                  : <p className="text-sm text-slate-400">Sin movimientos registrados.</p>}</div>
              <div><H>Votaciones</H>
                {votes.length ? <div className="space-y-2">{votes.map(v => { const c = tally(v); return (
                  <button key={v.id} onClick={() => { (window as unknown as { __vcur?: string }).__vcur = v.id; onClose(); goTo("sup", "vot"); }} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <TipoBadge t={v.tipo} /><span className="flex-1 text-sm">{rankES(v.ag.r)} → {rankES(v.nr)}</span><span className="font-mono text-xs text-slate-400">{c.favor}/{c.contra}/{c.abst}</span><EstadoBadge e={v.estado} /></button>); })}</div>
                  : <p className="text-sm text-slate-400">Sin propuestas registradas.</p>}</div>
            </div>}
            {tab === "not" && <div className="space-y-4">
              <div className="flex gap-2"><Textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota interna sobre el agente…" />
                <Button className="self-end" icon={<Plus />} onClick={() => { const m = nota.trim(); if (!m) return; done(x => { x.notas = [...x.notas, { id: uid(), a: me.n, r: me.r, m, t: Date.now() }]; }, "Nota agregada"); setNota(""); }}>Agregar</Button></div>
              {notas.length ? notas.slice().reverse().map(x => (
                <div key={x.id} className="rounded-xl border-l-4 border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><b className="text-slate-700 dark:text-slate-200">{x.a}</b> · {rankES(x.r)} · {dstr(new Date(x.t))}
                    {(x.a === me.n || me.l >= 8) && <button className="ml-auto font-semibold text-red-600 hover:underline dark:text-red-400" onClick={async () => { if (await confirm("¿Borrar la nota?", { danger: true })) done(y => { y.notas = (y.notas as unknown as { id: string }[]).filter(z => z.id !== x.id) as unknown as Profile["notas"]; }); }}>Borrar</button>}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{x.m}</p></div>))
                : <p className="py-6 text-center text-sm text-slate-400">Sin notas internas.</p>}
            </div>}
            {tab === "pat" && <div className="space-y-3">
              {pats.length ? pats.map(({ h, r }) => (
                <div key={h.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500"><b className="text-slate-700 dark:text-slate-200">{dmy(h.fecha)}</b> · revisado por {rankES(h.por.r)} {h.por.n}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">{vehOf(r).map(k => { const c = r.v[k] || { s: "" }, vn = vName(k); if (c.s === "na") return null; const ms = missOf(c); return (
                    <div key={k} className="text-sm"><span className="mr-2 text-slate-500">{vn}</span><StatusPill s={c.s} />{ms.length > 0 && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">Falta: {ms.join(", ")}</p>}{c.by && <p className="text-[11px] text-slate-400">Inspeccionó: {c.by}</p>}<Thumbs ids={c.f} cap={`${n} · ${vn} · ${dmy(h.fecha)}`} /></div>); })}</div>
                  {h.nota && <p className="mt-2 text-xs text-slate-500">Notas: {h.nota}</p>}
                </div>)) : <p className="py-6 text-center text-sm text-slate-400">Sin controles de patrulla guardados.</p>}
            </div>}
          </div>
        </section>
      </div>
      <ImagePicker open={pick === "foto"} title={"Foto de " + n} k={"lspdt.foto." + n} max={1280} onClose={() => setPick("")}
        onFile={d => { LS.set("lspdt.foto." + n, d); done(x => { x.foto = ""; x.ph = { x: 50, y: 22, z: 1 }; }, "Foto cargada: ajustá el encuadre y guardá"); setPh({ x: 50, y: 22, z: 1 }); setTab("res"); }}
        onUrl={() => { done(x => { x.foto = ""; x.ph = { x: 50, y: 22, z: 1 }; }, "Foto cargada: ajustá el encuadre y guardá"); setPh({ x: 50, y: 22, z: 1 }); setTab("res"); }}
        onDelete={LS.get("lspdt.foto." + n) ? async () => { if (!(await confirm("¿Quitar la foto de " + n + "?", { danger: true }))) return; LS.del("lspdt.foto." + n); done(x => { x.foto = ""; }, "Foto quitada"); } : undefined} />
      <ImagePicker open={pick === "cover"} title={"Portada de " + n} k={"lspdt.cover." + n} max={1920} onClose={() => setPick("")}
        onFile={d => { LS.set("lspdt.cover." + n, d); done(x => { x.cv = { x: 50, y: 50 }; }, "Portada cargada: arrastrala para acomodarla y guardá"); setCv({ x: 50, y: 50 }); }}
        onUrl={() => { done(x => { x.cv = { x: 50, y: 50 }; }, "Portada cargada: arrastrala para acomodarla y guardá"); setCv({ x: 50, y: 50 }); }} />
      <ImagePicker open={pick === "divlogo"} title={"Emblema · " + logoFor} k={"lspdt.divlogo." + logoFor} max={400} alpha onClose={() => setPick("")}
        onFile={d => { LS.set("lspdt.divlogo." + logoFor, d); toast("Emblema de la división actualizado"); }} onUrl={() => toast("Emblema de la división actualizado")}
        onDelete={LS.get("lspdt.divlogo." + logoFor) ? () => { LS.del("lspdt.divlogo." + logoFor); toast("Emblema restaurado"); } : undefined} />
    </div>, document.body);
}

/* condecoraciones: pasador grande, vitrina de lo otorgado y selector visual por catálogo */
const DTABS: [Decor["tab"] | "otra", string][] = [["med", "Medallas"], ["cond", "Condecoraciones"], ["fra", "Franjas"], ["otra", "Otra / curso"]];
function Awards({ n, cond, rack, done }: { n: string; cond: AwardT[]; rack: Decor[]; done: (fn: (p: Profile) => void, msg?: string) => void }) {
  const me = useMe();
  const [open, setOpen] = useState(!cond.length), [t, setT] = useState<Decor["tab"] | "otra">("med"), [q, setQ] = useState(""), [k, setK] = useState(""), [txt, setTxt] = useState(""), [f, setF] = useState(() => new Date().toISOString().slice(0, 10)), [m, setM] = useState("");
  const has = new Set(cond.map(c => c.k)), s = norm(q.trim());
  const opts = t === "otra" ? [] : DECOR.filter(d => d.tab === t && (!s || norm(d.t + " " + d.g + " " + d.c).includes(s)));
  const groups = [...new Set(opts.map(d => d.g))];
  const sel = decorOf(k);
  const give = () => { const title = t === "otra" ? txt.trim() : sel?.t; if (!title) return;
    done(x => { x.cond = [...((x.cond || []) as unknown as AwardT[]), { id: uid(), t: title, k: t === "otra" ? undefined : sel!.k, f, m: m.trim(), by: me.n }] as unknown as string[]; }, `Otorgada a ${n}: ${title}`);
    setK(""); setTxt(""); setM(""); setOpen(false); };
  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top,#1e2f4d,#0a1222_70%)] px-6 py-8 text-center text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[.07] [background:repeating-linear-gradient(45deg,#fff_0_1px,transparent_1px_7px)]" />
        <p className="relative font-mono text-[10px] font-bold uppercase tracking-[.3em] text-amber-300/80">Pasador de {n}</p>
        <div className="relative mt-5 flex min-h-[3rem] items-center justify-center">{rack.length ? <RibbonRack list={rack} per={4} size="lg" /> : <p className="text-sm text-slate-400">Todavía no tiene condecoraciones.</p>}</div>
        <p className="relative mt-5 text-[11px] text-slate-400">{([["med", "medalla", "medallas"], ["cond", "condecoración", "condecoraciones"], ["fra", "franja", "franjas"]] as const).map(([t, a1, a2]) => { const c = rack.filter(d => d.tab === t).length; return `${c} ${c === 1 ? a1 : a2}`; }).join(" · ")}{cond.length > rack.length ? ` · ${cond.length - rack.length} cursos u otras` : ""}</p>
        {!open && <Button size="sm" className="relative mt-4" icon={<Plus />} onClick={() => setOpen(true)}>Otorgar</Button>}
      </div>

      {open && <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <Segmented size="sm" value={t} onChange={v => { setT(v); setK(""); }} options={DTABS.map(([value, label]) => ({ value, label }))} />
          {t !== "otra" && <SearchInput className="min-w-[10rem] flex-1" value={q} onChange={setQ} placeholder="Buscar cinta o división…" />}
          {cond.length > 0 && <button aria-label="Cerrar" onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"><X className="size-4" /></button>}
        </div>
        {t === "otra" ? <div className="p-4"><Field label="Nombre"><Input autoFocus value={txt} onChange={e => setTxt(e.target.value)} placeholder="Ej: Academia de vuelo, curso de negociación…" /></Field></div>
          : <div className="scrollbar-thin max-h-[19rem] space-y-4 overflow-y-auto p-3">
            {groups.map(g => <div key={g}>{(t === "cond" || groups.length > 1) && <p className="mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{g}</p>}
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">{opts.filter(d => d.g === g).map(d => (
                <button key={d.k} onClick={() => setK(d.k === k ? "" : d.k)} aria-pressed={d.k === k} className={cn("flex items-center gap-3 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  d.k === k ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400 dark:bg-amber-500/10" : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-900")}>
                  <Ribbon d={d} className="!h-[22px] !w-[60px]" />
                  <span className="min-w-0"><span className="line-clamp-2 text-[12.5px] font-semibold leading-tight">{d.t}</span><span className="text-[10.5px] text-slate-400">{d.c}{has.has(d.k) && " · ya la tiene"}</span></span></button>))}</div></div>)}
            {!opts.length && <p className="py-6 text-center text-sm text-slate-400">Nada con ese nombre.</p>}
          </div>}
        <div className="grid gap-2 border-t border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-[9.5rem_1fr_auto] dark:border-slate-800 dark:bg-slate-900/60">
          <Input type="date" value={f} onChange={e => setF(e.target.value)} aria-label="Fecha" />
          <Input value={m} onChange={e => setM(e.target.value)} placeholder="Motivo (opcional)" />
          <Button icon={<Award />} disabled={t === "otra" ? !txt.trim() : !sel} onClick={give}>{sel && t !== "otra" ? "Otorgar cinta" : "Otorgar"}</Button>
        </div>
      </div>}

      <div><div className="mb-3 flex items-center gap-3"><h4 className="font-mono text-[10.5px] font-bold uppercase tracking-[.22em] text-slate-400">Otorgadas · {cond.length}</h4><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
        {cond.length ? <div className="grid gap-2 md:grid-cols-2">{cond.slice().reverse().map(c => { const d = decorOf(c.k); return (
          <div key={c.id} className="group flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="grid w-[4.6rem] shrink-0 place-items-center rounded-xl bg-[#0b1424] py-3">{d ? <Ribbon d={d} className="!h-[22px] !w-[58px]" /> : <Award className="size-6 text-amber-300" />}</div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-snug">{c.t}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{d ? (d.tab === "cond" ? `${d.g} · ${d.c}` : d.c) : "Curso / otra"}</p>
              <p className="mt-1 text-xs text-slate-500">{c.f ? dstr(pdate(c.f)) : "Sin fecha"}{c.by ? ` · por ${c.by}` : ""}</p>
              {c.m && <p className="mt-1 line-clamp-2 text-xs italic text-slate-600 dark:text-slate-300">“{c.m}”</p>}</div>
            <button aria-label={`Quitar ${c.t}`} title="Quitar" onClick={() => done(x => { x.cond = (x.cond as unknown as AwardT[]).filter(y => y.id !== c.id) as unknown as string[]; }, "Quitada")} className="self-start rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-red-500/10"><X className="size-4" /></button>
          </div>); })}</div> : <p className="text-sm text-slate-400">Sin condecoraciones ni cursos registrados.</p>}
      </div>
    </div>);
}

/* emblema de división: imagen propia o sello generado con sus siglas y color */
/* logos con fondo cuadrado (esquinas opacas): se recortan en círculo para que no se vea el cuadrado detrás del escudo */
const SQ = new Map<string, boolean>();
function squareCorners(src: string, done: (v: boolean) => void) {
  if (SQ.has(src)) { done(SQ.get(src)!); return; }
  const img = new Image(); img.crossOrigin = "anonymous";
  img.onload = () => { try { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d")!; x.drawImage(img, 0, 0, 32, 32);
    const a = [[1, 1], [30, 1], [1, 30], [30, 30]].map(([i, j]) => x.getImageData(i, j, 1, 1).data[3]); const v = a.filter(n => n > 200).length >= 3; SQ.set(src, v); done(v); } catch { SQ.set(src, false); done(false); } };
  img.onerror = () => { SQ.set(src, false); done(false); }; img.src = src;
}
function LogoImg({ src }: { src: string }) {
  const [sq, setSq] = useState(() => SQ.get(src) || false);
  useEffect(() => { let on = true; squareCorners(src, v => { if (on) setSq(v); }); return () => { on = false; }; }, [src]);
  return <img src={src} alt="" className={cn("size-full object-contain", sq && "rounded-full object-cover")} loading="lazy" decoding="async" />;
}
export function DivLogo({ d }: { d: string }) {
  const src = d ? divEmblem(d) : logoSrc();
  if (src) return <LogoImg src={src} />;
  const [ab, col] = divAb(d), fs = ab.length > 4 ? 22 : ab.length > 3 ? 26 : ab.length > 2 ? 32 : 38, id = norm(d).replace(/\W/g, "");
  return (
    <svg viewBox="0 0 200 200" className="size-full">
      <defs><path id={`t${id}`} d="M100 100 m-74 0 a74 74 0 1 1 148 0" /><path id={`b${id}`} d="M100 100 m-80 0 a80 80 0 0 0 160 0" /></defs>
      <circle cx="100" cy="100" r="96" fill="#e6c65a" /><circle cx="100" cy="100" r="88" fill={col} /><circle cx="100" cy="100" r="62" fill="#0b1f3a" stroke="#e6c65a" strokeWidth="3" />
      <text fontFamily="Arial" fontWeight="700" fontSize="13" fill="#fff" letterSpacing="2"><textPath href={`#t${id}`} startOffset="50%" textAnchor="middle">{d.toUpperCase().slice(0, 30)}</textPath></text>
      <text fontFamily="Arial" fontWeight="700" fontSize="12" fill="#e6c65a" letterSpacing="3"><textPath href={`#b${id}`} startOffset="50%" textAnchor="middle">LOS SANTOS POLICE</textPath></text>
      <text x="100" y={100 + fs * 0.36} textAnchor="middle" fontFamily="Arial" fontWeight="800" fontSize={fs} fill="#e6c65a">{ab}</text>
    </svg>
  );
}

function RegModal({ n, myL, onClose, onCreated }: { n: string | null; myL: number; onClose: () => void; onCreated: (n: string) => void }) {
  const { toast } = useFeedback();
  const a = n ? findAgent(n) : null;
  const opts = [...RANKS.filter(r => lvl(r) < myL), "Administrativo"], rOpts = a && !opts.includes(a.r) ? [a.r, ...opts] : opts;
  const [f, setF] = useState(() => ({ n: a?.n || "", r: a?.r || "Police Officer I", p: a?.p || "", s: a?.s || "", d: a?.d || "", c: a?.c || new Date().toISOString().slice(0, 10), e: a?.e || "Activo", o: (a as Agent & { o?: string })?.o || "", g: a ? genderOf(a.n) : "m" }));
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const ok = () => {
    const nm = f.n.trim().replace(/\s+/g, " "), p = f.p.trim(), R = getRoster();
    if (!nm) { toast("Poné el nombre del agente", "err"); return; }
    if (!a && R.some(x => norm(x.n) === norm(nm))) { toast("Ya existe un agente con ese nombre", "err"); return; }
    if (p && R.some(x => x.p === p && x.n !== n)) { toast("Esa placa ya está asignada a otro agente", "err"); return; }
    const data = { p, s: f.s.trim().toUpperCase(), d: f.d.trim(), c: f.c, e: f.e, o: f.o.trim() };
    if (a) updateAgent(a.n, x => Object.assign(x, data));
    else LS.setJSON("lspdt.roster", [...R, { n: nm, r: f.r, a: "", ...data }]);
    updateProf(a ? a.n : nm, x => { x.g = f.g; });
    onClose(); toast(a ? "Datos actualizados" : "Agente registrado"); if (!a) onCreated(nm);
  };
  return (
    <Modal open onClose={onClose} title={a ? `Editar datos · ${a.n}` : "Registrar agente"} icon={a ? <Pencil /> : <UserPlus />}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Check />} onClick={ok}>{a ? "Guardar cambios" : "Registrar"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido"><Input value={f.n} onChange={set("n")} disabled={!!a} autoFocus={!a} /></Field>
        <Field label="Rango" hint={a ? "(se cambia desde Ascensos)" : undefined}><Select value={f.r} onChange={set("r")} disabled={!!a}>{rOpts.map(r => <option key={r} value={r}>{rankES(r)}</option>)}</Select></Field>
        <Field label="N° de placa"><Input value={f.p} onChange={set("p")} inputMode="numeric" autoFocus={!!a} /></Field>
        <Field label="State ID"><Input value={f.s} onChange={set("s")} className="uppercase" /></Field>
        <Field label="Discord"><Input value={f.d} onChange={set("d")} placeholder="usuario o ID" /></Field>
        <Field label="Fecha de ingreso"><Input type="date" value={f.c} onChange={set("c")} /></Field>
        <Field label="Estado"><Select value={f.e} onChange={set("e")}>{ESTADOS.map(x => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Trato"><Segmented value={f.g === "f" ? "f" : "m"} onChange={v => setF({ ...f, g: v })} options={[{ value: "m", label: "Masculino" }, { value: "f", label: "Femenino" }]} /></Field>
      </div>
      <Field label="Observaciones" hint="(opcional)"><Input value={f.o} onChange={set("o")} /></Field>
    </Modal>
  );
}

