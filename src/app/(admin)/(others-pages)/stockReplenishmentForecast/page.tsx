"use client";
import dynamic from "next/dynamic";
const ReplenishmentRiskDetail = dynamic(() => import("@/components/portfolio/forecast/ReplenishmentRiskDetail"), { ssr: false });
export default function Page() {
  return <ReplenishmentRiskDetail />;
}
