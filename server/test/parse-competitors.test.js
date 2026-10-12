import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCompetitors } from "../market-analysis/parse-competitors.js";

test("parseCompetitors splits commas", () => {
  assert.deepEqual(parseCompetitors("A, B ,C"), ["A", "B", "C"]);
});
