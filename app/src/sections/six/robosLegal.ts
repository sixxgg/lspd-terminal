/* Articulado de cada robo: qué artículos del Código Penal de la terminal (apartado Legal) corresponden según cómo termine.
   - Tentativa: el artículo del robo en grado de tentativa.
   - Consumado: el robo + lo que se da siempre en ese robo (armas obligatorias a la vista, daños de la máquina, etc.).
   - Con disparos: lo consumado + atentado agravado contra agentes y homicidio en tentativa.
   - Según lo que pase: rehenes, armas permitidas que se muestren, huida, grupo, hackeo, explosivos, herramientas.
   Es una interpretación a partir de la normativa de robos y del Código Penal: el agente siempre ajusta a lo que pasó. */
import { penalOf, type Art } from "@/lib/penal";
import { WPN, type Cat, type Item } from "./robosData";

export type Ref = { a: string; why?: string };
type Cond = { k: string; l: string; when: string; arts: Ref[] };
type Ley = { tent: Ref[]; cons: Ref[]; hom: Ref[]; cond: Cond[]; nota?: string };

/* artículo principal de cada robo de la normativa */
const BASE: Record<string, Ref[]> = {
  tumbas: [{ a: "142.38", why: "Saquear tumbas es profanar sepulturas" }, { a: "132.6", why: "Se fuerza la tumba para sacar los objetos" }],
  expend: [{ a: "132.6", why: "Se fuerza la máquina para sacar el dinero" }, { a: "132.47", why: "Rompe la máquina" }],
  cabinas: [{ a: "132.6", why: "Se fuerza la cabina para sacar el dinero" }, { a: "132.47", why: "Rompe la cabina" }],
  parqui: [{ a: "132.103", why: "El parquímetro es un bien público" }, { a: "132.47", why: "Rompe el parquímetro" }],
  badulaque: [{ a: "132.110" }, { a: "132.102", why: "Si abren la caja fuerte del local" }],
  grow: [{ a: "132.129" }], informatica: [{ a: "132.130" }], granja: [{ a: "132.129", why: "Granja de cultivo" }], farmacia: [{ a: "132.130" }],
  furgonmat: [{ a: "132.131" }], textil: [{ a: "132.108" }], furgonfleeca: [{ a: "132.131", why: "Furgón de transporte de caudales" }],
  importacion: [{ a: "132.105" }], piezas: [{ a: "132.6", why: "Se desarman piezas de un vehículo ajeno" }, { a: "132.47", why: "Daña el vehículo" }],
  boostbcd: [{ a: "132.104" }], boosta: [{ a: "132.105", why: "Clase A o más: alta gama" }],
  lavanderia: [{ a: "132.113" }], pawn: [{ a: "132.113", why: "Casa de empeños" }], cambio: [{ a: "132.113" }],
  establo: [{ a: "132.11", why: "No tiene artículo propio: robo violento en edificio o local" }],
  joyeria: [{ a: "132.132" }], union: [{ a: "132.108", why: "Union Depository" }], casa: [{ a: "132.107" }],
  yate: [{ a: "132.106" }], carguero: [{ a: "132.106" }],
  ammu: [{ a: "132.115" }], comisaria: [{ a: "132.145" }, { a: "132.121", why: "Se llevan armamento del Estado" }],
  humane: [{ a: "132.127", why: "Material sensible de laboratorio" }], smitty: [{ a: "132.143", why: "Almacén de mercancías" }],
  fleecasur: [{ a: "132.117" }], paleto: [{ a: "132.117", why: "No tiene artículo propio: entidad bancaria con hackers" }],
  gsbank: [{ a: "132.142", why: "Gran Banco de Sandy (Grand Señora)" }], galeria: [{ a: "132.116" }],
  maze: [{ a: "132.118" }], pacific: [{ a: "132.118" }], bobcat: [{ a: "132.135" }],
  tren: [{ a: "132.126", why: "Carga de un vehículo industrial" }, { a: "143.15", why: "Daños que interrumpen el ferrocarril" }],
  casino: [{ a: "132.119", why: "Salón de juegos" }],
};
/* robos y misiones que solo están en la planilla: por nombre */
const MIS: [RegExp, Ref[]][] = [
  [/jester/i, [{ a: "132.105", why: "Deportivo de alta gama" }]],
  [/coche custodiado/i, [{ a: "132.17", why: "Se quita el coche con violencia a quien lo custodia" }]],
  [/asalto al cami[oó]n/i, [{ a: "132.126" }]],
  [/furgoneta|garant[ií]a|embargado|sobre ruedas|4x4/i, [{ a: "132.104" }]],
  [/semillas/i, [{ a: "132.143" }]], [/auto shop|santos custom/i, [{ a: "132.138" }]], [/jack & jill/i, [{ a: "132.110" }]],
  [/roba a ese paleto/i, [{ a: "132.107" }]], [/clucking bell|matadero/i, [{ a: "132.140" }]], [/vanilla/i, [{ a: "132.141" }]],
  [/gimnasio/i, [{ a: "132.137" }]], [/walker/i, [{ a: "132.127", why: "Depósito clandestino" }]], [/guante blanco/i, [{ a: "132.142", why: "Interpretado: golpe en Sandy" }]],
  [/frasco|fenta|euforia|materia prohibida|c[oó]digo m|ne[oó]n/i, [{ a: "132.134", why: "La recompensa son ítems para droga" }]],
  [/smg la cosa/i, [{ a: "132.12", why: "Robo con armas y persecución" }]], [/[uú]ltimo v[ií]nculo/i, [{ a: "132.12", why: "Interpretado: golpe armado" }]],
  [/ajuste de cuentas|deudor|socio inc[oó]modo|sapo|carlson|pintando|justicia comprada|chatarreros/i, [{ a: "119.3", why: "Encargo para matar a alguien" }]],
  [/control de masas/i, [{ a: "119.3" }, { a: "143.9", why: "Violencia en grupo en la vía pública" }]],
  [/tractor|desaparecer el cami[oó]n|activo quemado|transporte comprometido/i, [{ a: "132.55", why: "Destruir con fuego o explosión" }]],
  [/boom boom/i, [{ a: "132.56", why: "Explosión con peligro para personas" }]],
  [/contabilidad|dinero en movimiento/i, [{ a: "132.90", why: "Mover dinero ilícito" }]], [/transporte de armas/i, [{ a: "143.23" }]],
  [/sin preguntas/i, [{ a: "138.21" }]], [/saqueo f[uú]nebre/i, [{ a: "142.38" }]],
  [/escolta|auditor|transportista de fondos/i, [{ a: "143.28", why: "Proteger a un grupo que comete delitos" }]],
  [/mercanc[ií]a|ca[ií]da libre/i, [{ a: "141.6", why: "Encubrir o mover lo de otro delito" }]],
  [/hospital/i, [{ a: "129.15", why: "Entrar a un local para dejar una puerta trasera" }]],
  [/fib/i, [{ a: "129.15" }, { a: "144.19", why: "Sacar información clasificada" }]],
];
/* armas: [blanca, pistola, escopeta, SMG, fusil] → artículo por mostrarla en público */
const W_ART = ["143.42", "143.46", "143.55", "143.55", "143.56"], W_L = ["Arma blanca", "Pistola", "Escopeta", "SMG", "Fusil"];
const HACK = new Set(["informatica", "fleecasur", "paleto", "gsbank", "galeria", "maze", "pacific", "bobcat", "union"]);
const BOOM = new Set(["paleto", "gsbank", "maze", "pacific", "bobcat", "union", "carguero", "tren", "fleecasur"]);
const TOOLS = new Set<Cat>(["rap", "men", "veh"]);

