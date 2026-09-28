# Contribuir a Rowly DB

[English](CONTRIBUTING.md) · **Español**

Gracias por el interés. El proyecto está empezando, así que hay bastante
espacio para decisiones de diseño: abre un issue antes de un PR grande.

**Rowly DB** es el nombre del producto; **Khipu** es el nombre interno del
motor. En el código verás `khipu-*` (crates, identificadores, claves de
configuración): es a propósito y no hay que renombrarlo. Los textos que ve el
usuario dicen Rowly DB.

## Antes de empezar

Lee [`docs/ARCHITECTURE.es.md`](docs/ARCHITECTURE.es.md) para entender por qué el
repo está dividido en `engine` / `driver-core` / `drivers/*` / `app`, y qué
capa te toca según lo que quieras aportar.

## Setup local

```bash
mise use -g rust@latest   # o rustup
cargo build
cd app && npm install && npm run tauri dev
```

## Agregar soporte para un nuevo motor de base de datos

Todo lo que cambia de un motor a otro vive en dos lugares: el enum `Dialect`
en Rust (`crates/engine/src/lib.rs`) y su perfil en el frontend
(`app/src/lib/engines/`). Ninguno cae a otro motor: si falta algo, **no
compila**. El diseño completo está en `docs/specs/v0.2-perfiles-de-motor.md`.

1. **Driver**: `cargo new --lib crates/drivers/<motor>` e implementar el
   trait `DbConnector` de `khipu-driver-core`, incluido `introspect_schema`
   (ver `docs/design/explorador-base-de-datos.md`). Agregarlo a
   `[workspace] members` en el `Cargo.toml` raíz.
2. **Rust**: la variante en `DatabaseKind` (`app/src-tauri/src/drivers.rs`) y
   en `Dialect`. El compilador marca cada decisión a completar: su parser de
   `sqlparser`, comillas, literales, mayúsculas, la fila por defecto. Sumarla
   a `ALL` en el contrato de `crates/engine/src/lib.rs`.
3. **Frontend**: el motor en `ConnectionDriver` y `connectionDrivers`
   (`app/src/lib/connections.ts`: nombre, logo, puerto), y su perfil en
   `app/src/lib/engines/<motor>.ts`, con su entrada en `ENGINES`: comillas y
   comentarios (`lexical`), dialecto del editor y del formateador, palabras
   que abren sentencia, reservadas, códigos de error, cómo ubicar un error en
   sus mensajes y la URL de conexión.
4. **Contrato**: sus datos en `FIXTURES` de
   `app/src/lib/engines/contract.test.ts` (el tipo lo exige) y correr
   `npm test` y `cargo test --workspace`. Con eso, el autocompletado, los
   alias, el JOIN por FK, Error Lens y el rendimiento con documentos enormes
   ya funcionan con el motor nuevo.
5. Abrir el PR.

Si `sqlparser` no trae el dialecto del motor, discútelo en un issue antes de
mandar el PR.

## Pruebas de contrato de drivers

`cargo test --workspace` corre en verde sin ninguna base de datos disponible:
los tests que necesitan una conexión real están marcados `#[ignore = "requires
database"]`, así que se omiten en una ejecución normal.

Para correrlos contra una instancia real:

```bash
cargo test -p khipu-driver-mysql -- --ignored
cargo test -p khipu-driver-postgres -- --ignored
```

Variables de entorno que necesita cada uno:

- MySQL: `KHIPU_TEST_MYSQL_HOST`, `KHIPU_TEST_MYSQL_PORT`, `KHIPU_TEST_MYSQL_USER`,
  `KHIPU_TEST_MYSQL_PASSWORD`, `KHIPU_TEST_MYSQL_DATABASE`
- PostgreSQL: `KHIPU_TEST_POSTGRES_HOST`, `KHIPU_TEST_POSTGRES_PORT`,
  `KHIPU_TEST_POSTGRES_USER`, `KHIPU_TEST_POSTGRES_PASSWORD`,
  `KHIPU_TEST_POSTGRES_DATABASE`

Si falta alguna, el test hace `panic!` con un mensaje indicando qué setear
(no hace falta memorizarlas: el mensaje del panic las lista).

Opcionales, para los tests de TLS (`<MOTOR>` es `MYSQL` o `POSTGRES`):

- `KHIPU_TEST_<MOTOR>_EXPECT_TLS`: qué debería negociar el servidor en modo
  Automático. `encrypted` si tiene TLS moderno, `fallback` si ofrece TLS que
  rustls no puede negociar (MySQL 5.7), `none` si no tiene TLS habilitado.
  Sin la variable, solo se comprueba lo que vale para cualquier servidor.
- `KHIPU_TEST_<MOTOR>_CA_CERT`: ruta a la CA que firmó el certificado del
  servidor, para probar "Verificar CA" y "Verificar CA y host". El
  certificado tiene que incluir el host del test en su subjectAltName.

## Flujo de ramas y releases

- `main` es la rama por defecto y `develop` la de integración. Nada se
  sube directo a ninguna de las dos: `develop` y `main` tienen branch
  protection (PR + 1 aprobación + checks de `quality.yml` en verde + sin
  force-push).

1. Abrir un PR desde `feature/...` hacia `develop`.
2. `quality.yml` corre automático (Rust fmt/clippy/test + Node check/build).
3. Confirmar que el check `quality` esté verde.
4. Revisar y probar funcionalmente el cambio en desarrollo.
5. Aprobar y fusionar el PR en `develop`.
6. Para publicar una versión, subir la versión en `Cargo.toml`,
   `app/package.json` y `app/src-tauri/tauri.conf.json` (con sus lockfiles)
   y abrir un PR `develop → main`.
7. Esperar de nuevo `quality`, aprobar y fusionar.
8. Etiquetar el commit de `main`:
   ```bash
   git switch main
   git pull --ff-only
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
9. El tag dispara `release.yml` (build multiplataforma); esperar a que
    termine en verde.

### Qué publica una release

- Instaladores para Debian/Ubuntu (`.deb`), Fedora (`.rpm`), cualquier Linux
  (AppImage), Arch (`.pkg.tar.zst`), Windows y macOS, todos firmados.
- `latest.json`, que usa Ajustes > Actualizaciones para instalar esa versión.
- `rowly-db-bin.PKGBUILD`, con las sumas ya calculadas, para publicar en AUR
  (copiarlo como `PKGBUILD` en el repo de AUR, `makepkg --printsrcinfo >
  .SRCINFO`, commit y push).

La versión de `app/src-tauri/tauri.conf.json` tiene que coincidir con el tag
(`v0.2.0` ↔ `0.2.0`); el workflow falla si no. Un tag con guion
(`v0.3.0-rc.1`) publica una versión preliminar.

**Las releases no se borran.** La app deja volver a cualquier versión
publicada; borrar una la saca de esa lista.

### Firma de las actualizaciones

El workflow firma con la clave privada de los secrets
`TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`; la
clave pública está en `tauri.conf.json`. Si esa clave privada se pierde, las
copias instaladas no aceptan actualizaciones firmadas con otra: guardarla
con respaldo. Compilar el repo no la necesita.

## Estilo

- Rust: `cargo fmt` + `cargo clippy` antes de cada PR
- Commits: mensajes cortos en imperativo, en español o inglés
- Documentación: el inglés es el idioma principal; cada documento público
  tiene su versión en español (`*.es.md`). Las notas de diseño de
  `docs/specs/` y `docs/design/` están en español
- Sin abstracciones especulativas: si un motor nuevo necesita algo que el
  trait `DbConnector` no cubre, se discute en el issue antes de forzar la
  interfaz existente
