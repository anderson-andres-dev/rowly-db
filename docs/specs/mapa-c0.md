# Mapa C0/M0 — estado actual antes de mover código

**Nota temporal** de las fases C0 ([consolidación](consolidacion-y-rendimiento.md))
y M0 ([motores y versiones](contrato-motores-y-versiones.md)). Describe el
código de `v0.3.0` tal como está, no el destino. Se elimina junto con esas
specs; lo que siga vigente al cerrar C5/M5 pasa a `docs/ARCHITECTURE*.md`,
`CONTRIBUTING*.md` o `SQL_ENGINE*.md`.

Fuentes reproducibles:

| Qué | Dónde | Cómo se regenera |
|---|---|---|
| Inventario de tests, con dueño, propiedad, riesgo, compuerta y decisión | `tests/inventory.json` | `node tools/inventory/tests.mjs [--vitest <json>] [--cargo <log>]`; `--check` falla si un test no tiene dueño o decisión |
| Código sin consumidor (candidatos) | salida de `tools/inventory/unused.mjs` | `node tools/inventory/unused.mjs [--json]` |
| Referencia de rendimiento | `tools/bench/baseline/` | PR de referencia de C0 (aparte de este) |

## 1. Ejecución de SQL: todos los caminos de hoy

```text
SqlEditor (Ctrl+Enter / Ctrl+Shift+Enter) ─┐                        Pestaña de tabla
QueryHistory (executeFromHistory) ──────────┤                        │ runTableQuery
                                            ▼                        │
   requestExecution ─► fillParameters ─► splitStatements (léxico del motor)
        │ una sentencia          │ varias                            │
        ▼                        ▼                                   │
   runQuery(...) ◄─ paginar / ordenar / recargar / confirmar pendiente
        │                 startScript ─► classify_statements (IPC, guard)
        │                        └► runScript                        │
        ▼                                ▼                           ▼
   executeCancellable(consoleId, sql, confirmed, page)   ◄── único llamador de executeQuery
        ▼
   queryExecution.executeQuery ─► IPC execute_query
        ▼
   lib.rs execute_query: classify_sql_with (guard) ─► confirmación pendiente
                                                     o connector.execute_query
```

Caminos que **no** pasan por `execute_query` ni por el guard:

| Comando IPC | Quién lo llama | Qué protege hoy | Observación |
|---|---|---|---|
| `count_query_rows` | `Workspace.countTotalRows` | `pagination::count_sql` reescribe solo una consulta paginable parseada | Sin `classify_sql_with`; el texto ya pasó por el guard al ejecutarse, pero el backend no lo comprueba. |
| `export_query_to_file` | `ExportDialog` | `pagination::is_read_only_query` | Regla de solo lectura distinta de la del guard. |
| `preview_result_changes` / `apply_result_changes` | `Workspace.submitChanges` | SQL generado por `result_editing::statements` | **En producción la confirmación la decide solo la UI** (`$isProduction && !confirmed`); el backend no la exige (riesgo R1). |
| `analyze_sql` | `SqlEditor` (`AnalysisRunner`) | No ejecuta | Usa el dialecto de la conexión activa de la ventana en el momento de la llamada. |

Conclusión para C2/C4: `executeCancellable` ya es el único llamador
frontend de `executeQuery` (regla 2 de la spec se cumple para editor,
historial, tabla, paginación y scripts). Lo que falta unificar está en el
backend: conteo, exportación y aplicación de cambios no comparten la
clasificación del host.

## 2. `Workspace.svelte` (2 176 líneas): estado y dueño propuesto

| Estado (hoy en el componente) | Ciclo de vida | Dueño propuesto (C2) |
|---|---|---|
| `selectedTabByConsole`, `resultTabOrder`, `resultTabs`, `keepTabPosition`, `reorderResultTabs`, `pinCurrentResult`, `unpinTab`, `closeResultTab`, `forgetResultTab`, `dropUnpinnedResults` | Por consola, efímero; los fijados persisten en `stores/pinnedResults` | `workspace/resultTabs.ts` (puro) |
| `tableFilterError`, `tableSql`, `applyTableFilters`, `runTableQuery(Once)`, `tableFilterColumns` | Por pestaña de tabla | `workspace/tableQueries.ts` |
| `cancelling`, `executeCancellable`, `cancelExecution`, `runQuery`, `applyExecuteQueryResponse`, `requestExecution`, `fillParameters`/`parametersPrompt`, `startScript`, `runScript`, `confirm/cancelPendingExecution`, `refreshAfterDdl`, `describeOutcome` | Por ejecución (`executionId`) dentro de una consola; el resultado vive en `stores/queryConsoles` | `workspace/executionSession.ts` |
| `editState`, `prepareResultEditing`, `pendingEditsCount`, `discardPrompt`, `preview`, `applyingChanges`, `applyError`, `currentChanges`, `openChangesPreview`, `submitChanges` | Borrador por pestaña; dueño del borrador: `stores/resultEdits` | `workspace/resultChanges.ts` |
| `pendingCloseId`, `requestClose`, `saveAndClose`, `discardAndClose`, `runFileAction`, renombrar | Por consola; archivo en disco vía `sqlFiles` | `workspace/consoleFiles.ts` |
| `exportFor`, `exportSource`, `onExported` | Diálogo | Queda en la vista |
| `editorFraction`, splitter, `tabsOverflow`, `tabMenu`, `historyOpen` | Presentación | Queda en la vista |

