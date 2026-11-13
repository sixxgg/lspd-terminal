/* Examen en línea de la METRO, en toda la terminal:
   - ExamWatch consulta el estado cada tanto y, a quien está anotado, le avisa arriba de la pantalla cuando se acerca la hora y cuando ya está listo.
   - ExamMode tapa toda la tablet: solo existe el examen. Bloquea copiar, pegar, el clic derecho y la selección; salir de la pestaña,
     las capturas o abrir las herramientas del navegador suman un strike (al tercero se desaprueba). Las respuestas correctas nunca llegan al navegador. */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Lock, Maximize, Send, X } from "lucide-react";
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
        <div className="push-pill upd-in pointer-events-auto flex w-fit max-w-full items-center gap-2.5 py-1.5 pl-1.5 pr-1.5">
          <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-white", S.ready ? "bg-emerald-500 shadow-[0_0_14px_-2px_#10b981]" : "bg-amber-500 shadow-[0_0_14px_-2px_#f59e0b]")}>{S.ready ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}</span>
          <p className="min-w-0 text-[13.5px] leading-snug text-white"><b className="font-semibold">Examen escrito METRO</b><span className="text-white/60"> · {S.ready ? `ya disponible, ${S.cfg.dur} min` : `empieza a las ${new Date(at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} (en ${Math.max(1, Math.ceil((at - now) / 60e3))} min)`}</span></p>
          {S.ready && <button onClick={() => setOpen(true)} className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1 text-[13px] font-bold text-emerald-950 hover:bg-emerald-400">Iniciar</button>}
          <button onClick={() => setHide(sig)} aria-label="Cerrar aviso" className="shrink-0 rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white"><X className="size-3.5" /></button>
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
  const [cur, setCur] = useState(0), pickRef = useRef<(i: number, v: number) => void>(() => {});
  const pick = (i: number, v: number) => { const n = [...ans]; n[i] = n[i] === v ? null : v; setAns(n); void exApi({ a: "save", i, v: n[i] }).then(r => { if (r.__s === 409) void exRefresh(); }); };
  pickRef.current = pick;
  /* teclado: ← → para moverse, A/B/C o 1/2/3 para responder */
  useEffect(() => {
    if (!run) return;
    const k = (e: KeyboardEvent) => {
      if (warn || ask || e.ctrlKey || e.metaKey || e.altKey) return;
      const x = e.key.toLowerCase(), j = ["a", "b", "c"].indexOf(x) >= 0 ? ["a", "b", "c"].indexOf(x) : ["1", "2", "3"].indexOf(x);
      if (e.key === "ArrowRight") setCur(c => Math.min(qs.length - 1, c + 1)); else if (e.key === "ArrowLeft") setCur(c => Math.max(0, c - 1)); else if (j >= 0) pickRef.current(cur, j);
    };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [run, warn, ask, qs.length, cur]);
  if (!S) return null;
  const mm = Math.floor(left / 60e3), ss = Math.floor(left / 1000) % 60, done = ans.filter(a => a != null).length, total = (S.cfg.dur || 30) * 60e3;
  const Q = qs[Math.min(cur, qs.length - 1)], blank = qs.length - done, sk = att?.strikes || 0, low = left < 120e3;
  const close = <button onClick={onClose} className="ex-btn ex-ghost">Volver a la terminal</button>;

  return createPortal(
    <div className="exam-root fixed inset-0 z-[300] flex select-none flex-col text-slate-100 [-webkit-touch-callout:none]" onCopy={e => e.preventDefault()}>
      <style>{EX_CSS}</style>
      <header className="relative z-[1] flex items-center gap-4 border-b border-white/[.07] bg-[#070b14]/80 px-5 py-3 backdrop-blur">
        <img src="/next/lspd-seal.webp" alt="" className="size-10 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,.35)]" />
        <div className="min-w-0"><p className="text-[10.5px] font-bold uppercase tracking-[.22em] text-sky-300/80">Metropolitan Division{att?.test ? " · prueba" : ""}</p>
          <p className="truncate text-[15px] font-bold">Examen escrito de instructores</p></div>
        {run && <div className="mx-auto hidden w-full max-w-sm items-center gap-3 md:flex"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all" style={{ width: `${(done / Math.max(1, qs.length)) * 100}%` }} /></div>
          <span className="text-xs font-semibold tabular-nums text-white/60">{done}/{qs.length}</span></div>}
        <div className="ml-auto flex items-center gap-2.5">
          {run && <>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 sm:flex">Strikes{[1, 2, 3].map(i => <span key={i} className={cn("size-2 rounded-full", sk >= i ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-white/15")} />)}</span>
            <span className={cn("relative flex items-center gap-2 overflow-hidden rounded-full border px-3.5 py-1.5 font-mono text-[15px] font-bold tabular-nums", low ? "border-red-500/50 bg-red-500/15 text-red-300" : "border-white/10 bg-white/[.04]")}>
              <Clock className="size-4 opacity-70" />{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
              <span className={cn("absolute inset-x-0 bottom-0 h-0.5", low ? "bg-red-400" : "bg-sky-400")} style={{ width: `${(left / total) * 100}%` }} /></span>
            {!fs && document.fullscreenEnabled && <button onClick={() => void document.documentElement.requestFullscreen().catch(() => {})} title="Pantalla completa" className="ex-btn ex-ghost !px-2.5"><Maximize className="size-4" /></button>}
          </>}
          <span className="hidden text-right text-xs leading-tight text-white/50 lg:block">Rinde<br /><b className="text-white/85">{me}</b></span>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto">
        {run && Q ? <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-10">
          <aside className="ex-card h-fit space-y-4 p-4 lg:sticky lg:top-6">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/45">Preguntas</p>
            <div className="grid grid-cols-5 gap-1.5 lg:grid-cols-4">{qs.map((_, i) => (
              <button key={i} onClick={() => setCur(i)} aria-label={`Pregunta ${i + 1}`} className={cn("grid aspect-square place-items-center rounded-lg text-[13px] font-bold transition",
                i === cur ? "bg-sky-400 text-slate-950 shadow-[0_0_14px_-2px_#38bdf8]" : ans[i] != null ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30" : "bg-white/[.05] text-white/45 hover:bg-white/10")}>{i + 1}</button>))}</div>
            <div className="space-y-1 text-[11.5px] text-white/50"><p className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-sky-500/40" />Respondida</p><p className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-white/10" />Sin responder</p></div>
            <button disabled={busy} onClick={() => void finish()} className="ex-btn ex-ok w-full">Entregar examen</button>
            <p className="text-center text-[11px] text-white/40">Las respuestas se guardan solas</p>
          </aside>
          <section key={cur} className="ex-card ex-in flex min-h-[26rem] flex-col p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-300">Pregunta {cur + 1} de {qs.length}</span>
              {Q.c && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/55">{Q.c}</span>}</div>
            <h2 className="mt-4 text-xl font-bold leading-snug sm:text-[22px]">{Q.q}</h2>
            <div className="mt-6 space-y-2.5">{Q.o.map((o, j) => { const on = ans[cur] === j; return (
              <button key={j} onClick={() => pick(cur, j)} aria-pressed={on} className={cn("group flex w-full items-center gap-4 rounded-2xl border p-4 text-left text-[14.5px] leading-snug transition",
                on ? "border-sky-400/80 bg-sky-400/10 text-white shadow-[0_0_0_1px_rgba(56,189,248,.4),0_10px_30px_-12px_rgba(56,189,248,.6)]" : "border-white/[.08] bg-white/[.02] text-white/75 hover:border-white/20 hover:bg-white/[.05]")}>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition", on ? "bg-sky-400 text-slate-950" : "bg-white/[.07] text-white/60 group-hover:bg-white/15")}>{L[j]}</span>
                <span className="flex-1">{o}</span>{on && <CheckCircle2 className="size-5 shrink-0 text-sky-300" />}</button>); })}</div>
            <div className="mt-auto flex items-center gap-2 pt-8">
              <button disabled={cur === 0} onClick={() => setCur(cur - 1)} className="ex-btn ex-ghost"><ChevronLeft className="size-4" />Anterior</button>
              <span className="mx-auto hidden text-[11px] text-white/35 sm:block">← → para moverte · A B C para responder</span>
              {cur < qs.length - 1 ? <button onClick={() => setCur(cur + 1)} className="ex-btn ex-pri">Siguiente<ChevronRight className="size-4" /></button>
                : <button disabled={busy} onClick={() => void finish()} className="ex-btn ex-ok">Entregar examen</button>}
            </div>
          </section>
        </div>
        : att?.st === "done" ? <Center tone={att.fin === "strikes" ? "bad" : "ok"} icon={att.fin === "strikes" ? <AlertTriangle className="size-7" /> : <CheckCircle2 className="size-7" />}
            t={att.fin === "strikes" ? "Examen desaprobado" : "Examen entregado"}
            d={att.fin === "strikes" ? "Acumulaste 3 strikes, así que el examen quedó desaprobado. La coordinación ya tiene el registro." : att.fin === "tiempo" ? "Se terminó el tiempo y el examen se entregó con lo que habías respondido. La coordinación te va a comunicar el resultado." : "Tus respuestas quedaron guardadas. La coordinación te va a comunicar el resultado."}>{close}</Center>
        : !S.me.can ? <Center tone="bad" icon={<Lock className="size-7" />} t="No estás anotado" d="Este examen es solo para los postulantes de la convocatoria.">{close}</Center>
        : !S.ready && !S.me.co ? <Center tone="bad" icon={<Lock className="size-7" />} t="No disponible" d={S.cfg.on && S.cfg.at ? `Se habilita el ${fmtAt(S.cfg.at)}.` : "La coordinación todavía no activó el examen."}>{close}</Center>
        : <div className="grid min-h-full place-items-center px-4 py-10"><div className="ex-card ex-in w-full max-w-2xl overflow-hidden">
            <div className="border-b border-white/[.07] bg-[radial-gradient(120%_140%_at_50%_0%,rgba(56,189,248,.16),transparent_60%)] px-8 pb-6 pt-8 text-center">
              <img src="/next/lspd-seal.webp" alt="" className="mx-auto size-16 object-contain drop-shadow-[0_0_18px_rgba(56,189,248,.45)]" />
              <h1 className="mt-3 text-2xl font-bold">Antes de empezar</h1>
              <p className="mt-1 text-sm text-white/55">Leé las reglas: cuando tocás Comenzar arranca el reloj.</p>
              {S.me.co && !S.ready && <p className="mx-auto mt-3 w-fit rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">No está activo: entrás como prueba de la coordinación</p>}
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[.07] border-b border-white/[.07] text-center">
              {[[S.n, "preguntas"], [S.cfg.dur, "minutos"], [3, "strikes y se desaprueba"]].map(([v, l]) => <div key={l} className="px-3 py-4"><p className="text-2xl font-bold tabular-nums">{v}</p><p className="text-[11.5px] text-white/50">{l}</p></div>)}</div>
            <ol className="space-y-3 px-8 py-6">
              {([[Clock, "El reloj no se detiene, aunque cierres la página. Al llegar a cero se entrega solo."], [CheckCircle2, "Cada pregunta tiene 3 opciones y una sola correcta. Las respuestas se guardan solas."],
                [Lock, "No se puede copiar, pegar, seleccionar texto ni usar el clic derecho."], [AlertTriangle, "Salir de la pestaña o la ventana, sacar capturas o abrir las herramientas del navegador suma un strike."]] as const).map(([I, t], i) =>
                <li key={i} className="flex items-start gap-3 text-[14px] leading-snug text-white/80"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[.06] text-sky-300"><I className="size-3.5" /></span><span className="pt-1">{t}</span></li>)}</ol>
            <div className="flex justify-end gap-2 border-t border-white/[.07] bg-white/[.02] px-8 py-4">
              <button onClick={onClose} className="ex-btn ex-ghost">Ahora no</button>
              <button disabled={busy} onClick={() => void start()} className="ex-btn ex-pri">Comenzar examen<ChevronRight className="size-4" /></button></div>
          </div></div>}
      </main>

      {err && <div className="absolute inset-x-0 top-16 z-20 flex justify-center px-4"><div className="push-pill flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 text-[13.5px]"><span className="grid size-7 place-items-center rounded-full bg-red-500"><AlertTriangle className="size-3.5" /></span>{err}<button onClick={() => setErr("")} className="text-white/50 hover:text-white"><X className="size-4" /></button></div></div>}
      {ask && <Dlg tone="ok" icon={<Send className="size-6" />} t="¿Entregar el examen?" d={blank ? `Te ${blank === 1 ? "queda 1 pregunta" : `quedan ${blank} preguntas`} sin responder. Después de entregar no vas a poder cambiar nada.` : "Respondiste todas. Después de entregar no vas a poder cambiar nada."}>
        <button onClick={() => setAsk(false)} className="ex-btn ex-ghost">Seguir respondiendo</button>
        <button onClick={() => { ending.current = false; void finish(true); }} className="ex-btn ex-ok">Entregar</button></Dlg>}
      {warn && <Dlg tone="bad" icon={<AlertTriangle className="size-6" />} t={warn.why} d={STRIKE_TXT[Math.min(warn.n, 3)]}
        top={<div className="mb-3 flex items-center justify-center gap-1.5">{[1, 2, 3].map(i => <span key={i} className={cn("h-1.5 w-8 rounded-full", warn.n >= i ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : "bg-white/15")} />)}<span className="ml-2 text-[11px] font-bold uppercase tracking-[.2em] text-red-400">Strike {Math.min(warn.n, 3)} de 3</span></div>}>
        <button onClick={() => { setWarn(null); last.current = Date.now(); }} className="ex-btn ex-bad">{warn.n >= 3 ? "Entendido" : "Volver al examen"}</button></Dlg>}
    </div>, document.body);
}

const EX_CSS = `@media print{.exam-root{display:none!important}}
.exam-root{background:radial-gradient(80% 60% at 50% -10%,rgba(31,111,176,.22),transparent 60%),radial-gradient(60% 50% at 100% 100%,rgba(16,185,129,.07),transparent 60%),#05080f}
.exam-root:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent)}
.ex-card{border-radius:24px;background:linear-gradient(180deg,rgba(20,27,42,.85),rgba(11,15,24,.9));border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 80px -30px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.05)}
.ex-in{animation:ex-in .35s cubic-bezier(.2,.9,.3,1) both}@keyframes ex-in{from{opacity:0;transform:translateY(10px)}}
.ex-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;border-radius:12px;padding:.6rem 1.1rem;font-size:13.5px;font-weight:700;transition:all .15s}
.ex-btn:disabled{opacity:.4;pointer-events:none}
.ex-ghost{border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.75)}.ex-ghost:hover{background:rgba(255,255,255,.07);color:#fff}
.ex-pri{background:#38bdf8;color:#04121f;box-shadow:0 8px 24px -10px #38bdf8}.ex-pri:hover{background:#7dd3fc}
.ex-ok{background:#10b981;color:#03140d;box-shadow:0 8px 24px -10px #10b981}.ex-ok:hover{background:#34d399}
.ex-bad{background:#ef4444;color:#fff;box-shadow:0 8px 24px -10px #ef4444}.ex-bad:hover{background:#f87171}`;

function Dlg({ tone, icon, t, d, top, children }: { tone: "ok" | "bad"; icon: React.ReactNode; t: string; d: string; top?: React.ReactNode; children: React.ReactNode }) {
  return <div className="absolute inset-0 z-10 grid place-items-center bg-[#02050b]/75 p-4 backdrop-blur-md">
    <div className={cn("ex-card ex-in w-full max-w-md p-7 text-center", tone === "bad" && "!border-red-500/40 shadow-[0_0_80px_-20px_#ef4444]")}>
      {top}
      <span className={cn("mx-auto grid size-14 place-items-center rounded-2xl", tone === "bad" ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30")}>{icon}</span>
      <p className="mt-4 text-xl font-bold">{t}</p><p className="mt-2 text-sm leading-relaxed text-white/65">{d}</p>
      <div className="mt-6 flex justify-center gap-2">{children}</div></div></div>;
}
function Center({ icon, t, d, tone, children }: { icon: React.ReactNode; t: string; d: string; tone: "ok" | "bad"; children?: React.ReactNode }) {
  return <div className="grid min-h-full place-items-center p-6"><div className="ex-card ex-in w-full max-w-md p-8 text-center">
    <span className={cn("mx-auto grid size-16 place-items-center rounded-2xl", tone === "bad" ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30")}>{icon}</span>
    <p className="mt-5 text-2xl font-bold">{t}</p><p className="mt-2 text-sm leading-relaxed text-white/60">{d}</p><div className="mt-7 flex justify-center">{children}</div></div></div>;
}

/* estado del examen: verde (listo), ámbar (programado) o rojo con candado (no disponible) */
export function ExamStatus({ big }: { big?: boolean }) {
  const S = useExam(); if (!S) return null;
  const soon = S.cfg.on && !S.ready, [c, t] = S.ready ? ["#22c55e", "Listo"] : soon ? ["#f59e0b", "Programado"] : ["#ef4444", "No disponible"];
  return <span className={cn("inline-flex items-center gap-1 rounded-md font-bold", big ? "px-2.5 py-1 text-xs" : "px-1.5 py-px text-[10px]")} style={{ color: c, background: c + "1f", boxShadow: `0 0 10px -3px ${c}` }}>
    {S.ready ? <CheckCircle2 className={big ? "size-3.5" : "!size-3"} /> : <Lock className={big ? "size-3.5" : "!size-3"} />}{t}</span>;
}

