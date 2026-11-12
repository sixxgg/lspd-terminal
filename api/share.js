/* Enlace temporal de solo lectura para una pizarra o una sección de división (uniformidad): el que tiene sesión lo crea (POST) o lo revoca (POST {del}); cualquiera con el enlace lo ve (GET ?t=), sin iniciar sesión, hasta que vence. */
import { randomBytes } from "node:crypto";
import { q } from "../lib/db.js";
import { send, body, query, wrap, requireUser, canRead } from "../lib/core.js";
import { divWrite } from "../lib/divs.js";
import { liveOf } from "./live.js";

const BOARD = /^lspdt\.board\.[a-z0-9]+\.[a-z0-9]+$/, UNIF = /^lspdt\.unif\.[a-z0-9-]+$/, TOK = /^[a-f0-9]{32}$/;
const kindOf = k => (BOARD.test(k) ? "board" : UNIF.test(k) ? "unif" : "");
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
    /* cada apertura nueva del enlace suma una vista (los refrescos no) */
    if (!Number(qs.since)) { s.views = (s.views || 0) + 1; await q("update meta set v=$2 where k=$1", ["share:" + t, JSON.stringify(s)]); }
    if (Number(qs.since) >= kt) return send(res, 200, { same: true, exp: s.exp, live: L, now: Date.now() });
    /* uniformidad: emblema de la división y logo del departamento actuales (la vista pública no tiene sesión para pedirlos) */
    let img;
    if (s.kind === "unif" && !Number(qs.since)) { const R = (await q("select k, v from kv where k = any($1) and v is not null", [[`lspdt.divlogo.${s.div || ""}`, "lspdt.logo"]])).rows;
      img = { div: (R.find(x => x.k.startsWith("lspdt.divlogo.")) || {}).v || null, brand: (R.find(x => x.k === "lspdt.logo") || {}).v || null }; }
    return send(res, 200, { v: r ? r.v : null, t: kt, title: s.title || "Pizarra", kind: s.kind || "board", div: s.div, ab: s.ab, img, by: s.by, exp: s.exp, live: L, now: Date.now() });
  }
  const u = await requireUser(req, res); if (!u) return;
  const b = await body(req);
  if (b.del) { if (!TOK.test(String(b.del))) return send(res, 400, { msg: "Enlace inválido" }); const s = await read(b.del);
    if (s && s.by !== u.n && !u.admin) return send(res, 403, { msg: "Solo quien lo creó puede revocarlo" });
    await q("delete from meta where k=$1", ["share:" + b.del]); return send(res, 200, { ok: true }); }
  /* enlaces activos de una clave (para administrarlos) */
  if (b.list) { if (typeof b.list !== "string" || !kindOf(b.list)) return send(res, 400, { msg: "Sección inválida" });
    if (!canRead(b.list, u)) return send(res, 403, { msg: "Solo los miembros de la división" });
    const now = Date.now(), L = [];
    for (const r of (await q("select k, v from meta where k like 'share:%'")).rows) { try { const s = JSON.parse(r.v); if (s.k === b.list && s.exp > now) L.push({ t: r.k.slice(6), exp: s.exp, by: s.by, views: s.views || 0, title: s.title }); } catch { /* */ } }
    return send(res, 200, { list: L.sort((a, b) => a.exp - b.exp) }); }
  const kind = typeof b.k === "string" ? kindOf(b.k) : "";
  if (!kind) return send(res, 400, { msg: "Sección inválida" });
  if (!canRead(b.k, u) || (kind === "unif" && divWrite(b.k, u))) return send(res, 403, { msg: kind === "unif" ? "Solo la coordinación de la división crea links de la uniformidad" : "Solo los miembros de la división" });
  const h = Math.min(168, Math.max(1, Number(b.h) || 24)), t = randomBytes(16).toString("hex"), exp = Date.now() + h * 3600e3;
  await q("insert into meta(k,v) values($1,$2)", ["share:" + t, JSON.stringify({ k: b.k, kind, exp, by: u.n, views: 0, title: String(b.title || "Pizarra").slice(0, 80), div: typeof b.div === "string" ? b.div.slice(0, 80) : undefined, ab: typeof b.ab === "string" ? b.ab.slice(0, 20) : undefined })]);
  return send(res, 200, { t, exp });
});
