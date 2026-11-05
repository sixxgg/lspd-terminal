// @ts-nocheck
/* Lógica de textos de la Alerta Táctica, idéntica a la versión clásica */
import { joinY, norm } from "@/lib/domain";
import { dcfg, fillTpl, tplOf } from "@/lib/templates";
export const ALT_PUNTOS=["Los Santos","Sandy Shores","Grapeseed","Paleto Bay"];
/* hechos por categoría (los que empiezan con artículo cuentan como singular) */
export const ALT_HECHOS=[
 ["Violencia armada",["tiroteos masivos","intercambios de disparos con los efectivos policiales","enfrentamientos armados entre bandas rivales","disparos indiscriminados contra la población civil","emboscadas a unidades policiales","ataques con armas de fuego desde vehículos en movimiento","francotiradores apostados en edificios y azoteas","disparos contra las unidades aéreas del Departamento","ajustes de cuentas entre organizaciones criminales"]],
 ["Explosivos e incendios",["múltiples explosiones","detonaciones de artefactos explosivos","ataques con cócteles molotov","incendios en distintos puntos","incendios provocados en edificios y comercios","vehículos incendiados en la vía pública","explosiones de vehículos","una explosión en una gasolinera"]],
 ["Delitos graves",["robos a mano armada en entidades bancarias","atracos a comercios y joyerías","robos de vehículos con violencia","una toma de rehenes","secuestros de civiles","el secuestro de agentes del Departamento","asaltos a furgones blindados","homicidios en la vía pública","tráfico y distribución de armas de fuego"]],
 ["Contra el Departamento",["ataques directos contra agentes del Departamento","ataques contra comisarías e instalaciones policiales","emboscadas a patrullas","robos de vehículos y equipamiento policial","robos de armamento estatal","el robo de armamento estatal de las instalaciones policiales","robos de armamento estatal a agentes del Departamento","robos de armamento estatal de vehículos policiales","amenazas contra efectivos policiales","intentos de liberación de detenidos"]],
 ["Orden público",["disturbios y desórdenes públicos","saqueos a comercios","barricadas en la vía pública","cortes de calles y accesos","atropellos intencionados","persecuciones a alta velocidad","fugas a alta velocidad poniendo en riesgo a la población","pánico generalizado entre la población"]]
];
export const ALT_ARMAS=["armas de fuego cortas","subfusiles","fusiles de asalto","escopetas","rifles de precisión","ametralladoras","armas pesadas","explosivos","granadas","lanzacohetes","chalecos antibalas","vehículos blindados"];
export const ALT_FRASES=[...ALT_HECHOS.flatMap(c=>c[1]),...ALT_ARMAS.map(a=>"portando "+a),"con la presencia de numerosos sujetos armados","la población civil se vio obligada a refugiarse",
  "los efectivos desplegados se vieron superados en número","fue necesario solicitar apoyo de unidades especiales","se registraron daños en infraestructuras críticas",
  "se produjeron cortes en el suministro eléctrico","los sospechosos se dieron a la fuga","varios sospechosos continúan sin ser localizados","se requirió la intervención del SWAT",
  "se requirió apoyo aéreo","se sustrajo armamento estatal","el armamento estatal sustraído sigue sin ser recuperado","se establecieron perímetros de seguridad","se evacuaron edificios de la zona","los incidentes se prolongaron durante varias horas"].map(n=>({n}));

/* consecuencias: s=singular, p=plural, g=género de "varios/varias", pre=lo que va antes del número */
export const ALT_CONS=[
 ["Agentes",[["oh","oficial herido por impacto de bala","oficiales heridos por impactos de bala","m"],["oc","agente en código negro","agentes en código negro","m"],["om","agente del Departamento","agentes del Departamento","m","el homicidio de "],["os","agente secuestrado","agentes secuestrados","m"]]],
 ["Civiles",[["ch","civil herido por impacto de bala","civiles heridos por impactos de bala","m"],["cc","civil en código negro","civiles en código negro","m"],["cm","civil","civiles","m","el homicidio de "],["cr","rehén retenido","rehenes retenidos","m"],["cs","persona secuestrada","personas secuestradas","f"]]],
 ["Servicios de emergencia",[["bh","bombero herido por impacto de bala","bomberos heridos por impactos de bala","m"],["eh","sanitario herido por impacto de bala","sanitarios heridos por impactos de bala","m"],["em","miembro del personal sanitario","miembros del personal sanitario","m","el homicidio de "],["ea","ataque a ambulancias o vehículos de emergencia","ataques a ambulancias y vehículos de emergencia","m"]]],
 ["Daños",[["vp","vehículo policial destruido","vehículos policiales destruidos","m"],["ua","unidad aérea dañada o derribada","unidades aéreas dañadas o derribadas","f"],["cs2","comercio saqueado","comercios saqueados","m"],["ei","edificio incendiado","edificios incendiados","m"],["ra","arma estatal sustraída","armas estatales sustraídas","f"],["rc","","robo de armamento estatal","m","",true],["dm","","graves daños materiales en la vía pública","m","",true]]]
];
export const CONS_MAP=Object.fromEntries(ALT_CONS.flatMap(c=>c[1]).map(x=>[x[0],x]));
export function consTxt(k,n){const [,s,p,g,pre="",noN]=CONS_MAP[k];n=parseInt(n)||0;
  if(noN)return `**${p}**`;
  const q=n===1?(g==="f"?"una":"un"):n>1?String(n):(g==="f"?"varias":"varios");
  return `**${pre}${q} ${n===1?s:p}**`}

