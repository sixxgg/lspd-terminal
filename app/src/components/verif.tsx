/* insignia de verificado estilo X (roseta con tilde); el color dice el tipo */
import { VERIF, verifOf } from "@/lib/nick";
import { cn } from "@/lib/cn";

export function Verif({ n, size = 18, className }: { n: string; size?: number; className?: string }) {
  const v = verifOf(n); if (!v) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={VERIF[v].l} className={cn("inline-block shrink-0 align-[-0.15em]", className)}>
      <title>{VERIF[v].l}</title>
      <path fill={VERIF[v].c} d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m8.6 12.2 2.3 2.3 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);
}
