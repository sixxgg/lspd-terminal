/* Borradores automáticos: todo lo que se escribe en una pantalla (campos de texto, áreas y listas) se guarda en este navegador
   mientras escribís. Si se recarga, se cierra la pestaña o se cambia de sección sin querer, al volver se vuelve a completar solo.
   - Se guarda por agente y por sección; dura 3 días.
   - Al guardar/enviar algo (aviso verde «…guardado», «…enviada», etc.) el borrador de esa sección se descarta.
   - No toca buscadores, contraseñas ni los textos generados para copiar (data-nodraft). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { History, X } from "lucide-react";

const TTL = 3 * 864e5, PFX = "lspdt.next.draft.";
type D = { t: number; v: Record<string, string> };
const read = (k: string): D | null => { try { const d = JSON.parse(localStorage.getItem(PFX + k) || "null") as D | null; return d && Date.now() - d.t < TTL ? d : null; } catch { return null; } };
const write = (k: string, v: Record<string, string>) => { try { if (Object.keys(v).length) localStorage.setItem(PFX + k, JSON.stringify({ t: Date.now(), v })); else localStorage.removeItem(PFX + k); } catch { /* sin almacenamiento */ } };
/* limpieza de borradores vencidos */
try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k?.startsWith(PFX) && !read(k.slice(PFX.length))) localStorage.removeItem(k); } } catch { /* */ }

type F = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const SKIP_T = /^(hidden|password|file|checkbox|radio|search|range|color|submit|button)$/;
function fields(root: HTMLElement): [string, F][] {
  const out: [string, F][] = [], seen: Record<string, number> = {};
  root.querySelectorAll<F>("input, textarea, select").forEach(el => {
    if (el.closest("[data-nodraft]") || el.disabled || (el as HTMLInputElement).readOnly) return;
    if (el instanceof HTMLInputElement && SKIP_T.test(el.type)) return;
    const ph = (el as HTMLInputElement).placeholder || "";
    if (/^buscar|^nombre o placa|^filtrar/i.test(ph)) return;
    const lab = el.getAttribute("aria-label") || el.name || ph || el.closest("label")?.textContent?.trim().slice(0, 40) || el.parentElement?.previousElementSibling?.textContent?.trim().slice(0, 40) || "";
    const sig = `${el.tagName}|${lab}`, n = (seen[sig] = (seen[sig] ?? -1) + 1);
    out.push([`${sig}#${n}`, el]);
  });
  return out;
}
const setVal = (el: F, v: string) => {
  const P = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(P.prototype, "value")?.set?.call(el, v);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
};
/* avisar que algo se guardó (lo llama el toast verde) */
export const draftSaved = (msg: string) => { if (/guardad|registrad|enviad|publicad|cread|abiert|actualizad|cargad[oa] en/i.test(msg) && !/copiad|borrador/i.test(msg)) dispatchEvent(new Event("lspdt:saved")); };

/* secciones donde se redacta (no tablas que guardan solas, como rosters o la pizarra) */
const ON = /\|(inf\/|fb\/|rad\/|ini\/ts|sup\/(?!rob|hue)|cap\/(exa|ent))/;
export function DraftZone({ id, children }: { id: string; children: ReactNode }) {
  if (!ON.test(id)) return <>{children}</>;
  return <Zone id={id}>{children}</Zone>;
}
function Zone({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), [rec, setRec] = useState(0);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    let data = read(id)?.v || {}, dirty = false, t: number | undefined, mo: number | undefined;
    const filled = new WeakSet<Element>(), touched = new WeakSet<Element>(), mine: F[] = [];
    const save = () => { const cur = fields(root); const v = { ...data };
      cur.forEach(([k, el]) => { const x = el.value; if (x && x.trim()) v[k] = x; else delete v[k]; });
      data = v; write(id, v); };
    const onIn = (e: Event) => { const el = e.target as Element; if (!root.contains(el)) return; touched.add(el); dirty = true; clearTimeout(t); t = window.setTimeout(save, 400); };
    const restore = () => { if (!Object.keys(data).length) return; let n = 0;
      const F = fields(root), cnt: Record<string, number> = {}; F.forEach(([k]) => { const g = k.replace(/#\d+$/, ""); cnt[g] = (cnt[g] || 0) + 1; });
      F.forEach(([k, el]) => { const v = data[k]; if (v == null || filled.has(el) || touched.has(el) || el.value === v) return; filled.add(el);
        /* solo en campos vacíos (nunca pisa datos ya cargados) y no en listas largas de filas iguales */
        if (el.value !== "" || cnt[k.replace(/#\d+$/, "")] > 6) return;
        setVal(el, v); mine.push(el); n++; });
      if (n) setRec(r => r + n); };
    const onSaved = () => { clearTimeout(t); data = {}; dirty = false; write(id, {}); setRec(0); };
    root.addEventListener("input", onIn, true); root.addEventListener("change", onIn, true);
    addEventListener("lspdt:saved", onSaved);
    const obs = new MutationObserver(() => { clearTimeout(mo); mo = window.setTimeout(restore, 120); });
    obs.observe(root, { childList: true, subtree: true });
    const first = window.setTimeout(restore, 250);
    const flush = () => { if (dirty) save(); };
    addEventListener("beforeunload", flush);
    (root as HTMLDivElement & { __drop?: () => void }).__drop = () => { onSaved(); mine.forEach(el => el.isConnected && setVal(el, "")); };
    return () => { flush(); clearTimeout(t); clearTimeout(mo); clearTimeout(first); obs.disconnect(); root.removeEventListener("input", onIn, true); root.removeEventListener("change", onIn, true); removeEventListener("lspdt:saved", onSaved); removeEventListener("beforeunload", flush); };
  }, [id]);
  return (
    <div ref={ref}>
      {rec > 0 && <div data-nodraft className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-brand-500/40 bg-white/95 py-1.5 pl-3 pr-1.5 text-[12.5px] shadow-xl backdrop-blur dark:bg-slate-900/95">
        <History className="size-4 text-brand-500" /><span>Recuperé lo que estabas escribiendo</span>
        <button type="button" onClick={() => { (ref.current as HTMLDivElement & { __drop?: () => void })?.__drop?.(); }} className="rounded-full px-2 py-0.5 font-semibold text-slate-500 hover:bg-red-500/10 hover:text-red-500">Descartar</button>
        <button type="button" aria-label="Cerrar" onClick={() => setRec(0)} className="rounded-full p-1 text-slate-400 hover:text-slate-700"><X className="size-3.5" /></button>
      </div>}
      {children}
    </div>);
}
