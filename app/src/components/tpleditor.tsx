/* Editor de plantillas de Discord (Capitanía y administradores): texto con variables {nombre}, {rango}… */
import { useState } from "react";
import { Pencil, RotateCcw, Save } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { LS } from "@/lib/store";
import { TPL_DEF, tplOf, type TplKey } from "@/lib/templates";

export function TplEditor({ k, onClose }: { k: TplKey; onClose: () => void }) {
  const { toast } = useFeedback(), d = TPL_DEF[k], [t, setT] = useState(() => tplOf(k));
  return (
    <Modal open onClose={onClose} title={`Plantilla · ${d.l}`} desc="Se usa para todos. Las variables entre llaves se completan solas." icon={<Pencil />} size="lg"
      footer={<><Button variant="ghost" icon={<RotateCcw />} onClick={() => setT(d.t)} className="mr-auto">Volver a la original</Button>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button icon={<Save />} onClick={() => { if (t.trim() === d.t.trim()) LS.del("lspdt.tpl." + k); else LS.set("lspdt.tpl." + k, t); toast("Plantilla guardada"); onClose(); }}>Guardar</Button></>}>
      <div className="flex flex-wrap gap-1.5">{d.vars.map(v => <button key={v} type="button" onClick={() => setT(x => x + `{${v}}`)} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-300">{`{${v}}`}</button>)}</div>
      <Textarea rows={14} className="font-mono text-xs" value={t} onChange={e => setT(e.target.value)} />
    </Modal>
  );
}
