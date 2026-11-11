import { useEffect, useMemo, useState } from "react";
import { MessageSquareWarning, UserRound, FileText, Save, ChevronDown, Copy, Trash2, Pencil, ListChecks, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Empty, Field, Input, Segmented, Textarea, SearchInput } from "@/components/ui";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { DiscordOutput, useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { Col, Split } from "@/components/layout";
import { findAgent, fmtDate, genderOf, lvl, norm, rankES, uid } from "@/lib/domain";
import { discordPlain } from "@/lib/discord";
import { getPenal, penalOf, artCmp } from "@/lib/penal";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { FB_TIPOS, FB_TPL, fbErrs, fbNew, fbText } from "@/legacy/feedback";
import { cn } from "@/lib/cn";

type Fb = { ag: string; tipo: string; tpl: string; f: Record<string, string>; obs: string; mejora: string; evid: string; hablado: boolean; fecha: string; id: string; por?: string; t?: number; texto?: string; edit?: string };
type Tpl = { k: string; l: string; tipo: string; f: [string, string, string, string?][] };
const TPL = FB_TPL as unknown as Tpl[];
const TIPOS = FB_TIPOS as [string, string, string, string, string, string][];
const DRAFT = "lspdt.next.fbDraft";

/* «63.3», «138.37» o «63.3 — Título»: busca el título en el código penal si no viene escrito */
export function artTxt(v?: string) {
  const s = String(v || "").trim(); if (!s) return "[artículo]";
  const m = /^(?:art(?:ículo|\.)?\s*)?(\d{1,3}(?:\.\d{1,3}){1,2})\s*(?:[-—–:]\s*(.+))?$/i.exec(s);
  if (!m) return s.replace(/^art(ículo|\.)?\s*/i, "Artículo ");
  const t = (m[2] || penalOf(m[1])?.t || "").trim(); return `Artículo ${m[1]}${t ? " — " + t : ""}`;
}
export function fbCtx(ag: string, me: { n: string; r: string }) {
  const a = findAgent(ag), f = a ? genderOf(a.n) === "f" : false;
  return { agArt: ag ? `${f ? "la" : "el"} agente ${ag}` : "[el agente]", ag: a ? `${rankES(a.r)} ${a.n}${a.p ? " · #" + a.p : ""}` : ag || "[Agente]", sup: `${rankES(me.r)} ${me.n}`, art: artTxt };
}
export const TipoPill = ({ k }: { k: string }) => { const t = TIPOS.find(x => x[0] === k); if (!t) return null;
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-900"><i className="size-2 rounded-full" style={{ background: t[3] }} />{t[1]}</span>; };

export function Feedback() {
  const [L] = useJSON<Fb[]>("lspdt.feedback", []);
  const [tab, setTab] = useState<"new" | "list">("new"), [edit, setEdit] = useState<Fb | null>(null), [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "new", label: "Nuevo feedback", icon: <MessageSquareWarning /> }, { value: "list", label: `Registrados (${L.length})`, icon: <ListChecks /> }]} />
      {tab === "new" ? <FbForm key={edit?.id || "n"} init={edit} onSaved={id => { setEdit(null); setOpen(id); setTab("list"); }} />
        : <FbList open={open} setOpen={setOpen} onEdit={r => { setEdit(r); setTab("new"); }} />}
    </div>
  );
}

