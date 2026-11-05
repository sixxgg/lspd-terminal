// @ts-nocheck
/* extraído tal cual de la versión clásica: catálogo penal (Manual del sistema sancionador) y constantes de informes */
const PC=(c,k,L)=>L.map(([a,t,d,x])=>Object.assign({a,t,d:d||"",c,k},x||{}));
const PENAL_DEF=[
 ...PC("Homicidio","cp",[["119.3","Asesinato","",{m:90000,p:30}]]),
 ...PC("Lesiones","cp",[["121.1","Lesiones que requieren tratamiento médico o quirúrgico","Se acumula con otros delitos cuando protegen bienes distintos (ej: robo de vehículo y lesiones al propietario)."],
   ["121.3","Maltrato de obra sin causar lesión","",{m:800,p:0}]]),
 ...PC("Patrimonio · robos y hurtos","cp",[
   ["132.1","Hurto","Sustracción sin fuerza en las cosas. Se aplica también cuando el vehículo sustraído para su uso no se devuelve en 48 h y no hubo fuerza."],
   ["132.6","Robo con fuerza en las cosas","Artículo genérico cuando el objetivo no figura en la guía de robos y se empleó fuerza."],
   ["132.7","Robo con fuerza agravado","Robo con fuerza en las cosas con circunstancias agravantes."],
   ["132.8","Robo en casa habitada, edificio o local abierto al público",""],
   ["132.9","Robo en casa habitada agravado por modo o circunstancias",""],
   ["132.10","Robo con violencia o intimidación en las personas","Artículo genérico cuando el interés real del robo es la violencia ejercida y no el lugar.",{m:15000,p:20}],
   ["132.11","Robo violento en casa habitada, edificio o local",""],
   ["132.12","Robo violento con armas o medios peligrosos",""],
   ["132.14","Hurto de uso de vehículo a motor o ciclomotor","Uso no autorizado sin ánimo de apropiárselo («joyriding»): se coge, se usa y se abandona sin más incidencias."],
   ["132.15","Hurto de uso con fuerza en las cosas","Igual que el 132.14, pero el autor forzó la cerradura, el contacto u otro elemento del vehículo para acceder a él."],
   ["132.16","Robo de vehículo cuando no se restituye en plazo","El vehículo no se devuelve dentro de las 48 h: el hurto de uso pasa a robo. No es autónomo: se aplica el 132.6 (con fuerza) o el 132.1 (sin fuerza)."],
   ["132.17","Hurto o robo de uso de vehículo con violencia o intimidación","Cualquiera de los supuestos 132.14 a 132.16 cometido con violencia o intimidación sobre las personas."],
   ["132.101","Robo de bienes a civiles","Tirón, manguzo u otra sustracción directa a una persona."],
   ["132.102","Robo de cajas fuertes, taquillas o contenedores",""],
   ["132.103","Robo de objetos en inmuebles o muebles públicos o privados","Artículo genérico para objetos dentro de inmuebles o muebles."],
   ["132.104","Robo o uso no autorizado de vehículos motorizados","Robo de un vehículo corriente cuando no consta plazo, fuerza o violencia concretos. Artículo por defecto para un robo de coche «normal».",{m:1800,p:6}],
   ["132.105","Robo de vehículo de alta gama o importación","Mismo supuesto que el 132.104, pero el vehículo es de alta gama o de importación."],
   ["132.106","Robo a carguero o yate","Con hackers."],
   ["132.107","Robo a residencias particulares",""],
   ["132.108","Robo a fábrica textil o depósito industrial","Incluye Union Depository."],
   ["132.110","Robo a pequeño comercio","Licorería, 24/7, peluquería, barbería o tienda de ropa."],
   ["132.112","Robo de bienes de lujo en establecimiento comercial",""],
   ["132.113","Robo a casa de cambio, lavandería o casa de empeños",""],
   ["132.114","Robo a establecimiento dedicado a la seguridad",""],
   ["132.115","Robo a armería (Ammunation)",""],
   ["132.116","Robo a galería de arte","Con hackers."],
   ["132.117","Robo a entidad bancaria Fleeca","Con hackers."],
   ["132.118","Robo a gran entidad bancaria","Pacific Bank, Señora Bank o Maze Bank."],
   ["132.119","Robo a salón de juegos",""],
   ["132.121","Robo de armamento estatal",""],
   ["132.122","Robo de equipo estatal","Sin violencia."],
   ["132.125","Robo a residencias particulares de lujo",""],
   ["132.126","Robo de vehículo industrial con carga","Sustracción sin violencia."],
   ["132.127","Robo de material sensible en inmueble de almacenamiento",""],
   ["132.128","Robo de aeronaves",""],
   ["132.129","Robo a growshop o granja de cultivo",""],
   ["132.130","Robo a farmacia o tienda de informática",""],
   ["132.131","Asalto a furgón de transporte de caudales o mercancías",""],
   ["132.132","Robo a joyería",""],
   ["132.133","Robo a central eléctrica",""],
   ["132.134","Robo a laboratorio clandestino de sustancias",""],
   ["132.135","Robo a transporte de caudales tipo Bobcat","Con hackers."]]),
 ...PC("Medio ambiente","cp",[["136.10","Recogida, transporte o gestión ilegal de residuos peligrosos","Cuando hay riesgo real para el medio ambiente o la salud; si no, falta 37.3.7."]]),
 ...PC("Salud pública · drogas","cp",[
   ["138.21","Tráfico de drogas que causan grave daño a la salud","Tipo básico (cultivar, elaborar, transportar, traficar o poseer con ese fin) con sustancias de grave daño a la salud."],
   ["138.22","Tráfico de drogas que no causan grave daño a la salud","Tipo básico con sustancias no clasificadas como de grave daño a la salud."],
   ["138.23","Tráfico con circunstancias agravantes","El autor es autoridad, agente o funcionario en ejercicio, o difunde en centros docentes, penitenciarios o militares."],
   ["138.24","Tráfico en organización criminal","El autor forma parte de una organización o asociación, aunque sea transitoria, dedicada a la difusión."],
   ["138.25","Tráfico de extrema gravedad o jefes de organización","Dirige, administra o financia la organización, trafica con cantidades de extrema gravedad o utiliza a menores."],
   ["138.26","Tráfico ilegal de precursores químicos","Fabricar, transportar o comerciar con precursores para fabricar drogas, a sabiendas de su destino."],
   ["138.27","Tráfico cometido por profesional, funcionario o autoridad","Prevaliéndose del cargo o profesión. Sustituye al artículo base, no se acumula."],
   ["138.28","Provocación, conspiración y proposición al tráfico","Actos preparatorios que no llegan a consumarse. Nunca junto al tráfico realizado."],
   ["138.52","Distribución a pequeña escala","Menos de 20 unidades destinadas a venta o intercambio, o indicios claros de una transacción inmediata, sin agravantes."],
   ["138.53","Facilitación del consumo en locales","Titular o encargado que permite o tolera el consumo de sustancias ilícitas sin participar en el suministro."],
   ["138.54","Tolerancia al consumo por menores en locales","Como el 138.53, pero quienes consumen son menores."]]),
 ...PC("Seguridad vial (delitos)","cp",[
   ["138.30","Conducción bajo influencia de alcohol o drogas","Más de 0,60 mg/l en aire o 1,2 g/l en sangre, o influencia manifiesta de drogas en la conducción.",{pt:4}],
   ["138.31","Conducción temeraria con peligro concreto","Conducción temeraria que pone en peligro concreto a otros usuarios."],
   ["138.36","Negativa a someterse a las pruebas de alcohol o drogas","Tras una infracción o accidente. Se sanciona con más severidad que la conducción bajo los efectos."],
   ["138.37","Conducción sin permiso de conducir",""]]),
 ...PC("Autoridad y orden público","cp",[
   ["143.1","Atentado contra autoridad, sus agentes o funcionarios públicos","Agresión, resistencia grave con violencia o intimidación, o acometimiento. Absorbe la resistencia a la detención."],
   ["143.2","Atentado contra Gobierno, parlamentarios, jueces o fiscales","Como el 143.1, sobre autoridades de mayor rango institucional."],
   ["143.3","Atentado agravado","Con armas, peligro grave para la vida, vehículo, en un motín o con explosivos."],
   ["143.5","Atentado contra militares uniformados en servicio",""],
   ["143.6","Atentado contra bomberos, sanitarios o seguridad privada","Contra quienes colaboran con la autoridad en su servicio."],
   ["143.7","Resistencia o desobediencia grave a la autoridad","Oposición grave o desatención deliberada a órdenes legítimas, sin agresión."],
   ["143.8","Falta de respeto y consideración debida a la autoridad","Expresiones o gestos irrespetuosos de entidad suficiente para ser delito, sin desobediencia ni agresión."],
   ["143.39","Resistencia a la detención","Oposición física al arresto que obliga a usar la fuerza, sin agresión activa."],
   ["143.51","Negativa a identificación policial","Negativa reiterada tras requerimiento legal o datos falsos, obstruyendo la actuación."],
   ["143.52","Evasión y resistencia activa a la autoridad","Fuga tras ser requerido para detenerse, con persecución activa. Agrava si hay daños, riesgo a terceros o vehículo."]]),
 ...PC("Derecho de gentes","cp",[["145.9","Crimen de lesa humanidad: muerte","",{m:200000,p:30}]]),
 ...PC("Falta · Seguridad Ciudadana (Ley 25/2024)","adm",[
   ["29.1","Desobediencia leve a orden directa de la autoridad","Incumplimiento puntual, sin llegar a resistencia o desobediencia grave."],
   ["29.2","Faltas de respeto verbales o gestuales a funcionario público","Sin acometimiento físico. Si escala a desafío violento o intento de agresión: 143.1.",{g:"Grave"}],
   ["29.3","Negativa a identificarse ante requerimiento de la autoridad","Primera negativa; puede acabar en traslado a dependencias. Si es reiterada o con datos falsos: 143.51."],
   ["29.24","Ocultación del rostro impidiendo la identificación","Prendas, máscaras o cascos para impedir la identificación, sin causa justificada."],
   ["30.1","Intimidación verbal","Cuando la entidad no alcance las amenazas tipificadas como delito."]]),
 ...PC("Falta · Medio Ambiente (Ley 27/2024)","adm",[["37.3.7","Vertido de sustancias contaminantes a alcantarillado, cauce o suelo","Si hay riesgo real: 136.10.",{g:"Grave"}]]),
 ...PC("Falta · Seguridad Vial (Ley 26/2024)","adm",[
   ["63.1","Desobediencia a indicaciones de agentes de tráfico","Contextos de circulación y regulación del tráfico."],
   ["63.2","Desobediencia a indicaciones de agentes de tráfico","Contextos de circulación y regulación del tráfico."],
   ["63.4","Uso de vehículo no apto para la circulación","",{g:"Grave",pt:2}],
   ["63.6","Uso de teléfono móvil u otros dispositivos manuales durante la conducción","",{g:"Grave",pt:2}],
   ["64.4","Conducción con tasa de alcohol entre 0,15 y 0,60 mg/l aire","0,3 a 1,2 g/l en sangre. Por debajo de 0,15 no hay sanción; por encima de 0,60: 138.30.",{g:"Muy grave",pt:4}],
   ["64.5","Conducción con presencia de drogas en el organismo","Detectada por control, sin afectación apreciable de la conducción."],
   ["64.6","Negativa a identificar al conductor de un vehículo","Obligación del titular del vehículo."],
   ["64.12","Incumplimiento del alcoholímetro antiarranque","No instalar, manipular o no activar el dispositivo obligatorio."]])
];
const ADM_MULTA={"Leve":200,"Grave":400,"Muy grave":600};
PENAL_DEF.forEach(x=>{if(x.k==="adm"&&x.g&&!x.m)x.m=ADM_MULTA[x.g]});
const PEN_CATS=[...new Set(PENAL_DEF.map(x=>x.c))];
const CIRC=[["Atenuantes (Art. 21)",[["Eximente incompleta","Concurre una causa de exención (trastorno, intoxicación, legítima defensa, estado de necesidad, miedo insuperable…) sin todos sus requisitos."],["Grave adicción","Actúa por una grave adicción al alcohol, drogas u otras sustancias."],["Arrebato u obcecación","Actúa por estímulos tan intensos que provocan arrebato u otro estado pasional."],["Confesión","Confiesa antes de saber que se le investigaba."],["Reparación del daño","Repara o mitiga el daño a la víctima antes del juicio."],["Dilación extraordinaria","Retraso injustificado y no atribuible al acusado en el procedimiento."],["Análoga significación","Otra circunstancia de relevancia similar."]]],
 ["Agravantes (Art. 22)",[["Alevosía","Medios que aseguran el resultado sin riesgo por la defensa de la víctima."],["Disfraz / abuso de superioridad","Actúa disfrazado o aprovecha circunstancias que debilitan la defensa de la víctima."],["Precio, recompensa o promesa","Comete el delito a cambio de dinero, recompensa o promesa."],["Discriminación","Motivos racistas o de discriminación por ideología, religión, etnia, sexo, orientación, discapacidad u otras."],["Ensañamiento","Aumenta deliberada e inhumanamente el sufrimiento de la víctima."],["Abuso de confianza","Se aprovecha de la confianza que la víctima depositó en él."],["Prevalimiento del carácter público","Se aprovecha de su notoriedad o carácter público."],["Reincidencia","Condena firme previa por un delito del mismo título y naturaleza similar."]]],
 ["Parentesco (Art. 23)",[["Circunstancia mixta","Cónyuge o pareja, ascendiente, descendiente o hermano (propio o de la pareja). Suele agravar en delitos violentos y puede atenuar en patrimoniales sin violencia entre familiares."]]]];
