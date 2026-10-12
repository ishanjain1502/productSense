export const MAX_COMPETITORS =
  Number(process.env.MARKET_ANALYSIS_MAX_COMPETITORS) || 5;
export const JOB_LIMIT_TOTAL = 30;
export const JOB_LIMIT_PER_BATCH = 15;

export const MARKET_REPORT_SCHEMA_HINT = `
{
  "strategy": "fixed_b" | "planned_c",
  "generatedAt": "ISO-8601",
  "feature": { "name": "", "description": "" },
  "executiveSummary": "",
  "competitorLandscape": [
    { "name": "", "positioning": "", "relevantMoves": [], "sources": [] }
  ],
  "marketSignals": [
    { "signal": "", "evidence": "", "implicationForFeature": "", "source": "" }
  ],
  "gapsAndOpportunities": [],
  "risks": [],
  "dataLimitations": [],
  "planSummary": null
}
`;
