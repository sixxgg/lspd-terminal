/* Divisiones y subdivisiones con roster genérico (lspdt.groster.<id>) y roles que define la coordinación (lspdt.groles.<id>).
   Pestañas: Roster, Uniformidad y Administración, más las propias de cada una (ASB, HSIU, MDSO, UDU).
   Los registros (licencias, tareas, convenios…) son listas de fichas en lspdt.drec.<id>.<sección>. */
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, BadgeCheck, BookOpen, CalendarDays, Car, Check, ClipboardList, Copy, ExternalLink, FileText, GraduationCap, Handshake, Layers, Lightbulb, ListTodo,
  Megaphone, Palette, Pencil, Phone, Plus, RotateCcw, Shirt, Trash2, UserCog, Users, X } from "lucide-react";
import { Button, Card, Checkbox, Empty, Field, Input, SearchInput, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { AgentCombo, Avatar } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { copyText } from "@/components/output";
import { findAgent, hoyISO, rankES, uid } from "@/lib/domain";
import { LS, ME_ROLES, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { GEN, gCall, gMap, gRoleOf, gRoles, gSave, gSaveCall, isGCo, isGMem, saveRoles, type GRole } from "@/lib/units";
import { cn } from "@/lib/cn";
import { DivAdmin, DivNav, Uniformidad, divTabs, type DivTab, type URole } from "./DivTools";
import { Comunicados } from "./Comunicados";
import { Instrucciones } from "./Instrucciones";

/* ---------- editor de roles (Administración) ---------- */
export function RoleEditor({ id, roles, coFlag = true, locked = [] }: { id: string; roles: GRole[]; coFlag?: boolean; locked?: string[] }) {
  const { toast, confirm } = useFeedback();
  const save = (R: GRole[]) => saveRoles(id, R);
  const set = (i: number, p: Partial<GRole>) => save(roles.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const move = (i: number, d: number) => { const R = roles.slice(), j = i + d; if (j < 0 || j >= R.length) return; [R[i], R[j]] = [R[j], R[i]]; save(R); };
  return (
    <div className="border-b border-red-500/20 p-5">
      <div className="mb-1 flex items-center gap-2"><Palette className="size-4 text-slate-400" /><p className="text-sm font-semibold">Roles del roster</p>
        <button onClick={async () => { if (await confirm("¿Volver a los roles por defecto? Los integrantes con roles borrados pasan al último rol.")) { saveRoles(id, null); toast("Roles restablecidos"); } }}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><RotateCcw className="size-3.5" />Restablecer</button></div>
      <p className="mb-3 text-xs text-slate-500">De mayor a menor jerarquía. Nombre, color{coFlag ? " y si el rol administra la división" : ""}. Los cambios se guardan solos.</p>
      <div className="space-y-1.5">{roles.map((r, i) => (
        <div key={r.k} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-1.5 dark:border-slate-800">
          <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/10" style={{ background: r.c }} title="Color">
            <input type="color" value={r.c} onChange={e => set(i, { c: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" /></label>
          <Input defaultValue={r.l} key={r.l} onBlur={e => { const v = e.target.value.trim(); if (v && v !== r.l) set(i, { l: v }); }} className="h-8 min-w-[10rem] flex-1 text-sm" aria-label="Nombre del rol" />
          {coFlag && <button onClick={() => set(i, { co: !r.co })} title="Puede editar el roster y la administración"
            className={cn("rounded-lg border px-2 py-1 text-[11px] font-semibold", r.co ? "border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-300" : "border-slate-200 text-slate-400 dark:border-slate-700")}>
            {r.co ? "Coordinación" : "Miembro"}</button>}
          <div className="flex">
            <button aria-label="Subir" disabled={!i} onClick={() => move(i, -1)} className="rounded p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-white"><ArrowUp className="size-3.5" /></button>
            <button aria-label="Bajar" disabled={i === roles.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-white"><ArrowDown className="size-3.5" /></button>
            <button aria-label="Borrar rol" disabled={roles.length < 2 || locked.includes(r.k)} title={locked.includes(r.k) ? "Este rol no se puede borrar (da permisos)" : "Borrar"}
              onClick={async () => { if (await confirm(`¿Borrar el rol «${r.l}»?`, { danger: true })) save(roles.filter((_, j) => j !== i)); }}
              className="rounded p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="size-3.5" /></button>
          </div>
        </div>))}</div>
      <Button size="sm" variant="outline" className="mt-2" icon={<Plus />} onClick={() => save([...roles, { k: "r" + uid().slice(-6), l: "Rol nuevo", c: "#94a3b8" }])}>Agregar rol</Button>
    </div>);
}

/* ---------- roster genérico ---------- */
function GenRoster({ id, ab, canEdit }: { id: string; ab: string; canEdit: boolean }) {
  useStoreVersion();
  const { toast, confirm } = useFeedback(), R = gRoles(id), m = gMap(id), mem = Object.entries(m);
  const [edit, setEdit] = useState(false), [nw, setNw] = useState(""), [nwR, setNwR] = useState(R[R.length - 1]?.k || "");
  const save = (fn: (x: Record<string, string>) => void) => { const x = { ...m }; fn(x); gSave(id, x); };
  const top = (r: string) => (R.some(x => x.k === r) ? r : R[R.length - 1]?.k);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm"><b>{mem.length}</b> integrantes</span>
        {R.map(r => { const n = mem.filter(([, x]) => top(x) === r.k).length; return n ? <span key={r.k} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs dark:border-slate-700"><span className="size-2 rounded-full" style={{ background: r.c }} />{r.l} · {n}</span> : null; })}
        {canEdit && <Button className="ml-auto" size="sm" variant={edit ? "primary" : "outline"} icon={edit ? <Check /> : <Pencil />} onClick={() => setEdit(!edit)}>{edit ? "Listo" : "Editar roster"}</Button>}
      </div>
      {edit && (
        <Card className="flex flex-wrap gap-2 p-3">
          <AgentCombo className="min-w-[14rem] flex-1" value={nw} onChange={setNw} filter={a => !m[a.n]} placeholder={`Agregar agente a la ${ab}…`} />
          <Select value={nwR} onChange={e => setNwR(e.target.value)} className="w-auto text-sm">{R.map(r => <option key={r.k} value={r.k}>{r.l}</option>)}</Select>
          <Button icon={<Plus />} onClick={() => { if (!nw) return; save(x => { x[nw] = nwR; }); toast(`${nw} agregado como ${gRoleOf(id, nwR).l}`); setNw(""); }}>Agregar</Button>
        </Card>)}
      {!mem.length && !edit ? <Card><Empty icon={<Users />} title="Todavía no hay integrantes" desc={canEdit ? "Tocá «Editar roster» para sumar agentes." : "La coordinación todavía no cargó el roster."} /></Card> : (
        <Card className="overflow-hidden">{R.map(r => {
          const L = mem.filter(([, x]) => top(x) === r.k).sort((a, b) => a[0].localeCompare(b[0], "es"));
          if (!L.length && !edit) return null;
          return (
            <div key={r.k}>
              <div className="flex items-center gap-2 border-y border-slate-100 bg-slate-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 first:border-t-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" style={{ boxShadow: `inset 3px 0 0 ${r.c}` }}>
                {r.l}<span className="rounded-md bg-white px-1.5 text-slate-500 dark:bg-slate-800">{L.length}</span></div>
              {L.length ? L.map(([n]) => { const a = findAgent(n); return (
                <div key={n} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-slate-800/70">
                  <div className="flex min-w-[14rem] flex-1 items-center gap-2.5"><Avatar n={n} size={32} />
                    <div><p className="text-sm font-semibold">{n}</p><p className="text-xs text-slate-500">{a ? `${a.p ? `#${a.p} · ` : ""}${rankES(a.r)}` : "No figura en el roster cargado"}</p></div></div>
                  {edit ? <div className="flex items-center gap-1.5">
                    <Input defaultValue={gCall(id, n)} placeholder="Indicativo" className="h-8 w-32 font-mono text-xs uppercase"
                      onBlur={e => { const v = e.target.value.trim().toUpperCase(); if (v !== gCall(id, n)) { gSaveCall(id, n, v); toast("Indicativo guardado"); } }} />
                    <Select value={top(m[n])} onChange={e => save(x => { x[n] = e.target.value; })} className="h-8 w-auto py-0 text-xs">{R.map(x => <option key={x.k} value={x.k}>{x.l}</option>)}</Select>
                    <button aria-label={`Quitar a ${n}`} onClick={async () => { if (await confirm(`¿Quitar a ${n} de la ${ab}?`, { danger: true })) save(x => { delete x[n]; }); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><X className="size-4" /></button>
                  </div> : <span style={{ ["--c" as string]: r.c }} className="inline-flex items-center rounded-md border border-[color:var(--c)] bg-[color:var(--c)]/15 px-1.5 py-0.5 text-[11px] font-semibold"><span className="mr-1.5 size-1.5 rounded-full" style={{ background: r.c }} />{r.l}</span>}
                  {!edit && gCall(id, n) && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-600 dark:text-red-400">{gCall(id, n)}</span>}
                </div>); }) : <p className="px-4 py-3 text-xs text-slate-400">Sin integrantes.</p>}
            </div>);
        })}</Card>)}
    </div>);
}

/* ---------- fichas genéricas (licencias, tareas, convenios…) ---------- */
type FT = "text" | "area" | "agent" | "date" | "sel" | "bool" | "url" | "phone";
type FDef = { k: string; l: string; t: FT; o?: string[]; ph?: string; half?: boolean; req?: boolean; mono?: boolean; chip?: boolean; me?: boolean; today?: boolean };
type Rec = { id: string; t: number; by: string } & Record<string, string | number | boolean | undefined>;
const CHIP_C = ["#22c55e", "#38bdf8", "#f59e0b", "#a78bfa", "#ef4444", "#94a3b8"];
const ago = (iso: string) => { const d = Math.round((new Date(hoyISO() + "T00:00").getTime() - new Date(iso + "T00:00").getTime()) / 864e5); if (isNaN(d)) return ""; if (d < 0) return `en ${-d} ${d === -1 ? "día" : "días"}`;
  return d === 0 ? "hoy" : d < 30 ? `hace ${d} ${d === 1 ? "día" : "días"}` : d < 365 ? `hace ${Math.floor(d / 30)} ${Math.floor(d / 30) === 1 ? "mes" : "meses"}` : `hace ${Math.floor(d / 365)} ${Math.floor(d / 365) === 1 ? "año" : "años"}`; };
const dIso = (iso: string) => { const [y, m, d] = iso.split("-"); return d ? `${d}/${m}/${y}` : iso; };

function RecList({ k, fields, noun, icon, canAdd, canAll, tpl, empty, compact }: {
  k: string; fields: FDef[]; noun: string; icon: ReactNode; canAdd: boolean; canAll: boolean; tpl?: (r: Rec) => string; empty?: string; compact?: boolean;
}) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = (t: string, m: string) => void copyText(t).then(ok => toast(ok ? m : "No se pudo copiar", ok ? undefined : "err")), [L, setL] = useJSON<Rec[]>(k, []);
  const [ed, setEd] = useState<Rec | null>(null), [q, setQ] = useState(""), [chip, setChip] = useState("");
  const cf = fields.find(f => f.chip), main = fields[0];
  const blank = (): Rec => ({ id: "", t: 0, by: me.n, ...Object.fromEntries(fields.map(f => [f.k, f.t === "bool" ? true : f.me ? me.n : f.today ? hoyISO() : f.t === "sel" ? f.o?.[0] || "" : ""])) });
  const can = (r: Rec) => canAll || r.by === me.n;
  const shown = useMemo(() => L.filter(r => (!chip || r[cf?.k || ""] === chip) && (!q || fields.some(f => String(r[f.k] ?? "").toLowerCase().includes(q.toLowerCase())))).sort((a, b) => b.t - a.t), [L, q, chip, cf, fields]);
  const save = () => {
    if (!ed) return; const miss = fields.find(f => f.req && !String(ed[f.k] ?? "").trim()); if (miss) { toast(`Completá «${miss.l}»`, "err"); return; }
    const r = { ...ed, id: ed.id || uid(), t: ed.t || Date.now() };
    setL(ed.id ? L.map(x => (x.id === ed.id ? r : x)) : [r, ...L]); toast(ed.id ? "Cambios guardados" : `${noun} agregado`); setEd(null);
  };
  const val = (r: Rec, f: FDef): ReactNode => {
    const v = r[f.k]; if (f.t === "bool") return v ? <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">Sí</span> : <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-300">No</span>;
    if (v === undefined || v === "") return null;
    if (f.t === "date") return <>{dIso(String(v))} <span className="text-slate-400">· {ago(String(v))}</span></>;
    if (f.t === "url") return <a href={String(v)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-300"><ExternalLink className="size-3" />Abrir</a>;
    if (f.t === "phone") return <button onClick={() => copy(String(v), "Número copiado")} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"><Copy className="size-3" />{String(v)}</button>;
    if (f.t === "agent") return <span className="inline-flex items-center gap-1.5"><Avatar n={String(v)} size={18} />{String(v)}</span>;
    if (f.chip) { const i = Math.max(0, f.o?.indexOf(String(v)) ?? 0); return <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ color: CHIP_C[i % CHIP_C.length], background: CHIP_C[i % CHIP_C.length] + "22" }}>{String(v)}</span>; }
    return <span className={cn("whitespace-pre-wrap", f.mono && "font-mono")}>{String(v)}</span>;
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar…" className="min-w-[12rem] max-w-xs flex-1" />
        {cf && <div className="flex flex-wrap gap-1">{["", ...(cf.o || [])].map(o => <button key={o} onClick={() => setChip(o)} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold transition", chip === o ? "border-brand-500 bg-brand-600 text-white" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{o || "Todos"} ({o ? L.filter(r => r[cf.k] === o).length : L.length})</button>)}</div>}
        {canAdd && <Button className="ml-auto" size="sm" icon={<Plus />} onClick={() => setEd(blank())}>Agregar {noun.toLowerCase()}</Button>}
      </div>
      {!shown.length ? <Card><Empty icon={icon} title={L.length ? "Sin resultados" : empty || `Todavía no hay ${noun.toLowerCase()}s`} desc={canAdd && !L.length ? "Tocá «Agregar» para cargar el primero." : undefined} /></Card>
        : <div className={cn("grid gap-3", compact ? "sm:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>{shown.map(r => (
          <div key={r.id} className="fx-card flex flex-col gap-2 rounded-2xl p-4" style={{ ["--c" as string]: "rgb(var(--b-400))" }}>
            <div className="flex items-start gap-2">
              {main.t === "agent" && <Avatar n={String(r[main.k])} size={34} />}
              <div className="min-w-0 flex-1"><b className="block truncate text-[15px] leading-tight">{String(r[main.k] || "—")}</b>
                {main.t === "agent" && (() => { const a = findAgent(String(r[main.k])); return a ? <span className="text-xs text-slate-500">{a.p ? `#${a.p} · ` : ""}{rankES(a.r)}</span> : null; })()}</div>
              {tpl && <button title="Copiar plantilla" onClick={() => copy(tpl(r), "Plantilla copiada")} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-brand-500"><Copy className="size-4" /></button>}
              {can(r) && <><button aria-label="Editar" onClick={() => setEd({ ...r })} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"><Pencil className="size-4" /></button>
                <button aria-label="Borrar" onClick={async () => { if (await confirm(`¿Borrar «${String(r[main.k] || noun)}»?`, { danger: true })) { setL(L.filter(x => x.id !== r.id)); toast("Borrado"); } }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600"><Trash2 className="size-4" /></button></>}
            </div>
            <dl className="grid gap-x-3 gap-y-1 text-[13px]" style={{ gridTemplateColumns: "auto 1fr" }}>
              {fields.slice(1).map(f => { const v = val(r, f); return v === null ? null : <div key={f.k} className="contents"><dt className="text-slate-400">{f.l}</dt><dd className="min-w-0 break-words">{v}</dd></div>; })}
            </dl>
            <p className="mt-auto text-[11px] text-slate-400">Cargado por {r.by}</p>
          </div>))}</div>}
      <Modal open={!!ed} onClose={() => setEd(null)} icon={icon} title={ed?.id ? `Editar ${noun.toLowerCase()}` : `Nuevo ${noun.toLowerCase()}`}
        footer={<><Button variant="ghost" onClick={() => setEd(null)}>Cancelar</Button><Button icon={<Check />} onClick={save}>Guardar</Button></>}>
        {ed && <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(f => { const v = ed[f.k], up = (x: string | boolean) => setEd({ ...ed, [f.k]: x });
            return <Field key={f.k} label={<>{f.l}{f.req && <span className="text-red-500"> *</span>}</>} className={f.half ? "" : "sm:col-span-2"}>
              {f.t === "area" ? <Textarea rows={3} value={String(v ?? "")} onChange={e => up(e.target.value)} placeholder={f.ph} />
                : f.t === "agent" ? <AgentCombo value={String(v ?? "")} onChange={up} placeholder={f.ph} />
                : f.t === "sel" ? <Select value={String(v ?? "")} onChange={e => up(e.target.value)}>{f.o!.map(o => <option key={o}>{o}</option>)}</Select>
                : f.t === "bool" ? <Checkbox checked={!!v} onChange={up} label={v ? "Sí" : "No"} />
                : <Input type={f.t === "date" ? "date" : f.t === "url" ? "url" : f.t === "phone" ? "tel" : "text"} value={String(v ?? "")} onChange={e => up(e.target.value)} placeholder={f.ph} className={f.mono ? "font-mono" : ""} />}
            </Field>; })}
          {tpl && <div className="sm:col-span-2"><p className="mb-1 text-xs font-semibold text-slate-500">Vista previa para Discord</p>
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-950">{tpl(ed)}</pre></div>}
        </div>}
      </Modal>
    </div>);
}

/* ---------- ASB ---------- */
const AREAS = ["Formación y gestión interna", "Eventos y participación ciudadana", "Relaciones institucionales", "Comunicación y medios"];
const ASB_SUBS: [string, string, string[]][] = [
  ["Formación y gestión interna", "#38bdf8", ["Contratación de personal administrativo o temporal", "Gestión de recursos humanos internos", "Cursos de seguridad privada (organización y ejecución)", "Formación interna del personal", "Coordinación de procesos internos"]],
  ["Eventos y participación ciudadana", "#22c55e", ["Eventos con la ciudadanía", "Actividades internas de la organización", "Eventos interdepartamentales", "Jornadas abiertas, ferias y exhibiciones", "Dinamización y planificación de actividades"]],
  ["Relaciones institucionales", "#f59e0b", ["Relaciones con la prensa", "Convenios con empresas y organizaciones", "Gestión de acuerdos de colaboración", "Atención a medios y ruedas de prensa", "Representación institucional en actos"]],
  ["Comunicación y medios", "#a78bfa", ["Redes sociales (Instapic, Birdy, etc.)", "Diseño de cartelería y posts", "Edición de vídeos promocionales o informativos", "Campañas de imagen y comunicación oficial", "Cobertura de actividades y eventos", "Contacto con empresas para la realización y edición de video"]],
];
const CANVA = "https://www.canva.com/design/DAHNU4X8Ads/sBWoaS_ZolLPA-_M7vuArg/edit";
const F_ADM: FDef[] = [{ k: "n", l: "Nombre y apellido", t: "text", req: true }, { k: "puesto", l: "Puesto", t: "text", half: true }, { k: "area", l: "Área", t: "sel", o: AREAS, half: true },
  { k: "est", l: "Estado", t: "sel", o: ["Activo", "Temporal", "En formación", "Baja"], chip: true, half: true }, { k: "desde", l: "Desde", t: "date", today: true, half: true },
  { k: "tel", l: "Teléfono", t: "phone", half: true }, { k: "nota", l: "Notas", t: "area" }];
const F_IEV: FDef[] = [{ k: "tit", l: "Evento", t: "text", req: true }, { k: "tipo", l: "Tipo", t: "sel", o: ["Con la ciudadanía", "Interno", "Interdepartamental", "Jornada abierta / feria / exhibición", "Otro"], half: true },
  { k: "est", l: "Estado", t: "sel", o: ["Propuesta", "Aprobada", "En preparación", "Realizada", "Descartada"], chip: true, half: true }, { k: "fecha", l: "Fecha prevista", t: "date", half: true },
  { k: "lugar", l: "Lugar", t: "text", half: true }, { k: "desc", l: "Descripción", t: "area" }];
const F_IPU: FDef[] = [{ k: "tit", l: "Publicación", t: "text", req: true }, { k: "red", l: "Red", t: "sel", o: ["Instapic", "Birdy", "Otra"], half: true },
  { k: "tipo", l: "Formato", t: "sel", o: ["Post", "Cartel", "Video", "Campaña", "Cobertura de evento"], half: true },
  { k: "est", l: "Estado", t: "sel", o: ["Idea", "En diseño", "Lista", "Publicada", "Descartada"], chip: true, half: true }, { k: "link", l: "Link", t: "url", half: true }, { k: "desc", l: "Descripción", t: "area" }];
const F_DOC: FDef[] = [{ k: "tit", l: "Documento", t: "text", req: true }, { k: "cat", l: "Categoría", t: "sel", o: ["Normativa", "Formularios", "Plantillas", "Manuales", "Actas", "Otro"], chip: true, half: true },
  { k: "link", l: "Link", t: "url", half: true }, { k: "desc", l: "Descripción", t: "area" }];
const F_TAR: FDef[] = [{ k: "tit", l: "Tarea", t: "text", req: true }, { k: "resp", l: "Responsable", t: "agent", half: true }, { k: "area", l: "Área", t: "sel", o: AREAS, half: true },
  { k: "est", l: "Estado", t: "sel", o: ["Pendiente", "En curso", "Hecha"], chip: true, half: true }, { k: "prio", l: "Prioridad", t: "sel", o: ["Media", "Alta", "Baja"], half: true },
  { k: "vence", l: "Vence", t: "date", half: true }, { k: "desc", l: "Detalle", t: "area" }];
const F_CONV: FDef[] = [{ k: "emp", l: "Empresa u organización", t: "text", req: true }, { k: "tipo", l: "Tipo", t: "sel", o: ["Colaboración", "Patrocinio", "Servicios", "Prensa", "Otro"], half: true },
  { k: "est", l: "Estado", t: "sel", o: ["En negociación", "Firmado", "Vencido", "Cancelado"], chip: true, half: true }, { k: "fecha", l: "Fecha de firma", t: "date", half: true },
  { k: "contacto", l: "Contacto", t: "text", half: true }, { k: "link", l: "Documento", t: "url", half: true }, { k: "nota", l: "Notas", t: "area" }];
const F_TEL: FDef[] = [{ k: "local", l: "Local", t: "text", req: true, ph: "Nombre del negocio" }, { k: "n", l: "Nombre", t: "text", half: true }, { k: "cargo", l: "Es el número del", t: "sel", o: ["Jefe", "Empleado"], chip: true, half: true },
  { k: "tel", l: "Teléfono", t: "phone", req: true, mono: true }];

function Subdivs() {
  return <div className="grid gap-4 md:grid-cols-2">{ASB_SUBS.map(([t, c, L]) => (
    <div key={t} className="fx-card rounded-2xl p-5" style={{ ["--c" as string]: c }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: c }}>Subdivisión</p>
      <h3 className="mt-0.5 text-lg font-bold">{t}</h3>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Gestión de</p>
      <ul className="mt-1.5 space-y-1.5">{L.map(x => <li key={x} className="flex gap-2 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: c }} />{x}</li>)}</ul>
    </div>))}</div>;
}
function Convenios({ id, mem, co }: { id: string; mem: boolean; co: boolean }) {
  return (
    <div className="space-y-6">
      <div className="fx-card flex flex-wrap items-center gap-4 rounded-2xl p-5" style={{ ["--c" as string]: "#f59e0b" }}>
        <Handshake className="size-8 text-amber-400" />
        <div className="min-w-0 flex-1"><b className="block">Plantilla de convenio</b><p className="text-sm text-slate-500">Abrila en Canva, hacé una copia y rellenala con los datos de la empresa.</p></div>
        <a href={CANVA} target="_blank" rel="noreferrer"><Button icon={<ExternalLink />}>Abrir plantilla en Canva</Button></a>
      </div>
      <section><h3 className="mb-3 flex items-center gap-2 font-bold"><Handshake className="size-4 text-slate-400" />Convenios</h3>
        <RecList k={`lspdt.drec.${id}.conv`} fields={F_CONV} noun="Convenio" icon={<Handshake />} canAdd={mem} canAll={co} /></section>
      <section><h3 className="mb-3 flex items-center gap-2 font-bold"><Phone className="size-4 text-slate-400" />Teléfonos de negocios</h3>
        <RecList k={`lspdt.drec.${id}.tel`} fields={F_TEL} noun="Teléfono" icon={<Phone />} canAdd={mem} canAll={co} compact /></section>
    </div>);
}

/* ---------- HSIU y MDSO ---------- */
const F_TOM: FDef[] = [{ k: "ag", l: "Agente", t: "agent", me: true, req: true }, { k: "veh", l: "Vehículo utilizado", t: "text", req: true, half: true },
  { k: "seg", l: "Vehículo seguido", t: "text", req: true, half: true }, { k: "mot", l: "Motivo", t: "area", req: true }, { k: "fecha", l: "Fecha", t: "date", today: true, half: true }];
const tomTxt = (r: Rec) => `**Vehículo utilizado :** ${r.veh || "—"}\n**Vehículo Seguido :** ${r.seg || "—"}\n**Motivo :** ${r.mot || "—"}`;
const F_LIC: FDef[] = [{ k: "ag", l: "Agente", t: "agent", req: true }, { k: "act", l: "Licencia activa", t: "bool", half: true }, { k: "desde", l: "Activa desde", t: "date", today: true, half: true },
  { k: "serie", l: "N° de serie del drone", t: "text", mono: true, req: true, half: true }, { k: "modelo", l: "Modelo del drone", t: "text", half: true },
  { k: "vence", l: "Vence", t: "date", half: true }, { k: "por", l: "Otorgada por", t: "agent", me: true }, { k: "nota", l: "Observaciones", t: "area" }];

/* ---------- la división genérica ---------- */
const TAB: Record<string, [string, typeof Users]> = { ros: ["Roster", Users], uni: ["Uniformidad", Shirt], adm2: ["Administrativos", UserCog], iev: ["Ideas de eventos", CalendarDays], ipu: ["Ideas de publicaciones", Lightbulb],
  doc: ["Documentación", FileText], tar: ["Tareas", ListTodo], conv: ["Convenios", Handshake], subs: ["Subdivisiones", Layers], tom: ["Registro TOM", Car], lic: ["Licencias", BadgeCheck],
  com: ["Comunicados", Megaphone], ins: ["Instrucciones", GraduationCap] };
export function GenDiv({ d }: { d: string }) {
  useStoreVersion();
  const me = useMe(), c = GEN[d], id = c.id, ab = (d.match(/[A-Z]/g) || []).join("") || d, mem = !!ME_ROLES.admin || isGMem(id, me.n), co = isGCo(id, me.n);
  const only = c.tabs.includes("lic"); /* MDSO: solo licencias */
  const keys = only ? c.tabs : ["ros", ...[...c.tabs, "uni"].sort((a, b) => TAB[a][0].localeCompare(TAB[b][0], "es"))];
  const base: DivTab[] = keys.map(v => { const [l, I] = TAB[v]; return { value: v, label: l, icon: <I />, txt: l }; });
  const opts = only ? base : divTabs(id, base, co);
  const [t0, setT] = useState(() => LS.get("lspdt.next.gtab." + id) || keys[0]), t = opts.some(x => x.value === t0) ? t0 : opts[0]?.value || "ros";
  const go = (v: string) => { setT(v); LS.set("lspdt.next.gtab." + id, v); };
  const R = gRoles(id), uRoles = R.map(r => [r.k, r.l, r.c] as URole), mine = gMap(id)[me.n] ? [gMap(id)[me.n]] : [];
  const names = Object.keys(gMap(id)).filter(n => findAgent(n)).sort((a, b) => a.localeCompare(b, "es"));
  const insR = (n: string): "coord" | "inst" | "instp" | "" => { const r = gMap(id)[n]; return !r ? "" : gRoleOf(id, r).co ? "coord" : r === "inst" ? "inst" : ""; };
  const rec = (s: string, f: FDef[], noun: string, icon: ReactNode, o: { add?: boolean; tpl?: (r: Rec) => string } = {}) =>
    <RecList k={`lspdt.drec.${id}.${s}`} fields={f} noun={noun} icon={icon} canAdd={o.add ?? mem} canAll={co} tpl={o.tpl} />;
  const body = t === "adm" ? <DivAdmin id={id} ab={ab} dn={d} tabs={base} extra={<RoleEditor id={id} roles={R} />} />
    : t === "ros" ? <GenRoster id={id} ab={ab} canEdit={co} />
    : t === "uni" ? <Uniformidad id={c.uni} ab={ab} dn={d} canEdit={co} roles={uRoles} mine={mine} />
    : t === "lic" ? rec("lic", F_LIC, "Licencia", <BadgeCheck />, { add: co })
    : t === "tom" ? rec("tom", F_TOM, "Registro", <Car />, { tpl: tomTxt })
    : t === "adm2" ? rec("adm2", F_ADM, "Administrativo", <UserCog />)
    : t === "iev" ? rec("iev", F_IEV, "Idea", <CalendarDays />)
    : t === "ipu" ? rec("ipu", F_IPU, "Idea", <Lightbulb />)
    : t === "doc" ? rec("doc", F_DOC, "Documento", <BookOpen />)
    : t === "tar" ? rec("tar", F_TAR, "Tarea", <ClipboardList />)
    : t === "conv" ? <Convenios id={id} mem={mem} co={co} />
    : t === "subs" ? <Subdivs />
    : t === "com" ? <Comunicados div="udu" canEdit={mem} />
    : <Instrucciones div={id} ab={ab} names={names} roleOf={insR} tipos={["Persecución marítima", "Buceo", "Rescate subacuático", "Navegación"]} canEdit={mem} isCoord={co} />;
  return (
    <div className="space-y-4">
      {opts.length > 1 && <DivNav value={t} onChange={go} options={opts} />}
      {only && <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500"><BadgeCheck className="size-4 text-teal-400" />Coordinación: {Object.entries(gMap(id)).filter(([, r]) => gRoleOf(id, r).co).map(([n]) => n).join(" · ") || "—"}</div>}
      {body}
    </div>);
}
