# orient

[English](README.md) · **Español**

Orientación para cualquier tarea y cualquier agente o persona: bug, funcionalidad nueva, cambio, refactor, pruebas o una pregunta sobre el proyecto. Lee el repositorio e imprime una tarjeta pequeña (unos 500 tokens, nunca más de 1 200): dónde vive lo que se pide, qué rangos de líneas leer, qué reutilizar, qué depende de eso, qué pruebas correr y si con eso basta. Solo necesita Node y el repositorio: sin servicio, sin modelo, sin dependencias, sin configuración de ningún proveedor. [AGENTS.md](../../AGENTS.md) es la entrada y [docs/AI.es.md](../../docs/AI.es.md) explica cómo encaja todo el toolkit (mapa, playbooks, reglas, esta herramienta, versiones); todo lo de aquí es Markdown, JSON y comandos de terminal.

```bash
node tools/orient/orient.mjs "la grilla no hace scroll al arrastrar la selección"   # nivel 0: la tarjeta
node tools/orient/orient.mjs --expand results-grid                                  # nivel 1: sus archivos y símbolos
node tools/orient/orient.mjs --impact app/src/lib/results/gridAutoScroll.ts         # nivel 2: quién la usa, a quién usa, pruebas
```

`--intent bug|feature|refactor|analysis|tests|modify` fuerza el tipo de tarea (si no, se detecta; solo cambia la forma de la tarjeta, nunca su confianza), `--budget <tokens>` el tamaño, `--json` la salida y `--no-graph` ignora Graphify aunque exista.

## Estado en una página

Qué es y qué está demostrado, en claro (números: `node tools/orient/eval.mjs --report`; los límites en detalle más abajo):

| Pregunta | Respuesta |
|---|---|
| ¿Apunta a los archivos correctos? | A menudo, no siempre: mejor que `graphify query` en todas las particiones medidas, y más débil con tareas nuevas y variadas de lo que sugiere el promedio. |
| ¿Ayuda a un agente? | Poco para localizar archivos: un modelo pequeño que puede buscar en este repositorio los encuentra solo en unas diez llamadas (ver «Con agentes reales»). Es una pista, no un sustituto. Lo que aportan *Impact* y *Tests* no se midió. |
| ¿Puedo fiarme de `LIKELY`? | Solo como «probablemente el área correcta»: acierta unas dos de cada tres veces. |
| ¿Funciona con cualquier IA? | Sí: Node y `git`, una tarjeta en Markdown o JSON versionado, sin proveedor, con hooks y registro opcionales. Cada agente encuentra `AGENTS.md` a su manera (tabla más abajo). |
| ¿Es sólido en otros sistemas y en repositorios más grandes? | Está verificado en Linux con Node 24; macOS, Windows y Node 20 están preparados en el CI pero todavía no han corrido. Un repositorio sintético de 20 000 archivos se indexa en menos de 2 s. |

**No se cierra**, a propósito o por falta de medios: el recall con tareas variadas ronda la mitad; la precisión es baja porque la tarjeta propone hasta cinco archivos para respuestas de unos tres; `LIKELY` no se puede predecir mejor con las señales que tenemos; solo español e inglés; el conjunto de evaluación es pequeño (177 tareas) y en parte gastado, así que ajustar de nuevo exige trabajo real nuevo (recógelo con `--log` y `--feedback`); las skills de los playbooks se generan desde `model.json` y se entrega un servidor MCP (ver abajo), pero ninguno está medido más allá de las pruebas de `docs/AI.es.md`.

## Cómo funciona

`AGENTS.md` lleva un mapa generado del repositorio (una línea por funcionalidad, una descripción corta de las capas y una tabla de qué hacer ante una petición genérica), para que un agente empiece con el plano cargado y no recorra el repositorio. Se reconstruye desde el mismo catálogo con `features.mjs --write` y el CI comprueba que está al día.

Una sola fuente escrita a mano; todo lo demás se deriva:

