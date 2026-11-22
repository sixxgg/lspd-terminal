/* Lo que está activo en la tablet del servidor (GANGNET › admin). Es la fuente más nueva: manda sobre la planilla vieja.
   - Robos activos: los «robos» de la tablet. No son misiones: son robos tipo badulaque (tiendas, cajas y contenedores) y también los hacen
     civiles (acceso «all»). Solo el Growshop pide banda (acceso «gang_type»).
   - Misiones: las de la tablet, con nivel de la banda, jugadores, policías en servicio que pide para arrancar, dinero, experiencia y
     para qué tipo de banda es (armas o drogas, nivel bajo o alto, hackers o crew). Faltan misiones: six las va pasando. */

export type Banda = "armas_bajo" | "armas_alto" | "drogas_bajo" | "drogas_alto" | "hackers" | "crew";
export const BANDAS: Record<Banda, { l: string; c: string; d: string }> = {
  armas_bajo: { l: "Armas · bajo", c: "#fb923c", d: "Bandas de armas de nivel bajo" },
  armas_alto: { l: "Armas · alto", c: "#ea580c", d: "Bandas de armas de nivel alto" },
  drogas_bajo: { l: "Drogas · bajo", c: "#a3e635", d: "Bandas de drogas de nivel bajo" },
  drogas_alto: { l: "Drogas · alto", c: "#65a30d", d: "Bandas de drogas de nivel alto" },
  hackers: { l: "Hackers", c: "#22d3ee", d: "Grupos de hackers" },
  crew: { l: "Crew", c: "#c084fc", d: "Crews (vehículos y persecuciones)" },
};
export const BANDA_KEYS = Object.keys(BANDAS) as Banda[];

/* ---------- robos activos de la tablet ---------- */
export type TRobo = { n: string; t: "basic" | "complex"; g: string; acc: "all" | "gang_type"; cd: number; grp: string };
/* grupo del catálogo al que va cada robo de la tablet (por nombre) */
const GRP: [RegExp, string][] = [[/caja|contenedor/i, "tab:cajas"], [/badulaque|licorer/i, "badulaque"], [/grow/i, "grow"], [/pelu/i, "tab:pelu"], [/ropa/i, "tab:ropa"], [/tat/i, "tab:tatto"], [/antig/i, "tab:antig"]];
const tr = (n: string, cd: number, o: Partial<TRobo> = {}): TRobo => ({ n, t: "basic", g: "tienda", acc: "all", cd, grp: GRP.find(([r]) => r.test(n))?.[1] || "tab:cajas", ...o });
export const TAB_ROBOS: TRobo[] = [
  tr("Growshop", 30, { t: "complex", g: "ammunation", acc: "gang_type" }),
  tr("Antigüedades (cerca del aeropuerto)", 15),
  ...["Badulaque 68", "Badulaque Ineseno Road", "Badulaque Sandy", "Badulaque Strawberry", "Badulaque Vinewood"].map(n => tr(n, 30)),
  ...["Cajas (Autopista de Olympic)", "Cajas Industrias 1.0", "Cajas Industrias 1.1", "Cajas Industrias 1.2", "Cajas de ropa (Puerto)", "Cajas Signal Street", "Robo de cajas del aeropuerto",
    "Contenedor Buccaneer Way", "Contenedor Buccaneer Way 1.0", "Contenedor Buccaneer Way 2.0", "Contenedor Chatarrería Barrios Bajos", "Contenedor Chatarrería Barrios Bajos 1.0", "Contenedor del puerto",
    "Contenedores (cerca del aeropuerto)", "Contenedores (Cypress Flats)", "Contenedores (Joshua Road)", "Contenedores (Orchardville)", "Contenedores (Zona Industrias)", "Contenedores Aeródromo de Sandy",
    "Contenedores Hangar Grapeseed", "Contenedores Barrios Bajos", "Contenedores Grapeseed"].map(n => tr(n, 15)),
  ...["Licorería Prosperity Street", "Licorería Vespucci"].map(n => tr(n, 30)),
  ...["Peluquería Barrios Bajos", "Peluquería Hawick Avenue", "Peluquería Mirror Park", "Peluquería Paleto", "Peluquería Rockford Hills", "Peluquería Sandy"].map(n => tr(n, 30)),
  ...["Tienda de ropa Hawick Avenue", "Tienda de ropa Barrios Bajos", "Tienda de ropa Grapeseed", "Tienda de ropa Great Ocean", "Tienda de ropa Las Lagunas", "Tienda de ropa Paleto", "Tienda de ropa Palomino Avenue",
    "Tienda de ropa Rockford", "Tienda de ropa Rockford Hills", "Tienda de ropa Rockford Drive", "Tienda de ropa Ruta 68 Harmony", "Tienda de ropa Ruta 68 Señora", "Tienda de ropa Ruta 68 Zancudo", "Tienda de ropa Sinners Passage"].map(n => tr(n, 30)),
  ...["Tienda de tatuajes Barbareno Road", "Tienda de tatuajes Bay City", "Tienda de tatuajes Burrito", "Tienda de tatuajes Paleto", "Tienda de tatuajes Sandy", "Tienda de tatuajes Vinewood"].map(n => tr(n, 30)),
];

