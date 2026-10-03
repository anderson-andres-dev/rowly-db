# Contrato de motores y líneas de versión — organización del núcleo

## Estado y fuentes de verdad

**Propuesta de integración, sin implementación** (2026-10-02). La matriz de
comportamiento, las líneas admitidas y las compuertas siguen siendo las de
[SQL_ENGINE.es.md](../../SQL_ENGINE.es.md). Esta spec reúne el contrato del
contexto por conexión y el diseño futuro de paquetes de soporte por línea.
Hoy la tabla de líneas se mantiene en `SQL_ENGINE`; cuando existan paquetes,
se generará desde su fuente versionada. El contrato de calidad de
`SQL_ENGINE` permanece como autoridad en ambos casos.

**Vida del documento:** guía temporal de implementación. Una fase no se cierra
hasta actualizar `SQL_ENGINE.md`/`SQL_ENGINE.es.md`, arquitectura y guía de
contribución con el comportamiento que realmente quedó. Tras M5 se elimina
esta spec; los contratos permanentes no dependen de ella.

## 1. Cuatro identidades distintas

| Identidad | Ejemplo | Autoridad actual | Para qué sirve |
|---|---|---|---|
| Motor que eligió el usuario | `mysql`, `mariadb`, `postgres` | `ConnectionDriver` → `DatabaseKind` → `Dialect` y `EngineProfile` | Léxico, SQL generado, diagnósticos y reglas del guard. MariaDB comparte protocolo con MySQL, pero tiene dialecto propio. |
| Driver de protocolo | `MySqlConnector` para MySQL y MariaDB | `app/src-tauri/src/drivers.rs` | TLS, conexión, ejecución e introspección. Nunca determina por sí solo el dialecto. |
| Versión exacta del servidor | `8.4.11`, `11.8.9`, `18.6` | La respuesta del servidor, parseada por el driver | Selección de capacidades y de la línea efectiva; se muestra al usuario. |
| Línea de comportamiento | MySQL `8.4`, MariaDB `11.7+`, PostgreSQL `18` | Hoy: reglas en `version.rs` y perfiles; futuro: paquete por línea verificado | Cambios de sintaxis/capacidades que la app sabe demostrar. No equivale a un parche ni al estado de soporte del fabricante. |

La **versión exacta del servidor**, por ejemplo `8.4.11`, solo se considera
verificada cuando pasa la matriz aplicable de `SQL_ENGINE`. Varias
versiones exactas pueden compartir línea y paquete, pero cada una conserva su
propio resultado de prueba. «Soportada por el fabricante» y «verificada por
Rowly DB» son etiquetas independientes. Una versión no probada puede conectar
con la línea compatible de abajo y debe mostrarse como **no verificada**; no
hereda la certificación de otro parche.

El estado **soportada / en gracia / sin soporte** es otro dato: describe el
ciclo de vida del fabricante, no si una sentencia es segura. Actualmente lo
calcula el backend al conectar (`app/src-tauri/src/engine_context.rs`, con
`tools/support/vendor-support.json`) y llega en el contexto de §2; no debe
activar ni desactivar capacidades SQL. Una extensión de la tienda tampoco
puede declarar un motor o una línea de soporte.

## 2. Contexto efectivo por conexión

Al conectar, el backend debe construir una instantánea inmutable, con tipos
compartidos con el frontend:

```text
ConnectionEngineContext
  connectionId / generation
  engineId                     mysql | mariadb | postgres
  serverVersion                valor exacto y parseado por su driver
  sessionMode                  p. ej. NO_BACKSLASH_ESCAPES, si aplica
  lineId / lineRevision        paquete efectivo o "sin línea exacta"
  capabilities                valores derivados de esa línea y del modo
  schemaEpoch                  aumenta al cambiar el catálogo visible
  supportStatus               metadato para mostrar, nunca para ejecutar
  verificationStatus          verificada | no verificada; solo UI y reporte
```

