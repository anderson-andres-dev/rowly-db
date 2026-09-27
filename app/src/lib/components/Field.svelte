<script lang="ts">
  import { Eye, EyeOff } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";
  import { t } from "$lib/i18n";

  interface Option {
    value: string;
    label: string;
  }

  let {
    label,
    id,
    type = "text",
    value = $bindable(),
    options = [],
    placeholder,
    error,
    name,
    autocomplete,
    required = false,
    disabled = false,
    min,
    max,
    orientation = "stacked",
    readonly = false,
    list,
    trailing,
  }: {
    label: string;
    id: string;
    type?: "text" | "password" | "number" | "select";
    value: string | number;
    options?: Option[];
    placeholder?: string;
    error?: string;
    name?: string;
    autocomplete?: HTMLInputAttributes["autocomplete"];
    required?: boolean;
    disabled?: boolean;
    min?: number;
    max?: number;
    orientation?: "stacked" | "horizontal" | "compact";
    readonly?: boolean;
    // id de un <datalist> con sugerencias (p.ej. grupos ya usados).
    list?: string;
    // Contenido dentro del input, a la derecha (p.ej. el menu de color del
    // campo Nombre). El input reserva el espacio con padding.
    trailing?: Snippet;
  } = $props();

  const errorId = $derived(`${id}-error`);
  let passwordVisible = $state(false);
  const inputType = $derived<"text" | "password" | "number">(
    type === "password" && passwordVisible
      ? "text"
      : type === "password"
        ? "password"
        : type === "number"
          ? "number"
          : "text",
  );
  let selectOpen = $state(false);
  let selectUp = $state(false);
  let selectControl = $state<HTMLElement>();
  let activeOption = $state(0);
  const selectedOption = $derived(options.find((option) => option.value === String(value)) ?? options[0]);

  function openSelect() {
    if (disabled) return;
    activeOption = Math.max(0, options.findIndex((option) => option.value === String(value)));
    selectUp = shouldOpenUp();
    selectOpen = true;
  }

  // El menu se abre hacia arriba si abajo no entra: el contenedor que hace
  // scroll (p.ej. el cuerpo del formulario de conexion) lo recortaria.
  function shouldOpenUp(): boolean {
    if (!selectControl) return false;
    const trigger = selectControl.getBoundingClientRect();
    let bounds = { top: 0, bottom: window.innerHeight };
    for (let node = selectControl.parentElement; node; node = node.parentElement) {
      if (getComputedStyle(node).overflowY !== "visible") {
        const rect = node.getBoundingClientRect();
        bounds = { top: Math.max(bounds.top, rect.top), bottom: Math.min(bounds.bottom, rect.bottom) };
        break;
      }
    }
    // Alto aproximado: una fila por opcion mas el relleno del menu.
    const menuHeight = options.length * 34 + 12;
    const below = bounds.bottom - trigger.bottom;
    const above = trigger.top - bounds.top;
    return below < menuHeight && above > below;
  }

  function handleSelectKeydown(event: KeyboardEvent) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!selectOpen) openSelect();
      else activeOption = Math.min(options.length - 1, activeOption + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!selectOpen) openSelect();
      else activeOption = Math.max(0, activeOption - 1);
    } else if (event.key === "Home" && selectOpen) {
      event.preventDefault();
      activeOption = 0;
    } else if (event.key === "End" && selectOpen) {
      event.preventDefault();
      activeOption = options.length - 1;
    } else if ((event.key === "Enter" || event.key === " ") && selectOpen) {
      event.preventDefault();
      if (options[activeOption]) value = options[activeOption].value;
      selectOpen = false;
    } else if (event.key === "Escape") {
      event.preventDefault();
      selectOpen = false;
    }
  }
</script>

<div
  class:horizontal={orientation === "horizontal"}
  class:compact={orientation === "compact"}
  class="field"
