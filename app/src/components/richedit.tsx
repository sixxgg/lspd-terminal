/* editor con formato (contentEditable): negrita, cursiva, subrayado, tachado, oculto, colores y, si se pide, fotos.
   Lo que sale siempre pasa por la lista blanca de lib/richtext. */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Bold, EyeOff, ImagePlus, Italic, List, Palette, RemoveFormatting, Strikethrough, Underline, X } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { readImg } from "@/lib/patrol";
import { FB_COLORS, safeHtml } from "@/lib/richtext";
import { cn } from "@/lib/cn";

export type RichRef = { el: HTMLDivElement | null; clear: () => void; empty: () => boolean };
export const RichEditor = forwardRef<RichRef, { init?: string; onChange?: (html: string) => void; placeholder: string; images?: number; className?: string; minH?: string }>(
  function RichEditor({ init = "", onChange, placeholder, images = 0, className, minH = "min-h-[8rem]" }, ref) {
  const { toast } = useFeedback(), ed = useRef<HTMLDivElement>(null), file = useRef<HTMLInputElement>(null);
  const [pal, setPal] = useState(false), [empty, setEmpty] = useState(!init), [over, setOver] = useState(false);
  const isEmpty = () => { const e = ed.current; return !e || (!e.textContent?.trim() && !e.querySelector("img")); };
  const check = () => { setEmpty(isEmpty()); onChange?.(ed.current ? safeHtml(ed.current.innerHTML) : ""); };
  useImperativeHandle(ref, () => ({ el: ed.current, clear: () => { if (ed.current) ed.current.innerHTML = ""; check(); }, empty: isEmpty }));
  useEffect(() => { if (ed.current) { ed.current.innerHTML = /<[a-z]/i.test(init) ? safeHtml(init) : init.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"); setEmpty(isEmpty()); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = (c: string, v?: string) => { ed.current?.focus(); document.execCommand("styleWithCSS", false, "true"); document.execCommand(c, false, v); check(); };
  const spoiler = () => {
    const s = window.getSelection(); if (!s || !s.rangeCount || s.isCollapsed || !ed.current?.contains(s.anchorNode)) { toast("Seleccioná el texto que querés ocultar", "err"); return; }
    const r = s.getRangeAt(0), sp = document.createElement("span"); sp.setAttribute("data-sp", ""); sp.appendChild(r.extractContents()); r.insertNode(sp); s.removeAllRanges(); check();
  };
  const addImgs = async (fs: FileList | File[]) => {
    const list = [...fs].filter(f => f.type.startsWith("image/")); if (!list.length || !images) return;
    const have = ed.current?.querySelectorAll("img").length || 0; if (have + list.length > images) { toast(`Hasta ${images} fotos`, "err"); return; }
    ed.current?.focus();
    for (const f of list) { const d = await readImg(f, 1600); document.execCommand("insertHTML", false, `<img src="${d}" alt=""><br>`); }
    check();
  };
  useEffect(() => { const e = ed.current; if (!e) return;
    const paste = (ev: ClipboardEvent) => { const fs = [...(ev.clipboardData?.items || [])].filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()!).filter(Boolean);
      if (fs.length && images) { ev.preventDefault(); void addImgs(fs); return; }
      const h = ev.clipboardData?.getData("text/html"); if (h) { ev.preventDefault(); document.execCommand("insertHTML", false, safeHtml(h)); check(); } };
    e.addEventListener("paste", paste); return () => e.removeEventListener("paste", paste); });
  const tb = "grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 [&>svg]:size-4";
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700", className)}>
      <div className="relative flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900/60" onMouseDown={e => { if ((e.target as HTMLElement).closest("button")) e.preventDefault(); }}>
        <button type="button" className={tb} title="Negrita (Ctrl+B)" onClick={() => cmd("bold")}><Bold /></button>
        <button type="button" className={tb} title="Cursiva (Ctrl+I)" onClick={() => cmd("italic")}><Italic /></button>
        <button type="button" className={tb} title="Subrayado (Ctrl+U)" onClick={() => cmd("underline")}><Underline /></button>
        <button type="button" className={tb} title="Tachado" onClick={() => cmd("strikeThrough")}><Strikethrough /></button>
        <button type="button" className={tb} title="Oculto (spoiler)" onClick={spoiler}><EyeOff /></button>
        <button type="button" className={tb} title="Lista" onClick={() => cmd("insertUnorderedList")}><List /></button>
        <button type="button" className={cn(tb, pal && "bg-slate-100 text-brand-600 dark:bg-slate-800")} title="Color" onClick={() => setPal(!pal)}><Palette /></button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        {images > 0 && <button type="button" className={tb} title="Agregar fotos" onClick={() => file.current?.click()}><ImagePlus /></button>}
        <button type="button" className={tb} title="Quitar formato" onClick={() => cmd("removeFormat")}><RemoveFormatting /></button>
        {pal && <div className="absolute left-1 top-full z-10 mt-1 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {FB_COLORS.map(c => <button key={c} type="button" title={c} onClick={() => { cmd("foreColor", c); setPal(false); }} className="size-6 rounded-full ring-1 ring-black/10 transition hover:scale-110" style={{ background: c }} />)}
          <button type="button" title="Sin color" onClick={() => { cmd("removeFormat"); setPal(false); }} className="grid size-6 place-items-center rounded-full ring-1 ring-slate-300 dark:ring-slate-600"><X className="size-3" /></button></div>}
      </div>
      <div ref={ed} contentEditable role="textbox" aria-multiline aria-label={placeholder} onInput={check} data-ph={placeholder}
        onDragOver={e => { if (images && [...e.dataTransfer.items].some(i => i.kind === "file")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
        onDrop={e => { if (images && e.dataTransfer.files.length) { e.preventDefault(); setOver(false); void addImgs(e.dataTransfer.files); } }}
        className={cn("fb-rich relative max-h-[60vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none", minH, empty && "fb-empty", over && "bg-brand-50/60 dark:bg-brand-500/5")} />
      {images > 0 && <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) void addImgs(e.target.files); e.target.value = ""; }} />}
    </div>);
});
