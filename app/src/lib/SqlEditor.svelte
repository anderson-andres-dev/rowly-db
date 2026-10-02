<script module lang="ts">
  import type { SqlProfile as ModuleSqlProfile } from "$lib/engines";

  // Los resultados del analisis (analyze_sql) por texto de sentencia, para
  // el catalogo y el motor vigentes. Viven fuera del editor: cada pestaña
  // monta su propio editor, y con la cache adentro volver a una pestaña
  // reanalizaba el documento entero en el backend. Otro catalogo u otro
  // motor, cache nueva.
  let sharedAnalysis: {
    profileId: string | null;
    tables: unknown;
    engine: ModuleSqlProfile;
    created: string;
    cache: Map<string, unknown>;
  } | null = null;

  // Por conexion tambien: dos conexiones del mismo motor con el catalogo
  // todavia vacio no comparten resultados. Y por las tablas que crea el
  // documento (`created`): con otras, lo que se dijo de una sentencia cambia.
  function analysisCacheFor<Raw>(
    profileId: string | null,
    tables: unknown,
    engine: ModuleSqlProfile,
    created: string,
  ): Map<string, Raw> {
    if (
      !sharedAnalysis ||
      sharedAnalysis.profileId !== profileId ||
      sharedAnalysis.tables !== tables ||
      sharedAnalysis.engine !== engine ||
      sharedAnalysis.created !== created
    ) {
      sharedAnalysis = { profileId, tables, engine, created, cache: new Map() };
    }
    return sharedAnalysis.cache as Map<string, Raw>;
  }
</script>

