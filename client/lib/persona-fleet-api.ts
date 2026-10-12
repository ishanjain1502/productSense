import { API_BASE, getStoredToken } from "@/lib/auth";
import type { FleetJudgment } from "@/lib/fleet-judgment-types";
import type { ProductValidationData } from "@/lib/product-validation";

export type MarketResearchQuestion = {
  key: string;
  text: string;
};

export type PersonaFleetStartResponse = {
  fleetRunId: number;
  status: string;
  phase: string;
  questions: MarketResearchQuestion[];
  personaCount: number;
  agentsTotal: number;
  agentsCompleted: number;
  progressPercent: number;
};

export type PersonaFleetStatusResponse = {
  fleetRunId: number;
  status: string;
  phase: string;
  customerCount: number;
  agentsCompleted: number;
  agentsTotal: number;
  progressPercent: number;
  questions: MarketResearchQuestion[];
  personaCount: number;
  judgmentReady?: boolean;
  error?: string | null;
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

export async function startPersonaFleet(body: {
  mode: "demo" | "full";
  demoId: string | null;
  productData: ProductValidationData;
  projectId?: string;
  featureId?: string;
  customerCount: number;
}): Promise<PersonaFleetStartResponse> {
  const res = await fetch(`${API_BASE}/market-analysis/persona-fleet/start`, {
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
          : "Persona fleet could not start"
    );
  }
  return data as PersonaFleetStartResponse;
}

export async function fetchPersonaFleetStatus(
  fleetRunId: number,
  mode: "demo" | "full"
): Promise<PersonaFleetStatusResponse> {
  const res = await fetch(
    `${API_BASE}/market-analysis/persona-fleet/${fleetRunId}/status`,
    { headers: authHeaders(mode) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Status check failed"
    );
  }
  return data as PersonaFleetStatusResponse;
}

export async function composePersonaFleetJudgment(
  fleetRunId: number,
  mode: "demo" | "full",
  body: { productData: ProductValidationData; force?: boolean }
): Promise<FleetJudgment> {
  const res = await fetch(
    `${API_BASE}/market-analysis/persona-fleet/${fleetRunId}/judgment`,
    {
      method: "POST",
      headers: authHeaders(mode),
      body: JSON.stringify(body),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Judgment compose failed"
    );
  }
  return data as FleetJudgment;
}

export async function fetchPersonaFleetJudgment(
  fleetRunId: number,
  mode: "demo" | "full"
): Promise<FleetJudgment | null> {
  const res = await fetch(
    `${API_BASE}/market-analysis/persona-fleet/${fleetRunId}/judgment`,
    { headers: authHeaders(mode) }
  );
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Judgment fetch failed"
    );
  }
  return data as FleetJudgment;
}
