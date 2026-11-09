import assert from "node:assert/strict";
import { test } from "node:test";
import { bench } from "./bench.mjs";

test("el banco sintetico arma un repositorio, lo indexa con y sin cache y responde una tarjeta", () => {
  const result = bench(80);
  assert.equal(result.size, 80);
  assert.equal(result.files, 80);
  for (const key of ["cold", "warm", "card"]) assert.ok(Number.isFinite(result[key]) && result[key] >= 0, key);
});
