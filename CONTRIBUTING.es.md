# Contribuir

[English](CONTRIBUTING.md) · **Español**

Gracias por ayudar. El proyecto es joven y muchas decisiones de diseño siguen abiertas, así que si vas a hacer algo grande, abre antes un issue y lo conversamos.

## Nombres

Rowly DB es el producto. Khipu es el nombre interno de su motor, y por eso los crates, identificadores y claves de configuración empiezan con `khipu`. No los cambies. Todo lo que ve el usuario dice Rowly DB.

## Primeros pasos

```bash
cargo build
cd app
npm install
npm run tauri dev
```

Necesitas Rust 1.85+ y Node.js 20.19+. En [ARCHITECTURE.es.md](docs/ARCHITECTURE.es.md) está cómo se organiza el código y dónde va cada tipo de cambio.

Si tocas un motor, un driver, SQL generado, análisis o ejecución, lee primero [SQL_ENGINE.es.md](SQL_ENGINE.es.md). Es el contrato permanente de calidad: matriz S/A/G/D, versiones, pruebas reales, compuertas y huecos conocidos. Añadir o cambiar un motor de base de datos, una línea de versión o una versión verificada sigue [ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md). Las notas de diseño son planes de trabajo y no sustituyen a ninguno de los dos.

## Flujo de trabajo

`main` guarda las versiones publicadas y `develop` es donde se integra el trabajo. Ninguna acepta push directo.

1. Crea una rama desde `develop` con el nombre `feature/<nombre>`.
2. Abre un pull request hacia `develop`.
3. Espera a que pase el check `quality`.
4. Cuando está revisado y probado en la app, se fusiona.

Antes de abrir el pull request, ejecuta:

```bash
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cd app && npm run check && npm test && npm run build
cd .. && node tools/inventory/tests.mjs --check
node tools/inventory/coverage.mjs           # cada fila de SQL_ENGINE §6 respondida para cada motor
node tools/inventory/dependencies.mjs       # solo versiones publicadas de las dependencias
node tools/inventory/status.mjs             # el estado generado de README y SQL_ENGINE al día
node tools/architecture/graph.mjs --check   # dependencias permitidas y grafo de arquitectura al día
```

