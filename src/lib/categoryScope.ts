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
