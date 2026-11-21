/* A.S.D › Licencias: las licencias de vuelo pasaron a la Air Support Division (la Drone Support Operations de la METRO quedó bloqueada).
   Cada licencia es de Drones (LSPD-DRN-XXXX) o de Helicópteros (LSPD-HEL-XXXX, con sus habilitaciones: Blackhawk, rescate…), vale por
   3, 6 o 9 meses, 1 o 2 años, y el número se genera solo. Las otorga la Coordinación del A.S.D (el servidor lo controla).
   Datos: lspdt.asdLic. Las licencias viejas de la MDSO (lspdt.drec.mdso.lic) se pasan solas la primera vez que entra la coordinación. */
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Ban, CalendarClock, Dices, Helicopter, Pencil, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { Button, Card, Empty, Field, Input, SearchInput, Segmented, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { AgentCombo, Avatar, RankBadge } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { findAgent, hoyISO, uid } from "@/lib/domain";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

type Tipo = "drn" | "hel";
type Lic = { id: string; ag: string; tipo: Tipo; num: string; desde: string; val: number; vence: string; hab?: string[]; serie?: string; modelo?: string; rev?: boolean; por?: string; nota?: string; t: number };
const KEY = "lspdt.asdLic", OLD = "lspdt.drec.mdso.lic";
const TIPO: Record<Tipo, { l: string; c: string; pre: string }> = { drn: { l: "Drones", c: "#14b8a6", pre: "LSPD-DRN-" }, hel: { l: "Helicópteros", c: "#f59e0b", pre: "LSPD-HEL-" } };
const VAL: [number, string][] = [[3, "3 meses"], [6, "6 meses"], [9, "9 meses"], [12, "1 año"], [24, "2 años"]];
/* para qué puede usar el helicóptero */
const HAB = ["Patrullaje aéreo", "Apoyo a persecución", "Rescate (SAR)", "Blackhawk · transporte táctico", "Transporte de personal", "Vuelo nocturno", "Inserción y extracción táctica"];
const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; /* sin 0/O ni 1/I para que no se confundan */
const genNum = (t: Tipo, used: string[]) => { for (;;) { let s = ""; for (let i = 0; i < 4; i++) s += ABC[Math.floor(Math.random() * ABC.length)]; const n = TIPO[t].pre + s; if (!used.includes(n)) return n; } };
const addM = (iso: string, m: number) => { const d = new Date((iso || hoyISO()) + "T12:00"); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };
const dmy = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "—");
const valL = (m: number) => VAL.find(v => v[0] === m)?.[1] || `${m} meses`;
type Est = "vig" | "pv" | "ven" | "rev";
const estOf = (l: Lic): Est => { if (l.rev) return "rev"; const d = (new Date(l.vence + "T23:59").getTime() - Date.now()) / 864e5; return d < 0 ? "ven" : d <= 15 ? "pv" : "vig"; };
const EST: Record<Est, [string, string]> = { vig: ["Vigente", "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"], pv: ["Vence pronto", "bg-amber-500/15 text-amber-600 dark:text-amber-300"],
  ven: ["Vencida", "bg-red-500/15 text-red-600 dark:text-red-300"], rev: ["Revocada", "bg-slate-500/15 text-slate-500"] };

