<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Snippet } from "svelte";
  import "$lib/styles/tokens.css";
  import "$lib/styles/alert-dialog.css";
  import {
    connection,
    connectToProfile,
    databaseExplorer,
    explorerLoading,
    pendingEdit,
    reset,
    setVisibleSchemas,
  } from "$lib/stores/connection";
  import { connectionProfiles } from "$lib/stores/connectionProfiles";
  import { eventMatchesShortcut, shortcuts } from "$lib/stores/shortcuts";
  import {
    DEFAULT_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    MIN_SIDEBAR_WIDTH,
    clampSidebarWidth,
    releaseSidebarDrag,
    sidebarWidth,
  } from "$lib/stores/sidebarLayout";
  import { initThemeEffects } from "$lib/theming/theme";
  import { initLocaleEffects, t } from "$lib/i18n";
  import { checkOnStartup, newerRelease } from "$lib/stores/updates";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { fade } from "svelte/transition";
  import {
    ArrowLeft,
    Minus,
    PanelLeftOpen,
    Settings,
    Square,
    X,
  } from "@lucide/svelte";
  import SettingsPanel from "$lib/components/SettingsPanel.svelte";
  import SchemaTree from "$lib/components/SchemaTree.svelte";
  import FileTree from "$lib/components/FileTree.svelte";
  import { installDialogMotion } from "$lib/dialogMotion";
  import { openTableConsole } from "$lib/stores/queryConsoles";
  import { openSqlFileWithDialog, pickSqlFolder } from "$lib/sqlFiles";
  import { MIN_FILE_PANEL_HEIGHT, setFilePanelHeight, setSqlFolder, sqlFolders } from "$lib/stores/sqlFolders";
  import { notifyError } from "$lib/stores/notifications";
  import ConnectionSwitcher from "$lib/components/ConnectionSwitcher.svelte";

  let cleanupThemeEffects: (() => void) | undefined;
  let cleanupLocaleEffects: (() => void) | undefined;
  let settingsOpen = $state(false);
  let sidebarCollapsed = $state(false);
  let refreshingTables = $state(false);
  let sidebar = $state<HTMLElement>();
  // Ancho en vivo mientras se arrastra el borde del sidebar; null fuera del
  // arrastre. Puede bajar de MIN_SIDEBAR_WIDTH (hasta 0) para que el panel
  // siga al mouse; al soltar, releaseSidebarDrag() decide si queda o cierra.
  let dragWidth = $state<number | null>(null);
  const liveSidebarWidth = $derived(dragWidth ?? $sidebarWidth);
  const toggleSidebarKeys = $derived($shortcuts.find((shortcut) => shortcut.id === "toggle-sidebar")?.keys ?? "");
  const activeProfile = $derived($connectionProfiles.find((profile) => profile.id === $connection.profileId));
  // Misma convencion "schema@host" que dataSourceLabel en Workspace.svelte.
  const connectionLabel = $derived(
    activeProfile ? `${activeProfile.database || activeProfile.name}@${activeProfile.host}` : "",
  );
  let { children }: { children: Snippet } = $props();

  // --- Panel de archivos (parte inferior del sidebar) -------------------
  const profileId = $derived($connection.profileId ?? "default");
  const sqlFolder = $derived($sqlFolders.folderByProfile[profileId] ?? null);
  let sidebarContent = $state<HTMLElement>();
  // Alto en vivo mientras se arrastra el divisor; null fuera del arrastre.
  let dragFilePanelHeight = $state<number | null>(null);
  // El arbol de la base conserva siempre al menos este alto.
  const MIN_SCHEMA_PANE_HEIGHT = 120;

  function clampFilePanelHeight(height: number): number {
    const available = (sidebarContent?.clientHeight ?? 0) - MIN_SCHEMA_PANE_HEIGHT;
    return Math.max(MIN_FILE_PANEL_HEIGHT, Math.min(height, Math.max(MIN_FILE_PANEL_HEIGHT, available)));
  }

  function startFilePanelResize(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = clampFilePanelHeight($sqlFolders.panelHeight);
    dragFilePanelHeight = startHeight;

    function onMove(moveEvent: PointerEvent) {
      dragFilePanelHeight = clampFilePanelHeight(startHeight - (moveEvent.clientY - startY));
    }

    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      if (dragFilePanelHeight !== null) setFilePanelHeight(dragFilePanelHeight);
      dragFilePanelHeight = null;
    }

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function onFilePanelHandleKeydown(event: KeyboardEvent) {
    const step = event.shiftKey ? 40 : 10;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? step : -step;
      setFilePanelHeight(clampFilePanelHeight($sqlFolders.panelHeight + delta));
    }
  }

  async function handleOpenFolder() {
    try {
      const picked = await pickSqlFolder();
      if (picked) setSqlFolder(profileId, picked);
    } catch (error) {
      notifyError(error);
    }
  }
  const appWindow = getCurrentWindow();

  // "Recargar tablas" es, en la practica, volver a conectar al mismo
  // perfil activo: no hay pool vivo que reintrospectar (ver comentario de
  // reset() en connection.ts), asi que connectToProfile ya hace exactamente
  // lo que un refresh necesita, sin agregar ningun comando nuevo en Rust.
  async function handleRefreshTables() {
    const profile = activeProfile;
    if (!profile || refreshingTables) return;

    refreshingTables = true;
    const result = await connectToProfile(profile);
    refreshingTables = false;

    if (!result.ok) {
      pendingEdit.set({ profile, error: result.reason === "connect-failed" ? result.error : null });
    }
  }

  // Atajos globales resueltos desde Ajustes > Atajos (shortcuts.ts). Se
  // desactivan mientras el modal de Ajustes esta abierto, porque ahi mismo
  // se pueden estar capturando nuevas combinaciones.
  // Ultima zona donde el usuario hizo clic. WebKit no enfoca los botones al
  // hacer clic (y las filas del arbol del sidebar son botones), asi que
  // "el foco esta en el sidebar" no se puede saber solo por activeElement.
  let lastPointerInSidebar = false;

  function trackPointerRegion(event: PointerEvent) {
    lastPointerInSidebar = event.target instanceof Element && !!event.target.closest(".sidebar");
  }

  // Ctrl+F con el sidebar activo: lleva al filtro del explorador; si ya se
  // esta en el filtro, lo deja (toggle). En el editor y en el grid, Ctrl+F lo
  // resuelve cada uno (su propia barra de busqueda).
  function handleSidebarFind(event: KeyboardEvent): boolean {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || event.altKey || event.shiftKey || event.key.toLowerCase() !== "f" || !sidebar) return false;
    const active = document.activeElement;
    // Manda el mouse: con el puntero sobre el sidebar, alcanza. Si no, el
    // foco (o el ultimo clic, que WebKit no enfoca botones).
    const inSidebar =
      sidebar.matches(":hover") ||
      (active && active !== document.body ? sidebar.contains(active) : lastPointerInSidebar);
    if (!inSidebar) return false;
    const filterInput = sidebar.querySelector<HTMLInputElement>(".filter input");
    if (!filterInput) return false;
    event.preventDefault();
    // Que CodeMirror no la vea si el foco estaba en el editor.
    event.stopImmediatePropagation();
    if (active === filterInput) {
      filterInput.blur();
    } else {
      filterInput.focus();
      filterInput.select();
    }
    return true;
  }

  function onSidebarFindKeydown(event: KeyboardEvent) {
    if (!settingsOpen) handleSidebarFind(event);
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (settingsOpen) return;

    const toggleSidebar = $shortcuts.find((shortcut) => shortcut.id === "toggle-sidebar");
    if (toggleSidebar && eventMatchesShortcut(event, toggleSidebar.keys)) {
      if (!$connection.connected) return;
      event.preventDefault();
      sidebarCollapsed = !sidebarCollapsed;
    }
  }

  // El colapso usa la misma transicion de width que Alt+1: al soltar por
  // debajo del minimo, .resizing (que la apaga) se quita en el mismo frame
  // en que el width pasa a 0, asi que el panel anima lo que le falta desde
  // donde lo dejo el mouse. $sidebarWidth no se toca: al reabrir vuelve al
  // ultimo ancho util.
  function startSidebarResize(event: PointerEvent) {
    if (event.button !== 0 || !sidebar) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const left = sidebar.getBoundingClientRect().left;
    dragWidth = $sidebarWidth;

    function onMove(moveEvent: PointerEvent) {
      dragWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(0, moveEvent.clientX - left));
    }

    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      const release = releaseSidebarDrag(dragWidth ?? $sidebarWidth);
      if (release.collapse) sidebarCollapsed = true;
      else sidebarWidth.set(release.width);
      dragWidth = null;
    }

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function onSidebarHandleKeydown(event: KeyboardEvent) {
    const step = event.shiftKey ? 40 : 10;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if ($sidebarWidth <= MIN_SIDEBAR_WIDTH) sidebarCollapsed = true;
      else sidebarWidth.set(clampSidebarWidth($sidebarWidth - step));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      sidebarWidth.set(clampSidebarWidth($sidebarWidth + step));
    }
  }

  onMount(() => {
    installDialogMotion();
    cleanupThemeEffects = initThemeEffects();
    cleanupLocaleEffects = initLocaleEffects();
    // Solo la ventana principal busca versiones al arrancar: las de conexión
    // no repiten la consulta a GitHub.
    if (getCurrentWindow().label === "main") void checkOnStartup();
    document.addEventListener("keydown", handleGlobalKeydown);
    window.addEventListener("pointerdown", trackPointerRegion, true);
    // En captura: tiene que llegar antes que el keymap de CodeMirror.
    window.addEventListener("keydown", onSidebarFindKeydown, true);
  });

  onDestroy(() => {
    cleanupThemeEffects?.();
    cleanupLocaleEffects?.();
    document.removeEventListener("keydown", handleGlobalKeydown);
    window.removeEventListener("pointerdown", trackPointerRegion, true);
    window.removeEventListener("keydown", onSidebarFindKeydown, true);
  });
