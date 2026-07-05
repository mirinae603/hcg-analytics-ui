"use client";
import dynamic from "next/dynamic";
const DemandForecastDetail = dynamic(() => import("@/components/portfolio/forecast/DemandForecastDetail"), { ssr: false });
export default function Page() {
  return <DemandForecastDetail />;
}
