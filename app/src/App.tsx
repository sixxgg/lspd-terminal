import { scrollTopApp, setDeptUi } from "@/lib/appearance";
import { Device } from "./components/device";
import { ErrorScreen } from "./sections/six/ErrorScreen";
import { readCfg } from "./sections/six/cfg";
import { UpdateBar } from "./components/update";
import { CalAlert } from "./components/calalert";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Login, type PubInfo } from "./layout/Login";
import { Shell } from "./layout/Shell";
import { Home } from "./sections/Home";
import { MeCtx } from "./lib/me";
import { Division, PerdidaArmamento, VIEWS, lz } from "./routes";
const Six = lz(() => import("./sections/six/Six"), "Six");
const PublicBoard = lz(() => import("./sections/Pizarra"), "PublicBoard");
const SHARE = new URLSearchParams(location.search).get("pizarra"), VER = new URLSearchParams(location.search).get("ver");
const PublicSection = lz(() => import("./sections/div/DivTools"), "PublicSection");
import { AREAS, canArea, secsOf } from "./nav";
import { api, authApi } from "./lib/api";
import { BootScreen } from "./components/boot";
import { ForcePw } from "./layout/ForcePw";
import { createPortal } from "react-dom";
import { rosterDivs } from "./lib/units";
import { PROF, profOk } from "./lib/nick";
import { prevGet, prevStop } from "./lib/preview";
import { Eye } from "lucide-react";
import { goodTier, stampLogros } from "./components/logros";
import { confetti } from "./lib/confetti";
import { ACC, LS, ME_ROLES, PREV, goOffline, loadStore, storeHooks, useStoreVersion, type Me } from "./lib/store";
import { emailOf, findAgent, getRoster, rankES } from "./lib/domain";
import { useFeedback } from "./components/feedback";

type Boot = { me: string | null; names: string[]; brand?: Record<string, string>; roster?: PubInfo["roster"]; data?: Parameters<typeof loadStore>[0] };

