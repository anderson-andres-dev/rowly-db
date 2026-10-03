CREATE TABLE {s}.t_basic (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name varchar(100) NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), price numeric(10,2), flag boolean DEFAULT false, note text, data jsonb, tags text[] DEFAULT '{}', ip inet, CONSTRAINT ck_price CHECK (price >= 0))
-- ---
CREATE TABLE {s}.t_child (id serial PRIMARY KEY, parent_id bigint NOT NULL REFERENCES {s}.t_basic (id) ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED, qty integer NOT NULL DEFAULT 1, total numeric GENERATED ALWAYS AS (qty * 2) STORED, UNIQUE (parent_id, qty))
-- ---
CREATE TABLE IF NOT EXISTS {s}.t_like (LIKE {s}.t_basic INCLUDING ALL)
-- ---
CREATE UNLOGGED TABLE {s}.t_unlogged (a int, b text)
-- ---
CREATE TEMPORARY TABLE t_tmp (a int, b text) ON COMMIT DROP
-- ---
CREATE TABLE {s}.t_select AS SELECT id, name FROM {s}.t_basic WITH NO DATA
-- ---
CREATE TABLE {s}.t_part (id int NOT NULL, d date NOT NULL) PARTITION BY RANGE (d)
-- ---
CREATE TABLE {s}.t_part_2026 PARTITION OF {s}.t_part FOR VALUES FROM ('2026-01-01') TO ('2027-01-01')
-- ---
CREATE TYPE {s}.mood AS ENUM ('sad', 'ok', 'happy')
-- ---
CREATE DOMAIN {s}.posint AS integer CHECK (VALUE > 0)
-- ---
CREATE SEQUENCE {s}.seq_a START WITH 10 INCREMENT BY 5 MINVALUE 1 MAXVALUE 1000 CACHE 5 CYCLE
-- ---
ALTER TABLE {s}.t_basic ADD COLUMN extra text DEFAULT NULL
-- ---
ALTER TABLE {s}.t_basic ADD COLUMN IF NOT EXISTS extra2 integer
-- ---
ALTER TABLE {s}.t_basic ALTER COLUMN extra2 TYPE bigint USING extra2::bigint
-- ---
ALTER TABLE {s}.t_basic ALTER COLUMN extra SET NOT NULL, ALTER COLUMN extra SET DEFAULT 'x'
-- ---
ALTER TABLE {s}.t_basic ADD CONSTRAINT ck_extra CHECK (length(extra) > 0) NOT VALID
-- ---
ALTER TABLE {s}.t_basic VALIDATE CONSTRAINT ck_extra
-- ---
ALTER TABLE {s}.t_basic RENAME COLUMN extra TO extra1
-- ---
ALTER TABLE {s}.t_basic RENAME TO t_basic2
-- ---
ALTER TABLE {s}.t_basic2 RENAME TO t_basic
-- ---
ALTER TABLE {s}.t_basic DROP COLUMN IF EXISTS extra2 CASCADE
-- ---
ALTER TABLE {s}.t_basic ENABLE ROW LEVEL SECURITY
-- ---
CREATE INDEX CONCURRENTLY idx_name ON {s}.t_basic USING btree (lower(name) text_pattern_ops) WHERE flag
-- ---
CREATE UNIQUE INDEX uq_tags ON {s}.t_basic (id, name) INCLUDE (price)
-- ---
CREATE INDEX idx_data ON {s}.t_basic USING gin (data jsonb_path_ops)
-- ---
CREATE VIEW {s}.v_basic AS SELECT id, name FROM {s}.t_basic WHERE flag WITH CHECK OPTION
-- ---
CREATE OR REPLACE VIEW {s}.v_basic2 (i, n) AS SELECT id, name FROM {s}.t_basic
-- ---
CREATE MATERIALIZED VIEW {s}.mv_basic AS SELECT flag, count(*) AS n FROM {s}.t_basic GROUP BY flag WITH DATA
-- ---
REFRESH MATERIALIZED VIEW {s}.mv_basic
-- ---
INSERT INTO {s}.t_basic (name, price, tags) VALUES ('a', 1.5, ARRAY['x','y']), ('b', 2.5, '{z}'), ('c', NULL, DEFAULT)
-- ---
INSERT INTO {s}.t_basic (name) SELECT name FROM {s}.t_basic WHERE price IS NOT NULL RETURNING id
-- ---
INSERT INTO {s}.t_basic (id, name) OVERRIDING SYSTEM VALUE VALUES (100, 'z') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
-- ---
INSERT INTO {s}.t_basic (name) VALUES ('dup') ON CONFLICT DO NOTHING
-- ---
UPDATE {s}.t_basic b SET flag = true FROM {s}.t_child c WHERE c.parent_id = b.id AND c.qty > 0 RETURNING b.id
-- ---
UPDATE {s}.t_basic SET tags = array_append(tags, 'n') WHERE id = 1
-- ---
DELETE FROM {s}.t_basic b USING {s}.t_child c WHERE c.parent_id = b.id AND c.qty > 100
-- ---
SELECT id, row_number() OVER w AS rn, sum(id) OVER (ORDER BY id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS s FROM {s}.t_basic WINDOW w AS (PARTITION BY flag ORDER BY id)
-- ---
WITH RECURSIVE n (i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5) SELECT i FROM n
-- ---
SELECT flag, count(*) FILTER (WHERE price > 1) AS c, string_agg(name, ',' ORDER BY name) AS names FROM {s}.t_basic GROUP BY GROUPING SETS ((flag), ())
-- ---
SELECT data->'a' AS a, data->>'b' AS b, data#>'{c,d}' AS c, data @> '{"a":1}'::jsonb AS contains, data ? 'a' AS has_a, tags && ARRAY['x'] AS overlap FROM {s}.t_basic
-- ---
SELECT b.id, x.v FROM {s}.t_basic b CROSS JOIN LATERAL (SELECT b.id * 2 AS v) x
-- ---
SELECT * FROM generate_series(1, 5) AS g(n) WHERE n % 2 = 1
-- ---
SELECT DISTINCT ON (flag) flag, name FROM {s}.t_basic ORDER BY flag, name
-- ---
SELECT id::text, name::varchar(5), 1::numeric, '2026-01-01'::date, CAST(now() AS date) FROM {s}.t_basic LIMIT 1 OFFSET 0
-- ---
SELECT id FROM {s}.t_basic UNION ALL SELECT id FROM {s}.t_child ORDER BY id LIMIT 3
-- ---
SELECT * FROM {s}.t_basic WHERE name ~* '^a' AND price IS DISTINCT FROM 0 AND id = ANY (ARRAY[1, 2, 3]) FOR UPDATE SKIP LOCKED
-- ---
-- needs: MERGE.
MERGE INTO {s}.t_basic t USING (SELECT 1 AS id, 'm' AS name) s ON t.id = s.id WHEN MATCHED THEN UPDATE SET name = s.name WHEN NOT MATCHED THEN INSERT (id, name) OVERRIDING SYSTEM VALUE VALUES (s.id, s.name)
-- ---
SET search_path TO public
-- ---
-- no-exec
SET LOCAL statement_timeout = '5s'
-- ---
SHOW search_path
-- ---
EXPLAIN SELECT * FROM {s}.t_basic WHERE id = 1
-- ---
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM {s}.t_basic WHERE id = 1
-- ---
ANALYZE {s}.t_basic
-- ---
VACUUM (ANALYZE) {s}.t_basic
-- ---
COMMENT ON TABLE {s}.t_basic IS 'tabla; de prueba'
-- ---
COMMENT ON COLUMN {s}.t_basic.name IS 'nombre'
-- ---
GRANT SELECT, INSERT ON {s}.t_basic TO PUBLIC
-- ---
-- no-exec
BEGIN
-- ---
-- no-exec
SAVEPOINT sp1
-- ---
-- no-exec
ROLLBACK TO SAVEPOINT sp1
-- ---
-- no-exec
COMMIT
-- ---
TRUNCATE {s}.t_unlogged RESTART IDENTITY
-- ---
DROP VIEW IF EXISTS {s}.v_basic2
-- ---
DROP INDEX IF EXISTS {s}.idx_data
-- ---
DROP TABLE IF EXISTS {s}.t_select, {s}.t_like CASCADE
