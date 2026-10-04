# Extensiones opcionales y futura tienda — límites antes del runtime

## Estado y decisión de producto

**Diseño futuro, sin implementación** (2026-10-02). Proyecto aparte, fuera de la consolidación y de motores/versiones, que se cerraron sin él. La prioridad actual es
consolidar y medir el núcleo (hecho: [arquitectura](../ARCHITECTURE.es.md), [mediciones](../../tools/bench/README.es.md)). Esta spec
define dónde podrán conectarse las extensiones para que esa consolidación no
cierre la puerta a Vim, Better Comments u otras funciones de nicho. No se
añaden tienda, gestor, SDK, dependencia de runtime ni descarga al producto
base durante esa fase.

**Vida del documento:** plan temporal. Cada API o garantía implementada pasa
a la guía permanente de arquitectura y contribución antes de cerrar su fase;
las reglas SQL siguen perteneciendo a [SQL_ENGINE](../../SQL_ENGINE.es.md).
Tras E4 se elimina esta spec.

**Rowly DB vanilla** conserva conexión, editor SQL, análisis, guard de
ejecución, explorador, grid y operaciones de datos. Son el contrato central.
Un modo de edición, una forma extra de decorar comentarios o un asistente
pueden ser opcionales. Que algo sea opcional no le permite eludir el guard ni
el contrato de motores de [SQL_ENGINE](../../SQL_ENGINE.es.md).

### Regla para decidir dónde entra una función

- Va al núcleo si es necesaria para conectar, leer o escribir con corrección,
  proteger datos o mantener coherente la experiencia básica en **todos** los
  motores. Un driver nuevo cumple esta regla, aunque no lo use toda la gente:
  necesita código y pruebas de servidor dentro de la app.
- Va a extensión si cambia un flujo por preferencia o nicho sin alterar el
  significado ni la seguridad del SQL: Vim y Better Comments son ejemplos.
- Una extensión nunca declara motores ni líneas de versión, no modifica un
  `EngineDefinition` ni los datos de `support/` y no tiene una ruta que evite
  el guard del host. Un motor nuevo solo llega con una release de la app
  (`SQL_ENGINE` §12); una línea, en la app o en un paquete de soporte firmado
  (`SQL_ENGINE` §11). El campo `engines` del manifiesto solo dice en qué
  motores ya registrados funciona la extensión.
- Si una función opcional todavía no cabe en una API aislada con el
  presupuesto de rendimiento, queda pendiente. No se agrega al arranque de
  vanilla como atajo para poder publicarla.

## 1. Tres cosas que no se mezclan

| Tipo | Ejemplo | Distribución | Autoridad |
|---|---|---|---|
| Mecanismo del núcleo | Driver, parser, guard, editor CodeMirror, IPC | App firmada | Puede acceder a la base según los comandos del host. Se prueba en cada release. |
| Paquete de soporte de línea | Reglas declarativas de MySQL 8.4 o PostgreSQL 18 | Formato y firma de [SQL_ENGINE](../../SQL_ENGINE.es.md) §11 | Aporta datos a mecanismos existentes; nunca código ni permisos de UI. |
| Extensión de usuario | Better Comments, Vim, exportador opcional | Futura tienda; instalación explícita | Solo las contribuciones y datos concedidos por el host. No agrega gestores de base de datos en la primera plataforma. |

