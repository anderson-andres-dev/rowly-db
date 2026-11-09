<script lang="ts">
  import { tick } from "svelte";
  import { ChevronDown, ChevronUp, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import ToolbarButton from "$lib/components/results/ToolbarButton.svelte";
  import { highlightJson } from "$lib/results/jsonHighlight";
  import {
    clampRow,
    draftChanged,
    recordFields,
    totalRows,
    type RecordField,
  } from "$lib/results/recordView";
  import {
    clearedCell,
    resolveCell,
    sameValue,
    typedCell,
    type CellBlock,
    type CellInput,
    type CellValue,
    type PendingEdits,
    type ResultEditInfo,
  } from "$lib/results/resultEditing";
  import { MAX_RECORD_WIDTH, MIN_RECORD_WIDTH, clampRecordWidth, recordViewWidth } from "$lib/stores/recordView";
  import { tooltip } from "$lib/tooltip";
  import type { QueryColumn, QueryRow } from "$lib/types";

  // Vista de registro (#133): la fila seleccionada como formulario, una
  // columna por linea. No guarda estado de datos: lee las filas y los
  // cambios pendientes del resultado y escribe por `oncommit`, el mismo
  // camino que la rejilla; por eso lo editado aqui se ve alli y al reves.
  let {
    columns,
    rows,
    edits,
    editInfo,
    editBlockedReason = null,
    row,
    column,
    hidden = null,
    onmove,
    oncommit,
    onclose,
    onnotice,
  }: {
    columns: readonly QueryColumn[];
    rows: readonly QueryRow[];
    edits: PendingEdits;
    editInfo: ResultEditInfo | null;
    editBlockedReason?: string | null;
    // La fila y la columna seleccionadas en la rejilla.
    row: number | null;
    column: number;
    hidden?: ReadonlySet<number> | null;
    // Pide a la rejilla seleccionar esa celda (ella es dueña de la seleccion).
    onmove: (row: number, column: number) => void;
    oncommit: (row: number, column: number, value: CellValue) => void;
    onclose: () => void;
    onnotice: (message: string) => void;
  } = $props();

  const total = $derived(totalRows(rows, edits));
  const current = $derived(clampRow(row, total));
  const isNewRow = $derived(current !== null && current >= rows.length);
  const fields = $derived(current === null ? [] : recordFields(columns, rows, edits, editInfo, current));

  let root = $state<HTMLElement>();
  let list = $state<HTMLElement>();
  let active = $state(0);
  let editing = $state<{ col: number; draft: string } | null>(null);

  // La columna activa sigue a la rejilla mientras el foco no este aqui: si
  // se esta tecleando en el panel, la rejilla no le mueve el campo.
  $effect(() => {
    const target = Math.min(Math.max(column, 0), Math.max(fields.length - 1, 0));
    if (!root?.contains(document.activeElement)) active = target;
  });

  // Otra fila u otro resultado: lo que se estaba escribiendo ya no es de esta.
  let editedRow = -1;
  $effect(() => {
    if (current !== editedRow) {
      editedRow = current ?? -1;
      editing = null;
    }
  });

  export function focus() {
    focusField(active);
  }

  function focusField(col: number) {
    void tick().then(() => list?.querySelector<HTMLElement>(`[data-col="${col}"]`)?.focus({ preventScroll: false }));
  }

  function blockedText(block: CellBlock): string {
    if (block.key === "blocked.result" && editBlockedReason) return editBlockedReason;
    return $t(`grid.${block.key}`, block.params);
  }

  function resolve(input: CellInput, field: RecordField): CellValue {
    const editable = editInfo?.columns[field.col];
    if (editable) return resolveCell(input, editable, isNewRow);
    return typeof input === "function" ? { kind: "null" } : input;
  }

  function commit(field: RecordField, value: CellValue) {
    if (current === null || sameValue(field.value, value)) return;
    oncommit(current, field.col, value);
  }

  function moveField(col: number) {
    const next = Math.min(Math.max(col, 0), fields.length - 1);
    active = next;
    focusField(next);
    if (current !== null && next !== column) onmove(current, next);
  }

  function stepRecord(step: 1 | -1) {
    if (current === null) return;
    let next = current + step;
    while (next >= 0 && next < total && hidden?.has(next)) next += step;
    if (next < 0 || next >= total) return;
    onmove(next, active);
  }

  function beginEdit(field: RecordField, typed?: string) {
    if (field.blocked) {
      onnotice(blockedText(field.blocked));
      return;
    }
    if (field.kind === "binary") {
      onnotice($t("results.record.binary"));
      return;
    }
    editing = { col: field.col, draft: typed ?? field.editText };
    void tick().then(() => {
      const area = list?.querySelector<HTMLTextAreaElement>(`textarea[data-col="${field.col}"]`);
      if (!area) return;
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
      grow(area);
    });
  }

  // `refocus` falso al salir por un clic fuera: el foco ya es de otro.
  function finishEdit(field: RecordField, save: boolean, refocus = true) {
    const draft = editing?.draft ?? "";
    editing = null;
    if (save && draftChanged(field, draft)) commit(field, resolve(typedCell(draft), field));
    if (refocus) focusField(field.col);
  }

  function setNull(field: RecordField) {
    if (field.blocked) {
      onnotice(blockedText(field.blocked));
      return;
    }
    editing = null;
    commit(field, { kind: "null" });
    focusField(field.col);
  }

  function clearField(field: RecordField) {
    if (field.blocked) {
      onnotice(blockedText(field.blocked));
      return;
    }
    commit(field, resolve(clearedCell(), field));
  }

  function isNullShortcut(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.code === "KeyN";
  }

  function onFieldKeydown(event: KeyboardEvent, field: RecordField) {
    if (editing) return;
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
    let handled = true;
    if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      stepRecord(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      stepRecord(event.key === "PageDown" ? 1 : -1);
    } else if (isNullShortcut(event)) {
      setNull(field);
    } else if (!plain) {
      handled = false;
    } else if (event.key === "ArrowDown") {
      moveField(field.col + 1);
    } else if (event.key === "ArrowUp") {
      moveField(field.col - 1);
    } else if (event.key === "Home") {
      moveField(0);
    } else if (event.key === "End") {
      moveField(fields.length - 1);
    } else if (event.key === "Enter" || event.key === "F2") {
      beginEdit(field);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      clearField(field);
    } else if (event.key === "Escape") {
      onclose();
    } else if (event.key.length === 1) {
      beginEdit(field, event.key);
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function onEditorKeydown(event: KeyboardEvent, field: RecordField) {
    event.stopPropagation();
    if (isNullShortcut(event)) {
      event.preventDefault();
      setNull(field);
    } else if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      finishEdit(field, true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finishEdit(field, false);
    } else if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const next = field.col + (event.shiftKey ? -1 : 1);
      finishEdit(field, true);
      moveField(next);
    }
  }

  // El campo crece con lo que tiene, hasta un tope; despues, su propio scroll.
  const MAX_FIELD_HEIGHT = 240;
  function grow(area: HTMLTextAreaElement) {
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, MAX_FIELD_HEIGHT)}px`;
  }

  // --- Ancho ---------------------------------------------------------------
  function startResize(event: PointerEvent) {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = $recordViewWidth;
    function onMove(moveEvent: PointerEvent) {
      recordViewWidth.set(clampRecordWidth(startWidth + (startX - moveEvent.clientX)));
    }
    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    }
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function onResizeKeydown(event: KeyboardEvent) {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") recordViewWidth.set(clampRecordWidth($recordViewWidth + step));
    else if (event.key === "ArrowRight") recordViewWidth.set(clampRecordWidth($recordViewWidth - step));
    else return;
    event.preventDefault();
  }
</script>

<aside
  class="record-view"
  bind:this={root}
  aria-label={$t("results.record.label")}
  style:width="{$recordViewWidth}px"
>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="resize-handle"
    role="separator"
    aria-orientation="vertical"
    aria-label={$t("results.record.resize")}
    aria-valuenow={$recordViewWidth}
    aria-valuemin={MIN_RECORD_WIDTH}
    aria-valuemax={MAX_RECORD_WIDTH}
    tabindex="0"
    onpointerdown={startResize}
    onkeydown={onResizeKeydown}
  ></div>
  <header>
    <span class="title">
      {#if current === null}
        {$t("results.record.label")}
      {:else}
        {$t("results.record.title", { row: current + 1, total })}
        {#if isNewRow}<span class="new">{$t("results.record.newRow")}</span>{/if}
      {/if}
    </span>
    <ToolbarButton
      icon={ChevronUp}
      label={$t("results.record.previous")}
      shortcut="Alt+↑"
      disabled={current === null || current === 0}
      onclick={() => stepRecord(-1)}
    />
    <ToolbarButton
      icon={ChevronDown}
      label={$t("results.record.next")}
      shortcut="Alt+↓"
      disabled={current === null || current >= total - 1}
      onclick={() => stepRecord(1)}
    />
    <ToolbarButton icon={X} label={$t("results.record.close")} shortcut="Esc" onclick={onclose} />
  </header>
  {#if current === null}
    <p class="empty">{$t("results.record.empty")}</p>
  {:else}
    <div class="fields" bind:this={list} role="list">
      {#each fields as field (field.col)}
        {@const isEditing = editing?.col === field.col}
        {@const problem = field.problem ? $t(`grid.${field.problem.key}`, field.problem.params) : null}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="field"
          class:active={active === field.col}
          class:modified={field.modified}
          class:invalid={problem !== null}
          class:locked={field.blocked !== null}
          role="listitem"
          data-col={field.col}
          tabindex={active === field.col && !isEditing ? 0 : -1}
          aria-label={field.name}
          onfocus={() => {
            if (active !== field.col) moveField(field.col);
          }}
          onkeydown={(event) => onFieldKeydown(event, field)}
        >
          <div class="meta">
            <span class="name">{field.name}</span>
            {#if field.primaryKey}<span class="chip">PK</span>{/if}
            <span class="type">
              {field.type}{field.nullable === false ? " · NOT NULL" : ""}{field.defaultValue !== null
                ? ` · DEFAULT ${field.defaultValue}`
                : ""}
            </span>
          </div>
          {#if isEditing && editing}
            <textarea
              class="editor"
              data-col={field.col}
              rows="1"
              spellcheck="false"
              aria-label={$t("results.record.field", { column: field.name })}
              bind:value={editing.draft}
              oninput={(event) => grow(event.currentTarget)}
              onkeydown={(event) => onEditorKeydown(event, field)}
              onblur={() => {
                if (editing?.col === field.col) finishEdit(field, true, false);
              }}
            ></textarea>
          {:else}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="value {field.kind}"
              data-problem={problem ?? undefined}
              onclick={() => {
                active = field.col;
                beginEdit(field);
              }}
              use:tooltip={problem ?? ""}
            >
              {#if field.kind === "null"}
                <span class="placeholder">NULL</span>
              {:else if field.kind === "default"}
                <span class="placeholder">DEFAULT</span>
              {:else if field.kind === "binary"}
                <span class="hex">{field.display}</span>
                <span class="size">{$t("results.record.bytes", { count: field.bytes ?? 0 })}</span>
              {:else if field.kind === "json"}
                <!-- highlightJson escapa el texto antes de armar el HTML. -->
                {@html highlightJson(field.display)}
              {:else}
                {field.display}
              {/if}
            </div>
          {/if}
          {#if field.truncated && !isEditing}
            <span class="hint">{$t("results.record.truncated", { count: field.display.length })}</span>
          {/if}
          {#if problem}
            <span class="problem">{problem}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</aside>

<style>
  .record-view {
    position: relative;
    display: flex;
    min-width: 0;
    flex-shrink: 0;
    flex-direction: column;
    border-left: 1px solid var(--border);
    background: var(--surface-content);
  }

  .resize-handle {
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    left: -3px;
    width: 6px;
    cursor: col-resize;
    outline: none;
    touch-action: none;
  }

  .resize-handle:hover,
  .resize-handle:focus-visible {
    background: color-mix(in srgb, var(--text-secondary) 40%, transparent);
  }

  header {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  }

  .title {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    color: var(--text-primary);
    font-size: 0.8125rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .new {
    margin-left: var(--space-2);
    color: var(--success);
    font-weight: 400;
  }

  .empty {
    margin: var(--space-4);
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  .fields {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-2) var(--space-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-2) var(--space-2);
    border-radius: var(--radius-sm);
    outline: none;
  }

  .field.active {
    background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
  }

  .field:focus-visible {
    box-shadow: inset 0 0 0 1px var(--focus-ring);
  }

  .meta {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 0;
  }

  .name {
    flex-shrink: 0;
    color: var(--text-primary);
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .chip {
    flex-shrink: 0;
    padding: 0 5px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--text-secondary) 18%, transparent);
    color: var(--text-secondary);
    font-size: 0.6875rem;
    line-height: 1.4;
  }

  .type {
    min-width: 0;
    overflow: hidden;
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value,
  .editor {
    box-sizing: border-box;
    width: 100%;
    min-height: 1.5rem;
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .value {
    cursor: text;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .field.locked .value {
    cursor: default;
    color: var(--text-secondary);
  }

  .value.json,
  .value.binary,
  .editor {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.75rem;
  }

  .editor {
    resize: none;
    border: 1px solid var(--focus-ring);
    background: var(--surface);
    outline: none;
  }

  .placeholder {
    color: var(--text-secondary);
    font-style: italic;
  }

  .size {
    display: block;
    color: var(--text-secondary);
    font-family: var(--font-family);
    font-size: 0.6875rem;
  }

  .hint {
    padding: 0 var(--space-2);
    color: var(--text-secondary);
    font-size: 0.6875rem;
  }

  .problem {
    padding: 0 var(--space-2);
    color: var(--danger-solid);
    font-size: 0.6875rem;
  }

  /* Los mismos tonos que la celda de la rejilla: editado en acento, un valor
     que no encaja en rojo. */
  .field.modified .value {
    background: color-mix(in srgb, var(--accent) 24%, transparent);
  }

  .field.invalid .value {
    background: color-mix(in srgb, var(--danger-solid) 24%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--danger-solid) 70%, transparent);
  }

  .value :global(.j-key) {
    color: var(--syntax-key, var(--text-primary));
  }

  .value :global(.j-str) {
    color: var(--syntax-string, var(--text-primary));
  }

  .value :global(.j-num) {
    color: var(--syntax-number, var(--text-primary));
  }

  .value :global(.j-lit) {
    color: var(--syntax-constant, var(--text-primary));
  }
</style>
