/* Cambio de nombre de un agente (casamiento, corrección, etc.) sin perder nada: el nombre nuevo reemplaza al viejo en todos los datos del
   departamento (roster, divisiones, callsigns, expedientes, informes, perfiles, condecoraciones…) y en los datos compartidos.
   - Solo se reemplaza el nombre como valor o clave JSON completo ("Madison Pierce"), nunca dentro de un texto libre: lo ya redactado
     (comunicados, informes viejos) queda como se escribió.
   - LSPD: la cuenta y sus sesiones abiertas pasan al nombre nuevo (la cuenta es el nombre).
   - LSSD/SAHP: la planilla no se toca; el nombre nuevo va como edición de la terminal (agx) y la cuenta sigue atada al nombre original
     de la planilla, así que sigue entrando igual.
   - Las claves propias del agente (perfil, notas, expediente…) se copian a la clave del nombre nuevo; la vieja queda en el historial. */
import { OWNERS, parseRoster } from "./core.js";
import { deptList } from "./lssd.js";

const nrm = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const slug = v => nrm(v).replace(/[^a-z0-9]/g, "");
const DPFX = { lspd: "", lssd: "lssd.", sahp: "sahp." };
/* departamento de una clave: «lspdt.lssd.x» → lssd, «lspdt.sahp.x» → sahp, compartidas (perfiles, notas, legal…) → *, el resto → lspd */
const SHARED = /^lspdt\.(ui|lib|six|anita|ilg|ilgAcc|penal|legacc|boards?|miro|robos|uprof|unote|ucom|uvis|ufolt?|uverif|xcal|decorx|clasic|satd)(\.|$)/;
const kDept = k => { const m = /^lspdt\.(lssd|sahp)\./.exec(k); return m ? m[1] : SHARED.test(k) ? "*" : "lspd"; };

/* nombres activos de un departamento */
async function listOf(c, d) {
  const R = Object.fromEntries((await c.query("select k, v from kv where k in ('lspdt.roster','lspdt.lssd.roster','lspdt.sahp.roster','lspdt.lssd.agx','lspdt.sahp.agx')")).rows.map(r => [r.k, r.v]));
  if (d === "lspd") return { list: parseRoster(R["lspdt.roster"]).list, R };
  return { list: deptList(R[`lspdt.${d}.roster`], d, R[`lspdt.${d}.agx`] || null), R };
}

