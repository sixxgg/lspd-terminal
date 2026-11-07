import { useState } from "react";
import { Package, Plus, X, Copy, RotateCcw } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, useStoreVersion } from "@/lib/store";
import { EQ_KEY, VEH, eqDef, getEq, type EqItem } from "@/lib/patrol";

export function Equipamiento() {
  useStoreVersion();
  const { toast, confirm } = useFeedback();
  const EQ = getEq(), save = (e: Record<string, EqItem[]>) => LS.setJSON(EQ_KEY, e);
  const [nn, setNn] = useState<Record<string, string>>({}), [qq, setQq] = useState<Record<string, number>>({});
  const add = (k: string) => { const v = (nn[k] || "").trim(); if (!v) return; save({ ...EQ, [k]: [...EQ[k], { n: v, q: Math.max(1, qq[k] || 1) }] }); setNn({ ...nn, [k]: "" }); setQq({ ...qq, [k]: 1 }); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" size="sm" icon={<RotateCcw />} onClick={async () => { if (await confirm("¿Restaurar la lista por defecto?")) save(eqDef()); }}>Restaurar por defecto</Button></div>
      <div className="grid gap-5 md:grid-cols-2">
        {VEH.map(([k, n]) => (
          <Card key={k}>
            <CardHeader icon={<Package />} title={n} desc={`${EQ[k].length} ítems`} action={<Button variant="ghost" size="sm" icon={<Copy />} onClick={async () => { if (!(await confirm("¿Usar esta lista para los 4 vehículos?"))) return; save(Object.fromEntries(VEH.map(([x]) => [x, EQ[k].map(i => ({ ...i }))]))); toast("Lista copiada a todos los vehículos"); }}>Copiar a todos</Button>} />
            <CardBody>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {EQ[k].map((x, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="flex-1 text-sm">{x.n}</span>
                    <Input type="number" min={1} defaultValue={x.q} key={x.q} title="Cantidad requerida" className="h-8 w-16 text-center" onBlur={e => { const q = Math.max(1, +e.target.value || 1); if (q !== x.q) { save({ ...EQ, [k]: EQ[k].map((y, j) => (j === i ? { ...y, q } : y)) }); toast("Cantidad actualizada"); } }} />
                    <button aria-label={`Quitar ${x.n}`} onClick={() => save({ ...EQ, [k]: EQ[k].filter((_, j) => j !== i) })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><X className="size-4" /></button>
                  </div>))}
                {!EQ[k].length && <p className="p-3 text-center text-xs text-slate-400">Sin ítems</p>}
              </div>
              <div className="flex gap-2">
                <Input value={nn[k] || ""} onChange={e => setNn({ ...nn, [k]: e.target.value })} onKeyDown={e => e.key === "Enter" && add(k)} placeholder="Agregar ítem…" />
                <Input type="number" min={1} value={qq[k] || 1} onChange={e => setQq({ ...qq, [k]: +e.target.value })} onKeyDown={e => e.key === "Enter" && add(k)} className="w-20 text-center" aria-label="Cantidad" />
                <Button size="icon" aria-label="Agregar" onClick={() => add(k)}><Plus /></Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
