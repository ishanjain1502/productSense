import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ValidationPageShellProps = {
  modeLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function ValidationPageShell({
  modeLabel,
  title,
  description,
  children,
}: ValidationPageShellProps) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.72_0.18_285/0.25),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.25] [background-image:linear-gradient(to_right,oklch(0.5_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0/0.06)_1px,transparent_1px)] [background-size:3rem_3rem]"
      />

      <header className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-2"
            )}
          >
            <ArrowLeft className="size-4" />
            Back home
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              aria-hidden
            >
              <Layers className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              productSense
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <Badge variant="secondary" className="mb-1">
            {modeLabel}
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{description}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 sm:px-8">
        {children}
      </div>
    </div>
  );
}
