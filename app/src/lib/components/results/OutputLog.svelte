<script module lang="ts">
  import { highlightSql } from "$lib/editor/highlight";
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
  import { Check, ChevronDown, Copy } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
  import { writeClipboard } from "$lib/clipboard";
  import {
    COPY_CHOICES,
    formatTimestamp,
    lastLines,
    loadCopyAmount,
    parseCustomAmount,
    saveCopyAmount,
    type CopyAmount,
  } from "$lib/results/outputCopy";

  // Pestaña "Salida": el registro de la consola, al estilo del Output de
  // DataGrip. Cada entrada en su fila, con su marca de tiempo; las lineas
  // siguientes de una sentencia o un mensaje largo quedan alineadas bajo el
  // texto. Todo se selecciona con el mouse como texto corrido (de una fila a
  // otra, con la hora), y arriba a la derecha flota copiar las ultimas N
  // lineas (results/outputCopy.ts). `runningAction`: lo que acompaña a
  // "Ejecutando…" (el boton de cancelar).
  let {
    entries,
    running = false,
    runningAction,
  }: { entries: LogEntry[]; running?: boolean; runningAction?: Snippet } = $props();

  let scroller = $state<HTMLDivElement>();
  // Sigue al final mientras el usuario este abajo; si subio a leer algo, no
  // se lo mueve.
  let stickToBottom = true;

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

  // --- Copiar ---------------------------------------------------------------
  let amount = $state<CopyAmount>(loadCopyAmount());
  let copied = $state(false);
  let copiedTimer: ReturnType<typeof setTimeout> | null = null;
  let menuOpen = $state(false);
  let custom = $state("");
  let control = $state<HTMLElement>();

  async function copy() {
    const ok = await writeClipboard(lastLines(entries, amount));
    if (!ok) return;
    copied = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => (copied = false), 1400);
  }

  function choose(next: CopyAmount) {
    amount = next;
    saveCopyAmount(next);
    menuOpen = false;
    void copy();
  }

  function applyCustom() {
    const next = parseCustomAmount(custom);
    if (next !== null) choose(next);
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    if (menuOpen) custom = typeof amount === "number" && !COPY_CHOICES.includes(amount) ? String(amount) : "";
  }

  function onWindowPointerDown(event: PointerEvent) {
    if (menuOpen && control && !control.contains(event.target as Node)) menuOpen = false;
  }
</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={(event) => {
    if (menuOpen && event.key === "Escape") menuOpen = false;
  }}
/>

