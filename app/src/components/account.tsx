import { useEffect, useState } from "react";
import { UserCog, KeyRound, Languages, Save } from "lucide-react";
import { Button, Field, Input, Segmented } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { authApi } from "@/lib/api";
import { emailOf, fmtDate, rankES } from "@/lib/domain";
import { LS } from "@/lib/store";

export function AccountModal({ me, open, onClose }: { me: { n: string; r: string }; open: boolean; onClose: () => void }) {
  const { toast } = useFeedback();
  const [info, setInfo] = useState<{ e: string; c: number } | null>(null), [o, setO] = useState(""), [n1, setN1] = useState(""), [n2, setN2] = useState(""), [busy, setBusy] = useState(false);
  const [lang, setLang] = useState(() => LS.get("lspdt.rankLang") || "en");
  useEffect(() => { if (open) void authApi({ a: "info" }).then(r => { if (r.__s === 200) setInfo({ e: r.e, c: r.c }); }); }, [open]);
  const chpw = async () => {
    if (!o || !n1) { toast("Completá la contraseña actual y la nueva", "err"); return; }
    if (n1 !== n2) { toast("Las contraseñas nuevas no coinciden", "err"); return; }
    setBusy(true); const r = await authApi({ a: "passwd", old: o, nw: n1 }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo cambiar", "err"); return; } setO(""); setN1(""); setN2(""); toast("Contraseña actualizada");
  };
  return (
    <Modal open={open} onClose={onClose} title="Mi cuenta" icon={<UserCog />} size="sm">
      <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
        <p className="font-semibold">{me.n}</p><p className="text-xs text-slate-500">{rankES(me.r)}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">{info?.e || emailOf(me.n)}{info?.c ? ` · cuenta creada el ${fmtDate(info.c)}` : ""}</p>
      </div>
      <Field label="Idioma de los rangos en los textos" hint="(/me, /do, anuncios, 10-80)">
        <Segmented size="sm" value={lang} onChange={v => { setLang(v); LS.set("lspdt.rankLang", v); toast("Preferencia guardada"); }} options={[{ value: "en", label: "Inglés (Police Officer II)", icon: <Languages /> }, { value: "es", label: "Español (Oficial II)" }]} />
      </Field>
      <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-slate-400" />Cambiar contraseña</p>
        <Input type="password" autoComplete="current-password" value={o} onChange={e => setO(e.target.value)} placeholder="Contraseña actual" />
        <Input type="password" autoComplete="new-password" value={n1} onChange={e => setN1(e.target.value)} placeholder="Nueva contraseña (mínimo 6)" />
        <Input type="password" autoComplete="new-password" value={n2} onChange={e => setN2(e.target.value)} placeholder="Repetir la nueva" onKeyDown={e => e.key === "Enter" && chpw()} />
        <div className="flex justify-end"><Button loading={busy} icon={<Save />} onClick={chpw}>Guardar contraseña</Button></div>
      </div>
    </Modal>
  );
}