- El backend produce `engineId`, versión y modo **una vez por conexión**. El
  frontend recibe el contexto de solo lectura; no deduce el motor de una
  cadena de presentación como `"MariaDB 11.8.9"`. Se conserva el formato
  legible solo para mostrarlo.
- `supportStatus` indica el estado del fabricante; `verificationStatus`
  indica si esa versión exacta tiene la matriz `SQL_ENGINE` completa. Ninguno
  cambia por sí solo la seguridad o las capacidades del guard.
- Parser, divisor, guard, análisis, introspección, autocompletado y SQL
  generado reciben el mismo contexto o una vista tipada de él. El guard del
  backend sigue siendo la autoridad antes de ejecutar, incluso cuando el
  editor mostró una vista previa.
- Si cambia el modo de sesión o la conexión, se crea una generación nueva y
  se invalidan cachés dependientes. Un DDL o refresco de schema aumenta
  `schemaEpoch`; no obliga a reconstruir el perfil estático del motor.
- La caché de análisis se identifica por conexión/generación, motor, línea y
  revisión, modo SQL, `schemaEpoch` y texto de sentencia. Tiene límite de
  memoria y se vacía al cerrar la conexión; no hay resultados de una línea
  aplicados a otra. La clave y el límite se miden antes de elegir la política
  exacta de expulsión.

**Flujo:** selección de motor → driver conecta y lee versión/modo → resolver
línea efectiva → construir contexto → introspección y editor → toda ejecución
vuelve al guard del host. El contexto no hace una petición de red a la tienda
ni al índice de paquetes durante una conexión.

## 3. Dónde vive cada regla

| Regla | Dueño propuesto | Razón |
|---|---|---|
| Protocolo, TLS, tipos de columnas, consultas de catálogo | Driver compilado para el motor | Necesita código probado y acceso controlado a la base. |
| Léxico base, parser, generador de SQL y guard | Núcleo de Rust + `SqlProfile` del motor | Cambiar su mecanismo exige publicar y probar una app nueva. Ningún paquete lo reemplaza. |
| Capacidades, palabras reservadas y diferencias demostradas de una línea | Paquete **de datos** por línea, incluido o descargado según §5 | Puede actualizar conocimiento dentro de mecanismos que la app ya sabe ejecutar. |
| Fechas de fin de soporte del fabricante | Datos verificables por versión del fabricante | Solo UI y calendario de pruebas; no cambia el guard. |
| Colores, atajos, comentarios decorativos | Preferencias de UI o futura extensión | No alteran interpretación ni seguridad del SQL. |

El `Record<ConnectionDriver, EngineProfile>` de TypeScript y los `match`
exhaustivos de Rust siguen siendo la compuerta para **agregar motores**. Se
agrega un test de contrato que compara los identificadores serializados de
ambos lados. No se introduce generación de código entre lenguajes mientras
esa compuerta sea suficiente. MariaDB mantiene su identidad de motor aunque
use `MySqlConnector`.

### Árbol destino: motor separado de versión

```text
crates/engine/src/
  core/                         divisor, análisis, guard y SQL generado comunes
  dialects/<motor>/             léxico y decisiones exclusivas del motor
crates/drivers/<protocolo>/src/ conexión, tipos, TLS e introspección
app/src/lib/engines/<motor>.ts  perfil del editor y formato del motor
support/<motor>/<línea>.json    diferencias de comportamiento, sin código
tools/test-dbs/lines.json      servidores exactos y probes de cada línea
tests/sql/<motor>/             corpus de motor, línea y release exacta
```

El árbol es **destino**, no descripción de carpetas ya existentes. `core`
solo conoce interfaces y un contexto tipado; no compara nombres ni importa
un driver concreto. El registro exhaustivo de motores conecta driver,
dialecto, perfil de frontend y pruebas. Dos motores pueden compartir protocolo
sin compartir reglas SQL. Los datos de línea se aplican sobre un motor ya
registrado; un paquete no crea un dialecto nuevo. Cada capa tiene una razón
para cambiar y un dueño de tests.

