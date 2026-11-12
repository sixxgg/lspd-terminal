/* Pantalla de ingreso: la credencial policial del agente se escanea y se valida sola (placa, rango, ID de cuenta, divisiones)
   mientras se cargan los módulos; termina en «ACCESO CONCEDIDO» y entra sola. Solo CSS y temporizadores.
   «Saltar», Escape o Enter en todo momento. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { LS } from "@/lib/store";
import { Avatar } from "@/components/agents";

const hex = (n: number) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

export function BootScreen({ name, rank, badge, agents, no, divs = [], short, onDone }: {
  name: string; rank: string; badge?: string; agents: number; no?: number; divs?: string[]; short?: boolean; onDone: () => void;
}) {
  const reduce = useMemo(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const [penal, setPenal] = useState<number | null>(null);
  useEffect(() => { void import("@/lib/penal").then(m => setPenal(m.getPenal().length)); }, []);
  const sess = useMemo(() => `${hex(4)}-${hex(4)}`, []), id = no ? `#${String(no).padStart(3, "0")}` : "—";
  const steps: [string, string][] = [
    ["Leyendo credencial", "OK"],
    [`Placa ${badge ? "#" + badge.replace(/\D/g, "") : "sin cargar"}`, "VÁLIDA"],
    [`Rango: ${rank}`, "AUTORIZADO"],
    [`ID de cuenta ${id}`, "VERIFICADO"],
    [divs.length ? `Divisiones: ${divs.length}` : "Divisiones: ninguna", "OK"],
    [`Roster del departamento · ${agents} agentes`, "SYNC"],
    [penal ? `Código Penal · ${penal} artículos` : "Código Penal", "OK"],
    [`Canal cifrado AES-256 · sesión ${sess}`, "SEGURO"],
  ];
  const k = reduce ? 0.3 : 1, step = (short ? 110 : 420) * k;
  const [n, setN] = useState(0), [out, setOut] = useState(false), [scr, setScr] = useState("");
  const fin = useRef(false), done = n >= steps.length;
  const finish = () => { if (fin.current) return; fin.current = true; setOut(true); window.setTimeout(onDone, 380); };
  useEffect(() => { if (done) { const t = window.setTimeout(finish, (short ? 700 : 1800) * k); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setN(n + 1), step + (n === 0 ? step : 0)); return () => window.clearTimeout(t); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  /* el nombre se «descifra» al confirmar la identidad */
  useEffect(() => {
    const target = name.toUpperCase(); if (reduce) { setScr(target); return; } let i = 0;
    const iv = window.setInterval(() => { i++; setScr(target.split("").map((c, j) => c === " " || j < i ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("")); if (i > target.length) window.clearInterval(iv); }, short ? 15 : 45);
    return () => window.clearInterval(iv);
  }, [name, reduce, short]);
  useEffect(() => { const kd = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") finish(); }; window.addEventListener("keydown", kd); return () => window.removeEventListener("keydown", kd); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = Math.round((Math.min(n, steps.length) / steps.length) * 100);
  const logo = LS.get("lspdt.logo.boot") || LS.get("lspdt.logo") || "/next/logo.svg";

  return (
    <div role="status" aria-live="polite" aria-label="Verificando identidad"
      className={"boot fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-[#03060c] font-mono text-[13px] text-sky-100 transition-opacity duration-300 " + (out ? "opacity-0" : "opacity-100")}>
      <div aria-hidden className="boot-grid absolute inset-0" />
      <div aria-hidden className="boot-scan absolute inset-0" />
      <button onClick={finish} className="absolute right-5 top-5 z-10 rounded-lg border border-sky-400/20 px-3 py-1.5 text-[11px] tracking-[0.2em] text-sky-300/70 transition hover:border-sky-400/50 hover:text-sky-200">SALTAR ›</button>
      <div className="relative my-8 w-[min(900px,calc(100%-32px))]">
        <div className="mb-5 flex items-center gap-3">
          <span className="boot-dot size-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
          <p className="text-[11px] tracking-[0.3em] text-sky-400/80">LSPD · MOBILE DATA TERMINAL · CONTROL DE IDENTIDAD</p>
          <span className={"ml-auto hidden rounded border px-2 py-1 text-[10px] tracking-[0.2em] sm:inline " + (done ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/40 text-amber-300")}>{done ? "VALIDADO" : "VALIDANDO"}</span>
        </div>

        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* credencial */}
          <div className={"boot-id relative overflow-hidden rounded-2xl p-5 " + (done ? "ok" : "")}>
            {!done && !reduce && <span aria-hidden className="boot-laser" />}
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <img src={logo} alt="" className="boot-logo size-11 object-contain" />
              <div className="min-w-0"><p className="text-[10px] tracking-[0.28em] text-amber-200/80">LOS SANTOS POLICE DEPARTMENT</p>
                <p className="font-display text-sm font-bold tracking-[0.18em] text-white">CREDENCIAL DE SERVICIO</p></div>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/40 p-1"><Avatar n={name} size={92} />
                {done && <span className="boot-stamp absolute inset-x-0 bottom-1 mx-auto w-fit rounded px-1.5 text-[9px] font-black tracking-[0.15em]">VERIFICADO</span>}</div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div><p className="text-[9px] tracking-[0.25em] text-sky-400/70">AGENTE</p><p className="truncate font-display text-lg font-bold tracking-wide text-white">{scr || " "}</p></div>
                <div className="flex gap-5">
                  <div><p className="text-[9px] tracking-[0.25em] text-sky-400/70">RANGO</p><p className={"text-xs font-semibold transition " + (n > 2 ? "text-white" : "text-white/25")}>{rank}</p></div>
                  <div><p className="text-[9px] tracking-[0.25em] text-sky-400/70">PLACA</p><p className={"text-xs font-semibold transition " + (n > 1 ? "text-white" : "text-white/25")}>{badge ? "#" + badge.replace(/\D/g, "") : "—"}</p></div>
                  <div><p className="text-[9px] tracking-[0.25em] text-sky-400/70">ID</p><p className={"text-xs font-semibold transition " + (n > 3 ? "text-amber-300" : "text-white/25")}>{id}</p></div>
                </div>
              </div>
            </div>
            <div className={"mt-4 flex min-h-[1.5rem] flex-wrap gap-1.5 transition " + (n > 4 ? "opacity-100" : "opacity-0")}>
              {divs.length ? divs.slice(0, 6).map(d => <span key={d} className="rounded border border-sky-400/25 bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-200">{d}</span>) : <span className="text-[10px] text-sky-400/50">Sin divisiones asignadas</span>}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
              <div aria-hidden className="boot-bars h-7 flex-1" />
              <p className="shrink-0 text-[9px] tracking-[0.2em] text-sky-400/60">MISSION ROW · {sess}</p>
            </div>
          </div>

          {/* validación */}
          <div className="rounded-2xl border border-sky-400/20 bg-black/40 p-4">
            <ul className="space-y-2">{steps.map(([t, ok], i) => (
              <li key={i} className={"flex items-center gap-2.5 transition-opacity " + (i <= n ? "opacity-100" : "opacity-30")}>
                {i < n ? <Check className="size-4 shrink-0 text-emerald-400" /> : i === n ? <Loader2 className="size-4 shrink-0 animate-spin text-sky-400" /> : <span className="size-4 shrink-0 rounded-full border border-sky-400/30" />}
                <span className="min-w-0 flex-1 truncate text-sky-100/90">{t}</span>
                {i < n && <span className="shrink-0 text-[11px] font-bold text-emerald-400">{ok}</span>}
              </li>))}</ul>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sky-950"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-300 ease-out" style={{ width: pct + "%" }} /></div>
            <div className="mt-2 flex justify-between text-[11px] text-sky-400/70"><span>{done ? "Identidad confirmada" : "Validando identidad…"}</span><span>{pct}%</span></div>
          </div>
        </div>

        <div className={"mt-6 flex flex-col items-center gap-3 transition-all duration-300 " + (done ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
          <div className="flex items-center gap-3"><ShieldCheck className="boot-glow size-9 text-emerald-400" strokeWidth={1.5} />
            <p className="boot-glow font-display text-3xl font-bold tracking-[0.25em] text-emerald-300">ACCESO CONCEDIDO</p></div>
          <button onClick={finish} className="rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-6 py-2.5 text-xs font-semibold tracking-[0.25em] text-emerald-200 transition hover:bg-emerald-400/20">ENTRAR A LA TERMINAL ›</button>
        </div>
      </div>
    </div>
  );
}
