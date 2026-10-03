# HANDOFF — consolidación Rowly DB (corte del 2026-10-03, consolidación cerrada)

Nota temporal de traspaso entre sesiones. Vive solo en la rama
`handoff/consolidacion` (encima de C5, sin PR, no se fusiona); se borra la
rama cuando el trabajo continúe. No es documentación del producto.

Reglas del usuario: PRs pequeños y apilados, sin push a main/develop, sin
fusionar ni publicar, cuenta `gh` `anderson-andres-dev`, commits **sin**
`Co-Authored-By` y PRs sin el pie "Generated with Claude Code", respuestas en
español con "tú", documentación pública en inglés + `.es.md`. Force-push con
lease autorizado solo para rebasar ramas apiladas propias.

## Pila de ramas (todas en origin, lineal)

```text
develop ← #39 specs ← #40 C0 ← #41 C0 bench ← #42 C1
  ← #44 ← #45 ← #46 ← #48 C2 ← #50 C3
  ← #43 M1 ← #47 piso ← #49 M2
  ← #51 C4 ← #52 M3
  ← #53 C5 1/3 ciclos de recursos (feature/c5-cierre)
  ← #54 C5 2/3 dominios, corpus, suites (feature/c5-dominios)
  ← #55 C5 3/3 medición, guías, spec retirada (feature/c5-guias)
  ← handoff/consolidacion (solo este archivo)
```

## Estado

**C0–C5 y M0–M3 cerrados.** La spec `consolidacion-y-rendimiento.md` se
borró en #55; su arquitectura está en `docs/ARCHITECTURE*`, su procedimiento
en `CONTRIBUTING*`, su presupuesto en `tools/bench/README*`. Tabla antes/
después en #55 y resúmenes en `tools/bench/baseline/c5-cachyos`: todo igual
a v0.3.0 dentro de la dispersión, sin dependencias nuevas.

Siguiente según las specs que quedan: M4–M5 (`contrato-motores-y-versiones.md`:
paquetes por línea) y E0–E4 (`plataforma-de-extensiones.md`). Decidir orden con
el usuario. `docs/specs/mapa-c0.md` se borra al cerrar M5.

## Herramientas que conviene conocer

- `app/tests/e2e/resources.mjs`: ciclos de recursos sin WebDriver, con el
  inspector de WebKit (`inspector.mjs`). Compuertas: heap JS vivo tras
  `Heap.gc`, objetos vivos, memoria propia (`Anonymous`) de la app por
  pisos, DOM. El PSS del WebKitWebProcess no es compuerta (retención de
  WebKit, se aplana). Leer la memoria **antes** del snapshot. En CI el tercer
  arranque a veces no muestra la página: hay un reintento que lo registra.
  En local: `xvfb-run node tests/e2e/resources.mjs --app <bin>` con
  `E2E_MYSQL_PORT=33306 E2E_PG_PORT=55432 E2E_PG_USER=rowly` y un
  `E2E_MYSQL_CLI` que haga `docker exec -i rowly-test-mysql mysql`.
- `app/src/lib/backend.test.ts`: un dueño por comando IPC.
- Suites reales: `safety`, `analysis`, `generated`, `contract`
  (`real_server.rs` ya no existe); corpus en `tests/sql/**/common/`.

## P2 abiertos (SQL_ENGINE §9)

CA propia para D5; fuzz de PG 13 con poco margen (37 frente a 30); un
`SET sql_mode` en la consola no cambia el contexto ni el guard; S7 integrado
solo con MySQL; E2E solo en Linux; `analysis.rs` replica la clasificación del
frontend; y el resto de la lista. Sin medir: latencia de tecla a pintado y
frames del grid.

## Medir

`/tmp` es un tmpfs de 7,7 GB: release con `CARGO_TARGET_DIR` fuera de `/tmp`,
uno por directorio de target. Bench alternado en la misma sesión, **sin
correr nada más en la máquina mientras mide**. El banco del editor 5 veces
(10 si un p99 suelto se sale); `max` es neutral; reposo 3 × 60 s alternados.
Para medir v0.3.0 con el banco del editor actual, darle el banco con las
rutas viejas (`git archive feature/c5-cierre tools/bench`).

## Comprobación rápida
```bash
gh auth status
cargo +1.90 fmt --all --check && cargo +1.90 clippy --workspace --all-targets --locked -- -D warnings && cargo +1.90 test --workspace --locked
cd app && npm ci && npm run check && npm test && npm run build && cd ..
node tools/inventory/tests.mjs --check && node tools/inventory/coverage.mjs && node tools/test-dbs/window.mjs
```
`app/src/routes/dev-preview` es local (fuera de git): hace fallar `npm run
check` y el test que barre `app/src` solo en esta máquina. Sus imports se
reescribieron al mover módulos en #54.
