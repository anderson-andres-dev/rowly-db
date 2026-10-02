DROP DATABASE IF EXISTS rowly_lines
-- ---
CREATE DATABASE rowly_lines
-- ---
DROP USER IF EXISTS 'rl_native'@'localhost'
-- ---
CREATE TABLE rowly_lines.rl_vectors (id INT, v VECTOR(3))
-- ---
INSERT INTO rowly_lines.rl_vectors VALUES (1, STRING_TO_VECTOR('[1,2.5,-3]'))
