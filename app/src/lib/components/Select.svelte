<script lang="ts">
  import { ChevronDown, Check } from "@lucide/svelte";

  // El unico select de la app. El disparador tiene el aspecto de un campo
  // (styles/controls.css .ui-field) y la lista es el menu compartido
  // (.ui-menu). Teclado: flechas, Inicio/Fin, Enter/Espacio elige y Esc
  // cierra. Abre hacia arriba si abajo no entra.
  interface Option {
    value: string;
    label: string;
    lang?: string;
  }

  let {
    value = $bindable(),
    options,
    label,
    id,
    wide = false,
    compact = false,
    placeholder = "",
    disabled = false,
    onchange,
  }: {
    value: string;
    options: Option[];
    // Nombre accesible (la fila o el Field ya lo muestran como texto).
    label: string;
    id?: string;
    // Ocupa todo el ancho disponible (formularios).
    wide?: boolean;
    // 28 px, para barras (el campo compacto de controls.css).
    compact?: boolean;
    // Texto tenue mientras ningun valor de la lista esta elegido.
    placeholder?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  } = $props();

  let open = $state(false);
  let up = $state(false);
  let active = $state(0);
  let root = $state<HTMLElement>();
  const selected = $derived(options.find((option) => option.value === value) ?? (placeholder ? null : options[0]));

  function opensUp(): boolean {
    if (!root) return false;
    const trigger = root.getBoundingClientRect();
    let bottom = window.innerHeight;
    let top = 0;
    for (let node = root.parentElement; node; node = node.parentElement) {
      if (getComputedStyle(node).overflowY !== "visible") {
        const rect = node.getBoundingClientRect();
        bottom = Math.min(bottom, rect.bottom);
        top = Math.max(top, rect.top);
        break;
      }
    }
    const menuHeight = options.length * 30 + 10;
    return bottom - trigger.bottom < menuHeight && trigger.top - top > bottom - trigger.bottom;
  }

  function openMenu() {
    if (disabled) return;
    active = Math.max(0, options.findIndex((option) => option.value === value));
    up = opensUp();
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
  class:wide
  bind:this={root}
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) open = false;
  }}
>
  <button
    {id}
    type="button"
    class="ui-field trigger"
    class:compact
    class:open
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    {disabled}
    onclick={() => (open ? (open = false) : openMenu())}
    onkeydown={handleKeydown}
  >
    <span class="value" class:placeholder={!selected} lang={selected?.lang}>{selected?.label ?? placeholder}</span>
    <ChevronDown size={14} aria-hidden="true" />
  </button>
  {#if open}
    <div class="ui-menu menu" class:up role="listbox" aria-label={label}>
      {#each options as option, index (option.value)}
        <button
          type="button"
          role="option"
          tabindex="-1"
          class="ui-menu-item"
          lang={option.lang}
          class:active={index === active}
          aria-selected={option.value === value}
          onmouseenter={() => (active = index)}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => choose(option)}
        >
          <span class="ui-menu-check">{#if option.value === value}<Check size={13} aria-hidden="true" />{/if}</span>
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

  .select.wide {
    width: 100%;
  }

  .trigger {
    width: 100%;
    min-width: 11rem;
    justify-content: space-between;
    padding-right: var(--space-2);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
  }

  .trigger.compact {
    min-width: 0;
  }

  .trigger:focus-visible {
    border-color: var(--focus-ring);
    outline: none;
  }

  .trigger:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .value.placeholder {
    color: var(--text-secondary);
  }

  .value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trigger :global(svg) {
    flex-shrink: 0;
    color: var(--text-secondary);
    transition: transform var(--duration-fast);
  }

  .trigger.open :global(svg) {
    transform: rotate(180deg);
  }

  .menu {
    position: absolute;
    z-index: 30;
    top: calc(100% + 4px);
    right: 0;
    min-width: 100%;
  }

  .menu.up {
    top: auto;
    bottom: calc(100% + 4px);
  }
</style>
