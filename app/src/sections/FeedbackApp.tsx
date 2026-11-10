/* Feedback de la terminal: cualquier usuario manda un ticket (sin asunto) con texto con formato y fotos. Le llega a six (Notificaciones) y a Discord. */
import { useEffect, useRef, useState } from "react";
import { Bold, EyeOff, ImagePlus, Palette, RemoveFormatting, Send, Strikethrough, Underline, X, MessageSquareHeart, CheckCircle2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { api } from "@/lib/api";
import { readImg } from "@/lib/patrol";
import { FB_COLORS, plainOf, safeHtml } from "@/lib/richtext";
import { fmtDate } from "@/lib/domain";
import { cn } from "@/lib/cn";

const SENT = "lspdt.next.fbSent"; // lo enviado desde este navegador (solo para mostrarlo acá)
type SentItem = { id: string; t: number; x: string };
const readSent = (): SentItem[] => { try { return JSON.parse(localStorage.getItem(SENT) || "[]") as SentItem[]; } catch { return []; } };

export function FeedbackApp() {
  const { toast } = useFeedback(), ed = useRef<HTMLDivElement>(null), file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [pal, setPal] = useState(false), [empty, setEmpty] = useState(true), [sent, setSent] = useState<SentItem[]>(readSent), [over, setOver] = useState(false);
  const check = () => { const e = ed.current; setEmpty(!e || (!e.textContent?.trim() && !e.querySelector("img"))); };
  const cmd = (c: string, v?: string) => { ed.current?.focus(); document.execCommand("styleWithCSS", false, "true"); document.execCommand(c, false, v); check(); };
  /* oculto (spoiler de Discord): envuelve la selección */
  const spoiler = () => {
    const s = window.getSelection(); if (!s || !s.rangeCount || s.isCollapsed || !ed.current?.contains(s.anchorNode)) { toast("Seleccioná el texto que querés ocultar", "err"); return; }
    const r = s.getRangeAt(0), sp = document.createElement("span"); sp.setAttribute("data-sp", ""); sp.appendChild(r.extractContents()); r.insertNode(sp); s.removeAllRanges(); check();
  };
  const addImgs = async (fs: FileList | File[]) => {
    const list = [...fs].filter(f => f.type.startsWith("image/")); if (!list.length) return;
    const have = ed.current?.querySelectorAll("img").length || 0; if (have + list.length > 8) { toast("Hasta 8 fotos por feedback", "err"); return; }
    ed.current?.focus();
    for (const f of list) { const d = await readImg(f, 1600); document.execCommand("insertHTML", false, `<img src="${d}" alt=""><br>`); }
    check();
  };
  useEffect(() => { const e = ed.current; if (!e) return;
    const paste = (ev: ClipboardEvent) => { const fs = [...(ev.clipboardData?.items || [])].filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()!).filter(Boolean);
      if (fs.length) { ev.preventDefault(); void addImgs(fs); return; }
      const h = ev.clipboardData?.getData("text/html"); if (h) { ev.preventDefault(); document.execCommand("insertHTML", false, safeHtml(h)); check(); } };
    e.addEventListener("paste", paste); return () => e.removeEventListener("paste", paste); });

  const send = async () => {
    const e = ed.current; if (!e || empty) return;
    const imgs: string[] = [];
    const html = safeHtml(e.innerHTML, el => { const s = el.getAttribute("src") || ""; if (!/^data:image\//.test(s)) return ""; imgs.push(s); return `img:${imgs.length - 1}`; });
    setBusy(true); const r = await api("/api/feedback", { html, imgs }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo enviar el feedback", "err"); return; }
    const it = { id: String(r.id), t: Date.now(), x: plainOf(html).slice(0, 140) || "(solo fotos)" }, L = [it, ...sent].slice(0, 20);
    setSent(L); try { localStorage.setItem(SENT, JSON.stringify(L)); } catch { /* */ }
    e.innerHTML = ""; check(); toast("¡Gracias! Tu feedback fue enviado.");
  };
  const tb = "grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 [&>svg]:size-4";
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader icon={<MessageSquareHeart />} title="Enviar feedback" desc="Errores, ideas o cosas que mejorar. No hace falta asunto: escribilo como quieras y sumá fotos si ayudan." />
        <CardBody>
          <div className="overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700">
            <div className="relative flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900/60" onMouseDown={e => { if ((e.target as HTMLElement).closest("button")) e.preventDefault(); }}>
              <button type="button" className={tb} title="Negrita (Ctrl+B)" onClick={() => cmd("bold")}><Bold /></button>
              <button type="button" className={tb} title="Subrayado (Ctrl+U)" onClick={() => cmd("underline")}><Underline /></button>
              <button type="button" className={tb} title="Tachado" onClick={() => cmd("strikeThrough")}><Strikethrough /></button>
              <button type="button" className={tb} title="Oculto (spoiler)" onClick={spoiler}><EyeOff /></button>
              <button type="button" className={cn(tb, pal && "bg-slate-100 text-brand-600 dark:bg-slate-800")} title="Color" onClick={() => setPal(!pal)}><Palette /></button>
              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" className={tb} title="Agregar fotos" onClick={() => file.current?.click()}><ImagePlus /></button>
              <button type="button" className={tb} title="Quitar formato" onClick={() => cmd("removeFormat")}><RemoveFormatting /></button>
              {pal && <div className="absolute left-1 top-full z-10 mt-1 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {FB_COLORS.map(c => <button key={c} type="button" title={c} onClick={() => { cmd("foreColor", c); setPal(false); }} className="size-6 rounded-full ring-1 ring-black/10 transition hover:scale-110" style={{ background: c }} />)}
                <button type="button" title="Sin color" onClick={() => { cmd("removeFormat"); setPal(false); }} className="grid size-6 place-items-center rounded-full ring-1 ring-slate-300 dark:ring-slate-600"><X className="size-3" /></button></div>}
            </div>
            <div ref={ed} contentEditable role="textbox" aria-multiline aria-label="Tu feedback" onInput={check}
              onDragOver={e => { if ([...e.dataTransfer.items].some(i => i.kind === "file")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
              onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); void addImgs(e.dataTransfer.files); } }}
              data-ph="Contanos qué pasó o qué te gustaría que se agregue… (podés pegar capturas con Ctrl+V)"
              className={cn("fb-rich relative min-h-[14rem] max-h-[60vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none", empty && "fb-empty", over && "bg-brand-50/60 dark:bg-brand-500/5")} />
          </div>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) void addImgs(e.target.files); e.target.value = ""; }} />
          <div className="flex items-center gap-3"><p className="mr-auto text-xs text-slate-500">Lo recibe el equipo de la terminal con tu nombre. Hasta 8 fotos.</p>
            <Button icon={<Send />} loading={busy} disabled={empty} onClick={send}>Enviar</Button></div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<CheckCircle2 />} title="Enviados" desc="Desde este dispositivo." />
        <CardBody className="space-y-2">
          {sent.length ? sent.map(s => <div key={s.id} className="rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800"><p className="text-slate-400">{fmtDate(s.t)}</p><p className="line-clamp-2">{s.x}</p></div>)
            : <p className="text-center text-xs text-slate-400">Todavía no enviaste nada.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
