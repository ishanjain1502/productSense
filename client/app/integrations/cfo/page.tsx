import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";

import { AuthNav } from "@/components/auth/auth-nav";
import { CfoConnectCard } from "@/components/integrations/cfo-connect-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CfoIntegrationPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6 sm:px-8">
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
          <div className="flex flex-wrap items-center gap-3">
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
            <AuthNav />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            cfo.ai integration
          </h1>
          <p className="text-sm text-muted-foreground">
            Authorize the server to use your cfo.ai workspace (separate from
            Cursor&apos;s MCP connection).
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 pb-12 sm:px-8">
        <CfoConnectCard />
      </main>
    </div>
  );
}
