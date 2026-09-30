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

## Flujo de trabajo

`main` guarda las versiones publicadas y `develop` es donde se integra el trabajo. Ninguna acepta push directo.

1. Crea una rama desde `develop` con el nombre `feature/<nombre>`.
2. Abre un pull request hacia `develop`.
3. Espera a que pase el check `quality`.
4. Cuando está revisado y probado en la app, se fusiona.

Antes de abrir el pull request, ejecuta:

```bash
cargo fmt --all
cargo clippy --workspace --all-targets
cargo test --workspace
cd app && npm run check && npm test
```

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

## Agregar un motor de base de datos

Todo lo que cambia de un motor a otro vive en el enum `Dialect` de `crates/engine/src/lib.rs` y en el perfil del motor en `app/src/lib/engines/`. Ningún motor usa lo de otro por defecto, así que si falta algo, la compilación falla y te dice qué.

1. **Driver.** Crea `crates/drivers/<motor>`, implementa `DbConnector` de `khipu-driver-core` y agrega el crate al workspace. Un motor que habla el protocolo de otro ya soportado (MariaDB y MySQL) reutiliza su driver.
2. **Rust.** Agrega el motor a `DatabaseKind` en `app/src-tauri/src/drivers.rs`, que elige su driver, y a `Dialect` y su lista `ALL` en `crates/engine/src/lib.rs`. El compilador marca cada decisión pendiente. El motor se llama igual en `DatabaseKind`, en `Dialect` y en `ConnectionDriver` del frontend.
3. **Frontend.** Agrégalo a `app/src/lib/connections.ts` con su nombre, logo y puerto por defecto, y escribe su perfil en `app/src/lib/engines/<motor>.ts`.
4. **Contrato.** Completa sus `FIXTURES` en `app/src/lib/engines/contract.test.ts`, decide su respuesta en cada caso `PerEngine` del contrato de `crates/engine/src/diagnostics.rs` (el compilador los marca) y ejecuta las dos suites de pruebas. Los casos comunes corren en el motor nuevo sin escribir nada.

Con eso, el autocompletado, los JOIN por clave foránea, los diagnósticos, el pegado y los archivos grandes funcionan con el motor nuevo. Si `sqlparser` no tiene un dialecto para él, usa el más cercano, como MariaDB usa el de MySQL, y anota en `Dialect::unparsed_syntax` la sintaxis válida que ese parser rechaza, para que no se marque como error.

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

La landing vive en `site/`: HTML, CSS y JavaScript sin dependencias, en inglés en `site/index.html` y en español en `site/es/index.html`. Mantén las dos al día. Cada push a `main` que toque `site/` la publica en GitHub Pages. Para verla en local, ejecuta `python3 -m http.server --directory site`.

## Estilo

- Commits cortos en imperativo, en español o inglés.
- Nada de abstracciones antes de necesitarlas. Si un motor necesita algo que `DbConnector` no cubre, plantéalo antes en un issue.
- La documentación pública se escribe en inglés con una copia en español en `*.es.md`. Mantén las dos al día. Las notas de diseño de `docs/specs` y `docs/design` están en español.
