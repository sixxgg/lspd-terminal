import { useState, type ReactNode } from "react";
import { GraduationCap, Lock, Megaphone } from "lucide-react";
import { Segmented } from "@/components/ui";
import { Instrucciones } from "./Instrucciones";
import { DivAdmin, Uniformidad, divTabs, uniTab, type DivTab } from "./DivTools";
import { findAgent } from "@/lib/domain";
import { insRole, isUMem, uMap } from "@/lib/units";
import { Card } from "@/components/ui";
import { DivLogo } from "@/sections/sup/Agentes";
import { DIV_DESC, DIV_DONE, divOpen, heroColors, subsOf, useDivColors } from "@/lib/divisions";
import { divAb, lvl, rankES } from "@/lib/domain";
import { useMe } from "@/lib/me";
import { LS, ME_ROLES, useStoreVersion } from "@/lib/store";
import { Rtd } from "./Rtd";
import { Unit } from "./Unit";
import { Comunicados, type CommDiv } from "./Comunicados";
import { cn } from "@/lib/cn";

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
/* subdivisiones con contenido propio en la terminal */
const SUB_OPEN: Record<string, CommDiv> = { "Underwater Dive Unit": "udu" };
function SubTiles({ d, sel, onSel }: { d: string; sel: string; onSel: (s: string) => void }) {
  const subs = subsOf(d); if (!subs.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {subs.map(s => <SubTile key={s} s={s} on={sel === s} onClick={SUB_OPEN[s] ? () => onSel(sel === s ? "" : s) : undefined} />)}
    </div>
  );
}
function SubTile({ s, on, onClick }: { s: string; on: boolean; onClick?: () => void }) {
  const [a] = useDivColors(s);
  if (!onClick) return (
    <div title="Subdivisión bloqueada" className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center opacity-80 dark:border-slate-800 dark:bg-slate-900/60" style={{ boxShadow: `inset 0 -3px 0 ${a}` }}>
      <div className="size-14 grayscale-[35%]"><DivLogo d={s} /></div>
      <b className="text-xs font-semibold leading-tight">{s}</b>
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Lock className="size-3" />Bloqueada</span>
    </div>);
  return (
    <button onClick={onClick} title={on ? "Cerrar" : "Abrir comunicados"} className={cn("flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900/60", on ? "border-[color:var(--a)] ring-2 ring-[color:var(--a)]/40" : "border-slate-200 dark:border-slate-800")}
      style={{ boxShadow: `inset 0 -3px 0 ${a}`, ["--a" as string]: a }}>
      <div className="size-14"><DivLogo d={s} /></div>
      <b className="text-xs font-semibold leading-tight">{s}</b>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: a }}><Megaphone className="size-3" />Comunicados</span>
    </button>);
}

/* subdivisión (UDU): comunicados e instrucciones; el roster es el de la METRO */
function SubBody({ sub, div }: { sub: string; div: CommDiv }) {
  const me = useMe(), [t0, setT] = useState(() => LS.get("lspdt.next.subtab." + div) || "com"), can = !!ME_ROLES.admin || lvl(me.r) >= lvl("Sargento I") || isUMem("md", me.n);
  const co = !!ME_ROLES.admin || insRole("md", me.n) === "coord";
  const base: DivTab[] = [{ value: "com", label: "Comunicados", icon: <Megaphone />, txt: "Comunicados" }, { value: "ins", label: "Instrucciones", icon: <GraduationCap />, txt: "Instrucciones" }, uniTab()], opts = divTabs(div, base, co);
  const t = opts.some(x => x.value === t0) ? t0 : opts[0]?.value || "com";
  const go = (v: string) => { setT(v); LS.set("lspdt.next.subtab." + div, v); };
  const names = Object.keys(uMap("md")).filter(n => findAgent(n)).sort((a, b) => a.localeCompare(b, "es"));
  return (
    <div className="space-y-5">
      <DivHero d={sub} />
      <Segmented value={t} onChange={go} options={opts} />
      {t === "adm" ? <DivAdmin id={div} ab={div.toUpperCase()} tabs={base} /> : t === "uni" ? <Uniformidad id={div} ab={div.toUpperCase()} canEdit={co} /> : t === "ins" ? <Instrucciones div={div} ab={div.toUpperCase()} names={names} roleOf={n => insRole("md", n)} tipos={["Persecución marítima", "Buceo", "Rescate subacuático", "Navegación"]} canEdit={can} isCoord={!!ME_ROLES.admin || insRole("md", me.n) === "coord"} />
        : <Comunicados div={div} canEdit={can} />}
    </div>);
}

export function Division({ d }: { d: string }) {
  useStoreVersion();
  const me = useMe(), k = DIV_DONE[d], open = divOpen(d, me.n);
  const [sub, setSub] = useState(() => LS.get("lspdt.next.dsub." + d) || "");
  let body: ReactNode;
  if (!open) body = (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Lock className="size-5" /></div>
      <h3 className="mt-4 font-semibold">{k ? "Acceso restringido" : "Bloqueada"}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{k ? "Solo los miembros autorizados de la división pueden entrar." : "Esta división todavía no tiene contenido en la terminal."}</p>
      {k && <p className="mt-3 text-xs text-slate-400">Estás ingresado como {rankES(me.r)} {me.n}.</p>}
    </Card>);
  /* divisiones todavía sin contenido: igual tienen su uniformidad (la carga la administración o Capitanía) */
  if (!k) body = <div className="space-y-5">{body}<Uniformidad id={"x-" + d.toLowerCase().replace(/[^a-z0-9]+/g, "-")} ab={divAb(d)[0] || d} canEdit={!!ME_ROLES.admin || lvl(me.r) >= 8} /></div>;
  else if (k === "rtd") body = <Rtd />;
  else body = <Unit k={k} />;
  const subDiv = SUB_OPEN[sub];
  if (subDiv && subsOf(d).includes(sub)) body = <SubBody sub={sub} div={subDiv} />;
  return <div className={cn("space-y-5")}><DivHero d={d} /><SubTiles d={d} sel={sub} onSel={s => { setSub(s); LS.set("lspdt.next.dsub." + d, s); }} />{body}</div>;
}
