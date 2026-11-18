/* K-9 › Fichas: registro del guía y de su canino (Oficial y canino). Se guarda en la web y se edita cuando haga falta.
   «Ver ficha» arma el documento oficial (hoja blanca, membrete de la división) y lo descarga como imagen PNG.
   Datos: lspdt.k9Fichas (lista) y las fotos aparte en lspdt.k9foto.<id>.a (oficial) / .d (canino). Solo la ve la K-9. */
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowLeft, Camera, Dog, Download, Eye, FileText, Plus, Save, Search, Trash2, UserRound } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { AgentPicker } from "@/components/agents";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { LEVEL, divEmblem, findAgent, rankES, uid } from "@/lib/domain";
import { readImg } from "@/lib/patrol";
import { roleOv, uMap, unitRoles } from "@/lib/units";
import { cn } from "@/lib/cn";

type Ficha = {
  id: string; cert: string; seq: number; at: number; by: string; upd: number;
  ag: string; rdiv: string; ing: string; tel: string; ins: "Habilitadas" | "Deshabilitadas"; esp: string; est: "Activo" | "Inactivo";
  cn: string; raza: string; sexo: "Macho" | "Hembra"; nac: string; marcas: string; chip: string; hon: string; cest: "Activo" | "Inactivo"; cesp: string;
  obs: string;
};
const KEY = "lspdt.k9Fichas", fotoK = (id: string, w: "a" | "d") => `lspdt.k9foto.${id}.${w}`;
const ESP = ["Armas", "Explosivos", "Drogas", "Búsqueda de personas"];
const SEQ0 = 5; /* la primera certificación es K-9-2026-05 */
const certOf = (seq: number, y = new Date().getFullYear()) => `K-9-${y}-${String(seq).padStart(2, "0")}`;
const dmy = (d: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "—"; };
/* rangos del departamento, de mayor a menor (para el rango honorario del canino) */
const RANKS = Object.entries(LEVEL).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([r]) => r);
const divRanks = () => (roleOv("k9") || unitRoles("k9")).map(r => r.l);
const k9RoleOf = (n: string) => { const R = roleOv("k9") || unitRoles("k9"), mine = uMap("k9")[n] || []; return R.find(r => mine.includes(r.k))?.l || ""; };
const blank = (seq: number, by: string): Ficha => ({ id: uid(), cert: certOf(seq), seq, at: Date.now(), by, upd: Date.now(), ag: "", rdiv: "", ing: "", tel: "", ins: "Deshabilitadas", esp: ESP[0], est: "Activo",
  cn: "", raza: "", sexo: "Macho", nac: "", marcas: "", chip: "", hon: "", cest: "Activo", cesp: ESP[0], obs: "" });

