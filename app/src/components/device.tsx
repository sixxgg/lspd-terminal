import { useEffect, useState, type ReactNode } from "react";
import { WifiOff, BatteryFull, BatteryCharging, BatteryLow, BatteryMedium, MapPin, ShieldCheck } from "lucide-react";
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
/* señal: barras según la latencia con el servidor (detalle en el tooltip) */
function Signal({ off }: { off: boolean }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => { let alive = true;
    const go = async () => { if (document.hidden) return; const t = performance.now();
      try { await fetch("/next/version.json?p=" + Date.now(), { method: "HEAD", cache: "no-store" }); if (alive) setMs(Math.round(performance.now() - t)); } catch { if (alive) setMs(null); } };
    void go(); const i = setInterval(go, 45000); return () => { alive = false; clearInterval(i); }; }, []);
  const n = off || ms == null ? 0 : ms < 120 ? 4 : ms < 250 ? 3 : ms < 500 ? 2 : 1;
  const c = (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType?.toUpperCase();
  return <span className={cn("sig", off && "off")} title={off ? "Sin conexión" : `Señal ${n}/4${ms != null ? ` · ${ms} ms` : ""}${c ? ` · ${c}` : ""}`}>{[1, 2, 3, 4].map(i => <i key={i} className={i <= n ? "on" : ""} style={{ height: 3 + i * 2 }} />)}</span>;
}
/* línea de datos estilo consola: nodo, cifrado y un código que cambia */
function Uplink() {
  useTick(1800);
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return <span className="uplink hidden 2xl:inline-flex" aria-hidden><b>LSPD-NET</b>▸ NODO MR-10 ▸ AES-256 ▸ <span className="hx">0x{hex()}·{hex()}</span><span className="cur">▮</span></span>;
}

/* marco de tablet + efecto de pantalla; sin marco, el efecto cubre la ventana */
export function Device({ children, brand }: { children: ReactNode; brand?: Record<string, string> }) {
  const p = usePref(); useStoreVersion();
  const net = getNet();
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
            <div className="l flex items-center gap-4">
              {CITY && <span className="inline-flex items-center gap-1.5" title={`Zona horaria ${TZ} · ${offTxt()}`}><MapPin className="size-3 text-sky-400" />{CITY}{REGION ? " · " + REGION : ""}</span>}
              <Today /><Uplink /></div>
            <div className="r flex items-center gap-4">
              <span className={cn("sec inline-flex items-center gap-1.5", net === "off" && "off")} title={net === "off" ? "Sin conexión" : "Conexión cifrada (HTTPS/TLS) con sesión protegida"}>{net === "off" ? <WifiOff className="size-3" /> : <ShieldCheck className="size-3" />}{net === "off" ? "Sin conexión" : "Segura"}</span>
              <Signal off={net === "off"} /><Clock /><Battery /></div>
          </div>
          <div id="app-scroll" className="scrollbar-thin">{children}</div>
          {crt}
        </div>
      </div>
    </>
  );
}
