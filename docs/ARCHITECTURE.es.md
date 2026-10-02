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

El motor no depende de ningún driver, ni siquiera de `driver-core`. La app crea cada driver en `app/src-tauri/src/drivers.rs`, trabaja con él a través de `DbConnector` y convierte el esquema que lee en el catálogo del motor en `catalog_adapter.rs`. Cada perfil de conexión elige su modo TLS y cada driver lo aplica en su propio `tls.rs`.

## Dialectos

`Dialect` en `crates/engine/src/lib.rs` enumera los motores SQL. Agregar uno exige revisar todas las decisiones exhaustivas del motor y del frontend, incluso cuando `sqlparser` conoce su sintaxis. Compartir parser o protocolo no autoriza compartir el guard, las citas, la introspección ni las capacidades sin pruebas. [SQL_ENGINE.es.md](../SQL_ENGINE.es.md) define la matriz, las versiones y las compuertas que demuestran la integración.

Todos los drivers se compilan dentro de la app. No hay features de Cargo para dejar alguno fuera.

## Para seguir

- [Agregar un motor de base de datos](../CONTRIBUTING.es.md#agregar-un-motor-de-base-de-datos), paso a paso.
- [Contrato permanente de motores SQL](../SQL_ENGINE.es.md): qué probar, en qué versiones y cuándo.
- [`design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md) explica qué debe devolver un driver al leer un esquema y cómo manejar las versiones del servidor.
