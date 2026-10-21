"use client";
// The app's single loading identity.
//
// `GlobalLoader` patches window.fetch at MODULE load (before any component effect) so it
// catches even the very first request — important because the backend sleeps after ~15 min
// idle and can take a while to answer the first call. Slow calls are surfaced *non-blockingly*:
// a 2px indeterminate rail along the top edge plus a small translucent pill in the corner.
// Nothing is dimmed, nothing is covered, and the page stays fully interactive throughout.
//
// The same patch is where the session reaches the backend: every backend request gets
// `Authorization: Bearer <token>` (unless the caller already set one, as apiFetch does), and
// a 401 clears the session and sends the browser to /signin once. Most pages call raw
// `fetch`, so without this only the admin page and the AI chat ever carried the token.
//
// Two deliberate exclusions:
//   • AI Analyst traffic (/ai/*, /chat/*) is never counted — those calls are long by design
//     (the analyst streams a multi-step answer) and the chat renders its own in-thread
//     typing indicator, so a global indicator on top of it is pure noise.
//   • Requests that finish inside ~450ms never render anything at all (anti-flicker).
//
// Shared state lives on `window` so a single tracker survives dev HMR re-evals.
import { useEffect, useState } from "react";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { getToken, clearSession } from "@/utils/auth";

const BASE = (DASHBOARD_API_BASE_URL || "").replace(/\/+$/, "");
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const COLD = new Set([502, 503, 504]); // "service still waking" responses

// Backend path prefixes the indicator must ignore. Matched as path segments so any route
// the AI Analyst adds later (/ai/anything, /chat/anything) is exempt automatically.
const UNTRACKED_PREFIXES = ["/ai", "/chat"];

// Backend paths that ESTABLISH a session rather than present one: they never carry a token,
// and their 401 ("wrong password") belongs to the sign-in form, not to the session handler.
const AUTH_PATHS = ["/signin", "/signup"];

/** The path part of a backend `url` — no query, no hash. */
function backendPath(url: string): string {
  // Collapse repeated leading slashes before matching. Hosted environments often set
  // NEXT_PUBLIC_DASHBOARD_API with a trailing slash, which makes callers build
  // "https://host//chat/sessions"; without this the prefix would silently stop matching
  // and every chat message would light up the global indicator again.
  return url.slice(BASE.length).split("?")[0].split("#")[0].replace(/^\/+/, "/");
}

/** true when `url` is a backend URL belonging to the AI Analyst (chat, mentions, stream). */
function isUntracked(url: string): boolean {
  const rest = backendPath(url);
  return UNTRACKED_PREFIXES.some((p) => rest === p || rest.startsWith(`${p}/`));
}

type GlState = { active: number; subs: Set<() => void> };
type WGL = Window & { __gl?: GlState; __glPatched?: boolean; __authRedirecting?: boolean };

/** `init` with the session's bearer token added. Left untouched when there is no session
 *  or the caller already sent an Authorization header (apiFetch, streamFetch). A Request's
 *  own headers are carried over, because headers in `init` replace them wholesale. */
