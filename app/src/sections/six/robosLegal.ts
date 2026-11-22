/* Articulado de cada robo: qué artículos del Código Penal de la terminal corresponden según cómo termine.
   Regla principal: muchos artículos de robo YA TRAEN sus agravantes («con agravantes como uso de armas, rostro cubierto o
   huida de la justicia»). Lo que el artículo ya contempla NO se imputa aparte (sería castigar dos veces lo mismo):
   la pena del artículo del robo ya lo cubre. Solo se suma por separado lo que el artículo no menciona.
   - Tentativa: el artículo del robo en grado de tentativa.
   - Consumado: el robo + lo que pasa siempre en ese robo y el artículo no cubre (ej: armas obligatorias a la vista).
   - Con disparos: lo consumado + atentado agravado (143.3), salvo que el artículo ya tenga «abrir fuego contra los agentes».
   - Rehenes: casi siempre son NPC y salen con el comando IC /dados (número del 1 al 6): eso NO se imputa. El 124.1 va solo si el rehén
     es un jugador (persona física), y por eso queda como condicional, nunca en el consumado.
   - Según lo que pase: rehén jugador, armas, vehículo robado, hackeo, explosivos, herramientas, grupo, CK y huida.
   Es una guía armada desde la normativa de robos y el Código Penal: el agente ajusta a lo que pasó. */
import { penalOf, type Art } from "@/lib/penal";
import { WPN, type Cat, type Item } from "./robosData";

export type Ref = { a: string; why?: string };
/* inc: si el artículo del robo ya lo contempla, el texto que lo explica (y arts queda vacío) · alt: va EN LUGAR del artículo principal */
type Cond = { k: string; l: string; when: string; arts: Ref[]; inc?: string; alt?: boolean };
type Inc = { k: string; l: string; a: string };
export type Ley = { base: Ref[]; tent: Ref[]; cons: Ref[]; hom: Ref[]; cond: Cond[]; inc: Inc[]; nota?: string };

