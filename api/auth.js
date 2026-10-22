import { q } from "../lib/db.js";
import { send, body, wrap, roster, findIn, lvl, MIN_ACC, CAP, norm, emailOf, hashPw, checkPw, newSession, endSession, current, PUBLIC_KEYS } from "../lib/core.js";

const slim = list => list.map(a => ({ n: a.n, r: a.r, p: a.p }));
async function regCode() { const r = await q("select v from meta where k='regcode'"); return (r.rows[0] && r.rows[0].v) || ""; }
const tooShort = pw => typeof pw !== "string" || pw.length < 6 || pw.length > 200;

export default wrap(async (req, res) => {
  if (req.method === "GET") {
    const me = await current(req), R = await roster();
    const names = (await q("select name from accounts")).rows.map(r => r.name);
    const brand = {};
    for (const r of (await q("select k, t, v like 'data:%' as img, case when v like 'data:%' then null else v end as v from kv where k = any($1) and v is not null", [PUBLIC_KEYS])).rows)
      brand[r.k] = r.img ? `/api/img?k=${encodeURIComponent(r.k)}&t=${r.t}` : r.v;
    return send(res, 200, {
      me: me ? me.n : null, names, roster: slim(R.list), needCode: !!(await regCode()), brand
    });
  }
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  const b = await body(req), a = b.a;

  if (a === "login") {
    const u = norm(String(b.u || "").trim());
    if (!u || !b.pw) return send(res, 400, { msg: "Completá el correo y la contraseña." });
    const rows = (await q("select name,email,hash from accounts")).rows;
    const acc = rows.find(x => norm(x.email) === u || norm(x.name) === u || norm(x.email.split("@")[0]) === u);
    if (!acc) return send(res, 404, { msg: "No hay una cuenta con ese correo. Registrate primero." });
    if (!checkPw(b.pw, acc.hash)) { await new Promise(r => setTimeout(r, 600)); return send(res, 403, { msg: "Contraseña incorrecta." }); }
    const ag = findIn((await roster()).list, acc.name);
    if (!ag) return send(res, 403, { msg: "Tu agente ya no figura en el roster." });
    if (lvl(ag.r) < MIN_ACC) return send(res, 403, { msg: "La terminal es para personal de mando (Sargento I o superior)." });
    await q("update accounts set last=$2 where name=$1", [acc.name, Date.now()]);
    await newSession(res, acc.name, !!b.keep);
    return send(res, 200, { n: acc.name, e: acc.email });
  }

  if (a === "register") {
    const ag = findIn((await roster()).list, b.n);
    if (!ag) return send(res, 400, { msg: "Escribí el nombre de tu personaje y elegilo de la lista." });
    if (lvl(ag.r) < MIN_ACC) return send(res, 403, { msg: "Solo el personal de mando (Sargento I o superior) puede registrarse." });
    const code = await regCode();
    if (code && String(b.code || "").trim() !== code) return send(res, 403, { msg: "El código de registro no es correcto. Pedíselo a Capitanía." });
    if (tooShort(b.pw)) return send(res, 400, { msg: "La contraseña tiene que tener al menos 6 caracteres." });
    const now = Date.now();
    const r = await q("insert into accounts(name,email,hash,created,last) values($1,$2,$3,$4,$4) on conflict do nothing returning name", [ag.n, emailOf(ag.n), hashPw(b.pw), now]);
    if (!r.rows[0]) return send(res, 409, { msg: "Ese agente ya tiene cuenta. Iniciá sesión." });
    await newSession(res, ag.n, b.keep !== false);
    return send(res, 200, { n: ag.n, e: emailOf(ag.n) });
  }

  if (a === "logout") { await endSession(req, res); return send(res, 200, { ok: 1 }); }

  // Lo que sigue requiere sesión
  const me = await current(req);
  if (!me) return send(res, 401, { error: "auth", msg: "Tu sesión expiró. Volvé a iniciar sesión." });

  if (a === "info") {
    const r = (await q("select email,created,last from accounts where name=$1", [me.n])).rows[0];
    return send(res, 200, { e: r.email, c: +r.created, last: +r.last });
  }
  if (a === "passwd") {
    const r = (await q("select hash from accounts where name=$1", [me.n])).rows[0];
    if (!r || !checkPw(b.old, r.hash)) return send(res, 403, { msg: "La contraseña actual no es correcta" });
    if (tooShort(b.nw)) return send(res, 400, { msg: "La nueva contraseña tiene que tener al menos 6 caracteres" });
    await q("update accounts set hash=$2 where name=$1", [me.n, hashPw(b.nw)]);
    return send(res, 200, { ok: 1 });
  }

  // Administración: Capitanía (Teniente o superior)
  if (me.l < CAP) return send(res, 403, { msg: "Solo Capitanía puede administrar cuentas." });
  if (a === "list") {
    const rows = (await q("select name,email,created,last from accounts order by last desc nulls last")).rows;
    return send(res, 200, { list: rows.map(r => ({ n: r.name, e: r.email, c: +r.created, last: r.last ? +r.last : null })), code: await regCode() });
  }
  if (a === "reset") {
    const tmp = Math.random().toString(36).slice(2, 8) + Math.floor(Math.random() * 90 + 10);
    const r = await q("update accounts set hash=$2 where name=$1 returning name", [b.n, hashPw(tmp)]);
    if (!r.rows[0]) return send(res, 404, { msg: "No existe esa cuenta" });
    await q("delete from sessions where name=$1", [b.n]);
    return send(res, 200, { tmp });
  }
  if (a === "delete") {
    if (b.n === me.n) return send(res, 400, { msg: "No podés eliminar tu propia cuenta" });
    await q("delete from sessions where name=$1", [b.n]);
    await q("delete from accounts where name=$1", [b.n]);
    return send(res, 200, { ok: 1 });
  }
  if (a === "setcode") {
    const c = String(b.code || "").trim().slice(0, 60);
    await q("insert into meta(k,v) values('regcode',$1) on conflict(k) do update set v=excluded.v", [c]);
    return send(res, 200, { code: c });
  }
  return send(res, 400, { msg: "Acción desconocida" });
});
