/* Panel de six › Robos › Ilícitos: quién es Gestión de ilícitos y los datos de la tablet (robos activos, misiones, recompensas y bandas).
   Los datos no están en el código (el repo es público): se cargan acá con el .json y quedan en lspdt.ilg.tablet, que el servidor
   solo le da a six y a los de lspdt.ilgAcc (nombre de la cuenta o usuario OOC). */
import { useRef, useState } from "react";
import { Download, ShieldAlert, Upload, UserPlus, X } from "lucide-react";
import { useFeedback } from "@/components/feedback";
import { useJSON } from "@/lib/store";
import { ILG_ACC, TAB_KEY, parseTab, useTablet } from "./tabletData";

export function Ilicitos() {
  const { toast } = useFeedback(), TD = useTablet(), [, setTD] = useJSON<unknown>(TAB_KEY, null), [acc, setAcc] = useJSON<string[]>(ILG_ACC, []), [n, setN] = useState(""), f = useRef<HTMLInputElement>(null);
  const L = Array.isArray(acc) ? acc : [];
  const add = () => { const x = n.trim(); if (!x) return; if (L.some(y => y.toLowerCase() === x.toLowerCase())) { toast("Ya está"); return; } setAcc([...L, x]); setN(""); toast(`${x} ahora es de Gestión de ilícitos`); };
  const load = async (file?: File) => { if (!file) return; const d = parseTab(await file.text()); if (!d) { toast("Ese archivo no es el de la tablet", "err"); return; }
    setTD({ ...d, at: Date.now() }); toast(`Cargado: ${d.robos.length} robos y ${d.mis.length} misiones`); };
  const save = () => { if (!TD) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(TD)], { type: "application/json" })); a.download = "tablet-ilicitos.json"; a.click(); URL.revokeObjectURL(a.href); };
  return (
    <div className="grid gap-4 font-sans lg:grid-cols-2">
      <section className="six-panel space-y-3 rounded-2xl p-5">
        <h3 className="six-h flex items-center gap-2 text-sm font-bold"><ShieldAlert className="size-4 text-six" />GESTIÓN DE ILÍCITOS</h3>
        <p className="text-xs text-slate-400">Solo ellos (y vos) ven recompensas, misiones y robos activos de la tablet, bandas y nivel. Supervisores y Oficiales ven el catálogo y el articulado sin eso. Poné el nombre de la cuenta de la terminal o su usuario OOC.</p>
        <div className="flex gap-2"><input value={n} onChange={e => setN(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Ej: Saskia, Fonti_55, Racsody…"
          className="min-w-0 flex-1 rounded-xl border border-six/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-six" />
          <button onClick={add} className="six-btn inline-flex items-center gap-1.5 rounded-xl border border-six/50 bg-six/10 px-3 text-xs font-bold text-six"><UserPlus className="size-4" />SUMAR</button></div>
        <div className="flex flex-wrap gap-1.5"><span className="rounded-lg border border-six/40 bg-six/10 px-2 py-1 text-xs font-semibold text-six">six (siempre)</span>
          {L.map(x => <span key={x} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200">{x}
            <button aria-label={`Sacar a ${x}`} onClick={() => setAcc(L.filter(y => y !== x))} className="text-slate-500 hover:text-red-400"><X className="size-3.5" /></button></span>)}</div>
      </section>
      <section className="six-panel space-y-3 rounded-2xl p-5">
        <h3 className="six-h text-sm font-bold">DATOS DE LA TABLET</h3>
        {TD ? <p className="text-sm text-slate-300"><b className="text-white">{TD.robos.length}</b> robos activos · <b className="text-white">{TD.mis.length}</b> misiones · cargado el {new Date(TD.at).toLocaleString("es-AR")}</p>
          : <p className="text-sm text-amber-300">Todavía no están cargados: subí el archivo <b>tablet-ilicitos.json</b>.</p>}
        <p className="text-xs text-slate-500">No van en el código de la terminal: el repositorio es público. Se guardan en la base y el servidor solo se los da a Gestión de ilícitos.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => f.current?.click()} className="six-btn inline-flex items-center gap-1.5 rounded-xl border border-six/50 bg-six/10 px-3 py-2 text-xs font-bold text-six"><Upload className="size-4" />{TD ? "REEMPLAZAR" : "CARGAR"} .JSON</button>
          {TD && <button onClick={save} className="six-btn inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-six"><Download className="size-4" />DESCARGAR COPIA</button>}
          <input ref={f} type="file" accept=".json,application/json" hidden onChange={e => { void load(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </section>
    </div>);
}
