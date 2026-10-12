import type { FinalReportCache, FinalValidationReport } from "@/lib/final-report-types";
import { FINAL_REPORT_TTL_MS } from "@/lib/final-report-types";

export function finalReportCacheKey(
  mode: "demo" | "full",
  scopeId: string,
  reportId: number
) {
  return `ps:final-report:${mode}:${scopeId}:${reportId}`;
}

export function loadFinalReportCache(key: string): FinalReportCache | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FinalReportCache;
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

export function saveFinalReportCache(
  key: string,
  reportId: number,
  report: FinalValidationReport
) {
  const payload: FinalReportCache = {
    reportId,
    composedAt: new Date().toISOString(),
    expiresAt: Date.now() + FINAL_REPORT_TTL_MS,
    report,
  };
  localStorage.setItem(key, JSON.stringify(payload));
}
