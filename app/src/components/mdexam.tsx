/* Examen en línea de la METRO, en toda la terminal:
   - ExamWatch consulta el estado cada tanto y, a quien está anotado, le avisa arriba de la pantalla cuando se acerca la hora y cuando ya está listo.
   - ExamMode tapa toda la tablet: solo existe el examen. Bloquea copiar, pegar, el clic derecho y la selección; salir de la pestaña,
     las capturas o abrir las herramientas del navegador suman un strike (al tercero se desaprueba). Las respuestas correctas nunca llegan al navegador. */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Clock, Lock, Maximize, ShieldAlert, X } from "lucide-react";
import { EX_OPEN, atMs, exApi, exRefresh, fmtAt, srvNow, useExam } from "@/lib/mdexam";
import { cn } from "@/lib/cn";

export function ExamWatch({ me }: { me: string }) {
  const S = useExam(), [open, setOpen] = useState(false), [hide, setHide] = useState(""), [, tick] = useState(0);
  useEffect(() => {
    void exRefresh();
    const f = () => { if (document.visibilityState === "visible") void exRefresh(); };
    const i = setInterval(f, 60e3), o = () => setOpen(true), t = setInterval(() => tick(x => x + 1), 15e3);
    window.addEventListener(EX_OPEN, o);
    return () => { clearInterval(i); clearInterval(t); window.removeEventListener(EX_OPEN, o); };
  }, []);
  /* si quedó un examen a medias (recargó la página), se vuelve a abrir solo */
  const run = S?.me.att?.st === "run";
  useEffect(() => { if (run) setOpen(true); }, [run]);
  if (!S) return null;
  const mine = S.en.includes(me), done = S.me.att?.st === "done", at = atMs(S.cfg.at), now = srvNow();
  /* aviso: anotado, activado, sin rendir y (listo o faltan 15 min o menos) */
  const soon = S.cfg.on && !!at && now < at && at - now <= 15 * 60e3, show = mine && !done && !run && (S.ready || soon);
  const sig = `${S.cfg.at}|${S.ready}`;
  return <>
    {show && hide !== sig && createPortal(
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[150] flex justify-center px-3">
        <div className={cn("pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 text-white shadow-2xl backdrop-blur animate-fade-in",
          S.ready ? "border-emerald-400/40 bg-emerald-950/90 shadow-emerald-500/20" : "border-amber-400/40 bg-slate-950/90 shadow-amber-500/20")}>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", S.ready ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300")}>{S.ready ? <CheckCircle2 className="size-5" /> : <Clock className="size-5" />}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">Examen escrito · Metropolitan Division</p>
            <p className="text-xs text-white/70">{S.ready ? "Ya está disponible. Tenés " + S.cfg.dur + " minutos desde que lo empezás." : `Empieza a las ${new Date(at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} (en ${Math.max(1, Math.ceil((at - now) / 60e3))} min).`}</p></div>
          {S.ready && <button onClick={() => { setOpen(true); }} className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-emerald-400">Iniciar</button>}
          <button onClick={() => setHide(sig)} aria-label="Cerrar aviso" className="shrink-0 rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
        </div></div>, document.body)}
    {open && <ExamMode me={me} onClose={() => setOpen(false)} />}
  </>;
}

const STRIKE_TXT = ["", "Este es el primer strike: si lo hacés 2 veces más vas a desaprobar el examen.", "Este es el segundo strike: si lo hacés una vez más vas a desaprobar el examen.", "Tercer strike: el examen quedó desaprobado."];
const L = ["A", "B", "C"];

