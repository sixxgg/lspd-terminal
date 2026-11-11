/* Pizarra colaborativa estilo Miro para cada división: lienzo infinito con notas adhesivas, texto, formas, marcos,
   conectores con flecha, lápiz e imágenes (mapas). Plantillas (operativo, Kanban, mapa mental, flujo) y exportación a PNG.
   Cada pizarra se guarda en lspdt.board.<div>.<id> y el índice en lspdt.boards.<div>; los cambios de otros llegan con la sincronización. */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { ArrowUpRight, Circle, Copy, Diamond, Download, Frame, Hand, ImagePlus, LayoutTemplate, Maximize, Minus, MousePointer2, PenLine, Plus, Redo2, Square, StickyNote, Trash2, Type, Undo2, X, Pencil, Presentation } from "lucide-react";
import { Button, Card, Empty, Input } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { readImg } from "@/lib/patrol";
import { uid } from "@/lib/domain";
import { cn } from "@/lib/cn";

type K = "note" | "text" | "rect" | "ellipse" | "diamond" | "frame" | "conn" | "pen" | "img";
type It = { id: string; k: K; x: number; y: number; w: number; h: number; c: string; tx?: string; fs?: number; a?: string; b?: string; pts?: number[]; src?: string };
type Bd = { items: It[] };
type Meta = { id: string; t: string; by: string; upd: number };
type Tool = "sel" | "hand" | "note" | "text" | "rect" | "ellipse" | "diamond" | "frame" | "conn" | "pen";

