/* Condecoraciones del departamento: catálogo (medallas, franjas de servicio y condecoraciones por departamento y división)
   y cintas dibujadas con CSS (barato: un solo fondo con gradientes, sin imágenes). */

export type Tab = "cond" | "med" | "fra";
export type Dev = "star" | "starw" | "oo" | "heart" | "check";
export type Decor = { k: string; t: string; c: string; tab: Tab; g: string; sec: "Departamentos" | "Divisiones"; s: [string, number][]; dev?: Dev; n?: number };

const C: Record<string, string> = {
  B: "#1d4ed8", W: "#f1f5f9", Y: "#f5c518", R: "#dc2626", G: "#1f7a3e", P: "#6b2fb3", K: "#18181b", O: "#566b2b", N: "#1e3a8a", Gr: "#a8adb5",
  Br: "#7a4a2a", T: "#d9b88a", LB: "#7cc4ea", M: "#7a2230", Or: "#f26b1d", DG: "#4b5058", St: "#4a5f84", LN: "#1d4f9e", Sa: "#a3876a",
};
const S = (spec: string): [string, number][] => spec.split(" ").map(x => { const [c, w] = x.split(":"); return [C[c] || c, w ? +w : 1]; });

type Raw = [string, string, string, string?, Dev?];
const mk = (tab: Tab, sec: Decor["sec"], g: string, L: Raw[]): Decor[] => L.map(([t, c, s, k, dev]) => ({ k: k || slug(t), t, c, tab, g, sec, s: S(s), dev }));
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const DECOR: Decor[] = [
  /* ---------- Medallas ---------- */
  ...mk("med", "Departamentos", "Compartidas", [
    ["Medalla al Valor", "Bravura", "B W"],
    ["Medalla por Preservación de la Vida", "Bravura", "B Y"],
    ["Medalla por Servicio Distinguido", "Servicio", "R Y G"],
    ["Medalla Policial", "Bravura", "R W"],
    ["Corazón Púrpura", "Bravura", "W:.07 P:1 W:.07"],
    ["Medalla al Servicio Meritorio", "Servicio", "Y:.35 R:.5 W:1.3 R:.5 Y:.35"],
    ["Estrella Policial", "Bravura", "B:.35 W:2 B:.35"],
    ["Medalla de Salvamento", "Bravura", "G:1 B:.35 W:.45 R:.35 G:1"],
    ["Medalla de la Comisión por Servicio Distinguido", "Servicio", "W:.5 B:.7 R:.5 B:.7 R:.5 B:.7 R:.5"],
    ["Medalla de Integridad", "Mérito", "K:1 W:.45 K:1"],
    ["Medalla de Policía Comunitaria", "Mérito", "Y:.06 P:1 Y:.06", undefined, "oo"],
    ["Medalla de Relaciones Humanas", "Mérito", "Y:.06 P:1 Y:.06", undefined, "heart"],
    ["Premio Liberty (K-9)", "Especiales", "Y:1 N:.15 Y:1"],
    ["Medalla Nacional Al Valor", "Bravura", "Or:.12 N:1 W:.06 N:1 Or:.12"],
  ]),
  /* ---------- Franjas de servicio (se dibujan como galones) ---------- */
  ...["3 meses", "6 meses", "9 meses", "1 año", "1 año 3 meses", "1 año 6 meses", "1 año 9 meses"].map((x, i): Decor =>
    ({ k: "franja-" + (i + 1), t: `Cinta de servicio (${x})`, c: "Acumulativa", tab: "fra", sec: "Departamentos", g: "Compartidas", s: [], n: i + 1 })),
  /* ---------- Condecoraciones · departamentos ---------- */
  ...mk("cond", "Departamentos", "Compartidas", [
    ["Citación de Unidad de la Comisión", "Citaciones", "Y:.12 O:1 Y:.12"],
    ["Citación de Unidad Meritoria", "Citaciones", "O:1 W:.12 O:1"],
    ["Cinta de Servicio de Patrulla", "Asignación", "N"],
    ["Cinta de Servicio de Detective", "Asignación", "K:1 W:.12 K:1"],
    ["Cinta de Oficial de Reserva", "Asignación", "B:.14 Gr:1 B:.14"],
    ["Calificación en Rifle Urbano", "Calificación", "O:1 K:.04 O:1 K:.04 O:1"],
    ["Calificación en Munición Slug", "Calificación", "Br:1 B:.45 Br:1"],
    ["Cinta de Búsqueda y Captura", "Mérito", "K:.55 R:.4 K:.35 R:.4 K:.55", undefined, "star"],
    ["Agente del Mes", "Desempeño", "R B R B R"],
    ["Cinta de Mando en Operativos", "Mando", "M:1 Y:.9 M:1", undefined, "starw"],
    ["Servicio Destacable como Mando", "Mando", "M:.5 Y:.5 W:.6 Y:.5 M:.5"],
    ["Desempeño en Programa de Academia", "Academia", "Y:.12 G:1 W:.18 G:1 Y:.12"],
    ["Cinta de Comendación", "Comendación", "R B R B R", "comendacion"],
  ]),
  ...mk("cond", "Departamentos", "LSPD", [["Desempeño Destacable - LSPD", "Desempeño", "LN Y LN"]]),
  ...mk("cond", "Departamentos", "LSSD", [["Desempeño Destacable - LSSD", "Desempeño", "O Y O"]]),
  ...mk("cond", "Departamentos", "SAHP", [["Desempeño Destacable - SAHP", "Desempeño", "Sa Y Sa"]]),
  /* ---------- Condecoraciones · divisiones ---------- */
  ...mk("cond", "Divisiones", "RTD", [
    ["Cinta de Instructor", "Certificación", "Br:1 T:.6 Br:1", undefined, "star"],
    ["Cinta de Mentor", "Hito", "G:1 T:.3 G:.12 T:.3 G:1"],
    ["Instructor del Año", "Hito", "Y:.06 P:1 Y:.06", undefined, "star"],
    ["Especialista en Tiro (FTU)", "Especialidad", "DG:1 R:.1 DG:.5 R:.1 DG:1"],
    ["Especialista en Conducción (EVOC)", "Especialidad", "Y K Y K Y"],
    ["6 Meses en Instrucción", "Asignación", "Br"],
    ["Desempeño Destacable en RTD", "Hito", "Br:.8 Y:.4 W:.4 Y:.4 Br:.8"],
    ["Cinta de Cadetes Formados", "Acumulativa", "G:1 T:.9 G:1", undefined, "star"],
  ]),
  ...mk("cond", "Divisiones", "Detective Bureau", [
    ["Cinta de Detective Certificado", "Certificación", "K:1 Gr:.4 K:1"],
    ["Cinta de Casos Resueltos", "Acumulativa", "K:1 Gr:.55 K:1", undefined, "star"],
    ["Cinta de Especialista Forense", "Especialidad", "B:1 W:.8 B:1"],
    ["Cinta de Operación Encubierta", "Hito", "K:1 M:.14 K:1"],
    ["6 Meses en Detective Bureau", "Asignación", "M:.05 K:1 M:.05"],
    ["Desempeño Destacable en DB", "Hito", "K:.4 M:.4 Y:.4 M:.4 K:.4"],
  ]),
  ...mk("cond", "Divisiones", "ASB", [
    ["Cinta de Servicio Administrativo", "Asignación", "St:1 Gr:.6 St:1"],
    ["Cinta de Servicio Prolongado", "Acumulativa", "St:1 Gr:.5 St:1", undefined, "star"],
    ["Cinta de Especialista en Armería", "Especialidad", "DG:1 R:.14 DG:1"],
    ["Cinta de Logística Destacada", "Hito", "St:.8 Gr:.35 St:.3 Gr:.35 St:.8"],
    ["Desempeño Destacable en ASB", "Hito", "St:1 Y:.9 St:1"],
  ]),
  ...mk("cond", "Divisiones", "Metro", [
    ["Cinta de Operador Metro", "Certificación", "K:.5 Gr:.5 R:.5 Gr:.5 K:.5"],
    ["Cinta de Operativos Tácticos", "Acumulativa", "K:.5 Gr:.5 R:.5 Gr:.5 K:.5", undefined, "star"],
    ["Cinta de Tirador Designado", "Especialidad", "K:1 R:.1 K:1"],
    ["Cinta de Rescate de Rehenes", "Hito", "G:1 W:.8 G:1"],
    ["6 Meses en Metro", "Asignación", "R:.08 K:1 R:.08"],
    ["Desempeño Destacable en Metro", "Hito", "K:.5 R:.5 Y:.4 R:.5 K:.5"],
    ["Cinta de Redadas Tácticas", "Acumulativa", "K:.4 R:.08 K:.3 R:.08 K:.5 R:.08 K:.3 R:.08 K:.4", undefined, "star"],
  ]),
  ...mk("cond", "Divisiones", "HSIU", [
    ["Cinta de Interceptor Certificado", "Certificación", "R W K"],
    ["Cinta de Interceptaciones", "Acumulativa", "R W K", undefined, "star"],
    ["Cinta PIT Certificada", "Especialidad", "W", undefined, "check"],
    ["Cinta del Piloto del Año", "Hito", "Y:.06 P:1 Y:.06", "piloto-del-ano-hsiu", "star"],
    ["6 Meses en HSIU", "Asignación", "W:.06 R:1 W:.06"],
    ["Desempeño Destacable en HSIU", "Hito", "R:.4 W:.4 Y:.4 W:.4 R:.4"],
    ["Servicio Destacable Motorizada", "Especialidad", "K:.3 Gr:.3 K:.2 R:.2 K:.2 Gr:.3 K:.3"],
  ]),
  ...mk("cond", "Divisiones", "Air Support", [
    ["Cinta de Tripulante Aéreo", "Asignación", "LB:1 W:.55 LB:1"],
    ["Cinta de Horas de Vuelo", "Acumulativa", "LB:1 W:.5 LB:1", undefined, "star"],
    ["Cinta de Piloto Certificado", "Especialidad", "LB:.12 Gr:.04 LB:2 Gr:.04 LB:.12"],
    ["Cinta de Operador TFO", "Especialidad", "LB:1 Or:.4 LB:1"],
    ["6 Meses en Air Support", "Asignación", "W:.05 LB:1 W:.05"],
    ["Desempeño Destacable en ASD", "Hito", "LB:1 Y:.9 LB:1"],
  ]),
  ...mk("cond", "Divisiones", "Asuntos Internos", [
    ["Cinta de IA Certificado", "Certificación", "P:1 W:.5 P:1"],
    ["6 Meses en Asuntos Internos", "Asignación", "W:.07 P:2"],
    ["Desempeño Destacable en IA", "Hito", "P:1 Y:.6 P:1"],
  ]),
];
export const DECOR_BY = new Map(DECOR.map(d => [d.k, d]));
export const decorOf = (k?: string) => (k ? DECOR_BY.get(k) : undefined);

/* fondo de la cinta: franjas + textura de hilo + brillo, todo en un solo background */
const cache = new Map<string, string>();
export function ribbonBg(d: Decor) {
  const hit = cache.get(d.k); if (hit) return hit;
  let stripes: string;
  if (d.dev === "check") stripes = "repeating-conic-gradient(#111 0 25%,#f5f5f5 0 50%) 0 0/12px 12px";
  else { const tot = d.s.reduce((a, [, w]) => a + w, 0); let x = 0;
    stripes = "linear-gradient(90deg," + d.s.map(([c, w]) => { const a = (x / tot) * 100; x += w; return `${c} ${a.toFixed(2)}% ${((x / tot) * 100).toFixed(2)}%`; }).join(",") + ")"; }
  const v = `linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 45%,rgba(0,0,0,.22)),repeating-linear-gradient(90deg,rgba(0,0,0,.1) 0 1px,transparent 1px 3px),${stripes}`;
  cache.set(d.k, v); return v;
}

export type Award = { id: string; t: string; f?: string; k?: string; m?: string; by?: string };
