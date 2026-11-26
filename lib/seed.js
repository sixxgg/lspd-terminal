/* Cargas puntuales pedidas por six, una sola vez cada una (marca en meta). Si el dato ya estaba, no se pisa nada. */
import { PSB_ROSTER_DEF } from "./core.js";
import { SAHP_DEF } from "./lssd.js";

const nrm = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const js = v => { try { return JSON.parse(v || "null"); } catch { return null; } };

/* 26/11/2026: PSB interdepartamental (miembros del LSSD y la SAHP) + ascensos de la SAHP */
const PSB_X = ["Lauren Bennet", "Arthur Winters", "Samuel R. Callahan", "Ciaran Devlin", "Julian M. Kincaid"];
const SAHP_UP = { "Tyrone Harrison": { r: "Corporal", p: "546" }, "Carter Harrison": { r: "Corporal", p: "547" }, "Connor Hawkins": { r: "Corporal", p: "549" },
  "Adrian Howitz": { r: "Corporal", p: "542" }, "Matthew Hayes": { r: "Sergeant", p: "558" }, "Jason Jordan": { r: "Corporal", p: "543" } };

export async function seed1126(c, put, by) {
  const done = [], get = async k => (await c.query("select v from kv where k=$1", [k])).rows[0]?.v ?? null;
  /* PSB: los suma como Investigator (six o el Commanding Officer después le cambian el rol) */
  const P0 = js(await get("lspdt.psbRoster")), P = P0 && typeof P0 === "object" && !Array.isArray(P0) ? ((P0._v || 0) < 1 ? { ...P0, ...PSB_ROSTER_DEF, _v: 1 } : P0) : { ...PSB_ROSTER_DEF, _v: 1 };
  let ch = false; for (const n of PSB_X) if (!Object.keys(P).some(x => nrm(x) === nrm(n))) { P[n] = ["inv"]; ch = true; done.push(`PSB: ${n}`); }
  if (ch) await put(c, "lspdt.psbRoster", JSON.stringify(P));
  /* SAHP: si ya hay planilla cargada, los ascensos van como ediciones de la terminal (si no, rige el roster de fábrica, que ya los tiene) */
  const S = js(await get("lspdt.sahp.roster"));
  if (Array.isArray(S) && S.length) {
    const O = js(await get("lspdt.sahp.agx")) || {}, ts = Date.now();
    for (const [n, up] of Object.entries(SAHP_UP)) {
      const row = S.find(a => nrm(a.n) === nrm(n));
      if (!row) { if (!O[n]) { const d = SAHP_DEF.find(a => a.n === n); O[n] = { add: { ...(d || { n, u: "", e: "Activo" }), ...up }, log: [{ t: ts, por: by, pr: "", c: ["Alta"] }] }; done.push(`SAHP alta: ${n}`); } continue; }
      const e = O[row.n] || {}, f = { ...(e.f || {}) }; let any = false;
      for (const k of ["r", "p"]) if (String(row[k] ?? "") !== up[k]) { f[k] = [String(row[k] ?? ""), up[k]]; any = true; }
      if (any) { O[row.n] = { ...e, f, log: [...(e.log || []), { t: ts, por: by, pr: "", c: [`${up.r} · #${up.p}`] }].slice(-50) }; done.push(`SAHP: ${row.n} → ${up.r} #${up.p}`); }
    }
    await put(c, "lspdt.sahp.agx", JSON.stringify(O));
  }
  return done;
}
