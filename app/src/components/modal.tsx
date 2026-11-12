import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Modal({ open, onClose, title, desc, icon, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: ReactNode; desc?: ReactNode; icon?: ReactNode; children: ReactNode; footer?: ReactNode; size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k);
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fx-modal-bg fixed inset-0 z-[65] grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm animate-fade-in sm:p-6" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={cn("fx-modal flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900",
        { xs: "max-w-[23rem]", sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size])}>
        <div className={cn("fx-modal-h flex items-start gap-3 border-b border-slate-100 dark:border-slate-800", size === "xs" ? "px-4 py-3" : "px-5 py-4")}>
          {icon && <div className="fx-modal-i grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300 [&_svg]:size-[18px]">{icon}</div>}
          <div className="min-w-0 flex-1"><h3 className="font-semibold">{title}</h3>{desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}</div>
          <button aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-slate-800 dark:hover:text-white"><X className="size-4" /></button>
        </div>
        <div className={cn("scrollbar-thin flex-1 overflow-y-auto", size === "xs" ? "space-y-3 p-4" : "space-y-4 p-5")}>{children}</div>
        {footer && <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900", size === "xs" ? "px-4 py-2.5" : "px-5 py-3")}>{footer}</div>}
      </div>
    </div>, document.body);
}

/* visor de imágenes */
export function Lightbox({ list, i, cap, onClose, onNav }: { list: string[]; i: number; cap?: string; onClose: () => void; onNav: (i: number) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowLeft") onNav((i - 1 + list.length) % list.length); else if (e.key === "ArrowRight") onNav((i + 1) % list.length); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [i, list.length, onClose, onNav]);
  const nb = "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 animate-fade-in" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <img loading="lazy" decoding="async" src={list[i]} alt="" className="max-h-[85dvh] max-w-full rounded-xl shadow-2xl" />
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{cap ? cap + " · " : ""}{i + 1} de {list.length}</p>
      <button aria-label="Cerrar" onClick={onClose} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-5" /></button>
      {list.length > 1 && <><button aria-label="Anterior" className={cn(nb, "left-4")} onClick={() => onNav((i - 1 + list.length) % list.length)}><ChevronLeft /></button>
        <button aria-label="Siguiente" className={cn(nb, "right-4")} onClick={() => onNav((i + 1) % list.length)}><ChevronRight /></button></>}
    </div>, document.body);
}
