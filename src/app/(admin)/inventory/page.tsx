"use client";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { KPIS, Kpi } from "@/lib/kpiRegistry";
import { fmt } from "@/lib/kpiFormat";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { useRegion } from "@/context/RegionContext";
import AnalyticsDashboardLayout from "@/components/ecommerce/AnalyticsHomeScreenCards/analyticsHomeScreenCard";
import InventoryGlassKpiCard from "@/components/portfolio/inventory/InventoryGlassKpiCard";
import SimulatedKpiGrid from "@/components/portfolio/SimulatedKpiGrid";

// Greys out a KPI card with a "Data N/A" badge
const UnavailableKpi: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div
    className="relative select-none"
    title={`${label}: not available for the current dataset.`}
  >
    <div className="opacity-40 grayscale pointer-events-none">{children}</div>
    <div className="absolute top-3 right-3 z-10">
      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-500 shadow-sm">
        Data N/A
      </span>
    </div>
  </div>
);

// Inventory KPIs from registry
const inventoryKpis: Kpi[] = KPIS.filter((k) => k.portfolio === "inventory");

// All inventory KPIs (A1–A10 + Near-Expiry) are buildable from the HCG data
// per the KPI workbook. A4 Turnover & A5 Valuation are proxies (noted on page).
const UNAVAILABLE_KEYS = new Set<string>();

// ─── insight generator ────────────────────────────────────────────────────────
function computeInsights(kpi: Kpi, chartData: any[]): string[] {
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
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { selectedRegion } = useRegion();
  const regionName = selectedRegion?.name ?? "Chennai";

  // Executive card data (summary node per KPI)
  const [summaryData, setSummaryData] = useState<Record<string, any>>({});
  // Chart data per KPI key
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      try {
        // Fetch summary for all inventory KPIs
        const summaryRes = await fetch(
          `${DASHBOARD_API_BASE_URL}/portfolio/inventory/summary?region=${regionName}`
        );
        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          if (!cancelled) setSummaryData(summaryJson ?? {});
        }
      } catch {
        // summary not critical — continue
      }

      // Fetch AGGREGATED chart series for each KPI (≈12 rows) — NOT the raw
      // 5000-row table. Uses the same group_by/measures/top params as the
      // drill-down so each card downloads <1 KB instead of ~1 MB.
      const chartFetches = inventoryKpis.map(async (kpi) => {
        if (UNAVAILABLE_KEYS.has(kpi.key) || !kpi.chart) return { key: kpi.key, data: [] };
        try {
          const params = new URLSearchParams({ Plant: regionName });
          if (kpi.chart.groupBy) params.set("group_by", kpi.chart.groupBy);
          if (kpi.chart.measures) params.set("measures", kpi.chart.measures);
          if (kpi.chart.top) params.set("top", String(kpi.chart.top));
          const res = await fetch(
            `${DASHBOARD_API_BASE_URL}/kpi/${kpi.key}?${params.toString()}`
          );
          if (!res.ok) return { key: kpi.key, data: [] };
          const json = await res.json();
          return { key: kpi.key, data: Array.isArray(json) ? json : (json?.data ?? []) };
        } catch {
          return { key: kpi.key, data: [] };
        }
      });

      const results = await Promise.all(chartFetches);
      if (!cancelled) {
        const map: Record<string, any[]> = {};
        results.forEach(({ key, data }) => { map[key] = data; });
        setChartDataMap(map);
        setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [regionName]);

  return (
    <div className="space-y-10 p-0">

      {/* ── EXECUTIVE ROW: original rich KPI cards (StockValue / Aging donut / DOH liquid-fill) ── */}
      <AnalyticsDashboardLayout />

      {/* ── GLASSMORPHIC KPI grid — full inventory set ── */}
      <div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(186,230,253,0.6)", background: "rgba(255,255,255,0.4)" }}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y"
            style={{ borderColor: "transparent" }}
          >
            {inventoryKpis.map((kpi, i) => {
              const isUnavailable = UNAVAILABLE_KEYS.has(kpi.key);
              const data = chartDataMap[kpi.key] ?? [];
              const insights = computeInsights(kpi, data);

              return (
                <div
                  key={kpi.key}
                  className="relative flex justify-center items-center p-6 transition duration-300"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    opacity: isUnavailable ? 0.4 : 1,
                    filter: isUnavailable ? "grayscale(1)" : "none",
                    pointerEvents: isUnavailable ? "none" : "auto",
                  }}
                  title={isUnavailable ? "Not available for the current dataset." : undefined}
                  onMouseEnter={(e) => {
                    if (isUnavailable) return;
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, rgba(248,252,255,0.6) 0%, rgba(241,249,255,0.8) 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                  }}
                >
                  {isUnavailable && (
                    <span className="absolute top-3 right-3 z-20 text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-500">
                      Data N/A
                    </span>
                  )}
                  <InventoryGlassKpiCard
                    kpi={kpi}
                    index={i}
                    insights={insights}
                    chartData={data}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Pending KPIs — unlock when HCG provides the required data ── */}
      <SimulatedKpiGrid portfolio="inventory" />
    </div>
  );
}
