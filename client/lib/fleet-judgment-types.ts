export type FleetRecommendation = "proceed" | "iterate" | "reconsider";

export type FleetJudgment = {
  fleetRunId: number;
  generatedAt: string;
  methodology: {
    agentCount: number;
    aggregation: string;
  };
  feature: { name: string; description: string };
  recommendation: FleetRecommendation;
  fleetComposite: {
    mean: number;
    median: number;
    percentLikelyAdopt: number;
  };
  perQuestion: Array<{
    key: string;
    text: string;
    mean: number;
    median: number;
    p25: number;
    p75: number;
    histogram: Record<string, number>;
  }>;
  segments: Array<{
    archetypeType: string;
    label: string;
    count: number;
    compositeMean: number;
    perQuestionMeans: Record<string, number>;
  }>;
  themes: Array<{
    label: string;
    sentiment: "positive" | "mixed" | "negative";
    approxCount: number;
  }>;
  executiveSummary: string;
  strengths: string[];
  blockers: string[];
  segmentInsights: string[];
  representativeQuotes: Array<{
    agentId: string;
    archetypeType: string;
    compositeScore: number;
    text: string;
  }>;
  dataLimitations: string[];
  quality?: {
    agentsTotal: number;
    agentsCompleted: number;
    agentsMissing: number;
    confidenceNote?: string;
  };
};

export type FleetJudgmentCache = {
  fleetRunId: number;
  composedAt: string;
  expiresAt: number;
  judgment: FleetJudgment;
};

export const FLEET_JUDGMENT_TTL_MS = 4 * 60 * 60 * 1000;
