import { scrollTopApp, setDeptUi } from "@/lib/appearance";
import { Device } from "./components/device";
import { ErrorScreen } from "./sections/six/ErrorScreen";
import { readCfg } from "./sections/six/cfg";
import { UPD_RESUME, UpdateBar } from "./components/update";
import { LoginOps, OpsLoad } from "./components/opsload";
import { CalAlert } from "./components/calalert";
import { ExamWatch } from "./components/mdexam";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Login, type PubInfo } from "./layout/Login";
import { Shell } from "./layout/Shell";
import { Home } from "./sections/Home";
import { MeCtx } from "./lib/me";
import { Division, PerdidaArmamento, VIEWS, lz } from "./routes";
import { cn } from "./lib/cn";
const Six = lz(() => import("./sections/six/Six"), "Six");
const PublicBoard = lz(() => import("./sections/Pizarra"), "PublicBoard");
const QS = new URLSearchParams(location.search), SHARE = QS.get("pizarra"), VER = QS.get("ver"), ROB = QS.get("robos"), INV = QS.get("inv");
const RobosShare = lz(() => import("./sections/six/RobosShare"), "RobosShare");
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
import { JUMP, jumpNow } from "./lib/jump";
import { ACC, GUEST, LS, ME_ROLES, PREV, goOffline, loadStore, storeHooks, useStoreVersion, type Me } from "./lib/store";
import { emailOf, findAgent, getRoster, rankES } from "./lib/domain";
import { useFeedback } from "./components/feedback";
import { APP_VERSION } from "./sections/Novedades";

type Boot = { me: string | null; names: string[]; brand?: Record<string, string>; roster?: PubInfo["roster"]; data?: Parameters<typeof loadStore>[0] };

