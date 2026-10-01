CREATE FUNCTION rowly_test.atk() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$; {x}
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql; {x}
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int AS 'select 1' LANGUAGE sql; {x}
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int AS $a$ select $b$ ; $b$::int $a$ LANGUAGE sql; {x}
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT 1; END; {x}
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT 1 AS begin; END; {x}; END
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT 1; {x}; END
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int LANGUAGE sql RETURN 1; {x}
-- ---
DO $$ BEGIN NULL; END $$; {x}
-- ---
DO LANGUAGE plpgsql $t$ BEGIN NULL; END $t$; {x}
-- ---
ALTER FUNCTION rowly_test.atk() OWNER TO rowly; {x}
-- ---
COMMENT ON FUNCTION rowly_test.atk() IS 'x'; {x}
-- ---
CREATE RULE atk AS ON INSERT TO rowly_test.log DO INSTEAD NOTHING; {x}
-- ---
CREATE TRIGGER atk BEFORE INSERT ON rowly_test.log FOR EACH ROW EXECUTE FUNCTION rowly_test.atk(); {x}
-- ---
SELECT 1 /* /* anidado */ ; {x} */
-- ---
SELECT 1 /* x */ ; {x}
-- ---
SELECT 1 -- x
; {x}
-- ---
SELECT E'\'; {x}; --'
-- ---
SELECT 1; {x}
-- ---
CREATE FUNCTION rowly_test.atk() RETURNS int AS $$ SELECT 1 $$
LANGUAGE sql
; {x}
