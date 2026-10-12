import { gatherFinalReportEvidence } from "./gather.js";
import { persistFinalReport } from "./persist.js";
import { synthesizeFinalReport } from "./synthesize.js";

/**
 * @param {Record<string, unknown>} input
 */
export async function runFinalReportGeneration(input) {
  const evidence = await gatherFinalReportEvidence(input);
  const report = await synthesizeFinalReport(evidence);

  const { reportId } = await persistFinalReport({
    userId: input.userId ?? null,
    projectId: input.projectId ?? null,
    featureId: input.featureId ?? null,
    mode: input.mode,
    demoId: input.demoId ?? null,
    promptId: input.promptId ?? null,
    marketAnalysisRunId: input.marketAnalysisRunId ?? null,
    personaFleetRunId: input.personaFleetRunId ?? null,
    report,
  });

  return {
    reportId,
    report,
    generatedAt: report.generatedAt,
  };
}
