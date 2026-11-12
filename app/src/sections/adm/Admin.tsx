import { useCallback, useEffect, useRef, useState } from "react";
import { Scale, UserCheck, Crown, ShieldPlus, ImagePlus, Type, Save, Trash2, Check, X, Upload, Download, FileSpreadsheet, RotateCcw, GraduationCap, Shield, Database, Eye } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Segmented, Select } from "@/components/ui";
import { prevStart } from "@/lib/preview";
import { AgentCombo, Avatar } from "@/components/agents";
import { ImagePicker, imgSpec } from "@/components/imagepick";
import { useFeedback } from "@/components/feedback";
import { ALL_DIVS, findAgent, fmtDate, getRoster, lvl, norm, rankES, RANK_COLOR } from "@/lib/domain";
import { authApi } from "@/lib/api";
import { DEF_ROSTER, LS, ME_ROLES, syncIdle, useJSON, useStoreVersion } from "@/lib/store";
import { uMap, uSaveMap, rtdMem } from "@/lib/units";
import { parseCSV } from "@/lib/csv";
import { DivLogo } from "@/sections/sup/Agentes";
import { CursorGrid, SkinGrid } from "@/components/appearance";
import { SKINS } from "@/lib/appearance";
import { Palette } from "lucide-react";
import { cn } from "@/lib/cn";

const Row = ({ n, children }: { n: string; children?: React.ReactNode }) => { const a = findAgent(n); return (
  <div className="flex flex-wrap items-center gap-3 px-4 py-2.5"><Avatar n={n} size={30} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{n}</p><p className="text-xs text-slate-500">{a ? rankES(a.r) + (a.p ? " · #" + a.p : "") : "Fuera del roster"}</p></div>{children}</div>); };

