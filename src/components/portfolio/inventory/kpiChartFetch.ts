import { Kpi, simulatedByPortfolio } from "@/lib/kpiRegistry";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { fmt } from "@/lib/kpiFormat";
import { getSimulated } from "@/lib/simulatedKpi";

/**
 * The aggregated series behind one /inventory glass tile (≈12 rows, <1 KB) — NOT the
 * raw 5000-row table. Uses the same group_by/measures/top params as the drill-down.
 *
 * Deliberately unfiltered: the /inventory grid is navigation, not analysis. Each tile
 * links to /kpi/{key}, and that detail page is where the material-category control
 * lives. See the note in analyticsHomeScreenCard.tsx for the full reasoning.
 */
export async function fetchKpiChart(
  kpi: Kpi,
  regionName: string,
  signal?: AbortSignal,
): Promise<any[]> {
  // wastage-rate has no generic /kpi/{key} route — it exposes a bespoke insights shape
  // whose by_plant rows are what the tile's spark and "Largest: HC16 4.12%" line read.
  if (kpi.key === "wastage-rate") {
    const res = await fetch(
      `${DASHBOARD_API_BASE_URL}/kpi/wastage-rate/insights?Plant=${encodeURIComponent(regionName)}`,
      { signal },
    );
    if (!res.ok) throw new Error(`wastage-rate ${res.status}`);
    const json = await res.json();
    return Array.isArray(json?.by_plant) ? json.by_plant : [];
  }
  // unit-sold-per-sku's plain /kpi/{key} path is shadowed by a legacy "original
  // frontend contract" route (Title-Case fields, month x material_group grain — 456
  // rows, not a clean ~6-row monthly series) rather than the registry-driven generic
  // route every other KPI here resolves to. Its bespoke /insights route's own
  // `timeline` is already the clean 6-month series the tile actually wants — same
  // pattern as wastage-rate above, just a different bespoke shape.
  if (kpi.key === "unit-sold-per-sku") {
    const res = await fetch(
      `${DASHBOARD_API_BASE_URL}/kpi/unit-sold-per-sku/insights?Plant=${encodeURIComponent(regionName)}`,
      { signal },
    );
    if (!res.ok) throw new Error(`unit-sold-per-sku ${res.status}`);
    const json = await res.json();
    return Array.isArray(json?.timeline) ? json.timeline : [];
  }
  // monthly-purchase-value has the identical legacy-route-shadowing problem as
  // unit-sold-per-sku above (765 material-group x month rows, not a clean 6-row
  // series) — but its bespoke /insights route's `timeline` is parallel-arrays
  // ({labels, total, series}), not a row array like wastage-rate/unit-sold-per-sku's,
  // so it needs zipping into rows here rather than a straight pass-through.
  if (kpi.key === "monthly-purchase-value") {
    const res = await fetch(
      `${DASHBOARD_API_BASE_URL}/kpi/monthly-purchase-value/insights?Plant=${encodeURIComponent(regionName)}`,
      { signal },
    );
    if (!res.ok) throw new Error(`monthly-purchase-value ${res.status}`);
    const json = await res.json();
    const labels: string[] = json?.timeline?.labels ?? [];
    const total: number[] = json?.timeline?.total ?? [];
    return labels.map((label, i) => ({ label, value: total[i] ?? 0 }));
  }
  const params = new URLSearchParams({ Plant: regionName });
  if (kpi.chart?.groupBy) params.set("group_by", kpi.chart.groupBy);
  if (kpi.chart?.measures) params.set("measures", kpi.chart.measures);
  if (kpi.chart?.top) params.set("top", String(kpi.chart.top));
  const res = await fetch(`${DASHBOARD_API_BASE_URL}/kpi/${kpi.key}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`${kpi.key} ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? []);
}

/**
 * The 3 insight lines an InventoryGlassKpiCard tile shows on its face (peak/largest,
 * avg/count, portfolio label) — derived purely from the same chart series fetchKpiChart
 * returns. Shared verbatim across every portfolio's glass grid (inventory, consumption,
 * procurement) so the exact same tile design reads the exact same way everywhere.
 */
export function computeInsights(kpi: Kpi, chartData: any[]): string[] {
  if (!chartData || chartData.length === 0) {
    return [
      `${kpi.short} — live data`,
      kpi.card.label,
      `${kpi.portfolio.charAt(0).toUpperCase() + kpi.portfolio.slice(1)} Portfolio KPI`,
    ];
  }

  const xField = kpi.chart?.x ?? "";
  const seriesField = kpi.chart?.series?.[0]?.field ?? "";
  const valueKind = kpi.chart?.valueKind ?? kpi.card.kind;

  // Find top row by series value
  const sorted = [...chartData].sort(
    (a, b) => Number(b[seriesField] ?? 0) - Number(a[seriesField] ?? 0)
  );
  const topRow = sorted[0];
  const topLabel = topRow ? String(topRow[xField] ?? "").slice(0, 20) : "—";
  const topVal = topRow ? Number(topRow[seriesField] ?? 0) : 0;
  const formattedTop = fmt(topVal, valueKind);

  // Average
  const avg = chartData.reduce((s, r) => s + Number(r[seriesField] ?? 0), 0) / chartData.length;

  // Insight 1 — top / peak
  const insight1 =
    kpi.chart?.type === "donut"
      ? `Largest: ${topLabel} ${formattedTop}`
      : `Peak: ${topLabel} (${formattedTop})`;

  // Insight 2 — count / avg
  const insight2 =
    kpi.chart?.type === "donut"
      ? `${chartData.length} segments tracked`
      : `Avg: ${fmt(avg, valueKind)} across ${chartData.length} entries`;

  // Insight 3 — portfolio label
  const insight3 = `${kpi.portfolio.charAt(0).toUpperCase() + kpi.portfolio.slice(1)} Portfolio KPI`;

  return [insight1, insight2, insight3];
}

/**
 * The exact simulatedByPortfolio → InventoryGlassKpiCard-shaped adapter used on
 * /inventory, generalised to any portfolio. Builds a fake Kpi + insights + chartData
 * triple for each simulated KPI in that portfolio so it renders inline in the glass
 * grid (washed-out, "Simulated" tag) — no separate section, same tile everywhere.
 */
export function buildSimTiles(portfolio: "inventory" | "procurement" | "consumption" | "forecasting") {
  return simulatedByPortfolio(portfolio).map((meta: any) => {
    const b = getSimulated(meta.key)!;
    const kpi = {
      key: meta.key, title: meta.title, short: meta.short, portfolio, icon: meta.icon,
      chart: { type: b.chartCfg.type, x: b.chartCfg.x, series: b.chartCfg.series },
      card: { field: "", agg: "sum", kind: b.headline.kind, label: b.headline.label },
      columns: [],
    } as unknown as Kpi;
    const insights = [
      `${b.headline.label}: ${fmt(b.headline.value, b.headline.kind)}`,
      b.summary[0] ? `${b.summary[0].label}: ${fmt(b.summary[0].value, b.summary[0].kind)}` : meta.why,
      "Simulated · activates on your data",
    ];
    return { kpi, chartData: b.chartData, insights };
  });
}
