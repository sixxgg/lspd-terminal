import { useEffect, useState, type ReactNode } from "react";
import { Wifi, WifiOff, BatteryFull } from "lucide-react";
import { usePref } from "@/lib/appearance";
import { LS, getNet, useStoreVersion } from "@/lib/store";
import { cn } from "@/lib/cn";

function Clock() {
  const f = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const [t, setT] = useState(f); useEffect(() => { const i = setInterval(() => setT(f()), 5000); return () => clearInterval(i); }, []);
  return <span className="clk">{t}</span>;
}
/* marco de tablet + efecto de pantalla; sin marco, el efecto cubre la ventana */
export function Device({ children, brand }: { children: ReactNode; brand?: Record<string, string> }) {
  const p = usePref(); useStoreVersion();
  const net = getNet(), ui = LS.json<Record<string, string>>("lspdt.ui", {}), title = (ui.title || "").trim() || "Terminal de Mando";
  const bg = LS.get("lspdt.bg.tablet") || brand?.["lspdt.bg.tablet"] || "";
  const crt = <div className="crt-host" aria-hidden="true"><div className="crt" /></div>;
  if (!p.frame) return <>{children}{crt}</>;
  return (
    <>
      <div className={cn("backdrop", bg && "img")} style={bg ? { backgroundImage: `url("${bg}")` } : undefined} />
      <div className="tablet">
        <div className="tab-btns" />
        <div className="tab-screen bg-slate-50 dark:bg-slate-950">
          <div className="tab-status">
            <div className="l"><span>LSPD · {title}</span></div>
            <div className="r flex items-center gap-3.5"><span className={cn("sec", net === "off" && "off")}>{net === "off" ? "● Sin conexión" : "● Conexión segura"}</span>
              <span className={cn("inline-flex transition-colors", net === "off" ? "text-red-500" : net === "saving" ? "animate-pulse text-amber-400" : "")}>{net === "off" ? <WifiOff className="size-3.5" /> : <Wifi className="size-3.5" />}</span>
              <Clock /><span className="flex items-center gap-1.5"><BatteryFull className="size-3.5" />100%</span></div>
          </div>
          <div id="app-scroll" className="scrollbar-thin">{children}</div>
          {crt}
        </div>
      </div>
    </>
  );
}