/* ---------- acceso a Legal: solo lo da el dueño ---------- */
function LegalAcc() {
  const { toast, confirm } = useFeedback(), [L, setL] = useJSON<string[]>("lspdt.legacc", []), [sel, setSel] = useState("");
  return (
    <Card className="xl:col-span-2">
      <CardHeader icon={<Scale />} title="Acceso a Legal" desc={`Solo vos podés darlo. ${L.length} con acceso además de vos.`} />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.length ? L.map(n => <Row key={n} n={n}>
        <button aria-label={`Quitar a ${n}`} onClick={async () => { if (await confirm(`¿Quitarle el acceso a Legal a ${n}?`, { danger: true })) { setL(L.filter(x => x !== n)); toast(`${n} ya no ve Legal`); } }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600"><X className="size-4" /></button></Row>)
        : <p className="px-4 py-3 text-sm text-slate-400">Nadie más tiene acceso.</p>}</div>
      <CardBody><div className="flex gap-2"><AgentCombo className="flex-1" value={sel} onChange={setSel} filter={a => !L.includes(a.n)} />
        <Button onClick={() => { if (!sel) { toast("Elegí un agente", "err"); return; } setL([...L, sel]); toast(`${sel} ahora ve Legal`); setSel(""); }}>Dar acceso</Button></div></CardBody>
    </Card>);
}

/* ---------- solicitudes de acceso y administradores ---------- */
export function AdmAccesos() {
  const { toast, confirm } = useFeedback();
  const [req, setReq] = useState<{ pending: { n: string; c: number }[]; approved: string[] } | null>(null);
  const [adm, setAdm] = useState<{ owners: string[]; admins: string[]; accounts: string[]; canGrant: boolean } | null>(null), [sel, setSel] = useState("");
  const load = useCallback(async () => { const [a, b] = await Promise.all([authApi({ a: "pending" }), authApi({ a: "admins" })]); if (a.__s === 200) setReq(a as never); if (b.__s === 200) setAdm(b as never); }, []);
  useEffect(() => { void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 60000); return () => clearInterval(t); }, [load]);
  const approve = async (n: string, ok: boolean) => {
    if (!ok && !(await confirm(`¿${req?.pending.some(p => p.n === n) ? "Rechazar la solicitud" : "Quitar el acceso"} de ${n}?`, { danger: true }))) return;
    const r = await authApi({ a: "approve", n, ok }); if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return; } toast(ok ? n + " ya puede entrar a la terminal" : "Listo"); void load();
  };
  const setAdmin = async (n: string, on: boolean) => {
    if (!(await confirm(on ? `¿Dar administrador a ${n}? Va a poder cambiar el logo, los fondos y los textos para todos.` : `¿Quitarle el administrador a ${n}?`, { danger: !on }))) return;
    const r = await authApi({ a: "setadmin", n, on }); if (r.__s !== 200) { toast(r.msg || "No se pudo guardar", "err"); return; } toast(on ? `${n} ahora es administrador` : `${n} ya no es administrador`); setSel(""); void load();
  };
  const [pv, setPv] = useState("Police Officer II");
  const cand = adm ? adm.accounts.filter(n => !adm.owners.includes(n) && !adm.admins.includes(n)) : [];
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="xl:col-span-2">
        <CardHeader icon={<Eye />} title="Ver como" desc="Mirá la terminal como la ve otra persona: con el rango que elijas, sin divisiones ni permisos de administración. Es solo lectura y se sale con el botón de abajo." />
        <CardBody><div className="flex flex-wrap items-center gap-2">
          <Select value={pv} onChange={e => setPv(e.target.value)} className="max-w-xs">{Object.keys(RANK_COLOR).map(r => <option key={r} value={r}>{rankES(r)}</option>)}</Select>
          <Button icon={<Eye />} onClick={() => prevStart(pv)}>Ver como {rankES(pv)} sin divisiones</Button>
        </div></CardBody>
      </Card>
      {ME_ROLES.six && <LegalAcc />}
      <Card>
        <CardHeader icon={<UserCheck />} title="Solicitudes de acceso" desc="Agentes por debajo de Sargento I que crearon su cuenta y esperan aprobación." />
        {!req ? <CardBody><p className="text-sm text-slate-400">Cargando…</p></CardBody> : <>
          {req.pending.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{req.pending.map(p => (
            <Row key={p.n} n={p.n}><span className="text-xs text-slate-400">pidió acceso el {fmtDate(p.c)}</span>
              <Button size="sm" icon={<Check />} onClick={() => approve(p.n, true)}>Aprobar</Button><Button size="sm" variant="danger" icon={<X />} onClick={() => approve(p.n, false)}>Rechazar</Button></Row>))}</div>
            : <Empty icon={<UserCheck />} title="No hay solicitudes pendientes" />}
          {req.approved.length > 0 && <><p className="border-t border-slate-100 px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">Aprobados manualmente ({req.approved.length})</p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{req.approved.map(n => <Row key={n} n={n}><span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Con acceso</span><Button size="sm" variant="ghost" className="text-red-600" onClick={() => approve(n, false)}>Quitar acceso</Button></Row>)}</div></>}
        </>}
      </Card>
      <Card>
        <CardHeader icon={<Crown />} title="Administradores" desc={adm?.canGrant ? "Solo el dueño puede dar o quitar administrador." : "Solo el dueño puede dar o quitar administrador."} />
        {!adm ? <CardBody><p className="text-sm text-slate-400">Cargando…</p></CardBody> : <>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {adm.owners.map(n => <Row key={n} n={n}><span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Dueño</span></Row>)}
            {adm.admins.map(n => <Row key={n} n={n}><span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">Administrador</span>{adm.canGrant && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setAdmin(n, false)}>Quitar</Button>}</Row>)}
          </div>
          {adm.canGrant && <CardBody><div className="flex gap-2"><AgentCombo className="flex-1" value={sel} onChange={setSel} names={cand} empty="No hay más cuentas registradas" placeholder="Buscar cuenta…" />
            <Button icon={<ShieldPlus />} disabled={!sel} onClick={() => setAdmin(sel, true)}>Dar administrador</Button></div></CardBody>}
        </>}
      </Card>
      <UnitAccess />
    </div>
  );
}
function UnitAccess() {
  useStoreVersion();
  const { toast, confirm } = useFeedback();
  const rtd = rtdMem(), psb = Object.keys(uMap("psb")), R = getRoster().filter(a => lvl(a.r) > 0).sort((a, b) => lvl(b.r) - lvl(a.r) || a.n.localeCompare(b.n));
  const [sr, setSr] = useState(""), [sp, setSp] = useState("");
  const setRtd = (L: string[]) => { const c = LS.json<Record<string, unknown>>("lspdt.ui", {}); c.rtd = L; LS.setJSON("lspdt.ui", c); };
  const setPsb = (L: string[]) => { const m = structuredClone(uMap("psb")); L.forEach(n => { if (!m[n]) m[n] = ["jinv", "iad"]; }); Object.keys(m).forEach(n => { if (!L.includes(n)) delete m[n]; }); uSaveMap("psb", m); };
  const Box = ({ t, icon, L, sel, setSel, add, del, tag }: { t: string; icon: React.ReactNode; L: string[]; sel: string; setSel: (v: string) => void; add: () => void; del: (n: string) => void; tag: string }) => (
    <Card>
      <CardHeader icon={icon} title={t} desc={`${L.length} con acceso`} />
      <div className="scrollbar-thin max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">{L.length ? L.map(n => <Row key={n} n={n}><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tag}</span><Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 />} aria-label="Quitar" onClick={() => del(n)} /></Row>)
        : <p className="p-4 text-sm text-slate-400">Nadie tiene acceso.</p>}</div>
      <CardBody><div className="flex gap-2"><AgentCombo className="flex-1" value={sel} onChange={setSel} names={R.filter(a => !L.includes(a.n)).map(a => a.n)} /><Button onClick={add}>Agregar</Button></div></CardBody>
    </Card>);
  return <>
    <Box t="Acceso a la RTD" icon={<GraduationCap />} tag="RTD" L={rtd} sel={sr} setSel={setSr} add={() => { if (!sr) { toast("Elegí un agente", "err"); return; } setRtd([...rtd, sr]); toast(sr + " ahora tiene acceso a la RTD"); setSr(""); }}
      del={async n => { if (await confirm(`¿Quitar a ${n} de la RTD?`, { danger: true })) { setRtd(rtd.filter(x => x !== n)); toast(n + " ya no tiene acceso a la RTD"); } }} />
    <Box t="Acceso a la PSB" icon={<Shield />} tag="PSB" L={psb} sel={sp} setSel={setSp} add={() => { if (!sp) { toast("Elegí un agente", "err"); return; } setPsb([...psb, sp]); toast(sp + " ahora tiene acceso a la PSB"); setSp(""); }}
      del={async n => { if (await confirm(`¿Quitar a ${n} de la PSB? Deja de ver Professional Standards Bureau, el catálogo de faltas y la Conference Room del 10-80.`, { danger: true })) { setPsb(psb.filter(x => x !== n)); toast(n + " ya no tiene acceso a la PSB"); } }} />
  </>;
}

