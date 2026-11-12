/* pestaña Calendario de cada división: la coordinación carga los eventos (nombre, hora en formato web y Discord, banner opcional y creador).
   Salen en el Calendario del departamento, con contador y aviso el mismo día para los integrantes. */
import { useState } from "react";
import { CalendarPlus, Copy, Globe2, ImagePlus, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Empty, Field, Input, Textarea } from "@/components/ui";
import { AgentCombo } from "@/components/agents";
import { ImagePicker } from "@/components/imagepick";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { EvCard, EvModal, banSrc, tipoC } from "@/components/calui";
import { CAL_TIPOS, PUB_KEY, banKey, calAll, calCan, calDivName, calKey, calPubCan, calText, type CalEv, type CalItem } from "@/lib/calendar";
import { LS, useJSON } from "@/lib/store";
import { divAb, uid } from "@/lib/domain";
import { ts } from "@/lib/discord";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

const pad = (n: number) => String(n).padStart(2, "0");
const isoD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoT = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function DivCal({ id, ab }: { id: string; ab: string }) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [L, setL] = useJSON<CalEv[]>(calKey(id), []), [P, setP] = useJSON<CalEv[]>(PUB_KEY, []);
  const can = calCan(id, me.n), pubOk = calPubCan(me.n), dn = calDivName(id), [, col] = divAb(dn);
  const blank = () => { const d = new Date(Date.now() + 864e5); d.setHours(20, 0, 0, 0); return { id: "", n: "", tipo: "Práctica", fecha: isoD(d), hora: "20:00", cre: me.n, desc: "", pub: id === "asb" && pubOk, ban: false, bid: uid() }; };
  const [f, setF] = useState(blank), [pick, setPick] = useState(false), [cur, setCur] = useState<CalItem | null>(null), [old, setOld] = useState(false);
  const up = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const atMs = f.fecha ? new Date(`${f.fecha}T${f.hora || "00:00"}`).getTime() : 0, u = Math.floor(atMs / 1000);
  const quick = (days: number, h: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); up({ fecha: isoD(d), hora: isoT(d) }); };
  const save = () => {
    if (!f.n.trim()) { toast("Poné el nombre del evento", "err"); return; }
    if (!atMs) { toast("Elegí el día y la hora", "err"); return; }
    const prev = [...L, ...P].find(x => x.id === f.bid);
    const ev: CalEv = { id: f.bid, t: prev?.t || Date.now(), by: prev?.by || me.n, n: f.n.trim(), tipo: f.tipo, at: atMs, cre: f.cre || me.n, desc: f.desc.trim(), ban: f.ban, d: id, ...(f.pub ? { pub: true } : {}) };
    setL([...L.filter(x => x.id !== ev.id), ...(f.pub ? [] : [ev])].sort((a, b) => a.at - b.at));
    if (f.pub || P.some(x => x.id === ev.id)) setP([...P.filter(x => x.id !== ev.id), ...(f.pub ? [ev] : [])].sort((a, b) => a.at - b.at));
    toast(f.id ? "Evento actualizado" : "Evento cargado en el calendario"); setF(blank());
  };
  const del = async (e: CalItem) => {
    if (!(await confirm(`¿Borrar «${e.n}» del calendario?`, { danger: true }))) return;
    setL(L.filter(x => x.id !== e.id)); if (P.some(x => x.id === e.id)) setP(P.filter(x => x.id !== e.id)); if (e.ban) LS.del(banKey(e.id)); toast("Evento borrado");
  };
  const edit = (e: CalItem) => { const d = new Date(e.at); setF({ id: e.id, bid: e.id, n: e.n, tipo: e.tipo, fecha: isoD(d), hora: isoT(d), cre: e.cre, desc: e.desc || "", pub: !!e.pub, ban: !!e.ban }); document.querySelector(".tab-screen, main")?.scrollTo?.({ top: 0, behavior: "smooth" }); };
  const all = calAll().filter(e => e.d === id), now = Date.now() - 3 * 36e5, next = all.filter(e => e.at >= now), past = all.filter(e => e.at < now).reverse();
  const preview: CalItem = { id: f.bid, t: 0, by: me.n, n: f.n || "Nombre del evento", tipo: f.tipo, at: atMs || Date.now(), cre: f.cre, desc: f.desc, ban: f.ban, d: id, pub: f.pub, src: "cal", dn, ab, col };
  const acts = (e: CalItem) => <>
    <Button size="sm" variant="ghost" icon={<Copy />} onClick={() => void copy(calText(e, ab))}>Discord</Button>
    {can && e.src !== "ins" && <><Button size="sm" variant="ghost" icon={<Pencil />} onClick={() => edit(e)}>Editar</Button>
      <Button size="sm" variant="ghost" className="ml-auto text-red-600 dark:text-red-400" icon={<Trash2 />} aria-label="Borrar" onClick={() => void del(e)} /></>}</>;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      {can ? <Card className="xl:sticky xl:top-4">
        <CardHeader icon={<CalendarPlus />} title={f.id ? "Editar evento" : "Nuevo evento"} desc="Sale en el Calendario y avisa a los integrantes el mismo día."
          action={f.id ? <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setF(blank())}>Nuevo</Button> : undefined} />
        <CardBody>
          <Field label="Nombre del evento"><Input value={f.n} onChange={e => up({ n: e.target.value })} placeholder="Ej: Práctica de persecución nocturna" maxLength={90} /></Field>
          <div className="flex flex-wrap gap-1.5">{CAL_TIPOS.map(t => (
            <button key={t} onClick={() => up({ tipo: t })} aria-pressed={f.tipo === t} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", f.tipo === t ? "text-white" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-200")}
              style={f.tipo === t ? { background: tipoC(t), borderColor: tipoC(t) } : undefined}>{t}</button>))}</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día"><Input type="date" value={f.fecha} onChange={e => up({ fecha: e.target.value })} /></Field>
            <Field label="Hora"><Input type="time" value={f.hora} onChange={e => up({ hora: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap gap-1.5">{([["Hoy 20:00", 0, 20], ["Hoy 22:00", 0, 22], ["Mañana 20:00", 1, 20], ["En una semana", 7, 20]] as const).map(([l, d, h]) =>
            <button key={l} onClick={() => quick(d, h)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300">{l}</button>)}</div>
          {u > 0 && <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800">
            <p className="flex items-center gap-2"><span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-slate-400">Web</span><span className="font-medium first-letter:uppercase">{ts(u, "F")}</span></p>
            <p className="flex items-center gap-2"><span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-slate-400">Discord</span><code className="truncate rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{`<t:${u}:F>`}</code>
              <button className="ml-auto shrink-0 font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => void copy(`<t:${u}:F> (<t:${u}:R>)`)}>Copiar</button></p>
            <p className="text-[11px] text-slate-400">Se toma tu hora local: en la web y en Discord cada uno lo ve en su propia zona horaria.</p></div>}
          <Field label="Banner" hint="(opcional · 1200×675 px, 16:9)">
            {f.ban && banSrc({ id: f.bid, ban: true }) ? <div className="relative overflow-hidden rounded-xl"><img src={banSrc({ id: f.bid, ban: true })} alt="" className="aspect-[16/7] w-full object-cover" />
              <div className="absolute right-2 top-2 flex gap-1"><Button size="sm" variant="outline" icon={<ImagePlus />} onClick={() => setPick(true)}>Cambiar</Button>
                <Button size="sm" variant="outline" icon={<X />} aria-label="Quitar banner" onClick={() => { LS.del(banKey(f.bid)); up({ ban: false }); }} /></div></div>
              : <button onClick={() => setPick(true)} className="flex aspect-[16/5] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700"><ImagePlus className="size-5" />Subir banner</button>}
          </Field>
          <Field label="Creador del evento"><AgentCombo value={f.cre} onChange={n => up({ cre: n })} /></Field>
          <Field label="Detalles" hint="(opcional)"><Textarea rows={3} value={f.desc} onChange={e => up({ desc: e.target.value })} placeholder="Punto de encuentro, uniforme, qué traer…" /></Field>
          {pubOk && <Checkbox checked={f.pub} onChange={v => up({ pub: v })} label={<span className="inline-flex items-center gap-1.5"><Globe2 className="size-3.5 text-sky-500" />Visible para todo el departamento</span>} />}
          <div className="flex gap-2">{f.id && <Button variant="ghost" onClick={() => setF(blank())}>Cancelar</Button>}<Button className="flex-1 justify-center" icon={<Save />} onClick={save}>{f.id ? "Guardar cambios" : "Cargar evento"}</Button></div>
          <div><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vista previa</p><EvCard e={preview} /></div>
        </CardBody>
      </Card> : <Card className="p-5 text-sm text-slate-500">Los eventos de {ab} los carga la coordinación. Acá ves los próximos y en <b>Calendario</b> el del departamento.</Card>}

      <div className="space-y-4">
        <div className="flex items-center gap-2"><h3 className="font-semibold">Próximos</h3><span className="rounded-md bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800">{next.length}</span>
          {past.length > 0 && <button className="ml-auto text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => setOld(!old)}>{old ? "Ocultar pasados" : `Ver pasados (${past.length})`}</button>}</div>
        {next.length ? <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{next.map(e => <EvCard key={e.id} e={e} onClick={() => setCur(e)} actions={acts(e)} />)}</div>
          : <Card><Empty icon={<CalendarPlus />} title="Sin eventos próximos" desc={can ? "Cargá el primero con el formulario." : undefined} /></Card>}
        {old && past.length > 0 && <><h3 className="pt-2 font-semibold text-slate-500">Pasados</h3><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{past.map(e => <EvCard key={e.id} e={e} onClick={() => setCur(e)} actions={acts(e)} />)}</div></>}
      </div>
      <ImagePicker open={pick} title="Banner del evento" k={banKey(f.bid)} max={1200} wide onClose={() => setPick(false)}
        onFile={d => { LS.set(banKey(f.bid), d); up({ ban: true }); }} onUrl={() => up({ ban: true })} />
      <EvModal e={cur} onClose={() => setCur(null)} />
    </div>);
}
