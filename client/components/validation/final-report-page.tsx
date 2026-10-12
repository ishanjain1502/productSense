"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { FinalReportPanel } from "@/components/validation/final-report-panel";
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
import {
  financialAnalysisCacheKey,
  loadFinancialAnalysisCache,
} from "@/lib/financial-analysis-cache";
import {
  fetchFinalReport,
  generateFinalReport,
} from "@/lib/final-report-api";
import type { FinalValidationReport } from "@/lib/final-report-types";
import {
  finalReportCacheKey,
  saveFinalReportCache,
} from "@/lib/final-report-cache";
import {
  fleetJudgmentCacheKey,
  loadFleetJudgmentCache,
  resolveFleetJudgmentScopeId,
} from "@/lib/fleet-judgment-cache";
import {
  loadValidationSession,
  saveValidationSession,
  type ValidationSession,
} from "@/lib/validation-session";
import { cn } from "@/lib/utils";

type FinalReportPageProps = {
  mode: "demo" | "full";
};

export function FinalReportPage({ mode }: FinalReportPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const generateRequested = searchParams.get("generate") === "1";
  const started = useRef(false);
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FinalValidationReport | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);

  const runGenerate = useCallback(
    async (loaded: ValidationSession) => {
      const scopeId = resolveFleetJudgmentScopeId(
        mode,
        loaded.demoId,
        loaded.featureId
      );

      let fleetJudgment = null;
      if (loaded.personaFleetRunId) {
        fleetJudgment =
          loadFleetJudgmentCache(
            fleetJudgmentCacheKey(mode, scopeId, loaded.personaFleetRunId)
          )?.judgment ?? null;
      }

      const financialCache = loadFinancialAnalysisCache(
        financialAnalysisCacheKey(
          mode,
          scopeId,
          loaded.personaFleetRunId ?? null
        )
      );

      const result = await generateFinalReport({
        mode,
        demoId: loaded.demoId,
        productData: loaded.data,
        projectId: loaded.projectId,
        featureId: loaded.featureId,
        promptId: loaded.promptId,
        marketAnalysisRunId: loaded.marketAnalysisRunId,
        personaFleetRunId: loaded.personaFleetRunId ?? null,
        regressionSkipped: loaded.regressionSkipped === true,
        fleetJudgment,
        financialAnalysis: financialCache?.analysis ?? null,
      });

      setReport(result.report);
      setReportId(result.reportId);
      saveFinalReportCache(
        finalReportCacheKey(mode, scopeId, result.reportId),
        result.reportId,
        result.report
      );
      const updated: ValidationSession = {
        ...loaded,
        finalReportId: result.reportId,
      };
      saveValidationSession(updated);
      setSession(updated);
    },
    [mode]
  );

  useEffect(() => {
    const loaded = loadValidationSession();
    if (!loaded || loaded.mode !== mode) {
      router.replace(`/${mode}`);
      return;
    }
    setSession(loaded);

    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        if (
          !generateRequested &&
          loaded.finalReportId != null &&
          Number.isFinite(loaded.finalReportId)
        ) {
          const fromServer = await fetchFinalReport(
            loaded.finalReportId,
            mode,
            loaded.demoId
          );
          setReport(fromServer.report);
          setReportId(fromServer.reportId);
          setLoading(false);
          return;
        }

        await runGenerate(loaded);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load final report."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, router, generateRequested, runGenerate]);

  async function handleRegenerate() {
    if (!session) return;
    setError(null);
    setLoading(true);
    started.current = false;
    try {
      await runGenerate(session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate final report."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ValidationPageShell
      modeLabel={
        mode === "demo"
          ? "Demo mode · Final validation report"
          : "Full mode · Final validation report"
      }
      title="Feature validation report"
      description="One-page synthesis of regression, market, persona fleet, and financial analysis."
    >
      <div className="space-y-6">
        <Link
          href={`/${mode}/financial-analysis`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Back to financial analysis
        </Link>

        {loading && (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Composing validation report…
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="size-4 text-destructive" />
                Report error
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={handleRegenerate}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {report && reportId != null && !loading && (
          <>
            <FinalReportPanel report={report} reportId={reportId} />
            <div className="flex justify-end border-t border-border/60 pt-6">
              <Button type="button" variant="outline" onClick={handleRegenerate}>
                Generate new report
              </Button>
            </div>
          </>
        )}
      </div>
    </ValidationPageShell>
  );
}
