import { DivAdmin, DivNav, Uniformidad, divTabs, uniTab, type DivTab } from "./DivTools";
import { scrollTopApp } from "@/lib/appearance";
import { useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, UserRound, Check, X, Plus, Shuffle, PenLine, FileUp, Wand2, Trash2, Save, ClipboardList, ChevronDown, Pencil, Copy, Scale } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Segmented, Textarea } from "@/components/ui";
import { DiscordOutput, useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { Col, Split } from "@/components/layout";
import { hoyISO, initials, isoToDMY, joinY, lvl, maskDMY, uid , myKey } from "@/lib/domain";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { isRTD, rtdMem } from "@/lib/units";
import { Instrucciones } from "./Instrucciones";

import { dcParts, fileText } from "@/lib/penal";
import { CMP_L, RTD_CASOS, RTD_F, parsePost, rtdAge, rtdCaso, rtdCmp, rtdScore, rtdText } from "@/legacy/rtd";
import { cn } from "@/lib/cn";

type Caso = { c: number | "otro"; txt: string; r: string; ok: "" | "si" | "no" };
type R = { asp: string; cid: string; fnac: string; edad: string; lugar: string; ent: string[]; edu: string; trab: string; fort: string[]; deb: string[]; porq: string; exp: string; dif: string;
  casos: Caso[]; res: string; nota: string; post: string; id: string; fecha?: string; t?: number; por?: string; edit?: string };
const NEW = (me?: string): R => ({ asp: "", cid: "", fnac: "", edad: "", lugar: "", ent: me ? [me] : [], edu: "", trab: "", fort: ["", "", ""], deb: ["", "", ""], porq: "", exp: "", dif: "", casos: [], res: "", nota: "", post: "", id: "" });
const RES: Record<string, [string, string]> = { apto: ["Apto", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"], noapto: ["No apto", "bg-red-500/10 text-red-700 dark:text-red-300"], pend: ["Pendiente", "bg-amber-400/15 text-amber-700 dark:text-amber-300"] };
const CMP_C: Record<string, string> = { ok: "border-emerald-400/40 bg-emerald-500/5", mid: "border-amber-400/40 bg-amber-500/5", no: "border-red-400/40 bg-red-500/5", nd: "border-slate-200 dark:border-slate-800" };

export function Rtd({ dn }: { dn?: string }) {
  const me = useMe();
  const [tab, setTab] = useState<string>("new"), [edit, setEdit] = useState<R | null>(null), [open, setOpen] = useState<string | null>(null);
  const [L] = useJSON<R[]>("lspdt.rtdEnt", []);
  /* coordinación de la RTD: administración o miembros desde Sargento I */
  const co = !!me.admin || (rtdMem().includes(me.n) && lvl(me.r) >= lvl("Sargento I"));
  const base: DivTab[] = [{ value: "new", label: "Entrevista de aspirante", icon: <GraduationCap />, txt: "Entrevista de aspirante" }, { value: "list", label: `Entrevistas registradas (${L.length})`, icon: <ClipboardList />, txt: "Entrevistas registradas" },
    { value: "ins", label: "Instrucciones", icon: <GraduationCap />, txt: "Instrucciones" }, uniTab()], opts = divTabs("rtd", base, co);
  const t = opts.some(x => x.value === tab) ? tab : opts[0]?.value || "new";
  return (
    <div className="space-y-4">
      <DivNav value={t} onChange={setTab} options={opts} />
      {t === "adm" ? <DivAdmin id="rtd" ab="RTD" dn={dn} tabs={base} /> : t === "uni" ? <Uniformidad id="rtd" ab="RTD" dn={dn} canEdit={co} /> : t === "ins" ? <Instrucciones div="rtd" ab="RTD" names={rtdMem().slice().sort()} roleOf={() => "inst"} tipos={["Academia", "Procedimientos de patrulla", "Código penal", "Uso de la radio", "Conducción"]} canEdit={isRTD(me.n)} isCoord={!!me.admin} />
        : t === "new" ? <RtdForm key={edit?.id || "n"} init={edit} onSaved={id => { setEdit(null); setOpen(id); setTab("list"); }} />
        : <RtdList open={open} setOpen={setOpen} onEdit={r => { setEdit(r); setTab("new"); scrollTopApp(); }} />}
    </div>
  );
}

function RtdForm({ init, onSaved }: { init: R | null; onSaved: (id: string) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [A, setA] = useState<R>(() => { if (init) return structuredClone(init); const x = Object.assign(NEW(me.n), LS.json<Partial<R>>(myKey("rtdDraft", me.n), {})); x.casos = (x.casos || []).filter(c => (c.c as unknown) !== ""); if (!x.ent.length && !x.asp) x.ent = [me.n]; return x; });
  const [showErr, setShowErr] = useState(false), [pick, setPick] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { LS.setJSON(myKey("rtdDraft", me.n), A); }, [A]);
  const up = (fn: (x: R) => void) => setA(a => { const x = structuredClone(a); fn(x); return x; });
  const set = (k: keyof R) => (e: { target: { value: string } }) => up(x => { (x[k] as string) = k === "cid" ? e.target.value.toUpperCase() : e.target.value; });
  const mem = rtdMem(), text = useMemo(() => rtdText(A), [A]), parts = dcParts(text), [ok, tot] = rtdScore(A), cmp = rtdCmp(A) as { k: string; l: string; p: string; e: string; s: string }[];
  const errs = [!A.asp.trim() && "nombre del aspirante", !A.ent.length && "entrevistadores", !A.casos.length && "al menos un caso práctico",
    ...A.casos.map((c, i) => !rtdCaso(c) && `caso ${i + 1}`), !A.res && "resultado"].filter(Boolean) as string[];
  const used = A.casos.map(c => c.c), free = (RTD_CASOS as string[]).map((x, k) => [x, k] as const).filter(([, k]) => !used.includes(k));
  const addCaso = (c: number | "otro") => { up(x => { x.casos.push({ c, txt: "", r: "", ok: "" }); }); setPick(false); };
  const save = () => {
    if (errs.length) { setShowErr(true); toast("Falta completar: " + errs.join(", "), "err"); return; }
    const L = LS.json<R[]>("lspdt.rtdEnt", []), r: R = { ...structuredClone(A), fecha: A.fecha || isoToDMY(hoyISO()), t: Date.now(), por: me.n }; let id = A.id;
    if (A.id) { const i = L.findIndex(x => x.id === A.id); if (i >= 0) L[i] = { ...L[i], ...r, por: L[i].por, edit: me.n }; else L.push(r); }
    else { id = r.id = uid(); L.push(r); }
    LS.setJSON("lspdt.rtdEnt", L); LS.del(myKey("rtdDraft", me.n)); toast("Entrevista guardada en el registro"); onSaved(id);
  };
  const n = (k: string) => cmp.filter(x => x.s === k).length;
  return (
    <Split>
      <Col>
        <Card>
          <CardHeader icon={<UserRound />} title="Aspirante" desc={A.id ? "Editando una entrevista registrada" : undefined} />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nombre y apellido"><Input value={A.asp} onChange={set("asp")} placeholder="Nombre del aspirante" className={cn(showErr && !A.asp.trim() && "border-red-400")} /></Field>
              <Field label="CitizenID"><Input value={A.cid} onChange={set("cid")} placeholder="Ej: ABC12345" className="font-mono uppercase" /></Field>
              <Field label="Lugar de nacimiento"><Input value={A.lugar} onChange={set("lugar")} placeholder="Ej: Los Santos" /></Field>
              <Field label="Fecha de nacimiento"><Input value={A.fnac} inputMode="numeric" placeholder="dd/mm/aaaa" onChange={e => { const v = maskDMY(e.target.value); up(x => { x.fnac = v; const a = rtdAge(v); if (a) x.edad = a; }); }} /></Field>
              <Field label="Edad"><Input value={A.edad} onChange={set("edad")} inputMode="numeric" placeholder="Se calcula sola" /></Field>
              <Field label="Fecha de la entrevista"><Input value={A.fecha || isoToDMY(hoyISO())} disabled /></Field>
            </div>
            <Field label="Entrevistadores">
              <div className="flex flex-wrap gap-1.5">{mem.map(nm => { const on = A.ent.includes(nm); return (
                <button key={nm} type="button" onClick={() => up(x => { x.ent = on ? x.ent.filter(y => y !== nm) : mem.filter(y => y === nm || x.ent.includes(y)); })}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", on ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>{nm}</button>); })}</div>
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<PenLine />} title="Información personal" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Educación"><Textarea rows={2} value={A.edu} onChange={set("edu")} placeholder="Estudios" /></Field>
              <Field label="Trabajos anteriores"><Textarea rows={2} value={A.trab} onChange={set("trab")} placeholder="Trabajos previos" /></Field>
              <Field label="Fortalezas"><div className="space-y-1.5">{A.fort.map((v, i) => <Input key={i} value={v} onChange={e => up(x => { x.fort[i] = e.target.value; })} placeholder={`${i + 1}.`} />)}</div></Field>
              <Field label="Debilidades"><div className="space-y-1.5">{A.deb.map((v, i) => <Input key={i} value={v} onChange={e => up(x => { x.deb[i] = e.target.value; })} placeholder={`${i + 1}.`} />)}</div></Field>
            </div>
            <Field label="¿Por qué quiere entrar en la LSPD?"><Textarea rows={2} value={A.porq} onChange={set("porq")} /></Field>
            <Field label="¿Tiene experiencia previa relacionada con departamentos gubernamentales?"><Textarea rows={2} value={A.exp} onChange={set("exp")} /></Field>
            <Field label="¿Qué lo diferencia de los demás aspirantes y puede ser beneficioso para su elección?"><Textarea rows={2} value={A.dif} onChange={set("dif")} /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Scale />} title="Casos prácticos" desc={tot ? `${ok}/${tot} correctos` : undefined} />
          <CardBody>
            {A.casos.map((c, i) => (
              <div key={i} className={cn("space-y-2 rounded-xl border p-3", c.ok === "si" ? "border-emerald-400/50 bg-emerald-500/5" : c.ok === "no" ? "border-red-400/50 bg-red-500/5" : "border-slate-200 dark:border-slate-800")}>
                <div className="flex items-start gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-700">{i + 1}</span>
                  {c.c === "otro" ? <Textarea rows={2} value={c.txt} onChange={e => up(x => { x.casos[i].txt = e.target.value; })} placeholder="Escribí el caso práctico" /> : <p className="flex-1 text-sm font-medium">{rtdCaso(c)}</p>}
                  <div className="flex shrink-0 gap-1">
                    <button title="Correcto" onClick={() => up(x => { x.casos[i].ok = c.ok === "si" ? "" : "si"; })} className={cn("grid size-8 place-items-center rounded-lg border transition", c.ok === "si" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 text-slate-400 hover:text-emerald-600 dark:border-slate-700")}><Check className="size-4" /></button>
                    <button title="Incorrecto" onClick={() => up(x => { x.casos[i].ok = c.ok === "no" ? "" : "no"; })} className={cn("grid size-8 place-items-center rounded-lg border transition", c.ok === "no" ? "border-red-500 bg-red-500 text-white" : "border-slate-200 text-slate-400 hover:text-red-600 dark:border-slate-700")}><X className="size-4" /></button>
                    <button title="Quitar el caso" onClick={() => up(x => { x.casos.splice(i, 1); })} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"><Trash2 className="size-4" /></button>
                  </div>
                </div>
                <Textarea rows={2} value={c.r} onChange={e => up(x => { x.casos[i].r = e.target.value; })} placeholder="Respuesta del aspirante" />
              </div>))}
            <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setPick(!pick)}>Añadir caso práctico</Button>
            {pick && (
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                {free.map(([x, k]) => <button key={k} onClick={() => addCaso(k)} className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/60"><span className="font-mono text-xs font-bold text-slate-400">{k + 1}</span>{x}</button>)}
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <Button variant="ghost" size="sm" icon={<PenLine />} onClick={() => addCaso("otro")}>Escribir uno propio</Button>
                  <Button variant="ghost" size="sm" icon={<Shuffle />} disabled={!free.length} onClick={() => addCaso(free[Math.floor(Math.random() * free.length)][1])}>Uno al azar</Button>
                  <Button variant="ghost" size="sm" onClick={() => setPick(false)}>Cerrar</Button>
                </div>
              </div>)}
          </CardBody>
        </Card>
      </Col>
      <Col>
        <Card>
          <CardHeader icon={<FileUp />} title="Postulación inicial" desc="Se compara lo que dijo en su instancia con lo que responde en la entrevista." />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={<FileUp />} onClick={() => fileRef.current?.click()}>Subir .txt o .pdf</Button>
              <Button variant="outline" size="sm" icon={<Wand2 />} onClick={() => {
                if (!A.post.trim()) { toast("Primero pegá o subí la postulación", "err"); return; }
                const P = parsePost(A.post) as Record<string, string>; let c = 0;
                up(x => { for (const [k, , ex] of RTD_F as [keyof R, string, number][]) { if (ex && P[k as string] && !String(x[k] || "").trim()) { (x[k] as string) = k === "cid" ? P[k as string].toUpperCase() : P[k as string]; c++; } } if (x.fnac && !x.edad) { const a = rtdAge(x.fnac); if (a) x.edad = a; } });
                setTimeout(() => toast(c ? `Se completaron ${c} ${c === 1 ? "campo" : "campos"} vacíos con la postulación` : "No había datos personales vacíos para completar"), 0);
              }}>Autocompletar datos</Button>
              {A.post && <Button variant="ghost" size="sm" className="text-red-600" icon={<Trash2 />} onClick={() => up(x => { x.post = ""; })}>Quitar</Button>}
              <input ref={fileRef} type="file" accept=".txt,.pdf,.md,text/plain,application/pdf" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                try { toast("Leyendo " + f.name + "…"); const tx = await fileText(f); if (!tx) { toast("El archivo no tiene texto para leer", "err"); return; } up(x => { x.post = tx; }); toast("Postulación cargada · revisá el contraste"); } catch (err) { toast((err as Error).message || "No se pudo leer el archivo", "err"); } }} />
            </div>
            <Textarea rows={3} value={A.post} onChange={set("post")} placeholder="…o pegá acá el mensaje de su postulación" />
            {cmp.length ? <>
              <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="text-emerald-600 dark:text-emerald-400">{n("ok")} coinciden</span>·<span className="text-amber-600 dark:text-amber-400">{n("mid")} parciales</span>·<span className="text-red-600 dark:text-red-400">{n("no")} difieren</span>·<span className="text-slate-400">{n("nd")} sin dato</span></div>
              <div className="grid gap-2 sm:grid-cols-2">{cmp.map(x => (
                <div key={x.k} className={cn("rounded-xl border p-2.5 text-xs", CMP_C[x.s])}>
                  <div className="mb-1 flex items-center justify-between"><b className="text-sm">{x.l}</b><span className="text-[11px] font-semibold text-slate-500">{(CMP_L as Record<string, string>)[x.s]}</span></div>
                  <p className="truncate text-slate-500" title={x.p}><span className="font-semibold">Postulación:</span> {x.p || "—"}</p>
                  <p className="truncate text-slate-500" title={String(x.e)}><span className="font-semibold">Entrevista:</span> {String(x.e) || "—"}</p>
                </div>))}</div>
            </> : <p className="text-xs text-slate-400">Pegá o subí la postulación del aspirante para comparar lo que dijo en su instancia con lo que responde en la entrevista.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Check />} title="Resultado" />
          <CardBody>
            <Segmented value={A.res || ""} onChange={v => up(x => { x.res = v; })} options={[{ value: "apto", label: "Apto" }, { value: "pend", label: "Pendiente" }, { value: "noapto", label: "No apto" }]} />
            <Field label="Observaciones"><Textarea rows={2} value={A.nota} onChange={set("nota")} placeholder="Comentarios finales de los entrevistadores" /></Field>
          </CardBody>
        </Card>
        <RtdOut text={text} parts={parts} errs={showErr ? errs : undefined}
          footer={<><Button variant="ghost" onClick={async () => { if (!(await confirm("¿Empezar una entrevista nueva? Se borran los datos cargados."))) return; LS.del(myKey("rtdDraft", me.n)); setA(NEW(me.n)); setShowErr(false); setPick(false); }}>Nueva entrevista</Button>
            <Button icon={<Save />} onClick={save}>{A.id ? "Guardar cambios" : "Guardar en el registro"}</Button></>} />
      </Col>
    </Split>
  );
}
function RtdOut({ text, parts, errs, footer }: { text: string; parts: string[]; errs?: string[]; footer: React.ReactNode }) {
  const copy = useCopy();
  return <DiscordOutput sticky={false} title="Entrevista para el canal" tag="Discord" text={text} errors={errs} footer={footer}
    extra={parts.length > 1 && <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">{parts.length} partes:{parts.map((p, i) => <Button key={i} size="sm" variant="outline" onClick={() => copy(p, errs)}>{i + 1}/{parts.length}</Button>)}</span>} />;
}

function RtdList({ open, setOpen, onEdit }: { open: string | null; setOpen: (v: string | null) => void; onEdit: (r: R) => void }) {
  const me = useMe(), { confirm } = useFeedback(), copy = useCopy();
  const [L, setL] = useJSON<R[]>("lspdt.rtdEnt", []);
  const cnt = (k: string) => L.filter(r => r.res === k).length, S = L.slice().sort((a, b) => (b.t || 0) - (a.t || 0));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([[L.length, "Entrevistas", ""], [cnt("apto"), "Aptos", "text-emerald-600 dark:text-emerald-400"], [cnt("pend"), "Pendientes", "text-amber-600 dark:text-amber-400"], [cnt("noapto"), "No aptos", "text-red-600 dark:text-red-400"]] as const).map(([n, k, c]) => (
          <Card key={k} className="p-4"><p className={cn("text-2xl font-bold tabular-nums", c)}>{n}</p><p className="text-xs text-slate-500">{k}</p></Card>))}
      </div>
      <Card>
        {!S.length ? <Empty icon={<GraduationCap />} title="Todavía no hay entrevistas registradas" /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{S.map(r => {
          r.casos = r.casos || []; const [s, c] = RES[r.res] || RES.pend, [ok, tot] = rtdScore(r), isO = open === r.id, can = r.por === me.n || me.l >= 8 || me.admin, t = isO ? rtdText(r) : "", P = isO ? dcParts(t) : [];
          return (
            <div key={r.id}>
              <button onClick={() => setOpen(isO ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{initials(r.asp || "?")}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.asp}{r.cid && <span className="ml-1.5 font-mono text-xs font-normal text-slate-400">· {r.cid}</span>}</p>
                  <p className="truncate text-xs text-slate-500">{r.fecha} · {joinY(r.ent || [])}</p><p className="truncate text-xs text-slate-400">{tot ? `${ok}/${tot} casos correctos` : "Casos sin evaluar"} · registrada por {r.por}</p></div>
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase", c)}>{s}</span>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isO && "rotate-180")} />
              </button>
              {isO && <div className="space-y-3 bg-slate-50/60 p-4 dark:bg-slate-950/30">
                <pre className="scrollbar-thin max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-slate-200">{t}</pre>
                <div className="flex flex-wrap items-center gap-2">
                  {can && <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={async () => { if (await confirm("¿Eliminar la entrevista del registro?", { danger: true, ok: "Eliminar" })) setL(L.filter(x => x.id !== r.id)); }}>Eliminar</Button>}
                  <span className="flex-1" />
                  {P.length > 1 && P.map((p, i) => <Button key={i} size="sm" variant="outline" onClick={() => copy(p)}>Parte {i + 1}/{P.length}</Button>)}
                  <Button variant="outline" size="sm" icon={<Pencil />} onClick={() => onEdit(r)}>Editar</Button>
                  <Button size="sm" icon={<Copy />} onClick={() => copy(t)}>Copiar</Button>
                </div>
              </div>}
            </div>); })}</div>}
      </Card>
    </div>
  );
}
