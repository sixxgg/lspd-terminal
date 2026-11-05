import { useCallback, useEffect, useState } from "react";
import { Sheet, ExternalLink, Link2, Save, RefreshCw, Search } from "lucide-react";
import { Button, Card, Checkbox, Input } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { findLoose, getRoster, lvl, nameKey, norm, rankFrom, uid } from "@/lib/domain";
import { api } from "@/lib/api";
import { LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { VEH, parseSheet, sheetUrl, type PHist, type SRow } from "@/lib/patrol";
import { StatusPill } from "./Patrullas";

export function SheetPanel() {
  useStoreVersion();
  const me = useMe(), { toast, confirm } = useFeedback();
  const [S, setS] = useState<{ rows: SRow[]; at: number } | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [cfg, setCfg] = useState(false), [link, setLink] = useState(""), [q, setQ] = useState(""), [only, setOnly] = useState(false);
  const load = useCallback(async (manual: boolean) => {
    setBusy(true); const r = await api("/api/sheet?url=" + encodeURIComponent(sheetUrl())) as { __s: number; csv?: string; at?: number; msg?: string }; setBusy(false);
    if (r.__s !== 200) { setErr(r.msg || "No se pudo leer la planilla"); if (manual) toast(r.msg || "No se pudo leer la planilla", "err"); return; }
    setErr(""); setS({ rows: parseSheet(r.csv || ""), at: r.at || Date.now() }); if (manual) toast("Planilla actualizada");
  }, [toast]);
  useEffect(() => { void load(false); const t = setInterval(() => { if (!document.hidden) void load(false); }, 120000); return () => clearInterval(t); }, [load]);
  /* agentes por debajo de Sargento II que no figuran en la planilla */
  const rows = S ? (() => { const have = new Set(S.rows.map(r => nameKey(findLoose(r.n)?.n || r.n)));
    return [...S.rows, ...getRoster().filter(a => lvl(a.r) > 0 && lvl(a.r) < 7 && !have.has(nameKey(a.n))).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n))
      .map(a => ({ n: a.n, r: a.r, p: a.p || "", m: true, v: Object.fromEntries(VEH.map(([k]) => [k, { s: "" as const, raw: "" }])) }))]; })() : [];
  const all = rows.flatMap(r => VEH.map(([k]) => r.v[k].s)), ok = all.filter(s => s === "ok").length, no = all.filter(s => s === "no").length, ag = rows.filter(r => VEH.some(([k]) => r.v[k].s)).length, nm = rows.filter(r => r.m).length;
  const s = norm(q.trim()), L = rows.filter(r => (!s || norm(r.n).includes(s) || String(r.p).includes(s)) && (!only || VEH.some(([k]) => r.v[k].s)));
  const saveToReg = async () => {
    const R = rows.filter(r => VEH.some(([k]) => r.v[k].s)).map(r => { const a = findLoose(r.n); return { n: a ? a.n : r.n, r: a ? a.r : rankFrom(r.r) || r.r, p: a ? a.p : r.p,
      v: Object.fromEntries(VEH.map(([k]) => { const c = r.v[k]; return [k, c.s === "?" ? { s: "", o: c.raw } : { s: c.s }]; })) }; });
    if (!R.length) { toast("La planilla todavía no tiene vehículos revisados", "err"); return; }
    let hh = 5381; const js = JSON.stringify(R); for (let i = 0; i < js.length; i++) hh = ((hh << 5) + hh + js.charCodeAt(i)) | 0;
    const sig = (hh >>> 0).toString(36), H = LS.json<(PHist & { src?: string; sig?: string })[]>("lspdt.patHist", []), dup = H.find(h => h.src === "sheet" && h.sig === sig);
    if (dup) { toast("Esa revisión de la planilla ya está guardada (" + dup.fecha.split("-").reverse().join("/") + ")", "err"); return; }
    if (!(await confirm(`¿Guardar la planilla como revisión del registro? ${R.length} agentes con vehículos revisados. Queda como constancia con fecha de hoy.`))) return;
    LS.setJSON("lspdt.patHist", [{ id: uid(), fecha: new Date().toISOString().slice(0, 10), t: Date.now(), por: { n: me.n, r: me.r }, rows: R, nota: "Importada de Google Sheets", src: "sheet", sig }, ...H]);
    toast("Revisión guardada en el registro");
  };
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="mr-auto flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Sheet className="size-[18px]" /></span>
          <div><h3 className="font-semibold">Planilla de Google Sheets</h3><p className="text-xs text-slate-500">Se actualiza sola cada 2 minutos</p></div></div>
        <a href={sheetUrl()} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><ExternalLink className="size-4" />Abrir planilla</a>
        <Button size="sm" variant="outline" icon={<Link2 />} onClick={() => { setCfg(!cfg); setLink(sheetUrl()); }}>Cambiar enlace</Button>
        <Button size="sm" variant="outline" icon={<Save />} disabled={!S} onClick={saveToReg}>Guardar en el registro</Button>
        <Button size="sm" icon={<RefreshCw className={busy ? "animate-spin" : ""} />} onClick={() => load(true)}>Actualizar</Button>
      </div>
      <div className="space-y-3 p-4">
        {cfg && <div className="flex gap-2"><Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" />
          <Button onClick={() => { const v = link.trim(); if (!/docs\.google\.com\/spreadsheets\/d\//.test(v)) { toast("Pegá el enlace de una planilla de Google Sheets", "err"); return; } LS.set("lspdt.sheet", v); setCfg(false); setS(null); void load(true); }}>Usar esta planilla</Button></div>}
        {err && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
        {S && <p className="text-xs text-slate-500"><b>{rows.length}</b> agentes{nm > 0 && <> (<b>{nm}</b> agregados del roster)</>} · <b>{ag}</b> con revisión · <span className="text-emerald-600 dark:text-emerald-400"><b>{ok}</b> preparados</span> · <span className="text-red-600 dark:text-red-400"><b>{no}</b> no preparados</span> · actualizada {new Date(S.at).toLocaleTimeString("es-AR")}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar agente o placa…" /></div>
          <Checkbox checked={only} onChange={setOnly} label="Solo los que tienen revisión" />
        </div>
        {!S ? <p className="py-8 text-center text-sm text-slate-400">{err ? "No se pudo cargar la planilla." : "Cargando la planilla…"}</p>
          : !L.length ? <p className="py-8 text-center text-sm text-slate-400">{rows.length ? "Nadie coincide con el filtro." : "La planilla no tiene agentes."}</p>
          : <div className="scrollbar-thin max-h-[32rem] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[52rem] text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900"><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="px-3 py-2.5 font-semibold">Agente</th>{VEH.map(([k, n]) => <th key={k} className="px-3 py-2.5 font-semibold">{n}</th>)}</tr></thead>
            <tbody>{L.map(r => { const a = findLoose(r.n), rk = a ? a.r : rankFrom(r.r), pl = a?.p || r.p; return (
              <tr key={r.n} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar n={a?.n || r.n} size={26} /><div><p className="font-semibold">{a?.n || r.n}{r.m && <span className="ml-1.5 rounded bg-amber-400/15 px-1 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300" title="Está en el roster pero no en la planilla">no figura en la planilla</span>}</p>
                  <div className="flex items-center gap-1.5">{rk && <RankBadge r={rk} />}{pl && <span className="font-mono text-[11px] text-slate-400">#{pl}</span>}</div></div></div></td>
                {VEH.map(([k]) => { const c = r.v[k]; return <td key={k} className="px-3 py-2">{c.s === "?" ? <span title={c.raw} className="text-xs text-slate-500">{c.raw}</span> : c.s ? <StatusPill s={c.s} /> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>; })}
              </tr>); })}</tbody></table></div>}
      </div>
    </Card>
  );
}
