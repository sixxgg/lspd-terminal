/* Acceso a los datos de cada división, controlado en el servidor (no solo en la pantalla).
   · Los datos de una división (registros, uniformidad, instrucciones, comunicados, pizarras, expedientes…) solo los lee y escribe quien está en su roster.
   · Las pestañas que la coordinación dejó «Solo coordinación» tampoco se mandan a los miembros.
   · Roster, roles y pestañas visibles de una división: solo los edita su coordinación.
   La administración ve y edita todo. Los rosters (nombres y roles) los ven todos: con eso se arma el menú y los perfiles. */

/* divisiones con roster genérico: padre (para las subdivisiones), uniformidad e indicador de la METRO */
export const GEN = {
  asb: { u: "x-administration-services-bureau" }, hsiu: { u: "x-high-speed-interception-unit" }, db: { u: "x-detective-bureau" },
  htcu: { p: "db", u: "x-high-tech-crime-unit" }, gnd: { p: "db", u: "x-gang-and-narcotics-division" }, mcd: { p: "db", u: "x-major-crimes-division" },
  swat: { p: "md", f: "swat", u: "x-special-weapons-and-tactics" }, bs: { p: "md", f: "bq", u: "x-bomb-squad" }, mdso: { p: "md", u: "x-metropolitan-drone-support-operations" },
  cnt: { p: "md", f: "cnt", u: "x-crisis-negotiation-team" }, udu: { p: "md", f: "udu", u: "udu" },
  rtd: { u: "rtd" },
};
const UNITS = ["asd", "k9", "psb", "md", "rtd"];
const UNI_OF = Object.fromEntries([...Object.entries(GEN).map(([id, g]) => [g.u, id]), ...UNITS.map(k => [k, k])]);
const CO_DEF = ["coord", "subcoord"];

/* rosters y roles iniciales (se guardan la primera vez que alguien entra) */
const R = (k, l, c, co) => (co ? { k, l, c, co: true } : { k, l, c });
export const ROLES_SEED = {
  asb: [R("coord", "Coordinación", "#e2c66a", 1), R("subcoord", "Subcoordinación", "#f3dc95", 1), R("agente", "Agente ASB", "#5b93b8"), R("asp", "Aspirante", "#8a8f97")],
  hsiu: [R("coord", "Coordinador", "#ef4444", 1), R("subcoord", "Subcoordinador", "#f59e0b", 1), R("inst", "Instructor", "#2fbf68"), R("miembro", "Miembro", "#5b93b8")],
  db: [R("coord", "Coordinación", "#e2c66a", 1), R("subcoord", "Subcoordinación", "#f3dc95", 1), R("det", "Detective", "#7c9fe0"), R("asp", "Aspirante", "#8a8f97")],
  cnt: [R("coord", "Coordinador C.N.T", "#a855f7", 1), R("neg", "Negociador C.N.T", "#c084fc"), R("asp", "Aspirante C.N.T", "#8a8f97")],
  rtd: [R("coord", "Coordinación", "#e2c66a", 1), R("subcoord", "Subcoordinador", "#f3dc95", 1), R("mfto", "Master Field Training Officer", "#d4a937"),
    R("fto", "Field Training Officer", "#b3262a"), R("miembro", "Miembro de la RTD", "#8a8f97")],
};
const m = (o, r) => Object.fromEntries(o.map(n => [n, r]));
export const ROSTER_SEED = {
  asb: { ...m(["Lara Calloway", "Evelyn Molina"], "coord"), ...m(["Austin Royce", "Hailey Deacon", "Kai Jeon-Soo", "Madison Pierce", "Noah Smith", "Olivia Molina", "Ryan Westbrook", "Tyler Walker", "Yooa Baek-Harrington"], "agente") },
  hsiu: { "William Weston": "coord", "Tariq Okafor": "subcoord", ...m(["Antonio Santos", "Darwin Ford", "Madison Lopez", "Matthew Coleman"], "inst"),
    ...m(["Evelyn Molina", "Ryan Westbrook", "Lloyd Burnett", "Liam Campbell", "Madison Wells", "Clancy Skinner", "Khalan Smith", "Tyler Walker", "Daniel López", "Ethan Roggers", "Ryan Sullivan", "Oliver Callahan", "Mike Brooks"], "miembro") },
  db: m(["Vega Chambers", "David Doakes", "Miles Campbell"], "det"),
  mdso: { "Ryan Westbrook": "coord", "Kai Jeon-Soo": "coord" },
  cnt: m(["Antonio Santos", "Charles Jhonson Smith", "Khalan Smith", "Lara Calloway", "Madison Pierce"], "neg"),
  rtd: { "Lara Calloway": "coord", "Daniel López": "subcoord", ...m(["Charles Jhonson Smith", "Derek McGarrett", "Elioth Smith", "Evelyn Molina", "Kai Jeon-Soo", "Kane Anderson", "Khalan Smith",
    "Liam Campbell", "Madison Pierce", "Madison Wells", "Matthew Coleman", "Miles Campbell", "Ryan Westbrook", "William Weston", "Yooa Baek-Harrington"], "fto") },
};
/* personal administrativo de la ASB (civiles: no están en el roster policial) */
const ADM = ["Alisson Wood", "Allison Badwa", "Emma Gallag", "Leslie Brown", "Mariano Gar", "Moisés Gonz"];
export const REC_SEED = { "lspdt.drec.asb.adm2": ADM.map((n, i) => ({ id: "adm" + i, t: 1762950000000 + i, by: "sistema", n, puesto: "Administrativo", area: "", est: "Activo", desde: "", tel: "",
  nota: n === "Leslie Brown" ? "" : "Apellido incompleto: completarlo." })) };
