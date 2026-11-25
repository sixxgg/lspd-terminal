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
  /* TLS: por defecto no se verifica el certificado (como hasta ahora, para no romper ningún proveedor). Con PGSSL_VERIFY=1 se verifica (Neon lo soporta). */
  const ssl = local ? false : { rejectUnauthorized: process.env.PGSSL_VERIFY === "1" };
  pool = new pg.Pool({ connectionString: cs, ssl, max: Number(process.env.PG_POOL_MAX) || 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000 });
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
    if (!ok) {
      const c = await getPool().connect();
      try { await c.query("select pg_advisory_lock(731001)"); await c.query(SCHEMA); }
      finally { try { await c.query("select pg_advisory_unlock(731001)"); } catch {} c.release(); }
    }
    // migraciones (una sola vez, con bloqueo)
    const v = (await getPool().query("select v from meta where k='schemav'")).rows[0]?.v;
    if (v !== "7") {
      const c = await getPool().connect();
      try {
        await c.query("select pg_advisory_lock(731002)");
        await c.query("alter table kv add column if not exists at bigint");
        /* presencia en vivo de la pizarra (cursores y lo que se está moviendo): efímera, sin registro en disco */
        await c.query("create unlogged table if not exists live(b text not null, n text not null, v text, t bigint not null, primary key(b, n))");
        /* versiones de cada clave (historial para recuperar lo que se pisó) */
        await c.query("create table if not exists kv_hist(id bigserial primary key, k text not null, v text, by text, at bigint not null)");
        await c.query("create index if not exists kv_hist_k on kv_hist(k, at)");
        /* punto de partida: el valor actual de cada clave de datos queda como primera versión */
        await c.query("insert into kv_hist(k,v,by,at) select k, v, coalesce(by,''), coalesce(at, 0) from kv where v is not null and v not like 'data:%' and not exists (select 1 from kv_hist h where h.k = kv.k)");
        /* v5: los perfiles son uno solo para los tres departamentos (lo que se guardó en el LSSD o la SAHP pasa a la clave común) */
        await c.query("insert into kv(k,v,t,by,at) select regexp_replace(k, '^lspdt\\.(lssd|sahp)\\.', 'lspdt.'), v, nextval('kv_seq'), by, at from kv where k ~ '^lspdt\\.(lssd|sahp)\\.(uprof|ucom|uvis|ufolt?)\\.' on conflict(k) do nothing");
        /* v6: las copias viejas de los perfiles por departamento ya pasaron a la clave común: se borran para no sincronizarlas de más */
        await c.query("delete from kv k1 where k1.k ~ '^lspdt\\.(lssd|sahp)\\.(uprof|ucom|uvis|ufolt?)\\.' and exists (select 1 from kv k2 where k2.k = regexp_replace(k1.k, '^lspdt\\.(lssd|sahp)\\.', 'lspdt.'))");
        /* v7: índices para las purgas y consultas frecuentes (sesiones vencidas, historial por fecha) */
        await c.query("create index if not exists sessions_exp_idx on sessions(exp)");
        await c.query("create index if not exists sessions_name_idx on sessions(name)");
        await c.query("create index if not exists kv_hist_at_idx on kv_hist(at)");
        await c.query("insert into meta(k,v) values('schemav','7') on conflict(k) do update set v='7'");
      } finally { try { await c.query("select pg_advisory_unlock(731002)"); } catch {} c.release(); }
    }
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