export default function App() {
  /* enlace temporal de una pizarra: se ve sin iniciar sesión */
  if (SHARE && /^[a-f0-9]{32}$/.test(SHARE)) return <Suspense fallback={null}><PublicBoard tok={SHARE} /></Suspense>;
  /* enlace temporal de una sección (uniformidad): solo lectura, sin sesión */
  if (VER && /^[a-f0-9]{32}$/.test(VER)) return <Suspense fallback={null}><PublicSection tok={VER} /></Suspense>;
  /* sección Robos de six compartida por link: catálogo y artículos, solo lectura */
  if (ROB && /^[a-f0-9]{32}$/.test(ROB)) return <Suspense fallback={null}><RobosShare tok={ROB} /></Suspense>;
  /* invitación de six: la terminal sin iniciar sesión, solo lectura y solo las secciones que eligió */
  if (INV && /^[a-f0-9]{32}$/.test(INV)) return <GuestMain tok={INV} />;
  return <Main />;
}
/* invitado: carga los datos del link y muestra la terminal con el menú recortado; nada se guarda */
function GuestMain({ tok }: { tok: string }) {
  const [st, setSt] = useState<"load" | "ok" | "bad">("load"), [msg, setMsg] = useState("");
  const [nav, setNav] = useState({ a: "ini", s: "home" });
  const { toast } = useFeedback();
  useStoreVersion();
  useEffect(() => { storeHooks(toast, () => {}); }, [toast]);
  useEffect(() => {
    const pull = (first: boolean) => api(`/api/share?t=${tok}${first ? "" : "&since=1"}`).then(r => {
      if (r.__s !== 200 || !r.guest) { if (first) { setMsg(r.msg || "No se pudo abrir el link"); setSt("bad"); } return; }
      Object.assign(GUEST, { on: true, secs: r.secs || [], title: r.title || "Invitado", exp: r.exp || 0, q: Date.now() + 2500 });
      loadStore({ store: r.store, kt: r.kt, t: r.t, defRoster: r.defRoster, me: { n: "Invitado", r: "", admin: false, owner: false } }, true);
      if (first) { const u = r.store?.["lspdt.ui"]; if (u) try { setDeptUi(JSON.parse(u)); } catch { /* */ } setSt("ok"); } });
    void pull(true);
    /* se refresca solo cada minuto (lo nuevo que carguen los agentes) */
    const i = setInterval(() => { if (!document.hidden) void pull(false); }, 60e3); return () => clearInterval(i);
  }, [tok]);
  useEffect(() => { const f = (e: Event) => { setNav((e as CustomEvent<{ a: string; s: string }>).detail); scrollTopApp(); }; window.addEventListener("lspd:go", f); return () => window.removeEventListener("lspd:go", f); }, []);
  const login = () => { location.href = location.pathname; };
  if (st === "load") return <Device><div className="grid min-h-[var(--app-h,100dvh)] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div></Device>;
  if (st === "bad") return <Device><div className="grid min-h-[var(--app-h,100dvh)] place-items-center p-6"><div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
    <Eye className="mx-auto size-8 text-amber-500" /><h1 className="mt-3 font-display text-xl font-bold">Link de invitado</h1><p className="mt-1 text-sm text-slate-500">{msg}</p>
    <button onClick={login} className="mt-5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 dark:bg-brand-500">Ir a iniciar sesión</button></div></div></Device>;
  const user = { n: "Invitado", r: "" };
  let area = AREAS.find(a => a.k === nav.a) || AREAS[0];
  if (!canArea(area, "")) area = AREAS[0];
  const SS = secsOf(area, ""), sec = SS.find(s => s.k === nav.s) || SS[0];
  const go = (a: string, s: string) => { if (a === "six" || a === "anita" || a === "me") return; GUEST.q = Date.now() + 2000; setNav({ a, s }); scrollTopApp(); };
  const view = sec.k === "home" ? <Home me={user} go={go} /> : VIEWS[`${area.k}/${sec.k}`]?.() ?? null;
  return <Device><MeCtx.Provider value={user}><Shell me={user} area={area} sec={sec} go={go} onLogout={login}><div key={`${area.k}/${sec.k}`} className="animate-fade-in"><Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>}>{view}</Suspense></div></Shell><UpdateBar /></MeCtx.Provider></Device>;
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
  /* al recargar vuelve a donde estabas; el panel de six/Anita solo se recuerda en esta pestaña (al abrir la terminal de cero arranca en el inicio) */
  const [nav, setNav] = useState(() => { try { const p = sessionStorage.getItem("lspdt.panel"); if (p === "six" || p === "anita") return { a: p, s: "re" };
    const n = JSON.parse(localStorage.getItem("lspdt.next.nav") || "") as { a: string; s: string }; return n.a === "six" || n.a === "anita" ? { a: "ini", s: "home" } : n; } catch { return { a: "ini", s: "home" }; } });
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
    if (ir === "six-not" && ME_ROLES.six) setNav({ a: "six", s: "not" });
    /* link de una reunión (?ir=reu:<id>, botón «Copiar link» en Supervisores › Reuniones) */
    if (ir.startsWith("reu:")) { JUMP.reu = ir.slice(4); setNav({ a: "sup", s: "reu" }); jumpNow(); }
    history.replaceState(null, "", location.pathname); }, [me]);
  /* six: aviso cuando llega un feedback nuevo (lo trae la sincronización cada 5 s) */
  const fbKnown = useRef<Set<string> | null>(null);
  useEffect(() => { if (!me || !ME_ROLES.six) return; const ks = LS.keys("lspdt.six.fb.");
    if (!fbKnown.current) { fbKnown.current = new Set(ks); return; }
    for (const k of ks) if (!fbKnown.current.has(k)) { fbKnown.current.add(k); const t = LS.ro<{ by: string; who?: string } | null>(k, null); if (t) toast(`💗 Nuevo feedback de ${t.who || t.by} · six → Notificaciones`); } });
  useEffect(() => {
    void api("/api/auth?full=1").then(r => { const b = r as unknown as Boot; ACC.names = b.names || []; deptFromBrand(b); setBoot(b); if (b.me && b.data) enter(b.data); });
  }, [enter]);
  useEffect(() => { const f = (e: Event) => { setNav((e as CustomEvent<{ a: string; s: string }>).detail); scrollTopApp(); }; window.addEventListener("lspd:go", f); return () => window.removeEventListener("lspd:go", f); }, []);
  useEffect(() => { try { if (nav.a !== "six" && nav.a !== "anita") { localStorage.setItem("lspdt.next.nav", JSON.stringify(nav)); sessionStorage.removeItem("lspdt.panel"); } else sessionStorage.setItem("lspdt.panel", nav.a); } catch { /* */ } }, [nav]); /* six nunca queda como página de inicio */

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
  /* al volver de una actualización sigue la misma pantalla de carga (no un segundo cargando distinto) */
  if (!boot) return <Device><div className="relative grid min-h-[var(--app-h,100dvh)] place-items-center text-slate-400">{UPD_RESUME != null ? <OpsLoad v={UPD_RESUME || APP_VERSION} pct={100} n={5} inside resume /> : <Loader2 className="size-6 animate-spin" />}</div></Device>;
  if (!me) return <Device brand={boot.brand}><UpdateBar /><Login pub={boot} onDone={r => enter((r as { data: Parameters<typeof loadStore>[0] }).data, true)} /></Device>;

  const ag = findAgent(me.n), user = { n: me.n, r: ag?.r || me.r, p: ag?.p };
  if (nav.a === "anita" && ME_ROLES.anita && !me.must) return <MeCtx.Provider value={user}><Suspense fallback={<div className="min-h-[100dvh] bg-black" />}><Six who="anita" resume={nav.s === "re"} onExit={() => { setNav({ a: "ini", s: "home" }); scrollTopApp(); }} /></Suspense></MeCtx.Provider>;
  if (nav.a === "six" && ME_ROLES.six && !me.must) return <MeCtx.Provider value={user}><Suspense fallback={<div className="min-h-[100dvh] bg-black" />}><Six start={nav.s === "not" ? "not" : "ini"} resume={nav.s === "re"} onExit={() => { setNav({ a: "ini", s: "home" }); scrollTopApp(); }} /></Suspense></MeCtx.Provider>;
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
  return <Device><MeCtx.Provider value={user}><Shell me={user} area={area} sec={sec} go={go} onLogout={logout}><div key={`${area.k}/${sec.k}`} className={cn("animate-fade-in", area.k === "sup" && "sup-c")}><Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>}>{view}</Suspense></div></Shell><UpdateBar />{!fx && <CalAlert me={user.n} />}{!fx && !PREV.on && <ExamWatch me={user.n} />}{PREV.on && <PrevBar r={user.r} />}</MeCtx.Provider>{fx === "full" && <LoginOps name={me.n} rank={rankES(user.r)} agents={getRoster().length} divs={rosterDivs(me.n).length} onDone={() => setFx("")} />}{fx === "short" && <BootScreen name={me.n} rank={rankES(user.r)} badge={user.p} agents={getRoster().length} no={ACC.names.indexOf(me.n) + 1 || undefined} divs={rosterDivs(me.n)} short={fx === "short"} onDone={() => setFx("")} />}{breach && <ErrorScreen onDone={endBreach} />}{me.must && !PREV.on && <ForcePwPortal n={me.n} onDone={() => { PREV.must = false; setMe({ ...me, must: false }); toast("Contraseña actualizada. ¡Listo!"); }} onLogout={logout} />}</Device>;
}

/* el cambio obligatorio de contraseña va dentro de la pantalla de la tablet (o arriba de todo sin marco) */
function ForcePwPortal(p: { n: string; onDone: () => void; onLogout: () => void }) {
  const host = document.querySelector<HTMLElement>(".tab-screen");
  return createPortal(<div className={host ? "absolute inset-0 z-[90]" : "fixed inset-0 z-[90]"}><ForcePw {...p} /></div>, host || document.body);
}
