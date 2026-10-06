# Terminal integrada ligera

**Estado:** aprobada, sin implementar (2026-10-05). Plan temporal: al cerrar,
lo que quede vigente pasa a [ARCHITECTURE](../ARCHITECTURE.es.md) y esta spec
se elimina.

## 1. Objetivo

Abrir el shell real del usuario dentro de Rowly DB: mostrar entrada y salida,
aceptar teclado, redimensionar bien, cerrar limpiamente sin procesos
huérfanos, sin coste en reposo e integrada con el tema de la app.

## 2. No objetivos

Pestañas o splits de terminal, multiplexación, SSH o terminal remota,
perfiles, temas propios, ligaduras, imágenes (sixel, kitty), serialize,
restaurar sesión, historial, autocompletado o paleta propios, shell
integration, enlaces inteligentes, drag and drop, extensiones, selector de
fuente y "shell limpio". El historial, los alias, el prompt y el completado
son del shell.

## 3. Dependencias exactas

| Paquete | Versión | Licencia | Para qué |
|---|---|---|---|
| `@xterm/xterm` | `6.0.0` (latest, 2026-08) | MIT | Emulador y buffer visual |
| `@xterm/addon-fit` | `0.11.0` | MIT | Píxeles → `cols`/`rows` |
| `portable-pty` | `=0.9.0` (crates.io, 2025-02) | MIT | PTY y proceso en Linux, macOS y Windows (ConPTY) |

Transitivas nuevas en Rust (Linux): `filedescriptor` (MIT), `nix` 0.28 (MIT),
`serial2` (BSD-2-Clause OR Apache-2.0), `shell-words` (MIT/Apache-2.0),
`cfg_aliases` (MIT); solo Windows: `winreg` (MIT), `shared_library`
(Apache-2.0/MIT). Todas compatibles con `MIT OR Apache-2.0`.

**Fit es necesario:** la medida de la celda no es API pública de xterm; sin
el addon habría que leer `_core` privado. 0,8 KB gzip.

**Sin** `addon-webgl`, `addon-search`, `addon-web-links`, `addon-image`,
`addon-ligatures`, `addon-serialize`. xterm 6 ya no trae el renderer canvas:
el renderer DOM del núcleo es el único. WebGL solo entra si la prueba de
salida grande (P4, §15) falla por pintado y la medición demuestra que WebGL lo
resuelve en WebKitGTK.

## 4. Arquitectura mínima

```text
Terminal.svelte ── terminal.ts (invoke + import() de xterm)
     │  create_terminal / write_terminal / resize_terminal / close_terminal
     ▼
src-tauri/src/terminal.rs
  AppState.terminals: Mutex<HashMap<u32, TerminalSession>>
  TerminalSession { window, writer: Arc<Mutex<Box<dyn Write>>>, master, killer }
  dos hilos por terminal: el lector (reader) y el que espera (Child)
     ▼
portable-pty → shell
```

- **Dueño del PTY:** el backend. El frontend solo conoce `terminalId: u32`.
- **Salida:** cada `create_terminal` recibe dos `tauri::ipc::Channel`:
  `output` (bytes crudos, `InvokeResponseBody::Raw` → `ArrayBuffer`) y
  `exit` (`Option<u32>`, el `exit_code` de portable-pty). Son los `terminal_output` y `terminal_exit` del
  diseño, pero atados a la WebView que abrió la terminal: no hay eventos
  globales ni JSON de arrays de bytes.
- Cada comando recibe la `Window` que lo invoca y rechaza un `terminalId` de
  otra ventana.
- No se mantiene el lock del registro durante E/S bloqueante: se clona el
  `Arc` del writer y se suelta.
- Sin traits ni capas propias: un módulo Rust y dos archivos de frontend.
  `terminal.ts` entra con el backend (T1): `lib.rs` exige que cada comando
  registrado lo invoque el frontend y `backend.test.ts` le fija un dueño.

### Ubicación en la UI

