import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Login, type PubInfo } from "./layout/Login";
import { Shell } from "./layout/Shell";
import { Home } from "./sections/Home";
import { Classic } from "./sections/Classic";
import { PerdidaArmamento } from "./sections/PerdidaArmamento";
import { Ascensos } from "./sections/sup/Ascensos";
import { T1080 } from "./sections/sup/T1080";
import { Alerta } from "./sections/sup/Alerta";
import { Bodycam } from "./sections/sup/Bodycam";
import { Entrevistas } from "./sections/sup/Entrevistas";
import { Votaciones } from "./sections/sup/Votaciones";
import { Agentes } from "./sections/sup/Agentes";
import { Informes } from "./sections/Informes";
import { Division } from "./sections/div/Division";
import { Permisos } from "./sections/cap/Permisos";
import { EstadoRoster, HistorialVotaciones } from "./sections/jef/Jefatura";
import { AdmAccesos, AdmDatos, AdmMarca } from "./sections/adm/Admin";
import { Patrullas } from "./sections/sup/Patrullas";
import { RegistroPatrullas } from "./sections/sup/RegistroPatrullas";
import { Equipamiento } from "./sections/cap/Equipamiento";
import { MeCtx } from "./lib/me";
import type { ReactNode } from "react";

export const VIEWS: Record<string, () => ReactNode> = {
  "sup/asc": () => <Ascensos />, "sup/t1080": () => <T1080 />, "sup/alt": () => <Alerta />, "sup/bod": () => <Bodycam />, "sup/ent": () => <Entrevistas />, "sup/vot": () => <Votaciones />, "cap/vot": () => <Votaciones />, "sup/pat": () => <Patrullas />, "sup/prof": () => <Agentes />, "inf/inf": () => <Informes />, "sup/preg": () => <RegistroPatrullas />, "cap/equ": () => <Equipamiento />, "cap/perm": () => <Permisos />, "jef/ros": () => <EstadoRoster />, "jef/his": () => <HistorialVotaciones />,
  "adm/acc": () => <AdmAccesos />, "adm/brand": () => <AdmMarca />, "adm/data": () => <AdmDatos />,
};
import { AREAS, canArea } from "./nav";
import { api, authApi } from "./lib/api";
import { goOffline, loadStore, storeHooks, useStoreVersion, type Me } from "./lib/store";
import { findAgent } from "./lib/domain";
import { useFeedback } from "./components/feedback";

type Boot = { me: string | null; names: string[]; needCode: boolean; brand?: Record<string, string>; roster?: PubInfo["roster"]; data?: Parameters<typeof loadStore>[0] };

export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [nav, setNav] = useState(() => { try { return JSON.parse(localStorage.getItem("lspdt.next.nav") || "") as { a: string; s: string }; } catch { return { a: "ini", s: "home" }; } });
  const { toast } = useFeedback();
  useStoreVersion();

  const enter = useCallback((d: Parameters<typeof loadStore>[0]) => { loadStore(d); setMe(d.me!); }, []);
  const lost = useCallback(() => { goOffline(); setMe(null); toast("La sesión se cerró. Volvé a ingresar.", "err"); void api("/api/auth").then(r => setBoot(r as unknown as Boot)); }, [toast]);
  useEffect(() => { storeHooks(toast, lost); }, [toast, lost]);
  useEffect(() => {
    void api("/api/auth?full=1").then(r => { const b = r as unknown as Boot; setBoot(b); if (b.me && b.data) enter(b.data); });
  }, [enter]);
  useEffect(() => { const f = (e: Event) => { setNav((e as CustomEvent<{ a: string; s: string }>).detail); window.scrollTo({ top: 0 }); }; window.addEventListener("lspd:go", f); return () => window.removeEventListener("lspd:go", f); }, []);
  useEffect(() => { try { localStorage.setItem("lspdt.next.nav", JSON.stringify(nav)); } catch { /* */ } }, [nav]);

  if (!boot) return <div className="grid min-h-dvh place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>;
  if (!me) return <Login pub={boot} onDone={r => enter((r as { data: Parameters<typeof loadStore>[0] }).data)} />;

  const ag = findAgent(me.n), user = { n: me.n, r: ag?.r || me.r, p: ag?.p };
  let area = AREAS.find(a => a.k === nav.a) || AREAS[0];
  if (!canArea(area, user.r)) area = AREAS[0];
  const sec = area.sec.find(s => s.k === nav.s) || area.sec[0];
  const go = (a: string, s: string) => { setNav({ a, s }); window.scrollTo({ top: 0 }); };
  const logout = async () => { await authApi({ a: "logout" }); goOffline(); setMe(null); const r = await api("/api/auth"); setBoot(r as unknown as Boot); };

  let view;
  if (sec.k === "home") view = <Home me={user} go={go} />;
  else if (area.k === "sup" && sec.k === "parm") view = <PerdidaArmamento me={user} />;
  else if (area.k === "div") view = <Division d={sec.l} />;
  else if (VIEWS[`${area.k}/${sec.k}`]) view = VIEWS[`${area.k}/${sec.k}`]();
  else view = <Classic area={area} sec={sec} />;
  return <MeCtx.Provider value={user}><Shell me={user} area={area} sec={sec} go={go} onLogout={logout}><div key={`${area.k}/${sec.k}`} className="animate-fade-in">{view}</div></Shell></MeCtx.Provider>;
}
