import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, RotateCw } from "lucide-react";
import { LS, ME_ROLES } from "@/lib/store";
import { usePref } from "@/lib/appearance";
import { APP_VERSION } from "@/sections/Novedades";

/* aviso de versión nueva: notificación del sistema que baja desde el borde de arriba de la pantalla de la tablet, como en un teléfono.
   Detrás, la pantalla se puede desenfocar (Apariencia). «Reiniciar» recarga sin caché; «Más tarde» o deslizarla hacia arriba la guarda
   hasta que salga otra versión. six la puede probar desde su menú de cuenta («Probar actualización»). */
const reloadFresh = () => { location.replace("/next/?v=" + Date.now().toString(36) + location.hash); };
const SKIP = "lspdt.next.updSkip", DONE = "lspdt.next.updDone";
export function UpdateBar() {
  const p = usePref();
  const [inst, setInst] = useState(false), [done, setDone] = useState<string | null>(() => { try { const v = sessionStorage.getItem(DONE); sessionStorage.removeItem(DONE); return v; } catch { return null; } });
  const [nueva, setNueva] = useState<{ b: string; v?: string } | null>(null), [out, setOut] = useState(false), [busy, setBusy] = useState(false), [dy, setDy] = useState(0);
  const y0 = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try { const r = await fetch("/next/version.json?t=" + Date.now(), { cache: "no-store" }); if (!r.ok) return; const j = await r.json() as { b?: string; v?: string };
        if (alive && j.b && j.b !== __BUILD__ && localStorage.getItem(SKIP) !== j.b) setNueva({ b: j.b, v: j.v }); } catch { /* sin conexión */ }
    };
    void check(); const i = setInterval(check, 120000);
    const vis = () => { if (!document.hidden) void check(); }; document.addEventListener("visibilitychange", vis);
    const test = () => { setOut(false); setDy(0); setBusy(false); setNueva({ b: "test", v: APP_VERSION }); }; window.addEventListener("lspdt:testupd", test);
    return () => { alive = false; clearInterval(i); document.removeEventListener("visibilitychange", vis); window.removeEventListener("lspdt:testupd", test); };
  }, []);
  const host0 = typeof document !== "undefined" ? document.querySelector<HTMLElement>(".tab-screen") : null;
  if (done && !nueva) return createPortal(<DoneToast v={done} inside={!!host0} onEnd={() => setDone(null)} />, host0 || document.body);
  if (!nueva) return null;
  const test = nueva.b === "test";
  const later = () => { setOut(true); if (!test) try { localStorage.setItem(SKIP, nueva.b); } catch { /* */ } setTimeout(() => { setNueva(null); setOut(false); setDy(0); setBusy(false); }, 380); };
  const restart = () => { setBusy(true); setTimeout(() => setInst(true), 350); };
  const logo = LS.get("lspdt.logo") || "/next/logo.svg", blur = p.updBlur ?? (ME_ROLES.six ? 10 : 0);
  /* dentro de la pantalla de la tablet (sale por el borde); sin marco, arriba de la ventana */
  const host = document.querySelector<HTMLElement>(".tab-screen"), inside = !!host;
  const ui = (
    <div className={inside ? "upd-host absolute inset-0 z-[95]" : "upd-host fixed inset-0 z-[95]"} role="alertdialog" aria-live="polite" aria-label="Actualización disponible">
      {blur > 0 && <div className={`upd-veil absolute inset-0 ${out ? "upd-veil-out" : ""}`} style={{ ["--ub" as string]: `${blur}px` }} onClick={later} />}
      <div className={`pointer-events-none absolute inset-x-0 flex justify-center px-3 ${inside ? "top-0" : "top-2"}`}>
        <div className={`upd-ntf pointer-events-auto w-[min(440px,100%)] touch-none select-none ${inside ? "upd-edge" : ""} ${out ? "upd-out" : "upd-in"}`} style={dy ? { transform: `translateY(${dy}px)`, transition: "none", animation: "none" } : undefined}
          onPointerDown={e => { if ((e.target as HTMLElement).closest("button")) return; y0.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={e => { if (y0.current !== null) setDy(Math.min(0, e.clientY - y0.current)); }}
          onPointerUp={() => { if (y0.current === null) return; y0.current = null; if (dy < -40) later(); else setDy(0); }}>
          <div className="flex items-center gap-2 px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
            <img src={logo} alt="" className="size-4 rounded object-contain" /><span>Terminal LSPD · Sistema</span><span className="ml-auto normal-case tracking-normal">ahora</span>
          </div>
          <div className="flex items-start gap-3 px-4 pb-3 pt-2">
            <span className="upd-ico grid size-11 shrink-0 place-items-center rounded-2xl">{busy ? <Loader2 className="size-5 animate-spin" /> : <RotateCw className="size-5" />}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-white">Actualización del sistema{nueva.v ? ` · v${nueva.v}` : ""}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-white/70">{busy ? "Reiniciando la terminal…" : "Hay una versión nueva instalada. Reiniciá la terminal para aplicarla; no se pierde nada de lo guardado."}</p>
            </div>
          </div>
          {!busy && <div className="grid grid-cols-2 border-t border-white/10 text-[13px] font-semibold">
            <button onClick={later} className="rounded-bl-[22px] py-2.5 text-white/60 transition hover:bg-white/5 hover:text-white">Más tarde</button>
            <button onClick={restart} className="rounded-br-[22px] border-l border-white/10 py-2.5 text-sky-300 transition hover:bg-sky-400/10">Reiniciar ahora</button>
          </div>}
          <span aria-hidden className="mx-auto mb-1.5 mt-0.5 block h-1 w-10 rounded-full bg-white/25" />
        </div>
      </div>
    </div>);
  if (inst) return createPortal(<Installing v={nueva.v || APP_VERSION} inside={inside} test={test} onEnd={() => {
    if (test) { setInst(false); setNueva(null); setBusy(false); return; }
    try { sessionStorage.setItem(DONE, nueva.v || ""); } catch { /* */ } reloadFresh(); }} />, host || document.body);
  return createPortal(ui, host || document.body);
}

/* pantalla de «actualización en curso»: baja el paquete nuevo de verdad (precarga la página y sus archivos) mientras muestra los pasos */
const STEPS = ["Descargando paquete de actualización", "Verificando firma digital", "Instalando módulos", "Migrando configuración local", "Optimizando la terminal", "Reiniciando el sistema"];
function Installing({ v, inside, test, onEnd }: { v: string; inside: boolean; test: boolean; onEnd: () => void }) {
  const [n, setN] = useState(0), [pct, setPct] = useState(0), [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    let alive = true, real = 0;
    /* precarga: la página nueva y sus scripts quedan en caché, así el reinicio es instantáneo */
    if (!test) void fetch("/next/?v=" + Date.now().toString(36), { cache: "reload" }).then(r => r.text()).then(h => Promise.all([...h.matchAll(/(?:src|href)="(\/next\/assets\/[^"]+)"/g)].map(m => fetch(m[1]).catch(() => null))))
      .catch(() => null).finally(() => { real = 1; });
    else real = 1;
    const t0 = Date.now(), MIN = 4200;
    const iv = setInterval(() => {
      if (!alive) return; const k = Math.min(1, (Date.now() - t0) / MIN), p = Math.round((real ? k : Math.min(k, 0.86)) * 100);
      setPct(p); const step = Math.min(STEPS.length - 1, Math.floor((p / 100) * STEPS.length));
      setN(o => { if (step > o) setLog(L => [...L.slice(-4), `0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0").toUpperCase()} · ${STEPS[o]} … OK`]); return step; });
      if (p >= 100) { clearInterval(iv); setTimeout(() => alive && onEnd(), 600); }
    }, 90);
    return () => { alive = false; clearInterval(iv); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const logo = LS.get("lspdt.logo.boot") || LS.get("lspdt.logo") || "/next/logo.svg", R = 54, C = 2 * Math.PI * R;
  return (
    <div role="status" aria-live="polite" aria-label="Actualización en curso" className={`upd-inst ${inside ? "absolute" : "fixed"} inset-0 z-[96] grid place-items-center overflow-hidden font-mono text-sky-100`}>
      <div aria-hidden className="boot-grid absolute inset-0" /><div aria-hidden className="boot-scan absolute inset-0" />
      <div className="relative flex w-[min(520px,calc(100%-32px))] flex-col items-center text-center">
        <div className="relative grid size-40 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="rgba(56,189,248,.12)" strokeWidth="5" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="url(#ug)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .2s linear" }} />
            <defs><linearGradient id="ug" x1="0" x2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#34d399" /></linearGradient></defs></svg>
          <span aria-hidden className="upd-orbit absolute inset-3 rounded-full" />
          <img src={logo} alt="" className="boot-logo size-16 object-contain" />
        </div>
        <p className="mt-5 text-[11px] tracking-[0.32em] text-sky-400/80">LSPD · MOBILE DATA TERMINAL</p>
        <p className="mt-1 font-display text-2xl font-bold tracking-[0.18em] text-white">ACTUALIZACIÓN EN CURSO</p>
        <p className="mt-1 text-xs tracking-[0.2em] text-emerald-300">INSTALANDO v{v}</p>
        <div className="mt-6 w-full">
          <div className="flex justify-between text-[11px] text-sky-300/80"><span className="truncate">{STEPS[n]}…</span><span className="tabular-nums">{pct}%</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sky-950"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400" style={{ width: pct + "%", transition: "width .2s linear" }} /></div>
        </div>
        <div className="mt-4 h-[5.5rem] w-full overflow-hidden rounded-lg border border-sky-400/15 bg-black/40 p-2.5 text-left text-[10.5px] leading-[1.55] text-sky-200/70">
          {log.map((l, i) => <div key={i + l} className="truncate">{l}</div>)}<span className="upd-caret inline-block h-3 w-1.5 bg-sky-400 align-middle" />
        </div>
        <p className="mt-4 text-[10px] tracking-[0.25em] text-amber-300/80">NO CIERRES NI RECARGUES LA TERMINAL</p>
      </div>
    </div>);
}
/* al volver del reinicio: aviso de que quedó actualizada */
function DoneToast({ v, inside, onEnd }: { v: string; inside: boolean; onEnd: () => void }) {
  const [out, setOut] = useState(false);
  useEffect(() => { const a = setTimeout(() => setOut(true), 3800), b = setTimeout(onEnd, 4200); return () => { clearTimeout(a); clearTimeout(b); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`pointer-events-none ${inside ? "absolute" : "fixed"} inset-x-0 top-0 z-[95] flex justify-center px-3`}>
      <div className={`upd-ntf flex w-[min(440px,100%)] items-center gap-3 px-4 py-3 ${inside ? "upd-edge" : ""} ${out ? "upd-out" : "upd-in"}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,.45)]"><Check className="size-5" /></span>
        <div className="min-w-0"><p className="text-[15px] font-bold leading-tight text-white">Terminal actualizada{v ? ` · v${v}` : ""}</p><p className="text-[13px] text-white/65">Todo listo. Ya estás usando la versión nueva.</p></div>
      </div>
    </div>);
}
