import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.72_0.18_285/0.25),transparent)]"
      />
      <div className="mb-8 flex w-full max-w-md items-center justify-between">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="size-4 text-primary" aria-hidden />
          productSense
        </div>
      </div>
      <div className="mb-6 w-full max-w-md space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