- **Catálogo**: la clave `features` de `tools/architecture/model.json` (lo que una tarea puede nombrar, con las palabras de usuarios e interfaz, en español e inglés). `node tools/orient/features.mjs --check` lo valida y `docs/map/FEATURES.md` se genera de él. Las pruebas no se repiten: salen de `tests/inventory.json`.
- **Índice** (`index.mjs`): por archivo, sus símbolos con rangos de líneas, imports, llamadas IPC de Tauri y los textos de interfaz que muestra. Se guarda en `.orient/` (ignorado por git); relee solo lo que cambió de tamaño o fecha, se rehace cuando cambia el código del extractor, incluye los archivos nuevos que git aún no tiene y da las mismas tarjetas con o sin caché.
- **Recuperación** (`retrieve.mjs`): BM25 sobre funcionalidades, archivos y pruebas; una funcionalidad refuerza a sus archivos; las tareas que cruzan dos áreas reservan lugar a la segunda.
- **Tarjeta** (`card.mjs`): una forma distinta por tipo de tarea, siempre dentro del tope. La última línea dice cuánto fiarse: `LIKELY` solo con confianza alta y significa «probablemente el área correcta», no «no hay nada más que leer»; `PARTIAL` o `AMBIGUOUS` dicen qué nivel pedir después; `NO MATCH` dice que nada del repositorio usa esas palabras.
- **Graphify** (`graphify.mjs`) es un extra opcional: si existe `graphify-out/graph.json`, la tarjeta suma una línea de vecinos marcada «por nombre, puede fallar». Nunca cambia la confianza ni lo que se propone (lo comprueba una prueba).

## Mantener el índice al día

Cada llamada a `orient.mjs` refresca antes el índice (unos 25 ms si nada cambió, 100 ms desde cero). No hace falta nada más. Para adelantar ese trabajo hay hooks de git opcionales:

```bash
node tools/orient/hooks.mjs status                 # qué hay instalado y de quién es
node tools/orient/hooks.mjs install [--graphify]   # post-commit, post-merge, post-checkout
node tools/orient/hooks.mjs uninstall              # quita solo lo que puso install
```

Nada los instala: ningún script de npm, ningún workflow, ninguna otra herramienta. Añaden un bloque marcado a un hook de shell existente (jamás pisan un hook que no sea de shell) y no pueden hacer fallar un commit: no imprimen nada y terminan bien incluso sin Node o sin `tools/orient`. `--graphify` además corre `graphify update .` en segundo plano si Graphify está instalado.

## Envolverlo para otra herramienta (MCP, skill)

