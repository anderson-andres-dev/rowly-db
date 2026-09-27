<script lang="ts">
  import { tick } from "svelte";
  import { t, type MessageKey } from "$lib/i18n";
  import { highlightSql } from "$lib/sqlHighlight";
  import type { ChangeError, ResultChanges } from "$lib/resultEditing";
  import EnvironmentBadge from "$lib/components/EnvironmentBadge.svelte";

  // Vista previa de los cambios pendientes: el SQL exacto que se va a
  // ejecutar. Llega ya generado (el padre lo pide al backend ANTES de abrir
  // el modal) y se resalta con highlightSql, sin montar un editor: el modal
  // aparece al instante y con su contenido completo.
  let {
    statements,
    changes,
    applying = false,
    error = null,
    dismiss = false,
    production = false,
    onapply,
    onclose,
  }: {
    statements: string[];
    changes: ResultChanges;
    applying?: boolean;
    error?: ChangeError | null;
    // El padre pide cerrar (p.ej. se aplico todo): se anima la salida y
    // recien al terminar llega onclose.
    dismiss?: boolean;
    // Conexion de produccion: el boton lo dice y toma el tono de peligro.
    production?: boolean;
    onapply: () => void;
    onclose: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();

  const errorDetail = $derived(
    error
      ? [
          error.statementIndex !== null
            ? $t("results.changes.statement", { index: error.statementIndex + 1 })
            : null,
          error.message,
          error.code ? `(${error.code})` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : "",
  );

  const summary = $derived(
    [
      { count: changes.deletes.length, one: "results.changes.deletesOne", many: "results.changes.deletesOther", tone: "delete" },
      { count: changes.updates.length, one: "results.changes.updatesOne", many: "results.changes.updatesOther", tone: "update" },
      { count: changes.inserts.length, one: "results.changes.insertsOne", many: "results.changes.insertsOther", tone: "insert" },
    ].filter((item): item is { count: number; one: MessageKey; many: MessageKey; tone: string } => item.count > 0),
  );

  // Se resalta linea por linea (no el texto entero y despues se corta): un
  // valor con saltos de linea dentro de un string no deja spans abiertos
  // entre dos <li>.
  const lines = $derived(statements.join("\n\n").split("\n").map(highlightSql));

  $effect(() => {
    void tick().then(() => {
      dialog?.showModal();
      dialog?.focus();
    });
  });

  $effect(() => {
    if (dismiss) dialog?.close();
  });

  function close() {
    if (!applying) dialog?.close();
  }
</script>

<dialog
  class="changes-dialog"
  tabindex="-1"
  bind:this={dialog}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onclose={onclose}
>
  <header>
    <h2>{$t("results.changes.title")}</h2>
    {#if production}
      <EnvironmentBadge environment="production" />
    {/if}
    <div class="summary">
      {#each summary as item (item.tone)}
        <span class={`chip ${item.tone}`}>{$t(item.count === 1 ? item.one : item.many, { count: item.count })}</span>
      {/each}
    </div>
  </header>

  <!-- Una fila por linea: el numero en su propia columna (no seleccionable)
       y el codigo resaltado al lado. -->
  <div class="code" role="region" aria-label={$t("results.changes.sql")}>
    <ol>
      {#each lines as line, index (index)}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <li><span class="line-code">{@html line || " "}</span></li>
      {/each}
    </ol>
  </div>

  {#if error}
    <div class="apply-error" role="alert">
      <strong>{$t("results.changes.notApplied")}</strong>
      <!-- Armado como un solo texto: Svelte recorta los espacios en los bordes
           de los bloques {#if} y pegaba "Sentencia 1:" al mensaje. -->
      <span>{errorDetail}</span>
    </div>
  {/if}

  <footer>
    <button type="button" class="secondary-action" disabled={applying} onclick={close}>{$t("common.cancel")}</button>
    <button type="button" class="primary-action" class:production disabled={applying} onclick={onapply}>
      {applying
        ? $t("results.changes.applying")
        : production
          ? $t("results.changes.applyInProduction")
          : $t("results.applyChanges")}
    </button>
  </footer>
</dialog>

<style>
  .changes-dialog {
    width: min(46rem, calc(100vw - 2rem));
    max-height: calc(100vh - 4rem);
    padding: 1.5rem 1.75rem;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    color: var(--text-primary);
    outline: none;
  }

  .changes-dialog[open] {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: dialog-in 180ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }

  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: translateY(4px) scale(0.98);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .changes-dialog[open] {
      animation: none;
    }
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-heading);
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--tracking-heading);
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px var(--space-2);
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .chip::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .chip.delete::before {
    background: var(--danger-solid);
  }

  .chip.update::before {
    background: var(--accent);
  }

  .chip.insert::before {
    background: var(--success);
  }

  .code {
    min-height: 6rem;
    max-height: 55vh;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-content);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
  }

  ol {
    margin: 0;
    padding: var(--space-2) 0;
    list-style: none;
    counter-reset: line;
  }

  li {
    display: flex;
    counter-increment: line;
  }

  li::before {
    content: counter(line);
    flex-shrink: 0;
    width: 2.75rem;
    padding-right: var(--space-3);
    box-sizing: border-box;
    color: color-mix(in srgb, var(--text-secondary) 60%, transparent);
    text-align: right;
    font-variant-numeric: tabular-nums;
    -webkit-user-select: none;
    user-select: none;
  }

  .line-code {
    min-width: 0;
    padding-right: var(--space-3);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .code :global(.s-kw) {
    color: var(--syntax-keyword, var(--text-primary));
  }

  .code :global(.s-str) {
    color: var(--syntax-string, var(--text-primary));
  }

  .code :global(.s-num) {
    color: var(--syntax-number, var(--text-primary));
  }

  .code :global(.s-com) {
    color: var(--syntax-comment, var(--text-secondary));
    font-style: italic;
  }

  .apply-error {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--danger-solid) 12%, transparent);
    color: var(--text-primary);
    font-size: 0.8125rem;
    line-height: 1.45;
  }

  .apply-error strong {
    color: var(--danger);
    font-weight: 600;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.625rem;
  }

  footer button {
    height: 2.5rem;
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  footer button:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .secondary-action {
    background: color-mix(in srgb, var(--text-primary) 9%, var(--surface-elevated));
    color: var(--text-primary);
  }

  .secondary-action:hover:not(:disabled) {
    background: color-mix(in srgb, var(--text-primary) 14%, var(--surface-elevated));
  }

  .primary-action {
    background: var(--accent);
    color: var(--text-on-accent);
  }

  .primary-action:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .primary-action.production {
    background: var(--danger-solid);
  }

  .primary-action.production:hover:not(:disabled) {
    background: var(--danger-solid-hover);
  }

  footer button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
</style>
