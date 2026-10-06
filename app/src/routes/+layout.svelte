<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { onMount, onDestroy, tick } from "svelte";
  import { onePerFrame } from "$lib/onePerFrame";
  import { focusZoneAction, installFocusZones, setSidebarRevealer } from "$lib/focusZones";
  import { registerCommands } from "$lib/workspace/commands";
  import { installKeybindings } from "$lib/keybindings";
  import { installNumpadFix } from "$lib/numpadKeys";
  import type { Snippet } from "svelte";
  import "$lib/styles/tokens.css";
  import "$lib/styles/buttons.css";
  import "$lib/styles/controls.css";
  import "$lib/styles/tabs.css";
  import "$lib/styles/alert-dialog.css";
  import "$lib/styles/review-dialog.css";
  import "$lib/styles/tooltip.css";
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
  import { shortcuts } from "$lib/stores/shortcuts";
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
  import ShortcutSheet from "$lib/components/ShortcutSheet.svelte";
  import RowlyMark from "$lib/components/RowlyMark.svelte";
  import SchemaTree from "$lib/components/SchemaTree.svelte";
  import FileTree from "$lib/components/FileTree.svelte";
  import { installDialogMotion } from "$lib/dialogMotion";
  import { flushConsolePersistence, flushConsoleTexts, openTableConsole } from "$lib/stores/queryConsoles";
  import { flushQueryHistory } from "$lib/stores/queryHistory";
  import { openSqlFileWithDialog, pickSqlFolder } from "$lib/sqlFiles";
  import { MIN_FILE_PANEL_HEIGHT, setFilePanelHeight, setSqlFolder, sqlFolders } from "$lib/stores/sqlFolders";
  import { notifyError } from "$lib/stores/notifications";
  import ConnectionSwitcher from "$lib/components/ConnectionSwitcher.svelte";

  let cleanupThemeEffects: (() => void) | undefined;
  let cleanupLocaleEffects: (() => void) | undefined;
  let settingsOpen = $state(false);
  let settingsSection = $state<"general" | "shortcuts">("general");

  // Hoja de atajos (F1): al cerrarla con Esc, el foco vuelve a donde estaba.
  let sheetOpen = $state(false);
  let focusBeforeSheet: HTMLElement | null = null;

  function toggleShortcutSheet() {
    if (sheetOpen) {
      closeShortcutSheet(true);
      return;
    }
    focusBeforeSheet = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetOpen = true;
  }

  function closeShortcutSheet(restoreFocus: boolean) {
    sheetOpen = false;
    if (restoreFocus) focusBeforeSheet?.focus({ preventScroll: true });
    focusBeforeSheet = null;
  }

  function customizeShortcuts() {
    closeShortcutSheet(false);
    settingsSection = "shortcuts";
    settingsOpen = true;
  }
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
    const live = onePerFrame((height: number) => (dragFilePanelHeight = height));

    function onMove(moveEvent: PointerEvent) {
      live.set(clampFilePanelHeight(startHeight - (moveEvent.clientY - startY)));
    }

    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      live.flush();
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

  // Lo que se guarda con retraso (consolas, textos grandes, historial) sale
  // antes de cerrar: no se depende de que el webview dispare pagehide.
  function closeWindow() {
    flushConsoleTexts();
    flushConsolePersistence();
    flushQueryHistory();
    void appWindow.close();
  }

  // "Recargar tablas" es, en la practica, volver a conectar al mismo
  // perfil activo: connect reemplaza la conexion de la ventana y vuelve a
  // introspectar, que es exactamente lo que un refresh necesita.
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

  // Buscar con el sidebar como zona activa (foco o ultimo clic, nunca el
  // mouse encima; focusZones.ts): lleva al filtro del explorador; si ya se
  // esta en el filtro, lo deja (toggle). En el editor y en el grid lo
  // resuelve el Workspace (su propia barra de busqueda).
  function findInSidebar(): boolean {
    const filterInput = sidebar?.querySelector<HTMLInputElement>(".filter input");
    if (!filterInput) return false;
    if (document.activeElement === filterInput) {
      filterInput.blur();
    } else {
      filterInput.focus();
      filterInput.select();
    }
    return true;
  }

  // Al llegar con el teclado a una zona del sidebar sin foco previo: la
  // primera fila del arbol, no los botones de la cabecera.
  function focusFirstTreeRow(zone: HTMLElement): boolean {
    const row = zone.querySelector<HTMLElement>('[role="tree"] .row');
    row?.focus({ preventScroll: true });
    return !!row;
  }

  function toggleSidebar(): boolean {
    if (!$connection.connected) return false;
    sidebarCollapsed = !sidebarCollapsed;
    return true;
  }

  // El colapso usa la misma transicion de width que Alt+1: al soltar por
  // debajo del minimo, .resizing (que la apaga) se quita en el mismo frame
  // en que el width pasa a 0, asi que el panel anima lo que le falta desde
  // donde lo dejo el mouse. $sidebarWidth no se toca: al reabrir vuelve al
  // ultimo ancho util.
  //
  // Abrir y cerrar animan el ancho con el panel en el flujo del grid: el
  // area principal va pegada a su borde y por encima, asi su fondo tapa
  // cualquier cosa del panel que WebKitGTK recorte un cuadro tarde. (Se
  // probo deslizar el panel por encima del area principal con transform, y
  // luego recortandolo: en ambos el texto del arbol quedaba un instante
  // sobre la consola.) Maquetar el area principal en cada cuadro de la
  // animacion es barato desde que el grid esta virtualizado.
  //
  // El ancho del arrastre se aplica a lo sumo una vez por cuadro.
  function startSidebarResize(event: PointerEvent) {
    if (event.button !== 0 || !sidebar) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const left = sidebar.getBoundingClientRect().left;
    dragWidth = $sidebarWidth;
    const live = onePerFrame((width: number) => (dragWidth = width));

    function onMove(moveEvent: PointerEvent) {
      live.set(Math.min(MAX_SIDEBAR_WIDTH, Math.max(0, moveEvent.clientX - left)));
    }

    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      live.flush();
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

  // El menu contextual del navegador (Recargar, Inspeccionar elemento...)
  // no es parte de la app: un clic derecho descuidado no debe ofrecerlo. Se
  // bloquea donde la app no tiene menu propio, salvo en campos de texto,
  // donde el nativo da cortar/copiar/pegar. El inspector sigue a mano con su
  // atajo de teclado en desarrollo.
  function blockNativeContextMenu(event: MouseEvent) {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) return;
    event.preventDefault();
  }

  let cleanupFocusZones: (() => void) | undefined;
  let cleanupKeybindings: (() => void) | undefined;
  let cleanupNumpadFix: (() => void) | undefined;
  let cleanupCommands: (() => void) | undefined;

  onMount(() => {
    installDialogMotion();
    window.addEventListener("contextmenu", blockNativeContextMenu);
    cleanupThemeEffects = initThemeEffects();
    cleanupLocaleEffects = initLocaleEffects();
    // Solo la ventana principal busca versiones al arrancar: las de conexión
    // no repiten la consulta a GitHub.
    if (getCurrentWindow().label === "main") void checkOnStartup();
    // Los atajos se apagan con cualquier modal abierto; en Ajustes, ademas,
    // se pueden estar capturando combinaciones nuevas.
    const shortcutsBlocked = () => settingsOpen || !!document.querySelector("dialog[open]");
    // Antes que todo: el teclado numerico que llega como flechas no puede
    // mover zonas ni disparar atajos.
    cleanupNumpadFix = installNumpadFix();
    // Primero las zonas: sus flechas del modo mover van antes que los atajos.
    cleanupFocusZones = installFocusZones(shortcutsBlocked);
    cleanupKeybindings = installKeybindings(shortcutsBlocked);
    const cleanupSidebarCommands = registerCommands("global", {
      "toggle-sidebar": toggleSidebar,
      "shortcut-sheet": toggleShortcutSheet,
    });
    const cleanupExplorerFind = registerCommands("explorer", { find: findInSidebar });
    const cleanupFilesFind = registerCommands("files", { find: findInSidebar });
    cleanupCommands = () => {
      cleanupSidebarCommands();
      cleanupExplorerFind();
      cleanupFilesFind();
    };
    // Ir al sidebar con el teclado lo abre si estaba plegado.
    setSidebarRevealer(async () => {
      if (!$connection.connected) return;
      sidebarCollapsed = false;
      await tick();
    });
  });

  onDestroy(() => {
    cleanupThemeEffects?.();
    cleanupLocaleEffects?.();
    cleanupCommands?.();
    cleanupKeybindings?.();
    cleanupNumpadFix?.();
    cleanupFocusZones?.();
    setSidebarRevealer(null);

    window.removeEventListener("contextmenu", blockNativeContextMenu);
  });
