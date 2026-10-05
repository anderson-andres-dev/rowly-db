<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import type { Terminal as Xterm, ITheme } from "@xterm/xterm";
  import type { FitAddon } from "@xterm/addon-fit";
  import { ChevronDown, Terminal as TerminalIcon, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
  import { onePerFrame } from "$lib/onePerFrame";
  import { editorPalette } from "$lib/theming/theme";
  import { sqlFolders } from "$lib/stores/sqlFolders";
  import type { EditorPalette } from "$lib/theming/palettes";
  import { backendText } from "$lib/backend";
  import { closeTerminal, createTerminal, resizeTerminal, writeTerminal, type TerminalInfo } from "$lib/terminal";

  // El panel de la terminal integrada: una por ventana, debajo del editor y
  // los resultados. Ocultarlo (visible = false) deja el shell y el buffer
  // como estan; desmontarlo cierra el shell. El buffer es el de xterm: la
  // salida no pasa por ningun store.
  let {
    visible,
    profileId,
    onhide,
    onclose,
    onerror,
  }: {
    visible: boolean;
    // El shell arranca en la carpeta SQL de este perfil; sin ella, en HOME.
    profileId: string;
    onhide: () => void;
    // El shell termino (exit o el boton cerrar): el dueño desmonta el panel.
    onclose: () => void;
    onerror: (message: string) => void;
  } = $props();

  const HEIGHT_KEY = "khipu:terminal-height:v1";
  const MIN_HEIGHT = 96;
  const DEFAULT_HEIGHT = 240;
  // La misma pila monoespaciada que el resto de la app.
  const FONT_FAMILY = 'ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace';

  function storedHeight(): number {
    try {
      const value = Number(localStorage.getItem(HEIGHT_KEY));
      return Number.isFinite(value) && value >= MIN_HEIGHT ? value : DEFAULT_HEIGHT;
    } catch {
      return DEFAULT_HEIGHT;
    }
  }

  let height = $state(storedHeight());
  let panel: HTMLElement;
  let host: HTMLDivElement;
  let info = $state<TerminalInfo | null>(null);
  let term: Xterm | null = null;
  let fit: FitAddon | null = null;
  let observer: ResizeObserver | null = null;
  let unsubscribeTheme: (() => void) | null = null;
  let destroyed = false;

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
  // cuadricula (no cada pixel).
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
        output: (bytes) => opened.write(bytes),
        exit: () => onclose(),
      });
    } catch (error) {
      onerror(backendText(error));
      onclose();
      return;
    }
    if (destroyed) {
      void closeTerminal(info.id).catch(() => {});
      return;
    }
    const id = info.id;
    opened.onData((data) => void writeTerminal(id, data).catch(() => {}));
    opened.onBinary((data) => void writeTerminal(id, data, true).catch(() => {}));
    opened.attachCustomKeyEventHandler(clipboardKeys);
    observer = new ResizeObserver(() => refit.set(undefined));
    observer.observe(host);
    if (visible) opened.focus();
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

  // Al volver a mostrarse, el foco va al shell.
  $effect(() => {
    if (visible) term?.focus();
  });

  // --- Altura -------------------------------------------------------------

  function setHeight(next: number) {
    const available = (panel.parentElement?.clientHeight ?? 0) - 120;
    height = Math.round(Math.max(MIN_HEIGHT, Math.min(next, Math.max(MIN_HEIGHT, available))));
  }

  function saveHeight() {
    try {
      localStorage.setItem(HEIGHT_KEY, String(height));
    } catch {
      // Sin almacenamiento, la altura dura lo que la ventana.
    }
  }

  function startResize(event: PointerEvent) {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const bottom = panel.getBoundingClientRect().bottom;
    const live = onePerFrame((y: number) => setHeight(bottom - y));

    function onMove(moveEvent: PointerEvent) {
      live.set(moveEvent.clientY);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      live.flush();
      saveHeight();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onSplitterKeydown(event: KeyboardEvent) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    setHeight(height + (event.key === "ArrowUp" ? 24 : -24));
    saveHeight();
  }
</script>

<section
  class="terminal-panel"
  class:hidden={!visible}
  bind:this={panel}
  style={`height: ${height}px`}
  aria-label={$t("workspace.terminal.title")}
>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="terminal-splitter"
    role="separator"
    aria-orientation="horizontal"
    aria-valuenow={height}
    aria-valuemin={MIN_HEIGHT}
    tabindex="0"
    onpointerdown={startResize}
    onkeydown={onSplitterKeydown}
  ></div>
  <header class="terminal-header">
    <TerminalIcon size={13} class="terminal-icon" aria-hidden="true" />
    <span class="terminal-title">{$t("workspace.terminal.title")}</span>
    {#if info}
      <span class="terminal-shell">{info.shell}</span>
      <span class="terminal-cwd" title={info.cwd}>{info.cwd}</span>
    {/if}
    <span class="terminal-actions">
      <button type="button" class="terminal-action" aria-label={$t("shortcuts.toggle-terminal.label")} use:tooltip={$t("shortcuts.toggle-terminal.label")} onclick={onhide}>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <button type="button" class="terminal-action" aria-label={$t("common.close")} use:tooltip={$t("common.close")} onclick={onclose}>
        <X size={14} aria-hidden="true" />
      </button>
    </span>
  </header>
  <div class="terminal-host" data-terminal bind:this={host} style:background={$editorPalette.background}></div>
</section>

<style>
  .terminal-panel {
    display: flex;
    min-height: 0;
    flex-shrink: 0;
    flex-direction: column;
    border-top: 1px solid var(--border);
    background: var(--surface-content);
  }

  .terminal-panel.hidden {
    display: none;
  }

  .terminal-splitter {
    position: relative;
    flex-shrink: 0;
    height: 6px;
    margin-top: -4px;
    margin-bottom: -2px;
    z-index: 1;
    cursor: row-resize;
    touch-action: none;
  }

  .terminal-splitter:hover,
  .terminal-splitter:focus-visible {
    outline: none;
    background: linear-gradient(var(--accent), var(--accent)) center / 100% 1px no-repeat;
  }

  .terminal-header {
    display: flex;
    min-width: 0;
    height: 1.75rem;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-2) 0 var(--space-3);
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .terminal-header :global(.terminal-icon) {
    flex-shrink: 0;
  }

  .terminal-title {
    color: var(--text-primary);
    font-weight: 600;
  }

  .terminal-shell,
  .terminal-cwd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
  }

  .terminal-cwd {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .terminal-actions {
    display: flex;
    margin-left: auto;
    gap: 2px;
  }

  .terminal-action {
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
    place-items: center;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .terminal-action:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .terminal-host {
    min-height: 0;
    flex: 1;
    padding: var(--space-1) 0 0 var(--space-2);
  }

  .terminal-host :global(.xterm) {
    height: 100%;
  }
</style>
