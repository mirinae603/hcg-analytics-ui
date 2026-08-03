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

/** What the returned items are grouped by — mirrors the backend's `_BY_DIRECT`. */
export type DrillBy =
  | 'material' | 'material_group' | 'plant' | 'vendor' | 'category' | 'department' | 'batch'

export type DrillCfg = {
  /** Backend dimension name for the chart's x axis / donut label. */
  dim: string
  /** What the top-N list is grouped by. */
  by: DrillBy
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
  // NOT 'aging_category'. /kpi/inventory-aging ignores group_by and returns 50 RAW
  // MATERIAL rows (25 of them labelled "0-30"), so ApexKpiChart's 1:1 slice mapping
  // would drill a bar drawn at Rs 40.55 L into the whole Rs 29.58 Cr band — a 73x
  // overstatement, delivered confidently. Unreachable today only because every
  // inventory KPI routes to a BESPOKE component (InventoryAgingDetail binds its own
  // aging_bucket drill); this arms itself the moment a key is removed from that map.
  // The band is the honest slice here, and it matches what the bespoke page uses.
  'inventory-aging':        { dim: 'aging_bucket',        by: 'material',       label: 'items' },
  'inventory-health-score': { dim: 'health_tier',         by: 'material',       label: 'items' },
  'non-moving-inventory':   { dim: 'reason',              by: 'material',       label: 'items' },
  'inventory-risk':         { dim: 'risk_level',          by: 'material',       label: 'items' },
  'near-expiry':            { dim: 'expiry_bucket',       by: 'material',       label: 'items' },
  // Pre-aggregated in its own parquet with no material column, but the drill re-routes
  // to drill_inventory_grain — the fact frame the ETL built that parquet FROM — so the
  // leaf is the actual item now rather than the material group it used to stop at.
  'aging-distribution':     { dim: 'aging_bucket',        by: 'material',       label: 'items' },
  // Forecasting status donuts.
  'stock-radar':            { dim: 'radar_status',        by: 'material',       label: 'items' },
  'aging-risk-forecast':    { dim: 'aging_risk_forecast', by: 'material',       label: 'items' },
  // kpi_vendor_volume is plant x vendor with no material column; the drill re-routes to
  // fact_po, where vendor and material share a row, so the answer is WHAT you buy from
  // them rather than merely where it goes.
  'vendor-volume-contribution': { dim: 'vendor',          by: 'material',       label: 'items' },
}

/**
 * THE INVARIANT for anything added above: `dim` must be the column the registry chart
 * is grouped by, because `bind(slice)` sends the chart's own x-axis value straight to
 * the backend. Two ways that goes wrong, both of which return a confidently EMPTY
 * panel rather than an error:
 *
 *   * the dim names a different column — `consumption-by-department` charts
 *     `department_name` while the backend's `department` alias resolves to `cost_ctr`,
 *     so every slice sent would be a name matching a table of codes;
 *   * the chart has no single grouping at all — `stock-change`, `unit-sold-per-sku` and
 *     `monthly-purchase-value` are grouped by `year,month`, and `days-on-hand`,
 *     `fill-rate`, `vendor-lead-time` and `fulfillment-rate` have no chart config in the
 *     registry whatsoever, so there is nothing to hover.
 *
 * Both classes were caught by runDrillSelfCheck() rather than by reading, which is the
 * entire argument for having it. The bespoke detail pages drill those same KPIs happily
 * — they bind their own raw values, so they are not bound by this map. Two of them do
 * it through dimensions this map cannot use:
 *
 *   * `year_month` — the composite the Stock Change page binds, because `month` alone
 *     is not a period: kpi_stock_change holds December 2025 AND December 2026, so a
 *     hover on one December bar drilled by `month` answers with both summed.
 *   * `doh_band` — the Days-on-Hand cover ladder, computed inside
 *     /kpi/days-on-hand/insights and materialised for the drill on drill_doh_grain.
 */

/**
 * Charts deliberately left WITHOUT a drill-down, and why. Kept in code so the next
 * person does not "helpfully" add them back.
 *
 *  wastage-rate ............ has no registry chart to hover — and the measure is a
 *                            RATIO of two different tables, so ranking children BY it
 *                            under a parent ratio would imply the parts sum to the
 *                            whole, which is arithmetically false. Its bespoke page
 *                            drills anyway, and legitimately: it ranks the additive
 *                            NUMERATOR (expired value per plant, via the backend's
 *                            drill_expired_grain) and reports shares of that, with the
 *                            percentage carried alongside as a fact rather than as the
 *                            thing being decomposed.
 *  procurement-variance .... month-over-month DELTA. "What's inside this change" is not
 *                            a top-N of items, it is a comparison of two months.
 *  forecast-accuracy ....... six (metric, value) rows. /drill/matrix reports
 *                            `drillable: false` for it — there is no entity inside a
 *                            bar to list, and the backend says so rather than 400ing
 *                            on a dimension it advertised.
 *  revenue & margin ........ the billing aggregates are keyed on their own `group`
 *                            column, not on the derived material category, so a drill
 *                            would be answering a different question than the chart.
 *
 * Ratio KPIs that DO appear above (turnover, fill rate, lead time) are safe because
 * the backend ranks them by a WEIGHTED MEAN and returns `additive: false` with null
 * shares — the panel then shows no percentages, so nothing implies the parts add up.
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

/**
 * A failed drill, carrying everything needed to fix it.
 *
 * The old code threw `new Error('drill 400')` and the panel caught it into a quiet
 * grey line. That is how six wired charts shipped broken: the backend was replying
 * with a precise, actionable reason ("Dimension 'x' is not available for KPI 'y' on
 * any of its sources … GET /drill/matrix?kpi=y lists what it does support") and every
 * word of it was thrown away before anyone could read it. So the reason travels with
 * the error now, the panel shows it, and the console logs it in dev.
 */
