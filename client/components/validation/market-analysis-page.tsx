"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { MarketReportSection } from "@/components/validation/market-report-section";
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
import { fetchAgentPrompt } from "@/lib/regression-api";
import { runMarketAnalysis } from "@/lib/market-analysis-api";
import {
  loadValidationSession,
  saveValidationSession,
  withProjectIds,
  type ValidationSession,
} from "@/lib/validation-session";
import { cn } from "@/lib/utils";

type MarketAnalysisPageProps = {
  mode: "demo" | "full";
};

export function MarketAnalysisPage({ mode }: MarketAnalysisPageProps) {
  const router = useRouter();
  const runAttempt = useRef(0);
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof runMarketAnalysis>
  > | null>(null);

  useEffect(() => {
    const loaded = loadValidationSession();
    if (!loaded || loaded.mode !== mode) {
      router.replace(`/${mode}`);
      return;
    }
    setSession(loaded);

    const attemptId = ++runAttempt.current;

    void (async () => {
      try {
        let active = loaded;

        if (active.mode === "full" && !active.featureId && active.promptId) {
          const boot = await fetchAgentPrompt({
            mode: active.mode,
            demoId: active.demoId,
            productData: active.data,
            financialReportId: active.financialReportId,
            projectId: active.projectId,
            featureId: active.featureId,
            promptId: active.promptId,
          });
          active = withProjectIds(active, {
            promptId: boot.promptId,
            projectId: boot.projectId,
            featureId: boot.featureId,
          });
          saveValidationSession(active);
          setSession(active);
        }

        if (active.mode === "full" && !active.featureId) {
          if (attemptId === runAttempt.current) {
            router.replace(`/${mode}/agent-prompt`);
          }
          return;
        }

        if (attemptId !== runAttempt.current) return;

        const data = await runMarketAnalysis({
          mode: active.mode,
          demoId: active.demoId,
          productData: active.data,
          projectId: active.projectId,
          featureId: active.featureId,
        });
        setResult(data);
        const updated: ValidationSession = {
          ...active,
          marketAnalysisRunId: data.runId,
          marketAnalysisReportId: data.reportId,
        };
        saveValidationSession(updated);
        setSession(updated);
      } catch (err) {
        if (attemptId !== runAttempt.current) return;
        setError(
          err instanceof Error ? err.message : "Market analysis could not run."
        );
      } finally {
        if (attemptId === runAttempt.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      runAttempt.current += 1;
    };
  }, [mode, router]);

  return (
    <ValidationPageShell
      modeLabel={
        mode === "demo"
          ? "Demo mode · Step 3 · Market analysis"
          : "Full mode · Step 3 · Market analysis"
      }
      title="Market analysis · Step 1 (Crustdata)"
      description="Running fixed-query (B) and LLM-planned (C) strategies for competitive and market signals. Testing phase: both reports are shown."
    >
      <div className="space-y-6">
        <Link
          href={`/${mode}/agent-prompt`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Back to regression
        </Link>

        {loading && (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Running market analysis (strategies B and C)…
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="size-4 text-destructive" />
                Market analysis failed
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={() => router.refresh()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {result && session && (
          <div className="space-y-8">
            <p className="text-sm text-muted-foreground">
              {session.data.applicationName} · {session.data.featureName}
              {result.runId ? ` · Run #${result.runId}` : ""}
            </p>
            <MarketReportSection
              title="Strategy B — fixed queries"
              report={result.strategyB}
              error={result.errorB}
            />
            <MarketReportSection
              title="Strategy C — LLM-planned queries"
              report={result.strategyC}
              error={result.errorC}
            />
            <div className="flex justify-end border-t border-border/60 pt-6">
              <Link
                href={`/${mode}/market-analysis/persona-fleet`}
                className={cn(buttonVariants())}
              >
                Next: persona fleet →
              </Link>
            </div>
          </div>
        )}
      </div>
    </ValidationPageShell>
  );
}
