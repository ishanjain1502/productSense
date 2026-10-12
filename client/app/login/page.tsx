import { Suspense } from "react";

import { LoginPageContent } from "@/components/auth/login-page-content";

export const instant = false;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
