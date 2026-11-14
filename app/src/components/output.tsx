import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Copy, Check, MessageSquareText, FileText, Eye, RotateCcw, ChevronDown } from "lucide-react";
import { Button, Card, Segmented } from "./ui";
import { discordHtml, discordPlain, type DcCtx } from "@/lib/discord";
import { useFeedback } from "./feedback";
import { uiText } from "@/lib/templates";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";
import { RevButton, RevPanel, revOf } from "./revisar";

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; }
}
/* copia un texto y avisa con el mensaje que se elija */
export function useCopyMsg() {
  const { toast } = useFeedback();
  return (t: string, msg = "Copiado") => { void copyText(t).then(ok => toast(ok ? msg : "No se pudo copiar", ok ? undefined : "err")); };
}
export function useCopy() {
  const { toast } = useFeedback();
  return async (t: string, errors?: string[]) => {
    if (errors?.length) { toast("Falta completar: " + errors.join(", "), "err"); return false; }
    if (await copyText(t)) { toast("Copiado"); return true; }
    toast("No se pudo copiar", "err"); return false;
  };
}

/* «Copiar» con dos formatos: Discord (markdown) o web (texto limpio, sin markdown) */
export function CopyMenu({ text, web, size = "sm", variant = "outline", label = "Copiar", up }: { text: string; web?: string; size?: "sm" | "md"; variant?: "outline" | "primary" | "ghost"; label?: string; up?: boolean }) {
  const copy = useCopy(), [o, setO] = useState(false), ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!o) return; const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setO(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, [o]);
  const opt = (I: typeof Copy, t: string, d: string, v: string) => (
    <button type="button" onClick={() => { setO(false); void copy(v); }} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
      <I className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-300" /><span><b className="block text-[13px]">{t}</b><span className="block text-[11.5px] leading-snug text-slate-500">{d}</span></span></button>);
  return (
    <div ref={ref} className="relative inline-flex">
      <Button size={size} variant={variant} icon={<Copy />} onClick={() => setO(!o)} aria-expanded={o}>{label}<ChevronDown className={cn("-mr-1 size-3.5 opacity-70 transition", o && "rotate-180")} /></Button>
      {o && <div className={cn("absolute right-0 z-40 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-700 dark:bg-[rgb(var(--card))]", up ? "bottom-full mb-1.5" : "top-full mt-1.5")}>
        {opt(MessageSquareText, "Formato Discord", "Con negritas, títulos y menciones para pegar en Discord.", text)}
        {opt(FileText, "Formato web", "Texto limpio, sin markdown, para foros, documentos o la web.", web ?? discordPlain(text))}
      </div>}
    </div>);
}

/* Salida para Discord: formato Discord (editable antes de copiar), vista previa y formato web (sin markdown, con los íconos) */
export function DiscordOutput({ title, text, footer, errors, need, pen, ctx, tag = "Discord", sticky = true, extra, web = true }: {
  title: string; text: string; footer?: ReactNode; errors?: string[]; ctx?: DcCtx; tag?: string; sticky?: boolean; extra?: ReactNode; web?: boolean;
  /* «Revisar»: need = lo obligatorio que falta (si no se pasa, se usan los errores); pen = avisos de pendiente */
  need?: string[]; pen?: string[];
}) {
  const [mode, setMode] = useState<"dc" | "pv" | "web">("dc");
  const [val, setVal] = useState(text), [done, setDone] = useState(false);
  useEffect(() => setVal(text), [text]);
  const copy = useCopy();
  const shown = mode === "web" ? discordPlain(val) : val;
  const edited = val !== text;
  const [ro, setRo] = useState(false);
  const rev = useMemo(() => revOf(val, need ?? errors ?? [], pen), [val, need, errors, pen]);
  return (
    <Card className={cn("flex flex-col overflow-hidden", sticky && "lg:sticky lg:top-32")}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="grid size-8 place-items-center rounded-lg bg-[#5865F2]/10 text-[#5865F2] dark:bg-[#5865F2]/20 dark:text-[#a5b0ff]"><MessageSquareText className="size-4" /></div>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tag}</p><h3 className="truncate text-sm font-semibold">{title}</h3></div>
        <RevButton r={rev} open={ro} onClick={() => setRo(!ro)} />
      </div>
      {ro && <RevPanel r={rev} onClose={() => setRo(false)} className="mx-4 mt-3" />}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <Segmented size="sm" value={mode} onChange={setMode} options={[
          { value: "dc", label: "Formato Discord", icon: <MessageSquareText /> }, { value: "pv", label: "Vista Discord", icon: <Eye /> },
          ...(web ? [{ value: "web" as const, label: "Formato web", icon: <FileText /> }] : [])]} />
        {extra}
      </div>
      {errors && errors.length > 0 && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">Falta completar: <b>{errors.join(", ")}</b></div>
      )}
      <div className="p-4">
        {mode === "pv" ? (
          <div className="scrollbar-thin max-h-[66vh] overflow-auto rounded-xl bg-[#313338] p-4 text-[15px] leading-[1.375] text-[#dbdee1]"
            dangerouslySetInnerHTML={{ __html: discordHtml(val, ctx, uiText("bot"), LS.get("lspdt.img.dcav") || LS.get("lspdt.logo") || "/next/logo.svg") }} />
        ) : mode === "web" ? (
          <pre className="scrollbar-thin max-h-[66vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 font-sans text-[13px] leading-relaxed text-slate-200 ring-1 ring-inset ring-white/5">{shown}</pre>
        ) : (
          <textarea value={val} onChange={e => setVal(e.target.value)} spellCheck={false}
            className="scrollbar-thin block h-[52vh] max-h-[66vh] min-h-[180px] w-full resize-y rounded-xl bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-slate-200 outline-none ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-brand-500/60" />
        )}
        <p className="mt-2 text-[11px] text-slate-400">{val.length} caracteres{edited ? " · editado a mano" : ""} · Copiar copia el formato elegido</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        {edited && <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => setVal(text)} title="Volver al texto generado">Restaurar</Button>}
        {footer}
        <Button onClick={async () => { if (await copy(shown, errors)) { setDone(true); setTimeout(() => setDone(false), 1500); } }} icon={done ? <Check /> : <Copy />}>{done ? "Copiado" : "Copiar"}</Button>
      </div>
    </Card>
  );
}

/* Una línea para copiar (comandos /me, /do, /rlspd…) */
export function CopyLine({ label, text, errors, tag }: { label: string; text: string; errors?: string[]; tag?: string }) {
  const [val, setVal] = useState(text); useEffect(() => setVal(text), [text]);
  const copy = useCopy(), [ro, setRo] = useState(false), rev = useMemo(() => revOf(val, errors), [val, errors]);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        {tag && <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-100 dark:bg-slate-800">{tag}</span>}
        <span className="flex-1 text-sm font-semibold">{label}</span>
        <RevButton r={rev} open={ro} onClick={() => setRo(!ro)} />
      </div>
      {ro && <RevPanel r={rev} onClose={() => setRo(false)} className="m-3" />}
      <textarea value={val} onChange={e => setVal(e.target.value)} rows={3} spellCheck={false}
        className="block w-full resize-y bg-slate-950 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-slate-200 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/60" />
      <div className="flex justify-end border-t border-slate-100 px-4 py-2.5 dark:border-slate-800"><Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(val, errors)}>Copiar</Button></div>
    </Card>
  );
}
