/* «Ver como»: la administración mira la terminal con otro rango y sin divisiones (solo lectura, hasta que sale) */
const KEY = "lspdt.next.prev";
export const prevGet = (): { r: string } | null => { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; } };
export const prevStart = (r: string) => { try { sessionStorage.setItem(KEY, JSON.stringify({ r })); } catch { /* */ } location.reload(); };
export const prevStop = () => { try { sessionStorage.removeItem(KEY); } catch { /* */ } location.reload(); };
