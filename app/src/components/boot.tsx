/* Pantalla de carga al ingresar: secuencia de «enlace seguro» de la terminal policial, interactiva (~10-15 s).
   1) enlace y credenciales · 2) huella: mantener presionado el lector · 3) carga de módulos con radar · 4) acceso concedido.
   Liviana: solo CSS (transform/opacity) y temporizadores, sin canvas. «Saltar» en todo momento; Escape también. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Fingerprint, ShieldCheck } from "lucide-react";
import { LS } from "@/lib/store";

type Line = { t: string; ok?: string };
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@*";
const maskName = (n: string) => n.split(/\s+/).map(w => w[0] + "•".repeat(Math.max(2, w.length - 1))).join(" ");
const hex = (n: number) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
const MODS = ["Roster y perfiles", "Código Penal", "Informes", "Divisiones", "Supervisión", "Comunicaciones"];
const HOLD_MS = 1600, AUTO_SCAN_MS = 4500;

export function BootScreen({ name, rank, badge, agents, short, onDone }: {
  name: string; rank: string; badge?: string; agents: number; short?: boolean; onDone: () => void;
}) {
  const reduce = useMemo(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const [penal, setPenal] = useState<[number, number] | null>(null);
  useEffect(() => { void import("@/lib/penal").then(m => { const P = m.getPenal(); setPenal([P.filter(x => x.k !== "adm").length, P.filter(x => x.k === "adm").length]); }); }, []);
  const sess = useMemo(() => hex(4) + "-" + hex(4) + "-" + hex(4), []);
  const A: Line[] = [
    { t: `Iniciando LSPD Mobile Data Terminal · sesión ${sess}` },
    { t: "Estableciendo enlace cifrado con Mission Row (AES-256 · TLS 1.3)", ok: "ENLACE" },
    { t: `Autenticando agente: ${maskName(name)}${badge ? ` · placa #${badge.replace(/\D/g, "").replace(/\d(?=\d)/g, "•")}` : ""}`, ok: "OK" },
    { t: "Credenciales: ••••••••••••", ok: "VERIFICADAS" },
    { t: `Nivel de acceso: ${rank.toUpperCase()}`, ok: "AUTORIZADO" },
  ];
  const C: Line[] = [
    { t: "Identidad biométrica confirmada", ok: "HUELLA OK" },
    { t: `Sincronizando roster del departamento (${agents} agentes)`, ok: "SYNC" },
    { t: penal ? `Cargando Código Penal (${penal[0]} delitos · ${penal[1]} infracciones)` : "Cargando Código Penal", ok: "OK" },
    { t: "Consultando base de datos de órdenes y requisitorias", ok: "OK" },
    { t: "Verificando integridad del dispositivo y firma digital", ok: "OK" },
  ];
  /* fase: 0 = credenciales · 1 = huella · 2 = módulos · 3 = acceso */
  const [ph, setPh] = useState(short ? 2 : 0), [n, setN] = useState(0), [m, setM] = useState(0), [hold, setHold] = useState(0), [out, setOut] = useState(false);
  const [scr, setScr] = useState(maskName(name));
  const fin = useRef(false), holdT = useRef(0), holdStart = useRef(0);
  const finish = () => { if (fin.current) return; fin.current = true; setOut(true); window.setTimeout(onDone, 380); };
  const k = reduce ? 0.3 : 1, step = (short ? 140 : 520) * k;

  /* fase 0: líneas de credenciales */
  useEffect(() => { if (ph !== 0) return;
    if (n < A.length) { const t = window.setTimeout(() => setN(n + 1), step + (n === 1 ? step : 0)); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setPh(1), 450 * k); return () => window.clearTimeout(t); }, [ph, n]); // eslint-disable-line react-hooks/exhaustive-deps
  /* fase 1: huella (si no interactúa, se escanea sola) */
  useEffect(() => { if (ph !== 1) return; const t = window.setTimeout(() => { if (holdStart.current === 0) autoScan(); }, AUTO_SCAN_MS * k); return () => window.clearTimeout(t); }, [ph]); // eslint-disable-line react-hooks/exhaustive-deps
  /* fase 2: módulos */
  useEffect(() => { if (ph !== 2) return;
    if (m < MODS.length + C.length) { const t = window.setTimeout(() => setM(m + 1), (short ? 90 : 380) * k); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setPh(3), 300 * k); return () => window.clearTimeout(t); }, [ph, m]); // eslint-disable-line react-hooks/exhaustive-deps
  /* fase 3: acceso concedido, entra solo si no toca nada */
  useEffect(() => { if (ph !== 3) return; const t = window.setTimeout(finish, (short ? 900 : 3500) * k); return () => window.clearTimeout(t); }, [ph]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ph !== 3 || reduce) { if (ph === 3) setScr(name.toUpperCase()); return; }
    const target = name.toUpperCase(); let i = 0;
    const id = window.setInterval(() => { i++; setScr(target.split("").map((c, j) => c === " " || j < i ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("")); if (i > target.length) window.clearInterval(id); }, 40);
    return () => window.clearInterval(id);
  }, [ph, name, reduce]);

  const tick = () => { const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS); setHold(p);
    if (p >= 1) { holdStart.current = -1; window.setTimeout(() => setPh(2), 350); return; } holdT.current = requestAnimationFrame(tick); };
  const press = () => { if (ph !== 1 || holdStart.current === -1) return; holdStart.current = performance.now(); cancelAnimationFrame(holdT.current); holdT.current = requestAnimationFrame(tick); };
  const release = () => { if (ph !== 1 || holdStart.current === -1) return; cancelAnimationFrame(holdT.current); holdStart.current = 0; setHold(0); };
  function autoScan() { holdStart.current = performance.now(); holdT.current = requestAnimationFrame(tick); }
  useEffect(() => () => cancelAnimationFrame(holdT.current), []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); else if (e.key === " " && !e.repeat) { e.preventDefault(); press(); } else if (e.key === "Enter" && ph === 3) finish(); };
    const ku = (e: KeyboardEvent) => { if (e.key === " ") release(); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [ph]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = ph === 0 ? A.slice(0, n) : [...A, ...(ph >= 2 ? C.slice(0, Math.max(0, m - MODS.length)) : [])];
  const total = A.length + 1 + MODS.length + C.length;
  const doneN = ph === 0 ? n : ph === 1 ? A.length + hold : ph === 2 ? A.length + 1 + m : total;
  const pct = Math.round(Math.min(1, doneN / total) * 100);
  const logo = LS.get("lspdt.logo.boot") || LS.get("lspdt.logo") || "/next/logo.svg";
  const R = 46, CIRC = 2 * Math.PI * R;

  return (
    <div role="status" aria-live="polite" aria-label="Cargando la terminal"
      className={"boot fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[#03060c] font-mono text-[13px] text-sky-100 transition-opacity duration-300 " + (out ? "opacity-0" : "opacity-100")}>
      <div aria-hidden className="boot-grid absolute inset-0" />
      <div aria-hidden className="boot-scan absolute inset-0" />
      <button onClick={finish} className="absolute right-5 top-5 z-10 rounded-lg border border-sky-400/20 px-3 py-1.5 text-[11px] tracking-[0.2em] text-sky-300/70 transition hover:border-sky-400/50 hover:text-sky-200">SALTAR ›</button>
      <div className="relative w-[min(860px,calc(100%-32px))]">
        <div className="mb-5 flex items-center gap-4">
          <img src={logo} alt="" className="boot-logo size-14 object-contain" />
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.3em] text-sky-400/80">LOS SANTOS POLICE DEPARTMENT</p>
            <p className="font-display text-xl font-semibold tracking-[0.12em] text-white">MOBILE DATA TERMINAL</p>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 rounded border border-emerald-400/40 px-2 py-1 text-[10px] tracking-[0.2em] text-emerald-300 sm:inline-flex">
            <span className="boot-dot size-1.5 rounded-full bg-emerald-400" />CANAL SEGURO</span>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_15rem]">
          <div className="rounded-xl border border-sky-400/20 bg-black/40 p-4 shadow-[0_0_40px_rgba(56,189,248,.08)]">
            <div className="min-h-[17rem] space-y-1.5">
              {lines.map((l, i) => (
                <div key={i} className="boot-line flex gap-3">
                  <span className="shrink-0 text-sky-500/70">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1 truncate text-sky-100/90">{l.t}</span>
                  {l.ok && <span className="shrink-0 text-emerald-400">[{l.ok}]</span>}
                </div>))}
              {ph !== 3 && <div className="flex gap-3"><span className="text-sky-500/70">{String(lines.length + 1).padStart(2, "0")}</span>
                {ph === 1 ? <span className="text-amber-300">Esperando verificación biométrica…</span> : <span className="boot-caret" />}</div>}
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sky-950">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-300 ease-out" style={{ width: pct + "%" }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-sky-400/70"><span>{ph === 3 ? "Carga completa" : ph === 1 ? "Verificación de identidad" : "Cargando módulos…"}</span><span>{pct}%</span></div>
          </div>

          {/* panel lateral: huella / radar de módulos / acceso */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-sky-400/20 bg-black/40 p-4 text-center">
            {ph <= 1 ? <>
              <button type="button" disabled={ph !== 1} aria-label="Mantené presionado para escanear la huella"
                onPointerDown={e => { e.preventDefault(); press(); }} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
                className={"relative grid size-32 touch-none select-none place-items-center rounded-full transition " + (ph === 1 ? "cursor-pointer" : "opacity-40")}>
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(56,189,248,.15)" strokeWidth="4" />
                  <circle cx="50" cy="50" r={R} fill="none" stroke={hold >= 1 ? "#34d399" : "#38bdf8"} strokeWidth="4" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - hold)} />
                </svg>
                <Fingerprint className={"size-16 transition-colors " + (hold >= 1 ? "text-emerald-400" : hold > 0 ? "text-sky-300" : "text-sky-500/80")} strokeWidth={1.25} />
                {hold > 0 && hold < 1 && <span aria-hidden className="boot-fpscan absolute inset-x-6 h-0.5 bg-sky-300/80 shadow-[0_0_10px_#38bdf8]" />}
              </button>
              <p className="mt-3 text-[11px] tracking-[0.15em] text-sky-300/80">{ph === 0 ? "LECTOR BIOMÉTRICO" : hold >= 1 ? "HUELLA VERIFICADA" : "MANTENÉ PRESIONADO"}</p>
              {ph === 1 && hold < 1 && <p className="mt-1 text-[10px] text-sky-500/60">o la barra espaciadora</p>}
            </> : ph === 2 ? <>
              <div aria-hidden className="relative size-32 overflow-hidden rounded-full border border-sky-400/30">
                <div className="boot-radar absolute inset-0 rounded-full" />
                <div className="absolute inset-[30%] rounded-full border border-sky-400/20" /><div className="absolute inset-[12%] rounded-full border border-sky-400/15" />
              </div>
              <ul className="mt-3 w-full space-y-1 text-left text-[11px]">
                {MODS.map((x, i) => <li key={x} className={"flex items-center gap-2 transition-opacity " + (i < m ? "opacity-100" : "opacity-35")}>
                  {i < m ? <Check className="size-3.5 text-emerald-400" /> : <span className="boot-caret !h-2.5 !w-1.5" />}<span className="truncate">{x}</span></li>)}
              </ul>
            </> : <>
              <ShieldCheck className="boot-glow size-20 text-emerald-400" strokeWidth={1.25} />
              <p className="mt-2 text-[11px] tracking-[0.2em] text-emerald-300">IDENTIDAD CONFIRMADA</p>
            </>}
          </div>
        </div>

        <div className={"mt-6 flex flex-col items-center gap-3 transition-all duration-300 " + (ph === 3 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
          <div className="text-center">
            <p className="boot-glow font-display text-3xl font-bold tracking-[0.25em] text-emerald-300">ACCESO CONCEDIDO</p>
            <p className="mt-1 text-xs tracking-[0.2em] text-sky-200/80">BIENVENIDO, {scr}</p>
          </div>
          <button onClick={finish} className="rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-6 py-2.5 text-xs font-semibold tracking-[0.25em] text-emerald-200 transition hover:bg-emerald-400/20">ENTRAR A LA TERMINAL ›</button>
        </div>
      </div>
    </div>
  );
}
