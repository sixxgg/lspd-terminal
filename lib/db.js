import pg from "pg";

let pool = null, ready = null;

export function connString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.SUPABASE_DB_URL || "";
}

function getPool() {
  if (pool) return pool;
  let cs = connString();
  if (!cs) { const e = new Error("NO_DB"); e.code = "NO_DB"; throw e; }
  const local = /@(localhost|127\.0\.0\.1)[:/]|host=\//.test(cs) || process.env.PGSSL === "off";
  cs = cs.replace(/([?&])(sslmode|channel_binding)=[^&]*/g, "$1").replace(/[?&]+$/, "").replace(/\?&+/, "?");
  pool = new pg.Pool({ connectionString: cs, ssl: local ? false : { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 10000 });
  pool.on("error", () => {});
  return pool;
}

const SCHEMA = `
create sequence if not exists kv_seq;
create table if not exists kv(k text primary key, v text, t bigint not null, by text);
create index if not exists kv_t on kv(t);
create table if not exists accounts(name text primary key, email text unique not null, hash text not null, created bigint not null, last bigint);
create table if not exists sessions(token text primary key, name text not null, exp bigint not null);
create table if not exists meta(k text primary key, v text);
`;

export function init() {
  if (!ready) ready = (async () => {
    // si las tablas ya existen no se toca nada (evita choques cuando arrancan muchas funciones a la vez)
    const ok = (await getPool().query("select to_regclass('public.kv') is not null and to_regclass('public.meta') is not null as ok")).rows[0].ok;
    if (ok) return;
    const c = await getPool().connect();
    try { await c.query("select pg_advisory_lock(731001)"); await c.query(SCHEMA); }
    finally { try { await c.query("select pg_advisory_unlock(731001)"); } catch {} c.release(); }
  })().catch(e => { ready = null; throw e; });
  return ready;
}

export async function q(text, params) { await init(); return getPool().query(text, params); }

/* Ejecuta fn dentro de una transacción con un cliente dedicado. */
export async function tx(fn) {
  await init();
  const c = await getPool().connect();
  try { await c.query("begin"); const r = await fn(c); await c.query("commit"); return r; }
  catch (e) { try { await c.query("rollback"); } catch {} throw e; }
  finally { c.release(); }
}
