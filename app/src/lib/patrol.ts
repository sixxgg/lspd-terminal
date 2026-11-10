/* Revisión de patrullas: lspdt.equip2 (checklist del maletero), lspdt.patrol, lspdt.patHist, lspdt.pfoto.* */
import { LS } from "./store";
import { PATROL_CARS } from "./onx";
/* VEH: los 4 vehículos fijos de antes (siguen sirviendo para leer revisiones viejas y la planilla de Google).
   Ahora cada agente lleva los patrullas ONX que se le revisaron: r.v = { [spawn]: Cell } */
export const VEH: [string, string][] = [["stx", "Buffalo STX"], ["scout", "Scout"], ["mary", "Mary"], ["int", "Interceptor"]];
export { PATROL_CARS };
export const vName = (k: string) => VEH.find(v => v[0] === k)?.[1] || PATROL_CARS.find(v => v[0] === k)?.[1] || k;
export const vehOf = (r: PRow) => Object.keys(r.v);
export type EqItem = { n: string; q: number };
export const EQ_DEF: EqItem[] = ([["Esposas", 2], ["Chalecos", 2], ["Radios", 2], ["Barreras", 10], ["Pinchos", 10], ["Conos", 10],
  ["Escopeta reglamentaria + x8 cartuchos de escopeta", 1], ["Cartuchos de escopeta extra", 16], ["Pistola de bengalas + x1 cartucho de bengala", 1], ["Cartuchos de bengala extra", 2],
  ["Cargadores de pistola de combate", 6], ["Bolsas de evidencias", 5], ["Alcoholímetro", 1], ["Kit de huellas", 1], ["Botiquín", 1], ["Kit IFAK", 1], ["GSR", 5]] as [string, number][]).map(([n, q]) => ({ n, q }));
export const EQ_KEY = "lspdt.equip2";
/* el equipamiento es uno solo para todos los patrullas (clave "*"); las listas viejas por vehículo se respetan si existían */
export const eqDef = () => ({ "*": EQ_DEF.map(x => ({ ...x })) }) as Record<string, EqItem[]>;
const fixEq = (l?: (EqItem | string)[]) => (l || []).map(x => (typeof x === "string" ? { n: x, q: 1 } : x));
export function eqAll(): EqItem[] { const E = LS.ro<Record<string, (EqItem | string)[]> | null>(EQ_KEY, null); return E ? fixEq(E["*"] || E.stx) : EQ_DEF.map(x => ({ ...x })); }
export function eqFor(k: string): EqItem[] { const E = LS.ro<Record<string, (EqItem | string)[]> | null>(EQ_KEY, null); return E && E[k] && !E["*"] ? fixEq(E[k]) : eqAll(); }
export type Miss = { n: string; q: number; h: number; o?: string } | string;
export type Cell = { s: "" | "ok" | "no" | "na"; m?: Miss[]; o?: string; f?: string[]; io?: Record<string, string>; ck?: boolean; by?: string };
export type PRow = { n: string; r: string; p?: string; v: Record<string, Cell> };
export type Patrol = { fecha: string; rows: PRow[]; nota?: string };
export type PHist = { id: string; fecha: string; t: number; por: { n: string; r: string }; nota: string; rows: PRow[] };
export const VST: Record<string, string> = { "": "Sin revisar", ok: "Preparado", no: "No preparado", na: "No asignado" };
export const missTxt = (m: Miss) => (typeof m === "string" ? m : `${m.n} (${m.h}/${m.q}, faltan ${m.q - m.h})${m.o ? ` [${m.o}]` : ""}`);
export const missOf = (c: Cell) => [...(c.m || []).map(missTxt), ...(c.o ? [c.o] : [])];
export const vcount = (rows: PRow[], s: string) => rows.reduce((n, r) => n + vehOf(r).filter(k => (r.v[k]?.s || "") === s).length, 0);
export const pfoto = (id: string) => LS.get("lspdt.pfoto." + id) || "";
export const delPhotos = (rows: PRow[]) => rows.forEach(r => vehOf(r).forEach(k => (r.v[k]?.f || []).forEach(id => LS.del("lspdt.pfoto." + id))));
export const dmy = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");
export function patReport(rec: { fecha: string; rows: PRow[]; nota?: string }, by: string) {
  let t = `REVISIÓN DE PATRULLAS — ${dmy(rec.fecha)}\nRevisado por: ${by || ""}\n`;
  for (const r of rec.rows) {
    t += `\n• ${r.r} ${r.n}${r.p ? " (#" + r.p + ")" : ""}\n`;
    if (!vehOf(r).length) t += "   - Sin vehículos revisados\n";
    for (const k of vehOf(r)) {
      const c = r.v[k] || { s: "" }, n = vName(k); if (c.s === "na") continue;
      const miss = missOf(c), nf = (c.f || []).length;
      t += `   - ${n}: ${c.s === "ok" ? "Preparado" : c.s === "no" ? "No preparado" + (miss.length ? " — falta: " + miss.join(", ") : "") : "Sin revisar"}${nf ? ` (${nf} ${nf === 1 ? "foto" : "fotos"})` : ""}\n`;
    }
  }
  if (rec.nota) t += `\nNotas: ${rec.nota}\n`;
  return t.trim();
}
/* límite del servidor: 3 MB por imagen. Se achica y comprime sola hasta entrar (y nunca se sube algo que el servidor rechace) */
export const IMG_MAX_BYTES = 2.8e6;
const b64Size = (d: string) => Math.round((d.length - d.indexOf(",") - 1) * 0.75);
export function readImg(file: File, max: number, keepAlpha = false): Promise<string> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => { const src = String(r.result), img = new Image();
      img.onload = () => {
        let s = Math.min(1, max / Math.max(img.width, img.height)); if (s === 1 && file.size < 700000) { res(src); return; }
        const type = keepAlpha ? "image/webp" : "image/jpeg"; let q = 0.88, out = src;
        for (let i = 0; i < 8; i++) {
          const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
          c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); out = c.toDataURL(type, q);
          if (!out.startsWith("data:" + type)) out = c.toDataURL("image/png"); /* navegador sin WebP */
          if (b64Size(out) <= IMG_MAX_BYTES) break;
          q = Math.max(0.6, q - 0.08); s *= 0.85;
        }
        res(out); };
      img.onerror = () => res(src); img.src = src; };
    r.readAsDataURL(file);
  });
}