export const CALL_SEED = { db: { "Vega Chambers": "WHISKEY-01", "David Doakes": "WHISKEY-02", "Miles Campbell": "WHISKEY-03" } };
/* subdivisiones de la METRO: salen de su roster (UDU: six en coordinación) */
const MD_SUBS = { swat: ["Derek McGarrett", "Evelyn Molina", "Ryan Westbrook", "Liam Campbell", "Tariq Okafor", "Lloyd Burnett", "Charles Jhonson Smith", "Antonio Santos"],
  bq: ["Derek McGarrett", "Evelyn Molina"], cnt: ["Derek McGarrett", "Evelyn Molina", "Ryan Westbrook", "Liam Campbell"], udu: ["Derek McGarrett", "Evelyn Molina", "Ryan Westbrook", "Liam Campbell"] };
export function seedFor(id, md) {
  if (ROSTER_SEED[id]) return ROSTER_SEED[id];
  const f = GEN[id]?.f; if (!f) return {};
  const o = Object.fromEntries((MD_SUBS[f] || []).map(n => [n, "ofi"]));
  for (const [n, r] of Object.entries(md || {})) if (Array.isArray(r) && r.includes(f)) o[n] = "ofi";
  if (id === "udu" && o["Ryan Westbrook"]) o["Ryan Westbrook"] = "coord";
  return o;
}

/* lo que cada sesión sabe de las divisiones genéricas: {gm: {id: rol}, gco: [ids], hide: {div: [pestañas]}} */
export function genInfo(n, rows, md) {
  const js = v => { try { return JSON.parse(v); } catch { return null; } };
  const G = {}; for (const r of rows || []) G[r.k] = js(r.v);
  const gm = {}, gco = [], hide = {}, nocoord = [];
  for (const id of Object.keys(GEN)) {
    const ros = G["lspdt.groster." + id] || seedFor(id, md), roles = G["lspdt.groles." + id] || ROLES_SEED[id];
    const isCoR = x => (Array.isArray(roles) ? roles.some(y => y && y.k === x && y.co) : CO_DEF.includes(x));
    if (!Object.values(ros || {}).some(isCoR)) nocoord.push(id);
    const r = ros && ros[n]; if (!r) continue; gm[id] = r;
    if (isCoR(r)) gco.push(id);
  }
  for (const [k, v] of Object.entries(G)) if (k.startsWith("lspdt.divacc.") && v && Array.isArray(v.hide)) hide[k.slice(13)] = v.hide;
  return { gm, gco, hide, nocoord };
}

