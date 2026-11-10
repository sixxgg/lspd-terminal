/* Pack policial ONX del servidor (código de spawn, nombre). Liviano: lo usa la revisión de patrullas sin cargar todos los modelos del juego. */
export const ONX: [string, string][] = [
  ["ONX_POLBUFF", "Police Buffalo"], ["ONX_POLBUFFHF", "Police Buffalo Hellfire Interceptor"], ["ONX_POLMONAR", "Police Monarch"], ["onx_polmerit", "Police Merit"], ["ONX_POLMERIT2", "Police Merit PPV"],
  ["ONX_POLMERIT3", "Police Merit Classic Modkit"], ["ONX_POLTULIP", "Police Tulip M-100 Sedan"], ["ONX_POLTAVROS", "Police Tavros"], ["ONX_POLALEU", "Police Aleutian"], ["ONX_POLSCOUT", "Police Scout"],
  ["ONX_POLSCOUT2", "Police Scout Classic"], ["ONX_POLDORADO", "Police Dorado"], ["ONX_POLDORADO2", "Police Dorado ST"], ["ONX_POLTERM", "Police Terminus"], ["ONX_POLTERM2", "Police Terminus Overland"],
  ["ONX_POLCAVA", "Police Cavalcade"], ["ONX_POLSTALK", "Police Landstalker"], ["ONX_POLGRANG", "Police Granger 3600LX"], ["ONX_POLGRANG2", "Police Granger 3700LX"], ["ONX_POLALAMO", "Police Alamo 2700LX"],
  ["ONX_POLSEM", "Police Seminole Frontier"], ["ONX_POLREGENT", "Police Regent"], ["ONX_POLREGENTXL", "Police Regent XL"], ["ONX_POLCARA", "Police Caracara Raid"],
  ["ONX_POLSAND0", "Police Sandstorm D205"], ["ONX_POLSAND0XL", "Police Sandstorm D205 XL"], ["ONX_POLSAND0H", "Police Sandstorm D205 Hellenbach"], ["ONX_POLSAND0SC", "Police Sandstorm D205 Single Cab"],
  ["ONX_POLBISON", "Police Bison 35 XD"], ["ONX_POLBISON2", "Police Bison 45XD"], ["ONX_POLBISON3", "Police Bison 35XD Sasquatch"], ["ONX_POLBISON4", "Police Bison 25XD Single Cab"],
  ["ONX_POLINVICT", "Police Invictus"], ["ONX_POLINVICT2", "Police Invictus II"], ["ONX_POLVERUS", "Police Verus"], ["ONX_POLKANDRA", "Police Kandra"],
  ["ONX_POLGAUNT", "Police Gauntlet Interceptor"], ["ONX_POLDOM", "Police Dominator Interceptor"], ["ONX_POLVIGERO", "Police Vigero Interceptor"], ["ONX_POLVSTR", "Police Presidente VSTR Interceptor"],
  ["ONX_POLCOQ", "Police Coquette Interceptor"], ["ONX_POLCOQ2", "Police Coquette D10 Interceptor"], ["ONX_POLCOQ3", "Police Coquette D7 Interceptor"],
  ["ONX_POLSANDK", "Vapid Sandking D155"], ["ONX_POLSANDK2", "Vapid Sandking D155 SWB"], ["ONX_POLSANDK3", "Vapid Sandking D155 XL"], ["ONX_POLSANDK4", "Vapid Sandking D155 Compensator"],
  ["ONX_POLSANDK5", "Vapid Sandking D155 SWB Compensator"], ["ONX_POLSANDK6", "Vapid Sandking D155 XL Compensator"], ["ONX_POLGUARD", "Police Guardian C105"], ["ONX_POLGUARD2", "Police Guardian C105 SWB"],
  ["ONX_POLJOG", "Police Jogger LWB"], ["ONX_POLJOG2", "Police Jogger SWB"], ["ONX_POLJOG3", "Police Jogger Transport LWB"], ["ONX_POLJOG4", "Police Jogger Transport SWB"],
  ["ONX_POLMAV", "Police Maverick (helicóptero)"], ["ONX_POLCON", "Police Conada (helicóptero)"],
];
/* patrullas terrestres (sin helicópteros), para la revisión de patrullas */
export const PATROL_CARS: [string, string][] = ONX.filter(([, m]) => !/helic/i.test(m)).map(([s, m]) => [s.toLowerCase(), m]);
