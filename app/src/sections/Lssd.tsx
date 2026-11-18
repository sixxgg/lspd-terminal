/* LSSD (Los Santos Sheriff's Department): inicio, roster, divisiones y secciones en construcción.
   El roster sale de lspdt.lssd.roster (lo carga six; si no hay, el servidor manda el de la planilla). Los rangos van en inglés, como en la planilla. */
import { useMemo, useState, type ReactNode } from "react";
import { Briefcase, Check, ClipboardList, Construction, Dog, ExternalLink, Scale, Search, Star, Upload, Users } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { LS, ME_ROLES, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { DEPTS, deptLogo, isK9, lssdLvl, lssdRoster, type LssdAg } from "@/lib/dept";
import { LSSD_DIVS, LSSD_OFFICES } from "@/lib/lssdDiv";
import { LssdIns } from "@/components/lssdIns";
import { initials, norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

/* grupos como en la planilla del Sheriff */
const GROUPS: [string, (l: number) => boolean][] = [["Executive Staff", l => l >= 11], ["Command Staff", l => l >= 8 && l <= 10], ["Supervisor Staff", l => l === 7],
  ["Deputy Sheriff Master FTO", l => l === 6], ["Deputy Sheriff Bonus II", l => l === 5], ["Deputy Sheriff Bonus I", l => l === 4], ["Deputy Sheriff", l => l === 3], ["Deputy Sheriff Trainee", l => l === 2]];
const estCol = (e?: string) => (!e || e === "Activo" ? "bg-emerald-500" : /justif/i.test(e) ? "bg-sky-500" : /mediana/i.test(e) ? "bg-amber-500" : "bg-slate-400");
const k9Id = (p: string) => `K-${String(p).padStart(3, "0")}`;
const people = (R: LssdAg[]) => R.filter(a => !isK9(a));

export function LssdHome() {
  useStoreVersion();
  const me = useMe(), R = people(lssdRoster()), mine = R.find(a => a.n === me.n), act = R.filter(a => !a.e || a.e === "Activo").length;
  const h = new Date().getHours(), sal = h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
  return (
    <div className="space-y-6">
      <div className="rise relative overflow-hidden rounded-3xl border border-emerald-900/30 bg-gradient-to-br from-[#1f3b2a] via-[#1a2e22] to-[#0f1a14] p-8 text-white shadow-xl">
        <img src={deptLogo("lssd")} alt="" className="pointer-events-none absolute -right-10 -top-10 size-72 opacity-10" />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/90">{DEPTS.lssd.name}</p>
        <h1 className="mt-2 font-display text-4xl font-bold">{sal}, {me.n.split(" ")[0]}</h1>
        <p className="mt-2 max-w-xl text-sm text-emerald-100/80">La terminal del Sheriff está en construcción. Ya podés ver el roster y las divisiones; el resto de las secciones se van habilitando de a poco.</p>
        {mine && <div className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/10">
          <LssdIns r={mine.r} className="size-12" /><div><p className="font-semibold">{mine.n}</p><p className="text-xs text-emerald-100/70">{mine.r} · Placa #{mine.p}</p></div></div>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Personal", R.length], ["Activos", act], ["Supervisión y mando", R.filter(a => lssdLvl(a.r) >= 7).length]].map(([l, n], i) => (
          <Card key={i} className="rise p-5" style={{ ["--d" as string]: `${80 + i * 60}ms` }}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</p><p className="mt-1 font-display text-4xl font-bold">{n}</p></Card>))}
      </div>
    </div>);
}

/* importar la planilla: se copia entera en Google Sheets (Ctrl+A, Ctrl+C) y se pega acá. Columnas: Usuario, Ingreso, Placa, Nombre, Insignia, Rango, Actividad…
   Los rangos vienen numerados («03. Deputy Sheriff»), «D.S. Trainee» abreviado y los perros como «01. K-9» (la columna Usuario es la del handler). */
