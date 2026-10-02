#!/usr/bin/env bash
# Levanta (y la primera vez, carga) las bases de prueba. Idempotente: se puede
# repetir cuando se quiera; los datos persisten en volumenes.
#   ./up.sh            levanta y carga lo que falte
#   ./up.sh reset      reinicia solo rowly_test (tabla centinela y rutinas)
set -euo pipefail
cd "$(dirname "$0")"
./fetch.sh >/dev/null
docker compose up -d

for svc in mysql mariadb postgres; do
  printf "esperando %s " "$svc"
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "rowly-test-$svc")" = healthy ]; do printf .; sleep 2; done
  echo " listo"
done

for svc in mysql mariadb; do
  cli=mysql; [ "$svc" = mariadb ] && cli=mariadb
  box="rowly-test-$svc"
  if ! docker exec "$box" $cli -uroot -prowly -N -e "SELECT 1 FROM information_schema.schemata WHERE schema_name='sakila'" 2>/dev/null | grep -q 1; then
    echo "cargando Sakila en $svc"
    docker exec "$box" sh -c "$cli -uroot -prowly < /data/sakila-schema.sql && $cli -uroot -prowly < /data/sakila-data.sql"
  fi
  docker exec "$box" sh -c "$cli -uroot -prowly < /seed/rowly_test.mysql.sql"
done
# MySQL muestra el cuerpo de una rutina ajena (SHOW CREATE) solo con este privilegio.
docker exec rowly-test-mysql mysql -uroot -prowly -e "GRANT SHOW_ROUTINE ON *.* TO 'rowly'@'%'" 2>/dev/null

pg() { docker exec -i rowly-test-postgres psql -v ON_ERROR_STOP=1 -q -U rowly "$@"; }
if ! pg -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='pagila'" | grep -q 1; then
  echo "cargando Pagila en postgres"
  pg -d postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres SUPERUSER; END IF; END \$\$"
  pg -d postgres -c "CREATE DATABASE pagila"
  pg -d pagila -f /data/pagila-schema.sql
  pg -d pagila -f /data/pagila-data.sql
fi
pg -d pagila -f /seed/rowly_test.postgres.sql

cat <<MSG

Listo. Conexiones (usuario y clave: rowly / rowly):
  MySQL     127.0.0.1:33306  bases: sakila, rowly_test
  MariaDB   127.0.0.1:33307  bases: sakila, rowly_test
  Postgres  127.0.0.1:55432  base:  pagila (schema rowly_test)
MSG
