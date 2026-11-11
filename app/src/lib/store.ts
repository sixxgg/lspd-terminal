/* Datos compartidos del departamento: misma API, mismas claves y misma fusión que la versión clásica,
   así las dos versiones conviven sobre la misma base de datos sin pisarse. */
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
const bump = () => { version++; subs.forEach(f => f()); };

/* claves que viven solo en este navegador (igual que en la versión clásica) */
const LOCAL = /^lspdt\.(session|accounts|theme|frame|rankLang|seenVersion|area|sec\..*|agView|upd.*|iconpng|fix\..*|patrol|recent|altFirma|altDraft|cursor|accent|crt|crtI|rtdDraft|dvc|psbCargo|infDraft|next\..*)$/;
const isLocal = (k: string) => LOCAL.test(k);
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

type NetState = "ok" | "saving" | "off";
let net: NetState = "ok";
const setNet = (s: NetState) => { if (net !== s) { net = s; bump(); } };
export const getNet = () => net;

const RO = new Map<string, [string, unknown]>();
export const LS = {
  get(k: string): string | null {
    if (isLocal(k)) { try { return localStorage.getItem(k); } catch { return null; } }
    return has(CACHE, k) ? CACHE[k] : null;
  },
  set(k: string, v: string) {
    if (isLocal(k)) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } bump(); return; }
    if (!ONLINE || CACHE[k] === v) return;
    CACHE[k] = v; bump(); Sync.push(k);
  },
  del(k: string) {
    if (isLocal(k)) { try { localStorage.removeItem(k); } catch { /* */ } bump(); return; }
    if (!ONLINE || !has(CACHE, k)) return;
    delete CACHE[k]; bump(); Sync.push(k);
  },
  /* lectura cacheada: solo vuelve a parsear si cambió el texto (no mutar lo que devuelve) */
  ro<T>(k: string, d: T): T { const v = LS.get(k); if (!v) return d; const c = RO.get(k); if (c && c[0] === v) return c[1] as T;
    try { const o = JSON.parse(v) as T; RO.set(k, [v, o]); return o; } catch { return d; } },
  json<T>(k: string, d: T): T { try { const v = LS.get(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  setJSON(k: string, v: unknown) { LS.set(k, JSON.stringify(v)); },
  keys(prefix = ""): string[] { return Object.keys(CACHE).filter(k => k.startsWith(prefix)); },
};

let onToast: (msg: string, kind?: "ok" | "err") => void = () => {};
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
async function poll() {
  if (!ONLINE || polling) return; polling = true;
  try {
    const r = await api(`/api/data?since=${SYNC_T}`);
    if (r.__s === 401) { onLost(); return; }
    if (r.__s !== 200) { setNet("off"); return; }
    if (!Sync.pending()) setNet("ok");
    let ch = false;
    for (const [k, v, t] of (r.ch || []) as [string, string | null, number][]) {
      if (t <= (KT[k] || 0)) continue; KT[k] = t;
      if (Sync.q.has(k) || Sync.cur === k) continue;
      if (v == null) { if (!has(CACHE, k)) continue; delete CACHE[k]; delete BASE[k]; }
      else { if (CACHE[k] === v) continue; CACHE[k] = v; BASE[k] = v; }
      ch = true;
    }
    SYNC_T = Math.max(SYNC_T, r.t || 0);
    if (r.me) Object.assign(ME_ROLES, r.me);
    if (ch) bump();
  } finally { polling = false; }
}
/* sincroniza ya (la pizarra la usa cada 2 s mientras está abierta) */
export const syncNow = () => { if (!document.hidden) void poll(); };
function schedule() { clearTimeout(pollT); pollT = window.setTimeout(async () => { if (!document.hidden) await poll(); schedule(); }, 5000); }

export const ME_ROLES: { admin?: boolean; owner?: boolean; six?: boolean; anita?: boolean } = {};
export type Me = { n: string; r: string; admin: boolean; owner: boolean; six?: boolean; anita?: boolean };
export let DEF_ROSTER: Agent[] = [];
export type Agent = { n: string; p?: string; r: string; e?: string; s?: string; i?: string; d?: string; a?: string; c?: string };

export const ACC_LAST: Record<string, number> = {};
export function loadStore(d: { store: Dict; kt?: Record<string, number>; t?: number; defRoster?: Agent[]; me?: Me; acc?: Record<string, number> }) {
  Object.assign(ACC_LAST, d.acc || {});
  for (const k of Object.keys(CACHE)) delete CACHE[k];
  for (const k of Object.keys(BASE)) delete BASE[k];
  Object.assign(CACHE, d.store); Object.assign(BASE, d.store); Object.assign(KT, d.kt || {});
  SYNC_T = d.t || 0; DEF_ROSTER = d.defRoster || DEF_ROSTER; ONLINE = true;
  Object.assign(ME_ROLES, { admin: !!d.me?.admin, owner: !!d.me?.owner, six: !!d.me?.six, anita: !!d.me?.anita });
  bump(); schedule();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void poll(); });
  addEventListener("online", () => { void poll(); void Sync.run(); });
}
export function goOffline() { ONLINE = false; clearTimeout(pollT); for (const k of Object.keys(CACHE)) delete CACHE[k]; bump(); }

/* hooks: el componente se vuelve a dibujar cuando cambia cualquier dato */
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const useStoreVersion = () => useSyncExternalStore(subscribe, () => version);
export function useJSON<T>(k: string, d: T): [T, (v: T) => void] {
  useStoreVersion();
  return [LS.json(k, d), (v: T) => LS.setJSON(k, v)];
}

/* el servidor descarga una imagen desde un link y la guarda en la clave */
export async function fetchImageTo(k: string, url: string): Promise<{ ok: boolean; msg?: string }> {
  const r = await api("/api/data", { k, url }) as { __s: number; v?: string; t?: number; msg?: string };
  if (r.__s !== 200 || typeof r.v !== "string") return { ok: false, msg: r.msg || "No se pudo descargar la imagen de ese link" };
  CACHE[k] = BASE[k] = r.v; KT[k] = r.t || 0; bump(); return { ok: true };
}
/* espera a que se suban todos los cambios pendientes */
export const syncIdle = () => new Promise<void>(res => { const f = () => (Sync.pending() ? setTimeout(f, 200) : res()); f(); });
