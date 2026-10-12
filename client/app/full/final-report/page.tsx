import { Suspense } from "react";

import { FinalReportPage } from "@/components/validation/final-report-page";

export default function FullFinalReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <FinalReportPage mode="full" />
    </Suspense>
  );
}
