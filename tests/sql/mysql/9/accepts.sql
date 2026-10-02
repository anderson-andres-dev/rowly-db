-- The VECTOR type.
CREATE TABLE rowly_lines.rl_vector (v VECTOR(3))
-- ---
-- Vector functions. VECTOR_DIM returns an integer: reading a VECTOR column
-- itself is a separate driver gap (SQL_ENGINE.md §9).
SELECT VECTOR_DIM(STRING_TO_VECTOR('[1,2,3]'))
