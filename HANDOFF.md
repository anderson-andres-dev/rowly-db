# HANDOFF — consolidación Rowly DB (corte del 2026-10-02)

Nota temporal de traspaso entre sesiones. Se borra cuando el siguiente agente
la haya leído y el trabajo continúe. No es documentación del producto.

Pedido original: implementar por fases `docs/specs/consolidacion-y-rendimiento.md`
(C0–C5), `docs/specs/contrato-motores-y-versiones.md` (M0–M5) y
`docs/specs/plataforma-de-extensiones.md` (E0–E4). `SQL_ENGINE*.md` es el
contrato permanente y nunca enlaza a un spec. Reglas del usuario: PRs pequeños
y apilados, sin push a main/develop, sin fusionar ni publicar, cuenta `gh`
`anderson-andres-dev`, commits **sin** `Co-Authored-By` y PRs sin el pie
"Generated with Claude Code", respuestas en español, documentación pública en
inglés + `.es.md`.

## Rama y HEAD

- Continuar desde: **`feature/m1-servidores-fijados`** (contiene C0, C1 hasta
  `7cd0bcb`, M1 en curso y este archivo). HEAD: ver `git log -1` de esa rama en
  origin; el commit de M1 es `faaa427`, este HANDOFF va encima.
- La siguiente acción, sin embargo, se hace en **`feature/c1-compuertas`**
  (HEAD `7b28a70`), y después se rebasan sobre ella las ramas apiladas.

## Pila de ramas (todas en origin)

```text
develop
└─ feature/specs-consolidacion        PR #39 (solo planes), abierto
   └─ feature/c0-mapa-y-referencia    PR #40 abierto   16308b2
      └─ feature/c0-referencia-rendimiento  PR #41 abierto  d0750c5
         └─ feature/c1-compuertas     sin PR             7b28a70
            ├─ fix/identificadores-generados  sin PR     572d46f  (base: C1 en 7cd0bcb)
            │  └─ feature/c2-workspace-puro    sin PR    68d9f50
            │     └─ fix/confirmacion-produccion-cambios  sin PR  71929a1
            └─ feature/m1-servidores-fijados   sin PR    faaa427  (base: C1 en 7cd0bcb)
```

Las ramas de abajo parten de C1 en `7cd0bcb`; C1 recibió después solo
commits de `app/tests/e2e/*` y `e2e.yml`. Rebasarlas con
`git rebase --onto feature/c1-compuertas <base-vieja> <rama>` (no un rebase
simple: replicaría commits ya reescritos). `tests/inventory.json` es generado:
en conflicto, tomar la versión base y regenerar (`node tools/inventory/tests.mjs`).

## Estado por fase

