/* contraseña restablecida por six: antes de usar la terminal hay que elegir una nueva (no se puede cerrar) */
import { useState } from "react";
import { Eye, EyeOff, KeyRound, LogOut, ShieldAlert } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { authApi } from "@/lib/api";

export function ForcePw({ n, onDone, onLogout }: { n: string; onDone: () => void; onLogout: () => void }) {
  const [a, setA] = useState(""), [b, setB] = useState(""), [show, setShow] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const ok = a.length >= 8 && a === b;
  const save = async () => {
    if (a.length < 8) { setErr("Tiene que tener al menos 8 caracteres."); return; }
    if (a !== b) { setErr("Las dos contraseñas no coinciden."); return; }
    setBusy(true); const r = await authApi({ a: "passwd", nw: a }); setBusy(false);
    if (r.__s !== 200) { setErr(r.msg || "No se pudo guardar"); return; }
    onDone();
  };
  return (
    <div className="fx-modal-bg absolute inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Cambiar contraseña">
      <form onSubmit={e => { e.preventDefault(); void save(); }} className="fx-modal w-full max-w-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="fx-modal-h flex items-start gap-3 border-b border-amber-500/20 bg-amber-500/[.06] px-5 py-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-500"><ShieldAlert className="size-5" /></div>
          <div><h3 className="font-semibold">Cambiá tu contraseña</h3><p className="mt-0.5 text-xs text-slate-500">La administración restableció la cuenta de <b>{n}</b>. Para seguir usando la terminal elegí una contraseña nueva.</p></div>
        </div>
        <div className="space-y-3 p-5">
          <Field label="Contraseña nueva"><div className="relative"><Input autoFocus type={show ? "text" : "password"} value={a} onChange={e => { setA(e.target.value); setErr(""); }} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="pr-10" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar" : "Mostrar"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Field>
          <Field label="Repetila"><Input type={show ? "text" : "password"} value={b} onChange={e => { setB(e.target.value); setErr(""); }} autoComplete="new-password" /></Field>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={a.length >= 12 ? "h-full bg-emerald-500" : a.length >= 8 ? "h-full bg-amber-400" : "h-full bg-red-500"} style={{ width: Math.min(100, (a.length / 12) * 100) + "%" }} /></div>
          {err && <p className="text-sm font-semibold text-red-500">{err}</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Button type="button" size="sm" variant="ghost" icon={<LogOut />} onClick={onLogout}>Salir</Button>
          <Button type="submit" size="sm" className="ml-auto" icon={<KeyRound />} disabled={!ok || busy}>{busy ? "Guardando…" : "Guardar contraseña"}</Button>
        </div>
      </form>
    </div>);
}
