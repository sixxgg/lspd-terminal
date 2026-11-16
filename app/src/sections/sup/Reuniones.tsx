/* Reuniones colaborativas (Supervisores): como un incidente de la tablet donde todos meten mano.
   Se abre desde una plantilla (Briefing, Reunión de sargentos, Reunión PO III y III+ o libre) que trae los temas iniciales.
   Cualquiera agrega partes en texto libre (pegar desde Discord, Notion o Docs mantiene el formato), con o sin tema,
   y cada parte queda firmada con su autor y la hora. Quien la abre escribe el acta y la cierra.
   Índice en lspdt.reuniones; cada parte en su propia clave (lspdt.reu.<id>.e.<parte>) para que nadie pise a nadie.
   Los aportes del formato anterior (lspdt.reu.<id>.<agente>) se muestran como partes. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Link2, CheckCircle2, ChevronDown, ChevronUp, X, ClipboardList, FileText, Hash, Lock, LockOpen, MessageSquarePlus, Pencil, Plus, Send, Trash2, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input } from "@/components/ui";
import { AgentPicker, Avatar } from "@/components/agents";
import { DiscordOutput } from "@/components/output";
import { RichEditor, type RichRef } from "@/components/richedit";
import { useFeedback } from "@/components/feedback";
import { dmyToISO, findAgent, genderOf, getRoster, lvl, fullDT, hoyISO, isoToDMY, maskDMY, norm, RANK_COLOR, rankES, uid } from "@/lib/domain";
import { htmlToDc, mdToHtml, richOf, safeHtml } from "@/lib/richtext";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { JUMP, useJump } from "@/lib/jump";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";

type Reu = { id: string; tpl: string; t: string; f: string; h?: string; by: string; enc?: string[]; pres?: string[]; at: number; secs: string[]; closed?: boolean; acta?: string };
type Ap = { n: string; at: number; s: Record<string, string> };
/* parte del documento: autor, hora, tema (opcional) y texto con formato */
type Part = { id: string; n: string; at: number; html: string; tema?: string; ed?: number };
const IDX = "lspdt.reuniones", pKey = (id: string, pid: string) => `lspdt.reu.${id}.e.${pid}`;
const TPL: Record<string, { l: string; c: string; d: string; secs: string[] }> = {
  brief: { l: "Briefing", c: "#3b82f6", d: "Antes del servicio: novedades, situación y objetivos", secs: ["Novedades del turno", "Situación y alerta táctica", "Objetivos del servicio", "Asignación de unidades", "Recordatorios"] },
  sgt: { l: "Reunión de sargentos", c: "#ec4899", d: "Ascensos, seguimiento de agentes, coordinación y normativa", secs: ["Ascensos", "Ascensos futuros (en valoración)", "Vigilancia", "Coordinación con otros departamentos", "Registro de patrullas", "Usos de la fuerza", "Normativa y MDP", "Otros temas"] },
  po3: { l: "Reunión PO III y III+", c: "#10b981", d: "Oficiales de referencia: patrulla, apoyo a la supervisión y formación", secs: ["Desempeño de los patrulleros", "Apoyo a la supervisión", "Formación e instrucciones", "Propuestas", "Dudas"] },
  libre: { l: "Libre", c: "#64748b", d: "Temas a elección", secs: ["Temas"] },
};
/* quienes encabezan: la capitanía (obligatoria) y la Assistant Watch Commander; el resto se suma a mano */
const AWC = "Evelyn Molina";
const encDef = () => [...getRoster().filter(a => a.r === "Captain").map(a => a.n), ...(findAgent(AWC) ? [AWC] : [])];
const roleOf = (n: string) => { const a = findAgent(n); if (a?.r === "Captain") return genderOf(n) === "f" ? { l: "Capitana", must: "obligatoria" } : { l: "Capitán", must: "obligatorio" };
  if (norm(n) === norm(AWC)) return { l: "Assistant Watch Commander", must: "" }; return { l: rankES(a?.r || ""), must: "" }; };
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

