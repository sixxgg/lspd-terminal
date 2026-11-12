/* Armamento de la METRO: las 9 armas reglamentarias con su munición y los accesorios de ox_inventory (weapons.lua)
   que le entran a cada una. Lo demás del .lua (y los at_dd_* de la DDM4V7, que no está en el servidor) no se usa. */
type Slot = "flashlight" | "muzzle" | "magazine" | "sight" | "grip" | "barrel" | "skin";
export const SLOTS: [Slot, string][] = [["sight", "Mira"], ["muzzle", "Boca / silenciador"], ["magazine", "Cargador"], ["flashlight", "Linterna"], ["grip", "Empuñadura"], ["barrel", "Cañón"], ["skin", "Acabado"]];
type Acc = { k: string; l: string; s: Slot; w: number };
export type Arma = { k: string; l: string; cat: Cat; ammo: string; cal: string; w: number; acc: string[]; def: number };
export type Cat = "pis" | "smg" | "rif" | "sni" | "lan";
export const CATS: [Cat, string][] = [["pis", "Pistolas"], ["smg", "Subfusiles"], ["rif", "Rifles"], ["sni", "Francotiradores"], ["lan", "Lanzagranadas"]];

const A = (k: string, l: string, s: Slot, w = 280): Acc => ({ k, l, s, w });
export const ACC: Record<string, Acc> = Object.fromEntries([
  A("at_flashlight", "Linterna táctica", "flashlight", 120),
  A("at_suppressor_light", "Silenciador", "muzzle"), A("at_suppressor_heavy", "Silenciador táctico", "muzzle"), A("at_compensator", "Compensador", "muzzle"),
  A("at_muzzle_flat", "Bocacha plana", "muzzle", 80), A("at_muzzle_tactical", "Bocacha táctica", "muzzle", 80), A("at_muzzle_fat", "Bocacha ancha", "muzzle", 80),
  A("at_muzzle_precision", "Bocacha de precisión", "muzzle", 80), A("at_muzzle_heavy", "Bocacha pesada", "muzzle", 80), A("at_muzzle_slanted", "Bocacha inclinada", "muzzle", 80),
  A("at_muzzle_split", "Bocacha partida", "muzzle", 80), A("at_muzzle_squared", "Bocacha cuadrada", "muzzle", 80), A("at_muzzle_bell", "Bocacha de campana", "muzzle", 80),
  A("at_clip_extended_pistol", "Cargador extendido (pistola)", "magazine"), A("at_clip_extended_smg", "Cargador extendido (subfusil)", "magazine"), A("at_clip_drum_smg", "Tambor (subfusil)", "magazine"),
  A("at_clip_extended_rifle", "Cargador extendido (rifle)", "magazine"), A("at_clip_drum_rifle", "Tambor (rifle)", "magazine"), A("at_clip_extended_sniper", "Cargador extendido (francotirador)", "magazine"),
  A("at_scope_holo", "Mira holográfica", "sight"), A("at_scope_macro", "Mira macro", "sight"), A("at_scope_small", "Mira pequeña", "sight"), A("at_scope_medium", "Mira mediana", "sight"),
  A("at_scope_large", "Mira grande", "sight"), A("at_scope_advanced", "Mira avanzada", "sight"), A("at_scope_nv", "Mira de visión nocturna", "sight", 420), A("at_scope_thermal", "Mira térmica", "sight", 420),
  A("at_grip", "Empuñadura", "grip"), A("at_barrel", "Cañón pesado", "barrel"),
  A("at_skin_luxe", "Kit de lujo", "skin", 50), A("at_skin_wood", "Kit de madera", "skin", 50),
  ...[["camo", "Camuflaje digital"], ["brushstroke", "Pincelada"], ["woodland", "Bosque"], ["skull", "Calaveras"], ["sessanta", "Sessanta"], ["perseus", "Perseus"], ["leopard", "Leopardo"],
    ["zebra", "Cebra"], ["geometric", "Geométrico"], ["boom", "Boom"], ["patriotic", "Patriótico"]].map(([k, l]) => A("at_skin_" + k, l, "skin", 50)),
].map(a => [a.k, a]));
const CAMOS = ["camo", "brushstroke", "woodland", "skull", "sessanta", "perseus", "leopard", "zebra", "geometric", "boom", "patriotic"].map(k => "at_skin_" + k);

