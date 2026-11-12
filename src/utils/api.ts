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

/**
 * Consume a `text/event-stream` POST response (the AI Analyst's streaming chat turn).
 * Not built on EventSource — it only does unauthenticated GET, and this needs a bearer
 * header on a POST body. Reads the fetch body stream by hand, splits it on the SSE
 * blank-line delimiter, and calls `onEvent` for every `data: {...}` payload in order.
 * `{"type":"end"}` is the wire-level stream terminator (see chat.py) and is swallowed
 * here rather than handed to the caller, so callers only ever see real orchestrator
 * events (step/sql/answer/chart/table/persisted/error/done).
 */
export async function streamFetch(
  path: string,
  body: unknown,
  onEvent: (ev: any) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${DASHBOARD_API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let detail: unknown = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      detail = j?.detail ?? j?.message ?? detail;
    } catch { /* no/invalid JSON body */ }
    if (res.status === 401) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
        window.location.href = "/signin";
      }
    }
    throw new ApiError(res.status, detail);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming isn't supported in this browser response");
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sep: number;
    // SSE frames are separated by a blank line; a frame may itself span multiple `\n`
    // (only "data: " lines matter here — the backend never sends id:/event: lines).
    while ((sep = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = line.slice("data: ".length);
      if (payload.trim() === '{"type": "end"}') continue;
      try { onEvent(JSON.parse(payload)); } catch { /* malformed frame — skip, don't kill the stream */ }
    }
  }
}