function FbForm({ init, onSaved }: { init: Fb | null; onSaved: (id: string) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [A, setA] = useState<Fb>(() => init ? structuredClone(init) : Object.assign(fbNew() as Fb, LS.json<Partial<Fb>>(DRAFT, {})));
  const [err, setErr] = useState(false);
  useEffect(() => { if (!A.id) LS.setJSON(DRAFT, A); }, [A]);
  const up = (p: Partial<Fb>) => setA(a => ({ ...a, ...p }));
  const P = TPL.find(t => t.k === A.tpl) || TPL[TPL.length - 1];
  const text = useMemo(() => fbText(A, fbCtx(A.ag, me)), [A, me]), errs = fbErrs(A) as string[];
  const arts = useMemo(() => getPenal().slice().sort(artCmp), []);
  const save = () => {
    if (errs.length) { setErr(true); toast("Falta completar: " + errs.join(", "), "err"); return; }
    const all = LS.json<Fb[]>("lspdt.feedback", []), r: Fb = { ...structuredClone(A), texto: text, t: Date.now(), por: A.por || me.n };
    let id = A.id;
    if (A.id) { const i = all.findIndex(x => x.id === A.id); if (i >= 0) all[i] = { ...all[i], ...r, edit: me.n }; else all.push(r); }
    else { id = r.id = uid(); all.push(r); }
    LS.setJSON("lspdt.feedback", all); LS.del(DRAFT); toast(A.id ? "Cambios guardados" : "Feedback registrado"); onSaved(id);
  };
  const a = A.ag ? findAgent(A.ag) : null;
  return (
    <Split>
      <datalist id="fbArtDL">{arts.map(x => <option key={x.a} value={`${x.a} — ${x.t}`} />)}</datalist>
      <Col>
        <Card>
          <CardHeader icon={<UserRound />} title="Agente" desc="Queda registrado con tu nombre y la fecha." />
          <CardBody>
            {a ? <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><Avatar n={a.n} size={36} /><div className="flex-1"><p className="font-semibold">{a.n}</p><div className="flex items-center gap-1.5"><RankBadge r={a.r} />{a.p && <span className="font-mono text-[11px] text-slate-400">#{a.p}</span>}</div></div>
              <button className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300" onClick={() => up({ ag: "" })}>Cambiar</button></div>
              : <AgentPicker value="" onChange={n => up({ ag: n })} filter={x => lvl(x.r) > 0 && x.n !== me.n && (me.admin || lvl(x.r) < me.l)} empty="No hay agentes de rango inferior al tuyo" />}
            {err && !A.ag && <p className="text-xs font-semibold text-red-600">Elegí el agente.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<MessageSquareWarning />} title="Tipo" />
          <CardBody>
            <div className="grid gap-1.5" role="radiogroup">{TIPOS.map(([k, l, d, c]) => (
              <button key={k} role="radio" aria-checked={A.tipo === k} onClick={() => up({ tipo: k })}
                className={cn("flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  A.tipo === k ? "border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}>
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", A.tipo === k ? "border-brand-500" : "border-slate-300 dark:border-slate-600")}>{A.tipo === k && <i className="size-2 rounded-full bg-brand-500" />}</span>
                <span><span className="inline-flex items-center gap-1.5 text-sm font-semibold"><i className="size-2 rounded-full" style={{ background: c }} />{l}</span><small className="block text-xs text-slate-500">{d}</small></span>
              </button>))}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<FileText />} title="Plantilla" desc="Elegí el caso; el texto se arma solo y lo podés retocar en la salida." />
          <CardBody>
            <div className="flex flex-wrap gap-1.5">{TPL.map(t => (
              <button key={t.k} onClick={() => up({ tpl: t.k, ...(t.tipo ? { tipo: t.tipo } : {}) })}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", A.tpl === t.k ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>{t.l}</button>))}</div>
            {P.f.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{P.f.map(([k, l, ph, kind]) => (
              <Field key={k} label={l} className={kind === "ta" || k === "exp" ? "sm:col-span-2" : ""}>
                {kind === "ta" ? <Textarea rows={2} value={A.f[k] || ""} onChange={e => up({ f: { ...A.f, [k]: e.target.value } })} placeholder={"Ej: " + ph} />
                  : <Input value={A.f[k] || ""} list={kind === "art" ? "fbArtDL" : undefined} onChange={e => up({ f: { ...A.f, [k]: e.target.value } })} placeholder={"Ej: " + ph} className={kind === "art" ? "font-mono" : ""} />}
                {kind === "art" && A.f[k] && <p className="mt-1 text-[11px] text-slate-500">{artTxt(A.f[k])}</p>}
              </Field>))}</div>}
            <Field label={P.k === "libre" ? "Hechos" : "Algo más sobre los hechos"} hint={P.k === "libre" ? undefined : "(opcional)"}><Textarea rows={3} value={A.obs} onChange={e => up({ obs: e.target.value })} placeholder="Contexto, detalles o lo que no entra en la plantilla." /></Field>
            <Field label="Evidencia" hint="(una por línea: enlaces, capturas, vídeos)"><Textarea rows={2} value={A.evid} onChange={e => up({ evid: e.target.value })} placeholder={"https://…\nVídeo de la bodycam"} /></Field>
            <Field label={(TIPOS.find(t => t[0] === A.tipo) || TIPOS[2])[5].replace(/^\S+\s/, "")} hint="(si lo dejás vacío se pone el texto sugerido)"><Textarea rows={2} value={A.mejora} onChange={e => up({ mejora: e.target.value })} placeholder="Qué debe mejorar o qué medida se toma." /></Field>
            <Checkbox checked={A.hablado} onChange={v => up({ hablado: v })} label="Ya hablé con el agente sobre esto" />
          </CardBody>
        </Card>
      </Col>
      <DiscordOutput title="Feedback" tag="Discord" text={text} errors={err ? errs : undefined}
        footer={<><Button variant="ghost" onClick={async () => { if (!(await confirm("¿Empezar un feedback nuevo? Se borran los datos cargados."))) return; LS.del(DRAFT); setA(fbNew() as Fb); setErr(false); }}>Nuevo</Button>
          <Button icon={<Save />} onClick={save}>{A.id ? "Guardar cambios" : "Registrar"}</Button></>} />
    </Split>
  );
}

function FbList({ open, setOpen, onEdit }: { open: string | null; setOpen: (v: string | null) => void; onEdit: (r: Fb) => void }) {
  const me = useMe(), { confirm } = useFeedback(), copy = useCopy();
  const [L, setL] = useJSON<Fb[]>("lspdt.feedback", []);
  const [q, setQ] = useState(""), [t, setT] = useState("");
  const s = norm(q), F = L.slice().sort((a, b) => (b.t || 0) - (a.t || 0)).filter(r => (!t || r.tipo === t) && (!s || norm(r.ag + " " + r.por + " " + r.texto).includes(s)));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{TIPOS.map(([k, l, , c]) => (
        <button key={k} onClick={() => setT(t === k ? "" : k)} className={cn("rounded-2xl border p-3 text-left transition", t === k ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/50")}>
          <p className="text-xl font-bold tabular-nums">{L.filter(r => r.tipo === k).length}</p><p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500"><i className="size-2 shrink-0 rounded-full" style={{ background: c }} />{l.split(" / ")[0].replace(" Feedback", "")}</p></button>))}</div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <SearchInput className="min-w-[14rem] flex-1 sm:max-w-sm" value={q} onChange={setQ} placeholder="Buscar agente, supervisor, informe…" />
          {t && <button onClick={() => setT("")} className="inline-flex items-center gap-1"><TipoPill k={t} /><X className="size-3.5 text-slate-400" /></button>}
          <span className="text-xs text-slate-400">{F.length} de {L.length}</span>
        </div>
        {!F.length ? <Empty icon={<MessageSquareWarning />} title={L.length ? "Nada coincide" : "Todavía no hay feedback registrado"} /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{F.map(r => {
          const isO = open === r.id, can = r.por === me.n || me.l >= 8 || me.admin, tp = TIPOS.find(x => x[0] === r.tipo), P = TPL.find(x => x.k === r.tpl);
          return (
            <div key={r.id} style={{ boxShadow: `inset 3px 0 0 ${tp?.[3] || "transparent"}` }}>
              <button onClick={() => setOpen(isO ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <Avatar n={r.ag} size={34} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.ag}</p>
                  <p className="truncate text-xs text-slate-500">{P && P.k !== "libre" ? P.l + " · " : ""}{r.fecha} · por {r.por}{r.f?.inf ? ` · informe #${String(r.f.inf).replace(/^#/, "")}` : ""}</p></div>
                <TipoPill k={r.tipo} />{!r.hablado && <span className="hidden rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700 sm:inline dark:text-amber-300">Sin conversar</span>}
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isO && "rotate-180")} />
              </button>
              {isO && <div className="space-y-3 bg-slate-50/60 p-4 dark:bg-slate-950/30">
                <pre className="scrollbar-thin max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-slate-200">{r.texto}</pre>
                <div className="flex flex-wrap items-center gap-2">
                  {can && <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (await confirm("¿Eliminar este feedback del registro?", { danger: true, ok: "Eliminar" })) setL(L.filter(x => x.id !== r.id)); }}>Eliminar</Button>}
                  <span className="flex-1 text-[11px] text-slate-400">{r.t ? "Registrado el " + fmtDate(r.t) : ""}{r.edit ? ` · editado por ${r.edit}` : ""}</span>
                  {can && <Button variant="outline" size="sm" icon={<Pencil />} onClick={() => onEdit(r)}>Editar</Button>}
                  <Button variant="outline" size="sm" icon={<Copy />} onClick={() => copy(discordPlain(r.texto || ""))}>Copiar formato web</Button>
                  <Button size="sm" icon={<Copy />} onClick={() => copy(r.texto || "")}>Copiar formato Discord</Button>
                </div>
              </div>}
            </div>); })}</div>}
      </Card>
    </div>
  );
}
