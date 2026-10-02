-- drop: DROP PROCEDURE IF EXISTS rt_basic
-- call: CALL rt_basic()
CREATE PROCEDURE rt_basic() BEGIN SELECT 1; END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_params
-- call: CALL rt_params(3, @b, @c)
CREATE PROCEDURE rt_params(IN a INT, OUT b INT, INOUT c VARCHAR(20))
    COMMENT 'IN, OUT e INOUT'
BEGIN
    SET b = a * 2;
    SET c = CONCAT(IFNULL(c, ''), '-', a);
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_cursor
-- call: CALL rt_cursor(@total)
CREATE PROCEDURE rt_cursor(OUT total INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v INT;
    DECLARE cur CURSOR FOR SELECT id FROM canary ORDER BY id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    SET total = 0;
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET total = total + v;
    END LOOP read_loop;
    CLOSE cur;
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_flow
-- call: CALL rt_flow(7)
CREATE PROCEDURE rt_flow(IN n INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE acc INT DEFAULT 0;
    IF n > 10 THEN
        SET acc = 1;
    ELSEIF n > 5 THEN
        SET acc = 2;
    ELSE
        SET acc = 3;
    END IF;

    CASE acc
        WHEN 1 THEN SET i = 10;
        WHEN 2 THEN SET i = 20;
        ELSE SET i = 30;
    END CASE;

    WHILE i < 35 DO
        SET i = i + 1;
    END WHILE;

    REPEAT
        SET i = i - 2;
    UNTIL i < 30 END REPEAT;

    outer_block: BEGIN
        inner_block: BEGIN
            IF i > 0 THEN LEAVE inner_block; END IF;
            SET acc = 99;
        END inner_block;
        SET acc = acc + 1;
    END outer_block;

    SELECT acc, i, CASE WHEN acc > 1 THEN 'alto' ELSE 'bajo' END AS nivel;
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_tx
-- call: CALL rt_tx()
CREATE PROCEDURE rt_tx()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    INSERT INTO log (msg) VALUES ('tx');
    COMMIT;
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_dynamic
-- call: CALL rt_dynamic('canary')
CREATE PROCEDURE rt_dynamic(IN tabla VARCHAR(64))
BEGIN
    SET @sql = CONCAT('SELECT COUNT(*) FROM ', tabla);
    PREPARE st FROM @sql;
    EXECUTE st;
    DEALLOCATE PREPARE st;
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_names
-- call: CALL rt_names()
CREATE PROCEDURE rt_names()
BEGIN
    SELECT c.id AS begin, c.note AS end FROM canary c;
    SELECT begin, end FROM (SELECT 1 AS begin, 2 AS end) AS t;
    SELECT CASE WHEN 1 = 1 THEN 'begin' ELSE 'end' END AS x, 'END; DROP TABLE t' AS s;
    -- BEGIN y END en un comentario;
    /* BEGIN ; END */
    # BEGIN
    SELECT 'it\'s; fine' AS q, "dq; END" AS d;
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_with
-- call: CALL rt_with()
CREATE PROCEDURE rt_with()
BEGIN
    WITH ids AS (SELECT id FROM canary) SELECT COUNT(*) FROM ids;
    INSERT INTO canary (id, note) VALUES (50, 'x') ON DUPLICATE KEY UPDATE note = VALUES(note);
    DELETE FROM canary WHERE id = 50;
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_signal
-- call: CALL rt_signal(1)
CREATE PROCEDURE rt_signal(IN n INT)
BEGIN
    IF n < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'negativo';
    END IF;
    SELECT n;
END
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_single
-- call: CALL rt_single()
CREATE PROCEDURE rt_single() SELECT COUNT(*) FROM canary
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_replace
-- call: CALL rt_replace()
CREATE PROCEDURE rt_replace() REPLACE INTO canary VALUES (1, 'uno')
-- ---
-- drop: DROP PROCEDURE IF EXISTS rt_chars
-- call: CALL rt_chars()
CREATE DEFINER = CURRENT_USER PROCEDURE rt_chars()
    SQL SECURITY INVOKER
    READS SQL DATA
    COMMENT 'caracteristicas'
BEGIN
    SELECT 1;
END
-- ---
-- drop: DROP FUNCTION IF EXISTS rt_fn_case
-- call: SELECT rt_fn_case(5)
CREATE FUNCTION rt_fn_case(n INT) RETURNS VARCHAR(10) DETERMINISTIC
    RETURN CASE WHEN n > 3 THEN 'mayor' ELSE 'menor' END
-- ---
-- drop: DROP FUNCTION IF EXISTS rt_fn_loop
-- call: SELECT rt_fn_loop(4)
CREATE FUNCTION rt_fn_loop(n INT) RETURNS INT DETERMINISTIC
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE s INT DEFAULT 0;
    WHILE i < n DO
        SET i = i + 1;
        SET s = s + i;
    END WHILE;
    RETURN s;
END
-- ---
-- drop: DROP FUNCTION IF EXISTS rt_fn_select
-- call: SELECT rt_fn_select()
CREATE FUNCTION rt_fn_select() RETURNS INT READS SQL DATA
    RETURN (SELECT COUNT(*) FROM canary WHERE id > 0)
-- ---
-- drop: DROP TRIGGER IF EXISTS rt_trg_single
-- call: INSERT INTO log (msg) VALUES ('disparo')
CREATE TRIGGER rt_trg_single BEFORE INSERT ON log FOR EACH ROW SET NEW.msg = CONCAT('[t] ', NEW.msg)
-- ---
-- drop: DROP TRIGGER IF EXISTS rt_trg_block
-- call: UPDATE canary SET note = note WHERE id = 1
CREATE TRIGGER rt_trg_block AFTER UPDATE ON canary FOR EACH ROW
BEGIN
    IF OLD.note <> NEW.note THEN
        INSERT INTO log (msg) VALUES (CONCAT('cambio ', OLD.id));
    END IF;
END
-- ---
-- drop: DROP EVENT IF EXISTS rt_event
CREATE EVENT rt_event ON SCHEDULE EVERY 1 DAY DISABLE DO DELETE FROM log WHERE at < NOW() - INTERVAL 30 DAY
-- ---
-- drop: DROP EVENT IF EXISTS rt_event_block
CREATE EVENT rt_event_block ON SCHEDULE EVERY 1 DAY DISABLE DO
BEGIN
    DELETE FROM log WHERE id < 0;
    DELETE FROM log WHERE id < -1;
END
