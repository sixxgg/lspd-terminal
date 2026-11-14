import { useEffect, useMemo, useState } from "react";
import { UserRound, Crosshair, MapPin, Users, PenLine, Plus, Trash2, FilePlus2, Save, Pencil, ChevronDown, ShieldAlert, Inbox } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, Chip, Empty, Field, Input, Segmented, Textarea, SearchInput } from "@/components/ui";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { CopyMenu, DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { DIVISIONES, LUGARES, getRoster, findAgent, fmtDate, hoyDMY, isDMY, lvl, maskDMY, maskHM, norm, profOf, rankES, uid , myKey } from "@/lib/domain";
import { LS, useJSON } from "@/lib/store";
import { infNew } from "@/lib/penal";
import type { InfX } from "./InfViewer";
import { cn } from "@/lib/cn";

const ARMAS = ["Pistola de combate", "Pistola reglamentaria", "Pistola pesada", "Táser", "Escopeta de corredera", "Carabina", "Subfusil (SMG)", "Rifle"];
const ACCES = ["Linterna", "Mira", "Cargadores de repuesto", "Cargador ampliado", "Empuñadura", "Silenciador"];
const TIPOS = [["ext", "Extravío"], ["rob", "Sustracción / robo"], ["arr", "Arrebato en intervención"], ["otro", "Otro"]] as const;
type Tipo = typeof TIPOS[number][0];
type Testigo = { n: string; r: string };
/* misma estructura que la versión clásica (clave compartida lspdt.perdArm) */
export type PerdArm = { ag: string; dv: string; sup: string; arma: string; serie: string; acc: string[]; accx: string; mun: string; fasig: string;
  fecha: string; hora: string; lugar: string; sit: "srv" | "fuera"; tipo: Tipo; tipox: string; hdet: string; relato: string; tes: Testigo[]; decl: boolean;
  id?: string; texto?: string; t?: number; por?: string; edit?: string };
const nuevo = (me: string): PerdArm => ({ ag: "", dv: "", sup: me, arma: "", serie: "", acc: [], accx: "", mun: "", fasig: "", fecha: hoyDMY(), hora: "", lugar: "",
  sit: "srv", tipo: "ext", tipox: "", hdet: "", relato: "", tes: [{ n: "", r: "" }], decl: true });

const box = (on: boolean, l: string) => `${on ? "☒" : "☐"} ${l}`;
export function perdText(A: PerdArm) {
  const a = findAgent(A.ag), q = (s?: string) => (s || "").trim(), acc = [...A.acc, ...(q(A.accx) ? [q(A.accx)] : [])];
  const rel = q(A.relato) ? q(A.relato).split("\n").map(l => "> " + l).join("\n") : "> (Describir de forma cronológica y detallada qué pasó, dónde fue la última vez que se vio el arma y cómo se detectó la pérdida.)";
  const T = A.tes.filter(t => q(t.n));
  const tes = (T.length ? T : [{ n: "", r: "" }]).map((t, i) => { const x = findAgent(t.n); return `**${i + 1}.** ${q(t.n) || "Nombre"} — ${x?.p ? "#" + x.p : "Placa"} / ${q(t.r) || "Rol"}`; });
  return [
    "# 🚨 INFORME DE INCIDENTE — PÉRDIDA DE ARMA DE SERVICIO", "**Los Santos Police Department · Uso interno · Confidencial**", "",
    "## 👮 DATOS DEL AGENTE", `**Nombre y apellido:** ${A.ag}`, `**Rango:** ${a ? rankES(a.r) : ""}`, `**N.º de placa:** ${a?.p || ""}`, `**División / Unidad:** ${q(A.dv)}`, `**Supervisor directo:** ${q(A.sup)}`, "",
    "## 🔫 DATOS DEL ARMA", `**Tipo / Modelo:** ${q(A.arma)}`, `**N.º de serie:** ${q(A.serie)}`, `**Accesorios asignados:** ${acc.length ? acc.join(", ") : "Ninguno"}`,
    `**Munición en el arma al momento de la pérdida:** ${q(A.mun)}`, `**Fecha de asignación:** ${q(A.fasig)}`, "",
    "## 📍 CIRCUNSTANCIAS", `**Fecha de la pérdida:** \`${q(A.fecha) || "DD/MM/AAAA"}\`  **Hora aprox.:** \`${q(A.hora) || "00:00"}\``, `**Lugar (calle / zona / código postal):** ${q(A.lugar)}`,
    `**Situación:** ${box(A.sit === "srv", "En servicio")}  ${box(A.sit === "fuera", "Fuera de servicio")}`,
    `**Tipo de pérdida:** ${TIPOS.map(([k, l]) => box(A.tipo === k, k === "otro" ? `Otro:${A.tipo === "otro" && q(A.tipox) ? " " + q(A.tipox) : ""}` : l)).join("  ")}`,
    `**Hora en que se detectó la falta:** \`${q(A.hdet) || "00:00"}\``, "", "**Relato de los hechos:**", rel, "",
    "## 👥 TESTIGOS / UNIDADES PRESENTES", ...tes, "",
    ...(A.decl ? ["## ✍️ DECLARACIÓN DEL AGENTE", "> Declaro que la información aportada es veraz y completa, y que soy consciente de que, conforme al Art. 5, respondo por la pérdida del equipamiento asignado."] : []),
    "━━━━━━━━━━━━━━━━━━━━", "*Documento interno del LSPD. Prohibida su divulgación fuera de los canales oficiales.*",
  ].join("\n");
}
/* cada pérdida de arma también queda como informe (lspdt.informes), con id fijo para no duplicarlo y su historial */
const INF = "lspdt.informes";
function toInf(A: PerdArm, by: string) {
  /* los informes viejos sin número fijo se numeran por orden de registro antes de sumar uno nuevo (así no se corre la numeración) */
  const L0 = LS.json<InfX[]>(INF, []), ord = L0.slice().sort((p, q) => (p.t || 0) - (q.t || 0)).map(x => x.id);
  const L = L0.map(x => (x.no ? x : { ...x, no: ord.indexOf(x.id) + 1 })), id = "parm-" + A.id, old = L.find(x => x.id === id), tipo = TIPOS.find(x => x[0] === A.tipo)?.[1] || "";
  const unid = [{ n: A.ag, r: "Agente afectado" }, ...A.tes.filter(t => t.n.trim()).map(t => ({ n: t.n.trim(), r: t.r.trim() || "Testigo" }))];
  const f: Partial<InfX> = { fecha: A.fecha, hora: A.hora, ui: A.lugar, ux: "", uf: "", tipos: ["Pérdida de arma de servicio"], motivo: A.tipo === "otro" && A.tipox.trim() ? A.tipox.trim() : tipo, hechos: A.relato, unid,
    ev: [{ t: "Arma", d: [A.arma, A.serie && `N.º de serie ${A.serie}`].filter(Boolean).join(" · ") }] as InfX["ev"], texto: A.texto || perdText(A), src: "parm", sid: A.id };
  if (old) { LS.setJSON(INF, L.map(x => (x.id === id ? { ...x, ...f, edit: by, et: Date.now(), hist: [...(x.hist || []), { t: Date.now(), by, a: "Editó el informe de pérdida de arma" }] } : x))); return; }
  const no = Math.max(0, ...L.map(x => x.no || 0)) + 1;
  LS.setJSON(INF, [...L, { ...infNew(), suj: [], ...f, id, no, st: "rev", tags: ["Pérdida de arma"], por: A.por || by, t: A.t || Date.now(), hist: [{ t: Date.now(), by, a: "Registró el informe (pérdida de arma)" }] } as InfX]);
}
const errsOf = (A: PerdArm) => [!A.ag && "agente", !A.arma.trim() && "tipo de arma", !A.serie.trim() && "n.º de serie", !isDMY(A.fecha) && "fecha",
  !A.lugar.trim() && "lugar", !A.relato.trim() && "relato"].filter(Boolean) as string[];

export function PerdidaArmamento({ me }: { me: { n: string; r: string } }) {
  const [tab, setTab] = useState<"new" | "list">("new");
  const [A, setA] = useState<PerdArm>(() => { try { const d = localStorage.getItem(myKey("paDraft", me.n)); if (d) return { ...nuevo(me.n), ...JSON.parse(d) }; } catch { /* */ } return nuevo(me.n); });
  const [list, setList] = useJSON<PerdArm[]>("lspdt.perdArm", []);
  const { toast, confirm } = useFeedback();
  useEffect(() => { try { localStorage.setItem(myKey("paDraft", me.n), JSON.stringify(A)); } catch { /* */ } }, [A]);
  /* las que se registraron antes de esto también pasan a Informes (una sola vez cada una) */
  useEffect(() => { const have = new Set(LS.json<InfX[]>(INF, []).map(x => x.id)); list.filter(r => r.id && !have.has("parm-" + r.id)).forEach(r => toInf(r, r.por || me.n)); }, [list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof PerdArm>(k: K, v: PerdArm[K]) => setA(x => ({ ...x, [k]: v }));
  const text = useMemo(() => perdText(A), [A]);
  const errs = errsOf(A);
  const ag = A.ag ? findAgent(A.ag) : null;

  async function save() {
    if (errs.length) { toast("Falta completar: " + errs.join(", "), "err"); return; }
    const r: PerdArm = { ...structuredClone(A), texto: perdText(A), t: Date.now(), por: A.por || me.n };
    const fin = { ...r, id: A.id || uid() };
    if (A.id) setList(list.map(x => (x.id === A.id ? { ...x, ...fin, edit: me.n } : x)));
    else setList([...list, fin]);
    toInf(fin, me.n);
    setA(nuevo(me.n)); setTab("list"); toast(A.id ? "Cambios guardados · también en Informes" : "Informe registrado · también quedó en Informes");
  }
  async function reset() { if (await confirm("¿Empezar un informe nuevo? Se borran los datos cargados.")) setA(nuevo(me.n)); }

  return (
    <div className="space-y-5">
      <Segmented value={tab} onChange={setTab} options={[{ value: "new", label: A.id ? "Editando informe" : "Nuevo informe", icon: <FilePlus2 /> }, { value: "list", label: `Registrados (${list.length})`, icon: <Inbox /> }]} />
      {tab === "list" ? <Registro list={list} me={me} onEdit={r => { setA({ ...nuevo(me.n), ...structuredClone(r) }); setTab("new"); }}
        onDelete={async id => { if (await confirm("¿Eliminar el informe del registro?", { ok: "Eliminar", danger: true })) setList(list.filter(x => x.id !== id)); }} /> : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader icon={<UserRound />} title="Datos del agente" desc="Elegí al agente: nombre, rango y placa se completan solos." />
              <CardBody>
                {ag ? (
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-500/25 dark:bg-red-500/5">
                    <Avatar n={ag.n} size={40} />
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{ag.n}</p><div className="mt-0.5 flex flex-wrap items-center gap-1.5"><RankBadge r={ag.r} />{ag.p && <Badge>Placa #{ag.p}</Badge>}</div></div>
                    <Button variant="ghost" size="sm" onClick={() => set("ag", "")}>Cambiar</Button>
                  </div>
                ) : <AgentPicker value={A.ag} onChange={n => { const p = profOf(n); setA(x => ({ ...x, ag: n, dv: x.dv || p.main || p.div?.[0] || "Patrulla" })); }} max={240} />}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="División / Unidad"><Input list="pa-dv" value={A.dv} onChange={e => set("dv", e.target.value)} placeholder="Patrulla, Metropolitan Division…" /></Field>
                  <Field label="Supervisor directo"><Input list="pa-roster" value={A.sup} onChange={e => set("sup", e.target.value)} placeholder="Nombre del supervisor" /></Field>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={<Crosshair />} title="Datos del arma" />
              <CardBody>
                <Field label="Tipo / Modelo">
                  <div className="flex flex-wrap gap-1.5">{ARMAS.map(x => <Chip key={x} active={A.arma === x} onClick={() => set("arma", A.arma === x ? "" : x)}>{x}</Chip>)}</div>
                  <Input className="mt-2" value={A.arma} onChange={e => set("arma", e.target.value)} placeholder="O escribí el modelo exacto" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="N.º de serie"><Input className="font-mono uppercase" value={A.serie} onChange={e => set("serie", e.target.value.toUpperCase())} placeholder="LSPD-0451" /></Field>
                  <Field label="Munición en el arma"><Input value={A.mun} onChange={e => set("mun", e.target.value)} placeholder="Ej: 12 cartuchos" /></Field>
                </div>
                <Field label="Accesorios asignados">
                  <div className="flex flex-wrap gap-1.5">{ACCES.map(x => <Chip key={x} active={A.acc.includes(x)} onClick={() => set("acc", A.acc.includes(x) ? A.acc.filter(y => y !== x) : [...A.acc, x])}>{x}</Chip>)}</div>
                  <Input className="mt-2" value={A.accx} onChange={e => set("accx", e.target.value)} placeholder="Otro accesorio (opcional)" />
                </Field>
                <Field label="Fecha de asignación" className="sm:w-1/2"><Input inputMode="numeric" value={A.fasig} onChange={e => set("fasig", maskDMY(e.target.value))} placeholder="dd/mm/aaaa" /></Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={<MapPin />} title="Circunstancias" />
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Fecha de la pérdida"><Input inputMode="numeric" value={A.fecha} onChange={e => set("fecha", maskDMY(e.target.value))} placeholder="dd/mm/aaaa" /></Field>
                  <Field label="Hora aprox."><Input inputMode="numeric" value={A.hora} onChange={e => set("hora", maskHM(e.target.value))} placeholder="00:00" /></Field>
                  <Field label="Se detectó a las"><Input inputMode="numeric" value={A.hdet} onChange={e => set("hdet", maskHM(e.target.value))} placeholder="00:00" /></Field>
                </div>
                <Field label="Lugar" hint="(calle / zona / código postal)"><Input list="pa-lug" value={A.lugar} onChange={e => set("lugar", e.target.value)} placeholder="Ej: Vinewood Blvd · Zona 7321" /></Field>
                <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                  <Field label="Situación"><Segmented size="sm" value={A.sit} onChange={v => set("sit", v)} options={[{ value: "srv", label: "En servicio" }, { value: "fuera", label: "Fuera de servicio" }]} /></Field>
                  <Field label="Tipo de pérdida"><Segmented size="sm" value={A.tipo} onChange={v => set("tipo", v)} options={TIPOS.map(([value, label]) => ({ value, label }))} /></Field>
                </div>
                {A.tipo === "otro" && <Input value={A.tipox} onChange={e => set("tipox", e.target.value)} placeholder="Describí el tipo de pérdida" autoFocus />}
                <Field label="Relato de los hechos"><Textarea rows={4} value={A.relato} onChange={e => set("relato", e.target.value)} placeholder="Cronológico y detallado: qué pasó, dónde se vio el arma por última vez y cómo se detectó la pérdida." /></Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={<Users />} title="Testigos / unidades presentes" action={<Button variant="outline" size="sm" icon={<Plus />} onClick={() => set("tes", [...A.tes, { n: "", r: "" }])}>Añadir</Button>} />
              <CardBody>
                {A.tes.map((t, i) => {
                  const x = findAgent(t.n);
                  return (
                    <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                      <div className="relative"><Input list="pa-roster" value={t.n} onChange={e => set("tes", A.tes.map((y, j) => (j === i ? { ...y, n: e.target.value } : y)))} placeholder="Nombre" />
                        {x?.p && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">#{x.p}</span>}</div>
                      <Input value={t.r} onChange={e => set("tes", A.tes.map((y, j) => (j === i ? { ...y, r: e.target.value } : y)))} placeholder="Rol (compañero de unidad, testigo civil…)" />
                      <Button variant="ghost" size="icon" aria-label="Quitar testigo" onClick={() => set("tes", A.tes.length > 1 ? A.tes.filter((_, j) => j !== i) : [{ n: "", r: "" }])}><Trash2 /></Button>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={<PenLine />} title="Declaración del agente" />
              <CardBody><Checkbox checked={A.decl} onChange={v => set("decl", v)} label="Incluir la declaración del Art. 5 (responde por la pérdida del equipamiento asignado)" /></CardBody>
            </Card>
          </div>

          <DiscordOutput title="Pérdida de armamento" text={text} errors={errs}
            footer={<><Button variant="ghost" onClick={reset}>Nuevo informe</Button><Button icon={<Save />} onClick={save}>{A.id ? "Guardar cambios" : "Registrar informe"}</Button></>} />
        </div>
      )}
      <datalist id="pa-dv">{DIVISIONES.map(d => <option key={d} value={d} />)}</datalist>
      <datalist id="pa-lug">{LUGARES.map(d => <option key={d} value={d} />)}</datalist>
      <RosterList id="pa-roster" />
    </div>
  );
}

function RosterList({ id }: { id: string }) {
  return <datalist id={id}>{getRoster().filter(a => lvl(a.r) > 0).map(a => a.n).sort().map(n => <option key={n} value={n} />)}</datalist>;
}

function Registro({ list, me, onEdit, onDelete }: { list: PerdArm[]; me: { n: string; r: string }; onEdit: (r: PerdArm) => void; onDelete: (id: string) => void }) {
  const [q, setQ] = useState(""), [open, setOpen] = useState<string | null>(null);
  const L = list.slice().sort((a, b) => (b.t || 0) - (a.t || 0)).filter(r => !q || norm(r.texto || perdText(r)).includes(norm(q)));
  const canEdit = (r: PerdArm) => r.por === me.n || lvl(me.r) >= 8;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <SearchInput className="w-full max-w-sm" value={q} onChange={setQ} placeholder="Buscar agente, serie, lugar…" />
        <span className="text-xs text-slate-400">{L.length} de {list.length}</span>
      </div>
      {!L.length ? <Empty icon={<ShieldAlert />} title={list.length ? "Nada coincide con la búsqueda" : "Todavía no hay informes"} desc={list.length ? undefined : "Los informes que registres aparecen acá, con buscador y para copiar de nuevo."} /> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {L.map(r => {
            const isOpen = open === r.id, txt = r.texto || perdText(r);
            return (
              <li key={r.id}>
                <button onClick={() => setOpen(isOpen ? null : r.id!)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/40">
                  <Avatar n={r.ag} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.ag} · {r.arma}{r.serie && <span className="ml-1 font-mono text-xs text-slate-400">{r.serie}</span>}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.fecha} {r.hora} · {r.lugar} · registrado por {r.por}{r.t ? ` · ${fmtDate(r.t)}` : ""}</p>
                  </div>
                  <Badge color={r.tipo === "rob" || r.tipo === "arr" ? "#ef4444" : "#f59e0b"}>{TIPOS.find(x => x[0] === r.tipo)?.[1]}</Badge>
                  <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-3 bg-slate-50/60 px-4 pb-4 pt-1 dark:bg-slate-900/40">
                    <pre className="scrollbar-thin max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-[12px] leading-relaxed text-slate-200">{txt}</pre>
                    <div className="flex flex-wrap justify-end gap-2">
                      {canEdit(r) && <Button variant="ghost" size="sm" icon={<Trash2 />} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => onDelete(r.id!)}>Eliminar</Button>}
                      {canEdit(r) && <Button variant="outline" size="sm" icon={<Pencil />} onClick={() => onEdit(r)}>Editar</Button>}
                      <CopyMenu text={txt} variant="primary" />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
