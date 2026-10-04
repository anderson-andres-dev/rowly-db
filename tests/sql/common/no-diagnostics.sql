-- Validas en todos los motores. Escritas como se escriben de verdad:
-- subconsultas profundas, formato disparejo, comentarios en cualquier lado.

SELECT * FROM clientes WHERE clie_codi IN (SELECT clie_codi FROM abonados WHERE abon_codi IN (
    201152,
    201154,
    201170,
    201171
));

select c.clie_codi, c.clie_nomb,
       (select count(*) from abonados a where a.clie_codi = c.clie_codi and a.abon_esta = 1) as activos,
       (select max(f.fact_faut) from facturas f
          where f.abon_codi in (select a2.abon_codi from abonados a2 where a2.clie_codi = c.clie_codi)
       ) as ultima
from clientes c
where c.clie_esta = 1
  and exists (select 1 from abonados a3
              where a3.clie_codi = c.clie_codi
                and a3.abon_codi not in (select ct.abon_codi from contratos ct where ct.cont_esta = 0))
order by c.clie_nomb;

SELECT
    a.abon_codi,
    CASE
        WHEN a.abon_esta = 1 THEN 'Activo'
        WHEN a.abon_esta = 2 THEN 'Suspendido'
        ELSE 'Otro'
    END AS estado,
    COALESCE(mora.saldo_pendiente, 0) AS saldo
FROM abonados AS a
LEFT JOIN (
    SELECT fv.abon_codi,
           COUNT(*) AS meses_mora,
           SUM(COALESCE(fv.fact_valt, 0) - COALESCE(fv.fact_valc, 0)) AS saldo_pendiente,
           MAX(fv.fact_faut) AS ultima_factura_pendiente
    FROM facturas AS fv
    WHERE fv.abon_codi IS NOT NULL
      AND COALESCE(fv.fact_valt, 0) > COALESCE(fv.fact_valc, 0)
      AND fv.fact_faut IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM notas_credito AS nc
          WHERE nc.fact_codi = fv.fact_codi AND nc.ntcr_esta = 1
      )
    GROUP BY fv.abon_codi
) AS mora ON mora.abon_codi = a.abon_codi
WHERE (
    a.abon_esta = 1
    AND (
        a.abon_codi NOT IN (
            SELECT ct.abon_codi FROM contratos AS ct WHERE ct.abon_codi IS NOT NULL
        )
        OR a.abon_codi IN (
            SELECT ct.abon_codi
            FROM contratos AS ct
            WHERE ct.abon_codi IS NOT NULL
              AND (ct.cont_ffin IS NULL OR ct.cont_ffin > ct.cont_fini)
        )
    )
);

WITH activos AS (
    SELECT abon_codi, clie_codi FROM abonados WHERE abon_esta = 1
), deuda AS (
    SELECT f.abon_codi, SUM(f.fact_valt - f.fact_valc) AS total
    FROM facturas f
    JOIN activos x ON x.abon_codi = f.abon_codi
    GROUP BY f.abon_codi
    HAVING SUM(f.fact_valt - f.fact_valc) > 0
)
SELECT c.clie_nomb, d.total
FROM deuda d
JOIN activos x ON x.abon_codi = d.abon_codi
JOIN clientes c ON c.clie_codi = x.clie_codi
ORDER BY d.total DESC;

SELECT t.clie_codi, t.n
FROM (
    SELECT q.clie_codi, q.n
    FROM (
        SELECT r.clie_codi, COUNT(*) AS n
        FROM (
            SELECT a.clie_codi
            FROM abonados a
            WHERE a.abon_codi IN (
                SELECT f.abon_codi FROM facturas f WHERE f.fact_codi IN (
                    SELECT nc.fact_codi FROM notas_credito nc WHERE nc.ntcr_valo > (
                        SELECT AVG(nc2.ntcr_valo) FROM notas_credito nc2
                    )
                )
            )
        ) r
        GROUP BY r.clie_codi
    ) q
    WHERE q.n > 1
) t;

SELECT usua_codi,
       asis_fech,
       ROW_NUMBER() OVER (PARTITION BY usua_codi ORDER BY asis_fech DESC) AS orden,
       COUNT(*) OVER (PARTITION BY usua_codi) AS total
FROM asistencias
WHERE asis_fech >= '2026-01-01';

SELECT u.usua_nomb AS nombre, COUNT(*) AS n
FROM usuarios u
JOIN asistencias s ON s.usua_codi = u.usua_codi
GROUP BY u.usua_nomb
HAVING COUNT(*) > 3
ORDER BY n DESC, nombre;

UPDATE abonados
SET abon_esta = 2
WHERE abon_codi IN (
    SELECT f.abon_codi FROM facturas f
    WHERE f.fact_valt > f.fact_valc
    GROUP BY f.abon_codi
    HAVING COUNT(*) >= 3
);

