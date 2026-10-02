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

`cargo test --workspace` no necesita ninguna base de datos. Las pruebas que sí la necesitan están marcadas con `#[ignore]` y se ejecutan aparte:

```bash
cargo test -p khipu-driver-mysql -- --ignored
cargo test -p khipu-driver-postgres -- --ignored
```

Leen la conexión de estas variables, donde `<MOTOR>` es `MYSQL` o `POSTGRES`:

| Variable | Valor |
| :--- | :--- |
| `KHIPU_TEST_<MOTOR>_HOST` | Host del servidor |
| `KHIPU_TEST_<MOTOR>_PORT` | Puerto |
| `KHIPU_TEST_<MOTOR>_USER` | Usuario |
| `KHIPU_TEST_<MOTOR>_PASSWORD` | Contraseña |
| `KHIPU_TEST_<MOTOR>_DATABASE` | Base de datos |
| `KHIPU_TEST_<MOTOR>_EXPECT_TLS` | Opcional. `encrypted`, `fallback` o `none` |
| `KHIPU_TEST_<MOTOR>_CA_CERT` | Opcional. CA que firmó el certificado del servidor |

Si falta alguna, la prueba se detiene y te dice cuál. `EXPECT_TLS` es lo que el servidor debería negociar en modo automático: `fallback` es para servidores con un TLS que rustls no puede negociar, como MySQL 5.7. Con `CA_CERT` también se prueban los modos que verifican la CA, y el certificado tiene que incluir el host de la prueba.

El guard, el divisor de sentencias y los drivers también se prueban juntos contra servidores reales (MySQL, MariaDB y PostgreSQL con las bases de ejemplo Sakila / Pagila). `tools/test-dbs/up.sh` las levanta en Docker y `cargo test -p rowly-server-tests -- --ignored --test-threads=1` corre las pruebas; ver `tools/test-dbs/README.es.md`.

`tools/test-dbs/lines.json` y `tools/test-dbs/lines.sh` comprueban los límites de las líneas de versión. El comando completo y sus límites actuales están en [SQL_ENGINE.es.md, §7](SQL_ENGINE.es.md#7-compuertas). Hoy la suite real no corre completa por cada versión exacta ni en CI; informa las versiones probadas en el PR y no anuncia una versión como verificada sin toda la matriz aplicable.

Al preparar una release, comprueba las fechas de soporte en los avisos oficiales de cada fabricante y después ejecuta `python3 tools/support/vendor-support.py` desde la raíz. El script usa `endoflife.date` como listado y aplica excepciones oficiales cuando hay discrepancias. Revisa el diff de `app/src/lib/engines/vendorSupport.json` y actualiza la tabla de [SQL_ENGINE.es.md, §5](SQL_ENGINE.es.md#5-líneas-de-versión) con la misma evidencia.

## Agregar un motor de base de datos

Sigue [SQL_ENGINE.es.md, §12](SQL_ENGINE.es.md#12-agregar-un-motor-paso-a-paso) para separar **motor**, **driver**, **línea** y **versión exacta**. Estas son las rutas del código actual; el compilador señala parte de las decisiones pendientes, y la matriz S/A/G/D detecta las restantes.

1. **Driver.** Si necesita protocolo propio, crea `crates/drivers/<motor>`, implementa `DbConnector` de `khipu-driver-core` y agrega el crate al workspace. Si habla el protocolo de otro motor soportado, reutiliza su driver después de probar tipos, TLS e introspección.
2. **Rust.** Agrega el motor a `DatabaseKind` en `app/src-tauri/src/drivers.rs`, que elige su driver, y a `Dialect` y su lista `ALL` en `crates/engine/src/lib.rs`. El compilador marca cada decisión pendiente. El motor se llama igual en `DatabaseKind`, en `Dialect` y en `ConnectionDriver` del frontend.
3. **Frontend.** Agrégalo a `app/src/lib/connections.ts` con su nombre, logo y puerto por defecto, y escribe su perfil en `app/src/lib/engines/<motor>.ts`.
4. **Contrato.** Completa sus `FIXTURES` en `app/src/lib/engines/contract.test.ts`, decide su respuesta en cada caso `PerEngine` de `crates/engine/src/diagnostics.rs` y añade corpus y servidores exactos en `tests/sql/` y `tools/test-dbs/lines.json`. Revisa cada fila aplicable de `SQL_ENGINE.es.md` y documenta `N/A` con motivo.

Después corre la compuerta de motor de `SQL_ENGINE.es.md` en cada versión exacta que quieras anunciar y comprueba que los motores existentes siguen verdes. Un parser cercano, como el que MariaDB comparte con MySQL, solo es válido si las pruebas demuestran que no oculta SQL destructivo ni produce diagnósticos falsos; registra la sintaxis válida que no lee en `Dialect::unparsed_syntax`. Una integración sin matriz completa queda como experimental, no como soporte verificado.

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
