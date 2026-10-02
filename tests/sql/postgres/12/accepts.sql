-- Stored generated columns.
CREATE TABLE rowly_lines.rl_generated (a int, b int GENERATED ALWAYS AS (a * 2) STORED)