export default function App() {
  /* enlace temporal de una pizarra: se ve sin iniciar sesión */
  if (SHARE && /^[a-f0-9]{32}$/.test(SHARE)) return <Suspense fallback={null}><PublicBoard tok={SHARE} /></Suspense>;
  /* enlace temporal de una sección (uniformidad): solo lectura, sin sesión */
  if (VER && /^[a-f0-9]{32}$/.test(VER)) return <Suspense fallback={null}><PublicSection tok={VER} /></Suspense>;
  return <Main />;
}
/* barra de «Ver como»: recuerda que es una vista previa y permite salir */
function PrevBar({ r }: { r: string }) {
  return <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[96] flex justify-center px-3"><div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-amber-400/40 bg-slate-950/90 py-1.5 pl-3 pr-1.5 text-sm text-amber-100 shadow-[0_0_30px_-8px_rgba(251,191,36,.6)] backdrop-blur">
    <Eye className="size-4 text-amber-300" /><span>Vista previa como <b>{rankES(r)}</b> sin divisiones</span><button onClick={prevStop} className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 hover:bg-amber-300">Salir</button></div></div>;
}
/* la apariencia por defecto del depto (tema, puntero, marca del marco) viene pública: se aplica ya en el ingreso */
const deptFromBrand = (b: Boot) => { const u = b.brand?.["lspdt.ui"]; if (u) try { setDeptUi(JSON.parse(u)); } catch { /* */ } };
function Main() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [nav, setNav] = useState(() => { try { const n = JSON.parse(localStorage.getItem("lspdt.next.nav") || "") as { a: string; s: string }; return n.a === "six" || n.a === "anita" ? { a: "ini", s: "home" } : n; } catch { return { a: "ini", s: "home" }; } });
  const { toast } = useFeedback();
  const sv = useStoreVersion();

  const [fx, setFx] = useState<"" | "full" | "short">(""), [breach, setBreach] = useState(false);
  const endBreach = useCallback(() => { setBreach(false); setNav({ a: "six", s: "staff" }); scrollTopApp(); }, []);
  const enter = useCallback((d: Parameters<typeof loadStore>[0], fresh?: boolean) => {
    /* «Ver como» (solo administración): otra identidad sin divisiones ni permisos */
    const pv = prevGet(); if (pv && d.me?.admin) { PREV.on = true; d = { ...d, me: { n: "Vista previa", r: pv.r, admin: false, owner: false, six: false, anita: false } }; }
    PREV.must = !!d.me?.must; loadStore(d); setMe(d.me!);
    let seen = false; try { seen = !!sessionStorage.getItem("lspdt.next.booted"); sessionStorage.setItem("lspdt.next.booted", "1"); } catch { /* */ }
    if (fresh || !seen) setFx(fresh ? "full" : "short");
    /* limpieza: el código penal viejo guardado en la base ya no se usa (Legal es la única fuente); se borra una sola vez */
    if (LS.get("lspdt.penal") != null) LS.del("lspdt.penal"); }, []);
  const lost = useCallback(() => { goOffline(); setMe(null); toast("La sesión se cerró. Volvé a ingresar.", "err"); void api("/api/auth").then(r => { deptFromBrand(r as unknown as Boot); setBoot(r as unknown as Boot); }); }, [toast]);
  useEffect(() => { storeHooks(toast, lost); }, [toast, lost]);
  /* enlace directo desde Discord (?ir=six-not): abre six en Notificaciones */
  useEffect(() => { if (!me) return; const ir = new URLSearchParams(location.search).get("ir"); if (!ir) return;
    if (ir === "six-not" && ME_ROLES.six) setNav({ a: "six", s: "not" }); history.replaceState(null, "", location.pathname); }, [me]);
  /* six: aviso cuando llega un feedback nuevo (lo trae la sincronización cada 5 s) */
  const fbKnown = useRef<Set<string> | null>(null);
  useEffect(() => { if (!me || !ME_ROLES.six) return; const ks = LS.keys("lspdt.six.fb.");
    if (!fbKnown.current) { fbKnown.current = new Set(ks); return; }
    for (const k of ks) if (!fbKnown.current.has(k)) { fbKnown.current.add(k); const t = LS.ro<{ by: string; who?: string } | null>(k, null); if (t) toast(`💗 Nuevo feedback de ${t.who || t.by} · six → Notificaciones`); } });
  useEffect(() => {
    void api("/api/auth?full=1").then(r => { const b = r as unknown as Boot; ACC.names = b.names || []; deptFromBrand(b); setBoot(b); if (b.me && b.data) enter(b.data); });
  }, [enter]);
  useEffect(() => { const f = (e: Event) => { setNav((e as CustomEvent<{ a: string; s: string }>).detail); scrollTopApp(); }; window.addEventListener("lspd:go", f); return () => window.removeEventListener("lspd:go", f); }, []);
  useEffect(() => { if (nav.a !== "six" && nav.a !== "anita") try { localStorage.setItem("lspdt.next.nav", JSON.stringify(nav)); } catch { /* */ } }, [nav]); /* six nunca queda como página de inicio */

  useEffect(() => { if (!me) return; const t = setTimeout(() => { void import("./sections/Informes"); void import("./sections/Legal"); }, 2500); return () => clearTimeout(t); }, [me]);
  /* perfil: fecha de ingreso (una vez) y última visita (cada 30 min); a six se le pasa lo que tenía en su perfil viejo */
  useEffect(() => { if (!me) return; const k = `lspdt.uprof.${emailOf(me.n).split("@")[0]}`, p = LS.json<{ since?: number; seen?: number; bio?: string }>(k, {}), now = Date.now();
    if (p.since && p.seen && now - p.seen < 30 * 60e3) return;
    const old = ME_ROLES.six && !p.bio ? LS.json<{ bio?: string }>("lspdt.six.profile", {}).bio : undefined, ban = ME_ROLES.six && !LS.get(k + ".ban") ? LS.get("lspdt.six.pban") : null;
    if (ban) LS.set(k + ".ban", ban);
    const save = (since?: number) => LS.setJSON(k, { ...LS.json(k, {}), seen: now, ...(since ? { since } : {}), ...(old ? { bio: old } : {}) });
    if (p.since) save(); else void authApi({ a: "info" }).then(r => save(r.__s === 200 ? r.c : now)); }, [me]);
  if (me) PROF.me = me.n;
  /* logros (perfiles BETA): sella los nuevos; los raros o mejores tiran confeti */
  useEffect(() => { if (!me || !profOk(me.n) || !ACC.names.length) return;
    stampLogros(me.n, me.r, l => { if (goodTier(l.tier)) { confetti(); toast(`¡Logro desbloqueado: ${l.t}!`); } }); }, [me, sv]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (me && LS.get("lspdt.ui") != null) setDeptUi(LS.json<Record<string, string>>("lspdt.ui", {})); });
  if (!boot) return <Device><div className="grid min-h-[var(--app-h,100dvh)] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div></Device>;
  if (!me) return <Device brand={boot.brand}><UpdateBar /><Login pub={boot} onDone={r => enter((r as { data: Parameters<typeof loadStore>[0] }).data, true)} /></Device>;

  const ag = findAgent(me.n), user = { n: me.n, r: ag?.r || me.r, p: ag?.p };
  if (nav.a === "anita" && ME_ROLES.anita && !me.must) return <MeCtx.Provider value={user}><Suspense fallback={<div className="min-h-[100dvh] bg-black" />}><Six who="anita" onExit={() => { setNav({ a: "ini", s: "home" }); scrollTopApp(); }} /></Suspense></MeCtx.Provider>;
  if (nav.a === "six" && ME_ROLES.six && !me.must) return <MeCtx.Provider value={user}><Suspense fallback={<div className="min-h-[100dvh] bg-black" />}><Six start={nav.s === "not" ? "not" : "ini"} onExit={() => { setNav({ a: "ini", s: "home" }); scrollTopApp(); }} /></Suspense></MeCtx.Provider>;
  let area = AREAS.find(a => a.k === nav.a) || AREAS[0];
  if (!canArea(area, user.r)) area = AREAS[0];
  const SS = secsOf(area, user.r), sec = SS.find(s => s.k === nav.s) || SS[0];
  const go = (a: string, s: string) => { if (a === "anita") { if (ME_ROLES.anita) { setNav({ a, s }); scrollTopApp(); } return; } if (a === "six") { if (ME_ROLES.six) { void import("./sections/six/Six"); if (readCfg().error) setBreach(true); else endBreach(); } return; } setNav({ a, s }); scrollTopApp(); };
  const logout = async () => { await authApi({ a: "logout" }); goOffline(); setMe(null); const r = await api("/api/auth"); setBoot(r as unknown as Boot); };

  let view;
  if (sec.k === "home") view = <Home me={user} go={go} />;
  else if (area.k === "sup" && sec.k === "parm") view = <PerdidaArmamento me={user} />;
  else if (area.k === "div") view = <Division d={sec.l} />;
  else if (VIEWS[`${area.k}/${sec.k}`]) view = VIEWS[`${area.k}/${sec.k}`]();
  else view = null;
  return <Device><MeCtx.Provider value={user}><Shell me={user} area={area} sec={sec} go={go} onLogout={logout}><div key={`${area.k}/${sec.k}`} className="animate-fade-in"><Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>}>{view}</Suspense></div></Shell><UpdateBar />{!fx && <CalAlert me={user.n} />}{PREV.on && <PrevBar r={user.r} />}</MeCtx.Provider>{fx && <BootScreen name={me.n} rank={rankES(user.r)} badge={user.p} agents={getRoster().length} no={ACC.names.indexOf(me.n) + 1 || undefined} divs={rosterDivs(me.n)} short={fx === "short"} onDone={() => setFx("")} />}{breach && <ErrorScreen onDone={endBreach} />}{me.must && !PREV.on && <ForcePwPortal n={me.n} onDone={() => { PREV.must = false; setMe({ ...me, must: false }); toast("Contraseña actualizada. ¡Listo!"); }} onLogout={logout} />}</Device>;
}

/* el cambio obligatorio de contraseña va dentro de la pantalla de la tablet (o arriba de todo sin marco) */
function ForcePwPortal(p: { n: string; onDone: () => void; onLogout: () => void }) {
  const host = document.querySelector<HTMLElement>(".tab-screen");
  return createPortal(<div className={host ? "absolute inset-0 z-[90]" : "fixed inset-0 z-[90]"}><ForcePw {...p} /></div>, host || document.body);
}
