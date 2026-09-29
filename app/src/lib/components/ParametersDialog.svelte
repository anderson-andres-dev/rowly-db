<script lang="ts">
  import { tick, untrack } from "svelte";
  import { Variable } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { MessageKey } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
  import { parameterValue, quoteText, type ParameterType } from "$lib/sqlParameters";
  import type { ParameterColumn } from "$lib/sqlParameterTypes";
  import type { SqlLexical } from "$lib/sqlStatements";
  import { queryParameterValues, rememberParameterValues } from "$lib/stores/queryParameters";

  // Pide los valores de los parametros (:nombre) antes de ejecutar. Se
  // escribe el dato y la app lo formatea segun la columna con que se compara
  // (sqlParameters.ts): una fecha en ISO, un numero validado, un texto entre
  // comillas. Debajo del nombre, el tipo de esa columna; si lo escrito no
  // encaja, se avisa y no se ejecuta. NULL es un boton, como al editar una
  // celda. Se propone lo ultimo usado. Enter en el ultimo campo (o
  // Ctrl+Enter en cualquiera) ejecuta; Esc cancela.
  let {
    parameters,
    lexical,
    onconfirm,
    oncancel,
  }: {
    parameters: { name: string; column: ParameterColumn | null }[];
    lexical: SqlLexical;
    // Nombre -> el SQL que entra en la consulta.
    onconfirm: (values: Map<string, string>) => void;
    oncancel: () => void;
  } = $props();

  // Se monta un dialogo por ejecucion: los valores iniciales se toman una vez.
  const remembered = $queryParameterValues;
  let rows = $state(
    untrack(() =>
      parameters.map(({ name, column }) => ({
        name,
        column,
        value: remembered[name]?.value ?? "",
        isNull: remembered[name]?.isNull ?? false,
      })),
    ),
  );
  const resolved = $derived(rows.map((row) => parameterValue(row.value, row.column?.type ?? null, row.isNull, lexical)));
  const complete = $derived(resolved.every((value) => value.ok));

  let dialog = $state<HTMLDialogElement>();
  let inputs = $state<HTMLInputElement[]>([]);

  $effect(() => {
    void tick().then(() => {
      dialog?.showModal();
      const first = rows.findIndex((row) => !row.isNull);
      inputs[Math.max(0, first)]?.focus();
      inputs[Math.max(0, first)]?.select();
    });
  });

  const PLACEHOLDER: Record<ParameterType, MessageKey> = {
    text: "workspace.parameters.placeholder.text",
    integer: "workspace.parameters.placeholder.integer",
    decimal: "workspace.parameters.placeholder.decimal",
    date: "workspace.parameters.placeholder.date",
    datetime: "workspace.parameters.placeholder.datetime",
    time: "workspace.parameters.placeholder.time",
    boolean: "workspace.parameters.placeholder.boolean",
  };

  const INVALID: Record<ParameterType, MessageKey> = {
    text: "workspace.parameters.invalid.text",
    integer: "workspace.parameters.invalid.integer",
    decimal: "workspace.parameters.invalid.decimal",
    date: "workspace.parameters.invalid.date",
    datetime: "workspace.parameters.invalid.datetime",
    time: "workspace.parameters.invalid.time",
    boolean: "workspace.parameters.invalid.boolean",
  };

  // Como entra en la consulta, solo si la app lo cambio de verdad (una fecha
  // DD/MM/AAAA a ISO, una coma decimal): poner comillas a un texto no.
  function adjusted(index: number): string | null {
    const value = resolved[index];
    const row = rows[index];
    if (!value.ok || row.isNull) return null;
    const typed = row.value.trim();
    return value.sql === typed || value.sql === quoteText(row.value, lexical) ? null : value.sql;
  }

  async function toggleNull(index: number) {
    rows[index].isNull = !rows[index].isNull;
    if (rows[index].isNull) return;
    await tick();
    inputs[index]?.focus();
  }

  // Como en ConfirmDialog, la respuesta sale en el evento close (despues de
  // la animacion de salida).
  let confirmed = false;

  function respond(confirm: boolean) {
    if (confirm && !complete) return;
    confirmed = confirm;
    dialog?.close();
  }

  function onClosed() {
    if (!confirmed) {
      oncancel();
      return;
    }
    rememberParameterValues(new Map(rows.map((row) => [row.name, { value: row.value, isNull: row.isNull }])));
    onconfirm(new Map(rows.map((row, index) => [row.name, resolved[index].ok ? resolved[index].sql : ""])));
  }

  function onInputKeydown(event: KeyboardEvent, index: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const next = rows.findIndex((row, other) => other > index && !row.isNull);
    if (event.ctrlKey || event.metaKey || next === -1) {
      respond(true);
      return;
    }
    inputs[next]?.focus();
    inputs[next]?.select();
  }