/* artículo principal de cada robo de la normativa */
const BASE: Record<string, Ref[]> = {
  tumbas: [{ a: "142.38", why: "Saquear tumbas es violar sepulturas" }, { a: "132.6", why: "Se fuerza la tumba para sacar los objetos" }],
  expend: [{ a: "132.6", why: "Se fuerza la máquina para sacar el dinero (el daño de forzarla ya va incluido)" }],
  cabinas: [{ a: "132.6", why: "Se fuerza la cabina para sacar el dinero (el daño de forzarla ya va incluido)" }],
  parqui: [{ a: "132.103", why: "El parquímetro es un bien público" }],
  "tab:pelu": [{ a: "132.110", why: "Peluquería: pequeño comercio" }], "tab:ropa": [{ a: "132.110", why: "Tienda de ropa: pequeño comercio" }], "tab:tatto": [{ a: "132.110", why: "Tienda de tatuajes: pequeño comercio" }],
  "tab:antig": [{ a: "132.110", why: "Tienda de antigüedades: pequeño comercio" }], "tab:cajas": [{ a: "132.102", why: "Se fuerzan cajas o contenedores para sacar lo de adentro" }],
  badulaque: [{ a: "132.110" }, { a: "132.102", why: "Si además abren la caja fuerte del local" }],
  grow: [{ a: "132.129" }], informatica: [{ a: "132.130" }], granja: [{ a: "132.129", why: "Granja de cultivo" }], farmacia: [{ a: "132.130" }],
  furgonmat: [{ a: "132.131" }], textil: [{ a: "132.108" }], furgonfleeca: [{ a: "132.131", why: "Furgón de transporte de caudales" }],
  importacion: [{ a: "132.105" }], piezas: [{ a: "132.6", why: "Se desarman piezas de un vehículo ajeno" }],
  boostbcd: [{ a: "132.104" }], boosta: [{ a: "132.105", why: "Clase A o más: alta gama" }],
  lavanderia: [{ a: "132.113" }], pawn: [{ a: "132.113", why: "Casa de empeños" }], cambio: [{ a: "132.113" }],
  establo: [{ a: "132.12", why: "Sin artículo propio: robo violento con uso de armas (la pistola es obligatoria)" }],
  joyeria: [{ a: "132.132" }], union: [{ a: "132.108", why: "Union Depository" }], casa: [{ a: "132.107" }],
  yate: [{ a: "132.106" }], carguero: [{ a: "132.106" }],
  ammu: [{ a: "132.115" }], comisaria: [{ a: "132.145", why: "Incluye llevarse armas y equipo policial" }],
  humane: [{ a: "132.127", why: "Material sensible de laboratorio" }], smitty: [{ a: "132.143", why: "Almacén de mercancías" }],
  fleecasur: [{ a: "132.117" }], paleto: [{ a: "132.117", why: "Interpretado: entidad bancaria con hackers (no tiene artículo propio)" }],
  gsbank: [{ a: "132.142", why: "Gran Banco de Sandy (Grand Señora)" }], galeria: [{ a: "132.116" }],
  maze: [{ a: "132.118" }], pacific: [{ a: "132.118" }], bobcat: [{ a: "132.135" }],
  tren: [{ a: "132.126", why: "Carga de un vehículo industrial" }, { a: "143.15", why: "Daños que interrumpen el ferrocarril" }],
  casino: [{ a: "132.119", why: "Salón de juegos" }],
};
/* robo que tiene otra sede con otro artículo: va EN LUGAR del principal */
const ALT: Record<string, Cond> = {
  ammu: { k: "alt", l: "Otra armería", when: "Si es la armería de Morningwood, de la zona de industrias o de Paleto", arts: [{ a: "132.144", why: "Armería de gran arsenal: va en lugar del 132.115" }], alt: true },
  casa: { k: "alt", l: "Casa de lujo", when: "Si es una residencia de lujo", arts: [{ a: "132.125", why: "Va en lugar del 132.107" }], alt: true },
};
/* robos y misiones que solo están en la planilla: por nombre */
const MIS: [RegExp, Ref[]][] = [
  [/jester/i, [{ a: "132.105", why: "Deportivo de alta gama" }]],
  [/coche custodiado/i, [{ a: "132.17", why: "Se quita el coche con violencia a quien lo custodia" }]],
  [/asalto al cami[oó]n/i, [{ a: "132.126" }]],
  [/furgoneta|garant[ií]a|embargado|sobre ruedas|4x4/i, [{ a: "132.104" }]],
  [/semillas/i, [{ a: "132.143" }]], [/auto shop|santos custom/i, [{ a: "132.138" }]], [/jack & jill/i, [{ a: "132.110" }]],
  [/roba a ese paleto/i, [{ a: "132.107" }]], [/clucking bell|matadero/i, [{ a: "132.140" }]], [/remolcador/i, [{ a: "132.106", why: "Asalto a una embarcación (antes, Vanilla Unicorn)" }]],
  [/gimnasio/i, [{ a: "132.137" }]], [/walker/i, [{ a: "132.127", why: "Depósito clandestino" }]], [/guante blanco/i, [{ a: "132.142", why: "Interpretado: golpe en Sandy" }]],
  [/frasco|fenta|euforia|materia prohibida|c[oó]digo m|ne[oó]n/i, [{ a: "132.134", why: "La recompensa son ítems para droga" }]],
  [/smg la cosa|kil[oó]metro 0/i, [{ a: "132.12", why: "Robo con armas y persecución" }]], [/cl[aá]sico y renovado/i, [{ a: "132.104" }]], [/high class/i, [{ a: "132.105", why: "Vehículo de alta gama" }]], [/[uú]ltimo v[ií]nculo/i, [{ a: "132.12", why: "Interpretado: golpe armado" }]],
  [/ajuste de cuentas|deudor|socio inc[oó]modo|sapo|carlson|pintando|justicia comprada|chatarreros/i, [{ a: "119.6", why: "Encargo para matar a alguien (objetivo NPC); si es un jugador con CK, ver CK" }]],
  [/control de masas/i, [{ a: "119.6", why: "Encargo para matar (objetivos NPC)" }, { a: "143.9", why: "Violencia en grupo en la vía pública" }]],
  [/tractor|desaparecer el cami[oó]n|activo quemado|transporte comprometido/i, [{ a: "132.55", why: "Destruir con fuego o explosión" }]],
  [/boom boom/i, [{ a: "132.56", why: "Explosión con peligro para personas" }]],
  [/contabilidad|dinero en movimiento/i, [{ a: "132.90", why: "Mover dinero ilícito" }]], [/transporte de armas/i, [{ a: "143.23" }]],
  [/sin preguntas/i, [{ a: "138.21" }]], [/saqueo f[uú]nebre/i, [{ a: "142.38" }]],
  [/escolta|auditor|transportista de fondos/i, [{ a: "143.28", why: "Proteger a un grupo que comete delitos" }]],
  [/mercanc[ií]a|ca[ií]da libre/i, [{ a: "141.6", why: "Encubrir o mover lo de otro delito" }]],
  [/hospital/i, [{ a: "129.15", why: "Entrar a un local para dejar una puerta trasera" }]],
  [/fib/i, [{ a: "129.15" }, { a: "144.19", why: "Sacar información clasificada" }]],
];
/* agravantes que el texto del artículo ya contempla */
const AGR: [string, string, RegExp][] = [
  ["arm", "Uso o portación de armas", /uso de armas|portar armas|portaci[oó]n de armas|armas largas|hiciere uso de armas|empleo de armas/i],
  ["fuego", "Abrir fuego contra los agentes", /abrir fuego contra los funcionarios/i],
  ["rostro", "Rostro cubierto", /rostro (cubierto|oculto)/i],
  ["huida", "Huida de la justicia", /hu(ida|ir) de la justicia|resistencia o huida/i],
  ["hack", "Intrusión informática (hackeo)", /intrusi[oó]n inform[aá]tica|hackers|intrusi[oó]n en los sistemas/i],
  ["grp", "Actuar en grupo u organización", /grupo organizado|integrado en una organizaci[oó]n|organizaci[oó]n o grupo criminal/i],
  ["tools", "Herramientas de robo", /herramientas de robo/i],
  ["veh", "Uso de vehículos robados", /veh[ií]culos robados/i],
  ["reh", "Toma de rehenes", /rehenes/i],
];
/* armas: [blanca, pistola, escopeta, SMG, fusil] → artículo por mostrarla en público */
const W_ART = ["143.42", "143.46", "143.55", "143.55", "143.56"], W_L = ["Arma blanca", "Pistola", "Escopeta", "SMG", "Fusil"];
const HACK = new Set(["informatica", "fleecasur", "paleto", "gsbank", "galeria", "maze", "pacific", "bobcat", "union"]);
const BOOM = new Set(["paleto", "gsbank", "maze", "pacific", "bobcat", "union", "carguero", "tren", "fleecasur"]);
const TOOLS = new Set<Cat>(["rap", "men", "veh"]);
const STOLEN = new Set<Cat>(["men", "esp", "may"]);

