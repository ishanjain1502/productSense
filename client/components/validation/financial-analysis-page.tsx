"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { FinancialAnalysisPanel } from "@/components/validation/financial-analysis-panel";
import { ValidationPageShell } from "@/components/validation/page-shell";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { runFinancialAnalysis } from "@/lib/financial-analysis-api";
import type { FinancialAnalysis } from "@/lib/financial-analysis-types";
import {
  clearFinancialAnalysisCache,
  financialAnalysisCacheKey,
  loadFinancialAnalysisCache,
  saveFinancialAnalysisCache,
} from "@/lib/financial-analysis-cache";
import {
  fleetJudgmentCacheKey,
  loadFleetJudgmentCache,
  resolveFleetJudgmentScopeId,
} from "@/lib/fleet-judgment-cache";
import {
  loadValidationSession,
  type ValidationSession,
} from "@/lib/validation-session";
import { cn } from "@/lib/utils";

type FinancialAnalysisPageProps = {
  mode: "demo" | "full";
};

export function FinancialAnalysisPage({ mode }: FinancialAnalysisPageProps) {
  const router = useRouter();
  const started = useRef(false);
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [cfoInputStatus, setCfoInputStatus] = useState<string>("");

  useEffect(() => {
    const loaded = loadValidationSession();
    if (!loaded || loaded.mode !== mode) {
      router.replace(`/${mode}`);
      return;
    }
    setSession(loaded);

    const scopeId = resolveFleetJudgmentScopeId(
      mode,
      loaded.demoId,
      loaded.featureId
    );
    const cacheKey = financialAnalysisCacheKey(
      mode,
      scopeId,
      loaded.personaFleetRunId ?? null
    );
    const cached = loadFinancialAnalysisCache(cacheKey);
    if (cached?.analysis) {
      setAnalysis(cached.analysis);
      setCfoInputStatus(cached.cfoInputStatus);
      setLoading(false);
      return;
    }

    if (started.current) return;
    started.current = true;

    let fleetJudgment = null;
    if (loaded.personaFleetRunId) {
      const judgmentKey = fleetJudgmentCacheKey(
        mode,
        scopeId,
        loaded.personaFleetRunId
      );
      fleetJudgment = loadFleetJudgmentCache(judgmentKey)?.judgment ?? null;
    }

    void runFinancialAnalysis({
      mode,
      productData: loaded.data,
      featureId: loaded.featureId,
      financialReportId: loaded.financialReportId,
      personaFleetRunId: loaded.personaFleetRunId ?? null,
      fleetJudgment,
    })
      .then((result) => {
        setAnalysis(result.analysis);
        setCfoInputStatus(result.cfoInputStatus);
        saveFinancialAnalysisCache(cacheKey, {
          personaFleetRunId: loaded.personaFleetRunId ?? null,
          analysis: result.analysis,
          cfoInputStatus: result.cfoInputStatus,
        });
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Financial analysis could not complete."
        );
      })
      .finally(() => setLoading(false));
  }, [mode, router]);

  const generateReportHref = `/${mode}/final-report?generate=1`;

  function resolveCachedAnalysis(loaded: ValidationSession) {
    const scopeId = resolveFleetJudgmentScopeId(
      mode,
      loaded.demoId,
      loaded.featureId
    );
    return loadFinancialAnalysisCache(
      financialAnalysisCacheKey(
        mode,
        scopeId,
        loaded.personaFleetRunId ?? null
      )
    );
  }

  const cachedForSession = session ? resolveCachedAnalysis(session) : null;
  const displayAnalysis = analysis ?? cachedForSession?.analysis ?? null;
  const displayCfoStatus =
    cfoInputStatus || cachedForSession?.cfoInputStatus || "";

  function handleRetry() {
    if (!session) return;
    setError(null);
    setLoading(true);
    started.current = false;

    const scopeId = resolveFleetJudgmentScopeId(
      mode,
      session.demoId,
      session.featureId
    );
    const cacheKey = financialAnalysisCacheKey(
      mode,
      scopeId,
      session.personaFleetRunId ?? null
    );
    clearFinancialAnalysisCache(cacheKey);

    let fleetJudgment = null;
    if (session.personaFleetRunId) {
      const judgmentKey = fleetJudgmentCacheKey(
        mode,
        scopeId,
        session.personaFleetRunId
      );
      fleetJudgment = loadFleetJudgmentCache(judgmentKey)?.judgment ?? null;
    }

    void runFinancialAnalysis({
      mode,
      productData: session.data,
      featureId: session.featureId,
      financialReportId: session.financialReportId,
      personaFleetRunId: session.personaFleetRunId ?? null,
      fleetJudgment,
    })
      .then((result) => {
        setAnalysis(result.analysis);
        setCfoInputStatus(result.cfoInputStatus);
        saveFinancialAnalysisCache(cacheKey, {
          personaFleetRunId: session.personaFleetRunId ?? null,
          analysis: result.analysis,
          cfoInputStatus: result.cfoInputStatus,
        });
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Financial analysis could not complete."
        );
      })
      .finally(() => setLoading(false));
  }

  return (
    <ValidationPageShell
      modeLabel={
        mode === "demo"
          ? "Demo mode · Financial analysis"
          : "Full mode · Financial analysis"
      }
      title="Financial analysis"
      description="Combines your intake financials, persona fleet market signal, and cfo.ai workspace context into a structured investment view."
    >
      <div className="space-y-6">
        <Link
          href={`/${mode}/market-analysis/persona-fleet`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Back to persona fleet
        </Link>

        {session && (
          <p className="text-sm text-muted-foreground">
            {session.data.applicationName} · {session.data.featureName}
          </p>
        )}

        {loading && !displayAnalysis && (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Reading cfo.ai workspace and formalizing analysis…
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="size-4 text-destructive" />
                Financial analysis error
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={handleRetry}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {displayAnalysis && (
          <FinancialAnalysisPanel
            analysis={displayAnalysis}
            cfoInputStatus={displayCfoStatus}
            generateReportHref={generateReportHref}
          />
        )}
      </div>
    </ValidationPageShell>
  );
}
