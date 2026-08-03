// Which KPIs the global category filter may actually be applied to.
//
// Not every metric has a material dimension, so "send Category everywhere" is wrong
// in two different ways — and one of them is dangerous:
//
//  1. HARMLESS: most vendor/process metrics (fill rate, cycle time, lead time,
//     purchase-by-location, consumption-by-department) sit on tables with no material
//     column. The backend leaves those frames untouched, so the param is simply inert.
//     Sending it changes nothing — but the *user* would still believe the number was
//     filtered. So we say "not split by category" on the page instead.
//
//  2. DANGEROUS: `purchase-value` already owns a column literally called `category`,
//     and it means something else entirely — the PO/pharmacological taxonomy
//     ("ANTINEOPLASTIC", "CYTOTOXIC CHEMOTHERAPY", "CAPITALS"). Filtering it by
//     "Onco Drugs" matches nothing and returns **0 rows**, which reads as "HCG buys no
//     onco drugs" — flatly false. Verified live: 72,783 rows → 0.
//
// So the filter runs off an explicit allowlist, verified endpoint by endpoint against
// the running backend rather than assumed.
//
// Deliberate omission: `monthly-purchase-value` *does* scope correctly (146,990 → 17,167
// rows) but is left out on purpose. Its sibling `purchase-value` cannot be scoped at all,
// and scoping one Procurement money metric while the other stays whole would recreate the
// exact "same label, two numbers" collision this dashboard already paid to fix. The whole
// Procurement portfolio therefore stays category-neutral, which is also where the backend
// landed independently.

/** Registry KPI keys whose generic /kpi/{key} endpoints correctly honour Category. */
export const CATEGORY_SCOPED_KPIS = new Set<string>([
  // Inventory — all verified to split on material_type
  'current-stock-value',
  'inventory-aging',
  'days-on-hand',
  'stock-change',
  'inventory-health-score',
  'non-moving-inventory',
  'inventory-risk',
  'near-expiry',
  'inventory-turnover-ratio',
  // Consumption
  'unit-sold-per-sku',
  // Forecasting (all read the replenishment/radar frames, which carry material)
  'fulfillment-rate',
  'stock-radar',
  'aging-risk-forecast',
])

/**
 * Why a given KPI ignores the category filter — shown to the user so an *unfiltered*
 * number is never mistaken for a filtered one. Null means "no explanation needed".
 */
const NOT_SCOPED_REASON: Record<string, string> = {
  'purchase-value':
    "Purchase Value already groups by the PO's own category (ANTINEOPLASTIC, CYTOTOXIC CHEMOTHERAPY…), a different taxonomy from material type.",
  'monthly-purchase-value':
    'Procurement money metrics are kept whole so Purchase Value and Monthly Purchase Value always agree.',
  'procurement-variance':
    'Procurement money metrics are kept whole so purchase figures always agree.',
  'vendor-volume-contribution': 'Vendor metrics are measured per vendor, not per material.',
  'vendor-lead-time': 'Vendor metrics are measured per vendor, not per material.',
  'vendor-volume-vs-margin': 'Vendor metrics are measured per vendor, not per material.',
  'fill-rate': 'Measured per plant and PO line, with no material dimension in the source.',
  'procurement-cycle-time': 'Measured per PO, with no material dimension in the source.',
  'purchase-by-location': 'Measured per plant, with no material dimension in the source.',
  'consumption-by-department':
    'Departmental consumption is recorded per cost centre and month, without an item-level breakdown.',
  'aging-distribution':
    'This KPI ships pre-aggregated, so it cannot be re-cut by material category. The Aging Distribution detail page recomputes and does support it.',
}

/**
 * Portfolio summaries fan out to every KPI in the portfolio, so the weakest member sets
 * the rule. Procurement contains `purchase-value`, which zeroes out under a Category
 * (verified: 72,783 rows → 0 inside /portfolio/procurement/summary), so the whole
 * Procurement portfolio stays category-neutral rather than showing one zeroed card.
 */
export const CATEGORY_SCOPED_PORTFOLIOS = new Set<string>(['inventory', 'consumption', 'forecasting'])

export const isPortfolioScoped = (portfolio: string) => CATEGORY_SCOPED_PORTFOLIOS.has(portfolio)

export const isCategoryScoped = (kpiKey: string) => CATEGORY_SCOPED_KPIS.has(kpiKey)

export const notScopedReason = (kpiKey: string): string | null =>
  CATEGORY_SCOPED_KPIS.has(kpiKey) ? null : NOT_SCOPED_REASON[kpiKey] ?? 'This metric has no material-level breakdown in the source data.'

/**
 * Category query fragment for a specific KPI — "" whenever the filter must not be sent.
 * `catParam` comes from useScope().
 */
export const catParamFor = (kpiKey: string, catParam: string) =>
  isCategoryScoped(kpiKey) ? catParam : ''

