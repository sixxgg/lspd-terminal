/* METRO › Examen práctico de los aspirantes (six, Liam Campbell y Evelyn Molina). Por convocatoria: asistencia a las dos clases,
   callsign futuro y notas del examen (Mando de Táctico y 246 en comunicación/decisión/organización; Negociación y Circuito de Agilidad).
   Global = promedio de los cuatro ejercicios, de 0 (peor) a 10 (mejor); se aprueba con 6.
   Edición en equipo: cada uno trabaja sobre un borrador (sus cambios encima de lo guardado) y guarda con «Guardar». Se ve en vivo quién
   está editando y qué; si dos tocan la misma nota, al guardar se pregunta si reemplazar o quedarse con lo del otro. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleSlash, FileText, Plus, RefreshCw, RotateCcw, Save, Send, Trash2, Trophy, UserPlus, Users, Wand2, X } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { Modal } from "@/components/modal";
import { Avatar } from "@/components/agents";
import { DiscordOutput } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { getRoster, uid } from "@/lib/domain";
import { LS, ktOf, syncWait, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { api } from "@/lib/api";
import { rosterCall, uMap, uRosterCo, uSaveMap } from "@/lib/units";
import { callOfAny, resOf, setCall } from "@/lib/mdcalls";
import { cn } from "@/lib/cn";

type As = "" | "si" | "jus" | "no";
type S = { tc?: number; td?: number; to?: number; ac?: number; ad?: number; ao?: number; neg?: number; cir?: number };
type Row = { id: string; n: string; c1: As; c2: As; cs?: string; s: S };
type Conv = { id: string; n: string; rows: Row[] };
type V = string | number | undefined;
const K = "lspdt.mdx.prac", DRAFT = "lspdt.next.pracDraft", APR = 6, DEL = "\u0000";
/* ids fijos para la planilla inicial: así todos los navegadores hablan de las mismas filas aunque todavía no se haya guardado */
const r0 = (n: string, c1: As, c2: As, id = uid()): Row => ({ id, n, c1, c2, s: {} });
const SEED: Conv[] = [{ id: "C1", n: "Convocatoria 1", rows: [r0("Thomas Cooper", "si", "no", "a1"), r0("Violeth Faith", "si", "si", "a2"), r0("Madison Lopez", "si", "si", "a3"), r0("Naia Bishop", "si", "si", "a4"),
  r0("Ethan Roggers", "si", "no", "a5"), r0("Ryan Sullivan", "si", "si", "a6"), r0("Daniel Santos Prieto", "si", "si", "a7"), r0("Mia Jhonson", "no", "no", "a8")] }];
