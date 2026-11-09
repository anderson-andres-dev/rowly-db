# Trabajar con agentes de IA

[English](AI.md) · **Español**

Cualquier agente (Claude Code, Codex, Copilot, Gemini, Cursor o una persona con una terminal) que abra este repositorio y reciba una petición genérica («analiza el repo», «cómo puedo hacer este cambio», «arregla esto») no debería empezar a escanear. El repositorio le dice cómo funciona y dónde está el contexto según lo que quiera hacer. Esta página explica cómo, para que puedas confiar en ello y cambiarlo.

Nada depende de un proveedor: la fuente es Markdown, JSON y scripts de Node. Los archivos para un agente concreto son generados y opcionales.

## Las cinco piezas

| Pieza | Qué hace | Dónde vive |
| :--- | :--- | :--- |
| Conocimiento | El mapa: cada funcionalidad, sus archivos, sus pruebas, sus vecinas; búsqueda sobre él. | `tools/architecture/model.json` (`features`), [docs/map/FEATURES.md](map/FEATURES.md), `tools/orient/` |
| Skills | Un procedimiento por tipo de cambio: qué leer, pasos, reglas, comprobaciones. | `model.json` (`playbooks`), [docs/map/PLAYBOOKS.md](map/PLAYBOOKS.md), `.claude/skills/` y `.agents/skills/` (generadas) |
| Reglas | Las decisiones persistentes, cada una con su razón y el comando que la comprueba. | `model.json` (`rules`), el bloque de [AGENTS.md](../AGENTS.md) |
| Interfaz de herramientas | Una línea de comandos y un servidor MCP que responden «dónde está, qué más cambia, qué pruebas». | `node tools/orient/orient.mjs` (`--playbook`, `--expand`, `--impact`, `--json` versionado), `tools/orient/mcp.mjs` vía `.mcp.json` |
| Documentación | La versión real de cada dependencia y dónde leer la documentación de esa versión. | [docs/map/STACK.md](map/STACK.md), generado desde los lockfiles |

Hay **una** fuente curada, `tools/architecture/model.json`. Todo lo demás se genera desde ella (o desde los lockfiles) y se comprueba en CI, así nada se desfasa.

## De una petición al contexto

1. El agente carga [AGENTS.md](../AGENTS.md): cómo funciona el repositorio, el router de playbooks, el mapa y las reglas. Unos 14 KB como máximo, a propósito.
2. Un tipo de cambio con procedimiento → su playbook (`node tools/orient/orient.mjs --playbook "<petición>"`, o la skill `rowly-<id>`). Cualquier otra cosa → `node tools/orient/orient.mjs "<petición>"`, una tarjeta de unos 500 tokens: archivos y rangos de líneas, qué reutilizar, qué depende de ello, qué pruebas correr.
3. Si necesita la API de una dependencia, mira antes su versión en [docs/map/STACK.md](map/STACK.md).
4. Abre archivos solo para confirmar, por rango de líneas.

## Cómo llega cada agente

| Agente | Entrada | Nota |
| :--- | :--- | :--- |
| Claude Code | `CLAUDE.md` (`@AGENTS.md`), las skills de `.claude/skills/` y el servidor MCP de `.mcp.json` | Claude lee `AGENTS.md` por sí mismo solo si no hay `CLAUDE.md`, por eso ese archivo lo importa. |
| Codex | `AGENTS.md` y las skills de `.agents/skills/` | Codex recorre `.agents/skills` desde el directorio de trabajo hasta la raíz del repositorio. |
| GitHub Copilot | `AGENTS.md` | Nada que añadir. |
| Gemini CLI | `GEMINI.md`, un puntero de una línea a `AGENTS.md` | |
| Cursor y otros | `AGENTS.md` si lo leen; si no, indícales que lo lean | Cualquier agente que pueda ejecutar un comando de terminal puede usar `orient`. |

