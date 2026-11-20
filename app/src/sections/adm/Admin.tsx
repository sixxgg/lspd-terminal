import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpenCheck, Copy, Scale, UserCheck, Crown, ShieldPlus, ImagePlus, Type, Save, Check, X, Upload, Download, FileSpreadsheet, RotateCcw, Shield, Database, Eye, KeyRound } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Empty, Field, Input, Segmented, Select } from "@/components/ui";
import { prevStart } from "@/lib/preview";
import { AgentCombo, Avatar } from "@/components/agents";
import { ImagePicker, imgSpec } from "@/components/imagepick";
import { useFeedback } from "@/components/feedback";
import { DEPT, DEL, DEPTS, logoOf, setDept } from "@/lib/dept";
import { RosterImport } from "@/sections/Lssd";
import { UI_DEF, uiKey, type UiKey } from "@/lib/templates";
import { dk } from "@/lib/store";
import { ALL_DIVS, deptDivNames, hasDivFile, findAgent, fmtDate, getRoster, norm, rankES, RANK_COLOR } from "@/lib/domain";
import { authApi } from "@/lib/api";
import { ACC, DEF_ROSTER, LS, ME_ROLES, syncIdle, useJSON, useStoreVersion } from "@/lib/store";
import { parseCSV } from "@/lib/csv";
import { DivLogo } from "@/sections/sup/Agentes";
import { CursorGrid, SkinGrid } from "@/components/appearance";
import { SKINS } from "@/lib/appearance";
import { Palette } from "lucide-react";
import { cn } from "@/lib/cn";

const Row = ({ n, children }: { n: string; children?: React.ReactNode }) => { const a = findAgent(n); return (
  <div className="flex flex-wrap items-center gap-3 px-4 py-2.5"><Avatar n={n} size={30} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{n}</p><p className="text-xs text-slate-500">{a ? rankES(a.r) + (a.p ? " · #" + a.p : "") : "Fuera del roster"}</p></div>{children}</div>); };

