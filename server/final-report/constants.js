export const FINAL_REPORT_SCHEMA_HINT = `{
  "generatedAt": "ISO-8601 string",
  "feature": {
    "applicationName": "string",
    "name": "string",
    "description": "string"
  },
  "fleetRecommendation": "proceed" | "iterate" | "reconsider",
  "finalVerdict": "ship" | "ship_with_conditions" | "iterate" | "do_not_ship",
  "verdictRationale": "string",
  "executiveSummary": "string",
  "sections": {
    "regression": {
      "status": "available" | "skipped" | "missing",
      "summary": "string",
      "highlights": ["string"],
      "risks": ["string"]
    },
    "market": {
      "status": "available" | "missing",
      "summary": "string",
      "highlights": ["string"],
      "risks": ["string"]
    },
    "personaFleet": {
      "status": "available" | "missing",
      "summary": "string",
      "recommendation": "proceed" | "iterate" | "reconsider" | null,
      "highlights": ["string"]
    },
    "financial": {
      "status": "available" | "missing",
      "summary": "string",
      "recommendation": "proceed" | "proceed_with_caution" | "defer" | "reconsider" | null,
      "highlights": ["string"]
    }
  },
  "crossCuttingThemes": ["string"],
  "conditions": ["string"],
  "dataLimitations": ["string"]
}`;
