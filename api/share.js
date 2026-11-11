/* Enlace temporal de solo lectura para una pizarra: el que tiene sesión lo crea (POST) o lo revoca (POST {del}); cualquiera con el enlace lo ve (GET ?t=), sin iniciar sesión, hasta que vence. */
import { randomBytes } from "node:crypto";
import { q } from "../lib/db.js";
import { send, body, query, wrap, requireUser } from "../lib/core.js";
import { liveOf } from "./live.js";

const BOARD = /^lspdt\.board\.[a-z0-9]+\.[a-z0-9]+$/, TOK = /^[a-f0-9]{32}$/;
const read = async t => { const r = (await q("select v from meta where k=$1", ["share:" + t])).rows[0]; try { return r ? JSON.parse(r.v) : null; } catch { return null; } };

export default wrap(async (req, res) => {
  if (req.method === "GET") {
    const qs = query(req), t = String(qs.t || "");
    if (!TOK.test(t)) return send(res, 404, { msg: "Enlace inválido" });
    const s = await read(t);
    if (!s || s.exp < Date.now()) { if (s) await q("delete from meta where k=$1", ["share:" + t]); return send(res, 410, { msg: "El enlace venció o fue revocado" }); }
    const r = (await q("select v, t from kv where k=$1", [s.k])).rows[0], kt = r ? +r.t : 0;
    res.setHeader("Cache-Control", "no-store");
    const L = qs.live ? (await liveOf(s.k)).o : undefined;
    if (Number(qs.since) >= kt) return send(res, 200, { same: true, exp: s.exp, live: L, now: Date.now() });
    return send(res, 200, { v: r ? r.v : null, t: kt, title: s.title || "Pizarra", by: s.by, exp: s.exp, live: L, now: Date.now() });
  }
  const u = await requireUser(req, res); if (!u) return;
  const b = await body(req);
  if (b.del) { if (!TOK.test(String(b.del))) return send(res, 400, { msg: "Enlace inválido" }); const s = await read(b.del);
    if (s && s.by !== u.n && !u.admin) return send(res, 403, { msg: "Solo quien lo creó puede revocarlo" });
    await q("delete from meta where k=$1", ["share:" + b.del]); return send(res, 200, { ok: true }); }
  if (typeof b.k !== "string" || !BOARD.test(b.k)) return send(res, 400, { msg: "Pizarra inválida" });
  const h = Math.min(72, Math.max(1, Number(b.h) || 24)), t = randomBytes(16).toString("hex"), exp = Date.now() + h * 3600e3;
  await q("insert into meta(k,v) values($1,$2)", ["share:" + t, JSON.stringify({ k: b.k, exp, by: u.n, title: String(b.title || "Pizarra").slice(0, 80) })]);
  return send(res, 200, { t, exp });
});
