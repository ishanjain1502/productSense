import { API_BASE, getStoredToken } from "@/lib/auth";
import type { FinancialAnalysis } from "@/lib/financial-analysis-types";
import type { FleetJudgment } from "@/lib/fleet-judgment-types";
import type { ProductValidationData } from "@/lib/product-validation";

export type FinancialAnalysisRunResponse = {
  analysis: FinancialAnalysis;
  cfoInputStatus: string;
};

function authHeaders(mode: "demo" | "full"): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getStoredToken();
  if (mode === "full" && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function runFinancialAnalysis(body: {
  mode: "demo" | "full";
  productData: ProductValidationData;
  featureId?: string;
  financialReportId?: number | null;
  personaFleetRunId?: number | null;
  fleetJudgment?: FleetJudgment | null;
}): Promise<FinancialAnalysisRunResponse> {
  const res = await fetch(`${API_BASE}/financial-analysis/run`, {
    method: "POST",
    headers: authHeaders(body.mode),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Financial analysis could not run"
    );
  }
  return data as FinancialAnalysisRunResponse;
}
