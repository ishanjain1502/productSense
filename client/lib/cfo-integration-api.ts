import { API_BASE, getStoredToken } from "@/lib/auth";

export type CfoIntegrationStatus =
  | { status: "needs_auth" }
  | {
      status: "connected";
      orgId?: string | null;
      connectedAt?: string | null;
    }
  | { status: "unavailable"; error?: string };

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Sign in required.");
  }
  return { Authorization: `Bearer ${token}` };
}

export async function fetchCfoIntegrationStatus(): Promise<CfoIntegrationStatus> {
  const res = await fetch(`${API_BASE}/integrations/cfo/status`, {
    headers: authHeaders(),
  });
  const data = (await res.json()) as CfoIntegrationStatus;
  if (!res.ok) {
    throw new Error(
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: string }).error)
        : "status_failed"
    );
  }
  return data;
}

export async function startCfoAuthorization(): Promise<
  | { status: "authorize"; authorizationUrl: string }
  | { status: "connected"; orgCount?: number; primaryOrg?: { orgId: string; name: string; slug: string } }
> {
  const res = await fetch(`${API_BASE}/integrations/cfo/connect/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "connect_failed"
    );
  }
  return data;
}

export async function disconnectCfoIntegration(): Promise<void> {
  const res = await fetch(`${API_BASE}/integrations/cfo/disconnect`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data?.error === "string" ? data.error : "disconnect_failed"
    );
  }
}
