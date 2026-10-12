import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectRepresentativeQuotes } from "../persona-fleet/quotes.js";

describe("selectRepresentativeQuotes", () => {
  it("returns at most max quotes with high and low per archetype", () => {
    const rows = [];
    for (let i = 0; i < 8; i += 1) {
      rows.push({
        agentId: `a${i}`,
        archetypeType: i < 4 ? "persona_1" : "persona_2",
        compositeScore: i * 10,
        verdict: `verdict ${i}`,
      });
    }
    const quotes = selectRepresentativeQuotes(rows, 25);
    assert.ok(quotes.length <= 25);
    assert.ok(quotes.length >= 2);
    const types = new Set(quotes.map((q) => q.archetypeType));
    assert.ok(types.has("persona_1"));
    assert.ok(types.has("persona_2"));
  });
});
