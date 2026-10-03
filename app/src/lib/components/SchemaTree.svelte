<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import {
    CalendarClock,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    CircleCheck,
    Columns2,
    Database,
    Eye,
    Folder,
    FolderOpen,
    Grid2x2,
    Key,
    Layers,
    ListOrdered,
    ListTree,
    LoaderCircle,
    Pin,
    PinOff,
    LockOpen,
    Minus,
    RefreshCw,
    Search,
    SquareCode,
    SquareFunction,
    Table,
    TriangleAlert,
    X,
    Zap,
  } from "@lucide/svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import { buildExplorerTree, expandableKeys, type ExplorerIcon, type ExplorerNode } from "$lib/explorerTree";
  import { t } from "$lib/i18n";
  import type { DatabaseExplorer } from "$lib/types";
  import { pinnedTables, togglePinnedTable } from "$lib/stores/pinnedTables";

  let {
    explorer,
    connectionLabel,
    profileId,
    refreshing = false,
    loadingSchemas = false,
    hideShortcut = "",
    onrefresh,
    onhide,
    onopenfile,
    onopenfolder,
    onopentable = () => {},
    onschemaschange,
  }: {
    explorer: DatabaseExplorer | null;
    // "schema@host", la misma etiqueta de origen que usa Workspace.svelte.
    connectionLabel: string;
    // Conexion activa: las tablas fijadas se guardan por conexion.
    profileId: string;
    refreshing?: boolean;
    loadingSchemas?: boolean;
    hideShortcut?: string;
    onrefresh: () => void;
    onhide: () => void;
    // Abre un .sql del disco en una pestaña.
    onopenfile: () => void;
    // Abre una carpeta de scripts en el panel de archivos.
    onopenfolder: () => void;
    // Doble clic en una tabla o vista: abrir sus datos en una pestaña.
    onopentable?: (schema: string, name: string) => void;
    // Schemas extra a mostrar (el por defecto se incluye siempre).
    onschemaschange: (schemas: string[]) => void;
  } = $props();

  type IconComponent = typeof Table;

  // Menu del boton de carpeta, anclado debajo del boton.
  let openMenuAt = $state<{ x: number; y: number } | null>(null);

  function openMenu(event: MouseEvent) {
    event.stopPropagation();
    window.dispatchEvent(new Event("khipu:context-menu"));
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    openMenuAt = { x: rect.left, y: rect.bottom + 4 };
  }

  const ICONS: Record<ExplorerIcon, IconComponent> = {
    pinned: Pin,
    schema: Grid2x2,
    folder: Folder,
    table: Table,
    view: Eye,
    materializedView: Layers,
    column: Columns2,
    // Misma forma (Key) para PK, unique y FK, como en el header del grid de
    // resultados: la diferencia es el color (ver estilos .icon-*).
    columnPrimaryKey: Key,
    key: Key,
    primaryKey: Key,
    foreignKey: Key,
    index: ListTree,
    trigger: Zap,
    check: CircleCheck,
    procedure: SquareCode,
    function: SquareFunction,
    sequence: ListOrdered,
    event: CalendarClock,
  };

  const CONNECTION_KEY = "connection";

  // Bordes que se desvanecen al hacer scroll (como las pestañas de consola):
  // arriba solo si hay contenido oculto arriba, abajo si queda mas por ver.
  function scrollFade(node: HTMLElement) {
    const update = () => {
      node.classList.toggle("fade-top", node.scrollTop > 1);
      node.classList.toggle("fade-bottom", node.scrollTop + node.clientHeight < node.scrollHeight - 1);
    };
    // El contenido cambia de alto al abrir o cerrar ramas del arbol.
    const observer = new ResizeObserver(update);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    node.addEventListener("scroll", update, { passive: true });
    update();
    return {
      destroy() {
        observer.disconnect();
        node.removeEventListener("scroll", update);
      },
    };
  }

  let filter = $state("");
  // Estado explicito de cada nodo que el usuario abrio o cerro; lo que no
  // esta aca usa el default del nodo (defaultOpen, u openOnFilter con un
  // filtro activo). Sobrevive a recargas del arbol porque las claves son
  // estables (ver ExplorerNode.key).
  let expanded = $state(new Map<string, boolean>());
  let schemaPickerOpen = $state(false);
  let schemaPicker = $state<HTMLElement>();

  const filtering = $derived(filter.trim() !== "");
  // Solo se avisa cuando se sabe que NO esta cifrada: el caso cifrado no
  // agrega ruido al arbol (el detalle va en el tooltip de la conexion), y
  // "desconocido" no es motivo de alarma.
  const unencrypted = $derived(explorer?.tls.encrypted === false);
  const connectionTitle = $derived.by(() => {
    if (!explorer) return connectionLabel;
    const tls =
      explorer.tls.encrypted === true
        ? $t("explorer.tls.encrypted", { detail: explorer.tls.detail ?? $t("explorer.tls.encryptedDefault") })
        : explorer.tls.encrypted === false
          ? $t("explorer.tls.unencrypted")
          : $t("explorer.tls.unknown");
    return `${connectionLabel}\n${explorer.context.server.label} · ${tls}`;
  });
  const nodes = $derived(
    explorer ? buildExplorerTree(explorer, filter, $pinnedTables[profileId] ?? [], $t("explorer.pinned")) : [],
  );

  // Fijar / desfijar una tabla: el alfiler de la fila o la tecla P con la
  // fila enfocada.
  function togglePin(node: ExplorerNode) {
    if (node.relation) togglePinnedTable(profileId, node.relation.schema, node.relation.name);
  }

  function onRowKeydown(event: KeyboardEvent, node: ExplorerNode) {
    if (!node.relation || event.ctrlKey || event.altKey || event.metaKey || event.key.toLowerCase() !== "p") return;
    event.preventDefault();
    togglePin(node);
  }
  const visibleSchemas = $derived(new Set(explorer?.schemas.map((objects) => objects.schema) ?? []));

  function isOpen(node: ExplorerNode): boolean {
    const explicit = expanded.get(node.key);
    if (explicit !== undefined) return explicit;
    return filtering ? !!node.openOnFilter : !!node.defaultOpen;
  }

  function isConnectionOpen(): boolean {
    return expanded.get(CONNECTION_KEY) ?? true;
  }

  function toggle(key: string, open: boolean) {
    const next = new Map(expanded);
    next.set(key, !open);
    expanded = next;
  }

  // Un solo boton alterna entre colapsar y expandir. "Expandir" llega hasta
  // las carpetas por tipo (tables, views...) sin abrir el interior de cada
  // tabla, que con cientos de tablas seria ilegible.
  const anyOpen = $derived(
    isConnectionOpen() && nodes.some((node) => isOpen(node) && node.children?.some((child) => isOpen(child))),
  );

  function collapseAll() {
    filter = "";
    const next = new Map<string, boolean>([[CONNECTION_KEY, false]]);
    for (const key of expandableKeys(nodes)) next.set(key, false);
    expanded = next;
  }

  function expandAll() {
    const next = new Map<string, boolean>([[CONNECTION_KEY, true]]);
    for (const key of expandableKeys(nodes, 1)) next.set(key, true);
    expanded = next;
  }

  function toggleSchema(schema: string) {
    if (!explorer || schema === explorer.defaultSchema) return;
    const extra = explorer.schemas
      .map((objects) => objects.schema)
      .filter((name) => name !== explorer.defaultSchema && name !== schema);
    if (!visibleSchemas.has(schema)) extra.push(schema);
    onschemaschange(extra);
  }

  function closeSchemaPickerOnOutsideClick(event: PointerEvent) {
    if (schemaPickerOpen && schemaPicker && !schemaPicker.contains(event.target as Node)) {
      schemaPickerOpen = false;
    }
  }
