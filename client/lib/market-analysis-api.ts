import { API_BASE, getStoredToken } from "@/lib/auth";
import type { ProductValidationData } from "@/lib/product-validation";

export type MarketReport = {
  strategy?: string;
  executiveSummary?: string;
  competitorLandscape?: Array<{
    name?: string;
    positioning?: string;
    relevantMoves?: string[];
    sources?: string[];
  }>;
  marketSignals?: Array<{
    signal?: string;
    evidence?: string;
    implicationForFeature?: string;
    source?: string;
  }>;
  gapsAndOpportunities?: string[];
  risks?: string[];
  dataLimitations?: string[];
  planSummary?: string | null;
};

export type MarketAnalysisRunResponse = {
  runId: number;
  status: string;
  strategyB: MarketReport | null;
  strategyC: MarketReport | null;
  errorB: string | null;
  errorC: string | null;
};

export async function runMarketAnalysis(body: {
  mode: "demo" | "full";
  demoId: string | null;
  productData: ProductValidationData;
  projectId?: string;
  featureId?: string;
}): Promise<MarketAnalysisRunResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getStoredToken();
  if (body.mode === "full" && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/market-analysis/run`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Market analysis failed"
    );
  }

  return data as MarketAnalysisRunResponse;
}