export function K9Fichas({ canEdit }: { canEdit: boolean }) {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), [L, setL] = useJSON<Ficha[]>(KEY, []);
  const [cur, setCur] = useState<Ficha | null>(null), [q, setQ] = useState(""), [ver, setVer] = useState<Ficha | null>(null);
  const nextSeq = () => Math.max(SEQ0 - 1, ...L.map(f => f.seq || 0)) + 1;
  const list = useMemo(() => { const s = q.trim().toLowerCase();
    return [...L].sort((a, b) => b.seq - a.seq).filter(f => !s || `${f.cert} ${f.ag} ${f.cn} ${f.raza}`.toLowerCase().includes(s)); }, [L, q]);
  if (cur) return <Editor f={cur} canEdit={canEdit} onBack={() => setCur(null)} ver={ver} setVer={setVer}
    onSave={(f, fotos) => { const isNew = !L.some(x => x.id === f.id), x = { ...f, upd: Date.now() };
      if (isNew && L.some(o => o.seq === x.seq)) { x.seq = nextSeq(); x.cert = certOf(x.seq); } /* alguien creó otra a la vez */
      (["a", "d"] as const).forEach(w => { const v = fotos[w]; if (v !== undefined) { if (v) LS.set(fotoK(x.id, w), v); else LS.del(fotoK(x.id, w)); } });
      setL(isNew ? [...L, x] : L.map(o => (o.id === x.id ? x : o))); setCur(x); toast(isNew ? `Ficha ${x.cert} guardada` : "Ficha actualizada"); }}
    onDel={async () => { if (!(await confirm(`¿Borrar la ficha ${cur.cert}? No se puede deshacer.`, { danger: true, ok: "Borrar" }))) return;
      LS.del(fotoK(cur.id, "a")); LS.del(fotoK(cur.id, "d")); setL(L.filter(x => x.id !== cur.id)); setCur(null); toast("Ficha borrada"); }} />;
  return (
    <Card>
      <CardHeader icon={<FileText />} title={`Fichas K-9 · ${L.length}`} desc="Registro del guía y de su compañero canino. Se guarda acá y se edita cuando haga falta."
        action={canEdit && <Button size="sm" icon={<Plus />} onClick={() => setCur(blank(nextSeq(), me.n))}>Nueva ficha</Button>} />
      <div className="space-y-3 p-4">
        {L.length > 3 && <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por certificación, guía o canino…" className="pl-9" /></div>}
        {!list.length ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{L.length ? "Nada coincide con la búsqueda." : "Todavía no hay fichas."}</p>
          : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map(f => { const a = findAgent(f.ag), fa = LS.get(fotoK(f.id, "a")), fd = LS.get(fotoK(f.id, "d")); return (
            <button key={f.id} onClick={() => setCur(f)} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-[var(--uacc,#e6c65a)] hover:shadow-md dark:border-slate-800">
              <div className="flex shrink-0 -space-x-3">{[fa, fd].map((s, i) => <span key={i} className="grid size-12 place-items-center overflow-hidden rounded-xl bg-slate-100 ring-2 ring-white dark:bg-slate-800 dark:ring-slate-900">{s ? <img src={s} alt="" className="size-full object-cover" /> : i ? <Dog className="size-5 text-slate-400" /> : <UserRound className="size-5 text-slate-400" />}</span>)}</div>
              <div className="min-w-0 flex-1"><p className="font-mono text-[11px] font-bold text-[var(--uacc,#b8962e)]">{f.cert}</p>
                <p className="truncate text-sm font-semibold">{f.ag || "Sin guía"}{f.cn ? <span className="font-normal text-slate-500"> · {f.cn}</span> : null}</p>
                <p className="truncate text-[12px] text-slate-500">{a ? rankES(a.r) : "—"} · {f.cesp || f.esp}</p></div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold", f.est === "Activo" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/12 text-slate-500")}>{f.est}</span>
            </button>); })}</div>}
      </div>
    </Card>);
}

