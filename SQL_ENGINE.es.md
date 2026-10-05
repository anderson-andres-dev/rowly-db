# Contrato de calidad de los motores SQL

[English](SQL_ENGINE.md) | Español

Este es el estándar que debe cumplir cada motor SQL de Rowly DB: hoy MySQL, MariaDB y PostgreSQL, y mañana SQLite o cualquier otro. Define qué hay que demostrar, en qué versiones, qué test lo demuestra y cuándo debe correr.

Este es el **contrato permanente** de calidad SQL. Responde a *qué demostrar* y contiene las compuertas y el proceso para motores, líneas y versiones exactas. Para ubicar el código y preparar el entorno, empieza por [Arquitectura](docs/ARCHITECTURE.es.md) y [Contribuir](CONTRIBUTING.es.md). Las propuestas de implementación pueden cambiar; las obligaciones de este documento siguen vigentes hasta que un PR las modifique con evidencia.

Hay que leerlo antes de:

- agregar un motor o una línea de versión;
- cambiar el divisor, el analizador, el guard, la introspección, el autocompletado, un driver o la ejecución de consultas;
- publicar un paquete de soporte de versión;
- llamar «sólida» a una rama que toque cualquiera de esas partes.

Si este documento y el código no coinciden, uno de los dos está mal. Se corrige el que sea en el mismo pull request.

**Ruta rápida para contribuir:** identifica la propiedad S/A/G/D de §6, consulta los huecos de §9, añade o ajusta un fixture de §10, ejecuta la compuerta de §7 y registra motor, línea y versión exacta en el PR. §12 indica los pasos adicionales para un motor o una versión nueva. Las rutas y comandos marcados como «hoy» describen el repositorio actual; los requisitos de calidad no se consideran cumplidos por estar escritos aquí.

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
5. **Una sola fuente de verdad.** Las comillas, las reglas léxicas y las diferencias entre motores viven en el perfil del motor (`Dialect` en Rust, `SqlProfile` en TypeScript), y las diferencias entre versiones, en los datos de la línea de versión (`support/<motor>.json`, §5.4). Un test llama al código real, no lo reimplementa. Cuando una copia es inevitable (§9), la copia dice qué replica.
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

Hoy MySQL, MariaDB y PostgreSQL son Integrables: P0 = 0 y P1 = 0, y cada fila aplicable de §6 pasa en cada versión exacta verificada, con la suite contra servidor real en el CI (`sql-engine.yml`, §7), o su hueco está en §9 como P2 o menos. Para Estable falta historial: publicarse en varias versiones sin regresiones P0/P1. Las compuertas de versión exacta y de release (§7) todavía se corren a mano.

## 5. Líneas de versión

### 5.1 La regla

Una **línea de versión** es un rango de versiones del servidor que se comportan igual para Rowly DB. Una versión abre una línea nueva **si y solo si hay al menos un fixture que pasa en ella y falla en la línea anterior, o al revés**, y la diferencia afecta a Rowly DB: sintaxis aceptada o eliminada, palabras reservadas, el catálogo, las capacidades o la autenticación.

Sin un fixture que las distinga, las versiones van en la misma línea. Así la lista queda en las versiones entre las que un usuario elegiría de verdad («necesito esta, se comporta distinto»), nunca una entrada por cada versión del fabricante. Cada línea dice *por qué existe*: sus diferencias con la línea anterior.

Una diferencia menor dentro de una línea es un dato de esa línea, no una línea nueva, y su fixture dice desde qué versión vale (`-- since: 11.8`, §10.1). Por ejemplo, el `CHECK` real desde MySQL 8.0.16, o `DEFAULT` en parámetros de procedures desde MariaDB 11.8 dentro de la línea 11.7.

Lo más nuevo no es un superconjunto. MySQL 8.4 rechaza `SELECT 1 AS rank`, `GROUP BY a DESC`, `SHOW SLAVE STATUS`, `PASSWORD()` y `SQL_CACHE`, todo válido en 5.7. PostgreSQL 18 rechaza el postfijo `5 !`, `pg_current_xlog_location()` y `WITH OIDS`, todo válido en versiones anteriores. Todo esto se comprobó contra los servidores de prueba.

### 5.2 Política de soporte

Aquí «soporte del fabricante» significa que aún publica correcciones nuevas,
incluidas las de seguridad; un contrato de *Sustaining Support* sin nuevos
parches no cuenta como mantenimiento activo.

- **Soportada:** el fabricante todavía la soporta, o es una versión LTS (cada versión mayor de PostgreSQL cuenta como una) dentro de los 12 meses siguientes a su fin de soporte. Las versiones de ciclo corto (las innovation de MySQL, las rolling de MariaDB) no tienen gracia. Una línea está soportada mientras lo esté alguna de sus versiones.
- **Sin soporte:** más vieja que eso. **No se quita nada**: la línea, su paquete y la conexión se quedan, y la demostración de líneas (D7) la sigue cubriendo. El editor muestra una etiqueta pequeña «sin soporte oficial» junto a la versión del servidor, con un tooltip que lo explica. La compuerta de PR de motor ya no corre en ella la suite completa, y un fallo ahí no es un bug.
- **Más nueva que las probadas:** una versión más nueva que todas las probadas. La app no bloquea la conexión, aplica la línea más cercana por debajo y muestra «no verificada». La compuerta de release la revisa para saber si abre una línea nueva.

