/* Perfil (BETA), estilo comunidad y OOC: portada, foto, ID de cuenta, contadores en una línea, seguidores, «acerca de» con formato,
   visitantes y pestañas Actividad · Logros · Comentarios · Personaje (lo policial). La actividad policial de cada división
   solo la ven los miembros de esa división.
   Datos: lspdt.uprof.<slug> (solo el dueño), .ban (portada), lspdt.ucom.<slug> (comentarios), lspdt.uvis.<slug> (visitas), lspdt.ufol.<slug> (seguidores). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, BadgeCheck, Bomb, Check, Bold, Camera, ChevronsUp, Crown, Eye, Gem, Heading1, Heading2, Heading3, IdCard, Italic, List, Lock, MessageSquare, Pencil, Quote, Save, Scale, Send, Strikethrough, Trash2, Trophy, Underline, UserCheck, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { Button, Card, Textarea } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { Ribbon } from "@/components/ribbon";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { useTick } from "@/components/fbnotif";
import { ACC, LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { readImg } from "@/lib/patrol";
import { ago, emailOf, findAgent, fmtDate, lvl, rankES, uid } from "@/lib/domain";
import { decorOf, type Award } from "@/lib/decor";
import { profFull, takePreset } from "@/lib/profiles";
import { isPSB, rtdMem, uMap, type UnitKey } from "@/lib/units";
import { mdHtml } from "@/lib/discord";
import { nickOf } from "@/lib/nick";
import { cn } from "@/lib/cn";

export type UProf = { bio?: string; since?: number; seen?: number; col?: string; nick?: string };
export type UCom = { id: string; by: string; t: number; x: string };
type UVis = { c: number; l: { n: string; t: number }[] };
export const slugOf = (n: string) => emailOf(n).split("@")[0];
export const K = { prof: (n: string) => `lspdt.uprof.${slugOf(n)}`, ban: (n: string) => `lspdt.uprof.${slugOf(n)}.ban`, pic: (n: string) => `lspdt.uprof.${slugOf(n)}.pic`, com: (n: string) => `lspdt.ucom.${slugOf(n)}`, vis: (n: string) => `lspdt.uvis.${slugOf(n)}`, fol: (n: string) => `lspdt.ufol.${slugOf(n)}` };
const COLS = ["#0f7a3a", "#1e3a8a", "#7c3aed", "#b91c1c", "#0e7490", "#be185d", "#334155"];
const FOUNDER = "Ryan Westbrook";
const dmy = (t?: number) => (t ? new Date(t).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

/* foto del perfil: propia del perfil (no toca la foto del agente); si no hay, la del agente */
function PAvatar({ n, size = 32 }: { n: string; size?: number }) {
  const p = LS.get(K.pic(n));
  return p ? <img src={p} alt="" className="shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10" style={{ width: size, height: size }} /> : <Avatar n={n} size={size} />;
}

/* ---------- logros ---------- */
const TIER = {
  comun: { l: "Común", c: "#94a3b8", bg: "linear-gradient(145deg,#64748b,#334155)" },
  raro: { l: "Raro", c: "#38bdf8", bg: "linear-gradient(145deg,#0ea5e9,#1e3a8a)" },
  epico: { l: "Épico", c: "#c084fc", bg: "linear-gradient(145deg,#a855f7,#4c1d95)" },
  legend: { l: "Legendario", c: "#fbbf24", bg: "linear-gradient(145deg,#fde047,#d97706 55%,#78350f)" },
  mitico: { l: "Mítico", c: "#f43f5e", bg: "conic-gradient(from 0deg,#f43f5e,#f59e0b,#22c55e,#06b6d4,#8b5cf6,#f43f5e)" },
} as const;
type Tier = keyof typeof TIER;
/* íconos propios de los logros únicos */
type IcoP = { className?: string; style?: React.CSSProperties };
/* banana: cáscara amarilla con degradé, nervio claro, puntas y tallo marrones */
const BananaI = ({ className, style }: IcoP) => (
  <svg viewBox="0 0 64 64" className={className} style={{ ...style, width: typeof style?.width === "number" ? style.width * 1.3 : undefined, height: typeof style?.height === "number" ? style.height * 1.3 : undefined, color: undefined, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.45))" }}>
    <defs><linearGradient id="bn-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff27a" /><stop offset=".55" stopColor="#ffd21f" /><stop offset="1" stopColor="#e9a400" /></linearGradient></defs>
    <path d="M47.5 14.5c4.2 6.6 5.2 15.4 1.6 23.4C44.3 48.6 32.4 55 19.6 54.2c-4.1-.3-8-1.4-10.8-3.2 0 0-1-1.2.2-1.6 13.3-.6 24.5-7.1 29.7-17.6 3.1-6.2 3.6-12.2 2.7-16.6z" fill="url(#bn-g)" stroke="#a86b00" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M44.2 19.6c1.2 5 .5 10.6-2.3 15.8-4.6 8.6-13.4 13.9-23.6 15.4" fill="none" stroke="#fff9c4" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />
    <path d="M41.4 14.6 43.7 7.6c.3-.9 1.3-1.3 2.1-.9l1.8.9c.8.4 1.1 1.4.6 2.2l-2.6 6.5z" fill="#6b4a1e" />
    <ellipse cx="9.4" cy="50.3" rx="2.2" ry="1.6" fill="#4a2f12" transform="rotate(-20 9.4 50.3)" />
  </svg>);
