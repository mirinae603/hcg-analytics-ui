// Hover drill-down: "I'm looking at this bar — what's actually inside it?"
//
// One config table + one fetcher, both driven by the backend's /drill/top-items
// contract. Every entry below was probed against the live API before being added;
// combinations that 400 or return a self-referential list are deliberately absent
// (see NOT_DRILLED at the bottom for the reasoning).

import { DASHBOARD_API_BASE_URL } from '@/utils/config'

export type DrillItem = {
  rank: number
  key: string
  name: string
  value: number
  share_pct: number
  cum_share_pct: number
}

export type DrillResult = {
  kpi: string
  dim: string
  slice: string
  by: string
  measure: string
  slice_total: number
  grand_total: number
  slice_share_pct: number
  count: number
  returned: number
  /** How much of the hovered bar the top-N really accounts for — never implied to be 100%. */
  covered_pct: number
  items: DrillItem[]
}

export type DrillCfg = {
  /** Backend dimension name for the chart's x axis / donut label. */
  dim: string
  /** What the top-N list is grouped by. */
  by: 'material' | 'material_group' | 'plant' | 'vendor' | 'category' | 'department'
  /** Plain-language noun for the list heading: "Top 10 <label> inside". */
  label: string
}

/**
 * Charts that get a drill-down, keyed by registry KPI key.
 *
 * The test for inclusion is the user's own question: standing in front of this bar,
 * is "what's inside it" the obvious next thing to know? For a stock-value bar split by
 * material group, or an aging band, or a risk tier — yes, unambiguously. For a monthly
 * trend line, no: the next question there is "versus when", not "of what".
 */
export const DRILL: Record<string, DrillCfg> = {
  // Inventory — every one of these is a bucket the user wants to open.
  'current-stock-value':    { dim: 'material_group',      by: 'material',       label: 'items' },
  'inventory-aging':        { dim: 'aging_category',      by: 'material',       label: 'items' },
  'inventory-health-score': { dim: 'health_tier',         by: 'material',       label: 'items' },
  'non-moving-inventory':   { dim: 'reason',              by: 'material',       label: 'items' },
  'inventory-risk':         { dim: 'risk_level',          by: 'material',       label: 'items' },
  'near-expiry':            { dim: 'expiry_bucket',       by: 'material',       label: 'items' },
  // Pre-aggregated table — the backend cannot regrain it to material, and material
  // group is the honest leaf here anyway.
  'aging-distribution':     { dim: 'aging_bucket',        by: 'material_group', label: 'categories' },
  // Forecasting status donuts.
  'stock-radar':            { dim: 'radar_status',        by: 'material',       label: 'items' },
  'aging-risk-forecast':    { dim: 'aging_risk_forecast', by: 'material',       label: 'items' },
  // Vendor bars have no material dimension at all in the source, so the genuinely
  // useful next question is "which hospitals is this vendor supplying?".
  'vendor-volume-contribution': { dim: 'vendor',          by: 'plant',          label: 'hospitals' },
}

/**
 * Charts deliberately left WITHOUT a drill-down, and why. Kept in code so the next
 * person does not "helpfully" add them back.
 *
 *  days-on-hand ............ the x axis is already the individual item. Drilling from an
 *                            item into items is circular.
 *  inventory-turnover-ratio . the measure is a RATIO. Ranking children by a ratio and
 *  fill-rate ...............  showing them under a parent ratio implies the parts sum to
 *  wastage-rate ............  the whole, which is arithmetically false. A top-10 list here
 *  vendor-lead-time ........  would be a confidently wrong answer.
 *  inventory-valuation ..... backend returns 400 for every supported `by`.
 *  purchase-by-location .... only `by=plant` is supported, i.e. the bar drills into itself.
 *  consumption-by-department  same — no item grain exists in the source table.
 *  purchase-value .......... its `category` column is the PO taxonomy, not material type.
 *  stock-change ............ single-series time trend.
 *  monthly-purchase-value ..  ditto.
 *  procurement-cycle-time ..  ditto.
 *  procurement-variance ....  ditto.
 *  unit-sold-per-sku ....... ditto — and the month slice format does not match its x axis.
 */
export const NOT_DRILLED = true

export const hasDrill = (kpiKey: string) => !!DRILL[kpiKey]

export type DrillQuery = {
  kpi: string
  dim: string
  by: string
  slice: string
  measure?: string
  plant?: string
  category?: string
  n?: number
}

export const drillCacheKey = (q: DrillQuery) =>
  [q.kpi, q.dim, q.by, q.slice, q.measure ?? '', q.plant ?? '', q.category ?? '', q.n ?? 10].join('|')

/** Fetch a top-N breakdown. Throws on 4xx/5xx so callers can show a quiet fallback. */
export async function fetchDrill(q: DrillQuery, signal?: AbortSignal): Promise<DrillResult> {
  const p = new URLSearchParams({ kpi: q.kpi, dim: q.dim, by: q.by, slice: q.slice, n: String(q.n ?? 10) })
  if (q.measure) p.set('measure', q.measure)
  if (q.plant) p.set('Plant', q.plant)
  if (q.category) p.set('Category', q.category)
  const res = await fetch(`${DASHBOARD_API_BASE_URL}/drill/top-items?${p.toString()}`, { signal })
  if (!res.ok) throw new Error(`drill ${res.status}`)
  return res.json()
}
