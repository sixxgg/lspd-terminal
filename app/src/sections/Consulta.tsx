/* Consulta: preguntas sobre el Manual del Novato respondidas con el texto del propio manual.
   En prueba: la ven six y quienes él habilite en Administración › Accesos. El manual lo carga six (pegado o desde un .txt/.md).
   Datos: lspdt.consulta.manual { t, at, by } · lspdt.consultaAcc (accesos) · lspdt.consultaRev (respuestas marcadas para revisar). */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, BookOpenCheck, Copy, Flag, Search, Send, Sparkles, Trash2, Upload } from "lucide-react";
import { Button, Card, CardHeader, Empty, Input, Segmented, Textarea } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, ME_ROLES, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { ask, chunk, qStems, toks, type Hit } from "@/lib/manual";
import { cn } from "@/lib/cn";

type Man = { t: string; at: number; by: string };
type QA = { q: string; at: number; ids: number[] };
type Rev = { id: string; q: string; sec: string; by: string; at: number; nota?: string };
const MK = "lspdt.consulta.manual", RK = "lspdt.consultaRev", CK = "lspdt.next.consultaChat";

/* resalta las palabras de la pregunta dentro del texto del manual */
function Hl({ t, S }: { t: string; S: Set<string> }) {
  return <>{t.split(/(\s+)/).map((w, i) => { const s = toks(w)[0]; return s && S.has(s) ? <mark key={i} className="rounded bg-amber-300/40 px-0.5 text-inherit dark:bg-amber-400/25">{w}</mark> : w; })}</>;
}

export function Consulta() {
  useStoreVersion();
  const six = !!ME_ROLES.six, [man0] = useJSON<Man | null>(MK, null);
  /* si six no cargó otro, va el manual oficial pasado a texto (OCR del PDF, 132 páginas) */
  const [def, setDef] = useState<Man | null>(null);
  useEffect(() => { if (man0?.t || def) return; void fetch(`${import.meta.env.BASE_URL}manual-novato.txt`).then(r => (r.ok ? r.text() : "")).then(t => t && setDef({ t, at: 0, by: "Manual oficial (OCR)" })).catch(() => {}); }, [man0?.t, def]);
  const man = man0?.t ? man0 : def;
  const [tab, setTab] = useState<"q" | "man" | "rev" | "load">("q");
  const C = useMemo(() => chunk(man?.t || ""), [man?.t]);
  const [rev] = useJSON<Rev[]>(RK, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-600 text-white dark:bg-brand-500"><BookOpenCheck className="size-6" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-2xl font-bold leading-tight">Consulta</h2>
          <p className="text-sm text-slate-500">Preguntá lo que quieras del Manual del Novato: la respuesta sale del texto del manual, con la sección de donde viene.</p></div>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">EN PRUEBA</span>
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ value: "q", label: "Preguntar", icon: <Sparkles className="size-4" /> }, { value: "man", label: "Ver manual", icon: <BookOpen className="size-4" /> },
        ...(six ? [{ value: "rev" as const, label: `A revisar${rev.length ? ` (${rev.length})` : ""}`, icon: <Flag className="size-4" /> }, { value: "load" as const, label: "Cargar manual", icon: <Upload className="size-4" /> }] : [])]} />
      {tab === "load" && six ? <Load man={man} onDone={() => setTab("q")} />
        : !C.length ? <Card><Empty icon={<BookOpen />} title={man ? "Cargando el manual…" : "Todavía no hay manual cargado"} desc={six ? "Cargalo en «Cargar manual»." : "Cuando six lo cargue vas a poder preguntar."} /></Card>
        : tab === "man" ? <Manual C={C} />
        : tab === "rev" && six ? <Revisar />
        : <Ask C={C} />}
    </div>);
}

