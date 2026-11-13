/* Examen escrito en línea de la METRO.
   - La coordinación lo activa o desactiva, fija la duración, la hora programada, la convocatoria y los anotados a mano.
   - Lo rinden los postulantes de esa convocatoria y los anotados; la coordinación puede hacer pruebas y borrarlas.
   - El banco (con la opción correcta) queda en la base: al navegador solo le llegan las preguntas del intento en curso,
     con las opciones mezcladas y sin marcar cuál es la buena. Se corrige acá al entregar; el postulante no ve la nota.
   - 3 strikes (salir de la pestaña, capturas, herramientas del navegador…) desaprueban el examen. */
import crypto from "node:crypto";
import { q, tx } from "../lib/db.js";
import { send, body, wrap, requireUser, query, clientIp } from "../lib/core.js";
import { isCo } from "../lib/divs.js";
import { audit } from "../lib/audit.js";
import { MDQ } from "../lib/mdexam.js";

const CFG0 = { on: false, dur: 30, at: "", conv: "C1", extra: [], min: 7 };
const GRACE = 45e3, MAXS = 3;
const getMeta = async (c, k, d) => { try { const v = (await c.query("select v from meta where k=$1", [k])).rows[0]?.v; return v ? JSON.parse(v) : d; } catch { return d; } };
const setMeta = (c, k, v) => c.query("insert into meta(k,v) values($1,$2) on conflict(k) do update set v=excluded.v", [k, JSON.stringify(v)]);
const bankOf = async c => { const b = await getMeta(c, "mdexam.bank", null); return Array.isArray(b) && b.length ? b : MDQ.map((x, i) => ({ id: "q" + i, c: x.c, q: x.q, o: x.o, ok: 0 })); };
const shuf = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function enrolled(c, cfg) {
  let post = [];
  try { const L = JSON.parse((await c.query("select v from kv where k='lspdt.mdx.conv'")).rows[0]?.v || "[]"); post = (L.find(x => x.id === cfg.conv) || {}).post || []; } catch { /* */ }
  return { auto: post, all: [...new Set([...post, ...(cfg.extra || [])])] };
}
/* "Listo" = activado y, si tiene hora, ya llegó */
const ready = cfg => cfg.on && (!cfg.at || Date.now() >= +new Date(cfg.at) - 0);

function grade(a, bank, fin) {
  let ok = 0;
  const det = a.ord.map(([id, o], i) => { const Q = bank.find(x => x.id === id), ch = a.ans[i]; const good = Q && ch != null && o[ch] === Q.ok; if (good) ok++;
    return { id, q: Q ? Q.q : "(pregunta borrada)", ch: ch != null && Q ? Q.o[o[ch]] : null, okT: Q ? Q.o[Q.ok] : "", good }; });
  const tot = a.ord.length, nota = tot ? Math.round(ok / tot * 100) / 10 : 0;
  return { ...a, st: "done", t1: Date.now(), fin, ok, tot, nota: fin === "strikes" ? 0 : nota, det };
}
/* cierra los intentos vencidos */
function expire(att, bank) { let ch = false; for (const n in att) { const a = att[n]; if (a.st === "run" && Date.now() > a.end + GRACE) { att[n] = grade(a, bank, "tiempo"); ch = true; } } return ch; }

