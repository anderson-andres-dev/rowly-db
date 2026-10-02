-- Base propia para las pruebas contra servidor real (Postgres): schema
-- rowly_test con una tabla centinela. Las rutinas las crean las pruebas.
DROP SCHEMA IF EXISTS rowly_test CASCADE;
CREATE SCHEMA rowly_test;
CREATE TABLE rowly_test.canary (id int PRIMARY KEY, note text NOT NULL);
INSERT INTO rowly_test.canary VALUES (1, 'uno'), (2, 'dos'), (3, 'tres');
CREATE TABLE rowly_test.log (id serial PRIMARY KEY, msg text, at timestamptz DEFAULT now());
