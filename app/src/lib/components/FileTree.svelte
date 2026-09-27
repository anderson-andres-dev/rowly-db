<script lang="ts">
  import { tick, untrack } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { ChevronRight, FileCode, FilePlus, Folder, FolderOpen, RefreshCw, TriangleAlert, X } from "@lucide/svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import type { ContextMenuItem } from "$lib/contextMenu";
  import { t } from "$lib/i18n";
  import {
    createSqlFile,
    listSqlDir,
    openSqlFileAtPath,
    renameSqlFile,
    trashSqlFile,
    type SqlDirEntry,
  } from "$lib/sqlFiles";
  import { notifyError } from "$lib/stores/notifications";
  import { fileNameFromPath, isQueryConsoleDirty, queryConsoles } from "$lib/stores/queryConsoles";
  import { closeSqlFolder, setFilePanelCollapsed, setSqlFolderExpanded, sqlFolders } from "$lib/stores/sqlFolders";

  let { profileId, folder }: { profileId: string; folder: string } = $props();

  // Contenido de cada carpeta ya leida, por ruta. Las subcarpetas se leen
  // recien al expandirlas (el backend no recorre en profundidad).
  type DirListing = { status: "loading" } | { status: "ready"; entries: SqlDirEntry[] } | { status: "error"; message: string };
  const listings = new SvelteMap<string, DirListing>();

  const collapsed = $derived($sqlFolders.collapsed);
  const expanded = $derived(new Set($sqlFolders.expandedByProfile[profileId] ?? []));
  const folderName = $derived(fileNameFromPath(folder));

  // Pestañas de esta conexion que son archivos: para resaltar el activo y
  // marcar con la bolita los que tienen cambios sin guardar.
  const activeConsoleId = $derived($queryConsoles.activeByProfile[profileId]);
  const activeFilePath = $derived(
    $queryConsoles.consoles.find((item) => item.id === activeConsoleId)?.filePath ?? null,
  );
  const dirtyPaths = $derived(
    new Set(
      $queryConsoles.consoles
        .filter((item) => item.profileId === profileId && item.filePath && isQueryConsoleDirty(item))
        .map((item) => item.filePath as string),
    ),
  );

  async function loadDir(path: string) {
    if (!listings.has(path)) listings.set(path, { status: "loading" });
    try {
      listings.set(path, { status: "ready", entries: await listSqlDir(path) });
    } catch (error) {
      listings.set(path, { status: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  // Vuelve a leer la raiz y todas las carpetas abiertas: se usa tras crear,
  // renombrar o borrar, y con el boton de actualizar.
  function refreshAll() {
    void loadDir(folder);
    for (const path of expanded) void loadDir(path);
  }

  // Carpeta nueva (otra conexion u otra carpeta elegida): se descarta todo
  // lo leido y se arranca de cero con las expandidas que se recuerden.
  $effect(() => {
    folder;
    profileId;
    untrack(() => {
      listings.clear();
      refreshAll();
    });
  });

  function toggleDir(path: string) {
    const open = !expanded.has(path);
    setSqlFolderExpanded(profileId, path, open);
    if (open && listings.get(path)?.status !== "ready") void loadDir(path);
  }

  function openFile(path: string) {
    void openSqlFileAtPath(profileId, path).catch(notifyError);
  }

  function parentOf(path: string): string {
    const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return index > 0 ? path.slice(0, index) : folder;
  }

  // --- Edicion en linea: crear y renombrar -------------------------------
  // Un solo input a la vez. Para crear, aparece como una fila nueva al
  // principio de la carpeta destino; para renombrar, reemplaza el nombre.
  let editing = $state<{ kind: "create"; dir: string } | { kind: "rename"; path: string } | null>(null);
  let editValue = $state("");
  let editInput = $state<HTMLInputElement>();

  async function startCreate(dir: string) {
    menu = null;
    if (collapsed) setFilePanelCollapsed(false);
    if (dir !== folder && !expanded.has(dir)) toggleDir(dir);
    editing = { kind: "create", dir };
    editValue = "";
    await tick();
    editInput?.focus();
  }

  async function startRename(path: string) {
    menu = null;
    editing = { kind: "rename", path };
    editValue = fileNameFromPath(path);
    await tick();
    editInput?.focus();
    // Selecciona el nombre sin la extension, como los exploradores de archivos.
    const dot = editValue.toLowerCase().endsWith(".sql") ? editValue.length - 4 : editValue.length;
    editInput?.setSelectionRange(0, dot);
  }

  async function finishEdit(save: boolean) {
    const current = editing;
    const value = editValue.trim();
    editing = null;
    if (!save || !current || !value) return;
    try {
      if (current.kind === "create") {
        const path = await createSqlFile(current.dir, value);
        await loadDir(current.dir);
        openFile(path);
      } else if (value !== fileNameFromPath(current.path)) {
        await renameSqlFile(current.path, value);
        await loadDir(parentOf(current.path));
      }
    } catch (error) {
      notifyError(error);
    }
  }

  function onEditKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Enter") void finishEdit(true);
    if (event.key === "Escape") void finishEdit(false);
  }

  // --- Mover a la papelera ------------------------------------------------
  let pendingTrash = $state<string | null>(null);

  function requestTrash(path: string) {
    menu = null;
    pendingTrash = path;
  }

  // Llega cuando el aviso (ConfirmDialog) termino de cerrarse.
  async function confirmTrash() {
    const path = pendingTrash;
    pendingTrash = null;
    if (!path) return;
    try {
      await trashSqlFile(path);
      await loadDir(parentOf(path));
    } catch (error) {
      notifyError(error);
    }
  }

  // --- Menu contextual ----------------------------------------------------
  let menu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  function openMenu(event: MouseEvent, items: ContextMenuItem[]) {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new Event("khipu:context-menu"));
    menu = { x: event.clientX, y: event.clientY, items };
  }

  function folderMenuItems(dir: string): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      { label: $t("workspace.files.newFile"), action: () => void startCreate(dir) },
      { label: $t("workspace.files.refresh"), action: refreshAll },
    ];
    if (dir === folder) {
      items.push({ label: $t("workspace.files.closeFolder"), separatorBefore: true, action: () => closeSqlFolder(profileId) });
    }
    return items;
  }

  function fileMenuItems(path: string): ContextMenuItem[] {
    return [
      { label: $t("workspace.files.open"), action: () => openFile(path) },
      { label: $t("workspace.rename"), action: () => void startRename(path) },
      { label: $t("workspace.files.trash"), separatorBefore: true, action: () => void requestTrash(path) },
    ];
  }
