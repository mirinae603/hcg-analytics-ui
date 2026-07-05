"use client";
import { use } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { byKey } from "@/lib/kpiRegistry";
import { isSimulated } from "@/lib/simulatedKpi";
import KpiDrilldown from "@/components/portfolio/KpiDrilldown";

// Simulated KPIs (scope items with no source data yet) render a full preview page.
const SimulatedKpiPage = dynamic(() => import("@/components/portfolio/SimulatedKpiPage"), { ssr: false });

// Bespoke, richly-detailed drill-downs per KPI (interactive grouping, custom
// tooltips, insight cards). Falls back to the generic KpiDrilldown otherwise.
const BESPOKE: Record<string, any> = {
  "current-stock-value": dynamic(
    () => import("@/components/portfolio/inventory/StockValueDetail"),
    { ssr: false }
  ),
  "inventory-aging": dynamic(
    () => import("@/components/portfolio/inventory/InventoryAgingDetail"),
    { ssr: false }
  ),
  "stock-change": dynamic(
    () => import("@/components/portfolio/inventory/StockChangeDetail"),
    { ssr: false }
  ),
  "inventory-turnover-ratio": dynamic(
    () => import("@/components/portfolio/inventory/TurnoverDetail"),
    { ssr: false }
  ),
  "inventory-valuation": dynamic(
    () => import("@/components/portfolio/inventory/ValuationDetail"),
    { ssr: false }
  ),
  "days-on-hand": dynamic(
    () => import("@/components/portfolio/inventory/DaysOnHandDetail"),
    { ssr: false }
  ),
  "aging-distribution": dynamic(
    () => import("@/components/portfolio/inventory/AgingDistributionDetail"),
    { ssr: false }
  ),
  "inventory-health-score": dynamic(
    () => import("@/components/portfolio/inventory/HealthScoreDetail"),
    { ssr: false }
  ),
  "non-moving-inventory": dynamic(
    () => import("@/components/portfolio/inventory/NonMovingDetail"),
    { ssr: false }
  ),
  "inventory-risk": dynamic(
    () => import("@/components/portfolio/inventory/RiskDetail"),
    { ssr: false }
  ),
  "near-expiry": dynamic(
    () => import("@/components/portfolio/inventory/NearExpiryDetail"),
    { ssr: false }
  ),
  // ── Procurement (ADR-0001) ──
  "purchase-value": dynamic(() => import("@/components/portfolio/procurement/PurchaseValueDetail"), { ssr: false }),
  "monthly-purchase-value": dynamic(() => import("@/components/portfolio/procurement/MonthlyPurchaseDetail"), { ssr: false }),
  "procurement-variance": dynamic(() => import("@/components/portfolio/procurement/VarianceDetail"), { ssr: false }),
  "vendor-volume-contribution": dynamic(() => import("@/components/portfolio/procurement/VendorVolumeDetail"), { ssr: false }),
  "purchase-by-location": dynamic(() => import("@/components/portfolio/procurement/PurchaseByLocationDetail"), { ssr: false }),
  "procurement-cycle-time": dynamic(() => import("@/components/portfolio/procurement/CycleTimeDetail"), { ssr: false }),
  "vendor-lead-time": dynamic(() => import("@/components/portfolio/procurement/VendorLeadTimeDetail"), { ssr: false }),
  "fill-rate": dynamic(() => import("@/components/portfolio/procurement/FillRateDetail"), { ssr: false }),

  // ── Consumption & Revenue ──
  "unit-sold-per-sku": dynamic(() => import("@/components/portfolio/procurement/UnitsConsumedDetail"), { ssr: false }),
  "consumption-by-department": dynamic(() => import("@/components/portfolio/procurement/ConsumptionByDeptDetail"), { ssr: false }),
};

export default function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  if (isSimulated(key)) return <SimulatedKpiPage kpiKey={key} />;
  const kpi = byKey(key);
  if (!kpi) return notFound();
  const Bespoke = BESPOKE[key];
  if (Bespoke) return <Bespoke />;
  return <KpiDrilldown kpi={kpi} />;
}
