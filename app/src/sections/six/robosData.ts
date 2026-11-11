/* Catálogo de robos (six): la Normativa de Robos (Notion) cruzada con la planilla «Misiones y robos».
   Cada robo de la normativa se une con sus misiones (atracadores mín./máx. y recompensa) y se marcan diferencias,
   misiones que no tienen robo en la normativa (con una propuesta de categoría y policías = atracadores + 2) y lo que se puede sacar. */

export type Cat = "rap" | "men" | "veh" | "esp" | "may" | "mis";
export const CATS: Record<Cat, { l: string; c: string; d: string }> = {
  rap: { l: "Robos rápidos", c: "#38bdf8", d: "Sin rehenes ni bloqueo · solo cuchillo" },
  men: { l: "Robos menores 211", c: "#22c55e", d: "Robos de patrulleros · sin interceptor ni helicóptero" },
  veh: { l: "Robos de vehículo", c: "#f59e0b", d: "Cualquier vehículo ilegal" },
  esp: { l: "Robos especiales 211", c: "#3b82f6", d: "Rehenes y bloqueo · helicóptero" },
  may: { l: "Robos mayores 487", c: "#ef4444", d: "Patrulla, interceptor y helicóptero" },
  mis: { l: "Misiones (no son robos)", c: "#a855f7", d: "Asesinato, escolta, entrega, destrucción e infiltración" },
};
type PV = [boolean, boolean, boolean, boolean?]; // patrulla, interceptor, helicóptero, barco
export type Robo = { id: string; n: string; cat: Cat; ilg?: string; arm?: string; reh?: string; blq?: boolean | null; max?: number | null; pol?: number | null; pv?: PV; mando?: boolean | null; norm: boolean };
export type Mision = { n: string; tipo: string; min: number; max: number; rec: string; robo?: string; cat?: Cat; off?: boolean; dup?: number };

const MD = "Máx. deportivos (sin alerón)", MDX = "Máx. deportivos", CV = "Cualquier vehículo";
const BLANCA = "Mínimo armas blancas · Escopeta ✗ · SMG y superiores ✗", PIST = "Obligatorio mín. 1 pistola · Escopeta ✗ · SMG y superiores ✗";
const PIST_ESC = "Obligatorio mín. 1 pistola · Escopeta ✓ · SMG y superiores ✗", ESC_SMG = "Obligatorio mín. 1 escopeta o SMG y el resto pistolas", FUSIL = "Obligatorio mín. 1 fusil de asalto y 1 escopeta o SMG, el resto pistolas";
const CUCH = "Cuchillo ✓ · Pistola ✗ · Escopeta ✗ · SMG ✗";
const r = (id: string, n: string, cat: Cat, o: Partial<Robo>): Robo => ({ id, n, cat, norm: true, ...o });

