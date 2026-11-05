"use client";
import dynamic from "next/dynamic";
const RevenuePage = dynamic(() => import("@/components/portfolio/margin/RevenuePage"), { ssr: false });
export default function Page() {
  return <RevenuePage />;
}
