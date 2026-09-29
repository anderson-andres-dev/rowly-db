import { RangeSetBuilder, type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { EditorPalette, ColorScheme } from './palettes';

/**
 * Builds a CodeMirror theme extension (shell styling + syntax highlighting)
 * from a curated EditorPalette.
 *
 * Note: `palette.function` is intentionally NOT consumed here —
 * `@codemirror/lang-sql`'s grammar does not emit a distinguishable
 * "function name" tag for user functions. Built-in functions (COUNT, NOW…)
 * come as `standard(name)` and use `palette.builtin` when the theme sets it.
 * `palette.error` is only used by the execution status marker (see
 * sqlExecutionMarker.ts), not for syntax highlighting — there is no linter.
 */
// En los temas claros y en los que piden `tokenChrome`: CodeMirror trae
// defaults pensados para un editor generico (banda azul en el margen de la
// linea activa, borde del margen, contorno punteado al enfocar, coincidencias
// en lima, panel de busqueda gris con botones con degradado, tooltips grises)
// que sobre la UI de Khipu se ven improvisados. Se resuelven con los tokens del shell
// (variables CSS) para que sigan al tema. Los oscuros de DataGrip y VS Code
// no reciben nada de esto a proposito: ya se ven como se quiere. One Dark,
// Dracula, Nord, Gruvbox y Solarized si, porque los grises por defecto
// desentonan con sus fondos de color.
const TOKEN_CHROME: Parameters<typeof EditorView.theme>[0] = {
	'.cm-gutters': {
		borderRight: 'none'
	},
	'.cm-activeLineGutter': {
		backgroundColor: 'transparent'
	},
	'&.cm-focused': {
		outline: 'none'
	},
	'.cm-selectionMatch': {
		backgroundColor: 'color-mix(in srgb, var(--accent) 14%, transparent)'
	},
	'&.cm-focused .cm-matchingBracket, .cm-matchingBracket': {
		backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
		outline: 'none'
	},
	'&.cm-focused .cm-nonmatchingBracket, .cm-nonmatchingBracket': {
		backgroundColor: 'color-mix(in srgb, var(--danger) 16%, transparent)'
	},
	'.cm-searchMatch': {
		backgroundColor: 'color-mix(in srgb, var(--warning) 26%, transparent)',
		outline: '1px solid color-mix(in srgb, var(--warning) 45%, transparent)'
	},
	'.cm-searchMatch.cm-searchMatch-selected': {
		backgroundColor: 'color-mix(in srgb, var(--accent) 24%, transparent)',
		outline: '1px solid color-mix(in srgb, var(--accent) 50%, transparent)'
	},
	'.cm-panels': {
		backgroundColor: 'var(--surface)',
		color: 'var(--text-primary)'
	},
	'.cm-panels.cm-panels-top': {
		borderBottom: '1px solid var(--border)'
	},
	'.cm-panels.cm-panels-bottom': {
		borderTop: '1px solid var(--border)'
	},
	'.cm-textfield': {
		border: '1px solid var(--control-border)',
		borderRadius: '4px',
		backgroundColor: 'var(--surface-elevated)',
		color: 'var(--text-primary)'
	},
	'.cm-textfield:focus': {
		outline: '1px solid var(--focus-ring)',
		borderColor: 'var(--focus-ring)'
	},
	'.cm-button': {
		border: '1px solid var(--control-border)',
		borderRadius: '4px',
		backgroundImage: 'none',
		backgroundColor: 'var(--surface-elevated)',
		color: 'var(--text-primary)'
	},
	'.cm-button:hover': {
		backgroundColor: 'var(--surface-hover)'
	},
	'.cm-button:active': {
		backgroundImage: 'none',
		backgroundColor: 'var(--surface-hover)'
	},
	'.cm-panel.cm-search [name=close]': {
		color: 'var(--text-secondary)'
	},
	'.cm-foldPlaceholder': {
		border: '1px solid var(--border)',
		backgroundColor: 'var(--surface-hover)',
		color: 'var(--text-secondary)'
	},
	'.cm-tooltip': {
		border: '1px solid var(--border)',
		backgroundColor: 'var(--surface-elevated)',
		color: 'var(--text-primary)'
	},
	'.cm-tooltip .cm-completionInfo': {
		border: '1px solid var(--border)',
		backgroundColor: 'var(--surface-elevated)'
	}
};

// Funciones integradas que el dialecto MySQL de lang-sql marca como palabra
// clave (COUNT, SUM, CAST…): sin esto, `palette.builtin` casi no se veía.
// Solo cuentan como función si les sigue un paréntesis, así `IN (` o
// `VALUES (` no se confunden.
const BUILTIN_FUNCTIONS = new Set(
	(
		'count sum avg min max cast convert coalesce ifnull nullif isnull concat concat_ws substring substr ' +
		'length char_length lower upper trim ltrim rtrim replace round floor ceil ceiling abs mod power sqrt ' +
		'now current_date current_time current_timestamp date time year month day hour minute second ' +
		'date_format date_add date_sub datediff extract to_char to_date to_timestamp group_concat string_agg ' +
		'array_agg json_extract json_object json_array json_agg jsonb_agg row_number rank dense_rank lag lead ' +
		'first_value last_value greatest least if left right position'
	).split(' ')
);

// Operadores escritos como palabra: la gramática los marca como palabra
// clave igual que SELECT o FROM. Con `palette.wordOperator` se pintan aparte.
const WORD_OPERATORS = new Set(
	'and or not is like ilike in between exists any all some xor div regexp rlike similar'.split(' ')
);

const builtinCallMark = Decoration.mark({ class: 'cm-sqlBuiltinCall' });
const wordOperatorMark = Decoration.mark({ class: 'cm-sqlWordOperator' });

function findWordClasses(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const tree = syntaxTree(view.state);
	for (const { from, to } of view.visibleRanges) {
		tree.iterate({
			from,
			to,
			enter(node) {
				if (node.name !== 'Keyword' && node.name !== 'Builtin') return;
				const word = view.state.doc.sliceString(node.from, node.to).toLowerCase();
				if (WORD_OPERATORS.has(word)) {
					builder.add(node.from, node.to, wordOperatorMark);
					return;
				}
				if (!BUILTIN_FUNCTIONS.has(word)) return;
				const next = view.state.doc.sliceString(node.to, Math.min(node.to + 8, view.state.doc.length));
				if (/^\s*\(/.test(next)) builder.add(node.from, node.to, builtinCallMark);
			}
		});
	}
	return builder.finish();
}

const wordClassHighlight = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = findWordClasses(view);
		}
		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
				this.decorations = findWordClasses(update.view);
			}
		}
	},
	{ decorations: (plugin) => plugin.decorations }
);

