/* nickname OOC del perfil (independiente del personaje); si no hay, se usa el nombre del personaje */
import { LS } from "./store";
import { emailOf } from "./domain";

/* nicks por defecto mientras no se pongan uno propio */
const NICK0: Record<string, string> = { "Ryan Westbrook": "six", "Evelyn Molina": "Aniita", "Liam Campbell": "TURKO" };
export const nickOf = (n: string) => (LS.json<{ nick?: string }>(`lspdt.uprof.${emailOf(n).split("@")[0]}`, {}).nick || "").trim() || NICK0[n] || n;

/* perfiles en BETA: por ahora solo estas cuentas los ven y los usan */
const PROF_BETA = ["Ryan Westbrook", "Evelyn Molina", "Liam Campbell", "Kai Jeon-Soo"];
export const PROF = { me: "" };
export const profOk = (n = PROF.me) => PROF_BETA.includes(n);
