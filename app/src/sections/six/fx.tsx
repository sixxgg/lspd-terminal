/* six · efectos: lluvia de caracteres y consola de arranque (los ajustes están en cfg.ts) */
import { useEffect, useRef, useState } from "react";
import { hex } from "./cfg";
export * from "./cfg";
const rnd = (n: number) => Math.floor(Math.random() * n);

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
  "[ .. ] Verificando la huella del operador", "[ OK ] Operador reconocido: {n}", "[ .. ] Sincronizando datos privados",
  "[ OK ] Módulos cargados: administración · equipo de ilícitos", "[ OK ] Aplicando tema y efectos",
];
export function Boot({ short, onDone, name = "six" }: { short?: boolean; onDone: () => void; name?: string }) {
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
        <div className="six-con relative grid h-full grid-rows-[auto_1fr_auto] gap-5 p-6 font-mono text-[13px] text-six sm:p-10">
          <div className="flex items-end gap-6">
            <pre className={`six-skull text-[10px] leading-[1.15] sm:text-[14px] ${ok ? "on" : ""}`}>{SKULL}</pre>
            <p className="hidden pb-2 text-xs text-six/70 sm:block">{name}@terminal:~# ./acceso --privado</p>
          </div>
          <div className="grid min-h-0 gap-6 md:grid-cols-[1fr_20rem]">
            <div className="space-y-1 overflow-hidden">
              {LINES.slice(0, n).map(l => l.replace("{n}", name)).map((l, i) => <p key={i} className={l.startsWith("[ ..") ? "opacity-60" : ""}>{l}</p>)}
              {ok && <p className="six-granted mt-4 text-xl font-bold tracking-[0.3em] text-white">ACCESO CONCEDIDO</p>}
              <span className="six-cur">█</span>
            </div>
            <div className="hidden overflow-hidden text-[10px] leading-relaxed text-six/30 md:block">{dump.map((d, i) => <p key={i}>{d}</p>)}</div>
          </div>
          <div><div className="h-1 overflow-hidden rounded bg-six/15"><div className="h-full bg-six shadow-[0_0_10px_var(--c)] transition-all duration-300" style={{ width: pct + "%" }} /></div>
            <p className="mt-2 flex justify-between text-[11px] text-six/60"><span>DESCIFRANDO… {pct}%</span><span>ESC para saltar</span></p></div>
        </div>
      )}
    </div>
  );
}
