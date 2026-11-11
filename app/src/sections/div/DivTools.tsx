/* herramientas comunes a todas las divisiones:
   · Uniformidad: atuendos con nombre y código para copiar (lspdt.unif.<div>)
   · Administración (solo coordinación / subcoordinación): qué pestañas ven los miembros (lspdt.divacc.<div>) y links temporales
   · Links temporales de solo lectura (api/share) y su vista pública (?ver=<token>) */
import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff, Link2, Pencil, Plus, Shirt, ShieldAlert, Trash2, X } from "lucide-react";
import { Button, Card, Empty, Field, Input, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { api } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { uid } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Unif = { id: string; n: string; g?: "h" | "m"; code: string; nota?: string; by?: string; t?: number };
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

/* género del atuendo: etiqueta con color e ícono */
const GEN = { h: { l: "Hombre", s: "♂", c: "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300" }, m: { l: "Mujer", s: "♀", c: "border-pink-400/40 bg-pink-500/10 text-pink-700 dark:text-pink-300" } } as const;
const GenTag = ({ g }: { g?: "h" | "m" }) => g ? <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold", GEN[g].c)}><span className="text-sm leading-none">{GEN[g].s}</span>{GEN[g].l}</span> : null;
function useCopy() { const { toast } = useFeedback(); return (s: string, what = "Código copiado") => { void navigator.clipboard?.writeText(s).then(() => toast(what), () => toast("No se pudo copiar")); }; }
function UnifCard({ u, copy, tools }: { u: Unif; copy: (s: string) => void; tools?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start gap-2"><Shirt className="mt-0.5 size-4 shrink-0 text-brand-500" /><b className="flex-1 leading-tight">{u.n}</b>{tools}</div>
      {u.g && <div><GenTag g={u.g} /></div>}
      <button onClick={() => copy(u.code)} title="Copiar código" className="group flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-left font-mono text-sm transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-900/60">
        <span className="min-w-0 flex-1 break-all">{u.code}</span><Copy className="size-4 shrink-0 text-slate-400 group-hover:text-brand-500" /></button>
      {u.nota && <p className="text-xs text-slate-500">{u.nota}</p>}
    </Card>);
}
const GenFilter = ({ v, set, L }: { v: "" | "h" | "m"; set: (v: "" | "h" | "m") => void; L: Unif[] }) => (
  <div className="flex gap-1">{([["", "Todos"], ["h", "Hombre"], ["m", "Mujer"]] as const).map(([k, l]) => (
    <button key={k} onClick={() => set(k)} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", v === k ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}>
      {k && GEN[k].s} {l} <span className="opacity-60">{k ? L.filter(u => u.g === k).length : L.length}</span></button>))}</div>);

export function Uniformidad({ id, ab, canEdit }: { id: string; ab: string; canEdit: boolean }) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy(), [L, setL] = useJSON<Unif[]>(`lspdt.unif.${id}`, []);
  const [ed, setEd] = useState<Unif | null>(null), [g, setG] = useState<"" | "h" | "m">(""), [sh, setSh] = useState(false);
  const save = () => { if (!ed) return; const x = { ...ed, n: ed.n.trim(), code: ed.code.trim(), nota: ed.nota?.trim(), by: me.n, t: Date.now() };
    if (!x.n || !x.code) { toast("Completá nombre y código"); return; } if (!x.g) { toast("Elegí el género"); return; }
    setL(L.some(y => y.id === x.id) ? L.map(y => y.id === x.id ? x : y) : [...L, x]); setEd(null); toast("Atuendo guardado"); };
  const V = L.filter(u => !g || u.g === g);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-500"><b className="text-slate-900 dark:text-white">{L.length}</b> atuendo{L.length === 1 ? "" : "s"} de la {ab}</p>
        {L.length > 0 && <GenFilter v={g} set={setG} L={L} />}
        <span className="mr-auto" />
        {V.length > 1 && <Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(V.map(u => `${u.n}${u.g ? ` (${GEN[u.g].l})` : ""}: ${u.code}`).join("\n"), "Todos los códigos copiados")}>Copiar todos</Button>}
        {canEdit && <Button size="sm" variant="outline" icon={<Link2 />} onClick={() => setSh(true)}>Link temporal</Button>}
        {canEdit && !ed && <Button size="sm" icon={<Plus />} onClick={() => setEd({ id: uid(), n: "", code: "" })}>Nuevo atuendo</Button>}
      </div>
      {ed && <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Nombre"><Input autoFocus value={ed.n} onChange={e => setEd({ ...ed, n: e.target.value })} placeholder="Ej.: Uniforme de patrulla" maxLength={60} /></Field>
        <Field label="Género"><div className="flex gap-2">{(["h", "m"] as const).map(k => (
          <button key={k} type="button" onClick={() => setEd({ ...ed, g: k })} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition", ed.g === k ? GEN[k].c + " ring-2 ring-current/30" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}>
            <span className="text-base leading-none">{GEN[k].s}</span>{GEN[k].l}</button>))}</div></Field>
        <Field label="Código (copiá y pegá)" className="sm:col-span-2"><Textarea rows={2} value={ed.code} onChange={e => setEd({ ...ed, code: e.target.value })} placeholder="Pegá acá el código del atuendo" className="font-mono" maxLength={800} /></Field>
        <Field label="Nota (opcional)" className="sm:col-span-2"><Input value={ed.nota || ""} onChange={e => setEd({ ...ed, nota: e.target.value })} placeholder="Cuándo se usa, rango, accesorios…" /></Field>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button size="sm" variant="ghost" icon={<X />} onClick={() => setEd(null)}>Cancelar</Button><Button size="sm" icon={<Check />} onClick={save}>Guardar</Button></div>
      </Card>}
      {!L.length && !ed ? <Empty icon={<Shirt />} title="Sin atuendos cargados" desc={canEdit ? "Creá el primero con su nombre, género y el código para copiar." : "La coordinación todavía no cargó la uniformidad."} />
        : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{V.map(u => <UnifCard key={u.id} u={u} copy={copy} tools={canEdit && <>
            <button aria-label="Editar" onClick={() => setEd(u)} className="text-slate-400 hover:text-brand-500"><Pencil className="size-3.5" /></button>
            <button aria-label="Borrar" onClick={async () => { if (await confirm(`¿Borrar «${u.n}»?`, { danger: true })) setL(L.filter(x => x.id !== u.id)); }} className="text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button></>} />)}</div>}
      <Modal open={sh} onClose={() => setSh(false)} icon={<Link2 />} title={`Link temporal · Uniformidad ${ab}`} desc="Quien tenga el link ve la uniformidad sin iniciar sesión, solo lectura, hasta que venza o lo revoques.">
        <ShareLinks k={`lspdt.unif.${id}`} title={`Uniformidad · ${ab}`} />
      </Modal>
    </div>);
}

/* links temporales de una sección: crear (con vencimiento), copiar, ver vistas y revocar */
const DUR: [number, string][] = [[1, "1 hora"], [6, "6 horas"], [24, "1 día"], [72, "3 días"], [168, "7 días"]];
export function ShareLinks({ k, title }: { k: string; title: string }) {
  const { toast } = useFeedback(), copy = useCopy(), [h, setH] = useState(24), [L, setL] = useState<{ t: string; exp: number; by: string; views: number }[] | null>(null), [busy, setBusy] = useState(false);
  const url = (t: string) => `${location.origin}/next/?ver=${t}`;
  const load = async () => { const r = await api("/api/share", { list: k }); setL(r.__s === 200 ? (r.list as typeof L) || [] : []); };
  useEffect(() => { void load(); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => { setBusy(true); const r = await api("/api/share", { k, h, title }); setBusy(false);
    if (r.__s !== 200) { toast((r.msg as string) || "No se pudo crear el link", "err"); return; } copy(url(r.t as string), "Link creado y copiado"); void load(); };
  const revoke = async (t: string) => { const r = await api("/api/share", { del: t }); if (r.__s !== 200) { toast((r.msg as string) || "No se pudo revocar", "err"); return; } toast("Link revocado"); void load(); };
  const left = (exp: number) => { const m = Math.max(0, Math.round((exp - Date.now()) / 60000)); return m >= 1440 ? `${Math.round(m / 1440)} d` : m >= 60 ? `${Math.round(m / 60)} h` : `${m} min`; };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Dura</span>
        {DUR.map(([v, l]) => <button key={v} onClick={() => setH(v)} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", h === v ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{l}</button>)}
        <Button size="sm" className="ml-auto" icon={<Link2 />} disabled={busy} onClick={create}>Crear link</Button></div>
      <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Links activos</p>
        {L === null ? <p className="text-sm text-slate-400">Cargando…</p> : !L.length ? <p className="text-sm text-slate-400">No hay links activos.</p>
          : <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(x => (
            <div key={x.t} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="min-w-0 flex-1"><span className="block truncate font-mono text-xs text-slate-500">{url(x.t)}</span>
                <span className="text-xs text-slate-400">Vence en {left(x.exp)} · {x.views} {x.views === 1 ? "vista" : "vistas"} · creado por {x.by}</span></span>
              <Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(url(x.t), "Link copiado")}>Copiar</Button>
              <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => revoke(x.t)}>Revocar</Button>
            </div>))}</div>}</div>
    </div>);
}

/* vista pública (sin sesión) de un link temporal de uniformidad: ?ver=<token> */
export function PublicSection({ tok }: { tok: string }) {
  const copy = useCopy(), [D, setD] = useState<{ v?: string | null; title?: string; exp?: number; msg?: string; ok?: boolean } | null>(null), [g, setG] = useState<"" | "h" | "m">("");
  useEffect(() => { document.title = "Uniformidad · LSPD"; void api(`/api/share?t=${tok}`).then(r => setD(r.__s === 200 ? { ...(r as object), ok: true } : { msg: (r.msg as string) || "El link no es válido" })); }, [tok]);
  const L: Unif[] = (() => { try { return D?.v ? JSON.parse(D.v) : []; } catch { return []; } })(), V = L.filter(u => !g || u.g === g);
  return (
    <div className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 dark">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center gap-3"><img src="/next/logo.svg" alt="" className="size-10" />
          <div className="flex-1"><h1 className="text-xl font-bold">{D?.title || "Uniformidad"}</h1><p className="text-xs text-slate-400">Los Santos Police Department · vista temporal de solo lectura{D?.exp ? ` · vence el ${new Date(D.exp).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p></div>
          {L.length > 0 && <GenFilter v={g} set={setG} L={L} />}</header>
        {!D ? <p className="py-16 text-center text-slate-400">Cargando…</p> : !D.ok ? <Card className="p-10 text-center"><p className="font-semibold">{D.msg}</p><p className="mt-1 text-sm text-slate-400">Pedile un link nuevo a la coordinación de la división.</p></Card>
          : !L.length ? <p className="py-16 text-center text-slate-400">Todavía no hay atuendos cargados.</p>
          : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{V.map(u => <UnifCard key={u.id} u={u} copy={copy} />)}</div>}
      </div>
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
      <div className="border-t border-red-500/20 p-5"><p className="mb-1 text-sm font-semibold">Links temporales · Uniformidad</p>
        <p className="mb-3 text-xs text-slate-500">Para que alguien sin cuenta vea la uniformidad un tiempo limitado. Podés ver cuántas veces se abrió y revocarlo cuando quieras.</p>
        <ShareLinks k={`lspdt.unif.${id}`} title={`Uniformidad · ${ab}`} /></div>
    </Card>);
}
