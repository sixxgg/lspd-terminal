import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { LS } from "@/lib/store";
import { APP_VERSION } from "@/sections/Novedades";

/* aviso de versión nueva: notificación del sistema de la tablet que baja desde arriba, como en un teléfono.
   «Reiniciar» recarga sin caché; «Más tarde» o deslizarla hacia arriba la guarda hasta que salga otra versión. */
const reloadFresh = () => { location.replace("/next/?v=" + Date.now().toString(36) + location.hash); };
const SKIP = "lspdt.next.updSkip";
export function UpdateBar() {
  const [nueva, setNueva] = useState<{ b: string; v?: string } | null>(null), [out, setOut] = useState(false), [busy, setBusy] = useState(false), [dy, setDy] = useState(0);
  const y0 = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try { const r = await fetch("/next/version.json?t=" + Date.now(), { cache: "no-store" }); if (!r.ok) return; const j = await r.json() as { b?: string; v?: string };
        if (alive && j.b && j.b !== __BUILD__ && localStorage.getItem(SKIP) !== j.b) setNueva({ b: j.b, v: j.v }); } catch { /* sin conexión */ }
    };
    void check(); const i = setInterval(check, 120000);
    /* six: «Probar actualización» en su menú muestra el aviso sin que haya una versión nueva */
    const test = () => { setOut(false); setDy(0); setBusy(false); setNueva({ b: "test", v: APP_VERSION }); }; window.addEventListener("lspdt:testupd", test);
    const vis = () => { if (!document.hidden) void check(); }; document.addEventListener("visibilitychange", vis);
    return () => { alive = false; clearInterval(i); document.removeEventListener("visibilitychange", vis); window.removeEventListener("lspdt:testupd", test); };
  }, []);
  if (!nueva) return null;
  const test = nueva.b === "test";
  const later = () => { setOut(true); if (!test) try { localStorage.setItem(SKIP, nueva.b); } catch { /* */ } setTimeout(() => { setNueva(null); setOut(false); setDy(0); }, 320); };
  const restart = () => { setBusy(true); setTimeout(test ? later : reloadFresh, test ? 1600 : 900); };
  const logo = LS.get("lspdt.logo") || "/next/logo.svg";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[95] flex justify-center px-3" role="alertdialog" aria-live="polite" aria-label="Actualización disponible">
      <div className={`upd-ntf pointer-events-auto w-[min(440px,100%)] touch-none select-none ${out ? "upd-out" : "upd-in"}`} style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
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
  );
}
