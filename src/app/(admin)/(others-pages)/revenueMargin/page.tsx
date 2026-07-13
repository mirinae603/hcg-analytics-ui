"use client";
import dynamic from "next/dynamic";
const RevenueMarginDetail = dynamic(() => import("@/components/portfolio/revenue/RevenueMarginDetail"), { ssr: false });
export default function Page() {
  return <RevenueMarginDetail />;
}