export const isSing=h=>/^(un|una|el|la) /.test(h);
export const altPal=A=>A.tipo==="ampliacion"?"ampliación":"elevación";
export function altParts(A){
  const N=`Nivel ${A.nivel}`, ac=[];
  if(A.hechos.length){const sing=A.hechos.length===1&&isSing(A.hechos[0]);
    ac.push(`Durante los acontecimientos, se ${sing?"ha":"han"} producido **${joinY(A.hechos)}**`);
    if(A.sujetos||A.armas.length) ac[0]+=`${A.hechos.length>1||!sing?", en los que":". Asimismo,"} se ha registrado la presencia de ${A.sujetos?`aproximadamente más de **${A.sujetos} sujetos armados**`:"numerosos sujetos armados"}${A.armas.length?`, portando ${joinY(A.armas)}`:""}`;
    ac[0]+=".";
  }else if(A.sujetos||A.armas.length) ac.push(`Durante los acontecimientos, se ha registrado la presencia de ${A.sujetos?`aproximadamente más de **${A.sujetos} sujetos armados**`:"numerosos sujetos armados"}${A.armas.length?`, portando ${joinY(A.armas)}`:""}.`);
  let ex=(A.extra||"").trim(); if(ex){ex=ex.charAt(0).toUpperCase()+ex.slice(1);if(!/[.!…]$/.test(ex.replace(/\*+$/,"")))ex+=".";ac.push(ex)}
  const armados=!!(A.sujetos||A.armas.length||A.hechos.some(h=>/tirote|disparo|armad|francotir|emboscad/.test(h)));
  const cons=Object.keys(A.cons).filter(k=>CONS_MAP[k]).map(k=>consTxt(k,A.cons[k]));
  if((A.otras||"").trim()) cons.push(A.otras.trim().replace(/\.$/,""));
  const T=norm(A.hechos.join(" ")+" "+(A.extra||"")), motivo=[];
  if(armados) motivo.push("la presencia de numerosos sujetos armados");
  const ex2=/explosi|detonac|molotov/.test(T), inc=/incendi/.test(T);
  if(ex2&&inc) motivo.push("las múltiples explosiones e incendios"); else if(ex2) motivo.push("las explosiones registradas"); else if(inc) motivo.push("los incendios registrados");
  if(/armamento estatal/.test(T)||A.cons.ra!==undefined||A.cons.rc!==undefined) motivo.push("el robo de armamento estatal");
  if(/rehen|secuestr/.test(T)) motivo.push("la retención de personas contra su voluntad");
  if(/agentes del departamento|comisar|patrulla|efectivos/.test(T)) motivo.push("los ataques dirigidos contra el Departamento");
  if(Object.keys(A.cons).length) motivo.push("el elevado número de afectados");
  return {N,ac,armados,cons,motivo};
}
export function altText(A,firma){
  const P=altParts(A), W=altPal(A);
  const puntos=A.puntos.length?joinY(A.puntos):"[puntos]";
  const lug=A.lugares.length?`${A.lugares.length===1?"la zona de":"las zonas de"} **${joinY(A.lugares)}**`:"las zonas de **[lugares]**";
  return `**ASUNTO: Solicitud de ${W} de la Alerta Táctica a ${P.N}**

**A la atención de Su Señoría:**

Por medio del presente escrito, se solicita la **${W} de la Alerta Táctica a ${P.N}**, debido a la gravedad de los recientes incidentes registrados en distintos puntos de ${puntos}, concretamente en ${lug}.

${P.ac.join(" ")||"[acontecimientos]"}

La magnitud de los incidentes${P.armados?" y el elevado número de individuos armados han":" ha"} generado una situación de extrema peligrosidad para la ciudadanía y los efectivos policiales desplegados en las zonas afectadas.${P.cons.length?` Asimismo, se ${P.cons.length===1&&/^\*\*un|^el /.test(P.cons[0])?"ha":"han"} registrado ${joinY(P.cons)}, como consecuencia de la gravedad de los enfrentamientos y los incidentes ocurridos.`:""}

Ante la gravedad de los hechos${P.motivo.length?", "+joinY(P.motivo):""}, se considera necesaria la ${W} de la Alerta Táctica a **${P.N}**, con el objetivo de reforzar las medidas de seguridad, incrementar la capacidad de respuesta del Departamento y garantizar, en la medida de lo posible, la protección de los agentes y de la población civil.

Incidente número **C-${(A.inc||"").padEnd(4,"X")}**.

Por todo lo expuesto, **solicitamos a Su Señoría que valore y autorice la ${W} de la Alerta Táctica a ${P.N}**, atendiendo a la gravedad de los acontecimientos y al riesgo que representan para la seguridad pública y la integridad de los efectivos policiales.

Atentamente,

${firma||"[firma]"}`;
}
export const plazoTxt=(d,h)=>[d?`${d} ${+d===1?"día":"días"}`:"",h?`${h} ${+h===1?"hora":"horas"}`:""].filter(Boolean).join(" y ")||"0 horas";
export function annText(r){const R=r.res,c=dcfg(),ini=R.ini,fin=R.fin;
  return fillTpl(tplOf("alerta"),{tipo:r.tipo==="ampliacion"?"Ampliación":"Elevación",nivel:R.nivel,plazo:plazoTxt(R.dias,R.horas),inicio_fecha:`<t:${ini}:D>`,inicio_hora:`<t:${ini}:t>`,fin_fecha:`<t:${fin}:D>`,fin_hora:`<t:${fin}:t>`,
    fin_relativo:`<t:${fin}:R>`,puntos:joinY(r.puntos||[]),lugares:joinY(r.lugares||[]),incidente:r.inc||"XXXX",rol:c.alertRole?`<@&${c.alertRole}>`:"",emoji:c.emoji||"",nota:R.nota||""})}
