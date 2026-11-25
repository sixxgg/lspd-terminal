/* Traslados y expulsiones: quien deja un departamento sale también de los rosters de sus divisiones (METRO, SWAT, ASD, K-9, PSB,
   divisiones genéricas…), de los callsigns y de las reservas de la METRO. Se usa al trasladar/expulsar y, una vez, para los que ya se
   habían ido antes de que existiera esto (por ejemplo, quien pasó al LSSD y seguía figurando en la METRO). */
import { ASD_DEF, K9_DEF, MD_DEF, PSB_ROSTER_DEF, parseRoster } from "./core.js";
import { deptList } from "./lssd.js";

const nrm = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
/* divisiones genéricas del LSSD (sus ids, como en app/src/lib/units.ts): se guardan sin prefijo de departamento */
const LSSD_G = new Set(["sseb", "sswt", "ssnp", "sexp", "shaz", "ssub", "sab", "sk9", "scnu", "sdd", "shb", "smcb", "snb", "ssvb", "sfcc", "sget", "sossd", "sgsu", "stb", "ssib", "shsiu", "ssrd"]);
const DIV_RX = /^lspdt\.(?:(lssd|sahp)\.)?(mdRoster|asdRoster|k9Roster|psbRoster|mdCalls|mdx\.csRes|mdx\.csTag|groster\.([a-z0-9_-]+)|gcall\.([a-z0-9_-]+))$/;
/* a qué departamento pertenece una clave de división */
export function divDept(k) {
  const m = DIV_RX.exec(k); if (!m) return null;
  if (m[1]) return m[1];
  const id = m[3] || m[4]; return id && LSSD_G.has(id) ? "lssd" : "lspd";
}
/* nombres (normalizados) de la plantilla actual de cada departamento */
export async function members(c) {
  const R = Object.fromEntries((await c.query("select k, v from kv where k in ('lspdt.roster','lspdt.lssd.roster','lspdt.sahp.roster','lspdt.lssd.agx','lspdt.sahp.agx')")).rows.map(r => [r.k, r.v]));
  const out = { lspd: new Set(parseRoster(R["lspdt.roster"]).list.map(a => nrm(a.n))) };
  for (const d of ["lssd", "sahp"]) out[d] = new Set(deptList(R[`lspdt.${d}.roster`], d, R[`lspdt.${d}.agx`] || null).filter(a => !/^(Expulsado|Trasladado)/i.test(String(a.e || ""))).map(a => nrm(a.n)));
  return out;
}
/* rosters del LSPD con valores de fábrica en el código (y su versión de siembra, como en app/src/lib/units.ts): si no están guardados o
   su versión es vieja, la terminal los completa con estos, así que hay que guardarlos ya completos y sin el agente para que no reaparezca */
const SEEDS = { "lspdt.asdRoster": [ASD_DEF, 0], "lspdt.k9Roster": [K9_DEF, 2], "lspdt.psbRoster": [PSB_ROSTER_DEF, 1], "lspdt.mdRoster": [MD_DEF, 2] };
const seeded = (k, o) => { const S = SEEDS[k]; if (!S) return o; const [def, sv] = S;
  if (!o) return sv ? { ...def, _v: sv } : { ...def };
  return sv && (Number(o._v) || 0) < sv ? { ...o, ...def, _v: sv } : o; };
/* saca de las divisiones del departamento `from` a los nombres dados que ya no están en su plantilla. put(c, k, v) guarda con historial */
export async function purgeDivs(c, put, gone) {
  const M = await members(c), byD = { lspd: new Set(), lssd: new Set(), sahp: new Set() };
  for (const [d, n] of gone) if (byD[d] && n && !M[d].has(nrm(n))) byD[d].add(nrm(n));
  if (!byD.lspd.size && !byD.lssd.size && !byD.sahp.size) return [];
  const rows = (await c.query("select k, v from kv where k ~ '^lspdt\\.((lssd|sahp)\\.)?(mdRoster|asdRoster|k9Roster|psbRoster|mdCalls|mdx\\.csRes|mdx\\.csTag|groster\\.|gcall\\.)'")).rows, done = [];
  for (const k of Object.keys(SEEDS)) if (!rows.some(r => r.k === k)) rows.push({ k, v: null });
  for (const { k, v } of rows) {
    const d = divDept(k); if (!d || !byD[d].size) continue;
    let o; try { o = seeded(k, JSON.parse(v || "null")); } catch { continue; }
    if (!o || typeof o !== "object" || Array.isArray(o)) continue;
    const del = Object.keys(o).filter(n => n !== "_v" && byD[d].has(nrm(n))); if (!del.length) continue;
    for (const n of del) delete o[n];
    await put(c, k, JSON.stringify(o)); done.push(...del.map(n => `${n} (${k})`));
  }
  return done;
}
/* una sola vez: los que ya se habían ido (bajas registradas y quienes figuran en la plantilla de otro departamento) */
export async function purgeAll(c, put) {
  const M = await members(c), gone = [];
  let B = []; try { B = JSON.parse((await c.query("select v from kv where k='lspdt.bajas'")).rows[0]?.v || "[]"); } catch { /* */ }
  const DK = { LSPD: "lspd", LSSD: "lssd", SAHP: "sahp" };
  for (const b of Array.isArray(B) ? B : []) if (b && DK[b.de]) gone.push([DK[b.de], b.n]);
  /* nombres de las divisiones de un departamento que están en la plantilla de otro (y no en la suya) */
  const rows = (await c.query("select k, v from kv where k ~ '^lspdt\\.((lssd|sahp)\\.)?(mdRoster|asdRoster|k9Roster|psbRoster|groster\\.)'")).rows;
  for (const k of Object.keys(SEEDS)) if (!rows.some(r => r.k === k)) rows.push({ k, v: null });
  for (const { k, v } of rows) { const d = divDept(k); let o; try { o = seeded(k, JSON.parse(v || "null")); } catch { continue; } if (!d || !o || typeof o !== "object" || Array.isArray(o)) continue;
    for (const n of Object.keys(o)) if (n !== "_v" && !M[d].has(nrm(n)) && Object.entries(M).some(([d2, S]) => d2 !== d && S.has(nrm(n)))) gone.push([d, n]); }
  return purgeDivs(c, put, gone);
}

