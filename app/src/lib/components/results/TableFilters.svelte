<script lang="ts">
  import type { SqlProfile } from "$lib/engines";
  import { tooltip } from "$lib/tooltip";
  import { Filter, Plus, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import Select from "$lib/components/Select.svelte";
  import {
    FILTER_OPERATORS,
    buildWhere,
    newCondition,
    operatorArity,
    type FilterCondition,
    type FilterJoin,
    type FilterOperator,
  } from "$lib/results/filterBuilder";
  import type { TableTab } from "$lib/stores/queryConsoles";

  // Filtros de una pestaña de tabla: constructor visual con filas columna ·
  // operador · valor unidas con Y / O (results/filterBuilder.ts arma el WHERE). El
  // orden se hace con clic en los encabezados del grid. Intro aplica (vuelve
  // a consultar), Esc vuelve a lo aplicado. El error de un filtro se muestra
  // aca mismo, sin salir de la pestaña.
  type Filters = Pick<TableTab, "where" | "conditions">;

  let {
    filters,
    columns,
    engine,
    error = null,
    busy = false,
    onapply,
    onclose,
  }: {
    // Lo aplicado ahora (lo que se ve en el grid).
    filters: Filters;
    columns: { name: string; dataType: string }[];
    // El motor y el modo de la conexion (activeEngine): como se escriben los
    // nombres y los literales.
    engine: SqlProfile;
    error?: string | null;
    busy?: boolean;
    onapply: (filters: Filters) => void;
    // Esc: quien contiene la barra la cierra.
    onclose: () => void;
  } = $props();

  const typeOf = (column: string) => columns.find((item) => item.name === column)?.dataType ?? "";

  function draftConditions(from: FilterCondition[]): FilterCondition[] {
    return from.length > 0 ? from.map((item) => ({ ...item })) : [newCondition()];
  }

  // svelte-ignore state_referenced_locally
  let conditions = $state<FilterCondition[]>(draftConditions(filters.conditions));

  // Si lo aplicado cambia desde afuera (otra pestaña, restaurar), los
  // campos lo siguen. Lo que esta barra misma aplico no se vuelve a copiar:
  // mientras la consulta corria se pudo seguir escribiendo.
  let lastAppliedConditions = "";
  $effect(() => {
    const incoming = JSON.stringify(filters.conditions);
    if (incoming !== lastAppliedConditions) conditions = draftConditions(filters.conditions);
  });

  const builtWhere = $derived(buildWhere(conditions, engine, typeOf));

  // Se ejecuta sola mientras se arma: cuando se deja de escribir un momento
  // y solo si el WHERE cambio (una condicion a medias no cambia nada).
  // Workspace nunca lanza dos consultas a la vez: si una corre, al terminar
  // ejecuta solo la ultima version.
  const LIVE_DELAY_MS = 450;
  $effect(() => {
    const where = builtWhere;
    if (where === filters.where.trim()) return;
    const timer = setTimeout(apply, LIVE_DELAY_MS);
    return () => clearTimeout(timer);
  });

  const columnOptions = $derived(columns.map((column) => ({ value: column.name, label: column.name })));
  const operatorOptions = FILTER_OPERATORS.map((operator) => ({ value: operator.value, label: operator.value }));
  const joinOptions = $derived([
    { value: "and", label: $t("results.filters.and") },
    { value: "or", label: $t("results.filters.or") },
  ]);

  function apply() {
    if (builtWhere === filters.where.trim()) return;
    const snapshot = $state.snapshot(conditions);
    lastAppliedConditions = JSON.stringify(snapshot);
    onapply({ where: builtWhere, conditions: snapshot });
  }

  // Enter ejecuta ya, sin esperar. Esc cierra la barra.
  function onKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onclose();
    }
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

{#snippet status()}
  {#if error}
    <span class="error" role="alert" use:tooltip={error}>{error}</span>
  {/if}
{/snippet}

<div class="table-filters" class:busy>
    <!-- Cuadricula: columna, operador y valor alineados en todas las filas
         (cada fila usa display: contents). -->
    <div class="builder">
    {#each conditions as condition, index (condition.id)}
      {@const arity = operatorArity(condition.operator)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="row" onkeydown={onKeydown}>
        {#if index === 0}
          <span class="lead" aria-hidden="true"><Filter size={13} /></span>
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
            searchable
            searchPlaceholder={$t("results.filters.searchColumn")}
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
</div>


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

  /* Compacto a la izquierda: cada parte con el ancho que necesita (el valor
     hasta 20rem) y lo que sobra queda libre a la derecha, en vez de estirar
     el valor de lado a lado. Aplicar va justo despues de las acciones. */
  .builder {
    display: grid;
    grid-template-columns: 1.75rem minmax(7rem, 11rem) minmax(5.5rem, 7.5rem) minmax(6rem, 20rem) 1.75rem 1.75rem 1fr;
    align-items: center;
    gap: var(--space-1) var(--space-2);
  }

  .builder .row {
    display: contents;
  }

  .status-cell {
    display: flex;
    min-width: 0;
    justify-content: flex-start;
    padding-left: var(--space-2);
  }


  /* Columnas alineadas entre filas: el Y / O ocupa lo mismo que el boton de
     modo de la primera. */
  /* Primera fila: el icono del filtro, en el mismo ancho que el Y / O de
     las siguientes. */
  .lead {
    display: inline-flex;
    width: 1.75rem;
    justify-content: center;
    color: var(--text-secondary);
  }

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
