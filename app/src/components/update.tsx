import { useEffect, useState } from "react";
import { ArrowDownToLine, Sparkles, X } from "lucide-react";

/* aviso de versión nueva: una pastilla arriba al centro que baja con animación; «Actualizar» recarga sin caché.
   Si se cierra, vuelve a aparecer recién cuando salga otra versión distinta. */
const reloadFresh = () => { location.replace("/next/?v=" + Date.now().toString(36) + location.hash); };
const SKIP = "lspdt.next.updSkip";
export function UpdateBar() {
  const [nueva, setNueva] = useState<{ b: string; v?: string } | null>(null), [out, setOut] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try { const r = await fetch("/next/version.json?t=" + Date.now(), { cache: "no-store" }); if (!r.ok) return; const j = await r.json() as { b?: string; v?: string };
        if (alive && j.b && j.b !== __BUILD__ && localStorage.getItem(SKIP) !== j.b) setNueva({ b: j.b, v: j.v }); } catch { /* sin conexión */ }
    };
    void check(); const i = setInterval(check, 120000);
    const vis = () => { if (!document.hidden) void check(); }; document.addEventListener("visibilitychange", vis);
    return () => { alive = false; clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, []);
  if (!nueva) return null;
  const later = () => { setOut(true); try { localStorage.setItem(SKIP, nueva.b); } catch { /* */ } setTimeout(() => setNueva(null), 280); };
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[95] flex justify-center px-3" role="status" aria-live="polite">
      <div className={`upd-pill pointer-events-auto flex max-w-full items-center gap-3 rounded-full py-1.5 pl-1.5 pr-2 text-sm text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,.6)] ${out ? "upd-out" : "upd-in"}`}>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15"><Sparkles className="size-4" /></span>
        <span className="min-w-0 truncate"><b className="font-semibold">Nueva versión{nueva.v ? ` v${nueva.v}` : ""}</b><span className="hidden text-white/75 sm:inline"> · ya está disponible</span></span>
        <button onClick={reloadFresh} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-white/90"><ArrowDownToLine className="size-3.5" />Actualizar</button>
        <button onClick={later} aria-label="Más tarde" title="Más tarde" className="grid size-7 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"><X className="size-4" /></button>
      </div>
    </div>
  );
}
