"use client";

import { FileText, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentAttachmentProps = {
  label: string;
  fileName: string | null;
  onFileSelect?: (fileName: string | null) => void;
  readOnly?: boolean;
  accept?: string;
  className?: string;
};

export function DocumentAttachment({
  label,
  fileName,
  onFileSelect,
  readOnly = false,
  accept = ".pdf,.doc,.docx,.ppt,.pptx",
  className,
}: DocumentAttachmentProps) {
  const interactive = !readOnly && onFileSelect;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{label}</p>
      {fileName ? (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate text-sm">{fileName}</span>
          </div>
          {interactive && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove attachment"
              onClick={() => onFileSelect?.(null)}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      ) : interactive ? (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-4 py-6 text-center transition-colors hover:bg-muted/50"
        >
          <Upload className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-sm text-muted-foreground">
            Upload a document for further information
          </span>
          <span className="text-xs text-muted-foreground">
            PDF, Word, or PowerPoint
          </span>
          <input
            type="file"
            className="sr-only"
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0];
              onFileSelect?.(file ? file.name : null);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">No document attached.</p>
      )}
    </div>
  );
}
