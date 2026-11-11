/* nickname OOC del perfil (independiente del personaje); si no hay, se usa el nombre del personaje */
import { LS } from "./store";
import { emailOf } from "./domain";

const FOUNDER = "Ryan Westbrook";
export const nickOf = (n: string) => (LS.json<{ nick?: string }>(`lspdt.uprof.${emailOf(n).split("@")[0]}`, {}).nick || "").trim() || (n === FOUNDER ? "six" : n);
