/* Pantalla de carga de la actualización, como el briefing de un operativo: luces de patrulla de fondo, título grande abajo a la
   izquierda, objetivos que se van cumpliendo, un consejo que rota y la barra de progreso al pie.
   Se usa mientras se instala y también al volver del reinicio (resume), así se ve como UNA sola carga. */
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export const OPS_STEPS = ["Descargar el paquete de actualización", "Verificar la firma digital", "Instalar los módulos", "Migrar la configuración local", "Optimizar la terminal", "Reiniciar el sistema"];
const TIPS = [
  "Código 4: situación bajo control. No hace falta más apoyo.",
  "Antes de copiar un informe, tocá «Revisar»: rojo falta algo, amarillo pendiente, verde está bien.",
  "Un 10-80 bien dado: unidad, vehículo, dirección de fuga y motivo.",
  "Lo que guardás en la terminal lo ve todo el departamento al instante.",
  "Si el artículo del robo ya trae el agravante, no se imputa aparte.",
  "El homicidio doloso (119.1) va solo cuando hay CK de un jugador.",
  "En una entrevista, primero se guarda y después se copia.",
  "Las horas que pegás en Discord se ven en la zona horaria de cada uno.",
];

export function OpsLoad({ v, pct, n, inside, resume }: { v: string; pct: number; n: number; inside: boolean; resume?: boolean }) {
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => { const i = setInterval(() => setTip(t => (t + 1) % TIPS.length), 3200); return () => clearInterval(i); }, []);
  return (
    <div role="status" aria-live="polite" aria-label="Actualización en curso" className={`ops ${inside ? "absolute" : "fixed"} inset-0 z-[96] overflow-hidden text-white`}>
      <div aria-hidden className="ops-l" /><div aria-hidden className="ops-r" /><div aria-hidden className="ops-stripes" /><div aria-hidden className="ops-vig" />
      <header className="absolute inset-x-0 top-0 flex items-center gap-3 px-6 py-5 sm:px-10">
        <img src="/next/logo.svg" alt="" className="size-8 object-contain" />
        <p className="font-mono text-[11px] tracking-[.3em] text-white/70">LSPD <span className="text-white/30">//</span> CENTRO DE DESPLIEGUE</p>
        <span className="ops-live ml-auto inline-flex items-center gap-2 rounded-sm border border-white/20 px-2.5 py-1 font-mono text-[10px] tracking-[.25em]"><i className="size-1.5 rounded-full bg-red-500" />OPERATIVO EN CURSO</span>
      </header>

      <aside className="absolute right-6 top-24 hidden w-[19rem] sm:right-10 md:block">
        <p className="mb-2 font-mono text-[10px] tracking-[.3em] text-sky-300/80">OBJETIVOS</p>
        <ol className="space-y-1.5">{OPS_STEPS.map((s, i) => { const done = i < n || resume, cur = i === n && !resume; return (
          <li key={s} className={`flex items-center gap-2.5 border-l-2 py-1 pl-3 text-[13px] transition-all duration-300 ${done ? "border-emerald-400 text-white/55" : cur ? "border-sky-400 bg-white/[.06] text-white" : "border-white/15 text-white/35"}`}>
            <span className={`grid size-4 shrink-0 place-items-center rounded-sm border ${done ? "border-emerald-400 bg-emerald-400 text-black" : cur ? "border-sky-400" : "border-white/25"}`}>{done ? <Check className="size-3" strokeWidth={3} /> : cur ? <i className="size-1.5 animate-pulse rounded-full bg-sky-400" /> : null}</span>
            <span className={done ? "line-through decoration-white/30" : ""}>{s}</span></li>); })}</ol>
      </aside>

      <div className="absolute inset-x-0 bottom-0">
        <div className="px-6 sm:px-10">
          <p className="font-mono text-[11px] tracking-[.35em] text-sky-300">OPERACIÓN</p>
          <h1 className="ops-title font-display font-bold uppercase leading-[.86] tracking-tight">Actualización</h1>
          <p className="mt-2 font-mono text-[12px] tracking-[.22em] text-white/70">VERSIÓN {v} <span className="text-white/30">·</span> LOS SANTOS POLICE DEPARTMENT</p>
          <p key={tip} className="ops-tip mt-5 max-w-2xl text-[13.5px] leading-snug text-white/80"><b className="mr-2 font-mono text-[10px] tracking-[.25em] text-amber-300">CONSEJO</b>{TIPS[tip]}</p>
        </div>
        <div aria-hidden className="ops-tape mt-5"><span>LSPD · LÍNEA POLICIAL · NO CRUZAR · LSPD · LÍNEA POLICIAL · NO CRUZAR · LSPD · LÍNEA POLICIAL · NO CRUZAR · LSPD · LÍNEA POLICIAL · NO CRUZAR · LSPD · LÍNEA POLICIAL · NO CRUZAR · LSPD · LÍNEA POLICIAL · NO CRUZAR · </span></div>
        <div className="flex items-center gap-4 bg-black/60 px-6 py-3 sm:px-10">
          <Loader2 className="size-4 shrink-0 animate-spin text-sky-300" />
          <p className="min-w-0 flex-1 truncate font-mono text-[11px] tracking-[.18em] text-white/80">{(resume ? "Aplicando los cambios" : OPS_STEPS[Math.min(n, OPS_STEPS.length - 1)]).toUpperCase()}…</p>
          <p className="font-display text-xl font-bold tabular-nums">{resume ? 100 : pct}<span className="text-sm text-white/50">%</span></p>
        </div>
        <div className="h-1 bg-white/10"><div className={`h-full bg-gradient-to-r from-sky-500 via-sky-300 to-white ${resume ? "ops-indet" : ""}`} style={{ width: (resume ? 100 : pct) + "%", transition: "width .2s linear" }} /></div>
      </div>
    </div>);
}
