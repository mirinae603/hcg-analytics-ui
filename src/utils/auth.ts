// src/utils/auth.ts — real JWT session storage + helpers.
//
// The backend now issues a signed JWT on POST /signin (see app/core/jwt_auth.py) and
// verifies it server-side on every protected request via `Authorization: Bearer <token>`.
// This module is the ONE place that reads/writes that session so every consumer
// (useAuth hook, chat context, admin page, api helper) agrees on the shape and storage
// keys. It intentionally does NOT depend on React — plain functions, safe to call from
// hooks, contexts, or one-off fetches alike.

export type Role = "admin" | "member";

export type StoredUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: string;
};

const TOKEN_KEY = "hcg_auth_token";
const USER_KEY = "hcg_auth_user";

// Legacy keys from the old client-only-flag "auth" — cleared on logout/expiry so a
// stale flag can never masquerade as a real session again.
const LEGACY_KEYS = ["loggedIn", "loginTime", "user"];

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: Role;
  status?: string;
  iat?: number;
  exp?: number;
};

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string | null): number {
  if (!token) return 0;
  const payload = decodeJwt(token);
  return payload?.exp ? payload.exp * 1000 : 0;
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const expiry = getTokenExpiryMs(token);
  return expiry > Date.now();
}

export function setSession(token: string, user: StoredUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable (private mode / quota) — session just won't persist */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

export function isAdmin(): boolean {
  return getUser()?.role === "admin";
}

/** Header object to spread into a fetch() call's headers — empty object when signed out. */
export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