export function AsdLic({ co }: { co: boolean }) {
  const { toast, confirm } = useFeedback(), me = useMe();
  const [list, setList] = useJSON<Lic[]>(KEY, []), [ed, setEd] = useState<Lic | null>(null);
  const [q, setQ] = useState(""), [tf, setTf] = useState<"all" | Tipo>("all"), [ef, setEf] = useState<"all" | Est>("all"), [vw, setVw] = useState<"lic" | "ag">("lic");
  /* licencias viejas de la MDSO → A.S.D (una sola vez, la primera vez que entra la coordinación) */
  useEffect(() => {
    if (!co || list.length || LS.get(KEY + "Mig")) return;
    const old = LS.json<Record<string, unknown>[]>(OLD, []); if (!Array.isArray(old) || !old.length) { LS.set(KEY + "Mig", "1"); return; }
    const used: string[] = [], out: Lic[] = old.filter(r => r && r.ag).map(r => { const desde = String(r.desde || hoyISO()), num = genNum("drn", used); used.push(num);
      return { id: uid(), ag: String(r.ag), tipo: "drn", num, desde, val: 12, vence: String(r.vence || "") || addM(desde, 12), serie: String(r.serie || ""), modelo: String(r.modelo || ""), rev: r.act === false, por: String(r.por || ""), nota: String(r.nota || ""), t: Date.now() }; });
    setList(out); LS.set(KEY + "Mig", "1"); if (out.length) toast(`${out.length} licencias de drones pasaron de la MDSO al A.S.D`);
  }, [co]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = q.trim().toLowerCase();
  const vis = useMemo(() => list.filter(l => (tf === "all" || l.tipo === tf) && (ef === "all" || estOf(l) === ef) && (!s || l.ag.toLowerCase().includes(s) || l.num.toLowerCase().includes(s)))
    .sort((a, b) => a.ag.localeCompare(b.ag, "es") || a.tipo.localeCompare(b.tipo)), [list, tf, ef, s]);
  const cnt = (e: Est) => list.filter(l => estOf(l) === e).length;
  const save = (l: Lic) => { setList(list.some(x => x.id === l.id) ? list.map(x => (x.id === l.id ? l : x)) : [...list, l]); setEd(null); toast(`Licencia ${l.num} guardada`); };
  const renew = async (l: Lic) => { const desde = estOf(l) === "ven" ? hoyISO() : l.vence; if (!(await confirm(`¿Renovar ${l.num} por ${valL(l.val)}? Vencería el ${dmy(addM(desde, l.val))}.`))) return;
    save({ ...l, desde, vence: addM(desde, l.val), rev: false, t: Date.now() }); };
  const revoke = async (l: Lic) => { if (await confirm(l.rev ? `¿Reactivar ${l.num}?` : `¿Revocar ${l.num} de ${l.ag}?`, { danger: !l.rev, ok: l.rev ? "Reactivar" : "Revocar" })) save({ ...l, rev: !l.rev, t: Date.now() }); };
  const del = async (l: Lic) => { if (await confirm(`¿Borrar la licencia ${l.num}? No se puede deshacer.`, { danger: true, ok: "Borrar" })) setList(list.filter(x => x.id !== l.id)); };
  const nueva = (): Lic => ({ id: uid(), ag: "", tipo: "drn", num: genNum("drn", list.map(x => x.num)), desde: hoyISO(), val: 6, vence: addM(hoyISO(), 6), por: me.n, t: Date.now() });
  /* por agente: qué licencias tiene cada uno */
  const byAg = useMemo(() => { const m = new Map<string, Lic[]>(); for (const l of list) m.set(l.ag, [...(m.get(l.ag) || []), l]); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")); }, [list]);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300"><BadgeCheck className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold">Licencias de vuelo</p><p className="text-xs text-slate-500">Drones y helicópteros del A.S.D. Las otorga la Coordinación.</p></div>
        <div className="flex flex-wrap gap-1.5 text-xs">{(["vig", "pv", "ven"] as Est[]).map(e => <button key={e} onClick={() => setEf(ef === e ? "all" : e)} className={cn("rounded-lg px-2.5 py-1 font-semibold transition", EST[e][1], ef === e && "ring-2 ring-current")}>{EST[e][0]} · {cnt(e)}</button>)}</div>
        {co && <Button icon={<Plus className="size-4" />} onClick={() => setEd(nueva())}>Nueva licencia</Button>}
      </Card>
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Segmented value={vw} onChange={setVw} options={[{ value: "lic", label: "Licencias" }, { value: "ag", label: "Por agente" }]} />
        <Segmented value={tf} onChange={setTf} options={[{ value: "all", label: "Todas" }, { value: "drn", label: "Drones" }, { value: "hel", label: "Helicópteros" }]} />
        <SearchInput className="min-w-[12rem] flex-1" value={q} onChange={setQ} placeholder="Buscar agente o número…" />
      </Card>
      {!list.length ? <Card><Empty icon={<BadgeCheck />} title="Todavía no hay licencias" desc={co ? "Tocá Nueva licencia para otorgar la primera." : "La Coordinación del A.S.D las va cargando."} /></Card>
        : vw === "ag" ? <Card className="divide-y divide-slate-100 dark:divide-slate-800">{byAg.filter(([n]) => !s || n.toLowerCase().includes(s)).map(([n, ls]) => { const a = findAgent(n); return (
            <div key={n} className="flex flex-wrap items-center gap-3 px-4 py-3"><Avatar n={n} size={36} /><div className="min-w-0 flex-1"><p className="font-semibold">{n}</p>{a && <RankBadge r={a.r} />}</div>
              <div className="flex flex-wrap gap-1.5">{(["drn", "hel"] as Tipo[]).filter(t => tf === "all" || tf === t).map(t => { const l = ls.filter(x => x.tipo === t).sort((x, y) => y.vence.localeCompare(x.vence))[0], e = l && estOf(l);
                return <span key={t} title={l ? `${l.num} · hasta el ${dmy(l.vence)}` : "Sin licencia"} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold", l ? EST[e!][1] + " border-transparent" : "border-dashed border-slate-300 text-slate-400 dark:border-slate-700")}>
                  {t === "hel" ? <Helicopter className="size-3.5" /> : <BadgeCheck className="size-3.5" />}Licencia {TIPO[t].l.toLowerCase()}{l ? ` · ${EST[e!][0].toLowerCase()}` : " · no tiene"}</span>; })}</div>
            </div>); })}</Card>
        : !vis.length ? <Card><Empty icon={<BadgeCheck />} title="Ninguna licencia con esos filtros" /></Card>
        : <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{vis.map(l => { const e = estOf(l), T = TIPO[l.tipo], a = findAgent(l.ag); return (
          <Card key={l.id} className={cn("overflow-hidden p-0", e === "rev" && "opacity-70")}>
            <div className="flex items-center gap-2 px-4 py-2 text-white" style={{ background: `linear-gradient(90deg, ${T.c}, ${T.c}b3)` }}>
              {l.tipo === "hel" ? <Helicopter className="size-4" /> : <BadgeCheck className="size-4" />}<b className="text-xs uppercase tracking-[.14em]">Licencia de {T.l.toLowerCase()}</b>
              <code className="ml-auto rounded bg-black/25 px-2 py-0.5 font-mono text-xs font-bold tracking-wider">{l.num}</code></div>
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3"><Avatar n={l.ag} size={40} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{l.ag}</p>{a && <RankBadge r={a.r} />}</div>
                <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-bold", EST[e][1])}>{EST[e][0]}</span></div>
              <div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-400">Desde</p><p className="font-semibold">{dmy(l.desde)}</p></div><div><p className="text-slate-400">Válida por</p><p className="font-semibold">{valL(l.val)}</p></div><div><p className="text-slate-400">Vence</p><p className="font-semibold">{dmy(l.vence)}</p></div></div>
              {l.tipo === "hel" && !!l.hab?.length && <div className="flex flex-wrap gap-1">{l.hab.map(h => <span key={h} className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">{h}</span>)}</div>}
              {l.tipo === "drn" && (l.serie || l.modelo) && <p className="text-xs text-slate-500">Drone: <span className="font-mono">{l.serie || "—"}</span>{l.modelo && ` · ${l.modelo}`}</p>}
              {l.nota && <p className="text-xs text-slate-500">{l.nota}</p>}
              <div className="flex items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-800"><span className="truncate">{l.por ? `Otorgada por ${l.por}` : ""}</span>
                {co && <span className="ml-auto flex gap-0.5">
                  <button title="Renovar" onClick={() => void renew(l)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-emerald-500 dark:hover:bg-slate-800"><RotateCcw className="size-4" /></button>
                  <button title={l.rev ? "Reactivar" : "Revocar"} onClick={() => void revoke(l)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"><Ban className="size-4" /></button>
                  <button title="Editar" onClick={() => setEd(l)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-brand-500 dark:hover:bg-slate-800"><Pencil className="size-4" /></button>
                  <button title="Borrar" onClick={() => void del(l)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"><Trash2 className="size-4" /></button></span>}</div>
            </div>
          </Card>); })}</div>}
      {ed && <LicModal l0={ed} used={list.filter(x => x.id !== ed.id).map(x => x.num)} isNew={!list.some(x => x.id === ed.id)} onClose={() => setEd(null)} onSave={save} />}
    </div>);
}

function LicModal({ l0, used, isNew, onClose, onSave }: { l0: Lic; used: string[]; isNew: boolean; onClose: () => void; onSave: (l: Lic) => void }) {
  const { toast } = useFeedback(), [l, setL] = useState<Lic>(l0);
  const up = (p: Partial<Lic>) => setL(x => { const y = { ...x, ...p }; if ("desde" in p || "val" in p) y.vence = addM(y.desde, y.val); return y; });
  const setTipo = (t: Tipo) => up({ tipo: t, num: l.num.startsWith(TIPO[t].pre) ? l.num : genNum(t, used) });
  const ok = () => {
    if (!l.ag || !findAgent(l.ag)) { toast("Elegí el agente", "err"); return; }
    if (!new RegExp(`^${TIPO[l.tipo].pre}[A-Z0-9]{4}$`).test(l.num)) { toast(`El número tiene que ser ${TIPO[l.tipo].pre}XXXX`, "err"); return; }
    if (used.includes(l.num)) { toast("Ese número ya está en otra licencia", "err"); return; }
    if (l.tipo === "drn" && !l.serie?.trim()) { toast("Poné el N° de serie del drone", "err"); return; }
    if (l.tipo === "hel" && !l.hab?.length) { toast("Elegí al menos una habilitación del helicóptero", "err"); return; }
    onSave({ ...l, serie: l.tipo === "drn" ? l.serie?.trim() : undefined, modelo: l.tipo === "drn" ? l.modelo?.trim() : undefined, hab: l.tipo === "hel" ? l.hab : undefined, t: Date.now() });
  };
  return (
    <Modal open onClose={onClose} title={isNew ? "Nueva licencia" : "Editar licencia"} icon={<BadgeCheck />} size="lg" desc="Air Support Division"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<BadgeCheck className="size-4" />} onClick={ok}>Guardar</Button></>}>
      <div className="space-y-4">
        <Field label="Agente *"><AgentCombo value={l.ag} onChange={n => up({ ag: n })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de licencia"><Segmented value={l.tipo} onChange={setTipo} options={[{ value: "drn", label: "Drones" }, { value: "hel", label: "Helicópteros" }]} /></Field>
          <Field label="N° de licencia"><div className="flex gap-2"><Input value={l.num} onChange={e => up({ num: e.target.value.toUpperCase().replace(/\s/g, "") })} className="font-mono tracking-wider" />
            <Button variant="outline" icon={<Dices className="size-4" />} title="Generar otro número" onClick={() => up({ num: genNum(l.tipo, used) })}>Generar</Button></div></Field>
        </div>
        <Field label="Válida por"><div className="flex flex-wrap gap-1.5">{VAL.map(([m, t]) => (
          <button key={m} type="button" onClick={() => up({ val: m })} className={cn("rounded-xl border px-3 py-1.5 text-sm font-semibold transition", l.val === m ? "border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}>{t}</button>))}</div></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Activa desde"><Input type="date" value={l.desde} onChange={e => up({ desde: e.target.value })} /></Field>
          <Field label="Vence"><div className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 text-sm dark:border-slate-700"><CalendarClock className="size-4 text-slate-400" /><b>{dmy(l.vence)}</b><span className="text-xs text-slate-500">({valL(l.val)})</span></div></Field>
        </div>
        {l.tipo === "drn" ? <div className="grid gap-4 sm:grid-cols-2">
            <Field label="N° de serie del drone *"><Input value={l.serie || ""} onChange={e => up({ serie: e.target.value.toUpperCase() })} className="font-mono" placeholder="POL-DRN-…" /></Field>
            <Field label="Modelo del drone"><Input value={l.modelo || ""} onChange={e => up({ modelo: e.target.value })} placeholder="Modelo policial" /></Field></div>
          : <Field label="Habilitaciones del helicóptero *"><div className="flex flex-wrap gap-1.5">{HAB.map(h => { const on = !!l.hab?.includes(h); return (
            <button key={h} type="button" onClick={() => up({ hab: on ? (l.hab || []).filter(x => x !== h) : [...(l.hab || []), h] })} className={cn("rounded-xl border px-3 py-1.5 text-sm transition", on ? "border-amber-500 bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-200" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")}>{h}</button>); })}</div></Field>}
        <Field label="Otorgada por"><AgentCombo value={l.por || ""} onChange={n => up({ por: n })} /></Field>
        <Field label="Observaciones" hint="(opcional)"><Textarea rows={3} value={l.nota || ""} onChange={e => up({ nota: e.target.value })} /></Field>
        {!isNew && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Users className="size-3.5" />Para revocarla o renovarla usá los botones de la tarjeta.</p>}
      </div>
    </Modal>);
}
