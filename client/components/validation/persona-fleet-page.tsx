"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

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
import { Slider } from "@/components/ui/slider";
import { FieldLabel } from "@/components/ui/field";
import { FleetJudgmentPanel } from "@/components/validation/fleet-judgment-panel";
import type { FleetJudgment } from "@/lib/fleet-judgment-types";
import {
  fleetJudgmentCacheKey,
  loadFleetJudgmentCache,
  resolveFleetJudgmentScopeId,
  saveFleetJudgmentCache,
} from "@/lib/fleet-judgment-cache";
import {
  composePersonaFleetJudgment,
  fetchPersonaFleetStatus,
  startPersonaFleet,
  type PersonaFleetStatusResponse,
} from "@/lib/persona-fleet-api";
import {
  loadValidationSession,
  saveValidationSession,
  type ValidationSession,
} from "@/lib/validation-session";
import { cn } from "@/lib/utils";

type PersonaFleetPageProps = {
  mode: "demo" | "full";
};

type UiPhase =
  | "idle"
  | "starting"
  | "personas_ready"
  | "running_agents"
  | "completed"
  | "failed";

export function PersonaFleetPage({ mode }: PersonaFleetPageProps) {
  const router = useRouter();
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [customerCount, setCustomerCount] = useState(20);
  const [uiPhase, setUiPhase] = useState<UiPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PersonaFleetStatusResponse | null>(null);
  const [fleetRunId, setFleetRunId] = useState<number | null>(null);
  const [judgment, setJudgment] = useState<FleetJudgment | null>(null);
  const [judgmentLoading, setJudgmentLoading] = useState(false);
  const [judgmentError, setJudgmentError] = useState<string | null>(null);
  const judgmentRequestedRef = useRef(false);

  useEffect(() => {
    const loaded = loadValidationSession();
    if (!loaded || loaded.mode !== mode) {
      router.replace(`/${mode}`);
      return;
    }
    setSession(loaded);
    if (loaded.personaFleetRunId) {
      setFleetRunId(loaded.personaFleetRunId);
      const scopeId = resolveFleetJudgmentScopeId(
        mode,
        loaded.demoId,
        loaded.featureId
      );
      const cacheKey = fleetJudgmentCacheKey(
        mode,
        scopeId,
        loaded.personaFleetRunId
      );
      const cached = loadFleetJudgmentCache(cacheKey);
      if (cached?.judgment) {
        setJudgment(cached.judgment);
      }
      void fetchPersonaFleetStatus(loaded.personaFleetRunId, mode)
        .then((next) => {
          setStatus(next);
          if (next.status === "completed") setUiPhase("completed");
          else if (next.status === "failed") {
            setUiPhase("failed");
            setError(next.error ?? "Agent fleet run failed.");
          } else if (next.phase === "personas_ready") setUiPhase("personas_ready");
          else setUiPhase("running_agents");
        })
        .catch(() => setUiPhase("running_agents"));
    }
  }, [mode, router]);

  const composeJudgment = useCallback(
    async (id: number, productData: ValidationSession["data"]) => {
      if (judgmentRequestedRef.current) return;
      judgmentRequestedRef.current = true;
      setJudgmentLoading(true);
      setJudgmentError(null);
      try {
        const result = await composePersonaFleetJudgment(id, mode, {
          productData,
        });
        setJudgment(result);
        const scopeId = resolveFleetJudgmentScopeId(
          mode,
          session?.demoId ?? null,
          session?.featureId
        );
        saveFleetJudgmentCache(
          fleetJudgmentCacheKey(mode, scopeId, id),
          id,
          result
        );
      } catch (err) {
        judgmentRequestedRef.current = false;
        setJudgmentError(
          err instanceof Error ? err.message : "Could not compose judgment."
        );
      } finally {
        setJudgmentLoading(false);
      }
    },
    [mode, session?.demoId, session?.featureId]
  );

  useEffect(() => {
    if (
      uiPhase !== "completed" ||
      !fleetRunId ||
      !session ||
      judgment ||
      judgmentLoading
    ) {
      return;
    }
    void composeJudgment(fleetRunId, session.data);
  }, [uiPhase, fleetRunId, session, judgment, judgmentLoading, composeJudgment]);

  const pollStatus = useCallback(
    async (id: number) => {
      const next = await fetchPersonaFleetStatus(id, mode);
      setStatus(next);
      if (next.phase === "personas_ready") {
        setUiPhase("personas_ready");
      }
      if (next.phase === "running_agents") {
        setUiPhase("running_agents");
      }
      if (next.status === "completed") {
        setUiPhase("completed");
        return true;
      }
      if (next.status === "failed") {
        setUiPhase("failed");
        setError(next.error ?? "Agent fleet run failed.");
        return true;
      }
      return false;
    },
    [mode]
  );

  useEffect(() => {
    if (!fleetRunId || uiPhase === "idle" || uiPhase === "completed" || uiPhase === "failed") {
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const done = await pollStatus(fleetRunId);
        if (!cancelled && !done) {
          window.setTimeout(tick, 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load fleet status."
          );
          setUiPhase("failed");
        }
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [fleetRunId, uiPhase, pollStatus]);

  async function handleStart() {
    if (!session) return;
    setError(null);
    setUiPhase("starting");
    judgmentRequestedRef.current = false;
    setJudgment(null);
    setJudgmentError(null);
    try {
      const result = await startPersonaFleet({
        mode: session.mode,
        demoId: session.demoId,
        productData: session.data,
        projectId: session.projectId,
        featureId: session.featureId,
        customerCount,
      });
      setFleetRunId(result.fleetRunId);
      setStatus({
        fleetRunId: result.fleetRunId,
        status: result.status,
        phase: result.phase,
        customerCount,
        agentsCompleted: result.agentsCompleted,
        agentsTotal: result.agentsTotal,
        progressPercent: result.progressPercent,
        questions: result.questions,
        personaCount: result.personaCount,
      });
      setUiPhase("personas_ready");
      const updated: ValidationSession = {
        ...session,
        personaFleetRunId: result.fleetRunId,
      };
      saveValidationSession(updated);
      setSession(updated);
      window.setTimeout(() => {
        void pollStatus(result.fleetRunId);
      }, 500);
    } catch (err) {
      setUiPhase("failed");
      setError(
        err instanceof Error ? err.message : "Could not start persona fleet."
      );
    }
  }

  const progress = status?.progressPercent ?? 0;

  return (
    <ValidationPageShell
      modeLabel={
        mode === "demo"
          ? "Demo mode · Step 3b · Persona fleet"
          : "Full mode · Step 3b · Persona fleet"
      }
      title="Market analysis · Step 2 (Persona fleet)"
      description="Generate synthetic customers from your personas, then run batched agent interviews (5 at a time) to score market-fit questions from 0–100."
    >
      <div className="space-y-6">
        <Link
          href={`/${mode}/market-analysis`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Back to Crustdata step
        </Link>

        {session && (
          <p className="text-sm text-muted-foreground">
            {session.data.applicationName} · {session.data.featureName}
          </p>
        )}

        {uiPhase === "idle" && (
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Fleet size</CardTitle>
              <CardDescription>
                How many synthetic possible customers should evaluate your
                feature? (10–1000)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel>Possible customers: {customerCount}</FieldLabel>
                <Slider
                  min={10}
                  max={1000}
                  step={1}
                  value={customerCount}
                  onValueChange={setCustomerCount}
                  aria-label="Possible customers"
                />
                <p className="text-xs text-muted-foreground">
                  Personas are sampled to match the ratio of your three personas
                  plus new-install persona.
                </p>
              </div>
              <Button type="button" onClick={() => void handleStart()}>
                Start persona fleet
              </Button>
            </CardContent>
          </Card>
        )}

        {uiPhase === "starting" && (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Creating research questions and personas…
            </CardContent>
          </Card>
        )}

        {(uiPhase === "personas_ready" ||
          uiPhase === "running_agents" ||
          uiPhase === "completed") &&
          status && (
            <div className="space-y-4">
              <Card className="border-border/60 bg-card/80">
                <CardContent className="flex items-start gap-3 py-6">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Persona calculation done</p>
                    <p className="text-sm text-muted-foreground">
                      {status.personaCount} synthetic personas prepared with
                      consistent archetype ratios.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Research questions</CardTitle>
                  <CardDescription>
                    Each agent scores these from 0 (low) to 100 (high).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal space-y-2 pl-5 text-sm">
                    {status.questions.map((q) => (
                      <li key={q.key}>
                        <span className="text-muted-foreground">{q.key}: </span>
                        {q.text}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Agent interviews</CardTitle>
                  <CardDescription>
                    Running CommandCode agents in batches of 5.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {uiPhase !== "completed" && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <span>
                        {status.agentsCompleted} / {status.agentsTotal} agents
                        ({progress}%)
                      </span>
                    </div>
                  )}
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {uiPhase === "completed" && (
                    <div className="flex items-start gap-3 pt-2">
                      <CheckCircle2 className="mt-0.5 size-5 text-primary" />
                      <p className="font-medium">Insights have been gathered</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {judgmentLoading && (
                <Card className="border-border/60 bg-card/80">
                  <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    Composing final judgment…
                  </CardContent>
                </Card>
              )}

              {judgmentError && (
                <Card className="border-destructive/40 bg-destructive/5">
                  <CardContent className="flex flex-col gap-3 py-6 text-sm text-destructive">
                    <p>{judgmentError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => {
                        if (!fleetRunId || !session) return;
                        judgmentRequestedRef.current = false;
                        void composeJudgment(fleetRunId, session.data);
                      }}
                    >
                      Retry judgment
                    </Button>
                  </CardContent>
                </Card>
              )}

              {judgment && !judgmentLoading && (
                <FleetJudgmentPanel judgment={judgment} />
              )}

              {uiPhase === "completed" && (
                <div className="flex flex-col items-end gap-2 border-t border-border/60 pt-6">
                  {judgmentLoading && (
                    <p className="text-xs text-muted-foreground">
                      Final judgment still composing — you can continue to
                      financial analysis.
                    </p>
                  )}
                  <Link
                    href={`/${mode}/financial-analysis`}
                    className={cn(buttonVariants())}
                  >
                    Next: financial analysis →
                  </Link>
                </div>
              )}
            </div>
          )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="size-4 text-destructive" />
                Persona fleet error
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setUiPhase("idle");
                  setFleetRunId(null);
                  setStatus(null);
                }}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ValidationPageShell>
  );
}
