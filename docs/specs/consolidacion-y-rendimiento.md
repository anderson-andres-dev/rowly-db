# Consolidación de Rowly DB y presupuesto de rendimiento — diseño

## Estado y alcance

**Propuesta, sin implementación.** Punto de partida: `v0.3.0` (2026-10-02).
Este documento organiza el trabajo sobre lo que Rowly DB ya hace. Las reglas
específicas de [motores y versiones](contrato-motores-y-versiones.md) y el
futuro de [extensiones y tienda](plataforma-de-extensiones.md) tienen sus
propios documentos. Las tres propuestas se implementan por fases pequeñas;
ninguna fase exige crear una función visible nueva.

**Vida del documento:** es un plan temporal. Cada fase cerrada traslada su
arquitectura vigente a `docs/ARCHITECTURE*.md`, su procedimiento a
`CONTRIBUTING*.md` y sus obligaciones SQL a `SQL_ENGINE*.md`. Cuando C5 esté
cerrada, se elimina esta spec; ninguna guía permanente depende de ella.

**Resultado buscado:** la app base conserva sus capacidades actuales, arranca
rápido, consume recursos de forma estable durante horas y permite cambiar una
parte sin tener que entender toda la pantalla o todos los motores.

**Visión de producto:** Rowly DB debe poder competir directamente con clientes
de escritorio consolidados como TablePlus y Beekeeper Studio. Para eso, cada
flujo básico debe ser predecible, rápido y seguro durante sesiones largas. Esta
etapa construye esa confianza mediante arquitectura y pruebas; no se evalúa
por cantidad de funciones nuevas.

## 1. Reglas de arquitectura

1. **Una responsabilidad y un dueño por estado.** La conexión, el catálogo, la
   ejecución, las pestañas de resultado y el documento del editor tienen ciclos
   de vida diferentes. Un módulo puede leer el estado de otro mediante una
   interfaz, pero no mantener una segunda copia mutable del mismo dato.
2. **Un solo camino para ejecutar SQL.** Editor, historial, tabla, paginación y
   futuras extensiones pasan por la misma clasificación, confirmación y
   ejecución del host. La UI no decide si una instrucción es segura.
3. **Dependencias en una dirección:** componentes Svelte → casos de uso de la
   app → contratos y stores del dominio → adaptadores Tauri/SQL. Los módulos
   del dominio no importan componentes, ventanas ni paquetes opcionales.
4. **Extracción por comportamiento.** Se separan operaciones con entradas,
   salidas y vida claras; partir un archivo por número de líneas no basta.
   Una extracción conserva atajos, foco, estados de error y orden de eventos.
5. **Trabajo proporcional a lo visible.** El grid conserva la virtualización
   por filas y columnas; el editor conserva el análisis incremental. Abrir
   varias pestañas o mantener la app abierta no multiplica listeners, temas,
   consultas ni cachés sin límite. Se mantienen la virtualización del grid,
   los `RangeSet` del editor, el trabajo acotado al área visible y la
   persistencia de documentos grandes fuera de `localStorage`.
6. **Vanilla primero.** Preparar un punto de extensión no carga código de
   plugins, no crea workers y no consulta una tienda al arrancar. El costo de
   una función opcional lo paga quien la activa.

## 2. Inventario y límites propuestos

