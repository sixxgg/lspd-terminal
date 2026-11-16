/* Galería (por ahora solo six): fotos de Fivemanager que se eligen a mano y se ven en un carrusel suave
   (fundido con un leve acercamiento, pasa solo y se pausa al pasar el mouse). Se guarda en lspdt.six.galeria (privado de six). */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ExternalLink, Eye, EyeOff, Images, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty } from "@/components/ui";
import { Lightbox } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { uid } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";

type Foto = { id: string; url: string; cap?: string; on: boolean; at: number };
const KEY = "lspdt.six.galeria", FM = "https://fivemanager.com/";
/* links de imagen válidos (Fivemanager u otro https con imagen) */
const URL_RE = /https:\/\/[^\s"'<>]+/g;
const isImg = (u: string) => /fivemanager\.com|\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(u);

export function Galeria() {
  const { toast, confirm } = useFeedback(), [L, setL] = useJSON<Foto[]>(KEY, []), [txt, setTxt] = useState(""), [box, setBox] = useState(-1);
  const S = L.filter(f => f.on);
  const add = () => { const urls = [...new Set(txt.match(URL_RE) || [])].filter(isImg), have = new Set(L.map(f => f.url)), nu = urls.filter(u => !have.has(u));
    if (!urls.length) { toast("No encontré links de imagen. Copiá el link directo de cada foto en Fivemanager.", "err"); return; }
    setL([...L, ...nu.map((url, i) => ({ id: uid(), url, on: true, at: Date.now() + i }))]); setTxt(""); toast(nu.length ? `${nu.length} foto${nu.length > 1 ? "s" : ""} agregada${nu.length > 1 ? "s" : ""}` : "Esas fotos ya estaban"); };
  const up = (id: string, p: Partial<Foto>) => setL(L.map(f => (f.id === id ? { ...f, ...p } : f)));
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= L.length) return; const N = L.slice(); [N[i], N[j]] = [N[j], N[i]]; setL(N); };
  return (
    <div className="space-y-5">
      {S.length ? <Slider fotos={S} onOpen={i => setBox(i)} /> : <Card><Empty icon={<Images />} title="La galería está vacía" desc="Pegá abajo los links de las fotos de Fivemanager que quieras mostrar." /></Card>}
      <Card>
        <CardHeader icon={<Plus />} title="Agregar desde Fivemanager" desc="En Fivemanager, abrí cada foto, copiá su link directo y pegalo acá (podés pegar varios de una vez)."
          action={<a href={FM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"><ExternalLink className="size-3.5" />Abrir Fivemanager</a>} />
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
              <img src={f.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" /></button>
            <div className="space-y-2 p-2.5">
              <input value={f.cap || ""} onChange={e => up(f.id, { cap: e.target.value })} placeholder="Texto (opcional)" maxLength={90} className="h-8 w-full rounded-lg border border-slate-200 bg-transparent px-2 text-[12.5px] outline-none focus:border-brand-500 dark:border-slate-700" />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => up(f.id, { on: !f.on })} className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold", f.on ? "bg-brand-500/10 text-brand-600 dark:text-brand-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                  {f.on ? <><Eye className="size-3.5" />En el carrusel</> : <><EyeOff className="size-3.5" />Oculta</>}</button>
                <span className="flex-1" />
                <button type="button" aria-label="Antes" disabled={!i} onClick={() => mv(i, -1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"><ChevronUp className="size-4" /></button>
                <button type="button" aria-label="Después" disabled={i === L.length - 1} onClick={() => mv(i, 1)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"><ChevronDown className="size-4" /></button>
                <button type="button" aria-label="Quitar" onClick={async () => { if (await confirm("¿Quitar esta foto de la galería? (en Fivemanager sigue estando)", { danger: true, ok: "Quitar" })) setL(L.filter(x => x.id !== f.id)); }} className="rounded p-1 text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button>
              </div>
            </div>
          </div>))}</div>
      </Card>}
      {box >= 0 && S[box] && <Lightbox list={S.map(f => f.url)} i={box} cap={S[box].cap} onClose={() => setBox(-1)} onNav={setBox} />}
    </div>);
}

/* carrusel: fundido + acercamiento leve, pasa cada 5 s, se pausa con el mouse encima; tira de miniaturas abajo */
function Slider({ fotos, onOpen }: { fotos: Foto[]; onOpen: (i: number) => void }) {
  const [i, setI] = useState(0), [play, setPlay] = useState(true), [hover, setHover] = useState(false), strip = useRef<HTMLDivElement>(null);
  const n = fotos.length, go = (k: number) => setI(((k % n) + n) % n);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  useEffect(() => { if (!play || hover || n < 2) return; const t = setTimeout(() => go(i + 1), 5000); return () => clearTimeout(t); }, [i, play, hover, n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { strip.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }, [i]);
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-xl dark:border-slate-800" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="relative aspect-[21/9] max-h-[68vh] w-full">
        {fotos.map((f, k) => (
          <button key={f.id} type="button" onClick={() => onOpen(k)} aria-label="Ver en grande" className={cn("absolute inset-0 transition-opacity duration-1000", k === i ? "opacity-100" : "pointer-events-none opacity-0")}>
            <img src={f.url} alt="" decoding="async" loading={Math.abs(k - i) <= 1 ? "eager" : "lazy"} className={cn("size-full object-cover transition-transform duration-[6000ms] ease-out", k === i ? "scale-[1.06]" : "scale-100")} />
          </button>))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        {fotos[i]?.cap && <p className="pointer-events-none absolute bottom-6 left-6 right-24 font-display text-2xl font-bold text-white drop-shadow-lg sm:text-3xl">{fotos[i].cap}</p>}
        <span className="pointer-events-none absolute left-5 top-4 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/80 backdrop-blur">{i + 1} / {n}</span>
        {n > 1 && <>
          <button type="button" aria-label="Anterior" onClick={() => go(i - 1)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60"><ChevronLeft className="size-5" /></button>
          <button type="button" aria-label="Siguiente" onClick={() => go(i + 1)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60"><ChevronRight className="size-5" /></button>
          <button type="button" aria-label={play ? "Pausar" : "Reproducir"} onClick={() => setPlay(!play)} className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60">{play ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}</button>
          {play && !hover && <span key={i} className="gal-bar absolute inset-x-0 bottom-0 h-0.5 origin-left bg-white/80" />}
        </>}
      </div>
      {n > 1 && <div ref={strip} className="scrollbar-thin flex gap-2 overflow-x-auto bg-black/60 p-2.5">{fotos.map((f, k) => (
        <button key={f.id} data-i={k} type="button" onClick={() => go(k)} className={cn("relative h-14 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition", k === i ? "ring-white" : "opacity-55 ring-transparent hover:opacity-90")}>
          <img src={f.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" /></button>))}</div>}
    </div>);
}
