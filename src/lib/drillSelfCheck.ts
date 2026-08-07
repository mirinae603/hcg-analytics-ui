// Dev-only: ping EVERY wired drill-down config and report which ones are broken.
//
// WHY
// ---
// Six of fifteen wired charts shipped returning 400/404. Finding that out required
// hovering thirty charts across eleven pages by hand, and the primitive swallowed the
// errors so a broken hover looked exactly like an unwired one. Nobody was ever going
// to do that pass twice.
//
// So the configs are declared once, here, and one call checks all of them from any
// page in about a second:
//
//     __drillCheck()                  // in the browser console, dev builds only
//     …?drillcheck=1                  // or add the query param and watch the console
//
// It prints a console.table of every config with its HTTP status, the number of items
// it returned and the source the backend resolved it to, and returns the same rows so
// they can be asserted on. A config that answers 200 with zero items is reported as
// FAIL too: an empty panel is exactly as useless as an error, and much easier to miss.
//
// This list is also mirrored in the backend's tests/test_drill_wired.py, so CI fails
// if the contract moves under it — the browser check is for the person editing a page,
// the pytest is for the person editing the API.
import { DASHBOARD_API_BASE_URL } from '@/utils/config'
import { fetchReorderBandDrill, DrillBy, DRILL } from '@/lib/drilldown'
import { KPIS } from '@/lib/kpiRegistry'

export type WiredDrill = {
  /** Where a human would go to see it. */
  page: string
  /** Which chart on that page. */
  chart: string
  kpi: string
  dim: string
  by: DrillBy
  measure?: string
  /** Non-/drill/top-items sources. */
  via?: 'reorder-priority'
}

/**
 * Every drill-down wired anywhere in the app.
 *
 * Keep this in step with the call sites — the check is only worth having if it is
 * complete. `useDrillBind` cross-checks at runtime in dev and warns about any live
 * spec that is missing from this list, so drift is caught rather than assumed away.
 */
