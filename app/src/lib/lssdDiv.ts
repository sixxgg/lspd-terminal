/* Divisiones del LSSD según «Bureaus / Divisions» de Eleven Project (Notion). Los mandos son los que figuran ahí;
   si el nombre está en el roster se muestra con su rango e insignia. */
const NOTION = "https://elevenproject.notion.site/";
type LssdDiv = { k: string; a: string; n: string; of: "sod" | "osso"; d: string; cmd: string[]; sub?: string[]; veh?: string[]; fn: string[]; url: string; req?: string };
export const LSSD_OFFICES = { sod: "Special Operations Division", osso: "Office of Sheriff Support Operations" } as const;

export const LSSD_DIVS: LssdDiv[] = [
  { k: "seb", a: "SEB", n: "Special Enforcement Bureau", of: "sod", url: NOTION + "Special-Enforcement-Bureau-SEB-2d2fb1cfad368112abd8fc4cded31540",
    d: "El equipo táctico del Sheriff. Nació como Special Enforcement Detail para disturbios civiles y hoy da apoyo táctico, de rescate y antiterrorismo en todo el condado, en coordinación con METRO y SWAT del LSPD.",
    cmd: [], sub: ["Special Weapons Team (SWT)", "Sniper Detail", "Explosives Detail", "Hazardous Materials Detail", "Subsurface Operations Detail"],
    fn: ["Extracción de rehenes", "Robos a bancos y objetivos de alto valor", "Operaciones antiterroristas", "Redadas en zonas peligrosas", "Instrucción de armas y licencias de medio calibre", "Explosivos y materiales peligrosos"],
    req: "Formulario de ingreso; las solicitudes se evalúan cada 30 a 45 días y terminan en una academia nueva, avisada con una semana de anticipación." },
  { k: "ab", a: "AB", n: "Aero Bureau", of: "sod", url: NOTION + "Aero-Bureau-AB-37ffb1cfad368025b5c3db880fa94962",
    d: "Apoyo aéreo del departamento con helicópteros tripulados (visión nocturna, cámaras y comunicación táctica) y una unidad de drones para vigilancia y búsqueda en zonas de difícil acceso.",
    cmd: ["Ciaran Devlin"], fn: ["Vigilancia y apoyo operativo desde el aire", "Búsqueda y rescate", "Respuesta rápida a incidentes críticos", "Patrullas aéreas preventivas", "Persecuciones y apoyo a unidades terrestres"] },
  { k: "k9", a: "K-9", n: "Canine Service Detail", of: "sod", url: NOTION + "Canine-Service-Detail-K-9-37ffb1cfad3680469429d1095dbfb2aa",
    d: "Binomios de deputy adiestrador (handler) y perro entrenado. Cada perro se asigna según su temperamento y habilidades, y trabaja junto al SEB, la Detective Division y los patrulleros.",
    cmd: ["Lidia Mercer"], fn: ["Patrullaje preventivo", "Búsqueda de sospechosos y fugitivos", "Búsqueda de personas desaparecidas", "Detección de narcóticos y explosivos", "Control de multitudes y protección del oficial", "Apoyo al SEB y a la Detective Division"] },
  { k: "cnu", a: "CNU", n: "Crisis Negotiation Unit", of: "sod", url: NOTION + "Crisis-Negotiation-Unit-CNU-37ffb1cfad36801f9b50c422f08491b5",
    d: "Resolución pacífica de situaciones críticas con negociación y manejo de crisis. Es la primera opción antes de la fuerza táctica y trabaja coordinada con el SWT del SEB.",
    cmd: ["Corinne Constantine"], fn: ["Toma de rehenes", "Sujetos atrincherados", "Intentos de suicidio", "Amenazas con explosivos", "Secuestros", "Personas emocionalmente alteradas"],
    req: "Deputy Sheriff Bonus I o superior, historial disciplinario limpio, evaluación psicológica, curso de Negociación en Crisis y simulaciones evaluadas por el mando." },
  { k: "dd", a: "DD", n: "Detective Division", of: "sod", url: NOTION + "Detective-Division-DD-2d2fb1cfad36806fb320e3069d1b2ee7",
    d: "Investigación del crimen organizado y supresión de pandillas, con personal altamente entrenado. Agrupa los bureaus de investigación del departamento.",
    cmd: [], sub: ["Homicide Bureau (HB)", "Major Crimes Bureau (MCB)", "Narcotics Bureau (NB)", "Special Victims Bureau (SVB)", "Fraud and Cyber Crimes Bureau (FCCB)", "Gang Enforcement Team (GET)", "Operation Safe Streets Detail (OSSD)", "Gang Surveillance Unit (GSU)"], fn: [] },
  { k: "tb", a: "TB", n: "Training Bureau", of: "osso", url: NOTION + "Training-Bureau-TB-2d2fb1cfad36816cb4c3c34ed31648c5",
    d: "Formación y capacitación de los deputies juramentados, y reclutamiento y selección de candidatos para convertirlos en Deputy Sheriff Trainees.",
    cmd: ["Samuel R. Callahan", "Rosalie Saint-Clair"], fn: ["Prácticas y capacitaciones", "Reclutamiento y selección", "Formación de trainees", "Trabajo con el resto de las divisiones"] },
  { k: "sib", a: "SIB", n: "Sheriff Information Bureau", of: "osso", url: NOTION + "Sheriff-Information-Bureau-SIB-2d2fb1cfad3681b48516c8857b802599",
    d: "Comunicación del departamento con la ciudadanía: informa lo que hace el Sheriff, el estado de alerta del condado y del estado, y arma programas para acercar el departamento a la gente.",
    cmd: ["Anna E. Lancaster", "Wayne King", "William Red"], fn: ["Colaboración ciudadana con las demás divisiones", "Información pública de las acciones del departamento", "Estado de alerta de San Andreas y del condado", "Programas especiales con la comunidad"] },
  { k: "hsiu", a: "HSIU", n: "High Speed Interception Unit", of: "osso", url: NOTION + "High-Speed-Interception-Unit-HSIU-2d2fb1cfad3681028a85c66c04d12224",
    d: "Amenazas vehiculares que superan al patrullaje ordinario: persecuciones a velocidades extremas, vehículos de alto rendimiento y maniobras de intercepción de riesgo elevado.",
    cmd: ["Theseus Alaric Callahan", "Jason Harvens", "Ryan Saint"], veh: ["Bravado Buffalo Hellfire (todo el departamento, con licencia)", "Vapid Dominator (solo HSIU)", "Bravado Gauntlet Hellfire (solo HSIU)", "Declasse Vigero (solo HSIU)"],
    fn: ["Persecuciones a alta velocidad", "Vehículos de alto rendimiento o modificados", "Sospechosos con alto riesgo de fuga", "Control de rutas de riesgo"] },
];
