<script lang="ts">
  import { statementAt } from "$lib/sqlStatements";
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { basicSetup, EditorView } from "codemirror";
  import { sql } from "@codemirror/lang-sql";
  import { autocompletion, moveCompletionSelection } from "@codemirror/autocomplete";
  import { selectAll } from "@codemirror/commands";
  import { keymap } from "@codemirror/view";
  import { Compartment, EditorSelection, EditorState, Prec } from "@codemirror/state";
  import { buildCmTheme } from "$lib/theming/codemirrorTheme";
  import { editorPalette, effectiveScheme } from "$lib/theming/theme";
  import { catalogTables, connection } from "$lib/stores/connection";
  import { connectionProfiles } from "$lib/stores/connectionProfiles";
  import type { ConnectionDriver } from "$lib/connections";
  import {
    buildCompletionSource,
    buildSqlSchema,
    dialectFor,
    extractDefaultTable,
    resolveCatalogTable,
  } from "$lib/sqlSchema";
  import { definitionLinkExtension, type CatalogTableRef } from "$lib/sqlDefinitionLink";
  import { shortcuts } from "$lib/stores/shortcuts";
  import { registerCommands } from "$lib/commands";
  import { editorSettings } from "$lib/stores/editorSettings";
  import { formatSqlBlock } from "$lib/sqlFormatter";
  import { activeStatementHighlight, autoUppercaseSqlKeywords } from "$lib/sqlEditorBehavior";
  import {
    executionMarker,
    executionMarkerField,
    markerFromResult,
    setExecutionMarker,
  } from "$lib/sqlExecutionMarker";
  import type { QueryExecutionResult } from "$lib/types";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import type { ContextMenuItem } from "$lib/contextMenu";
  import { writeClipboard as copyToClipboard } from "$lib/clipboard";
  import "$lib/sqlEditorIcons.css";
  import "$lib/styles/editorSearch.css";
  import { editorSearch, toggleSearchPanel } from "$lib/editorSearchPanel";
  import { locale, t, translate, type MessageKey } from "$lib/i18n";

  // Frases propias de CodeMirror (plegado, anuncios de lector de pantalla,
  // "ir a linea"...) que se muestran o anuncian en el editor.
  const CODEMIRROR_PHRASES: Record<string, MessageKey> = {
    "Fold line": "editor.cm.foldLine",
    "Unfold line": "editor.cm.unfoldLine",
    "Folded lines": "editor.cm.foldedLines",
    "Unfolded lines": "editor.cm.unfoldedLines",
    to: "editor.cm.to",
    "folded code": "editor.cm.foldedCode",
    unfold: "editor.cm.unfold",
    Completions: "editor.cm.completions",
    "Control character": "editor.cm.controlCharacter",
    "Selection deleted": "editor.cm.selectionDeleted",
    "current match": "editor.cm.currentMatch",
    "on line": "editor.cm.onLine",
    "Go to line": "editor.cm.goToLine",
    go: "editor.cm.go",
    close: "editor.cm.close",
  };

  function buildPhrases() {
    return EditorState.phrases.of(
      Object.fromEntries(Object.entries(CODEMIRROR_PHRASES).map(([phrase, key]) => [phrase, translate(key)])),
    );
  }

  let {
    value = $bindable(""),
    onchange,
    onexecute,
    executing = false,
    result = null,
    onopentabledefinition,
  }: {
    value?: string;
    onchange?: (sql: string) => void;
    onexecute?: (sql: string) => void;
    executing?: boolean;
    result?: QueryExecutionResult | null;
    onopentabledefinition?: (ref: CatalogTableRef) => void;
  } = $props();

  let container: HTMLDivElement;
  let view: EditorView | undefined;
  const themeCompartment = new Compartment();
  const sqlCompartment = new Compartment();
  const completionCompartment = new Compartment();
  const definitionLinkCompartment = new Compartment();
  const behaviorCompartment = new Compartment();
  const tabCompletionCompartment = new Compartment();
  const phrasesCompartment = new Compartment();

  // Config vigente. schema/dialect/fkIndex cambian poco (catalogo o conexion
  // activa); defaultTable cambia con cada tecla, asi que se separan para no
  // reconstruir el SQLNamespace completo en cada keystroke.
  let sqlSchema: ReturnType<typeof buildSqlSchema> = { schema: {}, fkIndex: new Map() };
  let sqlDialect = dialectFor("mysql");
  let driver: ConnectionDriver = "mysql";
  let defaultTable: string | undefined;
  // Ejecucion lanzada desde este editor cuyo resultado todavia no llego:
  // `result` es el que habia al lanzarla, para reconocer cuando cambia (ver
  // el $effect de mas abajo que actualiza el marcador de ejecucion).
  let awaitingResult: { result: QueryExecutionResult | null } | null = null;
  let contextMenu = $state<{ x: number; y: number; hasSelection: boolean } | null>(null);

  const contextMenuItems = $derived.by((): ContextMenuItem[] => [
    { label: $t("editor.menu.cut"), shortcut: "Ctrl+X", disabled: !contextMenu?.hasSelection, action: cutSelection },
    { label: $t("editor.menu.copy"), shortcut: "Ctrl+C", disabled: !contextMenu?.hasSelection, action: copySelection },
    { label: $t("editor.menu.paste"), shortcut: "Ctrl+V", action: pasteClipboard },
    { label: $t("editor.menu.selectAll"), shortcut: "Ctrl+A", separatorBefore: true, action: selectEverything },
    {
      label: $t("editor.menu.format"),
      shortcut: $shortcuts.find((shortcut) => shortcut.id === "format-sql")?.keys,
      separatorBefore: true,
      action: () => {
        formatCurrentSql();
      },
    },
  ]);

  function openContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new Event("khipu:context-menu"));
    view?.focus();
    const selection = view?.state.selection.main;
    contextMenu = {
      x: event.clientX,
      y: event.clientY,
      hasSelection: !!selection && !selection.empty,
    };
  }

  async function writeClipboard(text: string): Promise<boolean> {
    const copied = await copyToClipboard(text);
    view?.focus();
    return copied;
  }

  async function copySelection() {
    if (!view) return;
    const selection = view.state.selection.main;
    if (selection.empty) return;
    await writeClipboard(view.state.sliceDoc(selection.from, selection.to));
  }

  async function cutSelection() {
    if (!view) return;
    const selection = view.state.selection.main;
    if (selection.empty) return;
    const copied = await writeClipboard(view.state.sliceDoc(selection.from, selection.to));
    if (copied) view.dispatch({ changes: { from: selection.from, to: selection.to } });
    view.focus();
  }

  async function pasteClipboard() {
    if (!view) return;
    try {
      const text = await navigator.clipboard.readText();
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    } catch {
      // El permiso del portapapeles puede estar bloqueado por el sistema.
    }
  }

  function selectEverything() {
    if (!view) return;
    selectAll(view);
    view.focus();
  }

  function currentSqlRange(): { from: number; to: number; selected: boolean } | null {
    if (!view) return null;
    const selection = view.state.selection.main;
    if (!selection.empty) return { from: selection.from, to: selection.to, selected: true };

    // Sentencia bajo el cursor (sqlStatements.ts): nunca el documento
    // entero; sin sentencias, nada que ejecutar.
    const range = statementAt(view.state.doc.toString(), selection.head);
    return range ? { ...range, selected: false } : null;
  }

  function mappedCursorOffset(source: string, offset: number, formatted: string): number {
    const significantBeforeCursor = [...source.slice(0, offset)].filter((char) => !/\s/.test(char)).length;
    if (significantBeforeCursor === 0) return 0;

    let seen = 0;
    for (let index = 0; index < formatted.length; index += 1) {
      if (!/\s/.test(formatted[index])) seen += 1;
      if (seen === significantBeforeCursor) return index + 1;
    }
    return formatted.length;
  }

  function formatCurrentSql(): boolean {
    if (!view) return false;
    const range = currentSqlRange();
    if (!range) return false;

    const originalDoc = view.state.doc;
    const source = view.state.sliceDoc(range.from, range.to);
    const originalCursor = view.state.selection.main.head;
    void formatSqlBlock(source, driver, get(editorSettings).formatterLineWidth).then((formatted) => {
      // La primera ejecución carga el formateador bajo demanda. Si el usuario
      // escribió durante esos milisegundos, no se reemplaza una versión vieja.
      if (!view || view.state.doc !== originalDoc) return;
      if (formatted === source) {
        view.focus();
        return;
      }

      const cursorOffset = mappedCursorOffset(source, originalCursor - range.from, formatted);
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: formatted },
        selection: range.selected
          ? EditorSelection.range(range.from, range.from + formatted.length)
          : EditorSelection.cursor(range.from + cursorOffset),
        userEvent: "input.format",
      });
      view.focus();
    });
    return true;
  }

  // Ejecuta la seleccion o la sentencia bajo el cursor. Ignorado mientras
  // esta consola ya esta ejecutando (el boton se deshabilita, pero el atajo
  // de teclado no pasa por el DOM del boton) — evita disparar una segunda
  // ejecucion superpuesta desde aqui; Workspace hace la misma comprobacion
  // otra vez del lado del store antes de invocar el backend.
  function executeCurrentSql(): boolean {
    if (!view || executing) return true;
    const range = currentSqlRange();
    return range ? executeRange(range) : true;
  }

  // "Ejecutar todo": el documento entero, como script (Workspace lo divide
  // en sentencias).
  function executeAllSql(): boolean {
    if (!view || executing) return true;
    return executeRange({ from: 0, to: view.state.doc.length });
  }

  function executeRange(range: { from: number; to: number }): boolean {
    if (!view) return true;
    const raw = view.state.sliceDoc(range.from, range.to);
    const sql = raw.trim();
    if (!sql) return true;

    const from = range.from + (raw.length - raw.trimStart().length);
    view.dispatch({ effects: setExecutionMarker.of({ from, to: from + sql.length, status: "pending" }) });
    awaitingResult = { result };
    onexecute?.(sql);
    return true;
  }

  // Comandos del editor (lib/commands.ts); la tecla la pone keybindings.ts,
  // en captura, antes que los keymaps de CodeMirror (el Mod-a de basicSetup
  // no disparaba de forma confiable en este webview). Solo con el foco en el
  // texto: en la barra de busqueda, Ctrl+A o Ctrl+Enter son de ella.
  function whenFocused(run: (view: EditorView) => boolean) {
    return () => !!view?.hasFocus && run(view);
  }

  const unregisterCommands = registerCommands("editor", {
    "select-all": whenFocused(selectAll),
    "format-sql": whenFocused(formatCurrentSql),
    "execute-query": whenFocused(executeCurrentSql),
    "execute-script": whenFocused(executeAllSql),
  });

  // moveCompletionSelection() es un no-op (devuelve false) si el tooltip de
  // autocompletado no esta abierto, asi que Tab/Shift-Tab caen al
  // comportamiento normal (salir del editor) el resto del tiempo - esto solo
  // intercepta la tecla mientras hay sugerencias visibles.
  function buildTabCompletionKeymap(enabled: boolean) {
    if (!enabled) return [];
    return Prec.highest(
      keymap.of([{ key: "Tab", run: moveCompletionSelection(true), shift: moveCompletionSelection(false) }]),
    );
  }

  function buildDefinitionLink() {
    return definitionLinkExtension({
      resolveTable: (word) => resolveCatalogTable(sqlSchema.schema, sqlSchema.defaultSchema, word),
      onOpen: (ref) => onopentabledefinition?.(ref),
    });
  }

  function reconfigureCompletion() {
    if (!view) return;
    view.dispatch({
      effects: [
        sqlCompartment.reconfigure(sql({ dialect: sqlDialect, upperCaseKeywords: true })),
        completionCompartment.reconfigure(
          autocompletion({
            override: [
              buildCompletionSource({
                dialect: sqlDialect,
                driver,
                schema: sqlSchema.schema,
                defaultSchema: sqlSchema.defaultSchema,
                defaultTable,
                fkIndex: sqlSchema.fkIndex,
              }),
            ],
          }),
        ),
        definitionLinkCompartment.reconfigure(buildDefinitionLink()),
      ],
    });
  }

  // Para el comando find con el editor como zona activa (Workspace).
  export function toggleSearch() {
    if (view) toggleSearchPanel(view);
  }

  // Vuelve al editor con el cursor donde estaba (CodeMirror conserva la
  // seleccion aunque pierda el foco).
  export function focus() {
    view?.focus();
  }

  // Inserta en el cursor (reemplaza la seleccion), p. ej. desde el historial.
  export function insertAtCursor(text: string) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: EditorSelection.cursor(from + text.length),
      scrollIntoView: true,
      userEvent: "input.paste",
    });
    view.focus();
  }

  onMount(() => {
    view = new EditorView({
      doc: value,
      parent: container,
      extensions: [
        basicSetup,
        // Barra de busqueda propia (Ctrl+F toggle) en vez del panel por
        // defecto de basicSetup.
        editorSearch(),
        sqlCompartment.of(sql({ dialect: sqlDialect, upperCaseKeywords: true })),
        completionCompartment.of(autocompletion()),
        definitionLinkCompartment.of(buildDefinitionLink()),
        tabCompletionCompartment.of(buildTabCompletionKeymap(get(editorSettings).tabNavigatesCompletion)),
        activeStatementHighlight,
        executionMarker,
        behaviorCompartment.of(get(editorSettings).autoUppercaseKeywords ? autoUppercaseSqlKeywords : []),
        themeCompartment.of(buildCmTheme(get(editorPalette), get(effectiveScheme))),
        phrasesCompartment.of(buildPhrases()),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;

          value = update.state.doc.toString();
          onchange?.(value);

          // completeFromSchema (la libreria) no distingue clausulas SQL: sin
          // "alias." de por medio, siempre sugiere tablas, sea que estes
          // despues de FROM o de WHERE. Detectar la tabla del FROM actual y
          // pasarla como defaultTable hace que sus columnas tambien aparezcan
          // sin calificar (ver comentario largo en sqlSchema.ts).
          const nextDefaultTable = extractDefaultTable(value, update.state.selection.main.head);
          if (nextDefaultTable !== defaultTable) {
            defaultTable = nextDefaultTable;
            // Reconfigurar el compartment desde dentro del propio
            // updateListener reentraria en el dispatch en curso; se difiere
            // al siguiente microtask.
            queueMicrotask(reconfigureCompletion);
          }
        }),
      ],
    });
  });

  // Sigue la ejecucion lanzada en executeCurrentSql(). Arranca en
  // "pending" (sin icono) y pasa a "running" solo cuando Workspace
  // realmente la inicia: si beginQueryExecution() la descarta (p.ej. hay un
  // guard abierto) no queda un "ejecutando" colgado. Si el guard la frena
  // vuelve a "pending" hasta que se confirme o se lance otra, y cuando llega
  // un resultado nuevo pasa a ok/error con su tiempo.
  $effect(() => {
    const isExecuting = executing;
    const current = result;
    if (!view || !awaitingResult) return;

    const marker = view.state.field(executionMarkerField);
    if (!marker) {
      awaitingResult = null;
      return;
    }

    if (!isExecuting && current && current !== awaitingResult.result) {
      awaitingResult = null;
      view.dispatch({ effects: setExecutionMarker.of(markerFromResult(marker.from, marker.to, current)) });
      return;
    }

    const status = isExecuting ? "running" : "pending";
    if (marker.status !== status) view.dispatch({ effects: setExecutionMarker.of({ ...marker, status }) });
  });

  $effect(() => {
    const palette = $editorPalette;
    const scheme = $effectiveScheme;
    if (!view) return;
    view.dispatch({ effects: themeCompartment.reconfigure(buildCmTheme(palette, scheme)) });
  });

  // Al cambiar el idioma: frases de CodeMirror y detalles del autocompletado
  // (se traducen al armar la fuente). El dispatch tambien hace que el gutter
  // vuelva a pintar el marcador de ejecucion con su texto nuevo.
  $effect(() => {
    $locale;
    if (!view) return;
    view.dispatch({ effects: phrasesCompartment.reconfigure(buildPhrases()) });
    reconfigureCompletion();
  });

  $effect(() => {
    const autoUppercase = $editorSettings.autoUppercaseKeywords;
    if (!view) return;
    view.dispatch({
      effects: behaviorCompartment.reconfigure(autoUppercase ? autoUppercaseSqlKeywords : []),
    });
  });

  $effect(() => {
    const tabNavigatesCompletion = $editorSettings.tabNavigatesCompletion;
    if (!view) return;
    view.dispatch({
      effects: tabCompletionCompartment.reconfigure(buildTabCompletionKeymap(tabNavigatesCompletion)),
    });
  });

  // Reconfigura schema/dialecto/FK cuando cambia el catalogo o la conexion
  // activa (ver arriba para el resto de la reconfiguracion, atada al texto).
  $effect(() => {
    const tables = $catalogTables;
    const profile = $connectionProfiles.find((candidate) => candidate.id === $connection.profileId);

    sqlSchema = buildSqlSchema(tables);
    driver = profile?.driver ?? "mysql";
    sqlDialect = dialectFor(driver);
    reconfigureCompletion();
  });

  onDestroy(() => {
    unregisterCommands();
    view?.destroy();
  });
</script>

<div
  class="sql-editor"
  role="group"
  aria-label={$t("editor.label")}
  bind:this={container}
  oncontextmenu={openContextMenu}
></div>

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={contextMenuItems}
    onclose={() => (contextMenu = null)}
  />
{/if}

<style>
  .sql-editor {
    text-align: left;
    height: 100%;
  }

  .sql-editor :global(.cm-editor) {
    height: 100%;
    font-size: 14px;
  }
</style>
