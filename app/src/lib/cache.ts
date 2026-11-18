/* Copia local de los datos de la terminal (IndexedDB) para no bajar toda la base en cada carga:
   al abrir, el servidor solo manda lo que cambió desde esta copia. Es de una sola cuenta (owner) y se borra al cerrar sesión. */
type Snap = { owner: string; store: Record<string, string>; kt: Record<string, number>; t: number };
const DB = "lspdt-cache", ST = "snap", HINT = "lspdt.next.cacheOwner";

function open(): Promise<IDBDatabase | null> {
  return new Promise(res => {
    try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }
    catch { res(null); }
  });
}
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest | void): Promise<T | null> {
  const db = await open(); if (!db) return null;
  return new Promise(res => { try { const t = db.transaction(ST, mode), r = f(t.objectStore(ST)); t.oncomplete = () => res(r ? (r.result as T) : null); t.onerror = () => res(null); } catch { res(null); } });
}
/* de quién es la copia guardada (se lee sin esperar a IndexedDB) */
export const cacheOwner = () => { try { return localStorage.getItem(HINT) || ""; } catch { return ""; } };
export const cacheLoad = () => tx<Snap>("readonly", s => s.get("v"));
let tm: number | undefined;
export function cacheSave(get: () => Snap) {
  clearTimeout(tm);
  tm = window.setTimeout(() => { const v = get(); if (!v.owner) return; void tx("readwrite", s => { s.put(v, "v"); }); try { localStorage.setItem(HINT, v.owner); } catch { /* */ } }, 4000);
}
export function cacheClear() { clearTimeout(tm); try { localStorage.removeItem(HINT); } catch { /* */ } void tx("readwrite", s => { s.clear(); }); }
