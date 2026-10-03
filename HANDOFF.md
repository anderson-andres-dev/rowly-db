# HANDOFF — Rowly DB: quitar la dependencia del fork de sqlx (corte del 2026-10-03)

Nota temporal de traspaso entre sesiones. Vive solo en la rama
`handoff/consolidacion` (sin PR, no se fusiona). No es documentación del
producto.

**Tarea inmediata y única:** eliminar por completo la dependencia de Rowly del
fork `anderson-andres-dev/sqlx`. Ningún otro frente hasta cerrarla.

## Decisiones definitivas (del usuario)

- Rowly **no** depende de forks propios de sqlx.
- Rowly **no** depende de ramas Git, SHAs no publicados ni parches mantenidos
  por nosotros para sqlx (ni para otra dependencia). Solo versiones oficiales
  publicadas, salvo autorización explícita.
- **No** se reintroduce el fork para recuperar VECTOR de MySQL 9. Si una
  release oficial no lo lee, queda como gap documentado.
- **No** se continúa `server-transaction-status`.
- **No** se abre ningún otro frente (hardening, M4, M5, E0–E4) hasta cerrar la
  limpieza de sqlx oficial.
- No borrar ramas del fork por ahora: solo están documentadas abajo.

Reglas de siempre: PRs pequeños y apilados, sin push a main/develop, sin
fusionar ni publicar, cuenta `gh` `anderson-andres-dev`, commits **sin**
`Co-Authored-By`, PRs sin el pie "Generated with Claude Code", respuestas en
español con "tú", documentación pública en inglés + `.es.md`.

## Dónde está todo

| Qué | Estado |
|---|---|
| Rama actual del repo local | `fix/sqlx-oficial` |
| HEAD de `fix/sqlx-oficial` | `d559093` (igual que `feature/c5-guias`, cima de C5, PR #55); los cambios de la limpieza están **sin commit** en el árbol de trabajo |
| Base de la limpieza | `feature/c5-guias` / PR #55 |
| C0–C5 | Cerradas. PRs #39–#55 apilados, en verde, sin fusionar |
| M0–M3 | Cerradas |
| M4, M5, E0–E4 | No tocar todavía |
| Hardening post-C5 | Pausado. WIP local sin publicar en `feature/h1-sesion-por-ventana` (`edbd6e1`, encima de `feature/c5-guias`): lectura de cadenas según el modo de la sesión y el literal del SQL generado del grid según la sesión (corrige un bug real: con NO_BACKSLASH_ESCAPES, editar `C:\x` guardaba `C:\\x`). No usa el fork. No retomar hasta cerrar esta limpieza |

Pila: `develop ← #39 … ← #50 C3 ← #43 M1 ← #47 ← #49 M2 ← #51 C4 ← #52 M3 ← #53 ← #54 ← #55 (feature/c5-guias)`.

## sqlx

- **Hoy en `develop`, `main` y las ramas de #39–#55:** `[patch.crates-io]`
  apunta los crates `sqlx`, `sqlx-core`, `sqlx-macros`, `sqlx-macros-core`,
  `sqlx-mysql` y `sqlx-postgres` a `https://github.com/anderson-andres-dev/sqlx`
  rev `df7b88024b73bb9c4d346cfffb52106c11c27f41` (rama `mysql-vector-0.8.6`:
  sqlx 0.8.6 más la lectura de VECTOR de MySQL 9). Lo introdujo el commit de
  Rowly `d96e6b2` ("MySQL 9: leer columnas VECTOR").
- **En `fix/sqlx-oficial` (sin commit):**
  - `Cargo.toml`: quitado el bloque `[patch.crates-io]` entero, con su
    comentario. Queda `sqlx = { version = "0.8", … }` del workspace.
  - Versión oficial elegida: **sqlx 0.8.6 de crates.io** (la misma base que el
    fork). La 0.9.0 publicada existe, pero sería una migración mayor, fuera de
    esta limpieza.
  - `Cargo.lock`: cambio mínimo. Solo los 6 crates de sqlx pasan de
    `git+…anderson-andres-dev/sqlx?rev=df7b880…` a
    `registry+https://github.com/rust-lang/crates.io-index` (0.8.6, con sus
    checksums); 0 apariciones de `anderson-andres-dev`. Ninguna otra
    dependencia cambió (un `cargo update` general se deshizo; no repetirlo).
- **Cambios sin commit en `fix/sqlx-oficial`** (todos de esta limpieza):
  - `Cargo.toml`, `Cargo.lock` (arriba).
  - `crates/server-tests/tests/version_lines.rs`: marca `-- gap: <error>` en
    los fixtures `reads.sql`. Una lectura marcada **tiene que fallar** con ese
    error; si deja de fallar, la prueba lo dice para quitar la marca. Cuenta
    los huecos que siguen fallando igual.
  - `tests/sql/mysql/9/reads.sql`: las 3 lecturas de VECTOR llevan
    `-- gap: unknown column type 0xf2`, con un encabezado que explica por qué.
  - `tests/sql/README.md`: documenta `-- gap:`.
  - `tests/sql/coverage.json`: D8 pasa a `partial`, `gapEngines: ["mysql"]` y
    `gap` explicado.
  - `SQL_ENGINE.md` y `SQL_ENGINE.es.md`: §8 sin la fila "sqlx sale de un
    fork"; §9 con un P2 nuevo (VECTOR de MySQL 9 no se lee con sqlx oficial;
    Rowly solo usa versiones publicadas; se cierra con la primera release que
    lo traiga); D8 menciona el hueco; la fila P3 de VECTOR de MariaDB ya no
    dice que los de MySQL 9 se ven como `[1,2.5,-3]`.
  - `crates/drivers/mysql/src/lib.rs`: el comentario de `vector_text` dice que
    aplica cuando una release publicada lea el tipo.

