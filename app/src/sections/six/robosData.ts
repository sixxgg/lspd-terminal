import { BANDA_KEYS, nk, type Banda, type TMis, type TRobo, type TabData } from "./tabletData";
/* Catálogo de robos (six): la Normativa de Robos (Notion) cruzada con la planilla «Misiones y robos».
   Cada robo de la normativa se une con sus misiones (atracadores mín./máx. y recompensa) y se marcan diferencias,
   misiones que no tienen robo en la normativa (con una propuesta de categoría y policías = atracadores + 2) y lo que se puede sacar. */

export type Cat = "rap" | "men" | "veh" | "esp" | "may" | "mis";
export const CATS: Record<Cat, { l: string; c: string; d: string; code?: string }> = {
  rap: { l: "Robos rápidos", c: "#38bdf8", d: "Sin rehenes ni bloqueo · solo cuchillo" },
  men: { l: "Robos menores", code: "211", c: "#22c55e", d: "Robos de patrulleros · sin interceptor ni helicóptero" },
  veh: { l: "Robos de vehículo", c: "#f59e0b", d: "Cualquier vehículo ilegal" },
  esp: { l: "Robos especiales", code: "211", c: "#3b82f6", d: "Rehenes y bloqueo · helicóptero" },
  may: { l: "Robos mayores", code: "487", c: "#ef4444", d: "Patrulla, interceptor y helicóptero" },
  mis: { l: "Misiones (no son robos)", c: "#a855f7", d: "Asesinato, escolta, entrega, destrucción e infiltración" },
};
type PV = [boolean, boolean, boolean, boolean?]; // patrulla, interceptor, helicóptero, barco
export type Robo = { id: string; n: string; cat: Cat; ilg?: string; arm?: string; reh?: string; blq?: boolean | null; max?: number | null; pol?: number | null; pv?: PV; mando?: boolean | null; norm: boolean; tab?: boolean };
/* tab: las variantes de la misión que están activas en la tablet (nivel, policías para arrancar, dinero, experiencia y tipo de banda) */
export type Mision = { n: string; tipo: string; min: number; max: number; rec: string; robo?: string; cat?: Cat; off?: boolean; f: number[]; tab?: TMis[] };

const MD = "Máx. deportivos (sin alerón)", MDX = "Máx. deportivos", CV = "Cualquier vehículo";
const BLANCA = "Mínimo armas blancas · Escopeta ✗ · SMG y superiores ✗", PIST = "Obligatorio mín. 1 pistola · Escopeta ✗ · SMG y superiores ✗";
const PIST_ESC = "Obligatorio mín. 1 pistola · Escopeta ✓ · SMG y superiores ✗", ESC_SMG = "Obligatorio mín. 1 escopeta o SMG y el resto pistolas", FUSIL = "Obligatorio mín. 1 fusil de asalto y 1 escopeta o SMG, el resto pistolas";
const CUCH = "Cuchillo ✓ · Pistola ✗ · Escopeta ✗ · SMG ✗";
const FURGON = "Obligatorio mín. 1 pistola (PDB mín. arma blanca) · Escopeta ✗ · SMG y superiores ✗", BOOST = "Cuchillo ✓ · Pistola ✓ · Escopeta ✓ · SMG ✗";
const BARCO = "Todos los del barco mín. 1 pistola · Escopeta ✗ · SMG y superiores ✗", BOB = "Obligatorio al menos 2 micro SMG y el resto pistolas";
const TREN = "Obligatorio 2 fusiles de asalto y todos mínimo con micro SMG", TODO = "Pistola ✓ · Escopeta ✓ · SMG y superiores ✓";
/* armas por regla: [blanca, pistola, escopeta, SMG, fusil] · 0 prohibida · 1 permitida · 2 obligatoria */
export const WPN: Record<string, number[]> = {
  [CUCH]: [1, 0, 0, 0, 0], [BLANCA]: [2, 1, 0, 0, 0], [PIST]: [1, 2, 0, 0, 0], [FURGON]: [1, 2, 0, 0, 0], [PIST_ESC]: [1, 2, 1, 0, 0],
  [ESC_SMG]: [1, 1, 2, 2, 0], [FUSIL]: [1, 1, 2, 2, 2], [BOOST]: [1, 1, 1, 0, 0], [BARCO]: [1, 2, 0, 0, 0], [BOB]: [1, 1, 0, 2, 0], [TREN]: [1, 1, 0, 2, 2], [TODO]: [1, 1, 1, 1, 1],
};
const ARM_DEF: Record<Cat, string> = { rap: CUCH, men: BLANCA, veh: CUCH, esp: PIST, may: ESC_SMG, mis: BLANCA };
const ILG_DEF: Record<Cat, string> = { rap: MD, men: MD, veh: CV, esp: MDX, may: CV, mis: CV };
const r = (id: string, n: string, cat: Cat, o: Partial<Robo>): Robo => ({ id, n, cat, norm: true, ...o });

