<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { get } from "svelte/store";
  import type { Terminal as Xterm, ITheme } from "@xterm/xterm";
  import type { FitAddon } from "@xterm/addon-fit";
  import { onePerFrame } from "$lib/onePerFrame";
  import { editorPalette } from "$lib/theming/theme";
  import { sqlFolders } from "$lib/stores/sqlFolders";
  import type { EditorPalette } from "$lib/theming/palettes";
  import { backendText } from "$lib/backend";
  import { ackTerminal, closeTerminal, createTerminal, resizeTerminal, writeTerminal, type TerminalInfo } from "$lib/terminal";

  // Una sesion de la terminal: su xterm y su shell. Oculta (visible = false)
  // deja el shell y el buffer como estan; desmontarla cierra el shell. El
  // buffer es el de xterm: la salida no pasa por ningun store.
  let {
    visible,
    focused = visible,
    profileId,
    oninfo,
    onexit,
    onerror,
  }: {
    visible: boolean;
    focused?: boolean;
    // El shell arranca en la carpeta SQL de este perfil; sin ella, en HOME.
    profileId: string;
    oninfo: (info: TerminalInfo) => void;
    // El shell termino (exit): el dueño quita la sesion.
    onexit: () => void;
    onerror: (message: string) => void;
  } = $props();

  // Lo procesado por xterm se confirma al backend de a 64 KiB (no por tecla);
  // el backend para de leer con 1 MiB sin confirmar.
  const ACK_BYTES = 64 * 1024;
  // La misma pila monoespaciada que el resto de la app.
  const FONT_FAMILY = 'ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace';

  let host: HTMLDivElement;
  let info: TerminalInfo | null = null;
  let term: Xterm | null = null;
  let fit: FitAddon | null = null;
  let observer: ResizeObserver | null = null;
  let unsubscribeTheme: (() => void) | null = null;
  let destroyed = false;
  let processed = 0;

  function written(bytes: number) {
    processed += bytes;
    if (processed < ACK_BYTES || !info) return;
    void ackTerminal(info.id, processed).catch(() => {});
    processed = 0;
  }

  function themeOf(palette: EditorPalette): ITheme {
    return {
      background: palette.background,
      foreground: palette.foreground,
      cursor: palette.caret,
      cursorAccent: palette.background,
      selectionBackground: palette.selection,
    };
  }

  // Un cambio de tamaño por cuadro, y al backend solo si cambia la
  // cuadricula (no cada pixel). Oculta mide 0: no se toca.
  const refit = onePerFrame(() => {
    if (!term || !fit || !info || host.clientWidth === 0) return;
    const proposed = fit.proposeDimensions();
    if (!proposed || (proposed.cols === term.cols && proposed.rows === term.rows)) return;
    fit.fit();
    void resizeTerminal(info.id, term.cols, term.rows).catch(() => {});
  });

  // Ctrl+Shift+C y Ctrl+Shift+V: lo unico que no va al shell. Con el
  // portapapeles del WebView, como el editor SQL.
  function clipboardKeys(event: KeyboardEvent): boolean {
    if (event.type !== "keydown" || !event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return true;
    if (event.code === "KeyC") {
      event.preventDefault();
      const selection = term?.getSelection();
      if (selection) void navigator.clipboard.writeText(selection).catch(() => {});
      return false;
    }
    if (event.code === "KeyV") {
      event.preventDefault();
      void navigator.clipboard
        .readText()
        .then((text) => text && term?.paste(text))
        .catch(() => {});
      return false;
    }
    return true;
  }

  onMount(async () => {
    const [{ Terminal }, { FitAddon }] = await Promise.all([
      import("@xterm/xterm"),
      import("@xterm/addon-fit"),
      import("@xterm/xterm/css/xterm.css"),
    ]);
    if (destroyed) return;
    term = new Terminal({
      scrollback: 5000,
      cursorBlink: false,
      fontFamily: FONT_FAMILY,
      fontSize: 13,
    });
    fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();
    unsubscribeTheme = editorPalette.subscribe((palette) => {
      if (term) term.options.theme = themeOf(palette);
    });
    const opened = term;
    try {
      info = await createTerminal(opened.cols, opened.rows, get(sqlFolders).folderByProfile[profileId] ?? null, {
        output: (bytes) => opened.write(bytes, () => written(bytes.length)),
        exit: () => onexit(),
      });
    } catch (error) {
      onerror(backendText(error));
      onexit();
      return;
    }
    if (destroyed) {
      void closeTerminal(info.id).catch(() => {});
      return;
    }
    oninfo(info);
    const id = info.id;
    opened.onData((data) => void writeTerminal(id, data).catch(() => {}));
    opened.onBinary((data) => void writeTerminal(id, data, true).catch(() => {}));
    opened.attachCustomKeyEventHandler(clipboardKeys);
    observer = new ResizeObserver(() => refit.set(undefined));
    observer.observe(host);
    if (visible && focused) opened.focus();
  });

  onDestroy(() => {
    destroyed = true;
    observer?.disconnect();
    refit.cancel();
    unsubscribeTheme?.();
    // Si el shell ya termino, el backend ya no la tiene: no hay nada que
    // decir.
    if (info) void closeTerminal(info.id).catch(() => {});
    term?.dispose();
    term = null;
    fit = null;
  });

  export function focus() { if (visible) term?.focus(); }

  // Varias sesiones pueden verse a la vez; solo una recibe el teclado.
  $effect(() => {
    // Primero se traslada el nodo a su nuevo grupo. Enfocarlo antes hacia
    // que focusin activara el grupo anterior durante un movimiento.
    if (visible && focused) void tick().then(() => {
      if (visible && focused && !destroyed) term?.focus();
    });
  });
</script>

<div class="terminal-host" class:hidden={!visible} data-terminal bind:this={host}></div>

<style>
  /* Todas en el mismo lugar; las ocultas con visibility, no display: none,
     para que xterm no se re-mida ni re-pinte al volver a mostrarse. */
  .terminal-host {
    position: absolute;
    inset: 0;
    pointer-events: auto;
    /* Sin aire arriba: la fila de sesiones ya deja el suyo bajo la pestaña. */
    padding: 0 0 0 var(--space-3);
  }

  .terminal-host.hidden {
    visibility: hidden;
    pointer-events: none;
  }

  .terminal-host :global(.xterm) {
    height: 100%;
  }

  /* xterm.css pinta el viewport de negro; debajo de la ultima fila tiene
     que verse el fondo del tema. */
  .terminal-host :global(.xterm .xterm-viewport) {
    background-color: transparent;
  }
</style>
