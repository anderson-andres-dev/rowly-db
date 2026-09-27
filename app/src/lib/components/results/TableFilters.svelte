<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { Filter, ListOrdered } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  // Filtros de una pestaña de tabla: WHERE y ORDER BY escritos a mano, como
  // en DataGrip. Intro aplica (vuelve a consultar), Esc vuelve a lo aplicado.
  // El error de un filtro se muestra aca mismo, sin salir de la pestaña.
  let {
    where,
    orderBy,
    error = null,
    busy = false,
    onapply,
  }: {
    // Lo aplicado ahora (lo que se ve en el grid).
    where: string;
    orderBy: string;
    error?: string | null;
    busy?: boolean;
    onapply: (where: string, orderBy: string) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let whereDraft = $state(where);
  // svelte-ignore state_referenced_locally
  let orderDraft = $state(orderBy);

  // Si lo aplicado cambia desde afuera (otra pestaña, restaurar), los
  // campos lo siguen.
  $effect(() => {
    whereDraft = where;
  });
  $effect(() => {
    orderDraft = orderBy;
  });

  const dirty = $derived(whereDraft.trim() !== where.trim() || orderDraft.trim() !== orderBy.trim());

  function onKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      onapply(whereDraft.trim(), orderDraft.trim());
    } else if (event.key === "Escape") {
      event.preventDefault();
      whereDraft = where;
      orderDraft = orderBy;
    }
  }
</script>

<div class="table-filters" class:busy>
  <label class="filter" class:pending={dirty}>
    <Filter size={13} class="filter-icon" aria-hidden="true" />
    <span class="keyword">WHERE</span>
    <input
      bind:value={whereDraft}
      placeholder={$t("results.filters.wherePlaceholder")}
      aria-label={$t("results.filters.where")}
      spellcheck="false"
      autocomplete="off"
      onkeydown={onKeydown}
    />
  </label>
  <label class="filter order" class:pending={dirty}>
    <ListOrdered size={13} class="filter-icon" aria-hidden="true" />
    <span class="keyword">ORDER BY</span>
    <input
      bind:value={orderDraft}
      placeholder="created_at DESC"
      aria-label={$t("results.filters.orderBy")}
      spellcheck="false"
      autocomplete="off"
      onkeydown={onKeydown}
    />
  </label>
  {#if error}
    <span class="error" role="alert" use:tooltip={error}>{error}</span>
  {:else if dirty}
    <span class="hint">{$t("results.filters.hint")}</span>
  {/if}
</div>

<style>
  .table-filters {
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
  }

  .filter {
    display: flex;
    min-width: 0;
    flex: 1 1 22rem;
    align-items: center;
    gap: var(--space-2);
    height: 1.75rem;
    padding: 0 var(--space-2);
    box-sizing: border-box;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    cursor: text;
    transition: border-color var(--duration-fast) ease;
  }

  .filter.order {
    flex-basis: 16rem;
  }

  .filter:focus-within {
    border-color: var(--focus-ring);
  }

  /* Cambios sin aplicar: el borde lo insinua (Intro aplica). */
  .filter.pending:not(:focus-within) {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  }

  .filter :global(.filter-icon) {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .keyword {
    flex-shrink: 0;
    color: var(--syntax-keyword, var(--text-secondary));
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    user-select: none;
  }

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.78rem;
  }

  input::placeholder {
    color: color-mix(in srgb, var(--text-secondary) 60%, transparent);
  }

  .error,
  .hint {
    min-width: 0;
    flex: 0 1 auto;
    overflow: hidden;
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .error {
    color: var(--danger);
  }

  .hint {
    color: var(--text-secondary);
  }

  .busy {
    opacity: 0.85;
  }
</style>
