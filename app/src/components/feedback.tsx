import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, HelpCircle, Trash2 } from "lucide-react";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

type ToastT = { id: number; msg: string; kind: "ok" | "err" };
type ConfirmT = { msg: string; ok?: string; danger?: boolean; resolve: (v: boolean) => void };
const Ctx = createContext<{ toast: (m: string, k?: "ok" | "err") => void; confirm: (m: string, o?: { ok?: string; danger?: boolean }) => Promise<boolean> }>(null!);
export const useFeedback = () => useContext(Ctx);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const [conf, setConf] = useState<ConfirmT | null>(null);
  const n = useRef(0);
  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = ++n.current; setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3600);
  }, []);
  const confirm = useCallback((msg: string, o?: { ok?: string; danger?: boolean }) => new Promise<boolean>(resolve => setConf({ msg, ...o, resolve })), []);
  const close = (v: boolean) => { conf?.resolve(v); setConf(null); };
  useEffect(() => {
    if (!conf) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  });
  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <PushLayer toasts={toasts} drop={id => setToasts(t => t.filter(x => x.id !== id))} conf={conf} close={close} />
    </Ctx.Provider>
  );
}

/* avisos como notificaciones push: bajan desde el borde de arriba de la pantalla de la tablet (o de la ventana), se apilan,
   se cierran solos o deslizándolos hacia arriba; las confirmaciones también llegan así, con sus dos botones */
const logoSrc = () => { try { return LS.get("lspdt.logo") || "/next/logo.svg"; } catch { return "/next/logo.svg"; } };
const split = (m: string) => { const i = m.indexOf(": "); return i > 0 && i < 48 ? [m.slice(0, i), m.slice(i + 2)] : [m, ""]; };
function PushLayer({ toasts, drop, conf, close }: { toasts: ToastT[]; drop: (id: number) => void; conf: ConfirmT | null; close: (v: boolean) => void }) {
  if (!toasts.length && !conf) return null;
  /* con un modal abierto (van al body) el aviso también va arriba de todo; si no, dentro de la pantalla de la tablet */
  const modal = !!document.querySelector("body > .fx-modal-bg"), host = modal ? null : document.querySelector<HTMLElement>(".tab-screen"), inside = !!host;
  const ui = <>
    {conf && <div className={cn(inside ? "absolute" : "fixed", "upd-veil inset-0 z-[97] bg-slate-950/40")} style={{ ["--ub" as string]: "4px" }} onMouseDown={() => close(false)} />}
    <div aria-live="polite" className={cn(inside ? "absolute" : "fixed", "pointer-events-none inset-x-0 top-0 z-[98] flex flex-col items-center gap-2 px-3 pt-2")}>
      {conf && <div role="alertdialog" aria-modal className="upd-ntf upd-in pointer-events-auto w-[min(460px,100%)]">
        <Head label={conf.danger ? "Confirmar acción" : "Confirmación"} />
        <div className="flex items-start gap-3 px-4 pb-3 pt-2">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg", conf.danger ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-sky-400 to-indigo-600")}>{conf.danger ? <Trash2 className="size-5" /> : <HelpCircle className="size-5" />}</span>
          <p className="min-w-0 flex-1 whitespace-pre-line pt-0.5 text-[14px] font-semibold leading-snug text-white">{conf.msg}</p>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 text-[13px] font-semibold">
          <button onClick={() => close(false)} className="rounded-bl-[22px] py-2.5 text-white/60 transition hover:bg-white/5 hover:text-white">Cancelar</button>
          <button autoFocus onClick={() => close(true)} className={cn("rounded-br-[22px] border-l border-white/10 py-2.5 transition", conf.danger ? "text-red-400 hover:bg-red-500/10" : "text-sky-300 hover:bg-sky-400/10")}>{conf.ok || "Confirmar"}</button>
        </div>
      </div>}
      {toasts.slice(-3).reverse().map(t => <Push key={t.id} t={t} onEnd={() => drop(t.id)} />)}
    </div>
  </>;
  return createPortal(ui, host || document.body);
}
function Head({ label }: { label: string }) {
  return <div className="flex items-center gap-2 px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55"><img src={logoSrc()} alt="" className="size-4 rounded object-contain" /><span>Terminal LSPD · {label}</span><span className="ml-auto normal-case tracking-normal">ahora</span></div>;
}
function Push({ t, onEnd }: { t: ToastT; onEnd: () => void }) {
  const [out, setOut] = useState(false), [dy, setDy] = useState(0), y0 = useRef<number | null>(null);
  const bye = useCallback(() => { setOut(true); setTimeout(onEnd, 300); }, [onEnd]);
  useEffect(() => { const a = setTimeout(bye, t.kind === "err" ? 5200 : 3600); return () => clearTimeout(a); }, [bye, t.kind]);
  const [title, body] = split(t.msg), err = t.kind === "err";
  return (
    <div role="status" className={cn("upd-ntf pointer-events-auto w-[min(440px,100%)] cursor-grab touch-none select-none", out ? "upd-out" : "upd-in")} style={dy ? { transform: `translateY(${dy}px)`, transition: "none", animation: "none" } : undefined}
      onClick={bye} onPointerDown={e => { y0.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (y0.current !== null) setDy(Math.min(0, e.clientY - y0.current)); }}
      onPointerUp={() => { if (y0.current === null) return; y0.current = null; if (dy < -30) bye(); else setDy(0); }}>
      <Head label={err ? "Aviso" : "Sistema"} />
      <div className="flex items-center gap-3 px-4 pb-3.5 pt-2">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl text-white shadow-lg", err ? "bg-gradient-to-br from-amber-400 to-red-600" : "bg-gradient-to-br from-emerald-400 to-emerald-600")}>{err ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}</span>
        <div className="min-w-0 flex-1"><p className="text-[14.5px] font-bold leading-tight text-white">{title}</p>{body && <p className="mt-0.5 text-[13px] leading-snug text-white/70">{body}</p>}</div>
      </div>
      <span aria-hidden className="mx-auto mb-1.5 block h-1 w-10 rounded-full bg-white/25" />
    </div>);
}
