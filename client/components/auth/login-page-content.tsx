"use client";

import { useSearchParams } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export function LoginPageContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const nextPath = next && next.startsWith("/") ? next : "/full";

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to use full mode and save your validation context."
    >
      <AuthForm mode="login" nextPath={nextPath} />
    </AuthShell>
  );
}
