import { describe, expect, it } from "vitest";
import { MAX_HIGHLIGHTED_CHARS, detectJsonColumns, highlightJson, isJsonColumnType } from "./jsonHighlight";

describe("highlightJson", () => {
  it("distingue claves, strings, numeros y literales", () => {
    expect(highlightJson('{"a": "x", "n": -1.5e3, "ok": true, "v": null}')).toBe(
      '{<span class="j-key">&quot;a&quot;</span>: <span class="j-str">&quot;x&quot;</span>, ' +
        '<span class="j-key">&quot;n&quot;</span>: <span class="j-num">-1.5e3</span>, ' +
        '<span class="j-key">&quot;ok&quot;</span>: <span class="j-lit">true</span>, ' +
        '<span class="j-key">&quot;v&quot;</span>: <span class="j-lit">null</span>}',
    );
  });

  it("escapa el HTML de los valores y respeta comillas escapadas", () => {
    expect(highlightJson('["<b>\\"hola\\"</b>"]')).toBe(
      '[<span class="j-str">&quot;&lt;b&gt;\\&quot;hola\\&quot;&lt;/b&gt;&quot;</span>]',
    );
  });

  it("no resalta mas alla del tope pero conserva todo el texto", () => {
    const long = `[${"1,".repeat(MAX_HIGHLIGHTED_CHARS)}1]`;
    const html = highlightJson(long);
    expect(html.replace(/<[^>]+>/g, "")).toBe(long);
    expect(html.split("j-num").length - 1).toBeLessThanOrEqual(MAX_HIGHLIGHTED_CHARS / 2 + 1);
  });

  it("reconoce los tipos JSON de MySQL y Postgres", () => {
    expect(isJsonColumnType("JSON")).toBe(true);
    expect(isJsonColumnType("jsonb")).toBe(true);
    expect(isJsonColumnType("TEXT")).toBe(false);
  });
});

describe("detectJsonColumns", () => {
  const columns = [{ type: "VARCHAR" }, { type: "TEXT" }, { type: "INT" }, { type: "JSON" }];

  it("detecta JSON guardado en columnas de texto y respeta el tipo JSON", () => {
    const rows = [
      ['{"a": 1}', "hola {mundo}", "{}", null],
      [null, "texto", "[]", null],
      ["[1, 2]", "", "1", null],
    ];
    expect(detectJsonColumns(columns, rows)).toEqual([true, false, false, true]);
  });

  it("una columna de texto sin valores no se marca", () => {
    expect(detectJsonColumns([{ type: "TEXT" }], [[null], [""]])).toEqual([false]);
  });
});