const UNIT_MEM = { asd: u => u.asd, k9: u => u.k9, psb: u => u.psb, md: u => u.md, rtd: u => u.rtd };
const UNIT_CO = { asd: u => u.asdCoord, k9: u => u.k9Coord, psb: u => u.psbCo, md: u => u.mdCoord, rtd: u => (u.gco || []).includes("rtd") };
export function isMem(d, u) {
  if (!u) return false; if (u.admin) return true;
  if (UNIT_MEM[d]) return !!UNIT_MEM[d](u);
  const g = GEN[d]; if (!g) return true;
  return !!u.gm?.[d] || (!!g.p && isMem(g.p, u));
}
export function isCo(d, u) {
  if (!u) return false; if (u.admin) return true;
  if (UNIT_CO[d]) return !!UNIT_CO[d](u);
  const g = GEN[d]; if (!g) return false;
  return (u.gco || []).includes(d) || (!!g.p && isCo(g.p, u));
}

/* a qué división (y pestaña) pertenece una clave; null = no es de una división */
const FIX = { "lspdt.asdVuelos": ["asd", "log"], "lspdt.asdExam": ["asd", "exa"], "lspdt.k9Reg": ["k9", "log"], "lspdt.k9Dogs": ["k9", "ros"], "lspdt.psbCases": ["psb", ""],
  "lspdt.psbIds": ["psb", ""], "lspdt.rtdEnt": ["rtd", "list"], "lspdt.mdx.armas": ["md", "arm"] };
function keyDiv(k) {
  if (FIX[k]) return { d: FIX[k][0], tab: FIX[k][1] };
  let x;
  if ((x = /^lspdt\.drec\.([a-z0-9]+)\.([a-z0-9]+)$/.exec(k))) return { d: x[1], tab: x[2] === "tel" ? "conv" : x[2] };
  if ((x = /^lspdt\.unif\.(.+)$/.exec(k))) return UNI_OF[x[1]] ? { d: UNI_OF[x[1]], tab: "uni" } : null;
  if ((x = /^lspdt\.instr\.([a-z0-9]+)$/.exec(k))) return { d: x[1], tab: "ins" };
  if ((x = /^lspdt\.comms\.([a-z0-9]+)$/.exec(k))) return { d: x[1], tab: "com" };
  if ((x = /^lspdt\.mdx\./.exec(k))) return { d: "md", tab: "" };
  if ((x = /^lspdt\.boards?\.([a-z0-9]+)(\.|$)/.exec(k))) return x[1] === "gen" ? null : { d: x[1], tab: "" };
  return null;
}
export function divRead(k, u) {
  if (!u || u.admin) return !!u;
  const t = keyDiv(k); if (!t) return true;
  if (!isMem(t.d, u)) return false;
  if (t.tab === "arm" && !isCo(t.d, u)) return false; /* armamento de la METRO: solo su coordinación */
  return !(t.tab && (u.hide?.[t.d] || []).includes(t.tab) && !isCo(t.d, u));
}
/* motivo por el que no puede escribir (o null) */
export function divWrite(k, u) {
  let x;
  /* el roster y sus indicativos: solo la coordinación de esa misma división (la administración, solo si todavía no tiene coordinación) */
  if ((x = /^lspdt\.(groster|gcall)\.([a-z0-9-]+)$/.exec(k))) return u.owner || (u.gco || []).includes(x[2]) || (u.admin && (u.nocoord || []).includes(x[2])) ? null : "Solo la coordinación de la división puede cambiar su roster";
  if (u.admin) return null;
  /* calendario abierto a todo el departamento: la ASB y cualquier coordinación */
  if (k === "lspdt.calpub") return isMem("asb", u) || Object.keys(UNIT_CO).some(d => isCo(d, u)) || (u.gco || []).length ? null : "Solo la ASB o una coordinación pueden cargar eventos para todo el departamento";
  if ((x = /^lspdt\.(groles|divacc)\.([a-z0-9-]+)$/.exec(k))) return isCo(x[2], u) ? null : "Solo la coordinación de la división puede cambiar los roles y las pestañas";
  const t = keyDiv(k); if (!t) return null;
  if (!divRead(k, u)) return "Solo los miembros de la división";
  if ((t.tab === "uni" || (t.d === "mdso" && t.tab === "lic") || (t.tab === "cal" && t.d !== "asb")) && !isCo(t.d, u)) return "Solo la coordinación de la división";
  return null;
}