</script>

<svelte:window onpointerdown={closeSchemaPickerOnOutsideClick} />

{#if openMenuAt}
  <ContextMenu
    x={openMenuAt.x}
    y={openMenuAt.y}
    items={[
      { label: $t("explorer.open.file"), action: onopenfile },
      { label: $t("explorer.open.folder"), action: onopenfolder },
    ]}
    onclose={() => (openMenuAt = null)}
  />
{/if}

{#snippet chevron(open: boolean)}
  <ChevronRight size={14} class={open ? "chevron open" : "chevron"} aria-hidden="true" />
{/snippet}

{#snippet treeNode(node: ExplorerNode, depth: number)}
  {@const Icon = ICONS[node.icon]}
  {@const hasChildren = !!node.children && node.children.length > 0}
  {@const open = hasChildren && isOpen(node)}
  <li role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected="false">
    <div class="row-wrap" class:relation={!!node.relation}>
    {#if hasChildren}
      <button
        type="button"
        class="row"
        style:--depth={depth}
        use:tooltip={node.title ?? (node.detail ? `${node.label} ${node.detail}` : node.label)}
        onclick={() => toggle(node.key, open)}
        onkeydown={(event) => onRowKeydown(event, node)}
        ondblclick={() => {
          if (!node.relation) return;
          // El doble clic ya alterno dos veces (abrio y cerro): se deja como
          // estaba y se abre la tabla.
          onopentable(node.relation.schema, node.relation.name);
        }}
      >
        {@render chevron(open)}
        {@render nodeContent(node, Icon)}
      </button>
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="row leaf"
        style:--depth={depth}
        use:tooltip={node.title ?? (node.detail ? `${node.label} ${node.detail}` : node.label)}
        ondblclick={() => node.relation && onopentable(node.relation.schema, node.relation.name)}
      >
        {@render nodeContent(node, Icon)}
      </div>
    {/if}
    {#if node.relation}
      <button
        type="button"
        class="pin-toggle"
        class:on={node.pinned}
        tabindex="-1"
        use:tooltip={node.pinned ? $t("explorer.unpin") : $t("explorer.pin")}
        onclick={() => togglePin(node)}
      >
        {#if node.key.startsWith("pinned/")}
          <PinOff size={12} aria-hidden="true" />
        {:else}
          <Pin size={12} aria-hidden="true" />
        {/if}
      </button>
    {/if}
    </div>

    {#if open}
      <ul role="group">
        {#each node.children ?? [] as child (child.key)}
          {@render treeNode(child, depth + 1)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}

{#snippet nodeContent(node: ExplorerNode, Icon: IconComponent)}
  <Icon size={node.icon === "folder" ? 14 : 13} class={`node-icon icon-${node.icon}`} aria-hidden="true" />
  <span class="label">{node.label}</span>
  {#if node.count !== undefined}
    <span class="count">{node.count}</span>
  {/if}
  {#if node.detail}
    <span class="detail">{node.detail}</span>
  {/if}
  {#if node.warnings}
    <span class="warning" use:tooltip={node.warnings.join("\n")}>
      <TriangleAlert size={12} aria-label={$t("explorer.schema.warnings")} />
    </span>
  {/if}
{/snippet}

<div class="schema-tree">
  <header class="explorer-header">
    <span class="explorer-title">{$t("explorer.title")}</span>
    <div class="explorer-actions">
      <button
        type="button"
        class="action"
        use:tooltip={$t("explorer.open.label")}
        aria-label={$t("explorer.open.label")}
        aria-haspopup="menu"
        onclick={openMenu}
      >
        <FolderOpen size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="action"
        use:tooltip={anyOpen ? $t("explorer.collapseAll") : $t("explorer.expandAll")}
        aria-label={anyOpen ? $t("explorer.collapseAll") : $t("explorer.expandAll")}
        onclick={() => (anyOpen ? collapseAll() : expandAll())}
      >
        {#if anyOpen}
          <ChevronsDownUp size={14} aria-hidden="true" />
        {:else}
          <ChevronsUpDown size={14} aria-hidden="true" />
        {/if}
      </button>
      <button
        type="button"
        class="action"
        class:spinning={refreshing}
        use:tooltip={$t("explorer.refresh")}
        aria-label={$t("explorer.refresh.label")}
        disabled={refreshing}
        onclick={onrefresh}
      >
        <RefreshCw size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        class="action"
        use:tooltip={hideShortcut ? $t("explorer.hide.withShortcut", { shortcut: hideShortcut }) : $t("explorer.hide")}
        aria-label={$t("explorer.hide.label")}
        onclick={onhide}
      >
        <Minus size={14} aria-hidden="true" />
      </button>
    </div>
  </header>

  <div class="filter">
    <Search size={13} class="filter-icon" aria-hidden="true" />
    <input
      type="text"
      placeholder={$t("explorer.filter.placeholder")}
      aria-label={$t("explorer.filter.label")}
      bind:value={filter}
    />
    {#if filter}
      <button type="button" class="clear-filter" aria-label={$t("explorer.filter.clear")} onclick={() => (filter = "")}>
        <X size={12} aria-hidden="true" />
      </button>
    {/if}
  </div>

  <nav class="tree-scroll" aria-label={$t("explorer.tree.label")} use:scrollFade>
    <ul class="tree" role="tree">
      <li role="treeitem" aria-expanded={isConnectionOpen()} aria-selected="false">
        <div class="connection-row">
          <button
            type="button"
            class="row"
            style:--depth={0}
            use:tooltip={connectionTitle}
            onclick={() => toggle(CONNECTION_KEY, isConnectionOpen())}
          >
            {@render chevron(isConnectionOpen())}
            <Database size={14} class="node-icon icon-connection" aria-hidden="true" />
            <span class="label strong">{connectionLabel}</span>
            {#if unencrypted}
              <span
                class="warning"
                use:tooltip={explorer?.tls.fellBack
                  ? $t("explorer.unencrypted.fellBack")
                  : $t("explorer.unencrypted.noTls")}
              >
                <LockOpen size={12} aria-label={$t("explorer.unencrypted.label")} />
              </span>
            {/if}
          </button>

          {#if explorer && explorer.availableSchemas.length > 1}
            <div class="schema-picker" bind:this={schemaPicker}>
              <button
                type="button"
                class="schema-count"
                aria-haspopup="true"
                aria-expanded={schemaPickerOpen}
                use:tooltip={$t("explorer.schemas.pick")}
                onclick={() => (schemaPickerOpen = !schemaPickerOpen)}
              >
                {#if loadingSchemas}
                  <LoaderCircle size={11} class="spin" aria-label={$t("explorer.schemas.loading")} />
                {/if}
                {$t("explorer.schemas.count", { visible: visibleSchemas.size, total: explorer.availableSchemas.length })}
                <ChevronDown size={11} aria-hidden="true" />
              </button>

              {#if schemaPickerOpen}
                <div class="ui-menu schema-menu" role="menu" aria-label={$t("explorer.schemas.menu")}>
                  {#each explorer.availableSchemas as schema (schema)}
                    {@const isDefault = schema === explorer.defaultSchema}
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={visibleSchemas.has(schema)}
                      class="ui-menu-item schema-option"
                      disabled={isDefault || loadingSchemas}
                      use:tooltip={isDefault ? $t("explorer.schemas.defaultTitle") : undefined}
                      onclick={() => toggleSchema(schema)}
                    >
                      <span class="ui-checkbox-box">
                        {#if visibleSchemas.has(schema)}
                          <Check size={10} strokeWidth={3} aria-hidden="true" />
                        {/if}
                      </span>
                      <span class="label">{schema}</span>
                      {#if isDefault}
                        <span class="detail">{$t("explorer.schemas.default")}</span>
                      {/if}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        {#if isConnectionOpen()}
          <ul role="group">
            {#each nodes as node (node.key)}
              {@render treeNode(node, 1)}
            {:else}
              <li class="empty">{filtering ? $t("explorer.tree.noMatches") : $t("explorer.tree.empty")}</li>
            {/each}
          </ul>
        {/if}
      </li>
    </ul>
  </nav>
</div>

<style>
  .schema-tree {
    display: flex;
    height: 100%;
    flex-direction: column;
    font-size: 0.8rem;
  }

  /* Barra de titulo al estilo "Database Explorer": las acciones solo se ven
     con el cursor sobre el panel (o con foco dentro, para teclado), asi el
     sidebar queda limpio mientras no se usa. */
  .explorer-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 2rem;
    padding: 0 var(--space-2) 0 var(--space-3);
  }

  .explorer-title {
    overflow: hidden;
    color: var(--text-primary);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .explorer-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  .schema-tree:hover .explorer-actions,
  .explorer-actions:focus-within {
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

  .action:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .action:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .action:disabled {
    cursor: not-allowed;
  }

  /* .spin (el icono que gira) es global, en styles/controls.css. */
  .action.spinning :global(svg) {
    animation: ui-spin 0.7s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .action.spinning :global(svg) {
      animation: none;
    }
  }

  .filter {
    position: relative;
    flex-shrink: 0;
    padding: 0 var(--space-2) var(--space-2);
  }

  .filter :global(.filter-icon) {
    position: absolute;
    top: calc(50% - var(--space-2) / 2);
    left: calc(var(--space-2) * 2);
    color: var(--text-secondary);
    transform: translateY(-50%);
  }

  .filter input {
    box-sizing: border-box;
    width: 100%;
    height: 1.75rem;
    padding: 0 var(--space-5) 0 1.75rem;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
  }

  .filter input:focus-visible {
    border-color: var(--focus-ring);
    outline: none;
  }

  .clear-filter {
    position: absolute;
    top: calc(50% - var(--space-2) / 2);
    right: calc(var(--space-2) * 2 + 2px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transform: translateY(-50%);
  }

  .clear-filter:hover {
    color: var(--text-primary);
  }

  .tree-scroll {
    --fade-top: 0px;
    --fade-bottom: 0px;
    overflow-y: auto;
    min-height: 0;
    padding: 0 var(--space-1) var(--space-2);
    box-sizing: border-box;
    mask-image: linear-gradient(
      to bottom,
      transparent,
      #000 var(--fade-top),
      #000 calc(100% - var(--fade-bottom)),
      transparent
    );
    transition:
      --fade-top 180ms ease,
      --fade-bottom 180ms ease;
  }

  .tree-scroll:global(.fade-top) {
    --fade-top: 1.5rem;
  }

  .tree-scroll:global(.fade-bottom) {
    --fade-bottom: 1.5rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Cada nivel indenta 16px; las hojas no tienen chevron, asi que suman su
     ancho para quedar alineadas con el texto de sus hermanas con hijos. */
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
    cursor: default;
  }

  button.row {
    cursor: pointer;
  }

  /* El alfiler de una tabla o vista: aparece al pasar el mouse; en las
     fijadas queda siempre, tenue. La fila le deja lugar a la derecha. */
  .row-wrap {
    position: relative;
  }

  .row-wrap.relation > .row {
    overflow: hidden;
    padding-right: 2.25rem;
  }

  /* Un nombre largo termina en "…" antes del alfiler, no pasa por debajo. */
  .row-wrap.relation > .row .label {
    min-width: 0;
    flex-shrink: 1;
  }

  /* Aire a la derecha: pegado al borde, el clic caia en la barra de scroll. */
  .pin-toggle {
    position: absolute;
    top: 50%;
    right: var(--space-3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0;
    transform: translateY(-50%);
    transition:
      opacity var(--duration-fast),
      background-color var(--duration-fast),
      color var(--duration-fast);
  }

  .pin-toggle.on {
    opacity: 0.55;
  }

  .row-wrap:hover .pin-toggle {
    opacity: 1;
  }

  .pin-toggle:hover {
    background: color-mix(in srgb, var(--text-primary) 10%, transparent);
    color: var(--text-primary);
  }

  .row:hover {
    background: var(--surface-hover);
  }

  .row:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .row.leaf {
    padding-left: calc(var(--space-1) + var(--depth) * var(--indent) + 19px);
  }

  .row :global(.chevron) {
    flex-shrink: 0;
    color: var(--text-secondary);
    transition: transform var(--duration-fast) ease;
  }

  .row :global(.chevron.open) {
    transform: rotate(90deg);
  }

  .row :global(.node-icon) {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .row :global(.icon-connection),
  .row :global(.icon-folder),
  .row :global(.icon-foreignKey) {
    color: var(--accent);
  }

  /* Mismo token (--key-primary) que la PK en el header del grid de
     resultados (DataGrid.svelte) y en el autocompletado (sqlEditorIcons.css). */
  .row :global(.icon-primaryKey),
  .row :global(.icon-columnPrimaryKey) {
    color: var(--key-primary);
  }

  .label {
    flex-shrink: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .label.strong {
    font-weight: 600;
  }

  .count,
  .detail {
    color: var(--text-secondary);
    font-size: 0.7rem;
  }

  .count {
    flex-shrink: 0;
  }

  .detail {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .warning {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--warning);
  }

  .connection-row {
    position: relative;
    display: flex;
    align-items: center;
  }

  .connection-row > .row {
    flex: 1;
    min-width: 0;
  }

  /* El nombre de la conexión cede espacio (con elipsis) al contador de
     schemas; si no, con un host largo se monta encima de él. */
  .connection-row .label {
    flex-shrink: 1;
    min-width: 0;
    white-space: nowrap;
  }

  .schema-picker {
    position: static;
    flex-shrink: 0;
  }

  .schema-count {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-right: var(--space-1);
    padding: 1px 5px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.68rem;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color var(--duration-fast),
      border-color var(--duration-fast);
  }

  .schema-count:hover {
    border-color: var(--control-border);
    color: var(--text-primary);
  }

  .schema-count:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .schema-menu {
    position: absolute;
    z-index: 20;
    top: calc(100% + 2px);
    right: var(--space-1);
    left: var(--space-2);
    overflow-y: auto;
    max-height: 18rem;
  }



  .schema-option:disabled {
    cursor: default;
  }

  .schema-option:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }



  .schema-option:disabled .ui-checkbox-box {
    opacity: 0.6;
  }

  .empty {
    padding: var(--space-2) var(--space-2) var(--space-2) calc(var(--space-1) + 2 * 16px);
    color: var(--text-secondary);
  }
</style>
