import { scrollTopApp, setDeptUi } from "@/lib/appearance";
import { Device } from "./components/device";
import { ErrorScreen, readCfg } from "./sections/six/fx";
import { UpdateBar } from "./components/update";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Loader2 } from "lucide-react";
import { Login, type PubInfo } from "./layout/Login";
import { Shell } from "./layout/Shell";
import { Home } from "./sections/Home";
import { MeCtx } from "./lib/me";
const lz = <T extends Record<string, unknown>>(f: () => Promise<T>, n: keyof T) => lazy(() => f().then(m => ({ default: m[n] as ComponentType<any> }))); // eslint-disable-line @typescript-eslint/no-explicit-any
const PerdidaArmamento = lz(() => import("./sections/PerdidaArmamento"), "PerdidaArmamento");
const Ascensos = lz(() => import("./sections/sup/Ascensos"), "Ascensos");
const T1080 = lz(() => import("./sections/sup/T1080"), "T1080");
const Alerta = lz(() => import("./sections/sup/Alerta"), "Alerta");
const Bodycam = lz(() => import("./sections/sup/Bodycam"), "Bodycam");
const Sargentos = lz(() => import("./sections/sgt/Sargentos"), "Sargentos");
const Six = lz(() => import("./sections/six/Six"), "Six");
const Timestamps = lz(() => import("./sections/Timestamps"), "Timestamps");
const Novedades = lz(() => import("./sections/Novedades"), "Novedades");
const Condecoraciones = lz(() => import("./sections/sup/Condecoraciones"), "Condecoraciones");
const Entrevistas = lz(() => import("./sections/sup/Entrevistas"), "Entrevistas");
const Votaciones = lz(() => import("./sections/sup/Votaciones"), "Votaciones");
const Feedback = lz(() => import("./sections/sup/Feedback"), "Feedback");
const Agentes = lz(() => import("./sections/sup/Agentes"), "Agentes");
const Informes = lz(() => import("./sections/Informes"), "Informes");
const Legal = lz(() => import("./sections/Legal"), "Legal");
const Division = lz(() => import("./sections/div/Division"), "Division");
const Permisos = lz(() => import("./sections/cap/Permisos"), "Permisos");
const EstadoRoster = lz(() => import("./sections/jef/Jefatura"), "EstadoRoster");
const HistorialVotaciones = lz(() => import("./sections/jef/Jefatura"), "HistorialVotaciones");
const AdmAccesos = lz(() => import("./sections/adm/Admin"), "AdmAccesos");
const AdmDatos = lz(() => import("./sections/adm/Admin"), "AdmDatos");
const AdmMarca = lz(() => import("./sections/adm/Admin"), "AdmMarca");
const Patrullas = lz(() => import("./sections/sup/Patrullas"), "Patrullas");
const FeedbackApp = lz(() => import("./sections/FeedbackApp"), "FeedbackApp");
const Huellas = lz(() => import("./sections/sup/Huellas"), "Huellas");
const RegistroPatrullas = lz(() => import("./sections/sup/RegistroPatrullas"), "RegistroPatrullas");
const Equipamiento = lz(() => import("./sections/cap/Equipamiento"), "Equipamiento");

import type { ReactNode } from "react";

export const VIEWS: Record<string, () => ReactNode> = {
  "sup/asc": () => <Ascensos />, "sup/t1080": () => <T1080 />, "sup/alt": () => <Alerta />, "sup/bod": () => <Bodycam />, "sup/cond": () => <Condecoraciones />, "sgt/exa": () => <Sargentos tab="exa" />, "sgt/ent": () => <Sargentos tab="ent" />, "sgt/list": () => <Sargentos tab="list" />, "sup/ent": () => <Entrevistas />, "sup/vot": () => <Votaciones />, "sup/fbk": () => <Feedback />, "cap/vot": () => <Votaciones />, "sup/pat": () => <Patrullas />, "sup/prof": () => <Agentes />, "age/prof": () => <Agentes />, "ini/nov": () => <Novedades />, "ini/ts": () => <Timestamps />, "inf/inf": () => <Informes />, "leg/ley": () => <Legal />, "sup/preg": () => <RegistroPatrullas />, "fb/env": () => <FeedbackApp />, "sup/hue": () => <Huellas />, "cap/equ": () => <Equipamiento />, "cap/perm": () => <Permisos />, "jef/ros": () => <EstadoRoster />, "jef/his": () => <HistorialVotaciones />,
  "adm/acc": () => <AdmAccesos />, "adm/brand": () => <AdmMarca />, "adm/data": () => <AdmDatos />,
};
import { AREAS, canArea, secsOf } from "./nav";
import { api, authApi } from "./lib/api";
import { BootScreen } from "./components/boot";
import { LS, ME_ROLES, goOffline, loadStore, storeHooks, useStoreVersion, type Me } from "./lib/store";
import { findAgent, getRoster, rankES } from "./lib/domain";
import { useFeedback } from "./components/feedback";

type Boot = { me: string | null; names: string[]; needCode: boolean; brand?: Record<string, string>; roster?: PubInfo["roster"]; data?: Parameters<typeof loadStore>[0] };

