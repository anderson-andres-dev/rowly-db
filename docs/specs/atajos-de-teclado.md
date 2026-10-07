# Atajos de teclado: modo escritorio y modo vim

## Estado

**Propuesta, sin implementar** (2026-10-06). Rehace la versión anterior de
esta spec. Ahora hay dos modos: el **modo escritorio**, que es el de
siempre, y el **modo vim**, que llegará como extensión
([plataforma de extensiones](plataforma-de-extensiones.md)). Los dos
recorren toda la app con el teclado, desde el mismo registro de comandos
(`app/src/lib/workspace/commands.ts`).

**Vida del documento:** plan temporal. Lo que se implemente pasa a
[ARCHITECTURE](../ARCHITECTURE.es.md) y a la hoja de atajos, y esta spec se
elimina.

## Por qué

- **El modo vim tiene que sentirse nativo.** Quien usa Neovim llega con la
  memoria muscular de [NvChad](https://nvchad.com/): líder en `Espacio`,
  `Ctrl+h/j/k/l` entre ventanas, `Tab`/`Shift+Tab` entre buffers, `Espacio x`
  para cerrar y `Espacio ff` para buscar. Si Rowly le cambia esas teclas, se
  siente como un emulador y no como vim.
- **El modo vim tiene que controlar todo Rowly**, no solo el editor: el grid,
  el explorador, los archivos, las pestañas y la terminal.
- **Ergonomía.** Hoy hay atajos que obligan a estirar la mano: Ctrl+Alt+↑/↓,
  Alt+Insert, Ctrl+F4, Ctrl+Shift+W seguido de flechas y teclas F. Se
  reordena todo pensando en la posición de las manos sobre un QWERTY.
- **La terminal es de la shell y de las IA.** Claude Code usa Ctrl+B, D, E,
  G, J, K, L, O, R, S, T, U, W, Y y Z, Ctrl+X como prefijo de combinaciones,
  Ctrl+Enter, Esc, Shift+Tab, Ctrl+Shift+- y Alt+B, D, F, M, O, P, T, V e Y.
  La shell (readline/zle) usa casi todo Ctrl+letra.

## Principios de ergonomía (QWERTY)

1. **Fila base primero.** Las acciones más frecuentes (moverse entre zonas,
   ejecutar, guardar, cambiar de pestaña) van a teclas de la fila base o a
   una tecla de distancia: `h j k l`, `s`, `f`, `Enter`, `Tab`.
2. **Modificador con una mano y tecla con la otra.** `Ctrl` con el meñique
   izquierdo y la tecla con la derecha (`Ctrl+h/j/k/l` en vim,
   `Ctrl+Shift+flechas` en escritorio) es lo más rápido y lo que menos
   cansa. Tres teclas con la misma mano (`Ctrl+Shift+letra`) quedan solo
   para acciones poco frecuentes o para la terminal.
3. **En vim, nunca un modificador si basta la líder.** `Espacio` se pulsa
   con el pulgar, así que `Espacio` + 1 o 2 letras es más rápido y cansa
   menos que cualquier Ctrl. No hay secuencias de más de tres teclas.
4. **Nemotecnia de NvChad.** `f` = buscar (find), `x` = cerrar, `b` =
   buffer nuevo, `e` = explorador, `c` = código o cheatsheet, `t` = tema,
   `/` = comentar. Así no hace falta aprender un mapa propio.
5. **Seguras en teclado español y en todo sistema:** nada que pase por AltGr
   (`[ ] { } \ @ #` en ES; en vim, `[`/`]` se tolera porque es lo nativo),
   nada con teclas muertas (`` ` ´ ^ ``), nada de Ctrl+Alt+letra (es AltGr
   en Windows), nada con Super (gestor de ventanas), nada de Ctrl+Alt+flechas
   (escritorios en GNOME) y sin teclas F como tecla principal.
6. **Una acción, una tecla, en cualquier zona.** Moverse entre zonas y
   mostrar u ocultar la terminal se hace igual desde la terminal que desde
   el resto: solo cambia el contexto. Para lo demás, dentro de la terminal
   Rowly solo toma la capa Ctrl+Shift, como cualquier emulador
   (Ctrl+Shift+C/V), y el resto va a la shell y a las IA.
7. **Recomendación en la hoja de atajos:** usar Bloq Mayús como Ctrl. Es lo
   habitual entre usuarios de vim y lleva todo `Ctrl+…` a la fila base.

## Los dos modos

- **Escritorio** (por defecto). Ctrl+letra para lo clásico, sin estados.
- **Vim** (extensión). Las zonas de texto (el editor) tienen modo normal,
  inserción y visual. Las zonas sin texto (grid, explorador, archivos,
  pestañas) siempre están en modo normal: `h/j/k/l`, `Espacio` y las demás
  teclas de vim funcionan ahí sin entrar a ningún modo. La terminal siempre
  está en modo terminal: sus teclas van a la shell, como en el modo terminal
  de Neovim.
- **La líder (`Espacio`) solo actúa en modo normal.** En inserción, en los
  campos de texto, en la terminal y durante una composición IME, `Espacio`
  escribe un espacio.
- **Which-key.** Si tras `Espacio` no llega otra tecla en 300 ms, aparece un
  panel con las teclas que siguen, igual que en NvChad. La secuencia se
  cancela con Esc o al cabo de 1 s sin teclas (`timeoutlen`).
- **Los atajos con Ctrl del modo escritorio siguen en el modo vim**, salvo
  los que vim usa en el editor (ver
  [Lo que Rowly cede a vim](#lo-que-rowly-cede-a-vim-en-el-editor)).

## Moverse por la app

| Acción | Escritorio | Vim | Nota |
|---|---|---|---|
| Ir a la zona de la izquierda / abajo / arriba / derecha | **Ctrl+Shift+← ↓ ↑ →** | **Ctrl+h/j/k/l** | Funciona igual en todas las zonas, también en la terminal. En vim es lo de NvChad. Sustituye a Ctrl+Shift+W + flechas: sin prefijo. |
| Siguiente / anterior pestaña de la zona | **Ctrl+Tab / Ctrl+Shift+Tab** (alias: Ctrl+PageDown/PageUp) | **`Tab` / `Shift+Tab`** (también `gt` / `gT`) | NvChad usa Tab entre buffers. PageUp/PageDown obligan a usar Fn en los portátiles; queda solo como alias. |
| Ir a la pestaña 1…9 | **Ctrl+1…9** | **`Espacio 1…9`** | Como en los navegadores. |
| Mostrar / ocultar el explorador | **Ctrl+E** | **`Espacio e`** | E de explorador, la misma letra en los dos modos. |
| Mostrar / ocultar la terminal | **Ctrl+T** | **`Espacio t`** | Ctrl+T funciona también desde dentro de la terminal. |
| Volver al editor desde cualquier zona | Esc | Esc | Como ahora: solo si la zona no usa Esc para otra cosa. |

Cambiar de pestaña actúa según el foco: en el editor, entre consolas; en el
panel inferior, entre Salida, resultados y Terminal; en la terminal, entre
sesiones.

## Pestañas, archivos y conexiones

| Acción | Escritorio | Vim | Nota |
|---|---|---|---|
| Nueva consola | **Ctrl+N** | **`Espacio b`** | Antes Ctrl+Shift+Q. `Espacio b` es el buffer nuevo de NvChad. |
| Cerrar pestaña | **Ctrl+W** | **`Espacio x`** (también `:q`) | Antes Ctrl+F4. Ctrl+W vuelve a su uso universal, fuera de la terminal. |
| Renombrar pestaña | **Ctrl+Shift+R** (alias: F2) | **`Espacio ra`** | Es poco frecuente, así que puede llevar tres teclas. `ra` = rename, como en NvChad. |
| Guardar | Ctrl+S | Ctrl+S, **`Espacio w`**, `:w` | NvChad también guarda con Ctrl+S. `w` = write. |
| Guardar como | Ctrl+Shift+S | `:saveas` | |
| Abrir archivo SQL | Ctrl+O | **`Espacio ff`** (también `:e`) | `ff` = find files. |
| Lista de consolas abiertas | | **`Espacio fb`** | `fb` = find buffers. |
| Historial de consultas | **Ctrl+H** | **`Espacio fo`** | H de historial. `fo` = oldfiles, lo reciente. |
| Cambiar de conexión | **Ctrl+Shift+O** (nuevo) | **`Espacio fc`** | Hoy no tiene tecla. Hace pareja con Ctrl+O. |

## Editor SQL

| Acción | Escritorio | Vim | Nota |
|---|---|---|---|
| Ejecutar sentencia (o la selección) | Ctrl+Enter | Ctrl+Enter | Igual en los dos: vim no usa Ctrl+Enter. En visual, ejecuta la selección. |
| Ejecutar script | Ctrl+Shift+Enter | Ctrl+Shift+Enter | |
| Cancelar ejecución | Esc (solo mientras corre) | **Ctrl+C** (y Esc en normal mientras corre) | En vim, Ctrl+C es "interrumpir". |
| Buscar | Ctrl+F | **`/`** (abre el buscador de Rowly), `n` / `N` | No es la búsqueda manual de vim: `/` abre el buscador de Rowly en la zona activa, y `n`/`N` van al resultado siguiente o anterior. |
| Reemplazar | Ctrl+R | **`Espacio sr`** | Abre el reemplazo de Rowly. `sr` = search & replace. Ctrl+R pasa a vim (rehacer). |
| Formatear SQL | Ctrl+L | **`Espacio fm`** | En vim, Ctrl+l es moverse a la derecha. `fm` = format, como en NvChad. |
| Comentar línea / selección | Ctrl+/ | **`Espacio /`**, `gcc`, `gc` | Igual que NvChad. |
| Error siguiente / anterior | **Alt+N / Alt+P** | **`]d` / `[d`** | Antes F2 / Shift+F2. N y P = next / previous; `]d`/`[d` es lo nativo de Neovim. |
| Detalle del error o del símbolo | Ctrl+. | **`K`** | `K` es el hover de vim: muestra el error si hay uno bajo el cursor y, si no, la ficha de la tabla o la columna. |
| Lista de errores | | **`Espacio ds`** | `ds` = diagnostics, como en NvChad. |
| Arreglo rápido | Alt+Enter | **`Espacio ca`** | `ca` = code action, como en NvChad. |
| Ir a la tabla en el explorador | **Ctrl+B** (y Ctrl+clic) | **`gd`** | Ctrl+B es "ir a la declaración" en JetBrains y DataGrip. |
| Seleccionar todo | Ctrl+A | `ggVG` | Ctrl+A pasa a vim (incrementar). |
| Números de línea / relativos | | `Espacio n` / `Espacio rn` | Como en NvChad. |

## Resultados (grid)

| Acción | Escritorio | Vim | Nota |
|---|---|---|---|
| Moverse | flechas, Tab, Ctrl+Inicio/Fin | `h/j/k/l`, `w`/`b` (columna), `0`/`$`, `gg`/`G`, `Ctrl+d`/`Ctrl+u` | |
| Seleccionar | Shift+flechas | `v` (celdas), `V` (filas) | |
| Editar celda | **Enter** (alias: F2) | `i`, `a`, Enter | Esc cancela. |
| Añadir fila | **Ctrl+I** | `o` / `O` (debajo / encima) | Antes Alt+Insert: muchos portátiles no tienen Insert. |
| Borrar filas | **Ctrl+Delete** | `dd` | Antes Ctrl+Y, que pasa a rehacer. |
| Deshacer / rehacer cambio | **Ctrl+Z / Ctrl+Shift+Z** (alias: Ctrl+Y) | `u` / `Ctrl+r` | Antes Ctrl+Alt+Z. |
| Aplicar cambios | Ctrl+Enter, **Ctrl+S** | `:w`, Ctrl+S | Guardar es lo que todos esperan. |
| Copiar / pegar | Ctrl+C / Ctrl+V | `y`/`yy` / `p` | |
| Página siguiente / anterior | **Alt+→ / Alt+←** | **`]]` / `[[`** | Antes Ctrl+Alt+↓/↑ (escritorios de GNOME, AltGr). Alt+↑/↓ queda para mover línea en el editor. |
| Buscar en el resultado | Ctrl+F | `/`, `n`, `N` | El buscador de Rowly, como en el editor. |

## Explorador y archivos

En el modo vim se usan las teclas de nvim-tree, el explorador de NvChad.

| Acción | Escritorio | Vim |
|---|---|---|
| Moverse | ↑/↓ | `j`/`k`, `gg`/`G` |
| Expandir / plegar | → / ← | `l` / `h` |
| Abrir (tabla: datos; archivo: consola) | Enter | Enter, `o` |
| Ficha de la tabla (DDL) | Ctrl+. | `K` |
| Copiar nombre / ruta | Ctrl+C | `y` / `gy` |
| Nuevo archivo | Ctrl+N (en el árbol de archivos) | `a` |
| Renombrar | **Ctrl+Shift+R** (alias: F2) | `r` |
| Mover a la papelera | Delete | `d` |
| Recargar | | `R` |
| Filtrar | Ctrl+F | `f`, `/` |

## Dentro de la terminal (los dos modos)

Todo va a la shell y a las IA: Ctrl+letra (también Ctrl+X como prefijo),
Esc (en Claude Code interrumpe), Shift+Tab, Ctrl+Enter, Ctrl+J,
Shift+Enter, Alt+letras y Ctrl o Alt con flechas. Por eso **no se usa Esc
ni el Ctrl+X de NvChad para salir**. Rowly solo toma estas:

| Acción | Tecla | Nota |
|---|---|---|
| Ir a otra zona | Escritorio: **Ctrl+Shift+flechas**; vim: **Ctrl+h/j/k/l** | La misma tecla que en el resto de la app. |
| Ocultar la terminal | Escritorio: **Ctrl+T** | En vim, la líder no llega a la terminal: se sale con Ctrl+h/j/k/l y se oculta con `Espacio t`. |
| Nueva sesión | **Ctrl+Shift+T** | Como en GNOME Terminal. |
| Cerrar la sesión | **Ctrl+Shift+W** | Como en GNOME Terminal. |
| Siguiente / anterior sesión | **Ctrl+Tab / Ctrl+Shift+Tab** | Claude Code y la shell no los usan. |
| Renombrar la sesión | Ctrl+Shift+R | |
| Copiar / pegar | Ctrl+Shift+C / Ctrl+Shift+V | |

Ctrl+Shift+- no se toma: en Claude Code es deshacer.

### Lo que la terminal pierde

- **Escritorio:** Ctrl+T, que en Claude Code es la lista de tareas.
  Ctrl+Shift+flechas casi no se usa en la shell ni en Claude Code.
- **Vim:** Ctrl+H (borrar: Retroceso sigue), Ctrl+J (salto de línea en
  Claude Code: queda Shift+Enter o `\` + Enter), Ctrl+K (borrar hasta el
  final de la línea) y Ctrl+L (limpiar la pantalla: queda `clear`).

## Ayuda y ajustes

| Acción | Escritorio | Vim | Nota |
|---|---|---|---|
| Hoja de atajos | **Ctrl+?** (alias: F1) | **`Espacio ch`** | `ch` = cheatsheet, como en NvChad. |
| Ajustes | **Ctrl+,** | Ctrl+, | Como en VS Code y la mayoría de apps. La coma no pasa por AltGr. |
| Tema | | `Espacio th` | Como en NvChad. |

## Lo que Rowly cede a vim en el editor

En modo vim, con el foco en el editor, estas teclas son de vim y no de
Rowly. Cada acción de Rowly que se pierde tiene su equivalente con la líder.

| Tecla | En vim | Rowly la usa en escritorio para | Equivalente en vim |
|---|---|---|---|
| Ctrl+R | rehacer | reemplazar | `Espacio sr` |
| Ctrl+E / Ctrl+Y | desplazar línea | explorador / — | `Espacio e` |
| Ctrl+F / Ctrl+B | página | buscar / ir a la tabla | `/` / `gd` |
| Ctrl+D / Ctrl+U | media página | — | |
| Ctrl+O / Ctrl+I | saltos atrás / adelante | abrir / añadir fila | `Espacio ff` |
| Ctrl+A / Ctrl+X | incrementar / decrementar | seleccionar todo | `ggVG` |
| Ctrl+V | visual por bloque | pegar | `p` |
| Ctrl+W | prefijo de ventana | cerrar pestaña | `Espacio x`, `:q` |
| Ctrl+T | volver en la pila de etiquetas | terminal | `Espacio t` |
| Ctrl+L | redibujar | formatear | `Espacio fm` |
| Ctrl+N / Ctrl+P | autocompletado (inserción) | nueva consola | `Espacio b` |
| Ctrl+H/J/K/L en inserción | mover el cursor (como en NvChad) | — | Esc y luego Ctrl+h/j/k/l para cambiar de zona |

En modo vim, Rowly conserva en el editor: Ctrl+S, Ctrl+Enter,
Ctrl+Shift+Enter, Ctrl+h/j/k/l (en normal), Ctrl+Tab, Ctrl+, y la capa
Ctrl+Shift.

## Comandos ex

`:w` guardar (en el grid: aplicar cambios), `:wa` guardar todo, `:q`
cerrar pestaña, `:e <archivo>` abrir, `:saveas` y `:{n}` ir a la línea.
Buscar y reemplazar no usan `:s`: van al buscador de Rowly (`/` y
`Espacio sr`).

## Cambios respecto a hoy

| Acción | Hoy | Escritorio propuesto |
|---|---|---|
| Moverse entre zonas | Ctrl+Shift+W + flechas | Ctrl+Shift+flechas, sin prefijo |
| Explorador | Alt+1 | Ctrl+E |
| Historial de consultas | Ctrl+E | Ctrl+H |
| Nueva consola | Ctrl+Shift+Q | Ctrl+N |
| Cerrar pestaña | Ctrl+F4 | Ctrl+W |
| Renombrar | Shift+F6 | Ctrl+Shift+R |
| Error siguiente / anterior | F2 / Shift+F2 | Alt+N / Alt+P |
| Hoja de atajos | F1 | Ctrl+? (F1 queda de alias) |
| Añadir fila | Alt+Insert | Ctrl+I |
| Borrar filas | Ctrl+Y | Ctrl+Delete |
| Deshacer cambio | Ctrl+Alt+Z | Ctrl+Z |
| Página del resultado | Ctrl+Alt+↓ / ↑ | Alt+→ / ← |

El prefijo Ctrl+Shift+W (commit `a93150b`, en la rama de la terminal)
desaparece: dentro de la terminal, Ctrl+Shift+W pasa a cerrar la sesión.

**Costo aceptado en escritorio:** Ctrl+Shift+←/→ deja de seleccionar por
palabras en el editor y en los campos de texto. Shift+flechas, Shift+Inicio
y Shift+Fin siguen seleccionando.

## Decisiones abiertas

- **Modo normal en la terminal** (recorrer el historial con vim, como
  `Ctrl+\ Ctrl+n` en Neovim). Queda fuera de la primera versión:
  `Ctrl+\` pasa por AltGr en teclado español.

## Al implementar

- `commands.ts`: cambiar `defaultKeys`, permitir alias (más de una tecla
  por comando) y añadir los comandos que faltan: pestaña siguiente/anterior
  e ir a la pestaña N por zona, sesión nueva y cerrar sesión, renombrar la
  pestaña activa, cambiar de conexión, ajustes, lista de errores e ir a la
  tabla (hoy solo existe con Ctrl+clic, en `sqlDefinitionLink.ts`).
- `keybindings.ts`: dentro de `[data-terminal]` solo pasan moverse entre
  zonas, Ctrl+T (escritorio), la capa Ctrl+Shift y Ctrl+Tab.
- `focusZones.ts`: quitar el modo mover (prefijo, Ctrl apretado y plazo);
  Ctrl+Shift+flechas (escritorio) y Ctrl+h/j/k/l (vim) llaman a `moveFocus`
  directo.
- Modo vim: la extensión registra un mapa de teclas por modo sobre los
  mismos ids de comando, más la líder, which-key y los comandos ex. El host
  (plataforma de extensiones) ya prevé "comandos y teclas del editor"; hay
  que ampliarlo a grid, explorador y pestañas.
- Quitar las teclas F fijas como principales (quedan como alias donde se
  indica).
- Quien ya personalizó un atajo en Ajustes conserva el suyo.
- Actualizar la hoja de atajos, `i18n/messages/shortcuts.ts`,
  ARCHITECTURE y las pruebas (`focusZones.keys.test.ts`, `resources.mjs`
  usa Ctrl+T para la terminal).
