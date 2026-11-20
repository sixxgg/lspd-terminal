/* Administración › Feedback de la terminal (LSSD/SAHP): los errores, ideas y mejoras que mandan los usuarios del departamento.
   Los revisa su administración (en el LSSD, CristianGV367): cambia el estado y deja una respuesta, que le llega a quien lo mandó. */
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Image as ImageIcon, Inbox, Loader2, RefreshCw, Send } from "lucide-react";
import { Button, Card, Empty, Textarea } from "@/components/ui";
import { Lightbox } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { FB_ST, fbSt, fbX, type FbSt } from "@/components/fbnotif";
import { api } from "@/lib/api";
import { safeHtml } from "@/lib/richtext";
import { cn } from "@/lib/cn";

type T = { id: string; t: number; u: number; st: string; html: string; x: string; cat: string; area: string; by: string; who: string; nota: string; imgs: number; rev: string };
const CAT: Record<string, string> = { error: "🐞 Error", idea: "💡 Idea", mejora: "✨ Mejora", otro: "💬 Otro" };
const STS: FbSt[] = ["pend", "curso", "add", "fix", "rej"];

export function DeptTickets() {
  const { toast } = useFeedback(), [L, setL] = useState<T[] | null>(null), [open, setOpen] = useState(""), [f, setF] = useState<"" | FbSt>("pend");
  const load = useCallback(async () => { const r = await api("/api/feedback?dept=1"); if (r.__s === 200) setL(r.list as T[]); else { setL([]); toast(r.msg || "No se pudieron traer los feedback", "err"); } }, [toast]);
  useEffect(() => { void load(); }, [load]);
  const V = (L || []).filter(x => !f || fbSt(x.st) === f);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Inbox className="size-4 text-brand-500" /><b className="text-sm">Feedback de la terminal del departamento</b>
        <div className="ml-auto flex flex-wrap gap-1">{(["", ...STS] as ("" | FbSt)[]).map(k => <button key={k || "all"} onClick={() => setF(k)} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold transition", f === k ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 text-slate-500 dark:border-slate-700")}>
          {k ? FB_ST[k].l : "Todos"} {L ? `(${(L || []).filter(x => !k || fbSt(x.st) === k).length})` : ""}</button>)}</div>
        <Button size="sm" variant="ghost" icon={<RefreshCw />} onClick={() => void load()} aria-label="Actualizar" />
      </Card>
      {!L ? <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="size-6 animate-spin" /></div>
        : !V.length ? <Card><Empty icon={<Inbox />} title="Nada por acá" desc="Cuando alguien del departamento mande un feedback, te llega a esta bandeja." /></Card>
        : <Card className="divide-y divide-slate-100 dark:divide-slate-800">{V.map(x => <Row key={x.id} x={x} open={open === x.id} onToggle={() => setOpen(open === x.id ? "" : x.id)} onDone={() => void load()} />)}</Card>}
    </div>);
}

function Row({ x, open, onToggle, onDone }: { x: T; open: boolean; onToggle: () => void; onDone: () => void }) {
  const { toast } = useFeedback(), S = FB_ST[fbSt(x.st)], [st, setSt] = useState<FbSt>(fbSt(x.st)), [nota, setNota] = useState(x.nota), [busy, setBusy] = useState(false);
  const [imgs, setImgs] = useState<string[] | null>(null), [box, setBox] = useState(-1);
  const fotos = async () => { const out: string[] = []; for (let i = 0; i < x.imgs; i++) { const r = await api(`/api/feedback?id=${x.id}&img=${i}`); if (r.__s === 200 && r.src) out.push(r.src as string); } setImgs(out); };
  const save = async () => { setBusy(true); const r = await api("/api/feedback", { a: "st", id: x.id, st, nota }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return; } toast("Respuesta enviada · le llega a quien lo mandó"); onDone(); };
  return (
    <div style={{ boxShadow: `inset 3px 0 0 ${S.c}` }}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{fbX(x.x)}</p>
          <p className="truncate text-xs text-slate-500">{x.by} · {new Date(x.t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}{x.cat ? ` · ${CAT[x.cat] || x.cat}` : ""}{x.area ? ` · ${x.area}` : ""}</p></div>
        <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: S.c, background: S.c + "1a" }}>{S.l}</span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 bg-slate-50/60 p-4 dark:bg-slate-950/30">
        <div className="fb-rich rounded-xl bg-white p-3 text-sm leading-relaxed dark:bg-slate-900" dangerouslySetInnerHTML={{ __html: safeHtml(x.html.replace(/<img[^>]*>/gi, "")) }} />
        {x.imgs > 0 && (imgs ? <div className="flex flex-wrap gap-2">{imgs.map((s, i) => <button key={i} onClick={() => setBox(i)}><img src={s} alt="" className="h-20 rounded-lg object-cover" /></button>)}</div>
          : <Button size="sm" variant="outline" icon={<ImageIcon />} onClick={() => void fotos()}>Ver {x.imgs} {x.imgs === 1 ? "foto" : "fotos"}</Button>)}
        <div className="flex flex-wrap gap-1.5">{STS.map(k => { const s = FB_ST[k]; return <button key={k} onClick={() => setSt(k)} className={cn("rounded-lg border px-2.5 py-1 text-[12px] font-semibold", st !== k && "border-slate-200 text-slate-500 dark:border-slate-700")}
          style={st === k ? { borderColor: s.c, background: s.c + "1c", color: s.c } : undefined}>{s.l}</button>; })}</div>
        <Textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Respuesta para quien lo mandó (opcional)" />
        <div className="flex items-center gap-2"><span className="flex-1 text-[11px] text-slate-400">{x.rev ? `Última revisión: ${x.rev}` : "Sin revisar"}</span><Button size="sm" icon={<Send />} disabled={busy} onClick={() => void save()}>Guardar</Button></div>
        {box >= 0 && imgs && <Lightbox list={imgs} i={box} onClose={() => setBox(-1)} onNav={setBox} />}
      </div>}
    </div>);
}
