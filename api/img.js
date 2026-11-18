import { q } from "../lib/db.js";
import { query, wrap, current, PUBLIC_KEYS, SIX_KEY, isSix, canRead } from "../lib/core.js";
import { cleanSecs, guestKey } from "../lib/guest.js";

export default wrap(async (req, res) => {
  const { k, g } = query(req);
  const fail = (c) => { res.statusCode = c; res.setHeader("Cache-Control", "no-store"); res.end(); };
  if (typeof k !== "string" || !k.startsWith("lspdt.")) return fail(400);
  const pub = PUBLIC_KEYS.includes(k);
  const who = pub ? null : await current(req);
  /* invitado (link de six): solo las imágenes de las secciones que se le abrieron */
  let guest = false;
  if (!pub && !who && typeof g === "string" && /^[a-f0-9]{32}$/.test(g)) { let s = null; try { s = JSON.parse((await q("select v from meta where k=$1", ["share:" + g])).rows[0]?.v || "null"); } catch { /* */ }
    guest = !!s && s.kind === "guest" && s.exp > Date.now() && guestKey(k, cleanSecs(s.secs)); }
  if (!pub && !who && !guest) return fail(401);
  if (SIX_KEY.test(k) && !isSix(who)) return fail(404);
  if (who && !canRead(k, who)) return fail(404); /* imágenes de otro departamento o de una división ajena */
  const r = (await q("select v from kv where k=$1", [k])).rows[0];
  const v = r && r.v;
  const m = v && /^data:([\w/+.-]+)(;[^,]*)?,(.*)$/s.exec(v);
  if (!m) return fail(404);
  const isB64 = /;base64/.test(m[2] || "");
  const buf = isB64 ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
  res.statusCode = 200;
  res.setHeader("Content-Type", /^image\/[\w+.-]+$/.test(m[1]) ? m[1] : "application/octet-stream"); // solo imágenes: nada que el navegador pueda ejecutar
  res.setHeader("Cache-Control", pub ? "public, max-age=31536000, s-maxage=31536000, immutable" : "private, max-age=31536000, immutable");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(buf);
});
