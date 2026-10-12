"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  function handleSignOut() {
    signOut();
    if (pathname?.startsWith("/full")) {
      router.push("/login?next=/full");
    }
  }

  if (loading) {
    return (
      <span className="text-xs text-muted-foreground">Loading…</span>
    );
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user.email}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleSignOut}
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      Sign in
    </Link>
  );
}
