/* Mi perfil (BETA, por ahora solo six): perfil OOC con banner, foto, medallas, roles, información y secciones desplegables.
   Se guarda en lspdt.six.* (solo lo ve su dueño). Inspirado en el perfil del panel de Eleven, adaptado a la terminal. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, BookOpen, Camera, ChevronDown, Clock, FileText, Fingerprint, Heart, ImagePlus, Info, Lock, Pencil, Plus, Save, Star, Users, X, Car, Calendar, AtSign, Hash } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { useFeedback } from "@/components/feedback";
import { FbList, useMyFeedback } from "@/components/fbnotif";
import { authApi } from "@/lib/api";
import { LS, useJSON, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { readImg } from "@/lib/patrol";
import { findAgent, fmtDate, rankES } from "@/lib/domain";
import { cn } from "@/lib/cn";

type Rol = { l: string; c: string };
type Pj = { n: string; d: string };
type Prof = { nick: string; handle: string; dc: string; bio: string; medals: string; roles: Rol[]; info: string[]; pjs: Pj[]; showDc: boolean };
const KEY = "lspdt.six.profile", BAN = "lspdt.six.pban", AV = "lspdt.six.pav";
const DEF: Prof = { nick: "six", handle: "@sixxgg", dc: "335538916662968320", bio: "", medals: "🇦🇷 👑 💗", roles: [{ l: "Administración", c: "#ef4444" }, { l: "Desarrollo", c: "#a855f7" }, { l: "SAPD", c: "#3b82f6" }], info: [], pjs: [], showDc: true };
const ROL_C = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#ec4899", "#06b6d4", "#94a3b8"];
const dur = (ms: number) => { const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4); return d ? `${d}d ${h}h` : `${h}h ${m}m`; };

function Sec({ icon, t, n, children, open: o0 = false }: { icon: ReactNode; t: string; n?: number | string; children: ReactNode; open?: boolean }) {
  const [o, setO] = useState(o0);
  return (
    <Card className={cn("overflow-hidden transition", o && "ring-1 ring-brand-500/40")}>
      <button onClick={() => setO(!o)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left [&>svg]:size-4 [&>svg]:text-slate-400">
        {icon}<b className="flex-1 text-[15px]">{t}</b>{n !== undefined && <span className="rounded-md bg-slate-100 px-1.5 text-xs tabular-nums text-slate-500 dark:bg-slate-800">{n}</span>}
        <ChevronDown className={cn("transition-transform", o && "rotate-180")} /></button>
      {o && <div className="border-t border-slate-100 p-4 dark:border-slate-800">{children}</div>}
    </Card>);
}

export function Perfil() {
  useStoreVersion();
  const me = useMe(), { toast } = useFeedback(), fb = useMyFeedback(), ag = findAgent(me.n);
  const [P, setP] = useJSON<Prof>(KEY, DEF), p = { ...DEF, ...P };
  const [ed, setEd] = useState(false), [d, setD] = useState<Prof>(p), [acc, setAcc] = useState<{ c: number; no: number; last: number } | null>(null), [nr, setNr] = useState(""), [np, setNp] = useState<Pj>({ n: "", d: "" }), [now, setNow] = useState(Date.now());
  const fBan = useRef<HTMLInputElement>(null), fAv = useRef<HTMLInputElement>(null);
  useEffect(() => { void authApi({ a: "info" }).then(r => { if (r.__s === 200) setAcc({ c: r.c, no: r.no, last: r.last }); }); const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);
  const ban = LS.get(BAN), av = LS.get(AV);
  const pic = async (k: string, f?: File) => { if (!f) return; LS.set(k, await readImg(f, k === BAN ? 1800 : 600)); toast("Imagen actualizada"); };
  /* actividad en la terminal (sale de lo que ya está guardado) */
  const act = useMemo(() => {
    const inf = LS.ro<{ por?: string }[]>("lspdt.informes", []).filter(x => x.por === me.n).length;
    const pat = LS.ro<{ por: { n: string } }[]>("lspdt.patHist", []).filter(x => x.por?.n === me.n).length;
    const hue = LS.ro<{ por?: string }[]>("lspdt.huellas", []).filter(x => x.por === me.n).length;
    return [[FileText, "Informes registrados", inf], [Car, "Revisiones de patrullas", pat], [Fingerprint, "Huellas cargadas", hue], [Heart, "Feedback enviados", fb.list.length]] as const;
  }, [me.n, fb.list.length]);
  const save = () => { setP(d); setEd(false); toast("Perfil guardado"); };
  const show = ed ? d : p, pjs = [ag ? { n: ag.n, d: `${rankES(ag.r)}${ag.p ? ` · placa #${ag.p}` : ""} · LSPD` } : null, ...show.pjs].filter(Boolean) as Pj[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* banner */}
      <div className="group relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600/40 via-slate-800 to-pink-500/30 sm:h-56">
        {ban && <img src={ban} alt="" className="absolute inset-0 size-full object-cover" />}
        <button onClick={() => fBan.current?.click()} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75"><ImagePlus className="size-3.5" />Editar banner</button>
        <input ref={fBan} type="file" accept="image/*" hidden onChange={e => { void pic(BAN, e.target.files?.[0]); e.target.value = ""; }} />
        <span className="absolute left-3 top-3 rounded-md bg-pink-500 px-2 py-0.5 text-[10px] font-black tracking-wider text-white">BETA</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* columna izquierda */}
        <div className="space-y-5">
          <div className="relative -mt-20 w-36">
            <div className="size-36 overflow-hidden rounded-2xl border-4 border-slate-50 bg-slate-200 shadow-lg dark:border-slate-950 dark:bg-slate-800">
              {av ? <img src={av} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Avatar n={me.n} size={96} /></div>}</div>
            <button onClick={() => fAv.current?.click()} title="Cambiar foto" className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-brand-600 text-white shadow"><Camera className="size-4" /></button>
            <input ref={fAv} type="file" accept="image/*" hidden onChange={e => { void pic(AV, e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          {ed ? <div className="space-y-2">
            <Input value={d.nick} onChange={e => setD({ ...d, nick: e.target.value })} placeholder="Nombre OOC" />
            <Input value={d.handle} onChange={e => setD({ ...d, handle: e.target.value })} placeholder="@usuario" />
            <Input value={d.dc} onChange={e => setD({ ...d, dc: e.target.value.replace(/\D/g, "") })} placeholder="ID de Discord" className="font-mono" />
          </div> : <div>
            <h1 className="text-2xl font-bold">{p.nick}{acc?.no ? <span className="ml-1.5 text-slate-400">({acc.no})</span> : null}</h1>
            <p className="text-sm text-slate-500">{p.handle}{p.showDc && p.dc ? ` · ${p.dc}` : ""}</p>
          </div>}
          {ed ? <div className="flex gap-2"><Button variant="ghost" className="flex-1" icon={<X />} onClick={() => { setD(p); setEd(false); }}>Cancelar</Button><Button className="flex-1" icon={<Save />} onClick={save}>Guardar</Button></div>
            : <Button variant="secondary" className="w-full" icon={<Pencil />} onClick={() => { setD(p); setEd(true); }}>Editar perfil</Button>}

          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Medallas</p>
            {ed ? <Input value={d.medals} onChange={e => setD({ ...d, medals: e.target.value })} placeholder="Emojis separados por espacio" />
              : <p className="flex flex-wrap gap-1.5 text-2xl leading-none">{p.medals.split(/\s+/).filter(Boolean).map((m, i) => <span key={i} className="transition hover:scale-125">{m}</span>)}</p>}</div>

          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Roles</p>
            <div className="flex flex-wrap gap-1.5">{show.roles.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-0.5 text-xs font-semibold dark:border-slate-700"><span className="size-2 rounded-full" style={{ background: r.c }} />{r.l}
                {ed && <button aria-label={`Quitar ${r.l}`} onClick={() => setD({ ...d, roles: d.roles.filter((_, j) => j !== i) })}><X className="size-3 text-slate-400" /></button>}</span>))}</div>
            {ed && <div className="mt-2 flex gap-1"><Input value={nr} onChange={e => setNr(e.target.value)} placeholder="Nuevo rol" className="h-8 text-xs" />
              <Button size="sm" icon={<Plus />} disabled={!nr.trim()} onClick={() => { setD({ ...d, roles: [...d.roles, { l: nr.trim(), c: ROL_C[d.roles.length % ROL_C.length] }] }); setNr(""); }} /></div>}</div>

          <div className="space-y-2 text-sm"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Info</p>
            {acc && <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Calendar className="size-4 text-slate-400" />En la terminal desde el {fmtDate(acc.c).split(",")[0]}</p>}
            {ag && <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Users className="size-4 text-slate-400" />Personaje: {ag.n}</p>}
            {p.dc && p.showDc && <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><AtSign className="size-4 text-slate-400" />Discord {p.dc}</p>}
            {ed ? <Textarea rows={3} value={d.info.join("\n")} onChange={e => setD({ ...d, info: e.target.value.split("\n") })} placeholder="Una línea por dato (ej: VIP · Whitelist aprobada)" />
              : p.info.filter(Boolean).map((x, i) => <p key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Hash className="size-4 text-slate-400" />{x}</p>)}
          </div>
        </div>

        {/* columna derecha */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {([[Users, "Personajes", String(pjs.length), "#6366f1"], [Clock, "Tiempo en la terminal", acc ? dur(now - acc.c) : "—", "#10b981"], [Star, "Actividad", String(act.reduce((n, a) => n + a[2], 0)), "#f59e0b"]] as const).map(([I, l, v, c]) => (
              <Card key={l} className="flex items-center gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl" style={{ color: c, background: c + "1f" }}><I className="size-5" /></span>
                <div><p className="text-xs text-slate-500">{l}</p><p className="text-2xl font-bold tabular-nums">{v}</p></div></Card>))}
          </div>
          <Sec icon={<Info />} t="Información" open>
            {ed ? <Textarea rows={4} value={d.bio} onChange={e => setD({ ...d, bio: e.target.value })} placeholder="Algo sobre vos…" />
              : <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{p.bio || "Todavía no escribiste nada. Tocá «Editar perfil»."}</p>}
          </Sec>
          <Sec icon={<Users />} t="Personajes" n={pjs.length}>
            <div className="grid gap-2 sm:grid-cols-2">{pjs.map((x, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><Avatar n={x.n} size={36} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{x.n}</p><p className="truncate text-xs text-slate-500">{x.d}</p></div>
                {i === 0 && ag ? <RankBadge r={ag.r} /> : ed && <button aria-label="Quitar" onClick={() => setD({ ...d, pjs: d.pjs.filter((_, j) => j !== i - (ag ? 1 : 0)) })}><X className="size-4 text-slate-400" /></button>}</div>))}</div>
            {ed && <div className="mt-3 flex flex-wrap gap-2"><Input value={np.n} onChange={e => setNp({ ...np, n: e.target.value })} placeholder="Nombre del personaje" className="h-9 w-48" />
              <Input value={np.d} onChange={e => setNp({ ...np, d: e.target.value })} placeholder="Facción o rol (opcional)" className="h-9 min-w-[10rem] flex-1" />
              <Button size="sm" variant="outline" icon={<Plus />} disabled={!np.n.trim()} onClick={() => { setD({ ...d, pjs: [...d.pjs, { n: np.n.trim(), d: np.d.trim() }] }); setNp({ n: "", d: "" }); }}>Agregar</Button></div>}
          </Sec>
          <Sec icon={<Activity />} t="Actividad en la terminal">
            <div className="grid gap-2 sm:grid-cols-2">{act.map(([I, l, n]) => (
              <div key={l} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><I className="size-4 text-slate-400" /><span className="flex-1 text-sm">{l}</span><b className="tabular-nums">{n}</b></div>))}</div>
            {acc?.last ? <p className="mt-3 text-xs text-slate-400">Último ingreso: {fmtDate(acc.last)}</p> : null}
          </Sec>
          <Sec icon={<Heart />} t="Sugerencias y bugs" n={fb.list.length}><FbList list={fb.list} /></Sec>
          <Sec icon={<BookOpen />} t="Historias"><p className="text-sm text-slate-400">Próximamente.</p></Sec>
          <Sec icon={<Lock />} t="Privacidad">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-brand-600" checked={p.showDc} onChange={e => setP({ ...p, showDc: e.target.checked })} />Mostrar mi ID de Discord en el perfil</label>
            <p className="mt-2 text-xs text-slate-400">Por ahora el perfil solo lo ves vos (BETA).</p>
          </Sec>
        </div>
      </div>
    </div>
  );
}
