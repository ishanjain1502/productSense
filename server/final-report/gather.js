import { getMarketAnalysisRun } from "../market-analysis/run.js";
import { readReportFile } from "../report-storage.js";
import { loadFleetJudgmentFromCache } from "../persona-fleet/compose-judgment.js";
import {
  loadRegressionReportByFeatureId,
  loadRegressionReportByPromptId,
} from "../regression.js";

const MAX_STRING = 4000;
const MAX_ARRAY = 12;

/**
 * @param {unknown} value
 * @param {number} max
 */
function truncateString(value, max = MAX_STRING) {
  const s = String(value ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * @param {unknown} arr
 * @param {number} max
 */
function capArray(arr, max = MAX_ARRAY) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, max).map((item) =>
    typeof item === "string" ? truncateString(item, 500) : item
  );
}

/**
 * @param {Record<string, unknown>} input
 */
export async function gatherFinalReportEvidence(input) {
  const {
    regressionSkipped,
    promptId,
    featureId,
    userId,
    marketAnalysisRunId,
    personaFleetRunId,
    fleetJudgment,
    financialAnalysis,
    productData,
  } = input;

  let regressionSection = { status: "missing", payload: null };
  if (regressionSkipped) {
    regressionSection = { status: "skipped", payload: null };
  } else if (promptId != null) {
    const payload = await loadRegressionReportByPromptId(Number(promptId));
    regressionSection = payload
      ? { status: "available", payload: trimRegression(payload) }
      : { status: "missing", payload: null };
  } else if (featureId && userId) {
    const payload = await loadRegressionReportByFeatureId(
      String(featureId),
      Number(userId)
    );
    regressionSection = payload
      ? { status: "available", payload: trimRegression(payload) }
      : { status: "missing", payload: null };
  }

  let marketSection = { status: "missing", payload: null };
  if (marketAnalysisRunId != null) {
    const run = await getMarketAnalysisRun(Number(marketAnalysisRunId));
    if (run?.strategy_c_report_url) {
      try {
        const strategyC = await readReportFile(run.strategy_c_report_url);
        marketSection = {
          status: "available",
          payload: trimMarket(strategyC),
          errorC: run.error_c ?? null,
        };
      } catch {
        marketSection = {
          status: "missing",
          payload: null,
          errorC: run.error_c ?? "strategy_c_unreadable",
        };
      }
    } else {
      marketSection = {
        status: "missing",
        payload: null,
        errorC: run?.error_c ?? "strategy_c_not_found",
      };
    }
  }

  let fleetSection = { status: "missing", payload: null };
  let fleetPayload = fleetJudgment ?? null;
  if (!fleetPayload && personaFleetRunId != null) {
    fleetPayload = await loadFleetJudgmentFromCache(Number(personaFleetRunId));
  }
  if (fleetPayload) {
    fleetSection = {
      status: "available",
      payload: trimFleet(fleetPayload),
    };
  }

  const financialSection = financialAnalysis
    ? { status: "available", payload: financialAnalysis }
    : { status: "missing", payload: null };

  return {
    product: {
      applicationName: productData?.applicationName,
      featureName: productData?.featureName,
      featureDescription: productData?.featureDescription,
    },
    regression: regressionSection,
    market: marketSection,
    personaFleet: fleetSection,
    financial: financialSection,
  };
}

/**
 * @param {Record<string, unknown>} raw
 */
function trimRegression(raw) {
  return {
    summary: truncateString(raw.summary),
    blastRadius: truncateString(raw.blastRadius),
    impactedComponents: capArray(raw.impactedComponents),
    apiAndDataImpact: truncateString(raw.apiAndDataImpact),
    regressionTests: capArray(raw.regressionTests),
    rolloutRisks: capArray(raw.rolloutRisks),
    recommendedMitigations: capArray(raw.recommendedMitigations),
    entireInsights: truncateString(raw.entireInsights, 6000),
  };
}

/**
 * @param {Record<string, unknown>} raw
 */
function trimMarket(raw) {
  return {
    executiveSummary: truncateString(raw.executiveSummary),
    competitorLandscape: capArray(raw.competitorLandscape, 8),
    marketSignals: capArray(raw.marketSignals, 10),
    gapsAndOpportunities: capArray(raw.gapsAndOpportunities),
    risks: capArray(raw.risks),
    dataLimitations: capArray(raw.dataLimitations),
    planSummary: raw.planSummary
      ? truncateString(raw.planSummary)
      : null,
  };
}

/**
 * @param {Record<string, unknown>} raw
 */
function trimFleet(raw) {
  return {
    recommendation: raw.recommendation,
    fleetComposite: raw.fleetComposite,
    executiveSummary: truncateString(raw.executiveSummary),
    strengths: capArray(raw.strengths),
    blockers: capArray(raw.blockers),
    themes: capArray(raw.themes, 8),
    perQuestion: capArray(raw.perQuestion, 5),
    dataLimitations: capArray(raw.dataLimitations),
  };
}
