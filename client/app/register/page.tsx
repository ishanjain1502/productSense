import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const instant = false;

export default function RegisterPage() {
  return (
    <AuthShell
      title="Get started"
      description="Create a free account in seconds—email and password only."
    >
      <AuthForm mode="register" nextPath="/full" />
    </AuthShell>
  );
}
