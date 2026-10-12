import type { ProductValidationData } from "@/lib/product-validation";

export const VALIDATION_SESSION_KEY = "ps-validation-session";

export type ValidationSession = {
  mode: "demo" | "full";
  demoId: string | null;
  data: ProductValidationData;
  promptId?: number;
  projectId?: string;
  featureId?: string;
  regressionSkipped?: boolean;
  regressionCheckPassed?: boolean;
  marketAnalysisRunId?: number;
  marketAnalysisReportId?: number;
};

export function saveValidationSession(session: ValidationSession) {
  sessionStorage.setItem(VALIDATION_SESSION_KEY, JSON.stringify(session));
}

export function loadValidationSession(): ValidationSession | null {
  const raw = sessionStorage.getItem(VALIDATION_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ValidationSession;
  } catch {
    return null;
  }
}

export function clearValidationSession() {
  sessionStorage.removeItem(VALIDATION_SESSION_KEY);
}
