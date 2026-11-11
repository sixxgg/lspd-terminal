/* herramientas comunes a todas las divisiones:
   · Uniformidad: atuendos con nombre y código para copiar (lspdt.unif.<div>)
   · Administración (solo coordinación / subcoordinación): qué pestañas ven los miembros (lspdt.divacc.<div>) y links temporales
   · Links temporales de solo lectura (api/share) y su vista pública (?ver=<token>) */
import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff, Link2, Lock, Pencil, Plus, Shirt, ShieldAlert, Trash2 } from "lucide-react";
import { Button, Card, Empty, Field, Input, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { api } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { divEmblem, uid } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Unif = { id: string; n: string; g?: "h" | "m"; r?: string; rl?: string; rc?: string; code: string; nota?: string; by?: string; t?: number };
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
export type URole = [string, string, string]; /* [clave, nombre, color] de mayor a menor jerarquía */
function UnifCard({ u, copy, tools, locked }: { u: Unif; copy: (s: string) => void; tools?: ReactNode; locked?: string }) {
  return (
    <div className={cn("group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-900/70", !locked && "hover:-translate-y-0.5 hover:shadow-md")}
      style={{ boxShadow: u.rc ? `inset 3px 0 0 ${u.rc}` : undefined }}>
      <div className="flex items-start gap-2"><b className="min-w-0 flex-1 truncate text-sm leading-tight">{u.n}</b>{tools}</div>
      <div className="flex flex-wrap items-center gap-1"><GenTag g={u.g} />{u.rl && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (u.rc || "#64748b") + "22", color: u.rc || undefined }}>{u.rl}</span>}</div>
      {locked ? <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500 dark:bg-slate-800/70"><Lock className="size-3.5 shrink-0" /><span className="truncate">{locked}</span></div>
        : <button onClick={() => copy(u.code)} title="Copiar código" className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5 text-left font-mono text-xs transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-950/60">
          <span className="line-clamp-2 min-w-0 flex-1 break-all">{u.code}</span><Copy className="size-3.5 shrink-0 text-slate-400" /></button>}
      {u.nota && !locked && <p className="line-clamp-2 text-[11px] text-slate-500">{u.nota}</p>}
    </div>);
}
const GenFilter = ({ v, set, L }: { v: "" | "h" | "m"; set: (v: "" | "h" | "m") => void; L: Unif[] }) => (
  <div className="flex gap-1">{([["", "Todos"], ["h", "Hombre"], ["m", "Mujer"]] as const).map(([k, l]) => (
    <button key={k} onClick={() => set(k)} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", v === k ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}>
      {k && GEN[k].s} {l} <span className="opacity-60">{k ? L.filter(u => u.g === k).length : L.length}</span></button>))}</div>);
/* atuendos agrupados por rango (de mayor a menor) y al final los generales */
function groups(L: Unif[], roles: URole[]) {
  const G = roles.map(([k, l, c]) => ({ k, l, c, L: L.filter(u => u.r === k) })).filter(g => g.L.length);
  const gen = L.filter(u => !u.r || !roles.some(r => r[0] === u.r));
  if (gen.length) G.push({ k: "", l: "General · todos los rangos", c: "#64748b", L: gen });
  return G;
}

