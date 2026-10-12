"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CopyablePromptBlockProps = {
  value: string;
  label?: string;
};

export function CopyablePromptBlock({
  value,
  label = "Coding agent prompt",
}: CopyablePromptBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void copy()}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy prompt
            </>
          )}
        </Button>
      </div>
      <Textarea
        readOnly
        value={value}
        rows={22}
        className="font-mono text-xs leading-relaxed"
        aria-label={label}
      />
    </div>
  );
}
