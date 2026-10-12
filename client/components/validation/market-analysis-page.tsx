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
import { runMarketAnalysis } from "@/lib/market-analysis-api";
import {
  loadValidationSession,
  saveValidationSession,
  type ValidationSession,
} from "@/lib/validation-session";
import { cn } from "@/lib/utils";

type MarketAnalysisPageProps = {
  mode: "demo" | "full";
};

export function MarketAnalysisPage({ mode }: MarketAnalysisPageProps) {
  const router = useRouter();
  const started = useRef(false);
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

    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const data = await runMarketAnalysis({
          mode: loaded.mode,
          demoId: loaded.demoId,
          productData: loaded.data,
          projectId: loaded.projectId,
          featureId: loaded.featureId,
        });
        setResult(data);
        const updated: ValidationSession = {
          ...loaded,
          marketAnalysisRunId: data.runId,
          marketAnalysisReportId: data.reportId,
        };
        saveValidationSession(updated);
        setSession(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Market analysis could not run."
        );
      } finally {
        setLoading(false);
      }
    })();
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
          </div>
        )}
      </div>
    </ValidationPageShell>
  );
}