| Hoy | Responsabilidad que queda | Extracción propuesta | Regla de dependencia |
|---|---|---|---|
| `components/Workspace.svelte` (más de 2 000 líneas) | Componer editor, resultados y diálogos; enlazar eventos | `workspace/resultTabs.ts`: identidad, orden, fijar/desfijar y cierre; `workspace/tableQueries.ts`: filtros y una consulta activa por pestaña; `workspace/executionSession.ts`: preparar, confirmar, ejecutar, cancelar y registrar; `workspace/resultChanges.ts`: borrador, vista previa y aplicación; `workspace/consoleFiles.ts`: guardar/cerrar | Cada módulo recibe identificadores y servicios concretos. Solo `executionSession` llama a `queryExecution`; las vistas no lo hacen por otra ruta. |
| `SqlEditor.svelte` (más de 1 200 líneas) | Montar `EditorView`, mostrar chrome y traducir eventos a comandos | `editor/configuration.ts`: extensiones y `Compartment`; `editor/analysisSession.ts`: análisis, caché e invalidación; `editor/commands.ts`: acciones y selección; `editor/diagnosticPresentation.ts`: contador, navegación y popup | CodeMirror queda dentro de `editor/`. El análisis no depende del DOM; la vista no decide reglas de motor. |
| `app/src-tauri/src/lib.rs` (más de 1 100 líneas) | `AppState`, composición y registro de comandos | `commands/connection.rs`, `commands/query.rs`, `commands/catalog.rs`, `commands/results.rs` y `commands/files.rs` | Un comando adapta argumentos y llama al servicio existente. No se duplican guard, catálogo ni pools. |
| `engines/` y `crates/drivers/*/version.rs` | Reglas por motor y capacidades actuales | Contrato de contexto de motor y línea del documento de motores | Una versión visible no se infiere del texto de la UI; el contexto nace de la conexión. |

Las rutas son el destino esperado, sujeto a comprobar las dependencias en la
fase C0. Se conserva `stores/queryConsoles.ts` como dueño de las consolas y
`stores/resultEdits.ts` como dueño de los borradores: extraer controladores no
significa introducir stores paralelos. Cada controlador tiene `dispose()` o
queda ligado explícitamente a la vida del componente o de la conexión.
Svelte conserva el estado efímero de presentación; las funciones extraídas
son puras o reciben sus dependencias al crearse. No se añade un bus global de
eventos para comunicar módulos que antes estaban en el mismo componente.

### Contratos antes de mover código

- `ExecutionRequest` identifica consola, conexión, SQL y destino del resultado.
  `ExecutionOutcome` distingue filas, comando, error, cancelación y
  confirmación pendiente. El identificador de ejecución impide aplicar una
  respuesta vieja a una pestaña nueva.
- `ConnectionContext` es una instantánea inmutable del motor, modo SQL,
  catálogo y línea de versión efectivos; se invalida al reconectar, cambiar
  modo o refrescar el catálogo. Su detalle está en la spec de motores.
- Los comandos del editor emiten una intención (`executeSelection`, `find`,
  `format`, etc.); el host decide permisos y destino. El registro de comandos
  mantiene una sola política para teclas y menús.
- El estado de pestañas conserva claves estables. Fijar, desfijar y reordenar
  son operaciones puras probables sin montar Svelte ni abrir una base.

### Árbol de responsabilidades de la app

Destino propuesto, que C0 ajusta según dependencias reales. Cada directorio
tiene una API pública pequeña; los componentes no importan archivos internos
de otro dominio.

```text
app/src/lib/
  workspace/       sesión de ejecución, pestañas, cambios y archivos
  editor/          configuración CodeMirror, análisis y comandos
  results/         ventana del grid, selección, filtros y edición
  connections/     identidad, sesión y catálogo visible
  engines/         perfil de presentación por motor; sin estado de conexión
  stores/          persistencia compartida con un dueño declarado
app/src/lib/components/
  workspace/ editor/ results/ connections/  vistas y diálogos
app/src-tauri/src/
  commands/        adaptadores IPC por dominio
  services/        casos de uso con AppState y guard único
```

Mover un módulo exige registrar quién crea y destruye su estado, cómo se
invalida y qué llamadas cruza. Un árbol de carpetas sin esas respuestas sería
solo un cambio cosmético. El diseño de Rust para motores y versiones está en
la spec correspondiente.

## 3. Presupuesto y medición

**Primero medir.** C0 guarda una referencia reproducible de `v0.3.0` con
binario de release y datos fijos. Se mide en Windows/WebView2, macOS/WKWebView
y Linux/WebKitGTK; en Linux se registra GPU, compositor y si está activa la
mitigación de NVIDIA. No se comparan máquinas ni builds de desarrollo.

