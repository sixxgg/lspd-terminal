// @ts-nocheck
/* extraído tal cual de la versión clásica: entrevista de aspirantes (RTD) */
import { joinY, norm, hoyISO, isoToDMY as isoDMY } from "@/lib/domain";
const RTD_CASOS=[
 "Acudes a un aviso de un posible secuestro de un civil cerca del Vanilla Unicorn. Al llegar, ves a un familiar tuyo apuntando con un arma de fuego a la sien del civil. ¿Cómo actuarías?",
 "Llegas a una zona de Union y ves a un compañero abatido y a un civil desangrándose. ¿Cómo actuarías? ¿Y si en lugar de un civil fuera un delincuente?",
 "Una señora está tirada en el suelo pidiendo ayuda mientras el SAED la atiende; grita que le han robado. Ves a un hombre afroamericano corriendo por la misma acera y a un hombre latino corriendo por la acera de enfrente. ¿Qué harías?",
 "Estás solo en una persecución y la persona a la que persigues atropella a un civil. ¿Cómo actuarías? ¿Seguirías la persecución? ¿Y si atropellara a un perro? Si la persona atropellada estuviera traficando con drogas, ¿actuarías de la misma forma?",
 "Realizas una parada de tráfico a un vehículo que circula a 73 km/h en ciudad. Al identificar al conductor, su historial está completamente limpio. ¿Cómo actuarías? ¿Y si circulara a 80 km/h?",
 "Te asignan de compañero a alguien cercano (familiar, amigo o pareja). Durante el patrullaje, en un barrio conflictivo, ves que intercambia objetos con unos sujetos de apariencia sospechosa. ¿Cómo actuarías?",
 "Estás de patrulla con tu compañero y recibes un mensaje de tu madre: tuvo un accidente en casa, está herida y se incendió la cocina. Decides ir a ayudarla, pero en ese momento Mando ordena a todas las unidades acudir en código 1 prioritario a apoyar a un compañero que está en un tiroteo. ¿Cómo actuarías?",
 "Recibes un aviso de robo en una farmacia y Mando te asigna el altercado. Al llegar, descubres que el ladrón es tu mejor amigo: su madre está muy enferma y está robando medicamentos porque no puede pagarlos. ¿Cómo procedes?",
 "Estás en una persecución de un vehículo cuando Mando te asigna a otra emergencia. El vehículo está muy cerca y podrías detenerlo fácilmente para que pague por sus delitos. ¿Qué haces?",
 "Durante un patrullaje, tres sujetos te acorralan y te apuntan con armas de fuego. ¿Cómo procedes?"];
const RTD_DIV="Recruitment and Training Division";
const rtdCaso=c=>c.c==="otro"?(c.txt||"").trim():RTD_CASOS[c.c]||"";
const rtdScore=A=>{const v=(A.casos||[]).filter(c=>c.ok);return [(A.casos||[]).filter(c=>c.ok==="si").length,v.length]};
function rtdAge(f){const M=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(f).trim());if(!M)return "";const d=+M[1],m=+M[2],y=+M[3],n=new Date();if(m<1||m>12||d<1||d>31)return "";let a=n.getFullYear()-y;if(n.getMonth()+1<m||(n.getMonth()+1===m&&n.getDate()<d))a--;return a>=0&&a<120?String(a):""}

/* ---------- postulación inicial: lectura y contraste con la entrevista ---------- */
const RTD_F=[["asp","Nombre",1],["cid","CitizenID",1],["fnac","Fecha de nacimiento",1],["edad","Edad",1],["lugar","Lugar de nacimiento",1],
  ["edu","Educación",0],["trab","Trabajos anteriores",0],["porq","¿Por qué quiere entrar?",0],["exp","Experiencia previa",0],["dif","Qué lo diferencia",0]];
const RTD_LBL=[["lugar",/lugar de nacimiento|nacionalidad|procedencia|origen/],["fnac",/fecha de nacimiento|nacimiento|naci[oó]/],["edad",/^edad|años/],
  ["cid",/citizen ?id|\bcid\b|state ?id|^id\b|dni|documento/],["asp",/^nombre|aspirante|nombre y apellido|nombre completo|nombre ic/],
  ["exp",/experiencia previa|departamentos? gubernamental|gubernamental|experiencia en (otros )?(cuerpos|departamentos)/],["edu",/educaci|estudios|formaci[oó]n acad/],
  ["trab",/trabajos?|empleos?|experiencia laboral|ocupaci/],["porq",/por qu[eé]|motivaci|motivo/],["dif",/diferen|aport|destac/]];
