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

**Cómo está organizado.** Las secciones 1–8, 10, 11 y 13 son el **contrato**: valen para cada motor, el de hoy y el de mañana. §5.3, §6.5, §9 y §14 son el **estado actual** de MySQL, MariaDB y PostgreSQL; donde ese estado son datos, se genera desde su fuente (`node tools/inventory/status.mjs`) y nunca se copia a mano. Cómo añadir o cambiar un motor está en [ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md); §12 solo apunta ahí. Los números de sección son estables: el código, los tests y los mensajes los citan.

**Ruta rápida para contribuir:** identifica la propiedad S/A/G/D de §6, consulta los huecos de §9, añade o ajusta un fixture de §10, ejecuta la compuerta de §7 y registra motor, línea y versión exacta en el PR. [ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md) indica los pasos adicionales para un motor, una línea o una versión exacta nuevos. Las rutas y comandos marcados como «hoy» describen el repositorio actual; los requisitos de calidad no se consideran cumplidos por estar escritos aquí.

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

Lo que exige cada nivel, en concreto:

| Nivel | Compuertas (§7) | Filas de §6 | Contra servidores reales |
|---|---|---|---|
| **Experimental** | Ninguna. No se publica como soportado ni se anuncia | Cualquiera | No hace falta |
| **Integrable** | Compuertas de PR y de PR de motor en verde en cada versión exacta que anuncia, con la evidencia completa (`tools/test-dbs/evidence.mjs`); `tools/inventory/coverage.mjs` en verde | Cada fila aplicable: un test que incluye al motor, un `N/A` con su motivo, o un hueco declarado en §9 como P2 o menos | Las suites `real` (`safety`, `analysis`, `generated`, `contract`) en cada versión verificada, y `lines` (D7, D8) en cada probe |
| **Estable** | Integrable y, además, las compuertas de versión exacta y de release automatizadas en el CI, y varias versiones publicadas sin regresiones P0/P1 | Igual | Igual |
| **Maduro** | Estable y, además, uso real durante varias versiones | Igual | Igual |

«Varias» es el criterio de quienes mantienen el proyecto; un cambio de nivel se registra en §14.1 con su evidencia.

**Que funcione no es que esté verificada.** Una versión exacta está *verificada* solo si está en `verified` de `tools/test-dbs/lines.json`, fijada por digest, y la compuerta de PR de motor produjo su evidencia completa. Una versión que conecta y ejecuta SQL sin eso no está verificada, y la app lo dice (§5.2). El nivel de cada motor hoy está en §14.1.

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

- **Piso de compatibilidad** (`COMPATIBILITY_FLOOR_*` en el `version.rs` de cada driver, igual al inicio de la primera línea del motor en §5.3): la versión más antigua cuyo catálogo el driver sabe leer. Nunca rechaza una conexión: un servidor más antiguo conecta con su línea, carga lo que tenga su catálogo y el explorador avisa que pueden faltar objetos. No dice nada del soporte.
- **Ventana de soporte** (esta sección; fechas del fabricante en `tools/support/vendor-support.json`): decide la etiqueta que muestra el editor y qué líneas cubre la compuerta de PR de motor. `tools/test-dbs/window.mjs`, en la compuerta de PR, falla si `verified` y la ventana no coinciden: cada línea con una versión soportada o en gracia tiene una versión verificada, y ninguna versión verificada queda fuera de la ventana.
- **Verificación** (`verified` en `tools/test-dbs/lines.json`): las versiones exactas que pasan la matriz completa con evidencia (§7).

El soporte del fabricante y la verificación de Rowly DB son datos distintos. **Cada versión exacta anunciada como verificada** debe pasar todas las filas aplicables de §6, con evidencia de §7 y §10. Una versión sin esa evidencia puede conectar con reglas conservadoras de su línea, pero no se anuncia como verificada. La tabla de §5.3 refleja las pruebas disponibles hoy; no certifica todos los parches de sus rangos. Una línea de comportamiento agrupa reglas; la versión exacta identifica el servidor probado. Ningún parche hereda automáticamente la verificación de otro.

**Reglas según el uso:**