const NOTE_C = ["#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#fed7aa", "#ddd6fe", "#f1f5f9"];
const LINE_C = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#e2e8f0", "#0f172a"];
const idxK = (d: string) => `lspdt.boards.${d}`, bK = (d: string, id: string) => `lspdt.board.${d}.${id}`;
const box = (i: It) => ({ x: Math.min(i.x, i.x + i.w), y: Math.min(i.y, i.y + i.h), w: Math.abs(i.w), h: Math.abs(i.h) });
const ctr = (i: It) => { const b = box(i); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
/* punto del borde de la caja en dirección a otro punto (para que la flecha no tape la forma) */
function edge(i: It, to: { x: number; y: number }) {
  const b = box(i), c = ctr(i), dx = to.x - c.x, dy = to.y - c.y; if (!dx && !dy) return c;
  const s = Math.min(b.w / 2 / Math.abs(dx || 1e-9), b.h / 2 / Math.abs(dy || 1e-9));
  return { x: c.x + dx * s, y: c.y + dy * s };
}
const connPts = (c: It, M: Map<string, It>) => { const A = M.get(c.a!), B = M.get(c.b!); if (!A || !B) return null; return [edge(A, ctr(B)), edge(B, ctr(A))]; };
const isFill = (k: K) => k === "rect" || k === "ellipse" || k === "diamond";

/* ---------- plantillas ---------- */
const N = (x: number, y: number, tx: string, c = NOTE_C[0], w = 180, h = 140): It => ({ id: uid(), k: "note", x, y, w, h, c, tx, fs: 16 });
const F = (x: number, y: number, w: number, h: number, tx: string, c = LINE_C[0]): It => ({ id: uid(), k: "frame", x, y, w, h, c, tx, fs: 18 });
const S = (k: K, x: number, y: number, w: number, h: number, tx: string, c = LINE_C[0]): It => ({ id: uid(), k, x, y, w, h, c, tx, fs: 16 });
const C = (a: It, b: It, c = LINE_C[5]): It => ({ id: uid(), k: "conn", x: 0, y: 0, w: 0, h: 0, c, a: a.id, b: b.id });
const TPL: [string, string, () => It[]][] = [
  ["op", "Planificación de operativo", () => {
    const fr = [["Objetivo", 0, 0], ["Unidades y roles", 420, 0], ["Accesos y perímetro", 840, 0], ["Riesgos", 0, 380], ["Comunicaciones", 420, 380], ["Plan B / retirada", 840, 380]] as const;
    return fr.flatMap(([t, x, y], i) => [F(x, y, 380, 340, t, LINE_C[i % 5]), N(x + 20, y + 50, i === 0 ? "¿Qué se busca lograr?" : i === 1 ? "10-ADAM-10: …" : "…", NOTE_C[i % 6])]);
  }],
  ["kan", "Tablero Kanban", () => [["Por hacer", NOTE_C[0]], ["En curso", NOTE_C[2]], ["Hecho", NOTE_C[3]]].flatMap(([t, c], i) => [F(i * 320, 0, 300, 560, t, LINE_C[i]), N(i * 320 + 20, 50, "Tarea", c, 260, 100)])],
  ["mm", "Mapa mental", () => { const m = S("ellipse", 300, 220, 220, 120, "Idea central", LINE_C[4]); const ns = [[0, 0], [600, 0], [0, 420], [600, 420]].map(([x, y], i) => N(x, y, `Rama ${i + 1}`, NOTE_C[i + 1]));
    return [m, ...ns, ...ns.map(n => C(m, n))]; }],
  ["flow", "Diagrama de flujo", () => { const a = S("ellipse", 0, 0, 200, 90, "Inicio", LINE_C[1]), b = S("rect", 0, 170, 200, 100, "Paso", LINE_C[0]), c = S("diamond", 0, 350, 200, 140, "¿Condición?", LINE_C[2]),
    d = S("rect", -260, 560, 200, 100, "Sí", LINE_C[1]), e = S("rect", 260, 560, 200, 100, "No", LINE_C[3]); return [a, b, c, d, e, C(a, b), C(b, c), C(c, d), C(c, e)]; }],
];

/* ---------- exportar a PNG (se dibuja todo en un canvas) ---------- */
function wrap(ctx: CanvasRenderingContext2D, t: string, w: number) {
  const out: string[] = []; for (const para of t.split("\n")) { let ln = ""; for (const word of para.split(" ")) { const tr = ln ? ln + " " + word : word; if (ctx.measureText(tr).width > w && ln) { out.push(ln); ln = word; } else ln = tr; } out.push(ln); } return out;
}
async function exportPng(items: It[], dark: boolean, name: string) {
  const M = new Map(items.map(i => [i.id, i])), vis = items.filter(i => i.k !== "conn");
  if (!vis.length) return false;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of vis) { if (i.k === "pen") { for (let j = 0; j < i.pts!.length; j += 2) { x0 = Math.min(x0, i.pts![j]); y0 = Math.min(y0, i.pts![j + 1]); x1 = Math.max(x1, i.pts![j]); y1 = Math.max(y1, i.pts![j + 1]); } continue; }
    const b = box(i); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  const P = 48, sc = Math.min(2, 8000 / Math.max(x1 - x0 + 2 * P, y1 - y0 + 2 * P)), W = (x1 - x0 + 2 * P) * sc, H = (y1 - y0 + 2 * P) * sc;
  const cv = document.createElement("canvas"); cv.width = Math.ceil(W); cv.height = Math.ceil(H);
  const ctx = cv.getContext("2d")!; ctx.fillStyle = dark ? "#0b1220" : "#f8fafc"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.scale(sc, sc); ctx.translate(P - x0, P - y0);
  const imgs = new Map<string, HTMLImageElement>();
  await Promise.all(vis.filter(i => i.k === "img" && i.src).map(i => new Promise<void>(r => { const im = new Image(); im.onload = () => { imgs.set(i.id, im); r(); }; im.onerror = () => r(); im.src = i.src!; })));
  const fg = dark ? "#e2e8f0" : "#0f172a";
  const text = (i: It, col: string, align: "center" | "left" = "center", top = false) => { const b = box(i), fs = i.fs || 16; ctx.fillStyle = col; ctx.font = `${i.k === "frame" ? 600 : 500} ${fs}px Inter, system-ui, sans-serif`; ctx.textBaseline = "top";
    const L = wrap(ctx, i.tx || "", b.w - 24), lh = fs * 1.3, th = L.length * lh, y = top ? b.y + 12 : b.y + (b.h - th) / 2; ctx.textAlign = align;
    L.forEach((l, k) => ctx.fillText(l, align === "center" ? b.x + b.w / 2 : b.x + 12, y + k * lh)); };
  const order = [...vis.filter(i => i.k === "frame"), ...items.filter(i => i.k === "conn"), ...vis.filter(i => i.k !== "frame")];
  for (const i of order) {
    const b = box(i); ctx.save();
    if (i.k === "frame") { ctx.fillStyle = i.c + "14"; ctx.strokeStyle = i.c; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.font = `600 ${i.fs || 18}px Inter, system-ui`; ctx.fillStyle = i.c; ctx.textBaseline = "top"; ctx.fillText(i.tx || "", b.x + 14, b.y + 12); }
    else if (i.k === "note") { ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; ctx.fillStyle = i.c; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill(); ctx.shadowColor = "transparent"; text(i, "#1e293b"); }
    else if (isFill(i.k)) { ctx.fillStyle = i.c + "26"; ctx.strokeStyle = i.c; ctx.lineWidth = 2.5; ctx.beginPath();
      if (i.k === "rect") ctx.roundRect(b.x, b.y, b.w, b.h, 10); else if (i.k === "ellipse") ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
      else { ctx.moveTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x + b.w, b.y + b.h / 2); ctx.lineTo(b.x + b.w / 2, b.y + b.h); ctx.lineTo(b.x, b.y + b.h / 2); ctx.closePath(); }
      ctx.fill(); ctx.stroke(); text(i, fg); }
    else if (i.k === "text") text(i, i.c === "#0f172a" && dark ? fg : i.c, "left", true);
    else if (i.k === "img") { const im = imgs.get(i.id); if (im) ctx.drawImage(im, b.x, b.y, b.w, b.h); }
    else if (i.k === "pen") { const p = i.pts!; ctx.strokeStyle = i.c; ctx.lineWidth = 3; ctx.lineCap = ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let j = 2; j < p.length; j += 2) ctx.lineTo(p[j], p[j + 1]); ctx.stroke(); }
    else if (i.k === "conn") { const pp = connPts(i, M); if (pp) { const [a, z] = pp, ang = Math.atan2(z.y - a.y, z.x - a.x); ctx.strokeStyle = ctx.fillStyle = i.c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(z.x, z.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x - 14 * Math.cos(ang - 0.4), z.y - 14 * Math.sin(ang - 0.4)); ctx.lineTo(z.x - 14 * Math.cos(ang + 0.4), z.y - 14 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill(); } }
    ctx.restore();
  }
  const a = document.createElement("a"); a.download = `${name.replace(/[^\w\-áéíóúñ ]+/gi, "").trim() || "pizarra"}.png`; a.href = cv.toDataURL("image/png"); a.click(); return true;
}