function parsePost(txt){
  const out={},lines=String(txt||"").replace(/\r/g,"").split("\n");let cur=null;
  const clean=l=>l.replace(/[*_`>#]+/g,"").replace(/^[\s\-•·]+/,"").replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,"").trim();
  for(const raw of lines){const l=clean(raw);if(!l){continue}
    const m=/^([^:?]{2,90})([:?])\s*(.*)$/.exec(l);let hit=null;
    if(m){const lab=norm(m[1]+(m[2]==="?"?"?":""));const f=RTD_LBL.find(([,re])=>re.test(lab));if(f&&lab.length<90)hit=[f[0],m[3]]}
    if(hit){cur=hit[0];if(!out[cur])out[cur]=hit[1].trim();continue}
    if(cur)out[cur]=(out[cur]?out[cur]+"\n":"")+l}
  return out}
const tok=s=>new Set(norm(s||"").split(/[^a-z0-9ñ]+/).filter(w=>w.length>3));
function cmpVal(k,a,b,exact){a=String(a||"").trim();b=String(b||"").trim();if(!a||!b)return "nd";
  if(exact){const x=norm(a).replace(/[^a-z0-9]/g,""),y=norm(b).replace(/[^a-z0-9]/g,"");return x===y||(x.length>3&&(x.includes(y)||y.includes(x)))?"ok":"no"}
  const A=tok(a),B=tok(b);if(!A.size||!B.size)return "nd";let n=0;A.forEach(w=>{if(B.has(w))n++});const s=n/Math.min(A.size,B.size);return s>=.45?"ok":s>=.2?"mid":"no"}
function rtdCmp(A){if(!(A.post||"").trim())return [];const P=parsePost(A.post);
  return RTD_F.map(([k,l,ex])=>({k,l,p:P[k]||"",e:A[k]||"",s:cmpVal(k,P[k],A[k],ex)}))}
const CMP_I={ok:"✅",mid:"🟡",no:"⚠️",nd:"➖"}, CMP_L={ok:"Coincide",mid:"Parcial",no:"Difiere",nd:"Sin dato"};

function rtdText(A){
  const q=s=>(s||"").trim()?(s||"").trim().split("\n").map(l=>"> "+l).join("\n"):"> —";
  const li=a=>a.filter(x=>(x||"").trim()).map(x=>"- "+x.trim()).join("\n")||"- —";
  const [ok,tot]=rtdScore(A), R0={apto:"✅ **APTO**",noapto:"❌ **NO APTO**",pend:"🕓 **PENDIENTE**"}[A.res]||"🕓 **PENDIENTE**";
  let s=`# 🎓 ENTREVISTA DE ASPIRANTE · LSPD
**${RTD_DIV}**

**Aspirante:** ${A.asp||"—"}
**CitizenID:** ${A.cid||"—"}
**Fecha de nacimiento:** ${A.fnac||"—"}${A.edad?` (${A.edad} años)`:""}
**Lugar de nacimiento:** ${A.lugar||"—"}
**Entrevistadores:** ${A.ent.length?joinY(A.ent):"—"}
**Fecha de la entrevista:** ${A.fecha||isoDMY(hoyISO())}

## 📋 Información personal
**Educación**
${q(A.edu)}
**Trabajos anteriores**
${q(A.trab)}
**Fortalezas**
${li(A.fort)}
**Debilidades**
${li(A.deb)}
**¿Por qué quiere entrar en la LSPD?**
${q(A.porq)}
**¿Tiene experiencia previa relacionada con departamentos gubernamentales?**
${q(A.exp)}
**¿Qué lo diferencia de los demás aspirantes?**
${q(A.dif)}

## ⚖️ Casos prácticos
`;
  if(!A.casos.length)s+="> —\n\n";
  A.casos.forEach((c,i)=>{s+=`**${i+1}. ${rtdCaso(c)||"—"}**\n${q(c.r)}\n${c.ok==="si"?"✅ Correcto":c.ok==="no"?"❌ Incorrecto":"➖ Sin evaluar"}\n\n`});
  const C=rtdCmp(A).filter(x=>x.s!=="nd");
  if(C.length){s+=`## 🔎 Contraste con la postulación\n`+C.map(x=>`${CMP_I[x.s]} **${x.l}**${x.s==="no"&&RTD_F.find(f=>f[0]===x.k)[2]?` · postulación: ${x.p.split("\n")[0]} · entrevista: ${x.e}`:x.s==="ok"?"":` · ${CMP_L[x.s].toLowerCase()}`}`).join("\n")+"\n\n"}
  s+=`## Resultado: ${R0}${tot?` · ${ok}/${tot} casos correctos`:""}`;
  if((A.nota||"").trim())s+=`\n${q(A.nota)}`;
  return s+`\n\n*Atte. ${RTD_DIV} · LSPD*`;
}
/* Discord admite 2000 caracteres por mensaje: se corta por secciones */
function rtdParts(s){const out=[];let cur="";for(const blk of s.split(/\n(?=## |\*\*\d\. )/)){const b=(cur?"\n":"")+blk;if((cur+b).length>1950&&cur){out.push(cur);cur=blk}else cur+=b}if(cur)out.push(cur);
  return out.flatMap(p=>p.length<=1990?[p]:p.match(/[\s\S]{1,1990}/g))}

export { RTD_CASOS, RTD_DIV, RTD_F, rtdCaso, rtdScore, rtdAge, parsePost, rtdCmp, CMP_I, CMP_L, rtdText };
