/* Código penal (lspdt.penal sobre el catálogo base) e informes policiales (lspdt.informes): misma lógica y texto que la versión clásica */
import { RK_AB, findAgent, joinY, norm, rankES } from "./domain";
import { CIRC, EV_T, INF_EST, INF_FZ, INF_ROLES, INF_TIPOS, PENAL_DEF, PEN_CATS, SYN } from "@/legacy/penal";

export type Art = { a: string; t: string; d: string; c: string; k?: "cp" | "adm"; g?: string; m?: number; p?: number; pt?: number; v?: number };
export { CIRC, EV_T, INF_EST, INF_FZ, INF_ROLES, INF_TIPOS, PEN_CATS };
export const PENAL_BASE = PENAL_DEF as Art[];
export const artCmp = (x: Art, y: Art) => { const A = x.a.split(".").map(Number), B = y.a.split(".").map(Number); return A[0] - B[0] || (A[1] || 0) - (B[1] || 0) || (A[2] || 0) - (B[2] || 0); };
/* el catálogo oficial (apartado Legal) es la única fuente: lo guardado antes en lspdt.penal ya no se usa */
export function getPenal(): Art[] { return PENAL_BASE.slice(); }
export const penalOf = (a: string, P = getPenal()) => P.find(x => x.a === a);
export function penalSearch(q: string, lim = 40, P = getPenal()): Art[] {
  q = norm(q.trim()); if (!q) return P.slice().sort(artCmp).slice(0, lim);
  const S = SYN as Record<string, string[]>, words = q.split(/\s+/), ext = words.flatMap(w => { const k = Object.keys(S).find(s => w.startsWith(s.slice(0, 4))); return k ? S[k] : [w]; });
  return P.map(x => { const h = norm(x.a + " " + x.t + " " + (x.d || "") + " " + (x.c || "")); let s = 0; if (x.a.startsWith(q)) s += 10; const ht = norm(x.t);
    words.forEach(w => { if (h.includes(w)) s += 4; if (ht.includes(w)) s += 3; }); ext.forEach(w => { if (h.includes(w)) s += 1; }); return [s, x] as const; })
    .filter(([s]) => s > 0).sort((a, b) => b[0] - a[0] || artCmp(a[1], b[1])).slice(0, lim).map(x => x[1]);
}
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const loadJs = (src: string) => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("No se pudo cargar el lector de PDF")); document.head.appendChild(s); });
export async function fileText(f: File): Promise<string> {
  if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
    const w = window as unknown as { pdfjsLib?: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!w.pdfjsLib) await loadJs(PDFJS + "pdf.min.js"); w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
    const doc = await w.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; let out = "";
    for (let i = 1; i <= doc.numPages; i++) { const c = await (await doc.getPage(i)).getTextContent(); out += c.items.map((it: { str: string; hasEOL?: boolean }) => it.str + (it.hasEOL ? "\n" : "")).join("") + "\n"; }
    return out.replace(/[ \t]+\n/g, "\n").trim();
  }
  return (await f.text()).trim();
}

/* ---------- informe ---------- */
export type Charge = { a: string; m: "" | "at" | "ag" };
export type Suj = { n: string; id: string; cg: Charge[]; p?: string };
export type Unid = { n: string; r: string; u?: string; ic?: boolean };
/* el mando (Incident Commander) es una marca aparte del rol; los informes viejos lo tenían como rol */
const IC_RE = /COMMANDER|Mando del operativo/i;
export const ROLES = (INF_ROLES as string[]).filter(r => !IC_RE.test(r));
export const isIC = (u: Unid) => !!u.ic || IC_RE.test(u.r);
export const fixUnid = (u: Unid): Unid => (IC_RE.test(u.r) ? { ...u, ic: true, r: "Unidad inicial de intervención" } : u);
export type Veh = { t: string; cat?: string; mk?: string; md?: string; mo: string; co: string; mat: string; u: string; est: string; d: string; s?: string; rel?: string; rob?: "" | "si" | "no" };
export const VEH_REL = ["Propietario", "Conductor", "Propietario y conductor", "Ocupante"];
/* indicativos de radio del LSPD */
export const UNITS: string[] = ["10-MANDO-00", "10-AIRE-01", ...Array.from({ length: 20 }, (_, i) => `10-ADAM-${10 + i}`), "10-MARY-01", "10-MARY-02",
  ...["HENRY", "WILLIAM", "KING", "TOM", "ROBERT", "DAVID"].flatMap(x => [`10-${x}-01`, `10-${x}-02`]), "TAC-01", "TAC-02"];
