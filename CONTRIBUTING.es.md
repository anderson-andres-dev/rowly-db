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

Si tocas un motor, un driver, SQL generado, análisis o ejecución, lee primero [SQL_ENGINE.es.md](SQL_ENGINE.es.md). Es el contrato permanente de calidad: matriz S/A/G/D, versiones, pruebas reales, compuertas y huecos conocidos. Las notas de diseño son planes de trabajo y no sustituyen ese contrato.

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
```

El CI corre la misma compuerta con Rust 1.90 (`.github/workflows/quality.yml`); un clippy local más nuevo puede no ver un aviso que la 1.90 sí marca, así que `cargo +1.90 clippy --workspace --all-targets -- -D warnings` lo reproduce tal cual. Cada archivo de test necesita una entrada en `tests/inventory.json` con su dueño, la propiedad que protege, su riesgo, su compuerta y una decisión; el `--check` falla hasta que la tenga.

El workflow **E2E** compila la app y la maneja en Linux/WebKitGTK con `tauri-driver` y un MySQL desechable (`app/tests/e2e/run.mjs`): conectar, ejecutar con Ctrl+Enter, confirmar y cancelar una sentencia destructiva, la confirmación de producción y el texto de la consola tras reiniciar. Necesita `WebKitWebDriver` y `tauri-driver`, así que normalmente solo corre en el CI. Windows/WebView2 y macOS/WKWebView siguen siendo humo manual antes de una release.

## Pruebas contra una base real

`cargo test --workspace` no necesita ninguna base de datos. Las pruebas que sí la necesitan están marcadas con `#[ignore]` y corren contra los servidores de `tools/test-dbs` (MySQL, MariaDB y PostgreSQL con las bases de ejemplo Sakila / Pagila), un contenedor por versión exacta, fijado por digest en `tools/test-dbs/lines.json`:

```bash
tools/test-dbs/up.sh                       # o una versión verificada: tools/test-dbs/up.sh postgres=13.23
cargo test -p rowly-server-tests -- --ignored --test-threads=1
```

`safety` prueba el guard, `analysis` el divisor de sentencias y el analizador, `generated` el SQL que escribe la app; `contract` prueba los drivers por la API que usa la app: resultados, truncado, errores, sesión, introspección y TLS (lo que ofrece cada imagen es el `tls` de su versión en `lines.json`). Antes de ejecutar, el harness comprueba que el servidor es la versión que declara `lines.json`. Lo que una versión no tiene cuenta como N/A solo si el servidor lo rechaza. Ver `tools/test-dbs/README.es.md`.

`tools/test-dbs/lines.sh` comprueba los límites de las líneas de versión. El CI corre todo esto en cada PR de motor, en cada versión exacta verificada (`.github/workflows/sql-engine.yml`); los comandos y las reglas están en [SQL_ENGINE.es.md, §7](SQL_ENGINE.es.md#7-compuertas). No anuncies una versión como verificada sin su evidencia completa.

Al preparar una release, comprueba las fechas de soporte en los avisos oficiales de cada fabricante y después ejecuta `python3 tools/support/vendor-support.py` desde la raíz. El script usa `endoflife.date` como listado y aplica excepciones oficiales cuando hay discrepancias. Revisa el diff de `tools/support/vendor-support.json` y actualiza la tabla de [SQL_ENGINE.es.md, §5](SQL_ENGINE.es.md#5-líneas-de-versión) con la misma evidencia.

## Agregar un motor de base de datos

Sigue [SQL_ENGINE.es.md, §12](SQL_ENGINE.es.md#12-agregar-un-motor-paso-a-paso) para separar **motor**, **driver**, **línea** y **versión exacta**. Empieza por la plantilla y deja que el compilador y los tests te lleven por el resto: cada paso pendiente falla nombrando el archivo que necesita.

```bash
node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>
```

Crea el `EngineDefinition` del motor en `crates/engine/src/dialects/<id>.rs` (con los valores del motor parecido, bajo un bloque `PENDIENTE`), lo suma al registro (`Dialect`, `ALL` y `definition()` en `crates/engine/src/lib.rs`), agrega su entrada a `tests/engines/contract.json` con `"pending": true` y crea `tests/sql/<id>/`. Después, en orden:

1. **`cargo build`**: la respuesta del motor en cada caso por motor de los tests (`PerEngine` de `diagnostics.rs`) y su lugar en la lista del contrato de `lib.rs`.
2. **La definición.** Escribe cada campo de `EngineDefinition` con la respuesta propia del motor, probada contra su servidor, y quita el bloque `PENDIENTE`. Un valor heredado que nadie probó es un motor que sigue en silencio las reglas de otro. La sintaxis válida que su parser no lee va en `unparsed_syntax`.
3. **`cargo test`** nombra el resto del lado Rust: `DatabaseKind` y su driver en `app/src-tauri/src/drivers.rs` (un protocolo nuevo es un crate en `crates/drivers/<protocolo>` que implementa `DbConnector`), `Engine` en `crates/server-tests` y el contrato compartido.
4. **Frontend.** `ConnectionDriver` en `app/src/lib/connections.ts` (nombre, logo, puerto por defecto), su perfil en `app/src/lib/engines/<id>.ts`, `ENGINES` y los `FIXTURES` de `contract.test.ts`. La comilla de identificadores, la regla de la barra invertida y los comentarios ejecutables tienen que coincidir con `tests/engines/contract.json`; después quita `"pending"`.
5. **Servidores y soporte.** Líneas, probes y versiones verificadas fijadas por digest en `tools/test-dbs/lines.json` (y su contenedor), fechas del fabricante en `tools/support/vendor-support.json`.
6. **La matriz.** `node tools/inventory/coverage.mjs` enumera cada fila de `SQL_ENGINE.es.md` sin respuesta para el motor: una prueba que lo incluya, un `N/A` con motivo o un hueco declarado (`gapEngines`).

Después corre la compuerta de motor en cada versión exacta que quieras anunciar y comprueba que los motores existentes siguen verdes. Una integración sin matriz completa queda como experimental, no como soporte verificado.

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

## Sitio web

La landing vive en `site/`: HTML, CSS y JavaScript sin dependencias, en inglés en `site/index.html` y en español en `site/es/index.html`. Mantén las dos al día. Las páginas son plantillas: `.github/scripts/render-site.py` rellena `{{version}}` y `{{site}}` con la última release publicada y la dirección del sitio (la variable `SITE_URL` del repositorio; sin ella, la de GitHub Pages). GitHub Pages la vuelve a publicar con cada push a `main` que toque `site/` y después de cada Release. Para verla en local, ejecuta `python3 .github/scripts/render-site.py _site && python3 -m http.server --directory _site`. Las capturas están en `site/assets/img/shots/`, en claro y en oscuro, tomadas de la app real con datos de ejemplo.

## Estilo

- Commits cortos en imperativo, en español o inglés.
- Nada de abstracciones antes de necesitarlas. Si un motor necesita algo que `DbConnector` no cubre, plantéalo antes en un issue.
- La documentación pública se escribe en inglés con una copia en español en `*.es.md`. Mantén las dos al día. Las notas temporales de diseño están en español.
