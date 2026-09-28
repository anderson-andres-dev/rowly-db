<script lang="ts">
  import { Eye, EyeOff } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";
  import { t } from "$lib/i18n";
  import Select from "$lib/components/Select.svelte";

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
</script>

<div
  class:horizontal={orientation === "horizontal"}
  class:compact={orientation === "compact"}
  class="field"
>
  <label for={id}>{label}</label>

  {#if type === "select"}
    <!-- El mismo select de toda la app (Select.svelte). -->
    <Select
      {id}
      wide
      {disabled}
      {label}
      {options}
      bind:value={() => String(value), (next) => (value = next)}
    />
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
    font-size: 0.8125rem;
  }

  /* Mismas medidas que .ui-field (styles/controls.css): el unico aspecto de
     campo de la app. */
  input {
    box-sizing: border-box;
    width: 100%;
    height: 2rem;
    color: var(--text-primary);
    background: var(--surface);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    padding: 0 var(--space-3);
    font: inherit;
    font-size: 0.8125rem;
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

  /* Sin las flechas del navegador en los numeros (puerto): se escribe. */
  input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    margin: 0;
    -webkit-appearance: none;
  }

  input:focus-visible {
    border-color: var(--focus-ring);
    outline: none;
  }

  input[aria-invalid="true"] {
    border-color: var(--danger);
  }

  input:disabled {
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
