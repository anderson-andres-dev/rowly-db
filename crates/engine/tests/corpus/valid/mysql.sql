-- Validas en MySQL y MariaDB.

SELECT `c`.`clie_codi`, `c`.`clie_nomb` FROM `clientes` AS `c` WHERE `c`.`clie_esta` = 1 LIMIT 10, 20;

SELECT clie_codi, GROUP_CONCAT(DISTINCT abon_codi ORDER BY abon_codi SEPARATOR ', ') AS abonados
FROM abonados
GROUP BY clie_codi;

SELECT DATE_FORMAT(asis_fech, '%d/%m/%Y') AS fecha,
       IF(asis_tipo = 1, 'Entrada', 'Salida') AS tipo,
       IFNULL(asis_hora, '00:00') AS hora
FROM asistencias
WHERE asis_fech >= NOW() - INTERVAL 7 DAY
ORDER BY FIELD(asis_tipo, 2, 1), asis_fech;

INSERT INTO planes (plan_codi, plan_nomb, plan_prec) VALUES (1, 'Básico', 10), (2, 'Plus', 20)
ON DUPLICATE KEY UPDATE plan_prec = VALUES(plan_prec);

INSERT IGNORE INTO ciudades (ciud_codi, ciud_nomb) VALUES (1, 'Quito');

REPLACE INTO ciudades (ciud_codi, ciud_nomb) VALUES (2, 'Guayaquil');

UPDATE abonados a
JOIN clientes c ON c.clie_codi = a.clie_codi
SET a.abon_esta = 0
WHERE c.clie_esta = 0;

DELETE f FROM facturas f
JOIN abonados a ON a.abon_codi = f.abon_codi
WHERE a.abon_esta = 9;

SELECT * FROM clientes WHERE clie_nomb REGEXP '^[A-Z]' AND clie_codi <=> NULL;

SELECT clie_codi DIV 10 AS grupo, clie_codi MOD 10 AS resto FROM clientes;

SELECT * FROM clientes # comentario de MySQL
WHERE clie_codi = 1;

SELECT @total := COUNT(*) FROM facturas;

SET @desde = '2026-01-01';

SELECT * FROM facturas WHERE fact_faut >= @desde;

SELECT CONVERT(clie_nomb USING utf8mb4) AS nombre FROM clientes;

SELECT * FROM clientes FORCE INDEX (PRIMARY) WHERE clie_codi > 5;

SELECT 'a\'b' AS escapada, "comillas dobles" AS texto;

SELECT * FROM abonados WHERE abon_codi IN (SELECT abon_codi FROM facturas WHERE fact_esta = 1) LIMIT 5;

SELECT SQL_CALC_FOUND_ROWS clie_codi FROM clientes LIMIT 5;

SHOW TABLES;

SHOW CREATE TABLE clientes;

DESCRIBE clientes;

EXPLAIN SELECT * FROM clientes WHERE clie_codi = 1;

CREATE TEMPORARY TABLE tmp_mora AS SELECT abon_codi FROM facturas WHERE fact_valt > fact_valc;

SELECT t.abon_codi FROM tmp_mora t JOIN abonados a ON a.abon_codi = t.abon_codi;

CREATE TABLE IF NOT EXISTS bitacora (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    detalle VARCHAR(255) NOT NULL DEFAULT '',
    creado DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE bitacora ADD COLUMN usuario VARCHAR(50) NULL AFTER detalle;

INSERT INTO bitacora (detalle) VALUES ('x');

SELECT id, detalle FROM bitacora;

TRUNCATE TABLE bitacora;

SELECT JSON_EXTRACT('{"a": 1}', '$.a') AS a, JSON_UNQUOTE(JSON_EXTRACT('{"b": "x"}', '$.b')) AS b;

SELECT * FROM clientes WHERE MATCH (clie_nomb) AGAINST ('juan' IN BOOLEAN MODE);

SELECT clie_codi, COUNT(*) FROM abonados GROUP BY clie_codi WITH ROLLUP;

CALL recalcular_saldos(1, @salida);

LOCK TABLES clientes READ;

UNLOCK TABLES;

SELECT 1 FROM DUAL;

SELECT j.x FROM JSON_TABLE('[1,2]', '$[*]' COLUMNS (x INT PATH '$')) AS j;
