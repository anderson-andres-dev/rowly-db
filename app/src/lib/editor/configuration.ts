// La configuracion del editor que cambia en caliente: un Compartment por
// ajuste, cada uno reconfigurado por separado. Cambiar el tema, el idioma, la
// indentacion o la conexion despacha un efecto; el editor nunca se remonta
// (perderia seleccion, undo y foco).

import { autocompletion } from "@codemirror/autocomplete";
import { sql, type SQLDialect } from "@codemirror/lang-sql";
import { Compartment, EditorState, type Extension, type StateEffect } from "@codemirror/state";
import type { SqlProfile } from "$lib/engines";
import { translate, type MessageKey } from "$lib/i18n";
import type { RoutineIndex } from "$lib/sqlCallHints";
import { buildCompletionSource, resolveCatalogTable, type buildSqlSchema } from "$lib/sqlSchema";
import type { buildCatalogCompletions } from "$lib/sqlCatalogCompletions";
import { definitionLinkExtension, type CatalogTableRef } from "$lib/sqlDefinitionLink";
import { autoUppercaseSqlKeywords } from "$lib/sqlEditorBehavior";
import { buildTabCompletionKeymap, indentationExtension } from "$lib/sqlIndentation";
import { parameterHintConfig } from "$lib/sqlParameterHints";
import { sqlLexical } from "$lib/sqlStatementIndex";
import { buildCmTheme } from "$lib/theming/codemirrorTheme";

// Frases propias de CodeMirror (plegado, anuncios de lector de pantalla, "ir
// a linea"...) que se muestran o anuncian en el editor.
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

export function buildPhrases(): Extension {
  return EditorState.phrases.of(
    Object.fromEntries(Object.entries(CODEMIRROR_PHRASES).map(([phrase, key]) => [phrase, translate(key)])),
  );
}

// Lo que sale de la conexion activa y del texto: el motor, su dialecto de
// lang-sql, el catalogo y la tabla del FROM de la sentencia actual.
export interface LanguageContext {
  engine: SqlProfile;
  dialect: SQLDialect;
  schema: ReturnType<typeof buildSqlSchema>;
  catalogCompletions: ReturnType<typeof buildCatalogCompletions>;
  defaultTable: string | undefined;
  routines: RoutineIndex;
}

export interface EditorSettingsSnapshot {
  autoUppercaseKeywords: boolean;
  tabNavigatesCompletion: boolean;
  indentStyle: Parameters<typeof indentationExtension>[0];
  indentSize: Parameters<typeof indentationExtension>[1];
  tableAliases: Parameters<typeof buildCompletionSource>[0]["tableAliases"];
}

type Palette = Parameters<typeof buildCmTheme>[0];
type Scheme = Parameters<typeof buildCmTheme>[1];

export interface EditorConfigurationOptions {
  language(): LanguageContext;
  settings(): EditorSettingsSnapshot;
  onOpenTable(ref: CatalogTableRef): void;
}

// Cada Compartment al montar, por nombre: el orden de las extensiones fija su
// precedencia (los atajos de teclado, por ejemplo), asi que la vista las pone
// en su lugar.
export interface InitialExtensions {
  language: Extension;
  completion: Extension;
  definitionLink: Extension;
  tabCompletion: Extension;
  indentation: Extension;
  lexical: Extension;
  hints: Extension;
  behavior: Extension;
  theme: Extension;
  phrases: Extension;
}

export interface EditorConfiguration {
  initial(palette: Palette, scheme: Scheme): InitialExtensions;
  theme(palette: Palette, scheme: Scheme): StateEffect<unknown>;
  phrases(): StateEffect<unknown>;
  behavior(autoUppercase: boolean): StateEffect<unknown>;
  tabCompletion(tabNavigatesCompletion: boolean): StateEffect<unknown>;
  indentation(style: EditorSettingsSnapshot["indentStyle"], size: EditorSettingsSnapshot["indentSize"]): StateEffect<unknown>;
  // Las comillas y comentarios del motor, para cortar en sentencias.
  lexical(engine: SqlProfile): StateEffect<unknown>;
  // El motor y las rutinas de la conexion, para los hints de parametros.
  hints(): StateEffect<unknown>;
  // Dialecto, autocompletado y enlace a la definicion, con el contexto actual.
  completion(): StateEffect<unknown>[];
}

export function createEditorConfiguration(options: EditorConfigurationOptions): EditorConfiguration {
  const theme = new Compartment();
  const language = new Compartment();
  const lexical = new Compartment();
  const hints = new Compartment();
  const completion = new Compartment();
  const definitionLink = new Compartment();
  const behavior = new Compartment();
  const tabCompletion = new Compartment();
  const indentation = new Compartment();
  const phrases = new Compartment();

  const languageExtension = () => sql({ dialect: options.language().dialect, upperCaseKeywords: true });
  const hintsExtension = () => {
    const { engine, routines } = options.language();
    return parameterHintConfig.of({ engine, routines });
  };
  const definitionLinkExtensionNow = () =>
    definitionLinkExtension({
      resolveTable: (word) => {
        const { schema } = options.language();
        return resolveCatalogTable(schema.schema, schema.defaultSchema, word);
      },
      onOpen: (ref) => options.onOpenTable(ref),
    });
  const completionExtension = () => {
    const context = options.language();
    return autocompletion({
      override: [
        buildCompletionSource({
          dialect: context.dialect,
          engine: context.engine,
          schema: context.schema.schema,
          defaultSchema: context.schema.defaultSchema,
          defaultTable: context.defaultTable,
          fkIndex: context.schema.fkIndex,
          tableIndex: context.schema.tableIndex,
          catalogCompletions: context.catalogCompletions,
          tableAliases: options.settings().tableAliases,
        }),
      ],
    });
  };
  const behaviorExtension = (autoUppercase: boolean) => (autoUppercase ? autoUppercaseSqlKeywords : []);

  return {
    initial(palette, scheme) {
      const settings = options.settings();
      return {
        language: language.of(languageExtension()),
        // Al montar, el autocompletado por defecto: el del catalogo llega con
        // la primera reconfiguracion (completion()).
        completion: completion.of(autocompletion()),
        definitionLink: definitionLink.of(definitionLinkExtensionNow()),
        tabCompletion: tabCompletion.of(buildTabCompletionKeymap(settings.tabNavigatesCompletion)),
        indentation: indentation.of(indentationExtension(settings.indentStyle, settings.indentSize)),
        lexical: lexical.of(sqlLexical.of(options.language().engine.lexical)),
        hints: hints.of(hintsExtension()),
        behavior: behavior.of(behaviorExtension(settings.autoUppercaseKeywords)),
        theme: theme.of(buildCmTheme(palette, scheme)),
        phrases: phrases.of(buildPhrases()),
      };
    },
    theme: (palette, scheme) => theme.reconfigure(buildCmTheme(palette, scheme)),
    phrases: () => phrases.reconfigure(buildPhrases()),
    behavior: (autoUppercase) => behavior.reconfigure(behaviorExtension(autoUppercase)),
    tabCompletion: (tabNavigatesCompletion) => tabCompletion.reconfigure(buildTabCompletionKeymap(tabNavigatesCompletion)),
    indentation: (style, size) => indentation.reconfigure(indentationExtension(style, size)),
    lexical: (engine) => lexical.reconfigure(sqlLexical.of(engine.lexical)),
    hints: () => hints.reconfigure(hintsExtension()),
    completion: () => [
      language.reconfigure(languageExtension()),
      completion.reconfigure(completionExtension()),
      definitionLink.reconfigure(definitionLinkExtensionNow()),
    ],
  };
}