</script>

<div class="shell" class:with-sidebar={$connection.connected} class:resizing-sidebar={dragWidth !== null}>
  <!-- El color de la conexion activa tiñe la barra con un degradado que
       nace a la izquierda y se desvanece, como la fila de la vista de lista
       en la pantalla de conexiones. -->
  <header
    class="topbar"
    class:tinted={$connection.connected && !!activeProfile?.color}
    class:production={$connection.connected && activeProfile?.environment === "production"}
    style:--identity={$connection.connected ? activeProfile?.color : undefined}
  >
    {#if $connection.connected}
      <!-- Con el panel visible, ocultarlo vive en su propia barra
           (SchemaTree); aca solo queda la forma de volver a abrirlo. -->
      {#if sidebarCollapsed}
        <button
          class="icon-button"
          type="button"
          title={toggleSidebarKeys
            ? $t("shell.showTablesPanelWithKeys", { keys: toggleSidebarKeys })
            : $t("shell.showTablesPanel")}
          aria-label={$t("shell.showTablesPanel")}
          onclick={() => (sidebarCollapsed = false)}
          in:fade={{ duration: 120 }}
        >
          <PanelLeftOpen size={16} aria-hidden="true" />
        </button>
      {/if}
      <div class="connection-nav">
        <button
          class="icon-button"
          type="button"
          title={$t("shell.backToConnections")}
          aria-label={$t("shell.backToConnections")}
          disabled={$connection.connecting}
          onclick={reset}
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <ConnectionSwitcher
          profiles={$connectionProfiles}
          activeProfileId={$connection.profileId}
          disabled={$connection.connecting}
        />
      </div>
    {/if}
    <div class="drag-region" data-tauri-drag-region></div>
    <button
      class="icon-button"
      type="button"
      title={$t("shell.settings")}
      aria-label={settingsOpen ? $t("shell.closeSettings") : $t("shell.openSettings")}
      aria-expanded={settingsOpen}
      aria-pressed={settingsOpen}
      onclick={() => (settingsOpen = !settingsOpen)}
    >
      <Settings size={17} aria-hidden="true" />
      {#if $newerRelease}
        <span class="update-dot" aria-hidden="true"></span>
      {/if}
    </button>
    <div class="window-controls" aria-label={$t("shell.windowControls")}>
      <button
        type="button"
        title={$t("shell.minimize")}
        aria-label={$t("shell.minimize")}
        onclick={() => appWindow.minimize()}
      >
        <Minus size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        title={$t("shell.maximizeRestore")}
        aria-label={$t("shell.maximizeRestore")}
        onclick={() => appWindow.toggleMaximize()}
      >
        <Square size={12} aria-hidden="true" />
      </button>
      <button
        class="close-window"
        type="button"
        title={$t("common.close")}
        aria-label={$t("common.close")}
        onclick={() => appWindow.close()}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  </header>

  <aside
    class="sidebar"
    class:collapsed={sidebarCollapsed}
    class:resizing={dragWidth !== null}
    style:--sidebar-width={`${liveSidebarWidth}px`}
    aria-hidden={!$connection.connected || sidebarCollapsed}
    bind:this={sidebar}
  >
    {#if $connection.connected}
      <!-- El contenido no baja de MIN_SIDEBAR_WIDTH: al cerrar (o arrastrar
           por debajo del minimo) se recorta en vez de reacomodarse, asi el
           arbol se desliza fuera sin saltos de layout. -->
      <div
        class="sidebar-content"
        class:resizing-files={dragFilePanelHeight !== null}
        bind:this={sidebarContent}
        style:width={`${Math.max(liveSidebarWidth, MIN_SIDEBAR_WIDTH)}px`}
      >
        <div class="schema-pane">
        <SchemaTree
          explorer={$databaseExplorer}
          {connectionLabel}
          refreshing={refreshingTables}
          loadingSchemas={$explorerLoading}
          hideShortcut={toggleSidebarKeys}
          onrefresh={handleRefreshTables}
          onhide={() => (sidebarCollapsed = true)}
          onopenfile={() => void openSqlFileWithDialog(profileId).catch(notifyError)}
          onopenfolder={() => void handleOpenFolder()}
          onopentable={(schema, name) => openTableConsole(profileId, schema, name)}
          onschemaschange={(schemas) => void setVisibleSchemas(schemas).catch(() => {})}
        />
        </div>
        {#if sqlFolder}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <div
            class="files-resize-handle"
            class:disabled={$sqlFolders.collapsed}
            role="separator"
            aria-orientation="horizontal"
            aria-label={$t("shell.resizeFilesPanel")}
            tabindex={$sqlFolders.collapsed ? -1 : 0}
            onpointerdown={startFilePanelResize}
            onkeydown={onFilePanelHandleKeydown}
          ></div>
          <!-- Plegado, queda solo la cabecera. El alto siempre es explicito
               (nunca auto) para que la transicion pueda interpolarlo. -->
          <div
            class="files-pane"
            class:collapsed={$sqlFolders.collapsed}
            style:height={$sqlFolders.collapsed
              ? undefined
              : `${dragFilePanelHeight ?? clampFilePanelHeight($sqlFolders.panelHeight)}px`}
          >
            <FileTree {profileId} folder={sqlFolder} />
          </div>
        {/if}
      </div>
      {#if !sidebarCollapsed}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="sidebar-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={$t("shell.resizeTablesPanel")}
          aria-valuenow={$sidebarWidth}
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          tabindex="0"
          title={$t("shell.resizeSidebarHint")}
          onpointerdown={startSidebarResize}
          ondblclick={() => sidebarWidth.set(DEFAULT_SIDEBAR_WIDTH)}
          onkeydown={onSidebarHandleKeydown}
        ></div>
      {/if}
    {/if}
  </aside>

  <main class="main">
    <div class="route-content">
      {@render children()}
    </div>
  </main>

  {#if settingsOpen}
    <SettingsPanel onclose={() => (settingsOpen = false)} />
  {/if}
</div>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
    overflow: hidden;
    background: var(--surface);
    color: var(--text-primary);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
  }

  .shell {
    position: fixed;
    inset: 0;
    display: grid;
    grid-template-areas: "topbar topbar" "sidebar main";
    grid-template-rows: auto 1fr;
    grid-template-columns: 0 minmax(0, 1fr);
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--surface);
  }

  .shell.with-sidebar {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .topbar {
    position: relative;
    grid-area: topbar;
    display: flex;
    align-items: center;
    min-height: 2.625rem;
    box-sizing: border-box;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-3);
    border-bottom: 1px solid var(--border);
    background: var(--topbar-background);
  }

  /* En produccion el borde inferior del topbar toma el tono de peligro:
     una senal constante y discreta, sin franjas nuevas. */
  .topbar.production {
    border-bottom-color: color-mix(in srgb, var(--danger) 60%, var(--border));
  }

  /* Degradado en un pseudo-elemento para que aparezca con un fundido al
     conectar (los gradientes no se interpolan con transition).
     - bottom: -1px lo extiende sobre el borde inferior de la barra: con
       inset 0 el borde quedaba gris debajo del color y se leia como un
       margen sin cubrir.
     - Muchos puntos de paso con una caida tipo ease-out: con solo dos o
       tres se nota donde termina el degradado. */
  .topbar::before {
    content: "";
    position: absolute;
    inset: 0 0 -1px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--identity, transparent) 22%, transparent) 0%,
      color-mix(in srgb, var(--identity, transparent) 19%, transparent) 8%,
      color-mix(in srgb, var(--identity, transparent) 15%, transparent) 17%,
      color-mix(in srgb, var(--identity, transparent) 11%, transparent) 27%,
      color-mix(in srgb, var(--identity, transparent) 7%, transparent) 38%,
      color-mix(in srgb, var(--identity, transparent) 4%, transparent) 50%,
      color-mix(in srgb, var(--identity, transparent) 1.5%, transparent) 63%,
      transparent 78%
    );
    opacity: 0;
    pointer-events: none;
    transition: opacity 300ms ease;
  }

  .topbar.tinted::before {
    opacity: 1;
  }

  /* Sobre la barra clara el mismo porcentaje de color satura mucho mas que
     sobre la oscura: en claro el degradado va a ~60% de intensidad. */
  :global(:root[data-scheme="light"]) .topbar::before {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--identity, transparent) 13%, transparent) 0%,
      color-mix(in srgb, var(--identity, transparent) 11%, transparent) 8%,
      color-mix(in srgb, var(--identity, transparent) 9%, transparent) 17%,
      color-mix(in srgb, var(--identity, transparent) 6.5%, transparent) 27%,
      color-mix(in srgb, var(--identity, transparent) 4%, transparent) 38%,
      color-mix(in srgb, var(--identity, transparent) 2.5%, transparent) 50%,
      color-mix(in srgb, var(--identity, transparent) 1%, transparent) 63%,
      transparent 78%
    );
  }

  :global(:root[data-scheme="light"]) .topbar.tinted .icon-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--identity) 7%, transparent);
  }

  .topbar > :global(*) {
    position: relative;
  }

  .connection-nav {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .drag-region {
    align-self: stretch;
    flex: 1;
  }

  .icon-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      color var(--duration-fast),
      background-color var(--duration-fast),
      border-color var(--duration-fast);
  }

  .icon-button:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
    border-color: var(--border);
  }

  /* Sobre la barra teñida con el color de la conexion, el realce gris se
     lee como un hueco: los botones toman un acento sutil del mismo color,
     igual que el selector de conexion (ConnectionSwitcher). */
  .topbar.tinted .icon-button:hover:not(:disabled) {
    border-color: transparent;
    background: color-mix(in srgb, var(--identity) 10%, transparent);
  }

  .icon-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .icon-button:disabled {
    color: var(--control-disabled);
    cursor: not-allowed;
  }

  .icon-button:disabled:hover {
    background: transparent;
    border-color: transparent;
  }

  .window-controls {
    display: flex;
    align-self: stretch;
    margin: calc(var(--space-1) * -1) calc(var(--space-3) * -1) calc(var(--space-1) * -1) 0;
  }

  .window-controls button {
    display: inline-flex;
    width: 2.5rem;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .window-controls button:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .window-controls .close-window:hover {
    background: var(--danger);
    color: var(--text-on-accent);
  }

  .window-controls button:focus-visible {
    z-index: 1;
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .sidebar {
    position: relative;
    grid-area: sidebar;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    border-right: 1px solid transparent;
    transition:
      width var(--sidebar-duration) cubic-bezier(0.22, 1, 0.36, 1),
      border-color var(--sidebar-duration) ease;
    --sidebar-duration: calc(var(--duration-fast) * 1.6);
  }

  .sidebar.resizing {
    transition: none;
  }

  .shell.with-sidebar .sidebar {
    width: var(--sidebar-width);
    border-right-color: var(--border);
  }

  .shell.with-sidebar .sidebar.collapsed {
    width: 0;
    border-right-color: transparent;
  }

  .sidebar-content {
    display: flex;
    height: 100%;
    flex-direction: column;
  }

  .schema-pane {
    min-height: 0;
    flex: 1;
  }

  /* Misma curva y duracion que el sidebar al ocultarse (.sidebar). */
  .files-pane {
    --files-duration: calc(var(--duration-fast) * 1.6);
    flex-shrink: 0;
    min-height: 0;
    overflow: hidden;
    padding-top: var(--space-1);
    box-sizing: border-box;
    transition: height var(--files-duration) cubic-bezier(0.22, 1, 0.36, 1);
  }

  .files-pane.collapsed {
    /* padding-top + alto de la cabecera de FileTree (.files-header). */
    height: calc(var(--space-1) + 2rem);
  }

  .sidebar-content.resizing-files .files-pane {
    transition: none;
  }

  .files-resize-handle.disabled {
    pointer-events: none;
  }

  /* Divisor entre el arbol de la base y el de archivos: sin linea en
     reposo (la separacion la da el espacio); la linea de acento aparece
     al pasar el mouse o arrastrar, como en el borde del sidebar. */
  .files-resize-handle {
    position: relative;
    flex-shrink: 0;
    height: 6px;
    margin: var(--space-1) 0 -3px;
    cursor: row-resize;
    touch-action: none;
  }

  .files-resize-handle::after {
    content: "";
    position: absolute;
    right: 0;
    left: 0;
    top: 2px;
    height: 2px;
    background: transparent;
    transition: background-color var(--duration-fast) ease;
  }

  .files-resize-handle:hover::after,
  .sidebar-content.resizing-files .files-resize-handle::after {
    background: var(--accent);
  }

  .files-resize-handle:focus-visible {
    outline: none;
  }

  .files-resize-handle:focus-visible::after {
    background: var(--focus-ring);
  }

  .sidebar-content.resizing-files {
    cursor: row-resize;
    user-select: none;
  }

  /* Zona de agarre sobre el borde derecho: mas ancha que la linea visible
     para que sea facil de tomar; la linea de acento solo aparece al pasar
     el mouse o mientras se arrastra. */
  .sidebar-resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 6px;
    cursor: col-resize;
    touch-action: none;
  }

  .sidebar-resize-handle::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 2px;
    background: transparent;
    transition: background-color var(--duration-fast) ease;
  }

  .sidebar-resize-handle:hover::after,
  .sidebar.resizing .sidebar-resize-handle::after {
    background: var(--accent);
  }

  .sidebar-resize-handle:focus-visible {
    outline: none;
  }

  .sidebar-resize-handle:focus-visible::after {
    background: var(--focus-ring);
  }

  .shell.resizing-sidebar {
    cursor: col-resize;
    user-select: none;
  }

  .main {
    grid-area: main;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
  }

  .route-content {
    height: 100%;
    min-height: 0;
  }

  /* Hay una versión nueva: un punto sobre el engranaje, sin interrumpir. */
  .update-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    border: 1.5px solid var(--surface);
    border-radius: 50%;
    background: var(--accent);
  }
</style>
