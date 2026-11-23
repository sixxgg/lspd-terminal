-- Diagnostico y optimizacion de PostgreSQL para sixxgg/lspd-terminal
-- Ejecutar en el editor SQL de Neon / Supabase (CREATE INDEX CONCURRENTLY no bloquea escrituras).

-- 1. Medir tamano real por tabla (datos + indices + TOAST)
SELECT relname AS tabla,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       pg_size_pretty(pg_relation_size(relid)) AS datos,
       pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS indices_y_toast
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 2. Indices recomendados (sin downtime)
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_exp_idx ON sessions (exp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_name_idx ON sessions (name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS kv_hist_at_idx ON kv_hist (at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS logs_dedup_idx ON logs (n, a, k, t DESC);

-- 3. Limpiar sesiones vencidas y actualizar estadisticas del planificador
DELETE FROM sessions WHERE exp < (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
VACUUM (ANALYZE) kv, kv_hist, logs, sessions, meta;