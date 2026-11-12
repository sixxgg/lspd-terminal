import { useState, type ReactNode } from "react";
import { BadgeCheck, Lock, Users } from "lucide-react";
import { GEN, gMap } from "@/lib/units";
import { Card } from "@/components/ui";
import { DivLogo } from "@/sections/sup/Agentes";
import { DIV_DESC, DIV_DONE, divOpen, heroColors, subsOf, useDivColors } from "@/lib/divisions";
import { divAb, rankES } from "@/lib/domain";
import { useMe } from "@/lib/me";
import { LS, useStoreVersion } from "@/lib/store";
import { Rtd } from "./Rtd";
import { Unit } from "./Unit";
import { GenDiv } from "./Gen";
import { cn } from "@/lib/cn";

/* colores de la división como variables CSS (los usan el encabezado y la barra de pestañas) */
const hv = (d: string) => { const { acc, light, base } = heroColors(d); return { ["--ha" as string]: acc, ["--hl" as string]: light, ["--hb" as string]: base }; };
export function DivHero({ d }: { d: string }) {
  useDivColors(d);
  const { acc, light, base } = heroColors(d), subs = subsOf(d);
  return (
    <div className="dv-hero group relative overflow-hidden rounded-2xl" style={{ ["--ha" as string]: acc, ["--hl" as string]: light, ["--hb" as string]: base }}>
      <div className="dv-hero-bg absolute inset-0" />
      <div className="absolute inset-0 bg-grid opacity-25" />
      <div className="dv-hero-sweep absolute inset-0" />
      <div className="relative flex flex-wrap items-center gap-5 p-6 sm:gap-7 sm:p-7">
        <div className="dv-hero-emb relative size-24 shrink-0 sm:size-28"><DivLogo d={d} /></div>
        <div className="min-w-0 flex-1">
          <p className="dv-hero-k text-[11px] font-bold uppercase tracking-[0.2em]">Los Santos Police Department</p>
          <h2 className="dv-hero-t mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[2rem]">{d}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/80">{DIV_DESC[d] || divAb(d)[0]}</p>
          {subs.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{subs.map(x => <span key={x} className="rounded-full border border-white/15 bg-white/[.07] px-2.5 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur">{x}</span>)}</div>}
        </div>
      </div>
    </div>
  );
}
/* subdivisiones: todas se abren con su roster, uniformidad y administración (la MDSO, solo con licencias) */
function SubTiles({ d, sel, onSel, open }: { d: string; sel: string; onSel: (s: string) => void; open: boolean }) {
  const subs = subsOf(d); if (!subs.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {subs.map(s => <SubTile key={s} s={s} on={sel === s} onClick={open && GEN[s] ? () => onSel(sel === s ? "" : s) : undefined} />)}
    </div>
  );
}
function SubTile({ s, on, onClick }: { s: string; on: boolean; onClick?: () => void }) {
  const [a] = useDivColors(s), n = GEN[s] ? Object.keys(gMap(GEN[s].id)).length : 0;
  if (!onClick) return (
    <div title="Subdivisión bloqueada" className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center opacity-80 dark:border-slate-800 dark:bg-slate-900/60" style={{ boxShadow: `inset 0 -3px 0 ${a}` }}>
      <div className="size-14 grayscale-[35%]"><DivLogo d={s} /></div>
      <b className="text-xs font-semibold leading-tight">{s}</b>
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Lock className="size-3" />Bloqueada</span>
    </div>);
  return (
    <button onClick={onClick} title={on ? "Cerrar" : "Abrir"} className={cn("flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900/60", on ? "border-[color:var(--a)] ring-2 ring-[color:var(--a)]/40" : "border-slate-200 dark:border-slate-800")}
      style={{ boxShadow: `inset 0 -3px 0 ${a}`, ["--a" as string]: a }}>
      <div className="size-14"><DivLogo d={s} /></div>
      <b className="text-xs font-semibold leading-tight">{s}</b>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300">{GEN[s]?.tabs.includes("lic") ? <><BadgeCheck className="size-3" style={{ color: a }} />Licencias</> : <><Users className="size-3" style={{ color: a }} />{n} {n === 1 ? "integrante" : "integrantes"}</>}</span>
    </button>);
}
function SubBody({ sub }: { sub: string }) {
  useDivColors(sub);
  return <div className="space-y-4" style={hv(sub)}><DivHero d={sub} /><GenDiv d={sub} /></div>;
}

export function Division({ d }: { d: string }) {
  useStoreVersion();
  const me = useMe(), k = DIV_DONE[d], open = divOpen(d, me.n);
  useDivColors(d);
  const [sub, setSub] = useState(() => LS.get("lspdt.next.dsub." + d) || "");
  let body: ReactNode;
  if (!open) body = (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Lock className="size-5" /></div>
      <h3 className="mt-4 font-semibold">Acceso restringido</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">Solo los miembros cargados en el roster de la división pueden entrar.</p>
      <p className="mt-3 text-xs text-slate-400">Estás ingresado como {rankES(me.r)} {me.n}.</p>
    </Card>);
  else if (k === "rtd") body = <Rtd dn={d} />;
  else if (k) body = <Unit k={k} dn={d} />;
  else if (GEN[d]) body = <GenDiv d={d} />;
  if (open && GEN[sub] && subsOf(d).includes(sub)) body = <SubBody sub={sub} />;
  return <div className="space-y-4" style={hv(d)}><DivHero d={d} /><SubTiles d={d} open={open} sel={sub} onSel={s => { setSub(s); LS.set("lspdt.next.dsub." + d, s); }} />{body}</div>;
}
