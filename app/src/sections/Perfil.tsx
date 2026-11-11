/* Perfil (BETA) estilo comunidad: portada, foto, contadores, seguidores, «acerca de», visitantes recientes y pestañas
   Actividad · Logros (condecoraciones) · Comentarios. Cualquiera puede ver un perfil y dejar comentarios; el dueño recibe la notificación.
   Datos: lspdt.uprof.<slug> (solo el dueño), lspdt.uprof.<slug>.ban (portada), lspdt.ucom.<slug> (comentarios), lspdt.uvis.<slug> (visitas), lspdt.ufol.<slug> (seguidores). */
import { useEffect, useRef, useState } from "react";
import { Activity, Award as AwardI, Camera, Eye, MessageSquare, Pencil, Save, Send, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { Button, Card, Textarea } from "@/components/ui";
import { Avatar, RankBadge } from "@/components/agents";
import { Ribbon } from "@/components/ribbon";
import { useFeedback } from "@/components/feedback";
import { useTick } from "@/components/fbnotif";
import { LS, useStoreVersion } from "@/lib/store";
import { useMe } from "@/lib/me";
import { readImg } from "@/lib/patrol";
import { ago, emailOf, findAgent, fmtDate, rankES, uid } from "@/lib/domain";
import { decorOf, type Award } from "@/lib/decor";
import { profFull, takePreset } from "@/lib/profiles";
import { cn } from "@/lib/cn";

export type UProf = { bio?: string; since?: number; seen?: number; col?: string };
export type UCom = { id: string; by: string; t: number; x: string };
type UVis = { c: number; l: { n: string; t: number }[] };
export const slugOf = (n: string) => emailOf(n).split("@")[0];
export const K = { prof: (n: string) => `lspdt.uprof.${slugOf(n)}`, ban: (n: string) => `lspdt.uprof.${slugOf(n)}.ban`, com: (n: string) => `lspdt.ucom.${slugOf(n)}`, vis: (n: string) => `lspdt.uvis.${slugOf(n)}`, fol: (n: string) => `lspdt.ufol.${slugOf(n)}` };
const COLS = ["#0f7a3a", "#1e3a8a", "#7c3aed", "#b91c1c", "#0e7490", "#be185d", "#334155"];
const dmy = (t?: number) => (t ? new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—");

export function Perfil() {
  useStoreVersion(); useTick();
  const me = useMe(), { toast, confirm } = useFeedback();
  const [who, setWho] = useState(() => takePreset<{ n: string }>()?.n || me.n), own = who === me.n, ag = findAgent(who);
  const P = LS.json<UProf>(K.prof(who), {}), ban = LS.get(K.ban(who)) || "", coms = LS.json<UCom[]>(K.com(who), []), vis = LS.json<UVis>(K.vis(who), { c: 0, l: [] }), fol = LS.json<string[]>(K.fol(who), []);
  const prof = profFull(who), cond = ((prof.cond || []) as unknown as Award[]).slice().sort((a, b) => (b.f || "").localeCompare(a.f || ""));
  const [tab, setTab] = useState<"act" | "log" | "com">("com"), [ed, setEd] = useState(false), [bio, setBio] = useState(P.bio || ""), [txt, setTxt] = useState(""), fBan = useRef<HTMLInputElement>(null);
  useEffect(() => { setBio(P.bio || ""); setEd(false); setTab("com"); }, [who]); // eslint-disable-line react-hooks/exhaustive-deps
  /* visita: una por sesión y por perfil (no cuenta la propia) */
  useEffect(() => { if (own) return; const sk = "lspdt.next.vis." + slugOf(who); try { if (sessionStorage.getItem(sk)) return; sessionStorage.setItem(sk, "1"); } catch { /* */ }
    const v = LS.json<UVis>(K.vis(who), { c: 0, l: [] }); LS.setJSON(K.vis(who), { c: v.c + 1, l: [{ n: me.n, t: Date.now() }, ...v.l.filter(x => x.n !== me.n)].slice(0, 12) }); }, [who, own, me.n]);
  const saveP = (p: Partial<UProf>) => LS.setJSON(K.prof(who), { ...LS.json<UProf>(K.prof(who), {}), ...p });
  const post = () => { const x = txt.trim(); if (!x) return; LS.setJSON(K.com(who), [...LS.json<UCom[]>(K.com(who), []), { id: uid(), by: me.n, t: Date.now(), x: x.slice(0, 1500) }].slice(-200)); setTxt(""); toast(own ? "Publicado" : `Comentario enviado a ${who}`); };
  const following = fol.includes(me.n);
  /* actividad: ascensos/traslados del perfil del agente, condecoraciones y comentarios que dejó en su perfil */
  const act = [...(prof.movs || []).map(m => ({ t: m.t, x: `${m.tipo}${m.de ? ` · ${m.de}` : ""}${m.a ? ` → ${m.a}` : ""}`, by: m.por?.n })),
    ...cond.filter(c => c.f).map(c => ({ t: new Date(c.f!).getTime(), x: `Recibió «${c.t}»`, by: c.by })),
    ...coms.filter(c => c.by === who).map(c => ({ t: c.t, x: `Escribió en su perfil: «${c.x.slice(0, 80)}${c.x.length > 80 ? "…" : ""}»`, by: undefined }))].filter(a => a.t).sort((a, b) => b.t - a.t).slice(0, 30);
  const TABS: ["act" | "log" | "com", string, typeof Activity, number][] = [["act", "Actividad", Activity, act.length], ["log", "Logros", AwardI, cond.length], ["com", "Comentarios", MessageSquare, coms.length]];
  const people = (L: string[]) => <div className="grid grid-cols-5 gap-2">{L.slice(0, 15).map(n => <button key={n} title={n} onClick={() => setWho(n)} className="justify-self-center"><Avatar n={n} size={36} /></button>)}</div>;
  return (
    <div className="space-y-4">
      {/* portada */}
      <Card className="overflow-hidden p-0">
        <div className="relative h-40 sm:h-48" style={{ background: ban ? undefined : `linear-gradient(135deg, ${P.col || COLS[0]}, ${P.col || COLS[0]}99)` }}>
          {ban && <img src={ban} alt="" className="absolute inset-0 size-full object-cover" />}
          {own && <div className="absolute right-3 top-3 flex gap-1.5">
            {COLS.map(c => <button key={c} aria-label="Color de portada" onClick={() => { saveP({ col: c }); if (ban) LS.del(K.ban(who)); }} className="size-5 rounded-full ring-2 ring-white/60" style={{ background: c }} />)}
            <button onClick={() => fBan.current?.click()} className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/70"><Camera className="size-3.5" />Portada</button></div>}
          <input ref={fBan} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; LS.set(K.ban(who), await readImg(f, 1400)); toast("Portada actualizada"); }} />
        </div>
        <div className="flex flex-wrap items-end gap-4 px-5 pb-4">
          <div className="-mt-12 rounded-full ring-4 ring-white dark:ring-slate-900"><Avatar n={who} size={104} /></div>
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="truncate text-2xl font-bold">{who}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">{ag && <RankBadge r={ag.r} />}{ag?.p && <span className="font-mono text-xs">#{ag.p}</span>}{prof.cs && <span className="font-mono text-xs text-red-500">{prof.cs}</span>}</div>
          </div>
          <div className="flex gap-2">
            {!own && <Button size="sm" variant={following ? "outline" : "primary"} icon={following ? <UserCheck /> : <UserPlus />} onClick={() => { LS.setJSON(K.fol(who), following ? fol.filter(x => x !== me.n) : [...fol, me.n]); }}>{following ? "Siguiendo" : "Seguir"}</Button>}
            {!own && <Button size="sm" variant="outline" onClick={() => setWho(me.n)}>Ir a mi perfil</Button>}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-100 text-center dark:border-slate-800 sm:max-w-xl sm:text-left">
          {([["Comentarios", String(coms.length)], ["Ingreso", dmy(P.since)], ["Última visita", P.seen ? ago(P.seen) : "—"]] as const).map(([l, v]) => (
            <div key={l} className="px-5 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p><p className="text-sm font-semibold">{v}</p></div>))}
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* columna lateral */}
        <div className="space-y-4">
          <Card className="p-4"><p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-slate-400" />{fol.length} {fol.length === 1 ? "seguidor" : "seguidores"}</p>
            {fol.length ? people(fol) : <p className="text-xs text-slate-400">Todavía nadie.</p>}</Card>
          <Card className="p-4"><div className="mb-2 flex items-center"><p className="flex-1 text-sm font-semibold">Acerca de {own ? "mí" : who.split(" ")[0]}</p>
            {own && !ed && <button aria-label="Editar" onClick={() => setEd(true)} className="text-slate-400 hover:text-brand-500"><Pencil className="size-3.5" /></button>}</div>
            {ed ? <div className="space-y-2"><Textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Contá algo sobre vos…" />
              <div className="flex justify-end gap-1.5"><Button size="sm" variant="ghost" icon={<X />} onClick={() => { setBio(P.bio || ""); setEd(false); }}>Cancelar</Button><Button size="sm" icon={<Save />} onClick={() => { saveP({ bio: bio.trim().slice(0, 1000) }); setEd(false); toast("Guardado"); }}>Guardar</Button></div></div>
              : <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{P.bio || <span className="text-slate-400">{own ? "Escribí algo sobre vos." : "Sin información."}</span>}</p>}</Card>
          <Card className="p-4"><p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Eye className="size-4 text-slate-400" />Visitantes recientes</p>
            <p className="mb-2 text-xs text-slate-400">{vis.c.toLocaleString("es-AR")} visitas al perfil</p>
            {vis.l.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{vis.l.slice(0, 6).map(v => (
              <button key={v.n} onClick={() => setWho(v.n)} className="flex w-full items-center gap-2.5 py-2 text-left"><Avatar n={v.n} size={28} /><span className="min-w-0"><b className="block truncate text-sm">{v.n}</b><small className="text-xs text-slate-400">{ago(v.t)}</small></span></button>))}</div>
              : <p className="text-xs text-slate-400">Sin visitas todavía.</p>}</Card>
        </div>

        {/* pestañas */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800">{TABS.map(([k, l, I, n]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("relative flex items-center justify-center gap-2 py-3 text-sm font-semibold transition", tab === k ? "text-brand-600 dark:text-brand-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-white")}>
              <I className="size-4" />{l}<span className="rounded-md bg-slate-100 px-1.5 text-[11px] tabular-nums dark:bg-slate-800">{n}</span>
              {tab === k && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-brand-500" />}</button>))}</div>
          <div className="p-5">
            {tab === "com" && <div className="space-y-4">
              <div className="flex gap-3"><Avatar n={me.n} size={36} /><div className="flex-1 space-y-2"><Textarea rows={2} value={txt} onChange={e => setTxt(e.target.value)} placeholder={own ? "Escribí algo en tu perfil…" : `Dejale un comentario a ${who.split(" ")[0]}…`}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) post(); }} />
                <div className="flex justify-end"><Button size="sm" icon={<Send />} disabled={!txt.trim()} onClick={post}>Publicar</Button></div></div></div>
              {!coms.length ? <p className="py-6 text-center text-sm text-slate-400">Sin comentarios todavía.</p> : <div className="space-y-3">{coms.slice().reverse().map(c => (
                <div key={c.id} className="flex gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button onClick={() => setWho(c.by)}><Avatar n={c.by} size={36} /></button>
                  <div className="min-w-0 flex-1"><p className="text-sm"><button onClick={() => setWho(c.by)} className="font-semibold hover:underline">{c.by}</button> <span className="text-xs text-slate-400">· {ago(c.t)}</span></p>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{c.x}</p></div>
                  {(c.by === me.n || own) && <button aria-label="Borrar comentario" onClick={async () => { if (await confirm("¿Borrar este comentario?", { danger: true })) LS.setJSON(K.com(who), LS.json<UCom[]>(K.com(who), []).filter(x => x.id !== c.id)); }} className="self-start text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button>}
                </div>))}</div>}
            </div>}
            {tab === "log" && (!cond.length ? <p className="py-6 text-center text-sm text-slate-400">Sin condecoraciones todavía.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{cond.map(c => { const d = decorOf(c.k); return (
              <div key={c.id} className="flex gap-4 py-3"><span className="w-24 shrink-0 pt-1">{d && <Ribbon d={d} />}</span>
                <div className="min-w-0"><b className="block">{c.t}</b><p className="text-xs text-slate-500">Otorgada {c.f ? fmtDate(new Date(c.f).getTime()).split(",")[0] : ""}{c.by ? `, por ${c.by}` : ""}</p>{c.m && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.m}</p>}</div></div>); })}</div>)}
            {tab === "act" && (!act.length ? <p className="py-6 text-center text-sm text-slate-400">Sin actividad registrada.</p> : <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-slate-800">{act.map((a, i) => (
              <li key={i}><span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white bg-brand-500 dark:border-slate-900" /><p className="text-sm">{a.x}</p><p className="text-xs text-slate-400">{ago(a.t)}{a.by ? ` · por ${a.by}` : ""}</p></li>))}</ol>)}
          </div>
        </Card>
      </div>
      {!own && <p className="text-center text-xs text-slate-400">Estás viendo el perfil de {who} · {ag ? rankES(ag.r) : ""}</p>}
    </div>
  );
}
