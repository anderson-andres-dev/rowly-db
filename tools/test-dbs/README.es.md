# Bases de datos de prueba

MySQL, MariaDB y PostgreSQL en Docker, cargadas con la base clásica **Sakila** (MySQL y MariaDB) y su port a PostgreSQL, **Pagila**: el mismo videoclub en los tres motores, con tablas, vistas, procedimientos, funciones y triggers. Son el objetivo de las pruebas contra servidor de `crates/server-tests`.

| Motor | Imagen | Puerto | Base |
|---|---|---|---|
| MySQL | `mysql:8.4` | 33306 | `sakila`, `rowly_test` |
| MariaDB | `mariadb:11` | 33307 | `sakila`, `rowly_test` |
| PostgreSQL | `pgvector/pgvector:pg18` | 55432 | `pagila` (schema `rowly_test`) |

Usuario y clave: `rowly` / `rowly` (clave de root en MySQL y MariaDB: `rowly`). Los puertos solo escuchan en `127.0.0.1`.

## Uso

```bash
tools/test-dbs/up.sh          # levanta las tres y carga lo que falte
cargo test -p rowly-server-tests -- --ignored --test-threads=1
docker compose -f tools/test-dbs/docker-compose.yml down   # detiene; los datos se conservan
```

Los datos viven en volúmenes con nombre: sobreviven a `down`, y `down -v` los borra. `up.sh` es idempotente: se puede repetir cuando se quiera levantarlas. Descarga Sakila y Pagila en `tools/test-dbs/data/` (no se versionan: no son nuestras).

`rowly_test` tiene una tabla centinela que las pruebas de seguridad comprueban después de ejecutar texto hostil. Las pruebas crean sus propias rutinas por el mismo camino que la app (primero el guard, luego el driver).

## Líneas de versión

`lines.sh` levanta un servidor vacío por cada extremo de cada línea de versión de `lines.json` (SQL_ENGINE.es.md §5), con sus datos en memoria. El test `version_lines` demuestra que cada línea se distingue de la anterior, con los fixtures de `tests/sql/<motor>/<línea>/`.

```bash
tools/test-dbs/lines.sh up postgres      # o mysql, mariadb; sin argumento: todos
cargo test -p rowly-server-tests --test version_lines -- --ignored --test-threads=1
tools/test-dbs/lines.sh down postgres
tools/test-dbs/lines.sh list             # líneas, imágenes y puertos
```

Se descargan de `public.ecr.aws/docker/library`, el espejo público de las imágenes oficiales, para que veinte servidores no choquen con el límite de descargas anónimas de Docker Hub. Los puertos empiezan en 34001 (MySQL), 34101 (MariaDB) y 34201 (PostgreSQL). Clave de root (o de `postgres`): `rowly`. Levantar un motor entero de una vez ocupa unos 3 GB de RAM con MySQL y menos con los demás.

## Pruebas contra servidor

- `the_routines_corpus_…`: un corpus de procedures, funciones, triggers y eventos (`crates/server-tests/corpus`) pasa por el guard y se crea y se llama en cada servidor.
- `the_definitions_the_server_returns_…`: todas las definiciones que los servidores devuelven para Sakila y Pagila (`SHOW CREATE …`, `pg_get_functiondef`) deben ser aceptadas por el guard.
- `no_text_the_guard_accepts_…` y `fuzzing_the_guard_…`: textos con una segunda sentencia escondida corren en el servidor real; si el guard aceptó alguno, la tabla centinela debe seguir intacta. El fuzz muta rutinas válidas; `ROWLY_FUZZ_CASES`, `ROWLY_FUZZ_SEED` y `ROWLY_ENGINES=mysql,postgres` lo ajustan.