/* ---------- imágenes, textos y emblemas ---------- */
const BRAND: [string, string, string, number, boolean, "sq" | "bg", string][] = [
  ["lspdt.logo", "Logo general", "El de los lugares que no tienen un casillero propio.", 512, true, "sq", "Logos"],
  ["lspdt.logo.login", "Logo del inicio de sesión", "El escudo grande del recuadro de ingreso.", 512, true, "sq", "Logos"],
  ["lspdt.logo.header", "Logo del encabezado", "Arriba a la izquierda, al lado del título.", 512, true, "sq", "Logos"],
  ["lspdt.fav", "Ícono de la pestaña (favicon)", "Si está vacío se usa el logo general.", 256, true, "sq", "Logos"],
  ["lspdt.bg.tablet", "Fondo detrás de la tablet", "Recomendado 1920×1080, por ejemplo una captura del juego.", 1920, false, "bg", "Fondos"],
  ["lspdt.bg.login", "Fondo del inicio de sesión", "Se ve detrás del recuadro de ingreso.", 1920, false, "bg", "Fondos"],
  ["lspdt.img.avatar", "Foto por defecto de los agentes", "La que se ve en los perfiles sin foto propia.", 800, false, "sq", "Perfiles de agentes"],
  ["lspdt.img.avatar_m", "Foto por defecto · masculino", "Opcional: reemplaza a la general en los agentes masculinos.", 800, false, "sq", "Perfiles de agentes"],
  ["lspdt.img.avatar_f", "Foto por defecto · femenino", "Opcional: reemplaza a la general en las agentes femeninas.", 800, false, "sq", "Perfiles de agentes"],
  ["lspdt.img.cover", "Portada por defecto de los perfiles", "El fondo de arriba del perfil cuando no tiene portada propia.", 1920, false, "bg", "Perfiles de agentes"],
  ["lspdt.img.dcav", "Avatar de la vista previa de Discord", "La imagen redonda al lado del nombre en la vista previa.", 256, true, "sq", "Otras imágenes"],
];
const UI_TXT: [string, string, string][] = [["title", "Título de la terminal", "Terminal de Mando"], ["kicker", "Subtítulo", "Los Santos Police Department"], ["foot", "Pie del inicio de sesión", "Mission Row 10 · Uso interno"],
  ["place", "Lugar (reloj del Inicio y pie)", "Los Santos · Mission Row 10"], ["bot", "Nombre en la vista previa de Discord", "LSPD Terminal"]];
