<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { Code, Filter, ListOrdered, Plus, SlidersHorizontal, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import Select from "$lib/components/Select.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import {
    FILTER_OPERATORS,
    buildWhere,
    newCondition,
    operatorArity,
    type FilterCondition,
    type FilterJoin,
    type FilterOperator,
    type SqlDriverKind,
  } from "$lib/filterBuilder";
  import type { TableTab } from "$lib/stores/queryConsoles";

  // Filtros de una pestaña de tabla, en dos modos:
  // - Constructor visual: filas columna · operador · valor unidas con Y / O
  //   (filterBuilder.ts arma el WHERE). El orden se hace con clic en los
  //   encabezados del grid.
  // - SQL: WHERE y ORDER BY escritos a mano, como en DataGrip.
  // Intro aplica (vuelve a consultar), Esc vuelve a lo aplicado. El error de
  // un filtro se muestra aca mismo, sin salir de la pestaña.
  type Filters = Pick<TableTab, "where" | "orderBy" | "mode" | "conditions">;

  let {
    filters,
    columns,
    driver,
    error = null,
    busy = false,
    onapply,
    onmode,
  }: {
    // Lo aplicado ahora (lo que se ve en el grid).
    filters: Filters;
    columns: { name: string; dataType: string }[];
    driver: SqlDriverKind;
    error?: string | null;
    busy?: boolean;
    onapply: (filters: Filters) => void;
    // Cambiar de modo sin volver a consultar (lo que se ve no cambia).
    onmode: (mode: Filters["mode"]) => void;
  } = $props();

  const typeOf = (column: string) => columns.find((item) => item.name === column)?.dataType ?? "";

  function draftConditions(from: FilterCondition[]): FilterCondition[] {
    return from.length > 0 ? from.map((item) => ({ ...item })) : [newCondition()];
  }

  // svelte-ignore state_referenced_locally
  let whereDraft = $state(filters.where);
  // svelte-ignore state_referenced_locally
  let orderDraft = $state(filters.orderBy);
  // svelte-ignore state_referenced_locally
  let conditions = $state<FilterCondition[]>(draftConditions(filters.conditions));
  let confirmingBuilder = $state(false);

  // Si lo aplicado cambia desde afuera (otra pestaña, restaurar), los
  // campos lo siguen.
  $effect(() => {
    whereDraft = filters.where;
    orderDraft = filters.orderBy;
    conditions = draftConditions(filters.conditions);
  });

  const builtWhere = $derived(buildWhere(conditions, driver, typeOf));
  const dirty = $derived(
    filters.mode === "builder"
      ? builtWhere !== filters.where.trim()
      : whereDraft.trim() !== filters.where.trim() || orderDraft.trim() !== filters.orderBy.trim(),
  );

  const columnOptions = $derived(columns.map((column) => ({ value: column.name, label: column.name })));
  const operatorOptions = FILTER_OPERATORS.map((operator) => ({ value: operator.value, label: operator.value }));
  const joinOptions = $derived([
    { value: "and", label: $t("results.filters.and") },
    { value: "or", label: $t("results.filters.or") },
  ]);

  function apply() {
    if (filters.mode === "builder") {
      onapply({ where: builtWhere, orderBy: filters.orderBy, mode: "builder", conditions: $state.snapshot(conditions) });
    } else {
      onapply({ where: whereDraft.trim(), orderBy: orderDraft.trim(), mode: "sql", conditions: filters.conditions });
    }
  }

  function revert() {
    whereDraft = filters.where;
    orderDraft = filters.orderBy;
    conditions = draftConditions(filters.conditions);
  }

  function onKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    } else if (event.key === "Escape") {
      event.preventDefault();
      revert();
    }
  }

  // Del constructor al SQL: se ve la clausula que armo, lista para
  // retocarla. Del SQL al constructor solo sin perder nada: si el WHERE es el
  // del constructor (o esta vacio) se pasa directo; si se escribio a mano,
  // se pregunta antes de descartarlo.
  function toggleMode() {
    if (filters.mode === "builder") {
      whereDraft = builtWhere;
      orderDraft = filters.orderBy;
      onmode("sql");
      return;
    }
    const written = whereDraft.trim();
    if (written === "" || written === buildWhere(filters.conditions, driver, typeOf)) {
      onmode("builder");
    } else {
      confirmingBuilder = true;
    }
  }

  function switchToBuilderDiscarding() {
    confirmingBuilder = false;
    const restored = draftConditions(filters.conditions);
    onapply({
      where: buildWhere(restored, driver, typeOf),
      orderBy: filters.orderBy,
      mode: "builder",
      conditions: filters.conditions,
    });
  }

  function addCondition() {
    conditions = [...conditions, newCondition("", "and")];
  }

  function removeCondition(id: string) {
    const next = conditions.filter((item) => item.id !== id);
    conditions = next.length > 0 ? next : [newCondition()];
  }

  function setOperator(condition: FilterCondition, operator: FilterOperator) {
    condition.operator = operator;
    if (operatorArity(operator) === "none") {
      condition.value = "";
      condition.value2 = "";
    }
  }

  const listPlaceholder = "a, b, c";
</script>