export const WIRED_DRILLS: WiredDrill[] = [
  // ── Ledger-kit KPI pages (Stock-Out, Billable Split, Revenue per Location) ──
  // op-ip-revenue is deliberately ABSENT: its source (sales_monthly) is patient x month
  // with no material/plant/vendor column, so /drill/top-items correctly refuses it —
  // there is no entity grain to break a patient-type bar down by.
  { page: 'Stock-Out Rate', chart: 'hospitals by value at stake', kpi: 'stock-out-rate', dim: 'plant', by: 'material', measure: 'cost_6mo' },
  { page: 'Stock-Out Rate', chart: 'categories that break', kpi: 'stock-out-rate', dim: 'material_group', by: 'material', measure: 'cost_6mo' },
  { page: 'Billable Split', chart: 'two-catalogue scope buckets', kpi: 'billable-consumption', dim: 'scope', by: 'material', measure: 'internal_cost' },
  { page: 'Revenue per Location', chart: 'scale-vs-quality plane', kpi: 'revenue-per-location', dim: 'hospital', by: 'material', measure: 'revenue' },
  { page: 'Revenue per Location', chart: 'concentration bars', kpi: 'revenue-per-location', dim: 'hospital', by: 'material', measure: 'revenue' },

  // ── Inventory ──
  { page: 'Stock Value', chart: 'breakdown bars · Category', kpi: 'current-stock-value', dim: 'material_group', by: 'material', measure: 'stock_value_cost' },
  { page: 'Stock Value', chart: 'breakdown bars · Hospital', kpi: 'current-stock-value', dim: 'plant', by: 'material', measure: 'stock_value_cost' },
  { page: 'Stock Value', chart: 'cost vs MRP', kpi: 'current-stock-value', dim: 'material_group', by: 'material', measure: 'stock_value_cost' },
  { page: 'Stock Value', chart: 'value-at-risk age bands', kpi: 'aging-distribution', dim: 'aging_bucket', by: 'material', measure: 'stock_value' },
  { page: 'Inventory Aging', chart: 'value by age band', kpi: 'aging-distribution', dim: 'aging_bucket', by: 'material', measure: 'stock_value' },
  { page: 'Aging Distribution', chart: 'marimekko column', kpi: 'aging-distribution', dim: 'material_group', by: 'material', measure: 'stock_value' },
  { page: 'Aging Distribution', chart: 'stagnant leaderboard', kpi: 'aging-distribution', dim: 'material_group', by: 'material', measure: 'stock_value' },
  { page: 'Health Score', chart: 'tier scorecard', kpi: 'inventory-health-score', dim: 'health_tier', by: 'material', measure: 'closing_stock_value' },
  { page: 'Health Score', chart: 'category report card', kpi: 'inventory-health-score', dim: 'material_group', by: 'material', measure: 'closing_stock_value' },
  { page: 'Non-Moving', chart: 'reason bars', kpi: 'non-moving-inventory', dim: 'reason', by: 'material', measure: 'closing_stock_value' },
  { page: 'Non-Moving', chart: 'blocked capital by category', kpi: 'non-moving-inventory', dim: 'material_group', by: 'material', measure: 'closing_stock_value' },
  { page: 'Risk', chart: 'risk tier bars', kpi: 'inventory-risk', dim: 'risk_level', by: 'material', measure: 'closing_stock_value' },
  { page: 'Risk', chart: 'high-risk categories', kpi: 'inventory-risk', dim: 'material_group', by: 'material', measure: 'closing_stock_value' },
  { page: 'Near Expiry', chart: 'exposure by category', kpi: 'near-expiry', dim: 'material_group', by: 'material', measure: 'total_cost' },
  { page: 'Turnover', chart: 'category velocity', kpi: 'inventory-turnover-ratio', dim: 'material_group', by: 'material', measure: 'closing_stock_value' },
  { page: 'Valuation', chart: 'capital concentration', kpi: 'current-stock-value', dim: 'material_group', by: 'material', measure: 'stock_value_cost' },
  { page: 'Days on Hand', chart: 'coverage distribution', kpi: 'days-on-hand', dim: 'doh_band', by: 'material', measure: 'stock_value_cost' },
  { page: 'Stock Change', chart: 'monthly flow · inflow', kpi: 'stock-change', dim: 'year_month', by: 'material', measure: 'inflow' },
  { page: 'Stock Change', chart: 'monthly flow · outflow', kpi: 'stock-change', dim: 'year_month', by: 'material', measure: 'outflow' },
  { page: 'Wastage %', chart: 'wastage by plant', kpi: 'wastage-rate', dim: 'plant', by: 'material', measure: 'expired_value' },

  // ── Consumption ──
  { page: 'Consumption Overview', chart: 'consumption by category', kpi: 'unit-sold-per-sku', dim: 'material_group', by: 'material', measure: 'consumption_cost' },
  { page: 'Units Consumed', chart: 'where usage lands (units)', kpi: 'unit-sold-per-sku', dim: 'material_group', by: 'material', measure: 'total_units' },
  { page: 'Units Consumed', chart: 'where usage lands (cost)', kpi: 'unit-sold-per-sku', dim: 'material_group', by: 'material', measure: 'consumption_cost' },
  { page: 'Consumption by Dept', chart: 'department treemap', kpi: 'consumption-by-department', dim: 'department', by: 'material', measure: 'consumption_cost' },

  // ── Procurement ──
  { page: 'Purchase Value', chart: 'spend blocks', kpi: 'purchase-value', dim: 'category', by: 'vendor', measure: 'purchase_value' },
  { page: 'Vendor Volume', chart: 'largest suppliers', kpi: 'vendor-volume-contribution', dim: 'vendor', by: 'material', measure: 'vendor_value' },
  { page: 'Monthly Purchase', chart: 'category x month heatmap', kpi: 'monthly-purchase-value', dim: 'material_group', by: 'material', measure: 'monthly_purchase_value' },
  { page: 'Purchase by Location', chart: 'spend footprint hexes', kpi: 'purchase-by-location', dim: 'plant', by: 'material', measure: 'purchase_value' },
  { page: 'Fill Rate', chart: 'fulfillment priority bubbles', kpi: 'fill-rate', dim: 'plant', by: 'material', measure: 'ordered_qty' },

  // ── Forecasting ──
  { page: 'Forecasting Overview', chart: 'slow-moving stock donut', kpi: 'aging-risk-forecast', dim: 'aging_risk_forecast', by: 'material', measure: 'closing_stock' },
  { page: 'Forecasting Overview', chart: 'priority reorder list', kpi: 'reorder-priority', dim: 'priority_band', by: 'material', via: 'reorder-priority' },
  { page: 'Replenishment Risk', chart: 'priority ladder', kpi: 'reorder-priority', dim: 'priority_band', by: 'material', via: 'reorder-priority' },
]

