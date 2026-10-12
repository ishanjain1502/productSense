import {
  emptyProductValidation,
  type ProductValidationData,
} from "@/lib/product-validation";

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
  personaFleetRunId?: number;
  financialReportId?: number | null;
  financialReportFileName?: string | null;
  finalReportId?: number;
};

export function saveValidationSession(session: ValidationSession) {
  sessionStorage.setItem(VALIDATION_SESSION_KEY, JSON.stringify(session));
}

export function loadValidationSession(): ValidationSession | null {
  const raw = sessionStorage.getItem(VALIDATION_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ValidationSession;
    return {
      ...parsed,
      data: { ...emptyProductValidation(), ...parsed.data },
    };
  } catch {
    return null;
  }
}

export function clearValidationSession() {
  sessionStorage.removeItem(VALIDATION_SESSION_KEY);
}

/** Merge bootstrap ids from the regression step into the saved session. */
export function withProjectIds(
  session: ValidationSession,
  ids: {
    projectId?: string;
    featureId?: string;
    promptId?: number;
  }
): ValidationSession {
  return {
    ...session,
    promptId: ids.promptId ?? session.promptId,
    projectId: ids.projectId ?? session.projectId,
    featureId: ids.featureId ?? session.featureId,
  };
}