Listeners y timers propios: `wheel` en la barra de pestañas (quitado en el
retorno del `$effect`), `ResizeObserver` (`observer.disconnect()`), un
`setTimeout` de foco y `pointermove/pointerup` del splitter (quitados en
`onUp`). Los comandos se registran con `registerCommands` dentro de un
`$effect` que devuelve el desregistro. C2 conserva esos retornos; el ciclo
de 300 aperturas de C0 lo comprueba.

## 3. `SqlEditor.svelte` (1 230 líneas)

- **Compartments (10):** tema, `sql()`, léxico, pistas de parámetros,
  autocompletado, enlace a definición, comportamiento (mayúsculas), Tab en
  sugerencias, indentación y frases. Cada ajuste se reconfigura con un
  `$effect` puntual; el editor no se remonta al cambiar un ajuste. C3 los
  mueve a `editor/configuration.ts` sin cambiar ese patrón; E0 añade ahí el
  punto opcional vacío.
- **Análisis:** `AnalysisRunner` (`sqlAnalysis.ts`) llama a `analyze_sql` y
  publica en un `RangeSet`. La clasificación incompleto/no encontrado/genérico
  vive aquí (`UNRESOLVED_KEYS`, `UNFINISHED_KEYS`, `UNFINISHED_AT_END_KEYS`,
  `VAGUE_KEYS`) y `real_server.rs` la replica (SQL_ENGINE §9).
- **Motor:** `engineFor(profile.driver)` en un `$effect`; cambia léxico,
  dialecto de `lang-sql` y pistas. La etiqueta de versión
  (`databaseExplorer.serverVersion`, p. ej. `"MariaDB 11.8.9"`) se pasa a
  `vendorSupport()`, que **deduce el motor y la versión del texto visible**
  (`engines/vendorSupport.ts:40`). M3 lo sustituye por el contexto de conexión.
- **Timers:** hover del popup (`hoverTimer`, `hoverCloseTimer`), volcado del
  texto (`textFlushTimer`, más largo con documentos grandes). `onDestroy`
  limpia el análisis y destruye el `EditorView`.

## 4. `app/src-tauri/src/lib.rs` (1 101 líneas)

`AppState` guarda `connections: Mutex<HashMap<label de ventana,
ActiveConnection>>` y las consultas en curso (`RunningQuery`, que se quita
en su `Drop`). `ActiveConnection` reúne conector, `Dialect`, producción,
`no_backslash_escapes`, `server_version` (texto), TLS, schemas y el
`Arc<SchemaCatalog>`. 30 comandos registrados; agrupación propuesta para C4:

| Módulo destino | Comandos |
|---|---|
| `commands/connection.rs` | `connect`, `disconnect`, `test_connection`, `*_connection_password` |
| `commands/catalog.rs` | `list_tables`, `database_explorer`, `set_visible_schemas`, `table_definition` |
| `commands/query.rs` | `execute_query`, `cancel_query`, `classify_statements`, `analyze_sql`, `count_query_rows` |
| `commands/results.rs` | `result_edit_info`, `preview_result_changes`, `apply_result_changes`, `export_query_to_file` |
| `commands/files.rs` | `*_sql_file`, `list_sql_dir`, `*_console_text*` |
| `updates.rs` (ya separado) | `update_context`, `list_releases`, `install_release`, `restart_app` |

## 5. M0: dónde se decide cada cosa por motor

| Decisión | Dónde hoy | Exhaustivo |
|---|---|---|
| ID de motor elegido | `ConnectionDriver` (`app/src/lib/connections.ts`) → `DatabaseKind` (`drivers.rs`) → `Dialect` | Sí: `match` en Rust, `Record<ConnectionDriver, …>` en TS; test `cada_motor_del_frontend_llega_como_el_suyo` |
| Driver de protocolo | `drivers.rs`: `MySql \| MariaDb` → `MySqlConnector`, `Postgres` → `PostgresConnector` | Sí |
| Léxico, citas, llamadas del editor | `engines/{mysql,mariadb,postgres,standard}.ts` (`SqlProfile`) | Sí (`ENGINES`) |
| Gramática, guard, diagnósticos, SQL generado | `Dialect` en `crates/engine`; 90 ramas en `execution_guard.rs`, 44 en `diagnostics.rs`, 21 en `lib.rs`, 5 en `editing.rs`, 3 en `pagination.rs` | Sí, por `match` |
| Capacidades por versión del catálogo | `crates/drivers/*/src/version.rs` (`Capabilities`) | Por driver; MariaDB y MySQL comparten archivo |
| Modo `NO_BACKSLASH_ESCAPES` | `lib.rs::uses_no_backslash_escapes`, una vez al conectar | Solo MySQL/MariaDB |
| Versión mostrada y estado del fabricante | `server_version()` como texto → `vendorSupport.ts` vuelve a parsearlo | **No**: deduce el motor de la etiqueta |
| Mínimos de versión | `MIN_MYSQL` 5.7, `MIN_MARIADB` 10.3, `MIN_MAJOR` 10 en `version.rs` | No siguen SQL_ENGINE §5.2 (§9 P1) |