<div class="output">
  <div class="output-log selectable" role="log" aria-live="polite" bind:this={scroller} onscroll={onScroll}>
    {#if entries.length === 0 && !running}
      <p class="empty">{$t("results.output.empty")}</p>
    {/if}
    {#each entries as entry (entry.id)}
      <div class="entry">
        <span class="time">[{formatTimestamp(entry.at)}]</span>
        {#if entry.kind === "query"}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <span class="text sql"
            >{#if entry.schema}<span class="prompt">{entry.schema}&gt;</span>{/if}{@html highlightedSql(entry)}</span
          >
        {:else}
          <span class="text" class:error={entry.kind === "error"}>{entry.text}</span>
        {/if}
      </div>
    {/each}
    {#if running}
      <div class="entry">
        <span class="time"></span>
        <span class="text running"
          ><span class="dot"></span>{$t("results.output.running")}{#if runningAction}{@render runningAction()}{/if}</span
        >
      </div>
    {/if}
  </div>

  {#if entries.length > 0}
    <!-- Copiar: lo que copia es lo que se ve, con la hora. La flecha elige
         cuantas lineas (se recuerda). -->
    <div class="copy-float" class:open={menuOpen} bind:this={control}>
      <button
        type="button"
        class="copy-main"
        use:tooltip={amount === "all" ? $t("results.output.copyAllTitle") : $t("results.output.copyTitle", { count: amount })}
        onclick={() => void copy()}
      >
        {#if copied}
          <Check size={13} aria-hidden="true" />
          <span>{$t("results.output.copied")}</span>
        {:else}
          <Copy size={13} aria-hidden="true" />
          <span>{amount === "all" ? $t("results.output.copyAllShort") : $t("results.output.copy", { count: amount })}</span>
        {/if}
      </button>
      <button
        type="button"
        class="copy-more"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={$t("results.output.copyMenu")}
        use:tooltip={$t("results.output.copyMenu")}
        onclick={toggleMenu}
      >
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {#if menuOpen}
        <div class="ui-menu copy-menu" role="menu" aria-label={$t("results.output.copyMenu")}>
          {#each COPY_CHOICES as choice (choice)}
            <button
              type="button"
              role="menuitemradio"
              aria-checked={amount === choice}
              class="ui-menu-item"
              onclick={() => choose(choice)}
            >
              <span class="ui-menu-check">{#if amount === choice}<Check size={13} aria-hidden="true" />{/if}</span>
              <span>{choice === "all" ? $t("results.output.allLines") : $t("results.output.lines", { count: choice })}</span>
            </button>
          {/each}
          <form
            class="custom"
            onsubmit={(event) => {
              event.preventDefault();
              applyCustom();
            }}
          >
            <span class="ui-menu-check">{#if typeof amount === "number" && !COPY_CHOICES.includes(amount)}<Check size={13} aria-hidden="true" />{/if}</span>
            <input
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder={$t("results.output.customLines")}
              aria-label={$t("results.output.customAria")}
              bind:value={custom}
            />
            <button type="submit" class="apply" disabled={parseCustomAmount(custom) === null}>{$t("common.apply")}</button>
          </form>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .output {
    position: relative;
    min-height: 0;
    height: 100%;
  }

  .output-log {
    min-height: 0;
    height: 100%;
    overflow: auto;
    padding: var(--space-2) var(--space-3) var(--space-4);
    box-sizing: border-box;
    background: var(--surface-content);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.8125rem;
    line-height: 1.55;
    cursor: text;
  }

  /* Una fila por entrada: seleccionar con el mouse va de una a otra como
     texto corrido (la grilla de antes cortaba la seleccion por columnas). */
  .entry {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: var(--space-3);
    padding: 1px 0;
  }

  .output-log ::selection {
    background: color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .empty {
    margin: 0;
    color: color-mix(in srgb, var(--text-secondary) 75%, transparent);
    font-family: var(--font-family);
    cursor: default;
  }

  .time {
    color: color-mix(in srgb, var(--text-secondary) 80%, transparent);
    white-space: nowrap;
  }

  /* Copiar, flotando arriba a la derecha (lejos de la barra de scroll):
     discreto hasta que se lo usa. */
  .copy-float {
    position: absolute;
    top: var(--space-2);
    right: calc(var(--space-3) + 6px);
    z-index: 3;
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    font-family: var(--font-family);
    font-size: 0.75rem;
    opacity: 0.82;
    transition: opacity var(--duration-fast) ease;
    -webkit-user-select: none;
    user-select: none;
  }

  .copy-float:hover,
  .copy-float:focus-within,
  .copy-float.open {
    opacity: 1;
  }

  .copy-main,
  .copy-more {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    height: 1.625rem;
    padding: 0 var(--space-2);
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    cursor: pointer;
  }

  .copy-more {
    padding: 0 var(--space-1);
    border-left: 1px solid var(--border);
  }

  .copy-main:hover,
  .copy-more:hover,
  .copy-float.open .copy-more {
    background: color-mix(in srgb, var(--text-primary) 7%, transparent);
    color: var(--text-primary);
  }

  .copy-main:focus-visible,
  .copy-more:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .copy-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 14rem;
  }

  .custom {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
  }

  .custom input {
    width: 0;
    min-width: 0;
    flex: 1;
    padding: 2px var(--space-2);
    border: 1px solid var(--control-border, var(--border));
    border-radius: calc(var(--radius-sm) - 2px);
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
  }

  .custom .apply {
    padding: 2px var(--space-2);
    border: 0;
    border-radius: calc(var(--radius-sm) - 2px);
    background: var(--accent);
    color: var(--text-on-accent, #fff);
    font: inherit;
    cursor: pointer;
  }

  .custom .apply:disabled {
    opacity: 0.45;
    cursor: default;
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
