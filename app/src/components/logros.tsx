/* logros del perfil: rarezas, íconos (incluidos los únicos de algunos perfiles) y la medalla hexagonal; los míticos son holográficos */
import { Heart, Lock, PartyPopper, Star, BadgeCheck, Bomb, ChevronsUp, Crown, Scale, UserCheck, type LucideIcon } from "lucide-react";
import { ACC, LS } from "@/lib/store";
import { emailOf, lvl } from "@/lib/domain";
import { isPSB } from "@/lib/units";
import { cn } from "@/lib/cn";

const FOUNDER = "Ryan Westbrook";
const folOf = (n: string) => LS.json<string[]>(`lspdt.ufol.${emailOf(n).split("@")[0]}`, []);
/* ---------- logros ---------- */
export const TIER = {
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
/* dos huevos con brillo */
const EggsI = ({ className, style }: IcoP) => (
  <svg viewBox="0 0 64 64" className={className} style={{ ...style, width: typeof style?.width === "number" ? style.width * 1.25 : undefined, height: typeof style?.height === "number" ? style.height * 1.25 : undefined, color: undefined, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.5))" }}>
    <defs><radialGradient id="egg-g" cx=".38" cy=".3" r=".8"><stop offset="0" stopColor="#fffdf7" /><stop offset=".6" stopColor="#f6ead2" /><stop offset="1" stopColor="#d9c39b" /></radialGradient></defs>
    <ellipse cx="23" cy="36" rx="13" ry="17" fill="url(#egg-g)" stroke="#b49a6c" strokeWidth="1.2" transform="rotate(-12 23 36)" />
    <ellipse cx="42" cy="38" rx="12.5" ry="16" fill="url(#egg-g)" stroke="#b49a6c" strokeWidth="1.2" transform="rotate(14 42 38)" />
    <ellipse cx="18.5" cy="27" rx="3" ry="5" fill="#fff" opacity=".85" transform="rotate(-20 18.5 27)" /><ellipse cx="38" cy="29.5" rx="2.8" ry="4.6" fill="#fff" opacity=".85" transform="rotate(5 38 29.5)" />
  </svg>);
/* bandera de Corea del Sur: taegeuk rojo/azul y los cuatro trigramas */
const KR_TRI = (cx: number, cy: number, rot: number, bars: boolean[][]) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>{bars.map((b, i) => b[0] && b[1] ? <rect key={i} x={-3} y={-2.6 + i * 2} width={6} height={1.2} fill="#000" />
    : <g key={i}><rect x={-3} y={-2.6 + i * 2} width={2.6} height={1.2} fill="#000" /><rect x={0.4} y={-2.6 + i * 2} width={2.6} height={1.2} fill="#000" /></g>)}</g>);
const KoreaI = ({ className, style }: IcoP) => (
  <svg viewBox="0 0 36 24" className={className} style={{ ...style, width: typeof style?.width === "number" ? style.width * 1.3 : undefined, height: typeof style?.height === "number" ? style.height * 0.87 : undefined, color: undefined, borderRadius: 2, boxShadow: "0 1px 2px rgba(0,0,0,.5)" }}>
    <rect width="36" height="24" fill="#fff" />
    <g transform="rotate(33.69 18 12)"><circle cx="18" cy="12" r="6" fill="#0047A0" /><path d="M12 12a6 6 0 0 1 12 0z" fill="#CD2E3A" /><circle cx="15" cy="12" r="3" fill="#CD2E3A" /><circle cx="21" cy="12" r="3" fill="#0047A0" /></g>
    {KR_TRI(8, 6, -56.31, [[true, true], [true, true], [true, true]])}{KR_TRI(28, 18, -56.31, [[false, false], [false, false], [false, false]])}
    {KR_TRI(28, 6, 56.31, [[false, false], [true, true], [false, false]])}{KR_TRI(8, 18, 56.31, [[true, true], [false, false], [true, true]])}
  </svg>);
const WatchI = ({ className, style }: IcoP) => <svg viewBox="0 0 64 64" className={className} style={style}><path fill="currentColor" d="M32 4 52 12v18c0 14-9 25-20 30C21 55 12 44 12 30V12z" /><path fill="#0b0f17" d="M32 9.5 47 16v14c0 11-6.6 19.8-15 24-8.4-4.2-15-13-15-24V16z" />
  <text x="32" y="38" textAnchor="middle" fontSize="15" fontWeight="900" fill="currentColor" fontFamily="sans-serif">WC</text></svg>;
