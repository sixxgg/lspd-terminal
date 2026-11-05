import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserPlus, Trash2, RotateCcw, Users, Save, Search } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Empty, Input } from "@/components/ui";
import { AgentPicker, Avatar, RankBadge } from "@/components/agents";
import { copyText } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { findAgent, fmtDate, lvl, norm, rankES, type Exc } from "@/lib/domain";
import { authApi } from "@/lib/api";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";

const MIN_ACC = 6;
export function Permisos() {
  const me = useMe(), { toast, confirm } = useFeedback();
  const [EXC, setEXC] = useJSON<Exc>("lspdt.exc", {});
  const [acc, setAcc] = useState<{ n: string; e: string; last?: number }[] | null>(null), [err, setErr] = useState(""), [code, setCode] = useState(""), [hasCode, setHasCode] = useState(false), [q, setQ] = useState("");
  const load = useCallback(async () => { const r = await authApi({ a: "list" }); if (r.__s !== 200) { setErr(r.msg || "No se pudieron cargar las cuentas."); return; } setAcc(r.list); setCode(r.code || ""); setHasCode(!!r.code); }, []);
  useEffect(() => { void load(); }, [load]);
  const ex = Object.entries(EXC).filter(([n]) => findAgent(n));
  const s = norm(q), A = (acc || []).filter(x => !s || norm(x.n + " " + x.e).includes(s));
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader icon={<ShieldCheck />} title="Excepciones de rango" desc="Por defecto cada uno cita (10-80) y notifica (PSB) solo a rangos inferiores." />
        <CardBody>
          <AgentPicker value="" onChange={n => { setEXC({ ...EXC, [n]: { t1080: true, psb: true } }); toast("Excepción agregada"); }} filter={a => lvl(a.r) >= MIN_ACC && !EXC[a.n]} empty="Sin agentes disponibles" />
          {ex.length ? <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{ex.map(([n, x]) => { const a = findAgent(n)!; return (
            <div key={n} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="flex min-w-[12rem] flex-1 items-center gap-2.5"><Avatar n={n} size={30} /><div><p className="text-sm font-semibold">{n}</p><div className="flex items-center gap-1.5"><RankBadge r={a.r} />{a.p && <span className="font-mono text-[11px] text-slate-400">#{a.p}</span>}</div></div></div>
              <Checkbox checked={!!x.t1080} onChange={v => { setEXC({ ...EXC, [n]: { ...x, t1080: v } }); toast("Excepción actualizada"); }} label="10-80 a cualquier rango" />
              <Checkbox checked={!!x.psb} onChange={v => { setEXC({ ...EXC, [n]: { ...x, psb: v } }); toast("Excepción actualizada"); }} label="PSB a cualquier rango" />
              <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" icon={<Trash2 />} onClick={() => { const c = { ...EXC }; delete c[n]; setEXC(c); }}>Quitar</Button>
            </div>); })}</div> : <p className="py-4 text-center text-sm text-slate-400">Sin excepciones. Todos citan y notifican solo a rangos inferiores.</p>}
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<KeyRound />} title="Código de registro" desc={hasCode ? "El registro pide código." : "Registro abierto: cualquier Sargento I o superior del roster puede crear su cuenta."} />
        <CardBody>
          <div className="flex gap-2"><Input value={code} onChange={e => setCode(e.target.value)} placeholder="Vacío = registro sin código" />
            <Button icon={<Save />} onClick={async () => { const r = await authApi({ a: "setcode", code }); if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return; } toast(r.code ? "Código de registro guardado" : "Registro abierto sin código"); void load(); }}>Guardar</Button></div>
        </CardBody>
        <CardHeader icon={<Users />} title={`Cuentas de la terminal${acc ? ` (${acc.length})` : ""}`} />
        <CardBody>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cuenta…" /></div>
          {err ? <p className="text-sm text-red-600">{err}</p> : !acc ? <p className="py-4 text-center text-sm text-slate-400">Cargando cuentas…</p> : !A.length ? <Empty icon={<UserPlus />} title="No hay cuentas" /> :
            <div className="scrollbar-thin max-h-[30rem] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{A.map(x => { const a = findAgent(x.n); return (
              <div key={x.n} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="flex min-w-[12rem] flex-1 items-center gap-2.5"><Avatar n={x.n} size={30} /><div className="min-w-0"><p className="text-sm font-semibold">{x.n}</p><p className="truncate font-mono text-[11px] text-slate-400">{x.e}</p></div></div>
                <div className="text-xs text-slate-500"><p>{a ? rankES(a.r) : "Fuera del roster"}</p><p>Último ingreso: {x.last ? fmtDate(x.last) : "—"}</p></div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" icon={<RotateCcw />} onClick={async () => { if (!(await confirm(`¿Restablecer la contraseña de ${x.n}? Se genera una contraseña temporal y se cierran sus sesiones abiertas.`))) return;
                    const r = await authApi({ a: "reset", n: x.n }); if (r.__s !== 200) { toast(r.msg || "No se pudo restablecer", "err"); return; } await copyText(r.tmp); toast(`Contraseña temporal de ${x.n}: ${r.tmp} (copiada)`); }}>Restablecer</Button>
                  {x.n !== me.n && <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" icon={<Trash2 />} aria-label="Eliminar" onClick={async () => { if (!(await confirm(`¿Eliminar la cuenta de ${x.n}? Va a tener que registrarse de nuevo.`, { danger: true, ok: "Eliminar" }))) return;
                    const r = await authApi({ a: "delete", n: x.n }); if (r.__s !== 200) { toast(r.msg || "No se pudo eliminar", "err"); return; } toast("Cuenta eliminada"); void load(); }} />}
                </div>
              </div>); })}</div>}
        </CardBody>
      </Card>
    </div>
  );
}
