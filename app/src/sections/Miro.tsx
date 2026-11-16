/* Pizarra › Tablero Miro: el tablero del departamento embebido. Solo Detectives y de Sargento II para arriba.
   El link no está en el código (el repo es público): vive en lspdt.miro y el servidor solo se lo manda a esos rangos.
   La administración lo pega o lo cambia desde acá mismo. */
import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2, Pencil, Presentation } from "lucide-react";
import { Button, Card, Empty, Input } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, ME_ROLES, useJSON } from "@/lib/store";

type MiroCfg = { url?: string };
/* id del tablero a partir de cualquier link de Miro (board, live-embed o con share_link_id) */
const boardId = (u: string) => /miro\.com\/app\/(?:board|live-embed)\/([^/?#]+)/.exec(u)?.[1] || "";


export function MiroBoard() {
  const { toast } = useFeedback(), [cfg] = useJSON<MiroCfg>("lspdt.miro", {}), [ed, setEd] = useState(false), [v, setV] = useState(""), [full, setFull] = useState(false);
  const canEd = !!ME_ROLES.admin || !!ME_ROLES.six, id = boardId(cfg.url || "");
  const save = () => { const u = v.trim(); if (u && !boardId(u)) { toast("Ese no parece un link de un tablero de Miro", "err"); return; } LS.setJSON("lspdt.miro", u ? { url: u } : {}); setEd(false); toast(u ? "Tablero guardado" : "Tablero quitado"); };
  const editor = <Card className="p-4"><div className="flex flex-col gap-2 sm:flex-row">
    <Input value={v} onChange={e => setV(e.target.value)} placeholder="https://miro.com/app/board/…" className="flex-1 font-mono text-xs" aria-label="Link del tablero de Miro" />
    <Button onClick={save}>Guardar</Button>{id && <Button variant="ghost" onClick={() => setEd(false)}>Cancelar</Button>}</div>
    <p className="mt-2 text-[12px] text-slate-500">Pegá el link del tablero (el de «Compartir»). Solo lo reciben Detectives y de Sargento II para arriba.</p></Card>;
  if (!id) return canEd ? editor : <Empty icon={<Presentation />} title="Todavía no hay tablero" desc="La administración tiene que cargar el link del tablero de Miro." />;
  return (
    <div className={full ? "fixed inset-0 z-[70] flex flex-col bg-slate-950 p-3" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11.5px] font-bold text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">Prioritario · Detectives y Sargento II+</span>
        <span className="flex-1" />
        {canEd && !full && <Button size="sm" variant="ghost" icon={<Pencil />} onClick={() => { setV(cfg.url || ""); setEd(!ed); }}>Cambiar link</Button>}
        <Button size="sm" variant="ghost" icon={full ? <Minimize2 /> : <Maximize2 />} onClick={() => setFull(!full)}>{full ? "Salir" : "Pantalla completa"}</Button>
        <Button size="sm" variant="outline" icon={<ExternalLink />} onClick={() => window.open(cfg.url, "_blank", "noopener")}>Abrir en Miro</Button>
      </div>
      {ed && !full && editor}
      <div className={full ? "min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800" : "overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800"}>
        <iframe title="Tablero de Miro" src={`https://miro.com/app/live-embed/${id}/?autoplay=true`} className={full ? "size-full" : "h-[calc(100dvh-17rem)] min-h-[480px] w-full"} allow="fullscreen; clipboard-read; clipboard-write" allowFullScreen />
      </div>
    </div>);
}
