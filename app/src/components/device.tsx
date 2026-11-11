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
/* línea de datos estilo consola: nodo, canal, cifrado, sesión y paquetes; cambian despacio y cada dato a su ritmo */
const NODES = ["MR-10", "VB-04", "DP-02", "SD-07", "PB-01", "MW-12", "LM-03", "RH-05"], CIPH = ["AES-256-GCM", "CHACHA20-P1305", "AES-256-CBC", "TWOFISH-256", "SERPENT-256"], CHAN = ["TAC-1", "TAC-2", "DISP", "CMD", "OPS-3", "SEC-9"];
const hx = (n = 4) => Array.from({ length: n }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
const pick = <T,>(L: T[]) => L[Math.floor(Math.random() * L.length)];
function Uplink() {
  const [v, setV] = useState(() => ({ node: NODES[0], ch: CHAN[0], ci: CIPH[0], ses: `${hx()}·${hx()}·${hx()}`, sig: hx(8), pk: 4096, ttl: 64 }));
  useEffect(() => { let k = 0; const i = setInterval(() => { if (document.hidden) return; k++;
    setV(o => ({ ...o, sig: hx(8), pk: o.pk + 7 + Math.floor(Math.random() * 60), ...(k % 3 === 0 ? { ses: `${hx()}·${hx()}·${hx()}`, ttl: 48 + Math.floor(Math.random() * 80) } : {}),
      ...(k % 6 === 0 ? { ch: pick(CHAN) } : {}), ...(k % 9 === 0 ? { node: pick(NODES), ci: pick(CIPH) } : {}) })); }, 2500); return () => clearInterval(i); }, []);
  return <span className="uplink hidden xl:inline-flex" aria-hidden><b>LSPD-NET</b>▸ NODO {v.node} ▸ CANAL {v.ch} ▸ {v.ci} ▸ SESIÓN <span className="hx">0x{v.ses}</span> ▸ FIRMA <span className="hx">{v.sig}</span>
    <span className="hidden 2xl:inline">▸ PKT {v.pk.toLocaleString("es-AR")} ▸ TTL {v.ttl}</span><span className="cur">▮</span></span>;
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
