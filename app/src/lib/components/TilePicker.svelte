<script module lang="ts">
  export interface PickerItem {
    id: string;
    title: string;
    icon: "console" | "file" | "output" | "result" | "pinned";
  }
</script>

<script lang="ts">
  import { tick } from "svelte";
  import { FileCode, Pin, Plus, Search, SquareTerminal, Table } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  // Elegir que va en mosaico junto a lo enfocado (Ctrl+Alt+M): una consola en
  // el editor o una pestaña en el resultado. Capa flotante como el
  // historial, todo con el teclado desde el filtro. Enter la pone a la
  // derecha, Shift+Enter debajo; con Ctrl, de toda el area (al lado de todo
  // lo que se ve, no solo de lo enfocado). Esc cierra. Solo lista lo que no
  // se ve: cada cosa vive en un unico mosaico. Con `newLabel`, la ultima
  // opcion abre una nueva ahi.

  let {
    items,
    label,
    placeholder,
    newLabel = null,
    onpick,
    onclose,
  }: {
    items: PickerItem[];
    label: string;
    placeholder: string;
    newLabel?: string | null;
    // null: una consola nueva.
    onpick: (id: string | null, side: "right" | "bottom", whole: boolean) => void;
    onclose: (refocus: boolean) => void;
  } = $props();

  const NEW = "\u0000new";
  let query = $state("");
  let activeId = $state<string | null>(null);
  let root = $state<HTMLElement>();
  let list = $state<HTMLElement>();

  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle ? items.filter((item) => item.title.toLowerCase().includes(needle)) : items;
    const ids = matching.map((item) => item.id);
    return newLabel ? [...ids, NEW] : ids;
  });
  const active = $derived(filtered.includes(activeId ?? "") ? activeId : filtered[0]);
  const byId = $derived(new Map(items.map((item) => [item.id, item])));

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
  }

  $effect(() => {
    void query;
    activeId = null;
  });

  async function move(delta: number) {
    if (filtered.length === 0) return;
    const index = active ? filtered.indexOf(active) : -1;
    const next = filtered[Math.min(filtered.length - 1, Math.max(0, index + delta))];
    activeId = next;
    await tick();
    list?.querySelector(`[data-index="${filtered.indexOf(next)}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function pick(id: string | null | undefined, side: "right" | "bottom", whole: boolean) {
    if (id === undefined || id === null) return;
    onpick(id === NEW ? null : id, side, whole);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      void move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && !event.altKey && !event.metaKey) {
      event.preventDefault();
      // Que el despachador de atajos no lo tome tambien (Ctrl+Enter ejecuta).
      event.stopPropagation();
      pick(active, event.shiftKey ? "bottom" : "right", event.ctrlKey);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onclose(true);
    }
  }

  // Si el foco se va a otra parte de la app, se cierra sin robarlo.
  function onFocusOut() {
    setTimeout(() => {
      if (document.hasFocus() && root && !root.contains(document.activeElement)) onclose(false);
    });
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="tile-picker ui-menu" bind:this={root} onkeydown={onKeydown} onfocusout={onFocusOut}>
  <label class="ui-field compact">
    <Search size={13} aria-hidden="true" />
    <input
      type="search"
      bind:value={query}
      {placeholder}
      aria-label={label}
      role="combobox"
      aria-expanded="true"
      aria-controls="tile-picker-list"
      aria-activedescendant={active ? `tile-picker-${filtered.indexOf(active)}` : undefined}
      use:focusOnMount
    />
  </label>

  <div class="entries" id="tile-picker-list" role="listbox" aria-label={label} bind:this={list}>
    {#if filtered.length === 0}
      <p class="empty">{$t("mosaic.picker.empty")}</p>
    {/if}
    {#each filtered as id, index (id)}
      {@const item = byId.get(id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        id={`tile-picker-${index}`}
        data-index={index}
        class="ui-menu-item entry"
        class:active={id === active}
        class:new-entry={!item}
        role="option"
        tabindex="-1"
        aria-selected={id === active}
        onmousedown={(event) => event.preventDefault()}
        onclick={(event) => pick(id, event.shiftKey ? "bottom" : "right", event.ctrlKey)}
      >
        {#if !item}
          <Plus size={13} aria-hidden="true" />
          <span class="title">{newLabel}</span>
        {:else}
          {#if item.icon === "file"}
            <FileCode size={13} aria-hidden="true" />
          {:else if item.icon === "result"}
            <Table size={13} aria-hidden="true" />
          {:else if item.icon === "pinned"}
            <Pin size={13} aria-hidden="true" />
          {:else}
            <SquareTerminal size={13} aria-hidden="true" />
          {/if}
          <span class="title">{item.title}</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="hints">
    <span><span class="ui-keys"><kbd>Enter</kbd></span> {$t("mosaic.picker.right")}</span>
    <span><span class="ui-keys"><kbd>Shift</kbd><kbd>Enter</kbd></span> {$t("mosaic.picker.below")}</span>
    <span><span class="ui-keys"><kbd>Ctrl</kbd></span> {$t("mosaic.picker.whole")}</span>
    <span><span class="ui-keys"><kbd>Esc</kbd></span> {$t("history.close")}</span>
  </div>
</div>

<style>
  /* Centrada arriba del area, como el historial. */
  .tile-picker {
    position: absolute;
    top: var(--space-3);
    right: 0;
    left: 0;
    z-index: 30;
    width: min(420px, calc(100% - 2 * var(--space-4)));
    max-height: calc(100% - 2 * var(--space-3));
    margin: 0 auto;
    gap: var(--space-2);
    padding: var(--space-2);
  }

  .entries {
    display: flex;
    min-height: 2rem;
    flex: 1;
    flex-direction: column;
    overflow-y: auto;
  }

  .entry {
    flex-shrink: 0;
    gap: var(--space-2);
  }

  .entry :global(svg) {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .title {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    margin: 0;
    padding: var(--space-3) var(--space-2);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    text-align: center;
  }

  .new-entry {
    color: var(--text-secondary);
  }

  .hints {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
    padding: 0 var(--space-1);
    color: var(--text-secondary);
    font-size: 0.6875rem;
  }
</style>
