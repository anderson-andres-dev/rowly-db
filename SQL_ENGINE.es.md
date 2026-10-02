# Contrato de calidad de los motores SQL

[English](SQL_ENGINE.md) | Español

Este es el estándar que debe cumplir cada motor SQL de Rowly DB: hoy MySQL, MariaDB y PostgreSQL, y mañana SQLite o cualquier otro. Define qué hay que demostrar, en qué versiones, qué test lo demuestra y cuándo debe correr.

Responde a *qué demostrar*. *Cómo conectar un motor en el código* está en [CONTRIBUTING.es.md](CONTRIBUTING.es.md#agregar-un-motor-de-base-de-datos) y en el diseño de los perfiles de motor ([docs/specs/v0.2-perfiles-de-motor.md](docs/specs/v0.2-perfiles-de-motor.md)).

Hay que leerlo antes de:

- agregar un motor o una línea de versión;
- cambiar el divisor, el analizador, el guard, la introspección, el autocompletado, un driver o la ejecución de consultas;
- publicar un paquete de soporte de versión;
- llamar «sólida» a una rama que toque cualquiera de esas partes.

Si este documento y el código no coinciden, uno de los dos está mal. Se corrige el que sea en el mismo pull request.

---

## 1. Qué se prueba

Un mismo texto SQL pasa por todo esto, y cada eslabón puede romper el siguiente:

```text
servidor ─► introspección ─► catálogo ─► autocompletado ─► SQL generado
                                                              │
                      SQL del usuario ─────────────────────────┤
                                                              ▼
                divisor ─► analizador (diagnósticos) ─► guard ─► driver ─► servidor
```

Probar cada eslabón por separado es necesario, pero no basta. La cadena también se prueba de punta a punta contra servidores reales: entra la metadata del propio servidor, en medio corre el código real de la app y sale el veredicto del servidor. Y se prueba en cada línea de versión (§5), porque un servidor más nuevo no es un superconjunto de uno más viejo.

## 2. Principios

1. **El riesgo pesa más que la cantidad.** Mil tests en verde no compensan un pánico, una sentencia destructiva clasificada como segura ni una segunda sentencia que se cuela.
2. **Tres estados, no dos.** El SQL es *válido*, *inválido* o *incompleto*. Mientras el usuario escribe, lo incompleto es lo normal y no debe parecer un error.
3. **El SQL generado tiene un listón más alto que el del usuario.** Todo lo que escribe la app (un `CALL` con sus argumentos, un `INSERT` desde la grilla de resultados, un nombre entre comillas) debe ejecutarse en su motor. Eso se demuestra ejecutándolo.
4. **El servidor decide qué es válido, no cómo se vive.** Si el servidor lo acepta, el analizador no debe marcarlo. Pero el servidor también rechaza `SELECT * F`, y el editor debe entender que el usuario sigue escribiendo.
5. **Una sola fuente de verdad.** Las comillas, las reglas léxicas y las diferencias entre motores viven en el perfil del motor (`Dialect` en Rust, `SqlProfile` en TypeScript), y las diferencias entre versiones, en la línea de versión (§5). Un test llama al código real, no lo reimplementa. Cuando una copia es inevitable (§9), la copia dice qué replica.
6. **Todo bug deja un test.** Un arreglo sin test de regresión está a medias. Un bug que encuentra una exploración, un fuzzer o una IA se convierte en un fixture determinista.
7. **Las restricciones deliberadas se escriben.** Donde Rowly DB discrepa del servidor a propósito, la decisión va en §8. Si no, la siguiente persona la toma por un bug.

## 3. Severidad

| Nivel | Significa | Ejemplos |
|---|---|---|
| **P0** bloqueante | Cierre de la app, pérdida de datos o un hueco de seguridad | Un pánico: el build de release usa `panic = "abort"`, así que cualquier pánico del motor cierra la app. Una sentencia destructiva que se ejecuta sin confirmación. Una segunda sentencia que el divisor o el guard no ven. |
| **P1** crítico | Un flujo principal roto o equivocado | SQL válido y común marcado como error o rechazado por el guard. SQL generado por la app que su motor rechaza. Una introspección que informa objetos o parámetros equivocados. |
| **P2** importante | Mal, pero con alternativa y sin riesgo | Un diagnóstico falso en una construcción poco común. Una característica del dialecto sin soporte. Una sugerencia de autocompletado inútil. |
| **P3** menor | Pulido | La redacción de un mensaje, UX cosmética, un caso límite raro sin impacto en la seguridad. |

**Innegociable para integrar:** cero P0 y cero P1 conocidos. Un P2 o P3 puede quedar abierto solo si está escrito (en un issue o en §9) y el pull request lo dice.

## 4. Niveles de soporte

| Nivel | Criterio |
|---|---|
| **Experimental** | Conecta y ejecuta SQL básico. Faltan áreas de §6 o tienen bugs P0/P1 conocidos. No se anuncia como soportado. |
| **Integrable** | Cada fila aplicable de §6 pasa en cada línea soportada, incluida la suite contra servidor real, o su hueco está en §9 como P2 o menos. P0 = 0 y P1 = 0. Una rama en este nivel se puede integrar. |
| **Estable** | Integrable y, además: publicado en varias versiones sin regresiones P0/P1, con sus compuertas (§7) en el CI. |
| **Maduro** | Estable y, además, uso real durante varias versiones, en el que los bugs nuevos son casos límite y no fallos de diseño. La madurez pide historial, no una corrida en verde. |

Hoy MySQL, MariaDB y PostgreSQL cumplen todos los criterios de Integrable salvo los huecos P1 de §9. Cerrarlos va primero; para Estable falta, además, la suite contra servidor real en el CI.

## 5. Líneas de versión

### 5.1 La regla

Una **línea de versión** es un rango de versiones del servidor que se comportan igual para Rowly DB. Una versión abre una línea nueva **si y solo si hay al menos un fixture que pasa en ella y falla en la línea anterior, o al revés**, y la diferencia afecta a Rowly DB: sintaxis aceptada o eliminada, palabras reservadas, el catálogo, las capacidades o la autenticación.

Sin un fixture que las distinga, las versiones van en la misma línea. Así la lista queda en las versiones entre las que un usuario elegiría de verdad («necesito esta, se comporta distinto»), nunca una entrada por cada versión del fabricante. Cada línea dice *por qué existe*: sus diferencias con la línea anterior.

Una diferencia menor dentro de una línea es un dato de esa línea, no una línea nueva, y su fixture dice desde qué versión vale (`-- since: 11.8`, §10.1). Por ejemplo, el `CHECK` real desde MySQL 8.0.16, o `DEFAULT` en parámetros de procedures desde MariaDB 11.8 dentro de la línea 11.7.

Lo más nuevo no es un superconjunto. MySQL 8.4 rechaza `SELECT 1 AS rank`, `GROUP BY a DESC`, `SHOW SLAVE STATUS`, `PASSWORD()` y `SQL_CACHE`, todo válido en 5.7. PostgreSQL 18 rechaza el postfijo `5 !`, `pg_current_xlog_location()` y `WITH OIDS`, todo válido en versiones anteriores. Todo esto se comprobó contra los servidores de prueba.

### 5.2 Política de soporte

- **Soportada:** el fabricante todavía la soporta, o es una versión LTS (cada versión mayor de PostgreSQL cuenta como una) dentro de los 12 meses siguientes a su fin de soporte. Las versiones de ciclo corto (las innovation de MySQL, las rolling de MariaDB) no tienen gracia. Una línea está soportada mientras lo esté alguna de sus versiones.
- **Sin soporte:** más vieja que eso. **No se quita nada**: la línea, su paquete y la conexión se quedan, y la demostración de líneas (D7) la sigue cubriendo. El editor muestra una etiqueta pequeña «sin soporte oficial» junto a la versión del servidor, con un tooltip que lo explica. La compuerta de PR de motor ya no corre en ella la suite completa, y un fallo ahí no es un bug.
- **Más nueva que las probadas:** una versión más nueva que todas las probadas. La app conecta sin aviso y aplica la línea más cercana por debajo. La compuerta de release la revisa para saber si abre una línea nueva.

La ventana se recalcula al preparar cada release, con las fechas de fin de soporte de los fabricantes (endoflife.date). Nunca de memoria.

**Reglas según el uso:**

- **SQL generado** (comillas, alias, `CALL`): se aplica la regla más estricta de todas las líneas del motor. Poner comillas a `rank` sobra en 5.7 y no hace daño; no ponerlas rompe en 8.0.
- **Diagnósticos:** se aplica la línea exacta del servidor conectado, para que el editor pueda decir que `SHOW SLAVE STATUS` ya no existe en 8.4 sin molestar a quien trabaja con un 5.7.
- **Cuando la línea del servidor no tiene paquete**, se aplica la línea más cercana por debajo, nunca una de arriba. Las reglas de una línea más nueva pueden no existir en ese servidor.

### 5.3 Las líneas hoy

Estado al 2026-10-02. **Cada línea de esta tabla está demostrada** contra servidores reales en sus dos extremos (`version_lines`, D7): lo nuevo de ella pasa ahí y falla en los dos extremos de la línea anterior, y lo que eliminó, al revés. Una línea que ningún fixture separa se uniría a la anterior; el test lo informa. Cada línea soportada se prueba con el último parche de su versión LTS soportada más antigua, la que protege el mínimo. La compuerta de release también prueba la versión más nueva de cada motor.

| Motor | Línea | Diferencias con la línea anterior | Estado | Probada en |
|---|---|---|---|---|
| MySQL | 5.7 | Base: sin CTE ni funciones de ventana, `CHECK` se lee y se ignora | Sin soporte (EOL 2023-10) | — |
| | 8.0–8.3 | CTE, funciones de ventana y `LATERAL`. `rank` pasa a ser reservada. Se eliminan `GROUP BY … DESC`, `PASSWORD()`, `ENCODE()` y `SQL_CACHE`. `CHECK` real desde 8.0.16 | Soportada, en gracia hasta 2027-04-30 | 8.0.46 |
| | 8.4 | Se eliminan `SHOW SLAVE STATUS` y `SHOW MASTER STATUS`. `mysql_native_password` no se carga por defecto | Soportada hasta 2032 | 8.4.11 |
| | 9 | Tipo `VECTOR` y funciones vectoriales | Soportada (9.7 LTS hasta 2034) | 9.7.2 |
| MariaDB | 10.3–10.5 | Base: secuencias, `INTERSECT`/`EXCEPT`, tablas versionadas, modo Oracle | Sin soporte (EOL 2025-06) | — |
| | 10.6–11.6 | `JSON_TABLE`, `OFFSET … FETCH`, `SKIP LOCKED` | Soportada (10.6 en gracia hasta 2027-07-06; 10.11 y 11.4 LTS) | 10.6.28 |
| | 11.7+ | Tipo `VECTOR`. `DEFAULT` en parámetros de procedures desde 11.8 | Soportada (11.8 y 12.3 LTS, 13.0 rolling) | 11.8.9 |
| PostgreSQL | 10 | Base: columnas identity, particionado declarativo, funciones `xlog` → `wal` | Sin soporte (EOL 2022-11) | — |
| | 11 | Procedures y `CALL` | Sin soporte (EOL 2023-11) | — |
| | 12–13 | Columnas generadas, se elimina `WITH OIDS`. La 13 no cambia nada de lo que usa Rowly DB | Soportada, 13 en gracia hasta 2026-11-13 | 13.23 |
| | 14 | Parámetros OUT en procedures, se eliminan los operadores postfijos | Soportada hasta 2026-11-12 | 14.24 |
| | 15 | `MERGE`, sin `CREATE` por defecto en el schema `public` | Soportada hasta 2027-11 | 15.19 |
| | 16 | Constructores SQL/JSON, `IS JSON` | Soportada hasta 2028-11 | 16.15 |
| | 17 | `JSON_TABLE`, `MERGE … RETURNING` | Soportada hasta 2029-11 | 17.11 |
| | 18 | Columnas generadas virtuales, `OLD`/`NEW` en `RETURNING` | Soportada hasta 2030-11 | 18.6 |
| SQLite | — | Las líneas se definen al agregar el motor (§12) | — | — |

Datasets: Sakila en MySQL y MariaDB, Pagila en PostgreSQL, cada uno fijado a un commit. Los contenedores están en `tools/test-dbs/`.

## 6. La matriz

Cada fila es una propiedad que el motor debe tener **en cada línea soportada**. **Lo demuestra** nombra el test que lo demuestra hoy. Una fila sin test es un hueco, no un acierto.

Rutas: `guard` = `crates/engine/src/execution_guard.rs`, `diag` = `crates/engine/src/diagnostics.rs`, `real` = `crates/server-tests/tests/real_server.rs`, `front/` = `app/src/lib/`. Son las ubicaciones de hoy; §10 describe la estructura a la que se mueven.

### 6.1 Seguridad

| # | Propiedad | Lo demuestra |
|---|---|---|
| S1 | Un `;` dentro de un texto, comentario, identificador o dollar quote del motor no corta | `front/engines/contract.test.ts` (*un ; dentro de sus comillas…*), `front/sqlStatements.test.ts` |
| S2 | Un texto que el guard acepta corre como una sola sentencia en el servidor real, medido **sin** la barrera de preparación del driver (§8) | `real` `no_text_the_guard_accepts_runs_more_than_one_statement_on_the_server`, `fuzzing_the_guard_against_the_real_servers_finds_no_second_statement` |
| S3 | Todo lo que daña datos pide confirmación | `real` `what_damages_data_never_passes_as_not_destructive`, tests unitarios del `guard` (`*_requires_confirmation`) |
| S4 | Los comentarios ejecutables y con versión se clasifican como código | `guard` `executable_comments_are_classified_as_code`, `a_versioned_comment_is_read_both_ways_and_the_stricter_wins` |
| S5 | Las reglas de los textos siguen el modo del servidor (`NO_BACKSLASH_ESCAPES`) | `real` `the_guard_reads_strings_like_a_server_in_no_backslash_escapes_mode` |
| S6 | La sintaxis que el parser no lee se juzga por su estructura, nunca se deja pasar sin más | `guard` `valid_statements_sqlparser_cannot_read_are_judged_by_their_structure`, `destructive_statements_sqlparser_cannot_read_still_ask_for_confirmation` |

### 6.2 Análisis y diagnósticos

| # | Propiedad | Lo demuestra |
|---|---|---|
| A1 | No se marca nada que un servidor real acepte: el corpus, todas las definiciones de Sakila y Pagila, las consolas mezcladas | `real` `the_analyzer_marks_nothing_in_sql_the_real_servers_accept`, `common_valid_ddl_and_dml_is_never_objected_to`, `the_mixed_console_corpus_runs_through_guard_and_server`; `crates/engine/tests/corpus.rs` |
| A2 | Los errores reales se marcan donde están | `diag` `mod contract` (`la_sintaxis_en_cada_motor`, `el_catalogo_en_cada_motor`), `corpus.rs` `errores_ordinarios_siguen_detectandose` |
| A3 | **Ningún prefijo del SQL del corpus entra en pánico**, escrito letra a letra | `real` `typing_real_sql_shows_nothing_that_is_only_unfinished`, `diag` `no_prefix_of_a_routine_panics` |
| A4 | Mientras se escribe, solo se ven errores reales: no lo que está sin terminar, ni la última palabra, ni un nombre que aún puede definirse | `real` `typing_real_sql_shows_nothing_that_is_only_unfinished`, `front/sqlDiagnostics.dom.test.ts` |
| A5 | Los cuerpos de las rutinas se revisan por dentro | MySQL/MariaDB: `diag` `valid_routine_structures_are_not_objected_to`, `a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is`. PostgreSQL: **hueco** (§9) |
| A6 | Los nombres se comprueban contra el catálogo con las reglas de mayúsculas del motor | `diag` `postgres_distingue_mayusculas_como_el_servidor`, `mysql_no_distingue_mayusculas` |
| A7 | Los errores del servidor se ubican donde ocurren, a partir de mensajes reales del servidor | `front/engines/contract.test.ts` (`FIXTURES`), `front/sqlDiagnostics.test.ts` |
| A8 | Las posiciones son correctas con texto multibyte | `diag` `select_into_keeps_positions_with_multibyte_characters`; una cobertura más amplia de Unicode es un **hueco** (§9) |
| A9 | La sintaxis que una línea eliminó se marca en esa línea, con su reemplazo, y no en las anteriores | **hueco** (§9): el analizador tiene un solo dialecto por motor |

### 6.3 SQL generado y autocompletado

| # | Propiedad | Lo demuestra |
|---|---|---|
| G1 | Los identificadores y literales que escribe la app se vuelven a leer con el mismo valor, también con una comilla dentro | `crates/engine/src/lib.rs` `mod contract`, `front/engines/contract.test.ts` |
| G2 | Cada `CALL` que escribe el autocompletado real corre en el servidor con los argumentos correctos (IN, OUT, INOUT, DEFAULT, VARIADIC, sin nombre, nombres entre comillas) | `real` `completion_calls_run_on_the_real_servers` (llama al código TypeScript a través de `front/sqlCatalogCompletions.server.test.ts`) |
| G3 | Sin una lista de parámetros fiable, la app escribe los paréntesis con el cursor dentro en vez de inventar argumentos | `front/sqlCatalogCompletions.test.ts` |
| G4 | Insertar una sugerencia cuenta como escritura para los diagnósticos | `front/sqlCatalogCompletions.test.ts` (aserción de `input.complete`) |
| G5 | Autocompletado de punta a punta con el dialecto del motor: FROM, JOIN, alias, ON | `front/engines/contract.test.ts`, `front/sqlCatalogCompletions.test.ts` |
| G6 | Los alias automáticos y los nombres generados llevan comillas cuando son reservados en **cualquier** línea del motor | `front/engines/contract.test.ts` cubre una lista por motor; las palabras por línea son un **hueco** (§9) |
| G7 | El resto del SQL generado corre en el servidor: el INSERT/UPDATE de la edición de resultados, las exportaciones, los filtros | **hueco** (§9); solo lo cubren tests unitarios |

### 6.4 Drivers e introspección

| # | Propiedad | Lo demuestra |
|---|---|---|
| D1 | Los conjuntos de resultados, los NULL, los tipos, el truncado y los comandos DDL se comportan bien | tests de driver `execute_query_*` (`crates/drivers/*/src/lib.rs`, `#[ignore]`, variables `KHIPU_TEST_*`) |
| D2 | `CALL` y `SHOW CREATE` devuelven sus filas | `real` `call_and_show_create_return_their_rows` |
| D3 | La introspección clasifica cada tipo de objeto | tests de driver `introspect_schema_classifies_every_object_kind` |
| D4 | El **contenido** introspectado coincide con el servidor: columnas, tipos, claves, parámetros de rutinas y sus modos | en parte, a través de G2; una comprobación directa es un **hueco** (§9) |
| D5 | Los modos TLS negocian o fallan con un mensaje accionable | tests de driver `tls_*` |
| D6 | La versión del servidor se lee y se asigna a su línea, incluidas formas como `5.5.5-10.11.6-MariaDB` | la lectura de la versión: tests unitarios de `crates/drivers/*/src/version.rs`; la asignación a una línea es un **hueco** (§9) |
| D7 | Cada línea de §5.3 se distingue de la anterior, en sus dos extremos | `crates/server-tests/tests/version_lines.rs` `every_version_line_is_told_apart_from_the_previous_one` |
| D8 | El driver lee cada tipo de columna que puede devolver una línea soportada | **hueco** (§9): las columnas `VECTOR` de MySQL 9 fallan |

### 6.5 Capacidades

Lo que tiene cada motor. N/A es correcto donde el motor de verdad no tiene la característica; no es un fallo. Lo que el motor dice soportar tiene que funcionar. Una versión en una celda indica desde dónde existe la capacidad.

| Capacidad | MySQL | MariaDB | PostgreSQL | SQLite (previsto) |
|---|---|---|---|---|
| Schemas | como bases de datos | como bases de datos | sí | bases adjuntas (`ATTACH`) |
| Vistas / vistas materializadas | sí / N/A | sí / N/A | sí / sí | sí / N/A |
| Procedures | sí | sí | 11+ | N/A |
| Funciones | sí | sí | sí | N/A (solo las que define la app) |
| Argumentos OUT/INOUT en `CALL` | sí, como variables | sí, como variables | INOUT 11+, OUT 14+ | N/A |
| Parámetros con DEFAULT | N/A | 11.8+ | sí | N/A |
| Parámetros VARIADIC | N/A | N/A | sí | N/A |
| Triggers / eventos | sí / sí | sí / sí | sí / N/A | sí / N/A |
| Secuencias | N/A | 10.3+ | sí | N/A |
| Restricciones `CHECK` en el catálogo | 8.0.16+ | 10.2.1+ | sí | sí |
| Barra invertida como escape en textos | sí (salvo con `NO_BACKSLASH_ESCAPES`) | sí (igual) | solo en `E'…'` | no |
| Comentarios `#` / dollar quotes / `DELIMITER` | sí / no / lo resuelve el cliente | sí / no / lo resuelve el cliente | no / sí / no | no / no / no |

Dónde se declara en el código: las reglas léxicas y las de llamada, en cada `SqlProfile` (`front/engines/*.ts`); las reglas del lenguaje, en `Dialect` (`crates/engine/src/lib.rs`); lo del catálogo que depende de la versión, en el `version.rs` de cada driver (`Capabilities`). Todo pasa a una sola declaración por línea (§9).

## 7. Compuertas

| Compuerta | Cuándo | Qué corre | Automática |
|---|---|---|---|
| **PR** | Cada pull request | `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `npm run check`, `npm test` | En parte: el CI todavía no corre `npm test` ni clippy con `-D warnings` (§9) |
| **PR de motor** | Un PR que toca el divisor, el analizador, el guard, la introspección, el autocompletado, un driver o la ejecución | La compuerta de PR, más la suite contra servidor real en **cada línea soportada**, con el fuzz por defecto (4000 casos por línea) | No: se corre a mano y se informa en la descripción del PR |
| **Paquete** | Antes de publicar o actualizar un paquete de soporte de versión (§11) | La compuerta de PR de motor en esa línea | No |
| **Release** | Antes de publicar una versión | La compuerta de PR de motor, más: un fuzz extendido con al menos tres semillas, los tests de driver, la versión más nueva de cada motor (¿abre una línea nueva?), recalcular la ventana de soporte (§5.2) y una prueba manual de la interfaz (escribir, Tab, autocompletado, crear y llamar una rutina) | No |

Comandos, hoy:

```bash
# Compuerta de PR
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cd app && npm run check && npm test

# Suite contra servidor real (levanta MySQL, MariaDB y PostgreSQL en Docker)
tools/test-dbs/up.sh
cargo test -p rowly-server-tests -- --ignored --test-threads=1

# Ajustes del fuzz
ROWLY_ENGINES=mysql,postgres     # limita a algunos motores
ROWLY_FUZZ_CASES=20000           # casos por motor (por defecto 4000)
ROWLY_FUZZ_SEED=21               # semilla base (por defecto 0)

# Líneas de versión: un servidor por extremo de cada línea, sin datos (tools/test-dbs/lines.json)
tools/test-dbs/lines.sh up postgres          # o mysql, mariadb; sin argumento: todos
cargo test -p rowly-server-tests --test version_lines -- --ignored
tools/test-dbs/lines.sh down postgres

# Tests de driver (variables KHIPU_TEST_<MOTOR>_*, ver CONTRIBUTING.es.md)
cargo test -p khipu-driver-mysql -- --ignored
cargo test -p khipu-driver-postgres -- --ignored
```

Hoy la suite completa corre con una sola versión por motor; solo la demostración de las líneas corre en cada línea (§9). Correr el resto por línea es parte de la reorganización de los tests (§10).

Las pruebas contra servidor real comparten la tabla `rowly_test.victim`. Se corren con `--test-threads=1` y nunca dos corridas a la vez contra el mismo servidor.

Cada PR que toca un motor dice en su descripción qué compuertas corrieron, en qué líneas y versiones exactas del servidor, y la semilla y el número de casos del fuzz.

## 8. Decisiones deliberadas

Donde Rowly DB se aparta del servidor a propósito. Cambiar una de estas es una decisión de producto, no el arreglo de un bug.

| Decisión | Por qué |
|---|---|
| El driver prepara cada sentencia antes de ejecutarla, y eso ya rechaza varias sentencias por la ruta normal. Aun así, el guard tiene que pararlas por sí solo, y se mide sin esa barrera (protocolo de texto). | Defensa en profundidad: el guard no debe depender de un detalle del driver que podría cambiar. |
| Los bloques `DO` de PostgreSQL que mencionan `DELETE`, `UPDATE`, `TRUNCATE`, `DROP` o `EXECUTE` se rechazan. | Su efecto no se puede clasificar de forma estática. |
| `REPLACE` y `MERGE` se tratan como upserts y no piden confirmación, incluido `MERGE … WHEN MATCHED THEN DELETE`. | Solo tocan las filas que casan con su clave o su condición `ON`, como un `DELETE` o un `UPDATE` con `WHERE`, que tampoco piden. Lo que pide confirmación es una sentencia sin ninguna condición. |
| Crear una rutina cuyo cuerpo tiene SQL destructivo no pide confirmación, y tampoco un `CREATE OR REPLACE` sobre una que ya existe. | Definir código no es ejecutarlo: llamarlo es otra sentencia. Reemplazar el código de una rutina no pierde datos. |
| Mientras se escribe una sentencia, el editor oculta lo que solo está sin terminar, la última palabra escrita, los nombres que aún no se encuentran y, si se escribe al final, los mensajes genéricos del parser. Aparecen cuando el cursor sale de la sentencia o el editor pierde el foco. | El parser rechaza cada prefijo. Mostrarlo es ruido, y sus mensajes genéricos a menudo señalan el token equivocado. |
| La sintaxis válida que `sqlparser` no lee (en MariaDB, `NEXT VALUE FOR`, `FOR SYSTEM_TIME`…) no recibe diagnóstico de sintaxis (`Dialect::unparsed_syntax`). | Que al parser le falte algo no es un error del usuario. |
| Los cuerpos de las rutinas de PostgreSQL no se analizan. | Son textos en un lenguaje que el analizador no lee. Queda como hueco (§9). |
| Un servidor más viejo que la ventana de soporte conecta igual, y su línea nunca se quita. | Rowly DB nunca rechaza un servidor. Lo marca como sin soporte oficial y hace lo que permita su línea. |

## 9. Huecos conocidos

Ordenados por prioridad. Cada uno se convierte en una fila de §6 cuando se cierra.

| Hueco | Severidad | Nota |
|---|---|---|
| El CI no corre `npm test`, y corre clippy sin `-D warnings` | P1 | Más de mil tests del frontend no se comprueban en los pull requests, y un aviso de clippy no hace fallar el build. Cada cosa es una línea en `.github/workflows/quality.yml`. |
| MySQL 9: leer una columna `VECTOR` falla (un `SELECT *` sobre una tabla que la tiene) con «unknown column type 0xf2». `sqlx` 0.8.6 y 0.9.0 no conocen el tipo; MariaDB envía los vectores como binario y funciona | P1 | Requiere un parche en `sqlx-mysql` (upstream o un fork mantenido). Lo encontró la demostración de las líneas. |
| Las líneas están demostradas, pero el resto de la suite (escritura, `CALL` generado, fuzz del guard, destructividad) corre con una versión por motor (MySQL 8.4, MariaDB 11.8, PostgreSQL 18), y los mínimos del código (`MIN_MYSQL` 5.7, `MIN_MARIADB` 10.3, `MIN_MAJOR` 10) no siguen §5.2 | P1 | Lo cierran la reorganización de los tests de §10 y la ventana de soporte. |
| La suite contra servidor real no corre en el CI | P2 | Necesita Docker en el CI; mientras tanto, es la compuerta manual de PR de motor. |
| El analizador tiene un solo dialecto por motor: no puede marcar la sintaxis que una línea eliminó (A9), y las palabras reservadas son una lista por motor (G6) | P2 | Llega con la declaración por línea de abajo. |
| Las capacidades se declaran en tres lugares (§6.5), en código y no por línea | P2 | Una sola declaración por línea, como datos. Es también lo que llevan los paquetes de soporte de versión (§11). |
| La clasificación de incompleto / no encontrado / genérico vive en el frontend (listas de claves en `SqlEditor.svelte`), y `real` la replica para simular la escritura | P2 | El analizador debería emitir una categoría con cada diagnóstico. Eso elimina la copia (principio 5). |
| El contenido introspectado no se comprueba directamente contra el servidor (D4) | P2 | Un ejemplo encontrado al escribir esto: MariaDB 11.8 acepta `DEFAULT` en los parámetros de un procedure, pero su introspección siempre informa `has_default: false`. |
| El resto del SQL generado (G7) no se ejecuta en un servidor | P2 | |
| Los cuerpos de las rutinas de PostgreSQL no se analizan (A5) | P2 | |
| Unicode más allá de `SELECT INTO`: nombres, posiciones, UTF-8 ↔ UTF-16 entre Rust y el editor (A8) | P2 | |
| Los datasets no están fijados (`tools/test-dbs/fetch.sh` descarga el último Sakila y el Pagila de `master`), y las corridas contra servidor real no muestran la versión del servidor | P3 | Las reglas de §5 y §10. |
| Dos maneras de llegar a un servidor real: los tests de driver (`KHIPU_TEST_*`) y `rowly-server-tests` (`tools/test-dbs`) | P3 | Una sola suite sobre `tools/test-dbs` (§10). |
| Sin cubrir todavía: usuarios con permisos reducidos, catálogos desactualizados, esquemas grandes (cientos de tablas), reconexión, timeouts, cancelación bajo carga | P3 | Se añade cada uno cuando se toque la función que protege. |

## 10. Tests, fixtures y simulaciones

### 10.1 Estructura

Compartida por los tests de Rust y de TypeScript:

```text
tests/sql/
  common/                SQL válido en cada línea de cada motor
  <motor>/
    setup.sql            corre en cada servidor del motor antes de sus fixtures
    common/              válido en cada línea del motor
    <línea>/
      accepts.sql        lo nuevo de esta línea: el servidor lo acepta aquí y lo rechaza en la línea anterior
      rejects.sql        lo que esta línea elimina: el servidor lo rechaza aquí y lo aceptaba en la línea anterior
  attacks/<motor>/       corpus de seguridad, versionado aparte
```

Los casos unitarios quedan junto al código que prueban. Las entradas de un `.sql` se separan con una línea `-- ---`; cada una es una sola sentencia con un comentario que dice qué demuestra. Una línea `-- since: <versión>` en una entrada marca un cambio dentro de la línea (§5.1): antes de esa versión, la línea se comporta como la anterior, y la línea necesita servidores a los dos lados de ella.

Los servidores de cada línea están en `tools/test-dbs/lines.json` y se descargan del espejo público de las imágenes oficiales (`public.ecr.aws/docker/library`), para no depender del límite de descargas anónimas de Docker Hub.

Los fixtures de las líneas ya viven aquí. El resto del corpus sigue en `crates/server-tests/corpus/<motor>/` (`valid.sql`, `attacks.sql`, `routines.sql`) y en `crates/engine/tests/corpus/` (`valid/`, `mixed/`), y pasa a esta estructura (§9). Los tests que ya no aplican se borran, no se guardan «por si acaso».

### 10.2 Reglas

- **Cada línea se demuestra.** Un test comprueba que cada `accepts.sql` falla en la línea anterior y que cada `rejects.sql` pasaba en ella. Si no, la línea no está justificada, y el test lo dice.
- **Primero el SQL real.** Mejor lo que devuelve el propio servidor (definiciones de Sakila y Pagila, `SHOW CREATE`, `pg_get_functiondef`) que SQL escrito a mano.
- **Determinista.** Nada de hora actual, resultados sin orden, supuestos de locale o zona horaria, ni entradas aleatorias sin una semilla fija. Una semilla que falla se guarda como fixture.
- **Aislado.** Cada test prepara lo que necesita y limpia después. Las pruebas destructivas solo corren contra los contenedores de prueba, nunca contra la base de un usuario.
- **Una sola manera de llegar a un servidor:** `tools/test-dbs`, un contenedor por línea, elegido por línea.
- **Fallos legibles.** Un fallo nombra el motor, la línea y la versión exacta, el SQL (o el prefijo y la posición, si es de escritura), lo esperado y lo que pasó.
- **Nombres uniformes.** El nombre de un test dice la propiedad que demuestra, en inglés y con el mismo estilo en Rust y en TypeScript.

### 10.3 Simulaciones

Una simulación es un test fijo, nunca un script de una sola vez. Cada una corre en cada línea soportada, con el catálogo y las reglas de esa línea, y tiene una semilla fija y un resultado registrado.

| Simulación | Qué demuestra |
|---|---|
| Escritura | Cada sentencia del corpus escrita letra a letra: sin pánicos y sin mostrar lo que solo está sin terminar (A3, A4) |
| `CALL` generado | Cada procedure de la línea, escrito por el autocompletado real y ejecutado en el servidor (G2) |
| Fuzz del guard | Ningún texto que el guard acepta ejecuta una segunda sentencia (S2) |
| Destructividad | Nada que dañe datos pasa como no destructivo (S3) |

Cada corrida informa una fila por línea de motor:

```text
PostgreSQL 14 (14.24)  escritura 49 706 prefijos ✓  CALL 11 ✓  fuzz 4000 semilla 0 ✓  destructivas ✓
```

## 11. Paquetes de soporte de versión

Lo que se sabe de cada línea de versión se distribuye como un **paquete**: datos, nunca código. Sus capacidades, palabras reservadas, ayuda de errores, sintaxis que el parser no lee, sintaxis que la línea eliminó, sus fechas de soporte y con qué se probó. Permite que Rowly DB soporte una versión nueva de un servidor sin publicar una versión nueva de la app, y que el usuario vea, descargue y quite el soporte que tiene. El diseño está en [docs/specs/v0.3-soporte-de-versiones.md](docs/specs/v0.3-soporte-de-versiones.md).

Reglas:

- **Un paquete se publica solo después de que la compuerta de paquete (§7) pase en su línea**, y registra la versión exacta del servidor, la fecha y el commit con que se probó.
- **Un paquete nunca relaja el guard.** Puede añadir palabras destructivas; no puede marcar nada como seguro. Lo peor que puede causar un paquete equivocado es un diagnóstico falso, nunca un hueco de seguridad.
- **Los paquetes van firmados** con la misma clave que las actualizaciones de la app, y se comprueba su formato antes de instalarlos.
- **Un paquete que necesita un mecanismo que la app no tiene** declara la versión mínima de la app que requiere, y la app lo dice en vez de instalarlo.
- **Cada línea publicada viene dentro de la app y se queda**, soportada o no, y funciona sin conexión. Un paquete pesa kilobytes; no hay razón para sacarlo. La descarga existe para recibir líneas nuevas sin esperar una release.
- **Quitar o desactivar una línea es decisión del usuario, nunca de Rowly DB.**
- **§5.3 se genera desde el índice de paquetes**, para que este documento y lo que los usuarios pueden descargar nunca discrepen.

## 12. Agregar un motor, paso a paso

El mismo proceso vale para todos los motores. Solo se marca N/A lo que el motor de verdad no tiene.

1. **Declarar.** Añadir la columna del motor en §6.5 y sus líneas en §5.3, con las diferencias que justifican cada una.
2. **Conectarlo.** Seguir [CONTRIBUTING.es.md](CONTRIBUTING.es.md#agregar-un-motor-de-base-de-datos): driver, `DatabaseKind`, `Dialect`, `SqlProfile`. El compilador y los tests de contrato señalan cada decisión pendiente.
3. **Entorno de prueba.** Añadir un contenedor por línea a `tools/test-dbs/` (en SQLite, un archivo de base por línea, construido con el dataset fijado).
4. **Llenar la matriz.** En cada fila de §6.1 a §6.4, sumar el motor al test que ya existe. Los casos `PerEngine` y los `FIXTURES` hacen que el compilador pida sus respuestas. Una fila que no puede aplicarse se marca N/A aquí, con el motivo.
5. **Corpus.** Añadir `tests/sql/<motor>/` con su SQL común, el `accepts.sql` y el `rejects.sql` de cada línea, y `tests/sql/attacks/<motor>/` para sus reglas de textos y comentarios. En SQLite: `PRAGMA`, `ATTACH`, `WITHOUT ROWID`, `STRICT`, `ON CONFLICT`, `RETURNING`.
6. **Correr la compuerta de PR de motor** (§7) en cada línea. Con P0 = 0, P1 = 0 y cada fila aplicable en verde, el motor es Integrable (§4) y sus paquetes se pueden publicar.

SQLite no tiene un proceso servidor. «Servidor real» significa la biblioteca de SQLite que enlaza el driver, en la versión de cada línea. Tener menos objetos de servidor no baja el listón del divisor, el guard, la escritura, las comillas ni la seguridad.

## 13. Trabajar en un motor (personas e IA)

No pidas «el mayor número de simulaciones posible»: eso da una cobertura desigual. Pide:

> Aplica SQL_ENGINE.md a `<motor>` `<línea>`: corre la compuerta `<PR | PR de motor | paquete | release>`, informa cada P0/P1 con una reproducción SQL mínima, convierte cada bug nuevo en un test permanente y actualiza §5, §6 y §9.

Las pruebas exploratorias son bienvenidas, y aquí encontraron bugs reales: un pánico con un `DECLARE` a medio escribir y las comillas de los argumentos de un `CALL` generado. Pero lo que encuentran se convierte en fixture. Nunca reemplazan la matriz.