/* ---------- accesos que solo da el dueño: Legal y Consulta (en prueba) ---------- */
function OwnerAcc({ k, t, icon, area, desc }: { k: string; t: string; icon: React.ReactNode; area: string; desc?: string }) {
  const { toast, confirm } = useFeedback(), [L, setL] = useJSON<string[]>(k, []), [sel, setSel] = useState("");
  return (
    <Card>
      <CardHeader icon={icon} title={t} desc={desc ? `${desc} ${L.length} con acceso.` : `Solo vos podés darlo. ${L.length} con acceso además de vos.`} />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{L.length ? L.map(n => <Row key={n} n={n}>
        <button aria-label={`Quitar a ${n}`} onClick={async () => { if (await confirm(`¿Quitarle el acceso a ${area} a ${n}?`, { danger: true })) { setL(L.filter(x => x !== n)); toast(`${n} ya no ve ${area}`); } }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><X className="size-4" /></button></Row>)
        : <p className="px-4 py-3 text-sm text-slate-400">Nadie más tiene acceso.</p>}</div>
      <CardBody><div className="flex gap-2"><AgentCombo className="flex-1" value={sel} onChange={setSel} filter={a => !L.includes(a.n)} />
        <Button onClick={() => { if (!sel) { toast("Elegí un agente", "err"); return; } setL([...L, sel]); toast(`${sel} ahora ve ${area}`); setSel(""); }}>Dar acceso</Button></div></CardBody>
    </Card>);
}

/* estilo «clasic» (panel con menú lateral, como el de Eleven): lo da six o la administración; la lista sirve para los tres departamentos */
const ClasicAcc = () => <OwnerAcc k="lspdt.clasic" t="Estilo clasic" icon={<Palette />} area="el estilo clasic"
  desc="Cambia toda la terminal al estilo clasic (menú lateral, sin marco de tablet). Lo da six o la administración; cada uno puede apagarlo en Apariencia." />;
/* ---------- solicitudes de acceso y administradores ---------- */
/* LSSD y SAHP: los accesos que da six (Legal); las solicitudes y los administradores son del LSPD */
export function AdmAccesosX() {
  const dadm = !!ME_ROLES.dadm && !ME_ROLES.six;
  return <div className="space-y-5"><AreaAcc />{ME_ROLES.six && <OwnerAcc k="lspdt.legacc" t="Acceso a Legal" icon={<Scale />} area="Legal" />}{(ME_ROLES.six || ME_ROLES.admin) && <ClasicAcc />}
    {(dadm || ME_ROLES.six) && <div className="grid gap-5 xl:grid-cols-2"><DeptInvites /><DeptAccounts /></div>}
    <p className="text-sm text-slate-500">{dadm ? `Como administración ${DEL[DEPT.id]} manejás el acceso a las áreas, las invitaciones y ves las cuentas ${DEL[DEPT.id]}. Marca, roster y respaldo los maneja six.`
      : `Las cuentas ${DEL[DEPT.id]} entran con su código de invitación (lo generás en tu panel, eligiendo el departamento, o lo genera la administración del departamento).`}</p></div>;
}
/* administración del departamento: códigos de invitación de su departamento (un solo uso, 72 h) */
type Inv = { c: string; t: number; exp: number; u?: string; ut?: number; d?: string };
function DeptInvites() {
  const { toast } = useFeedback(), [L, setL] = useState<Inv[]>([]), [U, setU] = useState<Inv[]>([]), [busy, setBusy] = useState(false);
  const load = () => void authApi({ a: "invites" }).then(r => { if (r.__s === 200) { setL((r.list as Inv[]).filter(x => (x.d || "lspd") === DEPT.id)); setU(((r.used || []) as Inv[]).filter(x => (x.d || "lspd") === DEPT.id)); } });
  useEffect(load, []);
  const cp = (c: string) => { void navigator.clipboard?.writeText(c).catch(() => {}); toast(`Copiado: ${c}`); };
  const f = (t: number) => new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return <Card><CardHeader icon={<KeyRound />} title="Invitaciones" desc="Código para registrarse en la terminal. Un solo uso, vence a las 72 h." />
    <CardBody className="space-y-2">
      <Button className="w-full" disabled={busy} onClick={async () => { setBusy(true); const r = await authApi({ a: "invite", d: DEPT.id }); setBusy(false); if (r.__s !== 200) { toast(r.msg || "No se pudo generar", "err"); return; } cp(r.c); load(); }}>Generar invitación</Button>
      {L.map(x => <div key={x.c} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
        <b className="font-mono text-sm">{x.c}</b><span className="text-slate-500">vence {f(x.exp)}</span>
        <button title="Copiar" onClick={() => cp(x.c)} className="ml-auto text-slate-400 hover:text-slate-800 dark:hover:text-white"><Copy className="size-3.5" /></button>
        <button title="Revocar" onClick={async () => { const r = await authApi({ a: "uninvite", c: x.c }); if (r.__s !== 200) { toast(r.msg || "No se pudo revocar", "err"); return; } load(); }} className="text-slate-400 hover:text-red-500"><X className="size-3.5" /></button></div>)}
      {!L.length && <p className="py-2 text-center text-xs text-slate-400">No hay invitaciones activas.</p>}
      {U.length > 0 && <div className="pt-1"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Usadas</p>
        {U.slice().reverse().map(x => <p key={x.c} className="text-xs text-slate-500"><span className="font-mono">{x.c}</span> → <b>{(x.u || "").replace(/^(lssd|sahp):/, "").split("/")[0]}</b>{x.ut ? ` · ${f(x.ut)}` : ""}</p>)}</div>}
    </CardBody></Card>;
}
/* entradas: las cuentas del departamento, con su registro y su último ingreso (sin restablecer ni borrar) */
function DeptAccounts() {
  const [L, setL] = useState<{ n: string; c: number; last: number | null }[] | null>(null);
  useEffect(() => { void authApi({ a: "deptaccs", d: DEPT.id }).then(r => setL(r.__s === 200 ? r.list : [])); }, []);
  const f = (t: number | null) => (t ? new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
  const who = (n: string) => { const [u, p] = n.replace(/^(lssd|sahp):/, "").split("/"); const a = getRoster().find(x => norm(x.n).replace(/[^a-z0-9]/g, "") === p); return { u, a }; };
  return <Card><CardHeader icon={<UserCheck />} title="Cuentas y entradas" desc={`Quién tiene cuenta ${DEL[DEPT.id]} y cuándo entró por última vez.`} />
    <CardBody className="max-h-[22rem] space-y-1 overflow-y-auto">{L === null ? <p className="py-4 text-center text-xs text-slate-400">Cargando…</p> : !L.length ? <p className="py-4 text-center text-xs text-slate-400">Todavía no hay cuentas.</p>
      : L.map(x => { const { u, a } = who(x.n); return <div key={x.n} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <Avatar n={a?.n || u} size={26} /><span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{a?.n || u}</b><span className="block truncate text-[11px] text-slate-500">{u}{a ? ` · ${rankES(a.r)}` : ""}</span></span>
        <span className="text-right text-[11px] text-slate-500">Último ingreso<br /><b className="font-mono text-slate-700 dark:text-slate-200">{f(x.last)}</b></span></div>; })}</CardBody></Card>;
}
/* acceso a Supervisores, Capitanía y Jefatura sin tener el rango: se elige la cuenta y listo (el servidor la trata como ese rango en esas áreas) */
const AREAS_ACC = (): [string, string, string][] => (DEPT.id === "lspd" ? [["sup", "Supervisores", "Sargento I"], ["cap", "Capitanía", "Teniente"], ["jef", "Jefatura", "Comandante"]]
  : [["sup", "Supervisores", "Sergeant"], ["cap", "Capitanía", "Lieutenant"], ["jef", "Jefatura", DEPT.id === "lssd" ? "Area Commander" : "Chief"]]);
/* cuentas creadas del departamento activo (las del LSPD por nombre; las del LSSD y la SAHP salen del directorio) */
const hasAcc = (n: string) => (DEPT.id === "lspd" ? ACC.names.includes(n) : ACC.dir.some(x => x.n === n && x.d === DEPT.id));
function AreaAcc() {
  const { toast } = useFeedback(), [A, setA] = useJSON<Record<string, string[]>>("lspdt.areaAcc", {}), [sel, setSel] = useState<Record<string, string>>({});
  const put = (k: string, L: string[]) => setA({ ...A, [k]: L });
  return (
    <Card className="xl:col-span-2">
      <CardHeader icon={<KeyRound />} title="Acceso a áreas" desc="Quién ve cada área aunque no tenga el rango." />
      <div className="grid gap-px bg-slate-100 md:grid-cols-3 dark:bg-slate-800">{AREAS_ACC().map(([k, t, r]) => { const L = A[k] || []; return (
        <div key={k} className="flex flex-col gap-3 bg-white p-4 dark:bg-slate-900">
          <p className="flex items-baseline gap-2"><b className="text-sm">{t}</b><span className="text-xs text-slate-400">como {r}</span><span className="ml-auto font-mono text-xs text-slate-400">{L.length}</span></p>
          <div className="flex min-h-8 flex-wrap gap-1.5">{L.length ? L.map(n => (
            <span key={n} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-1 pr-2 text-xs font-medium dark:bg-slate-800"><Avatar n={n} size={20} />{n}
              <button aria-label={`Quitar a ${n}`} onClick={() => { put(k, L.filter(x => x !== n)); toast(`${n} ya no ve ${t}`); }} className="text-slate-400 hover:text-red-500"><X className="size-3" /></button></span>))
            : <span className="text-xs text-slate-400">Solo por rango.</span>}</div>
          <div className="mt-auto flex gap-1.5"><AgentCombo className="flex-1" value={sel[k] || ""} onChange={v => setSel({ ...sel, [k]: v })} filter={a => hasAcc(a.n) && !L.includes(a.n)} />
            <Button size="sm" disabled={!sel[k]} onClick={() => { put(k, [...L, sel[k]]); toast(`${sel[k]} ahora ve ${t}`); setSel({ ...sel, [k]: "" }); }}>Dar</Button></div>
        </div>); })}</div>
    </Card>);
}
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
      <AreaAcc />
      {ME_ROLES.six && <OwnerAcc k="lspdt.legacc" t="Acceso a Legal" icon={<Scale />} area="Legal" />}
      {ME_ROLES.six && <OwnerAcc k="lspdt.consultaAcc" t="Acceso a Consulta (en prueba)" icon={<BookOpenCheck />} area="Consulta" />}
      {(ME_ROLES.six || ME_ROLES.admin) && <ClasicAcc />}
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
      
    </div>
  );
}
/* ---------- imágenes, textos y emblemas ---------- */
const BRAND: [string, string, string, number, boolean, "sq" | "bg", string][] = [
  ["lspdt.logo", "Escudo del departamento", "El logo general: va en todos los lugares que no tienen un casillero propio.", 512, true, "sq", "Logos"],
  ["lspdt.logo.login", "Logo del inicio de sesión", "El escudo grande del recuadro de ingreso.", 512, true, "sq", "Logos"],
  ["lspdt.logo.header", "Logo del encabezado", "Arriba a la izquierda, al lado del título.", 512, true, "sq", "Logos"],
  ["lspdt.logo.boot", "Logo de la pantalla de carga", "El que se ve mientras entra a la terminal.", 512, true, "sq", "Logos"],
  ["lspdt.logo.upd", "Logo de la pantalla de actualización", "El que se ve arriba a la izquierda mientras se instala una versión nueva.", 512, true, "sq", "Logos"],
  ["lspdt.fav", "Ícono de la pestaña (favicon)", "Si está vacío se usa el logo general.", 256, true, "sq", "Logos"],
  ["lspdt.bg.tablet", "Fondo detrás de la tablet", "Recomendado 1920×1080, por ejemplo una captura del juego.", 1920, false, "bg", "Fondos"],
  ["lspdt.bg.login", "Fondo del inicio de sesión", "Se ve detrás del recuadro de ingreso.", 1920, false, "bg", "Fondos"],
  ["lspdt.img.avatar", "Foto por defecto de los agentes", "La que se ve en los perfiles sin foto propia.", 800, false, "sq", "Perfiles de agentes"],
  ["lspdt.img.avatar_m", "Foto por defecto · masculino", "Opcional: reemplaza a la general en los agentes masculinos.", 800, false, "sq", "Perfiles de agentes"],
  ["lspdt.img.avatar_f", "Foto por defecto · femenino", "Opcional: reemplaza a la general en las agentes femeninas.", 800, false, "sq", "Perfiles de agentes"],
  ["lspdt.img.cover", "Portada por defecto de los perfiles", "El fondo de arriba del perfil cuando no tiene portada propia.", 1920, false, "bg", "Perfiles de agentes"],
  ["lspdt.img.dcav", "Avatar de la vista previa de Discord", "La imagen redonda al lado del nombre en la vista previa.", 256, true, "sq", "Otras imágenes"],
];
const UI_TXT: [UiKey, string][] = [["title", "Título de la terminal"], ["kicker", "Subtítulo (nombre del departamento)"], ["foot", "Pie del inicio de sesión"],
  ["place", "Lugar (reloj del Inicio y pie)"], ["bot", "Nombre en la vista previa de Discord"], ["sys", "Nombre del sistema (avisos de actualización, feedback y códigos)"]];
