import { cn } from "@/lib/cn";
import { ARMAS, armDe, type TMis } from "./tabletData";

/* Armamento de los enemigos de una misión, señalizado: el arma más fuerte es la OBLIGATORIA (siempre la llevan); las demás son con las que también pueden ir.
   Colores: gris sin armas · amarillo cuerpo a cuerpo · naranja pistolas · rojo armas grandes · violeta explosivos. */
export function ArmasMis({ L, sm }: { L: TMis[]; sm?: boolean }) {
  const A = armDe(L); if (!A) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1" title="Armamento de los enemigos de la misión">
      {A.all.map(a => { const X = ARMAS[a], main = a === A.top && a !== "sin"; return (
        <span key={a} title={main ? `${X.l}: arma obligatoria (la más fuerte que llevan)` : `${X.l}: también pueden llevarla`}
          className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold uppercase", sm ? "text-[9.5px]" : "text-[10px]", !main && a !== "sin" && "opacity-75")}
          style={{ borderColor: X.c + (main ? "aa" : "55"), background: X.c + (main ? "26" : "12"), color: X.c }}>
          {X.l}{main && <b className="text-[8.5px] tracking-wider">· OBLIG.</b>}</span>); })}
      {A.top !== "sin" && <span className="text-[10px] text-slate-500">· {A.npc} enemigo{A.npc === "1" ? "" : "s"} armado{A.npc === "1" ? "" : "s"}</span>}
    </span>);
}