{#snippet modeToggle()}
  <button
    class="ui-icon-button mode-toggle"
    class:sql={filters.mode === "sql"}
    type="button"
    use:tooltip={filters.mode === "builder" ? $t("results.filters.sqlMode") : $t("results.filters.builderMode")}
    onclick={toggleMode}
  >
    {#if filters.mode === "builder"}
      <Code size={14} aria-hidden="true" />
    {:else}
      <SlidersHorizontal size={14} aria-hidden="true" />
    {/if}
  </button>
{/snippet}

{#snippet status()}
  {#if error}
    <span class="error" role="alert" use:tooltip={error}>{error}</span>
  {:else if dirty}
    <button class="action-button primary small" type="button" disabled={busy} onclick={apply}>
      {$t("results.filters.apply")}
    </button>
  {/if}
{/snippet}

<div class="table-filters" class:busy>
  {#if filters.mode === "sql"}
    <div class="row">
      {@render modeToggle()}
      <label class="ui-field compact filter" class:pending={dirty}>
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
      <label class="ui-field compact filter order" class:pending={dirty}>
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
      {@render status()}
    </div>
  {:else}
    <!-- Cuadricula: columna, operador y valor alineados en todas las filas
         (cada fila usa display: contents). -->
    <div class="builder">
    {#each conditions as condition, index (condition.id)}
      {@const arity = operatorArity(condition.operator)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="row" onkeydown={onKeydown}>
        {#if index === 0}
          {@render modeToggle()}
        {:else}
          <div class="join">
            <Select
              compact
              value={condition.join}
              options={joinOptions}
              label={$t("results.filters.join")}
              onchange={(value) => (condition.join = value as FilterJoin)}
            />
          </div>
        {/if}
        <div class="column">
          <Select
            compact
            wide
            value={condition.column}
            options={columnOptions}
            placeholder={$t("results.filters.column")}
            label={$t("results.filters.column")}
            onchange={(value) => (condition.column = value)}
          />
        </div>
        <div class="operator">
          <Select
            compact
            wide
            value={condition.operator}
            options={operatorOptions}
            label={$t("results.filters.operator")}
            onchange={(value) => setOperator(condition, value as FilterOperator)}
          />
        </div>
        <div class="value">
          {#if arity === "one" || arity === "list"}
            <label class="ui-field compact">
              <input
                bind:value={condition.value}
                placeholder={arity === "list" ? listPlaceholder : $t("results.filters.value")}
                aria-label={$t("results.filters.value")}
                spellcheck="false"
                autocomplete="off"
              />
            </label>
          {:else if arity === "two"}
            <label class="ui-field compact">
              <input bind:value={condition.value} placeholder={$t("results.filters.from")} aria-label={$t("results.filters.from")} spellcheck="false" autocomplete="off" />
            </label>
            <label class="ui-field compact">
              <input bind:value={condition.value2} placeholder={$t("results.filters.to")} aria-label={$t("results.filters.to")} spellcheck="false" autocomplete="off" />
            </label>
          {/if}
        </div>
        <button
          class="ui-icon-button"
          type="button"
          use:tooltip={$t("results.filters.removeCondition")}
          disabled={conditions.length === 1 && !condition.column}
          onclick={() => removeCondition(condition.id)}
        >
          <X size={14} aria-hidden="true" />
        </button>
        {#if index === conditions.length - 1}
          <button class="ui-icon-button" type="button" use:tooltip={$t("results.filters.addCondition")} onclick={addCondition}>
            <Plus size={14} aria-hidden="true" />
          </button>
        {:else}
          <span class="icon-spacer"></span>
        {/if}
        <div class="status-cell">
          {#if index === 0}{@render status()}{/if}
        </div>
      </div>
    {/each}
    </div>
  {/if}
</div>

{#if confirmingBuilder}
  <ConfirmDialog
    tone="warning"
    title={$t("results.filters.discardSqlTitle")}
    message={$t("results.filters.discardSqlMessage")}
    confirmLabel={$t("results.filters.discardSqlConfirm")}
    onconfirm={switchToBuilderDiscarding}
    oncancel={() => (confirmingBuilder = false)}
  />
{/if}

<style>
  .table-filters {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.8125rem;
  }

  .row {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-2);
  }

  .builder {
    display: grid;
    grid-template-columns: 1.75rem 12rem 8.5rem minmax(0, 1fr) 1.75rem 1.75rem auto;
    align-items: center;
    gap: var(--space-1) var(--space-2);
  }

  .builder .row {
    display: contents;
  }

  .status-cell {
    display: flex;
    min-width: 0;
    justify-content: flex-end;
  }

  .mode-toggle.sql {
    color: var(--accent);
  }

  /* Columnas alineadas entre filas: el Y / O ocupa lo mismo que el boton de
     modo de la primera. */
  .join {
    width: 1.75rem;
  }

  .join :global(.trigger) {
    width: 1.75rem;
    justify-content: center;
    padding: 0;
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .join :global(.trigger svg) {
    display: none;
  }

  .column,
  .operator {
    min-width: 0;
  }

  .value {
    display: flex;
    min-width: 0;
    gap: var(--space-2);
  }

  .value > :global(.ui-field) {
    min-width: 0;
    flex: 1;
  }

  .icon-spacer {
    width: 1.75rem;
  }

  .filter {
    min-width: 0;
    flex: 2 1 14rem;
    cursor: text;
  }

  .filter.order {
    flex: 1 1 10rem;
  }

  .filter.pending:not(:focus-within) {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  }

  .filter :global(.filter-icon) {
    flex-shrink: 0;
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

  .filter input,
  .value input {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.78rem;
  }

  .error {
    min-width: 0;
    flex: 0 1 auto;
    overflow: hidden;
    color: var(--danger);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .busy {
    opacity: 0.85;
  }
</style>