El contrato compilado `EngineDefinition` reúne las decisiones **del motor**:
ID estable, léxico, política de parser, citas de identificadores, SQL generado
y reglas adicionales del guard. El host registra aparte el driver de protocolo
y el adaptador de catálogo bajo ese mismo ID, sin introducir dependencias de
drivers en `crates/engine`. El núcleo conserva el guard final; un hook de
motor solo puede endurecerlo. El `match` exhaustivo queda en el registro y
en los puntos donde realmente cambia el mecanismo, no repetido por cada
componente. TypeScript mantiene un perfil tipado del mismo ID y un test
comprueba la paridad con Rust. La línea aporta valores a ese contrato, nunca
implementaciones de métodos. Si un motor exige un mecanismo nuevo, se añade
con un test de contrato para todos los motores existentes antes de activarlo.

### Tres operaciones de mantenimiento distintas

| Operación | Archivos y decisiones que toca | Compuerta antes de anunciar soporte |
|---|---|---|
| Motor nuevo | Driver o adaptador de protocolo, `DatabaseKind`/`Dialect`, perfil del editor, registro exhaustivo, catálogo, corpus y filas aplicables de `SQL_ENGINE` | Matriz completa de motor en todas las versiones exactas declaradas; P0/P1 = 0. Exige release de app. |
| Línea nueva de un motor | Fixture que demuestra diferencia, rango y capacidades en `support/<motor>/<línea>.json`, probes de frontera | D7 en ambos extremos y matriz completa en todas las versiones exactas declaradas de esa línea; paquete solo si el mecanismo ya existe. |
| Parche o release exacta dentro de una línea | Imagen fijada y versión leída del servidor en `lines.json`, fixture `since` si cambió algo, evidencia de prueba | Matriz aplicable completa para esa versión exacta; conserva la línea si no hay diferencia demostrada. |

Para agregar un motor se usa una plantilla futura `tools/engine/new` que crea
el registro, fixtures y filas `N/A` **pendientes**, y falla en CI hasta
resolverlas. La plantilla reduce pasos mecánicos, no inventa capacidades.
`CONTRIBUTING` documenta el mismo recorrido; se prueba desde una copia limpia
con un motor de ejemplo para detectar pasos ocultos. Añadir una versión exacta
no debe requerir editar un `match` de cada operación del núcleo.

## 4. Resolver una línea y fallar de forma conservadora

1. Verificar `engineId` y parsear la versión con el parser del driver. Una
   versión ilegible se registra como desconocida, sin inventar capacidades.
2. Elegir paquete activo cuyo rango contiene la versión exacta. Si no hay,
   elegir la línea **más cercana por debajo** y mostrar la sustitución. Si
   tampoco hay una anterior, usar la
   más antigua instalada y avisar.
3. Aplicar cambios dentro de línea solo desde la versión `from` declarada.
   La revisión de paquete debe satisfacer `requiresApp`; de lo contrario se
   usa la incluida y se comunica el motivo.
4. El paquete puede añadir motivos para pedir confirmación y diagnósticos;
   nunca puede relajar una clasificación del guard, redefinir el parser,
   introducir código ejecutable ni declarar segura una sentencia.
5. Si el guard no puede clasificar con confianza una sintaxis nueva, pide
   confirmación o rechaza la ejecución según el contrato de
   `SQL_ENGINE` §6.1. Un fallo de paquete no deja una ruta sin guard.

Un cambio de paquete activo toma efecto al **reconectar**. Las conexiones
abiertas conservan su instantánea hasta cerrarse: así editor, guard y driver
no ven dos revisiones distintas a mitad de una operación.

## 5. Formato y distribución de paquetes por línea

