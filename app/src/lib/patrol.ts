/* Revisión de patrullas: mismas claves que la versión clásica (lspdt.equip, lspdt.patrol, lspdt.patHist, lspdt.pfoto.*) */
import { LS } from "./store";
export const VEH: [string, string][] = [["stx", "Buffalo STX"], ["scout", "Scout"], ["mary", "Mary"], ["int", "Interceptor"]];
export type EqItem = { n: string; q: number };
export const EQ_DEF: EqItem[] = ([["Botiquín de primeros auxilios", 1], ["Extintor", 1], ["Conos de señalización", 4], ["Cinta de balizamiento", 1], ["Bengalas", 4], ["Chaleco reflectante", 2], ["Linterna", 1], ["Kit de alcoholemia y narcotest", 1], ["Esposas de repuesto", 2], ["Bolsas de evidencia", 5]] as [string, number][]).map(([n, q]) => ({ n, q }));
export const eqDef = () => Object.fromEntries(VEH.map(([k]) => [k, EQ_DEF.map(x => ({ ...x }))])) as Record<string, EqItem[]>;
export function getEq(): Record<string, EqItem[]> {
  const E = LS.json<Record<string, (EqItem | string)[]> | null>("lspdt.equip", null) || eqDef();
  return Object.fromEntries(VEH.map(([k]) => [k, (E[k] || []).map(x => (typeof x === "string" ? { n: x, q: 1 } : x))]));
}
export type Miss = { n: string; q: number; h: number } | string;
export type Cell = { s: "" | "ok" | "no" | "na"; m?: Miss[]; o?: string; f?: string[] };
export type PRow = { n: string; r: string; p?: string; v: Record<string, Cell> };
export type Patrol = { fecha: string; rows: PRow[]; nota?: string };
export type PHist = { id: string; fecha: string; t: number; por: { n: string; r: string }; nota: string; rows: PRow[] };
export const VST: Record<string, string> = { "": "Sin revisar", ok: "Preparado", no: "No preparado", na: "No asignado" };
export const missTxt = (m: Miss) => (typeof m === "string" ? m : `${m.n} (${m.h}/${m.q})`);
export const missOf = (c: Cell) => [...(c.m || []).map(missTxt), ...(c.o ? [c.o] : [])];
export const vcount = (rows: PRow[], s: string) => rows.reduce((n, r) => n + VEH.filter(([k]) => (r.v[k]?.s || "") === s).length, 0);
export const pfoto = (id: string) => LS.get("lspdt.pfoto." + id) || "";
export const delPhotos = (rows: PRow[]) => rows.forEach(r => VEH.forEach(([k]) => (r.v[k]?.f || []).forEach(id => LS.del("lspdt.pfoto." + id))));
export const dmy = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");
export function patReport(rec: { fecha: string; rows: PRow[]; nota?: string }, by: string) {
  let t = `REVISIÓN DE PATRULLAS — ${dmy(rec.fecha)}\nRevisado por: ${by || ""}\n`;
  for (const r of rec.rows) {
    t += `\n• ${r.r} ${r.n}${r.p ? " (#" + r.p + ")" : ""}\n`;
    for (const [k, n] of VEH) {
      const c = r.v[k] || { s: "" }; if (c.s === "na") continue;
      const miss = missOf(c), nf = (c.f || []).length;
      t += `   - ${n}: ${c.s === "ok" ? "Preparado" : c.s === "no" ? "No preparado" + (miss.length ? " — falta: " + miss.join(", ") : "") : "Sin revisar"}${nf ? ` (${nf} ${nf === 1 ? "foto" : "fotos"})` : ""}\n`;
    }
  }
  if (rec.nota) t += `\nNotas: ${rec.nota}\n`;
  return t.trim();
}
export function readImg(file: File, max: number, keepAlpha = false): Promise<string> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => { const src = String(r.result), img = new Image();
      img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); if (s === 1 && file.size < 700000) { res(src); return; }
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL(keepAlpha ? "image/png" : "image/jpeg", 0.88)); };
      img.onerror = () => res(src); img.src = src; };
    r.readAsDataURL(file);
  });
}
