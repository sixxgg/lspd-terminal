import { useState } from "react";
import { Package, Plus, X, RotateCcw } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, useStoreVersion } from "@/lib/store";
import { EQ_KEY, eqAll, eqDef, type EqItem } from "@/lib/patrol";

/* Equipamiento del maletero: una sola lista para todos los patrullas ONX (clave "*") */
export function Equipamiento() {
  useStoreVersion();
  const { toast, confirm } = useFeedback();
  const L = eqAll(), save = (l: EqItem[]) => LS.setJSON(EQ_KEY, { "*": l });
  const [nn, setNn] = useState(""), [qq, setQq] = useState(1);
  const add = () => { const v = nn.trim(); if (!v) return; save([...L, { n: v, q: Math.max(1, qq || 1) }]); setNn(""); setQq(1); };
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader icon={<Package />} title="Todos los patrullas" desc={`${L.length} ítems · se revisa igual en cualquier patrulla ONX`}
        action={<Button variant="outline" size="sm" icon={<RotateCcw />} onClick={async () => { if (await confirm("¿Restaurar la lista por defecto?")) LS.setJSON(EQ_KEY, eqDef()); }}>Restaurar por defecto</Button>} />
      <CardBody>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {L.map((x, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5">
              <span className="flex-1 text-sm">{x.n}</span>
              <Input type="number" min={1} defaultValue={x.q} key={x.q} title="Cantidad requerida" className="h-8 w-16 text-center" onBlur={e => { const q = Math.max(1, +e.target.value || 1); if (q !== x.q) { save(L.map((y, j) => (j === i ? { ...y, q } : y))); toast("Cantidad actualizada"); } }} />
              <button aria-label={`Quitar ${x.n}`} onClick={() => save(L.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><X className="size-4" /></button>
            </div>))}
          {!L.length && <p className="p-3 text-center text-xs text-slate-400">Sin ítems</p>}
        </div>
        <div className="flex gap-2">
          <Input value={nn} onChange={e => setNn(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Agregar ítem…" />
          <Input type="number" min={1} value={qq} onChange={e => setQq(+e.target.value)} onKeyDown={e => e.key === "Enter" && add()} className="w-20 text-center" aria-label="Cantidad" />
          <Button size="icon" aria-label="Agregar" onClick={add}><Plus /></Button>
        </div>
      </CardBody>
    </Card>
  );
}