## MySQL 9 VECTOR

**Gap documentado (P2).** sqlx 0.8.6 publicado no conoce el tipo de columna
0xf2: un resultado con una columna VECTOR falla entero con "encountered
unexpected or invalid data: unknown column type 0xf2". El arreglo
(transact-rs/sqlx#4441) se fusionó upstream el 2026-10-03, pero no está en
ninguna versión publicada (la última es 0.9.0, de mayo de 2026). Crear la
columna, filtrar por ella o leer otras columnas de la tabla funciona. Comprobado
en local: con sqlx oficial fallan exactamente las 3 lecturas de VECTOR en
MySQL 9.0.1 y 9.7.2, y nada más; con la marca `-- gap:` el test de líneas de
MySQL pasa.

## server-transaction-status

Abandonado. Se empujaron al fork, en la rama `rowly/server-transaction-status`,
dos commits (`c2e0f07`, `64fafab`) con accesores públicos de solo lectura.
**Ningún commit de Rowly llegó a depender de esa rev:** el cambio de rev en
`Cargo.toml` fue solo del árbol de trabajo y se deshizo. El propósito era el
aviso de transacción abierta del hardening (sesión por ventana). Ese aviso no
se resuelve tocando sqlx: si la API pública no da el estado con exactitud,
queda como P2/limitación (decisión pendiente del hardening, no de esta tarea).

## Ramas del fork `anderson-andres-dev/sqlx` que conozco

- `mysql-vector-0.8.6` (contiene `df7b880`; de ella depende hoy `develop`).
- `rowly/server-transaction-status` (`c2e0f07`, `64fafab`; empujada en la
  sesión del 2026-10-03; nadie depende de ella).
- Además, las ramas que el fork trae de upstream (`main`, `ab/*`, …).

No se borra ninguna en esta etapa.

## Pruebas ya ejecutadas en local (en `fix/sqlx-oficial`, con sqlx oficial)

- `cargo fmt --all --check`: limpio.
- `cargo clippy --workspace --all-targets --locked -- -D warnings`: 0 avisos.
- `cargo test --workspace --locked`: todo verde.
- `npm run check`: solo los 3 errores de `app/src/routes/dev-preview` (local,
  fuera de git). `npm test`: 1180 pasan, 1 falla solo en local por
  `dev-preview`. `npm run build`: bien.
- `node tools/inventory/tests.mjs --check`: 131 archivos, 1405 tests.
  `node tools/inventory/coverage.mjs`: al día (21 cubiertas, 8 parciales, 3
  huecos). `node tools/test-dbs/window.mjs`: bien.
- Suites reales (`safety`, `analysis`, `generated`, `contract`): 23/23
  (7 + 11 + 1 + 4) en MySQL 8.4.11, MariaDB 11.8.9 y PostgreSQL 18.6 locales.
- `version_lines` de MySQL (probes 8.4.11, 9.0.1, 9.7.2 levantados con
  `tools/test-dbs/lines.sh up mysql`, que siguen corriendo): 2/2, con las 6
  lecturas de VECTOR fallando como dice el gap.

**No ejecutado todavía:** `version_lines` de MariaDB y PostgreSQL con sqlx
oficial; las suites reales en las demás versiones verificadas; E2E; nada en CI.

## Qué falta en CI

En el PR nuevo, `.github/workflows/sql-engine.yml` corre en `pull_request`
(toca `Cargo.lock`/`crates/**`/`tests/sql/**`):
- la matriz completa: 11 versiones verificadas (MySQL 8.0.46, 8.4.11, 9.7.2;
  MariaDB 10.6.28, 11.8.9; PostgreSQL 13.23, 14.24, 15.19, 16.15, 17.11,
  18.6), 23/23 cada una, y el reporte `evidence.mjs`;
- D7/D8 (`version_lines`) en todos los probes;
- Quality (fmt, clippy 1.90, tests, check, build, inventario, cobertura,
  ventana) y E2E (6 recorridos de teclado + 3 ciclos de recursos).

## P0/P1 y P2

- P0: ninguno conocido. P1: ninguno conocido.
- P2 nuevo por quitar el fork: VECTOR de MySQL 9 no se lee (D8 parcial).
- P2 afectado: el aviso de transacción abierta del hardening no puede apoyarse
  en un sqlx modificado (queda para el hardening).
- Siguen los P2 de SQL_ENGINE §9 (`SET sql_mode` en la consola, CA propia D5,
  fuzz de PG 13 con 37 frente a 30, S7 solo MySQL, E2E solo Linux, etc.). No se
  tocan en esta tarea.

## Siguiente acción exacta

1. En `fix/sqlx-oficial`, revisar el `git diff` (solo los archivos listados
   arriba) y hacer **un commit** de la limpieza.
2. `git push -u origin fix/sqlx-oficial`.
3. Abrir PR con base `feature/c5-guias` (#55): estado antes/después, P2 nuevo
   de VECTOR, cero referencias al fork.
4. Esperar Quality, E2E y la matriz SQL completa (`sql-engine.yml`) en verde,
   con `evidence.mjs` completo. Corregir solo lo que cause la retirada del fork.
5. Detenerse y dar un resumen corto. Después (otra decisión): hardening sin
   fork, luego M4 y M5.

## Comprobación rápida
```bash
gh auth status                      # anderson-andres-dev
grep -c anderson-andres-dev Cargo.toml Cargo.lock    # 0 y 0 en fix/sqlx-oficial
cargo +1.90 fmt --all --check && cargo +1.90 clippy --workspace --all-targets --locked -- -D warnings && cargo +1.90 test --workspace --locked
cd app && npm ci && npm run check && npm test && npm run build && cd ..
node tools/inventory/tests.mjs --check && node tools/inventory/coverage.mjs && node tools/test-dbs/window.mjs
```
`app/src/routes/dev-preview` es local (fuera de git): hace fallar `npm run
check` y un test que barre `app/src` solo en esta máquina.
