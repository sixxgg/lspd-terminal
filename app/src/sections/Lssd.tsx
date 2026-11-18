/* LSSD y SAHP: importar el roster desde la planilla (Administración › Roster y respaldo) y el aviso de las secciones en construcción.
   El roster va a lspdt.<depto>.roster (lo carga solo six: tiene los usuarios OOC con los que entran las cuentas). Los rangos van en inglés, como en la planilla. */
import { useMemo, useState, type ReactNode } from "react";
import { Briefcase, Check, ClipboardList, Construction, Landmark, Scale, Search, Star, Upload, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { LS, useStoreVersion } from "@/lib/store";
import { DEPT, DEL, isK9, type LssdAg } from "@/lib/dept";
import { LEVEL, norm } from "@/lib/domain";
import { cn } from "@/lib/cn";

const lvlX = (r: string) => (r === "K-9" ? 0.1 : LEVEL[r] ?? 0);
/* importar la planilla: se copia entera en Google Sheets (Ctrl+A, Ctrl+C) y se pega acá. Columnas: Usuario, Ingreso, Placa, Nombre, Insignia, Rango, Actividad…
   Los rangos vienen numerados («03. Deputy Sheriff»), «D.S. Trainee» abreviado y los perros como «01. K-9» (la columna Usuario es la del handler). */
const fixRank = (r: string) => { const x = r.replace(/^\d+\.\s*/, "").trim(); return /^d\.?\s*s\.?\s*trainee$/i.test(x) ? "Deputy Sheriff Trainee" : /^k-?9$/i.test(x) ? "K-9" : x; };
function parseSheet(t: string): LssdAg[] {
  const sep = /\t/.test(t) ? "\t" : /;/.test(t.split("\n")[0] || "") ? ";" : ",";
  const rows = t.replace(/\r/g, "").split("\n").map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, "")));
  const hi = rows.findIndex(r => r.some(c => /^usuario$/i.test(c)) && r.some(c => /^rango$/i.test(c)));
  const H = hi >= 0 ? rows[hi].map(c => norm(c)) : ["usuario", "ingreso", "placa", "nombre", "insignia", "rango", "actividad"];
  const col = (k: string) => H.findIndex(h => h.startsWith(k));
  const [cu, ci, cp, cn, cr, ca] = [col("usuario"), col("ingreso"), col("placa"), col("nombre"), col("rango"), col("actividad")];
  /* el apellido va en la columna de al lado (con encabezado «Apellido» o vacío, porque «Nombre» está combinado) */
  const ca2 = col("apellido") >= 0 ? col("apellido") : H[cn + 1] === "" ? cn + 1 : -1;
  const out: LssdAg[] = [];
  for (const r of rows.slice(hi + 1)) {
    const n = [r[cn], ca2 >= 0 ? r[ca2] : ""].filter(Boolean).join(" ").trim(), rk = fixRank(r[cr] || ""), u = (r[cu] || "").replace(/^\.\s+/, "");
    if (!n || !rk || /^n\/?a$/i.test(rk)) continue;
    const a: LssdAg = { i: r[ci] || "", p: (r[cp] || "").replace(/\D/g, ""), n, r: rk, e: r[ca] || "Activo" };
    if (rk === "K-9") { if (u) a.h = u; } else a.u = u;
    out.push(a);
  }
  for (const d of out.filter(isK9)) { const hd = d.h && out.find(x => !isK9(x) && norm(x.u || "") === norm(d.h!)); if (hd) d.hn = hd.n; }
  return out;
}
export function RosterImport() {
  useStoreVersion();
  const { toast, confirm } = useFeedback(), [t, setT] = useState(""), L = useMemo(() => parseSheet(t), [t]), d = DEPT.id, key = `lspdt.${d}.roster`, cur = LS.json<LssdAg[]>(key, []);
  const byR = useMemo(() => Object.entries(L.reduce<Record<string, number>>((a, x) => ({ ...a, [x.r]: (a[x.r] || 0) + 1 }), {})).sort((a, b) => lvlX(b[0]) - lvlX(a[0])), [L]);
  const sinU = L.filter(a => !isK9(a) && !a.u).length, raros = byR.filter(([r]) => !lvlX(r)).map(([r]) => r);
  return (
    <Card>
      <CardHeader icon={<Upload />} title={`Roster ${DEL[d]} desde la planilla`} desc={`Ahora: ${cur.filter(a => !isK9(a)).length} integrantes${cur.some(isK9) ? ` y ${cur.filter(isK9).length} K-9` : ""}. En la planilla: Ctrl+A y Ctrl+C, y pegalo acá (con los encabezados). También sirve un CSV.`} />
      <CardBody>
        <Textarea rows={7} value={t} onChange={e => setT(e.target.value)} placeholder="Pegá la planilla completa o un CSV…" className="font-mono text-[11.5px]" />
        {L.length > 0 && <div className="space-y-2 text-[13px]">
          <div className="flex flex-wrap gap-1.5">{byR.map(([r, n]) => <span key={r} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5", lvlX(r) ? "border-slate-200 dark:border-slate-700" : "border-amber-400 text-amber-600")}>{r} <b>{n}</b></span>)}</div>
          {raros.length > 0 && <p className="text-amber-600">Rangos que no conozco (quedan abajo de todo): {raros.join(", ")}. Decime cuáles son y los ubico.</p>}
          {sinU > 0 && <p className="text-slate-500">{sinU} sin usuario OOC: esos solo van a poder entrar con la placa o el nombre.</p>}
        </div>}
        <div className="flex justify-end"><Button icon={<Check />} disabled={!L.length} onClick={async () => { if (!(await confirm(`¿Reemplazar el roster ${DEL[d]} por estos ${L.length}?`))) return; LS.setJSON(key, L); setT(""); toast(`Roster actualizado · ${L.length} integrantes`); }}>Reemplazar roster ({L.length})</Button></div>
      </CardBody>
    </Card>);
}
/* secciones que todavía no están */
const ICO: Record<string, ReactNode> = { leg: <Scale />, sup: <ClipboardList />, cap: <Briefcase />, jef: <Star />, det: <Search />, ros: <Users />, div: <Landmark /> };
export function LssdSoon({ k, t }: { k: string; t: string }) {
  return (
    <Card className="rise relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgb(245_158_11/.05)_22px_44px)]" />
      <div className="relative flex flex-col items-center px-6 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 ring-1 ring-inset ring-amber-500/30 [&>svg]:size-8">{ICO[k] || <Construction />}</span>
        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300"><Construction className="size-3.5" />En construcción</p>
        <h2 className="mt-3 font-display text-3xl font-bold">{t}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">Esta sección {DEL[DEPT.id]} se está armando. Se habilita cuando esté lista.</p>
      </div>
    </Card>);
}
