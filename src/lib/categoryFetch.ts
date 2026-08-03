// Transport-level category scoping.
//
// WHY THIS EXISTS
// The first attempt at the global category filter hand-wired `catParam` into ~17
// components. It missed the single most visible component in the app — the
// executive cards on /inventory (AnalyticsHomeScreenCards), which do their own
// fetches and know nothing about scope. So the user picked "Onco Drugs" and the
// biggest numbers on the screen did not move. Per-file wiring is *how* that gap
// happened; adding an 18th file would only move the gap somewhere else.
//
// So the scope is applied where every request has to pass anyway: window.fetch.
// A component now opts *out* (by naming the param itself) rather than opting in,
// which inverts the failure mode — a component someone forgets about is scoped
// correctly by default instead of silently unscoped.
//
// This is not a novel hack here: GlobalLoader.tsx already patches window.fetch to
// observe the same set of requests. See the coexistence notes below.
//
// FOUR INVARIANTS, in order of how badly breaking them would hurt:
//
//  1. ONLY the dashboard API. The predicate is `url.startsWith(BASE)` — byte-identical
//     to GlobalLoader's. Google Fonts, Next's own HMR/RSC traffic, telemetry: untouched.
//
//  2. ONLY endpoints the backend can actually scope, per src/lib/categoryScope.ts.
//     That module stays the single source of truth; nothing here re-decides. Some
//     endpoints (purchase-value) return zero rows under a Category and would read as
//     "HCG buys no onco drugs"; others have no material grain at all and would show an
//     unfiltered number under a filtered label. Both are worse than not filtering, so
//     the allowlist fails closed.
//
//  3. NEVER double-append. The ~17 hand-wired components still pass Category
//     explicitly; they must keep working, not end up with `?Category=X&Category=X`.
//     If the URL already carries the param, it is left exactly as-is — the caller wins.
//
//  4. NEVER mutate the rest of the URL. The rewrite is a string concat, not a
//     URL/URLSearchParams round-trip, because several call sites build query strings
//     by hand (unencoded spaces, repeated keys, table filter syntax) that a
//     re-serialisation would quietly normalise into something the backend reads
//     differently.
import { DASHBOARD_API_BASE_URL } from '@/utils/config'
import { CATEGORY_STORAGE_KEY } from '@/context/CategoryContext'
import { isCategoryScopedPath } from '@/lib/categoryScope'

const BASE = (DASHBOARD_API_BASE_URL || '').replace(/\/+$/, '')

type Patched = Window & { __catScopePatched?: boolean }

// ── active scope ─────────────────────────────────────────────────────────────
// Read from localStorage rather than React state. A patched fetch cannot use
// hooks, and CategoryContext.setSelectedCategory writes localStorage in the same
// synchronous tick as setState — so this can never lag the UI, and it is already
// correct on the very first request after a page load (before the context's
// restore effect has even run). Parsing is cached and only redone when the raw
// string changes, so the hot path is one localStorage.getItem.
let cachedRaw: string | null | undefined
let cachedKey = ''

/** Active category key, or "" when unfiltered / unavailable. */
export function activeCategoryKey(): string {
  if (typeof window === 'undefined') return ''
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY)
  } catch {
    return '' // private-mode / blocked storage: behave exactly like "All"
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    let key = ''
    try {
      key = raw ? String(JSON.parse(raw)?.key ?? '') : ''
    } catch {
      key = ''
    }
    // "All" is the default and means "send nothing", so an unfiltered user's URLs
    // stay byte-identical to what they were before this file existed.
    cachedKey = key === 'All' ? '' : key
  }
  return cachedKey
}

// ── the rewrite ──────────────────────────────────────────────────────────────

/**
 * The scoped form of `url`, or `url` unchanged. Pure and idempotent:
 * `scopedUrl(scopedUrl(u)) === scopedUrl(u)`, which is what makes it safe for
 * GlobalLoader to re-issue a request through this patch on every cold-start retry.
 *
 * Exported for testing.
 */
export function scopedUrl(url: string): string {
  if (!BASE || !url || !url.startsWith(BASE)) return url // invariant 1

  const cat = activeCategoryKey()
  if (!cat) return url

  const rest = url.slice(BASE.length)
  const q = rest.indexOf('?')
  const path = q === -1 ? rest : rest.slice(0, q)
  const query = q === -1 ? '' : rest.slice(q + 1)

  // invariant 3 — the caller already said it, so say nothing.
  if (/(^|&)Category=/.test(query)) return url

  if (!isCategoryScopedPath(path)) return url // invariant 2

  // invariant 4 — append only; the existing query string is never re-parsed.
  return `${url}${q === -1 ? '?' : '&'}Category=${encodeURIComponent(cat)}`
}

// ── the patch ────────────────────────────────────────────────────────────────
//
// COEXISTENCE WITH GlobalLoader.tsx (which also patches window.fetch)
//
// Both patch once at module load and neither ever unpatches, so they form a stable
// chain in whichever order the bundler evaluates them. Both orders are correct:
//
//   loader outer → ours inner:  the loader tests `url.startsWith(BASE)` on the
//     pre-rewrite URL. Adding a query param cannot change a prefix match, so its
//     tracking and its 502/503 cold-start retries behave identically. Each retry
//     re-enters our patch and re-applies the rewrite — safe because scopedUrl is
//     idempotent (invariant 3 catches the already-scoped URL on attempt 2+).
//
//   ours outer → loader inner:  we rewrite, then hand the scoped URL to the
//     loader, which tracks and retries it. Also fine.
//
// Neither swallows the other because each captures `window.fetch` as it was at its
// own module-eval time and always delegates to it — no patch calls the raw native
// fetch directly, and no patch restores a saved reference later (a teardown would
// be the one thing that could break the chain, by reinstating a stale link).
//
// Idempotent under React strict-mode double-mounting and dev HMR via the
// `__catScopePatched` flag on window — the same technique GlobalLoader uses.
export function installCategoryFetch(): void {
  if (typeof window === 'undefined') return // SSR-safe: nothing touches window at module scope
  if (!BASE) return
  const w = window as Patched
  if (w.__catScopePatched) return
  w.__catScopePatched = true

  const inner = window.fetch.bind(window)

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    let url = ''
    try {
      url = typeof input === 'string' ? input : (input as Request)?.url || String(input)
    } catch {
      return inner(input, init)
    }
    if (!url.startsWith(BASE)) return inner(input, init)

    const next = scopedUrl(url)
    if (next === url) return inner(input, init)

    // A string or URL input is replaced outright. A Request is rebuilt with the new
    // URL, preserving method/headers/body/signal — `new Request(url, requestObject)`
    // copies every other field from the second argument.
    if (typeof input === 'string' || input instanceof URL) return inner(next, init)
    try {
      return inner(new Request(next, input as Request), init)
    } catch {
      return inner(input, init) // never let a rewrite failure lose the request
    }
  } as typeof window.fetch
}
