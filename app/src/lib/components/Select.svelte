<script lang="ts">
  import { tick } from "svelte";
  import { ChevronDown, Check, Search } from "@lucide/svelte";

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
    searchable = false,
    searchPlaceholder = "",
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
    // Lista larga (p. ej. columnas): un campo arriba filtra mientras se
    // escribe; escribir con el select cerrado lo abre ya filtrando.
    searchable?: boolean;
    searchPlaceholder?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  } = $props();

  let open = $state(false);
  let up = $state(false);
  // Se abre alineado a la izquierda del disparador; a la derecha solo si
  // por la izquierda se saldria de la ventana.
  let alignRight = $state(false);
  let active = $state(0);
  let query = $state("");
  let root = $state<HTMLElement>();
  let trigger = $state<HTMLButtonElement>();
  let searchInput = $state<HTMLInputElement>();
  let list = $state<HTMLElement>();

  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return searchable && needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  });

  // La opcion activa siempre a la vista al moverse con el teclado.
  $effect(() => {
    void active;
    if (open) list?.querySelector(".ui-menu-item.active")?.scrollIntoView({ block: "nearest" });
  });
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
    const menuHeight = Math.min(options.length * 30, 256) + (searchable ? 40 : 10);
    return bottom - trigger.bottom < menuHeight && trigger.top - top > bottom - trigger.bottom;
  }

  async function openMenu(initialQuery = "") {
    if (disabled) return;
    query = initialQuery;
    active = initialQuery ? 0 : Math.max(0, options.findIndex((option) => option.value === value));
    up = opensUp();
    const rect = root?.getBoundingClientRect();
    alignRight = !!rect && rect.left + 256 > window.innerWidth;
    open = true;
    if (searchable) {
      await tick();
      searchInput?.focus();
    }
  }

  function close() {
    open = false;
    query = "";
  }

  function choose(option: Option | undefined) {
    if (!option) return;
    value = option.value;
    onchange?.(option.value);
    close();
    trigger?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    // Con el select cerrado, escribir una letra lo abre ya buscando.
    if (searchable && !open && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      void openMenu(event.key);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return void openMenu();
      const step = event.key === "ArrowDown" ? 1 : -1;
      active = Math.min(visible.length - 1, Math.max(0, active + step));
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      active = 0;
    } else if (event.key === "End" && open) {
      event.preventDefault();
      active = visible.length - 1;
    } else if ((event.key === "Enter" || (event.key === " " && !searchable)) && open) {
      event.preventDefault();
      event.stopPropagation();
      choose(visible[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger?.focus();
    }
  }
</script>

<div
  class="select"
  class:wide
  bind:this={root}
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  }}
>
  <button
    {id}
    bind:this={trigger}
    type="button"
    class="ui-field trigger"
    class:compact
    class:open
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    {disabled}
    onclick={() => (open ? close() : void openMenu())}
    onkeydown={handleKeydown}
  >
    <span class="value" class:placeholder={!selected} lang={selected?.lang}>{selected?.label ?? placeholder}</span>
    <ChevronDown size={14} aria-hidden="true" />
  </button>
  {#if open}
    <div class="ui-menu menu" class:up class:align-right={alignRight}>
      {#if searchable}
        <label class="search">
          <Search size={13} aria-hidden="true" />
          <input
            bind:this={searchInput}
            bind:value={query}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder || label}
            spellcheck="false"
            autocomplete="off"
            oninput={() => (active = 0)}
            onkeydown={handleKeydown}
          />
        </label>
      {/if}
      <div class="list" role="listbox" aria-label={label} bind:this={list}>
      {#each visible as option, index (option.value)}
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
    left: 0;
    min-width: 100%;
    max-width: min(24rem, calc(100vw - 1rem));
  }

  .menu.align-right {
    right: 0;
    left: auto;
  }

  .menu.up {
    top: auto;
    bottom: calc(100% + 4px);
  }

  /* Lista larga: alto maximo y scroll; el buscador queda fijo arriba. */
  .list {
    display: flex;
    max-height: 16rem;
    flex-direction: column;
    overflow-y: auto;
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
    padding: 0 var(--space-2);
    height: 1.875rem;
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .search input {
    min-width: 0;
    flex: 1;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
  }
</style>
