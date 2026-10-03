import { EditorView, Decoration, ViewPlugin, type DecorationSet } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

export interface CatalogTableRef {
  schema: string;
  table: string;
}

export interface DefinitionLinkOptions {
  // undefined si la palabra bajo el cursor no es una tabla conocida del
  // catalogo activo (ver resolveCatalogTable en editor/completionSource.ts).
  resolveTable: (word: string) => CatalogTableRef | undefined;
  onOpen: (ref: CatalogTableRef) => void;
}

const setLinkRange = StateEffect.define<{ from: number; to: number } | null>();

const linkRangeField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setLinkRange)) continue;
      if (!effect.value) return Decoration.none;
      return Decoration.set([
        Decoration.mark({ class: "cm-tableDefinitionLink" }).range(effect.value.from, effect.value.to),
      ]);
    }
    return tr.docChanged ? Decoration.none : value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function isModifierHeld(event: KeyboardEvent | MouseEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

// Ctrl/Cmd + hover subraya en azul el nombre de una tabla conocida del
// catalogo (al estilo "ir a definicion" de un IDE); Ctrl/Cmd + clic sobre
// ese subrayado dispara onOpen en vez del comportamiento normal del editor
// (mover el cursor). Sin seguimiento de posicion del mouse en el estado de
// CodeMirror en si - se resuelve por evento DOM (mousemove/keydown/keyup),
// como cualquier "link hint" de editor de codigo.
class DefinitionLinkPlugin {
  private view: EditorView;
  private options: DefinitionLinkOptions;
  private lastPointer: { x: number; y: number } | null = null;
  private current: { from: number; to: number; ref: CatalogTableRef } | null = null;

  constructor(view: EditorView, options: DefinitionLinkOptions) {
    this.view = view;
    this.options = options;
  }

  private refresh() {
    if (!this.lastPointer) return;
    const pos = this.view.posAtCoords(this.lastPointer);
    if (pos == null) return this.clear();

    const word = this.view.state.wordAt(pos);
    if (!word) return this.clear();

    const text = this.view.state.sliceDoc(word.from, word.to);
    const ref = this.options.resolveTable(text);
    if (!ref) return this.clear();

    if (this.current && this.current.from === word.from && this.current.to === word.to) return;
    this.current = { from: word.from, to: word.to, ref };
    this.view.dispatch({ effects: setLinkRange.of({ from: word.from, to: word.to }) });
  }

  private clear() {
    if (!this.current) return;
    this.current = null;
    this.view.dispatch({ effects: setLinkRange.of(null) });
  }

  mousemove(event: MouseEvent) {
    this.lastPointer = { x: event.clientX, y: event.clientY };
    if (!isModifierHeld(event)) return this.clear();
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".cm-content")) return this.clear();
    this.refresh();
  }

  mouseleave() {
    this.clear();
  }

  mousedown(event: MouseEvent) {
    if (!isModifierHeld(event) || !this.current) return;
    event.preventDefault();
    event.stopPropagation();
    this.options.onOpen(this.current.ref);
  }

  keydown(event: KeyboardEvent) {
    if (event.key !== "Control" && event.key !== "Meta") return;
    this.refresh();
  }

  keyup(event: KeyboardEvent) {
    if (event.key !== "Control" && event.key !== "Meta") return;
    this.clear();
  }

  destroy() {
    this.current = null;
  }
}

export function definitionLinkExtension(options: DefinitionLinkOptions) {
  return [
    linkRangeField,
    ViewPlugin.define((view) => new DefinitionLinkPlugin(view, options), {
      eventHandlers: {
        mousemove(event) {
          this.mousemove(event);
        },
        mouseleave() {
          this.mouseleave();
        },
        mousedown(event) {
          this.mousedown(event);
        },
        keydown(event) {
          this.keydown(event);
        },
        keyup(event) {
          this.keyup(event);
        },
      },
    }),
  ];
}
