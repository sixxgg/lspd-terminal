/* Centro de notificaciones (campanita del encabezado, desplegable). Junta, para cada usuario:
   - el estado de sus feedback (y la respuesta), - si cambió su rango (ascenso o descenso),
   - para la PSB: expedientes nuevos o resueltos, - versión nueva de la terminal.
   Lo leído se guarda en este navegador. */
import { createPortal } from "react-dom";
import { nickOf, profOk } from "@/lib/nick";
import { LOGROS, TIER, goodTier } from "@/components/logros";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarClock, CalendarPlus, CheckCheck, Eye, Heart, Trophy, UserPlus, MessageSquare, Shield, Sparkles, TrendingDown, TrendingUp, UsersRound, Vote, X, type LucideIcon } from "lucide-react";
import { FB_ST, fbSt, fbX, useMyFeedback, useTick } from "@/components/fbnotif";
import { LS, ME_ROLES, useStoreVersion } from "@/lib/store";
import { uMap } from "@/lib/units";
import { emailOf } from "@/lib/domain";
import { ago, dmy, lvl, rankES } from "@/lib/domain";
import { JUMP, jumpNow } from "@/lib/jump";
import { APP_VERSION, hasNews } from "@/sections/Novedades";
import { cn } from "@/lib/cn";
import { DEPT, logoOf } from "@/lib/dept";
import { closeExpired, type Prop } from "@/lib/votes";
import { TIPOS, slug as tSlug, solList, traslOk, votos } from "@/lib/trasl";
import { calAck, calAll, calMine, fmtWhen, isToday, reuLabel, reuList, reuVisible } from "@/lib/calendar";

