"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { FinancialAnalysis } from "@/lib/financial-analysis-types";
import { cn } from "@/lib/utils";

type FinancialAnalysisPanelProps = {
  analysis: FinancialAnalysis;
  cfoInputStatus: string;
  generateReportHref?: string;
};

function recommendationLabel(
  recommendation: FinancialAnalysis["recommendation"]
) {
  switch (recommendation) {
    case "proceed":
      return "Proceed";
    case "proceed_with_caution":
      return "Proceed with caution";
    case "defer":
      return "Defer";
    case "reconsider":
      return "Reconsider";
    default:
      return recommendation;
  }
}

function formatUsd(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function FinancialAnalysisPanel({
  analysis,
  cfoInputStatus,
  generateReportHref,
}: FinancialAnalysisPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Financial verdict</CardTitle>
            <Badge variant="secondary">
              {recommendationLabel(analysis.recommendation)}
            </Badge>
            <Badge variant="outline">cfo.ai: {cfoInputStatus}</Badge>
          </div>
          <CardDescription>
            Investment threshold {formatUsd(analysis.investment.thresholdUsd)} ·{" "}
            {analysis.investment.durationWeeks ?? "—"} weeks planned · runway{" "}
            {analysis.companyHealth.runwayMonths ?? "—"} months
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{analysis.executiveSummary}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Investment & resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {analysis.investment.resourceConsumption || "No resource plan provided."}
          </p>
          {analysis.resourcePlan.resourceNotes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {analysis.resourcePlan.resourceNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Time estimate: {analysis.resourcePlan.timeEstimateWeeks ?? "—"} weeks
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Company health</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {analysis.companyHealth.profitabilitySummary ||
            "No profitability details provided."}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">cfo.ai (Ari) perspective</CardTitle>
          <CardDescription>
            Affordability: {analysis.cfo.affordabilityVerdict.replace(/_/g, " ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{analysis.cfo.summary || "No cfo.ai workspace summary available."}</p>
          {analysis.cfo.runwayAssessment && (
            <p className="text-muted-foreground">{analysis.cfo.runwayAssessment}</p>
          )}
          {analysis.cfo.risks.length > 0 && (
            <div>
              <p className="font-medium">Risks</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {analysis.cfo.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.cfo.opportunities.length > 0 && (
            <div>
              <p className="font-medium">Opportunities</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {analysis.cfo.opportunities.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.marketContext.note && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Market context</CardTitle>
            <CardDescription>
              Fleet recommendation:{" "}
              {analysis.marketContext.fleetRecommendation ?? "—"} · composite{" "}
              {analysis.marketContext.fleetCompositeMean ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {analysis.marketContext.note}
          </CardContent>
        </Card>
      )}

      {(analysis.assumptions.length > 0 ||
        analysis.dataLimitations.length > 0) && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Assumptions & limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {analysis.assumptions.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {analysis.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
            {analysis.dataLimitations.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {analysis.dataLimitations.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {generateReportHref && (
        <div className="flex justify-end border-t border-border/60 pt-6">
          <Link href={generateReportHref} className={cn(buttonVariants())}>
            Generate report →
          </Link>
        </div>
      )}
    </div>
  );
}