/**
 * The generic /kpi/{key} page wires its hover straight off DRILL, so every entry there
 * is a live config too — included here so one call covers both the bespoke pages and
 * the fallback page, and so a DRILL entry can never rot unnoticed.
 */
const GENERIC: WiredDrill[] = Object.entries(DRILL).map(([kpi, cfg]) => ({
  page: 'Generic /kpi page', chart: `${kpi} chart`, kpi, dim: cfg.dim, by: cfg.by,
}))

/**
 * The failure mode a status check CANNOT see.
 *
 * On the generic page `bind(slice)` sends the chart's own x-axis value, so DRILL's
 * `dim` has to be the column the chart is grouped by. When it is not, the request is a
 * perfectly valid 200 with an empty list — a panel that looks like "nothing here"
 * rather than "this is misconfigured". Two real cases: `consumption-by-department`
 * charts `department_name` while the backend's `department` alias resolves to
 * `cost_ctr`, and `stock-change` / `unit-sold-per-sku` are grouped by `year,month`
 * with no single dimension to hover at all.
 *
 * So the check reads the registry and says so out loud.
 */
export function checkDrillDimsMatchTheirCharts(): string[] {
  const problems: string[] = []
  for (const [key, cfg] of Object.entries(DRILL)) {
    const k = KPIS.find((x) => x.key === key)
    if (!k) { problems.push(`${key}: not in the KPI registry`); continue }
    const gb = k.chart?.groupBy
    if (!gb) { problems.push(`${key}: registry has no chart to hover`); continue }
    const cols = gb.split(',').map((c) => c.trim())
    // `vendor` is the backend's alias for the `vendor_name` column — the chart's slice
    // values are vendor names either way, so this pairing is correct, not a mismatch.
    const ok = cols.includes(cfg.dim) || (cfg.dim === 'vendor' && cols.includes('vendor_name'))
    if (!ok) problems.push(`${key}: DRILL.dim="${cfg.dim}" but the chart groups by "${gb}"`)
  }
  return problems
}

export const ALL_CHECKED: WiredDrill[] = [...WIRED_DRILLS, ...GENERIC]


export type SelfCheckRow = {
  ok: boolean
  page: string
  chart: string
  kpi: string
  dim: string
  by: string
  slice: string
  status: number | string
  items: number
  source: string
  note: string
}

