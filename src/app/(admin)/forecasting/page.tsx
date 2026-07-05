"use client";
import dynamic from "next/dynamic";
const ForecastingOverview = dynamic(() => import("@/components/portfolio/procurement/ForecastingOverview"), { ssr: false });
export default function Page() {
  return <ForecastingOverview />;
}
