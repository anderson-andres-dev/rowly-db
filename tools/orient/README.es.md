# orient

[English](README.md) · **Español**

Orientación para cualquier tarea y cualquier agente o persona: bug, funcionalidad nueva, cambio, refactor, pruebas o una pregunta sobre el proyecto. Lee el repositorio e imprime una tarjeta pequeña (unos 500 tokens, nunca más de 1 200): dónde vive lo que se pide, qué rangos de líneas leer, qué reutilizar, qué depende de eso, qué pruebas correr y si con eso basta. Solo necesita Node y el repositorio: sin servicio, sin modelo, sin dependencias, sin configuración de ningún proveedor. [AGENTS.md](../../AGENTS.md) es la entrada; todo lo de aquí es Markdown, JSON y comandos de terminal.

```bash
node tools/orient/orient.mjs "la grilla no hace scroll al arrastrar la selección"   # nivel 0: la tarjeta
node tools/orient/orient.mjs --expand results-grid                                  # nivel 1: sus archivos y símbolos
node tools/orient/orient.mjs --impact app/src/lib/results/gridAutoScroll.ts         # nivel 2: quién la usa, a quién usa, pruebas
```

`--intent bug|feature|refactor|analysis|tests|modify` fuerza el tipo de tarea (si no, se detecta; solo cambia la forma de la tarjeta, nunca su confianza), `--budget <tokens>` el tamaño, `--json` la salida y `--no-graph` ignora Graphify aunque exista.

## Cómo funciona

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

## Cómo encuentra cada agente la entrada

`AGENTS.md` es la entrada. Lo que documenta cada proveedor (según las páginas enlazadas; el estado dice hasta dónde se comprobó):

| Agente | ¿Lee `AGENTS.md`? | En este repositorio |
|---|---|---|
| Claude Code | Sí, desde la v2.1.277, **solo si no hay `CLAUDE.md`**; si lo hay, lee ese. Según su [documentación de memoria](https://code.claude.com/docs/en/memory#agents-md), la forma oficial de combinarlos es un import `@AGENTS.md` en `CLAUDE.md`. | `CLAUDE.md` es un puntero de una línea a `AGENTS.md`, así que funciona en ambos casos. |
| OpenAI Codex | Sí ([guía](https://developers.openai.com/codex/guides/agents-md); no se leyó directamente, sale de fuentes secundarias). | Nada que añadir. |
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

## Medirlo

`tests/orient/gold.json` tiene 113 tareas sacadas de commits reales (`files` y `tests` son lo que tocó el cambio; el texto es como lo pediría alguien), repartidas en `train` (la única contra la que se pueden ajustar parámetros) y `holdout`, `seen`, `seen2` y `validation3` (se miden, nunca se ajusta contra ellas; las tres primeras se vieron tarea por tarea en fases anteriores y `validation3` se midió una sola vez, al cierre de la última fase). `tests/orient/negatives.json` tiene tareas fuera de alcance para las que jamás debe decir `LIKELY`.

```bash
node tools/orient/eval.mjs --report                       # orient frente a graphify query, desde los registros
node tools/orient/eval.mjs --check                        # CI: ¿orient empeoró respecto a tests/orient/orient.json?
node tools/orient/eval.mjs --runner orient --split train  # al ajustar: solo train
node tools/orient/eval.mjs --runner orient --no-graph --write   # tras un cambio intencional, registrarlo
```

`--check` compara totales (no tarea por tarea) con el registro y su `tolerance`: una caída pequeña avisa, una grande falla, y mejorar nunca falla. Añadir una tarea al oro obliga a regenerar los dos registros (una prueba lo dice).

## Límites conocidos

Medidos al cerrar el trabajo; los números vigentes salen siempre de `--report`.

- **`LIKELY` acierta el 73 % de las veces, no el 90 %** (contando «al menos la mitad de los archivos esperados fue propuesta»), y en el 88 % hay al menos un archivo esperado entre los propuestos; en las tareas medidas una sola vez (`validation3`) fue 60 % y 70 %. Las cifras anteriores (87 %, 78 %) salieron de conjuntos más pequeños y eran optimistas. **Las señales disponibles no lo predicen**: en `train` cada señal separa las tarjetas acertadas de las equivocadas apenas mejor que el azar (AUC de 0,49 a 0,67) y la mejor regla encontrada (93 %) cayó a 69 % con validación cruzada leave-one-out, por debajo del 75 % de la regla actual, así que no se añadió ninguna. Léelo como «probablemente el área correcta por donde empezar», no como «no hay nada más que leer»; `Impact` y las pruebas siguen valiendo una mirada.
- **Algunas tareas se quedan sin ningún archivo correcto** (23 de 113 en la última medición): cuando el código nombra distinto que la descripción, cuando el trabajo es un contrato que cruza motor, backend y frontend, o un cambio de estilo sin vocabulario propio. Se dejan así; lo que protege de empeorarlas es la tolerancia de `--check`.
- **Pruebas de integración** (`contract.rs`, `safety.rs`): ahora se declaran por funcionalidad en el catálogo (`tests`); subió las pruebas encontradas en `train` (60 → 70 %) y `holdout` (50 → 70 %) y dejó igual `seen2` (80 %); las de una funcionalidad que no está entre las dos mejores siguen sin aparecer.
- **Los archivos bajo carpetas `tests/` se tratan como pruebas**, así que un script como `app/tests/e2e/resources.mjs` se lista como prueba, nunca como archivo a cambiar.
- **Una tarea corta hecha solo de palabras comunes da `NO MATCH`** aunque exista algo relevante: es el precio de no adivinar.
- **La precisión ronda el 30 %**: las respuestas esperadas tienen ~3 archivos y la tarjeta propone hasta 5. Cortar más la sube a costa de recall.
- **Evidencia pequeña y en parte sesgada**: 113 tareas; el vocabulario del catálogo se escribió conociendo el historial (las 11 tareas `train` posteriores y `validation3` son el control sin sesgo); el índice se arma sobre HEAD, que ya contiene cada arreglo (igual que el grafo de Graphify).
- **Lenguaje tosco**: sin acentos ni plurales y con raíz de seis letras, en español e inglés. Se probó una tabla de sinónimos español/inglés y se quitó: subió `train` pero no las tareas medidas una sola vez. Los símbolos salen de expresiones regulares, no de parsers.