Los playbooks se entregan como skills (`.claude/skills/rowly-<id>` y `.agents/skills/rowly-<id>`), generadas desde `tools/architecture/model.json` y comprobadas en CI; `orient.mjs --playbook "<petición>"` imprime el mismo procedimiento (`--json`: `kind: "playbook"`, versión de esquema 1). La herramienta se entrega también como servidor MCP, `tools/orient/mcp.mjs` (stdio, sin dependencias), declarado en `.mcp.json` para que Claude Code lo encuentre; sus herramientas (`start`, `ui_text`, `ipc`, `stack`, `playbook`, `orient`, `expand`, `impact`) devuelven el mismo texto que la línea de comandos (`--playbook`, `--text "<texto de la UI>"`, `--ipc [filtro]`, `--expand`, `--impact`) y [docs/AI.es.md](../../docs/AI.es.md#el-servidor-mcp) las lista. Cualquier otro agente que pueda ejecutar un comando de terminal no necesita nada de esto: `orient.mjs "<tarea>" --json` es toda la interfaz (ver el contrato de arriba). El servidor MCP habla su propio protocolo, no la versión de esquema de `--json`, así que un cambio en cualquiera se nota en sus propias pruebas.

## Cómo encuentra cada agente la entrada

`AGENTS.md` es la entrada. Lo que documenta cada proveedor (según las páginas enlazadas; el estado dice hasta dónde se comprobó):

| Agente | ¿Lee `AGENTS.md`? | En este repositorio |
|---|---|---|
| Claude Code | Sí, desde la v2.1.277, **solo si no hay `CLAUDE.md`**; si lo hay, lee ese. Según su [documentación de memoria](https://code.claude.com/docs/en/memory#agents-md), la forma oficial de combinarlos es un import `@AGENTS.md` en `CLAUDE.md`. | `CLAUDE.md` es ese import (`@AGENTS.md`), así que `AGENTS.md` se carga en cada sesión. |
| OpenAI Codex | Sí ([guía](https://developers.openai.com/codex/guides/agents-md); no se leyó directamente, sale de fuentes secundarias). Skills: recorre `.agents/skills` hasta la raíz del repositorio ([docs de skills](https://learn.chatgpt.com/docs/build-skills), comprobado). | Las skills de los playbooks generadas en `.agents/skills`. |
| GitHub Copilot coding agent | Sí ([changelog](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions)). Los reportes sobre Copilot CLI se contradicen. | Nada que añadir. |
| Gemini CLI | No por defecto: lee `GEMINI.md`; `context.fileName` puede sumar `AGENTS.md` ([documentación](https://www.geminicli.com/docs/cli/gemini-md)). | `GEMINI.md` es un puntero de una línea. |
| Cursor | Lo reportan terceros (documentación de reglas: [cursor.com/docs/rules](https://cursor.com/docs/rules), no verificada aquí). | Nada que añadir. |

Cualquier otro agente que pueda ejecutar un comando de terminal puede usar `node tools/orient/orient.mjs`; nada de esto hace falta para eso. Los archivos puntero no llevan instrucciones propias, así que no hay nada que mantener sincronizado.

## El contrato `--json`

`orient.mjs ... --json` imprime un objeto JSON con claves fijas. Cambiarlas obliga a subir `schemaVersion` (una prueba fija las claves exactas).

| `kind` | claves |
|---|---|
| `card` | `schemaVersion`, `kind`, `intent`, `confidence` (`level`: `high`\|`medium`\|`low`\|`none`, más `margin`, `coverage`, `evidence`), `likely` (verdadero solo con `high`), `noMatch`, `primary` (archivos a leer, en orden), `files` (todo lo que nombra la tarjeta), `tests`, `tokens` |
| `expand`, `impact` | `schemaVersion`, `kind`, `files`, `tests`, `tokens` |

`--with-markdown` suma una clave `markdown` con el texto de la tarjeta. Las rutas son relativas al repositorio y con `/`.

## Registro de uso y feedback (opcional)

Apagado por defecto. `--log` (o `ORIENT_LOG=<ruta>`) agrega una línea JSON por consulta a `.orient/log.jsonl` (ignorado por git): hora, tipo, tarea, confianza, archivos y pruebas propuestos. `node tools/orient/orient.mjs --feedback good|partial|bad [nota]` marca la última consulta registrada. Nunca sale de la máquina y nada lo lee solo: es material para ver dónde falló la tarjeta con uso real.

## Con Claude Code y Graphify

`.claude/settings.json` lleva un hook que instaló Graphify (`graphify hook-guard`) y que le dice a Claude Code que ejecute `graphify query` antes de buscar. Es de Graphify, no de orient, y se dejó como está. Conviven: `AGENTS.md` manda empezar con `orient` (no necesita nada instalado) y Graphify queda como segunda opinión opcional cuando existe `graphify-out/graph.json`. Si quieres solo uno, quita el hook de tu propia configuración; nada de orient depende de él.

## Con agentes reales

Las métricas de recuperación dicen si el archivo correcto está en la tarjeta, no si un agente trabaja mejor con ella. `agent-eval.mjs` lo mide para la localización: dada una tarea, un agente dice qué archivos cambiaría primero y qué pruebas correría, con o sin la tarjeta.

1. Haz una copia simple del repositorio **sin historial de git y sin las respuestas**: `git archive HEAD | tar -x -C <snapshot>`, y borra `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.claude`, `tools/orient`, `tests/orient` y `docs/map`.
2. `node tools/orient/agent-eval.mjs prompts --out <dir> --snapshot <snapshot>` escribe `<id>.A.txt` (sin tarjeta) y `<id>.B.txt` (con tarjeta) para 20 tareas: 10 de `validation5` (interfaz) y 10 de `seen4` (guarda y analizador SQL), elegidas con una regla fija.
3. Ejecuta cada prompt con el agente o modelo que quieras, cada uno en una sesión nueva, y haz que escriba su respuesta JSON en `<id>.A.json` o `<id>.B.json`. Anota tokens, llamadas a herramientas y segundos en un `usage.json` (`{"<id>.A": {"tokens": n, "toolUses": n, "durationMs": n}}`).
4. `node tools/orient/agent-eval.mjs score --answers <dir> --usage usage.json --write` puntúa archivos (recall@5, precisión) y pruebas contra lo que tocó el commit de la tarea y escribe `tests/orient/agent-eval.json`.

Cuesta tokens, así que no forma parte del CI.

**Resultado de la primera corrida** (subagentes Claude Haiku, una corrida por condición, 20 tareas: 10 de `validation5` y 10 de `seen4`; cada agente tenía solo Read, Grep y Glob sobre una copia sin historial de git, sin los archivos del oro y sin orient):

| | recall@5 | precisión | hit@5 | pruebas | tokens | llamadas | segundos |
|---|---|---|---|---|---|---|---|
| A: sin tarjeta | 79 % | 33 % | 90 % | 71 % | 51 261 | 10,7 | 32,0 |
| B: con tarjeta | 81 % | 38 % | 95 % | 71 % | 49 930 | 10,5 | 30,3 |
| la tarjeta sola | 32 % | – | 55 % | – | – | – | – |

En `validation5` ambas condiciones encontraron todos los archivos; en `seen4` (guarda y analizador SQL) B tuvo 62 % frente a 58 %. Por tarea, B fue mejor en 1, peor en 0 e igual en 19. **Léelo sin adornos: para localizar archivos, un modelo pequeño que puede buscar en este repositorio los encuentra solo en unas diez llamadas y la tarjeta cambia poco** (+2 puntos de recall, +4 de precisión, un 3 % menos de tokens, dentro del ruido de una sola corrida). La tarjeta sola es mucho peor que el agente (32 % frente a 79 %), así que es una pista, no un sustituto. Esta corrida no mide lo que aportan las secciones Impact y Tests, ni lo que hace la tarjeta con agentes que no pueden buscar o con repositorios mucho más grandes que este.

Límites de la medición: una corrida por condición y 20 tareas; los agentes trabajan sobre HEAD, donde cada arreglo ya existe, y la copia conserva los documentos de arquitectura y `tools/architecture/model.json`, que ya son un mapa; la cifra de tokens incluye unos 40 000 tokens de sobrecarga fija de cada subagente, así que los ahorros pequeños no se ven; mide localización, no resolver la tarea.



**Peticiones genéricas con el mapa en `AGENTS.md`** (4 subagentes Haiku, una corrida cada uno, dos peticiones: «analiza el repositorio y dime cómo está organizado» y «cómo podría hacer que los resultados de una consulta se exporten a un archivo JSON: archivos, qué reutilizar, pruebas»; A = copia sin `AGENTS.md` ni orient, B = el repositorio tal como está ahora):

| petición | A: tokens / llamadas / archivos leídos | B: tokens / llamadas / archivos leídos |
|---|---|---|
| analizar el repositorio | 58 227 / 6 / 4 | 46 852 / 5 / 2 |
| exportar resultados a JSON | 57 250 / 8 / 3 | 45 002 / 6 / 3 |

Ambas condiciones respondieron bien (las dos encontraron que la exportación a JSON ya existe y nombraron los mismos archivos); B usó un 20 % menos de tokens y entre un 17 y un 25 % menos de llamadas, y su respuesta salió del mapa. Una corrida cada una y dos peticiones: apunta en la dirección correcta, no lo demuestra. Los tokens incluyen la misma sobrecarga fija de arriba, así que el ahorro real en exploración es mayor que el porcentaje.

## Portabilidad y rendimiento

Usa solo la biblioteca estándar de Node y `git`; Node 20 o superior. Las rutas del repositorio se manejan como rutas con `/` en cualquier sistema, se toleran los finales de línea CRLF, y lo único que necesita un `sh` POSIX son los hooks de git opcionales (sus pruebas se omiten en Windows). El job `orient-portable` de `node.yml` ejecuta las pruebas y `eval.mjs --check` en Ubuntu, macOS y Windows con Node 20 y 22. **Se añadió aquí pero todavía no ha corrido**: hasta que corra, solo está verificado en Linux con Node 24, y las entradas de macOS y Windows son informativas (un fallo ahí no bloquea el CI) hasta que corran en verde una vez.

`node tools/orient/bench.mjs` arma un repositorio sintético y lo mide. En la máquina usada (una corrida, léelo como orden de magnitud):

| archivos | índice desde cero | índice con caché | una tarjeta |
|---|---|---|---|
| 1 000 | 0,15 s | 0,09 s | 3 ms |
| 5 000 | 0,5 s | 0,4 s | 9 ms |
| 20 000 | 1,7 s | 1,2 s | 36 ms |

Este repositorio tiene unos 300 archivos indexados (0,1 s). El banco encontró un costo real (buscar las funcionalidades de cada archivo contra todas las entradas del catálogo) que hacía que 20 000 archivos tardaran 3,8 s; está corregido.

`eval.mjs --check --strict` además falla ante cualquier caída por encima del umbral de aviso. Corre en la validación completa nocturna y manual, para que una deriva lenta no se acumule sin que nadie la vea; los pull requests mantienen la tolerancia normal.

Ya no queda historial sin usar con el que armar más tareas de evaluación: cada commit que podía convertirse en tarea ya lo es. Ajustar de nuevo exige trabajo real nuevo. `--log` y `--feedback` (arriba) son la forma de recogerlo.

## Medirlo

`tests/orient/gold.json` tiene 177 tareas sacadas de commits reales (`files` y `tests` son lo que tocó el cambio; el texto es como lo pediría alguien), repartidas en `train` (la única contra la que se pueden ajustar parámetros) y `holdout`, `seen`, `seen2`, `seen3`, `seen4` y `validation5` (se miden, nunca se ajusta contra ellas; todas menos la última se vieron en rondas anteriores, `validation5` se midió una sola vez, al final de la última). `tests/orient/negatives.json` tiene tareas fuera de alcance para las que jamás debe decir `LIKELY`, y `tests/orient/short.json` consultas de una o dos palabras que no deben acabar en `NO MATCH`.

```bash
node tools/orient/eval.mjs --report                       # orient frente a graphify query, desde los registros
node tools/orient/eval.mjs --check                        # CI: ¿orient empeoró respecto a tests/orient/orient.json?
node tools/orient/eval.mjs --runner orient --split train  # al ajustar: solo train
node tools/orient/eval.mjs --runner orient --no-graph --write   # tras un cambio intencional, registrarlo
```

`--check` compara totales (no tarea por tarea) con el registro y su `tolerance`: una caída pequeña avisa, una grande falla, y mejorar nunca falla. Añadir una tarea al oro obliga a regenerar los dos registros (una prueba lo dice).

## Límites conocidos

Medidos al cerrar el trabajo; los números vigentes salen siempre de `--report`.

- **`LIKELY` acierta el 64 % de las veces, no el 90 %** (contando «al menos la mitad de los archivos esperados fue propuesta»), y en el 84 % hay al menos un archivo esperado entre los propuestos; en `seen4` (la parte más difícil) fue 0 de 5 y 3 de 5. Léelo como «probablemente el área correcta» y revisa siempre Impact y las pruebas. Las señales disponibles no lo predicen: cada una separa las tarjetas acertadas de las equivocadas apenas mejor que el azar, y la mejor regla encontrada en `train` quedó por debajo de la actual con leave-one-out, así que no se añadió ninguna.
- **La recuperación es más débil con tareas nuevas y variadas de lo que sugiere el titular**: recall@5 es 47 % sobre las 177 tareas, 41 % en `validation5` (trabajo de interfaz) y 26 % en `seen4` (guarda y analizador SQL). 50 de 177 tareas se quedan sin ningún archivo correcto: cuando el código nombra distinto que la descripción, cuando el trabajo es un contrato que cruza motor, backend y frontend, o un cambio de estilo sin vocabulario propio. La última ronda (vocabulario de cada funcionalidad derivado del código de sus archivos, archivos de configuración, dependencias de Rust por `use` para Impact) subió `train` (recall 49 → 54 %) y la limpia `validation5` (hit@5 54 → 63 %), pero fue plana en las tareas ya vistas (≈ −1 pp) y bajó las pruebas encontradas en algunas, así que no es una mejora general. Aun así supera a `graphify query` en todas las particiones (6 % sobre todas las tareas, 4 % en `validation5`).
- **Pruebas de integración** (`contract.rs`, `safety.rs`): ahora se declaran por funcionalidad en el catálogo (`tests`); subió las pruebas encontradas en `train` (60 → 70 %) y `holdout` (50 → 70 %) y dejó igual `seen2` (80 %); las de una funcionalidad que no está entre las dos mejores siguen sin aparecer.
- **Los archivos bajo carpetas `tests/` se tratan como pruebas**, así que un script como `app/tests/e2e/resources.mjs` se lista como prueba, nunca como archivo a cambiar.
- **Los guiones E2E no se indexan**, por medición (añadirlos empeoró `train`). **Los archivos de configuración sí** (`Cargo.toml`, `package.json`, configuración de Vite, Svelte, TypeScript y Tauri) bajo una funcionalidad `build-config` con términos específicos: no perjudicó el recall y esas tareas ya tienen respuesta, pero ninguna tarea del conjunto la ejercita.
- **Las consultas cortas** (una o dos palabras) devuelven una tarjeta `AMBIGUOUS` en vez de `NO MATCH` cuando existe una palabra rara en el repositorio (hit@5 83 % sobre las doce) y nunca son `LIKELY`.
- **El tipo de tarea es una heurística.** Una tarea sin señal de error ni de refactor recibe ahora la vista de funcionalidad (dónde cambiar, qué reutilizar): coincidió con las etiquetas del oro el 70 % de las veces en `train`, frente al 45 % anterior. Cambia la forma de la tarjeta, nunca su confianza ni los archivos.
- **No se hizo**: raíces por sufijos, una herramienta que sugiera términos del catálogo y una tercera fuente de pruebas declaradas (tomar las pruebas de la tercera mejor funcionalidad no cambió nada). Tampoco hay dependencias por archivo del marcado de Svelte; las de Rust ya existen pero solo alimentan Impact, porque en la búsqueda sumaban ruido.
- **Una tarea corta hecha solo de palabras comunes da `NO MATCH`** aunque exista algo relevante: es el precio de no adivinar.
- **La precisión ronda el 30 %**: las respuestas esperadas tienen ~3 archivos y la tarjeta propone hasta 5. Cortar más la sube a costa de recall.
- **Evidencia pequeña y en parte sesgada**: 177 tareas, las últimas 24 casi todas de interfaz (los únicos commits que quedaban sin usar); el vocabulario del catálogo se escribió conociendo parte del historial (las tareas `train` posteriores y `validation5` son el control sin sesgo); el índice se arma sobre HEAD, que ya contiene cada arreglo (igual que el grafo de Graphify). Las tareas fuera de alcance declararon `LIKELY` el 0 % de las veces.
- **Lenguaje tosco**: sin acentos ni plurales y con raíz de seis letras, en español e inglés. Se probó una tabla de sinónimos español/inglés y se quitó: subió `train` pero no las tareas medidas una sola vez. Los símbolos salen de expresiones regulares, no de parsers.