/* ---------- formulario ---------- */
function Editor({ f: f0, canEdit, onBack, onSave, onDel, ver, setVer }: { f: Ficha; canEdit: boolean; onBack: () => void; onSave: (f: Ficha, fotos: { a?: string; d?: string }) => void; onDel: () => void; ver: Ficha | null; setVer: (f: Ficha | null) => void }) {
  const [f, setF] = useState(f0), [fotos, setFotos] = useState<{ a?: string; d?: string }>({});
  const up = (p: Partial<Ficha>) => setF(x => ({ ...x, ...p }));
  const ag = findAgent(f.ag), dirty = JSON.stringify(f) !== JSON.stringify(f0) || fotos.a !== undefined || fotos.d !== undefined;
  const foto = (w: "a" | "d") => (fotos[w] !== undefined ? fotos[w] : LS.get(fotoK(f.id, w))) || "";
  const isNew = !LS.json<Ficha[]>(KEY, []).some(x => x.id === f.id), ro = !canEdit;
  const sel = (v: string, set: (v: string) => void, o: string[], ph?: string) => <Select value={v} disabled={ro} onChange={e => set(e.target.value)}>{ph != null && <option value="">{ph}</option>}{o.map(x => <option key={x} value={x}>{x}</option>)}</Select>;
  const pick = (n: string) => up({ ag: n, rdiv: f.rdiv || k9RoleOf(n) });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={onBack}>Fichas</Button>
        <span className="font-mono text-sm font-bold text-[var(--uacc,#b8962e)]">{f.cert}</span>{isNew && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-300">Sin guardar</span>}
        <span className="flex-1" />
        <Button size="sm" variant="outline" icon={<Eye />} onClick={() => setVer({ ...f })}>Ver ficha</Button>
        {canEdit && !isNew && <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={onDel}>Borrar</Button>}
        {canEdit && <Button size="sm" icon={<Save />} disabled={!f.ag || !dirty} onClick={() => { onSave(f, fotos); setFotos({}); }}>{isNew ? "Guardar ficha" : "Guardar cambios"}</Button>}
      </div>

      <Card>
        <CardHeader icon={<UserRound />} title="01 · Datos del oficial" />
        <div className="grid gap-5 p-5 md:grid-cols-[180px_1fr]">
          <PhotoSlot src={foto("a")} ro={ro} label="Foto del oficial" icon={<UserRound />} onSet={v => setFotos(x => ({ ...x, a: v }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" className="sm:col-span-2">{ro ? <Input value={f.ag} readOnly /> : <AgentPicker value={f.ag} onChange={pick} empty="Sin resultados" />}</Field>
            <Field label="N.° de placa"><Input value={ag?.p || ""} readOnly placeholder="Se completa al elegir el agente" /></Field>
            <Field label="Rango LSPD"><Input value={ag ? rankES(ag.r) : ""} readOnly placeholder="Se completa al elegir el agente" /></Field>
            <Field label="Rango divisional">{sel(f.rdiv, v => up({ rdiv: v }), divRanks(), "Elegí…")}</Field>
            <Field label="Fecha de ingreso a K-9"><Input type="date" value={f.ing} readOnly={ro} onChange={e => up({ ing: e.target.value })} /></Field>
            <Field label="N.° de certificación"><Input value={f.cert} readOnly className="font-mono" /></Field>
            <Field label="Teléfono | ID"><Input value={f.tel} readOnly={ro} onChange={e => up({ tel: e.target.value })} placeholder="(602) 278-8318 | Y4E7B2F6" /></Field>
            <Field label="Funciones de instrucción">{sel(f.ins, v => up({ ins: v as Ficha["ins"] }), ["Habilitadas", "Deshabilitadas"])}</Field>
            <Field label="Especialización">{sel(f.esp, v => up({ esp: v }), ESP)}</Field>
            <Field label="Estado">{sel(f.est, v => up({ est: v as Ficha["est"] }), ["Activo", "Inactivo"])}</Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Dog />} title="02 · Datos del canino" />
        <div className="grid gap-5 p-5 md:grid-cols-[180px_1fr]">
          <PhotoSlot src={foto("d")} ro={ro} label="Foto del canino" icon={<Dog />} onSet={v => setFotos(x => ({ ...x, d: v }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><Input value={f.cn} readOnly={ro} onChange={e => up({ cn: e.target.value })} placeholder="Balerion" /></Field>
            <Field label="Raza"><Input value={f.raza} readOnly={ro} onChange={e => up({ raza: e.target.value })} placeholder="American Pitbull Terrier" /></Field>
            <Field label="Sexo">{sel(f.sexo, v => up({ sexo: v as Ficha["sexo"] }), ["Macho", "Hembra"])}</Field>
            <Field label="Fecha de nacimiento"><Input type="date" value={f.nac} readOnly={ro} onChange={e => up({ nac: e.target.value })} /></Field>
            <Field label="Color y marcas" className="sm:col-span-2"><Input value={f.marcas} readOnly={ro} onChange={e => up({ marcas: e.target.value })} placeholder="Mancha blanca en pecho y patas" /></Field>
            <Field label="N.° de microchip | ID"><Input value={f.chip} readOnly={ro} onChange={e => up({ chip: e.target.value })} placeholder="Pendiente" /></Field>
            <Field label="Rango honorario"><Select value={f.hon} disabled={ro} onChange={e => up({ hon: e.target.value })}><option value="">Elegí…</option>{RANKS.map(r => <option key={r} value={r}>{rankES(r)}</option>)}</Select></Field>
            <Field label="Estado">{sel(f.cest, v => up({ cest: v as Ficha["cest"] }), ["Activo", "Inactivo"])}</Field>
            <Field label="Especialidad">{sel(f.cesp, v => up({ cesp: v }), ESP)}</Field>
            <Field label="Guía asignado" className="sm:col-span-2"><Input value={ag ? `${rankES(ag.r)} ${ag.n}` : ""} readOnly placeholder="Se completa con el oficial de arriba" /></Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<FileText />} title="Salud, vacunas, temperamento y observaciones" />
        <div className="p-5"><Textarea rows={7} value={f.obs} readOnly={ro} onChange={e => up({ obs: e.target.value })} placeholder={"Salud: óptima (sin tratamientos recientes)\nAlergias: ninguna conocida\nVacunas: pendiente 2026/2\nTemperamento: sereno · reservado · territorial · defensivo"} /></div>
      </Card>

      {ver && <Doc f={ver} fa={foto("a")} fd={foto("d")} onClose={() => setVer(null)} />}
    </div>);
}

/* foto: tocar para subir (o soltar el archivo encima); se ajusta sola al recuadro */
function PhotoSlot({ src, ro, label, icon, onSet }: { src: string; ro: boolean; label: string; icon: React.ReactNode; onSet: (v: string) => void }) {
  const inp = useRef<HTMLInputElement>(null), { toast } = useFeedback(), [over, setOver] = useState(false);
  const take = async (file?: File | null) => { if (!file || !file.type.startsWith("image/")) return; try { onSet(await readImg(file, 900)); } catch { toast("No se pudo leer la imagen", "err"); } };
  return (
    <div className="space-y-2">
      <button type="button" disabled={ro} onClick={() => inp.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); }}
        className={cn("group relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 transition dark:bg-slate-900", over ? "border-[var(--uacc,#e6c65a)]" : "border-slate-300 dark:border-slate-700", !ro && "hover:border-[var(--uacc,#e6c65a)]")}>
        {src ? <img src={src} alt="" className="absolute inset-0 size-full object-cover object-top" />
          : <span className="flex flex-col items-center gap-1.5 px-3 text-center text-[12px] text-slate-400 [&>svg]:size-8">{icon}{label}{!ro && <small className="text-[11px]">Tocá o soltá la imagen</small>}</span>}
        {src && !ro && <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/60 py-1.5 text-[12px] font-semibold text-white opacity-0 transition group-hover:opacity-100"><Camera className="size-4" />Cambiar</span>}
      </button>
      {src && !ro && <button type="button" onClick={() => onSet("")} className="w-full text-center text-[11.5px] text-slate-400 hover:text-red-500">Quitar foto</button>}
      <input ref={inp} type="file" accept="image/*" hidden onChange={e => { void take(e.target.files?.[0]); e.target.value = ""; }} />
    </div>);
}

/* ---------- documento oficial (ver en web + descargar como imagen) ---------- */
function Doc({ f, fa, fd, onClose }: { f: Ficha; fa: string; fd: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null), { toast } = useFeedback(), [busy, setBusy] = useState(false);
  const ag = findAgent(f.ag), logo = divEmblem("K-9 Division");
  const guia = ag ? `${rankES(ag.r)} ${ag.n}` : "—";
  const dl = async () => { if (!ref.current) return; setBusy(true);
    try { const url = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true, style: { margin: "0" } }); /* sin el margen automático del visor (si no, sale corrido) */
      const a = document.createElement("a"); a.download = `Ficha ${f.cert} - ${f.ag || "K-9"}.png`; a.href = url; a.click(); toast("Imagen descargada"); }
    catch { toast("No se pudo generar la imagen", "err"); } setBusy(false); };
  const R = ({ l, v }: { l: string; v?: string }) => <div className="border-b border-slate-300 py-1.5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">{l}</p><p className="mt-0.5 min-h-[14px] text-[11px] uppercase text-slate-500">{v || "—"}</p></div>;
  const Sec = ({ n, t, img, icon, rows }: { n: string; t: string; img: string; icon: React.ReactNode; rows: [string, string?][] }) => (
    <div className="mt-6"><h3 className="flex items-baseline gap-2 border-b-2 border-slate-900 pb-1 text-[13px] font-bold uppercase text-slate-900"><span className="text-[11px] text-slate-500">{n}</span>{t}</h3>
      <div className="mt-3 grid grid-cols-[150px_1fr] gap-5">
        <div className="aspect-[4/5] overflow-hidden border-2 border-slate-900 bg-slate-100">{img ? <img src={img} alt="" className="size-full object-cover object-top" /> : <div className="grid size-full place-items-center text-slate-300 [&>svg]:size-10">{icon}</div>}</div>
        <div className="grid grid-cols-2 gap-x-6 self-start">{rows.map(([l, v]) => <R key={l} l={l} v={v} />)}</div>
      </div></div>);
  return (
    <Modal open onClose={onClose} size="xl" icon={<FileText />} title={`Ficha ${f.cert}`} desc="Así queda el documento. Descargalo como imagen para pasarlo a Discord."
      footer={<><Button variant="ghost" onClick={onClose}>Cerrar</Button><Button icon={<Download />} loading={busy} onClick={() => void dl()}>Descargar imagen</Button></>}>
      <div className="overflow-x-auto rounded-xl bg-slate-200 p-3 dark:bg-slate-800">
        <div ref={ref} className="relative mx-auto w-[794px] overflow-hidden bg-white px-12 pb-8 pt-10 font-sans text-slate-900" style={{ minHeight: 1123 }}>
          {logo && <img src={logo} alt="" className="pointer-events-none absolute -left-40 top-36 aspect-square w-[620px] rounded-full object-cover opacity-[.07] grayscale" />}
          <div className="relative flex items-center justify-between bg-[#1b1b1b] px-6 py-4 text-white">
            <div><p className="text-[9px] uppercase tracking-[.12em] text-slate-300">Los Santos Police Department</p><p className="text-[22px] font-extrabold uppercase leading-tight">División K-9</p></div>
            {logo && <img src={logo} alt="" className="size-[70px] rounded-full object-cover" />}
          </div>
          <div className="relative">
            <h1 className="mt-5 border-l-4 border-slate-900 pl-2 text-[24px] font-bold leading-tight">Oficial y canino</h1>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Registro del guía y de su compañero canino · Ficha N.° {f.cert}</p>
            <Sec n="01" t="Datos del oficial" img={fa} icon={<UserRound />} rows={[["Nombre completo", f.ag], ["Placa / N.° de oficial", ag?.p], ["Rango LSPD", ag ? rankES(ag.r) : ""], ["Cargo en la división", f.rdiv],
              ["Fecha de ingreso a K-9", dmy(f.ing)], ["N.° certificación K-9", f.cert], ["Teléfono / ID", f.tel], ["Funciones de instrucción", f.ins], ["Especialización", f.esp], ["Estado", f.est]]} />
            <Sec n="02" t="Datos del canino" img={fd} icon={<Dog />} rows={[["Nombre", f.cn], ["Raza", f.raza], ["Sexo", f.sexo], ["Fecha de nacimiento", dmy(f.nac)], ["Color / marcas", f.marcas], ["N.° microchip / ID", f.chip],
              ["Rango honorario", f.hon ? rankES(f.hon) : ""], ["Estado", f.cest], ["Especialidad", f.cesp], ["Guía asignado", guia]]} />
            <div className="mt-7 min-h-[170px] border border-slate-400 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide">Salud, vacunas, temperamento y observaciones</p>
              <p className="mt-2 whitespace-pre-wrap text-[11px] uppercase leading-relaxed text-slate-500">{f.obs || "—"}</p>
            </div>
          </div>
          <div className="absolute inset-x-12 bottom-6 flex items-center justify-between border-t border-slate-900 pt-2 text-[10px]">
            <span><b>LSPD · DIVISIÓN K-9</b> <span className="ml-2 text-slate-500">Documento oficial · Uso interno</span></span><span className="text-slate-500">Página <b className="text-slate-900">1</b> de 1</span>
          </div>
        </div>
      </div>
    </Modal>);
}
