-- SQL/JSON constructors.
SELECT JSON_OBJECT('a' VALUE 1)
-- ---
-- IS JSON.
SELECT '{}' IS JSON
