/* six · efectos: ajustes propios, lluvia de caracteres, error de entrada y consola de arranque */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LS } from "@/lib/store";

/* ---------- ajustes (independientes de la MDT; viajan con la cuenta de six) ---------- */
export type SixCfg = { tema: string; lluvia: 0 | 1 | 2 | 3; scan: boolean; grid: boolean; glow: 0 | 1 | 2; flicker: boolean; intro: "completa" | "corta" | "no"; error: boolean };
export const CFG_KEY = "lspdt.six.cfg";
export const CFG0: SixCfg = { tema: "verde", lluvia: 1, scan: true, grid: true, glow: 1, flicker: true, intro: "completa", error: true };
export const THEMES: [string, string, string][] = [["verde", "Verde", "#39ff88"], ["cian", "Cian", "#00e5ff"], ["rojo", "Rojo", "#ff2b4a"], ["ambar", "Ámbar", "#ffb000"], ["violeta", "Violeta", "#b46cff"], ["blanco", "Blanco", "#e8eef7"]];
export const colorOf = (t: string) => (THEMES.find(x => x[0] === t) || THEMES[0])[2];
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

/* arranque: la pantalla se apaga y aparece la consola con la calavera */
const SKULL = String.raw`        _____________
     .-'             '-.
   .'                   '.
  /    _____     _____    \
 |    /     \   /     \    |
 |   |   ●   | |   ●   |   |
 |    \_____/   \_____/    |
  \          /\           /
   '.       /__\        .'
     |  |\_________/|  |
     |  | |_|_|_|_| |  |
      \  \_|_|_|_|_/  /
       '-.___________.-'`;
const LINES = [
  "[ OK ] Cerrando la sesión de la MDT…", "[ OK ] Sesión de la MDT suspendida", "[ .. ] Montando volumen privado /dev/six0",
  "[ OK ] Clave AES-256-GCM aceptada", "[ .. ] Abriendo canal seguro", "[ OK ] Canal establecido (latencia: 18 ms)",
  "[ .. ] Verificando la huella del operador", "[ OK ] Operador reconocido: six", "[ .. ] Sincronizando datos privados",
  "[ OK ] Módulos cargados: administración · equipo de ilícitos", "[ OK ] Aplicando tema y efectos",
];
export function Boot({ short, onDone }: { short?: boolean; onDone: () => void }) {
  const cb = useRef(onDone); cb.current = onDone;
  const [ph, setPh] = useState<"off" | "con">("off"), [n, setN] = useState(0), [dump, setDump] = useState<string[]>([]);
  const step = short ? 240 : 720, total = LINES.length + (short ? 4 : 3);
  useEffect(() => { const t = setTimeout(() => setPh("con"), 900); return () => clearTimeout(t); }, []);
  useEffect(() => { if (ph !== "con") return;
    const i = setInterval(() => setN(x => x + 1), step), h = setInterval(() => setDump(Array.from({ length: 16 }, () => Array.from({ length: 6 }, () => hex(4)).join(" "))), 90);
    return () => { clearInterval(i); clearInterval(h); }; }, [ph, step]);
  useEffect(() => { if (n >= total) cb.current(); }, [n, total]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") cb.current(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const pct = Math.min(100, Math.round((n / (LINES.length + 1)) * 100)), ok = n > LINES.length;
  return (
    <div className="fixed inset-0 z-[96] cursor-pointer bg-black" onClick={() => cb.current()} title="Clic para saltar">
      {ph === "off" ? <div className="six-off" /> : (
        <div className="six-con relative grid h-full grid-rows-[auto_1fr_auto] gap-5 p-6 font-mono text-[13px] text-[var(--c)] sm:p-10">
          <div className="flex items-end gap-6">
            <pre className={`six-skull text-[10px] leading-[1.15] sm:text-[14px] ${ok ? "on" : ""}`}>{SKULL}</pre>
            <p className="hidden pb-2 text-xs text-[var(--c)]/70 sm:block">six@terminal:~# ./acceso --privado</p>
          </div>
          <div className="grid min-h-0 gap-6 md:grid-cols-[1fr_20rem]">
            <div className="space-y-1 overflow-hidden">
              {LINES.slice(0, n).map((l, i) => <p key={i} className={l.startsWith("[ ..") ? "opacity-60" : ""}>{l}</p>)}
              {ok && <p className="six-granted mt-4 text-xl font-bold tracking-[0.3em] text-white">ACCESO CONCEDIDO</p>}
              <span className="six-cur">█</span>
            </div>
            <div className="hidden overflow-hidden text-[10px] leading-relaxed text-[var(--c)]/30 md:block">{dump.map((d, i) => <p key={i}>{d}</p>)}</div>
          </div>
          <div><div className="h-1 overflow-hidden rounded bg-[var(--c)]/15"><div className="h-full bg-[var(--c)] shadow-[0_0_10px_var(--c)] transition-all duration-300" style={{ width: pct + "%" }} /></div>
            <p className="mt-2 flex justify-between text-[11px] text-[var(--c)]/60"><span>DESCIFRANDO… {pct}%</span><span>ESC para saltar</span></p></div>
        </div>
      )}
    </div>
  );
}