/* todas las partes de una reunión (las nuevas y las del formato anterior), en orden */
function partsOf(id: string): (Part & { k: string })[] {
  const out: (Part & { k: string })[] = [];
  for (const k of LS.keys(`lspdt.reu.${id}.`)) {
    if (k.includes(".e.")) { const p = LS.ro<Part | null>(k, null); if (p) out.push({ ...p, k }); continue; }
    const a = LS.ro<Ap | null>(k, null); if (a?.s) Object.entries(a.s).forEach(([t, v], i) => v && out.push({ id: `${k}:${i}`, k, n: a.n, at: a.at + i, html: richOf(v), tema: t === "Otros temas que traigo" ? "" : t }));
  }
  return out.sort((a, b) => a.at - b.at);
}
const whoOf = (L: Part[]) => [...new Set(L.map(p => p.n))];

export function Reuniones() {
  useStoreVersion();
  const [L, setL] = useJSON<Reu[]>(IDX, []), [sel, setSel] = useState(""), [nueva, setNueva] = useState(false);
  /* la primera reunión (acta del 15/11) se agrega una sola vez */
  useEffect(() => { if (!LS.get("lspdt.reuSeed") && !L.some(x => x.id === SEED.id)) { setL([SEED, ...L]); LS.set("lspdt.reuSeed", "1"); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const j = JUMP.reu; if (j) { JUMP.reu = undefined; setSel(j); } }, []);
  useJump("reu", setSel);
  const cur = L.find(x => x.id === sel);
  if (cur) return <Detalle r={cur} onBack={() => setSel("")} onSave={r => setL(L.map(x => (x.id === r.id ? r : x)))} onDel={() => { LS.keys(`lspdt.reu.${cur.id}.`).forEach(k => LS.del(k)); setL(L.filter(x => x.id !== cur.id)); setSel(""); }} />;
  const S = L.slice().sort((a, b) => b.f.localeCompare(a.f) || b.at - a.at);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Users className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Reuniones colaborativas</p><p className="text-[12.5px] text-slate-500">Un documento abierto para todos: cada uno suma lo suyo (se puede pegar con formato) y queda firmado con su nombre.</p></div>
        <Button icon={<Plus />} onClick={() => setNueva(!nueva)}>Nueva reunión</Button>
      </Card>
      {nueva && <Nueva onCreate={r => { setL([r, ...L]); setNueva(false); setSel(r.id); }} />}
      {!S.length ? <Card><Empty icon={<ClipboardList />} title="Todavía no hay reuniones" desc="Abrí una desde una plantilla con «Nueva reunión»." /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{S.map(r => { const T = TPL[r.tpl] || TPL.libre, P = partsOf(r.id), W = whoOf(P), last = P[P.length - 1]; return (
          <button key={r.id} onClick={() => setSel(r.id)} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: T.c }} />
            <span className="flex items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: T.c + "1f", color: T.c }}>{T.l}</span>
              {r.closed && <Badge c="#64748b" I={Lock} t="Cerrada" />}<span className="ml-auto text-[11.5px] tabular-nums text-slate-400">{dmy(r.f)}{r.h ? ` · ${r.h}` : ""}</span></span>
            <b className="mt-2 block truncate text-[15px]">{r.t}</b>
            <span className="mt-0.5 block text-[12px] text-slate-500">Abierta por {r.by} · {r.secs.length} temas{r.acta?.trim() ? " · con acta" : ""}</span>
            <span className="mt-3 flex items-center gap-2">
              <span className="flex -space-x-2">{W.slice(0, 5).map(n => <span key={n} className="rounded-full ring-2 ring-white dark:ring-slate-900"><Avatar n={n} size={24} /></span>)}</span>
              <span className="min-w-0 truncate text-[11.5px] text-slate-500">{P.length ? `${P.length} parte${P.length > 1 ? "s" : ""} · última de ${last.n}` : "Todavía sin partes"}</span>
            </span>
          </button>); })}</div>)}
    </div>);
}
const Badge = ({ c, I, t }: { c: string; I: typeof Lock; t: string }) => <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: c + "1c", color: c }}><I className="size-3" />{t}</span>;

