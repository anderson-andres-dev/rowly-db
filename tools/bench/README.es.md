# Mediciones de rendimiento

[English](README.md) | Español

Mediciones reproducibles contra las que se compara cada fase de la consolidación. Son **compuertas de regresión**, no promesas de latencia: cada fase se compara con la referencia en la misma máquina, y un resultado dentro de la dispersión medida de la referencia se repite antes de decidir. Los benchmarks van aparte de los tests funcionales para que un runner compartido y cargado no haga fallar un pull request.

```text
tools/bench/
  linux/desktop.py          arranque, memoria y reposo de la app real (Linux/Hyprland)
  frontend/                 coste por tecla de los módulos puros del editor (Node, sin WebView)
  compare.py                compara una medición nueva con una carpeta de referencia
  baseline/<etiqueta>/      resúmenes de referencia (JSON); las trazas completas quedan fuera de Git
crates/server-tests/examples/catalog_bench.rs
                            conexión, introspección, guard y análisis por motor (servidores reales)
```

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
| `baseline/v0.3.0-cachyos` | `v0.3.0` compilado desde su etiqueta (`npx tauri build --no-bundle`), igual que la rama con la que se compara | CachyOS, kernel 7.1.8, perfil `balanced` (misma CPU) |

`node-editor.json` no guarda su dispersión, así que una corrida suelta contra otra puede marcar como regresión el ruido de microsegundos. Antes de llamarlo regresión, repite los dos lados (cinco corridas alternadas) y compara las medianas.

## Ciclos de recursos

`app/tests/e2e/resources.mjs` corre en el workflow E2E (Linux/WebKitGTK) y es una compuerta, no un número para comparar: abre la app real con el inspector remoto de WebKit, la maneja con clics y eventos en el DOM y mide lo que delata una fuga.

| Ciclo | Qué hace | Compuerta |
|---|---|---|
| 300 reconexiones | Alterna un perfil MySQL y uno PostgreSQL volviendo a la lista | Cada una muestra su servidor; el análisis usa el catálogo de la conexión actual |
| 300 consolas | Abrir (Ctrl+Shift+Q), ejecutar (Ctrl+Enter), cambiar de paleta en Ajustes y cerrar (Ctrl+F4) | Al final queda un solo editor |
| Reposo con una conexión | 300 s con un resultado en pantalla | Ninguna llamada al backend ni `setInterval`; menos del 10 % de un núcleo |

En todos, desde el calentamiento (ciclo 50), no crecen el heap de JavaScript vivo tras recolectar (±10 % o 2 MB), los objetos vivos (±5 %), el piso de la memoria propia del backend (`Anonymous`, ±5 % o 2 MB) ni los editores y estilos montados. Si el heap crece, el error dice qué clases sumaron objetos.

El PSS del WebKitWebProcess se informa, pero no es compuerta: sube con la memoria que el recolector ya liberó y WebKit retiene, y se aplana solo (con 1500 reconexiones, hacia la 600–700, con JIT y sin él), mientras el heap vivo queda plano. En reposo, bajo Xvfb y sin GPU, el cursor que parpadea y el compositor de GTK son ~3 % de un núcleo.

En local: `xvfb-run node app/tests/e2e/resources.mjs --app <binario>`, con las bases de `run.mjs` y PostgreSQL en `E2E_PG_PORT`/`E2E_PG_USER`. `E2E_ONLY` elige un ciclo; `E2E_RECONNECTIONS`, `E2E_CONSOLE_CYCLES` y `E2E_IDLE_SECONDS` cambian su largo.

## Qué todavía no se mide

Latencia de tecla a pintado y duración de frames del grid: necesitan instrumentar la app (`performance.mark` e `Instant` de Rust alrededor de cada operación). Windows/WebView2 y macOS/WKWebView se miden en esas máquinas. Un escenario que falta se informa como faltante, nunca como aprobado.
