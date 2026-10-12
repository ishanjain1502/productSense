import { commandCodeChat } from "../commandcode.js";
import { extractJson } from "../persona-fleet/json-utils.js";
import { FINANCIAL_ANALYSIS_SCHEMA_HINT } from "./constants.js";

const SYSTEM = `You are a CFO-style financial analyst for product investment decisions.
Output ONLY valid JSON matching the schema below. No markdown fences.

Rules:
- Use intake financials (threshold, weeks, resources, profitability, runway) as primary facts.
- When cfoWorkspace is provided, ground cfo.summary, runwayAssessment, risks, and opportunities in that data only; do not invent ledger numbers not present in the payload.
- When cfoWorkspace is null, set cfo.status to not_connected or error as given, and rely on intake + market context.
- Align recommendation with affordability vs threshold and runway when data exists; use proceed_with_caution when signals conflict.
- resourcePlan.timeEstimateWeeks should match expected duration unless you justify a change in resourceNotes.
- Keep executiveSummary under 120 words.

Schema:
${FINANCIAL_ANALYSIS_SCHEMA_HINT}`;

/**
 * @param {{
 *   productData: Record<string, unknown>;
 *   cfoInput: { status: string; message?: string | null; payload: unknown };
 *   fleetJudgment?: Record<string, unknown> | null;
 * }} input
 */
export async function synthesizeFinancialAnalysis(input) {
  const productData = input.productData;
  const fleet = input.fleetJudgment;

  const marketContext = fleet
    ? {
        fleetRecommendation: fleet.recommendation ?? null,
        fleetCompositeMean: fleet.fleetComposite?.mean ?? null,
        executiveSummary: fleet.executiveSummary ?? null,
        blockers: fleet.blockers ?? [],
      }
    : null;

  const userContent = JSON.stringify({
    intake: {
      applicationName: productData.applicationName,
      featureName: productData.featureName,
      featureDescription: productData.featureDescription,
      financialThresholdAmount: productData.financialThresholdAmount,
      expectedDurationWeeks: productData.expectedDurationWeeks,
      expectedResourceConsumption: productData.expectedResourceConsumption,
      companyProfitabilityDetails: productData.companyProfitabilityDetails,
      runwayRemainingMonths: productData.runwayRemainingMonths,
      teamSize: productData.teamSize,
    },
    cfoConnectionStatus: input.cfoInput.status,
    cfoConnectionMessage: input.cfoInput.message ?? null,
    cfoWorkspace: input.cfoInput.payload,
    marketContext,
  });

  const text = await commandCodeChat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Formalize a financial analysis for this feature investment.\n\n${userContent}`,
      },
    ],
    { temperature: 0.35 }
  );

  const parsed = JSON.parse(extractJson(text));
  const cfoStatus = input.cfoInput.status;
  const allowedCfo = ["connected", "not_connected", "error"];

  return {
    generatedAt: new Date().toISOString(),
    feature: {
      name: String(productData.featureName ?? ""),
      description: String(productData.featureDescription ?? ""),
    },
    investment: {
      thresholdUsd:
        productData.financialThresholdAmount === "" ||
        productData.financialThresholdAmount == null
          ? null
          : Number(productData.financialThresholdAmount),
      durationWeeks:
        productData.expectedDurationWeeks === "" ||
        productData.expectedDurationWeeks == null
          ? null
          : Number(productData.expectedDurationWeeks),
      resourceConsumption: String(
        productData.expectedResourceConsumption ?? ""
      ),
    },
    companyHealth: {
      profitabilitySummary: String(
        productData.companyProfitabilityDetails ?? ""
      ),
      runwayMonths:
        productData.runwayRemainingMonths === "" ||
        productData.runwayRemainingMonths == null
          ? null
          : Number(productData.runwayRemainingMonths),
    },
    marketContext: parsed.marketContext ?? {
      fleetRecommendation: marketContext?.fleetRecommendation ?? null,
      fleetCompositeMean: marketContext?.fleetCompositeMean ?? null,
      note: marketContext?.executiveSummary
        ? String(marketContext.executiveSummary).slice(0, 280)
        : "No persona fleet judgment was supplied.",
    },
    cfo: {
      status: allowedCfo.includes(parsed.cfo?.status)
        ? parsed.cfo.status
        : cfoStatus === "connected"
          ? "connected"
          : cfoStatus === "error"
            ? "error"
            : "not_connected",
      summary: String(parsed.cfo?.summary ?? ""),
      runwayAssessment: String(parsed.cfo?.runwayAssessment ?? ""),
      affordabilityVerdict:
        parsed.cfo?.affordabilityVerdict === "within_threshold" ||
        parsed.cfo?.affordabilityVerdict === "above_threshold" ||
        parsed.cfo?.affordabilityVerdict === "unclear"
          ? parsed.cfo.affordabilityVerdict
          : "unclear",
      risks: Array.isArray(parsed.cfo?.risks) ? parsed.cfo.risks : [],
      opportunities: Array.isArray(parsed.cfo?.opportunities)
        ? parsed.cfo.opportunities
        : [],
    },
    recommendation:
      parsed.recommendation === "proceed" ||
      parsed.recommendation === "proceed_with_caution" ||
      parsed.recommendation === "defer" ||
      parsed.recommendation === "reconsider"
        ? parsed.recommendation
        : "proceed_with_caution",
    executiveSummary: String(parsed.executiveSummary ?? ""),
    resourcePlan: {
      timeEstimateWeeks:
        parsed.resourcePlan?.timeEstimateWeeks != null
          ? Number(parsed.resourcePlan.timeEstimateWeeks)
          : productData.expectedDurationWeeks === "" ||
              productData.expectedDurationWeeks == null
            ? null
            : Number(productData.expectedDurationWeeks),
      resourceNotes: Array.isArray(parsed.resourcePlan?.resourceNotes)
        ? parsed.resourcePlan.resourceNotes
        : [],
    },
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
    dataLimitations: Array.isArray(parsed.dataLimitations)
      ? parsed.dataLimitations
      : [],
  };
}
