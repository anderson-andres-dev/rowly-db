import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import { ENGINES } from "../engines";
import { dialectFor } from "./completionSource";

// Lo que pinta el editor, trozo a trozo: "texto:clase".
function painted(doc: string, driver: "mysql" | "mariadb" | "postgres"): string[] {
  const state = EditorState.create({ doc, extensions: [dialectFor(ENGINES[driver]).language] });
  const tree = ensureSyntaxTree(state, doc.length, 5000)!;
  const out: string[] = [];
  highlightTree(tree, classHighlighter, (from, to, classes) => out.push(`${doc.slice(from, to)}:${classes.replace("tok-", "")}`));
  return out;
}

describe("el resaltado lee los comentarios como el motor", () => {
  it("el contenido de /*! se pinta como SQL en MySQL y MariaDB, y como comentario en Postgres", () => {
    const doc = "SELECT /*!50001 SQL_NO_CACHE */ 1";
    for (const driver of ["mysql", "mariadb"] as const) {
      const out = painted(doc, driver);
      expect(out, driver).toContain("/*!50001:comment");
      expect(out, driver).toContain("SQL_NO_CACHE:keyword");
      expect(out, driver).toContain("*/:comment");
    }
    expect(painted(doc, "postgres")).toContain("/*!50001 SQL_NO_CACHE */:comment");
  });

  it("/*M! es SQL solo en MariaDB", () => {
    const doc = "SELECT /*M!100100 SQL_NO_CACHE */ 1";
    expect(painted(doc, "mariadb")).toContain("SQL_NO_CACHE:keyword");
    expect(painted(doc, "mysql")).toContain("/*M!100100 SQL_NO_CACHE */:comment");
  });

  it("sin anidamiento, lo que sigue al primer */ es codigo, como en el servidor", () => {
    const doc = "SELECT 1 /* a /* b */ ; DROP TABLE x; */";
    for (const driver of ["mysql", "mariadb"] as const) {
      const out = painted(doc, driver);
      expect(out, driver).toContain("DROP:keyword");
      expect(out, driver).toContain("TABLE:keyword");
    }
    // En Postgres si anida: todo es comentario.
    expect(painted(doc, "postgres")).toContain("/* a /* b */ ; DROP TABLE x; */:comment");
  });

  it("un comentario normal sigue siendo comentario en todos", () => {
    for (const driver of ["mysql", "mariadb", "postgres"] as const) {
      expect(painted("SELECT 1 /* nota */", driver), driver).toContain("/* nota */:comment");
    }
  });
});
