-- The VECTOR type.
CREATE TABLE rowly_lines.rl_vector (v VECTOR(3) NOT NULL)
-- ---
-- DEFAULT on procedure parameters.
-- since: 11.8
CREATE PROCEDURE rowly_lines.rl_default(IN a INT DEFAULT 1) SELECT a
