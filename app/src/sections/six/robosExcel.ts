/* Excel de robos (se carga solo al exportar): hoja «Robos» con cada robo explicado, hoja «Articulado» con los artículos
   de cada robo (tentativa, consumado, con disparos y según lo que pase) y, opcional, hoja «Artículos» con el texto y la pena. */
import ExcelJS from "exceljs";
import { CATS, perfilDe, type Cat, type Item } from "./robosData";
import { recOf, unidades } from "./Robos";
import { art, leyOf, type Ref } from "./robosLegal";

const ARGB = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();
/* color más claro (mezclado con blanco): Excel no usa la transparencia */
const tint = (hex: string, k = 0.8) => "FF" + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) + (255 - parseInt(hex.slice(i, i + 2), 16)) * k).toString(16).padStart(2, "0")).join("").toUpperCase();
const DARK = "#0B1220", HEAD = "#1E293B", LINE = "#CBD5E1";
const yn = (v?: boolean | null) => (v == null ? "—" : v ? "Sí" : "No");
const PVL = ["Patrulla", "Interceptor", "Helicóptero", "Barco"];
const refTxt = (L: Ref[]) => L.map(r => `${r.a} · ${art(r.a)?.t || ""}${r.why ? ` (${r.why})` : ""}`).join("\n");

function title(ws: ExcelJS.Worksheet, cols: number, t: string, sub: string) {
  ws.mergeCells(1, 1, 1, cols); ws.mergeCells(2, 1, 2, cols);
  const a = ws.getCell(1, 1), b = ws.getCell(2, 1);
  a.value = t; a.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFFFF" } }; a.alignment = { vertical: "middle", indent: 1 };
  b.value = sub; b.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FFCBD5E1" } }; b.alignment = { vertical: "middle", indent: 1, wrapText: true };
  for (let c = 1; c <= cols; c++) { ws.getCell(1, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB(DARK) } }; ws.getCell(2, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB(DARK) } }; }
  ws.getRow(1).height = 34; ws.getRow(2).height = 30;
}
function header(ws: ExcelJS.Worksheet, row: number, names: string[]) {
  const r = ws.getRow(row); r.values = names; r.height = 30;
  r.eachCell(c => { c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10.5 }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB(HEAD) } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; c.border = { bottom: { style: "medium", color: { argb: "FF64748B" } } }; });
  ws.views = [{ state: "frozen", ySplit: row, xSplit: 2 }];
}
function section(ws: ExcelJS.Worksheet, cols: number, k: Cat, n: number) {
  const r = ws.addRow([`${CATS[k].l}${CATS[k].code ? ` · código ${CATS[k].code}` : ""}  —  ${CATS[k].d}  (${n})`]);
  ws.mergeCells(r.number, 1, r.number, cols); r.height = 24;
  const c = r.getCell(1); c.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } }; c.alignment = { vertical: "middle", indent: 1 };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB(CATS[k].c) } };
}
function body(r: ExcelJS.Row, k: Cat, zebra: boolean) {
  r.alignment = { vertical: "top", wrapText: true };
  r.eachCell({ includeEmpty: true }, c => {
    c.border = { top: { style: "thin", color: { argb: ARGB(LINE) } }, bottom: { style: "thin", color: { argb: ARGB(LINE) } }, left: { style: "thin", color: { argb: ARGB(LINE) } }, right: { style: "thin", color: { argb: ARGB(LINE) } } };
    if (zebra) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  });
  r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: tint(CATS[k].c) } }; r.getCell(1).font = { bold: true, color: { argb: ARGB(CATS[k].c) }, size: 9.5 };
  r.getCell(2).font = { bold: true };
}
/* alto aproximado según el texto más largo de la fila */
const fit = (r: ExcelJS.Row, widths: number[]) => { let lines = 1; r.eachCell((c, i) => { const s = String(c.value ?? ""); const w = widths[i - 1] || 20; lines = Math.max(lines, s.split("\n").reduce((t, l) => t + Math.max(1, Math.ceil(l.length / (w * 1.1))), 0)); }); r.height = Math.min(400, 15 * lines + 6); };