const baseOf = (it: Item): Ref[] => {
  if (BASE[it.id]) return BASE[it.id];
  const m = MIS.find(([r]) => r.test(it.n)); if (m) return m[1];
  /* sin artículo propio: con arma de fuego obligatoria es robo con armas; si no, robo violento en local */
  const w = it.arm ? WPN[it.arm] : undefined;
  return w && w.slice(1).some(v => v === 2) ? [{ a: "132.12", why: "Sin artículo propio: robo violento con uso de armas" }] : [{ a: "132.11", why: "Sin artículo propio: robo violento en edificio o local" }];
};
const uniq = (L: Ref[]) => L.filter((x, i) => L.findIndex(y => y.a === x.a) === i && !!penalOf(x.a));

export function leyOf(it: Item): Ley {
  const all0 = baseOf(it), base = all0.filter(r => !/^Si /.test(r.why || "")), extra = all0.filter(r => /^Si /.test(r.why || "")), w = it.arm ? WPN[it.arm] : undefined, mis = it.cat === "mis";
  /* qué agravantes ya trae el artículo del robo (y cuál de ellos lo dice) */
  const inc: Inc[] = [];
  for (const [k, l, re] of AGR) { const by = base.find(r => re.test(penalOf(r.a)?.d || "")); if (by) inc.push({ k, l, a: by.a }); }
  const has = (k: string) => inc.find(x => x.k === k), incTxt = (k: string) => { const x = has(k); return x ? `Ya lo contempla el ${x.a} como agravante: no se imputa aparte.` : undefined; };
  const obl = w ? w.map((v, i) => (v === 2 ? i : -1)).filter(i => i >= 0) : [], perm = w ? w.map((v, i) => (v === 1 ? i : -1)).filter(i => i >= 0) : [];
  const armObl: Ref[] = mis || has("arm") ? [] : [...new Set(obl.map(i => W_ART[i]))].map(a => ({ a, why: `${obl.filter(i => W_ART[i] === a).map(i => W_L[i]).join(" / ")} obligatoria en este robo` }));
  const cons = uniq([...base, ...armObl]);
  const cond: Cond[] = [];
  const add = (k: string, l: string, when: string, arts: Ref[], ik = k) => cond.push(incTxt(ik) ? { k, l, when, arts: [], inc: incTxt(ik) } : { k, l, when, arts });
  if (ALT[it.id]) cond.push(ALT[it.id]);
  if (!mis && it.reh && !/^(no|—|-)$/i.test(it.reh.trim()))
    add("reh", "Rehén jugador", `Solo si el rehén es un jugador (persona física). Los rehenes NPC salen por /dados (1 a 6) y no se imputan`, [{ a: "124.1", why: "Retener a un jugador contra su voluntad" }, { a: "124.5", why: "Si piden algo a cambio de soltarlo (negociación)" }]);
  if (!mis && w) {
    const pa = [...new Set(perm.map(i => W_ART[i]).filter(a => !armObl.some(o => o.a === a)))];
    if (has("arm")) add("arm", "Armas", "Si muestran o usan armas (obligatorias o permitidas)", [], "arm");
    else if (pa.length) add("arm", "Armas", "Si muestran armas permitidas que no son obligatorias", pa.map(a => ({ a, why: perm.filter(i => W_ART[i] === a).map(i => W_L[i]).join(" / ") })));
  }
  if (extra.length) cond.push({ k: "otro", l: "Además", when: "Según cómo lo hagan", arts: extra });
  if (!mis && STOLEN.has(it.cat)) add("veh", "Vehículo robado", "Si usan un vehículo robado para el robo o la huida", [{ a: "132.104" }]);
  if (HACK.has(it.id)) add("hack", "Hackeo", "Si hackean sistemas o puertas", [{ a: "129.7" }]);
  if (BOOM.has(it.id)) cond.push({ k: "boom", l: "Explosivos", when: "Si usan explosivos (termitas, cargas)", arts: [{ a: "143.48", why: "Tener los explosivos" }, { a: "132.55", why: "Los daños por la explosión" }] });
  if (TOOLS.has(it.cat)) add("tools", "Herramientas", "Si los detienen con ganzúas, taladro o similares", [{ a: "143.47" }]);
  if ((it.max || 0) >= 3) add("grp", "Grupo", "Si actúan 3 o más", [{ a: "143.28", why: "Grupo criminal" }, ...(it.cat === "may" ? [{ a: "143.26", why: "Si es una banda organizada con jerarquía" }] : [])]);
  /* homicidio doloso solo cuando muere un jugador con CK (Character Kill), nunca por un NPC */
  cond.push({ k: "ck", l: "CK", when: "Si matan a un jugador con CK (Character Kill). Por un NPC no se aplica", arts: [{ a: "119.1", why: "Muerte de un jugador con CK" }, { a: "119.17", why: "Si el CK es a un agente en servicio (en lugar del 119.1)" }] });
  /* huida: la evasión la puede cubrir el artículo; la conducción temeraria y la resistencia física son delitos aparte */
  const hu: Ref[] = [...(has("huida") ? [] : [{ a: "143.52", why: "Escapar de la policía" }]), { a: "138.31", why: "Si la huida en vehículo pone en peligro a otros" }, ...(/resistencia/i.test(base.map(r => penalOf(r.a)?.d).join(" ")) ? [] : [{ a: "143.39", why: "Si se resisten físicamente al ser detenidos" }])];
  cond.push({ k: "huida", l: "Huida", when: "Si escapan de la policía", arts: hu, inc: has("huida") ? `La huida ya la contempla el ${has("huida")!.a}: no se suma el 143.52. Lo de abajo sí va aparte.` : undefined });
  const fuego = has("fuego");
  return {
    base,
    tent: base.map(r => ({ a: r.a, why: "En grado de tentativa" })).filter(r => penalOf(r.a)),
    cons,
    hom: fuego ? cons : uniq([...cons, { a: "143.3", why: "Disparos contra agentes (atentado agravado)" }]),
    cond: cond.map(c => ({ ...c, arts: uniq(c.arts) })).filter(c => c.arts.length || c.inc),
    inc,
    nota: [base.find(r => /interpretado|sin artículo propio/i.test(r.why || ""))?.why, fuego ? `Disparar a los agentes ya es agravante del ${fuego.a}: no se suma el 143.3.` : ""].filter(Boolean).join(" ") || undefined,
  };
}
export const art = (a: string): Art | undefined => penalOf(a);
export const pena = (x?: Art) => (!x ? "" : [x.m ? `$${x.m.toLocaleString("es-AR")}` : "", x.p ? `${x.p} meses` : ""].filter(Boolean).join(" · ") || "Sin pena fija");

/* versión oficial (Supervisores › Robos): el catálogo con su articulado, guardado en la base (lspdt.robos) por six */
export type PubItem = Item & { ley: Ley };
export type RobosPub = { at: number; by: string; items: PubItem[]; v?: number; log?: import("./robosData").RobLog[] };
export const pubItems = (all: Item[]): PubItem[] => all.map(it => ({ ...it, ley: leyOf(it) }));
