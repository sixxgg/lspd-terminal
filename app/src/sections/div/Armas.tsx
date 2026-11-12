/* METRO · Armas (solo coordinación): por tipo de arma, cada una con su munición y accesorios (uno por ranura, como en el juego),
   para quién está autorizada y notas. «Copiar kit» arma la lista de ítems, los comandos para dar el kit o el texto para Discord. */
import { useState } from "react";
import { Check, ClipboardList, Copy, Crosshair, Package, Power, RotateCcw, Shield } from "lucide-react";
import { Button, Card, Field, Input, Segmented, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useCopy } from "@/components/output";
import { useFeedback } from "@/components/feedback";
import { ACC, ARMAS, ARMAS_KEY, CATS, SLOTS, cfgOf, kg, kitOf, type Arma, type ArmaCfg, type Cat } from "@/lib/armas";
import { LS, useJSON } from "@/lib/store";
import { cn } from "@/lib/cn";

const CMD_K = "lspdt.next.armacmd", ID_K = "lspdt.next.armaid";
const lsGet = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* */ } };

export function Armas() {
  const [all, setAll] = useJSON<Record<string, Partial<ArmaCfg>>>(ARMAS_KEY, {});
  const [cat, setCat] = useState<Cat>(() => (LS.get("lspdt.next.armacat") as Cat) || "pis"), [kit, setKit] = useState<Arma[] | null>(null);
  const { confirm } = useFeedback();
  const set = (a: Arma, p: Partial<ArmaCfg>) => setAll({ ...all, [a.k]: { ...cfgOf(a, all), ...p } });
  const list = ARMAS.filter(a => a.cat === cat), act = ARMAS.filter(a => cfgOf(a, all).on);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Segmented value={cat} onChange={v => { setCat(v); LS.set("lspdt.next.armacat", v); }} options={CATS.map(([value, label]) => ({ value, label: <span className="inline-flex items-center gap-1.5">{label}<span className="rounded bg-black/10 px-1 text-[10px] tabular-nums dark:bg-white/10">{ARMAS.filter(a => a.cat === value).length}</span></span> }))} />
        <p className="ml-auto text-xs text-slate-500">{act.length} de {ARMAS.length} armas en dotación</p>
        <Button variant="outline" icon={<Package />} onClick={() => setKit(act)} disabled={!act.length}>Kit completo</Button>
      </Card>
      <div className="grid gap-4 2xl:grid-cols-2">{list.map(a => <WeaponCard key={a.k} a={a} c={cfgOf(a, all)} set={p => set(a, p)} onKit={() => setKit([a])}
        onReset={async () => { if (await confirm(`¿Volver ${a.l} a los valores por defecto?`)) { const o = { ...all }; delete o[a.k]; setAll(o); } }} />)}</div>
      <KitModal list={kit} all={all} onClose={() => setKit(null)} />
    </div>);
}

