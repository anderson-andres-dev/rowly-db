-- rank becomes a reserved word (window functions).
SELECT 1 AS rank
-- ---
-- ASC/DESC after GROUP BY is removed.
SELECT a FROM (SELECT 1 AS a) t GROUP BY a DESC
-- ---
-- PASSWORD() is removed.
SELECT PASSWORD('x')
-- ---
-- The query cache and its hint are removed.
SELECT SQL_CACHE 1
-- ---
-- ENCODE() is removed.
SELECT ENCODE('a', 'b')
