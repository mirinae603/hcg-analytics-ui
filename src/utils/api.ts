// src/utils/api.ts — small authenticated-fetch helper shared by the admin page and the
// shared-chat context. Attaches the bearer token from src/utils/auth.ts to every call,
// and on a 401 (expired/invalid/missing token) clears the stale session and bounces to
// /signin rather than leaving the caller to figure out what a raw 401 means.
import { DASHBOARD_API_BASE_URL } from "./config";
import { authHeader, clearSession } from "./auth";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `Request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${DASHBOARD_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* no/invalid JSON body */
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
        window.location.href = "/signin";
      }
    }
    const detail = (body as { detail?: unknown; message?: unknown })?.detail
      ?? (body as { message?: unknown })?.message
      ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }

  return body as T;
}