/* a: «app» que la manda (encabezado de la tarjeta, como en el celular); si falta, sale del tipo de aviso */
type N = { id: string; t: number; I: LucideIcon; c: string; title: string; body: string; go: [string, string]; a?: string };
const APP: [RegExp, string][] = [[/^fb:/, "Feedback"], [/^rk:/, "Carrera"], [/^(com|fol|vis):/, "Perfil"], [/^lg:/, "Logros"], [/^cal:/, "Calendario"], [/^reu:/, "Reuniones"], [/^vot:/, "Votaciones"], [/^ver:/, "Sistema"], [/^psb:/, "PSB"]];
const appOf = (x: N) => x.a || APP.find(([r]) => r.test(x.id))?.[1] || "Terminal";
type Ev = { id: string; t: number; title: string; body: string; up: boolean };
const lsGet = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
type Case = { id: string; cf: string; ag: string; by: string; ts: number; upd: number; ois?: string; docs: { t: string; ts: number; by: string }[] };

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
  /* votaciones vencidas: las cierra la primera sesión de Sargento para arriba que esté conectada (así el aviso llega aunque nadie abra Supervisores) */
  useEffect(() => { if (lvl(me.r) < 6) return; const x = closeExpired(LS.json<Prop[]>("lspdt.votes", [])); if (x) LS.setJSON("lspdt.votes", x); }, [ver, me.r]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k); return () => { document.removeEventListener("keydown", k); }; }, [open]);

  const psb = !!uMap("psb")[me.n], cases = LS.ro<Case[]>("lspdt.psbCases", []);
  const items = useMemo(() => {
    const L: N[] = [];
    for (const x of fb.list) if (x.u !== x.t) { const S = FB_ST[fbSt(x.st)];
      L.push({ id: `fb:${x.id}:${x.u}`, t: x.u, I: Heart, c: S.c, title: `Tu feedback: ${S.l}`, body: x.nota ? `Respuesta: ${x.nota}` : fbX(x.x), go: ["fb", "env"] }); }
    for (const e of lsGet<Ev[]>(kEv, [])) L.push({ id: e.id, t: e.t, I: e.up ? TrendingUp : TrendingDown, c: e.up ? "#22c55e" : "#f59e0b", title: e.title, body: e.body, go: ["age", "prof"] });
    if (psb) for (const c of cases) {
      if (c.by !== me.n && Date.now() - c.ts < 14 * 864e5) L.push(c.ois ? { id: `psb:n:${c.id}`, a: "FID · Uso de la fuerza", t: c.ts, I: Shield, c: "#ef4444", title: `Uso de la fuerza ${c.ois}`, body: `${c.ag} · remitido por ${c.by} · caso ${c.cf}`, go: ["div", "dv_psb"] }
        : { id: `psb:n:${c.id}`, t: c.ts, I: Shield, c: "#818cf8", title: `Expediente nuevo ${c.cf}`, body: `${c.ag || "Agente sin cargar"} · abierto por ${c.by}`, go: ["div", "dv_psb"] });
      const r = c.docs.filter(d => d.t === "res").sort((a, b) => b.ts - a.ts)[0];
      if (r && r.by !== me.n) L.push({ id: `psb:r:${c.id}:${r.ts}`, t: r.ts, I: Shield, c: "#22c55e", title: `${c.cf} resuelto`, body: `${c.ag || ""} · resolución de ${r.by}`, go: ["div", "dv_psb"] }); }
    /* LSSD: feedbacks nuevos que me toca revisar (la administración del departamento o quien figure como responsable) */
    if (DEPT.id !== "lspd") for (const r of LS.ro<{ id: string; t: number; ag: string; por: string; mot: string; st: string; rev: string }[]>("lspdt.fbl", []))
      if (r && r.por !== me.n && (r.st === "pend") && (r.rev === me.n || !!ME_ROLES.dadm)) L.push({ id: "fbl:" + r.id, t: r.t, I: MessageSquare, c: "#f59e0b", title: `Feedback para revisar: ${r.ag}`, body: `${r.mot} · de ${r.por}`, go: [lvl(me.r) >= 10 ? "jef" : lvl(me.r) >= 8 ? "cap" : "sup", "fbk"] });
    /* comentarios que otros dejaron en mi perfil */
    for (const c of LS.ro<{ id: string; by: string; t: number; x: string }[]>(`lspdt.ucom.${emailOf(me.n).split("@")[0]}`, [])) if (c.by !== me.n)
      L.push({ id: "com:" + c.id, t: c.t, I: MessageSquare, c: "#38bdf8", title: `${nickOf(c.by)} comentó en tu perfil`, body: c.x, go: ["me", "perfil"] });
    /* perfiles (BETA): nuevos seguidores, visitas a mi perfil y logros buenos */
    if (profOk(me.n)) {
      const sl = emailOf(me.n).split("@")[0];
      for (const [n, t] of Object.entries(LS.ro<Record<string, number>>(`lspdt.ufolt.${sl}`, {}))) if (n !== me.n)
        L.push({ id: `fol:${n}:${t}`, t, I: UserPlus, c: "#a855f7", title: `${nickOf(n)} empezó a seguirte`, body: "Tocá para ver quién es", go: ["me", "perfil"] });
      for (const v of LS.ro<{ l?: { n: string; t: number }[] }>(`lspdt.uvis.${sl}`, {}).l || []) if (v.n !== me.n && Date.now() - v.t < 7 * 864e5)
        L.push({ id: `vis:${v.n}:${v.t}`, t: v.t, I: Eye, c: "#14b8a6", title: `${nickOf(v.n)} vio tu perfil`, body: ago(v.t).replace(/^hace/, "Hace"), go: ["me", "perfil"] });
      const lg = LS.ro<{ lg?: Record<string, number> }>(`lspdt.uprof.${sl}`, {}).lg || {};
      for (const l of LOGROS) if (lg[l.k] && goodTier(l.tier))
        L.push({ id: `lg:${l.k}`, t: lg[l.k], I: Trophy, c: TIER[l.tier].c, title: l.t, body: `${TIER[l.tier].l} · ${l.d}`, a: "Logro desbloqueado", go: ["me", "perfil"] });
    }
    /* calendario: lo de hoy que me toca y lo nuevo que cargaron mis divisiones */
    { const ack = calAck(me.n), d0 = new Date(); d0.setHours(0, 0, 0, 0);
      for (const e of calAll()) { if (!calMine(e, me.n) || e.at < Date.now() - 3 * 36e5) continue; const tl = e.tipo === "Otro" ? "evento" : e.tipo.toLowerCase();
        if (isToday(e.at) && !ack[e.id]?.r) L.push({ id: "cal:hoy:" + e.id, a: `Calendario · ${e.ab}`, t: Math.max(+d0, e.t), I: CalendarClock, c: "#f59e0b", title: `Hoy hay ${["práctica", "instrucción", "reunión"].includes(tl) ? "una" : "un"} ${tl}: ${e.n}`, body: fmtWhen(e, { day: false }), go: ["cal", "cal"] });
        else if (e.src !== "reu" && e.by !== me.n && Date.now() - e.t < 14 * 864e5) L.push({ id: "cal:new:" + e.id, a: `Calendario · ${e.ab}`, t: e.t, I: CalendarPlus, c: e.col, title: `Nuevo: ${e.n}`, body: fmtWhen(e), go: ["cal", "cal"] }); } }
    /* reuniones nuevas que abrió otro (Supervisores › Reuniones) */
    for (const r of reuList()) if (r.by !== me.n && Date.now() - r.at < 14 * 864e5 && reuVisible(r))
      L.push({ id: "reu:" + r.id, t: r.at, I: UsersRound, c: "#ec4899", title: r.t, body: `${dmy(r.f)}${r.h ? ` · ${r.h} h` : ""} · la abrió ${r.by}`, a: `Reuniones · ${reuLabel(r.tpl)}`, go: ["sup", "reu"] });
    /* votaciones de ascenso o descenso que se cerraron (a mano o al vencer): les avisa a todos los Sargentos */
    if (lvl(me.r) >= 6) for (const v of LS.ro<Prop[]>("lspdt.votes", [])) if (v.estado !== "abierta" && v.cierre && Date.now() - v.cierre.t < 14 * 864e5) {
      const ok = v.estado === "aprobada", asc = v.tipo === "asc";
      L.push({ id: `vot:${v.id}:${v.estado}`, t: v.cierre.t, I: ok ? (asc ? TrendingUp : TrendingDown) : Vote, c: ok ? (asc ? "#22c55e" : "#f59e0b") : "#94a3b8",
        title: ok ? `${asc ? "Ascenso" : "Descenso"} aceptado: ${rankES(v.nr)} ${v.ag.n}` : `${asc ? "Ascenso" : "Descenso"} rechazado: ${v.ag.n}`,
        body: ok ? `Ya se puede ${asc ? "ascender" : "descender"} a ${rankES(v.nr)}${v.cierre.auto ? " · la votación venció" : ""}` : `La votación ${v.cierre.auto ? "venció" : "se cerró"} sin mayoría a favor`, go: ["sup", "vot"] }); }
    /* traslados (LSSD, Capitanía y Jefatura): votaciones abiertas sin mi voto y aclaraciones nuevas de otros */
    if (traslOk(me.r)) for (const x of solList()) {
      if ((x.est === "prev" || x.est === "enrev") && !votos(x.id, x.ronda).some(v => tSlug(v.n) === tSlug(me.n)))
        L.push({ id: `tra:v:${x.id}:${x.ronda}`, t: x.upd, I: Vote, c: "#a855f7", title: `Traslado a votar: ${x.n}`, body: `${TIPOS[x.tipo].l} · ronda ${x.ronda}`, a: "Traslados", go: [lvl(me.r) >= 10 ? "jef" : "cap", "tra"] });
      for (const a of x.adic) if (a.by !== me.n && Date.now() - a.t < 14 * 864e5 && ["prev", "enrev"].includes(x.est))
        L.push({ id: `tra:a:${a.id}`, t: a.t, I: MessageSquare, c: "#a855f7", title: `Nueva información en el traslado de ${x.n}`, body: `${a.by}: ${a.x.slice(0, 80)}`, a: "Traslados", go: [lvl(me.r) >= 10 ? "jef" : "cap", "tra"] });
    }
    if (hasNews()) L.push({ id: "ver:" + APP_VERSION, t: lsGet<number>("lspdt.next.verT:" + APP_VERSION, 0) || (lsSet("lspdt.next.verT:" + APP_VERSION, Date.now()), Date.now()), I: Sparkles, c: "#f472b6", title: `Versión ${APP_VERSION}`, body: "Hay novedades en la terminal. Tocá para verlas.", go: ["ini", "nov"] });
    return L.sort((a, b) => b.t - a.t).slice(0, 30);
  }, [fb.list, cases, psb, me.n, kEv, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const unread = items.filter(x => x.t > seen).length, host = document.querySelector<HTMLElement>(".tab-screen"), logo = logoOf();
  const readAll = () => { const n = Date.now(); setSeen(n); lsSet(kSeen, n); fb.markSeen(); };

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} title="Notificaciones" aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`} aria-expanded={open}
        className={cn("relative rounded-lg p-2 transition", open ? "bg-pink-500/10 text-pink-500" : "text-slate-400 hover:bg-pink-500/10 hover:text-pink-500")}>
        <Bell className="size-4" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</button>
      {/* centro de notificaciones: baja desde arriba dentro de la tablet, con tarjetas como los avisos del sistema */}
      {createPortal(<div className={cn(host ? "absolute" : "fixed", "inset-0 z-[85]", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-slate-950/55 transition-opacity duration-300", open ? "opacity-100 backdrop-blur-md" : "invisible opacity-0")} />
        <div role="dialog" aria-label="Notificaciones" className={cn("absolute inset-x-0 top-0 mx-auto flex max-h-full w-[min(480px,100%)] flex-col px-3 pt-3 transition duration-300 ease-[cubic-bezier(.2,.8,.2,1)]", open ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0")}>
          <div className="flex items-end gap-2 px-1 pb-3 text-white">
            <div className="min-w-0 flex-1"><p className="font-display text-2xl font-bold leading-none">Notificaciones</p>
              <p className="mt-1 text-xs text-white/55">{unread ? `${unread} sin leer` : items.length ? "Todo al día" : ""}</p></div>
            {unread > 0 && <button onClick={readAll} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur transition hover:bg-white/20"><CheckCheck className="size-3.5" />Marcar leídas</button>}
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20"><X className="size-4" /></button>
          </div>
          <div key={open ? "abierto" : "cerrado"} className="scrollbar-none -mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-4">
            {!items.length ? <div className="upd-ntf px-5 py-8 text-center text-sm text-white/60">No tenés notificaciones.</div>
              : items.map((x, i) => { const nu = x.t > seen; return (
                <button key={x.id} onClick={() => { setOpen(false); readAll(); if (x.id.startsWith("reu:")) { JUMP.reu = x.id.slice(4); jumpNow(); } go(...x.go); }}
                  className={cn("upd-ntf block w-full text-left transition hover:brightness-125 active:scale-[.99]", open && "rise", nu && "ring-1 ring-pink-400/40")} style={{ ["--d" as string]: Math.min(i, 8) * 35 + "ms" }}>
                  <span className="flex items-center gap-2 px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                    <img src={logo} alt="" className="size-4 rounded object-contain" /><span className="truncate">{appOf(x)}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5 normal-case tracking-normal">{nu && <span className="size-2 rounded-full bg-pink-400" />}{ago(x.t)}</span></span>
                  <span className="flex items-start gap-3 px-4 pb-3.5 pt-2">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${x.c}, ${x.c}99)` }}><x.I className="size-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold leading-tight text-white">{x.title}</span>
                      {x.body && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-white/70">{x.body}</span>}</span>
                  </span>
                </button>); })}
          </div>
          <span aria-hidden className="mx-auto mb-2 block h-1 w-10 shrink-0 rounded-full bg-white/30" />
        </div>
      </div>, host || document.body)}
    </div>
  );
}