export function Uniformidad({ id, ab, dn, canEdit, roles = [], mine = [] }: { id: string; ab: string; dn?: string; canEdit: boolean; roles?: URole[]; mine?: string[] }) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy(), [L, setL] = useJSON<Unif[]>(`lspdt.unif.${id}`, []);
  const [ed, setEd] = useState<Unif | null>(null), [g, setG] = useState<"" | "h" | "m">(""), [sh, setSh] = useState(false);
  /* acceso por jerarquía: cada uno ve los de su rango y los de abajo; la coordinación ve todo */
  const myIdx = Math.min(...mine.map(r => roles.findIndex(x => x[0] === r)).filter(i => i >= 0), Infinity);
  const lockOf = (u: Unif) => { if (canEdit || !u.r) return ""; const i = roles.findIndex(x => x[0] === u.r); return i < 0 || i >= myIdx ? "" : `Solo ${roles[i][1]} o superior`; };
  const save = () => { if (!ed) return; const R = roles.find(x => x[0] === ed.r);
    const x: Unif = { ...ed, n: ed.n.trim(), code: ed.code.trim(), nota: ed.nota?.trim(), r: R ? R[0] : "", rl: R ? R[1] : "", rc: R ? R[2] : "", by: me.n, t: Date.now() };
    if (!x.n || !x.code) { toast("Completá nombre y código"); return; } if (!x.g) { toast("Elegí el género"); return; }
    setL(L.some(y => y.id === x.id) ? L.map(y => y.id === x.id ? x : y) : [...L, x]); setEd(null); toast("Atuendo guardado"); };
  const V = L.filter(u => !g || u.g === g), G = groups(V, roles);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-500"><b className="text-slate-900 dark:text-white">{L.length}</b> atuendo{L.length === 1 ? "" : "s"} de la {ab}</p>
        {L.length > 0 && <GenFilter v={g} set={setG} L={L} />}
        <span className="mr-auto" />
        {canEdit && <Button size="sm" variant="outline" icon={<Link2 />} onClick={() => setSh(true)}>Link temporal</Button>}
        {canEdit && <Button size="sm" icon={<Plus />} onClick={() => setEd({ id: uid(), n: "", code: "", r: "" })}>Nuevo atuendo</Button>}
      </div>
      {!L.length ? <Empty icon={<Shirt />} title="Sin atuendos cargados" desc={canEdit ? "Creá el primero con su nombre, rango, género y el código para copiar." : "La coordinación todavía no cargó la uniformidad."} />
        : G.map(gr => (
          <section key={gr.k || "_"} className="space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: gr.c }}><span className="size-2 rounded-full" style={{ background: gr.c }} />{gr.l}<span className="font-semibold text-slate-400">· {gr.L.length}</span></h4>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{gr.L.map(u => <UnifCard key={u.id} u={u} copy={copy} locked={lockOf(u)} tools={canEdit && <span className="flex gap-1.5 opacity-60 transition group-hover:opacity-100">
              <button aria-label="Editar" onClick={() => setEd(u)} className="text-slate-400 hover:text-brand-500"><Pencil className="size-3.5" /></button>
              <button aria-label="Borrar" onClick={async () => { if (await confirm(`¿Borrar «${u.n}»?`, { danger: true })) setL(L.filter(x => x.id !== u.id)); }} className="text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button></span>} />)}</div>
          </section>))}
      {/* alta y edición en un modal chico */}
      <Modal open={!!ed} onClose={() => setEd(null)} size="sm" icon={<Shirt />} title={ed && L.some(y => y.id === ed.id) ? "Editar atuendo" : "Nuevo atuendo"} desc={`Uniformidad de la ${ab}`}
        footer={<><Button size="sm" variant="ghost" onClick={() => setEd(null)}>Cancelar</Button><Button size="sm" icon={<Check />} onClick={save}>Guardar</Button></>}>
        {ed && <div className="space-y-3">
          <Field label="Nombre"><Input autoFocus value={ed.n} onChange={e => setEd({ ...ed, n: e.target.value })} placeholder="Ej.: Uniforme de patrulla" maxLength={60} /></Field>
          {roles.length > 0 && <Field label="Rango"><div className="flex flex-wrap gap-1.5">{([["", "Todos los rangos", "#64748b"] as URole, ...roles]).map(([k, l, c]) => (
            <button key={k || "_"} type="button" onClick={() => setEd({ ...ed, r: k })} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", (ed.r || "") === k ? "text-white" : "text-slate-600 hover:brightness-110 dark:text-slate-300")}
              style={(ed.r || "") === k ? { background: c, borderColor: c } : { borderColor: c + "66" }}>{l}</button>))}</div></Field>}
          <Field label="Género"><div className="grid grid-cols-2 gap-2">{(["h", "m"] as const).map(k => (
            <button key={k} type="button" onClick={() => setEd({ ...ed, g: k })} className={cn("flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold transition", ed.g === k ? GEN[k].c + " ring-2 ring-offset-1 ring-current dark:ring-offset-slate-900" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}>
              <span className="text-base leading-none">{GEN[k].s}</span>{GEN[k].l}</button>))}</div></Field>
          <Field label="Código (copiá y pegá)"><Textarea rows={2} value={ed.code} onChange={e => setEd({ ...ed, code: e.target.value })} placeholder="Pegá acá el código del atuendo" className="!min-h-0 h-16 font-mono text-xs" maxLength={800} /></Field>
          <Field label="Nota (opcional)"><Input value={ed.nota || ""} onChange={e => setEd({ ...ed, nota: e.target.value })} placeholder="Cuándo se usa, accesorios…" /></Field>
        </div>}
      </Modal>
      <Modal open={sh} onClose={() => setSh(false)} icon={<Link2 />} title={`Link temporal · Uniformidad ${ab}`} desc="Quien tenga el link ve la uniformidad sin iniciar sesión, solo lectura, hasta que venza o lo revoques.">
        <ShareLinks k={`lspdt.unif.${id}`} title={`Uniformidad · ${ab}`} div={dn} ab={ab} />
      </Modal>
    </div>);
}

