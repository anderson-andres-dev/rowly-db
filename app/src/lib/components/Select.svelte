<script lang="ts">
  import { ChevronDown, Check } from "@lucide/svelte";

  // Desplegable compacto para una fila de ajustes: mismo aspecto que el
  // select de Field, sin etiqueta propia. Teclado: flechas, Inicio/Fin,
  // Enter/Espacio elige y Esc cierra.
  interface Option {
    value: string;
    label: string;
    lang?: string;
  }

  let {
    value = $bindable(),
    options,
    label,
    onchange,
  }: {
    value: string;
    options: Option[];
    // Nombre accesible (la fila ya lo muestra como texto).
    label: string;
    onchange?: (value: string) => void;
  } = $props();

  let open = $state(false);
  let active = $state(0);
  const selected = $derived(options.find((option) => option.value === value) ?? options[0]);

  function openMenu() {
    active = Math.max(0, options.findIndex((option) => option.value === value));
    open = true;
  }

  function choose(option: Option) {
    value = option.value;
    onchange?.(option.value);
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openMenu();
      const step = event.key === "ArrowDown" ? 1 : -1;
      active = Math.min(options.length - 1, Math.max(0, active + step));
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      active = 0;
    } else if (event.key === "End" && open) {
      event.preventDefault();
      active = options.length - 1;
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      open = false;
    }
  }
</script>

<div
  class="select"
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) open = false;
  }}
>
  <button
    type="button"
    class="trigger"
    class:open
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    onclick={() => (open ? (open = false) : openMenu())}
    onkeydown={handleKeydown}
  >
    <span lang={selected?.lang}>{selected?.label}</span>
    <ChevronDown size={14} aria-hidden="true" />
  </button>
  {#if open}
    <div class="menu" role="listbox" aria-label={label}>
      {#each options as option, index (option.value)}
        <button
          type="button"
          role="option"
          tabindex="-1"
          lang={option.lang}
          class:active={index === active}
          aria-selected={option.value === value}
          onmouseenter={() => (active = index)}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => choose(option)}
        >
          <span class="check">{#if option.value === value}<Check size={13} aria-hidden="true" />{/if}</span>
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .select {
    position: relative;
    flex-shrink: 0;
  }

  .trigger {
    display: flex;
    min-width: 11rem;
    height: 2rem;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 0 var(--space-2) 0 var(--space-3);
    box-sizing: border-box;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: border-color var(--duration-fast);
  }

  .trigger :global(svg) {
    color: var(--text-secondary);
    transition: transform var(--duration-fast);
  }

  .trigger.open :global(svg) {
    transform: rotate(180deg);
  }

  .trigger:focus-visible {
    border-color: var(--focus-ring);
    outline: none;
  }

  .menu {
    position: absolute;
    z-index: 30;
    top: calc(100% + 4px);
    right: 0;
    display: flex;
    min-width: 100%;
    flex-direction: column;
    padding: var(--space-1);
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    animation: menu-in 120ms ease-out;
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
  }

  .menu button {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 1.875rem;
    padding: 0 var(--space-3) 0 var(--space-2);
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }

  .menu button.active {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .check {
    display: inline-flex;
    width: 1rem;
    flex-shrink: 0;
    justify-content: center;
    color: var(--accent);
  }
</style>
