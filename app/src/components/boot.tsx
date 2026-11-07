/* Pantalla de carga al ingresar: secuencia de «enlace seguro» de la terminal policial.
   Liviana: solo CSS y algunos temporizadores, sin canvas. Se salta con un clic, Enter o Escape. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { LS } from "@/lib/store";

type Line = { t: string; ok?: string; warn?: boolean };
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@*";
/* «Ryan Westbrook» → «R*** W*******» */
const maskName = (n: string) => n.split(/\s+/).map(w => w[0] + "•".repeat(Math.max(2, w.length - 1))).join(" ");
const hex = (n: number) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");

export function BootScreen({ name, rank, badge, agents, short, onDone }: {
  name: string; rank: string; badge?: string; agents: number; short?: boolean; onDone: () => void;
}) {
  /* el código penal vive en un módulo aparte: se carga en paralelo para no engordar la carga inicial */
  const [penal, setPenal] = useState<[number, number] | null>(null);
  useEffect(() => { void import("@/lib/penal").then(m => { const P = m.getPenal(); setPenal([P.filter(x => x.k !== "adm").length, P.filter(x => x.k === "adm").length]); }); }, []);
  const reduce = useMemo(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const sess = useMemo(() => hex(4) + "-" + hex(4) + "-" + hex(4), []);
  const lines: Line[] = useMemo(() => [
    { t: `Iniciando LSPD Mobile Data Terminal · sesión ${sess}` },
    { t: "Estableciendo enlace cifrado con Mission Row (AES-256 · TLS 1.3)", ok: "ENLACE" },
    { t: `Autenticando agente: ${maskName(name)}${badge ? ` · placa #${badge.replace(/\D/g, "").replace(/\d(?=\d)/g, "•")}` : ""}`, ok: "OK" },
    { t: "Credenciales: ••••••••••••", ok: "VERIFICADAS" },
    { t: `Nivel de acceso: ${rank.toUpperCase()}`, ok: "AUTORIZADO" },
    { t: `Sincronizando roster del departamento (${agents} agentes)`, ok: "SYNC" },
    { t: penal ? `Cargando Código Penal (${penal[0]} delitos · ${penal[1]} infracciones)` : "Cargando Código Penal", ok: "OK" },
    { t: "Consultando base de datos de órdenes y requisitorias", ok: "OK" },
    { t: "Verificando integridad del dispositivo y firma digital", ok: "OK" },
  ], [name, rank, badge, agents, penal, sess]);
  const step = reduce ? 60 : short ? 150 : 300;
  const [n, setN] = useState(0), [done, setDone] = useState(false), [out, setOut] = useState(false);
  const [scr, setScr] = useState(maskName(name));
  const fin = useRef(false);
  const finish = () => { if (fin.current) return; fin.current = true; setOut(true); window.setTimeout(onDone, 380); };

  useEffect(() => {
    if (n < lines.length) { const t = window.setTimeout(() => setN(n + 1), step + (n === 1 ? step : 0)); return () => window.clearTimeout(t); }
    setDone(true); const t = window.setTimeout(finish, reduce ? 300 : short ? 700 : 1100); return () => window.clearTimeout(t);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  /* el nombre se «descifra» al final */
  useEffect(() => {
    if (!done || reduce) { if (done) setScr(name.toUpperCase()); return; }
    const target = name.toUpperCase(); let i = 0;
    const id = window.setInterval(() => {
      i++; setScr(target.split("").map((c, k) => c === " " || k < i ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join(""));
      if (i > target.length) window.clearInterval(id);
    }, 35);
    return () => window.clearInterval(id);
  }, [done, name, reduce]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round((Math.min(n, lines.length) / lines.length) * 100);
  const logo = LS.get("lspdt.logo.boot") || LS.get("lspdt.logo") || "/next/logo.svg";
  return (
    <div onClick={finish} role="status" aria-live="polite" aria-label="Cargando la terminal"
      className={"boot fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[#03060c] font-mono text-[13px] text-sky-100 transition-opacity duration-300 " + (out ? "opacity-0" : "opacity-100")}>
      <div aria-hidden className="boot-grid absolute inset-0" />
      <div aria-hidden className="boot-scan absolute inset-0" />
      <div className="relative w-[min(720px,calc(100%-32px))]">
        <div className="mb-5 flex items-center gap-4">
          <img src={logo} alt="" className="boot-logo size-14 object-contain" />
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.3em] text-sky-400/80">LOS SANTOS POLICE DEPARTMENT</p>
            <p className="font-display text-xl font-semibold tracking-[0.12em] text-white">MOBILE DATA TERMINAL</p>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 rounded border border-emerald-400/40 px-2 py-1 text-[10px] tracking-[0.2em] text-emerald-300 sm:inline-flex">
            <span className="boot-dot size-1.5 rounded-full bg-emerald-400" />CANAL SEGURO</span>
        </div>
        <div className="rounded-xl border border-sky-400/20 bg-black/40 p-4 shadow-[0_0_40px_rgba(56,189,248,.08)]">
          <div className="min-h-[15.5rem] space-y-1.5">
            {lines.slice(0, n).map((l, i) => (
              <div key={i} className="boot-line flex gap-3">
                <span className="shrink-0 text-sky-500/70">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate text-sky-100/90">{l.t}</span>
                {l.ok && <span className="shrink-0 text-emerald-400">[{l.ok}]</span>}
              </div>))}
            {!done && <div className="flex gap-3"><span className="text-sky-500/70">{String(n + 1).padStart(2, "0")}</span><span className="boot-caret" /></div>}
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sky-950">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-300 ease-out" style={{ width: pct + "%" }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-sky-400/70"><span>{done ? "Carga completa" : "Cargando módulos…"}</span><span>{pct}%</span></div>
        </div>
        <div className={"mt-5 flex items-center justify-center gap-3 transition-all duration-300 " + (done ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
          <ShieldCheck className="size-6 text-emerald-400" />
          <div className="text-center">
            <p className="font-display text-2xl font-bold tracking-[0.25em] text-emerald-300 boot-glow">ACCESO CONCEDIDO</p>
            <p className="text-xs tracking-[0.2em] text-sky-200/80">BIENVENIDO, {scr}</p>
          </div>
        </div>
        <p className="mt-6 text-center text-[10px] tracking-[0.2em] text-sky-500/50">Tocá o presioná Enter para continuar</p>
      </div>
    </div>
  );
}
