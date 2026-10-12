export type FinancialAffordabilityVerdict =
  | "within_threshold"
  | "above_threshold"
  | "unclear";

export type FinancialAnalysisRecommendation =
  | "proceed"
  | "proceed_with_caution"
  | "defer"
  | "reconsider";

export type FinancialAnalysis = {
  generatedAt: string;
  feature: { name: string; description: string };
  investment: {
    thresholdUsd: number | null;
    durationWeeks: number | null;
    resourceConsumption: string;
  };
  companyHealth: {
    profitabilitySummary: string;
    runwayMonths: number | null;
  };
  marketContext: {
    fleetRecommendation: "proceed" | "iterate" | "reconsider" | null;
    fleetCompositeMean: number | null;
    note: string;
  };
  cfo: {
    status: "connected" | "not_connected" | "error";
    summary: string;
    runwayAssessment: string;
    affordabilityVerdict: FinancialAffordabilityVerdict;
    risks: string[];
    opportunities: string[];
  };
  recommendation: FinancialAnalysisRecommendation;
  executiveSummary: string;
  resourcePlan: {
    timeEstimateWeeks: number | null;
    resourceNotes: string[];
  };
  assumptions: string[];
  dataLimitations: string[];
};

export type FinancialAnalysisCache = {
  composedAt: string;
  expiresAt: number;
  personaFleetRunId: number | null;
  analysis: FinancialAnalysis;
  cfoInputStatus: string;
};

export const FINANCIAL_ANALYSIS_TTL_MS = 4 * 60 * 60 * 1000;
