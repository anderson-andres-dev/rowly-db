<script module lang="ts">
  import { highlightSql } from "$lib/sqlHighlight";
  import type { LogEntry } from "$lib/stores/executionLog";

  // El resaltado de cada sentencia, una sola vez por entrada: la pestaña se
  // vuelve a montar cada vez que se muestra, y resaltar todo el registro de
  // nuevo en cada una pesaba tras horas de uso. Las entradas no cambian;
  // al descartarse, su resaltado se va con ellas.
  const highlighted = new WeakMap<LogEntry, string>();

  function highlightedSql(entry: LogEntry): string {
    let html = highlighted.get(entry);
    if (html === undefined) {
      html = highlightSql(entry.text);
      highlighted.set(entry, html);
    }
    return html;
  }
</script>

<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import { t } from "$lib/i18n";

  // Pestaña "Salida": el registro de la consola, al estilo del Output de
  // DataGrip. Cada entrada con su marca de tiempo; las lineas siguientes de
  // una sentencia o un mensaje largo quedan alineadas bajo el texto.
  // `runningAction`: lo que acompaña a "Ejecutando…" (el boton de cancelar).
  let {
    entries,
    running = false,
    runningAction,
  }: { entries: LogEntry[]; running?: boolean; runningAction?: Snippet } = $props();

  let scroller = $state<HTMLDivElement>();
  // Sigue al final mientras el usuario este abajo; si subio a leer algo, no
  // se lo mueve.
  let stickToBottom = true;

  function formatTimestamp(epochMs: number): string {
    const date = new Date(epochMs);
    const pad = (value: number, length = 2) => String(value).padStart(length, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
    );
  }

  function onScroll() {
    const el = scroller;
    if (el) stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }

  $effect(() => {
    entries.length;
    running;
    if (!stickToBottom) return;
    void tick().then(() => {
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
  });
</script>

<div class="output-log" role="log" aria-live="polite" bind:this={scroller} onscroll={onScroll}>
  {#if entries.length === 0 && !running}
    <p class="empty">{$t("results.output.empty")}</p>
  {/if}
  {#each entries as entry (entry.id)}
    <span class="time">[{formatTimestamp(entry.at)}]</span>
    {#if entry.kind === "query"}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <span class="text sql"
        >{#if entry.schema}<span class="prompt">{entry.schema}&gt;</span> {/if}{@html highlightedSql(entry)}</span
      >
    {:else}
      <span class="text" class:error={entry.kind === "error"}>{entry.text}</span>
    {/if}
  {/each}
  {#if running}
    <span class="time"></span>
    <span class="text running"
      ><span class="dot"></span>{$t("results.output.running")}{#if runningAction}{@render runningAction()}{/if}</span
    >
  {/if}
</div>

<style>
  .output-log {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-content: start;
    column-gap: var(--space-3);
    row-gap: 2px;
    min-height: 0;
    height: 100%;
    overflow: auto;
    padding: var(--space-2) var(--space-3) var(--space-4);
    box-sizing: border-box;
    background: var(--surface-content);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.8125rem;
    line-height: 1.55;
  }

  .empty {
    grid-column: 1 / -1;
    margin: 0;
    color: color-mix(in srgb, var(--text-secondary) 75%, transparent);
    font-family: var(--font-family);
  }

  .time {
    color: color-mix(in srgb, var(--text-secondary) 80%, transparent);
    white-space: nowrap;
    -webkit-user-select: none;
    user-select: none;
  }

  .text {
    min-width: 0;
    color: var(--text-primary);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .text.error {
    color: var(--danger);
  }

  .prompt {
    color: var(--text-secondary);
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

  .running {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-secondary);
  }

  /* El boton de cancelar lleva la letra de la interfaz, no la del registro. */
  .running :global(.action-button) {
    margin-left: var(--space-2);
    font-family: var(--font-family);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.25;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
</style>