DELETE FROM notas_credito
WHERE ntcr_esta = 0
  AND fact_codi NOT IN (SELECT fact_codi FROM facturas);

INSERT INTO planes (plan_codi, plan_nomb, plan_prec)
SELECT 99, 'Plan temporal', 10.5
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE plan_codi = 99);

SELECT a.abon_codi FROM abonados a
UNION
SELECT ct.abon_codi FROM contratos ct
UNION ALL
SELECT f.abon_codi FROM facturas f;

select   c.clie_codi   ,c.clie_nomb
  from clientes c   -- comentario al final
     /* comentario en medio */ where c.clie_codi between 1 and 100
   and c.clie_nomb like '%a%'   and c.clie_fech is not null;

SELECT c.clie_codi, ci.ciud_nomb
FROM clientes c
INNER JOIN ciudades ci USING (ciud_codi);

SELECT CAST(fact_valt AS DECIMAL(12, 2)) AS valor, SUBSTRING(CAST(fact_codi AS CHAR(10)), 1, 3) AS prefijo
FROM facturas;

SELECT 'O''Brien' AS nombre, 'una -- no es comentario' AS t, 'dos; no corta' AS u;

SELECT COUNT(DISTINCT a.clie_codi) FROM abonados a WHERE a.abon_fech > (SELECT MIN(c.clie_fech) FROM clientes c);

-- Correlaciones y alcances: lo que mas facil daria un falso positivo.

SELECT c.clie_codi FROM clientes c
WHERE EXISTS (SELECT 1 FROM abonados a WHERE a.clie_codi = c.clie_codi AND a.abon_esta = clie_esta);

SELECT c.clie_nomb,
       (SELECT COUNT(*) FROM abonados a
         WHERE a.clie_codi = c.clie_codi
           AND a.abon_codi IN (SELECT f.abon_codi FROM facturas f WHERE f.fact_valt > (
               SELECT AVG(f2.fact_valt) FROM facturas f2 WHERE f2.abon_codi = a.abon_codi))) AS con_deuda
FROM clientes c;

SELECT m.abon_codi, m.saldo
FROM (SELECT abon_codi, SUM(fact_valt - fact_valc) AS saldo FROM facturas GROUP BY abon_codi) m
JOIN abonados a ON a.abon_codi = m.abon_codi
WHERE m.saldo > 0;

SELECT m.cualquier_cosa FROM (SELECT * FROM facturas) m;

SELECT x.total FROM (SELECT f.abon_codi, COUNT(*) AS total FROM facturas f GROUP BY f.abon_codi
                     UNION ALL
                     SELECT n.fact_codi, COUNT(*) FROM notas_credito n GROUP BY n.fact_codi) x;

WITH resumen (codigo, cantidad) AS (
    SELECT clie_codi, COUNT(*) FROM abonados GROUP BY clie_codi
)
SELECT r.codigo, r.cantidad, c.clie_nomb
FROM resumen r JOIN clientes c ON c.clie_codi = r.codigo
WHERE r.cantidad > (SELECT AVG(r2.cantidad) FROM resumen r2);

WITH base AS (SELECT * FROM clientes), activos AS (SELECT b.clie_codi FROM base b WHERE b.clie_esta = 1)
SELECT a.clie_codi, b.lo_que_sea FROM activos a JOIN base b ON b.clie_codi = a.clie_codi;

SELECT a.abon_codi, c.clie_nomb, ci.ciud_nomb
FROM (abonados a JOIN clientes c ON c.clie_codi = a.clie_codi)
LEFT JOIN ciudades ci ON ci.ciud_codi = c.ciud_codi;

SELECT clie_esta AS estado, COUNT(*) AS n FROM clientes GROUP BY estado HAVING n > 1 ORDER BY estado;

SELECT CASE WHEN (SELECT MAX(f.fact_valt) FROM facturas f WHERE f.abon_codi = a.abon_codi) > 100 THEN 'alto' ELSE 'bajo' END AS nivel
FROM abonados a;

SELECT COALESCE((SELECT MAX(n.ntcr_valo) FROM notas_credito n WHERE n.fact_codi = f.fact_codi), 0) AS nota
FROM facturas f;

SELECT a.abon_codi FROM abonados a
WHERE a.abon_codi IN (SELECT f.abon_codi FROM facturas f JOIN (SELECT n.fact_codi FROM notas_credito n WHERE n.ntcr_esta = 1) nc ON nc.fact_codi = f.fact_codi);

SELECT otra.tabla_x.columna_y FROM otra.tabla_x;

SELECT t.y FROM otra.tabla t WHERE t.z = 1;

SELECT c.clie_codi FROM clientes c WHERE c.clie_codi NOT IN (SELECT ct.abon_codi FROM contratos ct WHERE ct.cont_esta = c.clie_esta);