**Futuro, aún sin implementar.** Una línea existe solo si un fixture demuestra
una diferencia con la anterior; nunca hay un paquete por parche. La fuente es
`support/<motor>/<línea>.json`. Los paquetes publicados antes de una release,
incluidos los de líneas sin soporte del fabricante, se compilan en el binario.
Las revisiones posteriores viven en `support/` del directorio de datos de la
app. Una revisión descargada prevalece sobre la incluida; al quitarla vuelve
la incluida. La incluida se puede desactivar, pero no borrar del binario.

Campos del formato JSON propuesto:

| Campo | Significado y límite |
|---|---|
| `format`, `engine`, `line`, `revision`, `requiresApp` | Identidad, versión de esquema y compatibilidad; un formato desconocido o una app demasiado antigua impiden activar. |
| `versions: { from, below }`, `why` | Rango de servidor y diferencia comprobada respecto de la línea anterior. Los límites son explícitos y no se solapan. |
| `support.releases` | Fechas y condición LTS del fabricante; solo alimenta la interfaz y el calendario de pruebas. |
| `capabilities`, `reservedWords`, `removedSyntax`, `unparsedSyntax` | Datos para mecanismos que ya están en la app; una capacidad surgida dentro de la línea declara su versión mínima `from`. El SQL generado usa la regla segura para todas las líneas del motor. |
| `destructiveKeywords`, `errorHelp` | Las palabras destructivas solo **añaden** motivos de confirmación; la ayuda por código de error no cambia la ejecución. |
| `tested` | Resumen de la evidencia de la línea y sus versiones exactas certificadas; incluye servidor, fecha, commit y compuerta. Cada versión tiene además un reporte reproducible de la matriz. |

El cargador rechaza campos desconocidos en un `format` conocido, tipos o rangos
inválidos, revisiones incompatibles y cualquier intento de reducir el guard.
Un paquete no puede traer protocolo, autenticación, consultas de catálogo,
parser ni tipos nuevos que la app no sepa representar: esos mecanismos exigen
una release de Rowly DB y un `requiresApp` acorde.

El sitio publica `support/index.json` con motor, línea, revisión, SHA-256 y
firma de cada artefacto. La app valida índice, firma, hash, tamaño, formato y
compatibilidad antes de instalar atómicamente. Los paquetes y el índice se
firman con la misma clave que las actualizaciones de la app; su clave pública
ya está incluida en el binario. La rotación o revocación requiere una release.
Consultar el índice no sucede al conectar; la pantalla **Motores** lo
consulta al abrirla o según preferencia, con caché y espera entre reintentos.
Sin red se muestran los paquetes instalados y la última comprobación.

La pantalla Motores muestra por línea origen, revisión, rango, versión exacta
probada, diferencias (`why`) y estado **soportada / en gracia / sin soporte /
nueva sin probar**, además de descargar, desactivar o quitar cuando corresponda.
La gracia dura 12 meses después del fin de soporte **solo para LTS**, según
`SQL_ENGINE` §5.2; el estado no desinstala paquetes ni cambia el guard. La
ficha de la conexión muestra versión exacta, línea y revisión efectivas, y
avisa si se usa una línea de reemplazo. Activar una revisión afecta únicamente
a conexiones nuevas. Nada se instala sin acción del usuario.

Para publicar una línea: añadir o actualizar el JSON y los fixtures
`accepts.sql`/`rejects.sql`, levantar cada versión exacta declarada en
`tools/test-dbs`, correr su matriz completa de `SQL_ENGINE` §7, registrar la
evidencia `tested`, aumentar `revision`, firmar el artefacto, actualizar el
índice y generar la tabla de líneas de `SQL_ENGINE` §5.3 desde la misma fuente.
Un futuro `publish.sh` automatiza
esa secuencia y `check-eol.sh` revisa fechas y líneas sin paquete. Esos
scripts se implementan en M4; no se presupone que existan hoy.

## 6. Pruebas que siguen a cada motor y línea