function WeaponCard({ a, c, set, onKit, onReset }: { a: Arma; c: ArmaCfg; set: (p: Partial<ArmaCfg>) => void; onKit: () => void; onReset: () => void }) {
  const copy = useCopy();
  const slots = SLOTS.filter(([s]) => a.acc.some(k => ACC[k].s === s));
  const pick = (k: string) => { const s = ACC[k].s, has = c.acc.includes(k); set({ acc: has ? c.acc.filter(x => x !== k) : [...c.acc.filter(x => ACC[x]?.s !== s), k] }); };
  const peso = a.w + c.acc.reduce((t, k) => t + (ACC[k]?.w || 0), 0);
  return (
    <Card className={cn("overflow-hidden transition", !c.on && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-3 bg-[linear-gradient(135deg,#0b1a33,#08101d)] px-5 py-4 text-white">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Crosshair className="size-5 text-amber-300" /></span>
        <div className="min-w-0 flex-1"><p className="text-lg font-bold leading-tight">{a.l}</p>
          <button onClick={() => void copy(a.k)} title="Copiar nombre del ítem" className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11.5px] text-sky-300 hover:underline">{a.k}<Copy className="size-3" /></button></div>
        <div className="flex gap-1.5 text-[11px]"><span className="rounded-lg bg-white/10 px-2 py-1 font-semibold">{a.cal}</span><span className="rounded-lg bg-white/10 px-2 py-1 font-semibold">{kg(peso)}</span></div>
        <button onClick={() => set({ on: !c.on })} aria-pressed={c.on} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition", c.on ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40" : "bg-white/10 text-white/60")}>
          <Power className="size-3.5" />{c.on ? "En dotación" : "Fuera de dotación"}</button>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Munición" hint={`(${a.ammo})`}><Input inputMode="numeric" value={c.n || ""} onChange={e => set({ n: +e.target.value.replace(/\D/g, "") || 0 })} placeholder="0" /></Field>
          <Field label="Cargadores" hint="(opcional)"><Input inputMode="numeric" value={c.mags || ""} onChange={e => set({ mags: +e.target.value.replace(/\D/g, "") || 0 })} placeholder="—" /></Field>
          <Field label="Autorizada para"><Input value={c.auth} onChange={e => set({ auth: e.target.value })} placeholder="Ej: SWAT, toda la METRO" /></Field>
        </div>
        <div className="space-y-2.5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Accesorios · {c.acc.length}</p>
          {slots.map(([s, l]) => (
            <div key={s} className="flex flex-wrap items-center gap-1.5"><span className="w-32 shrink-0 text-xs font-semibold text-slate-500">{l}</span>
              {a.acc.filter(k => ACC[k].s === s).map(k => { const on = c.acc.includes(k); return (
                <button key={k} onClick={() => pick(k)} aria-pressed={on} title={k} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  on ? "border-amber-400 bg-amber-400/15 text-amber-700 dark:text-amber-300" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-200")}>
                  {on && <Check className="size-3" />}{ACC[k].l}</button>); })}</div>))}
          <p className="text-[11px] text-slate-400">Uno por ranura, como en el juego: elegir otro de la misma ranura reemplaza al anterior.</p>
        </div>
        <Field label="Notas" hint="(opcional)"><Textarea rows={2} value={c.nota} onChange={e => set({ nota: e.target.value })} placeholder="Uso, condiciones, a quién se entrega…" /></Field>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button icon={<ClipboardList />} onClick={onKit}>Copiar kit</Button>
          <Button variant="ghost" icon={<RotateCcw />} onClick={onReset}>Restablecer</Button>
        </div>
      </div>
    </Card>);
}

/* modal de copiado: lista de ítems, comandos (plantilla editable) o texto para Discord; cada línea se copia sola o todo junto */
function KitModal({ list, all, onClose }: { list: Arma[] | null; all: Record<string, Partial<ArmaCfg>>; onClose: () => void }) {
  const copy = useCopy();
  const [mode, setMode] = useState<"items" | "cmd" | "dc">("cmd"), [tpl, setTpl] = useState(() => lsGet(CMD_K, "/giveitem {id} {item} {cant}")), [id, setId] = useState(() => lsGet(ID_K, ""));
  if (!list) return null;
  const rows = list.flatMap(a => kitOf(a, cfgOf(a, all)).map(r => ({ a, r })));
  const lines = mode === "items" ? rows.map(({ r }) => `${r[0]} x${r[1]}`)
    : mode === "cmd" ? rows.map(({ r }) => tpl.replace(/\{id\}/g, id || "ID").replace(/\{item\}/g, r[0]).replace(/\{cant\}/g, String(r[1])))
    : [];
  const dc = ["## 🔫 Armamento · Metropolitan Division", "", ...list.flatMap(a => { const c = cfgOf(a, all);
    return [`### ${a.l} \`${a.k}\``, `**Munición:** ${c.n} × ${a.cal} (\`${a.ammo}\`)${c.mags ? ` · ${c.mags} cargadores` : ""}`,
      `**Accesorios:** ${c.acc.length ? c.acc.map(k => ACC[k]?.l).filter(Boolean).join(", ") : "ninguno"}`, ...(c.auth ? [`**Autorizada para:** ${c.auth}`] : []), ...(c.nota.trim() ? [`> ${c.nota.trim()}`] : []), ""]; }),
    "-# Los Santos Police Department · Metropolitan Division"].join("\n").trim();
  const full = mode === "dc" ? dc : lines.join("\n");
  return (
    <Modal open onClose={onClose} size="lg" icon={<Package />} title={list.length === 1 ? `Kit · ${list[0].l}` : `Kit completo · ${list.length} armas`} desc={`${rows.length} ítems`}
      footer={<><span className="mr-auto text-xs text-slate-500">{mode === "cmd" && !id && "Poné el ID del jugador para que salgan listos."}</span><Button icon={<Copy />} onClick={() => void copy(full)}>Copiar todo</Button></>}>
      <Segmented value={mode} onChange={setMode} options={[{ value: "cmd", label: "Comandos" }, { value: "items", label: "Lista de ítems" }, { value: "dc", label: "Discord" }]} />
      {mode === "cmd" && <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field label="ID del jugador"><Input value={id} inputMode="numeric" onChange={e => { setId(e.target.value); lsSet(ID_K, e.target.value); }} placeholder="Ej: 12" /></Field>
        <Field label="Comando" hint="({id} {item} {cant})"><Input className="font-mono" value={tpl} onChange={e => { setTpl(e.target.value); lsSet(CMD_K, e.target.value); }} /></Field>
      </div>}
      {mode === "dc" ? <pre className="no-tr max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-xl bg-[#313338] p-4 font-mono text-[12.5px] leading-relaxed text-slate-100">{dc}</pre>
        : <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">{lines.map((l, i) => (
          <div key={i} className="group flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 dark:border-slate-800">
            <code className="no-tr min-w-0 flex-1 truncate font-mono text-[12.5px]">{l}</code>
            <span className="hidden shrink-0 text-[11px] text-slate-400 sm:block">{rows[i].r[2]}{list.length > 1 && rows[i].r[0] !== rows[i].a.k ? ` · ${rows[i].a.l}` : ""}</span>
            <button onClick={() => void copy(l)} aria-label="Copiar línea" className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Copy className="size-4" /></button>
          </div>))}</div>}
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Shield className="size-3.5" />Solo armas en dotación. Los nombres son los del inventario (ox_inventory).</p>
    </Modal>);
}
