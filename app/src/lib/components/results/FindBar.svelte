<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { tick } from "svelte";
  import { ArrowDown, ArrowUp, Search, X } from "@lucide/svelte";
  import type { FindOptions } from "$lib/gridFind";
  import { numberFormat, t } from "$lib/i18n";

  // Barra de busqueda del grid (Ctrl+F): fila propia entre la barra de
  // herramientas y el encabezado del grid. Solo UI: la busqueda la hace
  // ResultPane con findInPage.
  let {
    query = $bindable(""),
    options = $bindable({ matchCase: false, regex: false, wholeWord: false }),
    filterRows = $bindable(false),
    count,
    current,
    capped,
    error,
    onnext,
    onprevious,
    onclose,
  }: {
    query?: string;
    options?: FindOptions;
    filterRows?: boolean;
    count: number;
    // Indice (base 0) de la coincidencia actual, -1 si no hay.
    current: number;
    capped: boolean;
    error: string | null;
    onnext: () => void;
    onprevious: () => void;
    onclose: () => void;
  } = $props();

  let input = $state<HTMLInputElement>();

  export async function focus() {
    await tick();
    input?.focus();
    input?.select();
  }

  $effect(() => {
    void focus();
  });

  function onKeydown(event: KeyboardEvent) {
    // Las teclas de la busqueda no llegan al grid (Ctrl+C, Supr...).
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) onprevious();
      else onnext();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onclose();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
      // Toggle: Ctrl+F con la barra abierta la cierra.
      event.preventDefault();
      onclose();
    }
  }

  const status = $derived.by(() => {
    if (error) return $t("results.find.invalid");
    if (query === "") return "";
    if (count === 0) return $t("results.find.noMatches");
    const total = `${$numberFormat.format(count)}${capped ? "+" : ""}`;
    return $t("results.find.position", { current: $numberFormat.format(current + 1), total });
  });

  function toggle(key: keyof FindOptions) {
    options = { ...options, [key]: !options[key] };
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="find-bar" role="search" onkeydown={onKeydown}>
  <div class="field" class:invalid={error !== null}>
    <Search size={14} class="field-icon" aria-hidden="true" />
    <input
      bind:this={input}
      bind:value={query}
      placeholder={$t("results.find.label")}
      aria-label={$t("results.find.label")}
      spellcheck="false"
      autocomplete="off"
    />
    {#if query}
      <button type="button" class="clear" aria-label={$t("results.find.clear")} onclick={() => ((query = ""), void focus())}>
        <X size={12} aria-hidden="true" />
      </button>
    {/if}
  </div>

  <div class="toggles" role="group" aria-label={$t("results.find.options")}>
    <button
      type="button"
      class="toggle"
      class:on={options.matchCase}
      aria-pressed={options.matchCase}
      use:tooltip={$t("results.find.matchCase")}
      onclick={() => toggle("matchCase")}>Cc</button
    >
    <button
      type="button"
      class="toggle mono"
      class:on={options.regex}
      aria-pressed={options.regex}
      use:tooltip={$t("results.find.regex")}
      onclick={() => toggle("regex")}>.*</button
    >
    <button
      type="button"
      class="toggle"
      class:on={options.wholeWord}
      aria-pressed={options.wholeWord}
      use:tooltip={$t("results.find.wholeWord")}
      onclick={() => toggle("wholeWord")}>W</button
    >
  </div>

  <span class="status" class:error={error !== null} use:tooltip={error ?? undefined} aria-live="polite">{status}</span>

  <div class="nav">
    <button
      type="button"
      class="icon"
      aria-label={$t("results.find.previousLabel")}
      use:tooltip={$t("results.find.previousTitle")}
      disabled={count === 0}
      onclick={onprevious}
    >
      <ArrowUp size={14} aria-hidden="true" />
    </button>
    <button
      type="button"
      class="icon"
      aria-label={$t("results.find.nextLabel")}
      use:tooltip={$t("results.find.nextTitle")}
      disabled={count === 0}
      onclick={onnext}
    >
      <ArrowDown size={14} aria-hidden="true" />
    </button>
  </div>

  <label class="filter">
    <input type="checkbox" bind:checked={filterRows} />
    <span>{$t("results.find.filterRows")}</span>
  </label>

  <button type="button" class="icon close" aria-label={$t("results.find.closeLabel")} use:tooltip={$t("results.find.closeTitle")} onclick={onclose}>
    <X size={14} aria-hidden="true" />
  </button>
</div>

<style>
  .find-bar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3);
    min-height: 2.375rem;
    padding: 0 var(--space-2);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.8125rem;
    animation: find-in 140ms ease-out;
  }

  @keyframes find-in {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .find-bar {
      animation: none;
    }
  }

  .field {
    display: flex;
    width: min(22rem, 40%);
    min-width: 10rem;
    align-items: center;
    gap: var(--space-2);
    height: 1.75rem;
    padding: 0 var(--space-1) 0 var(--space-2);
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-content);
    transition: border-color var(--duration-fast) ease;
  }

  .field:focus-within {
    border-color: var(--focus-ring);
  }

  .field.invalid {
    border-color: var(--danger);
  }

  .field :global(.field-icon) {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .field input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
  }

  .clear,
  .icon,
  .toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .clear {
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
  }

  .icon {
    width: 1.625rem;
    height: 1.625rem;
    padding: 0;
  }

  .clear:hover,
  .icon:hover:not(:disabled),
  .toggle:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .icon:disabled {
    cursor: default;
    opacity: 0.35;
  }

  .toggles,
  .nav {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toggle {
    min-width: 1.75rem;
    height: 1.625rem;
    padding: 0 var(--space-1);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .toggle.mono {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace;
  }

  .toggle.on {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent);
    color: var(--text-primary);
  }

  .status {
    min-width: 6.5rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .status.error {
    color: var(--danger);
  }

  .filter {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .filter input {
    accent-color: var(--accent);
  }

  .close {
    margin-left: auto;
  }

  .clear:focus-visible,
  .icon:focus-visible,
  .toggle:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
</style>