function withAuth(input: RequestInfo | URL, init: RequestInit | undefined, token: string | null): RequestInit | undefined {
  if (!token) return init;
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (headers.has("Authorization")) return init;
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

/** A 401 means the session is gone (expired, revoked, signed with another secret). A page
 *  fires many calls at once and every one of them comes back 401, so clear the session and
 *  redirect exactly once. `sent` is the token the failed call carried: if a newer sign-in
 *  has replaced it since, the 401 is about the old session and must not end the new one. */
function onUnauthorized(sent: string | null) {
  const w = window as WGL;
  if (w.__authRedirecting || getToken() !== sent) return;
  clearSession();
  const here = window.location.pathname;
  if (here === "/signin" || here === "/signup") return;
  w.__authRedirecting = true;
  window.location.href = "/signin";
}

function store(): GlState {
  const w = window as WGL;
  if (!w.__gl) w.__gl = { active: 0, subs: new Set() };
  return w.__gl;
}

function notifyAll() {
  store().subs.forEach((f) => f());
}

// ---- patch fetch once, at module load (before React effects) ----
if (typeof window !== "undefined" && BASE && !(window as WGL).__glPatched) {
  (window as WGL).__glPatched = true;
  const st = store();
  const notify = notifyAll;
  const orig = window.fetch.bind(window);
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    let url = "";
    try { url = typeof input === "string" ? input : (input as Request)?.url || String(input); } catch { /* noop */ }
    const backend = !!url && url.startsWith(BASE);
    if (!backend) return orig(input, init);

    const authCall = AUTH_PATHS.includes(backendPath(url));
    const token = authCall ? null : getToken();
    const req = authCall ? init : withAuth(input, init, token);
    const watch = (p: Promise<Response>) => {
      if (!authCall) p.then((res) => { if (res.status === 401) onUnauthorized(token); }, () => { /* the caller handles it */ });
      return p;
    };

    // AI Analyst calls still get the cold-start retry below — they just never light up the
    // global indicator, because the chat thread shows its own progress inline.
    const counted = !isUntracked(url);
    if (counted) { st.active += 1; notify(); }
    const done = () => { if (!counted) return; st.active = Math.max(0, st.active - 1); notify(); };

    let method = "GET";
    try { method = String(req?.method || (typeof input !== "string" && (input as Request).method) || "GET").toUpperCase(); } catch { /* noop */ }

    // Only idempotent GETs self-heal the cold start (never retry POST like /signin).
    if (method !== "GET") {
      const p = orig(input, req);
      p.then(done, done);
      return watch(p);
    }
    // A caller-cancelled request (AbortController — used by tables/charts on param
    // change or React re-mount) must NOT be retried; otherwise it would hold the
    // indicator up for the full ~50s wake window. Detect abort and bail immediately.
    const sig = req?.signal || (typeof input !== "string" ? (input as Request).signal : undefined);
    const isAbort = (e: any) => (e && (e.name === "AbortError" || e.name === "DOMException")) || !!sig?.aborted;

    // Retry a waking backend (502/503/504 or network error) for up to ~50s, keeping
    // the indicator up, so pages get real data instead of falling back to zeros.
    const attempt = async (left: number): Promise<Response> => {
      try {
        const res = await orig(input, req);
        if (COLD.has(res.status) && left > 0) { await wait(3000); return attempt(left - 1); }
        return res;
      } catch (e) {
        if (!isAbort(e) && left > 0) { await wait(3000); return attempt(left - 1); }
        throw e;
      }
    };
    const p = attempt(16);
    p.then(done, done);
    return watch(p);
  } as typeof window.fetch;
}

// ---------------------------------------------------------------------------
// Presentation — shared by GlobalLoader and by LoaderOverlay so the whole app has
// exactly ONE loading language. Monochrome (app ink), translucent, non-blocking.
// ---------------------------------------------------------------------------

