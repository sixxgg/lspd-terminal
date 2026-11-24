/* Enlace temporal de solo lectura para una pizarra o una sección de división (uniformidad): el que tiene sesión lo crea (POST) o lo revoca (POST {del}); cualquiera con el enlace lo ve (GET ?t=), sin iniciar sesión, hasta que vence. */
import { randomBytes } from "node:crypto";
import { q } from "../lib/db.js";
import { send, body, query, wrap, requireUser, canRead, loadBoards, isSix, defRoster } from "../lib/core.js";
import { SEL, imgUrl } from "../lib/store.js";
import { cleanSecs, guestKey } from "../lib/guest.js";
import { audit } from "../lib/audit.js";
import { divWrite } from "../lib/divs.js";
import { liveOf } from "./live.js";

/* robos: la sección Robos de six (catálogo y artículos), con su tema; la clave es su configuración */
const ROBOS = "lspdt.six.cfg", GUEST = "lspdt.guest"; /* guest: invitación de six a la terminal (secciones elegidas, solo lectura) */
const BOARD = /^lspdt\.board\.[a-z0-9]+\.[a-z0-9]+$/, UNIF = /^lspdt\.unif\.[a-z0-9-]+$/, TOK = /^[a-f0-9]{32}$/;
const kindOf = k => (BOARD.test(k) ? "board" : UNIF.test(k) ? "unif" : k === ROBOS ? "robos" : k === GUEST ? "guest" : "");
const read = async t => { const r = (await q("select v from meta where k=$1", ["share:" + t])).rows[0]; try { return r ? JSON.parse(r.v) : null; } catch { return null; } };

