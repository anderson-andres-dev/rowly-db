-- Virtual generated columns.
CREATE TABLE rowly_lines.rl_virtual (a int, b int GENERATED ALWAYS AS (a * 2) VIRTUAL)
-- ---
-- OLD and NEW in RETURNING.
UPDATE rowly_lines.rl_m SET id = id RETURNING old.id, new.id
