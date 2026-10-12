import type { FinancialAnalysisCache } from "@/lib/financial-analysis-types";
import { FINANCIAL_ANALYSIS_TTL_MS } from "@/lib/financial-analysis-types";
import type { FinancialAnalysis } from "@/lib/financial-analysis-types";

export function financialAnalysisCacheKey(
  mode: "demo" | "full",
  scopeId: string,
  personaFleetRunId?: number | null
) {
  const fleet =
    personaFleetRunId != null ? `:fleet-${personaFleetRunId}` : "";
  return `ps:financial-analysis:${mode}:${scopeId}${fleet}`;
}

export function loadFinancialAnalysisCache(
  key: string
): FinancialAnalysisCache | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FinancialAnalysisCache;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function saveFinancialAnalysisCache(
  key: string,
  input: {
    personaFleetRunId: number | null;
    analysis: FinancialAnalysis;
    cfoInputStatus: string;
  }
) {
  const composedAt = new Date().toISOString();
  const payload: FinancialAnalysisCache = {
    personaFleetRunId: input.personaFleetRunId,
    composedAt,
    expiresAt: Date.now() + FINANCIAL_ANALYSIS_TTL_MS,
    analysis: input.analysis,
    cfoInputStatus: input.cfoInputStatus,
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function clearFinancialAnalysisCache(key: string) {
  localStorage.removeItem(key);
}
