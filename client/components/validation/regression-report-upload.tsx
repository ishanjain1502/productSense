"use client";

import { useRef, useState } from "react";
import { FileJson, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { uploadRegressionReport } from "@/lib/regression-api";
import { cn } from "@/lib/utils";

type RegressionReportUploadProps = {
  mode: "demo" | "full";
  demoId: string | null;
  promptId: number;
  featureId?: string;
  disabled?: boolean;
  onUploaded: (reportId: number) => void;
  className?: string;
};

export function RegressionReportUpload({
  mode,
  demoId,
  promptId,
  featureId,
  disabled = false,
  onUploaded,
  className,
}: RegressionReportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Choose a .json file from your coding agent.");
      return;
    }

    setUploading(true);
    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON. Export the agent report as JSON and try again.");
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("The file must contain one JSON object.");
      }

      const result = await uploadRegressionReport({
        mode,
        demoId,
        promptId,
        featureId,
        payload: parsed as Record<string, unknown>,
      });
      onUploaded(result.reportId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Try again."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 size-4" />
              Upload regression JSON
            </>
          )}
        </Button>
        {fileName && !uploading && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileJson className="size-4 shrink-0" />
            {fileName}
          </span>
        )}
      </div>
      <FieldDescription>
        If the agent did not POST to the backend, save its report as JSON and
        upload it here. We attach promptId{" "}
        <span className="tabular-nums">{promptId}</span>
        {featureId ? (
          <>
            {" "}
            and featureId <span className="font-mono text-xs">{featureId}</span>
          </>
        ) : null}{" "}
        when they are missing from the file.
      </FieldDescription>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
