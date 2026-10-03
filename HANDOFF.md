# HANDOFF — consolidación Rowly DB (corte del 2026-10-03)

Nota temporal de traspaso entre sesiones. Se borra cuando el siguiente agente
la haya leído y el trabajo continúe, y **siempre antes de sacar #43 de
borrador**. No es documentación del producto.

Pedido original: implementar por fases `docs/specs/consolidacion-y-rendimiento.md`
(C0–C5), `docs/specs/contrato-motores-y-versiones.md` (M0–M5) y
`docs/specs/plataforma-de-extensiones.md` (E0–E4). `SQL_ENGINE*.md` es el
contrato permanente y nunca enlaza a un spec. Reglas del usuario: PRs pequeños
y apilados, sin push a main/develop, sin fusionar ni publicar, cuenta `gh`
`anderson-andres-dev`, commits **sin** `Co-Authored-By` y PRs sin el pie
"Generated with Claude Code", respuestas en español, documentación pública en
inglés + `.es.md`. El usuario autorizó force-push con lease de las ramas
apiladas propias al rebasarlas.

## Pila de ramas (todas en origin)

```text
develop
└─ feature/specs-consolidacion             PR #39
   └─ feature/c0-mapa-y-referencia         PR #40
      └─ feature/c0-referencia-rendimiento PR #41
         └─ feature/c1-compuertas          PR #42
            ├─ fix/identificadores-generados          PR #44
            │  └─ feature/c2-workspace-puro           PR #45
            │     └─ fix/confirmacion-produccion-cambios  PR #46 (5/5 E2E)
            └─ feature/m1-servidores-fijados          PR #43 (borrador)
```

Al cambiar C1, rebasar las de abajo con
`git rebase --update-refs --onto feature/c1-compuertas <base-vieja> fix/confirmacion-produccion-cambios`
y `git rebase --onto feature/c1-compuertas <base-vieja> feature/m1-servidores-fijados`
(la base vieja es el commit de C1 sobre el que estaban), y publicar con
`--force-with-lease=<rama>:<sha-en-origin>`. `tests/inventory.json` es
generado: en conflicto, regenerar con `node tools/inventory/tests.mjs`.

## Estado por fase

| Fase | Estado |
|---|---|
| C0, M0 | Terminadas (#40, #41) |
| C1 | Terminada, PR #42. Quality + E2E 4/4 verdes en push y PR. SQL_ENGINE §6/§7/§9 al día |
| Fix identificadores, C2 parte 1, R1 | Terminados, verdes en CI, PRs #44, #45, #46 |
| M1 | Matriz SQL **verde en las 11 versiones verificadas** (12/12 cada una) + D7/D8 + reporte de evidencia. Falta lo de abajo |
| C3–C5, M2–M5, E0–E4 | No empezadas |

### Hecho en esta sesión
- C1: SQL_ENGINE §6/§7/§9; el E2E comprueba que cada acorde X11 llega (keydown o keyup; Ctrl+A solo da keyup en WebKitGTK) y lo repite; termina la app de cada recorrido antes de borrar el perfil (dejaba ENOTEMPTY); `largeDocuments` mide el mejor de 3 escaneos con el mismo límite de 1,5 s.
- R1: el recorrido del grid entra a la celda con foco + Enter (WebKitWebDriver rechaza un elemento como `origin` de una acción de puntero). Visto 5/5 en CI. SQL_ENGINE S7 lo cita.
- M1: guard `NoBackslashEscapes` (S5 restaura el modo en Drop) y `Conn::open` rechaza un `sql_mode` global sucio; cada job prueba solo su motor (`selected()`), ROWLY_ENGINES desconocido detiene la prueba; reintentos de descarga (ECR corta con `toomanyrequests`); N/A verificable con `-- needs: <capacidad>` resuelto contra `tests/sql/<motor>/<línea>/accepts.sql` (el servidor debe rechazarlo); MariaDB < 11.3 necesita `SELECT ON mysql.proc`; `coverage.mjs` falla con pruebas reales huérfanas; job final `tools/test-dbs/evidence.mjs` exige evidencia completa por versión de `verified`; SQL_ENGINE §5.3/§6/§7/§9/§10 al día.
- N/A registrados: PG 13 (MERGE, OUT en procedures, cuerpos SQL estándar) y PG 14 (MERGE).

## Pendiente
1. M1, antes de salir de borrador:
   - Tests de driver `KHIPU_TEST_*` (D1, D3, D5; 27 tests `#[ignore]` en `crates/drivers/{mysql,postgres}/src/lib.rs`) al harness de `tools/test-dbs` por versión exacta. **Decisión de diseño pendiente**: usan internos del driver (`pool`, `version`, `execute_on_connection`), así que o se reescriben sobre la API pública en `crates/server-tests/tests/contract.rs` (destino que fija el inventario) o el driver expone lo mínimo. TLS (D5) necesita servidores con TLS configurado. CONTRIBUTING (EN+ES) documenta hoy las variables `KHIPU_TEST_*`.
   - Borrar este HANDOFF.
2. P1 que queda en SQL_ENGINE §9: los mínimos del código (`MIN_MYSQL`, `MIN_MARIADB`, `MIN_MAJOR`) no siguen §5.2.

## NO empezar todavía
- C3 (editor), C4 (backend), M2–M5 ni E1–E4 hasta cerrar M1.
- No fusionar PRs, no push a main/develop, no publicar versión.

## Comprobación rápida
```bash
gh auth status                      # anderson-andres-dev
cargo +1.90 fmt --all --check && cargo +1.90 clippy --workspace --all-targets --locked -- -D warnings && cargo +1.90 test --workspace --locked
cd app && npm ci && npm run check && npm test && npm run build && cd ..
node tools/inventory/tests.mjs --check && node tools/inventory/coverage.mjs
tools/test-dbs/up.sh postgres=13.23   # cambiar de versión: docker compose rm -sf <motor> y borrar su volumen
ROWLY_ENGINES=postgres ROWLY_EVIDENCE=/tmp/ev.jsonl cargo +1.90 test -p rowly-server-tests --test real_server -- --ignored --test-threads=1
```

## Entorno
- En este equipo (Arch, WebKitGTK 2.52.6) no hay WebKitWebDriver ni tauri-driver: el E2E solo corre en CI.
- `app/src/routes/dev-preview/` es local del usuario (excluido en `.git/info/exclude`) y hace fallar `npm run check` en el árbol principal: validar en un worktree limpio. No tocarlo.
- **No ejecutar `rowly-db --version`**: abre la app real del usuario.
- CI usa Rust 1.90 (`cargo +1.90`) y Node 20.
- La suite real lee `tools/test-dbs/lines.json` en tiempo de ejecución: no cambiar de rama mientras corre.
