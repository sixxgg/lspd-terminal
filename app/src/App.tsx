import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Login, type PubInfo } from "./layout/Login";
import { Shell } from "./layout/Shell";
import { Home } from "./sections/Home";
import { Classic } from "./sections/Classic";
import { PerdidaArmamento } from "./sections/PerdidaArmamento";
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
  else view = <Classic area={area} sec={sec} />;
  return <Shell me={user} area={area} sec={sec} go={go} onLogout={logout}>{view}</Shell>;
}
