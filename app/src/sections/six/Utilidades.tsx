/* Panel de six y de Anita › Utilidades: PEDs y vehículos de GTA V, con imagen, modelo y hash (todo alojado en la terminal) */
import { useState } from "react";
import { CarFront, PersonStanding } from "lucide-react";
import { LS } from "@/lib/store";
import { cn } from "@/lib/cn";
import { PedsTab } from "./Peds";
import { VehTab } from "./Vehiculos";

export function UtilTab() {
  const [t, setT] = useState(() => (LS.get("lspdt.next.util") === "veh" ? "veh" : "peds"));
  const go = (v: string) => { setT(v); LS.set("lspdt.next.util", v); };
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">{([["peds", "PEDs", PersonStanding], ["veh", "Vehículos", CarFront]] as const).map(([k, l, I]) => (
        <button key={k} onClick={() => go(k)} className={cn("six-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold tracking-[0.14em] transition",
          t === k ? "border-six/60 bg-six/15 text-six" : "border-white/[.08] bg-black/30 text-slate-400 hover:text-white")}><I className="size-4" />{l.toUpperCase()}</button>))}</div>
      {t === "veh" ? <VehTab /> : <PedsTab />}
    </div>);
}
