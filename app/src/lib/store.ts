/* Datos compartidos del departamento: misma API, mismas claves y misma fusión que la versión clásica,
   así las dos versiones conviven sobre la misma base de datos sin pisarse. */
import { cacheClear, cacheSave } from "./cache";
import { useSyncExternalStore } from "react";
import { mergeText } from "./merge.js";
import { api } from "./api";

type Dict = Record<string, string>;
const CACHE: Dict = {};
const BASE: Dict = {};
const KT: Record<string, number> = {};
let SYNC_T = 0;
let ONLINE = false;
let version = 0;
const subs = new Set<() => void>();
/* dueño de la copia local (cache.ts): se guarda unos segundos después de cada cambio */
let OWN = "";
const bump = () => { version++; subs.forEach(f => f()); if (OWN && !PREV.on) cacheSave(() => ({ owner: OWN, store: { ...BASE }, kt: { ...KT }, t: SYNC_T })); };

/* claves que viven solo en este navegador (igual que en la versión clásica) */
const LOCAL = /^lspdt\.(session|accounts|theme|frame|rankLang|seenVersion|area|sec\..*|agView|upd.*|iconpng|fix\..*|patrol|recent|altFirma|altDraft|cursor|accent|crt|crtI|rtdDraft|dvc|psbCargo|infDraft|next\..*)$/;
const isLocal = (k: string) => LOCAL.test(k);
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

type NetState = "ok" | "saving" | "off";
let net: NetState = "ok";
const setNet = (s: NetState) => { if (net !== s) { net = s; bump(); } };
export const getNet = () => net;

/* departamentos: las secciones usan siempre las claves del LSPD (lspdt.*); en el LSSD y la SAHP se leen y escriben en lspdt.<depto>.*.
   Lo compartido (marca, Legal, Pizarra, robos, lo privado de six) es igual para los tres. Lo mismo decide el servidor (lib/core.js, SHARED_KEY). */
/* las imágenes (logos, fondos, íconos) son de cada departamento; los perfiles, uno solo para los tres */
const SHARED = /^lspdt\.(ui|lib|six|anita|penal|legacc|boards?|miro|robos|uprof|ucom|uvis|ufolt?|uverif|xcal|decorx|clasic|satd|lssd|sahp)(\.|$)/;
let KD = "";
export function setKeyDept(d: string) { const n = d === "lspd" ? "" : d; if (n === KD) return; KD = n; RO.clear(); bump(); }
/* la clave real en la base para el departamento activo (y la de otro departamento, para las vistas que juntan los tres) */
export const dk = (k: string, d = KD) => (!d || d === "lspd" || isLocal(k) || SHARED.test(k) || !k.startsWith("lspdt.") ? k : `lspdt.${d}.${k.slice(6)}`);
const undk = (k: string) => (KD && k.startsWith(`lspdt.${KD}.`) ? "lspdt." + k.slice(7 + KD.length) : k);

