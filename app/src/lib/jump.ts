/* Saltos desde el buscador (Ctrl + K): la pantalla de destino lee esto al abrirse y lo limpia.
   Si la pantalla ya estaba abierta (misma sección), se entera por el evento «lspdt:jump» y cambia de pestaña igual. */
import { useEffect } from "react";

type J = { inf?: string; ag?: string; ley?: string; infSub?: string; oisTab?: "new" | "list" | "guia" };
export const JUMP: J = {};
const take = <K extends keyof J>(k: K): J[K] => { const v = JUMP[k]; JUMP[k] = undefined; return v; };
export const jumpNow = () => setTimeout(() => dispatchEvent(new Event("lspdt:jump")), 0);
export function useJump<K extends keyof J>(k: K, f: (v: NonNullable<J[K]>) => void) {
  useEffect(() => { const run = () => { const v = take(k); if (v != null) f(v as NonNullable<J[K]>); };
    addEventListener("lspdt:jump", run); return () => removeEventListener("lspdt:jump", run); }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
