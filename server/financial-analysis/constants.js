export const FINANCIAL_ANALYSIS_SCHEMA_HINT = `{
  "generatedAt": "ISO-8601 string",
  "feature": { "name": "string", "description": "string" },
  "investment": {
    "thresholdUsd": number | null,
    "durationWeeks": number | null,
    "resourceConsumption": "string"
  },
  "companyHealth": {
    "profitabilitySummary": "string",
    "runwayMonths": number | null
  },
  "marketContext": {
    "fleetRecommendation": "proceed" | "iterate" | "reconsider" | null,
    "fleetCompositeMean": number | null,
    "note": "string"
  },
  "cfo": {
    "status": "connected" | "not_connected" | "error",
    "summary": "string",
    "runwayAssessment": "string",
    "affordabilityVerdict": "within_threshold" | "above_threshold" | "unclear",
    "risks": ["string"],
    "opportunities": ["string"]
  },
  "recommendation": "proceed" | "proceed_with_caution" | "defer" | "reconsider",
  "executiveSummary": "string",
  "resourcePlan": {
    "timeEstimateWeeks": number | null,
    "resourceNotes": ["string"]
  },
  "assumptions": ["string"],
  "dataLimitations": ["string"]
}`;
