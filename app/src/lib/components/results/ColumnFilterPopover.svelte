<script lang="ts">
  import { tick } from "svelte";
  import { Check, Minus, Search } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { numberFormat } from "$lib/i18n";
  import type { ValueCount } from "$lib/results/columnFilters";

  // Filtro local de una columna (results/columnFilters.ts): sus valores distintos con
  // cuantas filas quedan de cada uno, para marcar o desmarcar. Se aplica al
  // instante; buscar solo acota la lista. Esc o un clic afuera lo cierran.
  let {
    column,
    values,
    excluded,
    matches,
    position,
    onchange,
    onclose,
  }: {
    column: string;
    values: ValueCount[];
    excluded: ReadonlySet<string>;
    // Filas que se ven con todos los filtros.
    matches: number;
    position: { left: number; top: number };
    onchange: (excluded: Set<string>) => void;
    onclose: () => void;
  } = $props();

  // Pintar decenas de miles de filas de golpe traba; buscar acota.
  const MAX_SHOWN = 500;

  let query = $state("");
  let popover = $state<HTMLDivElement>();
  let searchInput = $state<HTMLInputElement>();

  $effect(() => {
    void tick().then(() => searchInput?.focus());
  });

  function label(value: string | null): string {
    return value === null ? "NULL" : value === "" ? $t("grid.filter.empty") : value;
  }

  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return needle === "" ? values : values.filter((item) => label(item.value).toLowerCase().includes(needle));
  });
  const shown = $derived(visible.slice(0, MAX_SHOWN));
  const checkedVisible = $derived(visible.filter((item) => !excluded.has(item.key)).length);
  const allState = $derived(checkedVisible === 0 ? "false" : checkedVisible === visible.length ? "true" : "mixed");

  function toggle(key: string) {
    const next = new Set(excluded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onchange(next);
  }

  // La casilla de arriba marca o desmarca lo que muestra la busqueda.
  function toggleAll() {
    const next = new Set(excluded);
    const check = allState !== "true";
    for (const item of visible) {
      if (check) next.delete(item.key);
      else next.add(item.key);
    }
    onchange(next);
  }

  // Solo este valor: el resto desmarcado.
  function only(key: string) {
    onchange(new Set(values.filter((item) => item.key !== key).map((item) => item.key)));
  }

  // El embudo de un encabezado no cierra: su clic abre otra columna o, en la
  // misma, cierra (ResultPane).
  function onWindowPointerDown(event: PointerEvent) {
    const target = event.target as Element;
    if (popover && !popover.contains(target) && !target.closest?.(".filter-button")) onclose();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onclose();
    }
  }

  // Dentro de la ventana aunque la columna este cerca del borde.
  const style = $derived.by(() => {
    const width = 360;
    const left = Math.max(8, Math.min(position.left, window.innerWidth - width - 8));
    const top = Math.min(position.top, window.innerHeight - 200);
    return `left:${left}px; top:${top}px; width:${width}px; max-height:${Math.max(200, window.innerHeight - top - 12)}px;`;
  });
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="column-filter ui-menu"
  role="dialog"
  aria-label={$t("grid.filter.title", { column })}
  tabindex="-1"
  bind:this={popover}
  {style}
  onkeydown={onKeydown}
