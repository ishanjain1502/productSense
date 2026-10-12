import { API_BASE, getStoredToken } from "@/lib/auth";
import type { ProductValidationData } from "@/lib/product-validation";

export type AgentPromptResponse = {
  prompt: string;
  promptId: number;
  mode: "demo" | "full";
  generatedBy: "constant" | "commandcode";
};

export async function fetchAgentPrompt(input: {
  mode: "demo" | "full";
  demoId: string | null;
  productData: ProductValidationData;
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
