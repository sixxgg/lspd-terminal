import { LS, DEF_ROSTER, type Agent } from "./store";
export type { Agent };
import gta from "./gta.json";
import { DEPT, onDept } from "./dept";
import { isXRank, xInsSvg } from "./xins";

export const LEVEL: Record<string, number> = {
  "Chief of Police": 13, "Assistant Chief": 12, "Deputy Chief": 11, "Commander": 10, "Captain": 9, "Lieutenant": 8,
  "Sergeant II": 7, "Sergeant I": 6, "Detective III": 5.5, "Detective II": 5, "Detective I": 4.5,
  "Police Officer III+": 4, "Police Officer III": 3, "Police Officer II": 2, "Police Officer I": 1, "Administrativo": 0,
  /* LSSD y SAHP: su nivel equivalente en la escala del LSPD (mismas reglas de rango en los tres; igual que en el servidor, lib/lssd.js) */
  "Sheriff": 13, "Undersheriff": 12, "Assistant Sheriff": 11.5, "Division Chief": 11, "Area Commander": 10, "Sergeant": 7,
  "Deputy Sheriff Master FTO": 4, "Deputy Sheriff Bonus II": 3, "Deputy Sheriff Bonus I": 2, "Deputy Sheriff": 1, "Deputy Sheriff Trainee": 0.5,
  "Commissioner": 13, "Deputy Commissioner": 12, "Assistant Commissioner": 11.5, "Chief": 11, "Officer": 1, "Cadet": 0.5,
};
const RANK_ES: Record<string, string> = {
  "Chief of Police": "Jefe de Policía", "Assistant Chief": "Jefe Adjunto", "Deputy Chief": "Jefe Supervisor", "Commander": "Comandante",
  "Captain": "Capitán", "Lieutenant": "Teniente I", "Sergeant II": "Sargento II", "Sergeant I": "Sargento I", "Detective III": "Detective III",
  "Detective II": "Detective II", "Detective I": "Detective I", "Police Officer III+": "Oficial III+", "Police Officer III": "Oficial III",
  "Police Officer II": "Oficial II", "Police Officer I": "Oficial I", "Administrativo": "Administrativo",
};
export const RANK_COLOR: Record<string, string> = {
  "Chief of Police": "#818cf8", "Assistant Chief": "#6366f1", "Deputy Chief": "#4f6df5", "Commander": "#3b82f6", "Captain": "#ef4444",
  "Lieutenant": "#f59e0b", "Sergeant II": "#ec4899", "Sergeant I": "#f472b6", "Detective III": "#a855f7", "Detective II": "#9f7aea",
  "Detective I": "#c084fc", "Police Officer III+": "#3b82f6", "Police Officer III": "#3b82f6", "Police Officer II": "#3b82f6",
  "Police Officer I": "#3b82f6", "Administrativo": "#94a3b8",
  "Sheriff": "#e3b33c", "Undersheriff": "#d4a937", "Assistant Sheriff": "#c99a2e", "Division Chief": "#b8892a", "Area Commander": "#22c55e", "Sergeant": "#ec4899",
  "Deputy Sheriff Master FTO": "#10b981", "Deputy Sheriff Bonus II": "#34d399", "Deputy Sheriff Bonus I": "#4ade80", "Deputy Sheriff": "#16a34a", "Deputy Sheriff Trainee": "#94a3b8",
};
const INSIG: Record<string, string> = {
  "Police Officer III": "po3", "Police Officer III+": "po3p", "Sergeant I": "sgt1", "Sergeant II": "sgt2", "Detective I": "det1",
  "Detective II": "det2", "Detective III": "det3", "Lieutenant": "lt", "Captain": "cap", "Commander": "cmd", "Deputy Chief": "dep",
  "Assistant Chief": "asst", "Chief of Police": "chief",
};
export const insigniaUrl = (r: string) => (INSIG[r] && DEPT.id === "lspd" ? `/ins/${INSIG[r]}.webp?v=2` : isXRank(r) ? xInsSvg(r) : "");
const GROUPS_LSPD: Record<string, { l: string; r: string[] }> = {
  jef: { l: "Jefatura", r: ["Chief of Police", "Assistant Chief", "Deputy Chief", "Commander"] },
  cap: { l: "Capitanía", r: ["Captain", "Lieutenant"] },
  sup: { l: "Supervisores", r: ["Sergeant II", "Sergeant I"] },
  det: { l: "Detectives", r: ["Detective III", "Detective II", "Detective I"] },
  ofi: { l: "Patrulleros", r: ["Police Officer III+", "Police Officer III", "Police Officer II", "Police Officer I"] },
};
/* grupos del LSSD como en su planilla (mismas claves que el LSPD: las secciones filtran por ellas) */
const GROUPS_LSSD: Record<string, { l: string; r: string[] }> = {
  jef: { l: "Executive Staff", r: ["Sheriff", "Undersheriff", "Assistant Sheriff", "Division Chief", "Area Commander"] },
  cap: { l: "Command Staff", r: ["Captain", "Lieutenant"] },
  sup: { l: "Supervisor Staff", r: ["Sergeant"] },
  det: { l: "Deputies", r: ["Deputy Sheriff Master FTO", "Deputy Sheriff Bonus II", "Deputy Sheriff Bonus I"] },
  ofi: { l: "Deputy Sheriff", r: ["Deputy Sheriff", "Deputy Sheriff Trainee"] },
};
const GROUPS_SAHP: Record<string, { l: string; r: string[] }> = {
  jef: { l: "Executive Staff", r: ["Commissioner", "Deputy Commissioner", "Assistant Commissioner", "Chief"] },
  cap: { l: "Command Staff", r: ["Captain", "Lieutenant"] },
  sup: { l: "Supervisor Staff", r: ["Sergeant"] },
  ofi: { l: "Officers", r: ["Officer", "Cadet"] },
};
export const GROUPS: Record<string, { l: string; r: string[] }> = { ...GROUPS_LSPD };
const FEM = new Set(["Claire Robinson", "Madison Wells", "Vega Chambers", "Evelyn Molina", "Lara Calloway", "Madison Pierce", "Yooa Baek-Harrington",
  "Naia Bishop", "Haley Brenner-Scott", "Olivia Molina", "Morvanna Montenegro", "Madison Lopez", "Hailey Deacon", "Mía Johnson", "May-Lin Chen",
  "Jia Li Chen", "Violet Faith", "Alessia Lennox"]);

