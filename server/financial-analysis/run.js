import { fetchCfoInputForAnalysis } from "./cfo-insight.js";
import { synthesizeFinancialAnalysis } from "./synthesize.js";
import { loadFleetJudgmentFromCache } from "../persona-fleet/compose-judgment.js";

/**
 * @param {{
 *   userId: number | null;
 *   productData: Record<string, unknown>;
 *   financialReportId?: number | null;
 *   personaFleetRunId?: number | null;
 *   fleetJudgment?: Record<string, unknown> | null;
 * }} input
 */
export async function runFinancialAnalysis(input) {
  let fleetJudgment = input.fleetJudgment ?? null;

  if (!fleetJudgment && input.personaFleetRunId != null) {
    const cached = await loadFleetJudgmentFromCache(
      Number(input.personaFleetRunId)
    );
    if (cached) fleetJudgment = cached;
  }

  const cfoInput = await fetchCfoInputForAnalysis(
    input.userId,
    input.financialReportId ?? null
  );

  const analysis = await synthesizeFinancialAnalysis({
    productData: input.productData,
    cfoInput,
    fleetJudgment,
  });

  return {
    analysis,
    cfoInputStatus: cfoInput.status,
  };
}
