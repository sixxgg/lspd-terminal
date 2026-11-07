/* Legal: leyes del servidor por capítulo, con buscador, gravedad y favoritos por agente */
import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Copy, Gavel, Search, Star, X } from "lucide-react";
import { Card, Empty, Input, Segmented, Select } from "@/components/ui";
import { useCopy } from "@/components/output";
import { norm } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { PEN_CATS, artCmp, getPenal, type Art } from "@/lib/penal";
import { cn } from "@/lib/cn";

type Kind = "adm" | "cp";
type Grav = "all" | "Leve" | "Grave" | "Muy grave" | "fav";
const GRAV: { v: Exclude<Grav, "all" | "fav">; l: string }[] = [{ v: "Leve", l: "Leves" }, { v: "Grave", l: "Graves" }, { v: "Muy grave", l: "Muy graves" }];
/* «Falta · Seguridad Vial (Ley 26/2024)» → «Ley 26/2024 - Seguridad Vial» */
export function chapterName(c: string) { const m = /^Falta · (.+?) \((Ley [^)]+)\)$/.exec(c || ""); return m ? `${m[2]} - ${m[1]}` : c || "Sin capítulo"; }
const lawNum = (c: string) => { const m = /Ley (\d+)\/(\d+)/.exec(c); return m ? +m[2] * 1000 + +m[1] : 1e9; };
export const legalFavKey = (n: string) => "lspdt.legalFav." + norm(n).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const money = (n: number) => "$" + Number(n).toLocaleString("es-AR");
const GTONE: Record<string, string> = {
  Leve: "border-l-slate-300 dark:border-l-slate-600",
  Grave: "border-l-amber-400 dark:border-l-amber-500/80",
  "Muy grave": "border-l-red-500 dark:border-l-red-500/80",
};

