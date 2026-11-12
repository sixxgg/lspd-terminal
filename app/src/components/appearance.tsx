import { useEffect, useRef, useState } from "react";
import { Palette, MonitorSmartphone, Sparkles, Type, MousePointer2, Check, Tv, BellRing } from "lucide-react";
import { ME_ROLES } from "@/lib/store";
import { Checkbox, Field, Segmented, Select } from "@/components/ui";
import { langOf, langPref, setLangPref } from "@/lib/lang";
import { Modal } from "@/components/modal";
import { ACCENTS, CRT_V, CURS, HEADS, SKINS, curSvg, deptUiNow, setPref, usePref } from "@/lib/appearance";
import { cn } from "@/lib/cn";

export function SkinGrid({ value, onPick, auto }: { value: string; onPick: (k: string) => void; auto?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Object.entries(SKINS).map(([k, s]) => (
        <button key={k} type="button" onClick={() => onPick(k)}
          className={cn("flex items-center gap-2.5 rounded-xl border p-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            value === k ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}>
          <span className="flex h-7 w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-black/10">{s.sw.map(c => <i key={c} className="flex-1" style={{ background: c }} />)}</span>
          <span className="flex-1 truncate">{s.l}</span>{value === k && <Check className="size-3.5 text-brand-600 dark:text-brand-300" />}
        </button>))}
      {auto && <button type="button" onClick={auto} className="col-span-full rounded-xl border border-dashed border-slate-300 p-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">Usar el del departamento{SKINS[deptUiNow().theme] ? ` (${SKINS[deptUiNow().theme].l})` : ""}</button>}
    </div>
  );
}
export function CursorGrid({ value, onPick, acc }: { value: string; onPick: (k: string) => void; acc: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Object.entries(CURS).map(([k, c]) => (
        <button key={k} type="button" onClick={() => onPick(k)} className={cn("flex items-center gap-2 rounded-xl border p-2 text-xs font-semibold transition", value === k ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}>
          <span className="grid size-7 place-items-center rounded-md bg-slate-100 bg-center bg-no-repeat dark:bg-slate-800" style={k === "sys" ? undefined : { backgroundImage: curSvg(k, acc, false).split('") ')[0] + '")', backgroundSize: "22px" }}>{k === "sys" ? "↖" : ""}</span>{c.l}
        </button>))}
    </div>
  );
}

export function AppearanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePref(), acc = p.acc || SKINS[p.skin].acc;

  return (
    <Modal open={open} onClose={onClose} title="Apariencia" desc="Se guarda en este navegador." icon={<Palette />} size="lg">
      <Field label="Tema"><SkinGrid value={p.skinOwn ? p.skin : ""} onPick={k => setPref("skin", k)} auto={() => setPref("skin", null)} /></Field>
      <Field label="Color de acento">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPref("acc", null)} className={cn("h-8 rounded-full border px-3 text-xs font-semibold", !p.acc ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 dark:border-slate-700")}>El del tema</button>
          {ACCENTS.map(c => <button key={c} type="button" title={c} onClick={() => setPref("acc", c)} className={cn("size-8 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-slate-900", p.acc === c ? "ring-2 ring-slate-900 dark:ring-white" : "hover:scale-110")} style={{ background: c }} />)}
          <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-600" title="Otro color">+
            <AccPicker value={acc} /></label>
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Efecto de pantalla"><Select value={p.crt} onChange={e => setPref("crt", e.target.value)} className="text-sm">{Object.entries(CRT_V).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
          {CRT_V[p.crt][1] && <p className="mt-1 text-xs text-slate-500">{CRT_V[p.crt][1]}</p>}</Field>
        <Field label={`Intensidad · ${p.crtI}%`}><input type="range" min={0} max={100} step={5} value={p.crtI} disabled={p.crt === "0"} onChange={e => setPref("crtI", +e.target.value)} className="mt-3 w-full accent-brand-600 disabled:opacity-40" /></Field>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-800">
        <div className="flex items-start gap-2.5"><MonitorSmartphone className="mt-0.5 size-4 text-slate-400" /><div><Checkbox checked={p.frame} onChange={v => setPref("frame", v)} label="Marco de tablet" /><p className="text-xs text-slate-500">Bisel, barra de estado y fondo detrás (en pantallas chicas se oculta solo).</p></div></div>
        <div className="flex items-start gap-2.5"><Sparkles className="mt-0.5 size-4 text-slate-400" /><div><Checkbox checked={p.neon} onChange={v => setPref("neon", v)} label="Brillo neón" /><p className="text-xs text-slate-500">Resplandor del color de acento en títulos, botones y terminales (temas oscuros).</p></div></div>
      </div>
      {p.frame && <div className="grid gap-4 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-800">
        <Field label="Marca «Bananita» del marco"><Segmented size="sm" value={p.brandOwn ? p.brand : "dep"} onChange={v => setPref("brand", v === "dep" ? null : v)} options={[{ value: "dep", label: "Del depto." }, { value: "rgb", label: "RGB" }, { value: "magenta", label: "Magenta" }, { value: "off", label: "Apagada" }]} /></Field>
        <Field label={`Velocidad del RGB · ${p.brandSpd} s por vuelta`}><input type="range" min={1} max={20} step={0.5} value={p.brandSpd} disabled={p.brand !== "rgb"} onChange={e => setPref("brandSpd", +e.target.value)} className="mt-3 w-full accent-brand-600 disabled:opacity-40" /></Field>
      </div>}
      {(() => { const b = p.updBlur ?? (ME_ROLES.six ? 10 : 0); return (
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><BellRing className="mt-0.5 size-4 text-slate-400" />
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Desenfoque al recibir una notificación · {b ? `${b} px` : "apagado"}</p>
            <p className="text-xs text-slate-500">Cuando llega un aviso del sistema (por ejemplo, una actualización), la pantalla de la tablet se desenfoca detrás.</p>
            <div className="mt-2 flex items-center gap-3"><input type="range" min={0} max={24} step={1} value={b} onChange={e => setPref("updBlur", +e.target.value)} className="w-full accent-brand-600" aria-label="Desenfoque" />
              <button type="button" onClick={() => window.dispatchEvent(new Event("lspdt:testupd"))} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Probar</button></div></div>
        </div>); })()}
      <Field label="Idioma" hint={`(automático: según desde dónde entrás · ahora ${langOf() === "ar" ? "Argentina" : "España"})`}><Segmented size="sm" value={langPref()} onChange={v => setLangPref(v)} options={[{ value: "auto", label: "Automático" }, { value: "ar", label: "Español (Argentina)" }, { value: "es", label: "Español (España)" }]} /></Field>
      <Field label="Menú"><Segmented size="sm" value={p.nav} onChange={v => setPref("nav", v)} options={[{ value: "top", label: "Arriba, por áreas" }, { value: "side", label: "Lateral" }]} /></Field>
      <Field label="Tipografía"><div className="flex items-center gap-2"><Type className="size-4 text-slate-400" />
        <Segmented size="sm" value={p.font} onChange={v => setPref("font", v)} options={[{ value: "inter", label: "Moderna (Inter)" }, { value: "public", label: "Clásica (Public Sans)" }]} /></div></Field>
      <Field label="Fuente de títulos y menús" hint="(estilo táctico)">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(HEADS).map(([k, h]) => (
          <button key={k} type="button" onClick={() => setPref("head", k)} style={h.fam ? { fontFamily: h.fam, fontWeight: h.w } : undefined}
            className={cn("rounded-xl border px-3 py-2 text-left text-[15px] transition", p.head === k ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")}>
            {h.l}<span className="block text-[11px] font-normal text-slate-500" style={{ fontFamily: "Inter, sans-serif" }}>{k === "none" ? "Sin fuente aparte" : "LSPD · 10-80 · PSB · ÁÉÑ"}</span></button>))}</div>
      </Field>
      <Field label="Puntero del mouse"><div className="flex items-start gap-2"><MousePointer2 className="mt-2 size-4 text-slate-400" /><div className="flex-1"><CursorGrid value={p.cur} onPick={k => setPref("cur", k)} acc={acc} /></div></div></Field>
      <p className="flex items-center gap-1.5 text-xs text-slate-400"><Tv className="size-3.5" />Los administradores definen el tema y el puntero por defecto del departamento en Administración › Marca e imágenes.</p>
    </Modal>
  );
}

/* selector libre de color: mientras se arrastra solo se pinta la muestra; el tema se aplica como mucho cada 200 ms
   (antes se recalculaba toda la página en cada movimiento y la pantalla se congelaba) */
function AccPicker({ value }: { value: string }) {
  const [v, setV] = useState(value), t = useRef<number>(0);
  useEffect(() => setV(value), [value]);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const push = (c: string) => { setV(c); window.clearTimeout(t.current); t.current = window.setTimeout(() => setPref("acc", c), 200); };
  return <>
    <span aria-hidden className="pointer-events-none absolute inset-1 rounded-full" style={{ background: v, opacity: v === value ? 0 : 1 }} />
    <input type="color" value={v} onChange={e => push(e.target.value)} onBlur={e => { window.clearTimeout(t.current); if (e.target.value !== value) setPref("acc", e.target.value); }} className="absolute inset-0 opacity-0" />
  </>;
}
