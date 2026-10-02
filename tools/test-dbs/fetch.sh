#!/usr/bin/env bash
# Descarga Sakila (MySQL oficial) y Pagila (su port a Postgres) a ./data.
# No se versionan: son del proyecto original, no nuestros.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data
if [ ! -f data/sakila-schema.sql ]; then
  curl -fsSL https://downloads.mysql.com/docs/sakila-db.tar.gz | tar -xz -C data --strip-components=1
fi
for f in pagila-schema.sql pagila-data.sql; do
  [ -f "data/$f" ] || curl -fsSL "https://raw.githubusercontent.com/devrimgunduz/pagila/master/$f" -o "data/$f"
done
echo "datos listos en $(pwd)/data"