No se encontró ningún fallback silencioso a MySQL en Rust (`unwrap_or(Dialect…)`,
`Default for Dialect` o ramas `_ =>` sobre el motor). El frontend usa
`standardSql` solo cuando no hay conexión, y es explícito.

## 6. M0: matriz SQL_ENGINE ↔ tests ↔ versiones exactas de hoy

Cada fila de §6 tiene al menos un archivo con `sqlEngineRows` en
`tests/inventory.json`, salvo **A9** (hueco declarado). Los nombres de test
que cita §6 existen todos en el código (comprobado en C0). Corrección hecha:
D9 citaba `connectionIdentity.test.ts`, que solo prueba iniciales y color del
avatar; ahora cita las dos pruebas que sí cubren parte de la identidad.

Versiones exactas contra las que corre hoy cada suite real (leídas del
servidor el 2026-10-02):

| Suite | Servidores | Fijación |
|---|---|---|
| `real_server.rs` (12 tests: S2, S3, S5, A1, A3, A4, D2, G2) | MySQL **8.4.11**, MariaDB **11.8.9**, PostgreSQL **18.6** | `docker-compose.yml` usa etiquetas flotantes (`mysql:8.4`, `mariadb:11`, `pgvector/pgvector:pg18`): la versión depende de cuándo se descargó la imagen |
| `version_lines.rs` (D7, D8) | Los 21 probes de `lines.json` | Etiqueta con versión, sin digest; `postgres:10` y `postgres:11` sin parche |
| Tests de driver `#[ignore]` (D1, D3, D5) | Lo que indiquen `KHIPU_TEST_*` | Ninguna; segunda vía a un servidor (§9 P3) |

Ninguna versión exacta tiene hoy la matriz completa con evidencia
reproducible: M1 fija imágenes por digest, una sola vía (`tools/test-dbs`),
`coverage.json` y un reporte por `(motor, línea, versión exacta)`.

## 7. Riesgos encontrados (sin corregir en C0)

| # | Riesgo | Severidad (SQL_ENGINE §3) | Fase que lo cierra |
|---|---|---|---|
| R1 | `apply_result_changes` no exige en el backend la confirmación de producción; la decide `Workspace.submitChanges`. Contradice S7 y la regla «la UI no decide si una instrucción es segura». | P1 (S7) | C4, con test del comando; antes, si se prioriza, PR propio |
| R2 | `count_query_rows` y `export_query_to_file` no pasan por la clasificación del host; usan reglas propias de `pagination`. | P2 | C4 (ruta única) |
| R3 | El frontend deduce motor y versión de una etiqueta visible (`vendorSupport`). | P2 (D9) | M3 |
| R4 | La suite real usa etiquetas flotantes y no informa la versión leída. | P1 (§9) | M1 |
| R5 | La respuesta de `analyze_sql` no lleva generación de conexión; tras reconectar con otro motor en la misma ventana podría aplicarse un análisis viejo hasta el siguiente. **No verificado**: se reproduce o descarta en M3. | por determinar | M3 |
| R6 | `npm test` y `clippy -D warnings` no corren en CI (ambos pasan hoy en local: 1 104 tests ✓, 1 omitido; clippy sin avisos). | P1 (§9) | C1 |
| R7 | No hay harness E2E: en esta máquina no hay `WebKitWebDriver` ni `tauri-driver`. | — | C1 |

## 8. Código sin consumidor (candidatos, nada borrado)

`node tools/inventory/unused.mjs` (2026-10-02):

- Comando IPC `disconnect`: registrado, nunca invocado. `stores/connection.ts`
  `reset()` tampoco tiene llamadas, y su comentario dice que «no existe un
  comando» de desconexión. La conexión del backend se libera al destruir la
  ventana o al reemplazarla con otro `connect`. Decidir en C4 si volver a la
  portada debe cerrar la conexión (recursos en reposo) o si se borran ambos.
- Claves i18n sin uso literal: `common.delete`, `common.back`,
  `updates.title`, `updates.installed` (otras 174 pueden formarse con
  plantillas y no son candidatas sin revisar).
- Valores exportados solo usados por tests: `runCommand`, `formatSqlBlock`,
  `statementIndexStep`, `statementAt`, `__test` de `editorSearchPanel`;
  `commandDefinition` no tiene ningún uso. Se revisan al mover su dominio.
- Dependencias npm de runtime: todas tienen import.
