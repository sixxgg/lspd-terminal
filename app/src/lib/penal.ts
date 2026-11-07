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
export type Suj = { n: string; id: string; cg: Charge[] };
export type Unid = { n: string; r: string };
export type Ev = { s: string; t: string; mo?: string; co?: string; mat?: string; d?: string };
export type Inf = { fecha: string; hora: string; ui: string; ux: string; uf: string; tipos: string[]; est: string; motivo: string; hechos: string; unid: Unid[]; suj: Suj[]; fz: string; fzd: string; ev: Ev[]; extra: string; id: string; por?: string; t?: number; texto?: string; edit?: string };
export const SEP = "━━━━━━━━━━━━━━━━━━━━━━━";
const rkAb = (r: string) => RK_AB[r] || rankES(r);
export const agTag = (n: string) => { const a = findAgent(n); return a ? `${rkAb(a.r)} ${a.n}${a.p ? ` [${a.p}]` : ""}` : n; };
const modTxt = (m?: string) => (m === "at" ? "atenuado" : m === "ag" ? "agravado" : "");
const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
const pad = (n: number) => String(n).padStart(2, "0");
export const infNew = (me?: string): Inf => { const d = new Date(); return { fecha: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`, ui: "", ux: "", uf: "Comisaría de Mission Row", tipos: [], est: "Incidente finalizado", motivo: "", hechos: "",
  unid: me ? [{ n: me, r: "Unidad de apoyo" }] : [], suj: [{ n: "", id: "", cg: [] }], fz: "N/A", fzd: "", ev: [], extra: "", id: "" }; };

export function infText(A: Inf, me: string, P = getPenal()) {
  const red = me ? agTag(A.por || me) : "—", S = A.suj.filter(s => s.n.trim()), L: string[] = [], p = (...x: string[]) => L.push(...x);
  const tt = (a: string) => penalOf(a, P)?.t || "[artículo]";
  p(`| Informe redactado por ${A.por ? agTag(A.por) : red}`, "", SEP, "**INFORMACIÓN DEL INCIDENTE**", "", `**Fecha:** ${A.fecha || "—"}`, `**Hora:** ${A.hora || "—"}`, `**Ubicación inicial:** ${A.ui || "—"}`);
  if (A.ux) p(`**Ubicación de interceptación:** ${A.ux}`);
  p(`**Ubicación final:** ${A.uf || "—"}`, `**Tipo de incidente:** ${A.tipos.length ? A.tipos.join(" — ") : "—"}`, `**Estado:** ${A.est}`, "", SEP,
    "**MOTIVO DE LA INTERVENCIÓN**", "", (A.motivo || "—").trim(), "", SEP, "**DESCRIPCIÓN DE LOS HECHOS**", "", (A.hechos || "—").trim(), "", SEP, "**UNIDADES INTERVINIENTES**", "");
  const rdN = A.por || me, ro = (u: Unid) => { const i = (INF_ROLES as string[]).indexOf(u.r); return (i < 0 ? 9 : i) * 2 + (u.n === rdN ? 1 : 0); };
  A.unid.filter(u => u.n).sort((a, b) => ro(a) - ro(b)).forEach(u => p(`- ${agTag(u.n)} — ${u.r.replace(/\.$/, "")}${u.n === rdN ? " y agente redactor del informe" : ""}.`));
  if (rdN && !A.unid.some(u => u.n === rdN)) p(`- ${agTag(rdN)} — Agente redactor del informe.`);
  p("", SEP, `**${plural(S.length, "SUJETO IMPLICADO", "SUJETOS IMPLICADOS")}**`, "");
  if (!S.length) p("—");
  S.forEach(s => { const mods = [...new Set(s.cg.map(c => c.m || ""))], same = mods.length === 1;
    const cg = s.cg.map(c => `${c.a} — ${tt(c.a)}${!same && c.m ? ` (${modTxt(c.m)})` : ""}`);
    const suf = same && mods[0] ? `, ${cg.length === 1 ? "" : cg.length === 2 ? "ambos " : "todos "}con carácter ${modTxt(mods[0])}` : "";
    p(`${s.n}${s.id ? ` | ID: ${s.id}` : ""}${cg.length ? ` | Procesado por ${plural(cg.length, "el artículo", "los artículos")} ${joinY(cg)}${suf}` : ""}.`); });
  p("", SEP, "**USO DE LA FUERZA**", "", A.fz || "N/A", "");
  p(A.fz === "N/A" && !A.fzd.trim() ? "No ha sido necesario el uso de la fuerza durante la intervención policial." : (A.fzd || "").trim());
  p("", SEP, "**EVIDENCIA INCAUTADA**", "");
  const evs = A.ev.filter(e => e.d || e.mo || e.mat); if (!evs.length) p("Sin evidencia incautada.");
  const bySuj: Record<string, Ev[]> = {}; evs.forEach(e => { (bySuj[e.s || ""] = bySuj[e.s || ""] || []).push(e); });
  Object.entries(bySuj).forEach(([sn, l]) => { const s = S.find(x => x.n === sn); if (sn) p(`**${sn}${s && s.id ? ` — ID: ${s.id}` : ""}**`);
    l.forEach(e => { if (e.t === "Vehículo") { p(`- Vehículo: ${e.mo || "—"}.`); if (e.co) p(`- Color: ${e.co}.`); if (e.mat) p(`- Matrícula: ${e.mat}.`); if (e.d) p("", e.d.trim()); } else p(`- ${e.t}: ${(e.d || "—").replace(/\.$/, "")}.`); }); p(""); });
  p(SEP, "**CARGOS APLICADOS**", "");
  S.forEach(s => { if (!s.cg.length) return; p(`**${s.n}${s.id ? ` — ID: ${s.id}` : ""}**`); const mods = [...new Set(s.cg.map(c => c.m || ""))], same = mods.length === 1 && mods[0];
    if (same) p(`Los siguientes cargos se aplican con carácter ${modTxt(mods[0])}:`);
    s.cg.forEach(c => p(`- Artículo ${c.a} — ${tt(c.a)}${!same && c.m ? ` (${modTxt(c.m)})` : ""}.`)); p(""); });
  if (!S.some(s => s.cg.length)) p("Sin cargos aplicados.", "");
  p(SEP, "**DETENCIÓN Y PROCESAMIENTO**", "", infProc(A, S, tt));
  if ((A.extra || "").trim()) p("", A.extra.trim());
  return L.join("\n").replace(/\n{3,}/g, "\n\n");
}
function infProc(A: Inf, S: Suj[], tt: (a: string) => string) {
  const det = S.filter(s => s.n); if (!det.length) return "Sin detenidos.";
  const pl = det.length > 1, who = det.map(s => `${s.n}${s.id ? `, con ID ${s.id},` : ""}`);
  const ic = A.unid.find(u => /COMMANDER|Mando/i.test(u.r)), rest = A.unid.filter(u => u !== ic && u.n);
  let t = `${pl ? "Los sospechosos, identificados como" : "El sospechoso, identificado como"} ${joinY(who)} ${pl ? "son detenidos" : "es detenido"}${A.ux ? ` en las inmediaciones de ${A.ux}` : ""}${A.tipos.includes("Persecución policial") ? " tras una persecución policial" : ""}${A.ui ? ` iniciada en ${A.ui}` : ""}.`;
  const el = (u: Unid) => "el " + agTag(u.n), ini = rest.filter(u => /inicial/i.test(u.r)), apo = rest.filter(u => !/inicial/i.test(u.r)), pz: string[] = [];
  if (ini.length) pz.push(`la intervención inicial d${joinY(ini.map(el))}`);
  if (apo.length) pz.push(`${ini.length ? "la posterior incorporación" : "la intervención"} de ${apo.length > 1 ? "las unidades de apoyo formadas por" : "la unidad de apoyo formada por"} ${joinY(apo.map(el))}`);
  if (ic) t += `\n\nEl operativo estuvo bajo el mando del ${agTag(ic.n)}${pz.length ? `, con ${joinY(pz)}` : ""}.`;
  else if (pz.length) t += `\n\nEl operativo contó con ${joinY(pz)}.`;
  const cg = det.flatMap(s => s.cg);
  t += `\n\n${pl ? "Una vez detenidos, fueron trasladados" : "Una vez detenido, fue trasladado"} a ${A.uf ? (/^(comisar|estaci|prisi|c[aá]rcel|central|jefatura)/i.test(A.uf) ? "la " : "") + A.uf : "la comisaría"}, donde ${pl ? "quedaron" : "quedó"} bajo custodia${cg.length ? ` y ${pl ? "fueron procesados" : "fue procesado"} por los siguientes artículos:` : "."}`;
  const ms = [...new Set(cg.map(c => c.m || ""))]; if (cg.length && ms.length === 1 && ms[0]) t = t.replace(/:$/, `, ${cg.length === 1 ? "aplicado" : cg.length === 2 ? "ambos aplicados" : "todos aplicados"} con carácter ${modTxt(ms[0])}:`);
  if (cg.length) det.forEach(s => s.cg.forEach(c => { t += `\n- Artículo ${c.a} — ${tt(c.a)}${c.m && !(ms.length === 1) ? ` (${modTxt(c.m)})` : ""}${pl ? ` · ${s.n}` : ""}.`; }));
  if (A.est === "Incidente finalizado") t += `\n\nConcluidas las actuaciones policiales, el incidente queda finalizado con ${pl ? "los detenidos" : "el detenido"} bajo custodia.`;
  return t;
}
export const isDMYValid = (s: string) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (!m) return false; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 && d.getDate() === +m[1]; };
export function infErrs(A: Inf) {
  const e: string[] = []; if (!isDMYValid(A.fecha)) e.push("fecha (dd/mm/aaaa)"); if (!/^\d{1,2}:\d{2}$/.test(A.hora)) e.push("hora (hh:mm)");
  if (!A.ui.trim()) e.push("ubicación inicial"); if (!A.tipos.length) e.push("tipo de incidente"); if (!A.motivo.trim()) e.push("motivo de la intervención");
  if (!A.hechos.trim()) e.push("descripción de los hechos"); if (!A.unid.some(u => u.n)) e.push("unidades intervinientes"); return e;
}
/* Discord admite 2000 caracteres por mensaje */
export function dcParts(s: string) {
  const out: string[] = []; let cur = "";
  for (const blk of s.split(/\n(?=## |\*\*\d\. )/)) { const b = (cur ? "\n" : "") + blk; if ((cur + b).length > 1950 && cur) { out.push(cur); cur = blk; } else cur += b; }
  if (cur) out.push(cur); return out.flatMap(p => (p.length <= 1990 ? [p] : p.match(/[\s\S]{1,1990}/g) || []));
}
