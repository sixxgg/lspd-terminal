/* Distintivos de METRO/SWAT según el callsign: R01D–R09D mando, D que termina en 0 = Team Leader del Pelotón D,
   D que termina en 5 = Instructor SWAT, C que termina en 0 = Líder de Pelotón C. Se muestran en Callsign, roster y examen. */
import { csNums } from "@/lib/mdcalls";
import { cn } from "@/lib/cn";

const BADGE = { mando: ["Mando", "#a78bfa"], tld: ["TL Pelotón D", "#f5a524"], ins: ["Instructor SWAT", "#22c55e"], lpc: ["Líder Pelotón C", "#38bdf8"] } as const;
function csBadges(s: string): (keyof typeof BADGE)[] {
  const out: (keyof typeof BADGE)[] = [];
  for (const n of csNums(s, "D")) out.push(n < 10 ? "mando" : n % 10 === 0 ? "tld" : n % 10 === 5 ? "ins" : (null as never));
  for (const n of csNums(s, "C")) if (n % 10 === 0) out.push("lpc");
  return [...new Set(out.filter(Boolean))];
}
export function CsBadges({ s, className }: { s: string; className?: string }) {
  const L = csBadges(s); if (!L.length) return null;
  return <>{L.map(k => { const [l, c] = BADGE[k]; return <span key={k} title={l} className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none", className)} style={{ background: c + "22", color: c, boxShadow: `inset 0 0 0 1px ${c}55` }}>{l}</span>; })}</>;
}