const CSS = `
@keyframes hcgLoadRail { 0% { transform: translateX(-105%); } 100% { transform: translateX(430%); } }
@keyframes hcgLoadSpin { to { transform: rotate(360deg); } }

.hcg-load {
  position: fixed; inset: 0; z-index: 9999;
  pointer-events: none;               /* never blocks a click, never covers content */
  opacity: 0; visibility: hidden;
  transition: opacity .3s ease, visibility 0s linear .3s;
}
.hcg-load[data-visible="true"] {
  opacity: 1; visibility: visible;
  transition: opacity .3s ease, visibility 0s linear 0s;
}

.hcg-load-rail {
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  overflow: hidden; background: rgba(26, 31, 54, 0.05);
}
.hcg-load-rail > span {
  position: absolute; top: 0; bottom: 0; left: 0; width: 24%; border-radius: 2px;
  background: linear-gradient(90deg, rgba(26,31,54,0) 0%, rgba(26,31,54,0.34) 38%, rgba(26,31,54,0.44) 62%, rgba(26,31,54,0) 100%);
  animation: hcgLoadRail 1.45s cubic-bezier(.45,.05,.35,1) infinite;
}

.hcg-load-pill {
  /* 64px clears the Next dev-tools badge locally; 106px clears the 88px icon rail on desktop */
  position: absolute; bottom: 18px; left: 64px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 13px 6px 11px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
  backdrop-filter: blur(10px) saturate(1.08);
  border: 1px solid rgba(26, 31, 54, 0.06);
  box-shadow: 0 8px 22px -14px rgba(20, 24, 40, 0.35), 0 1px 2px rgba(20, 24, 40, 0.04);
  transform: translateY(6px);
  transition: transform .34s cubic-bezier(.22, 1, .36, 1);
}
@media (min-width: 1024px) { .hcg-load-pill { left: 106px; } }
.hcg-load[data-visible="true"] .hcg-load-pill { transform: translateY(0); }

.hcg-load-ring {
  width: 13px; height: 13px; border-radius: 50%; box-sizing: border-box;
  border: 1.5px solid rgba(26, 31, 54, 0.13);
  border-top-color: rgba(26, 31, 54, 0.55);
  animation: hcgLoadSpin .72s linear infinite;
}

.hcg-load-text {
  font-size: 12px; font-weight: 500; letter-spacing: .005em;
  color: #4b5468; white-space: nowrap;
}

/* idle: stop burning frames behind an invisible layer */
.hcg-load[data-visible="false"] .hcg-load-rail > span,
.hcg-load[data-visible="false"] .hcg-load-ring { animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  .hcg-load-rail > span { animation: none; width: 100%; background: rgba(26, 31, 54, 0.16); }
  .hcg-load-ring { animation: none; border-top-color: rgba(26, 31, 54, 0.3); }
  .hcg-load-pill { transform: none; transition: none; }
  .hcg-load { transition: opacity .15s linear, visibility 0s linear .15s; }
  .hcg-load[data-visible="true"] { transition: opacity .15s linear; }
}
`;

export type LoadingIndicatorProps = {
  /** whether something is in flight; the indicator fades itself in/out around this */
  active?: boolean;
  /** anti-flicker delay before anything is drawn (ms) */
  delay?: number;
  /** after this long the wording softens (ms) */
  slowAfter?: number;
};

/**
 * The app-wide loading treatment: a hairline indeterminate rail on the top edge and a
 * small translucent pill in the corner. Non-blocking and non-obscuring by design — it
 * reports that work is happening without claiming progress it cannot measure.
 */
export function LoadingIndicator({ active = true, delay = 450, slowAfter = 6000 }: LoadingIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) { setVisible(false); setSlow(false); return; }
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setSlow(true), slowAfter);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, delay, slowAfter]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="hcg-load" data-visible={visible ? "true" : "false"} role="status" aria-live="polite" aria-hidden={!visible}>
        <div className="hcg-load-rail"><span /></div>
        <div className="hcg-load-pill">
          <span className="hcg-load-ring" />
          <span className="hcg-load-text">{slow ? "Still loading" : "Loading"}</span>
        </div>
      </div>
    </>
  );
}

/**
 * Registers a NON-fetch loading source (a page that gates on its own state) with the very
 * same counter the fetch patch feeds. It renders nothing: the single <GlobalLoader/> in the
 * root layout stays the only thing that ever draws the indicator. That matters — two
 * components each rendering their own copy would stack two translucent pills and two rails
 * in the same place, and translucency compounds, so the "subtle" treatment would render
 * visibly darker exactly when the app is busiest.
 */
export function useLoadingBeacon(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const st = store();
    st.active += 1;
    notifyAll();
    return () => {
      st.active = Math.max(0, st.active - 1);
      notifyAll();
    };
  }, [active]);
}

export default function GlobalLoader() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const st = store();
    const update = () => setBusy(st.active > 0);
    st.subs.add(update);
    update();
    return () => { st.subs.delete(update); };
  }, []);

  return <LoadingIndicator active={busy} />;
}