export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [nav, setNav] = useState(() => { try { const n = JSON.parse(localStorage.getItem("lspdt.next.nav") || "") as { a: string; s: string }; return n.a === "six" ? { a: "ini", s: "home" } : n; } catch { return { a: "ini", s: "home" }; } });
  const { toast } = useFeedback();
  useStoreVersion();

  const [fx, setFx] = useState<"" | "full" | "short">(""), [breach, setBreach] = useState(false);
  const endBreach = useCallback(() => { setBreach(false); setNav({ a: "six", s: "staff" }); scrollTopApp(); }, []);
  const enter = useCallback((d: Parameters<typeof loadStore>[0], fresh?: boolean) => { loadStore(d); setMe(d.me!);
    let seen = false; try { seen = !!sessionStorage.getItem("lspdt.next.booted"); sessionStorage.setItem("lspdt.next.booted", "1"); } catch { /* */ }
    if (fresh || !seen) setFx(fresh ? "full" : "short");
    /* limpieza: el código penal viejo guardado en la base ya no se usa (Legal es la única fuente); se borra una sola vez */
    if (LS.get("lspdt.penal") != null) LS.del("lspdt.penal"); }, []);
  const lost = useCallback(() => { goOffline(); setMe(null); toast("La sesión se cerró. Volvé a ingresar.", "err"); void api("/api/auth").then(r => setBoot(r as unknown as Boot)); }, [toast]);
  useEffect(() => { storeHooks(toast, lost); }, [toast, lost]);
  /* six: aviso cuando llega un feedback nuevo (lo trae la sincronización cada 5 s) */
  const fbKnown = useRef<Set<string> | null>(null);
  useEffect(() => { if (!me || !ME_ROLES.six) return; const ks = LS.keys("lspdt.six.fb.");
    if (!fbKnown.current) { fbKnown.current = new Set(ks); return; }
    for (const k of ks) if (!fbKnown.current.has(k)) { fbKnown.current.add(k); const t = LS.ro<{ by: string } | null>(k, null); if (t) toast(`📬 Nuevo feedback de ${t.by} · six → Notificaciones`); } });
  useEffect(() => {
    void api("/api/auth?full=1").then(r => { const b = r as unknown as Boot; setBoot(b); if (b.me && b.data) enter(b.data); });
  }, [enter]);
  useEffect(() => { const f = (e: Event) => { setNav((e as CustomEvent<{ a: string; s: string }>).detail); scrollTopApp(); }; window.addEventListener("lspd:go", f); return () => window.removeEventListener("lspd:go", f); }, []);
  useEffect(() => { if (nav.a !== "six") try { localStorage.setItem("lspdt.next.nav", JSON.stringify(nav)); } catch { /* */ } }, [nav]); /* six nunca queda como página de inicio */

  useEffect(() => { if (!me) return; const t = setTimeout(() => { void import("./sections/Informes"); void import("./sections/Legal"); }, 2500); return () => clearTimeout(t); }, [me]);
  useEffect(() => { /* favicon editable desde Administración → Marca e imágenes */
    const src = LS.get("lspdt.fav") || boot?.brand?.["lspdt.fav"] || LS.get("lspdt.logo") || boot?.brand?.["lspdt.logo"] || "/next/logo.svg";
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(l => { if (l.getAttribute("href") !== src) l.href = src; }); });
  useEffect(() => { if (me) setDeptUi(LS.json<Record<string, string>>("lspdt.ui", {})); });
  if (!boot) return <Device><div className="grid min-h-[var(--app-h,100dvh)] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div></Device>;
  if (!me) return <Device brand={boot.brand}><UpdateBar /><Login pub={boot} onDone={r => enter((r as { data: Parameters<typeof loadStore>[0] }).data, true)} /></Device>;

  const ag = findAgent(me.n), user = { n: me.n, r: ag?.r || me.r, p: ag?.p };
  if (nav.a === "six" && ME_ROLES.six) return <MeCtx.Provider value={user}><Suspense fallback={<div className="min-h-[100dvh] bg-black" />}><Six onExit={() => { setNav({ a: "ini", s: "home" }); scrollTopApp(); }} /></Suspense></MeCtx.Provider>;
  let area = AREAS.find(a => a.k === nav.a) || AREAS[0];
  if (!canArea(area, user.r)) area = AREAS[0];
  const SS = secsOf(area, user.r), sec = SS.find(s => s.k === nav.s) || SS[0];
  const go = (a: string, s: string) => { if (a === "six") { if (ME_ROLES.six) { void import("./sections/six/Six"); if (readCfg().error) setBreach(true); else endBreach(); } return; } setNav({ a, s }); scrollTopApp(); };
  const logout = async () => { await authApi({ a: "logout" }); goOffline(); setMe(null); const r = await api("/api/auth"); setBoot(r as unknown as Boot); };

  let view;
  if (sec.k === "home") view = <Home me={user} go={go} />;
  else if (area.k === "sup" && sec.k === "parm") view = <PerdidaArmamento me={user} />;
  else if (area.k === "div") view = <Division d={sec.l} />;
  else if (VIEWS[`${area.k}/${sec.k}`]) view = VIEWS[`${area.k}/${sec.k}`]();
  else view = null;
  return <Device><MeCtx.Provider value={user}><Shell me={user} area={area} sec={sec} go={go} onLogout={logout}><div key={`${area.k}/${sec.k}`} className="animate-fade-in"><Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>}>{view}</Suspense></div></Shell><UpdateBar /></MeCtx.Provider>{fx && <BootScreen name={me.n} rank={rankES(user.r)} badge={user.p} agents={getRoster().length} short={fx === "short"} onDone={() => setFx("")} />}{breach && <ErrorScreen onDone={endBreach} />}</Device>;
}
