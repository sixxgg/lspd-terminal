import { useEffect, useMemo, useState } from "react";
import { Siren, MapPin, Flame, Swords, HeartPulse, PenLine, FilePlus2, Inbox, ChevronDown, Check, X, RotateCcw, Copy, Trash2, Bold } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Chip, Empty, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { DiscordOutput, useCopy } from "@/components/output";
import { TagInput } from "@/components/fields";
import { Col, Split } from "@/components/layout";
import { useFeedback } from "@/components/feedback";
import { ALT_ARMAS, ALT_CONS, ALT_FRASES, ALT_HECHOS, ALT_PUNTOS, CONS_MAP, altText, annText, plazoTxt } from "@/legacy/alerta";
import { LUGARES, fmtDate, joinY, lvl, norm, rankES, uid , myKey } from "@/lib/domain";
import { dcfg } from "@/lib/templates";
import { useMe } from "@/lib/me";
import { LS, useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";

type Alt = { tipo: string; nivel: string; puntos: string[]; lugares: string[]; hechos: string[]; sujetos: string; armas: string[]; extra: string; cons: Record<string, string>; otras: string; inc: string };
type Res = { nivel: string; ini: number; fin: number; dias: number; horas: number; nota: string; por: { n: string; r: string }; t: number };
type Sol = Alt & { id: string; t: number; autor: { n: string; r: string }; firma: string; texto: string; estado: "pendiente" | "aprobada" | "rechazada"; res?: Res };
const NEW = (): Alt => ({ tipo: "elevacion", nivel: "2", puntos: ["Los Santos"], lugares: [], hechos: [], sujetos: "", armas: [], extra: "", cons: { oh: "", cc: "" }, otras: "", inc: "" });
const vig = (r: Sol) => { if (r.estado !== "aprobada" || !r.res) return ""; const now = Date.now() / 1000; return now < r.res.ini ? "programada" : now <= r.res.fin ? "vigente" : "finalizada"; };
const ST = { pendiente: ["Pendiente", "#f59e0b"], aprobada: ["Aprobada", "#22c55e"], rechazada: ["Rechazada", "#ef4444"] } as const;
const dtLocal = (d: Date) => { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

export function Alerta() {
  const me = useMe(), { toast } = useFeedback();
  const [tab, setTab] = useState<"new" | "list">("new");
  const [A, setA] = useState<Alt>(() => ({ ...NEW(), ...LS.json<Partial<Alt>>(myKey("altDraft", me.n), {}) }));
  const firmaDef = `${rankES(me.r)} ${me.n}${me.p ? "\nPlaca #" + me.p : ""}\nLos Santos Police Department`;
  const [firma, setFirma] = useState(() => LS.get(myKey("altFirma", me.n)) || firmaDef);
  const [list, setList] = useJSON<Sol[]>("lspdt.alertas", []);
  const [reuse, setReuse] = useState(0);
  useEffect(() => { LS.set(myKey("altDraft", me.n), JSON.stringify(A)); }, [A]);
  const set = <K extends keyof Alt>(k: K, v: Alt[K]) => setA(x => ({ ...x, [k]: v }));
  const text = useMemo(() => altText(A, firma.trim()) as string, [A, firma]);
  const errs = [!A.puntos.length && "puntos afectados", !A.lugares.length && "al menos un lugar", !A.hechos.length && !A.extra.trim() && "acontecimientos",
    !Object.keys(A.cons).length && !A.otras.trim() && "consecuencias", A.inc.length < 4 && "n.º de incidente", !firma.trim() && "firma"].filter(Boolean) as string[];
  const copy = useCopy();
  const toggle = (k: "hechos" | "armas", v: string) => set(k, A[k].includes(v) ? A[k].filter(x => x !== v) : [...A[k], v]);
  const save = () => {
    if (errs.length) { toast("Falta completar: " + errs.join(", "), "err"); return; }
    setList([...list, { ...structuredClone(A), id: uid(), t: Date.now(), autor: { n: me.n, r: me.r }, firma: firma.trim(), texto: text, estado: "pendiente" }]);
    setA(NEW()); setTab("list"); toast("Solicitud registrada · queda pendiente de aprobación");
  };
  const addLugar = (l: string[]) => { const nuevos = l.filter(x => !A.lugares.includes(x)), p = ALT_PUNTOS.filter((x: string) => nuevos.some(y => norm(y) === norm(x)) && !A.puntos.includes(x));
    setA(a => ({ ...a, lugares: l, puntos: p.length ? [...a.puntos, ...p] : a.puntos })); };
  const frases = (ALT_FRASES as { n: string }[]).map(f => f.n);
  const [fq, setFq] = useState("");
  const sugs = fq.trim().length >= 2 ? frases.filter(f => norm(f).includes(norm(fq))).slice(0, 6) : [];

  return (
    <div className="space-y-5" key={reuse}>
      <Segmented value={tab} onChange={setTab} options={[{ value: "new", label: "Nueva solicitud", icon: <FilePlus2 /> }, { value: "list", label: `Solicitudes (${list.length})`, icon: <Inbox /> }]} />
      {tab === "list" ? <Lista list={list} setList={setList} onReuse={r => { setA({ ...NEW(), ...structuredClone({ tipo: r.tipo || "elevacion", nivel: r.nivel, puntos: r.puntos, lugares: r.lugares, hechos: r.hechos, sujetos: r.sujetos, armas: r.armas, extra: r.extra, cons: r.cons, otras: r.otras }), inc: "" }); setTab("new"); setReuse(x => x + 1); toast("Datos cargados en una solicitud nueva · completá el número de incidente"); }} /> : (
        <Split>
          <Col>
            <Card>
              <CardHeader icon={<Siren />} title="Solicitud" />
              <CardBody>
                <div className="flex flex-wrap gap-4">
                  <Field label="Tipo"><Segmented value={A.tipo} onChange={v => set("tipo", v)} options={[{ value: "elevacion", label: "Elevación" }, { value: "ampliacion", label: "Ampliación" }]} /></Field>
                  <Field label="Nivel solicitado"><Segmented value={A.nivel} onChange={v => set("nivel", v)} options={["1", "2", "3"].map(n => ({ value: n, label: `Nivel ${n}` }))} /></Field>
                  <Field label="Incidente"><div className="flex items-center gap-1.5"><span className="font-mono text-sm text-slate-400">C-</span><Input className="w-24 font-mono uppercase" value={A.inc} maxLength={4} onChange={e => set("inc", e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 4))} placeholder="XXXX" /></div></Field>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={<MapPin />} title="Zonas afectadas" />
              <CardBody>
                <Field label="Puntos"><div className="flex flex-wrap gap-1.5">{ALT_PUNTOS.map((p: string) => <Chip key={p} active={A.puntos.includes(p)} onClick={() => set("puntos", A.puntos.includes(p) ? A.puntos.filter(x => x !== p) : ALT_PUNTOS.filter((x: string) => x === p || A.puntos.includes(x)))}>{p}</Chip>)}</div></Field>
                <Field label="Lugares" hint="(zonas o calles · Enter para agregar)"><TagInput value={A.lugares} onChange={addLugar} suggestions={LUGARES} placeholder="Ej: Grove Street, Davis…" /></Field>
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={<Flame />} title="Acontecimientos" desc={A.hechos.length ? `${A.hechos.length} seleccionados · el orden es el de selección` : "Tocá los hechos que ocurrieron"} />
              <CardBody>
                {(ALT_HECHOS as [string, string[]][]).map(([c, l]) => (
                  <div key={c}><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{c}</p>
                    <div className="flex flex-wrap gap-1.5">{l.map(h => <Chip key={h} active={A.hechos.includes(h)} onClick={() => toggle("hechos", h)}>{h.replace(/^(un|una|el|la) /, "")}</Chip>)}</div></div>
                ))}
                <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                  <Field label="Sujetos armados"><Input inputMode="numeric" value={A.sujetos} onChange={e => set("sujetos", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="aprox." /></Field>
                  <Field label="Armamento"><div className="flex flex-wrap gap-1.5">{(ALT_ARMAS as string[]).map(a => <Chip key={a} active={A.armas.includes(a)} onClick={() => toggle("armas", a)}><Swords />{a}</Chip>)}</div></Field>
                </div>
                <Field label="Texto libre" hint="(opcional · se agrega al relato)">
                  <Textarea id="altExtra" rows={3} value={A.extra} onChange={e => { set("extra", e.target.value); const m = /(?:^|[,.;:\n]|\s+y\s+)\s*([^,.;:\n]*)$/i.exec(e.target.value); setFq(m ? m[1] : ""); }} placeholder="Escribí y aparecen frases sugeridas…" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button type="button" variant="outline" size="sm" icon={<Bold />} onClick={() => { const t = document.getElementById("altExtra") as HTMLTextAreaElement, s = t.selectionStart, e = t.selectionEnd; if (s === e) { toast("Seleccioná el texto que querés en negrita", "err"); return; } set("extra", A.extra.slice(0, s) + "**" + A.extra.slice(s, e) + "**" + A.extra.slice(e)); }}>Negrita</Button>
                    {sugs.map(f => <Chip key={f} onClick={() => { const v = A.extra, q = fq; set("extra", v.slice(0, v.length - q.length) + f); setFq(""); }}>{f}</Chip>)}
                  </div>
                </Field>
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={<HeartPulse />} title="Consecuencias" desc="Dejá la cantidad vacía para «varios»." />
              <CardBody>
                {(ALT_CONS as [string, [string, string, string, string, string?, boolean?][]][]).map(([c, l]) => (
                  <div key={c}><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{c}</p>
                    <div className="flex flex-wrap gap-1.5">{l.map(([k, , p, , pre, noN]) => {
                      const on = k in A.cons;
                      return (
                        <span key={k} className={cn("inline-flex items-center overflow-hidden rounded-full border text-xs font-semibold transition", on ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400")}>
                          <button type="button" className="px-3 py-1" onClick={() => { const n = { ...A.cons }; if (on) delete n[k]; else n[k] = ""; set("cons", n); }}>{(pre ? "homicidio de " : "") + p}</button>
                          {on && !noN && <input value={A.cons[k]} onChange={e => set("cons", { ...A.cons, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="cant." inputMode="numeric" className="w-12 border-l border-brand-200 bg-white/70 px-1.5 py-1 text-center outline-none dark:border-brand-500/30 dark:bg-slate-900/50" />}
                        </span>
                      );
                    })}</div></div>
                ))}
                <Field label="Otras consecuencias" hint="(opcional)"><Input value={A.otras} onChange={e => set("otras", e.target.value)} /></Field>
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={<PenLine />} title="Firma" action={<Button variant="ghost" size="sm" onClick={() => { LS.del(myKey("altFirma", me.n)); setFirma(firmaDef); }}>Restaurar</Button>} />
              <CardBody><Textarea rows={3} value={firma} onChange={e => { setFirma(e.target.value); LS.set(myKey("altFirma", me.n), e.target.value); }} /></CardBody>
            </Card>
          </Col>
          <DiscordOutput title={`Solicitud de ${A.tipo === "ampliacion" ? "ampliación" : "elevación"} · Nivel ${A.nivel}`} tag="Escrito" text={text} errors={errs}
            footer={<>
              <Button variant="ghost" onClick={() => setA(NEW())}>Nueva</Button>
              <Button variant="outline" icon={<Copy />} onClick={() => copy(text.replace(/\*\*/g, ""), errs)}>Copiar sin negritas</Button>
              <Button onClick={save}>Registrar solicitud</Button>
            </>} />
        </Split>
      )}
    </div>
  );
}

function Lista({ list, setList, onReuse }: { list: Sol[]; setList: (l: Sol[]) => void; onReuse: (r: Sol) => void }) {
  const me = useMe(), { toast, confirm } = useFeedback(), copy = useCopy();
  const [fil, setFil] = useState("all"), [open, setOpen] = useState<string | null>(null);
  const [apr, setApr] = useState({ niv: "2", ini: dtLocal(new Date()), dias: "2", horas: "0", nota: "" });
  const L = list.slice().sort((a, b) => b.t - a.t).filter(r => fil === "all" || r.estado === fil || (fil === "vig" && vig(r) === "vigente"));
  const cnt = (k: string) => list.filter(r => r.estado === k).length;
  const upd = (id: string, f: (r: Sol) => Sol) => setList(list.map(r => (r.id === id ? f(structuredClone(r)) : r)));
  const c = dcfg();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[[list.length, "Solicitudes"], [cnt("pendiente"), "Pendientes"], [cnt("aprobada"), "Aprobadas"], [list.filter(r => vig(r) === "vigente").length, "Vigentes"], [cnt("rechazada"), "Rechazadas"]].map(([n, k]) => (
          <Card key={k} className="p-4"><p className="text-2xl font-bold tabular-nums">{n}</p><p className="text-xs text-slate-500">{k}</p></Card>
        ))}
      </div>
      <Segmented size="sm" value={fil} onChange={setFil} options={[{ value: "all", label: "Todas" }, { value: "pendiente", label: "Pendientes" }, { value: "aprobada", label: "Aprobadas" }, { value: "vig", label: "Vigentes" }, { value: "rechazada", label: "Rechazadas" }]} />
      <Card>
        {!L.length ? <Empty icon={<Siren />} title={list.length ? "Ninguna solicitud con ese filtro" : "Todavía no hay solicitudes"} desc={list.length ? undefined : "Se registran desde «Nueva solicitud»."} /> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {L.map(r => {
              const isOpen = open === r.id, v = vig(r), can = r.autor.n === me.n || me.l >= 8, nivel = r.res && r.estado === "aprobada" ? r.res.nivel : r.nivel;
              return (
                <li key={r.id}>
                  <button onClick={() => { setOpen(isOpen ? null : r.id); setApr(a => ({ ...a, niv: r.nivel })); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/40">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-lg font-black text-white", nivel === "3" ? "bg-red-600" : nivel === "2" ? "bg-orange-500" : "bg-amber-500")}>{nivel}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">C-{r.inc} · {joinY(r.puntos)}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.tipo === "ampliacion" ? "Ampliación" : "Elevación"} · {joinY(r.lugares)}</p>
                      <p className="truncate text-xs text-slate-400">Pedida por {rankES(r.autor.r)} {r.autor.n} · {fmtDate(r.t)}</p>
                    </div>
                    <Badge color={ST[r.estado][1]}>{ST[r.estado][0]}</Badge>{v && <Badge color={v === "vigente" ? "#ef4444" : v === "programada" ? "#6366f1" : "#94a3b8"}>{v}</Badge>}
                    <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="space-y-4 bg-slate-50/60 px-4 pb-4 pt-2 dark:bg-slate-900/40">
                      {r.estado === "aprobada" && r.res && <>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                          <b>Aprobada</b> · Nivel {r.res.nivel} · {plazoTxt(r.res.dias, r.res.horas)} · del {fmtDate(r.res.ini * 1000)} al {fmtDate(r.res.fin * 1000)}{r.res.nota ? ` · ${r.res.nota}` : ""} <span className="text-xs opacity-70">(registrado por {r.res.por.n})</span>
                        </div>
                        <DiscordOutput sticky={false} title="Anuncio de la alerta" text={annText(r) as string} ctx={{ roles: { [c.alertRole]: c.alertRoleName || "rol" } }} web={false} />
                      </>}
                      {r.estado === "rechazada" && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"><b>Rechazada</b>{r.res?.nota ? `: ${r.res.nota}` : ""} <span className="text-xs opacity-70">(registrado por {r.res?.por.n} · {r.res && fmtDate(r.res.t)})</span></div>}
                      {r.estado === "pendiente" && (
                        <Card className="p-4">
                          <h4 className="mb-3 text-sm font-semibold">¿Su Señoría ya respondió?</h4>
                          <div className="grid gap-3 sm:grid-cols-4">
                            <Field label="Nivel autorizado"><Select value={apr.niv} onChange={e => setApr({ ...apr, niv: e.target.value })}>{["1", "2", "3"].map(n => <option key={n}>{n}</option>)}</Select></Field>
                            <Field label="Desde"><Input type="datetime-local" value={apr.ini} onChange={e => setApr({ ...apr, ini: e.target.value })} /></Field>
                            <Field label="Plazo (días)"><Input inputMode="numeric" value={apr.dias} onChange={e => setApr({ ...apr, dias: e.target.value.replace(/\D/g, "") })} /></Field>
                            <Field label="Horas extra"><Input inputMode="numeric" value={apr.horas} onChange={e => setApr({ ...apr, horas: e.target.value.replace(/\D/g, "") })} /></Field>
                          </div>
                          <Field label="Nota (opcional)" className="mt-3"><Input value={apr.nota} onChange={e => setApr({ ...apr, nota: e.target.value })} placeholder="Ej: autorizada por el juez X / motivo del rechazo" /></Field>
                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button variant="danger" size="sm" icon={<X />} onClick={async () => { if (!(await confirm("¿Marcar la solicitud como rechazada?", { danger: true, ok: "Rechazada" }))) return; upd(r.id, x => ({ ...x, estado: "rechazada", res: { nota: apr.nota.trim(), por: { n: me.n, r: me.r }, t: Date.now() } as Res })); }}>Rechazada</Button>
                            <Button size="sm" icon={<Check />} onClick={() => {
                              const ini = Math.floor(new Date(apr.ini).getTime() / 1000), d = parseInt(apr.dias) || 0, hh = parseInt(apr.horas) || 0;
                              if (!ini || (!d && !hh)) { toast("Falta: fecha de inicio o plazo", "err"); return; }
                              upd(r.id, x => ({ ...x, estado: "aprobada", res: { nivel: apr.niv, ini, fin: ini + d * 86400 + hh * 3600, dias: d, horas: hh, nota: apr.nota.trim(), por: { n: me.n, r: me.r }, t: Date.now() } }));
                              toast("Marcada como aprobada · copiá el anuncio para Discord");
                            }}>Aprobada · generar anuncio</Button>
                          </div>
                        </Card>
                      )}
                      <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Ver el escrito enviado</summary>
                        <div className="space-y-2 p-3 pt-0"><pre className="scrollbar-thin max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-[12px] text-slate-200">{r.texto}</pre>
                          <div className="flex justify-end"><Button size="sm" variant="outline" icon={<Copy />} onClick={() => copy(r.texto)}>Copiar escrito</Button></div></div>
                      </details>
                      <div className="flex flex-wrap justify-end gap-2">
                        {r.estado !== "pendiente" && can && <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={async () => { if (await confirm("¿Volver la solicitud a pendiente? Se borra la resolución.")) upd(r.id, x => { delete x.res; return { ...x, estado: "pendiente" }; }); }}>Volver a pendiente</Button>}
                        <Button variant="outline" size="sm" onClick={() => onReuse(r)}>Usar como base</Button>
                        {can && <Button variant="ghost" size="sm" icon={<Trash2 />} className="text-red-600 dark:text-red-400" onClick={async () => { if (await confirm("¿Eliminar la solicitud del registro?", { danger: true, ok: "Eliminar" })) setList(list.filter(x => x.id !== r.id)); }}>Eliminar</Button>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
void lvl; void CONS_MAP;
