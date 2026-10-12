import { API_BASE, getStoredToken } from "@/lib/auth";
import type { FinancialAnalysis } from "@/lib/financial-analysis-types";
import type { FinalValidationReport } from "@/lib/final-report-types";
import type { FleetJudgment } from "@/lib/fleet-judgment-types";
import type { ProductValidationData } from "@/lib/product-validation";

export type GenerateFinalReportResponse = {
  reportId: number;
  report: FinalValidationReport;
  generatedAt: string;
};

export type FetchFinalReportResponse = {
  reportId: number;
  report: FinalValidationReport;
  featureId: string | null;
  projectId: string | null;
  userId: number | null;
  createdAt: string;
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

export async function generateFinalReport(body: {
  mode: "demo" | "full";
  demoId: string | null;
  productData: ProductValidationData;
  projectId?: string;
  featureId?: string;
  promptId?: number;
  marketAnalysisRunId?: number;
  personaFleetRunId?: number | null;
  regressionSkipped?: boolean;
  fleetJudgment?: FleetJudgment | null;
  financialAnalysis?: FinancialAnalysis | null;
}): Promise<GenerateFinalReportResponse> {
  const res = await fetch(`${API_BASE}/final-report/generate`, {
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
          : "Could not generate final report"
    );
  }
  return data as GenerateFinalReportResponse;
}

export async function fetchFinalReport(
  reportId: number,
  mode: "demo" | "full",
  demoId: string | null
): Promise<FetchFinalReportResponse> {
  const qs =
    mode === "demo" && demoId
      ? `?demoId=${encodeURIComponent(demoId)}`
      : "";
  const res = await fetch(`${API_BASE}/final-report/${reportId}${qs}`, {
    headers: authHeaders(mode),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not load report"
    );
  }
  return data as FetchFinalReportResponse;
}