/* altas por traslado hechas desde Traslados › Incorporar (agx add con src y tr): el agente deja su departamento de origen.
   LSPD: sale del roster. LSSD/SAHP: queda marcado «Trasladado al …». Devuelve quiénes salieron para registrarlos. */
const DK = { LSPD: "lspd", LSSD: "lssd", SAHP: "sahp" }, DN = { lspd: "LSPD", lssd: "LSSD", sahp: "SAHP" };
export async function settleXfers(c, put, by) {
  const R = Object.fromEntries((await c.query("select k, v from kv where k in ('lspdt.roster','lspdt.lssd.roster','lspdt.sahp.roster','lspdt.lssd.agx','lspdt.sahp.agx','lspdt.bajas')")).rows.map(r => [r.k, r.v]));
  const js = v => { try { const o = JSON.parse(v || "null"); return o && typeof o === "object" ? o : null; } catch { return null; } };
  const out = [], ts = Date.now(), A = { lssd: js(R["lspdt.lssd.agx"]) || {}, sahp: js(R["lspdt.sahp.agx"]) || {} };
  let lspd = parseRoster(R["lspdt.roster"]).list, lspdCh = false; const agxCh = {};
  for (const d2 of ["lssd", "sahp"]) for (const [n, x] of Object.entries(A[d2])) {
    const ad = x && x.add; if (!ad || !ad.tr || /retir|baja|inactiv|expuls|traslad/i.test(String(ad.e || ""))) continue;
    const d1 = DK[String(ad.src || "").toUpperCase()]; if (!d1 || d1 === d2) continue;
    if (d1 === "lspd") { const i = lspd.findIndex(a => nrm(a.n) === nrm(n)); if (i < 0) continue;
      const a = lspd[i]; lspd = lspd.filter((_, j) => j !== i); lspdCh = true; out.push({ n: a.n, r: a.r || "", p: a.p || "", de: d1, a: d2 }); }
    else { const L = deptList(R[`lspdt.${d1}.roster`], d1, JSON.stringify(A[d1])), ag = L.find(a => nrm(a.n) === nrm(n) && !/^(Expulsado|Trasladado)/i.test(String(a.e || "")));
      if (!ag || ag.tr === ad.tr) continue; const k0 = ag.n0 || ag.n, e = A[d1][k0] || {};
      if (e.add) e.add = { ...e.add, e: `Trasladado al ${DN[d2]}` }; else { const row = deptList(R[`lspdt.${d1}.roster`], d1, null).find(a => a.n === k0); e.f = { ...(e.f || {}), e: [String(row?.e ?? ""), `Trasladado al ${DN[d2]}`] }; }
      e.log = [...(e.log || []), { t: ts, por: by, pr: "", c: [`Trasladado al ${DN[d2]}`] }].slice(-50); A[d1][k0] = e; agxCh[d1] = 1;
      out.push({ n: ag.n, r: ag.r || "", p: ag.p || "", de: d1, a: d2 }); }
  }
  if (!out.length) return [];
  if (lspdCh) await put(c, "lspdt.roster", JSON.stringify(lspd));
  for (const d of Object.keys(agxCh)) await put(c, `lspdt.${d}.agx`, JSON.stringify(A[d]));
  const B = js(R["lspdt.bajas"]);
  await put(c, "lspdt.bajas", JSON.stringify([...out.map(o => ({ t: ts, n: o.n, r: o.r, p: o.p, de: DN[o.de], tipo: "xfer", a: DN[o.a], motivo: "Incorporado por Traslados", por: by })), ...(Array.isArray(B) ? B : [])].slice(0, 500)));
  await purgeDivs(c, put, out.map(o => [o.de, o.n]));
  return out.map(o => ({ ...o, de: DN[o.de], a: DN[o.a] }));
}
