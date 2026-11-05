import { useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { Users, Search, LayoutGrid, Rows3, UserPlus, BadgeCheck, Trophy, Shield, Radio, Clock, TrendingUp, IdCard, AtSign, Mail, Activity, Home as HomeI,
  Pencil, Star, Plus, X, Camera, Move, Trash2, FileText, Award, StickyNote, Car, History, Check, UserMinus, ImagePlus } from "lucide-react";
import { Button, Card, Empty, Field, Input, Select, Segmented, Textarea } from "@/components/ui";
import { RankBadge } from "@/components/agents";
import { Modal } from "@/components/modal";
import { ImagePicker } from "@/components/imagepick";
import { useFeedback } from "@/components/feedback";
import { ALL_DIVS, DIVS, GROUPS, LEVEL, divAb, divEmblem, emailOf, findAgent, fotoOf, genderOf, getRoster, imgOpt, initials, insigniaUrl, lvl, norm, rankES, uid, type Agent } from "@/lib/domain";
import { ACC_LAST, LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { allProfiles, profFull, updateAgent, updateProf, type Profile } from "@/lib/profiles";
import { VEH, dmy, missOf, type PHist } from "@/lib/patrol";
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
const logoSrc = () => LS.get("lspdt.logo") || "/next/logo.svg";
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
  const [s, setS] = useState(() => imgOpt(src, w));
  return <img src={s} alt="" draggable={false} decoding="async" loading="lazy" className={className} style={style} onError={() => s !== src && setS(src)} />;
}
function PhotoBox({ a, p, ph, className }: { a: Agent; p: Profile; ph?: Ph; className?: string }) {
  const f = fotoOf(a.n), ins = insigniaUrl(a.r);
  return (
    <div className={cn("relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900", className)}>
      {f ? <Img src={f} w={640} className="size-full object-cover" style={phStyle(ph || phOf(p))} /> : <Sil className="absolute inset-x-0 bottom-0 h-[85%]" />}
      <img src={logoSrc()} alt="" className="absolute left-2 top-2 h-7 w-auto drop-shadow" />
      <div className="absolute right-2 top-2 flex gap-1">
        {!!p.fr && <span title={`${p.fr} ${p.fr === 1 ? "franja" : "franjas"} de servicio`} className="grid size-7 place-items-center rounded-lg bg-slate-950/70 p-0.5 backdrop-blur"><Stripes n={p.fr} /></span>}
        {ins && <span title={rankES(a.r)} className="grid h-7 min-w-7 place-items-center rounded-lg bg-slate-950/70 px-1 backdrop-blur"><img src={ins} alt="" className="max-h-5 w-auto" /></span>}
      </div>
      {a.e && a.e !== "Activo" && <span className="absolute inset-x-0 bottom-0 bg-amber-500/90 py-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-amber-950">{a.e}</span>}
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
  const me = useMe();
  const R = getRoster(), P = allProfiles();
  const [q, setQ] = useState(""), [g, setG] = useState(""), [d, setD] = useState("");
  const [view, setView] = useState<"grid" | "list">(() => (LS.get("lspdt.agView") === "list" ? "list" : "grid"));
  const [cur, setCur] = useState<string | null>(null), [reg, setReg] = useState<string | null | false>(false);
  const s = norm(q.trim());
  const list = R.filter(a => { if (g && !GROUPS[g].r.includes(a.r)) return false; if (d) { const dv = profFull(a.n, P).div; if (d === "-" ? dv.length : !dv.includes(d)) return false; }
    return !s || norm(a.n).includes(s) || String(a.p).includes(s) || norm(a.s || "").includes(s); }).sort((x, y) => lvl(y.r) - lvl(x.r) || x.n.localeCompare(y.n));
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, placa o State ID…" /></div>
        <Select className="w-auto text-sm" value={g} onChange={e => setG(e.target.value)}><option value="">LSPD · Todos</option>{Object.entries(GROUPS).filter(([, x]) => R.some(a => x.r.includes(a.r))).map(([k, x]) => <option key={k} value={k}>{x.l}</option>)}</Select>
        <Select className="w-auto max-w-[16rem] text-sm" value={d} onChange={e => setD(e.target.value)}><option value="">Todas las divisiones</option><option value="-">Sin división</option>{ALL_DIVS.map(x => <option key={x} value={x}>{SUBDIVS.has(x) ? "— " : ""}{x}</option>)}</Select>
        <Segmented size="sm" value={view} onChange={v => { setView(v); LS.set("lspdt.agView", v); }} options={[{ value: "grid", label: <LayoutGrid className="size-4" aria-label="Tarjetas" /> }, { value: "list", label: <Rows3 className="size-4" aria-label="Lista" /> }]} />
        <Button icon={<UserPlus />} onClick={() => setReg(null)}>Registrar agente</Button>
      </Card>
      <p className="text-xs text-slate-400">Planilla del departamento · {list.length} de {R.length} agentes</p>
      {!list.length ? <Card><Empty icon={<Users />} title="Sin agentes para ese filtro" /></Card>
        : view === "grid" ? Object.entries(GROUPS).map(([k, gr]) => { const l = list.filter(a => gr.r.includes(a.r)); return l.length ? (
          <section key={k}>
            <h3 className="mb-3 mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{gr.l}<span className="rounded-md bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800">{l.length}</span></h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {l.map(a => { const p = profFull(a.n, P), md = mainDiv(p); return (
                <button key={a.n} onClick={() => setCur(a.n)} title={p.div.join(" · ") || "Sin división"}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-800 dark:bg-slate-900/60">
                  <PhotoBox a={a} p={p} className="transition group-hover:brightness-105" />
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{a.n}</p>
                    <p className="truncate font-mono text-[11px] text-slate-400">{a.s || "—"}{p.cs && ` · ${p.cs}`}</p>
                    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11.5px] text-slate-500 dark:border-slate-800">
                      <p className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 shrink-0" />Placa {a.p ? "#" + a.p : "—"}</p>
                      <p className="flex items-center gap-1.5"><Trophy className="size-3.5 shrink-0" />{rankES(a.r)}</p>
                      <p className="flex items-center gap-1.5 truncate"><Shield className="size-3.5 shrink-0" /><span className="truncate">{md || "Sin división"}</span></p>
                    </div>
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
function ProfileModal({ n, onClose, onEdit }: { n: string; onClose: () => void; onEdit: () => void }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback();
  const a = findAgent(n)!, p = profFull(n), md = mainDiv(p), foto = fotoOf(n);
  const cover = LS.get("lspdt.cover." + n) || LS.get("lspdt.img.cover") || "";
  const PH = LS.json<PHist[]>("lspdt.patHist", []), VOTES = LS.json<Prop[]>("lspdt.votes", []);
  const [tab, setTab] = useState<Tab>("res"), [editDiv, setEditDiv] = useState(false), [divSel, setDivSel] = useState<string[]>([]);
  const [ph, setPh] = useState<Ph | null>(null), [cv, setCv] = useState<{ x: number; y: number } | null>(null);
  const [pick, setPick] = useState<"" | "foto" | "cover" | "divlogo">(""), [logoFor, setLogoFor] = useState("");
  const [nota, setNota] = useState(""), [cdT, setCdT] = useState(""), [cdF, setCdF] = useState("");
  const coverRef = useRef<HTMLDivElement>(null), phRef = useRef<HTMLDivElement>(null);
  const done = (fn: (p: Profile) => void, msg?: string) => { updateProf(n, fn); if (msg) toast(msg); };
  const order = ALL_DIVS, divs = p.div.slice().sort((x, y) => order.indexOf(x) - order.indexOf(y));
  const tl = useMemo(() => {
    const t: { d: Date | null; c: string; b: string; s: string }[] = [], same = (x: Date | null, y: Date | null) => !!x && !!y && x.toDateString() === y.toDateString();
    if (a.c) t.push({ d: pdate(a.c), c: "ing", b: "Ingreso al LSPD", s: "Fecha de contrato registrada en el roster" });
    if (a.a && a.a !== a.c && !p.movs.some(m => m.tipo === "asc" && same(new Date(m.t), pdate(a.a)))) t.push({ d: pdate(a.a), c: "", b: `Último ascenso registrado · ${rankES(a.r)}`, s: "Según el roster" });
    p.movs.forEach(m => t.push({ d: new Date(m.t), c: m.tipo === "desc" ? "desc" : "", b: `${m.tipo === "asc" ? "Ascenso" : "Descenso"}: ${rankES(m.de)} → ${rankES(m.a)}`, s: `${m.via || ""} · registrado por ${rankES(m.por.r)} ${m.por.n}` }));
    return t.sort((x, y) => +(y.d || 0) - +(x.d || 0));
  }, [a, p.movs]);
  const pats = PH.filter(h => h.rows.some(r => r.n === n)).map(h => ({ h, r: h.rows.find(r => r.n === n)! }));
  const votes = VOTES.filter(v => v.ag.n === n).sort((x, y) => y.t - x.t), cond = (p.cond || []) as unknown as { id: string; t: string; f?: string }[], lic = (p.lic || {}) as Record<string, boolean>;
  const notas = p.notas as unknown as { id: string; a: string; r: string; m: string; t: number }[];
  const last = Math.max(0, ...p.movs.map(m => m.t), ...notas.map(x => x.t), ...pats.map(x => x.h.t), ...votes.map(v => v.t), ACC_LAST[n] || 0);
  const tabs: [Tab, string, number | undefined, typeof FileText][] = [["res", "Resumen", undefined, FileText], ["his", "Historial", tl.length + votes.length, History], ["not", "Notas internas", notas.length, StickyNote], ["pat", "Controles de patrulla", pats.length, Car], ["con", "Condecoraciones", cond.length, Award]];
  const cl = (v: number) => Math.max(0, Math.min(100, v));

  const drag = (el: HTMLElement | null, e: PE, start: { x: number; y: number; z?: number }, apply: (x: number, y: number) => void, fx = 1, fy = 1) => {
    if (!el) return; e.preventDefault(); el.setPointerCapture(e.pointerId); const r = el.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    el.onpointermove = m => apply(cl(start.x - ((m.clientX - x0) / r.width) * 100 * fx), cl(start.y - ((m.clientY - y0) / r.height) * 100 * fy));
    el.onpointerup = () => { el.onpointermove = null; };
  };
  const Row = ({ i: I, k, children }: { i: typeof Clock; k: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800"><I className="size-4 shrink-0 text-slate-400" /><span className="w-36 shrink-0 text-slate-500">{k}</span><span className="min-w-0 flex-1 truncate text-right font-medium">{children}</span></div>
  );
  return (
    <Modal open onClose={onClose} title={`Perfil del agente · ${a.n}`} icon={<IdCard />} size="xl">
      <div className="-m-5">
        <div ref={coverRef} className={cn("relative h-40 overflow-hidden bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950 sm:h-48", cv && "cursor-grab active:cursor-grabbing")}
          onPointerDown={e => { if (!cv || (e.target as HTMLElement).closest("button")) return; const s = { ...cv }; drag(coverRef.current, e, s, (x, y) => setCv({ x, y }), 1, 0.6); }}>
          {cover ? <Img src={cover} w={1080} className="size-full object-cover" style={{ objectPosition: `${(cv || (p.cv as { x: number; y: number }) || { x: 50, y: 50 }).x}% ${(cv || (p.cv as { x: number; y: number }) || { x: 50, y: 50 }).y}%` }} />
            : <div className="grid size-full place-items-center bg-grid opacity-60"><img src={logoSrc()} alt="" className="h-20 opacity-30" /></div>}
          <div className="absolute right-3 top-3 flex gap-1.5">
            {cv ? <><Button size="sm" icon={<Check />} onClick={() => { done(x => { x.cv = cv; }, "Portada guardada"); setCv(null); }}>Guardar portada</Button><Button size="sm" variant="outline" onClick={() => setCv(null)}>Cancelar</Button></>
              : <><Button size="sm" variant="outline" icon={<ImagePlus />} onClick={() => setPick("cover")}>{cover ? "Cambiar portada" : "Subir portada"}</Button>
                {LS.get("lspdt.cover." + n) && <><Button size="sm" variant="outline" icon={<Move />} onClick={() => setCv({ ...((p.cv as { x: number; y: number }) || { x: 50, y: 50 }) })}>Ajustar</Button>
                  <Button size="sm" variant="outline" icon={<Trash2 />} aria-label="Quitar portada" onClick={() => { LS.del("lspdt.cover." + n); done(x => { x.cv = null; }, "Portada quitada"); }} /></>}</>}
          </div>
          <div title={md || "LSPD"} className="absolute bottom-3 right-4 size-16 overflow-hidden rounded-full bg-white/10 p-1 ring-2 ring-white/20 backdrop-blur"><DivLogo d={md} /></div>
          {cv && <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">Arrastrá la imagen para acomodarla</p>}
        </div>
        <div className="flex flex-wrap items-end gap-4 px-5">
          <button onClick={() => setPick("foto")} title="Cambiar foto" className="group relative -mt-12 size-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-slate-200 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-900 dark:bg-slate-800">
            {foto ? <Img src={foto} w={256} className="size-full object-cover" style={phStyle(phOf(p))} /> : <Sil className="mt-3" />}
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100"><Camera className="size-5" /></span>
          </button>
          <div className="min-w-0 flex-1 pb-1 pt-3">
            <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">{a.n}<RankBadge r={a.r} /></h2>
            <p className="mt-0.5 text-xs text-slate-500">Identificación {a.s || "—"} · Placa #{a.p || "—"}{p.cs && ` · ${p.cs}`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <Segmented size="sm" value={p.g === "f" ? "f" : "m"} onChange={v => done(x => { x.g = v; }, "Trato actualizado")} options={[{ value: "m", label: "Masculino" }, { value: "f", label: "Femenino" }]} />
            {foto && <Button size="sm" variant="outline" icon={<Move />} onClick={() => setPh({ ...phOf(p) })}>Encuadre</Button>}
            <Button size="sm" variant="outline" icon={<Pencil />} onClick={onEdit}>Editar datos</Button>
            {me.l >= 8 && <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" icon={<UserMinus />} onClick={async () => {
              if (!(await confirm(`¿Dar de baja a ${a.n}? Se quita del roster (su perfil y notas se conservan).`, { danger: true, ok: "Dar de baja" }))) return;
              LS.setJSON("lspdt.roster", getRoster().filter(x => x.n !== n)); onClose(); toast("Agente dado de baja"); }}>Dar de baja</Button>}
          </div>
        </div>

        {ph && (
          <div className="mx-5 mt-4 flex flex-wrap items-start gap-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
            <div className="w-40"><div ref={phRef} className="cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing" onWheel={e => setPh({ ...ph, z: Math.max(1, Math.min(3, +(ph.z - e.deltaY * 0.0015).toFixed(2))) })}
              onPointerDown={e => { const s = { ...ph }; drag(phRef.current, e, s, (x, y) => setPh(v => ({ ...v!, x, y })), 1.6 / s.z, 1.6 / s.z); }}><PhotoBox a={a} p={p} ph={ph} /></div><p className="mt-1.5 text-center text-[11px] text-slate-500">Tarjeta · arrastrá para encuadrar</p></div>
            <div>
              <div className="size-24 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-800"><img src={foto} alt="" className="size-full object-cover" style={phStyle(ph)} /></div><p className="mt-1.5 text-center text-[11px] text-slate-500">Avatar</p>
            </div>
            <div className="min-w-[12rem] flex-1 space-y-3">
              <label className="flex items-center gap-3 text-xs font-semibold text-slate-500">Zoom<input type="range" min={1} max={3} step={0.02} value={ph.z} onChange={e => setPh({ ...ph, z: +e.target.value })} className="flex-1 accent-brand-600" /></label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={<Check />} onClick={() => { done(x => { x.ph = ph; }, "Encuadre guardado"); setPh(null); }}>Guardar encuadre</Button>
                <Button size="sm" variant="outline" onClick={() => setPh({ x: 50, y: 22, z: 1 })}>Centrar</Button>
                <Button size="sm" variant="ghost" onClick={() => setPh(null)}>Cancelar</Button>
                <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (!(await confirm("¿Quitar la foto?", { danger: true }))) return; LS.del("lspdt.foto." + n); done(x => { x.foto = ""; x.ph = null; }, "Foto quitada"); setPh(null); }}>Quitar foto</Button>
              </div>
            </div>
          </div>
        )}

        <div className="scrollbar-thin mt-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-5 dark:border-slate-800" role="tablist">
          {tabs.map(([k, l, c, I]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
              tab === k ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
              <I className="size-4" />{l}{c !== undefined && <span className="rounded-md bg-slate-100 px-1.5 text-[11px] text-slate-500 dark:bg-slate-800">{c}</span>}</button>))}
        </div>

        <div className="p-5">
          {tab === "res" && <>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Información básica</h4>
                <Row i={HomeI} k="Departamento">LSPD</Row><Row i={Trophy} k="Rango">{rankES(a.r)}</Row>
                <div className="flex items-center gap-3 border-b border-slate-100 py-1.5 text-sm dark:border-slate-800"><Radio className="size-4 text-slate-400" /><span className="w-36 shrink-0 text-slate-500">Callsign</span>
                  <Input key={p.cs} defaultValue={p.cs} placeholder="Sin callsign" className="h-8 flex-1 text-right font-mono uppercase" onBlur={e => { const v = e.target.value.trim().toUpperCase(); if (v !== p.cs) done(x => { x.cs = v; }, "Callsign guardado"); }} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} /></div>
                <div className="flex items-center gap-3 border-b border-slate-100 py-1.5 text-sm dark:border-slate-800"><BadgeCheck className="size-4 text-slate-400" /><span className="w-36 shrink-0 text-slate-500">Franjas de servicio</span>
                  <Select value={p.fr || 0} onChange={e => done(x => { x.fr = +e.target.value; }, "Franjas actualizadas")} className="h-8 flex-1 text-sm">{[0, 1, 2, 3, 4, 5, 6].map(k => <option key={k} value={k}>{k ? k + (k === 1 ? " franja" : " franjas") : "Sin franjas"}</option>)}</Select></div>
                <Row i={Award} k="Condecoraciones">{cond.length}</Row><Row i={Clock} k="Fecha de ingreso">{dstr(pdate(a.c))}</Row><Row i={Clock} k="Antigüedad">{antig(a.c)}</Row>
                <Row i={TrendingUp} k="Último ascenso">{dstr(pdate(a.a))}</Row><Row i={Clock} k="Tiempo en el rango">{antig(a.a || a.c)}</Row><Row i={Activity} k="Última actividad">{rel(last)}</Row>
                <Row i={BadgeCheck} k="N° de placa">{a.p ? "#" + a.p : "—"}</Row><Row i={IdCard} k="State ID">{a.s || "—"}</Row><Row i={AtSign} k="Discord">{a.d || "—"}</Row>
                <Row i={Mail} k="Correo">{emailOf(a.n)}</Row><Row i={Shield} k="Estado">{a.e || "—"}</Row>
                {(a as Agent & { o?: string }).o && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"><b>Observaciones:</b> {(a as Agent & { o?: string }).o}</p>}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Divisiones ({divs.length})</h4>
                  <button className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => { setDivSel(p.div); setEditDiv(!editDiv); }}>{editDiv ? <><X className="size-3.5" />Cerrar</> : <><Pencil className="size-3.5" />Editar</>}</button></div>
                {editDiv ? <>
                  <div className="grid gap-x-4 gap-y-1 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-2 dark:border-slate-800">
                    {DIVS.flatMap(([dd, subs]) => [[dd, false] as const, ...(subs || []).map(x => [x, true] as const)]).map(([dd, sub]) => (
                      <label key={dd} className={cn("flex cursor-pointer items-center gap-2 py-0.5", sub && "pl-5 text-xs text-slate-500")}><input type="checkbox" className="accent-brand-600" checked={divSel.includes(dd)} onChange={e => setDivSel(e.target.checked ? [...divSel, dd] : divSel.filter(x => x !== dd))} />{dd}</label>))}
                  </div>
                  <div className="mt-3 flex justify-end"><Button size="sm" icon={<Check />} onClick={() => { done(x => { x.div = ALL_DIVS.filter(dd => divSel.includes(dd)); if (x.main && !x.div.includes(x.main)) x.main = ""; }, "Divisiones guardadas"); setEditDiv(false); }}>Guardar divisiones</Button></div>
                </> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {divs.map(dd => (
                    <div key={dd} className={cn("group relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center", dd === md ? "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/5" : "border-slate-200 dark:border-slate-800", SUBDIVS.has(dd) && "opacity-90")}>
                      {dd === md && <Star className="absolute left-2 top-2 size-3.5 fill-amber-400 text-amber-400" aria-label="División principal" />}
                      <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        {!SUBDIVS.has(dd) && dd !== md && <button title="Marcar como principal" onClick={() => done(x => { x.main = dd; }, "División principal actualizada")} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"><Star className="size-3.5" /></button>}
                        {me.admin && <button title="Cambiar emblema de la división" onClick={() => { setLogoFor(dd); setPick("divlogo"); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Pencil className="size-3.5" /></button>}
                      </div>
                      <div className="size-14"><DivLogo d={dd} /></div><b className="text-[11.5px] font-semibold leading-tight">{dd}</b>
                    </div>))}
                  <button onClick={() => { setDivSel(p.div); setEditDiv(true); }} className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700"><Plus className="size-4" />Agregar</button>
                </div>}
              </div>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Licencias</h4><span className="text-[11px] text-slate-400">Clic para marcar o desmarcar</span></div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{LICS.map(l => (
                <button key={l} onClick={() => done(x => { x.lic = { ...(x.lic || {}), [l]: !lic[l] }; })} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  lic[l] ? "border-emerald-400/50 bg-emerald-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}>
                  <FileText className={cn("size-4 shrink-0", lic[l] ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{l}</span><span className={cn("text-[11px]", lic[l] ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>{lic[l] ? "Adquirido" : "No adquirido"}</span></span></button>))}</div>
            </div>
          </>}
          {tab === "his" && <div className="grid gap-6 lg:grid-cols-2">
            <div><h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Historial de rangos</h4>
              {tl.length ? <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5 dark:border-slate-800">{tl.map((x, i) => (
                <li key={i} className="relative"><span className={cn("absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-white dark:ring-slate-900", x.c === "desc" ? "bg-red-500" : x.c === "ing" ? "bg-brand-500" : "bg-emerald-500")} />
                  <p className="text-sm font-semibold">{x.b}</p><p className="text-xs text-slate-500">{dstr(x.d)}{x.s && ` · ${x.s}`}</p></li>))}</ol>
                : <p className="text-sm text-slate-400">Sin movimientos registrados.</p>}</div>
            <div><h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Votaciones</h4>
              {votes.length ? <div className="space-y-2">{votes.map(v => { const c = tally(v); return (
                <button key={v.id} onClick={() => { (window as unknown as { __vcur?: string }).__vcur = v.id; onClose(); goTo("sup", "vot"); }} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <TipoBadge t={v.tipo} /><span className="flex-1 text-sm">{rankES(v.ag.r)} → {rankES(v.nr)}</span><span className="font-mono text-xs text-slate-400">{c.favor}/{c.contra}/{c.abst}</span><EstadoBadge e={v.estado} /></button>); })}</div>
                : <p className="text-sm text-slate-400">Sin propuestas registradas.</p>}</div>
          </div>}
          {tab === "not" && <div className="space-y-4">
            <div className="flex gap-2"><Textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Agregar una nota interna sobre el agente…" />
              <Button className="self-end" icon={<Plus />} onClick={() => { const m = nota.trim(); if (!m) return; done(x => { x.notas = [...x.notas, { id: uid(), a: me.n, r: me.r, m, t: Date.now() }]; }, "Nota agregada"); setNota(""); }}>Agregar</Button></div>
            {notas.length ? notas.slice().reverse().map(x => (
              <div key={x.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500"><b className="text-slate-700 dark:text-slate-200">{x.a}</b> · {rankES(x.r)} · {dstr(new Date(x.t))}
                  {(x.a === me.n || me.l >= 8) && <button className="ml-auto font-semibold text-red-600 hover:underline dark:text-red-400" onClick={async () => { if (await confirm("¿Borrar la nota?", { danger: true })) done(y => { y.notas = (y.notas as unknown as { id: string }[]).filter(z => z.id !== x.id) as unknown as Profile["notas"]; }); }}>Borrar</button>}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{x.m}</p></div>))
              : <p className="py-6 text-center text-sm text-slate-400">Sin notas internas.</p>}
          </div>}
          {tab === "pat" && <div className="space-y-3">
            {pats.length ? pats.map(({ h, r }) => (
              <div key={h.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs text-slate-500"><b className="text-slate-700 dark:text-slate-200">{dmy(h.fecha)}</b> · revisado por {rankES(h.por.r)} {h.por.n}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">{VEH.map(([k, vn]) => { const c = r.v[k] || { s: "" }; if (c.s === "na") return null; const ms = missOf(c); return (
                  <div key={k} className="text-sm"><span className="mr-2 text-slate-500">{vn}</span><StatusPill s={c.s} />{ms.length > 0 && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">Falta: {ms.join(", ")}</p>}<Thumbs ids={c.f} cap={`${n} · ${vn} · ${dmy(h.fecha)}`} /></div>); })}</div>
                {h.nota && <p className="mt-2 text-xs text-slate-500">Notas: {h.nota}</p>}
              </div>)) : <p className="py-6 text-center text-sm text-slate-400">Sin controles de patrulla guardados.</p>}
          </div>}
          {tab === "con" && <div className="space-y-4">
            <div className="flex flex-wrap gap-2">{cond.length ? cond.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 py-1 pl-3 pr-1 text-sm font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <Award className="size-3.5" />{c.t}{c.f && <small className="text-xs opacity-70">{dstr(pdate(c.f))}</small>}
                <button aria-label={`Quitar ${c.t}`} onClick={() => done(x => { x.cond = (x.cond as unknown as { id: string }[]).filter(y => y.id !== c.id) as unknown as string[]; })} className="rounded-full p-0.5 hover:bg-amber-200/60 dark:hover:bg-amber-500/20"><X className="size-3.5" /></button></span>))
              : <p className="text-sm text-slate-400">Sin condecoraciones ni cursos registrados.</p>}</div>
            <div className="flex flex-wrap gap-2"><Input className="min-w-[14rem] flex-1" value={cdT} onChange={e => setCdT(e.target.value)} placeholder="Ej: Academia de vuelo, Medalla al Valor…" />
              <Input type="date" className="w-44" value={cdF} onChange={e => setCdF(e.target.value)} />
              <Button icon={<Plus />} onClick={() => { const t = cdT.trim(); if (!t) return; done(x => { x.cond = [...((x.cond || []) as unknown[]), { id: uid(), t, f: cdF }] as unknown as string[]; }, "Agregado"); setCdT(""); setCdF(""); }}>Agregar</Button></div>
          </div>}
        </div>
      </div>
      <ImagePicker open={pick === "foto"} title={"Foto de " + n} k={"lspdt.foto." + n} max={1280} onClose={() => setPick("")}
        onFile={d => { LS.set("lspdt.foto." + n, d); done(x => { x.foto = ""; x.ph = { x: 50, y: 22, z: 1 }; }, "Foto cargada: ajustá el encuadre y guardá"); setPh({ x: 50, y: 22, z: 1 }); }}
        onUrl={() => { done(x => { x.foto = ""; x.ph = { x: 50, y: 22, z: 1 }; }, "Foto cargada: ajustá el encuadre y guardá"); setPh({ x: 50, y: 22, z: 1 }); }}
        onDelete={LS.get("lspdt.foto." + n) ? async () => { if (!(await confirm("¿Quitar la foto de " + n + "?", { danger: true }))) return; LS.del("lspdt.foto." + n); done(x => { x.foto = ""; }, "Foto quitada"); } : undefined} />
      <ImagePicker open={pick === "cover"} title={"Portada de " + n} k={"lspdt.cover." + n} max={1920} onClose={() => setPick("")}
        onFile={d => { LS.set("lspdt.cover." + n, d); done(x => { x.cv = { x: 50, y: 50 }; }, "Portada cargada: arrastrala para acomodarla y guardá"); setCv({ x: 50, y: 50 }); }}
        onUrl={() => { done(x => { x.cv = { x: 50, y: 50 }; }, "Portada cargada: arrastrala para acomodarla y guardá"); setCv({ x: 50, y: 50 }); }} />
      <ImagePicker open={pick === "divlogo"} title={"Emblema · " + logoFor} k={"lspdt.divlogo." + logoFor} max={400} alpha onClose={() => setPick("")}
        onFile={d => { LS.set("lspdt.divlogo." + logoFor, d); toast("Emblema de la división actualizado"); }} onUrl={() => toast("Emblema de la división actualizado")}
        onDelete={LS.get("lspdt.divlogo." + logoFor) ? () => { LS.del("lspdt.divlogo." + logoFor); toast("Emblema restaurado"); } : undefined} />
    </Modal>
  );
}

/* emblema de división: imagen propia o sello generado con sus siglas y color */
export function DivLogo({ d }: { d: string }) {
  const src = d ? divEmblem(d) : logoSrc();
  if (src) return <img src={src} alt="" className="size-full object-contain" loading="lazy" decoding="async" />;
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
