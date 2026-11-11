import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/* busca una versión nueva publicada y ofrece actualizar (o se actualiza sola al volver a la pestaña) */
const reloadFresh = () => { location.replace("/next/?v=" + Date.now().toString(36) + location.hash); };
export function UpdateBar() {
  const [nueva, setNueva] = useState(false), [hide, setHide] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try { const r = await fetch("/next/version.json?t=" + Date.now(), { cache: "no-store" }); if (!r.ok) return; const j = await r.json();
        if (alive && j.b && j.b !== __BUILD__) setNueva(true); } catch { /* sin conexión */ }
    };
    void check(); const i = setInterval(check, 120000);
    const vis = () => { if (!document.hidden) void check(); }; document.addEventListener("visibilitychange", vis);
    return () => { alive = false; clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, []);
  if (!nueva || hide) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[75] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-brand-500/40 bg-white px-4 py-2.5 text-sm shadow-2xl dark:bg-slate-900">
      <RefreshCw className="size-4 text-brand-600 dark:text-brand-300" />
      <span>Hay una versión nueva de la terminal.</span>
      <button onClick={reloadFresh} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white dark:bg-brand-500">Actualizar ahora</button>
      <button onClick={() => setHide(true)} aria-label="Más tarde" className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"><X className="size-4" /></button>
    </div>
  );
}
