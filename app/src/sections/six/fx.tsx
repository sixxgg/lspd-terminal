/* six · efectos: ajustes propios, lluvia de caracteres y error de entrada */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LS } from "@/lib/store";

/* ---------- ajustes (independientes de la MDT; viajan con la cuenta de six) ---------- */
export type SixCfg = { tema: string; lluvia: 0 | 1 | 2 | 3; scan: boolean; grid: boolean; glow: 0 | 1 | 2; flicker: boolean; error: boolean; bd: "tema" | "neutro" | "no" };
export const CFG_KEY = "lspdt.six.cfg";
export const CFG0: SixCfg = { tema: "verde", lluvia: 1, scan: true, grid: true, glow: 1, flicker: true, error: true, bd: "tema" };
export const THEMES: [string, string, string][] = [["verde", "Verde", "#39ff88"], ["cian", "Cian", "#00e5ff"], ["rojo", "Rojo", "#ff2b4a"], ["ambar", "Ámbar", "#ffb000"], ["violeta", "Violeta", "#b46cff"], ["blanco", "Blanco", "#e8eef7"]];
export const colorOf = (t: string) => (THEMES.find(x => x[0] === t) || THEMES[0])[2];
/* variables CSS de un color: --c (hex, para sombras) y --six (canales RGB, para las clases bg-six/NN, border-six/NN…) */
export const vars = (col: string) => ({ ["--c" as string]: col, ["--six" as string]: [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)).join(" ") });
export const readCfg = (): SixCfg => ({ ...CFG0, ...LS.json<Partial<SixCfg>>(CFG_KEY, {}) });

const rnd = (n: number) => Math.floor(Math.random() * n);
export const hex = (n = 4) => Array.from({ length: n }, () => "0123456789abcdef"[rnd(16)]).join("");

/* lluvia de caracteres en canvas (~24 fps, se pausa con la pestaña oculta) */
export function Rain({ color, opacity = 0.14, speed = 42 }: { color: string; opacity?: number; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
    let w = 0, h = 0, cols: number[] = [], raf = 0, last = 0;
    const fit = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; cols = Array.from({ length: Math.ceil(w / 14) }, () => rnd(Math.max(1, h / 14))); };
    fit(); window.addEventListener("resize", fit);
    const CH = "01アイウエオカキクケコサシスセソ0123456789abcdef";
    const draw = (t: number) => { raf = requestAnimationFrame(draw); if (document.hidden || t - last < speed) return; last = t;
      ctx.fillStyle = "rgba(0,0,0,.09)"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = color; ctx.font = "13px JetBrains Mono, monospace";
      cols.forEach((y, i) => { ctx.fillText(CH[rnd(CH.length)], i * 14, y * 14); cols[i] = y * 14 > h && Math.random() > 0.975 ? 0 : y + 1; }); };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, [color, speed]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }} />;
}

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
