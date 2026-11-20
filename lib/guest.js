/* Invitados: link de six para ver la terminal sin iniciar sesión, solo lectura y solo las secciones que él elige.
   El servidor manda únicamente las claves de esas secciones (más la marca y el roster para dibujar la pantalla),
   filtradas además como a una cuenta sin rango ni divisiones: nada privado, nada de divisiones. */
import { ADMIN_KEY, canRead } from "./core.js";

/* secciones que se pueden abrir a un invitado: área/sección → claves que necesita */
export const GUEST_SECS = {
  "ini/home": /^lspdt\.(galeria|calpub|calban\..+)$/,
  "cal/cal": /^lspdt\.(calpub|calban\..+|drec\.[a-z0-9-]+\.cal|instr\.[a-z0-9-]+)$/,
  "ofi/inf": /^lspdt\.(informes|ois|perdArm)$/,
  "age/prof": /^lspdt\.(uprof\.[a-z0-9]+(\.pic|\.ban)?)$/,
  "leg/ley": /^$/,
  "ofi/cod": /^$/,
  "rad/rad": /^lspdt\.(robos|radio)$/,
};
/* lo que siempre hace falta: logos, imágenes, tema del depto, roster, fotos de los agentes y excepciones de rango */
const BASE = /^lspdt\.(roster|profiles|exc|foto\..+|pfoto\..+|cover\..+)$/;
export const GUEST_U = { n: "Invitado", r: "", l: 0, admin: false, owner: false, gm: {}, gco: [], hide: {} };
/* Informes y Códigos pasaron al área Oficiales: los enlaces viejos siguen andando */
const MOVED = { "inf/inf": "ofi/inf", "cod/cod": "ofi/cod" };
export const cleanSecs = a => ["ini/home", ...(Array.isArray(a) ? a : []).map(s => MOVED[s] || s).filter(s => typeof s === "string" && s !== "ini/home" && GUEST_SECS[s])];
export const guestKey = (k, secs) => canRead(k, GUEST_U) && (ADMIN_KEY.test(k) || BASE.test(k) || secs.some(s => GUEST_SECS[s] && GUEST_SECS[s].test(k)));
