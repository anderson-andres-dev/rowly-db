-- SHOW SLAVE STATUS is removed: SHOW REPLICA STATUS.
SHOW SLAVE STATUS
-- ---
-- SHOW MASTER STATUS is removed: SHOW BINARY LOG STATUS.
SHOW MASTER STATUS
-- ---
-- mysql_native_password is no longer loaded by default.
CREATE USER 'rl_native'@'localhost' IDENTIFIED WITH mysql_native_password BY 'rl'
