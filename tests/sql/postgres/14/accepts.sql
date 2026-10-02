-- OUT parameters in procedures.
CREATE PROCEDURE rowly_lines.rl_out(OUT a int) LANGUAGE plpgsql AS $$ BEGIN a := 1; END $$
-- ---
-- Multirange types.
SELECT '{[1,2]}'::int4multirange
