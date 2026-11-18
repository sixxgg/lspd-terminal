/* Administración › Logs: agentes que salieron del roster (los quitaron a mano o no vinieron en el CSV nuevo).
   Lo registra el servidor cada vez que se guarda el roster; se conserva 4 meses. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, UserMinus } from "lucide-react";
import { Button, Card, Empty, SearchInput } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { CopyMenu } from "@/components/output";
import { api } from "@/lib/api";
import { findAgent, fullDT, norm, rankES } from "@/lib/domain";

type Row = { id: number; t: number; n: string; d: string };
const parse = (d: string) => { const [n = "", r = "", p = "", m = ""] = d.split(" · "); return { n, r: r === "—" ? "" : r, p: p === "sin placa" ? "" : p, m }; };
const dayOf = (t: number) => new Date(t).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function AdmLogs() {
  const [L, setL] = useState<Row[] | null>(null), [err, setErr] = useState(""), [q, setQ] = useState("");
  const load = useCallback(async () => { setErr(""); const r = await api("/api/data?logs=roster"); if (r.__s === 200) setL((r.list as Row[]) || []); else setErr((r.msg as string) || "No se pudo cargar el registro"); }, []);
  useEffect(() => { void load(); }, [load]);
  const s = norm(q.trim()), F = useMemo(() => (L || []).filter(x => !s || norm(x.d + " " + x.n).includes(s)), [L, s]);
  const days = [...new Set(F.map(x => dayOf(x.t)))];
  const txt = F.map(x => { const a = parse(x.d); return `- **${a.n}** (${rankES(a.r) || "sin rango"}${a.p ? ` · ${a.p}` : ""}) — quitado por ${x.n} · <t:${Math.floor(x.t / 1000)}:f>`; }).join("\n");
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <span className="grid size-9 place-items-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400"><UserMinus className="size-5" /></span>
        <div className="mr-auto min-w-0"><p className="text-sm font-bold">{L ? `${L.length} ${L.length === 1 ? "baja registrada" : "bajas registradas"}` : "Cargando…"}</p><p className="text-xs text-slate-500">Se guardan 4 meses.</p></div>
        <SearchInput className="w-full sm:w-64" value={q} onChange={setQ} placeholder="Buscar agente o quién lo quitó…" />
        {F.length > 0 && <CopyMenu text={`## 📋 Bajas del roster\n${txt}`} />}
        <Button size="sm" variant="outline" icon={<RefreshCw />} onClick={() => void load()}>Actualizar</Button>
      </Card>
      {err ? <Card><Empty icon={<UserMinus />} title={err} /></Card> : !L ? null : !F.length ? <Card><Empty icon={<Search />} title={L.length ? "Nada coincide con la búsqueda" : "Todavía no hay bajas registradas"} desc={L.length ? undefined : "Cuando se quite a un agente del roster o no venga en un CSV nuevo, va a quedar anotado acá."} /></Card>
        : days.map(d => (
          <Card key={d} className="overflow-hidden">
            <p className="border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">{d} <span className="font-medium normal-case tracking-normal text-slate-400">· {F.filter(x => dayOf(x.t) === d).length}</span></p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{F.filter(x => dayOf(x.t) === d).map(x => { const a = parse(x.d), back = !!findAgent(a.n); return (
              <div key={x.id} className="grid items-center gap-x-4 gap-y-1 px-4 py-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                <div className="flex min-w-0 items-center gap-2.5"><Avatar n={a.n} size={30} /><div className="min-w-0"><p className="truncate text-[13px] font-semibold">{a.n}{back && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-px text-[10px] font-bold text-emerald-600 dark:text-emerald-400">volvió al roster</span>}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">{a.r && <RankBadge r={a.r} />}{a.p || "Sin placa"}{a.m && <span className="rounded bg-amber-500/15 px-1.5 py-px font-semibold text-amber-700 dark:text-amber-300">{a.m}</span>}</p></div></div>
                <p className="text-[12px] text-slate-600 dark:text-slate-300">Quitado por <b>{x.n || "—"}</b></p>
                <p className="text-[11.5px] tabular-nums text-slate-500">{fullDT(x.t)}</p>
              </div>); })}</div>
          </Card>))}
    </div>);
}
