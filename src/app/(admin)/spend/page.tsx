"use client";
import dynamic from "next/dynamic";
const SpendPage = dynamic(() => import("@/components/portfolio/spend/SpendPage"), { ssr: false });
export default function Page() {
  return <SpendPage />;
}
