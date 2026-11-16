/* Reuniones colaborativas (Supervisores): se abre una reunión desde una plantilla (Briefing, Reunión de sargentos,
   Reunión PO III y III+ o libre) y cada uno carga lo que tiene para decir en cada tema.
   Lo de los demás queda oculto hasta que envías tu opinión (así nadie se condiciona). Quien la abre puede escribir el acta y cerrarla.
   Índice en lspdt.reuniones; el aporte de cada uno en su propia clave (lspdt.reu.<id>.<agente>) para que nadie pise a nadie. */
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, EyeOff, Lock, LockOpen, Plus, Send, Trash2, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Textarea } from "@/components/ui";
import { Avatar } from "@/components/agents";
import { DiscordOutput } from "@/components/output";
import { Revisar, fixSpell } from "@/components/revisar";
import { useFeedback } from "@/components/feedback";
import { dmyToISO, hoyISO, isoToDMY, maskDMY, norm, uid } from "@/lib/domain";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

type Reu = { id: string; tpl: string; t: string; f: string; by: string; at: number; secs: string[]; closed?: boolean; acta?: string };
type Ap = { n: string; at: number; s: Record<string, string> };
const IDX = "lspdt.reuniones", apKey = (id: string, n: string) => `lspdt.reu.${id}.${norm(n).replace(/[^a-z0-9]/g, "")}`;
const TPL: Record<string, { l: string; c: string; d: string; secs: string[] }> = {
  brief: { l: "Briefing", c: "#3b82f6", d: "Antes del servicio: novedades, situación y objetivos", secs: ["Novedades del turno", "Situación y alerta táctica", "Objetivos del servicio", "Asignación de unidades", "Recordatorios"] },
  sgt: { l: "Reunión de sargentos", c: "#ec4899", d: "Ascensos, seguimiento de agentes, coordinación y normativa", secs: ["Ascensos", "Ascensos futuros (en valoración)", "Vigilancia", "Coordinación con otros departamentos", "Registro de patrullas", "Usos de la fuerza", "Normativa y MDP", "Otros temas"] },
  po3: { l: "Reunión PO III y III+", c: "#10b981", d: "Oficiales de referencia: patrulla, apoyo a la supervisión y formación", secs: ["Desempeño de los patrulleros", "Apoyo a la supervisión", "Formación e instrucciones", "Propuestas", "Dudas"] },
  libre: { l: "Libre", c: "#64748b", d: "Temas a elección", secs: ["Temas"] },
};
const dmy = (iso: string) => isoToDMY(iso) || iso;

/* acta de la reunión de sargentos del 15/11/2026 (la primera, para tenerla a mano) */
const SEED: Reu = { id: "sgt-20261115", tpl: "sgt", t: "Reunión de sargentos", f: "2026-11-15", by: "Ryan Westbrook", at: Date.UTC(2026, 10, 15, 23), secs: TPL.sgt.secs, closed: true, acta: [
  "## Ascensos", "Los últimos propuestos se revisan con la base de datos. Cuando se cargue el roster nuevo, si hay cambios, los actualizan Jefatura y Capitanía. Ryan Westbrook no interviene en esto.", "",
  "## Ascensos futuros (en valoración)",
  "- **Alexander Schneider:** esperar la resolución de la PSB y ver la proyección quincenal.",
  "- **Morvanna Montenegro:** citarla y comentarle su actitud; ver la proyección quincenal.",
  "- **Leonardo Nascimento:** citarlo y comentarle lo de sus nervios; ver la proyección quincenal.",
  "- **Elioth Smith:** citarlo e informarle que debe destacar para ascender; ver la proyección quincenal.",
  "- **Naia Bishop:** citarla e informarle que debe destacar para ascender; ver la proyección quincenal.",
  "- **Violet Faith:** esperar la resolución de la PSB y ver la proyección quincenal. **No es necesario citarla.**", "",
  "## Vigilancia", "- Ryan Sullivan", "- CJ Smith", "",
  "## SAED", "Para comunicarse con el SAED durante un TAC, el segundo al mando del TAC deberá entrar en una frecuencia conjunta para tener más información.", "",
  "## Personas suspendidas", "Las personas suspendidas se muestran en la tablet; en la medida de lo posible, se avisará igualmente.", "",
  "## SAHP", "Ante un accidente de tráfico, se deberá contactar con algún miembro del SAHP.", "",
  "## Registro de patrullas", "Acelerar el registro de las patrullas para comprobar que lleven todo lo que dicta el MDP.", "",
  "## Usos de la fuerza", "Si hay un homicidio, se debe completar el feedback correspondiente y enviarlo directamente a la PSB. El agente queda suspendido de patrullaje, sin poder usar el arma reglamentaria, y solo podrá hacer trabajo administrativo.", "",
  "## Información falsa", "No dar información falsa: lo correcto es lo que dice el MDP. Ante la duda, consultar el MDP.",
].join("\n") };