function Nueva({ onCreate }: { onCreate: (r: Reu) => void }) {
  const me = useMe(), { toast } = useFeedback(), [hh, setHh] = useState("22:00"), [tpl, setTpl] = useState("sgt"), [t, setT] = useState(TPL.sgt.l), [fd, setFd] = useState(isoToDMY(hoyISO())), [secs, setSecs] = useState<string[]>(TPL.sgt.secs);
  const pick = (k: string) => { if (!t.trim() || Object.values(TPL).some(x => x.l === t)) setT(TPL[k].l); setTpl(k); setSecs(TPL[k].secs); };
  return (
    <Card>
      <CardHeader icon={<Plus />} title="Nueva reunión" desc="Elegí la plantilla; los temas se pueden ajustar." />
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(TPL).map(([k, x]) => (
          <button key={k} type="button" onClick={() => pick(k)} className={cn("rounded-xl border p-3 text-left transition", tpl === k ? "shadow-sm" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}
            style={tpl === k ? { borderColor: x.c, background: x.c + "14" } : undefined}>
            <b className="block text-[13px]" style={tpl === k ? { color: x.c } : undefined}>{x.l}</b><span className="mt-0.5 block text-[11.5px] text-slate-500">{x.d}</span></button>))}</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem_7rem]">
          <Field label="Título"><Input value={t} onChange={e => setT(e.target.value)} maxLength={80} /></Field>
          <Field label="Fecha"><Input value={fd} onChange={e => setFd(maskDMY(e.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" /></Field>
          <Field label="Hora"><Input type="time" value={hh} onChange={e => setHh(e.target.value)} /></Field>
        </div>
        <p className="-mt-1 flex items-center gap-1.5 text-[11.5px] text-slate-500"><CalendarDays className="size-3.5" />Se agrega sola al calendario y les llega la notificación a los supervisores{tpl === "po3" ? " y a los PO III / III+" : ""}.</p>
        <Field label={`Temas · ${secs.length}`} hint="(los de la plantilla; sumá los que falten)"><Temas list={secs} base={TPL[tpl].secs} onChange={setSecs} /></Field>
        <div className="flex justify-end"><Button icon={<CheckCircle2 />} onClick={() => {
          const f = dmyToISO(fd.trim()), S = secs;
          if (!t.trim() || !f || !S.length) { toast("Falta el título, una fecha válida o los temas", "err"); return; }
          onCreate({ id: uid(), tpl, t: t.trim(), f, ...(hh ? { h: hh } : {}), enc: encDef(), pres: [], by: me.n, at: Date.now(), secs: S }); toast("Reunión abierta · ya está en el calendario y se avisó a todos");
        }}>Abrir reunión</Button></div>
      </CardBody>
    </Card>);
}

/* lista de temas: los de la plantilla numerados, se reordenan o quitan, y abajo se suman los que hayan quedado afuera */
function Temas({ list, base, onChange }: { list: string[]; base: string[]; onChange: (l: string[]) => void }) {
  const [x, setX] = useState(""), add = () => { const t = x.trim().replace(/\s+/g, " "); if (!t) return; if (list.some(y => norm(y) === norm(t))) { setX(""); return; } onChange([...list, t.charAt(0).toUpperCase() + t.slice(1)]); setX(""); };
  const mv = (i: number, d: number) => { const L = list.slice(), j = i + d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; onChange(L); };
  const changed = list.join("|") !== base.join("|");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <ol className="divide-y divide-slate-100 dark:divide-slate-800">{list.map((t, i) => { const nuevo = !base.includes(t); return (
        <li key={t} className="group flex items-center gap-2.5 px-3 py-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-500 dark:bg-slate-800">{i + 1}</span>
          <span title={t} className="min-w-0 flex-1 truncate text-[13px] font-medium">{t}</span>
          {nuevo && <span className="rounded-full bg-emerald-500/12 px-1.5 py-px text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Agregado</span>}
          <span className="flex items-center opacity-60 transition group-hover:opacity-100">
            <button type="button" aria-label="Subir" disabled={!i} onClick={() => mv(i, -1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"><ChevronUp className="size-4" /></button>
            <button type="button" aria-label="Bajar" disabled={i === list.length - 1} onClick={() => mv(i, 1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"><ChevronDown className="size-4" /></button>
            <button type="button" aria-label={`Quitar «${t}»`} disabled={list.length < 2} onClick={() => onChange(list.filter(y => y !== t))} className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"><X className="size-4" /></button></span>
        </li>); })}</ol>
      <div className="flex items-center gap-2 border-t border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
        <Plus className="size-4 shrink-0 text-slate-400" />
        <input value={x} onChange={e => setX(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Agregar un tema que haya quedado afuera… (título corto)" maxLength={60} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
        {x.trim() ? <Button size="sm" onClick={add}>Agregar</Button> : changed && <button type="button" onClick={() => onChange(base)} className="text-[11.5px] font-semibold text-slate-400 hover:text-brand-600">Volver a la plantilla</button>}
      </div>
    </div>);
}

function Detalle({ r, onBack, onSave, onDel }: { r: Reu; onBack: () => void; onSave: (r: Reu) => void; onDel: () => void }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), T = TPL[r.tpl] || TPL.libre, P = partsOf(r.id), W = whoOf(P);
  const boss = r.by === me.n || me.l >= 7 || me.admin;
  const [tema, setTema] = useState(""), [f, setF] = useState(""), [nt, setNt] = useState(""), [edit, setEdit] = useState(""), [actaEd, setActaEd] = useState(false), [acta, setActa] = useState(r.acta || "");
  const ed = useRef<RichRef>(null), [kEd, setKEd] = useState(0), DK = `lspdt.next.reuDraft.${r.id}`;
  const draft = () => { try { return localStorage.getItem(DK) || ""; } catch { return ""; } };
  const [empty, setEmpty] = useState(() => !draft());
  const cnt = (t: string) => P.filter(p => (p.tema || "") === t).length;
  const V = f === "" ? P : P.filter(p => (p.tema || "") === (f === "__" ? "" : f));
  const publish = () => { const el = ed.current?.el; if (!el || ed.current?.empty()) { toast("Escribí o pegá algo primero", "err"); return; }
    const id = uid(); LS.setJSON(pKey(r.id, id), { id, n: me.n, at: Date.now(), html: safeHtml(el.innerHTML), ...(tema ? { tema } : {}) } satisfies Part);
    try { localStorage.removeItem(DK); } catch { /* */ } ed.current?.clear(); setKEd(k => k + 1); setEmpty(true); toast("Parte agregada a la reunión"); };
  const addTema = () => { const t = nt.trim().replace(/\s+/g, " "); if (!t) return; if (t.length > 60) { toast("Un tema es un título corto (hasta 60 letras). El texto largo va como parte, en el cuadro de abajo.", "err"); return; } if (r.secs.some(x => norm(x) === norm(t))) { setTema(r.secs.find(x => norm(x) === norm(t))!); setNt(""); return; }
    const T2 = t.charAt(0).toUpperCase() + t.slice(1); onSave({ ...r, secs: [...r.secs, T2] }); setTema(T2); setNt(""); toast(`Tema «${T2}» agregado`); };
  /* documento para copiar: acta, después las partes por tema (en el orden de la reunión) y al final las generales */
  const out = useMemo(() => { const grp = [...r.secs, ""].map(t => [t, P.filter(p => (p.tema || "") === t)] as const).filter(([, L]) => L.length);
    const E = r.enc || encDef();
    return [`# 📋 ${r.t} · ${dmy(r.f)}${r.h ? ` · ${r.h} h` : ""}`, `-# ${T.l} · abierta por ${r.by}${W.length ? ` · aportaron ${W.join(", ")}` : ""}`, "",
      ...(E.length ? [`**Encabezan:** ${E.map(n => `${n} (${roleOf(n).l})`).join(", ")}`] : []), ...(r.pres?.length ? [`**Presentes:** ${r.pres.join(", ")}`] : []), ...(E.length || r.pres?.length ? [""] : []),
      ...(r.acta?.trim() ? ["## 🗒️ Acta", htmlToDc(mdToHtml(r.acta)), ""] : []),
      ...grp.flatMap(([t, L]) => [`## ${t || "General"}`, ...L.flatMap(p => [`**${p.n}** · <t:${Math.floor(p.at / 1000)}:f>`, htmlToDc(p.html), ""])]),
    ].join("\n").replace(/\n{3,}/g, "\n\n").trim(); }, [r, P, W, T]);
  const chip = (k: string, l: string, n: number, on: boolean, onClick: () => void, del?: () => void) => (
    <span key={k || "_"} className={cn("inline-flex max-w-[16rem] items-center rounded-full border text-[12px] font-semibold transition", on ? "border-transparent text-white" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700")} style={on ? { background: T.c } : undefined}>
      <button type="button" onClick={onClick} title={l} className="inline-flex min-w-0 items-center gap-1 py-1 pl-2.5 pr-2.5"><span className="truncate">{l}</span>{n > 0 && <span className={cn("shrink-0 rounded-full px-1.5 text-[10px] tabular-nums", on ? "bg-white/25" : "bg-slate-100 dark:bg-slate-800")}>{n}</span>}</button>
      {del && <button type="button" aria-label={`Quitar el tema «${l}»`} onClick={del} className="-ml-1.5 mr-1 rounded-full p-0.5 opacity-60 hover:bg-red-500/15 hover:text-red-500 hover:opacity-100"><X className="size-3" /></button>}
    </span>);
  const [temasEd, setTemasEd] = useState(false);
  const delTema = async (t: string) => { if (!(await confirm(`¿Quitar el tema «${t.length > 60 ? t.slice(0, 60) + "…" : t}»?${cnt(t) ? ` Sus ${cnt(t)} parte(s) pasan a General.` : ""}`, { danger: true, ok: "Quitar" }))) return;
    P.filter(p => p.tema === t && p.k.includes(".e.")).forEach(p => LS.setJSON(p.k, { id: p.id, n: p.n, at: p.at, html: p.html, ed: p.ed })); onSave({ ...r, secs: r.secs.filter(x => x !== t) }); if (f === t) setF(""); };
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: T.c }} />
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={onBack}>Reuniones</Button>
          <div className="min-w-0 flex-1"><p className="flex items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: T.c + "1f", color: T.c }}>{T.l}</span>{r.closed && <Badge c="#64748b" I={Lock} t="Cerrada" />}</p>
            <h2 className="mt-1 truncate text-lg font-bold">{r.t}</h2><p className="text-[12px] text-slate-500">{dmy(r.f)}{r.h ? ` · ${r.h} h` : ""} · abierta por {r.by} · {P.length} parte{P.length === 1 ? "" : "s"}</p></div>
          <span className="flex -space-x-2">{W.map(n => <span key={n} title={n} className="rounded-full ring-2 ring-white dark:ring-slate-900"><Avatar n={n} size={28} /></span>)}</span>
          <Button size="sm" variant="ghost" icon={<Link2 />} title="Copiar el link de esta reunión para pasarlo a otros sargentos" onClick={() => { const u = `${location.origin}/next/?ir=reu:${r.id}`; void navigator.clipboard?.writeText(u).then(() => toast("Link de la reunión copiado"), () => toast(u)); }}>Copiar link</Button>
          {boss && <Button size="sm" variant={r.closed ? "outline" : "ghost"} icon={r.closed ? <LockOpen /> : <Lock />} onClick={() => { onSave({ ...r, closed: !r.closed }); toast(r.closed ? "Reunión reabierta" : "Reunión cerrada: ya no se pueden agregar partes"); }}>{r.closed ? "Reabrir" : "Cerrar"}</Button>}
          {boss && <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={async () => { if (await confirm(`¿Borrar «${r.t}» con todas sus partes?`, { danger: true, ok: "Borrar" })) onDel(); }}>Borrar</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800"><Hash className="size-3.5 text-slate-400" />
          {chip("", "Todo", P.length, f === "", () => setF(""))}
          {r.secs.map(t => chip(t, t, cnt(t), f === t, () => setF(f === t ? "" : t), temasEd ? () => void delTema(t) : undefined))}
          {cnt("") > 0 && chip("__", "General", cnt(""), f === "__", () => setF(f === "__" ? "" : "__"))}
          {boss && <button type="button" onClick={() => setTemasEd(!temasEd)} className={cn("ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold transition", temasEd ? "bg-brand-500/10 text-brand-600 dark:text-brand-300" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}><Pencil className="size-3" />{temasEd ? "Listo" : "Editar temas"}</button>}
        </div>
      <Gente r={r} boss={boss} onSave={onSave} />
      </Card>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {/* acta fijada arriba */}
          {(r.acta?.trim() || boss) && <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: T.c }}>
            <div className="flex items-center gap-2 px-4 pt-3"><ClipboardList className="size-4" style={{ color: T.c }} /><b className="flex-1 text-[13px]">Acta / resumen</b>
              {boss && !actaEd && <Button size="sm" variant="ghost" icon={<Pencil />} onClick={() => { setActa(r.acta || ""); setActaEd(true); }}>{r.acta?.trim() ? "Editar" : "Escribir"}</Button>}</div>
            {actaEd ? <div className="space-y-2 p-4 pt-2"><textarea value={acta} onChange={e => setActa(e.target.value)} rows={10} placeholder={"## Tema\n- Lo que se resolvió…"} className="w-full rounded-xl border border-slate-200 bg-transparent p-3 font-mono text-[12.5px] outline-none focus:border-brand-500 dark:border-slate-700" />
              <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setActaEd(false)}>Cancelar</Button><Button size="sm" onClick={() => { onSave({ ...r, acta }); setActaEd(false); toast("Acta guardada"); }}>Guardar acta</Button></div></div>
              : r.acta?.trim() ? <div className="fb-rich px-4 pb-4 pt-1 text-[13.5px] leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(r.acta) }} />
              : <p className="px-4 pb-3 text-[12.5px] text-slate-400">Cuando termine la reunión, escribí acá lo que se resolvió.</p>}
          </Card>}
          {/* partes */}
          {!V.length ? <Card><Empty icon={<FileText />} title={P.length ? "Nada en este tema" : "Todavía no hay partes"} desc={r.closed ? undefined : "Escribí o pegá abajo lo que quieras tratar en la reunión."} /></Card>
            : V.map(p => { const a = findAgent(p.n), c = RANK_COLOR[a?.r || ""] || "#64748b", own = p.n === me.n, isNew = p.k.includes(".e."); return (
              <Card key={p.id} className="overflow-hidden">
                <div className="flex">
                  <span className="w-1 shrink-0" style={{ background: c }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                      <Avatar n={p.n} size={28} /><b className="text-[13px]">{p.n}</b>{a && <span className="text-[11px] font-bold" style={{ color: c }}>{rankES(a.r)}</span>}
                      <span className="text-[11.5px] text-slate-400">· {fullDT(p.at)}{p.ed ? " · editado" : ""}</span>
                      {p.tema && <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: T.c + "1c", color: T.c }}># {p.tema}</span>}
                      <span className="flex-1" />
                      {isNew && (own || boss) && edit !== p.id && !r.closed && <>
                        {own && <button type="button" title="Editar" onClick={() => setEdit(p.id)} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Pencil className="size-3.5" /></button>}
                        <button type="button" title="Borrar" onClick={async () => { if (await confirm("¿Borrar esta parte?", { danger: true, ok: "Borrar" })) LS.del(p.k); }} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-3.5" /></button></>}
                    </div>
                    {edit === p.id ? <EditPart p={p} onDone={html => { if (html != null) LS.setJSON(p.k, { id: p.id, n: p.n, at: p.at, tema: p.tema, html: safeHtml(html), ed: Date.now() }); setEdit(""); }} />
                      : <div className="fb-rich px-4 py-3 text-[13.5px] leading-relaxed" dangerouslySetInnerHTML={{ __html: safeHtml(p.html) }} />}
                  </div>
                </div>
              </Card>); })}
          {/* agregar */}
          {!r.closed ? <Card className="overflow-hidden ring-1 ring-brand-500/20">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <MessageSquarePlus className="size-4 text-brand-500" /><b className="text-[13px]">Agregar a la reunión</b>
              <span className="text-[11.5px] text-slate-400">· como {me.n}</span>
            </div>
            <div className="space-y-2.5 p-4">
              <div className="flex flex-wrap items-center gap-1.5"><span className="text-[11.5px] font-semibold text-slate-500">Tema:</span>
                {chip("", "General", 0, tema === "", () => setTema(""))}
                {r.secs.map(t => chip(t, t, 0, tema === t, () => setTema(tema === t ? "" : t)))}
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 py-0.5 pl-2 pr-1 dark:border-slate-600"><Plus className="size-3 text-slate-400" />
                  <input value={nt} onChange={e => setNt(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTema(); } }} placeholder="Nuevo tema…" maxLength={60} className="w-28 bg-transparent text-[12px] outline-none placeholder:text-slate-400" /></span>
              </div>
              <RichEditor key={kEd} ref={ed} md placeholder="Escribí o pegá lo que quieras sumar: un tema, una lista de requisitos, un caso… El formato se mantiene." minH="min-h-[9rem]" init={draft()} onSubmit={publish}
                onChange={h => { const e = !!ed.current?.empty(); setEmpty(e); try { if (e) localStorage.removeItem(DK); else localStorage.setItem(DK, h); } catch { /* */ } }} />
              <div className="flex flex-wrap items-center gap-2"><p className="min-w-0 flex-1 text-[11.5px] text-slate-400">Se publica a tu nombre y lo ven todos al instante · <kbd className="font-mono">Ctrl + Enter</kbd></p>
                <Button icon={<Send />} disabled={empty} onClick={publish}>Publicar</Button></div>
            </div>
          </Card> : <Card className="flex items-center gap-3 p-3 text-[13px] text-slate-500"><Lock className="size-4" />La reunión está cerrada.{boss && " Reabrila para sumar partes."}</Card>}
        </div>
        <div className="xl:sticky xl:top-32"><DiscordOutput title={`${r.t} · ${dmy(r.f)}`} text={out} sticky={false} /></div>
      </div>
    </div>);
}

function EditPart({ p, onDone }: { p: Part; onDone: (html: string | null) => void }) {
  const ed = useRef<RichRef>(null);
  return (
    <div className="space-y-2 p-3">
      <RichEditor ref={ed} md init={p.html} placeholder="Texto" minH="min-h-[6rem]" onSubmit={() => onDone(ed.current?.el?.innerHTML || "")} />
      <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => onDone(null)}>Cancelar</Button><Button size="sm" icon={<CheckCircle2 />} onClick={() => { if (ed.current?.empty()) return; onDone(ed.current?.el?.innerHTML || ""); }}>Guardar</Button></div>
    </div>);
}

/* encabezan (con su cargo) y presentes, como tags */
function Gente({ r, boss, onSave }: { r: Reu; boss: boolean; onSave: (r: Reu) => void }) {
  const enc = r.enc || encDef(), pres = r.pres || [], [ed, setEd] = useState<"" | "enc" | "pres">("");
  const tag = (n: string, rm?: () => void, lead?: boolean) => { const a = findAgent(n), c = RANK_COLOR[a?.r || ""] || "#64748b", ro = roleOf(n); return (
    <span key={n} className={cn("inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-[12px] font-semibold", lead && "pr-2.5")} style={{ background: c + "1a", boxShadow: `inset 0 0 0 1px ${c}55` }}>
      <Avatar n={n} size={lead ? 26 : 22} /><span className="leading-tight">{n}{lead ? <span className="block text-[10px] font-bold" style={{ color: c }}>{ro.l}{ro.must && ` · ${ro.must}`}</span> : <span className="ml-1 text-[10px] font-bold" style={{ color: c }}>{ro.l}</span>}</span>
      {rm && <button type="button" aria-label={`Quitar a ${n}`} onClick={rm} className="rounded-full p-0.5 text-slate-400 hover:text-red-500"><X className="size-3" /></button>}
    </span>); };
  const row = (k: "enc" | "pres", l: string, L: string[], can: boolean, empty: string, filter: (a: { n: string; r: string }) => boolean) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-[5.5rem] shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</span>
      {L.length ? L.map(n => tag(n, ed === k && can ? () => onSave({ ...r, [k]: L.filter(x => x !== n) }) : undefined, k === "enc")) : <span className="text-[12px] text-slate-400">{empty}</span>}
      {can && (ed === k ? <span className="min-w-[14rem] flex-1"><AgentPicker value={L} multiple onChange={n => !L.includes(n) && onSave({ ...r, [k]: [...L, n] })} filter={a => filter(a) && !L.includes(a.n)} /></span> : null)}
      {can && <button type="button" onClick={() => setEd(ed === k ? "" : k)} className={cn("inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[11.5px] font-semibold transition", ed === k ? "border-brand-500 text-brand-600" : "border-slate-300 text-slate-400 hover:text-slate-700 dark:border-slate-600 dark:hover:text-slate-200")}>{ed === k ? <><CheckCircle2 className="size-3" />Listo</> : <><Plus className="size-3" />Agregar</>}</button>}
    </div>);
  return (
    <div className="space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
      {row("enc", "Encabezan", enc, boss, "Sin cargar", a => lvl(a.r) >= 6)}
      {row("pres", "Presentes", pres, !r.closed || boss, "Todavía nadie marcado", a => lvl(a.r) > 0)}
    </div>);
}
