/* Radio: comunicados por radio armados con campos autocompletables.
   10.03 (robo en curso): canal (/rlspd interna o /rsapd para todos los departamentos; la frecuencia la pone sola la radio), código, robo, calle,
   sujetos (sexo, piel, máscara, chaqueta, camiseta, pantalones, calzado y otros) y vehículo de huida.
   Las sugerencias salen de listas base + todo lo que ya se cargó en comunicados anteriores (lspdt.radio, compartido). */
import { useEffect, useMemo, useState } from "react";
import { Car, Copy, Globe, History, Lock, Plus, Radio as RadioIcon, RotateCcw, Save, Trash2, UserRound, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Field, Segmented } from "@/components/ui";
import { Split, Col } from "@/components/layout";
import { CopyLine } from "@/components/output";
import { Predict } from "@/components/predict";
import { EscapeVeh, type Veh } from "./radioVeh";
import { useFeedback } from "@/components/feedback";
import { fullDT, LUGARES, norm, uid } from "@/lib/domain";
import { useJSON } from "@/lib/store";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/cn";
import { catalogo } from "./six/robosData";
import type { RobosPub } from "./six/robosLegal";

type Sx = "m" | "f" | "x";
type Suj = { sx: Sx; piel: string; masc: string; chq: string; cam: string; pan: string; cal: string; otr: string };
type Com = { id: string; t: number; by: string; canal: "rlspd" | "rsapd"; cor: boolean; frec?: string; cod: string; robo: string; calle: string; suj: Suj[]; pie: boolean; veh: Veh; col: string; matT: string; mat: string; txt: string };

const CODES = [["211", "Robo a mano armada"], ["487", "Robo mayor"], ["207", "Secuestro / rehenes"]] as const;
const PIEL: [string, string][] = [["caucásico", "caucásica"], ["afroamericano", "afroamericana"], ["latino", "latina"], ["asiático", "asiática"], ["árabe", "árabe"], ["de tez morena", "de tez morena"], ["de tez clara", "de tez clara"]];
const MASC = ["pasamontañas negro", "pasamontañas blanco", "máscara de hockey blanca", "máscara de hockey negra", "máscara de payaso", "máscara de calavera", "máscara de cerdo", "máscara de mono",
  "máscara de gas", "bandana negra", "bandana roja", "pañuelo cubriendo el rostro", "casco de moto negro", "gorra y gafas de sol", "capucha y gafas de sol", "rostro descubierto"];
const CHQ = ["sin chaqueta", "chaqueta de cuero negra", "chaqueta de cuero marrón", "chaqueta vaquera", "chaqueta negra", "cazadora deportiva", "abrigo largo negro", "chaleco antibalas",
  "chaleco reflectante amarillo", "sudadera con capucha negra", "sudadera con capucha gris", "chaqueta de chándal"];
const CAM = ["camiseta negra", "camiseta blanca", "camiseta gris", "camiseta roja", "camisa de cuadros", "camisa blanca", "camiseta de tirantes blanca", "polo azul", "camiseta con estampado", "sin camiseta"];
const PAN = ["vaqueros azules", "vaqueros azules claros", "vaqueros negros", "pantalón de chándal negro", "pantalón de chándal gris", "pantalón cargo verde", "pantalón cargo beige", "pantalón de vestir negro", "pantalón corto", "falda negra"];
const CAL = ["zapatillas blancas", "zapatillas negras", "zapatillas deportivas rojas", "zapatillas con calcetín blanco", "botas negras", "botas militares", "botas marrones", "zapatos de vestir negros", "chanclas"];
const OTR = ["tatuajes en los brazos", "tatuajes en el cuello", "tatuajes en la cara", "guantes negros", "guantes amarillos", "mochila negra", "gorra negra", "gafas de sol", "cadena dorada", "armado con un rifle", "armado con una pistola", "herido"];
const EMPTY_S = (): Suj => ({ sx: "m", piel: "", masc: "", chq: "", cam: "", pan: "", cal: "", otr: "" });
const SUJ_F: [keyof Suj, string, string[], string][] = [["masc", "Máscara / rostro", MASC, "pasamontañas negro…"], ["chq", "Chaqueta", CHQ, "chaqueta de cuero marrón…"], ["cam", "Camiseta", CAM, "camiseta blanca…"],
  ["pan", "Pantalones", PAN, "vaqueros azules…"], ["cal", "Calzado", CAL, "zapatillas blancas…"], ["otr", "Otros rasgos", OTR, "tatuajes, guantes, armas…"]];

