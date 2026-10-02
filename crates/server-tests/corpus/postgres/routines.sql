-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_plpgsql(int)
-- call: SELECT rowly_test.rt_plpgsql(4)
CREATE OR REPLACE FUNCTION rowly_test.rt_plpgsql(n int) RETURNS int AS $$
DECLARE
    s int := 0;
BEGIN
    FOR i IN 1..n LOOP
        s := s + i;
    END LOOP;
    RETURN s;
EXCEPTION WHEN others THEN
    RETURN -1;
END;
$$ LANGUAGE plpgsql
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_attrs(int)
-- call: SELECT rowly_test.rt_attrs(2)
CREATE OR REPLACE FUNCTION rowly_test.rt_attrs(n int) RETURNS int
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE COST 10
    AS $body$ SELECT n * 2; $body$
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_quoted(int)
-- call: SELECT rowly_test.rt_quoted(2)
CREATE OR REPLACE FUNCTION rowly_test.rt_quoted(n int) RETURNS int AS 'SELECT n + 1;' LANGUAGE sql
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_return(int)
-- call: SELECT rowly_test.rt_return(2)
CREATE OR REPLACE FUNCTION rowly_test.rt_return(n int) RETURNS int LANGUAGE sql RETURN n + 10
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_atomic(int)
-- call: SELECT rowly_test.rt_atomic(3)
CREATE OR REPLACE FUNCTION rowly_test.rt_atomic(n int) RETURNS int
LANGUAGE sql
BEGIN ATOMIC
    SELECT CASE WHEN n > 1 THEN 1 ELSE 0 END;
    SELECT n * 3;
END
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_alias(int)
-- call: SELECT rowly_test.rt_alias(3)
CREATE OR REPLACE FUNCTION rowly_test.rt_alias(n int) RETURNS int
LANGUAGE sql
BEGIN ATOMIC
    SELECT 1 AS begin;
    SELECT n AS "end";
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rowly_test.rt_proc(int)
-- call: CALL rowly_test.rt_proc(5)
CREATE OR REPLACE PROCEDURE rowly_test.rt_proc(n int) AS $$
BEGIN
    INSERT INTO rowly_test.log (msg) VALUES ('proc ' || n);
END;
$$ LANGUAGE plpgsql
-- ---
-- drop: DROP PROCEDURE IF EXISTS rowly_test.rt_proc_sql(int)
-- call: CALL rowly_test.rt_proc_sql(5)
CREATE OR REPLACE PROCEDURE rowly_test.rt_proc_sql(n int) LANGUAGE sql AS $$
    INSERT INTO rowly_test.log (msg) VALUES ('sql ' || n);
    INSERT INTO rowly_test.log (msg) VALUES ('sql2 ' || n);
$$
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_dynamic(text)
-- call: SELECT rowly_test.rt_dynamic('canary')
CREATE OR REPLACE FUNCTION rowly_test.rt_dynamic(tabla text) RETURNS bigint AS $$
DECLARE
    total bigint;
BEGIN
    EXECUTE format('SELECT count(*) FROM rowly_test.%I', tabla) INTO total;
    RETURN total;
END;
$$ LANGUAGE plpgsql
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_strings()
-- call: SELECT rowly_test.rt_strings()
CREATE OR REPLACE FUNCTION rowly_test.rt_strings() RETURNS text AS $outer$
DECLARE
    s text;
BEGIN
    s := $inner$ END; DROP TABLE t; $inner$ || ' it''s; fine ' || E'a\'b; c';
    -- BEGIN y END en un comentario;
    /* y en un /* comentario anidado */ de bloque; */
    RETURN s;
END;
$outer$ LANGUAGE plpgsql
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_trg() CASCADE
CREATE OR REPLACE FUNCTION rowly_test.rt_trg() RETURNS trigger AS $$
BEGIN
    NEW.msg := '[t] ' || coalesce(NEW.msg, '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
-- ---
-- drop: DROP TRIGGER IF EXISTS rt_trg_before ON rowly_test.log
-- call: INSERT INTO rowly_test.log (msg) VALUES ('disparo')
CREATE TRIGGER rt_trg_before BEFORE INSERT ON rowly_test.log FOR EACH ROW EXECUTE FUNCTION rowly_test.rt_trg()
-- ---
-- drop: DROP FUNCTION IF EXISTS rowly_test.rt_setof(int)
-- call: SELECT * FROM rowly_test.rt_setof(3)
CREATE OR REPLACE FUNCTION rowly_test.rt_setof(n int) RETURNS TABLE (i int, doble int)
    LANGUAGE sql STABLE
    SET search_path = pg_catalog, public
    AS $$ SELECT g, g * 2 FROM generate_series(1, n) AS g $$