Los archivos de puntero y las skills no llevan instrucciones propias: se generan y `node tools/orient/features.mjs --check` falla si difieren de la fuente. Lo que documenta cada proveedor, en detalle: [tools/orient/README.es.md](../tools/orient/README.es.md#cómo-encuentra-cada-agente-la-entrada).

## El servidor MCP

`.mcp.json` en la raíz del repositorio declara `rowly-orient`, un servidor stdio (`node tools/orient/mcp.mjs`, sin dependencias) que Claude Code encuentra solo: la primera vez que abres el repositorio te pide aprobarlo, y `claude mcp list` lo muestra. No hay nada que arrancar a mano; el cliente lo lanza. La configuración para Codex y otros está en el [README](../README.es.md#trabajar-con-agentes-de-ia). `node tools/orient/mcp.mjs --check` lo ejercita sin cliente y muestra el tiempo de cada llamada.

Seis herramientas de solo lectura, con el mismo texto que la línea de comandos:

| Herramienta | Hace |
| :--- | :--- |
| `start` | **Llamar primero.** El procedimiento de la petición más dónde está (archivos con rangos de líneas, pruebas): lo mismo que `orient --playbook` |
| `playbook` | Solo el procedimiento (cae a la tarjeta si ninguno coincide) |
| `orient` | Solo la tarjeta de orientación |
| `expand` | Los archivos de una funcionalidad |
| `impact` | Quién usa un archivo o una funcionalidad |
| `stack` | La versión resuelta de una dependencia y el enlace a su documentación |

**No debe empeorar nunca a un agente.** La línea de comandos da las mismas respuestas, `AGENTS.md` nombra las dos y el servidor es solo una entrada más cómoda. Tres cosas lo hacen barato:

- El índice vive en memoria y se rehace solo cuando cambia un archivo del repositorio: una llamada cuesta unos 20 ms en caliente (la línea de comandos, unos 215 ms con su propio proceso; la espera del modelo por vuelta son segundos).
- Se calienta en cuanto el cliente se conecta, así la primera llamada lo encuentra listo.
- `start` lleva la marca `anthropic/alwaysLoad`, que Claude Code documenta para las herramientas que no deben esperar tras `ToolSearch`. Sin ella los agentes seguían usando la línea de comandos (0 de 4 usaron el servidor; con la herramienta diferida, 1 de 4). La orden de Codex del README sigue `codex mcp add --help`; no se ejecutó aquí. Los clientes anteriores a Claude Code 2.1.285 ignoran la marca y la herramienta se encuentra igualmente con `ToolSearch`.

## Cambiar el toolkit

1. Edita `tools/architecture/model.json`: `features`, `rules` o `playbooks`. Nunca edites lo que está entre marcadores `<!-- generated: ... -->`, ni `docs/map/*`, ni las skills.
2. Corre `node tools/orient/features.mjs --write` (y `node tools/orient/stack.mjs --write` si cambiaron las dependencias).
3. Corre las comprobaciones: `node tools/orient/features.mjs --check`, `node tools/orient/stack.mjs --check`, `node --test tools/orient/*.test.mjs`, `node tools/orient/eval.mjs --check --strict`.
4. Mantén `AGENTS.md` por debajo de 14 000 caracteres: se paga en cada petición. Los documentos públicos llevan su par en español.

## Qué está probado y qué no

- El mapa de `AGENTS.md` redujo en torno a un 20 % los tokens que un modelo gastó en peticiones genéricas, en una prueba pequeña (analizar el repo: 58 227 → 46 852; exportar a JSON: 57 250 → 45 002).
- La búsqueda encuentra los archivos correctos más o menos la mitad de las veces con tareas variadas (recall@5 ≈ 47 % sobre 177 tareas, mejor que la línea base de Graphify en cada partición). `LIKELY` acierta unas dos de cada tres veces. Un modelo pequeño sin la tarjeta encuentra los archivos por sí solo casi igual de bien: la tarjeta es una pista, no un sustituto.
- Con el toolkit completo, seis peticiones genéricas en un modelo pequeño (Haiku, una corrida, solo lectura; [registro](../tests/orient/toolkit-trial.json)) costaron un 4 % menos de tokens y 26 llamadas en vez de 34 respecto al estado anterior, con la misma lista de comprobación cumplida en cinco de seis y una petición (cambiar un texto de la UI) en la que la respuesta con el toolkit no encontró la clave ni el componente. Ninguna de las seis usó `--playbook` ni una skill: el efecto medido es el del `AGENTS.md` reorganizado, no el de los playbooks.
- Una segunda corrida con seis peticiones nuevas, tras poner `--playbook` como primer paso en `AGENTS.md`: un 3 % menos de tokens y 30 llamadas en vez de 35 respecto al estado anterior; donde se permitía ejecutar comandos, 4 de 4 agentes usaron `--playbook` (3 de 4 antes, porque el texto anterior ya lo mencionaba). La diferencia está dentro del ruido de una corrida. Destapó un mal enrutado real (una petición sobre pruebas iba a `sql-behavior`), corregido con una prueba de regresión.
- Los playbooks se eligen con una búsqueda por palabras comprobada con 20 frases escritas por los autores, no con peticiones independientes.
- El servidor MCP, medido con sesiones reales de Claude Code en un modelo pequeño ([registro](../tests/orient/mcp-trial.json); 16 sesiones con él, 16 sin él, 8 peticiones dos veces): el agente llama a `start` primero 16 de 16 veces; mismas vueltas (4,0), algo más rápido (8,5 s contra 9,8 s), los archivos esperados nombrados en el 100 % de las respuestas contra el 94 % (comprobación burda). Las medianas de tokens son iguales; la media es mayor con el servidor por unas pocas sesiones largas. No es medible que sea mucho mejor que la línea de comandos; lo que aporta es descubrirse sin configurar nada y una sola llamada. Un primer lote de 32 sesiones se descartó: mi lanzador daba a cada sesión las demás peticiones. No se construyó: un servicio de recuperación de documentación.

Mediciones y límites en detalle: [tools/orient/README.es.md](../tools/orient/README.es.md).