const baseOf = (it: Item): Ref[] => BASE[it.id] || MIS.find(([r]) => r.test(it.n))?.[1] || [{ a: "132.11", why: "Sin artículo propio: robo violento en edificio o local" }];
const uniq = (L: Ref[]) => L.filter((x, i) => L.findIndex(y => y.a === x.a) === i && !!penalOf(x.a));

export function leyOf(it: Item): Ley {
  const all0 = baseOf(it), base = all0.filter(r => !/^Si /.test(r.why || "")), extra = all0.filter(r => /^Si /.test(r.why || "")), w = it.arm ? WPN[it.arm] : undefined, mis = it.cat === "mis";
  const obl = w ? w.map((v, i) => (v === 2 ? i : -1)).filter(i => i >= 0) : [], perm = w ? w.map((v, i) => (v === 1 ? i : -1)).filter(i => i >= 0) : [];
  const armObl: Ref[] = mis ? [] : [...new Set(obl.map(i => W_ART[i]))].map(a => ({ a, why: `${obl.filter(i => W_ART[i] === a).map(i => W_L[i]).join(" / ")} obligatoria en este robo` }));
  const cons = uniq([...base, ...armObl]);
  const cond: Cond[] = [];
  if (!mis && it.reh && !/^(no|—|-)$/i.test(it.reh.trim()))
    cond.push({ k: "reh", l: "Rehenes", when: `Si toman rehenes (${it.reh})`, arts: [{ a: "124.1", why: "Retener a una persona contra su voluntad" }, { a: "124.5", why: "Si piden algo a cambio de soltarlos (negociación)" }] });
  const pa = [...new Set(perm.map(i => W_ART[i]).filter(a => !armObl.some(o => o.a === a)))];
  if (pa.length && !mis) cond.push({ k: "arm", l: "Armas", when: "Si muestran armas permitidas que no son obligatorias", arts: pa.map(a => ({ a, why: perm.filter(i => W_ART[i] === a).map(i => W_L[i]).join(" / ") })) });
  if (extra.length) cond.push({ k: "otro", l: "Además", when: "Según cómo lo hagan", arts: extra });
  if (HACK.has(it.id)) cond.push({ k: "hack", l: "Hackeo", when: "Si hackean sistemas o puertas", arts: [{ a: "129.7" }] });
  if (BOOM.has(it.id)) cond.push({ k: "boom", l: "Explosivos", when: "Si usan explosivos (termitas, cargas)", arts: [{ a: "143.48" }, { a: "132.55" }] });
  if (TOOLS.has(it.cat)) cond.push({ k: "tools", l: "Herramientas", when: "Si los detienen con ganzúas, taladro o similares", arts: [{ a: "143.47" }] });
  if ((it.max || 0) >= 3) cond.push({ k: "grp", l: "Grupo", when: "Si actúan 3 o más", arts: [{ a: "143.28", why: "Grupo criminal" }, ...(it.cat === "may" ? [{ a: "143.26", why: "Si es una banda organizada con jerarquía" }] : [])] });
  cond.push({ k: "huida", l: "Huida", when: "Si escapan de la policía", arts: [{ a: "143.52" }, { a: "138.31", why: "Si la huida en vehículo pone en peligro a otros" }, { a: "143.39", why: "Si se resisten al ser detenidos" }] });
  return {
    tent: base.map(r => ({ a: r.a, why: "En grado de tentativa" })).filter(r => penalOf(r.a)),
    cons,
    hom: uniq([...cons, { a: "143.3", why: "Disparos contra agentes (atentado agravado)" }, { a: "119.1", why: "Contra civiles o rehenes, en grado de tentativa" }]),
    cond: cond.map(c => ({ ...c, arts: uniq(c.arts) })).filter(c => c.arts.length),
    nota: [...base].find(r => /interpretado|sin artículo propio|no tiene artículo propio/i.test(r.why || ""))?.why,
  };
}
export const art = (a: string): Art | undefined => penalOf(a);
export const pena = (x?: Art) => (!x ? "" : [x.m ? `$${x.m.toLocaleString("es-AR")}` : "", x.p ? `${x.p} meses` : ""].filter(Boolean).join(" · ") || "Sin pena fija");
