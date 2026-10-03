# Arquitectura

[English](ARCHITECTURE.md) · **Español**

Rowly DB es la app. Khipu es su motor, y por eso los crates se llaman `khipu-*`.

## La idea

El motor analiza SQL, mantiene el catálogo del esquema y arma las sugerencias sin saber nada de Tauri, Svelte ni de ninguna base de datos en particular. Lo único que ve es un `SchemaCatalog` genérico. Gracias a eso se puede:

- usar `khipu-lsp` desde Neovim o VS Code sin la app de escritorio
- agregar un motor conservando separados el análisis común, sus reglas de dialecto y el driver; `Dialect` y los contratos exhaustivos sí requieren cambios
- probar el motor sin una base de datos corriendo

## Capas

| Ruta | Qué hace |
| :--- | :--- |
| `crates/engine` | Valida el SQL con la gramática de cada dialecto, entiende qué hay bajo el cursor y ordena las sugerencias a partir del catálogo. |
| `crates/engine-lsp` | Expone el motor como servidor LSP para que cualquier editor lo use. |
| `crates/driver-core` | El contrato `DbConnector` que implementa cada base de datos: conectar, listar esquemas, leer un esquema completo y ejecutar consultas. |
| `crates/drivers/*` | Conectores de protocolo sobre `sqlx`; MySQL y MariaDB comparten conector, pero mantienen dialectos y perfiles distintos. |
| `app/src-tauri` | La app de escritorio. Llama al motor y a los drivers directamente, sin pasar por LSP, para que la latencia sea mínima. |
| `app/src` | Frontend en Svelte con el editor CodeMirror 6. |

El motor no depende de ningún driver, ni siquiera de `driver-core`. La app crea cada driver en `app/src-tauri/src/drivers.rs`, trabaja con él a través de `DbConnector` y convierte el esquema que lee en el catálogo del motor en `services/catalog.rs`. Cada perfil de conexión elige su modo TLS y cada driver lo aplica en su propio `tls.rs`.

## Reglas

1. **Un dueño por estado.** La conexión, el catálogo, la ejecución, las pestañas y el documento del editor viven distinto tiempo. Un módulo lee el estado de otro por su interfaz; no guarda una segunda copia que cambie.
2. **Un solo camino para ejecutar SQL.** Editor, historial, tabla y paginación pasan por la misma clasificación, confirmación y ejecución. La UI no decide si una sentencia es segura: lo decide el guard del backend.
3. **Dependencias en una dirección:** componentes Svelte → casos de uso → stores y contratos del dominio → adaptadores de Tauri y SQL.
4. **Trabajo proporcional a lo visible.** El grid es una ventana virtual; el editor analiza lo que cambia. Abrir pestañas o dejar la app abierta no multiplica listeners, cachés ni consultas.
5. **Lo opcional lo paga quien lo activa.** Sin extensiones activas no se carga código de extensiones, no se crean workers ni se consulta una tienda.

## La app por dentro

### Backend (`app/src-tauri/src`)

| Ruta | Qué hace |
| :--- | :--- |
| `lib.rs` | Compone la app y registra los comandos. Nada más. |
| `state.rs` | `AppState`: una `ActiveConnection` por ventana, con su conector, su catálogo compartido (`Arc<SchemaCatalog>`, rehecho solo cuando cambian los schemas) y las consultas que se pueden cancelar. |
| `engine_context.rs` | El contexto de motor de cada conexión, armado una vez al conectar: generación, motor, servidor detectado, modo de sesión, línea efectiva, `schemaEpoch`, soporte del fabricante y verificación. El frontend lo recibe de solo lectura. |
| `commands/` | Un archivo por dominio (`query`, `catalog`, `connection`, `files`, `results`). Cada comando adapta sus argumentos y llama a lo que ya existe; no repite el guard, el catálogo ni los pools. |
| `services/` | Lo que hacen los comandos, sin Tauri: el catálogo del motor, los textos de las consolas, los archivos `.sql`, exportar y editar resultados. |

Todo lo que ejecuta SQL pasa por el guard antes de llegar al driver, con el modo de la sesión: ejecutar, contar filas, exportar y aplicar cambios del grid.

