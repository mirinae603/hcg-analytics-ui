import { Kpi } from "@/lib/kpiRegistry";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";

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
  const params = new URLSearchParams({ Plant: regionName });
  if (kpi.chart?.groupBy) params.set("group_by", kpi.chart.groupBy);
  if (kpi.chart?.measures) params.set("measures", kpi.chart.measures);
  if (kpi.chart?.top) params.set("top", String(kpi.chart.top));
  const res = await fetch(`${DASHBOARD_API_BASE_URL}/kpi/${kpi.key}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`${kpi.key} ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? []);
}
