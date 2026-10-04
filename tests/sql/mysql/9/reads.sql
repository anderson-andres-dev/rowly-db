-- A VECTOR column in a result, shown as the text STRING_TO_VECTOR reads.
-- Known gap (SQL_ENGINE §9): the published sqlx 0.8.6 cannot read the column
-- type 0xf2 (fixed upstream in transact-rs/sqlx#4441, in no release yet).
-- expect: [1,2,3]
-- gap: unknown column type 0xf2
SELECT STRING_TO_VECTOR('[1,2,3]') AS v
-- ---
-- A table with a VECTOR column, read whole.
-- expect: 1
-- gap: unknown column type 0xf2
SELECT * FROM rowly_lines.rl_vectors
-- ---
-- The VECTOR column itself.
-- expect: [1,2.5,-3]
-- gap: unknown column type 0xf2
SELECT v FROM rowly_lines.rl_vectors