function ExamMode({ me, onClose }: { me: string; onClose: () => void }) {
  const S = useExam(), [ask, setAsk] = useState(false), [err, setErr] = useState("");
  const [ans, setAns] = useState<(number | null)[]>([]), [busy, setBusy] = useState(false), [warn, setWarn] = useState<{ n: number; why: string } | null>(null), [fs, setFs] = useState(!!document.fullscreenElement), [, tick] = useState(0);
  const att = S?.me.att, run = att?.st === "run", qs = S?.me.qs || [], last = useRef(0), base = useRef<number | null>(null), ending = useRef(false);
  useEffect(() => { if (S?.me.ans) setAns(a => (a.length === S.me.ans!.length ? a : S.me.ans!)); }, [S?.me.ans]);

  const strike = useCallback(async (why: string) => {
    if (!run || ending.current || Date.now() - last.current < 2500) return; last.current = Date.now();
    const r = await exApi({ a: "strike", why });
    if (r.__s === 200) { setWarn({ n: r.strikes, why }); if (r.done) await exRefresh(); else void exRefresh(); }
  }, [run]);

  /* bloqueos y detección mientras el examen está en curso */
  useEffect(() => {
    if (!run) return;
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const evs = ["copy", "cut", "paste", "contextmenu", "selectstart", "dragstart", "beforeprint"] as const;
    evs.forEach(t => document.addEventListener(t, stop, true));
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (k === "printscreen") { stop(e); void navigator.clipboard?.writeText("").catch(() => {}); void strike("Captura de pantalla"); return; }
      if (k === "f12" || (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k)) || (e.metaKey && e.altKey && ["i", "j", "c"].includes(k))) { stop(e); void strike("Herramientas del navegador"); return; }
      if (e.metaKey && e.shiftKey && ["3", "4", "5", "s"].includes(k)) { stop(e); void strike("Captura de pantalla"); return; }
      if (mod && ["c", "x", "v", "a", "p", "s", "u", "f"].includes(k)) stop(e);
    };
    const keyUp = (e: KeyboardEvent) => { if (e.key === "PrintScreen") { void navigator.clipboard?.writeText("").catch(() => {}); void strike("Captura de pantalla"); } };
    const vis = () => { if (document.visibilityState === "hidden") void strike("Saliste de la pestaña del examen"); };
    const blur = () => setTimeout(() => { if (!document.hasFocus()) void strike("Saliste de la ventana del examen"); }, 300);
    const fsc = () => setFs(!!document.fullscreenElement);
    /* consola abierta: la ventana queda mucho más grande que la página (solo en PC) */
    const touch = matchMedia("(pointer: coarse)").matches;
    const dev = setInterval(() => {
      if (touch) return; const d = Math.max(window.outerWidth - window.innerWidth, window.outerHeight - window.innerHeight);
      if (base.current === null || d < base.current) base.current = d;
      if (d - base.current > 200) { base.current = d; void strike("Herramientas del navegador"); }
    }, 1000);
    document.addEventListener("keydown", key, true); document.addEventListener("keyup", keyUp, true);
    document.addEventListener("visibilitychange", vis); window.addEventListener("blur", blur); document.addEventListener("fullscreenchange", fsc);
    return () => { evs.forEach(t => document.removeEventListener(t, stop, true)); document.removeEventListener("keydown", key, true); document.removeEventListener("keyup", keyUp, true);
      document.removeEventListener("visibilitychange", vis); window.removeEventListener("blur", blur); document.removeEventListener("fullscreenchange", fsc); clearInterval(dev); };
  }, [run, strike]);

  /* reloj: al llegar a 0 se entrega solo */
  useEffect(() => { if (!run) return; const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, [run]);
  const left = att ? Math.max(0, att.end - srvNow()) : 0;
  const finish = useCallback(async (auto = false) => {
    if (ending.current) return;
    if (!auto) { setAsk(true); return; }
    ending.current = true; setAsk(false); setBusy(true); const r = await exApi({ a: "end" }); setBusy(false);
    if (r.__s !== 200 && r.__s !== 409) { ending.current = false; setErr(r.msg || "No se pudo entregar. Probá de nuevo."); return; }
    await exRefresh(); try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* */ }
  }, []);
  useEffect(() => { if (run && att && left <= 0) void finish(true); }, [run, att, left, finish]);

  const start = async () => {
    try { await document.documentElement.requestFullscreen?.(); } catch { /* el navegador puede no dejar */ }
    setBusy(true); const r = await exApi({ a: "start" }); setBusy(false);
    if (r.__s !== 200) { setErr(r.msg || "No se pudo empezar"); try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* */ } return; }
    ending.current = false; base.current = null; await exRefresh();
  };
  const pick = (i: number, v: number) => { const n = [...ans]; n[i] = n[i] === v ? null : v; setAns(n); void exApi({ a: "save", i, v: n[i] }).then(r => { if (r.__s === 409) void exRefresh(); }); };
  if (!S) return null;
  const mm = Math.floor(left / 60e3), ss = Math.floor(left / 1000) % 60, done = ans.filter(a => a != null).length;

  return createPortal(
    <div className="exam-root fixed inset-0 z-[300] flex select-none flex-col bg-[#060a12] text-slate-100 [-webkit-touch-callout:none]" onCopy={e => e.preventDefault()}>
      <style>{"@media print{.exam-root{display:none!important}}"}</style>
      {/* marca de agua con el nombre: una foto del examen dice de quién es */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-[.035]">
        <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-12 text-lg font-black uppercase tracking-widest">{Array.from({ length: 160 }, (_, i) => <span key={i}>{me} · METRO</span>)}</div></div>

      <header className="relative flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a1120]/90 px-5 py-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#1f6fb0]/25 ring-1 ring-[#1f6fb0]/50"><ShieldAlert className="size-5 text-sky-300" /></span>
        <div className="min-w-0 flex-1"><p className="font-mono text-[10px] font-bold uppercase tracking-[.24em] text-sky-300/80">Metropolitan Division · Examen escrito{att?.test ? " · prueba" : ""}</p>
          <p className="truncate text-base font-bold">{me}</p></div>
        {run && <>
          <span className="flex items-center gap-1" title="Strikes">{[1, 2, 3].map(i => <span key={i} className={cn("size-2.5 rounded-full", (att?.strikes || 0) >= i ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : "bg-white/15")} />)}</span>
          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/70">{done}/{qs.length}</span>
          <span className={cn("rounded-lg px-3 py-1 font-mono text-lg font-bold tabular-nums", left < 120e3 ? "bg-red-500/20 text-red-300" : "bg-white/5")}>{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>
          {!fs && document.fullscreenEnabled && <button onClick={() => void document.documentElement.requestFullscreen().catch(() => {})} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"><Maximize className="size-3.5" />Pantalla completa</button>}
        </>}
        {!run && <button onClick={onClose} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">Salir</button>}
      </header>

      <main className="relative flex-1 overflow-y-auto">
        {run ? <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {qs.map((x, i) => (
            <section key={i} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.18em] text-sky-300/70">Pregunta {i + 1} de {qs.length}{x.c && ` · ${x.c}`}</p>
              <p className="mb-4 text-[15.5px] font-semibold leading-snug">{x.q}</p>
              <div className="space-y-2">{x.o.map((o, j) => { const on = ans[i] === j; return (
                <button key={j} onClick={() => pick(i, j)} aria-pressed={on} className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left text-[14px] leading-snug transition",
                  on ? "border-sky-400 bg-sky-500/15 text-white shadow-[0_0_18px_-6px_#38bdf8]" : "border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/[.04]")}>
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold", on ? "bg-sky-400 text-slate-950" : "bg-white/10")}>{L[j]}</span>{o}</button>); })}</div>
            </section>))}
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <p className="mr-auto text-sm text-white/60">Respondiste {done} de {qs.length}. Las respuestas se guardan solas.</p>
            <button disabled={busy} onClick={() => void finish()} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50">Entregar examen</button>
          </div>
        </div>
        : att?.st === "done" ? <Center icon={att.fin === "strikes" ? <AlertTriangle className="size-7" /> : <CheckCircle2 className="size-7" />} bad={att.fin === "strikes"}
            t={att.fin === "strikes" ? "Examen desaprobado" : "Examen entregado"}
            d={att.fin === "strikes" ? "Acumulaste 3 strikes. La coordinación ya tiene el registro." : att.fin === "tiempo" ? "Se terminó el tiempo y el examen se entregó solo con lo que habías respondido. La coordinación te va a comunicar el resultado." : "Listo. La coordinación te va a comunicar el resultado."}>
            <button onClick={onClose} className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10">Volver a la terminal</button></Center>
        : !S.me.can ? <Center icon={<Lock className="size-7" />} bad t="No estás anotado" d="Este examen es solo para los postulantes de la convocatoria."><button onClick={onClose} className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10">Volver</button></Center>
        : !S.ready && !S.me.co ? <Center icon={<Lock className="size-7" />} bad t="No disponible" d={S.cfg.on && S.cfg.at ? `Se habilita el ${fmtAt(S.cfg.at)}.` : "La coordinación todavía no activó el examen."}><button onClick={onClose} className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/10">Volver</button></Center>
        : <div className="mx-auto max-w-xl space-y-5 px-4 py-10">
            <div className="text-center"><p className="text-2xl font-bold">Antes de empezar</p><p className="mt-1 text-sm text-white/60">{S.n} preguntas de opción múltiple · {S.cfg.dur} minutos · una sola respuesta correcta por pregunta</p>
              {S.me.co && !S.ready && <p className="mt-2 text-xs font-semibold text-amber-300">El examen no está activo: entrás como prueba de la coordinación.</p>}</div>
            <ul className="space-y-2 rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-white/80">
              {["El reloj arranca cuando tocás Comenzar y no se detiene aunque cierres la página.", "No se puede copiar, pegar, seleccionar texto ni usar el clic derecho.",
                "Salir de la pestaña o de la ventana, sacar capturas o abrir las herramientas del navegador suma un strike.", "Al tercer strike el examen queda desaprobado automáticamente.",
                "Las respuestas se guardan solas. Al terminar el tiempo se entrega con lo que hayas respondido.", "El resultado te lo comunica la coordinación."].map(t =>
                <li key={t} className="flex gap-2.5"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-400" />{t}</li>)}</ul>
            <div className="flex justify-center gap-2"><button onClick={onClose} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Ahora no</button>
              <button disabled={busy} onClick={() => void start()} className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50">Comenzar examen</button></div>
          </div>}
      </main>

      {err && <div className="absolute inset-x-0 top-20 z-20 flex justify-center px-4"><div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/90 px-4 py-2.5 text-sm"><AlertTriangle className="size-4 text-red-400" />{err}<button onClick={() => setErr("")} className="text-white/50 hover:text-white"><X className="size-4" /></button></div></div>}
      {ask && <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0d1424] p-6 text-center">
        <p className="text-lg font-bold">¿Entregar el examen?</p>
        <p className="mt-2 text-sm text-white/70">{ans.filter(a => a == null).length ? `Te quedan ${ans.filter(a => a == null).length} preguntas sin responder.` : "Respondiste todas."} Después no vas a poder cambiar las respuestas.</p>
        <div className="mt-5 flex justify-center gap-2"><button onClick={() => setAsk(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10">Seguir respondiendo</button>
          <button onClick={() => { ending.current = false; void finish(true); }} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-400">Entregar</button></div></div></div>}
      {warn && <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-red-500/50 bg-[#1a0a0d] p-6 text-center shadow-[0_0_60px_-10px_#ef4444]">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-500/20 text-red-400"><AlertTriangle className="size-7" /></span>
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[.24em] text-red-400">Strike {Math.min(warn.n, 3)} de 3</p>
          <p className="mt-1 text-lg font-bold">{warn.why}</p>
          <p className="mt-2 text-sm text-white/75">{STRIKE_TXT[Math.min(warn.n, 3)]}</p>
          <button onClick={() => { setWarn(null); last.current = Date.now(); }} className="mt-5 rounded-xl bg-red-500 px-6 py-2 text-sm font-bold text-white hover:bg-red-400">{warn.n >= 3 ? "Entendido" : "Volver al examen"}</button>
        </div></div>}
    </div>, document.body);
}

function Center({ icon, t, d, bad, children }: { icon: React.ReactNode; t: string; d: string; bad?: boolean; children?: React.ReactNode }) {
  return <div className="grid min-h-full place-items-center p-6"><div className="max-w-md text-center">
    <span className={cn("mx-auto grid size-16 place-items-center rounded-2xl", bad ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>{icon}</span>
    <p className="mt-4 text-2xl font-bold">{t}</p><p className="mt-2 text-sm text-white/65">{d}</p><div className="mt-6">{children}</div></div></div>;
}

/* estado del examen: verde (listo), ámbar (programado) o rojo con candado (no disponible) */
export function ExamStatus({ big }: { big?: boolean }) {
  const S = useExam(); if (!S) return null;
  const soon = S.cfg.on && !S.ready, [c, t] = S.ready ? ["#22c55e", "Listo"] : soon ? ["#f59e0b", "Programado"] : ["#ef4444", "No disponible"];
  return <span className={cn("inline-flex items-center gap-1 rounded-md font-bold", big ? "px-2.5 py-1 text-xs" : "px-1.5 py-px text-[10px]")} style={{ color: c, background: c + "1f", boxShadow: `0 0 10px -3px ${c}` }}>
    {S.ready ? <CheckCircle2 className={big ? "size-3.5" : "!size-3"} /> : <Lock className={big ? "size-3.5" : "!size-3"} />}{t}</span>;
}

