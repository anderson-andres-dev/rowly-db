<script lang="ts">
  import { tick } from "svelte";
  import { Search } from "@lucide/svelte";
  import { locale, numberFormat, t } from "$lib/i18n";
  import { highlightSql } from "$lib/sqlHighlight";
  import { filterHistory, groupHistoryByDay, type HistoryDay, type HistoryEntry } from "$lib/stores/queryHistory";

  // Historial de la conexion activa (Ctrl+E): capa flotante sobre el editor,
  // bajo demanda. Todo con el teclado desde el filtro: flechas para elegir,
  // Enter inserta en el cursor, Ctrl+Enter ejecuta, Esc cierra. `onclose`
  // dice si hay que devolver el foco al editor (no, si se cerro porque el
  // foco ya se fue a otra parte).
  let {
    entries,
    oninsert,
    onexecute,
    onclose,
  }: {
    entries: HistoryEntry[];
    oninsert: (sql: string) => void;
    onexecute: (sql: string) => void;
    onclose: (refocusEditor: boolean) => void;
  } = $props();

  let query = $state("");
  let activeId = $state<string | null>(null);
  let root = $state<HTMLElement>();
  let list = $state<HTMLElement>();
  const now = Date.now();

  const filtered = $derived(filterHistory(entries, query));
  const groups = $derived(groupHistoryByDay(filtered, now));
  const active = $derived(filtered.find((entry) => entry.id === activeId) ?? filtered[0] ?? null);

  const relative = $derived(new Intl.RelativeTimeFormat($locale, { numeric: "auto", style: "short" }));
  const clock = $derived(new Intl.DateTimeFormat($locale, { hour: "2-digit", minute: "2-digit" }));

  function whenLabel(at: number): string {
    const seconds = Math.round((now - at) / 1000);
    if (seconds < 45) return relative.format(0, "second");
    if (seconds < 3600) return relative.format(-Math.round(seconds / 60), "minute");
    if (seconds < 86_400) return relative.format(-Math.round(seconds / 3600), "hour");
    return clock.format(at);
  }

  function dayLabel(day: HistoryDay): string {
    if (day === "today") return $t("history.today");
    if (day === "yesterday") return $t("history.yesterday");
    const sameYear = new Date(day).getFullYear() === new Date(now).getFullYear();
    return new Intl.DateTimeFormat($locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: sameYear ? undefined : "numeric",
    }).format(day);
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
  }

  // Cambiar el filtro vuelve a la primera coincidencia.
  $effect(() => {
    void query;
    activeId = null;
  });

  async function move(delta: number) {
    if (filtered.length === 0) return;
    const index = active ? filtered.indexOf(active) : -1;
    const next = filtered[Math.min(filtered.length - 1, Math.max(0, index + delta))];
    activeId = next.id;
    await tick();
    list?.querySelector(`[data-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function onKeydown(event: KeyboardEvent) {
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      void move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      void move(event.key === "PageDown" ? 8 : -8);
    } else if (event.key === "Enter" && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      if (active) (mod ? onexecute : oninsert)(active.sql);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onclose(true);
    }
  }

  // Si el foco se va a otra parte de la app, se cierra sin robarlo. Si solo
  // se cambio de ventana, queda abierto.
  function onFocusOut() {
    setTimeout(() => {
      if (document.hasFocus() && root && !root.contains(document.activeElement)) onclose(false);
    });
  }

  function formatDuration(ms: number): string {
    return `${$numberFormat.format(Math.round(ms))} ms`;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="query-history ui-menu" bind:this={root} onkeydown={onKeydown} onfocusout={onFocusOut}>
  <label class="ui-field compact">
    <Search size={13} aria-hidden="true" />
    <input
      type="search"
      bind:value={query}
      placeholder={$t("history.search")}
      aria-label={$t("history.label")}
      role="combobox"
      aria-expanded="true"
      aria-controls="query-history-list"
      aria-activedescendant={active ? `history-${active.id}` : undefined}
      use:focusOnMount
    />
  </label>

  <div class="entries" id="query-history-list" role="listbox" aria-label={$t("history.label")} bind:this={list}>
    {#if entries.length === 0}
      <p class="empty">{$t("history.empty")}</p>
    {:else if filtered.length === 0}
      <p class="empty">{$t("history.noResults", { query: query.trim() })}</p>
    {/if}
    {#each groups as group (group.day)}
      <div class="day" role="presentation">{dayLabel(group.day)}</div>
      {#each group.entries as entry (entry.id)}
        <!-- El foco se queda en el filtro (las teclas van ahi): un clic
             elige, doble clic inserta. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={`history-${entry.id}`}
          data-id={entry.id}
          class="ui-menu-item entry"
          class:active={entry.id === active?.id}
          role="option"
          tabindex="-1"
          aria-selected={entry.id === active?.id}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => (activeId = entry.id)}
          ondblclick={() => oninsert(entry.sql)}
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <span class="sql line">{@html highlightSql(entry.sql.replace(/\s+/g, " "))}</span>
          {#if entry.outcome === "error"}
            <span class="meta error">{$t("history.error")}</span>
          {:else if entry.outcome === "cancelled"}
            <span class="meta">{$t("history.cancelled")}</span>
          {:else}
            <span class="meta">{formatDuration(entry.durationMs)}</span>
          {/if}
          <span class="meta when">{whenLabel(entry.at)}</span>
        </div>
      {/each}
    {/each}
  </div>

  {#if active}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <pre class="sql preview">{@html highlightSql(active.sql)}</pre>
  {/if}

  <div class="hints">
    <span><span class="ui-keys"><kbd>Enter</kbd></span> {$t("history.insert")}</span>
    <span><span class="ui-keys"><kbd>Ctrl</kbd><kbd>Enter</kbd></span> {$t("history.execute")}</span>
    <span><span class="ui-keys"><kbd>Esc</kbd></span> {$t("history.close")}</span>
  </div>
</div>

<style>
  /* Centrada arriba del editor; sin transform, que lo usa la animacion de
     entrada de .ui-menu. */
  .query-history {
    position: absolute;
    top: var(--space-3);
    right: 0;
    left: 0;
    z-index: 20;
    width: min(680px, calc(100% - 2 * var(--space-4)));
    max-height: calc(100% - 2 * var(--space-3));
    margin: 0 auto;
    gap: var(--space-2);
    padding: var(--space-2);
  }

  .entries {
    display: flex;
    min-height: 3rem;
    flex: 1;
    flex-direction: column;
    overflow-y: auto;
  }

  .day {
    padding: var(--space-2) var(--space-2) var(--space-1);
    color: var(--text-secondary);
    font-size: 0.6875rem;
  }

  .day:first-child {
    padding-top: 0;
  }

  .entry {
    flex-shrink: 0;
    gap: var(--space-3);
  }

  .line {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    flex-shrink: 0;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .meta.error {
    color: var(--danger);
  }

  .when {
    min-width: 4.5rem;
    text-align: right;
  }

  .sql {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
  }

  .preview {
    max-height: 9rem;
    flex-shrink: 0;
    margin: 0;
    padding: var(--space-2) var(--space-3);
    overflow: auto;
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .empty {
    margin: 0;
    padding: var(--space-4) var(--space-2);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    text-align: center;
  }

  .hints {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
    padding: 0 var(--space-1);
    color: var(--text-secondary);
    font-size: 0.6875rem;
  }

  .sql :global(.s-kw) {
    color: var(--syntax-keyword, var(--text-primary));
  }

  .sql :global(.s-str) {
    color: var(--syntax-string, var(--text-primary));
  }

  .sql :global(.s-num) {
    color: var(--syntax-number, var(--text-primary));
  }

  .sql :global(.s-com) {
    color: var(--syntax-comment, var(--text-secondary));
    font-style: italic;
  }
</style>