Como el panel Terminal de DataGrip: **un panel inferior por ventana**, a todo
el ancho del área de trabajo y debajo del editor y los resultados. No es una
pestaña de `ResultPane`, que pertenece a cada consola.

- **Se muestra y oculta** con `Alt+F12` (el atajo de DataGrip; no depende de
  la distribución del teclado, mientras que la tecla de la tilde invertida es
  muerta en los teclados en español) y con un botón con el icono
  `SquareTerminal` de Lucide. Ambos aparecen en la hoja de atajos.
- **La primera vez que se muestra** se carga xterm y se crea el shell.
  **Ocultar** no lo cierra: el proceso sigue vivo y el `Terminal.svelte`
  queda montado y oculto, así que no se reconstruye el buffer. **Cerrar**
  (botón en la cabecera, o `exit` en el shell) mata el proceso; la próxima
  vez que se muestra, el shell es nuevo. Cerrar la ventana la cierra.
- **No debe confundirse con el grid de resultados.** Se distingue así:
  - una cabecera propia de panel de herramientas: icono, «Terminal», el
    nombre del shell (`zsh`, `pwsh`) y el cwd abreviado. A la derecha, solo
    ocultar y cerrar. No tiene fila de pestañas ni barra de grid ni
    paginador;
  - un splitter propio entre resultados y terminal, que reutiliza el estilo
    de `.splitter` y `onePerFrame`. La altura se guarda en `localStorage`
    con el mismo patrón que `sidebarLayout`;
  - el fondo y el texto salen de `editorPalette` (como el editor, no como el
    grid) y la fuente es monoespaciada en todo el panel;
  - sin estado vacío ni texto de bienvenida: el prompt del shell es el
    contenido.
- **Foco:** al mostrar, el foco va a la terminal; al ocultar, vuelve a donde
  estaba. Con el foco dentro, los atajos globales no se despachan (§9).
- El detalle visual (espaciado, cabecera, transición) se cierra con una
  pasada de diseño sobre la app real antes del PR, con capturas en tema claro
  y oscuro.

## 5. Lifecycle

**Abrir:** `openpty(cols, rows)` → `spawn_command` → **soltar el `slave`** en
el proceso de Rowly (si no, el lector nunca ve EOF) → id al registro → dos
hilos.

**Hilo lector:** `read` bloqueante en buffer de 64 KiB → `output.send`,
hasta el EOF (o `EIO` en Linux, que es el EOF de un PTY). Sin polling: está
dormido en `read`.

**Hilo que espera:** `child.wait()` (recoge el shell: sin zombis) → quita la
sesión del registro y suelta el PTY → `exit.send(code)`. Va aparte del
lector porque el fin de la lectura no siempre llega con el shell muerto: un
proceso que el usuario separó (`setsid`) puede seguir con el PTY abierto, y
en Windows ConPTY no da EOF hasta que se cierra la pseudoconsola. Esperar
tras el EOF dejaba al shell zombi en el primer caso y sin aviso en el
segundo.

**Cerrar (`close_terminal`):** `killer.kill()` (en Unix el killer clonado de
portable-pty solo manda `SIGHUP`; en Windows, `TerminateProcess`) → hasta
500 ms a que el que espera quite la sesión → si el shell sigue (ignora
`SIGHUP`), se saca del registro y se suelta el PTY igual: el cuelgue del
terminal y el fin de su entrada lo terminan. **Primero la señal y después
el PTY:** al soltarse, el writer de portable-pty escribe un salto de línea y
un EOF; con el shell vivo eso ejecutaría lo que el usuario dejó escrito en
el prompt. Corre en `spawn_blocking`.

**Hijos:** el shell es líder de sesión (`setsid` de portable-pty) y el
colgado de la terminal llega a sus trabajos; `bash` y `zsh` reenvían
`SIGHUP` a sus jobs al salir. Un proceso que el usuario separó a propósito
(`nohup`, `disown`, `setsid`) sobrevive: es su decisión, no un huérfano de
Rowly. portable-pty cierra en el hijo los descriptores heredados, así que
el shell no recibe sockets de base de datos de Rowly.

