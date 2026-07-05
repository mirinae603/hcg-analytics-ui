"use client";
import dynamic from "next/dynamic";
const ConsumptionOverview = dynamic(() => import("@/components/portfolio/procurement/ConsumptionOverview"), { ssr: false });
export default function Page() {
  return <ConsumptionOverview />;
}
