import { API_BASE, getStoredToken } from "@/lib/auth";
import type { ProductValidationData } from "@/lib/product-validation";

export type AgentPromptResponse = {
  prompt: string;
  promptId: number;
  mode: "demo" | "full";
  generatedBy: "constant" | "commandcode";
  projectId?: string;
  featureId?: string;
};

export async function fetchAgentPrompt(input: {
  mode: "demo" | "full";
  demoId: string | null;
  productData: ProductValidationData;
  financialReportId?: number | null;
}): Promise<AgentPromptResponse> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (input.mode === "full" && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/regression/agent-prompt`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: input.mode,
      demoId: input.demoId,
      productData: input.productData,
      financialReportId: input.financialReportId ?? undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Failed to generate agent prompt";
    throw new Error(message);
  }

  return data as AgentPromptResponse;
}

export async function checkRegressionReport(input: {
  mode: "demo" | "full";
  promptId?: number;
  featureId?: string;
}): Promise<{ found: boolean; reportId?: number }> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (input.mode === "full" && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const qs =
    input.mode === "demo" && input.promptId != null
      ? `promptId=${input.promptId}`
      : input.featureId
        ? `featureId=${encodeURIComponent(input.featureId)}`
        : "";

  if (!qs) {
    throw new Error("Missing promptId or featureId for status check");
  }

  const res = await fetch(`${API_BASE}/regression/reports/status?${qs}`, {
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