const AS: [Exclude<As, "">, string, typeof Check, string][] = [["si", "Asiste", Check, "bg-emerald-500 text-white border-emerald-500"], ["jus", "Justificado", FileText, "bg-sky-500 text-white border-sky-500"], ["no", "No asiste", X, "bg-red-500 text-white border-red-500"]];
const EJ: [string, string, (keyof S)[]][] = [["Mando de Táctico", "MT", ["tc", "td", "to"]], ["246", "246", ["ac", "ad", "ao"]], ["Negociación", "NEG", ["neg"]], ["Circuito de Agilidad", "CA", ["cir"]]];
const SUB = ["Comunicación", "Decisión", "Organización"];
const SK = EJ.flatMap(e => e[2]);
const FL: Record<string, string> = { n: "Aspirante", c1: "Clase 1", c2: "Clase 2", cs: "Callsign", ...Object.fromEntries(EJ.flatMap(([l, , ks]) => ks.map((k, i) => ["s." + k, ks.length > 1 ? `${l} · ${SUB[i]}` : l]))) };
const f1 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 });
const avg = (L: number[]) => L.reduce((a, b) => a + b, 0) / L.length;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
function calc(s: S) {
  const ej = EJ.map(([, , ks]) => { const v = ks.map(k => s[k]); return v.every(x => typeof x === "number") ? avg(v as number[]) : null; });
  const g = ej.every(x => x !== null) ? avg(ej as number[]) : null;
  return { ej, g, st: g === null ? "pen" : g >= APR ? "apr" : "rep" } as const;
}
const ST: Record<string, [string, string, string]> = { pen: ["Pendiente", "text-slate-400", "⏳"], apr: ["Aprobado", "text-emerald-600 dark:text-emerald-400", "✅"], rep: ["No aprobado", "text-red-600 dark:text-red-400", "❌"] };
const tone = (v: number) => (v < APR ? "border-red-400/50 bg-red-500/10 text-red-600 dark:text-red-300" : v < 8 ? "border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-300" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300");
const gTone = (g: number) => (g < APR ? "text-red-600 dark:text-red-400" : g < 8 ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-400");

/* ---------- borrador: lo guardado aplanado en claves «conv|fila|campo» y mis cambios encima ---------- */
function flat(L: Conv[]) {
  const m: Record<string, V> = {};
  for (const c of L) { m[c.id + "|_"] = c.n; for (const r of c.rows) { const p = `${c.id}|${r.id}|`; m[p + "n"] = r.n; m[p + "c1"] = r.c1 || ""; m[p + "c2"] = r.c2 || ""; m[p + "cs"] = r.cs || ""; for (const k of SK) m[p + "s." + k] = r.s?.[k]; } }
  return m;
}
const rowOf = (id: string, get: (f: string) => V): Row => ({ id, n: String(get("n") ?? ""), c1: (get("c1") || "") as As, c2: (get("c2") || "") as As, cs: String(get("cs") || ""),
  s: Object.fromEntries(SK.map(k => [k, get("s." + k)]).filter(([, v]) => typeof v === "number")) as S });
function apply(L: Conv[], mine: Record<string, V>): Conv[] {
  const ks = Object.keys(mine), out: Conv[] = [];
  const rowsOf = (cid: string, old: Row[]) => {
    const ids = new Set(old.map(r => r.id)), R = old.filter(r => mine[`${cid}|${r.id}|n`] !== DEL).map(r => { const p = `${cid}|${r.id}|`, F = flat([{ id: cid, n: "", rows: [r] }]); return rowOf(r.id, f => (p + f in mine ? mine[p + f] : F[p + f])); });
    for (const k of ks) { const m = k.match(/^([^|]+)\|([^|]+)\|n$/); if (m && m[1] === cid && !ids.has(m[2]) && mine[k] !== DEL) { const p = `${cid}|${m[2]}|`; R.push(rowOf(m[2], f => mine[p + f])); } }
    return R;
  };
  for (const c of L) out.push({ id: c.id, n: String(c.id + "|_" in mine ? mine[c.id + "|_"] : c.n), rows: rowsOf(c.id, c.rows) });
  for (const k of ks) { const m = k.match(/^([^|]+)\|_$/); if (m && !L.some(c => c.id === m[1])) out.push({ id: m[1], n: String(mine[k]), rows: rowsOf(m[1], []) }); }
  return out;
}
const same = (a: V, b: V) => (a === DEL ? undefined : a ?? "") === (b === DEL ? undefined : b ?? "") || (a === DEL && b === undefined) || (b === DEL && a === undefined);

/* ---------- celdas ---------- */
function Nota({ v, set, busy }: { v?: number; set: (x?: number) => void; busy?: string }) {
  const [t, setT] = useState<string | null>(null);
  const shown = t ?? (typeof v === "number" ? String(v).replace(".", ",") : "");
  const commit = () => { if (t === null) return; const x = parseFloat(t.replace(",", ".")); set(t.trim() === "" || isNaN(x) ? undefined : Math.min(10, Math.max(0, x))); setT(null); };
  return <input inputMode="decimal" value={shown} placeholder="–" title={busy ? `${busy} lo está cambiando` : "Nota de 0 (peor) a 10 (mejor)"} onChange={e => setT(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    className={cn("h-8 w-12 rounded-lg border bg-transparent text-center text-[13px] tabular-nums outline-none transition focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900",
      typeof v === "number" ? tone(v) : "border-dashed border-slate-200 dark:border-slate-700", busy && "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-white dark:ring-offset-slate-900")} />;
}
function Asis({ v, set, busy }: { v: As; set: (x: As) => void; busy?: string }) {
  return <div title={busy ? `${busy} lo está cambiando` : undefined} className={cn("inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700", busy && "ring-2 ring-amber-400/70")}>
    {AS.map(([k, l, I, on]) => <button key={k} title={l} aria-label={l} aria-pressed={v === k} onClick={() => set(v === k ? "" : k)}
      className={cn("grid size-7 place-items-center rounded-md border border-transparent transition", v === k ? on : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white")}><I className="size-3.5" strokeWidth={2.6} /></button>)}
  </div>;
}

/* ---------- presencia en vivo ---------- */
type LiveV = { k?: string[]; go?: number; sv?: number; svk?: string[] };
type Live = { n: string; v: LiveV | null; t: number };

export function MetroPrac() {
  const ver = useStoreVersion(), me = useMe(), { toast, confirm } = useFeedback();
  const stored = useMemo(() => { const L = LS.json<Conv[]>(K, SEED); return Array.isArray(L) && L.length ? L : SEED; }, [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const [dr, setDr] = useState<{ mine: Record<string, V>; base: Record<string, V> }>(() => { try { const d = JSON.parse(localStorage.getItem(DRAFT) || "null"); if (d?.mine) return d; } catch { /* */ } return { mine: {}, base: {} }; });
  const putDr = (d: typeof dr) => { setDr(d); try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* */ } };
  const S0 = useMemo(() => flat(stored), [stored]), view = useMemo(() => apply(stored, dr.mine), [stored, dr.mine]);
  const [cid, setCid] = useState(""), [nuevo, setNuevo] = useState(""), [pick, setPick] = useState(""), [desg, setDesg] = useState(false), [saving, setSaving] = useState(false);
  const [conf, setConf] = useState<{ k: string; theirs: V; mine: V }[] | null>(null);
  const c = view.find(x => x.id === cid) || view[view.length - 1], savedC = stored.find(x => x.id === c.id);
  const nCh = Object.keys(dr.mine).filter(k => !same(dr.mine[k], S0[k])).length;

  /* editar = anotar el cambio sobre lo guardado (si vuelve al valor guardado, deja de ser cambio) */
  const editMany = (ch: Record<string, V>) => {
    const mine = { ...dr.mine }, base = { ...dr.base };
    for (const [k, v] of Object.entries(ch)) { if (!(k in mine)) base[k] = S0[k]; mine[k] = v; if (same(v, S0[k]) && same(S0[k], base[k])) { delete mine[k]; delete base[k]; } }
    putDr({ mine, base }); live.current.k = Object.keys(mine); live.current.dirty = true;
  };
  const edit = (k: string, v: V) => editMany({ [k]: v });
  const key = (rid: string, f: string) => `${c.id}|${rid}|${f}`;
  const addRow = (n: string, cs = "") => { const id = uid(), p = `${c.id}|${id}|`; return { [p + "n"]: n, [p + "c1"]: "", [p + "c2"]: "", [p + "cs"]: cs }; };
  const delRow = (r: Row) => { if (savedC?.rows.some(x => x.id === r.id)) return edit(key(r.id, "n"), DEL); const mine = { ...dr.mine }, base = { ...dr.base }; for (const k of Object.keys(mine)) if (k.startsWith(`${c.id}|${r.id}|`)) { delete mine[k]; delete base[k]; } putDr({ mine, base }); };
  const add = () => { const n = nuevo.trim(); if (!n) return; if (c.rows.some(r => norm(r.n) === norm(n))) return toast(`${n} ya está en la convocatoria`, "err"); editMany(addRow(n)); setNuevo(""); };
  const addConv = () => { const id = "C" + (view.length + 1); edit(id + "|_", "Convocatoria " + (view.length + 1)); setCid(id); };
  const discard = async () => { if (await confirm("¿Descartar tus cambios sin guardar?", { danger: true })) { putDr({ mine: {}, base: {} }); live.current.k = []; live.current.dirty = true; } };

  /* aspirantes del roster de METRO que todavía no están en ninguna convocatoria: se suman a la última (quedan como cambio para guardar) */
  const M = uMap("md"), rosterAsp = Object.keys(M).filter(n => (M[n] || []).includes("asp"));
  const inAny = new Set(view.flatMap(x => x.rows.map(r => norm(r.n))));
  const faltanRoster = rosterAsp.filter(n => !inAny.has(norm(n)));
  const lastId = view[view.length - 1].id;
  useEffect(() => { if (!faltanRoster.length) return; const ch: Record<string, V> = {}; for (const n of faltanRoster) { const id = uid(), p = `${lastId}|${id}|`; Object.assign(ch, { [p + "n"]: n, [p + "c1"]: "", [p + "c2"]: "", [p + "cs"]: "" }); }
    editMany(ch); toast(`${faltanRoster.length} aspirante${faltanRoster.length > 1 ? "s" : ""} del roster sumado${faltanRoster.length > 1 ? "s" : ""} a ${view[view.length - 1].n} · guardá para confirmar`); }, [faltanRoster.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const canRoster = uRosterCo("md", me.n), inRoster = (n: string) => Object.keys(M).some(x => norm(x) === norm(n));

  /* callsigns «C» desde R30C (Team Pelotón Leader) hacia arriba: ocupados por el roster, asignados a aspirantes, libres y repetidos */
  const cs = useMemo(() => {
    const used = new Map<number, string[]>(), nums = (s: string) => [...(s || "").toUpperCase().matchAll(/R(\d+)C/g)].map(m => +m[1]).filter(x => x >= 30);
    const addU = (x: number, n: string) => { const L = used.get(x) || []; if (!L.includes(n)) used.set(x, [...L, n]); };
    /* ocupados según la pestaña Callsign (roster + reservas), salvo la reserva de un aspirante de esta convocatoria: ahí manda la planilla */
    const R = resOf(), here = new Set(c.rows.map(r => r.n));
    for (const n of Object.keys(M)) for (const x of nums(rosterCall(n))) addU(x, n);
    for (const [n, v] of Object.entries(R)) if (!here.has(n)) for (const x of nums(v)) addU(x, n);
    for (const r of c.rows) for (const x of nums(r.cs || "")) addU(x, r.n);
    const sin = c.rows.filter(r => !nums(r.cs || "").length);
    let top = Math.max(48, ...used.keys()); const free = () => Array.from({ length: top - 29 }, (_, i) => 30 + i).filter(x => !used.has(x));
    while (free().length < sin.length + 2) top++;
    return { used, top, free: free(), sin, dup: [...used].filter(([, v]) => v.length > 1).map(([k]) => k), nums };
  }, [c, M]);
  const assign = (rid: string, n: number) => { edit(key(rid, "cs"), `R${n}C`); setPick(""); };
  /* con la pestaña Callsign: traer lo asignado allá (refrescar) o reservar allá lo que se asignó acá */
  const fromTab = c.rows.map(r => ({ r, v: callOfAny(r.n) })).filter(x => x.v && x.v !== (x.r.cs || ""));
  const toTab = c.rows.filter(r => r.cs && !callOfAny(r.n));
  const refresh = () => { const ch: Record<string, V> = {}; for (const x of fromTab) ch[key(x.r.id, "cs")] = x.v; editMany(ch); toast(`${fromTab.length} callsign${fromTab.length === 1 ? "" : "s"} actualizado${fromTab.length === 1 ? "" : "s"} desde la pestaña Callsign · guardá para confirmar`); };
  const push = () => { let n = 0; for (const r of toTab) if (setCall(r.n, r.cs || "", me.n, inRoster(r.n) ? "miembro" : "reserva")) n++; toast(`${n} callsign${n === 1 ? "" : "s"} reservado${n === 1 ? "" : "s"} en la pestaña Callsign`); };
  const autoAssign = () => { const ch: Record<string, V> = {}; cs.sin.forEach((r, i) => { if (cs.free[i] != null) ch[key(r.id, "cs")] = `R${cs.free[i]}C`; }); editMany(ch); toast(`${Object.keys(ch).length} callsigns asignados · guardá para confirmar`); };

  /* en vivo: aviso qué estoy tocando y cuándo guardo; veo a los demás y me entero si guardaron sobre lo mío */
  const live = useRef<{ k: string[]; go?: number; sv?: number; svk?: string[]; dirty: boolean }>({ k: Object.keys(dr.mine), dirty: true });
  const [others, setOthers] = useState<Live[]>([]), seen = useRef<Record<string, number>>({}), liveKt = useRef(0), mineRef = useRef(dr.mine); mineRef.current = dr.mine;
  const tick = useRef<() => Promise<void>>(async () => {});
  useEffect(() => { let on = true, tm = 0;
    tick.current = async () => { window.clearTimeout(tm); const { dirty, ...v } = live.current;
      const r = await api("/api/live", { b: K, ...(dirty ? { s: { k: v.k.slice(0, 300), go: v.go, sv: v.sv, svk: v.svk?.slice(0, 300) } } : {}) }).catch(() => null); if (!on) return;
      if (r && r.__s === 200) { live.current.dirty = false; const O = ((r.o || []) as Live[]).filter(o => o.v); setOthers(O); liveKt.current = r.kt || 0;
        if (r.kt > ktOf(K)) void syncWait();
        const myK = new Set(Object.keys(mineRef.current));
        for (const o of O) { const v = o.v!, ov = (L?: string[]) => (L || []).filter(k => myK.has(k));
          if (v.go && v.go > (seen.current[o.n + "go"] || 0)) { seen.current[o.n + "go"] = v.go; const x = ov(v.k); if (x.length && Date.now() - v.go < 20000) toast(`${o.n} está guardando y tocó lo mismo que vos: ${x.slice(0, 3).map(lab).join(", ")}${x.length > 3 ? "…" : ""}`, "err"); }
          if (v.sv && v.sv > (seen.current[o.n + "sv"] || 0)) { const first = !seen.current[o.n + "sv"]; seen.current[o.n + "sv"] = v.sv; const x = ov(v.svk); if (!first && x.length) toast(`${o.n} guardó cambios en lo que estás editando. Al guardar te pregunto qué queda.`, "err"); } } }
      tm = window.setTimeout(() => void tick.current(), document.hidden ? 15000 : Object.keys(mineRef.current).length ? 3000 : 6000); };
    void tick.current(); const bye = () => { void api("/api/live", { b: K, s: null }); };
    window.addEventListener("pagehide", bye); return () => { on = false; clearTimeout(tm); window.removeEventListener("pagehide", bye); bye(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const busyOf = (k: string) => others.find(o => o.v?.k?.includes(k))?.n;
  const lab = (k: string) => { const [ci, ri, f] = k.split("|"); if (f === undefined) return "Convocatoria"; const conv = view.find(x => x.id === ci) || stored.find(x => x.id === ci); const r = conv?.rows.find(x => x.id === ri) || stored.find(x => x.id === ci)?.rows.find(x => x.id === ri);
    return `${r?.n || "Aspirante"} · ${FL[f] || f}`; };

  /* guardar: aviso que guardo → traigo lo último → si alguien cambió lo mismo, pregunto → guardo mis cambios encima de lo de los demás */
  const write = (mine: Record<string, V>, base0: Record<string, V>) => {
    const fresh = LS.json<Conv[]>(K, SEED), L = apply(Array.isArray(fresh) && fresh.length ? fresh : SEED, mine);
    LS.setJSON(K, L); const ks = Object.keys(mine); putDr({ mine: {}, base: {} }); void base0;
    Object.assign(live.current, { k: [], sv: Date.now(), svk: ks, dirty: true }); void tick.current(); toast(`Convocatoria guardada · ${ks.length} cambio${ks.length === 1 ? "" : "s"}`);
  };
  const save = async () => {
    if (!nCh || saving) return; const myK = Object.keys(dr.mine);
    const overlap = others.flatMap(o => (o.v?.k || []).filter(k => myK.includes(k)).map(k => [o.n, k] as const));
    if (overlap.length && !(await confirm(`${[...new Set(overlap.map(x => x[0]))].join(" y ")} también está modificando: ${overlap.slice(0, 4).map(x => lab(x[1])).join(", ")}${overlap.length > 4 ? "…" : ""}. ¿Guardar y reemplazar lo suyo?`, { danger: true }))) return;
    setSaving(true); Object.assign(live.current, { go: Date.now(), dirty: true }); void tick.current();
    try { if (liveKt.current > ktOf(K)) await syncWait(); } catch { /* */ }
    const F = flat((() => { const x = LS.json<Conv[]>(K, SEED); return Array.isArray(x) && x.length ? x : SEED; })());
    const cf = myK.filter(k => !same(F[k], dr.base[k]) && !same(F[k], dr.mine[k])).map(k => ({ k, theirs: F[k], mine: dr.mine[k] }));
    setSaving(false);
    if (cf.length) return setConf(cf);
    write(dr.mine, dr.base);
  };
  const resolve = (keepMine: boolean) => { if (!conf) return; const mine = { ...dr.mine }; if (!keepMine) for (const x of conf) delete mine[x.k]; setConf(null); write(mine, dr.base); };
  const showV = (k: string, v: V) => { const f = k.split("|")[2]; if (v === DEL || (f === "n" && v === undefined)) return "eliminado"; if (f === "c1" || f === "c2") return AS.find(a => a[0] === v)?.[1] || "—"; return v === undefined || v === "" ? "—" : typeof v === "number" ? f1(v) : String(v); };

  /* resultados para Discord: lo guardado; solo la nota final (el desglose, opcional) */
  const pub = (savedC || { id: c.id, n: c.n, rows: [] }) as Conv, res = c.rows.map(r => ({ r, ...calc(r.s) })), resPub = pub.rows.map(r => ({ r, ...calc(r.s) }));
  const apr = res.filter(x => x.st === "apr").length, pen = res.filter(x => x.st === "pen").length;
  const txt = [`## 🎯 Metropolitan Division · Examen práctico · ${pub.n}`, `-# Nota final de 0 a 10 · se aprueba con ${APR}`, "",
    ...[...resPub].sort((a, b) => (b.g ?? -1) - (a.g ?? -1)).map(x => `${ST[x.st][2]} **${x.r.n}** — ${x.g === null ? "pendiente" : `**${f1(x.g)}**`} · ${ST[x.st][0]}${desg && x.g !== null ? `\n-# ${x.ej.map((e, i) => `${EJ[i][0]} ${e === null ? "—" : f1(e)}`).join(" · ")}` : ""}`), "",
    desg ? "-# Mando de Táctico y 246 promedian comunicación, decisión y organización; Negociación y Circuito de Agilidad tienen una nota cada uno. La nota final es el promedio de los cuatro."
      : "-# La nota final es el promedio de los cuatro ejercicios: Mando de Táctico, 246, Negociación y Circuito de Agilidad. Si querés ver el desglose de tu nota, consultalo con un instructor."].join("\n");
  const th = "px-1.5 py-2 text-center font-semibold";
  const editors = others.filter(o => (o.v?.k || []).length);

  return (
    <div className="space-y-4">
      {/* convocatorias + en línea */}
      <div className="flex flex-wrap items-center gap-2">
        {view.map(x => <button key={x.id} onClick={() => setCid(x.id)} className={cn("rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition", x.id === c.id ? "border-brand-500/60 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:hover:text-white")}>{x.n}{!stored.some(s => s.id === x.id) && <span className="ml-1 text-amber-500">•</span>}</button>)}
        <button onClick={addConv} title="Nueva convocatoria" className="grid size-8 place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-brand-600 dark:border-slate-700"><Plus className="size-4" /></button>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {others.length > 0 && <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" /><span className="flex -space-x-1.5">{others.map(o => <span key={o.n} title={`${o.n}${(o.v?.k || []).length ? ` · editando ${(o.v?.k || []).length} campo${(o.v?.k || []).length === 1 ? "" : "s"}` : " · mirando"}`} className={cn("rounded-full ring-2", (o.v?.k || []).length ? "ring-amber-400" : "ring-white dark:ring-slate-900")}><Avatar n={o.n} size={22} /></span>)}</span>
            {editors.length ? <span className="text-amber-600 dark:text-amber-300">{editors.map(o => o.n.split(" ")[0]).join(" y ")} {editors.length > 1 ? "están" : "está"} editando</span> : <span>en línea</span>}</span>}
          <span className="inline-flex items-center gap-1"><Trophy className="size-3.5 text-emerald-500" /><b className="text-slate-800 dark:text-white">{apr}</b>/{c.rows.length} aprobados</span>{pen > 0 && <span>{pen} pendientes</span>}<span>0 a 10 · aprueba con {APR}</span>
        </div>
      </div>

      {/* cambios sin guardar */}
      {nCh > 0 && <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-50/95 px-3 py-2 text-sm shadow-sm backdrop-blur dark:bg-amber-950/80">
        <span className="size-2 animate-pulse rounded-full bg-amber-500" /><b className="text-amber-800 dark:text-amber-200">{nCh} cambio{nCh === 1 ? "" : "s"} sin guardar</b>
        <span className="text-xs text-amber-700/80 dark:text-amber-300/80">Los demás ven lo guardado hasta que guardes.</span>
        <div className="ml-auto flex gap-2"><Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={discard}>Descartar</Button><Button size="sm" icon={<Save />} onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button></div>
      </div>}

      {/* planilla */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[66rem] border-collapse text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th rowSpan={2} className="px-3 py-2 text-left font-semibold">Aspirante</th><th rowSpan={2} className={th}>Callsign</th><th rowSpan={2} className={th}>Clase 1</th><th rowSpan={2} className={th}>Clase 2</th>
              {EJ.map(([l, , ks]) => <th key={l} colSpan={ks.length} className="border-l border-slate-100 bg-slate-50 px-2 pt-2 text-center font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">{l}</th>)}
              <th rowSpan={2} className="border-l border-slate-100 bg-brand-500/10 px-3 text-center font-bold text-brand-700 dark:border-slate-800 dark:text-brand-300">Global</th><th rowSpan={2} className="px-3 text-left font-semibold">Estado</th>
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {EJ.flatMap(([, , ks]) => ks.map((k, i) => <th key={k} className={cn("bg-slate-50 px-1 pb-2 text-center text-[10px] font-medium normal-case tracking-normal text-slate-400 dark:bg-slate-900/60", i === 0 && "border-l border-slate-100 dark:border-slate-800")}>{ks.length > 1 ? SUB[i] : "Nota"}</th>))}</tr>
          </thead>
          <tbody>{res.length ? res.map(({ r, g, st }) => { const isNew = !savedC?.rows.some(x => x.id === r.id), csN = cs.nums(r.cs || ""), dup = csN.some(x => cs.dup.includes(x)); return (
            <tr key={r.id} className={cn("group border-b border-slate-100 last:border-0 dark:border-slate-800", isNew && "bg-amber-400/[.04]")}>
              <td className="px-3 py-1.5"><div className="flex items-center gap-1.5"><b className="whitespace-nowrap">{r.n}</b>
                {!inRoster(r.n) && (canRoster ? <button title="No está en el roster de METRO: sumarlo como aspirante" onClick={() => { uSaveMap("md", { ...M, [r.n]: ["asp"] }); toast(`${r.n} sumado al roster como aspirante`); }} className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-brand-500/15 hover:text-brand-600 dark:bg-slate-800"><UserPlus className="size-3" />roster</button>
                  : <span title="No está en el roster de METRO" className="text-[10px] text-slate-400">fuera del roster</span>)}
                {busyOf(key(r.id, "n")) && <span className="text-[10px] text-amber-500">{busyOf(key(r.id, "n"))}</span>}
                <button aria-label={`Quitar a ${r.n}`} onClick={async () => { if (await confirm(`¿Quitar a ${r.n} de ${c.n}?`, { danger: true })) delRow(r); }} className="ml-auto text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"><Trash2 className="size-3.5" /></button></div></td>
              <td className="px-1 py-1.5 text-center"><button onClick={() => setPick(pick === r.id ? "" : r.id)} title={dup ? "Callsign repetido" : "Elegir callsign libre"}
                className={cn("h-7 min-w-[3.6rem] rounded-lg border px-1.5 font-mono text-[12px] font-semibold transition", pick === r.id ? "border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300" : dup ? "border-red-400 bg-red-500/10 text-red-600" : r.cs ? "border-slate-200 dark:border-slate-700" : "border-dashed border-slate-300 text-slate-400 dark:border-slate-700", busyOf(key(r.id, "cs")) && "ring-2 ring-amber-400/70")}>{r.cs || "R—C"}</button></td>
              {(["c1", "c2"] as const).map(k => <td key={k} className="px-1 py-1.5 text-center"><Asis v={r[k]} set={x => edit(key(r.id, k), x)} busy={busyOf(key(r.id, k))} /></td>)}
              {EJ.flatMap(([, , ks]) => ks.map((k, i) => <td key={k} className={cn("px-1 py-1.5 text-center", i === 0 && "border-l border-slate-100 dark:border-slate-800")}><Nota v={r.s[k]} set={x => edit(key(r.id, "s." + k), x)} busy={busyOf(key(r.id, "s." + k))} /></td>))}
              <td className="border-l border-slate-100 bg-brand-500/[.04] px-3 text-center font-display text-base font-bold tabular-nums dark:border-slate-800">{g === null ? <span className="text-slate-300">—</span> : <span className={gTone(g)}>{f1(g)}</span>}</td>
              <td className="px-3"><span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold", ST[st][1])}>{st === "apr" ? <Check className="size-3.5" /> : st === "rep" ? <CircleSlash className="size-3.5" /> : null}{ST[st][0]}</span></td>
            </tr>); }) : <tr><td colSpan={15} className="px-3 py-8 text-center text-slate-400">Sin aspirantes en esta convocatoria.</td></tr>}</tbody>
        </table>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Input list="prac-ag" value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Agregar aspirante (nombre del roster)" className="max-w-xs" />
        <datalist id="prac-ag">{getRoster().map(a => <option key={a.n} value={a.n} />)}</datalist>
        <Button variant="outline" icon={<Plus />} onClick={add} disabled={!nuevo.trim()}>Agregar</Button>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-slate-500">{AS.map(([k, l, I, on]) => <span key={k} className="inline-flex items-center gap-1"><span className={cn("grid size-4 place-items-center rounded", on)}><I className="size-2.5" strokeWidth={3} /></span>{l}</span>)}
          <span className="ml-1 inline-flex items-center gap-1">Nota <b>0</b><span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" /><b>10</b></span></span>
      </div>

      {/* callsigns */}
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold">Callsigns desde R30C <span className="text-xs font-normal text-slate-500">(Team Pelotón Leader) hacia arriba</span></h3>
          <span className="ml-auto text-xs text-slate-500"><b className="text-emerald-600 dark:text-emerald-400">{cs.free.length}</b> libres · <b className={cs.sin.length ? "text-amber-600 dark:text-amber-300" : ""}>{cs.sin.length}</b> aspirantes sin callsign{cs.dup.length > 0 && <> · <b className="text-red-600">{cs.dup.length}</b> repetidos</>}</span>
          <Button size="sm" variant={fromTab.length ? "primary" : "outline"} icon={<RefreshCw />} onClick={refresh} disabled={!fromTab.length} title="Trae los callsigns asignados en la pestaña Callsign">Refrescar desde Callsign{fromTab.length ? ` (${fromTab.length})` : ""}</Button>
          {toTab.length > 0 && <Button size="sm" variant="outline" icon={<Send />} onClick={push} title="Reserva en la pestaña Callsign los que se asignaron acá (queda en el historial)">Pasar a Callsign ({toTab.length})</Button>}
          {cs.sin.length > 0 && <Button size="sm" variant="outline" icon={<Wand2 />} onClick={autoAssign}>Asignar libres</Button>}
        </div>
        <div className="flex flex-wrap gap-1.5">{Array.from({ length: cs.top - 29 }, (_, i) => 30 + i).map(x => { const who = cs.used.get(x), d = cs.dup.includes(x), asp = who?.some(n => c.rows.some(r => r.n === n));
          return who ? <span key={x} title={who.join(" · ")} className={cn("rounded-lg border px-2 py-1 font-mono text-[11.5px]", d ? "border-red-400 bg-red-500/10 font-bold text-red-600" : asp ? "border-brand-400/50 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-400 dark:border-slate-700")}>R{x}C<span className="ml-1 font-sans text-[10px] opacity-80">{who.map(n => n.split(" ")[0]).join("/")}</span></span>
            : <button key={x} onClick={() => { const r = c.rows.find(r => r.id === pick) || cs.sin[0]; if (r) assign(r.id, x); }} title={pick ? `Asignar a ${c.rows.find(r => r.id === pick)?.n}` : cs.sin[0] ? `Asignar a ${cs.sin[0].n}` : "Libre"}
              className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 font-mono text-[11.5px] font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300">R{x}C</button>; })}</div>
        <p className="text-xs text-slate-500">{pick ? <>Tocá un callsign libre (verde) para dárselo a <b>{c.rows.find(r => r.id === pick)?.n}</b>.</> : cs.sin.length ? <>Faltan: {cs.sin.map(r => r.n).join(", ")}. Tocá su casilla de callsign y elegí uno libre, o «Asignar libres».</> : "Todos los aspirantes tienen callsign."}
          <span className="ml-1 text-slate-400">Gris: roster y reservas de la pestaña Callsign · azul: aspirantes · rojo: repetido.</span></p>
      </Card>

      {/* publicar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Publicar resultados de <b>{pub.n}</b> (lo guardado){nCh > 0 && " · guardá antes para incluir tus cambios"}</span>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={desg} onChange={e => setDesg(e.target.checked)} className="accent-[rgb(var(--b-500))]" />Incluir desglose por ejercicio</label>
        </div>
        <DiscordOutput title="Resultados" text={txt} sticky={false} />
      </div>

      {/* choque: alguien guardó lo mismo antes */}
      <Modal open={!!conf} onClose={() => setConf(null)} size="md" title="Alguien guardó lo mismo antes que vos" desc="Elegí qué queda. El resto de tus cambios se guarda igual."
        footer={<div className="flex w-full flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => setConf(null)}>Cancelar</Button><Button variant="outline" onClick={() => resolve(false)}>Quedarme con lo de ellos</Button><Button onClick={() => resolve(true)}>Reemplazar con lo mío</Button></div>}>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700"><div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-3 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400"><span>Campo</span><span className="text-center">Guardado</span><span className="text-center">Lo tuyo</span></div>{(conf || []).map(x => (
          <div key={x.k} className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-3 px-3 py-2"><span className="min-w-0 truncate">{lab(x.k)}</span>
            <span className="truncate rounded-md bg-slate-100 px-2 py-0.5 text-center text-xs dark:bg-slate-800" title="Guardado">{showV(x.k, x.theirs)}</span><span className="truncate rounded-md bg-brand-500/15 px-2 py-0.5 text-center text-xs font-semibold text-brand-700 dark:text-brand-300" title="Lo tuyo">{showV(x.k, x.mine)}</span></div>))}</div>
      </Modal>
    </div>);
}
