/* Centro de notificaciones (campanita del encabezado, desplegable). Junta, para cada usuario:
   - el estado de sus feedback (y la respuesta), - si cambió su rango (ascenso o descenso),
   - para la PSB: expedientes nuevos o resueltos, - versión nueva de la terminal.
   Lo leído se guarda en este navegador. */
import { nickOf } from "@/lib/nick";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, Heart, MessageSquare, Shield, Sparkles, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { FB_ST, fbSt, fbX, useMyFeedback, useTick } from "@/components/fbnotif";
import { LS, useStoreVersion } from "@/lib/store";
import { uMap } from "@/lib/units";
import { emailOf } from "@/lib/domain";
import { ago, lvl, rankES } from "@/lib/domain";
import { APP_VERSION, hasNews } from "@/sections/Novedades";
import { cn } from "@/lib/cn";

type N = { id: string; t: number; I: LucideIcon; c: string; title: string; body: string; go: [string, string] };
type Ev = { id: string; t: number; title: string; body: string; up: boolean };
const lsGet = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
type Case = { id: string; cf: string; ag: string; by: string; ts: number; upd: number; docs: { t: string; ts: number; by: string }[] };

export function NotifBell({ me, go }: { me: { n: string; r: string }; go: (a: string, s: string) => void }) {
  const ver = useStoreVersion(); useTick();
  const fb = useMyFeedback(), [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  const kSeen = "lspdt.next.nseen:" + me.n, kRk = "lspdt.next.rk:" + me.n, kEv = "lspdt.next.ev:" + me.n;
  const [seen, setSeen] = useState(() => lsGet<number>(kSeen, 0));

  /* cambio de rango: se compara con el último que vio este navegador */
  useEffect(() => { const prev = lsGet<string>(kRk, ""); if (prev && prev !== me.r) {
    const up = lvl(me.r) > lvl(prev), ev: Ev = { id: "rk:" + Date.now(), t: Date.now(), up, title: up ? "¡Ascendiste!" : "Cambio de rango", body: `${rankES(prev)} → ${rankES(me.r)}` };
    lsSet(kEv, [ev, ...lsGet<Ev[]>(kEv, [])].slice(0, 20)); }
    lsSet(kRk, me.r); }, [me.r, kRk, kEv]);
  useEffect(() => { if (!open) return; const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", f); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", f); document.removeEventListener("keydown", k); }; }, [open]);

  const psb = !!uMap("psb")[me.n], cases = LS.ro<Case[]>("lspdt.psbCases", []);
  const items = useMemo(() => {
    const L: N[] = [];
    for (const x of fb.list) if (x.u !== x.t) { const S = FB_ST[fbSt(x.st)];
      L.push({ id: `fb:${x.id}:${x.u}`, t: x.u, I: Heart, c: S.c, title: `Tu feedback: ${S.l}`, body: x.nota ? `Respuesta: ${x.nota}` : fbX(x.x), go: ["fb", "env"] }); }
    for (const e of lsGet<Ev[]>(kEv, [])) L.push({ id: e.id, t: e.t, I: e.up ? TrendingUp : TrendingDown, c: e.up ? "#22c55e" : "#f59e0b", title: e.title, body: e.body, go: ["age", "prof"] });
    if (psb) for (const c of cases) {
      if (c.by !== me.n && Date.now() - c.ts < 14 * 864e5) L.push({ id: `psb:n:${c.id}`, t: c.ts, I: Shield, c: "#818cf8", title: `PSB · expediente nuevo ${c.cf}`, body: `${c.ag || "Agente sin cargar"} · abierto por ${c.by}`, go: ["div", "dv_psb"] });
      const r = c.docs.filter(d => d.t === "res").sort((a, b) => b.ts - a.ts)[0];
      if (r && r.by !== me.n) L.push({ id: `psb:r:${c.id}:${r.ts}`, t: r.ts, I: Shield, c: "#22c55e", title: `PSB · ${c.cf} resuelto`, body: `${c.ag || ""} · resolución de ${r.by}`, go: ["div", "dv_psb"] }); }
    /* comentarios que otros dejaron en mi perfil */
    for (const c of LS.ro<{ id: string; by: string; t: number; x: string }[]>(`lspdt.ucom.${emailOf(me.n).split("@")[0]}`, [])) if (c.by !== me.n)
      L.push({ id: "com:" + c.id, t: c.t, I: MessageSquare, c: "#38bdf8", title: `${nickOf(c.by)} comentó en tu perfil`, body: c.x, go: ["me", "perfil"] });
    if (hasNews()) L.push({ id: "ver:" + APP_VERSION, t: lsGet<number>("lspdt.next.verT:" + APP_VERSION, 0) || (lsSet("lspdt.next.verT:" + APP_VERSION, Date.now()), Date.now()), I: Sparkles, c: "#f472b6", title: `Versión ${APP_VERSION} disponible`, body: "Mirá las novedades de la terminal.", go: ["ini", "nov"] });
    return L.sort((a, b) => b.t - a.t).slice(0, 30);
  }, [fb.list, cases, psb, me.n, kEv, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const unread = items.filter(x => x.t > seen).length;
  const readAll = () => { const n = Date.now(); setSeen(n); lsSet(kSeen, n); fb.markSeen(); };

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} title="Notificaciones" aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`} aria-expanded={open}
        className={cn("relative rounded-lg p-2 transition", open ? "bg-pink-500/10 text-pink-500" : "text-slate-400 hover:bg-pink-500/10 hover:text-pink-500")}>
        <Bell className="size-4" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</button>
      {open && <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><b className="text-sm">Notificaciones</b>
          {unread > 0 && <span className="rounded-full bg-pink-500/15 px-2 text-[11px] font-bold text-pink-600 dark:text-pink-300">{unread} nuevas</span>}
          {unread > 0 && <button onClick={readAll} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"><CheckCheck className="size-3.5" />Marcar como leídas</button>}</div>
        <div className="scrollbar-thin max-h-[70vh] overflow-y-auto">
          {!items.length ? <p className="px-4 py-10 text-center text-sm text-slate-400">No tenés notificaciones.</p>
            : items.map(x => (
              <button key={x.id} onClick={() => { setOpen(false); readAll(); go(...x.go); }} className={cn("flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/50", x.t > seen && "bg-pink-500/[.04]")}>
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg" style={{ color: x.c, background: x.c + "1f" }}><x.I className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-[13px]">{x.title}</b>{x.t > seen && <span className="size-1.5 shrink-0 rounded-full bg-pink-500" />}</span>
                  <span className="line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">{x.body}</span><span className="text-[10.5px] text-slate-400">{ago(x.t)}</span></span>
              </button>))}
        </div>
      </div>}
    </div>
  );
}