La matriz de [SQL_ENGINE](../../SQL_ENGINE.es.md) §6 es la lista de
propiedades, no una lista de tests sueltos. Cada fila aplicable tiene un ID
estable (S/A/G/D), prueba propietaria, fixture y compuerta. Un `N/A` exige
motivo verificable. `tests/sql/coverage.json` es el mapa legible por CI entre
esas filas y las pruebas; el reporte falla si falta una fila, aparece un test
huérfano o una versión declarada verificada no tiene evidencia completa.

**Unidad de certificación:** `(motor, línea, versión exacta, revisión del
paquete, plataforma relevante)`. `tools/test-dbs/lines.json` enumera las
versiones exactas que Rowly DB declara verificadas, sus imágenes fijadas por
digest y probes de frontera. La suite lee la versión real del servidor y
falla si no coincide con la declarada. Cada versión exacta declarada pasa
la matriz aplicable completa de `SQL_ENGINE`, no solo D7 ni una muestra de
parches. Las versiones no enumeradas pueden conectar de forma conservadora,
pero no reciben la etiqueta «verificada». Una línea conserva probes en sus
extremos y a ambos lados de cualquier cambio `since` para justificarla.

### Árbol de pruebas y fixtures

```text
tests/sql/
  coverage.json                    fila SQL_ENGINE → test, ámbito y compuerta
  common/                          SQL y ataques válidos para todos los motores
  <motor>/
    setup.sql                      datos mínimos y deterministas
    common/                        casos de todas las líneas de ese motor
    <línea>/
      accepts.sql / rejects.sql    diferencia frente a línea anterior
      reads.sql                    tipos e introspección de esa línea
      generated.sql / attacks.sql  casos propios de esa línea, si existen
crates/engine/src/**                unitarios puros junto al mecanismo
app/src/lib/engines/**              contratos del perfil frontend por motor
crates/server-tests/src/harness/    conexión efímera, seed, reset y reporte
crates/server-tests/tests/
  contract.rs                      identidad, línea, catálogo y capacidades
  safety.rs                        divisor, guard, destructividad y fuzz
  generated.rs                     SQL de la app ejecutado por servidor
  editing.rs                       diagnósticos, escritura y autocompletado
tools/test-dbs/lines.json          matriz de servidores exactos, una fuente
```

Los nombres de ejecutables pueden variar al implementarlos, pero la
propiedad y el dueño no. El corpus antiguo en `crates/server-tests/corpus/`,
`crates/engine/tests/corpus/` y las pruebas grandes de frontend se inventarían
por caso: cada entrada útil se convierte en fixture canónico; duplicados,
datos obsoletos y pruebas que copian el algoritmo se retiran después de que
su sustituto falle ante el bug que previene. Los unitarios pequeños siguen
junto al código. La prueba real usa exactamente los mismos fixtures para
observar el servidor, sin volver a implementar parser o guard dentro del test.

El harness prepara un esquema aislado por `(motor, versión, test)`, restaura
modo de sesión y limpia al terminar. Solo se permite SQL destructivo en esos
contenedores efímeros. Nunca se ejecuta una suite de seguridad contra una
conexión del usuario. El reporte JSON y humano incluye commit, motor, línea,
versión declarada y leída, revisión de paquete, fila de `SQL_ENGINE`, SQL
mínimo, semilla, resultado y tiempo. Se conserva como artefacto de CI; el
resumen `tested` del paquete apunta a esa evidencia.

