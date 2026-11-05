import { useEffect, useState, type ReactNode } from "react";
import { Copy, Check, MessageSquareText, FileText, Eye, RotateCcw } from "lucide-react";
import { Button, Card, Segmented } from "./ui";
import { discordHtml, discordPlain, type DcCtx } from "@/lib/discord";
import { useFeedback } from "./feedback";
import { uiText } from "@/lib/templates";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; }
}
export function useCopy() {
  const { toast } = useFeedback();
  return async (t: string, errors?: string[]) => {
    if (errors?.length) { toast("Falta completar: " + errors.join(", "), "err"); return false; }
    if (await copyText(t)) { toast("Copiado"); return true; }
    toast("No se pudo copiar", "err"); return false;
  };
}

/* Salida para Discord: formato Discord (editable antes de copiar), vista previa y formato web (sin markdown, con los íconos) */
export function DiscordOutput({ title, text, footer, errors, ctx, tag = "Discord", sticky = true, extra, web = true }: {
  title: string; text: string; footer?: ReactNode; errors?: string[]; ctx?: DcCtx; tag?: string; sticky?: boolean; extra?: ReactNode; web?: boolean;
}) {
  const [mode, setMode] = useState<"dc" | "pv" | "web">("dc");
  const [val, setVal] = useState(text), [done, setDone] = useState(false);
  useEffect(() => setVal(text), [text]);
  const copy = useCopy();
  const shown = mode === "web" ? discordPlain(val) : val;
  const edited = val !== text;
  return (
    <Card className={cn("flex flex-col overflow-hidden", sticky && "lg:sticky lg:top-20")}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="grid size-8 place-items-center rounded-lg bg-[#5865F2]/10 text-[#5865F2] dark:bg-[#5865F2]/20 dark:text-[#a5b0ff]"><MessageSquareText className="size-4" /></div>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tag}</p><h3 className="truncate text-sm font-semibold">{title}</h3></div>
        {edited && <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => setVal(text)} title="Volver al texto generado">Restaurar</Button>}
        <Button size="sm" onClick={async () => { if (await copy(shown, errors)) { setDone(true); setTimeout(() => setDone(false), 1500); } }} icon={done ? <Check /> : <Copy />}>{done ? "Copiado" : "Copiar"}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <Segmented size="sm" value={mode} onChange={setMode} options={[
          { value: "dc", label: "Formato Discord", icon: <MessageSquareText /> }, { value: "pv", label: "Vista Discord", icon: <Eye /> },
          ...(web ? [{ value: "web" as const, label: "Formato web", icon: <FileText /> }] : [])]} />
        {extra}
      </div>
      {errors && errors.length > 0 && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">Falta completar: <b>{errors.join(", ")}</b></div>
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
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">{footer}</div>}
    </Card>
  );
}

/* Una línea para copiar (comandos /me, /do, /rlspd…) */
export function CopyLine({ label, text, errors, tag }: { label: string; text: string; errors?: string[]; tag?: string }) {
  const [val, setVal] = useState(text); useEffect(() => setVal(text), [text]);
  const copy = useCopy();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        {tag && <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-100 dark:bg-slate-800">{tag}</span>}
        <span className="flex-1 text-sm font-semibold">{label}</span>
        <Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(val, errors)}>Copiar</Button>
      </div>
      <textarea value={val} onChange={e => setVal(e.target.value)} rows={3} spellCheck={false}
        className="block w-full resize-y bg-slate-950 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-slate-200 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/60" />
    </Card>
  );
}
