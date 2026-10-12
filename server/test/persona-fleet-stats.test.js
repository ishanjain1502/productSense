import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  median,
  percentile,
  histogramBucket,
  mean,
} from "../persona-fleet/stats.js";

describe("stats", () => {
  it("median and mean", () => {
    assert.equal(mean([10, 20, 30]), 20);
    assert.equal(median([10, 20, 30]), 20);
    assert.equal(median([10, 20]), 15);
  });
  it("percentile linear", () => {
    const xs = [0, 10, 20, 30, 40];
    assert.equal(percentile(xs, 25), 10);
    assert.equal(percentile(xs, 75), 30);
  });
  it("histogram buckets", () => {
    assert.equal(histogramBucket(0), "0-19");
    assert.equal(histogramBucket(19), "0-19");
    assert.equal(histogramBucket(80), "80-100");
  });
});