Los **plugins de Tauri** son bibliotecas integradas en la app y sus
capacidades controlan la exposición del frontend; no constituyen por sí
solos un sistema de paquetes descargables en tiempo de uso. La tienda de
Rowly DB necesita su propio formato, verificador y host. Además, la
[documentación de capacidades de Tauri](https://v2.tauri.app/security/capabilities/)
advierte que las capacidades de una misma WebView se combinan: cargar
JavaScript externo en la WebView principal le daría una superficie demasiado
amplia. Por eso la primera plataforma no ejecutará JS de terceros allí.

## 2. Superficies de extensión

| Punto | Datos que recibe | Operación permitida | Restricción |
|---|---|---|---|
| Decoración del editor | Rangos visibles y tipos de token ya calculados por el host | Proponer clases o marcas para rangos visibles | No cambia el árbol SQL, la clasificación de sentencias ni el texto sin una acción del usuario. |
| Comandos y teclas del editor | Tecla, selección y estado del modo cuando el editor tiene foco | Proponer movimiento o edición mediante transacciones del host | Atajos reservados, confirmaciones, Escape de diálogos y permisos prevalecen. El host valida rangos y tamaño. |
| Acción sobre resultado | Metadatos de columnas y, con permiso, filas seleccionadas | Generar un archivo o una vista derivada | Sin acceso al pool SQL ni a credenciales; el host controla el flujo y la exportación. No forma parte de la primera prueba. |
| Panel opcional | Estado y acciones declaradas, si se aprueba | Mostrar UI dentro de un contenedor aislado | Sin DOM de la app principal ni IPC Tauri directo. No forma parte de la primera prueba. |

La primera versión implementable solo abarcará **editor**. El host conserva
los `Compartment` de CodeMirror y reconfigura un punto opcional al activar o
desactivar una extensión, sin remontar el editor. CodeMirror documenta esta
reconfiguración dinámica en sus
[ejemplos oficiales](https://codemirror.net/examples/config/). Durante la
consolidación solo se define el límite de `editor/configuration.ts`; el
registro de extensiones se crea cuando exista un prototipo medido.

### Dos ejemplos que prueban límites distintos

- **Better Comments:** paquete declarativo de reglas de presentación. El host
  recorre solo el texto visible con el árbol de comentarios del **motor y
  versión efectivos**; no reinterpreta `/*!…*/` de MySQL ni `/*M!…*/` de
  MariaDB como comentario si el motor los ejecuta. El estilo nativo de
  comentarios, su edición y el gris base quedan siempre disponibles. Un error en la
  decoración no afecta el SQL que se ejecutará. La primera versión acepta
  prefijos y tokens acotados, no expresiones regulares arbitrarias que puedan
  bloquear el hilo de la interfaz.
- **Vim:** estado de modo, movimientos, selección y edición. Requiere
  respuesta a cada tecla. Un host genérico con mensajes asincrónicos puede
  introducir latencia: antes de prometerlo como paquete descargable hay que
  comparar un prototipo aislado con el editor vanilla en los tres WebViews.
  El host intercepta solo teclas del editor compatibles con el modo activo;
  deja pasar composición IME y atajos reservados. Envía al worker tecla,
  selección y generación del documento; aplica la transacción propuesta solo
  si esa generación sigue vigente, y descarta respuestas tardías.
  Si no cumple el presupuesto de §5, se cambia el protocolo o se aplaza ese
  tipo de extensión; no se inserta código externo en la WebView principal
  para ocultar el problema.

Un futuro asistente MCP se evaluará como función opcional antes de
implementarlo. Su acceso a datos, permisos y tamaño requieren una spec propia
cuando se priorice; no forma parte del arranque de vanilla.

## 3. Paquete y confianza

Primer borrador del manifiesto (los nombres finales se fijan con el
prototipo, no con una tienda vacía):

```json
{
  "format": 1,
  "id": "org.rowly.better-comments",
  "version": "1.0.0",
  "api": 1,
  "kind": "editor-declarative",
  "requiresApp": ">=0.4.0",
  "engines": ["mysql", "mariadb", "postgres"],
  "permissions": ["editor.visible-ranges"],
  "entry": "rules.json"
}
```

- El ID es estable; versión de paquete y versión de API son independientes
  de la versión de la app y de las líneas de servidores. El instalador
  comprueba compatibilidad **antes** de activar. Un paquete declara motores
  aplicables pero no redefine su perfil ni el significado de una línea.
- El índice de tienda va firmado con una clave **distinta** de las claves de
  actualización de la app y de soporte de motores. Cada artefacto tiene hash
  en ese índice; se valida tamaño, formato, firma, hash y permisos antes de
  moverlo atómicamente a la carpeta de extensiones. La clave y el formato
  admiten rotación y revocación. Una instalación fallida deja la versión
  anterior utilizable.
- La tienda muestra autor, permisos, tamaño, compatibilidad y cambios antes
  de instalar o actualizar. Descargar, habilitar y conceder permisos son
  acciones explícitas. Un paquete deshabilitado permanece en disco, pero no
  tiene worker, listeners ni código cargado. Se puede quitar y volver a la
  configuración vanilla sin reiniciar cuando su tipo lo permita.
- La lista de la tienda se consulta solo al abrirla o por una preferencia
  explícita. Se usa caché y reintento con espera como en Actualizaciones; sin
  red se muestran los paquetes ya instalados. No hay telemetría obligatoria.
- La tienda inicial es un **catálogo de paquetes**, sin pagos, ranking ni
  recomendaciones remotas. Esos asuntos se diseñan cuando exista demanda;
  no alteran el host ni la instalación.

### Código ejecutable: propuesta sujeta a prototipo

Para paquetes descargables que necesitan lógica, el candidato es un módulo
WebAssembly **sin envoltorio JS del paquete** dentro de un Web Worker del
host. Solo recibe funciones importadas y mensajes definidos por Rowly DB:
sin DOM, sin IPC Tauri, sin red, sin sistema de archivos, sin credenciales y
sin puntero al `EditorView`. El host valida longitud de mensajes y rangos de
edición, exige memoria acotada, termina el worker al exceder tiempo y lo
reinicia o deshabilita tras fallos repetidos. Los límites concretos de
memoria/tiempo se fijan con el prototipo y su medición; no se instala un
runtime pesado en vanilla por anticipado.

Los permisos no son simples etiquetas del manifiesto: cada operación pasa
por un método del host que comprueba el permiso concedido, la conexión y la
acción solicitada. Una futura capacidad de consultar datos requeriría un
flujo de aprobación separado y seguiría pasando por el guard de Rowly DB.
Los comandos Tauri actuales registrados por `invoke_handler` se revisan
antes de permitir cualquier UI de terceros; las capacidades de Tauri no
reemplazan esos controles por extensión.

## 4. Ciclo de vida y fallos

```text
descubrir → verificar → instalar desactivado → mostrar permisos → activar
                                   ↓                         ↓
                           borrar/rollback ← desactivar ← fallo o decisión
```

La activación se hace por usuario y, si la extensión es específica del
editor, solo al montar un editor que la necesite. Sus recursos se liberan al
cerrar editor/conexión o desactivar; un worker no vive por cada pestaña si el
estado puede compartirse sin mezclar documentos. La extensión nunca guarda
credenciales ni un catálogo entero por defecto. Un arranque tras un crash
repetido ofrece modo seguro con extensiones desactivadas.

Conflictos: IDs de comando únicos; el host reserva ejecutar/cancelar,
confirmaciones, archivos y navegación de diálogos. Dos extensiones que piden
la misma tecla muestran el conflicto y el usuario elige precedencia. La
desactivación revierte sus atajos, decoraciones y estado sin dejar registros.

## 5. Presupuesto de ligereza

La medición sigue [el presupuesto de rendimiento](../../tools/bench/README.es.md#presupuesto):

- **Vanilla, cero extensiones activas:** sin petición a tienda, sin worker,
  sin módulos de paquete importados, sin listener/timer de extensiones y sin
  crecimiento medible de tiempo de arranque, RSS o JS inicial. El coste de
  una interfaz vacía se registra y se rechaza si rompe la compuerta base.
- **Better Comments activo:** trabajo proporcional al texto visible, no al
  documento completo; p95 de scroll y escritura dentro del presupuesto de
  frames de la app. Se prueba con comentarios largos y documento de 30 MB.
- **Vim activo:** tecla a pintado p95 dentro de 16,7 ms en el documento
  normal de referencia, sin picos recurrentes por IPC; desactivarlo devuelve
  recursos y latencia a la línea base. Un teclado rápido y 300 cambios de
  pestaña forman parte del prototipo.
- Un paquete que excede su presupuesto se desactiva para esa sesión con un
  aviso claro. No ralentiza ni bloquea el guard, el editor vanilla o el
  cierre de la app.

### Pruebas de la plataforma opcional

Cuando E1 comience, las pruebas tendrán un lugar y una propiedad explícitos:

```text
app/tests/extensions/host/         activación, permisos, teclas y apagado
tests/extensions/fixtures/          paquetes válidos, corruptos e incompatibles
tests/extensions/compatibility/     API de host × paquete de referencia
tools/bench/extensions/             vanilla, Better Comments y Vim
```

El host se prueba con paquetes mínimos controlados: manifiesto inválido,
firma falsa, permiso ausente, respuesta tardía, cierre de editor y crash del
worker. Better Comments se verifica con comentarios normales y ejecutables
de **cada motor y línea certificada**; su decoración no puede cambiar el SQL
que llega al guard. Vim se prueba con IME, undo, teclas reservadas, foco de
diálogos y cambios rápidos de documento. Las pruebas de compatibilidad
declaran versión de API del host y versión de paquete; no confunden esas
versiones con las del servidor SQL.

Una extensión desactivada se comprueba con contadores de workers, listeners,
red y memoria: todos vuelven a la línea base. Los fixtures de la plataforma
no duplican los corpus de `SQL_ENGINE`; consumen las identidades y casos de
motor/versiones de [SQL_ENGINE](../../SQL_ENGINE.es.md).
Una extensión que altere interpretación o seguridad SQL queda fuera de la API
del editor y exige revisión del núcleo y sus compuertas.

## 6. Orden de trabajo y compuertas

| Fase | Acción concreta | Condición para avanzar |
|---|---|---|
| E0. Ahora | Durante la consolidación, mantener la configuración de CodeMirror en un módulo y separar los comandos del editor del guard. Escribir tests que prueben que una contribución decorativa no altera SQL ni ejecución. | Sin runtime ni costo nuevo en vanilla; presupuesto C5 verde. |
| E1. Contrato | Definir manifiesto v1, contribuciones de editor, permisos del host, instalación atómica y prueba de desactivación. Prototipo local con Better Comments declarativo, sin tienda. | Funciona en tres motores y en los tres WebViews; caso MySQL/MariaDB ejecutable correcto. |
| E2. Latencia | Prototipo de Vim con worker/WASM, medir teclas, memoria y cancelación. Comparar con vanilla y probar conflictos de atajos. | Presupuesto §5 y aislamiento demostrados. Si falla, rediseñar antes de abrir la API. |
| E3. Distribución | Crear índice firmado, descarga, caché, revocación, rollback, UI de permisos y estado instalado. Publicar primero los dos paquetes de referencia. | Offline, actualización fallida y modo seguro probados; ningún acceso Tauri directo. |
| E4. Apertura | Documentar SDK, pruebas de compatibilidad por API/motor y proceso de revisión de paquetes externos. | Una extensión ajena pasa tests, auditoría de permisos y medición sin cambios en el núcleo. |

E1–E4 son **futuros**: no entran por arrastre en el refactor de `v0.3.0`.
La arquitectura se acepta solo si añade opciones sin convertir cada feature
de nicho en costo permanente para todos los usuarios.
