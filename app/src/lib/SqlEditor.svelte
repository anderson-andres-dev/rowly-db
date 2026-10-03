<script lang="ts">
  import { Check, ChevronDown, ChevronUp, CircleX } from "@lucide/svelte";
  import { tooltip } from "$lib/tooltip";
  import {
    sqlLexical,
    statementIndex,
    statementsChangedIn,
    statementTextAt,
  } from "$lib/editor/statementIndex";
  import { createAnalysisSession } from "$lib/editor/analysisSession";
  import { createEditorConfiguration } from "$lib/editor/configuration";
  import { createEditorCommands, currentSqlRange } from "$lib/editor/commands";
  import {
    createDiagnosticPopup,
    diagnosticCounter,
    jump,
    serverDiagnostics,
    stopTypingIn,
  } from "$lib/editor/diagnosticPresentation";
  import { buildRoutineIndex, type RoutineIndex } from "$lib/editor/callHints";
  import { parameterHints } from "$lib/sqlParameterHints";
  import { registerConsoleTextFlush } from "$lib/stores/queryConsoles";
  import {
    addDiagnostics,
    sqlDiagnostics,
    type SqlDiagnostic,
  } from "$lib/editor/diagnostics";
  import { standardSql, type SqlProfile } from "$lib/engines";
  import { notifySuccess } from "$lib/stores/notifications";
  import DiagnosticPopup from "$lib/components/DiagnosticPopup.svelte";
  import { onMount, onDestroy, untrack } from "svelte";
  import { get } from "svelte/store";
  import { basicSetup, EditorView } from "codemirror";
  import { selectAll } from "@codemirror/commands";
  import { scrollPastEnd } from "@codemirror/view";
  import { EditorSelection } from "@codemirror/state";
  import { editorPalette, effectiveScheme } from "$lib/theming/theme";
  import { activeEngine, catalogTables, databaseExplorer } from "$lib/stores/connection";
  import {
    buildSqlSchema,
    dialectFor,
    extractDefaultTable,
  } from "$lib/editor/completionSource";
  import { buildCatalogCompletions } from "$lib/editor/catalogCompletions";
  import { commentEditing } from "$lib/editor/commentEditing";
  import { commentStyle } from "$lib/editor/commentStyle";
  import type { CatalogTableRef } from "$lib/sqlDefinitionLink";
  import { shortcuts } from "$lib/stores/shortcuts";
  import { registerCommands } from "$lib/workspace/commands";
  import { editorSettings } from "$lib/stores/editorSettings";
  import { notifyError } from "$lib/stores/notifications";
  import { activeStatementHighlight } from "$lib/editor/behavior";
  import {
    executionMarker,
    executionMarkerField,
    executionPart,
    markerFromResult,
    setPartStatus,
    updateExecutionMarker,
    type ExecutionPart,
  } from "$lib/editor/executionMarker";
  import type { QueryExecutionResult } from "$lib/types";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import type { ContextMenuItem } from "$lib/contextMenu";
  import { writeClipboard as copyToClipboard } from "$lib/clipboard";
  import { normalizePastedSql } from "$lib/editor/paste";
  import "$lib/sqlEditorIcons.css";
  import "$lib/styles/editorSearch.css";
  import { editorSearch, openReplacePanel, toggleSearchPanel } from "$lib/editor/search";
  import { locale, t } from "$lib/i18n";

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
  // Config vigente. schema/dialect/fkIndex cambian poco (catalogo o conexion
  // activa); defaultTable cambia con cada tecla, asi que se separan para no
  // reconstruir el SQLNamespace completo en cada keystroke.
  let sqlSchema: ReturnType<typeof buildSqlSchema> = buildSqlSchema([]);
  let catalogCompletions = buildCatalogCompletions([], standardSql);
  // Sin conexion, el SQL estandar: nunca el de otro motor.
  let engine: SqlProfile = standardSql;
  let routineIndex: RoutineIndex = buildRoutineIndex([]);

  let sqlDialect = dialectFor(engine);
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

  // Portapapeles, formatear y preparar una ejecucion (editor/commands.ts).
  const commands = createEditorCommands({
    view: () => view,
    engine: () => engine,
    formatSettings: () => get(editorSettings),
    text: (key, params) => $t(key, params),
    notifyError,
    writeClipboard: copyToClipboard,
    readClipboard: () => navigator.clipboard.readText(),
  });
  const copySelection = commands.copy;
  const cutSelection = commands.cut;
  const pasteClipboard = commands.paste;
  const selectEverything = commands.selectEverything;
  const formatCurrentSql = commands.format;

  // Ejecuta la seleccion o la sentencia bajo el cursor. Ignorado mientras
  // esta consola ya esta ejecutando (el boton se deshabilita, pero el atajo
  // de teclado no pasa por el DOM del boton) — evita disparar una segunda
  // ejecucion superpuesta desde aqui; Workspace hace la misma comprobacion
  // otra vez del lado del store antes de invocar el backend.
  function executeCurrentSql(): boolean {
    if (!view || executing) return true;
    const range = currentSqlRange(view.state);
    return range ? executeRange(range) : true;
  }

  // "Ejecutar todo": el documento entero, como script (Workspace lo divide
  // en sentencias).
  function executeAllSql(): boolean {
    if (!view || executing) return true;
    return executeRange({ from: 0, to: view.state.doc.length });
  }

  function executeRange(range: { from: number; to: number }): boolean {
    const sql = commands.execute(range);
    if (sql === null) return true;
    awaitingResult = { result };
    onexecute?.(sql);
    return true;
  }

  // Comandos del editor (lib/workspace/commands.ts); la tecla la pone keybindings.ts,
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
    "next-diagnostic": whenFocused((current) => jumpTo(current, 1)),
    "previous-diagnostic": whenFocused((current) => jumpTo(current, -1)),
    "diagnostic-details": whenFocused((current) => details.showDetails(current)),
    "apply-quick-fix": whenFocused((current) => details.applyFirstFix(current)),
  });

  // Los Compartment de cada ajuste (editor/configuration.ts).
  const configuration = createEditorConfiguration({
    language: () => ({
      engine,
      dialect: sqlDialect,
      schema: sqlSchema,
      catalogCompletions,
      defaultTable,
      routines: routineIndex,
    }),
    settings: () => get(editorSettings),
    onOpenTable: (ref) => onopentabledefinition?.(ref),
  });

  function reconfigureCompletion() {
    view?.dispatch({ effects: configuration.completion() });
  }

  // Para el comando find con el editor como zona activa (Workspace).
  export function toggleSearch() {
    if (view) toggleSearchPanel(view);
  }

  // Para el comando replace (Ctrl+R): buscar y reemplazar, separado de find.
  export function toggleReplace() {
    if (view) openReplacePanel(view);
  }

  // Un error de la base, ubicado en la sentencia [from, to) que lo produjo
  // (editor/diagnosticPresentation.ts).
  function diagnosticFor(from: number, to: number, result: QueryExecutionResult): SqlDiagnostic[] {
    if (!view) return [];
    return serverDiagnostics(view.state.sliceDoc(from, to), from, result, engine, (key, params) => $t(key, params));
  }

  // --- Analisis mientras se escribe (editor/analysisSession.ts) -------------
  const analysis = createAnalysisSession({ view: () => view, text: (key, params) => $t(key, params) });

  // --- Ventana de detalle (editor/diagnosticPresentation.ts) ---------------
  const details = createDiagnosticPopup(() => view);
  const popup = details.state;

  // --- Contador de errores (abajo a la derecha) ---------------------------
  // Flota sobre el texto sin tapar las barras de scroll. Los mismos errores
  // que recorre F2.
  let diagnosticCount = $state(0);
  // La version del servidor y su estado, como los dio el backend al conectar
  // (ConnectionEngineContext). Sin soporte del fabricante: una etiqueta junto
  // a la version, sin mas.
  const serverContext = $derived($databaseExplorer?.context ?? null);
  let scrollbarWidth = $state(0);
  let scrollbarHeight = $state(0);
  // El fondo del editor (cambia con el tema): el contador lo toma para leerse
  // sobre una linea larga.
  let editorBackground = $state("");

  function shortcutKeys(id: string): string {
    return $shortcuts.find((shortcut) => shortcut.id === id)?.keys ?? "";
  }

  function goToDiagnostic(direction: 1 | -1) {
    if (!view) return;
    jumpTo(view, direction);
    view.focus();
  }

  // F2 sin errores: un aviso breve en vez de no hacer nada.
  const jumpTo = (current: EditorView, direction: 1 | -1) =>
    jump(current, direction, () => notifySuccess($t("editor.diagnostics.noErrors")));

  // Una vez por cuadro: el numero, y el lugar que dejan las barras de scroll.
  const counter = diagnosticCounter((count, current) => {
    diagnosticCount = count;
    scrollbarWidth = current.scrollDOM.offsetWidth - current.scrollDOM.clientWidth;
    scrollbarHeight = current.scrollDOM.offsetHeight - current.scrollDOM.clientHeight;
    editorBackground = getComputedStyle(current.dom).backgroundColor;
  });

  function executionStatus(part: ExecutionPart) {
    return { status: part.status, executionTimeMs: part.executionTimeMs, message: part.message };
  }

  // Script en curso lanzado desde este editor: la sentencia `index` empieza
  // a correr o termina. Sin script pendiente (p. ej. se ejecuto desde el
  // historial), no hace nada.
  export function markStatement(index: number, outcome: "running" | QueryExecutionResult) {
    if (!view || !awaitingResult) return;
    const part = executionPart(view.state, index);
    if (!part) return;
    const next =
      outcome === "running" ? { status: "running" as const } : executionStatus(markerFromResult(part.from, part.to, outcome));
    view.dispatch({
      effects: [
        setPartStatus.of({ index, part: next }),
        addDiagnostics.of(outcome === "running" ? [] : diagnosticFor(part.from, part.to, outcome)),
      ],
    });
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

  // El texto sale hacia `value`/onchange con un retraso, no en cada tecla:
  // convertir un documento de 30 MB a string cuesta ~100 ms. Antes de
  // guardar o cerrar, el store pide el texto ya (flushConsoleTexts).
  // Con documentos grandes la pausa es mas larga: la conversion se notaria
  // al escribir despacio.
  const TEXT_FLUSH_DELAY_MS = 300;
  const LARGE_TEXT_FLUSH_DELAY_MS = 1500;
  const LARGE_DOCUMENT = 1024 * 1024;
  // Px libres que se dejan bajo el cursor al desplazar: lo que ocupa el popup.
  const CURSOR_BOTTOM_MARGIN = 200;
  let textFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let textDirty = false;

  function scheduleTextFlush() {
    textDirty = true;
    if (textFlushTimer) clearTimeout(textFlushTimer);
    const large = (view?.state.doc.length ?? 0) > LARGE_DOCUMENT;
    textFlushTimer = setTimeout(flushText, large ? LARGE_TEXT_FLUSH_DELAY_MS : TEXT_FLUSH_DELAY_MS);
  }

  function flushText() {
    if (textFlushTimer) clearTimeout(textFlushTimer);
    textFlushTimer = null;
    if (!view || !textDirty) return;
    textDirty = false;
    value = view.state.doc.toString();
    onchange?.(value);
  }

  const unregisterTextFlush = registerConsoleTextFlush(flushText);

  onMount(() => {
    const configured = configuration.initial(get(editorPalette), get(effectiveScheme));
    view = new EditorView({
      doc: value,
      parent: container,
      extensions: [
        basicSetup,
        // Buscar (Ctrl+F) y reemplazar (Ctrl+R) propios en vez del panel
        // por defecto de basicSetup.
        editorSearch(),
        configured.language,
        configured.completion,
        configured.definitionLink,
        configured.tabCompletion,
        // /* se cierra solo (editor/commentEditing.ts) y la jerarquia dentro de
        // los comentarios (editor/commentStyle.ts).
        commentEditing,
        commentStyle,
        configured.indentation,
        configured.lexical,
        // Pegar y arrastrar: sin los espacios invisibles de otras apps, segun
        // como escribe el SQL el motor de la conexion (editor/paste.ts).
        EditorView.clipboardInputFilter.of((text, state) => normalizePastedSql(text, state.facet(sqlLexical))),
        // Aire bajo la ultima linea: se puede desplazar mas alla del final y
        // el cursor no se queda pegado al borde, asi el popup de sugerencias
        // cabe debajo de lo que se escribe.
        scrollPastEnd(),
        EditorView.scrollMargins.of(() => ({ bottom: CURSOR_BOTTOM_MARGIN })),
        statementIndex,
        configured.hints,
        parameterHints,
        activeStatementHighlight,
        executionMarker,
        sqlDiagnostics,
        counter.extension,
        details.hover,
        // Al salir del editor, el texto al dia (la pestaña marca cambios).
        EditorView.domEventHandlers({
          blur(_event, current) {
            flushText();
            // Al salir del editor se ven tambien los errores de lo que se
            // estaba escribiendo.
            stopTypingIn(current);
            return false;
          },
        }),
        configured.behavior,
        configured.theme,
        configured.phrases,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          for (const transaction of update.transactions) {
            if (transaction.docChanged) analysis.noteChanges(transaction.changes, statementsChangedIn(transaction.state));
          }
          analysis.schedule();
          scheduleTextFlush();
          if (get(popup)) details.close(false);

          // completeFromSchema (la libreria) no distingue clausulas SQL: sin
          // "alias." de por medio, siempre sugiere tablas, sea que estes
          // despues de FROM o de WHERE. Detectar la tabla del FROM actual y
          // pasarla como defaultTable hace que sus columnas tambien aparezcan
          // sin calificar (ver comentario largo en editor/completionSource.ts). Solo con el
          // texto de la sentencia actual.
          const head = update.state.selection.main.head;
          const current = statementTextAt(update.state, head);
          const nextDefaultTable = extractDefaultTable(current.text, current.offset);
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
      view.dispatch({
        effects: [
          updateExecutionMarker.of(executionStatus(markerFromResult(marker.from, marker.to, current))),
          // En un script, el error ya lo puso markStatement en su sentencia.
          addDiagnostics.of(!marker.parts ? diagnosticFor(marker.from, marker.to, current) : []),
        ],
      });
      return;
    }

    const status = isExecuting ? "running" : "pending";
    if (marker.status !== status) view.dispatch({ effects: updateExecutionMarker.of({ ...executionStatus(marker), status }) });
  });

  $effect(() => {
    const palette = $editorPalette;
    const scheme = $effectiveScheme;
    if (!view) return;
    view.dispatch({ effects: configuration.theme(palette, scheme) });
  });

  // Al cambiar el idioma: frases de CodeMirror y detalles del autocompletado
  // (se traducen al armar la fuente). El dispatch tambien hace que el gutter
  // vuelva a pintar el marcador de ejecucion con su texto nuevo.
  $effect(() => {
    $locale;
    if (!view) return;
    view.dispatch({ effects: configuration.phrases() });
    reconfigureCompletion();
    // Los mensajes del analisis, en el idioma nuevo (de la cache: sin llamar
    // al backend).
    analysis.retranslate();
  });

  $effect(() => {
    const autoUppercase = $editorSettings.autoUppercaseKeywords;
    if (!view) return;
    view.dispatch({ effects: configuration.behavior(autoUppercase) });
  });

  $effect(() => {
    $editorSettings.tableAliases;
    untrack(reconfigureCompletion);
  });

  $effect(() => {
    const tabNavigatesCompletion = $editorSettings.tabNavigatesCompletion;
    if (!view) return;
    view.dispatch({ effects: configuration.tabCompletion(tabNavigatesCompletion) });
  });

  $effect(() => {
    const { indentStyle, indentSize } = $editorSettings;
    if (!view) return;
    view.dispatch({ effects: configuration.indentation(indentStyle, indentSize) });
  });

  // Reconfigura schema/dialecto/FK cuando cambia el catalogo o la conexion
  // activa (ver arriba para el resto de la reconfiguracion, atada al texto).
  $effect(() => {
    const tables = $catalogTables;
    // El schema de la conexion (search_path en Postgres, la base elegida en
    // MySQL): sus tablas van sin prefijo.
    const defaultSchema = $databaseExplorer?.defaultSchema;

    // El motor y el modo de la conexion, como los dio el backend.
    const nextEngine = $activeEngine ?? standardSql;
    sqlSchema = buildSqlSchema(tables, {
      defaultSchema, engine: nextEngine,
      explorerSchemas: $databaseExplorer?.schemas ?? [],
      availableSchemas: $databaseExplorer?.availableSchemas ?? [],
    });
    // Otro motor: el indice de sentencias vuelve a cortar con sus reglas.
    if (view && nextEngine.lexical !== engine.lexical) {
      view.dispatch({ effects: configuration.lexical(nextEngine) });
    }
    engine = nextEngine;
    catalogCompletions = buildCatalogCompletions($databaseExplorer?.schemas ?? [], engine, defaultSchema);
    sqlDialect = dialectFor(engine);
    // Las rutinas (y el motor) de los hints de parametros.
    routineIndex = buildRoutineIndex($databaseExplorer?.schemas ?? [], defaultSchema);
    view?.dispatch({ effects: configuration.hints() });
    reconfigureCompletion();
    // Otro catalogo o dialecto: los nombres se vuelven a revisar (el efecto
    // tambien corre con otros cambios de la conexion; ahi no hace falta).
    analysis.setContext($databaseExplorer?.context ?? null, engine);
  });

  onDestroy(() => {
    counter.destroy();
    flushText();
    unregisterTextFlush();
    unregisterCommands();
    analysis.destroy();
    details.destroy();
    view?.destroy();
  });
</script>

<div class="editor-frame">
  <div
    class="sql-editor"
    role="group"
    aria-label={$t("editor.label")}
    bind:this={container}
    oncontextmenu={openContextMenu}
  ></div>
  <div
    class="problems"
    class:clean={diagnosticCount === 0}
    style:bottom={`${scrollbarHeight + 6}px`}
    style:right={`${scrollbarWidth + 10}px`}
    style:--problems-background={editorBackground || undefined}
  >
    {#if serverContext}
      {@const support = serverContext.support}
      <span
        class="server-version"
        use:tooltip={{
          label:
            serverContext.verification === "unverified" && serverContext.line
              ? $t("editor.serverUnverified", { line: serverContext.line })
              : $t("editor.serverVersion"),
          placement: "above",
        }}
      >
        {serverContext.server.label}
      </span>
      {#if support?.status === "unsupported" && support.eol}
        <span
          class="server-unsupported"
          use:tooltip={{
            label: $t("editor.serverUnsupportedHint", {
              version: serverContext.server.label,
              date: new Intl.DateTimeFormat($locale, { month: "long", year: "numeric" }).format(new Date(`${support.eol}T12:00:00Z`)),
            }),
            placement: "above",
          }}
        >
          {$t("editor.serverUnsupported")}
        </span>
      {/if}
    {/if}
    {#if diagnosticCount > 0}
      <span
        class="problems-count"
        role="status"
        use:tooltip={{
          label: $t(diagnosticCount === 1 ? "editor.diagnostics.countOne" : "editor.diagnostics.countOther", {
            count: diagnosticCount,
          }),
          placement: "above",
        }}
      >
        <CircleX size={13} aria-hidden="true" />
        {diagnosticCount}
        <span class="visually-hidden">
          {$t(diagnosticCount === 1 ? "editor.diagnostics.countOne" : "editor.diagnostics.countOther", {
            count: diagnosticCount,
          })}
        </span>
      </span>
      <button
        class="problems-nav"
        type="button"
        aria-label={$t("shortcuts.previous-diagnostic.label")}
        use:tooltip={{ label: $t("shortcuts.previous-diagnostic.label"), shortcut: shortcutKeys("previous-diagnostic"), placement: "above" }}
        onclick={() => goToDiagnostic(-1)}
      >
        <ChevronUp size={14} aria-hidden="true" />
      </button>
      <button
        class="problems-nav"
        type="button"
        aria-label={$t("shortcuts.next-diagnostic.label")}
        use:tooltip={{ label: $t("shortcuts.next-diagnostic.label"), shortcut: shortcutKeys("next-diagnostic"), placement: "above" }}
        onclick={() => goToDiagnostic(1)}
      >
        <ChevronDown size={14} aria-hidden="true" />
      </button>
    {:else}
      <span class="problems-count" role="status" use:tooltip={{ label: $t("editor.diagnostics.noErrors"), placement: "above" }}>
        <Check size={13} aria-hidden="true" />
        <span class="visually-hidden">{$t("editor.diagnostics.noErrors")}</span>
      </span>
    {/if}
  </div>
</div>

{#if $popup}
  <DiagnosticPopup
    diagnostic={$popup.diagnostic}
    anchor={$popup.anchor}
    focused={$popup.focused}
    onapply={details.applyFix}
    onclose={details.close}
    onpointerenter={details.cancelHoverClose}
    onpointerleave={details.scheduleHoverClose}
  />
{/if}

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={contextMenuItems}
    onclose={() => (contextMenu = null)}
  />
{/if}

<style>
  .editor-frame {
    position: relative;
    height: 100%;
  }

  .sql-editor {
    text-align: left;
    height: 100%;
  }

  /* Flota sobre el texto: fondo del editor para leerse sobre una linea
     larga, y apenas visible hasta que se lo mira. */
  .problems {
    position: absolute;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 1px 2px 1px 6px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--problems-background, var(--surface-content)) 88%, transparent);
    color: var(--danger);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .problems.clean {
    padding-right: 6px;
    color: var(--success);
  }

  .problems.clean .problems-count {
    opacity: 0.7;
  }

  /* La version del servidor, discreta: no compite con el contador. */
  .server-version {
    margin-right: 6px;
    color: var(--text-secondary);
    opacity: 0.75;
    font-size: 0.6875rem;
  }

  .server-unsupported {
    margin-right: 6px;
    padding: 0 5px;
    border: 1px solid color-mix(in srgb, var(--warning) 45%, transparent);
    border-radius: var(--radius-sm);
    color: var(--warning);
    font-size: 0.625rem;
    line-height: 1.4;
  }

  .problems-count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 2px;
  }

  .problems-nav {
    display: inline-flex;
    width: 1.25rem;
    height: 1.25rem;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .problems-nav:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .problems-nav:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .sql-editor :global(.cm-editor) {
    height: 100%;
    font-size: 14px;
  }
</style>
