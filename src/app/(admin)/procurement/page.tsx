"use client";
import ProcurementOverview from "@/components/portfolio/procurement/ProcurementOverview";
import SimulatedKpiGrid from "@/components/portfolio/SimulatedKpiGrid";
export default function Page() {
  return (
    <div className="space-y-8">
      <ProcurementOverview />
      <SimulatedKpiGrid portfolio="procurement" />
    </div>
  );
}