const apsOf = (id: string) => LS.keys(`lspdt.reu.${id}.`).map(k => LS.ro<Ap | null>(k, null)).filter(Boolean) as Ap[];

export function Reuniones() {
  useStoreVersion();
  const me = useMe(), [L, setL] = useJSON<Reu[]>(IDX, []), [sel, setSel] = useState(""), [nueva, setNueva] = useState(false);
  /* la primera reunión (acta del 15/11) se agrega una sola vez */
  useEffect(() => { if (!LS.get("lspdt.reuSeed") && !L.some(x => x.id === SEED.id)) { setL([SEED, ...L]); LS.set("lspdt.reuSeed", "1"); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = L.find(x => x.id === sel);
  if (cur) return <Detalle r={cur} onBack={() => setSel("")} onSave={r => setL(L.map(x => (x.id === r.id ? r : x)))} onDel={() => { apsOf(cur.id).forEach(a => LS.del(apKey(cur.id, a.n))); setL(L.filter(x => x.id !== cur.id)); setSel(""); }} />;
  const S = L.slice().sort((a, b) => b.f.localeCompare(a.f) || b.at - a.at);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Users className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Reuniones colaborativas</p><p className="text-[12.5px] text-slate-500">Cada uno carga lo suyo. Lo de los demás se ve recién cuando enviás tu opinión.</p></div>
        <Button icon={<Plus />} onClick={() => setNueva(!nueva)}>Nueva reunión</Button>
      </Card>
      {nueva && <Nueva onCreate={r => { setL([r, ...L]); setNueva(false); setSel(r.id); }} />}
      {!S.length ? <Card><Empty icon={<ClipboardList />} title="Todavía no hay reuniones" desc="Abrí una desde una plantilla con «Nueva reunión»." /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{S.map(r => { const T = TPL[r.tpl] || TPL.libre, A = apsOf(r.id), mine = A.some(a => a.n === me.n); return (
          <button key={r.id} onClick={() => setSel(r.id)} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: T.c }} />
            <span className="flex items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: T.c + "1f", color: T.c }}>{T.l}</span>
              <span className="ml-auto text-[11.5px] tabular-nums text-slate-400">{dmy(r.f)}</span></span>
            <b className="mt-2 block truncate text-[15px]">{r.t}</b>
            <span className="mt-0.5 block text-[12px] text-slate-500">Abierta por {r.by} · {r.secs.length} temas</span>
            <span className="mt-3 flex items-center gap-2">
              <span className="flex -space-x-2">{A.slice(0, 5).map(a => <span key={a.n} className="rounded-full ring-2 ring-white dark:ring-slate-900"><Avatar n={a.n} size={24} /></span>)}</span>
              <span className="text-[11.5px] text-slate-500">{A.length ? `${A.length} aporte${A.length > 1 ? "s" : ""}` : "Sin aportes"}</span>
              <span className="ml-auto">{r.closed ? <Badge c="#64748b" I={Lock} t="Cerrada" /> : mine ? <Badge c="#10b981" I={CheckCircle2} t="Opinaste" /> : <Badge c="#f59e0b" I={EyeOff} t="Falta tu opinión" />}</span>
            </span>
          </button>); })}</div>)}
    </div>);
}
const Badge = ({ c, I, t }: { c: string; I: typeof Lock; t: string }) => <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: c + "1c", color: c }}><I className="size-3" />{t}</span>;

