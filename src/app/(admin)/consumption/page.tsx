"use client";
import dynamic from "next/dynamic";
import SimulatedKpiGrid from "@/components/portfolio/SimulatedKpiGrid";
const ConsumptionOverview = dynamic(() => import("@/components/portfolio/procurement/ConsumptionOverview"), { ssr: false });
export default function Page() {
  return (
    <div className="space-y-8">
      <ConsumptionOverview />
      <SimulatedKpiGrid portfolio="consumption" />
    </div>
  );
}
