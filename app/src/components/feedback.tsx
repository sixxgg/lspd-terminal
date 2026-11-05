import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "./ui";
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
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map(t => (
          <div key={t.id} className={cn("pointer-events-auto flex max-w-md animate-fade-in items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur",
            t.kind === "err" ? "border-red-200 bg-red-50/95 text-red-800 dark:border-red-500/30 dark:bg-red-950/90 dark:text-red-200"
              : "border-slate-200 bg-white/95 text-slate-800 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100")}>
            {t.kind === "err" ? <AlertTriangle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}{t.msg}
          </div>
        ))}
      </div>
      {conf && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && close(false)}>
          <div role="alertdialog" aria-modal className="w-full max-w-sm animate-fade-in rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl", conf.danger ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300")}><AlertTriangle className="size-[18px]" /></div>
              <p className="flex-1 whitespace-pre-line pt-1.5 text-sm text-slate-700 dark:text-slate-200">{conf.msg}</p>
              <button onClick={() => close(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="size-4" /></button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => close(false)}>Cancelar</Button>
              <Button variant={conf.danger ? "danger" : "primary"} size="sm" autoFocus onClick={() => close(true)}>{conf.ok || "Confirmar"}</Button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