export const lvl = (r?: string) => (r ? LEVEL[r] ?? 0 : 0);
export const rankES = (r?: string) => (r ? (DEPT.id === "lspd" && RANK_ES[r]) || r : ""); /* en el LSSD y la SAHP, en inglés como su planilla */
export const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const emailOf = (n: string) => norm(n).replace(/[^a-z0-9]/g, "") + "@sanandreas.eu";
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

/* roster del departamento activo (en el LSSD, sin los perros del K-9: esos se ven en su roster y en su división) */
let K9F: [unknown, Agent[]] = [null, []];
export function getRoster(): Agent[] {
  const a = LS.ro<Agent[] | null>("lspdt.roster", null);
  if (DEPT.id !== "lspd") { if (!Array.isArray(a)) return []; if (K9F[0] !== a) K9F = [a, a.filter(x => x && x.r !== "K-9")]; return K9F[1]; }
  return Array.isArray(a) && a.length ? a : DEF_ROSTER;
}
export const findAgent = (n: string) => getRoster().find(a => a.n === n) || null;

type Prof = { g?: string; foto?: string; div?: string[]; main?: string; ph?: { x: number; y: number; z: number } | null };
export const profOf = (n: string): Prof => (LS.ro<Record<string, Prof>>("lspdt.profiles", {})[n] || {});
/* nombres de pila femeninos habituales: para agentes nuevos que todavía no están en la lista */
const FEM_FIRST = new Set(["ana", "maria", "sofia", "lucia", "laura", "julia", "elena", "valentina", "camila", "isabella", "isabel", "emma", "olivia", "mia", "chloe", "emily", "sarah", "sara",
  "jessica", "jennifer", "ashley", "amanda", "hannah", "abigail", "madison", "hailey", "haley", "evelyn", "lara", "claire", "violet", "alessia", "naia", "vega", "morvanna", "yooa", "may-lin",
  "jia", "natalia", "paula", "carla", "andrea", "daniela", "gabriela", "victoria", "alice", "alicia", "grace", "lily", "zoe", "ava", "amelia", "charlotte", "scarlett", "nora", "lena",
  "rose", "rachel", "rebecca", "megan", "lauren", "nicole", "samantha", "stephanie", "vanessa", "veronica", "monica", "karen", "linda", "susan", "kate", "katherine", "kim", "luna", "aria", "ella"]);
export const genderOf = (n: string) => profOf(n).g || (FEM.has(n) || FEM_FIRST.has(norm(n.split(/\s+/)[0])) ? "f" : "m");
export const fotoOf = (n: string) =>
  LS.get("lspdt.foto." + n) || profOf(n).foto || LS.get("lspdt.img.avatar_" + genderOf(n)) || LS.get("lspdt.img.avatar") || "";

