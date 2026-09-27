<script lang="ts">
  import { tick } from "svelte";
  import { fly } from "svelte/transition";
  import { Check, ChevronDown, FolderMinus, Plus } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  // Pastilla para elegir el grupo de una conexion: sin grupo muestra
  // "+ Añadir grupo"; con grupo, su nombre. La pastilla no cambia de forma al
  // abrirse: debajo aparece un menu con un filtro arriba y los grupos
  // existentes, con "Crear «x»" cuando lo escrito no existe todavia.
  let {
    value = $bindable<string | undefined>(undefined),
    groups,
    disabled = false,
  }: {
    value?: string;
    // Grupos ya usados por otras conexiones.
    groups: string[];
    disabled?: boolean;
  } = $props();

  let open = $state(false);
  let query = $state("");
  let active = $state(0);
  let input = $state<HTMLInputElement>();
  let trigger = $state<HTMLButtonElement>();
  let root = $state<HTMLElement>();

  const trimmed = $derived(query.trim());
  const matches = $derived(
    groups.filter((group) => group.toLowerCase().includes(trimmed.toLowerCase())),
  );
  const canCreate = $derived(
    trimmed !== "" && !groups.some((group) => group.toLowerCase() === trimmed.toLowerCase()),
  );
  // Una lista plana de acciones para la navegacion con flechas.
  const options = $derived([
    ...matches.map((group) => ({ kind: "select" as const, group })),
    ...(canCreate ? [{ kind: "create" as const, group: trimmed }] : []),
    ...(value && trimmed === "" ? [{ kind: "remove" as const, group: value }] : []),
  ]);

  async function openPicker() {
    if (disabled) return;
    open = true;
    query = "";
    active = 0;
    await tick();
    input?.focus();
  }

  function close() {
    open = false;
    query = "";
  }

  function choose(option: (typeof options)[number]) {
    value = option.kind === "remove" ? undefined : option.group;
    close();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      active = Math.min(options.length - 1, active + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      active = Math.max(0, active - 1);
    } else if (event.key === "Enter") {
      // Enter nunca envia el formulario desde aca.
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      // Cierra solo el selector, no el modal que lo contiene.
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger?.focus();
    }
  }

  function handleFocusOut(event: FocusEvent) {
    if (!root?.contains(event.relatedTarget as Node | null)) close();
  }

  $effect(() => {
    // La seleccion vuelve al primer resultado cada vez que cambia el filtro.
    void trimmed;
    active = 0;
  });
</script>

<div class="group-picker" bind:this={root} onfocusout={handleFocusOut}>
  <button
    bind:this={trigger}
    type="button"
    class="pill"
    class:add={!value}
    class:open
    {disabled}
    title={value ? $t("connections.group.change") : undefined}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open ? close() : openPicker())}
  >
    {#if value}
      <span class="pill-label">{value}</span>
      <ChevronDown size={13} class="pill-chevron" aria-hidden="true" />
    {:else}
      <Plus size={13} aria-hidden="true" />
      <span>{$t("connections.group.add")}</span>
    {/if}
  </button>

  {#if open}
    <div class="menu" transition:fly={{ y: -4, duration: 120 }}>
      <input
        bind:this={input}
        bind:value={query}
        class="filter"
        placeholder={$t("connections.group.search")}
        aria-label={$t("connections.group.search")}
        aria-autocomplete="list"
        aria-controls="group-picker-list"
        aria-activedescendant={options[active] ? `group-option-${active}` : undefined}
        role="combobox"
        aria-expanded="true"
        onkeydown={handleKeydown}
      />

      {#if options.length > 0}
        <div id="group-picker-list" class="options" role="listbox" aria-label={$t("connections.group.list")}>
          {#each options as option, index (option.kind + option.group)}
            <button
              id={`group-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === active}
              class:active={index === active}
              class:remove={option.kind === "remove"}
              tabindex="-1"
              onmousedown={(event) => event.preventDefault()}
              onmouseenter={() => (active = index)}
              onclick={() => choose(option)}
            >
              {#if option.kind === "create"}
                <Plus size={13} aria-hidden="true" />
                <span>{$t("connections.group.create", { name: option.group })}</span>
              {:else if option.kind === "remove"}
                <FolderMinus size={13} aria-hidden="true" />
                <span>{$t("connections.group.remove")}</span>
              {:else}
                <span class="check">
                  {#if option.group === value}<Check size={13} aria-hidden="true" />{/if}
                </span>
                <span>{option.group}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .group-picker {
    position: relative;
    display: inline-flex;
  }

  .pill {
    display: inline-flex;
    max-width: 14rem;
    align-items: center;
    gap: 5px;
    min-height: 1.875rem;
    box-sizing: border-box;
    padding: 0 var(--space-3);
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--surface-elevated);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--duration-fast),
      border-color var(--duration-fast),
      color var(--duration-fast);
  }

  .pill.add {
    color: var(--accent);
  }

  .pill:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-elevated) 80%, var(--text-primary));
  }

  /* En claro, mezclar 20% de texto (casi negro) sobre blanco da un gris
     pesado: ahi el hover es el del tema. */
  :global(:root[data-scheme="light"]) .pill:hover:not(:disabled) {
    background: var(--surface-hover);
  }

  .pill:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .pill:disabled {
    color: var(--control-disabled);
    cursor: not-allowed;
  }

  .pill-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pill.open {
    background: color-mix(in srgb, var(--surface-elevated) 80%, var(--text-primary));
  }

  :global(:root[data-scheme="light"]) .pill.open {
    background: var(--surface-hover);
  }

  .pill :global(.pill-chevron) {
    flex-shrink: 0;
    transition: transform var(--duration-fast);
  }

  .pill.open :global(.pill-chevron) {
    transform: rotate(180deg);
  }

  /* Alineado a la derecha: la pastilla vive en el borde derecho del
     formulario y el menu no debe salirse del modal. */
  .menu {
    position: absolute;
    z-index: 30;
    top: calc(100% + 4px);
    right: 0;
    width: 13rem;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
  }

  .filter {
    width: 100%;
    box-sizing: border-box;
    padding: 6px var(--space-2);
    border: 0;
    border-bottom: 1px solid var(--border);
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
  }

  .filter::placeholder {
    color: var(--text-secondary);
  }

  .options {
    max-height: 12rem;
    overflow-y: auto;
    padding-top: 4px;
  }

  .menu button {
    display: flex;
    width: 100%;
    align-items: center;
    gap: var(--space-2);
    padding: 6px var(--space-2);
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
  }

  .menu button.active {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .menu button.remove {
    color: var(--text-secondary);
  }

  .check {
    display: inline-flex;
    width: 13px;
    color: var(--accent);
  }
</style>
