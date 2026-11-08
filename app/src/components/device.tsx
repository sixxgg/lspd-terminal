import { useEffect, useState, type ReactNode } from "react";
import { Wifi, WifiOff, BatteryFull, BatteryCharging, BatteryLow, BatteryMedium, MapPin, ShieldCheck } from "lucide-react";
import { usePref } from "@/lib/appearance";
import { LS, getNet, useStoreVersion } from "@/lib/store";
import { cn } from "@/lib/cn";

/* ---- barra de estado de la tablet: ubicación por zona horaria, fecha, latencia, red, batería y hora ---- */
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
const CITY = TZ.split("/").pop()?.replace(/_/g, " ") || "";
const REGION = (() => { try { const l = navigator.languages?.find(x => /-[A-Z]{2}$/i.test(x)) || navigator.language; const r = l.split("-")[1]?.toUpperCase();
  return r && r.length === 2 ? r : ""; } catch { return ""; } })();
const offTxt = () => { const m = -new Date().getTimezoneOffset(), h = Math.trunc(m / 60), mm = Math.abs(m % 60); return `UTC${m >= 0 ? "+" : "−"}${Math.abs(h)}${mm ? ":" + String(mm).padStart(2, "0") : ""}`; };
function useTick(ms: number) { const [, f] = useState(0); useEffect(() => { const i = setInterval(() => f(x => x + 1), ms); return () => clearInterval(i); }, [ms]); }
function Clock() {
  useTick(1000); const d = new Date();
  return <span className="clk">{d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}<span className="sec-s">:{String(d.getSeconds()).padStart(2, "0")}</span></span>;
}
function Today() { useTick(60000); const d = new Date();
  return <span className="opacity-80">{d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" }).replace(/[.,]/g, "")}</span>; }
type Batt = { level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void };
function Battery() {
  const [b, setB] = useState<{ l: number; c: boolean } | null>(null);
  useEffect(() => { const nav = navigator as unknown as { getBattery?: () => Promise<Batt> }; if (!nav.getBattery) return;
    void nav.getBattery().then(x => { const u = () => setB({ l: Math.round(x.level * 100), c: x.charging }); u(); x.addEventListener("levelchange", u); x.addEventListener("chargingchange", u); }).catch(() => {}); }, []);
  const l = b?.l ?? 100, I = b?.c ? BatteryCharging : l <= 20 ? BatteryLow : l <= 60 ? BatteryMedium : BatteryFull;
  return <span className={cn("flex items-center gap-1.5", l <= 20 && !b?.c && "text-red-400")} title={b ? `Batería ${l}%${b.c ? " · cargando" : ""}` : "Batería"}><I className="size-3.5" />{l}%</span>;
}
function Ping() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => { let alive = true;
    const go = async () => { if (document.hidden) return; const t = performance.now();
      try { await fetch("/next/version.json?p=" + Date.now(), { method: "HEAD", cache: "no-store" }); if (alive) setMs(Math.round(performance.now() - t)); } catch { if (alive) setMs(null); } };
    void go(); const i = setInterval(go, 45000); return () => { alive = false; clearInterval(i); }; }, []);
  const c = (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType?.toUpperCase();
  return ms == null ? null : <span className={cn("hidden lg:inline", ms > 400 ? "text-amber-400" : "")} title="Latencia con el servidor">{c ? c + " · " : ""}{ms} ms</span>;
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
            <div className="l flex items-center gap-3.5"><span>LSPD · {title}</span>
              {CITY && <span className="hidden items-center gap-1 opacity-80 xl:inline-flex" title={`Zona horaria ${TZ}`}><MapPin className="size-3" />{CITY}{REGION ? " · " + REGION : ""} · {offTxt()}</span>}
              <span className="hidden xl:inline"><Today /></span></div>
            <div className="r flex items-center gap-3.5"><span className={cn("sec inline-flex items-center gap-1", net === "off" && "off")} title="Conexión cifrada (HTTPS/TLS) con sesión protegida">{net === "off" ? "● Sin conexión" : <><ShieldCheck className="size-3" />Conexión segura</>}</span>
              <Ping />
              <span className={cn("inline-flex transition-colors", net === "off" ? "text-red-500" : net === "saving" ? "animate-pulse text-amber-400" : "")}>{net === "off" ? <WifiOff className="size-3.5" /> : <Wifi className="size-3.5" />}</span>
              <Clock /><Battery /></div>
          </div>
          <div id="app-scroll" className="scrollbar-thin">{children}</div>
          {crt}
        </div>
      </div>
    </>
  );
}
