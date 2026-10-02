-- MERGE.
MERGE INTO rowly_lines.rl_m t USING (SELECT 2 AS id) s ON t.id = s.id WHEN NOT MATCHED THEN INSERT VALUES (s.id)