const SYN={robo:["robo","hurto","sustrac","apropia","asalto","atraco"],droga:["droga","estupefac","narc","sustancia"],arma:["arma","fuego","blanca","municion"],
  vehiculo:["vehicul","conduc","trafico","velocidad","licencia","carnet","coche","moto"],coche:["vehicul","conduc"],moto:["vehicul","ciclomotor"],agresion:["agresi","lesion","golpe","ataque","atentado","maltrato"],
  fuga:["evasi","huida","fuga","resistencia","persecu"],alcohol:["alcohol","drogas","tasa","prueba"],banco:["banc","fleeca","pacific","caudales"],policia:["autoridad","agente","atentado","respeto","identific"],
  mata:["asesinato","homicid","muerte"],muerte:["asesinato","homicid","muerte"],identi:["identific","rostro"],hurto:["hurto","robo","sustrac"]};
const INF_TIPOS=["Sustracción de vehículo","Huida de la justicia","Persecución policial","Detención","Control de tráfico","Robo a mano armada","Robo a establecimiento","Tiroteo","Agresión","Tráfico de sustancias","Disturbios","Toma de rehenes","Accidente de tráfico","Allanamiento"];
const INF_EST=["Incidente finalizado","Incidente en curso","Pendiente de resolución"];
const INF_ROLES=["INCIDENT COMMANDER / Mando del operativo","Unidad inicial de intervención","Unidad de apoyo","Unidad aérea (A.S.D)","Unidad de tráfico","Negociador","Unidad de custodia y traslado"];
const INF_FZ=["N/A","Reducción física","Arma no letal (táser)","Arma de fuego","Vehículo (maniobra PIT)"];
const EV_T=["Vehículo","Arma de fuego","Arma blanca","Sustancias","Dinero","Objeto","Otro"];

export { PENAL_DEF, PEN_CATS, CIRC, SYN, INF_TIPOS, INF_EST, INF_ROLES, INF_FZ, EV_T };
