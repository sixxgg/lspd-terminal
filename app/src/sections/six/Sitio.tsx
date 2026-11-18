/* Panel de six › Sitio web: la página del LSPD (parodia de la web de la LAPD, con la Metropolitan Division) adentro de la terminal.
   El roster (Police Officer III para arriba), las fotos, los nombres y logos de las divisiones y el escudo salen de la terminal;
   lo que se edita en la página (textos, banners, bios, callsigns, galería) se guarda en lspdt.six.sitio, privado de six.
   Las imágenes que se suben ahí van a claves propias (lspdt.six.sitio.img.*) para no inflar el JSON que se sincroniza. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Globe, Maximize2, Minimize2 } from "lucide-react";
import { LS, useStoreVersion } from "@/lib/store";
import { getRoster, lvl, profOf, srcOf, divEmblem } from "@/lib/domain";
import { profFull } from "@/lib/profiles";
import { logoOf } from "@/lib/dept";

const KEY = "lspdt.six.sitio", IMG = "lspdt.six.sitio.img.";
const RANKS = ["Chief of Police", "Assistant Chief", "Deputy Chief", "Commander", "Captain", "Lieutenant", "Sergeant II", "Detective III", "Sergeant I", "Detective II", "Detective I", "Police Officer III+", "Police Officer III"];
/* ids de las divisiones en la página → nombre en la terminal */
const DIVS: Record<string, string> = { dbu: "Detective Bureau", mdv: "Metropolitan Division", asd: "Air Support Division", asb: "Administration Services Bureau", hsiu: "High Speed Interception Unit", rtd: "Recruitment and Training Division", psb: "Professional Standards Bureau", k9: "K-9 Division" };
const ID_OF = Object.fromEntries(Object.entries(DIVS).map(([k, v]) => [v, k]));

/* recorre lo guardado: las fotos subidas (data:) pasan a claves de imagen y quedan como «term:clave»; al cargar se vuelven a resolver */
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i += 7) h = (h * 33) ^ s.charCodeAt(i); return (h >>> 0).toString(36) + s.length.toString(36); };
function walk(v: unknown, f: (s: string) => string): unknown {
  if (typeof v === "string") return f(v);
  if (Array.isArray(v)) return v.map(x => walk(x, f));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, f)]));
  return v;
}
const offload = (s: string) => { if (!s.startsWith("data:image") || s.length < 1500) return s; const k = IMG + hash(s); if (!LS.get(k)) LS.set(k, s); return "term:" + k; };
const resolve = (s: string) => (s.startsWith("term:") ? srcOf(LS.get(s.slice(5)) || "") || LS.get(s.slice(5)) || "" : s);

export function SitioTab() {
  const ver = useStoreVersion(), [html, setHtml] = useState(""), [full, setFull] = useState(false), frame = useRef<HTMLIFrameElement>(null), [doc, setDoc] = useState("");
  useEffect(() => { fetch("/next/sitio/lspd.html").then(r => r.text()).then(setHtml).catch(() => setHtml("")); }, []);
  /* lo que la página manda al guardar */
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.source !== frame.current?.contentWindow || !e.data?.sitio) return; /* solo lo que manda el iframe del sitio */ LS.setJSON(KEY, walk(e.data.sitio, offload)); };
    window.addEventListener("message", f); return () => window.removeEventListener("message", f);
  }, []);
  const term = useMemo(() => {
    const R = getRoster().filter(a => lvl(a.r) >= 3 && RANKS.includes(a.r));
    const ranks = RANKS.map(r => [r, R.filter(a => a.r === r).map(a => ({ n: a.n, p: a.p || "", i: a.c || "", pr: a.a || "",
      f: srcOf(LS.get("lspdt.foto." + a.n) || profOf(a.n).foto || "") || "", d: ((profFull(a.n).div || []) as string[]).map(d => ID_OF[d]).filter(Boolean) }))]);
    const divs = Object.fromEntries(Object.entries(DIVS).map(([id, n]) => [id, { n, l: divEmblem(n) ? new URL(divEmblem(n), location.origin).href : "" }]));
    const saved = walk(LS.json<unknown>(KEY, null), resolve);
    return { can: true, me: "six", saved, ranks, divs, logo: new URL(logoOf(), location.origin).href };
  }, [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  /* el documento se arma una vez por apertura (si se rearmara con cada guardado, la página se recargaría mientras editás) */
  useEffect(() => { if (html && !doc) setDoc(html.replace('<script id="seed"', `<script>window.__TERM=${JSON.stringify(term).replace(/</g, "\\u003c")}</script><script id="seed"`)); }, [html, term, doc]);
  const reload = () => setDoc("");
  return (
    <div className={full ? "fixed inset-0 z-[90] flex flex-col bg-black" : "relative z-[45] space-y-3"}>
      <div className="flex flex-wrap items-center gap-2 px-1 text-six">
        <Globe className="size-4" /><b className="text-sm tracking-[.2em]">SITIO WEB DEL LSPD</b>
        <span className="text-xs text-six/60">Roster, fotos y divisiones salen de la terminal · lo que edites se guarda solo</span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={reload} className="rounded-lg border border-six/30 px-2.5 py-1 text-xs hover:bg-six/10">Actualizar datos</button>
          <button onClick={() => setFull(!full)} className="inline-flex items-center gap-1 rounded-lg border border-six/30 px-2.5 py-1 text-xs hover:bg-six/10">{full ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}{full ? "Salir" : "Pantalla completa"}</button>
          <a href="https://claude.ai/artifact/CeigXHuxEEqfBF9tEqHmrY" target="_blank" rel="noopener" title="La versión original" className="inline-flex items-center gap-1 rounded-lg border border-six/30 px-2.5 py-1 text-xs hover:bg-six/10"><ExternalLink className="size-3.5" />Original</a>
        </div>
      </div>
      {doc ? <iframe ref={frame} title="Sitio web del LSPD" srcDoc={doc} sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
        className={full ? "w-full flex-1 bg-white" : "h-[calc(100vh-15rem)] min-h-[620px] w-full rounded-xl border border-six/20 bg-white"} />
        : <p className="py-16 text-center text-sm text-six/60">Cargando el sitio…</p>}
    </div>);
}