</script>

<div class="shell" class:with-sidebar={$connection.connected} class:resizing-sidebar={dragWidth !== null}>
  <!-- El color de la conexion activa tiñe la barra con un degradado que
       nace a la izquierda y se desvanece, como la fila de la vista de lista
       en la pantalla de conexiones. -->
  <header
    class="topbar"
    class:tinted={$connection.connected ? !!activeProfile?.color : true}
    style:--identity={$connection.connected ? activeProfile?.color : "var(--accent)"}
  >
    <!-- En la pantalla de conexiones, el logo y el degradado toman el acento
         del tema elegido; con una conexion abierta, el color de la
         conexion. -->
    {#if !$connection.connected}
      <span class="topbar-brand">
        <RowlyMark size="1.5rem" mono />
        <span class="wordmark">Rowly<span class="wordmark-db">DB</span></span>
      </span>
    {/if}
    {#if $connection.connected}
      <!-- Con el panel visible, ocultarlo vive en su propia barra
           (SchemaTree); aca solo queda la forma de volver a abrirlo. -->
      {#if sidebarCollapsed}
        <button
          class="icon-button"
          type="button"
          use:tooltip={toggleSidebarKeys
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
          use:tooltip={$t("shell.backToConnections")}
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
      use:tooltip={$t("shell.settings")}
      aria-label={settingsOpen ? $t("shell.closeSettings") : $t("shell.openSettings")}
      aria-expanded={settingsOpen}
      aria-pressed={settingsOpen}
      onclick={() => {
        settingsSection = "general";
        settingsOpen = !settingsOpen;
      }}
    >
      <Settings size={17} aria-hidden="true" />
      {#if $newerRelease}
        <span class="update-dot" aria-hidden="true"></span>
      {/if}
    </button>
    <div class="window-controls" aria-label={$t("shell.windowControls")}>
      <button
        type="button"
        use:tooltip={$t("shell.minimize")}
        aria-label={$t("shell.minimize")}
        onclick={() => appWindow.minimize()}
      >
        <Minus size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        use:tooltip={$t("shell.maximizeRestore")}
        aria-label={$t("shell.maximizeRestore")}
        onclick={() => appWindow.toggleMaximize()}
      >
        <Square size={12} aria-hidden="true" />
      </button>
      <button
        class="close-window"
        type="button"
        use:tooltip={$t("common.close")}
        aria-label={$t("common.close")}
        onclick={closeWindow}
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
        <div class="schema-pane" use:focusZoneAction={{ zone: "explorer", focusDefault: focusFirstTreeRow }}>
        <SchemaTree
          explorer={$databaseExplorer}
          {connectionLabel}
          {profileId}
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
            use:focusZoneAction={{ zone: "files", focusDefault: focusFirstTreeRow }}
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
          use:tooltip={$t("shell.resizeSidebarHint")}
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

  {#if sheetOpen}
    <ShortcutSheet onclose={closeShortcutSheet} oncustomize={customizeShortcuts} />
  {/if}
  {#if settingsOpen}
    <SettingsPanel initialSection={settingsSection} onclose={() => (settingsOpen = false)} />
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

  /* Degradado en un pseudo-elemento para que aparezca con un fundido al
     conectar (los gradientes no se interpolan con transition).
     - bottom: -1px lo extiende sobre el borde inferior de la barra: con
       inset 0 el borde quedaba gris debajo del color y se leia como un
       margen sin cubrir.
     - Muchos puntos de paso con una caida tipo ease-out: con solo dos o
       tres se nota donde termina el degradado. */
  /* Marca en el topbar de inicio: el pajaro y "Rowly" con peso, "DB" en
     tono secundario, mas chico y espaciado, como una etiqueta. */
  .topbar-brand {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin-left: var(--space-1);
    color: var(--text-primary);
    user-select: none;
  }

  .wordmark {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    font-size: 0.9375rem;
    font-weight: 650;
    letter-spacing: -0.015em;
  }

  .wordmark-db {
    color: var(--text-secondary);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.14em;
  }

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

  /* Posicionada y con fondo opaco: va despues del sidebar en el DOM, asi
     que se pinta por encima de el. Si WebKitGTK recorta el contenido del
     sidebar un cuadro tarde al animar su ancho (el arbol tiene su propia
     capa por el scroll), lo que asoma queda debajo de la consola. */
  .main {
    position: relative;
    grid-area: main;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    background: var(--surface);
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
