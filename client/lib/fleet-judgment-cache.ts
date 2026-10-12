import type { FleetJudgment, FleetJudgmentCache } from "@/lib/fleet-judgment-types";
import { FLEET_JUDGMENT_TTL_MS } from "@/lib/fleet-judgment-types";

export function fleetJudgmentCacheKey(
  mode: "demo" | "full",
  scopeId: string,
  fleetRunId: number
) {
  return `ps:fleet-judgment:${mode}:${scopeId}:${fleetRunId}`;
}

export function resolveFleetJudgmentScopeId(
  mode: "demo" | "full",
  demoId: string | null,
  featureId?: string
) {
  if (mode === "full" && featureId) return featureId;
  if (demoId) return demoId;
  return "anonymous";
}

export function loadFleetJudgmentCache(
  key: string
): FleetJudgmentCache | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FleetJudgmentCache;
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

export function saveFleetJudgmentCache(
  key: string,
  fleetRunId: number,
  judgment: FleetJudgment
) {
  const composedAt = new Date().toISOString();
  const payload: FleetJudgmentCache = {
    fleetRunId,
    composedAt,
    expiresAt: Date.now() + FLEET_JUDGMENT_TTL_MS,
    judgment,
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function clearFleetJudgmentCache(key: string) {
  localStorage.removeItem(key);
}
