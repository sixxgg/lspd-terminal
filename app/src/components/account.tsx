import { useEffect, useState } from "react";
import { UserCog, KeyRound, Languages, Save, LifeBuoy, Copy, Download } from "lucide-react";
import { Button, Field, Input, Segmented } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback";
import { copyText } from "@/components/output";
import { authApi } from "@/lib/api";
import { emailOf, fmtDate, rankES } from "@/lib/domain";
import { LS } from "@/lib/store";

/* códigos de recuperación: se muestran una sola vez */
export function RecCodes({ codes }: { codes: string[] }) {
  const { toast } = useFeedback(), txt = codes.join("\n");
  const dl = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`Códigos de recuperación · Terminal LSPD\n\n${txt}\n\nCada código sirve una sola vez.`], { type: "text/plain" })); a.download = "codigos-recuperacion-lspd.txt"; a.click(); };
  return (
    <div className="space-y-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200"><LifeBuoy className="size-4" />Guardá estos códigos de recuperación</p>
      <p className="text-xs text-amber-800/80 dark:text-amber-200/80">Si olvidás la contraseña, con uno de estos la restablecés desde la pantalla de ingreso. Cada uno sirve una sola vez y no se vuelven a mostrar.</p>
      <div className="grid grid-cols-2 gap-1.5 font-mono text-sm">{codes.map(c => <span key={c} className="rounded-lg bg-white px-2 py-1 text-center dark:bg-slate-900">{c}</span>)}</div>
      <div className="flex gap-2"><Button size="sm" variant="outline" icon={<Copy />} onClick={async () => { await copyText(txt); toast("Códigos copiados"); }}>Copiar</Button><Button size="sm" variant="outline" icon={<Download />} onClick={dl}>Descargar .txt</Button></div>
    </div>);
}

export function AccountModal({ me, open, onClose }: { me: { n: string; r: string }; open: boolean; onClose: () => void }) {
  const { toast, confirm } = useFeedback();
  const [info, setInfo] = useState<{ e: string; c: number; rec: number } | null>(null), [o, setO] = useState(""), [n1, setN1] = useState(""), [n2, setN2] = useState(""), [busy, setBusy] = useState(false);
  const [lang, setLang] = useState(() => LS.get("lspdt.rankLang") || "en"), [rec, setRec] = useState<string[] | null>(null);
  useEffect(() => { if (!open) { setRec(null); return; } void authApi({ a: "info" }).then(r => { if (r.__s === 200) setInfo({ e: r.e, c: r.c, rec: r.rec }); }); }, [open]);
  const chpw = async () => {
    if (!o || !n1) { toast("Completá la contraseña actual y la nueva", "err"); return; }
    if (n1 !== n2) { toast("Las contraseñas nuevas no coinciden", "err"); return; }
    setBusy(true); const r = await authApi({ a: "passwd", old: o, nw: n1 }); setBusy(false);
    if (r.__s !== 200) { toast(r.msg || "No se pudo cambiar", "err"); return; } setO(""); setN1(""); setN2(""); toast("Contraseña actualizada");
  };
  const sec = "space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800", h = "flex items-center gap-2 text-sm font-semibold";
  return (
    <Modal open={open} onClose={onClose} title="Mi cuenta" icon={<UserCog />} size="sm">
      <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
        <p className="font-semibold">{me.n}</p><p className="text-xs text-slate-500">{rankES(me.r)}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">{info?.e || emailOf(me.n)}{info?.c ? ` · cuenta creada el ${fmtDate(info.c)}` : ""}</p>
      </div>
      <Field label="Idioma de los rangos en los textos" hint="(/me, /do, anuncios, 10-80)">
        <Segmented size="sm" value={lang} onChange={v => { setLang(v); LS.set("lspdt.rankLang", v); toast("Preferencia guardada"); }} options={[{ value: "en", label: "Inglés (Police Officer II)", icon: <Languages /> }, { value: "es", label: "Español (Oficial II)" }]} />
      </Field>
      <div className={sec}>
        <p className={h}><LifeBuoy className="size-4 text-slate-400" />Códigos de recuperación<span className="ml-auto text-xs font-normal text-slate-400">{info ? `${info.rec} disponibles` : ""}</span></p>
        {rec ? <RecCodes codes={rec} /> : <>
          <p className="text-xs text-slate-500">Si perdés la contraseña, la restablecés con uno de estos códigos. Al generar nuevos, los anteriores dejan de servir.</p>
          <Button size="sm" variant="outline" icon={<LifeBuoy />} onClick={async () => { if (info?.rec && !(await confirm("¿Generar códigos nuevos? Los que tenés guardados dejan de servir."))) return;
            const r = await authApi({ a: "recgen" }); if (r.__s !== 200) { toast(r.msg || "No se pudo generar", "err"); return; } setRec(r.rec); setInfo(i => (i ? { ...i, rec: r.rec.length } : i)); }}>{info?.rec ? "Generar códigos nuevos" : "Generar códigos"}</Button></>}
      </div>
      <div className={sec}>
        <p className={h}><KeyRound className="size-4 text-slate-400" />Cambiar contraseña</p>
        <Input type="password" autoComplete="current-password" value={o} onChange={e => setO(e.target.value)} placeholder="Contraseña actual" />
        <Input type="password" autoComplete="new-password" value={n1} onChange={e => setN1(e.target.value)} placeholder="Nueva contraseña (mínimo 8)" />
        <Input type="password" autoComplete="new-password" value={n2} onChange={e => setN2(e.target.value)} placeholder="Repetir la nueva" onKeyDown={e => e.key === "Enter" && chpw()} />
        <div className="flex justify-end"><Button loading={busy} icon={<Save />} onClick={chpw}>Guardar contraseña</Button></div>
      </div>
      <p className="border-t border-slate-100 pt-3 text-center font-mono text-[11px] text-slate-400 dark:border-slate-800">build {__BUILD__}</p>
    </Modal>
  );
}
