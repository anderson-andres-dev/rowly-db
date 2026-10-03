CREATE TABLE {s}.t_basic (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, price DECIMAL(10,2) UNSIGNED ZEROFILL NULL, flag TINYINT(1) DEFAULT 0, note TEXT, data JSON, KEY idx_name (name), UNIQUE KEY uk_price (price)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='tabla de prueba'
-- ---
CREATE TABLE {s}.t_child (id INT NOT NULL, parent_id INT UNSIGNED NOT NULL, qty INT NOT NULL DEFAULT 1, total DECIMAL(12,2) AS (qty * 2) STORED, label VARCHAR(20) GENERATED ALWAYS AS (CONCAT('x', id)) VIRTUAL, PRIMARY KEY (id), CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES {s}.t_basic (id) ON DELETE CASCADE ON UPDATE RESTRICT, CONSTRAINT ck_qty CHECK (qty > 0))
-- ---
CREATE TABLE IF NOT EXISTS {s}.t_like LIKE {s}.t_basic
-- ---
CREATE TEMPORARY TABLE {s}.t_tmp (a INT, b VARCHAR(10)) ENGINE=MEMORY
-- ---
CREATE TABLE {s}.t_select AS SELECT id, name FROM {s}.t_basic WHERE id > 0
-- ---
CREATE TABLE {s}.t_part (id INT NOT NULL, d DATE NOT NULL, PRIMARY KEY (id, d)) PARTITION BY RANGE (YEAR(d)) (PARTITION p0 VALUES LESS THAN (2020), PARTITION p1 VALUES LESS THAN MAXVALUE)
-- ---
CREATE TABLE {s}.t_enum (id INT, kind ENUM('a','b','c') NOT NULL DEFAULT 'a', tags SET('x','y','z'), b BIT(8), y YEAR, bin VARBINARY(16), bl BLOB, ts DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), pt POINT)
-- ---
ALTER TABLE {s}.t_basic ADD COLUMN extra VARCHAR(20) DEFAULT NULL AFTER name
-- ---
ALTER TABLE {s}.t_basic ADD INDEX idx_extra (extra), ADD CONSTRAINT uq_extra UNIQUE (extra)
-- ---
ALTER TABLE {s}.t_basic MODIFY COLUMN extra VARCHAR(40) NOT NULL DEFAULT ''
-- ---
ALTER TABLE {s}.t_basic CHANGE COLUMN extra extra2 VARCHAR(40) NOT NULL DEFAULT ''
-- ---
ALTER TABLE {s}.t_basic RENAME COLUMN extra2 TO extra3
-- ---
ALTER TABLE {s}.t_basic ALTER COLUMN extra3 SET DEFAULT 'x'
-- ---
ALTER TABLE {s}.t_basic ENGINE=InnoDB, AUTO_INCREMENT=100
-- ---
ALTER TABLE {s}.t_basic DROP INDEX uq_extra
-- ---
ALTER TABLE {s}.t_basic DROP COLUMN extra3
-- ---
CREATE TABLE {s}.t_ren (a INT)
-- ---
RENAME TABLE {s}.t_ren TO {s}.t_ren2
-- ---
CREATE INDEX idx_flag ON {s}.t_basic (flag, name(10) DESC)
-- ---
CREATE UNIQUE INDEX uq_label ON {s}.t_child (label)
-- ---
CREATE FULLTEXT INDEX ft_note ON {s}.t_basic (note)
-- ---
CREATE VIEW {s}.v_basic AS SELECT id, name FROM {s}.t_basic WHERE id > 0 WITH CHECK OPTION
-- ---
CREATE OR REPLACE ALGORITHM=MERGE SQL SECURITY INVOKER VIEW {s}.v_basic2 (i, n) AS SELECT id, name FROM {s}.t_basic WITH LOCAL CHECK OPTION
-- ---
INSERT INTO {s}.t_basic (name, price) VALUES ('a', 1.5), ('b', 2.5), ('c', NULL)
-- ---
INSERT INTO {s}.t_basic (name) SELECT name FROM {s}.t_basic WHERE price IS NOT NULL
-- ---
INSERT INTO {s}.t_basic (id, name) VALUES (1, 'z') ON DUPLICATE KEY UPDATE name = VALUES(name)
-- ---
INSERT IGNORE INTO {s}.t_basic SET name = 'ignored'
-- ---
UPDATE {s}.t_basic b JOIN {s}.t_child c ON c.parent_id = b.id SET b.flag = 1 WHERE c.qty > 0
-- ---
UPDATE {s}.t_basic SET flag = IF(flag = 0, 1, 0) WHERE id = 1 ORDER BY id LIMIT 1
-- ---
DELETE b FROM {s}.t_basic b LEFT JOIN {s}.t_child c ON c.parent_id = b.id WHERE c.id IS NULL AND b.name = 'ignored'
-- ---
SELECT SQL_CALC_FOUND_ROWS id, name FROM {s}.t_basic ORDER BY id LIMIT 2
-- ---
SELECT id, ROW_NUMBER() OVER (PARTITION BY flag ORDER BY id) AS rn, SUM(id) OVER (ORDER BY id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS s FROM {s}.t_basic
-- ---
WITH RECURSIVE n (i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5) SELECT i FROM n
-- ---
SELECT b.name, COUNT(*) AS c FROM {s}.t_basic b GROUP BY b.name WITH ROLLUP
-- ---
SELECT * FROM {s}.t_basic WHERE name LIKE 'a%' AND price BETWEEN 0 AND 10 AND id IN (SELECT parent_id FROM {s}.t_child) OR EXISTS (SELECT 1 FROM {s}.t_child WHERE qty MOD 2 = 0)
-- ---
-- only: mysql
SELECT JSON_EXTRACT(data, '$.a') AS a, data->'$.b' AS b, data->>'$.c' AS c FROM {s}.t_basic
-- ---
-- only: mariadb
SELECT JSON_EXTRACT(data, '$.a') AS a, JSON_VALUE(data, '$.c') AS c FROM {s}.t_basic
-- ---
SELECT t.* FROM JSON_TABLE('[{"a":1},{"a":2}]', '$[*]' COLUMNS (a INT PATH '$.a')) AS t
-- ---
SELECT id FROM {s}.t_basic UNION ALL SELECT id FROM {s}.t_child ORDER BY id LIMIT 3
-- ---
SELECT id, name FROM {s}.t_basic FOR UPDATE
-- ---
SELECT @a := COUNT(*) FROM {s}.t_basic
-- ---
SET @a := 1
-- ---
SET @b = 2, @c = 3
-- ---
SET SESSION sql_mode = 'STRICT_TRANS_TABLES'
-- ---
SET NAMES utf8mb4
-- ---
SET autocommit = 1
-- ---
EXPLAIN SELECT * FROM {s}.t_basic WHERE id = 1
-- ---
EXPLAIN FORMAT=JSON SELECT * FROM {s}.t_basic WHERE id = 1
-- ---
-- only: mysql
EXPLAIN ANALYZE SELECT * FROM {s}.t_basic WHERE id = 1
-- ---
-- only: mariadb
ANALYZE SELECT * FROM {s}.t_basic WHERE id = 1
-- ---
SHOW COLUMNS FROM {s}.t_basic
-- ---
SHOW INDEX FROM {s}.t_basic
-- ---
SHOW TABLE STATUS FROM {s} LIKE 't_%'
-- ---
SHOW FULL PROCESSLIST
-- ---
SHOW VARIABLES LIKE 'sql_mode'
-- ---
ANALYZE TABLE {s}.t_basic
-- ---
OPTIMIZE TABLE {s}.t_basic
-- ---
CHECK TABLE {s}.t_basic
-- ---
-- no-exec
LOCK TABLES {s}.t_basic READ
-- ---
-- no-exec
UNLOCK TABLES
-- ---
-- no-exec
START TRANSACTION WITH CONSISTENT SNAPSHOT
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
TRUNCATE TABLE {s}.t_ren2
-- ---
DROP VIEW IF EXISTS {s}.v_basic2
-- ---
DROP INDEX idx_flag ON {s}.t_basic
-- ---
DROP TABLE IF EXISTS {s}.t_select, {s}.t_like