export default wrap(async (req, res) => {
  if (req.method === "GET") {
    const qs = query(req), t = String(qs.t || "");
    if (!TOK.test(t)) return send(res, 404, { msg: "Enlace inválido" });
    const s = await read(t);
    if (!s || s.exp < Date.now()) { if (s) await q("delete from meta where k=$1", ["share:" + t]); return send(res, 410, { msg: "El enlace venció o fue revocado" }); }
    res.setHeader("Cache-Control", "no-store");
    /* invitado: los datos de las secciones elegidas, como una sesión de solo lectura */
    if (s.kind === "guest") {
      const secs = cleanSecs(s.secs), store = {}, kt = {}; let t = 0;
      /* primero solo claves y fechas (sin los valores): los valores de lo que el invitado no puede ver nunca salen de la base, que es lo que gasta la transferencia */
      const idx = (await q("select k, t, v like 'data:%' as img from kv where v is not null")).rows, ok = [];
      for (const r of idx) { t = Math.max(t, +r.t); if (!guestKey(r.k, secs)) continue; kt[r.k] = +r.t; if (r.img) store[r.k] = imgUrl(r.k, r.t) + "&g=" + qs.t; else ok.push(r.k); }
      if (!Number(qs.since) || Number(qs.since) < t) for (const r of (await q("select k, v from kv where k = any($1)", [ok])).rows) store[r.k] = r.v;
      if (!Number(qs.since)) { s.views = (s.views || 0) + 1; s.last = Date.now(); await q("update meta set v=$2 where k=$1", ["share:" + qs.t, JSON.stringify(s)]);
        await audit(s.title || "Invitado", "entró como invitado a", "la terminal", `Link de ${s.by}`, String(req.headers["x-forwarded-for"] || "").split(",")[0]); }
      return send(res, 200, { guest: true, secs, title: s.title || "Invitado", by: s.by, exp: s.exp, store, kt, t, defRoster: defRoster(), now: Date.now() });
    }
    const r = (await q("select v, t from kv where k=$1", [s.k])).rows[0], kt = r ? +r.t : 0;
    const L = qs.live ? (await liveOf(s.k)).o : undefined;
    /* cada apertura nueva del enlace suma una vista (los refrescos no) */
    if (!Number(qs.since)) { s.views = (s.views || 0) + 1; s.last = Date.now(); await q("update meta set v=$2 where k=$1", ["share:" + t, JSON.stringify(s)]);
      if (s.kind === "robos") await audit(s.title || "Invitado", "abrió la vista compartida de", "robos", `Link de ${s.by}`, String(req.headers["x-forwarded-for"] || "").split(",")[0]); }
    if (Number(qs.since) >= kt) return send(res, 200, { same: true, exp: s.exp, live: L, now: Date.now() });
    /* uniformidad: emblema de la división y logo del departamento actuales (la vista pública no tiene sesión para pedirlos) */
    let img;
    if (s.kind === "unif" && !Number(qs.since)) { const R = (await q("select k, v from kv where k = any($1) and v is not null", [[`lspdt.divlogo.${s.div || ""}`, "lspdt.logo"]])).rows;
      img = { div: (R.find(x => x.k.startsWith("lspdt.divlogo.")) || {}).v || null, brand: (R.find(x => x.k === "lspdt.logo") || {}).v || null }; }
    return send(res, 200, { v: r ? r.v : null, t: kt, title: s.title || "Pizarra", kind: s.kind || "board", div: s.div, ab: s.ab, img, by: s.by, exp: s.exp, live: L, now: Date.now() });
  }
  const u = await requireUser(req, res); if (!u) return;
  await loadBoards();
  const b = await body(req);
  if (b.del) { if (!TOK.test(String(b.del))) return send(res, 400, { msg: "Enlace inválido" }); const s = await read(b.del);
    if (s && s.by !== u.n && !u.admin) return send(res, 403, { msg: "Solo quien lo creó puede revocarlo" });
    await q("delete from meta where k=$1", ["share:" + b.del]); return send(res, 200, { ok: true }); }
  /* enlaces activos de una clave (para administrarlos) */
  if (b.list) { if (typeof b.list !== "string" || !kindOf(b.list)) return send(res, 400, { msg: "Sección inválida" });
    if (kindOf(b.list) === "guest" ? !isSix(u) : !canRead(b.list, u)) return send(res, 403, { msg: "Solo los miembros de la división" });
    const now = Date.now(), L = [];
    for (const r of (await q("select k, v from meta where k like 'share:%'")).rows) { try { const s = JSON.parse(r.v); if (s.k === b.list && s.exp > now) L.push({ t: r.k.slice(6), exp: s.exp, by: s.by, views: s.views || 0, title: s.title, last: s.last || 0, at: s.at || 0, secs: s.secs }); } catch { /* */ } }
    return send(res, 200, { list: L.sort((a, b) => a.exp - b.exp) }); }
  /* limpieza de enlaces vencidos (antes solo se borraban si alguien los abría después de vencer) */
  if (Math.random() < 0.05) await q("delete from meta where k like 'share:%' and v ~ '^\\{' and (case when v ~ '\"exp\":[0-9]+' then substring(v from '\"exp\":([0-9]+)')::bigint else 9999999999999 end) < $1", [Date.now()]).catch(() => {});
  const kind = typeof b.k === "string" ? kindOf(b.k) : "";
  if (!kind) return send(res, 400, { msg: "Sección inválida" });
  if (kind === "robos" || kind === "guest" ? !isSix(u) : !canRead(b.k, u) || (kind === "unif" && divWrite(b.k, u))) return send(res, 403, { msg: kind === "robos" || kind === "guest" ? "Solo six" : kind === "unif" ? "Solo la coordinación de la división crea links de la uniformidad" : "Solo los miembros de la división" });
  const h = Math.min(kind === "robos" || kind === "guest" ? 720 : 168, Math.max(1, Number(b.h) || 24)), t = randomBytes(16).toString("hex"), exp = Date.now() + h * 3600e3;
  await q("insert into meta(k,v) values($1,$2)", ["share:" + t, JSON.stringify({ k: b.k, kind, exp, by: u.n, views: 0, at: Date.now(), title: String(b.title || "Pizarra").slice(0, 80), div: typeof b.div === "string" ? b.div.slice(0, 80) : undefined, ab: typeof b.ab === "string" ? b.ab.slice(0, 20) : undefined, secs: kind === "guest" ? cleanSecs(b.secs) : undefined })]);
  if (kind === "robos") await audit(u.n, "invitó a ver", "robos", `${String(b.title || "")} · ${h} h`);
  if (kind === "guest") await audit(u.n, "invitó a la terminal a", String(b.title || "Invitado"), `${cleanSecs(b.secs).join(", ")} · ${h} h`);
  return send(res, 200, { t, exp });
});
