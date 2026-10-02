#!/usr/bin/env bash
# Levanta (y la primera vez, carga) las bases de prueba. Idempotente: se puede
# repetir cuando se quiera; los datos persisten en volumenes.
#   ./up.sh                      levanta y carga lo que falte (los tres motores)
#   ./up.sh mysql=8.0.46 ...     solo esos motores, con esa version de `verified`
#                                en lines.json (sin version: la de por defecto)
#   ./up.sh reset                reinicia solo rowly_test (tabla centinela y rutinas)
# Cambiar la version de un motor que ya tiene datos exige `docker compose down -v`.
set -euo pipefail
cd "$(dirname "$0")"
./fetch.sh >/dev/null

services=()
for arg in "$@"; do
  [ "$arg" = reset ] && continue
  engine=${arg%%=*}
  case "$engine" in mysql|mariadb|postgres) ;; *) echo "motor desconocido: $engine" >&2; exit 1 ;; esac
  services+=("$engine")
  if [ "$arg" != "$engine" ]; then
    image=$(python3 -c 'import json,sys; d=json.load(open("lines.json")); e=[x for x in d["verified"][sys.argv[1]] if x["version"]==sys.argv[2]]; sys.exit(f"{sys.argv[1]} {sys.argv[2]} no esta en verified de lines.json") if not e else print(d["registry"]+"/"+e[0]["image"]+"@"+e[0]["digest"])' "$engine" "${arg#*=}")
    export "ROWLY_$(echo "$engine" | tr a-z A-Z)_IMAGE=$image"
  fi
done
[ ${#services[@]} -eq 0 ] && services=(mysql mariadb postgres)
docker compose up -d "${services[@]}"
selected() { [[ " ${services[*]} " == *" $1 "* ]]; }

for svc in "${services[@]}"; do
  printf "esperando %s " "$svc"
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "rowly-test-$svc")" = healthy ]; do printf .; sleep 2; done
  echo " listo"
done

for svc in mysql mariadb; do
  selected "$svc" || continue
  cli=mysql; [ "$svc" = mariadb ] && cli=mariadb
  box="rowly-test-$svc"
  if ! docker exec "$box" $cli -uroot -prowly -N -e "SELECT 1 FROM information_schema.schemata WHERE schema_name='sakila'" 2>/dev/null | grep -q 1; then
    echo "cargando Sakila en $svc"
    docker exec "$box" sh -c "$cli -uroot -prowly < /data/sakila-schema.sql && $cli -uroot -prowly < /data/sakila-data.sql"
  fi
  docker exec "$box" sh -c "$cli -uroot -prowly < /seed/rowly_test.mysql.sql"
done
# MySQL muestra el cuerpo de una rutina ajena (SHOW CREATE) solo con este privilegio.
if selected mysql; then
  docker exec rowly-test-mysql mysql -uroot -prowly -e "GRANT SHOW_ROUTINE ON *.* TO 'rowly'@'%'" 2>/dev/null
fi

if selected postgres; then
  pg() { docker exec -i rowly-test-postgres psql -v ON_ERROR_STOP=1 -q -U rowly "$@"; }
  if ! pg -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='pagila'" | grep -q 1; then
    echo "cargando Pagila en postgres"
    pg -d postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres SUPERUSER; END IF; END \$\$"
    pg -d postgres -c "CREATE DATABASE pagila"
    pg -d pagila -f /data/pagila-schema.sql
    pg -d pagila -f /data/pagila-data.sql
  fi
  pg -d pagila -f /seed/rowly_test.postgres.sql
fi

cat <<MSG

Listo. Conexiones (usuario y clave: rowly / rowly):
  MySQL     127.0.0.1:33306  bases: sakila, rowly_test
  MariaDB   127.0.0.1:33307  bases: sakila, rowly_test
  Postgres  127.0.0.1:55432  base:  pagila (schema rowly_test)
MSG
