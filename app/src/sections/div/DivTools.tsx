/* herramientas comunes a todas las divisiones:
   · Uniformidad: atuendos con nombre y código para copiar (lspdt.unif.<div>)
   · Administración (solo coordinación / subcoordinación): qué pestañas ven los miembros (lspdt.divacc.<div>) */
import { useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff, Pencil, Plus, Shirt, ShieldAlert, Trash2, X } from "lucide-react";
import { Button, Card, Empty, Input, Textarea } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { uid } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Unif = { id: string; n: string; code: string; nota?: string; by?: string; t?: number };
type Acc = { hide?: string[] };
export type DivTab = { value: string; label: ReactNode; icon?: ReactNode; txt?: string };

const accKey = (id: string) => `lspdt.divacc.${id}`;
/* pestañas que ve cada uno: la coordinación ve todo (las ocultas marcadas con un ojo tachado) */
export function divTabs(id: string, tabs: DivTab[], coord: boolean): DivTab[] {
  const hide = new Set(LS.json<Acc>(accKey(id), {}).hide || []);
  const L = coord ? tabs.map(t => hide.has(t.value) ? { ...t, label: <span className="inline-flex items-center gap-1">{t.label}<EyeOff className="!size-3 opacity-60" /></span> } : t) : tabs.filter(t => !hide.has(t.value));
  return coord ? [...L, { value: "adm", label: <span className="text-red-600 dark:text-red-400">Administración</span>, icon: <ShieldAlert className="text-red-600 dark:text-red-400" /> }] : L;
}
export const uniTab = (): DivTab => ({ value: "uni", label: "Uniformidad", icon: <Shirt />, txt: "Uniformidad" });

export function Uniformidad({ id, ab, canEdit }: { id: string; ab: string; canEdit: boolean }) {
  const me = useMe(), { toast, confirm } = useFeedback(), [L, setL] = useJSON<Unif[]>(`lspdt.unif.${id}`, []);
  const [ed, setEd] = useState<Unif | null>(null);
  const copy = (s: string, what = "Código copiado") => { void navigator.clipboard?.writeText(s).then(() => toast(what), () => toast("No se pudo copiar")); };
  const save = () => { if (!ed) return; const x = { ...ed, n: ed.n.trim(), code: ed.code.trim(), nota: ed.nota?.trim(), by: me.n, t: Date.now() };
    if (!x.n || !x.code) { toast("Completá nombre y código"); return; }
    setL(L.some(y => y.id === x.id) ? L.map(y => y.id === x.id ? x : y) : [...L, x]); setEd(null); toast("Atuendo guardado"); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-slate-500"><b className="text-slate-900 dark:text-white">{L.length}</b> atuendo{L.length === 1 ? "" : "s"} de la {ab}</p>
        {L.length > 1 && <Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(L.map(u => `${u.n}: ${u.code}`).join("\n"), "Todos los códigos copiados")}>Copiar todos</Button>}
        {canEdit && !ed && <Button size="sm" icon={<Plus />} onClick={() => setEd({ id: uid(), n: "", code: "" })}>Nuevo atuendo</Button>}
      </div>
      {ed && <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_1.4fr]">
        <Input autoFocus value={ed.n} onChange={e => setEd({ ...ed, n: e.target.value })} placeholder="Nombre (ej.: Uniforme de patrulla)" maxLength={60} />
        <Input value={ed.code} onChange={e => setEd({ ...ed, code: e.target.value })} placeholder="Código del atuendo" className="font-mono" maxLength={400} />
        <Textarea rows={2} className="sm:col-span-2" value={ed.nota || ""} onChange={e => setEd({ ...ed, nota: e.target.value })} placeholder="Nota (opcional): cuándo se usa, rango, accesorios…" />
        <div className="flex justify-end gap-2 sm:col-span-2"><Button size="sm" variant="ghost" icon={<X />} onClick={() => setEd(null)}>Cancelar</Button><Button size="sm" icon={<Check />} onClick={save}>Guardar</Button></div>
      </Card>}
      {!L.length && !ed ? <Empty icon={<Shirt />} title="Sin atuendos cargados" desc={canEdit ? "Creá el primero con su nombre y el código para copiar." : "La coordinación todavía no cargó la uniformidad."} />
        : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{L.map(u => (
          <Card key={u.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start gap-2"><Shirt className="mt-0.5 size-4 shrink-0 text-brand-500" /><b className="flex-1 leading-tight">{u.n}</b>
              {canEdit && <><button aria-label="Editar" onClick={() => setEd(u)} className="text-slate-400 hover:text-brand-500"><Pencil className="size-3.5" /></button>
                <button aria-label="Borrar" onClick={async () => { if (await confirm(`¿Borrar «${u.n}»?`, { danger: true })) setL(L.filter(x => x.id !== u.id)); }} className="text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button></>}</div>
            <button onClick={() => copy(u.code)} title="Copiar código" className="group flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-left font-mono text-sm transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-900/60">
              <span className="min-w-0 flex-1 break-all">{u.code}</span><Copy className="size-4 shrink-0 text-slate-400 group-hover:text-brand-500" /></button>
            {u.nota && <p className="text-xs text-slate-500">{u.nota}</p>}
          </Card>))}</div>}
    </div>);
}

export function DivAdmin({ id, ab, tabs }: { id: string; ab: string; tabs: DivTab[] }) {
  const { toast } = useFeedback(), [A, setA] = useJSON<Acc>(accKey(id), {}), hide = new Set(A.hide || []);
  const flip = (v: string, txt: string) => { const h = new Set(hide); if (h.has(v)) h.delete(v); else h.add(v); setA({ ...A, hide: [...h] }); toast(h.has(v) ? `«${txt}» ahora es solo para la coordinación` : `«${txt}» visible para toda la ${ab}`); };
  return (
    <Card className="overflow-hidden border-red-500/30 p-0">
      <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/[.06] px-5 py-3"><ShieldAlert className="size-4 text-red-500" /><b className="text-red-600 dark:text-red-400">Administración de la {ab}</b>
        <span className="ml-auto text-xs text-slate-500">Solo coordinación y subcoordinación</span></div>
      <div className="p-5">
        <p className="mb-3 text-sm text-slate-500">Elegí qué pestañas ven los miembros. Las que quedan «Solo coordinación» no le aparecen al resto de la división.</p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{tabs.map(t => { const txt = t.txt || String(t.label), off = hide.has(t.value); return (
          <div key={t.value} className="flex items-center gap-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-slate-400">{t.icon}{txt}</span>
            <button onClick={() => flip(t.value, txt)} className={cn("ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
              off ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>
              {off ? <><EyeOff className="size-3.5" />Solo coordinación</> : <><Eye className="size-3.5" />Todos los miembros</>}</button>
          </div>); })}</div>
      </div>
    </Card>);
}