async function api(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${DASHBOARD_API_BASE_URL}${path}?${qs}`)
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* keep the raw text as the reason */ }
  return { status: res.status, ok: res.ok, json, text }
}

/**
 * Check one config end to end: ask the backend which slices the chart actually has,
 * then drill into the biggest one. Testing with a real slice matters — a made-up
 * slice returns a legitimate empty list and would pass a check that only looked at
 * the status code.
 */
async function checkOne(w: WiredDrill, plant?: string): Promise<SelfCheckRow> {
  const base: SelfCheckRow = {
    ok: false, page: w.page, chart: w.chart, kpi: w.kpi, dim: w.dim, by: w.by,
    slice: '', status: '-', items: 0, source: '', note: '',
  }
  const common: Record<string, string> = { kpi: w.kpi, dim: w.dim, n: '10' }
  if (w.measure) common.measure = w.measure
  if (plant) common.Plant = plant

  // 1. what slices does this chart have?
  const enumerate = await api('/drill/top-items', { ...common, by: w.dim, n: '1' })
  if (!enumerate.ok) {
    return { ...base, status: enumerate.status, note: `enumerate ${w.dim}: ${enumerate.json?.detail ?? enumerate.text.slice(0, 120)}` }
  }
  const slice = String(enumerate.json?.items?.[0]?.key ?? '')
  if (!slice) return { ...base, status: enumerate.status, note: `no slices on dim=${w.dim}` }

  // 2. drill into it, exactly the way the chart will
  if (w.via === 'reorder-priority') {
    try {
      const r = await fetchReorderBandDrill({ kpi: w.kpi, dim: w.dim, by: w.by, slice, plant, n: 10 })
      return { ...base, ok: r.items.length > 0, slice, status: 200, items: r.items.length, source: '/forecast/reorder-priority', note: r.items.length ? '' : 'returned no items' }
    } catch (e: any) {
      return { ...base, slice, status: e?.status ?? 'ERR', note: e?.detail ?? String(e?.message ?? e) }
    }
  }

  const r = await api('/drill/top-items', { ...common, by: w.by, slice })
  if (!r.ok) {
    return { ...base, slice, status: r.status, note: String(r.json?.detail ?? r.text.slice(0, 160)) }
  }
  const items = Number(r.json?.returned ?? 0)
  return {
    ...base,
    ok: items > 0,
    slice,
    status: r.status,
    items,
    source: String(r.json?.source ?? ''),
    note: items ? String(r.json?.note ?? '') : 'returned no items',
  }
}

/** Run every wired config. Returns the rows; also console.tables them. */
export async function runDrillSelfCheck(plant?: string): Promise<SelfCheckRow[]> {
  const rows: SelfCheckRow[] = []
  // Sequential on purpose: 34 parallel requests against a single-worker dev API just
  // produces timeouts that look like failures.
  for (const w of ALL_CHECKED) {
    // eslint-disable-next-line no-await-in-loop
    rows.push(await checkOne(w, plant))
  }
  const bad = rows.filter((r) => !r.ok)
  const mismatched = checkDrillDimsMatchTheirCharts()
  /* eslint-disable no-console */
  console.log(
    `%c[drill self-check] ${rows.length - bad.length}/${rows.length} configs OK${plant ? ` · plant=${plant}` : ''}`,
    `font-weight:700;color:${bad.length ? '#c2761a' : '#0e9f6e'}`
  )
  console.table(rows.map((r) => ({
    ok: r.ok ? '✓' : '✗', page: r.page, chart: r.chart, kpi: r.kpi,
    dim: r.dim, by: r.by, http: r.status, items: r.items, slice: r.slice,
    source: r.source, note: r.note,
  })))
  if (bad.length) console.error('[drill self-check] broken configs:', bad)
  if (mismatched.length) {
    console.error(
      '[drill self-check] these DRILL entries would return an EMPTY panel on the generic ' +
      '/kpi page — the dim is not what the chart is grouped by:', mismatched
    )
  }
  /* eslint-enable no-console */
  return rows
}

/** Signature every declared config is keyed by, for the drift check in useDrillBind. */
export const drillSignature = (kpi: string, dim: string, by: string) => `${kpi}|${dim}|${by}`

const DECLARED = new Set(ALL_CHECKED.map((w) => drillSignature(w.kpi, w.dim, w.by)))

/** Dev-only: warn when a live spec is not in WIRED_DRILLS, so the list cannot rot. */
export function noteLiveDrill(kpi: string, dim: string, by: string) {
  if (process.env.NODE_ENV === 'production') return
  const sig = drillSignature(kpi, dim, by)
  if (DECLARED.has(sig)) return
  DECLARED.add(sig)     // warn once
  // eslint-disable-next-line no-console
  console.warn(
    `[drill] ${sig} is wired on a page but missing from WIRED_DRILLS in ` +
    'src/lib/drillSelfCheck.ts — __drillCheck() will not cover it.'
  )
}
