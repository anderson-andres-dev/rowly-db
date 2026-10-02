#!/usr/bin/env bash
# Servidores sin datos, uno por cada extremo de cada linea de version
# (lines.json), para demostrar que cada linea existe (SQL_ENGINE.md, §5 y §10).
# Los datos van en memoria: bajar un servidor lo borra.
#   ./lines.sh up [motor...]     levanta los de esos motores (todos si no se dice)
#   ./lines.sh down [motor...]   los baja
#   ./lines.sh list              lineas, imagenes y puertos
set -euo pipefail
cd "$(dirname "$0")"

# "motor linea imagen puerto" por cada servidor de lines.json.
probes() {
  python3 - "$@" <<'PY'
import json, sys
registry = json.load(open("lines.json"))
wanted = sys.argv[1:] or list(registry["engines"])
for engine in wanted:
    if engine not in registry["engines"]:
        sys.exit(f"motor desconocido: {engine}")
    for line in registry["engines"][engine]:
        for probe in line["probes"]:
            print(engine, line["line"], f'{registry["registry"]}/{probe["image"]}', probe["port"])
PY
}

name() { echo "rowly-line-$1-${3##*:}"; }

up() {
  probes "$@" | while read -r engine line image port; do
    box=$(name "$engine" "$line" "$image")
    if [ -n "$(docker ps -aq -f name="^$box$")" ]; then docker start "$box" >/dev/null; continue; fi
    case "$engine" in
      mysql|mariadb)
        docker run -d --name "$box" -p "127.0.0.1:$port:3306" --tmpfs /var/lib/mysql \
          -e MYSQL_ROOT_PASSWORD=rowly -e MARIADB_ROOT_PASSWORD=rowly "$image" \
          --log-bin-trust-function-creators=1 >/dev/null ;;
      postgres)
        docker run -d --name "$box" -p "127.0.0.1:$port:5432" --tmpfs /var/lib/postgresql \
          -e POSTGRES_PASSWORD=rowly "$image" >/dev/null ;;
    esac
  done
  probes "$@" | while read -r engine line image port; do
    box=$(name "$engine" "$line" "$image")
    printf "esperando %s " "$box"
    case "$engine" in
      mysql)    ready=(mysqladmin ping -h 127.0.0.1 -uroot -prowly --silent) ;;
      mariadb)  ready=(sh -c 'mariadb-admin ping -h 127.0.0.1 -uroot -prowly --silent 2>/dev/null || mysqladmin ping -h 127.0.0.1 -uroot -prowly --silent') ;;
      postgres) ready=(pg_isready -h 127.0.0.1 -U postgres) ;;
    esac
    until docker exec "$box" "${ready[@]}" >/dev/null 2>&1; do printf .; sleep 2; done
    echo " listo (127.0.0.1:$port)"
  done
}

down() {
  probes "$@" | while read -r engine line image _; do
    docker rm -f "$(name "$engine" "$line" "$image")" >/dev/null 2>&1 || true
  done
}

case "${1:-}" in
  up) shift; up "$@" ;;
  down) shift; down "$@" ;;
  list) probes | column -t ;;
  *) sed -n '2,7p' "$0"; exit 1 ;;
esac