/* imágenes guardadas en base64: se pasan a blob: una sola vez (el navegador las decodifica y cachea una vez, no por cada tarjeta) */
const BLOB = new Map<string, string>();
export function srcOf(u: string) {
  if (!u || !u.startsWith("data:") || u.length < 4096) return u;
  const h = u.length + ":" + u.slice(-64), hit = BLOB.get(h); if (hit) return hit;
  try { const [m, b] = u.split(","), bin = atob(b), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([a], { type: m.slice(5).split(";")[0] })); if (BLOB.size > 400) BLOB.clear(); BLOB.set(h, url); return url; } catch { return u; }
}

/* imágenes externas: Vercel las entrega en el tamaño justo (si falla, se usa la original) */
export const imgOpt = (u: string, w: number) => u.startsWith("data:") ? srcOf(u) :
  location.protocol === "https:" && !/^(localhost|127\.)/.test(location.hostname) && /^https?:\/\//i.test(u)
    ? `/_vercel/image?url=${encodeURIComponent(u)}&w=${w}&q=75` : u;

export const LUGARES: string[] = [...gta.zonas, ...gta.calles];
export const DIVISIONES: string[] = [];

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const hoyDMY = () => { const d = new Date(); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
export const isDMY = (s: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(s);
/* fecha y hora completas (dd/mm/aaaa hh:mm, 24 h) */
export const fullDT = (t: number | string | Date) => new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const fmtDate = (t: number) => new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
/* tiempo relativo: «hace 10 minutos», «hace 3 días»; pasado el mes, fecha y hora en la zona de quien lo mira */
export const ago = (t: number, now = Date.now()) => {
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return "recién"; if (m < 60) return `hace ${m} ${m === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24); if (d <= 30) return `hace ${d} ${d === 1 ? "día" : "días"}`;
  return new Date(t).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
/* escritura guiada de fechas y horas */
export const maskDMY = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 8); return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
export const maskHM = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d; };

/* carreras y permisos */
export const LADDER = ["Police Officer I", "Police Officer II", "Police Officer III", "Police Officer III+", "Sergeant I", "Sergeant II", "Lieutenant", "Captain", "Commander", "Deputy Chief", "Assistant Chief", "Chief of Police"];
export const DET = ["Detective I", "Detective II", "Detective III"];
export const DET_MIN = 8;
export const RK_EN: Record<string, string> = { "Chief of Police": "COP", "Assistant Chief": "AC", "Deputy Chief": "DC", "Commander": "CMDR", "Captain": "CPT", "Lieutenant": "LT", "Sergeant II": "SGT II", "Sergeant I": "SGT I",
  "Detective III": "DET III", "Detective II": "DET II", "Detective I": "DET I", "Police Officer III+": "PO III+", "Police Officer III": "PO III", "Police Officer II": "PO II", "Police Officer I": "PO I" };
/* abreviatura de rango como en la radio del servidor (PO III. · Det. II. · Sgt. I.); de Teniente para arriba va completo */
export const RK_AB: Record<string, string> = { "Police Officer I": "PO I.", "Police Officer II": "PO II.", "Police Officer III": "PO III.", "Police Officer III+": "PO III+.",
  "Detective I": "Det. I.", "Detective II": "Det. II.", "Detective III": "Det. III.", "Sergeant I": "Sgt. I.", "Sergeant II": "Sgt. II." };
/* idioma del rango en los textos (preferencia de cada uno, igual que en la clásica) */
export const rkTxt = (r: string) => (LS.get("lspdt.rankLang") === "es" ? rankES(r) : r);
export type Exc = Record<string, { t1080?: boolean; psb?: boolean; [k: string]: unknown }>;
export const excOf = () => LS.json<Exc>("lspdt.exc", {});
export const joinY = (a: string[]) => (a.length < 2 ? a[0] || "" : a.slice(0, -1).join(", ") + " y " + a[a.length - 1]);
export const apellido = (n: string) => String(n).trim().split(/\s+/).slice(1).join(" ") || n;
export const rkFem = (r: string, n: string) => { let s = rankES(r); if (genderOf(n) === "f") s = s.replace(/^Capitán\b/, "Capitana").replace(/^Jefe\b/, "Jefa"); return s; };
export const dcIdOfAgent = (a?: Agent | null) => { const d = String(a?.i || a?.d || "").trim(); return /^\d{15,21}$/.test(d) ? d : ""; };

const DIVS_LSPD: [string, string[]?][] = [["Detective Bureau", ["High Tech Crime Unit", "Gang and Narcotics Division", "Major Crimes Division"]],
  ["Metropolitan Division", ["Special Weapons And Tactics", "SIERRA", "Pelotón H", "Bomb Squad", "Metropolitan Drone Support Operations", "Crisis Negotiation Team", "Underwater Dive Unit"]],
  ["Air Support Division"], ["Administration Services Bureau"], ["High Speed Interception Unit"], ["Recruitment and Training Division"], ["Professional Standards Bureau"], ["K-9 Division"]];
/* LSSD: «Bureaus / Divisions» de Eleven (las mismas que lib/divs.js en el servidor) */
const DIVS_LSSD: [string, string[]?][] = [["Special Enforcement Bureau", ["Special Weapons Team", "Sniper Detail", "Explosives Detail", "Hazardous Materials Detail", "Subsurface Operations Detail"]],
  ["Aero Bureau"], ["Canine Service Detail"], ["Crisis Negotiation Unit"],
  ["Detective Division", ["Homicide Bureau", "Major Crimes Bureau", "Narcotics Bureau", "Special Victims Bureau", "Fraud and Cyber Crimes Bureau", "Gang Enforcement Team", "Operation Safe Streets Detail", "Gang Surveillance Unit"]],
  ["Training Bureau"], ["Sheriff Information Bureau"], ["High Speed Interception Unit"], ["Social Reintegration Division"]];
/* divisiones del departamento activo (cambian con el departamento, sin recargar) */
export const DIVS: [string, string[]?][] = [...DIVS_LSPD];
export const ALL_DIVS: string[] = DIVS.flatMap(d => [d[0], ...(d[1] || [])]);
const DIV_INFO: Record<string, [string, string]> = {
  "Detective Bureau": ["DB", "#7c3aed"], "High Tech Crime Unit": ["HTCU", "#b8975a"], "Gang and Narcotics Division": ["GND", "#3f8f3a"], "Major Crimes Division": ["MCD", "#d4a937"], "Metropolitan Division": ["METRO", "#1f6fb0"],
  "Special Weapons And Tactics": ["SWAT", "#111827"], "SIERRA": ["SIERRA", "#b45309"], "Pelotón H": ["PEL. H", "#0e7490"], "Bomb Squad": ["BS", "#b91c1c"], "Metropolitan Drone Support Operations": ["MDSO", "#0f766e"], "Crisis Negotiation Team": ["CNT", "#9333ea"], "Underwater Dive Unit": ["UDU", "#b7985d"],
  "Air Support Division": ["ASD", "#1b8cb9"], "Administration Services Bureau": ["ASB", "#475569"], "High Speed Interception Unit": ["HSIU", "#dc2626"], "Recruitment and Training Division": ["RTD", "#b3262a"],
  "Professional Standards Bureau": ["PSB", "#1e3a8a"], "K-9 Division": ["K-9", "#1f8f4a"] };
const DIV_INFO_LSSD: Record<string, [string, string]> = { "Special Enforcement Bureau": ["SEB", "#15803d"], "Special Weapons Team": ["SWT", "#111827"], "Sniper Detail": ["SNIPER", "#4d7c0f"],
  "Explosives Detail": ["EOD", "#b91c1c"], "Hazardous Materials Detail": ["HAZMAT", "#ca8a04"], "Subsurface Operations Detail": ["SOD", "#0e7490"], "Aero Bureau": ["AB", "#0284c7"],
  "Canine Service Detail": ["K-9", "#1f8f4a"], "Crisis Negotiation Unit": ["CNU", "#9333ea"], "Detective Division": ["DD", "#7c3aed"], "Homicide Bureau": ["HB", "#991b1b"], "Major Crimes Bureau": ["MCB", "#d4a937"],
  "Narcotics Bureau": ["NB", "#3f8f3a"], "Special Victims Bureau": ["SVB", "#be185d"], "Fraud and Cyber Crimes Bureau": ["FCCB", "#b8975a"], "Gang Enforcement Team": ["GET", "#57534e"],
  "Operation Safe Streets Detail": ["OSS", "#0f766e"], "Gang Surveillance Unit": ["GSU", "#334155"], "Training Bureau": ["TB", "#b45309"], "Sheriff Information Bureau": ["SIB", "#2563eb"],
  "High Speed Interception Unit": ["HSIU", "#d4a017"], "Social Reintegration Division": ["SRD", "#1e3a8a"] };
const DIV_INFO_LSPD = { ...DIV_INFO };
const DIVISIONES_LSPD = ["Patrulla", "Detective Bureau", "Metropolitan Division", "Air Support Division", "K-9 Division", "High Speed Interception Unit",
  "Recruitment and Training Division", "Professional Standards Bureau", "Administration Services Bureau"];
export const divAb = (d: string) => DIV_INFO[d] || [d.split(/\s+/).map(w => w[0]).join("").slice(0, 4).toUpperCase(), "#334155"];
const DIV_LOGO: Record<string, string> = { "Recruitment and Training Division": "rtd", "Underwater Dive Unit": "udu", "Metropolitan Division": "metro", "Major Crimes Division": "mcd", "High Tech Crime Unit": "htcu", "Gang and Narcotics Division": "gnd", "Air Support Division": "asd" };
/* logo de la San Andreas Training Division: uno solo para los tres departamentos (lo sube six o la administración) */
export const SATD_LOGO = "lspdt.satd.logo";
export const divEmblem = (d: string) => d === "San Andreas Training Division" ? srcOf(LS.get(SATD_LOGO) || "") : srcOf(LS.get("lspdt.divlogo." + d) || "") || (DEPT.id === "lspd" ? (DIV_LOGO[d] ? `/div/${DIV_LOGO[d]}.webp?v=3` : "") : DIV_INFO_LSSD[d] && DEPT.id === "lssd" ? `/next/sdiv/${slugOf(d)}.${SDIV_PNG.has(d) ? "webp?v=2" : "svg?v=1"}` : "");
/* LSSD: escudos oficiales (los que mandó el departamento); el resto, el dibujo de siempre */
const SDIV_PNG = new Set(["Training Bureau", "Aero Bureau", "Special Enforcement Bureau", "Sheriff Information Bureau", "Canine Service Detail", "Detective Division", "High Speed Interception Unit", "Social Reintegration Division"]);
const slugOf = (d: string) => d.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const isoToDMY = (s?: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
/* AAAA-MM-DD → DD/MM/AAAA */
export const dmy = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "—");
export function dmyToISO(s: string) {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(String(s).trim()); if (!m) return null;
  const d = +m[1], mo = +m[2], y = m[3].length === 2 ? 2000 + +m[3] : +m[3], dt = new Date(y, mo - 1, d);
  if (y < 2000 || y > 2100 || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}
export const unixOf = (d: string, h = "00:00") => (d ? Math.floor(new Date(`${d}T${h || "00:00"}`).getTime() / 1000) : 0);
export const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const nkey = (n: string) => norm(n).replace(/[^a-z0-9]/g, "");
export const findLoose = (n: string) => findAgent(n) || getRoster().find(a => nkey(a.n) === nkey(n)) || null;
/* borradores y preferencias de formularios: por persona (nadie hereda lo que dejó otro en la misma computadora) */
export const myKey = (k: string, n: string) => `lspdt.next.${k}.${n.replace(/[^A-Za-z0-9]/g, "")}`;

/* divisiones de cada departamento (Administración › Marca: escudos que faltan cambiar) */
export const deptDivNames = (d: string) => (d === "lssd" ? DIVS_LSSD : d === "sahp" ? [] : DIVS_LSPD).flatMap(x => [x[0], ...(x[1] || [])]);
export const hasDivFile = (d: string, dept: string) => (dept === "lspd" ? !!DIV_LOGO[d] : false);
/* al cambiar de departamento: grupos de rango y divisiones del nuevo (se cambian en el lugar: todo lo que los importó ve los nuevos) */
function swapDept() {
  const G = DEPT.id === "lssd" ? GROUPS_LSSD : DEPT.id === "sahp" ? GROUPS_SAHP : GROUPS_LSPD;
  for (const k of Object.keys(GROUPS)) delete GROUPS[k]; Object.assign(GROUPS, G);
  const DV = DEPT.id === "lssd" ? DIVS_LSSD : DEPT.id === "sahp" ? [] : DIVS_LSPD;
  DIVS.splice(0, DIVS.length, ...DV); ALL_DIVS.splice(0, ALL_DIVS.length, ...DV.flatMap(d => [d[0], ...(d[1] || [])]));
  for (const k of Object.keys(DIV_INFO)) delete DIV_INFO[k]; Object.assign(DIV_INFO, DEPT.id === "lssd" ? DIV_INFO_LSSD : DIV_INFO_LSPD);
  DIVISIONES.splice(0, DIVISIONES.length, ...(DEPT.id === "lspd" ? DIVISIONES_LSPD : ["Patrulla", ...DV.map(d => d[0])]));
}
swapDept(); onDept(swapDept);