export const LOGROS: { k: string; t: string; d: string; tier: Tier; I: LucideIcon; ok: (n: string, r: string) => boolean; only?: string }[] = [
  { k: "reg", t: "Registrado", d: "Tiene cuenta en la terminal.", tier: "comun", I: UserCheck, ok: n => ACC.names.includes(n) },
  { k: "ofi", t: "Oficial", d: "Forma parte del LSPD.", tier: "comun", I: BadgeCheck, ok: (_n, r) => lvl(r) >= 1 },
  { k: "sgt", t: "Sargento", d: "Llegó a Sargento I.", tier: "raro", I: ChevronsUp, ok: (_n, r) => lvl(r) >= 6 },
  { k: "psb", t: "Miembro de la PSB", d: "Integra el Professional Standards Bureau.", tier: "epico", I: Scale, ok: n => isPSB(n) },
  { k: "sgt2", t: "Sargento II", d: "Llegó a Sargento II.", tier: "legend", I: Star, ok: (_n, r) => lvl(r) >= 7 },
  { k: "fnd", t: "Fundador", d: "Creó la terminal.", tier: "mitico", I: Crown, ok: n => n === FOUNDER },
  { k: "fol1", t: "Te han seguido", d: "Alguien te siguió por primera vez.", tier: "raro", I: PartyPopper, ok: n => folOf(n).length > 0 },
  { k: "sig1", t: "Has seguido a alguien", d: "Seguiste a otro perfil.", tier: "comun", I: Heart, ok: n => ACC.names.some(x => x !== n && folOf(x).includes(n)) },
  /* únicos: solo aparecen en el perfil de su dueño */
  { k: "bomba", t: "Mister Bomba", d: "Explotó más de 3 veces.", tier: "legend", I: Bomb, ok: n => n === "Evelyn Molina", only: "Evelyn Molina" },
  { k: "banana", t: "Bananita", d: "Logro exclusivo de Aniita.", tier: "mitico", I: BananaI as unknown as LucideIcon, ok: n => n === "Evelyn Molina", only: "Evelyn Molina" },
  { k: "wc", t: "Watch Commander", d: "Fue Watch Commander durante 4 días.", tier: "legend", I: WatchI as unknown as LucideIcon, ok: n => n === "Liam Campbell", only: "Liam Campbell" },
  { k: "huevos", t: "Sargento por romper los huevos", d: "Lo ascendieron a Sargento por insistente.", tier: "legend", I: EggsI as unknown as LucideIcon, ok: n => n === "Kai Jeon-Soo", only: "Kai Jeon-Soo" },
  { k: "kr", t: "Coreano", d: "Primera vez que rolea de coreano pasivo.", tier: "mitico", I: KoreaI as unknown as LucideIcon, ok: n => n === "Kai Jeon-Soo", only: "Kai Jeon-Soo" },
  { k: "tr", t: "Turco", d: "Logro exclusivo de TURKO.", tier: "mitico", I: TurkeyI as unknown as LucideIcon, ok: n => n === "Liam Campbell", only: "Liam Campbell" },
];
const HEX = "[clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]";
export function Medal({ tier, I, on = true, size = 56 }: { tier: Tier; I: LucideIcon; on?: boolean; size?: number }) {
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


/* sello de logros: guarda cuándo consiguió cada uno (lspdt.uprof.<slug>.lg en el perfil). La primera vez se sellan sin fecha
   (no avisa lo viejo); después, cada logro nuevo queda con la hora y, si es raro o mejor, tira confeti. */
const TIER_N: Record<Tier, number> = { comun: 0, raro: 1, epico: 2, legend: 3, mitico: 4 };
export const goodTier = (t: Tier) => TIER_N[t] >= 1;
export function stampLogros(n: string, r: string, onNew: (l: (typeof LOGROS)[number]) => void) {
  const k = `lspdt.uprof.${emailOf(n).split("@")[0]}`, P = LS.json<{ lg?: Record<string, number> }>(k, {}), first = !P.lg, lg = { ...(P.lg || {}) };
  let ch = false;
  for (const l of LOGROS) if ((!l.only || l.only === n) && !(l.k in lg) && l.ok(n, r)) { lg[l.k] = first ? 0 : Date.now(); ch = true; if (!first) onNew(l); }
  if (ch) LS.setJSON(k, { ...LS.json<object>(k, {}), lg });
}
