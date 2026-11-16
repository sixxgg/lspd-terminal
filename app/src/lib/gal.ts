/* Galería: tipo de foto y su encuadre (punto de foco x/y en % y zoom), igual en el Inicio, el carrusel y el editor. */
import type { CSSProperties } from "react";

export type Foto = { id: string; url: string; cap?: string; on: boolean; at: number; fx?: number; fy?: number; z?: number };
export const GAL_KEY = "lspdt.galeria";
/* kb = acercamiento extra del movimiento (1 = quieta) */
export const fotoStyle = (f: Foto, kb = 1): CSSProperties => {
  const x = f.fx ?? 50, y = f.fy ?? 50, z = f.z ?? 1;
  return { objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, transform: `scale(${(z * kb).toFixed(3)})` };
};
