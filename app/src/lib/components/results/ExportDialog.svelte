<script lang="ts">
  import Checkbox from "$lib/components/Checkbox.svelte";
  import { tooltip } from "$lib/tooltip";
  import { tick } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { downloadDir, join } from "@tauri-apps/api/path";
  import { save } from "@tauri-apps/plugin-dialog";
  import { FolderOpen } from "@lucide/svelte";
  import type { QueryColumn, QueryRow, SortKey } from "$lib/types";
  import { COPY_FORMATS, serializeSelection, writeClipboardText, type CopyFormat } from "$lib/gridClipboard";
  import { escapeHtml, highlightJson } from "$lib/jsonHighlight";
  import { highlightSql } from "$lib/sqlHighlight";
  import { t } from "$lib/i18n";

  // "Exportar datos": la consulta del resultado se vuelve a ejecutar ENTERA
  // en el backend y se escribe al archivo fila por fila (export.rs), sin
  // pasar por el grid: sirve para consultas de millones de filas. La vista
  // previa usa las filas ya cargadas de la pagina.
  export interface ExportSummary {
    rows: number;
    path: string;
    elapsedMs: number;
  }

  let {
    source,
    sql,
    sort = [],
    columns,
    rows,
    tableName,
    initialFormat,
    initialHeaders,
    onexported,
    oncopied,
    onclose,
  }: {
    source: string;
    sql: string;
    // Orden de los encabezados: el archivo sale en el mismo orden que el grid.
    sort?: SortKey[];
    columns: QueryColumn[];
    rows: QueryRow[];
    tableName: string;
    initialFormat: CopyFormat;
    initialHeaders: boolean;
    onexported: (summary: ExportSummary) => void;
    oncopied: (rowCount: number) => void;
    onclose: () => void;
  } = $props();

  const EXTENSIONS: Record<CopyFormat, string> = { tsv: "tsv", csv: "csv", json: "json", markdown: "md", sql: "sql" };
  const PREVIEW_ROWS = 40;

  // svelte-ignore state_referenced_locally
  let format = $state<CopyFormat>(initialFormat);
  // svelte-ignore state_referenced_locally
  let headers = $state(initialHeaders);
  let path = $state("");
  let exporting = $state(false);
  let error = $state<string | null>(null);
  let dialog = $state<HTMLDialogElement>();

  const safeName = $derived(source.replace(/[^\w.-]+/g, "_") || $t("results.export.defaultName"));

  // Al cambiar de formato, la extension del archivo acompaña.
  $effect(() => {
    const extension = EXTENSIONS[format];
    if (path) path = path.replace(/\.[^./\\]+$/, "") + `.${extension}`;
  });

  $effect(() => {
    void (async () => {
      try {
        path = await join(await downloadDir(), `${safeName}.${EXTENSIONS[format]}`);
      } catch {
        path = "";
      }
    })();
    void tick().then(() => {
      dialog?.showModal();
      dialog?.focus();
    });
  });

  const toValues = (source: QueryRow[]) =>
    source.map((row) => row.map((value) => (value === null ? { kind: "null" as const } : { kind: "text" as const, value })));

  const previewText = $derived(
    rows.length === 0
      ? ""
      : serializeSelection(
          columns.map((column) => ({ name: column.name, type: column.type })),
          toValues(rows.slice(0, PREVIEW_ROWS)),
          // La vista previa nunca cae en "una sola celda => valor puro".
          { format, headers, tableName },
        ),
  );

  // Resaltado por linea (como la vista previa de cambios): nada de spans
  // abiertos entre lineas.
  const previewLines = $derived(
    previewText
      .split("\n")
      .map((line) => (format === "json" ? highlightJson(line) : format === "sql" ? highlightSql(line) : escapeHtml(line))),
  );

  async function chooseFile() {
    const extension = EXTENSIONS[format];
    const picked = await save({
      title: $t("results.export.title"),
      defaultPath: path || `${safeName}.${extension}`,
      filters: [{ name: COPY_FORMATS.find((item) => item.id === format)?.label ?? extension, extensions: [extension] }],
    });
    if (picked) path = /\.[^./\\]+$/.test(picked) ? picked : `${picked}.${extension}`;
  }

  async function exportToFile() {
    if (exporting) return;
    if (!path) await chooseFile();
    if (!path) return;
    exporting = true;
    error = null;
    try {
      const summary = await invoke<ExportSummary>("export_query_to_file", {
        request: { sql, sort, format, headers, tableName, path },
      });
      onexported(summary);
      dialog?.close();
    } catch (cause) {
      error = String(cause);
    } finally {
      exporting = false;
    }
  }

  async function copyPage() {
    const text = serializeSelection(
      columns.map((column) => ({ name: column.name, type: column.type })),
      toValues(rows),
      { format, headers, tableName },
    );
    if (await writeClipboardText(text)) {
      oncopied(rows.length);
      dialog?.close();
    }
  }

  function close() {
    if (!exporting) dialog?.close();
  }