export function Legal() {
  useStoreVersion();
  const me = useMe();
  const P = getPenal();
  const [fav, setFav] = useJSON<string[]>(legalFavKey(me.n), []);
  const favs = useMemo(() => new Set(fav), [fav]);
  const [kind, setKind] = useState<Kind>("adm"), [cap, setCap] = useState<Record<Kind, string>>({ adm: "", cp: "" });
  const [grav, setGrav] = useState<Grav>("all"), [qc, setQc] = useState(""), [q, setQ] = useState("");

  const byKind = (k: Kind) => P.filter(x => (x.k || "cp") === k);
  const chapters = useMemo(() => {
    const m = new Map<string, Art[]>(); byKind(kind).forEach(x => { const c = x.c || "Sin capítulo"; m.set(c, [...(m.get(c) || []), x]); });
    return [...m.entries()].sort(([a], [b]) => kind === "adm" ? lawNum(a) - lawNum(b) : ((PEN_CATS as string[]).indexOf(a) + 1 || 99) - ((PEN_CATS as string[]).indexOf(b) + 1 || 99));
  }, [P, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const curCap = chapters.find(([c]) => c === cap[kind])?.[0] || chapters[0]?.[0] || "";
  const pickCap = (c: string) => { setCap({ ...cap, [kind]: c }); setGrav("all"); setQ(""); };
  const capList = chapters.filter(([c]) => !qc || norm(chapterName(c)).includes(norm(qc)));

  const qn = norm(q.trim()), searching = !!qn;
  const scope = searching ? byKind(kind) : chapters.find(([c]) => c === curCap)?.[1] || [];
  const hit = (x: Art) => !qn || qn.split(/\s+/).every(w => norm(`${x.a} ${x.t} ${x.d || ""}`).includes(w));
  const base = scope.filter(hit);
  const L = base.filter(x => grav === "all" ? true : grav === "fav" ? favs.has(x.a) : x.g === grav).sort(artCmp);
  const cnt = (g: Grav) => g === "all" ? base.length : g === "fav" ? base.filter(x => favs.has(x.a)).length : base.filter(x => x.g === g).length;
  const toggle = (a: string) => setFav(favs.has(a) ? fav.filter(x => x !== a) : [...fav, a]);
  const nAdm = byKind("adm").length, nCp = byKind("cp").length;

  const tabs: { value: Grav; label: ReactNode; icon?: ReactNode }[] = [
    { value: "all", label: <>Todas <Count n={cnt("all")} /></> },
    ...(kind === "adm" ? GRAV.map(g => ({ value: g.v as Grav, label: <>{g.l} <Count n={cnt(g.v)} /></> })) : []),
    { value: "fav", label: <>Favoritos <Count n={cnt("fav")} /></>, icon: <Star /> },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <Segmented size="sm" value={kind} onChange={v => { setKind(v); setGrav("all"); setQ(""); setQc(""); }}
          options={[{ value: "adm", label: `Infracciones administrativas (${nAdm})`, icon: <BookOpen /> }, { value: "cp", label: `Delitos (${nCp})`, icon: <Gavel /> }]} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Star className="size-3.5 fill-amber-400 text-amber-400" />{fav.length} en favoritos</span>
      </div>

      <div className="grid lg:grid-cols-[18rem_1fr]">
        {/* capítulos */}
        <aside className="border-b border-slate-100 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="hidden p-3 lg:block"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="h-9 pl-9 text-sm" value={qc} onChange={e => setQc(e.target.value)} placeholder="Buscar título o capítulo…" /></div></div>
          <div className="p-3 lg:hidden"><Select value={curCap} onChange={e => pickCap(e.target.value)}>{chapters.map(([c, l]) => <option key={c} value={c}>{chapterName(c)} ({l.length})</option>)}</Select></div>
          <nav className="hidden max-h-[calc(100vh-17rem)] overflow-y-auto pb-2 lg:block">
            {capList.map(([c, l]) => { const on = !searching && c === curCap, nf = l.filter(x => favs.has(x.a)).length; return (
              <button key={c} onClick={() => pickCap(c)} className={cn("group relative block w-full border-b border-slate-100 px-4 py-3 text-left transition dark:border-slate-800/70",
                on ? "bg-brand-500/10 dark:bg-brand-500/15" : "hover:bg-slate-50 dark:hover:bg-slate-800/40")}>
                {on && <span className="absolute inset-y-0 left-0 w-[3px] bg-brand-500" />}
                <span className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">{l.length} {kind === "adm" ? (l.length === 1 ? "infracción" : "infracciones") : l.length === 1 ? "delito" : "delitos"}
                  {nf > 0 && <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"><Star className="size-3 fill-current" />{nf}</span>}</span>
                <span className={cn("font-display mt-0.5 block text-[15px] font-semibold leading-snug", on ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-slate-100")}>{chapterName(c)}</span>
              </button>); })}
            {!capList.length && <p className="px-4 py-6 text-center text-sm text-slate-400">Ningún capítulo coincide.</p>}
          </nav>
        </aside>

        {/* artículos */}
        <section className="min-w-0">
          <div className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold">{searching ? `Resultados en ${kind === "adm" ? "infracciones administrativas" : "delitos"}` : chapterName(curCap)}</h3>
              <div className="relative ml-auto w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input className="h-9 pl-9 pr-8 text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en todo el ámbito: artículo, título o palabra…" />
                {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="size-3.5" /></button>}</div>
            </div>
            <Segmented size="sm" value={grav} onChange={setGrav} options={tabs} />
          </div>
          <div className="max-h-[calc(100vh-19rem)] space-y-3 overflow-y-auto p-4">
            {L.length ? L.map(x => <ArtCard key={x.a} x={x} fav={favs.has(x.a)} onFav={() => toggle(x.a)} showCap={searching || grav === "fav"} />)
              : <Empty icon={grav === "fav" ? <Star /> : <Gavel />} title={grav === "fav" ? "Sin favoritos acá" : searching ? "Sin resultados" : "Nada en esta gravedad"}
                desc={grav === "fav" ? "Tocá la estrella de un artículo para tenerlo a mano." : searching ? "Probá con otra palabra o con el número del artículo." : "Este capítulo no tiene infracciones de esta gravedad. Probá en otra pestaña."} />}
          </div>
        </section>
      </div>
    </Card>
  );
}

const Count = ({ n }: { n: number }) => <span className="rounded-md bg-slate-900/5 px-1.5 text-[11px] tabular-nums opacity-70 dark:bg-white/10">{n}</span>;

function ArtCard({ x, fav, onFav, showCap }: { x: Art; fav: boolean; onFav: () => void; showCap: boolean }) {
  const copy = useCopy();
  const meta: [string, string][] = [];
  if (x.m != null) meta.push(["Sanción", money(x.m)]);
  if (x.p != null) meta.push(["Prisión", `${x.p} min`]);
  meta.push(["Puntos", `${x.pt || 0} pts`]);
  return (
    <article className={cn("group relative rounded-xl border border-l-4 border-slate-200 bg-white/60 p-4 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40",
      x.k === "cp" ? "border-l-red-500/70" : GTONE[x.g || "Leve"] || GTONE.Leve)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {showCap && <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">{chapterName(x.c)}</div>}
          <h4 className="font-display text-[16px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
            <span className="text-brand-600 dark:text-brand-300">Artículo {x.a}</span> <span className="text-slate-400">—</span> {x.t}</h4>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button title="Copiar «Artículo — título»" onClick={() => copy(`Artículo ${x.a} - ${x.t}`)}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"><Copy className="size-4" /></button>
          <button title={fav ? "Quitar de favoritos" : "Agregar a favoritos"} aria-pressed={fav} onClick={onFav}
            className={cn("rounded-lg border p-1.5 transition", fav ? "border-amber-400/50 bg-amber-400/10 text-amber-500" : "border-slate-200 text-slate-400 hover:border-amber-400/50 hover:text-amber-500 dark:border-slate-700")}>
            <Star className={cn("size-4", fav && "fill-current")} /></button>
        </div>
      </div>
      {x.d && <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{x.d}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        {x.k === "adm" && x.g && <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
          x.g === "Muy grave" ? "bg-red-500/10 text-red-600 dark:text-red-300" : x.g === "Grave" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-slate-500/10 text-slate-600 dark:text-slate-300")}>{x.g}</span>}
        {meta.map(([k, v]) => <span key={k} className="text-slate-500 dark:text-slate-400">{k}: <b className="font-semibold text-slate-800 dark:text-slate-100">{v}</b></span>)}
      </div>
    </article>
  );
}