</script>

<dialog
  class="alert-dialog parameters-dialog"
  tabindex="-1"
  aria-labelledby="parameters-dialog-title"
  bind:this={dialog}
  oncancel={(event) => {
    event.preventDefault();
    respond(false);
  }}
  onclose={onClosed}
>
  <div class="alert-body">
    <span class="alert-icon" aria-hidden="true">
      <Variable size={16} strokeWidth={2.25} />
    </span>
    <div class="alert-text">
      <h2 id="parameters-dialog-title">{$t("workspace.parameters.title")}</h2>
      <p>{$t("workspace.parameters.message")}</p>
    </div>
  </div>
  <div class="fields">
    {#each rows as row, index (row.name)}
      {@const value = resolved[index]}
      {@const invalid = !value.ok && value.error !== "empty" && row.value.trim() !== ""}
      {@const shown = adjusted(index)}
      <div class="field">
        <label class="name" for="parameter-{index}">
          <span>:{row.name}</span>
          {#if row.column}<span class="type">{row.column.dataType}</span>{/if}
        </label>
        <div class="input" class:invalid class:null={row.isNull}>
          <input
            id="parameter-{index}"
            bind:this={inputs[index]}
            bind:value={row.value}
            disabled={row.isNull}
            spellcheck="false"
            autocomplete="off"
            placeholder={row.isNull
              ? "NULL"
              : $t(row.column ? PLACEHOLDER[row.column.type] : "workspace.parameters.placeholder.value")}
            onkeydown={(event) => onInputKeydown(event, index)}
          />
          <button
            type="button"
            class="null-chip"
            class:active={row.isNull}
            aria-pressed={row.isNull}
            use:tooltip={$t("workspace.parameters.null")}
            onclick={() => void toggleNull(index)}>NULL</button
          >
        </div>
        {#if invalid && !value.ok && value.error !== "empty"}
          <span class="hint error">{$t(INVALID[value.error])}</span>
        {:else if shown}
          <code class="hint">{shown}</code>
        {/if}
      </div>
    {/each}
  </div>
  <div class="alert-actions">
    <button type="button" class="action-button secondary" onclick={() => respond(false)}>{$t("common.cancel")}</button>
    <button type="button" class="action-button primary" disabled={!complete} onclick={() => respond(true)}>
      {$t("workspace.parameters.run")}
    </button>
  </div>
</dialog>

<style>
  /* No es un aviso: el tono es el de la app, no el de advertencia. */
  .parameters-dialog {
    --alert-tone: var(--accent);
    width: min(32rem, calc(100vw - 2rem));
  }

  .fields {
    display: grid;
    gap: var(--space-3);
    max-height: 55vh;
    margin-top: var(--space-4);
    overflow-y: auto;
  }

  .field {
    display: grid;
    grid-template-columns: minmax(7rem, max-content) 1fr;
    align-items: center;
    column-gap: var(--space-3);
  }

  .name {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    color: var(--text-primary);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.8125rem;
  }

  /* El tipo de la columna con que se compara: informativo. */
  .type {
    overflow: hidden;
    color: var(--text-secondary);
    font-family: var(--font-family);
    font-size: 0.6875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* El campo y su chip NULL en una sola caja, como el editor de celda. */
  .input {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 2rem;
    box-sizing: border-box;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }

  .input:focus-within {
    border-color: var(--focus-ring);
  }

  .input.invalid {
    border-color: var(--danger);
  }

  input {
    min-width: 0;
    height: 100%;
    flex: 1;
    padding: 0 var(--space-3);
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.8125rem;
    outline: none;
    -webkit-user-select: text;
    user-select: text;
  }

  input:disabled::placeholder {
    color: var(--text-secondary);
    font-style: italic;
  }

  .null-chip {
    flex-shrink: 0;
    margin-right: 4px;
    padding: 0 5px;
    border: 0;
    border-radius: 3px;
    background: color-mix(in srgb, var(--text-secondary) 18%, transparent);
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.6875rem;
    line-height: 1.4;
    cursor: pointer;
  }

  .null-chip:hover {
    background: color-mix(in srgb, var(--text-secondary) 30%, transparent);
  }

  .null-chip.active {
    background: var(--accent);
    color: var(--text-on-accent);
  }

  .null-chip:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .hint {
    grid-column: 2;
    overflow: hidden;
    margin-top: 3px;
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  code.hint {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
  }

  code.hint::before {
    content: "→ ";
  }

  .hint.error {
    color: var(--danger);
  }
</style>
