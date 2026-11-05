import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
/* formulario a la izquierda, salida a la derecha (en celular, una debajo de la otra) */
export const Split = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]", className)}>{children}</div>
);
export const Col = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("min-w-0 space-y-5", className)}>{children}</div>;
export const Note = ({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) => (
  <div className={cn("rounded-xl border px-3 py-2 text-xs leading-relaxed", tone === "warn"
    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300")}>{children}</div>
);