- **SQL generado** (comillas, alias, `CALL`): se aplica la regla más estricta de todas las líneas del motor. Poner comillas a `rank` sobra en 5.7 y no hace daño; no ponerlas rompe en 8.0.
- **Diagnósticos:** se aplica la línea exacta del servidor conectado, para que el editor pueda decir que `SHOW SLAVE STATUS` ya no existe en 8.4 sin molestar a quien trabaja con un 5.7.
- **Cuando la línea del servidor no tiene paquete**, se aplica la línea más cercana por debajo, nunca una de arriba. Si no existe una anterior, se usa la más antigua disponible, se informa de la incertidumbre y se desactivan las capacidades que ese servidor no haya demostrado; el guard conserva su política más estricta. Las reglas de una línea más nueva pueden no existir en ese servidor.
- **Contexto de conexión:** motor, versión exacta, modo SQL, línea y revisión efectivos se fijan juntos para la conexión. El editor y el guard usan esa misma identidad; cambiar conexión o modo invalida análisis y cachés dependientes. Una etiqueta visible no decide el dialecto.

### 5.3 Las líneas hoy

**Estado actual, generado** desde `support/<engine>.json`, `tools/test-dbs/lines.json` y `tools/support/vendor-support.json`. **Cada línea de esta tabla está demostrada** contra servidores reales en sus dos extremos (`version_lines`, D7): lo nuevo de ella pasa ahí y falla en los dos extremos de la línea anterior, y lo que eliminó, al revés. Una línea que ningún fixture separa se uniría a la anterior; el test lo informa. Cada línea soportada se prueba con el último parche de su versión LTS soportada más antigua, la que protege el mínimo, y la compuerta de release también prueba la versión más nueva de cada motor. Cada versión de **Verificadas** está fijada por digest de imagen y pasa la matriz completa de §6 en CI en cada PR de motor (§7); lo que una línea no tiene se informa como N/A con su prueba (§10.1). Las fechas del fabricante deciden el estado de soporte con la regla de §5.2; no son la cobertura de Rowly DB, y una línea soportada puede tener huecos abiertos en §9.

<!-- generated: lines (tools/inventory/status.mjs) -->
| Motor | Línea | Revisión | Lo que declara la línea (§5.4) | Versiones del fabricante (EOL de las LTS) | Verificadas |
|---|---|---|---|---|---|
| MySQL | 5.7 | 1 | — | 5.7; 1 de corta duración | — |
|  | 8.0 | 1 | `checkConstraints` desde 8.0.16<br>reservada `rank` | 8.0–8.3; 8.0 (2026-04-21); 3 de corta duración | 8.0.46 |
|  | 8.4 | 1 | eliminada `SHOW SLAVE STATUS …`<br>eliminada `SHOW MASTER STATUS …` | 8.4; 8.4 (2032-04-30) | 8.4.11 |
|  | 9 | 1 | — | 9.0–9.7; 9.7 (2034-04-30); 7 de corta duración | 9.7.2 |
| MariaDB | 10.3 | 1 | `checkConstraints` desde 10.2.1<br>`sequences` desde 10.3 | 10.3–10.5; 10.4 (2024-06-18); 10.5 (2025-06-24); 1 de corta duración | — |
|  | 10.6 | 1 | — | 10.6–11.6; 10.6 (2026-07-06); 10.11 (2028-02-16); 11.4 (2029-05-29); 10 de corta duración | 10.6.28 |
|  | 11.7 | 1 | — | 11.7–13.0; 11.8 (2028-06-04); 12.3 (2029-06-12); 5 de corta duración | 11.8.9 |
| PostgreSQL | 10 | 1 | `catalogV10` desde 10 | 10; 10 (2022-11-10) | — |
|  | 11 | 1 | `procedures` desde 11<br>`indexIncludeColumns` desde 11 | 11; 11 (2023-11-09) | — |
|  | 12 | 1 | eliminada `… WITH OIDS` | 12–13; 12 (2024-11-21); 13 (2025-11-13) | 13.23 |
|  | 14 | 1 | eliminada `… !` | 14; 14 (2026-11-12) | 14.24 |
|  | 15 | 1 | — | 15; 15 (2027-11-11) | 15.19 |
|  | 16 | 1 | — | 16; 16 (2028-11-09) | 16.15 |
|  | 17 | 1 | — | 17; 17 (2029-11-08) | 17.11 |
|  | 18 | 1 | — | 18; 18 (2030-11-14) | 18.6 |
<!-- /generated: lines -->

Por qué existe cada línea, en palabras. `tools/inventory/status.mjs` comprueba que esta tabla tenga exactamente las líneas de `support/`:

