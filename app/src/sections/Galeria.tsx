/* Galería: fotos de Fivemanager que se eligen a mano y se ven en un carrusel suave (fundido con un leve acercamiento,
   pasa solo y se pausa al pasar el mouse). Las fotos activas también aparecen en el Inicio.
   La editan six, la administración y quienes estén habilitados en Administración › Galería (lspdt.galEditors).
   Se guarda en lspdt.galeria; la lista de Fivemanager la trae el servidor (la clave nunca llega al navegador). */
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Crop, Move, RotateCcw, ZoomIn, ChevronRight, ChevronUp, ChevronDown, CloudDownload, ExternalLink, Eye, EyeOff, Images, Loader2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty } from "@/components/ui";
import { Lightbox, Modal } from "@/components/modal";
import { api } from "@/lib/api";
import { LS } from "@/lib/store";
import { useFeedback } from "@/components/feedback";
import { uid } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";
import { fotoStyle, GAL_KEY, type Foto } from "@/lib/gal";

const KEY = GAL_KEY, OLD = "lspdt.six.galeria", FM = "https://app.fivemanage.com/";
/* links de imagen válidos (Fivemanager u otro https con imagen) */
const URL_RE = /https:\/\/[^\s"'<>]+/g;
const isImg = (u: string) => /fivemanager\.com|\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(u);

export function Galeria() {
  const { toast, confirm } = useFeedback(), [L, setL] = useJSON<Foto[]>(KEY, []), [txt, setTxt] = useState(""), [box, setBox] = useState(-1), [pick, setPick] = useState(false), [adj, setAdj] = useState<Foto | null>(null);
  /* la galería de antes era privada de six: se pasa una vez a la compartida */
  useEffect(() => { const o = LS.json<Foto[]>(OLD, []); if (o.length && !L.length) { setL(o); LS.del(OLD); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const addUrls = (urls: string[]) => { const have = new Set(L.map(f => f.url)), nu = urls.filter(u => !have.has(u)); if (nu.length) setL([...L, ...nu.map((url, i) => ({ id: uid(), url, on: true, at: Date.now() + i }))]); return nu.length; };
  const S = L.filter(f => f.on);
  const add = () => { const urls = [...new Set(txt.match(URL_RE) || [])].filter(isImg), have = new Set(L.map(f => f.url)), nu = urls.filter(u => !have.has(u));
    if (!urls.length) { toast("No encontré links de imagen. Copiá el link directo de cada foto en Fivemanager.", "err"); return; }
    addUrls(nu); setTxt(""); toast(nu.length ? `${nu.length} foto${nu.length > 1 ? "s" : ""} agregada${nu.length > 1 ? "s" : ""}` : "Esas fotos ya estaban"); };
  const up = (id: string, p: Partial<Foto>) => setL(L.map(f => (f.id === id ? { ...f, ...p } : f)));
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= L.length) return; const N = L.slice(); [N[i], N[j]] = [N[j], N[i]]; setL(N); };
  return (
    <div className="space-y-5">
      {S.length ? <Slider fotos={S} onOpen={i => setBox(i)} /> : <Card><Empty icon={<Images />} title="La galería está vacía" desc="Pegá abajo los links de las fotos de Fivemanager que quieras mostrar." /></Card>}
      <Card>
        <CardHeader icon={<Plus />} title="Agregar fotos" desc="Elegilas directo de tu cuenta de Fivemanager, o pegá links de imágenes."
          action={<div className="flex gap-2"><a href={FM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"><ExternalLink className="size-3.5" />Fivemanager</a>
            <Button size="sm" icon={<CloudDownload />} onClick={() => setPick(true)}>Elegir de Fivemanager</Button></div>} />
        <CardBody>
          <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={3} placeholder="https://r2.fivemanager.com/…/foto.png" className="w-full rounded-xl border border-slate-200 bg-transparent p-3 font-mono text-[12.5px] outline-none focus:border-brand-500 dark:border-slate-700"
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } }} />
          <div className="flex justify-end"><Button icon={<Plus />} disabled={!txt.trim()} onClick={add}>Agregar a la galería</Button></div>
        </CardBody>
      </Card>
      {L.length > 0 && <Card>
        <CardHeader icon={<Images />} title={`Fotos · ${S.length} de ${L.length} en el carrusel`} desc="Elegí cuáles se muestran, en qué orden y con qué texto." />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{L.map((f, i) => (
          <div key={f.id} className={cn("overflow-hidden rounded-2xl border transition", f.on ? "border-brand-500/50" : "border-slate-200 opacity-60 dark:border-slate-800")}>
            <button type="button" onClick={() => f.on && setBox(S.findIndex(x => x.id === f.id))} className="block aspect-video w-full bg-slate-900">
              <img src={f.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" style={fotoStyle(f)} /></button>
            <div className="space-y-2 p-2.5">
              <input value={f.cap || ""} onChange={e => up(f.id, { cap: e.target.value })} placeholder="Texto (opcional)" maxLength={90} className="h-8 w-full rounded-lg border border-slate-200 bg-transparent px-2 text-[12.5px] outline-none focus:border-brand-500 dark:border-slate-700" />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => up(f.id, { on: !f.on })} className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold", f.on ? "bg-brand-500/10 text-brand-600 dark:text-brand-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                  {f.on ? <><Eye className="size-3.5" />En el carrusel</> : <><EyeOff className="size-3.5" />Oculta</>}</button>
                <button type="button" onClick={() => setAdj(f)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Crop className="size-3.5" />Encuadre</button>
                <span className="flex-1" />
                <button type="button" aria-label="Antes" disabled={!i} onClick={() => mv(i, -1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"><ChevronUp className="size-4" /></button>
                <button type="button" aria-label="Después" disabled={i === L.length - 1} onClick={() => mv(i, 1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"><ChevronDown className="size-4" /></button>
                <button type="button" aria-label="Quitar" onClick={async () => { if (await confirm("¿Quitar esta foto de la galería? (en Fivemanager sigue estando)", { danger: true, ok: "Quitar" })) setL(L.filter(x => x.id !== f.id)); }} className="rounded p-1 text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button>
              </div>
            </div>
          </div>))}</div>
      </Card>}
      {adj && <Encuadre f={adj} onClose={() => setAdj(null)} onSave={p => { up(adj.id, p); setAdj(null); toast("Encuadre guardado · así se ve en el Inicio"); }} />}
      {pick && <FmPicker have={new Set(L.map(f => f.url))} onClose={() => setPick(false)} onAdd={u => { const n = addUrls(u); toast(n ? `${n} foto${n > 1 ? "s" : ""} agregada${n > 1 ? "s" : ""}` : "Esas fotos ya estaban"); setPick(false); }} />}
      {box >= 0 && S[box] && <Lightbox list={S.map(f => f.url)} i={box} cap={S[box].cap} onClose={() => setBox(-1)} onNav={setBox} />}
    </div>);
}

/* carrusel: fundido + acercamiento leve, pasa cada 5 s y se pausa con el mouse encima */
function Slider({ fotos, onOpen }: { fotos: Foto[]; onOpen: (i: number) => void }) {
  const [i, setI] = useState(0), [play, setPlay] = useState(true), [hover, setHover] = useState(false);
  const n = fotos.length, go = (k: number) => setI(((k % n) + n) % n);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  useEffect(() => { if (!play || hover || n < 2) return; const t = setTimeout(() => go(i + 1), 5000); return () => clearTimeout(t); }, [i, play, hover, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-xl dark:border-slate-800" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="relative aspect-[21/9] max-h-[68vh] w-full">
        {fotos.map((f, k) => (
          <button key={f.id} type="button" onClick={() => onOpen(k)} aria-label="Ver en grande" className={cn("absolute inset-0 transition-opacity duration-1000", k === i ? "opacity-100" : "pointer-events-none opacity-0")}>
            <img src={f.url} alt="" decoding="async" loading={Math.abs(k - i) <= 1 ? "eager" : "lazy"} className="size-full object-cover transition-transform duration-[6000ms] ease-out" style={fotoStyle(f, k === i ? 1.06 : 1)} />
          </button>))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        {fotos[i]?.cap && <p className="pointer-events-none absolute bottom-6 left-6 right-24 font-display text-2xl font-bold text-white drop-shadow-lg sm:text-3xl">{fotos[i].cap}</p>}
        <span className="pointer-events-none absolute left-5 top-4 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/80 backdrop-blur">{i + 1} / {n}</span>
        {n > 1 && <>
          <button type="button" aria-label="Anterior" onClick={() => go(i - 1)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60"><ChevronLeft className="size-5" /></button>
          <button type="button" aria-label="Siguiente" onClick={() => go(i + 1)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60"><ChevronRight className="size-5" /></button>
          <button type="button" aria-label={play ? "Pausar" : "Reproducir"} onClick={() => setPlay(!play)} className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60">{play ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}</button>
        </>}
      </div>

    </div>);
}

/* elegir fotos de la cuenta de Fivemanager (la lista la trae el servidor con la clave guardada) */
type FmImg = { id: string; url: string; name: string };
function FmPicker({ have, onClose, onAdd }: { have: Set<string>; onClose: () => void; onAdd: (urls: string[]) => void }) {
  const [L, setL] = useState<FmImg[]>([]), [page, setPage] = useState(1), [total, setTotal] = useState(0), [st, setSt] = useState<"load" | "ok" | "nokey" | "err">("load"), [msg, setMsg] = useState(""), [sel, setSel] = useState<string[]>([]);
  useEffect(() => { setSt("load"); void api(`/api/fm?page=${page}`).then(r => {
    if (r.__s !== 200) { setSt("err"); setMsg(String(r.msg || "No se pudo traer la lista")); return; }
    if (r.nokey) { setSt("nokey"); return; }
    const D = (r.data || []) as FmImg[]; setL(o => (page === 1 ? D : [...o, ...D.filter(d => !o.some(x => x.id === d.id))])); setTotal(Number(r.total) || 0); setSt("ok"); }); }, [page]);
  const tog = (u: string) => setSel(s => (s.includes(u) ? s.filter(x => x !== u) : [...s, u]));
  return (
    <Modal open onClose={onClose} size="xl" icon={<CloudDownload />} title="Elegir de Fivemanager" desc={st === "ok" ? `${L.length} de ${total} imágenes · tocá las que quieras sumar` : undefined}
      footer={<><Button variant="ghost" className="mr-auto" onClick={onClose}>Cancelar</Button><Button icon={<Plus />} disabled={!sel.length} onClick={() => onAdd(sel)}>Agregar {sel.length || ""}</Button></>}>
      {st === "nokey" ? <Empty icon={<CloudDownload />} title="Falta la clave de Fivemanager" desc="Cargala en Administración › Galería (solo se guarda en el servidor)." />
        : st === "err" ? <Empty icon={<CloudDownload />} title="No se pudo conectar" desc={msg} />
        : <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{L.map(f => { const on = sel.includes(f.url), ya = have.has(f.url); return (
            <button key={f.id} type="button" disabled={ya} onClick={() => tog(f.url)} title={f.name}
              className={cn("relative aspect-video overflow-hidden rounded-xl bg-slate-900 ring-2 transition", on ? "ring-brand-500" : "ring-transparent hover:ring-slate-400/50", ya && "opacity-40")}>
              <img src={f.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              {(on || ya) && <span className={cn("absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full text-white", on ? "bg-brand-500" : "bg-slate-600")}><Check className="size-3.5" /></span>}
              {ya && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[10.5px] text-white">Ya está</span>}
            </button>); })}</div>
          {st === "load" && <p className="flex items-center justify-center gap-2 py-6 text-[13px] text-slate-500"><Loader2 className="size-4 animate-spin" />Cargando…</p>}
          {st === "ok" && L.length < total && <div className="flex justify-center"><Button variant="outline" onClick={() => setPage(p => p + 1)}>Cargar más</Button></div>}
        </div>}
    </Modal>);
}

/* editor de encuadre: vista previa con las mismas medidas del Inicio (portada ancha, saludo abajo a la izquierda,
   tarjeta del perfil que tapa el borde inferior y contador arriba a la derecha). Se arrastra para mover y se ajusta el zoom. */
function Encuadre({ f, onClose, onSave }: { f: Foto; onClose: () => void; onSave: (p: Pick<Foto, "fx" | "fy" | "z">) => void }) {
  const [x, setX] = useState(f.fx ?? 50), [y, setY] = useState(f.fy ?? 50), [z, setZ] = useState(f.z ?? 1), [drag, setDrag] = useState<{ px: number; py: number; x: number; y: number } | null>(null);
  const cl = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
  const move = (e: React.PointerEvent<HTMLDivElement>) => { if (!drag) return; const r = e.currentTarget.getBoundingClientRect(), k = 140 / z;
    setX(cl(drag.x - ((e.clientX - drag.px) / r.width) * k)); setY(cl(drag.y - ((e.clientY - drag.py) / r.height) * k)); };
  const prev: Foto = { ...f, fx: x, fy: y, z };
  return (
    <Modal open onClose={onClose} size="xl" icon={<Crop />} title="Encuadre de la foto" desc="Arrastrá la foto para moverla y usá el zoom. La vista previa tiene las medidas de la portada del Inicio."
      footer={<><Button variant="ghost" icon={<RotateCcw />} className="mr-auto" onClick={() => { setX(50); setY(50); setZ(1); }}>Centrar</Button><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Check />} onClick={() => onSave({ fx: x, fy: y, z })}>Guardar encuadre</Button></>}>
      <div className="space-y-4">
        <div className={cn("hero-mask relative aspect-[9/2] w-full touch-none select-none overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-black/10", drag ? "cursor-grabbing" : "cursor-grab")}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ px: e.clientX, py: e.clientY, x, y }); }} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
          onWheel={e => setZ(v => Math.round(Math.max(1, Math.min(2.5, v - e.deltaY * 0.001)) * 100) / 100)}>
          <img src={f.url} alt="" draggable={false} className="pointer-events-none size-full object-cover" style={fotoStyle(prev)} />
          {/* lo mismo que se superpone en el Inicio */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="pointer-events-none absolute bottom-[30%] left-[9%]"><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-white/70">Lunes, 16 de noviembre</p>
            <p className="font-display text-[clamp(14px,2.6vw,30px)] font-bold leading-tight text-white drop-shadow">Buenas noches, Ryan</p></div>
          <span className="pointer-events-none absolute right-[10%] top-[6%] rounded-full bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/85">1 / 6</span>
          <div className="pointer-events-none absolute inset-x-[4%] bottom-0 h-[26%] rounded-t-xl border border-b-0 border-dashed border-white/50 bg-white/10 backdrop-blur-[1px]">
            <span className="absolute left-3 top-1 text-[10px] font-semibold text-white/80">Tarjeta del perfil</span></div>
          <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white/90 opacity-80"><Move className="size-4" /></span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1.5"><span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500"><ZoomIn className="size-3.5" />Zoom · {Math.round(z * 100)} %</span>
            <input type="range" min={1} max={2.5} step={0.01} value={z} onChange={e => setZ(+e.target.value)} className="w-full accent-[rgb(var(--b-500))]" /></label>
          <label className="space-y-1.5"><span className="text-[12px] font-semibold text-slate-500">Horizontal · {Math.round(x)} %</span>
            <input type="range" min={0} max={100} step={0.5} value={x} onChange={e => setX(+e.target.value)} className="w-full accent-[rgb(var(--b-500))]" /></label>
          <label className="space-y-1.5"><span className="text-[12px] font-semibold text-slate-500">Vertical · {Math.round(y)} %</span>
            <input type="range" min={0} max={100} step={0.5} value={y} onChange={e => setY(+e.target.value)} className="w-full accent-[rgb(var(--b-500))]" /></label>
        </div>
        <p className="text-[11.5px] text-slate-500">En pantallas más angostas (celular) se recorta de los costados, siempre alrededor del punto que elegiste. En el Inicio la foto además se acerca un poco, despacio.</p>
      </div>
    </Modal>);
}
