/* Pack policial ONX del servidor (código de spawn, nombre). Liviano: lo usa la revisión de patrullas sin cargar todos los modelos del juego. */
export const ONX: [string, string][] = [
  ["ONX_POLBUFF", "Bravado Buffalo"], ["ONX_POLBUFFHF", "Bravado Buffalo Hellfire Interceptor"], ["ONX_POLMONAR", "Vapid Monarch"], ["onx_polmerit", "Declasse Merit"], ["ONX_POLMERIT2", "Declasse Merit PPV"],
  ["ONX_POLMERIT3", "Declasse Merit Classic Modkit"], ["ONX_POLTULIP", "Declasse Tulip M-100"], ["ONX_POLTAVROS", "Vapid Tavros"], ["ONX_POLALEU", "Vapid Aleutian"], ["ONX_POLSCOUT", "Vapid Scout"],
  ["ONX_POLSCOUT2", "Vapid Scout Classic"], ["ONX_POLDORADO", "Bravado Dorado"], ["ONX_POLDORADO2", "Bravado Dorado ST"], ["ONX_POLTERM", "Canis Terminus"], ["ONX_POLTERM2", "Canis Terminus Overland"],
  ["ONX_POLCAVA", "Albany Cavalcade"], ["ONX_POLSTALK", "Dundreary Landstalker"], ["ONX_POLGRANG", "Declasse Granger 3600LX"], ["ONX_POLGRANG2", "Declasse Granger 3700LX"], ["ONX_POLALAMO", "Alamo 2700LX"],
  ["ONX_POLSEM", "Canis Seminole Frontier"], ["ONX_POLREGENT", "Regent"], ["ONX_POLREGENTXL", "Regent XL"], ["ONX_POLCARA", "Vapid Caracara Raid"],
  ["ONX_POLSAND0", "Sandstorm D205"], ["ONX_POLSAND0XL", "Sandstorm D205 XL"], ["ONX_POLSAND0H", "Sandstorm D205 Hellenbach"], ["ONX_POLSAND0SC", "Sandstorm D205 Single Cab"],
  ["ONX_POLBISON", "Bravado Bison 35 XD"], ["ONX_POLBISON2", "Bravado Bison 45XD"], ["ONX_POLBISON3", "Bravado Bison 35XD Sasquatch"], ["ONX_POLBISON4", "Bravado Bison 25XD Single Cab"],
  ["ONX_POLINVICT", "Invictus"], ["ONX_POLINVICT2", "Invictus II"], ["ONX_POLVERUS", "Dinka Verus"], ["ONX_POLKANDRA", "Kandra"],
  ["ONX_POLGAUNT", "Bravado Gauntlet Interceptor"], ["ONX_POLDOM", "Vapid Dominator Interceptor"], ["ONX_POLVIGERO", "Declasse Vigero Interceptor"], ["ONX_POLVSTR", "Albany Presidente VSTR Interceptor"],
  ["ONX_POLCOQ", "Invetero Coquette Interceptor"], ["ONX_POLCOQ2", "Invetero Coquette D10 Interceptor"], ["ONX_POLCOQ3", "Invetero Coquette D7 Interceptor"],
  ["ONX_POLSANDK", "Vapid Sandking D155"], ["ONX_POLSANDK2", "Vapid Sandking D155 SWB"], ["ONX_POLSANDK3", "Vapid Sandking D155 XL"], ["ONX_POLSANDK4", "Vapid Sandking D155 Compensator"],
  ["ONX_POLSANDK5", "Vapid Sandking D155 SWB Compensator"], ["ONX_POLSANDK6", "Vapid Sandking D155 XL Compensator"], ["ONX_POLGUARD", "Vapid Guardian C105"], ["ONX_POLGUARD2", "Vapid Guardian C105 SWB"],
  ["ONX_POLJOG", "Jogger LWB"], ["ONX_POLJOG2", "Jogger SWB"], ["ONX_POLJOG3", "Jogger Transport LWB"], ["ONX_POLJOG4", "Jogger Transport SWB"],
  ["ONX_POLMAV", "Buckingham Maverick (helicóptero)"], ["ONX_POLCON", "Buckingham Conada (helicóptero)"],
];
/* patrullas terrestres (sin helicópteros), para la revisión de patrullas */
export const PATROL_CARS: [string, string][] = ONX.filter(([, m]) => !/helic/i.test(m)).map(([s, m]) => [s.toLowerCase(), m]);
/* tipo de cada patrulla, para agruparlas en el selector */
export const CAR_TYPES = ["Sedán", "Interceptor", "SUV", "Pickup", "Furgón"] as const;
export const carType = (k: string, n: string): (typeof CAR_TYPES)[number] =>
  /interceptor|gaunt|dom|vigero|vstr|coq/i.test(n + k) ? "Interceptor"
  : /jog/i.test(k) ? "Furgón"
  : /cara|sand|bison|guard/i.test(k) ? "Pickup"
  : /aleu|scout|term|cava|stalk|grang|alamo|sem|regentxl|invict|kandra/i.test(k) ? "SUV" : "Sedán";
