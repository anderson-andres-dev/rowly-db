-- JSON_TABLE.
SELECT * FROM JSON_TABLE('[1,2]'::jsonb, '$[*]' COLUMNS (a int PATH '$')) AS jt
-- ---
-- MERGE ... RETURNING.
MERGE INTO rowly_lines.rl_m t USING (SELECT 3 AS id) s ON t.id = s.id WHEN NOT MATCHED THEN INSERT VALUES (s.id) RETURNING t.id