export const VEH_T = ["Policial", "Sospechoso", "Civil", "Otro"];
export const VEH_EST = ["Sin daños", "Daños leves", "Daños graves", "Siniestro total", "Incautado", "Retenido en depósito", "Devuelto al propietario", "Abandonado / fugado"];
/* secciones que se pueden sacar del informe */
export const INF_SECS: [string, string][] = [["motivo", "Motivo"], ["hechos", "Hechos"], ["unid", "Unidades"], ["suj", "Sujetos"], ["veh", "Vehículos"], ["fz", "Uso de la fuerza"], ["ev", "Evidencia"], ["cg", "Cargos"], ["proc", "Detención y procesamiento"]];
export type Ev = { s: string; t: string; cat?: string; mk?: string; md?: string; mo?: string; co?: string; mat?: string; d?: string };
export type Inf = { fecha: string; hora: string; ui: string; ux: string; uf: string; tipos: string[]; est: string; motivo: string; hechos: string; unid: Unid[]; suj: Suj[]; fz: string; fzd: string; ev: Ev[]; veh?: Veh[]; off?: string[]; extra: string; id: string; por?: string; t?: number; texto?: string; edit?: string; et?: number };
export const SEP = "━━━━━━━━━━━━━━━━━━━━━━━";
const rkAb = (r: string) => RK_AB[r] || rankES(r);
export const agTag = (n: string) => { const a = findAgent(n); return a ? `${rkAb(a.r)} ${a.n}${a.p ? ` [${a.p}]` : ""}` : n; };
const modTxt = (m?: string) => (m === "at" ? "atenuado" : m === "ag" ? "agravado" : "");
const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
const pad = (n: number) => String(n).padStart(2, "0");
export const infNew = (me?: string): Inf => { const d = new Date(); return { fecha: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`, ui: "", ux: "", uf: "Comisaría de Mission Row", tipos: [], est: "Incidente finalizado", motivo: "", hechos: "",
  unid: me ? [{ n: me, r: "Unidad de apoyo" }] : [], suj: [{ n: "", id: "", cg: [] }], fz: "N/A", fzd: "", ev: [], veh: [], off: [], extra: "", id: "" }; };

export const unitTag = (u: Unid) => (u.n ? agTag(u.n) + (u.u ? ` (${u.u})` : "") : u.u || "");
export function infText(A: Inf, me: string, P = getPenal()) {
  const red = me ? agTag(A.por || me) : "—", S = A.suj.filter(s => s.n.trim()), L: string[] = [], p = (...x: string[]) => L.push(...x);
  const on = (k: string) => !(A.off || []).includes(k), sec = (t: string) => p("", SEP, `**${t}**`, "");
  const tt = (a: string) => penalOf(a, P)?.t || "[artículo]";
  p(`| Informe redactado por ${A.por ? agTag(A.por) : red}`, "", SEP, "**INFORMACIÓN DEL INCIDENTE**", "", `**Fecha:** ${A.fecha || "—"}`, `**Hora:** ${A.hora || "—"}`, `**Ubicación inicial:** ${A.ui || "—"}`);
  if (A.ux) p(`**Ubicación de interceptación:** ${A.ux}`);
  p(`**Ubicación final:** ${A.uf || "—"}`, `**Tipo de incidente:** ${A.tipos.length ? A.tipos.join(" — ") : "—"}`, `**Estado:** ${A.est}`);
  if (on("motivo")) { sec("MOTIVO DE LA INTERVENCIÓN"); p((A.motivo || "—").trim()); }
  if (on("hechos")) { sec("DESCRIPCIÓN DE LOS HECHOS"); p((A.hechos || "—").trim()); }
  const rdN = A.por || me;
  if (on("unid")) { sec("UNIDADES INTERVINIENTES");
    /* mismo orden que en el formulario (se reordena arrastrando) */
    A.unid.map(fixUnid).filter(u => u.n || u.u).forEach(u => p(`- ${unitTag(u)} — ${u.r.replace(/\.$/, "")}${u.ic ? " · **Incident Commander**" : ""}${u.n && u.n === rdN ? " y agente redactor del informe" : ""}.`));
    if (rdN && !A.unid.some(u => u.n === rdN)) p(`- ${agTag(rdN)} — Agente redactor del informe.`); }
  if (on("suj")) { sec(plural(S.length, "SUJETO IMPLICADO", "SUJETOS IMPLICADOS"));
    if (!S.length) p("—");
    S.forEach(s => { const mods = [...new Set(s.cg.map(c => c.m || ""))], same = mods.length === 1;
      const cg = s.cg.map(c => `${c.a} — ${tt(c.a)}${!same && c.m ? ` (${modTxt(c.m)})` : ""}`);
      const suf = same && mods[0] ? `, ${cg.length === 1 ? "" : cg.length === 2 ? "ambos " : "todos "}con carácter ${modTxt(mods[0])}` : "";
      p(`${s.n}${s.id ? ` | ID: ${s.id}` : ""}${cg.length ? ` | Procesado por ${plural(cg.length, "el artículo", "los artículos")} ${joinY(cg)}${suf}` : ""}${s.p ? ` | Agente que lo procesa: ${agTag(s.p)}` : ""}.`); }); }
  const VS = (A.veh || []).filter(v => v.mo || v.mat || v.u);
  if (on("veh") && VS.length) { sec(plural(VS.length, "VEHÍCULO IMPLICADO", "VEHÍCULOS IMPLICADOS"));
    VS.forEach(v => { p(`- **${v.t}:** ${v.mo || "—"}${v.cat && !(v.cat === "Policial" && v.t === "Policial") ? ` (${v.cat})` : ""}${v.u ? ` (${v.u})` : ""}${v.s ? ` · ${v.rel || "Vinculado a"}: ${v.s}` : ""}${v.rob ? ` · Robado: ${v.rob === "si" ? "Sí" : "No"}` : ""}${v.co ? ` · Color: ${v.co}` : ""}${v.mat ? ` · Matrícula: ${v.mat}` : ""}${v.est ? ` — ${v.est}` : ""}.`); if (v.d.trim()) p(`  ${v.d.trim()}`); }); }
  if (on("fz")) { sec("USO DE LA FUERZA"); p(A.fz || "N/A", "");
    p(A.fz === "N/A" && !A.fzd.trim() ? "No ha sido necesario el uso de la fuerza durante la intervención policial." : (A.fzd || "").trim()); }
  if (on("ev")) { sec("EVIDENCIA INCAUTADA");
    const evs = A.ev.filter(e => e.d || e.mo || e.mat); if (!evs.length) p("Sin evidencia incautada.");
    const bySuj: Record<string, Ev[]> = {}; evs.forEach(e => { (bySuj[e.s || ""] = bySuj[e.s || ""] || []).push(e); });
    Object.entries(bySuj).forEach(([sn, l]) => { const s = S.find(x => x.n === sn); if (sn) p(`**${sn}${s && s.id ? ` — ID: ${s.id}` : ""}**${s?.p ? ` · incautado por ${agTag(s.p)}` : ""}`);
      l.forEach(e => { if (e.t === "Vehículo") { p(`- Vehículo: ${e.mo || "—"}${e.cat ? ` (${e.cat})` : ""}.`); if (e.co) p(`- Color: ${e.co}.`); if (e.mat) p(`- Matrícula: ${e.mat}.`); if (e.d) p("", e.d.trim()); } else p(`- ${e.t}: ${(e.d || "—").replace(/\.$/, "")}.`); }); p(""); }); }
  if (on("cg")) { sec("CARGOS APLICADOS");
    S.forEach(s => { if (!s.cg.length) return; p(`**${s.n}${s.id ? ` — ID: ${s.id}` : ""}**`); const mods = [...new Set(s.cg.map(c => c.m || ""))], same = mods.length === 1 && mods[0];
      if (same) p(`Los siguientes cargos se aplican con carácter ${modTxt(mods[0])}:`);
      s.cg.forEach(c => p(`- Artículo ${c.a} — ${tt(c.a)}${!same && c.m ? ` (${modTxt(c.m)})` : ""}.`)); p(""); });
    if (!S.some(s => s.cg.length)) p("Sin cargos aplicados."); }
  if (on("proc")) { sec("DETENCIÓN Y PROCESAMIENTO"); p(infProc(A, S, tt)); if ((A.extra || "").trim()) p("", A.extra.trim()); }
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function infProc(A: Inf, S: Suj[], tt: (a: string) => string) {
  const det = S.filter(s => s.n); if (!det.length) return "Sin detenidos.";
  const pl = det.length > 1, who = det.map(s => `${s.n}${s.id ? `, con ID ${s.id},` : ""}`);
  const U = A.unid.map(fixUnid).filter(u => u.n || u.u), ic = U.find(u => u.ic), rest = U.filter(u => u !== ic);
  let t = `${pl ? "Los sospechosos, identificados como" : "El sospechoso, identificado como"} ${joinY(who)} ${pl ? "son detenidos" : "es detenido"}${A.ux ? ` en las inmediaciones de ${A.ux}` : ""}${A.tipos.includes("Persecución policial") ? " tras una persecución policial" : ""}${A.ui ? ` iniciada en ${A.ui}` : ""}.`;
  const el = (u: Unid) => (u.n ? "el " + unitTag(u) : "la unidad " + u.u), ini = rest.filter(u => /inicial/i.test(u.r)), apo = rest.filter(u => !/inicial/i.test(u.r)), pz: string[] = [];
  if (ini.length) pz.push(`la intervención inicial d${joinY(ini.map(el))}`);
  if (apo.length) pz.push(`${ini.length ? "la posterior incorporación" : "la intervención"} de ${apo.length > 1 ? "las unidades de apoyo formadas por" : "la unidad de apoyo formada por"} ${joinY(apo.map(el))}`);
  const icRol = !ic ? "" : /inicial/i.test(ic.r) ? ", que formó parte de la intervención inicial" : /apoyo/i.test(ic.r) ? ", que acudió como unidad de apoyo" : ic.r ? `, que actuó como ${ic.r.replace(/\s*\(.*\)$/, "").toLowerCase()}` : "";
  if (ic) t += `\n\nEl operativo estuvo bajo el mando ${ic.n ? "del " + unitTag(ic) : "de la unidad " + ic.u}${icRol}${pz.length ? `, con ${joinY(pz)}` : ""}.`;
  else if (pz.length) t += `\n\nEl operativo contó con ${joinY(pz)}.`;
  const cg = det.flatMap(s => s.cg);
  t += `\n\n${pl ? "Una vez detenidos, fueron trasladados" : "Una vez detenido, fue trasladado"} a ${A.uf ? (/^(comisar|estaci|prisi|c[aá]rcel|central|jefatura)/i.test(A.uf) ? "la " : "") + A.uf : "la comisaría"}, donde ${pl ? "quedaron" : "quedó"} bajo custodia${cg.length ? ` y ${pl ? "fueron procesados" : "fue procesado"} por los siguientes artículos:` : "."}`;
  const ms = [...new Set(cg.map(c => c.m || ""))]; if (cg.length && ms.length === 1 && ms[0]) t = t.replace(/:$/, `, ${cg.length === 1 ? "aplicado" : cg.length === 2 ? "ambos aplicados" : "todos aplicados"} con carácter ${modTxt(ms[0])}:`);
  if (cg.length) det.forEach(s => s.cg.forEach(c => { t += `\n- Artículo ${c.a} — ${tt(c.a)}${c.m && !(ms.length === 1) ? ` (${modTxt(c.m)})` : ""}${pl ? ` · ${s.n}` : ""}.`; }));
  const pr = det.filter(s => s.p);
  if (pr.length) t += "\n\n" + (pr.length === 1 && !pl ? `El procesamiento lo realizó el ${agTag(pr[0].p!)}.` : pr.map(s => `${s.n} fue procesado por el ${agTag(s.p!)}.`).join(" "));
  if (A.est === "Incidente finalizado") t += `\n\nConcluidas las actuaciones policiales, el incidente queda finalizado con ${pl ? "los detenidos" : "el detenido"} bajo custodia.`;
  return t;
}
export const isDMYValid = (s: string) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (!m) return false; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 && d.getDate() === +m[1]; };
export function infErrs(A: Inf) {
  const e: string[] = []; if (!isDMYValid(A.fecha)) e.push("fecha (dd/mm/aaaa)"); if (!/^\d{1,2}:\d{2}$/.test(A.hora)) e.push("hora (hh:mm)");
  const on = (k: string) => !(A.off || []).includes(k);
  if (!A.ui.trim()) e.push("ubicación inicial"); if (!A.tipos.length) e.push("tipo de incidente"); if (on("motivo") && !A.motivo.trim()) e.push("motivo de la intervención");
  if (on("hechos") && !A.hechos.trim()) e.push("descripción de los hechos"); if (on("unid") && !A.unid.some(u => u.n || u.u)) e.push("unidades intervinientes");
  if (on("veh") && (A.veh || []).some(v => v.t !== "Policial" && (v.mo || v.mat) && !v.rob)) e.push("si el vehículo es robado o no"); return e;
}
/* Discord admite 2000 caracteres por mensaje */
export function dcParts(s: string) {
  const out: string[] = []; let cur = "";
  for (const blk of s.split(/\n(?=## |\*\*\d\. )/)) { const b = (cur ? "\n" : "") + blk; if ((cur + b).length > 1950 && cur) { out.push(cur); cur = blk; } else cur += b; }
  if (cur) out.push(cur); return out.flatMap(p => (p.length <= 1990 ? [p] : p.match(/[\s\S]{1,1990}/g) || []));
}
