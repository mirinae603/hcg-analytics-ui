"use client";
import dynamic from "next/dynamic";
const ExportsPage = dynamic(() => import("@/components/portfolio/exports/ExportsPage"), { ssr: false });
export default function Page() {
  return <ExportsPage />;
}