const RO = new Map<string, [string, unknown]>();
export const LS = {
  get(k: string): string | null {
    if (isLocal(k)) { try { return localStorage.getItem(k); } catch { return null; } }
    k = dk(k); return has(CACHE, k) ? CACHE[k] : null;
  },
  /* leer la clave de otro departamento tal cual (calendario con los tres departamentos) */
  raw(k: string): string | null { return has(CACHE, k) ? CACHE[k] : null; },
  set(k: string, v: string) {
    if (!isLocal(k)) k = dk(k);
    if (isLocal(k)) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } bump(); return; }
    if (!ONLINE || CACHE[k] === v) return;
    if (GUEST.on) { guestNo(); return; }
    if (PREV.on) { onToast("Vista previa: los cambios no se guardan", "err"); return; }
    if (PREV.must) return; /* contraseña restablecida: nada se guarda hasta cambiarla */
    CACHE[k] = v; bump(); Sync.push(k);
  },
  del(k: string) {
    if (!isLocal(k)) k = dk(k);
    if (isLocal(k)) { try { localStorage.removeItem(k); } catch { /* */ } bump(); return; }
    if (!ONLINE || !has(CACHE, k)) return;
    if (GUEST.on) { guestNo(); return; }
    if (PREV.on) { onToast("Vista previa: los cambios no se guardan", "err"); return; }
    if (PREV.must) return; /* contraseña restablecida: nada se guarda hasta cambiarla */
    delete CACHE[k]; bump(); Sync.push(k);
  },
  /* lectura cacheada: solo vuelve a parsear si cambió el texto (no mutar lo que devuelve) */
  ro<T>(k: string, d: T): T { const v = LS.get(k); if (!v) return d; k = dk(k); const c = RO.get(k); if (c && c[0] === v) return c[1] as T;
    try { const o = JSON.parse(v) as T; RO.set(k, [v, o]); return o; } catch { return d; } },
  json<T>(k: string, d: T): T { try { const v = LS.get(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  setJSON(k: string, v: unknown) { LS.set(k, JSON.stringify(v)); },
  keys(prefix = ""): string[] { const p = dk(prefix); return Object.keys(CACHE).filter(k => k.startsWith(p)).map(undk); },
};

let onToast: (msg: string, kind?: "ok" | "err") => void = () => {};
/* invitado (link de six): todo es de solo lectura; el aviso sale como mucho cada 4 s */
export const GUEST: { on: boolean; secs: string[]; title: string; exp: number; q: number } = { on: false, secs: [], title: "", exp: 0, q: 0 }; /* q: hasta cuándo no avisar (al abrir una sección, lo que se guarda solo) */
let guestT = 0;
const guestNo = () => { if (Date.now() > GUEST.q && Date.now() - guestT > 4000) { guestT = Date.now(); onToast("Modo invitado: solo podés mirar", "err"); } };
let onLost: () => void = () => {};
export const storeHooks = (t: typeof onToast, lost: typeof onLost) => { onToast = t; onLost = lost; };

const Sync = {
  q: new Set<string>(), cur: null as string | null, busy: false,
  pending() { return this.busy || this.q.size > 0; },
  push(k: string) { this.q.add(k); setNet("saving"); void this.run(); },
  async run() {
    if (this.busy) return; this.busy = true;
    while (this.q.size) {
      const k = this.q.values().next().value as string; this.q.delete(k); this.cur = k;
      const hv = has(CACHE, k), v = hv ? CACHE[k] : null;
      const r = await api("/api/data", hv ? { k, v, base: has(BASE, k) ? BASE[k] : null } : { k, del: true });
      if (r.__s === 401) { this.cur = null; this.busy = false; onLost(); return; }
      if (r.__s === 0 || r.__s >= 500) { this.q.add(k); setNet("off"); await new Promise(z => setTimeout(z, 4000)); continue; }
      if (r.__s !== 200) {
        onToast(r.msg || "No se pudo guardar el cambio", "err");
        if (has(BASE, k)) CACHE[k] = BASE[k]; else delete CACHE[k];
        bump(); continue;
      }
      KT[k] = Math.max(KT[k] || 0, r.t || 0);
      if (r.v !== undefined) { // el servidor fusionó con cambios de otra persona
        BASE[k] = r.v; const now = has(CACHE, k) ? CACHE[k] : null;
        if (now === v) { if (r.v == null) delete CACHE[k]; else CACHE[k] = r.v; }
        else if (now != null) { CACHE[k] = mergeText(v, now, r.v); this.q.add(k); }
        bump();
      } else { if (hv) BASE[k] = v as string; else delete BASE[k]; }
    }
    this.cur = null; this.busy = false; setNet("ok");
  },
};

let polling = false, pollT: number | undefined;
const NEED = new Set<string>();
async function poll() {
  if (!ONLINE || polling) return; polling = true;
  try {
    const nd = [...NEED].slice(0, 60); NEED.clear();
    const r = await api(`/api/data?since=${SYNC_T}${nd.length ? "&need=" + nd.map(encodeURIComponent).join(",") : ""}`);
    if (r.__s === 401) { onLost(); return; }
    if (r.__s !== 200) { setNet("off"); return; }
    if (!Sync.pending()) setNet("ok");
    let ch = false;
    for (const [k, v, t, hint] of (r.ch || []) as [string, string | null, number, number?][]) {
      if (t <= (KT[k] || 0)) continue;
      if (hint) { NEED.add(k); continue; } /* cambio del margen que no tengo: lo pido en la próxima consulta */
      KT[k] = t;
      if (Sync.q.has(k) || Sync.cur === k) continue;
      if (v == null) { if (!has(CACHE, k)) continue; delete CACHE[k]; delete BASE[k]; }
      else { if (CACHE[k] === v) continue; CACHE[k] = v; BASE[k] = v; }
      ch = true;
    }
    SYNC_T = Math.max(SYNC_T, r.t || 0);
    if (r.me) { Object.assign(ME_ROLES, r.me); noRoles(); }
    if (ch) bump();
  } finally { polling = false; if (NEED.size) setTimeout(() => void poll(), 300); }
}
/* recarga todo del servidor (lo borrado desaparece aunque se haya perdido el aviso); respeta lo que se está guardando */
export async function reloadAll(): Promise<boolean> {
  if (!ONLINE) return false;
  const r = await api("/api/data"); if (r.__s !== 200 || !r.store) return false;
  const st = r.store as Dict, kt = (r.kt || {}) as Record<string, number>;
  for (const k of Object.keys(CACHE)) if (!has(st, k) && !Sync.q.has(k) && Sync.cur !== k) { delete CACHE[k]; delete BASE[k]; }
  for (const [k, v] of Object.entries(st)) { if (Sync.q.has(k) || Sync.cur === k) continue; CACHE[k] = v; BASE[k] = v; KT[k] = kt[k] || KT[k] || 0; }
  SYNC_T = Math.max(SYNC_T, Number(r.t) || 0); bump(); return true;
}
/* sincroniza ya (la pizarra la usa cada 2 s mientras está abierta) */
/* sincronizar ya y esperar; huella (t) de lo último guardado de una clave */
export const syncWait = () => poll();
export const ktOf = (k: string) => KT[dk(k)] || KT[k] || 0;
export const syncNow = () => { if (!document.hidden) void poll(); };
/* actividad: la base (Neon) se apaga sola si nadie consulta unos minutos, y eso ahorra la cuota del mes.
   Mientras se usa la terminal se sincroniza cada 5 s; sin tocar nada, cada vez menos, y a los 20 min para hasta que vuelvas a moverte. */
let lastAct = Date.now(), parked = false;
export const idleFor = () => Date.now() - lastAct;
const pollEvery = () => { const i = idleFor(); return i < 120e3 ? 5000 : i < 600e3 ? 30e3 : i < 1200e3 ? 120e3 : 0; };
function schedule() { clearTimeout(pollT); const ms = pollEvery(); if (!ms) { parked = true; return; } parked = false;
  pollT = window.setTimeout(async () => { if (!document.hidden) await poll(); schedule(); }, ms); }
const onAct = () => { const was = idleFor() > 120e3; lastAct = Date.now(); if (parked || was) { void poll(); schedule(); } };
for (const ev of ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"]) addEventListener(ev, onAct, { passive: true, capture: true });

/* cuentas registradas en orden de alta (la posición es el ID público del perfil) */
/* names: cuentas del LSPD; dir: todas las cuentas de los tres departamentos (perfiles), en orden de registro */
export type DirE = { n: string; d: "lspd" | "lssd" | "sahp"; r: string };
export const ACC: { names: string[]; dir: DirE[]; xr: DirE[] } = { names: [], dir: [], xr: [] }; /* xr: integrantes del LSSD y la SAHP (sin cuenta todavía) */
/* vista previa («Ver como»): sin permisos especiales y sin guardar nada en el servidor */
export const PREV = { on: false, must: false };
const noRoles = () => { if (PREV.on) Object.assign(ME_ROLES, { admin: false, owner: false, six: false, anita: false, dadm: false, jef: "" }); };
export const ME_ROLES: { admin?: boolean; owner?: boolean; six?: boolean; anita?: boolean; dadm?: boolean; jef?: string } = {}; /* jef: el nombre propio si es Jefatura del LSSD o la SAHP */
export type Me = { n: string; r: string; admin: boolean; owner: boolean; six?: boolean; anita?: boolean; must?: boolean; dept?: "lssd" | "sahp"; p?: string };
export let DEF_ROSTER: Agent[] = [];
export type Agent = { n: string; p?: string; r: string; e?: string; s?: string; i?: string; d?: string; a?: string; c?: string };

export const ACC_LAST: Record<string, number> = {};
export function loadStore(d: { store: Dict; kt?: Record<string, number>; t?: number; defRoster?: Agent[]; me?: Me; acc?: Record<string, number> }, guest?: boolean) {
  Object.assign(ACC_LAST, d.acc || {});
  for (const k of Object.keys(CACHE)) delete CACHE[k];
  for (const k of Object.keys(BASE)) delete BASE[k];
  Object.assign(CACHE, d.store); Object.assign(BASE, d.store); Object.assign(KT, d.kt || {});
  SYNC_T = d.t || 0; DEF_ROSTER = d.defRoster || DEF_ROSTER; ONLINE = true; OWN = guest || !d.me?.n ? "" : `${d.me.n}|${d.me.dept || "lspd"}`;
  Object.assign(ME_ROLES, { admin: !!d.me?.admin, owner: !!d.me?.owner, six: !!d.me?.six, anita: !!d.me?.anita, dadm: !!(d.me as { dadm?: boolean } | undefined)?.dadm, jef: (d.me as { jef?: string } | undefined)?.jef || "" }); noRoles();
  bump(); if (guest) return; schedule();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void poll(); });
  addEventListener("online", () => { void poll(); void Sync.run(); });
}
export function goOffline() { ONLINE = false; OWN = ""; cacheClear(); clearTimeout(pollT); for (const k of Object.keys(CACHE)) delete CACHE[k]; bump(); }

/* hooks: el componente se vuelve a dibujar cuando cambia cualquier dato */
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const useStoreVersion = () => useSyncExternalStore(subscribe, () => version);
export function useJSON<T>(k: string, d: T): [T, (v: T) => void] {
  useStoreVersion();
  return [LS.json(k, d), (v: T) => LS.setJSON(k, v)];
}

/* el servidor descarga una imagen desde un link y la guarda en la clave */
export async function fetchImageTo(k: string, url: string): Promise<{ ok: boolean; msg?: string }> {
  k = dk(k);
  const r = await api("/api/data", { k, url }) as { __s: number; v?: string; t?: number; msg?: string };
  if (r.__s !== 200 || typeof r.v !== "string") return { ok: false, msg: r.msg || "No se pudo descargar la imagen de ese link" };
  CACHE[k] = BASE[k] = r.v; KT[k] = r.t || 0; bump(); return { ok: true };
}
/* espera a que se suban todos los cambios pendientes */
export const syncIdle = () => new Promise<void>(res => { const f = () => (Sync.pending() ? setTimeout(f, 200) : res()); f(); });