/* ---------- misiones de la tablet ---------- */
export type TMis = { n: string; tipo: string; nv: number; min: number; max: number; pt: number; $: number; xp: number; b?: Banda };
const tm = (n: string, tipo: string, nv: number, p: [number, number], pt: number, $: number, xp: number, b?: Banda): TMis => ({ n, tipo, nv, min: p[0], max: p[1], pt, $, xp, b });
export const TAB_MIS: TMis[] = [
  tm("Ajuste de cuentas", "Asesinato", 0, [1, 2], 4, 500, 200), tm("Cargamento de mayonesa", "Entrega", 0, [1, 3], 4, 500, 280), tm("Control de masas", "Asesinato", 0, [2, 4], 4, 800, 200),
  tm("Destruye el tractor", "Destrucción", 0, [1, 2], 2, 1000, 280), tm("Escolta", "Escolta", 0, [2, 3], 6, 800, 250), tm("Haz desaparecer el camión y lo que lleva dentro", "Destrucción", 0, [1, 3], 4, 750, 280),
  tm("Infiltrarse en el hospital y dejar una puerta trasera", "Infiltración", 0, [1, 4], 14, 2000, 3500, "hackers"), tm("Robo de furgoneta", "Robo de vehículo", 0, [1, 3], 4, 500, 250),
  tm("Robo de Jester", "Robo de vehículo", 0, [1, 3], 4, 650, 280), tm("Saqueo fúnebre", "Entrega", 0, [1, 3], 4, 100, 100), tm("Transporta la mercancía y que llegue sana y salva", "Entrega", 0, [1, 3], 4, 500, 280),
  tm("Cárgate a ese sapo", "Asesinato", 5, [1, 3], 4, 1000, 500),
  tm("Prepárate para la armería", "Encargo", 5, [2, 4], 4, 300, 320, "armas_bajo"), tm("Prepárate para la armería", "Encargo", 5, [2, 4], 4, 300, 320, "armas_alto"),
  tm("Prepárate para la casa de cambio", "Encargo", 5, [1, 4], 4, 500, 400), tm("Robo almacén de semillas", "Encargo", 5, [1, 4], 4, 300, 250, "drogas_alto"),
  tm("Atraco a la armería de Sandy", "Encargo", 6, [2, 6], 6, 100, 350, "armas_alto"), tm("Atraco a la armería de Sandy", "Encargo", 6, [2, 6], 6, 200, 350, "armas_bajo"),
  tm("Atraco al gimnasio de Chumash", "Encargo", 6, [1, 4], 4, 850, 220), tm("Atraco casa de cambio", "Encargo", 6, [2, 4], 6, 1000, 350), tm("Clásico y renovado", "Entrega", 6, [1, 2], 5, 500, 180),
  tm("Garantía impagada", "Robo de vehículo", 6, [1, 3], 4, 750, 200, "armas_bajo"), tm("Prepárate para la farmacia", "Encargo", 6, [2, 3], 6, 300, 200, "drogas_alto"),
  tm("Roba el Auto Shop", "Encargo", 6, [1, 4], 6, 500, 250, "crew"), tm("Roba la farmacia de Sandy", "Encargo", 6, [2, 4], 4, 300, 350, "drogas_alto"), tm("Saquea los Santos Custom", "Encargo", 6, [2, 4], 4, 500, 250, "crew"),
  tm("Acaba con los chatarreros", "Encargo", 7, [3, 5], 4, 100, 300),
  tm("Asalto a la armería del centro", "Encargo", 7, [2, 6], 6, 100, 400, "armas_alto"), tm("Asalto a la armería del centro", "Encargo", 7, [2, 6], 6, 100, 400, "armas_bajo"),
  tm("Bien embargado", "Robo de vehículo", 7, [2, 4], 4, 750, 150, "drogas_bajo"), tm("Contabilidad paralela", "Entrega", 7, [1, 3], 4, 800, 230, "armas_bajo"),
  tm("Dinero en movimiento", "Entrega", 7, [1, 3], 4, 800, 200, "drogas_bajo"), tm("Jack & Jill", "Encargo", 7, [2, 4], 6, 400, 500, "armas_alto"), tm("Sin preguntas", "Entrega", 7, [1, 3], 4, 250, 100, "drogas_alto"),
  tm("Activo quemado", "Destrucción", 8, [1, 3], 4, 500, 350, "armas_bajo"),
  tm("Asalto al matadero de Clucking Bell", "Encargo", 8, [2, 4], 5, 100, 300, "drogas_alto"), tm("Asalto al matadero de Clucking Bell", "Encargo", 8, [2, 4], 5, 100, 300, "drogas_bajo"),
  tm("Auditor comprado", "Escolta", 8, [2, 4], 2, 800, 300, "drogas_bajo"), tm("Caída libre", "Entrega", 8, [2, 4], 2, 200, 200), tm("El deudor", "Asesinato", 8, [1, 2], 4, 500, 300, "drogas_bajo"),
  tm("High Class", "Robo de vehículo", 8, [2, 4], 20, 800, 300, "crew"), tm("Pintando las calles", "Asesinato", 8, [2, 4], 5, 750, 300),
  tm("Robo de tienda de informática", "Encargo", 8, [2, 4], 4, 300, 350, "armas_alto"), tm("Robo de tienda de informática", "Encargo", 8, [2, 4], 14, 300, 350, "hackers"),
  tm("Socio incómodo", "Asesinato", 8, [1, 2], 4, 500, 250, "armas_bajo"), tm("Transporte comprometido", "Destrucción", 8, [1, 3], 4, 500, 250, "drogas_bajo"),
  tm("Transportista de fondos", "Escolta", 8, [1, 3], 2, 800, 320, "armas_bajo"),
  tm("Asalto a la armería de Morningwood", "Encargo", 9, [2, 6], 10, 300, 400, "armas_alto"),
  tm("Alijo submarino", "Persecución", 10, [4, 6], 16, 2000, 500), tm("Infiltrarse en el FIB", "Infiltración", 10, [1, 8], 14, 1000, 2500, "hackers"), tm("Robo 4x4", "Robo de vehículo", 10, [2, 4], 4, 250, 200),
  tm("Robo de un V12", "Persecución", 10, [2, 4], 10, 1000, 500, "crew"), tm("Robo sobre ruedas", "Robo de vehículo", 10, [1, 3], 6, 800, 250, "crew"), tm("Transporte de armas", "Entrega", 10, [1, 2], 4, 100, 300, "armas_bajo"),
  tm("El último frasco", "Encargo", 11, [1, 3], 5, 200, 150, "drogas_bajo"), tm("Robo a la armería de Industrias", "Encargo", 11, [2, 6], 6, 100, 350, "armas_alto"),
  tm("Asalta al Remolcador", "Encargo", 12, [3, 8], 20, 1000, 800, "armas_alto"), tm("Asalta al Remolcador", "Encargo", 12, [3, 8], 20, 1000, 800, "drogas_bajo"),
  tm("Asalta al Remolcador", "Encargo", 12, [3, 8], 20, 1000, 800, "drogas_alto"), tm("Asalta al Remolcador", "Encargo", 12, [3, 8], 20, 1000, 800, "armas_bajo"),
  tm("Galería de arte", "Infiltración", 12, [2, 6], 20, 1000, 1000), tm("Golpe Euforia", "Encargo", 12, [1, 4], 2, 350, 200, "drogas_alto"),
  tm("Infiltración y robo comisaría", "Infiltración", 12, [4, 8], 14, 6000, 4000, "hackers"), tm("Justicia comprada", "Encargo", 12, [1, 4], 10, 850, 400),
  tm("Kilómetro 0", "Persecución", 12, [4, 8], 20, 2000, 500, "crew"), tm("Robo coche custodiado", "Robo de vehículo", 12, [2, 4], 10, 1000, 350),
  tm("Asalto armería de Paleto", "Encargo", 13, [2, 6], 6, 100, 400, "armas_alto"),
];
/* para cruzar nombres de la tablet con los de la planilla (sin tildes, signos ni mayúsculas; «Atraco/Asalto/Robo a…» da igual) */
export const nk = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\((ii|encargo)\)/g, "").replace(/[^a-z0-9& ]/g, " ")
  .replace(/\b(atraco|asalto|asalta|robo|roba)\s+(a|al|el|en)?\s*/g, "").replace(/\b(la|el|los|las|de|del|a|al|un|una)\b/g, " ").replace(/\s+/g, " ").trim();
