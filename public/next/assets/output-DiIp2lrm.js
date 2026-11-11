import{L as t,b as _,j as e,o as y,r as k,B as x,c as L}from"./index-Ca5g1gyk.js";import{r,bO as j,f as T,F as A,aG as P,a6 as z,aJ as S}from"./icons-DDA_xJ0w.js";import{a as F,d as q}from"./discord-BqeG1o7c.js";const R={l:"Anuncio de Alerta Táctica aprobada",vars:["tipo","nivel","plazo","inicio_fecha","inicio_hora","fin_fecha","fin_hora","fin_relativo","puntos","lugares","incidente","rol","emoji","nota"],t:`# {emoji} **ALERTA TÁCTICA {nivel}** {emoji}

Se activa la **Alerta Táctica {nivel}** durante un **plazo** de **{plazo}** —del {inicio_fecha} a las {inicio_hora} al {fin_fecha} a las {fin_hora}—; esta alerta entra en vigor desde la emisión de la presente notificación.

> **Zonas afectadas:** {puntos}
> **Incidente:** C-{incidente}
> **Finaliza:** {fin_relativo}

{rol}`},O={l:"Anuncio de ascenso · variante 1",vars:["emoji","fecha","mencion","nombre","rango","rango_anterior","desde","firma","el_agente","ascendido"],t:`# {emoji} **ASCENSO LSPD** {emoji}

Estimados miembros del Departamento de Policía de Los Santos,

Se informa que, con fecha **{fecha}**, {mencion} ha sido {ascendido} al rango de **{rango}** en reconocimiento a su compromiso, desempeño y dedicación al servicio del Departamento.

Este ascenso refleja la confianza depositada en {el_agente} para asumir nuevas responsabilidades, así como su capacidad para mantener los estándares de profesionalidad y operatividad exigidos.

Desde **{desde}**, se le traslada la enhorabuena y se le anima a continuar desempeñando sus funciones con el mismo nivel de implicación y compromiso.

¡Enhorabuena, {mencion}!

*{firma}*`},M={l:"Anuncio de ascenso · variante 2",vars:["emoji","fecha","mencion","nombre","rango","rango_anterior","desde","firma","el_agente","ascendido"],t:`# {emoji} **ASCENSO LSPD** {emoji}

Estimados miembros del Departamento de Policía de Los Santos,

Es un placer comunicar que, con fecha **{fecha}**, {mencion} ha sido {ascendido} al rango de **{rango}**.

Este nuevo paso en su carrera es fruto de su esfuerzo constante, su vocación de servicio y el ejemplo que ha sabido dar a sus compañeros en cada turno. Su trayectoria demuestra que el trabajo bien hecho siempre encuentra su recompensa.

Desde **{desde}**, le deseamos mucho éxito en esta nueva etapa y confiamos en que seguirá representando los valores del Departamento con el mismo orgullo y profesionalidad.

¡Felicidades, {mencion}!

*{firma}*`},V={l:"Anuncio de ascenso · variante 3",vars:["emoji","fecha","mencion","nombre","rango","rango_anterior","desde","firma","el_agente","ascendido"],t:`# {emoji} **ASCENSO LSPD** {emoji}

Estimados miembros del Departamento de Policía de Los Santos,

Nos complace anunciar que, a partir del **{fecha}**, {mencion} pasa a ostentar el rango de **{rango}**.

Su dedicación, disciplina y compromiso con la seguridad de los ciudadanos de Los Santos no han pasado desapercibidos. Este ascenso es el reconocimiento a una labor ejemplar y a la confianza que el mando deposita en su criterio para asumir mayores responsabilidades.

Desde **{desde}**, le trasladamos nuestra más sincera enhorabuena. Que esta nueva insignia sea un motivo de orgullo y un impulso para seguir creciendo dentro del Departamento.

¡Enhorabuena, {mencion}! Sigue así.

*{firma}*`},I={l:"Anuncio de descenso",vars:["emoji","fecha","mencion","nombre","rango","rango_anterior","desde","firma","el_agente","descendido"],t:`# {emoji} **DESCENSO LSPD** {emoji}

Estimados miembros del Departamento de Policía de Los Santos,

Se informa que, con fecha **{fecha}**, {mencion} ha sido {descendido} al rango de **{rango}**.

Esta medida responde a la necesidad de mantener los estándares de profesionalidad, disciplina y operatividad exigidos por el Departamento.

Desde **{desde}**, se le anima a reflexionar sobre lo ocurrido y a continuar desempeñando sus funciones con el compromiso que el servicio requiere.

*{firma}*`},B={alerta:R,asc:O,asc2:M,asc3:V,desc:I},H=B,f={emoji:"<:LSPD:1316164582732988457>",alertRole:"1322196291509555283",alertRoleName:"Alerta Táctica",desde:"Capitanía",firma:"Atte. Capitanía LSPD"};function K(){const a={...f,...t.json("lspdt.dcfg",{})};return(!a.desde||a.desde==="Supervisores")&&(a.desde=f.desde),(!a.firma||a.firma==="Atte. Supervisores LSPD")&&(a.firma=f.firma),a}const W=a=>t.get("lspdt.tpl."+a)||H[a].t,X=(a,n)=>a.replace(/\{(\w+)\}/g,(s,o)=>n[o]!==void 0?n[o]:s).replace(/\n{3,}/g,`

`).trim(),G=a=>{const n={title:"Terminal de Mando",kicker:"Los Santos Police Department",foot:"Mission Row 10 · Uso interno",place:"Los Santos · Mission Row 10",bot:"LSPD Terminal"};return String(t.json("lspdt.ui",{})[a]||"").trim()||n[a]};async function J(a){try{return await navigator.clipboard.writeText(a),!0}catch{const n=document.createElement("textarea");n.value=a,document.body.appendChild(n),n.select();const s=document.execCommand("copy");return n.remove(),s}}function C(){const{toast:a}=_();return async(n,s)=>s?.length?(a("Falta completar: "+s.join(", "),"err"),!1):await J(n)?(a("Copiado"),!0):(a("No se pudo copiar","err"),!1)}function Y({title:a,text:n,footer:s,errors:o,ctx:d,tag:l="Discord",sticky:m=!0,extra:p,web:D=!0}){const[c,w]=r.useState("dc"),[i,u]=r.useState(n),[g,h]=r.useState(!1);r.useEffect(()=>u(n),[n]);const N=C(),b=c==="web"?F(i):i,v=i!==n;return e.jsxs(y,{className:L("flex flex-col overflow-hidden",m&&"lg:sticky lg:top-32"),children:[e.jsxs("div",{className:"flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800",children:[e.jsx("div",{className:"grid size-8 place-items-center rounded-lg bg-[#5865F2]/10 text-[#5865F2] dark:bg-[#5865F2]/20 dark:text-[#a5b0ff]",children:e.jsx(j,{className:"size-4"})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-[10px] font-bold uppercase tracking-wider text-slate-400",children:l}),e.jsx("h3",{className:"truncate text-sm font-semibold",children:a})]})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2 px-4 pt-3",children:[e.jsx(k,{size:"sm",value:c,onChange:w,options:[{value:"dc",label:"Formato Discord",icon:e.jsx(j,{})},{value:"pv",label:"Vista Discord",icon:e.jsx(T,{})},...D?[{value:"web",label:"Formato web",icon:e.jsx(A,{})}]:[]]}),p]}),o&&o.length>0&&e.jsxs("div",{className:"mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",children:["Falta completar: ",e.jsx("b",{children:o.join(", ")})]}),e.jsxs("div",{className:"p-4",children:[c==="pv"?e.jsx("div",{className:"scrollbar-thin max-h-[66vh] overflow-auto rounded-xl bg-[#313338] p-4 text-[15px] leading-[1.375] text-[#dbdee1]",dangerouslySetInnerHTML:{__html:q(i,d,G("bot"),t.get("lspdt.img.dcav")||t.get("lspdt.logo")||"/next/logo.svg")}}):c==="web"?e.jsx("pre",{className:"scrollbar-thin max-h-[66vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 font-sans text-[13px] leading-relaxed text-slate-200 ring-1 ring-inset ring-white/5",children:b}):e.jsx("textarea",{value:i,onChange:E=>u(E.target.value),spellCheck:!1,className:"scrollbar-thin block h-[52vh] max-h-[66vh] min-h-[180px] w-full resize-y rounded-xl bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-slate-200 outline-none ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-brand-500/60"}),e.jsxs("p",{className:"mt-2 text-[11px] text-slate-400",children:[i.length," caracteres",v?" · editado a mano":""," · Copiar copia el formato elegido"]})]}),e.jsxs("div",{className:"flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800",children:[v&&e.jsx(x,{variant:"ghost",size:"sm",icon:e.jsx(P,{}),onClick:()=>u(n),title:"Volver al texto generado",children:"Restaurar"}),s,e.jsx(x,{onClick:async()=>{await N(b,o)&&(h(!0),setTimeout(()=>h(!1),1500))},icon:g?e.jsx(z,{}):e.jsx(S,{}),children:g?"Copiado":"Copiar"})]})]})}function $({label:a,text:n,errors:s,tag:o}){const[d,l]=r.useState(n);r.useEffect(()=>l(n),[n]);const m=C();return e.jsxs(y,{className:"overflow-hidden",children:[e.jsxs("div",{className:"flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800",children:[o&&e.jsx("span",{className:"rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-100 dark:bg-slate-800",children:o}),e.jsx("span",{className:"flex-1 text-sm font-semibold",children:a})]}),e.jsx("textarea",{value:d,onChange:p=>l(p.target.value),rows:3,spellCheck:!1,className:"block w-full resize-y bg-slate-950 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-slate-200 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/60"}),e.jsx("div",{className:"flex justify-end border-t border-slate-100 px-4 py-2.5 dark:border-slate-800",children:e.jsx(x,{size:"sm",variant:"outline",icon:e.jsx(S,{}),onClick:()=>m(d,s),children:"Copiar"})})]})}export{$ as C,Y as D,H as T,J as c,K as d,X as f,W as t,C as u};