| Escenario | Señal que se guarda | Regla inicial de aceptación |
|---|---|---|
| Arranque frío y caliente, 20 repeticiones | tiempo hasta primera interacción, RSS/working set al quedar estable, tamaño del instalador y JS inicial | La consolidación no añade más de 5 % frente a la mediana base; una diferencia dentro de la variación de la máquina se repite antes de decidir. |
| Cinco minutos sin interacción, sin conexión y con una conexión | CPU, memoria, timers, listeners y peticiones de red | Sin pendiente creciente; sin trabajo o red de extensiones cuando están desactivadas. |
| Escribir y cambiar de pestaña con 10 000 líneas, y abrir un documento de 30 MB / 1 M de líneas | latencia p50/p95/p99 de tecla a pintado, tiempo de análisis, uso de caché y memoria máxima | El texto normal busca p95 dentro de un frame de 60 Hz (16,7 ms); los documentos grandes no empeoran más de 10 % frente a la base ni bloquean la UI mientras se analizan. |
| Grid de 2 000 × 120; scroll, filtro, edición y resize | duración p95/p99 de frames, celdas DOM montadas, saltos visuales | Sin huecos; el DOM sigue acotado por la ventana visible y el p95 de frames no empeora más de 10 %. |
| 300 ciclos de abrir/cerrar consola, ejecutar y cambiar de tema | RSS, heap, nodos, listeners y reglas CSS en los ciclos 100/200/300 | Tras calentar cachés, sin pendiente sostenida; cualquier crecimiento se explica y se acota. |
| MySQL, MariaDB y PostgreSQL con catálogos pequeños y grandes | tiempo de conexión/introspección, análisis, consultas extra por acción | Un cambio de UI o una extensión desactivada no genera consultas SQL adicionales. |

Los porcentajes son compuertas de **regresión**, no promesas de latencia
idéntica en todo hardware. C0 registra la dispersión; si excede 5 %, fija un
umbral por escenario antes del primer refactor. Un fallo de rendimiento se
reproduce en el mismo equipo y se acompaña de un perfil de CPU, memoria o
traza de frames. Se guarda un resumen JSON versionado en `tools/bench/baseline/`
y trazas completas como artefactos, no dentro de Git. Las pruebas unitarias
verifican complejidad y comportamiento; los tiempos de WebView se miden en
un entorno estable, no con umbrales frágiles en runners compartidos.

Como referencia de la visión de producto, C0 registra también los mismos
recorridos básicos en TablePlus y Beekeeper Studio sobre el mismo equipo,
servidor y dataset: arranque, conexión, primera consulta, desplazamiento del
grid y memoria después de una sesión prolongada. Se anotan versión, plataforma
y diferencias de función para que la comparación sea reproducible. El objetivo
de cada fase es cerrar brechas observadas sin perder el presupuesto de Rowly;
no se declara paridad por una captura o una medición aislada.

### Instrumentación prevista

- Marcas `performance.mark/measure` alrededor de montar el editor, primera
  interacción, análisis, actualización del grid y cierre. En Rust, `Instant`
  alrededor de introspección, clasificación y ejecución, con el ID de
  operación para unir ambas trazas. Sin texto SQL ni credenciales en logs.
- Un contador de `EditorView`, workers, listeners y timers activos, solo en
  builds de diagnóstico. Una prueba de 300 ciclos comprueba que vuelven al
  nivel estable tras cerrar.
- El reporte distingue trabajo de Rowly DB, latencia de red y tiempo del
  servidor. Una consulta lenta de la base no se etiqueta como lentitud de UI.

## 4. Reorganización de pruebas de producto

La suite actual es la referencia inicial, no un inventario que haya que
conservar entero. Hay tests útiles junto al código, pero también corpus y
escenarios dispersos. Se reconstruyen los contratos importantes con entradas
reales, responsables claros y una ejecución reproducible. La suite SQL por
motor y versión la define la [spec de motores](contrato-motores-y-versiones.md)
y obedece [SQL_ENGINE](../../SQL_ENGINE.es.md).

