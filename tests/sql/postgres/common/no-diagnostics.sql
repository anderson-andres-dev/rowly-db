-- Validas en PostgreSQL.

SELECT clie_codi::text AS codigo, clie_fech::date AS fecha FROM clientes WHERE clie_nomb ILIKE '%ana%';

SELECT DISTINCT ON (a.clie_codi) a.clie_codi, a.abon_codi, a.abon_fech
FROM abonados a
ORDER BY a.clie_codi, a.abon_fech DESC;

INSERT INTO planes (plan_codi, plan_nomb, plan_prec) VALUES (1, 'Básico', 10)
ON CONFLICT (plan_codi) DO UPDATE SET plan_prec = EXCLUDED.plan_prec
RETURNING plan_codi;

DELETE FROM notas_credito WHERE ntcr_esta = 0 RETURNING ntcr_codi, fact_codi;

UPDATE abonados a
SET abon_esta = 0
FROM clientes c
WHERE c.clie_codi = a.clie_codi AND c.clie_esta = 0;

SELECT usua_codi,
       COUNT(*) FILTER (WHERE asis_tipo = 1) AS entradas,
       string_agg(asis_hora::text, ', ' ORDER BY asis_hora) AS horas
FROM asistencias
WHERE asis_fech >= now() - interval '7 days'
GROUP BY usua_codi;

SELECT * FROM facturas WHERE abon_codi = ANY (ARRAY[1, 2, 3]);

SELECT g.n, c.clie_nomb
FROM generate_series(1, 10) AS g(n)
LEFT JOIN clientes c ON c.clie_codi = g.n;

SELECT c.clie_codi, ult.fact_faut
FROM clientes c
CROSS JOIN LATERAL (
    SELECT f.fact_faut FROM facturas f
    JOIN abonados a ON a.abon_codi = f.abon_codi
    WHERE a.clie_codi = c.clie_codi
    ORDER BY f.fact_faut DESC
    LIMIT 1
) ult;

WITH RECURSIVE numeros(n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 10
)
SELECT n FROM numeros;

SELECT '{"a": {"b": 1}}'::jsonb -> 'a' ->> 'b' AS b, '{"a": 1}'::jsonb @> '{"a": 1}' AS contiene;

SELECT EXTRACT(EPOCH FROM now()) AS segundos, date_trunc('month', now()) AS mes;

SELECT 'C:\' AS ruta, E'linea\nsiguiente' AS escapada, $$texto con 'comillas'$$ AS dolar;

SELECT * FROM clientes WHERE clie_codi = $1;

SELECT "clie_codi" FROM "clientes";

SELECT * FROM facturas FOR UPDATE SKIP LOCKED;

SELECT a.clie_codi, count(*)
FROM abonados a
GROUP BY GROUPING SETS ((a.clie_codi), ());

CREATE TEMP TABLE tmp_mora AS SELECT abon_codi FROM facturas WHERE fact_valt > fact_valc;

SELECT t.abon_codi FROM tmp_mora t;

CREATE OR REPLACE FUNCTION saldo(p integer) RETURNS numeric AS $fn$
BEGIN
    RETURN (SELECT sum(fact_valt - fact_valc) FROM facturas WHERE abon_codi = p);
END;
$fn$ LANGUAGE plpgsql;

DO $$ BEGIN RAISE NOTICE 'hola'; END $$;

VACUUM ANALYZE facturas;

COPY clientes TO STDOUT WITH (FORMAT csv, HEADER);

SELECT a.abon_codi, sum(f.fact_valt) OVER w AS acumulado
FROM abonados a JOIN facturas f ON f.abon_codi = a.abon_codi
WINDOW w AS (PARTITION BY a.abon_codi ORDER BY f.fact_faut);

SELECT * FROM clientes WHERE clie_nomb SIMILAR TO '(A|B)%';

SELECT * FROM clientes LIMIT 10 OFFSET 20;

SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'app';

SELECT n FROM generate_series(1, 5) n;

SELECT c.clie_codi, u.fact_faut FROM clientes c, LATERAL (SELECT f.fact_faut FROM facturas f WHERE f.abon_codi = c.clie_codi LIMIT 1) u;
