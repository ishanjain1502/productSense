"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FinalValidationReport } from "@/lib/final-report-types";

type FinalReportPanelProps = {
  report: FinalValidationReport;
  reportId: number;
};

function statusLabel(status: string) {
  if (status === "available") return "Available";
  if (status === "skipped") return "Skipped";
  return "Missing";
}

export function FinalReportPanel({ report, reportId }: FinalReportPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Report #{reportId}</p>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">
            {report.feature.applicationName} · {report.feature.name}
          </CardTitle>
          <CardDescription>{report.feature.description}</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge>Fleet: {report.fleetRecommendation}</Badge>
            <Badge variant="secondary">Ship: {report.finalVerdict}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{report.executiveSummary}</p>
          {report.verdictRationale && (
            <p className="text-muted-foreground">{report.verdictRationale}</p>
          )}
        </CardContent>
      </Card>

      <SectionCard
        title="1. Code regression"
        status={report.sections.regression.status}
        summary={report.sections.regression.summary}
        highlights={report.sections.regression.highlights}
        risks={report.sections.regression.risks}
      />

      <SectionCard
        title="2. Market (Crustdata · Strategy C)"
        status={report.sections.market.status}
        summary={report.sections.market.summary}
        highlights={report.sections.market.highlights}
        risks={report.sections.market.risks}
      />

      <SectionCard
        title="3. Persona fleet"
        status={report.sections.personaFleet.status}
        summary={report.sections.personaFleet.summary}
        highlights={report.sections.personaFleet.highlights}
        extra={
          report.sections.personaFleet.recommendation
            ? `Recommendation: ${report.sections.personaFleet.recommendation}`
            : undefined
        }
      />

      <SectionCard
        title="4. Financial analysis"
        status={report.sections.financial.status}
        summary={report.sections.financial.summary}
        highlights={report.sections.financial.highlights}
        extra={
          report.sections.financial.recommendation
            ? `Recommendation: ${report.sections.financial.recommendation}`
            : undefined
        }
      />

      {report.crossCuttingThemes.length > 0 && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Cross-cutting themes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {report.crossCuttingThemes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {report.conditions.length > 0 && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Conditions to ship</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {report.conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {report.dataLimitations.length > 0 && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Data limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {report.dataLimitations.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionCard({
  title,
  status,
  summary,
  highlights,
  risks,
  extra,
}: {
  title: string;
  status: string;
  summary: string;
  highlights: string[];
  risks?: string[];
  extra?: string;
}) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline">{statusLabel(status)}</Badge>
        </div>
        {extra && <CardDescription>{extra}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>{summary || "No summary available for this section."}</p>
        {highlights.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        {risks && risks.length > 0 && (
          <div>
            <p className="font-medium">Risks</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