/* ---------- lista de pizarras de la división ---------- */
export function Pizarra({ div, canEdit }: { div: string; canEdit: boolean }) {
  useStoreVersion();
  const me = useMe(), { confirm, toast } = useFeedback();
  const idx = LS.json<Meta[]>(idxK(div), []), [sel, setSel] = useState(() => LS.get(`lspdt.next.board.${div}`) || ""), [ren, setRen] = useState("");
  const cur = idx.find(b => b.id === sel);
  const pick = (id: string) => { setSel(id); LS.set(`lspdt.next.board.${div}`, id); };
  const create = (t = "Pizarra nueva") => { const m: Meta = { id: uid(), t, by: me.n, upd: Date.now() }; LS.setJSON(bK(div, m.id), { items: [] }); LS.setJSON(idxK(div), [...idx, m]); pick(m.id); };
  if (cur) return <Board key={cur.id} div={div} meta={cur} canEdit={canEdit} onBack={() => pick("")}
    onRename={t => LS.setJSON(idxK(div), idx.map(b => (b.id === cur.id ? { ...b, t } : b)))} onTouch={() => LS.setJSON(idxK(div), LS.json<Meta[]>(idxK(div), []).map(b => (b.id === cur.id ? { ...b, upd: Date.now() } : b)))} />;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <Presentation className="size-4 text-brand-500" /><b className="text-sm">Pizarras ({idx.length})</b>
        <span className="text-xs text-slate-500">Lienzo infinito para planear operativos, mapas mentales y flujos. Se comparte con toda la división.</span>
        {canEdit && <Button size="sm" className="ml-auto" icon={<Plus />} onClick={() => create()}>Nueva pizarra</Button>}
      </div>
      {!idx.length ? <Empty icon={<Presentation />} title="Todavía no hay pizarras" desc={canEdit ? "Creá una y elegí una plantilla para arrancar." : undefined} />
        : <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{idx.slice().sort((a, b) => b.upd - a.upd).map(b => (
          <div key={b.id} className="group relative rounded-xl border border-slate-200 bg-[radial-gradient(circle,rgba(148,163,184,.35)_1px,transparent_1px)] bg-[length:16px_16px] p-4 transition hover:border-brand-400 dark:border-slate-800">
            {ren === b.id ? <Input autoFocus defaultValue={b.t} onBlur={e => { const t = e.target.value.trim(); if (t) LS.setJSON(idxK(div), idx.map(x => (x.id === b.id ? { ...x, t } : x))); setRen(""); }} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
              : <button onClick={() => pick(b.id)} className="block w-full text-left"><b className="block truncate">{b.t}</b><small className="text-xs text-slate-500">{b.by} · {new Date(b.upd).toLocaleDateString()}</small></button>}
            {canEdit && <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button aria-label="Renombrar" onClick={() => setRen(b.id)} className="rounded p-1 text-slate-400 hover:text-brand-500"><Pencil className="size-3.5" /></button>
              <button aria-label="Eliminar" onClick={async () => { if (await confirm(`¿Eliminar la pizarra «${b.t}»?`, { danger: true })) { LS.del(bK(div, b.id)); LS.setJSON(idxK(div), idx.filter(x => x.id !== b.id)); toast("Pizarra eliminada"); } }} className="rounded p-1 text-slate-400 hover:text-red-600"><Trash2 className="size-3.5" /></button></div>}
          </div>))}</div>}
    </Card>
  );
}