```text
app/src/lib/<dominio>/*.test.ts       lógica pura y contrato local
app/tests/integration/<dominio>/      interacción entre stores, servicios e IPC simulado
app/tests/e2e/<flujo>/                app real: teclado, foco, conexión y resultados
crates/<crate>/src/                   unitarios junto al código Rust
crates/server-tests/tests/            contratos con servidores reales (spec de motores)
tests/fixtures/product/               datos deterministas compartidos por flujo
tools/bench/                           escenarios y resultados de rendimiento
```

El test local usa dobles solo para límites externos y comprueba un resultado
observable. Integración usa el adaptador real cuando es barato; E2E usa una
base efímera y la app real. No se duplica el mismo caso en tres niveles: cada
nivel cubre un fallo distinto. Los recorridos críticos son abrir conexión,
editar SQL, completar, ejecutar, confirmar/cancelar, navegar resultados,
editar/aplicar cambios, guardar y recuperar una sesión; también error de red,
cancelación y reconexión. Teclado y foco forman parte del contrato visible.

### Depuración de la suite existente

1. C0 genera `tests/inventory.json` con ruta, dominio, propiedad observada,
   riesgo, compuerta, duración y dependencias de cada test. Se cruza con
   bugs históricos, `SQL_ENGINE` y los flujos anteriores; los huecos se
   convierten en casos nuevos.
2. Cada test recibe una decisión **conservar, mover, reescribir o eliminar**.
   Se reescribe si replica la implementación, usa fixtures inventados que no
   representan al servidor, depende del orden o solo prueba un detalle sin
   contrato. Se elimina si es duplicado, obsoleto o no detecta un fallo
   relevante; se registra su motivo y el test o requisito que lo sustituye.
3. Se migra un dominio por PR: primero entran fixtures y pruebas nuevas,
   luego se compara el resultado con la suite antigua y finalmente se quitan
   las pruebas reemplazadas. Una prueba crítica no desaparece mientras su
   propiedad no tenga cobertura equivalente y ejecutada en CI.
4. Las regresiones P0/P1 se prueban con una falla intencional controlada o un
   caso adversario conocido para demostrar que el test realmente falla. Se
   mantiene el ejemplo mínimo; no se mide calidad por número de tests ni por
   porcentaje bruto de líneas cubiertas.

La migración es grande: se reparte entre C1–C5 y M0–M5, con suites antigua y
nueva coexistiendo solo durante el PR del dominio. Un inventario de tests sin
dueño o con ejecución manual permanente impide cerrar C5.

### Retirar lo que ya no se usa

C0 añade al inventario exports, rutas de ejecución, stores, estilos,
traducciones, scripts y dependencias que no tienen consumidor. Una búsqueda de
referencias y el grafo de imports proponen candidatos; un test de flujo o una
inspección de uso real decide si son dinámicos antes de borrarlos. C2–C4
eliminan cada adaptador antiguo en el mismo PR que migra su último consumidor.
C5 comprueba que no quedan caminos paralelos para ejecutar SQL, cargar un
catálogo o guardar una consola, ni paquetes de runtime sin uso. El reporte
incluye el cambio de tamaño de JS/binario y tiempo de arranque. No se borra
una API pública solo porque una búsqueda estática no encuentre referencias:
primero se revisan IPC, comandos, migraciones de datos y extensiones futuras.

### Compuertas de producto

| Momento | Qué corre | Condición |
|---|---|---|
| Cada PR | Formato, tipos, lint estricto, unitarios e integración frontend/Rust, contrato SQL rápido | Automático, determinista y sin `#[ignore]` accidental. |
| PR que toca flujo SQL | Lo anterior y la matriz de motor/versiones afectadas de `SQL_ENGINE` | El reporte enumera motor, línea y versión exacta; no acepta verde parcial como cobertura completa. |
| Release | Matriz SQL completa, E2E críticos en las plataformas disponibles y humo manual en las tres WebViews; presupuesto de §3 | P0/P1 conocidos = 0; fallos y límites constan en el reporte de release. |