**Ventana:** el `WindowEvent::Destroyed` que ya limpia `connections` cierra
también las terminales con ese `window`, en un hilo aparte (la espera de
`close` no va en el hilo de la interfaz).

**App:** `RunEvent::Exit` cierra todas. Es obligatorio y explícito: con
`panic = "abort"` y `process::exit` no corren los `Drop` del estado. Si
Rowly muere sin limpiar, el kernel cierra el master y el shell recibe
`SIGHUP` igual.

**Frontend:** al desmontar `Terminal.svelte`: `close_terminal`,
`term.dispose()`, desconectar el `ResizeObserver` y las suscripciones.

## 6. Shell por plataforma

Se usa `CommandBuilder::new_default_prog()` sin lógica propia:

- **Linux:** `$SHELL` si es ejecutable; si no, el de `/etc/passwd`
  (`getpwuid`); si no, `/bin/sh`. Arranca como shell de login (`argv[0] =
  -zsh`), igual que un Terminal de macOS.
- **macOS:** mismo código. Al lanzarse desde Finder `$SHELL` puede faltar y
  manda passwd. El modo login ejecuta `/etc/zprofile` (`path_helper`), que
  arma el `PATH` real que la app GUI no hereda.
- **Windows:** PowerShell; si no está, `%ComSpec%` (`cmd.exe`). Se busca en
  el `PATH` heredado, en este orden: `pwsh.exe` (PowerShell 7, si el usuario
  lo instaló), `powershell.exe` (Windows PowerShell 5.1, incluido en Windows
  10 y 11) y, si no hay ninguno, `new_default_prog()`, que usa ComSpec. Se
  lanza con `-NoLogo`. Es una búsqueda de existencia de archivo en los
  directorios del `PATH`, sin leer el registro ni la configuración de
  Windows Terminal.

## 7. Cwd

La carpeta SQL vinculada al perfil de la conexión
(`sqlFolders.folderByProfile[profileId]`) si existe; si no, `HOME`. Si la
ruta ya no es un directorio, portable-pty cae a `HOME`. Sin selector.

## 8. Entorno

Se hereda el del proceso. Solo se definen `TERM=xterm-256color` y
`COLORTERM=truecolor` (portable-pty no pone `TERM`). Se quita
`WEBKIT_DISABLE_DMABUF_RENDERER` **solo si lo puso `webkit_env`**, porque es
de Rowly y no del usuario. No se toca `PATH` ni `HOME` ni ninguna credencial:
Rowly no escribe en el shell salvo lo que teclea el usuario.

## 9. Input y output

- **Input:** `term.onData` → `write_terminal(id, data)` tal cual (Ctrl+C,
  Ctrl+D, flechas, secuencias). `term.onBinary` (reportes de ratón en modo
  binario) → bytes latin1. Sin reinterpretar nada.
- **Copiar/pegar:** Ctrl+Shift+C copia la selección y Ctrl+Shift+V llama
  `term.paste()` usando `clipboard.ts`, que ya existe. Es lo único que se
  intercepta.
- **Atajos de Rowly:** con el foco en la terminal no se despachan los atajos
  globales (Ctrl+R, Ctrl+W, Ctrl+Enter, etc. son del shell), salvo el que
  muestra u oculta la terminal.
- **Output:** batching natural, sin timers: cada `read` devuelve hasta 64 KiB;
  un eco de tecla es un mensaje pequeño (Tauri lo entrega por `eval` si
  mide menos de 1 KiB) y una ráfaga son pocos mensajes grandes (por `fetch`).
