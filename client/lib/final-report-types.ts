export type FinalVerdict =
  | "ship"
  | "ship_with_conditions"
  | "iterate"
  | "do_not_ship";

export type FleetRecommendation = "proceed" | "iterate" | "reconsider";

export type FinalReportSectionStatus = "available" | "skipped" | "missing";

export type FinalValidationReport = {
  generatedAt: string;
  feature: {
    applicationName: string;
    name: string;
    description: string;
  };
  fleetRecommendation: FleetRecommendation;
  finalVerdict: FinalVerdict;
  verdictRationale: string;
  executiveSummary: string;
  sections: {
    regression: {
      status: FinalReportSectionStatus;
      summary: string;
      highlights: string[];
      risks: string[];
    };
    market: {
      status: "available" | "missing";
      summary: string;
      highlights: string[];
      risks: string[];
    };
    personaFleet: {
      status: "available" | "missing";
      summary: string;
      recommendation: FleetRecommendation | null;
      highlights: string[];
    };
    financial: {
      status: "available" | "missing";
      summary: string;
      recommendation:
        | "proceed"
        | "proceed_with_caution"
        | "defer"
        | "reconsider"
        | null;
      highlights: string[];
    };
  };
  crossCuttingThemes: string[];
  conditions: string[];
  dataLimitations: string[];
};

export type FinalReportCache = {
  reportId: number;
  composedAt: string;
  expiresAt: number;
  report: FinalValidationReport;
};

export const FINAL_REPORT_TTL_MS = 4 * 60 * 60 * 1000;