| Fase | Estado | Dónde |
|---|---|---|
| C0 mapa + inventario | Terminada, PR #40 | `docs/specs/mapa-c0.md`, `tests/inventory.json`, `tools/inventory/{tests,unused}.mjs` |
| M0 inventario de decisiones por motor | Terminada (dentro de #40) | mapa-c0 §5–6; corrigió la cita D9 de SQL_ENGINE |
| C0 referencia de rendimiento | Terminada, PR #41 | `tools/bench/`, `tools/bench/baseline/v0.3.0/summary.json` |
| C1 compuertas | **Verde en CI** (Quality + E2E 4/4 en `7b28a70`); falta actualizar SQL_ENGINE §7/§9 y abrir PR | `quality.yml`, `e2e.yml`, `app/tests/e2e/` |
| Fix identificadores generados (P1 G1/G7) | Terminado, sin PR | `filterBuilder.ts` usa `SqlProfile.identifier` |
| C2 parte 1 (Workspace puro) | Terminada, sin PR | `app/src/lib/workspace/{resultTabs,tableQueries,executionSession}.ts` |
| R1 confirmación de producción en backend (P1 S7) | Terminado, sin PR; su E2E nuevo sin ver en CI | `lib.rs::production_write_allowed`, `resultEditing.applyChanges(…, confirmed)` |
| M1 harness y compuerta | **En curso** | ver abajo |
| C3–C5, M2–M5, E0–E4 | No empezadas | — |

### Terminado y verificado
- Inventario de 114+ archivos con dueño/propiedad/riesgo/compuerta/decisión; `--check` en CI.
- Referencia v0.3.0 (binario release instalado `rowly-db-bin 0.3.0-1`) y Beekeeper 6.1.2:
  Rowly ventana 129 ms caliente / 312 ms frío, PSS 244 MB, reposo 0,03 % CPU sin red;
  Beekeeper 1945/2254 ms, 856 MB. JS inicial 1424 KB (436 KB gzip). `settle_ms`
  tiene dispersión 29–42 %: no sirve de compuerta.
- C2 medido (build release local, 20+20 corridas): ventana 129/307 ms (= base),
  PSS +1,2 %, JS +0,3 KB. Sin regresión. (Datos crudos no versionados; las cifras son estas.)
- Quality en verde en C1 (`npm test`, `clippy -D warnings` con Rust 1.90, inventario).
- Bugs reales encontrados y corregidos:
  1. clippy 1.90 `nonminimal_bool` en `diagnostics.rs` y `sql_files.rs` (local era 1.98).
  2. Test grande de `sqlStatementIndex` superaba el timeout de 5 s en CI → timeout 60 s.
  3. Sin Secret Service, la política «nunca» no podía conectar (`NoDefaultStore` al borrar) → `credentials.rs`.
  4. Pestaña de tabla / filtros generaban SQL que el servidor rechaza (`WHERE order`, `"Order"` en PG) → `fix/identificadores-generados`, verificado en MySQL 8.4.11, MariaDB 11.8.9, PG 18.6.
  5. R1: `apply_result_changes` no exigía confirmación de producción en backend.

### Lo que hacía justo antes del corte
Depurando el recorrido E2E **«producción: una escritura pide confirmación»**
en `feature/c1-compuertas`. Pasan: conectar+Ctrl+Enter, DELETE sin WHERE
(Escape cancela, Enter confirma), texto tras reiniciar. Falla el de
producción: es la **segunda** consulta de la sesión; el registro de teclas
mostraba `Ctrl+Control@cm-content` sin el Return. El commit `7b28a70`
(espera 300 ms antes del acorde + registro en `window`) lo resolvió: E2E run
37075663138 **4/4 ok**. Los E2E de `fix/confirmacion-produccion-cambios` y
`feature/m1-servidores-fijados` fallan solo porque parten de un C1 anterior a
esos arreglos: rebasarlas.

Historia del E2E para no repetirla: las acciones de teclado de WebKitWebDriver
pierden la tecla tras el modificador; Send Keys la entrega como
"Unidentified"; ahora los acordes y teclas especiales van con `xdotool`
(XTEST, `windowfocus` a la ventana "Rowly DB") y el texto por WebDriver. Cada
recorrido arranca su propio `tauri-driver` con XDG_* temporales.

### M1 en curso (`feature/m1-servidores-fijados`, commit faaa427)
Hecho: `lines.json` formato 2 (digest + versión exacta por probe, `verified` =
MySQL 8.0.46/8.4.11/9.7.2, MariaDB 10.6.28/11.8.9, PG 13.23–18.6; datasets
fijados: Sakila por SHA-256, Pagila commit 5ba5a57aeb — el `master` actual de
Pagila exige PG 18); compose/up.sh/lines.sh/fetch.sh por digest; harness
compara versión del servidor con la declarada por digest y emite evidencia
(`ROWLY_EVIDENCE`); `tests/sql/coverage.json` + `tools/inventory/coverage.mjs`
(32 filas: 20 cubiertas, 9 parciales, 3 huecos); `sql-engine.yml` (matriz por
versión verificada + líneas por motor) **nunca ha corrido**: se dispara con un
PR o con workflow_dispatch.

Pendiente de M1:
1. Endurecer el harness: el test S5 debe restaurar `sql_mode` con un `Drop`, y
   `Conn::open` debe fallar con mensaje claro si el modo global trae
   `NO_BACKSLASH_ESCAPES` (una corrida interrumpida lo dejó puesto y los dos
   tests S2 fallaron en falso; al repetirlos con el modo normal pasaron).
2. Correr la matriz en CI y adaptar las pruebas a la línea: p. ej. PG 13 no
   admite `OUT` en procedures (fixture `sim_out` de G2), MariaDB 10.6 no admite
   `DEFAULT` en parámetros. Las capacidades ausentes se registran como N/A, no
   se saltan en silencio.
3. Quitar el `#[ignore]` de la ruta de CI / unificar los tests de driver
   `KHIPU_TEST_*` en el harness de `tools/test-dbs` (SQL_ENGINE §9 P3).
4. Actualizar SQL_ENGINE §5.3/§7/§9/§10 (EN+ES) con lo que realmente quede.

## Tests y comandos de comprobación

```bash
gh auth status                      # cuenta activa: anderson-andres-dev
git fetch origin && git switch feature/m1-servidores-fijados
cargo +1.90 fmt --all --check
cargo +1.90 clippy --workspace --all-targets --locked -- -D warnings   # CI usa 1.90
cargo +1.90 test --workspace --locked
cd app && npm ci && npm run check && npm test && npm run build && cd ..
node tools/inventory/tests.mjs --check
node tools/inventory/coverage.mjs
tools/test-dbs/up.sh                       # recrea con digests; si venías del compose viejo: docker compose -f tools/test-dbs/docker-compose.yml down -v
ROWLY_EVIDENCE=/tmp/ev.jsonl cargo +1.90 test -p rowly-server-tests --test real_server -- --ignored --test-threads=1
gh run list --branch feature/c1-compuertas --limit 4
```

Resultados al corte: Rust workspace verde; `npm test` 1104 ✓ / 1 omitido en C1
(1126 en C2); suite real local en M1: 10/12 + los 2 S2 verdes al repetir
(MySQL 8.4.11, MariaDB 11.8.9, PG 18.6). E2E: 4/4 en CI en C1 (`7b28a70`); fallan en ramas aún no rebasadas. Quality: verde en C1,
fix y C2. La matriz SQL por versión exacta: **no ejecutada**; ninguna versión
nueva puede anunciarse verificada todavía.

## Entorno y peculiaridades
- Linux (Omarchy, Hyprland 0.56 con dispatch en **Lua**: `hyprctl dispatch 'hl.dsp.exec_cmd("…", { workspace = "special:x silent" })'`), WebKitGTK 2.52.6, i7-13620H, Intel UHD (sin NVIDIA). No hay WebKitWebDriver, tauri-driver ni TablePlus locales: el E2E solo corre en CI.
- **No ejecutar `rowly-db --version`**: abre la app real del usuario.
- Rust local 1.98; CI 1.90 (instalada: `cargo +1.90`). Node local 26, CI 20.
- `tools/bench/linux/desktop.py` mide sin enviar teclas, en un workspace especial fuera de pantalla; no medir mientras se compila.
- `pgrep -f '<patrón>'` en un `until` se encuentra a sí mismo: no usarlo así.
- La suite real lee `tools/test-dbs/lines.json` en tiempo de ejecución: no cambiar de rama ni hacer stash mientras corre.
- Imágenes de prueba desde `public.ecr.aws/docker/library` (Docker Hub limita).

## Siguiente acción exacta
1. Rebasar R1 (`fix/confirmacion-produccion-cambios`, vía fix → C2) y M1 sobre
   `feature/c1-compuertas` y confirmar E2E en CI (R1 añade un 5.º recorrido:
   edición del grid en producción, aún nunca visto en verde).
2. Con C1 verde: actualizar SQL_ENGINE §7 y §9 (EN+ES): quitar el P1 «CI no
   corre npm test / -D warnings» y añadir el E2E a S7/S3; luego abrir el PR de
   C1 sobre #41 (borrador del cuerpo: Fase C1, criterios, pruebas, pendientes).
3. Rebasar `fix/identificadores-generados` → C2 → R1 y `feature/m1-servidores-fijados`
   sobre C1 (`--onto`), abrir sus PRs apilados.
4. Continuar M1 (lista de arriba) antes que más C2.

## NO empezar todavía
- C3 (editor), C4 (backend), M2–M5 ni E1–E4: dependen de que C1 y M1 estén cerrados.
- Nada de runtime de extensiones, tienda ni workers en vanilla.
- No fusionar PRs, no push a main/develop, no publicar versión.
- No anunciar ninguna versión exacta como verificada sin su matriz completa en CI.
