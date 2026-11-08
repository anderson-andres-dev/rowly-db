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
