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
  reportId: number;
  status: string;
  strategyB: MarketReport | null;
  strategyC: MarketReport | null;
  errorB: string | null;
  errorC: string | null;
};

export type MarketAnalysisReportIndex = {
  runId: number;
  status: string;
  strategyBReportUrl: string | null;
  strategyCReportUrl: string | null;
  strategyBRawUrl: string | null;
  strategyCRawUrl: string | null;
  errorB: string | null;
  errorC: string | null;
  createdAt?: string;
};

export async function fetchMarketAnalysisReportStatus(input: {
  mode: "demo" | "full";
  runId?: number;
  featureId?: string;
}): Promise<{ found: boolean; reportId?: number }> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (input.mode === "full" && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const qs =
    input.runId != null
      ? `runId=${input.runId}`
      : input.featureId
        ? `featureId=${encodeURIComponent(input.featureId)}`
        : "";

  if (!qs) {
    throw new Error("Missing runId or featureId for status check");
  }

  const res = await fetch(`${API_BASE}/market-analysis/reports/status?${qs}`, {
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Status check failed"
    );
  }
  return data as { found: boolean; reportId?: number };
}

const TERMINAL_STATUSES = new Set(["completed", "partial", "failed"]);

function marketAnalysisAuthHeaders(
  mode: "demo" | "full"
): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (mode === "full" && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchMarketAnalysisRun(
  runId: number,
  mode: "demo" | "full"
): Promise<MarketAnalysisRunResponse> {
  const res = await fetch(`${API_BASE}/market-analysis/runs/${runId}`, {
    headers: marketAnalysisAuthHeaders(mode),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not load market run"
    );
  }
  return data as MarketAnalysisRunResponse;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMarketAnalysis(body: {
  mode: "demo" | "full";
  demoId: string | null;
  productData: ProductValidationData;
  projectId?: string;
  featureId?: string;
}): Promise<MarketAnalysisRunResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...marketAnalysisAuthHeaders(body.mode),
  };

  const res = await fetch(`${API_BASE}/market-analysis/run`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = typeof data.error === "string" ? data.error : undefined;
    if (code === "feature_id_required") {
      throw new Error(
        "This run is missing a feature id. Open the regression step again and wait for the prompt to finish loading before continuing."
      );
    }
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : code ?? "Market analysis failed"
    );
  }

  const started = data as MarketAnalysisRunResponse;
  if (TERMINAL_STATUSES.has(started.status)) {
    return started;
  }

  const runId = started.runId;
  if (!runId) {
    throw new Error("Market analysis did not return a run id");
  }

  for (let attempt = 0; attempt < 240; attempt += 1) {
    await sleep(attempt < 5 ? 2000 : 3000);
    const run = await fetchMarketAnalysisRun(runId, body.mode);
    if (TERMINAL_STATUSES.has(run.status)) {
      if (run.status === "failed" && !run.strategyB && !run.strategyC) {
        throw new Error(
          run.errorB || run.errorC || "Market analysis failed"
        );
      }
      return run;
    }
  }

  throw new Error(
    "Market analysis is still running. Refresh this page in a minute to check again."
  );
}
