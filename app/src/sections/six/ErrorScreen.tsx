/* six · pantallazo rojo de error antes de entrar (lo muestra la MDT, por eso va aparte y liviano) */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hex } from "./cfg";

/* error de entrada: pantallazo rojo de neón sobre la MDT (~1,8 s) y después entra a six */
export function ErrorScreen({ onDone }: { onDone: () => void }) {
  const cb = useRef(onDone); cb.current = onDone;
  const [code] = useState(() => `0x${hex(8).toUpperCase()}`);
  useEffect(() => { const t = setTimeout(() => cb.current(), 1900); return () => clearTimeout(t); }, []);
  return createPortal(
    <div className="six-err fixed inset-0 z-[95] grid place-items-center overflow-hidden bg-black font-mono" role="alert">
      <div className="six-err-scan absolute inset-0" aria-hidden />
      <div className="relative px-6 text-center">
        <p className="six-err-big text-[clamp(4rem,16vw,12rem)] font-black leading-none" data-t="ERROR">ERROR</p>
        <p className="mt-4 text-lg font-bold tracking-[0.4em] text-[#ff2b4a]">FALLA CRÍTICA DEL SISTEMA</p>
        <p className="mt-2 text-xs tracking-[0.3em] text-[#ff2b4a]/70">CÓDIGO {code} · REINICIANDO EN MODO PRIVADO…</p>
      </div>
    </div>, document.body);
}