<!-- checked: line-reasons -->
| Motor | Línea | Diferencias con la línea anterior |
|---|---|---|
| MySQL | 5.7 | Base: sin CTE ni funciones de ventana, `CHECK` se lee y se ignora |
| | 8.0 | CTE, funciones de ventana y `LATERAL`. `rank` pasa a ser reservada. Se eliminan `GROUP BY … DESC`, `PASSWORD()`, `ENCODE()` y `SQL_CACHE`. `CHECK` real desde 8.0.16 |
| | 8.4 | Se eliminan `SHOW SLAVE STATUS` y `SHOW MASTER STATUS`. `mysql_native_password` no se carga por defecto |
| | 9 | Tipo `VECTOR` y funciones vectoriales (Rowly DB aún no lee columnas `VECTOR`: hueco P2, §9) |
| MariaDB | 10.3 | Base: secuencias, `INTERSECT`/`EXCEPT`, tablas versionadas, modo Oracle |
| | 10.6 | `JSON_TABLE`, `OFFSET … FETCH`, `SKIP LOCKED` |
| | 11.7 | Tipo `VECTOR`. `DEFAULT` en parámetros de procedures desde 11.8. Pistas del optimizador `/*+ … */` desde 12.0 |
| PostgreSQL | 10 | Base: columnas identity, particionado declarativo, funciones `xlog` → `wal` |
| | 11 | Procedures y `CALL` |
| | 12 | Columnas generadas, se elimina `WITH OIDS`. La 13 no cambia nada de lo que usa Rowly DB |
| | 14 | Parámetros OUT en procedures, cuerpos SQL estándar (`BEGIN ATOMIC`, `RETURN`), se eliminan los operadores postfijos |
| | 15 | `MERGE`, sin `CREATE` por defecto en el schema `public` |
| | 16 | Constructores SQL/JSON, `IS JSON` |
| | 17 | `JSON_TABLE`, `MERGE … RETURNING` |
| | 18 | Columnas generadas virtuales, `OLD`/`NEW` en `RETURNING` |
<!-- /checked: line-reasons -->

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

Cada fila es una propiedad que el motor debe tener **en cada línea soportada y en cada versión exacta anunciada como verificada** donde aplique. Una fila sin test es un hueco, no un acierto. Qué tests demuestran cada fila hoy, para qué motores, y qué falta todavía, se genera desde `tests/sql/coverage.json` en §14.2; `tools/inventory/coverage.mjs` falla si una fila no tiene respuesta para un motor o si un test contra servidor real no demuestra ninguna fila.

### 6.1 Seguridad

| # | Propiedad |
|---|---|
| S1 | Un `;` dentro de un texto, comentario, identificador o dollar quote del motor no corta |
| S2 | Un texto que el guard acepta corre como una sola sentencia en el servidor real, medido **sin** la barrera de preparación del driver (§8). Lo mismo vale para el texto que la app envía de verdad cuando reescribe esa sentencia para ordenarla, paginarla o contarla: la reescritura tiene que leerse de vuelta con las mismas cadenas y volver a pasar el guard, o corre el texto original |
| S3 | Todo lo que daña datos pide confirmación |
| S4 | Los comentarios ejecutables y con versión se clasifican como código |
| S5 | Las reglas de los textos siguen el modo del servidor (`NO_BACKSLASH_ESCAPES`) |
| S6 | La sintaxis que el parser no lee se juzga por su estructura, nunca se deja pasar sin más |
| S7 | En producción cada escritura requiere confirmación explícita; el backend vuelve a clasificar antes de ejecutar y teclas repetidas o modificadas no la suplen |

### 6.2 Análisis y diagnósticos

| # | Propiedad |
|---|---|
| A1 | No se marca nada que un servidor real acepte: el corpus, todas las definiciones de Sakila y Pagila, las consolas mezcladas |
| A2 | Los errores reales se marcan donde están |
| A3 | **Ningún prefijo del SQL del corpus entra en pánico**, escrito letra a letra |
| A4 | Mientras se escribe, solo se ven errores reales: no lo que está sin terminar, ni la última palabra, ni un nombre que aún puede definirse |
| A5 | Los cuerpos de las rutinas se revisan por dentro |
| A6 | Los nombres se comprueban contra el catálogo con las reglas de mayúsculas del motor |
| A7 | Los errores del servidor se ubican donde ocurren, a partir de mensajes reales del servidor |
| A8 | Las posiciones son correctas con texto multibyte |
| A9 | La sintaxis que una línea eliminó se marca en esa línea, con su reemplazo, y no en las anteriores |

### 6.3 SQL generado y autocompletado