export const ARMAS: Arma[] = [
  { k: "WEAPON_HEAVYPISTOL", l: "Heavy Pistol", cat: "pis", ammo: "ammo-45", cal: ".45 ACP", w: 1100, def: 60, acc: ["at_flashlight", "at_suppressor_light", "at_clip_extended_pistol", "at_skin_wood"] },
  { k: "WEAPON_COMBATPISTOL", l: "Combat Pistol", cat: "pis", ammo: "ammo-9", cal: "9mm", w: 785, def: 60, acc: ["at_flashlight", "at_suppressor_light", "at_clip_extended_pistol", "at_skin_luxe"] },
  { k: "WEAPON_PISTOL_MK2", l: "Pistol MK2", cat: "pis", ammo: "ammo-9", cal: "9mm", w: 1000, def: 60, acc: ["at_scope_holo", "at_flashlight", "at_suppressor_light", "at_compensator", "at_clip_extended_pistol", ...CAMOS] },
  { k: "WEAPON_SMG", l: "SMG", cat: "smg", ammo: "ammo-9", cal: "9mm", w: 3084, def: 120, acc: ["at_scope_macro", "at_flashlight", "at_suppressor_light", "at_clip_extended_smg", "at_clip_drum_smg", "at_skin_luxe"] },
  { k: "WEAPON_CARBINERIFLE", l: "Carbine Rifle", cat: "rif", ammo: "ammo-rifle", cal: "5.56x45", w: 3100, def: 180, acc: ["at_scope_medium", "at_flashlight", "at_suppressor_heavy", "at_grip", "at_clip_extended_rifle", "at_clip_drum_rifle", "at_skin_luxe"] },
  { k: "WEAPON_CARBINERIFLE_MK2", l: "Carbine Rifle MK2", cat: "rif", ammo: "ammo-rifle", cal: "5.56x45", w: 3000, def: 180, acc: ["at_scope_holo", "at_scope_macro", "at_scope_medium", "at_flashlight",
    "at_suppressor_heavy", "at_muzzle_flat", "at_muzzle_tactical", "at_muzzle_fat", "at_muzzle_precision", "at_muzzle_heavy", "at_muzzle_slanted", "at_muzzle_split", "at_grip", "at_barrel", "at_clip_extended_rifle", ...CAMOS] },
  { k: "WEAPON_HEAVYSNIPER", l: "Heavy Sniper", cat: "sni", ammo: "ammo-heavysniper", cal: ".50 BMG", w: 12700, def: 30, acc: ["at_scope_advanced"] },
  { k: "WEAPON_HEAVYSNIPER_MK2", l: "Heavy Sniper MK2", cat: "sni", ammo: "ammo-heavysniper", cal: ".50 BMG", w: 14000, def: 30, acc: ["at_scope_large", "at_scope_advanced", "at_scope_nv", "at_scope_thermal",
    "at_suppressor_heavy", "at_muzzle_squared", "at_muzzle_bell", "at_barrel", "at_clip_extended_sniper", ...CAMOS] },
  { k: "WEAPON_GRENADELAUNCHER", l: "Grenade Launcher", cat: "lan", ammo: "ammo-grenade", cal: "40mm", w: 6500, def: 6, acc: ["at_scope_small", "at_flashlight", "at_grip"] },
];

/* configuración de la coordinación por arma */
export type ArmaCfg = { on: boolean; n: number; mags: number; acc: string[]; auth: string; nota: string };
export const ARMAS_KEY = "lspdt.mdx.armas";
export const cfgOf = (a: Arma, all: Record<string, Partial<ArmaCfg>>): ArmaCfg => ({ on: true, n: a.def, mags: 0, acc: [], auth: "", nota: "", ...all[a.k] });
export const kg = (g: number) => (g / 1000).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + " kg";

/* líneas del kit: [ítem, cantidad, descripción] */
export function kitOf(a: Arma, c: ArmaCfg): [string, number, string][] {
  return [[a.k, 1, a.l], ...(c.n > 0 ? [[a.ammo, c.n, `Munición ${a.cal}`] as [string, number, string]] : []), ...c.acc.filter(k => ACC[k]).map(k => [k, 1, ACC[k].l] as [string, number, string])];
}
