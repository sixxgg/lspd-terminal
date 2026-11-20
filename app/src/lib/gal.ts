/* Galería: tipo de foto y su encuadre (punto de foco x/y en % y zoom), igual en el Inicio, el carrusel y el editor. */
import type { CSSProperties } from "react";
import { LS } from "./store";
import { srcOf } from "./domain";

/* cap: título; d: descripción; pri: imagen principal (va primera); ik: foto subida a la terminal (lspdt.portada.<id>) en lugar de un link */
export type Foto = { id: string; url: string; cap?: string; d?: string; pri?: boolean; ik?: string; on: boolean; at: number; fx?: number; fy?: number; z?: number };
export const fotoSrc = (f: Foto) => (f.ik ? srcOf(LS.get(f.ik) || "") : f.url);
/* la principal primero */
export const ordered = (L: Foto[]) => [...L.filter(f => f.pri), ...L.filter(f => !f.pri)];
export const GAL_KEY = "lspdt.galeria";
/* kb = acercamiento extra del movimiento (1 = quieta) */
export const fotoStyle = (f: Foto, kb = 1): CSSProperties => {
  const x = f.fx ?? 50, y = f.fy ?? 50, z = f.z ?? 1;
  return { objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, transform: `scale(${(z * kb).toFixed(3)})` };
};
