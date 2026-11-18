/* Calendario del departamento: junta los eventos que cada división carga en su pestaña Calendario (lspdt.drec.<id>.cal),
   las instrucciones con fecha (lspdt.instr.<id>) y los eventos abiertos a todo el departamento (lspdt.calpub, los sube la ASB o una coordinación).
   Cada sesión solo recibe del servidor lo de sus divisiones, así que acá no hace falta filtrar por permisos.
   Lo personal (leído, anotado, recordatorio) vive en este navegador. */
import { UNITS, genFor, gMap, isGCo, isGMem, isUCoord, rtdMem, uMap, type UnitKey } from "./units";
import { LS, ME_ROLES, dk } from "./store";
import { DEPT, type DeptId } from "./dept";
import { divAb, findAgent, lvl } from "./domain";
import { PROF } from "./nick";
import { htmlToDc } from "./richtext";

export const CAL_TIPOS = ["Práctica", "Instrucción", "Evento", "Reunión", "Operativo", "Otro"] as const;
export type CalEv = { id: string; t: number; by: string; n: string; tipo: string; at: number; cre: string; desc?: string; ban?: boolean; d: string; pub?: boolean };
export type CalItem = CalEv & { src: "cal" | "ins" | "pub" | "reu"; dn: string; ab: string; col: string; imp?: string[]; dp?: DeptId };

/* divisiones con calendario de cada departamento: id → nombre completo */
const calDivsOf = (d: string): [string, string][] => d === "lspd"
  ? [...(Object.entries(UNITS) as [UnitKey, { d: string }][]).map(([k, u]) => [k, u.d] as [string, string]), ["rtd", "Recruitment and Training Division"], ...Object.entries(genFor("lspd")).map(([n, c]) => [c.id, n] as [string, string])]
  : Object.entries(genFor(d)).map(([n, c]) => [c.id, n] as [string, string]);
const calDivs = () => calDivsOf(DEPT.id);
export const calDivName = (id: string) => [...calDivsOf("lspd"), ...calDivsOf("lssd")].find(x => x[0] === id)?.[1] || id.toUpperCase();
const isUnit = (id: string): id is UnitKey => id in UNITS && DEPT.id === "lspd";

/* integrante de verdad (sin contar a la administración: si no, le llegaría todo) */
const calMem = (id: string, n: string) => isUnit(id) ? !!uMap(id)[n] : id === "rtd" ? rtdMem().includes(n) : !!gMap(id)[n];
/* quién carga eventos: la coordinación de la división; en la ASB, cualquier integrante */
export const calCan = (id: string, n: string) => !!ME_ROLES.admin || (isUnit(id) ? isUCoord(id, n) : isGCo(id, n) || (id === "asb" && isGMem("asb", n)));
/* eventos para todo el departamento: ASB o cualquier coordinación */
export const calPubCan = (n: string) => !!ME_ROLES.admin || isGMem("asb", n) || calDivs().some(([id]) => id !== "asb" && calCan(id, n));

export const calKey = (id: string) => `lspdt.drec.${id}.cal`;
export const PUB_KEY = "lspdt.calpub";
export const banKey = (id: string) => `lspdt.calban.${id}`;

type Ins = { id: string; t: number; fecha: string; hora: string; tipo: string; ins: { n: string }[]; imp: { n: string }[]; notas: string; by: string };
const at = (d: string, h: string) => (d ? new Date(`${d}T${h || "00:00"}`).getTime() : 0);

