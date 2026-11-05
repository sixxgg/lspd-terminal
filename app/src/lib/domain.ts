import { LS, DEF_ROSTER, type Agent } from "./store";
import gta from "./gta.json";

export const LEVEL: Record<string, number> = {
  "Chief of Police": 13, "Assistant Chief": 12, "Deputy Chief": 11, "Commander": 10, "Captain": 9, "Lieutenant": 8,
  "Sergeant II": 7, "Sergeant I": 6, "Detective III": 5.5, "Detective II": 5, "Detective I": 4.5,
  "Police Officer III+": 4, "Police Officer III": 3, "Police Officer II": 2, "Police Officer I": 1, "Administrativo": 0,
};
export const RANK_ES: Record<string, string> = {
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
};
const INSIG: Record<string, string> = {
  "Police Officer III": "po3", "Police Officer III+": "po3p", "Sergeant I": "sgt1", "Sergeant II": "sgt2", "Detective I": "det1",
  "Detective II": "det2", "Detective III": "det3", "Lieutenant": "lt", "Captain": "cap", "Commander": "cmd", "Deputy Chief": "dep",
  "Assistant Chief": "asst", "Chief of Police": "chief",
};
export const insigniaUrl = (r: string) => (INSIG[r] ? `/ins/${INSIG[r]}.webp?v=2` : "");
export const GROUPS: Record<string, { l: string; r: string[] }> = {
  jef: { l: "Jefatura", r: ["Chief of Police", "Assistant Chief", "Deputy Chief", "Commander"] },
  cap: { l: "Capitanía", r: ["Captain", "Lieutenant"] },
  sup: { l: "Supervisores", r: ["Sergeant II", "Sergeant I"] },
  det: { l: "Detectives", r: ["Detective III", "Detective II", "Detective I"] },
  ofi: { l: "Oficiales", r: ["Police Officer III+", "Police Officer III", "Police Officer II", "Police Officer I"] },
};
const FEM = new Set(["Claire Robinson", "Madison Wells", "Vega Chambers", "Evelyn Molina", "Lara Calloway", "Madison Pierce", "Yooa Baek-Harrington",
  "Naia Bishop", "Haley Brenner-Scott", "Olivia Molina", "Morvanna Montenegro", "Madison Lopez", "Hailey Deacon", "Mía Johnson", "May-Lin Chen",
  "Jia Li Chen", "Violet Faith", "Alessia Lennox"]);

export const lvl = (r?: string) => (r ? LEVEL[r] ?? 0 : 0);
export const rankES = (r?: string) => (r ? RANK_ES[r] || r : "");
export const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const emailOf = (n: string) => norm(n).replace(/[^a-z0-9]/g, "") + "@sanandreas.eu";
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

export function getRoster(): Agent[] {
  const a = LS.json<Agent[] | null>("lspdt.roster", null);
  return Array.isArray(a) && a.length ? a : DEF_ROSTER;
}
export const findAgent = (n: string) => getRoster().find(a => a.n === n) || null;

type Prof = { g?: string; foto?: string; div?: string[]; main?: string; ph?: { x: number; y: number; z: number } | null };
export const profOf = (n: string): Prof => (LS.json<Record<string, Prof>>("lspdt.profiles", {})[n] || {});
export const genderOf = (n: string) => profOf(n).g || (FEM.has(n) ? "f" : "m");
export const fotoOf = (n: string) =>
  LS.get("lspdt.foto." + n) || profOf(n).foto || LS.get("lspdt.img.avatar_" + genderOf(n)) || LS.get("lspdt.img.avatar") || "";

/* imágenes externas: Vercel las entrega en el tamaño justo (si falla, se usa la original) */
export const imgOpt = (u: string, w: number) =>
  location.protocol === "https:" && !/^(localhost|127\.)/.test(location.hostname) && /^https?:\/\//i.test(u)
    ? `/_vercel/image?url=${encodeURIComponent(u)}&w=${w}&q=75` : u;

export const LUGARES: string[] = [...gta.zonas, ...gta.calles];
export const DIVISIONES = ["Patrulla", "Detective Bureau", "Metropolitan Division", "Air Support Division", "K-9 Division", "High Speed Interception Unit",
  "Recruitment and Training Division", "Professional Standards Bureau", "Administration Services Bureau"];

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const hoyDMY = () => { const d = new Date(); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
export const isDMY = (s: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(s);
export const fmtDate = (t: number) => new Date(t).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
/* escritura guiada de fechas y horas */
export const maskDMY = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 8); return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
export const maskHM = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d; };
