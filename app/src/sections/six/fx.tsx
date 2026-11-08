/* six · efectos visuales: lluvia de caracteres, quiebre de pantalla y carga de entrada */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const rnd = (n: number) => Math.floor(Math.random() * n);
export const hex = (n = 4) => Array.from({ length: n }, () => "0123456789abcdef"[rnd(16)]).join("");

/* lluvia de caracteres en canvas (~24 fps, se pausa con la pestaña oculta) */
export function Rain({ color = "#39ff88", opacity = 0.14 }: { color?: string; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
    let w = 0, h = 0, cols: number[] = [], raf = 0, last = 0;
    const fit = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; cols = Array.from({ length: Math.ceil(w / 14) }, () => rnd(Math.max(1, h / 14))); };
    fit(); window.addEventListener("resize", fit);
    const CH = "01アイウエオカキクケコサシスセソ0123456789abcdef";
    const draw = (t: number) => { raf = requestAnimationFrame(draw); if (document.hidden || t - last < 42) return; last = t;
      ctx.fillStyle = "rgba(0,0,0,.09)"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = color; ctx.font = "13px JetBrains Mono, monospace";
      cols.forEach((y, i) => { ctx.fillText(CH[rnd(CH.length)], i * 14, y * 14); cols[i] = y * 14 > h && Math.random() > 0.975 ? 0 : y + 1; }); };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, [color]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }} />;
}

/* quiebre: la MDT tiembla, se agrieta y se cae (dura ~2 s) */
export function Breach({ onDone }: { onDone: () => void }) {
  const cb = useRef(onDone); cb.current = onDone;
  useEffect(() => { document.documentElement.classList.add("six-breaking"); const t = setTimeout(() => cb.current(), 2100);
    return () => { clearTimeout(t); document.documentElement.classList.remove("six-breaking"); }; }, []);
  return createPortal(
    <div className="six-breach pointer-events-none fixed inset-0 z-[95]" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {["M52 48 L38 20 L30 0", "M52 48 L70 30 L88 8 L100 4", "M52 48 L80 55 L100 62", "M52 48 L62 78 L58 100", "M52 48 L28 64 L6 86 L0 92", "M52 48 L20 44 L0 40", "M38 20 L22 26", "M70 30 L74 14", "M62 78 L78 88", "M28 64 L30 80"].map((d, i) =>
          <path key={i} d={d} pathLength={1} className="six-crack" style={{ animationDelay: `${i * 0.035}s` }} />)}
      </svg>
      <div className="six-flash absolute inset-0" />
    </div>, document.body);
}

/* carga de entrada: ~12 s, con etapas, anillos, núcleo y registro */
const STAGES = ["iniciando núcleo six", "verificando identidad", "abriendo canal privado", "descifrando almacenamiento", "sincronizando datos del staff", "cargando comunicados", "preparando equipo de ilícitos", "aplicando tema neón"];
const LOG = ["kernel six 6.6.6 · ok", "módulo cripto · aes-256-gcm", "identidad: six", "canal privado · estable", "almacenamiento · 3 volúmenes", "staff · sincronizado", "comunicados · indexados", "ilícitos · plantillas listas", "interfaz · neón", "todo listo"];
export function Loader({ onDone, ms = 12000 }: { onDone: () => void; ms?: number }) {
  const [t, setT] = useState(0), [dump, setDump] = useState<string[]>([]), cb = useRef(onDone); cb.current = onDone;
  useEffect(() => { const s = performance.now(); let raf = 0;
    const f = () => { const e = performance.now() - s; setT(Math.min(1, e / ms)); if (e < ms + 900) raf = requestAnimationFrame(f); else cb.current(); };
    raf = requestAnimationFrame(f); const d = setInterval(() => setDump(Array.from({ length: 22 }, () => `${hex(4)}  ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)}  ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)}`)), 110);
    return () => { cancelAnimationFrame(raf); clearInterval(d); }; }, [ms]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") cb.current(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const pct = Math.round(t * 100), st = Math.min(STAGES.length - 1, Math.floor(t * STAGES.length)), done = t >= 1;
  return (
    <div className="six-load fixed inset-0 z-[96] overflow-hidden bg-black font-mono text-[#39ff88]">
      <Rain opacity={0.22} />
      <div className="six-scan absolute inset-0" aria-hidden />
      <div className="relative grid h-full grid-cols-1 gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_minmax(20rem,28rem)_1fr]">
        <div className="hidden flex-col justify-end gap-1 text-[11px] text-[#39ff88]/70 lg:flex">
          {LOG.slice(0, Math.ceil(t * LOG.length)).map((l, i) => <p key={i} className="six-type"><span className="text-[#00f0ff]">[{String(i).padStart(2, "0")}]</span> {l}</p>)}
        </div>
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="relative grid size-64 place-items-center">
            <span className="six-ring absolute inset-0 rounded-full border border-[#00f0ff]/40" />
            <span className="six-ring rev absolute inset-4 rounded-full border-2 border-dashed border-[#ff2bd6]/50" />
            <span className="six-ring slow absolute inset-10 rounded-full border border-[#39ff88]/50" />
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90"><circle cx="50" cy="50" r="47" fill="none" stroke="#39ff88" strokeWidth="1.2" strokeDasharray={`${t * 295} 295`} style={{ filter: "drop-shadow(0 0 4px #39ff88)" }} /></svg>
            <span className={cn6("six-logo text-6xl font-black", done && "on")} data-t="six">six</span>
          </div>
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs"><span className="text-[#00f0ff]">{done ? "acceso concedido" : STAGES[st] + "…"}</span><span>{pct}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#39ff88]/10"><div className="six-bar h-full rounded-full" style={{ width: pct + "%" }} /></div>
            <div className="flex gap-1">{STAGES.map((_, i) => <span key={i} className={cn6("h-1 flex-1 rounded-full", i < st || done ? "bg-[#ff2bd6] shadow-[0_0_6px_#ff2bd6]" : i === st ? "bg-[#ff2bd6]/50" : "bg-white/10")} />)}</div>
          </div>
          {done && <p className="six-granted text-sm tracking-[0.5em] text-white">bienvenido, six</p>}
        </div>
        <div className="hidden overflow-hidden text-right text-[10px] leading-relaxed text-[#39ff88]/30 lg:block">{dump.map((l, i) => <p key={i}>{l}</p>)}</div>
      </div>
      <button onClick={onDone} className="absolute bottom-4 right-5 text-[11px] text-[#39ff88]/50 hover:text-[#39ff88]">esc · saltar</button>
    </div>
  );
}
const cn6 = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
