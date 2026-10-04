import { describe, expect, it } from "vitest";
import { highlightSql } from "./highlight";

describe("highlightSql", () => {
  it("resalta palabras clave, strings y numeros, y escapa el resto", () => {
    expect(highlightSql("UPDATE t SET a = 'o''h<b>', n = 24 WHERE id = 7;")).toBe(
      '<span class="s-kw">UPDATE</span> t <span class="s-kw">SET</span> a = ' +
        '<span class="s-str">&#39;o&#39;&#39;h&lt;b&gt;&#39;</span>, n = <span class="s-num">24</span> ' +
        '<span class="s-kw">WHERE</span> id = <span class="s-num">7</span>;',
    );
  });

  it("no pinta palabras clave dentro de identificadores citados ni nombres", () => {
    expect(highlightSql("SELECT `order`, order_id FROM t1")).toBe(
      '<span class="s-kw">SELECT</span> `order`, order_id <span class="s-kw">FROM</span> t1',
    );
  });
});
