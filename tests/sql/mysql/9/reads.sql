-- A VECTOR column in a result, shown as the text STRING_TO_VECTOR reads.
-- expect: [1,2,3]
SELECT STRING_TO_VECTOR('[1,2,3]') AS v
-- ---
-- A table with a VECTOR column, read whole.
-- expect: 1
SELECT * FROM rowly_lines.rl_vectors
-- ---
-- The VECTOR column itself.
-- expect: [1,2.5,-3]
SELECT v FROM rowly_lines.rl_vectors
