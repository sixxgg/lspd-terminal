/* Supervisión · Registro de huellas: lo que cada agente registra en el laboratorio (nuevo registro o coincidencia), cargado a mano o pegando las filas copiadas. */
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ClipboardPaste, Fingerprint, Plus, Search, Trash2, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import { AgentCombo, Avatar } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { LS, useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { findLoose, norm, uid } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Hu = { id: string; f: string; c: string; cid: string; h: string; st: "nuevo" | "coinc"; fr: string; a: string; por: string };
const KEY = "lspdt.huellas";
const DT = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/;
const ts = (s: string) => { const m = DT.exec(s); return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime() : 0; };
const pad = (n: number) => String(n).padStart(2, "0");
const nowTxt = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const toLocal = (s: string) => { const m = DT.exec(s); return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}` : ""; };
const fromLocal = (v: string) => { const m = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v); return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : ""; };
const agName = (n: string) => findLoose(n.trim())?.n || n.trim();

/* filas copiadas del laboratorio: fecha · ciudadano · ID · ID huella · estado · fecha de registro · agente */
const ROW = /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\s+(.+?)\s+([A-Z0-9]{6,10})\s+([A-Z0-9]{12,20})\s+(Nuevo registro|Coincidencia)\s+(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\s+(.+?)(?=\s+\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}|\s*$)/gi;
export function parseHuellas(txt: string, por: string): Hu[] {
  const t = txt.replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").replace(/\b(Fecha|Ciudadano|ID huella|Estado|Fecha registro|Agente)\b\s*[⌃⌄^]?/gi, " "), out: Hu[] = [];
  for (const m of t.matchAll(ROW)) out.push({ id: uid(), f: m[1], c: m[2].trim(), cid: m[3], h: m[4], st: /coinc/i.test(m[5]) ? "coinc" : "nuevo", fr: m[6], a: agName(m[7]), por });
  return out;
}


/* registros de las capturas del laboratorio que pasó six (09-10/11/2026): se cargan una sola vez en el historial compartido */
const RW = "Ryan Westbrook";
const SEED: [string, string, string, string, "nuevo" | "coinc", string, string][] = [
  ["09/11/2026 22:53", "Darwin Ford", "KLH50JMP", "NK609FP6NZ1PET1", "nuevo", "09/11/2026 22:53", RW],
  ["09/11/2026 22:53", "Madison Pierce", "QA55VE5H", "CR9X9I5DJ1G2T30", "nuevo", "09/11/2026 22:53", RW],
  ["09/11/2026 22:55", "Logan Barrett", "HS80263R", "73WFP1T1PM71G39", "nuevo", "09/11/2026 22:55", RW],
  ["09/11/2026 22:56", "Yooa Baek-Harrington", "U3IC247Z", "1W2611QN2KI1T2L", "nuevo", "09/11/2026 22:56", RW],
  ["09/11/2026 22:59", "Clancy Skinner", "SXTC22Z0", "8425UQ1RS7007G8", "nuevo", "09/11/2026 22:59", RW],
  ["09/11/2026 23:00", "Daniel López", "BDIT0684", "864Y6904P415611", "nuevo", "09/11/2026 23:00", RW],
  ["09/11/2026 23:00", "Kellan Ross", "EF1JG374", "SDE6I9I1004X6W9", "coinc", "01/10/2026 17:14", RW],
  ["09/11/2026 23:01", "Kai Jeon-Soo", "Y4E782F6", "18QL56X6002E10I", "nuevo", "09/11/2026 23:01", RW],
  ["09/11/2026 23:09", "Ryan Sullivan", "Y579QK9U", "79CI5SRH754599Z", "nuevo", "09/11/2026 23:09", "Kai Jeon-Soo"],
  ["09/11/2026 23:09", "Ethan Roggers", "P6R74G2N", "L02SR06477ZDK9W", "nuevo", "09/11/2026 23:09", RW],
  ["09/11/2026 23:10", "Hailey Deacon", "H7MFF7E6", "QG8KGP68XC1A9V8", "nuevo", "09/11/2026 23:10", RW],
  ["09/11/2026 23:10", "Haley Brenner-Scott", "VXHJ3018", "Q500Y0V043A7DMC", "nuevo", "09/11/2026 23:10", "Yooa Baek-Harrington"],
  ["09/11/2026 23:10", "Rodney Deacon", "Y2F31602", "7F7HC9Q93V32W85", "coinc", "18/08/2026 01:58", RW],
  ["09/11/2026 23:11", "William Weston", "LWQ4526T", "I63WYW4UY9682X0", "coinc", "09/11/2026 23:10", RW],
  ["09/11/2026 23:15", "Daniel López", "BDIT0684", "864Y6904P415611", "coinc", "09/11/2026 23:00", "Liam Campbell"],
  ["09/11/2026 23:30", "Elioth Smith", "OP085C9Y", "8SH7438OWV33EA9", "nuevo", "09/11/2026 23:30", RW],
  ["09/11/2026 23:32", "Allison Badway", "N7U1LXNH", "8R4WRDG91CV4G67", "nuevo", "09/11/2026 23:32", RW],
  ["10/11/2026 00:35", "Leonardo Nascimento", "NC1XFB94", "ATN0I78DK454UK2", "nuevo", "10/11/2026 00:35", RW],
];
const SEED_FLAG = "lspdt.huellasSeed";

type SortK = "f" | "c" | "st" | "fr" | "a";
export function Huellas() {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [L, setL] = useJSON<Hu[]>(KEY, []);
  const [paste, setPaste] = useState(""), [q, setQ] = useState(""), [ag, setAg] = useState(""), [stF, setStF] = useState(""), [sort, setSort] = useState<[SortK, 1 | -1]>(["f", -1]);
  useEffect(() => { if (LS.get(SEED_FLAG) === "1" || (me.l < 6 && !me.admin)) return;
    const cur = LS.json<Hu[]>(KEY, []), seen = new Set(cur.map(x => `${x.h}|${x.f}`));
    const nu = SEED.filter(r => !seen.has(`${r[3]}|${r[0]}`)).map(([f, c, cid, h, st, fr, a]) => ({ id: uid(), f, c, cid, h, st, fr, a, por: "Capturas del laboratorio" }));
    if (nu.length) LS.setJSON(KEY, [...cur, ...nu]); LS.set(SEED_FLAG, "1"); }, [me.l, me.admin]);
  const blank = (): Hu => ({ id: "", f: nowTxt(), c: "", cid: "", h: "", st: "nuevo", fr: nowTxt(), a: "", por: me.n });
  const [n, setN] = useState<Hu>(blank);
  const add = (rows: Hu[]) => {
    const seen = new Set(L.map(x => `${x.h}|${x.f}`)), nu = rows.filter(r => !seen.has(`${r.h}|${r.f}`));
    if (!nu.length) { toast(rows.length ? "Esas filas ya estaban cargadas" : "No se reconoció ninguna fila", "err"); return 0; }
    setL([...L, ...nu]); toast(nu.length === 1 ? "Registro agregado" : `${nu.length} registros agregados${rows.length > nu.length ? ` (${rows.length - nu.length} repetidos)` : ""}`); return nu.length;
  };
  const addOne = () => { if (!n.c.trim() || !n.h.trim() || !n.a.trim()) { toast("Completá ciudadano, ID de huella y agente", "err"); return; }
    if (add([{ ...n, id: uid(), c: n.c.trim(), cid: n.cid.trim().toUpperCase(), h: n.h.trim().toUpperCase(), a: agName(n.a) }])) setN({ ...blank(), a: n.a }); };
  /* si la huella ya estaba registrada antes, se sugiere «Coincidencia» */
  const known = n.h.trim() && L.some(x => x.h === n.h.trim().toUpperCase());
  const s = norm(q.trim());
  const rows = useMemo(() => L.filter(x => (!s || norm(`${x.c} ${x.cid} ${x.h} ${x.a}`).includes(s)) && (!ag || x.a === ag) && (!stF || x.st === stF))
    .sort((a, b) => { const [k, d] = sort; const va = k === "f" || k === "fr" ? ts(a[k]) : a[k], vb = k === "f" || k === "fr" ? ts(b[k]) : b[k];
      return (va < vb ? -1 : va > vb ? 1 : 0) * d; }), [L, s, ag, stF, sort]);
  const stats = useMemo(() => { const m: Record<string, { n: number; c: number }> = {}; L.forEach(x => { const o = (m[x.a] ||= { n: 0, c: 0 }); if (x.st === "coinc") o.c++; else o.n++; });
    return Object.entries(m).sort((a, b) => b[1].n + b[1].c - (a[1].n + a[1].c)); }, [L]);
  const can = (x: Hu) => x.por === me.n || me.l >= 8 || me.admin;
  const th = (k: SortK, l: string) => <th className="px-3 py-2.5 font-semibold"><button onClick={() => setSort([k, sort[0] === k ? (-sort[1] as 1 | -1) : -1])} className="inline-flex items-center gap-1 hover:text-brand-600">{l}{sort[0] === k && (sort[1] < 0 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}</button></th>;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<ClipboardPaste />} title="Pegar desde el laboratorio" desc="Seleccioná las filas de la tabla de Huellas, copiá (Ctrl+C) y pegalas acá: se cargan solas." />
          <CardBody>
            <Textarea rows={5} value={paste} onChange={e => setPaste(e.target.value)} className="font-mono text-xs" placeholder={"09/11/2026 23:09  Ethan Roggers  P6R74G2N  L02SR06477ZDK9W  Nuevo registro  09/11/2026 23:09  Ryan Westbrook\n…"} />
            <div className="flex items-center gap-2"><span className="mr-auto text-xs text-slate-500">{paste.trim() ? `${parseHuellas(paste, me.n).length} filas reconocidas` : ""}</span>
              <Button icon={<Plus />} disabled={!paste.trim()} onClick={() => { if (add(parseHuellas(paste, me.n))) setPaste(""); }}>Cargar filas</Button></div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Fingerprint />} title="Cargar a mano" />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ciudadano"><Input value={n.c} onChange={e => setN({ ...n, c: e.target.value })} placeholder="Nombre y apellido" /></Field>
              <Field label="ID del ciudadano"><Input value={n.cid} onChange={e => setN({ ...n, cid: e.target.value.toUpperCase() })} className="font-mono uppercase" placeholder="P6R74G2N" /></Field>
              <Field label="ID de huella"><Input value={n.h} onChange={e => { const h = e.target.value.toUpperCase(); setN({ ...n, h, st: L.some(x => x.h === h.trim()) ? "coinc" : n.st }); }} className="font-mono uppercase" placeholder="L02SR06477ZDK9W" /></Field>
              <Field label="Estado" hint={known ? "(esa huella ya figura: coincidencia)" : undefined}><Select value={n.st} onChange={e => setN({ ...n, st: e.target.value as Hu["st"] })}><option value="nuevo">Nuevo registro</option><option value="coinc">Coincidencia</option></Select></Field>
              <Field label="Fecha"><Input type="datetime-local" value={toLocal(n.f)} onChange={e => setN({ ...n, f: fromLocal(e.target.value) })} /></Field>
              <Field label="Fecha de registro"><Input type="datetime-local" value={toLocal(n.fr)} onChange={e => setN({ ...n, fr: fromLocal(e.target.value) })} /></Field>
              <Field label="Agente" className="sm:col-span-2"><AgentCombo value={n.a} onChange={a => setN({ ...n, a })} /></Field>
            </div>
            <div className="flex justify-end"><Button icon={<Plus />} onClick={addOne}>Agregar</Button></div>
          </CardBody>
        </Card>
      </div>

      {stats.length > 0 && <Card>
        <CardHeader icon={<Users />} title="Por agente" desc="Clic para filtrar la tabla." />
        <CardBody className="flex flex-wrap gap-2">{stats.map(([a, v]) => (
          <button key={a} onClick={() => setAg(ag === a ? "" : a)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition", ag === a ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 hover:border-brand-300 dark:border-slate-800")}>
            <Avatar n={a} size={26} /><span><b className="block text-sm">{a}</b><span className="text-emerald-600 dark:text-emerald-400">{v.n} nuevos</span> · <span className="text-sky-600 dark:text-sky-400">{v.c} coincidencias</span></span></button>))}</CardBody>
      </Card>}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative min-w-[14rem] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por ciudadano, agente o ID" /></div>
          <Select value={ag} onChange={e => setAg(e.target.value)} className="w-auto text-sm"><option value="">Todos los agentes</option>{stats.map(([a]) => <option key={a}>{a}</option>)}</Select>
          <Select value={stF} onChange={e => setStF(e.target.value)} className="w-auto text-sm"><option value="">Todos los estados</option><option value="nuevo">Nuevo registro</option><option value="coinc">Coincidencia</option></Select>
          <span className="ml-auto text-xs text-slate-400">{rows.length} de {L.length} registros</span>
        </div>
        {!rows.length ? <Empty icon={<Fingerprint />} title={L.length ? "Ningún registro coincide" : "Todavía no hay huellas registradas"} /> : (
          <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[56rem] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">{th("f", "Fecha")}{th("c", "Ciudadano")}<th className="px-3 font-semibold">ID huella</th>{th("st", "Estado")}{th("fr", "Fecha registro")}{th("a", "Agente")}<th className="w-10" /></tr></thead>
            <tbody>{rows.map(x => (
              <tr key={x.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/70">
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold">{x.f}</td>
                <td className="px-3 py-2.5"><p className="font-semibold">{x.c}</p><p className="font-mono text-[11px] text-slate-400">{x.cid}</p></td>
                <td className="px-3 py-2.5 font-mono text-xs font-semibold">{x.h}</td>
                <td className="px-3 py-2.5"><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", x.st === "coinc" ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>{x.st === "coinc" ? "Coincidencia" : "Nuevo registro"}</span></td>
                <td className={cn("whitespace-nowrap px-3 py-2.5 font-mono text-xs", x.st === "coinc" && x.fr !== x.f ? "text-sky-600 dark:text-sky-400" : "text-slate-500")}>{x.fr}</td>
                <td className="px-3 py-2.5"><span className="flex items-center gap-2"><Avatar n={x.a} size={24} /><span className="font-semibold">{x.a}</span></span></td>
                <td className="pr-3">{can(x) && <button aria-label="Borrar registro" onClick={async () => { if (await confirm(`¿Borrar el registro de ${x.c}?`, { danger: true, ok: "Borrar" })) setL(L.filter(y => y.id !== x.id)); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>}</td>
              </tr>))}</tbody></table></div>)}
      </Card>
    </div>
  );
}
