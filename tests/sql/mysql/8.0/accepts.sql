-- Common table expressions.
WITH t AS (SELECT 1 AS a) SELECT a FROM t
-- ---
-- Window functions.
SELECT ROW_NUMBER() OVER (ORDER BY a) FROM (SELECT 1 AS a) t
-- ---
-- LATERAL derived tables.
SELECT t.a, l.b FROM (SELECT 1 AS a) t, LATERAL (SELECT t.a AS b) l
