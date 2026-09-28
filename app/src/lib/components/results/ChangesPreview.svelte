<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { tick } from "svelte";
  import { t, type MessageKey } from "$lib/i18n";
  import { highlightSql } from "$lib/sqlHighlight";
  import type { ChangeError, ResultChanges } from "$lib/resultEditing";

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
    // Conexion de produccion: el boton lo dice y toma el tono de peligro
    // (no hace falta repetirlo arriba).
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
      { count: changes.deletes.length, one: "results.changes.deletesOne", many: "results.changes.deletesOther", tone: "delete", keyword: "DELETE" },
      { count: changes.updates.length, one: "results.changes.updatesOne", many: "results.changes.updatesOther", tone: "update", keyword: "UPDATE" },
      { count: changes.inserts.length, one: "results.changes.insertsOne", many: "results.changes.insertsOther", tone: "insert", keyword: "INSERT" },
    ].filter(
      (item): item is { count: number; one: MessageKey; many: MessageKey; tone: string; keyword: string } =>
        item.count > 0,
    ),
  );

  // Se resalta linea por linea (no el texto entero y despues se corta): un
  // valor con saltos de linea dentro de un string no deja spans abiertos
  // entre dos <li>.
  // Cada linea sabe a que sentencia pertenece (null = la linea en blanco
  // entre dos), para marcar la que fallo.
  const lines = $derived(
    statements.flatMap((statement, index) => [
      ...(index > 0 ? [{ html: "", statement: null, kind: null }] : []),
      ...statement.split("\n").map((line, lineIndex) => ({
        html: highlightSql(line),
        statement: index,
        // Solo la primera linea de la sentencia lleva el punto de su tipo.
        kind: lineIndex === 0 ? statementKind(statement) : null,
      })),
    ]),
  );

  function statementKind(statement: string): "delete" | "update" | "insert" | null {
    const keyword = statement.trimStart().slice(0, 6).toUpperCase();
    if (keyword === "DELETE") return "delete";
    if (keyword === "UPDATE") return "update";
    if (keyword === "INSERT") return "insert";
    return null;
  }

  // Cada intento fallido "golpea": el aviso de error se sacude y la
  // sentencia culpable destella y queda a la vista. Asi un reintento que
  // choca con el mismo error se nota, sin que el modal parpadee.
  let codeBox = $state<HTMLElement>();
  let attempt = $state(0);
  let lastError: ChangeError | null = null;

  $effect(() => {
    if (!error || error === lastError) return;
    lastError = error;
    attempt += 1;
    void tick().then(() => {
      codeBox?.querySelector("li.failed")?.scrollIntoView({ block: "nearest" });
    });
  });

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
  <!-- Titulo y, debajo, una pastilla por tipo de sentencia: la palabra SQL
       (igual en cualquier idioma) y la cantidad en su bolita. El mismo color
       marca en el margen donde empieza cada sentencia de ese tipo. -->
  <header>
    <h2>{$t("results.changes.title")}</h2>
    <div class="summary">
      {#each summary as item (item.tone)}
        {@const label = $t(item.count === 1 ? item.one : item.many, { count: item.count })}
        <span class={`kind ${item.tone}`} use:tooltip={label} aria-label={label}>
          {item.keyword}<span class="count" aria-hidden="true">{item.count}</span>
        </span>
      {/each}
    </div>
  </header>

  <!-- Una fila por linea: el numero en su propia columna (no seleccionable)
       y el codigo resaltado al lado. -->
  <div class="code" role="region" aria-label={$t("results.changes.sql")} bind:this={codeBox}>
    {#key attempt}
      <ol>
        {#each lines as line, index (index)}
          <li
            class={line.kind ? `start ${line.kind}` : undefined}
            class:failed={error !== null && line.statement !== null && line.statement === error.statementIndex}
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <span class="line-code">{@html line.html || " "}</span>
          </li>
        {/each}
      </ol>
    {/key}
  </div>

  {#if error}
    {#key attempt}
      <div class="apply-error" class:nudge={attempt > 1} role="alert">
        <strong>{$t("results.changes.notApplied")}</strong>
        <!-- Armado como un solo texto: Svelte recorta los espacios en los bordes
             de los bloques {#if} y pegaba "Sentencia 1:" al mensaje. -->
        <span>{errorDetail}</span>
      </div>
    {/key}
  {/if}

  <footer>
    <button type="button" class="action-button secondary" disabled={applying} onclick={close}>{$t("common.cancel")}</button>
    <button type="button" class="action-button {production ? 'danger' : 'primary'}" disabled={applying} onclick={onapply}>
      <!-- El texto no cambia mientras aplica: un reintento rapido no hace
           saltar el boton; basta con que quede deshabilitado. -->
      {production ? $t("results.changes.applyInProduction") : $t("results.applyChanges")}
    </button>
  </footer>
</dialog>

<style>
  .changes-dialog {
    width: min(46rem, calc(100vw - 2rem));
    max-height: calc(100vh - 4rem);
    padding: var(--space-5);
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
    gap: var(--space-4);
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
    flex-direction: column;
    gap: var(--space-2);
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

  .kind {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 1.375rem;
    padding: 0 3px 0 var(--space-2);
    box-sizing: border-box;
    border-radius: 999px;
    background: color-mix(in srgb, var(--kind-color) 14%, transparent);
    color: var(--kind-color);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1rem;
    height: 1rem;
    padding: 0 4px;
    box-sizing: border-box;
    border-radius: 999px;
    background: var(--kind-color);
    color: #fff;
    font-family: inherit;
    font-size: 0.625rem;
    font-variant-numeric: tabular-nums;
  }

  li.start::after {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kind-color);
  }

  .delete {
    --kind-color: var(--danger-solid);
  }

  .update {
    --kind-color: var(--accent);
  }

  .insert {
    --kind-color: var(--success);
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
    position: relative;
    display: flex;
    counter-increment: line;
  }

  li.start::after {
    position: absolute;
    top: calc(0.8em - 3px);
    left: 0.625rem;
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

  /* La sentencia que fallo: destella en rojo al llegar y despues queda solo
     una barra fina a la izquierda; el codigo conserva sus colores. */
  li.failed {
    box-shadow: inset 2px 0 0 var(--danger);
    animation: failed-flash 700ms ease-out;
  }

  @keyframes failed-flash {
    0%,
    40% {
      background: color-mix(in srgb, var(--danger) 26%, transparent);
    }
    100% {
      background: transparent;
    }
  }

  .apply-error.nudge {
    animation: nudge 320ms ease-in-out;
  }

  @keyframes nudge {
    20% {
      transform: translateX(-4px);
    }
    40% {
      transform: translateX(4px);
    }
    60% {
      transform: translateX(-2px);
    }
    80% {
      transform: translateX(2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    li.failed,
    .apply-error.nudge {
      animation: none;
    }
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
    gap: var(--space-2);
  }
</style>
