/* aviso del día: si hoy hay una práctica, instrucción o evento que te toca, baja una notificación desde el borde de la tablet
   (igual que la de actualización) con «Marcar como leído», «Anotarme» y «Recordármelo» (30 min antes, o en 1 h si ya falta poco).
   six y Anita lo prueban desde su menú de cuenta («Probar calendario»). */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock } from "lucide-react";
import { LS, useStoreVersion } from "@/lib/store";
import { calAck, calAll, calMine, calSetAck, fmtWhen, isToday, type CalItem } from "@/lib/calendar";
import { tipoC } from "@/components/calui";

function calDue(n: string, now = Date.now()): CalItem[] {
  const A = calAck(n);
  return calAll().filter(e => { const a = A[e.id] || {}; if (a.r || !calMine(e, n) || e.at < now - 3 * 36e5) return false;
    return a.at ? a.at <= now : isToday(e.at) && !a.a; });
}
export function CalAlert({ me }: { me: string }) {
  useStoreVersion();
  const [, tick] = useState(0), [test, setTest] = useState<CalItem | null>(null), [out, setOut] = useState(false), [dy, setDy] = useState(0), y0 = useRef<number | null>(null);
  useEffect(() => {
    const f = () => tick(x => x + 1), i = setInterval(f, 60000);
    const t = () => { setOut(false); setDy(0); const at = new Date(); at.setHours(Math.min(23, at.getHours() + 2), 0, 0, 0);
      setTest({ id: "test", t: Date.now(), by: me, n: "Práctica de persecución (prueba)", tipo: "Práctica", at: +at, cre: me, d: "hsiu", src: "cal", dn: "High Speed Interception Unit", ab: "HSIU", col: "#ef4444" }); };
    window.addEventListener("lspdt:cal", f); window.addEventListener("lspdt:testcal", t);
    return () => { clearInterval(i); window.removeEventListener("lspdt:cal", f); window.removeEventListener("lspdt:testcal", t); };
  }, [me]);
  const due = test ? [test] : calDue(me), e = due[0];
  if (!e) return null;
  const close = (fn: () => void) => { setOut(true); setTimeout(() => { if (test) setTest(null); else fn(); setOut(false); setDy(0); }, 380); };
  const read = () => close(() => calSetAck(me, e.id, { r: Date.now(), at: 0 }));
  const note = () => close(() => calSetAck(me, e.id, { a: Date.now(), r: Date.now(), at: 0 }));
  const later = () => close(() => calSetAck(me, e.id, { at: e.at - 30 * 6e4 > Date.now() + 5 * 6e4 ? e.at - 30 * 6e4 : Date.now() + 36e5 }));
  const logo = LS.get("lspdt.logo") || "/next/logo.svg", tl = e.tipo === "Otro" ? "evento" : e.tipo.toLowerCase(), art = ["práctica", "instrucción", "reunión"].includes(tl) ? "una" : "un", rem = !!calAck(me)[e.id]?.at;
  const host = document.querySelector<HTMLElement>(".tab-screen"), inside = !!host;
  return createPortal(
    <div className={`pointer-events-none ${inside ? "absolute" : "fixed"} inset-x-0 top-0 z-[94] flex justify-center px-3`} role="alert" aria-live="polite">
      <div className={`upd-ntf pointer-events-auto w-[min(460px,100%)] touch-none select-none ${inside ? "upd-edge" : "mt-2"} ${out ? "upd-out" : "upd-in"}`} style={dy ? { transform: `translateY(${dy}px)`, transition: "none", animation: "none" } : undefined}
        onPointerDown={ev => { if ((ev.target as HTMLElement).closest("button")) return; y0.current = ev.clientY; (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId); }}
        onPointerMove={ev => { if (y0.current !== null) setDy(Math.min(0, ev.clientY - y0.current)); }}
        onPointerUp={() => { if (y0.current === null) return; y0.current = null; if (dy < -40) later(); else setDy(0); }}>
        <div className="flex items-center gap-2 px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
          <img src={logo} alt="" className="size-4 rounded object-contain" /><span>Calendario · {e.ab}</span><span className="ml-auto normal-case tracking-normal">{test ? "prueba" : due.length > 1 ? `+${due.length - 1} más` : "ahora"}</span>
        </div>
        <div className="flex items-start gap-3 px-4 pb-3 pt-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${tipoC(e.tipo)}, ${e.col})` }}><CalendarClock className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">{rem ? "Recordatorio" : "Atención"}</p>
            <p className="text-[15px] font-bold leading-tight text-white">{isToday(e.at) ? "Hoy hay" : "Se acerca"} {art} {tl}: {e.n}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-white/70">{fmtWhen(e)}{e.cre ? ` · ${e.cre}` : ""}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/10 text-[12.5px] font-semibold">
          <button onClick={read} className="rounded-bl-[22px] py-2.5 text-white/60 transition hover:bg-white/5 hover:text-white">Marcar como leído</button>
          <button onClick={later} className="border-l border-white/10 py-2.5 text-white/80 transition hover:bg-white/5 hover:text-white">Recordármelo</button>
          <button onClick={note} className="rounded-br-[22px] border-l border-white/10 py-2.5 text-sky-300 transition hover:bg-sky-400/10">Anotarme</button>
        </div>
        <span aria-hidden className="mx-auto mb-1.5 mt-0.5 block h-1 w-10 rounded-full bg-white/25" />
      </div>
    </div>, host || document.body);
}
