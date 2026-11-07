import { useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, UserPlus, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { Button, Checkbox, Field, Input, Segmented } from "@/components/ui";
import { authApi } from "@/lib/api";
import { emailOf, norm, rankES } from "@/lib/domain";
import { cn } from "@/lib/cn";

export type PubInfo = { names: string[]; needCode: boolean; roster?: { n: string; r: string; p?: string }[]; brand?: Record<string, string> };
type Msg = { kind: "err" | "pend" | "info"; text: string } | null;

export function Login({ pub, onDone }: { pub: PubInfo; onDone: (r: { data: unknown }) => void }) {
  const [tab, setTab] = useState<"in" | "up">("in");
  const [u, setU] = useState(() => { try { return localStorage.getItem("lspdt.next.lastUser") || ""; } catch { return ""; } });
  const [pw, setPw] = useState(""), [pw2, setPw2] = useState(""), [code, setCode] = useState("");
  const [keep, setKeep] = useState(true), [show, setShow] = useState(false), [busy, setBusy] = useState(false);
  const [name, setName] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const reg = useMemo(() => new Set(pub.names), [pub.names]);
  const sug = useMemo(() => { const s = norm(name.trim()); if (s.length < 2) return []; return (pub.roster || []).filter(a => norm(a.n).includes(s) || String(a.p) === s).slice(0, 6); }, [name, pub.roster]);
  const picked = (pub.roster || []).find(a => a.n === name);
  const logo = pub.brand?.["lspdt.logo.login"] || pub.brand?.["lspdt.logo"] || "/next/logo.svg";

  async function login(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!u.trim() || !pw) return setMsg({ kind: "err", text: "Completá el correo y la contraseña." });
    setBusy(true);
    const r = await authApi({ a: "login", u: u.trim(), pw, keep });
    setBusy(false);
    if (r.__s !== 200) return setMsg({ kind: r.pending ? "pend" : "err", text: r.msg || "No se pudo iniciar sesión." });
    try { localStorage.setItem("lspdt.next.lastUser", u.trim()); } catch { /* */ }
    onDone(r as unknown as { data: unknown });
  }
  async function register(e: FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!picked) return setMsg({ kind: "err", text: "Escribí el nombre de tu personaje y elegilo de la lista." });
    if (reg.has(picked.n)) return setMsg({ kind: "err", text: "Ese agente ya tiene cuenta. Iniciá sesión." });
    if (pw.length < 6) return setMsg({ kind: "err", text: "La contraseña tiene que tener al menos 6 caracteres." });
    if (pw !== pw2) return setMsg({ kind: "err", text: "Las contraseñas no coinciden." });
    if (pub.needCode && !code.trim()) return setMsg({ kind: "err", text: "Ingresá el código de registro que te pasó Capitanía." });
    setBusy(true);
    const r = await authApi({ a: "register", n: picked.n, pw, code, keep: true });
    setBusy(false);
    if (r.__s === 202) { setTab("in"); setU(r.e || emailOf(picked.n)); setPw(""); setPw2(""); setMsg({ kind: "pend", text: r.msg || "" }); return; }
    if (r.__s !== 200) return setMsg({ kind: "err", text: r.msg || "No se pudo crear la cuenta." });
    onDone(r as unknown as { data: unknown });
  }

  return (
    <div className="relative grid min-h-[var(--app-h,100dvh)] place-items-center overflow-hidden bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="relative w-full max-w-[420px] animate-fade-in">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/40">
          <div className="flex flex-col items-center text-center">
            <img decoding="async" src={logo} alt="" className="h-16 w-auto drop-shadow" />
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">Los Santos Police Department</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Terminal de Mando</h1>
          </div>
          <div className="mt-6 flex justify-center">
            <Segmented value={tab} onChange={v => { setTab(v); setMsg(null); }} options={[{ value: "in", label: "Iniciar sesión", icon: <LogIn /> }, { value: "up", label: "Registrarse", icon: <UserPlus /> }]} />
          </div>

          {tab === "in" ? (
            <form onSubmit={login} className="mt-6 space-y-4">
              <Field label="Correo o nombre"><Input autoComplete="username" value={u} onChange={e => setU(e.target.value)} placeholder="nombre@sanandreas.eu" /></Field>
              <Field label="Contraseña">
                <div className="relative">
                  <Input type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" className="pr-10" />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
              <Checkbox checked={keep} onChange={setKeep} label="Mantener la sesión iniciada en este dispositivo" />
              <MsgBox m={msg} />
              <Button type="submit" size="lg" loading={busy} className="w-full">Ingresar</Button>
            </form>
          ) : (
            <form onSubmit={register} className="mt-6 space-y-4">
              <Field label="Tu personaje" hint="(tal como figura en el roster)">
                <div className="relative">
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre, placa o State ID" autoComplete="off" />
                  {sug.length > 0 && !picked && (
                    <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      {sug.map(a => (
                        <button type="button" key={a.n} onClick={() => setName(a.n)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800">
                          <span className="flex-1 font-medium">{a.n}</span><span className="text-xs text-slate-400">{rankES(a.r)}{a.p ? " · #" + a.p : ""}</span>
                          {reg.has(a.n) && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Registrado</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              {picked && <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"><ShieldCheck className="size-4 text-brand-500" />{rankES(picked.r)}{picked.p ? ` · Placa #${picked.p}` : ""} · {emailOf(picked.n)}</div>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contraseña"><Input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
                <Field label="Repetir"><Input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></Field>
              </div>
              {pub.needCode && <Field label="Código de registro"><Input value={code} onChange={e => setCode(e.target.value)} /></Field>}
              <MsgBox m={msg} />
              <Button type="submit" size="lg" loading={busy} className="w-full">Crear cuenta</Button>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-slate-400">Mission Row 10 · Uso interno · <a href="/clasica/" className="font-medium text-brand-600 hover:underline dark:text-brand-300">Versión clásica</a></p>
      </div>
    </div>
  );
}

function MsgBox({ m }: { m: Msg }) {
  if (!m) return null;
  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
      m.kind === "pend" ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300")}>
      {m.kind === "pend" ? <Clock className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}<span>{m.text}</span>
    </div>
  );
}