### Frontend (`app/src/lib`)

| Ruta | Qué hace |
| :--- | :--- |
| `workspace/` | La sesión de ejecución (preparar, confirmar, ejecutar, cancelar, registrar), las pestañas de resultados, los cambios del grid, guardar y cerrar consolas, el registro de comandos y los parámetros. |
| `editor/` | Lo de CodeMirror: configuración (`Compartment`), análisis mientras se escribe, diagnósticos, comandos, autocompletado, contexto bajo el cursor, comentarios, formato. El análisis no depende del DOM. |
| `results/` | El grid: ventana virtual, selección, búsqueda, orden, filtros, portapapeles, tipos de celda y edición. |
| `connections/` | Errores e identidad de una conexión, su prueba y el árbol del explorador. |
| `engines/` | El perfil de cada motor (léxico, citas, errores) y `engineForContext`, que le aplica el modo de la sesión. |
| `stores/` | El estado que se comparte, cada uno con un dueño: la conexión y el catálogo (`connection.ts`), las consolas (`queryConsoles.ts`), los borradores del grid (`resultEdits.ts`), el historial, los ajustes. |

`SqlEditor.svelte` y `Workspace.svelte` solo componen: montan lo de estas carpetas y traducen eventos.

### Quién es dueño de cada estado

| Estado | Dueño | Se invalida |
| :--- | :--- | :--- |
| Conexión | `ActiveConnection` en el backend; `stores/connection.ts` en el frontend | Al volver a la lista (`disconnect`) o al cerrar la ventana |
| Motor, versión y modo | `ConnectionEngineContext` | Nunca cambia: reconectar crea otra generación |
| Catálogo | `ActiveConnection.catalog`; `catalogTables` y `databaseExplorer` en el frontend | Cada cambio de schemas sube `schemaEpoch` |
| Caché del análisis | `editor/analysisSession.ts`, una sola a la vez | Otra generación, otro `schemaEpoch`, otro motor u otras tablas creadas por el documento; `analyze_sql` rechaza lo pedido con otro contexto |
| Consolas y su texto | `stores/queryConsoles.ts` | Al cerrar la consola |
| Borradores del grid | `stores/resultEdits.ts` | Al aplicar, revertir o cerrar la pestaña |

### Un solo camino por comando

Cada comando del backend tiene un único módulo del frontend que lo invoca, y `app/src/lib/backend.test.ts` lo fija: ejecutar SQL solo desde `queryExecution.ts` (y a este solo lo llama `workspace/executionSession.ts`), el catálogo solo desde `stores/connection.ts`, las consolas solo desde `stores/queryConsoles.ts`. Un comando nuevo entra en esa tabla con su dueño. `app/src-tauri/src/lib.rs` comprueba que lo que se registra es exactamente lo que el frontend invoca.

### Recursos

Lo que se repite no deja nada detrás: 300 reconexiones alternando motores, 300 ciclos de abrir, ejecutar y cerrar consolas con cambio de tema, y el reposo con una conexión abierta. `app/tests/e2e/resources.mjs` lo comprueba en cada PR con el heap de JavaScript vivo, el backend y el DOM ([tools/bench/README.es.md](../tools/bench/README.es.md#ciclos-de-recursos)).

## Dialectos

`Dialect` en `crates/engine/src/lib.rs` enumera los motores SQL. Agregar uno exige revisar todas las decisiones exhaustivas del motor y del frontend, incluso cuando `sqlparser` conoce su sintaxis. Compartir parser o protocolo no autoriza compartir el guard, las citas, la introspección ni las capacidades sin pruebas. [SQL_ENGINE.es.md](../SQL_ENGINE.es.md) define la matriz, las versiones y las compuertas que demuestran la integración.

Todos los drivers se compilan dentro de la app. No hay features de Cargo para dejar alguno fuera.

## Para seguir

- [Agregar un motor de base de datos](../CONTRIBUTING.es.md#agregar-un-motor-de-base-de-datos), paso a paso.
- [Contrato permanente de motores SQL](../SQL_ENGINE.es.md): qué probar, en qué versiones y cuándo.
- [`design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md) explica qué debe devolver un driver al leer un esquema y cómo manejar las versiones del servidor.