export class DrillError extends Error {
  status: number
  detail: string
  query: DrillQuery
  constructor(status: number, detail: string, query: DrillQuery) {
    super(`drill ${status}: ${query.kpi}/${query.dim}→${query.by} — ${detail || 'no detail'}`)
    this.name = 'DrillError'
    this.status = status
    this.detail = detail
    this.query = query
  }
}

async function failure(res: Response, q: DrillQuery): Promise<DrillError> {
  let detail = ''
  try {
    const j = await res.json()
    detail = typeof j?.detail === 'string' ? j.detail : JSON.stringify(j?.detail ?? j)
  } catch {
    detail = res.statusText || ''
  }
  return new DrillError(res.status, detail, q)
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 10000) / 100 : 0)

/**
 * Reorder priority bands — the one drill that cannot go through /drill/top-items.
 *
 * `priority_band` is computed inside /forecast/reorder-priority (cover vs lead time),
 * not stored on the replenishment parquet, so there is no column for the generic
 * endpoint to group by. This adapts that endpoint's own band filter to the same
 * DrillResult shape, which means the panel, the cache, the hover-intent and the
 * pinning are literally the same code as every other chart.
 *
 * Ranked and totalled on `replenishment_quantity` — the exact figure the band bar
 * shows. Ranking by rupees would have been wrong here: only ~16% of these lines carry
 * a unit cost, so a value sort buries 84% of the queue at a fake Rs 0.
 */
export async function fetchReorderBandDrill(q: DrillQuery, signal?: AbortSignal): Promise<DrillResult> {
  const p = new URLSearchParams({ band: q.slice, sort: 'qty', limit: String(q.n ?? 10) })
  if (q.plant) p.set('Plant', q.plant)
  if (q.category) p.set('Category', q.category)
  const res = await fetch(`${DASHBOARD_API_BASE_URL}/forecast/reorder-priority?${p.toString()}`, { signal })
  if (!res.ok) throw await failure(res, q)
  const j = await res.json()

  const band = (j?.bands || []).find((b: any) => String(b.band) === String(q.slice))
  const sliceTotal = Number(band?.qty ?? 0)
  const grandTotal = Number(j?.totals?.reorder_qty ?? 0)

  let cum = 0
  const items: DrillItem[] = (j?.items || []).map((r: any, i: number) => {
    const value = Number(r.reorder_qty ?? 0)
    cum += value
    return {
      rank: i + 1,
      key: `${r.material}·${r.plant}`,
      // A reorder line is item × hospital, so the hospital is part of the identity —
      // the same drug at two sites is two different orders to place.
      name: `${r.desc || r.material}${r.plant ? ` · ${r.plant}` : ''}`,
      value,
      share_pct: pct(value, sliceTotal),
      cum_share_pct: pct(cum, sliceTotal),
    }
  })

  return {
    kpi: 'reorder-priority', dim: 'priority_band', slice: q.slice, by: 'line',
    measure: 'replenishment_quantity',
    slice_total: sliceTotal, grand_total: grandTotal,
    slice_share_pct: pct(sliceTotal, grandTotal),
    count: Number(j?.count ?? items.length), returned: items.length,
    covered_pct: pct(cum, sliceTotal),
    items,
  }
}

/**
 * Fetch a top-N breakdown. Throws a DrillError carrying the backend's own reason, so
 * a broken hover can be told apart from an unwired one — by the user AND by the
 * console. Never returns a half-answer.
 */
export async function fetchDrill(q: DrillQuery, signal?: AbortSignal): Promise<DrillResult> {
  const p = new URLSearchParams({ kpi: q.kpi, dim: q.dim, by: q.by, slice: q.slice, n: String(q.n ?? 10) })
  if (q.measure) p.set('measure', q.measure)
  if (q.plant) p.set('Plant', q.plant)
  if (q.category) p.set('Category', q.category)
  const res = await fetch(`${DASHBOARD_API_BASE_URL}/drill/top-items?${p.toString()}`, { signal })
  if (!res.ok) throw await failure(res, q)
  return res.json()
}