// Un tema por paleta y esquema, reutilizado. Cada EditorView.theme y cada
// HighlightStyle.define agrega sus reglas CSS al documento y no las quita
// nunca; cada pestaña monta su propio editor, asi que armar el tema de nuevo
// en cada una sumaba ~40 reglas por cambio de pestaña. Tras horas de uso
// eran decenas de miles, y cada recalculo de estilos (mover el sidebar,
// scrollear, pasar el mouse) se volvia mas lento. Con el mismo objeto,
// CodeMirror no vuelve a montar sus reglas.
const themes = new Map<string, Extension>();

export function buildCmTheme(palette: EditorPalette, scheme: ColorScheme): Extension {
	const key = `${scheme}\u0000${JSON.stringify(palette)}`;
	let theme = themes.get(key);
	if (!theme) {
		theme = createCmTheme(palette, scheme);
		themes.set(key, theme);
	}
	return theme;
}

function createCmTheme(palette: EditorPalette, scheme: ColorScheme): Extension {
	const themeExtension = EditorView.theme(
		{
			'&': {
				backgroundColor: palette.background,
				color: palette.foreground
			},
			'.cm-content': {
				caretColor: palette.caret
			},
			'.cm-gutters': {
				backgroundColor: palette.background,
				color: palette.lineNumber
			},
			'.cm-activeLineGutter': {
				color: palette.activeLineNumber
			},
			'.cm-activeLine': {
				// drawSelection pinta por debajo del contenido. Un fondo incluso
				// identico al del editor tapa la seleccion en la linea que contiene
				// el cursor (la cm-activeLine); transparente conserva la capa azul.
				backgroundColor: 'transparent !important'
			},
			'.cm-activeStatement': {
				width: 'max(calc(var(--cm-active-statement-width) + 0.5ch), calc(var(--cm-active-statement-measured, 0px) + 0.5ch))',
				boxShadow: `inset 1px 0 ${palette.activeStatement}, inset -1px 0 ${palette.activeStatement}`
			},
			'.cm-activeStatement.cm-activeStatementStart': {
				boxShadow: `inset 1px 0 ${palette.activeStatement}, inset -1px 0 ${palette.activeStatement}, inset 0 1px ${palette.activeStatement}`
			},
			'.cm-activeStatement.cm-activeStatementEnd': {
				boxShadow: `inset 1px 0 ${palette.activeStatement}, inset -1px 0 ${palette.activeStatement}, inset 0 -1px ${palette.activeStatement}`
			},
			'.cm-activeStatement.cm-activeStatementStart.cm-activeStatementEnd': {
				boxShadow: `inset 1px 0 ${palette.activeStatement}, inset -1px 0 ${palette.activeStatement}, inset 0 1px ${palette.activeStatement}, inset 0 -1px ${palette.activeStatement}`
			},
			// Marcador de la ultima ejecucion (sqlExecutionMarker.ts): la forma
			// del icono sale de sqlEditorIcons.css, el color de la paleta.
			'.cm-executionStatus-success': {
				backgroundColor: palette.success
			},
			'.cm-executionStatus-error': {
				backgroundColor: palette.error
			},
			'.cm-executionStatus-running': {
				backgroundColor: palette.lineNumber
			},
			'.cm-executionTime': {
				color: palette.comment,
				marginLeft: '2ch',
				fontSize: '0.85em',
				userSelect: 'none'
			},
			'.cm-cursor, .cm-dropCursor': {
				borderLeftColor: palette.caret
			},
			// CodeMirror define el color de seleccion por defecto (@codemirror/view)
			// con selectores muy especificos, entre ellos
			// "&dark.cm-focused > .cm-scroller > .cm-selectionLayer
			// .cm-selectionBackground" - misma cantidad de clases que un intento
			// de pisarlo con "&.cm-focused > .cm-scroller > .cm-selectionLayer
			// .cm-selectionBackground" propio, asi que el empate de especificidad
			// puede perderse igual segun el orden real de insercion de las hojas
			// de estilo. Con !important no hay ambiguedad posible.
			'.cm-selectionBackground': {
				backgroundColor: palette.selection + ' !important'
			},
			'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
				backgroundColor: palette.selection + ' !important'
			}
		},
		{ dark: scheme === 'dark' }
	);

	const highlightStyle = HighlightStyle.define([
		{ tag: tags.keyword, color: palette.keyword },
		{ tag: tags.typeName, color: palette.type ?? palette.keyword },
		{ tag: tags.string, color: palette.string },
		{ tag: tags.number, color: palette.number },
		{ tag: [tags.lineComment, tags.blockComment], color: palette.comment, fontStyle: 'italic' },
		{ tag: [tags.bool, tags.null], color: palette.constant },
		...(palette.builtin ? [{ tag: tags.standard(tags.name), color: palette.builtin }] : []),
		...(palette.operator ? [{ tag: tags.operator, color: palette.operator }] : [])
	]);

	const tokenChrome = scheme === 'light' || palette.tokenChrome ? [EditorView.theme(TOKEN_CHROME)] : [];

	// Sin color propio, la marca no pinta nada y queda el de palabra clave.
	const wordClassColors: Parameters<typeof EditorView.theme>[0] = {};
	if (palette.builtin) wordClassColors['.cm-sqlBuiltinCall, .cm-sqlBuiltinCall *'] = { color: palette.builtin };
	if (palette.wordOperator) wordClassColors['.cm-sqlWordOperator, .cm-sqlWordOperator *'] = { color: palette.wordOperator };
	const wordClasses =
		palette.builtin || palette.wordOperator ? [wordClassHighlight, EditorView.theme(wordClassColors)] : [];

	return [themeExtension, ...tokenChrome, syntaxHighlighting(highlightStyle), ...wordClasses];
}
