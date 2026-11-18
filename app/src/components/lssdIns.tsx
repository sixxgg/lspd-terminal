/* Insignia de un rango del LSSD o la SAHP en un recuadro verde (roster del departamento, registro). El dibujo sale de lib/xins.ts. */
import { cn } from "@/lib/cn";
import { xInsSvg, xWide } from "@/lib/xins";

export function LssdIns({ r, className, title }: { r: string; className?: string; title?: string }) {
  return (
    <span title={title || r} style={xWide(r) ? { width: "auto", aspectRatio: "16 / 10" } : undefined} className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#1f3b2a] to-[#0f1f16] ring-1 ring-amber-500/30", className || "size-9")}>
      <img src={xInsSvg(r)} alt="" className="size-full" />
    </span>);
}
