"use client";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { byKey } from "@/lib/kpiRegistry";
import { isSimulated } from "@/lib/simulatedKpi";
import { useScope } from "@/context/CategoryContext";
import { isCategoryScoped, notScopedReason } from "@/lib/categoryScope";
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
  "wastage-rate": dynamic(
    () => import("@/components/portfolio/inventory/WastageRateDetail"),
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
  "vendor-volume-vs-margin": dynamic(() => import("@/components/portfolio/procurement/VendorMarginDetail"), { ssr: false }),

  // ── Consumption & Revenue ──
  "unit-sold-per-sku": dynamic(() => import("@/components/portfolio/procurement/UnitsConsumedDetail"), { ssr: false }),
  "consumption-by-department": dynamic(() => import("@/components/portfolio/procurement/ConsumptionByDeptDetail"), { ssr: false }),
};

// KpiDrilldown renders its own "Not split by material category" notice — but every
// procurement KPI has a BESPOKE component, so for exactly the keys that CANNOT be
// filtered that notice was dead code. The result: Rs 649.91 Cr of whole-portfolio spend
// sitting under an amber "Filtered to Onco Drugs - every figure below covers this
// category only" banner. The number was right; the banner made it a lie.
// This is the one choke point every bespoke page passes through, so the retraction
// belongs here rather than pasted into ten components that would drift apart.
function BespokeShell({ kpiKey, children }: { kpiKey: string; children: React.ReactNode }) {
  const { filtered } = useScope();
  if (!filtered || isCategoryScoped(kpiKey)) return <>{children}</>;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl px-4 py-2.5 text-[12px]"
        style={{ background: "#f8f9fb", border: "1px solid #e7e8ee", color: "#6b7280" }}>
        <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#9ca3af" }} />
        <span>
          <b style={{ color: "#41444f" }}>Not split by material category.</b>{" "}
          {notScopedReason(kpiKey)} Figures below cover all categories.
        </span>
      </div>
      {children}
    </div>
  );
}

export default function KpiKeyClient({ kpiKey }: { kpiKey: string }) {
  if (isSimulated(kpiKey)) return <SimulatedKpiPage kpiKey={kpiKey} />;
  const kpi = byKey(kpiKey);
  if (!kpi) return notFound();
  const Bespoke = BESPOKE[kpiKey];
  if (Bespoke) return <BespokeShell kpiKey={kpiKey}><Bespoke /></BespokeShell>;
  return <KpiDrilldown kpi={kpi} />;
}
