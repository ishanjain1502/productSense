import Link from "next/link";
import {
  ArrowRight,
  FlaskConical,
  Layers,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { AuthNav } from "@/components/auth/auth-nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const highlights = [
  {
    icon: Target,
    title: "Test the bet",
    description:
      "Pressure-test your feature idea against real demand signals—not gut feel.",
  },
  {
    icon: FlaskConical,
    title: "Evidence, not opinions",
    description:
      "See what supports or contradicts the plan before engineering time is spent.",
  },
  {
    icon: Zap,
    title: "Decide faster",
    description:
      "Go build, pivot, or kill—with a clearer picture of validity.",
  },
] as const;

export function HomeHero() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.72_0.18_285/0.35),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/4 -z-10 size-[28rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 -z-10 size-80 rounded-full bg-chart-2/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,oklch(0.5_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0/0.06)_1px,transparent_1px)] [background-size:3rem_3rem]"
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-2">
          <span
            className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
            aria-hidden
          >
            <Layers className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-muted-foreground">product</span>
            <span className="bg-linear-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Sense
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Sparkles className="size-3.5" />
            Demo — no login
          </Badge>
          <AuthNav />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 pt-4 sm:px-8">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            Feature validation
          </p>
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl md:text-6xl">
            Check if the feature you&apos;re planning is{" "}
            <span className="bg-linear-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
              actually valid
            </span>{" "}
            or not.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            ProductSense helps product teams sanity-check ideas before they hit
            the roadmap—so you build what matters and skip what doesn&apos;t.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href="/demo"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-12 min-w-[11rem] gap-2 px-6 text-base shadow-md shadow-primary/20"
            )}
          >
            Demo mode
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/full"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 min-w-[11rem] gap-2 px-6 text-base"
            )}
          >
            Full mode
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <Separator className="my-14 max-w-3xl" />

        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm"
            >
              <CardHeader className="gap-3">
                <span
                  className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden
                >
                  <Icon className="size-5" />
                </span>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