/* bandera de Turquía con las proporciones oficiales (alto G=20, largo 1,5G): media luna 0,5G / 0,4G y estrella en un círculo de 0,25G */
const TR_STAR = (() => { const cx = 16.42, cy = 10, R = 2.5, r = R * 0.382; return Array.from({ length: 10 }, (_, i) => { const a = Math.PI + (i * Math.PI) / 5, rr = i % 2 ? r : R; return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`; }).join(" "); })();
const TurkeyI = ({ className, style }: IcoP) => (
  <svg viewBox="0 0 30 20" className={className} style={{ ...style, width: typeof style?.width === "number" ? style.width * 1.3 : undefined, height: typeof style?.height === "number" ? style.height * 0.87 : undefined, color: undefined, borderRadius: 2, boxShadow: "0 1px 2px rgba(0,0,0,.5)" }}>
    <rect width="30" height="20" fill="#E30A17" /><circle cx="10" cy="10" r="5" fill="#fff" /><circle cx="11.25" cy="10" r="4" fill="#E30A17" /><polygon points={TR_STAR} fill="#fff" />
  </svg>);
const WatchI = ({ className, style }: IcoP) => <svg viewBox="0 0 64 64" className={className} style={style}><path fill="currentColor" d="M32 4 52 12v18c0 14-9 25-20 30C21 55 12 44 12 30V12z" /><path fill="#0b0f17" d="M32 9.5 47 16v14c0 11-6.6 19.8-15 24-8.4-4.2-15-13-15-24V16z" />
  <text x="32" y="38" textAnchor="middle" fontSize="15" fontWeight="900" fill="currentColor" fontFamily="sans-serif">WC</text></svg>;
const LOGROS: { k: string; t: string; d: string; tier: Tier; I: LucideIcon; ok: (n: string, r: string) => boolean; only?: string }[] = [
  { k: "reg", t: "Registrado", d: "Tiene cuenta en la terminal.", tier: "comun", I: UserCheck, ok: n => ACC.names.includes(n) },
  { k: "ofi", t: "Oficial", d: "Forma parte del LSPD.", tier: "comun", I: BadgeCheck, ok: (_n, r) => lvl(r) >= 1 },
  { k: "sgt", t: "Sargento", d: "Llegó a Sargento I.", tier: "raro", I: ChevronsUp, ok: (_n, r) => lvl(r) >= 6 },
  { k: "psb", t: "Miembro de la PSB", d: "Integra el Professional Standards Bureau.", tier: "epico", I: Scale, ok: n => isPSB(n) },
  { k: "sgt2", t: "Sargento II", d: "Llegó a Sargento II.", tier: "legend", I: Crown, ok: (_n, r) => lvl(r) >= 7 },
  { k: "fnd", t: "Fundador", d: "Creó la terminal.", tier: "mitico", I: Gem, ok: n => n === FOUNDER },
  /* únicos: solo aparecen en el perfil de su dueño */
  { k: "bomba", t: "Mister Bomba", d: "Explotó más de 3 veces.", tier: "legend", I: Bomb, ok: n => n === "Evelyn Molina", only: "Evelyn Molina" },
  { k: "banana", t: "Bananita", d: "Logro exclusivo de Aniita.", tier: "mitico", I: BananaI as unknown as LucideIcon, ok: n => n === "Evelyn Molina", only: "Evelyn Molina" },
  { k: "wc", t: "Watch Commander", d: "Fue Watch Commander durante 4 días.", tier: "legend", I: WatchI as unknown as LucideIcon, ok: n => n === "Liam Campbell", only: "Liam Campbell" },
  { k: "tr", t: "Turco", d: "Logro exclusivo de TURKO.", tier: "mitico", I: TurkeyI as unknown as LucideIcon, ok: n => n === "Liam Campbell", only: "Liam Campbell" },
];
const HEX = "[clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]";
function Medal({ tier, I, on = true, size = 56 }: { tier: Tier; I: LucideIcon; on?: boolean; size?: number }) {
  const T = TIER[tier], holo = on && tier === "mitico";
  return (
    <span className={cn("relative grid shrink-0 place-items-center", !on && "opacity-35 grayscale")} style={{ width: size, height: size }}>
      {on && tier !== "comun" && !holo && <span className="absolute inset-0 rounded-full blur-md" style={{ background: T.bg, opacity: 0.55 }} />}
      {holo && <span className="holo absolute -inset-1 rounded-full opacity-60 blur-md" />}
      {/* mítico: lámina holográfica iridiscente; el resto, metal de su color */}
      <span className={cn("absolute inset-0 overflow-hidden", HEX, holo && "holo")} style={holo ? undefined : { background: T.bg }} />
      <span className={cn("absolute inset-[3px]", HEX, holo ? "bg-white/25 dark:bg-slate-950/25" : "bg-slate-950/55")} />
      {on ? <I className="relative drop-shadow" style={{ width: size * 0.46, height: size * 0.46, color: holo ? "#3b0764" : T.c }} /> : <Lock className="relative text-slate-300" style={{ width: size * 0.34, height: size * 0.34 }} />}
    </span>);
}

/* ---------- editor del «acerca de» con formato (mismo formato que Discord) ---------- */
const FMT: [LucideIcon, string, string, string][] = [[Heading1, "Título grande", "# ", ""], [Heading2, "Título", "## ", ""], [Heading3, "Subtítulo", "### ", ""], [Bold, "Negrita", "**", "**"], [Italic, "Cursiva", "*", "*"],
  [Underline, "Subrayado", "__", "__"], [Strikethrough, "Tachado", "~~", "~~"], [Quote, "Cita", "> ", ""], [List, "Lista", "- ", ""]];
const Md = ({ s, className }: { s: string; className?: string }) => <div className={cn("break-words text-sm text-slate-600 dark:text-slate-300 [&_.text-white]:text-slate-900 dark:[&_.text-white]:text-white", className)} dangerouslySetInnerHTML={{ __html: mdHtml(s) }} />;
function BioEditor({ v, set }: { v: string; set: (s: string) => void }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const wrap = (a: string, b: string) => {
    const el = ta.current; if (!el) return; const s = el.selectionStart, e = el.selectionEnd;
    const line = !b; /* títulos, citas y listas van al principio de la línea */
    const ls = line ? v.lastIndexOf("\n", s - 1) + 1 : s;
    const nv = line ? v.slice(0, ls) + a + v.slice(ls) : v.slice(0, s) + a + v.slice(s, e) + b + v.slice(e);
    set(nv); requestAnimationFrame(() => { el.focus(); const k = s + a.length; el.setSelectionRange(k, line ? k : e + a.length); });
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">{FMT.map(([I, l, a, b]) => (
        <button key={l} type="button" title={l} onClick={() => wrap(a, b)} className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><I className="size-3.5" /></button>))}</div>
      <Textarea ref={ta} rows={6} value={v} onChange={e => set(e.target.value)} placeholder="Contá algo sobre vos… (# título, **negrita**, *cursiva*, > cita)" />
      {v.trim() && <div className="rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Vista previa</p><Md s={v} /></div>}
    </div>);
}

/* ---------- actividad policial privada: cada bloque lo ve solo quien pertenece a esa división ---------- */
type Ev = { t: number; x: string };
type PCase = { cf: string; ag: string; by: string; ts: number; upd: number; st?: string };
type PIns = { t: number; tipo: string; ins: { n: string }[]; imp: { n: string }[] };
type PEnt = { asp: string; ent: string[]; res: string; t?: number };
type SEnt = { st?: string; por?: string; t?: number };
const INS_DIV: [string, string, UnitKey | "rtd"][] = [["md", "METRO", "md"], ["udu", "UDU", "md"], ["asd", "A.S.D", "asd"], ["k9", "K-9", "k9"], ["psb", "PSB", "psb"], ["rtd", "RTD", "rtd"]];
const memOf = (k: UnitKey | "rtd", n: string) => (k === "rtd" ? rtdMem().includes(n) : !!uMap(k)[n]);
function policeAct(who: string, me: { n: string; r: string }): { l: string; v: string; ev: Ev[] }[] {
  const out: { l: string; v: string; ev: Ev[] }[] = [];
  if (isPSB(me.n)) {
    const C = LS.json<PCase[]>("lspdt.psbCases", []);
    const ev = [...C.filter(c => c.by === who).map(c => ({ t: c.upd || c.ts, x: `Lleva el expediente ${c.cf}${c.ag ? ` (${c.ag})` : ""}${c.st ? ` · ${c.st}` : ""}` })),
      ...C.filter(c => c.ag === who).map(c => ({ t: c.ts, x: `Investigado en el expediente ${c.cf}, a cargo de ${c.by}` }))];
    if (ev.length) out.push({ l: "PSB · expedientes", v: "Solo PSB", ev });
  }
  if (rtdMem().includes(me.n)) {
    const ev = LS.json<PEnt[]>("lspdt.rtdEnt", []).filter(e => e.ent?.includes(who)).map(e => ({ t: e.t || 0, x: `Entrevistó a ${e.asp || "un aspirante"}${e.res ? ` · ${e.res === "apto" ? "Apto" : e.res === "noapto" ? "No apto" : "Pendiente"}` : ""}` }));
    if (ev.length) out.push({ l: "RTD · entrevistas de ingreso", v: "Solo RTD", ev });
  }
  if (lvl(me.r) >= 6) {
    const ev = Object.entries(LS.json<Record<string, SEnt>>("lspdt.entrev", {})).filter(([, e]) => e.por === who).map(([n, e]) => ({ t: e.t || 0, x: `Entrevista de supervisión a ${n}${e.st === "si" ? " · realizada" : e.st === "no" ? " · no realizada" : ""}` }));
    if (ev.length) out.push({ l: "Supervisores · entrevistas", v: "Solo supervisores", ev });
  }
  for (const [div, ab, k] of INS_DIV) {
    if (!memOf(k, me.n)) continue;
    const L = LS.json<PIns[]>(`lspdt.instr.${div}`, []);
    const ev = [...L.filter(i => i.ins?.some(x => x.n === who)).map(i => ({ t: i.t, x: `Impartió «${i.tipo}»` })), ...L.filter(i => i.imp?.some(x => x.n === who)).map(i => ({ t: i.t, x: `Asistió a «${i.tipo}»` }))];
    if (ev.length) out.push({ l: `${ab} · instrucciones`, v: `Solo ${ab}`, ev });
  }
  return out.map(g => ({ ...g, ev: g.ev.sort((a, b) => b.t - a.t).slice(0, 15) }));
}

const Timeline = ({ ev }: { ev: (Ev & { by?: string })[] }) => (
  <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-slate-800">{ev.map((a, i) => (
    <li key={i}><span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white bg-brand-500 dark:border-slate-900" /><p className="text-sm">{a.x}</p><p className="text-xs text-slate-400">{a.t ? ago(a.t) : "sin fecha"}{a.by ? ` · por ${a.by}` : ""}</p></li>))}</ol>);
const Empty = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-sm text-slate-400">{children}</p>;

export function Perfil() {
  useStoreVersion(); useTick();
  const me = useMe(), { toast, confirm } = useFeedback();
  const [who, setWho] = useState(() => takePreset<{ n: string }>()?.n || me.n), own = who === me.n, ag = findAgent(who), r = ag?.r || "";
  const P = LS.json<UProf>(K.prof(who), {}), ban = LS.get(K.ban(who)) || "", coms = LS.json<UCom[]>(K.com(who), []), vis = LS.json<UVis>(K.vis(who), { c: 0, l: [] }), fol = LS.json<string[]>(K.fol(who), []);
  const prof = profFull(who), cond = ((prof.cond || []) as unknown as Award[]).slice().sort((a, b) => (b.f || "").localeCompare(a.f || ""));
  const [tab, setTab] = useState<"act" | "log" | "com" | "pj">("com"), [ed, setEd] = useState(false), [bio, setBio] = useState(P.bio || ""), [txt, setTxt] = useState(""), fBan = useRef<HTMLInputElement>(null), fPic = useRef<HTMLInputElement>(null);
  const [nk, setNk] = useState<string | null>(null), nick = nickOf(who), N = nickOf; /* N: nick de cualquiera */
  useEffect(() => { setBio(P.bio || ""); setEd(false); setNk(null); setTab("com"); }, [who]); // eslint-disable-line react-hooks/exhaustive-deps
  /* visita: una por sesión y por perfil (no cuenta la propia) */
  useEffect(() => { if (own) return; const sk = "lspdt.next.vis." + slugOf(who); try { if (sessionStorage.getItem(sk)) return; sessionStorage.setItem(sk, "1"); } catch { /* */ }
    const v = LS.json<UVis>(K.vis(who), { c: 0, l: [] }); LS.setJSON(K.vis(who), { c: v.c + 1, l: [{ n: me.n, t: Date.now() }, ...v.l.filter(x => x.n !== me.n)].slice(0, 12) }); }, [who, own, me.n]);
  const saveP = (p: Partial<UProf>) => LS.setJSON(K.prof(who), { ...LS.json<UProf>(K.prof(who), {}), ...p });
  const post = () => { const x = txt.trim(); if (!x) return; LS.setJSON(K.com(who), [...LS.json<UCom[]>(K.com(who), []), { id: uid(), by: me.n, t: Date.now(), x: x.slice(0, 1500) }].slice(-200)); setTxt(""); toast(own ? "Publicado" : `Comentario enviado a ${nickOf(who)}`); };
  const following = fol.includes(me.n), idx = ACC.names.indexOf(who), id = idx >= 0 ? idx + 1 : 0;
  /* red social: a quién sigue cada uno y sugerencias para mí (como en Instagram) */
  const [md, setMd] = useState<"" | "fol" | "sig" | "sug">("");
  const folOf = (n: string) => LS.json<string[]>(K.fol(n), []), sigOf = (n: string) => ACC.names.filter(x => x !== n && folOf(x).includes(n));
  const sig = sigOf(who), mySig = new Set(sigOf(me.n));
  const toggleFol = (n: string) => { const f = folOf(n), on = f.includes(me.n); LS.setJSON(K.fol(n), on ? f.filter(x => x !== me.n) : [...f, me.n]); if (!on) toast(`Ahora seguís a ${nickOf(n)}`); };
  const sugs = (() => {
    const myDiv = new Set((profFull(me.n).div || []) as string[]), meFol = folOf(me.n);
    return ACC.names.filter(n => n !== me.n && !mySig.has(n)).map(n => {
      const dv = ((profFull(n).div || []) as string[]).filter(d => myDiv.has(d)), mut = [...mySig].filter(x => folOf(n).includes(x));
      const why = meFol.includes(n) ? "Te sigue" : mut.length ? `Lo sigue ${nickOf(mut[0])}${mut.length > 1 ? ` y ${mut.length - 1} más` : ""}` : dv.length ? `También en ${dv[0]}` : "Sugerencia para ti";
      return { n, why, sc: (meFol.includes(n) ? 6 : 0) + mut.length * 3 + dv.length * 2 + Math.min(3, folOf(n).length / 3) };
    }).sort((a, b) => b.sc - a.sc || a.n.localeCompare(b.n, "es"));
  })();
  const Person = ({ n, why }: { n: string; why?: string }) => { const on = mySig.has(n); return (
    <div className="flex items-center gap-3">
      <button onClick={() => { setWho(n); setMd(""); }} className="flex min-w-0 flex-1 items-center gap-3 text-left"><PAvatar n={n} size={44} />
        <span className="min-w-0"><b className="block truncate text-sm">{nickOf(n)}</b><small className="block truncate text-xs text-slate-500">{why || (nickOf(n) !== n ? n : "")}</small></span></button>
      {n !== me.n && <Button size="sm" variant={on ? "outline" : "primary"} onClick={() => toggleFol(n)}>{on ? "Siguiendo" : "Seguir"}</Button>}
    </div>); };
  const logros = LOGROS.filter(l => !l.only || l.only === who).map(l => ({ ...l, on: l.ok(who, r) })), got = logros.filter(l => l.on);
  const best = got.slice().reverse().slice(0, 3);
  /* actividad general (OOC) y la policial privada */
  const act: (Ev & { by?: string })[] = [...(P.since ? [{ t: P.since, x: "Se registró en la terminal" }] : []),
    ...coms.filter(c => c.by === who).map(c => ({ t: c.t, x: `Escribió en su perfil: «${c.x.slice(0, 80)}${c.x.length > 80 ? "…" : ""}»` }))].sort((a, b) => b.t - a.t).slice(0, 20);
  const pol = policeAct(who, me);
  const TABS: ["act" | "log" | "com" | "pj", string, LucideIcon, number | string][] = [["act", "Actividad", Activity, act.length + pol.reduce((s, g) => s + g.ev.length, 0)], ["log", "Logros", Trophy, `${got.length}/${logros.length}`], ["com", "Comentarios", MessageSquare, coms.length], ["pj", "Personaje", IdCard, ""]];
  const people = (L: string[]) => <div className="grid grid-cols-5 gap-2">{L.slice(0, 15).map(n => <button key={n} title={N(n)} onClick={() => setWho(n)} className="justify-self-center"><PAvatar n={n} size={36} /></button>)}</div>;
  const stats: [string, string][] = [["Comentarios", String(coms.length)], ["Ingreso", dmy(P.since)], ["Última visita", P.seen ? ago(P.seen) : "—"]];
  return (
    <div className="space-y-4">
      {/* portada */}
      <Card className="overflow-hidden p-0">
        <div className="relative h-40 sm:h-48" style={{ background: ban ? undefined : `linear-gradient(135deg, ${P.col || COLS[0]}, ${P.col || COLS[0]}99)` }}>
          {ban && <img src={ban} alt="" className="absolute inset-0 size-full object-cover" />}
          {own && <div className="absolute right-3 top-3 flex gap-1.5">
            {COLS.map(c => <button key={c} aria-label="Color de portada" onClick={() => { saveP({ col: c }); if (ban) LS.del(K.ban(who)); }} className="size-5 rounded-full ring-2 ring-white/60" style={{ background: c }} />)}
            <button onClick={() => fBan.current?.click()} className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/70"><Camera className="size-3.5" />Portada</button></div>}
          <input ref={fBan} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; LS.set(K.ban(who), await readImg(f, 1400)); toast("Portada actualizada"); }} />
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 px-5 pb-4">
          <div className="group relative -mt-12 rounded-full ring-4 ring-white dark:ring-slate-900"><PAvatar n={who} size={104} />
            {own && <>
              <button aria-label="Cambiar foto del perfil" title="Foto del perfil (no cambia la del agente)" onClick={() => fPic.current?.click()} className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"><Camera className="size-6" /></button>
              {LS.get(K.pic(who)) && <button aria-label="Quitar foto del perfil" title="Volver a la foto del agente" onClick={() => { LS.del(K.pic(who)); toast("Foto del perfil quitada"); }} className="absolute -right-1 bottom-1 grid size-7 place-items-center rounded-full bg-slate-900 text-white ring-2 ring-white hover:bg-red-600 dark:ring-slate-900"><Trash2 className="size-3.5" /></button>}
              <input ref={fPic} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; LS.set(K.pic(who), await readImg(f, 400)); toast("Foto del perfil actualizada"); }} />
            </>}</div>
          <div className="min-w-0 flex-1 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {nk !== null ? <form className="flex items-center gap-1.5" onSubmit={e => { e.preventDefault(); saveP({ nick: nk.trim().slice(0, 24) }); setNk(null); toast("Nickname guardado"); }}>
                <input autoFocus value={nk} onChange={e => setNk(e.target.value)} maxLength={24} placeholder={who} className="w-48 rounded-lg border border-slate-300 bg-transparent px-2 py-1 text-xl font-bold outline-none focus:border-brand-500 dark:border-slate-700" />
                <button type="submit" aria-label="Guardar" className="text-emerald-500"><Check className="size-4" /></button><button type="button" aria-label="Cancelar" onClick={() => setNk(null)} className="text-slate-400"><X className="size-4" /></button></form>
                : <h1 className="truncate text-2xl font-bold">{nick}</h1>}
              {own && nk === null && <button aria-label="Cambiar nickname" title="Cambiar nickname OOC" onClick={() => setNk(P.nick ?? nick)} className="text-slate-400 hover:text-brand-500"><Pencil className="size-3.5" /></button>}
              {id > 0 && <span title="ID de cuenta (orden de registro)" className={cn("rounded-md px-1.5 py-0.5 font-mono text-xs font-bold", id === 1 ? "bg-gradient-to-r from-rose-500 via-amber-400 to-fuchsia-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>#{id}</span>}
              {best.map(l => <span key={l.k} title={`${l.t} · ${TIER[l.tier].l}`}><Medal tier={l.tier} I={l.I} size={24} /></span>)}
            </div>
            {nick !== who && <p className="text-xs text-slate-500">Personaje: <button onClick={() => setTab("pj")} className="font-semibold hover:underline">{who}</button></p>}
            {/* contadores en un solo renglón */}
            <div className="mt-1.5 flex items-center gap-x-4 overflow-x-auto whitespace-nowrap text-sm">{stats.map(([l, v], i) => (
              <span key={l} className="flex items-baseline gap-1.5">{i > 0 && <span className="mr-2.5 text-slate-300 dark:text-slate-700">|</span>}<span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</span><b className="font-semibold">{v}</b></span>))}</div>
          </div>
          <div className="flex gap-2">
            {!own && <Button size="sm" variant={following ? "outline" : "primary"} icon={following ? <UserCheck /> : <UserPlus />} onClick={() => { LS.setJSON(K.fol(who), following ? fol.filter(x => x !== me.n) : [...fol, me.n]); }}>{following ? "Siguiendo" : "Seguir"}</Button>}
            {!own && <Button size="sm" variant="outline" onClick={() => setWho(me.n)}>Ir a mi perfil</Button>}
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* columna lateral */}
        <div className="space-y-4">
          <Card className="p-4"><div className="mb-3 flex items-center gap-3 text-sm"><Users className="size-4 text-slate-400" />
            <button onClick={() => setMd("fol")} className="hover:underline"><b>{fol.length}</b> {fol.length === 1 ? "seguidor" : "seguidores"}</button>
            <button onClick={() => setMd("sig")} className="hover:underline"><b>{sig.length}</b> seguidos</button></div>
            {fol.length ? people(fol) : <p className="text-xs text-slate-400">Todavía nadie.</p>}</Card>
          <Card className="p-4"><div className="mb-2 flex items-center"><p className="flex-1 text-sm font-semibold">Acerca de {own ? "mí" : nick}</p>
            {own && !ed && <button aria-label="Editar" onClick={() => setEd(true)} className="text-slate-400 hover:text-brand-500"><Pencil className="size-3.5" /></button>}</div>
            {ed ? <div className="space-y-2"><BioEditor v={bio} set={setBio} />
              <div className="flex justify-end gap-1.5"><Button size="sm" variant="ghost" icon={<X />} onClick={() => { setBio(P.bio || ""); setEd(false); }}>Cancelar</Button><Button size="sm" icon={<Save />} onClick={() => { saveP({ bio: bio.trim().slice(0, 2000) }); setEd(false); toast("Guardado"); }}>Guardar</Button></div></div>
              : P.bio ? <Md s={P.bio} /> : <p className="text-sm text-slate-400">{own ? "Escribí algo sobre vos." : "Sin información."}</p>}</Card>
          <Card className="p-4"><p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Eye className="size-4 text-slate-400" />Visitantes recientes</p>
            <p className="mb-2 text-xs text-slate-400">{vis.c.toLocaleString("es-AR")} visitas al perfil</p>
            {vis.l.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{vis.l.slice(0, 6).map(v => (
              <button key={v.n} onClick={() => setWho(v.n)} className="flex w-full items-center gap-2.5 py-2 text-left"><PAvatar n={v.n} size={28} /><span className="min-w-0"><b className="block truncate text-sm">{N(v.n)}</b><small className="text-xs text-slate-400">{ago(v.t)}</small></span></button>))}</div>
              : <p className="text-xs text-slate-400">Sin visitas todavía.</p>}</Card>
        </div>

        {/* pestañas */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-4 border-b border-slate-100 dark:border-slate-800">{TABS.map(([k, l, I, n]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("relative flex items-center justify-center gap-2 py-3 text-sm font-semibold transition", tab === k ? "text-brand-600 dark:text-brand-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-white")}>
              <I className="size-4" /><span className="hidden sm:inline">{l}</span>{n !== "" && <span className="rounded-md bg-slate-100 px-1.5 text-[11px] tabular-nums dark:bg-slate-800">{n}</span>}
              {tab === k && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-brand-500" />}</button>))}</div>
          <div className="p-5">
            {tab === "com" && <div className="space-y-4">
              <div className="flex gap-3"><PAvatar n={me.n} size={36} /><div className="flex-1 space-y-2"><Textarea rows={2} value={txt} onChange={e => setTxt(e.target.value)} placeholder={own ? "Escribí algo en tu perfil…" : `Dejale un comentario a ${nick}…`}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) post(); }} />
                <div className="flex justify-end"><Button size="sm" icon={<Send />} disabled={!txt.trim()} onClick={post}>Publicar</Button></div></div></div>
              {!coms.length ? <Empty>Sin comentarios todavía.</Empty> : <div className="space-y-3">{coms.slice().reverse().map(c => (
                <div key={c.id} className="flex gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button onClick={() => setWho(c.by)}><PAvatar n={c.by} size={36} /></button>
                  <div className="min-w-0 flex-1"><p className="text-sm"><button onClick={() => setWho(c.by)} className="font-semibold hover:underline">{N(c.by)}</button> <span className="text-xs text-slate-400">· {ago(c.t)}</span></p>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{c.x}</p></div>
                  {(c.by === me.n || own) && <button aria-label="Borrar comentario" onClick={async () => { if (await confirm("¿Borrar este comentario?", { danger: true })) LS.setJSON(K.com(who), LS.json<UCom[]>(K.com(who), []).filter(x => x.id !== c.id)); }} className="self-start text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button>}
                </div>))}</div>}
            </div>}

            {tab === "log" && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{logros.map(l => (
              <div key={l.k} className={cn("flex items-center gap-3 rounded-xl border p-3", l.on && l.tier === "mitico" ? "holo-card border-2" : l.on ? "border-slate-200 dark:border-slate-700" : "border-dashed border-slate-200 dark:border-slate-800")} style={l.on && l.tier !== "mitico" ? { boxShadow: `inset 3px 0 0 ${TIER[l.tier].c}` } : undefined}>
                <Medal tier={l.tier} I={l.I} on={l.on} />
                <div className="min-w-0"><b className={cn("block text-sm", !l.on && "text-slate-400")}>{l.t}</b>
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", l.on && l.tier === "mitico" && "holo-text")} style={l.on && l.tier === "mitico" ? undefined : { color: TIER[l.tier].c }}>{TIER[l.tier].l}</span>
                  <p className="text-xs text-slate-500">{l.on ? l.d : "Bloqueado"}</p></div>
              </div>))}</div>}

            {tab === "act" && <div className="space-y-5">
              {act.length ? <Timeline ev={act} /> : <Empty>Sin actividad registrada.</Empty>}
              {pol.map(g => (
                <div key={g.l} className="rounded-xl border border-amber-500/25 bg-amber-500/[.04] p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">{g.l}<span className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300"><Lock className="size-3" />{g.v}</span></p>
                  <Timeline ev={g.ev} /></div>))}
              <p className="text-center text-[11px] text-slate-400">La actividad de cada división solo la ven sus miembros.</p>
            </div>}

            {tab === "pj" && <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">{r && <RankBadge r={r} />}{ag?.p && <span className="font-mono text-sm">Placa #{ag.p}</span>}{prof.cs && <span className="font-mono text-sm text-red-500">{prof.cs}</span>}
                {!ag && <span className="text-sm text-slate-400">No figura en el roster.</span>}</div>
              {(prof.div || []).length > 0 && <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Divisiones</p>
                <div className="flex flex-wrap gap-1.5">{(prof.div as string[]).map(d => <span key={d} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800">{d}</span>)}</div></div>}
              <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Condecoraciones</p>
                {!cond.length ? <p className="text-sm text-slate-400">Sin condecoraciones todavía.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{cond.map(c => { const d = decorOf(c.k); return (
                  <div key={c.id} className="flex gap-4 py-3"><span className="w-24 shrink-0 pt-1">{d && <Ribbon d={d} />}</span>
                    <div className="min-w-0"><b className="block">{c.t}</b><p className="text-xs text-slate-500">Otorgada {c.f ? fmtDate(new Date(c.f).getTime()).split(",")[0] : ""}{c.by ? `, por ${c.by}` : ""}</p>{c.m && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.m}</p>}</div></div>); })}</div>}</div>
              {(prof.movs || []).length > 0 && <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Carrera</p>
                <Timeline ev={(prof.movs || []).map(m => ({ t: m.t, x: `${m.tipo}${m.de ? ` · ${m.de}` : ""}${m.a ? ` → ${m.a}` : ""}`, by: m.por?.n })).sort((a, b) => b.t - a.t)} /></div>}
            </div>}
          </div>
        </Card>
      </div>
      {sugs.length > 0 && <Card className="p-4">
        <div className="mb-3 flex items-center"><b className="flex-1 text-sm">Sugerencias para ti</b><button onClick={() => setMd("sug")} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Ver todo</button></div>
        <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">{sugs.filter(x => x.n !== who).slice(0, 10).map(({ n, why }) => (
          <div key={n} className="flex w-40 shrink-0 flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center dark:border-slate-800">
            <button onClick={() => setWho(n)} className="flex flex-col items-center gap-1.5"><PAvatar n={n} size={64} /><b className="w-full truncate text-sm">{nickOf(n)}</b></button>
            <small className="line-clamp-2 min-h-[2rem] text-[11px] leading-tight text-slate-500">{why}</small>
            <Button size="sm" className="w-full justify-center" onClick={() => toggleFol(n)}>Seguir</Button>
          </div>))}</div>
      </Card>}
      <Modal open={!!md} onClose={() => setMd("")} size="sm" icon={<Users />}
        title={md === "fol" ? `Seguidores de ${nick}` : md === "sig" ? `${nick} sigue a` : "Sugerencias para ti"} desc={md === "sug" ? "Perfiles que quizás conozcas" : undefined}>
        {(() => { const L = md === "fol" ? fol.map(n => ({ n, why: "" })) : md === "sig" ? sig.map(n => ({ n, why: "" })) : sugs;
          return L.length ? <div className="space-y-3">{L.map(x => <Person key={x.n} n={x.n} why={x.why} />)}</div> : <p className="py-6 text-center text-sm text-slate-400">{md === "fol" ? "Todavía no lo sigue nadie." : md === "sig" ? "Todavía no sigue a nadie." : "No hay sugerencias por ahora."}</p>; })()}
      </Modal>
      {!own && <p className="text-center text-xs text-slate-400">Estás viendo el perfil de {nick}{r ? ` · ${rankES(r)}` : ""}</p>}
    </div>
  );
}