export async function renameAgent(c, put, { d, old, neu, by }) {
  old = String(old || "").trim(); neu = String(neu || "").replace(/\s+/g, " ").trim();
  if (!old || !neu) return { err: "Faltan el nombre actual y el nuevo" };
  if (neu.length < 4 || neu.length > 60 || !/^[\p{L}][\p{L}\p{M} .'’-]+$/u.test(neu) || !/\s/.test(neu)) return { err: "Escribí nombre y apellido (solo letras)" };
  if (neu === old) return { err: "Es el mismo nombre" };
  if (OWNERS.includes(old)) return { err: "Es dueño de la terminal: su nombre está en la configuración del servidor (ADMINS en Vercel). Cambialo ahí primero." };
  const { list } = await listOf(c, d), ag = list.find(a => a.n === old) || list.find(a => nrm(a.n) === nrm(old));
  if (!ag) return { err: `${old} no está en el roster` };
  old = ag.n;
  /* que no choque con nadie de ningún departamento */
  for (const d2 of ["lspd", "lssd", "sahp"]) { const L = d2 === d ? list : (await listOf(c, d2)).list; if (L.some(a => a.n !== old && slug(a.n) === slug(neu))) return { err: `Ya hay un agente llamado ${neu} en el ${d2.toUpperCase()}` }; }
  if (d === "lspd" && slug(neu) !== slug(old) && (await c.query("select 1 from accounts where name=$1", [neu])).rowCount) return { err: `Ya existe una cuenta con el nombre ${neu}` };

  const changed = [], jOld = [JSON.stringify(old)], jNew = JSON.stringify(neu);
  /* JSON.stringify no escapa acentos, pero por las dudas también la forma é */
  const esc = JSON.stringify(old).replace(/[\u007f-￿]/g, ch => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0")); if (esc !== jOld[0]) jOld.push(esc);
  /* 1) el nombre como valor o clave JSON, en las claves del departamento y las compartidas (no la planilla ni las ediciones agx, que van aparte) */
  const skip = new Set(["lspdt.lssd.roster", "lspdt.sahp.roster", "lspdt.lssd.agx", "lspdt.sahp.agx"]);
  const rows = (await c.query("select k, v from kv where v not like 'data:%' and (" + jOld.map((_, i) => `position($${i + 1} in v) > 0`).join(" or ") + ")", jOld)).rows;
  for (const { k, v } of rows) {
    if (skip.has(k)) continue; const kd = kDept(k); if (kd !== "*" && kd !== d) continue;
    let nv = v; for (const j of jOld) nv = nv.split(j).join(jNew);
    if (nv !== v) { await put(c, k, nv); changed.push(k); }
  }
  /* el roster del LSPD todavía sin guardar (el de fábrica): se guarda ya con el nombre nuevo */
  if (d === "lspd" && !changed.includes("lspdt.roster")) { await put(c, "lspdt.roster", JSON.stringify(list.map(a => (a.n === old ? { ...a, n: neu } : a)))); changed.push("lspdt.roster"); }
  /* 2) LSSD/SAHP: edición de la terminal sobre la fila original (la cuenta sigue con el nombre de la planilla) */
  if (d !== "lspd") {
    const K = `lspdt.${d}.agx`, k0 = ag.n0 || ag.n; let O = {}; try { O = JSON.parse((await c.query("select v from kv where k=$1", [K])).rows[0]?.v || "{}") || {}; } catch { /* */ }
    const e = O[k0] || {}; e.f = { ...(e.f || {}), n: [k0, neu] }; if (neu === k0) delete e.f.n;
    e.log = [...(e.log || []), { t: Date.now(), por: by, pr: "", c: [`Nombre: ${old} → ${neu}`] }].slice(-50); O[k0] = e;
    await put(c, K, JSON.stringify(O)); changed.push(K);
  }
  /* 3) claves propias del agente (perfil, notas, expediente, feedback FTO…): copia a la del nombre nuevo si no existe */
  const so = slug(old), sn = slug(neu);
  if (so && sn && so !== sn) {
    const own = (await c.query("select k, v from kv where k ~ $1", [`\\.${so}(\\.fto)?$`])).rows;
    for (const { k, v } of own) { const kd = kDept(k); if (kd !== "*" && kd !== d) continue;
      const nk = k.replace(new RegExp(`\\.${so}((\\.fto)?)$`), `.${sn}$1`); if (nk === k) continue;
      if ((await c.query("select 1 from kv where k=$1", [nk])).rowCount) continue;
      let nv = v; for (const j of jOld) nv = nv.split(j).join(jNew);
      await put(c, nk, nv); changed.push(`${k} → ${nk}`); }
  }
  /* administradores, aprobados y Anita (tabla meta) */
  for (const mk of ["admins", "approved"]) { const v = (await c.query("select v from meta where k=$1", [mk])).rows[0]?.v; if (!v) continue;
    let nv = v; for (const j of jOld) nv = nv.split(j).join(jNew); if (nv !== v) { await c.query("update meta set v=$2 where k=$1", [mk, nv]); changed.push("meta:" + mk); } }
  if ((await c.query("select v from meta where k='anita'")).rows[0]?.v === old) { await c.query("update meta set v=$1 where k='anita'", [neu]); changed.push("meta:anita"); }
  /* 4) LSPD: la cuenta es el nombre */
  let acc = false;
  if (d === "lspd" && (await c.query("select 1 from accounts where name=$1", [old])).rowCount) {
    await c.query("update accounts set name=$2 where name=$1", [old, neu]);
    await c.query("update sessions set name=$2 where name=$1", [old, neu]); acc = true;
  }
  return { ok: 1, old, neu, changed, acc, r: ag.r || "", p: ag.p || "" };
}