<script lang="ts">
  import { Check, ChevronDown, ChevronUp, CircleX } from "@lucide/svelte";
  import { tooltip } from "$lib/tooltip";
  import { splitStatements } from "$lib/sqlStatements";
  import {
    sqlLexical,
    statementIndex,
    statementNear,
    statementsChangedIn,
    statementTextAt,
  } from "$lib/sqlStatementIndex";
  import { AnalysisRunner } from "$lib/sqlAnalysis";
  import { createdTables } from "$lib/sqlCreatedTables";
  import { buildRoutineIndex, type RoutineIndex } from "$lib/sqlCallHints";
  import { parameterHintConfig, parameterHints } from "$lib/sqlParameterHints";
  import { registerConsoleTextFlush } from "$lib/stores/queryConsoles";
  import {
    addDiagnostics,
    applyQuickFix,
    clearDiagnosticsIn,
    diagnosticAt,
    jumpToDiagnostic,
    visibleDiagnosticCount,
    diagnosticsField,
    lineColumnToOffset,
    diagnosticUnder,
    sqlDiagnostics,
    stopTyping,
    type QuickFix,
    type SqlDiagnostic,
  } from "$lib/sqlDiagnostics";
  import { groupByFixes } from "$lib/sqlErrorHelp";
  import { engineFor, standardSql, type SqlProfile } from "$lib/engines";
  import { backendText, invoke, type BackendMessage } from "$lib/backend";
  import { notifySuccess } from "$lib/stores/notifications";
  import DiagnosticPopup from "$lib/components/DiagnosticPopup.svelte";
  import { onMount, onDestroy, untrack } from "svelte";
  import { get } from "svelte/store";
  import { basicSetup, EditorView } from "codemirror";
  import { sql } from "@codemirror/lang-sql";
  import { autocompletion } from "@codemirror/autocomplete";
  import { selectAll } from "@codemirror/commands";
  import { scrollPastEnd } from "@codemirror/view";
  import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
  import { buildCmTheme } from "$lib/theming/codemirrorTheme";
  import { editorPalette, effectiveScheme } from "$lib/theming/theme";
  import { catalogTables, connection, databaseExplorer } from "$lib/stores/connection";
  import { connectionProfiles } from "$lib/stores/connectionProfiles";
  import {
    buildCompletionSource,
    buildSqlSchema,
    dialectFor,
    extractDefaultTable,
    resolveCatalogTable,
  } from "$lib/sqlSchema";
  import { buildCatalogCompletions } from "$lib/sqlCatalogCompletions";
  import { vendorSupport } from "$lib/engines/vendorSupport";
  import { commentEditing } from "$lib/sqlCommentEditing";
  import { definitionLinkExtension, type CatalogTableRef } from "$lib/sqlDefinitionLink";
  import { shortcuts } from "$lib/stores/shortcuts";
  import { registerCommands } from "$lib/commands";
  import { editorSettings } from "$lib/stores/editorSettings";
  import { buildTabCompletionKeymap, indentationExtension } from "$lib/sqlIndentation";
  import { formatSqlText } from "$lib/sqlFormatter";
  import { notifyError } from "$lib/stores/notifications";
  import { activeStatementHighlight, autoUppercaseSqlKeywords } from "$lib/sqlEditorBehavior";
  import {
    executionMarker,
    executionMarkerField,
    executionPart,
    markerFromResult,
    setExecutionMarker,
    setPartStatus,
    updateExecutionMarker,
    type ExecutionPart,
  } from "$lib/sqlExecutionMarker";
  import type { QueryExecutionResult } from "$lib/types";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import type { ContextMenuItem } from "$lib/contextMenu";
  import { writeClipboard as copyToClipboard } from "$lib/clipboard";
  import { normalizePastedSql } from "$lib/sqlPaste";
  import "$lib/sqlEditorIcons.css";
  import "$lib/styles/editorSearch.css";
  import { editorSearch, openReplacePanel, toggleSearchPanel } from "$lib/editorSearchPanel";
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
  // Las comillas y comentarios del motor, para cortar en sentencias.
  const lexicalCompartment = new Compartment();
  // El motor y las rutinas de la conexion, para los hints de parametros.
  const hintsCompartment = new Compartment();
  const completionCompartment = new Compartment();
  const definitionLinkCompartment = new Compartment();
  const behaviorCompartment = new Compartment();
  const tabCompletionCompartment = new Compartment();
  const indentationCompartment = new Compartment();
  const phrasesCompartment = new Compartment();

  // Config vigente. schema/dialect/fkIndex cambian poco (catalogo o conexion
  // activa); defaultTable cambia con cada tecla, asi que se separan para no
  // reconstruir el SQLNamespace completo en cada keystroke.
  let sqlSchema: ReturnType<typeof buildSqlSchema> = buildSqlSchema([]);
  let catalogCompletions = buildCatalogCompletions([], standardSql);
  // Sin conexion, el SQL estandar: nunca el de otro motor.
  let engine: SqlProfile = standardSql;
  let routineIndex: RoutineIndex = buildRoutineIndex([]);

  function hintConfig() {
    return { engine, routines: routineIndex };
  }
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
      // Mismo filtro que Ctrl+V (clipboardInputFilter), que este camino no
      // pasa.
      const text = normalizePastedSql(await navigator.clipboard.readText(), view.state.facet(sqlLexical));
      view.dispatch({ ...view.state.replaceSelection(text), userEvent: "input.paste", scrollIntoView: true });
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

    // Sentencia bajo el cursor (sqlStatementIndex.ts): nunca el documento
    // entero; sin sentencias, nada que ejecutar.
    const range = statementNear(view.state, selection.head);
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
    const settings = get(editorSettings);
    void formatSqlText(source, engine, settings.formatterLineWidth, settings.formatterAlignColumns, settings.indentStyle, settings.indentSize).then((result) => {
      // La primera ejecución carga el formateador bajo demanda. Si el usuario
      // escribió durante esos milisegundos, no se reemplaza una versión vieja.
      if (!view || view.state.doc !== originalDoc) return;
      // Lo que el parser no entiende queda igual y se dice por que (antes no
      // pasaba nada y parecia que el formato no se aplicaba). Con varias
      // consultas, las demas si se formatean.
      const firstLine = view.state.doc.lineAt(range.from).number;
      const failure = result.failures[0];
      if (failure) {
        const line = firstLine + failure.line - 1;
        const params = { token: failure.token ?? "", line, count: result.failures.length, formatted: result.formatted };
        notifyError(
          result.formatted === 0
            ? $t(failure.token ? "editor.format.failedAt" : "editor.format.failed", params)
            : $t(result.failures.length === 1 ? "editor.format.partialOne" : "editor.format.partialOther", params),
        );
        if (result.formatted === 0) return;
      }
      const formatted = result.text;
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
    const statements = splitStatements(raw, engine.lexical);
    if (statements.length === 0) return true;

    const from = range.from + (raw.length - raw.trimStart().length);
    // Varias sentencias: el Workspace las corre como script y va marcando
    // cada una (markStatement), con su icono y su tiempo.
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
                engine,
                schema: sqlSchema.schema,
                defaultSchema: sqlSchema.defaultSchema,
                defaultTable,
                fkIndex: sqlSchema.fkIndex,
                tableIndex: sqlSchema.tableIndex,
                catalogCompletions,
                tableAliases: get(editorSettings).tableAliases,
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

  // Para el comando replace (Ctrl+R): buscar y reemplazar, separado de find.
  export function toggleReplace() {
    if (view) openReplacePanel(view);
  }

  // Un error de la base, ubicado en la sentencia [from, to) que lo produjo
  // (sqlDiagnostics.ts). Sin pista de donde, la sentencia entera.
  function diagnosticFor(from: number, to: number, result: QueryExecutionResult): SqlDiagnostic[] {
    if (!view || result.type !== "error") return [];
    const statement = view.state.sliceDoc(from, to);
    // Donde cayo y que ayuda corresponde: segun los mensajes y codigos del
    // motor (lib/engines).
    const located = engine.locateError(statement, result);
    const range = located ?? { from: 0, to: statement.length };
    const help = result.code ? engine.errorHelp[result.code] : undefined;
    // Columna fuera del GROUP BY: sumarla o agregarla (solo si se sabe cual).
    const fixes =
      located && help === "groupBy"
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
        help,
        unresolved: help === "tableMissing" || help === "columnMissing",
      },
    ];
  }

  // --- Analisis mientras se escribe (analyze_sql) ---------------------------
  // Tras la pausa, el backend revisa sintaxis y nombres contra el catalogo,
  // sin tocar la base: solo lo que cambio, con los resultados guardados por
  // sentencia y el resto del documento en segundo plano (sqlAnalysis.ts).
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

  // Nombres que no existen: se pintan en rojo en vez de subrayarse.
  const UNRESOLVED_KEYS = new Set([
    "diagnostic.unknownTable",
    "diagnostic.unknownColumn",
    "diagnostic.unknownColumnAny",
    "diagnostic.unknownQualifier",
  ]);

  // Lo que falta cerrar mientras se escribe: no es un error todavia.
  const UNFINISHED_KEYS: ReadonlySet<string> = new Set([
    "diagnostic.incomplete",
    "diagnostic.unclosedParen",
    "diagnostic.unclosedCase",
    "diagnostic.unterminatedString",
    "diagnostic.unterminatedIdentifier",
    "diagnostic.unterminatedDollarQuote",
    "diagnostic.unterminatedComment",
  ]);
  // Lo mismo, pero solo si es lo ultimo de la sentencia (`SELECT a,` o
  // `WHERE a =` a medio escribir).
  const UNFINISHED_AT_END_KEYS: ReadonlySet<string> = new Set([
    "diagnostic.trailingComma",
    "diagnostic.extraComma",
    "diagnostic.missingValue",
  ]);

  // Los mensajes genericos de sqlparser ("Expected X, found Y" y los que no
  // traducimos): con la sentencia a medias suele retroceder y senalar un
  // token anterior al que falta (sqlDiagnostics.ts, whileTyping).
  const VAGUE_KEYS: ReadonlySet<string> = new Set([
    "",
    "diagnostic.unexpected",
    "diagnostic.expected",
    "diagnostic.expectedStatement",
    "diagnostic.expectedExpression",
    "diagnostic.expectedIdentifier",
    "diagnostic.expectedClose",
  ]);

  const samePosition = (a: AnalysisPosition, b: AnalysisPosition) => a.line === b.line && a.column === b.column;

  // Lo que dijo el backend de una sentencia que empieza en `start`.
  function analysisDiagnostics(start: number, statement: string, found: AnalysisDiagnostic[]): SqlDiagnostic[] {
    const at = (position: AnalysisPosition) => start + lineColumnToOffset(statement, position.line, position.column);
    return found.map((item) => {
      const from = at(item.start);
      const to = Math.max(from + 1, at(item.end));
      const message = backendText(item.message);
      const suggestions = item.suggestions ?? [];
      const key = typeof item.message === "object" ? item.message.key : "";
      // Un nombre que no existe: "¿Quisiste decir…?" con el mas parecido.
      const hint =
        UNRESOLVED_KEYS.has(key) && suggestions[0]?.replacement
          ? ` ${$t("editor.diagnostics.didYouMean", { name: suggestions[0].replacement })}`
          : "";
      const fixes: QuickFix[] = suggestions.map((suggestion) => ({
        label: !suggestion.replacement
          ? $t("editor.diagnostics.fix.delete")
          : samePosition(suggestion.start, suggestion.end)
            ? $t("editor.diagnostics.fix.insert", { text: suggestion.replacement })
            : $t("editor.diagnostics.fix.replace", { text: suggestion.replacement }),
        from: at(suggestion.start),
        to: at(suggestion.end),
        insert: suggestion.replacement,
      }));
      // Lo que solo dice que falta terminar: no se muestra mientras se
      // escribe en esa sentencia (sqlDiagnostics.ts, typing).
      const incomplete =
        UNFINISHED_KEYS.has(key) || (UNFINISHED_AT_END_KEYS.has(key) && statement.slice(to - start).trim() === "");
      return {
        from,
        to,
        message: message + hint,
        source: "analysis",
        fixes,
        unresolved: UNRESOLVED_KEYS.has(key),
        incomplete,
        vague: VAGUE_KEYS.has(key),
      };
    });
  }

  // Las tablas que crea el documento (sqlCreatedTables.ts), para que el
  // analisis no las de por inexistentes. Se vuelven a buscar en cada ronda.
  let createdNames: string[] = [];
  let createdKey = "";

  const analysis = new AnalysisRunner<AnalysisDiagnostic[]>({
    view: () => view,
    analyze: (statements) => invoke<AnalysisDiagnostic[][]>("analyze_sql", { statements, created: createdNames }),
    toDiagnostics: analysisDiagnostics,
    prepare: () => {
      if (!view) return;
      const names = createdTables(view.state.doc);
      const key = names.join(",");
      if (key === createdKey) return;
      createdNames = names;
      createdKey = key;
      analysis.useCache(analysisCacheFor(analyzedProfile ?? null, analyzedTables, engine, createdKey));
      analysis.markAllDirty();
    },
  });
  analysis.markAllDirty();
  let analyzedTables: unknown = null;
  let analyzedEngine: SqlProfile | null = null;
  let analyzedProfile: string | null | undefined = undefined;

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
    popup = { diagnostic, anchor: { left: coords.left, top: coords.top, bottom: coords.bottom }, focused };
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
      const under = pos === null ? null : diagnosticUnder(current.state, pos);
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

  // Mirar un error a proposito (detalle, correccion): se ven todos.
  function stopTypingIn(current: EditorView) {
    current.dispatch({ effects: stopTyping.of(null) });
  }

  function showDetails(current: EditorView): boolean {
    stopTypingIn(current);
    const diagnostic = diagnosticAt(current.state, current.state.selection.main.head);
    if (!diagnostic) return false;
    openPopup(diagnostic, true);
    return true;
  }

  function applyFirstFix(current: EditorView): boolean {
    stopTypingIn(current);
    const fix = diagnosticAt(current.state, current.state.selection.main.head)?.fixes?.[0];
    if (!fix) return false;
    applyFix(fix);
    return true;
  }

  // --- Contador de errores (abajo a la derecha) ---------------------------
  // Flota sobre el texto sin tapar las barras de scroll. Los mismos errores
  // que recorre F2.
  let diagnosticCount = $state(0);
  // Sin soporte del fabricante: una etiqueta junto a la version, sin mas.
  const serverSupport = $derived($databaseExplorer?.serverVersion ? vendorSupport($databaseExplorer.serverVersion) : null);
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
    jump(view, direction);
    view.focus();
  }

  function measureChrome() {
    if (!view) return;
    scrollbarWidth = view.scrollDOM.offsetWidth - view.scrollDOM.clientWidth;
    scrollbarHeight = view.scrollDOM.offsetHeight - view.scrollDOM.clientHeight;
    editorBackground = getComputedStyle(view.dom).backgroundColor;
  }

  // Se cuenta una vez por cuadro, y solo si cambiaron los errores o el
  // cursor (lo que se oculta mientras se escribe depende de el).
  let countFrame = 0;
  const diagnosticCounter = EditorView.updateListener.of((update) => {
    const changed =
      update.startState.field(diagnosticsField) !== update.state.field(diagnosticsField) || update.selectionSet;
    if (!changed && !update.geometryChanged) return;
    cancelAnimationFrame(countFrame);
    countFrame = requestAnimationFrame(() => {
      if (!view) return;
      diagnosticCount = visibleDiagnosticCount(view.state);
      measureChrome();
    });
  });

  // F2 sin errores: un aviso breve en vez de no hacer nada.
  function jump(current: EditorView, direction: 1 | -1): boolean {
    if (jumpToDiagnostic(current, direction)) return true;
    notifySuccess($t("editor.diagnostics.noErrors"));
    return true;
  }

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
    view = new EditorView({
      doc: value,
      parent: container,
      extensions: [
        basicSetup,
        // Buscar (Ctrl+F) y reemplazar (Ctrl+R) propios en vez del panel
        // por defecto de basicSetup.
        editorSearch(),
        sqlCompartment.of(sql({ dialect: sqlDialect, upperCaseKeywords: true })),
        completionCompartment.of(autocompletion()),
        definitionLinkCompartment.of(buildDefinitionLink()),
        tabCompletionCompartment.of(buildTabCompletionKeymap(get(editorSettings).tabNavigatesCompletion)),
        // /* se cierra solo (sqlCommentEditing.ts).
        commentEditing,
        indentationCompartment.of(indentationExtension(get(editorSettings).indentStyle, get(editorSettings).indentSize)),
        lexicalCompartment.of(sqlLexical.of(engine.lexical)),
        // Pegar y arrastrar: sin los espacios invisibles de otras apps, segun
        // como escribe el SQL el motor de la conexion (sqlPaste.ts).
        EditorView.clipboardInputFilter.of((text, state) => normalizePastedSql(text, state.facet(sqlLexical))),
        // Aire bajo la ultima linea: se puede desplazar mas alla del final y
        // el cursor no se queda pegado al borde, asi el popup de sugerencias
        // cabe debajo de lo que se escribe.
        scrollPastEnd(),
        EditorView.scrollMargins.of(() => ({ bottom: CURSOR_BOTTOM_MARGIN })),
        statementIndex,
        hintsCompartment.of(parameterHintConfig.of(hintConfig())),
        parameterHints,
        activeStatementHighlight,
        executionMarker,
        sqlDiagnostics,
        diagnosticCounter,
        diagnosticHover,
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
        behaviorCompartment.of(get(editorSettings).autoUppercaseKeywords ? autoUppercaseSqlKeywords : []),
        themeCompartment.of(buildCmTheme(get(editorPalette), get(effectiveScheme))),
        phrasesCompartment.of(buildPhrases()),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          for (const transaction of update.transactions) {
            if (transaction.docChanged) analysis.noteChanges(transaction.changes, statementsChangedIn(transaction.state));
          }
          analysis.schedule();
          scheduleTextFlush();
          if (popup) closePopup(false);

          // completeFromSchema (la libreria) no distingue clausulas SQL: sin
          // "alias." de por medio, siempre sugiere tablas, sea que estes
          // despues de FROM o de WHERE. Detectar la tabla del FROM actual y
          // pasarla como defaultTable hace que sus columnas tambien aparezcan
          // sin calificar (ver comentario largo en sqlSchema.ts). Solo con el
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
    // Los mensajes del analisis, en el idioma nuevo (de la cache: sin llamar
    // al backend).
    analysis.markAllDirty();
    analysis.schedule();
  });

  $effect(() => {
    const autoUppercase = $editorSettings.autoUppercaseKeywords;
    if (!view) return;
    view.dispatch({
      effects: behaviorCompartment.reconfigure(autoUppercase ? autoUppercaseSqlKeywords : []),
    });
  });

  $effect(() => {
    $editorSettings.tableAliases;
    untrack(reconfigureCompletion);
  });

  $effect(() => {
    const tabNavigatesCompletion = $editorSettings.tabNavigatesCompletion;
    if (!view) return;
    view.dispatch({
      effects: tabCompletionCompartment.reconfigure(buildTabCompletionKeymap(tabNavigatesCompletion)),
    });
  });

  $effect(() => {
    const { indentStyle, indentSize } = $editorSettings;
    if (!view) return;
    view.dispatch({ effects: indentationCompartment.reconfigure(indentationExtension(indentStyle, indentSize)) });
  });

  // Reconfigura schema/dialecto/FK cuando cambia el catalogo o la conexion
  // activa (ver arriba para el resto de la reconfiguracion, atada al texto).
  $effect(() => {
    const tables = $catalogTables;
    const profile = $connectionProfiles.find((candidate) => candidate.id === $connection.profileId);
    // El schema de la conexion (search_path en Postgres, la base elegida en
    // MySQL): sus tablas van sin prefijo.
    const defaultSchema = $databaseExplorer?.defaultSchema;

    const nextEngine = profile ? engineFor(profile.driver) : standardSql;
    sqlSchema = buildSqlSchema(tables, {
      defaultSchema, engine: nextEngine,
      explorerSchemas: $databaseExplorer?.schemas ?? [],
      availableSchemas: $databaseExplorer?.availableSchemas ?? [],
    });
    // Otro motor: el indice de sentencias vuelve a cortar con sus reglas.
    if (view && nextEngine.lexical !== engine.lexical) {
      view.dispatch({ effects: lexicalCompartment.reconfigure(sqlLexical.of(nextEngine.lexical)) });
    }
    engine = nextEngine;
    catalogCompletions = buildCatalogCompletions($databaseExplorer?.schemas ?? [], engine, defaultSchema);
    sqlDialect = dialectFor(engine);
    // Las rutinas (y el motor) de los hints de parametros.
    routineIndex = buildRoutineIndex($databaseExplorer?.schemas ?? [], defaultSchema);
    view?.dispatch({ effects: hintsCompartment.reconfigure(parameterHintConfig.of(hintConfig())) });
    reconfigureCompletion();
    // Otro catalogo o dialecto: los nombres se vuelven a revisar (el efecto
    // tambien corre con otros cambios de la conexion; ahi no hace falta).
    const analyzedFor = $connection.profileId ?? null;
    if (tables === analyzedTables && engine === analyzedEngine && analyzedFor === analyzedProfile) return;
    analyzedTables = tables;
    analyzedEngine = engine;
    analyzedProfile = analyzedFor;
    analysis.useCache(analysisCacheFor(analyzedFor, tables, engine, createdKey));
    analysis.markAllDirty();
    analysis.schedule();
  });

  onDestroy(() => {
    cancelAnimationFrame(countFrame);
    flushText();
    unregisterTextFlush();
    unregisterCommands();
    analysis.destroy();
    if (hoverTimer) clearTimeout(hoverTimer);
    cancelHoverClose();
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
    {#if $databaseExplorer?.serverVersion}
      <span class="server-version" use:tooltip={{ label: $t("editor.serverVersion"), placement: "above" }}>
        {$databaseExplorer.serverVersion}
      </span>
      {#if serverSupport?.status === "unsupported"}
        <span
          class="server-unsupported"
          use:tooltip={{
            label: $t("editor.serverUnsupportedHint", {
              version: $databaseExplorer.serverVersion,
              date: new Intl.DateTimeFormat($locale, { month: "long", year: "numeric" }).format(new Date(`${serverSupport.eol}T12:00:00Z`)),
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