</script>

{#snippet editRow(depth: number)}
  <li class="row editing" style:--depth={depth}>
    <FileCode size={14} class="node-icon icon-file" aria-hidden="true" />
    <input
      class="edit-input"
      aria-label={editing?.kind === "create" ? $t("workspace.files.newFileName") : $t("workspace.files.newName")}
      placeholder={$t("workspace.files.namePlaceholder")}
      bind:this={editInput}
      bind:value={editValue}
      onkeydown={onEditKeydown}
      onblur={() => void finishEdit(true)}
    />
  </li>
{/snippet}

{#snippet dirContents(dir: string, depth: number)}
  {@const listing = listings.get(dir)}
  {#if editing?.kind === "create" && editing.dir === dir}
    {@render editRow(depth)}
  {/if}
  {#if listing?.status === "ready"}
    {#each listing.entries as entry (entry.path)}
      {#if entry.isDir}
        {@const open = expanded.has(entry.path)}
        <li role="treeitem" aria-expanded={open} aria-selected="false">
          <button
            type="button"
            class="row"
            style:--depth={depth}
            title={entry.path}
            onclick={() => toggleDir(entry.path)}
            oncontextmenu={(event) => openMenu(event, folderMenuItems(entry.path))}
          >
            <ChevronRight size={14} class={open ? "chevron open" : "chevron"} aria-hidden="true" />
            {#if open}
              <FolderOpen size={14} class="node-icon icon-folder" aria-hidden="true" />
            {:else}
              <Folder size={14} class="node-icon icon-folder" aria-hidden="true" />
            {/if}
            <span class="label">{entry.name}</span>
          </button>
          {#if open}
            <ul role="group">
              {@render dirContents(entry.path, depth + 1)}
            </ul>
          {/if}
        </li>
      {:else if editing?.kind === "rename" && editing.path === entry.path}
        {@render editRow(depth)}
      {:else}
        <li role="treeitem" aria-selected={entry.path === activeFilePath}>
          <button
            type="button"
            class="row leaf"
            class:active={entry.path === activeFilePath}
            style:--depth={depth}
            title={entry.path}
            onclick={() => openFile(entry.path)}
            oncontextmenu={(event) => openMenu(event, fileMenuItems(entry.path))}
            onkeydown={(event) => {
              if (event.key === "F2") {
                event.preventDefault();
                void startRename(entry.path);
              } else if (event.key === "Delete") {
                event.preventDefault();
                void requestTrash(entry.path);
              }
            }}
          >
            <FileCode size={14} class="node-icon icon-file" aria-hidden="true" />
            <span class="label">{entry.name}</span>
            {#if dirtyPaths.has(entry.path)}
              <span class="dirty-dot" title={$t("workspace.files.unsaved")}></span>
            {/if}
          </button>
        </li>
      {/if}
    {/each}
    {#if listing.entries.length === 0 && dir === folder && editing?.kind !== "create"}
      <li class="empty">{$t("workspace.files.empty")}</li>
    {/if}
  {:else if listing?.status === "error"}
    <li class="row message error" style:--depth={depth} title={listing.message}>
      <TriangleAlert size={13} aria-hidden="true" />
      <span class="label">{$t("workspace.files.readError")}</span>
    </li>
  {/if}
{/snippet}

<section class="file-tree" aria-label={$t("workspace.files.aria")}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header class="files-header" oncontextmenu={(event) => openMenu(event, folderMenuItems(folder))}>
    <button
      type="button"
      class="files-title"
      title={folder}
      aria-expanded={!collapsed}
      onclick={() => setFilePanelCollapsed(!collapsed)}
    >
      <ChevronRight size={14} class={collapsed ? "chevron" : "chevron open"} aria-hidden="true" />
      <span class="label">{folderName}</span>
    </button>
    <div class="files-actions">
      <button
        type="button"
        class="action"
        title={$t("workspace.files.newFile")}
        aria-label={$t("workspace.files.newFile")}
        onclick={() => void startCreate(folder)}
      >
        <FilePlus size={13} aria-hidden="true" />
      </button>
      <button type="button" class="action" title={$t("workspace.files.refresh")} aria-label={$t("workspace.files.refreshAria")} onclick={refreshAll}>
        <RefreshCw size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="action"
        title={$t("workspace.files.closeFolder")}
        aria-label={$t("workspace.files.closeFolder")}
        onclick={() => closeSqlFolder(profileId)}
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  </header>

  <!-- Siempre montado: al plegar, el contenedor (en +layout.svelte) anima
       su alto y esto queda recortado, como el sidebar al ocultarse. inert
       lo saca del foco y de los lectores mientras esta plegado. -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <nav
    class="files-scroll"
    aria-label={$t("workspace.files.folderAria")}
    inert={collapsed}
    oncontextmenu={(event) => openMenu(event, folderMenuItems(folder))}
  >
    <ul class="tree" role="tree">
      {@render dirContents(folder, 0)}
    </ul>
  </nav>
</section>

{#if menu}
  <ContextMenu x={menu.x} y={menu.y} items={menu.items} onclose={() => (menu = null)} />
{/if}

{#if pendingTrash}
  {@const path = pendingTrash}
  <ConfirmDialog
    tone="warning"
    title={$t("workspace.files.trashTitle", { name: fileNameFromPath(path) })}
    message={$t("workspace.files.trashMessage")}
    confirmLabel={$t("workspace.files.trash")}
    onconfirm={() => void confirmTrash()}
    oncancel={() => (pendingTrash = null)}
  />
{/if}

<style>
  .file-tree {
    display: flex;
    min-height: 0;
    height: 100%;
    flex-direction: column;
    font-size: 0.8rem;
  }

  .files-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 2rem;
    padding: 0 var(--space-2) 0 var(--space-1);
  }

  .files-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 5px;
    padding: 2px var(--space-1);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .files-title:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  /* Igual que el explorador de la base: las acciones aparecen solo con el
     cursor sobre el panel o con foco dentro. */
  .files-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  .file-tree:hover .files-actions,
  .files-actions:focus-within {
    opacity: 1;
  }

  .action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      color var(--duration-fast),
      background-color var(--duration-fast);
  }

  .action:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .action:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .files-scroll {
    overflow-y: auto;
    min-height: 0;
    flex: 1;
    padding: 0 var(--space-1) var(--space-2);
    box-sizing: border-box;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Mismas medidas que las filas de SchemaTree.svelte: 16px por nivel y las
     hojas corridas el ancho del chevron. */
  .row {
    --indent: 16px;
    display: flex;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    align-items: center;
    gap: 5px;
    min-height: 1.5rem;
    padding: 0 var(--space-2) 0 calc(var(--space-1) + var(--depth) * var(--indent));
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }

  .row:hover {
    background: var(--surface-hover);
  }

  .row:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .row.leaf,
  .row.editing {
    padding-left: calc(var(--space-1) + var(--depth) * var(--indent) + 19px);
  }

  .row.active {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .row.message {
    color: var(--text-secondary);
    cursor: default;
  }

  .row.error {
    color: var(--danger);
  }

  .row.editing {
    cursor: default;
  }

  .row.editing:hover {
    background: transparent;
  }

  :global(.file-tree .chevron) {
    flex-shrink: 0;
    color: var(--text-secondary);
    transition: transform var(--duration-fast) ease;
  }

  .files-title :global(.chevron) {
    transition-duration: calc(var(--duration-fast) * 1.6);
  }

  :global(.file-tree .chevron.open) {
    transform: rotate(90deg);
  }

  .row :global(.node-icon) {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .row :global(.icon-folder) {
    color: var(--accent);
  }

  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* La misma bolita que la pestaña del archivo (Workspace.svelte). */
  .dirty-dot {
    flex-shrink: 0;
    width: 0.4375rem;
    height: 0.4375rem;
    margin-left: auto;
    border-radius: 50%;
    background: var(--accent);
  }

  .empty {
    padding: var(--space-1) var(--space-3);
    color: color-mix(in srgb, var(--text-secondary) 75%, transparent);
  }

  .edit-input {
    min-width: 0;
    flex: 1;
    padding: 1px var(--space-1);
    border: 1px solid var(--focus-ring);
    border-radius: calc(var(--radius-sm) - 2px);
    outline: none;
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
  }

</style>
