"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { CopyablePromptBlock } from "@/components/validation/copyable-prompt-block";
import { ValidationPageShell } from "@/components/validation/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { checkRegressionReport, fetchAgentPrompt } from "@/lib/regression-api";
import {
  loadValidationSession,
  saveValidationSession,
  type ValidationSession,
} from "@/lib/validation-session";
import { cn } from "@/lib/utils";

type AgentPromptPageProps = {
  mode: "demo" | "full";
};

export function AgentPromptPage({ mode }: AgentPromptPageProps) {
  const router = useRouter();
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    generatedBy: string;
    promptId: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checkPassed, setCheckPassed] = useState(false);

  useEffect(() => {
    const loaded = loadValidationSession();
    if (!loaded || loaded.mode !== mode) {
      router.replace(`/${mode}`);
      return;
    }
    if (mode === "demo" && !loaded.demoId) {
      router.replace("/demo");
      return;
    }
    setSession(loaded);
    if (loaded.regressionCheckPassed) {
      setCheckPassed(true);
    }

    void (async () => {
      try {
        const result = await fetchAgentPrompt({
          mode: loaded.mode,
          demoId: loaded.demoId,
          productData: loaded.data,
          financialReportId: loaded.financialReportId,
        });
        setPrompt(result.prompt);
        setMeta({
          generatedBy: result.generatedBy,
          promptId: result.promptId,
        });
        const updated: ValidationSession = {
          ...loaded,
          promptId: result.promptId,
          projectId: result.projectId ?? loaded.projectId,
          featureId: result.featureId ?? loaded.featureId,
        };
        saveValidationSession(updated);
        setSession(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load agent prompt."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, router]);

  const title =
    mode === "demo"
      ? "Agent regression prompt (demo)"
      : "Agent regression prompt";

  const description =
    mode === "demo"
      ? "Copy this prompt into your coding agent. It is fixed per sample product and uses ASD-STE100 technical language."
      : "This prompt was generated with CommandCode (DeepSeek v4) from your form. Copy it into your coding agent to run regression analysis and POST the report to the backend.";

  const goToMarket = () => {
    router.push(`/${mode}/market-analysis`);
  };

  const handleSkip = () => {
    if (!session) return;
    const updated = { ...session, regressionSkipped: true };
    saveValidationSession(updated);
    goToMarket();
  };

  const handleCheck = async () => {
    if (!session || !meta) return;
    setCheckLoading(true);
    setCheckMessage(null);
    try {
      const status = await checkRegressionReport({
        mode: session.mode,
        promptId: meta.promptId,
        featureId: session.featureId,
      });
      if (status.found) {
        setCheckPassed(true);
        const updated = { ...session, regressionCheckPassed: true };
        saveValidationSession(updated);
        setSession(updated);
        setCheckMessage(
          status.reportId
            ? `Report found (id ${status.reportId}). You can continue to market analysis.`
            : "Report found. You can continue to market analysis."
        );
      } else {
        setCheckPassed(false);
        setCheckMessage(
          "No report found yet. Run the agent and POST to the backend, then check again."
        );
      }
    } catch (err) {
      setCheckMessage(
        err instanceof Error ? err.message : "Could not check report status."
      );
    } finally {
      setCheckLoading(false);
    }
  };

  return (
    <ValidationPageShell
      modeLabel={mode === "demo" ? "Demo mode · Step 2" : "Full mode · Step 2"}
      title={title}
      description={description}
    >
      <div className="space-y-6">
        <Link
          href={`/${mode}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Edit product context
        </Link>

        {loading && (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              {mode === "full"
                ? "Generating agent prompt with CommandCode…"
                : "Loading demo prompt…"}
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="size-4 text-destructive" />
                Prompt not available
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.refresh()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {prompt && session && (
            <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
              <CardHeader className="gap-2 border-b border-border/60">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">
                    {session.data.applicationName}
                  </CardTitle>
                  <Badge variant="secondary">{session.data.featureName}</Badge>
                  {meta && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {meta.generatedBy === "commandcode"
                          ? "CommandCode · DeepSeek v4"
                          : "Demo template"}
                      </Badge>
                      <Badge variant="outline" className="text-xs tabular-nums">
                        promptId {meta.promptId}
                      </Badge>
                    </>
                  )}
                </div>
                <CardDescription>
                  Give this block to your coding agent. The agent should use
                  Entire.io (search, checkpoints, sessions, Skills) when
                  available, then return blast radius, regression tests, risks,
                  and entireInsights, and POST JSON to your ProductSense backend
                  (include promptId in the JSON body).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <CopyablePromptBlock value={prompt} />
              </CardContent>
            </Card>
        )}

        {session && (
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Next: market analysis</CardTitle>
              <CardDescription>
                After the agent POSTs a regression report, click Check. Use Skip
                below to continue without a report (demo and full mode).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={checkLoading || !meta}
                  onClick={() => void handleCheck()}
                >
                  {checkLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    "Check for report"
                  )}
                </Button>
                <Button
                  type="button"
                  disabled={!checkPassed}
                  onClick={goToMarket}
                >
                  Go ahead to market analysis
                </Button>
              </div>
              <div className="border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleSkip}
                >
                  Skip regression
                </Button>
              </div>
              {checkMessage && (
                <p className="text-sm text-muted-foreground">{checkMessage}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ValidationPageShell>
  );
}
