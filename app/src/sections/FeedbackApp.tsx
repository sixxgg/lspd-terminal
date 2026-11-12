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
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_85%_0%,rgba(236,72,153,.45),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(99,102,241,.35),transparent_55%),linear-gradient(135deg,#140b1f,#0b1020)] px-6 py-6 text-white ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 opacity-[.06] [background:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_8px)]" />
        <div className="relative flex flex-wrap items-end gap-6">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.28em] text-pink-300/90">Terminal LSPD · Feedback</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Ayudanos a mejorar la terminal</h2>
            <p className="mt-1 max-w-xl text-sm text-white/65">Errores, ideas o cambios: lo lee six y te avisamos por la campanita cuando cambie de estado.</p>
          </div>
          <div className="flex gap-2">{([["Enviados", L.length, "#f9a8d4"], ["En curso", n("curso"), "#7dd3fc"], ["Resueltos", done, "#86efac"]] as const).map(([l, v, c]) => (
            <div key={l} className="min-w-[5.5rem] rounded-2xl bg-white/[.06] px-3 py-2 text-center ring-1 ring-white/10"><p className="text-2xl font-bold tabular-nums" style={{ color: c }}>{v}</p><p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/50">{l}</p></div>))}</div>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="space-y-5 p-5">
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">1 · ¿Qué es?</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{FB_CATS.map(x => { const on = x.k === cat; return (
              <button key={x.k} onClick={() => setCat(x.k)} aria-pressed={on} className={cn("group relative overflow-hidden rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", on ? "border-transparent text-white shadow-lg" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}
                style={on ? { background: `linear-gradient(135deg, ${x.c}, ${x.c}aa)`, boxShadow: `0 10px 24px -12px ${x.c}` } : undefined}>
                <x.I className="size-5" style={on ? undefined : { color: x.c }} /><p className="mt-2 text-sm font-bold">{x.l}</p><p className={cn("text-[11.5px] leading-snug", on ? "text-white/80" : "text-slate-500")}>{x.d}</p></button>); })}</div></div>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">2 · ¿Dónde?</p>
            <div className="flex flex-wrap gap-1.5">{areas.map(a => <button key={a} onClick={() => setArea(a)} aria-pressed={area === a} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", area === a ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-200")}>{a}</button>)}</div></div>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">3 · Contanos</p>
            <RichEditor ref={ed} key={cat} placeholder={C.ph} images={8} minH="min-h-[13rem]" onChange={() => setEmpty(!!ed.current?.empty())} /></div>
          <div className="flex flex-wrap items-center gap-3"><p className="mr-auto text-xs text-slate-500">Hasta 8 fotos (arrastrar o Ctrl+V). Formato: negrita, cursiva, subrayado, tachado, oculto y colores.</p>
            <Button icon={<Send />} loading={busy} disabled={empty} onClick={send} style={{ background: C.c }}>Enviar {C.l.toLowerCase()}</Button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><Heart className="size-4 text-pink-500" /><b className="flex-1 text-sm">Mis feedback</b><span className="text-xs text-slate-400">{L.length}</span></div>
          <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2 dark:border-slate-800">{FILT.map(k => { const s = k === "all" ? null : FB_ST[k], c = k === "all" ? L.length : n(k); return (
            <button key={k} onClick={() => setF(k)} className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition", f === k ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
              {s && <span className="size-1.5 rounded-full" style={{ background: s.c }} />}{s ? s.l : "Todos"} {c}</button>); })}</div>
          <div className="max-h-[65vh] overflow-y-auto p-3"><FbList list={shown} /></div>
        </Card>
      </div>
    </div>);
}
