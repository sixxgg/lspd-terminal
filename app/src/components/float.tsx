/* Lista flotante (buscadores, sugerencias): va en una capa propia encima de todo —modales, tarjetas con scroll, menús—
   pegada al campo que la abre; si abajo no entra, se abre hacia arriba. Se reacomoda al hacer scroll o cambiar el tamaño. */
import { forwardRef, useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export const FloatBox = forwardRef<HTMLDivElement, { anchor: RefObject<HTMLElement | null>; children: ReactNode; className?: string; maxH?: number; role?: string }>(
  function FloatBox({ anchor, children, className, maxH = 288, role }, ref) {
    const [pos, setPos] = useState<{ l: number; w: number; t?: number; b?: number; mh: number } | null>(null);
    useLayoutEffect(() => {
      const place = () => { const r = anchor.current?.getBoundingClientRect(); if (!r) return;
        const below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 200 && above > below;
        setPos({ l: r.left, w: r.width, ...(up ? { b: innerHeight - r.top + 4 } : { t: r.bottom + 4 }), mh: Math.max(120, Math.min(maxH, up ? above : below)) }); };
      place(); addEventListener("scroll", place, true); addEventListener("resize", place);
      return () => { removeEventListener("scroll", place, true); removeEventListener("resize", place); };
    }, [anchor, maxH]);
    if (!pos) return null;
    return createPortal(
      <div ref={ref} role={role} style={{ position: "fixed", left: pos.l, width: pos.w, top: pos.t, bottom: pos.b, maxHeight: pos.mh }}
        className={cn("scrollbar-thin z-[300] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900", className)}>{children}</div>, document.body);
  });
