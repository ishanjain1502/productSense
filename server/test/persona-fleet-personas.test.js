import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allocateCounts,
  buildPersonaFleet,
} from "../persona-fleet/personas.js";

describe("allocateCounts", () => {
  it("distributes remainder across buckets", () => {
    assert.deepEqual(allocateCounts(20, 4), [5, 5, 5, 5]);
    assert.deepEqual(allocateCounts(21, 4), [6, 5, 5, 5]);
    assert.deepEqual(allocateCounts(10, 4), [3, 3, 2, 2]);
  });
});

describe("buildPersonaFleet", () => {
  it("creates n personas with four archetype buckets", () => {
    const productData = {
      personas: [
        { name: "A", description: "one" },
        { name: "B", description: "two" },
        { name: "C", description: "three" },
      ],
      newInstallPersona: { name: "N", description: "new" },
      targetMarket: "SMB",
    };
    const fleet = buildPersonaFleet(productData, 20);
    assert.equal(fleet.length, 20);
    const types = fleet.map((p) => p.archetypeType);
    const counts = {
      persona_1: types.filter((t) => t === "persona_1").length,
      persona_2: types.filter((t) => t === "persona_2").length,
      persona_3: types.filter((t) => t === "persona_3").length,
      new_install: types.filter((t) => t === "new_install").length,
    };
    assert.deepEqual(counts, {
      persona_1: 5,
      persona_2: 5,
      persona_3: 5,
      new_install: 5,
    });
  });
});