export function AdmMarca() {
  useStoreVersion();
  const { toast, confirm } = useFeedback();
  const [pick, setPick] = useState<{ k: string; t: string; max: number; alpha: boolean; wide?: boolean } | null>(null);
  const ui = LS.json<Record<string, string>>("lspdt.ui", {}), setUi = (k: string, v: string, msg?: string) => { LS.setJSON("lspdt.ui", { ...LS.json<Record<string, string>>("lspdt.ui", {}), [k]: v }); if (msg) toast(msg); }, [txt, setTxt] = useState<Record<string, string>>(() => Object.fromEntries(UI_TXT.map(([k]) => [k, ui[k] || ""])));
  const SUBS = ["lspdt.logo.login", "lspdt.logo.boot", "lspdt.logo.header", "lspdt.logo.hero", "lspdt.logo.wm", "lspdt.fav"];
  const freeze = () => { const cur = LS.get("lspdt.logo") || "/next/logo.svg"; SUBS.forEach(k => { if (!LS.get(k)) LS.set(k, cur); }); };
  let grp = "";
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader icon={<Type />} title="Textos de la interfaz" desc="Los ven todos, en las dos versiones." />
        <CardBody><div className="grid gap-4 sm:grid-cols-2">{UI_TXT.map(([k, l, d]) => <Field key={k} label={l}><Input value={txt[k]} onChange={e => setTxt({ ...txt, [k]: e.target.value })} placeholder={d} /></Field>)}</div>
          <div className="flex justify-end"><Button size="sm" icon={<Save />} onClick={() => { const c = LS.json<Record<string, string>>("lspdt.ui", {}); UI_TXT.forEach(([k]) => { c[k] = (txt[k] || "").trim(); }); LS.setJSON("lspdt.ui", c); toast("Textos guardados · lo ven todos"); }}>Guardar textos</Button></div></CardBody>
      </Card>
      <Card>
        <CardHeader icon={<Palette />} title="Apariencia por defecto del departamento" desc="La ve quien no eligió una propia en Apariencia (en las dos versiones)." />
        <CardBody>
          <Field label="Tema"><SkinGrid value={ui.theme || ""} onPick={k => { const c = LS.json<Record<string, string>>("lspdt.ui", {}); c.theme = k; LS.setJSON("lspdt.ui", c); toast("Tema por defecto del departamento: " + SKINS[k].l); }} /></Field>
          <Field label="Puntero"><CursorGrid value={ui.cursor || "sys"} acc={SKINS[ui.theme]?.acc || "#6366f1"} onPick={k => { const c = LS.json<Record<string, string>>("lspdt.ui", {}); c.cursor = k; LS.setJSON("lspdt.ui", c); toast("Puntero por defecto actualizado"); }} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marca «Bananita» del marco de tablet"><Segmented size="sm" value={ui.brand || "rgb"} onChange={v => setUi("brand", v, "Marca por defecto actualizada")} options={[{ value: "rgb", label: "RGB" }, { value: "magenta", label: "Magenta neón" }, { value: "off", label: "Desactivada" }]} /></Field>
            <Field label={`Velocidad del RGB · ${ui.brandSpd || 6} s por vuelta`}><input type="range" min={1} max={20} step={0.5} value={+(ui.brandSpd || 6)} disabled={(ui.brand || "rgb") !== "rgb"} onChange={e => setUi("brandSpd", e.target.value)} className="mt-3 w-full accent-brand-600 disabled:opacity-40" /></Field>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<ImagePlus />} title="Imágenes" desc="Logos, fondos y fotos por defecto. Se guardan en la terminal y las ven todos." />
        <CardBody>
          <div className="space-y-1">{BRAND.map(([k, t, h, max, alpha, f, g]) => { const v = LS.get(k), head = g !== grp ? (grp = g) : ""; return (
            <div key={k}>
              {head && <p className="pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 first:pt-0">{head}</p>}
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800", f === "bg" ? "h-16 w-28" : "size-16")}>
                  {v || g === "Logos" ? <img loading="lazy" decoding="async" src={v || LS.get("lspdt.logo") || "/next/logo.svg"} alt="" className={cn("size-full", f === "bg" ? "object-cover" : "object-contain p-1.5", !v && "opacity-60")} /> : <span className="text-[10px] text-slate-400">{f === "bg" ? "Sin fondo" : "Por defecto"}</span>}</div>
                <div className="min-w-[12rem] flex-1"><p className="text-sm font-semibold">{t}</p><p className="text-xs text-slate-500">{h.replace(/\s*Recomendado [^.]*\.?/, "")}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">{(() => { const sp = imgSpec(max, alpha, f === "bg"); return [sp.px, sp.fmt, sp.peso].map(x => <span key={x} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{x}</span>); })()}</p></div>
                <Button size="sm" variant="outline" icon={<Upload />} onClick={() => setPick({ k, t, max, alpha, wide: f === "bg" })}>Cambiar</Button>
                {v && <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={async () => { if (!(await confirm(`¿Quitar «${t}»?`))) return; if (SUBS.includes(k)) LS.set(k, LS.get("lspdt.logo") || "/next/logo.svg"); else LS.del(k); toast("Restaurado"); }}>{SUBS.includes(k) ? "Copiar el general" : "Quitar"}</Button>}
              </div>
            </div>); })}</div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<Shield />} title="Emblemas de las divisiones" desc="Los colores de cada división se toman de su emblema." />
        <CardBody><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{ALL_DIVS.map(d => { const own = !!LS.get("lspdt.divlogo." + d); return (
          <div key={d} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 text-center dark:border-slate-800">
            <div className="size-14"><DivLogo d={d} /></div><b className="text-[11.5px] font-semibold leading-tight">{d}</b>
            <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setPick({ k: "lspdt.divlogo." + d, t: "Emblema · " + d, max: 400, alpha: true })}>Cambiar</Button>
              {own && <Button size="sm" variant="ghost" onClick={async () => { if (await confirm(`¿Volver al emblema original de ${d}?`)) { LS.del("lspdt.divlogo." + d); toast("Emblema original restaurado"); } }}>Original</Button>}</div>
          </div>); })}</div></CardBody>
      </Card>
      {pick && <ImagePicker open title={pick.t} k={pick.k} max={pick.max} alpha={pick.alpha} wide={pick.wide} onClose={() => setPick(null)}
        onFile={d => { if (pick.k === "lspdt.logo") freeze(); LS.set(pick.k, d); toast("Guardado · lo ven todos"); }} onUrl={() => toast("Imagen guardada en la terminal · lo ven todos")} />}
    </div>
  );
}

