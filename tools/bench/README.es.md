# Mediciones de rendimiento

[English](README.md) | Español

Mediciones reproducibles contra las que se compara cada cambio que toca rendimiento. Son **compuertas de regresión**, no promesas de latencia: cada cambio se compara con la referencia en la misma máquina, y un resultado dentro de la dispersión medida de la referencia se repite antes de decidir. Los benchmarks van aparte de los tests funcionales para que un runner compartido y cargado no haga fallar un pull request.

```text
tools/bench/
  linux/desktop.py          arranque, memoria y reposo de la app real (Linux/Hyprland)
  frontend/                 coste por tecla de los módulos puros del editor (Node, sin WebView)
  compare.py                compara una medición nueva con una carpeta de referencia
  baseline/<etiqueta>/      resúmenes de referencia (JSON); las trazas completas quedan fuera de Git
crates/server-tests/examples/catalog_bench.rs
                            conexión, introspección, guard y análisis por motor (servidores reales)
```

## Presupuesto

| Escenario | Qué se mide | Regla |
|---|---|---|
| Arranque frío y caliente, 20 repeticiones | Tiempo hasta la ventana, PSS al quedar estable, JS inicial | No más de 5 % sobre la mediana de la referencia; dentro de la dispersión de la máquina, se repite antes de decidir |
| Cinco minutos sin interacción, sin conexión y con una | CPU, memoria, timers, llamadas al backend | Sin pendiente creciente; sin trabajo ni red de extensiones desactivadas |
| Escribir con 10 000 líneas y abrir un documento de 1 M | Coste por tecla del índice, análisis, contexto | Dentro de la dispersión de la referencia; los documentos grandes no empeoran más de 10 % ni bloquean la UI |
| 300 reconexiones, 300 ciclos de consola y 300 de sesiones de terminal | Heap vivo, objetos, backend, editores y estilos montados | Tras calentar, sin pendiente sostenida; todo crecimiento se explica y se acota (ver [Ciclos de recursos](#ciclos-de-recursos)) |
| MySQL, MariaDB y PostgreSQL con catálogos pequeños y grandes | Conexión, introspección, análisis | Un cambio de UI o una extensión desactivada no suma consultas SQL |

Los porcentajes son compuertas de **regresión**, no promesas de latencia en todo hardware. Un fallo se reproduce en el mismo equipo y se acompaña de un perfil de CPU, memoria o traza de frames.

## Cómo se ejecuta

```bash
# App real, binario release, perfil vacío y aislado, workspace especial fuera de pantalla
python3 tools/bench/linux/desktop.py startup --app rowly --binary <ruta> --mode warm --runs 20 --label <etiqueta> --out <dir>/linux-rowly-startup-warm.json
python3 tools/bench/linux/desktop.py startup --app rowly --binary <ruta> --mode cold --runs 20 --label <etiqueta> --out <dir>/linux-rowly-startup-cold.json
python3 tools/bench/linux/desktop.py idle    --app rowly --binary <ruta> --seconds 300 --label <etiqueta> --out <dir>/linux-rowly-idle.json

# Módulos del editor en Node
cd app && BENCH_OUT=<dir>/node-editor.json npx vitest run --config ../tools/bench/frontend/vitest.config.mts

# Motores contra tools/test-dbs (una corrida a la vez, nunca contra una base de usuario)
tools/test-dbs/up.sh
cargo run --release -p rowly-server-tests --example catalog_bench -- <dir>/catalog.json

# Tecla a pintado y cuadros del grid en la app real (ver abajo)
cd app && xvfb-run --auto-servernum node tests/e2e/resources.mjs --app <binario> --measure <dir>/linux-rowly-latency.json

# Comparar con la referencia
python3 tools/bench/compare.py tools/bench/baseline/v0.3.0 <dir>
```

`desktop.py` mide desde fuera de la app y nunca le envía teclas: tiempo hasta que la ventana existe, tiempo hasta que el árbol de procesos queda en reposo (menos de 20 ms de CPU en el último segundo), PSS de todo el árbol cinco segundos después y los extremos TCP que abre. `--app beekeeper` corre los mismos escenarios con Beekeeper Studio para la comparación de producto. Una corrida `cold` expulsa de la caché de páginas, con `posix_fadvise`, los archivos que mapea la app (no hace falta root); las bibliotecas que otro proceso mantiene mapeadas no se pueden expulsar, así que es un arranque frío aproximado.

No midas mientras compilas o corres tests: otra carga en la máquina cambia los resultados.

## Referencias

Compara solo con una referencia tomada en la misma máquina y el mismo sistema:

| Referencia | Qué se midió | Dónde |
|---|---|---|
| `baseline/v0.3.0` | El binario publicado (`rowly-db-bin 0.3.0-1`), con Beekeeper Studio y el banco de motores | Omarchy, kernel 7.2.5, perfil `performance` |
| `baseline/terminal-post` | T3 de la terminal integrada: lo mismo que `terminal-pre`, con `af33348` medido otra vez en esta máquina (`*.pre-local.json`) y la AppImage pre y post de CI; la comparación con los presupuestos, en `summary.json` | CachyOS, kernel 7.1.8, perfil `performance`, con batería |
| `baseline/v0.3.0-cachyos` | `v0.3.0` compilado desde su etiqueta (`npx tauri build --no-bundle`), igual que la rama con la que se compara | CachyOS, kernel 7.1.8, perfil `balanced` (misma CPU) |
| `baseline/c5-cachyos` | El cierre de la consolidación, medido alternado con `v0.3.0-cachyos` en la misma sesión; `node-editor.json` es la mediana de 5 corridas | CachyOS, kernel 7.1.8, perfil `balanced` |
| `baseline/hardening-cachyos` | Tecla a pintado y cuadros del grid (`linux-rowly-latency.json`), la primera vez que se midieron: mediana de 3 corridas del binario release bajo Xvfb, cada corrida guardada en `runs` | CachyOS, kernel 7.1.8, perfil `balanced` |
| `baseline/terminal-pre` | `develop` en `af33348` (v0.4.0) antes de la terminal integrada: bundle, arranque caliente, reposo, ciclos de `resources.mjs` y el primer byte del shell de login fuera de la app; tamaños del binario y de los paquetes en `summary.json` | Omarchy, kernel 7.2.5, perfil `performance` |

`node-editor.json` no guarda su dispersión, así que una corrida suelta contra otra puede marcar como regresión el ruido de microsegundos. Antes de llamarlo regresión, repite los dos lados (cinco corridas alternadas) y compara las medianas.

## Ciclos de recursos

`app/tests/e2e/resources.mjs` corre en el workflow E2E (Linux/WebKitGTK) y es una compuerta, no un número para comparar: abre la app real con el inspector remoto de WebKit, la maneja con clics y eventos en el DOM y mide lo que delata una fuga.

| Ciclo | Qué hace | Compuerta |
|---|---|---|
| 300 reconexiones | Alterna un perfil MySQL y uno PostgreSQL volviendo a la lista | Cada una muestra su servidor; el análisis usa el catálogo de la conexión actual |
| 300 consolas | Abrir (Ctrl+N), ejecutar (Ctrl+Enter), cambiar de paleta en Ajustes y cerrar (Ctrl+W) | Al final queda un solo editor |
| Reposo con una conexión | 300 s con un resultado en pantalla | Ninguna llamada al backend ni `setInterval`; menos del 10 % de un núcleo |
| Pestaña Terminal | Sin consola, cambiando de consola, Ctrl+T ida y vuelta, `+` y `×` por sesión | Ocupa el lugar del grid sin mover el panel ni sumar un splitter; cada lado conserva su estado; `×` cierra solo su shell; la pestaña queda sin sesiones |
| 300 sesiones | Abrir con `+`, esperar el shell y cerrar con `×` | Ningún shell vivo y el backend con los mismos hilos que antes |
| Reposo con 1, 5 y 10 sesiones | 300 s con una, 60 s con 5, con 10 y con la terminal oculta; luego se cierran todas | Como el reposo con una conexión; como mucho 15 MB por sesión; al cerrarlas, los hilos de antes |
| Salida grande | 50 MB en base64 y luego `yes` durante 30 s | Los 50 MB terminan; en la ráfaga y con `yes`, como mucho 2 ticks del bucle de eventos (o el 2 %) pasan de 200 ms; con `yes`, entre los 10 y los 30 s, la memoria propia no crece más de 10 MB en el backend ni de 60 MB en WebKit |

En todos, desde el calentamiento (ciclo 50), no crecen el heap de JavaScript vivo tras recolectar (±10 % o 2 MB), los objetos vivos (±5 %), el piso de la memoria propia del backend (`Anonymous`, ±5 % o 2 MB) ni los editores y estilos montados. Si el heap crece, el error dice qué clases sumaron objetos.

El PSS del WebKitWebProcess se informa, pero no es compuerta: sube con la memoria que el recolector ya liberó y WebKit retiene, y se aplana solo (con 1500 reconexiones, hacia la 600–700, con JIT y sin él), mientras el heap vivo queda plano. En reposo, bajo Xvfb y sin GPU, el cursor que parpadea y el compositor de GTK son ~3 % de un núcleo.

En local: `xvfb-run node app/tests/e2e/resources.mjs --app <binario>`, con las bases de `run.mjs` y PostgreSQL en `E2E_PG_PORT`/`E2E_PG_USER`. `E2E_ONLY` elige un ciclo; `E2E_RECONNECTIONS`, `E2E_CONSOLE_CYCLES`, `E2E_TERMINAL_CYCLES` y `E2E_IDLE_SECONDS` cambian su largo.

## Tecla a pintado y cuadros del grid

`resources.mjs --measure <archivo>` corre dos mediciones en lugar de los ciclos, con la misma app, perfil e inspector, y escribe sus percentiles. Son un **benchmark de release** que se compara con una referencia del mismo equipo, no una compuerta de CI: bajo Xvfb sin GPU la cola se mueve demasiado entre corridas (el p95 de las teclas con 10 000 líneas fue de 159 a 249 ms en tres corridas), y un runner compartido solo sumaría ruido.

| Medición | Cómo | `hardening-cachyos` (mediana de 3) |
|---|---|---|
| Tecla a pintado, 20 y 10 000 líneas | 200 teclas al final del documento, una cada 80 ms, escritas con `execCommand("insertText")` (CodeMirror las lee del DOM como al escribir de verdad). Cada una cuenta hasta que el cuadro siguiente se pintó: el `requestAnimationFrame` siguiente y después un mensaje. Incluye la espera del cuadro, así que el piso es de un cuadro más o menos. | 20 líneas: p50 21, p95 25, p99 28 ms. 10 000 líneas: p50 27, p95 205, p99 373 ms |
| Cuadros del grid, 2000 × 120 | Un resultado de 2000 filas y 120 columnas (página de 2000) desplazado una vez por cuadro: 210 cuadros hacia abajo y 90 a la derecha. Se guarda cada intervalo entre cuadros y el máximo de `<td>` montados a la vez. | p50 17, p95 27, p99 41 ms; 23 de 300 cuadros pasan de 25 ms, ninguno de 50 ms; como mucho 17 920 celdas montadas |

Lo que dicen estos números: con texto normal, lo escrito se pinta en el cuadro siguiente; desplazar el grid no pierde más de un cuadro seguido, y su DOM queda acotado por lo visible. Con 10 000 líneas, la mediana es la misma pero algunas teclas tardan 200–400 ms. Nada lo medía antes, así que no se sabe si es una regresión. Encontrar la causa necesita un perfil de esas teclas, y eso queda pendiente.

Windows/WebView2 y macOS/WKWebView se miden en esas máquinas. Un escenario que falta se informa como faltante, nunca como aprobado.
