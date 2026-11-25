/* METRO › Callsign: dos secciones separadas por color.
   · SWAT · Pelotón D (serie D, desde R01D): R01D–R09D mando, terminación 0 = Team Leader del Pelotón D, terminación 5 = Instructor.
   · METRO (serie C, desde R30C Team Pelotón Leader): miembros, aspirantes y reservas para futuros integrantes.
   Cada sección tiene su lista (se edita solo el indicativo de esa serie), su mapa de libres/ocupados y se pueden sumar o retirar
   casillas al final. Abajo, historial de movimientos y comunicado para Discord firmado por Coordinación e Instructores.
   Gestionan la coordinación y los instructores (más six, Liam y Molina); el resto de la división lo ve. */
import { useEffect, useMemo, useState } from "react";
import { LPC_COLOR } from "@/lib/divisions";
import { ArrowRight, ArrowUpCircle, ArrowDownCircle, Bookmark, Check, History, LogOut, Megaphone, Minus, MoreVertical, Plus, RefreshCw, Search, Settings2, Shield, Target, UserCheck, X } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Avatar, AgentCombo } from "@/components/agents";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { LS, syncWait, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { UNITS, insRole, rosterCall, uMap, uTop } from "@/lib/units";
import { CS_CFG0, K_CFG, K_LOG, K_RES, MOVE_L, emOf, metroComm, csNums, csTok, isReserva, logOf, moveMember, resOf, setCall, setReserva, withTok, type CsCfg, type CsLog, type CsTipo, type Move } from "@/lib/mdcalls";
import { cn } from "@/lib/cn";
import { CsBadges } from "@/components/csbadges";

type Ser = "D" | "C";
type P = { n: string; role: string; c: string; tipo: CsTipo; asp: boolean; swat: boolean };
const SEC: Record<Ser, { l: string; sub: string; acc: string; from: number; top0: number; I: typeof Shield }> = {
  D: { l: "SWAT · Pelotón D", sub: "Serie D desde R01D", acc: "#e05a52", from: 1, top0: 29, I: Shield },
  C: { l: "METRO", sub: "Serie C desde R30C", acc: "#3b8fd9", from: 30, top0: 48, I: Target },
};
/* qué es cada casilla según su número */
const slotRole = (s: Ser, n: number): [string, string] => s === "D"
  ? n < 10 ? ["Mando", "#a78bfa"] : n % 10 === 0 ? ["Team Leader · Pelotón D", "#f5a524"] : n % 10 === 5 ? ["Instructor SWAT", "#22c55e"] : ["Operador SWAT", "#e05a52"]
  : n % 10 === 0 ? ["Líder de Pelotón C", LPC_COLOR] : ["METRO", "#3b8fd9"];
const LEG: Record<Ser, [string, string][]> = { D: [["Mando (R01D–R09D)", "#a78bfa"], ["Team Leader Pelotón D (termina en 0)", "#f5a524"], ["Instructor SWAT (termina en 5)", "#22c55e"], ["Operador", "#e05a52"]],
  C: [["Líder de Pelotón C (termina en 0)", LPC_COLOR], ["Operador / aspirante", "#3b8fd9"]] };
const fecha = (t: number) => { const d = new Date(t), p = (x: number) => String(x).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const parseN = (v: string) => { const m = v.trim().match(/^R?\s*(\d{1,3})\s*[CD]?$/i) || v.match(/(\d{1,3})/); return m ? +m[1] : 0; };

export function MetroCalls({ can }: { can: boolean }) {
  const ver = useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback(), M = uMap("md"), R = UNITS.md.R;
  const [ser, setSer] = useState<Ser>(() => (localStorage.getItem("lspdt.next.csSer") === "C" ? "C" : "D"));
  const go = (s: Ser) => { setSer(s); setSel(""); try { localStorage.setItem("lspdt.next.csSer", s); } catch { /* */ } };
  const [q, setQ] = useState(""), [sel, setSel] = useState(""), [hq, setHq] = useState(""), [hn, setHn] = useState(40), [extra, setExtra] = useState<string[]>([]);
  const [cfg, setCfg] = useJSON<CsCfg & { dTop?: number; cTop?: number }>(K_CFG, CS_CFG0), [cfgOpen, setCfgOpen] = useState(false);
  const log = logOf(), res = useMemo(() => resOf(), [ver]); // eslint-disable-line react-hooks/exhaustive-deps

  /* personas: roster de METRO (con su rol y si es SWAT), aspirantes del examen práctico y reservas */
  const people = useMemo<P[]>(() => {
    const out: P[] = [], seen = new Set<string>();
    for (const [n, r] of Object.entries(M)) { if (!Array.isArray(r)) continue; const t = uTop("md", r); out.push({ n, role: t[1], c: t[2], tipo: "miembro", asp: t[0] === "asp", swat: r.includes("swat") }); seen.add(n); }
    const prac = LS.json<{ rows: { n: string }[] }[]>("lspdt.mdx.prac", []);
    for (const n of [...(Array.isArray(prac) ? prac.flatMap(c => (c.rows || []).map(r => r.n)) : []), ...Object.keys(res), ...extra]) if (n && !seen.has(n)) { seen.add(n); out.push({ n, role: extra.includes(n) && !res[n] ? "Fuera del roster" : "Aspirante", c: "#8a8f97", tipo: "reserva", asp: true, swat: false }); }
    for (const p of out) if (isReserva(p.n)) { p.role = "Reserva"; p.c = "#14b8a6"; }
    return out;
  }, [M, res, extra, log.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const callOf = (p: P) => (p.tipo === "miembro" ? rosterCall(p.n) : res[p.n] || "");
  const numOf = (p: P, s: Ser = ser) => csNums(callOf(p), s)[0] || 0;
  const setNum = (p: P, n: number, s: Ser = ser) => { const v = withTok(callOf(p), s, n); if (setCall(p.n, v, me.n, p.tipo)) toast(n ? `${p.n} · ${csTok(n, s)}` : `${p.n} · ${s === "D" ? "SWAT" : "METRO"} liberado`); setSel(""); };

  /* movimientos de personal: retirar de la METRO, ascender al Pelotón D, aspirante → Operador METRO, reserva */
  const [menu, setMenu] = useState("");
  useEffect(() => { if (!menu) return; const f = () => setMenu(""); window.addEventListener("click", f); return () => window.removeEventListener("click", f); }, [menu]);
  const doMove = async (p: P, mv: Move) => { const q = { op: `¿${p.n} pasa a Operador METRO? Deja de ser aspirante${res[p.n] ? ` y se queda con ${res[p.n]}` : ""}.`, swat: (numOf(p, "C") % 10 === 0 && numOf(p, "C") ? `¿${p.n} asciende al Pelotón D (SWAT)? Como es Líder de Pelotón C, conserva ${csTok(numOf(p, "C"), "C")}; después elegís su callsign D.` : `¿${p.n} asciende al Pelotón D (SWAT)? Libera su callsign de la serie C; después elegís su callsign D.`), out: `¿Retirar a ${p.n} de la METRO? Sale del roster y libera todos sus callsigns.`, back: `¿${p.n} deja el SWAT y vuelve al Pelotón C? Libera su callsign de la serie D${numOf(p, "C") ? ` y se queda con ${csTok(numOf(p, "C"), "C")}` : ""}.` }[mv];
    if (!(await confirm(q, { danger: mv === "out" }))) return; moveMember(p.n, mv, me.n); toast(`${p.n} · ${MOVE_L[mv]}`); if (mv === "swat") { go("D"); setSel(p.n); } };
  const acts = (p: P): [string, typeof X, () => void, boolean?][] => {
    const inRoster = p.tipo === "miembro", L: [string, typeof X, () => void, boolean?][] = [];
    if (p.asp) L.push(["Pasar a Operador METRO", UserCheck, () => void doMove(p, "op")], [isReserva(p.n) ? "Quitar de la reserva" : "Dejar en reserva", Bookmark, () => { setReserva(p.n, !isReserva(p.n), me.n); toast(isReserva(p.n) ? `${p.n} en reserva` : `${p.n} salió de la reserva`); }]);
    if (!inRoster && !p.asp) L.push(["Sumar al roster de la METRO", UserCheck, () => void doMove(p, "op")]);
    if (inRoster && !p.asp && !p.swat) L.push(["Ascender al Pelotón D (SWAT)", ArrowUpCircle, () => void doMove(p, "swat")]);
    if (inRoster && p.swat) { L.push(["Volver al Pelotón C (deja el SWAT)", ArrowDownCircle, () => void doMove(p, "back")]);
      if (!numOf(p, "C")) L.push(["Darle callsign de Líder de Pelotón C", ArrowUpCircle, () => { go("C"); setSel(p.n); toast(`Elegí una casilla terminada en 0 de la serie C para ${p.n}`); }]); }
    if (inRoster) L.push(["Retirar de la METRO", LogOut, () => void doMove(p, "out"), true]);
    else if (res[p.n] !== undefined) L.push(["Quitar de la lista", LogOut, async () => { if (await confirm(`¿Quitar a ${p.n}? Libera su callsign reservado.`, { danger: true })) { setCall(p.n, "", me.n, "reserva"); const R = resOf(); delete R[p.n]; LS.setJSON(K_RES, R); } }, true]);
    return L; };
  const [syncing, setSyncing] = useState(false);
  const refresh = async () => { setSyncing(true); try { await syncWait(); toast("Callsigns y roster actualizados"); } finally { setSyncing(false); } };

  /* ocupación por serie */
  const occ = useMemo(() => { const m: Record<Ser, Map<number, string[]>> = { C: new Map(), D: new Map() };
    for (const p of people) for (const s of ["C", "D"] as const) for (const x of csNums(callOf(p), s)) m[s].set(x, [...(m[s].get(x) || []), p.n]);
    return m; }, [people, log.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const S = SEC[ser], maxUsed = Math.max(0, ...occ[ser].keys()), cfgTop = (ser === "D" ? cfg.dTop : cfg.cTop) ?? S.top0, top = Math.max(cfgTop, maxUsed);
  const setTop = (n: number) => setCfg({ ...cfg, [ser === "D" ? "dTop" : "cTop"]: n });
  const lastFree = !occ[ser].has(top) && top > S.from && top > maxUsed;
  const free = (n: number) => !occ[ser].has(n);

  /* lista de la sección */
  const qq = q.trim().toLowerCase(), match = (p: P) => !qq || `${p.n} ${callOf(p)} ${p.role}`.toLowerCase().includes(qq);
  const inSec = people.filter(p => (ser === "D" ? p.swat || numOf(p, "D") || extra.includes(p.n) : !p.swat || numOf(p, "C") || p.asp)).filter(match);
  const byNum = (a: P, b: P) => (numOf(a) || 999) - (numOf(b) || 999) || a.n.localeCompare(b.n, "es");
  const groups: [string, P[]][] = ser === "D" ? [["Con callsign", inSec.filter(p => numOf(p)).sort(byNum)], ["Sin callsign SWAT", inSec.filter(p => !numOf(p)).sort(byNum)]]
    : [["Miembros", inSec.filter(p => !p.asp).sort(byNum)], ["Aspirantes y reservas", inSec.filter(p => p.asp).sort(byNum)]];
  const selP = people.find(p => p.n === sel);
  const stats = (s: Ser) => ({ used: occ[s].size, dup: [...occ[s].values()].filter(v => v.length > 1).length });
  const addPerson = (n0: string) => { const n = n0.trim(); if (!n) return; const ex = people.find(p => p.n.toLowerCase() === n.toLowerCase());
    if (ex) { setSel(ex.n); if (ser === "D" && !extra.includes(ex.n)) setExtra([...extra, ex.n]); } else { if (ser === "C") LS.setJSON(K_RES, { ...res, [n]: "" }); setExtra([...extra, n]); setSel(n); }
    toast(`Elegí una casilla libre del mapa para ${n}`); };

  /* ---------- comunicado ---------- */
  const pend = log.filter(l => !l.pub);
  const [pick, setPick] = useState<string[] | null>(null), chosen = pick ?? pend.map(l => l.id);
  const [intro, setIntro] = useState("Desde la **Metropolitan Division** de **Los Santos Police Department** informamos los últimos movimientos de personal y de callsigns de la división.");
  const [indic, setIndic] = useState("A partir de este momento, cada integrante debe usar en radio y en servicio el **indicativo que tiene asignado**.\nCualquier duda o error debe comunicarse a la **coordinación por ticket**.");
  const [cierre, setCierre] = useState(""), [names, setNames] = useState(false), [ment, setMent] = useState(true);
  const net = useMemo(() => { const by = new Map<string, CsLog[]>(); for (const l of [...log].filter(l => chosen.includes(l.id)).sort((a, b) => a.t - b.t)) by.set(l.n, [...(by.get(l.n) || []), l]);
    return [...by].map(([n, L]) => ({ n, de: L[0].de, a: L[L.length - 1].a })); }, [log, chosen]);
  const EM = emOf(cfg);
  const firmantes = Object.entries(M).filter(([n, r]) => Array.isArray(r) && !!insRole("md", n)).map(([n]) => n)
    .sort((a, b) => R.findIndex(x => x[0] === uTop("md", M[a])[0]) - R.findIndex(x => x[0] === uTop("md", M[b])[0]));
  const linesOf = (s: Ser) => net.map(x => ({ n: x.n, d: csNums(x.de, s)[0] || 0, a: csNums(x.a, s)[0] || 0 })).filter(x => x.d !== x.a).sort((x, y) => (x.a || x.d) - (y.a || y.d))
    .map(x => !x.d ? `• **${x.n}** ➜ \`${csTok(x.a, s)}\` (${slotRole(s, x.a)[0]})` : !x.a ? `• **${x.n}** · ~~\`${csTok(x.d, s)}\`~~ liberado` : `• **${x.n}** · \`${csTok(x.d, s)}\` ➜ \`${csTok(x.a, s)}\` (${slotRole(s, x.a)[0]})`);
  /* SWAT: primer ingreso (nunca tuvo callsign D ni pasó antes al Pelotón D) o reincorporación */
  const chs = [...log].filter(l => chosen.includes(l.id)).sort((a, b) => a.t - b.t);
  const swIn = chs.filter(l => l.mv === "swat" || /Pelotón D/.test(l.mot || "") && !/deja el SWAT/i.test(l.mot || "")).map(l => ({ n: l.n,
    first: !log.some(o => o.n === l.n && o.t < l.t && (o.mv === "swat" || /Pelotón D/.test(o.mot || "") || csNums(o.de, "D")[0] || csNums(o.a, "D")[0])) }));
  const swN = new Set(swIn.map(x => x.n));
  /* líderes de pelotón: casillas terminadas en 0 (C y D) */
  const lid = (["C", "D"] as Ser[]).flatMap(s => net.map(x => ({ n: x.n, d: csNums(x.de, s)[0] || 0, a: csNums(x.a, s)[0] || 0 })).filter(x => x.a && x.a % 10 === 0 && x.a !== x.d)
    .map(x => `• **${x.n}** asume como **Líder de Pelotón ${s}** · \`${csTok(x.a, s)}\``));
  const sinLid = (s: Ser) => linesOf(s).filter(t => !lid.some(l => l.includes(`**${t.match(/\*\*(.+?)\*\*/)?.[1]}**`) && l.includes(`Pelotón ${s}`)));
  const per = chs.filter(l => l.mot && !swN.has(l.n)).map(l => `• **${l.n}** — ${l.mot}`);
  const secs: [string, string[]][] = [
    ["🎉 BIENVENIDOS AL S.W.A.T.", swIn.filter(x => x.first).map(x => `• **${x.n}** — primer ingreso al Pelotón D. ¡Felicitaciones y bienvenido!`)],
    ["🔁 REINCORPORACIONES AL S.W.A.T.", swIn.filter(x => !x.first).map(x => `• **${x.n}** vuelve al Pelotón D. ¡Bienvenido de nuevo!`)],
    ["⭐ LÍDERES DE PELOTÓN", lid], ["👥 MOVIMIENTOS DE PERSONAL", per], ["🛡️ SWAT · PELOTÓN D · CALLSIGNS", sinLid("D")], [`${EM} METRO · PELOTÓN C · CALLSIGNS`, sinLid("C")]];
  const body = secs.flatMap(x => x[1]);
  const felic = swIn.some(x => x.first) ? `Felicitamos a ${swIn.filter(x => x.first).map(x => `**${x.n}**`).join(", ").replace(/, ([^,]*)$/, " y $1")} por su ingreso al **S.W.A.T.**: es el resultado de su trabajo y su compromiso con la división.` : "";
  const txt = metroComm({ cfg, title: swIn.length && !body.some(x => x.includes("➜")) ? "Ingresos al S.W.A.T." : "Actualización de callsigns", intro: [intro, felic].filter(Boolean).join("\n\n"), secs: [...secs, ["📌 INDICACIONES", indic.split("\n").map(x => x.trim()).filter(Boolean).map(x => `• ${x.replace(/^[•\-]\s*/, "")}`)]],
    cierre, names: names ? firmantes : undefined, mention: ment });
  const markPub = () => { const ids = new Set(chosen); LS.setJSON(K_LOG, logOf().map(l => (ids.has(l.id) ? { ...l, pub: true } : l))); setPick(null); toast("Movimientos marcados como comunicados"); };
  const hist = log.filter(l => !hq.trim() || `${l.n} ${l.de} ${l.a} ${l.by}`.toLowerCase().includes(hq.trim().toLowerCase()));

  return (
    <div className="space-y-5">
      {/* secciones */}
      <div className="grid gap-3 sm:grid-cols-2">{(["D", "C"] as const).map(s => { const X = SEC[s], st = stats(s), on = ser === s; return (
        <button key={s} onClick={() => go(s)} style={{ ["--a" as string]: X.acc }} className={cn("group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", on ? "border-[color:var(--a)] bg-[color-mix(in_srgb,var(--a)_12%,transparent)] shadow-sm" : "border-slate-200 hover:border-[color-mix(in_srgb,var(--a)_60%,transparent)] dark:border-slate-800")}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: X.acc + "26", color: X.acc }}><X.I className="size-5" /></span>
          <span className="min-w-0 flex-1"><b className="font-display block text-[17px] uppercase tracking-wide" style={on ? { color: X.acc } : undefined}>{X.l}</b><span className="text-xs text-slate-500">{X.sub}</span></span>
          <span className="text-right text-xs text-slate-500"><b className="block font-mono text-lg text-slate-800 dark:text-white">{st.used}</b>en uso{st.dup > 0 && <span className="block font-semibold text-red-500">{st.dup} repetido{st.dup > 1 ? "s" : ""}</span>}</span>
        </button>); })}</div>

      <div style={{ ["--a" as string]: S.acc }} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* lista */}
        <Card className="p-0">
          <div className="flex items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar en ${S.l}`} className="pl-9" /></label>
            <button onClick={refresh} disabled={syncing} title="Traer lo último (también se actualiza solo)" className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:hover:text-white"><RefreshCw className={cn("size-4", syncing && "animate-spin")} /></button>
            {!can && <span className="text-[11px] text-slate-400">Solo lectura</span>}</div>
          {groups.map(([gl, L]) => L.length > 0 && <div key={gl}>
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">{gl} <span className="font-mono text-slate-400">{L.length}</span></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.map(p => { const n = numOf(p), on = sel === p.n, d = n > 0 && (occ[ser].get(n) || []).length > 1, other = csNums(callOf(p), ser === "D" ? "C" : "D")[0]; return (
              <div key={p.n} onClick={() => can && setSel(on ? "" : p.n)} className={cn("flex items-center gap-3 px-4 py-2 transition", can && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40", on && "bg-[color-mix(in_srgb,var(--a)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--a)_12%,transparent)]")}>
                <Avatar n={p.n} size={30} />
                <div className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{p.n}</b>
                  <span className="text-[11px] font-semibold" style={{ color: p.c }}>{p.role}</span><CsBadges s={callOf(p)} className="ml-1.5 align-middle" />{other ? <span className="ml-1.5 font-mono text-[10.5px] text-slate-400">· {csTok(other, ser === "D" ? "C" : "D")}</span> : null}</div>
                {can ? <input key={n} defaultValue={n ? csTok(n, ser) : ""} placeholder={on ? "Elegí en el mapa" : "—"} onClick={e => { e.stopPropagation(); setSel(p.n); }}
                  onBlur={e => { const v = parseN(e.target.value); if (v !== n) { if (v && !free(v) && !(occ[ser].get(v) || []).includes(p.n)) { toast(`${csTok(v, ser)} ya lo tiene ${(occ[ser].get(v) || []).join(", ")}`, "err"); e.target.value = n ? csTok(n, ser) : ""; return; } setNum(p, v); } }}
                  onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className={cn("h-8 w-[4.6rem] rounded-lg border bg-transparent text-center font-mono text-[12.5px] font-bold uppercase outline-none transition focus:border-[color:var(--a)]", d ? "border-red-400 text-red-600" : n ? "border-slate-200 dark:border-slate-700" : "border-dashed border-slate-300 text-slate-400 dark:border-slate-700")} />
                  : <span className={cn("w-[4.6rem] text-center font-mono text-[12.5px] font-bold", d ? "text-red-600" : !n && "text-slate-400")}>{n ? csTok(n, ser) : "—"}</span>}
                {can && acts(p).length > 0 && <div className="relative"><button aria-label={`Acciones de ${p.n}`} title="Movimientos de personal" onClick={e => { e.stopPropagation(); setMenu(menu === p.n ? "" : p.n); }} className={cn("grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white", menu === p.n && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white")}><MoreVertical className="size-4" /></button>
                  {menu === p.n && <div onClick={e => e.stopPropagation()} className="absolute right-0 top-8 z-30 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">{acts(p).map(([l, I, f, danger]) => (
                    <button key={l} onClick={() => { setMenu(""); f(); }} className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition hover:bg-slate-50 dark:hover:bg-slate-800", danger ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200")}><I className="size-4 shrink-0 opacity-80" />{l}</button>))}</div>}</div>}
                {can && <button aria-label={`Retirar el callsign de ${p.n}`} title="Retirar" disabled={!n} onClick={async e => { e.stopPropagation(); if (await confirm(`¿Retirar ${csTok(n, ser)} a ${p.n}?`)) setNum(p, 0); }} className="text-slate-300 enabled:hover:text-red-500 disabled:opacity-0"><X className="size-4" /></button>}
              </div>); })}</div></div>)}
          {!inSec.length && <p className="px-4 py-10 text-center text-sm text-slate-400">Nadie coincide.</p>}
          {can && <div className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <AgentCombo free clearable={false} value="" onChange={addPerson} className="flex-1" placeholder={ser === "D" ? "Agregar agente al SWAT: buscá o escribí el nombre" : "Reservar para alguien: buscá o escribí el nombre"} /></div>}
        </Card>

        {/* mapa */}
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-semibold" style={{ color: S.acc }}>Mapa · {S.l}</h3>
            <span className="text-xs text-slate-500">{csTok(S.from, ser)} a {csTok(top, ser)}</span>
            {can && <span className="ml-auto inline-flex items-center gap-1">
              <button onClick={() => lastFree && setTop(top - 1)} disabled={!lastFree} title={lastFree ? `Retirar ${csTok(top, ser)}` : "La última casilla está en uso"} className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-500 enabled:hover:border-red-400 enabled:hover:text-red-500 disabled:opacity-40 dark:border-slate-700"><Minus className="size-3.5" />Retirar casilla</button>
              <button onClick={() => setTop(top + 1)} title={`Agregar ${csTok(top + 1, ser)}`} className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-500 hover:border-[color:var(--a)] hover:text-[color:var(--a)] dark:border-slate-700"><Plus className="size-3.5" />Agregar casilla</button></span>}
          </div>
          {selP && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: S.acc + "1a" }}>Tocá una casilla libre para <b>{selP.n}</b>{numOf(selP) ? <> (hoy {csTok(numOf(selP), ser)})</> : null}.</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.6rem,1fr))] gap-1.5">{Array.from({ length: top - S.from + 1 }, (_, i) => S.from + i).map(x => { const who = occ[ser].get(x), d = (who || []).length > 1, [rl, rc] = slotRole(ser, x), mine = who?.includes(sel);
            return who ? <div key={x} title={`${csTok(x, ser)} · ${rl}\n${who.join(" · ")}`} onClick={() => can && setSel(who[0])} style={d ? undefined : { borderColor: rc + "99", background: rc + "1f" }}
              className={cn("min-w-0 cursor-default rounded-lg border px-2 py-1.5 leading-tight", can && "cursor-pointer", d && "border-red-500 bg-red-500/15", mine && "ring-2 ring-[color:var(--a)] ring-offset-1 ring-offset-white dark:ring-offset-slate-900")}>
              <b className="block font-mono text-[12px]" style={{ color: d ? "#ef4444" : rc }}>{csTok(x, ser)}</b><span className="block truncate text-[10.5px] text-slate-600 dark:text-slate-300">{who.map(n => n.split(" ")[0]).join(" / ")}</span></div>
              : <button key={x} disabled={!can || !selP} onClick={() => selP && setNum(selP, x)} title={`${csTok(x, ser)} · ${rl} · libre`} style={{ borderColor: rc + "80", color: rc }}
                className="rounded-lg border border-dashed px-2 py-1.5 text-left leading-tight transition enabled:hover:bg-slate-100 disabled:cursor-default dark:enabled:hover:bg-slate-800"><b className="block font-mono text-[12px]">{csTok(x, ser)}</b><span className="block text-[10.5px] opacity-70">libre</span></button>; })}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">{LEG[ser].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
            <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm border border-dashed border-slate-400" />libre</span><span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-red-500" />repetido</span></div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* historial */}
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2"><History className="size-4 text-brand-500" /><h3 className="text-[15px] font-semibold">Historial de movimientos</h3>
            <Input value={hq} onChange={e => setHq(e.target.value)} placeholder="Filtrar" className="ml-auto h-8 max-w-[11rem] text-xs" /></div>
          {!hist.length ? <p className="py-6 text-center text-sm text-slate-400">Todavía no hay movimientos.</p>
            : <ul className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto pr-1 text-[13px] dark:divide-slate-800">{hist.slice(0, hn).map(l => (
              <li key={l.id} className="flex items-center gap-2 py-1.5">
                <span className="w-[4.6rem] shrink-0 font-mono text-[11px] text-slate-400">{fecha(l.t)}</span>
                <b className="min-w-0 truncate">{l.n}</b>
                {l.mot && <span className={cn("shrink-0 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300", l.de === l.a && "ml-auto")}>{l.mot}</span>}
                {l.de !== l.a && <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[11.5px]"><span className={l.de ? "text-slate-500 line-through decoration-slate-400/60" : "text-slate-300"}>{l.de || "—"}</span><ArrowRight className="size-3 text-slate-400" /><span className={l.a ? "font-semibold text-brand-700 dark:text-brand-300" : "text-red-500"}>{l.a || "libre"}</span></span>}
                <span title={`Por ${l.by}${l.pub ? " · comunicado" : ""}`} className="hidden w-16 shrink-0 truncate text-right text-[11px] text-slate-400 sm:block">{l.pub && <Check className="mr-0.5 inline size-3 text-emerald-500" />}{l.by.split(" ")[0]}</span>
              </li>))}</ul>}
          {hist.length > hn && <button onClick={() => setHn(hn + 60)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Ver más ({hist.length - hn})</button>}
        </Card>

        {/* comunicado */}
        {can ? <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2"><Megaphone className="size-4 text-brand-500" /><h3 className="text-[15px] font-semibold">Comunicado</h3>
            <span className="text-xs text-slate-500">Coordinación & Instrucción de la METRO</span>
            <button onClick={() => setCfgOpen(!cfgOpen)} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"><Settings2 className="size-3.5" />Emote y mención</button></div>
          {cfgOpen && <div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
            <label className="space-y-1 text-xs text-slate-500">Emote de la METRO (se guarda para todos)<Input key={cfg.em} defaultValue={cfg.em} placeholder="<:Metro:1316164549975736452>" onBlur={e => e.target.value.trim() !== cfg.em && setCfg({ ...cfg, em: e.target.value.trim() })} className="font-mono text-xs" /></label>
            <label className="space-y-1 text-xs text-slate-500">Roles a mencionar (IDs separados por espacio)<Input key={cfg.rol} defaultValue={cfg.rol} placeholder="1493377759714742308 1493377759714742309" onBlur={e => { const v = (e.target.value.match(/\d{15,20}/g) || []).join(" "); if (v !== cfg.rol) setCfg({ ...cfg, rol: v }); }} className="font-mono text-xs" /></label>
            <p className="text-[11px] text-slate-400 sm:col-span-2">Vacío vuelve al emblema y los roles de la METRO de siempre. Sirven también para los resultados del examen práctico.</p></div>}
          <div className="flex items-center text-xs font-semibold text-slate-500">Movimientos a incluir <span className="ml-1 font-mono font-normal text-slate-400">{chosen.length}</span>
            <button onClick={() => setPick(pend.map(l => l.id))} className="ml-auto font-normal hover:text-slate-800 dark:hover:text-white">Sin comunicar ({pend.length})</button><span className="mx-1 text-slate-300">·</span><button onClick={() => setPick([])} className="font-normal hover:text-slate-800 dark:hover:text-white">Ninguno</button></div>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 p-1.5 text-[12.5px] dark:border-slate-700">{log.slice(0, 80).map(l => { const on = chosen.includes(l.id); return (
            <li key={l.id}><label className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1", on ? "bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
              <input type="checkbox" checked={on} onChange={() => setPick(on ? chosen.filter(x => x !== l.id) : [...chosen, l.id])} className="accent-[rgb(var(--b-500))]" />
              <span className="min-w-0 flex-1 truncate">{l.n}</span><span className="shrink-0 font-mono text-[11px] text-slate-500">{l.mot || l.a || "libre"}</span>{l.pub && <Check className="size-3 text-emerald-500" />}</label></li>); })}
            {!log.length && <li className="px-2 py-4 text-center text-slate-400">Sin movimientos</li>}</ul>
          <label className="block space-y-1 text-xs font-semibold text-slate-500">Introducción<Textarea value={intro} onChange={e => setIntro(e.target.value)} rows={2} className="text-[13px] font-normal" /></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-500">📌 Indicaciones <span className="font-normal text-slate-400">(una por línea)</span><Textarea value={indic} onChange={e => setIndic(e.target.value)} rows={3} className="text-[13px] font-normal" /></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-500">Cierre <span className="font-normal text-slate-400">(opcional)</span><Input value={cierre} onChange={e => setCierre(e.target.value)} className="text-[13px] font-normal" /></label>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={ment} onChange={e => setMent(e.target.checked)} className="accent-[rgb(var(--b-500))]" />Mencionar roles (oculto)</label>
            <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={names} onChange={e => setNames(e.target.checked)} className="accent-[rgb(var(--b-500))]" />Nombres de quienes firman ({firmantes.length})</label>
            <Button size="sm" variant="outline" icon={<Check />} onClick={markPub} disabled={!chosen.length} className="ml-auto">Marcar como comunicado</Button></div>
        </Card> : <div />}
      </div>
      {can && <DiscordOutput title="Comunicado de callsigns" text={body.length ? txt : "Elegí al menos un movimiento."} sticky={false} />}
    </div>);
}
