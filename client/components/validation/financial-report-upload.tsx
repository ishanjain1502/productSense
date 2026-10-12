"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import {
  deleteFinancialReport,
  uploadFinancialReport,
} from "@/lib/financial-reports-api";
import { cn } from "@/lib/utils";

type FinancialReportUploadProps = {
  mode: "demo" | "full";
  demoId: string | null;
  reportId: number | null;
  fileName: string | null;
  onChange: (value: { reportId: number | null; fileName: string | null }) => void;
  readOnly?: boolean;
  className?: string;
};

export function FinancialReportUpload({
  mode,
  demoId,
  reportId,
  fileName,
  onChange,
  readOnly = false,
  className,
}: FinancialReportUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interactive = !readOnly;

  const clearLocal = () => {
    onChange({ reportId: null, fileName: null });
    setError(null);
  };

  const handleRemove = async () => {
    if (mode === "full" && reportId != null) {
      try {
        await deleteFinancialReport(reportId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not remove report."
        );
        return;
      }
    }
    clearLocal();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !interactive) return;
    if (mode === "demo" && !demoId) {
      setError("Select a sample product before uploading.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFinancialReport({
        mode,
        demoId,
        file,
      });
      onChange({
        reportId: result.reportId,
        fileName: result.originalFilename,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">Financial workbook (optional)</p>
      <FieldDescription>
        Upload a CSV or Excel workbook with your financial model or report.
      </FieldDescription>
      {fileName ? (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <FileSpreadsheet
              className="size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span className="truncate text-sm">{fileName}</span>
            {reportId != null && (
              <span className="text-xs text-muted-foreground tabular-nums">
                #{reportId}
              </span>
            )}
          </div>
          {interactive && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove financial report"
              disabled={uploading}
              onClick={() => void handleRemove()}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      ) : interactive ? (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-4 py-6 text-center transition-colors",
            uploading ? "pointer-events-none opacity-70" : "hover:bg-muted/50"
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-5 text-muted-foreground" aria-hidden />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading…" : "Upload financial report"}
          </span>
          <span className="text-xs text-muted-foreground">
            CSV or Excel (.csv, .xlsx, .xls) · max 25 MB
          </span>
          <input
            type="file"
            className="sr-only"
            accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">No workbook uploaded.</p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}
    </div>
  );
}
