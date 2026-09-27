<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { Ban, Check, ChevronDown, Pipette } from "@lucide/svelte";
  import { CONNECTION_COLORS, colorLabel, isPaletteColor } from "$lib/connectionColors";
  import { t } from "$lib/i18n";

  // Menu "Color ⌄" que va dentro del campo Nombre del formulario de
  // conexion, como en DataGrip: sin color, la paleta con nombre y un color
  // personalizado con el selector nativo del sistema.
  let {
    value = $bindable<string | undefined>(undefined),
    disabled = false,
  }: {
    value?: string;
    disabled?: boolean;
  } = $props();

  let open = $state(false);
  let root = $state<HTMLElement>();
  let customInput = $state<HTMLInputElement>();
  const custom = $derived(value !== undefined && !isPaletteColor(value));

  function choose(color: string | undefined) {
    value = color;
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      // Cierra el menu, no el modal que lo contiene.
      event.preventDefault();
      event.stopPropagation();
      open = false;
    }
  }

  function handleFocusOut(event: FocusEvent) {
    if (!root?.contains(event.relatedTarget as Node | null)) open = false;
  }
</script>

<div class="color-picker" bind:this={root} onfocusout={handleFocusOut} onkeydown={handleKeydown} role="presentation">
  <button
    type="button"
    class="trigger"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={$t("connections.color.buttonLabel", { color: colorLabel(value, $t) })}
    use:tooltip={colorLabel(value, $t)}
    {disabled}
    onclick={() => (open = !open)}
  >
    {#if value}
      <span class="dot" style:--dot={value}></span>
    {/if}
    <span>{$t("connections.color.button")}</span>
    <ChevronDown size={13} aria-hidden="true" />
  </button>

  {#if open}
    <div class="menu" role="menu" aria-label={$t("connections.color.menu")}>
      <button type="button" role="menuitemradio" aria-checked={!value} class:selected={!value} onclick={() => choose(undefined)}>
        <Ban size={13} class="none-icon" aria-hidden="true" />
        <span>{$t("connections.color.none")}</span>
      </button>
      <div class="separator" role="separator"></div>
      {#each CONNECTION_COLORS as option (option.value)}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={value === option.value}
          class:selected={value === option.value}
          onclick={() => choose(option.value)}
        >
          <span class="dot" style:--dot={option.value}></span>
          <span>{$t(option.labelKey)}</span>
          {#if value === option.value}<Check size={13} class="check" aria-hidden="true" />{/if}
        </button>
      {/each}
      <div class="separator" role="separator"></div>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={custom}
        class:selected={custom}
        onclick={() => customInput?.click()}
      >
        {#if custom}
          <span class="dot" style:--dot={value}></span>
        {:else}
          <Pipette size={13} class="none-icon" aria-hidden="true" />
        {/if}
        <span>{$t("connections.color.customOption")}</span>
        {#if custom}<Check size={13} class="check" aria-hidden="true" />{/if}
      </button>
    </div>
  {/if}

  <!-- Fuera del menu a proposito: el dialogo de color del sistema le quita
       el foco al menu y lo cierra, y el input tiene que seguir existiendo
       para recibir el color elegido. -->
  <input
    bind:this={customInput}
    class="native-color"
    type="color"
    tabindex="-1"
    aria-hidden="true"
    value={value ?? "#3b82f6"}
    oninput={(event) => (value = event.currentTarget.value.toLowerCase())}
  />
</div>

<style>
  .color-picker {
    position: relative;
    display: inline-flex;
  }

  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 6px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .trigger:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .trigger:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .trigger:disabled {
    cursor: not-allowed;
  }

  /* Como en DataGrip: anillo del color con un relleno tenue, no un punto
     solido; se lee igual en tema claro y oscuro. */
  .dot {
    display: inline-block;
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    box-sizing: border-box;
    border: 1.5px solid var(--dot);
    border-radius: 50%;
    background: color-mix(in srgb, var(--dot) 28%, transparent);
  }

  .menu {
    position: absolute;
    z-index: 30;
    top: calc(100% + 6px);
    right: 0;
    min-width: 11rem;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
  }

  .menu button {
    display: flex;
    width: 100%;
    align-items: center;
    gap: var(--space-2);
    padding: 5px var(--space-2);
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
  }

  .menu button:hover,
  .menu button:focus-visible {
    outline: none;
    background: color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .menu :global(.none-icon) {
    color: var(--text-secondary);
  }

  .menu :global(.check) {
    margin-left: auto;
    color: var(--accent);
  }

  .separator {
    height: 1px;
    margin: 4px 2px;
    background: var(--border);
  }

  .native-color {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
</style>