| Grupo de la matriz | Casos indispensables |
|---|---|
| Identidad y contexto | MySQL y MariaDB comparten conector pero no reglas; PostgreSQL no hereda ninguna regla MySQL; versión y modo inesperados no provocan fallback silencioso. |
| Línea y caché | Límites inferior/superior de cada rango; cambio dentro de línea; reconexión; cambio de modo SQL; invalidación por DDL y schema; revisión nueva no contamina la anterior. |
| Seguridad | Comentarios ejecutables, varias sentencias, sintaxis no parseada y SQL destructivo se contrastan con el servidor real en cada línea afectada. |
| SQL escrito por la app | `CALL`, filtro, edición, exportación e identificadores se prueban en el servidor de su línea; el SQL generado usa la regla segura para las líneas del motor. |
| Introspección | Objetos y tipos, incluido `VECTOR`, coinciden con lo que devuelve el servidor; capacidades ausentes se muestran como N/A, no como fallo de otro motor. |
| Paquete | Firma, hash, formato, compatibilidad, rollback a paquete incluido, modo sin red y prohibición de relajar el guard. |

Las pruebas reales que hoy están `#[ignore]` permanecen así hasta montar una
compuerta reproducible. M1 elimina el `#[ignore]` de la ruta de CI y ejecuta
un job por `(motor, versión exacta)`; jobs paralelos usan contenedores y puertos
aislados. Un PR ordinario ejecuta el contrato rápido; un cambio de mecanismo
SQL ejecuta **todas** las versiones verificadas afectadas, y un cambio común
a todos los motores ejecuta la matriz completa. Un paquete o versión exacta
nueva ejecuta su propia matriz completa más D7 frente a la línea anterior.
Release ejecuta toda la matriz, fuzz extendido y E2E representativos. No se
marca ninguna versión como verificada por pasar solo unitarios o D7. El
trabajo cierra los P1 de `SQL_ENGINE` §9 y automatiza la suite real, con
duración acotada por paralelismo y fixtures reutilizables, sin saltar casos
por presupuesto de tiempo.

## 7. Plan de implementación y dependencia

| Fase | Cómo se hace | Cierre |
|---|---|---|
| M0. Inventario | Anotar cada decisión por motor en `engines/`, `version.rs`, `drivers.rs`, `SqlEditor` y `lib.rs`; catalogar fixtures y tests actuales, mapearlos a cada fila de `SQL_ENGINE` y a versiones exactas. | Ninguna regla o test sin dueño; se sabe qué se conserva, reescribe o retira. |
| M1. Harness y compuerta | Unificar corpus y `lines.json`, fijar imágenes, crear `coverage.json`, harness efímero y reporte; poner la matriz real por versión exacta en CI y quitar el `#[ignore]` de esa ruta. | Cada versión declarada verificada pasa `SQL_ENGINE` completo; los P1 de cobertura de §9 quedan cerrados con evidencia. |
| M2. Límite de motor | Extraer núcleo común y decisiones por dialecto según §3; registrar IDs exhaustivamente y crear la plantilla de motor. Añadir un motor de prueba de punta a punta en una rama temporal para comprobar la guía. | Agregar un motor tiene pasos finitos y errores claros; MySQL/MariaDB mantienen identidades distintas. |
| M3. Contexto tipado y cachés | Añadir `ConnectionEngineContext` desde backend, adaptar lectores uno por uno y propagar generación, modo y `schemaEpoch`; limitar cachés. | Frontend deja de parsear etiquetas visibles; 300 reconexiones no crecen en memoria ni mezclan líneas. |
| M4. Datos por línea | Implementar §5 primero con datos incluidos y líneas demostradas. Migrar una capacidad por PR, con paridad antes/después en todas las versiones exactas declaradas. | Una sola declaración de cada capacidad; matriz completa verde. |
| M5. Distribución | Tras M4: pantalla, índice, firma, descarga, desactivar/quitar y publicación descritos en §5. | Offline y rollback probados; ningún paquete puede saltar el guard ni afirmar verificación sin reporte. |

M0–M3 pertenecen a la consolidación del núcleo. M4–M5 son trabajo de soporte
de versiones futuro; no se mezclan con el runtime ni con la tienda de
extensiones. Agregar otro gestor de base de datos requiere la compuerta
completa de `SQL_ENGINE` §12, nunca instalar un paquete de tienda.