Los bloques entre marcadores `<!-- generated: … -->` los escriben esas herramientas; nunca los edites a mano. `status.mjs --write` y `graph.mjs --write` los regeneran. `graphify-out/` es el grafo de símbolos para explorar; actualízalo con `graphify update .` cuando cambies código, si tienes [graphify](https://github.com/Graphify-Labs/graphify) (`graphifyy` en PyPI) instalado.

El CI corre la misma compuerta con Rust 1.90 (`.github/workflows/quality.yml`); un clippy local más nuevo puede no ver un aviso que la 1.90 sí marca, así que `cargo +1.90 clippy --workspace --all-targets -- -D warnings` lo reproduce tal cual. Cada archivo de test necesita una entrada en `tests/inventory.json` con su dueño, la propiedad que protege, su riesgo, su compuerta y una decisión; el `--check` falla hasta que la tenga.

El workflow **E2E** compila la app y la maneja en Linux/WebKitGTK contra un MySQL y un PostgreSQL desechables. `app/tests/e2e/run.mjs` usa el teclado con `tauri-driver`: conectar, ejecutar con Ctrl+Enter, confirmar y cancelar una sentencia destructiva, la confirmación de producción en la consola y en el grid, contar el total y el texto de la consola tras reiniciar. Necesita `WebKitWebDriver`, así que normalmente solo corre en el CI. `app/tests/e2e/resources.mjs` abre la app con el inspector de WebKit y comprueba que reconectar, abrir y cerrar consolas y el reposo no dejan memoria, editores ni trabajo detrás; corre también en local con `xvfb-run` ([tools/bench/README.es.md](tools/bench/README.es.md#ciclos-de-recursos)). Windows/WebView2 y macOS/WKWebView siguen siendo humo manual antes de una release.

El código nuevo va en la carpeta de su dominio ([docs/ARCHITECTURE.es.md](docs/ARCHITECTURE.es.md#reglas-de-la-app)): `workspace/`, `editor/`, `results/` o `connections/` en el frontend; `commands/` adapta y `services/` hace en el backend. Su test va junto al código. Un comando nuevo del backend se registra en `lib.rs` y entra con su único módulo dueño en `app/src/lib/backend.test.ts`.

## Pruebas contra una base real

`cargo test --workspace` no necesita ninguna base de datos. Las pruebas que sí la necesitan están marcadas con `#[ignore]` y corren contra los servidores de `tools/test-dbs` (MySQL, MariaDB y PostgreSQL con las bases de ejemplo Sakila / Pagila), un contenedor por versión exacta, fijado por digest en `tools/test-dbs/lines.json`:

```bash
tools/test-dbs/up.sh                       # o una versión verificada: tools/test-dbs/up.sh postgres=13.23
cargo test -p rowly-server-tests -- --ignored --test-threads=1
```

`safety` prueba el guard, `analysis` el divisor de sentencias y el analizador, `generated` el SQL que escribe la app; `contract` prueba los drivers por la API que usa la app: resultados, truncado, errores, sesión, introspección y TLS (lo que ofrece cada imagen es el `tls` de su versión en `lines.json`). Antes de ejecutar, el harness comprueba que el servidor es la versión que declara `lines.json`. Lo que una versión no tiene cuenta como N/A solo si el servidor lo rechaza. Ver `tools/test-dbs/README.es.md`.

`tools/test-dbs/lines.sh` comprueba los límites de las líneas de versión. El CI corre todo esto en cada PR de motor, en cada versión exacta verificada (`.github/workflows/sql-engine.yml`); los comandos y las reglas están en [SQL_ENGINE.es.md, §7](SQL_ENGINE.es.md#7-compuertas). No anuncies una versión como verificada sin su evidencia completa.

Los paquetes de soporte de versión (SQL_ENGINE.es.md, §11) salen de `support/` con `node tools/support/publish.mjs --out <dir> --evidence <artefactos real-* y lines-* de sql-engine.yml, del mismo commit>`, con la clave de firma de las actualizaciones en `TAURI_SIGNING_PRIVATE_KEY`; la herramienta se niega sin evidencia completa. Los fixtures de prueba se regeneran con `node tests/support/fixtures.mjs` y están firmados con `tests/support/test-key`, una clave solo de prueba.

Al preparar una release, comprueba las fechas de soporte en los avisos oficiales de cada fabricante y después ejecuta `python3 tools/support/vendor-support.py` desde la raíz. El script usa `endoflife.date` como listado y aplica excepciones oficiales cuando hay discrepancias. Revisa el diff de `tools/support/vendor-support.json` y corre `node tools/inventory/status.mjs --write`, que regenera SQL_ENGINE §5.3 a partir de él.

La ventana de soporte avanza con el calendario: 90 días antes de que una versión verificada salga de ella, `tools/test-dbs/window.mjs` avisa en Quality (sin fallar), y la release no se publica mientras siga en `verified` pasada la fecha. Entonces pásala de `verified` a `retired` en `tools/test-dbs/lines.json`, con `until` y `evidence` (commit y corrida de su última evidencia verde de `sql-engine.yml`); su línea se queda y sigue conectando, como dice SQL_ENGINE §5.2. Regenera el estado con `node tools/inventory/status.mjs --write`.

## Agregar un motor de base de datos

Sigue [ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md). Empieza por la plantilla, que registra el motor, y desde ahí el compilador y los tests nombran cada paso pendiente:

```bash
node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>
```

Una integración sin la matriz completa queda como experimental, no como soporte verificado (SQL_ENGINE §4).

## Publicar una versión

Para mantenedores.

1. Sube la versión en `Cargo.toml`, `app/package.json` y `app/src-tauri/tauri.conf.json`, junto con sus lockfiles.
2. Abre un pull request de `develop` a `main` y fusiónalo cuando pase `quality`.
3. Etiqueta el commit fusionado:

   ```bash
   git switch main
   git pull --ff-only
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

El tag lanza `release.yml`, que compila y firma los instaladores de cada sistema, el `latest.json` que la app lee para actualizarse y un PKGBUILD listo para AUR. El tag tiene que coincidir con la versión de `tauri.conf.json`. Un tag como `v0.3.0-rc.1` publica una versión preliminar.

Nunca borres una release. La app permite volver a cualquier versión publicada.

Las actualizaciones se firman con la clave guardada en los secrets `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Si esa clave se pierde, las copias instaladas rechazan todas las actualizaciones siguientes, así que guarda un respaldo.

### Novedad de la versión

Antes del tag, decide si la versión tiene una novedad que contar. Si la tiene, adjunta `highlight.json` (y su imagen, si hay) a la release de GitHub; el aviso de actualización de la app instalada la muestra. Sin él, el aviso es el clásico «vX.Y.Z disponible».

- Formato: [`docs/release/highlight.example.json`](docs/release/highlight.example.json). `format` es `1`; `title` es obligatorio; `badge`, hasta cuatro `items`, `image` e `imageAlt` son opcionales. Cada texto es un mapa por idioma (`es`, `en`, `pt-BR`, `fr`, `de`) y debe incluir `en`, que es el de respaldo.
- Iconos de los `items`: `sparkles`, `database`, `table`, `pencil`, `eye`, `shield-check`, `zap`, `keyboard`, `search`, `history`, `file-code`, `palette`, `undo`, `check`, `rocket`, `wand`. Uno desconocido muestra `sparkles`.
- Imagen: un nombre de archivo plano junto a `highlight.json`, PNG, WebP o JPEG, hasta 1,5 MB. Unos 900 px de ancho se leen bien.
- La app revisa el archivo y ante cualquier error muestra el aviso clásico (`app/src-tauri/src/release_highlight.rs`); sus tests validan el ejemplo.

## Sitio web

La landing vive en `site/`: HTML, CSS y JavaScript sin dependencias, en inglés en `site/index.html` y en español en `site/es/index.html`. Mantén las dos al día. Las páginas son plantillas: `.github/scripts/render-site.py` rellena `{{version}}` y `{{site}}` con la última release publicada y la dirección del sitio (la variable `SITE_URL` del repositorio; sin ella, la de GitHub Pages). GitHub Pages la vuelve a publicar con cada push a `main` que toque `site/` y después de cada Release. Para verla en local, ejecuta `python3 .github/scripts/render-site.py _site && python3 -m http.server --directory _site`. Las capturas están en `site/assets/img/shots/`, en claro y en oscuro, tomadas de la app real con datos de ejemplo.

## Estilo

- Commits cortos en imperativo, en español o inglés.
- Solo versiones publicadas de las dependencias: ni forks, ni ramas o commits sin publicar, ni parches propios (`tools/inventory/dependencies.mjs` falla con ellos). Lo que falta upstream queda como hueco documentado en SQL_ENGINE.es.md, §9.
- Nada de abstracciones antes de necesitarlas. Si un motor necesita algo que `DbConnector` no cubre, plantéalo antes en un issue.
- La documentación pública se escribe en inglés con una copia en español en `*.es.md`. Mantén las dos al día. Las notas temporales de diseño están en español.
