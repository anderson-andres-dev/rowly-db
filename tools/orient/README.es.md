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
- **Tarjeta** (`card.mjs`): una forma distinta por tipo de tarea, siempre dentro del tope. La última línea dice cuánto fiarse: `SUFFICIENT` solo con confianza alta; `PARTIAL` o `AMBIGUOUS` dicen qué nivel pedir después; `NO MATCH` dice que nada del repositorio usa esas palabras.
- **Graphify** (`graphify.mjs`) es un extra opcional: si existe `graphify-out/graph.json`, la tarjeta suma una línea de vecinos marcada «por nombre, puede fallar». Nunca cambia la confianza ni lo que se propone (lo comprueba una prueba).

## Mantener el índice al día

Cada llamada a `orient.mjs` refresca antes el índice (unos 25 ms si nada cambió, 100 ms desde cero). No hace falta nada más. Para adelantar ese trabajo hay hooks de git opcionales:

```bash
node tools/orient/hooks.mjs status                 # qué hay instalado y de quién es
node tools/orient/hooks.mjs install [--graphify]   # post-commit, post-merge, post-checkout
node tools/orient/hooks.mjs uninstall              # quita solo lo que puso install
```

Nada los instala: ningún script de npm, ningún workflow, ninguna otra herramienta. Añaden un bloque marcado a un hook de shell existente (jamás pisan un hook que no sea de shell) y no pueden hacer fallar un commit: no imprimen nada y terminan bien incluso sin Node o sin `tools/orient`. `--graphify` además corre `graphify update .` en segundo plano si Graphify está instalado.

## Medirlo

`tests/orient/gold.json` tiene 49 tareas sacadas de commits reales (`files` y `tests` son lo que tocó el cambio; el texto es como lo pediría alguien), repartidas en `train` (la única contra la que se pueden ajustar parámetros), `holdout` y `validation` (se miden, nunca se ajusta contra ellas). `tests/orient/negatives.json` tiene tareas fuera de alcance para las que jamás debe decir `SUFFICIENT`.

```bash
node tools/orient/eval.mjs --report                       # orient frente a graphify query, desde los registros
node tools/orient/eval.mjs --check                        # CI: ¿orient empeoró respecto a tests/orient/orient.json?
node tools/orient/eval.mjs --runner orient --split train  # al ajustar: solo train
node tools/orient/eval.mjs --runner orient --no-graph --write   # tras un cambio intencional, registrarlo
```

`--check` compara totales (no tarea por tarea) con el registro y su `tolerance`: una caída pequeña avisa, una grande falla, y mejorar nunca falla. Añadir una tarea al oro obliga a regenerar los dos registros (una prueba lo dice).

## Límites conocidos

Medidos al cerrar el trabajo; los números vigentes salen siempre de `--report`.

- **`SUFFICIENT` acierta el 87 % de las veces, no el 90 %** (contando «al menos la mitad de los archivos esperados fue propuesta»). Siempre acierta el área (algún archivo esperado está siempre entre los propuestos) pero no sabe cuándo un cambio abarca varias capas: las equivocadas fueron tareas de varios archivos entre Rust y el frontend. Las señales de dispersión no las separaron y no se añadió ninguna.
- **Algunas tareas se quedan sin ningún archivo correcto** (5 de 49 en la última medición): cuando el código nombra distinto que la descripción, cuando el trabajo es un contrato que cruza motor, backend y frontend, o un cambio de estilo sin vocabulario propio. Se dejan así; lo que protege de empeorarlas es la tolerancia de `--check`.
- **Las pruebas de integración muchas veces no aparecen** (`contract.rs`, `safety.rs`): su dueño es un crate, no el archivo que se cambia.
- **Los archivos bajo carpetas `tests/` se tratan como pruebas**, así que un script como `app/tests/e2e/resources.mjs` se lista como prueba, nunca como archivo a cambiar.
- **Una tarea corta hecha solo de palabras comunes da `NO MATCH`** aunque exista algo relevante: es el precio de no adivinar.
- **La precisión ronda el 30 %**: las respuestas esperadas tienen ~3 archivos y la tarjeta propone hasta 5. Cortar más la sube a costa de recall.
- **Evidencia pequeña y en parte sesgada**: 49 tareas; el vocabulario del catálogo se escribió conociendo el historial (las 11 tareas `train` posteriores y `validation` son el control sin sesgo); el índice se arma sobre HEAD, que ya contiene cada arreglo (igual que el grafo de Graphify).
- **Lenguaje tosco**: sin acentos ni plurales y con raíz de seis letras, en español e inglés; los símbolos salen de expresiones regulares, no de parsers.
