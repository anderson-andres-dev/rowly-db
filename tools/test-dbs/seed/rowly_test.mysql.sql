-- Base propia para las pruebas contra servidor real (MySQL y MariaDB): una
-- tabla centinela que las pruebas de seguridad comprueban intacta, y un
-- usuario con permisos. Las rutinas se crean desde las pruebas, por el mismo
-- camino que la app.
DROP DATABASE IF EXISTS rowly_test;
CREATE DATABASE rowly_test CHARACTER SET utf8mb4;
CREATE TABLE rowly_test.canary (id INT PRIMARY KEY, note VARCHAR(40) NOT NULL);
INSERT INTO rowly_test.canary VALUES (1, 'uno'), (2, 'dos'), (3, 'tres');
CREATE TABLE rowly_test.log (id INT AUTO_INCREMENT PRIMARY KEY, msg VARCHAR(200), at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
GRANT ALL PRIVILEGES ON rowly_test.* TO 'rowly'@'%';
GRANT ALL PRIVILEGES ON sakila.* TO 'rowly'@'%';

FLUSH PRIVILEGES;
