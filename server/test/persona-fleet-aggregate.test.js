import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  recommendationFromCompositeMean,
  aggregateFleetJudgment,
} from "../persona-fleet/aggregate.js";

describe("recommendationFromCompositeMean", () => {
  it("maps thresholds", () => {
    assert.equal(recommendationFromCompositeMean(70), "proceed");
    assert.equal(recommendationFromCompositeMean(69), "iterate");
    assert.equal(recommendationFromCompositeMean(40), "iterate");
    assert.equal(recommendationFromCompositeMean(39), "reconsider");
  });
});

describe("aggregateFleetJudgment", () => {
  it("aggregates two agents across one question", () => {
    const questions = [{ key: "fit", text: "Fit?" }];
    const personas = [
      { agentId: "a1", archetypeType: "persona_1", name: "P1" },
      { agentId: "a2", archetypeType: "persona_2", name: "P2" },
    ];
    const agentRuns = [
      {
        agent_id: "a1",
        value_json: JSON.stringify({ fit: 80, verdict: "yes" }),
      },
      {
        agent_id: "a2",
        value_json: JSON.stringify({ fit: 60, verdict: "maybe" }),
      },
    ];
    const out = aggregateFleetJudgment({
      fleetRunId: 1,
      questions,
      personas,
      agentRuns,
      productData: { featureName: "F", featureDescription: "D" },
    });
    assert.equal(out.perQuestion[0].mean, 70);
    assert.equal(out.fleetComposite.mean, 70);
    assert.equal(out.recommendation, "proceed");
    assert.equal(out.fleetComposite.percentLikelyAdopt, 50);
    assert.equal(out.segments.length, 2);
  });
});