- **Control de flujo:** `channel.send` no bloquea, así que un productor
  infinito (`yes`) acumularía mensajes sin límite. Primero se mide (P4, §15).
  Si la memoria crece, se añade lo mínimo: un quinto comando
  `ack_terminal(id, bytes)` que el frontend llama desde el callback de
  `term.write`, y el hilo lector se detiene con más de 1 MiB sin confirmar.
  Al detenerse el lector se llena el buffer del PTY y el kernel frena al
  productor. Es lo que recomienda la guía de flow control de xterm.js.

## 10. UTF-8

El backend no decodifica: envía bytes. `term.write(Uint8Array)` usa el
decodificador UTF-8 incremental de xterm, que guarda la secuencia incompleta
entre llamadas. No hay `String::from_utf8` por chunk en ningún punto.

## 11. Resize

`ResizeObserver` del contenedor → `fit.proposeDimensions()` agrupado con
`onePerFrame` (ya existe, un `requestAnimationFrame`) → si `cols`/`rows`
cambiaron, `fit.fit()` y `resize_terminal(id, cols, rows)` (`TIOCSWINSZ`, el
kernel manda `SIGWINCH`). Sin debounce por tiempo; los píxeles que no
cambian la cuadrícula no llaman al backend.

## 12. Límites de memoria

- La salida no pasa por stores de Svelte ni se guarda en el backend: va del
  `read` al `Channel` y de ahí a `term.write`.
- El buffer es el de xterm, con scrollback acotado.
- Cada terminal: 1 hilo lector y 64 KiB de buffer en Rust.
- Si hace falta flow control: como máximo 1 MiB en vuelo por terminal.

## 13. Scrollback

**5000 líneas.** Una celda ocupa unos 12 bytes en xterm. Con 120 columnas el
buffer lleno ocupa unos 7 MB, y con 200 columnas unos 12 MB: un techo
conocido. 5000 líneas bastan para revisar la salida de un comando; para
salidas más largas se usa `| less` o un archivo. El valor por defecto de
xterm (1000) es corto para un log y 10 000 duplica la memoria sin ventaja
clara.

## 14. Presupuesto de rendimiento

Línea base: se mide **antes** de tocar código, en la misma máquina, con las
herramientas de [tools/bench](../../tools/bench/README.es.md) (y se guarda
en `baseline/terminal-pre`).

| Métrica | Medido ya (aprox.) | Presupuesto |
|---|---|---|
| JS inicial (`bundle.py`) | 442,7 → 442,8 KB gzip con xterm lazy | +0 (dentro de 1 KB) |
| Chunk de la terminal | +80,6 KB gzip JS y +1,9 KB gzip CSS | ≤ 90 KB gzip |
| Binario release | probe aislado: portable-pty pesa poco (cientos de KB) | ≤ +300 KB |
| PSS con 0 terminales | — | dentro de la dispersión de la base (xterm no cargado) |
| PSS con 1 terminal idle (sin el shell) | — | ≤ +15 MB |
| Tras 100 ciclos | — | heap vivo ±10 % o 2 MB y backend `Anonymous` ±5 % o 2 MB, como `resources.mjs` |
| CPU en reposo | — | ningún `setInterval` ni llamada al backend; mismo umbral que el reposo actual |
| Abrir shell (hasta el primer byte) | 59 ms mediana, bash de login en esta máquina | ≤ 150 ms sin contar el rc del usuario; primera carga del chunk ≤ 100 ms |
| Salida grande | — | ver P4 (§15) |

`cursorBlink` queda en `false` (por defecto en xterm): un cursor que parpadea
es un timer permanente.

**Lazy-load: sí.** `terminal.ts` hace `import('@xterm/xterm')` y el CSS al
abrir la primera terminal. La medición muestra que no complica el build (Vite
lo separa solo) y ahorra 80 KB gzip a quien no usa la terminal.

## 15. Pruebas

Rust (`src-tauri`, PTY real, Linux y macOS en CI):

- **P1 Abrir/cerrar:** abre el shell por defecto, recibe bytes; `close` deja
  el registro vacío y el pid deja de existir.