/* ---------- planilla de Google Sheets (registro de patrullas) ---------- */
export const SHEET_DEF = "https://docs.google.com/spreadsheets/d/1-jDI6k8kXlPVn5ByjNgJ_yIQ3oaFc5dI_krERNj-Msc/edit?gid=0#gid=0";
export const sheetUrl = () => LS.get("lspdt.sheet") || SHEET_DEF;
export function parseCSV(t: string) {
  t = t.replace(/^﻿/, ""); const rows: string[][] = []; let row: string[] = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c; }
  if (f || row.length) { row.push(f); rows.push(row); } return rows;
}
export type SCell = { s: "" | "ok" | "no" | "na" | "?"; raw: string };
export type SRow = { n: string; r: string; p: string; m?: boolean; v: Record<string, SCell> };
const nrm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const SH_ST = (v: string): SCell["s"] => { const s = nrm(v).trim(); if (!s) return ""; if (/^no ?prep|falta|^no$/.test(s)) return "no"; if (/^prep|^ok|^si$|completo/.test(s)) return "ok"; if (/asign|n\/a|^na$|^-$/.test(s)) return "na"; return "?"; };
export function parseSheet(csv: string): SRow[] {
  const rows = parseCSV(csv).filter(r => r.some(c => String(c).trim())); if (!rows.length) return [];
  const h = rows[0].map(x => nrm(x).trim()), ix = (re: RegExp) => h.findIndex(x => re.test(x));
  const iN = ix(/^agente|^nombre|^oficial/), iR = ix(/^rango/), iP = ix(/placa/);
  const RX: Record<string, RegExp> = { stx: /stx|buffalo/, scout: /scout/, mary: /mary/, int: /interceptor|^inter/ };
  const V = VEH.map(([k, l]) => [k, ix(RX[k] || new RegExp(nrm(l)))] as const);
  return rows.slice(1).filter(r => (r[iN] || "").trim()).map(r => ({ n: (r[iN] || "").trim(), r: iR >= 0 ? (r[iR] || "").trim() : "", p: iP >= 0 ? (r[iP] || "").trim() : "",
    v: Object.fromEntries(V.map(([k, i]) => { const raw = i >= 0 ? (r[i] || "").trim() : ""; return [k, { s: SH_ST(raw), raw }]; })) }));
}