Una prueba de UI que no pueda automatizarse aún tiene dueño, pasos y fecha de
automatización; no se confunde con una compuerta verde. Los benchmarks se
separan de los tests funcionales para evitar fallos espurios por la carga de
un runner compartido.

## 5. Plan por PRs revisables

| Fase | Cómo se hace | Entregable y condición de cierre |
|---|---|---|
| C0. Mapa y referencia | Dibujar flujo de estado y llamadas en `Workspace`, `SqlEditor` y `lib.rs`; medir los escenarios de §3 en `v0.3.0`; crear `tests/inventory.json` y asignar decisiones a los tests actuales. | Diagrama, datos base, matriz de pruebas por dominio y lista de riesgos; ningún cambio funcional. |
| C1. Compuerta de calidad | Añadir `npm test` al workflow Quality y hacer fallar clippy con warnings; crear harness de integración/E2E y contratos de teclado, confirmación y persistencia. | CI comprueba frontend, Rust y ruta SQL crítica; cada test nuevo tiene dueño y compuerta. Verde en `main` antes de mover módulos. |
| C2. Workspace | Extraer primero funciones puras de pestañas y filtros. Después mover una ruta de ejecución a la vez, conservando `queryConsoles` como dueño. La ruta de confirmación queda única. | Cada PR conserva la UI y sus tests; ninguna segunda llamada directa a `executeQuery`. Comparar el perfil C0. |
| C3. Editor | Extraer configuración de CodeMirror, sesión de análisis y comandos. Mantener los `Compartment` existentes y su reconfiguración puntual; no reconstruir el editor al cambiar un ajuste. | Misma selección, undo, foco, diagnósticos y edición de comentarios; documento grande y ciclo de pestañas sin regresión. |
| C4. Backend | Mover comandos por dominio, con `AppState` único, `Arc` de catálogo compartido y guard previo a ejecutar. | Tests Rust y de servidor real de los caminos tocados; mismas respuestas serializadas de Tauri. |
| C5. Cierre | Medir otra vez todos los escenarios, quitar adaptadores transitorios y tests reemplazados, actualizar arquitectura y guías. | Tabla antes/después, flujos críticos automatizados, inventario sin huérfanos y ninguna nueva dependencia de runtime para preparar plugins. |

La spec de motores gobierna C2–C4 cuando se toca una regla SQL. La spec de
extensiones define los **puntos** que conviene preservar durante C3; su
runtime, tienda y ejemplos vienen después de C5. Cada PR incluye un mapa de
estado que se mueve, test de equivalencia y medición del escenario afectado.

## 6. Criterios para aceptar la consolidación

- La conducta actual de las tres bases y de sus versiones sigue la matriz de
  [SQL_ENGINE.es.md](../../SQL_ENGINE.es.md), sin caídas silenciosas a MySQL.
- Las rutas de ejecutar, confirmar, cancelar y aplicar cambios son únicas y
  mantienen el foco y los atajos existentes.
- Abrir/cerrar pestañas, editor y ventanas libera recursos; el costo no crece
  con el tiempo de uso ni con el número de filas fuera de pantalla.
- `npm run check`, `npm test`, `npm run build`, `cargo fmt`, `cargo clippy` y
  `cargo test --workspace` pasan; los cambios del motor cumplen sus compuertas
  contra servidores reales.
- Cada test restante declara propiedad y dueño; las pruebas sustituidas se
  retiraron con evidencia de reemplazo. Los recorridos críticos pasan E2E y
  la cobertura SQL se traza a `SQL_ENGINE`, por versión exacta certificada.
- La app base no carga ni consulta extensiones y conserva los presupuestos de
  §3. Si una fase no los cumple, se corrige antes de seguir con la siguiente.
