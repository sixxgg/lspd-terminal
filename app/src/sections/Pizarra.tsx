/* Pizarra (área propia del menú), estilo Miro: lienzo infinito gris oscuro con notas, texto con formato (negrita, cursiva,
   subrayado, H1–H3), formas, marcos, flechas, lápiz e imágenes; plantillas y exportación a PNG.
   Moverse: arrastrar el fondo, la rueda o dos dedos; zoom con Ctrl + rueda, pellizco o los botones. Enlace temporal en vivo para ver sin cuenta.
   Datos: lspdt.board.<ámbito>.<id> y el índice lspdt.boards.<ámbito> (ámbito: gen o una división). */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { AlignCenter, AlignLeft, ArrowUpRight, Bold, Circle, Copy, Diamond, Download, Frame, Hand, ImagePlus, Italic, LayoutTemplate, Link2, Loader2, Maximize, Minus, MousePointer2, PenLine, Plus, Presentation, Redo2, Square, StickyNote, Trash2, Type, Underline, Undo2, X, Pencil, Eraser, Lock, Unlock } from "lucide-react";
import { Button, Card, Empty, Input, Select } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, ME_ROLES, syncNow, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { readImg } from "@/lib/patrol";
import { uid } from "@/lib/domain";
import { isRTD, isUMem } from "@/lib/units";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type K = "note" | "text" | "rect" | "ellipse" | "diamond" | "frame" | "conn" | "pen" | "img";
type It = { id: string; k: K; x: number; y: number; w: number; h: number; c: string; tx?: string; fs?: number; a?: string; b?: string; pts?: number[]; src?: string; sw?: number; lk?: boolean; bo?: boolean; it?: boolean; un?: boolean; al?: "l" | "c" };
type Meta = { id: string; t: string; by: string; upd: number; sh?: { t: string; exp: number; by: string }[] };
type Tool = "sel" | "hand" | "note" | "text" | "rect" | "ellipse" | "diamond" | "frame" | "conn" | "pen" | "erase";
/* presencia en vivo: cursor (coordenadas del lienzo) y lo que cada uno está moviendo o dibujando */
type LiveS = { x: number | null; y: number | null; mv?: It[] };
type Live = { n: string; v: LiveS | null; t: number };
const SW = [2, 4, 8, 14];
const hueOf = (n: string) => { let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 85% 62%)`; };

const BG = "#2a2d33", DOT = "rgba(255,255,255,.09)", FG = "#e5e7eb";
const NOTE_C = ["#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#fed7aa", "#ddd6fe", "#f1f5f9"];
const LINE_C = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#e5e7eb", "#9ca3af"];
const HEAD: [string, number, boolean][] = [["H1", 40, true], ["H2", 30, true], ["H3", 22, true], ["P", 16, false]];
const SCOPES: [string, string][] = [["gen", "General"], ["md", "METRO"], ["asd", "A.S.D"], ["k9", "K-9"], ["psb", "PSB"], ["rtd", "RTD"], ["udu", "UDU"]];
const idxK = (d: string) => `lspdt.boards.${d}`, bK = (d: string, id: string) => `lspdt.board.${d}.${id}`;
const box = (i: It) => ({ x: Math.min(i.x, i.x + i.w), y: Math.min(i.y, i.y + i.h), w: Math.abs(i.w), h: Math.abs(i.h) });
const ctr = (i: It) => { const b = box(i); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
function edge(i: It, to: { x: number; y: number }) {
  const b = box(i), c = ctr(i), dx = to.x - c.x, dy = to.y - c.y; if (!dx && !dy) return c;
  const s = Math.min(b.w / 2 / Math.abs(dx || 1e-9), b.h / 2 / Math.abs(dy || 1e-9)); return { x: c.x + dx * s, y: c.y + dy * s };
}
const connPts = (c: It, M: Map<string, It>) => { const A = M.get(c.a!), B = M.get(c.b!); return A && B ? [edge(A, ctr(B)), edge(B, ctr(A))] : null; };
const isFill = (k: K) => k === "rect" || k === "ellipse" || k === "diamond";
const leftAl = (i: It) => (i.al ? i.al === "l" : i.k === "frame" || i.k === "text");
const txtCol = (i: It) => (i.k === "note" ? "#1e293b" : i.k === "frame" || i.k === "text" ? i.c : FG);
const font = (i: It) => `${i.it ? "italic " : ""}${i.bo || i.k === "frame" ? 700 : 500} ${i.fs || 16}px Inter, system-ui, sans-serif`;
/* las pizarras de la PSB solo las ven sus miembros; las de cada división las edita su gente */
const canSee = (sc: string, me: string) => sc !== "psb" || isUMem("psb", me);
const canEd = (sc: string, me: string) => !!ME_ROLES.admin || sc === "gen" || (sc === "rtd" ? isRTD(me) : sc === "udu" ? isUMem("md", me) : isUMem(sc as "md", me));

/* ---------- plantillas ---------- */
const N = (x: number, y: number, tx: string, c = NOTE_C[0], w = 180, h = 140): It => ({ id: uid(), k: "note", x, y, w, h, c, tx, fs: 16 });
const F = (x: number, y: number, w: number, h: number, tx: string, c = LINE_C[0]): It => ({ id: uid(), k: "frame", x, y, w, h, c, tx, fs: 18 });
const S = (k: K, x: number, y: number, w: number, h: number, tx: string, c = LINE_C[0]): It => ({ id: uid(), k, x, y, w, h, c, tx, fs: 16 });
const C = (a: It, b: It, c = LINE_C[5]): It => ({ id: uid(), k: "conn", x: 0, y: 0, w: 0, h: 0, c, a: a.id, b: b.id });
const TPL: [string, string, () => It[]][] = [
  ["op", "Planificación de operativo", () => ([["Objetivo", 0, 0], ["Unidades y roles", 420, 0], ["Accesos y perímetro", 840, 0], ["Riesgos", 0, 380], ["Comunicaciones", 420, 380], ["Plan B / retirada", 840, 380]] as const)
    .flatMap(([t, x, y], i) => [F(x, y, 380, 340, t, LINE_C[i % 5]), N(x + 20, y + 50, i === 0 ? "¿Qué se busca lograr?" : i === 1 ? "10-ADAM-10: …" : "…", NOTE_C[i % 6])])],
  ["kan", "Tablero Kanban", () => [["Por hacer", NOTE_C[0]], ["En curso", NOTE_C[2]], ["Hecho", NOTE_C[3]]].flatMap(([t, c], i) => [F(i * 320, 0, 300, 560, t, LINE_C[i]), N(i * 320 + 20, 50, "Tarea", c, 260, 100)])],
  ["mm", "Mapa mental", () => { const m = S("ellipse", 300, 220, 220, 120, "Idea central", LINE_C[4]); const ns = [[0, 0], [600, 0], [0, 420], [600, 420]].map(([x, y], i) => N(x, y, `Rama ${i + 1}`, NOTE_C[i + 1])); return [m, ...ns, ...ns.map(n => C(m, n))]; }],
  ["flow", "Diagrama de flujo", () => { const a = S("ellipse", 0, 0, 200, 90, "Inicio", LINE_C[1]), b = S("rect", 0, 170, 200, 100, "Paso", LINE_C[0]), c = S("diamond", 0, 350, 200, 140, "¿Condición?", LINE_C[2]),
    d = S("rect", -260, 560, 200, 100, "Sí", LINE_C[1]), e = S("rect", 260, 560, 200, 100, "No", LINE_C[3]); return [a, b, c, d, e, C(a, b), C(b, c), C(c, d), C(c, e)]; }],
];

/* ---------- exportar a PNG ---------- */
function wrapTxt(ctx: CanvasRenderingContext2D, t: string, w: number) {
  const out: string[] = []; for (const para of t.split("\n")) { let ln = ""; for (const word of para.split(" ")) { const tr = ln ? ln + " " + word : word; if (ctx.measureText(tr).width > w && ln) { out.push(ln); ln = word; } else ln = tr; } out.push(ln); } return out;
}
async function exportPng(items: It[], name: string) {
  const M = new Map(items.map(i => [i.id, i])), vis = items.filter(i => i.k !== "conn"); if (!vis.length) return false;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of vis) { if (i.k === "pen") { for (let j = 0; j < i.pts!.length; j += 2) { x0 = Math.min(x0, i.pts![j]); y0 = Math.min(y0, i.pts![j + 1]); x1 = Math.max(x1, i.pts![j]); y1 = Math.max(y1, i.pts![j + 1]); } continue; }
    const b = box(i); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  const P = 48, sc = Math.min(2, 8000 / Math.max(x1 - x0 + 2 * P, y1 - y0 + 2 * P));
  const cv = document.createElement("canvas"); cv.width = Math.ceil((x1 - x0 + 2 * P) * sc); cv.height = Math.ceil((y1 - y0 + 2 * P) * sc);
  const ctx = cv.getContext("2d")!; ctx.fillStyle = BG; ctx.fillRect(0, 0, cv.width, cv.height); ctx.scale(sc, sc); ctx.translate(P - x0, P - y0);
  const imgs = new Map<string, HTMLImageElement>();
  await Promise.all(vis.filter(i => i.k === "img" && i.src).map(i => new Promise<void>(r => { const im = new Image(); im.onload = () => { imgs.set(i.id, im); r(); }; im.onerror = () => r(); im.src = i.src!; })));
  const text = (i: It) => { const b = box(i), fs = i.fs || 16, left = leftAl(i), col = txtCol(i); ctx.font = font(i); ctx.fillStyle = ctx.strokeStyle = col; ctx.textBaseline = "top"; ctx.textAlign = left ? "left" : "center";
    const L = wrapTxt(ctx, i.tx || "", b.w - 24), lh = fs * 1.3, top = i.k === "frame" || i.k === "text" ? b.y + 12 : b.y + (b.h - L.length * lh) / 2;
    L.forEach((l, k) => { const x = left ? b.x + 12 : b.x + b.w / 2, y = top + k * lh; ctx.fillText(l, x, y);
      if (i.un && l) { const w = ctx.measureText(l).width, sx = left ? x : x - w / 2; ctx.lineWidth = Math.max(1, fs / 14); ctx.beginPath(); ctx.moveTo(sx, y + fs * 1.08); ctx.lineTo(sx + w, y + fs * 1.08); ctx.stroke(); } }); };
  for (const i of [...vis.filter(i => i.k === "frame"), ...items.filter(i => i.k === "conn"), ...vis.filter(i => i.k !== "frame")]) {
    const b = box(i); ctx.save();
    if (i.k === "frame") { ctx.fillStyle = i.c + "14"; ctx.strokeStyle = i.c; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); text(i); }
    else if (i.k === "note") { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; ctx.fillStyle = i.c; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill(); ctx.shadowColor = "transparent"; text(i); }
    else if (isFill(i.k)) { ctx.fillStyle = i.c + "26"; ctx.strokeStyle = i.c; ctx.lineWidth = i.sw || 2.5; ctx.beginPath();
      if (i.k === "rect") ctx.roundRect(b.x, b.y, b.w, b.h, 10); else if (i.k === "ellipse") ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
      else { ctx.moveTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x + b.w, b.y + b.h / 2); ctx.lineTo(b.x + b.w / 2, b.y + b.h); ctx.lineTo(b.x, b.y + b.h / 2); ctx.closePath(); }
      ctx.fill(); ctx.stroke(); text(i); }
    else if (i.k === "text") text(i);
    else if (i.k === "img") { const im = imgs.get(i.id); if (im) ctx.drawImage(im, b.x, b.y, b.w, b.h); }
    else if (i.k === "pen") { const p = i.pts!; ctx.strokeStyle = i.c; ctx.lineWidth = i.sw || 3; ctx.lineCap = ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let j = 2; j < p.length; j += 2) ctx.lineTo(p[j], p[j + 1]); ctx.stroke(); }
    else if (i.k === "conn") { const pp = connPts(i, M); if (pp) { const [a, z] = pp, ang = Math.atan2(z.y - a.y, z.x - a.x); ctx.strokeStyle = ctx.fillStyle = i.c; ctx.lineWidth = i.sw || 2.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(z.x, z.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x - 14 * Math.cos(ang - 0.4), z.y - 14 * Math.sin(ang - 0.4)); ctx.lineTo(z.x - 14 * Math.cos(ang + 0.4), z.y - 14 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill(); } }
    ctx.restore();
  }
  const a = document.createElement("a"); a.download = `${name.replace(/[^\w\-áéíóúñ ]+/gi, "").trim() || "pizarra"}.png`; a.href = cv.toDataURL("image/png"); a.click(); return true;
}

/* ---------- área Pizarra: lista de pizarras (generales y de cada división) ---------- */
export function PizarraArea() {
  useStoreVersion();
  const me = useMe(), { confirm, toast } = useFeedback();
  const [f, setF] = useState(() => LS.get("lspdt.next.pizF") || "all"), [sel, setSel] = useState(() => LS.get("lspdt.next.piz") || ""), [ren, setRen] = useState(""), [nsc, setNsc] = useState("gen");
  const SC = SCOPES.filter(([k]) => canSee(k, me.n));
  const all = SC.flatMap(([sc, l]) => LS.json<Meta[]>(idxK(sc), []).map(m => ({ ...m, sc, scl: l })));
  const cur = all.find(b => `${b.sc}:${b.id}` === sel);
  const pick = (v: string) => { setSel(v); LS.set("lspdt.next.piz", v); };
  const setIdx = (sc: string, fn: (L: Meta[]) => Meta[]) => LS.setJSON(idxK(sc), fn(LS.json<Meta[]>(idxK(sc), [])));
  const create = () => { const m: Meta = { id: uid(), t: "Pizarra nueva", by: me.n, upd: Date.now() }; LS.setJSON(bK(nsc, m.id), { items: [] }); setIdx(nsc, L => [...L, m]); pick(`${nsc}:${m.id}`); };
  if (cur) return <Board key={sel} k={bK(cur.sc, cur.id)} meta={cur} scope={cur.scl} canEdit={canEd(cur.sc, me.n)} onBack={() => pick("")}
    onMeta={p => setIdx(cur.sc, L => L.map(b => (b.id === cur.id ? { ...b, ...p(b) } : b)))} />;
  const L = all.filter(b => f === "all" || b.sc === f).sort((a, b) => b.upd - a.upd);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <Presentation className="size-4 text-brand-500" /><b className="text-sm">Pizarras ({all.length})</b>
        <div className="flex flex-wrap gap-1">{[["all", "Todas"], ...SC].map(([k, l]) => <button key={k} onClick={() => { setF(k); LS.set("lspdt.next.pizF", k); }} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold transition", f === k ? "border-brand-500 bg-brand-600 text-white" : "border-slate-200 text-slate-500 dark:border-slate-700")}>{l}</button>)}</div>
        <div className="ml-auto flex items-center gap-2"><Select value={nsc} onChange={e => setNsc(e.target.value)} className="h-8 w-auto py-0 text-xs" aria-label="Dónde se crea">{SC.filter(([k]) => canEd(k, me.n)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Button size="sm" icon={<Plus />} onClick={create}>Nueva pizarra</Button></div>
      </div>
      {!L.length ? <Empty icon={<Presentation />} title="Todavía no hay pizarras" desc="Creá una y elegí una plantilla para arrancar." />
        : <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{L.map(b => { const ed = canEd(b.sc, me.n), v = `${b.sc}:${b.id}`; return (
          <div key={v} className="group relative rounded-xl border border-slate-700 p-4 transition hover:border-brand-400" style={{ background: BG, backgroundImage: `radial-gradient(circle, ${DOT} 1px, transparent 1px)`, backgroundSize: "16px 16px" }}>
            {ren === v ? <Input autoFocus defaultValue={b.t} onBlur={e => { const t = e.target.value.trim(); if (t) setIdx(b.sc, X => X.map(x => (x.id === b.id ? { ...x, t } : x))); setRen(""); }} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
              : <button onClick={() => pick(v)} className="block w-full text-left"><span className="mb-1 inline-block rounded bg-white/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">{b.scl}</span>
                <b className="block truncate text-slate-100">{b.t}</b><small className="text-xs text-slate-400">{b.by} · {new Date(b.upd).toLocaleDateString()}</small></button>}
            {ed && <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button aria-label="Renombrar" onClick={() => setRen(v)} className="rounded p-1 text-slate-400 hover:text-brand-400"><Pencil className="size-3.5" /></button>
              {(b.by === me.n || ME_ROLES.admin) && <button aria-label="Eliminar" onClick={async () => { if (await confirm(`¿Eliminar la pizarra «${b.t}»?`, { danger: true })) { LS.del(bK(b.sc, b.id)); setIdx(b.sc, X => X.filter(x => x.id !== b.id)); toast("Pizarra eliminada"); } }} className="rounded p-1 text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button>}</div>}
          </div>); })}</div>}
    </Card>
  );
}

/* ---------- vista pública en vivo (enlace temporal, sin cuenta) ---------- */
export function PublicBoard({ tok }: { tok: string }) {
  const [st, setSt] = useState<{ items: It[]; title: string; by: string; exp: number } | null>(null), [err, setErr] = useState(""), [live, setLive] = useState<Live[]>([]), since = useRef(0);
  /* rápido (≈250 ms) mientras alguien está moviendo el cursor; lento cuando no hay nadie */
  useEffect(() => { let on = true, tm = 0;
    const load = async () => { const r = await api(`/api/share?t=${tok}&since=${since.current}&live=1`); if (!on) return;
      if (r.__s !== 200) { setErr(r.msg || "No se pudo abrir la pizarra"); return; }
      const L = (r.live || []) as Live[]; setLive(L);
      if (!r.same) { since.current = r.t; let items: It[] = []; try { items = (JSON.parse(r.v || "{}").items || []) as It[]; } catch { /* */ } setSt({ items, title: r.title, by: r.by, exp: r.exp }); }
      const busy = L.some(x => (r.now || Date.now()) - x.t < 4000); tm = window.setTimeout(tick, document.hidden ? 4000 : busy ? 40 : 1200); };
    const tick = () => void load().catch(() => { tm = window.setTimeout(tick, 3000); });
    tick(); return () => { on = false; clearTimeout(tm); }; }, [tok]);
  if (err) return <div className="grid min-h-[100dvh] place-items-center p-6 text-center text-slate-300" style={{ background: BG }}><div><Presentation className="mx-auto mb-3 size-10 opacity-60" /><p className="text-lg font-semibold">{err}</p><p className="mt-1 text-sm text-slate-500">Pedile a quien te lo pasó un enlace nuevo.</p></div></div>;
  if (!st) return <div className="grid min-h-[100dvh] place-items-center text-slate-400" style={{ background: BG }}><Loader2 className="size-6 animate-spin" /></div>;
  return <div className="h-[100dvh] p-2" style={{ background: "#1c1e22" }}><Board k="" meta={{ id: tok, t: st.title, by: st.by, upd: 0 }} scope={`En vivo · compartida por ${st.by} · vence ${new Date(st.exp).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`} canEdit={false} ext={st.items} others={live} full /></div>;
}

/* ---------- la pizarra ---------- */
type Act = { m: "pan" | "move" | "resize" | "draw" | "pen" | "marq" | "conn" | "pinch"; sx: number; sy: number; vx: number; vy: number; vz: number; o?: It[]; id?: string; wx?: number; wy?: number; d0?: number };
function Board({ k, meta, scope, canEdit, onBack, onMeta, ext, others: others0, full: full0 }: { k: string; meta: Meta; scope: string; canEdit: boolean; onBack?: () => void; onMeta?: (p: (m: Meta) => Partial<Meta>) => void; ext?: It[]; others?: Live[]; full?: boolean }) {
  const ver = useStoreVersion(), { toast, confirm } = useFeedback(), me = useMe();
  const [items, setItems] = useState<It[]>(() => ext || LS.json<{ items: It[] }>(k, { items: [] }).items || []);
  const [view, setView] = useState({ x: 80, y: 80, z: 0.8 }), [tool, setTool] = useState<Tool>("sel"), [selIds, setSel] = useState<string[]>([]), [edit, setEdit] = useState("");
  const [col, setCol] = useState({ note: NOTE_C[0], line: LINE_C[0], sw: 4 }), [tpl, setTpl] = useState(false), [title, setTitle] = useState(meta.t), [full, setFull] = useState(!!full0), [share, setShare] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null), act = useRef<Act | null>(null), ptrs = useRef(new Map<number, { x: number; y: number }>());
  const [marq, setMarq] = useState<null | { x: number; y: number; w: number; h: number }>(null), [ghost, setGhost] = useState<null | { a: string; x: number; y: number }>(null);
  const hist = useRef<{ u: It[][]; r: It[][] }>({ u: [], r: [] }), saved = useRef(JSON.stringify(items)), space = useRef(false), timer = useRef(0);
  /* alto justo para que la pizarra entre en pantalla, sin barra de desplazamiento en la página */
  const [hh, setHh] = useState(0);
  useLayoutEffect(() => { if (full) return; const fitH = () => { const el = wrapRef.current; if (!el) return; const sc = document.getElementById("app-scroll");
      const bottom = sc ? sc.getBoundingClientRect().bottom : window.innerHeight, top = el.getBoundingClientRect().top + (sc ? sc.scrollTop : window.scrollY) - (sc ? sc.getBoundingClientRect().top : 0) + (sc ? sc.getBoundingClientRect().top : 0);
      setHh(Math.max(360, Math.floor(bottom - top - 34))); };
    fitH(); window.addEventListener("resize", fitH); return () => window.removeEventListener("resize", fitH); }, [full]);
  const M = useMemo(() => new Map(items.map(i => [i.id, i])), [items]), itRef = useRef(items); itRef.current = items;

  const persist = useCallback((L: It[]) => { if (!k) return; window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { const s = JSON.stringify(L); if (s === saved.current) return; saved.current = s; LS.setJSON(k, { items: L }); onMeta?.(() => ({ upd: Date.now() })); }, 120); }, [k, onMeta]);
  /* en vivo: mando mi cursor y lo que estoy moviendo, recibo lo de los demás y, si alguien guardó, traigo la pizarra al instante */
  const me$ = useRef<LiveS>({ x: null, y: null }), dirty = useRef(false), lastAct = useRef(0), kt = useRef(0), [others1, setOthers] = useState<Live[]>([]);
  const others = (others0 || others1).filter(o => o.v); /* el servidor ya descarta a los que se fueron */
  useEffect(() => { if (!k) return; let on = true, tm = 0;
    const tick = async () => { const busy = Date.now() - lastAct.current < 4000;
      const r = await api("/api/live", { b: k, ...(dirty.current ? { s: me$.current } : {}) }).catch(() => null); dirty.current = false; if (!on) return;
      if (r && r.__s === 200) { setOthers(r.o || []); if (r.kt > kt.current) { if (kt.current) syncNow(); kt.current = r.kt; } }
      const live = busy || (r?.o || []).some((o: Live) => (r?.now || Date.now()) - o.t < 4000);
      tm = window.setTimeout(tick, document.hidden ? 5000 : live ? 30 : 1200); };
    void tick(); const bye = () => { void api("/api/live", { b: k, s: null }); };
    window.addEventListener("pagehide", bye); return () => { on = false; clearTimeout(tm); window.removeEventListener("pagehide", bye); bye(); }; }, [k]);
  const pushLive = (p: Partial<LiveS>) => { me$.current = { ...me$.current, ...p }; dirty.current = true; lastAct.current = Date.now(); };
  useEffect(() => { if (act.current || edit) return; const r = ext || LS.json<{ items: It[] }>(k, { items: [] }).items || [], s = JSON.stringify(r); if (s !== saved.current) { saved.current = s; setItems(r); } }, [ver, ext]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (L: It[], prev = items) => { hist.current.u.push(prev); if (hist.current.u.length > 80) hist.current.u.shift(); hist.current.r = []; setItems(L); persist(L); };
  const undo = () => { const p = hist.current.u.pop(); if (!p) return; hist.current.r.push(items); setItems(p); persist(p); };
  const redo = () => { const p = hist.current.r.pop(); if (!p) return; hist.current.u.push(items); setItems(p); persist(p); };
  const rel = (cx: number, cy: number) => { const r = wrapRef.current!.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top }; };
  const toW = (cx: number, cy: number, v = view) => { const p = rel(cx, cy); return { x: (p.x - v.x) / v.z, y: (p.y - v.y) / v.z }; };
  const zoomAt = (px: number, py: number, f: number) => setView(v => { const z = Math.max(0.1, Math.min(4, v.z * f)); return { z, x: px - (px - v.x) * (z / v.z), y: py - (py - v.y) * (z / v.z) }; });
  const del = (ids: string[]) => { if (!ids.length) return; commit(items.filter(i => !ids.includes(i.id) && !(i.k === "conn" && (ids.includes(i.a!) || ids.includes(i.b!))))); setSel([]); };
  const dup = () => { const L = items.filter(i => selIds.includes(i.id) && i.k !== "conn"); if (!L.length) return; const c = L.map(i => ({ ...i, id: uid(), x: i.x + 30, y: i.y + 30, pts: i.pts?.map(v => v + 30) })); commit([...items, ...c]); setSel(c.map(i => i.id)); };
  const fit = useCallback(() => { const L = items.filter(i => i.k !== "conn" && i.k !== "pen"); const r = wrapRef.current?.getBoundingClientRect(); if (!L.length || !r) { setView({ x: 80, y: 80, z: 0.8 }); return; }
    const x0 = Math.min(...L.map(i => box(i).x)), y0 = Math.min(...L.map(i => box(i).y)), x1 = Math.max(...L.map(i => box(i).x + box(i).w)), y1 = Math.max(...L.map(i => box(i).y + box(i).h));
    const z = Math.max(0.15, Math.min(1.5, Math.min((r.width - 80) / (x1 - x0), (r.height - 80) / (y1 - y0)))); setView({ z, x: (r.width - (x1 - x0) * z) / 2 - x0 * z, y: (r.height - (y1 - y0) * z) / 2 - y0 * z }); }, [items]);
  const fitted = useRef(false);
  useEffect(() => { if (fitted.current && !full) return; fitted.current = true; const t = setTimeout(fit, 30); return () => clearTimeout(t); }, [full, items.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) return;
      if (e.code === "Space") { space.current = true; e.preventDefault(); return; }
      if (e.key === "+" || e.key === "=") { const r = wrapRef.current!.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.2); return; }
      if (e.key === "-") { const r = wrapRef.current!.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.2); return; }
      if (!canEdit) return;
      const arrow = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[e.key];
      if (arrow && selIds.length) { e.preventDefault(); const s = e.shiftKey ? 20 : 2; commit(items.map(i => (selIds.includes(i.id) ? { ...i, x: i.x + arrow[0] * s, y: i.y + arrow[1] * s, pts: i.pts?.map((v, j) => v + (j % 2 ? arrow[1] : arrow[0]) * s) } : i))); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selIds.length) { e.preventDefault(); del(selIds); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); dup(); }
      else if ((e.ctrlKey || e.metaKey) && ["b", "i", "u"].includes(e.key.toLowerCase()) && selIds.length) { e.preventDefault(); toggle(({ b: "bo", i: "it", u: "un" } as const)[e.key.toLowerCase() as "b"]); }
      else if (e.key === "Escape") { setSel([]); setTool("sel"); }
      else if (e.key === "Enter" && selIds.length === 1) { e.preventDefault(); setEdit(selIds[0]); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey) { const t = ({ v: "sel", h: "hand", n: "note", t: "text", r: "rect", o: "ellipse", d: "diamond", f: "frame", c: "conn", p: "pen", e: "erase" } as Record<string, Tool>)[e.key.toLowerCase()]; if (t) setTool(t); } };
    const ku = (e: KeyboardEvent) => { if (e.code === "Space") space.current = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  });
  /* rueda / panel táctil: desplaza; Ctrl + rueda o pellizco: zoom */
  useEffect(() => { const el = wrapRef.current; if (!el) return;
    const w = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) { zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.01))); return; }
      const f = e.deltaMode ? 30 : 1; setView(v => ({ ...v, x: v.x - (e.shiftKey ? e.deltaY : e.deltaX) * f, y: v.y - (e.shiftKey ? 0 : e.deltaY) * f })); };
    el.addEventListener("wheel", w, { passive: false }); return () => el.removeEventListener("wheel", w); }, []);

  /* ---- puntero (mouse, lápiz y dedos) ---- */
  const startPinch = () => { const [a, b] = [...ptrs.current.values()]; const r = wrapRef.current!.getBoundingClientRect();
    act.current = { m: "pinch", sx: (a.x + b.x) / 2 - r.left, sy: (a.y + b.y) / 2 - r.top, vx: view.x, vy: view.y, vz: view.z, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1 }; setMarq(null); };
  const down = (e: RPE, it0?: It, handle?: boolean) => { let it = it0;
    if (e.button === 2) return; e.stopPropagation(); wrapRef.current?.setPointerCapture(e.pointerId); ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) { if (act.current?.o) setItems(act.current.o); startPinch(); return; }
    const p = toW(e.clientX, e.clientY), base = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, vz: view.z, wx: p.x, wy: p.y };
    if (edit && !it) (document.activeElement as HTMLElement | null)?.blur(); /* el blur guarda el texto */
    if (e.button === 1 || tool === "hand" || space.current || (!canEdit && !(it && selIds.includes(it.id)))) { if (!canEdit && it) setSel([it.id]); act.current = { m: "pan", ...base }; return; }
    /* fijado: no se mueve; con Elegir solo se selecciona (para desbloquearlo) y con el resto de las herramientas se trabaja encima */
    if (it?.lk && !handle) { if (tool === "sel" && !e.shiftKey) { setSel([it.id]); act.current = { m: "pan", ...base }; return; } if (tool !== "sel") it = undefined; }
    if (tool === "erase") { if (it) del([it.id]); return; }
    if (handle && it) { act.current = { m: "resize", ...base, id: it.id, o: items }; return; }
    if (tool === "conn" && it && it.k !== "conn") { act.current = { m: "conn", ...base, id: it.id }; setGhost({ a: it.id, x: p.x, y: p.y }); return; }
    if (tool === "pen") { const n: It = { id: uid(), k: "pen", x: 0, y: 0, w: 0, h: 0, c: col.line, sw: col.sw, pts: [p.x, p.y] }; act.current = { m: "pen", ...base, id: n.id, o: items }; setItems([...items, n]); return; }
    if (["note", "text", "rect", "ellipse", "diamond", "frame"].includes(tool)) {
      const kk = tool as K, n: It = { id: uid(), k: kk, x: p.x, y: p.y, w: 0, h: 0, c: kk === "note" ? col.note : kk === "text" ? FG : col.line, tx: kk === "frame" ? "Marco" : kk === "text" ? "Texto" : "", fs: kk === "frame" ? 18 : 16, ...(isFill(kk) ? { sw: col.sw } : {}) };
      act.current = { m: "draw", ...base, id: n.id, o: items }; setItems([...items, n]); setSel([n.id]); return; }
    if (it) { const ids = e.shiftKey ? (selIds.includes(it.id) ? selIds.filter(x => x !== it.id) : [...selIds, it.id]) : selIds.includes(it.id) ? selIds : [it.id];
      const inside = ids.flatMap(id => { const f = M.get(id); if (!f || f.k !== "frame") return []; const b = box(f); return items.filter(o => o.id !== f.id && o.k !== "conn" && ctr(o).x > b.x && ctr(o).x < b.x + b.w && ctr(o).y > b.y && ctr(o).y < b.y + b.h).map(o => o.id); });
      setSel(ids); act.current = { m: "move", ...base, o: items, id: [...new Set([...ids, ...inside])].join(",") }; return; }
    /* fondo: arrastrar mueve el lienzo; con Shift, selección por área */
    if (!e.shiftKey) setSel([]); act.current = { m: e.shiftKey ? "marq" : "pan", ...base };
  };
  const raf = useRef(0), last = useRef<{ x: number; y: number } | null>(null), clrMv = useRef(0);
  useEffect(() => { const a = act.current; if (!k || !a || !["move", "resize", "draw", "pen"].includes(a.m)) return; const ids = (a.id || "").split(",");
    const mv = items.filter(i => ids.includes(i.id)).slice(0, 40).map(i => (i.pts && i.pts.length > 3000 ? { ...i, pts: i.pts.slice(-3000) } : i));
    window.clearTimeout(clrMv.current); pushLive({ mv }); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (e: RPE) => { if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (k) { const w = toW(e.clientX, e.clientY); pushLive({ x: Math.round(w.x), y: Math.round(w.y) }); }
    if (!act.current) return; last.current = { x: e.clientX, y: e.clientY }; if (raf.current) return;
    raf.current = requestAnimationFrame(() => { raf.current = 0; const a = act.current, pt = last.current; if (!a || !pt) return;
      if (a.m === "pinch") { const P = [...ptrs.current.values()]; if (P.length < 2) return; const r = wrapRef.current!.getBoundingClientRect(), cx = (P[0].x + P[1].x) / 2 - r.left, cy = (P[0].y + P[1].y) / 2 - r.top;
        const z = Math.max(0.1, Math.min(4, a.vz * Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y) / a.d0!)); setView({ z, x: cx - (a.sx - a.vx) * (z / a.vz), y: cy - (a.sy - a.vy) * (z / a.vz) }); return; }
      if (a.m === "pan") { setView(v => ({ ...v, x: a.vx + pt.x - a.sx, y: a.vy + pt.y - a.sy })); return; }
      const p = toW(pt.x, pt.y), dx = p.x - a.wx!, dy = p.y - a.wy!;
      if (a.m === "move") { const ids = a.id!.split(","); setItems(a.o!.map(i => (ids.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy, pts: i.pts?.map((v, j) => v + (j % 2 ? dy : dx)) } : i))); return; }
      if (a.m === "resize") { setItems(a.o!.map(i => { if (i.id !== a.id) return i; const b = box(i); return { ...i, x: b.x, y: b.y, w: Math.max(30, b.w + dx), h: Math.max(24, b.h + dy) }; })); return; }
      if (a.m === "draw") { setItems(L => L.map(i => (i.id === a.id ? { ...i, w: dx, h: dy } : i))); return; }
      if (a.m === "pen") { setItems(L => L.map(i => (i.id === a.id ? { ...i, pts: [...i.pts!, p.x, p.y] } : i))); return; }
      if (a.m === "conn") { setGhost(g => (g ? { ...g, x: p.x, y: p.y } : g)); return; }
      if (a.m === "marq") setMarq({ x: Math.min(a.wx!, p.x), y: Math.min(a.wy!, p.y), w: Math.abs(dx), h: Math.abs(dy) }); }); };
  const up = (e: RPE) => { ptrs.current.delete(e.pointerId); const a = act.current;
    if (k && me$.current.mv) { window.clearTimeout(clrMv.current); clrMv.current = window.setTimeout(() => pushLive({ mv: undefined }), 1500); } /* lo suelta cuando el resto ya tiene la pizarra guardada */
    if (a?.m === "pinch") { if (ptrs.current.size < 2) act.current = null; return; }
    act.current = null; if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; } if (!a) return; const p = toW(e.clientX, e.clientY);
    if (a.m === "move" || a.m === "resize" || a.m === "pen") { const ids = a.id?.split(",") || []; if (a.m === "move") { const dx = p.x - a.wx!, dy = p.y - a.wy!; const L = a.o!.map(i => (ids.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy, pts: i.pts?.map((v, j) => v + (j % 2 ? dy : dx)) } : i)); if (dx || dy) commit(L, a.o); else setItems(a.o!); return; }
      const L = itRef.current; if (JSON.stringify(a.o) !== JSON.stringify(L)) { hist.current.u.push(a.o!); hist.current.r = []; persist(L); } return; }
    if (a.m === "draw") { const cur = itRef.current, n = cur.find(i => i.id === a.id); if (!n) return; let f = n; const small = Math.abs(n.w) < 12 && Math.abs(n.h) < 12;
      if (small) { const d = ({ note: [180, 140], text: [220, 44], rect: [200, 110], ellipse: [200, 110], diamond: [180, 140], frame: [420, 320] } as Record<string, number[]>)[n.k]; f = { ...n, x: n.x - (n.k === "text" ? 0 : d[0] / 2), y: n.y - (n.k === "text" ? 0 : d[1] / 2), w: d[0], h: d[1] }; }
      else f = { ...n, ...box(n) };
      commit(cur.map(i => (i.id === n.id ? f : i)), a.o); setTool("sel"); if (f.k !== "frame") setEdit(f.id); return; }
    if (a.m === "conn") { setGhost(null); const t = [...items].reverse().find(i => { if (i.k === "conn" || i.k === "pen" || i.id === a.id) return false; const b = box(i); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; });
      if (t) commit([...items, { id: uid(), k: "conn", x: 0, y: 0, w: 0, h: 0, c: col.line, sw: col.sw, a: a.id, b: t.id }]); return; }
    if (a.m === "marq") { const m = marq; setMarq(null); if (m && (m.w > 4 || m.h > 4)) setSel(items.filter(i => { if (i.k === "conn") return false; const c = i.k === "pen" ? { x: i.pts![0], y: i.pts![1] } : ctr(i); return c.x >= m.x && c.x <= m.x + m.w && c.y >= m.y && c.y <= m.y + m.h; }).map(i => i.id)); }
  };

  /* lo que otros están moviendo se ve encima, sin esperar a que lo suelten */
  const shown = useMemo(() => { const ov = new Map<string, It>(); for (const o of others) for (const m of o.v?.mv || []) ov.set(m.id, m); if (!ov.size) return items;
    const out = items.map(i => ov.get(i.id) || i); for (const [id, m] of ov) if (!M.has(id)) out.push(m); return out; }, [items, others, M]);
  const MS = useMemo(() => (shown === items ? M : new Map(shown.map(i => [i.id, i]))), [shown, items, M]);
  const selLk = selIds.length > 0 && selIds.every(id => M.get(id)?.lk);
  const strokeSel = selIds.map(id => M.get(id)).filter(i => i && (i.k === "pen" || i.k === "conn" || isFill(i.k))) as It[];
  /* las acciones de cada elemento pasan por una referencia estable: así un cambio de otro no vuelve a dibujar toda la pizarra */
  const ctlR = useRef<Ctl>(null as unknown as Ctl);
  ctlR.current = { down, edit: (i: It) => { if (canEdit && i.k !== "img") setEdit(i.id); }, text: (i: It, tx: string) => { if (tx !== i.tx) commit(itRef.current.map(x => (x.id === i.id ? { ...x, tx } : x))); setEdit(""); } };
  const ctl = useMemo<Ctl>(() => ({ down: (e, i, h) => ctlR.current.down(e, i, h), edit: i => ctlR.current.edit(i), text: (i, t) => ctlR.current.text(i, t) }), []);
  const setProp = (p: Partial<It>) => commit(items.map(i => (selIds.includes(i.id) ? { ...i, ...p } : i)));
  const txSel = items.filter(i => selIds.includes(i.id) && i.k !== "conn" && i.k !== "pen" && i.k !== "img");
  const toggle = (f: "bo" | "it" | "un") => { const on = txSel.length > 0 && txSel.every(i => i[f]); commit(items.map(i => (txSel.some(t => t.id === i.id) ? { ...i, [f]: !on } : i))); };
  const addTpl = (f: () => It[]) => { const r = wrapRef.current!.getBoundingClientRect(), c = toW(r.left + r.width / 2, r.top + r.height / 2), L = f();
    const x0 = Math.min(...L.filter(i => i.k !== "conn").map(i => i.x)), y0 = Math.min(...L.filter(i => i.k !== "conn").map(i => i.y));
    commit([...items, ...L.map(i => (i.k === "conn" ? i : { ...i, x: i.x - x0 + c.x - 300, y: i.y - y0 + c.y - 200 }))]); setTpl(false); setTimeout(fit, 20); };
  const addImg = async (f: File) => { const d = await readImg(f, 1600); const im = new Image(); im.onload = () => { const r = wrapRef.current!.getBoundingClientRect(), c = toW(r.left + r.width / 2, r.top + r.height / 2), w = Math.min(900, im.width), h = (im.height / im.width) * w;
    const n: It = { id: uid(), k: "img", x: c.x - w / 2, y: c.y - h / 2, w, h, c: "", src: d, lk: true }; commit([n, ...items]); setSel([n.id]);
    toast("Imagen fijada: podés escribir y dibujar encima. Para moverla, elegila y tocá Desbloquear."); }; im.src = d; };
  const one = selIds.length === 1 ? M.get(selIds[0]) : undefined, selK = selIds.map(id => M.get(id)?.k);

  const T: [Tool, string, string, typeof Hand][] = [["sel", "Elegir", "Seleccionar (V) · arrastrá el fondo para moverte, Shift + arrastrar para elegir varios", MousePointer2], ["hand", "Mover", "Mover el lienzo (H o barra espaciadora)", Hand],
    ["note", "Nota", "Nota adhesiva (N)", StickyNote], ["text", "Texto", "Texto (T)", Type], ["rect", "Cuadro", "Rectángulo (R)", Square], ["ellipse", "Círculo", "Círculo (O)", Circle], ["diamond", "Rombo", "Rombo / decisión (D)", Diamond],
    ["frame", "Marco", "Marco (F)", Frame], ["conn", "Flecha", "Flecha (C): arrastrá de una forma a otra", ArrowUpRight], ["pen", "Lápiz", "Lápiz (P)", PenLine], ["erase", "Goma", "Goma (E): tocá algo para borrarlo", Eraser]];
  const tb = "flex w-14 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-none transition [&>svg]:size-4", tbI = "text-slate-300 hover:bg-white/10", sep = <span className="mx-1 h-5 w-px bg-white/15" />;
  const fb = (on: boolean) => cn("grid size-7 place-items-center rounded-md text-xs font-bold transition [&>svg]:size-3.5", on ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/10");
  const grid = 24 * view.z, dot = Math.max(0.7, view.z * 1.1);
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10 text-slate-200", full && "fixed inset-2 z-[80] shadow-2xl")} style={{ background: "#1f2125" }}>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        {onBack && <button onClick={onBack} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-white/10">← Pizarras</button>}
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">{scope}</span>
        <input value={title} disabled={!canEdit} onChange={e => setTitle(e.target.value)} onBlur={() => title.trim() && title !== meta.t && onMeta?.(() => ({ t: title.trim() }))} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Nombre de la pizarra" />
        {k && <Button size="sm" variant="outline" icon={<Link2 />} onClick={() => setShare(!share)}>Compartir en vivo</Button>}
        <Button size="sm" variant="outline" icon={<Download />} onClick={async () => { if (!(await exportPng(items, title))) toast("La pizarra está vacía", "err"); }}>Exportar PNG</Button>
        {!full0 && <button onClick={() => setFull(!full)} title={full ? "Salir de pantalla completa" : "Pantalla completa"} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><Maximize className="size-4" /></button>}
      </div>
      <div ref={wrapRef} className={cn("relative touch-none select-none overflow-hidden", full && "h-[calc(100%-49px)]", tool === "sel" ? "cursor-grab active:cursor-grabbing" : tool === "hand" ? "cursor-grab" : "cursor-crosshair")}
        style={{ ...(!full && { height: hh || "70vh" }), background: BG, backgroundImage: `radial-gradient(circle, ${DOT} ${dot}px, transparent ${dot}px)`, backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
        onPointerDown={e => down(e)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => k && pushLive({ x: null, y: null })} onContextMenu={e => e.preventDefault()}>
        <div className="absolute left-0 top-0 origin-top-left will-change-transform" style={{ transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.z})` }}>
          {shown.filter(i => i.k === "frame" || (i.lk && i.k === "img")).map(i => <ItemV key={i.id} i={i} sel={selIds.includes(i.id)} edit={edit === i.id} canEdit={canEdit} ctl={ctl} />)}
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
            <defs><marker id={`ah-${meta.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke" /></marker></defs>
            {shown.filter(i => i.k === "conn").map(i => { const pp = connPts(i, MS); if (!pp) return null; return <g key={i.id} className="pointer-events-auto cursor-pointer" onPointerDown={e => down(e, i)}>
              <line x1={pp[0].x} y1={pp[0].y} x2={pp[1].x} y2={pp[1].y} stroke="transparent" strokeWidth={14} />
              <line x1={pp[0].x} y1={pp[0].y} x2={pp[1].x} y2={pp[1].y} stroke={selIds.includes(i.id) ? "#818cf8" : i.c} strokeWidth={i.sw || 2.5} markerEnd={`url(#ah-${meta.id})`} /></g>; })}
            {shown.filter(i => i.k === "pen").map(i => <polyline key={i.id} points={i.pts!.join(" ")} fill="none" stroke={i.c} strokeWidth={i.sw || 3} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-auto cursor-move" style={selIds.includes(i.id) ? { filter: "drop-shadow(0 0 3px #818cf8)" } : undefined} onPointerDown={e => down(e, i)} />)}
            {ghost && (() => { const A = M.get(ghost.a); if (!A) return null; const s = edge(A, ghost); return <line x1={s.x} y1={s.y} x2={ghost.x} y2={ghost.y} stroke={col.line} strokeWidth={2} strokeDasharray="6 5" markerEnd={`url(#ah-${meta.id})`} />; })()}
          </svg>
          {shown.filter(i => i.k !== "frame" && i.k !== "conn" && i.k !== "pen" && !(i.lk && i.k === "img")).map(i => <ItemV key={i.id} i={i} sel={selIds.includes(i.id)} edit={edit === i.id} canEdit={canEdit} ctl={ctl} />)}
          {others.filter(o => o.v!.x != null).map(o => (
            <div key={o.n} className="pointer-events-none absolute left-0 top-0 z-50 transition-transform duration-100 ease-linear" style={{ transform: `translate(${o.v!.x}px,${o.v!.y}px) scale(${1 / view.z})`, transformOrigin: "0 0" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow"><path d="M2 2l6 16 2.5-6.5L17 9z" fill={hueOf(o.n)} stroke="#111" strokeWidth="1.2" strokeLinejoin="round" /></svg>
              <span className="absolute left-4 top-4 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-black shadow" style={{ background: hueOf(o.n) }}>{o.n}</span>
            </div>))}
          {marq && <div className="pointer-events-none absolute border border-indigo-400 bg-indigo-400/10" style={{ left: marq.x, top: marq.y, width: marq.w, height: marq.h }} />}
        </div>

        {canEdit && <div className="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 rounded-xl border border-white/10 bg-[#1f2125]/95 p-1 shadow-xl backdrop-blur" onPointerDown={e => e.stopPropagation()}>
          {T.map(([kk, l, t, I]) => <button key={kk} title={t} aria-label={t} onClick={() => setTool(kk)} className={cn(tb, tool === kk ? "bg-brand-600 text-white" : tbI)}><I />{l}</button>)}
          <span className="mx-1 my-0.5 h-px bg-white/15" />
          <button title="Agregar una imagen o un mapa" onClick={() => fileRef.current?.click()} className={cn(tb, tbI)}><ImagePlus />Imagen</button>
          <button title="Plantillas" onClick={() => setTpl(!tpl)} className={cn(tb, tpl ? "bg-brand-600 text-white" : tbI)}><LayoutTemplate />Plantilla</button>
          <div className="flex"><button title="Deshacer (Ctrl+Z)" aria-label="Deshacer" onClick={undo} className="grid size-7 place-items-center rounded-lg text-slate-300 hover:bg-white/10 [&>svg]:size-4"><Undo2 /></button>
            <button title="Rehacer (Ctrl+Y)" aria-label="Rehacer" onClick={redo} className="grid size-7 place-items-center rounded-lg text-slate-300 hover:bg-white/10 [&>svg]:size-4"><Redo2 /></button></div>
          <button title="Borrar todo lo de la pizarra" onClick={async () => { if (items.length && (await confirm("¿Borrar todo lo de la pizarra? Se puede deshacer con Ctrl+Z mientras no salgas.", { danger: true }))) { commit([]); setSel([]); } }} className={cn(tb, "text-red-400 hover:bg-red-500/15")}><Trash2 />Limpiar</button>
        </div>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void addImg(f); e.target.value = ""; }} />
        {tpl && <div className="absolute left-20 top-1/2 w-60 -translate-y-1/2 rounded-xl border border-white/10 bg-[#1f2125] p-2 shadow-xl" onPointerDown={e => e.stopPropagation()}>
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Plantillas</p>
          {TPL.map(([kk, l, f]) => <button key={kk} onClick={() => addTpl(f)} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10">{l}</button>)}</div>}
        {share && k && <SharePanel k={k} meta={meta} me={me.n} onMeta={onMeta!} onClose={() => setShare(false)} />}

        {/* barra de formato y colores de lo elegido */}
        {canEdit && (selIds.length > 0 || ["note", "rect", "ellipse", "diamond", "frame", "conn", "pen", "text"].includes(tool)) && <div className="absolute left-[calc(50%+2rem)] top-3 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#1f2125]/95 p-1.5 shadow-xl backdrop-blur" onPointerDown={e => e.stopPropagation()}>
          {(selK.length ? selK.every(x => x === "note") : tool === "note") ? NOTE_C.map(c => <button key={c} aria-label={c} onClick={() => { setCol({ ...col, note: c }); if (selIds.length) setProp({ c }); }} className="size-6 rounded-md ring-1 ring-black/20" style={{ background: c, outline: (one?.c || col.note) === c ? "2px solid #818cf8" : undefined }} />)
            : LINE_C.map(c => <button key={c} aria-label={c} onClick={() => { setCol({ ...col, line: c }); if (selIds.length) setProp({ c }); }} className="size-6 rounded-full ring-1 ring-black/20" style={{ background: c, outline: (one?.c || col.line) === c ? "2px solid #818cf8" : undefined }} />)}
          {(["pen", "conn", "rect", "ellipse", "diamond"].includes(tool) || strokeSel.length > 0) && <>{sep}
            {SW.map(w => <button key={w} title={`Grosor ${w}`} aria-label={`Grosor ${w}`} onClick={() => { setCol({ ...col, sw: w }); if (strokeSel.length) commit(items.map(i => (strokeSel.some(x => x.id === i.id) ? { ...i, sw: w } : i))); }}
              className={fb((strokeSel[0]?.sw || col.sw) === w)}><span className="block w-4 rounded-full bg-current" style={{ height: Math.max(1.5, w / 2) }} /></button>)}</>}
          {txSel.length > 0 && <>{sep}
            {HEAD.map(([l, fs, bo]) => <button key={l} title={l === "P" ? "Texto normal" : `Título ${l}`} onClick={() => commit(items.map(i => (selIds.includes(i.id) ? { ...i, fs, bo, h: i.k === "text" ? Math.max(Math.abs(i.h), Math.ceil(fs * 1.3 + 26)) : i.h } : i)))} className={fb(txSel.every(i => (i.fs || 16) === fs))}>{l}</button>)}
            {sep}
            <button title="Negrita (Ctrl+B)" aria-label="Negrita" onClick={() => toggle("bo")} className={fb(txSel.every(i => i.bo))}><Bold /></button>
            <button title="Cursiva (Ctrl+I)" aria-label="Cursiva" onClick={() => toggle("it")} className={fb(txSel.every(i => i.it))}><Italic /></button>
            <button title="Subrayado (Ctrl+U)" aria-label="Subrayado" onClick={() => toggle("un")} className={fb(txSel.every(i => i.un))}><Underline /></button>
            <button title="Alinear a la izquierda" aria-label="Izquierda" onClick={() => setProp({ al: "l" })} className={fb(txSel.every(leftAl))}><AlignLeft /></button>
            <button title="Centrar" aria-label="Centrar" onClick={() => setProp({ al: "c" })} className={fb(txSel.every(i => !leftAl(i)))}><AlignCenter /></button>
            <button aria-label="Letra más chica" onClick={() => setProp({ fs: Math.max(10, (one?.fs || 16) - 2) })} className={fb(false)}><Minus /></button>
            <span className="w-6 text-center text-xs tabular-nums text-slate-400">{one?.fs || 16}</span>
            <button aria-label="Letra más grande" onClick={() => setProp({ fs: Math.min(120, (one?.fs || 16) + 2) })} className={fb(false)}><Plus /></button></>}
          {selIds.length > 0 && <>{sep}
            <button title={selLk ? "Desbloquear (se puede mover)" : "Fijar (queda quieto y se puede escribir y dibujar encima)"} onClick={() => setProp({ lk: !selLk })} className={cn("inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition [&>svg]:size-3.5", selLk ? "bg-amber-500/20 text-amber-300" : "text-slate-300 hover:bg-white/10")}>{selLk ? <><Unlock />Desbloquear</> : <><Lock />Fijar</>}</button>
            <button title="Duplicar (Ctrl+D)" aria-label="Duplicar" onClick={dup} className={fb(false)}><Copy /></button>
            <button title="Eliminar (Supr)" aria-label="Eliminar" onClick={() => del(selIds)} className="grid size-7 place-items-center rounded-md text-red-400 hover:bg-red-500/15 [&>svg]:size-3.5"><Trash2 /></button>
            <button title="Deseleccionar (Esc)" aria-label="Deseleccionar" onClick={() => setSel([])} className={fb(false)}><X /></button></>}
        </div>}

        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-white/10 bg-[#1f2125]/95 p-1 text-xs shadow-xl backdrop-blur" onPointerDown={e => e.stopPropagation()}>
          <button aria-label="Alejar" onClick={() => { const r = wrapRef.current!.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.2); }} className="rounded p-1.5 hover:bg-white/10"><Minus className="size-3.5" /></button>
          <button onClick={fit} title="Ver todo" className="w-12 rounded py-1 tabular-nums hover:bg-white/10">{Math.round(view.z * 100)} %</button>
          <button aria-label="Acercar" onClick={() => { const r = wrapRef.current!.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.2); }} className="rounded p-1.5 hover:bg-white/10"><Plus className="size-3.5" /></button>
        </div>
        {!items.length && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm text-slate-400"><div><Presentation className="mx-auto mb-2 size-8 opacity-60" />{canEdit ? <>Elegí una herramienta a la izquierda o una <b>plantilla</b> para empezar.</> : "La pizarra está vacía."}</div></div>}
        {!canEdit && <span className="absolute right-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[11px] text-slate-300">Solo lectura</span>}
      </div>
    </div>
  );
}

/* enlace temporal de solo lectura (se ve en vivo, sin cuenta) */
function SharePanel({ k, meta, me, onMeta, onClose }: { k: string; meta: Meta; me: string; onMeta: (p: (m: Meta) => Partial<Meta>) => void; onClose: () => void }) {
  const { toast } = useFeedback(), [h, setH] = useState("24"), [busy, setBusy] = useState(false);
  const act = (meta.sh || []).filter(s => s.exp > Date.now()), url = (t: string) => `${location.origin}/?pizarra=${t}`;
  const copy = (t: string) => { void navigator.clipboard?.writeText(url(t)); toast("Enlace copiado"); };
  const create = async () => { setBusy(true); const r = await api("/api/share", { k, h: +h, title: meta.t }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo crear el enlace", "err"); return; }
    onMeta(m => ({ sh: [...(m.sh || []).filter(s => s.exp > Date.now()), { t: r.t, exp: r.exp, by: me }] })); copy(r.t); };
  const revoke = async (t: string) => { const r = await api("/api/share", { del: t }); if (r.__s !== 200) { toast(r.msg || "No se pudo revocar", "err"); return; } onMeta(m => ({ sh: (m.sh || []).filter(s => s.t !== t) })); toast("Enlace revocado"); };
  return (
    <div className="absolute right-3 top-3 z-10 w-80 space-y-3 rounded-xl border border-white/10 bg-[#1f2125] p-3 text-sm shadow-2xl" onPointerDown={e => e.stopPropagation()}>
      <div className="flex items-center gap-2"><Link2 className="size-4 text-brand-400" /><b>Compartir en vivo</b><button aria-label="Cerrar" onClick={onClose} className="ml-auto rounded p-1 text-slate-400 hover:bg-white/10"><X className="size-4" /></button></div>
      <p className="text-xs text-slate-400">Cualquiera con el enlace ve la pizarra en tiempo real (cada 2 s), sin iniciar sesión y sin poder editarla. Vence solo.</p>
      <div className="flex gap-2"><Select value={h} onChange={e => setH(e.target.value)} className="h-8 flex-1 py-0 text-xs">{[["1", "1 hora"], ["6", "6 horas"], ["24", "24 horas"], ["72", "3 días"]].map(([v, l]) => <option key={v} value={v}>Vence en {l}</option>)}</Select>
        <Button size="sm" loading={busy} onClick={create}>Crear enlace</Button></div>
      {act.length > 0 && <div className="space-y-1.5">{act.map(s => (
        <div key={s.t} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs">
          <span className="min-w-0 flex-1 truncate font-mono text-slate-300">…/?pizarra={s.t.slice(0, 8)}…</span><span className="text-slate-500">hasta {new Date(s.exp).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
          <button aria-label="Copiar" onClick={() => copy(s.t)} className="text-slate-400 hover:text-white"><Copy className="size-3.5" /></button>
          {(s.by === me || ME_ROLES.admin) && <button aria-label="Revocar" onClick={() => revoke(s.t)} className="text-slate-400 hover:text-red-400"><Trash2 className="size-3.5" /></button>}
        </div>))}</div>}
    </div>);
}

type Ctl = { down: (e: RPE, it?: It, h?: boolean) => void; edit: (i: It) => void; text: (i: It, t: string) => void };
const ItemV = memo(function ItemV({ i, sel, edit, canEdit, ctl }: { i: It; sel: boolean; edit: boolean; canEdit: boolean; ctl: Ctl }) {
  const onDown = ctl.down, onEdit = () => ctl.edit(i), onText = (t: string) => ctl.text(i, t);
  const b = box(i), left = leftAl(i), top = i.k === "frame" || i.k === "text";
  const ts: React.CSSProperties = { fontSize: i.fs || 16, lineHeight: 1.3, color: txtCol(i), fontWeight: i.bo || i.k === "frame" ? 700 : 500, fontStyle: i.it ? "italic" : undefined, textDecoration: i.un ? "underline" : undefined, textAlign: left ? "left" : "center" };
  const txt = edit ? <textarea autoFocus defaultValue={i.tx} onPointerDown={e => e.stopPropagation()} onFocus={e => e.target.select()} onBlur={e => onText(e.target.value)}
      onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) (e.target as HTMLTextAreaElement).blur(); }}
      className="absolute inset-0 resize-none bg-transparent p-3 outline-none" style={ts} />
    : <div className={cn("pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-3", !top && "flex flex-col justify-center")} style={ts}>{i.tx}</div>;
  let body: React.ReactNode = null;
  if (i.k === "note") body = <div className="absolute inset-0 rounded-md shadow-[0_6px_16px_rgba(0,0,0,.35)]" style={{ background: i.c }} />;
  else if (i.k === "rect") body = <div className="absolute inset-0 rounded-[10px] border-solid" style={{ borderWidth: i.sw || 2.5, borderColor: i.c, background: i.c + "26" }} />;
  else if (i.k === "ellipse") body = <div className="absolute inset-0 rounded-[50%] border-solid" style={{ borderWidth: i.sw || 2.5, borderColor: i.c, background: i.c + "26" }} />;
  else if (i.k === "diamond") body = <svg className="absolute inset-0 overflow-visible" width={b.w} height={b.h}><polygon points={`${b.w / 2},0 ${b.w},${b.h / 2} ${b.w / 2},${b.h} 0,${b.h / 2}`} fill={i.c + "26"} stroke={i.c} strokeWidth={i.sw || 2.5} /></svg>;
  else if (i.k === "frame") body = <div className="absolute inset-0 rounded-[14px] border-2 border-dashed" style={{ borderColor: i.c, background: i.c + "14" }} />;
  else if (i.k === "img") body = <img src={i.src} alt="" draggable={false} className="absolute inset-0 size-full rounded object-fill" />;
  return (
    <div className={cn("absolute", canEdit && !i.lk && "cursor-move")} style={{ left: b.x, top: b.y, width: b.w, height: b.h }} onPointerDown={e => onDown(e, i)} onDoubleClick={e => { e.stopPropagation(); onEdit(); }}>
      {body}{i.k !== "img" && txt}
      {sel && <div className="pointer-events-none absolute -inset-1 rounded-lg border-2 border-indigo-400" />}
      {sel && canEdit && !i.lk && <div onPointerDown={e => onDown(e, i, true)} className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-sm border-2 border-indigo-400 bg-white" />}
      {sel && i.lk && <span className="pointer-events-none absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-amber-500 text-black"><Lock className="size-3" /></span>}
    </div>);
});