</script>

<dialog
  class="export-dialog"
  tabindex="-1"
  bind:this={dialog}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onclose={onclose}
>
  <div class="layout">
    <div class="settings">
      <h2>{$t("results.export.title")}</h2>

      <div class="field">
        <span class="label">{$t("results.export.source")}</span>
        <div class="static">{source}</div>
      </div>

      <div class="field">
        <span class="label">{$t("results.export.format")}</span>
        <div class="formats" role="radiogroup" aria-label={$t("results.export.format")}>
          {#each COPY_FORMATS as item (item.id)}
            <button
              type="button"
              role="radio"
              aria-checked={format === item.id}
              class="format"
              class:selected={format === item.id}
              onclick={() => (format = item.id)}>{item.label}</button
            >
          {/each}
        </div>
      </div>

      {#if format === "tsv" || format === "csv"}
        <Checkbox bind:checked={headers} label={$t("results.includeHeaders")} />
      {/if}

      <div class="field">
        <span class="label">{$t("results.export.file")}</span>
        <div class="path">
          <input aria-label={$t("results.export.target")} bind:value={path} spellcheck="false" />
          <button type="button" class="icon-button" use:tooltip={$t("results.export.chooseFile")} aria-label={$t("results.export.chooseFile")} onclick={() => void chooseFile()}>
            <FolderOpen size={15} aria-hidden="true" />
          </button>
        </div>
        <p class="hint">{$t("results.export.allRows")}</p>
      </div>

      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}
    </div>

    <div class="preview">
      <span class="label">{$t("results.export.preview")}</span>
      <div class="code">
        <ol>
          {#each previewLines as line, index (index)}
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <li><span>{@html line || " "}</span></li>
          {/each}
        </ol>
      </div>
    </div>
  </div>

  <footer>
    <button type="button" class="action-button secondary" disabled={exporting} onclick={() => void copyPage()}>
      {$t("results.export.copyPage")}
    </button>
    <span class="spacer"></span>
    <button type="button" class="action-button secondary" disabled={exporting} onclick={close}>{$t("common.cancel")}</button>
    <button type="button" class="action-button primary" disabled={exporting} onclick={() => void exportToFile()}>
      {exporting ? $t("results.export.exporting") : $t("results.export.toFile")}
    </button>
  </footer>
</dialog>

<style>
  .export-dialog {
    width: min(58rem, calc(100vw - 2rem));
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

  .export-dialog[open] {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    animation: dialog-in 180ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }

  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: translateY(4px) scale(0.98);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .export-dialog[open] {
      animation: none;
    }
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
    gap: 1.75rem;
    min-height: 0;
  }

  .settings {
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
  }

  h2 {
    margin: 0 0 var(--space-1);
    font-size: var(--font-size-heading);
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--tracking-heading);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .static {
    overflow: hidden;
    color: var(--text-primary);
    font-size: 0.8125rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .formats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .format {
    height: 1.875rem;
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) ease,
      border-color var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .format:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .format.selected {
    border-color: color-mix(in srgb, var(--accent) 70%, var(--border));
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--text-primary);
  }



  .path {
    display: flex;
    gap: 6px;
  }

  .path input {
    min-width: 0;
    flex: 1;
    height: 2rem;
    padding: 0 var(--space-3);
    box-sizing: border-box;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    outline: none;
  }

  .path input:focus {
    border-color: var(--focus-ring);
  }

  .icon-button {
    display: inline-flex;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .icon-button:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .hint {
    margin: 2px 0 0;
    color: color-mix(in srgb, var(--text-secondary) 85%, transparent);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .error {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--danger-solid) 12%, transparent);
    color: var(--danger);
    font-size: 0.8125rem;
    line-height: 1.45;
  }

  .preview {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 6px;
  }

  .code {
    height: min(26rem, 55vh);
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-content);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.78rem;
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
    white-space: pre;
  }

  li::before {
    content: counter(line);
    flex-shrink: 0;
    width: 2.75rem;
    padding-right: var(--space-3);
    box-sizing: border-box;
    color: color-mix(in srgb, var(--text-secondary) 60%, transparent);
    text-align: right;
    -webkit-user-select: none;
    user-select: none;
  }

  .code :global(.s-kw) {
    color: var(--syntax-keyword, var(--text-primary));
  }

  .code :global(.s-str),
  .code :global(.j-str) {
    color: var(--syntax-string, var(--text-primary));
  }

  .code :global(.s-num),
  .code :global(.j-num) {
    color: var(--syntax-number, var(--text-primary));
  }

  .code :global(.j-key) {
    color: var(--syntax-key, var(--text-primary));
  }

  .code :global(.j-lit) {
    color: var(--syntax-constant, var(--text-primary));
  }

  footer {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .spacer {
    flex: 1;
  }

  .format:focus-visible,
  .icon-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
</style>
