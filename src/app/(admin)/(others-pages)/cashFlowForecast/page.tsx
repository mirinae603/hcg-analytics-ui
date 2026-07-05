"use client";
import dynamic from "next/dynamic";
const CashflowForecastDetail = dynamic(() => import("@/components/portfolio/forecast/CashflowForecastDetail"), { ssr: false });
export default function Page() {
  return <CashflowForecastDetail />;
}
