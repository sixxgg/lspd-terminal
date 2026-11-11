/* nickname OOC del perfil (independiente del personaje); si no hay, se usa el nombre del personaje */
import { LS } from "./store";
import { emailOf } from "./domain";

/* nicks por defecto mientras no se pongan uno propio */
const NICK0: Record<string, string> = { "Ryan Westbrook": "six", "Evelyn Molina": "Aniita", "Liam Campbell": "TURKO" };
export const nickOf = (n: string) => (LS.json<{ nick?: string }>(`lspdt.uprof.${emailOf(n).split("@")[0]}`, {}).nick || "").trim() || NICK0[n] || n;
