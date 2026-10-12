import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeThemeBatches } from "../persona-fleet/theme-map.js";
import { keywordThemeFallback } from "../persona-fleet/theme-fallback.js";

describe("mergeThemeBatches", () => {
  it("merges labels case-insensitively and sums counts", () => {
    const merged = mergeThemeBatches([
      { themes: [{ label: "Price", sentiment: "negative", countHint: 3 }] },
      { themes: [{ label: "price", sentiment: "negative", countHint: 2 }] },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].approxCount, 5);
  });
});

describe("keywordThemeFallback", () => {
  it("buckets price-related verdicts", () => {
    const themes = keywordThemeFallback([
      "Too expensive for our budget",
      "Looks useful",
    ]);
    const price = themes.find((t) => t.label === "price");
    assert.ok(price);
    assert.ok(price.approxCount >= 1);
  });
});