| # | Propiedad |
|---|---|
| G1 | Los identificadores y literales que escribe la app se vuelven a leer con el mismo valor, también con una comilla dentro |
| G2 | Cada `CALL` que escribe el autocompletado real corre en el servidor con los argumentos correctos (IN, OUT, INOUT, DEFAULT, VARIADIC, sin nombre, nombres entre comillas) |
| G3 | Sin una lista de parámetros fiable, la app escribe los paréntesis con el cursor dentro en vez de inventar argumentos |
| G4 | Insertar una sugerencia cuenta como escritura para los diagnósticos |
| G5 | Autocompletado de punta a punta con el dialecto del motor: FROM, JOIN, alias, ON |
| G6 | Los alias automáticos y los nombres generados llevan comillas cuando son reservados en **cualquier** línea del motor |
| G7 | El resto del SQL generado corre en el servidor: el INSERT/UPDATE de la edición de resultados, las exportaciones, los filtros |

### 6.4 Drivers e introspección

| # | Propiedad |
|---|---|
| D1 | Los conjuntos de resultados, los NULL, los tipos, el truncado y los comandos DDL se comportan bien |
| D2 | `CALL` y `SHOW CREATE` devuelven sus filas |
| D3 | La introspección clasifica cada tipo de objeto |
| D4 | El **contenido** introspectado coincide con el servidor: columnas, tipos, claves, parámetros de rutinas y sus modos |
| D5 | Los modos TLS negocian o fallan con un mensaje accionable |
| D6 | La versión del servidor se lee y se asigna a su línea, incluidas formas como `5.5.5-10.11.6-MariaDB` |
| D7 | Cada línea de §5.3 se distingue de la anterior, en sus dos extremos |
| D8 | El driver lee cada tipo de columna que puede devolver una línea soportada |
| D9 | Motor, versión exacta, modo SQL, línea y revisión son coherentes entre backend y frontend, y el frontend nunca deduce la línea de la versión ni de la etiqueta; reconectar o cambiar modo invalida cachés y nunca aplica reglas de otro motor |
| D10 | Un paquete de soporte solo cambia datos de línea: se instala firmado, íntegro, con formato conocido y compatible, de forma atómica y reversible a la incluida; sin red valen las incluidas; no relaja el guard ni declara verificación (§11) |

### 6.5 Capacidades (estado actual)

Lo que tiene cada motor. N/A es correcto donde el motor de verdad no tiene la característica; no es un fallo. Lo que el motor dice soportar tiene que funcionar. Una versión en una celda indica desde dónde existe la capacidad; ¹ marca una capacidad del catálogo cuya primera versión es un dato de línea (`support/<motor>.json`), que se muestra en §5.3 y nunca se repite aquí.

| Capacidad | MySQL | MariaDB | PostgreSQL |
|---|---|---|---|
| Schemas | como bases de datos | como bases de datos | sí |
| Vistas / vistas materializadas | sí / N/A | sí / N/A | sí / sí |
| Procedures | sí | sí | sí¹ |
| Funciones | sí | sí | sí |
| Argumentos OUT/INOUT en `CALL` | sí, como variables | sí, como variables | INOUT 11+, OUT 14+ |
| Parámetros con DEFAULT | N/A | 11.8+ | sí |
| Parámetros VARIADIC | N/A | N/A | sí |
| Triggers / eventos | sí / sí | sí / sí | sí / N/A |
| Secuencias | N/A | sí¹ | sí |
| Restricciones `CHECK` en el catálogo | sí¹ | sí¹ | sí |
| Barra invertida como escape en textos | sí (salvo con `NO_BACKSLASH_ESCAPES`) | sí (igual) | solo en `E'…'` |
| Comentarios `#` / dollar quotes / `DELIMITER` | sí / no / lo resuelve el cliente | sí / no / lo resuelve el cliente | no / sí / no |

Dónde se declara hoy: las reglas léxicas y de llamada, en cada `SqlProfile` (`app/src/lib/engines/*.ts`); las reglas del lenguaje, en el `EngineDefinition` de cada motor (`crates/engine/src/dialects/`, registrado en `Dialect::definition`); desde qué versión existe cada capacidad del catálogo, una sola vez, en los datos de línea (`support/<motor>.json`, §5.4). Cómo la lee cada motor sigue en el `version.rs` de su driver (`Capabilities`), que pregunta a esos datos; un test impide volver a comparar versiones ahí (`crates/engine/tests/lines.rs` `no_known_consumer_declares_versioned_behavior_by_itself_again`).

## 7. Compuertas