const fixRank = (r: string) => { const x = r.replace(/^\d+\.\s*/, "").trim(); return /^d\.?\s*s\.?\s*trainee$/i.test(x) ? "Deputy Sheriff Trainee" : /^k-?9$/i.test(x) ? "K-9" : x; };
function parseSheet(t: string): LssdAg[] {
  const rows = t.replace(/\r/g, "").split("\n").map(l => l.split("\t").map(c => c.trim()));
  const hi = rows.findIndex(r => r.some(c => /^usuario$/i.test(c)) && r.some(c => /^rango$/i.test(c)));
  const H = hi >= 0 ? rows[hi].map(c => norm(c)) : ["usuario", "ingreso", "placa", "nombre", "insignia", "rango", "actividad"];
  const col = (k: string) => H.findIndex(h => h.startsWith(k));
  const [cu, ci, cp, cn, cr, ca] = [col("usuario"), col("ingreso"), col("placa"), col("nombre"), col("rango"), col("actividad")];
  /* el apellido va en la columna de al lado (con encabezado «Apellido» o vacío, porque «Nombre» está combinado) */
  const ca2 = col("apellido") >= 0 ? col("apellido") : H[cn + 1] === "" ? cn + 1 : -1;
  const out: LssdAg[] = [];
  for (const r of rows.slice(hi + 1)) {
    const n = [r[cn], ca2 >= 0 ? r[ca2] : ""].filter(Boolean).join(" ").trim(), rk = fixRank(r[cr] || ""), u = (r[cu] || "").replace(/^\.\s+/, "");
    if (!n || !rk || /^n\/?a$/i.test(rk)) continue;
    const a: LssdAg = { i: r[ci] || "", p: (r[cp] || "").replace(/\D/g, ""), n, r: rk, e: r[ca] || "Activo" };
    if (rk === "K-9") { if (u) a.h = u; } else a.u = u;
    out.push(a);
  }
  for (const d of out.filter(isK9)) { const hd = d.h && out.find(x => !isK9(x) && norm(x.u || "") === norm(d.h!)); if (hd) d.hn = hd.n; }
  return out;
}
function Importar({ onClose }: { onClose: () => void }) {
  const { toast } = useFeedback(), [t, setT] = useState(""), L = useMemo(() => parseSheet(t), [t]);
  const byR = useMemo(() => Object.entries(L.reduce<Record<string, number>>((a, x) => ({ ...a, [x.r]: (a[x.r] || 0) + 1 }), {})).sort((a, b) => lssdLvl(b[0]) - lssdLvl(a[0])), [L]);
  const sinU = L.filter(a => !isK9(a) && !a.u).length, raros = byR.filter(([r]) => !lssdLvl(r)).map(([r]) => r);
  return (
    <Modal open onClose={onClose} size="lg" icon={<Upload />} title="Actualizar el roster del LSSD" desc="En la planilla: Ctrl+A y Ctrl+C. Pegalo acá abajo (con encabezados incluidos)."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button icon={<Check />} disabled={!L.length} onClick={() => { LS.setJSON("lspdt.lssd.roster", L); toast(`Roster actualizado · ${L.length} integrantes`); onClose(); }}>Reemplazar roster ({L.length})</Button></>}>
      <Textarea rows={8} value={t} onChange={e => setT(e.target.value)} placeholder="Pegá la planilla completa…" className="font-mono text-[11.5px]" />
      {L.length > 0 && <div className="mt-3 space-y-2 text-[13px]">
        <div className="flex flex-wrap gap-1.5">{byR.map(([r, n]) => <span key={r} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5", lssdLvl(r) ? "border-slate-200 dark:border-slate-700" : "border-amber-400 text-amber-600")}>{r} <b>{n}</b></span>)}</div>
        {raros.length > 0 && <p className="text-amber-600">Rangos que no conozco (quedan abajo de todo): {raros.join(", ")}. Decime cuáles son y los ubico.</p>}
        {sinU > 0 && <p className="text-slate-500">{sinU} sin usuario OOC: esos solo van a poder entrar con la placa o el nombre.</p>}
      </div>}
    </Modal>);
}

export function LssdRoster() {
  useStoreVersion();
  const [q, setQ] = useState(""), R = lssdRoster(), [imp, setImp] = useState(false);
  const L = useMemo(() => { const s = norm(q.trim()); return [...R].filter(a => !s || norm(`${a.n} ${a.p} ${a.r} ${a.hn || ""}`).includes(s)).sort((a, b) => lssdLvl(b.r) - lssdLvl(a.r) || +a.p - +b.p); }, [R, q]);
  const K9 = L.filter(isK9);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><h2 className="font-display text-2xl font-bold">Roster del Sheriff</h2><p className="text-sm text-slate-500">{people(R).length} integrantes{R.some(isK9) ? ` y ${R.filter(isK9).length} K-9` : ""} · ordenados por rango</p></div>
        {ME_ROLES.six && <Button variant="outline" icon={<Upload />} onClick={() => setImp(true)}>Actualizar desde la planilla</Button>}
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, placa o rango…" /></div>
      </div>
      {GROUPS.map(([g, f]) => { const G = L.filter(a => !isK9(a) && f(lssdLvl(a.r))); if (!G.length) return null; return (
        <Group key={g} t={g} n={G.length}>{G.map(a => <Row key={a.p + a.n} a={a} />)}</Group>); })}
      {K9.length > 0 && <Group t="K-9 · Canine Service Detail" n={K9.length}>{K9.map(a => <K9Row key={a.p + a.n} a={a} />)}</Group>}
      {!L.length && <p className="py-10 text-center text-sm text-slate-400">Nada coincide.</p>}
      {imp && <Importar onClose={() => setImp(false)} />}
    </div>);
}
const Group = ({ t, n, children }: { t: string; n: number; children: ReactNode }) => (
  <section><h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"><span className="h-px w-6 bg-slate-300 dark:bg-slate-700" />{t}<span className="text-slate-400">· {n}</span></h3>
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div></section>);
const Row = ({ a }: { a: LssdAg }) => (
  <Card className="flex items-center gap-3 p-3">
    <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 text-sm font-bold text-white">{initials(a.n)}
      <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white dark:ring-slate-900", estCol(a.e))} title={a.e || "Activo"} /></span>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.n}</p><p className="truncate text-[12px] text-slate-500">{a.r}{a.e && a.e !== "Activo" ? ` · ${a.e}` : ""}</p></div>
    <span className="font-mono text-xs text-slate-400">#{a.p}</span><LssdIns r={a.r} title={a.r} className="size-9" />
  </Card>);
