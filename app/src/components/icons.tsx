/* Íconos propios con el mismo estilo que lucide */
import { createLucideIcon } from "lucide-react";

export const Helicopter = createLucideIcon("Helicopter", [
  ["path", { d: "M2 5h15", key: "rotor" }],
  ["path", { d: "M9.5 5v3", key: "mast" }],
  ["path", { d: "M4 12a4 4 0 0 1 4-4h3.5a3 3 0 0 1 3 3v1.5a2.5 2.5 0 0 1-2.5 2.5H7a3 3 0 0 1-3-3Z", key: "body" }],
  ["path", { d: "M9 8v3.5H4.2", key: "window" }],
  ["path", { d: "M14.5 11.5H20", key: "tail" }],
  ["path", { d: "M20.5 9v5", key: "tailrotor" }],
  ["path", { d: "M8 15v3M12 15v3M5.5 18h9", key: "skid" }],
]);
