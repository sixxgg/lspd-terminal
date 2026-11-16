/* Administración › Galería: quién puede editar la galería (además de six y la administración) y la clave de la API de Fivemanager.
   La clave se manda una sola vez al servidor, que la verifica y la guarda donde ningún navegador la puede leer. */
import { useEffect, useState } from "react";
import { CheckCircle2, Images, KeyRound, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { AgentPicker } from "@/components/agents";
import { AgChips } from "../sup/T1080Hist";
import { useFeedback } from "@/components/feedback";
import { api } from "@/lib/api";
import { lvl } from "@/lib/domain";
import { useJSON } from "@/lib/store";

export function AdmGaleria() {
  const { toast } = useFeedback(), [E, setE] = useJSON<string[]>("lspdt.galEditors", []);
  const [has, setHas] = useState<boolean | null>(null), [k, setK] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { void api("/api/fm", { a: "has" }).then(r => setHas(r.__s === 200 ? !!r.has : null)); }, []);
  const save = async (v: string) => { setBusy(true); const r = await api("/api/fm", { a: "key", k: v }); setBusy(false);
    if (r.__s !== 200) { toast(String(r.msg || "No se pudo guardar"), "err"); return; } setHas(!!r.has); setK(""); toast(v ? "Clave verificada y guardada en el servidor" : "Clave quitada"); };
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader icon={<Users />} title="Pueden editar la galería" desc="Además de six y la administración. Las fotos activas se ven en el Inicio de todos." />
        <CardBody>
          {E.length ? <AgChips list={E} onRemove={n => setE(E.filter(x => x !== n))} /> : <p className="text-[12.5px] text-slate-400">Nadie más por ahora.</p>}
          <AgentPicker value={E} multiple onChange={n => !E.includes(n) && setE([...E, n])} filter={a => lvl(a.r) > 0 && !E.includes(a.n)} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<KeyRound />} title="Clave de Fivemanager" desc="Para elegir las fotos directo desde la cuenta. Se guarda solo en el servidor: nadie la ve, ni siquiera desde acá." />
        <CardBody>
          <p className="flex items-center gap-2 text-[13px]">{has == null ? <span className="text-slate-400">Comprobando…</span> : has
            ? <><CheckCircle2 className="size-4 text-emerald-500" /><span>Hay una clave cargada y funcionando.</span></> : <><Images className="size-4 text-amber-500" /><span>Todavía no hay clave.</span></>}</p>
          <div className="flex gap-2"><Input type="password" autoComplete="off" value={k} onChange={e => setK(e.target.value)} placeholder={has ? "Pegá una clave nueva para reemplazarla" : "Pegá el token de Fivemanager (tipo Images)"} className="flex-1" />
            <Button disabled={!k.trim() || busy} onClick={() => void save(k.trim())}>{busy ? "Verificando…" : "Guardar"}</Button></div>
          {has && <button type="button" onClick={() => void save("")} className="text-[12px] font-semibold text-red-500 hover:underline">Quitar la clave</button>}
          <p className="text-[11.5px] text-slate-500">En Fivemanager: Settings › Tokens › Create Token (tipo Images). Si una clave se compartió por algún lado, conviene borrarla allá y crear otra.</p>
        </CardBody>
      </Card>
    </div>);
}
