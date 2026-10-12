import type { MarketReport } from "@/lib/market-analysis-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MarketReportSectionProps = {
  title: string;
  report: MarketReport | null;
  error?: string | null;
};

export function MarketReportSection({
  title,
  report,
  error,
}: MarketReportSectionProps) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="gap-2 border-b border-border/60">
        <CardTitle className="text-lg">{title}</CardTitle>
        {error && (
          <CardDescription className="text-destructive">{error}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!report && !error && (
          <p className="text-sm text-muted-foreground">No report data.</p>
        )}
        {report?.executiveSummary && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Executive summary</h3>
            <p className="text-sm text-muted-foreground">
              {report.executiveSummary}
            </p>
          </section>
        )}
        {report?.competitorLandscape && report.competitorLandscape.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Competitor landscape</h3>
            <ul className="space-y-3 text-sm">
              {report.competitorLandscape.map((c, i) => (
                <li key={i} className="rounded-md border border-border/60 p-3">
                  <p className="font-medium">{c.name}</p>
                  {c.positioning && (
                    <p className="text-muted-foreground">{c.positioning}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {report?.marketSignals && report.marketSignals.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Market signals</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {report.marketSignals.map((s, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">
                    {s.signal}
                  </span>
                  {s.implicationForFeature && ` — ${s.implicationForFeature}`}
                </li>
              ))}
            </ul>
          </section>
        )}
        {report?.gapsAndOpportunities &&
          report.gapsAndOpportunities.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Gaps & opportunities</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {report.gapsAndOpportunities.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </section>
          )}
        {report?.risks && report.risks.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Risks</h3>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {report.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}
        {report?.dataLimitations && report.dataLimitations.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Data limitations</h3>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {report.dataLimitations.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </section>
        )}
        {report?.planSummary && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Plan summary</h3>
            <p className="text-sm text-muted-foreground">{report.planSummary}</p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