/* ---------- la pizarra ---------- */
function Board({ div, meta, canEdit, onBack, onRename, onTouch }: { div: string; meta: Meta; canEdit: boolean; onBack: () => void; onRename: (t: string) => void; onTouch: () => void }) {
  const ver = useStoreVersion(), { toast } = useFeedback(), key = bK(div, meta.id);
  const [items, setItems] = useState<It[]>(() => LS.json<Bd>(key, { items: [] }).items || []);
  const [view, setView] = useState({ x: 80, y: 80, z: 0.8 }), [tool, setTool] = useState<Tool>("sel"), [selIds, setSel] = useState<string[]>([]), [edit, setEdit] = useState("");
  const [col, setCol] = useState({ note: NOTE_C[0], line: LINE_C[0] }), [tpl, setTpl] = useState(false), [title, setTitle] = useState(meta.t), [full, setFull] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const act = useRef<null | { m: "pan" | "move" | "resize" | "draw" | "pen" | "marq" | "conn"; sx: number; sy: number; vx: number; vy: number; o?: It[]; id?: string; wx?: number; wy?: number }>(null);
  const [marq, setMarq] = useState<null | { x: number; y: number; w: number; h: number }>(null), [ghost, setGhost] = useState<null | { a: string; x: number; y: number }>(null);
  const hist = useRef<{ u: It[][]; r: It[][] }>({ u: [], r: [] }), saved = useRef(JSON.stringify(items)), space = useRef(false), timer = useRef<number>(0);
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const M = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  /* guardar (con un respiro) y recibir cambios de otros */
  const persist = useCallback((L: It[]) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { const s = JSON.stringify(L); if (s === saved.current) return; saved.current = s; LS.setJSON(key, { items: L }); onTouch(); }, 600); }, [key, onTouch]);
  useEffect(() => { if (act.current || edit) return; const r = LS.json<Bd>(key, { items: [] }).items || [], s = JSON.stringify(r); if (s !== saved.current && s !== JSON.stringify(items)) { saved.current = s; setItems(r); } }, [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (L: It[], prev = items) => { hist.current.u.push(prev); if (hist.current.u.length > 60) hist.current.u.shift(); hist.current.r = []; setItems(L); persist(L); };
  const undo = () => { const p = hist.current.u.pop(); if (!p) return; hist.current.r.push(items); setItems(p); persist(p); };
  const redo = () => { const p = hist.current.r.pop(); if (!p) return; hist.current.u.push(items); setItems(p); persist(p); };
  const toW = (cx: number, cy: number) => { const r = wrapRef.current!.getBoundingClientRect(); return { x: (cx - r.left - view.x) / view.z, y: (cy - r.top - view.y) / view.z }; };
  const del = (ids: string[]) => { if (!ids.length) return; commit(items.filter(i => !ids.includes(i.id) && !(i.k === "conn" && (ids.includes(i.a!) || ids.includes(i.b!))))); setSel([]); };
  const dup = () => { const S = items.filter(i => selIds.includes(i.id) && i.k !== "conn"); if (!S.length) return; const c = S.map(i => ({ ...i, id: uid(), x: i.x + 30, y: i.y + 30, pts: i.pts?.map(v => v + 30) })); commit([...items, ...c]); setSel(c.map(i => i.id)); };
  const fit = () => { const L = items.filter(i => i.k !== "conn" && i.k !== "pen"); const r = wrapRef.current?.getBoundingClientRect(); if (!L.length || !r) { setView({ x: 80, y: 80, z: 0.8 }); return; }
    const x0 = Math.min(...L.map(i => box(i).x)), y0 = Math.min(...L.map(i => box(i).y)), x1 = Math.max(...L.map(i => box(i).x + box(i).w)), y1 = Math.max(...L.map(i => box(i).y + box(i).h));
    const z = Math.max(0.15, Math.min(1.5, Math.min((r.width - 80) / (x1 - x0), (r.height - 80) / (y1 - y0)))); setView({ z, x: (r.width - (x1 - x0) * z) / 2 - x0 * z, y: (r.height - (y1 - y0) * z) / 2 - y0 * z }); };
  useEffect(() => { const t = setTimeout(fit, 30); return () => clearTimeout(t); }, [full]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { const tg = e.target as HTMLElement; if (tg.closest("input,textarea,[contenteditable]")) return;
      if (e.code === "Space") { space.current = true; return; }
      if (!canEdit) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selIds.length) { e.preventDefault(); del(selIds); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); dup(); }
      else if (e.key === "Escape") { setSel([]); setTool("sel"); }
      else if (!e.ctrlKey && !e.metaKey) { const t = ({ v: "sel", h: "hand", n: "note", t: "text", r: "rect", o: "ellipse", d: "diamond", f: "frame", c: "conn", p: "pen" } as Record<string, Tool>)[e.key.toLowerCase()]; if (t) setTool(t); } };
    const ku = (e: KeyboardEvent) => { if (e.code === "Space") space.current = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  });
  useEffect(() => { const el = wrapRef.current; if (!el) return;
    const w = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.6) { setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })); return; }
      setView(v => { const z = Math.max(0.1, Math.min(4, v.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))); return { z, x: px - (px - v.x) * (z / v.z), y: py - (py - v.y) * (z / v.z) }; }); };
    el.addEventListener("wheel", w, { passive: false }); return () => el.removeEventListener("wheel", w); }, []);

  /* ---- puntero ---- */
  const down = (e: RPE, it?: It, handle?: boolean) => {
    if (e.button === 2) return; e.stopPropagation(); (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = toW(e.clientX, e.clientY), base = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, wx: p.x, wy: p.y };
    if (e.button === 1 || tool === "hand" || space.current || (!canEdit && !it)) { act.current = { m: "pan", ...base }; return; }
    if (!canEdit) { if (it) setSel([it.id]); return; }
    if (handle && it) { act.current = { m: "resize", ...base, id: it.id, o: items }; return; }
    if (tool === "conn" && it && it.k !== "conn") { act.current = { m: "conn", ...base, id: it.id }; setGhost({ a: it.id, x: p.x, y: p.y }); return; }
    if (tool === "pen") { const n: It = { id: uid(), k: "pen", x: 0, y: 0, w: 0, h: 0, c: col.line, pts: [p.x, p.y] }; act.current = { m: "pen", ...base, id: n.id, o: items }; setItems([...items, n]); return; }
    if (["note", "text", "rect", "ellipse", "diamond", "frame"].includes(tool)) {
      const k = tool as K, n: It = { id: uid(), k, x: p.x, y: p.y, w: 0, h: 0, c: k === "note" ? col.note : col.line, tx: k === "note" ? "" : k === "frame" ? "Marco" : k === "text" ? "Texto" : "", fs: k === "frame" ? 18 : 16 };
      act.current = { m: "draw", ...base, id: n.id, o: items }; setItems([...items, n]); setSel([n.id]); return; }
    if (it) { const ids = e.shiftKey ? (selIds.includes(it.id) ? selIds.filter(x => x !== it.id) : [...selIds, it.id]) : selIds.includes(it.id) ? selIds : [it.id];
      /* mover un marco arrastra lo que tiene adentro */
      const inside = ids.flatMap(id => { const f = M.get(id); if (!f || f.k !== "frame") return []; const b = box(f); return items.filter(o => o.id !== f.id && o.k !== "conn" && ctr(o).x > b.x && ctr(o).x < b.x + b.w && ctr(o).y > b.y && ctr(o).y < b.y + b.h).map(o => o.id); });
      setSel(ids); act.current = { m: "move", ...base, o: items, id: [...new Set([...ids, ...inside])].join(",") }; return; }
    setSel([]); act.current = { m: "marq", ...base };
  };
  const move = (e: RPE) => { const a = act.current; if (!a) return; const p = toW(e.clientX, e.clientY), dx = p.x - a.wx!, dy = p.y - a.wy!;
    if (a.m === "pan") { setView(v => ({ ...v, x: a.vx + e.clientX - a.sx, y: a.vy + e.clientY - a.sy })); return; }
    if (a.m === "move") { const ids = a.id!.split(","); setItems(a.o!.map(i => (ids.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy, pts: i.pts?.map((v, j) => v + (j % 2 ? dy : dx)) } : i))); return; }
    if (a.m === "resize") { setItems(a.o!.map(i => { if (i.id !== a.id) return i; const b = box(i); return { ...i, x: b.x, y: b.y, w: Math.max(30, b.w + dx), h: Math.max(24, b.h + dy) }; })); return; }
    if (a.m === "draw") { setItems(L => L.map(i => (i.id === a.id ? { ...i, w: dx, h: dy } : i))); return; }
    if (a.m === "pen") { setItems(L => L.map(i => (i.id === a.id ? { ...i, pts: [...i.pts!, p.x, p.y] } : i))); return; }
    if (a.m === "conn") { setGhost(g => (g ? { ...g, x: p.x, y: p.y } : g)); return; }
    if (a.m === "marq") setMarq({ x: Math.min(a.wx!, p.x), y: Math.min(a.wy!, p.y), w: Math.abs(dx), h: Math.abs(dy) });
  };
  const up = (e: RPE) => { const a = act.current; act.current = null; if (!a) return; const p = toW(e.clientX, e.clientY);
    if (a.m === "move" || a.m === "resize" || a.m === "pen") { if (JSON.stringify(a.o) !== JSON.stringify(items)) commit(items, a.o); return; }
    if (a.m === "draw") { const n = items.find(i => i.id === a.id)!; let f = n; const small = Math.abs(n.w) < 12 && Math.abs(n.h) < 12;
      if (small) { const d = ({ note: [180, 140], text: [220, 40], rect: [200, 110], ellipse: [200, 110], diamond: [180, 140], frame: [420, 320] } as Record<string, number[]>)[n.k]; f = { ...n, x: n.x - (n.k === "text" ? 0 : d[0] / 2), y: n.y - (n.k === "text" ? 0 : d[1] / 2), w: d[0], h: d[1] }; }
      else { const b = box(n); f = { ...n, ...b }; }
      commit(items.map(i => (i.id === n.id ? f : i)), a.o); setTool("sel"); if (f.k !== "frame") setEdit(f.id); return; }
    if (a.m === "conn") { setGhost(null); const t = [...items].reverse().find(i => i.k !== "conn" && i.k !== "pen" && i.id !== a.id && (() => { const b = box(i); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; })());
      if (t) commit([...items, { id: uid(), k: "conn", x: 0, y: 0, w: 0, h: 0, c: col.line, a: a.id, b: t.id }]); return; }
    if (a.m === "marq") { const m = marq; setMarq(null); if (m && (m.w > 4 || m.h > 4)) setSel(items.filter(i => { if (i.k === "conn") return false; const c = i.k === "pen" ? { x: i.pts![0], y: i.pts![1] } : ctr(i); return c.x >= m.x && c.x <= m.x + m.w && c.y >= m.y && c.y <= m.y + m.h; }).map(i => i.id)); }
  };

  const setProp = (p: Partial<It>) => commit(items.map(i => (selIds.includes(i.id) ? { ...i, ...p } : i)));
  const addTpl = (f: () => It[]) => { const r = wrapRef.current!.getBoundingClientRect(), c = toW(r.left + r.width / 2, r.top + r.height / 2), L = f();
    const x0 = Math.min(...L.filter(i => i.k !== "conn").map(i => i.x)), y0 = Math.min(...L.filter(i => i.k !== "conn").map(i => i.y));
    const sh = L.map(i => (i.k === "conn" ? i : { ...i, x: i.x - x0 + c.x - 300, y: i.y - y0 + c.y - 200 })); commit([...items, ...sh]); setTpl(false); setTimeout(fit, 20); };
  const addImg = async (f: File) => { const d = await readImg(f, 1600); const im = new Image(); im.onload = () => { const r = wrapRef.current!.getBoundingClientRect(), c = toW(r.left + r.width / 2, r.top + r.height / 2), w = Math.min(900, im.width), h = (im.height / im.width) * w;
    const n: It = { id: uid(), k: "img", x: c.x - w / 2, y: c.y - h / 2, w, h, c: "", src: d }; commit([...items, n]); setSel([n.id]); }; im.src = d; };
  const one = selIds.length === 1 ? M.get(selIds[0]) : undefined, selK = selIds.map(id => M.get(id)?.k);

  const T: [Tool, string, typeof Hand, string][] = [["sel", "Seleccionar (V)", MousePointer2, ""], ["hand", "Mover el lienzo (H o barra espaciadora)", Hand, ""], ["note", "Nota adhesiva (N)", StickyNote, ""], ["text", "Texto (T)", Type, ""],
    ["rect", "Rectángulo (R)", Square, ""], ["ellipse", "Círculo (O)", Circle, ""], ["diamond", "Rombo / decisión (D)", Diamond, ""], ["frame", "Marco (F)", Frame, ""], ["conn", "Conector con flecha (C): arrastrá de una forma a otra", ArrowUpRight, ""], ["pen", "Lápiz (P)", PenLine, ""]];
  const tb = "grid size-9 place-items-center rounded-lg transition [&>svg]:size-4";
  const grid = 24 * view.z;
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950", full && "fixed inset-2 z-[80] shadow-2xl")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <button onClick={onBack} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">← Pizarras</button>
        <input value={title} disabled={!canEdit} onChange={e => setTitle(e.target.value)} onBlur={() => title.trim() && title !== meta.t && onRename(title.trim())} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Nombre de la pizarra" />
        <span className="hidden text-[11px] text-slate-400 lg:inline">Rueda: zoom · arrastrar con la mano o barra espaciadora: mover · doble clic: escribir</span>
        <Button size="sm" variant="outline" icon={<Download />} onClick={async () => { if (!(await exportPng(items, dark, title))) toast("La pizarra está vacía", "err"); }}>Exportar PNG</Button>
        <button onClick={() => setFull(!full)} title={full ? "Salir de pantalla completa" : "Pantalla completa"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Maximize className="size-4" /></button>
      </div>
      <div ref={wrapRef} className={cn("relative touch-none select-none overflow-hidden", full ? "h-[calc(100%-49px)]" : "h-[72vh] min-h-[28rem]", tool === "hand" ? "cursor-grab" : tool === "sel" ? "cursor-default" : "cursor-crosshair")}
        style={{ background: dark ? "#0b1220" : "#f8fafc", backgroundImage: `radial-gradient(circle, ${dark ? "rgba(148,163,184,.18)" : "rgba(100,116,139,.25)"} ${Math.max(0.6, view.z)}px, transparent ${Math.max(0.6, view.z)}px)`, backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
        onPointerDown={e => down(e)} onPointerMove={move} onPointerUp={up} onContextMenu={e => e.preventDefault()}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.z})` }}>
          {items.filter(i => i.k === "frame").map(i => <ItemV key={i.id} i={i} sel={selIds.includes(i.id)} edit={edit === i.id} dark={dark} canEdit={canEdit} onDown={down} onEdit={() => canEdit && setEdit(i.id)} onText={tx => { commit(items.map(x => (x.id === i.id ? { ...x, tx } : x))); setEdit(""); }} />)}
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
            <defs><marker id={`ah-${meta.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke" /></marker></defs>
            {items.filter(i => i.k === "conn").map(i => { const pp = connPts(i, M); if (!pp) return null; return <g key={i.id} className="pointer-events-auto cursor-pointer" onPointerDown={e => down(e, i)}>
              <line x1={pp[0].x} y1={pp[0].y} x2={pp[1].x} y2={pp[1].y} stroke="transparent" strokeWidth={14} />
              <line x1={pp[0].x} y1={pp[0].y} x2={pp[1].x} y2={pp[1].y} stroke={selIds.includes(i.id) ? "#6366f1" : i.c} strokeWidth={2.5} markerEnd={`url(#ah-${meta.id})`} /></g>; })}
            {items.filter(i => i.k === "pen").map(i => <polyline key={i.id} points={i.pts!.join(" ")} fill="none" stroke={i.c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-auto cursor-move" style={selIds.includes(i.id) ? { filter: "drop-shadow(0 0 3px #6366f1)" } : undefined} onPointerDown={e => down(e, i)} />)}
            {ghost && (() => { const A = M.get(ghost.a); if (!A) return null; const s = edge(A, ghost); return <line x1={s.x} y1={s.y} x2={ghost.x} y2={ghost.y} stroke={col.line} strokeWidth={2} strokeDasharray="6 5" markerEnd={`url(#ah-${meta.id})`} />; })()}
          </svg>
          {items.filter(i => i.k !== "frame" && i.k !== "conn" && i.k !== "pen").map(i => <ItemV key={i.id} i={i} sel={selIds.includes(i.id)} edit={edit === i.id} dark={dark} canEdit={canEdit} onDown={down} onEdit={() => canEdit && i.k !== "img" && setEdit(i.id)} onText={tx => { commit(items.map(x => (x.id === i.id ? { ...x, tx } : x))); setEdit(""); }} />)}
          {marq && <div className="pointer-events-none absolute border border-indigo-500 bg-indigo-500/10" style={{ left: marq.x, top: marq.y, width: marq.w, height: marq.h }} />}
        </div>

        {canEdit && <div className="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95" onPointerDown={e => e.stopPropagation()}>
          {T.map(([k, l, I]) => <button key={k} title={l} aria-label={l} onClick={() => setTool(k)} className={cn(tb, tool === k ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}><I /></button>)}
          <span className="mx-1 my-0.5 h-px bg-slate-200 dark:bg-slate-700" />
          <button title="Imagen o mapa" aria-label="Imagen o mapa" onClick={() => fileRef.current?.click()} className={cn(tb, "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}><ImagePlus /></button>
          <button title="Plantillas" aria-label="Plantillas" onClick={() => setTpl(!tpl)} className={cn(tb, tpl ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}><LayoutTemplate /></button>
          <button title="Deshacer (Ctrl+Z)" aria-label="Deshacer" onClick={undo} className={cn(tb, "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}><Undo2 /></button>
          <button title="Rehacer (Ctrl+Y)" aria-label="Rehacer" onClick={redo} className={cn(tb, "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}><Redo2 /></button>
        </div>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void addImg(f); e.target.value = ""; }} />
        {tpl && <div className="absolute left-16 top-1/2 w-60 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900" onPointerDown={e => e.stopPropagation()}>
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Plantillas</p>
          {TPL.map(([k, l, f]) => <button key={k} onClick={() => addTpl(f)} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">{l}</button>)}</div>}

        {/* colores y acciones de lo elegido */}
        {canEdit && (selIds.length > 0 || ["note", "rect", "ellipse", "diamond", "frame", "conn", "pen", "text"].includes(tool)) && <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95" onPointerDown={e => e.stopPropagation()}>
          {(selK.length ? selK.every(k => k === "note") : tool === "note") ? NOTE_C.map(c => <button key={c} aria-label={c} onClick={() => { setCol({ ...col, note: c }); if (selIds.length) setProp({ c }); }} className="size-6 rounded-md ring-1 ring-black/10" style={{ background: c, outline: (one?.c || col.note) === c ? "2px solid #6366f1" : undefined }} />)
            : LINE_C.map(c => <button key={c} aria-label={c} onClick={() => { setCol({ ...col, line: c }); if (selIds.length) setProp({ c }); }} className="size-6 rounded-full ring-1 ring-black/10" style={{ background: c, outline: (one?.c || col.line) === c ? "2px solid #6366f1" : undefined }} />)}
          {selIds.length > 0 && <>
            {one && one.tx !== undefined && <><span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button aria-label="Letra más chica" onClick={() => setProp({ fs: Math.max(10, (one.fs || 16) - 2) })} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Minus className="size-3.5" /></button>
              <span className="w-6 text-center text-xs tabular-nums text-slate-500">{one.fs || 16}</span>
              <button aria-label="Letra más grande" onClick={() => setProp({ fs: Math.min(96, (one.fs || 16) + 2) })} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Plus className="size-3.5" /></button></>}
            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button title="Duplicar (Ctrl+D)" aria-label="Duplicar" onClick={dup} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Copy className="size-4" /></button>
            <button title="Eliminar (Supr)" aria-label="Eliminar" onClick={() => del(selIds)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
            <button title="Deseleccionar" aria-label="Deseleccionar" onClick={() => setSel([])} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></>}
        </div>}

        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95" onPointerDown={e => e.stopPropagation()}>
          <button aria-label="Alejar" onClick={() => setView(v => ({ ...v, z: Math.max(0.1, v.z / 1.2) }))} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Minus className="size-3.5" /></button>
          <button onClick={fit} title="Ver todo" className="w-12 rounded py-1 tabular-nums hover:bg-slate-100 dark:hover:bg-slate-800">{Math.round(view.z * 100)} %</button>
          <button aria-label="Acercar" onClick={() => setView(v => ({ ...v, z: Math.min(4, v.z * 1.2) }))} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Plus className="size-3.5" /></button>
        </div>
        {!items.length && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm text-slate-400"><div><Presentation className="mx-auto mb-2 size-8 opacity-60" />{canEdit ? <>Elegí una herramienta a la izquierda o una <b>plantilla</b> para empezar.</> : "La pizarra está vacía."}</div></div>}
        {!canEdit && <span className="absolute bottom-3 left-3 rounded-lg bg-slate-900/70 px-2 py-1 text-[11px] text-white">Solo lectura</span>}
      </div>
    </div>
  );
}

function ItemV({ i, sel, edit, dark, canEdit, onDown, onEdit, onText }: { i: It; sel: boolean; edit: boolean; dark: boolean; canEdit: boolean; onDown: (e: RPE, it?: It, h?: boolean) => void; onEdit: () => void; onText: (t: string) => void }) {
  const b = box(i), fs = i.fs || 16, fg = dark ? "#e2e8f0" : "#0f172a";
  const txt = edit ? <textarea autoFocus defaultValue={i.tx} onPointerDown={e => e.stopPropagation()} onBlur={e => onText(e.target.value)} onKeyDown={e => { if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) (e.target as HTMLTextAreaElement).blur(); }}
    className={cn("absolute inset-0 resize-none bg-transparent p-3 outline-none", i.k === "frame" || i.k === "text" ? "text-left" : "text-center")} style={{ fontSize: fs, color: i.k === "note" ? "#1e293b" : i.k === "frame" ? i.c : fg }} />
    : <div className={cn("pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-3", i.k === "frame" || i.k === "text" ? "" : "flex items-center justify-center text-center")} style={{ fontSize: fs, lineHeight: 1.3, color: i.k === "note" ? "#1e293b" : i.k === "frame" ? i.c : i.k === "text" ? (i.c === "#0f172a" && dark ? fg : i.c) : fg, fontWeight: i.k === "frame" ? 600 : 500 }}>{i.tx}</div>;
  const st: React.CSSProperties = { left: b.x, top: b.y, width: b.w, height: b.h };
  let body: React.ReactNode = null;
  if (i.k === "note") body = <div className="absolute inset-0 rounded-md shadow-[0_6px_16px_rgba(0,0,0,.25)]" style={{ background: i.c }} />;
  else if (i.k === "rect") body = <div className="absolute inset-0 rounded-[10px] border-[2.5px]" style={{ borderColor: i.c, background: i.c + "26" }} />;
  else if (i.k === "ellipse") body = <div className="absolute inset-0 rounded-[50%] border-[2.5px]" style={{ borderColor: i.c, background: i.c + "26" }} />;
  else if (i.k === "diamond") body = <svg className="absolute inset-0 overflow-visible" width={b.w} height={b.h}><polygon points={`${b.w / 2},0 ${b.w},${b.h / 2} ${b.w / 2},${b.h} 0,${b.h / 2}`} fill={i.c + "26"} stroke={i.c} strokeWidth={2.5} /></svg>;
  else if (i.k === "frame") body = <div className="absolute inset-0 rounded-[14px] border-2 border-dashed" style={{ borderColor: i.c, background: i.c + "14" }} />;
  else if (i.k === "img") body = <img src={i.src} alt="" draggable={false} className="absolute inset-0 size-full rounded object-fill" />;
  return (
    <div className={cn("absolute", canEdit && "cursor-move")} style={st} onPointerDown={e => onDown(e, i)} onDoubleClick={e => { e.stopPropagation(); onEdit(); }}>
      {body}{i.k !== "img" && txt}
      {sel && <div className="pointer-events-none absolute -inset-1 rounded-lg border-2 border-indigo-500" />}
      {sel && canEdit && <div onPointerDown={e => onDown(e, i, true)} className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-sm border-2 border-indigo-500 bg-white" />}
    </div>);
}
