/* Vista de invitado de la sección Robos de six (link ?robos=…): Catálogo y Artículos con el tema y los efectos de six,
   sin iniciar sesión y sin el Excel. El link lo crea six, vence solo y se puede revocar. */
import "./six.css";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { NS, Rain, cfg0, colorOf, vars, type SixCfg } from "./fx";
import { RobosTab } from "./RobosTab";

type D = { ok?: boolean; v?: string | null; exp?: number; title?: string; by?: string; msg?: string };
export function RobosShare({ tok }: { tok: string }) {
  NS.id = "six";
  const [D, setD] = useState<D | null>(null);
  useEffect(() => { document.documentElement.classList.add("dark"); document.title = "Robos · six";
    void api(`/api/share?t=${tok}`).then(r => setD(r.__s === 200 ? { ...(r as D), ok: true } : { msg: (r.msg as string) || "El link no es válido" })); }, [tok]);
  let c: SixCfg = cfg0("six"); try { if (D?.v) c = { ...c, ...JSON.parse(D.v) }; } catch { /* tema por defecto */ }
  const color = colorOf(c.tema), left = D?.exp ? D.exp - Date.now() : 0;
  const lt = left > 864e5 ? `${Math.round(left / 864e5)} días` : left > 36e5 ? `${Math.round(left / 36e5)} h` : `${Math.max(1, Math.round(left / 6e4))} min`;
  return (
    <div className={cn("six-root relative min-h-[100dvh] overflow-hidden bg-[#030407] font-mono text-slate-300", c.flicker && "six-flk", c.tema === "arcoiris" && "six-rainbow")}
      data-bd={c.bd} style={{ ...vars(color), ["--gl" as string]: [0.35, 1, 1.8][c.glow] }}>
      {c.grid && <div className="six-grid pointer-events-none fixed inset-0" aria-hidden />}
      {c.lluvia > 0 && <div className="pointer-events-none fixed inset-0" aria-hidden><Rain color={color} opacity={[0, 0.06, 0.11, 0.18][c.lluvia]} /></div>}
      <div className="six-vignette pointer-events-none fixed inset-0" aria-hidden />
      {c.scan && <div className="six-scan pointer-events-none fixed inset-0 z-40" aria-hidden />}
      <header className="sticky top-0 z-30 border-b border-six/25 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4">
          <span className="six-logo text-3xl font-black" data-t="six">six</span>
          <div className="text-[10px] leading-tight text-slate-500"><p>VISTA COMPARTIDA · <span className="text-six">ROBOS</span></p><p>SOLO LECTURA{D?.title ? ` · ${D.title.toUpperCase()}` : ""}</p></div>
          {D?.ok && <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-six/40 bg-six/10 px-3 py-1 font-sans text-[11px] font-semibold text-six"><span className="size-1.5 animate-pulse rounded-full bg-six" />Vence en {lt}</span>}
        </div>
        <div className="six-line h-px" />
      </header>
      <main className="six-in relative mx-auto max-w-[1600px] px-4 py-6">
        {!D ? <p className="py-20 text-center font-sans text-slate-500">Cargando…</p>
          : !D.ok ? <div className="six-panel mx-auto grid max-w-md place-items-center gap-3 rounded-2xl p-10 text-center font-sans"><Lock className="size-8 text-six" /><p className="font-semibold text-white">{D.msg}</p><p className="text-sm text-slate-500">Pedile un link nuevo a six.</p></div>
          : <RobosTab share />}
      </main>
      <footer className="relative pb-6 text-center text-[10px] tracking-[0.3em] text-slate-600">six · VISTA COMPARTIDA</footer>
    </div>);
}
