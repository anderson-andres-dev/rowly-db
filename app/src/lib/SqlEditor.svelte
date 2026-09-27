<script lang="ts">
  import { splitStatements, statementAt } from "$lib/sqlStatements";
  import {
    addDiagnostics,
    applyQuickFix,
    clearDiagnosticsIn,
    diagnosticAt,
    errorRange,
    jumpToDiagnostic,
    lineColumnToOffset,
    setAnalysis,
    sqlDiagnostics,
    visibleDiagnostics,
    type QuickFix,
    type SqlDiagnostic,
  } from "$lib/sqlDiagnostics";
  import { errorHelp, groupByFixes } from "$lib/sqlErrorHelp";
  import { backendText, invoke, type BackendMessage } from "$lib/backend";
  import { notifySuccess } from "$lib/stores/notifications";
  import DiagnosticPopup from "$lib/components/DiagnosticPopup.svelte";
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
    // Varias sentencias: el Workspace las corre como script y va marcando
    // cada una (markStatement), con su icono y su tiempo.
    const statements = splitStatements(raw);
    const parts =
      statements.length > 1
        ? statements.map((part) => ({ from: range.from + part.from, to: range.from + part.to, status: "pending" as const }))
        : undefined;
    view.dispatch({
      effects: [
        setExecutionMarker.of({ from, to: from + sql.length, status: "pending", parts }),
        // Volver a ejecutar la sentencia quita sus errores anteriores.
        clearDiagnosticsIn.of({ from, to: from + sql.length }),
      ],
    });
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
    "next-diagnostic": whenFocused((current) => jump(current, 1)),
    "previous-diagnostic": whenFocused((current) => jump(current, -1)),
    "diagnostic-details": whenFocused(showDetails),
    "apply-quick-fix": whenFocused(applyFirstFix),
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

  // Un error de la base, ubicado en la sentencia [from, to) que lo produjo
  // (sqlDiagnostics.ts). Sin pista de donde, la sentencia entera.
  function diagnosticFor(from: number, to: number, result: QueryExecutionResult): SqlDiagnostic[] {
    if (!view || result.type !== "error") return [];
    const statement = view.state.sliceDoc(from, to);
    const located = errorRange(statement, result);
    const range = located ?? { from: 0, to: statement.length };
    // Columna fuera del GROUP BY: sumarla o agregarla (solo si se sabe cual).
    const fixes =
      located && errorHelp(result.code) === "groupBy"
        ? groupByFixes(statement, range).map((fix) => ({
            label: $t(fix.kind === "aggregate" ? "editor.diagnostics.fix.aggregate" : "editor.diagnostics.fix.groupBy", {
              column: fix.column,
            }),
            from: from + fix.from,
            to: from + fix.to,
            insert: fix.insert,
          }))
        : [];
    return [
      {
        from: from + range.from,
        to: from + range.to,
        message: result.message,
        code: result.code,
        source: "server",
        fixes,
      },
    ];
  }

  // --- Analisis mientras se escribe (analyze_sql) ---------------------------
  // 700 ms despues de la ultima tecla: se divide en sentencias y el backend
  // revisa sintaxis y nombres contra el catalogo, sin tocar la base. Si el
  // texto cambio mientras tanto, la respuesta se descarta.
  interface AnalysisPosition {
    line: number;
    column: number;
  }
  interface AnalysisDiagnostic {
    start: AnalysisPosition;
    end: AnalysisPosition;
    message: BackendMessage;
    suggestions?: { start: AnalysisPosition; end: AnalysisPosition; replacement: string }[];
  }

  const ANALYSIS_DELAY_MS = 700;
  // Con documentos enormes, solo las sentencias alrededor del cursor.
  const MAX_ANALYZED_STATEMENTS = 300;
  let analysisTimer: ReturnType<typeof setTimeout> | null = null;
  let analysisRun = 0;

  function scheduleAnalysis() {
    if (analysisTimer) clearTimeout(analysisTimer);
    analysisTimer = setTimeout(() => void runAnalysis(), ANALYSIS_DELAY_MS);
  }

  async function runAnalysis() {
    analysisTimer = null;
    if (!view) return;
    const doc = view.state.doc;
    const text = doc.toString();
    let ranges = splitStatements(text);
    if (ranges.length > MAX_ANALYZED_STATEMENTS) {
      const head = view.state.selection.main.head;
      const around = Math.max(0, ranges.findIndex((range) => range.to >= head));
      const start = Math.max(0, around - MAX_ANALYZED_STATEMENTS / 2);
      ranges = ranges.slice(start, start + MAX_ANALYZED_STATEMENTS);
    }
    const run = ++analysisRun;
    let found: AnalysisDiagnostic[][];
    try {
      found = await invoke<AnalysisDiagnostic[][]>("analyze_sql", {
        statements: ranges.map((range) => text.slice(range.from, range.to)),
      });
    } catch {
      return;
    }
    if (!view || run !== analysisRun || view.state.doc !== doc || !Array.isArray(found)) return;

    const list: SqlDiagnostic[] = [];
    ranges.forEach((range, index) => {
      const statement = text.slice(range.from, range.to);
      const at = (position: AnalysisPosition) =>
        range.from + lineColumnToOffset(statement, position.line, position.column);
      for (const item of found[index] ?? []) {
        const from = at(item.start);
        const to = Math.max(from + 1, at(item.end));
        const message = backendText(item.message);
        const suggestions = item.suggestions ?? [];
        const key = typeof item.message === "object" ? item.message.key : "";
        // "¿Quisiste decir…?" al final, salvo que el mensaje ya lo diga.
        const hint =
          suggestions[0] && suggestions[0].replacement && !["diagnostic.didYouMean", "diagnostic.trailingComma"].includes(key)
            ? ` ${$t("editor.diagnostics.didYouMean", { name: suggestions[0].replacement })}`
            : "";
        const fixes: QuickFix[] = suggestions.map((suggestion) => ({
          label: suggestion.replacement
            ? $t("editor.diagnostics.fix.replace", { text: suggestion.replacement })
            : $t("editor.diagnostics.fix.delete"),
          from: at(suggestion.start),
          to: at(suggestion.end),
          insert: suggestion.replacement,
        }));
        list.push({ from, to, message: message + hint, source: "analysis", fixes });
      }
    });
    view.dispatch({ effects: setAnalysis.of(list) });
  }

  // --- Ventana de detalle ------------------------------------------------
  let popup = $state<{
    diagnostic: SqlDiagnostic;
    anchor: { left: number; top: number; bottom: number };
    focused: boolean;
  } | null>(null);
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  function openPopup(diagnostic: SqlDiagnostic, focused: boolean) {
    if (!view) return;
    const coords = view.coordsAtPos(diagnostic.from);
    if (!coords) return;
    // Debajo de las filas con la flecha, si estan abiertas: no las tapa.
    let bottom = coords.bottom;
    for (const block of view.dom.querySelectorAll(".cm-diagnosticBlock")) {
      const rect = block.getBoundingClientRect();
      if (rect.top >= coords.bottom - 2 && rect.top <= coords.bottom + 4) bottom = rect.bottom;
    }
    popup = { diagnostic, anchor: { left: coords.left, top: coords.top, bottom }, focused };
  }

  function closePopup(refocusEditor: boolean) {
    popup = null;
    if (refocusEditor) view?.focus();
  }

  function applyFix(fix: QuickFix) {
    if (!view) return;
    closePopup(false);
    applyQuickFix(view, fix);
  }

  function cancelHoverClose() {
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    hoverCloseTimer = null;
  }

  // Abierta con el mouse: se cierra al salir (con un margen para llegar a
  // la ventana).
  function scheduleHoverClose() {
    cancelHoverClose();
    if (popup && !popup.focused) hoverCloseTimer = setTimeout(() => closePopup(false), 250);
  }

  // Mouse quieto 400 ms sobre un subrayado: su detalle, sin quitarle el foco
  // al editor.
  const diagnosticHover = EditorView.domEventHandlers({
    mousemove(event, current) {
      const pos = current.posAtCoords({ x: event.clientX, y: event.clientY });
      const under =
        pos === null ? null : (visibleDiagnostics(current.state).find((item) => item.from <= pos && pos < item.to) ?? null);
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = null;
      if (!under) {
        scheduleHoverClose();
        return false;
      }
      cancelHoverClose();
      if (popup?.diagnostic === under) return false;
      hoverTimer = setTimeout(() => {
        if (!popup?.focused) openPopup(under, false);
      }, 400);
      return false;
    },
    mouseleave() {
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = null;
      scheduleHoverClose();
      return false;
    },
    keydown() {
      // Cualquier tecla en el editor cierra la que abrio el mouse.
      if (popup && !popup.focused) closePopup(false);
      return false;
    },
  });

  function showDetails(current: EditorView): boolean {
    const diagnostic = diagnosticAt(current.state, current.state.selection.main.head);
    if (!diagnostic) return false;
    openPopup(diagnostic, true);
    return true;
  }

  function applyFirstFix(current: EditorView): boolean {
    const fix = diagnosticAt(current.state, current.state.selection.main.head)?.fixes?.[0];
    if (!fix) return false;
    applyFix(fix);
    return true;
  }

  // F2 sin errores: un aviso breve en vez de no hacer nada.
  function jump(current: EditorView, direction: 1 | -1): boolean {
    if (jumpToDiagnostic(current, direction)) return true;
    notifySuccess($t("editor.diagnostics.noErrors"));
    return true;
  }

  // Script en curso lanzado desde este editor: la sentencia `index` empieza
  // a correr o termina. Sin script pendiente (p. ej. se ejecuto desde el
  // historial), no hace nada.
  export function markStatement(index: number, outcome: "running" | QueryExecutionResult) {
    if (!view || !awaitingResult) return;
    const marker = view.state.field(executionMarkerField);
    const part = marker?.parts?.[index];
    if (!marker?.parts || !part) return;
    const next = outcome === "running" ? { ...part, status: "running" as const } : markerFromResult(part.from, part.to, outcome);
    const parts = marker.parts.map((item, position) => (position === index ? next : item));
    view.dispatch({
      effects: [
        setExecutionMarker.of({ ...marker, parts }),
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
        sqlDiagnostics,
        diagnosticHover,
        behaviorCompartment.of(get(editorSettings).autoUppercaseKeywords ? autoUppercaseSqlKeywords : []),
        themeCompartment.of(buildCmTheme(get(editorPalette), get(effectiveScheme))),
        phrasesCompartment.of(buildPhrases()),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          scheduleAnalysis();
          if (popup) closePopup(false);

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
      view.dispatch({
        effects: [
          setExecutionMarker.of({ ...markerFromResult(marker.from, marker.to, current), parts: marker.parts }),
          // En un script, el error ya lo puso markStatement en su sentencia.
          addDiagnostics.of(!marker.parts ? diagnosticFor(marker.from, marker.to, current) : []),
        ],
      });
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
    // Otro catalogo: los nombres se vuelven a revisar.
    scheduleAnalysis();
  });

  onDestroy(() => {
    unregisterCommands();
    if (analysisTimer) clearTimeout(analysisTimer);
    if (hoverTimer) clearTimeout(hoverTimer);
    cancelHoverClose();
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

{#if popup}
  <DiagnosticPopup
    diagnostic={popup.diagnostic}
    anchor={popup.anchor}
    focused={popup.focused}
    onapply={applyFix}
    onclose={closePopup}
    onpointerenter={cancelHoverClose}
    onpointerleave={scheduleHoverClose}
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
  .sql-editor {
    text-align: left;
    height: 100%;
  }

  .sql-editor :global(.cm-editor) {
    height: 100%;
    font-size: 14px;
  }
</style>
