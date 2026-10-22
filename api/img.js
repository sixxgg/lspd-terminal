import { q } from "../lib/db.js";
import { query, wrap, current, PUBLIC_KEYS } from "../lib/core.js";

export default wrap(async (req, res) => {
  const { k } = query(req);
  const fail = (c) => { res.statusCode = c; res.setHeader("Cache-Control", "no-store"); res.end(); };
  if (typeof k !== "string" || !k.startsWith("lspdt.")) return fail(400);
  const pub = PUBLIC_KEYS.includes(k);
  if (!pub && !(await current(req))) return fail(401);
  const r = (await q("select v from kv where k=$1", [k])).rows[0];
  const v = r && r.v;
  const m = v && /^data:([\w/+.-]+)(;[^,]*)?,(.*)$/s.exec(v);
  if (!m) return fail(404);
  const isB64 = /;base64/.test(m[2] || "");
  const buf = isB64 ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
  res.statusCode = 200;
  res.setHeader("Content-Type", m[1]);
  res.setHeader("Cache-Control", pub ? "public, max-age=31536000, immutable" : "private, max-age=31536000, immutable");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(buf);
});