const K9Row = ({ a }: { a: LssdAg }) => (
  <Card className="flex items-center gap-3 p-3">
    <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white"><Dog className="size-5" />
      <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white dark:ring-slate-900", estCol(a.e))} title={a.e || "Activo"} /></span>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.n}</p><p className="truncate text-[12px] text-slate-500">{a.hn ? `Handler: ${a.hn}` : a.h ? `Handler: ${a.h} (OOC)` : "Sin handler asignado"}</p></div>
    <span className="font-mono text-xs text-slate-400">{k9Id(a.p)}</span><LssdIns r="K-9" title="K-9" className="size-9" />
  </Card>);

/* ---------- divisiones (datos de «Bureaus / Divisions» de Eleven) ---------- */
export function LssdDivision({ k }: { k: string }) {
  useStoreVersion();
  const D = LSSD_DIVS.find(d => d.k === k), R = lssdRoster();
  if (!D) return null;
  const who = (n: string) => R.find(a => !isK9(a) && norm(a.n) === norm(n));
  const K9 = k === "k9" ? R.filter(isK9) : [];
  const list = (t: string, L: string[]) => <Card className="p-5"><h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t}</h3>
    <ul className="mt-3 space-y-1.5 text-sm">{L.map(x => <li key={x} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{x}</li>)}</ul></Card>;
  return (
    <div className="space-y-5">
      <div className="rise relative overflow-hidden rounded-3xl border border-emerald-900/30 bg-gradient-to-br from-[#1f3b2a] via-[#1a2e22] to-[#0f1a14] p-7 text-white shadow-xl">
        <img src={deptLogo("lssd")} alt="" className="pointer-events-none absolute -right-8 -top-8 size-56 opacity-10" />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/90">{LSSD_OFFICES[D.of]}</p>
        <h1 className="mt-2 font-display text-4xl font-bold">{D.n} <span className="text-amber-300">({D.a})</span></h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100/85">{D.d}</p>
        <a href={D.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[13px] font-semibold ring-1 ring-white/15 transition hover:bg-white/20"><ExternalLink className="size-3.5" />Ver en el Notion de Eleven</a>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{D.cmd.length > 1 ? "Unit Commanders" : "Unit Commander"}</h3>
          {D.cmd.length ? <div className="mt-3 space-y-2">{D.cmd.map(n => { const a = who(n); return (
            <div key={n} className="flex items-center gap-3">{a ? <LssdIns r={a.r} title={a.r} className="size-9" /> : <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">{initials(n)}</span>}
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{n}</p><p className="truncate text-[12px] text-slate-500">{a ? `${a.r} · #${a.p}` : "No figura en el roster"}</p></div></div>); })}</div>
            : <p className="mt-3 text-sm text-slate-400">Sin asignar en el Notion.</p>}</Card>
        {D.sub && list(k === "dd" ? "Bureaus y unidades" : "Subunidades", D.sub)}
        {D.veh && list("Flota de interceptores", D.veh)}
        {D.fn.length > 0 && list("Funciones", D.fn)}
      </div>
      {K9.length > 0 && <Group t="Binomios" n={K9.length}>{K9.map(a => <K9Row key={a.p + a.n} a={a} />)}</Group>}
      {D.req && <Card className="p-5 text-sm"><h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Ingreso</h3><p className="mt-2 text-slate-600 dark:text-slate-300">{D.req}</p></Card>}
      <p className="flex items-center gap-2 text-[13px] text-slate-400"><Construction className="size-4 text-amber-500" />Las herramientas internas de la división (roster, instrucciones, exámenes) están en construcción.</p>
    </div>);
}

/* secciones que todavía no están */
const ICO: Record<string, ReactNode> = { leg: <Scale />, sup: <ClipboardList />, cap: <Briefcase />, jef: <Star />, det: <Search />, ros: <Users /> };
export function LssdSoon({ k, t }: { k: string; t: string }) {
  return (
    <Card className="rise relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgb(245_158_11/.05)_22px_44px)]" />
      <div className="relative flex flex-col items-center px-6 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-inset ring-amber-500/30 [&>svg]:size-8">{ICO[k] || <Construction />}</span>
        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300"><Construction className="size-3.5" />En construcción</p>
        <h2 className="mt-3 font-display text-3xl font-bold">{t}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">Esta sección del {DEPTS.lssd.short} se está armando. Se habilita cuando esté lista.</p>
      </div>
    </Card>);
}
