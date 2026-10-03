// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { ENGINES } from "../engines";
import { commentDecorations } from "./commentStyle";
import { dialectFor } from "./completionSource";
import { sqlLexical } from "./statementIndex";

let views: EditorView[] = [];
afterEach(() => {
  for (const view of views) view.destroy();
  views = [];
});

// "texto:clase" de cada decoracion.
function styled(doc: string, driver: "mysql" | "mariadb" | "postgres" = "mysql"): string[] {
  const engine = ENGINES[driver];
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [dialectFor(engine).language, sqlLexical.of(engine.lexical)] }),
    parent: document.body,
  });
  views.push(view);
  ensureSyntaxTree(view.state, doc.length, 5000);
  const out: string[] = [];
  commentDecorations(view).between(0, doc.length, (from, to, value) => {
    out.push(`${doc.slice(from, to)}:${(value.spec.class as string).replace("cm-comment-", "")}`);
  });
  return out;
}

describe("jerarquia dentro de los comentarios", () => {
  it("marcadores tenues en cada forma de comentario", () => {
    expect(styled("SELECT 1 -- nota")).toContain("--:marker");
    expect(styled("SELECT 1 # nota")).toContain("#:marker");
    expect(styled("SELECT 1 /* nota */")).toEqual(expect.arrayContaining(["/*:marker", "*/:marker"]));
    expect(styled("/*\n * uno\n */")).toContain("*:marker");
  });

  it("tareas, etiquetas y **negrita** en negrita; *cursiva* y _cursiva_ en cursiva", () => {
    const out = styled("-- TODO: revisar **esto** con *calma* y _cuidado_. @param id");
    expect(out).toEqual(
      expect.arrayContaining(["TODO:strong", "esto:strong", "calma:emphasis", "cuidado:emphasis", "@param:strong", "**:marker"]),
    );
  });

  it("no confunde nombres con guiones bajos ni la continuacion de un bloque", () => {
    expect(styled("-- user_id y order_id").filter((s) => s.endsWith("emphasis"))).toEqual([]);
    expect(styled("/*\n * texto\n */").filter((s) => s.endsWith("emphasis"))).toEqual([]);
  });

  it("las comillas de `codigo` se atenuan", () => {
    expect(styled("-- usa `id`").filter((s) => s === "`:marker")).toHaveLength(2);
  });

  it("pistas del optimizador: el nombre en negrita", () => {
    expect(styled("SELECT /*+ NO_INDEX(t) */ * FROM t")).toContain("NO_INDEX:strong");
    // En Postgres /*+ es un comentario normal.
    expect(styled("SELECT /*+ NO_INDEX(t) */ 1", "postgres")).not.toContain("NO_INDEX:strong");
  });

  it("lo que el motor ejecuta no se decora", () => {
    expect(styled("SELECT /*!50001 **x** */ 1")).toEqual([]);
    expect(styled("SELECT /*M!100100 TODO */ 1", "mariadb")).toEqual([]);
  });

  it("en MySQL, lo que sigue al primer */ es codigo y no se decora", () => {
    const out = styled("SELECT 1 /* a /* b */ ; SELECT 'TODO'; */");
    expect(out).not.toContain("TODO:strong");
  });
});
