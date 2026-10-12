export const AUTH_COOKIE = "ps_token";
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:1337";

export type AuthUser = {
  id: number;
  email: string;
  createdAt?: string;
};

export function setAuthCookie(token: string) {
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getStoredToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  if (!res.ok) {
    throw Object.assign(new Error("request_failed"), { status: res.status, data });
  }
  return data;
}

export async function register(email: string, password: string) {
  return parseJson<{ token: string; user: AuthUser }>(
    await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function login(email: string, password: string) {
  return parseJson<{ token: string; user: AuthUser }>(
    await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function fetchMe(token: string) {
  return parseJson<{ user: AuthUser }>(
    await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

export function authErrorMessage(error: string | undefined): string {
  switch (error) {
    case "invalid_email":
      return "Enter a valid email address.";
    case "password_too_short":
      return "Password must be at least 8 characters.";
    case "email_in_use":
      return "An account with this email already exists.";
    case "invalid_credentials":
      return "Incorrect email or password.";
    default:
      return "Something went wrong. Try again.";
  }
}