function Nueva({ onCreate }: { onCreate: (r: Reu) => void }) {
  const me = useMe(), { toast } = useFeedback(), [tpl, setTpl] = useState("sgt"), [t, setT] = useState(TPL.sgt.l), [fd, setFd] = useState(isoToDMY(hoyISO())), [secs, setSecs] = useState(TPL.sgt.secs.join("\n"));
  const pick = (k: string) => { if (!t.trim() || Object.values(TPL).some(x => x.l === t)) setT(TPL[k].l); setTpl(k); setSecs(TPL[k].secs.join("\n")); };
  return (
    <Card>
      <CardHeader icon={<Plus />} title="Nueva reunión" desc="Elegí la plantilla; los temas se pueden ajustar." />
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(TPL).map(([k, x]) => (
          <button key={k} type="button" onClick={() => pick(k)} className={cn("rounded-xl border p-3 text-left transition", tpl === k ? "shadow-sm" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}
            style={tpl === k ? { borderColor: x.c, background: x.c + "14" } : undefined}>
            <b className="block text-[13px]" style={tpl === k ? { color: x.c } : undefined}>{x.l}</b><span className="mt-0.5 block text-[11.5px] text-slate-500">{x.d}</span></button>))}</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field label="Título"><Input value={t} onChange={e => setT(e.target.value)} /></Field>
          <Field label="Fecha"><Input value={fd} onChange={e => setFd(maskDMY(e.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" /></Field>
        </div>
        <Field label="Temas" hint="(uno por línea)"><Textarea rows={5} value={secs} onChange={e => setSecs(e.target.value)} /></Field>
        <div className="flex justify-end"><Button icon={<CheckCircle2 />} onClick={() => {
          const f = dmyToISO(fd.trim()), S = secs.split("\n").map(x => x.trim()).filter(Boolean);
          if (!t.trim() || !f || !S.length) { toast("Falta el título, una fecha válida o los temas", "err"); return; }
          onCreate({ id: uid(), tpl, t: t.trim(), f, by: me.n, at: Date.now(), secs: S }); toast("Reunión abierta: cargá tu opinión");
        }}>Abrir reunión</Button></div>
      </CardBody>
    </Card>);
}

function Detalle({ r, onBack, onSave, onDel }: { r: Reu; onBack: () => void; onSave: (r: Reu) => void; onDel: () => void }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), T = TPL[r.tpl] || TPL.libre, A = apsOf(r.id), mine = A.find(a => a.n === me.n);
  const [edit, setEdit] = useState(!mine && !r.closed), [s, setS] = useState<Record<string, string>>(mine?.s || {}), [acta, setActa] = useState(r.acta || "");
  const boss = r.by === me.n || me.l >= 7 || me.admin, see = !!mine || !!r.closed;
  const myTxt = r.secs.filter(x => s[x]?.trim()).map(x => `**${x}:** ${s[x].trim()}`).join("\n");
  const send = () => { const c = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    if (!Object.keys(c).length) { toast("Escribí al menos un tema", "err"); return; }
    LS.setJSON(apKey(r.id, me.n), { n: me.n, at: Date.now(), s: c }); setEdit(false); toast(mine ? "Aporte actualizado" : "Opinión enviada · ya podés ver la de los demás"); };
  const out = [`# 📋 ${r.t} · ${dmy(r.f)}`, `-# ${T.l} · abierta por ${r.by}${A.length ? ` · aportes de ${A.map(a => a.n).join(", ")}` : ""}`, "",
    ...(r.acta?.trim() ? [r.acta.trim(), ""] : []),
    ...(A.length ? ["## 🗣️ Aportes", ...r.secs.flatMap(x => { const v = A.filter(a => a.s[x]); return v.length ? [`### ${x}`, ...v.map(a => `- **${a.n}:** ${a.s[x]}`), ""] : []; })] : []),
  ].join("\n").trim();
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: T.c }} />
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={onBack}>Reuniones</Button>
          <div className="min-w-0 flex-1"><p className="flex items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: T.c + "1f", color: T.c }}>{T.l}</span>{r.closed && <Badge c="#64748b" I={Lock} t="Cerrada" />}</p>
            <h2 className="mt-1 truncate text-lg font-bold">{r.t}</h2><p className="text-[12px] text-slate-500">{dmy(r.f)} · abierta por {r.by}</p></div>
          <span className="flex items-center gap-2"><span className="flex -space-x-2">{A.map(a => <span key={a.n} title={a.n} className="rounded-full ring-2 ring-white dark:ring-slate-900"><Avatar n={a.n} size={28} /></span>)}</span>
            <span className="text-[12px] text-slate-500">{A.length} aporte{A.length === 1 ? "" : "s"}</span></span>
          {boss && <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={async () => { if (await confirm(`¿Borrar «${r.t}» con todos sus aportes?`, { danger: true, ok: "Borrar" })) onDel(); }}>Borrar</Button>}
        </div>
      </Card>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {r.acta?.trim() && !boss && <Card><CardHeader icon={<ClipboardList />} title="Acta" /><CardBody><pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{r.acta}</pre></CardBody></Card>}
          {!r.closed && (edit ? (
            <Card>
              <CardHeader icon={<Send />} title={mine ? "Editar mi aporte" : "Mi opinión"} desc={mine ? undefined : "Lo de los demás se desbloquea cuando la envíes."} />
              <CardBody>
                {r.secs.map(x => <Field key={x} label={x}><Textarea rows={2} value={s[x] || ""} onChange={e => setS(o => ({ ...o, [x]: e.target.value }))} placeholder="Lo que tengas para decir (o dejalo vacío)…" /></Field>)}
                <Revisar text={myTxt} onFix={() => setS(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fixSpell(v)])))} />
                <div className="flex justify-end gap-2">{mine && <Button variant="ghost" onClick={() => { setS(mine.s); setEdit(false); }}>Cancelar</Button>}<Button icon={<Send />} onClick={send}>{mine ? "Guardar cambios" : "Enviar mi opinión"}</Button></div>
              </CardBody>
            </Card>) : mine && <Card className="flex flex-wrap items-center gap-3 p-3"><CheckCircle2 className="size-5 text-emerald-500" /><p className="flex-1 text-[13px]">Ya enviaste tu opinión.</p><Button size="sm" variant="outline" onClick={() => setEdit(true)}>Editar mi aporte</Button></Card>)}
          {!see ? (
            <Card className="relative overflow-hidden p-6 text-center">
              <div className="pointer-events-none absolute inset-0 select-none p-6 opacity-40 blur-[6px]" aria-hidden>{r.secs.slice(0, 4).map(x => <p key={x} className="mb-3 h-3 rounded bg-slate-300 dark:bg-slate-700" />)}</div>
              <div className="relative"><Lock className="mx-auto size-7 text-slate-400" /><p className="mt-2 font-semibold">{A.length ? `${A.length} aporte${A.length > 1 ? "s" : ""} oculto${A.length > 1 ? "s" : ""}` : "Todavía nadie opinó"}</p>
                <p className="mt-1 text-[12.5px] text-slate-500">Enviá tu opinión para ver lo que dijeron los demás.</p></div>
            </Card>
          ) : r.secs.map(x => { const v = A.filter(a => a.s[x]); if (!v.length && (r.closed || !A.length)) return null; return (
            <Card key={x}><CardHeader icon={<LockOpen />} title={x} desc={v.length ? `${v.length} aporte${v.length > 1 ? "s" : ""}` : "Sin aportes"} />
              {v.length > 0 && <ul className="divide-y divide-slate-100 dark:divide-slate-800">{v.map(a => (
                <li key={a.n} className="flex gap-3 px-5 py-3"><Avatar n={a.n} size={30} /><div className="min-w-0 flex-1"><b className="text-[12.5px]">{a.n}{a.n === me.n && <span className="ml-1.5 rounded bg-brand-500/15 px-1 text-[9.5px] font-bold uppercase text-brand-600 dark:text-brand-300">Vos</span>}</b>
                  <p className="whitespace-pre-wrap text-[13px] text-slate-700 dark:text-slate-200">{a.s[x]}</p></div></li>))}</ul>}
            </Card>); })}
        </div>
        <div className="space-y-4 lg:sticky lg:top-32">
          {boss && <Card>
            <CardHeader icon={<ClipboardList />} title="Acta / resumen" desc="Lo que se resolvió. Al cerrar la reunión, todos ven los aportes." />
            <CardBody>
              <Textarea rows={8} value={acta} onChange={e => setActa(e.target.value)} placeholder={"## Tema\n- Lo que se resolvió…"} />
              <Revisar text={acta} onFix={setActa} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => { onSave({ ...r, acta }); toast("Acta guardada"); }}>Guardar acta</Button>
                <Button variant={r.closed ? "outline" : "primary"} icon={r.closed ? <LockOpen /> : <Lock />} onClick={() => { onSave({ ...r, acta, closed: !r.closed }); toast(r.closed ? "Reunión reabierta" : "Reunión cerrada"); }}>{r.closed ? "Reabrir" : "Cerrar reunión"}</Button>
              </div>
            </CardBody>
          </Card>}
          {see && <DiscordOutput title={`${r.t} · ${dmy(r.f)}`} text={out} sticky={false} />}
        </div>
      </div>
    </div>);
}
