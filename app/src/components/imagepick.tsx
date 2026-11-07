import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Trash2, Upload } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { Modal } from "@/components/modal";
import { readImg } from "@/lib/patrol";
import { fetchImageTo } from "@/lib/store";
import { cn } from "@/lib/cn";

/* elegir imagen: archivo, arrastrar, pegar (Ctrl+V) o link (lo descarga el servidor a la clave k) */
export function ImagePicker({ open, title, k, max, alpha, wide, onClose, onFile, onUrl, onDelete }: {
  open: boolean; title: string; k: string; max: number; alpha?: boolean; wide?: boolean; onClose: () => void;
  onFile: (dataUrl: string) => void; onUrl: () => void; onDelete?: () => void;
}) {
  const [url, setUrl] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const take = async (f?: File | null) => { if (!f || !/^image\//.test(f.type)) { setErr("Eso no es una imagen"); return; } onClose(); onFile(await readImg(f, max, alpha)); };
  useEffect(() => {
    if (!open) return; setUrl(""); setErr("");
    const p = (e: ClipboardEvent) => { const f = [...(e.clipboardData?.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); void take(f); } };
    document.addEventListener("paste", p, true); return () => document.removeEventListener("paste", p, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => {
    const u = url.trim(); if (!/^https?:\/\//.test(u)) { setErr("Pegá un link que empiece con https://"); return; }
    setBusy(true); const r = await fetchImageTo(k, u); setBusy(false);
    if (!r.ok) { setErr(r.msg || ""); return; } onClose(); onUrl();
  };
  return (
    <Modal open={open} onClose={onClose} title={title} icon={<ImagePlus />} size="sm"
      footer={<>{onDelete && <Button variant="ghost" className="mr-auto text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={() => { onClose(); onDelete(); }}>Quitar</Button>}<Button variant="ghost" onClick={onClose}>Cancelar</Button></>}>
      <button onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); }}
        className={cn("flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          over ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50")}>
        <Upload className="size-6 text-slate-400" />
        <span className="text-sm font-semibold">Elegí, arrastrá o pegá una imagen</span>
        <span className="text-xs text-slate-400">Ctrl+V con una imagen copiada también funciona</span>
      </button>
      <ImgSpec max={max} alpha={alpha} wide={wide ?? /\.(bg|cover)|^lspdt\.(cover|bg)/.test(k)} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />o con un link<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
      <div className="flex gap-2">
        <Input className="min-w-0" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && void go()} placeholder="https://…" autoFocus />
        <Button size="sm" className="h-10 shrink-0 whitespace-nowrap px-3" loading={busy} icon={<Link2 />} onClick={() => void go()}>Usar</Button>
      </div>
      {err && <p className="text-sm font-medium text-red-600 dark:text-red-400">{err}</p>}
    </Modal>
  );
}

/* tamaño y peso recomendados, a la vista en cada lugar donde se sube una imagen */
export function imgSpec(max: number, alpha?: boolean, wide?: boolean) {
  const px = wide ? `${max}×${Math.round(max * 9 / 16)} px · 16:9` : `${max}×${max} px · cuadrada`;
  return { px, fmt: alpha ? "PNG o WebP transparente" : "JPG, PNG o WebP", peso: "hasta 3 MB" };
}
export function ImgSpec({ max, alpha, wide, className }: { max: number; alpha?: boolean; wide?: boolean; className?: string }) {
  const s = imgSpec(max, alpha, wide);
  return <div className={cn("flex flex-wrap items-center justify-center gap-1.5 text-[11px]", className)}>
    {[s.px, s.fmt, s.peso].map(x => <span key={x} className="whitespace-nowrap rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{x}</span>)}
    <span className="w-full text-center text-slate-400">Si es más grande se ajusta sola.</span></div>;
}