/* ---------- Normativa de Robos ---------- */
export const NORMATIVA: Robo[] = [
  r("tumbas", "Tumbas", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 4, pol: 6, pv: [true, true, false], mando: false }),
  r("expend", "Máquinas expendedoras", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 2, pol: null, pv: [true, true, false], mando: false }),
  r("cabinas", "Cabinas telefónicas", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 2, pol: null, pv: [true, true, false], mando: false }),
  r("parqui", "Parquímetros", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 2, pol: null, pv: [true, true, false], mando: false }),

  r("badulaque", "Badulaque / Licorería (máx. 2 al día)", "men", { ilg: MD, arm: BLANCA, reh: "Tendero", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false }),
  r("grow", "Grownshop", "men", { ilg: MD, arm: BLANCA, reh: "Tendero", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false }),
  r("informatica", "Tienda de informática", "men", { ilg: MD, arm: BLANCA, reh: "El informático", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false }),
  r("granja", "Asalto Granja Towtow", "men", { ilg: MD, arm: BLANCA, reh: "El granjero", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  r("farmacia", "Farmacias (máx. 2 por semana)", "men", { ilg: MDX, arm: PIST, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  r("furgonmat", "Asalto furgón de materiales", "men", { ilg: MD, arm: "Obligatorio mín. 1 pistola (PDB mín. arma blanca) · Escopeta ✗ · SMG y superiores ✗", reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  r("textil", "Asalto fábrica textil", "men", { ilg: MD, arm: PIST, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  r("furgonfleeca", "Asalto furgón Fleeca", "men", { ilg: MD, arm: BLANCA, reh: "El conductor del furgón", blq: true, max: 6, pol: 8, pv: [true, false, false], mando: false }),

  r("importacion", "Coche de importación", "veh", { ilg: CV, arm: CUCH, reh: "No", blq: false, max: 2, pol: 4, pv: [true, true, false] }),
  r("piezas", "Robo de piezas de vehículo (cualquier clase)", "veh", { ilg: CV, arm: CUCH, reh: "No", blq: false, max: 4, pol: 6, pv: [true, true, false] }),
  r("boostbcd", "Boosting (clase B, C y D)", "veh", { ilg: CV, arm: CUCH, reh: "No", blq: false, max: 4, pol: 6, pv: [true, true, true] }),
  r("boosta", "Boosting (clase A o más)", "veh", { ilg: CV, arm: "Cuchillo ✓ · Pistola ✓ · Escopeta ✓ · SMG ✗", reh: "No", blq: true, max: 4, pol: 6, pv: [true, true, true] }),

  r("lavanderia", "Lavandería", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("pawn", "Pawnshop", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("cambio", "Casa de cambio", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("establo", "Robo al establo", "esp", { ilg: CV, arm: PIST, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, true, true], mando: null }),
  r("joyeria", "Joyería", "esp", { ilg: CV, arm: PIST, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("union", "Asalto Union Depository", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("casa", "Casa", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("yate", "Yate (Norte)", "esp", { ilg: "Barcos", arm: "Todos los del barco mín. 1 pistola · Escopeta ✗ · SMG y superiores ✗", reh: "No", blq: true, max: 6, pol: 8, pv: [true, true, true, true], mando: false }),
  r("carguero", "Asalto al carguero (Sur)", "esp", { ilg: "Barcos", arm: "Todos los del barco mín. 1 pistola · Escopeta ✗ · SMG y superiores ✗", reh: "No", blq: true, max: 6, pol: 8, pv: [true, true, true, true], mando: false }),

  r("ammu", "Ammu Nation", "may", { ilg: CV, arm: PIST_ESC, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("comisaria", "Robo a la comisaría de Sandy", "may", { ilg: CV, arm: PIST_ESC, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("humane", "Laboratorios Humane", "may", { ilg: CV, arm: PIST_ESC, reh: "Sí (2 a 6)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("smitty", "Almacén Smitty", "may", { ilg: CV, arm: ESC_SMG, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("fleecasur", "Fleeca Sur (LSPD)", "may", { ilg: CV, arm: ESC_SMG, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("paleto", "Banco Paleto (BCSD)", "may", { ilg: CV, arm: ESC_SMG, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("gsbank", "Grand Señora Central Bank", "may", { ilg: CV, arm: ESC_SMG, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("galeria", "Galería de Arte", "may", { ilg: CV, arm: FUSIL, reh: "Sí (1 a 6)", blq: true, max: 8, pol: 10, pv: [true, true, true], mando: false }),
  r("maze", "Maze Bank", "may", { ilg: CV, arm: FUSIL, reh: "Sí (6 a 10)", blq: true, max: 12, pol: 14, pv: [true, true, true], mando: false }),
  r("pacific", "Banco Pacific (Central)", "may", { ilg: CV, arm: FUSIL, reh: "Sí (6 a 10)", blq: true, max: 14, pol: 16, pv: [true, true, true], mando: false }),
  r("bobcat", "Bobcat Security", "may", { ilg: CV, arm: "Obligatorio al menos 2 micro SMG y el resto pistolas", reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("tren", "Tren descarrilado (PVP)", "may", { ilg: CV, arm: "Obligatorio 2 fusiles de asalto y todos mínimo con micro SMG", reh: "No", blq: false, max: 8, pol: 10, pv: [true, true, true], mando: true }),
  r("casino", "Casino", "may", { ilg: "—", arm: "Pistola ✓ · Escopeta ✓ · SMG y superiores ✓", reh: "—", blq: null, max: null, pol: null, pv: [true, true, true], mando: false }),
];

/* ---------- planilla «Misiones y robos» (robo: con qué robo de la normativa se corresponde; cat: categoría propuesta si no hay) ---------- */
const m = (n: string, tipo: string, min: number, max: number, rec: string, o: Partial<Mision> = {}): Mision => ({ n, tipo, min, max, rec, ...o });
export const MISIONES: Mision[] = [
  m("Ajuste de cuentas", "Asesinato", 1, 2, "500$", { cat: "mis" }), m("Control de masas", "Asesinato", 2, 4, "500$", { cat: "mis" }), m("Destruye el tractor", "Destrucción", 1, 2, "500$", { cat: "mis" }),
  m("Escolta", "Escolta", 2, 3, "1.200$", { cat: "mis" }), m("Haz desaparecer el camión y lo que lleva dentro", "Destrucción", 1, 3, "1.100$", { cat: "mis" }),
  m("Infiltrarse en el hospital y dejar una puerta trasera", "Infiltración", 1, 4, "4.000$", { cat: "mis" }),
  m("Robo de furgoneta", "Robo de vehículo", 1, 3, "750$", { cat: "veh" }), m("Robo de Jester", "Robo de vehículo", 1, 3, "975$", { cat: "veh" }),
  m("Transporta la mercancía y que llegue sana y salva", "Entrega", 1, 3, "750$", { cat: "mis" }),
  m("Prepárate para la armería", "Encargo (preparación)", 2, 4, "600$", { robo: "ammu", dup: 2 }), m("Prepárate para la casa de cambio", "Encargo (preparación)", 2, 3, "750$", { robo: "cambio", dup: 2 }),
  m("Robo almacén de semillas", "Encargo", 1, 4, "600$", { cat: "men" }), m("Atraco a la armería de Sandy", "Encargo", 2, 6, "revisar", { robo: "ammu", dup: 2 }),
  m("Atraco casa de cambio", "Encargo", 2, 4, "2.000$", { robo: "cambio", dup: 2 }), m("Garantía impagada", "Robo de vehículo", 1, 3, "1.100$", { cat: "veh" }),
  m("Prepárate para la farmacia", "Encargo (preparación)", 2, 3, "450$", { robo: "farmacia" }), m("Roba el Auto Shop", "Encargo", 1, 3, "1.000$", { cat: "men" }),
  m("Roba la farmacia de Sandy", "Encargo", 2, 4, "600$", { robo: "farmacia" }), m("Saquea los Santos Custom", "Encargo", 2, 4, "1.000$", { cat: "men" }),
  m("Acaba con los chatarreros", "Encargo", 3, 5, "1.200$", { cat: "mis" }), m("Asalto a la armería del centro", "Encargo", 2, 6, "revisar", { robo: "ammu", dup: 2 }),
  m("Bien embargado", "Robo de vehículo", 2, 4, "1.500$", { cat: "veh" }), m("Contabilidad paralela", "Entrega", 1, 3, "1.200$", { cat: "mis" }), m("Dinero en movimiento", "Entrega", 1, 3, "1.200$", { cat: "mis" }),
  m("Jack & Jill", "Encargo", 2, 4, "800$", { cat: "men" }), m("Activo quemado", "Destrucción", 1, 3, "750$", { cat: "mis" }), m("Auditor comprado", "Escolta", 2, 4, "1.600$", { cat: "mis" }),
  m("Caída libre", "Entrega", 2, 4, "400$", { cat: "mis" }), m("El deudor", "Asesinato", 1, 2, "500$", { cat: "mis" }), m("Pintando las calles", "Asesinato", 2, 4, "750$", { cat: "mis" }),
  m("Robo de tienda de informática", "Encargo", 2, 4, "600$", { robo: "informatica", dup: 2 }), m("Socio incómodo", "Asesinato", 1, 2, "500$", { cat: "mis" }),
  m("Transporte comprometido", "Destrucción", 1, 3, "750$", { cat: "mis" }), m("Transportista de fondos", "Escolta", 1, 3, "1.200$", { cat: "mis" }),
  m("Asalto a la armería de Morningwood", "Encargo", 2, 6, "revisar", { robo: "ammu" }), m("Asalto al matadero de Clucking Bell", "Encargo", 2, 4, "revisar", { cat: "esp", dup: 2 }),
  m("Roba a ese paleto", "Encargo", 1, 4, "3.000$", { cat: "men" }), m("Infiltrarse en el FIB", "Infiltración", 4, 8, "2.000$", { cat: "mis" }),
  m("Robo a la armería de Industrias", "Encargo", 2, 6, "revisar", { robo: "ammu" }), m("Transporte de armas", "Entrega", 1, 2, "revisar", { cat: "mis" }),
  m("El último frasco", "Encargo", 1, 3, "600$ + ítems para droga", { cat: "men" }), m("Sin preguntas", "Entrega", 1, 3, "750$ + ítems para droga", { cat: "mis", dup: 2 }),
  m("Fenta Express", "Encargo", 2, 4, "1.000$ + ítems para droga", { cat: "men" }), m("Golpe Euforia", "Encargo", 1, 4, "700$ + ítems para droga", { cat: "men" }),
  m("Infiltración y robo comisaría", "Infiltración", 4, 8, "16.000$", { robo: "comisaria" }), m("Asalto armería de Paleto", "Encargo", 2, 6, "revisar", { robo: "ammu" }),
  m("Asalto al carguero del puerto", "Encargo", 2, 6, "3.000$ + piezas de armas", { robo: "carguero" }), m("Materia prohibida", "Encargo", 1, 4, "1.000$ + ítems para droga", { cat: "men" }),
  m("Robo a la comisaría de Sandy", "Encargo", 2, 6, "revisar", { robo: "comisaria" }), m("Asalto al carguero", "Encargo", 4, 8, "4.000$ + piezas de armas", { robo: "carguero" }),
  m("Depósito clandestino Walker", "Encargo", 3, 8, "3.000$", { cat: "may" }), m("Asalta al Vanilla Unicorn", "Encargo", 4, 8, "4.000$", { cat: "esp" }),
  m("Código M", "Encargo", 2, 6, "3.000$ + ítems para droga", { cat: "esp" }), m("Proyecto Neón", "Encargo", 2, 4, "3.000$ + ítems para droga", { cat: "esp" }),
  m("Murrieta Factory", "Encargo", 2, 6, "3.000$ + piezas de armas", { cat: "esp", off: true }), m("Bunker Calafia", "Encargo", 4, 8, "falta hacerla", { cat: "may", off: true }),
  m("El último vínculo", "Encargo", 3, 6, "15.000$", { cat: "may" }), m("Operación Náufrago", "Encargo", 3, 6, "9.000$", { cat: "esp", off: true }),
  m("Robo de guante blanco en Sandy", "Infiltración", 6, 10, "50.000$", { cat: "may" }), m("Control de masas (encargo)", "Encargo", 2, 4, "1.600$", { cat: "mis" }),
  m("Pintando las calles (II)", "Asesinato", 2, 4, "1.500$", { cat: "mis" }), m("Justicia comprada", "Asesinato", 2, 4, "1.700$", { cat: "mis" }),
  m("Robo en Merryweather", "Persecución", 1, 4, "revisar", { cat: "esp", off: true }), m("Robo sobre ruedas", "Robo de vehículo", 1, 3, "1.200$", { cat: "veh" }),
  m("Robo coche custodiado", "Robo de vehículo", 1, 4, "2.000$", { cat: "veh" }), m("Robo al gimnasio de Chumash", "Robo de establecimiento", 1, 4, "1.200$", { cat: "men" }),
  m("Asalto al camión", "Robo de vehículo", 2, 4, "1.800$", { cat: "veh" }), m("Boom Boom", "Encargo", 3, 3, "6.000$", { cat: "mis" }),
  m("Acaba con Carlson", "Asesinato", 2, 6, "15.000$", { cat: "mis" }), m("Va de SMG la cosa", "Encargo (persecución)", 2, 8, "30.000$", { cat: "may" }),
  m("Robo 4x4", "Robo de vehículo", 1, 4, "1.000$", { cat: "veh" }), m("Saqueo fúnebre", "Entrega", 1, 3, "100$ + anillo de diamante", { cat: "mis" }),
  m("Cárgate a ese sapo", "Asesinato", 1, 3, "1.500$", { cat: "mis" }),
];

/* ---------- cruce ---------- */
export type Item = Robo & { mis: Mision[]; min?: number; prop?: boolean; notas: { t: "conf" | "nuevo" | "off" | "rev" | "dup" | "ok" | "sin"; x: string }[] };
const PV_DEF: Record<Cat, PV> = { rap: [true, true, false], men: [true, false, false], veh: [true, true, false], esp: [true, false, true], may: [true, true, true], mis: [true, true, false] };
export function catalogo(): Item[] {
  const out: Item[] = NORMATIVA.map(x => ({ ...x, mis: [], notas: [] }));
  for (const mi of MISIONES) {
    const it = mi.robo ? out.find(o => o.id === mi.robo) : undefined;
    if (it) { it.mis.push(mi); continue; }
    /* misión sin robo en la normativa: propuesta con policías = atracadores + 2 */
    const cat = mi.cat || "mis";
    out.push({ id: "m:" + mi.n, n: mi.n, cat, norm: false, prop: true, mis: [mi], max: mi.max, min: mi.min, pol: mi.max + 2, pv: PV_DEF[cat], reh: cat === "esp" || cat === "may" ? `Sí (1 a ${Math.max(2, mi.max - 1)})` : "No", blq: cat === "esp" || cat === "may", mando: false, notas: [] });
  }
  for (const it of out) {
    if (it.mis.length) it.min = Math.min(...it.mis.map(x => x.min));
    if (!it.norm) {
      it.notas.push({ t: "nuevo", x: it.cat === "mis" ? `Misión de tipo ${it.mis[0].tipo.toLowerCase()}: no es un robo, pero conviene fijar policías máx. (${it.pol}).` : `No figura en la normativa: se propone ${CATS[it.cat].l} con ${it.max} atracadores y ${it.pol} policías.` });
    } else if (!it.mis.length) it.notas.push({ t: "sin", x: "Sin misión en la planilla: no tiene recompensa cargada." });
    for (const mi of it.mis) {
      if (it.norm && it.max != null && mi.max > it.max) it.notas.push({ t: "conf", x: `«${mi.n}» permite hasta ${mi.max} y la normativa ${it.max}: subir la normativa a ${mi.max} atracadores / ${mi.max + 2} policías o bajar la misión a ${it.max}.` });
      if (mi.off) it.notas.push({ t: "off", x: `«${mi.n}» está marcada como NO ACTIVA: se puede sacar del catálogo hasta que vuelva.` });
      if (/revisar|falta/i.test(mi.rec)) it.notas.push({ t: "rev", x: `«${mi.n}»: la recompensa está pendiente (${mi.rec}).` });
      if (mi.dup) it.notas.push({ t: "dup", x: `«${mi.n}» aparece ${mi.dup} veces en la planilla: se puede dejar una sola fila.` });
    }
    if (it.norm && it.mis.length && !it.notas.some(n => n.t === "conf")) it.notas.push({ t: "ok", x: "La misión coincide con la normativa." });
  }
  return out;
}
