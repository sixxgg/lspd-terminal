/* cierra un menú o desplegable al tocar fuera de él */
import { useEffect, type RefObject } from "react";
export function useOutside(ref: RefObject<HTMLElement | null>, on: boolean, close: () => void) {
  useEffect(() => { if (!on) return; const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
}
