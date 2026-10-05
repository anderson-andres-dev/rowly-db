<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { EditorView } from "codemirror";
  import { drawSelection, keymap } from "@codemirror/view";
  import { selectAll } from "@codemirror/commands";
  import { EditorState } from "@codemirror/state";
  import { sql } from "@codemirror/lang-sql";
  import { activeEngine } from "$lib/stores/connection";
  import { standardSql } from "$lib/engines";
  import { Check, Copy, X } from "@lucide/svelte";
  import { tooltip } from "$lib/tooltip";
  import { writeClipboardText } from "$lib/results/gridClipboard";
  import { t } from "$lib/i18n";
  import { fetchTableDefinition } from "$lib/tableDefinition";
  import { alignColumnDefinitions } from "$lib/editor/formatLayout";
  import { editorSettings } from "$lib/stores/editorSettings";
  import { buildCmTheme } from "$lib/theming/codemirrorTheme";
  import { editorPalette, effectiveScheme } from "$lib/theming/theme";

  let {
    dataSource,
    schema,
    table,
    onclose,
  }: {
    dataSource: string;
    schema: string;
    table: string;
    onclose: () => void;
  } = $props();

  let dialogEl = $state<HTMLDialogElement>();
  let ddlContainer = $state<HTMLDivElement>();
  let ddlView: EditorView | undefined;
  let status = $state<"loading" | "ok" | "error">("loading");
  let ddl = $state("");
  let errorMessage = $state("");

  onMount(() => {
    dialogEl?.showModal();
    dialogEl?.querySelector<HTMLButtonElement>(".dialog-close:not(:disabled)")?.focus();
    void load();
    return () => ddlView?.destroy();
  });

  // MySQL cita CADA identificador entre backticks ("`oltd_codi`"), que es
  // correcto pero se lee ruidoso para una vista de solo lectura - DataGrip
  // tampoco los muestra en su popup de estructura. Postgres nunca los usa,
  // asi que esto no le hace nada.
  function cleanDdl(raw: string): string {
    return raw.replace(/`/g, "");
  }

  // Lo que se ve (y se copia): con "Alineacion en columnas" (Ajustes >
  // Editor), nombre, tipo y restricciones de cada columna en columnas.
  const shownDdl = $derived.by(() => {
    const clean = cleanDdl(ddl);
    return $editorSettings.formatterAlignColumns ? alignColumnDefinitions(clean) : clean;
  });

  // ddlContainer solo existe una vez que Svelte pinta la rama {:else} (tras
  // status pasar a "ok"); un effect que dependa de los dos re-corre apenas
  // el contenedor aparece, en vez de intentar montar el editor antes de que
  // el div exista en el DOM.
  $effect(() => {
    if (status !== "ok" || !ddlContainer) return;
    const doc = shownDdl;
    ddlView?.destroy();
    ddlView = new EditorView({
      doc,
      parent: ddlContainer,
      extensions: [
        // Solo lectura pero enfocable: CodeMirror solo pinta las lineas a la
        // vista, asi que la seleccion y la copia tienen que ser las suyas
        // (sobre el documento entero), no las nativas del navegador.
        EditorState.readOnly.of(true),
        drawSelection(),
        keymap.of([{ key: "Mod-a", run: selectAll }]),
        sql({ dialect: (get(activeEngine) ?? standardSql).editorDialect }),
        buildCmTheme(get(editorPalette), get(effectiveScheme)),
      ],
    });
  });

  // Ctrl+A selecciona todo el SQL, no el texto del dialogo, aunque el foco
  // este fuera del editor (en el boton de cerrar, por ejemplo). Dentro del
  // editor lo resuelve su keymap; despues, Ctrl+C copia todo.
  function onKeydown(event: KeyboardEvent) {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || event.altKey || event.shiftKey || event.key.toLowerCase() !== "a" || !ddlView) return;
    if (ddlView.dom.contains(event.target as Node)) return;
    event.preventDefault();
    ddlView.focus();
    selectAll(ddlView);
  }

  // Copia el CREATE completo, tal como se ve; el icono pasa a un check un
  // momento.
  let copied = $state(false);
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;

  async function copyDdl() {
    if (status !== "ok" || !(await writeClipboardText(shownDdl))) return;
    copied = true;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => (copied = false), 1500);
  }

  async function load() {
    status = "loading";
    const result = await fetchTableDefinition(schema, table);
    if (result.ok) {
      ddl = result.ddl;
      status = "ok";
    } else {
      errorMessage = result.message;
      status = "error";
    }
  }
</script>

<dialog
  class="table-definition-modal"
  bind:this={dialogEl}
  onclose={onclose}
  onkeydown={onKeydown}
  oncancel={(event) => {
    event.preventDefault();
    dialogEl?.close();
  }}
>
  <div class="dialog-heading" data-dialog-actions>
    <h2>{table}</h2>
    <button
      type="button"
      class="dialog-close copy"
      disabled={status !== "ok"}
      aria-label={$t("workspace.definition.copy")}
      use:tooltip={$t(copied ? "workspace.definition.copied" : "workspace.definition.copy")}
      onclick={() => void copyDdl()}
    >
      {#if copied}<Check size={15} aria-hidden="true" />{:else}<Copy size={15} aria-hidden="true" />{/if}
    </button>
    <button type="button" class="dialog-close" aria-label={$t("common.close")} onclick={() => dialogEl?.close()}>
      <X size={15} aria-hidden="true" />
    </button>
  </div>
  <dl class="meta">
    <div class="meta-row">
      <dt>{$t("workspace.definition.dataSource")}</dt>
      <dd>{dataSource}</dd>
    </div>
    <div class="meta-row">
      <dt>{$t("workspace.definition.schema")}</dt>
      <dd>{schema}</dd>
    </div>
    <div class="meta-row">
      <dt>{$t("workspace.definition.table")}</dt>
      <dd>{table}</dd>
    </div>
  </dl>
  <div class="ddl-region">
    {#if status === "loading"}
      <p class="placeholder">{$t("workspace.definition.loading")}</p>
    {:else if status === "error"}
      <p class="error">{errorMessage}</p>
    {:else}
      <div class="ddl" bind:this={ddlContainer}></div>
    {/if}
  </div>
</dialog>

<style>
  /* Centrado en ambos ejes gratis: la hoja de estilos por defecto de
     <dialog> ya pone inset:0 + margin:auto cuando se abre con showModal();
     tokens.css solo le suma transiciones de entrada/salida, no toca
     posicion, asi que no hace falta reimplementar el centrado a mano. */
  .table-definition-modal {
    display: flex;
    width: min(38rem, calc(100vw - 2rem));
    max-height: min(32rem, calc(100vh - 4rem));
    flex-direction: column;
    padding: var(--space-5);
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    color: var(--text-primary);
  }

  .dialog-heading {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  h2 {
    margin: 0;
    overflow: hidden;
    font-size: var(--font-size-heading);
    font-weight: var(--font-weight-heading);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dialog-close {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  /* Copiar va a la derecha, antes de cerrar. */
  .dialog-close.copy {
    margin-left: auto;
  }

  .dialog-close:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .dialog-close:hover:not(:disabled) {
    background: var(--surface);
    color: var(--text-primary);
  }

  .dialog-close:focus {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .meta {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 2px;
    margin: var(--space-4) 0 0;
    font-size: 0.8125rem;
  }

  .meta-row {
    display: flex;
    gap: var(--space-2);
  }

  .meta dt {
    flex-shrink: 0;
    width: 7rem;
    color: var(--text-secondary);
  }

  .meta dd {
    margin: 0;
    overflow: hidden;
    color: var(--text-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Sin ajuste de linea: el CREATE se lee como lo formatea el motor y el
     desplazamiento (vertical y horizontal) es el del editor, con sus barras
     propias (codemirrorTheme.ts). */
  .ddl-region {
    display: flex;
    min-height: 0;
    margin-top: var(--space-4);
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-content);
  }

  .placeholder,
  .error {
    margin: 0;
    padding: var(--space-3);
    font-size: 0.8125rem;
  }

  .placeholder {
    color: var(--text-secondary);
  }

  .error {
    color: var(--danger);
  }

  .ddl {
    min-height: 0;
  }

  .ddl {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex: 1;
  }

  .ddl :global(.cm-editor) {
    min-width: 0;
    min-height: 0;
    flex: 1;
    font-size: 0.8125rem;
  }

  .ddl :global(.cm-scroller) {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace;
    line-height: 1.5;
  }

  .ddl :global(.cm-content) {
    padding: var(--space-3);
  }

  .ddl :global(.cm-gutters) {
    display: none;
  }
</style>