>
  <label for={id}>{label}</label>

  {#if type === "select"}
    <div
      class="select-control"
      bind:this={selectControl}
      onfocusout={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) selectOpen = false;
      }}
    >
      <button
        {id}
        class="select-trigger"
        type="button"
        {name}
        aria-haspopup="listbox"
        aria-expanded={selectOpen}
        aria-describedby={error ? errorId : undefined}
        data-invalid={error ? "true" : undefined}
        {disabled}
        onclick={() => (selectOpen ? (selectOpen = false) : openSelect())}
        onkeydown={handleSelectKeydown}
      >
        <span>{selectedOption?.label ?? "Seleccionar"}</span>
        <span class="select-chevron" aria-hidden="true">⌄</span>
      </button>
      {#if selectOpen}
        <div class="select-menu" class:up={selectUp} role="listbox" aria-labelledby={id}>
          {#each options as option, index (option.value)}
            <button
              id={`${id}-${option.value}`}
              type="button"
              class:active={index === activeOption}
              class:selected={option.value === String(value)}
              role="option"
              aria-selected={option.value === String(value)}
              tabindex="-1"
              onclick={() => {
                value = option.value;
                selectOpen = false;
              }}
            >{option.label}</button>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class:with-action={type === "password"} class:with-trailing={!!trailing} class="control">
      <input
        {id}
        type={inputType}
        {name}
        bind:value
        {placeholder}
        {autocomplete}
        {required}
        {disabled}
        {readonly}
        {list}
        {min}
        {max}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {#if trailing}
        <div class="field-trailing">{@render trailing()}</div>
      {/if}
      {#if type === "password"}
        <button
          class="field-action"
          type="button"
          aria-label={passwordVisible ? $t("shell.hidePassword") : $t("shell.showPassword")}
          aria-pressed={passwordVisible}
          onclick={() => (passwordVisible = !passwordVisible)}
          {disabled}
        >
          {#if passwordVisible}
            <EyeOff size={16} aria-hidden="true" />
          {:else}
            <Eye size={16} aria-hidden="true" />
          {/if}
        </button>
      {/if}
    </div>
  {/if}

  {#if error}
    <p id={errorId} class="error">{error}</p>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    text-align: left;
  }

  .field.horizontal {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-4);
  }

  .field.horizontal > .error {
    grid-column: 2;
  }

  .field.compact {
    display: grid;
    grid-template-columns: auto minmax(6.5rem, 1fr);
    align-items: center;
    column-gap: var(--space-3);
  }

  .field.compact > .error {
    grid-column: 2;
  }

  label {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  input,
  .select-trigger {
    box-sizing: border-box;
    width: 100%;
    min-height: 2.125rem;
    color: var(--text-primary);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.2;
    transition:
      border-color var(--duration-fast),
      background-color var(--duration-fast);
  }

  .control {
    position: relative;
  }

  .control.with-action input {
    padding-right: 2.5rem;
  }

  .control.with-trailing input {
    padding-right: 6rem;
  }

  /* Centrado con top/bottom en vez de transform: un transform crea un
     contexto de apilamiento que encierra el z-index de lo que se abra
     adentro (p.ej. el menu de color), y los campos siguientes del
     formulario se pintarian encima. El z-index lo pone por delante de ellos. */
  .field-trailing {
    position: absolute;
    top: 0;
    right: 4px;
    bottom: 0;
    z-index: 5;
    display: flex;
    align-items: center;
  }

  .field-action {
    position: absolute;
    top: 50%;
    right: var(--space-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transform: translateY(-50%);
  }

  .field-action:hover:not(:disabled) {
    color: var(--text-primary);
  }

  .field-action:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .field-action:disabled {
    color: var(--control-disabled);
    cursor: not-allowed;
  }

  input:hover:not(:disabled),
  .select-trigger:hover:not(:disabled) {
    border-color: var(--text-secondary);
  }

  input:focus-visible,
  .select-trigger:focus-visible {
    border-color: var(--focus-ring);
    outline: 1px solid var(--focus-ring);
    outline-offset: 0;
  }

  input[aria-invalid="true"],
  .select-trigger[data-invalid="true"] {
    border-color: var(--danger);
  }

  input:disabled,
  .select-trigger:disabled {
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--surface) 75%, var(--surface-elevated));
    border-color: var(--border);
    cursor: not-allowed;
    opacity: 0.75;
  }

  input:read-only:not(:disabled) {
    color: var(--text-secondary);
    background: transparent;
  }

  .select-control {
    position: relative;
    min-width: 0;
  }

  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    text-align: left;
    cursor: pointer;
  }

  .select-trigger:disabled {
    cursor: not-allowed;
  }

  .select-chevron {
    color: var(--text-secondary);
    font-size: 1rem;
    line-height: 0.75;
  }

  .select-menu {
    position: absolute;
    z-index: 20;
    top: calc(100% + 4px);
    right: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
  }

  .select-menu.up {
    top: auto;
    bottom: calc(100% + 4px);
  }

  .select-menu button {
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
  }

  .select-menu button:hover,
  .select-menu button.active {
    background: color-mix(in srgb, var(--accent) 16%, var(--surface-elevated));
  }

  .select-menu button.selected {
    color: var(--accent);
    font-weight: 500;
  }

  .select-menu button:focus-visible {
    outline: 1px solid var(--focus-ring);
    outline-offset: -1px;
  }

  .error {
    margin: 0;
    color: var(--danger);
    font-size: 0.8125rem;
  }

  @media (max-width: 34rem) {
    .field.horizontal,
    .field.compact {
      display: flex;
    }
  }
</style>
