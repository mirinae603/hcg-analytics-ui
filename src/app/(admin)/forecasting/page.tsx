"use client";
import dynamic from "next/dynamic";
import SimulatedKpiGrid from "@/components/portfolio/SimulatedKpiGrid";
const ForecastingOverview = dynamic(() => import("@/components/portfolio/procurement/ForecastingOverview"), { ssr: false });
export default function Page() {
  return (
    <div className="space-y-8">
      <ForecastingOverview />
      <SimulatedKpiGrid portfolio="forecasting" />
    </div>
  );
}