| Compuerta | Cuándo | Qué corre | Automática |
|---|---|---|---|
| **PR** | Cada pull request | `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `npm run check`, `npm test`, `npm run build`, comprobación del inventario de tests y los recorridos E2E en la app real (Linux, WebKitGTK) | Sí: `.github/workflows/quality.yml` y `e2e.yml` |
| **PR de motor** | Cambia divisor, analizador, guard, introspección, autocompletado, driver o ejecución | PR, más matriz real completa de §6 en **cada versión exacta verificada afectada**, con fuzz de 4000 casos por versión; un cambio común afecta a todos los motores | Sí: `.github/workflows/sql-engine.yml` corre la matriz en cada versión exacta verificada, D7/D8 en cada probe, y falla si una versión no tiene la evidencia completa. |
| **Versión exacta o paquete** | Antes de anunciar una versión verificada o publicar su paquete de línea (§11) | Matriz completa en esa versión y en las demás versiones verificadas de la línea afectada; D7 frente a línea anterior si cambia el comportamiento | No |
| **Release** | Antes de publicar Rowly DB | Matriz completa de todas las versiones exactas verificadas, fuzz de al menos tres semillas, tests de driver, revisión de la versión más nueva de cada motor, ventana de soporte (§5.2) y humo manual de interfaz | En parte: `release.yml` corre Quality, E2E, la matriz y D7/D8 sobre el commit del tag y no publica sin la evidencia de ese commit; publica `verification.json` (commit, versiones, resultados) con los instaladores. Lo demás, a mano |

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

En CI, cada versión exacta verificada corre en su propio job contra su imagen fijada; el harness se detiene si el servidor no es la versión declarada o si su `sql_mode` global quedó en otro modo. Cada job deja en su evidencia el commit que probó (`origin.json`). El último job (`tools/test-dbs/evidence.mjs`) exige, para cada versión de `verified` y cada línea (D7/D8), evidencia de ese mismo commit, el servidor declarado y todas las pruebas reales en verde, ninguna ignorada, y enumera los N/A. Evidencia de otro commit no cuenta. Una versión sin esa evidencia no se anuncia como verificada.

Las pruebas contra servidor real comparten la tabla `rowly_test.victim`. Se corren con `--test-threads=1` y nunca dos corridas a la vez contra el mismo servidor.

Cada PR que toca un motor dice en su descripción qué compuertas corrieron, en qué líneas y versiones exactas del servidor, y la semilla y el número de casos del fuzz.

## 8. Decisiones deliberadas

Donde Rowly DB se aparta del servidor a propósito. Cambiar una de estas es una decisión de producto, no el arreglo de un bug.

### 8.1 Para todos los motores

| Decisión | Por qué |
|---|---|
| El driver prepara cada sentencia antes de ejecutarla, y eso ya rechaza varias sentencias por la ruta normal. Aun así, el guard tiene que pararlas por sí solo, y se mide sin esa barrera (protocolo de texto). | Defensa en profundidad: el guard no debe depender de un detalle del driver que podría cambiar. |
| `REPLACE` y `MERGE` se tratan como upserts y no piden confirmación, incluido `MERGE … WHEN MATCHED THEN DELETE`. | Solo tocan las filas que casan con su clave o su condición `ON`, como un `DELETE` o un `UPDATE` con `WHERE`, que tampoco piden. Lo que pide confirmación es una sentencia sin ninguna condición. |
| Crear una rutina cuyo cuerpo tiene SQL destructivo no pide confirmación, y tampoco un `CREATE OR REPLACE` sobre una que ya existe. | Definir código no es ejecutarlo: llamarlo es otra sentencia. Reemplazar el código de una rutina no pierde datos. |
| Mientras se escribe una sentencia, el editor oculta lo que solo está sin terminar, la última palabra escrita, los nombres que aún no se encuentran y, si se escribe al final, los mensajes genéricos del parser. Aparecen cuando el cursor sale de la sentencia o el editor pierde el foco. | El parser rechaza cada prefijo. Mostrarlo es ruido, y sus mensajes genéricos a menudo señalan el token equivocado. |
| La sintaxis válida que `sqlparser` no lee (en MariaDB, `NEXT VALUE FOR`, `FOR SYSTEM_TIME`…) no recibe diagnóstico de sintaxis (`Dialect::unparsed_syntax`). | Que al parser le falte algo no es un error del usuario. |
| La consola corre en una sola conexión por ventana (`ConsoleConnection` en `driver-core`): ejecutar, contar y exportar la usan en orden, así que lo que una sentencia deja en la sesión (`SET`, variables, tablas temporales, `USE`, `BEGIN`) vale para la siguiente. El catálogo, la introspección y cancelar usan el pool. | Cada sentencia tomaba una conexión cualquiera del pool: un `SET` o un `BEGIN` quedaba en una conexión y la sentencia siguiente podía correr en otra. |
| La edición de resultados aplica sus cambios en el pool, en una transacción propia, y escribe sus literales con el modo de las conexiones del pool (leído al conectar), no con el de la consola. | Aplicarlos en la consola correría el `BEGIN`/`COMMIT` de sqlx dentro de una transacción que el usuario puede tener abierta, y no se sabe si hay una (§9). |
| Si la conexión de la consola se pierde, o un resultado que no se puede paginar deja más de 1000 filas pendientes, la conexión se cierra y la sentencia siguiente abre otra. La app lo avisa; nada se reintenta. | Leer todas las filas pendientes para conservar la sesión podría tardar sin límite. Una sentencia que falló con la conexión perdida puede haberse ejecutado o no. |
| Un servidor más viejo que la ventana de soporte conecta igual, y su línea nunca se quita. | Rowly DB nunca rechaza un servidor. Lo marca como sin soporte oficial y hace lo que permita su línea. |

### 8.2 Para un motor (estado actual)

| Motor | Decisión | Por qué |
|---|---|---|
| PostgreSQL | Los bloques `DO` que mencionan `DELETE`, `UPDATE`, `TRUNCATE`, `DROP` o `EXECUTE` se rechazan. | Su efecto no se puede clasificar de forma estática. |
| PostgreSQL | Los cuerpos de las rutinas no se analizan. | Son textos en un lenguaje que el analizador no lee. Queda como hueco (§9). |

## 9. Huecos conocidos (estado actual)

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

## 12. Agregar un motor, una línea o una versión

Cómo hacerlo, paso a paso, está en [ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md). Este contrato solo fija lo que cada uno tiene que demostrar:

### 12.1 Motor nuevo

Cada fila aplicable de §6 en cada versión exacta que vaya a anunciar (§7), con P0 = 0 y P1 = 0, antes de ser Integrable (§4). No comparte nada con otro motor (parser, driver, reglas del guard, comillas) sin los tests que lo demuestren ([ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md#1-identidad-motor-dialecto-driver)).

Un motor sin proceso servidor (SQLite) tiene el mismo listón: en estas compuertas, «servidor real» significa la biblioteca que enlaza el driver, con su versión y su dataset fijados. Tener menos objetos no rebaja el listón del divisor, el guard, la escritura, las comillas ni la seguridad. Cómo se conecta Rowly DB a un motor así y cómo lo fija todavía no está decidido ([ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md#motores-embebidos)).

### 12.2 Línea nueva de un motor existente

Un fixture que la distinga de la línea anterior (§5.1), sus datos en `support/<motor>.json` con evidencia para cada dato (§5.4), y D7 más la matriz aplicable en cada versión que se vaya a anunciar como verificada ([ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md#una-línea-nueva-de-un-motor-existente)).

### 12.3 Versión exacta nueva dentro de una línea

Su imagen fijada por digest y su versión informada comprobada, cada fila aplicable de §6 y la evidencia de §10; sin eso no se anuncia como verificada ([ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md#una-versión-exacta-nueva)).

## 13. Trabajar en un motor (personas e IA)

No pidas «el mayor número de simulaciones posible»: eso da una cobertura desigual. Pide:

> Aplica SQL_ENGINE.es.md a `<motor>` `<línea>` `<versión exacta>`: corre la compuerta `<PR | PR de motor | versión exacta | release>`, informa cada P0/P1 con una reproducción SQL mínima, convierte cada bug nuevo en un test permanente y actualiza §5, §6, §9 y §10.

Las pruebas exploratorias son bienvenidas, y aquí encontraron bugs reales: un pánico con un `DECLARE` a medio escribir y las comillas de los argumentos de un `CALL` generado. Pero lo que encuentran se convierte en fixture. Nunca reemplazan la matriz.

## 14. Estado actual

### 14.1 Nivel de soporte de cada motor

MySQL, MariaDB y PostgreSQL son **Integrables** (§4): P0 = 0 y P1 = 0, y cada fila aplicable de §6 pasa en cada versión exacta verificada, con la suite contra servidor real en el CI (`sql-engine.yml`, §7), o su hueco está en §9 como P2 o menos. Para Estable falta historial: publicarse en varias versiones sin regresiones P0/P1, y la compuerta de versión exacta y la parte manual de la de release (§7) todavía se corren a mano.

### 14.2 Cobertura de cada fila

Generada desde `tests/sql/coverage.json`. *Cubierta*: cada motor al que aplica tiene un test. *Parcial*: falta algo, dicho en §9 (los motores listados tienen el hueco). *Hueco*: todavía no la demuestra ningún test.

<!-- generated: coverage (tools/inventory/status.mjs) -->
| Fila | Estado | Hueco en | Lo prueba |
|---|---|---|---|
| S1 | cubierta | — | unit: `un ; dentro de sus comillas o comentarios no corta` (contract.test.ts)<br>unit: `splitStatements` (sqlStatements.test.ts) |
| S2 | cubierta | — | real: `no_text_the_guard_accepts_runs_more_than_one_statement_on_the_server` (safety.rs)<br>real: `fuzzing_the_guard_against_the_real_servers_finds_no_second_statement` (safety.rs)<br>real: `what_the_app_rewrites_runs_as_one_statement_and_reads_the_same` (safety.rs)<br>unit: `lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas` (pagination.rs) |
| S3 | cubierta | — | real: `what_damages_data_never_passes_as_not_destructive` (safety.rs)<br>unit: `delete_without_where_requires_confirmation` (execution_guard.rs)<br>e2e: `DELETE sin WHERE: Escape cancela sin tocar datos y Enter confirma` (run.mjs) |
| S4 | cubierta | — | unit: `executable_comments_are_classified_as_code` (execution_guard.rs)<br>unit: `a_versioned_comment_is_read_both_ways_and_the_stricter_wins` (execution_guard.rs) |
| S5 | cubierta | — | real: `the_guard_reads_strings_like_a_server_in_no_backslash_escapes_mode` (safety.rs) |
| S6 | cubierta | — | unit: `valid_statements_sqlparser_cannot_read_are_judged_by_their_structure` (execution_guard.rs)<br>unit: `destructive_statements_sqlparser_cannot_read_still_ask_for_confirmation` (execution_guard.rs) |
| S7 | parcial | — | unit: `in_production_every_write_needs_confirmation` (query.rs)<br>unit: `production_writes_require_confirmation` (execution_guard.rs)<br>unit: `Enter confirma un modal de confirmacion` (dialogKeys.test.ts)<br>e2e: `produccion: una escritura pide confirmacion en la app real` (run.mjs) |
| A1 | cubierta | — | real: `the_analyzer_marks_nothing_in_sql_the_real_servers_accept` (analysis.rs)<br>real: `common_valid_ddl_and_dml_is_never_objected_to` (analysis.rs)<br>real: `the_mixed_console_corpus_runs_through_guard_and_server` (analysis.rs)<br>unit: `corpus` (corpus.rs)<br>real: `the_definitions_the_server_returns_for_sakila_and_pagila_are_accepted` (analysis.rs)<br>real: `the_routines_corpus_is_accepted_by_the_guard_and_created_by_every_server` (analysis.rs) |
| A2 | cubierta | — | unit: `la_sintaxis_en_cada_motor` (diagnostics.rs)<br>unit: `el_catalogo_en_cada_motor` (diagnostics.rs)<br>unit: `errores_ordinarios_siguen_detectandose` (corpus.rs) |
| A3 | cubierta | — | real: `typing_real_sql_shows_nothing_that_is_only_unfinished` (analysis.rs)<br>unit: `no_prefix_of_a_routine_panics` (diagnostics.rs) |
| A4 | cubierta | — | real: `typing_real_sql_shows_nothing_that_is_only_unfinished` (analysis.rs)<br>unit: `errores en el editor` (diagnostics.dom.test.ts) |
| A5 | parcial | postgres | unit: `valid_routine_structures_are_not_objected_to` (diagnostics.rs)<br>unit: `a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is` (diagnostics.rs) |
| A6 | cubierta | — | unit: `postgres_distingue_mayusculas_como_el_servidor` (diagnostics.rs)<br>unit: `mysql_no_distingue_mayusculas` (diagnostics.rs) |
| A7 | cubierta | — | unit: `FIXTURES` (contract.test.ts)<br>unit: `ubicar un error de ejecucion` (diagnostics.test.ts) |
| A8 | parcial | — | unit: `select_into_keeps_positions_with_multibyte_characters` (diagnostics.rs) |
| A9 | parcial | — | unit: `removed_syntax_is_marked_from_its_line_on_and_never_before` (lines.rs)<br>lines: `every_version_line_is_told_apart_from_the_previous_one` (version_lines.rs) |
| G1 | cubierta | — | unit: `mod contract` (lib.rs)<br>unit: `perfil` (contract.test.ts) |
| G2 | cubierta | — | real: `completion_calls_run_on_the_real_servers` (generated.rs)<br>real: `CALL escrito por el autocompletado` (catalogCompletions.server.test.ts) |
| G3 | cubierta | — | unit: `catalogo SQL` (catalogCompletions.test.ts) |
| G4 | cubierta | — | unit: `input.complete` (catalogCompletions.test.ts) |
| G5 | cubierta | — | unit: `motor` (contract.test.ts)<br>unit: `catalogo SQL` (catalogCompletions.test.ts) |
| G6 | cubierta | — | unit: `cada motor cita las palabras que reserva cualquiera de sus lineas` (contract.test.ts)<br>unit: `every_reserved_word_of_a_line_is_one_its_fixtures_prove` (lines.rs) |
| G7 | parcial | postgres | unit: `fn ` (editing.rs)<br>unit: `fn ` (export.rs)<br>real: `grid_literals_follow_the_session_mode` (contract.rs) |
| D1 | cubierta | — | real: `connects_and_lists_schemas_and_tables` (contract.rs)<br>real: `a_result_set_keeps_values_and_nulls` (contract.rs)<br>real: `truncating_leaves_the_next_queries_complete` (contract.rs)<br>real: `ddl_returns_a_command` (contract.rs)<br>real: `a_server_error_keeps_its_code_and_position` (contract.rs)<br>real: `the_session_keeps_the_server_defaults` (contract.rs) |
| D2 | cubierta | — | real: `call_and_show_create_return_their_rows` (analysis.rs) |
| D3 | cubierta | — | real: `introspection_classifies_every_object_kind` (contract.rs) |
| D4 | hueco | — | real: `completion_calls_run_on_the_real_servers` (generated.rs) |
| D5 | parcial | — | real: `tls_auto_always_connects_and_reports_what_it_negotiated` (contract.rs)<br>real: `tls_required_encrypts_or_fails_with_an_actionable_message` (contract.rs)<br>real: `tls_disabled_connects_unencrypted` (contract.rs)<br>real: `tls_verify_ca_rejects_self_signed_certificates` (contract.rs)<br>real: `tls_verification_uses_the_configured_ca` (contract.rs)<br>unit: `tls_errors_get_their_own_cause` (tls.rs) |
| D6 | cubierta | — | unit: `#[test]` (version.rs)<br>unit: `#[test]` (version.rs)<br>unit: `every_test_server_and_every_verified_version_selects_the_line_it_proves` (lines.rs)<br>lines: `every_version_line_is_told_apart_from_the_previous_one` (version_lines.rs) |
| D7 | cubierta | — | lines: `every_version_line_is_told_apart_from_the_previous_one` (version_lines.rs) |
| D8 | parcial | mysql | lines: `every_column_type_a_line_returns_is_read` (version_lines.rs) |
| D9 | cubierta | — | unit: `the_context_keeps_its_shape` (engine_context.rs)<br>unit: `the_line_is_the_closest_one_below_and_the_floor_below_the_first` (engine_context.rs)<br>unit: `only_the_exact_versions_of_lines_json_are_verified` (engine_context.rs)<br>unit: `a_request_from_another_generation_or_epoch_is_no_longer_current` (engine_context.rs)<br>unit: `the_analysis_uses_the_line_only_when_it_is_of_the_profiles_engine` (engine_context.rs)<br>unit: `p_the_frontend_sees_the_revision_the_analysis_uses` (support.rs)<br>unit: `cada_motor_del_frontend_llega_como_el_suyo` (drivers.rs)<br>unit: `an answer asked for with the previous connection is not applied after reconnecting` (analysisSession.test.ts)<br>unit: `the active engine is the one the backend reports, with its session mode` (connectionCatalog.test.ts)<br>unit: `descarta los resultados si cambia la conexion durante el refresh` (connectionCatalog.test.ts)<br>e2e: `reconexiones alternando MySQL y PostgreSQL: cada una con su servidor y su catalogo, sin crecer en memoria` (resources.mjs)<br>unit: `a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset` (state.rs)<br>unit: `only_statements_that_can_change_the_mode_read_it_again` (state.rs)<br>unit: `the_same_connection_serves_every_statement_until_it_is_discarded` (console.rs)<br>unit: `a SET sql_mode in the console moves the editor to the new session mode, never back` (connectionCatalog.test.ts)<br>real: `the_console_keeps_its_session_between_statements` (contract.rs)<br>unit: `opening_the_first_connection_loses_no_session_and_closing_one_does` (console.rs)<br>real: `the_first_statement_after_connecting_loses_no_session` (contract.rs) |
| D10 | cubierta | — | unit: `h_an_interrupted_or_failed_install_keeps_the_previous_package` (support.rs)<br>unit: `a_package_is_a_line_validated_like_the_included_ones` (lines.rs)<br>unit: `una reservada que trae un paquete de soporte se cita en esa conexion` (contract.test.ts) |
<!-- /generated: coverage -->
