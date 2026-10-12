"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FleetJudgment } from "@/lib/fleet-judgment-types";
import { cn } from "@/lib/utils";

type FleetJudgmentPanelProps = {
  judgment: FleetJudgment;
};

function recommendationVariant(
  recommendation: FleetJudgment["recommendation"]
) {
  if (recommendation === "proceed") return "default";
  if (recommendation === "iterate") return "secondary";
  return "outline";
}

export function FleetJudgmentPanel({ judgment }: FleetJudgmentPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Final judgment</CardTitle>
            <Badge variant={recommendationVariant(judgment.recommendation)}>
              {judgment.recommendation}
            </Badge>
          </div>
          <CardDescription>
            Fleet composite {judgment.fleetComposite.mean} (median{" "}
            {judgment.fleetComposite.median}) ·{" "}
            {judgment.fleetComposite.percentLikelyAdopt}% likely to adopt (≥70)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{judgment.executiveSummary}</p>
          {judgment.strengths.length > 0 && (
            <div>
              <p className="font-medium">Strengths</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {judgment.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {judgment.blockers.length > 0 && (
            <div>
              <p className="font-medium">Blockers</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {judgment.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Question scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {judgment.perQuestion.map((q) => (
            <div key={q.key} className="space-y-1">
              <p className="text-sm font-medium">{q.text}</p>
              <p className="text-xs text-muted-foreground">
                Mean {q.mean} · median {q.median} · p25–p75 {q.p25}–{q.p75}
              </p>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {Object.entries(q.histogram).map(([bucket, count]) => (
                  <div
                    key={bucket}
                    className="bg-primary/70"
                    style={{
                      width: `${(count / Math.max(1, judgment.methodology.agentCount)) * 100}%`,
                    }}
                    title={`${bucket}: ${count}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Segments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {judgment.segments.map((seg) => (
            <div
              key={seg.archetypeType}
              className="rounded-md border border-border/50 p-3"
            >
              <p className="font-medium">
                {seg.label}{" "}
                <span className="text-muted-foreground">
                  (n={seg.count}, composite {seg.compositeMean})
                </span>
              </p>
            </div>
          ))}
          {judgment.segmentInsights.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {judgment.segmentInsights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {judgment.themes.length > 0 && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Themes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {judgment.themes.map((t) => (
              <Badge
                key={`${t.label}-${t.approxCount}`}
                variant="outline"
                className={cn(
                  t.sentiment === "positive" && "border-primary/40",
                  t.sentiment === "negative" && "border-destructive/40"
                )}
              >
                {t.label} (~{t.approxCount})
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {judgment.representativeQuotes.length > 0 && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Representative quotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {judgment.representativeQuotes.map((q) => (
              <blockquote
                key={q.agentId}
                className="border-l-2 border-primary/30 pl-3 text-muted-foreground"
              >
                <p>{q.text}</p>
                <footer className="mt-1 text-xs">
                  {q.archetypeType} · score {q.compositeScore}
                </footer>
              </blockquote>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