// ─────────────────────────────────────────────────────────────────────────────
// URL-level resolver — the decision the fetch interceptor asks.
//
// The sets above answer "may this *KPI* be filtered", which is the question the
// /kpi/{key} pages ask. The interceptor sees a raw URL instead, so it needs the
// same judgement expressed per endpoint. This lives here, in the one file, so the
// allowlist can never fork: `catParamFor()` (component-level) and
// `isCategoryScopedPath()` (transport-level) read the same tables.
//
// Two things the KPI/portfolio sets structurally cannot express, hence the extra
// tables below — not a second opinion, a second *shape*:
//
//   a) Endpoints that aren't KPIs at all (`/api/dashboard/all` — the executive
//      cards; `/forecast/*`; `/inventory/replenishment-data`; `/drill/*`).
//   b) KPIs where the answer differs per sub-resource. `aging-distribution` and
//      `wastage-rate` ship pre-aggregated charts that ignore Category (a silent
//      no-op) while their bespoke `/insights` endpoint recomputes from
//      fact_inventory and honours it exactly. One key, two answers.
//
// Every entry below was verified against a running backend by diffing the
// response with and without `?Category=` — never assumed. Endpoints whose
// response was byte-identical are deliberately absent: sending the param there
// would let a user believe an unfiltered number had been filtered, which is the
// failure mode this allowlist exists to prevent.
// ─────────────────────────────────────────────────────────────────────────────

/** Non-KPI endpoints verified to honour Category. Exact path match. */
const CATEGORY_SCOPED_PATHS = new Set<string>([
  // The executive cards at the top of /inventory — Stock Quantity, Inventory Aging,
  // DOH, Turnover. Verified: 60.47 Cr → 25.20 Cr (Onco) / 22.04 Cr (Consumables).
  '/api/dashboard/all',
  // Forecasting & replenishment detail endpoints.
  '/forecast/reorder-priority',
  '/forecast/replenishment-insights',
  '/forecast/risk-items',
  '/forecast/demand-insights',
  '/forecast/cashflow-insights',
  '/inventory/replenishment-data',
  // Hover drill-downs.
  '/drill/top-items',
  '/drill/meta',
])

/**
 * Deliberately NOT scoped even though the key/portfolio rules would allow it.
 * Checked before every other rule, so it always wins.
 *
 * `/kpi/aging-distribution` and `/kpi/wastage-rate` (chart + summary) read
 * pre-aggregated frames with no material dimension: the param is inert, so
 * sending it would misrepresent a portfolio-wide number as a filtered one. Their
 * `/insights` siblings recompute and are allowed by CATEGORY_SCOPED_KPI_PATHS.
 *
 * `/forecast/sales-forecast` and `/forecast/cashflow-forecast` are per-Material —
 * the caller has already named the exact item, so a category filter is meaningless
 * and the backend takes no such param.
 */
const CATEGORY_NEVER_PATHS = new Set<string>([
  '/kpi/aging-distribution',
  '/kpi/aging-distribution/summary',
  '/kpi/wastage-rate',
  '/kpi/wastage-rate/summary',
  '/forecast/sales-forecast',
  '/forecast/cashflow-forecast',
  '/forecast/item-risk',
])

/**
 * Bespoke `/kpi/...` endpoints that scope correctly even though their key is not in
 * CATEGORY_SCOPED_KPIS — either because the key's *generic* chart cannot be filtered
 * while its detail page can (aging-distribution, wastage-rate), or because the KPI is
 * served by a legacy hand-written route rather than the generic registry one.
 * These are exactly the endpoints the bespoke *Detail.tsx pages already hand-wire.
 */
const CATEGORY_SCOPED_KPI_PATHS = new Set<string>([
  '/kpi/aging-distribution/insights',
  '/kpi/wastage-rate/insights',
  '/kpi/inventory-valuation',
  '/kpi/inventory-valuation-table',
  '/kpi/inventory-valuation/insights',
  '/kpi/return-rate',
  '/kpi/return-rate-table',
  '/kpi/revenue-distribution',
  '/kpi/revenue-distribution-table',
  '/kpi/revenue-per-storage-location',
])

/**
 * May this API path carry a Category param?
 *
 * `path` is the pathname only — no query string, no origin. Returns false for
 * anything unrecognised, so a new endpoint is unscoped until someone verifies it
 * and adds it here. Fail-closed is the point: an un-filterable number that is
 * *labelled* filtered is worse than one that visibly does not move.
 */
export function isCategoryScopedPath(path: string): boolean {
  if (!path) return false
  // Normalise: strip a trailing slash so "/kpi/near-expiry/" === "/kpi/near-expiry".
  const p = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path

  if (CATEGORY_NEVER_PATHS.has(p)) return false
  if (CATEGORY_SCOPED_PATHS.has(p)) return true
  if (CATEGORY_SCOPED_KPI_PATHS.has(p)) return true

  const seg = p.split('/').filter(Boolean)

  // /portfolio/{name}/... — the weakest member of the portfolio sets the rule,
  // which is why Procurement is absent from CATEGORY_SCOPED_PORTFOLIOS.
  if (seg[0] === 'portfolio' && seg[1]) return isPortfolioScoped(seg[1])

  // /kpi/{key}, /kpi/{key}/{sub}, /kpi/{key}-table — all inherit the key's verdict.
  if (seg[0] === 'kpi' && seg[1]) {
    const key = seg[1].endsWith('-table') ? seg[1].slice(0, -'-table'.length) : seg[1]
    return isCategoryScoped(key)
  }

  return false
}
