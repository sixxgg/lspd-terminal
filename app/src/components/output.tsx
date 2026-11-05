import { useState, type ReactNode } from "react";
import { Copy, Check, MessageSquareText, FileText, Eye } from "lucide-react";
import { Button, Card, Segmented } from "./ui";
import { discordHtml, discordPlain } from "@/lib/discord";
import { useFeedback } from "./feedback";

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; }
}

/* Salida para Discord: formato Discord, vista previa y formato web (sin markdown, con los íconos) */
export function DiscordOutput({ title, text, footer, errors }: { title: string; text: string; footer?: ReactNode; errors?: string[] }) {
  const [mode, setMode] = useState<"dc" | "pv" | "web">("dc");
  const [done, setDone] = useState(false);
  const { toast } = useFeedback();
  const shown = mode === "web" ? discordPlain(text) : text;
  const copy = async () => {
    if (errors?.length) { toast("Falta completar: " + errors.join(", "), "err"); return; }
    if (await copyText(shown)) { setDone(true); toast("Copiado"); setTimeout(() => setDone(false), 1600); }
  };
  return (
    <Card className="flex flex-col overflow-hidden lg:sticky lg:top-4">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="grid size-8 place-items-center rounded-lg bg-[#5865F2]/10 text-[#5865F2] dark:bg-[#5865F2]/20 dark:text-[#a5b0ff]"><MessageSquareText className="size-4" /></div>
        <h3 className="flex-1 truncate text-sm font-semibold">{title}</h3>
        <Button size="sm" onClick={copy} icon={done ? <Check /> : <Copy />}>{done ? "Copiado" : "Copiar"}</Button>
      </div>
      <div className="px-4 pt-3">
        <Segmented size="sm" value={mode} onChange={setMode} options={[
          { value: "dc", label: "Formato Discord", icon: <MessageSquareText /> },
          { value: "pv", label: "Vista Discord", icon: <Eye /> },
          { value: "web", label: "Formato web", icon: <FileText /> },
        ]} />
      </div>
      {errors && errors.length > 0 && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Falta completar: <b>{errors.join(", ")}</b>
        </div>
      )}
      <div className="p-4">
        {mode === "pv" ? (
          <div className="scrollbar-thin max-h-[68vh] overflow-auto rounded-xl bg-[#313338] p-4 text-[14.5px] leading-[1.4] text-[#dbdee1]"
            dangerouslySetInnerHTML={{ __html: discordHtml(text) }} />
        ) : (
          <pre className="scrollbar-thin max-h-[68vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-slate-200 ring-1 ring-inset ring-white/5">{shown}</pre>
        )}
        <p className="mt-2 text-[11px] text-slate-400">{text.length} caracteres · Copiar copia el formato elegido{mode === "pv" ? " (Discord)" : ""}</p>
      </div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">{footer}</div>}
    </Card>
  );
}