/* ---------- Normativa de Robos ---------- */
const NORMATIVA: Robo[] = [
  r("tumbas", "Tumbas", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 4, pol: 6, pv: [true, true, false], mando: false }),
  r("expend", "Máquinas expendedoras", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 2, pol: null, pv: [true, true, false], mando: false }),
  r("cabinas", "Cabinas telefónicas", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 2, pol: null, pv: [true, true, false], mando: false }),
  r("tab:cajas", "Cajas y contenedores", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 2, pol: 4, pv: [true, true, false], mando: false, norm: false, tab: true }),
  r("parqui", "Parquímetros", "rap", { ilg: MD, arm: CUCH, reh: "No", blq: false, max: 2, pol: null, pv: [true, true, false], mando: false }),

  r("badulaque", "Badulaque / Licorería (máx. 2 al día)", "men", { ilg: MD, arm: BLANCA, reh: "Tendero", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false }),
  r("grow", "Grownshop", "men", { ilg: MD, arm: BLANCA, reh: "Tendero", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false }),
  r("informatica", "Tienda de informática", "men", { ilg: MD, arm: BLANCA, reh: "El informático", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false }),
  r("granja", "Asalto Granja Towtow", "men", { ilg: MD, arm: BLANCA, reh: "El granjero", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  r("farmacia", "Farmacias (máx. 2 por semana)", "men", { ilg: MDX, arm: PIST, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  r("furgonmat", "Asalto furgón de materiales", "men", { ilg: MD, arm: FURGON, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  r("textil", "Asalto fábrica textil", "men", { ilg: MD, arm: PIST, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, false], mando: false }),
  /* robos activos de la tablet que no estaban en la normativa: tipo badulaque, también para civiles (propuesta: mismos parámetros que el badulaque) */
  r("tab:pelu", "Peluquerías", "men", { ilg: MD, arm: BLANCA, reh: "Tendero (NPC, por /dados)", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false, norm: false, tab: true }),
  r("tab:ropa", "Tiendas de ropa", "men", { ilg: MD, arm: BLANCA, reh: "Tendero (NPC, por /dados)", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false, norm: false, tab: true }),
  r("tab:tatto", "Tiendas de tatuajes", "men", { ilg: MD, arm: BLANCA, reh: "Tendero (NPC, por /dados)", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false, norm: false, tab: true }),
  r("tab:antig", "Antigüedades", "men", { ilg: MD, arm: BLANCA, reh: "Tendero (NPC, por /dados)", blq: false, max: 2, pol: 4, pv: [true, false, false], mando: false, norm: false, tab: true }),
  r("furgonfleeca", "Asalto furgón Fleeca", "men", { ilg: MD, arm: BLANCA, reh: "El conductor del furgón", blq: true, max: 6, pol: 8, pv: [true, false, false], mando: false }),

  r("importacion", "Coche de importación", "veh", { ilg: CV, arm: CUCH, reh: "No", blq: false, max: 2, pol: 4, pv: [true, true, false] }),
  r("piezas", "Robo de piezas de vehículo (cualquier clase)", "veh", { ilg: CV, arm: CUCH, reh: "No", blq: false, max: 4, pol: 6, pv: [true, true, false] }),
  r("boostbcd", "Boosting (clase B, C y D)", "veh", { ilg: CV, arm: CUCH, reh: "No", blq: false, max: 4, pol: 6, pv: [true, true, true] }),
  r("boosta", "Boosting (clase A o más)", "veh", { ilg: CV, arm: BOOST, reh: "No", blq: true, max: 4, pol: 6, pv: [true, true, true] }),

  r("lavanderia", "Lavandería", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("pawn", "Pawnshop", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("cambio", "Casa de cambio", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("establo", "Robo al establo", "esp", { ilg: CV, arm: PIST, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, true, true], mando: null }),
  r("joyeria", "Joyería", "esp", { ilg: CV, arm: PIST, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("union", "Asalto Union Depository", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("casa", "Casa", "esp", { ilg: MDX, arm: BLANCA, reh: "Sí (1 a 4)", blq: true, max: 4, pol: 6, pv: [true, false, true], mando: false }),
  r("yate", "Yate (Norte)", "esp", { ilg: "Barcos", arm: BARCO, reh: "No", blq: true, max: 6, pol: 8, pv: [true, true, true, true], mando: false }),
  r("carguero", "Asalto al carguero (Sur)", "esp", { ilg: "Barcos", arm: BARCO, reh: "No", blq: true, max: 6, pol: 8, pv: [true, true, true, true], mando: false }),

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
  r("bobcat", "Bobcat Security", "may", { ilg: CV, arm: BOB, reh: "Sí (1 a 5)", blq: true, max: 6, pol: 8, pv: [true, true, true], mando: false }),
  r("tren", "Tren descarrilado (PVP)", "may", { ilg: CV, arm: TREN, reh: "No", blq: false, max: 8, pol: 10, pv: [true, true, true], mando: true }),
  r("casino", "Casino", "may", { ilg: "—", arm: TODO, reh: "—", blq: null, max: null, pol: null, pv: [true, true, true], mando: false }),
];

/* ---------- planilla «Misiones y robos» (robo: con qué robo de la normativa se corresponde; cat: categoría propuesta si no hay) ---------- */
const m = (n: string, tipo: string, min: number, max: number, rec: string, o: Partial<Mision> & { f: number[] }): Mision => ({ n, tipo, min, max, rec, ...o });
const MISIONES: Mision[] = [
  m("Ajuste de cuentas", "Asesinato", 1, 2, "", { cat: "mis", f: [2] }), m("Control de masas", "Asesinato", 2, 4, "", { cat: "mis", f: [3] }), m("Destruye el tractor", "Destrucción", 1, 2, "", { cat: "mis", f: [4] }),
  m("Escolta", "Escolta", 2, 3, "", { cat: "mis", f: [5] }), m("Haz desaparecer el camión y lo que lleva dentro", "Destrucción", 1, 3, "", { cat: "mis", f: [6] }),
  m("Infiltrarse en el hospital y dejar una puerta trasera", "Infiltración", 1, 4, "", { cat: "mis", f: [7] }),
  m("Robo de furgoneta", "Robo de vehículo", 1, 3, "", { cat: "veh", f: [8] }), m("Robo de Jester", "Robo de vehículo", 1, 3, "", { cat: "veh", f: [9] }),
  m("Transporta la mercancía y que llegue sana y salva", "Entrega", 1, 3, "", { cat: "mis", f: [10] }),
  m("Prepárate para la armería", "Encargo (preparación)", 2, 4, "", { robo: "ammu", f: [11, 12] }), m("Prepárate para la casa de cambio", "Encargo (preparación)", 2, 3, "", { robo: "cambio", f: [13, 14] }),
  m("Robo almacén de semillas", "Encargo", 1, 4, "", { cat: "men", f: [15] }), m("Atraco a la armería de Sandy", "Encargo", 2, 6, "", { robo: "ammu", f: [16, 17] }),
  m("Atraco casa de cambio", "Encargo", 2, 4, "", { robo: "cambio", f: [18, 19] }), m("Garantía impagada", "Robo de vehículo", 1, 3, "", { cat: "veh", f: [20] }),
  m("Prepárate para la farmacia", "Encargo (preparación)", 2, 3, "", { robo: "farmacia", f: [21] }), m("Roba el Auto Shop", "Encargo", 1, 3, "", { cat: "men", f: [22] }),
  m("Roba la farmacia de Sandy", "Encargo", 2, 4, "", { robo: "farmacia", f: [23] }), m("Saquea los Santos Custom", "Encargo", 2, 4, "", { cat: "men", f: [24] }),
  m("Acaba con los chatarreros", "Encargo", 3, 5, "", { cat: "mis", f: [25] }), m("Asalto a la armería del centro", "Encargo", 2, 6, "", { robo: "ammu", f: [26, 27] }),
  m("Bien embargado", "Robo de vehículo", 2, 4, "", { cat: "veh", f: [28] }), m("Contabilidad paralela", "Entrega", 1, 3, "", { cat: "mis", f: [29] }), m("Dinero en movimiento", "Entrega", 1, 3, "", { cat: "mis", f: [30] }),
  m("Jack & Jill", "Encargo", 2, 4, "", { cat: "men", f: [31] }), m("Activo quemado", "Destrucción", 1, 3, "", { cat: "mis", f: [32] }), m("Auditor comprado", "Escolta", 2, 4, "", { cat: "mis", f: [33] }),
  m("Caída libre", "Entrega", 2, 4, "", { cat: "mis", f: [34] }), m("El deudor", "Asesinato", 1, 2, "", { cat: "mis", f: [35] }), m("Pintando las calles", "Asesinato", 2, 4, "", { cat: "mis", f: [36] }),
  m("Robo de tienda de informática", "Encargo", 2, 4, "", { robo: "informatica", f: [37, 38] }), m("Socio incómodo", "Asesinato", 1, 2, "", { cat: "mis", f: [39] }),
  m("Transporte comprometido", "Destrucción", 1, 3, "", { cat: "mis", f: [40] }), m("Transportista de fondos", "Escolta", 1, 3, "", { cat: "mis", f: [41] }),
  m("Asalto a la armería de Morningwood", "Encargo", 2, 6, "", { robo: "ammu", f: [42] }), m("Asalto al matadero de Clucking Bell", "Encargo", 2, 4, "", { cat: "esp", f: [43, 44] }),
  m("Roba a ese paleto", "Encargo", 1, 4, "", { cat: "men", f: [45] }), m("Infiltrarse en el FIB", "Infiltración", 4, 8, "", { cat: "mis", f: [46] }),
  m("Robo a la armería de Industrias", "Encargo", 2, 6, "", { robo: "ammu", f: [47] }), m("Transporte de armas", "Entrega", 1, 2, "", { cat: "mis", f: [48] }),
  m("El último frasco", "Encargo", 1, 3, "", { cat: "men", f: [49] }), m("Sin preguntas", "Entrega", 1, 3, "", { cat: "mis", f: [50, 51] }),
  m("Fenta Express", "Encargo", 2, 4, "", { cat: "men", f: [52] }), m("Golpe Euforia", "Encargo", 1, 4, "", { cat: "men", f: [53] }),
  m("Infiltración y robo comisaría", "Infiltración", 4, 8, "", { robo: "comisaria", f: [54] }), m("Asalto armería de Paleto", "Encargo", 2, 6, "", { robo: "ammu", f: [55] }),
  m("Asalto al carguero del puerto", "Encargo", 2, 6, "", { robo: "carguero", f: [56] }), m("Materia prohibida", "Encargo", 1, 4, "", { cat: "men", f: [57] }),
  m("Robo a la comisaría de Sandy", "Encargo", 2, 6, "", { robo: "comisaria", f: [58] }), m("Asalto al carguero", "Encargo", 4, 8, "", { robo: "carguero", f: [59] }),
  m("Depósito clandestino Walker", "Encargo", 3, 8, "", { cat: "may", f: [60] }), m("Asalta al Remolcador", "Encargo", 4, 8, "", { cat: "esp", f: [61] }),
  m("Código M", "Encargo", 2, 6, "", { cat: "esp", f: [62] }), m("Proyecto Neón", "Encargo", 2, 4, "", { cat: "esp", f: [63] }),
  m("Murrieta Factory", "Encargo", 2, 6, "", { cat: "esp", off: true, f: [64] }), m("Bunker Calafia", "Encargo", 4, 8, "", { cat: "may", off: true, f: [65] }),
  m("El último vínculo", "Encargo", 3, 6, "", { cat: "may", f: [66] }), m("Operación Náufrago", "Encargo", 3, 6, "", { cat: "esp", off: true, f: [67] }),
  m("Robo de guante blanco en Sandy", "Infiltración", 6, 10, "", { cat: "may", f: [68] }), m("Control de masas (encargo)", "Encargo", 2, 4, "", { cat: "mis", f: [69] }),
  m("Pintando las calles (II)", "Asesinato", 2, 4, "", { cat: "mis", f: [70] }), m("Justicia comprada", "Asesinato", 2, 4, "", { cat: "mis", f: [71] }),
  m("Robo en Merryweather", "Persecución", 1, 4, "", { cat: "esp", off: true, f: [72] }), m("Robo sobre ruedas", "Robo de vehículo", 1, 3, "", { cat: "veh", f: [73] }),
  m("Robo coche custodiado", "Robo de vehículo", 1, 4, "", { cat: "veh", f: [74] }), m("Robo al gimnasio de Chumash", "Robo de establecimiento", 1, 4, "", { cat: "men", f: [75] }),
  m("Asalto al camión", "Robo de vehículo", 2, 4, "", { cat: "veh", f: [76] }), m("Boom Boom", "Encargo", 3, 3, "", { cat: "mis", f: [77] }),
  m("Acaba con Carlson", "Asesinato", 2, 6, "", { cat: "mis", f: [78] }), m("Va de SMG la cosa", "Encargo (persecución)", 2, 8, "", { cat: "may", f: [79] }),
  m("Robo 4x4", "Robo de vehículo", 1, 4, "", { cat: "veh", f: [80] }), m("Saqueo fúnebre", "Entrega", 1, 3, "", { cat: "mis", f: [81] }),
  m("Cárgate a ese sapo", "Asesinato", 1, 3, "", { cat: "mis", f: [82] }),
  m("Kilómetro 0", "Persecución (crew · Saskia)", 4, 8, "", { cat: "may", f: [83] }), m("Clásico y renovado", "Robo de vehículo", 1, 2, "", { cat: "veh", f: [84] }),
  m("High Class", "Robo de vehículo", 2, 4, "", { cat: "veh", f: [85] }), m("Null Operation", "Encargo", 2, 4, "", { cat: "esp", f: [86] }),
];
/* versión del catálogo: si la publicada en la base es de otra versión, Supervisores usa la nueva sin esperar a que six la vuelva a publicar */
export const ROBOS_V = 5;

/* ---------- la tablet manda: cada misión de la planilla se une con sus variantes de la tablet (jugadores y dinero de la tablet);
   las que solo están en la tablet entran como misiones nuevas ---------- */
/* la planilla unida con la tablet (solo con los datos de Gestión de ilícitos; sin ellos, la planilla sola y sin recompensas) */
export function misionesCon(T?: TabData | null): Mision[] {
  const L: Mision[] = MISIONES.map(m => ({ ...m, rec: T?.rec?.[m.n] || "" }));
  if (!T) return L;
  for (const t of T.mis) {
    const k = nk(t.n), mi = L.find(x => nk(x.n) === k);
    if (mi) { (mi.tab ||= []).push(t); continue; }
    L.push({ n: t.n, tipo: t.tipo, min: t.min, max: t.max, rec: "", f: [], cat: (t.cat as Cat) || "mis", robo: t.robo, tab: [t] });
  }
  for (const mi of L) {
    if (!mi.tab?.length) continue;
    mi.off = false; mi.min = Math.min(...mi.tab.map(t => t.min)); mi.max = Math.max(...mi.tab.map(t => t.max));
    const $ = [...new Set(mi.tab.map(t => t.$))].sort((a, b) => a - b).map(n => `${n.toLocaleString("es-AR")}$`), ex = mi.rec.includes("+") ? mi.rec.slice(mi.rec.indexOf("+") + 1).trim() : "";
    mi.rec = [$.join(" / "), ex].filter(Boolean).join(" + ");
  }
  return L;
}
/* para qué banda es cada robo: las etiquetas de sus misiones en la tablet */
export const bandasDe = (mis: Mision[]): Banda[] => BANDA_KEYS.filter(b => mis.some(m => m.tab?.some(t => t.b === b)));
/* lo de la tablet de un robo: nivel mínimo, policías en servicio que pide para arrancar y experiencia */
export function tabOf(mis: Mision[]) {
  const T = mis.flatMap(m => m.tab || []); if (!T.length) return null;
  const r = (L: number[]) => { const a = Math.min(...L), b = Math.max(...L); return a === b ? String(a) : `${a} a ${b}`; };
  const ord = ["sin", "cac", "pist", "grandes", "exp"] as const, arms = T.map(t => t.arm).filter(Boolean) as (typeof ord)[number][];
  /* el armamento más pesado de las misiones del robo (con qué se juega) */
  const arm = arms.length ? ord[Math.max(...arms.map(a => ord.indexOf(a)))] : undefined;
  return { nv: Math.min(...T.map(t => t.nv)), pt: r(T.map(t => t.pt)), xp: r(T.map(t => t.xp)), n: T.length, arm };
}
/* sedes de la tablet de cada robo (badulaques, licorerías, growshop, peluquerías…) */
export const sedesDe = (id: string, T?: TabData | null): TRobo[] => (T?.robos || []).filter(t => t.grp === id);

/* ---------- cruce ---------- */
const base = (n: string) => n.replace(/\s*\((II|encargo)\)$/i, "").toLowerCase();
/* el perfil de banda solo se deduce de la recompensa: ítems para droga → drogas · piezas de armas → armas */
export const perfilDe = (mi: Mision): "drogas" | "armas" | null => (/droga/i.test(mi.rec) ? "drogas" : /piezas/i.test(mi.rec) ? "armas" : null);
export type Nota = { t: "act" | "nuevo" | "rev" | "dup" | "sin"; x: string };
export type Item = Robo & { mis: Mision[]; min?: number; nuevo?: boolean; chg?: { de: number; a: number; f: number[] }; notas: Nota[]; ed?: { at: number; c: string[] } };
/* ediciones de six desde el catálogo (lspdt.six.robEdit, privado de six): pisan a la normativa y al Excel; se publican solas a Supervisores › Robos */
export type RobEdit = Partial<Pick<Robo, "n" | "max" | "pol" | "reh" | "blq" | "pv" | "mando" | "ilg" | "arm">> & { min?: number | null; at: number };
export const ROB_EDIT = "lspdt.six.robEdit";
/* historial de cambios de los robos (lspdt.six.robLog): cada edición o restauración, con qué cambió; se publica también a Supervisores */
export type RobLog = { t: number; id: string; n: string; c: string[]; r?: boolean };
export const ROB_LOG = "lspdt.six.robLog";
const DL: [keyof Item, string][] = [["n", "Nombre"], ["min", "Atracadores mín."], ["max", "Atracadores máx."], ["pol", "Policías máx."], ["reh", "Rehenes"], ["blq", "Bloqueo"], ["pv", "Vehículos policiales"], ["mando", "Mando"], ["ilg", "Vehículo"], ["arm", "Armas"]];
const PVN = ["patrulla", "interceptor", "helicóptero", "barco"];
const fmtV = (k: keyof Item, v: unknown): string => v == null || v === "" ? "—" : k === "blq" || k === "mando" ? (v ? "Sí" : "No") : k === "pv" ? ((v as boolean[]).map((x, i) => (x ? PVN[i] : "")).filter(Boolean).join(", ") || "ninguno")
  : k === "pol" ? `${v} (${unidades(v as number)})` : String(v);
/* qué cambió entre dos versiones de un robo, en texto */
export const robDiff = (a: Item, b: Item): string[] => DL.filter(([k]) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)).map(([k, l]) => `${l}: ${fmtV(k, a[k])} → ${fmtV(k, b[k])}`);
/* cambios fijos ya decididos (van aunque nadie edite): Galería de Arte pasa de 5 a 4 binomios */
const FIX: Record<string, Omit<RobEdit, "at">> = { galeria: { pol: 8 } };
const PV_DEF: Record<Cat, PV> = { rap: [true, true, false], men: [true, false, false], veh: [true, true, false], esp: [true, false, true], may: [true, true, true], mis: [true, true, false] };
/* misiones NO ACTIVO: quedan fuera del catálogo hasta que vuelvan */
export const inactivas = (T?: TabData | null) => misionesCon(T).filter(m => m.off);
/* el Excel es lo vigente: sus atracadores pisan a la normativa vieja y los robos que solo están en el Excel entran como nuevos
   (vehículo, armas, rehenes y policía según su categoría). Policías máx. = atracadores máx. + 2 */
export function catalogo(ED: Record<string, RobEdit> = {}, T?: TabData | null): Item[] {
  const out: Item[] = NORMATIVA.map(x => ({ ...x, mis: [], notas: [] })), MIS = misionesCon(T);
  for (const mi of MIS) {
    if (mi.off) continue;
    const it = mi.robo ? out.find(o => o.id === mi.robo) : undefined;
    if (it) { it.mis.push(mi); continue; }
    const cat = mi.cat || "mis", esp = cat === "esp" || cat === "may";
    out.push({ id: "m:" + mi.n, n: mi.n, cat, norm: false, nuevo: true, mis: [mi], ilg: ILG_DEF[cat], arm: ARM_DEF[cat], max: mi.max, pol: mi.max + 2, pv: PV_DEF[cat],
      reh: esp ? `Sí (1 a ${Math.max(2, mi.max - 1)})` : "No", blq: esp, mando: false, notas: [] });
  }
  for (const it of out) {
    if (it.mis.length) {
      it.min = Math.min(...it.mis.map(x => x.min));
      const top = Math.max(...it.mis.map(x => x.max));
      if (it.norm && it.max != null && top !== it.max) {
        it.chg = { de: it.max, a: top, f: it.mis.filter(x => x.max === top).flatMap(x => x.f) };
        const src = it.mis.some(x => x.max === top && x.tab) ? "la tablet" : `el Excel (fila ${it.chg.f.join(", ")})`;
        it.notas.push({ t: "act", x: `La normativa vieja decía ${it.max}; ${src} dice ${top}. Queda ${top} atracadores y ${top + 2} policías.` });
        it.max = top; it.pol = top + 2;
      }
    }
    const de = it.mis.some(x => !x.f.length) ? "de la tablet" : "del Excel";
    if (it.tab) it.notas.push({ t: "nuevo", x: `Robo activo de la tablet (${sedesDe(it.id, T).length} sedes), tipo badulaque: también lo hacen civiles. Parámetros propuestos como el Badulaque: ajustalos si no van.` });
    else if (it.nuevo) it.notas.push({ t: "nuevo", x: it.cat === "mis" ? `Misión ${de} (${it.mis[0].tipo.toLowerCase()}), no es un robo. Policías máx. ${it.pol}.` : `Robo nuevo ${de}. Vehículo, armas, rehenes y policía según ${CATS[it.cat].l}.` });
    else if (!it.mis.length && !sedesDe(it.id, T).length) it.notas.push({ t: "sin", x: "No tiene misión en el Excel: sin recompensa cargada." });
    for (const mi of it.mis) {
      if (/revisar|falta/i.test(mi.rec)) it.notas.push({ t: "rev", x: `«${mi.n}» (fila ${mi.f.join(", ")}): la recompensa está pendiente.` });
      if (mi.f.length > 1) it.notas.push({ t: "dup", x: `«${mi.n}» está repetida en las filas ${mi.f.join(" y ")} y no dice para qué banda es cada una.` });
      const tw = MIS.find(o => o !== mi && base(o.n) === base(mi.n));
      if (tw) it.notas.push({ t: "dup", x: `Mismo nombre que la fila ${tw.f[0]} (${tw.rec}): parece otra versión para otro perfil, sin especificar.` });
    }
    /* lo fijo y lo que edita six: lo último manda */
    const e = { ...(FIX[it.id] || {}), ...(ED[it.id] || {}) } as Partial<RobEdit>, c: string[] = [];
    const L: Record<string, string> = { n: "Nombre", min: "Atracadores mín.", max: "Atracadores máx.", pol: "Policías máx.", reh: "Rehenes", blq: "Bloqueo", pv: "Vehículos policiales", mando: "Mando", ilg: "Vehículo", arm: "Armas" };
    for (const k of Object.keys(L) as (keyof RobEdit)[]) { if (!(k in e) || e[k] === undefined) continue; const prev = JSON.stringify((it as Record<string, unknown>)[k]); if (prev === JSON.stringify(e[k])) continue;
      c.push(k === "pol" ? `${L[k]}: ${it.pol ?? "—"} → ${e.pol ?? "—"}` : k === "max" || k === "min" ? `${L[k]}: ${it[k] ?? "—"} → ${e[k] ?? "—"}` : L[k]); (it as Record<string, unknown>)[k] = e[k] ?? undefined; }
    if (c.length) { it.ed = { at: ED[it.id]?.at || 0, c }; it.notas.unshift({ t: "act", x: `${c.join(" · ")}.` }); }
  }
  return out;
}

/* las ediciones de six que ya están en una versión publicada (para no perderlas si cambia la versión del catálogo y six todavía no volvió a publicar) */
const ED_L: Record<string, keyof RobEdit> = { Nombre: "n", "Atracadores mín.": "min", "Atracadores máx.": "max", "Policías máx.": "pol", Rehenes: "reh", Bloqueo: "blq", "Vehículos policiales": "pv", Mando: "mando", Vehículo: "ilg", Armas: "arm" };
export function edOfPub(items?: Item[]): Record<string, RobEdit> {
  const o: Record<string, RobEdit> = {};
  for (const it of items || []) { if (!it.ed?.at) continue; const e: RobEdit = { at: it.ed.at };
    for (const c of it.ed.c) { const k = ED_L[c.split(":")[0].trim()]; if (k && k !== "at") (e as Record<string, unknown>)[k] = (it as Record<string, unknown>)[k] ?? null; }
    o[it.id] = e; }
  return o;
}
/* policías en unidades: binomios (2) y, si sobra uno, una unión */
export const unidades = (n?: number | null) => { if (!n) return ""; const b = Math.floor(n / 2), u = n % 2; return [b ? `${b} binomio${b > 1 ? "s" : ""}` : "", u ? "1 unión" : ""].filter(Boolean).join(" + "); };
/* recompensa: el dinero por un lado y lo extra (ítems para droga, piezas de armas, objetos) por otro */
const MONEY = /(\d[\d.,]*)\s*\$/;
const num = (s: string) => Number(s.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".")) || 0;
export function recOf(mis: Item["mis"]) {
  const amts = new Set<number>(), extra = new Set<string>(); let pend = false;
  for (const m of mis) {
    const r = m.rec, mm = r.match(MONEY); if (m.tab?.length) m.tab.forEach(t => amts.add(t.$)); else if (mm) amts.add(num(mm[1]));
    if (/revisar|falta/i.test(r)) pend = true;
    const ex = r.replace(/(\d[\d.,]*\s*\$\s*\/?\s*)+/g, "").replace(/revisar|falta hacerla|no activo/gi, "").replace(/^[\s+\-–·]+|[\s+\-–·]+$/g, "").trim();
    if (ex) extra.add(ex[0].toUpperCase() + ex.slice(1));
  }
  const L = [...amts].sort((a, b) => a - b), f = (n: number) => `$${n.toLocaleString("es-AR")}`;
  return { money: !L.length ? "" : L.length === 1 ? f(L[0]) : `${f(L[0])} – ${f(L[L.length - 1])}`, extra: [...extra], pend };
}