/* links temporales de una sección: crear (con vencimiento), copiar, ver vistas y revocar */
const DUR: [number, string][] = [[1, "1 hora"], [6, "6 horas"], [24, "1 día"], [72, "3 días"], [168, "7 días"]];
export function ShareLinks({ k, title, div, ab }: { k: string; title: string; div?: string; ab?: string }) {
  const { toast } = useFeedback(), copy = useCopy(), [h, setH] = useState(24), [L, setL] = useState<{ t: string; exp: number; by: string; views: number }[] | null>(null), [busy, setBusy] = useState(false);
  const url = (t: string) => `${location.origin}/next/?ver=${t}`;
  const load = async () => { const r = await api("/api/share", { list: k }); setL(r.__s === 200 ? (r.list as typeof L) || [] : []); };
  useEffect(() => { void load(); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => { setBusy(true); const r = await api("/api/share", { k, h, title, div, ab }); setBusy(false);
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

/* vista pública (sin sesión) de un link temporal de uniformidad: ?ver=<token>
   Usa el emblema actual de la división y el logo del departamento que manda el servidor */
type PubD = { v?: string | null; title?: string; div?: string; ab?: string; exp?: number; img?: { div?: string | null; brand?: string | null }; msg?: string; ok?: boolean };
export function PublicSection({ tok }: { tok: string }) {
  const copy = useCopy(), [D, setD] = useState<PubD | null>(null), [g, setG] = useState<"" | "h" | "m">("");
  useEffect(() => { document.documentElement.classList.add("dark"); void api(`/api/share?t=${tok}`).then(r => setD(r.__s === 200 ? { ...(r as PubD), ok: true } : { msg: (r.msg as string) || "El link no es válido" })); }, [tok]);
  const L: Unif[] = (() => { try { return D?.v ? JSON.parse(D.v) : []; } catch { return []; } })(), V = L.filter(u => !g || u.g === g);
  const ab = D?.ab || (D?.title || "").replace(/^Uniformidad · /, ""), emb = D?.img?.div || (D?.div ? divEmblem(D.div) : "") || D?.img?.brand || "/next/logo.svg";
  useEffect(() => { document.title = `Uniformidad${ab ? " · " + ab : ""} · LSPD`; }, [ab]);
  const left = D?.exp ? Math.max(0, D.exp - Date.now()) : 0, lt = left > 864e5 ? `${Math.round(left / 864e5)} d` : left > 36e5 ? `${Math.round(left / 36e5)} h` : `${Math.max(1, Math.round(left / 6e4))} min`;
  return (
    <div className="pub-bg min-h-dvh px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="pub-hero relative overflow-hidden rounded-2xl p-5 sm:p-6">
          <div className="relative flex flex-wrap items-center gap-4 sm:gap-5">
            <div className="pub-emb grid size-20 shrink-0 place-items-center sm:size-24"><img src={emb} alt="" className="size-full object-contain" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">{D?.img?.brand ? <img src={D.img.brand} alt="" className="mr-1.5 inline size-4 align-[-3px]" /> : null}Los Santos Police Department</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Uniformidad{ab && <span className="pub-neon"> · {ab}</span>}</h1>
              {D?.div && <p className="text-sm text-slate-400">{D.div}</p>}
            </div>
            {D?.ok && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />Solo lectura · vence en {lt}</span>}
          </div>
        </header>
        {D?.ok && L.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-400"><b className="text-white">{L.length}</b> atuendos · tocá un código para copiarlo</p><GenFilter v={g} set={setG} L={L} /></div>}
        {!D ? <p className="py-16 text-center text-slate-400">Cargando…</p>
          : !D.ok ? <div className="pub-hero rounded-2xl p-10 text-center"><Lock className="mx-auto mb-3 size-8 text-slate-400" /><p className="font-semibold">{D.msg}</p><p className="mt-1 text-sm text-slate-400">Pedile un link nuevo a la coordinación de la división.</p></div>
          : !L.length ? <p className="py-16 text-center text-slate-400">Todavía no hay atuendos cargados.</p>
          : groups(V, [...new Map(V.filter(u => u.r).map(u => [u.r!, [u.r!, u.rl || u.r!, u.rc || "#64748b"] as URole])).values()]).map(gr => (
            <section key={gr.k || "_"} className="space-y-2.5"><h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: gr.c, textShadow: `0 0 12px ${gr.c}88` }}><span className="size-2 rounded-full" style={{ background: gr.c, boxShadow: `0 0 10px ${gr.c}` }} />{gr.l}</h4>
              <div className="pub-cards grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gr.L.map(u => <UnifCard key={u.id} u={u} copy={copy} />)}</div></section>))}
        <p className="pt-4 text-center text-[11px] uppercase tracking-[0.2em] text-slate-600">LSPD · Terminal de Mando</p>
      </div>
    </div>);
}

export function DivAdmin({ id, ab, dn, tabs }: { id: string; ab: string; dn?: string; tabs: DivTab[] }) {
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
        <ShareLinks k={`lspdt.unif.${id}`} title={`Uniformidad · ${ab}`} div={dn} ab={ab} /></div>
    </Card>);
}
