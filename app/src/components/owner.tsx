/* Lo del dueño que se ve en toda la terminal:
   - Pantalla de mantenimiento: carga en bucle, el aviso y un cuadro para dejarle un mensaje a six (le llega por Discord). Si six escribe ahí
     la contraseña de mantenimiento, se apaga y la terminal vuelve a cargar de cero, como después de reiniciar el servidor.
   - Pedido de código de autodestrucción: cuando el servidor frena un borrado importante (428), se pide el código y se desbloquea 10 minutos. */
import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Send, ShieldAlert, Wrench } from "lucide-react";
import { authApi, api } from "@/lib/api";
import { Modal } from "@/components/modal";
import { Button, Input, Textarea } from "@/components/ui";
import { useFeedback } from "@/components/feedback";

type Maint = { at: number; msg?: string };
/* vuelve a cargar todo de cero (sin el caché de la página) */
async function hardReload() {
  try { sessionStorage.clear(); } catch { /* */ }
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch { /* */ }
  location.replace(location.pathname + "?r=" + Date.now());
}

export function OwnerGate({ children }: { children: ReactNode }) {
  const [m, setM] = useState<Maint | null>(null);
  useEffect(() => { const f = (e: Event) => setM((e as CustomEvent<Maint>).detail || { at: Date.now() }); addEventListener("lspdt:maint", f); return () => removeEventListener("lspdt:maint", f); }, []);
  /* mientras dure, cada 20 s se fija si ya terminó */
  useEffect(() => { if (!m) return; const t = setInterval(() => { void api("/api/auth").then(r => { if (r.__s === 200 && !r.maint) void hardReload(); }); }, 20000); return () => clearInterval(t); }, [m]);
  return <>{m ? <MaintScreen m={m} /> : children}<SdPrompt /></>;
}

function MaintScreen({ m }: { m: Maint }) {
  const [t, setT] = useState(""), [st, setSt] = useState<"" | "ok" | "err">(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const send = async () => {
    if (!t.trim() || busy) return; setBusy(true);
    const r = await authApi({ a: "maintmsg", t: t.trim() }); setBusy(false);
    if (r.off) { setSt("ok"); setMsg("Listo. La terminal vuelve a cargar…"); setTimeout(() => void hardReload(), 900); return; }
    if (r.__s === 200) { setT(""); setSt("ok"); setMsg("Mensaje enviado. ¡Gracias!"); } else { setSt("err"); setMsg(r.msg || "No se pudo enviar"); }
  };
  return (
    <div className="fixed inset-0 z-[9998] grid place-items-center overflow-y-auto bg-[#05070c] p-4 text-slate-200">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(60%_50%_at_50%_30%,rgb(var(--b-500)/.35),transparent)]" />
      <div className="relative w-full max-w-md space-y-6 text-center">
        <div className="relative mx-auto size-24">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-[rgb(var(--b-400))] [animation-duration:1.4s]" />
          <span className="absolute inset-3 animate-spin rounded-full border-2 border-white/5 border-b-[rgb(var(--b-300))] [animation-direction:reverse] [animation-duration:2.2s]" />
          <Wrench className="absolute inset-0 m-auto size-8 text-[rgb(var(--b-300))]" />
        </div>
        <div className="space-y-2">
          <p className="font-display text-3xl font-bold tracking-wide">En mantenimiento</p>
          <p className="text-sm text-slate-400">Estamos ajustando la terminal. Ya volvemos.</p>
          {m.msg && <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-slate-300">{m.msg}</p>}
        </div>
        <div className="mx-auto h-1 w-56 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-1/3 animate-[maint_1.6s_ease-in-out_infinite] rounded-full bg-[rgb(var(--b-400))]" /></div>
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left">
          <p className="text-[13px] font-semibold">¿Necesitás que vuelva la página? Dejá un mensaje</p>
          <Textarea rows={3} value={t} maxLength={800} onChange={e => setT(e.target.value)} placeholder="Qué necesitás y para cuándo…" className="bg-black/40 text-slate-100" />
          <div className="flex items-center gap-2"><span className={st === "err" ? "flex-1 text-[12px] text-red-400" : "flex-1 text-[12px] text-emerald-400"}>{msg}</span>
            <Button icon={<Send className="size-4" />} disabled={!t.trim() || busy} onClick={() => void send()}>Enviar</Button></div>
        </div>
      </div>
      <style>{"@keyframes maint{0%{transform:translateX(-110%)}100%{transform:translateX(330%)}}"}</style>
    </div>);
}

/* código de autodestrucción: se pide cuando el servidor lo exige */
function SdPrompt() {
  const { toast } = useFeedback(), [why, setWhy] = useState<string | null>(null), [c, setC] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => { const f = (e: Event) => { setWhy(String((e as CustomEvent<string>).detail || "Hace falta un código de autodestrucción")); setC(""); setErr(""); }; addEventListener("lspdt:sd", f); return () => removeEventListener("lspdt:sd", f); }, []);
  const ok = async () => { setBusy(true); const r = await authApi({ a: "sdunlock", code: c }); setBusy(false);
    if (r.__s === 200) { setWhy(null); toast("Desbloqueado por 10 minutos: repetí lo que querías hacer"); } else setErr(r.msg || "Código inválido"); };
  return (
    <Modal open={why !== null} onClose={() => setWhy(null)} size="sm" icon={<ShieldAlert />} title="Código de autodestrucción" desc={why || ""}
      footer={<><Button variant="ghost" onClick={() => setWhy(null)}>Cancelar</Button><Button icon={<KeyRound className="size-4" />} disabled={c.trim().length < 8 || busy} onClick={() => void ok()}>Desbloquear</Button></>}>
      <div className="space-y-2">
        <p className="text-[13px] text-slate-500">Solo six tiene estos códigos (le llegan por Discord). Sin uno, no se puede borrar información importante.</p>
        <Input autoFocus value={c} onChange={e => setC(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && c.trim().length >= 8 && void ok()} placeholder="XXXX-XXXX-XXXX" className="text-center font-mono tracking-widest" autoComplete="off" />
        {err && <p className="text-[12px] text-red-500">{err}</p>}
      </div>
    </Modal>);
}
