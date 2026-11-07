/* Legal: leyes del servidor por capítulo, con buscador, gravedad y favoritos por agente */
import { useMemo, useState, type ReactNode } from "react";
import { Award, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Info, Copy, Gavel, Search, Star, X } from "lucide-react";
import { Card, Empty, Input, Segmented, Select } from "@/components/ui";
import { useCopy } from "@/components/output";
import { norm } from "@/lib/domain";
import { useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { CIRC, artCmp, getPenal, type Art } from "@/lib/penal";
import { cn } from "@/lib/cn";

type Kind = "adm" | "cp";
type Grav = "all" | "Leve" | "Grave" | "Muy grave" | "fav";
const GRAV: { v: Exclude<Grav, "all" | "fav">; l: string }[] = [{ v: "Leve", l: "Leves" }, { v: "Grave", l: "Graves" }, { v: "Muy grave", l: "Muy graves" }];
/* «Falta · Seguridad Vial (Ley 26/2024)» → «Ley 26/2024 - Seguridad Vial» */
export const SEP = " › ";
/* «TÍTULO VI. Delitos contra la libertad» → ["TÍTULO VI", "Delitos contra la libertad"] */
export const splitTitle = (t: string) => { const m = /^(T[ÍI]TULO [IVXLC]+(?: bis)?)\.\s*(.+)$/.exec(t); return m ? [m[1], m[2]] : [t, ""]; };
export function chapterName(c: string) { if ((c || "").includes(SEP)) { const [t, ch] = c.split(SEP), [n, nm] = splitTitle(t); return `${n} · ${nm}${SEP}${ch}`; } const m = /^Falta · (.+?) \((Ley [^)]+)\)$/.exec(c || ""); return m ? `${m[2]} - ${m[1]}` : c || "Sin capítulo"; }
const lawNum = (c: string) => { const m = /Ley (\d+)\/(\d+)/.exec(c); return m ? +m[2] * 1000 + +m[1] : 1e9; };
export const legalFavKey = (n: string) => "lspdt.legalFav." + norm(n).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const money = (n: number) => "$" + Number(n).toLocaleString("es-AR");
const PAGE = 24;
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
  const [grav, setGrav] = useState<Grav>("all"), [q, setQ] = useState(""), [shown, setShown] = useState(PAGE);

  const byKind = (k: Kind) => P.filter(x => (x.k || "cp") === k);
  const chapters = useMemo(() => {
    const m = new Map<string, Art[]>(); byKind(kind).forEach(x => { const c = x.c || "Sin capítulo"; m.set(c, [...(m.get(c) || []), x]); });
    const minA = (l: Art[]) => l.reduce((mn, x) => (artCmp(x, mn) < 0 ? x : mn), l[0]);
    return [...m.entries()].sort(([a, la], [b, lb]) => kind === "adm" ? lawNum(a) - lawNum(b) : artCmp(minA(la), minA(lb)));
  }, [P, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const curCap = chapters.find(([c]) => c === cap[kind])?.[0] || chapters[0]?.[0] || "";
  const pickCap = (c: string) => { setCap({ ...cap, [kind]: c }); setGrav("all"); setQ(""); setShown(PAGE); };
  const qn = norm(q.trim()), searching = !!qn;
  const scope = searching ? byKind(kind) : chapters.find(([c]) => c === curCap)?.[1] || [];
  const hit = (x: Art) => !qn || qn.split(/\s+/).every(w => { const h = norm(`${x.a} ${x.t} ${x.d || ""}`); return /^\d+(\.\d+)*$/.test(w) ? new RegExp(`(^|[^\\d.])${w.replace(/\./g, "\\.")}(?![\\d]|\\.\\d)`).test(h) : h.includes(w); });
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

  const idx = chapters.findIndex(([c]) => c === curCap);
  const groups = useMemo(() => { const G: { t: string; items: [string, Art[]][] }[] = []; chapters.forEach(e => { const t = e[0].split(SEP)[0], g = G.find(x => x.t === t); g ? g.items.push(e) : G.push({ t, items: [e] }); }); return G; }, [chapters]);
  const unit = kind === "adm" ? "infracciones" : "delitos";
  const vis = L.slice(0, shown);
  const card = (x: Art, cap: boolean) => <ArtCard key={x.a} x={x} fav={favs.has(x.a)} onFav={() => toggle(x.a)} showCap={cap} />;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented size="sm" value={kind} onChange={v => { setKind(v); setGrav("all"); setQ(""); setShown(PAGE); }}
            options={[{ value: "adm", label: `Infracciones administrativas (${nAdm})`, icon: <BookOpen /> }, { value: "cp", label: `Delitos (${nCp})`, icon: <Gavel /> }]} />
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Star className="size-3.5 fill-amber-400 text-amber-400" />{fav.length} en favoritos</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex items-center gap-2">
            <button aria-label="Capítulo anterior" disabled={searching || idx <= 0} onClick={() => pickCap(chapters[idx - 1][0])}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronLeft className="size-4" /></button>
            <Select value={curCap} disabled={searching} onChange={e => pickCap(e.target.value)} aria-label="Capítulo" className="min-w-0 flex-1">
              {groups.map(g => g.items.length > 1 || g.items[0][0].includes(SEP)
                ? <optgroup key={g.t} label={splitTitle(g.t).join(" · ")}>{g.items.map(([c, l]) => <option key={c} value={c}>{c.split(SEP)[1] || chapterName(c)} ({l.length})</option>)}</optgroup>
                : <option key={g.t} value={g.items[0][0]}>{chapterName(g.items[0][0])} ({g.items[0][1].length})</option>)}
            </Select>
            <button aria-label="Capítulo siguiente" disabled={searching || idx >= chapters.length - 1} onClick={() => pickCap(chapters[idx + 1][0])}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronRight className="size-4" /></button>
          </div>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="h-10 pl-9 pr-8 text-sm" value={q} onChange={e => { setQ(e.target.value); setShown(PAGE); }} placeholder="Buscar en todo el ámbito: artículo, título o palabra…" />
            {q && <button aria-label="Limpiar búsqueda" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="size-3.5" /></button>}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented size="sm" value={grav} onChange={v => { setGrav(v); setShown(PAGE); }} options={tabs} />
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{searching ? `Resultados en ${kind === "adm" ? "infracciones administrativas" : "delitos"}: ` : `${chapterName(curCap)} · `}{L.length} {L.length === 1 ? "resultado" : unit === "delitos" ? "delitos" : "infracciones"}</span>
        </div>
        {kind === "cp" && <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold"><Info className="size-4 text-brand-500" />Circunstancias atenuantes, agravantes y de parentesco<ChevronDown className="ml-auto size-4 text-slate-400 transition-transform group-open:rotate-180" /></summary>
          <div className="space-y-4 border-t border-slate-100 p-3 dark:border-slate-800">
            {(CIRC as [string, [string, string][]][]).map(([h, l]) => <div key={h}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{l.map(([n, d]) => <div key={n} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"><p className="text-sm font-medium">{n}</p><p className="text-xs text-slate-500 dark:text-slate-400">{d}</p></div>)}</div></div>)}
            <p className="text-xs text-slate-400">Se aplica siempre el artículo base y se anotan en el informe con los hechos que las acreditan.</p>
          </div>
        </details>}
      </Card>

      {L.length ? (searching
        ? groupBy(vis).map(([c, l]) => <section key={c} className="space-y-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{chapterName(c)}<span className="rounded-md bg-slate-900/5 px-1.5 text-[11px] font-normal tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-400">{l.length}</span></h3>
            <div className="grid gap-3 xl:grid-cols-2">{l.map(x => card(x, false))}</div></section>)
        : <div className="grid gap-3 xl:grid-cols-2">{vis.map(x => card(x, grav === "fav"))}</div>)
        : <Card><Empty icon={grav === "fav" ? <Star /> : <Gavel />} title={grav === "fav" ? "Sin favoritos acá" : searching ? "Sin resultados" : "Nada con esta gravedad"}
            desc={grav === "fav" ? "Tocá la estrella de un artículo para tenerlo a mano." : searching ? "Probá con otra palabra o con el número del artículo." : "Este capítulo no tiene infracciones con esta gravedad. Probá en otra pestaña."} /></Card>}

      {L.length > shown && <div className="flex justify-center"><button onClick={() => setShown(shown + PAGE)}
        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Mostrar más ({L.length - shown} restantes)</button></div>}
      {!searching && idx >= 0 && chapters.length > 1 && L.length > 0 && <div className="flex justify-between gap-3">
        <button disabled={idx <= 0} onClick={() => { pickCap(chapters[idx - 1][0]); scrollTo({ top: 0 }); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:invisible dark:hover:bg-slate-800"><ChevronLeft className="size-4" />Capítulo anterior</button>
        <button disabled={idx >= chapters.length - 1} onClick={() => { pickCap(chapters[idx + 1][0]); scrollTo({ top: 0 }); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:invisible dark:hover:bg-slate-800">Capítulo siguiente<ChevronRight className="size-4" /></button></div>}
      <LegalCredit />
    </div>
  );
}

const BERNAL_DC = "231832931780395008";
function LegalCredit() {
  const copy = useCopy();
  return (
    <Card className="flex flex-wrap items-center gap-4 border-amber-400/30 bg-amber-400/[.04] p-4 dark:border-amber-400/20">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-500 dark:text-amber-300"><Award className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">Mención especial</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Todos los derechos de la creación del ámbito legal (Código Penal y leyes administrativas de San Andreas) pertenecen a <b className="text-slate-900 dark:text-white">Bernal (Victor)</b>.</p>
      </div>
      <div className="flex items-center gap-1.5">
        <a href={`https://discord.com/users/${BERNAL_DC}`} target="_blank" rel="noopener" title="Abrir su perfil de Discord"
          className="rounded-md bg-[#5865f2]/15 px-2 py-1 text-sm font-semibold text-[#5865f2] transition hover:bg-[#5865f2]/25 dark:text-[#c9cdfb]">@Bernal</a>
        <button title="Copiar mención de Discord" onClick={() => copy(`<@${BERNAL_DC}>`)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"><Copy className="size-4" /></button>
      </div>
    </Card>
  );
}

const groupBy = (L: Art[]) => { const m = new Map<string, Art[]>(); L.forEach(x => { const c = x.c || "Sin capítulo"; m.set(c, [...(m.get(c) || []), x]); }); return [...m.entries()]; };

const Count = ({ n }: { n: number }) => <span className="rounded-md bg-slate-900/5 px-1.5 text-[11px] tabular-nums opacity-70 dark:bg-white/10">{n}</span>;

function ArtCard({ x, fav, onFav, showCap }: { x: Art; fav: boolean; onFav: () => void; showCap: boolean }) {
  const copy = useCopy();
  const meta: [string, string][] = [];
  if (x.m != null) meta.push(["Sanción", money(x.m)]);
  if (x.p != null) meta.push(["Condena en prisión", `${x.p} meses`]);
  meta.push(["Puntos", `${x.pt || 0} pts`]);
  return (
    <article className={cn("group relative flex flex-col rounded-xl border border-l-4 border-slate-200 bg-white/60 p-4 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40",
      x.k === "cp" ? "border-l-red-500/70" : GTONE[x.g || "Leve"] || GTONE.Leve)}>
      {showCap && <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">{chapterName(x.c)}</div>}
      <h4 className="font-display text-[16px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
        <span className="text-brand-600 dark:text-brand-300">Artículo {x.a}</span> <span className="text-slate-400">—</span> {x.t}</h4>
      {x.d && <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{x.d}</p>}
      <div className="mb-3 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        {x.k === "adm" && x.g && <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
          x.g === "Muy grave" ? "bg-red-500/10 text-red-600 dark:text-red-300" : x.g === "Grave" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-slate-500/10 text-slate-600 dark:text-slate-300")}>{x.g}</span>}
        {meta.map(([k, v]) => <span key={k} className="text-slate-500 dark:text-slate-400">{k}: <b className="font-semibold text-slate-800 dark:text-slate-100">{v}</b></span>)}
      </div>
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button title="Copiar «Artículo — título»" onClick={() => copy(`Artículo ${x.a} - ${x.t}`)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Copy className="size-3.5" />Copiar</button>
        <button title={fav ? "Quitar de favoritos" : "Agregar a favoritos"} aria-pressed={fav} onClick={onFav}
          className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition", fav ? "border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-400" : "border-slate-200 text-slate-600 hover:border-amber-400/50 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300")}>
          <Star className={cn("size-3.5", fav && "fill-current")} />{fav ? "En favoritos" : "Favorito"}</button>
      </div>
    </article>
  );
}
