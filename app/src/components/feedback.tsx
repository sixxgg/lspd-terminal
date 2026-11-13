import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, HelpCircle, Trash2 } from "lucide-react";
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

/* avisos como notificaciones push: una píldora de un renglón que baja desde arriba (dentro de la pantalla de la tablet o de la ventana),
   se apilan, se cierran solas o deslizándolas hacia arriba. Las confirmaciones llegan igual: pregunta en un renglón, detalle abajo y dos botones. */
/* «Título: detalle» o «¿Pregunta? Detalle» se separan en dos partes */
const split = (m: string): [string, string] => {
  const q = m.indexOf("? "); if (m.startsWith("¿") && q > 0) return [m.slice(0, q + 1), m.slice(q + 2)];
  const i = m.indexOf(": "); return i > 0 && i < 48 ? [m.slice(0, i), m.slice(i + 2)] : [m, ""];
};
function PushLayer({ toasts, drop, conf, close }: { toasts: ToastT[]; drop: (id: number) => void; conf: ConfirmT | null; close: (v: boolean) => void }) {
  if (!toasts.length && !conf) return null;
  /* con un modal abierto (van al body) el aviso también va arriba de todo; si no, dentro de la pantalla de la tablet */
  const modal = !!document.querySelector("body > .fx-modal-bg, body > .exam-root"), host = modal ? null : document.querySelector<HTMLElement>(".tab-screen"), inside = !!host;
  const [ct, cb] = conf ? split(conf.msg) : ["", ""];
  const ui = <>
    {conf && <div className={cn(inside ? "absolute" : "fixed", "upd-veil inset-0 z-[97] bg-slate-950/40")} style={{ ["--ub" as string]: "4px" }} onMouseDown={() => close(false)} />}
    <div aria-live="polite" className={cn(inside ? "absolute" : "fixed", "pointer-events-none inset-x-0 top-0 z-[400] flex flex-col items-center gap-2 px-3 pt-3")}>
      {conf && <div role="alertdialog" aria-modal className="push-pill upd-in pointer-events-auto w-fit max-w-[min(600px,100%)] p-2 pl-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-white", conf.danger ? "bg-red-500/90 shadow-[0_0_16px_-2px_#ef4444]" : "bg-sky-500/90 shadow-[0_0_16px_-2px_#0ea5e9]")}>{conf.danger ? <Trash2 className="size-4" /> : <HelpCircle className="size-4" />}</span>
          <div className="min-w-0 flex-1 pr-1"><p className="text-[14px] font-semibold leading-snug text-white">{ct}</p>{cb && <p className="text-[12.5px] leading-snug text-white/60">{cb}</p>}</div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => close(false)} className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white/65 transition hover:bg-white/10 hover:text-white">Cancelar</button>
            <button autoFocus onClick={() => close(true)} className={cn("rounded-full px-4 py-1.5 text-[13px] font-bold text-white transition", conf.danger ? "bg-red-500 hover:bg-red-400" : "bg-sky-500 hover:bg-sky-400")}>{conf.ok || "Confirmar"}</button>
          </div>
        </div>
      </div>}
      {toasts.slice(-3).reverse().map(t => <Push key={t.id} t={t} onEnd={() => drop(t.id)} />)}
    </div>
  </>;
  return createPortal(ui, host || document.body);
}
function Push({ t, onEnd }: { t: ToastT; onEnd: () => void }) {
  const [out, setOut] = useState(false), [dy, setDy] = useState(0), y0 = useRef<number | null>(null);
  const bye = useCallback(() => { setOut(true); setTimeout(onEnd, 300); }, [onEnd]);
  useEffect(() => { const a = setTimeout(bye, t.kind === "err" ? 5200 : 3200); return () => clearTimeout(a); }, [bye, t.kind]);
  const [title, body] = split(t.msg), err = t.kind === "err";
  return (
    <div role="status" className={cn("push-pill pointer-events-auto flex w-fit max-w-[min(600px,100%)] cursor-grab touch-none select-none items-center gap-2.5 py-1.5 pl-1.5 pr-4", out ? "upd-out" : "upd-in")} style={dy ? { transform: `translateY(${dy}px)`, transition: "none", animation: "none" } : undefined}
      onClick={bye} onPointerDown={e => { y0.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (y0.current !== null) setDy(Math.min(0, e.clientY - y0.current)); }}
      onPointerUp={() => { if (y0.current === null) return; y0.current = null; if (dy < -30) bye(); else setDy(0); }}>
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-white", err ? "bg-red-500 shadow-[0_0_14px_-2px_#ef4444]" : "bg-emerald-500 shadow-[0_0_14px_-2px_#10b981]")}>{err ? <AlertTriangle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}</span>
      <p className="min-w-0 text-[13.5px] leading-snug text-white"><b className="font-semibold">{title}</b>{body && <span className="text-white/60"> · {body}</span>}</p>
    </div>);
}