/* ---------- preguntar ---------- */
function Ask({ C }: { C: ReturnType<typeof chunk> }) {
  const me = useMe(), { toast } = useFeedback(), [q, setQ] = useState(""), [L, setL] = useState<QA[]>(() => LS.json<QA[]>(CK, []));
  const end = useRef<HTMLDivElement>(null);
  const sug = useMemo(() => [...new Set(C.map(c => c.sec))].filter(s => s.length < 50).slice(0, 8), [C]);
  const send = (t = q) => { const s = t.trim(); if (!s) return; const H = ask(s, C, 3);
    const n = [...L, { q: s, at: Date.now(), ids: H.map(h => h.c.id) }].slice(-30); setL(n); LS.setJSON(CK, n); setQ(""); setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60); };
  const flag = (x: QA, sec: string) => { const R = LS.json<Rev[]>(RK, []); LS.setJSON(RK, [...R, { id: Math.random().toString(36).slice(2, 10), q: x.q, sec, by: me.n, at: Date.now() }]); toast("Marcada para revisar"); };
  return (
    <Card className="flex min-h-[60vh] flex-col overflow-hidden">
      <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-5">
        {!L.length && <div className="py-6 text-center">
          <BookOpenCheck className="mx-auto size-10 text-brand-500" /><p className="mt-2 font-semibold">¿Qué querés saber del manual?</p>
          <p className="text-sm text-slate-500">Escribí la pregunta como te salga: «¿cómo se hace un cacheo?», «uniforme», «qué hago en una persecución»…</p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">{sug.map(s => <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 px-3 py-1 text-[12.5px] text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300">{s}</button>)}</div>
        </div>}
        {L.map((x, i) => { const H: Hit[] = ask(x.q, C, 3), S = qStems(x.q); return (
          <div key={i} className="space-y-2">
            <div className="flex justify-end"><p className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2 text-sm text-white dark:bg-brand-500">{x.q}</p></div>
            {!H.length ? <Bubble><p className="text-sm">No encontré eso en el manual. Probá con otras palabras o buscá en «Ver manual».</p>
              <button onClick={() => flag(x, "—")} className="mt-2 inline-flex items-center gap-1 text-[12px] text-slate-400 hover:text-amber-500"><Flag className="size-3.5" />Avisar que falta</button></Bubble>
              : <Bubble>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">Según el manual · {H[0].c.sec}</p>
                <div className="space-y-1.5 text-[14px] leading-relaxed">{H[0].best.map((s, j) => <p key={j}><Hl t={s} S={S} /></p>)}</div>
                <Mas t={H[0].c.text} S={S} label="Ver la sección completa" />
                {H.length > 1 && <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700"><p className="text-[11px] font-semibold text-slate-400">También puede servirte</p>
                  {H.slice(1).map(h => <Mas key={h.c.id} t={h.c.text} S={S} label={h.c.sec} />)}</div>}
                <div className="mt-3 flex gap-3 text-[12px] text-slate-400">
                  <button onClick={() => void navigator.clipboard?.writeText(`${H[0].best.join(" ")}\n(Manual del Novato · ${H[0].c.sec})`).then(() => toast("Copiado"))} className="inline-flex items-center gap-1 hover:text-brand-500"><Copy className="size-3.5" />Copiar</button>
                  <button onClick={() => flag(x, H[0].c.sec)} className="inline-flex items-center gap-1 hover:text-amber-500"><Flag className="size-3.5" />Respuesta incorrecta</button></div>
              </Bubble>}
          </div>); })}
        <div ref={end} />
      </div>
      <div className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <Input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Escribí tu pregunta…" className="flex-1" aria-label="Pregunta" />
        <Button icon={<Send />} disabled={!q.trim()} onClick={() => send()}>Preguntar</Button>
        {L.length > 0 && <Button variant="ghost" icon={<Trash2 />} onClick={() => { setL([]); LS.del(CK); }} title="Borrar la conversación" />}
      </div>
    </Card>);
}
const Bubble = ({ children }: { children: ReactNode }) => <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">{children}</div>;
function Mas({ t, S, label }: { t: string; S: Set<string>; label: string }) {
  const [o, setO] = useState(false);
  return <div className="mt-2"><button onClick={() => setO(!o)} className="text-[12.5px] font-semibold text-brand-600 hover:underline dark:text-brand-300">{o ? "Ocultar" : label}</button>
    {o && <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><Hl t={t} S={S} /></p>}</div>;
}