const joinY = (a: string[]) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} y ${a[a.length - 1]}`);
/* piel según el sexo (caucásico ↔ caucásica) */
const pielFor = (p: string, sx: Sx) => { const hit = PIEL.find(x => norm(x[0]) === norm(p) || norm(x[1]) === norm(p)); return hit ? hit[sx === "f" ? 1 : 0] : p; };
const sujTxt = (s: Suj) => {
  const who = s.sx === "f" ? "Mujer" : s.sx === "m" ? "Varón" : "Sujeto de sexo desconocido";
  const ps = [s.masc, s.chq, s.cam, s.pan, s.cal, s.otr].map(x => x.trim()).filter(x => x && !/^sin chaqueta$/i.test(x));
  return `${who}${s.piel.trim() ? " " + s.piel.trim() : ""}${ps.length ? ", " + joinY(ps) : ""}`;
};
function build(c: Omit<Com, "id" | "t" | "by" | "txt" | "frec">) {
  const head = `${c.cor ? "CORRECCIÓN " : ""}10.03 | ${c.cod} - ${c.robo.trim() || "[robo]"} - ${c.calle.trim() || "[calle]"}:`;
  const S = c.suj.map((s, i) => `Sujeto ${i + 1}: ${sujTxt(s)}.`).join(" ");
  const mod = c.veh.mo.trim() || c.veh.md.trim();
  const mat = c.matT === "ok" ? ` con MATRÍCULA: ${c.mat.trim().toUpperCase() || "[matrícula]"}` : c.matT === "sin" ? " sin matrícula" : c.matT === "tap" ? " con la matrícula tapada" : ", matrícula no visible";
  const veh = c.pie ? "VEHÍCULO DE HUIDA: huyeron a pie." : `VEHÍCULO DE HUIDA: ${mod || "[vehículo]"}${c.col.trim() ? ` de color ${c.col.trim()}` : ""}${mat}.`;
  return `/${c.canal} ${head} | Sujetos: ${S || "[sujetos]"} ${veh}`;
}

export function Radio() {
  const me = useMe(), { toast, confirm } = useFeedback(), [H, setH] = useJSON<Com[]>("lspdt.radio", []), [P] = useJSON<RobosPub | null>("lspdt.robos", null);
  const [canal, setCanal] = useState<"rlspd" | "rsapd">("rlspd"), [cor, setCor] = useState(false), [cod, setCod] = useState("211");
  const [robo, setRobo] = useState(""), [calle, setCalle] = useState(""), [suj, setSuj] = useState<Suj[]>([EMPTY_S()]);
  const [pie, setPie] = useState(false), [veh, setVeh] = useState<Veh>({ cat: "", mk: "", md: "", mo: "" }), [col, setCol] = useState(""), [matT, setMatT] = useState("ok"), [mat, setMat] = useState("");
  /* sugerencias: lista base + lo que ya se usó en otros comunicados (lo más usado primero) */
  const learn = useMemo(() => { const m: Record<string, Map<string, number>> = {};
    const add = (k: string, v?: string) => { const x = (v || "").trim(); if (!x || x.length > 60) return; (m[k] ||= new Map()).set(x, (m[k].get(x) || 0) + 1); };
    H.forEach(c => { add("robo", c.robo); add("calle", c.calle); add("col", c.col); c.suj.forEach(s => (["piel", "masc", "chq", "cam", "pan", "cal", "otr"] as const).forEach(k => add(k, s[k]))); });
    return (k: string, base: string[]) => { const seen = new Set(base.map(norm)); return [...[...(m[k] || new Map()).entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]).filter(x => !seen.has(norm(x))), ...base]; }; }, [H]);
  const recentV = [...new Set(H.map(c => (c.veh.mo || c.veh.md).trim()).filter(Boolean))];
  const robos = useMemo(() => [...new Set((P?.items || catalogo()).map(i => i.n))], [P]);
  const data = { canal, cor, cod, robo, calle, suj, pie, veh, col, matT, mat };
  /* borrador completo (incluye vehículo, colores y sujetos): sobrevive a recargas y cambios de pestaña */
  const DK = "lspdt.next.radioDraft." + me.n;
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(DK) || "null") as (typeof data & { at: number }) | null; if (d && Date.now() - d.at < 3 * 864e5) load({ ...d, id: "", t: 0, by: "", txt: "" }, d.cor, true); } catch { /* */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(DK, JSON.stringify({ ...data, at: Date.now() })); } catch { /* */ } }, [JSON.stringify(data)]); // eslint-disable-line react-hooks/exhaustive-deps
  const txt = build(data);
  const errs = [!robo.trim() && "robo", !calle.trim() && "calle", !pie && !(veh.mo || veh.md).trim() && "vehículo de huida", !pie && matT === "ok" && !mat.trim() && "matrícula"].filter(Boolean) as string[];
  const setS = (i: number, p: Partial<Suj>) => setSuj(L => L.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const load = (c: Com, asCor: boolean, quiet?: boolean) => { setCanal(c.canal); setCor(asCor); setCod(c.cod); setRobo(c.robo); setCalle(c.calle); setSuj(c.suj.map(s => ({ ...EMPTY_S(), ...s })));
    setPie(c.pie); setVeh(c.veh); setCol(c.col); setMatT(c.matT); setMat(c.mat); if (quiet) return; toast(asCor ? "Cargado como corrección" : "Comunicado cargado"); scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { setCor(false); setRobo(""); setCalle(""); setSuj([EMPTY_S()]); setPie(false); setVeh({ cat: "", mk: "", md: "", mo: "" }); setCol(""); setMatT("ok"); setMat(""); };
  const mine = H.filter(c => c.by === me.n);
  return (
    <Split>
      <Col>
        <Card>
          <CardHeader icon={<RadioIcon />} title="Comunicado 10.03 · robo en curso" desc="Completá lo que sepas: el mensaje se arma solo. Las sugerencias aprenden de los comunicados anteriores."
            action={mine[0] && <Button size="sm" variant="outline" icon={<RotateCcw />} onClick={() => load(mine[0], true)}>Corregir el último</Button>} />
          <CardBody>
            <Field label="Canal"><div className="grid gap-2 sm:grid-cols-2">{([["rlspd", "Interna LSPD", "Solo la escucha la LSPD", Lock], ["rsapd", "Todos los departamentos", "LSPD · LSSD · SAHP · FIB", Globe]] as const).map(([k, l, d, I]) => (
              <button key={k} type="button" onClick={() => setCanal(k)} className={cn("flex items-center gap-3 rounded-2xl border p-3 text-left transition", canal === k ? "border-brand-500 bg-brand-500/10 shadow-sm" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", canal === k ? "bg-brand-600 text-white dark:bg-brand-500" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}><I className="size-[18px]" /></span>
                <span className="min-w-0"><span className="flex items-baseline gap-2"><b className="font-mono text-[14px]">/{k}</b><span className="truncate text-[12px] font-semibold text-slate-600 dark:text-slate-300">{l}</span></span><span className="block truncate text-[11.5px] text-slate-500">{d}</span></span></button>))}</div></Field>
            <Field label="Código"><div className="grid grid-cols-3 gap-2">{CODES.map(([k, l]) => (
              <button key={k} type="button" onClick={() => setCod(k)} className={cn("rounded-2xl border px-3 py-2.5 text-left transition", cod === k ? "border-brand-500 bg-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}>
                <b className={cn("block font-mono text-lg leading-tight", cod === k ? "text-brand-600 dark:text-brand-300" : "text-slate-700 dark:text-slate-200")}>{k}</b><span className="block text-[11.5px] text-slate-500">{l}</span></button>))}</div></Field>
            <button type="button" onClick={() => setCor(!cor)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", cor ? "border-amber-400 bg-amber-400/10" : "border-dashed border-slate-300 hover:border-slate-400 dark:border-slate-700")}>
              <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", cor ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", cor ? "left-[18px]" : "left-0.5")} /></span>
              <span><b className={cn("block text-[13px]", cor && "text-amber-600 dark:text-amber-400")}>Corrección</b><span className="block text-[11.5px] text-slate-500">Antepone «CORRECCIÓN» para rectificar un 10.03 ya enviado.</span></span></button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Robo"><Predict float value={robo} onChange={setRobo} list={learn("robo", robos)} placeholder="Galería de arte, Fleeca…" /></Field>
              <Field label="Calle"><Predict float value={calle} onChange={setCalle} list={learn("calle", LUGARES)} placeholder="Popular Street…" /></Field>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Users />} title={`Sujetos · ${suj.length}`} desc="De arriba hacia abajo, como se los ve: rostro, torso, piernas y calzado."
            action={<Button size="sm" variant="outline" icon={<Plus />} onClick={() => setSuj([...suj, EMPTY_S()])}>Sujeto</Button>} />
          <CardBody>
            {suj.map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-2 py-1 text-[12px] font-bold text-brand-700 dark:text-brand-300"><UserRound className="size-3.5" />Sujeto {i + 1}</span>
                  <Segmented size="sm" value={s.sx} onChange={v => setS(i, { sx: v, piel: pielFor(s.piel, v) })} options={[{ value: "m", label: "Varón" }, { value: "f", label: "Mujer" }, { value: "x", label: "No se sabe" }]} />
                  <span className="flex-1" />
                  <button type="button" title="Duplicar (mismo atuendo)" onClick={() => setSuj([...suj.slice(0, i + 1), { ...s }, ...suj.slice(i + 1)])} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Copy className="size-4" /></button>
                  {suj.length > 1 && <button type="button" aria-label={`Quitar sujeto ${i + 1}`} onClick={() => setSuj(suj.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"><Trash2 className="size-4" /></button>}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Piel"><Predict float value={s.piel} onChange={v => setS(i, { piel: v })} list={learn("piel", PIEL.map(p => p[s.sx === "f" ? 1 : 0]))} placeholder={s.sx === "f" ? "caucásica…" : "caucásico…"} /></Field>
                  {SUJ_F.map(([k, l, base, ph]) => <Field key={k} label={l}><Predict float value={s[k] as string} onChange={v => setS(i, { [k]: v })} list={learn(k, base)} placeholder={ph} /></Field>)}
                </div>
                <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{sujTxt(s)}.</p>
              </div>))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Car />} title="Vehículo de huida" action={<Segmented size="sm" value={pie ? "p" : "v"} onChange={v => setPie(v === "p")} options={[{ value: "v", label: "En vehículo" }, { value: "p", label: "A pie" }]} />} />
          {!pie && <CardBody><EscapeVeh veh={veh} setVeh={setVeh} col={col} setCol={setCol} matT={matT} setMatT={setMatT} mat={mat} setMat={setMat} recent={recentV} /></CardBody>}
        </Card>
      </Col>
      <Col className="lg:sticky lg:top-32 lg:self-start">
        <CopyLine tag={`/${canal}`} label="Mensaje de radio" text={txt} errors={errs} />
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <p className="min-w-0 flex-1 text-[12px] text-slate-500">{txt.length} caracteres · guardalo para corregirlo después y para que las sugerencias aprendan.</p>
          <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={reset}>Limpiar</Button>
          <Button size="sm" icon={<Save />} disabled={!!errs.length} onClick={() => { setH([{ id: uid(), t: Date.now(), by: me.n, txt, ...data }, ...H].slice(0, 150)); toast("Comunicado guardado"); }}>Guardar</Button>
        </Card>
        {H.length > 0 && <Card className="overflow-hidden">
          <CardHeader icon={<History />} title="Últimos comunicados" />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">{H.slice(0, 8).map(c => (
            <li key={c.id} className="space-y-1.5 px-4 py-2.5">
              <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500"><span className="rounded bg-slate-900 px-1.5 font-mono text-[10.5px] text-slate-100">/{c.canal}</span>{c.cor && <b className="text-amber-600">Corrección</b>}
                <b className="text-slate-700 dark:text-slate-200">{c.robo}</b>· {c.calle} · {fullDT(c.t)} · {c.by}</p>
              <p className="line-clamp-2 font-mono text-[11.5px] text-slate-600 dark:text-slate-300">{c.txt}</p>
              <div className="flex flex-wrap gap-1.5"><Button size="sm" variant="outline" onClick={() => load(c, false)}>Cargar</Button><Button size="sm" variant="outline" onClick={() => load(c, true)}>Corregir</Button>
                {(c.by === me.n || me.admin) && <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={async () => { if (await confirm("¿Borrar este comunicado?", { danger: true, ok: "Borrar" })) setH(H.filter(x => x.id !== c.id)); }}>Borrar</Button>}</div>
            </li>))}</ul>
        </Card>}
      </Col>
    </Split>
  );
}