/* ---------- roster y respaldo ---------- */
function rosterFromCSV(t: string) {
  const rows = parseCSV(t); if (rows.length < 2) throw new Error("El CSV está vacío");
  const h = rows[0].map(s => norm(s.trim())), ix = (k: string) => h.indexOf(k);
  const iN = ix("nombre"), iP = ix("placa"), iR = ix("rango"), iE = ix("estado"), iA = ix("ascenso"), iC = ix("contrato"), iD = ix("discord"), iI = ix("discord id"), iS = ix("state id"), iO = ix("observaciones");
  if (iN < 0 || iR < 0) throw new Error("El CSV necesita las columnas Nombre y Rango");
  const g = (r: string[], i: number) => (i >= 0 ? (r[i] || "").trim() : "");
  return rows.slice(1).filter(r => g(r, iN)).map(r => ({ n: g(r, iN), p: g(r, iP), r: g(r, iR), e: g(r, iE), a: g(r, iA), c: g(r, iC), d: g(r, iD), i: g(r, iI).replace(/\D/g, ""), s: g(r, iS), o: g(r, iO).replace(/\s+/g, " ") }));
}
export function AdmDatos() {
  useStoreVersion();
  const { toast, confirm } = useFeedback(), csv = useRef<HTMLInputElement>(null), bk = useRef<HTMLInputElement>(null);
  const custom = !!LS.get("lspdt.roster"), R = getRoster();
  const exp = async () => {
    toast("Preparando respaldo…"); const o: Record<string, string> = {};
    const ks = LS.keys().filter(k => k.startsWith("lspdt.") && !["lspdt.iconpng", "lspdt.recent"].includes(k) && !k.startsWith("lspdt.next."));
    await Promise.all(ks.map(async k => { let v = LS.get(k); if (v && v.startsWith("/api/img")) { try { const b = await (await fetch(v)).blob(); v = await new Promise<string>(r => { const f = new FileReader(); f.onload = () => r(String(f.result)); f.readAsDataURL(b); }); } catch { return; } } if (v != null) o[k] = v; }));
    const b = new Blob([JSON.stringify({ app: "LSPD Terminal", version: "next", fecha: new Date().toISOString(), datos: o })], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `respaldo-lspd-terminal-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast("Respaldo exportado");
  };
  const imp = (f: File) => { const r = new FileReader(); r.onload = async () => {
    let d: Record<string, string>; try { d = JSON.parse(String(r.result)).datos; if (!d || typeof d !== "object") throw 0; } catch { toast("El archivo no es un respaldo válido", "err"); return; }
    const skip = new Set(["lspdt.accounts", "lspdt.session", "lspdt.iconpng", "lspdt.recent", "lspdt.bg"]);
    const ent = Object.entries(d).filter(([k, v]) => k.startsWith("lspdt.") && !skip.has(k) && typeof v === "string");
    if (!(await confirm(`¿Importar el respaldo (${ent.length} registros)? Reemplaza los datos compartidos de TODO el departamento. Las cuentas no se importan.`, { danger: true, ok: "Importar" }))) return;
    ent.forEach(([k, v]) => LS.set(k, v)); toast(`Subiendo respaldo (${ent.length} registros)…`); await syncIdle(); toast("Respaldo importado. Recargando…"); setTimeout(() => location.reload(), 900);
  }; r.readAsText(f); };
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader icon={<FileSpreadsheet />} title="Roster" desc={`${R.length} agentes · ${custom ? "cargado manualmente" : "roster original"}`} />
        <CardBody className="flex flex-1 flex-col">
          <p className="flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Cargá un CSV con las columnas <b className="text-slate-700 dark:text-slate-200">Nombre</b> y <b className="text-slate-700 dark:text-slate-200">Rango</b>. Opcionales: Placa, Estado, Ascenso, Contrato, Discord, Discord ID, State ID y Observaciones.</p>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/80">
            <Button icon={<Upload />} onClick={() => csv.current?.click()}>Cargar CSV</Button>
            {custom && <Button variant="outline" icon={<RotateCcw />} onClick={async () => { if (await confirm(`¿Volver al roster original (${DEF_ROSTER.length} agentes)?`)) { LS.del("lspdt.roster"); toast("Roster original restaurado"); } }}>Restaurar original</Button>}
            <input ref={csv} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const r = new FileReader();
              r.onload = () => { try { const a = rosterFromCSV(String(r.result)); LS.setJSON("lspdt.roster", a); toast(`Roster cargado: ${a.length} agentes`); } catch (err) { toast((err as Error).message, "err"); } }; r.readAsText(f, "utf-8"); }} />
          </div>
        </CardBody>
      </Card>
      <Card className="flex flex-col">
        <CardHeader icon={<Database />} title="Respaldo" desc="Datos en línea, compartidos por todo el departamento" />
        <CardBody className="flex flex-1 flex-col">
          <p className="flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Exportá una copia de todos los datos del departamento. <b className="text-slate-700 dark:text-slate-200">Importar</b> reemplaza los datos compartidos (perfiles, votaciones, registros, fotos…); las cuentas no se incluyen.</p>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/80">
            <Button icon={<Download />} onClick={exp}>Exportar respaldo</Button>
            <Button variant="outline" icon={<Upload />} onClick={() => bk.current?.click()}>Importar respaldo</Button>
            <input ref={bk} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) imp(f); }} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