/* ---------- ver el manual completo, con índice y buscador ---------- */
function Manual({ C }: { C: ReturnType<typeof chunk> }) {
  const [f, setF] = useState(""), S = qStems(f), secs = [...new Set(C.map(c => c.sec))];
  const vis = f.trim() ? C.filter(c => toks(`${c.sec} ${c.text}`).some(w => S.has(w))) : C;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[16rem_1fr]">
      <Card className="scrollbar-thin max-h-[75vh] overflow-y-auto p-2 lg:sticky lg:top-24"><p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Índice</p>
        {secs.map((s, i) => <button key={i} onClick={() => document.getElementById(`man-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800">{s}</button>)}</Card>
      <Card>
        <div className="border-b border-slate-100 p-3 dark:border-slate-800"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={f} onChange={e => setF(e.target.value)} placeholder="Buscar en el manual…" /></div></div>
        <div className="space-y-5 p-5">{secs.map((s, i) => { const P = vis.filter(c => c.sec === s); if (!P.length) return null; return (
          <section key={i} id={`man-${i}`} className="scroll-mt-24"><h3 className="mb-2 text-lg font-bold">{s}</h3>
            {P.map(c => <p key={c.id} className="mb-3 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-600 dark:text-slate-300"><Hl t={c.text} S={S} /></p>)}</section>); })}
          {!vis.length && <p className="text-sm text-slate-400">Nada coincide.</p>}</div>
      </Card>
    </div>);
}

/* ---------- six: respuestas marcadas como incorrectas o que faltan ---------- */
function Revisar() {
  const [R, setR] = useJSON<Rev[]>(RK, []);
  return (
    <Card>
      <CardHeader icon={<Flag />} title={`A revisar · ${R.length}`} desc="Preguntas que alguien marcó como mal respondidas o que el manual no cubre. Sirven para corregir antes de abrirlo a todos." />
      {!R.length ? <Empty icon={<Flag />} title="Nada para revisar" /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{[...R].sort((a, b) => b.at - a.at).map(x => (
        <div key={x.id} className="flex items-start gap-3 px-5 py-3">
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">«{x.q}»</p><p className="text-[12px] text-slate-500">Respondió con: {x.sec} · {x.by} · {new Date(x.at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p></div>
          <button aria-label="Quitar" onClick={() => setR(R.filter(y => y.id !== x.id))} className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button></div>))}</div>}
    </Card>);
}

/* ---------- six: cargar o reemplazar el manual ---------- */
function Load({ man, onDone }: { man: Man | null; onDone: () => void }) {
  const me = useMe(), { toast } = useFeedback(), [t, setT] = useState(man?.t || ""), inp = useRef<HTMLInputElement>(null);
  const C = useMemo(() => chunk(t), [t]);
  const file = async (f?: File | null) => { if (!f) return; if (/\.pdf$/i.test(f.name)) { toast("Del PDF: abrilo, Ctrl+A, Ctrl+C y pegalo acá", "err"); return; } setT(await f.text()); };
  return (
    <Card>
      <CardHeader icon={<Upload />} title="Manual del Novato" desc={man?.at ? `Cargado por ${man.by} el ${new Date(man.at).toLocaleDateString("es-AR")} · ${chunk(man.t).length} partes` : man ? `Ahora se usa el manual oficial pasado a texto (${chunk(man.t).length} partes). Si cargás otro, reemplaza a ese.` : "Pegá el texto completo del manual (abrí el PDF, Ctrl+A, Ctrl+C) o subí un .txt/.md."}
        action={<Button size="sm" variant="outline" icon={<Upload />} onClick={() => inp.current?.click()}>Subir .txt</Button>} />
      <div className="space-y-3 p-5">
        <Textarea rows={16} value={t} onChange={e => setT(e.target.value)} placeholder="Pegá acá el Manual del Novato…" className="font-mono text-[12.5px]" />
        <p className={cn("text-[12.5px]", C.length ? "text-slate-500" : "text-slate-400")}>{C.length ? `Lo separa en ${C.length} partes y ${new Set(C.map(c => c.sec)).size} secciones (los títulos los detecta solo: líneas en mayúsculas, numeradas o con #).` : "Sin texto todavía."}</p>
        <div className="flex justify-end gap-2"><Button disabled={!C.length || t === man?.t} onClick={() => { LS.setJSON(MK, { t, at: Date.now(), by: me.n }); toast("Manual guardado"); onDone(); }}>Guardar manual</Button></div>
        <input ref={inp} type="file" accept=".txt,.md,.pdf,text/plain" hidden onChange={e => { void file(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </Card>);
}