export default wrap(async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  const co = isCo("md", u), ip = clientIp(req);

  if (req.method === "GET") {
    const out = await tx(async c => {
      await c.query("select pg_advisory_xact_lock(hashtext('mdexam'))");
      const cfg = { ...CFG0, ...(await getMeta(c, "mdexam.cfg", {})) }, att = await getMeta(c, "mdexam.att", {}), bank = await bankOf(c);
      if (expire(att, bank)) await setMeta(c, "mdexam.att", att);
      const en = await enrolled(c, cfg), mine = att[u.n], can = en.all.includes(u.n) || co;
      const me = { can, co, att: mine ? { st: mine.st, t0: mine.t0, end: mine.end, strikes: (mine.strikes || []).length, fin: mine.fin || "", test: !!mine.test } : null };
      if (mine && mine.st === "run") me.qs = mine.ord.map(([id, o]) => { const Q = bank.find(x => x.id === id) || { c: "", q: "", o: [] }; return { c: Q.c, q: Q.q, o: o.map(j => Q.o[j]) }; }), me.ans = mine.ans;
      const r = { cfg: { on: cfg.on, dur: cfg.dur, at: cfg.at, conv: cfg.conv }, ready: ready(cfg), n: bank.length, en: en.all, now: Date.now(), me };
      if (co && query(req).full) Object.assign(r, { cfg: cfg, auto: en.auto, att: Object.values(att).map(a => ({ ...a, ord: undefined, ans: undefined })), bank });
      return r;
    });
    return send(res, 200, out);
  }
  if (req.method !== "POST") return send(res, 405, {});
  const b = await body(req), a = b.a;

  const r = await tx(async c => {
    await c.query("select pg_advisory_xact_lock(hashtext('mdexam'))");
    const cfg = { ...CFG0, ...(await getMeta(c, "mdexam.cfg", {})) }, att = await getMeta(c, "mdexam.att", {}), bank = await bankOf(c);
    expire(att, bank);
    const save = () => setMeta(c, "mdexam.att", att), err = (s, msg) => ({ __s: s, msg });

    if (a === "cfg" || a === "bank" || a === "reset") {
      if (!co) return err(403, "Solo la coordinación de la METRO");
      if (a === "cfg") {
        const p = b.cfg || {}, nx = { ...cfg };
        if (typeof p.on === "boolean") nx.on = p.on;
        if (p.dur != null) nx.dur = Math.max(5, Math.min(180, Math.round(+p.dur) || 30));
        if (p.min != null) nx.min = Math.max(0, Math.min(10, +p.min || 0));
        if (typeof p.at === "string") nx.at = /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(p.at) ? p.at : "";
        if (typeof p.conv === "string") nx.conv = p.conv.slice(0, 20);
        if (Array.isArray(p.extra)) nx.extra = [...new Set(p.extra.filter(x => typeof x === "string").map(x => x.slice(0, 60)))].slice(0, 200);
        await setMeta(c, "mdexam.cfg", nx);
        const what = [p.on != null && (p.on ? "lo activó" : "lo desactivó"), p.dur != null && `duración ${nx.dur} min`, p.at != null && `programado ${nx.at || "sin hora"}`, p.conv != null && `convocatoria ${nx.conv}`, p.extra && `${nx.extra.length} anotados a mano`, p.min != null && `nota mínima ${nx.min}`].filter(Boolean).join(" · ");
        await audit(u.n, "configuró", "mdexam", what, ip);
        return { cfg: nx };
      }
      if (a === "bank") {
        const L = Array.isArray(b.bank) ? b.bank : [];
        const ok = L.length >= 1 && L.length <= 60 && L.every(x => x && typeof x.q === "string" && x.q.trim() && Array.isArray(x.o) && x.o.length === 3 && x.o.every(o => typeof o === "string" && o.trim()) && [0, 1, 2].includes(x.ok));
        if (!ok) return err(400, "Cada pregunta necesita el texto, 3 opciones y la correcta marcada");
        const nb = L.map((x, i) => ({ id: typeof x.id === "string" && x.id ? x.id.slice(0, 20) : "q" + Date.now().toString(36) + i, c: String(x.c || "").slice(0, 60), q: x.q.trim().slice(0, 500), o: x.o.map(o => o.trim().slice(0, 400)), ok: x.ok }));
        await setMeta(c, "mdexam.bank", nb); await audit(u.n, "editó el banco de", "mdexam", `${nb.length} preguntas`, ip);
        return { bank: nb };
      }
      /* borrar intentos: uno (b.n) o todas las pruebas de la coordinación (b.tests) */
      const gone = b.tests ? Object.keys(att).filter(n => att[n].test) : [String(b.n || "")].filter(n => att[n]);
      for (const n of gone) delete att[n];
      await save(); await audit(u.n, "borró intentos de", "mdexam", gone.join(", "), ip);
      return { ok: gone.length };
    }

    const en = await enrolled(c, cfg), mine = att[u.n];
    if (a === "start") {
      if (mine && mine.st === "done") return err(409, "Ya rendiste este examen.");
      if (mine && mine.st === "run") return { ok: 1 };
      if (!co && !en.all.includes(u.n)) return err(403, "No estás anotado en este examen.");
      if (!co && !ready(cfg)) return err(423, cfg.on ? "El examen todavía no empezó." : "El examen no está disponible.");
      const order = shuf(bank.length).map(i => [bank[i].id, shuf(3)]), t0 = Date.now();
      att[u.n] = { n: u.n, t0, end: t0 + cfg.dur * 60e3, ord: order, ans: order.map(() => null), strikes: [], st: "run", test: co && !en.all.includes(u.n) ? true : !!(co && !ready(cfg)), ip };
      await save(); await audit(u.n, "empezó", "mdexam", att[u.n].test ? "Prueba de la coordinación" : "", ip);
      return { ok: 1 };
    }
    if (!mine || mine.st !== "run") return err(409, mine ? "El examen ya terminó." : "No empezaste el examen.");
    if (a === "save") {
      const i = +b.i, v = b.v === null ? null : +b.v;
      if (!(i >= 0 && i < mine.ans.length) || !(v === null || [0, 1, 2].includes(v))) return err(400, "Respuesta no válida");
      mine.ans[i] = v; await save(); return { ok: 1 };
    }
    if (a === "strike") {
      const why = String(b.why || "Acción no permitida").slice(0, 80);
      mine.strikes = [...(mine.strikes || []), { t: Date.now(), why }];
      await audit(u.n, "strike en", "mdexam", `${mine.strikes.length}/${MAXS} · ${why}`, ip);
      if (mine.strikes.length >= MAXS) { att[u.n] = grade(mine, bank, "strikes"); await save(); return { strikes: MAXS, done: 1 }; }
      await save(); return { strikes: mine.strikes.length };
    }
    if (a === "end") {
      att[u.n] = grade(mine, bank, "entregado"); await save();
      await audit(u.n, "entregó", "mdexam", "", ip);
      return { done: 1 };
    }
    return err(400, "Acción desconocida");
  });
  return send(res, r.__s || 200, r);
});