>
  <div class="heading">{$t("grid.filter.title", { column })}</div>
  <label class="search">
    <Search size={13} aria-hidden="true" />
    <input
      bind:this={searchInput}
      bind:value={query}
      spellcheck="false"
      autocomplete="off"
      aria-label={$t("grid.filter.search")}
      placeholder={$t("grid.filter.search")}
    />
  </label>
  <div class="list-head">
    <button type="button" class="ui-checkbox" role="checkbox" aria-checked={allState} onclick={toggleAll}>
      <span class="ui-checkbox-box" aria-hidden="true">
        {#if allState === "true"}<Check size={10} strokeWidth={3} />{:else if allState === "mixed"}<Minus
            size={10}
            strokeWidth={3}
          />{/if}
      </span>
      <span>{$t("grid.filter.value")}</span>
    </button>
    <span class="count">{$t("grid.filter.count")}</span>
  </div>
  <div class="list" role="group">
    {#each shown as item (item.key)}
      {@const checked = !excluded.has(item.key)}
      <div class="row" class:zero={item.count === 0}>
        <button type="button" class="ui-checkbox" role="checkbox" aria-checked={checked} onclick={() => toggle(item.key)}>
          <span class="ui-checkbox-box" aria-hidden="true">
            {#if checked}<Check size={10} strokeWidth={3} />{/if}
          </span>
          <span class="value" class:special={item.value === null || item.value === ""} title={label(item.value)}
            >{label(item.value)}</span
          >
        </button>
        <button type="button" class="only" onclick={() => only(item.key)}>{$t("grid.filter.only")}</button>
        <span class="count">{$numberFormat.format(item.count)}</span>
      </div>
    {:else}
      <p class="empty">{$t("grid.filter.noValues")}</p>
    {/each}
    {#if visible.length > shown.length}
      <p class="more">{$t("grid.filter.more", { count: $numberFormat.format(visible.length - shown.length) })}</p>
    {/if}
  </div>
  <div class="footer">
    <span>{$t("grid.filter.matches", { count: $numberFormat.format(matches) })}</span>
    {#if excluded.size > 0}
      <button type="button" class="clear" onclick={() => onchange(new Set())}>{$t("grid.filter.clear")}</button>
    {/if}
  </div>
</div>

<style>
  .column-filter {
    position: fixed;
    z-index: 30;
    gap: var(--space-2);
    padding: var(--space-2);
    outline: none;
  }

  .heading {
    overflow: hidden;
    padding: 0 var(--space-1);
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 1.875rem;
    padding: 0 var(--space-2);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-secondary);
  }

  .search:focus-within {
    border-color: var(--focus-ring);
  }

  .search input {
    min-width: 0;
    flex: 1;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    outline: none;
    -webkit-user-select: text;
    user-select: text;
  }

  /* El valor ocupa todo lo que queda y se corta recien junto al conteo. */
  .list-head,
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    column-gap: var(--space-3);
    padding: 0 var(--space-2) 0 var(--space-1);
  }

  .list-head {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  /* Barra propia con su carril: la nativa (flotante en WebKitGTK) tapaba
     los conteos. */
  .list {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }

  .list::-webkit-scrollbar {
    width: 8px;
  }

  .list::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 6px;
    background-color: var(--scrollbar-thumb);
    background-clip: padding-box;
  }

  .list::-webkit-scrollbar-thumb:hover {
    background-color: var(--scrollbar-thumb-hover);
  }

  .list::-webkit-scrollbar-track {
    background: transparent;
  }

  .row {
    position: relative;
    min-height: 1.625rem;
    border-radius: var(--radius-sm);
  }

  .row:hover {
    background: var(--surface-hover);
  }

  .row .ui-checkbox {
    min-width: 0;
  }

  .value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value.special {
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Valores sin filas con los otros filtros: se ven, mas tenues. */
  .row.zero .value,
  .row.zero .count {
    opacity: 0.55;
  }

  .count {
    min-width: 3rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  /* "Solo" aparece al pasar por la fila, encima del final del valor: no le
     quita ancho. */
  .only {
    position: absolute;
    right: calc(var(--space-2) + 3rem + var(--space-3));
    padding: 1px var(--space-2);
    border: 0;
    border-radius: 3px;
    background: var(--surface-hover);
    box-shadow: -10px 0 8px var(--surface-hover);
    color: var(--accent);
    font: inherit;
    font-size: 0.6875rem;
    cursor: pointer;
    opacity: 0;
  }

  .row:hover .only,
  .only:focus-visible {
    opacity: 1;
  }

  .empty,
  .more {
    margin: var(--space-2) var(--space-1);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-1) var(--space-1) 0;
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .clear {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--accent);
    font: inherit;
    cursor: pointer;
  }
</style>
