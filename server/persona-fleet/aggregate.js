import {
  mean,
  median,
  percentile,
  buildHistogram,
} from "./stats.js";

/**
 * @param {number} compositeMean
 */
export function recommendationFromCompositeMean(compositeMean) {
  if (compositeMean >= 70) return "proceed";
  if (compositeMean >= 40) return "iterate";
  return "reconsider";
}

/**
 * @param {string} name
 */
function segmentLabelFromPersonaName(name) {
  const idx = String(name).indexOf(" · v");
  return idx >= 0 ? String(name).slice(0, idx) : String(name);
}

/**
 * @param {Array<{ agent_id: string; value_json: string }>} agentRuns
 * @param {Array<{ agentId: string; archetypeType: string; name: string }>} personas
 * @param {Array<{ key: string; text: string }>} questions
 */
export function buildAgentRows(agentRuns, personas, questions) {
  const personaById = new Map(personas.map((p) => [p.agentId, p]));
  const questionKeys = questions.map((q) => q.key);

  return agentRuns.map((run) => {
    const persona = personaById.get(run.agent_id);
    const value = JSON.parse(run.value_json);
    const scores = {};
    for (const key of questionKeys) {
      const num = Number(value[key]);
      if (!Number.isFinite(num)) {
        throw new Error(`Agent ${run.agent_id} missing score for ${key}`);
      }
      scores[key] = Math.min(100, Math.max(0, Math.round(num)));
    }
    const compositeScore = mean(Object.values(scores));
    return {
      agentId: run.agent_id,
      archetypeType: persona?.archetypeType ?? "default",
      name: persona?.name ?? run.agent_id,
      verdict: String(value.verdict ?? ""),
      scores,
      compositeScore,
    };
  });
}

/**
 * @param {{
 *   fleetRunId: number;
 *   questions: Array<{ key: string; text: string }>;
 *   personas: Array<{ agentId: string; archetypeType: string; name: string }>;
 *   agentRuns: Array<{ agent_id: string; value_json: string }>;
 *   productData: Record<string, unknown>;
 * }} input
 */
export function aggregateFleetJudgment(input) {
  const rows = buildAgentRows(
    input.agentRuns,
    input.personas,
    input.questions
  );
  const composites = rows.map((r) => r.compositeScore);
  const fleetMean = mean(composites);
  const fleetMedian = median(composites);
  const likelyCount = rows.filter((r) => r.compositeScore >= 70).length;
  const percentLikelyAdopt =
    rows.length > 0 ? Math.round((100 * likelyCount) / rows.length) : 0;

  const perQuestion = input.questions.map((q) => {
    const scores = rows.map((r) => r.scores[q.key]);
    return {
      key: q.key,
      text: q.text,
      mean: Math.round(mean(scores) * 10) / 10,
      median: median(scores),
      p25: percentile(scores, 25),
      p75: percentile(scores, 75),
      histogram: buildHistogram(scores),
    };
  });

  const archetypeTypes = [...new Set(rows.map((r) => r.archetypeType))];
  const segments = archetypeTypes.map((archetypeType) => {
    const segRows = rows.filter((r) => r.archetypeType === archetypeType);
    const sample = segRows[0];
    const label = sample
      ? segmentLabelFromPersonaName(sample.name)
      : archetypeType;
    const perQuestionMeans = {};
    for (const q of input.questions) {
      perQuestionMeans[q.key] =
        Math.round(mean(segRows.map((r) => r.scores[q.key])) * 10) / 10;
    }
    return {
      archetypeType,
      label,
      count: segRows.length,
      compositeMean:
        Math.round(mean(segRows.map((r) => r.compositeScore)) * 10) / 10,
      perQuestionMeans,
    };
  });

  const thinSegment = segments.some((s) => s.count < 5);
  const quality = {
    agentsTotal: rows.length,
    agentsCompleted: rows.length,
    agentsMissing: 0,
    ...(thinSegment
      ? {
          confidenceNote:
            "One or more persona segments have fewer than 5 agents; segment stats may be noisy.",
        }
      : {}),
  };

  return {
    fleetRunId: input.fleetRunId,
    methodology: {
      agentCount: rows.length,
      aggregation:
        "mean_per_question; fleet_composite = mean(agent_means); recommendation from composite thresholds",
    },
    feature: {
      name: String(input.productData.featureName ?? ""),
      description: String(input.productData.featureDescription ?? ""),
    },
    recommendation: recommendationFromCompositeMean(fleetMean),
    fleetComposite: {
      mean: Math.round(fleetMean * 10) / 10,
      median: Math.round(fleetMedian * 10) / 10,
      percentLikelyAdopt,
    },
    perQuestion,
    segments,
    quality,
    agentRows: rows,
  };
}