- **P2 Resize:** `resize(100, 30)` y luego `stty size` responde `30 100`.
- **P3 UTF-8 partido:** `printf '\xe2\x82'; sleep 0.1; printf '\xac'` llega
  en dos chunks y concatenado es `€`. En frontend (vitest): `term.write` de
  las dos mitades sin `open()` deja `€` en el buffer.
- **P5 Lifecycle (backend):** 100 aperturas y cierres, cada shell con un job (`sleep
  1000 &`) y uno en primer plano: al final el registro está vacío, no queda
  ningún descendiente de Rowly en `/proc` y los hilos vuelven a la base.

E2E (`tests/e2e/resources.mjs`, app real en WebKitGTK):

- **P4 Salida grande:** `head -c 50M /dev/urandom | base64` termina; durante la
  ráfaga ninguna tarea larga pasa de 200 ms y una tecla en otro control se
  pinta. Además, `yes` durante 30 s: la memoria se aplana. Si no se aplana,
  se añade el control de flujo de §9 y se repite.
- **P5 Lifecycle (UI):** 100 ciclos de abrir y cerrar la terminal con el mismo
  criterio de heap y backend que los ciclos actuales.
- **P6 Idle:** 300 s con una terminal abierta: sin `setInterval`, sin llamadas
  al backend y sin bytes por el canal.

## 16. Riesgos

- **Control de flujo.** Es probable que `yes` lo exija (§9). Está diseñado
  pero solo entra si la prueba lo demuestra.
- **WebKitGTK + renderer DOM.** Puede pintar más lento que Chromium con
  salidas enormes. Es un problema de velocidad, no de corrección; WebGL solo
  entra con medición.
- **Atajos globales** que roban teclas al shell (Ctrl+R, Ctrl+W). Hay que
  revisar `keybindings.ts` y `focusZones.ts`.
- **Entorno de AppImage** (`LD_LIBRARY_PATH`, `GIO_MODULE_DIR`…) puede pasar
  al shell y romper programas del usuario. Se comprueba con `env` dentro de
  la AppImage antes de publicar. No se limpia por adelantado.
- **Windows** no se prueba en local: la elección pwsh → powershell → ComSpec
  y ConPTY solo se verifican en CI y en una máquina real antes de publicar.
  La función que elige el shell recibe el `PATH` como argumento y tiene un
  test unitario que corre en todas las plataformas.
- **Shell de login en Linux:** lee `~/.profile`/`~/.zprofile`, y algunos
  emuladores no lo hacen. Es lo que hace portable-pty; se documenta.
- **Colores ANSI en temas claros:** se usa la paleta por defecto de xterm.
  Si alguno no se lee, se valora `minimumContrastRatio` (opción del núcleo),
  no un tema propio.
- **portable-pty** sale del monorepo de WezTerm y publica poco (0.9.0 es de
  2025-02). Su API es estable y pequeña, y se fija con `=0.9.0`.

## 17. Criterios de cierre

- Cuatro comandos (cinco si P4 exige `ack_terminal`), un módulo Rust y
  `Terminal.svelte` + `terminal.ts`; ningún store nuevo ni copia del buffer.
- Las pruebas de §15 pasan en CI (Rust en Linux y macOS; E2E en Linux) y en
  la app real con servidores reales.
- Las métricas de §14 se miden antes y después; las diferencias quedan
  dentro del presupuesto o explicadas.
- Se verifica a mano en Linux (bash, zsh, fish) y se comprueba la AppImage;
  Windows y macOS quedan con una prueba manual cada uno antes de la release.
- El panel cumple «Ubicación en la UI» (§4) y pasó la revisión visual con
  capturas en tema claro y oscuro.
- El tema cambia en vivo (`background`, `foreground`, `cursor`,
  `selectionBackground` desde `editorPalette`) y la fuente es la pila
  monoespaciada que la app ya usa
  (`ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas,
  monospace`).
- La arquitectura vigente pasa a ARCHITECTURE y esta spec se elimina.