export async function robosXlsx(items: Item[], o: { obs: boolean; desc: boolean }) {
  const wb = new ExcelJS.Workbook(); wb.creator = "Terminal LSPD · six"; wb.created = new Date();
  const hoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const cats = (Object.keys(CATS) as Cat[]).filter(k => items.some(x => x.cat === k));

  /* ---- hoja 1: robos ---- */
  const H1 = ["Tipo", "Robo", "Atracadores", "Policías máx.", "Unidades policiales", "Rehenes", "Bloqueo", "Vehículo de los atracadores", "Armas de los atracadores", "La policía puede llevar", "Dinero", "También da", "Misiones de la planilla", ...(o.obs ? ["Observaciones"] : [])];
  const W1 = [16, 30, 12, 11, 20, 18, 9, 22, 34, 24, 16, 22, 40, ...(o.obs ? [48] : [])];
  const s1 = wb.addWorksheet("Robos", { properties: { tabColor: { argb: "FF0EA5E9" } } });
  title(s1, H1.length, "Catálogo de robos · Eleven Project", `Exportado el ${hoy} desde la Terminal LSPD. Vigente: el Excel de misiones manda sobre la normativa vieja. Policías máx. = atracadores máx. + 2 (binomios de 2 y una unión si sobra uno).`);
  s1.addRow([]); header(s1, 4, H1); s1.columns.forEach((c, i) => { c.width = W1[i]; });
  for (const k of cats) {
    const L = items.filter(x => x.cat === k); section(s1, H1.length, k, L.length);
    L.forEach((it, i) => {
      const R = recOf(it.mis), perf = [...new Set(it.mis.map(perfilDe).filter(Boolean))];
      const r = s1.addRow([CATS[k].l, it.n + (perf.length ? `\n(banda de ${perf.join(" / ")})` : "") + (it.nuevo && k !== "mis" ? "\n[NUEVO]" : ""),
        it.min != null && it.max != null && it.min < it.max ? `${it.min} a ${it.max}` : it.max ?? "—", it.pol ?? "—", unidades(it.pol) || "—", it.reh || "—", yn(it.blq), it.ilg || "—",
        (it.arm || "—").replace(/ · /g, "\n"), [...PVL.filter((_, j) => it.pv?.[j]), ...(it.mando ? ["Con mando"] : [])].join(", ") || "—",
        R.money || (R.pend ? "A definir" : "—"), R.extra.join("\n") || "—", it.mis.map(m => `${m.n} (fila ${m.f.join(", ")}, ${m.min}–${m.max}, ${m.rec})`).join("\n") || "—",
        ...(o.obs ? [it.notas.map(n => "• " + n.x).join("\n") || "—"] : [])]);
      body(r, k, i % 2 === 1); [3, 4, 7].forEach(c => { r.getCell(c).alignment = { vertical: "top", horizontal: "center", wrapText: true }; });
      r.getCell(4).font = { bold: true, color: { argb: "FF0369A1" } }; r.getCell(11).font = { bold: true, color: { argb: "FF047857" } };
      if (it.chg) { r.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; r.getCell(3).note = `Antes ${it.chg.de} (normativa vieja)`; }
      fit(r, W1);
    });
  }
  s1.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: H1.length } };

  /* ---- hoja 2: articulado ---- */
  const H2 = ["Tipo", "Robo", "Tentativa", "Consumado", "Consumado con disparos o intento de homicidio", "Rehenes", "Armas a la vista", "Otros (caja fuerte, hackeo, explosivos, herramientas)", "Grupo", "Huida", "Notas"];
  const W2 = [16, 30, 34, 40, 44, 34, 30, 36, 30, 38, 26];
  const s2 = wb.addWorksheet("Articulado", { properties: { tabColor: { argb: "FFEF4444" } } });
  title(s2, H2.length, "Articulado de robos", `Artículos del Código Penal de la Terminal LSPD para cada robo. Tentativa: no lo consiguieron · Consumado: lo consiguieron · Con disparos: además dispararon a agentes o intentaron matar a alguien. Las columnas de la derecha se suman solo si ocurre. Es una guía: el agente ajusta a lo que pasó.`);
  s2.addRow([]); header(s2, 4, H2); s2.columns.forEach((c, i) => { c.width = W2[i]; });
  const used = new Map<string, Set<string>>(); const use = (rs: Ref[], n: string) => rs.forEach(r => { if (!used.has(r.a)) used.set(r.a, new Set()); used.get(r.a)!.add(n); });
  const cond = (L: ReturnType<typeof leyOf>, ks: string[]) => L.cond.filter(c => ks.includes(c.k)).map(c => `${c.when}:\n${refTxt(c.arts)}`).join("\n\n") || "—";
  for (const k of cats) {
    const L0 = items.filter(x => x.cat === k); section(s2, H2.length, k, L0.length);
    L0.forEach((it, i) => {
      const L = leyOf(it); use(L.tent, it.n); use(L.hom, it.n); L.cond.forEach(c => use(c.arts, it.n));
      const r = s2.addRow([CATS[k].l, it.n, refTxt(L.tent), refTxt(L.cons), refTxt(L.hom), cond(L, ["reh"]), cond(L, ["arm"]), cond(L, ["otro", "hack", "boom", "tools"]), cond(L, ["grp"]), cond(L, ["huida"]), L.nota || ""]);
      body(r, k, i % 2 === 1);
      ([[3, "FFFEF9C3"], [4, "FFFFEDD5"], [5, "FFFEE2E2"]] as const).forEach(([c, f]) => { r.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: f } }; });
      fit(r, W2);
    });
  }
  s2.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: H2.length } };

  /* ---- hoja 3: artículos ---- */
  if (o.desc) {
    const H3 = ["Artículo", "Título", "Multa", "Prisión", "Descripción", "Se usa en"], W3 = [10, 42, 12, 10, 70, 50];
    const s3 = wb.addWorksheet("Artículos", { properties: { tabColor: { argb: "FF22C55E" } } });
    title(s3, H3.length, "Artículos usados", "Texto y pena de cada artículo del Código Penal de la terminal que aparece en el articulado.");
    s3.addRow([]); header(s3, 4, H3); s3.columns.forEach((c, i) => { c.width = W3[i]; });
    [...used.keys()].sort((a, b) => { const A = a.split(".").map(Number), B = b.split(".").map(Number); return A[0] - B[0] || A[1] - B[1]; }).forEach((a, i) => {
      const x = art(a); if (!x) return;
      const r = s3.addRow([x.a, x.t, x.m ? x.m : "—", x.p ? `${x.p} meses` : "—", x.d || "", [...used.get(a)!].join(", ")]);
      r.alignment = { vertical: "top", wrapText: true }; r.getCell(1).font = { bold: true, color: { argb: "FFB91C1C" } }; r.getCell(2).font = { bold: true };
      if (typeof r.getCell(3).value === "number") r.getCell(3).numFmt = '"$"#,##0';
      r.eachCell({ includeEmpty: true }, c => { c.border = { bottom: { style: "thin", color: { argb: ARGB(LINE) } } }; if (i % 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }; });
      fit(r, W3);
    });
    s3.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: H3.length } };
  }

  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = `Robos · Eleven Project · ${new Date().toISOString().slice(0, 10)}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
