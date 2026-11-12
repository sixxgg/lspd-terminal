/* Feedback de la terminal: tipo (error, idea, mejora u otro), sección de la terminal y texto con formato y fotos.
   Le llega a six (Notificaciones) y a Discord; cada uno sigue el estado de lo suyo. */
import { useRef, useState } from "react";
import { Bug, Heart, Lightbulb, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { RichEditor, type RichRef } from "@/components/richedit";
import { api } from "@/lib/api";
import { safeHtml } from "@/lib/richtext";
import { AREAS } from "@/nav";
import { FB_ST, FbList, fbSt, useMyFeedback, type FbSt } from "@/components/fbnotif";
import { cn } from "@/lib/cn";

const FB_CATS = [
  { k: "error", l: "Error", d: "Algo no anda o se ve mal", I: Bug, c: "#ef4444", ph: "¿Qué pasó? ¿Dónde estabas y qué tocaste? Si podés, pegá una captura con Ctrl+V." },
  { k: "idea", l: "Idea", d: "Algo nuevo que sumarías", I: Lightbulb, c: "#f59e0b", ph: "Contanos la idea: qué haría y a quién le serviría." },
  { k: "mejora", l: "Mejora", d: "Algo que ya existe, mejor", I: Sparkles, c: "#a855f7", ph: "¿Qué cambiarías y cómo te gustaría que quede?" },
  { k: "otro", l: "Otro", d: "Cualquier otra cosa", I: MessageCircle, c: "#64748b", ph: "Escribí lo que quieras contarnos…" },
] as const;
const FILT: ("all" | FbSt)[] = ["all", "pend", "curso", "add", "fix", "rej"];

export function FeedbackApp() {
  const { toast } = useFeedback(), mine = useMyFeedback(), ed = useRef<RichRef>(null);
  const [cat, setCat] = useState<string>("error"), [area, setArea] = useState("General"), [busy, setBusy] = useState(false), [empty, setEmpty] = useState(true), [f, setF] = useState<"all" | FbSt>("all");
  const C = FB_CATS.find(x => x.k === cat)!, areas = ["General", ...AREAS.filter(a => !a.hidden && a.k !== "fb").map(a => a.l)];
  const send = async () => {
    const e = ed.current?.el; if (!e || ed.current?.empty()) return;
    const imgs: string[] = [];
    const html = safeHtml(e.innerHTML, el => { const s = el.getAttribute("src") || ""; if (!/^data:image\//.test(s)) return ""; imgs.push(s); return `img:${imgs.length - 1}`; });
    setBusy(true); const r = await api("/api/feedback", { html, imgs, cat, area: area === "General" ? "" : area }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo enviar el feedback", "err"); return; }
    ed.current?.clear(); toast("¡Gracias! Lo recibimos."); window.dispatchEvent(new Event("lspd:fb"));
  };
  const L = mine.list, n = (s: FbSt) => L.filter(x => fbSt(x.st) === s).length, done = n("add") + n("fix");
  const shown = f === "all" ? L : L.filter(x => fbSt(x.st) === f);
  const F = (k: "all" | FbSt) => (k === "all" ? { l: "Todos", c: "#e2e8f0", I: Heart, v: L.length } : { ...FB_ST[k], v: n(k) });
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_85%_0%,rgba(236,72,153,.4),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(99,102,241,.3),transparent_55%),linear-gradient(135deg,#140b1f,#0b1020)] px-5 py-4 text-white ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 opacity-[.05] [background:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_8px)]" />
        <div className="relative flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="min-w-0 flex-1"><p className="font-mono text-[10px] font-bold uppercase tracking-[.26em] text-pink-300/90">Terminal LSPD · Feedback</p>
            <h2 className="mt-0.5 text-xl font-bold tracking-tight">Ayudanos a mejorar la terminal</h2></div>
          <ol className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold text-white/70">{["Lo enviás", "six lo revisa", "Se trabaja", "Te avisa la campanita"].map((t, i) => (
            <li key={t} className="flex items-center gap-1.5">{i > 0 && <span className="h-px w-4 bg-white/25" />}<span className="grid size-5 place-items-center rounded-full bg-white/10 font-mono text-[10px] text-pink-200">{i + 1}</span>{t}</li>))}</ol>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Card className="space-y-4 p-5">
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">1 · ¿Qué es?</p>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">{FB_CATS.map(x => { const on = x.k === cat; return (
              <button key={x.k} onClick={() => setCat(x.k)} aria-pressed={on} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", on ? "border-transparent text-white" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900")}
                style={on ? { background: `linear-gradient(135deg, ${x.c}, ${x.c}b3)`, boxShadow: `0 10px 22px -14px ${x.c}` } : undefined}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={on ? { background: "rgba(255,255,255,.18)" } : { background: x.c + "1f", color: x.c }}><x.I className="size-5" /></span>
                <span className="min-w-0"><span className="block text-[15px] font-bold leading-tight">{x.l}</span><span className={cn("block text-[12.5px] leading-snug", on ? "text-white/85" : "text-slate-500 dark:text-slate-400")}>{x.d}</span></span></button>); })}</div></div>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">2 · ¿Dónde?</p>
            <div className="flex flex-wrap gap-1.5">{areas.map(a => <button key={a} onClick={() => setArea(a)} aria-pressed={area === a} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", area === a ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-200")}>{a}</button>)}</div></div>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">3 · Contanos</p>
            <RichEditor ref={ed} key={cat} placeholder={C.ph} images={8} minH="min-h-[8.5rem]" onChange={() => setEmpty(!!ed.current?.empty())} /></div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mr-auto flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500"><span className="rounded-md px-1.5 py-0.5 font-semibold text-white" style={{ background: C.c }}>{C.l}</span>en <b className="text-slate-700 dark:text-slate-200">{area}</b> · hasta 8 fotos (arrastrar o Ctrl+V)</p>
            <Button icon={<Send />} loading={busy} disabled={empty} onClick={send} style={{ background: C.c }}>Enviar</Button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-4 pb-2 pt-4"><Heart className="size-4 text-pink-500" /><b className="flex-1 text-sm">Mis feedback</b>{done > 0 && <span className="text-[11px] font-semibold text-emerald-500">{done} resueltos</span>}</div>
          <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">{FILT.map(k => { const x = F(k), on = f === k; return (
            <button key={k} onClick={() => setF(k)} aria-pressed={on} className={cn("flex flex-col items-start rounded-xl border px-2.5 py-2 text-left transition", on ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}>
              <span className="text-lg font-bold leading-none tabular-nums" style={on ? undefined : { color: x.c }}>{x.v}</span>
              <span className={cn("mt-1 text-[10.5px] font-semibold uppercase tracking-wide", on ? "opacity-80" : "text-slate-500")}>{x.l}</span></button>); })}</div>
          <div className="max-h-[60vh] overflow-y-auto border-t border-slate-100 p-3 dark:border-slate-800">
            {shown.length ? <FbList list={shown} /> : <div className="flex flex-col items-center gap-2 py-8 text-center"><span className="grid size-10 place-items-center rounded-full bg-pink-500/10 text-pink-500"><Heart className="size-5" /></span>
              <p className="text-sm font-semibold">{f === "all" ? "Todavía no enviaste nada" : "Nada en este estado"}</p><p className="max-w-[16rem] text-xs text-slate-500">Cuando mandes un feedback aparece acá con su estado y la respuesta de six.</p></div>}
          </div>
        </Card>
      </div>
    </div>);
}