/* logos que siguen con el de fábrica: los de la terminal, los escudos de cada departamento y los emblemas de las divisiones de los tres */
function Faltan({ onPick }: { onPick: (k: string, t: string, max: number) => void }) {
  useStoreVersion();
  const logos = BRAND.filter(([k, , , , , , g]) => g === "Logos" && !LS.get(k)).map(([k, t]) => ({ k, t }));
  const divs = (["lspd", "lssd", "sahp"] as const).map(d => ({ d, L: deptDivNames(d).filter(n => !LS.raw(dk("lspdt.divlogo." + n, d))) })).filter(x => x.L.length);
  const n = logos.length + divs.reduce((a, x) => a + x.L.length, 0);
  return (
    <Card>
      <CardHeader icon={<ImagePlus />} title={n ? `Logos por cambiar · ${n}` : "Todos los logos están cambiados"} desc="Los que todavía usan el de fábrica (o el dibujado por la terminal). Tocá uno para subir el tuyo; los de otro departamento se cambian estando en ese departamento." />
      {n > 0 && <CardBody className="space-y-3">
        {logos.length > 0 && <div><p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Terminal y departamentos</p>
          <div className="flex flex-wrap gap-1.5">{logos.map(x => <button key={x.k} onClick={() => onPick(x.k, x.t, 512)} className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-400/20 dark:text-amber-300">{x.t}</button>)}</div></div>}
        {divs.map(x => <div key={x.d}><p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Divisiones {DEL[x.d]}</p>
          <div className="flex flex-wrap gap-1.5">{x.L.map(n => { const here = x.d === DEPT.id; return (
            <button key={n} disabled={!here} title={here ? "Subir el emblema" : `Cambiá al ${DEPTS[x.d].short} para subirlo`} onClick={() => onPick("lspdt.divlogo." + n, "Emblema · " + n, 400)}
              className={cn("rounded-full border px-2.5 py-1 text-[12px] font-semibold uppercase transition", here ? "border-amber-400/50 bg-amber-400/10 text-amber-700 hover:bg-amber-400/20 dark:text-amber-300" : "border-slate-200 text-slate-400 dark:border-slate-700")}>{n}{hasDivFile(n, x.d) ? " · oficial" : ""}</button>); })}</div></div>)}
      </CardBody>}
    </Card>);
}
export function AdmMarca() {
  useStoreVersion();
  const { toast, confirm } = useFeedback();
  const [pick, setPick] = useState<{ k: string; t: string; max: number; alpha: boolean; wide?: boolean } | null>(null);
  const ui = LS.json<Record<string, string>>("lspdt.ui", {}), setUi = (k: string, v: string, msg?: string) => { LS.setJSON("lspdt.ui", { ...LS.json<Record<string, string>>("lspdt.ui", {}), [k]: v }); if (msg) toast(msg); }, [txt, setTxt] = useState<Record<string, string>>(() => Object.fromEntries(UI_TXT.map(([k]) => [k, ui[uiKey(k)] || ""])));
  const thK = DEPT.id === "lspd" ? "theme" : "theme." + DEPT.id; /* tema por defecto de cada departamento */
  const SUBS = ["lspdt.logo.login", "lspdt.logo.boot", "lspdt.logo.header", "lspdt.logo.hero", "lspdt.logo.wm", "lspdt.fav"];
  const freeze = () => { const cur = logoOf(); SUBS.forEach(k => { if (!LS.get(k)) LS.set(k, cur); }); };
  let grp = "";
  return (
    <div className="space-y-5">
      <Faltan onPick={(k, t, max) => setPick({ k, t, max, alpha: true })} />
      <Card>
        <CardHeader icon={<Type />} title={`Textos de la interfaz · ${DEPTS[DEPT.id].short}`} desc={`Los ${DEL[DEPT.id]}: encabezado, ingreso, pantallas de carga y avisos. Cada departamento tiene los suyos (cambiá de departamento tocando el escudo).`} />
        <CardBody><div className="grid gap-4 sm:grid-cols-2">{UI_TXT.map(([k, l]) => <Field key={k} label={l}><Input value={txt[k]} onChange={e => setTxt({ ...txt, [k]: e.target.value })} placeholder={UI_DEF[DEPT.id][k]} /></Field>)}</div>
          <div className="flex justify-end"><Button size="sm" icon={<Save />} onClick={() => { const c = LS.json<Record<string, string>>("lspdt.ui", {}); UI_TXT.forEach(([k]) => { c[uiKey(k)] = (txt[k] || "").trim(); }); LS.setJSON("lspdt.ui", c); toast("Textos guardados · lo ven todos"); }}>Guardar textos</Button></div></CardBody>
      </Card>
      <Card>
        <CardHeader icon={<Palette />} title="Apariencia por defecto del departamento" desc="La ve quien no eligió una propia en Apariencia (en las dos versiones)." />
        <CardBody>
          <Field label={`Tema ${DEL[DEPT.id]}`}><SkinGrid value={ui[thK] || ""} onPick={k => { const c = LS.json<Record<string, string>>("lspdt.ui", {}); c[thK] = k; LS.setJSON("lspdt.ui", c); toast("Tema por defecto del departamento: " + SKINS[k].l); }} /></Field>
          <Field label="Puntero"><CursorGrid value={ui.cursor || "sys"} acc={SKINS[ui[thK]]?.acc || "#6366f1"} onPick={k => { const c = LS.json<Record<string, string>>("lspdt.ui", {}); c.cursor = k; LS.setJSON("lspdt.ui", c); toast("Puntero por defecto actualizado"); }} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marca «Bananita» del marco de tablet"><Segmented size="sm" value={ui.brand || "rgb"} onChange={v => setUi("brand", v, "Marca por defecto actualizada")} options={[{ value: "rgb", label: "RGB" }, { value: "magenta", label: "Magenta neón" }, { value: "off", label: "Desactivada" }]} /></Field>
            <Field label={`Velocidad del RGB · ${ui.brandSpd || 6} s por vuelta`}><input type="range" min={1} max={20} step={0.5} value={+(ui.brandSpd || 6)} disabled={(ui.brand || "rgb") !== "rgb"} onChange={e => setUi("brandSpd", e.target.value)} className="mt-3 w-full accent-brand-600 disabled:opacity-40" /></Field>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<ImagePlus />} title={`Imágenes · ${DEPTS[DEPT.id].short}`} desc={`Logos, fondos y fotos por defecto ${DEL[DEPT.id]}. Cada departamento tiene las suyas, así que lo que cambies acá no toca a los otros dos.`} />
        <CardBody>
          {ME_ROLES.six && <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Editando</span>
            {(["lspd", "lssd", "sahp"] as const).map(d => <button key={d} onClick={() => d !== DEPT.id && setDept(d)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition", d === DEPT.id ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:border-brand-400 dark:border-slate-700")}>
              <img src={logoOf("", d)} alt="" className="size-4 object-contain" />{DEPTS[d].short}</button>)}</div>}
          <div className="space-y-1">{BRAND.map(([k, t, h, max, alpha, f, g]) => { const v = LS.get(k), head = g !== grp ? (grp = g) : ""; return (
            <div key={k}>
              {head && <p className="pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 first:pt-0">{head}</p>}
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800", f === "bg" ? "h-16 w-28" : "size-16")}>
                  {v || g === "Logos" ? <img loading="lazy" decoding="async" src={v || logoOf()} alt="" className={cn("size-full", f === "bg" ? "object-cover" : "object-contain p-1.5", !v && "opacity-60")} /> : <span className="text-[10px] text-slate-400">{f === "bg" ? "Sin fondo" : "Por defecto"}</span>}</div>
                <div className="min-w-[12rem] flex-1"><p className="text-sm font-semibold">{t}</p><p className="text-xs text-slate-500">{h.replace(/\s*Recomendado [^.]*\.?/, "")}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">{(() => { const sp = imgSpec(max, alpha, f === "bg"); return [sp.px, sp.fmt, sp.peso].map(x => <span key={x} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{x}</span>); })()}</p></div>
                <Button size="sm" variant="outline" icon={<Upload />} onClick={() => setPick({ k, t, max, alpha, wide: f === "bg" })}>Cambiar</Button>
                {v && <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={async () => { if (!(await confirm(`¿Quitar «${t}»?`))) return; if (SUBS.includes(k)) LS.set(k, logoOf()); else LS.del(k); toast("Restaurado"); }}>{SUBS.includes(k) ? "Copiar el general" : "Quitar"}</Button>}
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
        onFile={d => { if (pick.k === "lspdt.logo") freeze(); LS.set(pick.k, d); toast(`Guardado · lo ven todos ${DEL[DEPT.id]}`); }} onUrl={() => toast(`Imagen guardada · lo ven todos ${DEL[DEPT.id]}`)} />}
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
/* LSSD y SAHP: el roster se carga pegando la planilla (o un CSV) */
export function AdmDatosX() { return <RosterImport />; }
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
