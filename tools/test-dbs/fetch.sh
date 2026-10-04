#!/usr/bin/env bash
# Descarga Sakila (MySQL oficial) y Pagila (su port a Postgres) a ./data, en
# las versiones fijadas por lines.json (`datasets`), y comprueba su SHA-256.
# No se versionan: son del proyecto original, no nuestros. Un archivo que no
# coincide se vuelve a descargar; si aun asi no coincide, se detiene.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data

dataset() { python3 -c 'import json,sys; d=json.load(open("lines.json"))["datasets"][sys.argv[1]]; print(d[sys.argv[2]])' "$@"; }
expected() { python3 -c 'import json,sys; print(json.load(open("lines.json"))["datasets"][sys.argv[1]]["sha256"][sys.argv[2]])' "$@"; }
matches() { [ -f "data/$2" ] && [ "$(sha256sum "data/$2" | cut -d' ' -f1)" = "$(expected "$1" "$2")" ]; }

if ! matches sakila sakila-schema.sql || ! matches sakila sakila-data.sql; then
  curl -fsSL "$(dataset sakila url)" | tar -xz -C data --strip-components=1
fi
commit=$(dataset pagila commit)
repository=$(dataset pagila repository)
for f in pagila-schema.sql pagila-data.sql; do
  matches pagila "$f" || curl -fsSL "https://raw.githubusercontent.com/$repository/$commit/$f" -o "data/$f"
done

for pair in sakila:sakila-schema.sql sakila:sakila-data.sql pagila:pagila-schema.sql pagila:pagila-data.sql; do
  matches "${pair%%:*}" "${pair#*:}" || { echo "data/${pair#*:} no coincide con el SHA-256 de lines.json" >&2; exit 1; }
done
echo "datos listos en $(pwd)/data (Pagila ${commit:0:10})"