/* todos los eventos que esta sesión puede ver: los de su departamento y, para six, también los de los otros dos (con su departamento marcado) */
const rawJ = <T,>(k: string, d: T): T => { try { const v = LS.raw(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
export function calAll(): CalItem[] {
  const out: CalItem[] = [], cur = DEPT.id;
  for (const dp of (ME_ROLES.six ? ["lspd", "lssd", "sahp"] as DeptId[] : [cur])) {
    const seen = new Set<string>(), get = <T,>(k: string, d: T): T => (dp === cur ? LS.ro<T>(k, d) : rawJ<T>(dk(k, dp), d));
    const deco = (id: string) => { const dn = calDivName(id), [ab, col] = divAb(dn); return { dn, ab: shortAb(id, ab), col, dp }; };
    for (const [id] of calDivsOf(dp)) {
      for (const e of get<CalEv[]>(calKey(id), [])) if (e && e.at && !seen.has(e.id)) { seen.add(e.id); out.push({ ...e, d: id, src: "cal", ...deco(id) }); }
      for (const x of get<Ins[]>(`lspdt.instr.${id}`, [])) if (x && x.fecha) out.push({
        id: "ins:" + x.id, t: x.t, by: x.by, n: x.tipo || "Instrucción", tipo: "Instrucción", at: at(x.fecha, x.hora), cre: x.ins[0]?.n || x.by, desc: x.notas, d: id, src: "ins",
        imp: [...x.ins.map(i => i.n), ...x.imp.map(i => i.n)], ...deco(id) });
    }
    for (const e of get<CalEv[]>(PUB_KEY, [])) if (e && e.at && !seen.has(e.id)) { seen.add(e.id); out.push({ ...e, src: "pub", pub: true, ...deco(e.d || "asb") }); }
    /* reuniones de Supervisores: salen solas del índice de reuniones (si se borra la reunión, desaparece del calendario) */
    for (const r of get<ReuIdx[]>("lspdt.reuniones", []).filter(r => r && r.id && r.f)) if (reuVisible(r)) out.push({ id: "reu:" + r.id, t: r.at, by: r.by, n: r.t, tipo: "Reunión", at: at(r.f, r.h || ""), cre: r.by, d: "sup", src: "reu",
      desc: `${REU_T[r.tpl] || "Reunión"} colaborativa en Supervisores › Reuniones.${r.secs?.length ? `<br>Temas: ${r.secs.slice(0, 12).map(x => x.replace(/[<>&]/g, "")).join(" · ")}` : ""}`,
      dn: REU_T[r.tpl] || "Supervisión", ab: "SUP", col: REU_C[r.tpl] || "#ec4899", dp });
  }
  return out.sort((a, b) => a.at - b.at);
}
/* eventos de otro departamento a menos de 3 horas (para ver qué se superpone) */
export const calClash = (e: CalItem, L: CalItem[]): string[] => [...new Set(L.filter(x => x.dp && x.dp !== e.dp && Math.abs(x.at - e.at) < 3 * 36e5).map(x => x.dp as string))];
/* reuniones (Supervisores › Reuniones): quién las ve y cómo se nombran */
type ReuIdx = { id: string; tpl: string; t: string; f: string; h?: string; by: string; at: number; secs: string[]; closed?: boolean };
const REU_T: Record<string, string> = { brief: "Briefing", sgt: "Reunión de sargentos", po3: "Reunión PO III y III+", libre: "Reunión" };
const REU_C: Record<string, string> = { brief: "#3b82f6", sgt: "#ec4899", po3: "#10b981", libre: "#64748b" };
export const reuList = () => LS.ro<ReuIdx[]>("lspdt.reuniones", []).filter(r => r && r.id && r.f);
export const reuVisible = (r: ReuIdx) => { const l = lvl(findAgent(PROF.me)?.r); return !!ME_ROLES.admin || l >= 6 || (r.tpl === "po3" && l >= 3); };
export const reuLabel = (tpl: string) => REU_T[tpl] || "Reunión";
const shortAb = (id: string, ab: string) => ({ md: "METRO", asd: "A.S.D", k9: "K-9", psb: "PSB", rtd: "RTD" } as Record<string, string>)[id] || ab;

/* ¿me toca? eventos de mis divisiones, instrucciones donde figuro y lo abierto a todos */
export const calMine = (e: CalItem, n: string) => e.src === "pub" || e.src === "reu" || (e.src === "ins" ? !!e.imp?.includes(n) : calMem(e.d, n));

/* fechas */
export const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
export const isToday = (t: number) => dayKey(t) === dayKey(Date.now());
export const hasTime = (e: CalItem) => { const d = new Date(e.at); return (e.src !== "ins" && e.src !== "reu") || d.getHours() + d.getMinutes() > 0; };
export const fmtWhen = (e: CalItem, o: { day?: boolean } = {}) => {
  const d = new Date(e.at), day = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const h = hasTime(e) ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) + " h" : "";
  const r = o.day === false ? h || "Todo el día" : [day, h].filter(Boolean).join(" · ");
  return r.charAt(0).toUpperCase() + r.slice(1);
};

/* lo personal: leído / anotado / recordatorio (por usuario, en este navegador) */
type Ack = Record<string, { r?: number; a?: number; at?: number }>;
const ackK = (n: string) => "lspdt.next.calack:" + n;
const rd = (n: string): Ack => { try { return JSON.parse(localStorage.getItem(ackK(n)) || "{}") as Ack; } catch { return {}; } };
export const calAck = rd;
export function calSetAck(n: string, id: string, p: { r?: number; a?: number; at?: number }) {
  const o = rd(n); o[id] = { ...o[id], ...p }; for (const k of Object.keys(p) as (keyof typeof p)[]) if (!p[k]) delete o[id][k];
  try { localStorage.setItem(ackK(n), JSON.stringify(o)); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event("lspdt:cal"));
}
/* contador del menú: eventos que me tocan, cargados por otro y que no vi desde la última vez que abrí el Calendario */
const seenK = (n: string) => "lspdt.next.calseen:" + n;
const calSeen = (n: string) => { try { return +(localStorage.getItem(seenK(n)) || 0); } catch { return 0; } };
export const calMarkSeen = (n: string) => { try { localStorage.setItem(seenK(n), String(Date.now())); } catch { /* */ } window.dispatchEvent(new Event("lspdt:cal")); };
export const calNew = (L: CalItem[], n: string) => { const s = calSeen(n), now = Date.now() - 864e5; return L.filter(e => e.t > s && e.by !== n && e.at >= now && calMine(e, n)); };

/* comunicado de la división para Discord: hora con <t:…> (cada uno la ve en su zona horaria), detalles con su formato y firma del creador */
export const ROLE_LSPD = "887963542437888004";
const ART: Record<string, string> = { "Práctica": "una práctica", "Instrucción": "una instrucción", "Reunión": "una reunión", "Evento": "un evento", "Operativo": "un operativo", "Otro": "una actividad" };
export function calText(e: Pick<CalItem, "n" | "tipo" | "at" | "cre" | "desc" | "dn"> & { pub?: boolean }, ab?: string) {
  const u = Math.floor(e.at / 1000), a = findAgent(e.cre || ""), desc = e.desc ? htmlToDc(e.desc) : "";
  return [`# 📅 ${e.n || "[Nombre del evento]"}`, "",
    `Se informa que el día <t:${u}:D> a las <t:${u}:t> (<t:${u}:R>) la **${e.dn}**${ab ? ` (${ab})` : ""} llevará a cabo ${ART[e.tipo] || "una actividad"}: **${e.n || "[nombre]"}**.`, "",
    ...(desc ? [desc, ""] : []),
    "Se solicita **puntualidad a todos los participantes**.", "Confirmar asistencia con ✅", "",
    `**${a ? a.n : e.cre || "—"}${a?.p ? ` | ${a.p}` : ""}**`, `*Creador del evento · ${e.dn}*`, "*Departamento de Policía de Los Santos*",
    ...(e.pub ? ["", `||<@&${ROLE_LSPD}>||`] : [])].join("\n").replace(/\n{3,}/g, "\n\n");
}
/* puede borrarlo: la coordinación (o la ASB) y quien lo creó o figura como creador */
export const calOwn = (e: Pick<CalEv, "by" | "cre">, n: string) => e.by === n || e.cre === n;