La ventana se recalcula al preparar cada release, con las fechas oficiales del [ciclo de MySQL](https://www.mysql.com/support/eol-notice.html), [MariaDB Community](https://mariadb.org/about/) y [PostgreSQL](https://www.postgresql.org/support/versioning/). `endoflife.date` sirve para contrastar, nunca como única autoridad.

Tres datos se mantienen separados, cada uno con su fuente:

- **Piso de compatibilidad** (`COMPATIBILITY_FLOOR_*` en el `version.rs` de cada driver: MySQL 5.7, MariaDB 10.3, PostgreSQL 10): la versión más antigua cuyo catálogo el driver sabe leer. Nunca rechaza una conexión: un servidor más antiguo conecta con su línea, carga lo que tenga su catálogo y el explorador avisa que pueden faltar objetos. No dice nada del soporte.
- **Ventana de soporte** (esta sección; fechas del fabricante en `tools/support/vendor-support.json`): decide la etiqueta que muestra el editor y qué líneas cubre la compuerta de PR de motor. `tools/test-dbs/window.mjs`, en la compuerta de PR, falla si `verified` y la ventana no coinciden: cada línea con una versión soportada o en gracia tiene una versión verificada, y ninguna versión verificada queda fuera de la ventana.
- **Verificación** (`verified` en `tools/test-dbs/lines.json`): las versiones exactas que pasan la matriz completa con evidencia (§7).

El soporte del fabricante y la verificación de Rowly DB son datos distintos. **Cada versión exacta anunciada como verificada** debe pasar todas las filas aplicables de §6, con evidencia de §7 y §10. Una versión sin esa evidencia puede conectar con reglas conservadoras de su línea, pero no se anuncia como verificada. La tabla de §5.3 refleja las pruebas disponibles hoy; no certifica todos los parches de sus rangos. Una línea de comportamiento agrupa reglas; la versión exacta identifica el servidor probado. Ningún parche hereda automáticamente la verificación de otro.

**Reglas según el uso:**

- **SQL generado** (comillas, alias, `CALL`): se aplica la regla más estricta de todas las líneas del motor. Poner comillas a `rank` sobra en 5.7 y no hace daño; no ponerlas rompe en 8.0.
- **Diagnósticos:** se aplica la línea exacta del servidor conectado, para que el editor pueda decir que `SHOW SLAVE STATUS` ya no existe en 8.4 sin molestar a quien trabaja con un 5.7.
- **Cuando la línea del servidor no tiene paquete**, se aplica la línea más cercana por debajo, nunca una de arriba. Si no existe una anterior, se usa la más antigua disponible, se informa de la incertidumbre y se desactivan las capacidades que ese servidor no haya demostrado; el guard conserva su política más estricta. Las reglas de una línea más nueva pueden no existir en ese servidor.
- **Contexto de conexión:** motor, versión exacta, modo SQL, línea y revisión efectivos se fijan juntos para la conexión. El editor y el guard usan esa misma identidad; cambiar conexión o modo invalida análisis y cachés dependientes. Una etiqueta visible no decide el dialecto.

### 5.3 Las líneas hoy

Estado al 2026-10-02. **Cada línea de esta tabla está demostrada** contra servidores reales en sus dos extremos (`version_lines`, D7): lo nuevo de ella pasa ahí y falla en los dos extremos de la línea anterior, y lo que eliminó, al revés. Una línea que ningún fixture separa se uniría a la anterior; el test lo informa. Cada línea soportada se prueba con el último parche de su versión LTS soportada más antigua, la que protege el mínimo. La compuerta de release también prueba la versión más nueva de cada motor. Cada versión de **Probada en** está declarada `verified` en `tools/test-dbs/lines.json`, fijada por digest de imagen, y pasa la matriz completa de §6 en CI en cada PR de motor (§7); lo que una línea no tiene se informa como N/A con su prueba (§10.1). **Estado** es el soporte del fabricante, no la cobertura de Rowly DB: una línea soportada puede tener huecos abiertos en §9.

| Motor | Línea | Diferencias con la línea anterior | Estado del fabricante (§5.2) | Probada en |
|---|---|---|---|---|
| MySQL | 5.7 | Base: sin CTE ni funciones de ventana, `CHECK` se lee y se ignora | Sin soporte (EOL 2023-10) | — |
| | 8.0–8.3 | CTE, funciones de ventana y `LATERAL`. `rank` pasa a ser reservada. Se eliminan `GROUP BY … DESC`, `PASSWORD()`, `ENCODE()` y `SQL_CACHE`. `CHECK` real desde 8.0.16 | Soportada, en gracia hasta 2027-04-21 | 8.0.46 |
| | 8.4 | Se eliminan `SHOW SLAVE STATUS` y `SHOW MASTER STATUS`. `mysql_native_password` no se carga por defecto | Soportada hasta 2032 | 8.4.11 |
| | 9 | Tipo `VECTOR` y funciones vectoriales (Rowly DB aún no lee columnas `VECTOR`: hueco P2, §9) | Soportada (9.7 LTS hasta 2034) | 9.7.2 |
| MariaDB | 10.3–10.5 | Base: secuencias, `INTERSECT`/`EXCEPT`, tablas versionadas, modo Oracle | Sin soporte (EOL 2025-06) | — |
| | 10.6–11.6 | `JSON_TABLE`, `OFFSET … FETCH`, `SKIP LOCKED` | Soportada (10.6 en gracia hasta 2027-07-06; 10.11 y 11.4 LTS) | 10.6.28 |
| | 11.7+ | Tipo `VECTOR`. `DEFAULT` en parámetros de procedures desde 11.8. Pistas del optimizador `/*+ … */` desde 12.0 | Soportada (11.8 y 12.3 LTS, 13.0 rolling) | 11.8.9 |
| PostgreSQL | 10 | Base: columnas identity, particionado declarativo, funciones `xlog` → `wal` | Sin soporte (EOL 2022-11) | — |
| | 11 | Procedures y `CALL` | Sin soporte (EOL 2023-11) | — |
| | 12–13 | Columnas generadas, se elimina `WITH OIDS`. La 13 no cambia nada de lo que usa Rowly DB | Soportada, 13 en gracia hasta 2026-11-13 | 13.23 |
| | 14 | Parámetros OUT en procedures, cuerpos SQL estándar (`BEGIN ATOMIC`, `RETURN`), se eliminan los operadores postfijos | Soportada hasta 2026-11-12 | 14.24 |
| | 15 | `MERGE`, sin `CREATE` por defecto en el schema `public` | Soportada hasta 2027-11 | 15.19 |
| | 16 | Constructores SQL/JSON, `IS JSON` | Soportada hasta 2028-11 | 16.15 |
| | 17 | `JSON_TABLE`, `MERGE … RETURNING` | Soportada hasta 2029-11 | 17.11 |
| | 18 | Columnas generadas virtuales, `OLD`/`NEW` en `RETURNING` | Soportada hasta 2030-11 | 18.6 |
| SQLite | — | Las líneas se definen al agregar el motor (§12) | — | — |

Datasets: Sakila en MySQL y MariaDB, Pagila en PostgreSQL, fijados en `lines.json` (Sakila por SHA-256, Pagila por commit). Los contenedores están en `tools/test-dbs/`.

### 5.4 Datos de línea

Lo que cambia de una línea a otra para Rowly DB se declara **una sola vez, como datos**, en `support/<motor>.json`, que cada motor registra en su `EngineDefinition` (`lines`) y lee `khipu_engine::lines`. Nada de código por línea: la lógica que usa los datos es la común del núcleo.

| Campo | Qué es | Quién lo usa |
|---|---|---|
| `line` | La versión donde empieza; llega hasta la siguiente. Los ids van en orden creciente | La línea efectiva del contexto de conexión (§5.2) |
| `revision` | Sube cada vez que cambian los datos de la línea | El contexto (`line.revision`) |
| `capabilities` | Capacidad del catálogo → versión desde la que existe, que puede ser un parche dentro de la línea (`checkConstraints: 8.0.16`) | La introspección de cada driver (`Capabilities`) |
| `reservedWords` | Palabras que la línea vuelve reservadas | El SQL generado y los alias del frontend, con las de todas las líneas del motor (G6) |
| `removedSyntax` | Tokens seguidos que la línea eliminó (`^` y `$` anclan al principio y al final de la sentencia) y lo que se usa en su lugar | El analizador, con la línea del servidor (A9) |

El cargador rechaza un formato o un campo desconocidos, líneas desordenadas o repetidas, una revisión 0 y una capacidad fuera de su línea o declarada dos veces. **Un dato solo entra con evidencia**: cada palabra reservada tiene su `AS <palabra>` en el `rejects.sql` de su línea, y cada `removedSyntax` marca una entrada de ese archivo desde su línea y nunca en la anterior (`crates/engine/tests/lines.rs`); D7 demuestra esos fixtures en los servidores reales. Los datos describen el comportamiento; `version_lines` demuestra que la frontera existe. Una revisión posterior de una línea puede llegar como paquete de soporte (§11). La versión exacta, el soporte del fabricante y la verificación no son datos de línea (§5.2).

## 6. La matriz

Cada fila es una propiedad que el motor debe tener **en cada línea soportada y en cada versión exacta anunciada como verificada** donde aplique. **Lo demuestra** nombra el test disponible hoy; su presencia no implica que ya corra en todas esas versiones. Una fila sin test es un hueco, no un acierto.

Rutas: `guard` = `crates/engine/src/execution_guard.rs`, `diag` = `crates/engine/src/diagnostics.rs`, `safety`, `analysis`, `generated` = `crates/server-tests/tests/{safety,analysis,generated}.rs`, `contract` = `crates/server-tests/tests/contract.rs`, `front/` = `app/src/lib/`. Son las ubicaciones de hoy; §10 describe la estructura a la que se mueven.

### 6.1 Seguridad

| # | Propiedad | Lo demuestra |
|---|---|---|
| S1 | Un `;` dentro de un texto, comentario, identificador o dollar quote del motor no corta | `front/engines/contract.test.ts` (*un ; dentro de sus comillas…*), `front/sqlStatements.test.ts` |
| S2 | Un texto que el guard acepta corre como una sola sentencia en el servidor real, medido **sin** la barrera de preparación del driver (§8). Lo mismo vale para el texto que la app envía de verdad cuando reescribe esa sentencia para ordenarla, paginarla o contarla: la reescritura tiene que leerse de vuelta con las mismas cadenas y volver a pasar el guard, o corre el texto original | `safety` `no_text_the_guard_accepts_runs_more_than_one_statement_on_the_server`, `fuzzing_the_guard_against_the_real_servers_finds_no_second_statement`, `what_the_app_rewrites_runs_as_one_statement_and_reads_the_same`; `crates/engine/src/pagination.rs` `lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas` |
| S3 | Todo lo que daña datos pide confirmación | `safety` `what_damages_data_never_passes_as_not_destructive`, tests unitarios del `guard` (`*_requires_confirmation`); en la app real, `app/tests/e2e/run.mjs` (*DELETE sin WHERE: Escape cancela…*) |
| S4 | Los comentarios ejecutables y con versión se clasifican como código | `guard` `executable_comments_are_classified_as_code`, `a_versioned_comment_is_read_both_ways_and_the_stricter_wins` |
| S5 | Las reglas de los textos siguen el modo del servidor (`NO_BACKSLASH_ESCAPES`) | `safety` `the_guard_reads_strings_like_a_server_in_no_backslash_escapes_mode` |
| S6 | La sintaxis que el parser no lee se juzga por su estructura, nunca se deja pasar sin más | `guard` `valid_statements_sqlparser_cannot_read_are_judged_by_their_structure`, `destructive_statements_sqlparser_cannot_read_still_ask_for_confirmation` |
| S7 | En producción cada escritura requiere confirmación explícita; el backend vuelve a clasificar antes de ejecutar y teclas repetidas o modificadas no la suplen | `app/src-tauri/src/commands/query.rs` `in_production_every_write_needs_confirmation`, `commands/results.rs` `grid_changes_in_production_need_the_users_confirmation`, `guard` `production_writes_require_confirmation`, `front/dialogKeys.test.ts`; en la app real, `app/tests/e2e/run.mjs` (*produccion: una escritura pide confirmacion…*, *produccion: editar el grid…*) cubre la consola y la edición de resultados en MySQL; el resto del recorrido es un hueco (§9) |

### 6.2 Análisis y diagnósticos

| # | Propiedad | Lo demuestra |
|---|---|---|
| A1 | No se marca nada que un servidor real acepte: el corpus, todas las definiciones de Sakila y Pagila, las consolas mezcladas | `analysis` `the_analyzer_marks_nothing_in_sql_the_real_servers_accept`, `common_valid_ddl_and_dml_is_never_objected_to`, `the_mixed_console_corpus_runs_through_guard_and_server`, `the_definitions_the_server_returns_for_sakila_and_pagila_are_accepted`, `the_routines_corpus_is_accepted_by_the_guard_and_created_by_every_server`; `crates/engine/tests/corpus.rs` |
| A2 | Los errores reales se marcan donde están | `diag` `mod contract` (`la_sintaxis_en_cada_motor`, `el_catalogo_en_cada_motor`), `corpus.rs` `errores_ordinarios_siguen_detectandose` |
| A3 | **Ningún prefijo del SQL del corpus entra en pánico**, escrito letra a letra | `analysis` `typing_real_sql_shows_nothing_that_is_only_unfinished`, `diag` `no_prefix_of_a_routine_panics` |
| A4 | Mientras se escribe, solo se ven errores reales: no lo que está sin terminar, ni la última palabra, ni un nombre que aún puede definirse | `analysis` `typing_real_sql_shows_nothing_that_is_only_unfinished`, `front/editor/diagnostics.dom.test.ts` |
| A5 | Los cuerpos de las rutinas se revisan por dentro | MySQL/MariaDB: `diag` `valid_routine_structures_are_not_objected_to`, `a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is`. PostgreSQL: **hueco** (§9) |
| A6 | Los nombres se comprueban contra el catálogo con las reglas de mayúsculas del motor | `diag` `postgres_distingue_mayusculas_como_el_servidor`, `mysql_no_distingue_mayusculas` |
| A7 | Los errores del servidor se ubican donde ocurren, a partir de mensajes reales del servidor | `front/engines/contract.test.ts` (`FIXTURES`), `front/editor/diagnostics.test.ts` |
| A8 | Las posiciones son correctas con texto multibyte | `diag` `select_into_keeps_positions_with_multibyte_characters`; una cobertura más amplia de Unicode es un **hueco** (§9) |
| A9 | La sintaxis que una línea eliminó se marca en esa línea, con su reemplazo, y no en las anteriores | `crates/engine/tests/lines.rs` `removed_syntax_is_marked_from_its_line_on_and_never_before`: cada `removedSyntax` de §5.4 marca una entrada de su `rejects.sql`, desde su línea y nunca en la anterior; `version_lines` `every_version_line_is_told_apart_from_the_previous_one`: nada que el analizador marque como eliminado con la línea de un servidor real lo acepta ese servidor; `analysis` analiza con la línea del servidor. Lo que MySQL 8.0 eliminó es un **hueco** (§9) |

### 6.3 SQL generado y autocompletado

| # | Propiedad | Lo demuestra |
|---|---|---|
| G1 | Los identificadores y literales que escribe la app se vuelven a leer con el mismo valor, también con una comilla dentro | `crates/engine/src/lib.rs` `mod contract`, `front/engines/contract.test.ts` |
| G2 | Cada `CALL` que escribe el autocompletado real corre en el servidor con los argumentos correctos (IN, OUT, INOUT, DEFAULT, VARIADIC, sin nombre, nombres entre comillas) | `generated` `completion_calls_run_on_the_real_servers` (llama al código TypeScript a través de `front/editor/catalogCompletions.server.test.ts`) |
| G3 | Sin una lista de parámetros fiable, la app escribe los paréntesis con el cursor dentro en vez de inventar argumentos | `front/editor/catalogCompletions.test.ts` |
| G4 | Insertar una sugerencia cuenta como escritura para los diagnósticos | `front/editor/catalogCompletions.test.ts` (aserción de `input.complete`) |
| G5 | Autocompletado de punta a punta con el dialecto del motor: FROM, JOIN, alias, ON | `front/engines/contract.test.ts`, `front/editor/catalogCompletions.test.ts` |
| G6 | Los alias automáticos y los nombres generados llevan comillas cuando son reservados en **cualquier** línea del motor | `front/engines/contract.test.ts` (*cada motor cita las palabras que reserva cualquiera de sus lineas*): las `reservedWords` de cada línea (§5.4), más la lista base del motor; `crates/engine/tests/lines.rs` `every_reserved_word_of_a_line_is_one_its_fixtures_prove`: cada una tiene su `AS <palabra>` en el `rejects.sql` de su línea |
| G7 | El resto del SQL generado corre en el servidor: el INSERT/UPDATE de la edición de resultados, las exportaciones, los filtros | `contract` `grid_literals_follow_the_session_mode`: el `UPDATE` de la edición de resultados guarda tal cual un texto con barras invertidas y comillas, con y sin `NO_BACKSLASH_ESCAPES` (MySQL, MariaDB). El resto es un **hueco** (§9); solo lo cubren tests unitarios |

### 6.4 Drivers e introspección

| # | Propiedad | Lo demuestra |
|---|---|---|
| D1 | Los conjuntos de resultados, los NULL, los tipos, el truncado y los comandos DDL se comportan bien | `contract` `connects_and_lists_schemas_and_tables`, `a_result_set_keeps_values_and_nulls`, `truncating_leaves_the_next_queries_complete`, `ddl_returns_a_command`, `a_server_error_keeps_its_code_and_position`, `the_session_keeps_the_server_defaults` |
| D2 | `CALL` y `SHOW CREATE` devuelven sus filas | `analysis` `call_and_show_create_return_their_rows` |
| D3 | La introspección clasifica cada tipo de objeto | `contract` `introspection_classifies_every_object_kind` |
| D4 | El **contenido** introspectado coincide con el servidor: columnas, tipos, claves, parámetros de rutinas y sus modos | en parte, a través de G2; una comprobación directa es un **hueco** (§9) |
| D5 | Los modos TLS negocian o fallan con un mensaje accionable | `contract` `tls_*`, frente a lo que ofrece cada imagen (`tls` en `lines.json`). Con una CA configurada (`tls_verification_uses_the_configured_ca`, MySQL, que guarda en su datadir la CA de su propio certificado): `VerifyCa` rechaza un certificado de otra CA, y `VerifyIdentity` rechaza uno que no nombra al host. Que `VerifyCa` acepte la CA correcta, y que `VerifyIdentity` acepte un certificado que nombra al host, son un **hueco** (§9) |
| D6 | La versión del servidor se lee y se asigna a su línea, incluidas formas como `5.5.5-10.11.6-MariaDB` | la lectura: tests unitarios de `crates/drivers/*/src/version.rs`; la asignación: `crates/engine/tests/lines.rs` (fronteras, versión futura, por debajo del piso, cada probe y cada versión verificada en su línea) y, en cada servidor real, `version_lines` `every_version_line_is_told_apart_from_the_previous_one` |
| D7 | Cada línea de §5.3 se distingue de la anterior, en sus dos extremos | `crates/server-tests/tests/version_lines.rs` `every_version_line_is_told_apart_from_the_previous_one` |
| D8 | El driver lee cada tipo de columna que puede devolver una línea soportada | `version_lines` `every_column_type_a_line_returns_is_read` (`tests/sql/<motor>/<línea>/reads.sql`). Hueco: `VECTOR` de MySQL 9 (§9); sus lecturas llevan `-- gap:` y tienen que fallar con el error conocido |
| D9 | Motor, versión exacta, modo SQL, línea y revisión son coherentes entre backend y frontend; reconectar o cambiar modo invalida cachés y nunca aplica reglas de otro motor | `app/src-tauri/src/engine_context.rs`: el contexto que arma el backend al conectar (línea efectiva, verificación de la versión exacta, soporte del fabricante) y lo que se pidió con otra generación o `schemaEpoch` no vale. `front/editor/analysisSession.test.ts`: una respuesta pedida con la conexión anterior no se aplica tras reconectar. `front/stores/connectionCatalog.test.ts`: el motor activo es el que dice el backend, con su modo. E2E (`app/tests/e2e/resources.mjs`): 300 reconexiones alternando MySQL y PostgreSQL, cada una con su servidor y su catálogo, sin que crezcan el heap de JavaScript vivo, el backend ni lo montado en el DOM. La línea efectiva, su revisión y su origen (incluida o paquete descargado, §11) salen de las líneas activas al conectar y viajan en el contexto, junto con las reservadas de esa revisión; el análisis solo usa la línea si es del motor del perfil (`engine_context.rs` `the_analysis_uses_the_line_only_when_it_is_of_the_profiles_engine`), y el frontend no la deduce de la versión ni de la etiqueta (`front/engines/contract.test.ts`). Cambiar el modo dentro de la sesión de la consola: `app/src-tauri/src/state.rs` lo vuelve a leer después de una sentencia que puede cambiarlo, y un modo distinto es una generación nueva (`a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset`); `contract` `the_console_keeps_its_session_between_statements`: lo que una sentencia deja en la sesión (`SET`, una variable, una tabla temporal, una transacción, el `sql_mode`) vale para la siguiente; `front/stores/connectionCatalog.test.ts`: el editor pasa al modo nuevo y una respuesta atrasada nunca lo devuelve al anterior |
| D10 | Un paquete de soporte solo cambia datos de línea: se instala firmado, íntegro, con formato conocido y compatible, de forma atómica y reversible a la incluida; sin red valen las incluidas; no relaja el guard ni declara verificación (§11) | `app/src-tauri/src/support.rs` (firma válida e inválida, contenido y índice manipulados, hash incorrecto, descarga truncada, formato y campo desconocidos, `requiresApp`, motor o línea que no coinciden, instalación interrumpida, actualización, vuelta a la incluida, sin red, versión futura, desactivar, soporte y verificación, misma revisión que el frontend); `crates/engine/tests/lines.rs` `a_package_is_a_line_validated_like_the_included_ones`; `front/engines/contract.test.ts` (*una reservada que trae un paquete de soporte se cita en esa conexion*) |

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

Dónde se declara hoy: las reglas léxicas y de llamada, en cada `SqlProfile` (`app/src/lib/engines/*.ts`); las reglas del lenguaje, en el `EngineDefinition` de cada motor (`crates/engine/src/dialects/`, registrado en `Dialect::definition`); desde qué versión existe cada capacidad del catálogo, una sola vez, en los datos de línea (`support/<motor>.json`, §5.4). Cómo la lee cada motor sigue en el `version.rs` de su driver (`Capabilities`), que pregunta a esos datos; un test impide volver a comparar versiones ahí (`crates/engine/tests/lines.rs` `no_known_consumer_declares_versioned_behavior_by_itself_again`).

## 7. Compuertas

| Compuerta | Cuándo | Qué corre | Automática |
|---|---|---|---|
| **PR** | Cada pull request | `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `npm run check`, `npm test`, `npm run build`, comprobación del inventario de tests y los recorridos E2E en la app real (Linux, WebKitGTK) | Sí: `.github/workflows/quality.yml` y `e2e.yml` |
| **PR de motor** | Cambia divisor, analizador, guard, introspección, autocompletado, driver o ejecución | PR, más matriz real completa de §6 en **cada versión exacta verificada afectada**, con fuzz de 4000 casos por versión; un cambio común afecta a todos los motores | Sí: `.github/workflows/sql-engine.yml` corre la matriz en cada versión exacta verificada, D7/D8 en cada probe, y falla si una versión no tiene la evidencia completa. |
| **Versión exacta o paquete** | Antes de anunciar una versión verificada o publicar su paquete de línea (§11) | Matriz completa en esa versión y en las demás versiones verificadas de la línea afectada; D7 frente a línea anterior si cambia el comportamiento | No |
| **Release** | Antes de publicar Rowly DB | Matriz completa de todas las versiones exactas verificadas, fuzz de al menos tres semillas, tests de driver, revisión de la versión más nueva de cada motor, ventana de soporte (§5.2) y humo manual de interfaz | No |

Comandos, hoy:

```bash
# Compuerta de PR
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cd app && npm run check && npm test && npm run build && cd ..
node tools/inventory/tests.mjs --check
# Recorridos E2E: solo en CI (.github/workflows/e2e.yml); necesitan WebKitWebDriver, tauri-driver, Xvfb y xdotool

# Suite contra servidor real (levanta MySQL, MariaDB y PostgreSQL en Docker)
tools/test-dbs/up.sh                       # o una versión verificada: tools/test-dbs/up.sh postgres=13.23
ROWLY_EVIDENCE=evidence.jsonl cargo test -p rowly-server-tests -- --ignored --test-threads=1
node tools/inventory/coverage.mjs          # cada fila de §6 asignada, ninguna prueba real huérfana

# Ajustes del fuzz
ROWLY_ENGINES=mysql,postgres     # limita a algunos motores
ROWLY_FUZZ_CASES=20000           # casos por motor (por defecto 4000)
ROWLY_FUZZ_SEED=21               # semilla base (por defecto 0)

# Líneas de versión: un servidor por extremo de cada línea, sin datos (tools/test-dbs/lines.json)
tools/test-dbs/lines.sh up postgres          # o mysql, mariadb; sin argumento: todos
cargo test -p rowly-server-tests --test version_lines -- --ignored --test-threads=1
tools/test-dbs/lines.sh down postgres

```

En CI, cada versión exacta verificada corre en su propio job contra su imagen fijada; el harness se detiene si el servidor no es la versión declarada o si su `sql_mode` global quedó en otro modo. El último job (`tools/test-dbs/evidence.mjs`) exige, para cada versión de `verified`, el servidor declarado y todas las pruebas reales en verde, ninguna ignorada, y enumera los N/A. Una versión sin esa evidencia no se anuncia como verificada.

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
| La consola corre en una sola conexión por ventana (`ConsoleConnection` en `driver-core`): ejecutar, contar y exportar la usan en orden, así que lo que una sentencia deja en la sesión (`SET`, variables, tablas temporales, `USE`, `BEGIN`) vale para la siguiente. El catálogo, la introspección y cancelar usan el pool. | Cada sentencia tomaba una conexión cualquiera del pool: un `SET` o un `BEGIN` quedaba en una conexión y la sentencia siguiente podía correr en otra. |
| La edición de resultados aplica sus cambios en el pool, en una transacción propia, y escribe sus literales con el modo de las conexiones del pool (leído al conectar), no con el de la consola. | Aplicarlos en la consola correría el `BEGIN`/`COMMIT` de sqlx dentro de una transacción que el usuario puede tener abierta, y no se sabe si hay una (§9). |
| Si la conexión de la consola se pierde, o un resultado que no se puede paginar deja más de 1000 filas pendientes, la conexión se cierra y la sentencia siguiente abre otra. La app lo avisa; nada se reintenta. | Leer todas las filas pendientes para conservar la sesión podría tardar sin límite. Una sentencia que falló con la conexión perdida puede haberse ejecutado o no. |
| Un servidor más viejo que la ventana de soporte conecta igual, y su línea nunca se quita. | Rowly DB nunca rechaza un servidor. Lo marca como sin soporte oficial y hace lo que permita su línea. |

## 9. Huecos conocidos

Ordenados por prioridad. Cada uno se convierte en una fila de §6 cuando se cierra.

| Hueco | Severidad | Nota |
|---|---|---|
| Rowly DB no lee columnas `VECTOR` de MySQL 9 (D8): un resultado que trae una falla entero con «unknown column type 0xf2». `sqlx` 0.8.6, la última versión publicada con la que se compila, no conoce ese tipo; el arreglo está fusionado upstream ([transact-rs/sqlx#4441](https://github.com/transact-rs/sqlx/pull/4441)) pero en ninguna versión publicada | P2 | Rowly DB solo usa versiones publicadas de sus dependencias, nunca un fork. Se cierra al pasar a la primera versión publicada que lo traiga: las tres lecturas de `tests/sql/mysql/9/reads.sql` llevan `-- gap:` y la prueba avisa cuando dejan de fallar. Crear la columna, filtrar por ella o leer otras columnas de la tabla funciona. |
| La prueba integrada de confirmación (S7) solo cubre la consola y la edición de resultados en una versión de MySQL | P2 | Añadir los demás motores y versiones. Los recorridos E2E corren solo en Linux; Windows (WebView2) y macOS (WKWebView) siguen siendo humo manual de release. |
| Rowly DB no sabe si la consola tiene una transacción abierta, así que no avisa antes de cerrar una ventana o desconectar con una | P2 | El sqlx publicado no expone el estado de transacción de las sentencias que corren como texto, y Rowly DB no lo adivina del SQL. Cerrar la conexión de la consola hace que el servidor deshaga la transacción, así que nada se confirma por accidente; solo falta el aviso. |
| No se sigue PostgreSQL con `standard_conforming_strings = off`: el guard y el analizador leen las cadenas con la regla del motor | P2 | Desde PostgreSQL 9.1 no es el valor por defecto. Por la ruta normal, la barrera de preparación del driver (§8) sigue rechazando varias sentencias. |
| Lo que MySQL 8.0 eliminó (`GROUP BY … DESC`, `PASSWORD()`, `ENCODE()`, `SQL_CACHE`) no se marca en el editor (A9) | P2 | `removedSyntax` (§5.4) es una secuencia de tokens, y ninguna lo distingue de SQL válido: una columna `sql_cache`, una función propia `encode`, un índice de prefijo sobre una columna `password`. Hace falta un mecanismo estructural en el analizador, con su prueba en cada motor. Lo marca el servidor al ejecutar. |
| La clasificación de incompleto / no encontrado / genérico vive en el frontend (listas de claves en `app/src/lib/editor/analysisSession.ts`), y `analysis` la replica para simular la escritura | P2 | El analizador debería emitir una categoría con cada diagnóstico. Eso elimina la copia (principio 5). |
| El contenido introspectado no se comprueba directamente contra el servidor (D4) | P2 | Un ejemplo encontrado al escribir esto: MariaDB 11.8 acepta `DEFAULT` en los parámetros de un procedure, pero su introspección siempre informa `has_default: false`. |
| El resto del SQL generado (G7) no se ejecuta en un servidor: el `INSERT` y el `DELETE` de la edición de resultados, las exportaciones, los filtros y el `UPDATE` en PostgreSQL | P2 | |
| Los cuerpos de las rutinas de PostgreSQL no se analizan (A5) | P2 | |
| Unicode más allá de `SELECT INTO`: nombres, posiciones, UTF-8 ↔ UTF-16 entre Rust y el editor (A8) | P2 | |
| `VerifyCa` con la CA que firmó el certificado del servidor sigue fallando cuando el certificado no nombra al host (D5): sqlx 0.8.6 solo ignora el error de nombre antiguo de rustls, y rustls 0.23.45 informa `NotValidForNameContext` | P2 | Falla cerrado: nada sin verificar pasa, y un certificado que nombra al host conecta. Rowly DB no parchea sqlx (solo versiones publicadas); `tls_verification_uses_the_configured_ca` avisa cuando una versión lo corrija. |
| No se prueba que `VerifyIdentity` acepte un certificado que nombra al host (D5): ningún servidor de prueba sirve uno, MariaDB 11.8 genera su certificado en memoria, y las imágenes de PostgreSQL y MariaDB 10.6 no ofrecen TLS | P2 | Hacen falta certificados propios servidos por las imágenes de prueba, lo que cambia lo que ofrece cada imagen (`tls` en `lines.json`). |
| Si una exportación falla a mitad (error del servidor o del archivo, o filas sin leer), la conexión de la consola se descarta y el aviso de sesión perdida llega recién con la respuesta de la sentencia siguiente, que ya corrió en la sesión nueva | P2 | Ejemplo: `BEGIN; UPDATE …`, la exportación falla, el `UPDATE` siguiente se confirma solo y el aviso aparece después. Nada se ejecuta sin el guard ni se confirma la transacción: el servidor la deshace al cerrarse la conexión. `stream_query` (`crates/drivers/*/src/lib.rs`) llama a `console.discard()`, y `export_query_to_file` (`app/src-tauri/src/commands/results.rs`) no devuelve `sessionReset`. |
| Un índice de paquetes viejo pero firmado puede bajar la revisión descargada de una línea, y un paquete firmado puede quitar una capacidad que declaraba la línea incluida. Los drivers leen sus capacidades de `Dialect::lines()`, así que eso cambia sus consultas de catálogo | P2 | Nunca baja de la revisión incluida (`with_packages` en `crates/engine/src/lines.rs` solo la reemplaza con una más nueva), nunca toca el guard ni el parser y solo acepta lo firmado con la clave de la app. `Store::install` (`app/src-tauri/src/support.rs`) no compara con la revisión ya instalada, y la validación no exige que una revisión conserve las capacidades de la incluida. |
| Carrera de `sql_mode` entre pestañas de una ventana: el guard toma el modo de la sesión antes de esperar la conexión de la consola, y otra pestaña puede ejecutar un `SET sql_mode` (por ejemplo `NO_BACKSLASH_ESCAPES`) entre la clasificación y la ejecución | P2 | `execute_query` en `app/src-tauri/src/commands/query.rs` lee las opciones del guard antes del mutex de `ConsoleConnection`. Exige dos sentencias en curso a la vez en pestañas distintas, una de ellas cambiando el modo; por la ruta normal, la barrera de preparación del driver (§8) sigue rechazando varias sentencias. |
| El fuzz del guard en PostgreSQL 13 genera 37 casos peligrosos de 4000, y la prueba exige más de 30 para medir algo (S2) | P3 | No es una regresión: el fuzz es determinista (semilla fija por motor) y sus esqueletos se filtran por versión. PostgreSQL 13 no tiene cuerpos de función del estándar SQL, así que sortea entre tres esqueletos menos y obtiene otra secuencia; 37 es constante para 13.23 con este corpus. El mínimo es lo que impide que el fuzz deje de medir, así que un cambio del corpus o del mutador que lo baje de 30 tiene que fallar. |
| Un `SET GLOBAL sql_mode` ejecutado después de conectar llega a las conexiones nuevas del pool, mientras la edición de resultados sigue escribiendo literales con el modo leído al conectar | P3 | Reconectar lo vuelve a leer. |
| Los valores `VECTOR` de MariaDB se ven en hexadecimal: el servidor los envía como binario sin un tipo que los distinga | P3 | |
| La evidencia que exige `publish.mjs` no dice de qué commit es: `evidence.mjs` comprueba versión, digest y resultados, pero no que los artefactos salgan del mismo commit que los paquetes | P2 | Publicar desde el job de la matriz, con sus artefactos, lo garantiza en la práctica; registrar el commit en la evidencia lo haría comprobable. |
| §5.3 se escribe a mano: no sale de `support/` como el índice de paquetes (§11) | P3 | Sus diferencias son prosa para personas; generar la tabla pide llevar ese texto a la fuente. |
| Sin cubrir todavía: usuarios con permisos reducidos, catálogos desactualizados, esquemas grandes (cientos de tablas), reconexión, timeouts, cancelación bajo carga | P3 | Se añade cada uno cuando se toque la función que protege. |
| Sin prueba contra un servidor: que `USE` se conserve en la consola de punta a punta, la pérdida física de la conexión de la consola (no se reintenta y se avisa) y que cerrar una consola con una transacción abierta la deshaga | P3 | El código no reintenta (§8) y el rollback lo hace el servidor al cerrarse la conexión; falta demostrarlo con `KILL`/`pg_terminate_backend` y desconectando con una transacción abierta. |

## 10. Tests, fixtures y simulaciones

### 10.1 Estructura

Árbol compartido por las pruebas de Rust y TypeScript:

```text
tests/sql/
  coverage.json          fila de §6 → test, ámbito y compuerta
  common/                SQL válido en cada línea de cada motor
  <motor>/
    setup.sql            corre en cada servidor del motor antes de sus fixtures
    common/              válido en cada línea del motor
    <línea>/
      accepts.sql        lo nuevo de esta línea: el servidor lo acepta aquí y lo rechaza en la línea anterior
      rejects.sql        lo que esta línea elimina: el servidor lo rechaza aquí y lo aceptaba en la línea anterior
      reads.sql          tipos y catálogo devueltos por esta línea
      generated.sql      SQL escrito por Rowly DB, si difiere en esta línea
      attacks.sql        seguridad propia de la línea, si difiere
```

Los casos unitarios quedan junto al código que prueban. Las entradas de un `.sql` se separan con una línea `-- ---`; cada una es una sola sentencia con un comentario que dice qué demuestra. Una línea `-- since: <versión>` en una entrada marca un cambio dentro de la línea (§5.1): antes de esa versión, la línea se comporta como la anterior, y la línea necesita servidores a los dos lados de ella.

`tools/test-dbs/lines.json` es la fuente única de servidores de prueba: probes por línea y versiones exactas verificadas. Sus líneas son las de `support/<motor>.json`, en el mismo orden (`crates/engine/tests/lines.rs`); describen comportamiento allí y se demuestran aquí. Cada imagen está fijada por digest, y el harness compara la versión que devuelve el servidor con la declarada para ese digest antes de ejecutar. Las imágenes vienen del espejo público de las oficiales (`public.ecr.aws/docker/library`).

Una entrada que usa algo que agrega una línea posterior lo dice con `-- needs: <capacidad>` (en un fixture de consola mixta, la clave `needs`). La capacidad se nombra con el comentario de su entrada en `tests/sql/<motor>/<línea>/accepts.sql`, así que la frontera se declara una vez y D7 la demuestra. En una versión anterior el servidor tiene que rechazar la entrada; solo entonces es N/A, y queda en la evidencia con su fila, línea y archivo. Si el servidor la acepta, la capacidad está mal declarada y la prueba falla.

Todo el corpus vive aquí. En `common/` (de cualquier nivel): `no-diagnostics.sql`, SQL válido en el que el analizador no puede marcar nada (`crates/engine/tests/corpus.rs`); `mixed.json`, consolas mezcladas con cómo se parten (las comparten el divisor de Rust, el del frontend y `analysis`); `mixed-errors.json` y `mixed-routines.json` en `tests/sql/common/`; y, por motor, `valid.sql`, `attacks.sql` y `routines.sql`, que corren contra los servidores (`safety`, `analysis`). MariaDB usa los de MySQL salvo `mixed.json`. Los tests que ya no aplican se borran, no se guardan «por si acaso».

`coverage.json` asigna cada fila S/A/G/D de §6 a una prueba, su fixture, los motores y versiones donde aplica y la compuerta que la ejecuta. Una fila sin prueba, un `N/A` sin motivo o una prueba real que no prueba ninguna fila hacen fallar `tools/inventory/coverage.mjs`. El harness de `crates/server-tests` prepara un esquema efímero por motor, versión y caso, restaura el modo de sesión, recoge la versión exacta y emite un reporte reproducible con commit, fila, SQL mínimo, semilla y resultado. Los tests unitarios siguen junto al código.

Para migrar un corpus o test antiguo: registrar qué propiedad protege, añadir su sustituto en este árbol, comprobar que este detecta el fallo conocido y ejecutarlo en CI; solo entonces borrar el anterior. Un test duplicado, obsoleto o que copia el algoritmo no se conserva por inercia.

### 10.2 Reglas

- **Cada línea se demuestra.** Un test comprueba que cada `accepts.sql` falla en la línea anterior y que cada `rejects.sql` pasaba en ella. Si no, la línea no está justificada, y el test lo dice.
- **Primero el SQL real.** Mejor lo que devuelve el propio servidor (definiciones de Sakila y Pagila, `SHOW CREATE`, `pg_get_functiondef`) que SQL escrito a mano.
- **Determinista.** Nada de hora actual, resultados sin orden, supuestos de locale o zona horaria, ni entradas aleatorias sin una semilla fija. Una semilla que falla se guarda como fixture.
- **Aislado.** Cada test prepara lo que necesita y limpia después. Las pruebas destructivas solo corren contra los contenedores de prueba, nunca contra la base de un usuario.
- **Una sola manera de llegar a un servidor:** `tools/test-dbs`, un contenedor por versión exacta declarada, elegido por el registro. Las versiones no enumeradas no se anuncian como verificadas.
- **Fallos legibles.** Un fallo nombra el motor, la línea y la versión exacta, el SQL (o el prefijo y la posición, si es de escritura), lo esperado y lo que pasó.
- **Nombres uniformes.** El nombre de un test dice la propiedad que demuestra, en inglés y con el mismo estilo en Rust y en TypeScript.

### 10.3 Simulaciones

Una simulación es un test fijo, nunca un script de una sola vez. Cada una corre en cada versión exacta declarada verificada, con el catálogo y las reglas de su línea, y tiene una semilla fija y un resultado registrado.

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

Lo que se sabe de una línea (§5.4) también viaja como **paquete de datos, nunca código**: una línea de un motor, con su revisión y la versión mínima de la app que la sabe usar. Cada release de la app incluye las líneas de `support/` y funciona entera sin red con ellas; un paquete descargado solo actualiza esos datos.

| Archivo | Formato 1 (campos desconocidos: rechazado) |
|---|---|
| Paquete (`khipu_engine::lines::Package`) | `format`, `engine`, `requiresApp` y `line`, que son exactamente los campos de §5.4 |
| Índice (`index.json`) | `format`, `commit` (de donde salen paquetes y evidencia) y `packages`: `engine`, `line`, `revision`, `requiresApp`, `file`, `size`, `sha256`; una entrada por línea |

Reglas:

- **Publicar** sale de `support/`, nunca de una copia: `tools/support/publish.mjs` escribe un paquete por línea y el índice, y los firma con la clave de las actualizaciones de la app (`tauri signer sign`, como el release). Se niega si la evidencia de la matriz no está completa para cada versión verificada (`tools/test-dbs/evidence.mjs` sobre los artefactos de `sql-engine.yml`), si un dato de línea no tiene su fixture (`crates/engine/tests/lines.rs`), si la fuente tiene cambios sin commit o si no hay clave. No sube nada: los archivos se adjuntan al release `support-packages`.
- **Instalar** solo cuando el usuario lo pide, en Ajustes → Motores (`app/src-tauri/src/support.rs`); conectar nunca usa la red. El índice y el paquete se verifican con la clave pública del updater. El paquete tiene que coincidir en tamaño y SHA-256 con su entrada, decir lo mismo que ella (motor, línea, revisión, `requiresApp`), tener un formato conocido, caber entre las líneas del motor y no pedir una app más nueva; si la pide, la interfaz dice «requiere Rowly DB x o más nueva» y no instala nada. Se escribe en un temporal y se renombra: si algo falla, sigue la revisión anterior. Al leerlo se vuelve a verificar; uno inválido se ignora y vale la incluida.
- **Revisiones**: una descargada reemplaza a la incluida solo si es más nueva. Quitarla vuelve la incluida, que nunca se borra. Una línea nueva puede llegar en un paquete si solo usa mecanismos que la app ya tiene.
- **Desactivar** una línea es decisión del usuario: sus servidores usan la línea activa más cercana por debajo, nunca una de arriba, y siempre queda una activa. Sus capacidades del catálogo y sus reservadas siguen valiendo (el SQL generado sigue la regla más estricta). Ni el fin de soporte del fabricante ni una actualización quitan una línea.
- **Conexión**: toma las líneas activas al conectar, mientras ninguna instalación puede cambiarlas; el driver fija sus capacidades, el contexto su línea, revisión, origen y reservadas, y el analizador usa esa misma instantánea. Un cambio vale desde la conexión siguiente, que es otra generación (D9).
- **Un paquete nunca relaja el guard**: el guard no lee datos de línea y el formato no admite nada fuera de §5.4. **Tampoco declara verificación**: «verificada» y el soporte del fabricante salen de lo compilado en la app (`tools/test-dbs/lines.json`, `tools/support/vendor-support.json`); instalar un paquete no cambia ninguno de los dos.

Lo prueba D10. §5.3 se sigue escribiendo a mano; el índice ya sale de la misma fuente que la app (§9).

## 12. Agregar un motor, paso a paso

Estas operaciones son distintas: **motor** = reglas SQL y catálogo; **driver** = protocolo y transporte; **línea** = rango de comportamiento demostrado; **versión exacta** = binario del servidor probado. MariaDB y MySQL comparten driver, pero no identidad ni dialecto. El estado del fabricante (§5.2) tampoco equivale a verificación de Rowly DB.

### 12.1 Motor nuevo

1. **Elegir identidad y protocolo.** Empezar con `node tools/engine/new.mjs <id> --like <motor>`: le da un ID estable en el registro (`Dialect::definition`), lo marca pendiente en `tests/engines/contract.json`, y desde ahí el compilador y los tests nombran cada lugar donde todavía falta (`DatabaseKind`, `ConnectionDriver`, el harness de pruebas, líneas y fechas del fabricante). Reutilizar un driver solo si habla el mismo protocolo y los tests de tipos, TLS e introspección lo permiten. La [guía de desarrollo](CONTRIBUTING.es.md#agregar-un-motor-de-base-de-datos) enumera las rutas actuales.
2. **Implementar decisiones de motor.** Cada campo de su `EngineDefinition` (`crates/engine/src/dialects/<id>.rs`) se resuelve explícitamente: parser y sintaxis no leída, citas, regla de la barra invertida, comentarios ejecutables, cuerpos de rutina, SQL generado y guard; los valores heredados de la plantilla hacen fallar los tests hasta decidirlos. El núcleo nunca compara motores: un mecanismo que necesita un motor es un campo o variante nueva de la definición, con una prueba para cada motor existente. Un parser «cercano» solo se usa tras demostrar que no oculta SQL destructivo ni marca sintaxis válida como error. Ningún caso cae silenciosamente a otro motor.
3. **Registrar pruebas.** Añadir su columna de capacidades en §6.5, fixtures comunes y por línea en §10, y una respuesta para cada fila S/A/G/D. Los `PerEngine` y `FIXTURES` actuales ayudan, pero no sustituyen la matriz real. `N/A` exige motivo documentado.
4. **Validar y anunciar.** Ejecutar §7 en todas las versiones exactas que se pretendan anunciar, volver a correr contratos compartidos de los motores existentes y registrar P0/P1/P2. Solo con P0 = 0, P1 = 0 y cada fila aplicable cubierta llega a Integrable (§4).

### 12.2 Línea nueva de un motor existente

1. Añadir al corpus un caso que pase en la línea nueva y falle en la anterior, o viceversa. Sin diferencia observable para Rowly DB, ambas versiones comparten línea (§5.1).
2. Declarar la línea en `support/<motor>.json` (§5.4: capacidades, reservadas y sintaxis eliminada, cada dato con su fixture) y agregar sus probes en los extremos y a ambos lados de cualquier `since` en `tools/test-dbs/lines.json`. Si hacen falta parser, protocolo, tipo o consulta de catálogo nuevos, primero publicar la app que los implementa (§11).
3. Ejecutar D7 y toda la matriz aplicable en cada versión exacta que se vaya a anunciar como verificada. Actualizar §5.3 y el reporte de §10; el estado del fabricante se calcula aparte.

### 12.3 Versión exacta nueva dentro de una línea

1. Fijar la imagen o biblioteca de esa versión por digest en el registro de pruebas, leer su versión real y comprobar que coincide. No inferir soporte del número en el nombre de la imagen.
2. Ejecutar todas las filas aplicables de §6 y guardar la evidencia de §10. Si aparece una diferencia de comportamiento, volver a 12.2; si no, conservar la línea y añadir la versión al conjunto verificado.
3. Una versión aún no probada puede conectar con la línea conservadora de §5.2, pero no se muestra como «verificada» ni se añade a las versiones verificadas de `tools/test-dbs/lines.json`.

SQLite no tiene proceso servidor: en estas compuertas «servidor real» significa la biblioteca SQLite enlazada por el driver, con versión y dataset fijados. Tener menos objetos no reduce el listón del divisor, guard, escritura, citas ni seguridad.

## 13. Trabajar en un motor (personas e IA)

No pidas «el mayor número de simulaciones posible»: eso da una cobertura desigual. Pide:

> Aplica SQL_ENGINE.es.md a `<motor>` `<línea>` `<versión exacta>`: corre la compuerta `<PR | PR de motor | versión exacta | release>`, informa cada P0/P1 con una reproducción SQL mínima, convierte cada bug nuevo en un test permanente y actualiza §5, §6, §9 y §10.

Las pruebas exploratorias son bienvenidas, y aquí encontraron bugs reales: un pánico con un `DECLARE` a medio escribir y las comillas de los argumentos de un `CALL` generado. Pero lo que encuentran se convierte en fixture. Nunca reemplazan la matriz.
