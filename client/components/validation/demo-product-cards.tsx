"use client";

import { Users } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DemoApplicationSummary } from "@/lib/product-validation";
import { cn } from "@/lib/utils";

type DemoProductCardsProps = {
  applications: DemoApplicationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function DemoProductCards({
  applications,
  selectedId,
  onSelect,
}: DemoProductCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {applications.map((app) => {
        const selected = selectedId === app.id;
        return (
          <button
            key={app.id}
            type="button"
            onClick={() => onSelect(app.id)}
            className="text-left"
          >
            <Card
              className={cn(
                "h-full cursor-pointer border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md",
                selected &&
                  "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10"
              )}
            >
              <CardHeader className="gap-3">
                <CardTitle className="text-lg">{app.applicationName}</CardTitle>
                <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                  {app.applicationDescription}
                </CardDescription>
                <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                  <Users className="size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    Team size:{" "}
                    <span className="font-medium text-foreground">
                      {app.teamSize}{" "}
                      {app.teamSize === 1 ? "member" : "members"}
                    </span>
                  </span>
                </div>
              </CardHeader>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
